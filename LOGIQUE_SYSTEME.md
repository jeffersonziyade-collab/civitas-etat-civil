# Logique du Système — État Civil (DSPCP/Etat Civil)

Ce document décrit le fonctionnement interne du système : architecture, modèles de données,
règles métier, cycle de vie d'une demande, et flux entre le Front-Office et le Back-Office.
Il complète le README (installation) et sert de référence fonctionnelle.

---

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│   FRONT-OFFICE        │        │   BACK-OFFICE          │        │   BASE DE DONNÉES     │
│   Portail Citoyen      │  API   │   Portail Agent         │ Mongo  │   MongoDB              │
│   (React, public)      │◄──────►│   (React, protégé JWT)  │◄──────►│   Service / Demande /  │
│                        │  REST  │                        │ ODM    │   User                 │
└─────────────────────┘        └─────────────────────┘        └─────────────────────┘
            │                              │
            └──────────► API Express (Node.js) ◄──────────┘
                       Helmet · CORS · Rate limit · JWT
```

Trois composantes indépendantes mais couplées par l'API REST :

1. **Base de données centralisée** — collections `services`, `demandes`, `users`.
2. **Front-Office** — aucune authentification requise ; le citoyen agit uniquement sur ses
   propres demandes, identifiées par un numéro de dossier (`demandeId`) qu'il doit conserver.
3. **Back-Office** — accès réservé aux agents authentifiés (JWT), qui voient l'ensemble des
   demandes.

---

## 2. Modèles de données et leur rôle

### 2.1 `Service` — le catalogue (référentiel figé)

Chaque service correspond à une ligne du tableau du cahier des charges. C'est la **source de
vérité** pour :
- le coût (fixe ou fourchette),
- le SLA (délai min/max),
- le niveau de priorité,
- les pièces à fournir,
- la formalité.

Le Front-Office ne fait qu'afficher ce référentiel ; il ne le modifie jamais. Une demande
**hérite** de ces valeurs au moment de sa création (coût, délai, priorité), pour que la
tarification reste figée même si le catalogue évolue plus tard.

| Champ | Rôle |
|---|---|
| `code` | Identifiant technique unique (ex: `LEGALISATION_COPIE`) utilisé dans les URLs et le JSON |
| `cout.type` | `fixe` (ex: 500 F) ou `fourchette` (ex: 500 à 50 000 F pour la délivrance d'actes) |
| `sla` | Traduit en jours pour le calcul de la date d'échéance |
| `niveauPriorite` | Entier — **plus le nombre est petit, plus le service est prioritaire** |
| `piecesAFournir` | Liste affichée dans la fiche synthétique, avec formats acceptés (PDF/Image) |

### 2.2 `Demande` — le dossier citoyen

Structure calquée sur le JSON du cahier des charges (section 5.1), avec en plus tout ce qui est
nécessaire au traitement interne.

```
Demande
├── demandeId            → identifiant public (ex: REQ-2026-0001), donné au citoyen
├── service / serviceCode → référence au catalogue au moment de la demande
├── citoyen               → nom, prénom, NIP, contact
├── fraisService           → montant figé, statut et moyen de paiement
├── delaiAttenduJours      → copié du service.sla.maxJours à la création
├── piecesJointes          → URLs des fichiers uploadés
├── statut                 → Nouveau | En cours | Validé | Rejeté
├── niveauPriorite         → copié du service à la création (ne change jamais après)
├── dateEcheance            → date limite calculée automatiquement
├── historique[]            → journal de tous les changements de statut (traçabilité)
└── documentSigne            → URL du document final, renseignée après signature électronique
```

**Pourquoi copier `niveauPriorite` et `delaiAttenduJours` dans la demande plutôt que de toujours
lire le service ?** Pour garantir qu'une modification future du catalogue (ex: un service
reclassé en priorité 3 au lieu de 5) n'affecte pas rétroactivement les dossiers déjà soumis.

### 2.3 `User` — les agents du Back-Office

Trois rôles : `AGENT`, `SUPERVISEUR`, `ADMIN`. Séparation des tâches sur le
traitement des demandes : un `AGENT` peut consulter le tableau de bord et
prendre en charge un dossier (`Nouveau → En cours`), mais seule une décision
`SUPERVISEUR` ou `ADMIN` peut le trancher définitivement (`Validé`/`Rejeté`,
et la signature électronique). La gestion du catalogue reste réservée à
`SUPERVISEUR`/`ADMIN`, la gestion des comptes agents à `ADMIN` seul.

---

## 3. Cycle de vie d'une demande

```
   Citoyen consulte      Citoyen soumet         Agent traite            Résultat
   la fiche synthétique   le formulaire

┌───────────────┐     ┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│ GET /services   │────►│ POST /demandes   │────►│ statut: Nouveau  │────►│ Validé          │
│ GET /services/:c│     │                  │     │                  │     │   ou            │
│ (fiche : pièces,│     │ → génère        │     │ Agent "prend    │     │ Rejeté          │
│ coût, délai,     │     │   demandeId,     │     │ en charge" →     │     │ (avec motif)    │
│ formalité)        │     │   dateEcheance   │     │ statut: En cours │     └───────────────┘
└───────────────┘     └────────────────┘     └────────────────┘
```

### Étape 1 — Consultation (Front-Office, obligatoire avant soumission)

`GET /api/services` liste le catalogue. `GET /api/services/:code` renvoie la fiche synthétique
complète d'un service. **Le cahier des charges impose que cette fiche soit vue avant toute
soumission** — dans l'interface, `ServiceDetail.tsx` matérialise cela par deux étapes
(`fiche` → `formulaire`) : impossible d'accéder au formulaire sans être passé par la fiche.

### Étape 2 — Soumission

`POST /api/demandes` :
1. Vérifie que le service existe et est actif.
2. Vérifie l'identité minimale du citoyen (nom, prénom, NIP).
3. Calcule le montant (fixe, ou `montantMin` par défaut si fourchette — l'agent ajuste ensuite
   si nécessaire selon l'acte réellement demandé).
4. Calcule `dateEcheance = aujourd'hui + delaiAttenduJours` (le `maxJours` du SLA, pour rester
   dans la fourchette annoncée même en cas de traitement plus long).
5. Génère un `demandeId` séquentiel de l'année (`REQ-2026-0001`, `REQ-2026-0002`, …).
6. Statut initial : `Nouveau`. Un premier événement est ajouté à `historique`.

Le paiement n'est **pas** encore effectif à ce stade : `statutPaiement` reste `EN_ATTENTE`. Le
branchement réel vers CinetPay/MTN MoMo/Moov Money/PayDunya (webhook de confirmation) est prévu
mais pas implémenté — voir section 6.

### Étape 3 — Traitement (Back-Office)

Le tableau de bord (`GET /api/agent/dashboard`) liste les demandes triées par :
1. `niveauPriorite` croissant (les services les plus prioritaires du catalogue apparaissent en
   premier),
2. puis `dateEcheance` la plus proche.

Chaque ligne affiche une **alerte de délai**, calculée à la volée (jamais stockée, toujours
recalculée à l'appel) :

| Alerte | Condition |
|---|---|
| `RETARD` | `dateEcheance` déjà dépassée et statut encore actif |
| `URGENT` | échéance dans moins de 24h |
| `OK` | échéance à plus de 24h |
| `CLOS` | statut `Validé` ou `Rejeté` — l'échéance n'est plus pertinente |

L'agent fait progresser le dossier via `PATCH /api/agent/demandes/:id/statut` :

```
Nouveau ──"Prendre en charge"──► En cours ──"Valider"──► Validé
                                      │
                                      └──"Rejeter" (motif obligatoire)──► Rejeté
```

Chaque transition ajoute une ligne à `historique` (statut, commentaire, agent, date) —
c'est la traçabilité complète du dossier, consultable a posteriori.

### Étape 4 — Signature électronique (dossiers Validés uniquement)

`POST /api/agent/demandes/:id/signer` n'est autorisé que si `statut === 'Validé'`. Elle
enregistre l'URL du document final signé (`documentSigne`). L'intégration avec un prestataire de
signature électronique réel reste à faire (ce endpoint reçoit aujourd'hui l'URL telle quelle).

### Étape 5 — Suivi citoyen

`GET /api/demandes/:demandeId` — le citoyen entre son numéro de dossier et voit en temps réel :
statut actuel, montant et statut de paiement, échéance, et le motif si le dossier est rejeté.
Aucune authentification n'est requise : le `demandeId` (difficile à deviner car séquentiel mais
combiné à l'absence d'infos sensibles exposées) fait office de clé d'accès simple. **Pour une
mise en production, envisager d'ajouter un second facteur (NIP ou téléphone) à la vérification
du suivi**, pour éviter qu'un tiers devine un numéro de dossier.

---

## 4. Règles métier clés

- **Priorité fixe par service, pas par dossier** — c'est le catalogue qui définit l'ordre
  d'importance (ex: la légalisation de copie, quotidienne et rapide, a une priorité différente de
  la délivrance d'actes plus complexe). Un agent ne peut pas aujourd'hui reprioriser un dossier
  individuellement.
- **Le rejet exige toujours un motif** — refusé côté API si `commentaire` est vide, pour garantir
  que le citoyen reçoive une explication.
- **La signature ne peut intervenir qu'après validation** — empêche qu'un document soit signé
  avant d'avoir été formellement validé par un agent.
- **Le montant est figé à la soumission** — même si le catalogue change après coup, la demande
  garde le prix annoncé au citoyen au moment où il a payé.
- **Toutes les actions Back-Office sont journalisées** — `historique[]` sur chaque `Demande`
  constitue un audit trail complet (qui, quand, quel changement, quel commentaire).

---

## 5. Sécurité

| Mécanisme | Portée |
|---|---|
| Helmet | En-têtes HTTP sécurisés sur toute l'API |
| CORS | Autorise les appels du frontend |
| Rate limiting | 300 requêtes / 15 min par IP sur `/api/*` |
| JWT | Requis sur toutes les routes `/api/agent/*` (middleware `proteger`) |
| bcrypt | Mots de passe agents hashés, jamais stockés en clair |
| Validation d'upload | Extensions autorisées limitées à PDF/JPG/JPEG/PNG, 10 Mo max |

Le Front-Office citoyen n'a **aucune route protégée** : c'est volontaire, cohérent avec un
service public sans compte citoyen. Toute donnée sensible (NIP, etc.) transite uniquement via
HTTPS en production (à activer au niveau du reverse proxy / Nginx).

---

## 6. Ce qui reste à brancher (non couvert par ce scaffold)

Ces points sont structurés dans le code (champs prévus, variables d'environnement) mais
nécessitent des informations externes (clés API, specs d'interconnexion) pour être finalisés :

1. **Paiement réel** — le code est déjà entièrement câblé (initiation CinetPay juste après la
   création de la demande, webhook qui met à jour `statutPaiement` à `PAYE`/`ECHEC`, appel
   côté Front-Office). Il ne manque que les identifiants marchand réels
   (`CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_NOTIFY_URL`, `CINETPAY_RETURN_URL`) pour
   passer en production.
2. **Interconnexion plateforme e-services Bénin (Phase 4)** — un connecteur qui pousse (ou
   expose) les demandes au format JSON attendu par la plateforme nationale.
3. **Numérisation des registres papier (Phase 1)** — script d'import de masse (scan + OCR ou
   saisie) des actes existants dans une collection dédiée aux registres numérisés.
4. **Signature électronique réelle** — `POST /api/agent/demandes/:id/signer` (réservé
   SUPERVISEUR/ADMIN) enregistre aujourd'hui une URL telle quelle ; aucun prestataire de
   signature électronique n'est encore branché derrière.

Le suivi citoyen (`GET /api/demandes/:demandeId?nip=...`) exige déjà le NIP en plus du numéro de
dossier — ce n'est plus un point ouvert.

### Points de durcissement recommandés avant mise en production

- **Changement de mot de passe forcé au premier login** — un agent créé par un ADMIN garde
  indéfiniment le mot de passe provisoire saisi à la création (il peut toutefois le changer
  lui-même via "Mot de passe oublié").
- **Notifications citoyen** (email/SMS) au changement de statut d'une demande — rien n'est
  envoyé aujourd'hui, le citoyen doit revenir consulter `/suivi` ou "Mon espace".
- **Vérification réelle du NIP à l'inscription citoyenne** — un adaptateur (`utils/verificationNip.js`)
  est en place et prêt à brancher sur `ESERVICES_BENIN_API_URL`/`ESERVICES_BENIN_API_KEY` dès que
  cette interconnexion existera ; tant qu'elle n'est pas configurée (ou indisponible), l'inscription
  n'est jamais bloquée et le compte est simplement marqué `NON_VERIFIE`. Le contrat d'API appelé
  est provisoire — à ajuster une fois la vraie spécification Phase 4 publiée. `NIP_VERIFICATION_STRICTE=true`
  permet de bloquer l'inscription en cas de non-correspondance confirmée, à activer seulement une
  fois l'interconnexion réelle fiabilisée.

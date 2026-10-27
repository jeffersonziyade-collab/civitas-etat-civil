# Système de Gestion et e-Services de l'État Civil (DSPCP/Etat Civil)

Implémentation conforme au Cahier des Charges Technique fourni. Architecture en 3 composantes
comme spécifié en section 2 :

1. **Base de données centralisée** — MongoDB (modèles `Service`, `Demande`, `User`)
2. **Front-Office (Portail Citoyen)** — React/Vite/TypeScript/Tailwind (`/frontend`)
3. **Back-Office (Portail Agent)** — même app React, routes `/agent/*`, protégées par JWT

## Correspondance avec le cahier des charges

| Exigence du CdC | Implémentation |
|---|---|
| Fiche synthétique avant soumission (3.1) | `GET /api/services/:code` + page `ServiceDetail.tsx` (pièce à fournir, coût, formalité, délai) |
| Tableau de bord agent trié priorité/statut (3.2) | `GET /api/agent/dashboard` + `AgentDashboard.tsx` |
| Alertes de délai (1 à 3 jours) (3.2) | `dateEcheance` calculée à la création + `utils/priority.js` (`statutDelai`) |
| 5 services & tarification (section 4) | `backend/src/seed/seedServices.js` — catalogue exact du CdC |
| Structure JSON demande (5.1) | Modèle `Demande.js` — champs `demande_id`, `service_code`, `citoyen`, `frais_service`, `pieces_jointes` |
| Statuts Nouveau / En cours / Validé / Rejeté (3.2) | Modèle `Demande.statut` + routes `PATCH /api/agent/demandes/:id/statut` |
| Signature électronique | `POST /api/agent/demandes/:id/signer` (à brancher sur un prestataire de signature) |
| Paiement en ligne | **Intégré** : `routes/paiement.js` initie une transaction CinetPay réelle et traite son webhook de confirmation |
| Interconnexion plateforme nationale (Phase 4) | Variables `ESERVICES_BENIN_API_URL` / `_API_KEY` prêtes dans `.env.example` |
| Gestion du catalogue par la mairie | `routes/admin.js` + page `AdminServices.tsx` — un ADMIN/SUPERVISEUR modifie tarifs, délais, priorités sans toucher au code |
| Confidentialité du suivi citoyen | Le NIP est exigé en plus du numéro de dossier pour consulter un dossier (`GET /api/demandes/:id?nip=...`) |
| Identité visuelle | `components/Layout.tsx` — en-tête/pied de page "Mairie de Porto-Novo" sur tout le portail citoyen |

## Paiement en ligne — activer CinetPay

1. Inscris la mairie comme marchand sur [cinetpay.com](https://cinetpay.com) et récupère `apikey` et `site_id`.
2. Renseigne dans `backend/.env` :
   ```
   CINETPAY_API_KEY=...
   CINETPAY_SITE_ID=...
   CINETPAY_NOTIFY_URL=https://ton-domaine.bj/api/paiement/webhook
   CINETPAY_RETURN_URL=https://ton-domaine.bj/suivi
   ```
   **Important** : `CINETPAY_NOTIFY_URL` doit être une URL publique joignable par CinetPay (donc pas `localhost` en production).
3. Une fois configuré, chaque soumission de demande redirige automatiquement le citoyen vers la
   page de paiement CinetPay. Sans ces clés, le dossier est quand même créé, mais un message
   invite le citoyen à régulariser le paiement avec la mairie.

## Mot de passe oublié

Flux complet de réinitialisation, pour les comptes citoyens **et** les comptes agents :

- Lien "Mot de passe oublié ?" sur les deux écrans de connexion (`/connexion` et `/agent/login`).
- La demande (`POST /api/citoyen/mot-de-passe-oublie` ou `/api/auth/mot-de-passe-oublie`)
  répond **toujours** le même message générique, que le compte existe ou non — ça évite qu'on
  puisse deviner quels e-mails sont enregistrés dans le système.
- Jeton à usage unique (32 octets aléatoires), valable 1 heure, dont seul le hash SHA-256 est
  stocké en base — jamais le jeton en clair.
- Limite dédiée de 8 tentatives / 15 min par IP sur ces routes (en plus du rate-limit global de
  l'API), pour empêcher le brute-force et le spam d'e-mails.
- **Envoi d'e-mail** : si `SMTP_HOST` n'est pas renseigné dans `.env`, le lien de
  réinitialisation est simplement affiché dans les logs du serveur — pratique pour tester tout
  le flux en local sans compte SMTP réel. Renseignez `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/
  `SMTP_PASS`/`SMTP_FROM` pour un envoi réel en production.

## Compte citoyen (Front-Office)

Le portail citoyen dispose maintenant d'une vraie connexion (`/connexion`, bouton
"Connexion citoyen" dans l'en-tête) — distincte de l'espace agent, avec son propre
jeton JWT (claim `type: 'citoyen'`, ne fonctionne pas sur les routes `/api/agent/*`
ni `/api/admin/*`, et inversement).

- Inscription : nom, prénom, e-mail, NIP, mot de passe (8 caractères min.).
- "Mon espace" (`/mon-espace`) liste automatiquement **toutes** les demandes liées
  au NIP du compte — y compris celles soumises avant la création du compte,
  puisque le rattachement se fait par NIP et non par un nouvel identifiant.
- Le suivi anonyme par numéro de dossier + NIP (`/suivi`) reste disponible pour
  quiconque ne souhaite pas créer de compte.
- Le formulaire de soumission de demande se pré-remplit avec les informations du
  compte connecté.

## Gestion des comptes agents (Back-Office)

Un compte `ADMIN` peut désormais créer, promouvoir/rétrograder (AGENT ⇄
SUPERVISEUR ⇄ ADMIN) et activer/désactiver les comptes agents directement depuis
l'interface — plus besoin du script `seedAdmin.js` après la création du tout
premier compte. Accessible depuis le tableau de bord agent via "Gérer les agents"
(lien visible uniquement pour un ADMIN) ou directement sur `/agent/admin/agents`.

N'importe quel agent connecté (AGENT, SUPERVISEUR ou ADMIN) peut consulter et prendre en
charge n'importe quelle demande depuis le tableau de bord — il n'y a pas de cloisonnement
par service. En revanche, **la décision finale (valider/rejeter, signature électronique)
est réservée aux rôles SUPERVISEUR et ADMIN** : un AGENT peut instruire un dossier mais
pas le trancher seul (séparation des tâches). La gestion du catalogue et des comptes reste
elle aussi réservée aux rôles SUPERVISEUR/ADMIN.

## Administration du catalogue

Un compte `ADMIN` ou `SUPERVISEUR` (créé via `seedAdmin.js`) peut se connecter sur
`/agent/login` puis accéder à "Gérer le catalogue" depuis le tableau de bord — modification des
tarifs, délais (SLA), priorités et formalités sans intervention d'un développeur.

## Démarrage rapide (développement)

```bash
# 1. Backend
cd backend
cp .env.example .env   # renseigner MONGODB_URI, JWT_SECRET
npm install
npm run seed            # charge les 5 services du catalogue
node src/seed/seedAdmin.js admin@mairie.bj MotDePasseSecurise "Nom Agent"
npm run dev              # démarre sur http://localhost:4000

# 2. Frontend (autre terminal)
cd frontend
npm install
npm run dev               # démarre sur http://localhost:5173
```

- Portail citoyen : http://localhost:5173/
- Portail agent : http://localhost:5173/agent/login

## Démarrage avec Docker Compose (production)

La stack complète (MongoDB + backend + frontend + reverse proxy Caddy avec HTTPS
automatique) démarre en une commande, une fois le serveur prêt (voir la procédure
de mise à disposition ci-dessous pour le détail complet, DNS compris) :

```bash
cp .env.example .env        # racine du projet — PAS backend/.env.example
nano .env                   # renseigner DOMAIN, JWT_SECRET, etc.
docker compose up --build -d
docker compose exec backend npm run seed                # charge le catalogue des services
docker compose exec backend node src/seed/seedAdmin.js admin@porto-novo.bj "MotDePasseSecurise123!" "Administrateur"
```

- Portail public : `https://<DOMAIN>` (certificat HTTPS obtenu automatiquement par Caddy)
- API : `https://<DOMAIN>/api/health`
- Dashboard agent : `https://<DOMAIN>/agent/login`

`.env.example` (racine) liste toutes les variables lues par `docker-compose.yml`.
`backend/.env.example` sert uniquement au développement local sans Docker
(`npm run dev` dans `backend/` et `frontend/` séparément, sans Caddy ni Nginx).

## Plan de déploiement (section 6 du CdC)

- **Phase 1** — Ce backend structure déjà la base de données centralisée ; il reste à écrire le
  script de numérisation/import en masse des registres papier existants (à partir de scans ou
  d'un export CSV) vers les collections `Demande`/registres.
- **Phase 2** — Back-Office livré (`AgentDashboard.tsx`, routes `/api/agent/*`). Prévoir une
  session de formation des agents DSPCP sur le tableau de bord.
- **Phase 3** — Front-Office citoyen livré (catalogue, fiche synthétique, soumission). Les
  intégrations de paiement (CinetPay/MTN MoMo/Moov Money/PayDunya) sont préparées mais à
  finaliser avec les clés API réelles des prestataires.
- **Phase 4** — Les identifiants de connexion à la plateforme nationale des e-services du Bénin
  sont prévus en `.env` (`ESERVICES_BENIN_API_URL`) ; il restera à écrire le connecteur
  d'export/synchronisation une fois les spécifications d'interconnexion transmises par
  l'administration.

## Sécurité

Conformément aux pratiques habituelles : Helmet, rate limiting, CORS, JWT pour l'authentification
agent, mots de passe hashés (bcrypt), validation des formats de fichiers uploadés (PDF/Image,
10 Mo max).

Les jetons agent et citoyen sont cloisonnés (claim `type` distinct dans le JWT) : un jeton citoyen
volé ne donne accès à aucune route `/api/agent/*` ou `/api/admin/*`, et réciproquement.
Un ADMIN ne peut pas désactiver son propre compte (protection contre le verrouillage accidentel).

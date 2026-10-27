/**
 * Calcule la date d'échéance d'une demande à partir du délai attendu (SLA)
 * afin d'alimenter les alertes de délai du tableau de bord agent (section 3.2).
 */
function calculerDateEcheance(delaiAttenduJours) {
  const date = new Date();
  date.setDate(date.getDate() + Number(delaiAttenduJours || 1));
  return date;
}

/**
 * Détermine si une demande est en retard ou proche de l'échéance.
 * Retourne 'RETARD' | 'URGENT' (<24h) | 'OK'
 */
function statutDelai(dateEcheance, statut) {
  if (['Validé', 'Rejeté'].includes(statut)) return 'CLOS';
  const maintenant = new Date();
  const echeance = new Date(dateEcheance);
  const diffHeures = (echeance - maintenant) / (1000 * 60 * 60);

  if (diffHeures < 0) return 'RETARD';
  if (diffHeures <= 24) return 'URGENT';
  return 'OK';
}

/**
 * Trie les demandes par priorité métier (niveauPriorite croissant = plus urgent)
 * puis par échéance la plus proche.
 */
function comparerPourTriPriorite(a, b) {
  if (a.niveauPriorite !== b.niveauPriorite) {
    return a.niveauPriorite - b.niveauPriorite;
  }
  return new Date(a.dateEcheance) - new Date(b.dateEcheance);
}

module.exports = { calculerDateEcheance, statutDelai, comparerPourTriPriorite };

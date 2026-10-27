const axios = require('axios');

/**
 * Vérifie qu'un NIP correspond bien au nom/prénom déclarés, via
 * l'interconnexion nationale (Phase 4 du CdC). Cette plateforme n'existe pas
 * encore : ce module est un ADAPTATEUR prêt à brancher, pas une intégration
 * réelle. Le contrat d'API ci-dessous (route, forme du payload, champ
 * `correspond`) est provisoire — à ajuster dès que la spécification réelle
 * de la plateforme e-services Bénin sera publiée.
 *
 * Tant que ESERVICES_BENIN_API_URL / ESERVICES_BENIN_API_KEY ne sont pas
 * renseignées, la vérification est simplement différée (NON_VERIFIE) : on
 * n'empêche jamais un citoyen de créer un compte à cause d'une intégration
 * qui n'existe pas encore.
 *
 * @returns {Promise<{statut: 'VERIFIE'|'NON_VERIFIE'|'ECHEC', detail: string}>}
 */
async function verifierIdentiteNip({ nip, nom, prenom }) {
  const url = process.env.ESERVICES_BENIN_API_URL;
  const apiKey = process.env.ESERVICES_BENIN_API_KEY;

  if (!url || !apiKey) {
    return {
      statut: 'NON_VERIFIE',
      detail: "Interconnexion Phase 4 non configurée — vérification différée.",
    };
  }

  try {
    const reponse = await axios.post(
      `${url}/verification-identite`,
      { nip, nom, prenom },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 5000 }
    );

    if (reponse.data?.correspond === true) {
      return { statut: 'VERIFIE', detail: 'Identité confirmée par la plateforme nationale.' };
    }
    return {
      statut: 'ECHEC',
      detail: reponse.data?.message || 'Le NIP ne correspond pas au nom/prénom fournis.',
    };
  } catch (err) {
    // Panne ou lenteur du service national : on ne bloque pas l'inscription
    // pour autant, on la marque simplement comme non vérifiée.
    console.error('[VERIFICATION NIP] Interconnexion indisponible :', err.message);
    return {
      statut: 'NON_VERIFIE',
      detail: 'Service de vérification indisponible — compte créé sans vérification.',
    };
  }
}

module.exports = { verifierIdentiteNip };

const express = require('express');
const axios = require('axios');
const Demande = require('../models/Demande');

const router = express.Router();

const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2/payment';

/**
 * POST /api/paiement/initier/:demandeId
 * Initie une transaction CinetPay pour une demande donnée et renvoie l'URL
 * de paiement vers laquelle rediriger le citoyen.
 *
 * Nécessite CINETPAY_API_KEY et CINETPAY_SITE_ID (fournis par CinetPay après
 * inscription du marchand "Mairie de Porto-Novo" sur cinetpay.com).
 */
router.post('/initier/:demandeId', async (req, res, next) => {
  try {
    const demande = await Demande.findOne({ demandeId: req.params.demandeId }).populate(
      'service',
      'nom'
    );
    if (!demande) return res.status(404).json({ message: 'Dossier introuvable.' });

    if (demande.fraisService.statutPaiement === 'PAYE') {
      return res.status(400).json({ message: 'Cette demande est déjà payée.' });
    }

    if (!process.env.CINETPAY_API_KEY || !process.env.CINETPAY_SITE_ID) {
      return res.status(503).json({
        message:
          "Paiement en ligne non configuré : CINETPAY_API_KEY / CINETPAY_SITE_ID manquants dans le .env du backend.",
      });
    }

    // transaction_id doit être unique côté CinetPay : on réutilise demandeId + timestamp
    const transactionId = `${demande.demandeId}-${Date.now()}`;

    const payload = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: demande.fraisService.montant,
      currency: demande.fraisService.devise || 'XOF',
      description: `Paiement ${demande.serviceCode} — Mairie de Porto-Novo — Dossier ${demande.demandeId}`,
      notify_url: process.env.CINETPAY_NOTIFY_URL,
      return_url: `${process.env.CINETPAY_RETURN_URL}/${demande.demandeId}`,
      channels: 'ALL', // carte, MTN MoMo, Moov Money via CinetPay
      customer_name: demande.citoyen.nom,
      customer_surname: demande.citoyen.prenom,
      customer_phone_number: demande.citoyen.telephone || '',
      customer_email: demande.citoyen.email || 'sans-email@porto-novo.bj',
    };

    const reponse = await axios.post(CINETPAY_BASE_URL, payload);

    if (reponse.data.code !== '201') {
      return res.status(502).json({
        message: `CinetPay a refusé l'initiation : ${reponse.data.message || 'erreur inconnue'}`,
      });
    }

    // On mémorise la référence de transaction pour la retrouver au webhook
    demande.fraisService.referenceTransaction = transactionId;
    demande.fraisService.moyenPaiement = 'CINETPAY';
    await demande.save();

    res.json({ paymentUrl: reponse.data.data.payment_url, transactionId });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({
        message: `Erreur CinetPay : ${err.response.data?.message || err.message}`,
      });
    }
    next(err);
  }
});

/**
 * POST /api/paiement/webhook
 * Point de notification appelé par CinetPay après le paiement (succès ou échec).
 * CinetPay envoie { cpm_trans_id, cpm_site_id, ... } — on revérifie systématiquement
 * le statut réel via l'API "check" plutôt que de faire confiance à la notification brute
 * (règle de sécurité imposée par CinetPay).
 */
router.post('/webhook', async (req, res) => {
  try {
    const transactionId = req.body.cpm_trans_id || req.body.transaction_id;
    if (!transactionId) return res.sendStatus(400);

    const verification = await axios.post(`${CINETPAY_BASE_URL}/check`, {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
    });

    const demande = await Demande.findOne({ 'fraisService.referenceTransaction': transactionId });
    if (!demande) return res.sendStatus(404);

    if (verification.data.code === '00') {
      demande.fraisService.statutPaiement = 'PAYE';
      demande.historique.push({ statut: demande.statut, commentaire: 'Paiement confirmé via CinetPay.' });
    } else {
      demande.fraisService.statutPaiement = 'ECHEC';
      demande.historique.push({ statut: demande.statut, commentaire: 'Paiement CinetPay échoué ou annulé.' });
    }
    await demande.save();

    res.sendStatus(200);
  } catch (err) {
    console.error('[CINETPAY WEBHOOK] Erreur :', err.message);
    res.sendStatus(500);
  }
});

module.exports = router;

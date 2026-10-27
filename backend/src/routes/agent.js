const express = require('express');
const Demande = require('../models/Demande');
const { proteger } = require('../middleware/auth');
const { statutDelai } = require('../utils/priority');

const router = express.Router();
router.use(proteger); // tout le back-office nécessite une session agent

// Séparation des tâches : un AGENT peut instruire un dossier (le prendre en
// charge) mais seule une décision SUPERVISEUR ou ADMIN peut le trancher
// définitivement (validation, rejet, signature).
const ROLES_DECISION_FINALE = ['SUPERVISEUR', 'ADMIN'];

// GET /api/agent/dashboard — demandes classées par priorité puis statut (section 3.2)
router.get('/dashboard', async (req, res, next) => {
  try {
    const { statut } = req.query;
    const filtre = statut ? { statut } : {};

    const demandes = await Demande.find(filtre)
      .populate('service', 'nom code')
      .sort({ niveauPriorite: 1, dateEcheance: 1 });

    const avecAlerte = demandes.map((d) => ({
      ...d.toObject(),
      alerteDelai: statutDelai(d.dateEcheance, d.statut),
    }));

    const compteurs = {
      Nouveau: demandes.filter((d) => d.statut === 'Nouveau').length,
      'En cours': demandes.filter((d) => d.statut === 'En cours').length,
      Validé: demandes.filter((d) => d.statut === 'Validé').length,
      Rejeté: demandes.filter((d) => d.statut === 'Rejeté').length,
      enRetard: avecAlerte.filter((d) => d.alerteDelai === 'RETARD').length,
    };

    res.json({ demandes: avecAlerte, compteurs });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/agent/demandes/:demandeId/statut — changer le statut (prise en charge, validation, rejet)
router.patch('/demandes/:demandeId/statut', async (req, res, next) => {
  try {
    const { statut, commentaire } = req.body;
    const statutsValides = ['Nouveau', 'En cours', 'Validé', 'Rejeté'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    const demande = await Demande.findOne({ demandeId: req.params.demandeId });
    if (!demande) return res.status(404).json({ message: 'Dossier introuvable.' });

    if (['Validé', 'Rejeté'].includes(statut) && !ROLES_DECISION_FINALE.includes(req.agent.role)) {
      return res.status(403).json({
        message: 'Seul un agent SUPERVISEUR ou ADMIN peut valider ou rejeter une demande.',
      });
    }

    if (statut === 'Rejeté' && !commentaire) {
      return res.status(400).json({ message: 'Un motif de rejet est requis.' });
    }

    demande.statut = statut;
    demande.agentTraitant = req.agent._id;
    if (statut === 'Rejeté') demande.motifRejet = commentaire;
    demande.historique.push({ statut, commentaire, agent: req.agent._id });

    await demande.save();
    res.json(demande);
  } catch (err) {
    next(err);
  }
});

// POST /api/agent/demandes/:demandeId/signer — signature électronique du document final
router.post('/demandes/:demandeId/signer', async (req, res, next) => {
  try {
    if (!ROLES_DECISION_FINALE.includes(req.agent.role)) {
      return res.status(403).json({
        message: 'Seul un agent SUPERVISEUR ou ADMIN peut signer un document.',
      });
    }

    const { documentUrl } = req.body;
    const demande = await Demande.findOne({ demandeId: req.params.demandeId });
    if (!demande) return res.status(404).json({ message: 'Dossier introuvable.' });
    if (demande.statut !== 'Validé') {
      return res.status(400).json({ message: 'Le dossier doit être Validé avant signature.' });
    }

    demande.documentSigne = documentUrl;
    demande.historique.push({
      statut: demande.statut,
      commentaire: 'Document signé électroniquement.',
      agent: req.agent._id,
    });
    await demande.save();
    res.json(demande);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const Service = require('../models/Service');
const { proteger, autoriser } = require('../middleware/auth');

const router = express.Router();
router.use(proteger, autoriser('ADMIN', 'SUPERVISEUR'));

// GET /api/admin/services — catalogue complet (y compris services désactivés)
router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.find().sort({ niveauPriorite: 1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/services/:code — modifier tarif, délai, priorité, formalité, statut actif
router.put('/services/:code', async (req, res, next) => {
  try {
    const service = await Service.findOne({ code: req.params.code.toUpperCase() });
    if (!service) return res.status(404).json({ message: 'Service introuvable.' });

    const { cout, sla, niveauPriorite, formalite, cibleDescription, actif, piecesAFournir } = req.body;

    if (cout) service.cout = { ...service.cout.toObject(), ...cout };
    if (sla) service.sla = { ...service.sla.toObject(), ...sla };
    if (niveauPriorite !== undefined) service.niveauPriorite = niveauPriorite;
    if (formalite !== undefined) service.formalite = formalite;
    if (cibleDescription !== undefined) service.cibleDescription = cibleDescription;
    if (actif !== undefined) service.actif = actif;
    if (piecesAFournir) service.piecesAFournir = piecesAFournir;

    await service.save();
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/services — créer un nouveau service (ex: nouvelle prestation ajoutée par la mairie)
router.post('/services', async (req, res, next) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Un service avec ce code existe déjà.' });
    }
    next(err);
  }
});

// GET /api/admin/agents — liste des comptes agents (ADMIN uniquement)
router.get('/agents', autoriser('ADMIN'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    const agents = await User.find().select('-motDePasse').sort({ nom: 1 });
    res.json(agents);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/agents — créer un nouveau compte agent (ADMIN uniquement)
router.post('/agents', autoriser('ADMIN'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { nom, email, motDePasse, role } = req.body;
    const agent = await User.create({ nom, email, motDePasse, role: role || 'AGENT' });
    res.status(201).json({ id: agent._id, nom: agent.nom, email: agent.email, role: agent.role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Un agent avec cet email existe déjà.' });
    }
    next(err);
  }
});

// PATCH /api/admin/agents/:id — modifier le rôle ou activer/désactiver un compte (ADMIN uniquement)
router.patch('/agents/:id', autoriser('ADMIN'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { role, actif } = req.body;
    const rolesValides = ['AGENT', 'SUPERVISEUR', 'ADMIN'];

    if (String(req.params.id) === String(req.agent._id) && actif === false) {
      return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
    }
    if (role !== undefined && !rolesValides.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide.' });
    }

    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: 'Agent introuvable.' });

    if (role !== undefined) agent.role = role;
    if (actif !== undefined) agent.actif = actif;
    await agent.save();

    res.json({ id: agent._id, nom: agent.nom, email: agent.email, role: agent.role, actif: agent.actif });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

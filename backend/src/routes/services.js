const express = require('express');
const Service = require('../models/Service');

const router = express.Router();

// GET /api/services — liste du catalogue (page d'accueil citoyen)
router.get('/', async (req, res, next) => {
  try {
    const services = await Service.find({ actif: true }).sort({ niveauPriorite: 1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/:code — fiche synthétique détaillée avant soumission (section 3.1)
router.get('/:code', async (req, res, next) => {
  try {
    const service = await Service.findOne({
      code: req.params.code.toUpperCase(),
      actif: true,
    });
    if (!service) {
      return res.status(404).json({ message: 'Service introuvable.' });
    }
    res.json(service);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

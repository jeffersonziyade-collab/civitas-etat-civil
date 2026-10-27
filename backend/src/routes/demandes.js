const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Service = require('../models/Service');
const Demande = require('../models/Demande');
const { calculerDateEcheance } = require('../utils/priority');

const router = express.Router();

// --- Upload des pièces justificatives (PDF ou Image, cf. section 3.1) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    const extensionsAutorisees = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (extensionsAutorisees.includes(ext)) return cb(null, true);
    cb(new Error('Format non autorisé. Utilisez PDF ou Image (jpg/png).'));
  },
});

// POST /api/demandes/pieces — upload d'une pièce jointe, retourne son URL
router.post('/pieces', upload.single('fichier'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    next(err);
  }
});

// POST /api/demandes — soumission d'une nouvelle demande par le citoyen
router.post('/', async (req, res, next) => {
  try {
    const { serviceCode, citoyen, piecesJointes, moyenPaiement } = req.body;

    const service = await Service.findOne({ code: serviceCode?.toUpperCase(), actif: true });
    if (!service) {
      return res.status(404).json({ message: 'Service demandé introuvable.' });
    }
    if (!citoyen?.nom || !citoyen?.prenom || !citoyen?.nip) {
      return res.status(400).json({ message: 'Identité du citoyen incomplète (nom, prénom, NIP requis).' });
    }

    const montant = service.cout.type === 'fixe' ? service.cout.montant : service.cout.montantMin;
    const delaiAttenduJours = service.sla.maxJours;
    const dateEcheance = calculerDateEcheance(delaiAttenduJours);
    const annee = new Date().getFullYear();
    const compteur = (await Demande.countDocuments()) + 1;
    const demandeId = `REQ-${annee}-${String(compteur).padStart(4, '0')}`;

    const demande = await Demande.create({
      demandeId,
      service: service._id,
      serviceCode: service.code,
      citoyen,
      fraisService: {
        montant,
        devise: service.cout.devise || 'XOF',
        statutPaiement: 'EN_ATTENTE',
        moyenPaiement: moyenPaiement || null,
      },
      delaiAttenduJours,
      piecesJointes: piecesJointes || [],
      statut: 'Nouveau',
      niveauPriorite: service.niveauPriorite,
      dateEcheance,
      historique: [{ statut: 'Nouveau', commentaire: 'Demande soumise par le citoyen.' }],
    });

    // NOTE : l'initiation réelle du paiement (CinetPay / MTN MoMo / Moov Money / PayDunya)
    // se branche ici — voir routes/paiement.js à implémenter selon le prestataire retenu.

    res.status(201).json(demande);
  } catch (err) {
    next(err);
  }
});

// GET /api/demandes/:demandeId?nip=... — suivi de dossier par le citoyen
// Le NIP est exigé comme second facteur pour empêcher qu'un tiers consulte un dossier
// en devinant simplement un numéro (demandeId) séquentiel.
router.get('/:demandeId', async (req, res, next) => {
  try {
    const { nip } = req.query;
    if (!nip) {
      return res.status(400).json({ message: 'Le NIP du demandeur est requis pour consulter ce dossier.' });
    }

    const demande = await Demande.findOne({ demandeId: req.params.demandeId }).populate(
      'service',
      'nom code'
    );
    if (!demande || demande.citoyen.nip !== nip) {
      return res.status(404).json({ message: 'Dossier introuvable ou NIP incorrect.' });
    }
    res.json(demande);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

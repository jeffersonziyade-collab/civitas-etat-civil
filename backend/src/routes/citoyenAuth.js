const express = require('express');
const jwt = require('jsonwebtoken');
const Citoyen = require('../models/Citoyen');
const Demande = require('../models/Demande');
const { protegerCitoyen } = require('../middleware/auth');
const { genererJetonReinitialisation, hasherJeton } = require('../utils/resetToken');
const { envoyerEmail } = require('../utils/mailer');
const { verifierIdentiteNip } = require('../utils/verificationNip');
const limiteurAuthSensible = require('../middleware/limiteurAuthSensible');

const router = express.Router();

function genererToken(citoyen) {
  return jwt.sign({ id: citoyen._id, type: 'citoyen' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN_CITOYEN || '30d',
  });
}

function toPublic(citoyen) {
  return {
    id: citoyen._id,
    nom: citoyen.nom,
    prenom: citoyen.prenom,
    email: citoyen.email,
    telephone: citoyen.telephone,
    nip: citoyen.nip,
    statutVerificationNip: citoyen.statutVerificationNip,
  };
}

// POST /api/citoyen/inscription — création de compte citoyen
router.post('/inscription', limiteurAuthSensible, async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, nip, motDePasse } = req.body;
    if (!nom || !prenom || !email || !nip || !motDePasse) {
      return res.status(400).json({ message: 'Nom, prénom, e-mail, NIP et mot de passe sont requis.' });
    }
    if (motDePasse.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Vérification d'identité via l'interconnexion nationale (Phase 4).
    // Tant que cette plateforme n'existe pas / n'est pas configurée, le
    // compte est créé quand même (statut NON_VERIFIE) — voir utils/verificationNip.js.
    // NIP_VERIFICATION_STRICTE=true bloque l'inscription en cas de non-correspondance
    // confirmée ; à activer seulement une fois l'interconnexion réelle fiabilisée.
    const verification = await verifierIdentiteNip({ nip, nom, prenom });
    if (verification.statut === 'ECHEC' && process.env.NIP_VERIFICATION_STRICTE === 'true') {
      return res.status(422).json({ message: verification.detail });
    }
    const citoyen = await Citoyen.create({
      nom,
      prenom,
      email,
      telephone,
      nip,
      motDePasse,
      statutVerificationNip: verification.statut,
    });
    res.status(201).json({ token: genererToken(citoyen), citoyen: toPublic(citoyen) });
  } catch (err) {
    if (err.code === 11000) {
      const champ = Object.keys(err.keyPattern || {})[0] === 'nip' ? 'Ce NIP' : 'Cet e-mail';
      return res.status(409).json({ message: `${champ} est déjà associé à un compte.` });
    }
    next(err);
  }
});

// POST /api/citoyen/connexion
router.post('/connexion', limiteurAuthSensible, async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;
    const citoyen = await Citoyen.findOne({ email: email?.toLowerCase() });
    if (!citoyen || !(await citoyen.comparerMotDePasse(motDePasse))) {
      return res.status(401).json({ message: 'E-mail ou mot de passe incorrect.' });
    }
    if (!citoyen.actif) {
      return res.status(403).json({ message: 'Compte désactivé.' });
    }
    res.json({ token: genererToken(citoyen), citoyen: toPublic(citoyen) });
  } catch (err) {
    next(err);
  }
});

// POST /api/citoyen/mot-de-passe-oublie — demande de réinitialisation
router.post('/mot-de-passe-oublie', limiteurAuthSensible, async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase();
    const reponseGenerique = {
      message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé.',
    };

    const citoyen = await Citoyen.findOne({ email });
    if (!citoyen || !citoyen.actif) return res.json(reponseGenerique); // jamais révéler si le compte existe

    const { jeton, jetonHash, expiration } = genererJetonReinitialisation();
    citoyen.resetPasswordTokenHash = jetonHash;
    citoyen.resetPasswordExpire = expiration;
    await citoyen.save();

    const lien = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reinitialiser-mot-de-passe/${jeton}`;
    await envoyerEmail({
      to: citoyen.email,
      subject: 'Réinitialisation de votre mot de passe — Espace citoyen',
      html: `<p>Bonjour ${citoyen.prenom},</p><p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${lien}">${lien}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      texteLog: `Lien de réinitialisation citoyen : ${lien}`,
    });

    res.json(reponseGenerique);
  } catch (err) {
    next(err);
  }
});

// POST /api/citoyen/reinitialiser-mot-de-passe — pose du nouveau mot de passe
router.post('/reinitialiser-mot-de-passe', limiteurAuthSensible, async (req, res, next) => {
  try {
    const { jeton, motDePasse } = req.body;
    if (!jeton || !motDePasse) {
      return res.status(400).json({ message: 'Jeton et nouveau mot de passe requis.' });
    }
    if (motDePasse.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const jetonHash = hasherJeton(jeton);
    const citoyen = await Citoyen.findOne({
      resetPasswordTokenHash: jetonHash,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpire');

    if (!citoyen) {
      return res.status(400).json({ message: 'Lien invalide ou expiré. Refaites une demande.' });
    }

    citoyen.motDePasse = motDePasse; // rehashé par le hook pre('save') du modèle
    citoyen.resetPasswordTokenHash = undefined;
    citoyen.resetPasswordExpire = undefined;
    await citoyen.save();

    res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/citoyen/moi — profil du compte connecté
router.get('/moi', protegerCitoyen, (req, res) => {
  res.json(toPublic(req.citoyen));
});

// GET /api/citoyen/mes-demandes — tous les dossiers liés au NIP du compte,
// qu'ils aient été soumis avec ou sans compte (le NIP fait le lien).
router.get('/mes-demandes', protegerCitoyen, async (req, res, next) => {
  try {
    const demandes = await Demande.find({ 'citoyen.nip': req.citoyen.nip })
      .populate('service', 'nom code')
      .sort({ createdAt: -1 });
    res.json(demandes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

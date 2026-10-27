const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { genererJetonReinitialisation, hasherJeton } = require('../utils/resetToken');
const { envoyerEmail } = require('../utils/mailer');
const limiteurAuthSensible = require('../middleware/limiteurAuthSensible');

const router = express.Router();

function genererToken(agent) {
  return jwt.sign({ id: agent._id, role: agent.role, type: 'agent' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// POST /api/auth/login — connexion agent (Back-Office)
router.post('/login', limiteurAuthSensible, async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;
    const agent = await User.findOne({ email: email?.toLowerCase() });
    if (!agent || !(await agent.comparerMotDePasse(motDePasse))) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    if (!agent.actif) {
      return res.status(403).json({ message: 'Compte désactivé.' });
    }
    res.json({
      token: genererToken(agent),
      agent: { id: agent._id, nom: agent.nom, email: agent.email, role: agent.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/mot-de-passe-oublie — demande de réinitialisation (agent)
router.post('/mot-de-passe-oublie', limiteurAuthSensible, async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase();
    const reponseGenerique = {
      message: 'Si un compte agent existe avec cet e-mail, un lien de réinitialisation a été envoyé.',
    };

    const agent = await User.findOne({ email });
    if (!agent || !agent.actif) return res.json(reponseGenerique); // jamais révéler si le compte existe

    const { jeton, jetonHash, expiration } = genererJetonReinitialisation();
    agent.resetPasswordTokenHash = jetonHash;
    agent.resetPasswordExpire = expiration;
    await agent.save();

    const lien = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/agent/reinitialiser-mot-de-passe/${jeton}`;
    await envoyerEmail({
      to: agent.email,
      subject: 'Réinitialisation de votre mot de passe — Espace agent',
      html: `<p>Bonjour ${agent.nom},</p><p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${lien}">${lien}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      texteLog: `Lien de réinitialisation agent : ${lien}`,
    });

    res.json(reponseGenerique);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reinitialiser-mot-de-passe — pose du nouveau mot de passe (agent)
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
    const agent = await User.findOne({
      resetPasswordTokenHash: jetonHash,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpire');

    if (!agent) {
      return res.status(400).json({ message: 'Lien invalide ou expiré. Refaites une demande.' });
    }

    agent.motDePasse = motDePasse; // rehashé par le hook pre('save') du modèle
    agent.resetPasswordTokenHash = undefined;
    agent.resetPasswordExpire = undefined;
    await agent.save();

    res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

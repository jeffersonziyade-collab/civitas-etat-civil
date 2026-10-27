const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Citoyen = require('../models/Citoyen');

async function proteger(req, res, next) {
  try {
    const entete = req.headers.authorization || '';
    if (!entete.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès refusé : jeton manquant.' });
    }
    const token = entete.split(' ')[1];
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (decode.type && decode.type !== 'agent') {
      return res.status(401).json({ message: 'Jeton invalide pour cet espace.' });
    }
    const agent = await User.findById(decode.id).select('-motDePasse');
    if (!agent || !agent.actif) {
      return res.status(401).json({ message: 'Compte agent introuvable ou désactivé.' });
    }
    req.agent = agent;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Jeton invalide ou expiré.' });
  }
}

function autoriser(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.agent || !rolesAutorises.includes(req.agent.role)) {
      return res.status(403).json({ message: 'Rôle insuffisant pour cette action.' });
    }
    next();
  };
}

// Protège les routes du Front-Office réservées à un citoyen authentifié
// ("Mon espace"). Jeton distinct de celui des agents (claim type: 'citoyen').
async function protegerCitoyen(req, res, next) {
  try {
    const entete = req.headers.authorization || '';
    if (!entete.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Connexion requise.' });
    }
    const token = entete.split(' ')[1];
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (decode.type !== 'citoyen') {
      return res.status(401).json({ message: 'Jeton invalide pour cet espace.' });
    }
    const citoyen = await Citoyen.findById(decode.id).select('-motDePasse');
    if (!citoyen || !citoyen.actif) {
      return res.status(401).json({ message: 'Compte introuvable ou désactivé.' });
    }
    req.citoyen = citoyen;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Jeton invalide ou expiré.' });
  }
}

module.exports = { proteger, autoriser, protegerCitoyen };

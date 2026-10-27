const rateLimit = require('express-rate-limit');

// Plus strict que le limiteur global de l'API : évite qu'on puisse spammer
// des e-mails de réinitialisation ou bruteforcer un mot de passe.
const limiteurAuthSensible = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiteurAuthSensible;

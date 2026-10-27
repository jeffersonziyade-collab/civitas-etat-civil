const crypto = require('crypto');

const DUREE_VALIDITE_MS = 60 * 60 * 1000; // 1 heure

/**
 * Génère un jeton aléatoire à haute entropie. Seul son hash SHA-256 est
 * stocké en base (comme un mot de passe, mais sans besoin de bcrypt : le
 * jeton est déjà aléatoire sur 32 octets, pas un secret choisi par un
 * humain). Le jeton en clair n'existe que le temps de l'e-mail envoyé.
 */
function genererJetonReinitialisation() {
  const jeton = crypto.randomBytes(32).toString('hex');
  const jetonHash = crypto.createHash('sha256').update(jeton).digest('hex');
  const expiration = new Date(Date.now() + DUREE_VALIDITE_MS);
  return { jeton, jetonHash, expiration };
}

function hasherJeton(jeton) {
  return crypto.createHash('sha256').update(jeton).digest('hex');
}

module.exports = { genererJetonReinitialisation, hasherJeton, DUREE_VALIDITE_MS };

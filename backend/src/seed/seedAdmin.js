require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

async function seed() {
  await connectDB();

  const email = process.argv[2];
  const motDePasse = process.argv[3];
  const nom = process.argv[4] || 'Administrateur';

  if (!email || !motDePasse) {
    console.log('Usage : node src/seed/seedAdmin.js <email> <motDePasse> [nom]');
    process.exit(1);
  }

  const existant = await User.findOne({ email });
  if (existant) {
    console.log('[SEED] Un agent avec cet email existe déjà.');
    process.exit(0);
  }

  await User.create({ nom, email, motDePasse, role: 'ADMIN' });
  console.log(`[SEED] Compte ADMIN créé pour ${email}.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Erreur :', err);
  process.exit(1);
});

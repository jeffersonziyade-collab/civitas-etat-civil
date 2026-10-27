const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/etat_civil';
  try {
    await mongoose.connect(uri);
    console.log(`[DB] Connecté à MongoDB : ${uri}`);
  } catch (err) {
    console.error('[DB] Échec de connexion à MongoDB :', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

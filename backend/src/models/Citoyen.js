const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Compte citoyen (Front-Office). Distinct du modèle User (agents/back-office).
 * Le NIP sert de clé de rattachement aux demandes existantes (soumises avec ou
 * sans compte) : "Mes demandes" retrouve tout dossier dont citoyen.nip
 * correspond au NIP de ce compte, sans changer le schéma Demande.
 */
const CitoyenSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telephone: { type: String, trim: true },
    nip: { type: String, required: true, unique: true, trim: true },
    motDePasse: { type: String, required: true },
    actif: { type: Boolean, default: true },
    statutVerificationNip: {
      type: String,
      enum: ['VERIFIE', 'NON_VERIFIE', 'ECHEC'],
      default: 'NON_VERIFIE',
    },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

CitoyenSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
  next();
});

CitoyenSchema.methods.comparerMotDePasse = function (motDePasse) {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

module.exports = mongoose.model('Citoyen', CitoyenSchema);

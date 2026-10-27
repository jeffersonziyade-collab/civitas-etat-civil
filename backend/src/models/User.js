const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    motDePasse: { type: String, required: true },
    role: {
      type: String,
      enum: ['AGENT', 'SUPERVISEUR', 'ADMIN'],
      default: 'AGENT',
    },
    service: { type: String, default: 'DSPCP/Etat Civil' },
    actif: { type: Boolean, default: true },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
  next();
});

UserSchema.methods.comparerMotDePasse = function (motDePasse) {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

module.exports = mongoose.model('User', UserSchema);

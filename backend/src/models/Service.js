const mongoose = require('mongoose');

/**
 * Modèle "Service" = fiche synthétique obligatoire (section 3.1 du CdC)
 * affichée avant soumission : pièce à fournir, coût, formalité, délai.
 */
const ServiceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nom: { type: String, required: true },
    cibleDescription: { type: String, required: true },

    // Coût : montant fixe OU fourchette (ex: "Délivrance d'actes" = 500 à 50000 F)
    cout: {
      type: { type: String, enum: ['fixe', 'fourchette'], default: 'fixe' },
      montant: { type: Number }, // si type = fixe
      montantMin: { type: Number }, // si type = fourchette
      montantMax: { type: Number },
      devise: { type: String, default: 'XOF' },
    },

    // Délai de traitement (SLA)
    sla: {
      minJours: { type: Number, required: true },
      maxJours: { type: Number, required: true },
      label: { type: String }, // ex: "1 à 3 jours", "À définir"
    },

    niveauPriorite: { type: Number, default: 5 }, // plus petit = plus prioritaire, cf. utils/priority.js

    formalite: { type: String, required: true }, // conditions légales requises

    piecesAFournir: [
      {
        libelle: { type: String, required: true },
        formatsAcceptes: [{ type: String, enum: ['pdf', 'image'], default: ['pdf', 'image'] }],
        obligatoire: { type: Boolean, default: true },
      },
    ],

    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);

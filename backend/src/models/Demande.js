const mongoose = require('mongoose');

/**
 * Modèle "Demande" — reprend fidèlement la structure JSON du CdC (section 5.1)
 * pour rester interopérable avec la plateforme des e-services du Bénin (Phase 4).
 */
const DemandeSchema = new mongoose.Schema(
  {
    demandeId: { type: String, required: true, unique: true }, // ex: REQ-2026-09-001

    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceCode: { type: String, required: true },

    citoyen: {
      nom: { type: String, required: true },
      prenom: { type: String, required: true },
      nip: { type: String, required: true }, // Numéro d'Identification Personnelle
      telephone: { type: String },
      email: { type: String },
    },

    fraisService: {
      montant: { type: Number, required: true },
      devise: { type: String, default: 'XOF' },
      statutPaiement: {
        type: String,
        enum: ['EN_ATTENTE', 'PAYE', 'ECHEC', 'REMBOURSE'],
        default: 'EN_ATTENTE',
      },
      moyenPaiement: {
        type: String,
        enum: ['CINETPAY', 'MTN_MOMO', 'MOOV_MONEY', 'PAYDUNYA', null],
        default: null,
      },
      referenceTransaction: { type: String },
    },

    delaiAttenduJours: { type: Number, required: true },

    piecesJointes: [{ type: String }], // URLs de stockage (PDF/Image)

    // Suivi métier back-office (section 3.2)
    statut: {
      type: String,
      enum: ['Nouveau', 'En cours', 'Validé', 'Rejeté'],
      default: 'Nouveau',
    },
    niveauPriorite: { type: Number, required: true }, // hérité du service au moment de la création

    motifRejet: { type: String },
    agentTraitant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateEcheance: { type: Date }, // calculée à partir de delaiAttenduJours -> alertes de délai
    historique: [
      {
        statut: String,
        commentaire: String,
        agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
      },
    ],

    documentSigne: { type: String }, // URL du document final signé électroniquement
  },
  { timestamps: true }
);

DemandeSchema.index({ statut: 1, niveauPriorite: 1 });
DemandeSchema.index({ dateEcheance: 1 });

module.exports = mongoose.model('Demande', DemandeSchema);

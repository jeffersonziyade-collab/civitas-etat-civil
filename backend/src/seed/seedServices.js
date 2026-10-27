require('dotenv').config();
const connectDB = require('../config/db');
const Service = require('../models/Service');

// Catalogue exact des 5 processus métiers (section 4 du Cahier des Charges)
const services = [
  {
    code: 'LEGALISATION_COPIE',
    nom: 'Légalisation des copies et souches',
    cibleDescription: 'Toute la population (tous documents utiles).',
    cout: { type: 'fixe', montant: 500, devise: 'XOF' },
    sla: { minJours: 1, maxJours: 1, label: '1 jour' },
    niveauPriorite: 4,
    formalite: "Présentation du document original et de sa copie à légaliser.",
    piecesAFournir: [
      { libelle: 'Document original', formatsAcceptes: ['pdf', 'image'] },
      { libelle: 'Copie à légaliser', formatsAcceptes: ['pdf', 'image'] },
    ],
  },
  {
    code: 'AUTORISATION_PARENTALE',
    nom: 'Autorisation parentale',
    cibleDescription: 'Mineurs devant voyager (Pays Africains, Europe, etc.).',
    cout: { type: 'fixe', montant: 1300, devise: 'XOF' },
    sla: { minJours: 1, maxJours: 3, label: '1 à 3 jours' },
    niveauPriorite: 7,
    formalite: "Consentement des deux parents ou du tuteur légal, pièce d'identité des parents.",
    piecesAFournir: [
      { libelle: "Pièce d'identité du/des parent(s)", formatsAcceptes: ['pdf', 'image'] },
      { libelle: "Acte de naissance du mineur", formatsAcceptes: ['pdf', 'image'] },
      { libelle: 'Justificatif du voyage (billet, invitation)', formatsAcceptes: ['pdf', 'image'], obligatoire: false },
    ],
  },
  {
    code: 'NON_INSCRIPTION_DECES',
    nom: 'Certificat de non inscription (Décès)',
    cibleDescription: "Citoyens n'ayant pas déclaré un décès à temps.",
    cout: { type: 'fixe', montant: 1100, devise: 'XOF' },
    sla: { minJours: 1, maxJours: 1, label: '1 jour' },
    niveauPriorite: 5,
    formalite: 'Déclaration sur l’honneur et pièces justificatives du lien avec le défunt.',
    piecesAFournir: [
      { libelle: "Pièce d'identité du demandeur", formatsAcceptes: ['pdf', 'image'] },
      { libelle: 'Déclaration sur l’honneur', formatsAcceptes: ['pdf'] },
    ],
  },
  {
    code: 'NON_INSCRIPTION_NAISSANCE',
    nom: 'Certificat de non inscription (Naissance)',
    cibleDescription: "Citoyens mineurs/majeurs sans acte de naissance.",
    cout: { type: 'fixe', montant: 20000, devise: 'XOF' },
    sla: { minJours: 1, maxJours: 3, label: '1 à 3 jours' },
    niveauPriorite: 8,
    formalite: 'Enquête de moralité et témoignages, selon la réglementation en vigueur.',
    piecesAFournir: [
      { libelle: "Pièce d'identité du demandeur ou du tuteur", formatsAcceptes: ['pdf', 'image'] },
      { libelle: 'Attestation de témoins', formatsAcceptes: ['pdf', 'image'] },
    ],
  },
  {
    code: 'DELIVRANCE_ACTES',
    nom: "Délivrance d'actes d'état civil (détaillé)",
    cibleDescription: "Toute la population pour l'obtention d'actes spécifiques.",
    cout: { type: 'fourchette', montantMin: 500, montantMax: 50000, devise: 'XOF' },
    sla: { minJours: 1, maxJours: 3, label: 'À définir' },
    niveauPriorite: 9,
    formalite: "Variable selon le type d'acte demandé (naissance, mariage, décès...).",
    piecesAFournir: [
      { libelle: "Pièce d'identité du demandeur", formatsAcceptes: ['pdf', 'image'] },
      { libelle: 'Référence ou numéro du registre si connu', formatsAcceptes: ['pdf', 'image'], obligatoire: false },
    ],
  },
];

async function seed() {
  await connectDB();
  await Service.deleteMany({});
  await Service.insertMany(services);
  console.log(`[SEED] ${services.length} services insérés depuis le catalogue du CdC.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Erreur :', err);
  process.exit(1);
});

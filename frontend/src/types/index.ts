export interface PieceAFournir {
  libelle: string;
  formatsAcceptes: string[];
  obligatoire?: boolean;
}

export interface Service {
  _id: string;
  code: string;
  nom: string;
  cibleDescription: string;
  cout: {
    type: 'fixe' | 'fourchette';
    montant?: number;
    montantMin?: number;
    montantMax?: number;
    devise: string;
  };
  sla: { minJours: number; maxJours: number; label: string };
  niveauPriorite: number;
  formalite: string;
  piecesAFournir: PieceAFournir[];
  actif: boolean;
}

export interface Demande {
  _id: string;
  demandeId: string;
  serviceCode: string;
  service: { nom: string; code: string } | string;
  citoyen: { nom: string; prenom: string; nip: string; telephone?: string; email?: string };
  fraisService: {
    montant: number;
    devise: string;
    statutPaiement: 'EN_ATTENTE' | 'PAYE' | 'ECHEC' | 'REMBOURSE';
    moyenPaiement?: string;
  };
  delaiAttenduJours: number;
  statut: 'Nouveau' | 'En cours' | 'Validé' | 'Rejeté';
  niveauPriorite: number;
  dateEcheance: string;
  motifRejet?: string;
  alerteDelai?: 'RETARD' | 'URGENT' | 'OK' | 'CLOS';
  createdAt: string;
}

export interface Agent {
  id: string;
  nom: string;
  email: string;
  role: 'AGENT' | 'SUPERVISEUR' | 'ADMIN';
  actif?: boolean;
}

export interface Citoyen {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  nip: string;
  statutVerificationNip?: 'VERIFIE' | 'NON_VERIFIE' | 'ECHEC';
}

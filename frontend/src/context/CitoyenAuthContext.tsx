import { createContext, useContext, useState, ReactNode } from 'react';
import { Citoyen } from '../types';

interface CitoyenAuthContextValue {
  citoyen: Citoyen | null;
  seConnecter: (token: string, citoyen: Citoyen) => void;
  seDeconnecter: () => void;
}

const CitoyenAuthContext = createContext<CitoyenAuthContextValue | undefined>(undefined);

export function CitoyenAuthProvider({ children }: { children: ReactNode }) {
  const [citoyen, setCitoyen] = useState<Citoyen | null>(() => {
    const stocke = localStorage.getItem('citoyen_info');
    return stocke ? JSON.parse(stocke) : null;
  });

  function seConnecter(token: string, citoyenInfo: Citoyen) {
    localStorage.setItem('citoyen_token', token);
    localStorage.setItem('citoyen_info', JSON.stringify(citoyenInfo));
    setCitoyen(citoyenInfo);
  }

  function seDeconnecter() {
    localStorage.removeItem('citoyen_token');
    localStorage.removeItem('citoyen_info');
    setCitoyen(null);
  }

  return (
    <CitoyenAuthContext.Provider value={{ citoyen, seConnecter, seDeconnecter }}>
      {children}
    </CitoyenAuthContext.Provider>
  );
}

export function useCitoyenAuth() {
  const ctx = useContext(CitoyenAuthContext);
  if (!ctx) throw new Error('useCitoyenAuth doit être utilisé dans CitoyenAuthProvider');
  return ctx;
}

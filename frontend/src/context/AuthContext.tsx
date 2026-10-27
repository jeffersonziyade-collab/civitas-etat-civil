import { createContext, useContext, useState, ReactNode } from 'react';
import { Agent } from '../types';

interface AuthContextValue {
  agent: Agent | null;
  seConnecter: (token: string, agent: Agent) => void;
  seDeconnecter: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(() => {
    const stocke = localStorage.getItem('agent_info');
    return stocke ? JSON.parse(stocke) : null;
  });

  function seConnecter(token: string, agentInfo: Agent) {
    localStorage.setItem('agent_token', token);
    localStorage.setItem('agent_info', JSON.stringify(agentInfo));
    setAgent(agentInfo);
  }

  function seDeconnecter() {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_info');
    setAgent(null);
  }

  return (
    <AuthContext.Provider value={{ agent, seConnecter, seDeconnecter }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

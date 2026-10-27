import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AgentLogin() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const { seConnecter } = useAuth();
  const navigate = useNavigate();

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const res = await client.post('/auth/login', { email, motDePasse });
      seConnecter(res.data.token, res.data.agent);
      navigate('/agent/dashboard');
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Connexion impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-civil-700 mb-1">Portail Agent</h1>
      <p className="text-gray-600 text-sm mb-6">DSPCP / Service de l'État Civil</p>

      <form onSubmit={connecter} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            required
            type="email"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Mot de passe</label>
          <input
            required
            type="password"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        <button
          disabled={envoi}
          className="w-full bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
        >
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-4">
        <Link to="/agent/mot-de-passe-oublie" className="underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </div>
  );
}

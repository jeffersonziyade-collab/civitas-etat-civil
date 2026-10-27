import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Agent } from '../types';
import { useAuth } from '../context/AuthContext';

const ROLES: Agent['role'][] = ['AGENT', 'SUPERVISEUR', 'ADMIN'];

export default function AdminAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const { agent, seDeconnecter } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '', role: 'AGENT' as Agent['role'] });

  useEffect(() => {
    if (agent && agent.role !== 'ADMIN') {
      navigate('/agent/dashboard');
      return;
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const res = await client.get('/admin/agents');
      setAgents(res.data);
    } finally {
      setChargement(false);
    }
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    setEnvoi(true);
    try {
      await client.post('/admin/agents', form);
      setMessage(`Compte créé pour ${form.email}.`);
      setForm({ nom: '', email: '', motDePasse: '', role: 'AGENT' });
      charger();
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Création impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  async function changerRole(id: string, role: Agent['role']) {
    await client.patch(`/admin/agents/${id}`, { role });
    charger();
  }

  async function basculerActif(id: string, actif: boolean) {
    try {
      await client.patch(`/admin/agents/${id}`, { actif: !actif });
      charger();
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Action impossible.');
    }
  }

  function deconnexion() {
    seDeconnecter();
    navigate('/agent/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-civil-700">Gestion des comptes agents</h1>
          <p className="text-gray-600 text-sm">Connecté en tant que {agent?.nom} (ADMIN)</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/agent/dashboard" className="text-sm text-civil-600 underline">
            ← Tableau de bord
          </Link>
          <button onClick={deconnexion} className="text-sm text-gray-500 underline">
            Déconnexion
          </button>
        </div>
      </div>

      <form onSubmit={creer} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-gray-700">Créer un compte</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nom complet"
            className="border rounded-lg px-3 py-2"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Email"
            className="border rounded-lg px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Mot de passe provisoire"
            className="border rounded-lg px-3 py-2"
            value={form.motDePasse}
            onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Agent['role'] })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        <button
          disabled={envoi}
          className="bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
        >
          {envoi ? 'Création…' : 'Créer le compte'}
        </button>
      </form>

      {chargement ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-medium">{a.nom}</td>
                  <td className="p-3">{a.email}</td>
                  <td className="p-3">
                    <select
                      className="border rounded-lg px-2 py-1 text-xs"
                      value={a.role}
                      onChange={(e) => changerRole(a.id, e.target.value as Agent['role'])}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        a.actif !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {a.actif !== false ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => basculerActif(a.id, a.actif !== false)}
                      className="text-xs underline text-civil-600"
                    >
                      {a.actif !== false ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    Aucun agent enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import citoyenClient from '../api/citoyenClient';
import Layout from '../components/Layout';

export default function CitizenResetPassword() {
  const { jeton } = useParams<{ jeton: string }>();
  const navigate = useNavigate();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState(false);

  async function reinitialiser(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEnvoi(true);
    try {
      await citoyenClient.post('/citoyen/reinitialiser-mot-de-passe', { jeton, motDePasse });
      setSucces(true);
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto px-4 py-14">
        <h1 className="text-2xl font-bold text-civil-700 mb-1">Nouveau mot de passe</h1>

        {succes ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-green-700">
            Mot de passe mis à jour. Redirection vers la connexion…
          </div>
        ) : (
          <form onSubmit={reinitialiser} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <input
                required
                minLength={8}
                type="password"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">8 caractères minimum.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Confirmer le mot de passe</label>
              <input
                required
                type="password"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>
            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
            <button
              disabled={envoi}
              className="w-full bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
            >
              {envoi ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/connexion" className="underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </Layout>
  );
}

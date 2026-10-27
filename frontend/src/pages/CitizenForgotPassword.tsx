import { useState } from 'react';
import { Link } from 'react-router-dom';
import citoyenClient from '../api/citoyenClient';
import Layout from '../components/Layout';

export default function CitizenForgotPassword() {
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const res = await citoyenClient.post('/citoyen/mot-de-passe-oublie', { email });
      setMessage(res.data.message);
      setEnvoye(true);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto px-4 py-14">
        <h1 className="text-2xl font-bold text-civil-700 mb-1">Mot de passe oublié</h1>
        <p className="text-gray-600 text-sm mb-6">
          Indiquez l'e-mail de votre compte citoyen : nous vous envoyons un lien pour choisir un
          nouveau mot de passe.
        </p>

        {envoye ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-700">
            {message}
          </div>
        ) : (
          <form onSubmit={envoyer} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
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
            {message && <p className="text-red-600 text-sm">{message}</p>}
            <button
              disabled={envoi}
              className="w-full bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
            >
              {envoi ? 'Envoi…' : 'Envoyer le lien'}
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

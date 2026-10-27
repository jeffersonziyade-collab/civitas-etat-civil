import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import citoyenClient from '../api/citoyenClient';
import { useCitoyenAuth } from '../context/CitoyenAuthContext';
import Layout from '../components/Layout';

export default function CitizenLogin() {
  const [onglet, setOnglet] = useState<'connexion' | 'inscription'>('connexion');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const { seConnecter } = useCitoyenAuth();
  const navigate = useNavigate();

  const [connexionForm, setConnexionForm] = useState({ email: '', motDePasse: '' });
  const [inscriptionForm, setInscriptionForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    nip: '',
    motDePasse: '',
  });

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const res = await citoyenClient.post('/citoyen/connexion', connexionForm);
      seConnecter(res.data.token, res.data.citoyen);
      navigate('/mon-espace');
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Connexion impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  async function inscrire(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const res = await citoyenClient.post('/citoyen/inscription', inscriptionForm);
      seConnecter(res.data.token, res.data.citoyen);
      navigate('/mon-espace');
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Inscription impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto px-4 py-14">
        <h1 className="text-2xl font-bold text-civil-700 mb-1">Espace citoyen</h1>
        <p className="text-gray-600 text-sm mb-6">
          Connectez-vous pour retrouver toutes vos demandes sans ressaisir votre numéro de dossier.
        </p>

        <div className="flex mb-4 border-b">
          <button
            onClick={() => {
              setOnglet('connexion');
              setErreur('');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
              onglet === 'connexion' ? 'border-civil-600 text-civil-700' : 'border-transparent text-gray-500'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => {
              setOnglet('inscription');
              setErreur('');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
              onglet === 'inscription' ? 'border-civil-600 text-civil-700' : 'border-transparent text-gray-500'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {onglet === 'connexion' ? (
          <form onSubmit={connecter} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={connexionForm.email}
                onChange={(e) => setConnexionForm({ ...connexionForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <input
                required
                type="password"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={connexionForm.motDePasse}
                onChange={(e) => setConnexionForm({ ...connexionForm, motDePasse: e.target.value })}
              />
            </div>
            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
            <button
              disabled={envoi}
              className="w-full bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
            >
              {envoi ? 'Connexion…' : 'Se connecter'}
            </button>
            <p className="text-center text-xs text-gray-400">
              <Link to="/mot-de-passe-oublie" className="underline">
                Mot de passe oublié ?
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={inscrire} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Nom</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={inscriptionForm.nom}
                  onChange={(e) => setInscriptionForm({ ...inscriptionForm, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={inscriptionForm.prenom}
                  onChange={(e) => setInscriptionForm({ ...inscriptionForm, prenom: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">NIP (Numéro d'Identification Personnelle)</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={inscriptionForm.nip}
                onChange={(e) => setInscriptionForm({ ...inscriptionForm, nip: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={inscriptionForm.email}
                onChange={(e) => setInscriptionForm({ ...inscriptionForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <input
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={inscriptionForm.telephone}
                onChange={(e) => setInscriptionForm({ ...inscriptionForm, telephone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <input
                required
                minLength={8}
                type="password"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={inscriptionForm.motDePasse}
                onChange={(e) => setInscriptionForm({ ...inscriptionForm, motDePasse: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">8 caractères minimum.</p>
            </div>
            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
            <button
              disabled={envoi}
              className="w-full bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
            >
              {envoi ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Vous pouvez aussi{' '}
          <Link to="/suivi" className="underline">
            suivre un dossier sans compte
          </Link>{' '}
          avec son numéro et votre NIP.
        </p>
      </div>
    </Layout>
  );
}

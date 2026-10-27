import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import citoyenClient from '../api/citoyenClient';
import { Demande } from '../types';
import { useCitoyenAuth } from '../context/CitoyenAuthContext';
import Layout from '../components/Layout';

const COULEUR_STATUT: Record<string, string> = {
  Nouveau: 'bg-blue-100 text-blue-700',
  'En cours': 'bg-amber-100 text-amber-700',
  Validé: 'bg-green-100 text-green-700',
  Rejeté: 'bg-red-100 text-red-700',
};

export default function CitizenAccount() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const { citoyen, seDeconnecter } = useCitoyenAuth();
  const navigate = useNavigate();

  useEffect(() => {
    citoyenClient
      .get('/citoyen/mes-demandes')
      .then((res) => setDemandes(res.data))
      .catch(() => setErreur('Impossible de charger vos demandes pour le moment.'))
      .finally(() => setChargement(false));
  }, []);

  function deconnexion() {
    seDeconnecter();
    navigate('/');
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-civil-700">Mon espace</h1>
            <p className="text-gray-600 text-sm">
              {citoyen?.prenom} {citoyen?.nom} — {citoyen?.email}
            </p>
            {citoyen?.statutVerificationNip !== 'VERIFIE' && (
              <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                Identité non encore vérifiée par la plateforme nationale — n'affecte pas vos
                démarches en cours.
              </p>
            )}
          </div>
          <button onClick={deconnexion} className="text-sm text-gray-500 underline">
            Déconnexion
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg bg-civil-600 hover:bg-civil-700 text-white px-4 py-2.5 text-sm font-medium"
          >
            Nouvelle demande
          </Link>
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Mes demandes</h2>

        {chargement && <p className="text-gray-500 text-sm">Chargement…</p>}
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

        {!chargement && demandes.length === 0 && !erreur && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
            Vous n'avez encore soumis aucune demande.
          </div>
        )}

        <div className="space-y-3">
          {demandes.map((d) => (
            <Link
              key={d._id}
              to={`/suivi/${d.demandeId}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-civil-600 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{d.demandeId}</div>
                  <div className="text-sm text-gray-500">
                    {typeof d.service === 'string' ? d.serviceCode : d.service.nom}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${COULEUR_STATUT[d.statut]}`}>
                  {d.statut}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Soumise le {new Date(d.createdAt).toLocaleDateString('fr-FR')} · Échéance{' '}
                {new Date(d.dateEcheance).toLocaleDateString('fr-FR')}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

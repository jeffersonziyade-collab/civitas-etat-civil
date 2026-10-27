import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import client from '../api/client';
import { Demande } from '../types';
import Layout from '../components/Layout';

const COULEUR_STATUT: Record<string, string> = {
  Nouveau: 'bg-blue-100 text-blue-700',
  'En cours': 'bg-amber-100 text-amber-700',
  Validé: 'bg-green-100 text-green-700',
  Rejeté: 'bg-red-100 text-red-700',
};

export default function TrackRequest() {
  const { demandeId: idParUrl } = useParams();
  const location = useLocation();
  const avertissement = (location.state as any)?.avertissement as string | undefined;

  const [demandeIdSaisi, setDemandeIdSaisi] = useState(idParUrl || '');
  const [nip, setNip] = useState('');
  const [demande, setDemande] = useState<Demande | null>(null);
  const [erreur, setErreur] = useState('');

  async function rechercher(id: string, nipSaisi: string) {
    setErreur('');
    setDemande(null);
    if (!nipSaisi) {
      setErreur('Le NIP utilisé lors de la demande est requis pour la consulter.');
      return;
    }
    try {
      const res = await client.get(`/demandes/${id}`, { params: { nip: nipSaisi } });
      setDemande(res.data);
    } catch {
      setErreur('Aucun dossier trouvé, ou NIP incorrect.');
    }
  }

  useEffect(() => {
    if (idParUrl && nip) rechercher(idParUrl, nip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-civil-600 underline">
          ← Retour au catalogue
        </Link>
        <h1 className="text-2xl font-bold text-civil-700 mt-3 mb-6">Suivi de votre demande</h1>

        {avertissement && (
          <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg mb-4">{avertissement}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Numéro de dossier (ex: REQ-2026-0001)"
            value={demandeIdSaisi}
            onChange={(e) => setDemandeIdSaisi(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Votre NIP"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
        </div>
        <button
          onClick={() => rechercher(demandeIdSaisi, nip)}
          className="bg-civil-600 hover:bg-civil-700 text-white px-5 py-2.5 rounded-lg font-medium mb-6"
        >
          Rechercher
        </button>

        {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

        {demande && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">Dossier</div>
                <div className="font-semibold">{demande.demandeId}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${COULEUR_STATUT[demande.statut]}`}>
                {demande.statut}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm pt-3 border-t">
              <div>
                <div className="text-gray-500">Service</div>
                <div className="font-medium">
                  {typeof demande.service === 'string' ? demande.serviceCode : demande.service.nom}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Montant</div>
                <div className="font-medium">
                  {demande.fraisService.montant.toLocaleString('fr-FR')} {demande.fraisService.devise} —{' '}
                  {demande.fraisService.statutPaiement}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Délai attendu</div>
                <div className="font-medium">{demande.delaiAttenduJours} jour(s)</div>
              </div>
              <div>
                <div className="text-gray-500">Échéance</div>
                <div className="font-medium">
                  {new Date(demande.dateEcheance).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {demande.motifRejet && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
                Motif de rejet : {demande.motifRejet}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

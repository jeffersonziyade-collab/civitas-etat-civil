import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { Demande } from '../types';
import { useAuth } from '../context/AuthContext';

const ALERTE_STYLE: Record<string, string> = {
  RETARD: 'bg-red-100 text-red-700',
  URGENT: 'bg-amber-100 text-amber-700',
  OK: 'bg-gray-100 text-gray-600',
  CLOS: 'bg-gray-50 text-gray-400',
};

const ONGLET_STATUTS = ['Tous', 'Nouveau', 'En cours', 'Validé', 'Rejeté'];

export default function AgentDashboard() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [compteurs, setCompteurs] = useState<any>({});
  const [onglet, setOnglet] = useState('Tous');
  const [chargement, setChargement] = useState(true);
  const [motifModal, setMotifModal] = useState<{ demandeId: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [erreurAction, setErreurAction] = useState('');
  const { agent, seDeconnecter } = useAuth();
  const navigate = useNavigate();
  const peutTrancher = agent?.role === 'SUPERVISEUR' || agent?.role === 'ADMIN';

  async function charger() {
    setChargement(true);
    const params = onglet !== 'Tous' ? { statut: onglet } : {};
    const res = await client.get('/agent/dashboard', { params });
    setDemandes(res.data.demandes);
    setCompteurs(res.data.compteurs);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet]);

  async function changerStatut(demandeId: string, statut: string, commentaire?: string) {
    setErreurAction('');
    try {
      await client.patch(`/agent/demandes/${demandeId}/statut`, { statut, commentaire });
      charger();
    } catch (err: any) {
      setErreurAction(err.response?.data?.message || 'Action impossible.');
    }
  }

  function deconnexion() {
    seDeconnecter();
    navigate('/agent/login');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-civil-700">Tableau de bord — Back-Office</h1>
          <p className="text-gray-600 text-sm">Connecté en tant que {agent?.nom} ({agent?.role})</p>
        </div>
        <div className="flex items-center gap-4">
          {agent?.role !== 'AGENT' && (
            <Link to="/agent/admin/services" className="text-sm text-civil-600 underline">
              Gérer le catalogue
            </Link>
          )}
          {agent?.role === 'ADMIN' && (
            <Link to="/agent/admin/agents" className="text-sm text-civil-600 underline">
              Gérer les agents
            </Link>
          )}
          <button onClick={deconnexion} className="text-sm text-gray-500 underline">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {['Nouveau', 'En cours', 'Validé', 'Rejeté', 'enRetard'].map((cle) => (
          <div key={cle} className="bg-white border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-civil-700">{compteurs[cle] ?? 0}</div>
            <div className="text-xs text-gray-500">{cle === 'enRetard' ? 'En retard' : cle}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {ONGLET_STATUTS.map((s) => (
          <button
            key={s}
            onClick={() => setOnglet(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              onglet === s ? 'border-civil-600 text-civil-700' : 'border-transparent text-gray-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {erreurAction && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          {erreurAction}
        </div>
      )}

      {chargement ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Dossier</th>
                <th className="p-3">Service</th>
                <th className="p-3">Citoyen</th>
                <th className="p-3">Priorité</th>
                <th className="p-3">Échéance</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d._id} className="border-t">
                  <td className="p-3 font-medium">{d.demandeId}</td>
                  <td className="p-3">{typeof d.service === 'string' ? d.serviceCode : d.service.nom}</td>
                  <td className="p-3">
                    {d.citoyen.prenom} {d.citoyen.nom}
                  </td>
                  <td className="p-3">{d.niveauPriorite}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${ALERTE_STYLE[d.alerteDelai || 'OK']}`}>
                      {new Date(d.dateEcheance).toLocaleDateString('fr-FR')} · {d.alerteDelai}
                    </span>
                  </td>
                  <td className="p-3">{d.statut}</td>
                  <td className="p-3 space-x-2">
                    {d.statut === 'Nouveau' && (
                      <button
                        onClick={() => changerStatut(d.demandeId, 'En cours')}
                        className="text-civil-600 underline text-xs"
                      >
                        Prendre en charge
                      </button>
                    )}
                    {d.statut === 'En cours' && peutTrancher && (
                      <>
                        <button
                          onClick={() => changerStatut(d.demandeId, 'Validé')}
                          className="text-green-600 underline text-xs"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setMotifModal({ demandeId: d.demandeId })}
                          className="text-red-600 underline text-xs"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    {d.statut === 'En cours' && !peutTrancher && (
                      <span className="text-xs text-gray-400 italic">
                        En attente d'une décision SUPERVISEUR/ADMIN
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {demandes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    Aucune demande dans cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {motifModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
            <h2 className="font-semibold">Motif du rejet — {motifModal.demandeId}</h2>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Expliquez la raison du rejet…"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMotifModal(null)} className="px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                onClick={async () => {
                  await changerStatut(motifModal.demandeId, 'Rejeté', motif);
                  setMotif('');
                  setMotifModal(null);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

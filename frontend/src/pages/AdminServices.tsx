import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Service } from '../types';
import { useAuth } from '../context/AuthContext';

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrementId, setEnregistrementId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { agent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (agent && agent.role === 'AGENT') {
      navigate('/agent/dashboard');
      return;
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function charger() {
    setChargement(true);
    const res = await client.get('/admin/services');
    setServices(res.data);
    setChargement(false);
  }

  function modifierChamp(code: string, chemin: string, valeur: any) {
    setServices((prev) =>
      prev.map((s) => {
        if (s.code !== code) return s;
        const copie: any = { ...s };
        const [racine, sousChamp] = chemin.split('.');
        if (sousChamp) {
          copie[racine] = { ...copie[racine], [sousChamp]: valeur };
        } else {
          copie[racine] = valeur;
        }
        return copie;
      })
    );
  }

  async function enregistrer(service: Service) {
    setEnregistrementId(service.code);
    setMessage('');
    try {
      await client.put(`/admin/services/${service.code}`, {
        cout: service.cout,
        sla: service.sla,
        niveauPriorite: service.niveauPriorite,
        formalite: service.formalite,
        cibleDescription: service.cibleDescription,
        actif: service.actif,
      });
      setMessage(`${service.nom} mis à jour.`);
    } catch {
      setMessage("Échec de l'enregistrement.");
    } finally {
      setEnregistrementId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-civil-700">Administration du catalogue</h1>
          <p className="text-gray-600 text-sm">
            Mairie de Porto-Novo — modifiez tarifs, délais et priorités sans intervention technique.
          </p>
        </div>
        <Link to="/agent/dashboard" className="text-sm text-civil-600 underline">
          ← Tableau de bord
        </Link>
      </div>

      {message && <div className="bg-civil-50 text-civil-700 text-sm p-3 rounded-lg mb-4">{message}</div>}

      {chargement ? (
        <p>Chargement…</p>
      ) : (
        <div className="space-y-4">
          {services.map((s) => (
            <div key={s.code} className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-semibold">{s.nom}</h2>
                  <p className="text-xs text-gray-400">{s.code}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.actif}
                    onChange={(e) => modifierChamp(s.code, 'actif', e.target.checked)}
                  />
                  Actif
                </label>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 text-sm">
                {s.cout.type === 'fixe' ? (
                  <div>
                    <label className="text-gray-500 block mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-2 py-1.5"
                      value={s.cout.montant}
                      onChange={(e) => modifierChamp(s.code, 'cout.montant', Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-gray-500 block mb-1">Montant min (FCFA)</label>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-2 py-1.5"
                        value={s.cout.montantMin}
                        onChange={(e) => modifierChamp(s.code, 'cout.montantMin', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">Montant max (FCFA)</label>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-2 py-1.5"
                        value={s.cout.montantMax}
                        onChange={(e) => modifierChamp(s.code, 'cout.montantMax', Number(e.target.value))}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-gray-500 block mb-1">Délai max (jours)</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={s.sla.maxJours}
                    onChange={(e) => modifierChamp(s.code, 'sla.maxJours', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Priorité</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={s.niveauPriorite}
                    onChange={(e) => modifierChamp(s.code, 'niveauPriorite', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-gray-500 block mb-1 text-sm">Formalité</label>
                <textarea
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  rows={2}
                  value={s.formalite}
                  onChange={(e) => modifierChamp(s.code, 'formalite', e.target.value)}
                />
              </div>

              <button
                onClick={() => enregistrer(s)}
                disabled={enregistrementId === s.code}
                className="mt-3 bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {enregistrementId === s.code ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

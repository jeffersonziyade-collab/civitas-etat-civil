import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { Service } from '../types';
import Layout from '../components/Layout';
import { useCitoyenAuth } from '../context/CitoyenAuthContext';

function formatCout(s: Service) {
  if (s.cout.type === 'fixe') return `${s.cout.montant?.toLocaleString('fr-FR')} ${s.cout.devise}`;
  return `${s.cout.montantMin?.toLocaleString('fr-FR')} à ${s.cout.montantMax?.toLocaleString('fr-FR')} ${s.cout.devise}`;
}

export default function ServiceDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [etape, setEtape] = useState<'fiche' | 'formulaire'>('fiche');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const [form, setForm] = useState({ nom: '', prenom: '', nip: '', telephone: '', email: '' });
  const { citoyen } = useCitoyenAuth();

  useEffect(() => {
    if (citoyen) {
      setForm({
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        nip: citoyen.nip,
        telephone: citoyen.telephone || '',
        email: citoyen.email,
      });
    }
  }, [citoyen]);

  const [pieces, setPieces] = useState<Record<number, { url: string | null; envoi: boolean }>>({});

  useEffect(() => {
    if (!code) return;
    client.get(`/services/${code}`).then((res) => setService(res.data));
  }, [code]);

  async function uploaderPiece(index: number, fichier: File) {
    setPieces((p) => ({ ...p, [index]: { url: null, envoi: true } }));
    try {
      const data = new FormData();
      data.append('fichier', fichier);
      const res = await client.post('/demandes/pieces', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPieces((p) => ({ ...p, [index]: { url: res.data.url, envoi: false } }));
    } catch {
      setPieces((p) => ({ ...p, [index]: { url: null, envoi: false } }));
      setErreur("Échec de l'envoi d'une pièce jointe. Réessayez.");
    }
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');

    const piecesObligatoiresManquantes = (service?.piecesAFournir || [])
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.obligatoire !== false && !pieces[i]?.url);
    if (piecesObligatoiresManquantes.length > 0) {
      setErreur('Veuillez joindre toutes les pièces obligatoires avant de continuer.');
      return;
    }

    setEnvoi(true);
    try {
      const piecesJointes = Object.values(pieces)
        .map((p) => p.url)
        .filter((url): url is string => !!url);

      const resDemande = await client.post('/demandes', {
        serviceCode: code,
        citoyen: {
          nom: form.nom,
          prenom: form.prenom,
          nip: form.nip,
          telephone: form.telephone,
          email: form.email,
        },
        piecesJointes,
      });

      const demandeId = resDemande.data.demandeId;

      try {
        const resPaiement = await client.post(`/paiement/initier/${demandeId}`);
        window.location.href = resPaiement.data.paymentUrl;
      } catch (errPaiement: any) {
        navigate(`/suivi/${demandeId}`, {
          state: {
            avertissement:
              errPaiement.response?.data?.message ||
              "Le paiement en ligne n'a pas pu être initié. Contactez la mairie pour régulariser le paiement.",
          },
        });
      }
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  }

  if (!service)
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">Chargement…</div>
      </Layout>
    );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-civil-600 underline">
          ← Retour au catalogue
        </Link>
        <h1 className="text-2xl font-bold text-civil-700 mt-3">{service.nom}</h1>

        {etape === 'fiche' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mt-5 space-y-4">
            <p className="text-gray-700">{service.cibleDescription}</p>

            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Coût</div>
                <div className="font-semibold">{formatCout(service)}</div>
              </div>
              <div>
                <div className="text-gray-500">Délai (SLA)</div>
                <div className="font-semibold">{service.sla.label}</div>
              </div>
              <div>
                <div className="text-gray-500">Formalité</div>
                <div className="font-semibold">{service.formalite}</div>
              </div>
            </div>

            <div>
              <div className="text-gray-500 text-sm mb-2">Pièces à fournir</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {service.piecesAFournir.map((p, i) => (
                  <li key={i}>
                    {p.libelle}{' '}
                    <span className="text-gray-400">
                      ({p.formatsAcceptes.join('/').toUpperCase()}
                      {p.obligatoire === false ? ', facultatif' : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setEtape('formulaire')}
              className="bg-civil-600 hover:bg-civil-700 text-white px-5 py-2.5 rounded-lg font-medium"
            >
              Soumettre une demande
            </button>
          </div>
        )}

        {etape === 'formulaire' && (
          <form onSubmit={soumettre} className="bg-white border border-gray-200 rounded-xl p-6 mt-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nom</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">NIP (Numéro d'Identification Personnelle)</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Vous en aurez besoin, avec votre numéro de dossier, pour suivre votre demande.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Pièces justificatives</div>
              {service.piecesAFournir.map((p, i) => (
                <div key={i} className="border border-dashed rounded-lg p-3">
                  <label className="text-sm block mb-1">
                    {p.libelle} {p.obligatoire === false && <span className="text-gray-400">(facultatif)</span>}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files?.[0] && uploaderPiece(i, e.target.files[0])}
                    className="text-sm"
                  />
                  {pieces[i]?.envoi && <p className="text-xs text-gray-400 mt-1">Envoi en cours…</p>}
                  {pieces[i]?.url && <p className="text-xs text-green-600 mt-1">✓ Pièce jointe reçue</p>}
                </div>
              ))}
            </div>

            <div className="bg-civil-50 text-civil-700 text-sm p-3 rounded-lg">
              Vous serez redirigé vers la page de paiement sécurisée CinetPay pour régler{' '}
              {formatCout(service)}.
            </div>

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEtape('fiche')}
                className="px-5 py-2.5 rounded-lg font-medium border"
              >
                Retour
              </button>
              <button
                disabled={envoi}
                className="bg-civil-600 hover:bg-civil-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                {envoi ? 'Envoi…' : 'Confirmer et payer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Service } from '../types';
import Layout from '../components/Layout';

function formatCout(s: Service) {
  if (s.cout.type === 'fixe') return `${s.cout.montant?.toLocaleString('fr-FR')} ${s.cout.devise}`;
  return `${s.cout.montantMin?.toLocaleString('fr-FR')} à ${s.cout.montantMax?.toLocaleString('fr-FR')} ${s.cout.devise}`;
}

export default function CitizenHome() {
  const [services, setServices] = useState<Service[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    client
      .get('/services')
      .then((res) => setServices(res.data))
      .finally(() => setChargement(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-civil-700">Portail Citoyen — État Civil</h1>
          <p className="text-gray-600 mt-2">
            Consultez le service souhaité, sa pièce à fournir, son coût et son délai avant de soumettre
            votre demande en ligne auprès de la Mairie de Porto-Novo.
          </p>
        </header>

        {chargement && <p>Chargement du catalogue…</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <Link
              key={s._id}
              to={`/service/${s.code}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-civil-600 transition"
            >
              <h2 className="font-semibold text-lg text-civil-700">{s.nom}</h2>
              <p className="text-sm text-gray-600 mt-1">{s.cibleDescription}</p>
              <div className="flex justify-between mt-4 text-sm">
                <span className="font-medium">{formatCout(s)}</span>
                <span className="text-gray-500">Délai : {s.sla.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

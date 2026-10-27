import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCitoyenAuth } from '../context/CitoyenAuthContext';

function IconLogin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { citoyen, seDeconnecter } = useCitoyenAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-civil-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/30">
              PN
            </div>
            <div>
              <div className="font-semibold leading-tight">Mairie de Porto-Novo</div>
              <div className="text-xs text-civil-50/80 leading-tight">
                e-Services de l'État Civil — DSPCP
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {citoyen ? (
              <>
                <Link
                  to="/mon-espace"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-civil-700 shadow-sm transition hover:bg-civil-50"
                >
                  <IconUser className="h-4 w-4" />
                  {citoyen.prenom}
                </Link>
                <button
                  onClick={seDeconnecter}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 bg-civil-600/30 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-civil-600/50"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/connexion"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-civil-700 shadow-sm transition hover:bg-civil-50"
              >
                <IconLogin className="h-4 w-4" />
                Connexion citoyen
              </Link>
            )}
            <Link
              to="/agent/login"
              className="inline-flex items-center gap-2 rounded-full bg-civil-900/30 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/40 transition hover:bg-civil-900/40"
            >
              <IconLogin className="h-4 w-4" />
              Espace agent
            </Link>
          </div>
        </div>
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-green-600" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-red-600" />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-300 text-sm mt-10">
        <div className="max-w-5xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6">
          <div>
            <div className="font-semibold text-white mb-2">Mairie de Porto-Novo</div>
            <p>Direction des Services à la Population et du Cadre de vie (DSPCP)</p>
            <p>Service de l'État Civil</p>
          </div>
          <div>
            <div className="font-semibold text-white mb-2">Contact</div>
            <p>Porto-Novo, Bénin</p>
            <p>etatcivil@porto-novo.bj</p>
          </div>
          <div>
            <div className="font-semibold text-white mb-2">Liens utiles</div>
            <Link to="/" className="block hover:text-white">Catalogue des services</Link>
            <Link to="/suivi" className="block hover:text-white">Suivre une demande</Link>
          </div>
        </div>
        <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-500">
          © {new Date().getFullYear()} Mairie de Porto-Novo — Plateforme e-services de l'État Civil
        </div>
      </footer>
    </div>
  );
}

import { Navigate } from 'react-router-dom';
import { useCitoyenAuth } from '../context/CitoyenAuthContext';

export default function RouteProtegeeCitoyen({ children }: { children: JSX.Element }) {
  const { citoyen } = useCitoyenAuth();
  if (!citoyen) return <Navigate to="/connexion" replace />;
  return children;
}

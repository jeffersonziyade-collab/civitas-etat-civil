import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RouteProtegee({ children }: { children: JSX.Element }) {
  const { agent } = useAuth();
  if (!agent) return <Navigate to="/agent/login" replace />;
  return children;
}

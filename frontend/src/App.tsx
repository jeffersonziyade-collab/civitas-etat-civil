import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CitoyenAuthProvider } from './context/CitoyenAuthContext';
import RouteProtegee from './components/RouteProtegee';
import RouteProtegeeCitoyen from './components/RouteProtegeeCitoyen';

import CitizenHome from './pages/CitizenHome';
import ServiceDetail from './pages/ServiceDetail';
import TrackRequest from './pages/TrackRequest';
import CitizenLogin from './pages/CitizenLogin';
import CitizenAccount from './pages/CitizenAccount';
import CitizenForgotPassword from './pages/CitizenForgotPassword';
import CitizenResetPassword from './pages/CitizenResetPassword';
import AgentLogin from './pages/AgentLogin';
import AgentForgotPassword from './pages/AgentForgotPassword';
import AgentResetPassword from './pages/AgentResetPassword';
import AgentDashboard from './pages/AgentDashboard';
import AdminServices from './pages/AdminServices';
import AdminAgents from './pages/AdminAgents';

export default function App() {
  return (
    <AuthProvider>
      <CitoyenAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Front-Office — Portail Citoyen */}
            <Route path="/" element={<CitizenHome />} />
            <Route path="/service/:code" element={<ServiceDetail />} />
            <Route path="/suivi" element={<TrackRequest />} />
            <Route path="/suivi/:demandeId" element={<TrackRequest />} />
            <Route path="/connexion" element={<CitizenLogin />} />
            <Route path="/mot-de-passe-oublie" element={<CitizenForgotPassword />} />
            <Route path="/reinitialiser-mot-de-passe/:jeton" element={<CitizenResetPassword />} />
            <Route
              path="/mon-espace"
              element={
                <RouteProtegeeCitoyen>
                  <CitizenAccount />
                </RouteProtegeeCitoyen>
              }
            />

            {/* Back-Office — Portail Agent */}
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route path="/agent/mot-de-passe-oublie" element={<AgentForgotPassword />} />
            <Route path="/agent/reinitialiser-mot-de-passe/:jeton" element={<AgentResetPassword />} />
            <Route
              path="/agent/dashboard"
              element={
                <RouteProtegee>
                  <AgentDashboard />
                </RouteProtegee>
              }
            />
            <Route
              path="/agent/admin/services"
              element={
                <RouteProtegee>
                  <AdminServices />
                </RouteProtegee>
              }
            />
            <Route
              path="/agent/admin/agents"
              element={
                <RouteProtegee>
                  <AdminAgents />
                </RouteProtegee>
              }
            />
          </Routes>
        </BrowserRouter>
      </CitoyenAuthProvider>
    </AuthProvider>
  );
}

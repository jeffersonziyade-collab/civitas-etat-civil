require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const servicesRoutes = require('./routes/services');
const demandesRoutes = require('./routes/demandes');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const paiementRoutes = require('./routes/paiement');
const adminRoutes = require('./routes/admin');
const citoyenAuthRoutes = require('./routes/citoyenAuth');

const app = express();

connectDB();

// --- Sécurité & utilitaires (cf. préférences de stack : Helmet, rate limit, JWT, CORS) ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // CinetPay envoie son webhook en x-www-form-urlencoded
app.use(morgan('dev'));
app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: 'Trop de requêtes, réessayez plus tard.' })
);

app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')));

// --- Routes ---
app.use('/api/services', servicesRoutes);       // Front-Office : catalogue & fiche synthétique
app.use('/api/demandes', demandesRoutes);        // Front-Office : soumission & suivi
app.use('/api/auth', authRoutes);                // Authentification agents
app.use('/api/agent', agentRoutes);              // Back-Office : tableau de bord & traitement
app.use('/api/paiement', paiementRoutes);        // Intégration CinetPay
app.use('/api/admin', adminRoutes);              // Administration du catalogue & des agents
app.use('/api/citoyen', citoyenAuthRoutes);       // Front-Office : compte citoyen (inscription/connexion/mes demandes)

app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    service: `${process.env.MAIRIE_NOM || 'Mairie de Porto-Novo'} — État Civil API`,
  })
);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[SERVEUR] API État Civil démarrée sur le port ${PORT}`);
});

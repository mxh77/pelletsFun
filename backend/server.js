const express = require('express');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');
const PORTS = require('./config/ports');

//Configuration des variables d'environnement avec priorité .env.local (dev) > .env (template)
require('dotenv').config({path: './.env.local'}); // Dev local (ignoré par git)
// Configuration des variables d'environnement
require('dotenv').config();       // Template (commité)
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: PORTS.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Routes
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/recharges', require('./routes/recharges'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/boiler', require('./routes/boiler'));
app.use('/api/gmail', require('./routes/gmail'));

// Initialiser l'AutoImportService au démarrage
const autoImportService = require('./services/autoImportService');

app.listen(PORTS.BACKEND, async () => {
  console.log(`🚀 Backend Express server running on ${PORTS.BACKEND_URL}`);
  console.log(`🔗 Frontend should be available at ${PORTS.FRONTEND_URL}`);
  
  // Initialiser l'AutoImportService (chargement config + redémarrage auto cron)
  try {
    await autoImportService.initialize();
  } catch (error) {
    console.error('❌ Erreur initialisation AutoImportService:', error);
  }
});// Debug update

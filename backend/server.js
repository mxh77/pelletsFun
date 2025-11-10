const express = require('express');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');
const PORTS = require('./config/ports');

//Le fichier .env est placé dans le dossier backend et contient la variable d'environnement MONGODB_URI.
require ('dotenv').config({path: './.env'});
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

app.listen(PORTS.BACKEND, () => {
  console.log(`🚀 Backend Express server running on ${PORTS.BACKEND_URL}`);
  console.log(`🔗 Frontend should be available at ${PORTS.FRONTEND_URL}`);
});
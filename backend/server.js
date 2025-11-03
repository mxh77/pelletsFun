const express = require('express');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');

//Le fichier .env est placé dans le dossier backend et contient la variable d'environnement MONGODB_URI.
require ('dotenv').config({path: './.env'});
const app = express();

// Connect to database
connectDB();

// Configuration CORS selon l'environnement
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const allowedOrigins = isProduction 
  ? ['https://mxh77.github.io', 'https://pelletsfun.harmonixe.fr']
  : ['http://localhost:8080', 'https://mxh77.github.io', 'https://pelletsfun.harmonixe.fr'];

console.log(`🌐 Environnement: ${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}`);
console.log(`🔐 Origins autorisés: ${allowedOrigins.join(', ')}`);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Routes
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/recharges', require('./routes/recharges'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/boiler', require('./routes/boiler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
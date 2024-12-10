const express = require('express');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');

//Le fichier .env est placé dans le dossier backend et contient la variable d'environnement MONGODB_URI.
require ('dotenv').config({path: './backend/.env'});
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: 'https://mxh77.github.io', // Remplacez par l'URL de votre site de production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Routes
app.use('/pelletsfun/deliveries', require('./routes/deliveries'));
app.use('/pelletsfun/recharges', require('./routes/recharges'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
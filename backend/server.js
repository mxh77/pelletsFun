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
  origin: ['https://mxh77.github.io', 'https://pelletsfun.harmonixe.fr'],
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
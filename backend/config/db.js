const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Toujours utiliser la même base MongoDB (production)
    const mongoUri = process.env.MONGODB_URI;
    
    console.log(`🔌 Connexion MongoDB: ${process.env.NODE_ENV === 'development' ? 'DEV' : 'PROD'} -> CLOUD`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
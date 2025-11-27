const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function migrate() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Utiliser directement la collection pour voir tous les champs
    const db = mongoose.connection.db;
    const collection = db.collection('gmailconfig');
    
    const config = await collection.findOne({ _id: 'gmail-config' });
    console.log('📧 Config brute:', JSON.stringify(config, null, 2));
    
    // Migrer sender -> senders si nécessaire
    if (config && config.sender && (!config.senders || config.senders.length === 0)) {
      const result = await collection.updateOne(
        { _id: 'gmail-config' },
        { 
          $set: { senders: [config.sender] },
          $unset: { sender: '' }
        }
      );
      console.log('✅ Migration effectuée:', result);
    } else {
      console.log('⚠️ Aucune migration nécessaire ou sender vide');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

migrate();

// Test de la persistance de la taille des fichiers
// Script pour vérifier que les nouvelles données incluent bien la taille

const mongoose = require('mongoose');
const BoilerData = require('./backend/models/BoilerData');

async function testFileSizePersistence() {
  try {
    // Se connecter à MongoDB (utilise la même config que l'app)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletsfun');
    
    console.log('🔗 Connecté à MongoDB');
    
    // Vérifier les dernières entrées avec taille de fichier
    const recentEntries = await BoilerData.find({
      fileSize: { $exists: true, $ne: null }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('filename fileSize createdAt');
    
    console.log('\n📊 Dernières entrées avec taille de fichier:');
    recentEntries.forEach(entry => {
      const sizeKB = Math.round(entry.fileSize / 1024);
      const sizeMB = (sizeKB / 1024).toFixed(1);
      const formattedSize = sizeKB < 1024 ? `${sizeKB} KB` : `${sizeMB} MB`;
      
      console.log(`  📁 ${entry.filename}: ${formattedSize} (créé le ${entry.createdAt.toLocaleString()})`);
    });
    
    // Compter les entrées avec et sans taille
    const withSize = await BoilerData.countDocuments({ fileSize: { $exists: true, $ne: null } });
    const withoutSize = await BoilerData.countDocuments({ fileSize: { $exists: false } });
    const totalEntries = await BoilerData.countDocuments();
    
    console.log('\n📈 Statistiques:');
    console.log(`  ✅ Entrées avec taille: ${withSize}`);
    console.log(`  ⚠️ Entrées sans taille: ${withoutSize}`);
    console.log(`  📊 Total entrées: ${totalEntries}`);
    console.log(`  📊 Pourcentage avec taille: ${((withSize / totalEntries) * 100).toFixed(1)}%`);
    
    // Vérifier les fichiers uniques
    const uniqueFiles = await BoilerData.aggregate([
      {
        $group: {
          _id: "$filename",
          hasSize: { $first: { $cond: [{ $ne: ["$fileSize", null] }, true, false] } },
          avgSize: { $avg: "$fileSize" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('\n📁 Fichiers récents:');
    uniqueFiles.forEach(file => {
      const sizeInfo = file.hasSize 
        ? `${Math.round(file.avgSize / 1024)} KB` 
        : 'pas de taille';
      console.log(`  📄 ${file._id}: ${file.count} entrées, ${sizeInfo}`);
    });
    
    console.log('\n✅ Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le test si ce script est appelé directement
if (require.main === module) {
  testFileSizePersistence();
}

module.exports = { testFileSizePersistence };
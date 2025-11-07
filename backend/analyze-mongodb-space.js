const mongoose = require('mongoose');
require('dotenv').config();

const BoilerData = require('./models/BoilerData');
const Delivery = require('./models/Delivery');
const Recharge = require('./models/Recharge');
const Season = require('./models/Season');
const GmailConfig = require('./models/GmailConfig');

async function analyzeDatabase() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté avec succès\n');

    // Obtenir les statistiques de la base de données
    const db = mongoose.connection.db;
    const dbStats = await db.stats();
    
    console.log('📊 STATISTIQUES GÉNÉRALES DE LA BASE');
    console.log('=====================================');
    console.log(`Nom de la base: ${db.databaseName}`);
    console.log(`Taille totale: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Taille des index: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Espace libre: ${dbStats.fsTotalSize && dbStats.fsUsedSize ? 
      (dbStats.fsTotalSize - dbStats.fsUsedSize) / 1024 / 1024 / 1024 >= 1 ? 
      ((dbStats.fsTotalSize - dbStats.fsUsedSize) / 1024 / 1024 / 1024).toFixed(2) + ' GB' :
      ((dbStats.fsTotalSize - dbStats.fsUsedSize) / 1024 / 1024).toFixed(2) + ' MB' : 'Non disponible'}`);
    console.log(`Nombre de collections: ${dbStats.collections}`);
    console.log(`Nombre d'objets total: ${dbStats.objects}\n`);

    // Analyser chaque collection
    const collections = [
      { name: 'BoilerData', model: BoilerData, description: 'Données de chaudière (CSV)' },
      { name: 'Deliveries', model: Delivery, description: 'Livraisons de pellets' },
      { name: 'Recharges', model: Recharge, description: 'Recharges de pellets' },
      { name: 'Seasons', model: Season, description: 'Saisons de chauffage' },
      { name: 'GmailConfig', model: GmailConfig, description: 'Configuration Gmail' }
    ];

    console.log('📈 ANALYSE DES COLLECTIONS');
    console.log('===========================');

    for (const collection of collections) {
      try {
        const count = await collection.model.countDocuments();
        
        if (count === 0) {
          console.log(`\n🗂️  ${collection.name} (${collection.description})`);
          console.log(`   Collection vide`);
          continue;
        }

        const stats = await db.command({ collStats: collection.model.collection.name });
        
        console.log(`\n🗂️  ${collection.name} (${collection.description})`);
        console.log(`   Nombre de documents: ${count.toLocaleString()}`);
        console.log(`   Taille des données: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Taille des index: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Taille moyenne par doc: ${count > 0 ? (stats.avgObjSize / 1024).toFixed(2) + ' KB' : '0 KB'}`);
        
        // Pour BoilerData, analyser plus en détail
        if (collection.name === 'BoilerData' && count > 0) {
          console.log(`   📅 Période des données:`);
          
          const oldestData = await collection.model.findOne().sort({ date: 1 });
          const newestData = await collection.model.findOne().sort({ date: -1 });
          
          if (oldestData && newestData) {
            console.log(`      Plus ancien: ${oldestData.date.toLocaleDateString()}`);
            console.log(`      Plus récent: ${newestData.date.toLocaleDateString()}`);
            
            const daysDiff = Math.ceil((newestData.date - oldestData.date) / (1000 * 60 * 60 * 24));
            console.log(`      Période totale: ${daysDiff} jours`);
            console.log(`      Moyenne par jour: ${(count / daysDiff).toFixed(0)} entrées`);
          }
          
          // Analyser par fichier
          console.log(`   📁 Répartition par fichier:`);
          const fileStats = await collection.model.aggregate([
            {
              $group: {
                _id: '$filename',
                count: { $sum: 1 },
                minDate: { $min: '$date' },
                maxDate: { $max: '$date' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]);
          
          fileStats.forEach(file => {
            console.log(`      ${file._id}: ${file.count.toLocaleString()} entrées (${file.minDate.toLocaleDateString()} - ${file.maxDate.toLocaleDateString()})`);
          });
          
          if (fileStats.length === 10) {
            const totalFiles = await collection.model.distinct('filename');
            console.log(`      ... et ${totalFiles.length - 10} autres fichiers`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Erreur pour ${collection.name}: ${error.message}`);
      }
    }

    // Suggestions d'optimisation
    console.log('\n🔧 SUGGESTIONS D\'OPTIMISATION');
    console.log('===============================');

    const boilerCount = await BoilerData.countDocuments();
    
    if (boilerCount > 0) {
      const boilerStats = await db.command({ collStats: 'boilerdatas' });
      
      if (boilerCount > 100000) {
        console.log('⚠️  Grand volume de données BoilerData détecté!');
        console.log('   Suggestions:');
        console.log('   1. Nettoyer les anciennes données (> 1 an)');
        console.log('   2. Archiver les données historiques');
        console.log('   3. Implémenter une politique de rétention automatique');
      }

      if (boilerStats.size > 100 * 1024 * 1024) { // > 100MB
        console.log('⚠️  Collection BoilerData très volumineuse!');
        console.log('   Suggestions:');
        console.log('   1. Vérifier les doublons par filename');
        console.log('   2. Compresser la base avec db.runCommand({compact: "boilerdatas"})');
        console.log('   3. Revoir la stratégie d\'import (éviter les doublons)');
      }

      // Analyser les doublons potentiels
      console.log('\n🔍 ANALYSE DES DOUBLONS');
      console.log('=======================');
      
      const duplicateFiles = await BoilerData.aggregate([
        {
          $group: {
            _id: '$filename',
            count: { $sum: 1 },
            importDates: { $addToSet: '$importDate' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      if (duplicateFiles.length > 0) {
        console.log(`❌ ${duplicateFiles.length} fichiers avec des entrées multiples détectés:`);
        duplicateFiles.slice(0, 5).forEach(file => {
          console.log(`   ${file._id}: ${file.count} entrées (importé ${file.importDates.length} fois)`);
        });
        
        const totalDuplicates = duplicateFiles.reduce((sum, file) => sum + (file.count - 1), 0);
        console.log(`   Total d'entrées en doublon: ${totalDuplicates.toLocaleString()}`);
        
        if (boilerStats.avgObjSize) {
          console.log(`   Espace économisable: ~${((totalDuplicates * boilerStats.avgObjSize) / 1024 / 1024).toFixed(2)} MB`);
        }
      } else {
        console.log('✅ Aucun doublon détecté');
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

analyzeDatabase();
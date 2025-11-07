const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const BoilerData = require('./backend/models/BoilerData');

async function cleanupDatabase() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté avec succès\n');

    console.log('🧹 NETTOYAGE DE LA BASE DE DONNÉES');
    console.log('===================================');

    // Statistiques initiales
    const initialCount = await BoilerData.countDocuments();
    const db = mongoose.connection.db;
    const initialStats = await db.collection('boilerdatas').stats();
    
    console.log(`📊 AVANT NETTOYAGE:`);
    console.log(`   Nombre d'entrées: ${initialCount.toLocaleString()}`);
    console.log(`   Taille des données: ${(initialStats.size / 1024 / 1024).toFixed(2)} MB\n`);

    // 1. Supprimer les doublons
    console.log('🔍 Recherche des doublons...');
    
    const duplicateFiles = await BoilerData.aggregate([
      {
        $group: {
          _id: '$filename',
          docs: { $push: { id: '$_id', importDate: '$importDate' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicateFiles.length > 0) {
      console.log(`❌ ${duplicateFiles.length} fichiers avec doublons trouvés`);
      
      let totalDeleted = 0;
      for (const file of duplicateFiles) {
        // Garder seulement l'import le plus récent
        const sortedDocs = file.docs.sort((a, b) => new Date(b.importDate) - new Date(a.importDate));
        const toDelete = sortedDocs.slice(1).map(doc => doc.id);
        
        console.log(`   Suppression de ${toDelete.length} doublons pour ${file._id}`);
        await BoilerData.deleteMany({ _id: { $in: toDelete } });
        totalDeleted += toDelete.length;
      }
      
      console.log(`✅ ${totalDeleted} doublons supprimés\n`);
    } else {
      console.log('✅ Aucun doublon trouvé\n');
    }

    // 2. Analyser les anciennes données
    console.log('📅 Analyse des anciennes données...');
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldDataCount = await BoilerData.countDocuments({
      date: { $lt: oneYearAgo }
    });

    const veryOldDataCount = await BoilerData.countDocuments({
      date: { $lt: sixMonthsAgo }
    });

    console.log(`📊 Données anciennes:`);
    console.log(`   Plus de 6 mois: ${veryOldDataCount.toLocaleString()} entrées`);
    console.log(`   Plus d'un an: ${oldDataCount.toLocaleString()} entrées`);

    if (oldDataCount > 0) {
      console.log(`\n⚠️  ATTENTION: ${oldDataCount} entrées de plus d'un an trouvées`);
      console.log('💡 Pour les supprimer, décommentez les lignes dans le script et relancez:');
      console.log('   // await BoilerData.deleteMany({ date: { $lt: oneYearAgo } });');
      console.log('   // console.log(`✅ ${oldDataCount} anciennes entrées supprimées`);');
    } else {
      console.log('✅ Aucune donnée ancienne trouvée');
    }

    // 3. Option de suppression des très anciennes données (décommentez si nécessaire)
    /*
    if (oldDataCount > 0) {
      console.log(`🗑️  Suppression des données de plus d'un an...`);
      const deleteResult = await BoilerData.deleteMany({ date: { $lt: oneYearAgo } });
      console.log(`✅ ${deleteResult.deletedCount} anciennes entrées supprimées`);
    }
    */

    // 4. Statistiques après nettoyage
    console.log('\n📊 STATISTIQUES APRÈS NETTOYAGE');
    console.log('================================');
    
    const finalCount = await BoilerData.countDocuments();
    const finalStats = await db.collection('boilerdatas').stats();
    
    console.log(`Nombre total d'entrées: ${finalCount.toLocaleString()}`);
    console.log(`Taille des données: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Taille moyenne par document: ${(finalStats.avgObjSize / 1024).toFixed(2)} KB`);
    
    const spaceSaved = initialStats.size - finalStats.size;
    if (spaceSaved > 0) {
      console.log(`💾 Espace libéré: ${(spaceSaved / 1024 / 1024).toFixed(2)} MB`);
    }

    // 5. Compactage de la collection (optionnel)
    console.log('\n🗜️  COMPACTAGE DE LA COLLECTION');
    console.log('===============================');
    console.log('⚠️  Le compactage peut prendre du temps et verrouille la collection...');
    console.log('💡 Pour compacter, décommentez les lignes suivantes et relancez:');
    console.log('   // console.log("🔄 Compactage en cours...");');
    console.log('   // await db.runCommand({ compact: "boilerdatas" });');
    console.log('   // console.log("✅ Collection compactée");');

    /*
    // Décommentez pour compacter
    console.log('🔄 Compactage en cours...');
    await db.runCommand({ compact: 'boilerdatas' });
    console.log('✅ Collection compactée');
    */

    // 6. Recommandations finales
    console.log('\n💡 RECOMMANDATIONS');
    console.log('==================');
    console.log('1. 🔄 Modifier autoImportService.js pour éviter les doublons');
    console.log('2. ⏰ Implémenter une tâche cron pour nettoyer automatiquement');
    console.log('3. 📊 Surveiller régulièrement la taille de la base');
    console.log('4. 🗜️  Compacter la collection après de gros nettoyages');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

// Fonction pour nettoyer seulement les doublons (plus sûr)
async function cleanDuplicatesOnly() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté avec succès\n');

    console.log('🧹 SUPPRESSION DES DOUBLONS UNIQUEMENT');
    console.log('======================================');

    const duplicateFiles = await BoilerData.aggregate([
      {
        $group: {
          _id: '$filename',
          docs: { $push: { id: '$_id', importDate: '$importDate' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicateFiles.length > 0) {
      console.log(`❌ ${duplicateFiles.length} fichiers avec doublons trouvés`);
      
      let totalDeleted = 0;
      for (const file of duplicateFiles) {
        const sortedDocs = file.docs.sort((a, b) => new Date(b.importDate) - new Date(a.importDate));
        const toDelete = sortedDocs.slice(1).map(doc => doc.id);
        
        console.log(`   Suppression de ${toDelete.length} doublons pour ${file._id}`);
        await BoilerData.deleteMany({ _id: { $in: toDelete } });
        totalDeleted += toDelete.length;
      }
      
      console.log(`✅ ${totalDeleted} doublons supprimés au total`);
    } else {
      console.log('✅ Aucun doublon trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exporter les fonctions
module.exports = {
  cleanupDatabase,
  cleanDuplicatesOnly
};

// Exécuter la fonction principale si le script est lancé directement
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--duplicates-only')) {
    cleanDuplicatesOnly();
  } else {
    cleanupDatabase();
  }
}
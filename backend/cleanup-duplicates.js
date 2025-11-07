const mongoose = require('mongoose');
require('dotenv').config();

const BoilerData = require('./models/BoilerData');

async function cleanDuplicatesOnly() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté avec succès\n');

    console.log('🧹 SUPPRESSION DES DOUBLONS UNIQUEMENT');
    console.log('======================================');

    const initialCount = await BoilerData.countDocuments();
    console.log(`📊 Entrées initiales: ${initialCount.toLocaleString()}\n`);

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
      let processedFiles = 0;
      
      for (const file of duplicateFiles) {
        processedFiles++;
        // Garder seulement l'import le plus récent
        const sortedDocs = file.docs.sort((a, b) => new Date(b.importDate) - new Date(a.importDate));
        const toDelete = sortedDocs.slice(1).map(doc => doc.id);
        
        console.log(`[${processedFiles}/${duplicateFiles.length}] Suppression de ${toDelete.length} doublons pour ${file._id}`);
        
        const deleteResult = await BoilerData.deleteMany({ _id: { $in: toDelete } });
        totalDeleted += deleteResult.deletedCount;
        
        // Afficher le progrès tous les 10 fichiers
        if (processedFiles % 10 === 0) {
          console.log(`   📊 Progrès: ${processedFiles}/${duplicateFiles.length} fichiers traités, ${totalDeleted.toLocaleString()} entrées supprimées`);
        }
      }
      
      console.log(`\n✅ ${totalDeleted.toLocaleString()} doublons supprimés au total`);
      
      const finalCount = await BoilerData.countDocuments();
      const spaceSaved = initialCount - finalCount;
      
      console.log(`📊 RÉSULTAT:`);
      console.log(`   Avant: ${initialCount.toLocaleString()} entrées`);
      console.log(`   Après: ${finalCount.toLocaleString()} entrées`);
      console.log(`   Supprimées: ${spaceSaved.toLocaleString()} entrées`);
      console.log(`   Réduction: ${((spaceSaved / initialCount) * 100).toFixed(1)}%`);
      
      // Estimation de l'espace libéré
      const estimatedSpaceSaved = (spaceSaved / initialCount) * 281.28; // 281.28 MB était la taille initiale
      console.log(`   💾 Espace estimé libéré: ~${estimatedSpaceSaved.toFixed(2)} MB`);
      
    } else {
      console.log('✅ Aucun doublon trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

cleanDuplicatesOnly();
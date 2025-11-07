const mongoose = require('mongoose');
require('dotenv').config();

const BoilerData = require('./models/BoilerData');

async function analyzeSpecificFile() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté avec succès\n');

    // Analyser un fichier spécifique pour comprendre le problème
    const filename = 'touch_20251026.csv';
    
    console.log(`🔍 ANALYSE DÉTAILLÉE DU FICHIER: ${filename}`);
    console.log('=============================================');

    // Compter le nombre total d'entrées pour ce fichier
    const totalEntries = await BoilerData.countDocuments({ filename });
    console.log(`📊 Nombre total d'entrées en base: ${totalEntries.toLocaleString()}`);

    // Analyser les dates d'import
    const importAnalysis = await BoilerData.aggregate([
      { $match: { filename } },
      {
        $group: {
          _id: { 
            importDate: { $dateToString: { format: '%Y-%m-%d %H:%M:%S', date: '$importDate' } }
          },
          count: { $sum: 1 },
          minDataDate: { $min: '$date' },
          maxDataDate: { $max: '$date' }
        }
      },
      { $sort: { '_id.importDate': -1 } },
      { $limit: 10 }
    ]);

    console.log(`\n📅 TOP 10 des imports de ce fichier:`);
    importAnalysis.forEach((imp, index) => {
      console.log(`${index + 1}. Import le ${imp._id.importDate}: ${imp.count} entrées`);
      console.log(`   Données du ${imp.minDataDate.toLocaleDateString()} au ${imp.maxDataDate.toLocaleDateString()}`);
    });

    // Vérifier s'il y a vraiment des doublons (même date + heure)
    console.log(`\n🔍 ANALYSE DES VRAIES DONNÉES:`);
    
    const duplicateDataCheck = await BoilerData.aggregate([
      { $match: { filename } },
      {
        $group: {
          _id: { 
            date: '$date',
            time: '$time'
          },
          count: { $sum: 1 },
          importDates: { $addToSet: '$importDate' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    if (duplicateDataCheck.length > 0) {
      console.log(`❌ ${duplicateDataCheck.length} moments avec des doublons détectés:`);
      duplicateDataCheck.forEach(dup => {
        console.log(`   ${dup._id.date.toLocaleDateString()} ${dup._id.time}: ${dup.count} fois`);
        console.log(`   Importé à: ${dup.importDates.map(d => d.toLocaleString()).join(', ')}`);
      });
    } else {
      console.log(`✅ Aucun doublon de données réelles détecté`);
      console.log(`   Le problème est bien la réimportation du même fichier`);
    }

    // Voir quelques exemples de données
    console.log(`\n📋 EXEMPLES DE DONNÉES (premières entrées):`);
    const sampleData = await BoilerData.find({ filename })
      .sort({ date: 1, time: 1 })
      .limit(5);
    
    sampleData.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.date.toLocaleDateString()} ${entry.time} - Temp: ${entry.outsideTemp}°C - Import: ${entry.importDate ? entry.importDate.toLocaleString() : 'Non défini'}`);
    });

    // Comparer avec un autre fichier
    console.log(`\n🔄 COMPARAISON AVEC D'AUTRES FICHIERS:`);
    
    const fileComparison = await BoilerData.aggregate([
      {
        $group: {
          _id: '$filename',
          count: { $sum: 1 },
          uniqueImports: { $addToSet: '$importDate' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    fileComparison.forEach((file, index) => {
      const importsCount = file.uniqueImports.filter(d => d).length;
      const avgPerImport = importsCount > 0 ? Math.round(file.count / importsCount) : 0;
      console.log(`${index + 1}. ${file._id}: ${file.count} entrées, ${importsCount} imports, ~${avgPerImport} entrées/import`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

analyzeSpecificFile();
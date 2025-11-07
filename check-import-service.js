const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const BoilerData = require('./backend/models/BoilerData');

async function checkImportService() {
  try {
    console.log('🔍 DIAGNOSTIC DU SERVICE D\'IMPORT');
    console.log('==================================\n');

    // 1. Vérifier les fichiers CSV dans auto-downloads
    const autoDownloadsPath = path.join(__dirname, 'backend', 'auto-downloads');
    
    console.log('📁 ANALYSE DES FICHIERS CSV');
    console.log('----------------------------');
    
    if (fs.existsSync(autoDownloadsPath)) {
      const csvFiles = fs.readdirSync(autoDownloadsPath)
        .filter(file => file.endsWith('.csv'))
        .map(file => {
          const filePath = path.join(autoDownloadsPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            sizeKB: (stats.size / 1024).toFixed(2)
          };
        })
        .sort((a, b) => b.modified - a.modified);

      console.log(`📊 ${csvFiles.length} fichiers CSV trouvés:`);
      csvFiles.forEach(file => {
        console.log(`   ${file.name} - ${file.sizeKB} KB - ${file.modified.toLocaleDateString()}`);
      });

      const totalSizeKB = csvFiles.reduce((sum, file) => sum + file.size, 0) / 1024;
      console.log(`   📦 Taille totale: ${totalSizeKB.toFixed(2)} KB\n`);
    } else {
      console.log('❌ Dossier auto-downloads non trouvé\n');
    }

    // 2. Analyser le service d'import
    const autoImportServicePath = path.join(__dirname, 'backend', 'services', 'autoImportService.js');
    
    console.log('⚙️  ANALYSE DU SERVICE D\'IMPORT');
    console.log('-------------------------------');
    
    if (fs.existsSync(autoImportServicePath)) {
      const serviceContent = fs.readFileSync(autoImportServicePath, 'utf8');
      
      // Chercher des patterns problématiques
      const issues = [];
      
      if (!serviceContent.includes('findOne') && !serviceContent.includes('exists')) {
        issues.push('⚠️  Pas de vérification de doublons détectée');
      }
      
      if (serviceContent.includes('insertMany') || serviceContent.includes('create')) {
        issues.push('ℹ️  Utilise des insertions en lot (risque de doublons)');
      }
      
      if (!serviceContent.includes('filename')) {
        issues.push('⚠️  Pas de tracking des noms de fichiers détecté');
      }
      
      if (serviceContent.includes('setInterval') || serviceContent.includes('cron')) {
        issues.push('ℹ️  Service automatique détecté');
      }

      if (issues.length > 0) {
        console.log('🚨 Problèmes potentiels détectés:');
        issues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log('✅ Service semble correct');
      }
    } else {
      console.log('❌ Service autoImportService.js non trouvé');
    }

    // 3. Analyser la base de données
    console.log('\n📊 ANALYSE DE LA BASE DE DONNÉES');
    console.log('---------------------------------');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const totalEntries = await BoilerData.countDocuments();
    console.log(`Total d'entrées BoilerData: ${totalEntries.toLocaleString()}`);
    
    if (totalEntries > 0) {
      // Analyser les imports récents
      const recentImports = await BoilerData.aggregate([
        {
          $group: {
            _id: {
              filename: '$filename',
              importDate: { $dateToString: { format: '%Y-%m-%d', date: '$importDate' } }
            },
            count: { $sum: 1 },
            firstEntry: { $min: '$importDate' },
            lastEntry: { $max: '$importDate' }
          }
        },
        { $sort: { firstEntry: -1 } },
        { $limit: 10 }
      ]);

      console.log('\n📅 10 derniers imports:');
      recentImports.forEach(imp => {
        console.log(`   ${imp._id.filename} (${imp._id.importDate}): ${imp.count} entrées`);
      });

      // Détection des doublons
      const duplicates = await BoilerData.aggregate([
        {
          $group: {
            _id: '$filename',
            count: { $sum: 1 },
            imports: { $addToSet: { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$importDate' } } }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      if (duplicates.length > 0) {
        console.log('\n🔴 TOP 5 des fichiers avec doublons:');
        duplicates.forEach(dup => {
          console.log(`   ${dup._id}: ${dup.count} entrées (importé ${dup.imports.length} fois)`);
          dup.imports.slice(0, 3).forEach(imp => console.log(`      - ${imp}`));
          if (dup.imports.length > 3) {
            console.log(`      ... et ${dup.imports.length - 3} autres imports`);
          }
        });
      }
    }

    // 4. Recommandations
    console.log('\n💡 RECOMMANDATIONS');
    console.log('------------------');
    console.log('1. 🔍 Lancez d\'abord: node analyze-mongodb-space.js');
    console.log('2. 🧹 Nettoyez les doublons: node cleanup-mongodb.js --duplicates-only');
    console.log('3. ⚙️  Modifiez autoImportService.js pour éviter les doublons futurs');
    console.log('4. 📊 Surveillez régulièrement avec ce script de diagnostic');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    console.log('\n✅ Diagnostic terminé');
  }
}

checkImportService();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const BoilerData = require('../models/BoilerData');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

async function importSingleFile(filename) {
  if (!filename) {
    console.error('❌ Usage: node import-single-file.js filename.csv');
    process.exit(1);
  }

  console.log(`📥 IMPORT FICHIER CSV: ${filename}`);
  console.log('='.repeat(50));

  try {
    // Connexion MongoDB
    console.log('🔌 Connexion MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Chemin du fichier dans auto-downloads
    const filePath = path.join(__dirname, '..', 'auto-downloads', filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Fichier non trouvé: ${filePath}`);
      process.exit(1);
    }

    const stats = fs.statSync(filePath);
    console.log(`📄 Fichier trouvé: ${filename} (${stats.size} bytes)`);

    // Import CSV (même logique que le contrôleur)
    console.log('\n📊 Début de l\'import...');
    
    const results = [];
    let lineCount = 0;
    let importedCount = 0;
    let existingCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'latin1' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineCount++;
          
          try {
            if (lineCount <= 3) {
              console.log(`Debug ligne ${lineCount}:`, Object.keys(data).slice(0, 5), data.Datum);
            }
            
            const [day, month, year] = (data.Datum || data['Datum '])?.split('.') || [];
            if (!day || !month || !year) {
              if (lineCount <= 5) console.log(`❌ Date invalide ligne ${lineCount}:`, data.Datum);
              return;
            }

            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (isNaN(date.getTime())) {
              console.log(`❌ Date NaN ligne ${lineCount}:`, year, month, day);
              return;
            }

            const rowData = {
              date,
              time: (data.Zeit || data['Zeit '])?.trim() || '',
              outsideTemp: parseFloat((data['AT [°C]'] || data['AT [□C]'])?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat((data['ATakt [°C]'] || data['ATakt [□C]'])?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat((data['HK1 VL Ist[°C]'] || data['HK1 VL Ist[□C]'])?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat((data['HK1 VL Soll[°C]'] || data['HK1 VL Soll[□C]'])?.replace(',', '.')) || 0,
              boilerTemp: parseFloat((data['PE1 KT[°C]'] || data['PE1 KT[□C]'])?.replace(',', '.')) || 0,
              boilerTempTarget: parseFloat((data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[□C]'])?.replace(',', '.')) || 0,
              modulation: parseFloat((data['PE1 Modulation[%]'] || data['PE1 Modulation[%] '])?.replace(',', '.')) || 0,
              fanSpeed: parseFloat((data['PE1 Luefterdrehzahl[%]'] || data['PE1 Luefterdrehzahl[%] '])?.replace(',', '.')) || 0,
              runtime: parseInt(data['PE1 Runtime[h]']) || 0,
              status: parseInt(data['PE1 Status']) || 0,
              hotWaterInTemp: parseFloat((data['WW1 EinT Ist[°C]'] || data['WW1 EinT Ist[□C]'])?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat((data['WW1 AusT Ist[°C]'] || data['WW1 AusT Ist[□C]'])?.replace(',', '.')) || 0,
              filename: filename,
              fileSize: stats.size,
              importDate: new Date()
            };

            results.push(rowData);
          } catch (err) {
            console.warn(`⚠️  Ligne ${lineCount} ignorée: ${err.message}`);
          }
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    console.log(`📄 Lignes parsées: ${lineCount}, données valides: ${results.length}`);

    // Insertion en base avec gestion des doublons
    console.log('💾 Insertion en base de données...');
    
    for (const rowData of results) {
      try {
        const existing = await BoilerData.findOne({
          date: rowData.date,
          time: rowData.time,
          filename: filename
        });

        if (existing) {
          existingCount++;
        } else {
          await BoilerData.create(rowData);
          importedCount++;
        }
      } catch (err) {
        console.warn(`⚠️  Erreur insertion: ${err.message}`);
      }
    }

    console.log(`✅ IMPORT TERMINÉ !`);
    console.log(`   📈 Nouvelles entrées: ${importedCount}`);
    console.log(`   📊 Entrées existantes: ${existingCount}`);
    console.log(`   📁 Fichier: ${filename}`);

    await mongoose.disconnect();
    console.log('\n✅ Import terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Point d'entrée
if (require.main === module) {
  const filename = process.argv[2];
  importSingleFile(filename);
}
const BoilerData = require('../models/BoilerData');
const BoilerConfig = require('../models/BoilerConfig');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cron = require('node-cron');
const PORTS = require('../config/ports');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Garder le nom original avec timestamp pour éviter les conflits
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accepter seulement les fichiers CSV
    if (file.mimetype === 'text/csv' || 
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont autorisés'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite à 10MB
  }
});

// Fonction helper pour récupérer la configuration depuis la base de données
async function getBoilerConfigData() {
  try {
    let config = await BoilerConfig.findOne({ configType: 'main' });
    
    // Si pas de configuration en base, créer une configuration par défaut
    if (!config) {
      config = new BoilerConfig({
        nominalPower: 15,
        pelletsPerKWh: 0.2,
        importInterval: 1,
        configType: 'main'
      });
      await config.save();
      console.log('🔧 Configuration par défaut créée en base de données');
    }
    
    return config;
  } catch (error) {
    console.error('Erreur récupération config:', error);
    // Fallback en cas d'erreur
    return {
      nominalPower: 15,
      pelletsPerKWh: 0.2,
      importInterval: 1
    };
  }
}

// Fonction pour filtrer les données selon l'intervalle configuré
function filterDataByInterval(data, intervalMinutes) {
  if (intervalMinutes <= 1) {
    return data; // Pas de filtrage si intervalle = 1 minute
  }

  const filtered = [];
  let lastTime = null;
  
  for (const entry of data) {
    // Créer un timestamp complet avec date + time
    const [hours, minutes] = (entry.time || '00:00').split(':').map(n => parseInt(n) || 0);
    const entryTimestamp = new Date(entry.date);
    entryTimestamp.setHours(hours, minutes, 0, 0);
    
    if (!lastTime) {
      // Première entrée
      filtered.push(entry);
      lastTime = entryTimestamp;
    } else {
      // Vérifier si assez de temps s'est écoulé
      const diffMinutes = (entryTimestamp - lastTime) / (1000 * 60);
      
      if (diffMinutes >= intervalMinutes) {
        filtered.push(entry);
        lastTime = entryTimestamp;
      }
    }
  }
  
  console.log(`📊 Filtrage temporel: ${data.length} → ${filtered.length} entrées (intervalle: ${intervalMinutes}min)`);
  return filtered;
}

// Middleware d'upload
exports.uploadCSV = upload.single('csvFile');

// Importer un fichier CSV uploadé
exports.importUploadedCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const csvPath = req.file.path;
    const originalFilename = req.file.originalname;

    const results = [];
    let lineCount = 0;

    // Lire et parser le CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath, { encoding: 'latin1' }) // Encoding pour caractères spéciaux
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineCount++;
          
          // Convertir les données CSV vers notre format
          try {
            // La colonne s'appelle 'Datum ' avec un espace à la fin
            const datumValue = data['Datum '] || data.Datum;
            const [day, month, year] = datumValue?.split('.') || [];
            
            // Vérifier que les composants de la date existent
            if (!day || !month || !year) {
              return;
            }
            
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) return;

            // Gérer les différents formats de fichiers (ancien/nouveau)
            // Anciens fichiers: caractères □ au lieu de °
            const runtime = parseFloat((data['PE1 Runtime[h]'] || data['PE1 Runtime[h] '])?.replace(',', '.')) || 0;
            const modulation = parseFloat((data['PE1 Modulation[%]'] || data['PE1 Modulation[%] '])?.replace(',', '.')) || 0;
            const boilerTemp = parseFloat((data['PE1 KT[°C]'] || data['PE1 KT[°C] '] || data['PE1 KT[□C]'])?.replace(',', '.')) || 0;

            const boilerEntry = {
              date: date,
              time: (data['Zeit '] || data.Zeit)?.trim() || '',
              outsideTemp: parseFloat((data['AT [°C]'] || data['AT [°C] '] || data['AT [□C]'])?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat((data['ATakt [°C]'] || data['ATakt [°C] '] || data['ATakt [□C]'])?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat((data['HK1 VL Ist[°C]'] || data['HK1 VL Ist[°C] '] || data['HK1 VL Ist[□C]'])?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat((data['HK1 VL Soll[°C]'] || data['HK1 VL Soll[°C] '] || data['HK1 VL Soll[□C]'])?.replace(',', '.')) || 0,
              boilerTemp: boilerTemp,
              boilerTempTarget: parseFloat((data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[°C] '] || data['PE1 KT_SOLL[□C]'])?.replace(',', '.')) || 0,
              modulation: modulation,
              fanSpeed: parseFloat((data['PE1 Luefterdrehzahl[%]'] || data['PE1 Luefterdrehzahl[%] '])?.replace(',', '.')) || 0,
              runtime: runtime,
              status: parseInt(data['PE1 Status'] || data['PE1 Status ']) || 0,
              hotWaterInTemp: parseFloat((data['WW1 EinT Ist[°C]'] || data['WW1 EinT Ist[°C] '] || data['WW1 EinT Ist[□C]'])?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat((data['WW1 AusT Ist[°C]'] || data['WW1 AusT Ist[°C] '] || data['WW1 AusT Ist[□C]'])?.replace(',', '.')) || 0,
              hotWaterTargetTemp: parseFloat((data['WW1 Soll[°C]'] || data['WW1 Soll[°C] '] || data['WW1 Soll[□C]'])?.replace(',', '.')) || 0,
              hotWaterPumpStatus: parseInt(data['WW1 Pumpe'] || data['WW1 Pumpe ']) || 0,
              hotWaterStatus: parseInt(data['WW1 Status'] || data['WW1 Status ']) || 0,
              filename: originalFilename,
              fileSize: req.file.size // Taille du fichier en octets
            };

            // Critère de validation adapté au format de fichier
            // Nouveau format: runtime > 0
            // Ancien format (sans runtime): accepter si les données semblent cohérentes
            // (température chaudière > 0 ET date valide) - la chaudière peut être à l'arrêt (modulation=0) mais avoir une température de base
            // Si runtime n'existe pas (undefined), on valide uniquement sur la température
            if (lineCount <= 5) {
              // Validation des données effectuée
            }
            const isValidEntry = (runtime !== undefined && runtime > 0) || 
                                 (runtime === 0 && boilerTemp > 0 && !isNaN(date.getTime())) ||
                                 (runtime === undefined && boilerTemp > 0 && !isNaN(date.getTime()));
            if (lineCount <= 5) {
              // Validation de la ligne effectuée
            }

            if (isValidEntry) {
              results.push(boilerEntry);
            }
          } catch (error) {
            console.error(`Erreur ligne ${lineCount}:`, error);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Fichier CSV lu: ${lineCount} lignes, ${results.length} entrées valides`);

    // Récupérer la configuration d'intervalle
    const config = await getBoilerConfigData();
    
    // Trier les données par date et heure pour un filtrage temporel correct
    results.sort((a, b) => {
      const timeA = new Date(a.date);
      const [hoursA, minutesA] = (a.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeA.setHours(hoursA, minutesA);
      
      const timeB = new Date(b.date);
      const [hoursB, minutesB] = (b.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeB.setHours(hoursB, minutesB);
      
      return timeA - timeB;
    });
    
    // Appliquer le filtrage temporel selon la configuration
    const filteredResults = filterDataByInterval(results, config.importInterval);
    
    console.log(`📊 Données après filtrage: ${filteredResults.length} entrées (intervalle: ${config.importInterval}min)`);

    // Supprimer les données existantes pour ce fichier
    await BoilerData.deleteMany({ filename: originalFilename });

    // Insérer les nouvelles données filtrées
    if (filteredResults.length > 0) {
      await BoilerData.insertMany(filteredResults);
    }

    // Supprimer le fichier temporaire après import
    fs.unlinkSync(csvPath);

    res.json({
      success: true,
      message: `${filteredResults.length} entrées importées depuis ${originalFilename} (intervalle: ${config.importInterval}min)`,
      linesProcessed: lineCount,
      validEntries: filteredResults.length,
      originalEntries: results.length,
      filteredEntries: results.length - filteredResults.length,
      intervalMinutes: config.importInterval,
      filename: originalFilename
    });

  } catch (error) {
    console.error('Erreur import CSV:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'import du CSV', 
      details: error.message 
    });
  }
};

// Importer un fichier CSV depuis le système de fichiers local
exports.importBoilerCSV = async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier requis' });
    }

    // Chemin du fichier CSV (supposé dans le répertoire racine du projet)
    const csvPath = path.join(process.cwd(), '..', filename);
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Fichier CSV non trouvé' });
    }

    // Obtenir la taille du fichier
    const fileStats = fs.statSync(csvPath);
    const fileSize = fileStats.size;

    const results = [];
    let lineCount = 0;

    // Lire et parser le CSV (même logique que pour les fichiers uploadés)
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath, { encoding: 'latin1' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineCount++;
          
          try {
            const [day, month, year] = data.Datum?.split('.') || [];
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
              console.log(`Ligne ${lineCount}: Date invalide`, data.Datum);
              return;
            }

            // Gérer les différents formats de fichiers (ancien/nouveau)
            // Anciens fichiers: caractères □ au lieu de °
            const runtime = parseFloat(data['PE1 Runtime[h]']?.replace(',', '.')) || 0;
            const modulation = parseFloat((data['PE1 Modulation[%]'] || data['PE1 Modulation[%] '])?.replace(',', '.')) || 0;
            const boilerTemp = parseFloat((data['PE1 KT[°C]'] || data['PE1 KT[□C]'])?.replace(',', '.')) || 0;
            
            // Debug pour les anciens fichiers
            if (lineCount <= 5) {
              console.log(`Ligne ${lineCount} - Runtime: ${runtime}, Modulation: ${modulation}, BoilerTemp: ${boilerTemp}`);
            }
            
            const boilerEntry = {
              date: date,
              time: data.Zeit?.trim() || '',
              outsideTemp: parseFloat((data['AT [°C]'] || data['AT [□C]'])?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat((data['ATakt [°C]'] || data['ATakt [□C]'])?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat((data['HK1 VL Ist[°C]'] || data['HK1 VL Ist[□C]'])?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat((data['HK1 VL Soll[°C]'] || data['HK1 VL Soll[□C]'])?.replace(',', '.')) || 0,
              boilerTemp: boilerTemp,
              boilerTempTarget: parseFloat((data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[□C]'])?.replace(',', '.')) || 0,
              modulation: modulation,
              fanSpeed: parseFloat((data['PE1 Luefterdrehzahl[%]'] || data['PE1 Luefterdrehzahl[%] '])?.replace(',', '.')) || 0,
              runtime: runtime,
              status: parseInt(data['PE1 Status']) || 0,
              hotWaterInTemp: parseFloat((data['WW1 EinT Ist[°C]'] || data['WW1 EinT Ist[□C]'])?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat((data['WW1 AusT Ist[°C]'] || data['WW1 AusT Ist[□C]'])?.replace(',', '.')) || 0,
              hotWaterTargetTemp: parseFloat((data['WW1 Soll[°C]'] || data['WW1 Soll[□C]'])?.replace(',', '.')) || 0,
              hotWaterPumpStatus: parseInt(data['WW1 Pumpe']) || 0,
              hotWaterStatus: parseInt(data['WW1 Status']) || 0,
              filename: filename,
              fileSize: fileSize // Taille du fichier en octets
            };

            // Critère de validation adapté au format de fichier
            // Nouveau format: runtime > 0
            // Ancien format (sans runtime): accepter si les données semblent cohérentes
            // (température chaudière > 0 ET date valide) - la chaudière peut être à l'arrêt (modulation=0) mais avoir une température de base
            // Si runtime n'existe pas (undefined), on valide uniquement sur la température
            if (lineCount <= 5) {
              // Validation des données Gmail effectuée
            }
            const isValidEntry = (runtime !== undefined && runtime > 0) || 
                                 (runtime === 0 && boilerTemp > 0 && !isNaN(date.getTime())) ||
                                 (runtime === undefined && boilerTemp > 0 && !isNaN(date.getTime()));
            if (lineCount <= 5) {
              // Validation Gmail de la ligne effectuée
            }
            
            if (isValidEntry) {
              results.push(boilerEntry);
            }
          } catch (error) {
            console.error(`Erreur ligne ${lineCount}:`, error);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Récupérer la configuration d'intervalle
    const config = await getBoilerConfigData();
    
    // Trier les données par date et heure pour un filtrage temporel correct
    results.sort((a, b) => {
      const timeA = new Date(a.date);
      const [hoursA, minutesA] = (a.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeA.setHours(hoursA, minutesA);
      
      const timeB = new Date(b.date);
      const [hoursB, minutesB] = (b.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeB.setHours(hoursB, minutesB);
      
      return timeA - timeB;
    });
    
    // Appliquer le filtrage temporel selon la configuration
    const filteredResults = filterDataByInterval(results, config.importInterval);

    // Supprimer les données existantes pour ce fichier
    await BoilerData.deleteMany({ filename });

    // Insérer les nouvelles données filtrées
    if (filteredResults.length > 0) {
      await BoilerData.insertMany(filteredResults);
    }

    res.json({
      success: true,
      message: `${filteredResults.length} entrées importées depuis ${filename} (intervalle: ${config.importInterval}min)`,
      linesProcessed: lineCount,
      validEntries: filteredResults.length,
      originalEntries: results.length,
      intervalMinutes: config.importInterval
    });

  } catch (error) {
    console.error('Erreur import CSV:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'import du CSV', 
      details: error.message 
    });
  }
};

// Calculer la consommation entre deux dates
exports.calculateConsumption = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Calcul de la consommation pour la période demandée
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Dates de début et fin requises' 
      });
    }

    // Convertir les dates en objets Date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    console.log('📅 Dates converties:', { 
      startDateObj: startDateObj.toISOString(), 
      endDateObj: endDateObj.toISOString() 
    });

    // Vérifier qu'on a des données dans cette période
    const dataCount = await BoilerData.countDocuments({
      date: { $gte: startDateObj, $lte: endDateObj }
    });
    
    console.log(`📊 Nombre d'entrées trouvées pour la période: ${dataCount}`);

    // Récupérer la configuration depuis la base de données
    const config = await getBoilerConfigData();

    // Récupérer les données de runtime pour la période
    const startData = await BoilerData.findOne({
      date: { $gte: startDateObj }
    }).sort({ date: 1, time: 1 });

    const endData = await BoilerData.findOne({
      date: { $lte: endDateObj }
    }).sort({ date: -1, time: -1 });

    // Données de début et fin récupérées

    if (!startData || !endData) {
      // Cherchons les données disponibles pour diagnostic
      const firstData = await BoilerData.findOne().sort({ date: 1 });
      const lastData = await BoilerData.findOne().sort({ date: -1 });
      
      console.log('📊 Plage de données disponibles:', {
        first: firstData ? firstData.date : 'aucune',
        last: lastData ? lastData.date : 'aucune'
      });
      
      return res.status(404).json({ 
        error: 'Données insuffisantes pour la période',
        debug: {
          requestedPeriod: { startDate, endDate },
          availableData: {
            first: firstData ? firstData.date : null,
            last: lastData ? lastData.date : null,
            totalEntries: dataCount
          }
        }
      });
    }

    // Calculer la différence de runtime
    const runtimeHours = endData.runtime - startData.runtime;
    
    // Calculer la consommation moyenne de modulation sur la période
    const periodData = await BoilerData.aggregate([
      {
        $match: {
          date: { $gte: startDateObj, $lte: endDateObj },
          status: 99, // Chaudière en fonctionnement
          modulation: { $gt: 0 } // Modulation active = combustion réelle
        }
      },
      {
        $group: {
          _id: null,
          avgModulation: { $avg: '$modulation' },
          count: { $sum: 1 },
          avgOutsideTemp: { $avg: '$outsideTemp' },
          avgFanSpeed: { $avg: '$fanSpeed' }
        }
      }
    ]);

    console.log('📊 Données période (status=99, modulation>0):', periodData[0] || 'aucune');

    const avgModulation = periodData[0]?.avgModulation || 60; // Default 60%
    const avgOutsideTemp = periodData[0]?.avgOutsideTemp || 10;

    // Calculer la consommation de pellets
    const effectivePower = config.nominalPower * (avgModulation / 100);
    const pelletConsumption = runtimeHours * effectivePower * config.pelletsPerKWh;

    // Statistiques détaillées
    const stats = await BoilerData.aggregate([
      {
        $match: {
          date: { $gte: startDateObj, $lte: endDateObj }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          minTemp: { $min: '$outsideTemp' },
          maxTemp: { $max: '$outsideTemp' },
          avgTemp: { $avg: '$outsideTemp' },
          avgModulation: { $avg: '$modulation' },
          maxRuntime: { $max: '$runtime' },
          minRuntime: { $min: '$runtime' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`📈 Stats quotidiennes générées: ${stats.length} jours`);

    res.json({
      period: {
        startDate,
        endDate,
        startRuntime: startData.runtime,
        endRuntime: endData.runtime,
        runtimeHours
      },
      consumption: {
        pelletKg: Math.round(pelletConsumption * 100) / 100,
        effectivePowerKW: Math.round(effectivePower * 10) / 10,
        avgModulationPercent: Math.round(avgModulation * 10) / 10
      },
      weather: {
        avgOutsideTempC: Math.round(avgOutsideTemp * 10) / 10
      },
      config: {
        nominalPower: config.nominalPower,
        pelletsPerKWh: config.pelletsPerKWh,
        importInterval: config.importInterval
      },
      dailyStats: stats
    });

  } catch (error) {
    console.error('Erreur calcul consommation:', error);
    res.status(500).json({ 
      error: 'Erreur lors du calcul de consommation',
      details: error.message 
    });
  }
};

// Obtenir les statistiques générales des données chaudière
exports.getBoilerStats = async (req, res) => {
  try {
    // Récupérer la configuration depuis la base de données
    const config = await getBoilerConfigData();

    const stats = await BoilerData.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          minRuntime: { $min: '$runtime' },
          maxRuntime: { $max: '$runtime' },
          filesImported: { $addToSet: '$filename' }
        }
      }
    ]);

    // Runtime total et consommation estimée
    const totalRuntimeHours = stats[0]?.maxRuntime || 0;
    const estimatedTotalConsumption = totalRuntimeHours * 
      config.nominalPower * 
      0.6 * // Modulation moyenne estimée
      config.pelletsPerKWh;

    res.json({
      stats: stats[0] || {},
      totalRuntimeHours,
      estimatedTotalConsumptionKg: Math.round(estimatedTotalConsumption),
      config: {
        nominalPower: config.nominalPower,
        pelletsPerKWh: config.pelletsPerKWh,
        importInterval: config.importInterval
      }
    });

  } catch (error) {
    console.error('Erreur stats chaudière:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des stats',
      details: error.message 
    });
  }
};

// Mettre à jour la configuration de la chaudière
// Récupérer la configuration de la chaudière
exports.getBoilerConfig = async (req, res) => {
  try {
    const config = await getBoilerConfigData();
    
    res.json({
      success: true,
      config: {
        nominalPower: config.nominalPower,
        pelletsPerKWh: config.pelletsPerKWh,
        importInterval: config.importInterval,
        updatedAt: config.updatedAt
      }
    });

  } catch (error) {
    console.error('Erreur récupération config chaudière:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Mettre à jour la configuration de la chaudière
exports.updateBoilerConfig = async (req, res) => {
  try {
    const { nominalPower, pelletsPerKWh, importInterval } = req.body;
    
    // Récupérer ou créer la configuration
    let config = await BoilerConfig.findOne({ configType: 'main' });
    
    if (!config) {
      config = new BoilerConfig({ configType: 'main' });
    }
    
    // Mettre à jour les valeurs si fournies
    if (nominalPower !== undefined) {
      config.nominalPower = parseFloat(nominalPower);
    }
    if (pelletsPerKWh !== undefined) {
      config.pelletsPerKWh = parseFloat(pelletsPerKWh);
    }
    if (importInterval !== undefined) {
      config.importInterval = parseInt(importInterval);
      console.log(`📊 Pattern d'import mis à jour: toutes les ${importInterval} minute(s)`);
    }

    // Sauvegarder en base
    await config.save();

    res.json({
      success: true,
      config: {
        nominalPower: config.nominalPower,
        pelletsPerKWh: config.pelletsPerKWh,
        importInterval: config.importInterval,
        updatedAt: config.updatedAt
      }
    });

  } catch (error) {
    console.error('Erreur config chaudière:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la config',
      details: error.message 
    });
  }
};

// Service d'auto-import
const autoImportService = require('../services/autoImportService');

// Contrôler le service d'auto-import
exports.toggleAutoImport = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    autoImportService.updateConfig({ autoImport: enabled });
    
    const status = autoImportService.getStatus();
    
    res.json({
      success: true,
      message: enabled ? 'Auto-import activé' : 'Auto-import désactivé',
      status
    });
  } catch (error) {
    console.error('Erreur toggle auto-import:', error);
    res.status(500).json({ 
      error: 'Erreur lors du toggle auto-import',
      details: error.message 
    });
  }
};

// Obtenir le statut du service d'auto-import
exports.getAutoImportStatus = async (req, res) => {
  try {
    const status = autoImportService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Erreur statut auto-import:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut',
      details: error.message 
    });
  }
};

// Vérifier manuellement les nouveaux fichiers
exports.checkForNewFiles = async (req, res) => {
  try {
    await autoImportService.checkForNewFiles();
    res.json({
      success: true,
      message: 'Vérification terminée'
    });
  } catch (error) {
    console.error('Erreur vérification fichiers:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la vérification',
      details: error.message 
    });
  }
};

// Configuration Gmail
exports.getGmailConfig = async (req, res) => {
  try {
    const status = await autoImportService.initializeGmail();
    
    // Recharger la configuration pour s'assurer qu'elle est à jour
    await autoImportService.loadGmailConfig();
    
    console.log('📧 Configuration Gmail récupérée:', autoImportService.config.gmail);
    
    res.json({
      configured: status.configured,
      config: autoImportService.config.gmail,
      status: status
    });
  } catch (error) {
    console.error('Erreur config Gmail:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateGmailConfig = async (req, res) => {
  try {
    const { enabled, sender, subject, senders } = req.body;
    
    // Gérer la migration de l'ancien format vers le nouveau
    let sendersArray = senders;
    if (!sendersArray && sender) {
      // Migration de l'ancien format
      sendersArray = [sender];
    }
    if (!sendersArray || sendersArray.length === 0) {
      sendersArray = [''];
    }
    
    console.log('📧 Données reçues pour mise à jour Gmail:', { enabled, sender, senders: sendersArray, subject });
    
    const updatedConfig = await autoImportService.updateGmailConfig({
      enabled: enabled !== undefined ? enabled : autoImportService.config.gmail?.enabled,
      senders: sendersArray,
      subject: subject || autoImportService.config.gmail?.subject
    });
    
    console.log('✅ Configuration Gmail sauvegardée:', updatedConfig.toObject ? updatedConfig.toObject() : updatedConfig);
    
    res.json({
      success: true,
      message: 'Configuration Gmail mise à jour et sauvegardée',
      config: updatedConfig.toObject ? updatedConfig.toObject() : updatedConfig
    });
  } catch (error) {
    console.error('Erreur mise à jour Gmail:', error);
    res.status(500).json({ error: error.message });
  }
};

// Configuration d'import
exports.getImportConfig = async (req, res) => {
  try {
    const GmailConfig = require('../models/GmailConfig');
    const config = await GmailConfig.getConfig();
    
    res.json({
      success: true,
      config: {
        senderAddresses: config.senders || [],
        subjectKeywords: [config.subject || 'okofen'],
        importIntervals: 1, // Valeur par défaut
        cronSchedule: config.cronSchedule || '0 8 * * *',
        cronEnabled: config.enabled || false,
        overwriteFiles: false // Valeur par défaut
      }
    });
  } catch (error) {
    console.error('Erreur récupération config import:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.saveImportConfig = async (req, res) => {
  try {
    const { senderAddresses, subjectKeywords, cronSchedule, cronEnabled } = req.body;
    
    const GmailConfig = require('../models/GmailConfig');
    const config = await GmailConfig.updateConfig({
      senders: senderAddresses || [],
      subject: subjectKeywords && subjectKeywords.length > 0 ? subjectKeywords[0] : 'okofen',
      cronSchedule: cronSchedule || '0 8 * * *',
      enabled: cronEnabled || false
    });
    
    // Mettre à jour aussi le service d'auto-import
    await autoImportService.loadGmailConfig();
    
    res.json({
      success: true,
      message: 'Configuration d\'import sauvegardée avec succès',
      config: config.toObject()
    });
  } catch (error) {
    console.error('Erreur sauvegarde config import:', error);
    res.status(500).json({ error: error.message });
  }
};

// Authentification Gmail
exports.getGmailAuthUrl = async (req, res) => {
  try {
    const authUrl = await autoImportService.gmailService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Erreur URL auth Gmail:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.handleGmailAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Code d\'autorisation manquant' });
    }

    const result = await autoImportService.gmailService.exchangeCodeForToken(code);
    
    // Réinitialiser le service avec le nouveau token
    await autoImportService.initializeGmail();
    
    // Rediriger vers l'interface frontend selon l'environnement
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.VERCEL || 
                         process.cwd().includes('/home/pelletsfun/') ||
                         process.env.PM2_HOME;
    
    const frontendUrl = isProduction ? 'https://pelletsfun.harmonixe.fr' : 'http://localhost:3000';
    console.log(`🔗 Redirection callback (${isProduction ? 'PRODUCTION' : 'LOCAL'}): ${frontendUrl}/?gmail-auth=success`);
    
    res.redirect(`${frontendUrl}/?gmail-auth=success`);
  } catch (error) {
    console.error('Erreur callback Gmail:', error);
    
    // Rediriger vers l'interface frontend selon l'environnement  
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.VERCEL || 
                         process.cwd().includes('/home/pelletsfun/') ||
                         process.env.PM2_HOME;
    
    const frontendUrl = isProduction ? 'https://pelletsfun.harmonixe.fr' : 'http://localhost:3000';
    console.log(`🔗 Redirection erreur (${isProduction ? 'PRODUCTION' : 'LOCAL'}): ${frontendUrl}/?gmail-auth=error`);
    
    res.redirect(`${frontendUrl}/?gmail-auth=error`);
  }
};

// Traitement manuel des emails Gmail (version optimisée)
exports.processGmailEmails = async (req, res) => {
  try {
    // Utiliser le nouveau service Gmail optimisé directement
    const GmailService = require('../services/gmailService');
    const gmailService = new GmailService();
    await gmailService.initializeAuth();
    
    // Récupérer la configuration Gmail existante
    const GmailConfig = require('../models/GmailConfig');
    const config = await GmailConfig.getConfig();
    
    // Traitement avec la logique optimisée
    const result = await gmailService.processOkofenEmails({
      sender: config.senders && config.senders.filter(s => s.trim()).length > 0 ? config.senders.filter(s => s.trim()) : null,
      subject: config.subject || 'okofen',
      downloadPath: require('path').join(process.cwd(), 'backend', 'auto-downloads'),
      processCallback: async (filePath, context) => {
        // Import automatique du fichier CSV avec l'autoImportService existant
        try {
          const autoImportService = require('../services/autoImportService');
          const importResult = await autoImportService.importCSVFile(filePath, require('path').basename(filePath));
          console.log(`📊 Import CSV réussi: ${context.attachment.filename} - ${importResult.validEntries} entrées`);
          return importResult;
        } catch (importError) {
          console.error(`❌ Erreur import CSV ${context.attachment.filename}:`, importError.message);
          throw importError;
        }
      },
      markAsProcessed: true,
      labelProcessed: 'PelletsFun-Traité'
    });

    // Nettoyage automatique des anciens enregistrements en arrière-plan
    gmailService.cleanupOldProcessedEmails().catch(err => 
      console.error('Erreur nettoyage (non bloquante):', err.message)
    );

    res.json({
      success: true,
      message: `✅ Traitement optimisé terminé: ${result.downloaded} fichiers téléchargés, ${result.processed} traités`,
      downloaded: result.downloaded,
      processed: result.processed,
      errors: result.errors
    });

  } catch (error) {
    console.error('❌ Erreur traitement Gmail optimisé:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Configuration du traitement automatique quotidien
exports.getCronStatus = async (req, res) => {
  try {
    const status = {
      isActive: autoImportService.cronJob ? true : false,
      schedule: autoImportService.config.cronSchedule,
      gmailEnabled: autoImportService.config.gmail?.enabled || false,
      lastRun: autoImportService.stats.lastRun,
      stats: autoImportService.stats
    };
    res.json(status);
  } catch (error) {
    console.error('Erreur statut cron:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateCronSchedule = async (req, res) => {
  try {
    const { schedule, enabled } = req.body;
    
    // Valider le format cron
    if (schedule && !cron.validate(schedule)) {
      return res.status(400).json({ error: 'Format de planning invalide' });
    }
    
    // Arrêter l'ancien cron s'il existe
    if (autoImportService.cronJob) {
      await autoImportService.stopCronJob();
    }
    
    // Mettre à jour la configuration
    if (schedule) {
      autoImportService.config.cronSchedule = schedule;
    }
    
    // Sauvegarder la configuration en base
    await autoImportService.saveCronConfigToDB(
      autoImportService.config.cronSchedule, 
      enabled || false
    );
    
    // Démarrer le nouveau cron si activé
    if (enabled) {
      await autoImportService.startCronJob();
    }
    
    res.json({
      success: true,
      message: 'Planning mis à jour et sauvegardé',
      schedule: autoImportService.config.cronSchedule,
      active: autoImportService.cronJob ? true : false
    });
  } catch (error) {
    console.error('Erreur mise à jour cron:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.startCronJob = async (req, res) => {
  try {
    await autoImportService.startCronJob();
    res.json({
      success: true,
      message: 'Traitement automatique démarré et sauvegardé',
      schedule: autoImportService.config.cronSchedule
    });
  } catch (error) {
    console.error('Erreur démarrage cron:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.stopCronJob = async (req, res) => {
  try {
    await autoImportService.stopCronJob();
    res.json({
      success: true,
      message: 'Traitement automatique arrêté'
    });
  } catch (error) {
    console.error('Erreur arrêt cron:', error);
    res.status(500).json({ error: error.message });
  }
};

// Déclencher manuellement l'import des emails
exports.triggerManualImport = async (req, res) => {
  try {
    console.log('🔄 Déclenchement manuel de l\'import demandé');
    
    // Récupérer les paramètres de période, expéditeurs et options d'écrasement depuis la requête
    const { dateFrom, dateTo, senders, overwriteExisting } = req.body;
    
    console.log('📅 Paramètres de période:', { dateFrom, dateTo });
    console.log('📧 Expéditeurs:', senders);
    console.log('🔄 Écraser fichiers existants:', overwriteExisting || false);

    // Créer une tâche asynchrone
    const taskManager = require('../services/taskManager');
    const taskDescription = `Import Gmail ${dateFrom || 'début'} → ${dateTo || 'fin'}${overwriteExisting ? ' (écrasement)' : ''}`;
    const task = taskManager.createTask('gmail_import', taskDescription);

    // Répondre immédiatement avec l'ID de tâche
    res.json({
      success: true,
      message: 'Import démarré en arrière-plan',
      taskId: task.id,
      task: {
        id: task.id,
        description: task.description,
        status: task.status,
        progress: task.progress,
        details: task.details
      }
    });

    // Démarrer le traitement asynchrone
    setImmediate(() => processGmailImportAsync(task.id, { dateFrom, dateTo, senders, overwriteExisting }));

  } catch (error) {
    console.error('❌ Erreur création tâche import manuel:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obtenir le statut du service d'import
exports.getImportStatus = async (req, res) => {
  try {
    const autoImportService = require('../services/autoImportService');
    
    // Obtenir le statut du service
    const serviceStatus = autoImportService.getStatus();
    const serviceStats = autoImportService.stats;
    
    // Vérifier la configuration Gmail
    const gmailStatus = await autoImportService.initializeGmail();
    
    // Statistiques de la base de données
    const dbStats = {
      totalEntries: await BoilerData.countDocuments(),
      totalFiles: (await BoilerData.distinct('filename')).length,
      lastEntry: await BoilerData.findOne().sort({ createdAt: -1 }),
      oldestEntry: await BoilerData.findOne().sort({ createdAt: 1 })
    };
    
    res.json({
      success: true,
      service: {
        isWatching: serviceStatus.isWatching,
        cronActive: serviceStatus.cronActive,
        gmailConfigured: gmailStatus.configured,
        gmailError: gmailStatus.error || null
      },
      stats: {
        filesProcessed: serviceStats.filesProcessed || 0,
        errors: serviceStats.errors || 0,
        lastRun: serviceStats.lastRun || null,
        totalFiles: serviceStats.totalFiles || 0,
        successfulFiles: serviceStats.successfulFiles || 0
      },
      database: dbStats,
      config: {
        emailSettings: serviceStatus.config.gmail || {},
        preventDuplicates: true
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération statut:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getImportHistory = async (req, res) => {
  try {
    // Récupérer les fichiers uniques avec leurs statistiques
    const fileStats = await BoilerData.aggregate([
      {
        $group: {
          _id: "$filename",
          totalEntries: { $sum: 1 },
          firstImport: { $min: "$createdAt" },
          lastImport: { $max: "$createdAt" },
          fileSize: { $first: "$fileSize" }, // Récupérer la taille stockée en base
          dateRange: {
            $addToSet: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
            }
          },
          avgOutsideTemp: { $avg: "$outsideTemp" },
          totalRuntime: { 
            $sum: { 
              $cond: [{ $gt: ["$runtime", 0] }, 1, 0] 
            } 
          },
          // Nouvelles statistiques pour détection arrêt/marche
          avgBoilerTemp: { $avg: "$boilerTemp" },
          maxBoilerTemp: { $max: "$boilerTemp" },
          avgModulation: { $avg: "$modulation" },
          maxRuntime: { $max: "$runtime" },
          minRuntime: { $min: "$runtime" },
          avgFanSpeed: { $avg: "$fanSpeed" },
          // Compter les entrées avec différents statuts
          activeEntries: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $gt: ["$boilerTemp", 40] },
                  { $gt: ["$modulation", 0] }
                ]}, 
                1, 0 
              ] 
            } 
          },
          // Statuts les plus fréquents
          statusStats: { $push: "$status" }
        }
      },
      {
        $project: {
          filename: "$_id",
          totalEntries: 1,
          firstImport: 1,
          lastImport: 1,
          fileSize: 1, // Inclure la taille du fichier
          dateRange: {
            $reduce: {
              input: "$dateRange",
              initialValue: { min: null, max: null },
              in: {
                min: {
                  $cond: [
                    { $or: [{ $eq: ["$$value.min", null] }, { $lt: ["$$this", "$$value.min"] }] },
                    "$$this",
                    "$$value.min"
                  ]
                },
                max: {
                  $cond: [
                    { $or: [{ $eq: ["$$value.max", null] }, { $gt: ["$$this", "$$value.max"] }] },
                    "$$this",
                    "$$value.max"
                  ]
                }
              }
            }
          },
          avgOutsideTemp: { $round: ["$avgOutsideTemp", 1] },
          totalRuntime: 1,
          // Nouvelles stats formatées
          avgBoilerTemp: { $round: ["$avgBoilerTemp", 1] },
          maxBoilerTemp: { $round: ["$maxBoilerTemp", 1] },
          avgModulation: { $round: ["$avgModulation", 1] },
          runtimeRange: {
            min: "$minRuntime",
            max: "$maxRuntime"
          },
          avgFanSpeed: { $round: ["$avgFanSpeed", 0] },
          activeEntries: 1,
          activityRate: { 
            $round: [{ 
              $multiply: [
                { $divide: ["$activeEntries", "$totalEntries"] }, 
                100
              ] 
            }, 1] 
          },
          _id: 0
        }
      },
      {
        $sort: { filename: -1 }
      }
    ]);

    // Enrichir les stats avec les informations formatées
    const enrichedStats = fileStats.map(stat => {
      // Vérifier si le fichier existe dans les dossiers de téléchargement
      const possiblePaths = [
        path.join(process.cwd(), 'auto-downloads', stat.filename),
        path.join(process.cwd(), stat.filename),
        path.join(process.cwd(), 'uploads', stat.filename)
      ];

      let fileExists = false;
      let filePath = null;

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          fileExists = true;
          filePath = testPath;
          break;
        }
      }

      // Utiliser la taille stockée en base, sinon fallback sur le fichier physique
      let finalFileSize = 0;
      if (stat.fileSize && stat.fileSize > 0) {
        finalFileSize = Math.round(stat.fileSize / 1024); // Convertir en KB
      } else if (fileExists && filePath) {
        // Fallback pour les anciens imports sans taille stockée
        try {
          finalFileSize = Math.round(fs.statSync(filePath).size / 1024);
        } catch (e) {
          finalFileSize = 0;
        }
      }

      return {
        ...stat,
        fileExists,
        fileSize: finalFileSize, // KB
        filePath: fileExists ? filePath : null,
        status: stat.totalEntries > 0 ? 'success' : 'empty'
      };
    });

    res.json({
      success: true,
      files: enrichedStats,
      totalFiles: enrichedStats.length,
      totalEntries: enrichedStats.reduce((sum, f) => sum + f.totalEntries, 0)
    });

  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtenir le statut d'une tâche spécifique
exports.getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskManager = require('../services/taskManager');
    
    const task = taskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Tâche introuvable'
      });
    }

    res.json({
      success: true,
      task: {
        id: task.id,
        type: task.type,
        description: task.description,
        status: task.status,
        progress: task.progress,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        details: task.details,
        result: task.result,
        error: task.error
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération statut tâche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtenir les logs d'une tâche spécifique
exports.getTaskLogs = async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskManager = require('../services/taskManager');
    
    const task = taskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Tâche introuvable'
      });
    }

    res.json({
      success: true,
      logs: task.logs || []
    });

  } catch (error) {
    console.error('❌ Erreur récupération logs tâche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtenir toutes les tâches actives
exports.getActiveTasks = async (req, res) => {
  try {
    const taskManager = require('../services/taskManager');
    const tasks = taskManager.getUserTasks();
    
    const activeTasks = tasks.map(task => ({
      id: task.id,
      type: task.type,
      description: task.description,
      status: task.status,
      progress: task.progress,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      details: task.details
    }));

    res.json({
      success: true,
      tasks: activeTasks,
      stats: taskManager.getStats()
    });

  } catch (error) {
    console.error('❌ Erreur récupération tâches actives:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Supprimer un import spécifique
exports.deleteImport = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier requis' });
    }

    console.log(`🗑️ Suppression de l'import: ${filename}`);

    // Vérifier combien d'entrées seront supprimées
    const entryCount = await BoilerData.countDocuments({ filename });
    
    if (entryCount === 0) {
      return res.status(404).json({ 
        error: `Aucune donnée trouvée pour le fichier "${filename}"` 
      });
    }

    // Supprimer toutes les entrées de ce fichier
    const deleteResult = await BoilerData.deleteMany({ filename });

    // Supprimer le fichier physique s'il existe
    const possiblePaths = [
      path.join(process.cwd(), 'auto-downloads', filename),
      path.join(process.cwd(), filename),
      path.join(process.cwd(), 'uploads', filename)
    ];

    let fileDeleted = false;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        try {
          fs.unlinkSync(testPath);
          fileDeleted = true;
          console.log(`📁 Fichier physique supprimé: ${testPath}`);
          break;
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer le fichier: ${testPath}`, error.message);
        }
      }
    }

    console.log(`✅ Suppression terminée: ${deleteResult.deletedCount} entrées supprimées`);

    res.json({
      success: true,
      message: `Import "${filename}" supprimé avec succès`,
      deletedEntries: deleteResult.deletedCount,
      fileDeleted
    });

  } catch (error) {
    console.error('❌ Erreur suppression import:', error);
    res.status(500).json({ 
      error: `Erreur lors de la suppression: ${error.message}` 
    });
  }
};

/**
 * Traitement asynchrone de l'import Gmail
 */
async function processGmailImportAsync(taskId, params) {
  const taskManager = require('../services/taskManager');
  
  try {
    const { dateFrom, dateTo, senders, overwriteExisting } = params;
    
    // Étape 1: Initialisation
    taskManager.updateTaskStatus(taskId, 'running', 0, { 
      currentStep: 'Initialisation des services...' 
    });
    taskManager.addTaskLog(taskId, 'info', 'Démarrage du traitement asynchrone');

    // Importer les services nécessaires
    const autoImportService = require('../services/autoImportService');
    const GmailService = require('../services/gmailService');
    const GmailConfig = require('../models/GmailConfig');

    // Étape 2: Statistiques initiales
    taskManager.updateTaskStatus(taskId, 'running', 5, { 
      currentStep: 'Collecte des statistiques initiales...' 
    });

    const statsBefore = await BoilerData.countDocuments();
    const filesBefore = await BoilerData.distinct('filename');
    
    taskManager.addTaskLog(taskId, 'info', `État avant import: ${statsBefore} entrées, ${filesBefore.length} fichiers`);

    // Étape 3: Configuration Gmail
    taskManager.updateTaskStatus(taskId, 'running', 10, { 
      currentStep: 'Configuration du service Gmail...' 
    });

    const gmailService = new GmailService();
    const gmailInitResult = await gmailService.initialize();
    
    if (!gmailInitResult.configured) {
      throw new Error(`Service Gmail non configuré: ${gmailInitResult.error}`);
    }

    const config = await GmailConfig.getConfig();
    taskManager.addTaskLog(taskId, 'info', 'Service Gmail initialisé avec succès');

    // Étape 4: Préparation des paramètres
    taskManager.updateTaskStatus(taskId, 'running', 15, { 
      currentStep: 'Préparation des paramètres d\'import...' 
    });

    const importParams = {};
    if (dateFrom || dateTo) {
      importParams.period = {
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null
      };
    }

    const gmailOptions = {
      subject: config.subject || 'okofen',
      downloadPath: require('path').join(process.cwd(), 'backend', 'auto-downloads'),
      processCallback: async (filePath, context) => {
        // Callback avec mise à jour du progrès
        taskManager.updateTaskStatus(taskId, 'running', null, {
          currentStep: `Import CSV: ${context.attachment.filename}...`,
          importedFiles: (taskManager.getTask(taskId).details.importedFiles || 0) + 1
        });
        
        try {
          const importResult = await autoImportService.importCSVFile(filePath, require('path').basename(filePath));
          taskManager.addTaskLog(taskId, 'success', `Import CSV réussi: ${context.attachment.filename} - ${importResult.validEntries} entrées`);
          return importResult;
        } catch (importError) {
          taskManager.addTaskLog(taskId, 'error', `Erreur import CSV ${context.attachment.filename}: ${importError.message}`);
          throw importError;
        }
      },
      markAsProcessed: true,
      labelProcessed: 'PelletsFun-Traité',
      overwriteExisting: overwriteExisting || false
    };

    // Configuration de la période
    if (importParams.period) {
      if (importParams.period.dateFrom) {
        gmailOptions.dateFrom = importParams.period.dateFrom.toISOString().split('T')[0];
      }
      if (importParams.period.dateTo) {
        gmailOptions.dateTo = importParams.period.dateTo.toISOString().split('T')[0];
      }
    }

    // Configuration des expéditeurs
    if (senders && senders.length > 0) {
      gmailOptions.sender = senders;
    } else if (config.senders && config.senders.filter(s => s.trim()).length > 0) {
      gmailOptions.sender = config.senders.filter(s => s.trim());
    }

    // Étape 5: Recherche préliminaire pour obtenir le total
    taskManager.updateTaskStatus(taskId, 'running', 20, { 
      currentStep: 'Recherche des emails Gmail...' 
    });

    // D'abord, faire une recherche pour obtenir le nombre total
    const searchResult = await gmailService.searchOkofenEmails(gmailOptions);
    
    // Compter le nombre total de fichiers à traiter
    let totalFiles = 0;
    if (searchResult.emails && searchResult.emails.length > 0) {
      totalFiles = searchResult.emails.reduce((total, email) => {
        return total + email.attachments.length;
      }, 0);
      
      taskManager.updateTaskStatus(taskId, 'running', 25, { 
        currentStep: `${searchResult.totalFound} emails trouvés, ${totalFiles} fichiers à traiter...`,
        totalEmails: searchResult.totalFound,
        totalFiles: totalFiles,
        processedFiles: 0,
        pagesProcessed: searchResult.pagesProcessed || 1
      });
      taskManager.addTaskLog(taskId, 'info', `Recherche terminée: ${searchResult.totalFound} emails trouvés, ${totalFiles} fichiers CSV à traiter sur ${searchResult.pagesProcessed || 1} page(s)`);
    } else {
      taskManager.updateTaskStatus(taskId, 'running', 100, { 
        currentStep: 'Aucun fichier à traiter.' 
      });
      taskManager.addTaskLog(taskId, 'info', 'Aucun email avec fichiers CSV trouvé');
      
      // Terminer la tâche immédiatement s'il n'y a pas de fichiers
      const emptyResult = {
        entriesBefore: statsBefore,
        entriesAfter: statsBefore,
        newEntries: 0,
        filesBefore: filesBefore.length,
        filesAfter: filesBefore.length,
        newFiles: 0,
        importDetails: { downloaded: 0, processed: 0, errors: [] }
      };
      taskManager.completeTask(taskId, emptyResult);
      return;
    }

    // Étape 6: Traitement des emails avec callback de progression
    taskManager.updateTaskStatus(taskId, 'running', 30, { 
      currentStep: 'Traitement et téléchargement des pièces jointes...' 
    });

    // Modifier les options pour inclure un callback de progression par fichier
    const originalCallback = gmailOptions.processCallback;
    let processedFiles = 0;
    let downloadedCount = 0;
    
    gmailOptions.processCallback = async (filePath, context) => {
      processedFiles++;
      
      // Calculer le pourcentage basé sur les fichiers traités (30% à 85% de la progression totale)
      const fileProgress = Math.round(30 + (processedFiles / totalFiles) * 55);
      
      taskManager.updateTaskStatus(taskId, 'running', fileProgress, {
        currentStep: `Import CSV: ${context.attachment.filename} (${processedFiles}/${totalFiles})...`,
        processedFiles: processedFiles,
        totalFiles: totalFiles,
        downloadedFiles: processedFiles // Mise à jour du nombre de téléchargements
      });
      
      // Appeler le callback original s'il existe
      if (originalCallback) {
        try {
          const result = await originalCallback(filePath, context);
          
          // Mettre à jour le nombre de fichiers importés
          taskManager.updateTaskStatus(taskId, 'running', fileProgress, {
            currentStep: `Import CSV: ${context.attachment.filename} terminé (${processedFiles}/${totalFiles})`,
            processedFiles: processedFiles,
            totalFiles: totalFiles,
            downloadedFiles: processedFiles,
            importedFiles: processedFiles
          });
          
          return result;
        } catch (importError) {
          taskManager.addTaskLog(taskId, 'error', `Erreur import ${context.attachment.filename}: ${importError.message}`);
          throw importError;
        }
      }
    };

    // Traitement direct des emails déjà trouvés pour éviter une double recherche
    let importResult;
    if (searchResult.emails && searchResult.emails.length > 0) {
      // Utiliser les emails déjà trouvés au lieu de refaire une recherche
      importResult = await gmailService.processEmailsDirectly(searchResult.emails, gmailOptions);
    } else {
      // Fallback: utiliser la méthode normale si searchResult ne contient pas les emails
      importResult = await gmailService.processOkofenEmails(gmailOptions);
    }

    // Étape 7: Nettoyage et statistiques finales
    taskManager.updateTaskStatus(taskId, 'running', 90, { 
      currentStep: 'Finalisation et statistiques...' 
    });

    // Nettoyage en arrière-plan
    gmailService.cleanupOldProcessedEmails().catch(err => 
      taskManager.addTaskLog(taskId, 'warn', `Nettoyage (non bloquant): ${err.message}`)
    );

    // Statistiques finales
    const statsAfter = await BoilerData.countDocuments();
    const filesAfter = await BoilerData.distinct('filename');
    const newEntries = statsAfter - statsBefore;
    const newFiles = filesAfter.length - filesBefore.length;

    taskManager.addTaskLog(taskId, 'info', `État après import: ${statsAfter} entrées, ${filesAfter.length} fichiers`);
    taskManager.addTaskLog(taskId, 'success', `Import terminé: +${newEntries} entrées, +${newFiles} fichiers`);

    // Résultat final
    const finalResult = {
      entriesBefore: statsBefore,
      entriesAfter: statsAfter,
      newEntries: newEntries,
      filesBefore: filesBefore.length,
      filesAfter: filesAfter.length,
      newFiles: newFiles,
      importDetails: {
        downloaded: importResult.downloaded || 0,
        processed: importResult.processed || 0,
        errors: importResult.errors || []
      }
    };

    taskManager.completeTask(taskId, finalResult);

  } catch (error) {
    console.error(`❌ Erreur traitement asynchrone [${taskId}]:`, error);
    taskManager.failTask(taskId, error);
  }
}

// Récupérer le contenu d'un fichier CSV
exports.getFileContent = async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    
    console.log(`📄 Demande visualisation fichier: ${filename}`);
    
    // Fonction de traduction des en-têtes allemands vers français avec descriptions
    const translateHeader = (germanHeader) => {
      const translations = {
        // En-têtes de base
        'Datum': 'Date',
        'Zeit': 'Heure',
        
        // Températures extérieures (versions °C et �C)
        'AT [°C]': 'Température Extérieure [°C]',
        'AT [�C]': 'Température Extérieure [°C]',
        'ATakt [°C]': 'Temp. Ext. Active [°C]',
        'ATakt [�C]': 'Temp. Ext. Active [°C]',
        
        // Circuit chauffage (HK1) - versions °C et �C
        'HK1 VL Ist[°C]': 'Départ Réel [°C]',
        'HK1 VL Ist[�C]': 'Départ Réel [°C]',
        'HK1 VL Soll[°C]': 'Départ Consigne [°C]',
        'HK1 VL Soll[�C]': 'Départ Consigne [°C]',
        'HK1 RT Ist[°C]': 'Ambiance Réelle [°C]',
        'HK1 RT Ist[�C]': 'Ambiance Réelle [°C]',
        'HK1 RT Soll[°C]': 'Ambiance Consigne [°C]',
        'HK1 RT Soll[�C]': 'Ambiance Consigne [°C]',
        'HK1 Pumpe': 'Pompe Chauff.',
        'HK1 Mischer': 'Mélangeur',
        'HK1 Fernb[°C]': 'Chauff. Télécommande [°C]',
        'HK1 Status': 'Statut Chauffage',
        
        // Eau chaude sanitaire (WW1) - versions °C et �C
        'WW1 EinT Ist[°C]': 'ECS Entrée [°C]',
        'WW1 EinT Ist[�C]': 'ECS Entrée [°C]',
        'WW1 AusT Ist[°C]': 'ECS Sortie [°C]',
        'WW1 AusT Ist[�C]': 'ECS Sortie [°C]',
        'WW1 Soll[°C]': 'ECS Consigne [°C]',
        'WW1 Soll[�C]': 'ECS Consigne [°C]',
        'WW1 Pumpe': 'Pompe ECS',
        'WW1 Status': 'Statut ECS',
        
        // Capteur externe
        'Sensor ext [°C]': 'Capteur Ext. [°C]',
        
        // Chaudière pellets (PE1) - versions °C et �C
        'PE1 KT[°C]': 'Temp. Chaudière [°C]',
        'PE1 KT[�C]': 'Temp. Chaudière [°C]',
        'PE1 KT_SOLL[°C]': 'Chaudière Consigne [°C]',
        'PE1 KT_SOLL[�C]': 'Chaudière Consigne [°C]',
        'PE1 UW Freigabe[°C]': 'Chaudière Dégagement [°C]',
        'PE1 Modulation[%]': 'Modulation [%]',
        'PE1 FRT Ist[°C]': 'Temp. Fumées Réelle [°C]',
        'PE1 FRT Ist[�C]': 'Temp. Fumées Réelle [°C]',
        'PE1 FRT Soll[°C]': 'Temp. Fumées Consigne [°C]',
        'PE1 FRT Soll[�C]': 'Temp. Fumées Consigne [°C]',
        'PE1 FRT End[°C]': 'Foyer Temp. Finale [°C]',
        'PE1 Einschublaufzeit[zs]': 'Temps Alimentation [zs]',
        'PE1 Pausenzeit[zs]': 'Temps Pause [zs]',
        'PE1 Luefterdrehzahl[%]': 'Vitesse Ventilateur [%]',
        'PE1 Saugzugdrehzahl[%]': 'Vitesse Aspiration [%]',
        'PE1 Unterdruck Ist[EH]': 'Dépression Réelle [EH]',
        'PE1 Unterdruck Soll[EH]': 'Dépression Consigne [EH]',
        'PE1 Fuellstand[kg]': 'Niveau Pellets [kg]',
        'PE1 Fuellstand ZWB[kg]': 'Niveau Réserve [kg]',
        'PE1 Status': 'Statut Chaudière',
        'PE1 Statusbit': 'Bits Statut',
        
        // Moteurs et composants
        'PE1 Motor ES': 'Moteur Alimentation',
        'PE1 Motor RA': 'Moteur Cendres',
        'PE1 Motor RES1': 'Moteur Réserve1',
        'PE1 Motor TURBINE': 'Moteur Turbine',
        'PE1 Motor ZUEND': 'Moteur Allumage',
        'PE1 Motor UW[%]': 'Moteur Circulation [%]',
        'PE1 Motor AV': 'Moteur AV',
        'PE1 Motor RES2': 'Moteur Réserve2',
        'PE1 Motor MA': 'Moteur MA',
        'PE1 Motor RM': 'Moteur RM',
        'PE1 Motor SM': 'Moteur SM',
        
        // Températures réserves et autres
        'PE1 Res1 Temp.[°C]': 'Temp. Réserve1 [°C]',
        'PE1 Res2 Temp.[°C]': 'Temp. Réserve2 [°C]',
        'PE1 CAP RA': 'Capacité RA',
        'PE1 CAP ZB': 'Capacité ZB',
        'PE1 AK': 'AK',
        'PE1 Saug-Int[min]': 'Intervalle Aspiration [min]',
        'PE1 DigIn1': 'Entrée Numérique 1',
        'PE1 DigIn2': 'Entrée Numérique 2',
        'PE1 CntDig1': 'Compteur Numérique 1',
        'PE1 Ashfill[kg]': 'Remplissage Cendres [kg]',
        'PE1 Runtime[h]': 'Temps Fonctionnement [h]',
        
        // Erreurs
        'Fehler1': 'Erreur 1',
        'Fehler2': 'Erreur 2',
        'Fehler3': 'Erreur 3',
        
        // Champ vide ou inconnu
        'PE1_BR1': 'Brûleur 1'
      };
      
      // Retourner la traduction ou l'original si pas de traduction
      return translations[germanHeader.trim()] || germanHeader;
    };

    // Descriptions détaillées pour les info-bulles
    const getHeaderDescription = (germanHeader) => {
      const descriptions = {
        // Horodatage
        'Datum': 'Date d\'enregistrement des données (format DD.MM.YYYY)',
        'Zeit': 'Heure d\'enregistrement des données (format HH:MM:SS)',
        
        // Température extérieure
        'AT [°C]': 'Température extérieure mesurée par la sonde météo. Utilisée pour la régulation automatique de la chaudière selon la courbe de chauffe.',
        'AT [�C]': 'Température extérieure mesurée par la sonde météo. Utilisée pour la régulation automatique de la chaudière selon la courbe de chauffe.',
        
        // Circuit chauffage départ
        'HK1 VL Ist[°C]': 'Température réelle du circuit de départ chauffage. C\'est la température de l\'eau qui part vers les radiateurs/plancher chauffant.',
        'HK1 VL Ist[�C]': 'Température réelle du circuit de départ chauffage. C\'est la température de l\'eau qui part vers les radiateurs/plancher chauffant.',
        'HK1 VL Soll[°C]': 'Température de consigne du circuit de départ chauffage. Calculée automatiquement selon la courbe de chauffe et la température extérieure.',
        'HK1 VL Soll[�C]': 'Température de consigne du circuit de départ chauffage. Calculée automatiquement selon la courbe de chauffe et la température extérieure.',
        
        // Circuit chauffage retour/ambiance
        'HK1 RT Ist[°C]': 'Température réelle du circuit de retour chauffage. C\'est la température de l\'eau qui revient des radiateurs/plancher chauffant.',
        'HK1 RT Ist[�C]': 'Température réelle du circuit de retour chauffage. C\'est la température de l\'eau qui revient des radiateurs/plancher chauffant.',
        'HK1 RT Soll[°C]': 'Température de consigne du circuit de retour chauffage. Permet d\'optimiser le rendement et d\'éviter la condensation.',
        'HK1 RT Soll[�C]': 'Température de consigne du circuit de retour chauffage. Permet d\'optimiser le rendement et d\'éviter la condensation.',
        
        // États pompe/mélangeur
        'HK1 Pumpe': 'État de la pompe de circulation du chauffage (0 = arrêt, 1 = marche). Assure la circulation d\'eau dans le circuit de chauffage.',
        'HK1 Mischer': 'Position de la vanne mélangeuse du chauffage (0-100%). Mélange l\'eau chaude de la chaudière avec l\'eau de retour pour ajuster la température.',
        
        // Eau chaude sanitaire
        'WW1 EinT Ist[°C]': 'Température d\'entrée réelle de l\'eau chaude sanitaire dans l\'échangeur. Eau froide qui arrive du réseau.',
        'WW1 EinT Ist[�C]': 'Température d\'entrée réelle de l\'eau chaude sanitaire dans l\'échangeur. Eau froide qui arrive du réseau.',
        'WW1 AusT Ist[°C]': 'Température de sortie réelle de l\'eau chaude sanitaire de l\'échangeur. Eau chaude produite pour les robinets.',
        'WW1 AusT Ist[�C]': 'Température de sortie réelle de l\'eau chaude sanitaire de l\'échangeur. Eau chaude produite pour les robinets.',
        'WW1 Soll[°C]': 'Température de consigne pour l\'eau chaude sanitaire. Réglable selon vos besoins de confort (généralement 45-60°C).',
        'WW1 Soll[�C]': 'Température de consigne pour l\'eau chaude sanitaire. Réglable selon vos besoins de confort (généralement 45-60°C).',
        'WW1 Pumpe': 'État de la pompe de circulation ECS (0 = arrêt, 1 = marche). Active lors des puisages ou maintien en température.',
        
        // Chaudière essentiel
        'PE1 Modulation[%]': 'Puissance de modulation du brûleur (0-100%). Indique l\'intensité de combustion des pellets pour s\'adapter aux besoins thermiques.',
        'PE1 KT[°C]': 'Température de la chaudière. Température de l\'eau dans le corps de chauffe, doit rester dans les limites de sécurité (60-85°C).',
        'PE1 KT[�C]': 'Température de la chaudière. Température de l\'eau dans le corps de chauffe, doit rester dans les limites de sécurité (60-85°C).',
        
        // Température fumées
        'PE1 FRT Ist[°C]': 'Température réelle des fumées dans le foyer. Indicateur clé du rendement : trop haute = perte d\'énergie, trop basse = condensation.',
        'PE1 FRT Ist[�C]': 'Température réelle des fumées dans le foyer. Indicateur clé du rendement : trop haute = perte d\'énergie, trop basse = condensation.',
        'PE1 FRT Soll[°C]': 'Température de consigne des fumées. Optimisée automatiquement pour un rendement maximal et une combustion propre.',
        'PE1 FRT Soll[�C]': 'Température de consigne des fumées. Optimisée automatiquement pour un rendement maximal et une combustion propre.',
        
        // Niveau et fonctionnement
        'PE1 Fuellstand[kg]': 'Niveau de pellets dans le réservoir en kilogrammes. Permet de surveiller l\'autonomie restante et planifier les livraisons.',
        'PE1 Runtime[h]': 'Nombre d\'heures de fonctionnement cumulées de la chaudière. Utile pour la maintenance préventive et le suivi des consommations.',
        
        // Erreurs
        'Fehler1': 'Code d\'erreur primaire (0 = aucune erreur). Consulter le manuel pour la signification des codes d\'erreur spécifiques.',
        'Fehler2': 'Code d\'erreur secondaire (0 = aucune erreur). Erreurs moins critiques ou informations de diagnostic complémentaires.',
        'Fehler3': 'Code d\'erreur tertiaire (0 = aucune erreur). Erreurs mineures ou alertes préventives de maintenance.'
      };
      
      return descriptions[germanHeader.trim()] || 'Description non disponible pour cette colonne.';
    };
    
    // Chercher dans les différents répertoires possibles
    const possiblePaths = [
      path.join(__dirname, '../auto-downloads', filename),
      path.join(__dirname, '../uploads', filename),
      path.join(__dirname, '../../', filename), // Racine du projet
      path.join(__dirname, '../../auto-downloads', filename),
      path.join(__dirname, '../../backend/auto-downloads', filename),
      path.join(__dirname, '../../client/public', filename)
    ];
    
    // Recherche du fichier CSV dans les répertoires possibles
    
    let filePath = null;
    let fileExists = false;
    
    // Tester chaque chemin possible
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        fileExists = true;
        break;
      } catch (error) {
        // Fichier non trouvé à ce chemin, continuer
        continue;
      }
    }
    
    if (!fileExists) {
      console.log(`❌ Fichier non trouvé: ${filename}`);
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
    
    // Lire le contenu du fichier
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Limiter à 500 lignes pour éviter de surcharger l'interface
    const maxLines = 500;
    const truncated = lines.length > maxLines;
    const displayLines = lines.slice(0, maxLines);
    
    // Obtenir des infos sur le fichier
    const stats = await fs.stat(filePath);
    
    console.log(`✅ Fichier lu: ${filename}, ${lines.length} lignes, ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Colonnes essentielles à conserver (avec variantes d'encodage)
    const essentialColumns = [
      // Horodatage
      'Datum', 'Zeit',
      
      // Température extérieure (ATakt plus précis, mais on garde AT comme demandé)
      'AT [°C]', 'AT [�C]',
      
      // Circuit chauffage départ
      'HK1 VL Ist[°C]', 'HK1 VL Ist[�C]',
      'HK1 VL Soll[°C]', 'HK1 VL Soll[�C]',
      
      // Circuit chauffage retour/ambiance
      'HK1 RT Ist[°C]', 'HK1 RT Ist[�C]',
      'HK1 RT Soll[°C]', 'HK1 RT Soll[�C]',
      
      // États pompe/mélangeur
      'HK1 Pumpe', 'HK1 Mischer',
      
      // Eau chaude sanitaire
      'WW1 EinT Ist[°C]', 'WW1 EinT Ist[�C]',
      'WW1 AusT Ist[°C]', 'WW1 AusT Ist[�C]',
      'WW1 Soll[°C]', 'WW1 Soll[�C]',
      'WW1 Pumpe',
      
      // Chaudière essentiel
      'PE1 Modulation[%]',
      'PE1 KT[°C]', 'PE1 KT[�C]',
      
      // Température fumées
      'PE1 FRT Ist[°C]', 'PE1 FRT Ist[�C]',
      'PE1 FRT Soll[°C]', 'PE1 FRT Soll[�C]',
      
      // Niveau et fonctionnement
      'PE1 Fuellstand[kg]',
      'PE1 Runtime[h]',
      
      // Erreurs
      'Fehler1', 'Fehler2', 'Fehler3'
    ];
    
    // Traiter les en-têtes pour les traduire et filtrer
    const originalHeaders = displayLines[0] ? displayLines[0].split(';') : [];
    const translatedHeaders = originalHeaders.map(header => translateHeader(header));
    
    // Identifier les indices des colonnes à conserver
    const visibleColumnIndices = [];
    originalHeaders.forEach((header, index) => {
      if (essentialColumns.includes(header.trim())) {
        visibleColumnIndices.push(index);
      }
    });
    
    // Filtrer les en-têtes (garder seulement les essentielles)
    const visibleHeaders = translatedHeaders.filter((_, index) => visibleColumnIndices.includes(index));
    const visibleOriginalHeaders = originalHeaders.filter((_, index) => visibleColumnIndices.includes(index));
    
    // Créer les descriptions pour les colonnes visibles
    const headerDescriptions = visibleOriginalHeaders.map(header => getHeaderDescription(header));
    
    // Filtrer les données (garder seulement les colonnes essentielles)
    const filteredContent = displayLines.map(line => {
      const cells = line.split(';');
      return cells.filter((_, index) => visibleColumnIndices.includes(index)).join(';');
    });
    
    console.log(`🔄 Colonnes essentielles: ${originalHeaders.length} → ${visibleHeaders.length} colonnes (${originalHeaders.length - visibleHeaders.length} masquées)`);
    
    res.json({
      success: true,
      fileData: {
        filename: filename,
        totalLines: lines.length,
        displayLines: displayLines.length,
        truncated: truncated,
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        lastModified: stats.mtime,
        content: filteredContent,
        headers: visibleHeaders,
        originalHeaders: visibleOriginalHeaders, // En-têtes originaux visibles
        headerDescriptions: headerDescriptions, // Descriptions pour les info-bulles
        visibleColumns: visibleColumnIndices.length, // Nombre de colonnes affichées
        totalColumns: originalHeaders.length // Nombre total de colonnes
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lecture fichier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la lecture du fichier',
      error: error.message
    });
  }
};

// Récupérer les données de température pour graphique journalier
exports.getTemperatureData = async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    
    console.log(`📊 Demande données température pour: ${filename}`);
    console.log(`🔍 Répertoire de travail: ${process.cwd()}`);
    
    // Construire le chemin complet du fichier 
    // Le serveur s'exécute depuis la racine, donc pas besoin d'ajouter 'backend'
    const autoDownloadsPath = path.join(process.cwd(), 'auto-downloads');
    const filePath = path.join(autoDownloadsPath, filename);
    
    console.log(`📁 Chemin calculé: ${filePath}`);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
    
    // Lire le fichier CSV
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Fichier CSV invalide ou vide'
      });
    }
    
    // Parser les données
    const headers = lines[0].split(';');
    const temperatureData = [];
    
    // Trouver les indices des colonnes qui nous intéressent
    let dateIndex = -1, timeIndex = -1, ambientTempIndex = -1, targetTempIndex = -1, outdoorTempIndex = -1;
    
    headers.forEach((header, index) => {
      const cleanHeader = header.trim();
      if (cleanHeader === 'Datum') dateIndex = index;
      else if (cleanHeader === 'Zeit') timeIndex = index;
      else if (cleanHeader.includes('HK1 RT Ist[') && cleanHeader.includes('C]')) ambientTempIndex = index; // Température réelle
      else if (cleanHeader.includes('HK1 RT Soll[') && cleanHeader.includes('C]')) targetTempIndex = index; // Température de consigne
      else if (cleanHeader.includes('ATakt [') && cleanHeader.includes('C]')) outdoorTempIndex = index; // Température extérieure
    });
    
    if (dateIndex === -1 || timeIndex === -1 || ambientTempIndex === -1 || targetTempIndex === -1 || outdoorTempIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Colonnes de température non trouvées dans le fichier',
        found: {
          date: dateIndex !== -1,
          time: timeIndex !== -1,
          ambientTemp: ambientTempIndex !== -1,
          targetTemp: targetTempIndex !== -1,
          outdoorTemp: outdoorTempIndex !== -1
        }
      });
    }
    
    // Parser chaque ligne de données
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      
      if (values.length > Math.max(dateIndex, timeIndex, ambientTempIndex, targetTempIndex, outdoorTempIndex)) {
        const date = values[dateIndex]?.trim();
        const time = values[timeIndex]?.trim();
        const realTemp = parseFloat(values[ambientTempIndex]?.trim().replace(',', '.'));
        const setpointTemp = parseFloat(values[targetTempIndex]?.trim().replace(',', '.'));
        const outdoorTemp = parseFloat(values[outdoorTempIndex]?.trim().replace(',', '.'));
        
        // Créer un timestamp combiné
        if (date && time && !isNaN(realTemp) && !isNaN(setpointTemp) && !isNaN(outdoorTemp)) {
          // Convertir la date allemande (DD.MM.YYYY) en format ISO
          const [day, month, year] = date.split('.');
          const timestamp = new Date(`${year}-${month}-${day}T${time}`);
          
          temperatureData.push({
            timestamp: timestamp.toISOString(),
            realTemp,
            setpointTemp,
            outdoorTemp
          });
        }
      }
    }
    
    // Trier par timestamp
    temperatureData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      success: true,
      data: {
        filename,
        totalPoints: temperatureData.length,
        temperatureData
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération données température:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données de température',
      error: error.message
    });
  }
};
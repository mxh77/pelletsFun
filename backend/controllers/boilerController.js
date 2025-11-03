const BoilerData = require('../models/BoilerData');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

// Configuration consommation chaudière
const BOILER_CONFIG = {
  // Puissance nominale de la chaudière (kW) - à ajuster selon votre modèle
  nominalPower: 15, // kW par exemple
  // Consommation pellets par kW/h (kg) - valeur approximative
  pelletsPerKWh: 0.2, // 200g de pellets par kWh
  // Facteur de modulation (la chaudière module sa puissance selon les besoins)
  modulationFactor: true
};

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
            const [day, month, year] = data.Datum?.split('.') || [];
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
              console.log(`Ligne ${lineCount}: Date invalide`, data.Datum);
              return;
            }

            const boilerEntry = {
              date: date,
              time: data.Zeit?.trim() || '',
              outsideTemp: parseFloat(data['AT [°C]']?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat(data['ATakt [°C]']?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat(data['HK1 VL Ist[°C]']?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat(data['HK1 VL Soll[°C]']?.replace(',', '.')) || 0,
              boilerTemp: parseFloat(data['PE1 KT[°C]']?.replace(',', '.')) || 0,
              boilerTempTarget: parseFloat(data['PE1 KT_SOLL[°C]']?.replace(',', '.')) || 0,
              modulation: parseFloat(data['PE1 Modulation[%]']?.replace(',', '.')) || 0,
              fanSpeed: parseFloat(data['PE1 Luefterdrehzahl[%]']?.replace(',', '.')) || 0,
              runtime: parseFloat(data['PE1 Runtime[h]']?.replace(',', '.')) || 0,
              status: parseInt(data['PE1 Status']) || 0,
              hotWaterInTemp: parseFloat(data['WW1 EinT Ist[°C]']?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat(data['WW1 AusT Ist[°C]']?.replace(',', '.')) || 0,
              filename: originalFilename
            };

            // Valider les données essentielles
            if (boilerEntry.runtime > 0) {
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

    // Supprimer les données existantes pour ce fichier
    await BoilerData.deleteMany({ filename: originalFilename });

    // Insérer les nouvelles données
    if (results.length > 0) {
      await BoilerData.insertMany(results);
    }

    // Supprimer le fichier temporaire après import
    fs.unlinkSync(csvPath);

    res.json({
      success: true,
      message: `${results.length} entrées importées depuis ${originalFilename}`,
      linesProcessed: lineCount,
      validEntries: results.length,
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

            const boilerEntry = {
              date: date,
              time: data.Zeit?.trim() || '',
              outsideTemp: parseFloat(data['AT [°C]']?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat(data['ATakt [°C]']?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat(data['HK1 VL Ist[°C]']?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat(data['HK1 VL Soll[°C]']?.replace(',', '.')) || 0,
              boilerTemp: parseFloat(data['PE1 KT[°C]']?.replace(',', '.')) || 0,
              boilerTempTarget: parseFloat(data['PE1 KT_SOLL[°C]']?.replace(',', '.')) || 0,
              modulation: parseFloat(data['PE1 Modulation[%]']?.replace(',', '.')) || 0,
              fanSpeed: parseFloat(data['PE1 Luefterdrehzahl[%]']?.replace(',', '.')) || 0,
              runtime: parseFloat(data['PE1 Runtime[h]']?.replace(',', '.')) || 0,
              status: parseInt(data['PE1 Status']) || 0,
              hotWaterInTemp: parseFloat(data['WW1 EinT Ist[°C]']?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat(data['WW1 AusT Ist[°C]']?.replace(',', '.')) || 0,
              filename: filename
            };

            if (boilerEntry.runtime > 0) {
              results.push(boilerEntry);
            }
          } catch (error) {
            console.error(`Erreur ligne ${lineCount}:`, error);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Supprimer les données existantes pour ce fichier
    await BoilerData.deleteMany({ filename });

    // Insérer les nouvelles données
    if (results.length > 0) {
      await BoilerData.insertMany(results);
    }

    res.json({
      success: true,
      message: `${results.length} entrées importées depuis ${filename}`,
      linesProcessed: lineCount,
      validEntries: results.length
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
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Dates de début et fin requises' 
      });
    }

    // Récupérer les données de runtime pour la période
    const startData = await BoilerData.findOne({
      date: { $gte: new Date(startDate) }
    }).sort({ date: 1, time: 1 });

    const endData = await BoilerData.findOne({
      date: { $lte: new Date(endDate) }
    }).sort({ date: -1, time: -1 });

    if (!startData || !endData) {
      return res.status(404).json({ 
        error: 'Données insuffisantes pour la période' 
      });
    }

    // Calculer la différence de runtime
    const runtimeHours = endData.runtime - startData.runtime;
    
    // Calculer la consommation moyenne de modulation sur la période
    const periodData = await BoilerData.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: 99, // Chaudière en fonctionnement
          fanSpeed: { $gt: 0 } // Ventilateur en marche = combustion active
        }
      },
      {
        $group: {
          _id: null,
          avgModulation: { $avg: '$modulation' },
          count: { $sum: 1 },
          avgOutsideTemp: { $avg: '$outsideTemp' }
        }
      }
    ]);

    const avgModulation = periodData[0]?.avgModulation || 60; // Default 60%
    const avgOutsideTemp = periodData[0]?.avgOutsideTemp || 10;

    // Calculer la consommation de pellets
    const effectivePower = BOILER_CONFIG.nominalPower * (avgModulation / 100);
    const pelletConsumption = runtimeHours * effectivePower * BOILER_CONFIG.pelletsPerKWh;

    // Statistiques détaillées
    const stats = await BoilerData.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
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
      config: BOILER_CONFIG,
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
      BOILER_CONFIG.nominalPower * 
      0.6 * // Modulation moyenne estimée
      BOILER_CONFIG.pelletsPerKWh;

    res.json({
      stats: stats[0] || {},
      totalRuntimeHours,
      estimatedTotalConsumptionKg: Math.round(estimatedTotalConsumption),
      config: BOILER_CONFIG
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
exports.updateBoilerConfig = async (req, res) => {
  try {
    const { nominalPower, pelletsPerKWh } = req.body;
    
    if (nominalPower) {
      BOILER_CONFIG.nominalPower = parseFloat(nominalPower);
    }
    if (pelletsPerKWh) {
      BOILER_CONFIG.pelletsPerKWh = parseFloat(pelletsPerKWh);
    }

    res.json({
      success: true,
      config: BOILER_CONFIG
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
    const { enabled, sender, subject, maxResults, daysBack } = req.body;
    
    const updatedConfig = await autoImportService.updateGmailConfig({
      enabled: enabled !== undefined ? enabled : autoImportService.config.gmail?.enabled,
      sender: sender || autoImportService.config.gmail?.sender,
      subject: subject || autoImportService.config.gmail?.subject,
      maxResults: maxResults || autoImportService.config.gmail?.maxResults,
      daysBack: daysBack || autoImportService.config.gmail?.daysBack
    });
    
    res.json({
      success: true,
      message: 'Configuration Gmail mise à jour et sauvegardée',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Erreur mise à jour Gmail:', error);
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
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const frontendUrl = isProduction ? 'https://pelletsfun.harmonixe.fr' : 'http://localhost:8080';
    
    res.redirect(`${frontendUrl}/?gmail-auth=success`);
  } catch (error) {
    console.error('Erreur callback Gmail:', error);
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const frontendUrl = isProduction ? 'https://pelletsfun.harmonixe.fr' : 'http://localhost:8080';
    
    res.redirect(`${frontendUrl}/?gmail-auth=error`);
  }
};

// Traitement manuel des emails Gmail
exports.processGmailEmails = async (req, res) => {
  try {
    const result = await autoImportService.processGmailEmails();
    res.json(result);
  } catch (error) {
    console.error('Erreur traitement Gmail:', error);
    res.status(500).json({ error: error.message });
  }
};
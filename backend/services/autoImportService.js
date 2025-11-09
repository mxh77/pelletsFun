const chokidar = require('chokidar');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const BoilerData = require('../models/BoilerData');
const GmailConfig = require('../models/GmailConfig');
const GmailService = require('./gmailService');

class AutoImportService {
  constructor() {
    this.watchPaths = [];
    this.isWatching = false;
    this.gmailService = new GmailService();
    this.gmailInitialized = false;
    this.stats = {
      filesProcessed: 0,
      errors: 0,
      lastRun: null,
      totalFiles: 0,
      successfulFiles: 0
    };
    this.config = {
      autoImport: false,
      watchFolders: [],
      emailSettings: {
        enabled: false,
        downloadPath: path.join(process.cwd(), 'auto-downloads')
      },
      cronSchedule: '0 8 * * *', // Tous les jours à 8h
      filePattern: /touch_\d{8}\.csv$/i
    };
    
    // Créer le dossier de téléchargement automatique
    if (!fs.existsSync(this.config.emailSettings.downloadPath)) {
      fs.mkdirSync(this.config.emailSettings.downloadPath, { recursive: true });
    }
    
    // La configuration Gmail sera chargée depuis la base de données
    this.config.gmail = null;
  }

  // Charger la configuration Gmail depuis la base de données
  async loadGmailConfig() {
    try {
      const gmailConfig = await GmailConfig.getConfig();
      this.config.gmail = gmailConfig.toObject();
      return gmailConfig;
    } catch (error) {
      console.error('❌ Erreur chargement config Gmail:', error);
      // Configuration par défaut en cas d'erreur
      this.config.gmail = {
        enabled: false,
        senders: [''],
        subject: 'X128812'
      };
      return null;
    }
  }

  // Initialiser le service Gmail
  async initializeGmail() {
    try {
      console.log('🔧 Initialisation du service Gmail...');
      
      // Charger la configuration depuis la base
      await this.loadGmailConfig();
      
      const result = await this.gmailService.initialize();
      
      if (result.configured) {
        this.gmailInitialized = true;
        console.log('✅ Service Gmail prêt');
        return result;
      } else {
        console.log('⚠️ Service Gmail non configuré:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Erreur initialisation Gmail:', error);
      return { 
        configured: false, 
        error: error.message 
      };
    }
  }

  // Configurer Gmail et sauvegarder en base
  async updateGmailConfig(config) {
    try {
      // Mettre à jour en base de données
      const updatedConfig = await GmailConfig.updateConfig(config);
      
      // Mettre à jour la configuration locale
      this.config.gmail = updatedConfig.toObject();
      
      console.log('📧 Configuration Gmail mise à jour et sauvegardée:', this.config.gmail);
      return updatedConfig;
    } catch (error) {
      console.error('❌ Erreur mise à jour config Gmail:', error);
      throw error;
    }
  }

  // Traitement complet des emails Okofen
  async processGmailEmails(options = {}) {
    if (!this.gmailInitialized) {
      const initResult = await this.initializeGmail();
      if (!initResult.configured) {
        return {
          success: false,
          error: 'Service Gmail non configuré',
          details: initResult
        };
      }
    }

    try {
      console.log('📧 Récupération des emails Okofen depuis Gmail...');
      
      // Déterminer les paramètres de recherche
      let searchParams = {
        maxResults: this.config.gmail.maxResults // Toujours inclure maxResults
      };
      
      if (options.period && (options.period.dateFrom || options.period.dateTo)) {
        // Utiliser la période spécifiée
        searchParams.dateFrom = options.period.dateFrom;
        searchParams.dateTo = options.period.dateTo;
        console.log('🗓️ Recherche avec période personnalisée:', searchParams);
      } else {
        console.log('🗓️ Recherche sans période spécifiée');
      }
      
      // Ajouter les expéditeurs s'ils sont spécifiés
      if (options.senders && Array.isArray(options.senders) && options.senders.length > 0) {
        searchParams.sender = options.senders;
        console.log('📧 Expéditeurs spécifiés:', options.senders);
      } else if (this.config.gmail.senders && this.config.gmail.senders.length > 0 && this.config.gmail.senders[0] !== '') {
        searchParams.sender = this.config.gmail.senders;
        console.log('📧 Expéditrices par défaut:', this.config.gmail.senders);
      }
      
      // Lier le contexte pour éviter la perte de 'this'
      const autoImportService = this;
      const processCallback = async (filePath, metadata) => {
        try {
          console.log(`🔄 Traitement automatique: ${path.basename(filePath)}`);
          const result = await autoImportService.importCSVFile(filePath, path.basename(filePath));
          
          if (result.success) {
            console.log(`✅ Import réussi: ${result.validEntries} entrées`);
            
            // Archiver le fichier traité
            if (autoImportService.config.archiveProcessedFiles) {
              await autoImportService.archiveFile(filePath);
            }
            
            autoImportService.stats.filesProcessed++;
            autoImportService.stats.totalImported += result.validEntries;
            autoImportService.stats.lastProcessed = new Date();
          }
          
          return result;
        } catch (error) {
          console.error(`❌ Erreur traitement ${filePath}:`, error);
          autoImportService.stats.errors.push({
            file: path.basename(filePath),
            error: error.message,
            timestamp: new Date()
          });
          throw error;
        }
      };

      const gmailParams = {
        downloadPath: this.config.emailSettings.downloadPath,
        processCallback: processCallback,
        markAsProcessed: true,
        labelProcessed: 'Okofen-Traité',
        subject: this.config.gmail.subject,
        // Utiliser soit la période personnalisée, soit les paramètres par défaut
        ...searchParams
      };

      const result = await this.gmailService.processOkofenEmails(gmailParams);

      console.log(`📊 Traitement Gmail terminé: ${result.downloaded} téléchargés, ${result.processed} traités`);
      
      return {
        success: true,
        message: `${result.downloaded} fichiers téléchargés et ${result.processed} traités`,
        details: result
      };

    } catch (error) {
      console.error('❌ Erreur traitement emails Gmail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Démarrer la surveillance des dossiers
  startWatching() {
    if (this.isWatching) return;

    console.log('🔍 Démarrage de la surveillance automatique des fichiers CSV...');
    
    // Surveiller le dossier racine pour les nouveaux CSV
    const rootWatcher = chokidar.watch('*.csv', {
      cwd: process.cwd(),
      ignored: /(^|[\/\\])\../, // Ignorer les fichiers cachés
      persistent: true
    });

    // Surveiller le dossier de téléchargements auto
    const downloadWatcher = chokidar.watch('*.csv', {
      cwd: this.config.emailSettings.downloadPath,
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    // Gestionnaire d'événement pour nouveaux fichiers
    const handleNewFile = async (filePath, watchPath) => {
      try {
        const fullPath = path.resolve(watchPath, filePath);
        const filename = path.basename(fullPath);
        
        console.log(`📁 Nouveau fichier CSV détecté: ${filename}`);
        
        // Vérifier si c'est un fichier Okofen
        if (!this.config.filePattern.test(filename)) {
          console.log(`⚠️ Fichier ignoré (pattern non reconnu): ${filename}`);
          return;
        }

        // Attendre un peu pour s'assurer que le fichier est complètement écrit
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Importer le fichier
        const result = await this.importCSVFile(fullPath, filename);
        console.log(`✅ Import automatique réussi: ${result.message}`);

        // Optionnel: déplacer le fichier traité
        const processedDir = path.join(watchPath, 'processed');
        if (!fs.existsSync(processedDir)) {
          fs.mkdirSync(processedDir, { recursive: true });
        }
        
        const processedPath = path.join(processedDir, `${Date.now()}_${filename}`);
        fs.renameSync(fullPath, processedPath);
        console.log(`📦 Fichier archivé: ${processedPath}`);

      } catch (error) {
        console.error(`❌ Erreur import automatique ${filePath}:`, error);
      }
    };

    rootWatcher.on('add', (filePath) => handleNewFile(filePath, process.cwd()));
    downloadWatcher.on('add', (filePath) => handleNewFile(filePath, this.config.emailSettings.downloadPath));

    this.rootWatcher = rootWatcher;
    this.downloadWatcher = downloadWatcher;
    this.isWatching = true;

    console.log('✅ Surveillance active sur:');
    console.log(`   - Dossier racine: ${process.cwd()}`);
    console.log(`   - Dossier téléchargements: ${this.config.emailSettings.downloadPath}`);
  }

  // Arrêter la surveillance
  stopWatching() {
    if (!this.isWatching) return;

    console.log('🛑 Arrêt de la surveillance automatique...');
    
    if (this.rootWatcher) {
      this.rootWatcher.close();
      this.rootWatcher = null;
    }
    
    if (this.downloadWatcher) {
      this.downloadWatcher.close();
      this.downloadWatcher = null;
    }

    this.isWatching = false;
    console.log('✅ Surveillance arrêtée');
  }

  // Démarrer la tâche cron pour vérification périodique
  startCronJob() {
    if (this.cronJob) return;

    console.log(`⏰ Planification des vérifications automatiques: ${this.config.cronSchedule}`);
    
    this.cronJob = cron.schedule(this.config.cronSchedule, async () => {
      console.log('🕒 Vérification automatique programmée...');
      
      // Vérifier les fichiers locaux
      await this.checkForNewFiles();
      
      // Vérifier Gmail si configuré
      if (this.config.gmail.enabled) {
        console.log('📧 Vérification Gmail...');
        await this.processGmailEmails();
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.cronJob.start();
    console.log('✅ Tâche cron démarrée');
  }

  // Arrêter la tâche cron
  stopCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
      console.log('✅ Tâche cron arrêtée');
    }
  }

  // Vérifier manuellement les nouveaux fichiers
  async checkForNewFiles() {
    try {
      const folders = [
        process.cwd(),
        this.config.emailSettings.downloadPath
      ];

      for (const folder of folders) {
        if (!fs.existsSync(folder)) continue;

        const files = fs.readdirSync(folder)
          .filter(file => this.config.filePattern.test(file))
          .map(file => ({
            name: file,
            path: path.join(folder, file),
            mtime: fs.statSync(path.join(folder, file)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime); // Plus récent en premier

        console.log(`📂 Trouvé ${files.length} fichiers CSV dans ${folder}`);

        for (const file of files) {
          // Vérifier si le fichier n'a pas déjà été importé récemment
          const existingData = await BoilerData.findOne({ 
            filename: file.name 
          }).sort({ importDate: -1 });

          if (existingData && existingData.importDate > file.mtime) {
            console.log(`⚠️ Fichier déjà importé: ${file.name}`);
            continue;
          }

          console.log(`🔄 Import du fichier: ${file.name}`);
          await this.importCSVFile(file.path, file.name);
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification fichiers:', error);
    }
  }

  // Obtenir la configuration de pattern temporel depuis la base de données
  async getImportInterval() {
    try {
      const BoilerConfig = require('../models/BoilerConfig');
      let config = await BoilerConfig.findOne({ configType: 'main' });
      
      if (!config) {
        // Créer une configuration par défaut si elle n'existe pas
        config = new BoilerConfig({
          nominalPower: 15,
          pelletsPerKWh: 0.2,
          importInterval: 1,
          configType: 'main'
        });
        await config.save();
      }
      
      return config.importInterval;
    } catch (error) {
      console.error('❌ Erreur récupération intervalle:', error);
      return 1; // Valeur par défaut
    }
  }

  // Fonction pour filtrer les données selon l'intervalle configuré (même logique que le contrôleur)
  filterDataByInterval(data, intervalMinutes) {
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
    
    console.log(`📊 Filtrage temporel AutoImport: ${data.length} → ${filtered.length} entrées (intervalle: ${intervalMinutes}min)`);
    return filtered;
  }

  // Fonction d'import réutilisable
  async importCSVFile(filePath, filename) {
    const results = [];
    let lineCount = 0;

    // Obtenir l'intervalle de filtrage configuré depuis la base de données
    const importInterval = await this.getImportInterval();
    console.log(`📊 Pattern d'import configuré: toutes les ${importInterval} minute(s)`);

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'latin1' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineCount++;
          
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

            // Extraire le temps
            const timeString = (data['Zeit '] || data.Zeit)?.trim() || '';

            const boilerEntry = {
              date: date,
              time: timeString,
              outsideTemp: parseFloat((data['AT [°C]'] || data['AT [°C] '])?.replace(',', '.')) || 0,
              outsideTempActive: parseFloat((data['ATakt [°C]'] || data['ATakt [°C] '])?.replace(',', '.')) || 0,
              heatingFlowTemp: parseFloat((data['HK1 VL Ist[°C]'] || data['HK1 VL Ist[°C] '])?.replace(',', '.')) || 0,
              heatingFlowTempTarget: parseFloat((data['HK1 VL Soll[°C]'] || data['HK1 VL Soll[°C] '])?.replace(',', '.')) || 0,
              boilerTemp: parseFloat((data['PE1 KT[°C]'] || data['PE1 KT[°C] '])?.replace(',', '.')) || 0,
              boilerTempTarget: parseFloat((data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[°C] '])?.replace(',', '.')) || 0,
              modulation: parseFloat((data['PE1 Modulation[%]'] || data['PE1 Modulation[%] '])?.replace(',', '.')) || 0,
              fanSpeed: parseFloat((data['PE1 Luefterdrehzahl[%]'] || data['PE1 Luefterdrehzahl[%] '])?.replace(',', '.')) || 0,
              runtime: parseFloat((data['PE1 Runtime[h]'] || data['PE1 Runtime[h] '])?.replace(',', '.')) || 0,
              status: parseInt(data['PE1 Status'] || data['PE1 Status ']) || 0,
              hotWaterInTemp: parseFloat((data['WW1 EinT Ist[°C]'] || data['WW1 EinT Ist[°C] '])?.replace(',', '.')) || 0,
              hotWaterOutTemp: parseFloat((data['WW1 AusT Ist[°C]'] || data['WW1 AusT Ist[°C] '])?.replace(',', '.')) || 0,
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

    // Trier les données par date et heure avant filtrage
    results.sort((a, b) => {
      const timeA = new Date(a.date);
      const [hoursA, minutesA] = (a.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeA.setHours(hoursA, minutesA);
      
      const timeB = new Date(b.date);
      const [hoursB, minutesB] = (b.time || '00:00').split(':').map(n => parseInt(n) || 0);
      timeB.setHours(hoursB, minutesB);
      
      return timeA - timeB;
    });

    // Appliquer le filtrage temporel
    const filteredResults = this.filterDataByInterval(results, importInterval);

    // Supprimer les données existantes pour ce fichier
    await BoilerData.deleteMany({ filename });

    // Insérer les nouvelles données filtrées
    if (filteredResults.length > 0) {
      await BoilerData.insertMany(filteredResults);
    }

    console.log(`📈 Import terminé: ${lineCount} lignes lues, ${results.length} valides, ${filteredResults.length} conservées après filtrage`);

    return {
      success: true,
      message: `${filteredResults.length} entrées importées depuis ${filename} (intervalle: ${importInterval}min)`,
      linesProcessed: lineCount,
      validEntries: filteredResults.length,
      originalEntries: results.length,
      filteredEntries: results.length - filteredResults.length,
      importInterval: importInterval
    };
  }

  // Obtenir le statut du service
  getStatus() {
    return {
      isWatching: this.isWatching,
      cronActive: this.cronJob && this.cronJob.running,
      config: this.config,
      watchPaths: this.watchPaths
    };
  }

  // Mettre à jour la configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.autoImport && !this.isWatching) {
      this.startWatching();
      this.startCronJob();
    } else if (!newConfig.autoImport && this.isWatching) {
      this.stopWatching();
      this.stopCronJob();
    }
  }
}

// Instance singleton
const autoImportService = new AutoImportService();

module.exports = autoImportService;
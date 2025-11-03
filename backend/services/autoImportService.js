const chokidar = require('chokidar');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const BoilerData = require('../models/BoilerData');
const GmailService = require('./gmailService');

class AutoImportService {
  constructor() {
    this.watchPaths = [];
    this.isWatching = false;
    this.gmailService = new GmailService();
    this.gmailInitialized = false;
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
    
    // Configuration Gmail par défaut
    this.config.gmail = {
      enabled: false,
      sender: '',
      subject: 'okofen',
      maxResults: 10,
      daysBack: 7
    };
  }

  // Initialiser le service Gmail
  async initializeGmail() {
    try {
      console.log('🔧 Initialisation du service Gmail...');
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

  // Configurer Gmail
  updateGmailConfig(config) {
    this.config.gmail = { ...this.config.gmail, ...config };
    console.log('📧 Configuration Gmail mise à jour:', this.config.gmail);
  }

  // Traitement complet des emails Okofen
  async processGmailEmails() {
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
      
      const processCallback = async (filePath, metadata) => {
        try {
          console.log(`🔄 Traitement automatique: ${path.basename(filePath)}`);
          const result = await this.processCSVFile(filePath);
          
          if (result.success) {
            console.log(`✅ Import réussi: ${result.validEntries} entrées`);
            
            // Archiver le fichier traité
            if (this.config.archiveProcessedFiles) {
              await this.archiveFile(filePath);
            }
            
            this.stats.filesProcessed++;
            this.stats.totalImported += result.validEntries;
            this.stats.lastProcessed = new Date();
          }
          
          return result;
        } catch (error) {
          console.error(`❌ Erreur traitement ${filePath}:`, error);
          this.stats.errors.push({
            file: path.basename(filePath),
            error: error.message,
            timestamp: new Date()
          });
          throw error;
        }
      };

      const result = await this.gmailService.processOkofenEmails({
        downloadPath: this.config.emailSettings.downloadPath,
        processCallback: processCallback,
        markAsProcessed: true,
        labelProcessed: 'Okofen-Traité',
        sender: this.config.gmail.sender,
        subject: this.config.gmail.subject,
        maxResults: this.config.gmail.maxResults,
        daysBack: this.config.gmail.daysBack
      });

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

  // Fonction d'import réutilisable
  async importCSVFile(filePath, filename) {
    const results = [];
    let lineCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'latin1' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineCount++;
          
          try {
            const [day, month, year] = data.Datum?.split('.') || [];
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) return;

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

    return {
      success: true,
      message: `${results.length} entrées importées depuis ${filename}`,
      linesProcessed: lineCount,
      validEntries: results.length
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
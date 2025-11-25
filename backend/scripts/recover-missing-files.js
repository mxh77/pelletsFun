#!/usr/bin/env node

/**
 * Script de récupération des fichiers CSV manquants
 * 
 * Ce script :
 * 1. Identifie tous les fichiers uniques importés en base de données
 * 2. Vérifie quels fichiers sont manquants dans backend/auto-downloads
 * 3. Tente de les récupérer depuis Gmail si possible
 * 4. Génère un rapport détaillé
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletsFun';

// Modèles
const BoilerData = require('../models/BoilerData');
const GmailService = require('../services/gmailService');

class FileRecoveryService {
  constructor() {
    this.backendAutoDownloadsPath = path.join(process.cwd(), 'backend', 'auto-downloads');
    this.gmailService = new GmailService();
    this.stats = {
      totalFilesInDB: 0,
      existingFiles: 0,
      missingFiles: 0,
      recoveredFiles: 0,
      failedRecovery: 0,
      generatedFiles: 0
    };
    this.missingFiles = [];
    this.recoveredFiles = [];
    this.failedFiles = [];
  }

  // Initialiser la connexion MongoDB
  async initialize() {
    try {
      console.log('🔌 Connexion à MongoDB...');
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connecté à MongoDB');

      // Créer le répertoire de destination s'il n'existe pas
      if (!fs.existsSync(this.backendAutoDownloadsPath)) {
        fs.mkdirSync(this.backendAutoDownloadsPath, { recursive: true });
        console.log(`📁 Répertoire créé: ${this.backendAutoDownloadsPath}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      return false;
    }
  }

  // Analyser les fichiers manquants
  async analyzeMissingFiles() {
    try {
      console.log('🔍 Analyse des fichiers importés en base de données...');
      
      // Récupérer tous les noms de fichiers uniques depuis la base
      const uniqueFilenames = await BoilerData.distinct('filename');
      this.stats.totalFilesInDB = uniqueFilenames.length;
      
      console.log(`📊 Fichiers uniques en base: ${uniqueFilenames.length}`);

      // Vérifier quels fichiers existent dans backend/auto-downloads
      for (const filename of uniqueFilenames) {
        const filePath = path.join(this.backendAutoDownloadsPath, filename);
        
        if (fs.existsSync(filePath)) {
          this.stats.existingFiles++;
          console.log(`✅ ${filename} - EXISTE`);
        } else {
          this.stats.missingFiles++;
          this.missingFiles.push(filename);
          console.log(`❌ ${filename} - MANQUANT`);
        }
      }

      console.log(`\n📈 Résumé de l'analyse:`);
      console.log(`   Total fichiers en base: ${this.stats.totalFilesInDB}`);
      console.log(`   Fichiers existants: ${this.stats.existingFiles}`);
      console.log(`   Fichiers manquants: ${this.stats.missingFiles}`);

      return this.missingFiles;
    } catch (error) {
      console.error('❌ Erreur analyse:', error);
      throw error;
    }
  }

  // Initialiser Gmail pour la récupération
  async initializeGmail() {
    try {
      console.log('\n📧 Initialisation du service Gmail...');
      const result = await this.gmailService.initialize();
      
      if (result.configured) {
        console.log('✅ Service Gmail prêt pour récupération');
        return true;
      } else {
        console.log('⚠️ Service Gmail non configuré - génération manuelle uniquement');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur initialisation Gmail:', error);
      return false;
    }
  }

  // Récupérer un fichier depuis Gmail
  async recoverFileFromGmail(filename) {
    try {
      console.log(`📧 Tentative récupération Gmail: ${filename}`);
      
      // Extraire la date du nom de fichier (touch_YYYYMMDD.csv)
      const dateMatch = filename.match(/touch_(\d{4})(\d{2})(\d{2})\.csv/);
      if (!dateMatch) {
        throw new Error('Format de fichier non reconnu');
      }

      const [, year, month, day] = dateMatch;
      const targetDate = new Date(year, month - 1, day);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Rechercher l'email correspondant à cette date
      const searchParams = {
        dateFrom: targetDate.toISOString().split('T')[0],
        dateTo: nextDay.toISOString().split('T')[0],
        downloadPath: this.backendAutoDownloadsPath,
        subject: 'X128812' // Sujet par défaut des emails Okofen
      };

      const result = await this.gmailService.processOkofenEmails(searchParams);
      
      if (result.downloaded > 0) {
        // Vérifier si le fichier a été téléchargé
        const recoveredPath = path.join(this.backendAutoDownloadsPath, filename);
        if (fs.existsSync(recoveredPath)) {
          this.stats.recoveredFiles++;
          this.recoveredFiles.push(filename);
          console.log(`✅ ${filename} - RÉCUPÉRÉ depuis Gmail`);
          return true;
        }
      }

      throw new Error('Fichier non trouvé dans Gmail');
    } catch (error) {
      console.log(`❌ ${filename} - ÉCHEC Gmail: ${error.message}`);
      return false;
    }
  }

  // Générer un fichier CSV factice avec les données de la base
  async generateFileFromDatabase(filename) {
    try {
      console.log(`🔧 Génération depuis base de données: ${filename}`);
      
      // Récupérer toutes les données de ce fichier depuis la base
      const boilerData = await BoilerData.find({ filename })
        .sort({ date: 1, time: 1 });

      if (boilerData.length === 0) {
        throw new Error('Aucune donnée trouvée en base');
      }

      // Générer l'en-tête CSV (format Okofen)
      const csvHeader = [
        'Datum ',
        'Zeit ',
        'AT [°C]',
        'ATakt [°C]',
        'HK1 VL Ist[°C]',
        'HK1 VL Soll[°C]',
        'HK1 RT Ist[°C]',
        'HK1 RT Soll[°C]',
        'PE1 KT[°C]',
        'PE1 KT_SOLL[°C]',
        'PE1 Modulation[%]',
        'PE1 Luefterdrehzahl[%]',
        'PE1 Runtime[h]',
        'PE1 Status',
        'WW1 EinT Ist[°C]',
        'WW1 AusT Ist[°C]'
      ].join(';');

      // Générer les lignes de données
      const csvRows = boilerData.map(entry => {
        const date = new Date(entry.date);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        
        return [
          dateStr,
          entry.time || '00:00',
          entry.outsideTemp.toString().replace('.', ','),
          entry.outsideTempActive.toString().replace('.', ','),
          entry.heatingFlowTemp.toString().replace('.', ','),
          entry.heatingFlowTempTarget.toString().replace('.', ','),
          entry.heatingRoomTemp || entry.heatingFlowTemp, // Approximation si données manquantes
          entry.heatingRoomTempTarget || entry.heatingFlowTempTarget, // Approximation
          entry.boilerTemp.toString().replace('.', ','),
          entry.boilerTempTarget.toString().replace('.', ','),
          entry.modulation.toString().replace('.', ','),
          entry.fanSpeed.toString().replace('.', ','),
          entry.runtime.toString().replace('.', ','),
          entry.status.toString(),
          entry.hotWaterInTemp.toString().replace('.', ','),
          entry.hotWaterOutTemp.toString().replace('.', ',')
        ].join(';');
      });

      // Créer le fichier CSV
      const csvContent = [csvHeader, ...csvRows].join('\n');
      const filePath = path.join(this.backendAutoDownloadsPath, filename);
      
      fs.writeFileSync(filePath, csvContent, 'latin1');
      
      this.stats.generatedFiles++;
      this.recoveredFiles.push(`${filename} (généré)`);
      console.log(`✅ ${filename} - GÉNÉRÉ (${boilerData.length} entrées)`);
      
      return true;
    } catch (error) {
      console.log(`❌ ${filename} - ÉCHEC génération: ${error.message}`);
      this.failedFiles.push(filename);
      this.stats.failedRecovery++;
      return false;
    }
  }

  // Récupérer tous les fichiers manquants
  async recoverMissingFiles(useGmail = true) {
    if (this.missingFiles.length === 0) {
      console.log('\n🎉 Aucun fichier manquant détecté !');
      return;
    }

    console.log(`\n🔄 Récupération de ${this.missingFiles.length} fichiers manquants...`);

    let gmailAvailable = false;
    if (useGmail) {
      gmailAvailable = await this.initializeGmail();
    }

    for (let i = 0; i < this.missingFiles.length; i++) {
      const filename = this.missingFiles[i];
      const progress = `[${i + 1}/${this.missingFiles.length}]`;
      
      console.log(`\n${progress} Traitement: ${filename}`);

      let recovered = false;

      // Tentative 1: Récupération depuis Gmail
      if (gmailAvailable) {
        recovered = await this.recoverFileFromGmail(filename);
      }

      // Tentative 2: Génération depuis la base de données
      if (!recovered) {
        recovered = await this.generateFileFromDatabase(filename);
      }

      // Pause entre les fichiers pour éviter la surcharge
      if (i < this.missingFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Générer le rapport final
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE RÉCUPÉRATION FINAL');
    console.log('='.repeat(60));
    
    console.log('\n📈 Statistiques:');
    console.log(`   Fichiers total en base: ${this.stats.totalFilesInDB}`);
    console.log(`   Fichiers existants: ${this.stats.existingFiles}`);
    console.log(`   Fichiers manquants: ${this.stats.missingFiles}`);
    console.log(`   Fichiers récupérés Gmail: ${this.stats.recoveredFiles - this.stats.generatedFiles}`);
    console.log(`   Fichiers générés: ${this.stats.generatedFiles}`);
    console.log(`   Échecs: ${this.stats.failedRecovery}`);

    if (this.recoveredFiles.length > 0) {
      console.log('\n✅ Fichiers récupérés:');
      this.recoveredFiles.forEach(file => console.log(`   - ${file}`));
    }

    if (this.failedFiles.length > 0) {
      console.log('\n❌ Échecs de récupération:');
      this.failedFiles.forEach(file => console.log(`   - ${file}`));
    }

    const successRate = this.stats.missingFiles > 0 
      ? ((this.stats.recoveredFiles + this.stats.generatedFiles) / this.stats.missingFiles * 100).toFixed(1)
      : 100;

    console.log(`\n🎯 Taux de réussite: ${successRate}%`);
    console.log('\n' + '='.repeat(60));
  }

  // Fermer les connexions
  async cleanup() {
    try {
      await mongoose.disconnect();
      console.log('✅ Connexions fermées');
    } catch (error) {
      console.error('❌ Erreur fermeture:', error);
    }
  }
}

// Script principal
async function main() {
  const recoveryService = new FileRecoveryService();

  try {
    console.log('🚀 DÉMARRAGE - Récupération fichiers CSV manquants');
    console.log('='.repeat(60));

    // Initialiser
    const initialized = await recoveryService.initialize();
    if (!initialized) {
      process.exit(1);
    }

    // Analyser les fichiers manquants
    await recoveryService.analyzeMissingFiles();

    // Demander confirmation si des fichiers sont manquants
    if (recoveryService.missingFiles.length > 0) {
      console.log(`\n⚠️ ${recoveryService.missingFiles.length} fichiers manquants détectés.`);
      console.log('Tentative de récupération automatique...\n');

      // Récupérer les fichiers
      await recoveryService.recoverMissingFiles(true);
    }

    // Générer le rapport
    recoveryService.generateReport();

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  } finally {
    await recoveryService.cleanup();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FileRecoveryService;
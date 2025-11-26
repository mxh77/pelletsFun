#!/usr/bin/env node

/**
 * Script de récupération d'un fichier CSV spécifique
 * Usage: node recover-single-file.js YYYYMMDD
 * Exemple: node recover-single-file.js 20251109
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletsFun';
const BoilerData = require('../models/BoilerData');
const GmailService = require('../services/gmailService');

async function recoverSingleFile(dateStr) {
  if (!dateStr || !dateStr.match(/^\d{8}$/)) {
    console.error('❌ Format de date invalide. Utilisez: YYYYMMDD (ex: 20251109)');
    process.exit(1);
  }

  const filename = `touch_${dateStr}.csv`;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const targetDate = `${year}-${month}-${day}`;

  console.log(`🎯 RÉCUPÉRATION FICHIER SPÉCIFIQUE: ${filename}`);
  console.log(`📅 Date cible: ${targetDate}`);
  console.log('='.repeat(50));

  try {
    // Connexion MongoDB
    console.log('🔌 Connexion MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Vérifier les données en base pour cette date
    const dataCount = await BoilerData.countDocuments({ filename });
    console.log(`📊 Données en base pour ${filename}: ${dataCount} entrées`);

    // Chemin du fichier de destination
    const backendAutoDownloadsPath = path.join(process.cwd(), 'auto-downloads');
    const filePath = path.join(backendAutoDownloadsPath, filename);

    // Vérifier si le fichier existe déjà
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ Fichier déjà présent: ${filename} (${stats.size} bytes)`);
      await mongoose.disconnect();
      return;
    }

    console.log(`❌ Fichier absent: ${filename}`);

    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(backendAutoDownloadsPath)) {
      fs.mkdirSync(backendAutoDownloadsPath, { recursive: true });
      console.log(`📁 Répertoire créé: ${backendAutoDownloadsPath}`);
    }

    // Étape 1: Tentative récupération Gmail
    console.log('\n📧 ÉTAPE 1: Récupération depuis Gmail...');
    
    const gmailService = new GmailService();
    const gmailResult = await gmailService.initialize();
    
    if (gmailResult.configured) {
      console.log('✅ Service Gmail initialisé');
      
      // Les emails arrivent généralement le lendemain matin (ex: données du 09/11 → email du 10/11)
      // Recherche sur 3 jours pour être sûr de trouver l'email
      const searchDateFrom = new Date(year, month - 1, parseInt(day));
      const searchDateTo = new Date(year, month - 1, parseInt(day) + 3);
      const searchFromStr = searchDateFrom.toISOString().split('T')[0];
      const searchToStr = searchDateTo.toISOString().split('T')[0];
      
      console.log(`🔍 Recherche email avec données du ${targetDate} (recherche du ${searchFromStr} au ${searchToStr})...`);
      
      const searchParams = {
        dateFrom: searchFromStr,
        dateTo: searchToStr,
        downloadPath: backendAutoDownloadsPath,
        subject: 'X128812',
        markAsProcessed: false,
        overwriteExisting: true,  // Forcer le re-téléchargement même si déjà traité
        processCallback: null
      };

      const emailResult = await gmailService.processOkofenEmails(searchParams);
      console.log(`📧 Résultat Gmail: ${emailResult.downloaded} fichier(s) téléchargé(s)`);

      // Vérifier si le fichier a été récupéré
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ SUCCÈS Gmail: ${filename} récupéré (${stats.size} bytes)`);
        await mongoose.disconnect();
        return;
      }
    } else {
      console.log('❌ ERREUR: Service Gmail NON configuré - récupération impossible');
      console.log('🚫 REFUS ABSOLU de générer depuis la base de données');
      console.log('🔧 Solutions:');
      console.log('   1. Utiliser le serveur production (Gmail configuré)');
      console.log('   2. Reconfigurer Gmail en local');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Le fichier n'a pas été récupéré depuis Gmail
    console.log('\n❌ ÉCHEC RÉCUPÉRATION GMAIL');
    console.log('🚫 REFUS CATÉGORIQUE de générer depuis base de données');
    console.log('📧 Le fichier DOIT être récupéré depuis Gmail uniquement');
    await mongoose.disconnect();
    process.exit(1);

    // CE CODE A ÉTÉ SUPPRIMÉ VOLONTAIREMENT
    // RÉCUPÉRATION GMAIL UNIQUEMENT !

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Script principal
const dateArg = process.argv[2];
if (!dateArg) {
  console.log('Usage: node recover-single-file.js YYYYMMDD');
  console.log('Exemple: node recover-single-file.js 20251109');
  process.exit(1);
}

recoverSingleFile(dateArg);
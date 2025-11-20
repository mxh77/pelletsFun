#!/usr/bin/env node

/**
 * Script de mise à jour pour ajouter les champs cronSchedule et cronEnabled
 * aux configurations BoilerConfig existantes
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: '../.env' });

const BoilerConfig = require('../models/BoilerConfig');

async function updateCronConfig() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Vérifier s'il existe déjà une configuration
    let config = await BoilerConfig.findOne({ configType: 'main' });

    if (config) {
      console.log('📋 Configuration existante trouvée');
      
      // Vérifier si les nouveaux champs existent déjà
      if (config.cronSchedule === undefined || config.cronEnabled === undefined) {
        console.log('🔧 Mise à jour des champs cron...');
        
        config.cronSchedule = config.cronSchedule || '0 8 * * *';
        config.cronEnabled = config.cronEnabled !== undefined ? config.cronEnabled : false;
        
        await config.save();
        console.log('✅ Configuration mise à jour avec les champs cron');
        console.log(`   - cronSchedule: ${config.cronSchedule}`);
        console.log(`   - cronEnabled: ${config.cronEnabled}`);
      } else {
        console.log('ℹ️ Les champs cron existent déjà');
        console.log(`   - cronSchedule: ${config.cronSchedule}`);
        console.log(`   - cronEnabled: ${config.cronEnabled}`);
      }
    } else {
      console.log('🆕 Création d\'une nouvelle configuration par défaut...');
      
      config = new BoilerConfig({
        nominalPower: 15,
        pelletsPerKWh: 0.2,
        importInterval: 1,
        cronSchedule: '0 8 * * *',
        cronEnabled: false,
        configType: 'main'
      });
      
      await config.save();
      console.log('✅ Configuration par défaut créée');
    }

    console.log('🎉 Mise à jour terminée avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
    process.exit(0);
  }
}

// Exécuter le script
updateCronConfig();
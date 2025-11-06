const express = require('express');
const router = express.Router();
const boilerController = require('../controllers/boilerController');

// Import CSV de données chaudière (fichier local)
router.post('/import', boilerController.importBoilerCSV);

// Upload et import CSV
router.post('/upload', boilerController.uploadCSV, boilerController.importUploadedCSV);

// Calculer la consommation entre deux dates
router.get('/consumption', boilerController.calculateConsumption);

// Statistiques générales des données chaudière
router.get('/stats', boilerController.getBoilerStats);

// Mettre à jour la configuration de la chaudière
router.put('/config', boilerController.updateBoilerConfig);

// Auto-import service
router.get('/auto-import/status', boilerController.getAutoImportStatus);
router.post('/auto-import/toggle', boilerController.toggleAutoImport);
router.post('/auto-import/check', boilerController.checkForNewFiles);

// Routes Gmail
router.get('/gmail/config', boilerController.getGmailConfig);
router.post('/gmail/config', boilerController.updateGmailConfig);
router.get('/gmail/auth', boilerController.getGmailAuthUrl);
router.get('/gmail/callback', boilerController.handleGmailAuthCallback);
router.post('/gmail/process', boilerController.processGmailEmails);

// Routes Traitement Automatique Quotidien
router.get('/cron/status', boilerController.getCronStatus);
router.post('/cron/schedule', boilerController.updateCronSchedule);
router.post('/cron/start', boilerController.startCronJob);
router.post('/cron/stop', boilerController.stopCronJob);

module.exports = router;
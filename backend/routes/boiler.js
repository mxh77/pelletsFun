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

// Configuration de la chaudière
router.get('/config', boilerController.getBoilerConfig);
router.put('/config', boilerController.updateBoilerConfig);

// Auto-import service
router.get('/auto-import/status', boilerController.getAutoImportStatus);
router.post('/auto-import/toggle', boilerController.toggleAutoImport);
router.post('/auto-import/check', boilerController.checkForNewFiles);

// Routes Gmail
router.get('/gmail/config', boilerController.getGmailConfig);
router.post('/gmail/config', boilerController.updateGmailConfig);
router.put('/gmail/config', boilerController.updateGmailConfig);
router.get('/gmail/auth', boilerController.getGmailAuthUrl);
router.get('/gmail/callback', boilerController.handleGmailAuthCallback);
router.post('/gmail/process', boilerController.processGmailEmails);

// Routes Traitement Automatique Quotidien
router.get('/cron/status', boilerController.getCronStatus);
router.post('/cron/schedule', boilerController.updateCronSchedule);
router.post('/cron/start', boilerController.startCronJob);
router.post('/cron/stop', boilerController.stopCronJob);

// Import manuel
router.post('/import/manual-trigger', boilerController.triggerManualImport);
router.get('/import/status', boilerController.getImportStatus);

// Gestion des tâches asynchrones
router.get('/tasks/active', boilerController.getActiveTasks);
router.get('/tasks/:taskId/status', boilerController.getTaskStatus);
router.get('/tasks/:taskId/logs', boilerController.getTaskLogs);

// Historique des imports
router.get('/import-history', boilerController.getImportHistory);
router.delete('/import/:filename', boilerController.deleteImport);

// Visualisation du contenu d'un fichier CSV
router.get('/file-content/:filename', boilerController.getFileContent);

// Données de température pour graphique
router.get('/temperature-data/:filename', boilerController.getTemperatureData);

module.exports = router;
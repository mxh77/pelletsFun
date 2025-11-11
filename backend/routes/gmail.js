// routes/gmail.js
const express = require('express');
const router = express.Router();
const GmailService = require('../services/gmailService');

// Route pour traitement manuel des emails Okofen
router.post('/process-okofen', async (req, res) => {
  try {
    const { dateFrom, dateTo, sender } = req.body;
    
    const gmailService = new GmailService();
    await gmailService.initializeAuth();
    
    // Processus de traitement avec callback pour l'import
    const result = await gmailService.processOkofenEmails({
      dateFrom,
      dateTo,
      sender,
      downloadPath: require('path').join(process.cwd(), 'backend', 'auto-downloads'),
      processCallback: async (filePath, context) => {
        // Import automatique du fichier CSV
        const importService = require('../services/importService');
        if (importService && typeof importService.importCsvFile === 'function') {
          try {
            await importService.importCsvFile(filePath);
            console.log(`📊 Import CSV réussi: ${context.attachment.filename}`);
          } catch (importError) {
            console.error(`❌ Erreur import CSV ${context.attachment.filename}:`, importError.message);
          }
        }
      },
      markAsProcessed: true,
      labelProcessed: 'PelletsFun-Processed'
    });

    // Nettoyer les anciens enregistrements en arrière-plan
    gmailService.cleanupOldProcessedEmails().catch(err => 
      console.error('Erreur nettoyage:', err.message)
    );

    res.json({
      success: true,
      message: `Traitement terminé: ${result.downloaded} fichiers téléchargés, ${result.processed} traités`,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur traitement Gmail:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement des emails',
      error: error.message
    });
  }
});

// Route pour obtenir les statistiques de traitement
router.get('/stats', async (req, res) => {
  try {
    const gmailService = new GmailService();
    const stats = await gmailService.getProcessingStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur statistiques Gmail:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// Route pour nettoyer les anciens enregistrements
router.post('/cleanup', async (req, res) => {
  try {
    const gmailService = new GmailService();
    const deletedCount = await gmailService.cleanupOldProcessedEmails();
    
    res.json({
      success: true,
      message: `Nettoyage terminé: ${deletedCount} enregistrements supprimés`,
      deletedCount
    });

  } catch (error) {
    console.error('❌ Erreur nettoyage Gmail:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage',
      error: error.message
    });
  }
});

// Route pour tester la connexion Gmail
router.get('/test-connection', async (req, res) => {
  try {
    const gmailService = new GmailService();
    await gmailService.initializeAuth();
    
    // Test basique : récupérer le profil utilisateur
    const profile = await gmailService.gmail.users.getProfile({ userId: 'me' });
    
    res.json({
      success: true,
      message: 'Connexion Gmail active',
      email: profile.data.emailAddress,
      messagesTotal: profile.data.messagesTotal
    });

  } catch (error) {
    console.error('❌ Erreur test connexion Gmail:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion Gmail',
      error: error.message
    });
  }
});

module.exports = router;
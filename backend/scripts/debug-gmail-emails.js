const mongoose = require('mongoose');
const GmailService = require('../services/gmailService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

async function debugGmailEmails() {
  console.log('🔍 DIAGNOSTIC EMAILS GMAIL');
  console.log('='.repeat(50));

  try {
    // Connexion MongoDB
    console.log('🔌 Connexion MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Initialisation Gmail
    console.log('\n📧 ÉTAPE 1: Initialisation Gmail...');
    const gmailService = new GmailService();
    const gmailResult = await gmailService.initialize();
    
    if (!gmailResult.configured) {
      console.log('❌ ERREUR: Service Gmail NON configuré');
      process.exit(1);
    }
    console.log('✅ Service Gmail initialisé');

    // Recherche large des emails récents
    console.log('\n📅 ÉTAPE 2: Recherche emails récents...');
    
    const searchParams = {
      dateFrom: '2025-11-07',
      dateTo: '2025-11-12',
      sender: 'no-reply@my.oekofen.info',
      subject: 'X128812',
      markAsProcessed: false,
      debugMode: true
    };

    console.log('🔍 Paramètres de recherche:', searchParams);
    
    // Appel direct à la méthode Gmail avec debug
    const gmail = gmailService.gmail;
    
    // Construire la requête de recherche
    let query = `from:${searchParams.sender} subject:${searchParams.subject}`;
    if (searchParams.dateFrom && searchParams.dateTo) {
      const fromFormatted = searchParams.dateFrom.replace(/-/g, '/');
      const toFormatted = searchParams.dateTo.replace(/-/g, '/');
      query += ` after:${fromFormatted} before:${toFormatted}`;
    }
    
    console.log(`🔍 Requête Gmail: "${query}"`);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20
    });

    if (!response.data.messages) {
      console.log('❌ Aucun email trouvé');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n📧 ${response.data.messages.length} email(s) trouvé(s):`);
    
    // Détails de chaque email
    for (let i = 0; i < response.data.messages.length; i++) {
      const message = response.data.messages[i];
      
      try {
        const emailDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Date', 'Subject', 'From']
        });

        const headers = emailDetail.data.payload.headers;
        const date = headers.find(h => h.name === 'Date')?.value || 'Date inconnue';
        const subject = headers.find(h => h.name === 'Subject')?.value || 'Sujet inconnu';
        const from = headers.find(h => h.name === 'From')?.value || 'Expéditeur inconnu';

        console.log(`\n📧 Email ${i+1}:`);
        console.log(`   📅 Date: ${date}`);
        console.log(`   📝 Sujet: ${subject}`);
        console.log(`   👤 De: ${from}`);
        console.log(`   🆔 ID: ${message.id}`);

        // Vérifier s'il y a des pièces jointes
        if (emailDetail.data.payload.parts) {
          const attachments = emailDetail.data.payload.parts.filter(part => 
            part.filename && part.filename.includes('.csv')
          );
          if (attachments.length > 0) {
            console.log(`   📎 Pièces jointes CSV: ${attachments.map(a => a.filename).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`   ❌ Erreur détails email: ${err.message}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Diagnostic terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Point d'entrée
if (require.main === module) {
  debugGmailEmails();
}
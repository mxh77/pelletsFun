const mongoose = require('mongoose');
const GmailService = require('../services/gmailService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function testGmailSearch() {
  try {
    // Connexion MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connecté\n');

    // Initialiser Gmail
    const gmailService = new GmailService();
    const credentialsPath = path.join(process.cwd(), 'config', 'gmail-credentials.json');
    const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
    await gmailService.initialize(credentialsPath, tokenPath);
    console.log('✅ Gmail initialisé\n');

    // Test 1: Recherche sans filtre de sujet
    console.log('🔍 TEST 1: Recherche emails avec CSV (sans filtre sujet)');
    const result1 = await gmailService.searchOkofenEmails({
      subject: '',
      dateFrom: '2025-11-20',
      dateTo: '2025-11-30'
    });
    console.log(`Résultat: ${result1.totalFound} emails trouvés`);
    if (result1.emails.length > 0) {
      console.log('Premier email:');
      console.log(`  - Sujet: ${result1.emails[0].subject}`);
      console.log(`  - De: ${result1.emails[0].from}`);
      console.log(`  - Date: ${result1.emails[0].date}`);
      console.log(`  - Pièces jointes: ${result1.emails[0].attachments.map(a => a.filename).join(', ')}`);
    }

    // Test 2: Recherche avec sujet "okofen"
    console.log('\n🔍 TEST 2: Recherche emails avec sujet "okofen"');
    const result2 = await gmailService.searchOkofenEmails({
      subject: 'okofen',
      dateFrom: '2025-11-20',
      dateTo: '2025-11-30'
    });
    console.log(`Résultat: ${result2.totalFound} emails trouvés`);

    // Test 3: Recherche très large (derniers 30 jours)
    console.log('\n🔍 TEST 3: Recherche emails derniers 30 jours (sans filtre)');
    const result3 = await gmailService.searchOkofenEmails({
      subject: '',
      dateFrom: '2025-10-27',
      dateTo: '2025-11-30'
    });
    console.log(`Résultat: ${result3.totalFound} emails trouvés`);
    if (result3.emails.length > 0) {
      console.log('\nDerniers emails trouvés:');
      result3.emails.slice(0, 5).forEach((email, i) => {
        console.log(`\n${i + 1}. Sujet: ${email.subject}`);
        console.log(`   De: ${email.from}`);
        console.log(`   Date: ${email.date}`);
        console.log(`   Pièces jointes: ${email.attachments.map(a => a.filename).join(', ')}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Test terminé');
  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testGmailSearch();

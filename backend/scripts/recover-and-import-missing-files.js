const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const BoilerData = require('../models/BoilerData');
const GmailService = require('../services/gmailService');
const GmailConfig = require('../models/GmailConfig');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;

// Détecter si on est dans backend/ ou à la racine
const isInBackend = process.cwd().endsWith('backend');
const BASE_DIR = isInBackend ? process.cwd() : path.join(process.cwd(), 'backend');
const AUTO_DOWNLOADS_DIR = path.join(BASE_DIR, 'auto-downloads');

// Fonction pour générer la liste des dates manquantes
function generateDateRange(startDate, endDate = new Date()) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Le fichier du jour J est généré le lendemain (J+1)
    // Donc on s'arrête à J-1 (hier)
    end.setDate(end.getDate() - 1);
    
    while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10).replace(/-/g, '');
        dates.push(dateStr);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// Fonction pour vérifier si un fichier existe
function fileExists(filename) {
    const filePath = path.join(AUTO_DOWNLOADS_DIR, filename);
    return fs.existsSync(filePath);
}

// Fonction pour vérifier si des données existent en base pour une date
async function dataExistsInDB(dateStr) {
    try {
        // Convertir dateStr (YYYYMMDD) en date UTC
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        
        // Créer les dates en UTC pour éviter les problèmes de timezone
        const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        const endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
        
        const count = await BoilerData.countDocuments({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        return count > 0;
    } catch (error) {
        console.error(`Erreur lors de la vérification des données pour ${dateStr}:`, error);
        return false;
    }
}

// Fonction pour identifier les fichiers manquants
async function identifyMissingFiles(startDate) {
    console.log(`\n🔍 Identification des fichiers manquants depuis le ${startDate}...`);
    
    const dates = generateDateRange(startDate);
    const missingFiles = [];
    
    for (const dateStr of dates) {
        const filename = `touch_${dateStr}.csv`;
        const fileExists = fs.existsSync(path.join(AUTO_DOWNLOADS_DIR, filename));
        const dataExists = await dataExistsInDB(dateStr);
        
        if (!fileExists || !dataExists) {
            missingFiles.push({
                date: dateStr,
                filename: filename,
                fileExists: fileExists,
                dataExists: dataExists,
                status: !fileExists ? 'FICHIER_MANQUANT' : 'DONNEES_MANQUANTES'
            });
        }
    }
    
    return missingFiles;
}

// Fonction pour récupérer un fichier depuis Gmail
async function recoverFileFromGmail(gmailService, filename, targetDate, gmailConfig) {
    console.log(`📧 Récupération du fichier ${filename} depuis Gmail...`);
    
    try {
        // Créer une fenêtre de recherche élargie (± 3 jours)
        const baseDate = new Date(
            parseInt(targetDate.substring(0, 4)),
            parseInt(targetDate.substring(4, 6)) - 1,
            parseInt(targetDate.substring(6, 8))
        );
        
        const startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() - 3);
        
        const endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + 3);

        // Utiliser searchOkofenEmails avec les options de date ET les senders de la config
        const searchOptions = {
            dateFrom: startDate.toISOString().split('T')[0],
            dateTo: endDate.toISOString().split('T')[0],
            overwriteExisting: true  // Forcer le re-téléchargement même si déjà traité
        };
        
        // Ajouter le sujet seulement s'il est défini et non vide
        if (gmailConfig.subject && gmailConfig.subject.trim()) {
            searchOptions.subject = gmailConfig.subject;
        } else {
            // Pas de filtre de sujet, chercher tous les CSV
            searchOptions.subject = '';
        }
        
        // Ajouter les senders si définis
        if (gmailConfig.senders && gmailConfig.senders.length > 0) {
            searchOptions.sender = gmailConfig.senders;
            console.log(`📨 Filtrage par expéditeurs: ${gmailConfig.senders.join(', ')}`);
        }
        
        const result = await gmailService.searchOkofenEmails(searchOptions);

        if (!result || !result.emails || result.emails.length === 0) {
            console.log(`❌ Aucun email trouvé pour ${filename}`);
            return false;
        }

        // Rechercher le fichier dans les emails
        for (const emailDetails of result.emails) {
            
            if (emailDetails.attachments) {
                for (const attachment of emailDetails.attachments) {
                    if (attachment.filename === filename) {
                        console.log(`✅ Fichier ${filename} trouvé dans l'email !`);
                        
                        // Créer le dossier si nécessaire
                        if (!fs.existsSync(AUTO_DOWNLOADS_DIR)) {
                            fs.mkdirSync(AUTO_DOWNLOADS_DIR, { recursive: true });
                        }
                        
                        // Télécharger le fichier
                        const result = await gmailService.downloadAttachment(
                            emailDetails.id, 
                            attachment.attachmentId,
                            filename,
                            AUTO_DOWNLOADS_DIR
                        );
                        
                        if (result && result.success) {
                            console.log(`💾 Fichier sauvegardé : ${result.filePath}`);
                            console.log(`📊 Taille du fichier : ${result.size} bytes`);
                            return true;
                        } else {
                            console.log(`❌ Échec du téléchargement de ${filename}`);
                            return false;
                        }
                    }
                }
            }
        }

        console.log(`❌ Fichier ${filename} non trouvé dans les emails`);
        return false;
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération de ${filename}:`, error.message);
        return false;
    }
}

// Fonction pour importer un fichier CSV en base de données
async function importFileToDatabase(filename) {
    console.log(`📊 Import du fichier ${filename} en base de données...`);
    
    const filePath = path.join(AUTO_DOWNLOADS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Fichier ${filePath} non trouvé`);
        return false;
    }

    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream(filePath)
            .pipe(csv({
                separator: ';',
                skipLines: 0
            }))
            .on('data', (data) => {
                try {
                    // Parser la date et l'heure
                    const dateTime = data['Datum/Zeit'];
                    if (!dateTime) return;

                    const [datePart, timePart] = dateTime.split(' ');
                    if (!datePart || !timePart) return;

                    const [day, month, year] = datePart.split('.');
                    const timestamp = new Date(`${year}-${month}-${day}T${timePart}`);
                    
                    if (isNaN(timestamp.getTime())) return;

                    // Utiliser les noms de colonnes avec espaces (comme dans import-single-file.js)
                    const aussentemperatur = parseFloat((data['AT [°C]'] || data['AT [□C]'])?.replace(',', '.'));
                    const pe1_kesseltemperatur = parseFloat((data['PE1 KT[°C]'] || data['PE1 KT[□C]'])?.replace(',', '.'));
                    const pe1_sollwert = parseFloat((data['PE1 SW[°C]'] || data['PE1 SW[□C]'])?.replace(',', '.'));

                    if (isNaN(aussentemperatur) || isNaN(pe1_kesseltemperatur) || isNaN(pe1_sollwert)) {
                        return;
                    }

                    results.push({
                        timestamp: timestamp,
                        aussentemperatur: aussentemperatur,
                        pe1_kesseltemperatur: pe1_kesseltemperatur,
                        pe1_sollwert: pe1_sollwert,
                        filename: filename
                    });
                } catch (error) {
                    console.warn('Ligne ignorée:', error.message);
                }
            })
            .on('end', async () => {
                try {
                    if (results.length === 0) {
                        console.log('❌ Aucune donnée valide trouvée dans le fichier');
                        resolve(false);
                        return;
                    }

                    console.log(`📝 Insertion de ${results.length} entrées en base de données...`);

                    // Supprimer les données existantes pour éviter les doublons
                    if (results.length > 0) {
                        const firstTimestamp = results[0].timestamp;
                        const lastTimestamp = results[results.length - 1].timestamp;
                        
                        await BoilerData.deleteMany({
                            timestamp: {
                                $gte: firstTimestamp,
                                $lte: lastTimestamp
                            }
                        });
                    }

                    // Insérer les nouvelles données
                    await BoilerData.insertMany(results);
                    console.log(`✅ ${results.length} entrées insérées avec succès`);
                    resolve(true);
                } catch (error) {
                    console.error('❌ Erreur lors de l\'insertion:', error);
                    reject(error);
                }
            })
            .on('error', (error) => {
                console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
                reject(error);
            });
    });
}

// Fonction principale
async function main() {
    console.log('🚀 Script de récupération et import des fichiers manquants');
    console.log('===========================================================\n');
    
    // Vérifier les arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('❌ Usage: node recover-and-import-missing-files.js <date-debut> [options]');
        console.log('   date-debut: Format YYYY-MM-DD (ex: 2025-11-01)');
        console.log('   Options:');
        console.log('     --dry-run    : Afficher seulement les fichiers manquants sans les récupérer');
        console.log('     --skip-gmail : Ne pas essayer de récupérer depuis Gmail, importer seulement les fichiers existants');
        process.exit(1);
    }

    const startDate = args[0];
    const dryRun = args.includes('--dry-run');
    const skipGmail = args.includes('--skip-gmail');

    // Valider le format de date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        console.log('❌ Format de date invalide. Utilisez YYYY-MM-DD');
        process.exit(1);
    }

    try {
        // Connexion à MongoDB
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB\n');

        // Créer le dossier auto-downloads si nécessaire
        if (!fs.existsSync(AUTO_DOWNLOADS_DIR)) {
            fs.mkdirSync(AUTO_DOWNLOADS_DIR, { recursive: true });
            console.log(`📁 Dossier créé : ${AUTO_DOWNLOADS_DIR}\n`);
        }

        // Identifier les fichiers manquants
        const missingFiles = await identifyMissingFiles(startDate);
        
        if (missingFiles.length === 0) {
            console.log('✅ Aucun fichier manquant trouvé !');
            return;
        }

        console.log(`\n📋 ${missingFiles.length} fichier(s) manquant(s) identifié(s):`);
        missingFiles.forEach(file => {
            console.log(`   - ${file.filename} (${file.status})`);
        });

        if (dryRun) {
            console.log('\n🔍 Mode dry-run activé - Aucune action effectuée');
            return;
        }

        console.log('\n🔄 Début du traitement...\n');

        // Charger la configuration Gmail depuis la base
        let gmailConfig = null;
        if (!skipGmail) {
            console.log('📋 Chargement de la configuration Gmail...');
            gmailConfig = await GmailConfig.getConfig();
            console.log(`📨 Expéditeurs configurés: ${gmailConfig.senders.join(', ')}`);
            console.log(`🔍 Sujet de recherche: ${gmailConfig.subject}\n`);
        }

        // Initialiser le service Gmail si nécessaire
        let gmailService = null;
        if (!skipGmail) {
            console.log('🔐 Initialisation du service Gmail...');
            gmailService = new GmailService();
            
            // Passer le bon chemin vers les credentials et le token
            const credentialsPath = path.join(BASE_DIR, 'config', 'gmail-credentials.json');
            const tokenPath = path.join(BASE_DIR, 'config', 'gmail-token.json');
            const initResult = await gmailService.initialize(credentialsPath, tokenPath);
            
            if (!initResult.configured) {
                console.log('❌ Gmail non configuré. Les fichiers ne pourront pas être récupérés depuis Gmail.');
                console.log('💡 Utilisez --skip-gmail pour importer uniquement les fichiers existants.');
                return;
            }
            console.log('✅ Service Gmail initialisé\n');
        }

        let recovered = 0;
        let imported = 0;
        let errors = 0;

        for (const file of missingFiles) {
            console.log(`\n📅 Traitement de ${file.filename}...`);
            
            let needsImport = false;
            
            // Si le fichier n'existe pas et qu'on ne skip pas Gmail
            if (file.status === 'FICHIER_MANQUANT' && !skipGmail) {
                const success = await recoverFileFromGmail(gmailService, file.filename, file.date, gmailConfig);
                if (success) {
                    recovered++;
                    needsImport = true;
                } else {
                    errors++;
                    console.log(`❌ Impossible de récupérer ${file.filename}`);
                    continue;
                }
            }
            // Si le fichier existe mais les données ne sont pas en base
            else if (file.status === 'DONNEES_MANQUANTES' || needsImport) {
                needsImport = true;
            }
            
            // Importer en base de données si nécessaire
            if (needsImport) {
                try {
                    const importSuccess = await importFileToDatabase(file.filename);
                    if (importSuccess) {
                        imported++;
                        console.log(`✅ ${file.filename} importé avec succès`);
                    } else {
                        errors++;
                        console.log(`❌ Erreur lors de l'import de ${file.filename}`);
                    }
                } catch (error) {
                    errors++;
                    console.log(`❌ Erreur lors de l'import de ${file.filename}:`, error.message);
                }
            }
        }

        // Résumé final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSUMÉ DE L\'OPÉRATION');
        console.log('='.repeat(60));
        console.log(`📁 Fichiers identifiés comme manquants : ${missingFiles.length}`);
        console.log(`📧 Fichiers récupérés depuis Gmail     : ${recovered}`);
        console.log(`📊 Fichiers importés en base           : ${imported}`);
        console.log(`❌ Erreurs rencontrées                : ${errors}`);
        console.log('='.repeat(60));

        if (errors === 0) {
            console.log('🎉 Traitement terminé avec succès !');
        } else {
            console.log('⚠️  Traitement terminé avec des erreurs.');
        }

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Déconnecté de MongoDB');
    }
}

// Lancer le script si exécuté directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    identifyMissingFiles,
    recoverFileFromGmail,
    importFileToDatabase,
    main
};
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const BoilerData = require('../models/BoilerData');
const BoilerConfig = require('../models/BoilerConfig');
const GmailService = require('../services/gmailService');
const GmailConfig = require('../models/GmailConfig');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;

// Détecter si on est dans backend/ ou à la racine
const isInBackend = process.cwd().endsWith('backend');
const BASE_DIR = isInBackend ? process.cwd() : path.join(process.cwd(), 'backend');
const AUTO_DOWNLOADS_DIR = path.join(BASE_DIR, 'auto-downloads');

// Fonction de filtrage par intervalle (comme dans boilerController.js)
function filterDataByInterval(data, intervalMinutes) {
  if (intervalMinutes <= 1) {
    return data; // Pas de filtrage si intervalle = 1 minute
  }

  const filtered = [];
  let lastTime = null;
  
  for (const entry of data) {
    // Créer un timestamp complet avec date + time
    const [hours, minutes] = (entry.time || '00:00').split(':').map(n => parseInt(n) || 0);
    const entryTimestamp = new Date(entry.date);
    entryTimestamp.setHours(hours, minutes, 0, 0);
    
    if (!lastTime) {
      // Première entrée
      filtered.push(entry);
      lastTime = entryTimestamp;
    } else {
      // Vérifier si assez de temps s'est écoulé
      const diffMinutes = (entryTimestamp - lastTime) / (1000 * 60);
      
      if (diffMinutes >= intervalMinutes) {
        filtered.push(entry);
        lastTime = entryTimestamp;
      }
    }
  }
  
  console.log(`📊 Filtrage temporel: ${data.length} → ${filtered.length} entrées (intervalle: ${intervalMinutes}min)`);
  return filtered;
}

// Fonction pour générer la liste des dates manquantes
function generateDateRange(startDate, endDate) {
    const dates = [];
    
    // Convertir YYYYMMDD en Date
    const parseDate = (dateStr) => {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Mois 0-indexé
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
    };
    
    const current = parseDate(startDate);
    
    // Si endDate n'est pas fourni, utiliser hier par défaut
    const end = endDate ? parseDate(endDate) : new Date();
    
    // Le fichier du jour J est généré le lendemain (J+1)
    // Donc si pas de date de fin spécifiée, on s'arrête à J-1 (hier)
    if (!endDate) {
        end.setDate(end.getDate() - 1);
    }
    
    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
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
async function identifyMissingFiles(startDate, endDate, forceAll = false) {
    const endInfo = endDate ? `jusqu'au ${endDate}` : 'jusqu\'à hier';
    console.log(`\n🔍 Identification des fichiers manquants depuis le ${startDate} ${endInfo}...`);
    
    const dates = generateDateRange(startDate, endDate);
    const missingFiles = [];
    
    for (const dateStr of dates) {
        const filename = `touch_${dateStr}.csv`;
        const fileExists = fs.existsSync(path.join(AUTO_DOWNLOADS_DIR, filename));
        const dataExists = await dataExistsInDB(dateStr);
        
        // Si forceAll, considérer tous les fichiers comme à traiter
        if (forceAll) {
            missingFiles.push({
                date: dateStr,
                filename: filename,
                fileExists: fileExists,
                dataExists: dataExists,
                status: fileExists ? 'FICHIER_EXISTANT' : 'FICHIER_MANQUANT'
            });
        } else if (!fileExists || !dataExists) {
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

// Fonction pour récupérer tous les emails d'une période en une seule requête
async function fetchEmailsForPeriod(gmailService, startDate, endDate, gmailConfig) {
    console.log(`📧 Récupération des emails pour la période ${startDate} à ${endDate}...`);
    
    try {
        // Le fichier du jour J est envoyé le lendemain (J+1)
        // Donc pas besoin d'élargir la date de début, mais +1 jour sur la fin
        // Utiliser Date.UTC pour éviter les problèmes de fuseau horaire
        const start = new Date(Date.UTC(
            parseInt(startDate.substring(0, 4)),
            parseInt(startDate.substring(4, 6)) - 1,
            parseInt(startDate.substring(6, 8))
        ));
        
        const end = new Date(Date.UTC(
            parseInt(endDate.substring(0, 4)),
            parseInt(endDate.substring(4, 6)) - 1,
            parseInt(endDate.substring(6, 8))
        ));
        // +1 jour sur la fin car le fichier du dernier jour est envoyé le lendemain
        end.setUTCDate(end.getUTCDate() + 1);

        const searchOptions = {
            dateFrom: start.toISOString().split('T')[0],
            dateTo: end.toISOString().split('T')[0],
            overwriteExisting: true
        };
        
        if (gmailConfig.subject && gmailConfig.subject.trim()) {
            searchOptions.subject = gmailConfig.subject;
        } else {
            searchOptions.subject = '';
        }
        
        if (gmailConfig.senders && gmailConfig.senders.length > 0) {
            searchOptions.sender = gmailConfig.senders;
            console.log(`📨 Filtrage par expéditeurs: ${gmailConfig.senders.join(', ')}`);
        }
        
        console.log(`🔍 Recherche emails du ${searchOptions.dateFrom} au ${searchOptions.dateTo}...`);
        const result = await gmailService.searchOkofenEmails(searchOptions);

        if (!result || !result.emails || result.emails.length === 0) {
            console.log(`❌ Aucun email trouvé pour la période`);
            return [];
        }

        console.log(`✅ ${result.emails.length} email(s) trouvé(s)`);
        
        // Debug: lister tous les fichiers trouvés
        const allFiles = [];
        result.emails.forEach(email => {
            if (email.attachments) {
                email.attachments.forEach(att => allFiles.push(att.filename));
            }
        });
        console.log(`📎 Fichiers détectés dans les emails: ${allFiles.join(', ')}`);
        
        return result.emails;
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération des emails:`, error.message);
        return [];
    }
}

// Fonction pour extraire un fichier spécifique depuis les emails déjà récupérés
async function extractFileFromEmails(gmailService, emails, filename, forceDownload = false) {
    for (const emailDetails of emails) {
        if (emailDetails.attachments) {
            for (const attachment of emailDetails.attachments) {
                if (attachment.filename === filename) {
                    console.log(`✅ Fichier ${filename} trouvé dans l'email !`);
                    
                    // Créer le dossier si nécessaire
                    if (!fs.existsSync(AUTO_DOWNLOADS_DIR)) {
                        fs.mkdirSync(AUTO_DOWNLOADS_DIR, { recursive: true });
                    }
                    
                    const filePath = path.join(AUTO_DOWNLOADS_DIR, filename);
                    
                    // Télécharger le fichier s'il n'existe pas ou si force-download
                    if (!fs.existsSync(filePath) || forceDownload) {
                        console.log(`📥 Téléchargement du fichier ${filename}...`);
                        
                        const downloadResult = await gmailService.downloadAttachment(
                            emailDetails.id,
                            attachment.attachmentId,
                            filename,
                            AUTO_DOWNLOADS_DIR
                        );
                        
                        if (!downloadResult.success) {
                            console.log(`❌ Erreur lors du téléchargement: ${downloadResult.error}`);
                            return false;
                        }
                    }
                    
                    // Vérifier que le fichier existe maintenant
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        console.log(`💾 Fichier sauvegardé : ${filePath}`);
                        console.log(`📊 Taille du fichier : ${stats.size} bytes`);
                        return true;
                    } else {
                        console.log(`⚠️ Fichier ${filename} non téléchargé`);
                    }
                }
            }
        }
    }
    
    console.log(`❌ Fichier ${filename} non trouvé dans les emails`);
    return false;
}

// Fonction pour récupérer un fichier depuis Gmail (ANCIENNE VERSION - gardée pour compatibilité)
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
async function importFileToDatabase(filename, importInterval = 1) {
    console.log(`📊 Import du fichier ${filename} en base de données...`);
    
    const filePath = path.join(AUTO_DOWNLOADS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Fichier ${filePath} non trouvé`);
        return false;
    }

    return new Promise((resolve, reject) => {
        const results = [];
        let lineCount = 0;
        let parsedCount = 0;
        
        fs.createReadStream(filePath)
            .pipe(csv({
                separator: ';',
                skipLines: 0
            }))
            .on('data', (data) => {
                lineCount++;
                
                // Debug: afficher les clés de la première ligne
                if (lineCount === 1) {
                    console.log(`🔍 Clés détectées (premières 10):`, Object.keys(data).slice(0, 10));
                }
                
                try {
                    let timestamp;
                    
                    // Détecter le format de date automatiquement
                    if (data['Datum/Zeit']) {
                        // NOUVEAU FORMAT: Datum/Zeit combiné
                        const dateTime = data['Datum/Zeit'];
                        if (!dateTime) return;

                        const [datePart, timePart] = dateTime.split(' ');
                        if (!datePart || !timePart) return;

                        const [day, month, year] = datePart.split('.');
                        timestamp = new Date(`${year}-${month}-${day}T${timePart}`);
                    } else {
                        // ANCIEN FORMAT: Datum et Zeit séparés
                        // Chercher avec et sans espace à la fin
                        const datePart = (data['Datum'] || data['Datum '] || data['Datum  '])?.trim();
                        const timePart = (data['Zeit'] || data['Zeit '] || data['Zeit  '])?.trim();
                        
                        if (!datePart || !timePart) {
                            if (lineCount <= 3) {
                                console.log(`⚠️  Ligne ${lineCount}: Date/Heure manquante`, { datePart, timePart, keys: Object.keys(data).slice(0, 5) });
                            }
                            return;
                        }

                        const [day, month, year] = datePart.split('.');
                        timestamp = new Date(`${year}-${month}-${day}T${timePart}`);
                    }
                    
                    if (isNaN(timestamp.getTime())) {
                        if (lineCount <= 3) {
                            console.log(`⚠️  Ligne ${lineCount}: Timestamp invalide`);
                        }
                        return;
                    }

                    // Utiliser les noms de colonnes avec TOUS les encodages possibles
                    // Le symbole ° peut être encodé en °, □, ou �
                    const aussentemperatur = parseFloat(
                        (data['AT [°C]'] || data['AT [□C]'] || data['AT [�C]'] || 
                         data['AT [°C] '] || data['AT [□C] '] || data['AT [�C] '])?.replace(',', '.')
                    );
                    
                    const pe1_kesseltemperatur = parseFloat(
                        (data['PE1 KT[°C]'] || data['PE1 KT[□C]'] || data['PE1 KT[�C]'] ||
                         data['PE1 KT[°C] '] || data['PE1 KT[□C] '] || data['PE1 KT[�C] '])?.replace(',', '.')
                    );
                    
                    // Essayer les deux noms de colonne pour le sollwert (KT_SOLL ou SW)
                    const pe1_sollwert = parseFloat(
                        (data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[□C]'] || data['PE1 KT_SOLL[�C]'] ||
                         data['PE1 KT_SOLL[°C] '] || data['PE1 KT_SOLL[□C] '] || data['PE1 KT_SOLL[�C] '] ||
                         data['PE1 SW[°C]'] || data['PE1 SW[□C]'] || data['PE1 SW[�C]'] ||
                         data['PE1 SW[°C] '] || data['PE1 SW[□C] '] || data['PE1 SW[�C] '])?.replace(',', '.')
                    );

                    if (isNaN(aussentemperatur) || isNaN(pe1_kesseltemperatur) || isNaN(pe1_sollwert)) {
                        if (lineCount <= 3) {
                            console.log(`⚠️  Ligne ${lineCount}: Données numériques invalides`, { 
                                aussentemperatur, 
                                pe1_kesseltemperatur, 
                                pe1_sollwert,
                                atRaw: data['AT [°C]'] || data['AT [□C]'] || data['AT [�C]'],
                                ktRaw: data['PE1 KT[°C]'] || data['PE1 KT[□C]'] || data['PE1 KT[�C]'],
                                swRaw: data['PE1 KT_SOLL[°C]'] || data['PE1 KT_SOLL[□C]'] || data['PE1 KT_SOLL[�C]']
                            });
                        }
                        return;
                    }

                    // Parser tous les champs requis selon le modèle BoilerData
                    const outsideTempActive = parseFloat(
                        (data['ATakt [°C]'] || data['ATakt [□C]'] || data['ATakt [�C]'] ||
                         data['ATakt [°C] '] || data['ATakt [□C] '] || data['ATakt [�C] '])?.replace(',', '.')
                    );
                    
                    const heatingFlowTemp = parseFloat(
                        (data['HK1 VL Ist[°C]'] || data['HK1 VL Ist[□C]'] || data['HK1 VL Ist[�C]'] ||
                         data['HK1 VL Ist[°C] '] || data['HK1 VL Ist[□C] '] || data['HK1 VL Ist[�C] '])?.replace(',', '.')
                    );
                    
                    const heatingFlowTempTarget = parseFloat(
                        (data['HK1 VL Soll[°C]'] || data['HK1 VL Soll[□C]'] || data['HK1 VL Soll[�C]'] ||
                         data['HK1 VL Soll[°C] '] || data['HK1 VL Soll[□C] '] || data['HK1 VL Soll[�C] '])?.replace(',', '.')
                    );
                    
                    const modulation = parseFloat(
                        (data['PE1 Modulation[%]'] || data['PE1 Modulation[%] '])?.replace(',', '.')
                    );
                    
                    const fanSpeed = parseFloat(
                        (data['PE1 Luefterdrehzahl[%]'] || data['PE1 Luefterdrehzahl[%] '])?.replace(',', '.')
                    );
                    
                    // Runtime peut ne pas exister dans les vieux fichiers
                    const runtimeRaw = (data['PE1 Runtime[h]'] || data['PE1 Runtime[h] '])?.replace(',', '.');
                    const runtime = runtimeRaw ? parseFloat(runtimeRaw) : 0;
                    
                    const status = parseInt(
                        (data['PE1 Status'] || data['PE1 Status '])
                    );
                    
                    const hotWaterInTemp = parseFloat(
                        (data['WW1 EinT Ist[°C]'] || data['WW1 EinT Ist[□C]'] || data['WW1 EinT Ist[�C]'] ||
                         data['WW1 EinT Ist[°C] '] || data['WW1 EinT Ist[□C] '] || data['WW1 EinT Ist[�C] '])?.replace(',', '.')
                    );
                    
                    const hotWaterOutTemp = parseFloat(
                        (data['WW1 AusT Ist[°C]'] || data['WW1 AusT Ist[□C]'] || data['WW1 AusT Ist[�C]'] ||
                         data['WW1 AusT Ist[°C] '] || data['WW1 AusT Ist[□C] '] || data['WW1 AusT Ist[�C] '])?.replace(',', '.')
                    );
                    
                    // Vérifier que tous les champs requis sont valides (runtime peut être 0 si absent)
                    if (isNaN(outsideTempActive) || isNaN(heatingFlowTemp) || isNaN(heatingFlowTempTarget) ||
                        isNaN(modulation) || isNaN(fanSpeed) || isNaN(status) ||
                        isNaN(hotWaterInTemp) || isNaN(hotWaterOutTemp)) {
                        return;
                    }

                    // Extraire date et heure séparées
                    const dateOnly = new Date(timestamp);
                    dateOnly.setHours(0, 0, 0, 0);
                    const timeOnly = timestamp.toTimeString().split(' ')[0]; // HH:MM:SS

                    parsedCount++;
                    results.push({
                        date: dateOnly,
                        time: timeOnly,
                        outsideTemp: aussentemperatur,
                        outsideTempActive: outsideTempActive,
                        heatingFlowTemp: heatingFlowTemp,
                        heatingFlowTempTarget: heatingFlowTempTarget,
                        boilerTemp: pe1_kesseltemperatur,
                        boilerTempTarget: pe1_sollwert,
                        modulation: modulation,
                        fanSpeed: fanSpeed,
                        runtime: runtime,
                        status: status,
                        hotWaterInTemp: hotWaterInTemp,
                        hotWaterOutTemp: hotWaterOutTemp,
                        filename: filename
                    });
                } catch (error) {
                    if (lineCount <= 3) {
                        console.warn(`⚠️  Ligne ${lineCount} ignorée:`, error.message);
                    }
                }
            })
            .on('end', async () => {
                try {
                    console.log(`📋 Lignes lues: ${lineCount}, Lignes parsées: ${parsedCount}`);
                    
                    if (results.length === 0) {
                        console.log('❌ Aucune donnée valide trouvée dans le fichier');
                        resolve(false);
                        return;
                    }

                    // Appliquer le filtrage par intervalle
                    const filteredResults = filterDataByInterval(results, importInterval);

                    console.log(`📝 Insertion de ${filteredResults.length} entrées en base de données...`);

                    // Supprimer les données existantes pour éviter les doublons
                    if (filteredResults.length > 0) {
                        const firstDate = filteredResults[0].date;
                        const lastDate = filteredResults[filteredResults.length - 1].date;
                        
                        await BoilerData.deleteMany({
                            date: {
                                $gte: firstDate,
                                $lte: lastDate
                            }
                        });
                    }

                    // Insérer les nouvelles données
                    await BoilerData.insertMany(filteredResults);
                    console.log(`✅ ${filteredResults.length} entrées insérées avec succès`);
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
        console.log('❌ Usage: node recover-and-import-missing-files.js <date-debut> [date-fin] [options]');
        console.log('   date-debut: Format YYYY-MM-DD (ex: 2022-12-11)');
        console.log('   date-fin  : Format YYYY-MM-DD (optionnel, par défaut: hier)');
        console.log('   Options:');
        console.log('     --dry-run         : Afficher seulement les fichiers manquants sans les récupérer');
        console.log('     --skip-gmail      : Ne pas essayer de récupérer depuis Gmail, importer seulement les fichiers existants');
        console.log('     --skip-import     : Télécharger les fichiers sans les importer en base');
        console.log('     --force-download  : Récupérer systématiquement les fichiers depuis Gmail (écrase les fichiers locaux)');
        console.log('     --force-import    : Réimporter systématiquement les données en base (écrase les données existantes)');
        console.log('');
        console.log('   Exemples:');
        console.log('     node recover-and-import-missing-files.js 2022-12-11');
        console.log('     node recover-and-import-missing-files.js 2022-12-11 2023-01-31');
        console.log('     node recover-and-import-missing-files.js 2023-01-01 2023-01-15 --dry-run');
        console.log('     node recover-and-import-missing-files.js 2022-12-11 --force-download --force-import');
        console.log('     node recover-and-import-missing-files.js 2022-12-11 --skip-import  # Télécharger sans importer');
        process.exit(1);
    }

    // Filtrer les options
    const dryRun = args.includes('--dry-run');
    const skipGmail = args.includes('--skip-gmail');
    const skipImport = args.includes('--skip-import');
    const forceDownload = args.includes('--force-download');
    const forceImport = args.includes('--force-import');
    const dateArgs = args.filter(arg => !arg.startsWith('--'));

    const startDate = dateArgs[0];
    const endDate = dateArgs[1]; // Optionnel

    // Valider le format de date de début (YYYYMMDD)
    if (!/^\d{8}$/.test(startDate)) {
        console.log('❌ Format de date de début invalide. Utilisez YYYYMMDD');
        process.exit(1);
    }

    // Valider le format de date de fin si fourni (YYYYMMDD)
    if (endDate && !/^\d{8}$/.test(endDate)) {
        console.log('❌ Format de date de fin invalide. Utilisez YYYYMMDD');
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

        // Identifier les fichiers manquants (ou tous si force-download/force-import)
        const forceAll = forceDownload || forceImport;
        const missingFiles = await identifyMissingFiles(startDate, endDate, forceAll);
        
        if (missingFiles.length === 0) {
            console.log('✅ Aucun fichier manquant trouvé !');
            return;
        }

        console.log(`\n📋 ${missingFiles.length} fichier(s) ${forceAll ? 'à traiter' : 'manquant(s) identifié(s)'}:`);
        missingFiles.forEach(file => {
            console.log(`   - ${file.filename} (${file.status})`);
        });

        if (dryRun) {
            console.log('\n🔍 Mode dry-run activé - Aucune action effectuée');
            return;
        }
        
        if (forceDownload) {
            console.log('⚠️  Mode force-download activé - Les fichiers seront re-téléchargés depuis Gmail');
        }
        
        if (forceImport) {
            console.log('⚠️  Mode force-import activé - Les données seront réimportées en base');
        }
        
        if (skipImport) {
            console.log('📁 Mode skip-import activé - Les fichiers seront téléchargés sans import en base');
        }

        console.log('\n🔄 Début du traitement...\n');

        // Charger la configuration de la chaudière pour l'importInterval
        let boilerConfig;
        try {
            boilerConfig = await BoilerConfig.findOne({ configType: 'main' });
            if (!boilerConfig) {
                console.log('⚠️  Aucune configuration chaudière trouvée, utilisation intervalle par défaut (1 min)');
                boilerConfig = { importInterval: 1 };
            } else {
                console.log(`📊 Intervalle d'import configuré: ${boilerConfig.importInterval} minute(s)\n`);
            }
        } catch (error) {
            console.log('⚠️  Erreur lors du chargement de la configuration, utilisation intervalle par défaut (1 min)');
            boilerConfig = { importInterval: 1 };
        }

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
        
        // Récupérer tous les emails de la période en une seule fois si on utilise Gmail
        let allEmails = [];
        if (!skipGmail && missingFiles.length > 0) {
            const firstDate = missingFiles[0].date;
            const lastDate = missingFiles[missingFiles.length - 1].date;
            allEmails = await fetchEmailsForPeriod(gmailService, firstDate, lastDate, gmailConfig);
        }

        for (const file of missingFiles) {
            console.log(`\n📅 Traitement de ${file.filename}...`);
            
            let needsImport = false;
            
            // Forcer le téléchargement si --force-download
            if (forceDownload && !skipGmail && allEmails.length > 0) {
                const success = await extractFileFromEmails(gmailService, allEmails, file.filename, true);
                if (success) {
                    recovered++;
                    needsImport = true;
                } else {
                    errors++;
                    console.log(`❌ Impossible de récupérer ${file.filename}`);
                    continue;
                }
            }
            // Si le fichier n'existe pas et qu'on ne skip pas Gmail
            else if (file.status === 'FICHIER_MANQUANT' && !skipGmail && allEmails.length > 0) {
                const success = await extractFileFromEmails(gmailService, allEmails, file.filename, false);
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
            else if (file.status === 'DONNEES_MANQUANTES') {
                needsImport = true;
            }
            // Si --force-import, importer même si les données existent
            else if (forceImport && file.fileExists) {
                needsImport = true;
                console.log(`🔄 Réimport forcé des données de ${file.filename}`);
            }
            
            // Importer en base de données si nécessaire (sauf si --skip-import)
            if (needsImport && !skipImport) {
                try {
                    const importSuccess = await importFileToDatabase(file.filename, boilerConfig.importInterval);
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
            } else if (needsImport && skipImport) {
                console.log(`📁 ${file.filename} téléchargé (import ignoré)`);
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
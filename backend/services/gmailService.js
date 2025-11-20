const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const ProcessedEmail = require('../models/ProcessedEmail');

class GmailService {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.credentials = null;
    this.token = null;
  }

  /**
   * Initialise le service Gmail avec les credentials OAuth2
   */
  async initialize(credentialsPath = null) {
    try {
      // Détecter l'environnement (production ou développement)
      const isProduction = process.env.NODE_ENV === 'production' || 
                           process.env.VERCEL || 
                           process.cwd().includes('/home/pelletsfun/') ||
                           process.env.PM2_HOME;
      
      // Chemins par défaut pour les fichiers de configuration
      const credentialsFilename = isProduction ? 'gmail-credentials.production.json' : 'gmail-credentials.json';
      const defaultCredentialsPath = path.join(process.cwd(), 'config', credentialsFilename);
      const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
      
      const credsPath = credentialsPath || defaultCredentialsPath;
      
      console.log(`🌐 Environnement détecté: ${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}`);
      console.log(`📁 Fichier credentials: ${credentialsFilename}`);
      console.log(`🔗 URL de redirection OAuth2: https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback`);

      // Vérifier si les credentials existent
      try {
        const credentialsData = await fs.readFile(credsPath, 'utf8');
        this.credentials = JSON.parse(credentialsData);
      } catch (error) {
        console.log('⚠️  Fichier credentials Gmail non trouvé:', credsPath);
        console.log('📋 Pour configurer Gmail, suivez les étapes dans le guide d\'installation');
        return { 
          configured: false, 
          error: 'Credentials Gmail non configurés',
          setupUrl: 'https://console.cloud.google.com/apis/credentials'
        };
      }

      // Configurer OAuth2 avec la bonne URL selon l'environnement
      const { client_secret, client_id, redirect_uris } = this.credentials.installed || this.credentials.web;
      
      // Sélectionner l'URI de redirection selon l'environnement
      const redirectUri = isProduction 
        ? 'https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback'
        : 'https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback';
      
      console.log(`🔗 URI de redirection FORCÉE: ${redirectUri}`);
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);

      // Charger le token s'il existe
      try {
        const tokenData = await fs.readFile(tokenPath, 'utf8');
        this.token = JSON.parse(tokenData);
        
        // Vérifier si le refresh_token est présent
        if (!this.token.refresh_token) {
          console.log('⚠️ Refresh token manquant, nouvelle autorisation requise');
          return { 
            configured: false, 
            error: 'Refresh token manquant - nouvelle autorisation requise',
            authUrl: await this.getAuthUrl(),
            needsReauth: true
          };
        }
        
        this.auth.setCredentials(this.token);
      } catch (error) {
        console.log('🔐 Token Gmail non trouvé, autorisation requise');
        return { 
          configured: false, 
          error: 'Token d\'autorisation Gmail requis',
          authUrl: await this.getAuthUrl()
        };
      }

      // Initialiser le client Gmail
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });

      // Configurer le renouvellement automatique des tokens
      this.auth.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          // Sauvegarder le nouveau refresh_token
          this.token.refresh_token = tokens.refresh_token;
        }
        if (tokens.access_token) {
          // Mettre à jour l'access_token
          this.token.access_token = tokens.access_token;
          this.token.expiry_date = tokens.expiry_date;
        }
        
        // Sauvegarder les tokens mis à jour
        try {
          await fs.writeFile(tokenPath, JSON.stringify(this.token, null, 2));
          console.log('🔄 Tokens Gmail mis à jour automatiquement');
        } catch (error) {
          console.error('❌ Erreur sauvegarde tokens:', error);
        }
      });

      // Tester la connexion et gérer l'expiration du token
      try {
        await this.testConnection();
      } catch (error) {
        // Tentative de renouvellement automatique du token
        if (error.code === 401 || error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
          console.log('🔄 Tentative de renouvellement automatique du token...');
          try {
            await this.auth.refreshAccessToken();
            await this.testConnection(); // Re-tester après renouvellement
            console.log('✅ Token renouvelé automatiquement avec succès');
          } catch (refreshError) {
            console.log('❌ Échec du renouvellement automatique:', refreshError.message);
            return { 
              configured: false, 
              error: 'Token expiré - nouvelle autorisation requise',
              authUrl: await this.getAuthUrl(),
              needsReauth: true
            };
          }
        } else {
          throw error;
        }
      }

      console.log('✅ Service Gmail initialisé avec succès');
      return { configured: true, message: 'Gmail service prêt' };

    } catch (error) {
      console.error('❌ Erreur initialisation Gmail:', error);
      return { 
        configured: false, 
        error: `Erreur initialisation: ${error.message}` 
      };
    }
  }

  /**
   * Génère l'URL d'autorisation OAuth2
   */
  async getAuthUrl() {
    if (!this.auth) {
      throw new Error('Service Gmail non initialisé');
    }

    const SCOPES = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    // Détecter l'environnement pour l'URL de redirection
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.VERCEL || 
                         process.cwd().includes('/home/pelletsfun/') ||
                         process.env.PM2_HOME;
    
    const redirectUri = 'https://pelletsfun.harmonixe.fr/api/boiler/gmail/callback';

    return this.auth.generateAuthUrl({
      access_type: 'offline', // Nécessaire pour obtenir un refresh_token
      scope: SCOPES,
      prompt: 'consent', // Force la demande de consentement pour obtenir le refresh_token
      redirect_uri: redirectUri // Utiliser la bonne URL selon l'environnement
    });
  }

  /**
   * Échange le code d'autorisation contre un token
   */
  async exchangeCodeForToken(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      
      // Vérifier que nous avons bien reçu le refresh_token
      if (!tokens.refresh_token) {
        console.warn('⚠️ Aucun refresh_token reçu - vérifier la configuration OAuth2');
      }
      
      this.auth.setCredentials(tokens);
      this.token = tokens;

      // Sauvegarder le token avec métadonnées
      const tokenData = {
        ...tokens,
        created_at: new Date().toISOString(),
        app_version: '1.0.0'
      };
      
      const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
      await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 2));

      console.log('✅ Token Gmail sauvegardé avec refresh_token:', !!tokens.refresh_token);
      return { 
        success: true, 
        message: 'Autorisation Gmail réussie',
        hasRefreshToken: !!tokens.refresh_token 
      };
    } catch (error) {
      console.error('❌ Erreur échange token:', error);
      throw error;
    }
  }

  /**
   * Vérifie et renouvelle automatiquement le token si nécessaire
   */
  async ensureValidToken() {
    if (!this.token) {
      throw new Error('Aucun token disponible');
    }

    // Vérifier si le token expire bientôt (dans les 5 prochaines minutes)
    const now = new Date().getTime();
    const expiryTime = this.token.expiry_date || 0;
    const timeUntilExpiry = expiryTime - now;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeUntilExpiry < fiveMinutes) {
      console.log('🔄 Token proche de l\'expiration, renouvellement préventif...');
      try {
        const { credentials } = await this.auth.refreshAccessToken();
        this.auth.setCredentials(credentials);
        this.token = { ...this.token, ...credentials };
        
        // Sauvegarder les nouveaux tokens
        const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
        await fs.writeFile(tokenPath, JSON.stringify(this.token, null, 2));
        
        console.log('✅ Token renouvelé préventivement');
      } catch (error) {
        console.error('❌ Erreur renouvellement préventif:', error);
        throw new Error('Impossible de renouveler le token - réauthentification requise');
      }
    }
  }

  /**
   * Test la connexion Gmail
   */
  async testConnection() {
    if (!this.gmail) {
      throw new Error('Gmail client non initialisé');
    }

    // S'assurer que le token est valide avant le test
    await this.ensureValidToken();

    const response = await this.gmail.users.labels.list({ userId: 'me' });
    return response.data.labels.length > 0;
  }

  /**
   * Recherche les emails Okofen avec pièces jointes CSV
   */
  async searchOkofenEmails(options = {}) {
    if (!this.gmail) {
      throw new Error('Gmail service non initialisé');
    }

    try {
      // S'assurer que le token est valide avant recherche
      await this.ensureValidToken();
      const {
        dateFrom = null,
        dateTo = null,
        sender = null,
        subject = 'okofen'
      } = options;

      // Construire la requête de recherche
      let query = `has:attachment filename:csv ${subject}`;
      
      // Support pour plusieurs expéditeurs
      if (sender) {
        if (Array.isArray(sender)) {
          // Multiple senders - utiliser OR logic
          if (sender.length > 0) {
            const senderQuery = sender.map(s => `from:${s.trim()}`).join(' OR ');
            query += ` (${senderQuery})`;
          }
        } else {
          // Single sender
          query += ` from:${sender}`;
        }
      }

      // Élargir la fenêtre de recherche des emails : J-2 début, J+2 fin
      if (dateFrom || dateTo) {
        console.log('🗓️ Période personnalisée demandée (filtrage par date de fichier):', { dateFrom, dateTo });
        
        let searchDateFrom, searchDateTo;
        
        if (dateFrom) {
          // J-1 par rapport à la date de début
          const startDate = new Date(dateFrom);
          startDate.setDate(startDate.getDate() - 2);
          searchDateFrom = startDate.toISOString().split('T')[0].replace(/-/g, '/');
        }
        
        if (dateTo) {
          // J+1 par rapport à la date de fin
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 2);
          searchDateTo = endDate.toISOString().split('T')[0].replace(/-/g, '/');
        }
        
        // Ajouter les filtres de date à la requête Gmail
        if (searchDateFrom) {
          query += ` after:${searchDateFrom}`;
        }
        if (searchDateTo) {
          query += ` before:${searchDateTo}`;
        }
        
        console.log('📅 Fenêtre de recherche élargie:', { 
          original: { dateFrom, dateTo },
          search: { searchDateFrom, searchDateTo }
        });
      }

      // Recherche Gmail en cours

      // Optimisation: Limiter la recherche selon le contexte
      const queryOptions = {
        userId: 'me',
        q: query
      };

      // Définir maxResults selon le contexte
      if (dateFrom || dateTo) {
        // Mode période spécifiée : limite élevée pour import complet
        queryOptions.maxResults = 500;
        console.log('📧 Mode période : limite étendue à 500 emails');
      } else {
        // Mode automatique : limite raisonnable
        queryOptions.maxResults = 50;
        console.log('📧 Mode automatique : limite à 50 emails récents');
      }

      // Si pas de période spécifiée, chercher depuis le dernier traitement réussi
      if (!dateFrom && !dateTo) {
        const lastProcessed = await ProcessedEmail.findOne().sort({ emailDate: -1 });
        if (lastProcessed) {
          const lastDate = new Date(lastProcessed.emailDate);
          lastDate.setDate(lastDate.getDate() - 1); // 1 jour de marge
          const afterDate = lastDate.toISOString().split('T')[0].replace(/-/g, '/');
          queryOptions.q += ` after:${afterDate}`;
          console.log(`⚡ Recherche optimisée depuis: ${afterDate}`);
        }
      }

      // Recherche Gmail optimisée lancée

      // Gestion de la pagination pour les gros volumes
      let allMessages = [];
      let pageToken = null;
      let pageCount = 0;
      const maxPages = 10; // Limite de sécurité pour éviter les boucles infinies

      do {
        if (pageToken) {
          queryOptions.pageToken = pageToken;
        }

        const searchResponse = await this.gmail.users.messages.list(queryOptions);
        const messages = searchResponse.data.messages || [];
        
        allMessages = allMessages.concat(messages);
        pageToken = searchResponse.data.nextPageToken;
        pageCount++;

        console.log(`� Page ${pageCount}: ${messages.length} emails trouvés${pageToken ? ' (page suivante disponible)' : ''}`);
        
        // Si période spécifiée et qu'on a encore des pages, continuer
        // Sinon, s'arrêter après la première page pour éviter de traiter trop d'emails
        if (!dateFrom && !dateTo && pageCount >= 1) {
          break;
        }
        
        if (pageCount >= maxPages) {
          console.log(`⚠️ Limite de ${maxPages} pages atteinte, arrêt de la recherche`);
          break;
        }

      } while (pageToken && (dateFrom || dateTo));

      console.log(`📧 Total trouvé: ${allMessages.length} emails sur ${pageCount} page(s)`);

      // Filtrer les emails déjà traités (sauf si on force l'écrasement)
      let messagesToProcess = allMessages;
      
      if (!options.overwriteExisting) {
        const processedIds = new Set(
          (await ProcessedEmail.find({}, 'messageId')).map(p => p.messageId)
        );
        messagesToProcess = allMessages.filter(msg => !processedIds.has(msg.id));
        console.log(`🆕 Nouveaux emails à traiter: ${messagesToProcess.length} sur ${allMessages.length}`);
      } else {
        console.log(`🔄 Mode écrasement activé: ${messagesToProcess.length} emails à traiter (doublons inclus)`);
      }

      // Récupérer les détails des messages à traiter
      const emailDetails = [];
      for (const message of messagesToProcess) {
        try {
          const details = await this.getEmailDetails(message.id);
          if (details && details.attachments.length > 0) {
            emailDetails.push(details);
          }
        } catch (error) {
          console.error(`Erreur récupération email ${message.id}:`, error.message);
        }
      }

      return {
        success: true,
        emails: emailDetails,
        totalFound: allMessages.length,
        pagesProcessed: pageCount
      };

    } catch (error) {
      console.error('❌ Erreur recherche emails:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un email spécifique
   */
  async getEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      // Extraire les informations de base
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const receivedDate = new Date(parseInt(message.internalDate));

      // Rechercher les pièces jointes CSV
      const attachments = [];
      
      const findAttachments = (part) => {
        if (part.parts) {
          part.parts.forEach(findAttachments);
        } else if (part.body && part.body.attachmentId && part.filename) {
          if (part.filename.toLowerCase().endsWith('.csv')) {
            attachments.push({
              filename: part.filename,
              attachmentId: part.body.attachmentId,
              size: part.body.size,
              mimeType: part.mimeType
            });
          }
        }
      };

      findAttachments(message.payload);

      return {
        id: messageId,
        subject,
        from,
        date,
        receivedDate,
        attachments,
        snippet: message.snippet
      };

    } catch (error) {
      console.error(`Erreur détails email ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Télécharge une pièce jointe
   */
  async downloadAttachment(messageId, attachmentId, filename, downloadPath) {
    try {
      if (!this.gmail) {
        throw new Error('Gmail service non initialisé');
      }

      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      // Décoder les données base64
      const data = Buffer.from(response.data.data, 'base64');
      
      // S'assurer que le dossier de destination existe
      const fullPath = path.join(downloadPath, filename);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Écrire le fichier
      await fs.writeFile(fullPath, data);

      console.log(`✅ Pièce jointe téléchargée: ${fullPath}`);
      
      // Retourner les informations incluant le hash pour le tracking
      return {
        success: true,
        filePath: fullPath,
        filename: filename,
        size: data.length,
        fileHash: crypto.createHash('md5').update(data).digest('hex')
      };

    } catch (error) {
      console.error(`❌ Erreur téléchargement ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Marque un email comme lu
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
      return true;
    } catch (error) {
      console.error(`Erreur marquage lecture ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Ajoute un label à un email
   */
  async addLabel(messageId, labelName) {
    try {
      // D'abord, chercher ou créer le label
      const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
      let labelId = labelsResponse.data.labels.find(l => l.name === labelName)?.id;

      if (!labelId) {
        // Créer le label s'il n'existe pas
        const createResponse = await this.gmail.users.labels.create({
          userId: 'me',
          resource: {
            name: labelName,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        labelId = createResponse.data.id;
        console.log(`📋 Label créé: ${labelName}`);
      }

      // Ajouter le label à l'email
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          addLabelIds: [labelId]
        }
      });

      return true;
    } catch (error) {
      console.error(`Erreur ajout label ${labelName}:`, error);
      return false;
    }
  }

  /**
   * Traite directement une liste d'emails sans refaire la recherche
   */
  async processEmailsDirectly(emails, options = {}) {
    try {
      // S'assurer que le token est valide avant traitement
      await this.ensureValidToken();
      
      const {
        downloadPath = path.join(process.cwd(), 'auto-downloads'),
        processCallback = null,
        markAsProcessed = true,
        labelProcessed = 'PelletsFun-Traité'
      } = options;

      console.log(`🔄 Traitement direct de ${emails.length} emails...`);

      let downloadedCount = 0;
      let processedCount = 0;
      const errors = [];

      // Traiter chaque email directement
      for (const email of emails) {
        try {
          console.log(`📧 Traitement email: ${email.subject} (${email.receivedDate.toLocaleString()})`);

          // Télécharger chaque pièce jointe CSV
          for (const attachment of email.attachments) {
            try {
              // Vérifier si le fichier correspond à la période demandée (par date de fichier)
              if (options.dateFrom || options.dateTo) {
                const fileDate = this.extractDateFromFilename(attachment.filename);
                if (fileDate) {
                  const shouldInclude = this.isFileInDateRange(fileDate, options.dateFrom, options.dateTo);
                  if (!shouldInclude) {
                    console.log(`📅 Fichier ${attachment.filename} (${fileDate.toISOString().split('T')[0]}) hors période demandée, ignoré`);
                    continue;
                  }
                  console.log(`📅 Fichier ${attachment.filename} (${fileDate.toISOString().split('T')[0]}) dans la période, traitement`);
                } else {
                  console.log(`⚠️ Impossible d'extraire la date de ${attachment.filename}, traitement par défaut`);
                }
              }

              const downloadResult = await this.downloadAttachment(
                email.id,
                attachment.attachmentId,
                attachment.filename,
                downloadPath
              );

              if (downloadResult.success) {
                downloadedCount++;

                // Enregistrer ou mettre à jour l'email comme traité dans la base de données
                try {
                  const processedData = {
                    messageId: email.id,
                    subject: email.subject,
                    sender: email.from,
                    emailDate: email.receivedDate,
                    fileName: attachment.filename,
                    fileHash: downloadResult.fileHash,
                    status: 'processed',
                    processedDate: new Date()
                  };

                  if (options.overwriteExisting) {
                    // Mode écrasement: mettre à jour ou créer
                    await ProcessedEmail.findOneAndUpdate(
                      { messageId: email.id, fileName: attachment.filename },
                      processedData,
                      { upsert: true, new: true }
                    );
                    console.log(`🔄 Email mis à jour/créé: ${email.id}`);
                  } else {
                    // Mode normal: créer seulement
                    await ProcessedEmail.create(processedData);
                    console.log(`📝 Email enregistré comme traité: ${email.id}`);
                  }
                } catch (dbError) {
                  console.error('⚠️ Erreur sauvegarde DB (non bloquante):', dbError.message);
                }

                // Callback personnalisé de traitement (ex: import CSV)
                if (processCallback && typeof processCallback === 'function') {
                  await processCallback(downloadResult.filePath, {
                    email: email,
                    attachment: attachment
                  });
                  processedCount++;
                }
              }

            } catch (error) {
              console.error(`Erreur pièce jointe ${attachment.filename}:`, error);
              errors.push(`${attachment.filename}: ${error.message}`);
            }
          }

          // Marquer comme traité
          if (markAsProcessed) {
            await this.addLabel(email.id, labelProcessed);
            await this.markAsRead(email.id);
          }

        } catch (error) {
          console.error(`Erreur traitement email ${email.id}:`, error);
          errors.push(`Email ${email.id}: ${error.message}`);
        }
      }

      console.log(`✅ Traitement direct terminé: ${downloadedCount} fichiers téléchargés, ${processedCount} traités`);

      return {
        success: true,
        processed: processedCount,
        downloaded: downloadedCount,
        errors: errors
      };

    } catch (error) {
      console.error('❌ Erreur traitement direct emails:', error);
      throw error;
    }
  }

  /**
   * Processus complet de récupération et traitement des emails Okofen
   */
  async processOkofenEmails(options = {}) {
    try {
      const {
        downloadPath = path.join(process.cwd(), 'auto-downloads'),
        processCallback = null,
        markAsProcessed = true,
        labelProcessed = 'Okofen-Processed'
      } = options;

      console.log('🔄 Début traitement emails Okofen...');

      // Rechercher les emails
      const searchResult = await this.searchOkofenEmails(options);
      
      if (!searchResult.success || searchResult.emails.length === 0) {
        console.log('📭 Aucun nouvel email Okofen trouvé');
        return {
          success: true,
          processed: 0,
          downloaded: 0,
          errors: []
        };
      }

      let downloadedCount = 0;
      let processedCount = 0;
      const errors = [];

      // Traiter chaque email
      for (const email of searchResult.emails) {
        try {
          console.log(`📧 Traitement email: ${email.subject} (${email.receivedDate.toLocaleString()})`);

          // Télécharger chaque pièce jointe CSV
          for (const attachment of email.attachments) {
            try {
              // Vérifier si le fichier correspond à la période demandée (par date de fichier)
              if (options.dateFrom || options.dateTo) {
                const fileDate = this.extractDateFromFilename(attachment.filename);
                if (fileDate) {
                  const shouldInclude = this.isFileInDateRange(fileDate, options.dateFrom, options.dateTo);
                  if (!shouldInclude) {
                    console.log(`📅 Fichier ${attachment.filename} (${fileDate.toISOString().split('T')[0]}) hors période demandée, ignoré`);
                    continue;
                  }
                  console.log(`📅 Fichier ${attachment.filename} (${fileDate.toISOString().split('T')[0]}) dans la période, traitement`);
                } else {
                  console.log(`⚠️ Impossible d'extraire la date de ${attachment.filename}, traitement par défaut`);
                }
              }

              const downloadResult = await this.downloadAttachment(
                email.id,
                attachment.attachmentId,
                attachment.filename,
                downloadPath
              );

              if (downloadResult.success) {
                downloadedCount++;

                // Enregistrer ou mettre à jour l'email comme traité dans la base de données
                try {
                  const processedData = {
                    messageId: email.id,
                    subject: email.subject,
                    sender: email.from,
                    emailDate: email.receivedDate,
                    fileName: attachment.filename,
                    fileHash: downloadResult.fileHash,
                    status: 'processed',
                    processedDate: new Date()
                  };

                  if (options.overwriteExisting) {
                    // Mode écrasement: mettre à jour ou créer
                    await ProcessedEmail.findOneAndUpdate(
                      { messageId: email.id, fileName: attachment.filename },
                      processedData,
                      { upsert: true, new: true }
                    );
                    console.log(`🔄 Email mis à jour/créé: ${email.id}`);
                  } else {
                    // Mode normal: créer seulement
                    await ProcessedEmail.create(processedData);
                    console.log(`📝 Email enregistré comme traité: ${email.id}`);
                  }
                } catch (dbError) {
                  console.error('⚠️ Erreur sauvegarde DB (non bloquante):', dbError.message);
                }

                // Callback personnalisé de traitement (ex: import CSV)
                if (processCallback && typeof processCallback === 'function') {
                  await processCallback(downloadResult.filePath, {
                    email: email,
                    attachment: attachment
                  });
                  processedCount++;
                }
              }

            } catch (error) {
              console.error(`Erreur pièce jointe ${attachment.filename}:`, error);
              errors.push(`${attachment.filename}: ${error.message}`);
            }
          }

          // Marquer comme traité
          if (markAsProcessed) {
            await this.addLabel(email.id, labelProcessed);
            await this.markAsRead(email.id);
          }

        } catch (error) {
          console.error(`Erreur traitement email ${email.id}:`, error);
          errors.push(`Email ${email.id}: ${error.message}`);
        }
      }

      console.log(`✅ Traitement terminé: ${downloadedCount} fichiers téléchargés, ${processedCount} traités`);

      return {
        success: true,
        processed: processedCount,
        downloaded: downloadedCount,
        errors: errors
      };

    } catch (error) {
      console.error('❌ Erreur traitement emails Okofen:', error);
      throw error;
    }
  }

  /**
   * Extrait la date d'un nom de fichier au format touch_YYYYMMDD.csv
   * @param {string} filename - Nom du fichier
   * @returns {Date|null} - Date extraite ou null si non trouvée
   */
  extractDateFromFilename(filename) {
    // Chercher le pattern touch_YYYYMMDD.csv ou YYYYMMDD dans le nom
    const patterns = [
      /touch_(\d{8})\.csv$/i,        // touch_20251102.csv
      /(\d{8})\.csv$/i,              // 20251102.csv
      /(\d{4})(\d{2})(\d{2})/        // YYYYMMDD n'importe où
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        let dateStr;
        if (match.length === 2) {
          dateStr = match[1]; // Format YYYYMMDD complet
        } else if (match.length === 4) {
          dateStr = match[1] + match[2] + match[3]; // YYYY MM DD séparés
        }

        if (dateStr && dateStr.length === 8) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          
          const date = new Date(`${year}-${month}-${day}`);
          
          // Vérifier que la date est valide
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return null;
  }

  /**
   * Vérifie si une date de fichier est dans la plage demandée
   * @param {Date} fileDate - Date du fichier
   * @param {string|null} dateFrom - Date de début au format YYYY-MM-DD (incluse)
   * @param {string|null} dateTo - Date de fin au format YYYY-MM-DD (incluse)
   * @returns {boolean} - True si le fichier est dans la plage
   */
  isFileInDateRange(fileDate, dateFrom, dateTo) {
    if (!fileDate) {
      return true; // Si on ne peut pas déterminer la date, on inclut le fichier
    }

    // Normaliser les dates pour comparer seulement les jours (pas les heures)
    const fileDateOnly = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      if (fileDateOnly < fromDateOnly) {
        return false;
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      if (fileDateOnly > toDateOnly) {
        return false;
      }
    }

    return true;
  }

  /**
   * Nettoie les anciens enregistrements de ProcessedEmail (> 90 jours)
   * Pour éviter l'accumulation infinie de données
   */
  async cleanupOldProcessedEmails() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 jours

      const result = await ProcessedEmail.deleteMany({
        processedDate: { $lt: cutoffDate }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Nettoyage: ${result.deletedCount} anciens enregistrements supprimés`);
      }

      return result.deletedCount;
    } catch (error) {
      console.error('⚠️ Erreur nettoyage ProcessedEmail:', error.message);
      return 0;
    }
  }

  /**
   * Obtient les statistiques de traitement des emails
   */
  async getProcessingStats() {
    try {
      const totalProcessed = await ProcessedEmail.countDocuments();
      const last7Days = await ProcessedEmail.countDocuments({
        processedDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      const last30Days = await ProcessedEmail.countDocuments({
        processedDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      const latestProcessed = await ProcessedEmail.findOne()
        .sort({ processedDate: -1 })
        .select('processedDate emailDate fileName');

      return {
        totalProcessed,
        last7Days,
        last30Days,
        latestProcessed: latestProcessed ? {
          processedDate: latestProcessed.processedDate,
          emailDate: latestProcessed.emailDate,
          fileName: latestProcessed.fileName
        } : null
      };
    } catch (error) {
      console.error('⚠️ Erreur statistiques:', error.message);
      return null;
    }
  }
}

module.exports = GmailService;
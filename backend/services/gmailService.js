const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

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
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      
      // Chemins par défaut pour les fichiers de configuration
      const credentialsFilename = isProduction ? 'gmail-credentials.production.json' : 'gmail-credentials.json';
      const defaultCredentialsPath = path.join(process.cwd(), 'config', credentialsFilename);
      const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
      
      const credsPath = credentialsPath || defaultCredentialsPath;
      
      console.log(`🌐 Environnement détecté: ${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}`);
      console.log(`📁 Fichier credentials: ${credentialsFilename}`);

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

      // Configurer OAuth2
      const { client_secret, client_id, redirect_uris } = this.credentials.installed || this.credentials.web;
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

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

      // Tester la connexion et gérer l'expiration du token
      try {
        await this.testConnection();
      } catch (error) {
        if (error.message.includes('refresh token') || error.message.includes('invalid_grant')) {
          console.log('🔄 Token expiré ou invalide, nouvelle autorisation requise');
          return { 
            configured: false, 
            error: 'Token expiré - nouvelle autorisation requise',
            authUrl: await this.getAuthUrl(),
            needsReauth: true
          };
        }
        throw error;
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

    return this.auth.generateAuthUrl({
      access_type: 'offline', // Nécessaire pour obtenir un refresh_token
      scope: SCOPES,
      prompt: 'consent' // Force la demande de consentement pour obtenir le refresh_token
    });
  }

  /**
   * Échange le code d'autorisation contre un token
   */
  async exchangeCodeForToken(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      this.token = tokens;

      // Sauvegarder le token
      const tokenPath = path.join(process.cwd(), 'config', 'gmail-token.json');
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

      console.log('✅ Token Gmail sauvegardé');
      return { success: true, message: 'Autorisation Gmail réussie' };
    } catch (error) {
      console.error('❌ Erreur échange token:', error);
      throw error;
    }
  }

  /**
   * Test la connexion Gmail
   */
  async testConnection() {
    if (!this.gmail) {
      throw new Error('Gmail client non initialisé');
    }

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

      // Ajouter filtre de date si période personnalisée spécifiée
      if (dateFrom || dateTo) {
        console.log('🗓️ Utilisation période personnalisée:', { dateFrom, dateTo });
        
        if (dateFrom) {
          const fromStr = dateFrom.toISOString().split('T')[0].replace(/-/g, '/');
          query += ` after:${fromStr}`;
        }
        
        if (dateTo) {
          const toStr = dateTo.toISOString().split('T')[0].replace(/-/g, '/');
          query += ` before:${toStr}`;
        }
      }

      console.log('🔍 Recherche Gmail:', query);

      const searchResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query
        // Pas de limite maxResults - récupérer tous les emails correspondants
      });

      const messages = searchResponse.data.messages || [];
      console.log(`📧 Trouvé ${messages.length} emails correspondants`);

      // Récupérer les détails de chaque message
      const emailDetails = [];
      for (const message of messages) {
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
        totalFound: messages.length
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
      return {
        success: true,
        filePath: fullPath,
        filename: filename,
        size: data.length
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
              const downloadResult = await this.downloadAttachment(
                email.id,
                attachment.attachmentId,
                attachment.filename,
                downloadPath
              );

              if (downloadResult.success) {
                downloadedCount++;

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
}

module.exports = GmailService;
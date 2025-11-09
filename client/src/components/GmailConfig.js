import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GmailConfig.css';

const GmailConfig = () => {
  const [config, setConfig] = useState({
    enabled: false,
    sender: '',
    subject: 'okofen',
    senders: [''] // Tableau pour expéditrices multiples
  });
  
  const [status, setStatus] = useState({
    configured: false,
    loading: true,
    error: null
  });
  
  const [authUrl, setAuthUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    loadGmailConfig();
  }, []);

  const loadGmailConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/gmail/config`);
      
      // Migration de l'ancien format vers le nouveau
      let configData = response.data.config;
      if (configData.sender && !configData.senders) {
        configData.senders = configData.sender ? [configData.sender] : [''];
      }
      if (!configData.senders || configData.senders.length === 0) {
        configData.senders = [''];
      }
      
      setConfig(configData);
      setStatus({
        configured: response.data.configured,
        loading: false,
        error: null,
        details: response.data.status
      });
    } catch (error) {
      console.error('Erreur chargement config Gmail:', error);
      setStatus({
        configured: false,
        loading: false,
        error: error.response?.data?.error || 'Erreur de connexion'
      });
    }
  };

  const updateConfig = async () => {
    try {
      setProcessing(true);
      const response = await axios.post(`${API_URL}/api/boiler/gmail/config`, config);
      
      if (response.data.success) {
        await loadGmailConfig(); // Recharger pour avoir le statut à jour
      }
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
      setStatus({
        ...status,
        error: error.response?.data?.error || 'Erreur mise à jour'
      });
    }
    setProcessing(false);
  };

  const getAuthUrl = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/gmail/auth`);
      setAuthUrl(response.data.authUrl);
      
      // Ouvrir dans une nouvelle fenêtre
      window.open(response.data.authUrl, '_blank', 'width=500,height=600');
    } catch (error) {
      console.error('Erreur URL auth:', error);
      setStatus({
        ...status,
        error: error.response?.data?.error || 'Erreur autorisation'
      });
    }
  };

  // Fonctions de gestion des expéditeurs multiples
  const addSenderField = () => {
    setConfig(prev => ({
      ...prev,
      senders: [...prev.senders, '']
    }));
  };

  const removeSenderField = (index) => {
    setConfig(prev => ({
      ...prev,
      senders: prev.senders.filter((_, i) => i !== index)
    }));
  };

  const updateSender = (index, value) => {
    setConfig(prev => {
      const newSenders = [...prev.senders];
      newSenders[index] = value;
      return {
        ...prev,
        senders: newSenders
      };
    });
  };

  if (status.loading) {
    return (
      <div className="gmail-config">
        <div className="loading-container">
          <div className="loading-spinner">⏳ Chargement configuration Gmail...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gmail-config">
      <div className="gmail-header">
        <h2>📧 Configuration Gmail Automatique</h2>
        <p>Récupération automatique des emails Okofen avec pièces jointes CSV</p>
      </div>

      {/* Statut de configuration */}
      <div className={`config-status ${status.configured ? 'configured' : 'not-configured'}`}>
        <div className="status-indicator">
          <span className={`status-dot ${status.configured ? 'active' : 'inactive'}`}></span>
          <span className="status-text">
            {status.configured ? '✅ Gmail Configuré' : '⚠️ Gmail Non Configuré'}
          </span>
        </div>
        
        {status.error && (
          <div className="error-message">
            ❌ {status.error}
          </div>
        )}
      </div>

      {/* Configuration initiale */}
      {!status.configured && (
        <div className="setup-section">
          <h3>🔧 Configuration Initiale Requise</h3>
          
          <div className="setup-steps">
            <div className="step">
              <h4>1. 📋 Créer les Credentials Google</h4>
              <p>
                Rendez-vous sur <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                  Google Cloud Console
                </a> pour créer un projet et configurer l'API Gmail.
              </p>
              <ul>
                <li>Créer un nouveau projet ou sélectionner un projet existant</li>
                <li>Activer l'API Gmail</li>
                <li>Créer des identifiants OAuth 2.0</li>
                <li>Configurer l'URL de redirection: <code>http://localhost:3000/api/boiler/gmail/callback</code></li>
              </ul>
            </div>
            
            <div className="step">
              <h4>2. 💾 Sauvegarder les Credentials</h4>
              <p>
                Téléchargez le fichier JSON des credentials et sauvegardez-le sous:
              </p>
              <code>backend/config/gmail-credentials.json</code>
              
              <div className="file-example">
                <p><strong>Exemple de structure:</strong></p>
                <pre>{`{
  "installed": {
    "client_id": "votre-client-id.apps.googleusercontent.com",
    "client_secret": "votre-client-secret",
    "redirect_uris": ["http://localhost:3000/api/boiler/gmail/callback"]
  }
}`}</pre>
              </div>
            </div>
            
            <div className="step">
              <h4>3. 🔐 Autoriser l'Accès</h4>
              <button 
                onClick={getAuthUrl}
                className="btn-auth"
                disabled={processing}
              >
                Obtenir l'Autorisation Gmail
              </button>
              <p><small>Une nouvelle fenêtre s'ouvrira pour l'autorisation Google</small></p>
            </div>
          </div>

          {status.details?.setupUrl && (
            <div className="setup-link">
              <a 
                href={status.details.setupUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-setup"
              >
                🔧 Ouvrir Google Cloud Console
              </a>
            </div>
          )}
        </div>
      )}

      {/* Configuration avancée */}
      {status.configured && (
        <div className="config-section">
          <h3>⚙️ Paramètres de Récupération</h3>
          
          <div className="config-form">
            <div className="config-row">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({...config, enabled: e.target.checked})}
                />
                Activer la récupération Gmail automatique
              </label>
            </div>
            
            <div className="config-row">
              <label>Mots-clés dans le sujet:</label>
              <input
                type="text"
                value={config.subject}
                onChange={(e) => setConfig({...config, subject: e.target.value})}
                placeholder="X128812"
              />
            </div>
            
            {/* Gestion des adresses expéditrices multiples */}
            <div className="config-row">
              <label>📧 Adresses Expéditrices (Optionnel):</label>
              <div className="senders-list">
                {config.senders.map((sender, index) => (
                  <div key={index} className="sender-input-group">
                    <input 
                      type="email"
                      value={sender}
                      onChange={(e) => updateSender(index, e.target.value)}
                      placeholder="ex: no-reply@my.oekofen.info"
                      className="sender-input"
                    />
                    {config.senders.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeSenderField(index)}
                        className="btn-remove-sender"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={addSenderField}
                  className="btn-add-sender"
                >
                  ➕ Ajouter une Adresse
                </button>
              </div>
              <small>💡 <strong>Sans adresse :</strong> Recherche dans tous les emails</small>
            </div>
            
            <button 
              onClick={updateConfig}
              className="btn-save"
              disabled={processing}
            >
              💾 Sauvegarder Configuration
            </button>
          </div>
        </div>
      )}

      {/* Actions manuelles */}
      {status.configured && (
        <div className="actions-section">
          <h3>🚀 Actions</h3>
          
          <div className="actions-buttons">
            <button 
              onClick={loadGmailConfig}
              className="btn-refresh"
              disabled={processing}
            >
              🔄 Actualiser Statut
            </button>
          </div>
          
          <div className="info-box">
            <h4>📋 Fonctionnement Automatique</h4>
            <ul>
              <li>🕒 <strong>Vérification horaire:</strong> Le système vérifie automatiquement les nouveaux emails toutes les heures</li>
              <li>📧 <strong>Filtre intelligent:</strong> Recherche les emails avec pièces jointes CSV contenant les mots-clés configurés</li>
              <li>💾 <strong>Téléchargement:</strong> Les fichiers CSV sont téléchargés dans le dossier auto-downloads</li>
              <li>🔄 <strong>Import automatique:</strong> Les données sont immédiatement importées dans la base de données</li>
              <li>🏷️ <strong>Marquage:</strong> Les emails traités sont marqués avec le label "Okofen-Traité"</li>
            </ul>
          </div>
        </div>
      )}

      {processing && (
        <div className="processing-overlay">
          <div className="processing-spinner">⏳ Traitement en cours...</div>
        </div>
      )}
    </div>
  );
};

export default GmailConfig;
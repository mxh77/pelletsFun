import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faSave, faUndo, faFireFlameCurved, faEnvelope,
  faServer, faClock, faDatabase, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import './ConfigurationCenter.css';

const ConfigurationCenter = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('boiler');
  
  // Paramètres de la chaudière
  const [boilerConfig, setBoilerConfig] = useState({
    nominalPower: 15,
    pelletsPerKWh: 0.2,
    installationDate: ''
  });
  
  // Gmail - Authentification
  const [gmailConfig, setGmailConfig] = useState({
    isConfigured: false,
    lastSync: null,
    email: ''
  });
  
  // Import - Configuration complète
  const [importConfig, setImportConfig] = useState({
    senders: [''],
    subject: '',
    importIntervals: 1,
    cronSchedule: '0 8 * * *',
    cronEnabled: false,
    overwriteFiles: false
  });

  const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const loadAllConfigurations = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBoilerConfig(),
        loadGmailConfig(),
        loadImportConfig()
      ]);
    } catch (error) {
      console.error('Erreur chargement configurations:', error);
      setMessage('Erreur lors du chargement des configurations');
    }
    setLoading(false);
  };

  const loadBoilerConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/stats`);
      if (response.data?.config) {
        const installationDate = response.data.config.installationDate 
          ? new Date(response.data.config.installationDate).toISOString().split('T')[0] 
          : '';
        
        console.log('📅 Date installation brute:', response.data.config.installationDate);
        console.log('📅 Date installation formatée:', installationDate);
        
        setBoilerConfig({
          nominalPower: response.data.config.nominalPower || 15,
          pelletsPerKWh: response.data.config.pelletsPerKWh || 0.2,
          installationDate: installationDate
        });
      }
    } catch (error) {
      console.error('Erreur chargement config chaudière:', error);
    }
  };

  const loadGmailConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/gmail/config`);
      setGmailConfig({
        isConfigured: response.data.configured || false,
        lastSync: response.data.lastSync,
        email: response.data.email || ''
      });
    } catch (error) {
      console.error('Erreur chargement config Gmail:', error);
    }
  };

  const loadImportConfig = async () => {
    try {
      // Charger les config depuis les différents endpoints
      const [statsResp, cronResp, gmailResp] = await Promise.all([
        axios.get(`${API_URL}/api/boiler/stats`),
        axios.get(`${API_URL}/api/boiler/cron/status`),
        axios.get(`${API_URL}/api/boiler/gmail/config`)
      ]);
      
      console.log('📧 Réponse Gmail config:', gmailResp.data);
      
      const gmailConfig = gmailResp.data?.config || {};
      
      // S'assurer que senders n'est pas un tableau vide
      let senders = gmailConfig.senders || [''];
      if (Array.isArray(senders) && senders.length === 0) {
        senders = [''];
      }
      
      setImportConfig({
        senders: senders,
        subject: gmailConfig.subject || '',
        importIntervals: statsResp.data?.config?.importInterval || 5,
        cronSchedule: cronResp.data?.schedule || '0 6 * * *',
        cronEnabled: cronResp.data?.isActive || false,
        overwriteFiles: statsResp.data?.config?.overwriteFiles || false
      });
      
      console.log('📧 Config import chargée:', { senders, subject: gmailConfig.subject || '' });
    } catch (error) {
      console.error('Erreur chargement config import:', error);
    }
  };

  const saveBoilerConfig = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/boiler/config`, boilerConfig);
      setMessage('✅ Paramètres de la chaudière sauvegardés avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur sauvegarde config chaudière:', error);
      setMessage('❌ Erreur lors de la sauvegarde des paramètres chaudière');
    }
    setLoading(false);
  };

  const saveImportConfig = async () => {
    setLoading(true);
    try {
      console.log('💾 Sauvegarde config import:', importConfig);
      console.log('💾 SENDERS DÉTAIL:', importConfig.senders, 'LENGTH:', importConfig.senders.length);
      console.log('💾 PREMIER SENDER:', importConfig.senders[0], 'TYPE:', typeof importConfig.senders[0]);
      
      // Sauvegarder la configuration Gmail (senders et subject)
      const response = await axios.post(`${API_URL}/api/boiler/gmail/config`, {
        senders: importConfig.senders,
        subject: importConfig.subject,
        enabled: true
      });
      
      console.log('✅ Réponse serveur:', response.data);
      
      // NE PAS appeler /api/boiler/import/config car il écrase les senders !
      // TODO: Créer un endpoint séparé pour importInterval et overwriteFiles si nécessaire
      
      setMessage('✅ Configuration d\'import sauvegardée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur sauvegarde config import:', error);
      setMessage('❌ Erreur lors de la sauvegarde de la configuration d\'import');
    }
    setLoading(false);
  };

  const authorizeGmail = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/gmail/auth`);
      if (response.data?.authUrl) {
        window.open(response.data.authUrl, '_blank');
        setMessage('Vérifiez la nouvelle fenêtre pour l\'autorisation Gmail');
      }
    } catch (error) {
      console.error('Erreur autorisation Gmail:', error);
      setMessage('Erreur lors de l\'autorisation Gmail');
    }
  };

  const resetBoilerConfig = () => {
    setBoilerConfig({
      nominalPower: 15,
      pelletsPerKWh: 0.2,
      installationDate: ''
    });
  };

  // Fonctions utilitaires pour la gestion des listes
  const addSenderAddress = () => {
    setImportConfig({
      ...importConfig,
      senders: [...importConfig.senders, '']
    });
  };

  const removeSenderAddress = (index) => {
    const newAddresses = importConfig.senders.filter((_, i) => i !== index);
    setImportConfig({
      ...importConfig,
      senders: newAddresses.length > 0 ? newAddresses : ['']
    });
  };

  const updateSenderAddress = (index, value) => {
    const newAddresses = [...importConfig.senders];
    newAddresses[index] = value;
    setImportConfig({
      ...importConfig,
      senders: newAddresses
    });
  };



  const toggleCronJob = async () => {
    setLoading(true);
    try {
      const endpoint = importConfig.cronEnabled ? 'stop' : 'start';
      await axios.post(`${API_URL}/api/boiler/cron/${endpoint}`);
      setImportConfig({
        ...importConfig,
        cronEnabled: !importConfig.cronEnabled
      });
      setMessage(`⚙️ Traitement programmé ${importConfig.cronEnabled ? 'arrêté' : 'démarré'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur toggle cron:', error);
      setMessage('❌ Erreur lors de la modification du traitement programmé');
    }
    setLoading(false);
  };

  const updateCronSchedule = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/boiler/cron/update`, {
        schedule: importConfig.cronSchedule
      });
      setMessage('✅ Planning cron mis à jour avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur mise à jour cron:', error);
      setMessage('❌ Erreur lors de la mise à jour du planning');
    }
    setLoading(false);
  };

  return (
    <div className="configuration-center">
      <div className="config-header">
        <div className="header-left">
          <button onClick={onBack} className="btn btn-outline-secondary">
            ← Retour
          </button>
          <div className="header-title">
            <FontAwesomeIcon icon={faCog} className="header-icon" />
            <h2>Centre de Configuration</h2>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Erreur') ? 'alert-danger' : 'alert-success'}`}>
          {message}
          <button 
            type="button" 
            className="close" 
            onClick={() => setMessage('')}
          >
            <span>&times;</span>
          </button>
        </div>
      )}

      <div className="config-tabs">
        <div className="nav nav-tabs">
          <button 
            className={`nav-link ${activeTab === 'boiler' ? 'active' : ''}`}
            onClick={() => setActiveTab('boiler')}
          >
            <FontAwesomeIcon icon={faFireFlameCurved} /> Paramètres Chaudière
          </button>
          <button 
            className={`nav-link ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <FontAwesomeIcon icon={faClock} /> Import
          </button>
        </div>

        <div className="tab-content">
          {/* Paramètres de la chaudière */}
          {activeTab === 'boiler' && (
            <div className="config-panel">
              <div className="panel-header">
                <FontAwesomeIcon icon={faFireFlameCurved} />
                <h3>🔥 Paramètres de la Chaudière</h3>
              </div>
              
              <div className="config-form">
                <div className="form-group">
                  <label>⚡ Puissance Nominale (kW)</label>
                  <input
                    type="number"
                    value={boilerConfig.nominalPower}
                    onChange={(e) => setBoilerConfig({
                      ...boilerConfig,
                      nominalPower: parseFloat(e.target.value) || 15
                    })}
                    className="form-control"
                    step="0.1"
                    min="1"
                    max="50"
                  />
                  <small className="form-text text-muted">
                    Puissance nominale de votre chaudière à pellets
                  </small>
                </div>

                <div className="form-group">
                  <label>🌰 Consommation Pellets (kg/kWh)</label>
                  <input
                    type="number"
                    value={boilerConfig.pelletsPerKWh}
                    onChange={(e) => setBoilerConfig({
                      ...boilerConfig,
                      pelletsPerKWh: parseFloat(e.target.value) || 0.2
                    })}
                    className="form-control"
                    step="0.01"
                    min="0.1"
                    max="1"
                  />
                  <small className="form-text text-muted">
                    Consommation de pellets par kWh produit
                  </small>
                </div>

                <div className="form-group">
                  <label>📅 Date d'Installation</label>
                  <input
                    type="date"
                    value={boilerConfig.installationDate}
                    onChange={(e) => setBoilerConfig({
                      ...boilerConfig,
                      installationDate: e.target.value
                    })}
                    className="form-control"
                  />
                  <small className="form-text text-muted">
                    Date de mise en service de la chaudière
                  </small>
                </div>

                <div className="form-actions">
                  <button 
                    onClick={saveBoilerConfig}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <FontAwesomeIcon icon={faSave} /> Sauvegarder
                  </button>
                  <button 
                    onClick={resetBoilerConfig}
                    className="btn btn-outline-secondary"
                  >
                    <FontAwesomeIcon icon={faUndo} /> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gmail - Authentification */}
          {activeTab === 'gmail' && (
            <div className="config-panel">
              <div className="panel-header">
                <FontAwesomeIcon icon={faEnvelope} />
                <h3>📧 Gmail - Authentification</h3>
              </div>

              <div className="auth-status">
                <div className={`status-card ${gmailConfig.isConfigured ? 'authenticated' : 'not-authenticated'}`}>
                  <div className="status-icon">
                    <FontAwesomeIcon icon={faShieldAlt} />
                  </div>
                  <div className="status-info">
                    <h4>
                      {gmailConfig.isConfigured ? '✅ Gmail Authentifié' : '❌ Gmail Non Authentifié'}
                    </h4>
                    {gmailConfig.isConfigured && gmailConfig.email && (
                      <p>Compte connecté : <strong>{gmailConfig.email}</strong></p>
                    )}
                    {gmailConfig.lastSync && (
                      <p>Dernière synchronisation : {new Date(gmailConfig.lastSync).toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="config-form">
              <div className="config-help">
                <h5>🔐 Authentification Google</h5>
                <p>
                  Pour permettre au système d'accéder à vos emails Gmail et traiter automatiquement 
                  les fichiers CSV de données de chaudière, vous devez autoriser l'accès à votre compte Google.
                </p>
                {!gmailConfig.isConfigured && (
                  <div className="period-help">
                    ⚠️ L'authentification Gmail est requise pour le fonctionnement de l'import automatique.
                  </div>
                )}
              </div>                {!gmailConfig.isConfigured ? (
                  <button 
                    onClick={authorizeGmail}
                    className="btn-manual-import"
                  >
                    🔐 Autoriser l'accès Gmail
                  </button>
                ) : (
                  <button 
                    onClick={authorizeGmail}
                    className="btn-refresh-history"
                  >
                    🔄 Renouveler l'autorisation
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Import - Configuration complète */}
          {activeTab === 'import' && (
            <div className="config-panel">
              <div className="panel-header">
                <FontAwesomeIcon icon={faClock} />
                <h3>📥 Import - Configuration</h3>
              </div>
              
              <div className="config-form">
                {/* Authentification Gmail */}
                <div className="boiler-subsection">
                  <h4>🔐 Authentification Gmail</h4>
                  <div className="auth-status">
                    <div className={`status-card ${gmailConfig.isConfigured ? 'authenticated' : 'not-authenticated'}`}>
                      <div className="status-icon">
                        <FontAwesomeIcon icon={faShieldAlt} />
                      </div>
                      <div className="status-info">
                        <h4>
                          {gmailConfig.isConfigured ? '✅ Gmail Authentifié' : '❌ Gmail Non Authentifié'}
                        </h4>
                        {gmailConfig.isConfigured && gmailConfig.email && (
                          <p>Compte connecté : <strong>{gmailConfig.email}</strong></p>
                        )}
                        {gmailConfig.lastSync && (
                          <p>Dernière synchronisation : {new Date(gmailConfig.lastSync).toLocaleString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="config-help">
                    <p>
                      Pour permettre au système d'accéder à vos emails Gmail et traiter automatiquement 
                      les fichiers CSV de données de chaudière, vous devez autoriser l'accès à votre compte Google.
                    </p>
                    {!gmailConfig.isConfigured && (
                      <div className="period-help">
                        ⚠️ L'authentification Gmail est requise pour le fonctionnement de l'import automatique.
                      </div>
                    )}
                  </div>

                  {!gmailConfig.isConfigured ? (
                    <button 
                      onClick={authorizeGmail}
                      className="btn-manual-import"
                    >
                      🔐 Autoriser l'accès Gmail
                    </button>
                  ) : (
                    <button 
                      onClick={authorizeGmail}
                      className="btn-refresh-history"
                    >
                      🔄 Renouveler l'autorisation
                    </button>
                  )}
                </div>

                {/* Adresses Expéditrices */}
                <div className="boiler-subsection">
                  <h4>📧 Adresses Expéditrices</h4>
                  <p className="config-help">
                    💡 Adresses email autorisées à envoyer des données de chaudière
                  </p>
                  <div className="senders-list">
                    {importConfig.senders.map((address, index) => (
                      <div key={index} className="sender-input-group">
                        <input
                          type="email"
                          value={address}
                          onChange={(e) => updateSenderAddress(index, e.target.value)}
                          className="sender-input"
                          placeholder="no-reply@my.oekofen.info"
                        />
                        <button 
                          type="button"
                          onClick={() => removeSenderAddress(index)}
                          className="btn-remove-sender"
                          disabled={importConfig.senders.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={addSenderAddress}
                    className="btn-add-sender"
                  >
                    ➕ Ajouter une adresse
                  </button>
                </div>

                {/* Mot-clé dans le sujet */}
                <div className="boiler-subsection">
                  <h4>🔍 Mot-clé dans le sujet</h4>
                  <p className="config-help">
                    💡 Mot-clé à rechercher dans le sujet des emails (ex: X128812)
                  </p>
                  <input
                    type="text"
                    value={importConfig.subject}
                    onChange={(e) => setImportConfig({
                      ...importConfig,
                      subject: e.target.value
                    })}
                    className="sender-input"
                    placeholder="X128812"
                    style={{ width: '100%', marginBottom: '1rem' }}
                  />
                </div>

                {/* Intervalles d'import */}
                <div className="boiler-subsection">
                  <h4>⏰ Intervalles d'Import</h4>
                  <div className="config-group">
                    <label>Fréquence de vérification:</label>
                    <select 
                      value={importConfig.importIntervals}
                      onChange={(e) => setImportConfig({
                        ...importConfig,
                        importIntervals: parseInt(e.target.value)
                      })}
                      className="config-select"
                    >
                      <option value={5}>Toutes les 5 minutes</option>
                      <option value={10}>Toutes les 10 minutes</option>
                      <option value={15}>Toutes les 15 minutes</option>
                      <option value={30}>Toutes les 30 minutes</option>
                      <option value={60}>Toutes les heures</option>
                    </select>
                    <div className="config-help">
                      💡 <strong>Recommandé :</strong> 5-10 minutes pour réduire le volume de données
                    </div>
                  </div>
                </div>

                {/* Traitement programmé */}
                <div className="boiler-subsection">
                  <h4>⏰ Traitement Programmé Gmail</h4>
                  <div className="automation-item">
                    <div className="automation-header">
                      <h4>📅 Tâche Cron Gmail</h4>
                      <button 
                        onClick={toggleCronJob}
                        disabled={loading}
                        className={`btn-toggle ${importConfig.cronEnabled ? 'active' : 'inactive'}`}
                      >
                        {importConfig.cronEnabled ? '⏸️ Arrêter' : '▶️ Démarrer'}
                      </button>
                    </div>
                    <div className="cron-controls">
                      <input
                        type="text"
                        value={importConfig.cronSchedule}
                        onChange={(e) => setImportConfig({
                          ...importConfig,
                          cronSchedule: e.target.value
                        })}
                        placeholder="0 6 * * * (tous les jours à 6h)"
                        className="cron-input"
                      />
                      <button 
                        onClick={updateCronSchedule}
                        disabled={loading}
                        className="btn-update-cron"
                      >
                        📅 Mettre à jour
                      </button>
                    </div>
                  </div>
                </div>

                {/* Écraser les fichiers déjà importés */}
                <div className="boiler-subsection">
                  <h4>🔄 Options d'Import</h4>
                  <div className="import-options">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={importConfig.overwriteFiles}
                          onChange={(e) => setImportConfig({
                            ...importConfig,
                            overwriteFiles: e.target.checked
                          })}
                        />
                        <span className="checkbox-text">Écraser les fichiers existants</span>
                      </label>
                      <div className="option-help">
                        Si activé, les fichiers déjà importés seront remplacés par les nouvelles versions
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveImportConfig}
                  disabled={loading}
                  className="btn-primary"
                >
                  💾 Sauvegarder Configuration Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationCenter;
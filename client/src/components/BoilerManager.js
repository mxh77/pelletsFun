import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BoilerManager.css';

const BoilerManager = () => {
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({ nominalPower: 15, pelletsPerKWh: 0.2 });
  const [consumption, setConsumption] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoImportStatus, setAutoImportStatus] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [cronStatus, setCronStatus] = useState(null);
  const [cronSchedule, setCronSchedule] = useState('0 8 * * *'); // 8h du matin par défaut
  const [importHistory, setImportHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    loadStats();
    loadAutoImportStatus();
    loadCronStatus();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/stats`);
      setStats(response.data);
      setConfig(response.data.config);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadAutoImportStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/auto-import/status`);
      setAutoImportStatus(response.data);
    } catch (error) {
      console.error('Erreur chargement auto-import status:', error);
    }
  };

  const loadCronStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/cron/status`);
      setCronStatus(response.data);
      if (response.data.schedule) {
        setCronSchedule(response.data.schedule);
      }
    } catch (error) {
      console.error('Erreur chargement cron status:', error);
    }
  };

  const triggerManualImport = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/import/manual-trigger`);
      
      const result = response.data;
      
      if (result.success) {
        setImportResult({
          success: true,
          message: result.message,
          details: result.results,
          manualImport: true
        });
        
        // Recharger les statistiques après l'import
        await loadStats();
        await loadImportHistory();
      } else {
        setImportResult({
          error: result.error || 'Erreur lors de l\'import manuel',
          details: result.details
        });
      }
    } catch (error) {
      console.error('Erreur import manuel:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors du déclenchement de l\'import manuel'
      });
    }
    setLoading(false);
  };

  const getDetailedImportStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/import/status`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération statut import:', error);
      return null;
    }
  };

  const updateCronSchedule = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/cron/schedule`, {
        schedule: cronSchedule,
        enabled: true
      });
      
      setImportResult({
        success: true,
        message: response.data.message
      });
      
      await loadCronStatus();
    } catch (error) {
      console.error('Erreur mise à jour planning:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors de la mise à jour du planning' 
      });
    }
    setLoading(false);
  };

  const toggleCronJob = async () => {
    setLoading(true);
    try {
      const endpoint = cronStatus?.isActive ? 'stop' : 'start';
      const response = await axios.post(`${API_URL}/api/boiler/cron/${endpoint}`);
      
      setImportResult({
        success: true,
        message: response.data.message
      });
      
      await loadCronStatus();
    } catch (error) {
      console.error('Erreur toggle cron:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors du toggle du traitement automatique' 
      });
    }
    setLoading(false);
  };

  const handleImportCSV = async (filename) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/import`, { filename });
      setImportResult(response.data);
      await loadStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur import:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors de l\'import' 
      });
    }
    setLoading(false);
  };

  const calculateConsumption = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/boiler/consumption`, {
        params: dateRange
      });
      setConsumption(response.data);
    } catch (error) {
      console.error('Erreur calcul consommation:', error);
      setConsumption({ 
        error: error.response?.data?.error || 'Erreur lors du calcul' 
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    const results = [];
    
    try {
      // Traiter les fichiers un par un pour éviter les surcharges serveur
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          const formData = new FormData();
          formData.append('csvFile', file);

          const response = await axios.post(`${API_URL}/api/boiler/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          results.push({
            filename: file.name,
            success: true,
            data: response.data
          });
        } catch (error) {
          results.push({
            filename: file.name,
            success: false,
            error: error.response?.data?.error || error.message
          });
        }
      }

      // Afficher un résumé des imports
      const successCount = results.filter(r => r.success).length;
      const totalEntries = results
        .filter(r => r.success)
        .reduce((total, r) => total + (r.data.validEntries || 0), 0);

      setImportResult({
        success: true,
        message: `${successCount}/${selectedFiles.length} fichiers importés avec succès`,
        totalEntries: totalEntries,
        details: results
      });

      setSelectedFiles([]);
      await loadStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur upload multiple:', error);
      setImportResult({ 
        error: 'Erreur lors de l\'upload multiple'
      });
    }
    setLoading(false);
  };

  const toggleAutoImport = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/auto-import/toggle`, {
        enabled: !autoImportStatus?.isWatching
      });
      
      setAutoImportStatus(response.data.status);
      setImportResult({
        success: true,
        message: response.data.message
      });
    } catch (error) {
      console.error('Erreur toggle auto-import:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur toggle auto-import' 
      });
    }
    setLoading(false);
  };

  const checkForNewFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/auto-import/check`);
      setImportResult(response.data);
      await loadStats();
    } catch (error) {
      console.error('Erreur vérification:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors de la vérification' 
      });
    }
    setLoading(false);
  };

  const loadImportHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/boiler/import-history`);
      setImportHistory(response.data);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setImportHistory({ 
        error: error.response?.data?.error || 'Erreur lors du chargement de l\'historique' 
      });
    }
    setLoading(false);
  };

  const updateConfig = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/boiler/config`, config);
      await loadStats();
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
    }
    setLoading(false);
  };

  return (
    <div className="boiler-manager">
      <div className="boiler-header">
        <h2>🔥 Gestion Données Chaudière</h2>
        <p>Import et analyse des statistiques détaillées de consommation</p>
      </div>

      {/* Configuration chaudière */}
      <div className="boiler-section">
        <h3>⚙️ Configuration Chaudière</h3>
        <div className="config-form">
          <div className="config-group">
            <label>Puissance nominale (kW):</label>
            <input
              type="number"
              step="0.1"
              value={config.nominalPower}
              onChange={(e) => setConfig({...config, nominalPower: e.target.value})}
            />
          </div>
          <div className="config-group">
            <label>Consommation pellets (kg/kWh):</label>
            <input
              type="number"
              step="0.01"
              value={config.pelletsPerKWh}
              onChange={(e) => setConfig({...config, pelletsPerKWh: e.target.value})}
            />
          </div>
          <button 
            onClick={updateConfig} 
            disabled={loading}
            className="btn-primary"
          >
            Mettre à jour
          </button>
        </div>
      </div>

      {/* Upload CSV */}
      <div className="boiler-section">
        <h3>📁 Upload Fichier CSV Okofen</h3>
        <div className="upload-section">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="file-input"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="file-input-label">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''} sélectionné${selectedFiles.length > 1 ? 's' : ''}` 
                : 'Choisir des fichiers CSV...'
              }
            </label>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="selected-files-list">
              <h5>📋 Fichiers sélectionnés :</h5>
              <ul>
                {selectedFiles.map((file, index) => (
                  <li key={index} className="selected-file">
                    <span className="file-name">{file.name}</span>
                    <button 
                      onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                      className="btn-remove-file"
                      title="Supprimer ce fichier"
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button 
            onClick={handleFileUpload}
            disabled={loading || selectedFiles.length === 0}
            className="btn-upload"
          >
            📤 Uploader et Importer {selectedFiles.length > 0 ? `(${selectedFiles.length} fichiers)` : ''}
          </button>
        </div>

        <div className="import-controls">
          <h4>Import fichiers locaux :</h4>
          <button 
            onClick={() => handleImportCSV('touch_20251031.csv')}
            disabled={loading}
            className="btn-import"
          >
            Importer 31/10/2025
          </button>
          <button 
            onClick={() => handleImportCSV('touch_20251101.csv')}
            disabled={loading}
            className="btn-import"
          >
            Importer 01/11/2025
          </button>
        </div>
      </div>

      {/* Auto-Import Service */}
      <div className="boiler-section">
        <h3>🤖 Import Automatique</h3>
        <div className="auto-import-section">
          <div className="auto-import-status">
            <div className="status-indicator">
              <span className={`status-dot ${autoImportStatus?.isWatching ? 'active' : 'inactive'}`}></span>
              <span className="status-text">
                {autoImportStatus?.isWatching ? 'Surveillance Active' : 'Surveillance Inactive'}
              </span>
            </div>
            
            {autoImportStatus?.cronActive && (
              <div className="cron-status">
                ⏰ Vérification automatique programmée
              </div>
            )}
          </div>

          <div className="auto-import-controls">
            <button 
              onClick={toggleAutoImport}
              disabled={loading}
              className={`btn-toggle ${autoImportStatus?.isWatching ? 'active' : 'inactive'}`}
            >
              {autoImportStatus?.isWatching ? 'Désactiver' : 'Activer'} Auto-Import
            </button>
            
            <button 
              onClick={checkForNewFiles}
              disabled={loading}
              className="btn-check"
            >
              🔍 Vérifier Nouveaux Fichiers
            </button>
          </div>

          <div className="auto-import-info">
            <h5>📋 Instructions :</h5>
            <ul>
              <li>💾 <strong>Sauvegarde email :</strong> Enregistrez les fichiers CSV Okofen reçus par email dans le dossier racine du projet</li>
              <li>📂 <strong>Surveillance dossier :</strong> Activez l'auto-import pour surveiller automatiquement les nouveaux fichiers</li>
              <li>🔄 <strong>Import automatique :</strong> Les fichiers au format "touch_YYYYMMDD.csv" seront importés automatiquement</li>
              <li>📊 <strong>Archivage :</strong> Les fichiers traités sont archivés dans le dossier "processed"</li>
            </ul>
            
            <div className="file-pattern-info">
              <strong>Pattern de fichier attendu :</strong> <code>touch_YYYYMMDD.csv</code>
              <br />
              <small>Exemple: touch_20251103.csv</small>
            </div>
          </div>
        </div>

        {importResult && (
          <div className={`import-result ${importResult.error ? 'error' : 'success'}`}>
            {importResult.error ? (
              <p>❌ {importResult.error}</p>
            ) : (
              <div>
                <p>✅ {importResult.message}</p>
                
                {/* Résultats d'import manuel */}
                {importResult.manualImport && importResult.details && (
                  <div className="manual-import-details">
                    <h5>📊 Résultats de l'Import Manuel :</h5>
                    
                    <div className="import-stats-grid">
                      <div className="import-stat-card">
                        <span className="stat-number">{importResult.details.newEntries}</span>
                        <span className="stat-label">Nouvelles Entrées</span>
                      </div>
                      <div className="import-stat-card">
                        <span className="stat-number">{importResult.details.newFiles}</span>
                        <span className="stat-label">Nouveaux Fichiers</span>
                      </div>
                      <div className="import-stat-card">
                        <span className="stat-number">{importResult.details.entriesAfter.toLocaleString()}</span>
                        <span className="stat-label">Total Entrées</span>
                      </div>
                      <div className="import-stat-card">
                        <span className="stat-number">{importResult.details.filesAfter}</span>
                        <span className="stat-label">Total Fichiers</span>
                      </div>
                    </div>
                    
                    {importResult.details.serviceStats && (
                      <div className="service-stats">
                        <h6>🔧 Statistiques du Service :</h6>
                        <ul>
                          <li>📁 Fichiers traités: {importResult.details.serviceStats.filesProcessed}</li>
                          <li>⚠️ Doublons ignorés: {importResult.details.serviceStats.duplicatesSkipped}</li>
                          <li>📊 Total importé: {importResult.details.serviceStats.totalImported}</li>
                          <li>📈 Taux d'erreur: {importResult.details.serviceStats.errorRate}</li>
                        </ul>
                      </div>
                    )}
                    
                    {importResult.details.importDetails && (
                      <div className="gmail-import-details">
                        <h6>📧 Détails Gmail :</h6>
                        <p>
                          {importResult.details.importDetails.downloaded || 0} fichiers téléchargés, 
                          {importResult.details.importDetails.processed || 0} fichiers traités
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Résultats d'import de fichiers */}
                {!importResult.manualImport && (
                  <div>
                    {importResult.totalEntries && (
                      <p>Total entrées importées: {importResult.totalEntries}</p>
                    )}
                    {importResult.linesProcessed && (
                      <p>Lignes traitées: {importResult.linesProcessed}</p>
                    )}
                    {importResult.validEntries && (
                      <p>Entrées valides: {importResult.validEntries}</p>
                    )}
                  </div>
                )}
                
                {/* Détails des imports multiples */}
                {importResult.details && importResult.details.length > 1 && (
                  <div className="import-details">
                    <h5>📋 Détails par fichier :</h5>
                    <ul>
                      {importResult.details.map((detail, index) => (
                        <li key={index} className={`import-detail ${detail.success ? 'success' : 'error'}`}>
                          <span className="detail-icon">{detail.success ? '✅' : '❌'}</span>
                          <span className="detail-filename">{detail.filename}</span>
                          {detail.success ? (
                            <span className="detail-info">
                              - {detail.data.validEntries} entrées
                            </span>
                          ) : (
                            <span className="detail-error">- {detail.error}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Traitement Automatique Quotidien */}
      <div className="boiler-section">
        <h3>⏰ Traitement Automatique Quotidien</h3>
        <div className="cron-section">
          <div className="cron-status">
            <div className="status-indicator">
              <span className={`status-dot ${cronStatus?.isActive ? 'active' : 'inactive'}`}></span>
              <span className="status-text">
                {cronStatus?.isActive ? 'Traitement Activé' : 'Traitement Désactivé'}
              </span>
            </div>
            
            {cronStatus?.isActive && (
              <div className="cron-schedule">
                📅 Planning: {cronStatus.schedule} (Heure française)
              </div>
            )}
            
            {cronStatus?.lastRun && (
              <div className="last-run">
                🕒 Dernière exécution: {new Date(cronStatus.lastRun).toLocaleString('fr-FR')}
              </div>
            )}
          </div>

          <div className="cron-controls">
            <div className="schedule-input">
              <label htmlFor="cron-schedule">Planning (format cron):</label>
              <input
                id="cron-schedule"
                type="text"
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                placeholder="0 8 * * * (tous les jours à 8h)"
                className="cron-input"
              />
              <button 
                onClick={updateCronSchedule}
                disabled={loading}
                className="btn-update-cron"
              >
                📅 Mettre à jour Planning
              </button>
            </div>
            
            <button 
              onClick={toggleCronJob}
              disabled={loading}
              className={`btn-toggle-cron ${cronStatus?.isActive ? 'active' : 'inactive'}`}
            >
              {cronStatus?.isActive ? '⏸️ Arrêter' : '▶️ Démarrer'} Traitement Automatique
            </button>
            
            <button 
              onClick={triggerManualImport}
              disabled={loading}
              className="btn-manual-import"
            >
              🚀 Déclencher Import Maintenant
            </button>
          </div>

          <div className="cron-info">
            <h5>📋 Comment ça fonctionne :</h5>
            <ul>
              <li>🔍 <strong>Vérification automatique :</strong> Le système vérifie votre messagerie Gmail selon le planning défini</li>
              <li>📧 <strong>Détection des mails :</strong> Recherche automatique des nouveaux mails de votre chaudière Okofen</li>
              <li>📥 <strong>Téléchargement :</strong> Extraction et téléchargement automatique des fichiers CSV joints</li>
              <li>💾 <strong>Import en base :</strong> Traitement et import automatique des données dans MongoDB</li>
              <li>📊 <strong>Mise à jour :</strong> Actualisation automatique des statistiques et graphiques</li>
            </ul>
            
            <div className="cron-examples">
              <h5>💡 Exemples de planning :</h5>
              <table className="cron-table">
                <tbody>
                  <tr>
                    <td><code>0 8 * * *</code></td>
                    <td>Tous les jours à 8h00</td>
                  </tr>
                  <tr>
                    <td><code>0 6,18 * * *</code></td>
                    <td>Tous les jours à 6h00 et 18h00</td>
                  </tr>
                  <tr>
                    <td><code>0 9 * * 1</code></td>
                    <td>Tous les lundis à 9h00</td>
                  </tr>
                  <tr>
                    <td><code>*/30 * * * *</code></td>
                    <td>Toutes les 30 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {cronStatus?.stats && (
              <div className="cron-stats">
                <h5>📈 Statistiques :</h5>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Fichiers traités:</span>
                    <span className="stat-value">{cronStatus.stats.filesProcessed || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Erreurs:</span>
                    <span className="stat-value">{cronStatus.stats.errors || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historique des imports */}
      <div className="boiler-section">
        <h3>📋 Historique des Imports</h3>
        
        <div className="history-controls">
          <button 
            onClick={() => {
              if (!showHistory && !importHistory) {
                loadImportHistory();
              }
              setShowHistory(!showHistory);
            }}
            disabled={loading}
            className="btn-history-toggle"
          >
            📂 {showHistory ? 'Masquer' : 'Afficher'} l'Historique
          </button>
          
          {showHistory && importHistory && !importHistory.error && (
            <button 
              onClick={loadImportHistory}
              disabled={loading}
              className="btn-refresh-history"
            >
              🔄 Actualiser
            </button>
          )}
        </div>

        {showHistory && (
          <div className="import-history">
            {!importHistory ? (
              <div className="loading-history">⏳ Chargement de l'historique...</div>
            ) : importHistory.error ? (
              <div className="error-history">❌ {importHistory.error}</div>
            ) : (
              <div>
                <div className="history-summary">
                  <div className="summary-cards">
                    <div className="summary-card">
                      <span className="summary-number">{importHistory.totalFiles}</span>
                      <span className="summary-label">Fichiers</span>
                    </div>
                    <div className="summary-card">
                      <span className="summary-number">{importHistory.totalEntries.toLocaleString()}</span>
                      <span className="summary-label">Entrées</span>
                    </div>
                  </div>
                </div>

                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Fichier</th>
                        <th>Statut</th>
                        <th>Entrées</th>
                        <th>Période</th>
                        <th>Temp. Moy.</th>
                        <th>Import</th>
                        <th>Taille</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importHistory.files.map((file, index) => (
                        <tr key={index} className={`history-row ${file.status}`}>
                          <td className="file-name">
                            <span className="filename-icon">📄</span>
                            <span className="filename-text" title={file.filename}>
                              {file.filename}
                            </span>
                          </td>
                          <td className="file-status">
                            <span className={`status-badge ${file.status}`}>
                              {file.status === 'success' ? '✅' : '⚠️'}
                              {file.fileExists ? ' 💾' : ''}
                            </span>
                          </td>
                          <td className="file-entries">{file.totalEntries.toLocaleString()}</td>
                          <td className="file-period">
                            {file.dateRange.min === file.dateRange.max 
                              ? new Date(file.dateRange.min).toLocaleDateString()
                              : `${new Date(file.dateRange.min).toLocaleDateString()} → ${new Date(file.dateRange.max).toLocaleDateString()}`
                            }
                          </td>
                          <td className="file-temp">{file.avgOutsideTemp}°C</td>
                          <td className="file-import">{new Date(file.firstImport).toLocaleDateString()}</td>
                          <td className="file-size">
                            {file.fileExists ? `${file.fileSize} KB` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistiques générales */}
      {stats && (
        <div className="boiler-section">
          <h3>📊 Statistiques Générales</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Données</h4>
              <p>{stats.stats.totalEntries || 0} entrées</p>
            </div>
            <div className="stat-card">
              <h4>Runtime Total</h4>
              <p>{stats.totalRuntimeHours || 0}h</p>
            </div>
            <div className="stat-card">
              <h4>Consommation Estimée</h4>
              <p>{stats.estimatedTotalConsumptionKg || 0} kg</p>
            </div>
            <div className="stat-card">
              <h4>Fichiers Importés</h4>
              <p>{stats.stats.filesImported?.length || 0}</p>
            </div>
          </div>
          
          {stats.stats.minDate && (
            <p className="date-range">
              Période: {new Date(stats.stats.minDate).toLocaleDateString()} 
              → {new Date(stats.stats.maxDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Calcul consommation période */}
      <div className="boiler-section">
        <h3>🧮 Calcul Consommation Période</h3>
        <div className="date-form">
          <div className="date-group">
            <label>Date début:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
          </div>
          <div className="date-group">
            <label>Date fin:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
          </div>
          <button 
            onClick={calculateConsumption}
            disabled={loading || !dateRange.startDate || !dateRange.endDate}
            className="btn-calculate"
          >
            Calculer
          </button>
        </div>

        {consumption && (
          <div className="consumption-result">
            {consumption.error ? (
              <p className="error">❌ {consumption.error}</p>
            ) : (
              <div className="consumption-details">
                <h4>📈 Résultats de Consommation</h4>
                
                <div className="result-grid">
                  <div className="result-card">
                    <h5>⏰ Runtime</h5>
                    <p>{consumption.period.runtimeHours}h de fonctionnement</p>
                  </div>
                  
                  <div className="result-card">
                    <h5>🔥 Consommation</h5>
                    <p>{consumption.consumption.pelletKg} kg de pellets</p>
                  </div>
                  
                  <div className="result-card">
                    <h5>⚡ Puissance</h5>
                    <p>{consumption.consumption.effectivePowerKW} kW effectifs</p>
                  </div>
                  
                  <div className="result-card">
                    <h5>🌡️ Température</h5>
                    <p>{consumption.weather.avgOutsideTempC}°C moyenne</p>
                  </div>
                </div>

                <div className="modulation-info">
                  <p>
                    <strong>Modulation moyenne:</strong> {consumption.consumption.avgModulationPercent}%
                  </p>
                </div>

                {consumption.dailyStats && consumption.dailyStats.length > 0 && (
                  <div className="daily-stats">
                    <h5>📅 Statistiques Quotidiennes</h5>
                    <div className="stats-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Temp Min/Max</th>
                            <th>Modulation</th>
                            <th>Runtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consumption.dailyStats.map((day, index) => (
                            <tr key={index}>
                              <td>{new Date(day._id).toLocaleDateString()}</td>
                              <td>
                                {Math.round(day.minTemp * 10) / 10}° / {Math.round(day.maxTemp * 10) / 10}°
                              </td>
                              <td>{Math.round(day.avgModulation * 10) / 10}%</td>
                              <td>{Math.round((day.maxRuntime - day.minRuntime) * 10) / 10}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳ Traitement en cours...</div>
        </div>
      )}
    </div>
  );
};

export default BoilerManager;
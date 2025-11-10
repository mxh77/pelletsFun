import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BoilerManager.css';

const BoilerManager = () => {
  // États principaux
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({ nominalPower: 15, pelletsPerKWh: 0.2, importInterval: 1 });
  const [consumption, setConsumption] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoImportStatus, setAutoImportStatus] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [cronStatus, setCronStatus] = useState(null);
  const [cronSchedule, setCronSchedule] = useState('0 8 * * *');
  const [importHistory, setImportHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // États pour l'import manuel
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [manualImportPeriod, setManualImportPeriod] = useState({ dateFrom: '', dateTo: '' });

  // États pour les sections pliables
  const [expandedSections, setExpandedSections] = useState({
    configuration: true,
    importTraitement: true,
    analyseHistorique: false
  });

  const API_URL = process.env.REACT_APP_API_URL || '';

  // Fonction pour basculer l'état d'une section
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Chargement des données initiales
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

  const loadImportHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/boiler/import-history`);
      
      // Adapter la structure des données pour l'interface
      const adaptedData = {
        success: response.data.success,
        summary: {
          uniqueFiles: response.data.totalFiles,
          totalEntries: response.data.totalEntries
        },
        files: response.data.files.map(file => {
          // Calculer la date effective basée sur les données du fichier
          let effectiveDate = new Date(file.lastImport); // Fallback sur date import
          
          // D'abord essayer d'extraire la date du nom du fichier (ex: touch_20251031.csv)
          const dateMatch = file.filename.match(/(\d{8})/);
          if (dateMatch) {
            const dateStr = dateMatch[1]; // ex: "20251031"
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const extractedDate = new Date(`${year}-${month}-${day}`);
            
            if (!isNaN(extractedDate.getTime())) {
              effectiveDate = extractedDate;
            }
          }
          // Sinon utiliser dateRange.max si disponible
          else if (file.dateRange && file.dateRange.max) {
            effectiveDate = new Date(file.dateRange.max);
          }
          
          return {
            filename: file.filename,
            entryCount: file.totalEntries,
            lastImportDate: file.lastImport,
            effectiveDate: effectiveDate,
            avgFileSize: file.fileSize ? `${file.fileSize} KB` : 'N/A',
            dateRange: file.dateRange,
            avgOutsideTemp: file.avgOutsideTemp,
            status: file.status
          };
        })
      };
      
      setImportHistory(adaptedData);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions principales
  const updateConfig = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/api/boiler/config`, config);
      if (response.data.success) {
        setImportResult({ success: true, message: 'Configuration mise à jour avec succès' });
        await loadStats();
      }
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
      setImportResult({ error: 'Erreur lors de la mise à jour de la configuration' });
    }
    setLoading(false);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setImportResult({ error: 'Veuillez sélectionner au moins un fichier' });
      return;
    }

    setLoading(true);
    const results = [];

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('csvFile', file);

        const response = await axios.post(`${API_URL}/api/boiler/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        results.push({ file: file.name, ...response.data });
      } catch (error) {
        console.error('Erreur upload:', error);
        results.push({ file: file.name, error: error.response?.data?.error || 'Erreur upload' });
      }
    }

    setImportResult({ success: true, message: 'Upload terminé', results });
    setSelectedFiles([]);
    await loadStats();
    setLoading(false);
  };

  const toggleAutoImport = async () => {
    setLoading(true);
    try {
      const enabled = !autoImportStatus?.enabled;
      const response = await axios.post(`${API_URL}/api/boiler/auto-import/toggle`, { enabled });
      setAutoImportStatus(response.data);
      setImportResult({ 
        success: true, 
        message: enabled ? 'Auto-import activé' : 'Auto-import désactivé' 
      });
    } catch (error) {
      console.error('Erreur toggle auto-import:', error);
      setImportResult({ error: 'Erreur lors du changement d\'état de l\'auto-import' });
    }
    setLoading(false);
  };

  const checkNewFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/auto-import/check`);
      setImportResult(response.data);
      await loadStats();
    } catch (error) {
      console.error('Erreur vérification fichiers:', error);
      setImportResult({ error: 'Erreur lors de la vérification des nouveaux fichiers' });
    }
    setLoading(false);
  };

  const toggleCronJob = async () => {
    setLoading(true);
    try {
      const enabled = !cronStatus?.isActive;
      const response = await axios.post(`${API_URL}/api/boiler/cron/toggle`, { enabled });
      setCronStatus(response.data);
      setImportResult({ 
        success: true, 
        message: enabled ? 'Traitement automatique activé' : 'Traitement automatique désactivé' 
      });
    } catch (error) {
      console.error('Erreur toggle cron:', error);
      setImportResult({ error: 'Erreur lors du changement d\'état du traitement automatique' });
    }
    setLoading(false);
  };

  const updateCronSchedule = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/cron/schedule`, { schedule: cronSchedule });
      setCronStatus(response.data);
      setImportResult({ success: true, message: 'Planning mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur mise à jour planning:', error);
      setImportResult({ error: 'Erreur lors de la mise à jour du planning' });
    }
    setLoading(false);
  };

  const triggerManualImport = async () => {
    setLoading(true);
    try {
      const periodParams = {};
      if (manualImportPeriod.dateFrom) {
        periodParams.dateFrom = manualImportPeriod.dateFrom;
      }
      if (manualImportPeriod.dateTo) {
        periodParams.dateTo = manualImportPeriod.dateTo;
      }

      const response = await axios.post(`${API_URL}/api/boiler/import/manual-trigger`, periodParams);
      
      const result = response.data;
      
      if (result.success) {
        setImportResult({
          success: true,
          message: result.message,
          details: result.results,
          manualImport: true
        });
        
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

  const calculateConsumption = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setImportResult({ error: 'Veuillez sélectionner une période de dates' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/boiler/consumption`, dateRange);
      setConsumption(response.data);
      setImportResult({ success: true, message: 'Calcul de consommation effectué avec succès' });
    } catch (error) {
      console.error('Erreur calcul:', error);
      setImportResult({ error: error.response?.data?.error || 'Erreur lors du calcul' });
    }
    setLoading(false);
  };

  const deleteImportFile = async (filename) => {
    if (!filename) {
      setImportResult({ error: 'Nom de fichier manquant' });
      return;
    }

    // Demander confirmation
    const confirmDelete = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer l'import "${filename}" ?\n\n` +
      `Cette action supprimera :\n` +
      `• Toutes les données importées de ce fichier\n` +
      `• Le fichier physique (si présent)\n\n` +
      `Cette action est irréversible !`
    );

    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`${API_URL}/api/boiler/import/${encodeURIComponent(filename)}`);
      
      if (response.data.success) {
        setImportResult({ 
          success: true, 
          message: `✅ Import "${filename}" supprimé avec succès\n📊 ${response.data.deletedEntries} entrées supprimées`
        });
        
        // Recharger l'historique et les stats
        await loadImportHistory();
        await loadStats();
      } else {
        setImportResult({ error: response.data.error || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      console.error('Erreur suppression import:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors de la suppression de l\'import' 
      });
    }
    setLoading(false);
  };

  return (
    <div className="boiler-manager">
      <div className="boiler-header">
        <h2>🔥 Gestion Données Chaudière</h2>
        <p>Configuration, import et analyse des données de votre chaudière Okofen</p>
      </div>

      {/* 🔧 SECTION 1: CONFIGURATION */}
      <div className="main-section">
        <div 
          className="section-header clickable" 
          onClick={() => toggleSection('configuration')}
        >
          <div className="section-title">
            <span className="section-icon">
              {expandedSections.configuration ? '🔽' : '▶️'}
            </span>
            <h2>🔧 CONFIGURATION</h2>
          </div>
          <p className="section-description">Paramètres de la chaudière et configuration Gmail</p>
        </div>
        
        {expandedSections.configuration && (
          <div className="section-content">
            {/* Paramètres Chaudière */}
            <div className="boiler-subsection">
              <h3>⚙️ Paramètres de la Chaudière</h3>
              <div className="config-form">
                <div className="config-row">
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
                </div>
                
                <div className="config-group">
                  <label>📊 Intervalle d'import (minutes):</label>
                  <select
                    value={config.importInterval}
                    onChange={(e) => setConfig({...config, importInterval: parseInt(e.target.value)})}
                    className="config-select"
                  >
                    <option value={1}>Toutes les minutes (max données)</option>
                    <option value={2}>Toutes les 2 minutes</option>
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
                
                <button 
                  onClick={updateConfig} 
                  disabled={loading}
                  className="btn-primary"
                >
                  💾 Sauvegarder Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📥 SECTION 2: IMPORT & TRAITEMENT */}
      <div className="main-section">
        <div 
          className="section-header clickable" 
          onClick={() => toggleSection('importTraitement')}
        >
          <div className="section-title">
            <span className="section-icon">
              {expandedSections.importTraitement ? '🔽' : '▶️'}
            </span>
            <h2>📥 IMPORT & TRAITEMENT</h2>
          </div>
          <p className="section-description">Import manuel, automatisation et surveillance</p>
        </div>
        
        {expandedSections.importTraitement && (
          <div className="section-content">
            {/* Upload Manuel */}
            <div className="boiler-subsection">
              <h3>📁 Upload Manuel de Fichiers CSV</h3>
              <div className="upload-section">
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    className="file-input"
                  />
                  <div className="file-info">
                    {selectedFiles.length > 0 ? (
                      <p>✅ {selectedFiles.length} fichier(s) sélectionné(s)</p>
                    ) : (
                      <p>📄 Aucun fichier sélectionné</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={uploadFiles} 
                  disabled={loading || selectedFiles.length === 0}
                  className="btn-import"
                >
                  📤 Upload et Import
                </button>
              </div>
            </div>

            {/* Import Manuel Gmail */}
            <div className="boiler-subsection">
              <h3>🚀 Import Manuel depuis Gmail</h3>
              
              {/* Sélection de période */}
              <div className="manual-import-period">
                <h4>🗓️ Période par Date de Fichier (Optionnel)</h4>
                <div className="period-inputs">
                  <div className="date-input-group">
                    <label>📅 Du :</label>
                    <input 
                      type="date"
                      value={manualImportPeriod.dateFrom}
                      onChange={(e) => setManualImportPeriod(prev => ({...prev, dateFrom: e.target.value}))}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label>📅 Au :</label>
                    <input 
                      type="date"
                      value={manualImportPeriod.dateTo}
                      onChange={(e) => setManualImportPeriod(prev => ({...prev, dateTo: e.target.value}))}
                      className="date-input"
                    />
                  </div>
                </div>
                <div className="period-help">
                  💡 <strong>Filtrage par date du fichier</strong> (ex: touch_20251102.csv = 02/11/2025)<br/>
                  📧 <strong>Sans période :</strong> Import de tous les fichiers récents selon config Gmail
                </div>
              </div>
              
              <button 
                onClick={triggerManualImport}
                disabled={loading}
                className="btn-manual-import"
              >
                🚀 Déclencher Import Maintenant
              </button>
            </div>

            {/* Automatisation */}
            <div className="boiler-subsection">
              <h3>⏰ Automatisation</h3>
              <div className="automation-controls">
                <div className="automation-item">
                  <div className="automation-header">
                    <h4>🤖 Surveillance Auto-Import</h4>
                    <button 
                      onClick={toggleAutoImport}
                      disabled={loading}
                      className={`btn-toggle ${autoImportStatus?.enabled ? 'active' : 'inactive'}`}
                    >
                      {autoImportStatus?.enabled ? '⏸️ Désactiver' : '▶️ Activer'}
                    </button>
                  </div>
                  <p>Surveillance automatique du dossier pour nouveaux fichiers CSV</p>
                </div>

                <div className="automation-item">
                  <div className="automation-header">
                    <h4>⏰ Traitement Programmé Gmail</h4>
                    <button 
                      onClick={toggleCronJob}
                      disabled={loading}
                      className={`btn-toggle ${cronStatus?.isActive ? 'active' : 'inactive'}`}
                    >
                      {cronStatus?.isActive ? '⏸️ Arrêter' : '▶️ Démarrer'}
                    </button>
                  </div>
                  <div className="cron-controls">
                    <input
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
                      📅 Mettre à jour
                    </button>
                  </div>
                </div>

                <button 
                  onClick={checkNewFiles}
                  disabled={loading}
                  className="btn-check-files"
                >
                  🔍 Vérifier Nouveaux Fichiers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📊 SECTION 3: ANALYSE & HISTORIQUE */}
      <div className="main-section">
        <div 
          className="section-header clickable" 
          onClick={() => toggleSection('analyseHistorique')}
        >
          <div className="section-title">
            <span className="section-icon">
              {expandedSections.analyseHistorique ? '🔽' : '▶️'}
            </span>
            <h2>📊 ANALYSE & HISTORIQUE</h2>
          </div>
          <p className="section-description">Statistiques, calculs et historique des imports</p>
        </div>
        
        {expandedSections.analyseHistorique && (
          <div className="section-content">
            {/* Statistiques en temps réel */}
            <div className="boiler-subsection">
              <h3>📈 Statistiques en Temps Réel</h3>
              {stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <h4>📊 Entrées Totales</h4>
                    <p className="stat-number">{stats.totalEntries?.toLocaleString() || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>📁 Fichiers Importés</h4>
                    <p className="stat-number">{stats.totalFiles || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>📅 Période Couverte</h4>
                    <p className="stat-text">
                      {stats.dateRange ? `${stats.dateRange.start} → ${stats.dateRange.end}` : 'Aucune donnée'}
                    </p>
                  </div>
                  <div className="stat-card">
                    <h4>🔥 Puissance Configurée</h4>
                    <p className="stat-number">{stats.config.nominalPower} kW</p>
                  </div>
                </div>
              )}
            </div>

            {/* Calcul de consommation */}
            <div className="boiler-subsection">
              <h3>🧮 Calcul Consommation par Période</h3>
              <div className="consumption-form">
                <div className="date-range-inputs">
                  <div className="date-input-group">
                    <label>Date début:</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label>Date fin:</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      className="date-input"
                    />
                  </div>
                  <button 
                    onClick={calculateConsumption} 
                    disabled={loading}
                    className="btn-calculate"
                  >
                    🧮 Calculer
                  </button>
                </div>

                {consumption && (
                  <div className="consumption-result">
                    <h4>📊 Résultats du Calcul</h4>
                    <div className="consumption-stats">
                      <div className="consumption-card">
                        <h5>⏱️ Runtime Total</h5>
                        <p>{consumption.totalRuntime?.toFixed(1)} heures</p>
                      </div>
                      <div className="consumption-card">
                        <h5>🔥 Consommation Estimée</h5>
                        <p>{consumption.estimatedConsumption?.toFixed(1)} kg pellets</p>
                      </div>
                      <div className="consumption-card">
                        <h5>🌡️ Température Moyenne</h5>
                        <p>{consumption.avgOutsideTemp?.toFixed(1)}°C</p>
                      </div>
                      <div className="consumption-card">
                        <h5>📊 Modulation Moyenne</h5>
                        <p>{consumption.avgModulation?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Historique */}
            <div className="boiler-subsection">
              <h3>📋 Historique des Imports</h3>
              <div className="history-controls">
                <button 
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory && !importHistory) {
                      loadImportHistory();
                    }
                  }}
                  disabled={loading}
                  className="btn-history-toggle"
                >
                  {showHistory ? '📤 Masquer' : '📥 Afficher'} Historique
                </button>
                
                {showHistory && (
                  <button 
                    onClick={loadImportHistory}
                    disabled={loading}
                    className="btn-refresh-history"
                  >
                    🔄 Actualiser
                  </button>
                )}
              </div>

              {showHistory && importHistory && (
                <div className="history-display">
                  <div className="summary-cards">
                    <div className="summary-card">
                      <h4>📁 Fichiers Uniques</h4>
                      <p className="summary-number">{importHistory.summary?.uniqueFiles || 0}</p>
                    </div>
                    <div className="summary-card">
                      <h4>📊 Entrées Totales</h4>
                      <p className="summary-number">{importHistory.summary?.totalEntries?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  {importHistory.files && importHistory.files.length > 0 && (
                    <div>
                      <div className="history-table-container">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>📁 Fichier</th>
                            <th>📊 Entrées</th>
                            <th>📅 Date Import</th>
                            <th>📏 Taille</th>
                            <th>⚙️ Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importHistory.files.map((file, index) => (
                            <tr key={index}>
                              <td className="file-name">{file.filename}</td>
                              <td className="entry-count">{file.entryCount?.toLocaleString()}</td>
                              <td className="import-date">
                                {new Date(file.lastImportDate).toLocaleString('fr-FR')}
                              </td>
                              <td className="file-size">{file.avgFileSize || 'N/A'}</td>
                              <td className="actions-cell">
                                <button 
                                  onClick={() => deleteImportFile(file.filename)}
                                  disabled={loading}
                                  className="btn-delete-import"
                                  title={`Supprimer l'import "${file.filename}"`}
                                >
                                  🗑️
                                </button>
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
          </div>
        )}
      </div>

      {/* Affichage des résultats */}
      {importResult && (
        <div className={`result-message ${importResult.success ? 'success' : 'error'}`}>
          <h3>{importResult.success ? '✅ Succès' : '❌ Erreur'}</h3>
          <p>{importResult.message || importResult.error}</p>
          
          {importResult.details && importResult.manualImport && (
            <div className="import-details">
              <h4>📊 Détails de l'Import Manuel</h4>
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
                  <span className="stat-number">{importResult.details.totalEntries}</span>
                  <span className="stat-label">Total Entrées</span>
                </div>
                <div className="import-stat-card">
                  <span className="stat-number">{importResult.details.totalFiles}</span>
                  <span className="stat-label">Total Fichiers</span>
                </div>
              </div>
              
              {importResult.details.serviceStats && (
                <div className="service-stats">
                  <h5>🛠️ Statistiques Service</h5>
                  <div className="service-stats-grid">
                    <div className="service-stat">
                      <span>Fichiers traités: {importResult.details.serviceStats.filesProcessed}</span>
                    </div>
                    <div className="service-stat">
                      <span>Doublons ignorés: {importResult.details.serviceStats.duplicatesSkipped}</span>
                    </div>
                    <div className="service-stat">
                      <span>Total importé: {importResult.details.serviceStats.totalImported}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {importResult.details.gmailDetails && (
                <div className="gmail-import-details">
                  <h5>📧 Détails Gmail</h5>
                  <div className="gmail-details-grid">
                    <div className="gmail-detail">
                      <span>Fichiers téléchargés: {importResult.details.gmailDetails.downloaded}</span>
                    </div>
                    <div className="gmail-detail">
                      <span>Fichiers traités: {importResult.details.gmailDetails.processed}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {importResult.results && Array.isArray(importResult.results) && (
            <div className="upload-results">
              <h4>📋 Détails des Fichiers</h4>
              {importResult.results.map((result, index) => (
                <div key={index} className={`file-result ${result.error ? 'error' : 'success'}`}>
                  <strong>{result.file}</strong>: {result.message || result.error}
                  {result.linesProcessed && (
                    <span className="file-stats">
                      ({result.validEntries} entrées sur {result.linesProcessed} lignes)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <button 
            onClick={() => setImportResult(null)}
            className="btn-close-result"
          >
            ✕ Fermer
          </button>
        </div>
      )}
    </div>
  );
};

export default BoilerManager;
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
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  
  // États pour l'import manuel
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [manualImportPeriod, setManualImportPeriod] = useState({ dateFrom: '', dateTo: '' });
  const [manualImportOptions, setManualImportOptions] = useState({ overwriteExisting: false });
  
  // États pour le traitement asynchrone
  const [activeTask, setActiveTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);

  // États pour les sections pliables
  const [expandedSections, setExpandedSections] = useState({
    configuration: true,
    importTraitement: true,
    analyseHistorique: false
  });

  const API_URL = process.env.REACT_APP_API_URL || '';

  // Fonction utilitaire pour formater la taille des fichiers
  const formatFileSize = (sizeInKB) => {
    if (!sizeInKB || sizeInKB === 0) return 'N/A';
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    const sizeInMB = (sizeInKB / 1024).toFixed(1);
    return `${sizeInMB} MB`;
  };

  // Fonction pour obtenir le nom du mois en français
  const getMonthName = (monthIndex) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[parseInt(monthIndex)];
  };

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
      console.log('🔍 Auto-import status loaded:', response.data);
      console.log('🔍 isWatching value:', response.data?.isWatching);
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
      const processedFiles = response.data.files.map(file => {
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
          avgFileSize: formatFileSize(file.fileSize),
          avgOutsideTemp: file.avgOutsideTemp,
          status: file.status,
          // Nouvelles statistiques de la chaudière (avec valeurs par défaut sûres)
          activityRate: typeof file.activityRate === 'number' ? Math.round(file.activityRate * 10) / 10 : null,
          avgBoilerTemp: typeof file.avgBoilerTemp === 'number' ? Math.round(file.avgBoilerTemp * 10) / 10 : null,
          maxBoilerTemp: typeof file.maxBoilerTemp === 'number' ? Math.round(file.maxBoilerTemp * 10) / 10 : null,
          avgModulation: typeof file.avgModulation === 'number' ? Math.round(file.avgModulation * 10) / 10 : null,
          runtimeRange: typeof file.runtimeRange === 'string' ? file.runtimeRange : null,
          avgFanSpeed: typeof file.avgFanSpeed === 'number' ? Math.round(file.avgFanSpeed * 10) / 10 : null,
          activeEntries: typeof file.activeEntries === 'number' ? file.activeEntries : null
        };
      });

      // Organiser par année et mois
      const organizedByYear = {};
      processedFiles.forEach(file => {
        const year = file.effectiveDate.getFullYear().toString();
        const month = file.effectiveDate.getMonth(); // 0-11
        
        if (!organizedByYear[year]) {
          organizedByYear[year] = {};
        }
        
        if (!organizedByYear[year][month]) {
          organizedByYear[year][month] = [];
        }
        
        organizedByYear[year][month].push(file);
      });

      // Trier les fichiers de chaque mois par date (plus récent d'abord)
      Object.keys(organizedByYear).forEach(year => {
        Object.keys(organizedByYear[year]).forEach(month => {
          organizedByYear[year][month].sort((a, b) => b.effectiveDate - a.effectiveDate);
        });
      });

      const adaptedData = {
        success: response.data.success,
        summary: {
          uniqueFiles: response.data.totalFiles,
          totalEntries: response.data.totalEntries
        },
        files: processedFiles,
        organizedByYear: organizedByYear
      };

      // Sélectionner automatiquement l'année la plus récente
      const availableYears = Object.keys(organizedByYear).sort((a, b) => b - a);
      if (availableYears.length > 0 && !selectedYear) {
        setSelectedYear(availableYears[0]);
      }

      // Sélectionner automatiquement les 3 derniers mois (toutes années confondues) si aucune sélection
      if (selectedMonths.length === 0) {
        // Créer une liste de tous les mois disponibles avec leur date
        const allAvailableMonths = [];
        
        Object.keys(organizedByYear).forEach(year => {
          Object.keys(organizedByYear[year]).forEach(month => {
            // Prendre la date du fichier le plus récent de ce mois
            const latestFileDate = organizedByYear[year][month][0].effectiveDate;
            allAvailableMonths.push({
              yearMonth: `${year}-${month}`,
              date: latestFileDate
            });
          });
        });

        // Trier par date décroissante et prendre les 3 plus récents
        allAvailableMonths.sort((a, b) => b.date - a.date);
        const recentMonthIds = allAvailableMonths.slice(0, 3).map(item => item.yearMonth);
        
        if (recentMonthIds.length > 0) {
          setSelectedMonths(recentMonthIds);
        }
      }
      
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
      const enabled = !autoImportStatus?.isWatching;
      const response = await axios.post(`${API_URL}/api/boiler/auto-import/toggle`, { enabled });
      console.log('🔄 Toggle response:', response.data);
      setAutoImportStatus(response.data);
      
      // Recharger le statut pour être sûr
      await loadAutoImportStatus();
      
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
      const isActive = cronStatus?.isActive;
      const endpoint = isActive ? 'cron/stop' : 'cron/start';
      
      console.log(`🔄 ${isActive ? 'Arrêt' : 'Démarrage'} du cron job...`);
      const response = await axios.post(`${API_URL}/api/boiler/${endpoint}`);
      
      console.log('🔄 Cron response:', response.data);
      setCronStatus(response.data);
      
      // Recharger le statut pour être sûr
      await loadCronStatus();
      
      setImportResult({ 
        success: true, 
        message: isActive ? 'Traitement automatique arrêté' : 'Traitement automatique démarré' 
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
      const importParams = {};
      if (manualImportPeriod.dateFrom) {
        importParams.dateFrom = manualImportPeriod.dateFrom;
      }
      if (manualImportPeriod.dateTo) {
        importParams.dateTo = manualImportPeriod.dateTo;
      }
      
      // Ajouter l'option d'écrasement
      importParams.overwriteExisting = manualImportOptions.overwriteExisting || false;

      const response = await axios.post(`${API_URL}/api/boiler/import/manual-trigger`, importParams);
      
      const result = response.data;
      
      if (result.success && result.taskId) {
        // Import démarré en mode asynchrone
        setActiveTask(result.taskId);
        setTaskStatus(result.task);
        setTaskLogs([]);
        setImportResult({
          success: true,
          message: 'Import démarré en arrière-plan...',
          isAsync: true,
          taskId: result.taskId
        });

        // Commencer le polling du statut
        startTaskPolling(result.taskId);
      } else {
        setImportResult({
          error: result.error || 'Erreur lors de l\'import manuel',
          details: result.details
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur import manuel:', error);
      setImportResult({ 
        error: error.response?.data?.error || 'Erreur lors du déclenchement de l\'import manuel'
      });
      setLoading(false);
    }
  };

  // Polling du statut de la tâche
  const startTaskPolling = (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await axios.get(`${API_URL}/api/boiler/tasks/${taskId}/status`);
        const logsResponse = await axios.get(`${API_URL}/api/boiler/tasks/${taskId}/logs`);
        
        if (statusResponse.data.success) {
          const task = statusResponse.data.task;
          setTaskStatus(task);
          
          if (logsResponse.data.success) {
            setTaskLogs(logsResponse.data.logs);
          }

          // Arrêter le polling si la tâche est terminée
          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(pollInterval);
            setLoading(false);
            setActiveTask(null);

            if (task.status === 'completed') {
              setImportResult({
                success: true,
                message: 'Import terminé avec succès !',
                details: task.result,
                manualImport: true
              });
              await loadStats();
              await loadImportHistory();
            } else {
              setImportResult({
                error: `Import échoué: ${task.error}`,
                details: task.result
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur polling tâche:', error);
        // En cas d'erreur de polling, arrêter et afficher l'erreur
        clearInterval(pollInterval);
        setLoading(false);
        setActiveTask(null);
        setImportResult({
          error: 'Erreur de suivi de la tâche'
        });
      }
    }, 2000); // Polling toutes les 2 secondes

    // Nettoyer l'intervalle après 10 minutes maximum
    setTimeout(() => {
      clearInterval(pollInterval);
      if (activeTask) {
        setLoading(false);
        setActiveTask(null);
      }
    }, 600000);
  };

  const calculateConsumption = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setImportResult({ error: 'Veuillez sélectionner une période de dates' });
      return;
    }

    setLoading(true);
    try {
      // Construire l'URL avec les paramètres de query
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await axios.get(`${API_URL}/api/boiler/consumption?${params}`);
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
                  � <strong>Recherche élargie :</strong> Emails de J-2 à J+2 pour capturer tous les fichiers pertinents<br/>
                  � <strong>Sans période :</strong> Import de tous les fichiers récents selon config Gmail
                </div>
              </div>

              {/* Option d'écrasement */}
              <div className="import-options">
                <h4>⚙️ Options d'Import</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={manualImportOptions.overwriteExisting || false}
                      onChange={(e) => setManualImportOptions(prev => ({...prev, overwriteExisting: e.target.checked}))}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      🔄 <strong>Écraser les fichiers déjà importés</strong>
                    </span>
                  </label>
                  <div className="option-help">
                    {manualImportOptions.overwriteExisting ? 
                      "⚠️ Les données existantes seront remplacées par les nouvelles données" :
                      "✅ Les fichiers déjà traités seront ignorés (mode par défaut)"
                    }
                  </div>
                </div>
              </div>
              
              <button 
                onClick={triggerManualImport}
                disabled={loading || activeTask}
                className="btn-manual-import"
              >
                {activeTask ? '� Import en cours...' : '�🚀 Déclencher Import Maintenant'}
              </button>

              {/* Suivi de tâche asynchrone */}
              {activeTask && taskStatus && (
                <div className="task-progress">
                  <div className="task-header">
                    <h4>📊 Suivi de l'Import</h4>
                    <span className={`task-status ${taskStatus.status}`}>
                      {taskStatus.status === 'running' ? '🔄 En cours' :
                       taskStatus.status === 'completed' ? '✅ Terminé' :
                       taskStatus.status === 'failed' ? '❌ Échoué' : '⏳ En attente'}
                    </span>
                  </div>
                  
                  <div className="task-description">
                    {taskStatus.description}
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${taskStatus.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{taskStatus.progress || 0}%</span>
                  </div>
                  
                  {/* Étape actuelle */}
                  <div className="current-step">
                    <strong>Étape actuelle :</strong> {taskStatus.details?.currentStep || 'Initialisation...'}
                  </div>
                  
                  {/* Détails */}
                  {taskStatus.details && (
                    <div className="task-details">
                      {taskStatus.details.totalEmails > 0 && (
                        <div className="detail-item">
                          📧 Emails: {taskStatus.details.processedEmails || 0} / {taskStatus.details.totalEmails}
                        </div>
                      )}
                      {taskStatus.details.totalFiles > 0 && (
                        <div className="detail-item">
                          📄 Fichiers: {taskStatus.details.processedFiles || 0} / {taskStatus.details.totalFiles}
                        </div>
                      )}
                      {taskStatus.details.downloadedFiles > 0 && (
                        <div className="detail-item">
                          📥 Téléchargés: {taskStatus.details.downloadedFiles}
                        </div>
                      )}
                      {taskStatus.details.importedFiles > 0 && (
                        <div className="detail-item">
                          📊 Importés: {taskStatus.details.importedFiles}
                        </div>
                      )}
                      {taskStatus.details.errors > 0 && (
                        <div className="detail-item error">
                          ❌ Erreurs: {taskStatus.details.errors}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Logs récents */}
                  {taskLogs.length > 0 && (
                    <div className="task-logs">
                      <h5>📝 Logs récents</h5>
                      <div className="logs-container">
                        {taskLogs.slice(-5).map((log, index) => (
                          <div key={index} className={`log-entry ${log.level}`}>
                            <span className="log-time">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="log-message">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                      className={`btn-toggle ${autoImportStatus?.isWatching ? 'active' : 'inactive'}`}
                    >
                      {autoImportStatus?.isWatching ? '⏸️ Désactiver' : '▶️ Activer'}
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
                        <p>{consumption.period?.runtimeHours?.toFixed(1) || 0} heures</p>
                      </div>
                      <div className="consumption-card">
                        <h5>🔥 Consommation Estimée</h5>
                        <p>{consumption.consumption?.pelletKg?.toFixed(1) || 0} kg pellets</p>
                      </div>
                      <div className="consumption-card">
                        <h5>🌡️ Température Moyenne</h5>
                        <p>{consumption.weather?.avgOutsideTempC?.toFixed(1) || 0}°C</p>
                      </div>
                      <div className="consumption-card">
                        <h5>📊 Modulation Moyenne</h5>
                        <p>{consumption.consumption?.avgModulationPercent?.toFixed(1) || 0}%</p>
                      </div>
                    </div>
                    
                    {/* Période analysée */}
                    <div className="consumption-period">
                      <p><strong>📅 Période :</strong> {consumption.period?.startDate} au {consumption.period?.endDate}</p>
                      <p><strong>⚡ Puissance effective :</strong> {consumption.consumption?.effectivePowerKW || 0} kW</p>
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

                  {/* Système d'onglets à deux niveaux */}
                  {importHistory.organizedByYear && Object.keys(importHistory.organizedByYear).length > 0 && (
                    <div className="history-tabs-container">
                      {/* Onglets Niveau 1: Années */}
                      <div className="year-tabs">
                        {Object.keys(importHistory.organizedByYear)
                          .sort((a, b) => b - a)
                          .map(year => (
                            <button
                              key={year}
                              className={`year-tab ${selectedYear === year ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedYear(year);
                                // Ne plus changer automatiquement la sélection des mois
                              }}
                            >
                              📅 {year}
                            </button>
                          ))}
                      </div>

                      {/* Sélection multiple: Mois de l'année sélectionnée */}
                      {selectedYear && importHistory && importHistory.organizedByYear[selectedYear] && (
                        <div className="month-tabs">
                          <div className="month-checkboxes">
                            {/* Générer les mois de l'année sélectionnée uniquement */}
                            {Object.keys(importHistory.organizedByYear[selectedYear])
                              .sort((a, b) => b - a) // Mois décroissants
                              .map(month => {
                                const yearMonth = `${selectedYear}-${month}`;
                                const files = importHistory.organizedByYear[selectedYear][month];
                                
                                return (
                                  <label key={yearMonth} className="month-checkbox-label">
                                    <input
                                      type="checkbox"
                                      className="month-checkbox"
                                      checked={selectedMonths.includes(yearMonth)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMonths(prev => [...prev, yearMonth]);
                                        } else {
                                          setSelectedMonths(prev => prev.filter(m => m !== yearMonth));
                                        }
                                      }}
                                    />
                                    <span className="month-checkbox-text">
                                      <span>🗓️ {getMonthName(month)} {selectedYear}</span>
                                      <small className="files-count">
                                        ({files.length} fichiers)
                                      </small>
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Tableau des fichiers des mois sélectionnés */}
                      {selectedMonths.length > 0 && (
                        <div className="history-table-container">
                          <h4>📁 Fichiers de {selectedMonths.length === 1 
                            ? (() => {
                                const [year, month] = selectedMonths[0].split('-');
                                return `${getMonthName(month)} ${year}`;
                              })()
                            : `${selectedMonths.length} mois sélectionnés`}
                          </h4>
                          <table className="history-table">
                            <thead>
                              <tr>
                                <th>📁 Fichier</th>
                                <th>📊 Entrées</th>
                                <th>� Activité</th>
                                <th>🌡️ Temp. Moy.</th>
                                <th>📊 Modulation</th>
                                <th>⏱️ Runtime</th>
                                <th>📅 Date Effective</th>
                                <th>📏 Taille</th>
                                <th>⚙️ Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedMonths.flatMap(yearMonth => {
                                const [year, month] = yearMonth.split('-');
                                return importHistory.organizedByYear[year]?.[month] || [];
                              })
                              .sort((a, b) => b.effectiveDate - a.effectiveDate)
                              .map((file, index) => (
                                <tr key={index}>
                                  <td className="file-name">{file.filename}</td>
                                  <td className="entry-count">{file.entryCount?.toLocaleString()}</td>
                                  <td className="activity-cell">
                                    {file.activityRate !== null && file.activityRate !== undefined ? (
                                      <div className="activity-content">
                                        <span className={`activity-indicator ${file.activityRate > 50 ? 'high' : file.activityRate > 20 ? 'medium' : 'low'}`}>
                                          {file.activityRate > 50 ? '🔥' : file.activityRate > 20 ? '🟡' : '🔵'}
                                        </span>
                                        <span className="activity-rate">{file.activityRate}%</span>
                                      </div>
                                    ) : (
                                      <span className="activity-na">-</span>
                                    )}
                                  </td>
                                  <td className="temp-cell">
                                    {file.avgBoilerTemp !== null && file.avgBoilerTemp !== undefined ? (
                                      <>
                                        <span className="temp-value">{file.avgBoilerTemp}°C</span>
                                        {file.maxBoilerTemp !== null && file.maxBoilerTemp !== undefined && (
                                          <span className="temp-max"> (max: {file.maxBoilerTemp}°C)</span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="temp-na">-</span>
                                    )}
                                  </td>
                                  <td className="modulation-cell">
                                    {file.avgModulation !== null && file.avgModulation !== undefined ? (
                                      <span className={`modulation-value ${file.avgModulation > 70 ? 'high' : file.avgModulation > 40 ? 'medium' : 'low'}`}>
                                        {file.avgModulation}%
                                      </span>
                                    ) : (
                                      <span className="modulation-na">-</span>
                                    )}
                                  </td>
                                  <td className="runtime-cell">
                                    {file.runtimeRange !== null && file.runtimeRange !== undefined && file.runtimeRange !== '' ? (
                                      <span className="runtime-range">{file.runtimeRange}</span>
                                    ) : (
                                      <span className="runtime-na">-</span>
                                    )}
                                  </td>
                                  <td className="effective-date">
                                    {file.effectiveDate.toLocaleDateString('fr-FR')}
                                  </td>
                                  <td className="file-size">{file.avgFileSize || 'N/A'}</td>
                                  <td className="actions-cell">
                                    <button 
                                      onClick={() => deleteImportFile(file.filename)}
                                      disabled={false}
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
                      )}
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
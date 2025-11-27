import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faHistory, faChevronDown, faChevronRight, faEye, faDownload, faFile } from '@fortawesome/free-solid-svg-icons';
import ConfigurationCenter from './ConfigurationCenter';
import TemperatureChart from './TemperatureChart';
import RecoverMissingFilesDialog from './RecoverMissingFilesDialog';
import './BoilerManager.css';

const BoilerManager = () => {
  // États principaux
  const [importHistory, setImportHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // État pour la vue configuration
  const [showConfiguration, setShowConfiguration] = useState(false);
  
  // État pour le graphique de température
  const [showTemperatureChart, setShowTemperatureChart] = useState(false);
  
  // État pour le dialog de récupération
  const [showRecoverDialog, setShowRecoverDialog] = useState(false);
  const [selectedChartFile, setSelectedChartFile] = useState(null);

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

  // Chargement des données initiales
  useEffect(() => {
    if (!showConfiguration) {
      loadImportHistory();
    }
  }, [showConfiguration]);

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
          status: file.status,
          // Nouvelles statistiques de la chaudière (avec valeurs par défaut sûres)
          activityRate: typeof file.activityRate === 'number' ? Math.round(file.activityRate * 10) / 10 : null,
          avgOutsideTemp: typeof file.avgOutsideTemp === 'number' ? Math.round(file.avgOutsideTemp * 10) / 10 : null,
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
        totalFiles: response.data.totalFiles,
        totalEntries: response.data.totalEntries,
        yearMonthData: organizedByYear,
        processedFiles: processedFiles,
        // Add compatibility with old format
        organizedByYear: organizedByYear
      };

      setImportHistory(adaptedData);
      
      // Auto-sélectionner l'année courante ou la plus récente
      const years = Object.keys(organizedByYear).sort((a, b) => b - a);
      if (years.length > 0 && !selectedYear) {
        setSelectedYear(years[0]);
      }
      
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYearSelection = (year) => {
    setSelectedYear(year);
    // Reset month selection when changing year
    setSelectedMonths([]);
  };




  const downloadFile = async (filename) => {
    try {
      const response = await axios.get(`${API_URL}/api/boiler/download-file/${encodeURIComponent(filename)}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement fichier:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  // Fonction pour afficher le graphique de température
  const showTemperatureGraph = (filename) => {
    setSelectedChartFile(filename);
    setShowTemperatureChart(true);
  };

  const closeTemperatureChart = () => {
    setShowTemperatureChart(false);
    setSelectedChartFile(null);
  };
  
  // Fonction pour naviguer entre les fichiers dans le graphique
  const navigateToFile = (filename) => {
    setSelectedChartFile(filename);
  };
  
  // Obtenir la liste de tous les fichiers triés par date
  const getAllFilesSorted = () => {
    if (!importHistory) return [];
    
    const allFiles = [];
    Object.keys(importHistory).sort((a, b) => parseInt(a) - parseInt(b)).forEach(year => {
      Object.keys(importHistory[year]).sort((a, b) => parseInt(a) - parseInt(b)).forEach(monthIndex => {
        const monthData = importHistory[year][monthIndex];
        if (monthData && monthData.files && Array.isArray(monthData.files)) {
          monthData.files.forEach(file => {
            allFiles.push(file.filename);
          });
        }
      });
    });
    
    return allFiles;
  };

  // Si on affiche la configuration, retourner le composant de configuration
  if (showConfiguration) {
    return <ConfigurationCenter onBack={() => setShowConfiguration(false)} />;
  }

  return (
    <div className="boiler-manager">
      <div className="boiler-header">
        <div className="header-content">
          <div className="header-text">
            <h2>🔥 Gestion Données Chaudière</h2>
            <p>Historique des imports et configuration du système</p>
          </div>
          <button 
            onClick={() => setShowConfiguration(true)}
            className="btn btn-configuration"
          >
            <FontAwesomeIcon icon={faCog} /> Configuration
          </button>
        </div>
      </div>

      {/* Historique des Imports */}
      <div className="main-section">
        <div className="section-header">
          <div className="section-title">
            <FontAwesomeIcon icon={faHistory} className="section-icon" />
            <h3>📊 Historique des Imports</h3>
          </div>
          <button 
            className="btn-recover-files"
            onClick={() => setShowRecoverDialog(true)}
            title="Récupérer des fichiers manquants depuis Gmail"
          >
            🔄 Récupérer fichiers
          </button>
          <p className="section-description">
            Consultez l'historique complet des fichiers importés depuis Gmail et le système
          </p>
        </div>
        
        <div className="section-content">
          {loading && (
            <div className="loading-message">
              <div className="spinner"></div>
              <span>Chargement de l'historique...</span>
            </div>
          )}

          {importHistory && !loading && (
            <div className="import-history">
              {/* Résumé Global */}
              <div className="history-summary">
                <div className="summary-card">
                  <div className="card-icon">📁</div>
                  <div className="card-content">
                    <div className="card-number">{importHistory.totalFiles}</div>
                    <div className="card-label">Fichiers Importés</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <div className="card-number">{importHistory.totalEntries.toLocaleString()}</div>
                    <div className="card-label">Entrées Totales</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">📅</div>
                  <div className="card-content">
                    <div className="card-number">{Object.keys(importHistory.yearMonthData).length}</div>
                    <div className="card-label">Années Couvertes</div>
                  </div>
                </div>
              </div>

              {/* Système d'onglets à deux niveaux */}
              {importHistory.yearMonthData && Object.keys(importHistory.yearMonthData).length > 0 && (
                <div className="history-tabs-container">
                  {/* Onglets Niveau 1: Années */}
                  <div className="year-tabs">
                    {Object.keys(importHistory.yearMonthData)
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
                  {selectedYear && importHistory && importHistory.yearMonthData[selectedYear] && (
                    <div className="month-tabs">
                      <div className="month-checkboxes">
                        {/* Générer les mois de l'année sélectionnée uniquement */}
                        {Object.keys(importHistory.yearMonthData[selectedYear])
                          .sort((a, b) => b - a) // Mois décroissants
                          .map(month => {
                            const yearMonth = `${selectedYear}-${month}`;
                            const files = importHistory.yearMonthData[selectedYear][month];
                            
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
                                  <span>{getMonthName(month)}</span>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
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
                            <th>🔥 Activité</th>
                            <th>🌡️ Temp. Ext. Moy.</th>
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
                            return importHistory.yearMonthData[year]?.[month] || [];
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
                                {file.avgOutsideTemp !== null && file.avgOutsideTemp !== undefined ? (
                                  <>
                                    <span className="temp-value">{file.avgOutsideTemp}°C</span>
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
                                  onClick={() => showTemperatureGraph(file.filename)}
                                  className="btn-view-chart"
                                  title={`Graphique températures "${file.filename}"`}
                                >
                                  📊
                                </button>
                                <button 
                                  onClick={() => downloadFile(file.filename)}
                                  disabled={false}
                                  className="btn-delete-import"
                                  title={`Télécharger "${file.filename}"`}
                                >
                                  💾
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
      </div>

      {/* Modal graphique de température */}
      {showTemperatureChart && selectedChartFile && (
        <TemperatureChart 
          filename={selectedChartFile}
          onClose={closeTemperatureChart}
          allFiles={getAllFilesSorted()}
          onNavigate={navigateToFile}
        />
      )}

      {/* Dialog de récupération des fichiers manquants */}
      <RecoverMissingFilesDialog 
        isOpen={showRecoverDialog}
        onClose={() => setShowRecoverDialog(false)}
        onSuccess={() => {
          loadImportHistory();
        }}
      />

    </div>
  );
};

export default BoilerManager;
import React, { useState } from 'react';
import './RecoverMissingFilesDialog.css';

const RecoverMissingFilesDialog = ({ isOpen, onClose, onSuccess }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [forceDownload, setForceDownload] = useState(false);
  const [forceImport, setForceImport] = useState(false);
  const [skipGmail, setSkipGmail] = useState(false);
  const [skipImport, setSkipImport] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate) {
      alert('Veuillez sélectionner une date de début');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setResult(null);

    try {
      const response = await fetch('/api/boiler/recover-missing-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate: endDate || undefined,
          dryRun,
          forceDownload,
          forceImport,
          skipGmail,
          skipImport
        })
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
        setResult({ success: true, message: data.message });
        
        // Appeler onSuccess pour recharger l'historique
        if (onSuccess && !dryRun) {
          setTimeout(() => onSuccess(), 1000);
        }
      } else {
        setLogs(data.logs || []);
        setResult({ success: false, message: data.message, error: data.error });
      }
    } catch (error) {
      console.error('Erreur récupération fichiers:', error);
      setResult({ 
        success: false, 
        message: 'Erreur lors de la récupération des fichiers',
        error: error.message 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setLogs([]);
    setResult(null);
    setDryRun(true);
    setForceDownload(false);
    setForceImport(false);
    setSkipGmail(false);
    setSkipImport(false);
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content recover-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>🔄 Récupérer Fichiers Manquants</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="recover-form">
          <div className="form-section">
            <h3>📅 Période</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Date de début *</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">Date de fin (optionnel)</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>⚙️ Options</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  disabled={isRunning}
                />
                <span className="checkbox-text">
                  <strong>Mode simulation (--dry-run)</strong>
                  <small>Afficher les fichiers manquants sans les télécharger</small>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={forceDownload}
                  onChange={(e) => setForceDownload(e.target.checked)}
                  disabled={isRunning || dryRun}
                />
                <span className="checkbox-text">
                  <strong>Forcer le téléchargement (--force-download)</strong>
                  <small>Re-télécharger les fichiers même s'ils existent déjà</small>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={forceImport}
                  onChange={(e) => setForceImport(e.target.checked)}
                  disabled={isRunning || dryRun || skipImport}
                />
                <span className="checkbox-text">
                  <strong>Forcer l'import (--force-import)</strong>
                  <small>Ré-importer les données même si elles existent en base</small>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={skipGmail}
                  onChange={(e) => setSkipGmail(e.target.checked)}
                  disabled={isRunning || dryRun}
                />
                <span className="checkbox-text">
                  <strong>Ignorer Gmail (--skip-gmail)</strong>
                  <small>N'utiliser que les fichiers locaux existants</small>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={skipImport}
                  onChange={(e) => setSkipImport(e.target.checked)}
                  disabled={isRunning || dryRun}
                />
                <span className="checkbox-text">
                  <strong>Télécharger seulement (--skip-import)</strong>
                  <small>Télécharger les fichiers sans les importer en base</small>
                </span>
              </label>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="logs-section">
              <h3>📋 Logs d'exécution</h3>
              <div className="logs-container">
                {logs.map((log, index) => (
                  <div key={index} className="log-line">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              <div className="result-icon">
                {result.success ? '✅' : '❌'}
              </div>
              <div className="result-text">
                <strong>{result.message}</strong>
                {result.error && <div className="error-details">{result.error}</div>}
              </div>
            </div>
          )}

          <div className="dialog-actions">
            {!isRunning && result && (
              <button type="button" onClick={handleReset} className="btn-secondary">
                Nouvelle récupération
              </button>
            )}
            <button 
              type="submit" 
              disabled={isRunning}
              className="btn-primary"
            >
              {isRunning ? '⏳ En cours...' : '🚀 Lancer'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isRunning}
              className="btn-cancel"
            >
              Fermer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecoverMissingFilesDialog;

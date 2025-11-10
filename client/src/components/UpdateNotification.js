import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'react-bootstrap';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Écouter les messages du service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
          setShowNotification(true);
        }
      });

      // Vérifier les mises à jour au démarrage
      navigator.serviceWorker.ready.then(registration => {
        // Vérifier immédiatement
        checkForUpdates();
        
        // Vérifier périodiquement (toutes les 2 minutes)
        const interval = setInterval(checkForUpdates, 2 * 60 * 1000);
        return () => clearInterval(interval);
      });
    }
  }, []);

  const checkForUpdates = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CHECK_UPDATE'
      });
    }
  };

  const handleUpdateClick = () => {
    // Recharger la page pour appliquer la mise à jour
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowNotification(false);
    // Vérifier à nouveau dans 10 minutes
    setTimeout(() => setShowNotification(true), 10 * 60 * 1000);
  };

  if (!updateAvailable || !showNotification) {
    return null;
  }

  return (
    <div className="update-notification" style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 9999,
      maxWidth: '350px'
    }}>
      <Alert variant="info" className="mb-0">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <strong>🚀 Nouvelle version disponible !</strong>
            <br />
            <small>Actualisez pour profiter des dernières améliorations.</small>
          </div>
          <div className="ms-3">
            <Button 
              variant="info" 
              size="sm" 
              onClick={handleUpdateClick}
              className="me-2"
            >
              Actualiser
            </Button>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={handleDismiss}
            >
              ✕
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default UpdateNotification;
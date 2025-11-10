/**
 * Configuration centralisée des ports
 * UNIQUE SOURCE DE VÉRITÉ pour tous les ports de l'application
 */

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

// Ports par défaut selon l'environnement
const DEFAULT_BACKEND_PORT = isProduction ? 5000 : 3001;
const DEFAULT_FRONTEND_PORT = isProduction ? 80 : 3000;

const PORTS = {
  // Ports numériques
  BACKEND: parseInt(process.env.PORT) || DEFAULT_BACKEND_PORT,
  FRONTEND: parseInt(process.env.FRONTEND_PORT) || DEFAULT_FRONTEND_PORT,
  
  // URLs complètes
  BACKEND_URL: isProduction 
    ? (process.env.BACKEND_URL || 'https://pelletsfun.harmonixe.fr')
    : `http://localhost:${parseInt(process.env.PORT) || DEFAULT_BACKEND_PORT}`,
    
  FRONTEND_URL: isProduction
    ? (process.env.FRONTEND_URL || 'https://pelletsfun.harmonixe.fr')
    : `http://localhost:${parseInt(process.env.FRONTEND_PORT) || DEFAULT_FRONTEND_PORT}`,
};

// URLs de redirection Gmail (callback)
PORTS.GMAIL_CALLBACK_URL = `${PORTS.BACKEND_URL}/api/boiler/gmail/callback`;

// Origins autorisés pour CORS
PORTS.CORS_ORIGINS = isProduction 
  ? ['https://mxh77.github.io', 'https://pelletsfun.harmonixe.fr']
  : [PORTS.FRONTEND_URL, 'https://mxh77.github.io', 'https://pelletsfun.harmonixe.fr'];

console.log('🔧 Configuration ports:', {
  environnement: isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT',
  backend: PORTS.BACKEND_URL,
  frontend: PORTS.FRONTEND_URL,
  gmailCallback: PORTS.GMAIL_CALLBACK_URL,
  corsOrigins: PORTS.CORS_ORIGINS
});

module.exports = PORTS;
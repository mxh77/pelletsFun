import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker'; // Importez le service worker

ReactDOM.render(<App />, document.getElementById('root'));

// Enregistrez le service worker
serviceWorker.register();
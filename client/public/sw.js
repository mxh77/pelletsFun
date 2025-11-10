// Service Worker pour PelletsFun
const CACHE_NAME = 'pelletsfun-v' + Date.now();
const STATIC_CACHE_URLS = [];

// Installation du service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Install');
  // Prendre le contrôle immédiatement
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate');
  
  // Nettoyer les anciens caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('pelletsfun-v')) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre le contrôle de toutes les pages
  return self.clients.claim();
});

// Intercepter les requêtes réseau
self.addEventListener('fetch', event => {
  // Stratégie "Network First" pour toujours avoir la dernière version
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la requête réussit, mettre en cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, utiliser le cache
        return caches.match(event.request);
      })
  );
});

// Notification de mise à jour disponible
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Vérifier s'il y a une mise à jour
    fetch('/index.html')
      .then(response => response.text())
      .then(html => {
        // Comparer avec la version en cache
        caches.match('/index.html')
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse.text();
            }
            return '';
          })
          .then(cachedHtml => {
            if (html !== cachedHtml) {
              // Envoyer message de mise à jour disponible
              event.ports[0].postMessage({
                type: 'UPDATE_AVAILABLE'
              });
            } else {
              event.ports[0].postMessage({
                type: 'NO_UPDATE'
              });
            }
          });
      });
  }
});
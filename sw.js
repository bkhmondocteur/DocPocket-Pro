const CACHE_NAME = 'docpocket-pro-cache-v3';

// Liste des éléments vitaux pour le fonctionnement hors-ligne
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// 1. INSTALLATION : Mise en cache des nouveaux fichiers
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (let asset of ASSETS_TO_CACHE) {
                try {
                    // `{ mode: 'no-cors' }` permet de forcer la mise en cache des liens externes
                    await cache.add(new Request(asset, { mode: 'cors', credentials: 'omit' }));
                } catch (err) {
                    console.warn('Impossible de mettre en cache : ', asset);
                }
            }
        })
    );
});

// 2. ACTIVATION : Nettoyage de votre ancien cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. INTERCEPTION : Fonctionnement en mode avion
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Renvoie le fichier depuis le téléphone s'il est en mode avion
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // Sinon, va le chercher sur internet et le met en cache pour la prochaine fois
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // En cas de coupure totale, renvoie vers l'application
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

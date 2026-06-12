// HSD Service Worker — v1.0
const CACHE_NAME = 'hsd-v1';

// Ressources à mettre en cache pour le mode hors-ligne
const PRECACHE = [
  './horloge-industrie.html',
  './manifest.json',
  // Polices Google Fonts en fallback (si déjà chargées)
];

// Polices et ressources externes à cacher à la première visite
const CACHE_ON_FETCH = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── Installation : précache des ressources locales ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── Activation : nettoyage des anciens caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch : stratégie cache-first pour les polices, network-first pour le reste
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Polices : cache-first (elles ne changent pas)
  const isFont = CACHE_ON_FETCH.some(domain => url.hostname.includes(domain));
  if (isFont) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // App locale : network-first avec fallback cache
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Tout le reste : network only (calculs astronomiques = pas besoin de cache)
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ─── Messages depuis l'app ────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

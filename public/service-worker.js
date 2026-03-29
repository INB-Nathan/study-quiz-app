const CACHE_NAME = 'study-quiz-v1';
const PRECACHE_URLS = [
  '/',
  '/questions.json',
  '/manifest.json',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Cache-First for static assets and questions.json
// - Network-First for API calls (fall back gracefully)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls: Network-First with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() =>
          caches.open(CACHE_NAME).then((cache) =>
            cache.match('/questions.json').then((cached) => {
              if (cached) {
                return new Response(
                  JSON.stringify({ offline: true, cached: true }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                  }
                );
              }
              return new Response(
                JSON.stringify({ offline: true, cached: false }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            })
          )
        )
    );
    return;
  }

  // Static assets and questions.json: Cache-First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (request.mode === 'navigate') {
            return caches.match('/') || new Response('Offline', { status: 503 });
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

const CACHE_NAME = 'smartpos-cache-v2';   // bumped version to avoid stale cache
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/api.js',
  '/assets/js/auth.js',
  '/assets/js/components.js',
  '/assets/js/utils.js',
  '/assets/js/pos.js',
  '/assets/js/dashboard.js',
  '/assets/js/inventory.js',
  '/assets/js/reports.js',
  '/assets/js/expenses.js',
  '/assets/js/users.js',
  '/assets/js/notifications.js',
  '/assets/js/settings.js',
  '/assets/js/ai.js',
  '/assets/js/contact.js',
  '/assets/js/transfers.js',
  '/assets/js/customers.js',          // ← added the new Customers page
  '/assets/js/router.js',
  '/assets/js/app.js',
  '/assets/js/cleanup.js',
  '/offline/db.js',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Install – cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service worker: caching static assets');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate – clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('Service worker: deleting old cache', key);
          return caches.delete(key);
        })
      );
    })
  );
});

// Fetch – cache‑first for static files, network‑only for API calls
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // If the request is an API call, skip the cache entirely and go straight to the network
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network is unavailable, you could return a custom offline response
        return new Response(JSON.stringify({ error: 'You are offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For all other requests (static assets, HTML), try cache first, then network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // Optionally, you can add the response to the cache for future offline use
        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, the request fails (the browser will show its default offline page)
        return new Response('You are offline and this resource is not cached.', {
          status: 503
        });
      });
    })
  );
});
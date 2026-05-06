const CACHE_NAME = 'smartpos-cache-v1';
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate – clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch – serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
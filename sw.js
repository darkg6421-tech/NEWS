// Service Worker for NewsHub
const CACHE_NAME = 'newshub-v1';

// Get base path automatically
const basePath = self.location.pathname.replace('sw.js', '');

const urlsToCache = [
  basePath,
  basePath + 'index.html',
  basePath + 'about.html',
  basePath + 'contact.html',
  basePath + 'privacy.html',
  basePath + 'script.js',
  basePath + 'manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened for:', basePath);
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch and Cache Strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

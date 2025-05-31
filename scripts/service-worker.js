const CACHE_NAME = 'prigoana-cache-v1';

const cacheAllowList = [
  '/style.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(cacheAllowList);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Exclude index.html and script.js
  if (url.pathname === '/index.html' || url.pathname.endsWith('/script.js')) {
    return;
  }

  // Cache /music/ files and style.css
  if (url.pathname.startsWith('/music/') || url.pathname === '/style.css') {
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request).then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          })
        );
      })
    );
  }
});

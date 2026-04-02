// Service Worker for Push Notifications & Asset Caching

const LOTTIE_CACHE = 'lottie-cache-v1';
const LOTTIE_URLS = [
  'https://lottie.host/d72a25f9-a7ee-4f28-a766-4dc73dc2c3da/1lhDyKDC8f.lottie'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  // Pre-cache lottie animation
  event.waitUntil(
    caches.open(LOTTIE_CACHE).then((cache) => {
      return cache.addAll(LOTTIE_URLS).catch((err) => {
        console.warn('Failed to pre-cache lottie:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Cache-first strategy for lottie assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('lottie.host') || url.endsWith('.lottie')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(LOTTIE_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  const data = event.data?.json() || {};
  const title = data.title || 'New Upload on World!';
  const options = {
    body: data.body || 'A new PDF has been uploaded',
    icon: '/mridulpdf_logo.png',
    badge: '/mridulpdf_logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'world-upload',
    requireInteraction: false,
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

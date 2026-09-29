// sw.js - Service Worker for 365-Day Desk Calendar PWA with Web Push Notifications
const CACHE_NAME = 'mindset-calendar-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './quotes.json',
  './css/style.css',
  './js/app.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

// Helper to strip the "redirected: true" flag which causes Safari to throw:
// "Response served by service worker has redirections"
async function cleanResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }
  const headers = new Headers(response.headers);
  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell & quotes data');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Navigation requests (Opening the app from Home Screen)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Try network first, then cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const cleaned = await cleanResponse(networkResponse);
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, cleaned.clone());
            return cleaned;
          }
        } catch (err) {}

        // Fallback to cached index.html or root
        const cached = await caches.match('./') || await caches.match('./index.html');
        if (cached) return cached;

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // 2. Static Assets & Quotes Data
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) {
        // Background revalidate for same-origin assets
        if (url.origin === location.origin) {
          fetch(event.request).then(async (netRes) => {
            if (netRes && netRes.status === 200) {
              const cleaned = await cleanResponse(netRes);
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, cleaned);
            }
          }).catch(() => {});
        }
        return cached;
      }

      try {
        const netRes = await fetch(event.request);
        if (netRes && netRes.status === 200) {
          const cleaned = await cleanResponse(netRes);
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, cleaned.clone());
          return cleaned;
        }
        return cleanResponse(netRes);
      } catch (err) {
        return cached || new Response('', { status: 404 });
      }
    })()
  );
});

// ==========================================
// WEB PUSH NOTIFICATION HANDLERS (iOS 16.4+)
// ==========================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🌅 Lịch Để Bàn 365 - Mindset Fuel';
  const options = {
    body: data.body || 'Chạm để nạp năng lượng tư duy hôm nay!',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    data: {
      url: data.url || './index.html',
      day: data.day
    },
    vibrate: [200, 100, 200],
    tag: 'daily-mindset-reminder',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

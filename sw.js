// =============================================
// FOOD DROP - Service Worker v1.0
// Caches static assets for offline/fast loading
// =============================================

const CACHE_NAME = 'food-drop-v1.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  // Leaflet CSS & JS (cached from CDN on first load)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // Tailwind CDN
  'https://cdn.tailwindcss.com',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap'
];

// ── Install: cache tất cả static assets ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing FOOD DROP Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching static assets...');
      // Cache từng file, bỏ qua nếu lỗi (CDN có thể block cross-origin cache)
      const promises = STATIC_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn(`[SW] Could not cache ${url}:`, err))
      );
      return Promise.allSettled(promises);
    })
  );
  // Kích hoạt SW ngay lập tức mà không cần chờ tab cũ đóng
  self.skipWaiting();
});

// ── Activate: xóa cache cũ ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating FOOD DROP Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Kiểm soát tất cả tabs ngay lập tức
      return self.clients.claim();
    })
  );
});

// ── Fetch: Chiến lược Cache-first cho static, Network-first cho Firebase ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua Firebase API calls & chrome-extension (không cache)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.protocol === 'chrome-extension:'
  ) {
    return; // Để browser xử lý bình thường
  }

  // Map tiles từ OpenStreetMap - Cache with network fallback
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('osm-tiles-cache').then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Static assets - Cache First strategy
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Cập nhật cache ngầm (Stale-while-revalidate)
        fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {}); // Im lặng nếu offline
        return cachedResponse;
      }
      // Không có trong cache → fetch từ network
      return fetch(request).then(networkResponse => {
        if (!networkResponse || !networkResponse.ok) return networkResponse;
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline fallback: trả về index.html cho navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Background Sync (tương lai có thể thêm) ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

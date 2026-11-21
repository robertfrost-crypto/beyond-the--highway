// Beyond the Highway — service worker
// Bump CACHE whenever you redeploy new content so installed users get the update prompt.
const CACHE = 'bth-v37';

// Cached for offline. Spoke pages are added here as they're built.
const ASSETS = [
  './', 'index.html', 'onnow.html', 'manifest.json', 'admin.html',
  'journey.js', 'hub-links.js', 'assets/bus.webp', 'aurora-bg.jpg',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'onnow-icon-180.png', 'onnow-icon-192.png',
  'stories.html', 'trails.html', 'mystery-tours.html',
  'places.html', 'sports.html', 'facilities.html',
  'local-hub.html', 'local-business.html', 'local-business-hero.jpg',
  'local-news.html',
  'event.html', 'submit-event.html', 'llms.txt', 'assets/cards/onnow.webp', 'assets/cards/trails-hero.webp', 'assets/cards/hub-business.webp', 'assets/cards/hub-classifieds.webp', 'assets/cards/hub-news.webp', 'assets/cards/aboriginal-wide.webp', 'bth-blue.css', 'assets/cards/journey-sunset.webp', 'assets/cards/map.webp', 'assets/cards/stories.webp', 'assets/cards/trails.webp', 'assets/cards/mystery.webp', 'assets/cards/aboriginal.webp', 'assets/cards/things.webp', 'assets/cards/localhub.webp', 'assets/cards/localnews.webp', 'assets/cards/coupons.webp', 'assets/cards/sports.webp', 'assets/cards/events.webp', 'assets/cards/recommend.webp'
];

// Install: cache what exists, ignore anything not built yet (so install never fails).
// skipWaiting() forces this new worker to activate immediately instead of sitting
// "waiting" until every open tab/app instance is fully closed — that waiting state
// was why deployed updates weren't showing up on phones/PWAs.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // cache:'reload' skips the browser's own HTTP cache so we store the freshly deployed files
      Promise.allSettled(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// Activate: drop old caches, take control.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: never cache backend calls. Pages (any .html or page navigation),
// push-signup.js and admin.html are network-first: always try the freshly
// deployed version, fall back to the saved copy only when offline. That way
// page updates show up on phones right away without needing a CACHE bump.
// Images, scripts and other files stay cache-first for speed.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/.netlify/')) return;          // live data, always network
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;                 // other sites (Supabase, fonts, Mailchimp images): leave alone

  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage || url.pathname.endsWith('push-signup.js')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // keep the cache warm for same-origin GETs
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

// Let the page tell a waiting worker to activate immediately (the "Refresh" button).
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Push: display the notification sent by the BTH sending function.
// Expected payload (JSON): { title, body, url, topic }
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = {}; }

  const title = data.title || 'Beyond the Highway';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url || './' },
    tag: data.topic || 'bth-update',   // same topic replaces its own prior notification instead of stacking
    renotify: true   // without this, replacing a notification with the same tag is silent — no alert, no sound
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: focus an open BTH tab if one exists, otherwise open the linked page.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data && e.notification.data.url ? e.notification.data.url : './';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Kill switch — replaces the old orphaned standalone Mystery Tours service
// worker. This file's job is to self-destruct: it clears out its own old
// cached content, unregisters itself, and reloads any open tabs so they
// fall through to the real shared bth-sw.js and get fresh content.
//
// Safe to leave in the deploy folder indefinitely — once everyone's been
// freed, it just quietly does nothing on repeat visits (there's nothing
// left for it to unregister).

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clientList => clientList.forEach(client => client.navigate(client.url)))
  );
});

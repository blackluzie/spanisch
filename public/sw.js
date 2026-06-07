const CACHE = 'spanisch-v2';
const STATIC = [
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/app.js',
  './icons/icon.svg',
];

// Auf familie.hoffknecht.de: SW sofort deregistrieren und Caches leeren
if (self.location.hostname === 'familie.hoffknecht.de') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ includeUncontrolled: true }))
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
  });
} else {
  // Spanisch-App: normales Caching
  self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()));
  });
  self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) return;
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        if (r.ok && e.request.method === 'GET') {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }))
    );
  });
}

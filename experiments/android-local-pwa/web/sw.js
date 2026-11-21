const CACHE = 'kuikuiz-diagnostic-v1';
const FILES = ['./', './index.html', './app.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CHECK_CACHE') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const missing = [];
    for (const file of FILES) if (!(await cache.match(file))) missing.push(file);
    event.ports[0]?.postMessage({ ready: missing.length === 0, missing, cache: CACHE });
  })());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});

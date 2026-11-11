/* ECLIPSE — service worker (plantilla; el build inyecta VERSION y PRECACHE).
 *
 * Estrategia pensada para NO romper las actualizaciones:
 *  - Navegación (index.html): red primero, caché solo sin conexión.
 *  - assets/ con hash en el nombre (inmutables): caché primero.
 *  - Resto (models/, textures/...): caché primero y se guarda al usarse.
 *  - Cada build tiene una VERSION distinta (hash de todos los archivos): al
 *    activarse se borran las cachés antiguas.
 *  - La nueva versión no toma el control sola: espera a que el juego le envíe
 *    'SKIP_WAITING' en un momento seguro (pantalla de título).
 */
const VERSION = '__VERSION__';
const CACHE = `eclipse-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('eclipse-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});

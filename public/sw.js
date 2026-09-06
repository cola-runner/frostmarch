// The production build supplies an immutable list of campaign resources.
const CACHE = 'frostmarch-development';
const ASSETS = [/* BUILD_ASSETS */];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('frostmarch-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.includes('auth') ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) =>
          response.ok && !response.redirected
            ? response
            : caches.match('/').then((cached) => cached || response),
        )
        .catch(() =>
          caches.match('/').then((cached) => cached || Response.error()),
        ),
    );
    return;
  }
  if (!ASSETS.includes(url.pathname)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

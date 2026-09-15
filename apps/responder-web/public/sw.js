// Rescue-Link responder-web service worker.
//
// Scope: cache OSM map tiles (stale-while-revalidate) and the last-seen
// /api/incidents response (network-first, cache fallback) so a field
// tablet that already opened the dashboard once keeps a usable map and
// incident list if its uplink drops mid-mission. This is deliberately
// narrow — it does not attempt full offline app-shell precaching or
// background sync, both of which are separate, riskier scope.

const TILE_CACHE = 'rescue-link-tiles-v1';
const API_CACHE = 'rescue-link-api-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== TILE_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isTileRequest(url) {
  return /tile\.openstreetmap\.org/.test(url);
}

function isIncidentListRequest(url) {
  return url.includes('/api/incidents') && !url.includes('/api/incidents/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Map tiles: stale-while-revalidate. Serve the cached tile instantly if
  // we have one (map should never block on network for tiles already
  // seen), and refresh the cache in the background when online.
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Incident list: network-first (always prefer live data), fall back to
  // the last cached response only if the network truly fails. This is a
  // second, HTTP-level safety net alongside the idb cache in
  // lib/offlineCache.ts — either one alone would be enough, but they cover
  // slightly different failure modes (idb survives a full page reload;
  // this survives a request racing an intermittently-dropping connection).
  if (isIncidentListRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(API_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.open(API_CACHE).then((cache) => cache.match(request)))
    );
  }
});

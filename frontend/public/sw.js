
/* SVKD COIR offline service worker.
 * Uses the GitHub Pages project scope as the source of truth.
 */
const CACHE_PREFIX = "svkd-coir-offline-";
const CACHE_VERSION = "v3";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_ROOT = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", APP_ROOT);
const MANIFEST_URL = new URL("manifest.webmanifest", APP_ROOT);

async function cacheSuccessfulResponse(cache, request, response) {
  if (response && response.ok && response.type !== "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function precache(url, cache) {
  try {
    const request = new Request(url.href, { cache: "reload" });
    const response = await fetch(request);
    if (response.ok && response.type !== "opaque") {
      await cache.put(url.href, response.clone());
    }
  } catch (_) {
    // Optional precache failure must not stop installation.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await precache(APP_ROOT, cache);
    await precache(INDEX_URL, cache);
    await precache(MANIFEST_URL, cache);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/api/") || url.href === self.location.href) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);
        if (response.ok &&
            (url.pathname === APP_ROOT.pathname ||
             url.pathname === INDEX_URL.pathname)) {
          await cacheSuccessfulResponse(cache, APP_ROOT.href, response);
        }
        return response;
      } catch (_) {
        return (
          await cache.match(APP_ROOT.href) ||
          await cache.match(INDEX_URL.href) ||
          await cache.match(request, { ignoreSearch: true }) ||
          new Response(
            "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>SVKD COIR</title></head><body><h2>SVKD COIR</h2><p>Connect to the internet and open the app once to cache it for offline use.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
          )
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      return await cacheSuccessfulResponse(cache, request, response);
    } catch (_) {
      return new Response("", {
        status: 503,
        statusText: "Offline and resource not cached"
      });
    }
  })());
});

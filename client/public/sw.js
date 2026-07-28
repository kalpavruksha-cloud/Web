const CACHE_VERSION = "kalpavruksha-pwa-v5-login-actions-icon-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const APP_SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/favicon-v2.ico",
  "/icons/favicon-v2-16x16.png",
  "/icons/favicon-v2-32x32.png",
  "/icons/app-icon-v2-48x48.png",
  "/icons/app-icon-v2-72x72.png",
  "/icons/app-icon-v2-96x96.png",
  "/icons/app-icon-v2-128x128.png",
  "/icons/app-icon-v2-144x144.png",
  "/icons/app-icon-v2-152x152.png",
  "/icons/apple-touch-icon-v2.png",
  "/icons/app-icon-v2-192x192.png",
  "/icons/app-icon-v2-384x384.png",
  "/icons/app-icon-v2-512x512.png",
  "/icons/app-icon-maskable-v2-192x192.png",
  "/icons/app-icon-maskable-v2-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => ![APP_SHELL_CACHE, STATIC_CACHE].includes(key)).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/") || caches.match("/offline.html")))
    );
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refresh = fetch(request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || refresh;
      })
    );
  }
});

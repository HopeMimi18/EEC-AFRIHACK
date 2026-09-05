const CACHE_NAME = "royal-square-emergency-v4";
const EMERGENCY_FILES = [
  "/emergency.html",
  "/manifest.webmanifest",
  "/emergency-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(EMERGENCY_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("royal-square-emergency-") &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Important: this service worker only owns the emergency resources.
  // It must never cache/intercept the main React/Vite application.
  const isEmergencyResource = EMERGENCY_FILES.includes(url.pathname);
  if (!isEmergencyResource) return;

  event.respondWith(
    (async () => {
      try {
        const network = await fetch(request);
        if (network.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, network.clone());
        }
        return network;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || Response.error();
      }
    })()
  );
});

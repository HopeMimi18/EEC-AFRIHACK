const CACHE_NAME = "royal-square-emergency-v3";
const CORE_FILES = [
  "/emergency.html",
  "/manifest.webmanifest",
  "/emergency-icon.svg",
];

async function precacheEmergencyAndAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_FILES);

  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!response.ok) return;

    const html = await response.clone().text();
    await cache.put("/", response.clone());
    await cache.put("/index.html", new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }));

    const assets = Array.from(
      html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
      (match) => match[1]
    );

    if (assets.length) {
      await cache.addAll([...new Set(assets)]);
    }
  } catch {
    // Emergency page remains available even if the app shell cannot be cached.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheEmergencyAndAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("royal-square-emergency-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, network.clone());
        return network;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === "/emergency.html") {
          return (await cache.match("/emergency.html")) || Response.error();
        }
        return (await cache.match(request))
          || (await cache.match("/"))
          || (await cache.match("/emergency.html"))
          || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const network = await fetch(request);
      if (network.ok) {
        cache.put(request, network.clone());
      }
      return network;
    } catch {
      return cached || Response.error();
    }
  })());
});

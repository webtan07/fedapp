// FED service worker — light installability + offline app shell.
// Strategy: network-first for navigations (fall back to cached shell when
// offline), stale-while-revalidate for same-origin static assets. No heavy
// libraries; just enough for "Add to Home screen" + offline shell at launch.
const CACHE = "fed-v1";

// App shell + brand assets precached on install so the first paint works
// offline. '/' is cached as the offline fallback for navigations.
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/static/fed-icon-192.png",
  "/static/fed-icon-512.png",
  "/static/fed-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached shell when offline so
  // the app still opens from the home screen without a connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (hit) =>
              hit ||
              caches.match("/").then(
                (shell) =>
                  shell ||
                  Response.error().then(() => {
                    throw new Error("offline");
                  }),
              ),
          ),
        ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

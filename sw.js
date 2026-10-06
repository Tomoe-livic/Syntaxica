// Service worker di Syntaxica: salva i file nel dispositivo così l'app funziona anche offline.
// Quando modifichi i file, cambia il numero di versione qui sotto per forzare l'aggiornamento.
const CACHE = "syntaxica-v0.9";
const FILE = ["./", "index.html", "style.css", "app.js", "data/html.js", "data/css.js", "data/js.js", "data/esempi.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Mostra subito la copia salvata e intanto aggiorna in background.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const salvata = await cache.match(e.request);
      const rete = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => null);
      return salvata || (await rete) || (await cache.match("index.html"));
    })
  );
});

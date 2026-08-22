const CACHE_NAME = "sahabatku-cache-v26";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./tailwind-built.css",
  "./manifest.json"
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Gagal cache saat install:", url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama kalau ada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: untuk halaman (navigasi) -> coba internet dulu, kalau gagal baru pakai cache
// untuk file lain (css/js) -> pakai cache dulu biar cepat, kalau tidak ada baru ambil dari internet
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

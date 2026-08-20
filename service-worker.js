const CACHE_NAME = "sahabatku-cache-v17";
const RUNTIME_CACHE = "sahabatku-runtime-v17";

// File inti aplikasi (wajib ada biar app bisa jalan offline / saat jaringan jelek)
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./sop.js",
  "./absensi.js",
  "./kehadiran.js",
  "./profilkurir.js",
  "./petugasmitra.js",
  "./suratpernyataan.html",
  "./trainer.js",
  "./korlap.js",
  "./admincalonkurir.js",
  "./jelajah.js",
  "./manifest.json"
];

// Logo dipisah dari APP_SHELL karena dia file dari domain LUAR (onecompiler.io).
// Kalau digabung ke cache.addAll() di atas dan server logo lagi lambat/nolak,
// SEMUA proses install cache bisa gagal (addAll itu "all or nothing").
// Makanya di-cache terpisah dengan cara yang "gagal boleh, install tetap lanjut".
const EXTRA_ASSETS = [
  "https://uploads.onecompiler.io/43v32m6x5/44rw83fkz/Sahabatku%20(2).png"
];

// Batas waktu tunggu jaringan sebelum kita nyerah & pakai cache.
// Ini kunci dari "logo/loading nyangkut lama" -> tanpa batas waktu,
// HP dengan sinyal jelek bisa nunggu FETCH sampai puluhan detik dulu
// sebelum akhirnya fallback ke cache.
const NETWORK_TIMEOUT_MS = 3000;

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Install: simpan file-file utama ke cache (app shell wajib berhasil semua,
// logo/asset luar boleh gagal tanpa menggagalkan instalasi).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await Promise.all(
        EXTRA_ASSETS.map((url) =>
          fetch(url, { mode: "no-cors" })
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama kalau ada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch:
// - Halaman (navigasi): coba internet MAKS 3 detik, kalau lambat/gagal langsung
//   pakai cache biar layar tidak "nyangkut" nunggu jaringan lemot. Setelah itu,
//   versi baru tetap diambil diam-diam di belakang layar (stale-while-revalidate)
//   supaya update tetap masuk begitu jaringan bagus lagi.
// - File statis (css/js/gambar): cache dulu biar instan, sambil diam-diam update
//   cache dari jaringan untuk pemakaian berikutnya (stale-while-revalidate).
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(req, NETWORK_TIMEOUT_MS)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // hanya simpan response yang valid biar cache tidak kotor
          if (res && (res.status === 200 || res.type === "opaque")) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => cached);

      // Kalau sudah ada di cache -> tampilkan LANGSUNG (instan, tidak nunggu jaringan),
      // update cache tetap jalan di belakang layar untuk kunjungan berikutnya.
      // Kalau belum ada di cache -> baru tunggu jaringan.
      return cached || networkFetch;
    })
  );
});

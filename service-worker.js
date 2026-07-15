const CACHE_NAME = "sahabatku-cache-v2"; // dinaikkan jadi v2 supaya cache lama otomatis dibersihkan

// File utama aplikasi (harus selalu tersedia offline & langsung tampil)
const LOCAL_APP_SHELL = [
  "./",
  "./index.html",
  "./kehadiran.html",
  "./absensi-admin-sahabatku.html",
  "./absensi-kurir-sahabatku.html",
  "./styles.css",
  "./script.js",
  "./sop.js",
  "./manifest.json"
];

// Library dari CDN yang dipakai app (Tailwind, ikon, peta, chart, dll).
// Sebelumnya file2 ini SELALU diambil ulang dari internet tiap app dibuka lagi,
// itu penyebab utama "loading lama / kaya restart" pas balik dari recent apps.
// Sekarang ikut disimpan ke cache supaya kebuka instan.
const CDN_LIBS = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js",
  "https://html2canvas.hertzen.com/dist/html2canvas.min.js"
];

const PRECACHE_URLS = [...LOCAL_APP_SHELL, ...CDN_LIBS];

// Domain yang boleh dilayani dari cache. Di luar domain ini (Firebase, Google Docs
// viewer, tile peta, dsb) SENGAJA dibiarkan langsung ke internet supaya datanya
// selalu real-time / fresh, tidak ketinggalan / ke-cache secara tidak sengaja.
const CACHEABLE_HOSTS = [
  self.location.hostname,
  "unpkg.com",
  "cdn.tailwindcss.com",
  "cdn.jsdelivr.net",
  "html2canvas.hertzen.com"
];

// Install: simpan file-file utama + library CDN ke cache.
// Di-cache satu-satu (bukan pakai addAll) supaya kalau salah satu link CDN gagal
// diambil, file lain tetap berhasil ke-cache (tidak gagal semua).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("Gagal precache:", url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama kalau ada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(request) {
  if (request.method !== "GET") return false;
  try {
    const url = new URL(request.url);
    return CACHEABLE_HOSTS.includes(url.hostname);
  } catch (e) {
    return false;
  }
}

// Strategi "cache dulu, update di belakang layar" (stale-while-revalidate):
// - Kalau file sudah ada di cache -> langsung ditampilkan (INSTAN, tanpa nunggu internet)
// - Bersamaan itu, tetap diam-diam ambil versi terbaru dari internet & simpan ke cache
// - Jadi tiap dibuka lagi (recent apps / tab baru / refresh) langsung muncul,
//   TIDAK loading lama dan TIDAK terasa seperti restart/loop
// - Data penting (Firebase absensi, dsb) tetap selalu diambil langsung dari internet
self.addEventListener("fetch", (event) => {
  if (!isCacheable(event.request)) return; // biarkan browser tangani langsung (data selalu fresh)

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkUpdate = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline / gagal -> tetap pakai cache kalau ada

      return cached || networkUpdate;
    })
  );
});

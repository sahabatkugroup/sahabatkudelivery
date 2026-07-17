// ===================================================================
// kehadiran.js — dipindahkan dari <script> di kehadiran.html
// Fitur: Absensi Kurir dengan Face Scan + GPS Geofence (Firebase Realtime)
// Catatan: file ini memakai Firebase v8 (compat SDK) yang dimuat lewat
// <script> di <head> index.html, terpisah dari SDK v9 modular yang
// dipakai script.js/sop.js/absensi.js — supaya kode asli tidak perlu
// ditulis ulang.
// ===================================================================

// Config asli sesuai database Sahabatku Group Anda
const firebaseConfig = {
  apiKey: "AIzaSyDweL8xXcOu6ZODYzCa1KpqZVPLH5Ocijk",
  authDomain: "aplikasi-sahabatkugroup.firebaseapp.com",
  databaseURL: "https://aplikasi-sahabatkugroup-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aplikasi-sahabatkugroup",
  storageBucket: "aplikasi-sahabatkugroup.firebasestorage.app",
  messagingSenderId: "323288632862",
  appId: "1:323288632862:web:57f12fbb5b18ad0fbd680f",
  measurementId: "G-788RL05MFR"
};

// Inisialisasi Firebase (compat) — pakai app yang sudah ada kalau sudah diinisialisasi
const kehadiranApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const database = kehadiranApp.database();
const storage = kehadiranApp.storage();
const FOLDER_DRIVE_ID = "1kdrqXWSZgi50vqtaZCVoXhHJ6QSPAp_h";

// Geofence Kantor Jatibarang Indramayu
const LAT_KANTOR = -6.4680343;
const LNG_KANTOR = 108.2972003;
const RADIUS_MAKS_METER = 80;

let streamKamera = null, adaWajah = false, gpsValid = false;
let tglOperasionalStr = "", jenisAbsen = "MASUK", fileBlobFinal = null, fotoBase64Final = null;
let infoKurir = {}, listUserKurir = {};

// Menyinkronkan kartu identitas kurir yang terkunci (avatar inisial + nama)
// dengan data infoKurir. Murni tampilan, tidak mengubah alur data absensi.
function syncKehadiranProfilTerkunci(nama) {
  const namaEl = document.getElementById('kehadiran-nama-terkunci');
  const avatarEl = document.getElementById('kehadiran-avatar-initial');
  if (namaEl) namaEl.innerText = nama || '-';
  if (avatarEl) {
    const inisial = (nama || '-').trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.innerText = inisial || '--';
  }
}

async function autoLoginKurirDariSession() {
  const savedSession = localStorage.getItem('sahabatku_session');
  if (!savedSession) return;

  try {
    const session = JSON.parse(savedSession);
    if (session.role !== 'kurir' && session.role !== 'leader') return;

    const snap = await database.ref(`users/${session.id}`).get();
    if (!snap.exists()) return;

    const user = snap.val();
    if (user.status !== 'aktif') {
      alert('Akun kurir tidak aktif.');
      return;
    }

    // simpan ke variabel utama
    infoKurir = {
      id: session.id,
      nama: user.nama || session.nama || '-',
      leader: user.leader || '-',
      password: user.password || '',
      ongkirLocked: user.ongkirLocked || false,
      ongkirPassword: user.ongkirPassword || ''
    };

    // isi dropdown otomatis
    const select = document.getElementById('select-kurir');
    select.value = session.id;
    document.getElementById('box-status-firebase').classList.remove('hidden');
    document.getElementById('txt-id').innerText = infoKurir.leader;
    document.getElementById('txt-status').innerText = 'AKTIF';
    syncKehadiranProfilTerkunci(infoKurir.nama);

    // cek status absen hari ini
    await checkSelectedKurirStatus();

    // Aktifkan reminder otomatis (belum absen masuk / sudah bisa absen pulang) —
    // notifikasi sistem cache lokal, sama seperti reminder mitra trx.
    if (typeof window.startAbsensiReminderWatcher === 'function') {
      window.startAbsensiReminderWatcher();
    }

  } catch (err) {
    console.error(err);
  }
}

function initKehadiran() {
  lucide.createIcons();
  hitungTanggalOperasional();
  muatDaftarKurirOtomatis();
  listenRealtimeRiwayat();
  updateJamRealtime();
  setInterval(() => {
    hitungTanggalOperasional();
  }, 60000);

  setTimeout(() => {
    autoLoginKurirDariSession();
  }, 300);
}
// Screen ini dimuat langsung sebagai bagian dari index.html (bukan halaman
// terpisah lagi), jadi inisialisasi dijalankan begitu DOM siap.
window.addEventListener('DOMContentLoaded', initKehadiran);

function alihkanView(namaView) {
  ['absen', 'riwayat', 'kamera', 'preview', 'sukses'].forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
  document.getElementById(`view-${namaView}`).classList.remove('hidden');
  if(namaView === 'absen' || namaView === 'riwayat') document.getElementById('nav-bar').classList.remove('hidden');
  else document.getElementById('nav-bar').classList.add('hidden');

  // Modal scan wajah (kamera/preview/sukses) tampil sebagai popup fullscreen (mobile) dgn latar blur
  const modalScan = document.getElementById('modal-scan-wajah');
  if (modalScan) {
    const isScanView = (namaView === 'kamera' || namaView === 'preview' || namaView === 'sukses');
    modalScan.classList.toggle('hidden', !isScanView);
    modalScan.classList.toggle('flex', isScanView);
  }

  toggleBtnKembali(namaView === 'absen');
}
function toggleBtnKembali(show) {
  const btn = document.getElementById('btn-kembali-index');
  if (!btn) return;
  btn.classList.toggle('hidden', !show);
}

// Menutup popup scan wajah (tombol X): matikan kamera kalau masih aktif & kembali ke menu e-absensi
function tutupModalScanWajah() {
  if (streamKamera) { streamKamera.getTracks().forEach(t => t.stop()); streamKamera = null; }
  fileBlobFinal = null;
  fotoBase64Final = null;
  alihkanView('absen');
}
document.getElementById('btn-tutup-scan').addEventListener('click', tutupModalScanWajah);

// Navigation Tab Klik
document.getElementById('nav-absen').addEventListener('click', () => {
  document.getElementById('nav-absen').classList.add('active');
  document.getElementById('nav-riwayat').classList.remove('active');
  alihkanView('absen');
});
document.getElementById('nav-riwayat').addEventListener('click', () => {
  document.getElementById('nav-riwayat').classList.add('active');
  document.getElementById('nav-absen').classList.remove('active');
  alihkanView('riwayat');
});

function hitungTanggalOperasional() {
  const skrg = new Date();
  if(skrg.getHours() < 3) skrg.setDate(skrg.getDate() - 1);
  const y = skrg.getFullYear(), m = String(skrg.getMonth()+1).padStart(2,'0'), d = String(skrg.getDate()).padStart(2,'0');
  tglOperasionalStr = `${y}-${m}-${d}`;
  document.getElementById('top-date-badge').innerText = `${d}/${m}/${y}`;
}
function tampilkanPopupTanggalMasuk() {
  const badge = document.getElementById('top-time-badge');
  const jam = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });

  badge.innerText = jam;
  badge.classList.remove('hidden');
  badge.className = "text-[10px] font-bold bg-slate-900 dark:bg-slate-950 text-white px-3 py-1 rounded-full shadow-lg animate-pulse";

  setTimeout(() => {
    badge.classList.add('hidden');
  }, 2500);
}

// 1. SINKRONISASI DATALIST: Membaca otomatis node 'users' yang ber-role kurir dan berstatus aktif
function muatDaftarKurirOtomatis() {
  database.ref('users').on('value', (snapshot) => {
    const dropdown = document.getElementById('select-kurir');
    dropdown.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';

    if (!snapshot.exists()) {
      dropdown.innerHTML = '<option value="">Gagal memuat data / Node kosong</option>';
      return;
    }

    listUserKurir = {};
    snapshot.forEach((childSnapshot) => {
      const keyID = childSnapshot.key;
      const user = childSnapshot.val();

      if ((user.role === "kurir" || user.role === "leader") && user.status === "aktif") {
        listUserKurir[keyID] = user;

        let opt = document.createElement('option');
        opt.value = keyID;
        opt.innerText = user.nama;
        dropdown.appendChild(opt);
      }
    });
  });
}

 function matikanTombolLanjut(pesan) {
  const btn = document.getElementById('btn-lanjut');
  btn.disabled = true;
  btn.className = "w-full bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-medium py-2.5 px-3 rounded-xl text-[11px] cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm transition-all";
  btn.innerHTML = `<span>${pesan}</span> <i data-lucide="lock" class="w-4 h-4"></i>`;
  lucide.createIcons();
}
function updateJamRealtime() {
  setInterval(() => {
    const now = new Date();

    const jam = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    });

    const tgl = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });

    document.getElementById('top-time-badge').innerText = jam;
    document.getElementById('top-date-badge').innerText = tgl;
  }, 1000);
}

// 3. LOG LISTENER: Riwayat otomatis sinkron membaca node 'absensi_sahabatku'
let riwayatKehadiranCache = []; // simpan data mentah supaya bisa difilter tanpa query ulang ke Firebase
function listenRealtimeRiwayat() {
  database.ref('absensi_sahabatku')
    .orderByChild('tanggal')
    .equalTo(tglOperasionalStr)
    .on('value', (snapshot) => {
      riwayatKehadiranCache = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          riwayatKehadiranCache.push(childSnapshot.val());
        });
      }
      renderRiwayatKehadiran(riwayatKehadiranCache);
      checkSelectedKurirStatus();
    });
}

// Render riwayat: dibangun sekali sbg string lalu di-assign ke innerHTML sekaligus,
// bukan loop appendChild satu-satu — supaya tetap ringan walau datanya banyak.
function renderRiwayatKehadiran(items) {
  const container = document.getElementById('list-riwayat-container');
  const badge = document.getElementById('total-absen-badge');

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-400 dark:text-slate-500 text-xs py-10">Belum ada riwayat kehadiran hari ini.</div>`;
    if (badge) badge.innerText = "0 Kurir";
    return;
  }

  const htmlParts = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lengkap = (item.jamMasuk && item.jamPulang);
    const statusBadge = lengkap
      ? `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><i data-lucide="check" class="w-3 h-3"></i> Selesai</span>`
      : `<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><i data-lucide="timer" class="w-3 h-3"></i> Sedang Jalan</span>`;
    const nama = item.namaKurir || '-';
    const inisial = nama.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase() || '--';

    htmlParts[i] = `
      <div class="p-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2 shadow-sm list-card-hover" data-nama-kurir="${nama.toLowerCase()}">
        <div class="flex justify-between items-start gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-black text-[10px] shrink-0">${inisial}</div>
            <div class="min-w-0">
              <h4 class="font-bold text-xs text-slate-800 dark:text-white truncate">${nama}</h4>
              <p class="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">leader: ${item.leader || '-'}</p>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
          <div class="flex items-center gap-1.5">
            <i data-lucide="log-in" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
            <span>Masuk:</span>
            <strong class="text-slate-800 dark:text-slate-200">${item.jamMasuk || '--:--'}</strong>
          </div>
          <div class="flex items-center gap-1.5">
            <i data-lucide="log-out" class="w-3.5 h-3.5 text-orange-500 dark:text-orange-400"></i>
            <span>Pulang:</span>
            <strong class="text-slate-800 dark:text-slate-200">${item.jamPulang || '--:--'}</strong>
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = htmlParts.join('');
  if (badge) badge.innerText = `${items.length} Kurir`;
  lucide.createIcons();
}

// Filter riwayat berdasar nama tanpa perlu query ulang Firebase (pakai cache di memori)
function filterRiwayatKehadiran() {
  const kw = (document.getElementById('riwayat-cari-nama')?.value || '').trim().toLowerCase();
  if (!kw) { renderRiwayatKehadiran(riwayatKehadiranCache); return; }
  const filtered = riwayatKehadiranCache.filter(item => (item.namaKurir || '').toLowerCase().includes(kw));
  renderRiwayatKehadiran(filtered);
}
window.filterRiwayatKehadiran = filterRiwayatKehadiran;
document.getElementById('select-kurir').addEventListener('change', checkSelectedKurirStatus);

document.getElementById('btn-lanjut').addEventListener('click', async () => {
  alihkanView('kamera');

  const label = document.getElementById('label-aksi-kamera');
  if (jenisAbsen === 'MASUK') {
    label.className = "text-white text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/10 shadow-md backdrop-blur-sm bg-emerald-600/80";
    label.innerText = "Scan Face: Absen Masuk";
  } else {
    label.className = "text-white text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/10 shadow-md backdrop-blur-sm bg-orange-500/80";
    label.innerText = "Scan Face: Absen Pulang";
  }

  await startCameraEngine();
  trackGPSGeofence();
});

async function startCameraEngine() {
  document.getElementById('cam-loader').classList.remove('hidden');
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  document.getElementById('cam-loader').classList.add('hidden');
  try {
    streamKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 400, height: 300 } });
    const video = document.getElementById('video');
    video.srcObject = streamKamera;
    video.addEventListener('play', loopFaceDetection);
  } catch(e) { alert("Akses kamera diblokir!"); }
}

async function loopFaceDetection() {
  const video = document.getElementById('video');
  if (video.paused || video.ended || !streamKamera) return;
  const deteksi = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.55 }));
  if(deteksi.length > 0) {
    adaWajah = true;
    if(gpsValid) nyalakanTombolJepret();
  } else {
    adaWajah = false;
    matikanTombolJepret();
  }
  requestAnimationFrame(loopFaceDetection);
}

function trackGPSGeofence() {
  if(!navigator.geolocation) return;
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    const R = 6371000;
    const dLat = (lat - LAT_KANTOR) * Math.PI / 180, dLon = (lng - LNG_KANTOR) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(LAT_KANTOR*Math.PI/180) * Math.cos(lat*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const jarak = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

    document.getElementById('txt-gps-dist').innerText = `${Math.round(jarak)} Meter`;
    const txtStat = document.getElementById('txt-gps-stat');

    if(jarak <= RADIUS_MAKS_METER) {
      gpsValid = true;
      txtStat.innerText = "Area Kantor"; txtStat.className = "font-bold text-emerald-600 dark:text-emerald-400";
      if(adaWajah) nyalakanTombolJepret();
    } else {
      gpsValid = false;
      txtStat.innerText = "Luar Wilayah Kantor"; txtStat.className = "font-bold text-red-500 dark:text-red-400";
      matikanTombolJepret();
    }
  }, () => {}, { enableHighAccuracy: true });
}

function nyalakanTombolJepret() {
  const btn = document.getElementById('btn-jepret');
  btn.disabled = false;
  btn.className = "w-full shbt-blue text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md animate-pulse cursor-pointer";
}
function tampilkanLoadingFull(namaKurir) {
  document.getElementById('loading-nama-kurir').innerText = `Kurir: ${namaKurir}`;
  document.getElementById('loading-fullscreen').classList.remove('hidden');
}

function sembunyikanLoadingFull() {
  document.getElementById('loading-fullscreen').classList.add('hidden');
}

function matikanTombolJepret() {
  const btn = document.getElementById('btn-jepret');
  btn.disabled = true;
  btn.className = "w-full bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-not-allowed";
}
document.getElementById('btn-jepret').addEventListener('click', () => {
  const video = document.getElementById('video');
  const canv = document.createElement('canvas');
  canv.width = video.videoWidth; canv.height = video.videoHeight;
  const ctx = canv.getContext('2d');
  ctx.translate(canv.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canv.width, canv.height);

  const miniCanvas = document.createElement('canvas');
  miniCanvas.width = 960;
  miniCanvas.height = 1280;
  const miniCtx = miniCanvas.getContext('2d');
  const ratio = Math.min(miniCanvas.width / canv.width, miniCanvas.height / canv.height);
  const drawWidth = canv.width * ratio;
  const drawHeight = canv.height * ratio;
  const x = (miniCanvas.width - drawWidth) / 2;
  const y = (miniCanvas.height - drawHeight) / 2;
  miniCtx.fillStyle = "#000";
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
  miniCtx.drawImage(canv, x, y, drawWidth, drawHeight);

  const dataUrl = miniCanvas.toDataURL('image/jpeg', 0.95);
  document.getElementById('img-preview').src = dataUrl;

  // Simpan base64 murni (tanpa prefix "data:image/jpeg;base64,") untuk dikirim ke Apps Script
  fotoBase64Final = dataUrl.split(',')[1];
  fileBlobFinal = true; // penanda bahwa foto sudah siap dikirim
  if(streamKamera) { streamKamera.getTracks().forEach(t => t.stop()); streamKamera = null; }
  alihkanView('preview');
  document.getElementById('p-nama').innerText = infoKurir.nama;
  const aksiEl = document.getElementById('p-aksi');
  aksiEl.innerText = `ABSEN ${jenisAbsen}`;
  aksiEl.className = jenisAbsen === 'MASUK'
    ? 'font-bold px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
    : 'font-bold px-2.5 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
  lucide.createIcons();
});

document.getElementById('btn-ulang-foto').addEventListener('click', async () => {
  fileBlobFinal = null;
  fotoBase64Final = null;
  alihkanView('kamera'); await startCameraEngine();
});
// Catatan: tombol kembali kamera lama (btn-back-absen) sudah digantikan oleh
// tombol X di header modal-scan-wajah (lihat tutupModalScanWajah()).
async function checkSelectedKurirStatus() {
const selectedId = document.getElementById('select-kurir').value;
const box = document.getElementById('box-status-firebase');
const txtId = document.getElementById('txt-id');
const txtStatus = document.getElementById('txt-status');
const txtBadge = document.getElementById('txt-badge-status');
const btnLanjut = document.getElementById('btn-lanjut');

if (!selectedId || !listUserKurir[selectedId]) {
    box.classList.add('hidden');
    btnLanjut.disabled = true;
    btnLanjut.className = "w-full bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium py-2.5 px-3 rounded-xl text-xs cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm transition-all";
    btnLanjut.innerHTML = `<span>Pilih Nama Dulu</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`;
    lucide.createIcons();
    return;
}

const user = listUserKurir[selectedId];
infoKurir = {
    id: selectedId,
    nama: user.nama || '-',
    leader: user.leader || '-',
    password: user.password || '',
    ongkirLocked: user.ongkirLocked || false,
    ongkirPassword: user.ongkirPassword || ''
};

box.classList.remove('hidden');
txtId.innerText = infoKurir.leader;
txtStatus.innerText = user.status ? user.status.toUpperCase() : '-';
syncKehadiranProfilTerkunci(infoKurir.nama);

const refDB = database.ref('absensi_sahabatku');
const snap = await refDB.orderByChild('idKurir').equalTo(selectedId).once('value');

let dataHariIni = null;
snap.forEach((child) => {
    const d = child.val();
    if (d.tanggal === tglOperasionalStr) dataHariIni = d;
});

const jamSekarang = new Date();
const jamSekarangStr = jamSekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
const [jamNow, menitNow] = jamSekarangStr.split(/[:.]/).map(Number);
const jamNowTotalMenit = jamNow * 60 + menitNow;

if (!dataHariIni) {
    txtBadge.innerText = "Belum Absen";
    txtBadge.className = "font-bold px-2.5 py-0.5 rounded-full text-[10px] text-right whitespace-nowrap bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
    jenisAbsen = "MASUK";
    btnLanjut.innerHTML = `<span>Lanjut Absen Masuk</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`;
    btnLanjut.disabled = false;
    btnLanjut.className = "w-full shbt-blue text-white font-medium py-2.5 px-3 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all";
} else if (dataHariIni.jamMasuk && !dataHariIni.jamPulang) {
    const [jamStr = '00', menitStr = '00'] = String(dataHariIni.jamMasuk || '00:00').split(':');
    const jamMasuk = parseInt(jamStr, 10) || 0;
    const menitMasuk = parseInt(menitStr, 10) || 0;
    const jamMasukTotalMenit = jamMasuk * 60 + menitMasuk;

    // batas normal 6 jam
    let batasPulangMenit = jamMasukTotalMenit + 360;

    // kalau lewat jam 03:00 dini hari, batas maksimal 03:00
    const batasMaksMenit = 24 * 60 + (3 * 60);
    if (batasPulangMenit > batasMaksMenit) {
      batasPulangMenit = batasMaksMenit;
    }

    // kalau jam sekarang sudah lewat tengah malam, anggap hari berikutnya
    const jamNowUntukHitung = jamNowTotalMenit < jamMasukTotalMenit
      ? jamNowTotalMenit + 24 * 60
      : jamNowTotalMenit;

    const sisaMenit = Math.max(0, batasPulangMenit - jamNowUntukHitung);
    const jamPulang = Math.floor(batasPulangMenit / 60) % 24;
    const menitPulang = batasPulangMenit % 60;


    if (jamNowUntukHitung >= batasPulangMenit) {
    txtBadge.innerText = "Sudah Masuk";
    txtBadge.className = "font-bold px-2.5 py-0.5 rounded-full text-[10px] text-right whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    jenisAbsen = "PULANG";
    btnLanjut.innerHTML = `<span>Lanjut Absen Pulang</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`;
    btnLanjut.disabled = false;
    btnLanjut.className = "w-full shbt-blue text-white font-medium py-2.5 px-3 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all";
    } else {
    txtBadge.innerText = `Pulang Jam ${String(jamPulang).padStart(2, '0')}:${String(menitPulang).padStart(2, '0')}`;
    txtBadge.className = "font-bold px-2.5 py-0.5 rounded-full text-[10px] text-right whitespace-nowrap bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-600";
    matikanTombolLanjut(`⏱️ Tunggu ${Math.floor(sisaMenit / 60)}j ${sisaMenit % 60}m lagi`);
    return;
    }
} else if (dataHariIni.jamMasuk && dataHariIni.jamPulang) {
    txtBadge.innerText = "Sudah Lengkap";
    txtBadge.className = "font-bold px-2.5 py-0.5 rounded-full text-[10px] text-right whitespace-nowrap bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
    matikanTombolLanjut("Absen Selesai Hari Ini");
    return;
}

lucide.createIcons();
}

document.getElementById('btn-kirim-final').addEventListener('click', async () => {
  const btn = document.getElementById('btn-kirim-final');
  btn.disabled = true;
  tampilkanLoadingFull(infoKurir.nama);
  const jamSekarang = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  });
  const nodeKey = `${tglOperasionalStr}_${infoKurir.id}`;
  let fotoUrl = "";

  try {
    if(fotoBase64Final) {
      const payload = {
        folderId: FOLDER_DRIVE_ID,
        fileName: `${nodeKey}_${jenisAbsen}.jpg`,
        mimeType: "image/jpeg",
        base64: fotoBase64Final
      };

      const uploadRes = await fetch("https://script.google.com/macros/s/AKfycby5NRakPHf3jhcbzc35y06MOe36bkdLBFxm00Kd56a4vMtxaraKi8HzMOsvnN8Nqnkj/exec", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // wajib text/plain agar tidak kena CORS preflight
        body: JSON.stringify(payload)
      });

      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        fotoUrl = uploadData.url || "";
      } else {
        console.error("Upload foto gagal:", uploadData.error);
      }
    }

    const refDB = database.ref('absensi_sahabatku').child(nodeKey);
    if(jenisAbsen === "MASUK") {
      await refDB.set({
        idKurir: infoKurir.id,
        leader: infoKurir.leader || "-",
        namaKurir: infoKurir.nama,
        tanggal: tglOperasionalStr,
        jamMasuk: jamSekarang,
        fotoMasuk: fotoUrl,
        jamPulang: "",
        fotoPulang: ""
      });

      tampilkanPopupTanggalMasuk();
    } else {
      await refDB.update({
        jamPulang: jamSekarang,
        fotoPulang: fotoUrl
      });
    }

    sembunyikanLoadingFull();
    alihkanView('sukses');
    document.getElementById('msg-sukses-detail').innerText = `${infoKurir.nama} — Absen ${jenisAbsen} pukul ${jamSekarang} WIB`;

    // Notifikasi sistem otomatis di dashboard (cache lokal, TANPA simpan ke Firebase)
    // memakai mekanisme yang sama dengan reminder "belum input mitra trx".
    if (typeof window.pushLocalReminder === 'function') {
      const labelAksi = jenisAbsen === 'MASUK' ? 'masuk' : 'pulang';
      window.pushLocalReminder(`✅ ${infoKurir.nama} berhasil absen ${labelAksi} jam ${jamSekarang} WIB.`);
    }

    // Popup sukses otomatis tertutup & kembali ke menu utama E-Absensi Wajah
    setTimeout(() => {
      alihkanView('absen');
      if (typeof checkSelectedKurirStatus === 'function') checkSelectedKurirStatus();
    }, 2200);

  } catch (err) {
    sembunyikanLoadingFull();
    alert("Gagal memperbarui: " + err.message);
    btn.disabled = false;
  }
});
// ===================================================================
// REMINDER OTOMATIS ABSENSI — 100% client-side, tanpa Firebase (cache saja).
// Mengingatkan kurir yang sedang login kalau: (1) belum absen masuk hari ini,
// atau (2) sudah lewat jam kerja & bisa segera absen pulang. Notifikasi
// ditaruh di panel lonceng dashboard yang sama dgn reminder "belum input mitra".
// ===================================================================
let absensiReminderTimer = null;

async function checkAbsensiReminderNow() {
  if (typeof window.pushLocalReminder !== 'function') return;
  if (!infoKurir || !infoKurir.id) return;

  try {
    const refDB = database.ref('absensi_sahabatku');
    const snap = await refDB.orderByChild('idKurir').equalTo(infoKurir.id).once('value');

    let dataHariIni = null;
    snap.forEach((child) => {
      const d = child.val();
      if (d.tanggal === tglOperasionalStr) dataHariIni = d;
    });

    // Kasus 1: belum absen masuk sama sekali hari ini
    if (!dataHariIni || !dataHariIni.jamMasuk) {
      window.pushLocalReminder('⏰ Anda belum absen masuk hari ini. Segera absen masuk ya!');
      return;
    }

    // Kasus 2: sudah masuk, belum pulang, dan sudah waktunya bisa absen pulang
    if (dataHariIni.jamMasuk && !dataHariIni.jamPulang) {
      const [jamStr = '00', menitStr = '00'] = String(dataHariIni.jamMasuk || '00:00').split(':');
      const jamMasuk = parseInt(jamStr, 10) || 0;
      const menitMasuk = parseInt(menitStr, 10) || 0;
      const jamMasukTotalMenit = jamMasuk * 60 + menitMasuk;

      let batasPulangMenit = jamMasukTotalMenit + 360; // batas normal 6 jam
      const batasMaksMenit = 24 * 60 + (3 * 60);
      if (batasPulangMenit > batasMaksMenit) batasPulangMenit = batasMaksMenit;

      const jamSekarang = new Date();
      const jamSekarangStr = jamSekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      const [jamNow, menitNow] = jamSekarangStr.split(/[:.]/).map(Number);
      let jamNowTotalMenit = jamNow * 60 + menitNow;
      if (jamNowTotalMenit < jamMasukTotalMenit) jamNowTotalMenit += 24 * 60;

      if (jamNowTotalMenit >= batasPulangMenit) {
        window.pushLocalReminder('🏁 Anda sudah bisa absen pulang sekarang, segera absen pulang ya!');
      }
    }
  } catch (e) {
    // diamkan; reminder bersifat best-effort, tidak boleh mengganggu alur utama
  }
}

window.startAbsensiReminderWatcher = function() {
  window.stopAbsensiReminderWatcher();
  setTimeout(checkAbsensiReminderNow, 15000);
  absensiReminderTimer = setInterval(checkAbsensiReminderNow, 30 * 60 * 1000);
};

window.stopAbsensiReminderWatcher = function() {
  if (absensiReminderTimer) { clearInterval(absensiReminderTimer); absensiReminderTimer = null; }
};

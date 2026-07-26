/* =====================================================================
   TRAINER.JS
   Modul baru khusus role "Trainer" — login lewat akun Manajemen dengan
   kategori "Trainer". Dashboard-nya:
     1. Data Calon Kurir (identitas, kendaraan, checklist berkas,
        checklist perlengkapan, status verifikasi — semua dalam 1 form)
     2. Penilaian Calon Kurir (form skor 100 poin + riwayat penilaian)
     3. Peraturan & SOP Kerja (pakai modal SOP yang sudah ada — read only)
     4. Keluar

   File ini BERDIRI SENDIRI (tidak mengubah script.js) dan cuma butuh:
     <script type="module" src="trainer.js"></script>
   ditambahkan di index.html, plus opsi baru di dropdown "Kategori" pada
   form Manajemen:
     <option value="Trainer">Trainer</option>
   (di #manajemen-kategori dan #edit-manajemen-kategori)

   Data disimpan di Firebase:
     calon_kurir/{id}              -> identitas, kendaraan, checklist, verifikasi
     penilaian_calon_kurir/{id}    -> riwayat penilaian (bisa lebih dari 1x per kurir)

   Reuse: CSS class "pm-*" dari petugasmitra.js (pmInjectStyle), dan
   window.openSOP() dari sop.js untuk menu "Peraturan & SOP Kerja".
   ===================================================================== */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase, ref, push, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const trApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(trApp);

const KATEGORI_TR = "Trainer";

/* ------------------------------------------------------------------ *
 * 0. Penjaga awal (murni CSS, cegah "kelihatan" dashboard admin sesaat)
 * ------------------------------------------------------------------ */
(function trEarlyGuard() {
    try {
        const raw = localStorage.getItem("sahabatku_session");
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s && s.role === "manajemen" && (s.kategori || "").trim() === KATEGORI_TR) {
            const style = document.createElement("style");
            style.id = "tr-early-guard-style";
            style.textContent = `#screen-admin-dashboard{display:none !important;} #app-bar{display:none !important;}`;
            (document.head || document.documentElement).appendChild(style);
        }
    } catch (e) { /* diamkan */ }
})();

/* ------------------------------------------------------------------ *
 * 1. State (cache realtime)
 * ------------------------------------------------------------------ */
let cloudCalonKurir = {};
let cloudPenilaian = {};
let trCurrentScreen = null;
let trQueueTimer = null;

function trQueueRender() {
    if (trQueueTimer) clearTimeout(trQueueTimer);
    trQueueTimer = setTimeout(() => {
        trQueueTimer = null;
        trRenderActiveScreen();
    }, 120);
}

onValue(ref(db, "calon_kurir"), (snap) => { cloudCalonKurir = snap.val() || {}; trQueueRender(); });
onValue(ref(db, "penilaian_calon_kurir"), (snap) => { cloudPenilaian = snap.val() || {}; trQueueRender(); });

/* ------------------------------------------------------------------ *
 * 2. Helper umum
 * ------------------------------------------------------------------ */
function trToast(msg, type) {
    if (typeof window.toast === "function") window.toast(msg, type);
    else alert(msg);
}
async function trConfirm(msg) {
    if (typeof window.showConfirm === "function") return await window.showConfirm(msg);
    return confirm(msg);
}
function trEsc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
function trSafeJs(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
function trTodayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function trCurrentMonthISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function trFormatTanggal(iso) {
    if (!iso) return "-";
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${parseInt(d)} ${bulan[parseInt(m) - 1] || m} ${y}`;
}
function trGetSession() {
    try { return JSON.parse(localStorage.getItem("sahabatku_session") || "null"); }
    catch (e) { return null; }
}
function trIsTrainerSession(session) {
    return !!(session && session.role === "manajemen" && (session.kategori || "").trim() === KATEGORI_TR);
}

/* ------------------------------------------------------------------ *
 * 3. Style tambahan khusus Trainer (di luar yang sudah ada di pm-*)
 * ------------------------------------------------------------------ */
function trInjectStyle() {
    if (document.getElementById("tr-style")) return;
    const css = `
    #tr-root .screen { display:none; min-height:100vh; }
    #tr-root .screen.active { display:flex; flex-direction:column; }
    .tr-check-row{ display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:10px 12px; border-radius:12px; background:#f8fafc; border:1px solid #eef2f7; cursor:pointer;
      transition:background .12s ease, border-color .12s ease; }
    .dark .tr-check-row{ background:#16213a; border-color:#243047; }
    .tr-check-row.is-on{ background:rgba(5,150,105,.08); border-color:rgba(5,150,105,.35); }
    .dark .tr-check-row.is-on{ background:rgba(5,150,105,.18); }
    .tr-check-row .trc-label{ font-size:12px; font-weight:700; color:#334155; }
    .dark .tr-check-row .trc-label{ color:#e2e8f0; }
    .tr-check-row .trc-toggle{ width:38px; height:22px; border-radius:999px; background:#cbd5e1; position:relative; flex-shrink:0; transition:background .15s ease; }
    .tr-check-row .trc-toggle::after{ content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .15s ease; }
    .tr-check-row.is-on .trc-toggle{ background:#059669; }
    .tr-check-row.is-on .trc-toggle::after{ transform:translateX(16px); }
    .tr-score-row{ display:grid; grid-template-columns:1fr 84px; gap:10px; align-items:center; }
    .tr-score-row label{ font-size:11.5px; font-weight:600; color:#475569; }
    .dark .tr-score-row label{ color:#cbd5e1; }
    .tr-progress-badge{ display:inline-flex; align-items:center; gap:4px; font-size:9.5px; font-weight:800;
      padding:3px 9px; border-radius:999px; background:#eef1f6; color:#475569; }
    .tr-hasil-badge{ display:inline-flex; align-items:center; gap:5px; padding:8px 14px; border-radius:14px; font-weight:900; font-size:14px; }
    .tr-hasil-lulus{ background:#d1fae5; color:#047857; }
    .tr-hasil-evaluasi{ background:#fef3c7; color:#b45309; }
    .tr-hasil-tidaklulus{ background:#fee2e2; color:#b91c1c; }
    .tr-list-heading{ font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#64748b; }
    .dark .tr-list-heading{ color:#94a3b8; }
    .tr-toggle-btn{ display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800; text-transform:uppercase;
      padding:8px 14px; border-radius:12px; background:#7c3aed; color:#fff; border:none; }
    .tr-toggle-btn.is-open i{ transform:rotate(180deg); }
    .tr-stat-clickable{ cursor:pointer; transition:transform .1s ease; }
    .tr-stat-clickable:active{ transform:scale(0.96); }
    .tr-bar-chart{ display:flex; width:100%; height:16px; border-radius:999px; overflow:hidden; background:#f1f5f9; }
    .dark .tr-bar-chart{ background:#1e293b; }
    .tr-bar-seg{ height:100%; transition:width .25s ease; }
    .tr-bar-dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
    .tr-stat-mini-card{ display:flex; align-items:center; justify-content:space-between; gap:8px;
      padding:9px 12px; border-radius:12px; background:#f8fafc; border:1px solid #eef2f7; }
    .dark .tr-stat-mini-card{ background:#16213a; border-color:#243047; }
    `;
    const style = document.createElement("style");
    style.id = "tr-style";
    style.textContent = css;
    document.head.appendChild(style);
}

/* ------------------------------------------------------------------ *
 * 4. Skema skor penilaian (Total 100 Poin)
 * ------------------------------------------------------------------ */
const TR_SCORE_FIELDS = [
    { key: "kehadiran", label: "Kehadiran & Disiplin — Tepat waktu & patuh jadwal", max: 10, group: "1️⃣ Kehadiran & Disiplin" },
    { key: "etika", label: "Peraturan & etika", max: 10, group: "2️⃣ Pemahaman Materi" },
    { key: "sop", label: "SOP harian", max: 10, group: "2️⃣ Pemahaman Materi" },
    { key: "aplikasi", label: "Aplikasi kurir", max: 10, group: "2️⃣ Pemahaman Materi" },
    { key: "attitude", label: "Perilaku & attitude", max: 5, group: "3️⃣ Kesiapan Kurir (Attitude & Mental)" },
    { key: "tanggungjawab", label: "Tanggung jawab", max: 5, group: "3️⃣ Kesiapan Kurir (Attitude & Mental)" },
    { key: "kejujuran", label: "Kejujuran", max: 5, group: "3️⃣ Kesiapan Kurir (Attitude & Mental)" },
    { key: "ketelitian", label: "Alamat, barang, update order, komunikasi customer", max: 10, group: "4️⃣ Ketelitian Kerja" },
    { key: "praktik", label: "Ikuti arahan & siap antar (didampingi Trainer)", max: 20, group: "5️⃣ Praktik Lapangan" }
];
/* 6️⃣ Kelengkapan Wajib — dinilai per item.
 * Catatan: kalau "tidak ada/tidak aktif/tidak layak" tetap dikasih poin 1 (bukan 0). */
const TR_KELENGKAPAN_ITEMS = [
    { key: "sim", label: "SIM", ada: "Ada", tidak: "Tidak Ada", max: 2 },
    { key: "stnk", label: "STNK", ada: "Ada/Aktif", tidak: "Tidak Aktif", max: 2 },
    { key: "helm", label: "Helm", ada: "Ada", tidak: "Tidak Ada", max: 2 },
    { key: "helm2", label: "Helm 2 (opsional)", ada: "Ada", tidak: "Tidak Ada", max: 1 },
    { key: "jashujan", label: "Jas Hujan", ada: "Ada", tidak: "Tidak Ada", max: 2 },
    { key: "sarungtangan", label: "Sarung Tangan", ada: "Ada", tidak: "Tidak Ada", max: 2 },
    { key: "sepatu", label: "Sepatu", ada: "Ada", tidak: "Tidak Ada", max: 2 },
    { key: "motor", label: "Motor", ada: "Layak", tidak: "Tidak Layak", max: 2 }
];
const TR_KELENGKAPAN_MAX_TOTAL = TR_KELENGKAPAN_ITEMS.reduce((a, k) => a + k.max, 0);
const TR_SCORE_MAX_TOTAL = TR_SCORE_FIELDS.reduce((a, f) => a + f.max, 0) + TR_KELENGKAPAN_MAX_TOTAL;

function trHitungHasil(total) {
    if (total >= 90) return { label: "LULUS", cls: "tr-hasil-lulus", emoji: "✅" };
    if (total >= 80) return { label: "EVALUASI", cls: "tr-hasil-evaluasi", emoji: "⏳" };
    return { label: "TIDAK LULUS", cls: "tr-hasil-tidaklulus", emoji: "❌" };
}

/* Badge status pengajuan ke Admin (dipakai di kartu list & modal detail) */
function trPengajuanBadgeHtml(c) {
    const s = c && c.statusPengajuan;
    if (s === "diajukan") return `<span class="pm-chip" style="background:#fef3c7;color:#b45309;border-color:#fde68a;"><i data-lucide="clock" class="w-3 h-3 inline"></i> Menunggu Admin</span>`;
    if (s === "disetujui") return `<span class="pm-chip pm-chip-approved"><i data-lucide="badge-check" class="w-3 h-3 inline"></i> Disetujui</span>`;
    if (s === "ditolak") return `<span class="pm-chip pm-chip-rejected"><i data-lucide="x-circle" class="w-3 h-3 inline"></i> Ditolak Admin</span>`;
    return "";
}

/* ------------------------------------------------------------------ *
 * 5. Markup screens
 * ------------------------------------------------------------------ */
const TR_BERKAS_ITEMS = [
    { key: "ktp", label: "Fotokopi KTP" },
    { key: "kk", label: "Fotokopi KK" },
    { key: "simc", label: "Fotokopi SIM C Aktif" },
    { key: "skck", label: "SKCK (Jika Ada)" },
    { key: "bpjs", label: "BPJS Kesehatan" },
    { key: "foto", label: "Pas Foto 3x4" }
];
const TR_PERLENGKAPAN_ITEMS = [
    { key: "helm1", label: "Helm (1)" },
    { key: "helm2", label: "Helm (2) — opsional" },
    { key: "jashujan1", label: "Jas Hujan (1)" },
    { key: "jashujan2", label: "Jas Hujan (2) — opsional" }
];
const TR_VERIF_ITEMS = [
    { key: "interview", label: "Sudah Interview" },
    { key: "lulusSeleksi", label: "Lulus Seleksi" },
    { key: "training", label: "Sudah Training" },
    { key: "akunAktif", label: "Akun Aktif" },
    { key: "setujuSop", label: "Sudah Menyetujui SOP" },
    { key: "bayarDeposit", label: "Sudah Bayar Deposit & Administrasi" },
    { key: "terimaPerlengkapan", label: "Sudah Terima Perlengkapan" },
    { key: "aktifKurir", label: "Aktif Menjadi Kurir" }
];

function trScreensHtml() {
    return `
    <!-- ================= DASHBOARD ================= -->
    <div id="screen-tr-dashboard" class="screen">
        <div class="pm-header" style="background:linear-gradient(135deg,#7c2d12 0%,#c2410c 55%,#f59e0b 100%);">
            <div class="pm-header-row">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="pm-avatar"><i data-lucide="graduation-cap" class="w-5 h-5"></i></div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-sm session-fullname truncate">Trainer</h3>
                        <p class="text-[10px] opacity-80">Portal Training Kurir Baru</p>
                    </div>
                </div>
                <span class="pm-badge">Trainer</span>
            </div>
            <div class="pm-stats">
                <div class="pm-stat-tile"><p class="l">Calon Kurir</p><p class="n" id="tr-stat-total">0</p></div>
                <div class="pm-stat-tile"><p class="l">Aktif Kurir</p><p class="n" id="tr-stat-aktif">0</p></div>
                <div class="pm-stat-tile"><p class="l">Sudah Dinilai</p><p class="n" id="tr-stat-dinilai">0</p></div>
            </div>
        </div>
        <div class="pm-body">
            <div class="pm-section-title"><i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>Menu Trainer</div>
            <div class="pm-menu-grid">
                <button class="pm-menu-card" onclick="window.__tr.go('screen-tr-list')">
                    <div class="pm-menu-icon" style="background:#c2410c"><i data-lucide="users" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Data Calon Kurir</span>
                    <span class="pm-menu-sub">Identitas, kendaraan, berkas &amp; verifikasi</span>
                </button>
                <button class="pm-menu-card" onclick="window.__tr.go('screen-tr-penilaian')">
                    <div class="pm-menu-icon" style="background:#7c3aed"><i data-lucide="clipboard-check" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Penilaian Calon Kurir</span>
                    <span class="pm-menu-sub">Form skor 100 poin &amp; riwayat</span>
                </button>
                <button class="pm-menu-card" onclick="window.__tr.go('screen-tr-statistik')">
                    <div class="pm-menu-icon" style="background:#0284c7"><i data-lucide="bar-chart-3" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Statistik</span>
                    <span class="pm-menu-sub">Total training, lolos &amp; gagal per bulan</span>
                </button>
                <button class="pm-menu-card" onclick="window.__tr.openSopMenu()">
                    <div class="pm-menu-icon" style="background:#0d9488"><i data-lucide="book-marked" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Peraturan &amp; SOP Kerja</span>
                    <span class="pm-menu-sub">Panduan kerja kurir (lihat saja)</span>
                </button>
                <button class="pm-menu-card" onclick="window.__tr.logout()">
                    <div class="pm-menu-icon" style="background:#64748B"><i data-lucide="log-out" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Keluar</span>
                    <span class="pm-menu-sub">Logout akun</span>
                </button>
            </div>
        </div>
    </div>

    <!-- ================= DAFTAR CALON KURIR ================= -->
    <div id="screen-tr-list" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__tr.go('screen-tr-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Data Calon Kurir</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card space-y-2">
                <input id="tr-list-search" oninput="window.__tr.renderList()" class="pm-input" placeholder="Cari nama / NIK / no HP...">
                <div>
                    <label class="pm-label">Filter Bulan Training</label>
                    <div class="flex gap-2">
                        <input id="tr-list-bulan" type="month" oninput="window.__tr.renderList()" class="pm-input">
                        <button onclick="document.getElementById('tr-list-bulan').value='';window.__tr.renderList()" class="tr-toggle-btn" style="flex:0 0 auto;">Reset</button>
                    </div>
                </div>
            </div>
            <button class="pm-btn-primary flex items-center justify-center gap-2 mb-3 mt-3" onclick="window.__tr.openForm()">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Calon Kurir
            </button>
            <div class="flex items-center justify-between gap-2">
                <h4 class="tr-list-heading">Daftar Calon Kurir</h4>
                <button onclick="window.__tr.toggleListOpen()" class="tr-toggle-btn">
                    <span id="tr-toggle-list-text">Buka</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform"></i>
                </button>
            </div>
            <div id="tr-list-wrap" class="hidden">
                <div id="tr-list-container" class="mt-2"></div>
            </div>
        </div>
    </div>

    <!-- ================= FORM TAMBAH/EDIT CALON KURIR ================= -->
    <div id="screen-tr-form" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__tr.go('screen-tr-list')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2 id="tr-form-title">Tambah Calon Kurir</h2>
        </div>
        <div class="pm-body" style="padding-bottom:110px">
            <input type="hidden" id="tr-f-id">

            <div class="pm-section-title"><i data-lucide="id-card" class="w-3.5 h-3.5"></i>Data Diri</div>
            <div class="pm-card space-y-3">
                <div><label class="pm-label">Nama Lengkap</label><input id="tr-f-nama" class="pm-input" placeholder="Nama lengkap sesuai KTP"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Jenis Kelamin</label>
                        <select id="tr-f-gender" class="pm-select">
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                    </div>
                    <div><label class="pm-label">NIK KTP</label><input id="tr-f-nik" inputmode="numeric" maxlength="16" class="pm-input" placeholder="16 digit NIK"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Tempat Lahir</label><input id="tr-f-tempat-lahir" class="pm-input" placeholder="Kota lahir"></div>
                    <div><label class="pm-label">Tanggal Lahir</label><input id="tr-f-tanggal-lahir" type="date" class="pm-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">No. ID Card</label><input id="tr-f-id-card" class="pm-input" placeholder="Nomor ID Card"></div>
                    <div><label class="pm-label">Tanggal Training</label><input id="tr-f-tgl-training" type="date" class="pm-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">No HP Aktif/WA</label><input id="tr-f-hp-aktif" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                    <div><label class="pm-label">No HP Kurir</label><input id="tr-f-hp-kurir" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                </div>
                <div><label class="pm-label">Alamat Domisili</label><textarea id="tr-f-alamat" rows="2" class="pm-textarea" placeholder="Alamat domisili lengkap"></textarea></div>
                <div><label class="pm-label">Pekerjaan Lainnya</label><input id="tr-f-pekerjaan-lain" class="pm-input" placeholder="Kalau ada pekerjaan sampingan"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Nama Bank / E-Wallet</label><input id="tr-f-bank-nama" class="pm-input" placeholder="Contoh: BCA / DANA"></div>
                    <div><label class="pm-label">No. Rekening / E-Wallet</label><input id="tr-f-bank-nomor" inputmode="numeric" class="pm-input" placeholder="Nomor rekening/ewallet"></div>
                </div>
                <div><label class="pm-label">Status Pernikahan</label>
                    <select id="tr-f-status-nikah" class="pm-select">
                        <option value="Belum Menikah">Belum Menikah</option>
                        <option value="Menikah">Menikah</option>
                        <option value="Cerai">Cerai</option>
                    </select>
                </div>
                <div><label class="pm-label">No. BPJS Kesehatan</label><input id="tr-f-bpjs" inputmode="numeric" class="pm-input" placeholder="Nomor BPJS Kesehatan"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Kelas BPJS</label>
                        <select id="tr-f-bpjs-kelas" class="pm-select">
                            <option value="">-- Pilih Kelas --</option>
                            <option value="Kelas I">Kelas I</option>
                            <option value="Kelas II">Kelas II</option>
                            <option value="Kelas III">Kelas III</option>
                        </select>
                    </div>
                    <div><label class="pm-label">Biaya BPJS / Bulan</label><input id="tr-f-bpjs-biaya" inputmode="numeric" class="pm-input" placeholder="Contoh: 150000"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Nama Kontak Darurat</label><input id="tr-f-darurat-nama" class="pm-input" placeholder="Nama kontak darurat"></div>
                    <div><label class="pm-label">Hubungan Keluarga</label><input id="tr-f-darurat-hubungan" class="pm-input" placeholder="Contoh: Orang Tua / Kakak"></div>
                </div>
                <div><label class="pm-label">No HP Kontak Darurat</label><input id="tr-f-darurat-hp" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                <div><label class="pm-label">Catatan Khusus</label><textarea id="tr-f-catatan" rows="2" class="pm-textarea" placeholder="Catatan tambahan (opsional)"></textarea></div>
            </div>

            <div class="pm-section-title"><i data-lucide="bike" class="w-3.5 h-3.5"></i>Data Kendaraan</div>
            <div class="pm-card space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Jenis Kendaraan</label>
                        <select id="tr-f-kend-jenis" class="pm-select">
                            <option value="Motor">Motor</option>
                            <option value="Mobil">Mobil</option>
                            <option value="Sepeda">Sepeda</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div><label class="pm-label">Merek</label><input id="tr-f-kend-merek" class="pm-input" placeholder="Contoh: Honda"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Tipe</label><input id="tr-f-kend-tipe" class="pm-input" placeholder="Contoh: Beat"></div>
                    <div><label class="pm-label">Tahun</label><input id="tr-f-kend-tahun" inputmode="numeric" maxlength="4" class="pm-input" placeholder="Contoh: 2021"></div>
                </div>
                <div><label class="pm-label">Warna</label><input id="tr-f-kend-warna" class="pm-input" placeholder="Warna kendaraan"></div>
                <div><label class="pm-label">Nomor Polisi/Plat (opsional)</label><input id="tr-f-kend-plat" class="pm-input" placeholder="Contoh: E 1234 ABC"></div>
                <div><label class="pm-label">Nomor STNK (opsional)</label><input id="tr-f-kend-stnk" class="pm-input" placeholder="Nomor STNK"></div>
                <div><label class="pm-label">Masa Berlaku STNK (opsional)</label><input id="tr-f-kend-stnk-berlaku" type="date" class="pm-input"></div>
            </div>

            <div class="pm-section-title"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>Checklist Kelengkapan Berkas</div>
            <div class="pm-card space-y-2" id="tr-f-berkas-wrap"></div>

            <div class="pm-section-title"><i data-lucide="package-check" class="w-3.5 h-3.5"></i>Checklist Perlengkapan Kurir</div>
            <div class="pm-card space-y-2" id="tr-f-perlengkapan-wrap"></div>

            <div class="pm-section-title"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Status Verifikasi</div>
            <div class="pm-card space-y-2" id="tr-f-verifikasi-wrap"></div>

            <button class="pm-btn-primary flex items-center justify-center gap-2 mt-2" onclick="window.__tr.saveCandidate()">
                <i data-lucide="save" class="w-4 h-4"></i> <span id="tr-f-submit-text">Simpan Data Calon Kurir</span>
            </button>
        </div>
    </div>

    <!-- ================= PENILAIAN CALON KURIR ================= -->
    <div id="screen-tr-penilaian" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__tr.go('screen-tr-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Penilaian Calon Kurir</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card space-y-2">
                <input id="tr-pen-search" oninput="window.__tr.renderPenilaianList()" class="pm-input" placeholder="Cari nama calon kurir...">
                <div>
                    <label class="pm-label">Filter Bulan Penilaian</label>
                    <div class="flex gap-2">
                        <input id="tr-pen-bulan" type="month" oninput="window.__tr.renderPenilaianList()" class="pm-input">
                        <button onclick="document.getElementById('tr-pen-bulan').value='';window.__tr.renderPenilaianList()" class="tr-toggle-btn" style="flex:0 0 auto;">Reset</button>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between gap-2 mt-3">
                <h4 class="tr-list-heading">Daftar Penilaian</h4>
                <button onclick="window.__tr.togglePenilaianOpen()" class="tr-toggle-btn">
                    <span id="tr-toggle-pen-text">Buka</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform"></i>
                </button>
            </div>
            <div id="tr-penilaian-wrap" class="hidden">
                <div id="tr-penilaian-list-container" class="mt-2"></div>
            </div>
        </div>
    </div>

    <!-- ================= STATISTIK TRAINER ================= -->
    <div id="screen-tr-statistik" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__tr.go('screen-tr-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Statistik</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card space-y-2">
                <label class="pm-label">Filter Bulan</label>
                <div class="flex gap-2">
                    <input id="tr-stat-bulan" type="month" oninput="window.__tr.renderStatistik()" class="pm-input">
                    <button onclick="document.getElementById('tr-stat-bulan').value='';window.__tr.renderStatistik()" class="tr-toggle-btn" style="flex:0 0 auto;">Semua</button>
                </div>
            </div>
            <div class="pm-stats" style="margin-top:12px;">
                <div class="pm-stat-tile tr-stat-clickable" onclick="window.__tr.scrollToStat('training')"><p class="l">Total Training</p><p class="n" id="tr-stat-s-total">0</p></div>
                <div class="pm-stat-tile tr-stat-clickable" onclick="window.__tr.scrollToStat('lulus')"><p class="l">Jml Lolos</p><p class="n" id="tr-stat-s-lolos">0</p></div>
                <div class="pm-stat-tile tr-stat-clickable" onclick="window.__tr.scrollToStat('gagal')"><p class="l">Jml Gagal</p><p class="n" id="tr-stat-s-gagal">0</p></div>
            </div>

            <div class="pm-card mt-3">
                <p class="pm-label mb-2">Proporsi Hasil (dari Total Training)</p>
                <div class="tr-bar-chart" id="tr-stat-bar"></div>
                <div class="flex flex-wrap gap-3 mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-300">
                    <span class="flex items-center gap-1"><span class="tr-bar-dot" style="background:#059669"></span>Lolos</span>
                    <span class="flex items-center gap-1"><span class="tr-bar-dot" style="background:#dc2626"></span>Gagal</span>
                    <span class="flex items-center gap-1"><span class="tr-bar-dot" style="background:#cbd5e1"></span>Belum Dinilai</span>
                </div>
            </div>

            <div id="tr-stat-anchor-training" class="pm-section-title mt-4"><i data-lucide="users" class="w-3.5 h-3.5"></i>Total Training (<span id="tr-stat-c-total">0</span>)</div>
            <div id="tr-stat-list-training" class="space-y-2"></div>

            <div id="tr-stat-anchor-lulus" class="pm-section-title mt-4"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>Jml Lolos (<span id="tr-stat-c-lulus">0</span>)</div>
            <div id="tr-stat-list-lulus" class="space-y-2"></div>

            <div id="tr-stat-anchor-gagal" class="pm-section-title mt-4"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Jml Gagal (<span id="tr-stat-c-gagal">0</span>)</div>
            <div id="tr-stat-list-gagal" class="space-y-2"></div>
        </div>
    </div>

    <div id="tr-modal-slot"></div>
    `;
}

/* ------------------------------------------------------------------ *
 * 6. Injeksi DOM
 * ------------------------------------------------------------------ */
function trInjectScreens() {
    if (document.getElementById("tr-root")) return;
    const mount = document.getElementById("main-layout") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "tr-root";
    wrap.innerHTML = trScreensHtml();
    mount.appendChild(wrap);
    trRenderChecklistGroups();

    // Default filter bulan = bulan ini, biar begitu masuk sudah relevan.
    const bulanIni = trCurrentMonthISO();
    ["tr-list-bulan", "tr-pen-bulan", "tr-stat-bulan"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = bulanIni;
    });

    if (window.lucide) window.lucide.createIcons();
}

function trChecklistRowHtml(prefix, key, label, checked) {
    return `<div class="tr-check-row ${checked ? "is-on" : ""}" data-key="${key}" onclick="window.__tr.toggleCheck('${prefix}','${key}', this)">
        <span class="trc-label">${trEsc(label)}</span>
        <span class="trc-toggle"></span>
    </div>`;
}

let trFormState = { berkas: {}, perlengkapan: {}, verifikasi: {} };

function trRenderChecklistGroups() {
    const berkasWrap = document.getElementById("tr-f-berkas-wrap");
    if (berkasWrap) berkasWrap.innerHTML = TR_BERKAS_ITEMS.map(i => trChecklistRowHtml("berkas", i.key, i.label, !!trFormState.berkas[i.key])).join("");

    const perlengkapanWrap = document.getElementById("tr-f-perlengkapan-wrap");
    if (perlengkapanWrap) perlengkapanWrap.innerHTML = TR_PERLENGKAPAN_ITEMS.map(i => trChecklistRowHtml("perlengkapan", i.key, i.label, !!trFormState.perlengkapan[i.key])).join("");

    const verifWrap = document.getElementById("tr-f-verifikasi-wrap");
    if (verifWrap) verifWrap.innerHTML = TR_VERIF_ITEMS.map(i => trChecklistRowHtml("verifikasi", i.key, i.label, !!trFormState.verifikasi[i.key])).join("");
}

/* ------------------------------------------------------------------ *
 * 7. Navigasi
 * ------------------------------------------------------------------ */
const TR_SCREENS = ["screen-tr-dashboard", "screen-tr-list", "screen-tr-form", "screen-tr-penilaian", "screen-tr-statistik"];

function trHideAppBar() {
    const appBar = document.getElementById("app-bar");
    if (appBar) { appBar.classList.remove("flex"); appBar.classList.add("hidden"); }
}

function trAfterNavigate(screenId) {
    const guard = document.getElementById("tr-early-guard-style");
    if (guard) guard.remove();
    if (!TR_SCREENS.includes(screenId)) { trCurrentScreen = null; return; }
    trCurrentScreen = screenId;
    trHideAppBar();
    trRenderActiveScreen();
}

/* Screen yang HARAM ditampilkan untuk sesi Trainer (dashboard admin asli).
 * Kalau script.js sendiri (misalnya lewat launchApplicationSession saat
 * login/refresh) mencoba mengaktifkan ini, alihkan paksa ke dashboard
 * Trainer — supaya tampilan tetap fokus & tidak "kecampur" punya admin,
 * persis seperti cara petugasmitra.js menjaga fokus tampilannya sendiri. */
const TR_FORBIDDEN_TARGETS = ["screen-admin-dashboard"];

function trPatchNavigation() {
    if (window.__trNavPatched) return;
    window.__trNavPatched = true;
    const origNavigateTo = window.navigateTo;
    window.navigateTo = function (screenId) {
        // Cegah script.js "membajak" tampilan sesi Trainer ke dashboard
        // admin asli. Dengan dialihkan lewat navigateTo (bukan manipulasi
        // class manual), currentScreen & navigationHistory di script.js
        // selalu tercatat benar sebagai "screen-tr-dashboard", jadi tombol
        // kembali tidak akan pernah "nyasar" ke dashboard admin.
        const s0 = trGetSession();
        if (trIsTrainerSession(s0) && TR_FORBIDDEN_TARGETS.includes(screenId)) {
            screenId = "screen-tr-dashboard";
        }
        if (typeof origNavigateTo === "function") origNavigateTo(screenId);
        trAfterNavigate(screenId);
    };
    const origNavigateBack = window.navigateBack;
    window.navigateBack = function () {
        if (typeof origNavigateBack === "function") origNavigateBack();
        const s = trGetSession();
        if (!trIsTrainerSession(s)) return;

        const guard = document.getElementById("tr-early-guard-style");
        if (guard) guard.remove();

        // Jaring pengaman: kalau tombol "kembali" (termasuk tombol back HP /
        // history.back() bawaan app-bar) entah bagaimana membawa ke
        // dashboard admin asli atau layar login, paksa balik ke dashboard
        // Trainer saja — jangan biarkan tampilan admin kebawa.
        const activeElGlobal = document.querySelector(".screen.active");
        if (!activeElGlobal || activeElGlobal.id === "screen-admin-dashboard" || activeElGlobal.id === "screen-login") {
            if (typeof window.navigateTo === "function") window.navigateTo("screen-tr-dashboard");
            return;
        }

        const activeEl = document.querySelector("#tr-root .screen.active");
        if (activeEl) trAfterNavigate(activeEl.id);
        else trCurrentScreen = null;
    };
}

function trRenderActiveScreen() {
    if (!trCurrentScreen) return;
    if (trCurrentScreen === "screen-tr-dashboard") trRenderDashboard();
    if (trCurrentScreen === "screen-tr-list") { trRenderList(); trApplyListOpenState(); }
    if (trCurrentScreen === "screen-tr-penilaian") { trRenderPenilaianList(); trApplyPenilaianOpenState(); }
    if (trCurrentScreen === "screen-tr-statistik") trRenderStatistik();
}

/* ------------------------------------------------------------------ *
 * 8. Dashboard stats
 * ------------------------------------------------------------------ */
function trRenderDashboard() {
    const list = Object.values(cloudCalonKurir || {});
    const total = list.length;
    const aktif = list.filter(c => c && c.verifikasi && c.verifikasi.aktifKurir).length;
    const dinilaiSet = new Set(Object.values(cloudPenilaian || {}).map(p => p && p.calonKurirId).filter(Boolean));

    const elTotal = document.getElementById("tr-stat-total");
    const elAktif = document.getElementById("tr-stat-aktif");
    const elDinilai = document.getElementById("tr-stat-dinilai");
    if (elTotal) elTotal.innerText = total;
    if (elAktif) elAktif.innerText = aktif;
    if (elDinilai) elDinilai.innerText = dinilaiSet.size;
}

/* ------------------------------------------------------------------ *
 * 9. Daftar Calon Kurir
 * ------------------------------------------------------------------ */
function trVerifProgress(c) {
    const v = (c && c.verifikasi) || {};
    const done = TR_VERIF_ITEMS.filter(i => v[i.key]).length;
    return { done, total: TR_VERIF_ITEMS.length };
}

function trCandidateCardHtml(id, c, index) {
    const prog = trVerifProgress(c);
    const progTone = prog.done === prog.total ? "background:#d1fae5;color:#047857" : (prog.done === 0 ? "background:#f1f5f9;color:#64748b" : "background:#fef3c7;color:#b45309");
    return `<div class="pm-card">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
                <p class="font-bold text-[13px] truncate"><span class="text-orange-600 mr-1">#${index}</span>${trEsc(c.nama || "-")}</p>
                <p class="text-[10.5px] text-slate-400 truncate">NIK: ${trEsc(c.nik || "-")}</p>
                <p class="text-[10px] text-slate-400 mt-1"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${trEsc(c.hpAktif || "-")}</p>
                <p class="text-[10px] text-slate-400"><i data-lucide="calendar" class="w-3 h-3 inline"></i> Training: ${trFormatTanggal(c.tglTraining)}</p>
            </div>
            <span class="tr-progress-badge" style="${progTone}">${prog.done}/${prog.total} Verifikasi</span>
        </div>
        ${trPengajuanBadgeHtml(c) ? `<div class="mt-2">${trPengajuanBadgeHtml(c)}</div>` : ""}
        <div class="flex gap-2 mt-3">
            <button onclick="window.__tr.showDetail('${id}')" class="pm-btn-outline flex-1">Detail</button>
            <button onclick="window.__tr.openForm('${id}')" class="pm-btn-outline flex-1" style="border-color:#c2410c;color:#c2410c">Kelola Data</button>
            <button onclick="window.__tr.deleteCandidate('${id}')" class="pm-btn-outline" style="border-color:#e11d48;color:#e11d48;flex:0 0 auto;padding-left:12px;padding-right:12px;">Hapus</button>
        </div>
    </div>`;
}

function trRenderList() {
    const container = document.getElementById("tr-list-container");
    if (!container) return;
    const search = (document.getElementById("tr-list-search")?.value || "").trim().toLowerCase();
    const bulan = document.getElementById("tr-list-bulan")?.value || ""; // format YYYY-MM

    const entries = Object.entries(cloudCalonKurir || {}).filter(([, c]) => {
        if (!c) return false;
        if (bulan && !(c.tglTraining || "").startsWith(bulan)) return false;
        if (!search) return true;
        return (c.nama || "").toLowerCase().includes(search) || (c.nik || "").toLowerCase().includes(search) || (c.hpAktif || "").toLowerCase().includes(search);
    }).sort((a, b) => (a[1].nama || "").localeCompare(b[1].nama || ""));

    if (!entries.length) { container.innerHTML = `<div class="pm-empty">Belum ada data calon kurir.</div>`; return; }
    container.innerHTML = entries.map(([id, c], i) => trCandidateCardHtml(id, c, i + 1)).join("");
    if (window.lucide) window.lucide.createIcons();
}

/* Toggle buka/tutup daftar (default tertutup saat baru masuk layar) */
let trListOpen = false;
function trToggleListOpen() {
    trListOpen = !trListOpen;
    trApplyListOpenState();
}
function trApplyListOpenState() {
    const wrap = document.getElementById("tr-list-wrap");
    const text = document.getElementById("tr-toggle-list-text");
    const btn = text ? text.closest(".tr-toggle-btn") : null;
    if (wrap) wrap.classList.toggle("hidden", !trListOpen);
    if (text) text.textContent = trListOpen ? "Tutup" : "Buka";
    if (btn) btn.classList.toggle("is-open", trListOpen);
}

/* ------------------------------------------------------------------ *
 * 10. Detail (modal)
 * ------------------------------------------------------------------ */
function trShowDetail(id) {
    const c = cloudCalonKurir[id];
    if (!c) return trToast("Data tidak ditemukan.");

    const berkasHtml = TR_BERKAS_ITEMS.map(i => `<span class="pm-chip ${c.berkas && c.berkas[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${trEsc(i.label)}</span>`).join(" ");
    const perlengkapanHtml = TR_PERLENGKAPAN_ITEMS.map(i => `<span class="pm-chip ${c.perlengkapan && c.perlengkapan[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${trEsc(i.label)}</span>`).join(" ");
    const verifHtml = TR_VERIF_ITEMS.map(i => `<span class="pm-chip ${c.verifikasi && c.verifikasi[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${trEsc(i.label)}</span>`).join(" ");

    const riwayat = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === id).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

    const slot = document.getElementById("tr-modal-slot");
    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-sm">${trEsc(c.nama || "-")}</h3>
                <button onclick="document.getElementById('tr-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            ${trPengajuanBadgeHtml(c) ? `<div class="mb-2">${trPengajuanBadgeHtml(c)}</div>` : ""}
            <div class="space-y-2 text-[12px]">
                <p><b>Jenis Kelamin:</b> ${trEsc(c.gender || "-")}</p>
                <p><b>NIK:</b> ${trEsc(c.nik || "-")}</p>
                <p><b>TTL:</b> ${trEsc(c.tempatLahir || "-")}, ${trFormatTanggal(c.tanggalLahir)}</p>
                <p><b>No. ID Card:</b> ${trEsc(c.idCard || "-")}</p>
                <p><b>Tanggal Training:</b> ${trFormatTanggal(c.tglTraining)}</p>
                <p><b>HP Aktif/WA:</b> ${trEsc(c.hpAktif || "-")} &middot; <b>HP Kurir:</b> ${trEsc(c.hpKurir || "-")}</p>
                <p><b>Alamat:</b> ${trEsc(c.alamat || "-")}</p>
                <p><b>Pekerjaan Lain:</b> ${trEsc(c.pekerjaanLain || "-")}</p>
                <p><b>Rekening/E-Wallet:</b> ${trEsc(c.bankNama || "-")} — ${trEsc(c.bankNomor || "-")}</p>
                <p><b>Status Pernikahan:</b> ${trEsc(c.statusNikah || "-")}</p>
                <p><b>BPJS:</b> ${trEsc(c.bpjs || "-")} (${trEsc(c.bpjsKelas || "-")}, Rp ${(parseInt(c.bpjsBiaya) || 0).toLocaleString("id-ID")}/bulan)</p>
                <p><b>Kontak Darurat:</b> ${trEsc(c.daruratNama || "-")} (${trEsc(c.daruratHubungan || "-")}) — ${trEsc(c.daruratHp || "-")}</p>
                ${c.catatan ? `<p><b>Catatan:</b> ${trEsc(c.catatan)}</p>` : ""}
            </div>
            <div class="pm-section-title mt-3"><i data-lucide="bike" class="w-3.5 h-3.5"></i>Kendaraan</div>
            <div class="space-y-1 text-[12px]">
                <p>${trEsc(c.kendJenis || "-")} — ${trEsc(c.kendMerek || "-")} ${trEsc(c.kendTipe || "-")} (${trEsc(c.kendTahun || "-")}) — ${trEsc(c.kendWarna || "-")}</p>
                <p>Plat: ${trEsc(c.kendPlat || "-")} &middot; STNK: ${trEsc(c.kendStnk || "-")} &middot; Berlaku s/d: ${trFormatTanggal(c.kendStnkBerlaku)}</p>
            </div>
            <div class="pm-section-title mt-3"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>Kelengkapan Berkas</div>
            <div class="flex flex-wrap gap-1.5">${berkasHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="package-check" class="w-3.5 h-3.5"></i>Perlengkapan Kurir</div>
            <div class="flex flex-wrap gap-1.5">${perlengkapanHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Status Verifikasi</div>
            <div class="flex flex-wrap gap-1.5">${verifHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>Riwayat Penilaian</div>
            ${riwayat.length ? riwayat.map(([pid, p]) => {
                const hasil = trHitungHasil(p.total || 0);
                return `<div class="pm-card flex items-center justify-between">
                    <div class="min-w-0"><p class="font-bold text-[12px]">${trFormatTanggal(p.tanggalSeleksi)}</p><p class="text-[10px] text-slate-400">Trainer: ${trEsc(p.trainerNama || "-")}</p></div>
                    <span class="tr-hasil-badge ${hasil.cls}" style="font-size:11px;padding:4px 10px;">${hasil.emoji} ${p.total || 0}/100</span>
                </div>`;
            }).join("") : `<div class="pm-empty">Belum ada penilaian.</div>`}
            <div class="flex gap-2 mt-3">
                <button onclick="document.getElementById('tr-modal-slot').innerHTML='';window.__tr.openForm('${id}')" class="pm-btn-outline flex-1">Edit Data</button>
                <button onclick="document.getElementById('tr-modal-slot').innerHTML='';window.__tr.go('screen-tr-penilaian');setTimeout(()=>window.__tr.openScoreForm('${id}'),80)" class="pm-btn-primary flex-1">Beri Nilai</button>
            </div>
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

async function trDeleteCandidate(id) {
    const c = cloudCalonKurir[id];
    if (!c) return;
    if (!(await trConfirm(`Hapus data calon kurir "${c.nama || "-"}"? Seluruh riwayat penilaiannya juga akan dihapus.`))) return;
    try {
        await remove(ref(db, `calon_kurir/${id}`));
        const toDelete = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === id).map(([pid]) => pid);
        toDelete.forEach(pid => remove(ref(db, `penilaian_calon_kurir/${pid}`)));
        trToast("Data calon kurir dihapus.");
    } catch (err) { trToast("Gagal menghapus: " + err.message); }
}

/* ------------------------------------------------------------------ *
 * 11. Form tambah/edit
 * ------------------------------------------------------------------ */
function trOpenForm(id) {
    const c = id ? cloudCalonKurir[id] : null;

    document.getElementById("tr-f-id").value = id || "";
    document.getElementById("tr-form-title").innerText = id ? "Edit Data Calon Kurir" : "Tambah Calon Kurir";
    document.getElementById("tr-f-submit-text").innerText = id ? "Simpan Perubahan" : "Simpan Data Calon Kurir";

    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ""; };
    setVal("tr-f-nama", c?.nama);
    setVal("tr-f-gender", c?.gender || "Laki-laki");
    setVal("tr-f-nik", c?.nik);
    setVal("tr-f-tempat-lahir", c?.tempatLahir);
    setVal("tr-f-tanggal-lahir", c?.tanggalLahir);
    setVal("tr-f-id-card", c?.idCard);
    setVal("tr-f-tgl-training", c?.tglTraining);
    setVal("tr-f-hp-aktif", c?.hpAktif);
    setVal("tr-f-hp-kurir", c?.hpKurir);
    setVal("tr-f-alamat", c?.alamat);
    setVal("tr-f-pekerjaan-lain", c?.pekerjaanLain);
    setVal("tr-f-bank-nama", c?.bankNama);
    setVal("tr-f-bank-nomor", c?.bankNomor);
    setVal("tr-f-status-nikah", c?.statusNikah || "Belum Menikah");
    setVal("tr-f-bpjs", c?.bpjs);
    setVal("tr-f-bpjs-kelas", c?.bpjsKelas);
    setVal("tr-f-bpjs-biaya", c?.bpjsBiaya);
    setVal("tr-f-darurat-nama", c?.daruratNama);
    setVal("tr-f-darurat-hubungan", c?.daruratHubungan);
    setVal("tr-f-darurat-hp", c?.daruratHp);
    setVal("tr-f-catatan", c?.catatan);

    setVal("tr-f-kend-jenis", c?.kendJenis || "Motor");
    setVal("tr-f-kend-merek", c?.kendMerek);
    setVal("tr-f-kend-tipe", c?.kendTipe);
    setVal("tr-f-kend-tahun", c?.kendTahun);
    setVal("tr-f-kend-warna", c?.kendWarna);
    setVal("tr-f-kend-plat", c?.kendPlat);
    setVal("tr-f-kend-stnk", c?.kendStnk);
    setVal("tr-f-kend-stnk-berlaku", c?.kendStnkBerlaku);

    trFormState = {
        berkas: { ...(c?.berkas || {}) },
        perlengkapan: { ...(c?.perlengkapan || {}) },
        verifikasi: { ...(c?.verifikasi || {}) }
    };
    trRenderChecklistGroups();
    if (window.lucide) window.lucide.createIcons();

    window.__tr.go("screen-tr-form");
}

function trToggleCheck(prefix, key, el) {
    if (!trFormState[prefix]) trFormState[prefix] = {};
    trFormState[prefix][key] = !trFormState[prefix][key];
    if (el) el.classList.toggle("is-on", !!trFormState[prefix][key]);
}

async function trSaveCandidate() {
    const id = document.getElementById("tr-f-id").value;
    const nama = document.getElementById("tr-f-nama").value.trim();
    if (!nama) return trToast("Nama lengkap wajib diisi.", "warning");

    const val = (elId) => document.getElementById(elId)?.value.trim() || "";

    const payload = {
        nama,
        gender: val("tr-f-gender"),
        nik: val("tr-f-nik"),
        tempatLahir: val("tr-f-tempat-lahir"),
        tanggalLahir: val("tr-f-tanggal-lahir"),
        idCard: val("tr-f-id-card"),
        tglTraining: val("tr-f-tgl-training"),
        hpAktif: val("tr-f-hp-aktif"),
        hpKurir: val("tr-f-hp-kurir"),
        alamat: val("tr-f-alamat"),
        pekerjaanLain: val("tr-f-pekerjaan-lain"),
        bankNama: val("tr-f-bank-nama"),
        bankNomor: val("tr-f-bank-nomor"),
        statusNikah: val("tr-f-status-nikah"),
        bpjs: val("tr-f-bpjs"),
        bpjsKelas: val("tr-f-bpjs-kelas"),
        bpjsBiaya: val("tr-f-bpjs-biaya"),
        daruratNama: val("tr-f-darurat-nama"),
        daruratHubungan: val("tr-f-darurat-hubungan"),
        daruratHp: val("tr-f-darurat-hp"),
        catatan: val("tr-f-catatan"),

        kendJenis: val("tr-f-kend-jenis"),
        kendMerek: val("tr-f-kend-merek"),
        kendTipe: val("tr-f-kend-tipe"),
        kendTahun: val("tr-f-kend-tahun"),
        kendWarna: val("tr-f-kend-warna"),
        kendPlat: val("tr-f-kend-plat"),
        kendStnk: val("tr-f-kend-stnk"),
        kendStnkBerlaku: val("tr-f-kend-stnk-berlaku"),

        berkas: { ...trFormState.berkas },
        perlengkapan: { ...trFormState.perlengkapan },
        verifikasi: { ...trFormState.verifikasi },

        updatedAt: Date.now()
    };

    try {
        if (id) {
            await update(ref(db, `calon_kurir/${id}`), payload);
            trToast("Data calon kurir berhasil diperbarui.");
        } else {
            payload.createdAt = Date.now();
            await push(ref(db, "calon_kurir"), payload);
            trToast("Calon kurir baru berhasil ditambahkan.");
        }
        window.__tr.go("screen-tr-list");
    } catch (err) {
        trToast("Gagal menyimpan: " + err.message);
    }
}

/* ------------------------------------------------------------------ *
 * 12. Penilaian Calon Kurir
 * ------------------------------------------------------------------ */
function trRenderPenilaianList() {
    const container = document.getElementById("tr-penilaian-list-container");
    if (!container) return;
    const search = (document.getElementById("tr-pen-search")?.value || "").trim().toLowerCase();
    const bulan = document.getElementById("tr-pen-bulan")?.value || ""; // format YYYY-MM

    const entries = Object.entries(cloudCalonKurir || {}).filter(([id, c]) => {
        if (!c) return false;
        if (bulan) {
            const cocok = Object.values(cloudPenilaian || {}).some(p => p && p.calonKurirId === id && (p.tanggalSeleksi || "").startsWith(bulan));
            if (!cocok) return false;
        }
        return !search || (c.nama || "").toLowerCase().includes(search);
    }).sort((a, b) => (a[1].nama || "").localeCompare(b[1].nama || ""));

    if (!entries.length) { container.innerHTML = `<div class="pm-empty">Belum ada data calon kurir untuk dinilai.</div>`; return; }

    container.innerHTML = entries.map(([id, c]) => {
        const riwayat = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === id).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
        const last = riwayat[0] ? riwayat[0][1] : null;
        const lastPid = riwayat[0] ? riwayat[0][0] : null;
        const hasilChip = last ? (() => { const h = trHitungHasil(last.total || 0); return `<span class="tr-hasil-badge ${h.cls}" style="font-size:10px;padding:3px 9px;">${h.emoji} ${last.total}/100</span>`; })() : `<span class="pm-chip" style="background:#f1f5f9;color:#64748b">Belum dinilai</span>`;
        const pengajuanChip = trPengajuanBadgeHtml(c);
        const statusP = c.statusPengajuan || "belum";
        const bisaAjukan = riwayat.length > 0 && statusP !== "diajukan" && statusP !== "disetujui";

        const actionHtml = riwayat.length
            ? `<div class="flex flex-wrap gap-1.5 mt-2">
                <button onclick="window.__tr.openScoreForm('${id}')" class="pm-btn-outline" style="width:auto;padding:7px 10px;font-size:10.5px;">Detail Penilaian</button>
                <button onclick="window.__tr.deleteScoreQuick('${lastPid}','${id}')" class="pm-btn-outline" style="width:auto;padding:7px 10px;font-size:10.5px;border-color:#e11d48;color:#e11d48;">Hapus</button>
                ${bisaAjukan ? `<button onclick="window.__tr.ajukanKeAdmin('${id}')" class="pm-btn-outline" style="width:auto;padding:7px 10px;font-size:10.5px;border-color:#7c3aed;color:#7c3aed;">Ajukan Kembali</button>` : ""}
              </div>`
            : `<button onclick="window.__tr.openScoreForm('${id}')" class="pm-btn-primary mt-2" style="width:auto;padding:9px 14px;">Nilai</button>`;

        return `<div class="pm-card">
            <div class="min-w-0">
                <p class="font-bold text-[12.5px] truncate">${trEsc(c.nama || "-")}</p>
                <p class="text-[10px] text-slate-400">${riwayat.length ? "Sudah dinilai" : "Belum dinilai"}</p>
                <div class="mt-1 flex flex-wrap gap-1">${hasilChip}${pengajuanChip}</div>
            </div>
            ${actionHtml}
        </div>`;
    }).join("");
    if (window.lucide) window.lucide.createIcons();
}

/* Toggle buka/tutup daftar penilaian (default tertutup) */
let trPenilaianOpen = false;
function trTogglePenilaianOpen() {
    trPenilaianOpen = !trPenilaianOpen;
    trApplyPenilaianOpenState();
}
function trApplyPenilaianOpenState() {
    const wrap = document.getElementById("tr-penilaian-wrap");
    const text = document.getElementById("tr-toggle-pen-text");
    const btn = text ? text.closest(".tr-toggle-btn") : null;
    if (wrap) wrap.classList.toggle("hidden", !trPenilaianOpen);
    if (text) text.textContent = trPenilaianOpen ? "Tutup" : "Buka";
    if (btn) btn.classList.toggle("is-open", trPenilaianOpen);
}

function trScoreFieldRowHtml(f) {
    return `<div class="tr-score-row">
        <label>${trEsc(f.label)} <span class="text-slate-400">(maks ${f.max})</span></label>
        <input type="number" min="0" max="${f.max}" id="tr-p-${f.key}" class="pm-input" placeholder="0" oninput="window.__tr.recalcScore()">
    </div>`;
}

function trKelengkapanRowHtml(k) {
    return `<div class="tr-score-row">
        <label>${trEsc(k.label)} <span class="text-slate-400">(maks ${k.max})</span></label>
        <select id="tr-p-kl-${k.key}" class="pm-select" onchange="window.__tr.recalcScore()">
            <option value="0" selected>-- Pilih --</option>
            <option value="${k.max}">${trEsc(k.ada)} (${k.max})</option>
            <option value="1">${trEsc(k.tidak)} (1)</option>
        </select>
    </div>`;
}

function trOpenScoreForm(candidateId) {
    const c = cloudCalonKurir[candidateId];
    if (!c) return trToast("Data calon kurir tidak ditemukan.");

    const riwayat = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === candidateId).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    const sudahDinilai = riwayat.length > 0;

    const slot = document.getElementById("tr-modal-slot");

    if (sudahDinilai) {
        // Sudah pernah dinilai -> jangan bisa nilai lagi, cuma tampilkan hasil + tombol hapus.
        const [lastPid, last] = riwayat[0];
        const h = trHitungHasil(last.total || 0);
        slot.innerHTML = `
        <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
            <div class="pm-modal-sheet">
                <div class="flex items-center justify-between mb-3">
                    <div><h3 class="font-bold text-sm">Penilaian Calon Kurir</h3><p class="text-[10px] text-slate-400">${trEsc(c.nama || "-")}</p></div>
                    <button onclick="document.getElementById('tr-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="pm-card" style="background:#f1f5f9;border-color:#e2e8f0;">
                    <p class="text-[11px] font-bold text-slate-500"><i data-lucide="info" class="w-3.5 h-3.5 inline"></i> Calon kurir ini sudah dinilai. Hapus penilaiannya dulu kalau ingin menilai ulang.</p>
                </div>
                <div class="pm-card mt-2">
                    <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-bold text-[12px]">${trFormatTanggal(last.tanggalSeleksi)}</p>
                            <p class="text-[10px] text-slate-400">Trainer: ${trEsc(last.trainerNama || "-")}</p>
                            ${last.catatan ? `<p class="text-[10px] text-slate-400 mt-1">Catatan: ${trEsc(last.catatan)}</p>` : ""}
                        </div>
                        <span class="tr-hasil-badge ${h.cls}" style="font-size:12px;padding:6px 12px;flex-shrink:0;">${h.emoji} ${last.total || 0}/100</span>
                    </div>
                </div>
                <button onclick="window.__tr.deleteScore('${lastPid}','${candidateId}')" class="pm-btn-outline flex items-center justify-center gap-2 mt-2" style="border-color:#e11d48;color:#e11d48;width:100%;">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Hapus Penilaian
                </button>
                <div class="pm-section-title mt-4"><i data-lucide="list-checks" class="w-3.5 h-3.5"></i>Rincian Penilaian</div>
                <div class="pm-card space-y-1">
                    ${TR_SCORE_FIELDS.map(f => `<div class="flex items-center justify-between text-[11.5px] py-1 border-b border-slate-100 dark:border-slate-800">
                        <span class="text-slate-500 dark:text-slate-300">${trEsc(f.label)}</span>
                        <span class="font-bold">${(last.scores && last.scores[f.key]) || 0}/${f.max}</span>
                    </div>`).join("")}
                    ${TR_KELENGKAPAN_ITEMS.map(k => `<div class="flex items-center justify-between text-[11.5px] py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span class="text-slate-500 dark:text-slate-300">${trEsc(k.label)}</span>
                        <span class="font-bold">${(last.scores && last.scores.kelengkapan && typeof last.scores.kelengkapan === "object" ? last.scores.kelengkapan[k.key] : 0) || 0}/${k.max}</span>
                    </div>`).join("")}
                </div>
                ${riwayat.length > 1 ? `
                <div class="pm-section-title mt-4"><i data-lucide="history" class="w-3.5 h-3.5"></i>Riwayat Sebelumnya</div>
                ${riwayat.slice(1).map(([pid, p]) => {
                    const hh = trHitungHasil(p.total || 0);
                    return `<div class="pm-card flex items-center justify-between">
                        <div class="min-w-0"><p class="font-bold text-[12px]">${trFormatTanggal(p.tanggalSeleksi)}</p><p class="text-[10px] text-slate-400">Trainer: ${trEsc(p.trainerNama || "-")}</p></div>
                        <div class="flex items-center gap-2">
                            <span class="tr-hasil-badge ${hh.cls}" style="font-size:10px;padding:3px 9px;">${hh.emoji} ${p.total || 0}/100</span>
                            <button onclick="window.__tr.deleteScore('${pid}','${candidateId}')" class="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </div>
                    </div>`;
                }).join("")}` : ""}
                ${trPengajuanSectionHtml(c, candidateId)}
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Belum pernah dinilai -> tampilkan form skor seperti biasa.
    const session = trGetSession();
    let groupsHtml = "";
    let lastGroup = "";
    TR_SCORE_FIELDS.forEach(f => {
        if (f.group !== lastGroup) {
            groupsHtml += `<div class="pm-section-title" style="margin-top:14px;">${f.group}</div>`;
            lastGroup = f.group;
        }
        groupsHtml += trScoreFieldRowHtml(f);
    });

    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <div><h3 class="font-bold text-sm">Penilaian Calon Kurir</h3><p class="text-[10px] text-slate-400">${trEsc(c.nama || "-")}</p></div>
                <button onclick="document.getElementById('tr-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <input type="hidden" id="tr-p-candidate-id" value="${candidateId}">
            <div class="grid grid-cols-2 gap-2 mb-2">
                <div><label class="pm-label">Tanggal Seleksi</label><input type="date" id="tr-p-tanggal" class="pm-input" value="${trTodayISO()}"></div>
                <div><label class="pm-label">Trainer</label><input type="text" id="tr-p-trainer" class="pm-input" value="${trEsc(session?.nama || "")}"></div>
            </div>
            ${groupsHtml}
            <div class="pm-section-title" style="margin-top:14px;">6️⃣ Kelengkapan Wajib</div>
            ${TR_KELENGKAPAN_ITEMS.map(k => trKelengkapanRowHtml(k)).join("")}
            <p class="text-[10px] text-slate-400 mt-1">Catatan: kalau tidak ada/tidak aktif/tidak layak tetap dikasih poin 1.</p>
            <div class="pm-card mt-3">
                <label class="pm-label">Catatan Trainer</label>
                <textarea id="tr-p-catatan" rows="2" class="pm-textarea" placeholder="Catatan tambahan (opsional)"></textarea>
            </div>
            <div class="pm-card flex items-center justify-between mt-2">
                <span class="text-[11px] font-bold text-slate-500">TOTAL NILAI</span>
                <span id="tr-p-total-display" class="text-xl font-black text-orange-600">0/100</span>
            </div>
            <div id="tr-p-hasil-display" class="flex justify-center my-2"></div>
            <button onclick="window.__tr.submitScore()" class="pm-btn-primary flex items-center justify-center gap-2 mt-1">
                <i data-lucide="save" class="w-4 h-4"></i> Simpan Penilaian
            </button>
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
    trRecalcScore();
}

/* Bagian "Ajukan ke Admin" — tampil begitu sudah ada minimal 1x penilaian,
 * berapapun hasilnya (LULUS/EVALUASI/TIDAK LULUS tetap bisa diajukan;
 * Admin yang menentukan tindak lanjutnya). */
function trPengajuanSectionHtml(c, candidateId) {
    const status = (c && c.statusPengajuan) || "belum";
    if (status === "diajukan") {
        return `<div class="pm-card mt-3" style="background:#fef3c7;border-color:#fde68a;">
            <p class="text-[11px] font-bold text-amber-700 flex items-center gap-1.5"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Sudah diajukan — menunggu persetujuan Admin</p>
        </div>`;
    }
    if (status === "disetujui") {
        return `<div class="pm-card mt-3" style="background:#d1fae5;border-color:#a7f3d0;">
            <p class="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i> Disetujui Admin — sudah masuk Data Akun Kurir</p>
        </div>`;
    }
    const ditolakNote = status === "ditolak"
        ? `<div class="pm-card mt-3" style="background:#fee2e2;border-color:#fecaca;"><p class="text-[11px] font-bold text-rose-700">Pengajuan sebelumnya ditolak Admin. Bisa diajukan ulang kalau sudah diperbaiki.</p></div>`
        : "";
    return `${ditolakNote}
    <button onclick="window.__tr.ajukanKeAdmin('${candidateId}')" class="pm-btn-primary flex items-center justify-center gap-2 mt-2" style="background:#7c3aed">
        <i data-lucide="send" class="w-4 h-4"></i> Ajukan ke Admin
    </button>`;
}

async function trAjukanKeAdmin(candidateId) {
    const c = cloudCalonKurir[candidateId];
    if (!c) return trToast("Data calon kurir tidak ditemukan.");

    const riwayat = Object.entries(cloudPenilaian || {})
        .filter(([, p]) => p && p.calonKurirId === candidateId)
        .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    if (!riwayat.length) return trToast("Belum ada penilaian untuk calon kurir ini.", "warning");

    const [, last] = riwayat[0];
    const hasil = trHitungHasil(last.total || 0);

    if (!(await trConfirm(`Ajukan "${c.nama || "-"}" ke Admin dengan hasil ${hasil.label} (${last.total || 0}/100)?`))) return;

    try {
        await update(ref(db, `calon_kurir/${candidateId}`), {
            statusPengajuan: "diajukan",
            pengajuanAt: Date.now(),
            pengajuanTotal: last.total || 0,
            pengajuanHasil: hasil.label
        });
        trToast(`"${c.nama || "-"}" berhasil diajukan ke Admin.`);
        trOpenScoreForm(candidateId);
    } catch (err) {
        trToast("Gagal mengajukan ke Admin: " + err.message);
    }
}

function trRecalcScore() {
    let total = 0;
    TR_SCORE_FIELDS.forEach(f => {
        const el = document.getElementById(`tr-p-${f.key}`);
        const v = Math.max(0, Math.min(f.max, parseInt(el?.value) || 0));
        total += v;
    });
    TR_KELENGKAPAN_ITEMS.forEach(k => {
        const el = document.getElementById(`tr-p-kl-${k.key}`);
        const v = Math.max(0, Math.min(k.max, parseInt(el?.value) || 0));
        total += v;
    });

    const totalEl = document.getElementById("tr-p-total-display");
    if (totalEl) totalEl.innerText = `${total}/100`;

    const hasilWrap = document.getElementById("tr-p-hasil-display");
    if (hasilWrap) {
        const h = trHitungHasil(total);
        hasilWrap.innerHTML = `<span class="tr-hasil-badge ${h.cls}">${h.emoji} ${h.label}</span>`;
    }
    return total;
}

async function trSubmitScore() {
    const candidateId = document.getElementById("tr-p-candidate-id")?.value;
    if (!candidateId) return trToast("Data calon kurir tidak valid.");

    const sudahAda = Object.values(cloudPenilaian || {}).some(p => p && p.calonKurirId === candidateId);
    if (sudahAda) {
        trToast("Calon kurir ini sudah dinilai. Hapus penilaian sebelumnya dulu untuk menilai ulang.", "warning");
        trOpenScoreForm(candidateId);
        return;
    }

    const total = trRecalcScore();
    const scores = {};
    TR_SCORE_FIELDS.forEach(f => {
        scores[f.key] = Math.max(0, Math.min(f.max, parseInt(document.getElementById(`tr-p-${f.key}`)?.value) || 0));
    });
    const kelengkapan = {};
    TR_KELENGKAPAN_ITEMS.forEach(k => {
        kelengkapan[k.key] = Math.max(0, Math.min(k.max, parseInt(document.getElementById(`tr-p-kl-${k.key}`)?.value) || 0));
    });
    scores.kelengkapan = kelengkapan;

    const payload = {
        calonKurirId: candidateId,
        tanggalSeleksi: document.getElementById("tr-p-tanggal")?.value || trTodayISO(),
        trainerNama: document.getElementById("tr-p-trainer")?.value.trim() || "-",
        scores,
        total,
        catatan: document.getElementById("tr-p-catatan")?.value.trim() || "",
        createdAt: Date.now()
    };

    try {
        await push(ref(db, "penilaian_calon_kurir"), payload);
        trToast(`Penilaian tersimpan — Total ${total}/100 (${trHitungHasil(total).label}).`);
        document.getElementById("tr-modal-slot").innerHTML = "";
        trRenderPenilaianList();
    } catch (err) {
        trToast("Gagal menyimpan penilaian: " + err.message);
    }
}

async function trDeleteScore(scoreId, candidateId) {
    if (!(await trConfirm("Hapus riwayat penilaian ini?"))) return;
    try {
        await remove(ref(db, `penilaian_calon_kurir/${scoreId}`));
        trToast("Riwayat penilaian dihapus.");
        document.getElementById("tr-modal-slot").innerHTML = "";
        if (candidateId) trOpenScoreForm(candidateId);
    } catch (err) { trToast("Gagal menghapus: " + err.message); }
}

/* Hapus langsung dari daftar Penilaian Calon Kurir tanpa buka modal dulu. */
async function trDeleteScoreQuick(scoreId, candidateId) {
    if (!scoreId) return trToast("Riwayat penilaian tidak ditemukan.");
    if (!(await trConfirm("Hapus riwayat penilaian ini? Calon kurir bisa dinilai ulang setelah ini."))) return;
    try {
        await remove(ref(db, `penilaian_calon_kurir/${scoreId}`));
        trToast("Riwayat penilaian dihapus.");
        trRenderPenilaianList();
    } catch (err) { trToast("Gagal menghapus: " + err.message); }
}

/* ------------------------------------------------------------------ *
 * 12b. Statistik (Total Training, Jml Lolos, Jml Gagal + filter bulan)
 * ------------------------------------------------------------------ */
function trGetStatBuckets() {
    const bulan = document.getElementById("tr-stat-bulan")?.value || ""; // format YYYY-MM
    const training = [];
    const lulus = [];
    const gagal = [];

    Object.entries(cloudCalonKurir || {}).forEach(([id, c]) => {
        if (!c) return;
        if (bulan && !(c.tglTraining || "").startsWith(bulan)) return;
        training.push([id, c]);

        const last = trLastPenilaian(id);
        if (!last) return;
        const h = trHitungHasil(last.total || 0);
        if (h.label === "LULUS") lulus.push([id, c]);
        else if (h.label === "TIDAK LULUS") gagal.push([id, c]);
    });

    return { training, lulus, gagal };
}

function trLastPenilaian(candidateId) {
    const riwayat = Object.values(cloudPenilaian || {})
        .filter(p => p && p.calonKurirId === candidateId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return riwayat.length ? riwayat[0] : null;
}

function trRenderStatistik() {
    const buckets = trGetStatBuckets();
    const elTotal = document.getElementById("tr-stat-s-total");
    const elLolos = document.getElementById("tr-stat-s-lolos");
    const elGagal = document.getElementById("tr-stat-s-gagal");
    if (elTotal) elTotal.innerText = buckets.training.length;
    if (elLolos) elLolos.innerText = buckets.lulus.length;
    if (elGagal) elGagal.innerText = buckets.gagal.length;

    const cTotal = document.getElementById("tr-stat-c-total");
    const cLulus = document.getElementById("tr-stat-c-lulus");
    const cGagal = document.getElementById("tr-stat-c-gagal");
    if (cTotal) cTotal.innerText = buckets.training.length;
    if (cLulus) cLulus.innerText = buckets.lulus.length;
    if (cGagal) cGagal.innerText = buckets.gagal.length;

    // Bagan proporsi (bar) — Lolos / Gagal / Belum Dinilai dari Total Training
    const bar = document.getElementById("tr-stat-bar");
    if (bar) {
        const total = buckets.training.length || 0;
        const belum = Math.max(0, total - buckets.lulus.length - buckets.gagal.length);
        if (total === 0) {
            bar.innerHTML = `<div class="tr-bar-seg" style="width:100%;background:#e2e8f0;"></div>`;
        } else {
            const pLulus = (buckets.lulus.length / total) * 100;
            const pGagal = (buckets.gagal.length / total) * 100;
            const pBelum = (belum / total) * 100;
            bar.innerHTML = `
                ${pLulus ? `<div class="tr-bar-seg" style="width:${pLulus}%;background:#059669;"></div>` : ""}
                ${pGagal ? `<div class="tr-bar-seg" style="width:${pGagal}%;background:#dc2626;"></div>` : ""}
                ${pBelum ? `<div class="tr-bar-seg" style="width:${pBelum}%;background:#cbd5e1;"></div>` : ""}
            `;
        }
    }

    // Daftar Total Training: nama + tanggal training
    const listTraining = document.getElementById("tr-stat-list-training");
    if (listTraining) {
        listTraining.innerHTML = buckets.training.length
            ? buckets.training.map(([id, c]) => `<div class="tr-stat-mini-card">
                <div class="min-w-0"><p class="font-bold text-[12px] truncate">${trEsc(c.nama || "-")}</p><p class="text-[10px] text-slate-400"><i data-lucide="calendar" class="w-3 h-3 inline"></i> Training: ${trFormatTanggal(c.tglTraining)}</p></div>
                <button onclick="window.__tr.showDetail('${id}')" class="pm-btn-outline" style="width:auto;padding:6px 10px;font-size:10px;flex-shrink:0;">Detail</button>
              </div>`).join("")
            : `<div class="pm-empty">Belum ada data training di bulan ini.</div>`;
    }

    // Daftar Jml Lolos: info kurirnya (nama, no hp, skor)
    const listLulus = document.getElementById("tr-stat-list-lulus");
    if (listLulus) {
        listLulus.innerHTML = buckets.lulus.length
            ? buckets.lulus.map(([id, c]) => {
                const last = trLastPenilaian(id);
                const h = trHitungHasil(last?.total || 0);
                return `<div class="tr-stat-mini-card">
                    <div class="min-w-0"><p class="font-bold text-[12px] truncate">${trEsc(c.nama || "-")}</p><p class="text-[10px] text-slate-400"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${trEsc(c.hpAktif || "-")}</p></div>
                    <span class="tr-hasil-badge ${h.cls}" style="font-size:10px;padding:3px 9px;flex-shrink:0;">${h.emoji} ${last?.total || 0}/100</span>
                </div>`;
            }).join("")
            : `<div class="pm-empty">Belum ada yang lolos di bulan ini.</div>`;
    }

    // Daftar Jml Gagal: info kurirnya (nama, no hp, skor)
    const listGagal = document.getElementById("tr-stat-list-gagal");
    if (listGagal) {
        listGagal.innerHTML = buckets.gagal.length
            ? buckets.gagal.map(([id, c]) => {
                const last = trLastPenilaian(id);
                const h = trHitungHasil(last?.total || 0);
                return `<div class="tr-stat-mini-card">
                    <div class="min-w-0"><p class="font-bold text-[12px] truncate">${trEsc(c.nama || "-")}</p><p class="text-[10px] text-slate-400"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${trEsc(c.hpAktif || "-")}</p></div>
                    <span class="tr-hasil-badge ${h.cls}" style="font-size:10px;padding:3px 9px;flex-shrink:0;">${h.emoji} ${last?.total || 0}/100</span>
                </div>`;
            }).join("")
            : `<div class="pm-empty">Belum ada yang gagal di bulan ini.</div>`;
    }

    if (window.lucide) window.lucide.createIcons();
}

function trScrollToStat(bucket) {
    const el = document.getElementById(`tr-stat-anchor-${bucket}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------------------------ *
 * 13. Menu SOP (pakai modal SOP kurir yang sudah ada)
 * ------------------------------------------------------------------ */
function trOpenSopMenu() {
    if (typeof window.openSOP === "function") window.openSOP();
    else trToast("Modul SOP belum siap.");
}

/* ------------------------------------------------------------------ *
 * 14. Public API + patch applyManajemenAccess + boot
 * ------------------------------------------------------------------ */
window.__tr = {
    go(screenId) { if (typeof window.navigateTo === "function") window.navigateTo(screenId); },
    logout() {
        if (typeof window.handleLogout === "function") window.handleLogout();
        else { localStorage.removeItem("sahabatku_session"); location.reload(); }
    },
    renderList: trRenderList,
    openForm: trOpenForm,
    saveCandidate: trSaveCandidate,
    toggleCheck: trToggleCheck,
    showDetail: trShowDetail,
    deleteCandidate: trDeleteCandidate,
    renderPenilaianList: trRenderPenilaianList,
    openScoreForm: trOpenScoreForm,
    recalcScore: trRecalcScore,
    submitScore: trSubmitScore,
    deleteScore: trDeleteScore,
    deleteScoreQuick: trDeleteScoreQuick,
    ajukanKeAdmin: trAjukanKeAdmin,
    toggleListOpen: trToggleListOpen,
    togglePenilaianOpen: trTogglePenilaianOpen,
    renderStatistik: trRenderStatistik,
    scrollToStat: trScrollToStat,
    openSopMenu: trOpenSopMenu
};

function trPatchApplyManajemenAccess() {
    if (window.__trAccessPatched) return;
    window.__trAccessPatched = true;
    const orig = window.applyManajemenAccess;
    window.applyManajemenAccess = function (kategori) {
        const k = (kategori || "").trim();
        if (k === KATEGORI_TR) {
            const badge = document.getElementById("badge-admin-role");
            if (badge) badge.innerText = "Trainer";
            window.__tr.go("screen-tr-dashboard");
            return;
        }
        if (typeof orig === "function") orig(kategori);
    };
}

function trBoot() {
    trInjectStyle();
    trInjectScreens();
    trPatchNavigation();
    trPatchApplyManajemenAccess();

    const session = trGetSession();
    if (trIsTrainerSession(session)) {
        const badge = document.getElementById("badge-admin-role");
        if (badge) badge.innerText = "Trainer";
        window.__tr.go("screen-tr-dashboard");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trBoot);
} else {
    trBoot();
}

/* =====================================================================
   PETUGASMITRA.JS (v3)
   Modul baru khusus role "Petugas Kemitraan" (login kemitraan) +
   tambahan panel persetujuan & cek trx kurir yang disisipkan LANGSUNG
   ke layar "Kelola Mitra" (mode lama) milik Admin/Head Operasional.
   File ini BERDIRI SENDIRI (tidak mengubah script.js) dan hanya
   membutuhkan 1 baris tambahan di index.html:
     <script type="module" src="petugasmitra.js"></script>
   serta opsi baru di dropdown "Kategori" pada form Manajemen:
     <option value="Petugas Kemitraan">Petugas Kemitraan</option>
   ===================================================================== */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase, ref, push, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ------------------------------------------------------------------ *
 * 0. KONFIGURASI
 * ------------------------------------------------------------------ */
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
const pmApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(pmApp);

// URL Apps Script utk upload foto ke Google Drive (sudah dideploy).
const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzr2N_s6uIuUB5bRWsK1R5pMU7oN83daQ7M0xF44ZvZ2aE24TG4LaVzVIlTvopq9zjR/exec";

const FOLDER = {
    lokasi:      "1o3___2NUGAxvEHfTKKRyRyDo9qxZMVoXEs1Bf6UtB4kUDBfvFgViB8RtS0Yz1HGexXEej6Of",
    dokumentasi: "1QHG3oZLU2k5_Q1rxwgJ-iv7GMCpdm4aawxZbm_7E6hGMGBHREGjP3NuuxJSG2hKW5TkF9X7I",
    surat:       "1XZA3fpxVDTtsxBCUi66mLXl6gJDvIzTkFRFK7IYyedSWRWYemqw9ejQSD_aR8JgGnTvvdRHx"
};

const KATEGORI_PM = "Petugas Kemitraan";

/* ------------------------------------------------------------------ *
 * 0.b PENJAGA AWAL (cegah "kelihatan" dashboard admin sesaat saat
 *      refresh utk sesi Petugas Kemitraan). Murni CSS, bukan loop.
 * ------------------------------------------------------------------ */
(function pmEarlyGuard() {
    try {
        const raw = localStorage.getItem("sahabatku_session");
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s && s.role === "manajemen" && (s.kategori || "").trim() === KATEGORI_PM) {
            const style = document.createElement("style");
            style.id = "pm-early-guard-style";
            style.textContent = `#screen-admin-dashboard{display:none !important;} #app-bar{display:none !important;}`;
            (document.head || document.documentElement).appendChild(style);
        }
    } catch (e) { /* diamkan */ }
})();

/* ------------------------------------------------------------------ *
 * 1. STATE (cache realtime, tanpa polling / tanpa loop berat)
 * ------------------------------------------------------------------ */
let cloudUsers = {};
let cloudJadwalOff = {};
let cloudMitra = {};
let cloudLogMitra = {};
let cloudCalonMitra = {};
let cloudPerubahanMitra = {};

let pmBooted = false;
let pmRenderTimer = null;

/* Status buka/tutup tiap daftar — default TERTUTUP, murni penanda di
 * memori (bukan loop). Saat tertutup, fungsi render terkait langsung
 * berhenti di awal (tidak membangun DOM), jadi hemat & tidak berat. */
const pmOpenState = { rwt: false, daftar: false, status: false, legacyCek: false };

function pmQueueRender() {
    if (pmRenderTimer) clearTimeout(pmRenderTimer);
    pmRenderTimer = setTimeout(() => {
        pmRenderTimer = null;
        pmRenderActiveScreen();
        pmRenderLegacyPending();
        pmRenderLegacyCek();
        pmUpdateAdminBadge();
    }, 120);
}

onValue(ref(db, "users"), (snap) => { cloudUsers = snap.val() || {}; pmQueueRender(); });
onValue(ref(db, "jadwal_off"), (snap) => { cloudJadwalOff = snap.val() || {}; pmQueueRender(); });
onValue(ref(db, "mitra"), (snap) => { cloudMitra = snap.val() || {}; pmQueueRender(); });
onValue(ref(db, "log_mitra"), (snap) => { cloudLogMitra = snap.val() || {}; pmQueueRender(); });
onValue(ref(db, "calon_mitra"), (snap) => { cloudCalonMitra = snap.val() || {}; pmQueueRender(); });
onValue(ref(db, "perubahan_mitra"), (snap) => { cloudPerubahanMitra = snap.val() || {}; pmQueueRender(); });

/* ------------------------------------------------------------------ *
 * 2. HELPER UMUM
 * ------------------------------------------------------------------ */
function pmToast(msg, type) {
    if (typeof window.toast === "function") window.toast(msg, type);
    else alert(msg);
}
async function pmConfirm(msg) {
    if (typeof window.showConfirm === "function") return await window.showConfirm(msg);
    return confirm(msg);
}
function pmEsc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
function pmNorm(s) { return String(s || "").trim().toLowerCase(); }
function pmTodayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function pmCurrentBulan() { return pmTodayISO().slice(0, 7); }
function pmFormatTanggal(iso) {
    if (!iso) return "-";
    const bulanNama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${parseInt(d)} ${bulanNama[parseInt(m) - 1] || m} ${y}`;
}
function pmFormatJam(buka, tutup) {
    if (!buka && !tutup) return "";
    return `${buka || "-"} - ${tutup || "-"}`;
}
function pmGetSession() {
    try { return JSON.parse(localStorage.getItem("sahabatku_session") || "null"); }
    catch (e) { return null; }
}
function pmIsPetugasSession(session) {
    return !!(session && session.role === "manajemen" && (session.kategori || "").trim() === KATEGORI_PM);
}
function pmIsAdminSession(session) {
    if (!session) return false;
    if (session.role === "owner") return true;
    if (session.role === "manajemen" && (session.kategori || "").trim() === "Head Operasional") return true;
    return false;
}
function pmFindMitraByName(nama) {
    return Object.values(cloudMitra || {}).find(m => m && pmNorm(m.nama) === pmNorm(nama));
}
function pmMitraTrxStat(nama, bulan) {
    let count = 0, total = 0;
    Object.values(cloudLogMitra || {}).forEach(l => {
        if (!l || pmNorm(l.mitraNama) !== pmNorm(nama)) return;
        if (bulan && l.bulan !== bulan) return;
        count++; total += parseInt(l.trxInput) || 0;
    });
    return { count, total };
}
/* Set nilai default HANYA sekali per elemen (dataset flag), supaya
 * user tetap bisa mengosongkan filter tanpa "dibalikin" otomatis. */
function pmEnsureDefault(el, val) {
    if (!el) return;
    if (!el.dataset.pmDefaulted) {
        el.dataset.pmDefaulted = "1";
        if (!el.value) el.value = val;
    }
}
/* Buka/tutup daftar — hanya toggle class + render sekali saat dibuka,
 * tidak ada loop/polling apapun. */
function pmSetResultsOpen(key, resultsId, btnId, renderFn, open, labelOpen, labelClose) {
    pmOpenState[key] = open;
    const el = document.getElementById(resultsId);
    const btn = document.getElementById(btnId);
    if (el) el.classList.toggle("hidden", !open);
    if (btn) btn.innerText = open ? (labelClose || "Tutup") : (labelOpen || "Buka");
    if (open && typeof renderFn === "function") renderFn();
}
function pmToggleResults(key, resultsId, btnId, renderFn, labelOpen, labelClose) {
    pmSetResultsOpen(key, resultsId, btnId, renderFn, !pmOpenState[key], labelOpen, labelClose);
}

/* ---- Kompresi gambar di sisi klien: kecil di KB tapi tetap jelas ---- */
function pmReadFileAsImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
async function pmCompressImage(file, maxDim = 1080) {
    const img = await pmReadFileAsImage(file);
    let w = img.width, h = img.height;
    if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
    else if (h >= w && h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    let quality = 0.75;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    let tries = 0;
    while (dataUrl.length * 0.73 > 420 * 1024 && tries < 5) {
        quality -= 0.12;
        dataUrl = canvas.toDataURL("image/jpeg", Math.max(quality, 0.3));
        tries++;
    }
    const sizeKB = Math.round((dataUrl.length * 0.73) / 1024);
    return { dataUrl, mime: "image/jpeg", sizeKB };
}

async function pmUploadToDrive(dataUrl, folderId, filenamePrefix) {
    const base64 = dataUrl.split(",")[1] || "";
    const filename = `${filenamePrefix}-${Date.now()}.jpg`;

    if (!DRIVE_UPLOAD_URL || DRIVE_UPLOAD_URL.indexOf("PASTE_URL") === 0) {
        console.warn("[petugasmitra] DRIVE_UPLOAD_URL belum di-set, foto disimpan sbg base64.");
        return { url: dataUrl, stored: "inline" };
    }
    try {
        const res = await fetch(DRIVE_UPLOAD_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ folderId, filename, mimeType: "image/jpeg", base64 })
        });
        const json = await res.json();
        if (json && json.success && json.url) return { url: json.url, stored: "drive" };
        throw new Error((json && json.message) || "Upload gagal");
    } catch (err) {
        console.error("[petugasmitra] Upload ke Drive gagal, fallback ke inline:", err);
        return { url: dataUrl, stored: "inline" };
    }
}

/* ------------------------------------------------------------------ *
 * 3. STYLE (tema khusus Kemitraan — beda dari admin/hrd/ops/kurir)
 * ------------------------------------------------------------------ */
function pmInjectStyle() {
    if (document.getElementById("pm-style")) return;
    const css = `
    #pm-root .screen { display:none; min-height:100vh; }
    #pm-root .screen.active { display:flex; flex-direction:column; }
    .pm-header{background:linear-gradient(135deg,#065F46 0%,#059669 45%,#10B981 100%);
      color:#fff;padding:18px 16px 22px;border-radius:0 0 26px 26px;position:relative;overflow:hidden;}
    .pm-header::after{content:"";position:absolute;inset:0;background:
      radial-gradient(circle at 85% 0%,rgba(255,255,255,.18),transparent 55%),
      radial-gradient(circle at 0% 100%,rgba(255,255,255,.12),transparent 50%);pointer-events:none;}
    .pm-header-row{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative;z-index:1;}
    .pm-avatar{width:44px;height:44px;border-radius:16px;background:rgba(255,255,255,.15);
      display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.25);flex-shrink:0;}
    .pm-badge{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
      background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);padding:4px 10px;border-radius:999px;}
    .pm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;position:relative;z-index:1;}
    .pm-stat-tile{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:14px;
      padding:9px 8px;backdrop-filter:blur(3px);}
    .pm-stat-tile p.n{font-size:16px;font-weight:900;line-height:1.1;margin-top:2px;}
    .pm-stat-tile p.l{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;opacity:.85;font-weight:700;}
    .pm-body{padding:14px;flex:1;padding-bottom:90px;}
    .pm-menu-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .pm-menu-card{background:#fff;border:1px solid #E2E8F0;border-radius:18px;padding:14px 12px;text-align:left;
      transition:transform .15s ease,box-shadow .15s ease;position:relative;}
    .dark .pm-menu-card{background:#1E293B;border-color:#334155;}
    .pm-menu-card:active{transform:scale(.96);}
    .pm-menu-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      color:#fff;margin-bottom:9px;}
    .pm-menu-title{font-size:12px;font-weight:800;display:block;}
    .pm-menu-sub{font-size:9.5px;color:#94A3B8;line-height:1.3;display:block;margin-top:2px;}
    .pm-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:13px;margin-bottom:10px;}
    .dark .pm-card{background:#1E293B;border-color:#334155;}
    .pm-topbar{position:sticky;top:0;z-index:30;background:#fff;border-bottom:1px solid #E2E8F0;
      padding:10px 12px;display:flex;align-items:center;gap:10px;}
    .dark .pm-topbar{background:#0F172A;border-color:#1e293b;}
    .pm-topbar h2{font-size:14px;font-weight:800;flex:1;}
    .pm-back{width:32px;height:32px;border-radius:10px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .dark .pm-back{background:#1E293B;}
    .pm-input,.pm-select,.pm-textarea{width:100%;padding:10px 12px;border:1px solid #E2E8F0;border-radius:12px;
      font-size:12.5px;background:#fff;}
    .dark .pm-input,.dark .pm-select,.dark .pm-textarea{background:#0F172A;border-color:#334155;color:#F1F5F9;}
    .pm-label{font-size:10.5px;font-weight:700;color:#64748B;margin-bottom:4px;display:block;}
    .pm-section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;
      color:#059669;margin:16px 0 8px;display:flex;align-items:center;gap:6px;}
    .pm-btn-primary{background:linear-gradient(135deg,#059669,#10B981);color:#fff;font-weight:800;
      padding:12px;border-radius:14px;width:100%;font-size:12.5px;box-shadow:0 8px 20px -8px rgba(5,150,105,.5);}
    .pm-btn-primary:disabled{opacity:.6;}
    .pm-btn-outline{border:1.5px solid #059669;color:#059669;font-weight:700;padding:10px;border-radius:12px;font-size:12px;background:transparent;}
    .pm-btn-toggle{width:100%;padding:10px;border-radius:12px;font-size:11.5px;font-weight:800;text-transform:uppercase;
      letter-spacing:.03em;background:#0F172A;color:#fff;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px;}
    .dark .pm-btn-toggle{background:#334155;}
    .pm-chip{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:800;padding:3px 9px;
      border-radius:999px;text-transform:uppercase;letter-spacing:.03em;}
    .pm-chip-pending{background:#FEF3C7;color:#B45309;}
    .pm-chip-approved{background:#D1FAE5;color:#047857;}
    .pm-chip-rejected{background:#FEE2E2;color:#B91C1C;}
    .pm-upload-box{border:1.5px dashed #CBD5E1;border-radius:14px;padding:12px;text-align:center;position:relative;}
    .dark .pm-upload-box{border-color:#334155;}
    .pm-upload-box img{max-height:120px;border-radius:10px;margin:0 auto 6px;display:block;}
    .pm-hp-row{display:flex;gap:6px;margin-bottom:6px;}
    .pm-modal-overlay{position:fixed;inset:0;background:rgba(2,20,15,.55);z-index:100;display:flex;align-items:flex-end;
      justify-content:center;}
    .pm-modal-sheet{background:#fff;border-radius:22px 22px 0 0;max-height:88vh;overflow-y:auto;width:100%;max-width:520px;padding:16px;}
    .dark .pm-modal-sheet{background:#0F172A;}
    .pm-empty{text-align:center;padding:22px 12px;color:#94A3B8;font-size:11.5px;}
    .pm-stat-mini{background:#F8FAFC;border-radius:10px;padding:6px 8px;}
    .dark .pm-stat-mini{background:#0F172A;}
    .pm-stat-mini .l{font-size:8.5px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.03em;}
    .pm-stat-mini .n{font-size:12px;font-weight:800;margin-top:1px;}
    `;
    const style = document.createElement("style");
    style.id = "pm-style";
    style.textContent = css;
    document.head.appendChild(style);
}

/* ------------------------------------------------------------------ *
 * 4. TEMPLATE: FORM MITRA (dipakai utk Ajukan Baru & Ajukan Perubahan)
 * ------------------------------------------------------------------ */
function pmHpKaryawanRow(idx, value) {
    return `<div class="pm-hp-row" data-hp-row="${idx}">
        <input type="tel" class="pm-input pm-hp-karyawan-input" placeholder="No HP Karyawan ${idx + 1}" value="${pmEsc(value || "")}">
        <button type="button" onclick="window.__pm.removeHpRow(${idx})" class="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 flex-shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>`;
}

function pmFormMitraHtml(prefix) {
    return `
    <div class="pm-card">
        <label class="pm-label">Nama Lengkap Pemilik (Owner)</label>
        <input id="${prefix}-owner" class="pm-input" placeholder="Contoh: Budi Santoso">
    </div>
    <div class="pm-card">
        <label class="pm-label">Nama Kedai / Toko</label>
        <input id="${prefix}-nama" class="pm-input" placeholder="Contoh: Kedai Kopi Sahabatku">
    </div>
    <div class="pm-card">
        <label class="pm-label">Alamat (Salin Link Google Maps)</label>
        <input id="${prefix}-alamat" class="pm-input" placeholder="https://maps.app.goo.gl/...">
        <p class="text-[9.5px] text-slate-400 mt-1">Buka Google Maps &gt; cari lokasi &gt; Bagikan &gt; Salin link, lalu tempel di sini.</p>
    </div>
    <div class="pm-card">
        <label class="pm-label">No Handphone Owner</label>
        <input id="${prefix}-hp-owner" type="tel" class="pm-input" placeholder="08xxxxxxxxxx">
    </div>
    <div class="pm-card">
        <div class="flex items-center justify-between mb-1">
            <label class="pm-label mb-0">No Handphone Karyawan (bisa lebih dari 1)</label>
            <button type="button" onclick="window.__pm.addHpRow()" class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><i data-lucide="plus" class="w-3 h-3"></i>Tambah</button>
        </div>
        <div id="${prefix}-hp-karyawan-list"></div>
    </div>
    <div class="pm-card grid grid-cols-2 gap-3">
        <div>
            <label class="pm-label">Tanggal Bergabung Mitra</label>
            <input id="${prefix}-tgl-gabung" type="date" class="pm-input">
        </div>
        <div>
            <label class="pm-label">Penyetoran Tgl / Bulan</label>
            <select id="${prefix}-tgl-setor" class="pm-select">
                <option value="1">Tanggal 1</option>
                <option value="18">Tanggal 18</option>
            </select>
        </div>
    </div>
    <div class="pm-card grid grid-cols-2 gap-3">
        <div>
            <label class="pm-label">Jam Buka</label>
            <input id="${prefix}-jam-buka" type="time" class="pm-input">
        </div>
        <div>
            <label class="pm-label">Jam Tutup</label>
            <input id="${prefix}-jam-tutup" type="time" class="pm-input">
        </div>
    </div>
    <div class="pm-card">
        <label class="pm-label">Foto Lokasi Kedai (Gerobak/Toko/Lainnya)</label>
        <div class="pm-upload-box" id="${prefix}-box-lokasi">
            <i data-lucide="image-plus" class="w-6 h-6 mx-auto text-slate-400 mb-1"></i>
            <p class="text-[10px] text-slate-400">Ketuk untuk pilih / ambil foto</p>
        </div>
        <input type="file" accept="image/*" capture="environment" id="${prefix}-file-lokasi" class="hidden">
    </div>
    <div class="pm-card">
        <label class="pm-label">Foto Dokumentasi Pemilik/Karyawan Dengan Petugas Kemitraan</label>
        <div class="pm-upload-box" id="${prefix}-box-dokumentasi">
            <i data-lucide="image-plus" class="w-6 h-6 mx-auto text-slate-400 mb-1"></i>
            <p class="text-[10px] text-slate-400">Ketuk untuk pilih / ambil foto</p>
        </div>
        <input type="file" accept="image/*" capture="environment" id="${prefix}-file-dokumentasi" class="hidden">
    </div>
    <div class="pm-card">
        <div class="flex items-center justify-between mb-2">
            <label class="pm-label mb-0">Surat Pernyataan Digital</label>
            <button type="button" onclick="window.open('suratpernyataan.html','_blank')" class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><i data-lucide="file-signature" class="w-3 h-3"></i>Buat Surat</button>
        </div>
        <div class="pm-upload-box" id="${prefix}-box-surat">
            <i data-lucide="upload" class="w-6 h-6 mx-auto text-slate-400 mb-1"></i>
            <p class="text-[10px] text-slate-400">Upload hasil Surat Pernyataan (gambar)</p>
        </div>
        <input type="file" accept="image/*" id="${prefix}-file-surat" class="hidden">
        <p class="text-[9.5px] text-slate-400 mt-1">Ketuk "Buat Surat" untuk mengisi &amp; tanda tangan, lalu unduh gambarnya dan upload di sini.</p>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * 5. SCREENS HTML (khusus Petugas Kemitraan)
 * ------------------------------------------------------------------ */
function pmScreensHtml() {
    return `
    <!-- ================= DASHBOARD ================= -->
    <div id="screen-pm-dashboard" class="screen">
        <div class="pm-header">
            <div class="pm-header-row">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="pm-avatar"><i data-lucide="handshake" class="w-5 h-5"></i></div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-sm session-fullname truncate">Petugas Kemitraan</h3>
                        <p class="text-[10px] opacity-80">Portal Kemitraan Sahabatku</p>
                    </div>
                </div>
                <span class="pm-badge">Kemitraan</span>
            </div>
            <div class="pm-stats">
                <div class="pm-stat-tile"><p class="l">Mitra Aktif</p><p class="n" id="pm-stat-mitra">0</p></div>
                <div class="pm-stat-tile"><p class="l">Menunggu Approve</p><p class="n" id="pm-stat-pending">0</p></div>
                <div class="pm-stat-tile"><p class="l">Trx Hari Ini</p><p class="n" id="pm-stat-trx">0</p></div>
            </div>
        </div>
        <div class="pm-body">
            <div class="pm-section-title"><i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>Menu Kemitraan</div>
            <div class="pm-menu-grid">
                <button class="pm-menu-card" onclick="window.__pm.go('screen-pm-ajukan')">
                    <div class="pm-menu-icon" style="background:#059669"><i data-lucide="store" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Ajukan Mitra Baru</span>
                    <span class="pm-menu-sub">Formulir calon mitra</span>
                </button>
                <button class="pm-menu-card" onclick="window.__pm.go('screen-pm-daftar')">
                    <div class="pm-menu-icon" style="background:#0284C7"><i data-lucide="list" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Daftar Mitra</span>
                    <span class="pm-menu-sub">Cari &amp; kelola mitra</span>
                </button>
                <button class="pm-menu-card" onclick="window.__pm.go('screen-pm-riwayat')">
                    <div class="pm-menu-icon" style="background:#7C3AED"><i data-lucide="receipt-text" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Riwayat Transaksi</span>
                    <span class="pm-menu-sub">Filter bulan &amp; tanggal</span>
                </button>
                <button class="pm-menu-card" onclick="window.__pm.go('screen-pm-cekkurir')">
                    <div class="pm-menu-icon" style="background:#EA580C"><i data-lucide="user-search" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Cek Trx Kurir</span>
                    <span class="pm-menu-sub">Per tanggal tertentu</span>
                </button>
                <button class="pm-menu-card" onclick="window.__pm.go('screen-pm-status')">
                    <div class="pm-menu-icon" style="background:#D97706"><i data-lucide="clock" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Status Pengajuan Saya</span>
                    <span class="pm-menu-sub">Pending / disetujui / ditolak</span>
                </button>
                <button class="pm-menu-card" onclick="window.open('suratpernyataan.html','_blank')">
                    <div class="pm-menu-icon" style="background:#0D9488"><i data-lucide="file-signature" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Buat Surat Pernyataan</span>
                    <span class="pm-menu-sub">Formulir digital</span>
                </button>
                <button class="pm-menu-card" onclick="window.__pm.logout()">
                    <div class="pm-menu-icon" style="background:#64748B"><i data-lucide="log-out" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Keluar</span>
                    <span class="pm-menu-sub">Logout akun</span>
                </button>
            </div>
        </div>
    </div>

    <!-- ================= AJUKAN MITRA BARU ================= -->
    <div id="screen-pm-ajukan" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Ajukan Mitra Baru</h2>
        </div>
        <div class="pm-body" style="padding-bottom:110px">
            ${pmFormMitraHtml("pm-new")}
            <button id="pm-new-submit" onclick="window.__pm.submitMitraBaru()" class="pm-btn-primary flex items-center justify-center gap-2 mt-2">
                <i data-lucide="send" class="w-4 h-4"></i><span id="pm-new-submit-text">Ajukan Mitra</span>
            </button>
            <p class="text-[10px] text-center text-slate-400 mt-2">Pengajuan akan berstatus <b>Pending</b> sampai disetujui Admin.</p>
        </div>
    </div>

    <!-- ================= DAFTAR MITRA ================= -->
    <div id="screen-pm-daftar" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Daftar Mitra</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card space-y-2">
                <input id="pm-daftar-search" oninput="window.__pm.renderDaftarMitra()" class="pm-input" placeholder="Cari nama mitra / owner...">
                <input id="pm-daftar-bulan" type="month" onchange="window.__pm.renderDaftarMitra()" class="pm-input">
            </div>
            <button id="pm-daftar-toggle-btn" onclick="window.__pm.toggleDaftarMitra()" class="pm-btn-toggle"><i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>Buka</button>
            <div id="pm-daftar-results" class="hidden">
                <div id="pm-daftar-list"></div>
            </div>
        </div>
    </div>

    <!-- ================= AJUKAN PERUBAHAN ================= -->
    <div id="screen-pm-edit" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-daftar')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Ajukan Perubahan Data</h2>
        </div>
        <div class="pm-body" style="padding-bottom:110px">
            <input type="hidden" id="pm-edit-mitra-id">
            ${pmFormMitraHtml("pm-edit")}
            <button id="pm-edit-submit" onclick="window.__pm.submitPerubahan()" class="pm-btn-primary flex items-center justify-center gap-2 mt-2">
                <i data-lucide="send" class="w-4 h-4"></i><span id="pm-edit-submit-text">Ajukan Perubahan</span>
            </button>
            <p class="text-[10px] text-center text-slate-400 mt-2">Perubahan akan berstatus <b>Pending</b> sampai disetujui Admin.</p>
        </div>
    </div>

    <!-- ================= RIWAYAT TRANSAKSI ================= -->
    <div id="screen-pm-riwayat" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Riwayat Transaksi Mitra</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card grid grid-cols-2 gap-2">
                <input id="pm-rwt-bulan" type="month" onchange="window.__pm.renderRiwayat()" class="pm-input">
                <input id="pm-rwt-tanggal" type="date" onchange="window.__pm.renderRiwayat()" class="pm-input">
                <select id="pm-rwt-kurir" onchange="window.__pm.renderRiwayat()" class="pm-select col-span-2"><option value="">-- Semua Kurir --</option></select>
                <input id="pm-rwt-search" oninput="window.__pm.renderRiwayat()" class="pm-input col-span-2" placeholder="Cari nama mitra / kurir...">
            </div>
            <button id="pm-rwt-toggle-btn" onclick="window.__pm.toggleRiwayat()" class="pm-btn-toggle"><i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>Buka Daftar Total Transaksi</button>
            <div id="pm-rwt-results" class="hidden">
                <div class="pm-card flex items-center justify-between">
                    <span class="text-[11px] font-bold text-slate-500">Total Transaksi</span>
                    <span class="text-sm font-black text-emerald-600" id="pm-rwt-total">0</span>
                </div>
                <div id="pm-rwt-list"></div>
            </div>
        </div>
    </div>

    <!-- ================= CEK TRX KURIR ================= -->
    <div id="screen-pm-cekkurir" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Cek Trx Kurir</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card space-y-2">
                <input id="pm-cek-tanggal" type="date" onchange="window.__pm.renderCekKurir()" class="pm-input">
                <input id="pm-cek-search" oninput="window.__pm.renderCekKurir()" class="pm-input" placeholder="Cari nama kurir...">
            </div>
            <div id="pm-cek-list"></div>
        </div>
    </div>

    <!-- ================= STATUS PENGAJUAN SAYA ================= -->
    <div id="screen-pm-status" class="screen">
        <div class="pm-topbar">
            <button class="pm-back" onclick="window.__pm.go('screen-pm-dashboard')"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
            <h2>Status Pengajuan Saya</h2>
        </div>
        <div class="pm-body">
            <div class="pm-card grid grid-cols-2 gap-2">
                <input id="pm-status-bulan" type="month" onchange="window.__pm.renderStatusSaya()" class="pm-input">
                <input id="pm-status-tanggal" type="date" onchange="window.__pm.renderStatusSaya()" class="pm-input">
                <input id="pm-status-search" oninput="window.__pm.renderStatusSaya()" class="pm-input col-span-2" placeholder="Cari nama mitra...">
            </div>
            <button id="pm-status-toggle-btn" onclick="window.__pm.toggleStatus()" class="pm-btn-toggle"><i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>Buka Daftar Pengajuan</button>
            <div id="pm-status-results" class="hidden">
                <div id="pm-status-list"></div>
            </div>
        </div>
    </div>

    <div id="pm-modal-slot"></div>
    `;
}

/* ------------------------------------------------------------------ *
 * 6. INJEKSI DOM (screen Petugas Kemitraan)
 * ------------------------------------------------------------------ */
let pmHpKaryawanState = { "pm-new": [""], "pm-edit": [""] };

function pmInjectScreens() {
    if (document.getElementById("pm-root")) return;
    const mount = document.getElementById("main-layout") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "pm-root";
    wrap.innerHTML = pmScreensHtml();
    mount.appendChild(wrap);
    if (window.lucide) window.lucide.createIcons();
    pmBindUploadBoxes();
    pmRenderHpRows("pm-new");
    pmRenderHpRows("pm-edit");
}

function pmBindUploadBoxes() {
    const map = [
        ["pm-new-box-lokasi", "pm-new-file-lokasi"],
        ["pm-new-box-dokumentasi", "pm-new-file-dokumentasi"],
        ["pm-new-box-surat", "pm-new-file-surat"],
        ["pm-edit-box-lokasi", "pm-edit-file-lokasi"],
        ["pm-edit-box-dokumentasi", "pm-edit-file-dokumentasi"],
        ["pm-edit-box-surat", "pm-edit-file-surat"]
    ];
    map.forEach(([boxId, inputId]) => {
        const box = document.getElementById(boxId);
        const input = document.getElementById(inputId);
        if (!box || !input) return;
        box.addEventListener("click", () => input.click());
        input.addEventListener("change", async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            box.innerHTML = `<p class="text-[10px] text-emerald-600 font-bold">Memproses foto...</p>`;
            try {
                const { dataUrl, sizeKB } = await pmCompressImage(file);
                input.dataset.compressed = dataUrl;
                box.innerHTML = `<img src="${dataUrl}"><p class="text-[9.5px] text-slate-400">± ${sizeKB} KB &middot; ketuk untuk ganti</p>`;
            } catch (e) {
                box.innerHTML = `<p class="text-[10px] text-rose-500">Gagal memproses foto, coba lagi.</p>`;
            }
        });
    });
}

function pmRenderHpRows(prefix) {
    const list = document.getElementById(`${prefix}-hp-karyawan-list`);
    if (!list) return;
    const arr = pmHpKaryawanState[prefix] || [""];
    list.innerHTML = arr.map((v, i) => pmHpKaryawanRow(i, v)).join("");
    list.querySelectorAll(".pm-hp-karyawan-input").forEach((inp, i) => {
        inp.addEventListener("input", () => { pmHpKaryawanState[prefix][i] = inp.value; });
    });
    if (window.lucide) window.lucide.createIcons();
}

/* ------------------------------------------------------------------ *
 * 7. NAVIGASI (bungkus navigateTo/navigateBack milik script.js)
 * ------------------------------------------------------------------ */
const PM_SCREENS = [
    "screen-pm-dashboard", "screen-pm-ajukan", "screen-pm-daftar", "screen-pm-edit",
    "screen-pm-riwayat", "screen-pm-cekkurir", "screen-pm-status"
];

function pmHideAppBar() {
    const appBar = document.getElementById("app-bar");
    if (appBar) { appBar.classList.remove("flex"); appBar.classList.add("hidden"); }
}

let pmCurrentScreen = null;
function pmAfterNavigate(screenId) {
    const guard = document.getElementById("pm-early-guard-style");
    if (guard) guard.remove();
    if (!PM_SCREENS.includes(screenId)) { pmCurrentScreen = null; return; }
    pmCurrentScreen = screenId;
    pmHideAppBar();
    pmRenderActiveScreen();
}

function pmPatchNavigation() {
    if (window.__pmNavPatched) return;
    window.__pmNavPatched = true;
    const origNavigateTo = window.navigateTo;
    window.navigateTo = function (screenId) {
        if (typeof origNavigateTo === "function") origNavigateTo(screenId);
        pmAfterNavigate(screenId);
    };
    const origNavigateBack = window.navigateBack;
    window.navigateBack = function () {
        if (typeof origNavigateBack === "function") origNavigateBack();
        const activeEl = document.querySelector("#pm-root .screen.active");
        if (activeEl) pmAfterNavigate(activeEl.id);
        else { pmHideAppBar(); pmCurrentScreen = null; }
    };
}

function pmRenderActiveScreen() {
    if (!pmCurrentScreen) return;
    switch (pmCurrentScreen) {
        case "screen-pm-dashboard": pmRenderDashboard(); break;
        case "screen-pm-daftar": pmRenderDaftarMitra(); break;
        case "screen-pm-riwayat": pmRenderRiwayat(); break;
        case "screen-pm-cekkurir": pmRenderCekKurir(); break;
        case "screen-pm-status": pmRenderStatusSaya(); break;
    }
}

/* ------------------------------------------------------------------ *
 * 8. RENDER: DASHBOARD PETUGAS
 * ------------------------------------------------------------------ */
function pmRenderDashboard() {
    const session = pmGetSession();
    const totalMitra = Object.keys(cloudMitra || {}).length;
    const myUsername = session ? pmNorm(session.username) : "";
    const pendingCalon = Object.values(cloudCalonMitra || {}).filter(c => c && c.status === "pending" && (!myUsername || pmNorm(c.petugasUsername) === myUsername)).length;
    const pendingPerubahan = Object.values(cloudPerubahanMitra || {}).filter(c => c && c.status === "pending" && (!myUsername || pmNorm(c.petugasUsername) === myUsername)).length;
    const today = pmTodayISO();
    let trxToday = 0;
    Object.values(cloudLogMitra || {}).forEach(l => { if (l && l.tglRaw === today) trxToday += (parseInt(l.trxInput) || 0); });

    const elMitra = document.getElementById("pm-stat-mitra");
    const elPending = document.getElementById("pm-stat-pending");
    const elTrx = document.getElementById("pm-stat-trx");
    if (elMitra) elMitra.innerText = totalMitra;
    if (elPending) elPending.innerText = pendingCalon + pendingPerubahan;
    if (elTrx) elTrx.innerText = trxToday;
}

/* ------------------------------------------------------------------ *
 * 9. FORM: AJUKAN MITRA BARU
 * ------------------------------------------------------------------ */
function pmReadForm(prefix) {
    return {
        namaOwner: document.getElementById(`${prefix}-owner`)?.value.trim() || "",
        nama: document.getElementById(`${prefix}-nama`)?.value.trim() || "",
        alamat: document.getElementById(`${prefix}-alamat`)?.value.trim() || "",
        hpOwner: document.getElementById(`${prefix}-hp-owner`)?.value.trim() || "",
        hpKaryawan: (pmHpKaryawanState[prefix] || []).map(v => (v || "").trim()).filter(Boolean),
        tglGabung: document.getElementById(`${prefix}-tgl-gabung`)?.value || "",
        tglSetor: document.getElementById(`${prefix}-tgl-setor`)?.value || "1",
        jamBuka: document.getElementById(`${prefix}-jam-buka`)?.value || "",
        jamTutup: document.getElementById(`${prefix}-jam-tutup`)?.value || ""
    };
}
function pmValidateForm(data, prefix) {
    if (!data.namaOwner) return "Nama Pemilik wajib diisi.";
    if (!data.nama) return "Nama Kedai/Toko wajib diisi.";
    if (!data.alamat) return "Link Google Maps wajib diisi.";
    if (!data.hpOwner) return "No HP Owner wajib diisi.";
    if (!data.hpKaryawan.length) return "Minimal 1 No HP Karyawan wajib diisi.";
    if (!data.tglGabung) return "Tanggal Bergabung wajib diisi.";
    if (!data.jamBuka || !data.jamTutup) return "Jam operasional (buka & tutup) wajib diisi.";
    const fileLokasi = document.getElementById(`${prefix}-file-lokasi`);
    const fileDok = document.getElementById(`${prefix}-file-dokumentasi`);
    const fileSurat = document.getElementById(`${prefix}-file-surat`);
    if (!fileLokasi?.dataset.compressed) return "Foto lokasi kedai wajib diupload.";
    if (!fileDok?.dataset.compressed) return "Foto dokumentasi wajib diupload.";
    if (!fileSurat?.dataset.compressed) return "Surat Pernyataan Digital wajib diupload.";
    return null;
}
async function pmUploadFormPhotos(prefix, namePrefix) {
    const fileLokasi = document.getElementById(`${prefix}-file-lokasi`);
    const fileDok = document.getElementById(`${prefix}-file-dokumentasi`);
    const fileSurat = document.getElementById(`${prefix}-file-surat`);
    const [lokasi, dokumentasi, surat] = await Promise.all([
        pmUploadToDrive(fileLokasi.dataset.compressed, FOLDER.lokasi, `lokasi-${namePrefix}`),
        pmUploadToDrive(fileDok.dataset.compressed, FOLDER.dokumentasi, `dokumentasi-${namePrefix}`),
        pmUploadToDrive(fileSurat.dataset.compressed, FOLDER.surat, `surat-${namePrefix}`)
    ]);
    return { fotoLokasi: lokasi.url, fotoDokumentasi: dokumentasi.url, suratPernyataan: surat.url };
}

async function pmSubmitMitraBaru() {
    const btn = document.getElementById("pm-new-submit");
    const label = document.getElementById("pm-new-submit-text");
    const data = pmReadForm("pm-new");
    const errMsg = pmValidateForm(data, "pm-new");
    if (errMsg) return pmToast(errMsg, "warning");

    const session = pmGetSession();
    if (!session) return pmToast("Sesi tidak ditemukan, silakan login ulang.");

    btn.disabled = true; label.innerText = "Mengirim...";
    try {
        const foto = await pmUploadFormPhotos("pm-new", (data.nama || "mitra").replace(/\s+/g, "-").toLowerCase());
        const payload = {
            ...data, ...foto,
            status: "pending",
            petugasNama: session.nama || "",
            petugasUsername: session.username || "",
            createdAt: Date.now(),
            tglRaw: pmTodayISO()
        };
        await push(ref(db, "calon_mitra"), payload);
        pmToast("Pengajuan mitra baru berhasil dikirim, menunggu persetujuan Admin.");
        pmResetForm("pm-new");
        window.__pm.go("screen-pm-status");
        pmSetResultsOpen("status", "pm-status-results", "pm-status-toggle-btn", pmRenderStatusSaya, true, "Buka Daftar Pengajuan", "Tutup Daftar Pengajuan");
    } catch (err) {
        pmToast("Gagal mengirim pengajuan: " + err.message);
    } finally {
        btn.disabled = false; label.innerText = "Ajukan Mitra";
    }
}

function pmResetForm(prefix) {
    ["owner", "nama", "alamat", "hp-owner", "tgl-gabung", "jam-buka", "jam-tutup"].forEach(f => {
        const el = document.getElementById(`${prefix}-${f}`);
        if (el) el.value = "";
    });
    const setor = document.getElementById(`${prefix}-tgl-setor`);
    if (setor) setor.value = "1";
    pmHpKaryawanState[prefix] = [""];
    pmRenderHpRows(prefix);
    ["lokasi", "dokumentasi", "surat"].forEach(f => {
        const input = document.getElementById(`${prefix}-file-${f}`);
        const box = document.getElementById(`${prefix}-box-${f}`);
        if (input) { input.value = ""; delete input.dataset.compressed; }
        if (box) box.innerHTML = `<i data-lucide="image-plus" class="w-6 h-6 mx-auto text-slate-400 mb-1"></i><p class="text-[10px] text-slate-400">Ketuk untuk pilih / ambil foto</p>`;
    });
    if (window.lucide) window.lucide.createIcons();
}

/* ------------------------------------------------------------------ *
 * 10. DAFTAR MITRA + AJUKAN PERUBAHAN
 * ------------------------------------------------------------------ */
function pmMitraCardHtml(id, m, bulan, showActions) {
    const stat = pmMitraTrxStat(m.nama, bulan);
    const jam = pmFormatJam(m.jamBuka, m.jamTutup);
    return `<div class="pm-card">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
                <p class="font-bold text-[13px] truncate">${pmEsc(m.nama)}</p>
                <p class="text-[10.5px] text-slate-400 truncate">Owner: ${pmEsc(m.namaOwner || "-")}</p>
                <p class="text-[10px] text-slate-400 mt-1"><i data-lucide="calendar" class="w-3 h-3 inline"></i> Gabung: ${pmFormatTanggal(m.tglGabung)}</p>
                ${jam ? `<p class="text-[10px] text-slate-400"><i data-lucide="clock" class="w-3 h-3 inline"></i> Jam: ${pmEsc(jam)}</p>` : ""}
            </div>
            <span class="pm-chip pm-chip-approved flex-shrink-0">Aktif</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="pm-stat-mini"><p class="l">Trx Bulan Ini</p><p class="n">${stat.count}x &middot; ${stat.total}</p></div>
            <div class="pm-stat-mini"><p class="l">Target</p><p class="n">${parseInt(m.target) || 0}</p></div>
        </div>
        <div class="flex gap-2 mt-3">
            <button onclick="window.__pm.showDetailMitra('${id}')" class="pm-btn-outline flex-1">Detail</button>
            ${showActions ? `<button onclick="window.__pm.openEditMitra('${id}')" class="pm-btn-outline flex-1" style="border-color:#D97706;color:#D97706">Ajukan Perubahan</button>` : ""}
        </div>
    </div>`;
}

function pmRenderDaftarMitra() {
    const bulanEl = document.getElementById("pm-daftar-bulan");
    pmEnsureDefault(bulanEl, pmCurrentBulan());
    if (!pmOpenState.daftar) return;

    const list = document.getElementById("pm-daftar-list");
    if (!list) return;
    const search = pmNorm(document.getElementById("pm-daftar-search")?.value || "");
    const bulan = bulanEl?.value || pmCurrentBulan();

    const entries = Object.entries(cloudMitra || {}).filter(([, m]) => {
        if (!m) return false;
        if (search && !(pmNorm(m.nama).includes(search) || pmNorm(m.namaOwner).includes(search))) return false;
        return true;
    }).sort((a, b) => (a[1].nama || "").localeCompare(b[1].nama || ""));

    if (!entries.length) { list.innerHTML = `<div class="pm-empty">Belum ada data mitra.</div>`; return; }
    list.innerHTML = entries.map(([id, m]) => pmMitraCardHtml(id, m, bulan, true)).join("");
    if (window.lucide) window.lucide.createIcons();
}

function pmOpenEditMitra(id) {
    const m = cloudMitra[id];
    if (!m) return pmToast("Data mitra tidak ditemukan.");
    document.getElementById("pm-edit-mitra-id").value = id;
    document.getElementById("pm-edit-owner").value = m.namaOwner || "";
    document.getElementById("pm-edit-nama").value = m.nama || "";
    document.getElementById("pm-edit-alamat").value = m.alamat || "";
    document.getElementById("pm-edit-hp-owner").value = m.hpOwner || m.hp || "";
    pmHpKaryawanState["pm-edit"] = (m.hpKaryawan && m.hpKaryawan.length) ? m.hpKaryawan.slice() : [""];
    pmRenderHpRows("pm-edit");
    document.getElementById("pm-edit-tgl-gabung").value = m.tglGabung || "";
    document.getElementById("pm-edit-tgl-setor").value = m.tglSetor || "1";
    document.getElementById("pm-edit-jam-buka").value = m.jamBuka || "";
    document.getElementById("pm-edit-jam-tutup").value = m.jamTutup || "";
    ["lokasi", "dokumentasi", "surat"].forEach(f => {
        const box = document.getElementById(`pm-edit-box-${f}`);
        const input = document.getElementById(`pm-edit-file-${f}`);
        const url = f === "lokasi" ? m.fotoLokasi : (f === "dokumentasi" ? m.fotoDokumentasi : m.suratPernyataan);
        if (input) { input.value = ""; if (url) input.dataset.compressed = url; else delete input.dataset.compressed; }
        if (box) box.innerHTML = url ? `<img src="${url}"><p class="text-[9.5px] text-slate-400">Foto tersimpan &middot; ketuk untuk ganti</p>` : `<i data-lucide="image-plus" class="w-6 h-6 mx-auto text-slate-400 mb-1"></i><p class="text-[10px] text-slate-400">Ketuk untuk pilih / ambil foto</p>`;
    });
    if (window.lucide) window.lucide.createIcons();
    window.__pm.go("screen-pm-edit");
}

async function pmSubmitPerubahan() {
    const btn = document.getElementById("pm-edit-submit");
    const label = document.getElementById("pm-edit-submit-text");
    const mitraId = document.getElementById("pm-edit-mitra-id").value;
    if (!mitraId) return pmToast("Data mitra tidak valid.");
    const data = pmReadForm("pm-edit");
    const errMsg = pmValidateForm(data, "pm-edit");
    if (errMsg) return pmToast(errMsg, "warning");

    const session = pmGetSession();
    btn.disabled = true; label.innerText = "Mengirim...";
    try {
        const fileLokasi = document.getElementById("pm-edit-file-lokasi");
        const fileDok = document.getElementById("pm-edit-file-dokumentasi");
        const fileSurat = document.getElementById("pm-edit-file-surat");

        const uploadIfChanged = async (input, folderId, tag) => {
            const val = input.dataset.compressed || "";
            if (val.startsWith("data:")) {
                const up = await pmUploadToDrive(val, folderId, tag);
                return up.url;
            }
            return val;
        };
        const fotoLokasi = await uploadIfChanged(fileLokasi, FOLDER.lokasi, "lokasi-edit");
        const fotoDokumentasi = await uploadIfChanged(fileDok, FOLDER.dokumentasi, "dokumentasi-edit");
        const suratPernyataan = await uploadIfChanged(fileSurat, FOLDER.surat, "surat-edit");

        const dataBaru = { ...data, fotoLokasi, fotoDokumentasi, suratPernyataan };
        await push(ref(db, "perubahan_mitra"), {
            mitraId, mitraNamaLama: cloudMitra[mitraId]?.nama || "",
            dataBaru, status: "pending",
            petugasNama: session?.nama || "", petugasUsername: session?.username || "",
            createdAt: Date.now()
        });
        pmToast("Pengajuan perubahan berhasil dikirim, menunggu persetujuan Admin.");
        window.__pm.go("screen-pm-status");
        pmSetResultsOpen("status", "pm-status-results", "pm-status-toggle-btn", pmRenderStatusSaya, true, "Buka Daftar Pengajuan", "Tutup Daftar Pengajuan");
    } catch (err) {
        pmToast("Gagal mengirim perubahan: " + err.message);
    } finally {
        btn.disabled = false; label.innerText = "Ajukan Perubahan";
    }
}

/* ------------------------------------------------------------------ *
 * 11. DETAIL MITRA (modal)
 * ------------------------------------------------------------------ */
function pmShowDetailMitra(id) {
    const m = cloudMitra[id];
    if (!m) return pmToast("Data tidak ditemukan.");
    const hpKaryawan = (m.hpKaryawan || []).join(", ") || "-";
    const slot = document.getElementById("pm-modal-slot");
    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-sm">${pmEsc(m.nama)}</h3>
                <button onclick="document.getElementById('pm-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <div class="space-y-2 text-[12px]">
                <p><b>Owner:</b> ${pmEsc(m.namaOwner || "-")}</p>
                <p><b>Alamat:</b> <a href="${pmEsc(m.alamat || "#")}" target="_blank" class="text-emerald-600 underline">Buka Google Maps</a></p>
                <p><b>HP Owner:</b> ${pmEsc(m.hpOwner || m.hp || "-")}</p>
                <p><b>HP Karyawan:</b> ${pmEsc(hpKaryawan)}</p>
                <p><b>Tanggal Bergabung:</b> ${pmFormatTanggal(m.tglGabung)}</p>
                <p><b>Penyetoran:</b> Tanggal ${pmEsc(m.tglSetor || "-")}</p>
                <p><b>Jam Operasional:</b> ${pmEsc(m.jamBuka || "-")} - ${pmEsc(m.jamTutup || "-")}</p>
                <p><b>Target:</b> ${parseInt(m.target) || 0}</p>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3">
                ${m.fotoLokasi ? `<a href="${m.fotoLokasi}" target="_blank"><img src="${m.fotoLokasi}" class="rounded-xl h-20 w-full object-cover"></a>` : ""}
                ${m.fotoDokumentasi ? `<a href="${m.fotoDokumentasi}" target="_blank"><img src="${m.fotoDokumentasi}" class="rounded-xl h-20 w-full object-cover"></a>` : ""}
                ${m.suratPernyataan ? `<a href="${m.suratPernyataan}" target="_blank"><img src="${m.suratPernyataan}" class="rounded-xl h-20 w-full object-cover"></a>` : ""}
            </div>
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

/* ------------------------------------------------------------------ *
 * 12. RIWAYAT TRANSAKSI (petugas)
 * ------------------------------------------------------------------ */
function pmPopulateKurirDropdown(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || sel.dataset.filled === "1") return;
    const names = Object.values(cloudUsers || {}).filter(u => u && u.role === "kurir").map(u => u.nama).filter(Boolean).sort();
    names.forEach(n => { sel.innerHTML += `<option value="${pmEsc(n)}">${pmEsc(n)}</option>`; });
    sel.dataset.filled = "1";
}

function pmFilterRiwayat(bulan, tanggal, kurir, search) {
    search = pmNorm(search);
    return Object.values(cloudLogMitra || {}).filter(l => {
        if (!l) return false;
        if (bulan && l.bulan !== bulan) return false;
        if (tanggal && l.tglRaw !== tanggal) return false;
        if (kurir && pmNorm(l.kurirNama) !== pmNorm(kurir)) return false;
        if (search && !(pmNorm(l.mitraNama).includes(search) || pmNorm(l.kurirNama).includes(search))) return false;
        return true;
    }).sort((a, b) => (b.tglRaw || "").localeCompare(a.tglRaw || "") || (b.waktu || "").localeCompare(a.waktu || ""));
}
function pmRenderRiwayatList(rows, listId, totalId) {
    const list = document.getElementById(listId);
    const totalEl = document.getElementById(totalId);
    if (totalEl) totalEl.innerText = rows.reduce((s, r) => s + (parseInt(r.trxInput) || 0), 0);
    if (!list) return;
    if (!rows.length) { list.innerHTML = `<div class="pm-empty">Tidak ada transaksi untuk filter ini.</div>`; return; }
    list.innerHTML = rows.slice(0, 200).map(r => {
        const m = pmFindMitraByName(r.mitraNama);
        const jam = m ? pmFormatJam(m.jamBuka, m.jamTutup) : "";
        return `<div class="pm-card flex items-center justify-between">
            <div class="min-w-0">
                <p class="font-bold text-[12px] truncate">${pmEsc(r.mitraNama)}</p>
                <p class="text-[10px] text-slate-400">${pmEsc(r.kurirNama)} &middot; ${pmFormatTanggal(r.tglRaw)} ${pmEsc(r.waktu || "")}</p>
                ${jam ? `<p class="text-[9.5px] text-slate-400">Jam Operasional: ${pmEsc(jam)}</p>` : ""}
            </div>
            <span class="text-sm font-black text-emerald-600 flex-shrink-0">${parseInt(r.trxInput) || 0}</span>
        </div>`;
    }).join("");
}
function pmRenderRiwayat() {
    pmPopulateKurirDropdown("pm-rwt-kurir");
    pmEnsureDefault(document.getElementById("pm-rwt-bulan"), pmCurrentBulan());
    pmEnsureDefault(document.getElementById("pm-rwt-tanggal"), pmTodayISO());
    if (!pmOpenState.rwt) return;
    const bulan = document.getElementById("pm-rwt-bulan")?.value || "";
    const tanggal = document.getElementById("pm-rwt-tanggal")?.value || "";
    const kurir = document.getElementById("pm-rwt-kurir")?.value || "";
    const search = document.getElementById("pm-rwt-search")?.value || "";
    pmRenderRiwayatList(pmFilterRiwayat(bulan, tanggal, kurir, search), "pm-rwt-list", "pm-rwt-total");
}

/* ------------------------------------------------------------------ *
 * 13. CEK TRX KURIR — 3 daftar terpisah: Sudah / Belum / Off-Izin-Sakit
 * ------------------------------------------------------------------ */
function pmBuildKurirDailyStatus(tanggal) {
    const activeKurir = Object.values(cloudUsers || {}).filter(u => u && u.role === "kurir" && u.status === "aktif");

    const excusedMap = {};
    Object.values(cloudJadwalOff || {}).forEach(j => {
        if (!j) return;
        const jenis = pmNorm(j.jenisOff);
        if (!["off reguler", "izin", "sakit"].includes(jenis)) return;
        const mulai = (j.tanggalMulai || "").trim();
        const selesai = (j.tanggalSelesai || mulai).trim();
        if (!mulai) return;
        if (tanggal >= mulai && tanggal <= selesai) excusedMap[pmNorm(j.nama)] = j.jenisOff;
    });

    const entriesByKurir = {};
    Object.values(cloudLogMitra || {}).forEach(l => {
        if (!l || l.tglRaw !== tanggal) return;
        const key = pmNorm(l.kurirNama);
        if (!entriesByKurir[key]) entriesByKurir[key] = [];
        entriesByKurir[key].push(l);
    });

    return activeKurir.map(u => {
        const key = pmNorm(u.nama);
        const entries = entriesByKurir[key] || [];
        const trxCount = entries.reduce((s, e) => s + (parseInt(e.trxInput) || 0), 0);
        let status = "belum";
        if (excusedMap[key]) status = "excused";
        else if (entries.length) status = "sudah";
        return { nama: u.nama, status, jenisOff: excusedMap[key] || "", entries, trxCount };
    }).sort((a, b) => a.nama.localeCompare(b.nama));
}

function pmKurirRowHtml(r, tanggal) {
    let chip, iconBg, icon, clickable = false;
    if (r.status === "sudah") { chip = `<span class="pm-chip pm-chip-approved">${r.trxCount}x</span>`; iconBg = "#D1FAE5"; icon = "user-check"; clickable = true; }
    else if (r.status === "excused") { chip = `<span class="pm-chip" style="background:#F1F5F9;color:#64748B">${pmEsc(r.jenisOff)}</span>`; iconBg = "#F1F5F9"; icon = "moon"; }
    else { chip = `<span class="pm-chip pm-chip-rejected">Belum</span>`; iconBg = "#FEE2E2"; icon = "user-x"; }
    const namaSafe = pmEsc(r.nama).replace(/'/g, "\\'");
    return `<div class="pm-card flex items-center justify-between gap-2" ${clickable ? `onclick="window.__pm.showKurirTrx('${namaSafe}','${tanggal}')" style="cursor:pointer"` : ""}>
        <div class="flex items-center gap-2 min-w-0">
            <div class="pm-menu-icon" style="width:28px;height:28px;background:${iconBg};color:#334155"><i data-lucide="${icon}" class="w-3.5 h-3.5"></i></div>
            <span class="font-bold text-[12px] truncate">${pmEsc(r.nama)}</span>
        </div>
        ${chip}
    </div>`;
}

function pmRenderCekKurirInto(tanggalId, listId, searchId) {
    pmEnsureDefault(document.getElementById(tanggalId), pmTodayISO());
    const tanggal = document.getElementById(tanggalId)?.value || "";
    const list = document.getElementById(listId);
    if (!list) return;
    if (!tanggal) { list.innerHTML = `<div class="pm-empty">Pilih tanggal terlebih dahulu.</div>`; return; }
    const search = pmNorm(document.getElementById(searchId)?.value || "");
    let rows = pmBuildKurirDailyStatus(tanggal);
    if (search) rows = rows.filter(r => pmNorm(r.nama).includes(search));

    const sudah = rows.filter(r => r.status === "sudah");
    const belum = rows.filter(r => r.status === "belum");
    const excused = rows.filter(r => r.status === "excused");

    let html = `<div class="pm-card grid grid-cols-3 gap-2 text-center mb-1">
        <div><p class="text-[9px] text-slate-400 font-bold uppercase">Sudah</p><p class="font-black text-emerald-600">${sudah.length}</p></div>
        <div><p class="text-[9px] text-slate-400 font-bold uppercase">Belum</p><p class="font-black text-rose-600">${belum.length}</p></div>
        <div><p class="text-[9px] text-slate-400 font-bold uppercase">Off/Izin/Sakit</p><p class="font-black text-slate-400">${excused.length}</p></div>
    </div>`;

    html += `<div class="pm-section-title" style="color:#047857"><i data-lucide="user-check" class="w-3.5 h-3.5"></i>Sudah Trx (${sudah.length})</div>`;
    html += sudah.length ? sudah.map(r => pmKurirRowHtml(r, tanggal)).join("") : `<div class="pm-empty">Belum ada kurir yang input trx.</div>`;

    html += `<div class="pm-section-title" style="color:#DC2626"><i data-lucide="user-x" class="w-3.5 h-3.5"></i>Belum Trx (${belum.length})</div>`;
    html += belum.length ? belum.map(r => pmKurirRowHtml(r, tanggal)).join("") : `<div class="pm-empty">Semua kurir sudah input trx.</div>`;

    html += `<div class="pm-section-title"><i data-lucide="moon" class="w-3.5 h-3.5"></i>Off / Izin / Sakit (${excused.length})</div>`;
    html += excused.length ? excused.map(r => pmKurirRowHtml(r, tanggal)).join("") : `<div class="pm-empty">Tidak ada kurir yang off/izin/sakit.</div>`;

    list.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}
function pmRenderCekKurir() { pmRenderCekKurirInto("pm-cek-tanggal", "pm-cek-list", "pm-cek-search"); }

function pmShowKurirTrx(nama, tanggal) {
    const rows = pmBuildKurirDailyStatus(tanggal);
    const row = rows.find(r => pmNorm(r.nama) === pmNorm(nama));
    const entries = row ? row.entries : [];
    const slot = document.getElementById("pm-modal-slot");
    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <div><h3 class="font-bold text-sm">${pmEsc(nama)}</h3><p class="text-[10px] text-slate-400">${pmFormatTanggal(tanggal)}</p></div>
                <button onclick="document.getElementById('pm-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            ${entries.length ? entries.map(e => {
                const m = pmFindMitraByName(e.mitraNama);
                const jam = m ? pmFormatJam(m.jamBuka, m.jamTutup) : "";
                return `<div class="pm-card flex items-center justify-between">
                    <div class="min-w-0">
                        <p class="font-bold text-[12px] truncate">${pmEsc(e.mitraNama)}</p>
                        <p class="text-[10px] text-slate-400">${pmEsc(e.waktu || "-")}${jam ? ` &middot; Jam ${pmEsc(jam)}` : ""}</p>
                    </div>
                    <span class="text-sm font-black text-emerald-600 flex-shrink-0">${parseInt(e.trxInput) || 0}</span>
                </div>`;
            }).join("") : `<div class="pm-empty">Tidak ada transaksi.</div>`}
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

/* ------------------------------------------------------------------ *
 * 14. STATUS PENGAJUAN SAYA (petugas) — filter, cari, hapus, buka/tutup
 * ------------------------------------------------------------------ */
function pmChip(status) {
    if (status === "approved") return `<span class="pm-chip pm-chip-approved">Disetujui</span>`;
    if (status === "rejected") return `<span class="pm-chip pm-chip-rejected">Ditolak</span>`;
    return `<span class="pm-chip pm-chip-pending">Pending</span>`;
}
function pmRenderStatusSaya() {
    pmEnsureDefault(document.getElementById("pm-status-bulan"), pmCurrentBulan());
    pmEnsureDefault(document.getElementById("pm-status-tanggal"), pmTodayISO());
    if (!pmOpenState.status) return;

    const list = document.getElementById("pm-status-list");
    if (!list) return;
    const session = pmGetSession();
    const myUsername = session ? pmNorm(session.username) : "";
    const bulan = document.getElementById("pm-status-bulan")?.value || "";
    const tanggal = document.getElementById("pm-status-tanggal")?.value || "";
    const search = pmNorm(document.getElementById("pm-status-search")?.value || "");

    const calon = Object.entries(cloudCalonMitra || {}).filter(([, c]) => c && pmNorm(c.petugasUsername) === myUsername)
        .map(([id, c]) => ({ id, ...c, __type: "calon", __label: c.nama, __jam: pmFormatJam(c.jamBuka, c.jamTutup) }));
    const perubahan = Object.entries(cloudPerubahanMitra || {}).filter(([, c]) => c && pmNorm(c.petugasUsername) === myUsername)
        .map(([id, c]) => ({ id, ...c, __type: "perubahan", __label: c.mitraNamaLama, __jam: pmFormatJam(c.dataBaru?.jamBuka, c.dataBaru?.jamTutup) }));

    let rows = [...calon, ...perubahan];
    rows = rows.filter(r => {
        const tglSubmit = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "";
        if (bulan && tglSubmit.slice(0, 7) !== bulan) return false;
        if (tanggal && tglSubmit !== tanggal) return false;
        if (search && !pmNorm(r.__label).includes(search)) return false;
        return true;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!rows.length) { list.innerHTML = `<div class="pm-empty">Belum ada pengajuan pada filter ini.</div>`; return; }
    list.innerHTML = rows.map(r => `
        <div class="pm-card">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <p class="font-bold text-[12.5px] truncate">${pmEsc(r.__label)}</p>
                    <p class="text-[10px] text-slate-400">${r.__type === "calon" ? "Mitra Baru" : "Perubahan Data"} &middot; ${pmFormatTanggal(r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "")}</p>
                    ${r.__jam ? `<p class="text-[10px] text-slate-400">Jam: ${pmEsc(r.__jam)}</p>` : ""}
                    ${r.catatanAdmin ? `<p class="text-[10px] text-rose-500 mt-1">Catatan Admin: ${pmEsc(r.catatanAdmin)}</p>` : ""}
                </div>
                ${pmChip(r.status)}
            </div>
            <div class="flex justify-end mt-2">
                <button onclick="window.__pm.deletePengajuan('${r.__type}','${r.id}')" class="text-[10px] font-bold text-rose-500 flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i>Hapus</button>
            </div>
        </div>`).join("");
    if (window.lucide) window.lucide.createIcons();
}
async function pmDeletePengajuan(type, id) {
    if (!(await pmConfirm("Hapus riwayat pengajuan ini?"))) return;
    try {
        await remove(ref(db, `${type === "calon" ? "calon_mitra" : "perubahan_mitra"}/${id}`));
        pmToast("Riwayat pengajuan dihapus.");
    } catch (err) { pmToast("Gagal menghapus: " + err.message); }
}
/* ------------------------------------------------------------------ *
 * 15. PERSETUJUAN (dipakai admin, disisipkan ke layar Kelola Mitra lama)
 * ------------------------------------------------------------------ */

function pmPendingCardCalon(id, c) {
    const hpKaryawan = (c.hpKaryawan || []).join(", ") || "-";
    return `<div class="bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-3 mb-3 relative overflow-hidden">
        <!-- Pita / Label Kategori -->
        <div class="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
            Mitra Baru
        </div>
        
        <!-- Header Detail Utama -->
        <div class="pr-20 mb-2.5">
            <p class="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight">${pmEsc(c.nama)}</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Diajukan oleh: <span class="font-bold text-amber-600 dark:text-amber-500">${pmEsc(c.petugasNama || "-")}</span></p>
        </div>
        
        <!-- Box Informasi Rinci (Support Dark Mode) -->
        <div class="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-3 shadow-sm">
            
            <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                <span class="shrink-0 flex items-center gap-1.5 text-slate-400 font-medium"><i data-lucide="user" class="w-3.5 h-3.5"></i>Owner</span>
                <div class="text-right">
                    <span class="font-bold text-slate-800 dark:text-slate-100">${pmEsc(c.namaOwner)}</span><br>
                    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">${pmEsc(c.hpOwner || c.hp)}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                <span class="shrink-0 flex items-center gap-1.5 text-slate-400 font-medium"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>Alamat</span>
                <a href="${pmEsc(c.alamat || "#")}" target="_blank" class="text-right text-blue-600 dark:text-blue-400 font-bold underline truncate max-w-[140px]">Cek Maps</a>
            </div>
            
            <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                <span class="shrink-0 flex items-center gap-1.5 text-slate-400 font-medium"><i data-lucide="phone-call" class="w-3.5 h-3.5"></i>HP Karyawan</span>
                <span class="text-right font-bold text-slate-800 dark:text-slate-100 break-all">${pmEsc(hpKaryawan)}</span>
            </div>
            
            <div class="flex justify-between items-center gap-2 pt-0.5">
                <span class="shrink-0 flex items-center gap-1.5 text-slate-400 font-medium"><i data-lucide="calendar-clock" class="w-3.5 h-3.5"></i>Operasional</span>
                <span class="text-right font-bold text-slate-800 dark:text-slate-100">${pmFormatTanggal(c.tglGabung)} &middot; <span class="text-amber-600 dark:text-amber-400">${pmEsc(pmFormatJam(c.jamBuka, c.jamTutup) || "-")}</span></span>
            </div>
        </div>
        
        <!-- Grid Foto -->
        <div class="grid grid-cols-3 gap-2 mb-3">
            ${c.fotoLokasi ? `<a href="${c.fotoLokasi}" target="_blank" class="block relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"><img src="${c.fotoLokasi}" class="w-full h-full object-cover"><div class="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-1">Lokasi</div></a>` : ""}
            ${c.fotoDokumentasi ? `<a href="${c.fotoDokumentasi}" target="_blank" class="block relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"><img src="${c.fotoDokumentasi}" class="w-full h-full object-cover"><div class="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-1">Dokumentasi</div></a>` : ""}
            ${c.suratPernyataan ? `<a href="${c.suratPernyataan}" target="_blank" class="block relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"><img src="${c.suratPernyataan}" class="w-full h-full object-cover"><div class="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-1">Pernyataan</div></a>` : ""}
        </div>
        
        <!-- Aksi -->
        <div class="flex gap-2 mt-1">
            <button onclick="window.__pm.approveCalon('${id}')" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Setujui</button>
            <button onclick="window.__pm.rejectCalon('${id}')" class="flex-1 bg-white dark:bg-slate-800 border-2 border-rose-500 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-black py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"><i data-lucide="x-circle" class="w-4 h-4"></i> Tolak</button>
        </div>
    </div>`;
}

function pmPendingCardPerubahan(id, c) {
    return `<div class="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-3 mb-3 relative overflow-hidden">
        <!-- Pita / Label Kategori -->
        <div class="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
            Perubahan Data
        </div>
        
        <!-- Header Detail Utama -->
        <div class="pr-24 mb-2.5">
            <p class="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight">${pmEsc(c.mitraNamaLama)}</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Diajukan oleh: <span class="font-bold text-blue-600 dark:text-blue-400">${pmEsc(c.petugasNama || "-")}</span></p>
        </div>

        <!-- Box Informasi Rinci (Support Dark Mode) -->
        <div class="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-3 shadow-sm text-[11px]">
            <div class="text-[10px] uppercase font-black text-slate-400 mb-2 flex items-center gap-1"><i data-lucide="arrow-right-left" class="w-3.5 h-3.5"></i> Rincian Data Baru:</div>
            
            <div class="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                    <span class="shrink-0 text-slate-400 font-medium">Nama Kedai:</span>
                    <span class="font-bold text-right text-slate-800 dark:text-slate-100">${pmEsc(c.dataBaru?.nama || "-")}</span>
                </div>
                <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                    <span class="shrink-0 text-slate-400 font-medium">Alamat Baru:</span>
                    <a href="${pmEsc(c.dataBaru?.alamat || "#")}" target="_blank" class="text-right text-blue-600 dark:text-blue-400 font-bold underline truncate max-w-[140px]">Cek Maps</a>
                </div>
                <div class="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                    <span class="shrink-0 text-slate-400 font-medium">HP Owner:</span>
                    <span class="font-bold text-right text-emerald-600 dark:text-emerald-400">${pmEsc(c.dataBaru?.hpOwner || "-")}</span>
                </div>
                <div class="flex justify-between items-center gap-2 pt-0.5">
                    <span class="shrink-0 text-slate-400 font-medium">Jam Operasional:</span>
                    <span class="font-bold text-right text-slate-800 dark:text-slate-100">${pmEsc(c.dataBaru?.jamBuka || "-")} - ${pmEsc(c.dataBaru?.jamTutup || "-")}</span>
                </div>
            </div>
        </div>
        
        <!-- Aksi -->
        <div class="flex gap-2 mt-1">
            <button onclick="window.__pm.approvePerubahan('${id}')" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Setujui</button>
            <button onclick="window.__pm.rejectPerubahan('${id}')" class="flex-1 bg-white dark:bg-slate-800 border-2 border-rose-500 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-black py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"><i data-lucide="x-circle" class="w-4 h-4"></i> Tolak</button>
        </div>
    </div>`;
}

function pmRenderLegacyPending() {
    const list = document.getElementById("pm-legacy-pending-list");
    const countEl = document.getElementById("pm-legacy-pending-count");
    if (!list) return;
    const pendingCalon = Object.entries(cloudCalonMitra || {}).filter(([, c]) => c && c.status === "pending");
    const pendingPerubahan = Object.entries(cloudPerubahanMitra || {}).filter(([, c]) => c && c.status === "pending");
    const total = pendingCalon.length + pendingPerubahan.length;
    if (countEl) countEl.innerText = total;
    if (!total) {
        list.innerHTML = `<p class="text-[11px] text-slate-400 text-center py-3">Tidak ada pengajuan yang menunggu persetujuan.</p>`;
    } else {
        list.innerHTML = pendingCalon.map(([id, c]) => pmPendingCardCalon(id, c)).join("") +
            pendingPerubahan.map(([id, c]) => pmPendingCardPerubahan(id, c)).join("");
    }
    if (window.lucide) window.lucide.createIcons();
}
function pmRenderLegacyCek() {
    if (!pmOpenState.legacyCek) return;
    pmRenderCekKurirInto("pm-legacy-cek-tanggal", "pm-legacy-cek-list", "pm-legacy-cek-search");
}

async function pmApproveCalon(id) {
    if (!(await pmConfirm("Setujui pengajuan mitra baru ini?"))) return;
    const c = cloudCalonMitra[id];
    if (!c) return;
    try {
        await push(ref(db, "mitra"), {
            nama: c.nama, namaOwner: c.namaOwner, alamat: c.alamat,
            hp: c.hpOwner, hpOwner: c.hpOwner, hpKaryawan: c.hpKaryawan || [],
            tglGabung: c.tglGabung, tglSetor: c.tglSetor, jamBuka: c.jamBuka, jamTutup: c.jamTutup,
            fotoLokasi: c.fotoLokasi, fotoDokumentasi: c.fotoDokumentasi, suratPernyataan: c.suratPernyataan,
            target: 0, status: "aktif"
        });
        await update(ref(db, `calon_mitra/${id}`), { status: "approved" });
        pmToast("Mitra baru berhasil disetujui & masuk ke Daftar Mitra.");
    } catch (err) { pmToast("Gagal menyetujui: " + err.message); }
}
async function pmRejectCalon(id) {
    const catatan = prompt("Alasan penolakan (opsional):") || "";
    if (!(await pmConfirm("Tolak pengajuan mitra baru ini?"))) return;
    try {
        await update(ref(db, `calon_mitra/${id}`), { status: "rejected", catatanAdmin: catatan });
        pmToast("Pengajuan mitra baru ditolak.");
    } catch (err) { pmToast("Gagal menolak: " + err.message); }
}
async function pmApprovePerubahan(id) {
    if (!(await pmConfirm("Setujui perubahan data mitra ini?"))) return;
    const c = cloudPerubahanMitra[id];
    if (!c || !c.mitraId) return;
    try {
        await update(ref(db, `mitra/${c.mitraId}`), { ...c.dataBaru, hp: c.dataBaru.hpOwner });
        await update(ref(db, `perubahan_mitra/${id}`), { status: "approved" });
        pmToast("Perubahan data mitra berhasil disimpan.");
    } catch (err) { pmToast("Gagal menyetujui perubahan: " + err.message); }
}
async function pmRejectPerubahan(id) {
    const catatan = prompt("Alasan penolakan (opsional):") || "";
    if (!(await pmConfirm("Tolak perubahan data ini?"))) return;
    try {
        await update(ref(db, `perubahan_mitra/${id}`), { status: "rejected", catatanAdmin: catatan });
        pmToast("Pengajuan perubahan ditolak.");
    } catch (err) { pmToast("Gagal menolak: " + err.message); }
}

/* ------------------------------------------------------------------ *
 * 16. INJEKSI KE LAYAR "KELOLA MITRA" (MODE LAMA) UNTUK ADMIN
 * ------------------------------------------------------------------ */
let pmLegacyInjected = false;
function pmEnsureNativeMitraBadge() {
    const btn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-mitra"]');
    if (!btn || document.getElementById("pm-admin-badge")) return;
    btn.classList.add("relative");
    const span = document.createElement("span");
    span.id = "pm-admin-badge";
    span.className = "hidden absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-darkCard";
    btn.appendChild(span);
}
function pmUpdateAdminBadge() {
    const badge = document.getElementById("pm-admin-badge");
    if (!badge) return;
    const count = Object.values(cloudCalonMitra || {}).filter(c => c && c.status === "pending").length +
        Object.values(cloudPerubahanMitra || {}).filter(c => c && c.status === "pending").length;
    if (count > 0) { badge.classList.remove("hidden"); badge.innerText = count > 9 ? "9+" : String(count); }
    else badge.classList.add("hidden");
}
function pmInjectLegacyMitraExtras() {
    const screen = document.getElementById("screen-admin-mitra");
    if (!screen || pmLegacyInjected) return;
    pmLegacyInjected = true;

    const header = screen.querySelector(".kurir-screen-header");
    const pendingWrap = document.createElement("div");
    pendingWrap.id = "pm-legacy-pending-wrap";
    pendingWrap.className = "bg-white dark:bg-darkCard p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-2";
    pendingWrap.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i> Menunggu Persetujuan Kemitraan
            </h3>
            <span id="pm-legacy-pending-count" class="pm-chip pm-chip-pending">0</span>
        </div>
        <div id="pm-legacy-pending-list" class="space-y-2"></div>
    `;
    if (header && header.parentNode) header.parentNode.insertBefore(pendingWrap, header.nextSibling);
    else screen.insertBefore(pendingWrap, screen.firstChild);

    const cekWrap = document.createElement("div");
    cekWrap.className = "bg-white dark:bg-darkCard p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3";
    cekWrap.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <i data-lucide="user-search" class="w-3.5 h-3.5 shrink-0"></i> Cek Trx Kurir (Kemitraan)
            </h3>
            <button id="pm-legacy-cek-toggle-btn" onclick="window.__pm.toggleLegacyCek()" class="px-2 py-1 rounded-lg bg-slate-800 text-white text-[8px] font-bold uppercase tracking-wide leading-none">Buka</button>
        </div>
        <div id="pm-legacy-cek-results" class="hidden space-y-2">
            <div class="space-y-2">
                <input type="date" id="pm-legacy-cek-tanggal" onchange="window.__pm.renderLegacyCek()" class="w-full px-2 py-1.5 border rounded-lg text-xs dark:bg-darkBg dark:border-slate-700">
                <input type="text" id="pm-legacy-cek-search" oninput="window.__pm.renderLegacyCek()" placeholder="Cari nama kurir..." class="w-full px-2 py-1.5 border rounded-lg text-xs dark:bg-darkBg dark:border-slate-700">
            </div>
            <div id="pm-legacy-cek-list"></div>
        </div>
    `;
    screen.appendChild(cekWrap);

    if (window.lucide) window.lucide.createIcons();
    pmRenderLegacyPending();
}

/* ------------------------------------------------------------------ *
 * 17. HOOK ke applyManajemenAccess (login petugas kemitraan & badge admin)
 * ------------------------------------------------------------------ */
function pmPatchApplyManajemenAccess() {
    if (window.__pmAccessPatched) return;
    window.__pmAccessPatched = true;
    const orig = window.applyManajemenAccess;
    window.applyManajemenAccess = function (kategori) {
        const k = (kategori || "").trim();
        if (k === KATEGORI_PM) {
            const badge = document.getElementById("badge-admin-role");
            if (badge) badge.innerText = "Kemitraan";
            window.__pm.go("screen-pm-dashboard");
            return;
        }
        if (typeof orig === "function") orig(kategori);
        if (k === "Owner" || k === "Head Operasional") {
            pmEnsureNativeMitraBadge();
            pmInjectLegacyMitraExtras();
            pmUpdateAdminBadge();
        }
    };
}

/* ------------------------------------------------------------------ *
 * 18. PUBLIC API + BOOTSTRAP
 * ------------------------------------------------------------------ */
window.__pm = {
    go(screenId) { if (typeof window.navigateTo === "function") window.navigateTo(screenId); },
    logout() {
        if (typeof window.handleLogout === "function") window.handleLogout();
        else { localStorage.removeItem("sahabatku_session"); location.reload(); }
    },
    addHpRow() {
        const activePrefix = document.getElementById("screen-pm-edit")?.classList.contains("active") ? "pm-edit" : "pm-new";
        pmHpKaryawanState[activePrefix].push("");
        pmRenderHpRows(activePrefix);
    },
    removeHpRow(idx) {
        const activePrefix = document.getElementById("screen-pm-edit")?.classList.contains("active") ? "pm-edit" : "pm-new";
        if (pmHpKaryawanState[activePrefix].length <= 1) { pmHpKaryawanState[activePrefix] = [""]; }
        else pmHpKaryawanState[activePrefix].splice(idx, 1);
        pmRenderHpRows(activePrefix);
    },
    submitMitraBaru: pmSubmitMitraBaru,
    submitPerubahan: pmSubmitPerubahan,
    renderDaftarMitra: pmRenderDaftarMitra,
    openEditMitra: pmOpenEditMitra,
    showDetailMitra: pmShowDetailMitra,
    renderRiwayat: pmRenderRiwayat,
    renderCekKurir: pmRenderCekKurir,
    showKurirTrx: pmShowKurirTrx,
    renderStatusSaya: pmRenderStatusSaya,
    deletePengajuan: pmDeletePengajuan,
    approveCalon: pmApproveCalon,
    rejectCalon: pmRejectCalon,
    approvePerubahan: pmApprovePerubahan,
    rejectPerubahan: pmRejectPerubahan,
    renderLegacyCek: pmRenderLegacyCek,
    toggleRiwayat() { pmToggleResults("rwt", "pm-rwt-results", "pm-rwt-toggle-btn", pmRenderRiwayat, "Buka Daftar Total Transaksi", "Tutup Daftar Total Transaksi"); },
    toggleDaftarMitra() { pmToggleResults("daftar", "pm-daftar-results", "pm-daftar-toggle-btn", pmRenderDaftarMitra, "Buka", "Tutup"); },
    toggleStatus() { pmToggleResults("status", "pm-status-results", "pm-status-toggle-btn", pmRenderStatusSaya, "Buka Daftar Pengajuan", "Tutup Daftar Pengajuan"); },
    toggleLegacyCek() { pmToggleResults("legacyCek", "pm-legacy-cek-results", "pm-legacy-cek-toggle-btn", pmRenderLegacyCek, "Buka", "Tutup"); }
};

function pmBoot() {
    if (pmBooted) return;
    pmBooted = true;
    pmInjectStyle();
    pmInjectScreens();
    pmPatchNavigation();
    pmPatchApplyManajemenAccess();

    // Langsung tentukan tampilan yg benar SEKARANG JUGA — jangan menunggu
    // applyManajemenAccess yg di script.js baru dipanggil lewat setTimeout 50ms,
    // supaya sesi Petugas Kemitraan tidak sempat "nyasar" ke dashboard admin.
    const session = pmGetSession();
    if (pmIsPetugasSession(session)) {
        const badge = document.getElementById("badge-admin-role");
        if (badge) badge.innerText = "Kemitraan";
        window.__pm.go("screen-pm-dashboard");
    } else if (pmIsAdminSession(session)) {
        pmEnsureNativeMitraBadge();
        pmInjectLegacyMitraExtras();
        pmUpdateAdminBadge();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pmBoot);
} else {
    pmBoot();
}

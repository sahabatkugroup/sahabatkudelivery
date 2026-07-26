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
const ackApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(ackApp);

/* ------------------------------------------------------------------ *
 * 1. State (cache realtime)
 * ------------------------------------------------------------------ */
let cloudCalonKurir = {};
let cloudPenilaian = {};
let cloudUsersList = {};
let cloudLeaderListAck = {};
let ackCurrentScreen = null;
let ackQueueTimer = null;
let ackListOpen = false;

function ackQueueRender() {
    if (ackQueueTimer) clearTimeout(ackQueueTimer);
    ackQueueTimer = setTimeout(() => {
        ackQueueTimer = null;
        ackRenderActiveScreen();
        ackUpdateMenuBadge();
    }, 120);
}

onValue(ref(db, "calon_kurir"), (snap) => { cloudCalonKurir = snap.val() || {}; ackQueueRender(); });
onValue(ref(db, "penilaian_calon_kurir"), (snap) => { cloudPenilaian = snap.val() || {}; ackQueueRender(); });
onValue(ref(db, "users"), (snap) => { cloudUsersList = snap.val() || {}; });
onValue(ref(db, "leader_list"), (snap) => { cloudLeaderListAck = snap.val() || {}; ackPopulateLeaderSelect(); });

/* ------------------------------------------------------------------ *
 * 2. Helper umum (disalin ringkas dari pola trainer.js)
 * ------------------------------------------------------------------ */
function ackToast(msg, type) {
    if (typeof window.toast === "function") window.toast(msg, type);
    else alert(msg);
}
async function ackConfirm(msg) {
    if (typeof window.showConfirm === "function") return await window.showConfirm(msg);
    return confirm(msg);
}
function ackEsc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
function ackTodayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function ackCurrentMonthISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ackFormatTanggal(iso) {
    if (!iso) return "-";
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${parseInt(d)} ${bulan[parseInt(m) - 1] || m} ${y}`;
}
function ackGetSession() {
    try { return JSON.parse(localStorage.getItem("sahabatku_session") || "null"); }
    catch (e) { return null; }
}
function ackHitungHasil(total) {
    if (total >= 90) return { label: "LULUS", cls: "tr-hasil-lulus", emoji: "✅" };
    if (total >= 80) return { label: "EVALUASI", cls: "tr-hasil-evaluasi", emoji: "⏳" };
    return { label: "TIDAK LULUS", cls: "tr-hasil-tidaklulus", emoji: "❌" };
}
function ackLastPenilaian(candidateId) {
    const riwayat = Object.entries(cloudPenilaian || {})
        .filter(([, p]) => p && p.calonKurirId === candidateId)
        .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    return riwayat.length ? riwayat[0][1] : null;
}
function ackPengajuanBadgeHtml(c) {
    const s = c && c.statusPengajuan;
    if (s === "diajukan") return `<span class="pm-chip" style="background:#fef3c7;color:#b45309;border-color:#fde68a;">Menunggu Persetujuan</span>`;
    if (s === "disetujui") return `<span class="pm-chip pm-chip-approved">Disetujui - Sudah Jadi Kurir</span>`;
    if (s === "ditolak") return `<span class="pm-chip pm-chip-rejected">Ditolak</span>`;
    return `<span class="pm-chip" style="background:#f1f5f9;color:#64748b;">Belum Diajukan Trainer</span>`;
}

/* ------------------------------------------------------------------ *
 * 3. Style tambahan
 * ------------------------------------------------------------------ */
function ackInjectStyle() {
    if (document.getElementById("ack-style")) return;
    const css = `
    #ack-root .screen { display:none; min-height:100vh; }
    #ack-root .screen.active { display:flex; flex-direction:column; }
    .ack-check-row{ display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:10px 12px; border-radius:12px; background:#f8fafc; border:1px solid #eef2f7; cursor:pointer;
      transition:background .12s ease, border-color .12s ease; }
    .dark .ack-check-row{ background:#16213a; border-color:#243047; }
    .ack-check-row.is-on{ background:rgba(5,150,105,.08); border-color:rgba(5,150,105,.35); }
    .dark .ack-check-row.is-on{ background:rgba(5,150,105,.18); }
    .ack-check-row .trc-label{ font-size:12px; font-weight:700; color:#334155; }
    .dark .ack-check-row .trc-label{ color:#e2e8f0; }
    .ack-check-row .trc-toggle{ width:38px; height:22px; border-radius:999px; background:#cbd5e1; position:relative; flex-shrink:0; transition:background .15s ease; }
    .ack-check-row .trc-toggle::after{ content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .15s ease; }
    .ack-check-row.is-on .trc-toggle{ background:#059669; }
    .ack-check-row.is-on .trc-toggle::after{ transform:translateX(16px); }
    .ack-list-heading, .ack-form-heading{ font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#64748b; }
    .dark .ack-list-heading, .dark .ack-form-heading{ color:#94a3b8; }
    .ack-toggle-btn{ display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800; text-transform:uppercase;
      padding:8px 14px; border-radius:12px; background:#1e293b; color:#fff; }
    .dark .ack-toggle-btn{ background:#334155; }
    .ack-toggle-btn.is-open i{ transform:rotate(180deg); }
    `;
    const style = document.createElement("style");
    style.id = "ack-style";
    style.textContent = css;
    document.head.appendChild(style);
}

/* ------------------------------------------------------------------ *
 * 4. Checklist item (sama persis dgn trainer.js supaya datanya konsisten)
 * ------------------------------------------------------------------ */
const ACK_BERKAS_ITEMS = [
    { key: "ktp", label: "Fotokopi KTP" },
    { key: "kk", label: "Fotokopi KK" },
    { key: "simc", label: "Fotokopi SIM C Aktif" },
    { key: "skck", label: "SKCK (Jika Ada)" },
    { key: "bpjs", label: "BPJS Kesehatan" },
    { key: "foto", label: "Pas Foto 3x4" }
];
const ACK_PERLENGKAPAN_ITEMS = [
    { key: "helm1", label: "Helm (1)" },
    { key: "helm2", label: "Helm (2) — opsional" },
    { key: "jashujan1", label: "Jas Hujan (1)" },
    { key: "jashujan2", label: "Jas Hujan (2) — opsional" }
];
const ACK_VERIF_ITEMS = [
    { key: "interview", label: "Sudah Interview" },
    { key: "lulusSeleksi", label: "Lulus Seleksi" },
    { key: "training", label: "Sudah Training" },
    { key: "akunAktif", label: "Akun Aktif" },
    { key: "setujuSop", label: "Sudah Menyetujui SOP" },
    { key: "bayarDeposit", label: "Sudah Bayar Deposit & Administrasi" },
    { key: "terimaPerlengkapan", label: "Sudah Terima Perlengkapan" },
    { key: "aktifKurir", label: "Aktif Menjadi Kurir" }
];

/* ------------------------------------------------------------------ *
 * 5. Markup screens
 * ------------------------------------------------------------------ */
function ackScreensHtml() {
    return `
    <!-- ================= DAFTAR CALON KURIR ================= -->
    <div id="screen-admin-calon-kurir" class="screen">
        <div class="pm-body">
            <div class="pm-stats" style="margin-bottom:12px;">
                <div class="pm-stat-tile"><p class="l">Total</p><p class="n" id="ack-stat-total">0</p></div>
                <div class="pm-stat-tile"><p class="l">Menunggu</p><p class="n" id="ack-stat-menunggu">0</p></div>
                <div class="pm-stat-tile"><p class="l">Disetujui</p><p class="n" id="ack-stat-disetujui">0</p></div>
            </div>
            <div class="pm-card space-y-2">
                <input id="ack-list-search" oninput="window.__ack.renderList()" class="pm-input" placeholder="Cari nama / NIK / no HP...">
                <div>
                    <label class="pm-label">Filter Bulan Training</label>
                    <div class="flex gap-2">
                        <input id="ack-list-bulan" type="month" oninput="window.__ack.renderList()" class="pm-input">
                        <button onclick="document.getElementById('ack-list-bulan').value='';window.__ack.renderList()" class="ack-toggle-btn" style="flex:0 0 auto;">Semua</button>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between gap-2 mt-3">
                <h4 class="ack-list-heading">Daftar Calon Kurir</h4>
                <button onclick="window.__ack.toggleListOpen()" class="ack-toggle-btn">
                    <span id="ack-toggle-list-text">Buka</span>
                    <i data-lucide="chevron-down" id="ack-toggle-list-icon" class="w-3.5 h-3.5 transition-transform"></i>
                </button>
            </div>
            <div id="ack-list-wrap" class="hidden">
                <div id="ack-list-container" class="mt-3"></div>
            </div>
        </div>
    </div>

    <!-- ================= FORM EDIT CALON KURIR ================= -->
    <div id="screen-admin-calon-kurir-form" class="screen">
        <div class="pm-body" style="padding-bottom:110px">
            <div class="flex items-center justify-between mb-2">
                <h2 class="ack-form-heading">Kelola Data Calon Kurir</h2>
                <button onclick="window.__ack.go('screen-admin-calon-kurir')" class="ack-toggle-btn">Batal</button>
            </div>
            <input type="hidden" id="ack-f-id">

            <div class="pm-section-title"><i data-lucide="id-card" class="w-3.5 h-3.5"></i>Data Diri</div>
            <div class="pm-card space-y-3">
                <div><label class="pm-label">Nama Lengkap</label><input id="ack-f-nama" class="pm-input" placeholder="Nama lengkap sesuai KTP"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Jenis Kelamin</label>
                        <select id="ack-f-gender" class="pm-select">
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                    </div>
                    <div><label class="pm-label">NIK KTP</label><input id="ack-f-nik" inputmode="numeric" maxlength="16" class="pm-input" placeholder="16 digit NIK"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Tempat Lahir</label><input id="ack-f-tempat-lahir" class="pm-input" placeholder="Kota lahir"></div>
                    <div><label class="pm-label">Tanggal Lahir</label><input id="ack-f-tanggal-lahir" type="date" class="pm-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">No. ID Card</label><input id="ack-f-id-card" class="pm-input" placeholder="Nomor ID Card (boleh kosong)"></div>
                    <div><label class="pm-label">Tanggal Training</label><input id="ack-f-tgl-training" type="date" class="pm-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">No HP Aktif/WA</label><input id="ack-f-hp-aktif" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                    <div><label class="pm-label">No HP Kurir</label><input id="ack-f-hp-kurir" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                </div>
                <div><label class="pm-label">Alamat Domisili</label><textarea id="ack-f-alamat" rows="2" class="pm-textarea" placeholder="Alamat domisili lengkap"></textarea></div>
                <div><label class="pm-label">Pekerjaan Lainnya</label><input id="ack-f-pekerjaan-lain" class="pm-input" placeholder="Kalau ada pekerjaan sampingan"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Nama Bank / E-Wallet</label><input id="ack-f-bank-nama" class="pm-input" placeholder="Contoh: BCA / DANA"></div>
                    <div><label class="pm-label">No. Rekening / E-Wallet</label><input id="ack-f-bank-nomor" inputmode="numeric" class="pm-input" placeholder="Nomor rekening/ewallet"></div>
                </div>
                <div><label class="pm-label">Status Pernikahan</label>
                    <select id="ack-f-status-nikah" class="pm-select">
                        <option value="Belum Menikah">Belum Menikah</option>
                        <option value="Menikah">Menikah</option>
                        <option value="Cerai">Cerai</option>
                    </select>
                </div>
                <div><label class="pm-label">No. BPJS Kesehatan</label><input id="ack-f-bpjs" inputmode="numeric" class="pm-input" placeholder="Nomor BPJS Kesehatan"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Kelas BPJS</label>
                        <select id="ack-f-bpjs-kelas" class="pm-select">
                            <option value="">-- Pilih Kelas --</option>
                            <option value="Kelas I">Kelas I</option>
                            <option value="Kelas II">Kelas II</option>
                            <option value="Kelas III">Kelas III</option>
                        </select>
                    </div>
                    <div><label class="pm-label">Biaya BPJS / Bulan</label><input id="ack-f-bpjs-biaya" inputmode="numeric" class="pm-input" placeholder="Contoh: 150000"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Nama Kontak Darurat</label><input id="ack-f-darurat-nama" class="pm-input" placeholder="Nama kontak darurat"></div>
                    <div><label class="pm-label">Hubungan Keluarga</label><input id="ack-f-darurat-hubungan" class="pm-input" placeholder="Contoh: Orang Tua / Kakak"></div>
                </div>
                <div><label class="pm-label">No HP Kontak Darurat</label><input id="ack-f-darurat-hp" inputmode="numeric" class="pm-input" placeholder="08xxxxxxxxxx"></div>
                <div><label class="pm-label">Catatan Khusus</label><textarea id="ack-f-catatan" rows="2" class="pm-textarea" placeholder="Catatan tambahan (opsional)"></textarea></div>
            </div>

            <div class="pm-section-title"><i data-lucide="bike" class="w-3.5 h-3.5"></i>Data Kendaraan</div>
            <div class="pm-card space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Jenis Kendaraan</label>
                        <select id="ack-f-kend-jenis" class="pm-select">
                            <option value="Motor">Motor</option>
                            <option value="Mobil">Mobil</option>
                            <option value="Sepeda">Sepeda</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div><label class="pm-label">Merek</label><input id="ack-f-kend-merek" class="pm-input" placeholder="Contoh: Honda"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="pm-label">Tipe</label><input id="ack-f-kend-tipe" class="pm-input" placeholder="Contoh: Beat"></div>
                    <div><label class="pm-label">Tahun</label><input id="ack-f-kend-tahun" inputmode="numeric" maxlength="4" class="pm-input" placeholder="Contoh: 2021"></div>
                </div>
                <div><label class="pm-label">Warna</label><input id="ack-f-kend-warna" class="pm-input" placeholder="Warna kendaraan"></div>
                <div><label class="pm-label">Nomor Polisi/Plat (opsional)</label><input id="ack-f-kend-plat" class="pm-input" placeholder="Contoh: E 1234 ABC"></div>
                <div><label class="pm-label">Nomor STNK (opsional)</label><input id="ack-f-kend-stnk" class="pm-input" placeholder="Nomor STNK"></div>
                <div><label class="pm-label">Masa Berlaku STNK (opsional)</label><input id="ack-f-kend-stnk-berlaku" type="date" class="pm-input"></div>
            </div>

            <div class="pm-section-title"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>Checklist Kelengkapan Berkas</div>
            <div class="pm-card space-y-2" id="ack-f-berkas-wrap"></div>

            <div class="pm-section-title"><i data-lucide="package-check" class="w-3.5 h-3.5"></i>Checklist Perlengkapan Kurir</div>
            <div class="pm-card space-y-2" id="ack-f-perlengkapan-wrap"></div>

            <div class="pm-section-title"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Status Verifikasi</div>
            <div class="pm-card space-y-2" id="ack-f-verifikasi-wrap"></div>

            <button class="pm-btn-primary flex items-center justify-center gap-2 mt-2" onclick="window.__ack.saveCandidate()">
                <i data-lucide="save" class="w-4 h-4"></i> Simpan Perubahan
            </button>
        </div>
    </div>

    <div id="ack-modal-slot"></div>
    `;
}

/* ------------------------------------------------------------------ *
 * 6. Injeksi DOM
 * ------------------------------------------------------------------ */
function ackInjectScreens() {
    if (document.getElementById("ack-root")) return;
    const mount = document.getElementById("main-layout") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "ack-root";
    wrap.innerHTML = ackScreensHtml();
    mount.appendChild(wrap);
    ackRenderChecklistGroups();

    const bulanIniEl = document.getElementById("ack-list-bulan");
    if (bulanIniEl) bulanIniEl.value = ackCurrentMonthISO();

    if (window.lucide) window.lucide.createIcons();
}

function ackChecklistRowHtml(prefix, key, label, checked) {
    return `<div class="ack-check-row ${checked ? "is-on" : ""}" data-key="${key}" onclick="window.__ack.toggleCheck('${prefix}','${key}', this)">
        <span class="trc-label">${ackEsc(label)}</span>
        <span class="trc-toggle"></span>
    </div>`;
}

let ackFormState = { berkas: {}, perlengkapan: {}, verifikasi: {} };

function ackRenderChecklistGroups() {
    const berkasWrap = document.getElementById("ack-f-berkas-wrap");
    if (berkasWrap) berkasWrap.innerHTML = ACK_BERKAS_ITEMS.map(i => ackChecklistRowHtml("berkas", i.key, i.label, !!ackFormState.berkas[i.key])).join("");

    const perlengkapanWrap = document.getElementById("ack-f-perlengkapan-wrap");
    if (perlengkapanWrap) perlengkapanWrap.innerHTML = ACK_PERLENGKAPAN_ITEMS.map(i => ackChecklistRowHtml("perlengkapan", i.key, i.label, !!ackFormState.perlengkapan[i.key])).join("");

    const verifWrap = document.getElementById("ack-f-verifikasi-wrap");
    if (verifWrap) verifWrap.innerHTML = ACK_VERIF_ITEMS.map(i => ackChecklistRowHtml("verifikasi", i.key, i.label, !!ackFormState.verifikasi[i.key])).join("");
}

/* ------------------------------------------------------------------ *
 * 7. Navigasi
 * ------------------------------------------------------------------ */
const ACK_SCREENS = ["screen-admin-calon-kurir", "screen-admin-calon-kurir-form"];

function ackAfterNavigate(screenId) {
    if (!ACK_SCREENS.includes(screenId)) { ackCurrentScreen = null; return; }
    ackCurrentScreen = screenId;
    ackRenderActiveScreen();
}

function ackPatchNavigation() {
    if (window.__ackNavPatched) return;
    window.__ackNavPatched = true;
    const origNavigateTo = window.navigateTo;
    window.navigateTo = function (screenId) {
        if (typeof origNavigateTo === "function") origNavigateTo(screenId);
        ackAfterNavigate(screenId);
    };
}

function ackRenderActiveScreen() {
    if (!ackCurrentScreen) return;
    if (ackCurrentScreen === "screen-admin-calon-kurir") { ackRenderList(); ackApplyListOpenState(); }
}

/* ------------------------------------------------------------------ *
 * 8. Badge menu (jumlah pengajuan menunggu)
 * ------------------------------------------------------------------ */
function ackUpdateMenuBadge() {
    const jumlah = Object.values(cloudCalonKurir || {}).filter(c => c && c.statusPengajuan === "diajukan").length;
    const badge = document.getElementById("badge-calon-kurir-menu");
    if (!badge) return;
    if (jumlah > 0) {
        badge.textContent = jumlah > 9 ? "9+" : String(jumlah);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

/* ------------------------------------------------------------------ *
 * 9. Daftar Calon Kurir
 * ------------------------------------------------------------------ */
function ackCandidateCardHtml(id, c, index) {
    const last = ackLastPenilaian(id);
    const hasilChip = last ? (() => { const h = ackHitungHasil(last.total || 0); return `<span class="tr-hasil-badge ${h.cls}" style="font-size:10px;padding:3px 9px;">${h.emoji} ${last.total || 0}/100</span>`; })() : `<span class="pm-chip" style="background:#f1f5f9;color:#64748b">Belum dinilai</span>`;

    return `<div class="pm-card">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
                <p class="font-bold text-[13px] truncate"><span class="text-orange-600 mr-1">#${index}</span>${ackEsc(c.nama || "-")}</p>
                <p class="text-[10.5px] text-slate-400 truncate">NIK: ${ackEsc(c.nik || "-")}</p>
                <p class="text-[10px] text-slate-400 mt-1"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${ackEsc(c.hpAktif || "-")}</p>
            </div>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2">${hasilChip}${ackPengajuanBadgeHtml(c)}</div>
        <div class="flex gap-2 mt-3">
            <button onclick="window.__ack.showDetail('${id}')" class="pm-btn-outline flex-1">Detail</button>
            <button onclick="window.__ack.openForm('${id}')" class="pm-btn-outline flex-1" style="border-color:#c2410c;color:#c2410c">Kelola Data</button>
            <button onclick="window.__ack.deleteCandidate('${id}')" class="pm-btn-outline" style="border-color:#e11d48;color:#e11d48;flex:0 0 auto;padding-left:12px;padding-right:12px;">Hapus</button>
        </div>
    </div>`;
}

function ackToggleListOpen() {
    ackListOpen = !ackListOpen;
    ackApplyListOpenState();
}
function ackApplyListOpenState() {
    const wrap = document.getElementById("ack-list-wrap");
    const text = document.getElementById("ack-toggle-list-text");
    const btn = text ? text.closest(".ack-toggle-btn") : null;
    if (wrap) wrap.classList.toggle("hidden", !ackListOpen);
    if (text) text.textContent = ackListOpen ? "Tutup" : "Buka";
    if (btn) btn.classList.toggle("is-open", ackListOpen);
}

function ackRenderList() {
    const container = document.getElementById("ack-list-container");
    if (!container) return;
    const search = (document.getElementById("ack-list-search")?.value || "").trim().toLowerCase();
    const bulan = document.getElementById("ack-list-bulan")?.value || ""; // format YYYY-MM

    const all = Object.values(cloudCalonKurir || {});
    const elTotal = document.getElementById("ack-stat-total");
    const elMenunggu = document.getElementById("ack-stat-menunggu");
    const elDisetujui = document.getElementById("ack-stat-disetujui");
    if (elTotal) elTotal.innerText = all.length;
    if (elMenunggu) elMenunggu.innerText = all.filter(c => c && c.statusPengajuan === "diajukan").length;
    if (elDisetujui) elDisetujui.innerText = all.filter(c => c && c.statusPengajuan === "disetujui").length;

    const entries = Object.entries(cloudCalonKurir || {}).filter(([, c]) => {
        if (!c) return false;
        if (bulan && !(c.tglTraining || "").startsWith(bulan)) return false;
        if (!search) return true;
        return (c.nama || "").toLowerCase().includes(search) || (c.nik || "").toLowerCase().includes(search) || (c.hpAktif || "").toLowerCase().includes(search);
    }).sort((a, b) => {
        // Prioritaskan yang statusnya "diajukan" (perlu tindakan admin) di atas
        const rank = (s) => s === "diajukan" ? 0 : (s === "belum" || !s ? 1 : 2);
        const ra = rank(a[1].statusPengajuan), rb = rank(b[1].statusPengajuan);
        if (ra !== rb) return ra - rb;
        return (a[1].nama || "").localeCompare(b[1].nama || "");
    });

    if (!entries.length) { container.innerHTML = `<div class="pm-empty">Belum ada data calon kurir dari Trainer.</div>`; return; }
    container.innerHTML = entries.map(([id, c], i) => ackCandidateCardHtml(id, c, i + 1)).join("");
    if (window.lucide) window.lucide.createIcons();
}

/* ------------------------------------------------------------------ *
 * 10. Detail (modal) + aksi Setujui/Tolak
 * ------------------------------------------------------------------ */
function ackShowDetail(id) {
    const c = cloudCalonKurir[id];
    if (!c) return ackToast("Data tidak ditemukan.");

    const berkasHtml = ACK_BERKAS_ITEMS.map(i => `<span class="pm-chip ${c.berkas && c.berkas[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${ackEsc(i.label)}</span>`).join(" ");
    const perlengkapanHtml = ACK_PERLENGKAPAN_ITEMS.map(i => `<span class="pm-chip ${c.perlengkapan && c.perlengkapan[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${ackEsc(i.label)}</span>`).join(" ");
    const verifHtml = ACK_VERIF_ITEMS.map(i => `<span class="pm-chip ${c.verifikasi && c.verifikasi[i.key] ? "pm-chip-approved" : "pm-chip-rejected"}">${ackEsc(i.label)}</span>`).join(" ");

    const riwayat = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === id).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    const last = riwayat.length ? riwayat[0][1] : null;
    const lastHasil = last ? ackHitungHasil(last.total || 0) : null;

    let aksiHtml = "";
    if (c.statusPengajuan === "diajukan") {
        if (lastHasil && lastHasil.label === "LULUS") {
            aksiHtml = `<div class="flex gap-2 mt-3">
                <button onclick="document.getElementById('ack-modal-slot').innerHTML='';window.__ack.tolakPengajuan('${id}')" class="pm-btn-outline flex-1" style="border-color:#e11d48;color:#e11d48;">Tolak</button>
                <button onclick="window.__ack.openApproveModal('${id}')" class="pm-btn-primary flex-1" style="background:#059669;">Setujui &amp; Buat Akun Kurir</button>
            </div>`;
        } else {
            aksiHtml = `<div class="pm-card mt-3" style="background:#fef3c7;border-color:#fde68a;">
                <p class="text-[11px] font-bold text-amber-700">Hasil penilaian belum LULUS (${lastHasil ? lastHasil.label : "belum dinilai"}), belum bisa dibuatkan akun kurir.</p>
            </div>
            <button onclick="document.getElementById('ack-modal-slot').innerHTML='';window.__ack.tolakPengajuan('${id}')" class="pm-btn-outline flex-1 mt-2" style="border-color:#e11d48;color:#e11d48;width:100%;">Tolak Pengajuan</button>`;
        }
    } else if (c.statusPengajuan === "disetujui") {
        aksiHtml = `<div class="pm-card mt-3" style="background:#d1fae5;border-color:#a7f3d0;">
            <p class="text-[11px] font-bold text-emerald-700">Sudah disetujui &amp; masuk Data Akun Kurir.</p>
        </div>`;
    }

    const slot = document.getElementById("ack-modal-slot");
    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-sm">${ackEsc(c.nama || "-")}</h3>
                <button onclick="document.getElementById('ack-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <div class="mb-2">${ackPengajuanBadgeHtml(c)}</div>
            <div class="space-y-2 text-[12px]">
                <p><b>Jenis Kelamin:</b> ${ackEsc(c.gender || "-")}</p>
                <p><b>NIK:</b> ${ackEsc(c.nik || "-")}</p>
                <p><b>TTL:</b> ${ackEsc(c.tempatLahir || "-")}, ${ackFormatTanggal(c.tanggalLahir)}</p>
                <p><b>No. ID Card:</b> ${ackEsc(c.idCard || "-")}</p>
                <p><b>Tanggal Training:</b> ${ackFormatTanggal(c.tglTraining)}</p>
                <p><b>HP Aktif/WA:</b> ${ackEsc(c.hpAktif || "-")} &middot; <b>HP Kurir:</b> ${ackEsc(c.hpKurir || "-")}</p>
                <p><b>Alamat:</b> ${ackEsc(c.alamat || "-")}</p>
                <p><b>Pekerjaan Lain:</b> ${ackEsc(c.pekerjaanLain || "-")}</p>
                <p><b>Rekening/E-Wallet:</b> ${ackEsc(c.bankNama || "-")} — ${ackEsc(c.bankNomor || "-")}</p>
                <p><b>Status Pernikahan:</b> ${ackEsc(c.statusNikah || "-")}</p>
                <p><b>BPJS:</b> ${ackEsc(c.bpjs || "-")} (${ackEsc(c.bpjsKelas || "-")}, Rp ${(parseInt(c.bpjsBiaya) || 0).toLocaleString("id-ID")}/bulan)</p>
                <p><b>Kontak Darurat:</b> ${ackEsc(c.daruratNama || "-")} (${ackEsc(c.daruratHubungan || "-")}) — ${ackEsc(c.daruratHp || "-")}</p>
                ${c.catatan ? `<p><b>Catatan:</b> ${ackEsc(c.catatan)}</p>` : ""}
            </div>
            <div class="pm-section-title mt-3"><i data-lucide="bike" class="w-3.5 h-3.5"></i>Kendaraan</div>
            <div class="space-y-1 text-[12px]">
                <p>${ackEsc(c.kendJenis || "-")} — ${ackEsc(c.kendMerek || "-")} ${ackEsc(c.kendTipe || "-")} (${ackEsc(c.kendTahun || "-")}) — ${ackEsc(c.kendWarna || "-")}</p>
                <p>Plat: ${ackEsc(c.kendPlat || "-")} &middot; STNK: ${ackEsc(c.kendStnk || "-")} &middot; Berlaku s/d: ${ackFormatTanggal(c.kendStnkBerlaku)}</p>
            </div>
            <div class="pm-section-title mt-3"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>Kelengkapan Berkas</div>
            <div class="flex flex-wrap gap-1.5">${berkasHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="package-check" class="w-3.5 h-3.5"></i>Perlengkapan Kurir</div>
            <div class="flex flex-wrap gap-1.5">${perlengkapanHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i>Status Verifikasi</div>
            <div class="flex flex-wrap gap-1.5">${verifHtml}</div>
            <div class="pm-section-title mt-3"><i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>Riwayat Penilaian</div>
            ${riwayat.length ? riwayat.map(([, p]) => {
                const h = ackHitungHasil(p.total || 0);
                return `<div class="pm-card flex items-center justify-between">
                    <div class="min-w-0"><p class="font-bold text-[12px]">${ackFormatTanggal(p.tanggalSeleksi)}</p><p class="text-[10px] text-slate-400">Trainer: ${ackEsc(p.trainerNama || "-")}</p></div>
                    <span class="tr-hasil-badge ${h.cls}" style="font-size:11px;padding:4px 10px;">${h.emoji} ${p.total || 0}/100</span>
                </div>`;
            }).join("") : `<div class="pm-empty">Belum ada penilaian.</div>`}
            <div class="flex gap-2 mt-3">
                <button onclick="document.getElementById('ack-modal-slot').innerHTML='';window.__ack.openForm('${id}')" class="pm-btn-outline flex-1">Edit Data</button>
                <button onclick="document.getElementById('ack-modal-slot').innerHTML='';window.__ack.deleteCandidate('${id}')" class="pm-btn-outline flex-1" style="border-color:#e11d48;color:#e11d48;">Hapus</button>
            </div>
            ${aksiHtml}
        </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

async function ackDeleteCandidate(id) {
    const c = cloudCalonKurir[id];
    if (!c) return;
    if (!(await ackConfirm(`Hapus data calon kurir "${c.nama || "-"}"? Seluruh riwayat penilaiannya juga akan dihapus. Tindakan ini tidak menghapus akun kurir yang mungkin sudah dibuat sebelumnya.`))) return;
    try {
        await remove(ref(db, `calon_kurir/${id}`));
        const toDelete = Object.entries(cloudPenilaian || {}).filter(([, p]) => p && p.calonKurirId === id).map(([pid]) => pid);
        toDelete.forEach(pid => remove(ref(db, `penilaian_calon_kurir/${pid}`)));
        ackToast("Data calon kurir dihapus.");
    } catch (err) { ackToast("Gagal menghapus: " + err.message); }
}

async function ackTolakPengajuan(id) {
    const c = cloudCalonKurir[id];
    if (!c) return;
    if (!(await ackConfirm(`Tolak pengajuan "${c.nama || "-"}"? Trainer bisa mengajukan ulang setelah ini.`))) return;
    try {
        await update(ref(db, `calon_kurir/${id}`), {
            statusPengajuan: "ditolak",
            tolakAt: Date.now()
        });
        ackToast("Pengajuan ditolak.");
    } catch (err) { ackToast("Gagal menolak pengajuan: " + err.message); }
}

/* ------------------------------------------------------------------ *
 * 11. Form kelola/edit data calon kurir
 * ------------------------------------------------------------------ */
function ackToggleCheck(prefix, key, el) {
    if (!ackFormState[prefix]) ackFormState[prefix] = {};
    ackFormState[prefix][key] = !ackFormState[prefix][key];
    if (el) el.classList.toggle("is-on", !!ackFormState[prefix][key]);
}

function ackOpenForm(id) {
    const c = id ? cloudCalonKurir[id] : null;
    if (!c) return ackToast("Data calon kurir tidak ditemukan.");

    document.getElementById("ack-f-id").value = id;

    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ""; };
    setVal("ack-f-nama", c.nama);
    setVal("ack-f-gender", c.gender || "Laki-laki");
    setVal("ack-f-nik", c.nik);
    setVal("ack-f-tempat-lahir", c.tempatLahir);
    setVal("ack-f-tanggal-lahir", c.tanggalLahir);
    setVal("ack-f-id-card", c.idCard);
    setVal("ack-f-tgl-training", c.tglTraining);
    setVal("ack-f-hp-aktif", c.hpAktif);
    setVal("ack-f-hp-kurir", c.hpKurir);
    setVal("ack-f-alamat", c.alamat);
    setVal("ack-f-pekerjaan-lain", c.pekerjaanLain);
    setVal("ack-f-bank-nama", c.bankNama);
    setVal("ack-f-bank-nomor", c.bankNomor);
    setVal("ack-f-status-nikah", c.statusNikah || "Belum Menikah");
    setVal("ack-f-bpjs", c.bpjs);
    setVal("ack-f-bpjs-kelas", c.bpjsKelas);
    setVal("ack-f-bpjs-biaya", c.bpjsBiaya);
    setVal("ack-f-darurat-nama", c.daruratNama);
    setVal("ack-f-darurat-hubungan", c.daruratHubungan);
    setVal("ack-f-darurat-hp", c.daruratHp);
    setVal("ack-f-catatan", c.catatan);

    setVal("ack-f-kend-jenis", c.kendJenis || "Motor");
    setVal("ack-f-kend-merek", c.kendMerek);
    setVal("ack-f-kend-tipe", c.kendTipe);
    setVal("ack-f-kend-tahun", c.kendTahun);
    setVal("ack-f-kend-warna", c.kendWarna);
    setVal("ack-f-kend-plat", c.kendPlat);
    setVal("ack-f-kend-stnk", c.kendStnk);
    setVal("ack-f-kend-stnk-berlaku", c.kendStnkBerlaku);

    ackFormState = {
        berkas: { ...(c.berkas || {}) },
        perlengkapan: { ...(c.perlengkapan || {}) },
        verifikasi: { ...(c.verifikasi || {}) }
    };
    ackRenderChecklistGroups();
    if (window.lucide) window.lucide.createIcons();

    window.__ack.go("screen-admin-calon-kurir-form");
}

async function ackSaveCandidate() {
    const id = document.getElementById("ack-f-id").value;
    if (!id) return ackToast("Data calon kurir tidak ditemukan.");
    const nama = document.getElementById("ack-f-nama").value.trim();
    if (!nama) return ackToast("Nama lengkap wajib diisi.", "warning");

    const val = (elId) => document.getElementById(elId)?.value.trim() || "";

    const payload = {
        nama,
        gender: val("ack-f-gender"),
        nik: val("ack-f-nik"),
        tempatLahir: val("ack-f-tempat-lahir"),
        tanggalLahir: val("ack-f-tanggal-lahir"),
        idCard: val("ack-f-id-card"),
        tglTraining: val("ack-f-tgl-training"),
        hpAktif: val("ack-f-hp-aktif"),
        hpKurir: val("ack-f-hp-kurir"),
        alamat: val("ack-f-alamat"),
        pekerjaanLain: val("ack-f-pekerjaan-lain"),
        bankNama: val("ack-f-bank-nama"),
        bankNomor: val("ack-f-bank-nomor"),
        statusNikah: val("ack-f-status-nikah"),
        bpjs: val("ack-f-bpjs"),
        bpjsKelas: val("ack-f-bpjs-kelas"),
        bpjsBiaya: val("ack-f-bpjs-biaya"),
        daruratNama: val("ack-f-darurat-nama"),
        daruratHubungan: val("ack-f-darurat-hubungan"),
        daruratHp: val("ack-f-darurat-hp"),
        catatan: val("ack-f-catatan"),

        kendJenis: val("ack-f-kend-jenis"),
        kendMerek: val("ack-f-kend-merek"),
        kendTipe: val("ack-f-kend-tipe"),
        kendTahun: val("ack-f-kend-tahun"),
        kendWarna: val("ack-f-kend-warna"),
        kendPlat: val("ack-f-kend-plat"),
        kendStnk: val("ack-f-kend-stnk"),
        kendStnkBerlaku: val("ack-f-kend-stnk-berlaku"),

        berkas: { ...ackFormState.berkas },
        perlengkapan: { ...ackFormState.perlengkapan },
        verifikasi: { ...ackFormState.verifikasi },

        updatedAt: Date.now()
    };

    try {
        await update(ref(db, `calon_kurir/${id}`), payload);
        ackToast("Data calon kurir berhasil diperbarui.");
        window.__ack.go("screen-admin-calon-kurir");
    } catch (err) {
        ackToast("Gagal menyimpan: " + err.message);
    }
}

/* ------------------------------------------------------------------ *
 * 12. Modal "Setujui & Buat Akun Kurir"
 * ------------------------------------------------------------------ */
function ackPopulateLeaderSelect() {
    const dropdown = document.getElementById("ack-ap-leader");
    if (!dropdown) return;
    const options = ['<option value="">-- Pilih Leader --</option>'];
    Object.values(cloudLeaderListAck || {}).forEach(item => {
        if (item && item.nama) options.push(`<option value="${ackEsc(item.nama)}">${ackEsc(item.nama)}</option>`);
    });
    dropdown.innerHTML = options.join("");
}

function ackOpenApproveModal(candidateId) {
    const c = cloudCalonKurir[candidateId];
    if (!c) return ackToast("Data calon kurir tidak ditemukan.");

    const suggestUsername = (c.nama || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");

    const slot = document.getElementById("ack-modal-slot");
    slot.innerHTML = `
    <div class="pm-modal-overlay" onclick="if(event.target===this) this.remove()">
        <div class="pm-modal-sheet">
            <div class="flex items-center justify-between mb-3">
                <div><h3 class="font-bold text-sm">Setujui &amp; Buat Akun Kurir</h3><p class="text-[10px] text-slate-400">${ackEsc(c.nama || "-")}</p></div>
                <button onclick="document.getElementById('ack-modal-slot').innerHTML=''" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <input type="hidden" id="ack-ap-candidate-id" value="${candidateId}">
            <div class="pm-card space-y-3">
                <div><label class="pm-label">Username</label><input id="ack-ap-username" class="pm-input" placeholder="username.kurir" value="${ackEsc(suggestUsername)}"></div>
                <div><label class="pm-label">Password</label><input id="ack-ap-password" class="pm-input" placeholder="Sandi login"></div>
                <div><label class="pm-label">Tanggal Bergabung</label><input id="ack-ap-tgl-gabung" type="date" class="pm-input" value="${ackTodayISO()}"></div>
                <div><label class="pm-label">Leader</label>
                    <select id="ack-ap-leader" class="pm-select"><option value="">-- Pilih Leader --</option></select>
                </div>
                <div><label class="pm-label">Status Akun</label>
                    <select id="ack-ap-status" class="pm-select">
                        <option value="aktif">AKTIF</option>
                        <option value="nonaktif">BLOKIR</option>
                    </select>
                </div>
            </div>
            <p class="text-[10.5px] text-slate-400 mt-2">Setelah disimpan, akun kurir baru langsung dibuat dan Profil Data Diri (Nama, NIK, TTL, No. ID Card, HP, alamat, pekerjaan lain, BPJS, kontak darurat) otomatis terisi dari data calon kurir ini.</p>
            <button onclick="window.__ack.submitApprove()" class="pm-btn-primary flex items-center justify-center gap-2 mt-3" style="background:#059669;">
                <i data-lucide="check-check" class="w-4 h-4"></i> Setujui &amp; Simpan Akun
            </button>
        </div>
    </div>`;
    ackPopulateLeaderSelect();
    if (window.lucide) window.lucide.createIcons();
}

async function ackSubmitApprove() {
    const candidateId = document.getElementById("ack-ap-candidate-id")?.value;
    const c = candidateId ? cloudCalonKurir[candidateId] : null;
    if (!c) return ackToast("Data calon kurir tidak ditemukan.");

    const username = (document.getElementById("ack-ap-username")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("ack-ap-password")?.value || "").trim();
    const tglGabung = document.getElementById("ack-ap-tgl-gabung")?.value || "";
    const leader = (document.getElementById("ack-ap-leader")?.value || "").trim();
    const status = document.getElementById("ack-ap-status")?.value || "aktif";

    if (!username || !password || !tglGabung) {
        return ackToast("Mohon lengkapi username, password, dan tanggal bergabung.", "warning");
    }

    const isDuplicated = Object.values(cloudUsersList || {}).some(u => (u && u.username || "").trim().toLowerCase() === username);
    if (isDuplicated) {
        return ackToast(`Username "${username}" sudah terdaftar! Gunakan username yang berbeda.`, "warning");
    }

    const session = ackGetSession();

    const userData = {
        nama: c.nama || "",
        leader,
        username,
        password,
        tglGabung,
        status,
        role: "kurir",
        ongkirLocked: true,
        ongkirPassword: ""
    };

    try {
        const newUserRef = push(ref(db, "users"));
        await set(newUserRef, userData);
        const newUserId = newUserRef.key;

        const kontakDaruratNama = c.daruratHubungan
            ? `${c.daruratNama || "-"} (${c.daruratHubungan})`
            : (c.daruratNama || "");

        const profilPayload = {
            namaLengkap: c.nama || "",
            nik: c.nik || "",
            tempatLahir: c.tempatLahir || "",
            tanggalLahir: c.tanggalLahir || "",
            noIdCard: c.idCard || "",
            noHpWa: c.hpAktif || "",
            noHpKurir: c.hpKurir || "",
            alamatDomisili: c.alamat || "",
            pekerjaanLain: c.pekerjaanLain || "",
            noBpjs: c.bpjs || "",
            kelasBpjs: c.bpjsKelas || "",
            biayaBpjs: parseInt(c.bpjsBiaya) || 0,
            kontakDaruratNama,
            kontakDaruratNoHp: c.daruratHp || "",
            updatedAt: new Date().toISOString()
        };
        await set(ref(db, `profil_kurir/${newUserId}`), profilPayload);

        await update(ref(db, `calon_kurir/${candidateId}`), {
            statusPengajuan: "disetujui",
            approvedAt: Date.now(),
            approvedBy: session?.nama || session?.username || "-",
            approvedUserId: newUserId
        });

        ackToast(`Akun kurir "${c.nama || "-"}" berhasil dibuat & profil data diri otomatis terisi.`);
        document.getElementById("ack-modal-slot").innerHTML = "";
        ackRenderList();
    } catch (err) {
        ackToast("Gagal menyetujui & membuat akun: " + err.message);
    }
}

/* ------------------------------------------------------------------ *
 * 13. Public API + boot
 * ------------------------------------------------------------------ */
window.__ack = {
    go(screenId) { if (typeof window.navigateTo === "function") window.navigateTo(screenId); },
    renderList: ackRenderList,
    toggleListOpen: ackToggleListOpen,
    openForm: ackOpenForm,
    saveCandidate: ackSaveCandidate,
    toggleCheck: ackToggleCheck,
    showDetail: ackShowDetail,
    deleteCandidate: ackDeleteCandidate,
    openApproveModal: ackOpenApproveModal,
    submitApprove: ackSubmitApprove,
    tolakPengajuan: ackTolakPengajuan
};

function ackBoot() {
    ackInjectStyle();
    ackInjectScreens();
    ackPatchNavigation();
    ackUpdateMenuBadge();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ackBoot);
} else {
    ackBoot();
}

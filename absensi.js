import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Pakai app Firebase yang sama dengan script.js kalau sudah diinisialisasi,
// supaya tidak terjadi error "app already exists".
const absensiApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(absensiApp);

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
let DATA_USERS = {};
let DATA_JADWAL = {};
let DATA_PENGAJUAN = {};
let DATA_ABSENSI = {};

let currentViewDate = new Date();
let adminTab = 'harian';
let kurirTab = 'jadwal';
let adminSelectMode = false;
let editingJadwalKey = null;
let editingAbsensiKey = null;

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ---------------------------------------------------------------------
// Helper kecil
// ---------------------------------------------------------------------
function notify(msg) { if (typeof window.toast === 'function') window.toast(msg); }

async function confirmAksi(msg, opts) {
    if (typeof window.showConfirm === 'function') return await window.showConfirm(msg, opts);
    return window.confirm(msg);
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function debounce(fn, wait = 180) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function getSession() {
    try { return JSON.parse(localStorage.getItem('sahabatku_session') || 'null'); } catch (e) { return null; }
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

const getTanggalItem = (j) => j.tanggalMulai || j.tanggal || '';
const getBulanAktif = () => `${currentViewDate.getFullYear()}-${String(currentViewDate.getMonth() + 1).padStart(2, '0')}`;

const jenisColor = (jenis) => {
    if (jenis === 'Off Reguler') return 'bg-blue-500';
    if (jenis === 'Tidak Ambil Off') return 'bg-slate-500';
    if (jenis === 'Izin') return 'bg-amber-500';
    if (jenis === 'Sakit') return 'bg-red-500';
    if (jenis === 'Tukar Off') return 'bg-violet-500';
    if (jenis === 'Pindah Off') return 'bg-emerald-500';
    return 'bg-slate-400';
};

const fmt = (tgl) => {
    if (!tgl) return '-';
    const [y, m, d] = tgl.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return `${NAMA_HARI[dt.getDay()]}, ${d} ${NAMA_BULAN[m - 1]} ${y}`;
};

function hitungDurasiKerja(masuk, pulang) {
    const normTime = (t) => String(t || '').trim().replace('.', ':').slice(0, 5);
    if (!masuk || !pulang) return '-';

    const a = normTime(masuk).split(':');
    const b = normTime(pulang).split(':');
    if (a.length < 2 || b.length < 2) return '-';

    const h1 = parseInt(a[0], 10), m1 = parseInt(a[1], 10);
    const h2 = parseInt(b[0], 10), m2 = parseInt(b[1], 10);
    if ([h1, m1, h2, m2].some(Number.isNaN)) return '-';

    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60;

    const jam = Math.floor(mins / 60);
    const menit = mins % 60;

    return `${jam} jam ${menit} menit`;
}

function formatJamKerjaText(masuk, pulang) {
    return hitungDurasiKerja(masuk, pulang);
}
function getKurirAktif() {
    return Object.entries(DATA_USERS)
        .filter(([_, u]) => u.role === 'kurir' && u.status === 'aktif')
        .map(([k, u]) => ({ id: k, nama: u.nama || u.username || k, leader: u.leader || '-' }));
}

function refreshIcons() { if (window.lucide) lucide.createIcons(); }

// ---------------------------------------------------------------------
// Isi dropdown-dropdown
// ---------------------------------------------------------------------
function fillKurirSelects() {
    const kurirList = getKurirAktif();
    const selectNama = document.getElementById('form-pengajuan-nama');
    const selectTukar = document.getElementById('form-pengajuan-kurir-tukar');
    const selectJadwal = document.getElementById('jadwal-nama');
    const selectAbsensi = document.getElementById('absensi-nama');

    const isiSelect = (el, placeholder) => {
        if (!el) return;
        const current = el.value;
        el.innerHTML = `<option value="">${placeholder}</option>`;
        kurirList.forEach((u) => {
            const opt = document.createElement('option');
            opt.value = u.nama;
            opt.textContent = `${u.nama} (${u.leader})`;
            el.appendChild(opt);
        });
        if (current && kurirList.some((u) => u.nama === current)) el.value = current;
    };

    isiSelect(selectNama, '-- Pilih Nama Anda --');
    isiSelect(selectTukar, '-- Pilih Kurir Tukar --');
    isiSelect(selectJadwal, '-- Pilih --');
    isiSelect(selectAbsensi, '-- Pilih --');
}

function fillTanggalAll(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '<option value="">-- Pilih tanggal --</option>';
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const total = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
        const t = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const o = document.createElement('option');
        o.value = t;
        o.textContent = fmt(t);
        el.appendChild(o);
    }
}

function fillTanggalOffKurir(namaKurir, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '<option value="">-- Pilih tanggal --</option>';
    const list = Object.values(DATA_JADWAL)
        .filter((j) => (j.nama || '') === namaKurir && j.jenisOff === 'Off Reguler')
        .map((j) => j.tanggalMulai)
        .filter(Boolean)
        .sort();
    const uniq = [...new Set(list)];
    if (!uniq.length) {
        el.innerHTML = '<option value="">Tidak ada jadwal Off Reguler</option>';
        return;
    }
    uniq.forEach((t) => {
        const o = document.createElement('option');
        o.value = t;
        o.textContent = fmt(t);
        el.appendChild(o);
    });
}

// ---------------------------------------------------------------------
// KURIR — Kalender & notifikasi
// ---------------------------------------------------------------------
function renderKurirCalendar() {
    const grid = document.getElementById('kurir-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const bulanAktif = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = document.getElementById('kurir-bulan-label');
    if (label) label.textContent = `${NAMA_BULAN[m]} ${y}`;

    const today = todayISO();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= total; d++) {
        const t = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const list = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j) === t);

        const box = document.createElement('button');
        box.type = 'button';
        box.className = 'absensi-day-cell h-12 rounded-xl text-xs flex flex-col items-center justify-center p-1 ' +
            (t === today ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-md ring-2 ring-blue-300' : list.length ? 'bg-slate-100 dark:bg-slate-800' : '');
        box.innerHTML = `<span>${d}</span>`;
        box.onclick = () => openKurirTanggalDetail(t);

        if (list.length) {
            const wrap = document.createElement('div');
            wrap.className = 'flex gap-1 mt-1 flex-wrap justify-center';
            [...new Set(list.map((x) => x.jenisOff))].slice(0, 2).forEach((j) => {
                const dot = document.createElement('span');
                dot.className = `w-1.5 h-1.5 rounded-full ${jenisColor(j)}`;
                wrap.appendChild(dot);
            });
            box.appendChild(wrap);
        }

        grid.appendChild(box);
    }

    const statHariIni = document.getElementById('kurir-stat-hari-ini');
    if (statHariIni) statHariIni.textContent = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j) === today && j.jenisOff === 'Off Reguler').length;

    const statBulanIni = document.getElementById('kurir-stat-bulan-ini');
    if (statBulanIni) statBulanIni.textContent = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j).startsWith(bulanAktif) && j.jenisOff === 'Off Reguler').length;

    renderKurirJadwalList();
}

function renderKurirNotifikasiHariIni() {
    const wrap = document.getElementById('kurir-notifikasi-hari-ini');
    if (!wrap) return;

    const today = todayISO();
    const items = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j) === today);

    if (!items.length) {
        wrap.innerHTML = `
            <div class="px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <i data-lucide="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i> Tidak ada off hari ini.
            </div>`;
        refreshIcons();
        return;
    }

    wrap.innerHTML = items.map((j) => {
        let warna = 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
        let icon = 'calendar-days';
        let teks = 'off';

        if (j.jenisOff === 'Izin') { warna = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'; icon = 'alert-circle'; teks = 'izin'; }
        else if (j.jenisOff === 'Sakit') { warna = 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'; icon = 'stethoscope'; teks = 'sakit'; }
        else if (j.jenisOff === 'Tidak Ambil Off') { warna = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'; icon = 'ban'; teks = 'tidak ambil off'; }

        return `
            <div class="px-3 py-2.5 rounded-2xl border ${warna} text-[10px] leading-relaxed">
                <div class="flex items-start gap-2">
                    <i data-lucide="${icon}" class="w-3.5 h-3.5 mt-0.5 shrink-0"></i>
                    <div class="flex-1">
                        <span class="font-bold">${escapeHtml(j.nama || '-')}</span> ${teks} hari ini
                        ${j.keterangan ? `<span class="block text-[10px] opacity-80 mt-0.5">${escapeHtml(j.keterangan)}</span>` : ''}
                    </div>
                </div>
                ${j.jenisOff === 'Off Reguler' ? `
                    <button onclick="autoBuatTidakAmbilOff('${(j.nama || '').replace(/'/g, "\\'")}','${j.tanggalMulai}')"
                        class="mt-2 w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow-md active:scale-95 transition">
                        Jika tidak off, klik ajukan Tidak Ambil Off
                    </button>` : ''}
            </div>`;
    }).join('');
    refreshIcons();
}

window.autoBuatTidakAmbilOff = async (nama, tanggal) => {
    await set(push(ref(db, 'pengajuan')), {
        namaKurir: nama, jenisPengajuan: 'Tidak Ambil Off', tanggalOff: tanggal,
        keterangan: 'Auto dari notifikasi hari ini', status: 'Pending', timestamp: new Date().toISOString()
    });
    notify('Pengajuan Tidak Ambil Off berhasil dikirim');
};

function renderKurirJadwalList() {
    const container = document.getElementById('kurir-jadwal-list');
    if (!container) return;

    const search = (document.getElementById('kurir-search-jadwal')?.value || '').toLowerCase().trim();
    const bulan = getBulanAktif();

    const list = Object.entries(DATA_JADWAL)
        .map(([key, item]) => ({ key, ...item }))
        .filter((i) => {
            const tgl = getTanggalItem(i);
            return tgl.startsWith(bulan) && (
                (i.nama || '').toLowerCase().includes(search) ||
                (i.keterangan || '').toLowerCase().includes(search) ||
                tgl.includes(search) ||
                (i.jenisOff || '').toLowerCase().includes(search)
            );
        })
        .sort((a, b) => (a.tanggalMulai || a.tanggal || '').localeCompare(b.tanggalMulai || b.tanggal || ''));

    if (!list.length) {
        container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Tidak ada jadwal off bulan ini.</div>';
        return;
    }

    const today = todayISO();
    const grouped = {};
    list.forEach((i) => { const k = i.tanggalMulai || i.tanggal || '-'; (grouped[k] = grouped[k] || []).push(i); });

    container.innerHTML = Object.keys(grouped).sort().map((tanggal) => {
        const items = grouped[tanggal];
        const isToday = tanggal === today;
        return `
            <button type="button" onclick="openKurirTanggalDetail('${tanggal}')" class="w-full text-left rounded-2xl p-4 border ${isToday ? 'border-primary ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40'} hover:shadow-md transition">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="text-sm font-bold ${isToday ? 'text-primary' : ''}">${fmt(tanggal)}</div>
                        <div class="text-[10px] text-slate-400">${items.length} jadwal</div>
                    </div>
                    <span class="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">Detail</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                    ${items.slice(0, 3).map((d) => `<span class="inline-flex px-2 py-1 rounded-full text-[10px] font-bold text-white ${jenisColor(d.jenisOff)}">${d.jenisOff}</span>`).join('')}
                    ${items.length > 3 ? `<span class="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-slate-400 text-white">+${items.length - 3}</span>` : ''}
                </div>
            </button>`;
    }).join('');
}

window.openKurirTanggalDetail = function (tanggal) {
    const items = Object.entries(DATA_JADWAL).map(([key, item]) => ({ key, ...item })).filter((i) => (i.tanggalMulai || i.tanggal || '') === tanggal);
    document.getElementById('popup-detail-title').textContent = `Jadwal ${fmt(tanggal)}`;
    document.getElementById('popup-detail-content').innerHTML = items.length ? items.map((i) => `
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="font-bold text-sm">${escapeHtml(i.nama || '-')}</div>
                    <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(i.keterangan || '-')}</div>
                </div>
                <span class="px-2 py-1 rounded-full text-white text-[10px] font-bold ${jenisColor(i.jenisOff)}">${i.jenisOff || '-'}</span>
            </div>
        </div>`).join('') : '<div class="text-xs text-slate-400">Tidak ada jadwal.</div>';
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
    refreshIcons();
};

function renderKurirPengajuanList() {
    const container = document.getElementById('kurir-pengajuan-list');
    if (!container) return;
    const search = (document.getElementById('kurir-search-pengajuan')?.value || '').toLowerCase().trim();
    const nama = document.getElementById('form-pengajuan-nama')?.value || '';
    const items = Object.entries(DATA_PENGAJUAN).map(([key, item]) => ({ key, ...item }))
        .filter((i) => {
            const cocok = (i.namaKurir || '').toLowerCase().includes(search) || (i.jenisPengajuan || '').toLowerCase().includes(search) ||
                (i.tanggalOff || '').toLowerCase().includes(search) || (i.keterangan || '').toLowerCase().includes(search);
            return cocok && (!nama || i.namaKurir === nama);
        })
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    if (!items.length) { container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Belum ada pengajuan.</div>'; return; }

    container.innerHTML = items.map((i) => detailPengajuanCard(i)).join('');
}

function detailPengajuanCard(i) {
    const status = i.status || 'Pending';
    const statusCls = status === 'Disetujui' ? 'bg-emerald-500' : status === 'Ditolak' ? 'bg-red-500' : 'bg-amber-500';
    let detail = '';
    if (i.jenisPengajuan === 'Tukar Off') detail = `Tukar off dari <b>${escapeHtml(i.namaKurir || '-')}</b> ke <b>${escapeHtml(i.kurirTukar || '-')}</b><br>tanggal: <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b> &rarr; <b>${i.tanggalTukar ? fmt(i.tanggalTukar) : '-'}</b>`;
    else if (i.jenisPengajuan === 'Pindah Off') detail = `Pindah off <b>${escapeHtml(i.namaKurir || '-')}</b> dari <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b> ke <b>${i.tanggalPindah ? fmt(i.tanggalPindah) : '-'}</b>`;
    else detail = `Tanggal: <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b>`;
    return `
        <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="font-bold text-xs">${escapeHtml(i.namaKurir || '-')}</div>
                    <div class="text-[10px] text-slate-500 mt-1">${i.jenisPengajuan || '-'}</div>
                    <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">${detail}</div>
                    <div class="text-[10px] text-slate-400 mt-1">${escapeHtml(i.keterangan || '')}</div>
                </div>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold text-white ${statusCls}">${status}</span>
            </div>
        </div>`;
}

function renderKurirRekap() {
    const body = document.getElementById('kurir-rekap-body');
    const head = document.getElementById('kurir-rekap-head');
    if (!body || !head) return;

    const search = (document.getElementById('kurir-search-rekap')?.value || '').toLowerCase().trim();
    const bulan = getBulanAktif();

    const data = {};
    getKurirAktif().forEach((u) => { data[u.nama] = { nama: u.nama, leader: u.leader, off: 0, izin: 0, sakit: 0, masuk: 0, pulang: 0 }; });

    Object.values(DATA_JADWAL).forEach((j) => {
        const tgl = getTanggalItem(j);
        if (!tgl.startsWith(bulan) || !data[j.nama]) return;
        if (j.jenisOff === 'Off Reguler') data[j.nama].off++;
        if (j.jenisOff === 'Izin') data[j.nama].izin++;
        if (j.jenisOff === 'Sakit') data[j.nama].sakit++;
    });
    Object.values(DATA_ABSENSI).forEach((a) => {
        if (!data[a.namaKurir] || (a.tanggal && !a.tanggal.startsWith(bulan))) return;
        if (a.jamMasuk) data[a.namaKurir].masuk++;
        if (a.jamPulang) data[a.namaKurir].pulang++;
    });

    const rows = Object.values(data).filter((r) => r.nama.toLowerCase().includes(search) || r.leader.toLowerCase().includes(search));
    body.innerHTML = rows.map((r, i) => `
        <tr class="border-b border-slate-100 dark:border-slate-800">
            <td class="py-3">${i + 1}</td>
            <td class="py-3 font-bold">${escapeHtml(r.nama)}</td>
            <td class="py-3 text-[10px] text-slate-400">${escapeHtml(r.leader)}</td>
            <td class="py-3">${r.off}</td>
            <td class="py-3">${r.izin}</td>
            <td class="py-3">${r.sakit}</td>
            <td class="py-3">${r.masuk}</td>
            <td class="py-3">${r.pulang}</td>
        </tr>`).join('') || `<tr><td colspan="8" class="py-6 text-center text-xs text-slate-400">Belum ada data.</td></tr>`;
}

// ---------------------------------------------------------------------
// ADMIN — Kalender monitoring & jadwal list
// ---------------------------------------------------------------------
function renderAdminCalendar() {
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const bulanAktif = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = document.getElementById('admin-bulan-label');
    if (label) label.textContent = `${NAMA_BULAN[m]} ${y}`;

    const today = todayISO();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= total; d++) {
        const t = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const list = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j) === t);

        const box = document.createElement('button');
        box.type = 'button';
        box.className = 'absensi-day-cell h-12 rounded-xl text-xs flex flex-col items-center justify-center p-1 ' +
            (t === today ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md ring-2 ring-teal-300' : list.length ? 'bg-slate-100 dark:bg-slate-800' : '');
        box.innerHTML = `<span>${d}</span>`;
        box.onclick = () => openAdminTanggalDetail(t);

        if (list.length) {
            const wrap = document.createElement('div');
            wrap.className = 'flex gap-1 mt-1 flex-wrap justify-center';
            [...new Set(list.map((x) => x.jenisOff))].slice(0, 2).forEach((j) => {
                const dot = document.createElement('span');
                dot.className = `w-1.5 h-1.5 rounded-full ${jenisColor(j)}`;
                wrap.appendChild(dot);
            });
            box.appendChild(wrap);
        }
        grid.appendChild(box);
    }

    const totalKurirEl = document.getElementById('admin-total-kurir');
    if (totalKurirEl) totalKurirEl.textContent = getKurirAktif().length;
    const offHariIniEl = document.getElementById('admin-off-hari-ini');
    if (offHariIniEl) offHariIniEl.textContent = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j) === today && j.jenisOff === 'Off Reguler').length;
    const offBulanIniEl = document.getElementById('admin-off-bulan-ini');
    if (offBulanIniEl) offBulanIniEl.textContent = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j).startsWith(bulanAktif) && j.jenisOff === 'Off Reguler').length;
}

window.openAdminTanggalDetail = function (tanggal) {
    const items = Object.entries(DATA_JADWAL).map(([key, item]) => ({ key, ...item })).filter((i) => (i.tanggalMulai || i.tanggal || '') === tanggal);
    document.getElementById('popup-detail-title').textContent = `Monitoring ${fmt(tanggal)}`;
    document.getElementById('popup-detail-content').innerHTML = `
        <div class="space-y-3">
            <button onclick="openJadwalPopup('', { tanggalMulai: '${tanggal}', tanggalSelesai: '${tanggal}' })" class="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-md">Input Jadwal</button>
            ${items.length ? items.map((i) => `
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="font-bold text-sm">${escapeHtml(i.nama || '-')}</div>
                            <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(i.keterangan || '-')}</div>
                        </div>
                        <span class="px-2 py-1 rounded-full text-white text-[10px] font-bold ${jenisColor(i.jenisOff)}">${i.jenisOff || '-'}</span>
                    </div>
                </div>`).join('') : '<div class="text-xs text-slate-400">Tidak ada jadwal.</div>'}
        </div>`;
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
    refreshIcons();
};

function renderAdminJadwalListContent() {
    const container = document.getElementById('admin-jadwal-list-content');
    if (!container) return;

    const search = (document.getElementById('admin-search-jadwal-list')?.value || '').toLowerCase().trim();
    const bulan = getBulanAktif();

    const list = Object.entries(DATA_JADWAL)
        .map(([key, item]) => ({ key, ...item }))
        .filter((i) => {
            const tgl = i.tanggalMulai || '';
            return tgl.startsWith(bulan) && (
                (i.nama || '').toLowerCase().includes(search) || (i.jenisOff || '').toLowerCase().includes(search) ||
                (i.keterangan || '').toLowerCase().includes(search) || tgl.includes(search)
            );
        })
        .sort((a, b) => (a.tanggalMulai || '').localeCompare(b.tanggalMulai || ''));

    if (!list.length) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-center">
                <div class="text-4xl mb-2">📭</div>
                <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Belum ada jadwal off bulan ini</p>
                <p class="text-xs text-slate-400 mt-1">Mulai dengan membuat jadwal baru</p>
            </div>`;
        return;
    }

    const grouped = {};
    list.forEach((i) => { const k = i.tanggalMulai || ''; (grouped[k] = grouped[k] || []).push(i); });

    const today = todayISO();
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

    container.innerHTML = Object.keys(grouped).sort().map((tanggal) => {
        const items = grouped[tanggal];
        const isToday = tanggal === today;
        let dateLabel = fmt(tanggal);
        if (isToday) dateLabel += ' (HARI INI)';
        else if (tanggal === tomorrow) dateLabel += ' (BESOK)';

        return `
            <div id="jadwal-group-${tanggal}" class="rounded-2xl overflow-hidden ${isToday ? 'bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-red-950/50 dark:via-pink-950/50 dark:to-rose-950/50 border-2 border-red-400 dark:border-red-600 shadow-lg ring-2 ring-red-200 dark:ring-red-800' : 'bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm'}">
                <div class="px-4 py-3 ${isToday ? 'bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white' : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border-b border-slate-100 dark:border-slate-700'}">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-[10px] font-bold opacity-75">${isToday ? '🔴 TANGGAL HARI INI' : '📅 TANGGAL'}</div>
                            <div class="text-sm font-bold mt-1">${dateLabel}</div>
                        </div>
                        <div class="inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold ${isToday ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${items.length} kurir</div>
                    </div>
                </div>
                <div class="p-3 ${items.length === 1 ? 'space-y-2' : 'grid grid-cols-2 gap-2'}">
                    ${items.map((i) => {
                        const kurirData = Object.values(DATA_USERS).find((u) => (u.nama || '') === i.nama);
                        const leader = kurirData?.leader || i.leader || '-';
                        return `
                        <div class="rounded-xl p-2.5 ${isToday ? 'bg-white/60 dark:bg-red-900/20 border border-red-300 dark:border-red-700' : 'bg-white/60 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700'}">
                            <div class="flex items-start justify-between gap-2 mb-1.5">
                                <div class="min-w-0">
                                    <div class="font-bold text-[11px] truncate">${escapeHtml(i.nama || '-')}</div>
                                    <div class="text-[9px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(leader)}</div>
                                </div>
                                <span class="px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold whitespace-nowrap ${jenisColor(i.jenisOff)}">${i.jenisOff || '-'}</span>
                            </div>
                            ${i.keterangan ? `<div class="text-[9px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-1.5 mb-1.5 line-clamp-2">${escapeHtml(i.keterangan)}</div>` : ''}
                            <div class="flex gap-1.5 pt-1.5 border-t ${isToday ? 'border-red-300 dark:border-red-700' : 'border-slate-100 dark:border-slate-700'}">
                                <button onclick="editJadwal('${i.key}')" class="flex-1 px-2 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-bold">Edit</button>
                                <button onclick="hapusJadwal('${i.key}')" class="flex-1 px-2 py-1 rounded-lg bg-danger text-white text-[9px] font-bold">Hapus</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    }).join('');
}

function renderAdminPengajuanList() {
    const container = document.getElementById('admin-pengajuan-list');
    if (!container) return;
    const search = (document.getElementById('admin-search-pengajuan')?.value || '').toLowerCase().trim();
    const items = Object.entries(DATA_PENGAJUAN).map(([key, item]) => ({ key, ...item }))
        .filter((i) => (i.status || 'Pending') === 'Pending')
        .filter((i) => (i.namaKurir || '').toLowerCase().includes(search) || (i.jenisPengajuan || '').toLowerCase().includes(search) || (i.tanggalOff || '').toLowerCase().includes(search) || (i.keterangan || '').toLowerCase().includes(search))
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const countEl = document.getElementById('admin-pending-count');
    if (countEl) countEl.textContent = items.length;

    container.innerHTML = items.map((i) => {
        let detail = '';
        if (i.jenisPengajuan === 'Tukar Off') detail = `Tukar off dari <b>${escapeHtml(i.namaKurir || '-')}</b> ke <b>${escapeHtml(i.kurirTukar || '-')}</b><br>tanggal: <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b> &rarr; <b>${i.tanggalTukar ? fmt(i.tanggalTukar) : '-'}</b>`;
        else if (i.jenisPengajuan === 'Pindah Off') detail = `Pindah off <b>${escapeHtml(i.namaKurir || '-')}</b> dari <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b> ke <b>${i.tanggalPindah ? fmt(i.tanggalPindah) : '-'}</b>`;
        else detail = `Tanggal: <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b>`;
        return `
            <div class="absensi-glass p-4 rounded-2xl space-y-3 shadow-sm">
                <div class="flex items-start gap-3">
                    <div class="${adminSelectMode ? '' : 'hidden'} mt-1">
                        <input type="checkbox" class="admin-check accent-primary" data-key="${i.key}">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between gap-2">
                            <div>
                                <div class="font-bold text-xs">${escapeHtml(i.namaKurir || '-')}</div>
                                <div class="text-[10px] text-slate-400">${i.jenisPengajuan || '-'}</div>
                            </div>
                            <span class="px-2 py-1 rounded-full text-white text-[10px] font-bold bg-amber-500">Pending</span>
                        </div>
                        <div class="mt-2 text-[10px] text-slate-500 leading-relaxed">${detail}</div>
                        <div class="mt-1 text-[10px] text-slate-400">${escapeHtml(i.keterangan || '')}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 ${adminSelectMode ? 'hidden' : ''}">
                    <button onclick="prosesPengajuan('${i.key}','Ditolak')" class="py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-bold">Tolak</button>
                    <button onclick="prosesPengajuan('${i.key}','Disetujui')" class="py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-md">Setujui</button>
                </div>
            </div>`;
    }).join('') || '<div class="text-center py-6 text-xs text-slate-400">Tidak ada pengajuan pending.</div>';

    const actionsEl = document.getElementById('admin-pengajuan-actions');
    if (actionsEl) actionsEl.classList.toggle('hidden', !adminSelectMode);
}

function renderAdminRiwayat() {
    const container = document.getElementById('admin-riwayat-pengajuan');
    if (!container) return;
    const items = Object.entries(DATA_PENGAJUAN).map(([key, item]) => ({ key, ...item }))
        .filter((i) => ['Disetujui', 'Ditolak', 'Dihapus'].includes(i.status))
        .sort((a, b) => (b.updatedAt || b.timestamp || '').localeCompare(a.updatedAt || a.timestamp || ''));

    if (!items.length) { container.innerHTML = '<div class="text-center py-4 text-xs text-slate-400">Riwayat masih kosong.</div>'; return; }

    container.innerHTML = items.map((i) => {
        const status = i.status || '-';
        const statusCls = status === 'Disetujui' ? 'bg-emerald-500' : status === 'Ditolak' ? 'bg-red-500' : 'bg-slate-500';
        let detail = '';
        if (i.jenisPengajuan === 'Tukar Off') detail = `Tukar off dari <b>${escapeHtml(i.namaKurir || '-')}</b> ke <b>${escapeHtml(i.kurirTukar || '-')}</b><br>${i.tanggalOff ? fmt(i.tanggalOff) : '-'} &rarr; ${i.tanggalTukar ? fmt(i.tanggalTukar) : '-'}`;
        else if (i.jenisPengajuan === 'Pindah Off') detail = `Pindah off <b>${escapeHtml(i.namaKurir || '-')}</b> dari <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b> ke <b>${i.tanggalPindah ? fmt(i.tanggalPindah) : '-'}</b>`;
        else detail = `Tanggal: <b>${i.tanggalOff ? fmt(i.tanggalOff) : '-'}</b>`;
        return `
            <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="font-bold text-xs">${escapeHtml(i.namaKurir || '-')}</div>
                        <div class="text-[10px] text-slate-500 mt-1">${i.jenisPengajuan || '-'}</div>
                        <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">${detail}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${escapeHtml(i.keterangan || '')}</div>
                    </div>
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold text-white ${statusCls}">${status}</span>
                </div>
                <div class="mt-3 flex items-center justify-between gap-2">
                    <div class="text-[10px] text-slate-400">${i.updatedAt ? fmt(i.updatedAt.slice(0, 10)) : ''}</div>
                    <button onclick="hapusPengajuan('${i.key}')" class="px-3 py-2 rounded-xl bg-danger text-white text-[10px] font-bold">Hapus</button>
                </div>
            </div>`;
    }).join('');
}

// ---------------------------------------------------------------------
// ADMIN — Rekap off/izin/sakit + deteksi alfa
// ---------------------------------------------------------------------
function renderAdminRekap() {
    const body = document.getElementById('admin-rekap-body');
    const head = document.getElementById('admin-rekap-head');
    if (!body || !head) return;

    const search = (document.getElementById('admin-search-rekap')?.value || '').toLowerCase().trim();
    const bulan = getBulanAktif();

    const data = {};
    getKurirAktif().forEach((u) => { data[u.nama] = { nama: u.nama, leader: u.leader, off: 0, tidakAmbilOff: 0, izin: 0, sakit: 0, alfa: 0, masuk: 0, pulang: 0 }; });

    Object.values(DATA_JADWAL).forEach((j) => {
        const tgl = getTanggalItem(j);
        if (!tgl.startsWith(bulan) || !data[j.nama]) return;
        if (j.jenisOff === 'Off Reguler') data[j.nama].off++;
        if (j.jenisOff === 'Tidak Ambil Off') data[j.nama].tidakAmbilOff++;
        if (j.jenisOff === 'Izin') data[j.nama].izin++;
        if (j.jenisOff === 'Sakit') data[j.nama].sakit++;
    });
    Object.values(DATA_ABSENSI).forEach((a) => {
        if (!data[a.namaKurir] || (a.tanggal && !a.tanggal.startsWith(bulan))) return;
        if (a.jamMasuk) data[a.namaKurir].masuk++;
        if (a.jamPulang) data[a.namaKurir].pulang++;
    });

    const today = todayISO();
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const totalHari = new Date(y, m + 1, 0).getDate();

    Object.values(data).forEach((r) => {
        let alfa = 0;
        const userObj = Object.values(DATA_USERS).find((u) => (u.nama || '') === r.nama);
        const tglGabung = userObj?.tglGabung || '';
        let startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        if (tglGabung) {
            const nextDay = new Date(tglGabung);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];
            if (nextDayStr > startDate) startDate = nextDayStr;
        }
        for (let d = 1; d <= totalHari; d++) {
            const tanggal = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (tanggal > today || tanggal < startDate) continue;
            const adaJadwal = Object.values(DATA_JADWAL).some((j) => (j.nama || '') === r.nama && getTanggalItem(j) === tanggal && ['Off Reguler', 'Izin', 'Sakit'].includes(j.jenisOff));
            const adaAbsensi = Object.values(DATA_ABSENSI).some((a) => (a.namaKurir || '') === r.nama && a.tanggal === tanggal && (a.jamMasuk || a.jamPulang));
            if (!adaJadwal && !adaAbsensi) alfa++;
        }
        r.alfa = alfa;
    });

    const rows = Object.values(data).filter((r) => r.nama.toLowerCase().includes(search) || r.leader.toLowerCase().includes(search));

    head.innerHTML = `
        <tr class="text-left border-b border-slate-200 dark:border-slate-700">
            <th class="py-2">No</th><th class="py-2">Nama Kurir</th><th class="py-2">Leader</th>
            <th class="py-2">Off</th><th class="py-2">TAF</th><th class="py-2">Izin</th><th class="py-2">Sakit</th>
            <th class="py-2">M/P</th><th class="py-2">Alfa</th><th class="py-2">Aksi</th>
        </tr>`;

    body.innerHTML = rows.map((r, i) => `
        <tr class="border-b border-slate-100 dark:border-slate-800">
            <td class="py-3">${i + 1}</td>
            <td class="py-3 font-bold">${escapeHtml(r.nama)}</td>
            <td class="py-3 text-[10px] text-slate-400">${escapeHtml(r.leader)}</td>
            <td class="py-3">${r.off}</td>
            <td class="py-3">${r.tidakAmbilOff}</td>
            <td class="py-3">${r.izin}</td>
            <td class="py-3">${r.sakit}</td>
            <td class="py-3">${r.masuk}/${r.pulang}</td>
            <td class="py-3 text-danger font-bold">${r.alfa}</td>
            <td class="py-3"><button onclick="openAdminDetailRekapKurir('${r.nama.replace(/'/g, "\\'")}')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold shadow-sm">Detail</button></td>
        </tr>`).join('') || `<tr><td colspan="10" class="py-6 text-center text-xs text-slate-400">Belum ada data.</td></tr>`;
}

window.openAdminDetailRekapKurir = function (namaKurir) {
    const bulan = getBulanAktif();
    const jadwal = Object.entries(DATA_JADWAL).map(([key, item]) => ({ key, ...item })).filter((j) => j.nama === namaKurir && getTanggalItem(j).startsWith(bulan));
    const absensi = Object.entries(DATA_ABSENSI).map(([key, item]) => ({ key, ...item })).filter((a) => a.namaKurir === namaKurir && (a.tanggal || '').startsWith(bulan));

    const userObj = Object.values(DATA_USERS).find((u) => (u.nama || u.username || '') === namaKurir);
    const tglGabung = userObj?.tglGabung || '';
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const totalHari = new Date(y, m + 1, 0).getDate();
    const today = todayISO();

    let startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    if (tglGabung) {
        const nextDay = new Date(tglGabung);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        if (nextDayStr > startDate) startDate = nextDayStr;
    }

    const alfaList = [];
    for (let d = 1; d <= totalHari; d++) {
        const tanggal = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (tanggal > today || tanggal < startDate) continue;
        const adaJadwal = Object.values(DATA_JADWAL).some((j) => (j.nama || '') === namaKurir && getTanggalItem(j) === tanggal && ['Off Reguler', 'Izin', 'Sakit'].includes(j.jenisOff));
        const adaAbsensi = Object.values(DATA_ABSENSI).some((a) => (a.namaKurir || '') === namaKurir && a.tanggal === tanggal && (a.jamMasuk || a.jamPulang));
        if (!adaJadwal && !adaAbsensi) alfaList.push(tanggal);
    }

    const renderTab = (tab) => {
        if (tab === 'jadwal') {
            return jadwal.length ? jadwal.map((j) => `
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="font-bold text-sm">${fmt(getTanggalItem(j))}</div>
                            <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(j.keterangan || '-')}</div>
                        </div>
                        <div class="flex flex-col items-end gap-2">
                            <div class="flex gap-2">
                                <button onclick="editJadwal('${j.key}')" class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                                <button onclick="hapusJadwal('${j.key}')" class="w-8 h-8 rounded-xl bg-danger text-white flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                            <span class="px-2 py-1 rounded-full text-[10px] font-bold text-white ${jenisColor(j.jenisOff)}">${j.jenisOff || '-'}</span>
                        </div>
                    </div>
                </div>`).join('') : '<div class="text-xs text-slate-400">Tidak ada data.</div>';
        }
        if (tab === 'absensi') {
            return absensi.length ? absensi.map((a) => `
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="font-bold text-sm">${a.tanggal ? fmt(a.tanggal) : '-'}</div>
                            <div class="text-[11px] text-slate-500 mt-1">M: ${a.jamMasuk || '-'} | P: ${a.jamPulang || '-'}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="openAbsensiEdit('${a.tanggal}','${a.idKurir || ''}','${(a.namaKurir || '').replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                            <button onclick="hapusAbsensi('${a.key}')" class="w-8 h-8 rounded-xl bg-danger text-white flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </div>
                    </div>
                </div>`).join('') : '<div class="text-xs text-slate-400">Tidak ada absensi.</div>';
        }
        return alfaList.length ? alfaList.map((t) => `
            <div class="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="font-bold text-sm">${fmt(t)}</div>
                        <div class="text-[11px] text-slate-500 mt-1">Tidak ada jadwal / absensi</div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openAbsensiEdit('${t}','${namaKurir.replace(/'/g, "\\'")}','${namaKurir.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                        <button onclick="hapusAbsensiByTanggal('${namaKurir.replace(/'/g, "\\'")}','${t}')" class="w-8 h-8 rounded-xl bg-danger text-white flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
            </div>`).join('') : '<div class="text-xs text-slate-400">Tidak ada data alfa.</div>';
    };

    document.getElementById('popup-detail-title').textContent = `Detail Rekap ${namaKurir}`;
    document.getElementById('popup-detail-content').innerHTML = `
        <div class="space-y-3">
            <div class="flex gap-2 text-[10px] font-bold">
                <button onclick="window.__rekapTab='jadwal';window.__renderRekapTab()" class="px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white">Jadwal</button>
                <button onclick="window.__rekapTab='absensi';window.__renderRekapTab()" class="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100">Data Absensi</button>
                <button onclick="window.__rekapTab='alfa';window.__renderRekapTab()" class="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100">Alfa</button>
            </div>
            <div id="rekap-tab-content">${renderTab('jadwal')}</div>
        </div>`;

    window.__rekapTab = 'jadwal';
    window.__renderRekapTab = () => {
        const content = document.getElementById('rekap-tab-content');
        if (content) { content.innerHTML = renderTab(window.__rekapTab || 'jadwal'); refreshIcons(); }
    };

    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
    refreshIcons();
};

// ---------------------------------------------------------------------
// ADMIN — Tab "Harian" (absensi masuk/pulang harian + statistik)
// ---------------------------------------------------------------------
window.onAbsensiFilterTglChange = function () {
    const tglEl = document.getElementById('absensi-filter-tgl');
    const bulanEl = document.getElementById('absensi-filter-bulan');
    if (tglEl?.value && bulanEl) bulanEl.value = '';
    renderAdminAbsensi();
};
window.onAbsensiFilterBulanChange = function () {
    const tglEl = document.getElementById('absensi-filter-tgl');
    const bulanEl = document.getElementById('absensi-filter-bulan');
    if (bulanEl?.value && tglEl) tglEl.value = '';
    renderAdminAbsensi();
};
function fixJamFormat(val) {
    if (!val) return '';
    return String(val).trim().replace('.', ':').slice(0, 5);
}
window.renderAdminAbsensi = function () {
    const tglFilter = document.getElementById('absensi-filter-tgl')?.value || '';
    const bulanFilter = document.getElementById('absensi-filter-bulan')?.value || '';
    const namaFilter = (document.getElementById('absensi-filter-nama')?.value || '').toLowerCase().trim();
    const today = todayISO();
    const kurirList = getKurirAktif();

    const totalKurirEl = document.getElementById('absensi-total-kurir');
    if (totalKurirEl) totalKurirEl.textContent = kurirList.length;

    const absensiHariIni = Object.values(DATA_ABSENSI).filter((a) => a.tanggal === today);
    const hadir = absensiHariIni.filter((a) => a.jamMasuk).length;
    const hadirEl = document.getElementById('absensi-hadir-hari-ini');
    if (hadirEl) hadirEl.textContent = hadir;
    const belumMasukEl = document.getElementById('absensi-belum-masuk');
    if (belumMasukEl) belumMasukEl.textContent = Math.max(kurirList.length - hadir, 0);
    const belumPulangEl = document.getElementById('absensi-belum-pulang');
    if (belumPulangEl) belumPulangEl.textContent = absensiHariIni.filter((a) => a.jamMasuk && !a.jamPulang).length;

    const prefix = tglFilter || bulanFilter || today;
    let records = Object.entries(DATA_ABSENSI).map(([key, a]) => ({ key, ...a })).filter((a) => (a.tanggal || '').startsWith(prefix));
    if (namaFilter) records = records.filter((a) => (a.namaKurir || '').toLowerCase().includes(namaFilter));
    records.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (a.namaKurir || '').localeCompare(b.namaKurir || ''));

    const tbody = document.getElementById('container-admin-absensi');
    if (tbody) {
        tbody.innerHTML = records.map((a, i) => {
            const jamMasukFix = String(a.jamMasuk || '').trim().replace('.', ':').slice(0, 5);
            const jamPulangFix = String(a.jamPulang || '').trim().replace('.', ':').slice(0, 5);
            const jamKerjaText = hitungDurasiKerja(jamMasukFix, jamPulangFix);
            let status = 'Belum Masuk', statusCls = 'bg-danger';
            if (a.jamMasuk && a.jamPulang) { status = 'Lengkap'; statusCls = 'bg-success'; }
            else if (a.jamMasuk && !a.jamPulang) { status = 'Belum Pulang'; statusCls = 'bg-amber-500'; }
            return `
                <tr>
                    <td class="py-2">${i + 1}</td>
                    <td class="py-2 font-bold">${escapeHtml(a.namaKurir || '-')}</td>
                    <td class="py-2 text-[10px] text-slate-400">${escapeHtml(a.leader || '-')}</td>
                    <td class="py-2">${a.jamMasuk || '-'}</td>
                    <td class="py-2">${a.jamPulang || '-'}</td>
                    <td class="py-2 font-semibold text-slate-700 dark:text-slate-300">${jamKerjaText}</td>
                    <td class="py-2"><span class="px-2 py-1 rounded-full text-white text-[10px] font-bold ${statusCls}">${status}</span></td>
                    <td class="py-2">
                        <div class="flex gap-1.5">
                            <button onclick="openAbsensiDetail('${(a.namaKurir || '').replace(/'/g, "\\'")}')" class="px-2 py-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold">Detail</button>
                            <button onclick="hapusAbsensi('${a.key}')" class="px-2 py-1.5 rounded-lg bg-danger text-white text-[10px] font-bold">Hapus</button>
                        </div>
                    </td>
                </tr>`;
        }).join('') || `<tr><td colspan="8" class="py-6 text-center text-xs text-slate-400">Belum ada data absensi.</td></tr>`;
    }

    const bulanAktif = bulanFilter || today.slice(0, 7);
    const statWrap = document.getElementById('container-statistik-absensi');
    if (statWrap) {
        const rows = kurirList.map((u) => ({
            nama: u.nama,
            masuk: Object.values(DATA_ABSENSI).filter((a) => a.namaKurir === u.nama && (a.tanggal || '').startsWith(bulanAktif) && a.jamMasuk).length
        })).sort((a, b) => b.masuk - a.masuk).slice(0, 8);
        statWrap.innerHTML = rows.map((r) => `
            <div class="flex items-center justify-between text-[11px]">
                <span class="font-semibold">${escapeHtml(r.nama)}</span>
                <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">${r.masuk}x masuk</span>
            </div>`).join('') || '<div class="text-xs text-slate-400">Belum ada data.</div>';
    }
};

window.pickAbsensiKurir = function (nama) {
    const input = document.getElementById('absensi-filter-nama');
    const box = document.getElementById('suggest-absensi-kurir');
    if (input) input.value = nama;
    if (box) box.classList.add('hidden');
    renderAdminAbsensi();
};

let _absensiSuggestTimer = null;
window.updateAbsensiKurirSuggestions = function () {
    clearTimeout(_absensiSuggestTimer);
    _absensiSuggestTimer = setTimeout(() => {
        const input = document.getElementById('absensi-filter-nama');
        const box = document.getElementById('suggest-absensi-kurir');
        if (!input || !box) return;
        const q = input.value.toLowerCase().trim();
        if (!q) { box.classList.add('hidden'); renderAdminAbsensi(); return; }
        const matches = getKurirAktif().filter((u) => u.nama.toLowerCase().includes(q)).slice(0, 6);
        if (!matches.length) { box.classList.add('hidden'); renderAdminAbsensi(); return; }
        box.innerHTML = matches.map((u) => `<button type="button" onclick="pickAbsensiKurir('${u.nama.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">${escapeHtml(u.nama)} <span class="text-slate-400">(${escapeHtml(u.leader)})</span></button>`).join('');
        box.classList.remove('hidden');
        renderAdminAbsensi();
    }, 150);
};

window.openAbsensiDetail = function (identifier) {
    const target = (identifier || '').trim().toLowerCase();
    const bulan = getBulanAktif();
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();
    const totalHari = new Date(y, m + 1, 0).getDate();
    const today = todayISO();

    const kurirData = Object.entries(DATA_USERS).find(([id, u]) => {
        const idL = (id || '').trim().toLowerCase();
        const userL = (u.username || '').trim().toLowerCase();
        const namaL = (u.nama || '').trim().toLowerCase();
        return idL === target || userL === target || namaL === target;
    });

    const idTarget = kurirData?.[0] || target;
    const u = kurirData?.[1] || {};
    const namaKurir = u.nama || identifier || '-';

    const listAbsensi = Object.entries(DATA_ABSENSI).map(([key, item]) => ({ key, ...item })).filter((a) => {
        const idKurir = (a.idKurir || '').trim().toLowerCase();
        const username = (a.username || '').trim().toLowerCase();
        const nama = (a.namaKurir || '').trim().toLowerCase();
        return a.tanggal && a.tanggal.startsWith(bulan) && (idKurir === idTarget || username === (u.username || '').trim().toLowerCase() || nama === target);
    });

    const listJadwal = Object.entries(DATA_JADWAL).map(([key, item]) => ({ key, ...item })).filter((j) => {
        const idKurir = (j.idKurir || '').trim().toLowerCase();
        const username = (j.username || '').trim().toLowerCase();
        const nama = (j.nama || '').trim().toLowerCase();
        return getTanggalItem(j).startsWith(bulan) && (idKurir === idTarget || username === (u.username || '').trim().toLowerCase() || nama === target);
    });

    const mapAbsensi = {}; listAbsensi.forEach((a) => { mapAbsensi[a.tanggal] = a; });
    const mapJadwal = {}; listJadwal.forEach((j) => { const tgl = getTanggalItem(j); if (!mapJadwal[tgl]) mapJadwal[tgl] = j; });

    const userObjGabung = Object.values(DATA_USERS).find((uu) => (uu.nama || '') === namaKurir);
    const tglGabung = userObjGabung?.tglGabung || '';
    let startGabung = '';
    if (tglGabung) {
        const nextDay = new Date(tglGabung);
        nextDay.setDate(nextDay.getDate() + 1);
        startGabung = nextDay.toISOString().split('T')[0];
    }

    let html = '';
    let scrollTargetId = '';

    for (let d = 1; d <= totalHari; d++) {
        const tanggal = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const abs = mapAbsensi[tanggal];
        const jadwal = mapJadwal[tanggal];
        if (tanggal === today) scrollTargetId = `abs-row-${tanggal}`;

        let status = 'Belum Absen';
        let warna = 'border-slate-200 bg-slate-50 dark:bg-slate-800/60';
        let badge = 'bg-slate-100 text-slate-600';

        if (jadwal?.jenisOff) {
            status = jadwal.jenisOff;
            if (jadwal.jenisOff === 'Off Reguler') { warna = 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'; badge = 'bg-blue-100 text-blue-700'; }
            else if (jadwal.jenisOff === 'Tidak Ambil Off') { warna = 'border-slate-300 bg-slate-50 dark:bg-slate-950/30'; badge = 'bg-slate-100 text-slate-700'; }
            else if (jadwal.jenisOff === 'Izin') { warna = 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'; badge = 'bg-amber-100 text-amber-700'; }
            else if (jadwal.jenisOff === 'Sakit') { warna = 'border-red-300 bg-red-50 dark:bg-red-950/30'; badge = 'bg-red-100 text-red-700'; }
        } else if (startGabung && tanggal < startGabung) {
            status = 'Sebelum Bergabung'; warna = 'border-slate-200 bg-slate-50 dark:bg-slate-800/60'; badge = 'bg-slate-100 text-slate-600';
        } else if (tanggal > today) {
            status = 'Akan Datang'; warna = 'border-slate-200 bg-slate-50 dark:bg-slate-800/60'; badge = 'bg-slate-100 text-slate-600';
        } else if (!abs) {
            status = 'Alfa'; warna = 'border-red-300 bg-red-50 dark:bg-red-950/30'; badge = 'bg-red-500 text-white';
        } else if (abs?.jamMasuk && abs?.jamPulang) {
            status = 'Lengkap'; warna = 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'; badge = 'bg-emerald-100 text-emerald-700';
        } else if (abs?.jamMasuk && !abs?.jamPulang) {
            status = 'Belum Pulang'; warna = 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'; badge = 'bg-amber-100 text-amber-700';
        } else {
            status = 'Belum Absen'; warna = 'border-red-300 bg-red-50 dark:bg-red-950/30'; badge = 'bg-red-100 text-red-700';
        }

        html += `
            <div id="abs-row-${tanggal}" class="p-3 rounded-2xl border ${warna}">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="font-bold text-sm">${fmt(tanggal)}</div>
                        <div class="text-[10px] mt-1">Masuk: <b>${abs?.jamMasuk || '-'}</b> | Pulang: <b>${abs?.jamPulang || '-'}</b></div>
                        <div class="mt-2 inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${badge}">${status}</div>
                        ${jadwal?.keterangan ? `<div class="text-[10px] text-slate-500 mt-1">${escapeHtml(jadwal.keterangan)}</div>` : ''}
                    </div>
                    <button onclick="openAbsensiEdit('${tanggal}', '${idTarget}', '${namaKurir.replace(/'/g, "\\'")}')" class="px-3 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-bold shrink-0">Edit</button>
                </div>
            </div>`;
    }

    document.getElementById('popup-detail-title').textContent = `Absensi ${namaKurir}`;
    document.getElementById('popup-detail-content').innerHTML = html;
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
    refreshIcons();

    setTimeout(() => { const el = document.getElementById(scrollTargetId); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150);
};

// ---------------------------------------------------------------------
// Popup: Jadwal Off, Absensi Manual, Detail umum
// ---------------------------------------------------------------------
function updatePengajuanVisibility() {
    const jenis = document.getElementById('form-pengajuan-jenis')?.value || '';
    const nama = document.getElementById('form-pengajuan-nama')?.value || '';
    const kurirTukar = document.getElementById('form-pengajuan-kurir-tukar')?.value || '';

    document.getElementById('wrap-tanggal-pindah')?.classList.toggle('hidden', jenis !== 'Pindah Off');
    document.getElementById('wrap-kurir-tukar')?.classList.toggle('hidden', jenis !== 'Tukar Off');
    document.getElementById('wrap-tanggal-tukar')?.classList.toggle('hidden', jenis !== 'Tukar Off');

    if (jenis === 'Pindah Off') { fillTanggalOffKurir(nama, 'form-pengajuan-tanggal'); fillTanggalAll('form-pengajuan-tanggal-pindah'); }
    else if (jenis === 'Tukar Off') {
        fillTanggalOffKurir(nama, 'form-pengajuan-tanggal');
        const tanggalTukarEl = document.getElementById('form-pengajuan-tanggal-tukar');
        if (kurirTukar) fillTanggalOffKurir(kurirTukar, 'form-pengajuan-tanggal-tukar');
        else if (tanggalTukarEl) tanggalTukarEl.innerHTML = '<option value="">-- Pilih Kurir Tukar dulu --</option>';
    } else if (jenis === 'Izin' || jenis === 'Sakit') fillTanggalAll('form-pengajuan-tanggal');
    else fillTanggalOffKurir(nama, 'form-pengajuan-tanggal');
}

window.openJadwalPopup = function (key = '', item = null) {
    editingJadwalKey = key || null;
    document.getElementById('jadwal-key').value = key || '';
    document.getElementById('jadwal-nama').value = item?.nama || '';
    document.getElementById('jadwal-mulai').value = item?.tanggalMulai || '';
    document.getElementById('jadwal-selesai').value = item?.tanggalSelesai || item?.tanggalMulai || '';
    document.getElementById('jadwal-jenis').value = item?.jenisOff || 'Off Reguler';
    document.getElementById('jadwal-ket').value = item?.keterangan || '';
    document.getElementById('popup-jadwal').classList.remove('hidden');
    document.getElementById('popup-jadwal').classList.add('flex');
};
window.closeJadwalPopup = () => {
    document.getElementById('popup-jadwal').classList.add('hidden');
    document.getElementById('popup-jadwal').classList.remove('flex');
};
window.editJadwal = (key) => window.openJadwalPopup(key, DATA_JADWAL[key]);
window.hapusJadwal = async (key) => { if (await confirmAksi('Hapus jadwal ini?')) { await remove(ref(db, `jadwal_off/${key}`)); notify('Jadwal dihapus'); } };

function openAbsensiPopup(key = '', item = null) {
    editingAbsensiKey = key || null;
    const fixTime = (t) => (t || '').replace('.', ':');
    const tanggal = item?.tanggal || todayISO();
    const namaKurir = item?.namaKurir || '';
    const idKurir = item?.idKurir || '';

    const found = Object.entries(DATA_ABSENSI).map(([k, a]) => ({ key: k, ...a })).find((a) => a.tanggal === tanggal && ((a.idKurir || '') === idKurir || (a.namaKurir || '') === namaKurir));
    const data = found || item || {};

    document.getElementById('absensi-tanggal').value = data.tanggal || tanggal;
    document.getElementById('absensi-nama').value = data.namaKurir || namaKurir || '';
    document.getElementById('absensi-masuk').value = fixTime(data.jamMasuk || '');
    document.getElementById('absensi-pulang').value = fixTime(data.jamPulang || '');
    document.getElementById('popup-manual-absensi').classList.remove('hidden');
    document.getElementById('popup-manual-absensi').classList.add('flex');
}
window.bukaModalAbsensiManual = function () { openAbsensiPopup(); };
window.openAbsensiForName = (nama) => {
    openAbsensiPopup('', { namaKurir: nama, tanggal: todayISO() });
};
window.openAbsensiEdit = function (tanggal, idTarget, namaKurir) {
    const targetId = (idTarget || '').trim().toLowerCase();
    const targetNama = (namaKurir || '').trim().toLowerCase();
    const found = Object.entries(DATA_ABSENSI).find(([key, a]) => {
        const idKurir = (a.idKurir || '').trim().toLowerCase();
        const username = (a.username || '').trim().toLowerCase();
        const nama = (a.namaKurir || '').trim().toLowerCase();
        return a.tanggal === tanggal && (idKurir === targetId || username === targetId || nama === targetNama || nama === targetId);
    });
    if (found) { const [key, data] = found; editingAbsensiKey = key; openAbsensiPopup(key, data); return; }

    editingAbsensiKey = null;
    const kurirData = Object.entries(DATA_USERS).find(([id, u]) => {
        const idL = (id || '').trim().toLowerCase();
        const userL = (u.username || '').trim().toLowerCase();
        const namaL = (u.nama || '').trim().toLowerCase();
        return idL === targetId || userL === targetId || namaL === targetNama || namaL === targetId;
    });
    const idKurir = kurirData?.[0] || '';
    const u = kurirData?.[1] || {};
    openAbsensiPopup('', { tanggal, idKurir, username: (u.username || '').trim(), namaKurir: (u.nama || namaKurir || '').trim(), leader: (u.leader || '').trim() });
};
window.closeAbsensiPopup = () => {
    document.getElementById('popup-manual-absensi').classList.add('hidden');
    document.getElementById('popup-manual-absensi').classList.remove('flex');
};
window.closePopupDetail = () => {
    document.getElementById('popup-detail').classList.add('hidden');
    document.getElementById('popup-detail').classList.remove('flex');
};

window.hapusAbsensi = async (key) => { if (await confirmAksi('Hapus absensi ini?')) { await remove(ref(db, `absensi_sahabatku/${key}`)); notify('Absensi dihapus'); } };
window.hapusAbsensiByTanggal = async (namaKurir, tanggal) => {
    const target = Object.entries(DATA_ABSENSI).find(([key, a]) => (a.namaKurir || '') === namaKurir && a.tanggal === tanggal);
    if (!target) { notify('Data alfa tidak ditemukan.'); return; }
    if (await confirmAksi('Hapus data ini?')) { await remove(ref(db, `absensi_sahabatku/${target[0]}`)); notify('Data dihapus'); }
};

// ---------------------------------------------------------------------
// Popup kartu ringkas: total kurir / off hari ini / off bulan ini
// ---------------------------------------------------------------------
window.openAdminPopupKurir = () => {
    const list = getKurirAktif().map((u) => `<div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"><div class="font-bold">${escapeHtml(u.nama)}</div><div class="text-[10px] text-slate-400">${escapeHtml(u.leader)}</div></div>`).join('');
    document.getElementById('popup-detail-title').textContent = 'Total Kurir Aktif';
    document.getElementById('popup-detail-content').innerHTML = list || '<div class="text-xs text-slate-400">Tidak ada kurir.</div>';
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
};
window.openAdminPopupOffHariIni = () => {
    const today = todayISO();
    const list = Object.values(DATA_JADWAL).filter((j) => j.tanggalMulai === today).map((j) => `
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex justify-between">
            <div><div class="font-bold">${escapeHtml(j.nama)}</div><div class="text-[10px] text-slate-400">${escapeHtml(j.keterangan || '-')}</div></div>
            <span class="px-2 py-1 rounded-full text-white text-[10px] font-bold ${jenisColor(j.jenisOff)}">${j.jenisOff}</span>
        </div>`).join('');
    document.getElementById('popup-detail-title').textContent = 'Off Hari Ini';
    document.getElementById('popup-detail-content').innerHTML = list || '<div class="text-xs text-slate-400">Tidak ada yang off hari ini.</div>';
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
};
window.openAdminPopupOffBulanIni = () => {
    const bulan = getBulanAktif();
    const list = Object.values(DATA_JADWAL).filter((j) => getTanggalItem(j).startsWith(bulan)).map((j) => `
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex justify-between">
            <div><div class="font-bold">${escapeHtml(j.nama)}</div><div class="text-[10px] text-slate-400">${getTanggalItem(j)}</div></div>
            <span class="px-2 py-1 rounded-full text-white text-[10px] font-bold ${jenisColor(j.jenisOff)}">${j.jenisOff}</span>
        </div>`).join('');
    document.getElementById('popup-detail-title').textContent = 'Off Bulan Ini';
    document.getElementById('popup-detail-content').innerHTML = list || '<div class="text-xs text-slate-400">Tidak ada data.</div>';
    document.getElementById('popup-detail').classList.remove('hidden');
    document.getElementById('popup-detail').classList.add('flex');
};

// ---------------------------------------------------------------------
// Navigasi tab & modal
// ---------------------------------------------------------------------
window.switchKurirTab = (tab, btn) => {
    kurirTab = tab;
    const root = document.getElementById('screen-absensi-kurir');
    if (!root) return;
    ['jadwal', 'pengajuan', 'rekap'].forEach((t) => {
        document.getElementById(`kurir-absensi-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    root.querySelectorAll('.absensi-tab-btn').forEach((b) => b.classList.remove('active'));
    (btn || root.querySelector(`.absensi-tab-btn[data-tab="${tab}"]`))?.classList.add('active');
    refreshIcons();
};

window.switchAdminTab = (tab, btn) => {
    adminTab = tab;
    const root = document.getElementById('screen-admin-absensi');
    if (!root) return;
    ['harian', 'jadwal', 'pengajuan', 'rekap'].forEach((t) => {
        document.getElementById(`admin-absensi-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    root.querySelectorAll('.absensi-tab-btn').forEach((b) => b.classList.remove('active'));
    (btn || root.querySelector(`.absensi-tab-btn[data-tab="${tab}"]`))?.classList.add('active');
    refreshIcons();
};

window.initAbsensiKurir = function () {
    const session = getSession();
    const namaSaya = session?.nama || '';
    const selectNama = document.getElementById('form-pengajuan-nama');
    if (selectNama && namaSaya && [...selectNama.options].some((o) => o.value === namaSaya)) {
        selectNama.value = namaSaya;
        updatePengajuanVisibility();
        renderKurirPengajuanList();
    }
    window.switchKurirTab('jadwal', document.querySelector('#screen-absensi-kurir [data-tab="jadwal"]'));
    refreshIcons();
};

// ---------------------------------------------------------------------
// Aksi pengajuan (submit, proses, hapus)
// ---------------------------------------------------------------------
function submitPengajuan() {
    const namaKurir = document.getElementById('form-pengajuan-nama').value;
    const jenisPengajuan = document.getElementById('form-pengajuan-jenis').value;
    const tanggalOff = document.getElementById('form-pengajuan-tanggal').value;
    const tanggalPindah = document.getElementById('form-pengajuan-tanggal-pindah').value;
    const kurirTukar = document.getElementById('form-pengajuan-kurir-tukar').value;
    const tanggalTukar = document.getElementById('form-pengajuan-tanggal-tukar').value;
    const keterangan = document.getElementById('form-pengajuan-ket').value.trim();

    if (!namaKurir || !jenisPengajuan) return notify('Nama kurir dan jenis pengajuan wajib diisi.');
    if (['Off Reguler', 'Tidak Ambil Off', 'Izin', 'Sakit'].includes(jenisPengajuan) && !tanggalOff) return notify('Tanggal wajib diisi.');
    if (jenisPengajuan === 'Pindah Off' && (!tanggalOff || !tanggalPindah)) return notify('Tanggal lama dan tanggal pindah wajib diisi.');
    if (jenisPengajuan === 'Tukar Off' && (!tanggalOff || !kurirTukar || !tanggalTukar)) return notify('Lengkapi data tukar off.');

    set(push(ref(db, 'pengajuan')), {
        namaKurir, jenisPengajuan, tanggalOff, tanggalPindah, kurirTukar, tanggalTukar, keterangan,
        status: 'Pending', timestamp: new Date().toISOString()
    }).then(() => {
        notify('Pengajuan berhasil dikirim');
        document.getElementById('form-pengajuan-jenis').value = '';
        document.getElementById('form-pengajuan-ket').value = '';
        document.getElementById('form-pengajuan-tanggal-pindah').value = '';
        document.getElementById('form-pengajuan-kurir-tukar').value = '';
        document.getElementById('form-pengajuan-tanggal-tukar').value = '';
        updatePengajuanVisibility();
    });
}

window.prosesPengajuan = async (key, statusBaru) => {
    const item = DATA_PENGAJUAN[key];
    if (!item) return;

    if (statusBaru !== 'Disetujui') {
        await update(ref(db, `pengajuan/${key}`), { status: statusBaru, updatedAt: new Date().toISOString() });
        notify(`Pengajuan ${statusBaru.toLowerCase()}`);
        return;
    }

    const nama = item.namaKurir || '';
    const tglOff = item.tanggalOff || '';
    const tglPindah = item.tanggalPindah || '';
    const kurirTukar = item.kurirTukar || '';
    const tglTukar = item.tanggalTukar || '';
    const jenis = (item.jenisPengajuan || '').toLowerCase();
    const findJadwal = (namaCari, tanggalCari) => Object.entries(DATA_JADWAL).find(([_, j]) => (j.nama || '') === namaCari && j.tanggalMulai === tanggalCari);

    if (jenis.includes('pindah')) {
        const oldItem = findJadwal(nama, tglOff);
        if (oldItem) remove(ref(db, `jadwal_off/${oldItem[0]}`));
        await set(push(ref(db, 'jadwal_off')), { nama, tanggalMulai: tglPindah, tanggalSelesai: tglPindah, jenisOff: 'Off Reguler', keterangan: item.keterangan || `Pindah off dari ${tglOff} ke ${tglPindah}`, status: 'Aktif', sourcePengajuan: key, timestamp: new Date().toISOString() });
    } else if (jenis.includes('tukar')) {
        const a = findJadwal(nama, tglOff);
        const b = findJadwal(kurirTukar, tglTukar);
        if (!a || !b) { notify('Jadwal tukar tidak ditemukan.'); return; }
        const dataA = DATA_JADWAL[a[0]];
        const dataB = DATA_JADWAL[b[0]];
        await update(ref(db, `jadwal_off/${a[0]}`), { nama: dataB.nama });
        await update(ref(db, `jadwal_off/${b[0]}`), { nama: dataA.nama });
    } else if (jenis === 'tidak ambil off') {
        const target = findJadwal(nama, tglOff);
        if (!target) { notify('Jadwal Off Reguler tidak ditemukan.'); return; }
        await update(ref(db, `jadwal_off/${target[0]}`), { jenisOff: 'Tidak Ambil Off', keterangan: item.keterangan || 'Tidak ambil off', updatedAt: new Date().toISOString() });
    } else {
        await set(push(ref(db, 'jadwal_off')), { nama, tanggalMulai: tglOff, tanggalSelesai: tglOff, jenisOff: item.jenisPengajuan, keterangan: item.keterangan || '', status: 'Aktif', sourcePengajuan: key, timestamp: new Date().toISOString() });
    }

    await update(ref(db, `pengajuan/${key}`), { status: 'Disetujui', updatedAt: new Date().toISOString() });
    notify('Pengajuan disetujui');
};

window.hapusPengajuan = async (key) => { if (await confirmAksi('Hapus riwayat pengajuan ini?')) { await remove(ref(db, `pengajuan/${key}`)); notify('Riwayat dihapus'); } };

// ---------------------------------------------------------------------
// Render induk & langganan data realtime
// ---------------------------------------------------------------------
function renderAll() {
    if (!currentViewDate || isNaN(currentViewDate.getTime())) currentViewDate = new Date();

    fillKurirSelects();
    fillTanggalAll('form-pengajuan-tanggal');
    fillTanggalAll('form-pengajuan-tanggal-pindah');

    renderKurirCalendar();
    renderKurirNotifikasiHariIni();
    renderKurirPengajuanList();
    renderKurirRekap();

    renderAdminCalendar();
    renderAdminJadwalListContent();
    renderAdminPengajuanList();
    renderAdminRiwayat();
    renderAdminRekap();
    window.renderAdminAbsensi();

    updatePengajuanVisibility();
    refreshIcons();
}

onValue(ref(db, 'users'), (snap) => { DATA_USERS = snap.val() || {}; renderAll(); });
onValue(ref(db, 'jadwal_off'), (snap) => { DATA_JADWAL = snap.val() || {}; renderAll(); });
onValue(ref(db, 'pengajuan'), (snap) => { DATA_PENGAJUAN = snap.val() || {}; renderAll(); });
onValue(ref(db, 'absensi_sahabatku'), (snap) => { DATA_ABSENSI = snap.val() || {}; renderAll(); });

// ---------------------------------------------------------------------
// Wiring event listener (sekali saja saat modul dimuat)
// ---------------------------------------------------------------------
document.getElementById('form-pengajuan-jenis')?.addEventListener('change', updatePengajuanVisibility);
document.getElementById('form-pengajuan-nama')?.addEventListener('change', () => { updatePengajuanVisibility(); renderKurirPengajuanList(); });
document.getElementById('form-pengajuan-kurir-tukar')?.addEventListener('change', (e) => {
    if (document.getElementById('form-pengajuan-jenis').value === 'Tukar Off') fillTanggalOffKurir(e.target.value, 'form-pengajuan-tanggal-tukar');
});
document.getElementById('btn-submit-pengajuan')?.addEventListener('click', submitPengajuan);

document.getElementById('kurir-prev')?.addEventListener('click', () => { currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1); renderAll(); });
document.getElementById('kurir-next')?.addEventListener('click', () => { currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1); renderAll(); });
document.getElementById('admin-prev')?.addEventListener('click', () => { currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1); renderAll(); });
document.getElementById('admin-next')?.addEventListener('click', () => { currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1); renderAll(); });

document.getElementById('kurir-search-jadwal')?.addEventListener('input', debounce(renderKurirJadwalList));
document.getElementById('kurir-search-pengajuan')?.addEventListener('input', debounce(renderKurirPengajuanList));
document.getElementById('kurir-search-rekap')?.addEventListener('input', debounce(renderKurirRekap));
document.getElementById('admin-search-pengajuan')?.addEventListener('input', debounce(renderAdminPengajuanList));
document.getElementById('admin-search-rekap')?.addEventListener('input', debounce(renderAdminRekap));
document.getElementById('admin-search-jadwal-list')?.addEventListener('input', debounce(renderAdminJadwalListContent));

document.getElementById('btn-admin-select-mode')?.addEventListener('click', (e) => {
    adminSelectMode = !adminSelectMode;
    e.target.textContent = adminSelectMode ? 'Batal' : 'Pilih';
    renderAdminPengajuanList();
});
document.getElementById('btn-admin-select-all')?.addEventListener('click', () => {
    const checks = [...document.querySelectorAll('.admin-check')];
    const all = checks.every((c) => c.checked);
    checks.forEach((c) => { c.checked = !all; });
});
document.getElementById('btn-admin-hapus-terpilih')?.addEventListener('click', async () => {
    const selected = [...document.querySelectorAll('.admin-check:checked')].map((c) => c.dataset.key);
    if (!selected.length) { notify('Pilih pengajuan terlebih dahulu.'); return; }
    if (!(await confirmAksi(`Hapus ${selected.length} pengajuan?`))) return;
    selected.forEach((k) => remove(ref(db, `pengajuan/${k}`)));
    notify('Pengajuan terpilih dihapus');
});

document.getElementById('btn-save-jadwal')?.addEventListener('click', async () => {
    const nama = document.getElementById('jadwal-nama').value;
    const tanggalMulai = document.getElementById('jadwal-mulai').value;
    const tanggalSelesai = document.getElementById('jadwal-selesai').value;
    const jenisOff = document.getElementById('jadwal-jenis').value;
    const keterangan = document.getElementById('jadwal-ket').value.trim();
    if (!nama || !tanggalMulai || !tanggalSelesai || !jenisOff) { notify('Lengkapi data jadwal.'); return; }

    const payload = { nama, tanggalMulai, tanggalSelesai, jenisOff, keterangan, status: 'Aktif', timestamp: new Date().toISOString() };
    if (editingJadwalKey) await update(ref(db, `jadwal_off/${editingJadwalKey}`), payload);
    else await set(push(ref(db, 'jadwal_off')), payload);

    notify('Jadwal berhasil disimpan');
    document.getElementById('jadwal-nama').value = '';
    document.getElementById('jadwal-mulai').value = '';
    document.getElementById('jadwal-selesai').value = '';
    document.getElementById('jadwal-ket').value = '';
    document.getElementById('jadwal-jenis').value = 'Off Reguler';
    setTimeout(() => window.closeJadwalPopup(), 400);
});

document.getElementById('btn-save-absensi')?.addEventListener('click', async () => {
    const tanggal = document.getElementById('absensi-tanggal').value;
    const namaKurir = document.getElementById('absensi-nama').value;
    const jamMasuk = document.getElementById('absensi-masuk').value;
    const jamPulang = document.getElementById('absensi-pulang').value;

    const kurirDataEntry = Object.entries(DATA_USERS).find(([id, u]) => (u.nama || u.username || '').trim() === namaKurir);
    const idKurir = kurirDataEntry?.[0] || '';
    const kurirData = kurirDataEntry?.[1] || {};
    const leader = kurirData?.leader || '';
    const username = (kurirData?.username || '').trim();

    if (!tanggal || !namaKurir) { notify('Tanggal dan nama kurir wajib diisi.'); return; }

    const existing = Object.entries(DATA_ABSENSI).find(([key, a]) => a.tanggal === tanggal && (a.idKurir === idKurir || a.namaKurir === namaKurir));
    const oldData = existing?.[1] || {};
    const key = editingAbsensiKey || existing?.[0] || `${tanggal}_${idKurir || namaKurir}`;

    const payload = {
        tanggal, idKurir, username, namaKurir, leader,
        fotoMasuk: oldData.fotoMasuk || '', fotoPulang: oldData.fotoPulang || '',
        jamMasuk: jamMasuk || oldData.jamMasuk || '', jamPulang: jamPulang || oldData.jamPulang || '',
        timestamp: oldData.timestamp || new Date().toISOString()
    };

    await set(ref(db, `absensi_sahabatku/${key}`), payload);
    editingAbsensiKey = null;
    window.closeAbsensiPopup();
    notify('Absensi berhasil disimpan');
});

// ---------------------------------------------------------------------
// Inisialisasi
// ---------------------------------------------------------------------
currentViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
renderAll();
window.switchAdminTab('harian', document.querySelector('#screen-admin-absensi [data-tab="harian"]'));

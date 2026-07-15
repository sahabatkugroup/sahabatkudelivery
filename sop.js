import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const sopApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const sopDb = getDatabase(sopApp);

let sopList = {};          // cache realtime dari node sop_list
let sopAdminListOpen = false; // status buka/tutup daftar di layar admin

// ---------------------------------------------------------------------
// Helper kecil
// ---------------------------------------------------------------------
function sopNotify(message) {
    if (typeof window.toast === 'function') window.toast(message);
}

function sopEscapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Ubah berbagai bentuk link (Google Docs / Drive / PDF langsung) jadi
// URL yang bisa ditampilkan sebagai pratinjau di dalam <iframe>.
function sopGetEmbedUrl(rawLink) {
    const link = String(rawLink || '').trim();
    if (!link) return '';

    try {
        const url = new URL(link);
        const host = url.hostname.replace('www.', '');

        // Google Docs / Sheets / Slides -> mode /preview
        if (host === 'docs.google.com') {
            const m = url.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
            if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
        }

        // Google Drive file -> mode /preview
        if (host === 'drive.google.com') {
            const m = url.pathname.match(/\/file\/d\/([^/]+)/);
            if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
            const idParam = url.searchParams.get('id');
            if (idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
        }

        // Link PDF langsung atau link lain -> pakai Google Docs Viewer
        return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(link)}`;
    } catch (e) {
        return '';
    }
}

function sopIsValidUrl(link) {
    try {
        const u = new URL(link);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// ---------------------------------------------------------------------
// Realtime listener (tanpa loop/polling — event-driven)
// ---------------------------------------------------------------------
onValue(ref(sopDb, 'sop_list'), (snapshot) => {
    sopList = snapshot.val() || {};
    renderAdminSOPList();
    renderKurirSOPList();
});

function sopSortedEntries() {
    return Object.entries(sopList || {}).sort((a, b) => {
        const ta = a[1]?.createdAt || 0;
        const tb = b[1]?.createdAt || 0;
        return ta - tb; // urut sesuai waktu ditambahkan
    });
}

// Filter daftar berdasarkan kata kunci pencarian (judul & deskripsi)
function sopFilterEntries(entries, keyword) {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(([, data]) => {
        const judul = (data?.judul || '').toLowerCase();
        const deskripsi = (data?.deskripsi || '').toLowerCase();
        return judul.includes(q) || deskripsi.includes(q);
    });
}

// ---------------------------------------------------------------------
// Judul app-bar khusus layar screen-admin-sop (tanpa mengubah script.js)
// ---------------------------------------------------------------------
if (typeof window.navigateTo === 'function') {
    const baseNavigateTo = window.navigateTo;
    window.navigateTo = function(screenId) {
        baseNavigateTo(screenId);
        if (screenId === 'screen-admin-sop') {
            const titleEl = document.getElementById('app-bar-title');
            const iconEl = document.getElementById('app-bar-icon');
            if (titleEl) titleEl.innerText = 'Peraturan & SOP Kerja';
            if (iconEl) {
                iconEl.setAttribute('data-lucide', 'book-marked');
                if (window.lucide) lucide.createIcons();
            }
        }
    };
}

// ---------------------------------------------------------------------
// ADMIN: Form Tambah / Edit
// ---------------------------------------------------------------------
window.saveSOP = async function() {
    const idEl = document.getElementById('sop-id-edit');
    const judulEl = document.getElementById('sop-judul');
    const linkEl = document.getElementById('sop-link');
    const descEl = document.getElementById('sop-deskripsi');

    const id = (idEl?.value || '').trim();
    const judul = (judulEl?.value || '').trim();
    const link = (linkEl?.value || '').trim();
    const deskripsi = (descEl?.value || '').trim();

    if (!judul) { sopNotify('Judul peraturan/SOP wajib diisi.'); return; }
    if (!link) { sopNotify('Link Google Docs/Drive/PDF wajib diisi.'); return; }
    if (!sopIsValidUrl(link)) { sopNotify('Format link tidak valid, mohon periksa kembali.'); return; }

    const saveBtnText = document.getElementById('sop-btn-save-text');
    if (saveBtnText) saveBtnText.innerText = 'Menyimpan...';

    try {
        const payload = {
            judul,
            link,
            deskripsi,
            updatedAt: Date.now()
        };

        if (id) {
            payload.createdAt = sopList[id]?.createdAt || Date.now();
            await set(ref(sopDb, `sop_list/${id}`), payload);
            sopNotify('Peraturan/SOP berhasil diperbarui.');
        } else {
            payload.createdAt = Date.now();
            await set(push(ref(sopDb, 'sop_list')), payload);
            sopNotify('Peraturan/SOP baru berhasil disimpan.');
        }

        window.resetSOPForm();
    } catch (err) {
        console.error(err);
        sopNotify('Gagal menyimpan data, silakan coba lagi.');
    } finally {
        if (saveBtnText) saveBtnText.innerText = 'Simpan';
    }
};

window.resetSOPForm = function() {
    const idEl = document.getElementById('sop-id-edit');
    const judulEl = document.getElementById('sop-judul');
    const linkEl = document.getElementById('sop-link');
    const descEl = document.getElementById('sop-deskripsi');
    const titleForm = document.getElementById('sop-title-form');

    if (idEl) idEl.value = '';
    if (judulEl) judulEl.value = '';
    if (linkEl) linkEl.value = '';
    if (descEl) descEl.value = '';
    if (titleForm) titleForm.innerText = 'Tambah Peraturan / SOP';
};

window.editSOP = function(id) {
    const data = sopList[id];
    if (!data) { sopNotify('Data tidak ditemukan.'); return; }

    const idEl = document.getElementById('sop-edit-id');
    const judulEl = document.getElementById('sop-edit-judul');
    const linkEl = document.getElementById('sop-edit-link');
    const descEl = document.getElementById('sop-edit-deskripsi');

    if (idEl) idEl.value = id;
    if (judulEl) judulEl.value = data.judul || '';
    if (linkEl) linkEl.value = data.link || '';
    if (descEl) descEl.value = data.deskripsi || '';

    const modal = document.getElementById('modal-sop-edit');
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
};

window.closeSOPEditModal = function() {
    const modal = document.getElementById('modal-sop-edit');
    if (modal) modal.classList.add('hidden');
};

window.saveSOPEditModal = async function() {
    const idEl = document.getElementById('sop-edit-id');
    const judulEl = document.getElementById('sop-edit-judul');
    const linkEl = document.getElementById('sop-edit-link');
    const descEl = document.getElementById('sop-edit-deskripsi');

    const id = (idEl?.value || '').trim();
    const judul = (judulEl?.value || '').trim();
    const link = (linkEl?.value || '').trim();
    const deskripsi = (descEl?.value || '').trim();

    if (!id) { sopNotify('Data tidak ditemukan.'); return; }
    if (!judul) { sopNotify('Judul peraturan/SOP wajib diisi.'); return; }
    if (!link) { sopNotify('Link Google Docs/Drive/PDF wajib diisi.'); return; }
    if (!sopIsValidUrl(link)) { sopNotify('Format link tidak valid, mohon periksa kembali.'); return; }

    const saveBtnText = document.getElementById('sop-edit-btn-save-text');
    if (saveBtnText) saveBtnText.innerText = 'Menyimpan...';

    try {
        const payload = {
            judul,
            link,
            deskripsi,
            createdAt: sopList[id]?.createdAt || Date.now(),
            updatedAt: Date.now()
        };
        await set(ref(sopDb, `sop_list/${id}`), payload);
        sopNotify('Peraturan/SOP berhasil diperbarui.');
        window.closeSOPEditModal();
    } catch (err) {
        console.error(err);
        sopNotify('Gagal menyimpan data, silakan coba lagi.');
    } finally {
        if (saveBtnText) saveBtnText.innerText = 'Simpan';
    }
};

window.deleteSOP = async function(id) {
    const data = sopList[id];
    if (!data) return;

    const ok = await window.showConfirm(`Hapus peraturan/SOP "${data.judul}"? Kurir tidak akan melihatnya lagi.`);
    if (!ok) return;

    try {
        await remove(ref(sopDb, `sop_list/${id}`));
        sopNotify('Peraturan/SOP berhasil dihapus.');
        const idEl = document.getElementById('sop-id-edit');
        if (idEl && idEl.value === id) window.resetSOPForm();
    } catch (err) {
        console.error(err);
        sopNotify('Gagal menghapus data, silakan coba lagi.');
    }
};

// ---------------------------------------------------------------------
// ADMIN: Daftar (toggle buka/tutup, seperti pola daftar mitra)
// ---------------------------------------------------------------------
window.toggleAdminSOPListOpen = function() {
    sopAdminListOpen = !sopAdminListOpen;
    renderAdminSOPList();
};

window.renderAdminSOPList = renderAdminSOPList;
function renderAdminSOPList() {
    const container = document.getElementById('container-admin-sop-list');
    const btnText = document.getElementById('sop-btn-toggle-text');
    const btnIcon = document.getElementById('sop-btn-toggle-icon');
    if (!container) return;

    if (btnText) btnText.innerText = sopAdminListOpen ? 'Tutup' : 'Buka';
    if (btnIcon) btnIcon.style.transform = sopAdminListOpen ? 'rotate(180deg)' : 'rotate(0deg)';

    if (!sopAdminListOpen) {
        container.innerHTML = '';
        return;
    }

    const allEntries = sopSortedEntries();
    const searchEl = document.getElementById('sop-admin-search');
    const entries = sopFilterEntries(allEntries, searchEl?.value);

    if (!allEntries.length) {
        container.innerHTML = `
            <div class="text-center py-6 space-y-1">
                <div class="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="book-x" class="w-5 h-5"></i></div>
                <p class="text-xs text-slate-400">Belum ada peraturan/SOP ditambahkan.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (!entries.length) {
        container.innerHTML = `
            <div class="text-center py-6 space-y-1">
                <div class="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="search-x" class="w-5 h-5"></i></div>
                <p class="text-xs text-slate-400">Tidak ada hasil untuk pencarian tersebut.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const idxMap = new Map(allEntries.map(([id], i) => [id, i + 1]));

    container.innerHTML = entries.map(([id, data]) => `
        <div class="list-card-hover bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
            <div class="flex items-start gap-3">
                <div class="icon-tile shrink-0" data-tone="orange" style="width:34px;height:34px;">
                    <span class="text-[11px] font-black">${idxMap.get(id)}</span>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-100 leading-snug break-words">${sopEscapeHtml(data.judul)}</p>
                    ${data.deskripsi ? `<p class="text-[10.5px] text-slate-400 mt-0.5 leading-relaxed break-words">${sopEscapeHtml(data.deskripsi)}</p>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-3 gap-1.5 mt-3">
                <button onclick="previewSOPAdmin('${id}')" class="py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9.5px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="eye" class="w-3 h-3"></i> Preview</button>
                <button onclick="editSOP('${id}')" class="py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9.5px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="pencil" class="w-3 h-3"></i> Edit</button>
                <button onclick="deleteSOP('${id}')" class="py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9.5px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------------------
// KURIR: Daftar panduan (di dalam modal-sop, tombol "SOP" di dashboard)
// ---------------------------------------------------------------------
window.openSOP = function() {
    const searchEl = document.getElementById('sop-kurir-search');
    if (searchEl) searchEl.value = '';
    renderKurirSOPList();
    const modal = document.getElementById('modal-sop');
    if (modal) modal.classList.remove('hidden');
};

window.renderKurirSOPList = renderKurirSOPList;
function renderKurirSOPList() {
    const container = document.getElementById('kurir-sop-list');
    if (!container) return;

    const allEntries = sopSortedEntries();
    const searchEl = document.getElementById('sop-kurir-search');
    const entries = sopFilterEntries(allEntries, searchEl?.value);

    if (!allEntries.length) {
        container.innerHTML = `
            <div class="text-center py-8 space-y-1.5">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="book-x" class="w-5 h-5"></i></div>
                <p class="text-xs text-slate-400">Belum ada peraturan/SOP dari Admin.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (!entries.length) {
        container.innerHTML = `
            <div class="text-center py-8 space-y-1.5">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="search-x" class="w-5 h-5"></i></div>
                <p class="text-xs text-slate-400">Tidak ada hasil untuk pencarian tersebut.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const idxMap = new Map(allEntries.map(([id], i) => [id, i + 1]));

    container.innerHTML = entries.map(([id, data]) => `
        <button onclick="previewSOPKurir('${id}')" class="w-full text-left list-card-hover bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform">
            <div class="icon-tile shrink-0" data-tone="orange" style="width:32px;height:32px;">
                <span class="text-[11px] font-black">${idxMap.get(id)}</span>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-700 dark:text-slate-100 leading-snug break-words">${sopEscapeHtml(data.judul)}</p>
                ${data.deskripsi ? `<p class="text-[10px] text-slate-400 mt-0.5 leading-relaxed break-words line-clamp-2">${sopEscapeHtml(data.deskripsi)}</p>` : ''}
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 shrink-0"></i>
        </button>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------------------
// Modal Pratinjau (dipakai bersama oleh admin & kurir)
// ---------------------------------------------------------------------
function sopOpenPreview(id) {
    const data = sopList[id];
    if (!data) { sopNotify('Data tidak ditemukan.'); return; }

    const embedUrl = sopGetEmbedUrl(data.link);
    if (!embedUrl) { sopNotify('Link tidak valid untuk dipratinjau.'); return; }

    const titleEl = document.getElementById('sop-preview-title');
    const descEl = document.getElementById('sop-preview-desc');
    const openLinkEl = document.getElementById('sop-preview-open-link');
    const loadingEl = document.getElementById('sop-preview-loading');
    const iframeEl = document.getElementById('sop-preview-iframe');
    const modal = document.getElementById('modal-sop-preview');

    if (titleEl) titleEl.innerText = data.judul || 'Pratinjau';
    if (descEl) descEl.innerText = data.deskripsi || '';
    if (openLinkEl) openLinkEl.href = data.link;
    if (loadingEl) loadingEl.classList.remove('hidden');

    if (iframeEl) {
        iframeEl.onload = () => { if (loadingEl) loadingEl.classList.add('hidden'); };
        iframeEl.src = embedUrl;
    }

    if (modal) modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

window.previewSOPAdmin = function(id) { sopOpenPreview(id); };
window.previewSOPKurir = function(id) { sopOpenPreview(id); };

window.closeSOPPreview = function() {
    const modal = document.getElementById('modal-sop-preview');
    const iframeEl = document.getElementById('sop-preview-iframe');
    if (modal) modal.classList.add('hidden');
    // Hentikan iframe supaya tidak terus memuat/menghabiskan memori di HP.
    if (iframeEl) iframeEl.src = 'about:blank';
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ===================================================================
// FITUR "JELAJAH KEDAI" — daftar kedai non mitra Sahabatku.
// Menggunakan project Firebase TERPISAH dari aplikasi utama, sesuai
// permintaan, supaya datanya tidak bercampur dengan database utama.
// ===================================================================
const firebaseConfigJelajah = {
    apiKey: "AIzaSyApP7-PPtMf3c4yn_Yzm-xYvkKPf9K1N4Y",
    authDomain: "daftarkedaikemitraan.firebaseapp.com",
    databaseURL: "https://daftarkedaikemitraan-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "daftarkedaikemitraan",
    storageBucket: "daftarkedaikemitraan.firebasestorage.app",
    messagingSenderId: "543218937987",
    appId: "1:543218937987:web:a40e427d6befb6c866ebb6",
    measurementId: "G-C66WQ6FHX1"
};

const appJelajah = initializeApp(firebaseConfigJelajah, "jelajahKedaiApp");
const dbJelajah = getDatabase(appJelajah);

let cloudKedaiList = {};
let jelajahListOpen = false;

function getSessionUser() {
    try {
        const saved = localStorage.getItem('sahabatku_session');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

function buildMapsLink(alamat) {
    if (!alamat) return '#';
    const trimmed = String(alamat).trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(trimmed);
}

function buildWaLink(noHp) {
    if (!noHp) return '#';
    let digits = String(noHp).replace(/[^0-9]/g, '');
    if (!digits) return '#';
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (!digits.startsWith('62')) digits = '62' + digits;
    return 'https://wa.me/' + digits;
}

function escapeHtmlJelajah(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===================================================================
// NAVIGASI & LISTENER REALTIME
// ===================================================================
window.bukaJelajahKedai = function() {
    if (typeof window.navigateTo === 'function') window.navigateTo('screen-jelajah-kedai');

    // Selalu mulai dari kondisi tertutup setiap kali masuk menu ini,
    // supaya list tidak langsung dirender/loop di background.
    jelajahListOpen = false;
    const container = document.getElementById('container-jelajah-kedai');
    const textEl = document.getElementById('jelajah-btn-toggle-text');
    const iconEl = document.getElementById('jelajah-btn-toggle-icon');
    if (container) container.classList.add('hidden');
    if (textEl) textEl.innerText = 'Buka';
    if (iconEl) iconEl.style.transform = 'rotate(0deg)';
};

window.toggleJelajahKedaiListOpen = function() {
    jelajahListOpen = !jelajahListOpen;

    const container = document.getElementById('container-jelajah-kedai');
    const textEl = document.getElementById('jelajah-btn-toggle-text');
    const iconEl = document.getElementById('jelajah-btn-toggle-icon');

    if (jelajahListOpen) {
        if (container) container.classList.remove('hidden');
        if (textEl) textEl.innerText = 'Tutup';
        if (iconEl) iconEl.style.transform = 'rotate(180deg)';
        renderJelajahKedai();
    } else {
        if (container) container.classList.add('hidden');
        if (textEl) textEl.innerText = 'Buka';
        if (iconEl) iconEl.style.transform = 'rotate(0deg)';
    }
};

onValue(ref(dbJelajah, 'kedai_list'), (snapshot) => {
    cloudKedaiList = snapshot.val() || {};
    const screenEl = document.getElementById('screen-jelajah-kedai');
    const isActiveScreen = screenEl && screenEl.classList.contains('active');
    if (isActiveScreen && jelajahListOpen) renderJelajahKedai();
});

// ===================================================================
// RENDER LIST + FILTER PENCARIAN
// ===================================================================
window.renderJelajahKedai = function() {
    if (!jelajahListOpen) return;

    const container = document.getElementById('container-jelajah-kedai');
    if (!container) return;

    const keyword = (document.getElementById('cari-kedai')?.value || '').toLowerCase().trim();

    const entries = Object.entries(cloudKedaiList || {})
        .filter(([_, k]) => k && (!keyword || (k.nama || '').toLowerCase().includes(keyword)))
        .sort((a, b) => (a[1].nama || '').localeCompare(b[1].nama || ''));

    if (entries.length === 0) {
        container.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">
            <i data-lucide="store" class="w-6 h-6 mx-auto mb-2 opacity-40"></i>
            ${keyword ? 'Kedai tidak ditemukan.' : 'Belum ada data kedai. Tap tombol + untuk menambahkan.'}
        </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = entries.map(([key, k], idx) => {
        const status = k.status === 'buka' ? 'buka' : 'tutup';
        const nomorUrut = idx + 1;
        const nama = escapeHtmlJelajah(k.nama || '-');
        const alamat = escapeHtmlJelajah(k.alamat || '-');
        const noHp = escapeHtmlJelajah(k.noHp || '-');
        const mapsLink = buildMapsLink(k.alamat);
        const waLink = buildWaLink(k.noHp);

        return `
            <div class="bg-white dark:bg-darkCard p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex items-start gap-2">
                        <span class="shrink-0 w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-500 text-[10px] font-bold flex items-center justify-center mt-0.5">${nomorUrut}</span>
                        <div class="min-w-0">
                            <p class="font-bold text-sm text-slate-700 dark:text-slate-100 truncate">${nama}</p>
                            <p class="text-[9.5px] text-slate-400 truncate">Ditambahkan oleh ${escapeHtmlJelajah(k.createdByNama || '-')}</p>
                        </div>
                    </div>
                    <button onclick="toggleStatusKedai('${key}')" class="shrink-0 status-pill ${status === 'buka' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">
                        <i data-lucide="${status === 'buka' ? 'check' : 'x'}" class="w-2.5 h-2.5"></i> ${status === 'buka' ? 'Buka' : 'Tutup'}
                    </button>
                </div>

                <a href="${mapsLink}" target="_blank" rel="noopener" class="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 active:scale-95 transition-transform">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5"></i>
                    <span class="underline decoration-dotted decoration-slate-300 leading-snug">${alamat}</span>
                </a>
                <a href="${waLink}" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 active:scale-95 transition-transform">
                    <i data-lucide="phone" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i>
                    <span class="underline decoration-dotted decoration-slate-300">${noHp}</span>
                </a>

                <div class="flex justify-end gap-2 pt-1">
                    <button onclick="bukaFormKedai('${key}')" class="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform text-[10.5px]"><i data-lucide="pencil-line" class="w-3 h-3"></i> Ubah</button>
                    <button onclick="hapusKedai('${key}')" class="flex items-center gap-1 text-danger font-bold bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform text-[10.5px]"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
};

// ===================================================================
// FORM TAMBAH / UBAH KEDAI
// ===================================================================
window.bukaFormKedai = function(key) {
    const judul = document.getElementById('judul-form-kedai');
    const inputKey = document.getElementById('kedai-key-edit');
    const inputNama = document.getElementById('kedai-nama');
    const inputAlamat = document.getElementById('kedai-alamat');
    const inputNoHp = document.getElementById('kedai-nohp');

    if (key && cloudKedaiList[key]) {
        const k = cloudKedaiList[key];
        if (judul) judul.innerHTML = '<i data-lucide="pencil-line" class="w-4 h-4 text-orange-500"></i> Ubah Kedai';
        if (inputKey) inputKey.value = key;
        if (inputNama) inputNama.value = k.nama || '';
        if (inputAlamat) inputAlamat.value = k.alamat || '';
        if (inputNoHp) inputNoHp.value = k.noHp || '';
    } else {
        if (judul) judul.innerHTML = '<i data-lucide="store" class="w-4 h-4 text-orange-500"></i> Tambah Kedai';
        if (inputKey) inputKey.value = '';
        if (inputNama) inputNama.value = '';
        if (inputAlamat) inputAlamat.value = '';
        if (inputNoHp) inputNoHp.value = '';
    }

    const modal = document.getElementById('modal-form-kedai');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    if (window.lucide) lucide.createIcons();
};

window.tutupFormKedai = function() {
    const modal = document.getElementById('modal-form-kedai');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.simpanFormKedai = function() {
    const key = document.getElementById('kedai-key-edit')?.value || '';
    const nama = (document.getElementById('kedai-nama')?.value || '').trim();
    const alamat = (document.getElementById('kedai-alamat')?.value || '').trim();
    const noHp = (document.getElementById('kedai-nohp')?.value || '').trim();

    if (!nama) { window.toast?.('Nama kedai wajib diisi!'); return; }
    if (!alamat) { window.toast?.('Alamat / link maps wajib diisi!'); return; }
    if (!noHp) { window.toast?.('No HP kedai wajib diisi!'); return; }

    const session = getSessionUser();

    if (key) {
        // Mode ubah — jangan timpa status buka/tutup & pencatat asal
        update(ref(dbJelajah, `kedai_list/${key}`), {
            nama,
            alamat,
            noHp,
            updatedAt: new Date().toISOString(),
            updatedBy: session?.username || '-',
            updatedByNama: session?.nama || '-'
        }).then(() => {
            window.toast?.('Data kedai berhasil diperbarui!');
            window.tutupFormKedai();
        }).catch(err => {
            window.toast?.('Gagal menyimpan: ' + err.message);
        });
    } else {
        const newRef = push(ref(dbJelajah, 'kedai_list'));
        set(newRef, {
            nama,
            alamat,
            noHp,
            status: 'tutup',
            createdAt: new Date().toISOString(),
            createdBy: session?.username || '-',
            createdByNama: session?.nama || '-'
        }).then(() => {
            window.toast?.('Kedai berhasil ditambahkan!');
            window.tutupFormKedai();
        }).catch(err => {
            window.toast?.('Gagal menambahkan: ' + err.message);
        });
    }
};

window.hapusKedai = async function(key) {
    const k = cloudKedaiList[key];
    if (!k) { window.toast?.('Data kedai tidak ditemukan!'); return; }

    const ok = window.showConfirm
        ? await window.showConfirm(`Hapus data kedai "${k.nama}"? Data yang dihapus tidak bisa dikembalikan.`, { title: 'Hapus Kedai', okText: 'Ya, Hapus' })
        : confirm(`Hapus data kedai "${k.nama}"?`);
    if (!ok) return;

    remove(ref(dbJelajah, `kedai_list/${key}`)).then(() => {
        window.toast?.('Kedai berhasil dihapus.');
    }).catch(err => {
        window.toast?.('Gagal menghapus: ' + err.message);
    });
};

window.toggleStatusKedai = function(key) {
    const k = cloudKedaiList[key];
    if (!k) { window.toast?.('Data kedai tidak ditemukan!'); return; }

    const statusBaru = k.status === 'buka' ? 'tutup' : 'buka';
    update(ref(dbJelajah, `kedai_list/${key}`), { status: statusBaru }).then(() => {
        window.toast?.(`Status kedai "${k.nama}" diubah jadi ${statusBaru === 'buka' ? 'Buka' : 'Tutup'}.`);
    }).catch(err => {
        window.toast?.('Gagal mengubah status: ' + err.message);
    });
};

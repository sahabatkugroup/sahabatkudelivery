const firebaseConfigProfilKurir = {
  apiKey: "AIzaSyDweL8xXcOu6ZODYzCa1KpqZVPLH5Ocijk",
  authDomain: "aplikasi-sahabatkugroup.firebaseapp.com",
  databaseURL: "https://aplikasi-sahabatkugroup-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aplikasi-sahabatkugroup",
  storageBucket: "aplikasi-sahabatkugroup.firebasestorage.app",
  messagingSenderId: "323288632862",
  appId: "1:323288632862:web:57f12fbb5b18ad0fbd680f",
  measurementId: "G-788RL05MFR"
};

const profilKurirApp = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(firebaseConfigProfilKurir);
const dbProfilKurir = profilKurirApp.database();

// Cache lokal (realtime, di-refresh otomatis) — bukan loop render, cuma
// menyimpan snapshot data terakhir supaya modal bisa dibuka instan.
let cloudProfilKurirList = {};   // profil YANG SUDAH DISETUJUI (resmi)
let cloudProfilPendingList = {}; // pengajuan kurir yang BELUM ditinjau admin

dbProfilKurir.ref('profil_kurir').on('value', (snap) => {
  cloudProfilKurirList = snap.val() || {};
});

dbProfilKurir.ref('profil_kurir_pending').on('value', (snap) => {
  cloudProfilPendingList = snap.val() || {};
  perbaruiBadgePendingMenu();
  // Kalau admin sedang berada di layar Data Akun Kurir, refresh daftarnya
  // supaya tanda "menunggu persetujuan" langsung muncul/hilang realtime.
  if (typeof window.renderAdminKurirList === 'function') {
    try { window.renderAdminKurirList(); } catch (e) {}
  }
});

// Diekspos supaya script.js (module terpisah) bisa baca status pending per kurir.
window.getCloudProfilPendingList = function() { return cloudProfilPendingList; };

function perbaruiBadgePendingMenu() {
  const badge = document.getElementById('badge-profil-pending-menu');
  if (!badge) return;
  const jumlah = Object.keys(cloudProfilPendingList || {}).length;
  if (jumlah > 0) {
    badge.textContent = jumlah > 9 ? '9+' : String(jumlah);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ---------------------------------------------------------------------
// Util kecil
// ---------------------------------------------------------------------
function formatTanggalIndoProfil(tglStr) {
  if (!tglStr) return '';
  try {
    const d = new Date(tglStr + 'T00:00:00');
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return tglStr;
  }
}

function bersihkanAngkaProfil(teks) {
  return parseInt(String(teks || '').replace(/[^0-9]/g, ''), 10) || 0;
}

function formatRupiahProfil(nilai) {
  const n = parseInt(nilai) || 0;
  if (!n) return '';
  return 'Rp ' + n.toLocaleString('id-ID') + '/bulan';
}

function getSesiKurirSaya() {
  try {
    const raw = localStorage.getItem('sahabatku_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function tampilkanToastProfil(pesan) {
  if (typeof window.toast === 'function') window.toast(pesan);
}

// Menghitung lama bergabung (thn/bln/hari) dari tgl bergabung s/d hari ini,
// mengikuti zona waktu WIB (Asia/Jakarta). Dipanggil ulang setiap kali modal
// profil dibuka, sehingga otomatis "ter-update" tiap hari secara natural.
function hitungLamaBergabungProfil(tglGabungStr) {
  if (!tglGabungStr) return 'Tgl bergabung belum diatur';
  try {
    const [th, bl, tg] = tglGabungStr.split('-').map(Number);
    if (!th || !bl || !tg) return '-';
    const gabung = new Date(th, bl - 1, tg);

    // "Hari ini" mengikuti waktu WIB (Asia/Jakarta), bukan waktu lokal device.
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (gabung > hariIni) return 'Belum bergabung';
    if (gabung.getTime() === hariIni.getTime()) return 'Baru bergabung hari ini';

    // Hitung SECARA INKLUSIF — hari gabung itu sendiri dihitung sbg hari ke-1.
    // Contoh: gabung 1 Juli, dibuka tgl 19 Juli => "19 hr" (bukan 18).
    // Caranya: geser baseline mundur 1 hari, baru selisihkan seperti biasa.
    const baseline = new Date(gabung);
    baseline.setDate(baseline.getDate() - 1);

    let tahun = hariIni.getFullYear() - baseline.getFullYear();
    let bulan = hariIni.getMonth() - baseline.getMonth();
    let hari = hariIni.getDate() - baseline.getDate();

    if (hari < 0) {
      bulan -= 1;
      const akhirBulanLalu = new Date(hariIni.getFullYear(), hariIni.getMonth(), 0).getDate();
      hari += akhirBulanLalu;
    }
    if (bulan < 0) {
      tahun -= 1;
      bulan += 12;
    }

    const bagian = [];
    if (tahun > 0) bagian.push(`${tahun} tahun`);
    if (bulan > 0) bagian.push(`${bulan} bulan`);
    if (hari > 0 || bagian.length === 0) bagian.push(`${hari} hari`);

    return bagian.join(' ');
  } catch (e) {
    return '-';
  }
}

// ===================================================================
// POPUP "PROFIL SAYA" — sisi Kurir (form BISA DIEDIT), dibuka lewat tap
// avatar/nama di header dashboard. Menyimpan = mengajukan (pending).
// ===================================================================
window.bukaProfilSayaKurir = function() {
  const session = getSesiKurirSaya();
  if (!session || !session.id) {
    tampilkanToastProfil('Sesi login tidak ditemukan, silakan login ulang.');
    return;
  }

  const akun = (typeof window.getCloudKurirList === 'function' ? window.getCloudKurirList() : {})[session.id] || {};
  const approved = cloudProfilKurirList[session.id] || {};
  const pending = cloudProfilPendingList[session.id] || null;
  const sumber = pending || approved; // form diisi dari pengajuan yg blm ditinjau (kalau ada), else data resmi

  // NAMA yang tampil di header popup selalu dari data RESMI (yang sudah disetujui),
  // bukan dari pengajuan yg masih pending.
  const namaTampil = (approved.namaLengkap && approved.namaLengkap.trim()) ? approved.namaLengkap : (akun.nama || session.nama || '-');
  const statusAktif = (akun.status || 'aktif') === 'aktif';

  const elNama = document.getElementById('profil-saya-nama');
  const elBadge = document.getElementById('profil-saya-status-badge');
  if (elNama) elNama.innerText = namaTampil;
  if (elBadge) {
    elBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${statusAktif ? 'bg-emerald-300' : 'bg-rose-300'}"></span> ${statusAktif ? 'Akun Aktif' : 'Akun Nonaktif'}`;
  }

  // Badge "sudah bergabung sejak ..." — dihitung otomatis dari tgl bergabung.
  const elLamaGabung = document.getElementById('profil-saya-lama-bergabung-text');
  if (elLamaGabung) elLamaGabung.innerText = hitungLamaBergabungProfil(akun.tglGabung);

  // Info read-only
  const elIdCard = document.getElementById('kf-id-card-display');
  if (elIdCard) elIdCard.innerText = approved.noIdCard || 'Belum diatur Admin';
  const elTglGabung = document.getElementById('kf-tgl-gabung-display');
  if (elTglGabung) elTglGabung.innerText = formatTanggalIndoProfil(akun.tglGabung) || (akun.tglGabung || '-');
  const elStatus = document.getElementById('kf-status-display');
  if (elStatus) {
    elStatus.innerText = statusAktif ? 'AKTIF' : 'NONAKTIF';
    elStatus.className = `text-xs font-bold ${statusAktif ? 'text-emerald-600' : 'text-rose-500'}`;
  }

  // Isi form editable dari sumber (pending kalau ada, else data resmi)
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('kf-nama-lengkap', sumber.namaLengkap);
  setVal('kf-nik', sumber.nik);
  setVal('kf-tempat-lahir', sumber.tempatLahir);
  setVal('kf-tanggal-lahir', sumber.tanggalLahir);
  setVal('kf-hp-wa', sumber.noHpWa);
  setVal('kf-hp-kurir', sumber.noHpKurir);
  setVal('kf-alamat', sumber.alamatDomisili);
  setVal('kf-pekerjaan-lain', sumber.pekerjaanLain);
  setVal('kf-bpjs', sumber.noBpjs);
  setVal('kf-kelas-bpjs', sumber.kelasBpjs);
  setVal('kf-biaya-bpjs', sumber.biayaBpjs || '');
  setVal('kf-kontak-darurat-nama', sumber.kontakDaruratNama || sumber.kontakDarurat);
  setVal('kf-kontak-darurat-hp', sumber.kontakDaruratNoHp);

  // Isi tampilan MODE VIEW (read-only) — teks di sini dan value input di atas
  // sumbernya sama persis, cuma beda ditampilkan sbg teks vs form.
  const setTeks = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = (val && String(val).trim()) ? val : '-'; };
  setTeks('kfv-nama-lengkap', sumber.namaLengkap);
  setTeks('kfv-nik', sumber.nik);
  const ttl = [sumber.tempatLahir, formatTanggalIndoProfil(sumber.tanggalLahir)].filter(Boolean).join(', ');
  setTeks('kfv-ttl', ttl);
  setTeks('kfv-hp-wa', sumber.noHpWa);
  setTeks('kfv-hp-kurir', sumber.noHpKurir);
  setTeks('kfv-alamat', sumber.alamatDomisili);
  setTeks('kfv-pekerjaan-lain', sumber.pekerjaanLain);
  setTeks('kfv-bpjs', sumber.noBpjs);
  const kelasBiaya = [sumber.kelasBpjs, formatRupiahProfil(sumber.biayaBpjs)].filter(Boolean).join(' • ');
  setTeks('kfv-kelas-biaya-bpjs', kelasBiaya);
  setTeks('kfv-kontak-darurat-nama', sumber.kontakDaruratNama || sumber.kontakDarurat);
  setTeks('kfv-kontak-darurat-hp', sumber.kontakDaruratNoHp);

  // Banner status pengajuan
  const banner = document.getElementById('profil-saya-pending-banner');
  if (banner) banner.classList.toggle('hidden', !pending);

  // Setiap kali modal dibuka/direfresh, SELALU mulai dari mode VIEW dulu
  // (bukan langsung mode edit) — kurir tap tombol "Edit Data Diri" kalau
  // memang mau ubah.
  tampilkanModeViewProfilSaya();

  const modal = document.getElementById('modal-profil-saya');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Menampilkan MODE VIEW & menyembunyikan MODE EDIT.
function tampilkanModeViewProfilSaya() {
  const view = document.getElementById('profil-saya-view-mode');
  const edit = document.getElementById('profil-saya-edit-mode');
  if (view) view.classList.remove('hidden');
  if (edit) edit.classList.add('hidden');
}

// Kurir tap "Edit Data Diri" -> pindah ke mode form yang bisa diisi.
window.aktifkanModeEditProfilSaya = function() {
  const view = document.getElementById('profil-saya-view-mode');
  const edit = document.getElementById('profil-saya-edit-mode');
  if (view) view.classList.add('hidden');
  if (edit) edit.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Kurir tap "Batal" di mode edit -> balik ke mode view, buang perubahan
// yang belum disimpan (form diisi ulang dari data terakhir).
window.batalModeEditProfilSaya = function() {
  window.bukaProfilSayaKurir();
};

window.tutupProfilSayaKurir = function() {
  const modal = document.getElementById('modal-profil-saya');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  // Reset ke mode view supaya lain kali dibuka tidak nyangkut di mode edit.
  tampilkanModeViewProfilSaya();
};


// Kurir menyimpan/mengajukan perubahan -> masuk status PENDING, menunggu
// disetujui Admin. Data resmi ('profil_kurir') TIDAK berubah dulu di sini.
window.simpanProfilSayaKurir = function() {
  const session = getSesiKurirSaya();
  if (!session || !session.id) {
    tampilkanToastProfil('Sesi login tidak ditemukan, silakan login ulang.');
    return;
  }

  const namaLengkap = (document.getElementById('kf-nama-lengkap').value || '').trim();
  if (!namaLengkap) {
    tampilkanToastProfil('Nama Lengkap wajib diisi!');
    return;
  }

  const payload = {
    namaLengkap,
    nik: document.getElementById('kf-nik').value.trim(),
    tempatLahir: document.getElementById('kf-tempat-lahir').value.trim(),
    tanggalLahir: document.getElementById('kf-tanggal-lahir').value,
    noHpWa: document.getElementById('kf-hp-wa').value.trim(),
    noHpKurir: document.getElementById('kf-hp-kurir').value.trim(),
    alamatDomisili: document.getElementById('kf-alamat').value.trim(),
    pekerjaanLain: document.getElementById('kf-pekerjaan-lain').value.trim(),
    noBpjs: document.getElementById('kf-bpjs').value.trim(),
    kelasBpjs: document.getElementById('kf-kelas-bpjs').value,
    biayaBpjs: bersihkanAngkaProfil(document.getElementById('kf-biaya-bpjs').value),
    kontakDaruratNama: document.getElementById('kf-kontak-darurat-nama').value.trim(),
    kontakDaruratNoHp: document.getElementById('kf-kontak-darurat-hp').value.trim(),
    submittedAt: new Date().toISOString()
  };

  dbProfilKurir.ref(`profil_kurir_pending/${session.id}`).set(payload)
    .then(() => {
      tampilkanToastProfil('Perubahan berhasil dikirim, menunggu persetujuan Admin.');
      window.bukaProfilSayaKurir(); // refresh tampilan + otomatis balik ke mode view
    })
    .catch((err) => {
      tampilkanToastProfil('Gagal mengirim perubahan: ' + err.message);
    });
};

// Kurir batalkan pengajuannya sendiri sebelum ditinjau Admin.
window.batalkanPengajuanProfilKurir = async function() {
  const session = getSesiKurirSaya();
  if (!session || !session.id) return;

  const ok = typeof window.showConfirm === 'function'
    ? await window.showConfirm('Batalkan pengajuan perubahan profil ini?')
    : confirm('Batalkan pengajuan perubahan profil ini?');
  if (!ok) return;

  dbProfilKurir.ref(`profil_kurir_pending/${session.id}`).remove()
    .then(() => {
      tampilkanToastProfil('Pengajuan dibatalkan.');
      window.bukaProfilSayaKurir(); // refresh form kembali ke data resmi
    })
    .catch((err) => {
      tampilkanToastProfil('Gagal membatalkan: ' + err.message);
    });
};

// ===================================================================
// MODAL ADMIN — kelola & setujui/tolak Profil Data Diri per kurir
// (dibuka dari tombol "Profil Data Diri" / "Tinjau Perubahan" di kartu
// Data Akun Kurir, screen-admin-kurir).
// ===================================================================
window.bukaProfilAdminKurir = function(key) {
  if (!key) return;

  const akun = (typeof window.getCloudKurirList === 'function' ? window.getCloudKurirList() : {})[key] || {};
  const approved = cloudProfilKurirList[key] || {};
  const pending = cloudProfilPendingList[key] || null;
  const sumber = pending || approved; // form diisi dari pengajuan kurir kalau ada

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  setVal('profil-admin-key', key);
  const elNamaAkun = document.getElementById('profil-admin-nama-akun');
  if (elNamaAkun) elNamaAkun.innerText = akun.nama || '-';

  const elTglGabung = document.getElementById('profil-admin-tgl-gabung');
  if (elTglGabung) elTglGabung.innerText = formatTanggalIndoProfil(akun.tglGabung) || (akun.tglGabung || '-');

  const aktif = (akun.status || 'aktif') === 'aktif';
  const elStatus = document.getElementById('profil-admin-status');
  if (elStatus) {
    elStatus.innerText = aktif ? 'AKTIF' : 'NONAKTIF';
    elStatus.className = `text-xs font-bold mt-0.5 ${aktif ? 'text-emerald-600' : 'text-rose-500'}`;
  }

  setVal('profil-admin-nama-lengkap', sumber.namaLengkap);
  setVal('profil-admin-nik', sumber.nik);
  setVal('profil-admin-tempat-lahir', sumber.tempatLahir);
  setVal('profil-admin-tanggal-lahir', sumber.tanggalLahir);
  // No. ID Card SELALU dari data resmi — kurir tidak mengajukan field ini,
  // jadi tidak boleh ikut ke-overwrite dari sumber pending.
  setVal('profil-admin-id-card', approved.noIdCard);
  setVal('profil-admin-hp-wa', sumber.noHpWa);
  setVal('profil-admin-hp-kurir', sumber.noHpKurir);
  setVal('profil-admin-alamat', sumber.alamatDomisili);
  setVal('profil-admin-pekerjaan-lain', sumber.pekerjaanLain);
  setVal('profil-admin-bpjs', sumber.noBpjs);
  setVal('profil-admin-kelas-bpjs', sumber.kelasBpjs);
  setVal('profil-admin-biaya-bpjs', sumber.biayaBpjs || '');
  setVal('profil-admin-kontak-darurat-nama', sumber.kontakDaruratNama || sumber.kontakDarurat);
  setVal('profil-admin-kontak-darurat-hp', sumber.kontakDaruratNoHp);

  const banner = document.getElementById('profil-admin-pending-banner');
  const btnTolak = document.getElementById('btn-tolak-perubahan-profil');
  if (banner) banner.classList.toggle('hidden', !pending);
  if (btnTolak) btnTolak.classList.toggle('hidden', !pending);

  const modal = document.getElementById('modal-profil-admin');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.tutupProfilAdminKurir = function() {
  const modal = document.getElementById('modal-profil-admin');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

// Admin menyimpan (langsung berlaku sbg data resmi). Kalau sebelumnya ada
// pengajuan pending dari kurir, ini otomatis dianggap MENYETUJUI-nya
// (sekaligus membersihkan status pending-nya).
window.simpanProfilAdminKurir = function() {
  const key = (document.getElementById('profil-admin-key') || {}).value;
  if (!key) {
    tampilkanToastProfil('Data kurir tidak ditemukan.');
    return;
  }

  const namaLengkap = (document.getElementById('profil-admin-nama-lengkap').value || '').trim();
  if (!namaLengkap) {
    tampilkanToastProfil('Nama Lengkap wajib diisi!');
    return;
  }

  const adaPendingSebelumnya = !!cloudProfilPendingList[key];

  const payload = {
    namaLengkap,
    nik: document.getElementById('profil-admin-nik').value.trim(),
    tempatLahir: document.getElementById('profil-admin-tempat-lahir').value.trim(),
    tanggalLahir: document.getElementById('profil-admin-tanggal-lahir').value,
    noIdCard: document.getElementById('profil-admin-id-card').value.trim(),
    noHpWa: document.getElementById('profil-admin-hp-wa').value.trim(),
    noHpKurir: document.getElementById('profil-admin-hp-kurir').value.trim(),
    alamatDomisili: document.getElementById('profil-admin-alamat').value.trim(),
    pekerjaanLain: document.getElementById('profil-admin-pekerjaan-lain').value.trim(),
    noBpjs: document.getElementById('profil-admin-bpjs').value.trim(),
    kelasBpjs: document.getElementById('profil-admin-kelas-bpjs').value,
    biayaBpjs: bersihkanAngkaProfil(document.getElementById('profil-admin-biaya-bpjs').value),
    kontakDaruratNama: document.getElementById('profil-admin-kontak-darurat-nama').value.trim(),
    kontakDaruratNoHp: document.getElementById('profil-admin-kontak-darurat-hp').value.trim(),
    updatedAt: new Date().toISOString()
  };

  dbProfilKurir.ref(`profil_kurir/${key}`).set(payload)
    .then(() => {
      if (adaPendingSebelumnya) {
        return dbProfilKurir.ref(`profil_kurir_pending/${key}`).remove();
      }
    })
    .then(() => {
      tampilkanToastProfil(adaPendingSebelumnya ? 'Perubahan kurir disetujui & profil diperbarui!' : 'Profil data diri kurir berhasil disimpan!');
      window.tutupProfilAdminKurir();
    })
    .catch((err) => {
      tampilkanToastProfil('Gagal menyimpan profil: ' + err.message);
    });
};

// Admin menolak pengajuan kurir — data resmi TIDAK berubah, pending dihapus.
window.tolakPerubahanProfilKurir = async function() {
  const key = (document.getElementById('profil-admin-key') || {}).value;
  if (!key) return;

  const ok = typeof window.showConfirm === 'function'
    ? await window.showConfirm('Tolak pengajuan perubahan profil kurir ini? Data lama akan tetap berlaku.')
    : confirm('Tolak pengajuan perubahan profil kurir ini? Data lama akan tetap berlaku.');
  if (!ok) return;

  dbProfilKurir.ref(`profil_kurir_pending/${key}`).remove()
    .then(() => {
      tampilkanToastProfil('Pengajuan perubahan ditolak, data lama tetap berlaku.');
      window.tutupProfilAdminKurir();
    })
    .catch((err) => {
      tampilkanToastProfil('Gagal menolak pengajuan: ' + err.message);
    });
};

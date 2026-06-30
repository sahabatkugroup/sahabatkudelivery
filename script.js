        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getDatabase, ref, set, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        let userSession = null; 
        let currentScreen = 'screen-login';
        let navigationHistory = [];
        let notaState = { items: [], biaya: [], subtotal: 0, ongkir: 10000, total: 0 };
        let cloudKurirList = {};
        let cloudNotaList = {};
        let cloudMitraList = {};
        let cloudLogMitra = {};
        let laporanBulanAktif = '';
        let cloudOngkirList = {};
        let adminOngkirMode = 'normal';
        let cloudTestimonialList = {};
        let cloudManajemenList = {}
        let cloudLeaderList = {};;
        let liveLocations = {};
        let liveMap = null;
        let liveMarkers = {};
        let watchId = null;
        let lastSentLocation = null;
        let lastSentTime = 0;
        let trackingMap = null;
        let trackingMarker = null;
        let selectedKurirTracking = null;
        let cloudAbsensiList = {};
        let cloudJadwalOff = {};
        let selectedTrackingUser = null;
        let pendingAutoLoginCheck = false;

        let isDashboardStatsRunning = false;
        let isRenderLaporanRunning = false;
        let isRenderKpiRunning = false;
        let isRenderLeaderRunning = false;
        let isRenderAdminNotaRunning = false;
        let isRenderMitraRunning = false;
        let isRenderNotificationHistoryRunning = false;
        let isRenderNotifKurirRunning = false;
        let refreshQueueScheduled = false;
        let lastUiRefreshAt = 0;
        let uiRefreshInProgress = false;
        let lastCloudSnapshotSignature = '';
        let refreshTimer = null;
        let firebaseListenersBound = false;
        let lastKpiRenderAt = 0;
        
        function buildCloudSignature() {
            return [
                Object.keys(cloudKurirList || {}).length,
                Object.keys(cloudNotaList || {}).length,
                Object.keys(cloudMitraList || {}).length,
                Object.keys(cloudLogMitra || {}).length,
                Object.keys(cloudOngkirList || {}).length,
                Object.keys(cloudLeaderList || {}).length,
                Object.keys(cloudTestimonialList || {}).length,
                Object.keys(cloudManajemenList || {}).length,
                Object.keys(cloudNotificationList || {}).length
            ].join('|');
        }
        
        function queueUiRefresh(force = false) {
            const now = Date.now();
            const sig = buildCloudSignature();
            if (!force && sig === lastCloudSnapshotSignature && (now - lastUiRefreshAt) < 500) return;
            if (uiRefreshInProgress || refreshQueueScheduled) return;
        
            lastCloudSnapshotSignature = sig;
            lastUiRefreshAt = now;
            refreshQueueScheduled = true;
        
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                refreshQueueScheduled = false;
                uiRefreshInProgress = true;
                try {
                    if (currentScreen === 'screen-admin-kurir' && typeof renderAdminKurirList === 'function') renderAdminKurirList();
                    if (currentScreen === 'screen-admin-manajemen' && typeof renderAdminManajemen === 'function') renderAdminManajemen();
                    if (currentScreen === 'screen-admin-nota' && typeof renderAdminNota === 'function') renderAdminNota();
                    if (currentScreen === 'screen-admin-mitra' && typeof renderAdminDaftarMitra === 'function') renderAdminDaftarMitra();
                    if (currentScreen === 'screen-admin-laporan' && typeof renderLaporanData === 'function') renderLaporanData();
                    if (currentScreen === 'screen-admin-tracking' && typeof renderTrackingKurirList === 'function') renderTrackingKurirList();
                    if (currentScreen === 'screen-admin-testimonial' && typeof renderAdminTestimonial === 'function') renderAdminTestimonial();
                    if (currentScreen === 'screen-admin-notifikasi') {
                        if (typeof renderAdminNotificationHistory === 'function') renderAdminNotificationHistory();
                        if (typeof renderKurirNotifications === 'function') renderKurirNotifications();
                    }
                    if (currentScreen === 'screen-admin-ongkir' && typeof renderAdminOngkirList === 'function') renderAdminOngkirList();
                    if (currentScreen === 'screen-admin-kpi' && typeof renderKPISection === 'function') renderKPISection(currentKPISection);
                    if (currentScreen === 'screen-dashboard' && typeof updateKurirDashboard === 'function') updateKurirDashboard();
                    if (currentScreen === 'screen-rekap' && typeof loadRekapKurir === 'function') loadRekapKurir();
                    if (currentScreen === 'screen-mitra' && typeof renderKurirMitraView === 'function') renderKurirMitraView(true);
        
                    if (typeof calculateDashboardStats === 'function') calculateDashboardStats();
                    if (typeof calculateMitraStats === 'function') calculateMitraStats();
                } finally {
                    uiRefreshInProgress = false;
                }
            }, 250);
        }
        function getWibDate() {
            return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        }
        
        function getWibRawDate() {
            const wib = getWibDate();
            const tahun = wib.getFullYear();
            const bulan = String(wib.getMonth() + 1).padStart(2, '0');
            const tanggal = String(wib.getDate()).padStart(2, '0');
            return `${tahun}-${bulan}-${tanggal}`;
        }
        function getDistanceMeters(lat1, lon1, lat2, lon2) {
            const R = 6371000;
            const toRad = (v) => v * Math.PI / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
        
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
            return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        window.startLiveLocationTracking = function() {
            if (!userSession || userSession.role !== 'kurir') return;
        
            if (!navigator.geolocation || !window.isSecureContext) {
                console.log('Geolocation tidak tersedia atau situs belum HTTPS.');
                return;
            }
            if (watchId) navigator.geolocation.clearWatch(watchId);
            const sendLocation = async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
        
                const locInfo = await reverseGeocode(lat, lng);
                const waktu = getWibDateTimeString();
        
                const payload = {
                    lat,
                    lng,
                    accuracy: pos.coords.accuracy || null,
                    kurirNama: userSession.nama,
                    kurirUsername: userSession.username,
                    desa: locInfo.desa,
                    blok: locInfo.blok,
                    kecamatan: locInfo.kecamatan,
                    wilayah: locInfo.wilayah,
                    alamatLengkap: locInfo.alamatLengkap,
                    tanggalTracking: waktu.tanggal,
                    tanggalTrackingRaw: getWibRawDate(),
                    jamTracking: waktu.jam,
                    updatedAt: new Date().toISOString()
                };

        
                lastSentLocation = { lat, lng };
                lastSentTime = Date.now();
                set(ref(db, `live_locations/${userSession.id}`), payload);
            };
        
            navigator.geolocation.getCurrentPosition(
                (pos) => sendLocation(pos),
                (err) => {
                    console.log('Izin lokasi ditolak / gagal ambil lokasi:', err.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        
            watchId = navigator.geolocation.watchPosition(
                async (pos) => {
                    const now = Date.now();
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
        
                    const shouldSendByTime = (now - lastSentTime) >= 15000;
                    const shouldSendByDistance = lastSentLocation
                        ? getDistanceMeters(lastSentLocation.lat, lastSentLocation.lng, lat, lng) >= 50
                        : true;
        
                    if (!shouldSendByTime && !shouldSendByDistance) return;
        
                    const locInfo = await reverseGeocode(lat, lng);
                    const waktu = getWibDateTimeString();
        
                    const payload = {
                        lat,
                        lng,
                        accuracy: pos.coords.accuracy || null,
                        kurirNama: userSession.nama,
                        kurirUsername: userSession.username,
                        desa: locInfo.desa,
                        blok: locInfo.blok,
                        kecamatan: locInfo.kecamatan,
                        wilayah: locInfo.wilayah,
                        alamatLengkap: locInfo.alamatLengkap,
                        tanggalTracking: waktu.tanggal,
                        jamTracking: waktu.jam,
                        updatedAt: new Date().toISOString()
                    };
        
                    lastSentLocation = { lat, lng };
                    lastSentTime = now;
                    set(ref(db, `live_locations/${userSession.id}`), payload);
                },
                (err) => {
                    console.log('Eror:', err.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        };
        window.renderTrackingKurirList = function() {
            const container = document.getElementById('container-tracking-kurir');
            if (!container) return;
        
            container.innerHTML = '';
        
            const kurirEntries = Object.entries(cloudKurirList || {}).filter(([id, user]) => {
                return user && user.role === 'kurir';
            });
        
            if (kurirEntries.length === 0) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data kurir.</div>';
                return;
            }
        
            kurirEntries.forEach(([id, user]) => {
                const loc = liveLocations[id];
                const hasLocation = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
        
                container.innerHTML += `
                    <button onclick="selectTrackingKurir('${id}')" class="w-full flex items-center justify-between px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 hover:border-primary text-left transition-all active:scale-95">
                        <div>
                            <div class="font-bold text-sm">${user.nama || user.username}</div>
                            <div class="text-[10px] text-slate-400">${hasLocation ? 'Lokasi terdeteksi' : 'Belum ada lokasi'}</div>
                        </div>
                        <span class="w-3 h-3 rounded-full ${hasLocation ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'} shrink-0"></span>
                    </button>
                `;
            });
        };
        window.selectTrackingKurir = function(id) {
            selectedKurirTracking = id;
            selectedTrackingUser = cloudKurirList[id] || null;
            renderTrackingMap(id);
        };

        window.selectTrackingKurir = function(id) {
            selectedKurirTracking = id;
            selectedTrackingUser = cloudKurirList[id] || null;
            renderTrackingMap(id);
        };

        window.renderLiveMap = function() {
            const mapEl = document.getElementById('live-map');
            if (!mapEl || typeof L === 'undefined') return;
        
            if (!liveMap) {
                liveMap = L.map('live-map').setView([-6.326, 108.326], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap'
                }).addTo(liveMap);
            }
        
            Object.values(liveMarkers).forEach(m => liveMap.removeLayer(m));
            liveMarkers = {};
        
            const bounds = [];
        
            Object.entries(liveLocations).forEach(([id, loc]) => {
                if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
        
                const marker = L.marker([loc.lat, loc.lng]).addTo(liveMap).bindPopup(`
                    <b>${loc.kurirNama || 'Kurir'}</b><br>
                    ${loc.updatedAt ? new Date(loc.updatedAt).toLocaleString('id-ID') : '-'}
                `);
        
                liveMarkers[id] = marker;
                bounds.push([loc.lat, loc.lng]);
            });
        
            if (bounds.length > 0) liveMap.fitBounds(bounds, { padding: [40, 40] });
        };
        window.renderTrackingMap = function(id) {
            const mapEl = document.getElementById('tracking-map');
            if (!mapEl || typeof L === 'undefined') return;

            const loc = liveLocations[id];
            const user = selectedTrackingUser || cloudKurirList[id];

            if (!trackingMap) {
                trackingMap = L.map('tracking-map').setView([-6.326, 108.326], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap'
                }).addTo(trackingMap);
            }

            if (trackingMarker) {
                trackingMap.removeLayer(trackingMarker);
                trackingMarker = null;
            }

            if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
                trackingMap.setView([-6.326, 108.326], 13);
                return;
            }

            // Buat custom icon dengan HTML
            const customIcon = L.divIcon({
                html: `
                    <div style="
                        width: 45px;
                        height: 45px;
                        background: linear-gradient(135deg, #0066FF 0%, #008CFF 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 12px rgba(0, 102, 255, 0.4);
                        border: 3px solid white;
                        font-size: 24px;
                        color: white;
                    ">
                        📍
                    </div>
                `,
                iconSize: [45, 45],
                iconAnchor: [22, 22],
                popupAnchor: [0, -22],
                className: 'tracking-marker'
            });

            trackingMarker = L.marker([loc.lat, loc.lng], { icon: customIcon })
                .addTo(trackingMap)
                .bindPopup(`
                    <div style="text-align: center; font-size: 11px; line-height: 1.3; max-width: 160px;">
                        <b style="font-size: 12px;">${user?.nama || 'Kurir'}</b><br>
                        <span style="font-size: 9px; color: #666; display: block; margin: 2px 0;">
                            ${loc.alamatLengkap ? loc.alamatLengkap.substring(0, 40) + (loc.alamatLengkap.length > 40 ? '...' : '') : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                        </span>
                        <span style="font-size: 9px; color: #999;">
                            ${loc.jamTracking || '-'} WIB
                        </span>
                    </div>
                `, {
                    minWidth: 140,
                    maxWidth: 180
                })
                .openPopup();

            trackingMap.setView([loc.lat, loc.lng], 16);
            trackingMap.invalidateSize();
        };

        async function reverseGeocode(lat, lng) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                const a = data.address || {};
        
                return {
                    desa: a.village || a.hamlet || a.suburb || a.neighbourhood || '-',
                    blok: a.residential || a.road || '-',
                    kecamatan: a.county || a.city_district || a.district || '-',
                    wilayah: a.state || a.region || a.county || '-',
                    alamatLengkap: data.display_name || '-'
                };
            } catch (e) {
                return {
                    desa: '-',
                    blok: '-',
                    kecamatan: '-',
                    wilayah: '-',
                    alamatLengkap: '-'
                };
            }
        }
        function getWibDateTimeString() {
            const wib = getWibDate();
            return {
                tanggal: wib.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }),
                jam: wib.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(':', '.')
            };
        }
        window.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
            if (typeof initTheme === 'function') initTheme();
            if (typeof sembunyikanRiwayatMitraAdmin === 'function') {
                sembunyikanRiwayatMitraAdmin();
            }
        
            ['nav-dashboard-btn', 'nav-nota-btn', 'nav-sistem-btn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden', 'opacity-0', 'pointer-events-none');
            });
        
            const tglSkrgWib = getWibRawDate();
            const daftarInputTgl = [
                'an-filter-tgl',
                'am-log-tgl',
                'filter-date-riwayat',
                'riwayat-filter-tgl',
                'm-filter-tgl-kurir'
            ];
        
            daftarInputTgl.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value) el.value = tglSkrgWib;
            });
        
            const amFilterBulanEl = document.getElementById('am-filter-bulan');
            if (amFilterBulanEl && !amFilterBulanEl.value) {
                amFilterBulanEl.value = tglSkrgWib.substring(0, 7);
            }
            
            const amLogBulanEl = document.getElementById('am-log-bulan');
            if (amLogBulanEl && !amLogBulanEl.value) {
                amLogBulanEl.value = tglSkrgWib.substring(0, 7);
            }
            onValue(ref(db, 'users'), (snapshot) => {
                cloudKurirList = snapshot.val() || {};
                populateKurirDropdownFilter();  // Tambahkan baris ini
                queueUiRefresh();
                if (pendingAutoLoginCheck && userSession && userSession.role === 'kurir') {
                    const currentKurir = cloudKurirList[userSession.id];
                    if (currentKurir && currentKurir.status === 'aktif') {
                        launchApplicationSession("screen-dashboard");
                        if (typeof startLiveLocationTracking === "function") startLiveLocationTracking();
                    } else if (currentKurir && currentKurir.status !== 'aktif') {
                        alert("Sesi berakhir. Akun Anda telah dinonaktifkan oleh Admin.");
                        handleLogout();
                    }
                    pendingAutoLoginCheck = false;
                }
            });
            onValue(ref(db, 'nota'), (snapshot) => {
                cloudNotaList = snapshot.val() || {};
                queueUiRefresh();
            });
            onValue(ref(db, 'mitra'), (snapshot) => {
                cloudMitraList = snapshot.val() || {};
                queueUiRefresh();
            });
            onValue(ref(db, 'live_locations'), (snapshot) => {
                liveLocations = snapshot.val() || {};
                if (currentScreen === 'screen-admin-tracking' && typeof renderTrackingKurirList === 'function') {
                    renderTrackingKurirList();
                    if (selectedKurirTracking) renderTrackingMap(selectedKurirTracking);
                }
            });
            onValue(ref(db, 'log_mitra'), (snapshot) => {
                cloudLogMitra = snapshot.val() || {};
                queueUiRefresh();
            });
            onValue(ref(db, 'ongkir_wilayah'), (snapshot) => {
                cloudOngkirList = snapshot.val() || {};
                queueUiRefresh();
            });
            onValue(ref(db, 'absensi_sahabatku'), (snapshot) => {
                cloudAbsensiList = snapshot.val() || {};
            });
            onValue(ref(db, 'leader_list'), (snapshot) => {
                cloudLeaderList = snapshot.val() || {};
                populateLeaderDropdown();
                queueUiRefresh();
            });
            onValue(ref(db, 'jadwal_off'), (snapshot) => {
                cloudJadwalOff = snapshot.val() || {};
            });
            
            window.calcRekapJadwalKurir = function() {
                const bulan = getKpiMonth();
                const rekapMap = {};
            
                const norm = (v) => (v || '').toString().trim().toLowerCase();
            
                // Siapkan data dasar kurir dari users
                Object.entries(cloudKurirList || {}).forEach(([id, u]) => {
                    if (!u || u.role !== 'kurir') return;
            
                    const nama = (u.nama || '').trim();
                    const key = norm(nama || id);
            
                    if (!key) return;
            
                    rekapMap[key] = {
                        idKurir: key,
                        username: (u.username || '').trim().toLowerCase(),
                        namaKurir: nama || key,
                        leader: (u.leader || '-').trim(),
                        totalOff: 0,
                        totalTidakAmbilOff: 0,
                        totalIzin: 0,
                        totalSakit: 0,
                        totalAbsenMasuk: 0,
                        totalAbsenPulang: 0,
                        hadirScore: 0,
                        _tanggalMap: {}
                    };
                });
            
                // Hitung absensi
                Object.values(cloudAbsensiList || {}).forEach(a => {
                    if (!a) return;
            
                    const tgl = (a.tanggal || '').trim();
                    if (!tgl || tgl.slice(0, 7) !== bulan) return;
            
                    const namaKurir = norm(a.nama || a.namaKurir);
                    if (!namaKurir || !rekapMap[namaKurir]) return;
            
                    const row = rekapMap[namaKurir];
            
                    if (a.jamMasuk) row.totalAbsenMasuk++;
                    if (a.jamPulang) row.totalAbsenPulang++;
            
                    if (!row._tanggalMap[tgl]) {
                        row._tanggalMap[tgl] = { masuk: false, pulang: false };
                    }
            
                    if (a.jamMasuk) row._tanggalMap[tgl].masuk = true;
                    if (a.jamPulang) row._tanggalMap[tgl].pulang = true;
            
                    const status = norm(a.status);
                    if (status === 'izin') row.totalIzin++;
                    if (status === 'sakit') row.totalSakit++;
                });
            
                // Hitung jadwal off dari field nama
                Object.values(cloudJadwalOff || {}).forEach(j => {
                    if (!j) return;
            
                    const namaKurir = norm(j.nama);
                    const jenisOff = norm(j.jenisOff);
                    const statusOff = norm(j.status);
                    const tglMulai = (j.tanggalMulai || '').trim();
                    const tglSelesai = (j.tanggalSelesai || tglMulai || '').trim();
            
                    if (!tglMulai || tglMulai.slice(0, 7) !== bulan) return;
                    if (!namaKurir || !rekapMap[namaKurir]) return;
            
                    const row = rekapMap[namaKurir];
            
                    const start = new Date(tglMulai);
                    const end = new Date(tglSelesai);
                    const daysCount = Math.max(1, Math.round((end - start) / 86400000) + 1);
            
                    for (let i = 0; i < daysCount; i++) {
                        const d = new Date(start);
                        d.setDate(start.getDate() + i);
            
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const tglLoop = `${y}-${m}-${dd}`;
            
                        if (tglLoop.slice(0, 7) !== bulan) continue;
            
                        if (jenisOff === 'off reguler') row.totalOff++;
                        if (jenisOff === 'izin') row.totalIzin++;
                        if (jenisOff === 'tidak ambil off') row.totalTidakAmbilOff++;
                        if (jenisOff === 'sakit') row.totalSakit++;
            
                        if (!row._tanggalMap[tglLoop]) {
                            row._tanggalMap[tglLoop] = { masuk: false, pulang: false, off: true };
                        } else {
                            row._tanggalMap[tglLoop].off = true;
                        }
            
                        if (statusOff !== 'aktif') {
                            row.totalTidakAmbilOff++;
                        }
                    }
                });
            
                Object.values(rekapMap).forEach(row => {
                    let score = 0;
            
                    Object.values(row._tanggalMap).forEach(v => {
                        if (v.masuk && v.pulang) score += 1;
                        else if (v.masuk || v.pulang) score += 0.5;
                    });
            
                    row.hadirScore = score;
                    delete row._tanggalMap;
                });
            
                return Object.values(rekapMap)
                    .sort((a, b) => a.namaKurir.localeCompare(b.namaKurir))
                    .map(item => ({
                        ...item,
                        kehadiran: item.hadirScore
                    }));
            };
            onValue(ref(db, 'testimonials'), (snapshot) => {
                cloudTestimonialList = snapshot.val() || {};
                queueUiRefresh();
            });
            onValue(ref(db, 'manajemen_sahabatku'), (snapshot) => {
                cloudManajemenList = snapshot.val() || {};
                queueUiRefresh();
            });
            const savedSession = localStorage.getItem('sahabatku_session');
            if (savedSession) {
                userSession = JSON.parse(savedSession);
        
                document.querySelectorAll('.session-fullname').forEach(el => el.innerText = userSession.nama);
                if (document.getElementById('nota-kurir') && userSession.nama) {
                    document.getElementById('nota-kurir').value = userSession.nama;
                }
        
                if (userSession.role === 'owner') {
                    launchApplicationSession("screen-admin-dashboard");
                } else if (userSession.role === 'manajemen') {
                    launchApplicationSession("screen-admin-dashboard");
                    setTimeout(() => {
                        applyManajemenAccess(userSession.kategori || '-');
                    }, 100);
                } else {
                    pendingAutoLoginCheck = true;
                }
            }
        
            document.addEventListener('click', function(e) {
                const box = document.getElementById('suggest-absensi-kurir');
                const input = document.getElementById('absensi-filter-nama');
                if (!box || !input) return;

                if (!box.contains(e.target) && e.target !== input) {
                    box.classList.add('hidden');
                }
            });
        });
        
        window.handleLogin = function(e) {
            if (e) e.preventDefault();
        
            const userIn = document.getElementById('login-username').value.trim().toLowerCase();
            const passIn = document.getElementById('login-password').value.trim();
            const btnSubmit = document.getElementById('btn-login-submit');
        
            if (!userIn || !passIn) {
                alert("Mohon masukkan username dan password Anda.");
                return;
            }
        
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = "MEMVERIFIKASI...";
            }
        
            // 1) Cek login admin utama
            get(ref(db, 'loginadmin'))
                .then((snapshotAdmin) => {
                    if (snapshotAdmin.exists()) {
                        const adminData = snapshotAdmin.val();
                        const adminUser = (adminData.username || "").trim().toLowerCase();
                        const adminPass = (adminData.password || "").trim();
                        if (userIn === adminUser && passIn === adminPass) {
                            userSession = { username: "admin", nama: "Super Admin", role: "owner", kategori: "Owner" };
                            localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
                        
                            document.querySelectorAll('.session-fullname').forEach(el => el.innerText = userSession.nama);
                        
                            launchApplicationSession("screen-admin-dashboard");
                            applyManajemenAccess("Owner");
                        
                            if (btnSubmit) {
                                btnSubmit.disabled = false;
                                btnSubmit.innerText = "Masuk Sistem";
                            }
                            return true;
                        }
                    }
                    return false;
                })
                .then((adminLogged) => {
                    if (adminLogged) return null;
        
                    // 2) Cek login manajemen sahabatku
                    return get(ref(db, 'manajemen_sahabatku'));
                })
                .then((snapshotManajemen) => {
                    if (snapshotManajemen && snapshotManajemen.exists()) {
                        const dataManajemen = snapshotManajemen.val();
        
                        for (let key in dataManajemen) {
                            const m = dataManajemen[key];
                            const manUser = (m.username || "").trim().toLowerCase();
                            const manPass = (m.password || "").trim();
        
                            if (manUser === userIn && manPass === passIn) {
                                userSession = {
                                    id: key,
                                    username: m.username,
                                    nama: m.nama,
                                    role: "manajemen",
                                    kategori: m.kategori || "-"
                                };
        
                                localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
                                document.querySelectorAll('.session-fullname').forEach(el => el.innerText = userSession.nama);
        
                                launchApplicationSession("screen-admin-dashboard");
                                // PENTING: Terapkan akses manajemen sesuai kategori
                                setTimeout(() => {
                                    applyManajemenAccess(m.kategori || "-");
                                }, 100);
        
                                if (btnSubmit) {
                                    btnSubmit.disabled = false;
                                    btnSubmit.innerText = "Masuk Sistem";
                                }
                                return true;
                            }
                        }
                    }
                    return false;
                })
                .then((manajemenLogged) => {
                    if (manajemenLogged) return null;
        
                    // 3) Cek login kurir
                    return get(ref(db, 'users'));
                })
                .then((snapshotUsers) => {
                    if (!snapshotUsers) return;
        
                    let foundKey = null;
                    let foundUser = null;
        
                    if (snapshotUsers.exists()) {
                        const dataKurir = snapshotUsers.val();
                        for (let key in dataKurir) {
                            const kurirUser = (dataKurir[key].username || "").trim().toLowerCase();
                            const kurirPass = (dataKurir[key].password || "").trim();
        
                            if (kurirUser === userIn && kurirPass === passIn) {
                                foundKey = key;
                                foundUser = dataKurir[key];
                                break;
                            }
                        }
                    }
        
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerText = "Masuk Sistem";
                    }
        
                    if (foundUser) {
                        if (foundUser.status !== "aktif") {
                            alert("Gagal masuk! Status akun Anda dinonaktifkan atau diblokir oleh Admin.");
                            return;
                        }
        
                        userSession = {
                            id: foundKey,
                            username: foundUser.username,
                            nama: foundUser.nama,
                            role: "kurir"
                        };
        
                        localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
                        document.querySelectorAll('.session-fullname').forEach(el => el.innerText = userSession.nama);
        
                        if (document.getElementById('nota-kurir')) {
                            document.getElementById('nota-kurir').value = foundUser.nama;
                        }
        
                        launchApplicationSession("screen-dashboard");
                        if (typeof startLiveLocationTracking === "function") startLiveLocationTracking();
                    } else {
                        alert("Username & Password tidak terdaftar atau salah!");
                    }
                })
                .catch((error) => {
                    console.error("Login Error: ", error);
                    alert("Terjadi gangguan koneksi ke server: " + error.message);
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerText = "Masuk Sistem";
                    }
                });
        };
        window.changePassword = function() {
            const newPassword = document.getElementById('new-password').value.trim();
            
            if (!newPassword) {
                alert("Mohon masukkan password baru!");
                return;
            }
            
            if (!userSession || !userSession.id) {
                alert("Sesi tidak ditemukan. Silakan login ulang.");
                return;
            }
        
            if (confirm("Apakah Anda yakin ingin mengubah password Anda?")) {
                const dbRef = ref(db, 'users/' + userSession.id);
                
                update(dbRef, {
                    password: newPassword
                })
                .then(() => {
                    alert("Password berhasil diperbarui! Silakan login kembali untuk keamanan.");
                    document.getElementById('new-password').value = '';
                    handleLogout(); 
                })
                .catch((error) => {
                    alert("Gagal mengubah password: " + error.message);
                });
            }
        };
        window.changeAdminLogin = async function() {
            const newUsername = document.getElementById('admin-username').value.trim().toLowerCase();
            const newPassword = document.getElementById('admin-password').value.trim();
        
            if (!newUsername || !newPassword) {
                alert("Mohon isi username dan password baru!");
                return;
            }
        
            if (!confirm("Yakin ingin mengubah username dan password akun ini?")) return;
        
            try {
                if (userSession && userSession.role === 'owner') {
                    await set(ref(db, 'loginadmin'), {
                        username: newUsername,
                        password: newPassword
                    });
                } else if (userSession && userSession.role === 'manajemen') {
                    await update(ref(db, `manajemen_sahabatku/${userSession.id}`), {
                        username: newUsername,
                        password: newPassword
                    });
                } else {
                    alert("Akun tidak dikenali.");
                    return;
                }
        
                alert("Username dan password berhasil diubah!");
                document.getElementById('admin-username').value = '';
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-current-username').value = newUsername;
                userSession.username = newUsername;
                localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
            } catch (err) {
                alert("Gagal mengubah login: " + err.message);
            }
        };
        window.changeKurirLogin = function() {
            const newUsername = document.getElementById('new-username').value.trim().toLowerCase();
            const newPassword = document.getElementById('new-password').value.trim();
        
            if (!newUsername || !newPassword) {
                alert("Mohon isi username dan password baru!");
                return;
            }
        
            if (!userSession || !userSession.id || userSession.role !== 'kurir') {
                alert("Sesi kurir tidak ditemukan!");
                return;
            }
        
            const currentUser = cloudKurirList[userSession.id];
            if (!currentUser) {
                alert("Data kurir tidak ditemukan!");
                return;
            }
        
            const duplicate = Object.entries(cloudKurirList).some(([key, user]) => {
                return key !== userSession.id && (user.username || '').trim().toLowerCase() === newUsername;
            });
        
            if (duplicate) {
                alert("Username sudah dipakai kurir lain!");
                return;
            }
        
            if (!confirm("Yakin ingin mengubah username dan password kurir?")) return;
        
            update(ref(db, `users/${userSession.id}`), {
                username: newUsername,
                password: newPassword
            })
            .then(() => {
                alert("Username dan password kurir berhasil diubah!");
                userSession.username = newUsername;
                localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
            })
            .catch((error) => {
                alert("Gagal mengubah login kurir: " + error.message);
            });
        };
        window.launchApplicationSession = function(targetDashboard) {
            document.getElementById('screen-login').classList.remove('active');
        
            const mainLayout = document.getElementById('main-layout');
            if (mainLayout) mainLayout.classList.remove('hidden');
        
            const nameContainers = document.querySelectorAll('.session-fullname');
            nameContainers.forEach(el => el.innerText = userSession.nama);
        
            localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
        
            const navDashboardBtn = document.getElementById('nav-dashboard-btn');
            const navNotaBtn = document.getElementById('nav-nota-btn');
            const navSistemBtn = document.getElementById('nav-sistem-btn');
            const showKurirNav = userSession && userSession.role === 'kurir';
            const showOwnerNav = userSession && userSession.role === 'owner';
            
            [navDashboardBtn, navNotaBtn, navSistemBtn].forEach(btn => {
                if (!btn) return;
                if (showKurirNav || showOwnerNav) {
                    btn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                } else {
                    btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                }
            });
        
            const kurirBox = document.getElementById('security-account-box');
            const adminBox = document.getElementById('admin-security-account-box');
        
            if (kurirBox) {
                if (userSession && userSession.role === 'kurir') kurirBox.classList.remove('hidden');
                else kurirBox.classList.add('hidden');
            }
            if (adminBox) {
                if (userSession && (userSession.role === 'owner' || userSession.role === 'manajemen')) {
                    adminBox.classList.remove('hidden');
            
                    if (userSession.role === 'owner') {
                        get(ref(db, 'loginadmin')).then((snap) => {
                            if (snap.exists()) {
                                const data = snap.val() || {};
                                const el = document.getElementById('admin-current-username');
                                if (el) el.value = data.username || '';
                                const inputUser = document.getElementById('admin-username');
                                if (inputUser) inputUser.value = data.username || '';
                            }
                        });
                    }
            
                    if (userSession.role === 'manajemen') {
                        get(ref(db, `manajemen_sahabatku/${userSession.id}`)).then((snap) => {
                            if (snap.exists()) {
                                const data = snap.val() || {};
                                const el = document.getElementById('admin-current-username');
                                if (el) el.value = data.username || '';
                                const inputUser = document.getElementById('admin-username');
                                if (inputUser) inputUser.value = data.username || '';
                            }
                        });
                    }
                } else {
                    adminBox.classList.add('hidden');
                }
            }

            // Tampilkan menu admin sesuai kategori manajemen
            const adminMenus = [
                'screen-admin-kurir',
                'screen-admin-manajemen',
                'screen-admin-nota',
                'screen-admin-mitra',
                'screen-admin-laporan',
                'screen-admin-tracking',
                'screen-admin-kpi',
                'screen-admin-testimonial',
                'screen-admin-notifikasi',
                'screen-admin-absensi',
                'screen-admin-ongkir',
                'screen-pengaturan'
            ];
        
            adminMenus.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('hidden');
                    });
                }
            });
        
            // Jika login Owner, semua menu admin tetap tampil
            if (userSession && userSession.role === 'owner') {
                const formKurir = document.querySelector('#screen-admin-kurir .bg-white');
                if (formKurir) formKurir.classList.remove('hidden');
                adminMenus.forEach(id => {
                    const screen = document.getElementById(id);
                    if (!screen) return;
                    screen.classList.remove('hidden');
                    screen.querySelectorAll('button').forEach(btn => btn.classList.remove('hidden'));
                });
            }
        
            // Jika login Manajemen, terapkan akses sesuai kategori
            if (userSession && userSession.role === 'manajemen') {
                applyManajemenAccess(userSession.kategori || '-');
            }
        
            navigateTo(targetDashboard);
        };

        window.handleLogout = function() {
            if(confirm("Apakah Anda yakin ingin keluar dari sistem Sahabatku Delivery?")) {
                localStorage.removeItem('sahabatku_session');
                userSession = {};
                
                if(document.getElementById('login-username')) document.getElementById('login-username').value = '';
                if(document.getElementById('login-password')) document.getElementById('login-password').value = '';
                
                ['nav-dashboard-btn', 'nav-nota-btn', 'nav-sistem-btn'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                    }
                });
                if (watchId) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }
                navigateTo('screen-login');
            }
        }

        window.navigateTo = function(screenId) {
            if (screenId === 'screen-nota' && (!userSession || userSession.role !== 'kurir')) {
                alert('Menu Nota hanya untuk login kurir.');
                return;
            }
            if (screenId === 'screen-admin-laporan') {
                setTimeout(() => {
                    populateLaporanFilter();
                    renderLaporanData();
                }, 100);
            }
            if (screenId === 'screen-admin-tracking') {
                setTimeout(() => {
                    renderTrackingKurirList();
                    if (selectedKurirTracking) renderTrackingMap(selectedKurirTracking);
                }, 100);
            }
            if (screenId === 'screen-admin-testimonial') {
                setTimeout(() => {
                    const bulanEl = document.getElementById('testimonial-filter-bulan');
                    if (bulanEl && !bulanEl.value) {
                        bulanEl.value = getWibRawDate().slice(0, 7);
                    }
                    renderAdminTestimonial();
                }, 100);
            }

            if (screenId === 'screen-admin-notifikasi') {
                setTimeout(() => {
                    populateNotifKurirList();
                }, 100);
            }
            
            if (screenId === 'screen-admin-kpi') {
                setTimeout(() => {
                    const bulanEl = document.getElementById('kpi-filter-bulan');
                    if (bulanEl && !bulanEl.value) bulanEl.value = getWibRawDate().slice(0, 7);
                    renderKPISection(currentKPISection);
                }, 100);
            }
            if (screenId === currentScreen) return;
            
            const currentEl = document.getElementById(currentScreen);
            if (currentEl) currentEl.classList.remove('active');
            
            const appBar = document.getElementById('app-bar');
            if (appBar) {
                if (screenId === 'screen-login' || screenId === 'screen-dashboard' || screenId === 'screen-admin-dashboard') {
                    appBar.classList.remove('flex');
                    appBar.classList.add('hidden');
                } else {
                    appBar.classList.remove('hidden');
                    appBar.classList.add('flex');
                    const appBarTitle = document.getElementById('app-bar-title');
                    if (appBarTitle) appBarTitle.innerText = screenId.replace('screen-', '').toUpperCase();
                }
            }
        
            if (screenId === 'screen-dashboard' || screenId === 'screen-admin-dashboard') {
                navigationHistory = [];
            } else {
                navigationHistory.push(currentScreen);
            }
        
            const targetEl = document.getElementById(screenId);
            if (targetEl) targetEl.classList.add('active');
            currentScreen = screenId;
            window.scrollTo(0, 0);
            if (screenId === 'screen-dashboard') {
                setTimeout(() => {
                    if (typeof updateKurirDashboard === 'function') updateKurirDashboard();
                    if (typeof renderKurirNotifications === 'function') renderKurirNotifications();
                }, 50);
            }
            if (screenId === 'screen-rekap') {
                setTimeout(() => { 
                    if (typeof loadRekapKurir === 'function') loadRekapKurir(); 
                }, 50);
            }
        };
        window.navigateBack = function() {
            if (navigationHistory.length > 0) {
                const prev = navigationHistory.pop();
                document.getElementById(currentScreen).classList.remove('active');
                
                const appBar = document.getElementById('app-bar');
                if (appBar) {
                    if (prev === 'screen-dashboard' || prev === 'screen-admin-dashboard') {
                        appBar.classList.remove('flex');
                        appBar.classList.add('hidden');
                    } else {
                        const appBarTitle = document.getElementById('app-bar-title');
                        if (appBarTitle) appBarTitle.innerText = prev.replace('screen-', '').toUpperCase();
                    }
                }

                document.getElementById(prev).classList.add('active');
                currentScreen = prev;
            }
        };

        window.backToDashboardRole = function() {
            if (userSession && userSession.role === 'owner') navigateTo('screen-admin-dashboard');
            else navigateTo('screen-dashboard');
        };

        function calculateDashboardStats() {
            if (isDashboardStatsRunning) return;
            isDashboardStatsRunning = true;
            try {
                let totalNotaToday = 0;
                let totalOmsetToday = 0;
                let totalTrxMitraToday = 0;
            
                const tglSkrg = getWibRawDate();
                const kurirAktifSet = new Set();
            
                for (let k in cloudNotaList) {
                    const n = cloudNotaList[k];
                    if (!n) continue;
                    if (n.tanggalRaw === tglSkrg) {
                        totalNotaToday++;
            
                        const nominalOngkir = parseInt(n.ongkir) || 0;
                        let nominalTambahan = 0;
            
                        if (n.biayaTambahan && Array.isArray(n.biayaTambahan)) {
                            n.biayaTambahan.forEach(item => {
                                nominalTambahan += (parseInt(item.nominal) || 0);
                            });
                        }
                        totalOmsetToday += (nominalOngkir + nominalTambahan);
                        if (n.kurirUsername) {
                            kurirAktifSet.add(n.kurirUsername);
                        }
                    }
                }
                for (let k in cloudLogMitra) {
                    const log = cloudLogMitra[k];
                    if (!log) continue;
                    if (!log.tglRaw) continue;
                
                    const tglLog = log.tglRaw.toString().slice(0, 10);
                    if (tglLog === tglSkrg) {
                        totalTrxMitraToday += (parseInt(log.trxInput) || 0);
                    }
                }

                const elTotalNota = document.getElementById('adm-dash-total-nota');
                const elTotalOmset = document.getElementById('adm-dash-total-omset');
                const elTotalMitra = document.getElementById('adm-dash-total-mitra');
                const elKurirAktif = document.getElementById('adm-dash-kurir-aktif');
            
                if (elTotalNota) elTotalNota.innerText = totalNotaToday;
                if (elTotalOmset) elTotalOmset.innerText = "Rp " + totalOmsetToday.toLocaleString('id-ID');
                if (elTotalMitra) elTotalMitra.innerText = totalTrxMitraToday;
                if (elKurirAktif) elKurirAktif.innerText = kurirAktifSet.size;
            } finally {
                isDashboardStatsRunning = false;
            }
        }
        window.calculateMitraStats = function() {
            const tglSkrgWib = getWibRawDate();
            let countMitraTrx = 0;
            if (typeof cloudLogMitra !== 'undefined' && userSession && userSession.role === 'kurir') {
                for (let key in cloudLogMitra) {
                    const entry = cloudLogMitra[key];
                    if (entry.kurirUsername !== userSession.username) continue;
                    if (entry.tglRaw !== tglSkrgWib) continue;
        
                    countMitraTrx += (parseInt(entry.trxInput) || 0);
                }
            }
        
            const el = document.getElementById('dash-k-total-mitra-trx');
            if (el) el.innerText = countMitraTrx;
        };
        window.saveAkunKurir = function() {
            const idEdit = document.getElementById('ak-id-edit').value;
            const nama = document.getElementById('ak-nama').value.trim();
            const leader = document.getElementById('ak-leader').value.trim();
            const username = document.getElementById('ak-username').value.trim().toLowerCase();
            const password = document.getElementById('ak-password').value.trim();
            const tglGabung = document.getElementById('ak-tgl-gabung').value;
            const status = document.getElementById('ak-status').value;
        
            if (!nama || !username || !password || !tglGabung) {
                alert('Mohon lengkapi seluruh form akun kurir!');
                return;
            }
        
            if (leader && !isLeaderExist(leader)) {
                alert('Leader yang dipilih belum ada di data leader!');
                return;
            }
        
            const userData = {
                nama,
                leader,
                username,
                password,
                tglGabung,
                status,
                role: "kurir",
                ongkirLocked: true,
                ongkirPassword: ""
            };
        
            let targetRef;
            if (idEdit) {
                targetRef = ref(db, `users/${idEdit}`);
            } else {
                const isDuplicated = Object.values(cloudKurirList).some(kurir =>
                    (kurir.username || '').trim().toLowerCase() === username
                );
        
                if (isDuplicated) {
                    alert(`Username "${username}" sudah terdaftar! Gunakan username yang berbeda.`);
                    return;
                }
        
                targetRef = push(ref(db, 'users'));
            }
        
            set(targetRef, userData)
                .then(() => {
                    alert('Akun kurir berhasil disimpan!');
                    resetFormKurir();
                })
                .catch((error) => {
                    console.error("Error saving to Firebase:", error);
                    alert('Gagal menyimpan data: ' + error.message);
                });
        };
        window.resetFormKurir = function() {
            document.getElementById('ak-id-edit').value = '';
            document.getElementById('ak-nama').value = '';
            document.getElementById('ak-leader').value = '';
            document.getElementById('ak-username').value = '';
            document.getElementById('ak-password').value = '';
            document.getElementById('ak-tgl-gabung').value = '';
            document.getElementById('ak-status').value = 'aktif';
            const formTitle = document.getElementById('title-form-kurir');
            if (formTitle) formTitle.innerText = 'Registrasi / Edit Akun Kurir';
        };
        window.editAkunKurir = function(key) {
            const item = cloudKurirList[key];
            if (!item) return;
        
            document.getElementById('edit-kurir-id').value = key;
            document.getElementById('edit-kurir-nama').value = item.nama || '';
            document.getElementById('edit-kurir-username').value = item.username || '';
            document.getElementById('edit-kurir-password').value = item.password || '';
            document.getElementById('edit-kurir-leader').value = item.leader || '';
            document.getElementById('edit-kurir-tgl-gabung').value = item.tglGabung || '';
            document.getElementById('edit-kurir-status').value = item.status || 'aktif';
        
            document.getElementById('title-edit-kurir').innerText = 'Edit Data Kurir';
            document.getElementById('modal-edit-kurir').classList.remove('hidden');
        };

        window.closeEditKurirModal = function() {
            document.getElementById('modal-edit-kurir').classList.add('hidden');
            document.getElementById('edit-kurir-id').value = '';
            document.getElementById('edit-kurir-nama').value = '';
            document.getElementById('edit-kurir-username').value = '';
            document.getElementById('edit-kurir-password').value = '';
            document.getElementById('edit-kurir-tgl-gabung').value = '';
            document.getElementById('edit-kurir-status').value = 'aktif';
        };
        
        window.saveEditKurir = function() {
            const id = document.getElementById('edit-kurir-id').value;
            const nama = document.getElementById('edit-kurir-nama').value.trim();
            const username = document.getElementById('edit-kurir-username').value.trim().toLowerCase();
            const password = document.getElementById('edit-kurir-password').value.trim();
            const leader = document.getElementById('edit-kurir-leader').value.trim();
            const tglGabung = document.getElementById('edit-kurir-tgl-gabung').value;
            const status = document.getElementById('edit-kurir-status').value;
        
            if (!id) return alert('Data kurir tidak ditemukan!');
            if (!nama || !username || !password || !tglGabung) return alert('Lengkapi semua data kurir!');
        
            if (leader && !isLeaderExist(leader)) {
                alert('Leader yang dipilih belum ada di data leader!');
                return;
            }
        
            update(ref(db, `users/${id}`), {
                nama,
                username,
                password,
                leader,
                tglGabung,
                status
            }).then(() => {
                alert('Data kurir berhasil diperbarui!');
                closeEditKurirModal();
            }).catch(err => {
                alert('Gagal update kurir: ' + err.message);
            });
        };

        window.hapusAkunKurir = function(key) {
            if (confirm("Apakah Anda yakin ingin menghapus akun kurir ini secara permanen dari database?")) {
                remove(ref(db, `users/${key}`))
                .then(() => alert("Akun kurir berhasil dihapus."))
                .catch(err => alert("Gagal menghapus: " + err.message));
            }
        };
        let selectedKpiDetail = null;
        
        window.openKpiDetailModal = function(idKurir) {
            const bulan = getKpiMonth();
            const data = buildKPIData(bulan);
            const item = data.find(x => x.id === idKurir);
            if (!item) return;
        
            selectedKpiDetail = item;
        
            const badge = getRatingBadge(item.rating);
            const container = document.getElementById('container-kpi-detail');
            if (!container) return;
        
            container.innerHTML = `
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                    <div class="text-lg font-black">${item.nama}</div>
                    <div class="text-xs text-slate-500">Leader: ${item.leader || '-'}</div>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${badge.bg} text-white text-[10px] font-black">
                        ${badge.emoji} ${badge.label}
                    </div>
                </div>
        
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border">
                        <div class="text-[10px] text-slate-400 uppercase">Kehadiran</div>
                        <div class="font-black mt-1">${item.hadir} (${item.kehadiranScore.toFixed(1)} poin)</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border">
                        <div class="text-[10px] text-slate-400 uppercase">Penghasilan</div>
                        <div class="font-black mt-1">Rp ${item.totalPenghasilan.toLocaleString('id-ID')}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.totalPenghasilanScore.toFixed(1)} poin</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border">
                        <div class="text-[10px] text-slate-400 uppercase">Total Nota</div>
                        <div class="font-black mt-1">${item.totalNota}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.totalNotaScore.toFixed(1)} poin</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border">
                        <div class="text-[10px] text-slate-400 uppercase">Trx Mitra</div>
                        <div class="font-black mt-1">${item.trxMitra}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.trxMitraScore.toFixed(1)} poin</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border col-span-2">
                        <div class="text-[10px] text-slate-400 uppercase">Total OFF / Izin / Sakit</div>
                        <div class="font-black mt-1">${(item.totalOff || 0) + (item.totalIzin || 0) + (item.totalSakit || 0)} off</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.offScore.toFixed(1)} poin</div>
                        <div class="text-[10px] text-slate-500 mt-1">Normal maksimal 3/bulan</div>
                    </div>
                </div>
        
                <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    <div class="text-[10px] uppercase tracking-wider opacity-80">Total Rating</div>
                    <div class="text-3xl font-black mt-1">${item.rating.toFixed(1)}%</div>
                </div>
            `;
        
            document.getElementById('modal-kpi-detail').classList.remove('hidden');
        };
        
        window.closeKpiDetailModal = function() {
            document.getElementById('modal-kpi-detail').classList.add('hidden');
        };


        window.simpanPasswordOngkir = function(key) {
            const input = document.getElementById(`ongkir-pass-${key}`);
            if (!input) return;
        
            const passwordOngkir = input.value.trim();
            if (!passwordOngkir) {
                alert('Password ongkir tidak boleh kosong!');
                return;
            }
        
            update(ref(db, `users/${key}`), {
                ongkirPassword: passwordOngkir
            }).then(() => {
                alert('Password ongkir berhasil disimpan!');
            });
        };
        
        window.toggleOngkirAkses = function(key) {
            const item = cloudKurirList[key];
            if (!item) return;
        
            const newStatus = !item.ongkirLocked;
        
            update(ref(db, `users/${key}`), {
                ongkirLocked: newStatus
            }).then(() => {
                alert(newStatus ? 'Akses ongkir dikunci.' : 'Akses ongkir dibuka.');
            });
        };

        function populateKurirDropdownFilter() {
            const dropdown = document.getElementById('an-filter-kurir');
            if (!dropdown) return;
            dropdown.innerHTML = '<option value="semua">Semua Kurir</option>';
            for (let k in cloudKurirList) {
                if (cloudKurirList[k].role !== 'admin') {
                    dropdown.innerHTML += `<option value="${cloudKurirList[k].username}">${cloudKurirList[k].nama}</option>`;
                }
            }
        }
        window.hapusNotaGlobal = function(key) {
            if(confirm("Hapus nota ini secara permanen dari server cloud?")) {
                remove(ref(db, `nota/${key}`));
            }
        }
        window.hapusSemuaNotaTersaring = function() {
            const filterKurir = document.getElementById('an-filter-kurir')?.value || 'semua';
            const filterTgl = document.getElementById('an-filter-tgl')?.value || '';
            const filterBulan = document.getElementById('an-filter-bulan')?.value || '';
        
            const hasil = Object.entries(cloudNotaList || {}).filter(([key, n]) => {
                if (!n) return false;
                if (filterKurir !== 'semua' && n.kurirUsername !== filterKurir) return false;
                if (filterTgl && n.tanggalRaw !== filterTgl) return false;
                if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) return false;
                return true;
            });
        
            if (!hasil.length) {
                alert('Tidak ada nota sesuai filter untuk dihapus.');
                return;
            }
        
            if (!confirm(`Yakin hapus ${hasil.length} nota sesuai filter ini?`)) return;
        
            hasil.forEach(([key]) => {
                remove(ref(db, `nota/${key}`));
            });
        
            alert('Nota sesuai filter sedang dihapus.');
        };
        
        window.viewAdminNota = function(key) {
            const n = cloudNotaList[key];
            const modalCanvas = document.getElementById('canvas-nota-admin');
            if (!n || !modalCanvas) return;
        
            let itemRows = '';
            if (n.items && Array.isArray(n.items)) {
                n.items.forEach(it => {
                    itemRows += `
                        <tr>
                            <td>${it.nama}</td>
                            <td class="text-center">${it.qty}</td>
                            <td class="text-right">${(it.harga || 0).toLocaleString('id-ID')}</td>
                            <td class="text-right">${(it.subtotal || 0).toLocaleString('id-ID')}</td>
                        </tr>
                    `;
                });
            }
            let rincianBiaya = '';
            const totalBiaya = (n.biayaTambahan || []).reduce((acc, b) => acc + (b.nominal || 0), 0);
            if (n.biayaTambahan && n.biayaTambahan.length > 0) {
                n.biayaTambahan.forEach(b => {
                    rincianBiaya += `
                        <div class="flex justify-between italic text-slate-400 pl-2">
                            <span>+ ${b.nama}</span>
                            <span>${(b.nominal || 0).toLocaleString('id-ID')}</span>
                        </div>
                    `;
                });
            }
        
            modalCanvas.innerHTML = `
                <div class="text-center border-b border-dashed border-slate-300 pb-3">
                    <h3 class="font-extrabold text-lg text-primary tracking-wide">SAHABATKU DELIVERY</h3>
                    <p class="text-[10px] text-slate-400">Jatibarang, Indramayu</p>
                </div>
        
                <div class="text-[11px] space-y-1">
                    <div class="flex justify-between"><span class="text-slate-400">Nomor Nota:</span><span class="font-bold text-slate-700">${n.id || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Tanggal:</span><span>${n.tanggal || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Kurir:</span><span class="font-medium">${n.kurirNama || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Status:</span><span class="uppercase font-semibold">${n.status || '-'}</span></div>
                </div>
        
                <table class="w-full text-[11px] text-left mt-2">
                    <thead>
                        <tr class="border-b border-dashed border-slate-300 text-slate-400 font-semibold">
                            <th class="py-1">Item</th>
                            <th class="text-center">Qty</th>
                            <th class="text-right">Harga</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows || `<tr><td colspan="4" class="text-center italic text-slate-400 py-2">- Tidak ada rincian -</td></tr>`}
                    </tbody>
                </table>
        
                <div class="border-t border-dashed border-slate-300 pt-2.5 text-[11px] space-y-1">
                    <div class="flex justify-between"><span class="text-slate-400">Subtotal Item</span><span>${(n.subtotal || 0).toLocaleString('id-ID')}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Ongkir</span><span>${(n.ongkir || 0).toLocaleString('id-ID')}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Tambahan Biaya</span><span>${totalBiaya.toLocaleString('id-ID')}</span></div>
                    ${rincianBiaya ? `<div id="p-rincian-biaya-list" class="pl-2 space-y-0.5 text-[10px] text-slate-500">${rincianBiaya}</div>` : ''}
                    <div class="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                        <span>TOTAL</span><span class="text-primary">${(n.total || 0).toLocaleString('id-ID')}</span>
                    </div>
                </div>
        
                <div class="border-t border-dashed border-slate-300 pt-3 text-center space-y-1">
                    <p class="text-[10px] text-slate-500 italic">Terima kasih telah menggunakan jasa Sahabatku Delivery.</p>
                    <p class="text-[10px] font-medium text-slate-700">Pastikan Selalu Order Melalui WhatsApp Resmi Kami:<br>
                       <span class="text-primary font-bold text-xs">0821-1845-415</span>
                    </p>
                </div>
            `;
            document.getElementById('modal-preview-nota').classList.remove('hidden');
        }

        window.closeAdminModal = function() {
            document.getElementById('modal-preview-nota').classList.add('hidden');
        }
        window.downloadAdminNotaJpg = function() {
            const el = document.getElementById('canvas-nota-admin');
            if (!el) return;
        
            if (typeof html2canvas === 'undefined') {
                alert('Fitur gambar belum siap. Coba reload halaman.');
                return;
            }
        
            html2canvas(el, {
                scale: 1,
                useCORS: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const link = document.createElement('a');
        
                const noNota = document.querySelector('#canvas-nota-admin .font-bold.text-slate-700')?.innerText || 'Nota';
                const kurir = 'Kurir';
        
                const fileName = `${noNota}_${kurir}.jpg`
                    .replace(/\s+/g, '_')
                    .replace(/[\/\\:*?"<>|]/g, '');
        
                link.download = fileName;
                link.href = canvas.toDataURL('image/jpeg', 0.7);
                link.click();
            });
        }
        window.saveDataMitra = function() {
            const idEdit = document.getElementById('am-id-edit').value;
            const nama = document.getElementById('am-nama').value.trim();
            const alamat = document.getElementById('am-alamat').value.trim();
            const hp = document.getElementById('am-hp').value.trim();
            const target = parseInt(document.getElementById('am-target').value) || 0;

            if(!nama || !alamat || !hp || target <= 0) {
                alert("Lengkapi seluruh form mitra!");
                return;
            }

            const payload = { nama, alamat, hp, target };

            if(idEdit) {
                update(ref(db, `mitra/${idEdit}`), payload).then(() => { alert("Mitra berhasil di-update!"); resetFormMitra(); });
            } else {
                push(ref(db, 'mitra'), payload).then(() => { alert("Mitra baru sukses ditambahkan!"); resetFormMitra(); });
            }
        }
        window.editDataMitra = function(key) {
            const d = cloudMitraList[key];
            if (!d) return;
        
            document.getElementById('edit-mitra-id').value = key;
            document.getElementById('edit-mitra-nama').value = d.nama || '';
            document.getElementById('edit-mitra-alamat').value = d.alamat || '';
            document.getElementById('edit-mitra-hp').value = d.hp || '';
            document.getElementById('edit-mitra-target').value = d.target || '';
            document.getElementById('modal-edit-mitra').classList.remove('hidden');
        };
        window.saveEditMitra = function() {
            const id = document.getElementById('edit-mitra-id').value;
            const nama = document.getElementById('edit-mitra-nama').value.trim();
            const alamat = document.getElementById('edit-mitra-alamat').value.trim();
            const hp = document.getElementById('edit-mitra-hp').value.trim();
            const target = parseInt(document.getElementById('edit-mitra-target').value) || 0;
        
            if (!id) return alert('Data mitra tidak ditemukan!');
            if (!nama || !alamat || !hp || target <= 0) return alert('Lengkapi semua data mitra!');
        
            update(ref(db, `mitra/${id}`), {
                nama,
                alamat,
                hp,
                target
            }).then(() => {
                alert('Data mitra berhasil diperbarui!');
                closeEditMitraModal();
            }).catch(err => {
                alert('Gagal update mitra: ' + err.message);
            });
        };
        window.closeEditMitraModal = function() {
            document.getElementById('modal-edit-mitra').classList.add('hidden');
            document.getElementById('edit-mitra-id').value = '';
            document.getElementById('edit-mitra-nama').value = '';
            document.getElementById('edit-mitra-alamat').value = '';
            document.getElementById('edit-mitra-hp').value = '';
            document.getElementById('edit-mitra-target').value = '';
        };
        window.hapusMitra = function(key) {
            if(confirm("Hapus mitra ini beserta seluruh data record?")) {
                remove(ref(db, `mitra/${key}`));
            }
        }

        window.resetFormMitra = function() {
            document.getElementById('am-id-edit').value = '';
            document.getElementById('am-nama').value = '';
            document.getElementById('am-alamat').value = '';
            document.getElementById('am-hp').value = '';
            document.getElementById('am-target').value = '';
            document.getElementById('title-form-mitra').innerText = "Tambah / Edit Data Mitra";
        }
        window.renderAdminLogMitra = function() {
            const container = document.getElementById('container-admin-log-mitra');
            if (!container) return;

            const logTgl = document.getElementById('am-log-tgl')?.value || '';
            const logBulan = document.getElementById('am-log-bulan')?.value || '';
            const logSearch = document.getElementById('am-log-search')?.value.toLowerCase();
            const elFilterKurir = document.getElementById('am-log-filter-kurir');
            const logFilterKurir = elFilterKurir ? elFilterKurir.value : 'semua';

            container.innerHTML = '';
            let adaData = false;

            for (let k in cloudLogMitra) {
                const log = cloudLogMitra[k];
                if (!log) continue;

                if (logFilterKurir !== 'semua' && log.kurirNama !== logFilterKurir) continue;
                if (logSearch && !(log.mitraNama || '').toLowerCase().includes(logSearch)) continue;
                if (logTgl && log.tglRaw !== logTgl) continue;
                if (logBulan && (!log.tglRaw || log.tglRaw.substring(0, 7) !== logBulan)) continue;

                adaData = true;

                container.innerHTML += `
                    <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-[11px] border border-slate-100 dark:border-slate-700/50 mb-1" data-log-key="${k}">
                        <div>
                            <span class="font-bold text-slate-800 dark:text-white">${log.mitraNama}</span> (${log.trxInput} Trx)
                            <p class="text-[9px] text-slate-400">
                                Input: ${log.kurirNama} - ${log.tglRaw} ${log.waktu}
                            </p>
                        </div>
                        <button onclick="hapusLogMitra('${k}')" class="text-danger font-bold px-2 py-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/30 transition">
                            ✕
                        </button>
                    </div>
                `;
            }

            if (!adaData) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Tidak ada data ditemukan.</div>';
            }
        };

        window.populateMitraLogKurirDropdown = function() {
            const dropdown = document.getElementById('am-log-filter-kurir');
            if (!dropdown) return;
            
            const currentSelection = dropdown.value || 'semua';
            
            dropdown.innerHTML = '<option value="semua">-- Semua Kurir --</option>';
            
            for (let k in cloudKurirList) {
                if (cloudKurirList[k].role !== 'admin' && cloudKurirList[k].nama) {
                    dropdown.innerHTML += `<option value="${cloudKurirList[k].nama}">${cloudKurirList[k].nama}</option>`;
                }
            }
            dropdown.value = currentSelection;
        }
        window.hapusLogMitra = function(key) {
            if (confirm('Hapus riwayat transaksi input ini?')) {
                remove(ref(db, `log_mitra/${key}`)).then(() => {
                    // Gunakan alert atau implementasi toast yang sudah ada
                    if (typeof toast === 'function') {
                        toast('Riwayat transaksi dihapus');
                    } else {
                        alert('Riwayat transaksi dihapus');
                    }
                    // Refresh list tanpa tutup popup
                    renderAdminLogMitra();
                }).catch(err => {
                    alert('Gagal hapus riwayat: ' + err.message);
                });
            }
        };

        window.renderAdminDaftarMitra = function() {
            if (isRenderMitraRunning) return;
            isRenderMitraRunning = true;
            try {
                const container = document.getElementById('container-admin-daftar-mitra');
                if (!container) return;

                const isOpen = ensureSectionToggleState('container-admin-daftar-mitra', false);
                const searchKey = normalizeNama(document.getElementById('am-search-mitra')?.value || '');
                const filterBulan = document.getElementById('am-filter-bulan')?.value || getWibRawDate().substring(0, 7);

                container.innerHTML = `
                    <div class="flex items-center gap-2 mb-2">
                    </div>
                    <div id="container-admin-daftar-mitra-inner" class="${isOpen ? '' : 'hidden'} space-y-2\"></div>
                `;

                const inner = document.getElementById('container-admin-daftar-mitra-inner');
                if (!inner || !isOpen) return;

                const isOwner = userSession && userSession.role === 'owner';
                const list = [];
                let nomorUrut = 1;

                for (let key in cloudMitraList) {
                    const m = cloudMitraList[key];
                    if (!m || !m.nama) continue;

                    const namaMitra = normalizeNama(m.nama);
                    if (searchKey && !namaMitra.includes(searchKey)) continue;

                    let totalTrxMenyeluruh = 0;
                    let totalTrxFilterBulan = 0;

                    for (let logKey in cloudLogMitra) {
                        const log = cloudLogMitra[logKey];
                        if (!log || !log.mitraNama) continue;
                        if (normalizeNama(log.mitraNama) === namaMitra) {
                            const trx = parseInt(log.trxInput) || 0;
                            totalTrxMenyeluruh += trx;
                            if (log.tglRaw && log.tglRaw.substring(0, 7) === filterBulan) totalTrxFilterBulan += trx;
                        }
                    }

                    const targetMitra = m.target || 0;
                    let cleanPhone = (m.hp || '').toString().trim().replace(/[^0-9+]/g, '');
                    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
                    else if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);

                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
                    const mapsLink = m.alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.alamat)}` : '#';

                    list.push(`
                        <div class="bg-white dark:bg-darkCard p-3 rounded-xl border text-xs space-y-2.5 shadow-sm">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-bold text-slate-800 dark:text-white">${nomorUrut}. ${m.nama}</h5>
                                    <a href="${mapsLink}" target="_blank" class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline block mt-0.5">
                                        Alamat: ${m.alamat || 'Belum Diisi'}
                                    </a>
                                </div>
                                <a href="${waLink}" target="_blank" class="px-2.5 py-1 bg-emerald-50 text-success rounded font-bold text-[10px] border border-emerald-100 shrink-0">WhatsApp</a>
                            </div>
                            <div class="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[11px] border border-slate-100 dark:border-slate-800">
                                <div><span class="text-slate-400 block text-[9px] uppercase">Total Transaksi</span><span class="font-extrabold text-slate-700 dark:text-slate-200">${filterBulan ? totalTrxFilterBulan : totalTrxMenyeluruh} Trx</span></div>
                                <div><span class="text-slate-400 block text-[9px] uppercase">Target Bulanan</span><span class="font-extrabold text-amber-500">${targetMitra} Trx</span></div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 pt-0.5">
                                <button onclick="bukaInputTransaksiMitra('${m.nama}')" class="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase">Input Trx</button>
                                <button onclick="lihatRiwayatMitraOtomatis('${m.nama}')" class="py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px] uppercase border border-slate-200/50">Lihat</button>
                                <button onclick="hapusMitra('${key}')" class="py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[10px] uppercase">Hapus</button>
                            </div>
                            ${isOwner ? `
                            <div class="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                                <button onclick="editDataMitra('${key}')" class="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white rounded-md font-semibold text-xs">Edit</button>
                            </div>` : ''}
                        </div>
                    `);
                    nomorUrut++;
                }

                inner.innerHTML = list.join('') || '<div class="text-center text-xs text-slate-400 py-4">Belum ada data mitra.</div>';
            } finally {
                isRenderMitraRunning = false;
            }
        };

        window.cleanupDailyLiveLocations = async function() {
            try {
                const snap = await get(ref(db, 'live_locations'));
                if (!snap.exists()) return;
        
                const data = snap.val() || {};
                const today = getWibRawDate();
        
                for (let key in data) {
                    const item = data[key];
                    const tgl = item?.tanggalTrackingRaw || item?.tanggalRaw || item?.tanggalTrackingDate || '';
        
                    if (tgl && tgl !== today) {
                        await remove(ref(db, `live_locations/${key}`));
                    }
                }
            } catch (err) {
                console.log('cleanupDailyLiveLocations error:', err.message);
            }
        };
        
        window.toggleTestimonialPublish = function(key) {
            const item = cloudTestimonialList[key];
            if (!item) return;
        
            update(ref(db, `testimonials/${key}`), {
                isPublished: !item.isPublished
            }).then(() => {
                alert(item.isPublished ? 'Testimoni disembunyikan.' : 'Testimoni ditampilkan.');
            }).catch(err => {
                alert('Gagal update testimoni: ' + err.message);
            });
        };
        
        window.hapusTestimonial = function(key) {
            if (confirm('Hapus testimoni ini secara permanen?')) {
                remove(ref(db, `testimonials/${key}`))
                    .then(() => alert('Testimoni berhasil dihapus.'))
                    .catch(err => alert('Gagal menghapus testimoni: ' + err.message));
            }
        };
        window.toggleTestimonialSelectMode = function() {
            const active = document.body.dataset.testimonialSelectMode === '1';
            document.body.dataset.testimonialSelectMode = active ? '0' : '1';
            
            if (document.body.dataset.testimonialSelectMode === '1') {
                const checkboxes = document.querySelectorAll('.testimonial-checkbox');
                checkboxes.forEach(cb => cb.checked = false);
            }
            
            renderAdminTestimonial();
        };
        window.hapusSemuaTestimonialBulan = function() {
            const bulanFilter = document.getElementById('testimonial-filter-bulan')?.value || '';
            if (!bulanFilter) return alert('Pilih bulan terlebih dahulu.');

            const keys = Object.keys(cloudTestimonialList || {}).filter(key => {
                const t = cloudTestimonialList[key];
                if (!t) return false;
                const rawBulan = t.timestamp ? new Date(t.timestamp).toISOString().slice(0, 7) : (t.date ? t.date.split('/').reverse().join('-').slice(0, 7) : '');
                return rawBulan === bulanFilter;
            });

            if (!keys.length) return alert('Tidak ada testimoni pada bulan ini.');
            if (!confirm(`Hapus semua ${keys.length} testimoni pada bulan ini?`)) return;

            keys.forEach(key => remove(ref(db, `testimonials/${key}`)));
            
            alert('Testimoni sedang dihapus...');
            
            setTimeout(() => {
                renderAdminTestimonial();
            }, 800);
        };
        window.hapusTestimonialPilihan = function() {
            const checkboxes = document.querySelectorAll('.testimonial-checkbox:checked');
            if (!checkboxes.length) {
                alert('Pilih minimal 1 testimoni untuk dihapus!');
                return;
            }

            const jumlah = checkboxes.length;
            const konfirmasi = confirm(`Apakah Anda YAKIN ingin menghapus ${jumlah} testimoni yang dipilih?\n\nTindakan ini TIDAK BISA DIBATALKAN!`);
            
            if (!konfirmasi) {
                alert('Penghapusan dibatalkan. Data testimoni aman.');
                return;
            }

            const konfirmasi2 = confirm(`Hapus ${jumlah} testimoni secara PERMANEN?`);
            if (!konfirmasi2) {
                alert('Penghapusan dibatalkan. Data testimoni aman.');
                return;
            }

            const keysToDelete = [];
            checkboxes.forEach(cb => {
                keysToDelete.push(cb.value);
            });

            keysToDelete.forEach(key => {
                remove(ref(db, `testimonials/${key}`)).catch(err => {
                    console.error('Error deleting:', err);
                });
            });

            alert(`${jumlah} testimoni sedang dihapus dari server...`);
            
            setTimeout(() => {
                document.body.dataset.testimonialSelectMode = '0';
                renderAdminTestimonial();
            }, 1000);
        };
        window.renderAdminTestimonial = function() {
            const container = document.getElementById('container-admin-testimonial');
            if (!container) return;

            const isOpen = container.dataset.open === '1';
            const bulanFilter = document.getElementById('testimonial-filter-bulan')?.value || '';
            const selectMode = document.body.dataset.testimonialSelectMode === '1';

            const btnGroupInitial = document.getElementById('btn-group-initial');
            const btnGroupOpen = document.getElementById('btn-group-open');
            const btnGroupSelect = document.getElementById('btn-group-select');

            if (btnGroupInitial) {
                if (isOpen) btnGroupInitial.classList.add('hidden');
                else btnGroupInitial.classList.remove('hidden');
            }

            if (btnGroupOpen) {
                if (isOpen && !selectMode) btnGroupOpen.classList.remove('hidden');
                else btnGroupOpen.classList.add('hidden');
            }

            if (btnGroupSelect) {
                if (isOpen && selectMode) btnGroupSelect.classList.remove('hidden');
                else btnGroupSelect.classList.add('hidden');
            }

            if (!isOpen) {
                container.innerHTML = '';
                return;
            }

            const keys = Object.keys(cloudTestimonialList || {});
            // SORT: Urutan dari timestamp terbaru ke terlama
            const filteredKeys = keys
                .sort((a, b) => {
                    const timestampA = cloudTestimonialList[a]?.timestamp || 0;
                    const timestampB = cloudTestimonialList[b]?.timestamp || 0;
                    return timestampB - timestampA; // Terbaru di atas
                })
                .filter(key => {
                    const t = cloudTestimonialList[key];
                    if (!t) return false;
                    const rawBulan = t.timestamp 
                        ? new Date(t.timestamp).toISOString().slice(0, 7) 
                        : (t.date ? t.date.split('/').reverse().join('-').slice(0, 7) : '');
                    return !bulanFilter || rawBulan === bulanFilter;
                });

            if (!filteredKeys.length) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Tidak ada testimoni pada bulan ini.</div>';
                return;
            }

            container.innerHTML = filteredKeys.map(key => {
                const t = cloudTestimonialList[key];
                const statusText = t.isPublished ? 'TAMPIL' : 'SEMBUNYI';
                const statusClass = t.isPublished 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' 
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
                const createdText = t.timestamp 
                    ? new Date(t.timestamp).toLocaleString('id-ID') 
                    : `${t.date || '-'} ${t.time || '-'}`;

                return `
                    <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            ${selectMode ? `
                                <label class="flex items-start gap-2 min-w-0 flex-1">
                                    <input type="checkbox" class="testimonial-checkbox mt-1" value="${key}">
                                    <div class="min-w-0">
                                        <div class="font-bold text-sm text-slate-800 dark:text-white">${t.fullname || '-'}</div>
                                        <div class="text-[10px] text-slate-400">Kurir: ${t.nama || '-'}</div>
                                        <div class="text-[10px] text-slate-400">Tanggal: ${createdText}</div>
                                    </div>
                                </label>
                            ` : `
                                <div class="min-w-0 flex-1">
                                    <div class="font-bold text-sm text-slate-800 dark:text-white">${t.fullname || '-'}</div>
                                    <div class="text-[10px] text-slate-400">Kurir: ${t.nama || '-'}</div>
                                    <div class="text-[10px] text-slate-400">Tanggal: ${createdText}</div>
                                </div>
                            `}
                            
                            <span class="px-2 py-1 rounded-full text-[10px] font-bold ${statusClass} shrink-0">${statusText}</span>
                        </div>

                        <div class="grid grid-cols-3 gap-2 text-[10px]">
                            <div class="bg-white dark:bg-darkCard p-2 rounded-lg">
                                <div class="text-slate-400">Rating</div>
                                <div class="font-bold">${t.rating || 0}</div>
                            </div>
                            <div class="bg-white dark:bg-darkCard p-2 rounded-lg">
                                <div class="text-slate-400">Attitude</div>
                                <div class="font-bold">${t.attitude || '-'}</div>
                            </div>
                            <div class="bg-white dark:bg-darkCard p-2 rounded-lg">
                                <div class="text-slate-400">Speed</div>
                                <div class="font-bold">${t.speed || '-'}</div>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-darkCard p-2 rounded-lg text-[11px] text-slate-600 dark:text-slate-300">${t.comments || '-'}</div>

                        ${!selectMode ? `
                            <div class="flex gap-2">
                                <button onclick="toggleTestimonialPublish('${key}')" class="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase ${t.isPublished ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'}">
                                    ${t.isPublished ? 'Sembunyikan' : 'Tampilkan'}
                                </button>
                                <button onclick="hapusTestimonial('${key}')" class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                                    Hapus
                                </button>
                            </div>
                        ` : ''}\n            </div>
                `;
            }).join('');
        };

        window.toggleTestimonialOpen = function() {
            const el = document.getElementById('container-admin-testimonial');
            if (!el) return;
            el.dataset.open = el.dataset.open === '1' ? '0' : '1';
            
            if (el.dataset.open === '0') {
                document.body.dataset.testimonialSelectMode = '0';
            }
            
            renderAdminTestimonial();
        };

        window.toggleTestimonialPublish = function(key) {
            const item = cloudTestimonialList[key];
            if (!item) return;

            update(ref(db, `testimonials/${key}`), {
                isPublished: !item.isPublished
            }).then(() => {
                alert(item.isPublished ? 'Testimoni disembunyikan.' : 'Testimoni ditampilkan.');
            }).catch(err => {
                alert('Gagal update testimoni: ' + err.message);
            });
        };

        window.hapusTestimonial = function(key) {
            if (confirm('Hapus testimoni ini secara permanen?')) {
                remove(ref(db, `testimonials/${key}`))
                    .then(() => alert('Testimoni berhasil dihapus.'))
                    .catch(err => alert('Gagal menghapus testimoni: ' + err.message));
            }
        };

        window.openModulNota = function() {
            document.getElementById('nota-kurir').value = userSession.nama;
            
            const inputOngkir = document.getElementById('nota-ongkir');
            if (inputOngkir) inputOngkir.value = '6.000';
        
            if (!loadNotaDraft()) {
                notaState = { items: [], biaya: [], subtotal: 0, ongkir: 6000, total: 6000 };
            }
        
            if (document.getElementById('container-items')) renderNotaItems();
            if (document.getElementById('container-biaya')) renderBiayaItems();
            calculateNotaTotal();
        
            navigateTo('screen-nota');
        };

        window.autocapitalText = function(el) {
            let posisiKursor = el.selectionStart;
            let teksAsli = el.value;
            
            let teksKapital = teksAsli.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
            
            el.value = teksKapital;
            el.setSelectionRange(posisiKursor, posisiKursor);
        }
        window.autoformatRupiah = function(el) {
            let angka = el.value.replace(/[^,\d]/g, '').toString();
            let split   = angka.split(',');
            let sisa    = split[0].length % 3;
            let rupiah  = split[0].substr(0, sisa);
            let ribuan  = split[0].substr(sisa).match(/\d{3}/gi);

            if (ribuan) {
                let separator = sisa ? '.' : '';
                rupiah += separator + ribuan.join('.');
            }

            rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
            el.value = rupiah;
        }
        function setRupiahInput(id, value) {
            const el = document.getElementById(id);
            if (el) el.value = (value || 0).toLocaleString('id-ID');
        }
        
        function bersihkanAngka(teks) {
            return parseInt((teks || '').toString().replace(/\./g, '')) || 0;
        }
        function normalizeNama(text) {
            return (text || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
        }
        window.addNotaItem = function() {
            const nama = document.getElementById('item-nama').value.trim();
            const hargaInput = document.getElementById('item-harga').value.trim();
            const harga = hargaInput ? bersihkanAngka(hargaInput) : 0;
            const qty = parseInt(document.getElementById('item-qty').value) || 1;
            
            if (!nama) return;
        
            notaState.items.push({ nama, qty, harga, subtotal: qty * harga });
            
            document.getElementById('item-nama').value = '';
            document.getElementById('item-harga').value = '';
            document.getElementById('item-qty').value = '1';
            
            calculateNotaTotal();
            saveNotaDraft();
            renderNotaItems();
        }
        window.deleteNotaItem = function(idx) {
            notaState.items.splice(idx, 1);
            calculateNotaTotal();
            renderNotaItems();
        }

        function renderNotaItems() {
            const container = document.getElementById('container-items');
            container.innerHTML = '';
            notaState.items.forEach((item, idx) => {
                container.innerHTML += `
                    <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs">
                        <div><b>${item.nama}</b><p class="text-[10px] text-slate-400">x${item.qty} • Rp ${item.harga.toLocaleString('id-ID')}</p></div>
                        <div class="flex items-center gap-2"><span class="font-bold text-primary">Rp ${item.subtotal.toLocaleString('id-ID')}</span><button onclick="deleteNotaItem(${idx})" class="text-danger">Hapus</button></div>
                    </div>
                `;
            });
        }

        window.handleBiayaDropdownChange = function() {
            const drop = document.getElementById('biaya-dropdown');
            const selectedOpt = drop.options[drop.selectedIndex];
            const hargaAttr = selectedOpt.getAttribute('data-harga');
            const namaManual = document.getElementById('biaya-nama-manual');
            const nominalInput = document.getElementById('biaya-nominal');
        
            if (drop.value === 'Tambahan Lainnya') {
                namaManual.classList.remove('hidden');
                nominalInput.value = '';
                nominalInput.placeholder = 'Isi nominal harga';
            } else if (hargaAttr) {
                namaManual.classList.add('hidden');
                nominalInput.value = hargaAttr === 'manual' ? '' : hargaAttr;
                nominalInput.placeholder = 'Contoh: 10.000';
            } else {
                namaManual.classList.add('hidden');
                nominalInput.value = '';
            }
        }

        window.addBiayaItem = function() {
            const drop = document.getElementById('biaya-dropdown');
            const nominal = bersihkanAngka(document.getElementById('biaya-nominal').value);
            let nama = drop.value;

            if (drop.value === 'Tambahan Lainnya') {
                nama = document.getElementById('biaya-nama-manual').value.trim() || "Tambahan Lainnya";
            }

            if (!nama || nominal <= 0) return;

            notaState.biaya.push({ nama, nominal });
            
            drop.value = '';
            document.getElementById('biaya-nama-manual').classList.add('hidden');
            document.getElementById('biaya-nominal').value = '';
            
            calculateNotaTotal();
            saveNotaDraft();
            renderBiayaItems();
        }
        window.deleteBiayaItem = function(idx) {
            notaState.biaya.splice(idx, 1);
            calculateNotaTotal();
            saveNotaDraft();
            renderBiayaItems();
        }

        function renderBiayaItems() {
            const container = document.getElementById('container-biaya');
            container.innerHTML = '';
            notaState.biaya.forEach((b, idx) => {
                container.innerHTML += `
                    <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs">
                        <span>${b.nama}</span>
                        <div class="flex items-center gap-2"><span class="font-bold text-amber-500">Rp ${b.nominal.toLocaleString('id-ID')}</span><button onclick="deleteBiayaItem(${idx})" class="text-danger">Hapus</button></div>
                    </div>
                `;
            });
        }

        window.calculateNotaTotal = function() {
            notaState.subtotal = notaState.items.reduce((acc, curr) => acc + curr.subtotal, 0);
            notaState.ongkir = bersihkanAngka(document.getElementById('nota-ongkir').value);
            const totalBiayaTambahan = notaState.biaya.reduce((acc, curr) => acc + curr.nominal, 0);
            notaState.total = notaState.subtotal + notaState.ongkir + totalBiayaTambahan;
            document.getElementById('calc-subtotal').innerText = "Rp " + notaState.subtotal.toLocaleString('id-ID');
            document.getElementById('calc-ongkir').innerText = "Rp " + notaState.ongkir.toLocaleString('id-ID');
            document.getElementById('calc-biaya').innerText = "Rp " + totalBiayaTambahan.toLocaleString('id-ID');
            document.getElementById('calc-total').innerText = "Rp " + notaState.total.toLocaleString('id-ID');
        }
        window.prosesPratinjauNota = function() {
            const cekOngkir = parseInt(document.getElementById('nota-ongkir').value) || 0;
            if (cekOngkir <= 0) { 
                alert("Wajib mengisi Ongkir untuk melanjutkan!"); 
                return; 
            }
            calculateNotaTotal();
            
            const tgl = new Date();
            document.getElementById('p-nota-num').innerText = document.getElementById('dash-next-nota').innerText;
            document.getElementById('p-nota-date').innerText = tgl.toLocaleString('id-ID');
            document.getElementById('p-nota-kurir').innerText = userSession.nama;
            document.getElementById('p-nota-status').innerText = document.getElementById('nota-status').value;
            document.getElementById('p-subtotal').innerText = notaState.subtotal.toLocaleString('id-ID');
            document.getElementById('p-ongkir').innerText = notaState.ongkir.toLocaleString('id-ID');
            const totalBiayaTambahan = notaState.biaya.reduce((acc, curr) => acc + curr.nominal, 0);
            document.getElementById('p-biaya').innerText = totalBiayaTambahan.toLocaleString('id-ID');
            document.getElementById('p-total').innerText = notaState.total.toLocaleString('id-ID');

            const rincianBiayaList = document.getElementById('p-rincian-biaya-list');
            if (rincianBiayaList) {
                rincianBiayaList.innerHTML = ''; // Reset list lama
                if (notaState.biaya.length > 0) {
                    rincianBiayaList.classList.remove('hidden');
                    notaState.biaya.forEach(b => {
                        rincianBiayaList.innerHTML += `
                            <div class="flex justify-between italic text-slate-400 pl-2">
                                <span>+ ${b.nama}</span>
                                <span>${b.nominal.toLocaleString('id-ID')}</span>
                            </div>
                        `;
                    });
                } else {
                    rincianBiayaList.classList.add('hidden');
                }
            }

            const tbody = document.getElementById('p-table-body');
            tbody.innerHTML = '';
            
            if (notaState.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center italic text-slate-400 py-2">- Tidak ada rincian.</td></tr>`;
            } else {
                notaState.items.forEach(it => {
                    tbody.innerHTML += `<tr><td>${it.nama}</td><td class="text-center">${it.qty}</td><td class="text-right">${it.harga.toLocaleString('id-ID')}</td><td class="text-right">${it.subtotal.toLocaleString('id-ID')}</td></tr>`;
                });
            }
            const btnSimpanNota = document.getElementById('btn-simpan-nota');
            if (btnSimpanNota) btnSimpanNota.classList.remove('hidden');
            updatePreviewButtonsLayout();
            navigateTo('screen-preview');
        }
        window.saveNotaAsJpg = function() {
            const el = document.getElementById('canvas-nota');
            if (!el) return;

            if (typeof html2canvas === 'undefined') {
                alert('Fitur gambar belum siap. Coba reload halaman.');
                return;
            }

            html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `${document.getElementById('p-nota-num').innerText}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.click();
            });
        }
        window.commitSaveNota = function() {
            const notaNum = document.getElementById('p-nota-num').innerText || "Nota";
            const payload = {
                id: notaNum,
                tanggal: document.getElementById('p-nota-date').innerText,
                tanggalRaw: getWibRawDate(),
                kurirNama: userSession.nama,
                kurirUsername: userSession.username,
                status: document.getElementById('p-nota-status').innerText || "Lunas",
                itemsCount: notaState.items.length,
                items: notaState.items || [],
                biayaTambahan: notaState.biaya || [],
                subtotal: notaState.subtotal,
                ongkir: notaState.ongkir,
                total: notaState.total
            };

            push(ref(db, 'nota'), payload).then(() => {
                alert("Nota kiriman berhasil disimpan!");
                localStorage.removeItem('sahabatku_nota_draft');
                notaState = { items: [], biaya: [], subtotal: 0, ongkir: 6000, total: 6000 };
                document.getElementById('container-items').innerHTML = '';
                document.getElementById('container-biaya').innerHTML = '';
                
                // TAMBAHAN: Reset input Dropdown Tambahan Biaya ke kondisi awal kosong
                const dropBiaya = document.getElementById('biaya-dropdown');
                if (dropBiaya) dropBiaya.value = '';
                if (document.getElementById('biaya-nama-manual')) document.getElementById('biaya-nama-manual').classList.add('hidden');
                if (document.getElementById('biaya-nominal')) document.getElementById('biaya-nominal').value = '';
                
                const inputOngkir = document.getElementById('nota-ongkir');
                if(inputOngkir) inputOngkir.value = '6.000';
                
                navigateTo('screen-dashboard');
            })
        }
        window.shareWhatsApp = function() {
            const num = document.getElementById('p-nota-num').innerText;
            const kurir = document.getElementById('p-nota-kurir').innerText;
            const element = document.getElementById('canvas-nota');
            const captionText = `Nota: ${num}\nKurir: ${kurir}`;
            const fileNameJpg = `${num}_${kurir}.jpg`.replace(/\s+/g, '_');
            const btnShare = document.querySelector("button[onclick='shareWhatsApp()']");

            if (!element) {
                alert('Preview nota tidak ditemukan.');
                return;
            }

            if (typeof html2canvas === 'undefined') {
                alert('Fitur gambar belum siap. Coba reload halaman.');
                return;
            }

            if (btnShare) btnShare.disabled = true;

            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        alert("Gagal memproses gambar nota.");
                        if (btnShare) btnShare.disabled = false;
                        return;
                    }

                    const file = new File([blob], fileNameJpg, { type: 'image/jpeg' });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: `Nota ${num}`,
                            text: captionText
                        }).finally(() => {
                            if (btnShare) btnShare.disabled = false;
                        });
                    } else {
                        const link = document.createElement('a');
                        link.download = fileNameJpg;
                        link.href = canvas.toDataURL('image/jpeg', 0.9);
                        link.click();

                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(captionText)}`, '_blank');
                        if (btnShare) btnShare.disabled = false;
                    }
                }, 'image/jpeg', 0.9);
            }).catch(err => {
                if (btnShare) btnShare.disabled = false;
                alert("Terjadi kesalahan gambar: " + err.message);
            });
        }

        window.updatePreviewButtonsLayout = function() {
            const btnSimpanNota = document.getElementById('btn-simpan-nota');
            const previewButtons = document.getElementById('preview-action-buttons');
            if (!previewButtons) return;
        
            if (btnSimpanNota && btnSimpanNota.classList.contains('hidden')) {
                previewButtons.className = 'grid grid-cols-2 gap-2 max-w-sm mx-auto';
            } else {
                previewButtons.className = 'grid grid-cols-3 gap-2 max-w-sm mx-auto';
            }
        };
        window.renderKurirRiwayatList = function(showList = false) {
            const container = document.getElementById('container-riwayat-list');
            if (!container) return;

            const searchKeyword = (document.getElementById('search-riwayat')?.value || '').toLowerCase().trim();
            const filterTgl = document.getElementById('filter-date-riwayat')?.value || getWibRawDate();
            const filterBulan = document.getElementById('filter-bulan-riwayat')?.value || getWibRawDate().substring(0, 7);

            if (!showList) {
                container.innerHTML = `<div class="text-center text-xs text-slate-400 py-4">Klik <b>Cari</b> untuk menampilkan riwayat.</div>`;
                return;
            }

            container.innerHTML = '';
            let hasData = false;

            const keys = Object.keys(cloudNotaList || {}).sort((a, b) => b.localeCompare(a));

            for (let k of keys) {
                const n = cloudNotaList[k];
                if (!n) continue;
                if (userSession && userSession.role === 'kurir' && n.kurirUsername !== userSession.username) continue;
                if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) continue;
                if (filterTgl && n.tanggalRaw !== filterTgl) continue;
                if (searchKeyword && n.id && !n.id.toLowerCase().includes(searchKeyword)) continue;

                hasData = true;
                container.innerHTML += `
                    <div class="bg-white dark:bg-darkCard p-3 rounded-xl border text-xs space-y-2 shadow-sm">
                        <div class="flex justify-between font-bold">
                            <span>${n.id}</span>
                            <span class="text-primary">Rp ${(n.total || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-slate-400">
                            <div>
                                <p>${n.tanggal}</p>
                                <p class="mt-0.5">Status: <span class="font-semibold text-slate-600 dark:text-slate-300">${n.status || 'Lunas'}</span></p>
                            </div>
                            <div class="flex items-center gap-3">
                                <button onclick="previewRiwayatNota('${k}')" class="text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-md">Preview</button>
                                <button onclick="hapusRiwayatNota('${k}')" class="text-danger font-bold bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-md">Hapus</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (!hasData) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Tidak ada riwayat nota untuk filter ini.</div>';
            }
        };
        window.resetRiwayatFilter = function() {
            const today = getWibRawDate();
            const bulanEl = document.getElementById('filter-bulan-riwayat');
            const dateEl = document.getElementById('filter-date-riwayat');
            const searchEl = document.getElementById('search-riwayat');

            if (bulanEl) bulanEl.value = today.substring(0, 7);
            if (dateEl) dateEl.value = today;
            if (searchEl) searchEl.value = '';

            renderKurirRiwayatList(false);
        };

        window.previewRiwayatNota = function(key) {
            const n = cloudNotaList[key];
            if (!n) {
                alert("Data nota tidak ditemukan!");
                return;
            }
            document.getElementById('p-nota-num').innerText = n.id;
            document.getElementById('p-nota-date').innerText = n.tanggal;
            document.getElementById('p-nota-kurir').innerText = n.kurirNama || n.kurirUsername;
            document.getElementById('p-nota-status').innerText = n.status || 'Lunas';
            let totalBiayaTambahan = 0;
            if (n.biayaTambahan && Array.isArray(n.biayaTambahan)) {
                totalBiayaTambahan = n.biayaTambahan.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
            }

            document.getElementById('p-subtotal').innerText = (n.subtotal || (n.total - n.ongkir - totalBiayaTambahan)).toLocaleString('id-ID');
            document.getElementById('p-ongkir').innerText = (n.ongkir || 0).toLocaleString('id-ID');
            document.getElementById('p-biaya').innerText = totalBiayaTambahan.toLocaleString('id-ID');
            document.getElementById('p-total').innerText = (n.total || 0).toLocaleString('id-ID');

            const rincianBiayaList = document.getElementById('p-rincian-biaya-list');
            if (rincianBiayaList) {
                rincianBiayaList.innerHTML = '';
                if (n.biayaTambahan && n.biayaTambahan.length > 0) {
                    rincianBiayaList.classList.remove('hidden');
                    n.biayaTambahan.forEach(b => {
                        rincianBiayaList.innerHTML += `
                            <div class="flex justify-between italic text-slate-400 pl-2">
                                <span>+ ${b.nama}</span>
                                <span>${(b.nominal || 0).toLocaleString('id-ID')}</span>
                            </div>
                        `;
                    });
                } else {
                    rincianBiayaList.classList.add('hidden');
                }
            }
            const tbody = document.getElementById('p-table-body');
            tbody.innerHTML = '';
            if (n.items && Array.isArray(n.items)) {
                n.items.forEach(it => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${it.nama}</td>
                            <td class="text-center">${it.qty}</td>
                            <td class="text-right">${(it.harga || 0).toLocaleString('id-ID')}</td>
                            <td class="text-right">${(it.subtotal || 0).toLocaleString('id-ID')}</td>
                        </tr>`;
                });
            }
            notaState = {
                items: n.items || [],
                biaya: n.biayaTambahan || [],
                subtotal: n.subtotal || 0,
                ongkir: n.ongkir || 0,
                total: n.total || 0
            };
            const btnSimpanNota = document.getElementById('btn-simpan-nota');
            if (btnSimpanNota) btnSimpanNota.classList.add('hidden');
            updatePreviewButtonsLayout();
            navigateTo('screen-preview');
        }
        function saveNotaDraft() {
            try {
                localStorage.setItem('sahabatku_nota_draft', JSON.stringify(notaState));
            } catch (e) {}
        }
        window.resetNotaBaru = function() {
            if (!confirm('Bersihkan semua isi nota dan buat nota baru?')) return;
        
            notaState = { items: [], biaya: [], subtotal: 0, ongkir: 6000, total: 6000 };
            localStorage.removeItem('sahabatku_nota_draft');
        
            const itemNama = document.getElementById('item-nama');
            const itemHarga = document.getElementById('item-harga');
            const itemQty = document.getElementById('item-qty');
            const biayaDrop = document.getElementById('biaya-dropdown');
            const biayaManual = document.getElementById('biaya-nama-manual');
            const biayaNominal = document.getElementById('biaya-nominal');
            const ongkirInput = document.getElementById('nota-ongkir');
        
            if (itemNama) itemNama.value = '';
            if (itemHarga) itemHarga.value = '';
            if (itemQty) itemQty.value = '1';
            if (biayaDrop) biayaDrop.value = '';
            if (biayaManual) biayaManual.classList.add('hidden');
            if (biayaNominal) biayaNominal.value = '';
            if (ongkirInput) ongkirInput.value = '6.000';
        
            if (document.getElementById('container-items')) document.getElementById('container-items').innerHTML = '';
            if (document.getElementById('container-biaya')) document.getElementById('container-biaya').innerHTML = '';
        
            calculateNotaTotal();
            navigateTo('screen-nota');
        };

        function loadNotaDraft() {
            try {
                const draft = localStorage.getItem('sahabatku_nota_draft');
                if (!draft) return false;
        
                const data = JSON.parse(draft);
                if (!data) return false;
        
                notaState = {
                    items: Array.isArray(data.items) ? data.items : [],
                    biaya: Array.isArray(data.biaya) ? data.biaya : [],
                    subtotal: parseInt(data.subtotal) || 0,
                    ongkir: parseInt(data.ongkir) || 6000,
                    total: parseInt(data.total) || 0
                };
        
                return true;
            } catch (e) {
                return false;
            }
        }

        window.hapusRiwayatNota = function(key) {
            const n = cloudNotaList[key];
            const idNota = n ? n.id : "Nota ini";

            if (confirm(`Apakah Anda yakin ingin menghapus ${idNota} secara permanen dari database cloud?`)) {
                remove(ref(db, `nota/${key}`))
                    .then(() => {
                        alert("Nota sukses dihapus!");
                    })
                    .catch((error) => {
                        alert("Gagal menghapus nota: " + error.message);
                    });
            }
        }
        function populateMitraSelectionDropdown() {
            const drop = document.getElementById('m-input-pilih');
            if(!drop) return;
            drop.innerHTML = '';
            for(let k in cloudMitraList) {
                drop.innerHTML += `<option value="${cloudMitraList[k].nama}">${cloudMitraList[k].nama}</option>`;
            }
        }
        window.addTransaksiMitra = function() {
            const mNama = document.getElementById('m-input-pilih').value;
            const trxInput = parseInt(document.getElementById('m-input-trx').value) || 0;
            
            if(!mNama) { alert("Silahkan pilih mitra terlebih dahulu!"); return; }
            if(trxInput <= 0) { alert("Jumlah transaksi harus lebih dari 0!"); return; }
        
            const wib = getWibDate();
            const tglRawLokal = getWibRawDate();
            const waktuLokal = wib.toTimeString().split(' ')[0];
        
            const payload = {
                mitraNama: mNama,
                trxInput: trxInput,
                kurirNama: userSession.nama,
                kurirUsername: userSession.username,
                waktu: waktuLokal,
                tglRaw: tglRawLokal
            };
        
            push(ref(db, 'log_mitra'), payload).then(() => {
                alert("Transaksi mitra berhasil di-input!");
                document.getElementById('m-input-trx').value = '';
                if (typeof calculateMitraStats === 'function') calculateMitraStats();
            });
        };
        window.sembunyikanRiwayatMitra = function() {
            const container = document.getElementById('container-kurir-log-mitra');
            if (container) {
                container.innerHTML = '<div class="text-center text-slate-400 italic py-4">Riwayat disembunyikan.</div>';
            }
        };
        window.lihatRiwayatMitraOtomatis = function(namaMitra) {
            const mitra = Object.values(cloudMitraList || {}).find(m => normalizeNama(m.nama) === normalizeNama(namaMitra));
            if (!mitra) {
                alert('Data mitra tidak ditemukan!');
                return;
            }
        
            const html = `
                <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" id="popup-detail-mitra">
                    <div class="bg-white dark:bg-darkCard w-full max-w-md rounded-2xl p-4 space-y-4 shadow-2xl">
                        <div class="flex justify-between items-center">
                            <h3 class="font-bold text-sm">Detail Mitra</h3>
                            <button onclick="document.getElementById('popup-detail-mitra').remove()" class="text-slate-400">✕</button>
                        </div>
        
                        <div class="space-y-2 text-xs">
                            <div><b>Nama:</b> ${mitra.nama || '-'}</div>
                            <div><b>Alamat:</b> ${mitra.alamat || '-'}</div>
                            <div><b>No HP:</b> ${mitra.hp || '-'}</div>
                            <div><b>Target:</b> ${mitra.target || 0} trx</div>
                        </div>
        
                        <div class="flex gap-2">
                            <button onclick="editDataMitraByPopup('${Object.keys(cloudMitraList).find(k => normalizeNama(cloudMitraList[k].nama) === normalizeNama(namaMitra))}'); document.getElementById('popup-detail-mitra').remove();" class="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold">
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            `;
        
            document.body.insertAdjacentHTML('beforeend', html);
        };
        window.editDataMitraByPopup = function(key) {
            const d = cloudMitraList[key];
            if (!d) return;
        
            document.getElementById('edit-mitra-id').value = key;
            document.getElementById('edit-mitra-nama').value = d.nama || '';
            document.getElementById('edit-mitra-alamat').value = d.alamat || '';
            document.getElementById('edit-mitra-hp').value = d.hp || '';
            document.getElementById('edit-mitra-target').value = d.target || '';
            document.getElementById('modal-edit-mitra').classList.remove('hidden');
        };
        
        window.renderKurirLogMitra = function(filterNamaMitraKhusus = '', filterBulanKhusus = '') {
            const container = document.getElementById('container-kurir-log-mitra');
            const fTgl = document.getElementById('m-filter-tgl-kurir')?.value || '';
        
            if (!filterNamaMitraKhusus && !fTgl) {
                alert("Pilih tanggal atau klik Lihat pada mitra!");
                return;
            }
        
            if (!container) return;
            container.innerHTML = '';
        
            const bulanSkrg = getWibRawDate().substring(0, 7);
            const bulanFilter = filterBulanKhusus || bulanSkrg;
        
            let adaDataLog = false;
            let logKeysSorted = Object.keys(cloudLogMitra || {}).sort((a, b) => b.localeCompare(a));
        
            logKeysSorted.forEach(k => {
                const log = cloudLogMitra[k];
                if (!log) return;
        
                if (userSession && log.kurirUsername !== userSession.username) return;
                if (filterNamaMitraKhusus && log.mitraNama !== filterNamaMitraKhusus) return;
                if (!filterNamaMitraKhusus && fTgl && log.tglRaw !== fTgl) return;
                if (log.tglRaw && log.tglRaw.substring(0, 7) !== bulanFilter) return;
        
                adaDataLog = true;
                const waktuTampil = log.waktu ? log.waktu.substring(0, 5) : '00:00';
        
                container.innerHTML += `
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded flex justify-between items-center text-[11px] border border-slate-100 dark:border-slate-700/50 mb-1">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-800 dark:text-white">${log.mitraNama}</span>
                            <span class="text-[9px] text-slate-500 font-medium">
                                ${log.tglRaw} • ${waktuTampil} WIB
                            </span>
                        </div>
                        <b class="text-blue-600 dark:text-blue-400 text-sm">+${log.trxInput} Trx</b>
                    </div>
                `;
            });
        
            if (!adaDataLog) {
                container.innerHTML = `<div class="text-center text-slate-400 italic py-2">Tidak ada data ditemukan.</div>`;
            }
        };
        window.cariMitra = function() {
            const input = document.getElementById('input-cari-mitra').value.toLowerCase();
            const container = document.getElementById('container-mitra-list');
            const kartuMitra = container.getElementsByClassName('bg-white'); // Mengambil class yang ada di kartu mitra
        
            for (let i = 0; i < kartuMitra.length; i++) {
                const namaMitra = kartuMitra[i].getElementsByTagName('h5')[0].textContent.toLowerCase();
                
                if (namaMitra.includes(input)) {
                    kartuMitra[i].style.display = ""; // Tampilkan
                } else {
                    kartuMitra[i].style.display = "none"; // Sembunyikan
                }
            }
        };
        window.renderKurirMitraView = function(showList = false) {
            const container = document.getElementById('container-mitra-list');
            if (!container) return;

            if (!showList) {
                container.innerHTML = `
                    <div class="bg-white dark:bg-darkCard p-4 rounded-xl border text-center">
                        <div class="font-bold text-sm">Daftar mitra disembunyikan</div>
                        <div class="text-xs text-slate-400 mt-1">Klik tombol untuk menampilkan list.</div>
                    </div>
                `;
                return;
            }

            if (container.dataset.loaded === '1') return;
            container.dataset.loaded = '1';
            container.innerHTML = '';

            const selectMitra = document.getElementById('m-input-pilih');
            if (selectMitra && selectMitra.options.length <= 1) {
                selectMitra.innerHTML = '<option value="\">-- Pilih Mitra --</option>';
                Object.entries(cloudMitraList || {}).forEach(([k, m]) => {
                    if (m && m.nama) {
                        selectMitra.innerHTML += `<option value="${m.nama}">${m.nama}</option>`;
                    }
                });
            }

            // Hitung stat global untuk semua mitra
            const mitraStats = {};
            Object.entries(cloudMitraList || {}).forEach(([k, m]) => {
                if (!m || !m.nama) return;
                mitraStats[m.nama] = { totalTrx: 0, target: m.target || 0, hp: m.hp || '', alamat: m.alamat || '' };
            });

            Object.entries(cloudLogMitra || {}).forEach(([_, log]) => {
                if (!log || !log.mitraNama) return;
                const nama = log.mitraNama;
                if (mitraStats[nama]) {
                    mitraStats[nama].totalTrx += parseInt(log.trxInput) || 0;
                }
            });

            // Render semua mitra sekaligus
            const allMitraHtml = Object.entries(cloudMitraList || {})
                .filter(([_, m]) => m && m.nama)
                .map(([k, m], idx) => {
                    const stats = mitraStats[m.nama] || { totalTrx: 0, target: 0, hp: '', alamat: '' };
                    const target = stats.target || 0;
                    const totalTrx = stats.totalTrx || 0;

                    let cleanPhone = (m.hp || '').toString().trim().replace(/[^0-9+]/g, '');
                    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
                    else if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);

                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
                    const mapsLink = m.alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.alamat)}` : '#';

                    return `
                        <div class="bg-white dark:bg-darkCard p-3 rounded-xl border text-xs space-y-2.5 shadow-sm">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-bold text-slate-800 dark:text-white">${idx + 1}. ${m.nama}</h5>
                                    <a href="${mapsLink}" target="_blank" class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline block mt-0.5">
                                        Alamat: ${m.alamat || 'Belum Diisi'}
                                    </a>
                                </div>
                                <a href="${waLink}" target="_blank" class="px-2.5 py-1 bg-emerald-50 text-success rounded font-bold text-[10px] border border-emerald-100">
                                    WhatsApp
                                </a>
                            </div>
                            <div class="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[11px] border border-slate-100 dark:border-slate-800">
                                <div><span class="text-slate-400 block text-[9px] uppercase">Total Trx</span><span class="font-extrabold text-slate-700 dark:text-slate-200">${totalTrx} Trx</span></div>
                                <div><span class="text-slate-400 block text-[9px] uppercase">Target</span><span class="font-extrabold text-amber-500">${target} Trx</span></div>
                            </div>
                            <div class="flex gap-1.5 pt-0.5">
                                <button onclick="bukaInputTransaksiMitra('${m.nama}')" class="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase">Input Trx</button>
                                <button onclick="lihatRiwayatMitraOtomatis('${m.nama}')" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px] uppercase border border-slate-200/50">Lihat</button>
                            </div>
                        </div>
                    `;
                })
                .join('');

            container.innerHTML = allMitraHtml || '<div class="text-center text-xs text-slate-400 py-4">Belum ada data mitra.</div>';
        };

        window.toggleMitraList = function() {
            const box = document.getElementById('container-mitra-list');
            if (!box) return;

            if (box.dataset.loaded === '1') {
                box.dataset.loaded = '0';
                box.innerHTML = '';
                renderKurirMitraView(false);
            } else {
                renderKurirMitraView(true);
            }
        };

        window.toggleRiwayatTrxInputan = function() {
            const box = document.getElementById('box-riwayat-trx-inputan');
            if (!box) return;
        
            const today = getWibRawDate();
            const tglEl = document.getElementById('am-log-tgl');
            if (tglEl && !tglEl.value) tglEl.value = today;
        
            const bulanEl = document.getElementById('am-log-bulan');
            if (bulanEl && !bulanEl.value) bulanEl.value = today.substring(0, 7);
        
            box.classList.toggle('hidden');
            if (!box.classList.contains('hidden')) {
                renderAdminLogMitra();
            }
        };
        window.renderAdminKurirList = function() {
            const container = document.getElementById('container-admin-kurir');
            if (!container) return;

            const isOpen = ensureSectionToggleState('container-admin-kurir', false);
            const keys = Object.keys(cloudKurirList || {}).filter(k => {
                const item = cloudKurirList[k];
                return item && item.role !== 'admin' && item.username !== 'admin';
            });

            container.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                </div>
                <div id="container-admin-kurir-inner" class="${isOpen ? '' : 'hidden'} space-y-2"></div>
            `;

            const inner = document.getElementById('container-admin-kurir-inner');
            if (!inner || !isOpen) return;

            if (!keys.length) {
                inner.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada data kurir.</p>';
                return;
            }

            const isHeadOperasional = userSession && userSession.role === 'manajemen' && (userSession.kategori || '').trim() === 'Head Operasional';

            inner.innerHTML = keys.map(key => {
                const item = cloudKurirList[key];
                const dotStatus = item.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500';
                return `
                    <div class="bg-white dark:bg-darkCard p-3.5 rounded-xl border dark:border-slate-800 shadow-sm space-y-2 text-xs">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2.5 h-2.5 rounded-full ${dotStatus} shrink-0"></span>
                                <span class="font-bold text-sm dark:text-white truncate">${item.nama}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 shrink-0">Gabung: ${item.tglGabung || '-'}</span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg grid grid-cols-2 gap-2 font-mono text-[11px]">
                            <div class="dark:text-slate-300">Leader: <span class="text-emerald-600 font-bold block truncate">${item.leader || '-'}</span></div>
                            <div class="dark:text-slate-300">User: <span class="text-primary font-bold block truncate">@${item.username}</span></div>
                            <div class="dark:text-slate-300">Pass: <span class="text-amber-500 font-bold block truncate">${item.password}</span></div>
                            <div class="dark:text-slate-300">Ongkir Pass: <span class="text-fuchsia-500 font-bold block truncate">${item.ongkirPassword || '-'}</span></div>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] text-slate-500">Akses Cek Ongkir</span>
                                <span class="text-[10px] font-bold ${item.ongkirLocked ? 'text-rose-500' : 'text-emerald-500'}">${item.ongkirLocked ? 'TERKUNCI' : 'TERBUKA'}</span>
                            </div>
                            <input type="text" id="ongkir-pass-${key}" value="${item.ongkirPassword || ''}" placeholder="Password khusus ongkir" class="w-full px-2 py-1 border rounded-md text-[11px] dark:bg-darkBg dark:border-slate-700">
                            <div class="grid grid-cols-2 gap-2">
                                <button onclick="toggleOngkirAkses('${key}')" class="py-1.5 rounded-md text-[10px] font-bold uppercase ${item.ongkirLocked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">
                                    ${item.ongkirLocked ? 'Buka Akses Ongkir' : 'Kunci Akses Ongkir'}
                                </button>
                                <button onclick="simpanPasswordOngkir('${key}')" class="py-1.5 rounded-md bg-blue-50 text-blue-600 font-bold text-[10px] uppercase">
                                    Simpan Password Ongkir
                                </button>
                            </div>
                        </div>
                        ${isHeadOperasional ? '' : `
                        <div class="flex justify-end gap-2 pt-1">
                            <button onclick="editAkunKurir('${key}')" class="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white rounded-md font-semibold">Edit</button>
                            <button onclick="hapusAkunKurir('${key}')" class="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-md font-semibold">Hapus</button>
                        </div>`}
                    </div>
                `;
            }).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        };       
        window.sembunyikanRiwayatMitraAdmin = function() {
            const box = document.getElementById('box-riwayat-trx-inputan');
            const container = document.getElementById('container-admin-log-mitra');
            if (container) container.innerHTML = '';
            if (box) box.classList.add('hidden');
        };

        window.bukaInputTransaksiMitra = function(namaMitra) {
            const modal = document.getElementById('modal-input-trx-mitra');
            const inputNama = document.getElementById('trx-mitra-name');
            const display = document.getElementById('trx-mitra-display');
            const bulan = document.getElementById('trx-mitra-bulan');
            const jumlah = document.getElementById('trx-mitra-jumlah');
        
            if (!modal || !inputNama || !display || !bulan || !jumlah) return;
        
            inputNama.value = namaMitra;
            display.value = namaMitra;
            bulan.value = getWibRawDate().substring(0, 7);
            jumlah.value = '';
        
            modal.classList.remove('hidden');
        };
        window.closeInputTrxMitraModal = function() {
            const modal = document.getElementById('modal-input-trx-mitra');
            if (modal) modal.classList.add('hidden');
        };
        
        window.saveInputTrxMitra = function() {
            const namaMitra = document.getElementById('trx-mitra-name').value;
            const bulan = document.getElementById('trx-mitra-bulan').value;
            const trxInput = parseInt(document.getElementById('trx-mitra-jumlah').value) || 0;
        
            if (!namaMitra) return alert('Mitra belum dipilih!');
            if (!bulan) return alert('Pilih bulan!');
            if (trxInput <= 0) return alert('Jumlah transaksi harus lebih dari 0!');
        
            const wib = getWibDate();
            const payload = {
                mitraNama: namaMitra,
                trxInput: trxInput,
                kurirNama: userSession.nama,
                kurirUsername: userSession.username,
                waktu: wib.toTimeString().split(' ')[0],
                tglRaw: getWibRawDate(),
                bulan: bulan
            };
        
            push(ref(db, 'log_mitra'), payload).then(() => {
                alert('Transaksi mitra berhasil disimpan!');
                closeInputTrxMitraModal();
            });
        };
        
        document.addEventListener('DOMContentLoaded', () => {
            const anBulanEl = document.getElementById('an-filter-bulan');
            if (anBulanEl && !anBulanEl.value) anBulanEl.value = getWibRawDate().substring(0, 7);

            const tglSkrgWib = getWibRawDate();
            ['an-filter-tgl', 'riwayat-filter-tgl', 'am-log-tgl', 'm-filter-tgl-kurir'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value) el.value = tglSkrgWib;
            });

            if (typeof sembunyikanRiwayatMitra === 'function') sembunyikanRiwayatMitra();
            if (typeof loadNotaDraft === 'function') loadNotaDraft();
        });

        window.toggleRiwayatMitraKurir = function() {
            const box = document.getElementById('box-riwayat-mitra-kurir');
            if (!box) return;
            box.classList.toggle('hidden');
            if (!box.classList.contains('hidden')) {
                renderKurirLogMitra();
            }
        };
        window.sembunyikanRiwayatMitraKurir = function() {
            const box = document.getElementById('box-riwayat-mitra-kurir');
            const container = document.getElementById('container-kurir-log-mitra');
            if (container) container.innerHTML = '';
            if (box) box.classList.add('hidden');
        };
        
        window.hitungTarifOngkir = function() {
            const asal = document.getElementById('ongkir-asal').value.trim();
            const tujuan = document.getElementById('ongkir-tujuan').value.trim();
        
            if (!asal && !tujuan) {
                alert('Isi minimal salah satu: asal atau tujuan.');
                return;
            }
        
            const cariTarif = (nama) => {
                for (let k in cloudOngkirList) {
                    const item = cloudOngkirList[k];
                    if (item && normalizeNama(item.wilayah) === normalizeNama(nama)) {
                        return parseInt(item.tarif) || 0;
                    }
                }
                return 0;
            };
        
            const tarifAsal = asal ? cariTarif(asal) : 0;
            const tarifTujuan = tujuan ? cariTarif(tujuan) : 0;
        
            let hasil = 0;
            if (asal && tujuan) hasil = tarifAsal + tarifTujuan - 6000;
            else if (asal) hasil = tarifAsal;
            else hasil = tarifTujuan;
        
            document.getElementById('ongkir-tarif-display').innerText = 'Rp ' + Math.max(0, hasil).toLocaleString('id-ID');
            document.getElementById('ongkir-result-card').classList.remove('hidden');
        };

        window.clearOngkirForm = function() {
            document.getElementById('ongkir-asal').value = '';
            document.getElementById('ongkir-tujuan').value = '';
            document.getElementById('ongkir-result-card').classList.add('hidden');
        }
        window.openJadwal = function() {
            window.location.href = "absensi-kurir-sahabatku.html";
        };
        
        window.openSOP = function() {
            const modal = document.getElementById('modal-sop');
            if (modal) modal.classList.remove('hidden');
        };
        window.renderAdminNotificationHistory = function() {
            const container = document.getElementById('container-admin-notification-history');
            if (!container) return;

            const isOpen = ensureSectionToggleState('container-admin-notification-history', false);
            const items = Object.entries(cloudNotificationList || {}).sort((a, b) => (b[1]?.createdAt || '').localeCompare(a[1]?.createdAt || ''));

            container.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                    <button type="button" onclick="toggleSectionList('container-admin-notification-history')" class="flex-1 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-bold uppercase">
                        ${isOpen ? 'Tutup' : 'Buka'}
                    </button>
                </div>
                <div id="container-admin-notification-history-inner" class="${isOpen ? '' : 'hidden'} space-y-2"></div>
            `;

            const inner = document.getElementById('container-admin-notification-history-inner');
            if (!inner || !isOpen) return;

            inner.innerHTML = items.length ? items.map(([key, n]) => `
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border text-xs space-y-2">
                    <div class="flex justify-between items-start gap-2">
                        <div class="min-w-0 flex-1">
                            <div class="font-bold text-[11px] sm:text-sm leading-snug break-words">${n.message || '-'}</div>
                            <div class="text-[10px] text-slate-400 mt-1">${n.target === 'all' ? 'Semua Kurir' : `Kurir Terpilih (${(n.targetList || []).length})`}</div>
                            <div class="text-[10px] text-slate-400">${n.createdAt ? new Date(n.createdAt).toLocaleString('id-ID') : '-'}</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="resendNotification('${key}')" class="w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">Kirim Lagi</button>
                        <button onclick="deleteNotification('${key}')" class="w-full py-2 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Hapus</button>
                    </div>
                </div>
            `).join('') : '<div class="text-center text-xs text-slate-400 py-4">Belum ada notifikasi.</div>';
        };        
        window.closeModal = function(id) {
            const modal = document.getElementById(id);
            if (modal) modal.classList.add('hidden');
        };
        function ensureSectionToggleState(id, defaultOpen = false) {
            const el = document.getElementById(id);
            if (!el) return false;
            if (!el.dataset.open) el.dataset.open = defaultOpen ? '1' : '0';
            return el.dataset.open === '1';
        }
        window.toggleSection = function(id) {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden');
        };

        window.toggleSectionList = function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.dataset.open = el.dataset.open === '1' ? '0' : '1';
            if (id === 'container-admin-kurir') renderAdminKurirList();
            if (id === 'container-admin-manajemen') renderAdminManajemen();
            if (id === 'container-admin-daftar-mitra') renderAdminDaftarMitra();
            if (id === 'container-admin-ongkir') renderAdminOngkirList();
            if (id === 'container-admin-notification-history') renderAdminNotificationHistory();
        };
        function initTheme() {
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.documentElement.classList.add('dark');
                const toggle = document.getElementById('dark-mode-toggle');
                if (toggle) toggle.checked = true;
            } else {
                document.documentElement.classList.remove('dark');
                const toggle = document.getElementById('dark-mode-toggle');
                if (toggle) toggle.checked = false;
            }
        }

        window.toggleDarkMode = function(isDark) {
            if(isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
            else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
        }
        function loadChartJs() {
            return new Promise((resolve, reject) => {
                if (window.Chart) return resolve();
        
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                s.onload = () => resolve();
                s.onerror = () => reject(new Error('Gagal load Chart.js'));
                document.head.appendChild(s);
            });
        }
        window.loadRekapKurir = function() {
            if (!userSession || userSession.role !== 'kurir') return;
            
            const usernameKurir = userSession.username;
            const rekapBulanSelect = document.getElementById('rekap-bulan');
            const rekapTanggalInput = document.getElementById('rekap-tanggal');
            
            const now = new Date();
            const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
            const hariIni = wib.toISOString().split('T')[0]; 
            const bulanIni = hariIni.substring(0, 7); 

            if (rekapTanggalInput && !rekapTanggalInput.value) {
                rekapTanggalInput.value = hariIni;
            }
        
            let totalPendapatan = 0;
            let totalOngkir = 0;
            let totalTambahan = 0;
            let totalNotaCount = 0;
            let totalTrxMitra = 0;
            let rekapHarianMap = {};
            
            let kumpulanBulanUnik = new Set();
            kumpulanBulanUnik.add(bulanIni); // Pastikan bulan saat ini wajib masuk daftar
            for (let key in cloudNotaList) {
                const nota = cloudNotaList[key];
                if (nota.kurirUsername !== usernameKurir) continue;
        
                const tglNota = nota.tanggalRaw;
                if (!tglNota) continue;
                
                const blnNota = tglNota.substring(0, 7);
                kumpulanBulanUnik.add(blnNota);
        
                const nominalOngkir = parseInt(nota.ongkir) || 0;
                let nominalTambahan = 0;
        
                if (nota.biayaTambahan && Array.isArray(nota.biayaTambahan)) {
                    nota.biayaTambahan.forEach(item => {
                        nominalTambahan += (parseInt(item.nominal) || 0);
                    });
                }
                const pendapatanNotaIni = nominalOngkir + nominalTambahan;
                if (!rekapHarianMap[tglNota]) {
                    rekapHarianMap[tglNota] = { notaCount: 0, pendapatan: 0, trxMitra: 0 };
                }
                if (rekapBulanSelect && rekapBulanSelect.value === blnNota) {
                    rekapHarianMap[tglNota].notaCount += 1;
                    rekapHarianMap[tglNota].pendapatan += pendapatanNotaIni; // REVISI: Sekarang menggunakan (Ongkir + Tambahan)
                }
                if (rekapBulanSelect && rekapBulanSelect.value) {
                    if (rekapTanggalInput && rekapTanggalInput.value) {
                        if (tglNota !== rekapTanggalInput.value) continue;
                    } else {
                        if (blnNota !== rekapBulanSelect.value) continue;
                    }
                }
                totalOngkir += nominalOngkir;
                totalTambahan += nominalTambahan;
                totalPendapatan += pendapatanNotaIni;
                totalNotaCount++;
            }
            for (let key in cloudLogMitra) {
                const log = cloudLogMitra[key];
                if (log.kurirUsername !== usernameKurir) continue;
        
                const tglLog = log.tglRaw || log.tanggalRaw;
                if (!tglLog) continue;
                
                const blnLog = tglLog.substring(0, 7);
                const jumlahTrxInput = parseInt(log.trxInput) || 0;
                
                kumpulanBulanUnik.add(blnLog); // Catat bulan dari transaksi mitra ke sistem dropdown
        
                if (!rekapHarianMap[tglLog]) {
                    rekapHarianMap[tglLog] = { notaCount: 0, pendapatan: 0, trxMitra: 0 };
                }
                
                if (rekapBulanSelect && rekapBulanSelect.value === blnLog) {
                    rekapHarianMap[tglLog].trxMitra += jumlahTrxInput;
                }
                if (rekapBulanSelect && rekapBulanSelect.value) {
                    if (rekapTanggalInput && rekapTanggalInput.value) {
                        if (tglLog !== rekapTanggalInput.value) continue;
                    } else {
                        if (blnLog !== rekapBulanSelect.value) continue;
                    }
                }
                totalTrxMitra += jumlahTrxInput;
            }
            if (rekapBulanSelect && rekapBulanSelect.options.length === 0) {
                const daftarBulanUrut = Array.from(kumpulanBulanUnik).sort((a, b) => b.localeCompare(a));
                
                daftarBulanUrut.forEach(bln => {
                    const [tahun, bulan] = bln.split('-');
                    const namaBulanIndo = new Date(tahun, parseInt(bulan) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                    const opt = new Option(namaBulanIndo, bln);
                    rekapBulanSelect.add(opt);
                });
                rekapBulanSelect.value = bulanIni;
                loadRekapKurir();
                return;
            }

            document.getElementById('rk-pendapatan').innerText = "Rp " + totalPendapatan.toLocaleString('id-ID');
            document.getElementById('rk-ongkir').innerText = "Rp " + totalOngkir.toLocaleString('id-ID');
            document.getElementById('rk-tambahan').innerText = "Rp " + totalTambahan.toLocaleString('id-ID');
            document.getElementById('rk-nota-count').innerText = totalNotaCount;
            document.getElementById('rk-total-trx-mitra').innerText = totalTrxMitra + " Trx";

            const tabelBody = document.getElementById('rk-tabel-perhari');
            if (tabelBody && rekapBulanSelect) {
                tabelBody.innerHTML = '';
                const bulanTerpilih = rekapBulanSelect.value;
                const urutanTanggal = Object.keys(rekapHarianMap).sort((a, b) => b.localeCompare(a));
                let adaData = false;
        
                urutanTanggal.forEach(tglKey => {
                    if (tglKey.substring(0, 7) !== bulanTerpilih) return;
                    
                    adaData = true;
                    const dataHariIni = rekapHarianMap[tglKey];
                    const opsiFormat = { day: 'numeric', month: 'short' };
                    const tglCantik = new Date(tglKey).toLocaleDateString('id-ID', opsiFormat);
        
                    tabelBody.innerHTML += `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td class="py-2 font-medium text-slate-700 dark:text-slate-300">${tglCantik}</td>
                            <td class="py-2 text-center text-slate-500">${dataHariIni.notaCount} Nota</td>
                            <td class="py-2 text-right font-bold text-primary">Rp ${dataHariIni.pendapatan.toLocaleString('id-ID')}</td>
                            <td class="py-2 text-right font-semibold text-indigo-600">${dataHariIni.trxMitra} Trx</td>
                        </tr>
                    `;
                });
        
                if (!adaData) {
                    tabelBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-400 py-4 italic">Belum ada aktivitas di bulan ini.</td></tr>`;
                }
            }
            loadChartJs().then(() => {
                initChartsEngine(rekapHarianMap);
            }).catch(err => {
                console.error(err);
            });
        };
        window.updateKurirDashboard = function() {
            if (!userSession || userSession.role !== 'kurir') return;
        
            const usernameKurir = userSession.username;
            const wib = getWibDate();
        
            const formatHariIni = wib.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        
            const tanggalRawHariIni = getWibRawDate();
        
            const elemenTanggal = document.getElementById('dash-date');
            if (elemenTanggal) {
                elemenTanggal.innerText = formatHariIni;
            }
        
            let totalNotaHariIni = 0;
            let totalOmsetHariIni = 0;
        
            for (let key in cloudNotaList) {
                const nota = cloudNotaList[key];
                if (!nota) continue;
        
                if (nota.kurirUsername !== usernameKurir) continue;
                if (nota.tanggalRaw !== tanggalRawHariIni) continue;
        
                const nominalOngkir = parseInt(nota.ongkir) || 0;
                let nominalTambahan = 0;
        
                if (nota.biayaTambahan && Array.isArray(nota.biayaTambahan)) {
                    nota.biayaTambahan.forEach(item => {
                        nominalTambahan += (parseInt(item.nominal) || 0);
                    });
                }
        
                totalNotaHariIni++;
                totalOmsetHariIni += (nominalOngkir + nominalTambahan);
            }
        
            const elTotalTrx = document.getElementById('dash-k-total-trx');
            const elTotalIncome = document.getElementById('dash-k-total-income');
            const elNextNota = document.getElementById('dash-next-nota');
        
            if (elTotalTrx) elTotalTrx.innerText = totalNotaHariIni;
            if (elTotalIncome) elTotalIncome.innerText = "Rp " + totalOmsetHariIni.toLocaleString('id-ID');
        
            const nextCode = `NT-${tanggalRawHariIni.replace(/-/g, '')}-${String(totalNotaHariIni + 1).padStart(4, '0')}`;
            if (elNextNota) elNextNota.innerText = nextCode;
            if (typeof calculateMitraStats === 'function') calculateMitraStats();
        };
        let instanceChartRekap = null;
        
        function initChartsEngine(dataHarianSistem = {}) {
            const chartContainer = document.getElementById('chart-rekap-container');
            const canvasLama = document.getElementById('chartPendapatan');
            if (!chartContainer || !canvasLama) return;
            if (instanceChartRekap !== null) {
                instanceChartRekap.destroy();
            }
            chartContainer.innerHTML = '<canvas id="chartPendapatan" class="w-full h-36"></canvas>';
            const ctx = document.getElementById('chartPendapatan').getContext('2d');
            const daftarTanggalUrut = Object.keys(dataHarianSistem).sort((a, b) => a.localeCompare(b));
            
            let labelsGrafik = [];
            let dataNotaGrafik = [];
            let dataPendapatanGrafik = [];
        
            const tanggalTerbatas = daftarTanggalUrut.slice(-10);
            tanggalTerbatas.forEach(tglKey => {
                const opsiFormat = { day: 'numeric', month: 'short' };
                const tglLabelCantik = new Date(tglKey).toLocaleDateString('id-ID', opsiFormat);
                
                labelsGrafik.push(tglLabelCantik);
                dataNotaGrafik.push(dataHarianSistem[tglKey].notaCount || 0);
                dataPendapatanGrafik.push(dataHarianSistem[tglKey].pendapatan || 0);
            });
        
            if (labelsGrafik.length === 0) {
                labelsGrafik = ['Belum Ada Data'];
                dataNotaGrafik = [0];
                dataPendapatanGrafik = [0];
            }
        
            instanceChartRekap = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labelsGrafik,
                    datasets: [
                        {
                            label: 'Pendapatan (Rp)',
                            data: dataPendapatanGrafik,
                            borderColor: '#0066FF', // Warna Biru Utama Sahabatku
                            backgroundColor: 'rgba(0, 102, 255, 0.05)',
                            borderWidth: 2,
                            tension: 0.2,
                            pointRadius: 3,
                            yAxisID: 'yPendapatan', // Menggunakan skala Y khusus Pendapatan (Kiri)
                            fill: true
                        },
                        {
                            label: 'Jumlah Nota',
                            data: dataNotaGrafik,
                            borderColor: '#10B981', // Warna Hijau Success
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5], // Garis putus-putus biar beda dari garis pendapatan
                            tension: 0.2,
                            pointRadius: 3,
                            pointBackgroundColor: '#10B981',
                            yAxisID: 'yNota' // Menggunakan skala Y khusus Jumlah Nota (Kanan)
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true, 
                            labels: { boxWidth: 12, font: { size: 9, weight: 'bold' } }
                        }
                    },
                    scales: {
                        yPendapatan: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            grid: { color: 'rgba(148, 163, 184, 0.06)' },
                            ticks: {
                                font: { size: 8 },
                                callback: function(value) {
                                    if (value >= 1000) return 'Rp ' + (value / 1000) + 'k';
                                    return 'Rp ' + value;
                                }
                            }
                        },
                        // Skala Sebelah Kanan untuk satuan nota (Jumlah Nota)
                        yNota: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: { drawOnChartArea: false }, // Biar garis grid tidak tabrakan dengan sisi kiri
                            ticks: {
                                font: { size: 8 },
                                stepSize: 1, // Angka nota naik bulat per 1 nota (1, 2, 3...)
                                callback: function(value) { return value + ' Nta'; }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 9 } }
                        }
                    }
                }
            });
        }
        window.toggleAdminNotaList = function(show) {
            const container = document.getElementById('container-admin-nota');
            if (!container) return;
        
            const bulanEl = document.getElementById('an-filter-bulan');
            const bulanIni = getWibRawDate().substring(0, 7);
            if (bulanEl && !bulanEl.value) bulanEl.value = bulanIni;
        
            if (show) {
                container.classList.remove('hidden');
                renderAdminNota();
            } else {
                container.classList.add('hidden');
                container.innerHTML = '';
            }
        };
        window.renderAdminNota = function() {
            if (isRenderAdminNotaRunning) return;
            isRenderAdminNotaRunning = true;
            try {
                const container = document.getElementById('container-admin-nota');
                if (!container) return;
            
                const filterKurir = document.getElementById('an-filter-kurir')?.value || 'semua';
                const filterTgl = document.getElementById('an-filter-tgl')?.value || '';
                const filterBulan = document.getElementById('an-filter-bulan')?.value || '';
            
                container.innerHTML = '';
            
                let adaData = false;
            
                const keys = Object.keys(cloudNotaList || {}).sort((a, b) => {
                    const ta = cloudNotaList[a]?.tanggalRaw || '';
                    const tb = cloudNotaList[b]?.tanggalRaw || '';
                    return tb.localeCompare(ta);
                });
            
                keys.forEach(key => {
                    const n = cloudNotaList[key];
                    if (!n) return;
            
                    if (filterKurir !== 'semua' && n.kurirUsername !== filterKurir) return;
                    if (filterTgl && n.tanggalRaw !== filterTgl) return;
                    if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) return;
            
                    adaData = true;
            
                    const totalBiaya = (n.biayaTambahan || []).reduce((acc, b) => acc + (b.nominal || 0), 0);
                    const statusText = (n.status || '-').toUpperCase();
                    const statusColor = statusText === 'ADMIN'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300';
            
                    container.innerHTML += `
                        <div class="bg-white dark:bg-darkCard p-2.5 rounded-lg border shadow-sm text-[11px] space-y-1.5">
                            <div class="flex justify-between items-start gap-2">
                                <div class="min-w-0">
                                    <div class="font-bold text-[12px] leading-tight truncate">${n.id || '-'}</div>
                                    <div class="text-[10px] text-slate-400">${n.tanggal || '-'}</div>
                                </div>
                                <div class="flex flex-col items-end gap-1">
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">
                                        ${statusText}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        ${n.kurirNama || '-'}
                                    </span>
                                </div>
                            </div>
            
                            <div class="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <div>
                                    <div class="text-[9px] text-slate-400">Ongkir</div>
                                    <div class="font-bold text-[11px]">Rp ${(n.ongkir || 0).toLocaleString('id-ID')}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] text-slate-400">Tambahan</div>
                                    <div class="font-bold text-[11px]">Rp ${totalBiaya.toLocaleString('id-ID')}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] text-slate-400">Item</div>
                                    <div class="font-bold text-[11px]">${(n.items || []).length}</div>
                                </div>
                                <div>
                                    <div class="text-[9px] text-slate-400">Total</div>
                                    <div class="font-bold text-[11px] text-primary">Rp ${(n.total || 0).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
            
                            <div class="flex justify-end gap-2 pt-0.5">
                                <button onclick="viewAdminNota('${key}')" class="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 font-bold text-[10px]">Preview</button>
                                <button onclick="hapusNotaGlobal('${key}')" class="px-2.5 py-1 rounded-md bg-red-50 text-red-600 font-bold text-[10px]">Hapus</button>
                            </div>
                        </div>
                    `;
                });
            
                if (!adaData) {
                    container.innerHTML = `<div class="text-center text-xs text-slate-400 py-4">Tidak ada nota sesuai filter.</div>`;
                }
            } finally {
                isRenderAdminNotaRunning = false;
            }
        };
        window.populateLaporanFilter = function() {
            const bulanSelect = document.getElementById('laporan-filter-bulan');
            const kurirSelect = document.getElementById('laporan-filter-kurir');
            if (!bulanSelect || !kurirSelect) return;
        
            const bulanSet = new Set();
            bulanSet.add(getWibRawDate().substring(0, 7));
        
            Object.values(cloudNotaList || {}).forEach(n => {
                if (n?.tanggalRaw) bulanSet.add(n.tanggalRaw.substring(0, 7));
            });
        
            bulanSelect.innerHTML = '';
            Array.from(bulanSet).sort((a, b) => b.localeCompare(a)).forEach(bulan => {
                const [y, m] = bulan.split('-');
                const label = new Date(y, parseInt(m) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                bulanSelect.innerHTML += `<option value="${bulan}">${label}</option>`;
            });
        
            const kurirSet = new Set();
            Object.values(cloudNotaList || {}).forEach(n => {
                if (n?.kurirUsername) kurirSet.add(n.kurirUsername);
            });
        
            kurirSelect.innerHTML = '<option value="semua">Semua Kurir</option>';
            Object.entries(cloudKurirList || {}).forEach(([id, u]) => {
                if (u && u.role === 'kurir') {
                    kurirSelect.innerHTML += `<option value="${u.username}">${u.nama || u.username}</option>`;
                }
            });
        
            bulanSelect.value = getWibRawDate().substring(0, 7);
        };
        window.renderLaporanData = function() {
            const container = document.getElementById('container-laporan-harian');
            const bulan = document.getElementById('laporan-filter-bulan')?.value || '';
            const kurir = document.getElementById('laporan-filter-kurir')?.value || 'semua';
            if (!container) return;
        
            let totalNota = 0;
            let totalPendapatan = 0;
            let totalNotaAdmin = 0;
            let totalNotaOL = 0;
            let kurirAktifSet = new Set();
            let mapHarian = {};
        
            Object.values(cloudNotaList || {}).forEach(n => {
                if (!n || !n.tanggalRaw) return;
                if (bulan && n.tanggalRaw.substring(0, 7) !== bulan) return;
                if (kurir !== 'semua' && n.kurirUsername !== kurir) return;
        
                const tgl = n.tanggalRaw;
                if (!mapHarian[tgl]) {
                    mapHarian[tgl] = {
                        totalNota: 0,
                        notaAdmin: 0,
                        notaOL: 0,
                        pendapatan: 0,
                        kurirSet: new Set()
                    };
                }
        
                const ongkir = parseInt(n.ongkir) || 0;
                const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                const pendapatan = ongkir + biaya;
        
                mapHarian[tgl].totalNota++;
                mapHarian[tgl].pendapatan += pendapatan;
                mapHarian[tgl].kurirSet.add(n.kurirUsername);
                kurirAktifSet.add(n.kurirUsername);
        
                const status = (n.status || '').toLowerCase();
                if (status === 'admin') {
                    mapHarian[tgl].notaAdmin++;
                    totalNotaAdmin++;
                }
                if (status === 'ol') {
                    mapHarian[tgl].notaOL++;
                    totalNotaOL++;
                }
        
                totalNota++;
                totalPendapatan += pendapatan;
            });
        
            const rataRata = totalNota > 0 ? Math.round(totalPendapatan / totalNota) : 0;
        
            document.getElementById('laporan-total-nota').innerText = totalNota;
            const detailNota = document.getElementById('laporan-total-nota-detail');
            if (detailNota) {
                detailNota.innerText = `Admin ${totalNotaAdmin} • OL ${totalNotaOL}`;
            }
        
            document.getElementById('laporan-total-pendapatan').innerText = 'Rp ' + totalPendapatan.toLocaleString('id-ID');
            document.getElementById('laporan-rata-rata').innerText = 'Rp ' + rataRata.toLocaleString('id-ID');
            document.getElementById('laporan-kurir-aktif').innerText = kurirAktifSet.size;
        
            const urutan = Object.keys(mapHarian).sort((a, b) => b.localeCompare(a));
            let html = '';
        
            urutan.forEach(tgl => {
                const d = mapHarian[tgl];
                const avg = d.totalNota > 0 ? Math.round(d.pendapatan / d.totalNota) : 0;
        
                let infoKurir = '-';
                if (kurir === 'semua') {
                    infoKurir = `${d.kurirSet.size} kurir aktif`;
                } else {
                    const found = Object.values(cloudKurirList || {}).find(u => u.username === kurir);
                    infoKurir = found?.nama || kurir;
                }
        
                html += `
                    <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1.5">
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">${new Date(tgl).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</div>
                                <div class="text-[10px] text-slate-400">
                                    ${kurir === 'semua' ? `Kurir aktif: ${d.kurirSet.size}` : `Kurir: ${infoKurir}`}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-black text-primary">${d.totalNota} Nota</div>
                                <div class="text-[10px] text-slate-400">Admin: ${d.notaAdmin} | OL: ${d.notaOL}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><span class="text-[10px] text-slate-400 block">Pendapatan</span><span class="font-bold text-success">Rp ${d.pendapatan.toLocaleString('id-ID')}</span></div>
                            <div><span class="text-[10px] text-slate-400 block">Rata-rata</span><span class="font-bold text-amber-500">Rp ${avg.toLocaleString('id-ID')}</span></div>
                        </div>
                    </div>
                `;
            });
        
            if (!html) {
                html = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data laporan.</div>';
            }
        
            container.innerHTML = html;
        };
        window.backupLaporanExcel = function() {
            const bulan = document.getElementById('laporan-filter-bulan')?.value || getWibRawDate().substring(0, 7);
            const kurirFilter = document.getElementById('laporan-filter-kurir')?.value || 'semua';
        
            const norm = (v) => (v || '').toString().trim().toLowerCase();
            const bulanLabel = (ym) => {
                const [y, m] = ym.split('-');
                return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('id-ID', {
                    month: 'long',
                    year: 'numeric'
                });
            };
        
            const grouped = {};
        
            Object.values(cloudNotaList || {}).forEach(n => {
                if (!n || !n.tanggalRaw) return;
                if (n.tanggalRaw.substring(0, 7) !== bulan) return;
                if (kurirFilter !== 'semua' && n.kurirUsername !== kurirFilter) return;
        
                const namaKurir = (n.kurirNama || n.kurirUsername || '-').trim();
                if (!grouped[namaKurir]) grouped[namaKurir] = {};
        
                const tgl = n.tanggalRaw;
                if (!grouped[namaKurir][tgl]) {
                    grouped[namaKurir][tgl] = {
                        totalAdmin: 0,
                        totalOL: 0,
                        trxMitra: 0,
                        totalPendapatan: 0
                    };
                }
        
                const status = norm(n.status);
                const ongkir = parseInt(n.ongkir) || 0;
                const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                const pendapatan = ongkir + biaya;
        
                grouped[namaKurir][tgl].totalPendapatan += pendapatan;
                if (status === 'admin') grouped[namaKurir][tgl].totalAdmin += 1;
                if (status === 'ol') grouped[namaKurir][tgl].totalOL += 1;
            });
        
            Object.values(cloudLogMitra || {}).forEach(log => {
                if (!log || !log.tglRaw) return;
                if (log.tglRaw.substring(0, 7) !== bulan) return;
                if (kurirFilter !== 'semua' && log.kurirUsername !== kurirFilter) return;
        
                const namaKurir = (log.kurirNama || log.kurirUsername || '-').trim();
                if (!grouped[namaKurir]) grouped[namaKurir] = {};
                if (!grouped[namaKurir][log.tglRaw]) {
                    grouped[namaKurir][log.tglRaw] = {
                        totalAdmin: 0,
                        totalOL: 0,
                        trxMitra: 0,
                        totalPendapatan: 0
                    };
                }
                grouped[namaKurir][log.tglRaw].trxMitra += (parseInt(log.trxInput) || 0);
            });
        
            const wb = XLSX.utils.book_new();
        
            const safeSheetName = (name) => {
                const s = (name || 'Sheet').replace(/[\\\/\?\*\[\]\:]/g, '').trim();
                return s.substring(0, 31) || 'Sheet';
            };
        
            const makeStyledSheet = (rows) => {
                const ws = XLSX.utils.json_to_sheet(rows);
        
                if (!ws['!ref']) return ws;
        
                const range = XLSX.utils.decode_range(ws['!ref']);
        
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[cellRef]) continue;
        
                        ws[cellRef].s = {
                            alignment: {
                                horizontal: 'center',
                                vertical: 'center'
                            },
                            border: {
                                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                                right: { style: 'thin', color: { rgb: 'D1D5DB' } }
                            }
                        };
        
                        if (R === 0) {
                            ws[cellRef].s.font = {
                                bold: true,
                                color: { rgb: 'FFFFFF' }
                            };
                            ws[cellRef].s.fill = {
                                patternType: 'solid',
                                fgColor: { rgb: '2563EB' }
                            };
                        }
                    }
                }
        
                ws['!cols'] = [
                    { wch: 6 },
                    { wch: 18 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 16 },
                    { wch: 18 },
                    { wch: 14 },
                    { wch: 16 }
                ];
        
                return ws;
            };
        
            let sheetCount = 0;
        
            Object.entries(grouped).forEach(([namaKurir, dataTanggal]) => {
                const rows = Object.keys(dataTanggal)
                    .sort((a, b) => a.localeCompare(b))
                    .map((tgl, idx) => {
                        const d = dataTanggal[tgl];
                        const totalNota = d.totalAdmin + d.totalOL;
                        const rataRata = totalNota > 0 ? Math.round(d.totalPendapatan / totalNota) : 0;
        
                        return {
                            No: idx + 1,
                            Bulan: bulanLabel(bulan),
                            Tanggal: tgl,
                            'Total Nota': totalNota,
                            'Total Pendapatan': `Rp ${d.totalPendapatan.toLocaleString('id-ID')}`,
                            'Trx Mitra': d.trxMitra,
                            'Rata-rata/Nota': `Rp ${rataRata.toLocaleString('id-ID')}`
                        };
                    });
        
                if (!rows.length) return;
        
                const ws = makeStyledSheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, safeSheetName(namaKurir));
                sheetCount++;
            });
        
            if (!sheetCount) {
                alert('Tidak ada data untuk dibackup.');
                return;
            }
        
            const fileName = `Backup_Laporan_${bulan}${kurirFilter !== 'semua' ? '_' + kurirFilter : ''}.xlsx`;
            XLSX.writeFile(wb, fileName);
        };
        
        window.saveDataOngkir = function() {
            const idEdit = document.getElementById('ongkir-id-edit').value;
            const wilayah = document.getElementById('ongkir-wilayah').value.trim();
            const tarif = bersihkanAngka(document.getElementById('ongkir-tarif').value);
        
            if (!wilayah || tarif <= 0) {
                alert('Lengkapi nama wilayah dan tarif ongkir!');
                return;
            }
        
            const payload = { wilayah, tarif };
        
            if (idEdit) {
                update(ref(db, `ongkir_wilayah/${idEdit}`), payload).then(() => {
                    alert('Data ongkir berhasil diupdate!');
                    resetFormOngkir();
                });
            } else {
                push(ref(db, 'ongkir_wilayah'), payload).then(() => {
                    alert('Data ongkir berhasil disimpan!');
                    resetFormOngkir();
                });
            }
        };
        window.showAdminOngkirMode = function(mode) {
            document.getElementById('admin-ongkir-popup').classList.remove('hidden');
            document.getElementById('admin-ongkir-normal').classList.add('hidden');
            document.getElementById('admin-ongkir-jarak').classList.add('hidden');
            document.getElementById('admin-ongkir-rahasia').classList.add('hidden');
        
            if (mode === 'normal') document.getElementById('admin-ongkir-normal').classList.remove('hidden');
            if (mode === 'jarak') document.getElementById('admin-ongkir-jarak').classList.remove('hidden');
            if (mode === 'rahasia') document.getElementById('admin-ongkir-rahasia').classList.remove('hidden');
        };
        
        window.closeAdminOngkirPopup = function() {
            document.getElementById('admin-ongkir-popup').classList.add('hidden');
        };

        window.editDataOngkir = function(key) {
            const d = cloudOngkirList[key];
            if (!d) return;
            document.getElementById('edit-ongkir-id').value = key;
            document.getElementById('edit-ongkir-wilayah').value = d.wilayah || '';
            setRupiahInput('edit-ongkir-tarif', d.tarif || 0);
        
            document.getElementById('modal-edit-ongkir').classList.remove('hidden');
        };
        window.saveEditOngkir = function() {
            const id = document.getElementById('edit-ongkir-id').value;
            const wilayah = document.getElementById('edit-ongkir-wilayah').value.trim();
            const tarif = bersihkanAngka(document.getElementById('edit-ongkir-tarif').value);
        
            if (!id) return alert('Data ongkir tidak ditemukan!');
            if (!wilayah || tarif <= 0) return alert('Lengkapi nama wilayah dan tarif ongkir!');
        
            update(ref(db, `ongkir_wilayah/${id}`), {
                wilayah,
                tarif
            }).then(() => {
                alert('Data ongkir berhasil diperbarui!');
                closeEditOngkirModal();
            }).catch(err => {
                alert('Gagal update ongkir: ' + err.message);
            });
        };
        window.closeEditOngkirModal = function() {
            document.getElementById('modal-edit-ongkir').classList.add('hidden');
            document.getElementById('edit-ongkir-id').value = '';
            document.getElementById('edit-ongkir-wilayah').value = '';
            document.getElementById('edit-ongkir-tarif').value = '';
        };
        window.resetFormOngkir = function() {
            document.getElementById('ongkir-id-edit').value = '';
            document.getElementById('ongkir-wilayah').value = '';
            document.getElementById('ongkir-tarif').value = '';
            document.getElementById('title-form-ongkir').innerText = 'Tambah / Edit Ongkir';
        };
        
        window.hapusDataOngkir = function(key) {
            if (confirm('Hapus data ongkir ini?')) {
                remove(ref(db, `ongkir_wilayah/${key}`));
            }
        };
        window.filterAdminOngkirList = function() {
            const container = document.getElementById('container-admin-ongkir');
            if (!container) return;

            const q = (document.getElementById('admin-ongkir-search')?.value || '').toLowerCase().trim();
            const keys = Object.keys(cloudOngkirList || {});

            if (!keys.length) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data ongkir.</div>';
                return;
            }

            container.innerHTML = keys.map(key => {
                const d = cloudOngkirList[key] || {};
                const wilayah = (d.wilayah || '').toLowerCase();
                if (q && !wilayah.includes(q)) return '';
                const tarif = (d.tarif || 0).toLocaleString('id-ID');

                return `
                    <div class="bg-white dark:bg-darkCard p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-500 shrink-0">
                                        <i data-lucide="truck" class="w-4 h-4"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-sm text-slate-800 dark:text-white truncate">${d.wilayah || '-'}</div>
                                        <div class="text-[10px] text-slate-400">Daftar ongkir wilayah</div>
                                    </div>
                                </div>
                            </div>
                            <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                                Rp ${tarif}
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-2 mt-3">
                            <button onclick="editDataOngkir('${key}')" class="w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 text-[10px] font-bold uppercase">
                                Edit
                            </button>
                            <button onclick="hapusDataOngkir('${key}')" class="w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-[10px] font-bold uppercase">
                                Hapus
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        window.pilihAdminOngkirSearch = function(nama) {
            const input = document.getElementById('admin-ongkir-search');
            const box = document.getElementById('suggest-admin-ongkir-search');
            if (input) input.value = nama;
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }
            filterAdminOngkirList();
        };
        window.renderAdminOngkirList = function() {
            const container = document.getElementById('container-admin-ongkir');
            if (!container) return;

            const isOpen = ensureSectionToggleState('container-admin-ongkir', false);
            const keys = Object.keys(cloudOngkirList || {});
            const q = (document.getElementById('admin-ongkir-search')?.value || '').toLowerCase().trim();

            container.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                </div>
                <div id="container-admin-ongkir-inner" class="${isOpen ? '' : 'hidden'} space-y-2"></div>
            `;

            const inner = document.getElementById('container-admin-ongkir-inner');
            if (!inner || !isOpen) return;

            const filtered = keys.filter(key => {
                const d = cloudOngkirList[key] || {};
                return !q || (d.wilayah || '').toLowerCase().includes(q);
            });

            inner.innerHTML = filtered.length ? filtered.map(key => {
                const d = cloudOngkirList[key] || {};
                const tarif = (d.tarif || 0).toLocaleString('id-ID');
                return `
                    <div class="bg-white dark:bg-darkCard p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-500 shrink-0">
                                        <i data-lucide="truck" class="w-4 h-4"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-sm text-slate-800 dark:text-white truncate">${d.wilayah || '-'}</div>
                                        <div class="text-[10px] text-slate-400">Daftar ongkir wilayah</div>
                                    </div>
                                </div>
                            </div>
                            <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                                Rp ${tarif}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-3">
                            <button onclick="editDataOngkir('${key}')" class="w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 text-[10px] font-bold uppercase">Edit</button>
                            <button onclick="hapusDataOngkir('${key}')" class="w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-[10px] font-bold uppercase">Hapus</button>
                        </div>
                    </div>
                `;
            }).join('') : '<div class="text-center text-xs text-slate-400 py-4">Belum ada data ongkir.</div>';

            if (typeof lucide !== 'undefined') lucide.createIcons();
        };
        window.updateOngkirSuggestions = function(type) {
            const input = document.getElementById(type === 'asal' ? 'ongkir-asal' : 'ongkir-tujuan');
            const box = document.getElementById(type === 'asal' ? 'suggest-ongkir-asal' : 'suggest-ongkir-tujuan');
            if (!input || !box) return;
        
            const q = normalizeNama(input.value);
            if (!q) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            const matches = [];
            for (let k in cloudOngkirList) {
                const item = cloudOngkirList[k];
                if (item && normalizeNama(item.wilayah).includes(q)) {
                    matches.push(item.wilayah);
                }
            }
        
            if (matches.length === 0) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
            box.innerHTML = matches.slice(0, 6).map(nama => `
                <div onclick="pilihSuggestionOngkir('${type}', '${nama.replace(/'/g, "\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    ${nama}
                </div>
            `).join('');
        
            box.classList.remove('hidden');
        };
        
        window.pilihSuggestionOngkir = function(type, nama) {
            const input = document.getElementById(type === 'asal' ? 'ongkir-asal' : 'ongkir-tujuan');
            const box = document.getElementById(type === 'asal' ? 'suggest-ongkir-asal' : 'suggest-ongkir-tujuan');
            if (input) input.value = nama;
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }
        };
        window.clearOngkirForm = function() {
            document.getElementById('ongkir-asal').value = '';
            document.getElementById('ongkir-tujuan').value = '';
            document.getElementById('ongkir-result-card').classList.add('hidden');
        };
        window.updateAdminOngkirSuggestions = function(type) {
            const input = document.getElementById(type === 'asal' ? 'admin-ongkir-asal' : 'admin-ongkir-tujuan');
            const box = document.getElementById(type === 'asal' ? 'suggest-admin-ongkir-asal' : 'suggest-admin-ongkir-tujuan');
            if (!input || !box) return;
        
            const q = normalizeNama(input.value);
            if (!q) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            const matches = [];
            for (let k in cloudOngkirList) {
                const item = cloudOngkirList[k];
                if (item && normalizeNama(item.wilayah).includes(q)) matches.push(item.wilayah);
            }
        
            if (!matches.length) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            box.innerHTML = matches.slice(0, 6).map(nama => `
                <div onclick="pilihAdminOngkirSuggestion('${type}', '${nama.replace(/'/g, "\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    ${nama}
                </div>
            `).join('');
        
            box.classList.remove('hidden');
        };
        
        window.pilihAdminOngkirSuggestion = function(type, nama) {
            const input = document.getElementById(type === 'asal' ? 'admin-ongkir-asal' : 'admin-ongkir-tujuan');
            const box = document.getElementById(type === 'asal' ? 'suggest-admin-ongkir-asal' : 'suggest-admin-ongkir-tujuan');
            if (input) input.value = nama;
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }
        };
      window.hitungOngkirAdminNormal = function() {
          const asal = document.getElementById('admin-ongkir-asal').value.trim();
          const tujuan = document.getElementById('admin-ongkir-tujuan').value.trim();
      
          if (!asal && !tujuan) return alert('Isi minimal salah satu.');
      
          const cariTarif = (nama) => {
              for (let k in cloudOngkirList) {
                  const item = cloudOngkirList[k];
                  if (item && normalizeNama(item.wilayah) === normalizeNama(nama)) return parseInt(item.tarif) || 0;
              }
              return 0;
          };
      
          const tarifAsal = asal ? cariTarif(asal) : 0;
          const tarifTujuan = tujuan ? cariTarif(tujuan) : 0;
      
          const hasil = (asal && tujuan) ? (tarifAsal + tarifTujuan - 6000) : (asal ? tarifAsal : tarifTujuan);
      
          document.getElementById('admin-ongkir-display-normal').innerText = 'Rp ' + Math.max(0, hasil).toLocaleString('id-ID');
          document.getElementById('admin-ongkir-result-normal').classList.remove('hidden');
      };
        window.updateAdminOngkirSuggestionsJarak = function() {
            const input = document.getElementById('admin-jarak-asal');
            const box = document.getElementById('suggest-admin-jarak-asal');
            if (!input || !box) return;
        
            const q = normalizeNama(input.value);
            if (!q) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            const matches = [];
            for (let k in cloudOngkirList) {
                const item = cloudOngkirList[k];
                if (item && normalizeNama(item.wilayah).includes(q)) matches.push(item.wilayah);
            }
        
            box.innerHTML = matches.slice(0, 6).map(nama => `
                <div onclick="pilihAdminOngkirJarak('${nama.replace(/'/g, "\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    ${nama}
                </div>
            `).join('');
        
            box.classList.remove('hidden');
        };
        
        window.pilihAdminOngkirJarak = function(nama) {
            const input = document.getElementById('admin-jarak-asal');
            const box = document.getElementById('suggest-admin-jarak-asal');
            if (input) input.value = nama;
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }
        };
        window.hitungOngkirJarak = function() {
            const asal = document.getElementById('admin-jarak-asal').value.trim();
            const jarak = parseFloat(document.getElementById('admin-jarak-km').value) || 0;

            if (!asal || jarak <= 0) return alert('Isi wilayah dan jarak.');

            if (jarak <= 12) {
                alert('⚠️ Jarak ≤ 12km. Gunakan fitur "Cek Ongkir" normal untuk hasil akurat.');
                return;
            }

            const cariTarif = (nama) => {
                for (let k in cloudOngkirList) {
                    const item = cloudOngkirList[k];
                    if (item && normalizeNama(item.wilayah) === normalizeNama(nama)) return parseInt(item.tarif) || 0;
                }
                return 0;
            };
            const tarifAsal = cariTarif(asal);
            const hasil = (jarak * 2 * 1000) + 2000 + tarifAsal;

            document.getElementById('admin-ongkir-display-jarak').innerText = 'Rp ' + hasil.toLocaleString('id-ID');
            document.getElementById('admin-ongkir-result-jarak').classList.remove('hidden');
        };

        window.toggleAdminOngkirHidden = function() {
            const box = document.getElementById('admin-ongkir-hidden-box');
            if (box) box.classList.toggle('hidden');
            
        };
        window.hitungOngkirTigaArah = function() {
            const asal = document.getElementById('admin-ongkir-3-asal').value.trim();
            const titik = document.getElementById('admin-ongkir-3-titik').value.trim();
            const tujuan = document.getElementById('admin-ongkir-3-tujuan').value.trim();
            if (!asal || !titik || !tujuan) {
                alert('Lengkapi semua kolom.');
                return;
            }
            const cariTarif = (nama) => {
                for (let k in cloudOngkirList) {
                    const item = cloudOngkirList[k];
                    if (item && normalizeNama(item.wilayah) === normalizeNama(nama)) return parseInt(item.tarif) || 0;
                }
                return 0;
            };
        
            const hasil = cariTarif(asal) + cariTarif(titik) - 6000 + cariTarif(tujuan);
        
            document.getElementById('admin-ongkir-display-3').innerText = 'Rp ' + Math.max(0, hasil).toLocaleString('id-ID');
            document.getElementById('admin-ongkir-result-3').classList.remove('hidden');
        };

        window.updateAdminOngkir3Suggestions = function(type) {
            const input = document.getElementById(`admin-ongkir-3-${type}`);
            const box = document.getElementById(`suggest-admin-ongkir-3-${type}`);
            if (!input || !box) return;
        
            const q = normalizeNama(input.value);
            if (!q) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            const matches = [];
            for (let k in cloudOngkirList) {
                const item = cloudOngkirList[k];
                if (item && normalizeNama(item.wilayah).includes(q)) {
                    matches.push(item.wilayah);
                }
            }
        
            if (matches.length === 0) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }
        
            box.innerHTML = matches.slice(0, 6).map(nama => `
                <div onclick="pilihAdminOngkir3Suggestion('${type}', '${nama.replace(/'/g, "\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    ${nama}
                </div>
            `).join('');
            box.classList.remove('hidden');
        };
        
        window.pilihAdminOngkir3Suggestion = function(type, nama) {
            const input = document.getElementById(`admin-ongkir-3-${type}`);
            const box = document.getElementById(`suggest-admin-ongkir-3-${type}`);
            if (input) input.value = nama;
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }
        };

        window.clearAdminOngkirNormal = function() {
            document.getElementById('admin-ongkir-asal').value = '';
            document.getElementById('admin-ongkir-tujuan').value = '';
            document.getElementById('admin-ongkir-result-normal').classList.add('hidden');
        };

        window.openOngkirFeature = function() {
            if (!userSession || userSession.role !== 'kurir') return;
            const currentKurir = cloudKurirList[userSession.id];
            if (!currentKurir) {
                alert('Data akun tidak ditemukan.');
                return;
            }
        
            if (currentKurir.ongkirLocked) {
                const inputPass = prompt('Masukkan password khusus untuk membuka fitur ongkir:');
                if (!inputPass) return;        
                if (inputPass !== currentKurir.ongkirPassword) {
                    alert('Password ongkir salah!');
                    return;
                }
                update(ref(db, `users/${userSession.id}`), {
                    ongkirLocked: false
                });
            }
            navigateTo('screen-ongkir');
        };

        let currentKPISection = 'penghargaan';
        window.applyKPIFilter = function() {
            const btn = document.querySelector('button[onclick="applyKPIFilter()"]');
            const bulanEl = document.getElementById('kpi-filter-bulan');
            
            if (btn) {
                btn.innerText = 'MEMUAT...';
                btn.disabled = true;
            }
        
            setTimeout(() => {
                if (bulanEl && !bulanEl.value) {
                    bulanEl.value = getWibRawDate().slice(0, 7);
                }
        
                renderKPISection(currentKPISection);
        
                if (btn) {
                    btn.innerText = 'Terapkan';
                    btn.disabled = false;
                }
            }, 50);
        };
        
        
        function getDaysInMonth(ym) {
            const [y, m] = ym.split('-').map(Number);
            return new Date(y, m, 0).getDate();
        }
        
        function getKpiMonth() {
            const el = document.getElementById('kpi-filter-bulan');
            return el && el.value ? el.value : getWibRawDate().slice(0, 7);
        }
        
        function getKpiAvatarName(name) {
            if (!name) return '?';
            const parts = name.trim().split(' ');
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return parts[0][0].toUpperCase();
        }
        
        function getRatingBadge(rating) {
            if (rating >= 95) return { emoji: '🟣', label: 'Legend', color: 'text-purple-600', ring: 'ring-purple-500/20', bg: 'from-purple-500 to-fuchsia-500' };
            if (rating >= 90) return { emoji: '🟡', label: 'Elite', color: 'text-yellow-500', ring: 'ring-yellow-500/20', bg: 'from-yellow-400 to-amber-500' };
            if (rating >= 85) return { emoji: '🥇', label: 'Gold', color: 'text-emerald-600', ring: 'ring-emerald-500/20', bg: 'from-emerald-400 to-emerald-600' };
            if (rating >= 80) return { emoji: '🔵', label: 'Silver', color: 'text-blue-600', ring: 'ring-blue-500/20', bg: 'from-blue-400 to-blue-600' };
            if (rating >= 70) return { emoji: '🟠', label: 'Bronze', color: 'text-orange-500', ring: 'ring-orange-500/20', bg: 'from-orange-400 to-orange-600' };
            return { emoji: '🔴', label: 'Perlu Pembinaan', color: 'text-rose-500', ring: 'ring-rose-500/20', bg: 'from-rose-400 to-rose-600' };
        }
        
        function getPodiumClass(rank) {
            if (rank === 1) return 'from-yellow-300 via-yellow-400 to-yellow-500 text-yellow-950';
            if (rank === 2) return 'from-slate-300 via-slate-400 to-slate-500 text-slate-950';
            if (rank === 3) return 'from-orange-300 via-orange-400 to-orange-500 text-orange-950';
            return 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700';
        }
        
        function progressColor(rating) {
            if (rating >= 95) return 'bg-purple-600';
            if (rating >= 90) return 'bg-yellow-500';
            if (rating >= 85) return 'bg-emerald-500';
            if (rating >= 80) return 'bg-blue-500';
            if (rating >= 70) return 'bg-orange-500';
            return 'bg-rose-500';
        }
        
        function calcKpiForKurir(identifier, bulan, stats = {}) {
            const target = (identifier || '').trim().toLowerCase();
            const norm = (v) => (v || '').toString().trim().toLowerCase();
        
            const kurirObj = Object.entries(cloudKurirList || {}).find(([id, u]) => {
                if (!u || u.role !== 'kurir') return false;
                return norm(id) === target || norm(u.username) === target;
            });
        
            const idTarget = norm(kurirObj?.[0] || '');
            const usernameTarget = norm(kurirObj?.[1]?.username || '');
            const namaResmi = kurirObj?.[1]?.nama || '-';
            const leaderResmi = kurirObj?.[1]?.leader || '-';
        
            const rekap = getRekapJadwalKurirByName(namaResmi || idTarget || usernameTarget, bulan);
        
            let totalNota = 0;
            let trxMitra = 0;
            let totalPenghasilan = 0;
        
            Object.values(cloudNotaList || {}).forEach(n => {
                if (!n) return;
        
                const notaUsername = norm(n.kurirUsername);
                const notaId = norm(n.kurirId);
                if (notaUsername !== usernameTarget && notaId !== idTarget) return;
                if (!n.tanggalRaw || n.tanggalRaw.slice(0, 7) !== bulan) return;
        
                totalNota++;
                const ongkir = parseInt(n.ongkir) || 0;
                const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                totalPenghasilan += (ongkir + biaya);
            });
        
            Object.values(cloudLogMitra || {}).forEach(log => {
                if (!log) return;
        
                const logUsername = norm(log.kurirUsername);
                const logId = norm(log.kurirId);
                if (logUsername !== usernameTarget && logId !== idTarget) return;
                if (!log.tglRaw || log.tglRaw.slice(0, 7) !== bulan) return;
        
                trxMitra += parseInt(log.trxInput) || 0;
            });
        
            const kehadiranScore = Math.min((rekap.totalHadirScore / getDaysInMonth(bulan)) * 20, 20);
        
            const maxPenghasilan = stats.maxPenghasilan || 0;
            const maxNota = stats.maxNota || 0;
            const maxTrxMitra = stats.maxTrxMitra || 0;
            const totalPenghasilanScore = maxPenghasilan > 0
                ? Math.min(20, (totalPenghasilan / maxPenghasilan) * 18)
                : 0;
            
            const totalNotaScore = maxNota > 0
                ? Math.min(30, (totalNota / maxNota) * 27)
                : 0;
            
            const trxMitraScore = maxTrxMitra > 0
                ? Math.min(20, (trxMitra / maxTrxMitra) * 18)
                : 0;

            const totalOffGabungan = (rekap.totalOff || 0) + (rekap.totalIzin || 0) + (rekap.totalSakit || 0);
            const offScore = totalOffGabungan <= 3
                ? 10
                : Math.max(0, 10 - ((totalOffGabungan - 3) * 0.75));

            const rating = Number(Math.min(100, (
                kehadiranScore +
                totalPenghasilanScore +
                totalNotaScore +
                trxMitraScore +
                offScore
            )).toFixed(1));

            return {
                nama: namaResmi,
                username: usernameTarget,
                leader: leaderResmi,
                hadir: rekap.totalHadirScore,
                hadirFull: rekap.hadirFull,
                hadirHalf: rekap.hadirHalf,
                masukTepat: rekap.totalAbsenMasuk,
                off: rekap.totalOff,
                totalOff: rekap.totalOff,
                totalIzin: rekap.totalIzin,
                totalSakit: rekap.totalSakit,
                trxMitra,
                totalNota,
                totalPenghasilan,
                kehadiranScore,
                totalPenghasilanScore,
                totalNotaScore,
                trxMitraScore,
                offScore,
                rating
            };
        }
        function getRekapJadwalKurirByName(identifier, bulan) {
            const target = (identifier || '').trim().toLowerCase();
            if (!target) {
                return {
                    hadirFull: 0,
                    hadirHalf: 0,
                    totalHadirScore: 0,
                    totalOff: 0,
                    totalTidakAmbilOff: 0,
                    totalIzin: 0,
                    totalSakit: 0,
                    totalAbsenMasuk: 0,
                    totalAbsenPulang: 0
                };
            }
        
            const norm = (v) => (v || '').toString().trim().toLowerCase();
            const tanggalMap = {};
            let totalOff = 0;
            let totalTidakAmbilOff = 0;
            let totalIzin = 0;
            let totalSakit = 0;
            let totalAbsenMasuk = 0;
            let totalAbsenPulang = 0;
        
            const cocokKurirAbsensi = (a) => {
                const idKurir = norm(a?.idKurir || a?.kurirId);
                const username = norm(a?.username || a?.kurirUsername);
                const nama = norm(a?.nama || a?.namaKurir);
                return target === idKurir || target === username || target === nama;
            };
        
            // ABSENSI
            Object.values(cloudAbsensiList || {}).forEach(a => {
                if (!a) return;
        
                const tgl = (a.tanggal || '').trim();
                if (!tgl || tgl.slice(0, 7) !== bulan) return;
                if (!cocokKurirAbsensi(a)) return;
        
                if (!tanggalMap[tgl]) {
                    tanggalMap[tgl] = { masuk: false, pulang: false, off: false };
                }
        
                if (a.jamMasuk) {
                    tanggalMap[tgl].masuk = true;
                    totalAbsenMasuk++;
                }
                if (a.jamPulang) {
                    tanggalMap[tgl].pulang = true;
                    totalAbsenPulang++;
                }
        
                const status = norm(a.status);
                if (status === 'izin') totalIzin++;
                if (status === 'sakit') totalSakit++;
            });
        
            // JADWAL OFF
            Object.values(cloudJadwalOff || {}).forEach(j => {
                if (!j) return;
        
                const namaKurir = norm(j.nama);
                const jenisOff = norm(j.jenisOff);
                const statusOff = norm(j.status);
                const tglMulai = (j.tanggalMulai || '').trim();
                const tglSelesai = (j.tanggalSelesai || tglMulai || '').trim();
        
                if (!tglMulai || tglMulai.slice(0, 7) !== bulan) return;
                if (target !== namaKurir) return;
        
                // Kalau tanggalMulai = tanggalSelesai, dihitung 1 kali saja
                const start = new Date(tglMulai);
                const end = new Date(tglSelesai);
                const daysCount = Math.max(1, Math.round((end - start) / 86400000) + 1);
        
                for (let i = 0; i < daysCount; i++) {
                    const d = new Date(start);
                    d.setDate(start.getDate() + i);
        
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const tglLoop = `${y}-${m}-${dd}`;
        
                    if (tglLoop.slice(0, 7) !== bulan) continue;
        
                    if (jenisOff === 'off reguler') totalOff++;
                    if (jenisOff === 'izin') totalIzin++;
                    if (jenisOff === 'tidak ambil off') totalTidakAmbilOff++;
                    if (jenisOff === 'sakit') totalSakit++;
        
                    if (!tanggalMap[tglLoop]) {
                        tanggalMap[tglLoop] = { masuk: false, pulang: false, off: true };
                    } else {
                        tanggalMap[tglLoop].off = true;
                    }
        
                    if (statusOff !== 'aktif') {
                        totalTidakAmbilOff++;
                    }
                }
            });
        
            let hadirFull = 0;
            let hadirHalf = 0;
        
            Object.values(tanggalMap).forEach(v => {
                if (v.masuk && v.pulang) hadirFull += 1;
                else if (v.masuk || v.pulang) hadirHalf += 1;
            });
        
            return {
                hadirFull,
                hadirHalf,
                totalHadirScore: hadirFull + (hadirHalf * 0.5),
                totalOff,
                totalTidakAmbilOff,
                totalIzin,
                totalSakit,
                totalAbsenMasuk,
                totalAbsenPulang
            };
        }
        
        function buildKPIData(bulan) {
            const rawData = [];
            const norm = (v) => (v || '').toString().trim().toLowerCase();
        
            Object.entries(cloudKurirList || {}).forEach(([id, u]) => {
                if (!u || u.role !== 'kurir') return;
                if (u.status && u.status !== 'aktif') return;
        
                const nama = (u.nama || '').trim();
                const username = norm(u.username || '');
                const idKurir = norm(id || '');
        
                const rekap = getRekapJadwalKurirByName(nama || idKurir || username, bulan);
        
                let totalNota = 0;
                let trxMitra = 0;
                let totalPenghasilan = 0;
        
                Object.values(cloudNotaList || {}).forEach(n => {
                    if (!n) return;
        
                    const notaUsername = norm(n.kurirUsername);
                    const notaNama = norm(n.kurirNama);
                    if (notaUsername !== username && notaNama !== norm(nama)) return;
                    if (!n.tanggalRaw || n.tanggalRaw.slice(0, 7) !== bulan) return;
        
                    totalNota++;
                    const ongkir = parseInt(n.ongkir) || 0;
                    const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                    totalPenghasilan += (ongkir + biaya);
                });
        
                Object.values(cloudLogMitra || {}).forEach(log => {
                    if (!log) return;
        
                    const logUsername = norm(log.kurirUsername);
                    const logNama = norm(log.kurirNama);
                    if (logUsername !== username && logNama !== norm(nama)) return;
                    if (!log.tglRaw || log.tglRaw.slice(0, 7) !== bulan) return;
        
                    trxMitra += parseInt(log.trxInput) || 0;
                });
        
                rawData.push({
                    id,
                    nama: nama || '-',
                    username: username || '-',
                    leader: u.leader || '-',
                    hadir: rekap.totalHadirScore,
                    hadirFull: rekap.hadirFull,
                    hadirHalf: rekap.hadirHalf,
                    masukTepat: rekap.totalAbsenMasuk,
                    off: rekap.totalOff,
                    trxMitra,
                    totalNota,
                    totalPenghasilan
                });
            });
        
            const stats = {
                maxPenghasilan: Math.max(...rawData.map(x => x.totalPenghasilan), 0),
                maxNota: Math.max(...rawData.map(x => x.totalNota), 0),
                maxTrxMitra: Math.max(...rawData.map(x => x.trxMitra), 0)
            };
        
            const finalData = rawData.map(item => {
                const finalRow = calcKpiForKurir(item.nama || item.id || item.username, bulan, stats);
                return {
                    ...item,
                    ...finalRow,
                    id: item.id
                };
            });
        
            return finalData.sort((a, b) => b.rating - a.rating);
        }
        function getTestimoniTerbaik(bulan) {
            const rank = {};
        
            Object.values(cloudTestimonialList || {}).forEach(t => {
                if (!t || !t.nama || !t.timestamp) return;
        
                const tgl = new Date(t.timestamp).toISOString().slice(0, 7);
                if (tgl !== bulan) return;
                if (t.isPublished !== true) return;
        
                const namaKurir = (t.nama || '').trim();
                const rating = parseInt(t.rating) || 0;
        
                if (!rank[namaKurir]) {
                    rank[namaKurir] = { totalRating: 0, jumlah: 0 };
                }
        
                rank[namaKurir].totalRating += rating;
                rank[namaKurir].jumlah += 1;
            });
        
            const data = Object.entries(rank).map(([nama, v]) => ({
                nama,
                totalRating: v.totalRating,
                jumlah: v.jumlah,
                avgRating: v.jumlah ? (v.totalRating / v.jumlah) : 0
            }));
        
            data.sort((a, b) => b.avgRating - a.avgRating || b.jumlah - a.jumlah);
        
            return data[0] || null;
        }
        window.renderKPISection = function(section = 'penghargaan') {
            if (isRenderKpiRunning) return;
            isRenderKpiRunning = true;
            try {
                const container = document.getElementById('container-kpi-kurir');
                if (!container) return;
            
                currentKPISection = section;
                const bulan = getKpiMonth();
                const data = buildKPIData(bulan);
            
                const top1 = data[0];
                const top2 = data[1];
                const top3 = data[2];
            
                const topKurirTerbaik = [...data].sort((a, b) => b.rating - a.rating)[0];
                const topTrxMitra = [...data].sort((a, b) => b.trxMitra - a.trxMitra)[0];
                const topAktif = [...data].sort((a, b) => {
                    const offA = (a.totalOff || 0) + (a.totalIzin || 0) + (a.totalSakit || 0);
                    const offB = (b.totalOff || 0) + (b.totalIzin || 0) + (b.totalSakit || 0);
                
                    if ((b.hadir || 0) !== (a.hadir || 0)) {
                        return (b.hadir || 0) - (a.hadir || 0);
                    }
                
                    if (offA !== offB) {
                        return offA - offB;
                    }
                
                    return (b.rating || 0) - (a.rating || 0);
                })[0];

                if (section === 'rekapjadwal') {
                    const rekap = window.calcRekapJadwalKurir();
                
                    container.innerHTML = `
                        <div class="space-y-3">
                            ${rekap.length ? rekap.map((r, i) => `
                                <div class="bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2">
                                                <div class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-300 font-black text-xs">
                                                    ${i + 1}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="font-bold text-sm truncate">${r.namaKurir}</div>
                                                    <div class="text-[10px] text-slate-400 truncate">Leader: ${r.leader || '-'}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-right shrink-0">
                                            <div class="text-[10px] text-slate-400 uppercase font-bold">Kehadiran</div>
                                            <div class="text-lg font-black text-success">${r.kehadiran}</div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Total Off</div>
                                            <div class="font-bold">${r.totalOff}</div>
                                        </div>
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Tidak Ambil Off</div>
                                            <div class="font-bold text-rose-500">${r.totalTidakAmbilOff}</div>
                                        </div>
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Izin</div>
                                            <div class="font-bold text-amber-500">${r.totalIzin}</div>
                                        </div>
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Sakit</div>
                                            <div class="font-bold text-blue-500">${r.totalSakit}</div>
                                        </div>
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Absen Masuk</div>
                                            <div class="font-bold">${r.totalAbsenMasuk}</div>
                                        </div>
                                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                            <div class="text-[10px] text-slate-400 uppercase">Absen Pulang</div>
                                            <div class="font-bold">${r.totalAbsenPulang}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center text-xs text-slate-400 py-6 bg-white dark:bg-darkCard rounded-2xl border">
                                    Belum ada data rekap jadwal.
                                </div>
                            `}
                        </div>
                    `;
                    return;
                }

                if (section === 'penghargaan') {
                    const testimoniTerbaik = getTestimoniTerbaik(bulan);
                
                    container.innerHTML = `
                        <div class="space-y-4">
                            <div class="rounded-3xl p-5 bg-gradient-to-br from-yellow-100 to-yellow-300 dark:from-yellow-900/40 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-900 shadow-xl">
                                <div class="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-200 font-black">🏆 Kurir Terbaik</div>
                                <div class="flex items-center justify-between mt-2">
                                    <div>
                                        <div class="text-2xl font-black">${topKurirTerbaik?.nama || '-'}</div>
                                        <div class="text-xs font-bold mt-1">${topKurirTerbaik ? `${getRatingBadge(topKurirTerbaik.rating).emoji} ${Number(topKurirTerbaik.rating).toFixed(1)}% ${getRatingBadge(topKurirTerbaik.rating).label}` : '-'}</div>
                                    </div>
                                    <div class="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center font-black text-xl text-yellow-900 shadow-lg">
                                        ${getKpiAvatarName(topKurirTerbaik?.nama || '')}
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-3xl p-5 bg-gradient-to-br from-pink-100 to-rose-300 dark:from-pink-900/40 dark:to-rose-800/20 border border-pink-200 dark:border-pink-900 shadow-xl">
                                <div class="text-[10px] uppercase tracking-wider text-pink-700 dark:text-pink-200 font-black">💬 Kurir Testimoni Terbaik</div>
                                <div class="flex items-center justify-between mt-2">
                                    <div>
                                        <div class="text-2xl font-black">${testimoniTerbaik?.nama || '-'}</div>
                                        <div class="text-xs font-bold mt-1">
                                            ${testimoniTerbaik ? `⭐ ${testimoniTerbaik.avgRating.toFixed(1)} / 5 dari ${testimoniTerbaik.jumlah} testimoni` : '-'}
                                        </div>
                                    </div>
                                    <div class="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center font-black text-xl text-pink-900 shadow-lg">
                                        ${getKpiAvatarName(testimoniTerbaik?.nama || '')}
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-3xl p-5 bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 border shadow-xl">
                                <div class="text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-200 font-black">🥇 Trx Mitra Terbanyak</div>
                                <div class="flex items-center justify-between mt-2">
                                    <div>
                                        <div class="text-2xl font-black text-slate-900 dark:text-white">${topTrxMitra?.nama || '-'}</div>
                                        <div class="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200">${topTrxMitra?.trxMitra || 0} trx</div>
                                    </div>
                                    <div class="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center font-black text-xl text-slate-900 shadow-lg">
                                        ${getKpiAvatarName(topTrxMitra?.nama || '')}
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-3xl p-5 bg-gradient-to-br from-orange-100 to-orange-300 dark:from-orange-900/40 dark:to-orange-800/20 border border-orange-200 dark:border-orange-900 shadow-xl">
                                <div class="text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-200 font-black">🔥 Kurir Paling Aktif</div>
                                <div class="flex items-center justify-between mt-2">
                                    <div>
                                        <div class="text-2xl font-black">${topAktif?.nama || '-'}</div>
                                        <div class="text-xs font-bold mt-1 text-orange-700 dark:text-orange-200">Rating ${topAktif?.rating || 0}%</div>
                                    </div>
                                    <div class="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center font-black text-xl text-orange-900 shadow-lg">
                                        ${getKpiAvatarName(topAktif?.nama || '')}
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-3 gap-2">
                                ${[top1, top2, top3].map((x, idx) => {
                                    if (!x) return `<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-center text-xs">-</div>`;
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                                    const bg = idx === 0 ? 'from-yellow-300 to-yellow-500' : idx === 1 ? 'from-slate-300 to-slate-500' : 'from-orange-300 to-orange-500';
                                    return `
                                        <div class="rounded-2xl bg-gradient-to-br ${bg} p-3 text-center shadow-lg">
                                            <div class="text-2xl">${medal}</div>
                                            <div class="font-black text-sm mt-1">${x.nama}</div>
                                            <div class="text-[10px] font-bold">${Number(x.rating).toFixed(1)}%</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                    return;
                }

                if (section === 'top5') {
                    const today = getWibRawDate();
                    const topNota = [...data].sort((a, b) => b.totalNota - a.totalNota).slice(0, 5);
                    const topPenghasilan = [...data].sort((a, b) => b.totalPenghasilan - a.totalPenghasilan).slice(0, 5);
                    const topKonsisten = [...data].sort((a, b) => b.rating - a.rating).slice(0, 5);

                    const todayData = [];
                    Object.entries(cloudKurirList || {}).forEach(([id, u]) => {
                        if (!u || u.role !== 'kurir') return;
                        if (u.status && u.status !== 'aktif') return;

                        const nama = (u.nama || '').trim();
                        const username = (u.username || '').trim();

                        let notaHariIni = 0;
                        let penghasilanHariIni = 0;

                        Object.values(cloudNotaList || {}).forEach(n => {
                            if (!n) return;
                            const kurirUsername = (n.kurirUsername || '').trim().toLowerCase();
                            const kurirNama = (n.kurirNama || '').trim().toLowerCase();
                            if (kurirUsername !== username.toLowerCase() && kurirNama !== nama.toLowerCase()) return;
                            if (n.tanggalRaw !== today) return;

                            notaHariIni++;
                            const ongkir = parseInt(n.ongkir) || 0;
                            const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                            penghasilanHariIni += (ongkir + biaya);
                        });

                        todayData.push({ id, nama, username, notaHariIni, penghasilanHariIni });
                    });

                    const topNotaHariIni = [...todayData].sort((a, b) => b.notaHariIni - a.notaHariIni).slice(0, 5);
                    const topPenghasilanHariIni = [...todayData].sort((a, b) => b.penghasilanHariIni - a.penghasilanHariIni).slice(0, 5);

                    container.innerHTML = `
                        <div class="space-y-3">
                            <div class="p-4 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
                                <h4 class="text-xs font-black uppercase tracking-wider mb-3">Top 5 Total Nota (${bulan})</h4>
                                ${topNota.map((x, i) => `
                                    <div class="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                                        <div>
                                            <div class="font-bold">${i+1}. ${x.nama}</div>
                                            <div class="text-[10px] opacity-80">${getRatingBadge(x.rating).emoji} ${Number(x.rating).toFixed(1)}% ${getRatingBadge(x.rating).label}</div>
                                        </div>
                                        <div class="font-black">${x.totalNota}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="p-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
                                <h4 class="text-xs font-black uppercase tracking-wider mb-3">Top 5 Penghasilan (${bulan})</h4>
                                ${topPenghasilan.map((x, i) => `
                                    <div class="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                                        <div>
                                            <div class="font-bold">${i+1}. ${x.nama}</div>
                                            <div class="text-[10px] opacity-80">${getRatingBadge(x.rating).emoji} ${Number(x.rating).toFixed(1)}% ${getRatingBadge(x.rating).label}</div>
                                        </div>
                                        <div class="font-black">Rp ${x.totalPenghasilan.toLocaleString('id-ID')}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="p-4 rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-xl">
                                <h4 class="text-xs font-black uppercase tracking-wider mb-3">Top 5 Ranking (${bulan})</h4>
                                ${topKonsisten.map((x, i) => `
                                    <div class="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                                        <div>
                                            <div class="font-bold">${i+1}. ${x.nama}</div>
                                            <div class="text-[10px] opacity-80">${getRatingBadge(x.rating).emoji} ${Number(x.rating).toFixed(1)}% ${getRatingBadge(x.rating).label}</div>
                                        </div>
                                        <div class="font-black">${x.rating}%</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="p-4 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xl">
                                <h4 class="text-xs font-black uppercase tracking-wider mb-3">Top 5 Nota Hari Ini (${today})</h4>
                                ${topNotaHariIni.length ? topNotaHariIni.map((x, i) => `
                                    <div class="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                                        <div class="min-w-0">
                                            <div class="font-bold truncate">${i+1}. ${x.nama}</div>
                                            <div class="text-[10px] opacity-80">Nota hari ini</div>
                                        </div>
                                        <div class="font-black">${x.notaHariIni}</div>
                                    </div>
                                `).join('') : `<div class="text-xs opacity-80">Belum ada nota hari ini.</div>`}
                            </div>
                            <div class="p-4 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-xl">
                                <h4 class="text-xs font-black uppercase tracking-wider mb-3">Top 5 Penghasilan Hari Ini (${today})</h4>
                                ${topPenghasilanHariIni.length ? topPenghasilanHariIni.map((x, i) => `
                                    <div class="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                                        <div class="min-w-0">
                                            <div class="font-bold truncate">${i+1}. ${x.nama}</div>
                                            <div class="text-[10px] opacity-80">Hari ini</div>
                                        </div>
                                        <div class="font-black">Rp ${x.penghasilanHariIni.toLocaleString('id-ID')}</div>
                                    </div>
                                `).join('') : `<div class="text-xs opacity-80">Belum ada penghasilan hari ini.</div>`}
                            </div>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = `
                    <div class="space-y-3">
                        ${data.map((x, i) => {
                            const badge = getRatingBadge(x.rating);
                            const podium = getPodiumClass(i + 1);
                            const progress = progressColor(x.rating);
                            const isTop3 = i < 3;

                            return `
                                <div onclick="openKpiDetailModal('${x.id || ''}')" class="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-darkCard shadow-lg cursor-pointer active:scale-[0.99] transition-transform">
                                    <div class="absolute inset-0 opacity-60 bg-gradient-to-br ${isTop3 ? 'from-white via-white to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800' : 'from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800'}"></div>
                                    <div class="relative p-3 sm:p-4">
                                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div class="flex items-start gap-3 min-w-0">
                                                <div class="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl sm:rounded-[22px] bg-gradient-to-br ${isTop3 ? podium : 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'} p-[2px] shadow-lg">
                                                    <div class="w-full h-full rounded-[18px] sm:rounded-[20px] bg-white dark:bg-darkCard flex items-center justify-center ring-4 ${badge.ring}">
                                                        <div class="text-center leading-none">
                                                            <div class="text-base sm:text-lg font-black">${getKpiAvatarName(x.nama)}</div>
                                                            <div class="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 mt-1">#${i + 1}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isTop3 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">
                                                        ${isTop3 ? 'TOP RANK' : 'RANK'} ${i + 1}
                                                    </div>
                                                    <div class="text-base sm:text-lg font-black mt-2 truncate">${x.nama}</div>
                                                    <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Leader: ${x.leader || '-'}</div>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                                                <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r ${badge.bg || 'from-slate-100 to-slate-200'} text-white text-[9px] sm:text-[10px] font-black shadow-md">
                                                    <span>${badge.emoji}</span>
                                                    <span>${badge.label}</span>
                                                </div>
                                                <div class="text-2xl sm:text-3xl font-black ${badge.color || 'text-slate-900 dark:text-white'}">
                                                    ${Number(x.rating).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mt-4 grid grid-cols-2 gap-2">
                                            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                                <div class="text-[10px] text-slate-400 uppercase font-bold">Trx Mitra</div>
                                                <div class="text-sm sm:text-base font-black mt-1">${x.trxMitra}</div>
                                            </div>
                                            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                                <div class="text-[10px] text-slate-400 uppercase font-bold">Total Nota</div>
                                                <div class="text-sm sm:text-base font-black mt-1">${x.totalNota}</div>
                                            </div>
                                            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                                <div class="text-[10px] text-slate-400 uppercase font-bold">Penghasilan</div>
                                                <div class="text-sm sm:text-base font-black mt-1 text-emerald-600 dark:text-emerald-400">
                                                    Rp ${x.totalPenghasilan.toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                                <div class="text-[10px] text-slate-400 uppercase font-bold">Rating</div>
                                                <div class="text-sm sm:text-base font-black mt-1">${x.rating}%</div>
                                            </div>
                                        </div>
                                        <div class="mt-4 space-y-1.5">
                                            <div class="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                                <span>Progress Ranking</span>
                                                <span>${x.rating}%</span>
                                            </div>
                                            <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <div class="h-full ${progress} rounded-full shadow-inner transition-all duration-500" style="width:${x.rating}%"></div>
                                            </div>
                                        </div>
                                        <div class="mt-3 text-[10px] text-primary font-bold">
                                            Tap card untuk lihat detail perhitungan
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="mt-4 p-4 rounded-3xl bg-white/90 dark:bg-darkCard border border-slate-100 dark:border-slate-800 shadow-lg">
                        <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Keterangan Perhitungan Ranking</h4>
                        <div class="text-[11px] text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                            <p><b>1. Kehadiran (20%)</b> = Hadir dari absen masuk + pulang. Masuk atau pulang saja dihitung setengah.</p>
                            <p><b>2. Total Penghasilan (20%)</b> = Penghasilan bulanan dari ongkir + biaya tambahan.</p>
                            <p><b>3. Total Nota (30%)</b> = Jumlah nota bulanan yang berhasil diinput.</p>
                            <p><b>4. Trx Mitra (20%)</b> = Total transaksi mitra bulanan.</p>
                            <p><b>5. Total OFF / Izin / Sakit (10%)</b> = Normal maksimal 3/bulan, lebih dari itu poin berkurang.</p>
                        </div>
                    </div>
                `;
            } finally {
                isRenderKpiRunning = false;
            }
        };
        window.saveDataManajemen = function() {
            const idEdit = document.getElementById('manajemen-id-edit').value;
            const kategori = document.getElementById('manajemen-kategori').value;
            const nama = document.getElementById('manajemen-nama').value.trim();
            const username = document.getElementById('manajemen-username').value.trim().toLowerCase();
            const password = document.getElementById('manajemen-password').value.trim();
            const status = document.getElementById('manajemen-status').value;
        
            if (!kategori || !nama || !username || !password) {
                alert('Lengkapi semua data!');
                return;
            }
        
            const payload = { kategori, nama, username, password, status };
        
            if (idEdit) {
                update(ref(db, `manajemen_sahabatku/${idEdit}`), payload)
                    .then(() => {
                        alert('Data berhasil diperbarui!');
                        resetFormManajemen();
                        setTimeout(() => {
                            if (typeof renderAdminManajemen === 'function') renderAdminManajemen();
                        }, 300);
                    })
                    .catch(err => alert('Gagal update: ' + err.message));
            } else {
                push(ref(db, 'manajemen_sahabatku'), payload)
                    .then(() => {
                        alert('Data berhasil disimpan!');
                        resetFormManajemen();
                        setTimeout(() => {
                            if (typeof renderAdminManajemen === 'function') renderAdminManajemen();
                        }, 300);
                    })
                    .catch(err => alert('Gagal simpan: ' + err.message));
            }

        };
        
        window.editDataManajemen = function(key) {
            const d = cloudManajemenList[key];
            if (!d) return;
        
            document.getElementById('edit-manajemen-id').value = key;
            document.getElementById('edit-manajemen-kategori').value = d.kategori || 'Head Operasional';
            document.getElementById('edit-manajemen-nama').value = d.nama || '';
            document.getElementById('edit-manajemen-username').value = d.username || '';
            document.getElementById('edit-manajemen-password').value = d.password || '';
            document.getElementById('edit-manajemen-status').value = d.status || 'aktif';
        
            document.getElementById('modal-edit-manajemen').classList.remove('hidden');
        };
        window.saveEditManajemen = function() {
            const id = document.getElementById('edit-manajemen-id').value;
            const kategori = document.getElementById('edit-manajemen-kategori').value;
            const nama = document.getElementById('edit-manajemen-nama').value.trim();
            const username = document.getElementById('edit-manajemen-username').value.trim().toLowerCase();
            const password = document.getElementById('edit-manajemen-password').value.trim();
            const status = document.getElementById('edit-manajemen-status').value;
        
            if (!id) return alert('Data manajemen tidak ditemukan!');
            if (!kategori || !nama || !username || !password) return alert('Lengkapi semua data!');
        
            update(ref(db, `manajemen_sahabatku/${id}`), {
                kategori,
                nama,
                username,
                password,
                status
            }).then(() => {
                alert('Data manajemen berhasil diperbarui!');
                closeEditManajemenModal();
            }).catch(err => {
                alert('Gagal update: ' + err.message);
            });
        };
        window.closeEditManajemenModal = function() {
            document.getElementById('modal-edit-manajemen').classList.add('hidden');
            document.getElementById('edit-manajemen-id').value = '';
            document.getElementById('edit-manajemen-kategori').value = 'Head Operasional';
            document.getElementById('edit-manajemen-nama').value = '';
            document.getElementById('edit-manajemen-username').value = '';
            document.getElementById('edit-manajemen-password').value = '';
            document.getElementById('edit-manajemen-status').value = 'aktif';
        };
        
        window.resetFormManajemen = function() {
            document.getElementById('manajemen-id-edit').value = '';
            document.getElementById('manajemen-kategori').value = 'Head Operasional';
            document.getElementById('manajemen-nama').value = '';
            document.getElementById('manajemen-username').value = '';
            document.getElementById('manajemen-password').value = '';
            document.getElementById('manajemen-status').value = 'aktif';
            document.getElementById('title-form-manajemen').innerText = 'Tambah / Edit Data Manajemen';
        };
        function populateNotifKurirList() {
        const tbody = document.getElementById('notif-kurir-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        const kurirList = Object.entries(cloudKurirList || {})
            .filter(([_, u]) => u && u.role === 'kurir' && u.status === 'aktif')
            .map(([id, u]) => ({ id, nama: u.nama || u.username || id, leader: u.leader || '-' }));

        kurirList.forEach((kurir, idx) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer';
            tr.innerHTML = `
            <td class="p-2.5 text-slate-700 dark:text-slate-300 font-semibold">${idx + 1}</td>
            <td class="p-2.5">
                <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="notif-kurir-check accent-primary" value="${kurir.nama}">
                <span class="text-slate-800 dark:text-white font-medium">${kurir.nama}</span>
                </label>
            </td>
            <td class="p-2.5 text-slate-500 dark:text-slate-400">${kurir.leader}</td>
            `;
            tbody.appendChild(tr);
        });
        }
        window.saveNotification = function() {
        const target = document.getElementById('notif-target').value;
        const message = document.getElementById('notif-message').value.trim();

        if (!message) {
            alert('Isi pesan notifikasi wajib diisi!');
            return;
        }

        let targetList = [];
        if (target === 'selected') {
            const checkboxes = document.querySelectorAll('.notif-kurir-check:checked');
            targetList = Array.from(checkboxes).map(checkbox => checkbox.value);
            if (!targetList.length) {
            alert('Pilih minimal 1 kurir!');
            return;
            }
        }

        const payload = {
            target,
            targetList,
            message,
            type: 'warning',
            active: true,
            createdAt: new Date().toISOString()
        };

        push(ref(db, 'notifications_admin'), payload)
            .then(() => {
            alert('Notifikasi berhasil dikirim!');
            resetNotifForm();
            })
            .catch(err => alert('Gagal kirim notifikasi: ' + err.message));
        };
                
        window.hapusDataManajemen = function(key) {
            if (confirm('Hapus data ini?')) {
                remove(ref(db, `manajemen_sahabatku/${key}`))
                    .then(() => alert('Data berhasil dihapus!'))
                    .catch(err => alert('Gagal hapus: ' + err.message));
            }
        };
        window.renderAdminManajemen = function() {
            const container = document.getElementById('container-admin-manajemen');
            if (!container) return;

            const isOpen = ensureSectionToggleState('container-admin-manajemen', false);
            const keys = Object.keys(cloudManajemenList || {});

            container.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                </div>
                <div id="container-admin-manajemen-inner" class="${isOpen ? '' : 'hidden'} space-y-2.5"></div>
            `;

            const inner = document.getElementById('container-admin-manajemen-inner');
            if (!inner || !isOpen) return;

            if (!keys.length) {
                inner.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data.</div>';
                return;
            }

            inner.innerHTML = keys.map(key => {
                const d = cloudManajemenList[key];
                const statusColor = d.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500';
                return `
                    <div class="bg-white dark:bg-darkCard p-3.5 rounded-xl border dark:border-slate-800 shadow-sm space-y-2 text-xs">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2.5 h-2.5 rounded-full ${statusColor} shrink-0"></span>
                                <span class="font-bold text-sm dark:text-white truncate">${d.nama || '-'}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 shrink-0">${d.kategori || '-'}</span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg grid grid-cols-1 gap-1 font-mono text-[11px]">
                            <div class="dark:text-slate-300">User: <span class="text-primary font-bold">${d.username || '-'}</span></div>
                            <div class="dark:text-slate-300">Pass: <span class="text-amber-500 font-bold">${d.password || '-'}</span></div>
                            <div class="dark:text-slate-300">Status: <span class="font-bold ${d.status === 'aktif' ? 'text-emerald-500' : 'text-rose-500'}">${d.status || '-'}</span></div>
                        </div>
                        <div class="flex justify-end gap-2 pt-1">
                            <button onclick="editDataManajemen('${key}')" class="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white rounded-md font-semibold">Edit</button>
                            <button onclick="hapusDataManajemen('${key}')" class="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-md font-semibold">Hapus</button>
                        </div>
                    </div>
                `;
            }).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        };
        window.applyManajemenAccess = function(kategori) {
            const kategoriFixed = (kategori || '').trim();
            const badge = document.getElementById('badge-admin-role');
            const kurirForm = document.querySelector('#screen-admin-kurir > .bg-white');
            const manajemenScreen = document.getElementById('screen-admin-manajemen');
            const manajemenCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-manajemen"]');
            const ongkirCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-ongkir"]');
            const mitraForm = document.querySelector('#screen-admin-mitra > .bg-white');
            
            if (badge) {
                if (kategoriFixed === 'Owner') badge.innerText = 'Owner';
                else if (kategoriFixed === 'Head Operasional') badge.innerText = 'Head Operasional';
                else if (kategoriFixed === 'HRD') badge.innerText = 'HRD';
                else badge.innerText = kategoriFixed || 'Manajemen';
            }

            if (kategoriFixed === 'Owner' || kategoriFixed === 'Head Operasional') {
                const allScreenIds = [
                    'screen-admin-kurir', 'screen-admin-manajemen', 'screen-admin-nota',
                    'screen-admin-mitra', 'screen-admin-laporan', 'screen-admin-tracking',
                    'screen-admin-kpi', 'screen-admin-testimonial', 'screen-admin-notifikasi',
                    'screen-admin-absensi', 'screen-admin-ongkir', 'screen-pengaturan'
                ];

                allScreenIds.forEach(id => {
                    const screen = document.getElementById(id);
                    if (!screen) return;
                    screen.classList.remove('hidden');
                    screen.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                    });
                });

                if (kurirForm) kurirForm.classList.remove('hidden');
                if (mitraForm) mitraForm.classList.remove('hidden');
                if (manajemenCardBtn) manajemenCardBtn.classList.remove('hidden');
                if (ongkirCardBtn) ongkirCardBtn.classList.remove('hidden');

                if (kategoriFixed === 'Head Operasional') {
                    if (manajemenScreen) {
                        manajemenScreen.classList.add('hidden');
                        manajemenScreen.querySelectorAll('button').forEach(btn => {
                            btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                        });
                    }
                    if (manajemenCardBtn) manajemenCardBtn.classList.add('hidden');
                    if (ongkirCardBtn) ongkirCardBtn.classList.add('hidden');

                    const kurirScreen = document.getElementById('screen-admin-kurir');
                    if (kurirScreen) {
                        const kurirFormBox = kurirScreen.querySelector('.bg-white');
                        if (kurirFormBox) kurirFormBox.classList.add('hidden');

                        kurirScreen.querySelectorAll('.bg-white button').forEach(btn => {
                            const text = (btn.innerText || '').trim().toUpperCase();
                            if (text === 'SIMPAN' || text === 'BATAL' || text === 'EDIT' || text === 'HAPUS') {
                                btn.classList.add('hidden');
                            }
                        });
                    }
                } else {
                    if (manajemenScreen) manajemenScreen.classList.remove('hidden');
                }

                const mitraScreen = document.getElementById('screen-admin-mitra');
                if (mitraScreen && kategoriFixed === 'Head Operasional') {
                    mitraScreen.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                    });
                }

                return;
            }

            if (kategoriFixed === 'HRD') {
                const hrdScreens = [
                    'screen-admin-kurir', 'screen-admin-tracking', 'screen-admin-kpi',
                    'screen-admin-testimonial', 'screen-admin-absensi'
                ];

                hrdScreens.forEach(id => {
                    const screen = document.getElementById(id);
                    if (!screen) return;
                    screen.classList.remove('hidden');
                    screen.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                    });
                });

                const hiddenForHRD = [
                    'screen-admin-manajemen', 'screen-admin-nota', 'screen-admin-mitra',
                    'screen-admin-laporan', 'screen-admin-notifikasi', 'screen-admin-ongkir'
                ];
                hiddenForHRD.forEach(id => {
                    const screen = document.getElementById(id);
                    if (!screen) return;
                    screen.classList.add('hidden');
                    screen.querySelectorAll('button').forEach(btn => {
                        btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                    });
                });

                if (kurirForm) kurirForm.classList.add('hidden');
                if (manajemenCardBtn) manajemenCardBtn.classList.add('hidden');
                if (ongkirCardBtn) ongkirCardBtn.classList.add('hidden');
                return;
            }

            console.log('Kategori manajemen tidak dikenali:', kategoriFixed);
        };
        window.openPopupPenilaianLeader = function() {
            const modal = document.getElementById('modal-penilaian-leader');
            const bulan = document.getElementById('leader-penilaian-bulan');
            if (!modal || !bulan) return;
        
            bulan.value = getWibRawDate().substring(0, 7);
            modal.classList.remove('hidden');
            renderPenilaianLeader();
        };

        window.closePopupPenilaianLeader = function() {
            const modal = document.getElementById('modal-penilaian-leader');
            if (modal) modal.classList.add('hidden');
        };
        function getLeaderScore(namaLeader, bulan) {
            const leaderName = (namaLeader || '').trim();
            if (!leaderName) return null;
        
            const leaderItem = Object.values(cloudLeaderList || {}).find(u =>
                u && (u.nama || '').trim() === leaderName
            );
        
            const anggotaData = Object.values(cloudKurirList || {}).filter(u => {
                return u &&
                    u.role === 'kurir' &&
                    u.status === 'aktif' &&
                    (u.leader || '').trim() === leaderName;
            });
        
            if (!anggotaData.length) {
                return {
                    namaLeader: leaderName,
                    leaderUsername: leaderItem?.username || '-',
                    anggotaCount: 0,
                    leaderRating: 0,
                    bonusTopRanking: 0,
                    skorAkhir: 0,
                    totalKehadiranAnggota: 0,
                    totalPenghasilanAnggota: 0,
                    totalNotaAnggota: 0,
                    totalTrxMitraAnggota: 0,
                    totalOffAnggota: 0,
                    anggotaRanking: [],
                    terbaik: null,
                    sedang: null,
                    beban: null
                };
            }
        
            const anggotaRanking = anggotaData.map(u => {
                const namaAnggota = (u.nama || u.username || '-').trim();
                const stat = calcKpiForKurir(namaAnggota, bulan) || {
                    rating: 0,
                    hadir: 0,
                    totalNota: 0,
                    trxMitra: 0,
                    totalPenghasilan: 0,
                    off: 0
                };
        
                const badge = getRatingBadge(stat.rating || 0);
        
                return {
                    nama: namaAnggota,
                    rating: stat.rating || 0,
                    hadir: stat.hadir || 0,
                    totalNota: stat.totalNota || 0,
                    trxMitra: stat.trxMitra || 0,
                    totalPenghasilan: stat.totalPenghasilan || 0,
                    off: stat.off || 0,
                    badgeLabel: badge.label,
                    badgeEmoji: badge.emoji
                };
            }).sort((a, b) => b.rating - a.rating);
        
            const top1 = anggotaRanking[0] || null;
            const top2 = anggotaRanking[1] || null;
            const top3 = anggotaRanking[2] || null;
        
            // Total semua komponen rating anggota
            const totalRatingAnggota = anggotaRanking.reduce((acc, a) => acc + (a.rating || 0), 0);
        
            // Normalisasi: rata-rata rating semua anggota
            const leaderRating = Math.round(totalRatingAnggota / anggotaRanking.length);
        
            const bonusTopRanking =
                (top1 ? 5 : 0) +
                (top2 ? 3 : 0) +
                (top3 ? 1 : 0);
        
            const skorAkhir = Math.min(100, Math.round(leaderRating + bonusTopRanking));
        
            return {
                namaLeader: leaderName,
                leaderUsername: leaderItem?.username || '-',
                anggotaCount: anggotaRanking.length,
                leaderRating,
                bonusTopRanking,
                skorAkhir,
                totalKehadiranAnggota: anggotaRanking.reduce((a, b) => a + (b.hadir || 0), 0),
                totalPenghasilanAnggota: anggotaRanking.reduce((a, b) => a + (b.totalPenghasilan || 0), 0),
                totalNotaAnggota: anggotaRanking.reduce((a, b) => a + (b.totalNota || 0), 0),
                totalTrxMitraAnggota: anggotaRanking.reduce((a, b) => a + (b.trxMitra || 0), 0),
                totalOffAnggota: anggotaRanking.reduce((a, b) => a + (b.off || 0), 0),
                anggotaRanking,
                terbaik: top1,
                sedang: anggotaRanking.length ? anggotaRanking[Math.floor(anggotaRanking.length / 2)] : null,
                beban: anggotaRanking[anggotaRanking.length - 1] || null
            };
        }
        window.renderPenilaianLeader = function() {
            const container = document.getElementById('container-penilaian-leader');
            const bulan = document.getElementById('leader-penilaian-bulan')?.value || getWibRawDate().substring(0, 7);
            if (!container) return;
        
            const leaderNames = new Set();
        
            Object.values(cloudLeaderList || {}).forEach(item => {
                if (item && item.nama) leaderNames.add(item.nama.trim());
            });
        
            Object.values(cloudKurirList || {}).forEach(u => {
                if (u && u.leader) leaderNames.add(u.leader.trim());
            });
        
            const data = Array.from(leaderNames)
                .filter(Boolean)
                .map(namaLeader => getLeaderScore(namaLeader, bulan))
                .filter(Boolean)
                .sort((a, b) => b.skorAkhir - a.skorAkhir);
        
            if (!data.length) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data leader.</div>';
                return;
            }
        
            container.innerHTML = data.map((d, i) => {
                const badge = getRatingBadge(d.skorAkhir);
                const anggotaList = d.anggotaRanking || [];
        
                return `
                    <div class="bg-white dark:bg-darkCard p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-300 font-black text-xs">
                                        ${i + 1}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-sm truncate">${d.namaLeader}</div>
                                        <div class="text-[10px] text-slate-400 truncate">Username: ${d.leaderUsername}</div>
                                    </div>
                                </div>
                            </div>
        
                            <div class="text-right shrink-0">
                                <div class="text-lg font-black text-primary">${d.skorAkhir}%</div>
                                <div class="text-[10px] font-bold ${badge.color || 'text-slate-500'}">
                                    ${badge.emoji} ${badge.label}
                                </div>
                            </div>
                        </div>
        
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Skor Dasar Leader</div>
                                <div class="font-black mt-1">${d.leaderRating}</div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Bonus Top Ranking</div>
                                <div class="font-black mt-1">+${d.bonusTopRanking}</div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 col-span-2">
                                <div class="text-[10px] text-slate-400 uppercase">Total Anggota Aktif</div>
                                <div class="font-black mt-1">${d.anggotaCount}</div>
                            </div>
                        </div>
        
                        <div class="grid grid-cols-4 gap-2 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Kehadiran</div>
                                <div class="font-black mt-1">${d.totalKehadiranAnggota}</div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Penghasilan</div>
                                <div class="font-black mt-1 text-emerald-600 dark:text-emerald-400">
                                    Rp ${d.totalPenghasilanAnggota.toLocaleString('id-ID')}
                                </div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Total Nota</div>
                                <div class="font-black mt-1">${d.totalNotaAnggota}</div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Trx Mitra</div>
                                <div class="font-black mt-1">${d.totalTrxMitraAnggota}</div>
                            </div>
                        </div>
        
                        <div class="grid grid-cols-1 gap-2 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div class="text-[10px] text-slate-400 uppercase">Total OFF / Izin / Sakit</div>
                                <div class="font-black mt-1">${d.totalOffAnggota}</div>
                            </div>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Anggota & Badge
                            </div>
                            <div class="flex flex-wrap gap-1">
                            ${anggotaList.length
                                ? anggotaList.map(a => {
                                    const badgeA = getRatingBadge(a.rating);
                                    return `
                                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border text-[9px] font-semibold whitespace-nowrap leading-none">
                                        <span>${a.nama}</span>
                                        <span class="text-slate-400">•</span>
                                        <span>${a.rating}%</span>
                                        <span class="text-slate-400">•</span>
                                        <span>${badgeA.emoji} ${badgeA.label}</span>
                                    </span>
                                    `;
                                }).join('')
                                : '<span class="text-[10px] text-slate-400">Belum ada anggota.</span>'
                            }
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div class="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                <span>Progress Leader</span>
                                <span>${d.skorAkhir}%</span>
                            </div>
                            <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div class="h-full bg-primary rounded-full" style="width:${d.skorAkhir}%"></div>
                            </div>
                        </div>
        
                        <div class="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
                            <p><b>Leader Score</b> diambil dari total rating seluruh anggota + bonus Top 3 anggota.</p>
                            <p>Badge tiap anggota tetap mengikuti KPI kurir masing-masing.</p>
                            <p>Anggota nonaktif/blokir tidak dihitung.</p>
                        </div>
                    </div>
                `;
            }).join('');
        };
        window.openLeaderModal = function() {
            resetLeaderForm();
            document.getElementById('modal-leader').classList.remove('hidden');
            renderLeaderList();
        };
        window.resetLeaderForm = function() {
            document.getElementById('leader-id-edit').value = '';
            document.getElementById('leader-nama').value = '';
            const select = document.getElementById('leader-anggota');
            if (select) Array.from(select.options).forEach(o => o.selected = false);
        };

        window.renderLeaderList = function() {
            const container = document.getElementById('container-leader-list');
            if (!container) return;
        
            const keys = Object.keys(cloudLeaderList || {});
            if (!keys.length) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">Belum ada leader tersimpan.</div>';
                return;
            }
        
            const bulan = getWibRawDate().substring(0, 7);
        
            container.innerHTML = keys.map(key => {
                const item = cloudLeaderList[key];
                const anggota = Array.isArray(item.anggota) ? item.anggota : [];
        
                const hasilAnggota = anggota.map(nama => {
                    const stat = calcKpiForKurir(nama, bulan);
                    return { nama, rating: stat.rating };
                }).sort((a, b) => b.rating - a.rating);
        
                const terbaik = hasilAnggota[0] || null;
                const sedang = hasilAnggota.length ? hasilAnggota[Math.floor(hasilAnggota.length / 2)] : null;
                const beban = hasilAnggota[hasilAnggota.length - 1] || null;
        
                return `
                    <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border text-xs space-y-2">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-bold text-sm">${item.nama || '-'}</div>
                                <div class="text-[10px] text-slate-400">Anggota: ${anggota.length}</div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="editLeaderData('${key}')" class="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold">Edit</button>
                                <button onclick="hapusLeaderData('${key}')" class="px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold">Hapus</button>
                            </div>
                        </div>
        
                        <div class="space-y-1 text-[10px]">
                            <div class="font-semibold text-slate-500">Daftar Anggota:</div>
                            <div class="flex flex-wrap gap-1">
                                ${anggota.map(a => `<span class="px-2 py-1 rounded-full bg-white dark:bg-darkBg border">${a}</span>`).join('') || '-'}
                            </div>
                        </div>
        
                        <div class="grid grid-cols-3 gap-2 text-[10px]">
                            <div class="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                                <div class="font-bold">Terbaik</div>
                                <div>${terbaik ? terbaik.nama : '-'}</div>
                                <div>Rating: ${terbaik ? terbaik.rating : 0}%</div>
                            </div>
                            <div class="p-2 rounded-lg bg-amber-50 text-amber-700">
                                <div class="font-bold">Sedang</div>
                                <div>${sedang ? sedang.nama : '-'}</div>
                                <div>Rating: ${sedang ? sedang.rating : 0}%</div>
                            </div>
                            <div class="p-2 rounded-lg bg-rose-50 text-rose-700">
                                <div class="font-bold">Beban</div>
                                <div>${beban ? beban.nama : '-'}</div>
                                <div>Rating: ${beban ? beban.rating : 0}%</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        };
        window.editLeaderData = function(key) {
            const d = cloudLeaderList[key];
            if (!d) return;
        
            document.getElementById('leader-id-edit').value = key;
            document.getElementById('leader-nama').value = d.nama || '';
        
            populateAnggotaDropdownLeader();
            const select = document.getElementById('leader-anggota');
            if (select && Array.isArray(d.anggota)) {
                Array.from(select.options).forEach(opt => {
                    opt.selected = d.anggota.includes(opt.value);
                });
            }
        };

        window.hapusLeaderData = function(key) {
            if (confirm('Hapus data leader ini?')) {
                remove(ref(db, `leader_list/${key}`))
                    .then(() => alert('Leader berhasil dihapus!'))
                    .catch(err => alert('Gagal hapus leader: ' + err.message));
            }
        };

        window.closeLeaderModal = function() {
            document.getElementById('modal-leader').classList.add('hidden');
        };
        
        window.saveLeaderData = function() {
            const idEdit = document.getElementById('leader-id-edit').value;
            const nama = document.getElementById('leader-nama').value.trim();
            const select = document.getElementById('leader-anggota');
            const anggota = Array.from(select.selectedOptions).map(opt => opt.value.trim()).filter(Boolean);
        
            if (!nama) return alert('Nama leader wajib diisi!');
            if (!anggota.length) return alert('Pilih minimal 1 anggota!');
        
            const payload = { nama, anggota };
        
            const syncKeKurir = async () => {
                for (const [key, user] of Object.entries(cloudKurirList || {})) {
                    if (!user) continue;
                    if (anggota.includes(user.nama)) {
                        await update(ref(db, `users/${key}`), { leader: nama });
                    } else if ((user.leader || '').trim() === nama) {
                        await update(ref(db, `users/${key}`), { leader: '' });
                    }
                }
            };
        
            if (idEdit) {
                update(ref(db, `leader_list/${idEdit}`), payload)
                    .then(async () => {
                        await syncKeKurir();
                        alert('Data leader berhasil disimpan!');
                        closeLeaderModal();
                    })
                    .catch(err => alert('Gagal update leader: ' + err.message));
            } else {
                push(ref(db, 'leader_list'), payload)
                    .then(async () => {
                        await syncKeKurir();
                        alert('Data leader berhasil disimpan!');
                        closeLeaderModal();
                    })
                    .catch(err => alert('Gagal simpan leader: ' + err.message));
            }
        };

        function populateLeaderDropdown() {
            const dropdown = document.getElementById('ak-leader');
            const dropdownEdit = document.getElementById('edit-kurir-leader');
            if (!dropdown && !dropdownEdit) return;
        
            const options = ['<option value="">-- Pilih Leader --</option>'];
        
            Object.values(cloudLeaderList || {}).forEach(item => {
                if (item && item.nama) {
                    options.push(`<option value="${item.nama}">${item.nama}</option>`);
                }
            });
        
            const html = options.join('');
            if (dropdown) dropdown.innerHTML = html;
            if (dropdownEdit) dropdownEdit.innerHTML = html;
        }
        
        function populateAnggotaDropdownLeader() {
            const select = document.getElementById('leader-anggota');
            if (!select) return;
        
            select.innerHTML = '';
        
            Object.values(cloudKurirList || {}).forEach(user => {
                if (user && user.role === 'kurir' && user.status === 'aktif') {
                    const leaderName = (user.leader || '').trim();
                    const label = leaderName
                        ? `🔒 ${user.nama} — Leader: ${leaderName}`
                        : `✅ ${user.nama} — Belum punya leader`;
        
                    select.innerHTML += `<option value="${user.nama}">${label}</option>`;
                }
            });
        }
        window.openLeaderModal = function() {
            resetLeaderForm();
            document.getElementById('modal-leader').classList.remove('hidden');
            populateAnggotaDropdownLeader();
            renderLeaderList();
        };
        function isLeaderExist(namaLeader) {
            const target = (namaLeader || '').trim().toLowerCase();
            if (!target) return false;
        
            return Object.values(cloudLeaderList || {}).some(item => {
                return item && (item.nama || '').trim().toLowerCase() === target;
            });
        }
        function syncLeaderName(oldName, newName) {
            const oldLeader = (oldName || '').trim();
            const newLeader = (newName || '').trim();
        
            if (!oldLeader || !newLeader || oldLeader === newLeader) return;
        
            Object.entries(cloudKurirList || {}).forEach(([key, user]) => {
                if ((user.leader || '').trim() === oldLeader) {
                    update(ref(db, `users/${key}`), {
                        leader: newLeader
                    });
                }
            });
        }
        let cloudNotificationList = {};
        
        window.toggleNotifTarget = function() {
            const target = document.getElementById('notif-target').value;
            const box = document.getElementById('notif-selected-box');
            if (!box) return;
            if (target === 'selected') box.classList.remove('hidden');
            else box.classList.add('hidden');
        };
        
        
        window.fillNotifTemplate = function() {
            const val = document.getElementById('notif-template').value;
            const msg = document.getElementById('notif-message');
            if (!msg) return;
        
            const templates = {
                trx: 'Kurir hari ini belum input trx mitra. Mohon segera input agar data harian lengkap.',
                nota: 'Nota hari ini masih sedikit. Mohon tingkatkan input nota untuk target harian.',
                absen_masuk: 'Anda belum absen masuk hari ini. Mohon segera lakukan absensi.',
                absen_pulang: 'Anda belum absen pulang hari ini. Mohon segera lakukan absensi pulang.',
                kpi: 'Peringkat KPI Anda perlu ditingkatkan. Mohon perhatikan performa kerja hari ini.'
            };
        
            if (val === 'custom') {
                msg.value = '';
                msg.focus();
                return;
            }
        
            if (templates[val]) msg.value = templates[val];
        };
        
        window.resetNotifForm = function() {
            document.getElementById('notif-target').value = 'all';
            document.getElementById('notif-template').value = '';
            document.getElementById('notif-message').value = '';
            const box = document.getElementById('notif-selected-box');
            if (box) box.classList.add('hidden');
            const select = document.getElementById('notif-target-list');
            if (select) Array.from(select.options).forEach(o => o.selected = false);
        };

        function renderKurirNotifications() {
            if (!userSession || userSession.role !== 'kurir') return;
        
            const box = document.getElementById('kurir-notif-box');
            const text = document.getElementById('kurir-notif-text');
            if (!box || !text) return;
        
            const username = userSession.username;
            const hiddenIds = getHiddenNotifIds();
        
            const found = Object.entries(cloudNotificationList || {})
                .sort((a, b) => (b[1]?.createdAt || '').localeCompare(a[1]?.createdAt || ''))
                .find(([id, n]) => {
                    if (!n || !n.active) return false;
                    if (hiddenIds.includes(id)) return false;
                    if (n.target === 'all') return true;
                    if (n.target === 'selected' && Array.isArray(n.targetList)) {
                        return n.targetList.includes(username);
                    }
                    return false;
                });
        
            if (!found) {
                box.classList.add('hidden');
                text.innerHTML = '';
                return;
            }
        
            const [notifId, notif] = found;
            text.innerHTML = `
                <div class="relative pr-7 leading-snug text-[10px]">
                    ${notif.message || ''}
                    <button onclick="dismissKurirNotification('${notifId}')"
                        class="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/90 text-rose-500 text-[10px] font-bold shadow-sm">
                        ✕
                    </button>
                </div>
            `;
            box.classList.remove('hidden');
        }
        
        onValue(ref(db, 'notifications_admin'), (snapshot) => {
            cloudNotificationList = snapshot.val() || {};
            queueUiRefresh();
        });
        window.dismissKurirNotification = function(notifId) {
            hideNotifForCurrentUser(notifId);
            renderKurirNotifications();
        };

        window.resendNotification = function(key) {
            const n = cloudNotificationList[key];
            if (!n) return;
        
            const payload = {
                target: n.target || 'all',
                targetList: Array.isArray(n.targetList) ? n.targetList : [],
                message: n.message || '',
                type: n.type || 'warning',
                active: true,
                createdAt: new Date().toISOString()
            };
        
            set(ref(db, `notifications_admin/${key}`), payload)
                .then(() => {
                    const hiddenIds = getHiddenNotifIds().filter(id => id !== key);
                    localStorage.setItem('hidden_notif_ids', JSON.stringify(hiddenIds));
        
                    alert('Notifikasi berhasil dikirim ulang!');
                    renderAdminNotificationHistory();
                    renderKurirNotifications();
                })
                .catch(err => alert('Gagal kirim ulang notifikasi: ' + err.message));
        };
        window.deleteNotification = function(key) {
            if (!confirm('Hapus notifikasi ini?')) return;
            remove(ref(db, `notifications_admin/${key}`))
                .then(() => alert('Notifikasi berhasil dihapus!'))
                .catch(err => alert('Gagal menghapus notifikasi: ' + err.message));
        };
        function getHiddenNotifIds() {
            try {
                return JSON.parse(localStorage.getItem('hidden_notif_ids') || '[]');
            } catch (e) {
                return [];
            }
        }
        
        function hideNotifForCurrentUser(notifId) {
            const list = getHiddenNotifIds();
            if (!list.includes(notifId)) list.push(notifId);
            localStorage.setItem('hidden_notif_ids', JSON.stringify(list));
        }
        window.toggleAdminKurirOpen = function() {
            const container = document.getElementById('container-admin-kurir');
            const btn = document.getElementById('btn-toggle-kurir-text');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            
            if (!isOpen) {
                renderAdminKurirList();
            } else {
                container.innerHTML = '';
            }
        };

        window.toggleAdminManajemenOpen = function() {
            const container = document.getElementById('container-admin-manajemen');
            const btn = document.getElementById('btn-toggle-manajemen-text');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            
            if (!isOpen) {
                renderAdminManajemen();
            } else {
                container.innerHTML = '';
            }
        };

        window.toggleAdminMitraOpen = function() {
            const container = document.getElementById('container-admin-daftar-mitra');
            const btn = document.getElementById('btn-toggle-mitra-text');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            
            if (!isOpen) {
                renderAdminDaftarMitra();
            } else {
                container.innerHTML = '';
            }
        };

        window.toggleAdminOngkirOpen = function() {
            const container = document.getElementById('container-admin-ongkir');
            const btn = document.getElementById('btn-toggle-ongkir-text');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            
            if (!isOpen) {
                renderAdminOngkirList();
            } else {
                container.innerHTML = '';
            }
        };

        window.toggleAdminNotifHistoryOpen = function() {
            const container = document.getElementById('container-admin-notification-history');
            const btn = document.getElementById('btn-toggle-notif-text');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            
            if (!isOpen) {
                renderAdminNotificationHistory();
            } else {
                container.innerHTML = '';
            }
        };

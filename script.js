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

        // ===================================================================
        // SISTEM NOTIFIKASI TOAST & KONFIRMASI MODERN
        // Pengganti alert()/confirm() bawaan browser di seluruh aplikasi.
        // ===================================================================
        let __toastSeq = 0;
        window.toast = function(message, type) {
            if (!message) return;
            if (!type) {
                const m = String(message).toLowerCase();
                if (m.includes('berhasil') || m.includes('tersimpan') || m.includes('sukses') || m.includes('terkirim')) {
                    type = 'success';
                } else if (m.includes('gagal') || m.includes('tidak terdaftar') || m.includes('salah') || m.includes('gangguan')
                    || m.includes('dinonaktifkan') || m.includes('tidak ditemukan') || m.includes('tidak boleh')
                    || m.includes('mohon') || m.includes('lengkapi') || m.includes('kosong') || m.includes('sudah dipakai')
                    || m.includes('sudah terdaftar') || m.includes('belum ada')) {
                    type = 'warning';
                } else {
                    type = 'info';
                }
            }
            const container = document.getElementById('toast-container');
            if (!container) { console.log('[toast]', message); return; }

            const styleMap = {
                success: { bg: 'bg-emerald-500', icon: 'check-circle-2' },
                warning: { bg: 'bg-rose-500', icon: 'alert-circle' },
                info: { bg: 'bg-slate-800', icon: 'info' }
            };
            const s = styleMap[type] || styleMap.info;

            // Batasi maksimal 3 toast tampil bersamaan agar ringan di HP RAM kecil
            while (container.children.length >= 3) {
                container.removeChild(container.firstChild);
            }

            const id = 'toast-' + (++__toastSeq);
            const el = document.createElement('div');
            el.id = id;
            el.className = `${s.bg} text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-start gap-2.5 pointer-events-auto toast-enter`;
            el.innerHTML = `<i data-lucide="${s.icon}" class="w-4 h-4 mt-0.5 shrink-0"></i><span class="leading-snug">${message}</span>`;
            container.appendChild(el);
            if (window.lucide) lucide.createIcons();

            requestAnimationFrame(() => el.classList.add('toast-show'));

            const lifeMs = 3200;
            const timer = setTimeout(() => removeToast(el), lifeMs);
            el.addEventListener('click', () => { clearTimeout(timer); removeToast(el); });

            function removeToast(node) {
                if (!node || !node.parentNode) return;
                node.classList.add('toast-exit');
                setTimeout(() => node.remove(), 250);
            }
        };

        // Modal konfirmasi kustom, menggantikan window.confirm().
        // Pemakaian: const ok = await showConfirm("Yakin hapus data ini?");
        window.showConfirm = function(message, opts) {
            opts = opts || {};
            return new Promise((resolve) => {
                const modal = document.getElementById('modal-confirm-global');
                if (!modal) { resolve(window.confirm(message)); return; }

                const msgEl = document.getElementById('confirm-message');
                const titleEl = document.getElementById('confirm-title');
                const okBtn = document.getElementById('confirm-btn-ok');
                const cancelBtn = document.getElementById('confirm-btn-cancel');

                if (msgEl) msgEl.textContent = message || 'Apakah Anda yakin?';
                if (titleEl) titleEl.textContent = opts.title || 'Konfirmasi';
                if (okBtn) okBtn.textContent = opts.okText || 'Ya, Lanjutkan';
                if (cancelBtn) cancelBtn.textContent = opts.cancelText || 'Batal';

                modal.classList.remove('hidden');
                if (window.lucide) lucide.createIcons();

                function cleanup(result) {
                    modal.classList.add('hidden');
                    okBtn.removeEventListener('click', onOk);
                    cancelBtn.removeEventListener('click', onCancel);
                    resolve(result);
                }
                function onOk() { cleanup(true); }
                function onCancel() { cleanup(false); }

                okBtn.addEventListener('click', onOk);
                cancelBtn.addEventListener('click', onCancel);
            });
        };

        let userSession = null; 
        let currentScreen = 'screen-login';
        let navigationHistory = [];
        let notaState = { items: [], biaya: [], subtotal: 0, ongkir: 10000, total: 0 };
        // Data nota terstruktur (bukan HTML) yang dipakai untuk MENGGAMBAR gambar nota
        // langsung ke <canvas> — terpisah dari notaState supaya urutan/isi nota yang
        // sedang dilihat tetap terkunci walau notaState berubah di layar lain.
        let kurirNotaPreviewData = null;
        let adminNotaPreviewData = null;
        let cloudKurirList = {};
        let cloudNotaList = {};
        let cloudMitraList = {};
        let cloudLogMitra = {};
        let cloudDepositBalance = {};
        let cloudDepositStart = {};
        let cloudNotaHabisCounter = {};
        let cloudDepositNotaUsage = {};
        let laporanBulanAktif = '';
        let cloudOngkirList = {};
        let adminOngkirMode = 'normal';
        let cloudTestimonialList = {};
        let cloudManajemenList = {}
        let cloudLeaderList = {};
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
                    // ===== LOCK RIWAYAT (biar ga kebalik ke dashboard) =====
                    const lockRiwayat = window.__lockRiwayatScreen === true;

                    if (!lockRiwayat && currentScreen === 'screen-dashboard' && typeof updateKurirDashboard === 'function') {
                        updateKurirDashboard();
                    }

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
                    if (currentScreen === 'screen-rekap' && typeof loadRekapKurir === 'function') loadRekapKurir();
                    if (currentScreen === 'screen-mitra' && typeof renderKurirMitraView === 'function') renderKurirMitraView(true);

                    if (typeof calculateDashboardStats === 'function' && !lockRiwayat) calculateDashboardStats();
                    if (typeof calculateMitraStats === 'function') calculateMitraStats();
                } finally {
                    uiRefreshInProgress = false;
                }
            }, 250);
        }
        function getWibDate() {
            return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        }
        const API_URL = 'https://script.google.com/macros/s/AKfycbxfMHYjmhM5IB683WgeQBh5FeuRunezfqxVNFWhxIIwW5F1_x4VFIaYLkne1FfcBhYNZQ/exec';
        function getWibTodayRawDate() {
            const now = new Date();
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(now);
        }

        function getWibTodayMonth() {
            return getWibTodayRawDate().slice(0, 7);
        }

        function getWibRawDate() {
            const wib = getWibDate();
            const tahun = wib.getFullYear();
            const bulan = String(wib.getMonth() + 1).padStart(2, '0');
            const tanggal = String(wib.getDate()).padStart(2, '0');
            return `${tahun}-${bulan}-${tanggal}`;
        }
        function getHariIndo(dateStr) {
            const d = dateStr
                ? new Date(dateStr + 'T00:00:00')
                : getWibDate();

            return d.toLocaleDateString('id-ID', { weekday: 'long' });
        }
        function getDistanceMeters(lat1, lon1, lat2, lon2) {
            const R = 6371000;
            const toRad = v => (v * Math.PI) / 180;
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
        if (!navigator.geolocation || !window.isSecureContext) return;

        if (watchId) {
            try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
            watchId = null;
        }

        console.log('[Tracking] start:', userSession);

        const TRACKING = {
            minTimeMs: 15000,
            minDistanceM: 30,
            geoOptions: {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 20000
            }
        };

        // cache alamat biar ga spam request tiap update kecil
        const addressCache = new Map();
        let lastAddressFetchAt = 0;

        const reverseGeocodeAlamat = async (lat, lng) => {
            // quantize 4 desimal ~ beberapa meter
            const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
            if (addressCache.has(key)) return addressCache.get(key);

            // throttling
            const now = Date.now();
            if (now - lastAddressFetchAt < 8000) return null; 
            lastAddressFetchAt = now;

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=id&zoom=16&addressdetails=0`;

            try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return null;
            const data = await res.json();

            const alamat =
                data?.display_name ||
                (data?.address ? [
                data.address.road,
                data.address.suburb,
                data.address.city || data.address.town || data.address.village,
                data.address.state,
                data.address.postcode
                ].filter(Boolean).join(', ') : null);

            if (alamat) addressCache.set(key, alamat);
            return alamat || null;
            } catch (e) {
            console.warn('[Tracking] reverse geocode fail:', { message: e?.message });
            return null;
            }
        };

        let lastSent = null;
        let lastSentTime = 0;
        let hasSentFirst = false;

        const sendLiveLocationToFirebase = async (lat, lng, accuracy) => {
            const now = Date.now();
            const userId = userSession?.id;
            if (!userId) return;

            // kirim pertama kali SELALU
            if (!hasSentFirst) {
            hasSentFirst = true;
            } else {
            const timeOk = (now - lastSentTime) >= TRACKING.minTimeMs;

            let distOk = true;
            if (lastSent && typeof lastSent.lat === 'number' && typeof lastSent.lng === 'number') {
                const dist = getDistanceMeters(lastSent.lat, lastSent.lng, lat, lng);
                distOk = dist >= TRACKING.minDistanceM;
            }

            if (!timeOk && !distOk) return;
            }

            lastSent = { lat, lng };
            lastSentTime = now;

            // reverse geocode untuk alamat popup
            let alamatLengkap = null;
            try {
            alamatLengkap = await reverseGeocodeAlamat(lat, lng);
            } catch (_) {}

            const payload = {
            lat,
            lng,
            accuracy: accuracy ?? null,
            alamatLengkap: alamatLengkap || '',
            jamTracking: getWibDateTimeString().jam,
            tanggalTrackingRaw: getWibRawDate(),
            createdAt: new Date().toISOString(),
            status: 'aktif'
            };

            console.log('[Tracking] send payload:', payload);

            try {
            await set(ref(db, `live_locations/${userId}`), payload);
            console.log('[Tracking] sent OK for userId:', userId);
            } catch (e) {
            console.warn('[Tracking] sent FAIL:', {
                userId,
                message: e?.message,
                name: e?.name
            });
            }
        };

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
            const { latitude, longitude, accuracy } = pos.coords || {};
            if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

            console.log('[Tracking] position update:', { latitude, longitude, accuracy, ts: pos.timestamp });
            sendLiveLocationToFirebase(latitude, longitude, accuracy);
            },
            (err) => {
            console.warn('[Tracking] geolocation error:', { code: err?.code, message: err?.message });
            },
            TRACKING.geoOptions
        );
        };


        window.renderTrackingKurirList = function() {
            const container = document.getElementById('container-tracking-kurir');
            if (!container) return;
            container.innerHTML = '';
            const kurirEntries = Object.entries(cloudKurirList || {}).filter(([id, user]) => user && user.role === 'kurir');

            if (kurirEntries.length === 0) {
                container.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data kurir.</div>';
                return;
            }

            kurirEntries.forEach(([id, user]) => {
                const loc = liveLocations[id];
                const hasLocation = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
                const nama = user.nama || user.username || '?';
                const initial = nama.trim().charAt(0).toUpperCase();

                container.innerHTML += `
                    <button onclick="selectTrackingKurir('${id}')" class="tracking-item w-full text-left active:scale-95">
                        <div class="tracking-avatar">${initial}</div>
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-sm truncate">${nama}</div>
                            <div class="text-[10px] ${hasLocation ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} flex items-center gap-1 mt-0.5">
                                ${hasLocation ? '<span class="tracking-live-dot"></span> Lokasi terdeteksi' : 'Belum ada lokasi'}
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0"></i>
                    </button>
                `;
            });
            if (window.lucide) lucide.createIcons();
        };

        window.selectTrackingKurir = function(id) {
            selectedKurirTracking = id;
            selectedTrackingUser = cloudKurirList[id] || null;
            window.openTrackingModal(id);

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

            const customIcon = L.divIcon({
                html: `<div style="width:45px;height:45px;background:linear-gradient(135deg,#0066FF 0%,#008CFF 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,102,255,.4);border:3px solid white;font-size:24px;color:white;">📍</div>`,
                iconSize: [45, 45],
                iconAnchor: [22, 22],
                popupAnchor: [0, -22],
                className: 'tracking-marker'
            });

            trackingMarker = L.marker([loc.lat, loc.lng], { icon: customIcon })
                .addTo(trackingMap)
                .bindPopup(`<div style="text-align:center;font-size:11px;line-height:1.3;max-width:160px;"><b style="font-size:12px;">${user?.nama || 'Kurir'}</b><br><span style="font-size:9px;color:#666;display:block;margin:2px 0;">${loc.alamatLengkap ? loc.alamatLengkap.substring(0, 40) + (loc.alamatLengkap.length > 40 ? '...' : '') : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</span><span style="font-size:9px;color:#999;">${loc.jamTracking || '-'} WIB</span></div>`, {
                    minWidth: 140,
                    maxWidth: 180
                })
                .openPopup();

            trackingMap.setView([loc.lat, loc.lng], 16);
            trackingMap.invalidateSize();
        };
        window.openTrackingModal = function(id) {
            const modal = document.getElementById('modal-tracking-kurir');
            if (!modal) return;

            const loc = liveLocations[id];
            const user = cloudKurirList[id] || null;

            const mapModalEl = document.getElementById('tracking-map-modal');
            const titleEl = document.getElementById('modal-tracking-title');
            const subtitleEl = document.getElementById('modal-tracking-subtitle');
            const latlngEl = document.getElementById('modal-tracking-latlng');
            const jamEl = document.getElementById('modal-tracking-jam');
            const alamatEl = document.getElementById('modal-tracking-alamat');

            const hasLoc = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
            const latlngText = hasLoc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : '-';

            if (titleEl) titleEl.innerText = `Live Tracking - ${user?.nama || user?.username || 'Kurir'}`;
            if (subtitleEl) subtitleEl.innerText = (hasLoc && loc?.jamTracking) ? `Update terakhir: ${loc.jamTracking} WIB` : 'Menunggu lokasi...';

            // LAT,LNG clickable -> Google Maps
            if (latlngEl) {
                if (!hasLoc) {
                    latlngEl.innerText = '-';
                } else {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`;
                    latlngEl.innerHTML = `<a href="${mapsUrl}" target="_blank" rel="noopener" class="text-primary font-bold underline">${latlngText}</a>`;
                }
            }

            if (jamEl) jamEl.innerText = (loc && loc.jamTracking) ? loc.jamTracking : '-';
            if (alamatEl) alamatEl.innerText = (loc && loc.alamatLengkap) ? loc.alamatLengkap : (hasLoc ? latlngText : '-');

            modal.classList.remove('hidden');

            if (!mapModalEl) return;

            // CLEAN map modal: hapus map lama + reset container
            if (window.__trackingModalMap) {
                try { window.__trackingModalMap.remove(); } catch (e) {}
                window.__trackingModalMap = null;
            }
            mapModalEl.innerHTML = '';

            // Kalau belum ada lokasi: tetap tampil area peta (tapi tanpa tile/marker)
            if (!hasLoc) {
                mapModalEl.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[11px] text-slate-400">Belum ada lokasi</div>`;
                return;
            }

            // Bikin map baru yang rapi
            const map = L.map(mapModalEl, { zoomControl: false }).setView([loc.lat, loc.lng], 16);
            window.__trackingModalMap = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            const markerHtml = `
                <div style="
                    width:28px;height:28px;border-radius:50%;
                    background:linear-gradient(135deg,#0066FF 0%,#008CFF 100%);
                    border:2px solid #fff;
                    box-shadow:0 6px 16px rgba(0,102,255,.35);
                    display:flex;align-items:center;justify-content:center;
                    color:#fff;font-size:14px;line-height:1;">
                    📍
                </div>
            `;

            const customIcon = L.divIcon({
                html: markerHtml,
                iconSize: [28, 28],
                iconAnchor: [14, 28]
            });

            const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(map);

            const namaKurir = (user?.nama || user?.username || 'Kurir')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;');

            const popupHtml = `
                <div style="text-align:center; font-family: Inter, sans-serif; padding:4px 6px;">
                    <div style="font-weight:800; font-size:12px; color:#0f172a; margin-bottom:2px;">${namaKurir}</div>
                    <div style="font-size:10px; color:#2563eb; font-weight:800; margin-bottom:2px;">📍 ${latlngText}</div>
                    <div style="font-size:10px; color:#6b7280; font-weight:700;">${loc?.jamTracking || '-'} WIB</div>
                </div>
            `;

            marker.bindPopup(popupHtml, { closeButton: true, autoPan: false }).openPopup();

            setTimeout(() => map.invalidateSize(), 50);
        };
        window.closeTrackingModal = function() {
            const modal = document.getElementById('modal-tracking-kurir');
            if (modal) modal.classList.add('hidden');

            if (window.__trackingModalMap) {
                window.__trackingModalMap.remove();
                window.__trackingModalMap = null;
            }
        };
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
                'm-filter-tgl-kurir',
                'rekap-tanggal',
                'absensi-filter-tgl'
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

            const anBulanEl = document.getElementById('an-filter-bulan');
            if (anBulanEl && !anBulanEl.value) anBulanEl.value = tglSkrgWib.substring(0, 7);

            const filterBulanRiwayatEl = document.getElementById('filter-bulan-riwayat');
            if (filterBulanRiwayatEl && !filterBulanRiwayatEl.value) filterBulanRiwayatEl.value = tglSkrgWib.substring(0, 7);

            const rekapBulanEl = document.getElementById('rekap-bulan');
            if (rekapBulanEl && !rekapBulanEl.value) rekapBulanEl.value = tglSkrgWib.substring(0, 7);

            const kpiBulanEl = document.getElementById('kpi-filter-bulan');
            if (kpiBulanEl && !kpiBulanEl.value) kpiBulanEl.value = tglSkrgWib.substring(0, 7);
            onValue(ref(db, 'users'), (snapshot) => {
                cloudKurirList = snapshot.val() || {};

                cloudDepositBalance = {};
                cloudDepositStart = {};

                Object.entries(cloudKurirList || {}).forEach(([userId, user]) => {
                    if (!user) return;

                    const saldo = parseInt(user.depositSaldo || 0) || 0;
                    const username = (user.username || '').trim();

                    if (username) {
                        cloudDepositBalance[userId] = saldo;
                        cloudDepositBalance[username] = saldo;
                    }

                    cloudDepositStart[userId] = saldo;
                });

                populateKurirDropdownFilter();
                queueUiRefresh();

                if (userSession && userSession.role === 'kurir') {
                    const currentKurir = cloudKurirList[userSession.id];
                    if (currentKurir && currentKurir.status === 'aktif') {
                        launchApplicationSession("screen-dashboard");
                        if (typeof startLiveLocationTracking === "function") startLiveLocationTracking();
                    } else if (currentKurir && currentKurir.status !== 'aktif') {
                        toast("Sesi berakhir. Akun Anda telah dinonaktifkan oleh Admin.");
                        performLogout();
                    }
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

                document.querySelectorAll('.session-fullname').forEach(el => el.innerText = userSession.nama || '-');
                if (document.getElementById('nota-kurir') && userSession.nama) {
                    document.getElementById('nota-kurir').value = userSession.nama;
                }

                if (userSession.role === 'owner') {
                    launchApplicationSession("screen-admin-dashboard");
                    applyManajemenAccess("Owner");
                } else if (userSession.role === 'manajemen') {
                    launchApplicationSession("screen-admin-dashboard");
                    setTimeout(() => {
                        applyManajemenAccess(userSession.kategori || '-');
                    }, 50);
                } else if (userSession.role === 'kurir') {
                    launchApplicationSession("screen-dashboard");
                    // Mulai kirim lokasi live SEKARANG JUGA saat refresh/auto-login,
                    // jangan menunggu data 'users' selesai sinkron dari cloud dulu.
                    if (typeof startLiveLocationTracking === "function") startLiveLocationTracking();
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

            if (typeof sembunyikanRiwayatMitra === 'function') sembunyikanRiwayatMitra();
            if (typeof loadNotaDraft === 'function') loadNotaDraft();
            if (typeof populateLeaderDropdown === 'function') populateLeaderDropdown();
            if (typeof populateMitraSelectionDropdown === 'function') populateMitraSelectionDropdown();
            if (typeof initOrderDepositModule === 'function') initOrderDepositModule();
            if (typeof renderKurirNotifications === 'function') renderKurirNotifications();
        });
        window.toggleLoginPasswordVisibility = function() {
            const input = document.getElementById('login-password');
            const btn = document.getElementById('btn-toggle-login-pass');
            if (!input || !btn) return;
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            btn.innerHTML = showing
                ? '<i data-lucide="eye" class="w-4 h-4"></i>'
                : '<i data-lucide="eye-off" class="w-4 h-4"></i>';
            if (window.lucide) lucide.createIcons();
        };

        function setLoginButtonLoading(isLoading) {
            const btnSubmit = document.getElementById('btn-login-submit');
            const label = document.getElementById('btn-login-submit-text');
            if (!btnSubmit) return;
            btnSubmit.disabled = isLoading;
            btnSubmit.classList.toggle('opacity-80', isLoading);
            if (label) label.innerText = isLoading ? 'Memverifikasi...' : 'Masuk';
        }

        window.handleLogin = function(e) {
            if (e) e.preventDefault();
        
            const userIn = document.getElementById('login-username').value.trim().toLowerCase();
            const passIn = document.getElementById('login-password').value.trim();
            const btnSubmit = document.getElementById('btn-login-submit');
        
            if (!userIn || !passIn) {
                if (typeof toast === 'function') toast('Mohon masukkan username dan password Anda.', 'warning');
                else toast("Mohon masukkan username dan password Anda.");
                return;
            }
        
            setLoginButtonLoading(true);
        
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
                        
                            setLoginButtonLoading(false);
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
        
                                setLoginButtonLoading(false);
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
        
                    setLoginButtonLoading(false);
        
                    if (foundUser) {
                        if (foundUser.status !== "aktif") {
                            toast("Gagal masuk! Status akun Anda dinonaktifkan atau diblokir oleh Admin.");
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
                        toast("Username & Password tidak terdaftar atau salah!");
                    }
                })
                .catch((error) => {
                    console.error("Login Error: ", error);
                    toast("Terjadi gangguan koneksi ke server: " + error.message);
                    setLoginButtonLoading(false);
                });
        };
        window.changePassword = async function() {
            const newPassword = document.getElementById('new-password').value.trim();
            
            if (!newPassword) {
                toast("Mohon masukkan password baru!");
                return;
            }
            
            if (!userSession || !userSession.id) {
                toast("Sesi tidak ditemukan. Silakan login ulang.");
                return;
            }
        
            const ok = await showConfirm("Apakah Anda yakin ingin mengubah password Anda?");
            if (ok) {
                const dbRef = ref(db, 'users/' + userSession.id);
                
                update(dbRef, {
                    password: newPassword
                })
                .then(() => {
                    toast("Password berhasil diperbarui! Silakan login kembali untuk keamanan.");
                    document.getElementById('new-password').value = '';
                    performLogout(); 
                })
                .catch((error) => {
                    toast("Gagal mengubah password: " + error.message);
                });
            }
        };
        window.changeAdminLogin = async function() {
            const newUsername = document.getElementById('admin-username').value.trim().toLowerCase();
            const newPassword = document.getElementById('admin-password').value.trim();
        
            if (!newUsername || !newPassword) {
                toast("Mohon isi username dan password baru!");
                return;
            }
        
            if (!(await showConfirm("Yakin ingin mengubah username dan password akun ini?"))) return;
        
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
                    toast("Akun tidak dikenali.");
                    return;
                }
        
                toast("Username dan password berhasil diubah!");
                document.getElementById('admin-username').value = '';
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-current-username').value = newUsername;
                userSession.username = newUsername;
                localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
            } catch (err) {
                toast("Gagal mengubah login: " + err.message);
            }
        };

        window.changeKurirLogin = async function() {
            const newUsername = document.getElementById('new-username').value.trim().toLowerCase();
            const newPassword = document.getElementById('new-password').value.trim();
        
            if (!newUsername || !newPassword) {
                toast("Mohon isi username dan password baru!");
                return;
            }
        
            if (!userSession || !userSession.id || userSession.role !== 'kurir') {
                toast("Sesi kurir tidak ditemukan!");
                return;
            }
        
            const currentUser = cloudKurirList[userSession.id];
            if (!currentUser) {
                toast("Data kurir tidak ditemukan!");
                return;
            }
        
            const duplicate = Object.entries(cloudKurirList).some(([key, user]) => {
                return key !== userSession.id && (user.username || '').trim().toLowerCase() === newUsername;
            });
        
            if (duplicate) {
                toast("Username sudah dipakai kurir lain!");
                return;
            }
        
            if (!(await showConfirm("Yakin ingin mengubah username dan password kurir?"))) return;
        
            update(ref(db, `users/${userSession.id}`), {
                username: newUsername,
                password: newPassword
            })
            .then(() => {
                toast("Username dan password kurir berhasil diubah!");
                userSession.username = newUsername;
                localStorage.setItem('sahabatku_session', JSON.stringify(userSession));
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
            })
            .catch((error) => {
                toast("Gagal mengubah login kurir: " + error.message);
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
            const globalNav = document.getElementById('global-nav');
            const mainLayoutEl = document.getElementById('main-layout');
            // Bottom nav (Dashboard / + / Sistem) hanya untuk role kurir.
            // Admin (owner/manajemen) tidak menampilkan nav bawah sama sekali.
            const showKurirNav = userSession && userSession.role === 'kurir';

            [navDashboardBtn, navNotaBtn, navSistemBtn].forEach(btn => {
                if (!btn) return;
                if (showKurirNav) {
                    btn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                } else {
                    btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                }
            });

            if (globalNav) {
                if (showKurirNav) {
                    globalNav.classList.remove('hidden');
                } else {
                    globalNav.classList.add('hidden');
                }
            }
            if (mainLayoutEl) {
                mainLayoutEl.classList.toggle('pb-20', showKurirNav);
                mainLayoutEl.classList.toggle('pb-4', !showKurirNav);
            }
        
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
                'screen-admin-leader',
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

            // Reminder otomatis "belum input mitra" — hanya untuk kurir
            if (userSession && userSession.role === 'kurir') {
                if (typeof startMitraReminderWatcher === 'function') startMitraReminderWatcher();
            } else {
                if (typeof stopMitraReminderWatcher === 'function') stopMitraReminderWatcher();
            }
        
            navigateTo(targetDashboard);
        };

        function performLogout() {
            localStorage.removeItem('sahabatku_session');
            userSession = {};
            if (typeof stopMitraReminderWatcher === 'function') stopMitraReminderWatcher();
            
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

        window.handleLogout = async function() {
            const ok = await showConfirm("Apakah Anda yakin ingin keluar dari sistem Sahabatku Delivery?");
            if (ok) performLogout();
        }

        const SCREEN_META = {
            'screen-nota': { title: 'Buat Nota', icon: 'receipt' },
            'screen-preview': { title: 'Pratinjau Nota', icon: 'eye' },
            'screen-riwayat': { title: 'Riwayat Nota', icon: 'history' },
            'screen-rekap': { title: 'Rekap Kerja', icon: 'bar-chart-4' },
            'screen-statistik': { title: 'Statistik & Peringkat', icon: 'trending-up' },
            'screen-mitra': { title: 'Mitra & Transaksi', icon: 'store' },
            'screen-ongkir': { title: 'Cek Ongkir', icon: 'route' },
            'screen-pengaturan': { title: 'Pengaturan', icon: 'settings-2' },
            'screen-admin-kurir': { title: 'Data Akun Kurir', icon: 'users' },
            'screen-admin-manajemen': { title: 'Manajemen', icon: 'users-round' },
            'screen-admin-leader': { title: 'Leader & Penilaian', icon: 'crown' },
            'screen-admin-nota': { title: 'Semua Nota Kurir', icon: 'file-spreadsheet' },
            'screen-admin-mitra': { title: 'Kelola Mitra', icon: 'store' },
            'screen-admin-laporan': { title: 'Laporan', icon: 'file-down' },
            'screen-admin-tracking': { title: 'Tracking Kurir', icon: 'map-pin' },
            'screen-admin-kpi': { title: 'KPI & Penghargaan', icon: 'trophy' },
            'screen-admin-absensi': { title: 'Absensi', icon: 'calendar-check' },
            'screen-admin-ongkir': { title: 'Wilayah Ongkir', icon: 'route' },
            'screen-admin-order-deposit': { title: 'Input Deposit', icon: 'clipboard-list' },
            'screen-admin-testimonial': { title: 'Testimoni Customer', icon: 'message-circle-more' },
            'screen-admin-notifikasi': { title: 'Kirim Notifikasi', icon: 'bell-ring' }
        };
        function applyAppBarMeta(screenId) {
            const appBarTitle = document.getElementById('app-bar-title');
            const appBarIcon = document.getElementById('app-bar-icon');
            const meta = SCREEN_META[screenId] || { title: screenId.replace('screen-', '').replace(/-/g, ' ').toUpperCase(), icon: 'layout-grid' };
            if (appBarTitle) appBarTitle.innerText = meta.title;
            if (appBarIcon) appBarIcon.setAttribute('data-lucide', meta.icon);
            if (window.lucide) lucide.createIcons();
        }

        window.navigateTo = function(screenId) {
            if (screenId === 'screen-nota' && (!userSession || userSession.role !== 'kurir')) {
                toast('Menu Nota hanya untuk login kurir.');
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
            if (screenId === 'screen-admin-order-deposit') {
                setTimeout(() => {
                    initOrderDepositModule();
                }, 100);
            }

            if (screenId === 'screen-admin-notifikasi') {
                setTimeout(() => {
                    populateNotifKurirList();
                    const senderLabelEl = document.getElementById('notif-sender-label');
                    if (senderLabelEl) senderLabelEl.innerText = getSenderInfo().senderLabel;
                }, 100);
            }
            
            if (screenId === 'screen-admin-kpi') {
                setTimeout(() => {
                    const bulanEl = document.getElementById('kpi-filter-bulan');
                    if (bulanEl && !bulanEl.value) bulanEl.value = getWibRawDate().slice(0, 7);
                    renderKPISection(currentKPISection);
                }, 100);
            }
            if (screenId === 'screen-admin-leader') {
                setTimeout(() => {
                    if (typeof populateAnggotaDropdownLeader === 'function') populateAnggotaDropdownLeader();
                    if (typeof renderLeaderList === 'function') renderLeaderList();
                }, 100);
            }
            if (screenId === 'screen-statistik') {
                setTimeout(() => {
                    if (typeof renderStatistikKurir === 'function') renderStatistikKurir();
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
                    applyAppBarMeta(screenId);
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
                        applyAppBarMeta(prev);
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
                toast('Mohon lengkapi seluruh form akun kurir!');
                return;
            }
        
            if (leader && !isLeaderExist(leader)) {
                toast('Leader yang dipilih belum ada di data leader!');
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
                    toast(`Username "${username}" sudah terdaftar! Gunakan username yang berbeda.`);
                    return;
                }
        
                targetRef = push(ref(db, 'users'));
            }
        
            set(targetRef, userData)
                .then(() => {
                    toast('Akun kurir berhasil disimpan!');
                    resetFormKurir();
                })
                .catch((error) => {
                    console.error("Error saving to Firebase:", error);
                    toast('Gagal menyimpan data: ' + error.message);
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
        
            if (!id) return toast('Data kurir tidak ditemukan!');
            if (!nama || !username || !password || !tglGabung) return toast('Lengkapi semua data kurir!');
        
            if (leader && !isLeaderExist(leader)) {
                toast('Leader yang dipilih belum ada di data leader!');
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
                toast('Data kurir berhasil diperbarui!');
                closeEditKurirModal();
            }).catch(err => {
                toast('Gagal update kurir: ' + err.message);
            });
        };

        window.hapusAkunKurir = async function(key) {
            const ok = await showConfirm("Apakah Anda yakin ingin menghapus akun kurir ini secara permanen dari database?");
            if (ok) {
                remove(ref(db, `users/${key}`))
                .then(() => toast("Akun kurir berhasil dihapus."))
                .catch(err => toast("Gagal menghapus: " + err.message));
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

            const totalOffGabungan = (item.totalOff || 0) + (item.totalIzin || 0) + (item.totalSakit || 0);
            const rank = data.findIndex(x => x.id === idKurir) + 1;

            container.innerHTML = `
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-lg font-black truncate">${item.nama}</div>
                            <div class="text-xs text-slate-500">Leader: ${item.leader || '-'}</div>
                            <div class="text-[10px] text-slate-400 mt-1">Peringkat: #${rank || '-'}</div>
                        </div>
                        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${badge.bg} text-white text-[10px] font-black shrink-0">
                            ${badge.emoji} ${badge.label}
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border">
                        <div class="text-[10px] text-slate-400 uppercase">Kehadiran</div>
                        <div class="font-black mt-1">${item.hadir}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.kehadiranScore.toFixed(1)} poin</div>
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
                        <div class="font-black mt-1">${totalOffGabungan}</div>
                        <div class="text-[10px] text-slate-400 mt-1">${item.offScore.toFixed(1)} poin</div>
                        <div class="text-[10px] text-slate-500 mt-1">Normal maksimal 3/bulan</div>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    <div class="text-[10px] uppercase tracking-wider opacity-80">Total Rating</div>
                    <div class="text-3xl font-black mt-1">${item.rating.toFixed(1)}%</div>
                </div>

                <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border text-xs space-y-2">
                    <div class="font-bold text-slate-700 dark:text-slate-200">Ringkasan Ranking</div>
                    <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>Ranking: <b>#${rank || '-'}</b></div>
                        <div>Status: <b>${badge.label}</b></div>
                        <div>Nota: <b>${item.totalNota}</b></div>
                        <div>Penghasilan: <b>Rp ${item.totalPenghasilan.toLocaleString('id-ID')}</b></div>
                    </div>
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
                toast('Password ongkir tidak boleh kosong!');
                return;
            }
        
            update(ref(db, `users/${key}`), {
                ongkirPassword: passwordOngkir
            }).then(() => {
                toast('Password ongkir berhasil disimpan!');
            });
        };
        
        window.toggleOngkirAkses = function(key) {
            const item = cloudKurirList[key];
            if (!item) return;
        
            const newStatus = !item.ongkirLocked;
        
            update(ref(db, `users/${key}`), {
                ongkirLocked: newStatus
            }).then(() => {
                toast(newStatus ? 'Akses ongkir dikunci.' : 'Akses ongkir dibuka.');
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
        window.hapusNotaGlobal = async function(key) {
            const ok = await showConfirm("Hapus nota ini secara permanen dari server cloud?");
            if (ok) {
                const n = cloudNotaList?.[key];
                const notaId = n?.id;

                // hapus nota dulu
                remove(ref(db, `nota/${key}`)).then(() => {
                    // ikut hapus ongkir history per nota
                    if (notaId) remove(ref(db, `ongkir_history/${notaId}`)).catch(() => {});
                    toast('Nota dan history ongkir ikut terhapus!');
                }).catch(err => {
                    toast('Gagal hapus nota: ' + err.message);
                });
            }
        };
        window.hapusSemuaNotaTersaring = async function() {
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
                toast('Tidak ada nota sesuai filter untuk dihapus.');
                return;
            }
        
            if (!(await showConfirm(`Yakin hapus ${hasil.length} nota sesuai filter ini?`))) return;
        
            hasil.forEach(([key]) => {
                remove(ref(db, `nota/${key}`));
            });
        
            toast('Nota sesuai filter sedang dihapus.');
        };
        window.viewAdminNota = function(key) {
            const n = cloudNotaList[key];
            const modalCanvas = document.getElementById('canvas-nota-admin');
            if (!n || !modalCanvas) return;
            invalidateNotaCanvasCache('canvas-nota-admin'); // isi nota berganti, canvas lama tidak valid lagi

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

            const jumlahItemAdmin = (n.items && Array.isArray(n.items)) ? n.items.length : 0;

            modalCanvas.innerHTML = `
                <div class="receipt-head">
                    <h3 class="font-extrabold text-sm tracking-wide">SAHABATKU DELIVERY</h3>
                    <p class="text-[9px] text-white/80 mt-0.5">Jatibarang, Indramayu</p>
                </div>

                <div class="receipt-body">
                    <div class="receipt-info-grid text-[10px]">
                        <div><span class="ri-label">Nomor Nota</span><span class="ri-value">${n.id || '-'}</span></div>
                        <div><span class="ri-label">Tanggal</span><span class="ri-value">${n.tanggal || '-'}</span></div>
                        <div><span class="ri-label">Kurir</span><span class="ri-value">${n.kurirNama || '-'}</span></div>
                        <div><span class="ri-label">Status</span><span class="receipt-status-pill">${n.status || '-'}</span></div>
                    </div>

                    <div class="receipt-section-title">
                        <span class="rst-label">Rincian Pesanan</span>
                        <span class="rst-count">${jumlahItemAdmin} item</span>
                    </div>
                    <table class="receipt-item-table text-[11px] text-left">
                        <thead>
                            <tr>
                                <th class="text-left">Item</th>
                                <th class="text-center">Qty</th>
                                <th class="text-right">Harga</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows || `<tr><td colspan="4" class="text-center italic text-slate-400 py-2">- Tidak ada rincian -</td></tr>`}
                        </tbody>
                    </table>

                    <div class="receipt-divider"></div>
                    <div class="text-[11px] space-y-1">
                        <div class="flex justify-between text-slate-500"><span>Subtotal Item</span><span>${(n.subtotal || 0).toLocaleString('id-ID')}</span></div>
                        <div class="flex justify-between text-slate-500"><span>Ongkir</span><span>${(n.ongkir || 0).toLocaleString('id-ID')}</span></div>
                        <div class="flex justify-between text-slate-500"><span>Tambahan Biaya</span><span>${totalBiaya.toLocaleString('id-ID')}</span></div>
                        ${rincianBiaya ? `<div id="p-rincian-biaya-list" class="pl-2 space-y-0.5 text-[10px] text-slate-400">${rincianBiaya}</div>` : ''}
                    </div>

                    <div class="receipt-total-box mt-2.5">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-white/70">Total</span>
                        <span class="text-base font-black">${(n.total || 0).toLocaleString('id-ID')}</span>
                    </div>

                    <!-- Ongkir History -->
                    <div class="receipt-divider"></div>
                    <div class="text-[10px] space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400 font-bold uppercase">Ongkir History</span>
                            <span id="p-ongkir-history-count" class="text-slate-400">-</span>
                        </div>
                        <div id="p-ongkir-history-container" class="space-y-1"></div>
                    </div>

                    <div class="receipt-divider"></div>
                    <div class="text-center space-y-1">
                        <p class="text-[10px] text-slate-400 italic">Terima kasih telah menggunakan jasa Sahabatku Delivery.</p>
                        <p class="text-[10px] font-medium text-slate-600">
                            Pastikan Selalu Order Melalui WhatsApp Resmi Kami:<br>
                            <span class="text-primary font-bold text-xs">0821-1845-415</span>
                        </p>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();

            // RESET isi history (biar nggak nyangkut dari nota sebelumnya)
            const box = document.getElementById('p-ongkir-history-container');
            const countEl = document.getElementById('p-ongkir-history-count');
            if (!box || !countEl) return;

            box.innerHTML = '';
            countEl.innerText = '-';

            const histories = Array.isArray(n.ongkir_history) ? n.ongkir_history : [];
            const sorted = histories
                .slice()
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            // Data terstruktur buat gambar nota (canvas), terpisah dari HTML preview di atas.
            adminNotaPreviewData = {
                notaNum: n.id || '-',
                tanggal: n.tanggal || '-',
                kurir: n.kurirNama || '-',
                status: n.status || '-',
                items: Array.isArray(n.items) ? n.items.map(it => ({ nama: it.nama, qty: it.qty, harga: it.harga || 0, subtotal: it.subtotal || 0 })) : [],
                subtotal: n.subtotal || 0,
                ongkir: n.ongkir || 0,
                biayaList: Array.isArray(n.biayaTambahan) ? n.biayaTambahan.map(b => ({ nama: b.nama, nominal: b.nominal || 0 })) : [],
                total: n.total || 0,
                history: sorted.map(e => ({
                    asal: e.asal || '-',
                    tujuan: e.tujuan || '-',
                    val: parseInt(e.estimasiOngkir || e.ongkir || 0) || 0,
                    tgl: e.createdAt ? new Date(e.createdAt).toLocaleString('id-ID') : (e.tglRaw || '-')
                }))
            };
            // Siapkan canvas-nya di background begitu preview admin tampil, biar pas
            // tombol Unduh Gambar/Bagikan WhatsApp ditekan prosesnya sudah instan.
            requestAnimationFrame(() => { getNotaCanvas('canvas-nota-admin', adminNotaPreviewData).catch(() => {}); });

            if (!sorted.length) {
                box.innerHTML = `<div class="text-center text-slate-400 italic py-1">Belum ada history ongkir.</div>`;
                countEl.innerText = '0';
                document.getElementById('modal-preview-nota').classList.remove('hidden');
                return;
            }

            countEl.innerText = `${sorted.length} item`;
            box.innerHTML = sorted.map(e => {
                const asal = e.asal || '-';
                const tujuan = e.tujuan || '-';
                const val = parseInt(e.estimasiOngkir || e.ongkir || 0) || 0;
                const tgl = e.createdAt ? new Date(e.createdAt).toLocaleString('id-ID') : (e.tglRaw || '-');

                return `
                    <div class="bg-slate-50 dark:bg-darkBg p-2 rounded-lg border border-slate-200/70">
                        <div class="flex justify-between gap-2">
                            <div class="min-w-0">
                                <div class="font-bold text-[10px] text-slate-700 truncate">${asal} → ${tujuan}</div>
                                <div class="text-[9px] text-slate-400">${tgl}</div>
                            </div>
                            <div class="font-extrabold text-[10px] text-primary shrink-0">Rp ${val.toLocaleString('id-ID')}</div>
                        </div>
                    </div>
                `;
            }).join('');

            document.getElementById('modal-preview-nota').classList.remove('hidden');
        };
        window.closeAdminModal = function() {
            document.getElementById('modal-preview-nota').classList.add('hidden');
        }
        window.downloadAdminNotaJpg = function() {
            if (!adminNotaPreviewData) { toast('Preview nota belum siap.'); return; }
            processNotaImage('canvas-nota-admin', adminNotaPreviewData, {
                mode: 'download',
                btn: document.getElementById('btn-unduh-admin'),
                successMsg: 'Gambar nota berhasil diunduh!'
            });
        }
        window.shareWhatsAppAdmin = function() {
            if (!adminNotaPreviewData) { toast('Preview nota belum siap.'); return; }
            processNotaImage('canvas-nota-admin', adminNotaPreviewData, {
                mode: 'share',
                btn: document.getElementById('btn-share-wa-admin')
            });
        }
        window.saveDataMitra = function() {
            const idEdit = document.getElementById('am-id-edit').value;
            const nama = document.getElementById('am-nama').value.trim();
            const alamat = document.getElementById('am-alamat').value.trim();
            const hp = document.getElementById('am-hp').value.trim();
            const target = parseInt(document.getElementById('am-target').value) || 0;

            if(!nama || !alamat || !hp || target <= 0) {
                toast("Lengkapi seluruh form mitra!");
                return;
            }

            const payload = { nama, alamat, hp, target };

            if(idEdit) {
                update(ref(db, `mitra/${idEdit}`), payload).then(() => { toast("Mitra berhasil di-update!"); resetFormMitra(); });
            } else {
                push(ref(db, 'mitra'), payload).then(() => { toast("Mitra baru sukses ditambahkan!"); resetFormMitra(); });
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
        
            if (!id) return toast('Data mitra tidak ditemukan!');
            if (!nama || !alamat || !hp || target <= 0) return toast('Lengkapi semua data mitra!');
        
            update(ref(db, `mitra/${id}`), {
                nama,
                alamat,
                hp,
                target
            }).then(() => {
                toast('Data mitra berhasil diperbarui!');
                closeEditMitraModal();
            }).catch(err => {
                toast('Gagal update mitra: ' + err.message);
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
        window.hapusMitra = async function(key) {
            const ok = await showConfirm("Hapus mitra ini beserta seluruh data record?");
            if (ok) {
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
        window.hapusLogMitra = async function(key) {
            const ok = await showConfirm('Hapus riwayat transaksi input ini?');
            if (ok) {
                remove(ref(db, `log_mitra/${key}`)).then(() => {
                    toast('Riwayat transaksi dihapus', 'success');
                    // Refresh list tanpa tutup popup
                    renderAdminLogMitra();
                }).catch(err => {
                    toast('Gagal hapus riwayat: ' + err.message);
                });
            }
        };
        function getMapsLink(alamat) {
            const v = (alamat || '').trim();
            if (!v) return '#';
            if (/^https?:\/\/(www\.)?google\./i.test(v) || /^https?:\/\/maps\.app\.goo\.gl\//i.test(v)) {
                return v;
            }
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
        }

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
                    <div id="container-admin-daftar-mitra-inner" class="${isOpen ? '' : 'hidden'} space-y-2"></div>
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
                    const mapsLink = getMapsLink(m.alamat);

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
                                <button onclick="bukaInputTransaksiMitra('${m.nama.replace(/'/g, "\\'")}')" class="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase">Input Trx</button>
                                <button onclick="lihatRiwayatMitraOtomatis('${m.nama.replace(/'/g, "\\'")}')" class="py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-[10px] uppercase border border-slate-200/50">Lihat</button>
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
        window.toggleTestimonialSelectMode = function() {
            const active = document.body.dataset.testimonialSelectMode === '1';
            document.body.dataset.testimonialSelectMode = active ? '0' : '1';
            
            if (document.body.dataset.testimonialSelectMode === '1') {
                const checkboxes = document.querySelectorAll('.testimonial-checkbox');
                checkboxes.forEach(cb => cb.checked = false);
            }
            
            renderAdminTestimonial();
        };
        window.hapusSemuaTestimonialBulan = async function() {
            const bulanFilter = document.getElementById('testimonial-filter-bulan')?.value || '';
            if (!bulanFilter) return toast('Pilih bulan terlebih dahulu.');

            const keys = Object.keys(cloudTestimonialList || {}).filter(key => {
                const t = cloudTestimonialList[key];
                if (!t) return false;
                const rawBulan = t.timestamp ? new Date(t.timestamp).toISOString().slice(0, 7) : (t.date ? t.date.split('/').reverse().join('-').slice(0, 7) : '');
                return rawBulan === bulanFilter;
            });

            if (!keys.length) return toast('Tidak ada testimoni pada bulan ini.');
            if (!(await showConfirm(`Hapus semua ${keys.length} testimoni pada bulan ini?`))) return;

            keys.forEach(key => remove(ref(db, `testimonials/${key}`)));
            
            toast('Testimoni sedang dihapus...');
            
            setTimeout(() => {
                renderAdminTestimonial();
            }, 800);
        };
        window.hapusTestimonialPilihan = async function() {
            const checkboxes = document.querySelectorAll('.testimonial-checkbox:checked');
            if (!checkboxes.length) {
                toast('Pilih minimal 1 testimoni untuk dihapus!');
                return;
            }

            const jumlah = checkboxes.length;
            const konfirmasi = await showConfirm(`Apakah Anda YAKIN ingin menghapus ${jumlah} testimoni yang dipilih? Tindakan ini TIDAK BISA DIBATALKAN!`);
            
            if (!konfirmasi) {
                toast('Penghapusan dibatalkan. Data testimoni aman.');
                return;
            }

            const konfirmasi2 = await showConfirm(`Hapus ${jumlah} testimoni secara PERMANEN?`, { okText: 'Ya, Hapus Permanen' });
            if (!konfirmasi2) {
                toast('Penghapusan dibatalkan. Data testimoni aman.');
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

            toast(`${jumlah} testimoni sedang dihapus dari server...`);
            
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
                toast(item.isPublished ? 'Testimoni disembunyikan.' : 'Testimoni ditampilkan.');
            }).catch(err => {
                toast('Gagal update testimoni: ' + err.message);
            });
        };

        window.hapusTestimonial = async function(key) {
            const ok = await showConfirm('Hapus testimoni ini secara permanen?');
            if (ok) {
                remove(ref(db, `testimonials/${key}`))
                    .then(() => toast('Testimoni berhasil dihapus.'))
                    .catch(err => toast('Gagal menghapus testimoni: ' + err.message));
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
        function getSaldoKurirRaw(userId, username) {
            const user = cloudKurirList?.[userId];
            return parseInt(user?.depositSaldo || 0) || 0;
        }

        function setSaldoKurirRaw(userId, username, value) {
            const v = Math.max(0, parseInt(value) || 0);
            if (userId) cloudDepositBalance[userId] = v;
            if (username) cloudDepositBalance[username] = v;
        }

        function getSaldoKurirDisplay(userId, username) {
            const user = cloudKurirList?.[userId];
            const saldo = parseInt(user?.depositSaldo || 0) || 0;
            const usage = parseInt(cloudNotaHabisCounter?.[userId] || 0) || 0;

            const kanan = saldo > 0 ? String(Math.ceil(saldo / 1000)).padStart(2, '0') : '-';
            const kiri = String(usage).padStart(2, '0');

            return `${kiri}/${kanan}`;
        }
        function getPotonganKurirKoin(nota) {
            const parseNominal = (val) => parseInt((val || '').toString().replace(/[^0-9]/g, '')) || 0;
            const ongkir = parseNominal(nota?.ongkir);
            const tambahan = Array.isArray(nota?.biayaTambahan) ? nota.biayaTambahan : [];
            const totalAcuan = ongkir + tambahan.reduce((a, b) => a + parseNominal(b?.nominal), 0);

            if (totalAcuan <= 0) return 0;
            return Math.max(1, Math.ceil(totalAcuan / 10000));
        }

        function getNotaHabisCount(userId) {
            return parseInt(cloudNotaHabisCounter?.[userId] || 0) || 0;
        }

        function setNotaHabisCount(userId, value) {
            cloudNotaHabisCounter[userId] = Math.max(0, parseInt(value) || 0);
        }
        function restoreSaldoKurirFromNota(userId, username, nota) {
            const potong = getPotonganKurirKoin(nota) * 1000;
            const saldoSekarang = getSaldoKurirRaw(userId, username);
            const saldoBaru = saldoSekarang + potong;

            update(ref(db, `users/${userId}`), {
                depositSaldo: saldoBaru,
                depositUpdatedAt: new Date().toISOString()
            });

            return saldoBaru;
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
                toast("Wajib mengisi Ongkir untuk melanjutkan!"); 
                return; 
            }
            invalidateNotaCanvasCache('canvas-nota'); // isi nota berganti, canvas lama tidak valid lagi
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
            const itemCountEl = document.getElementById('p-item-count');
            if (itemCountEl) itemCountEl.innerText = `${notaState.items.length} item`;
            const btnSimpanNota = document.getElementById('btn-simpan-nota');
            if (btnSimpanNota) btnSimpanNota.classList.remove('hidden');
            updatePreviewButtonsLayout();

            // Data terstruktur buat gambar nota (canvas), terpisah dari HTML preview di atas.
            kurirNotaPreviewData = {
                notaNum: document.getElementById('dash-next-nota') ? document.getElementById('dash-next-nota').innerText : (document.getElementById('p-nota-num').innerText || 'Nota'),
                tanggal: tgl.toLocaleString('id-ID'),
                kurir: userSession.nama,
                status: document.getElementById('nota-status').value,
                items: notaState.items.map(it => ({ nama: it.nama, qty: it.qty, harga: it.harga, subtotal: it.subtotal })),
                subtotal: notaState.subtotal,
                ongkir: notaState.ongkir,
                biayaList: notaState.biaya.map(b => ({ nama: b.nama, nominal: b.nominal })),
                total: notaState.total,
                history: null
            };
            // Siapkan canvas-nya di background begitu preview tampil, biar pas tombol
            // Simpan Gambar/Bagikan WhatsApp ditekan, prosesnya sudah instan (dari cache).
            requestAnimationFrame(() => { getNotaCanvas('canvas-nota', kurirNotaPreviewData).catch(() => {}); });

            navigateTo('screen-preview');
        }
        // ============================================================
        // GAMBAR NOTA — digambar LANGSUNG ke <canvas> (Canvas 2D API),
        // BUKAN screenshot dari DOM (html2canvas sudah tidak dipakai lagi).
        // ------------------------------------------------------------
        // html2canvas harus meng-clone seluruh DOM nota, menghitung ulang semua
        // CSS (gradient, shadow, border-radius, font, dst), menunggu font/gambar,
        // baru "melukis" hasilnya ke canvas piksel demi piksel — proses inilah
        // yang bikin lambat/lag di HP RAM kecil, walau CSS-nya sudah diringankan.
        // Dengan menggambar LANGSUNG dari data nota (persegi + teks + garis),
        // tidak ada DOM yang di-clone/dihitung ulang sama sekali, jadi proses
        // simpan gambar / bagikan WhatsApp jadi cepat & konsisten di HP apapun.
        // ============================================================
        const NOTA_FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
        function notaFmtRp(n) { return (Math.round(n) || 0).toLocaleString('id-ID'); }

        function notaRoundRectPath(ctx, x, y, w, h, r) {
            const rr = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
            ctx.beginPath();
            ctx.moveTo(x + rr.tl, y);
            ctx.lineTo(x + w - rr.tr, y);
            ctx.arcTo(x + w, y, x + w, y + rr.tr, rr.tr);
            ctx.lineTo(x + w, y + h - rr.br);
            ctx.arcTo(x + w, y + h, x + w - rr.br, y + h, rr.br);
            ctx.lineTo(x + rr.bl, y + h);
            ctx.arcTo(x, y + h, x, y + h - rr.bl, rr.bl);
            ctx.lineTo(x, y + rr.tl);
            ctx.arcTo(x, y, x + rr.tl, y, rr.tl);
            ctx.closePath();
        }
        function notaFillRoundRect(ctx, x, y, w, h, r, fill) {
            notaRoundRectPath(ctx, x, y, w, h, r);
            ctx.fillStyle = fill;
            ctx.fill();
        }
        function notaTruncateText(ctx, text, maxWidth) {
            text = String(text == null ? '' : text);
            if (ctx.measureText(text).width <= maxWidth) return text;
            let lo = 0, hi = text.length;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid; else hi = mid - 1;
            }
            return lo <= 0 ? '…' : text.slice(0, lo) + '…';
        }
        function notaText(ctx, text, x, y, opts) {
            ctx.font = opts.font;
            ctx.fillStyle = opts.color;
            ctx.textAlign = opts.align || 'left';
            ctx.textBaseline = 'middle';
            const t = opts.maxWidth ? notaTruncateText(ctx, text, opts.maxWidth) : String(text == null ? '' : text);
            ctx.fillText(t, x, y);
        }
        // Font "Inter" sudah dimuat sejak awal halaman (dipakai di seluruh UI),
        // jadi biasanya sudah siap sebelum layar nota dibuka. Kalau ternyata
        // belum, tunggu MAKSIMAL 250ms saja lalu tetap lanjut (fallback ke font
        // sistem) — supaya proses generate gambar tidak pernah ikut "nge-lag".
        async function ensureNotaFontReady() {
            try {
                if (!(document.fonts && document.fonts.check)) return;
                if (document.fonts.check("800 16px 'Inter'")) return;
                await Promise.race([
                    document.fonts.ready,
                    new Promise((resolve) => setTimeout(resolve, 250))
                ]);
            } catch (e) { /* abaikan, fallback ke font sistem */ }
        }

        function buildNotaLayout(data, S) {
            const u = (v) => Math.round(v * S);
            const items = (data.items && data.items.length) ? data.items : null;
            const biayaList = data.biayaList || [];
            const history = data.history; // null/undefined = nota kurir (tanpa section history)

            const L = {
                u, S,
                MARGIN: u(14), CARD_W: u(692), HEADER_H: u(116),
                INFO_OVERLAP: u(30), INFO_PAD: u(16), INFO_ROW_H: u(38), INFO_ROW_GAP: u(12),
                SECTION_GAP: u(18), SECTION_TITLE_H: u(22),
                TABLE_HEAD_H: u(26), TABLE_ROW_H: u(30),
                DIV_GAP: u(13), TOTALS_ROW_H: u(20), BIAYA_ROW_H: u(16),
                TOTALBOX_MARGIN_TOP: u(10), TOTALBOX_H: u(46), FOOTER_H: u(66),
                CARD_PAD_X: u(16), BOTTOM_PAD: u(16),
                HIST_ROW_H: u(40), HIST_ROW_GAP: u(6), HIST_HEAD_H: u(26),
                items, biayaList, history
            };
            L.INFO_GRID_H = L.INFO_PAD * 2 + L.INFO_ROW_H * 2 + L.INFO_ROW_GAP;

            let y = L.MARGIN;
            L.cardTop = y;
            L.headerTop = y;
            y += L.HEADER_H;
            L.infoGridTop = y - L.INFO_OVERLAP;
            y = L.infoGridTop + L.INFO_GRID_H;
            y += L.SECTION_GAP;
            L.sectionTitleTop = y;
            y += L.SECTION_TITLE_H;
            L.tableTop = y;
            y += L.TABLE_HEAD_H;
            L.tableRowsTop = y;
            y += L.TABLE_ROW_H * (items ? items.length : 1);
            y += L.DIV_GAP; L.divider1Y = y; y += L.DIV_GAP;
            L.totalsTop = y;
            y += L.TOTALS_ROW_H * 3;
            y += L.BIAYA_ROW_H * biayaList.length;
            y += L.TOTALBOX_MARGIN_TOP;
            L.totalBoxTop = y;
            y += L.TOTALBOX_H;
            y += L.DIV_GAP; L.divider2Y = y; y += L.DIV_GAP;
            L.footerTop = y;
            y += L.FOOTER_H;

            if (history) {
                y += L.DIV_GAP; L.divider3Y = y; y += L.DIV_GAP;
                L.historyTop = y;
                y += L.HIST_HEAD_H;
                L.historyRowsTop = y;
                const hRows = history.length ? history.length : 1;
                y += L.HIST_ROW_H * hRows + L.HIST_ROW_GAP * Math.max(0, hRows - 1);
            }

            y += L.BOTTOM_PAD;
            L.cardBottom = y;
            L.cardH = L.cardBottom - L.cardTop;
            L.canvasW = L.CARD_W + L.MARGIN * 2;
            L.canvasH = y + L.MARGIN;
            return L;
        }

        function drawNotaOnCanvas(canvas, data, S) {
            const L = buildNotaLayout(data, S);
            canvas.width = L.canvasW;
            canvas.height = L.canvasH;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cardX = L.MARGIN, cardW = L.CARD_W, u = L.u;

            // "Shadow" solid tanpa blur (BUKAN ctx.shadowBlur). shadowBlur di Canvas
            // 2D itu operasi GPU yang harus me-raster area blur secara terpisah —
            // di GPU low-end/HP RAM kecil, untuk canvas yang TINGGI (nota dengan
            // banyak item/history), ini yang menyebabkan hasil gambar jadi
            // korup/bergaris-garis (glitch). Diganti kotak solid sedikit offset di
            // belakang kartu — tetap kelihatan "melayang" tipis tapi 100% aman &
            // konsisten di semua HP, karena tidak ada operasi blur sama sekali.
            notaFillRoundRect(ctx, cardX, L.cardTop + u(3), cardW, L.cardH, u(16), 'rgba(15,23,42,0.10)');
            notaFillRoundRect(ctx, cardX, L.cardTop, cardW, L.cardH, u(16), '#ffffff');

            notaRoundRectPath(ctx, cardX, L.cardTop, cardW, L.cardH, u(16));
            ctx.save();
            ctx.clip();

            // Header gradient
            const grad = ctx.createLinearGradient(cardX, L.headerTop, cardX + cardW, L.headerTop + L.HEADER_H);
            grad.addColorStop(0, '#0058E6');
            grad.addColorStop(1, '#14A0FF');
            ctx.fillStyle = grad;
            ctx.fillRect(cardX, L.headerTop, cardW, L.HEADER_H);
            notaText(ctx, 'SAHABATKU DELIVERY', cardX + cardW / 2, L.headerTop + u(40), { font: `800 ${u(19)}px ${NOTA_FONT}`, color: '#ffffff', align: 'center' });
            notaText(ctx, 'Jatibarang, Indramayu', cardX + cardW / 2, L.headerTop + u(64), { font: `500 ${u(12)}px ${NOTA_FONT}`, color: 'rgba(255,255,255,0.85)', align: 'center' });

            // Info grid (overlap header, seperti desain aslinya)
            const gx = cardX + u(16), gw = cardW - u(32);
            const infoGrad = ctx.createLinearGradient(0, L.infoGridTop, 0, L.infoGridTop + L.INFO_GRID_H);
            infoGrad.addColorStop(0, '#f8fafc');
            infoGrad.addColorStop(1, '#f1f5f9');
            notaFillRoundRect(ctx, gx, L.infoGridTop, gw, L.INFO_GRID_H, u(14), infoGrad);
            const colW = (gw - u(12)) / 2;
            const cell = (col, row, label, value, isPill) => {
                const cx = gx + L.INFO_PAD + col * (colW + u(12));
                const cyLabel = L.infoGridTop + L.INFO_PAD + row * (L.INFO_ROW_H + L.INFO_ROW_GAP) + u(10);
                const cyValue = cyLabel + u(15);
                notaText(ctx, String(label).toUpperCase(), cx, cyLabel, { font: `800 ${u(8.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left' });
                if (isPill) {
                    const pillText = String(value || '-').toUpperCase();
                    ctx.font = `800 ${u(9.5)}px ${NOTA_FONT}`;
                    const pillW = ctx.measureText(pillText).width + u(18), pillH = u(18);
                    notaFillRoundRect(ctx, cx, cyValue - pillH / 2, pillW, pillH, pillH / 2, 'rgba(0,102,255,0.12)');
                    notaText(ctx, pillText, cx + pillW / 2, cyValue + u(1), { font: `800 ${u(9.5)}px ${NOTA_FONT}`, color: '#0066FF', align: 'center' });
                } else {
                    notaText(ctx, value || '-', cx, cyValue, { font: `800 ${u(11)}px ${NOTA_FONT}`, color: '#1e293b', align: 'left', maxWidth: colW });
                }
            };
            cell(0, 0, 'Nomor Nota', data.notaNum);
            cell(1, 0, 'Tanggal', data.tanggal);
            cell(0, 1, 'Kurir', data.kurir);
            cell(1, 1, 'Status', data.status, true);

            // Judul section + badge jumlah item
            notaText(ctx, 'RINCIAN PESANAN', cardX + L.CARD_PAD_X, L.sectionTitleTop + L.SECTION_TITLE_H / 2, { font: `800 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left' });
            const countText = `${L.items ? L.items.length : 0} ITEM`;
            ctx.font = `800 ${u(9)}px ${NOTA_FONT}`;
            const countW = ctx.measureText(countText).width + u(14);
            notaFillRoundRect(ctx, cardX + cardW - L.CARD_PAD_X - countW, L.sectionTitleTop, countW, u(17), u(9), 'rgba(0,102,255,0.1)');
            notaText(ctx, countText, cardX + cardW - L.CARD_PAD_X - countW / 2, L.sectionTitleTop + u(9), { font: `800 ${u(9)}px ${NOTA_FONT}`, color: '#0066FF', align: 'center' });

            // Tabel rincian
            const tX = cardX + L.CARD_PAD_X, tW = cardW - L.CARD_PAD_X * 2;
            const col1 = tX, col2 = tX + tW * 0.42, col3 = tX + tW * 0.68, col4 = tX + tW;
            const headY = L.tableTop + L.TABLE_HEAD_H / 2;
            notaText(ctx, 'ITEM', col1, headY, { font: `800 ${u(8.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left' });
            notaText(ctx, 'QTY', (col2 + col3) / 2, headY, { font: `800 ${u(8.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'center' });
            notaText(ctx, 'HARGA', col3, headY, { font: `800 ${u(8.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'right' });
            notaText(ctx, 'TOTAL', col4, headY, { font: `800 ${u(8.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'right' });
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = u(1);
            ctx.beginPath(); ctx.moveTo(tX, L.tableTop + L.TABLE_HEAD_H); ctx.lineTo(tX + tW, L.tableTop + L.TABLE_HEAD_H); ctx.stroke();

            if (L.items) {
                L.items.forEach((it, i) => {
                    const rowY = L.tableRowsTop + i * L.TABLE_ROW_H;
                    if (i % 2 === 0) notaFillRoundRect(ctx, tX, rowY + u(2), tW, L.TABLE_ROW_H - u(4), u(6), '#f8fafc');
                    const midY = rowY + L.TABLE_ROW_H / 2;
                    notaText(ctx, it.nama, col1, midY, { font: `700 ${u(10.5)}px ${NOTA_FONT}`, color: '#334155', align: 'left', maxWidth: tW * 0.4 });
                    notaText(ctx, String(it.qty), (col2 + col3) / 2, midY, { font: `500 ${u(10.5)}px ${NOTA_FONT}`, color: '#334155', align: 'center' });
                    notaText(ctx, notaFmtRp(it.harga), col3, midY, { font: `500 ${u(10.5)}px ${NOTA_FONT}`, color: '#334155', align: 'right' });
                    notaText(ctx, notaFmtRp(it.subtotal), col4, midY, { font: `800 ${u(10.5)}px ${NOTA_FONT}`, color: '#0066FF', align: 'right' });
                });
            } else {
                notaText(ctx, '- Tidak ada rincian -', tX + tW / 2, L.tableRowsTop + L.TABLE_ROW_H / 2, { font: `italic 500 ${u(10.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'center' });
            }

            ctx.beginPath(); ctx.moveTo(tX, L.divider1Y); ctx.lineTo(tX + tW, L.divider1Y); ctx.stroke();

            const totalsRow = (i, label, value) => {
                const rowY = L.totalsTop + i * L.TOTALS_ROW_H + L.TOTALS_ROW_H / 2;
                notaText(ctx, label, tX, rowY, { font: `500 ${u(11)}px ${NOTA_FONT}`, color: '#64748b', align: 'left' });
                notaText(ctx, notaFmtRp(value), tX + tW, rowY, { font: `500 ${u(11)}px ${NOTA_FONT}`, color: '#64748b', align: 'right' });
            };
            totalsRow(0, 'Subtotal Item', data.subtotal);
            totalsRow(1, 'Ongkir', data.ongkir);
            const totalBiaya = L.biayaList.reduce((a, b) => a + (b.nominal || 0), 0);
            totalsRow(2, 'Tambahan Biaya', totalBiaya);
            L.biayaList.forEach((b, i) => {
                const rowY = L.totalsTop + L.TOTALS_ROW_H * 3 + i * L.BIAYA_ROW_H + L.BIAYA_ROW_H / 2;
                notaText(ctx, `+ ${b.nama}`, tX + u(8), rowY, { font: `italic 500 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left', maxWidth: tW * 0.6 });
                notaText(ctx, notaFmtRp(b.nominal), tX + tW, rowY, { font: `italic 500 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'right' });
            });

            notaFillRoundRect(ctx, tX, L.totalBoxTop, tW, L.TOTALBOX_H, u(14), '#10192e');
            notaText(ctx, 'TOTAL', tX + u(14), L.totalBoxTop + L.TOTALBOX_H / 2, { font: `800 ${u(10)}px ${NOTA_FONT}`, color: 'rgba(255,255,255,0.7)', align: 'left' });
            notaText(ctx, notaFmtRp(data.total), tX + tW - u(14), L.totalBoxTop + L.TOTALBOX_H / 2, { font: `900 ${u(16)}px ${NOTA_FONT}`, color: '#ffffff', align: 'right' });

            ctx.beginPath(); ctx.moveTo(tX, L.divider2Y); ctx.lineTo(tX + tW, L.divider2Y); ctx.stroke();

            notaText(ctx, 'Terima kasih telah menggunakan jasa Sahabatku Delivery.', cardX + cardW / 2, L.footerTop + u(10), { font: `italic 500 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'center', maxWidth: tW });
            notaText(ctx, 'Pastikan Selalu Order Melalui WhatsApp Resmi Kami:', cardX + cardW / 2, L.footerTop + u(28), { font: `600 ${u(9.5)}px ${NOTA_FONT}`, color: '#475569', align: 'center', maxWidth: tW });
            notaText(ctx, '0821-1845-415', cardX + cardW / 2, L.footerTop + u(46), { font: `800 ${u(12)}px ${NOTA_FONT}`, color: '#0066FF', align: 'center' });

            if (L.history) {
                ctx.beginPath(); ctx.moveTo(tX, L.divider3Y); ctx.lineTo(tX + tW, L.divider3Y); ctx.stroke();
                notaText(ctx, 'ONGKIR HISTORY', tX, L.historyTop + u(9), { font: `800 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left' });
                notaText(ctx, `${L.history.length} item`, tX + tW, L.historyTop + u(9), { font: `500 ${u(9.5)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'right' });
                if (L.history.length) {
                    L.history.forEach((h, i) => {
                        const rowY = L.historyRowsTop + i * (L.HIST_ROW_H + L.HIST_ROW_GAP);
                        notaFillRoundRect(ctx, tX, rowY, tW, L.HIST_ROW_H, u(10), '#f8fafc');
                        notaText(ctx, `${h.asal} → ${h.tujuan}`, tX + u(10), rowY + u(15), { font: `800 ${u(10)}px ${NOTA_FONT}`, color: '#334155', align: 'left', maxWidth: tW * 0.55 });
                        notaText(ctx, h.tgl, tX + u(10), rowY + u(29), { font: `500 ${u(9)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'left' });
                        notaText(ctx, `Rp ${notaFmtRp(h.val)}`, tX + tW - u(10), rowY + L.HIST_ROW_H / 2, { font: `800 ${u(10)}px ${NOTA_FONT}`, color: '#0066FF', align: 'right' });
                    });
                } else {
                    notaText(ctx, 'Belum ada history ongkir.', tX + tW / 2, L.historyRowsTop + L.HIST_ROW_H / 2, { font: `italic 500 ${u(10)}px ${NOTA_FONT}`, color: '#94a3b8', align: 'center' });
                }
            }

            ctx.restore(); // lepas clip

            ctx.strokeStyle = 'rgba(226,232,240,0.9)';
            ctx.lineWidth = u(1);
            notaRoundRectPath(ctx, cardX, L.cardTop, cardW, L.cardH, u(16));
            ctx.stroke();

            return canvas;
        }

        // Deteksi kemampuan device: kalau navigator.deviceMemory tidak tersedia
        // (mis. Safari/iOS), pakai jumlah core CPU sebagai perkiraan cadangan.
        const NOTA_MEM = navigator.deviceMemory || null;
        const NOTA_CORES = navigator.hardwareConcurrency || null;
        const NOTA_VERY_LOW_RAM_DEVICE = !!(NOTA_MEM && NOTA_MEM <= 1);
        const NOTA_LOW_RAM_DEVICE = NOTA_VERY_LOW_RAM_DEVICE ||
            !!(NOTA_MEM && NOTA_MEM <= 2) ||
            (!NOTA_MEM && !!(NOTA_CORES && NOTA_CORES <= 4));
        // Lebar canvas (bukan lagi "scale" DOM) — makin kecil RAM, makin kecil
        // jumlah piksel yang perlu digambar & di-encode ke JPEG.
        const NOTA_CANVAS_WIDTH = NOTA_VERY_LOW_RAM_DEVICE ? 540 : (NOTA_LOW_RAM_DEVICE ? 620 : 720);
        const NOTA_SCALE = NOTA_CANVAS_WIDTH / 720;
        const NOTA_JPEG_QUALITY = NOTA_VERY_LOW_RAM_DEVICE ? 0.75 : (NOTA_LOW_RAM_DEVICE ? 0.82 : 0.88);

        // key -> <canvas> hasil generate. Di-invalidate manual tiap kali isi nota
        // berganti (lihat invalidateNotaCanvasCache di prosesPratinjauNota & viewAdminNota).
        const notaCanvasCache = {};
        function invalidateNotaCanvasCache(key) {
            notaCanvasCache[key] = null;
        }
        // Batas aman tinggi canvas. Sebagian GPU HP (terutama yang murah/RAM kecil)
        // bisa gagal me-render dengan benar (muncul glitch/bergaris) kalau permukaan
        // canvas terlalu tinggi. Untuk nota dengan SANGAT banyak item/history,
        // seluruh ukuran diperkecil proporsional (bukan dipotong) supaya tidak
        // pernah melewati batas ini di HP manapun.
        const NOTA_MAX_CANVAS_H = 3200;
        function pickSafeNotaScale(data, desiredS) {
            const L = buildNotaLayout(data, desiredS);
            if (L.canvasH <= NOTA_MAX_CANVAS_H) return desiredS;
            return Math.max(desiredS * (NOTA_MAX_CANVAS_H / L.canvasH), 0.4);
        }
        async function getNotaCanvas(key, data) {
            if (notaCanvasCache[key]) return notaCanvasCache[key];
            await ensureNotaFontReady();
            const canvas = document.createElement('canvas');
            const safeS = pickSafeNotaScale(data, NOTA_SCALE);
            drawNotaOnCanvas(canvas, data, safeS);
            notaCanvasCache[key] = canvas;
            return canvas;
        }

        // Kunci semua tombol terkait sampai proses sebelumnya selesai (anti dobel-tap).
        let notaImageBusy = false;
        const NOTA_BUSY_BUTTON_IDS = ['btn-simpan-gambar', 'btn-simpan-nota', 'btn-share-wa', 'btn-unduh-admin', 'btn-share-wa-admin'];
        function setNotaImageBusy(busy, activeBtn) {
            notaImageBusy = busy;
            NOTA_BUSY_BUTTON_IDS.forEach(id => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.disabled = busy;
                btn.classList.toggle('btn-busy', busy);
            });
            if (activeBtn) {
                if (busy && !activeBtn.dataset.origHtml) {
                    activeBtn.dataset.origHtml = activeBtn.innerHTML;
                    activeBtn.innerHTML = '<span class="btn-spin"></span> Memproses...';
                } else if (!busy && activeBtn.dataset.origHtml) {
                    activeBtn.innerHTML = activeBtn.dataset.origHtml;
                    delete activeBtn.dataset.origHtml;
                }
            }
        }
        async function processNotaImage(cacheKey, data, { mode, btn, successMsg }) {
            if (notaImageBusy) return;
            if (!data) { toast('Data nota belum siap.'); return; }

            setNotaImageBusy(true, btn);
            try {
                const canvas = await getNotaCanvas(cacheKey, data);
                const fileName = `${data.notaNum}_${data.kurir}.jpg`.replace(/\s+/g, '_').replace(/[\/\\:*?"<>|]/g, '');

                if (mode === 'download') {
                    const link = document.createElement('a');
                    link.download = fileName;
                    link.href = canvas.toDataURL('image/jpeg', NOTA_JPEG_QUALITY);
                    link.click();
                    toast(successMsg || 'Gambar nota berhasil disimpan!');
                    return;
                }

                // mode === 'share': bagikan lewat share-sheet (kalau didukung) atau fallback unduh + buka WhatsApp
                const captionText = `Nota: ${data.notaNum}\nKurir: ${data.kurir}`;
                await new Promise((resolve) => {
                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            toast('Gagal memproses gambar nota.');
                            resolve();
                            return;
                        }
                        const file = new File([blob], fileName, { type: 'image/jpeg' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: `Nota ${data.notaNum}`, text: captionText })
                                .catch(() => {})
                                .finally(resolve);
                        } else {
                            const link = document.createElement('a');
                            link.download = fileName;
                            link.href = canvas.toDataURL('image/jpeg', NOTA_JPEG_QUALITY);
                            link.click();
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(captionText)}`, '_blank');
                            resolve();
                        }
                    }, 'image/jpeg', NOTA_JPEG_QUALITY);
                });
            } catch (err) {
                toast('Terjadi kesalahan gambar: ' + (err?.message || err));
            } finally {
                setNotaImageBusy(false, btn);
            }
        }
        window.saveNotaAsJpg = function() {
            if (!kurirNotaPreviewData) { toast('Preview nota belum siap.'); return; }
            processNotaImage('canvas-nota', kurirNotaPreviewData, {
                mode: 'download',
                btn: document.getElementById('btn-simpan-gambar'),
                successMsg: 'Gambar nota berhasil disimpan!'
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

            const notaRef = ref(db, 'nota');
            const pushRef = push(notaRef);

            // simpan nota dengan key yang fix (pushRef.key)
            set(pushRef, payload).then(async () => {
                toast("Nota kiriman berhasil disimpan!");
                localStorage.removeItem('sahabatku_nota_draft');

                const userId = userSession.id;
                const username = userSession.username;

                const potongSlot = getPotonganKurirKoin(payload);
                const usageSekarang = parseInt(cloudNotaHabisCounter?.[userId] || 0) || 0;
                const usageBaru = usageSekarang + potongSlot;
                cloudNotaHabisCounter[userId] = usageBaru;

                const saldoSekarang = getSaldoKurirRaw(userId, username);
                const saldoBaru = Math.max(0, saldoSekarang - (potongSlot * 1000));

                await update(ref(db, `users/${userId}`), {
                    depositSaldo: saldoBaru,
                    depositUpdatedAt: new Date().toISOString()
                });

                cloudKurirList[userId].depositSaldo = saldoBaru;
                renderSaldoKurir();
                updateKurirDashboard();

                const draftKey = localStorage.getItem('last_ongkir_draft_key');
                if (draftKey && userSession?.id) {
                    try {
                        const fromRef = ref(db, `ongkir_history_draft/${userSession.id}`);
                        const snap = await get(fromRef);
                        const data = snap.val() || {};
                        const entries = Object.entries(data);

                        const ongkirHistoryJson = [];

                        for (const [k, v] of entries) {
                            if (!v || v.draftKey !== draftKey) continue;

                            ongkirHistoryJson.push({
                                draftKey: v.draftKey,
                                kurirId: v.kurirId || userSession.id,
                                kurirUsername: v.kurirUsername || userSession.username,
                                kurirNama: v.kurirNama || userSession.nama,
                                asal: v.asal || '',
                                tujuan: v.tujuan || '',
                                estimasiOngkir: v.estimasiOngkir || 0,
                                tglRaw: v.tglRaw || getWibRawDate(),
                                createdAt: v.createdAt || new Date().toISOString()
                            });

                            await remove(ref(db, `ongkir_history_draft/${userSession.id}/${k}`)).catch(() => {});
                        }

                        localStorage.removeItem('last_ongkir_draft_key');

                        await update(pushRef, {
                            ongkir_history: ongkirHistoryJson
                        }).catch(() => {});
                    } catch (e) {}
                }

                // reset nota form state
                notaState = { items: [], biaya: [], subtotal: 0, ongkir: 6000, total: 6000 };
                document.getElementById('container-items').innerHTML = '';
                document.getElementById('container-biaya').innerHTML = '';

                const dropBiaya = document.getElementById('biaya-dropdown');
                if (dropBiaya) dropBiaya.value = '';
                if (document.getElementById('biaya-nama-manual')) document.getElementById('biaya-nama-manual').classList.add('hidden');
                if (document.getElementById('biaya-nominal')) document.getElementById('biaya-nominal').value = '';

                const inputOngkir = document.getElementById('nota-ongkir');
                if (inputOngkir) inputOngkir.value = '6.000';

                updateKurirDashboard();
                navigateTo('screen-preview');
            }).catch(() => {
                toast('Gagal simpan nota.');
            });
        };
        window.shareWhatsApp = function() {
            if (!kurirNotaPreviewData) { toast('Preview nota belum siap.'); return; }
            processNotaImage('canvas-nota', kurirNotaPreviewData, {
                mode: 'share',
                btn: document.getElementById('btn-share-wa')
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

            const notaList = Object.entries(cloudNotaList || {})
                .filter(([_, n]) => !!n)
                .map(([k, n]) => ({ key: k, n }));

            // filter dulu
            const filtered = notaList.filter(({ n }) => {
                if (userSession && userSession.role === 'kurir' && n.kurirUsername !== userSession.username) return false;
                if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) return false;
                if (filterTgl && n.tanggalRaw !== filterTgl) return false;
                if (searchKeyword && n.id && !n.id.toLowerCase().includes(searchKeyword)) return false;
                return true;
            });

            // urut: terbaru (tanggalRaw desc), lalu id (desc)
            filtered.sort((a, b) => {
                const tA = a.n?.tanggalRaw || '';
                const tB = b.n?.tanggalRaw || '';
                if (tA !== tB) return tB.localeCompare(tA);

                const idA = a.n?.id || '';
                const idB = b.n?.id || '';
                return idB.localeCompare(idA);
            });

            for (let { key: k, n } of filtered) {
                hasData = true;
                const statusVal = (n.status || 'Lunas');
                const isOL = statusVal.toUpperCase() === 'OL';
                container.innerHTML += `
                    <div class="list-card-hover bg-white dark:bg-darkCard p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2 shadow-sm border-l-4 ${isOL ? 'border-l-purple-400' : 'border-l-primary'}">
                        <div class="flex justify-between items-start gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <div class="w-8 h-8 rounded-lg ${isOL ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-500' : 'bg-blue-50 dark:bg-blue-950/40 text-primary'} flex items-center justify-center shrink-0"><i data-lucide="receipt" class="w-3.5 h-3.5"></i></div>
                                <div class="min-w-0">
                                    <p class="font-bold truncate">${n.id}</p>
                                    <p class="text-[10px] text-slate-400 mt-0.5">${n.tanggal}</p>
                                </div>
                            </div>
                            <span class="text-primary font-black shrink-0">Rp ${(n.total || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800">
                            <span class="status-pill ${isOL ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40' : 'bg-blue-50 text-primary dark:bg-blue-950/40'}"><i data-lucide="tag" class="w-2.5 h-2.5"></i> ${statusVal}</span>
                            <div class="flex items-center gap-2">
                                <button onclick="previewRiwayatNota('${k}')" class="flex items-center gap-1 text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"><i data-lucide="eye" class="w-3 h-3"></i> Preview</button>
                                <button onclick="hapusRiwayatNota('${k}')" class="flex items-center gap-1 text-danger font-bold bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
                            </div>
                        </div>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();

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
                toast("Data nota tidak ditemukan!");
                return;
            }
            invalidateNotaCanvasCache('canvas-nota'); // isi nota berganti, canvas lama tidak valid lagi
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
            if (n.items && Array.isArray(n.items) && n.items.length > 0) {
                n.items.forEach(it => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${it.nama}</td>
                            <td class="text-center">${it.qty}</td>
                            <td class="text-right">${(it.harga || 0).toLocaleString('id-ID')}</td>
                            <td class="text-right">${(it.subtotal || 0).toLocaleString('id-ID')}</td>
                        </tr>`;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center italic text-slate-400 py-2">- Tidak ada rincian.</td></tr>`;
            }
            const itemCountEl = document.getElementById('p-item-count');
            if (itemCountEl) itemCountEl.innerText = `${(n.items && Array.isArray(n.items)) ? n.items.length : 0} item`;
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
        window.resetNotaBaru = async function() {
            if (!(await showConfirm('Bersihkan semua isi nota dan buat nota baru?'))) return;
        
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
        window.hapusRiwayatNota = async function(key) {
            const n = cloudNotaList[key];
            const idNota = n ? n.id : "Nota ini";

            const ok = await showConfirm(`Apakah Anda yakin ingin menghapus ${idNota} secara permanen dari riwayat?`);
            if (ok) {
                // LOCK supaya queueUiRefresh gak bikin balik dashboard
                window.__lockRiwayatScreen = true;

                const userId = Object.keys(cloudKurirList || {}).find(k =>
                    (cloudKurirList[k]?.username || '').trim() === (n?.kurirUsername || '').trim()
                );
                const username = n?.kurirUsername || '';

                remove(ref(db, `nota/${key}`))
                    .then(() => {
                        delete cloudNotaList[key];

                        if (userId && n) {
                            const balikin = getPotonganKurirKoin(n);
                            const usageSekarang = parseInt(cloudNotaHabisCounter?.[userId] || 0) || 0;
                            const usageBaru = Math.max(0, usageSekarang - balikin);
                            cloudNotaHabisCounter[userId] = usageBaru;

                            const saldoSekarang = getSaldoKurirRaw(userId, username);
                            const saldoBaru = saldoSekarang + (balikin * 1000);

                            update(ref(db, `users/${userId}`), {
                                depositSaldo: saldoBaru,
                                depositUpdatedAt: new Date().toISOString()
                            }).then(() => {
                                cloudKurirList[userId].depositSaldo = saldoBaru;
                                renderSaldoKurir();
                            });

                            const notaId = n?.id;
                            if (notaId) remove(ref(db, `ongkir_history/${notaId}`)).catch(() => {});
                        }

                        // paksa tetap di riwayat, dan render ulang
                        if (userSession && userSession.role === 'kurir') {
                            currentScreen = 'screen-riwayat';
                            const elNow = document.getElementById('screen-riwayat');
                            const elDash = document.getElementById('screen-dashboard');
                            if (elDash) elDash.classList.remove('active');
                            if (elNow) elNow.classList.add('active');

                            renderKurirRiwayatList(true);
                        }

                        toast("Nota sukses dihapus!");
                    })
                    .catch((error) => {
                        toast("Gagal menghapus nota: " + error.message);
                    })
                    .finally(() => {
                        // lepaskan lock setelah beberapa detik supaya refresh yang datang belakangan gak skip terus
                        setTimeout(() => { window.__lockRiwayatScreen = false; }, 900);
                    });
            }
        }
        function populateMitraSelectionDropdown() {
            const drop = document.getElementById('m-input-pilih');
            if(!drop) return;
            drop.innerHTML = '<option value="">-- Pilih Mitra --</option>';
            const sortedMitra = Object.values(cloudMitraList || {})
                .filter(m => m && m.nama)
                .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
            sortedMitra.forEach(m => {
                drop.innerHTML += `<option value="${m.nama}">${m.nama}</option>`;
            });
        }
        window.addTransaksiMitra = function() {
            const btnTambah = document.getElementById('btn-tambah-transaksi-mitra');

            // Cegah klik dobel yang bisa membuat transaksi kepush berulang (duplikat)
            if (btnTambah && btnTambah.disabled) return;

            const mNama = document.getElementById('m-input-pilih').value;
            const trxInput = parseInt(document.getElementById('m-input-trx').value) || 0;

            if(!mNama) { toast("Silahkan pilih mitra terlebih dahulu!"); return; }
            if(trxInput <= 0) { toast("Jumlah transaksi harus lebih dari 0!"); return; }
            if(!userSession || !userSession.nama) { toast("Sesi login tidak ditemukan. Silakan login ulang."); return; }

            const wib = getWibDate();
            const tglRawLokal = getWibRawDate();
            const waktuLokal = wib.toTimeString().split(' ')[0];

            const payload = {
                mitraNama: mNama,
                trxInput: trxInput,
                kurirNama: userSession.nama,
                kurirUsername: userSession.username,
                waktu: waktuLokal,
                tglRaw: tglRawLokal,
                bulan: tglRawLokal.substring(0, 7)
            };

            if (btnTambah) btnTambah.disabled = true;

            push(ref(db, 'log_mitra'), payload).then(() => {
                toast("Transaksi mitra berhasil di-input!");
                document.getElementById('m-input-trx').value = '';
                if (typeof calculateMitraStats === 'function') calculateMitraStats();
            }).catch((err) => {
                toast('Gagal menyimpan transaksi: ' + (err && err.message ? err.message : 'Terjadi kesalahan.'));
            }).finally(() => {
                if (btnTambah) btnTambah.disabled = false;
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
                toast('Data mitra tidak ditemukan!');
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
            if (!container) return;
            const fTgl = document.getElementById('m-filter-tgl-kurir')?.value || '';
        
            const bulanSkrg = getWibRawDate().substring(0, 7);
            const bulanFilter = filterBulanKhusus || bulanSkrg;
        
            let entries = [];
            let logKeysSorted = Object.keys(cloudLogMitra || {}).sort((a, b) => b.localeCompare(a));
        
            logKeysSorted.forEach(k => {
                const log = cloudLogMitra[k];
                if (!log) return;
        
                if (userSession && log.kurirUsername !== userSession.username) return;
                if (filterNamaMitraKhusus && log.mitraNama !== filterNamaMitraKhusus) return;
                if (fTgl) {
                    if (log.tglRaw !== fTgl) return;
                } else if (log.tglRaw && log.tglRaw.substring(0, 7) !== bulanFilter) {
                    return;
                }
        
                entries.push(log);
            });
        
            if (!entries.length) {
                const label = fTgl ? `tanggal ${new Date(fTgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : `bulan ${new Date(bulanFilter + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
                container.innerHTML = `
                    <div class="text-center py-6 space-y-1">
                        <div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="inbox" class="w-4 h-4"></i></div>
                        <p class="text-[11px] text-slate-400">Belum ada transaksi untuk ${label}.</p>
                    </div>`;
                if (window.lucide) lucide.createIcons();
                return;
            }
        
            const totalTrx = entries.reduce((a, log) => a + (parseInt(log.trxInput) || 0), 0);
        
            container.innerHTML = `
                <div class="flex items-center justify-between px-1 pb-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase">${entries.length} transaksi</span>
                    <span class="text-[10px] font-black text-blue-600 dark:text-blue-400">Total ${totalTrx} Trx</span>
                </div>
                ${entries.map(log => {
                    const waktuTampil = log.waktu ? log.waktu.substring(0, 5) : '00:00';
                    return `
                    <div class="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0"><i data-lucide="receipt" class="w-3.5 h-3.5"></i></div>
                        <div class="min-w-0 flex-1">
                            <div class="font-bold text-[11px] text-slate-700 dark:text-white truncate">${log.mitraNama}</div>
                            <div class="text-[9px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-2.5 h-2.5"></i>${log.tglRaw} • ${waktuTampil} WIB</div>
                        </div>
                        <div class="shrink-0 text-sm font-black text-blue-600 dark:text-blue-400">+${log.trxInput}</div>
                    </div>
                `;}).join('')}
            `;
            if (window.lucide) lucide.createIcons();
        };
        window.cariMitra = function() {
            const input = document.getElementById('input-cari-mitra').value.toLowerCase();
            const container = document.getElementById('container-mitra-list');
            const kartuMitra = container ? container.getElementsByClassName('bg-white') : [];

            for (let i = 0; i < kartuMitra.length; i++) {
                const judul = kartuMitra[i].getElementsByTagName('h5')[0];
                const namaMitra = judul ? judul.textContent.toLowerCase() : '';
                
                if (namaMitra.includes(input)) {
                    kartuMitra[i].style.display = "";
                } else {
                    kartuMitra[i].style.display = "none";
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
                Object.entries(cloudMitraList || {})
                    .filter(([_, m]) => m && m.nama)
                    .sort((a, b) => (a[1].nama || '').localeCompare(b[1].nama || ''))
                    .forEach(([k, m]) => {
                        selectMitra.innerHTML += `<option value="${m.nama}">${m.nama}</option>`;
                    });
            }

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

            const allMitraHtml = Object.entries(cloudMitraList || {})
                .filter(([_, m]) => m && m.nama)
                .sort((a, b) => (a[1].nama || '').localeCompare(b[1].nama || ''))
                .map(([k, m]) => {
                    const stats = mitraStats[m.nama] || { totalTrx: 0, target: 0, hp: '', alamat: '' };
                    const target = stats.target || 0;
                    const totalTrx = stats.totalTrx || 0;

                    let cleanPhone = (m.hp || '').toString().trim().replace(/[^0-9+]/g, '');
                    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
                    else if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);

                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
                    const mapsLink = getMapsLink(m.alamat);

                    const pct = target > 0 ? Math.min(100, Math.round((totalTrx / target) * 100)) : 0;
                    return `
                        <div class="bg-white dark:bg-darkCard p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2.5 shadow-sm list-card-hover">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0"><i data-lucide="store" class="w-4 h-4"></i></div>
                                    <div class="min-w-0">
                                        <h5 class="font-bold text-slate-800 dark:text-white truncate">${m.nama}</h5>
                                        <a href="${mapsLink}" target="_blank" class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                                            <i data-lucide="map-pin" class="w-2.5 h-2.5"></i> ${m.alamat || 'Belum Diisi'}
                                        </a>
                                    </div>
                                </div>
                                <a href="${waLink}" target="_blank" class="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-success rounded-lg font-bold text-[10px] border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900">
                                    <i data-lucide="message-circle" class="w-3 h-3"></i> WA
                                </a>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div class="flex justify-between text-[11px]">
                                    <span class="text-slate-400">Total Trx <b class="text-slate-700 dark:text-slate-200">${totalTrx}</b></span>
                                    <span class="text-slate-400">Target <b class="text-amber-500">${target}</b></span>
                                </div>
                                <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div class="h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-amber-400'}" style="width:${pct}%"></div>
                                </div>
                            </div>
                            <button onclick="bukaInputTransaksiMitra('${m.nama.replace(/'/g, "\\'")}')" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="plus" class="w-3 h-3"></i> Input Trx</button>
                        </div>
                    `;
                })
                .join('');

            container.innerHTML = allMitraHtml || '<div class="text-center text-xs text-slate-400 py-4">Belum ada data mitra.</div>';
            if (window.lucide) lucide.createIcons();
        };
        window.toggleMitraList = function() {
            const box = document.getElementById('container-mitra-list');
            const btn = document.getElementById('btn-toggle-daftar-mitra');
            if (!box) return;

            if (box.dataset.loaded === '1') {
                box.dataset.loaded = '0';
                box.innerHTML = '';
                if (btn) btn.innerHTML = '<i data-lucide="store" class="w-3.5 h-3.5"></i> <span>Tampilkan Daftar Mitra</span>';
            } else {
                renderKurirMitraView(true);
                if (btn) btn.innerHTML = '<i data-lucide="chevron-up" class="w-3.5 h-3.5"></i> <span>Sembunyikan Daftar Mitra</span>';
            }
            if (window.lucide) lucide.createIcons();
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
                populateMitraLogKurirDropdown();
                renderAdminLogMitra();
            }
        };
        window.renderAdminKurirList = function() {
            const container = document.getElementById('container-admin-kurir');
            if (!container) return;

            const isOpen = ensureSectionToggleState('container-admin-kurir', false);
            container.classList.toggle('hidden', !isOpen);
            if (!isOpen) return;

            const searchValue = (document.getElementById('admin-kurir-search')?.value || '').toLowerCase().trim();

            const filtered = Object.entries(cloudKurirList || {})
                .filter(([_, item]) => {
                    if (!item || item.role === 'admin' || item.username === 'admin') return false;
                    return !searchValue || (item.nama || '').toLowerCase().includes(searchValue);
                })
                .sort((a, b) => (a[1]?.nama || '').localeCompare(b[1]?.nama || ''));

            if (!filtered.length) {
                container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada data kurir.</p>';
                return;
            }

            const isHeadOperasional = userSession && userSession.role === 'manajemen' && (userSession.kategori || '').trim() === 'Head Operasional';

            container.innerHTML = filtered.map(([key, item], index) => {
                const dotStatus = item.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500';
                return `
                    <div class="bg-white dark:bg-darkCard p-3.5 rounded-xl border dark:border-slate-800 shadow-sm space-y-2 text-xs">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0">${index + 1}</span>
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
            if (!userSession) {
                toast('Sesi login tidak ditemukan. Silakan login ulang.');
                return;
            }

            const modal = document.getElementById('modal-input-trx-mitra');
            const inputNama = document.getElementById('trx-mitra-name');
            const display = document.getElementById('trx-mitra-display');
            const bulan = document.getElementById('trx-mitra-bulan');
            const jumlah = document.getElementById('trx-mitra-jumlah');
            const btnSave = document.getElementById('btn-save-trx-mitra');

            if (!modal || !inputNama || !display || !bulan || !jumlah) return;

            inputNama.value = namaMitra;
            display.value = namaMitra;
            bulan.value = getWibRawDate().substring(0, 7);
            jumlah.value = '';

            // Pastikan tombol Simpan selalu dalam kondisi aktif setiap kali popup dibuka
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = 'Simpan';
            }

            modal.classList.remove('hidden');
        };
        window.closeInputTrxMitraModal = function() {
            const modal = document.getElementById('modal-input-trx-mitra');
            if (modal) modal.classList.add('hidden');

            // Reset tombol Simpan agar tidak "nyangkut" di kondisi loading saat modal dibuka lagi
            const btnSave = document.getElementById('btn-save-trx-mitra');
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = 'Simpan';
            }
        };

        window.saveInputTrxMitra = function() {
            const btnSave = document.getElementById('btn-save-trx-mitra');

            // Cegah klik dobel yang bisa membuat transaksi kepush berulang (duplikat)
            if (btnSave && btnSave.disabled) return;

            const namaMitra = document.getElementById('trx-mitra-name').value;
            const bulan = document.getElementById('trx-mitra-bulan').value;
            const trxInput = parseInt(document.getElementById('trx-mitra-jumlah').value) || 0;

            if (!namaMitra) return toast('Mitra belum dipilih!');
            if (!bulan) return toast('Pilih bulan!');
            if (trxInput <= 0) return toast('Jumlah transaksi harus lebih dari 0!');
            if (!userSession || !userSession.nama) return toast('Sesi login tidak ditemukan. Silakan login ulang.');

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.innerText = 'Menyimpan...';
            }

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
                toast('Transaksi mitra berhasil disimpan!');
                closeInputTrxMitraModal();
            }).catch((err) => {
                toast('Gagal menyimpan transaksi: ' + (err && err.message ? err.message : 'Terjadi kesalahan.'));
            }).finally(() => {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerText = 'Simpan';
                }
            });
        };
        

        window.toggleRiwayatMitraKurir = function() {
            const box = document.getElementById('box-riwayat-mitra-kurir');
            const btn = document.getElementById('btn-toggle-riwayat-mitra');
            if (!box) return;
            box.classList.toggle('hidden');
            const isOpen = !box.classList.contains('hidden');
            if (btn) btn.innerHTML = isOpen
                ? '<i data-lucide="chevron-up" class="w-3 h-3"></i> <span>Tutup</span>'
                : '<i data-lucide="history" class="w-3 h-3"></i> <span>Riwayat</span>';
            if (isOpen) {
                renderKurirLogMitra();
            }
            if (window.lucide) lucide.createIcons();
        };
        window.sembunyikanRiwayatMitraKurir = function() {
            const box = document.getElementById('box-riwayat-mitra-kurir');
            const container = document.getElementById('container-kurir-log-mitra');
            const btn = document.getElementById('btn-toggle-riwayat-mitra');
            if (container) container.innerHTML = '';
            if (box) box.classList.add('hidden');
            if (btn) btn.innerHTML = '<i data-lucide="history" class="w-3 h-3"></i> <span>Riwayat</span>';
            if (window.lucide) lucide.createIcons();
        };
        
        window.hitungTarifOngkir = function() {
            const asal = document.getElementById('ongkir-asal').value.trim();
            const tujuan = document.getElementById('ongkir-tujuan').value.trim();
        
            if (!asal && !tujuan) {
                toast('Isi minimal salah satu: asal atau tujuan.');
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

            const isOpen = container.dataset.open === '1';

            const btnText = document.getElementById('btn-toggle-notif-text');
            const btnIcon = document.getElementById('btn-toggle-notif-icon');
            if (btnText) btnText.innerText = isOpen ? 'Tutup' : 'Buka';
            if (btnIcon) btnIcon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';

            if (!isOpen) {
                container.innerHTML = '';
                return;
            }

            const items = Object.entries(cloudNotificationList || {}).sort((a, b) => (b[1]?.createdAt || '').localeCompare(a[1]?.createdAt || ''));

            if (!items.length) {
                container.innerHTML = `
                    <div class="text-center py-6 space-y-1">
                        <div class="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="bell-off" class="w-5 h-5"></i></div>
                        <p class="text-xs text-slate-400">Belum ada notifikasi terkirim.</p>
                    </div>`;
                if (window.lucide) lucide.createIcons();
                return;
            }

            const roleIcon = { owner: 'crown', head_ops: 'briefcase', manajemen: 'shield' };

            container.innerHTML = items.map(([key, n]) => {
                const role = n.senderRole || 'owner';
                const isInactive = n.active === false;
                const targetLabel = n.target === 'all' ? 'Semua Kurir' : `Kurir Terpilih (${(n.targetList || []).length})`;
                const waktu = n.createdAt ? new Date(n.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

                return `
                <div class="notif-history-item role-${role} ${isInactive ? 'is-inactive' : ''}">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span class="sender-badge" data-role="${role}"><i data-lucide="${roleIcon[role] || 'user'}" class="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5"></i>${n.senderLabel || 'Admin'}</span>
                            ${isInactive ? '<span class="status-pill bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Nonaktif</span>' : '<span class="status-pill bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">Aktif</span>'}
                        </div>
                    </div>
                    <div class="font-bold text-[11px] sm:text-xs leading-snug break-words text-slate-700 dark:text-slate-200">${n.message || '-'}</div>
                    <div class="flex items-center gap-3 mt-2 text-[10px] text-slate-400 flex-wrap">
                        <span class="flex items-center gap-1"><i data-lucide="users" class="w-3 h-3"></i> ${targetLabel}</span>
                        <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${waktu}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <button onclick="resendNotification('${key}')" class="w-full py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="send" class="w-3 h-3"></i> Kirim Lagi</button>
                        <button onclick="deleteNotification('${key}')" class="w-full py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
                    </div>
                </div>
                `;
            }).join('');
            if (window.lucide) lucide.createIcons();
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
            const tabelTitle = document.querySelector('#screen-rekap h4');
            const tabelBody = document.getElementById('rk-tabel-perhari');

            const now = new Date();
            const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
            const hariIni = wib.toISOString().split('T')[0];
            const bulanIni = hariIni.substring(0, 7);

            if (rekapBulanSelect && !rekapBulanSelect.value) rekapBulanSelect.value = bulanIni;

            const bulanFilter = rekapBulanSelect ? rekapBulanSelect.value : bulanIni;
            const tanggalFilter = rekapTanggalInput ? rekapTanggalInput.value : '';
            const modeBulanan = !tanggalFilter;

            if (tabelTitle) {
                tabelTitle.innerText = modeBulanan ? 'Daftar Data Harian (Bulan Ini)' : 'Daftar Data Harian (Bulan Ini)';
            }

            let totalPendapatan = 0;
            let totalOngkir = 0;
            let totalTambahan = 0;
            let totalNotaCount = 0;
            let totalTrxMitra = 0;
            let rekapMap = {};
            let kumpulanBulanUnik = new Set();

            const cocokBulan = (tgl) => tgl && tgl.substring(0, 7) === bulanFilter;
            const cocokTanggal = (tgl) => tgl && tgl === tanggalFilter;

            for (let key in cloudNotaList) {
                const nota = cloudNotaList[key];
                if (!nota || nota.kurirUsername !== usernameKurir || !nota.tanggalRaw) continue;

                const tglNota = nota.tanggalRaw;
                kumpulanBulanUnik.add(tglNota.substring(0, 7));

                const ongkir = parseInt(nota.ongkir) || 0;
                const tambahan = Array.isArray(nota.biayaTambahan)
                    ? nota.biayaTambahan.reduce((a, b) => a + (parseInt(b.nominal) || 0), 0)
                    : 0;

                const pendapatan = ongkir + tambahan;

                if (modeBulanan) {
                    if (!cocokBulan(tglNota)) continue;

                    if (!rekapMap[tglNota]) {
                        rekapMap[tglNota] = { notaCount: 0, pendapatan: 0, trxMitra: 0, isMonth: false };
                    }

                    rekapMap[tglNota].notaCount += 1;
                    rekapMap[tglNota].pendapatan += pendapatan;

                    totalOngkir += ongkir;
                    totalTambahan += tambahan;
                    totalPendapatan += pendapatan;
                    totalNotaCount++;
                } else {
                    if (!cocokTanggal(tglNota)) continue;

                    if (!rekapMap[tglNota]) {
                        rekapMap[tglNota] = { notaCount: 0, pendapatan: 0, trxMitra: 0, isMonth: false };
                    }

                    rekapMap[tglNota].notaCount += 1;
                    rekapMap[tglNota].pendapatan += pendapatan;

                    totalOngkir += ongkir;
                    totalTambahan += tambahan;
                    totalPendapatan += pendapatan;
                    totalNotaCount++;
                }
            }

            for (let key in cloudLogMitra) {
                const log = cloudLogMitra[key];
                if (!log || log.kurirUsername !== usernameKurir) continue;

                const tglLog = log.tglRaw || log.tanggalRaw;
                if (!tglLog) continue;

                kumpulanBulanUnik.add(tglLog.substring(0, 7));
                const trx = parseInt(log.trxInput) || 0;

                if (modeBulanan) {
                    if (!cocokBulan(tglLog)) continue;

                    if (!rekapMap[tglLog]) {
                        rekapMap[tglLog] = { notaCount: 0, pendapatan: 0, trxMitra: 0, isMonth: false };
                    }

                    rekapMap[tglLog].trxMitra += trx;
                    totalTrxMitra += trx;
                } else {
                    if (!cocokTanggal(tglLog)) continue;

                    if (!rekapMap[tglLog]) {
                        rekapMap[tglLog] = { notaCount: 0, pendapatan: 0, trxMitra: 0, isMonth: false };
                    }

                    rekapMap[tglLog].trxMitra += trx;
                    totalTrxMitra += trx;
                }
            }

            if (rekapBulanSelect && rekapBulanSelect.options.length === 0) {
                const daftarBulanUrut = Array.from(kumpulanBulanUnik).sort((a, b) => b.localeCompare(a));
                daftarBulanUrut.forEach(bln => {
                    const [tahun, bulan] = bln.split('-');
                    const namaBulanIndo = new Date(tahun, parseInt(bulan) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                    rekapBulanSelect.add(new Option(namaBulanIndo, bln));
                });
            }

            document.getElementById('rk-pendapatan').innerText = "Rp " + totalPendapatan.toLocaleString('id-ID');
            document.getElementById('rk-ongkir').innerText = "Rp " + totalOngkir.toLocaleString('id-ID');
            document.getElementById('rk-tambahan').innerText = "Rp " + totalTambahan.toLocaleString('id-ID');
            document.getElementById('rk-nota-count').innerText = totalNotaCount;
            document.getElementById('rk-total-trx-mitra').innerText = totalTrxMitra + " Trx";

            if (tabelBody) {
                tabelBody.innerHTML = '';
                const urutan = Object.keys(rekapMap).sort((a, b) => b.localeCompare(a));
                let adaData = false;

                urutan.forEach(keyTanggal => {
                    const data = rekapMap[keyTanggal];
                    adaData = true;

                    const tglCantik = new Date(keyTanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });

                    tabelBody.innerHTML += `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td class="py-2 font-medium text-slate-700 dark:text-slate-300">${tglCantik}</td>
                            <td class="py-2 text-center text-slate-500">${data.notaCount} Nota</td>
                            <td class="py-2 text-right font-bold text-primary">Rp ${data.pendapatan.toLocaleString('id-ID')}</td>
                            <td class="py-2 text-right font-semibold text-indigo-600">${data.trxMitra} Trx</td>
                        </tr>
                    `;
                });

                if (!adaData) {
                    tabelBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-400 py-4 italic">Belum ada aktivitas di filter ini.</td></tr>`;
                }
            }

            loadChartJs().then(() => initChartsEngine(rekapMap)).catch(console.error);
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
                const nominalTambahan = (nota.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);

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
            renderSaldoKurir();
        };
        function renderSaldoKurir() {
            if (!userSession || userSession.role !== 'kurir') return;

            const saldoKurir = getSaldoKurirRaw(userSession.id, userSession.username);
            const saldoDisplay = getSaldoKurirDisplay(userSession.id, userSession.username);

            const elSaldo = document.getElementById('kurir-stat-saldo');
            if (elSaldo) elSaldo.innerText = saldoDisplay;

            const warn = document.getElementById('kurir-saldo-warning');
            if (warn) warn.innerText = saldoKurir <= 0 ? 'Segera deposit' : '';
        }
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
            
                const keys = Object.keys(cloudNotaList || {})
                    .filter(key => {
                        const n = cloudNotaList[key];
                        if (!isValidNotaItem(n)) return false;
                        if (filterKurir !== 'semua' && n.kurirUsername !== filterKurir) return false;
                        if (filterTgl && n.tanggalRaw !== filterTgl) return false;
                        if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) return false;
                        return true;
                    })
                    .sort((a, b) => {
                        const na = cloudNotaList[a];
                        const nb = cloudNotaList[b];

                        const jamA = (na?.tanggal || '').match(/(\d{1,2})[:.](\d{2})/);
                        const jamB = (nb?.tanggal || '').match(/(\d{1,2})[:.](\d{2})/);

                        const menitA = jamA ? (+jamA[1] * 60) + (+jamA[2]) : 0;
                        const menitB = jamB ? (+jamB[1] * 60) + (+jamB[2]) : 0;

                        return menitB - menitA;
                    });

                keys.forEach(key => {
                    const n = cloudNotaList[key];
                    if (!isValidNotaItem(n)) return;
            
                    if (filterKurir !== 'semua' && n.kurirUsername !== filterKurir) return;
                    if (filterTgl && n.tanggalRaw !== filterTgl) return;
                    if (filterBulan && (!n.tanggalRaw || n.tanggalRaw.substring(0, 7) !== filterBulan)) return;
            
                    adaData = true;
            
                    const totalBiaya = (n.biayaTambahan || []).reduce((acc, b) => acc + (b.nominal || 0), 0);
                    const statusText = normalizeStatusNota(n.status) || '-';
                    const isAdminStatus = statusText === 'admin';
                    const statusColor = isAdminStatus
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300';
                    const accentBorder = isAdminStatus ? 'border-l-blue-400' : 'border-l-amber-400';
                    const iconBg = isAdminStatus
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500';
                    const kurirInitial = (n.kurirNama || '?').trim().charAt(0).toUpperCase();
            
                    container.innerHTML += `
                        <div class="list-card-hover bg-white dark:bg-darkCard p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-[11px] space-y-2.5 border-l-4 ${accentBorder}">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <div class="w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0"><i data-lucide="receipt" class="w-3.5 h-3.5"></i></div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-[12px] leading-tight truncate">${n.id || '-'}</div>
                                        <div class="text-[10px] text-slate-400">${n.tanggal || '-'}</div>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColor} shrink-0">
                                    ${statusText.toUpperCase()}
                                </span>
                            </div>

                            <div class="flex items-center gap-1.5 pl-1">
                                <div class="leader-avatar" style="width:20px;height:20px;font-size:9px;border-radius:6px;">${kurirInitial}</div>
                                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-300 truncate">${n.kurirNama || '-'}</span>
                            </div>
            
                            <div class="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-center">
                                <div>
                                    <div class="text-[8px] text-slate-400 uppercase">Ongkir</div>
                                    <div class="font-bold text-[10px]">${(n.ongkir || 0).toLocaleString('id-ID')}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-400 uppercase">Tambahan</div>
                                    <div class="font-bold text-[10px]">${totalBiaya.toLocaleString('id-ID')}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-400 uppercase">Item</div>
                                    <div class="font-bold text-[10px]">${(n.items || []).length}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-400 uppercase">Total</div>
                                    <div class="font-black text-[10px] text-primary">${(n.total || 0).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
            
                            <div class="flex justify-end gap-2 pt-0.5 border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                                <button onclick="viewAdminNota('${key}')" class="flex items-center gap-1 text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"><i data-lucide="eye" class="w-3 h-3"></i> Preview</button>
                                <button onclick="hapusNotaGlobal('${key}')" class="flex items-center gap-1 text-danger font-bold bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
                            </div>
                        </div>
                    `;
                });
                if (window.lucide) lucide.createIcons();
            
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
            let totalTrxMitra = 0;
            let kurirAktifSet = new Set();
            let mapHarian = {};

            Object.values(cloudNotaList || {}).forEach(n => {
                if (!isValidNotaItem(n)) return;
                if (bulan && n.tanggalRaw.substring(0, 7) !== bulan) return;
                if (kurir !== 'semua' && n.kurirUsername !== kurir) return;

                const tgl = n.tanggalRaw;
                if (!mapHarian[tgl]) {
                    mapHarian[tgl] = {
                        totalNota: 0,
                        notaAdmin: 0,
                        notaOL: 0,
                        pendapatan: 0,
                        trxMitra: 0,
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

                const status = normalizeStatusNota(n.status);
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

            Object.values(cloudLogMitra || {}).forEach(log => {
                if (!log || !log.tglRaw) return;
                if (bulan && log.tglRaw.substring(0, 7) !== bulan) return;
                if (kurir !== 'semua' && log.kurirUsername !== kurir) return;

                const tgl = log.tglRaw;
                if (!mapHarian[tgl]) {
                    mapHarian[tgl] = {
                        totalNota: 0,
                        notaAdmin: 0,
                        notaOL: 0,
                        pendapatan: 0,
                        trxMitra: 0,
                        kurirSet: new Set()
                    };
                }

                const trx = parseInt(log.trxInput) || 0;
                mapHarian[tgl].trxMitra += trx;
                totalTrxMitra += trx;
            });

            const rataRata = totalNota > 0 ? Math.round(totalPendapatan / totalNota) : 0;

            document.getElementById('laporan-total-nota').innerText = totalNota;
            const detailNota = document.getElementById('laporan-total-nota-detail');
            if (detailNota) detailNota.innerText = `Admin ${totalNotaAdmin} • OL ${totalNotaOL}`;

            document.getElementById('laporan-total-pendapatan').innerText = 'Rp ' + totalPendapatan.toLocaleString('id-ID');
            document.getElementById('laporan-rata-rata').innerText = 'Rp ' + rataRata.toLocaleString('id-ID');
            document.getElementById('laporan-kurir-aktif').innerText = kurirAktifSet.size;

            let trxMitraEl = document.getElementById('laporan-total-trx-mitra');
            if (!trxMitraEl) {
                const parent = document.querySelector('#screen-admin-laporan .grid.grid-cols-2.gap-2');
                if (parent) {
                    parent.insertAdjacentHTML('beforeend', `
                        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                            <div class="text-[10px] text-slate-400 uppercase">Total Trx Mitra</div>
                            <div class="text-lg font-black text-indigo-600 dark:text-indigo-400" id="laporan-total-trx-mitra">0</div>
                        </div>
                    `);
                    trxMitraEl = document.getElementById('laporan-total-trx-mitra');
                }
            }
            if (trxMitraEl) trxMitraEl.innerText = totalTrxMitra + ' Trx';

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
                        <div class="grid grid-cols-3 gap-2">
                            <div><span class="text-[10px] text-slate-400 block">Pendapatan</span><span class="font-bold text-success">Rp ${d.pendapatan.toLocaleString('id-ID')}</span></div>
                            <div><span class="text-[10px] text-slate-400 block">Rata-rata</span><span class="font-bold text-amber-500">Rp ${avg.toLocaleString('id-ID')}</span></div>
                            <div><span class="text-[10px] text-slate-400 block">Trx Mitra</span><span class="font-bold text-indigo-600 dark:text-indigo-400">${d.trxMitra} Trx</span></div>
                        </div>
                    </div>
                `;
            });

            if (!html) {
                html = '<div class="text-center text-xs text-slate-400 py-4">Belum ada data laporan.</div>';
            }

            container.innerHTML = html;

            loadChartJs().then(() => initAdminLaporanChart(mapHarian)).catch(console.error);
        };

        let instanceChartLaporanAdmin = null;
        function initAdminLaporanChart(mapHarian = {}) {
            const chartContainer = document.getElementById('chart-laporan-admin-container');
            if (!chartContainer) return;
            if (instanceChartLaporanAdmin !== null) {
                instanceChartLaporanAdmin.destroy();
                instanceChartLaporanAdmin = null;
            }
            chartContainer.innerHTML = '<canvas id="chartLaporanAdmin" class="w-full h-40"></canvas>';
            const ctx = document.getElementById('chartLaporanAdmin').getContext('2d');

            const urutanTgl = Object.keys(mapHarian).sort((a, b) => a.localeCompare(b));
            const tampil = urutanTgl.slice(-14); // 14 hari terakhir biar chart tetap ringan di HP RAM kecil

            let labels = [];
            let dataPendapatan = [];
            let dataNota = [];

            tampil.forEach(tgl => {
                labels.push(new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
                dataPendapatan.push(mapHarian[tgl].pendapatan || 0);
                dataNota.push(mapHarian[tgl].totalNota || 0);
            });

            if (labels.length === 0) {
                labels = ['Belum Ada Data'];
                dataPendapatan = [0];
                dataNota = [0];
            }

            instanceChartLaporanAdmin = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Pendapatan (Rp)',
                            data: dataPendapatan,
                            backgroundColor: 'rgba(0, 102, 255, 0.55)',
                            borderRadius: 6,
                            yAxisID: 'yPendapatan',
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Jumlah Nota',
                            data: dataNota,
                            borderColor: '#F59E0B',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 3,
                            pointBackgroundColor: '#F59E0B',
                            yAxisID: 'yNota',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, labels: { boxWidth: 12, font: { size: 9, weight: 'bold' } } }
                    },
                    scales: {
                        yPendapatan: {
                            type: 'linear',
                            position: 'left',
                            beginAtZero: true,
                            grid: { color: 'rgba(148, 163, 184, 0.06)' },
                            ticks: {
                                font: { size: 8 },
                                callback: (v) => v >= 1000 ? 'Rp ' + (v / 1000) + 'k' : 'Rp ' + v
                            }
                        },
                        yNota: {
                            type: 'linear',
                            position: 'right',
                            beginAtZero: true,
                            grid: { drawOnChartArea: false },
                            ticks: { font: { size: 8 }, stepSize: 1, callback: (v) => v + ' Nta' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 9 } }
                        }
                    }
                }
            });
        }
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
                toast('Tidak ada data untuk dibackup.');
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
                toast('Lengkapi nama wilayah dan tarif ongkir!');
                return;
            }
        
            const payload = { wilayah, tarif };
        
            if (idEdit) {
                update(ref(db, `ongkir_wilayah/${idEdit}`), payload).then(() => {
                    toast('Data ongkir berhasil diupdate!');
                    resetFormOngkir();
                });
            } else {
                push(ref(db, 'ongkir_wilayah'), payload).then(() => {
                    toast('Data ongkir berhasil disimpan!');
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
        
            if (!id) return toast('Data ongkir tidak ditemukan!');
            if (!wilayah || tarif <= 0) return toast('Lengkapi nama wilayah dan tarif ongkir!');
        
            update(ref(db, `ongkir_wilayah/${id}`), {
                wilayah,
                tarif
            }).then(() => {
                toast('Data ongkir berhasil diperbarui!');
                closeEditOngkirModal();
            }).catch(err => {
                toast('Gagal update ongkir: ' + err.message);
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
        
        window.hapusDataOngkir = async function(key) {
            const ok = await showConfirm('Hapus data ongkir ini?');
            if (ok) {
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
      
          if (!asal && !tujuan) return toast('Isi minimal salah satu.');
      
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

            if (!asal || jarak <= 0) return toast('Isi wilayah dan jarak.');

            if (jarak <= 12) {
                toast('⚠️ Jarak ≤ 12km. Gunakan fitur "Cek Ongkir" normal untuk hasil akurat.');
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
                toast('Lengkapi semua kolom.');
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
            if (!currentKurir) { toast('Data akun tidak ditemukan.'); return; }

            // izin cek: kalau locked, minta password dulu
            if (currentKurir.ongkirLocked) {
                const inputPass = prompt('Masukkan password khusus untuk membuka fitur ongkir:');
                if (!inputPass) return;
                if (inputPass !== currentKurir.ongkirPassword) {
                    toast('Password ongkir salah!');
                    return;
                }
                update(ref(db, `users/${userSession.id}`), { ongkirLocked: false });
            }

            navigateTo('screen-ongkir');
        };
        window.openCekOngkirPopupFromNota = function() {
            if (!userSession || userSession.role !== 'kurir') return;
            const currentKurir = cloudKurirList[userSession.id];
            if (!currentKurir) { toast('Data akun tidak ditemukan.'); return; }

            if (currentKurir.ongkirLocked) {
                const inputPass = prompt('Masukkan password khusus untuk membuka fitur ongkir:');
                if (!inputPass) return;
                if (inputPass !== currentKurir.ongkirPassword) {
                    toast('Password ongkir salah!');
                    return;
                }
                update(ref(db, `users/${userSession.id}`), { ongkirLocked: false });
            }

            const modal = document.getElementById('modal-cek-ongkir');
            if (!modal) return;

            // reset form & state popup setiap buka
            const a = document.getElementById('cek-ongkir-asal');
            const t = document.getElementById('cek-ongkir-tujuan');
            const resBox = document.getElementById('cek-ongkir-result');
            const btnPakai = document.getElementById('btn-pakai-ongkir');
            const display = document.getElementById('cek-ongkir-display');

            if (a) a.value = '';
            if (t) t.value = '';

            const sA = document.getElementById('suggest-cek-ongkir-asal');
            const sT = document.getElementById('suggest-cek-ongkir-tujuan');
            if (sA) { sA.classList.add('hidden'); sA.innerHTML = ''; }
            if (sT) { sT.classList.add('hidden'); sT.innerHTML = ''; }

            window.__lastOngkirPopupValue = 0;
            if (display) display.innerText = 'Rp 0';
            if (resBox) resBox.classList.add('hidden');
            if (btnPakai) btnPakai.classList.add('hidden');

            modal.classList.remove('hidden');
        };
     
        window.closeCekOngkirPopup = function() {
        const modal = document.getElementById('modal-cek-ongkir');
        if (modal) modal.classList.add('hidden');
        };

        window.clearOngkirPopupForm = function() {
            const a = document.getElementById('cek-ongkir-asal');
            const t = document.getElementById('cek-ongkir-tujuan');
            if (a) a.value = '';
            if (t) t.value = '';

            const sA = document.getElementById('suggest-cek-ongkir-asal');
            const sT = document.getElementById('suggest-cek-ongkir-tujuan');
            if (sA) { sA.classList.add('hidden'); sA.innerHTML = ''; }
            if (sT) { sT.classList.add('hidden'); sT.innerHTML = ''; }

            const res = document.getElementById('cek-ongkir-result');
            if (res) res.classList.add('hidden');

            const btnPakai = document.getElementById('btn-pakai-ongkir');
            if (btnPakai) btnPakai.classList.add('hidden');

            const display = document.getElementById('cek-ongkir-display');
            if (display) display.innerText = 'Rp 0';

            window.__lastOngkirPopupValue = 0;
        };


        function popupCariTarif(nama) {
        for (let k in cloudOngkirList) {
            const item = cloudOngkirList[k];
            if (item && normalizeNama(item.wilayah) === normalizeNama(nama)) {
            return parseInt(item.tarif) || 0;
            }
        }
        return 0;
        }

        window.hitungOngkirPopup = function() {
        const asal = document.getElementById('cek-ongkir-asal')?.value.trim() || '';
        const tujuan = document.getElementById('cek-ongkir-tujuan')?.value.trim() || '';

        if (!asal && !tujuan) return toast('Isi minimal salah satu: asal atau tujuan.');

        const tarifAsal = asal ? popupCariTarif(asal) : 0;
        const tarifTujuan = tujuan ? popupCariTarif(tujuan) : 0;

        let hasil = 0;
        if (asal && tujuan) hasil = tarifAsal + tarifTujuan - 6000;
        else hasil = asal ? tarifAsal : tarifTujuan;

        hasil = Math.max(0, hasil);

        const resBox = document.getElementById('cek-ongkir-result');
        const display = document.getElementById('cek-ongkir-display');
        if (display) display.innerText = 'Rp ' + hasil.toLocaleString('id-ID');
        if (resBox) resBox.classList.remove('hidden');

        const btnPakai = document.getElementById('btn-pakai-ongkir');
        if (btnPakai) btnPakai.classList.remove('hidden');

        window.__lastOngkirPopupValue = hasil;
        };
        window.setOngkirToNotaPopup = function() {
        const val = window.__lastOngkirPopupValue || 0;
        if (val <= 0) return toast('Belum ada hasil estimasi ongkir.');

        const asal = document.getElementById('cek-ongkir-asal')?.value?.trim() || '';
        const tujuan = document.getElementById('cek-ongkir-tujuan')?.value?.trim() || '';

        const draftKey = `d_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        localStorage.setItem('last_ongkir_draft_key', draftKey);

        const payload = {
            draftKey,
            kurirId: userSession?.id || '',
            kurirUsername: userSession?.username || '',
            kurirNama: userSession?.nama || '',
            asal,
            tujuan,
            estimasiOngkir: val,
            tglRaw: getWibRawDate(),
            createdAt: new Date().toISOString()
        };

        push(ref(db, `ongkir_history_draft/${userSession?.id || 'unknown'}`), payload).catch(() => {});

        const notaOngkir = document.getElementById('nota-ongkir');
        if (notaOngkir) {
            notaOngkir.value = val.toLocaleString('id-ID');
            calculateNotaTotal();
        }

        closeCekOngkirPopup();
        };
        window.updateOngkirPopupSuggestions = function(type) {
        const input = document.getElementById(`cek-ongkir-${type}`);
        const box = document.getElementById(`suggest-cek-ongkir-${type}`);
        if (!input || !box) return;

        const q = normalizeNama(input.value);
        if (!q) { box.classList.add('hidden'); box.innerHTML=''; return; }

        const matches = [];
        for (let k in cloudOngkirList) {
            const item = cloudOngkirList[k];
            if (item && normalizeNama(item.wilayah).includes(q)) matches.push(item.wilayah);
        }

        box.innerHTML = matches.slice(0, 6).map(nama => `
            <div onclick="pilihSuggestionOngkirPopup('${type}','${nama.replace(/'/g,"\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
            ${nama}
            </div>
        `).join('');

        box.classList.remove('hidden');
        };

        window.pilihSuggestionOngkirPopup = function(type, nama) {
        const input = document.getElementById(`cek-ongkir-${type}`);
        const box = document.getElementById(`suggest-cek-ongkir-${type}`);
        if (input) input.value = nama;
        if (box) { box.classList.add('hidden'); box.innerHTML=''; }
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
        function normalizeStatusNota(value) {
            const v = (value || '').toString().trim().toLowerCase();
            if (v === 'admin') return 'admin';
            if (v === 'ol') return 'ol';
            return '';
        }

        function isValidNotaItem(n) {
            if (!n) return false;
            if (!n.tanggalRaw || !String(n.tanggalRaw).trim()) return false;
            if (!n.kurirUsername || !String(n.kurirUsername).trim()) return false;
            if (!n.id || !String(n.id).trim()) return false;
            return true;
        }        
        function calcKpiForKurir(identifier, bulan, stats = {}) {
            const target = (identifier || '').trim().toLowerCase();
            const norm = (v) => (v || '').toString().trim().toLowerCase();

            const kurirObj = Object.entries(cloudKurirList || {}).find(([id, u]) => {
                if (!u || u.role !== 'kurir') return false;
                return norm(id) === target || norm(u.username) === target || norm(u.nama) === target;
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
                if (!isValidNotaItem(n)) return;
                if (!n.tanggalRaw || n.tanggalRaw.slice(0, 7) !== bulan) return;

                const notaUsername = norm(n.kurirUsername);
                const notaId = norm(n.kurirId);
                const notaNama = norm(n.kurirNama);
                if (notaUsername !== usernameTarget && notaId !== idTarget && notaNama !== norm(namaResmi)) return;

                totalNota++;
                const ongkir = parseInt(n.ongkir) || 0;
                const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                totalPenghasilan += (ongkir + biaya);
            });

            Object.values(cloudLogMitra || {}).forEach(log => {
                if (!log || !log.tglRaw) return;
                if (log.tglRaw.slice(0, 7) !== bulan) return;

                const logUsername = norm(log.kurirUsername);
                const logId = norm(log.kurirId);
                const logNama = norm(log.kurirNama);
                if (logUsername !== usernameTarget && logId !== idTarget && logNama !== norm(namaResmi)) return;

                trxMitra += parseInt(log.trxInput) || 0;
            });

            const hariDalamBulan = getDaysInMonth(bulan);
            const kehadiranScore = Math.min(20, ((rekap.totalHadirScore || 0) / hariDalamBulan) * 20);

            const maxPenghasilan = Math.max(stats.maxPenghasilan || 0, 1);
            const maxNota = Math.max(stats.maxNota || 0, 1);
            const maxTrxMitra = Math.max(stats.maxTrxMitra || 0, 1);

            const totalPenghasilanScore = Math.min(20, (totalPenghasilan / maxPenghasilan) * 20);
            const totalNotaScore = Math.min(20, (totalNota / maxNota) * 20);
            const trxMitraScore = Math.min(20, (trxMitra / maxTrxMitra) * 20);

            const totalOffGabungan = (rekap.totalOff || 0) + (rekap.totalIzin || 0) + (rekap.totalSakit || 0);
            const offScore = totalOffGabungan <= 3
                ? 20
                : Math.max(0, 20 - ((totalOffGabungan - 3) * 2));

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

            const cocokKurir = (obj) => {
                const idKurir = norm(obj?.idKurir || obj?.kurirId || obj?.id);
                const username = norm(obj?.username || obj?.kurirUsername);
                const nama = norm(obj?.nama || obj?.namaKurir);
                return target === idKurir || target === username || target === nama;
            };

            // ABSENSI
            Object.values(cloudAbsensiList || {}).forEach(a => {
                if (!a) return;

                const tgl = (a.tanggal || '').trim();
                if (!tgl || tgl.slice(0, 7) !== bulan) return;
                if (!cocokKurir(a)) return;

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

                const tglMulai = (j.tanggalMulai || '').trim();
                const tglSelesai = (j.tanggalSelesai || tglMulai || '').trim();
                if (!tglMulai || tglMulai.slice(0, 7) !== bulan) return;

                const namaKurir = norm(j.nama || j.namaKurir || j.kurirNama);
                const usernameKurir = norm(j.username || j.kurirUsername);
                const idKurir = norm(j.idKurir || j.kurirId || j.id);
                if (target !== namaKurir && target !== usernameKurir && target !== idKurir) return;

                const jenisOff = norm(j.jenisOff);
                const statusOff = norm(j.status);

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
                let totalPenghasilan = 0;
                let trxMitra = 0;

                Object.values(cloudNotaList || {}).forEach(n => {
                    if (!isValidNotaItem(n)) return;
                    if (!n.tanggalRaw || n.tanggalRaw.slice(0, 7) !== bulan) return;

                    const notaUsername = norm(n.kurirUsername);
                    const notaNama = norm(n.kurirNama);
                    const notaId = norm(n.kurirId);
                    if (notaUsername !== username && notaNama !== norm(nama) && notaId !== idKurir) return;

                    totalNota++;
                    const ongkir = parseInt(n.ongkir) || 0;
                    const biaya = (n.biayaTambahan || []).reduce((a, b) => a + (parseInt(b.nominal) || 0), 0);
                    totalPenghasilan += (ongkir + biaya);
                });

                Object.values(cloudLogMitra || {}).forEach(log => {
                    if (!log || !log.tglRaw) return;
                    if (log.tglRaw.slice(0, 7) !== bulan) return;

                    const logUsername = norm(log.kurirUsername);
                    const logNama = norm(log.kurirNama);
                    const logId = norm(log.kurirId);
                    if (logUsername !== username && logNama !== norm(nama) && logId !== idKurir) return;

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
                    totalIzin: rekap.totalIzin,
                    totalSakit: rekap.totalSakit,
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

            const finalData = rawData
                .map(item => {
                    const finalRow = calcKpiForKurir(item.nama || item.id || item.username, bulan, stats);
                    return {
                        ...item,
                        ...finalRow,
                        id: item.id
                    };
                })
                .sort((a, b) => {
                    if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
                    if ((b.trxMitra || 0) !== (a.trxMitra || 0)) return (b.trxMitra || 0) - (a.trxMitra || 0);
                    if ((b.totalNota || 0) !== (a.totalNota || 0)) return (b.totalNota || 0) - (a.totalNota || 0);
                    return (a.nama || '').localeCompare(b.nama || '');
                });

            return finalData;
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
                ['penghargaan', 'top5', 'ranking', 'rekapjadwal'].forEach(key => {
                    const btn = document.getElementById('kpi-tab-' + key);
                    if (!btn) return;
                    if (key === section) {
                        btn.className = 'kpi-tab active';
                    } else {
                        btn.className = 'kpi-tab';
                    }
                });
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
                    const namaBulanLabel = new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                    const totalHadir = rekap.reduce((a, r) => a + (r.kehadiran || 0), 0);
                    const totalOffAll = rekap.reduce((a, r) => a + (r.totalOff || 0), 0);
                    const totalTanpaOffAll = rekap.reduce((a, r) => a + (r.totalTidakAmbilOff || 0), 0);

                    container.innerHTML = `
                        <div class="space-y-3">
                            <div class="rounded-3xl p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-xl shadow-emerald-600/25 text-white relative overflow-hidden">
                                <div class="pointer-events-none absolute inset-0 opacity-[0.10]" style="background-image:radial-gradient(circle,#fff 1.5px,transparent 1.5px);background-size:16px 16px;"></div>
                                <div class="relative flex items-center gap-3 mb-3">
                                    <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><i data-lucide="calendar-days" class="w-5 h-5"></i></div>
                                    <div class="min-w-0">
                                        <div class="text-[9px] font-black uppercase tracking-widest text-white/70">Rekap Jadwal Kurir</div>
                                        <div class="text-sm font-black">${namaBulanLabel}</div>
                                    </div>
                                </div>
                                <div class="relative grid grid-cols-3 gap-2">
                                    <div class="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                                        <div class="text-[9px] font-bold uppercase text-white/70">Total Hadir</div>
                                        <div class="text-base font-black mt-0.5">${totalHadir}</div>
                                    </div>
                                    <div class="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                                        <div class="text-[9px] font-bold uppercase text-white/70">Total Off</div>
                                        <div class="text-base font-black mt-0.5">${totalOffAll}</div>
                                    </div>
                                    <div class="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                                        <div class="text-[9px] font-bold uppercase text-white/70">Tanpa Off</div>
                                        <div class="text-base font-black mt-0.5">${totalTanpaOffAll}</div>
                                    </div>
                                </div>
                            </div>

                            ${rekap.length ? rekap.map((r, i) => {
                                const initial = (r.namaKurir || '?').trim().charAt(0).toUpperCase();
                                const rank = i + 1;
                                const crownClass = rank === 1 ? 'rank-crown-1' : rank === 2 ? 'rank-crown-2' : rank === 3 ? 'rank-crown-3' : 'rank-crown-default';
                                return `
                                <div class="rekap-jadwal-card bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
                                    <div class="rjc-glow"></div>
                                    <div class="relative flex items-start justify-between gap-3">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            <div class="w-10 h-10 rounded-2xl ${crownClass} flex items-center justify-center text-white font-black text-xs shrink-0">
                                                ${initial}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-sm truncate">${r.namaKurir}</div>
                                                <div class="text-[10px] text-slate-400 truncate flex items-center gap-1"><i data-lucide="crown" class="w-2.5 h-2.5"></i>${r.leader || '-'}</div>
                                            </div>
                                        </div>
                                        <div class="text-right shrink-0">
                                            <div class="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Kehadiran</div>
                                            <div class="text-xl font-black text-emerald-500 leading-none">${r.kehadiran}</div>
                                        </div>
                                    </div>
                                    <div class="relative grid grid-cols-3 gap-2">
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-slate-100 dark:bg-slate-800 text-slate-500"><i data-lucide="calendar-off" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Total Off</div>
                                            <div class="rms-value">${r.totalOff}</div>
                                        </div>
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-rose-100 dark:bg-rose-950/40 text-rose-500"><i data-lucide="alert-triangle" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Tanpa Off</div>
                                            <div class="rms-value text-rose-500">${r.totalTidakAmbilOff}</div>
                                        </div>
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-amber-100 dark:bg-amber-950/40 text-amber-500"><i data-lucide="hand" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Izin</div>
                                            <div class="rms-value text-amber-500">${r.totalIzin}</div>
                                        </div>
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-blue-100 dark:bg-blue-950/40 text-blue-500"><i data-lucide="thermometer" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Sakit</div>
                                            <div class="rms-value text-blue-500">${r.totalSakit}</div>
                                        </div>
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500"><i data-lucide="log-in" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Absen Masuk</div>
                                            <div class="rms-value">${r.totalAbsenMasuk}</div>
                                        </div>
                                        <div class="rekap-mini-stat">
                                            <div class="rms-icon bg-violet-100 dark:bg-violet-950/40 text-violet-500"><i data-lucide="log-out" class="w-3 h-3"></i></div>
                                            <div class="rms-label">Absen Pulang</div>
                                            <div class="rms-value">${r.totalAbsenPulang}</div>
                                        </div>
                                    </div>
                                </div>
                            `; }).join('') : `
                                <div class="text-center py-8 space-y-1 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div class="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="calendar-x" class="w-5 h-5"></i></div>
                                    <p class="text-xs text-slate-400">Belum ada data rekap jadwal.</p>
                                </div>
                            `}
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                if (section === 'penghargaan') {
                    const testimoniTerbaik = getTestimoniTerbaik(bulan);
                    const namaBulanLabel = new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                    // Susunan podium: kiri #2, tengah #1 (paling tinggi), kanan #3
                    const podiumOrder = [
                        { d: top2, rank: 2, medal: '🥈', barH: 'h-14', grad: 'from-slate-300 to-slate-400', ring: 'ring-slate-300' },
                        { d: top1, rank: 1, medal: '🥇', barH: 'h-20', grad: 'from-yellow-300 to-amber-400', ring: 'ring-amber-300' },
                        { d: top3, rank: 3, medal: '🥉', barH: 'h-10', grad: 'from-orange-300 to-orange-400', ring: 'ring-orange-300' }
                    ];

                    const awardCards = [
                        {
                            icon: '💬', tone: 'from-pink-400 to-rose-500', label: 'Testimoni Terbaik',
                            nama: testimoniTerbaik?.nama, metric: testimoniTerbaik ? `⭐ ${testimoniTerbaik.avgRating.toFixed(1)}/5 · ${testimoniTerbaik.jumlah} testimoni` : '-',
                            metricClass: 'text-rose-500 dark:text-rose-400'
                        },
                        {
                            icon: '🏪', tone: 'from-indigo-400 to-blue-500', label: 'Trx Mitra Terbanyak',
                            nama: topTrxMitra?.nama, metric: `${topTrxMitra?.trxMitra || 0} transaksi`,
                            metricClass: 'text-indigo-500 dark:text-indigo-400'
                        },
                        {
                            icon: '🔥', tone: 'from-orange-400 to-amber-500', label: 'Kurir Paling Aktif',
                            nama: topAktif?.nama, metric: `Rating ${topAktif?.rating || 0}%`,
                            metricClass: 'text-orange-500 dark:text-orange-400'
                        }
                    ];

                    container.innerHTML = `
                        <div class="space-y-4">
                            <!-- HERO: Kurir Terbaik Bulan Ini -->
                            <div class="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-xl shadow-amber-500/30">
                                <div class="pointer-events-none absolute inset-0 opacity-[0.12]" style="background-image:radial-gradient(circle,#fff 1.5px,transparent 1.5px);background-size:16px 16px;"></div>
                                <div class="relative flex items-center gap-4">
                                    <div class="relative w-[68px] h-[68px] shrink-0 rounded-[22px] bg-white/25 ring-4 ring-white/40 flex items-center justify-center backdrop-blur-sm shadow-lg">
                                        <span class="text-xl font-black text-white drop-shadow-sm">${getKpiAvatarName(topKurirTerbaik?.nama || '')}</span>
                                        <div class="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md text-base">👑</div>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="text-[9px] font-black uppercase tracking-widest text-amber-900/70">🏆 Kurir Terbaik Bulan Ini</div>
                                        <div class="text-xl font-black text-amber-950 truncate mt-0.5">${topKurirTerbaik?.nama || '-'}</div>
                                        <div class="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full bg-white/45 text-[10px] font-black text-amber-900">
                                            ${topKurirTerbaik ? `${getRatingBadge(topKurirTerbaik.rating).emoji} ${Number(topKurirTerbaik.rating).toFixed(1)}% • ${getRatingBadge(topKurirTerbaik.rating).label}` : 'Belum ada data'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- PODIUM TOP 3 -->
                            <div class="rounded-3xl p-4 bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><i data-lucide="award" class="w-3.5 h-3.5 text-amber-500"></i> Podium Ranking</h4>
                                    <span class="text-[9px] font-bold text-slate-400">${namaBulanLabel}</span>
                                </div>
                                <div class="flex items-end justify-center gap-2.5">
                                    ${podiumOrder.map(p => `
                                        <div class="flex flex-col items-center flex-1 min-w-0">
                                            <div class="text-xl leading-none">${p.medal}</div>
                                            <div class="w-11 h-11 -mt-1 rounded-full bg-gradient-to-br ${p.grad} flex items-center justify-center text-sm font-black text-white shadow-md ring-2 ring-white dark:ring-darkCard">
                                                ${p.d ? getKpiAvatarName(p.d.nama) : '-'}
                                            </div>
                                            <div class="text-[10px] font-bold mt-1.5 text-center truncate w-full px-0.5">${p.d?.nama || '-'}</div>
                                            <div class="text-[9px] font-black text-slate-400">${p.d ? Number(p.d.rating).toFixed(1) + '%' : '-'}</div>
                                            <div class="w-full ${p.barH} rounded-t-2xl bg-gradient-to-b ${p.grad} mt-2 flex items-start justify-center pt-1.5 shadow-inner">
                                                <span class="text-white font-black text-base drop-shadow-sm">${p.rank}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- GRID PENGHARGAAN LAIN -->
                            <div>
                                <h4 class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-violet-500"></i> Penghargaan Lainnya</h4>
                                <div class="grid grid-cols-1 gap-2.5">
                                    ${awardCards.map(a => `
                                        <div class="rounded-2xl p-3.5 bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                                            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br ${a.tone} flex items-center justify-center text-lg shrink-0 shadow-md">
                                                ${a.icon}
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">${a.label}</div>
                                                <div class="text-sm font-black truncate">${a.nama || '-'}</div>
                                            </div>
                                            <div class="text-[10px] font-black shrink-0 ${a.metricClass}">${a.metric}</div>
                                        </div>
                                    `).join('')}
                                </div>
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
                            <p><b>3. Total Nota (20%)</b> = Jumlah nota bulanan yang berhasil diinput.</p>
                            <p><b>4. Trx Mitra (20%)</b> = Total transaksi mitra bulanan.</p>
                            <p><b>5. Total OFF / Izin / Sakit (20%)</b> = Normal maksimal 3/bulan, lebih dari itu poin berkurang.</p>
                        </div>
                    </div>
                `;
            } finally {
                if (window.lucide) lucide.createIcons();
                isRenderKpiRunning = false;
            }
        };

        // ===================================================================
        // STATISTIK & PERINGKAT KURIR — khusus untuk akun kurir yang sedang login.
        // Menampilkan posisi ranking bulan ini, naik/turun dibanding bulan lalu,
        // rincian skor, dan mini leaderboard di sekitar posisinya.
        // ===================================================================
        function getPrevMonthStr(ym) {
            let [y, m] = (ym || '').split('-').map(Number);
            if (!y || !m) return ym;
            m -= 1;
            if (m === 0) { m = 12; y -= 1; }
            return `${y}-${String(m).padStart(2, '0')}`;
        }

        window.renderStatistikKurir = function() {
            if (!userSession || userSession.role !== 'kurir') return;

            const bulan = getWibRawDate().slice(0, 7);
            const bulanPrev = getPrevMonthStr(bulan);
            const norm = (v) => (v || '').toString().trim().toLowerCase();
            const myUsername = norm(userSession.username);
            const myId = norm(userSession.id);
            const myNama = norm(userSession.nama);

            const dataNow = buildKPIData(bulan);
            const dataPrev = buildKPIData(bulanPrev);

            const matchMe = (row) => norm(row.id) === myId || norm(row.username) === myUsername || norm(row.nama) === myNama;

            const idxNow = dataNow.findIndex(matchMe);
            const idxPrev = dataPrev.findIndex(matchMe);

            const bulanLabelEl = document.getElementById('statistik-bulan-label');
            if (bulanLabelEl) {
                const namaBulan = new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                bulanLabelEl.innerText = 'Periode ' + namaBulan;
            }

            const rankNumberEl = document.getElementById('statistik-rank-number');
            const rankTotalEl = document.getElementById('statistik-rank-total');
            const deltaBadgeEl = document.getElementById('statistik-delta-badge');

            if (idxNow === -1) {
                if (rankNumberEl) rankNumberEl.innerText = '-';
                if (rankTotalEl) rankTotalEl.innerText = 'Belum ada data KPI bulan ini';
                if (deltaBadgeEl) deltaBadgeEl.innerHTML = '';
                const breakdownEl = document.getElementById('statistik-breakdown');
                if (breakdownEl) breakdownEl.innerHTML = '<div class="text-center text-xs text-slate-400 py-4">Belum ada aktivitas yang tercatat bulan ini.</div>';
                const boardEl = document.getElementById('statistik-leaderboard');
                if (boardEl) boardEl.innerHTML = '';
                return;
            }

            const me = dataNow[idxNow];
            const rankNow = idxNow + 1;
            const total = dataNow.length;

            if (rankNumberEl) rankNumberEl.innerText = rankNow;
            if (rankTotalEl) rankTotalEl.innerText = `dari ${total} kurir aktif`;

            if (deltaBadgeEl) {
                if (idxPrev === -1) {
                    deltaBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mx-auto bg-slate-100 dark:bg-slate-800 text-slate-500';
                    deltaBadgeEl.innerHTML = '<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Belum ada data bulan lalu';
                } else {
                    const rankPrev = idxPrev + 1;
                    const delta = rankPrev - rankNow; // positif = naik peringkat
                    if (delta > 0) {
                        deltaBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mx-auto bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600';
                        deltaBadgeEl.innerHTML = `<i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> Naik ${delta} peringkat`;
                    } else if (delta < 0) {
                        deltaBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mx-auto bg-rose-50 dark:bg-rose-950/40 text-rose-500';
                        deltaBadgeEl.innerHTML = `<i data-lucide="arrow-down-right" class="w-3.5 h-3.5"></i> Turun ${Math.abs(delta)} peringkat`;
                    } else {
                        deltaBadgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mx-auto bg-slate-100 dark:bg-slate-800 text-slate-500';
                        deltaBadgeEl.innerHTML = '<i data-lucide="minus" class="w-3.5 h-3.5"></i> Tetap dari bulan lalu';
                    }
                }
            }

            const badge = getRatingBadge(me.rating || 0);
            const badgeEmojiEl = document.getElementById('statistik-badge-emoji');
            const badgeLabelEl = document.getElementById('statistik-badge-label');
            const ratingNumberEl = document.getElementById('statistik-rating-number');
            const ratingBarEl = document.getElementById('statistik-rating-bar');

            if (badgeEmojiEl) badgeEmojiEl.innerText = badge.emoji;
            if (badgeLabelEl) { badgeLabelEl.innerText = badge.label; badgeLabelEl.className = 'text-sm font-black ' + badge.color; }
            if (ratingNumberEl) ratingNumberEl.innerText = (me.rating || 0) + ' / 100';
            if (ratingBarEl) {
                ratingBarEl.style.width = Math.min(100, me.rating || 0) + '%';
                ratingBarEl.className = 'h-full rounded-full transition-all duration-500 ' + progressColor(me.rating || 0);
            }

            const breakdownEl = document.getElementById('statistik-breakdown');
            if (breakdownEl) {
                const rows = [
                    { label: 'Kehadiran', icon: 'calendar-check', score: me.kehadiranScore || 0, color: 'bg-blue-500' },
                    { label: 'Total Penghasilan', icon: 'wallet', score: me.totalPenghasilanScore || 0, color: 'bg-emerald-500', extra: 'Rp ' + (me.totalPenghasilan || 0).toLocaleString('id-ID') },
                    { label: 'Total Nota', icon: 'file-text', score: me.totalNotaScore || 0, color: 'bg-indigo-500', extra: (me.totalNota || 0) + ' nota' },
                    { label: 'Transaksi Mitra', icon: 'store', score: me.trxMitraScore || 0, color: 'bg-amber-500', extra: (me.trxMitra || 0) + ' trx' },
                    { label: 'Kedisiplinan (Off/Izin/Sakit)', icon: 'shield-check', score: me.offScore || 0, color: 'bg-purple-500' }
                ];
                breakdownEl.innerHTML = rows.map(r => `
                    <div class="space-y-1">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><i data-lucide="${r.icon}" class="w-3.5 h-3.5 text-slate-400"></i> ${r.label}${r.extra ? ` <span class="text-slate-400">(${r.extra})</span>` : ''}</span>
                            <span class="font-bold text-slate-700 dark:text-slate-200">${r.score.toFixed(1)}/20</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full ${r.color}" style="width:${Math.min(100, (r.score / 20) * 100)}%"></div>
                        </div>
                    </div>
                `).join('');
            }

            const boardEl = document.getElementById('statistik-leaderboard');
            if (boardEl) {
                const startIdx = Math.max(0, idxNow - 1);
                const endIdx = Math.min(dataNow.length, idxNow + 2);
                const slice = dataNow.slice(startIdx, endIdx);
                boardEl.innerHTML = slice.map((row, i) => {
                    const rank = startIdx + i + 1;
                    const isMe = (startIdx + i) === idxNow;
                    return `
                        <div class="flex items-center gap-2.5 p-2.5 rounded-xl ${isMe ? 'bg-blue-50 dark:bg-blue-950/30 ring-1 ring-primary/30' : 'bg-slate-50 dark:bg-slate-800/50'}">
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${isMe ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${rank}</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[11px] font-bold truncate ${isMe ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}">${row.nama || '-'}${isMe ? ' (Kamu)' : ''}</p>
                            </div>
                            <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">${(row.rating || 0).toFixed(1)}</div>
                        </div>
                    `;
                }).join('');
            }

            if (window.lucide) lucide.createIcons();
        };

        window.saveDataManajemen = function() {
            const idEdit = document.getElementById('manajemen-id-edit').value;
            const kategori = document.getElementById('manajemen-kategori').value;
            const nama = document.getElementById('manajemen-nama').value.trim();
            const username = document.getElementById('manajemen-username').value.trim().toLowerCase();
            const password = document.getElementById('manajemen-password').value.trim();
            const status = document.getElementById('manajemen-status').value;
        
            if (!kategori || !nama || !username || !password) {
                toast('Lengkapi semua data!');
                return;
            }
        
            const payload = { kategori, nama, username, password, status };
        
            if (idEdit) {
                update(ref(db, `manajemen_sahabatku/${idEdit}`), payload)
                    .then(() => {
                        toast('Data berhasil diperbarui!');
                        resetFormManajemen();
                        setTimeout(() => {
                            if (typeof renderAdminManajemen === 'function') renderAdminManajemen();
                        }, 300);
                    })
                    .catch(err => toast('Gagal update: ' + err.message));
            } else {
                push(ref(db, 'manajemen_sahabatku'), payload)
                    .then(() => {
                        toast('Data berhasil disimpan!');
                        resetFormManajemen();
                        setTimeout(() => {
                            if (typeof renderAdminManajemen === 'function') renderAdminManajemen();
                        }, 300);
                    })
                    .catch(err => toast('Gagal simpan: ' + err.message));
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
        
            if (!id) return toast('Data manajemen tidak ditemukan!');
            if (!kategori || !nama || !username || !password) return toast('Lengkapi semua data!');
        
            update(ref(db, `manajemen_sahabatku/${id}`), {
                kategori,
                nama,
                username,
                password,
                status
            }).then(() => {
                toast('Data manajemen berhasil diperbarui!');
                closeEditManajemenModal();
            }).catch(err => {
                toast('Gagal update: ' + err.message);
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
        window.toggleNotifKurirChip = function(nama) {
            const checkbox = document.querySelector(`.notif-kurir-check[value="${CSS.escape(nama)}"]`);
            if (checkbox) checkbox.checked = !checkbox.checked;
            populateNotifKurirList();
        };

        function populateNotifKurirList() {
        const container = document.getElementById('notif-kurir-picker');
        const counter = document.getElementById('notif-kurir-selected-count');
        if (!container) return;

        // Simpan status centang yang sudah ada sebelum di-render ulang
        const previouslyChecked = new Set(
            Array.from(document.querySelectorAll('.notif-kurir-check:checked')).map(el => el.value)
        );

        const keyword = (document.getElementById('notif-kurir-search')?.value || '').toLowerCase().trim();

        const kurirList = Object.entries(cloudKurirList || {})
            .filter(([_, u]) => u && u.role === 'kurir' && u.status === 'aktif')
            .map(([id, u]) => ({ id, nama: u.nama || u.username || id, leader: u.leader || '-' }))
            .filter(k => !keyword || k.nama.toLowerCase().includes(keyword))
            .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

        if (!kurirList.length) {
            container.innerHTML = '<div class="text-center text-[10px] text-slate-400 py-4">Tidak ada kurir yang cocok.</div>';
        } else {
            container.innerHTML = kurirList.map(kurir => {
                const isChecked = previouslyChecked.has(kurir.nama);
                const initial = (kurir.nama || '?').trim().charAt(0).toUpperCase();
                return `
                    <div class="notif-kurir-chip-item ${isChecked ? 'is-checked' : ''}" onclick="toggleNotifKurirChip('${kurir.nama.replace(/'/g, "\\'")}')">
                        <input type="checkbox" class="notif-kurir-check hidden" value="${kurir.nama}" ${isChecked ? 'checked' : ''}>
                        <div class="nci-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="nci-avatar">${initial}</div>
                        <div class="min-w-0 flex-1">
                            <div class="nci-name truncate">${kurir.nama}</div>
                            <div class="nci-sub truncate">Leader: ${kurir.leader}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (counter) {
            const totalChecked = document.querySelectorAll('.notif-kurir-check:checked').length;
            counter.innerHTML = `<i data-lucide="users" class="w-3 h-3"></i> ${totalChecked} dipilih`;
        }
        if (window.lucide) lucide.createIcons();
        }
        window.saveNotification = function() {
        const target = document.getElementById('notif-target').value;
        const message = document.getElementById('notif-message').value.trim();

        if (!message) {
            toast('Isi pesan notifikasi wajib diisi!');
            return;
        }

        let targetList = [];
        if (target === 'selected') {
            const checkboxes = document.querySelectorAll('.notif-kurir-check:checked');
            targetList = Array.from(checkboxes).map(checkbox => checkbox.value);
            if (!targetList.length) {
            toast('Pilih minimal 1 kurir!');
            return;
            }
        }

        const sender = getSenderInfo();

        const payload = {
            target,
            targetList,
            message,
            type: 'warning',
            active: true,
            createdAt: new Date().toISOString(),
            senderRole: sender.senderRole,
            senderLabel: sender.senderLabel,
            senderNama: sender.senderNama
        };

        push(ref(db, 'notifications_admin'), payload)
            .then(() => {
            toast('Notifikasi berhasil dikirim!');
            resetNotifForm();
            })
            .catch(err => toast('Gagal kirim notifikasi: ' + err.message));
        };
                
        window.hapusDataManajemen = async function(key) {
            const ok = await showConfirm('Hapus data ini?');
            if (ok) {
                remove(ref(db, `manajemen_sahabatku/${key}`))
                    .then(() => toast('Data berhasil dihapus!'))
                    .catch(err => toast('Gagal hapus: ' + err.message));
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
            const leaderScreen = document.getElementById('screen-admin-leader');
            const manajemenCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-manajemen"]');
            const leaderCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-leader"]');
            const ongkirCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-ongkir"]');
            const orderDepositCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-order-deposit"]');

            const mitraForm = document.querySelector('#screen-admin-mitra > .bg-white');
            
            if (badge) {
                if (kategoriFixed === 'Owner') badge.innerText = 'Owner';
                else if (kategoriFixed === 'Head Operasional') badge.innerText = 'Head Operasional';
                else if (kategoriFixed === 'HRD') badge.innerText = 'HRD';
                else badge.innerText = kategoriFixed || 'Manajemen';
            }

            if (kategoriFixed === 'Owner' || kategoriFixed === 'Head Operasional') {
                const allScreenIds = [
                    'screen-admin-kurir', 'screen-admin-manajemen', 'screen-admin-leader', 'screen-admin-nota',
                    'screen-admin-mitra', 'screen-admin-laporan', 'screen-admin-tracking',
                    'screen-admin-kpi', 'screen-admin-testimonial', 'screen-admin-notifikasi',
                    'screen-admin-absensi', 'screen-admin-ongkir', 'screen-admin-order-deposit', 'screen-pengaturan'
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
                if (leaderCardBtn) leaderCardBtn.classList.remove('hidden');
                if (ongkirCardBtn) ongkirCardBtn.classList.remove('hidden');
                if (orderDepositCardBtn) orderDepositCardBtn.classList.remove('hidden');

                if (kategoriFixed === 'Head Operasional') {
                    if (manajemenScreen) {
                        manajemenScreen.classList.add('hidden');
                        manajemenScreen.querySelectorAll('button').forEach(btn => {
                            btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                        });
                    }
                    if (leaderScreen) {
                        leaderScreen.classList.add('hidden');
                        leaderScreen.querySelectorAll('button').forEach(btn => {
                            btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                        });
                    }
                    if (manajemenCardBtn) manajemenCardBtn.classList.add('hidden');
                    if (leaderCardBtn) leaderCardBtn.classList.add('hidden');
                    if (ongkirCardBtn) ongkirCardBtn.classList.add('hidden');

                    const orderDepositCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-order-deposit"]');
                    if (orderDepositCardBtn) orderDepositCardBtn.classList.add('hidden');

                    const orderDepositScreen = document.getElementById('screen-admin-order-deposit');
                    if (orderDepositScreen) {
                        orderDepositScreen.classList.add('hidden');
                        orderDepositScreen.querySelectorAll('button').forEach(btn => {
                            btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                        });
                    }

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
                    'screen-admin-kurir',
                    'screen-admin-tracking',
                    'screen-admin-kpi',
                    'screen-admin-testimonial',
                    'screen-admin-absensi'
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
                    'screen-admin-manajemen',
                    'screen-admin-leader',
                    'screen-admin-nota',
                    'screen-admin-mitra',
                    'screen-admin-laporan',
                    'screen-admin-notifikasi',
                    'screen-admin-ongkir',
                    'screen-admin-order-deposit'
                ];

                hiddenForHRD.forEach(id => {
                    const screen = document.getElementById(id);
                    if (!screen) return;
                    screen.classList.add('hidden');
                    screen.querySelectorAll('button').forEach(btn => {
                        btn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                    });
                });

                const manajemenCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-manajemen"]');
                const leaderCardBtnHRD = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-leader"]');
                const ongkirCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-ongkir"]');
                const orderDepositCardBtn = document.querySelector('#screen-admin-dashboard button[onclick*="screen-admin-order-deposit"]');

                if (manajemenCardBtn) manajemenCardBtn.classList.add('hidden');
                if (leaderCardBtnHRD) leaderCardBtnHRD.classList.add('hidden');
                if (ongkirCardBtn) ongkirCardBtn.classList.add('hidden');
                if (orderDepositCardBtn) orderDepositCardBtn.classList.add('hidden');

                return;
            }

            console.log('Kategori manajemen tidak dikenali:', kategoriFixed);
        };
        window.openPopupPenilaianLeader = function() {
            navigateTo('screen-admin-leader');
            switchLeaderTab('penilaian');
        };

        window.closePopupPenilaianLeader = function() {
            navigateBack();
        };

        window.switchLeaderTab = function(tab) {
            const panelDaftar = document.getElementById('panel-leader-daftar');
            const panelPenilaian = document.getElementById('panel-leader-penilaian');
            const tabDaftar = document.getElementById('tab-leader-daftar');
            const tabPenilaian = document.getElementById('tab-leader-penilaian');
            if (!panelDaftar || !panelPenilaian || !tabDaftar || !tabPenilaian) return;

            const activeClasses = ['bg-primary', 'text-white', 'shadow-sm'];
            const inactiveClasses = ['text-slate-500', 'dark:text-slate-400'];

            if (tab === 'penilaian') {
                panelDaftar.classList.add('hidden');
                panelPenilaian.classList.remove('hidden');
                tabPenilaian.classList.add(...activeClasses);
                tabPenilaian.classList.remove(...inactiveClasses);
                tabDaftar.classList.remove(...activeClasses);
                tabDaftar.classList.add(...inactiveClasses);

                const bulan = document.getElementById('leader-penilaian-bulan');
                if (bulan && !bulan.value) bulan.value = getWibRawDate().substring(0, 7);
                if (typeof renderPenilaianLeader === 'function') renderPenilaianLeader();
            } else {
                panelPenilaian.classList.add('hidden');
                panelDaftar.classList.remove('hidden');
                tabDaftar.classList.add(...activeClasses);
                tabDaftar.classList.remove(...inactiveClasses);
                tabPenilaian.classList.remove(...activeClasses);
                tabPenilaian.classList.add(...inactiveClasses);

                if (typeof populateAnggotaDropdownLeader === 'function') populateAnggotaDropdownLeader();
                if (typeof renderLeaderList === 'function') renderLeaderList();
            }
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
                const rank = i + 1;
                const crownClass = rank === 1 ? 'rank-crown-1' : rank === 2 ? 'rank-crown-2' : rank === 3 ? 'rank-crown-3' : 'rank-crown-default';
                const cardRankClass = rank <= 3 ? `is-rank-${rank}` : '';
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                const initial = (d.namaLeader || '?').trim().charAt(0).toUpperCase();
        
                return `
                    <div class="leader-score-card ${cardRankClass} bg-white dark:bg-darkCard p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="relative w-11 h-11 rounded-2xl ${crownClass} flex items-center justify-center text-white font-black text-sm shrink-0">
                                    ${initial}
                                    <span class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[10px] shadow-sm">${rank <= 3 ? medal : rank}</span>
                                </div>
                                <div class="min-w-0">
                                    <div class="font-bold text-sm truncate">${d.namaLeader}</div>
                                    <div class="text-[10px] text-slate-400 truncate flex items-center gap-1"><i data-lucide="at-sign" class="w-2.5 h-2.5"></i>${d.leaderUsername}</div>
                                </div>
                            </div>
        
                            <div class="text-right shrink-0">
                                <div class="text-xl font-black text-primary leading-none">${d.skorAkhir}%</div>
                                <div class="text-[10px] font-bold mt-1 ${badge.color || 'text-slate-500'}">
                                    ${badge.emoji} ${badge.label}
                                </div>
                            </div>
                        </div>

                        <div class="space-y-1.5">
                            <div class="flex justify-between text-[9px] font-bold uppercase text-slate-400 tracking-wide">
                                <span>Progress Skor</span>
                                <span>${d.skorAkhir}%</span>
                            </div>
                            <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="h-full ${crownClass} rounded-full transition-all" style="width:${d.skorAkhir}%"></div>
                            </div>
                        </div>
        
                        <div class="grid grid-cols-3 gap-2">
                            <div class="leader-stat-tile">
                                <div class="lst-label">Skor Dasar</div>
                                <div class="lst-value">${d.leaderRating}</div>
                            </div>
                            <div class="leader-stat-tile">
                                <div class="lst-label">Bonus Top</div>
                                <div class="lst-value text-emerald-500">+${d.bonusTopRanking}</div>
                            </div>
                            <div class="leader-stat-tile">
                                <div class="lst-label">Anggota</div>
                                <div class="lst-value">${d.anggotaCount}</div>
                            </div>
                        </div>
        
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div class="leader-stat-tile">
                                <div class="lst-label flex items-center gap-1"><i data-lucide="calendar-check" class="w-2.5 h-2.5"></i>Hadir</div>
                                <div class="lst-value">${d.totalKehadiranAnggota}</div>
                            </div>
                            <div class="leader-stat-tile">
                                <div class="lst-label flex items-center gap-1"><i data-lucide="wallet" class="w-2.5 h-2.5"></i>Penghasilan</div>
                                <div class="lst-value text-emerald-600 dark:text-emerald-400 truncate">Rp ${d.totalPenghasilanAnggota.toLocaleString('id-ID')}</div>
                            </div>
                            <div class="leader-stat-tile">
                                <div class="lst-label flex items-center gap-1"><i data-lucide="receipt" class="w-2.5 h-2.5"></i>Nota</div>
                                <div class="lst-value">${d.totalNotaAnggota}</div>
                            </div>
                            <div class="leader-stat-tile">
                                <div class="lst-label flex items-center gap-1"><i data-lucide="store" class="w-2.5 h-2.5"></i>Trx Mitra</div>
                                <div class="lst-value">${d.totalTrxMitraAnggota}</div>
                            </div>
                        </div>

                        <div class="leader-stat-tile">
                            <div class="lst-label flex items-center gap-1"><i data-lucide="calendar-x" class="w-2.5 h-2.5"></i>Total OFF / Izin / Sakit</div>
                            <div class="lst-value">${d.totalOffAnggota}</div>
                        </div>

                        <div>
                            <div class="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                                <i data-lucide="users-round" class="w-3 h-3"></i> Anggota &amp; Badge
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                            ${anggotaList.length
                                ? anggotaList.map(a => {
                                    const badgeA = getRatingBadge(a.rating);
                                    const initA = (a.nama || '?').trim().charAt(0).toUpperCase();
                                    return `
                                    <span class="anggota-chip">
                                        <span class="ac-avatar">${initA}</span>
                                        <span>${a.nama}</span>
                                        <span class="text-slate-400">•</span>
                                        <span>${a.rating}%</span>
                                        <span>${badgeA.emoji}</span>
                                    </span>
                                    `;
                                }).join('')
                                : '<span class="text-[10px] text-slate-400">Belum ada anggota.</span>'
                            }
                            </div>
                        </div>
        
                        <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-dashed border-slate-100 dark:border-slate-800 pt-2.5 space-y-0.5">
                            <p class="flex items-start gap-1"><i data-lucide="info" class="w-3 h-3 mt-0.5 shrink-0"></i><span><b class="text-slate-600 dark:text-slate-300">Leader Score</b> = total rating anggota + bonus Top 3 anggota. Anggota nonaktif/blokir tidak dihitung.</span></p>
                        </div>
                    </div>
                `;
            }).join('');
            if (window.lucide) lucide.createIcons();
        };
        // Set nama anggota yang sedang dicentang di form Tambah/Edit Leader (menggantikan <select multiple>)
        let leaderAnggotaSelected = new Set();

        window.resetLeaderForm = function() {
            document.getElementById('leader-id-edit').value = '';
            document.getElementById('leader-nama').value = '';
            const searchEl = document.getElementById('leader-anggota-search');
            if (searchEl) searchEl.value = '';
            leaderAnggotaSelected = new Set();
            const modeEl = document.getElementById('leader-form-mode');
            if (modeEl) modeEl.innerText = 'Mode: Tambah leader baru';
            renderLeaderAnggotaOptions();
        };

        window.toggleLeaderAnggota = function(nama, lockedTo) {
            if (lockedTo) {
                toast(`${nama} sudah menjadi anggota leader "${lockedTo}". Hapus dari leader itu dulu.`);
                return;
            }
            if (leaderAnggotaSelected.has(nama)) {
                leaderAnggotaSelected.delete(nama);
            } else {
                leaderAnggotaSelected.add(nama);
            }
            renderLeaderAnggotaOptions();
        };

        window.renderLeaderAnggotaOptions = function() {
            const list = document.getElementById('leader-anggota-list');
            const counter = document.getElementById('leader-anggota-counter');
            if (!list) return;

            const keyword = (document.getElementById('leader-anggota-search')?.value || '').toLowerCase().trim();
            const idEdit = document.getElementById('leader-id-edit')?.value || '';
            const namaLeaderSaatIni = (cloudLeaderList?.[idEdit]?.nama || '').trim();

            const kurirs = Object.values(cloudKurirList || {})
                .filter(u => u && u.role === 'kurir' && u.status === 'aktif')
                .filter(u => !keyword || u.nama.toLowerCase().includes(keyword))
                .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

            if (!kurirs.length) {
                list.innerHTML = '<div class="text-center text-[10px] text-slate-400 py-4">Tidak ada kurir yang cocok.</div>';
            } else {
                list.innerHTML = kurirs.map(u => {
                    const leaderLain = (u.leader || '').trim();
                    const isLockedByOther = leaderLain && leaderLain !== namaLeaderSaatIni;
                    const isChecked = leaderAnggotaSelected.has(u.nama);
                    const initial = (u.nama || '?').trim().charAt(0).toUpperCase();
                    const sub = isLockedByOther ? `Sudah di leader: ${leaderLain}` : (leaderLain ? 'Anggota leader ini' : 'Belum punya leader');
                    return `
                        <div class="leader-anggota-item ${isChecked ? 'is-checked' : ''} ${isLockedByOther ? 'is-locked' : ''}"
                            onclick="toggleLeaderAnggota('${u.nama.replace(/'/g, "\\'")}', ${isLockedByOther ? `'${leaderLain.replace(/'/g, "\\'")}'` : 'null'})">
                            <div class="lap-check">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div class="leader-avatar" style="width:26px;height:26px;font-size:10px;border-radius:8px;">${initial}</div>
                            <div class="min-w-0 flex-1">
                                <div class="lap-name truncate">${u.nama}</div>
                                <div class="lap-sub truncate">${sub}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            if (counter) counter.innerHTML = `<i data-lucide="users" class="w-3 h-3"></i> ${leaderAnggotaSelected.size} dipilih`;
            if (window.lucide) lucide.createIcons();
        };

        window.renderLeaderList = function() {
            const container = document.getElementById('container-leader-list');
            const countEl = document.getElementById('leader-list-count');
            if (!container) return;
        
            const keys = Object.keys(cloudLeaderList || {});
            if (countEl) countEl.innerText = keys.length ? `${keys.length} leader` : '';
            if (!keys.length) {
                container.innerHTML = `
                    <div class="text-center py-6 space-y-1">
                        <div class="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto"><i data-lucide="users-round" class="w-5 h-5"></i></div>
                        <p class="text-xs text-slate-400">Belum ada leader tersimpan.</p>
                    </div>`;
                if (window.lucide) lucide.createIcons();
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
                const initial = (item.nama || '?').trim().charAt(0).toUpperCase();
        
                return `
                    <div class="leader-list-card bg-white dark:bg-darkCard border border-slate-100 dark:border-slate-800 shadow-sm text-xs">
                        <div class="llc-header flex justify-between items-start gap-2 p-3.5">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="leader-avatar is-lg">${initial}</div>
                                <div class="min-w-0">
                                    <div class="font-bold text-[13px] truncate">${item.nama || '-'}</div>
                                    <div class="text-[10px] text-slate-400 flex items-center gap-1"><i data-lucide="users" class="w-3 h-3"></i> ${anggota.length} anggota aktif</div>
                                </div>
                            </div>
                            <div class="flex gap-1.5 shrink-0">
                                <button onclick="editLeaderData('${key}')" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 text-[10px] font-bold active:scale-95 transition-transform"><i data-lucide="pencil" class="w-3 h-3"></i> Edit</button>
                                <button onclick="hapusLeaderData('${key}')" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-[10px] font-bold active:scale-95 transition-transform"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
                            </div>
                        </div>

                        <div class="p-3.5 space-y-3">
                            <div class="space-y-1.5">
                                <div class="font-semibold text-slate-400 text-[9px] uppercase tracking-wide flex items-center gap-1"><i data-lucide="user-round" class="w-3 h-3"></i> Daftar Anggota</div>
                                <div class="flex flex-wrap gap-1.5">
                                    ${anggota.map(a => `<span class="anggota-chip"><span class="ac-avatar">${(a||'?').trim().charAt(0).toUpperCase()}</span>${a}</span>`).join('') || '<span class="text-[10px] text-slate-400">Belum ada anggota.</span>'}
                                </div>
                            </div>

                            <div class="grid grid-cols-3 gap-1.5 text-[10px]">
                                <div class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                                    <div class="font-bold flex items-center gap-1"><i data-lucide="trophy" class="w-3 h-3"></i> Terbaik</div>
                                    <div class="truncate mt-0.5">${terbaik ? terbaik.nama : '-'}</div>
                                    <div class="font-bold">${terbaik ? terbaik.rating : 0}%</div>
                                </div>
                                <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                                    <div class="font-bold flex items-center gap-1"><i data-lucide="minus" class="w-3 h-3"></i> Sedang</div>
                                    <div class="truncate mt-0.5">${sedang ? sedang.nama : '-'}</div>
                                    <div class="font-bold">${sedang ? sedang.rating : 0}%</div>
                                </div>
                                <div class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
                                    <div class="font-bold flex items-center gap-1"><i data-lucide="trending-down" class="w-3 h-3"></i> Beban</div>
                                    <div class="truncate mt-0.5">${beban ? beban.nama : '-'}</div>
                                    <div class="font-bold">${beban ? beban.rating : 0}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            if (window.lucide) lucide.createIcons();
        };
        window.editLeaderData = function(key) {
            const d = cloudLeaderList[key];
            if (!d) return;
        
            document.getElementById('leader-id-edit').value = key;
            document.getElementById('leader-nama').value = d.nama || '';
            const modeEl = document.getElementById('leader-form-mode');
            if (modeEl) modeEl.innerText = `Mode: Edit leader "${d.nama || '-'}"`;
        
            leaderAnggotaSelected = new Set(Array.isArray(d.anggota) ? d.anggota : []);
            const searchEl = document.getElementById('leader-anggota-search');
            if (searchEl) searchEl.value = '';
            renderLeaderAnggotaOptions();

            // scroll ke form biar user langsung lihat form yang sedang diedit
            document.getElementById('leader-nama')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        window.hapusLeaderData = async function(key) {
            const ok = await showConfirm('Hapus data leader ini?');
            if (ok) {
                remove(ref(db, `leader_list/${key}`))
                    .then(() => toast('Leader berhasil dihapus!'))
                    .catch(err => toast('Gagal hapus leader: ' + err.message));
            }
        };

        window.closeLeaderModal = function() {
            resetLeaderForm();
            if (typeof renderLeaderList === 'function') renderLeaderList();
        };
        
        window.saveLeaderData = function() {
            const idEdit = document.getElementById('leader-id-edit').value;
            const nama = document.getElementById('leader-nama').value.trim();
            const anggota = Array.from(leaderAnggotaSelected).map(a => (a || '').trim()).filter(Boolean);
        
            if (!nama) return toast('Nama leader wajib diisi!');
            if (!anggota.length) return toast('Pilih minimal 1 anggota!');
        
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
                        toast('Data leader berhasil disimpan!');
                        closeLeaderModal();
                    })
                    .catch(err => toast('Gagal update leader: ' + err.message));
            } else {
                push(ref(db, 'leader_list'), payload)
                    .then(async () => {
                        await syncKeKurir();
                        toast('Data leader berhasil disimpan!');
                        closeLeaderModal();
                    })
                    .catch(err => toast('Gagal simpan leader: ' + err.message));
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
        
        // Catatan: dropdown lama <select multiple> sudah diganti dengan checklist
        // interaktif (lihat renderLeaderAnggotaOptions). Fungsi ini dipertahankan
        // sebagai alias supaya kalau ada pemanggilan lama tidak error.
        function populateAnggotaDropdownLeader() {
            if (typeof renderLeaderAnggotaOptions === 'function') renderLeaderAnggotaOptions();
        }
        window.openLeaderModal = function() {
            resetLeaderForm();
            navigateTo('screen-admin-leader');
            switchLeaderTab('daftar');
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

        // Menentukan identitas pengirim notifikasi berdasarkan siapa yang sedang login.
        // Dipakai untuk menandai setiap notifikasi: dari Head Ops, Owner/Admin, atau Manajemen lain.
        function getSenderInfo() {
            if (!userSession) {
                return { senderRole: 'owner', senderLabel: 'Admin', senderNama: 'Admin' };
            }
            if (userSession.role === 'owner') {
                return { senderRole: 'owner', senderLabel: 'Owner / Admin', senderNama: userSession.nama || 'Owner' };
            }
            if (userSession.role === 'manajemen') {
                const kategori = (userSession.kategori || '').trim();
                if (kategori === 'Head Operasional') {
                    return { senderRole: 'head_ops', senderLabel: 'Head Operasional', senderNama: userSession.nama || 'Head Operasional' };
                }
                if (kategori === 'Owner') {
                    return { senderRole: 'owner', senderLabel: 'Owner / Admin', senderNama: userSession.nama || 'Owner' };
                }
                return { senderRole: 'manajemen', senderLabel: kategori || 'Manajemen', senderNama: userSession.nama || (kategori || 'Manajemen') };
            }
            return { senderRole: 'owner', senderLabel: 'Admin', senderNama: userSession.nama || 'Admin' };
        }

        window.setNotifTarget = function(target) {
            const hidden = document.getElementById('notif-target');
            if (hidden) hidden.value = target;

            const box = document.getElementById('notif-selected-box');
            if (box) {
                if (target === 'selected') {
                    box.classList.remove('hidden');
                    populateNotifKurirList();
                } else {
                    box.classList.add('hidden');
                }
            }

            const btnAll = document.getElementById('notif-target-btn-all');
            const btnSelected = document.getElementById('notif-target-btn-selected');
            if (btnAll && btnSelected) {
                btnAll.classList.toggle('active', target === 'all');
                btnSelected.classList.toggle('active', target === 'selected');
            }
        };

        // Dipertahankan untuk kompatibilitas jika ada pemanggilan lama
        window.toggleNotifTarget = function() {
            const target = document.getElementById('notif-target')?.value || 'all';
            setNotifTarget(target);
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
            document.getElementById('notif-template').value = '';
            document.getElementById('notif-message').value = '';
            const searchEl = document.getElementById('notif-kurir-search');
            if (searchEl) searchEl.value = '';
            setNotifTarget('all');
        };

        function renderKurirNotifications() {
            if (!userSession || userSession.role !== 'kurir') return;

            // Sinkronkan indikator titik merah + isi panel lonceng notifikasi
            if (typeof renderKurirNotifPanel === 'function') renderKurirNotifPanel();
        
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
                    <span class="sender-badge mb-1" data-role="${notif.senderRole || 'owner'}">${notif.senderLabel || 'Admin'}</span><br>
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
            renderKurirNotifPanel();
        };

        // Ambil semua notifikasi aktif yang ditujukan untuk kurir yang sedang login
        function getActiveNotifsForCurrentKurir() {
            if (!userSession || userSession.role !== 'kurir') return [];
            const username = userSession.username;
            const hiddenIds = getHiddenNotifIds();
            return Object.entries(cloudNotificationList || {})
                .filter(([id, n]) => {
                    if (!n || !n.active) return false;
                    if (hiddenIds.includes(id)) return false;
                    if (n.target === 'all') return true;
                    if (n.target === 'selected' && Array.isArray(n.targetList)) {
                        return n.targetList.includes(username);
                    }
                    return false;
                })
                .sort((a, b) => (b[1]?.createdAt || '').localeCompare(a[1]?.createdAt || ''));
        }

        function renderKurirNotifPanel() {
            const list = document.getElementById('kurir-notif-list');
            const dot = document.getElementById('kurir-notif-dot');
            if (!list) return;

            const firebaseItems = getActiveNotifsForCurrentKurir().map(([id, n]) => ({
                id, message: n.message || '', createdAt: n.createdAt, isLocal: false,
                senderRole: n.senderRole || 'owner', senderLabel: n.senderLabel || 'Admin'
            }));
            const localItems = (localKurirReminders || []).map(r => ({
                id: r.id, message: r.message, createdAt: r.createdAt, isLocal: true
            }));

            const items = [...localItems, ...firebaseItems].sort((a, b) =>
                (b.createdAt || '').localeCompare(a.createdAt || '')
            );

            if (dot) dot.classList.toggle('hidden', items.length === 0);

            if (items.length === 0) {
                list.innerHTML = '<div class="p-4 text-center text-[11px] text-slate-400">Belum ada notifikasi.</div>';
                return;
            }

            list.innerHTML = items.map(n => {
                let waktu = '-';
                try { waktu = n.createdAt ? new Date(n.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'; } catch (e) {}
                const typeColor = n.isLocal
                    ? 'text-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'text-amber-500 bg-amber-50 dark:bg-amber-950/30';
                const dismissFn = n.isLocal ? `dismissLocalReminder('${n.id}')` : `dismissKurirNotification('${n.id}')`;
                const senderBadge = n.isLocal
                    ? `<span class="sender-badge" data-role="manajemen">Sistem</span>`
                    : `<span class="sender-badge" data-role="${n.senderRole || 'owner'}">${n.senderLabel || 'Admin'}</span>`;
                return `
                    <div class="p-3 flex gap-2.5 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeColor}">
                            <i data-lucide="${n.isLocal ? 'store' : 'bell'}" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">${senderBadge}</div>
                            <p class="text-[11px] leading-snug text-slate-700 dark:text-slate-200">${n.message || ''}</p>
                            <p class="text-[10px] text-slate-400 mt-1">${waktu}</p>
                        </div>
                        <button onclick="${dismissFn}" class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0">✕</button>
                    </div>
                `;
            }).join('');

            if (window.lucide) lucide.createIcons();
        }

        // ===================================================================
        // REMINDER OTOMATIS "BELUM INPUT MITRA" — 100% client-side, tanpa Firebase.
        // Muncul setiap 30 menit sekali selama kurir yang login belum input
        // transaksi mitra pada hari berjalan. Berhenti otomatis begitu terdeteksi
        // sudah ada input mitra hari ini.
        // ===================================================================
        let localKurirReminders = [];
        let mitraReminderTimer = null;
        let __reminderSeq = 0;

        function hasInputMitraToday() {
            if (!userSession || userSession.role !== 'kurir') return true;
            const today = getWibRawDate();
            return Object.values(cloudLogMitra || {}).some(log => {
                if (!log || !log.tglRaw) return false;
                if (log.tglRaw.toString().slice(0, 10) !== today) return false;
                return log.kurirUsername === userSession.username || log.kurirId === userSession.id;
            });
        }

        function pushLocalReminder(message) {
            const id = 'local-' + Date.now() + '-' + (++__reminderSeq);
            localKurirReminders.unshift({ id, message, createdAt: new Date().toISOString() });
            if (localKurirReminders.length > 5) localKurirReminders = localKurirReminders.slice(0, 5);
            toast(message, 'warning');
            renderKurirNotifPanel();
        }

        window.dismissLocalReminder = function(id) {
            localKurirReminders = localKurirReminders.filter(r => r.id !== id);
            renderKurirNotifPanel();
        };

        function checkMitraReminderNow() {
            if (!userSession || userSession.role !== 'kurir') return;
            if (hasInputMitraToday()) {
                if (localKurirReminders.length) {
                    localKurirReminders = [];
                    renderKurirNotifPanel();
                }
                return;
            }
            pushLocalReminder('Anda belum input transaksi mitra hari ini. Yuk segera input agar data harian lengkap! 🏪');
        }

        window.startMitraReminderWatcher = function() {
            stopMitraReminderWatcher();
            setTimeout(checkMitraReminderNow, 10000);
            mitraReminderTimer = setInterval(checkMitraReminderNow, 30 * 60 * 1000);
        };

        window.stopMitraReminderWatcher = function() {
            if (mitraReminderTimer) { clearInterval(mitraReminderTimer); mitraReminderTimer = null; }
            localKurirReminders = [];
        };

        window.toggleKurirNotifPanel = function() {
            const panel = document.getElementById('kurir-notif-panel');
            if (!panel) return;
            const willShow = panel.classList.contains('hidden');
            if (willShow) {
                renderKurirNotifPanel();
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        };

        window.resendNotification = function(key) {
            const n = cloudNotificationList[key];
            if (!n) return;
        
            const sender = getSenderInfo();

            const payload = {
                target: n.target || 'all',
                targetList: Array.isArray(n.targetList) ? n.targetList : [],
                message: n.message || '',
                type: n.type || 'warning',
                active: true,
                createdAt: new Date().toISOString(),
                senderRole: n.senderRole || sender.senderRole,
                senderLabel: n.senderLabel || sender.senderLabel,
                senderNama: n.senderNama || sender.senderNama
            };
        
            set(ref(db, `notifications_admin/${key}`), payload)
                .then(() => {
                    const hiddenIds = getHiddenNotifIds().filter(id => id !== key);
                    localStorage.setItem('hidden_notif_ids', JSON.stringify(hiddenIds));
        
                    toast('Notifikasi berhasil dikirim ulang!');
                    renderAdminNotificationHistory();
                    renderKurirNotifications();
                })
                .catch(err => toast('Gagal kirim ulang notifikasi: ' + err.message));
        };
        window.deleteNotification = async function(key) {
            if (!(await showConfirm('Hapus notifikasi ini?'))) return;
            remove(ref(db, `notifications_admin/${key}`))
                .then(() => toast('Notifikasi berhasil dihapus!'))
                .catch(err => toast('Gagal menghapus notifikasi: ' + err.message));
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
            const icon = document.getElementById('btn-toggle-kurir-icon');
            const isOpen = container.dataset.open === '1';
            
            container.dataset.open = isOpen ? '0' : '1';
            btn.innerText = isOpen ? 'Buka' : 'Tutup';
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            
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
            if (!container) return;
            const isOpen = container.dataset.open === '1';
            container.dataset.open = isOpen ? '0' : '1';
            renderAdminNotificationHistory();
        };
        window.depositKurirSelected = [];
        window.depositKurirAmounts = {};
        window.depositKurirOrder = {};
        window.depositKurirSequence = 0;

        window.updateDepositDay = function() {
            const date = document.getElementById('deposit-date')?.value || getWibRawDate();
            const day = getHariIndo(date);
            const depositDay = document.getElementById('deposit-day');
            if (depositDay) depositDay.value = day;
        };

        window.updateDepositKurirSuggestions = function() {
            const input = document.getElementById('deposit-kurir');
            const box = document.getElementById('suggest-deposit-kurir');
            if (!input || !box) return;

            const q = normalizeNama(input.value);
            if (!q) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }

            const matches = [];
            for (let k in cloudKurirList) {
                const item = cloudKurirList[k];
                if (item && item.role === 'kurir') {
                    const nama = item.nama || item.username || '';
                    if (normalizeNama(nama).includes(q) && !window.depositKurirSelected.includes(nama)) {
                        matches.push(nama);
                    }
                }
            }

            if (!matches.length) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }

            box.innerHTML = matches.slice(0, 6).map(nama => `
                <div onclick="pilihDepositKurir('${nama.replace(/'/g, "\\'")}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    ${nama}
                </div>
            `).join('');

            box.classList.remove('hidden');
        };

        window.pilihDepositKurir = function(nama) {
            const input = document.getElementById('deposit-kurir');
            const box = document.getElementById('suggest-deposit-kurir');

            if (!window.depositKurirSelected.includes(nama)) {
                window.depositKurirSelected.push(nama);
                window.depositKurirSequence += 1;
                window.depositKurirOrder[nama] = window.depositKurirSequence;
            }

            if (input) input.value = '';
            if (box) {
                box.classList.add('hidden');
                box.innerHTML = '';
            }

            renderDepositKurirSelected();
        };

        window.hapusDepositKurirSelected = function(nama) {
            window.depositKurirSelected = window.depositKurirSelected.filter(n => n !== nama);
            delete window.depositKurirAmounts[nama];
            delete window.depositKurirOrder[nama];
            renderDepositKurirSelected();
        };

        function renderDepositKurirSelected() {
            const selected = document.getElementById('deposit-kurir-selected');
            if (!selected) return;

            const values = {};
            document.querySelectorAll('[id^="deposit-amount-"]').forEach(el => {
                const nama = el.dataset.nama;
                if (nama) values[nama] = el.value;
            });

            const sortedNames = [...window.depositKurirSelected].sort((a, b) => {
                return (window.depositKurirOrder[b] || 0) - (window.depositKurirOrder[a] || 0);
            });

            if (!sortedNames.length) {
                selected.innerHTML = '';
                return;
            }

            selected.innerHTML = sortedNames.map(nama => `
                <div class="w-full p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-bold text-xs">${nama}</div>
                        <button onclick="hapusDepositKurirSelected('${nama.replace(/'/g, "\\'")}')" class="text-rose-500 font-bold text-sm">×</button>
                    </div>
                    <input type="text"
                        id="deposit-amount-${nama.replace(/[^a-zA-Z0-9]/g, '_')}"
                        data-nama="${nama}"
                        oninput="formatDepositPerKurir(this, '${nama.replace(/'/g, "\\'")}')"
                        placeholder="Rp 0"
                        class="w-full px-3 py-2 border rounded-xl text-xs dark:bg-darkBg dark:border-slate-700">
                </div>
            `).join('');

            Object.entries(values).forEach(([nama, val]) => {
                const input = document.querySelector(`[data-nama="${nama}"]`);
                if (input) input.value = val;
            });
        }

        window.formatDepositPerKurir = function(el, nama) {
            let angka = (el.value || '').replace(/[^0-9]/g, '');
            if (!angka) {
                el.value = '';
                window.depositKurirAmounts[nama] = 0;
                return;
            }
            el.value = 'Rp ' + parseInt(angka).toLocaleString('id-ID');
            window.depositKurirAmounts[nama] = parseInt(angka) || 0;
        };
        window.initOrderDepositModule = function() {
            const orderDate = document.getElementById('order-date');
            const orderAmount = document.getElementById('order-amount');
            const depositDate = document.getElementById('deposit-date');
            const depositDay = document.getElementById('deposit-day');
            const depositKurir = document.getElementById('deposit-kurir');
            const selectedBox = document.getElementById('deposit-kurir-selected');

            const today = getWibTodayRawDate();

            if (orderDate && !orderDate.value) orderDate.value = today;
            if (depositDate && !depositDate.value) depositDate.value = today;
            if (depositDay) depositDay.value = getHariIndo(today);

            if (orderAmount && !orderAmount.value) orderAmount.value = '';
            if (depositKurir) depositKurir.value = '';
            if (selectedBox && !selectedBox.innerHTML) selectedBox.innerHTML = '';

            window.depositKurirSelected = window.depositKurirSelected || [];
            window.depositKurirAmounts = window.depositKurirAmounts || {};
            window.depositKurirOrder = window.depositKurirOrder || {};
            window.depositKurirSequence = window.depositKurirSequence || 0;

            renderDepositKurirSelected();
        };

        window.resetDepositForm = function() {
            window.depositKurirSelected = [];
            window.depositKurirAmounts = {};
            window.depositKurirOrder = {};
            window.depositKurirSequence = 0;

            const depositDate = document.getElementById('deposit-date');
            const depositDay = document.getElementById('deposit-day');
            const depositKurir = document.getElementById('deposit-kurir');
            const selectedBox = document.getElementById('deposit-kurir-selected');

            if (depositDate) depositDate.value = getWibRawDate();
            if (depositDay) depositDay.value = getHariIndo(getWibRawDate());
            if (depositKurir) depositKurir.value = '';
            if (selectedBox) selectedBox.innerHTML = '';

            renderDepositKurirSelected();
        };
        window.sendDepositToSheet = async function() {
            const date = document.getElementById('deposit-date')?.value || getWibTodayRawDate();
            const day = getHariIndo(date);

            const items = (window.depositKurirSelected || []).map(nama => ({
                nama,
                amount: parseInt(window.depositKurirAmounts?.[nama]) || 0
            })).filter(x => x.amount > 0);

            if (!date || !items.length) {
                toast('Lengkapi data deposit.');
                return;
            }

            try {
                setOrderDepositLoading('deposit', true);
                const result = await sendToSpreadsheet('saveDeposit', {
                    date,
                    day,
                    items,
                    timezone: 'Asia/Jakarta'
                });

                if (result.success) {
                    toast(result.message || 'Deposit berhasil dikirim.');
                    resetDepositForm();
                    initOrderDepositModule();
                } else {
                    toast(result.message || 'Gagal kirim deposit.');
                }
            } catch (err) {
                toast('Gagal kirim deposit: ' + err.message);
            } finally {
                setOrderDepositLoading('deposit', false);
            }
        };

        async function sendToSpreadsheet(action, payload) {
            try {
                const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify(payload)
                });

                return { success: true, message: 'DATA TERKIRIM BERHASIL!.' };
            } catch (err) {
                return { success: false, message: 'GAGAL KIRIM DATA: ' + err.message };
            }
        }
        function setOrderDepositLoading(type, isLoading) {
            const orderBtn = document.querySelector('#screen-admin-order-deposit button[onclick="sendOrderToSheet()"]');
            const depositBtn = document.querySelector('#screen-admin-order-deposit button[onclick="sendDepositToSheet()"]');

            if (type === 'order' && orderBtn) {
                orderBtn.disabled = isLoading;
                orderBtn.innerText = isLoading ? 'MENGIRIM...' : 'Kirim';
            }

            if (type === 'deposit' && depositBtn) {
                depositBtn.disabled = isLoading;
                depositBtn.innerText = isLoading ? 'MENGIRIM...' : 'Kirim';
            }
        }

        window.sendOrderToSheet = async function() {
            const date = document.getElementById('order-date')?.value || getWibTodayRawDate();
            const amount = parseInt(document.getElementById('order-amount')?.value) || 0;

            if (!date || amount <= 0) {
                toast('Lengkapi data orderan.');
                return;
            }

            try {
                setOrderDepositLoading('order', true);
                const result = await sendToSpreadsheet('saveOrder', { date, amount });

                if (result.success) {
                    toast(result.message || 'Orderan berhasil dikirim.');
                    if (document.getElementById('order-date')) document.getElementById('order-date').value = getWibTodayRawDate();
                    if (document.getElementById('order-amount')) document.getElementById('order-amount').value = '';
                } else {
                    toast(result.message || 'Gagal kirim orderan.');
                }
            } catch (err) {
                toast('Gagal kirim orderan: ' + err.message);
            } finally {
                setOrderDepositLoading('order', false);
            }
        };

const KATEGORI_KL = "Korlap";

/* ------------------------------------------------------------------ *
 * Helper sesi
 * ------------------------------------------------------------------ */
function klGetSession() {
    try { return JSON.parse(localStorage.getItem("sahabatku_session") || "null"); }
    catch (e) { return null; }
}
function klIsKorlapSession(session) {
    return !!(session && session.role === "manajemen" && (session.kategori || "").trim() === KATEGORI_KL);
}

/* Penjaga awal (murni CSS) supaya dashboard admin tidak sempat "kelihatan"
 * sesaat saat refresh halaman untuk sesi Korlap. */
(function klEarlyGuard() {
    try {
        const raw = localStorage.getItem("sahabatku_session");
        if (!raw) return;
        const s = JSON.parse(raw);
        if (klIsKorlapSession(s)) {
            const style = document.createElement("style");
            style.id = "kl-early-guard-style";
            style.textContent = `#screen-admin-dashboard{display:none !important;} #app-bar{display:none !important;}`;
            (document.head || document.documentElement).appendChild(style);
        }
    } catch (e) { /* diamkan */ }
})();

/* ------------------------------------------------------------------ *
 * Markup dashboard Korlap
 * ------------------------------------------------------------------ */
function klScreenHtml() {
    return `
    <div id="screen-kl-dashboard" class="screen">
        <div class="pm-header" style="background:linear-gradient(135deg,#0f2f66 0%,#1d4fa8 55%,#2f8fe0 100%);">
            <div class="pm-header-row">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="pm-avatar"><i data-lucide="shield-check" class="w-5 h-5"></i></div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-sm session-fullname truncate">Koordinator Lapangan</h3>
                        <p class="text-[10px] opacity-80">Portal Korlap Sahabatku</p>
                    </div>
                </div>
                <span class="pm-badge">Korlap</span>
            </div>
        </div>
        <div class="pm-body">
            <div class="pm-section-title"><i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>Menu Korlap</div>
            <div class="pm-menu-grid">
                <button class="pm-menu-card" onclick="window.__kl.openLeader()">
                    <div class="pm-menu-icon" style="background:#0284C7"><i data-lucide="crown" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Leader &amp; Penilaian</span>
                    <span class="pm-menu-sub">Lihat skor bulanan tiap leader</span>
                </button>
                <button class="pm-menu-card" onclick="window.__kl.openKpi()">
                    <div class="pm-menu-icon" style="background:#7C3AED"><i data-lucide="trophy" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">KPI &amp; Penghargaan</span>
                    <span class="pm-menu-sub">Penghargaan, ranking &amp; rekap jadwal</span>
                </button>
                <button class="pm-menu-card" onclick="window.__kl.openMitra()">
                    <div class="pm-menu-icon" style="background:#EA580C"><i data-lucide="store" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Kelola Mitra</span>
                    <span class="pm-menu-sub">Cek trx kurir &amp; audit trx</span>
                </button>
                <button class="pm-menu-card" onclick="window.__kl.openTestimoni()">
                    <div class="pm-menu-icon" style="background:#DB2777"><i data-lucide="message-circle-more" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Testimoni Customer</span>
                    <span class="pm-menu-sub">Lihat ulasan pelanggan per bulan</span>
                </button>
                <button class="pm-menu-card" onclick="window.__kl.logout()">
                    <div class="pm-menu-icon" style="background:#64748B"><i data-lucide="log-out" class="w-4 h-4"></i></div>
                    <span class="pm-menu-title">Keluar</span>
                    <span class="pm-menu-sub">Logout akun</span>
                </button>
            </div>
        </div>
    </div>`;
}

function klInjectScreen() {
    if (document.getElementById("kl-root")) return;
    const mount = document.getElementById("main-layout") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "kl-root";
    wrap.innerHTML = klScreenHtml();
    mount.appendChild(wrap);
    if (window.lucide) window.lucide.createIcons();
}

function klHideAppBar() {
    const appBar = document.getElementById("app-bar");
    if (appBar) { appBar.classList.remove("flex"); appBar.classList.add("hidden"); }
}

function klShowKlDashboard() {
    document.querySelectorAll(".screen.active").forEach(el => el.classList.remove("active"));
    document.getElementById("screen-kl-dashboard")?.classList.add("active");
    klHideAppBar();
}

/* Screen yang HARAM ditampilkan untuk sesi Korlap (dashboard admin asli).
 * Kalau script.js sendiri (misalnya lewat launchApplicationSession saat
 * login/refresh) mencoba mengaktifkan ini, kita alihkan paksa ke dashboard
 * Korlap — supaya tampilan tetap fokus & tidak "kecampur" punya admin,
 * persis seperti cara petugasmitra.js menjaga fokus tampilannya sendiri. */
const KL_FORBIDDEN_TARGETS = ["screen-admin-dashboard"];

/* ------------------------------------------------------------------ *
 * Batasi tampilan di screen bersama (leader/kpi/mitra) khusus Korlap
 * ------------------------------------------------------------------ */
function klApplyRestrictions() {
    // Leader & Penilaian: sembunyikan tab "Daftar Leader" (tambah/edit/hapus leader)
    const tabDaftar = document.getElementById("tab-leader-daftar");
    if (tabDaftar) tabDaftar.classList.add("hidden");

    // KPI: sembunyikan tab "Top 5"
    const kpiTop5 = document.getElementById("kpi-tab-top5");
    if (kpiTop5) kpiTop5.classList.add("hidden");

    // Kelola Mitra (hub): hanya sisakan "Cek Trx Kurir" & "Cek Audit Trx"
    const mitraScreen = document.getElementById("screen-admin-mitra");
    if (mitraScreen) {
        mitraScreen.querySelectorAll("button").forEach(btn => {
            const onclickAttr = btn.getAttribute("onclick") || "";
            const isAllowed = onclickAttr.includes("screen-admin-mitra-cekkurir") || onclickAttr.includes("screen-admin-mitra-audit");
            btn.classList.toggle("hidden", !isAllowed);
        });
    }
}

/* ------------------------------------------------------------------ *
 * Testimoni Customer: read-only — cuma filter bulan + tombol buka/tutup,
 * tanpa tombol Pilih/Hapus Semua/Hapus Pilihan, dan tanpa tombol
 * Tampilkan/Sembunyikan/Hapus di tiap item testimoni.
 * ------------------------------------------------------------------ */
function klApplyTestimonialRestrictions() {
    // Sembunyikan grup tombol "Pilih" & "Hapus Semua" (yang muncul saat list terbuka)
    const btnPilih = document.getElementById("btn-pilih-mode");
    if (btnPilih) btnPilih.classList.add("hidden");
    const btnHapusSemua = document.getElementById("btn-hapus-semua-bulan");
    if (btnHapusSemua) btnHapusSemua.classList.add("hidden");

    // Jaga-jaga: kalau entah bagaimana select-mode kepicu, matikan lagi
    // supaya grup tombol Hapus Pilihan/Hapus Semua Bulan tidak sempat tampil.
    if (document.body.dataset.testimonialSelectMode === "1") {
        document.body.dataset.testimonialSelectMode = "0";
    }
    const btnGroupSelect = document.getElementById("btn-group-select");
    if (btnGroupSelect) btnGroupSelect.classList.add("hidden");

    // Sembunyikan tombol aksi per-item (Tampilkan/Sembunyikan & Hapus)
    const container = document.getElementById("container-admin-testimonial");
    if (container) {
        container.querySelectorAll("button").forEach(btn => {
            const onclickAttr = btn.getAttribute("onclick") || "";
            if (onclickAttr.includes("toggleTestimonialPublish(") || onclickAttr.includes("hapusTestimonial(")) {
                btn.classList.add("hidden");
            }
        });
        // Sembunyikan checkbox pilih (jaga-jaga bila select-mode sempat aktif)
        container.querySelectorAll(".testimonial-checkbox").forEach(cb => {
            const label = cb.closest("label");
            if (label) label.classList.add("hidden");
        });
    }
}

/* ------------------------------------------------------------------ *
 * Aksi menu
 * ------------------------------------------------------------------ */
window.__kl = {
    openLeader() {
        if (typeof window.navigateTo === "function") window.navigateTo("screen-admin-leader");
        setTimeout(() => {
            if (typeof window.switchLeaderTab === "function") window.switchLeaderTab("penilaian");
            klApplyRestrictions();
        }, 70);
    },
    openKpi() {
        if (typeof window.navigateTo === "function") window.navigateTo("screen-admin-kpi");
        setTimeout(() => {
            if (typeof window.renderKPISection === "function") window.renderKPISection("penghargaan");
            klApplyRestrictions();
        }, 70);
    },
    openMitra() {
        if (typeof window.navigateTo === "function") window.navigateTo("screen-admin-mitra");
        // Panggil langsung (bukan lewat applyManajemenAccess) karena patch
        // applyManajemenAccess milik korlap.js "return" lebih dulu untuk
        // kategori Korlap, sehingga patch punya petugasmitra.js (tempat
        // widget Cek Trx Kurir & Cek Audit Trx disisipkan) tidak pernah
        // kepanggil lewat rantai itu.
        if (window.__pm && typeof window.__pm.injectLegacyMitraExtras === "function") {
            window.__pm.injectLegacyMitraExtras();
            if (typeof window.__pm.updateAdminBadge === "function") window.__pm.updateAdminBadge();
        }
        setTimeout(klApplyRestrictions, 70);
    },
    openTestimoni() {
        if (typeof window.navigateTo === "function") window.navigateTo("screen-admin-testimonial");
        // script.js sendiri set default bulan & panggil renderAdminTestimonial()
        // lewat setTimeout 100ms saat navigateTo ke screen ini, jadi kita kasih
        // jeda sedikit lebih lama supaya restriction diterapkan SETELAH itu.
        setTimeout(klApplyTestimonialRestrictions, 150);
    },
    logout() {
        if (typeof window.handleLogout === "function") window.handleLogout();
        else { localStorage.removeItem("sahabatku_session"); location.reload(); }
    }
};

/* ------------------------------------------------------------------ *
 * Patch navigasi & applyManajemenAccess
 * ------------------------------------------------------------------ */
function klPatchNavigation() {
    if (window.__klNavPatched) return;
    window.__klNavPatched = true;

    const origNavigateTo = window.navigateTo;
    window.navigateTo = function (screenId) {
        // Alihkan paksa kalau script.js mencoba membawa sesi Korlap ke
        // dashboard admin asli (mis. dipanggil otomatis oleh
        // launchApplicationSession saat login/refresh). Dengan begini
        // currentScreen & navigationHistory milik script.js SELALU tercatat
        // benar sebagai "screen-kl-dashboard", jadi tombol kembali tidak
        // akan pernah "nyasar" ke dashboard admin lagi.
        const s0 = klGetSession();
        if (klIsKorlapSession(s0) && KL_FORBIDDEN_TARGETS.includes(screenId)) {
            screenId = "screen-kl-dashboard";
        }

        if (typeof origNavigateTo === "function") origNavigateTo(screenId);

        const s = klGetSession();
        if (!klIsKorlapSession(s)) return;

        const guard = document.getElementById("kl-early-guard-style");
        if (guard) guard.remove();

        if (screenId === "screen-kl-dashboard") {
            klHideAppBar();
        } else {
            klApplyRestrictions();
            if (screenId === "screen-admin-testimonial") klApplyTestimonialRestrictions();
        }
    };

    const origNavigateBack = window.navigateBack;
    window.navigateBack = function () {
        if (typeof origNavigateBack === "function") origNavigateBack();
        const s = klGetSession();
        if (!klIsKorlapSession(s)) return;

        const guard = document.getElementById("kl-early-guard-style");
        if (guard) guard.remove();

        const activeEl = document.querySelector(".screen.active");
        // Jaring pengaman: kalau entah bagaimana caranya tombol "kembali"
        // (termasuk tombol back HP / history.back() bawaan app-bar) membawa
        // ke dashboard admin asli atau layar login, paksa balik ke
        // dashboard Korlap saja — jangan biarkan tampilan admin kebawa.
        if (!activeEl || activeEl.id === "screen-admin-dashboard" || activeEl.id === "screen-login") {
            klShowKlDashboard();
            return;
        }
        if (activeEl.id === "screen-kl-dashboard") {
            klHideAppBar();
        } else {
            klApplyRestrictions();
        }
    };
}

function klPatchRenderKPISection() {
    if (window.__klKpiPatched) return;
    window.__klKpiPatched = true;

    const origRenderKPI = window.renderKPISection;
    window.renderKPISection = function (section) {
        if (typeof origRenderKPI === "function") origRenderKPI(section);

        const s = klGetSession();
        if (!klIsKorlapSession(s)) return;
        // renderKPISection asli menimpa className semua tombol tab
        // (termasuk yang sudah disembunyikan lewat classList.add("hidden")),
        // jadi tab Top 5 harus disembunyikan ULANG tiap kali render selesai.
        klApplyRestrictions();
    };
}

function klPatchRenderAdminTestimonial() {
    if (window.__klTestimonialPatched) return;
    window.__klTestimonialPatched = true;

    const origRenderTestimonial = window.renderAdminTestimonial;
    window.renderAdminTestimonial = function () {
        if (typeof origRenderTestimonial === "function") origRenderTestimonial();

        const s = klGetSession();
        if (!klIsKorlapSession(s)) return;
        // renderAdminTestimonial menulis ulang seluruh innerHTML tiap kali
        // dipanggil (filter bulan ganti, toggle buka/tutup, data realtime
        // berubah, dst), jadi tombol aksi harus disembunyikan ULANG tiap render.
        klApplyTestimonialRestrictions();
    };
}

function klPatchApplyManajemenAccess() {
    if (window.__klAccessPatched) return;
    window.__klAccessPatched = true;

    const orig = window.applyManajemenAccess;
    window.applyManajemenAccess = function (kategori) {
        const k = (kategori || "").trim();
        if (k === KATEGORI_KL) {
            const badge = document.getElementById("badge-admin-role");
            if (badge) badge.innerText = "Korlap";
            klInjectScreen();
            if (window.lucide) window.lucide.createIcons();
            // Lewat navigateTo (bukan manipulasi class manual) supaya
            // currentScreen/navigationHistory di script.js selalu sinkron
            // dengan tampilan Korlap — sama seperti pola petugasmitra.js.
            if (typeof window.navigateTo === "function") window.navigateTo("screen-kl-dashboard");
            else klShowKlDashboard();
            return;
        }
        if (typeof orig === "function") orig(kategori);
    };
}

/* ------------------------------------------------------------------ *
 * Bootstrap
 * ------------------------------------------------------------------ */
function klBoot() {
    klInjectScreen();
    klPatchNavigation();
    klPatchApplyManajemenAccess();
    klPatchRenderKPISection();
    klPatchRenderAdminTestimonial();

    const session = klGetSession();
    if (klIsKorlapSession(session)) {
        const badge = document.getElementById("badge-admin-role");
        if (badge) badge.innerText = "Korlap";
        if (window.__pm && typeof window.__pm.injectLegacyMitraExtras === "function") {
            window.__pm.injectLegacyMitraExtras();
        }
        // Beri sedikit jeda supaya elemen lain (script.js) sempat siap dulu,
        // lalu masuk lewat navigateTo supaya state navigasi tetap sinkron.
        setTimeout(() => {
            if (typeof window.navigateTo === "function") window.navigateTo("screen-kl-dashboard");
            else klShowKlDashboard();
        }, 60);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", klBoot);
} else {
    klBoot();
}

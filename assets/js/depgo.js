/* Depgo - helper bersama untuk semua halaman */
(function () {
  var cfg = window.DEPGO_CONFIG || {};
  var configured =
    cfg.SUPABASE_URL &&
    String(cfg.SUPABASE_URL).indexOf("PASTE_") === -1 &&
    cfg.SUPABASE_ANON_KEY &&
    String(cfg.SUPABASE_ANON_KEY).indexOf("PASTE_") === -1;

  window.DepgoConfigured = configured;

  window.sb = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  window.showBannerIfUnconfigured = function () {
    if (configured) return;
    var el = document.getElementById("config-warning");
    if (el) el.hidden = false;
  };

  window.getSession = async function () {
    if (!window.sb) return null;
    try {
      var res = await window.sb.auth.getSession();
      return res && res.data && res.data.session ? res.data.session : null;
    } catch (e) {
      return null;
    }
  };

  window.logout = async function () {
    if (window.sb) {
      try { await window.sb.auth.signOut(); } catch (e) {}
    }
    location.href = "/admin.html";
  };

  /* ---------- Kode kartu ---------- */
  var CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; /* tanpa I, L, O, 0, 1 */

  window.normalizeCardCode = function (raw) {
    if (!raw) return "";
    var s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
    var m = s.match(/DEP[- ]??([A-Z2-9]{6})/);
    if (m) return "DEP-" + m[1];
    return s;
  };

  window.isValidCardCode = function (code) {
    return /^DEP-[A-Z2-9]{6}$/.test(code || "");
  };

  /* Ambil kode dari path /k/CODE atau ?code=CODE */
  window.codeFromLocation = function () {
    var m = location.pathname.match(/\/k\/([A-Za-z0-9-]+)/);
    if (m) return window.normalizeCardCode(m[1]);
    var q = new URLSearchParams(location.search).get("code");
    if (q) return window.normalizeCardCode(q);
    return "";
  };

  window.slugFromLocation = function () {
    var m = location.pathname.match(/\/b\/([A-Za-z0-9-]+)/);
    if (m) return m[1].toLowerCase();
    return new URLSearchParams(location.search).get("slug") || "";
  };

  window.slugify = function (str) {
    var s = String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return s || "bisnis";
  };

  window.randomCardCode = function () {
    var s = "";
    for (var i = 0; i < 6; i++) {
      s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return "DEP-" + s;
  };

  window.randomSuffix = function () {
    var chars = "abcdefghjkmnpqrstuvwxyz23456789";
    var s = "";
    for (var i = 0; i < 4; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };

  /* ---------- Toast ---------- */
  window.toast = function (msg, type) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var t = document.createElement("div");
    t.className = "toast" + (type ? " toast-" + type : "");
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  };

  /* ---------- Dialog ---------- */
  window.openDialog = function (id) {
    var d = document.getElementById(id);
    if (d) {
      d.classList.add("open");
      document.body.classList.add("no-scroll");
    }
  };
  window.closeDialog = function (id) {
    var d = document.getElementById(id);
    if (d) {
      d.classList.remove("open");
      document.body.classList.remove("no-scroll");
    }
  };
  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("dialog")) {
      e.target.classList.remove("open");
      document.body.classList.remove("no-scroll");
    }
  });

  /* ---------- Util ---------- */
  window.escapeHtml = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  window.setBusy = function (btn, busy, labelBusy) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = labelBusy || "Memproses...";
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  };
})();

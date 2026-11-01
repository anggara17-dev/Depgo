/* Depgo - dashboard admin (admin.html) */
var items = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  showBannerIfUnconfigured();
  bindEvents();
  if (!window.sb) return;
  var session = await getSession();
  if (!session) {
    showView("login");
    return;
  }
  showView("app");
  await fetchData();
}

function showView(v) {
  document.getElementById("login-view").hidden = v !== "login";
  document.getElementById("app-view").hidden = v !== "app";
}

function bindEvents() {
  var loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", onLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("add-btn").addEventListener("click", function () { openBizDialog(null); });
  document.getElementById("activate-btn").addEventListener("click", onActivate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("biz-form").addEventListener("submit", onBizSave);
  document.getElementById("tbody").addEventListener("click", onRowAction);
}

async function onLogin(e) {
  e.preventDefault();
  if (!window.sb) { toast("Config Supabase belum diisi (assets/js/config.js).", "error"); return; }
  var btn = document.getElementById("login-btn");
  setBusy(btn, true, "Memeriksa...");
  var email = document.getElementById("login-email").value.trim();
  var password = document.getElementById("login-password").value;
  var res = await sb.auth.signInWithPassword({ email: email, password: password });
  setBusy(btn, false);
  if (res.error) { toast("Email atau password salah.", "error"); return; }
  showView("app");
  await fetchData();
}

async function fetchData() {
  var res = await sb.from("businesses").select("*").order("created_at", { ascending: false });
  if (res.error) { toast("Gagal memuat data: " + res.error.message, "error"); return; }
  items = res.data || [];
  renderStats();
  renderTable();
}

function renderStats() {
  document.getElementById("stat-total").textContent = items.length;
  document.getElementById("stat-active").textContent = items.filter(function (i) { return i.is_active; }).length;
  document.getElementById("stat-blank").textContent = items.filter(function (i) { return !i.activation_code; }).length;
}

function renderTable() {
  var q = document.getElementById("search").value.trim().toLowerCase();
  var rows = items.filter(function (i) {
    if (!q) return true;
    return (i.name || "").toLowerCase().indexOf(q) > -1 ||
      (i.address || "").toLowerCase().indexOf(q) > -1 ||
      (i.activation_code || "").toLowerCase().indexOf(q) > -1;
  });
  var tbody = document.getElementById("tbody");
  document.getElementById("empty-state").hidden = rows.length > 0;
  tbody.innerHTML = rows.map(function (i) {
    return '<tr>' +
      '<td data-l="Bisnis"><div class="cell-name">' + escapeHtml(i.name) + '</div>' +
      '<a class="cell-link" href="/b.html?slug=' + encodeURIComponent(i.slug) + '" target="_blank" rel="noopener">b/' + escapeHtml(i.slug) + '</a></td>' +
      '<td data-l="Alamat"><span class="muted">' + (escapeHtml(i.address) || "-") + '</span></td>' +
      '<td data-l="Kode Kartu">' + (i.activation_code
        ? '<span class="code">' + escapeHtml(i.activation_code) + '</span>'
        : '<span class="muted">belum ada</span>') + '</td>' +
      '<td data-l="Status"><span class="badge ' + (i.is_active ? "badge-green" : "badge-gray") + '">' + (i.is_active ? "Aktif" : "Nonaktif") + '</span></td>' +
      '<td data-l="Aksi"><div class="row-actions">' +
      '<button class="btn btn-outline btn-sm" data-qr="' + i.id + '"' + (i.activation_code ? "" : " disabled") + '>QR</button>' +
      '<button class="btn btn-outline btn-sm" data-edit="' + i.id + '">Edit</button>' +
      '<button class="btn btn-sm btn-del" data-del="' + i.id + '">Hapus</button>' +
      '</div></td>' +
      '</tr>';
  }).join("");
}

function onRowAction(e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.qr) openQr(btn.dataset.qr);
  else if (btn.dataset.edit) openBizDialog(btn.dataset.edit);
  else if (btn.dataset.del) onDelete(btn.dataset.del);
}

async function onDelete(id) {
  var it = items.find(function (i) { return i.id === id; });
  if (!it) return;
  if (!confirm('Hapus "' + it.name + '"? Kartu/stiker yang tertempel untuk bisnis ini akan berhenti berfungsi.')) return;
  var res = await sb.from("businesses").delete().eq("id", id);
  if (res.error) { toast("Gagal menghapus: " + res.error.message, "error"); return; }
  toast("Bisnis dihapus.", "success");
  await fetchData();
}

function openBizDialog(id) {
  var it = id ? items.find(function (i) { return i.id === id; }) : null;
  document.getElementById("biz-dialog-title").textContent = it ? "Edit Bisnis" : "Tambah Bisnis";
  document.getElementById("biz-id").value = it ? it.id : "";
  document.getElementById("biz-name").value = it ? it.name : "";
  document.getElementById("biz-address").value = it ? (it.address || "") : "";
  document.getElementById("biz-url").value = it ? it.google_review_url : "";
  document.getElementById("biz-card").value = it && it.activation_code ? it.activation_code : "";
  document.getElementById("card-field").hidden = !!it;
  document.getElementById("active-field").hidden = !it;
  if (it) document.getElementById("biz-active").checked = !!it.is_active;
  openDialog("biz-dialog");
}

async function onBizSave(e) {
  e.preventDefault();
  var btn = document.getElementById("biz-save");
  var id = document.getElementById("biz-id").value;
  var name = document.getElementById("biz-name").value.trim();
  var address = document.getElementById("biz-address").value.trim();
  var url = document.getElementById("biz-url").value.trim();
  var cardRaw = document.getElementById("biz-card").value;
  if (!/^https?:\/\//i.test(url)) { toast("Link Google Review harus dimulai dengan http(s)://", "error"); return; }

  var payload = { name: name, address: address, google_review_url: url };
  setBusy(btn, true, "Menyimpan...");
  var error;
  if (id) {
    payload.is_active = document.getElementById("biz-active").checked;
    var resU = await sb.from("businesses").update(payload).eq("id", id);
    error = resU.error;
  } else {
    var code = null;
    if (cardRaw) {
      code = normalizeCardCode(cardRaw);
      if (!isValidCardCode(code)) {
        setBusy(btn, false);
        toast("Format kode kartu harus DEP-XXXXXX.", "error");
        return;
      }
    }
    payload.activation_code = code;
    payload.is_active = true;
    payload.slug = slugify(name) + "-" + randomSuffix();
    var resI = await sb.from("businesses").insert(payload);
    error = resI.error;
  }
  setBusy(btn, false);
  if (error) {
    if (error.code === "23505") toast("Kode kartu sudah dipakai bisnis lain.", "error");
    else toast("Gagal menyimpan: " + error.message, "error");
    return;
  }
  closeDialog("biz-dialog");
  toast("Tersimpan.", "success");
  await fetchData();
}

function onActivate() {
  var c = prompt("Scan / tempel kartu kosong, lalu tulis kodenya di sini:\nContoh: DEP-ABC123");
  if (!c) return;
  var code = normalizeCardCode(c);
  if (!isValidCardCode(code)) { toast("Format kode harus DEP-XXXXXX.", "error"); return; }
  location.href = "/k.html?code=" + encodeURIComponent(code);
}

async function openQr(id) {
  var it = items.find(function (i) { return i.id === id; });
  if (!it || !it.activation_code) return;
  if (typeof QRCode === "undefined") { toast("Library QR belum termuat. Periksa koneksi internet.", "error"); return; }
  var url = location.origin + "/k/" + it.activation_code;
  try {
    var dataUrl = await QRCode.toDataURL(url, { width: 440, margin: 2, color: { dark: "#202124", light: "#FFFFFF" } });
    document.getElementById("qr-img").src = dataUrl;
    document.getElementById("qr-code").textContent = it.activation_code;
    document.getElementById("qr-url").textContent = url;
    var dl = document.getElementById("qr-download");
    dl.href = dataUrl;
    dl.download = it.activation_code + ".png";
    openDialog("qr-dialog");
  } catch (err) {
    toast("Gagal membuat QR.", "error");
  }
}

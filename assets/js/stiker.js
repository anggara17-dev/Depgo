/* Depgo - generator stiker (stiker.html) */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  showBannerIfUnconfigured();
  if (!window.sb) return;
  var session = await getSession();
  if (!session) { location.replace("/admin.html"); return; }

  var domainInput = document.getElementById("stiker-domain");
  domainInput.value = localStorage.getItem("depgo-stiker-domain") || location.origin;
  domainInput.addEventListener("input", function () {
    localStorage.setItem("depgo-stiker-domain", domainInput.value.trim());
  });

  document.getElementById("btn-regenerate").addEventListener("click", render);
  document.getElementById("btn-print").addEventListener("click", function () { window.print(); });
  document.getElementById("stiker-count").addEventListener("change", render);
  document.getElementById("logout-btn").addEventListener("click", logout);

  render();
}

function getBase() {
  var d = document.getElementById("stiker-domain").value.trim().replace(/\/+$/, "");
  if (d && !/^https?:\/\//i.test(d)) d = "https://" + d;
  return d;
}

async function render() {
  if (typeof QRCode === "undefined") { toast("Library QR belum termuat. Periksa koneksi internet.", "error"); return; }
  var base = getBase();
  if (!base) { toast("Isi domain website terlebih dahulu.", "error"); return; }

  var n = parseInt(document.getElementById("stiker-count").value, 10);
  if (isNaN(n) || n < 1) n = 12;
  if (n > 24) n = 24;
  document.getElementById("stiker-count").value = n;

  var sheet = document.getElementById("sheet");
  sheet.innerHTML = '<div class="sheet-loading">Membuat QR...</div>';
  var frag = document.createDocumentFragment();

  for (var i = 0; i < n; i++) {
    var code = randomCardCode();
    var url = base + "/k/" + code;
    var img = "";
    try {
      img = await QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: "#202124", light: "#FFFFFF" } });
    } catch (e) {}
    var el = document.createElement("div");
    el.className = "sticker";
    el.innerHTML =
      '<img alt="QR ' + code + '"' + (img ? ' src="' + img + '"' : "") + ">" +
      '<div class="s-text">' +
      '<div class="s-brand">DEPGO</div>' +
      '<div class="s-title">Scan &amp; Beri Ulasan Google</div>' +
      '<div class="s-code">' + code + "</div>" +
      "</div>";
    frag.appendChild(el);
  }
  sheet.innerHTML = "";
  sheet.appendChild(frag);
}

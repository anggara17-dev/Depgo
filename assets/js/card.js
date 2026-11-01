/* Depgo - alur kartu (/k/KODE) */
document.addEventListener("DOMContentLoaded", init);

var STATES = ["state-loading", "state-invalid", "state-blank", "state-activate", "state-done"];

function setState(id) {
  STATES.forEach(function (s) {
    var el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

async function init() {
  showBannerIfUnconfigured();
  var code = codeFromLocation();
  document.querySelectorAll("[data-code]").forEach(function (el) {
    el.textContent = code || "-";
  });
  if (!code || !isValidCardCode(code)) {
    setState("state-invalid");
    return;
  }
  setState("state-loading");

  var row = null;
  if (window.sb) {
    var res = await sb.from("businesses")
      .select("name,slug,is_active")
      .eq("activation_code", code)
      .maybeSingle();
    if (!res.error && res.data) row = res.data;
  }
  if (row && row.is_active) {
    location.replace("/b/" + encodeURIComponent(row.slug));
    return;
  }

  var form = document.getElementById("activate-form");
  form.addEventListener("submit", makeSubmit(code));
  var session = await getSession();
  setState(session ? "state-activate" : "state-blank");
}

function makeSubmit(code) {
  return async function (e) {
    e.preventDefault();
    var name = document.getElementById("act-name").value.trim();
    var address = document.getElementById("act-address").value.trim();
    var url = document.getElementById("act-url").value.trim();
    if (!/^https?:\/\//i.test(url)) { toast("Link Google Review harus dimulai dengan http(s)://", "error"); return; }
    var btn = document.getElementById("activate-save");
    setBusy(btn, true, "Mengaktivasi...");
    var slug = slugify(name) + "-" + randomSuffix();
    var res = await sb.from("businesses").insert({
      name: name,
      address: address,
      google_review_url: url,
      activation_code: code,
      slug: slug,
      is_active: true,
    });
    setBusy(btn, false);
    if (res.error) {
      if (res.error.code === "23505") toast("Kode kartu sudah terpakai.", "error");
      else toast("Gagal: " + res.error.message, "error");
      return;
    }
    document.getElementById("done-name").textContent = name;
    setState("state-done");
    setTimeout(function () {
      location.replace("/b/" + encodeURIComponent(slug));
    }, 1400);
  };
}

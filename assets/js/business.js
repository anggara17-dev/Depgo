/* Depgo - halaman bisnis publik (/b/slug) */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  showBannerIfUnconfigured();
  var slug = slugFromLocation();
  if (!slug || !window.sb) { notFound(); return; }

  var res = await sb.from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (res.error || !res.data) { notFound(); return; }
  var data = res.data;

  document.getElementById("biz-name").textContent = data.name;
  document.getElementById("biz-initial").textContent = (data.name || "B").trim().charAt(0).toUpperCase();
  var addr = document.getElementById("biz-addr");
  addr.textContent = data.address || "";
  addr.hidden = !data.address;
  var link = document.getElementById("review-link");
  link.href = data.google_review_url;
  document.title = "Ulasan Google - " + data.name;

  document.getElementById("biz-loading").hidden = true;
  document.getElementById("biz-content").hidden = false;
}

function notFound() {
  document.getElementById("biz-loading").hidden = true;
  document.getElementById("biz-notfound").hidden = false;
}

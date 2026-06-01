// Theme: default dark + an Android-green accent (Material 3 dynamic color seed).
var THEME_SEED = "#3ddc84";
(function () {
  var m = localStorage.getItem("mode") || "dark";
  document.body.classList.remove("dark", "light");
  document.body.classList.add(m);
  // beercss/material modules load async; retry until ui() is ready.
  (function apply() {
    try {
      ui("theme", THEME_SEED);
      ui("mode", m);
    } catch (e) {
      setTimeout(apply, 150);
    }
  })();
})();

function toggleMode() {
  var next = document.body.classList.contains("dark") ? "light" : "dark";
  try { ui("mode", next); } catch (e) {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(next);
  }
  localStorage.setItem("mode", next);
}

function copyText(t) {
  if (navigator.clipboard) navigator.clipboard.writeText(t);
}

// Client-side search over the live search.json (read from jsDelivr)
document.addEventListener("DOMContentLoaded", function () {
  var q = document.getElementById("q");
  if (!q) return;
  var results = document.getElementById("results");
  var hint = document.getElementById("hint");
  var fwTpl = (document.getElementById("i18nFirmware") || {}).textContent || "{n}";
  var noRes = (document.getElementById("i18nNoResults") || {}).textContent || "No results";
  var data = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function run() {
    if (!data) return;
    var term = (q.value || "").trim().toLowerCase();
    if (!term) { results.innerHTML = ""; hint.hidden = false; return; }
    hint.hidden = true;
    var hits = data.filter(function (e) { return (e.text || "").indexOf(term) >= 0; }).slice(0, 200);
    if (!hits.length) { results.innerHTML = '<p class="secondary-text">' + esc(noRes) + "</p>"; return; }
    results.innerHTML = hits.map(function (e) {
      var url = window.DEVICES_BASE + encodeURIComponent(e.group) + "/" + encodeURIComponent(e.model) + "/";
      var cnt = fwTpl.replace("{n}", e.firmwareCount == null ? "" : e.firmwareCount);
      var brand = e.retailBranding || e.manufacturer;
      var sub = [brand, cnt, e.latestSecurityPatch].filter(Boolean).map(esc).join(" · ");
      return '<div class="s12 m6 l4"><article class="round border card-link"><a href="' + url +
        '"><nav class="no-space"><i>smartphone</i><h6 class="small max">' + esc(e.marketingName || e.displayModel || e.model) +
        '</h6><i>arrow_forward</i></nav><p class="small-text muted">' + sub + "</p></a></article></div>";
    }).join("");
  }

  fetch(window.CDN_BASE + "/search.json").then(function (r) { return r.json(); })
    .then(function (d) { data = d; run(); }).catch(function () {});
  q.addEventListener("input", run);
});

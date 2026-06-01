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

function hostOf(u) {
  try { return new URL(u).hostname; } catch (e) { return ""; }
}

// beercss shows a <dialog> when it has the `active` class (its .modal CSS is gated on
// `.active`, NOT the native [open] state). Toggle that class directly so it works
// regardless of beercss's global ui() timing.
function showDialog(id) {
  var d = document.getElementById(id);
  if (d) d.classList.add("active");
}
function closeDialog(el) {
  var d = el && el.closest ? el.closest("dialog") : null;
  if (d) d.classList.remove("active");
}
// close on Escape, or when the dialog backdrop (the <dialog> element itself) is clicked
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var a = document.querySelector("dialog.active");
    if (a) a.classList.remove("active");
  }
});
document.addEventListener("click", function (e) {
  if (e.target && e.target.tagName === "DIALOG" && e.target.classList.contains("active")) {
    e.target.classList.remove("active");
  }
});

// Download-source chooser modal (Original Google vs archive.org mirror).
function openDownload(btn) {
  var orig = btn.getAttribute("data-original") || "";
  var mirrors = (btn.getAttribute("data-mirror") || "").split(",").filter(Boolean);
  var box = document.getElementById("dlSources");
  var L = window.I18N || {};
  function row(url, label, icon) {
    return '<a class="row wave padding round" href="' + url + '" rel="noopener" onclick="closeDialog(this)">' +
      '<i>' + icon + '</i><div class="max"><div class="bold">' + label +
      '</div><div class="small-text muted break">' + hostOf(url) + '</div></div>' +
      '<i>download</i></a>';
  }
  var html = "";
  if (orig) html += row(orig, L.dlOriginal || "Original", "cloud_download");
  mirrors.forEach(function (m) { html += row(m, L.dlMirror || "Mirror", "inventory_2"); });
  box.innerHTML = html || "—";
  showDialog("dlModal");
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
    if (!hits.length) { results.innerHTML = '<li class="muted">' + esc(noRes) + "</li>"; return; }
    results.innerHTML = hits.map(function (e) {
      var url = window.DEVICES_BASE + encodeURIComponent(e.group) + "/" + encodeURIComponent(e.model) + "/";
      var cnt = fwTpl.replace("{n}", e.firmwareCount == null ? "" : e.firmwareCount);
      var brand = e.retailBranding || e.manufacturer;
      var sub = [brand, cnt, e.latestSecurityPatch].filter(Boolean).map(esc).join(" · ");
      return '<li><a href="' + url + '" class="max row"><i>smartphone</i><div class="max">' +
        '<div class="bold">' + esc(e.marketingName || e.displayModel || e.model) + "</div>" +
        '<div class="small-text muted">' + sub + "</div></div><i>arrow_forward</i></a></li>";
    }).join("");
  }

  fetch(window.CDN_BASE + "/search.json").then(function (r) { return r.json(); })
    .then(function (d) { data = d; run(); }).catch(function () {});
  q.addEventListener("input", run);
});

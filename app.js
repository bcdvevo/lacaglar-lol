/* Tek sayfa. Veri data/*.json'dan gelir, türetilen hiçbir şey dosyada tutulmaz. */
(function () {
  "use strict";

  var TL = window.TshirtLayout;
  var state = { campaign: null, regions: [], donors: [], view: "front", selected: null };

  var money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

  /* --- türetilen değerler: hiçbiri JSON'a yazılmaz --- */
  function holderOf(region) {
    var eligible = region.sponsors.filter(function (s) { return s.total >= region.floor; });
    if (!eligible.length) return null;
    return eligible.slice().sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      return String(a.lastAt).localeCompare(String(b.lastAt)); // eşitlikte önce ulaşan
    })[0];
  }
  function totalRaised() {
    return state.donors.reduce(function (n, d) { return n + d.total; }, 0);
  }

  /* --- geri sayım --- */
  function tickCountdown() {
    var el = document.getElementById("countdown");
    var end = new Date(state.campaign.closeISO).getTime();
    var ms = end - Date.now();
    if (ms <= 0) { el.textContent = "KAPANDI"; return; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sec = s % 60;
    el.textContent = d + "g " + pad(h) + ":" + pad(m) + ":" + pad(sec);
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  /* --- vücut haritası --- */
  function renderHotspots() {
    var box = document.getElementById("hotspots");
    box.innerHTML = "";
    state.regions.filter(function (r) { return r.view === state.view; }).forEach(function (r) {
      var h = r.hotspot, holder = holderOf(r);
      var b = document.createElement("button");
      b.className = "hs" + (holder ? " taken" : "") + (state.selected === r.id ? " is-sel" : "");
      b.style.left = h.x + "%"; b.style.top = h.y + "%";
      b.style.width = h.w + "%"; b.style.height = h.h + "%";
      b.setAttribute("aria-label", r.label);
      if (holder && holder.logo) {
        var img = document.createElement("img");
        img.src = "logos/" + holder.logo; img.alt = holder.brand;
        b.appendChild(img);
      } else {
        var t = document.createElement("span");
        t.className = "tag"; t.textContent = r.label;
        b.appendChild(t);
      }
      b.addEventListener("click", function () { select(r.id); });
      box.appendChild(b);
    });
  }

  function select(id) {
    state.selected = id;
    renderHotspots();
    renderPanel();
  }

  function renderPanel() {
    var el = document.getElementById("panel");
    var r = state.regions.find(function (x) { return x.id === state.selected; });
    if (!r) { el.innerHTML = '<p class="panel-empty">Bir bölgeye dokun.</p>'; return; }
    var holder = holderOf(r);
    var need = holder ? holder.total + 1 : r.floor;

    var html = "<h3>" + esc(r.label) + "</h3>";
    html += '<p class="floor">Taban tutar ' + money.format(r.floor) + "</p>";
    html += '<div class="holder">';
    if (holder) {
      html += '<div class="who">' + esc(holder.brand) + "</div>";
      html += '<div class="amt">' + money.format(holder.total) + "</div>";
    } else {
      html += '<div class="none">Bu bölge henüz sahipsiz.</div>';
    }
    html += "</div>";
    html += '<p class="need">Tahtı almak için toplam bağışın <b>' + money.format(need) +
            "</b> üstüne çıkmalı. Daha önce bağışladıysan üstüne eklemen yeterli.</p>";
    html += '<a class="cta" href="' + esc(state.campaign.formUrl || "#") + '">Bu bölge için bağış bildir</a>';
    el.innerHTML = html;
  }

  /* --- tişört --- */
  function renderShirt() {
    var el = document.getElementById("shirt");
    var warn = document.getElementById("shirtWarn");
    if (!state.donors.length) { el.innerHTML = '<span class="empty">İlk isim seni bekliyor.</span>'; return; }
    var res = TL.layout(state.donors.filter(function (d) { return d.onShirt !== false; }), { maxWidth: 620, maxHeight: 700 });
    el.innerHTML = TL.toSvg(res, { fill: "#111" });
    if (res.overflow.length) {
      warn.hidden = false;
      warn.textContent = "Tişört kapasitesi doldu: " + res.overflow.length +
        " isim baskıya giremiyor. Kurallar gereği en alt kademe kesilir.";
    } else { warn.hidden = true; }
  }

  /* --- listeler --- */
  function renderThrones() {
    var el = document.getElementById("thrones");
    var rows = [];
    state.regions.forEach(function (r) {
      r.sponsors.forEach(function (s) { rows.push({ region: r.label, s: s }); });
    });
    rows.sort(function (a, b) { return b.s.total - a.s.total; });
    if (!rows.length) { el.innerHTML = '<p class="empty">Henüz bölge sahibi yok.</p>'; return; }
    el.innerHTML = rows.map(function (x) {
      return '<div class="row"><div><div class="rname">' + esc(x.s.brand) +
        '</div><div class="rregion">' + esc(x.region) + '</div></div>' +
        '<div class="ramt">' + money.format(x.s.total) + "</div></div>";
    }).join("");
  }

  function renderSupporters() {
    var el = document.getElementById("supporters");
    var list = state.donors.slice().sort(function (a, b) { return b.total - a.total; });
    if (!list.length) { el.innerHTML = '<p class="empty">Henüz destekçi yok.</p>'; return; }
    el.innerHTML = list.map(function (d) {
      return '<span class="chip">' + esc(d.name) + " · " + money.format(d.total) + "</span>";
    }).join("");
  }

  function renderCampaign() {
    var c = state.campaign;
    var ngo = c.ngo || {};
    setText("total", money.format(totalRaised()));
    if (c.runner) setText("runner", c.runner);
    if (c.race) setText("race", c.race);
    if (ngo.name) setText("ngoFoot", ngo.name);
    if (ngo.campaignCode) setText("code", ngo.campaignCode);
    renderNotice(c);
    renderBank(ngo, c);
    renderReportLink(c, ngo);
  }

  /* Yumuşak açılış: dernek onayı gelene kadar hesap bilgileri ve bildirim
     bağlantısı gizli. campaign.donationsOpen true yapıldığında ikisi de açılır. */
  function renderNotice(c) {
    var el = document.getElementById("notice");
    if (!el || c.donationsOpen) { if (el) el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<b>Bağış kabulü " + esc(c.opensAtText || "yakında") + " açılıyor.</b> " +
      "Bölgeleri, kuralları ve tişörtü şimdi inceleyebilirsin. " +
      "Hesap bilgileri açılışta yayınlanacak.";
  }

  function renderBank(ngo, c) {
    var el = document.getElementById("bank");
    if (!el) return;
    if (!ngo.iban || !c.donationsOpen) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      "<dl>" +
      row("Hesap adı", ngo.fullName || ngo.name) +
      row("Banka", ngo.bank) +
      '<dt>IBAN</dt><dd class="iban">' + esc(ngo.iban) + "</dd>" +
      row("Açıklamaya yaz", ngo.campaignCode + " / marka adınız") +
      "</dl>" +
      '<p class="note">' + esc(ngo.note || "") +
      (ngo.donateUrl ? ' <a href="' + esc(ngo.donateUrl) + '" target="_blank" rel="noopener">' +
        esc(ngo.name) + " bağış sayfası</a>" : "") + "</p>";
  }
  function row(k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>" : ""; }

  /* Bildirim e-postası: form servisi yok, mailto yeterli. Konu ve gövde önden
     doldurulur ki eksik bilgiyle gelen bildirim sayısı düşsün. */
  function renderReportLink(c, ngo) {
    var a = document.getElementById("formLink");
    var hint = document.getElementById("formHint");
    if (!c.contactEmail || !c.donationsOpen) {
      a.hidden = true;
      if (hint) {
        hint.hidden = false;
        hint.textContent = c.donationsOpen
          ? "İletişim adresi henüz eklenmedi."
          : "Bağış kabulü açıldığında bildirim bağlantısı burada olacak.";
      }
      return;
    }
    if (hint) hint.hidden = true;
    a.hidden = false;
    var body = [
      "Marka adı:",
      "Bölge:",
      "Bağış tutarı:",
      "Havale tarihi:",
      "Site adresi:",
      "Tişörte yazılacak isim (en fazla 24 karakter):",
      "",
      "Ekler: dekont + logo (SVG tercih, yoksa saydam PNG)",
      "",
      "Kuralları okudum: bağış doğrudan " + (ngo.name || "") + " hesabına yapıldı,",
      "iadesi yok, tahttan düşersem bağışım listede kalır."
    ].join("\n");
    a.href = "mailto:" + c.contactEmail +
      "?subject=" + encodeURIComponent("Bağış bildirimi - " + (ngo.campaignCode || "")) +
      "&body=" + encodeURIComponent(body);
  }

  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[<>&"']/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c];
    });
  }

  /* --- görünüm sekmeleri --- */
  function photoFor(view) {
    var v = (state.campaign && state.campaign.views) || {};
    return v[view] ? "assets/" + v[view] : null;
  }

  function applyView(view) {
    state.view = view;
    state.selected = null;
    var img = document.getElementById("runnerImg");
    var src = photoFor(view);
    img.src = src || "assets/runner-" + view + ".svg";
    img.alt = "Koşucu, " + (view === "front" ? "ön" : "arka") + " görünüm";
    renderHotspots(); renderPanel();
  }

  function setupTabs() {
    var tabs = document.querySelectorAll(".vt");
    var shown = 0;
    tabs.forEach(function (b) {
      // fotoğrafı olmayan görünümün sekmesi hiç çizilmez; boş siluet gerçek
      // fotoğrafın yanında bozuk durur
      if (!photoFor(b.dataset.view)) { b.remove(); return; }
      shown++;
      b.addEventListener("click", function () {
        document.querySelectorAll(".vt").forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on");
        applyView(b.dataset.view);
      });
    });
    if (shown < 2) document.querySelector(".viewtabs").hidden = true;
  }

  /* --- açılış --- */
  Promise.all([
    fetch("data/regions.json?v=" + Date.now()).then(function (r) { return r.json(); }),
    fetch("data/donors.json?v=" + Date.now()).then(function (r) { return r.json(); })
  ]).then(function (res) {
    state.campaign = res[0].campaign;
    state.regions = res[0].regions;
    state.donors = res[1].donors || [];
    renderCampaign(); setupTabs(); applyView(photoFor("front") ? "front" : "back");
    renderShirt(); renderThrones(); renderSupporters();
    tickCountdown(); setInterval(tickCountdown, 1000);
  }).catch(function (e) {
    document.getElementById("panel").innerHTML = '<p class="panel-empty">Veri yüklenemedi: ' + esc(e.message) + "</p>";
  });
})();

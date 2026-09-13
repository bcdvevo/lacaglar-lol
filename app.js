/* Tek sayfa. Veri data/*.json'dan gelir; toplam, sıralama ve punto hesaplanır. */
(function () {
  "use strict";

  var TL = window.TshirtLayout;
  var state = { c: null, donors: [] };
  var money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
  var num = new Intl.NumberFormat("tr-TR");

  function totalRaised() {
    return state.donors.reduce(function (n, d) { return n + d.total; }, 0);
  }
  function onShirt() {
    return state.donors.filter(function (d) { return d.onShirt !== false; });
  }
  function sorted() {
    return state.donors.slice().sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      return String(a.verifiedAt).localeCompare(String(b.verifiedAt)); // eşitlikte önce ulaşan
    });
  }

  /* --- geri sayım --- */
  function tick() {
    var el = document.getElementById("countdown");
    var ms = new Date(state.c.closeISO).getTime() - Date.now();
    if (ms <= 0) { el.textContent = "KAPANDI"; return; }
    var s = Math.floor(ms / 1000);
    el.textContent = Math.floor(s / 86400) + "g " + pad((s % 86400) / 3600 | 0) + ":" +
                     pad((s % 3600) / 60 | 0) + ":" + pad(s % 60);
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  /* --- baskı: sayfanın kahramanı. Ön ve arka aynı, tek dizgiden --- */
  function renderPrint() {
    var list = onShirt();
    var wall = document.getElementById("print");
    var front = document.getElementById("teeFront");
    var back = document.getElementById("teeBack");
    var warn = document.getElementById("shirtWarn");
    var meta = document.getElementById("printMeta");

    if (!list.length) {
      wall.innerHTML = '<p class="empty">İlk isim seni bekliyor.</p>';
      front.innerHTML = ""; back.innerHTML = "";
      meta.textContent = "Henüz kimse yok.";
      warn.hidden = true;
      return;
    }
    var res = TL.layout(list, Object.assign({ minAmount: state.c.minToAppear }, state.c.print));
    wall.innerHTML = TL.toSvg(res, { fill: "#0f0f12", pad: 10, bg: "#f3f3f0" });
    var tee = TL.toTeeSvg(res, { fill: "#0f0f12" });
    front.innerHTML = tee;
    back.innerHTML = tee;

    var sizes = res.lines.flatMap(function (l) { return l.items.map(function (i) { return i.size; }); });
    meta.innerHTML = "<b>" + list.length + " isim</b> · en büyük punto " +
      Math.max.apply(null, sizes) + ", en küçük " + Math.min.apply(null, sizes);

    if (res.overflow.length) {
      warn.hidden = false;
      warn.textContent = res.overflow.length + " isim baskı alanına sığmadı. " +
        "Tasarımı büyütüyoruz; kimse listeden çıkarılmayacak.";
    } else warn.hidden = true;
  }

  /* Tutar → punto önizlemesi. Baskıyla aynı fonksiyonu kullanır: gösterilen
     boyut tahmin değil, o tutarın gerçekten alacağı boyut. */
  function setupSizer() {
    var range = document.getElementById("amtRange");
    var label = document.getElementById("amtLabel");
    var stage = document.getElementById("sizePreview");
    var note = document.getElementById("sizeNote");
    var input = document.getElementById("nameInput");
    if (!range) return;

    function render() {
      var amount = Number(range.value);
      label.textContent = money.format(amount);
      var top = Math.max(amount, state.donors.reduce(function (m, d) {
        return Math.max(m, d.total); }, 0));
      var pt = TL.sizeFor(amount, top, state.c.print);
      // sahnedeki genişlik baskı alanının genişliğine oranlanır
      var stageW = stage.parentElement.clientWidth - 32;
      var scale = stageW / (state.c.print.maxWidth || 620);
      stage.style.fontSize = Math.max(13, pt * scale * 1.9) + "px";
      stage.textContent = (input && input.value.trim()) || "Adın";
      note.textContent = state.donors.length
        ? "Şu anki en yüksek bağış " + money.format(top) + ". Puntolar ona göre ölçeklenir."
        : "İlk bağış yapan en büyük puntoyu alır.";
    }
    range.addEventListener("input", render);
    if (input) input.addEventListener("input", render);
    window.addEventListener("resize", render);
    render();
  }

  /* Tek yetkili hareket: bölümler ilk göründüklerinde yükselir. */
  function setupRise() {
    var els = document.querySelectorAll(".rise");
    if (!("IntersectionObserver" in window) ||
        matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* --- bağışçı listesi --- */
  function renderDonors() {
    var el = document.getElementById("donors");
    var sub = document.getElementById("donorSub");
    var list = sorted();
    if (!list.length) {
      el.innerHTML = '<li class="empty">Henüz bağışçı yok.</li>';
      sub.textContent = "";
      return;
    }
    sub.textContent = list.length + " bağışçı, toplam " + money.format(totalRaised()) + ".";
    el.innerHTML = list.map(function (d, i) {
      var cls = i < 3 ? " top" : "";
      return '<li class="drow' + cls + '"><span class="rank">' + (i + 1) + "</span>" +
        '<span class="dname">' + esc(d.name) + "</span>" +
        '<span class="damt">' + money.format(d.total) + "</span></li>";
    }).join("");
  }

  /* --- kampanya --- */
  function renderCampaign() {
    var c = state.c, ngo = c.ngo || {};
    setText("total", money.format(totalRaised()));
    setText("donorCount", num.format(state.donors.length));
    setText("runner", c.runner);
    setText("race", c.race);
    setText("ngoLede", ngo.name);
    setText("ngoFoot", ngo.name);
    setText("minAmount", money.format(c.minToAppear));

    var img = document.getElementById("runnerImg");
    if (c.photo) {
      img.src = "assets/" + c.photo;
      img.alt = c.runner + ", " + c.race;
      setText("photoCap", c.runner + " · " + c.race + " · " + c.venue);
    } else img.hidden = true;

    setText("operator", c.operator);
    var cl = document.getElementById("contactLink");
    if (cl && c.contactEmail) { cl.href = "mailto:" + c.contactEmail; cl.textContent = c.contactEmail; }
    renderNotice(c);
    renderBank(c, ngo);
    renderReport(c, ngo);
    setupGenerator(c);
  }

  /* Yumuşak açılış: LÖSEV onayı gelene kadar hesap bilgileri ve bildirim
     bağlantısı gizli. campaign.json'da donationsOpen true yapılınca ikisi açılır. */
  function renderNotice(c) {
    var el = document.getElementById("notice");
    if (c.donationsOpen) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<b>Bağış kabulü " + esc(c.opensAtText || "yakında") + " açılıyor.</b> " +
      "Kuralları ve tişörtü şimdi inceleyebilirsin; hesap bilgileri açılışta yayınlanacak.";
  }

  /* Benzersiz adres üreteci. Adresin yerel kısmı ismin kendisi: eşleştirme
     tablosu tutmak gerekmiyor, dolayısıyla sunucu da gerekmiyor. */
  var TR = { "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
             "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c" };
  function slugify(v) {
    var out = String(v).split("").map(function (ch) { return TR[ch] || ch; }).join("");
    out = out.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    out = out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return out.slice(0, 24).replace(/-+$/, "");
  }

  function setupGenerator(c) {
    var input = document.getElementById("nameInput");
    var out = document.getElementById("genAddr");
    var btn = document.getElementById("copyAddr");
    var hint = document.getElementById("genHint");
    if (!input || !c.mailDomain) return;

    function update() {
      var slug = slugify(input.value);
      if (!slug) { out.textContent = "…"; btn.disabled = true; return; }
      out.textContent = slug + "@" + c.mailDomain;
      btn.disabled = false;
    }
    input.addEventListener("input", update);
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(out.textContent).then(function () {
        btn.textContent = "Kopyalandı";
        setTimeout(function () { btn.textContent = "Kopyala"; }, 1600);
      }).catch(function () {
        hint.textContent = "Kopyalanamadı, adresi elle seç.";
      });
    });
    update();
  }

  function renderBank(c, ngo) {
    var el = document.getElementById("bank");
    var step = document.getElementById("stepPay");
    var online = document.getElementById("onlineLine");
    var code = ngo.campaignCode || "";

    if (online && ngo.donateUrl) {
      online.innerHTML = '<a href="' + esc(ngo.donateUrl) + '" target="_blank" rel="noopener">' +
        esc(ngo.name) + " tek seferlik bağış sayfası</a>.";
    }

    if (!c.donationsOpen || !ngo.iban) {
      el.hidden = true;
      step.innerHTML = "<strong>" + esc(ngo.name || "Derneğin") + "</strong> hesabına havale veya EFT yap. " +
        "Hesap bilgileri bağış kabulü açıldığında burada yayınlanacak.";
      return;
    }
    el.hidden = false;
    step.innerHTML = "Kart formundaki TC kimlik ve adres alanlarını doldurmak istemiyorsan " +
      "havale de yapabilirsin. Açıklamaya <code>" + esc(code) + "</code> ve tişörte " +
      "yazılmasını istediğin ismi yaz, sonra dekontu bize gönder.";
    el.innerHTML = "<dl>" +
      row("Hesap adı", ngo.fullName || ngo.name) +
      row("Banka", ngo.bank) +
      '<dt>IBAN</dt><dd class="iban">' + esc(ngo.iban) + "</dd>" +
      row("Açıklamaya yaz", code + " / tişörte yazılacak isim") +
      "</dl>" +
      '<p class="note">' + esc(ngo.note || "") +
      (ngo.donateUrl ? ' <a href="' + esc(ngo.donateUrl) + '" target="_blank" rel="noopener">' +
        esc(ngo.name) + " bağış sayfası</a>" : "") + "</p>";
  }
  function row(k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>" : ""; }

  /* Form servisi yerine ön doldurulmuş e-posta: yirmi bildirim için yeterli. */
  function renderReport(c, ngo) {
    var a = document.getElementById("reportLink");
    var hint = document.getElementById("reportHint");
    if (!c.donationsOpen || !c.contactEmail) {
      a.hidden = true; hint.hidden = false;
      hint.textContent = "Bağış kabulü açıldığında bildirim bağlantısı burada olacak.";
      return;
    }
    hint.hidden = true; a.hidden = false;
    var body = [
      "Tişörte yazılacak isim (en fazla 24 karakter):",
      "Bağış tutarı:",
      "Havale tarihi:",
      "",
      "Ek: dekont",
      "",
      "Kuralları okudum: bağış doğrudan " + (ngo.name || "") + " hesabına yapıldı, iadesi yok."
    ].join("\n");
    a.href = "mailto:" + c.contactEmail +
      "?subject=" + encodeURIComponent("Bağış bildirimi - " + (ngo.campaignCode || "")) +
      "&body=" + encodeURIComponent(body);
  }

  function setText(id, v) { var e = document.getElementById(id); if (e && v) e.textContent = v; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[<>&"']/g, function (ch) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[ch];
    });
  }

  Promise.all([
    fetch("data/campaign.json?v=" + Date.now()).then(function (r) { return r.json(); }),
    fetch("data/donors.json?v=" + Date.now()).then(function (r) { return r.json(); })
  ]).then(function (res) {
    state.c = res[0];
    state.donors = res[1].donors || [];
    renderCampaign(); renderPrint(); renderDonors(); setupSizer(); setupRise();
    tick(); setInterval(tick, 1000);
  }).catch(function (e) {
    document.getElementById("donors").innerHTML =
      '<li class="empty">Veri yüklenemedi: ' + esc(e.message) + "</li>";
  });
})();

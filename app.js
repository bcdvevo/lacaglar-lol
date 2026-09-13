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

  /* --- tişört: ön ve arka aynı baskı, tek dizgiden --- */
  function renderTees() {
    var list = onShirt();
    var front = document.getElementById("teeFront");
    var back = document.getElementById("teeBack");
    var warn = document.getElementById("shirtWarn");

    if (!list.length) {
      var empty = '<p class="teeempty">İlk isim seni bekliyor.</p>';
      front.innerHTML = empty; back.innerHTML = empty; warn.hidden = true;
      return;
    }
    var res = TL.layout(list, Object.assign({ minAmount: state.c.minToAppear }, state.c.print));
    var svg = TL.toTeeSvg(res, { fill: "#111" });
    front.innerHTML = svg;
    back.innerHTML = svg; // aynı tasarım, iki yüz
    if (res.overflow.length) {
      warn.hidden = false;
      warn.textContent = "Tişört kapasitesi doldu: " + res.overflow.length +
        " isim baskıya giremiyor. Kurallar gereği en küçük puntolular kesilir.";
    } else warn.hidden = true;
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

    renderNotice(c);
    renderBank(c, ngo);
    renderReport(c, ngo);
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

  function renderBank(c, ngo) {
    var el = document.getElementById("bank");
    var step = document.getElementById("stepPay");
    var code = ngo.campaignCode || "";

    if (!c.donationsOpen || !ngo.iban) {
      el.hidden = true;
      step.innerHTML = "<strong>" + esc(ngo.name || "Derneğin") + "</strong> hesabına havale veya EFT yap. " +
        "Hesap bilgileri bağış kabulü açıldığında burada yayınlanacak.";
      return;
    }
    el.hidden = false;
    step.innerHTML = "Aşağıdaki hesaba <strong>havale veya EFT</strong> yap. Açıklamaya " +
      "<code>" + esc(code) + "</code> ve tişörte yazılmasını istediğin ismi yaz. " +
      "Kredi kartıyla online bağışta açıklama alanı olmadığı için hangi bağışın kime ait " +
      "olduğunu ayırt edemiyoruz; bu yüzden yalnızca havale kabul ediyoruz.";
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
    renderCampaign(); renderTees(); renderDonors();
    tick(); setInterval(tick, 1000);
  }).catch(function (e) {
    document.getElementById("donors").innerHTML =
      '<li class="empty">Veri yüklenemedi: ' + esc(e.message) + "</li>";
  });
})();

/* Tişört isim dizgisi. Tek uygulama: hem tarayıcıdaki önizleme hem baskı dosyası
   bu fonksiyondan çıkar. İki ayrı dizgi kodu er geç ayrışır. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TshirtLayout = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var TIERS = [
    { upTo: 3,   size: 34 },
    { upTo: 10,  size: 24 },
    { upTo: 30,  size: 17 },
    { upTo: 1e9, size: 12 }
  ];

  function tierFor(rank) {
    for (var i = 0; i < TIERS.length; i++) if (rank <= TIERS[i].upTo) return TIERS[i].size;
    return 12;
  }

  // Ortalama karakter genişliği ~0.58em. Baskıda punto sabit olduğu için bu tahmin
  // yeterli; sınıra dayanınca son satırlar kesilir (kural olarak ilan edilmiş).
  function widthOf(text, size) { return text.length * size * 0.58; }

  /* donors: [{name, total}] — sıralanmamış olabilir.
     Döner: { lines: [{items:[{name,size}], height}], overflow: [isim...] } */
  function layout(donors, opts) {
    opts = opts || {};
    var maxWidth = opts.maxWidth || 640;
    var maxHeight = opts.maxHeight || 760;
    var gap = opts.gap || 14;

    var sorted = donors.slice().sort(function (a, b) { return b.total - a.total; });
    var lines = [], current = null, used = 0, overflow = [];

    for (var i = 0; i < sorted.length; i++) {
      var d = sorted[i];
      var size = tierFor(i + 1);
      var w = widthOf(d.name, size);

      if (!current || current.size !== size || current.width + gap + w > maxWidth) {
        if (current) { used += current.height; lines.push(current); }
        current = { items: [], width: 0, size: size, height: size * 1.45 };
        if (used + current.height > maxHeight) {
          overflow = sorted.slice(i).map(function (x) { return x.name; });
          current = null;
          break;
        }
      }
      current.width += (current.items.length ? gap : 0) + w;
      current.items.push({ name: d.name, size: size });
    }
    if (current) lines.push(current);
    return { lines: lines, overflow: overflow, maxWidth: maxWidth };
  }

  function toSvg(result, opts) {
    opts = opts || {};
    var pad = opts.pad || 30;
    var w = result.maxWidth + pad * 2;
    var y = pad;
    var body = "";
    result.lines.forEach(function (line) {
      y += line.height;
      var x = (result.maxWidth - line.width) / 2 + pad;
      line.items.forEach(function (it) {
        body += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + it.size +
                '" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" fill="' +
                (opts.fill || "#111") + '">' + escapeXml(it.name) + "</text>";
        x += it.name.length * it.size * 0.58 + 14;
      });
    });
    var h = y + pad;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h.toFixed(0) +
           '" width="' + w + '" height="' + h.toFixed(0) + '">' + body + "</svg>";
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c];
    });
  }

  return { layout: layout, toSvg: toSvg, tierFor: tierFor };
});

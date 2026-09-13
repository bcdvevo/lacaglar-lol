/* Tişört isim dizgisi. Punto doğrudan bağış tutarından hesaplanır.
   Tek uygulama: sitedeki önizleme ve baskıya giden dosya buradan çıkar. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TshirtLayout = factory();
})(typeof self !== "undefined" ? self : this, function () {

  var DEFAULTS = {
    maxWidth: 620, maxHeight: 860, gap: 16,
    minSize: 13, maxSize: 58, exponent: 0.45, floorSize: 9
  };

  /* Punto en yüksek bağışa göre normalize edilir, alt sınıra göre değil.
     Böylece en çok bağışlayan her zaman en büyük puntoyu alır ve ölçek
     kampanya büyüdükçe kendini ayarlar; sabit eşikte 5.000 ile 50.000
     aynı boyda çıkıyordu. Üs 0.45: küçük bağışlar okunur kalsın diye. */
  function sizeFor(amount, maxAmount, o) {
    o = Object.assign({}, DEFAULTS, o || {});
    var ratio = maxAmount > 0 ? Math.max(0, Math.min(1, amount / maxAmount)) : 0;
    return o.minSize + (o.maxSize - o.minSize) * Math.pow(ratio, o.exponent);
  }

  function widthOf(text, size) { return text.length * size * 0.58; }

  /* Sığmazsa tüm dizgiyi küçültüp yeniden dener. Bağış yapmış birini baskı
     dışında bırakmak son çare; önce punto feda edilir. */
  function layout(donors, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    var sorted = donors.slice().sort(function (a, b) { return b.total - a.total; });
    var maxAmount = sorted.length ? sorted[0].total : 0;

    var attempt = null;
    for (var scale = 1; scale >= 0.34; scale -= 0.04) {
      attempt = pack(sorted, maxAmount, o, scale);
      if (!attempt.overflow.length) break;
    }
    return attempt || { lines: [], overflow: [], maxWidth: o.maxWidth, opts: o };
  }

  function pack(sorted, maxAmount, o, scale) {
    var lines = [], cur = null, used = 0, overflow = [];
    for (var i = 0; i < sorted.length; i++) {
      var d = sorted[i];
      var size = Math.max(o.floorSize, Math.round(sizeFor(d.total, maxAmount, o) * scale));
      var w = widthOf(d.name, size);

      if (!cur) cur = { items: [], width: 0, height: 0 };
      var next = cur.width + (cur.items.length ? o.gap : 0) + w;
      if (cur.items.length && next > o.maxWidth) {
        if (used + cur.height > o.maxHeight) { overflow = names(sorted.slice(i)); cur = null; break; }
        used += cur.height; lines.push(cur);
        cur = { items: [], width: 0, height: 0 }; next = w;
      }
      cur.items.push({ name: d.name, size: size, total: d.total });
      cur.width = next;
      cur.height = Math.max(cur.height, size * 1.4);
    }
    if (cur && cur.items.length) {
      if (used + cur.height > o.maxHeight) overflow = overflow.concat(names(cur.items));
      else lines.push(cur);
    }
    return { lines: lines, overflow: overflow, maxWidth: o.maxWidth, opts: o, scale: scale };
  }
  function names(a) { return a.map(function (x) { return x.name; }); }

  /* İsim bloğunu <g> olarak üretir; hem düz SVG hem tişört maketi bunu kullanır. */
  function namesGroup(result, fill) {
    var y = 0, out = "";
    result.lines.forEach(function (line) {
      y += line.height;
      var x = (result.maxWidth - line.width) / 2;
      line.items.forEach(function (it) {
        out += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + it.size +
               '" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="800" fill="' +
               fill + '">' + escapeXml(it.name) + "</text>";
        x += widthOf(it.name, it.size) + result.opts.gap;
      });
    });
    return { svg: out, height: y };
  }

  function toSvg(result, opts) {
    opts = opts || {};
    var pad = opts.pad || 30, fill = opts.fill || "#111";
    var g = namesGroup(result, fill);
    var w = result.maxWidth + pad * 2, h = g.height + pad * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h.toFixed(0) +
      '" width="' + w + '" height="' + h.toFixed(0) + '">' +
      '<g transform="translate(' + pad + "," + pad + ')">' + g.svg + "</g></svg>";
  }

  /* Tişört maketi. Ön ve arka aynı baskı, tek tasarım. */
  function toTeeSvg(result, opts) {
    opts = opts || {};
    var fill = opts.fill || "#111";
    var tee = opts.teeFill || "#f2f2ef";
    var seam = opts.seamStroke || "#d8d8d2";
    var g = namesGroup(result, fill);

    // baski alani: 620x700 blok, tisortun govdesine olceklenir
    var area = { x: 190, y: 250, w: 420, h: 470 };
    var scale = Math.min(area.w / result.maxWidth, g.height ? area.h / g.height : 1);
    var bw = result.maxWidth * scale, bh = g.height * scale;
    var tx = area.x + (area.w - bw) / 2, ty = area.y + (area.h - bh) / 2;

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 940" width="800" height="940">' +
      '<path fill="' + tee + '" stroke="' + seam + '" stroke-width="3" d="' +
        'M300 70 L210 104 L58 190 L20 268 L128 330 L176 250 L176 880 L624 880 L624 250 L672 330 ' +
        'L780 268 L742 190 L590 104 L500 70 C476 132 324 132 300 70 Z"/>' +
      '<path fill="none" stroke="' + seam + '" stroke-width="3" d="M300 70 C324 132 476 132 500 70"/>' +
      '<g transform="translate(' + tx.toFixed(1) + "," + ty.toFixed(1) + ") scale(" + scale.toFixed(4) + ')">' +
        g.svg + "</g></svg>";
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c];
    });
  }

  return { layout: layout, toSvg: toSvg, toTeeSvg: toTeeSvg, sizeFor: sizeFor };
});

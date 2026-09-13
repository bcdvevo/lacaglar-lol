#!/usr/bin/env node
/* Baskiya giden dosya. Sitedeki onizleme ile ayni fonksiyondan cikar. */
const fs = require("fs");
const TL = require("./tshirt-layout.js");
const donors = JSON.parse(fs.readFileSync("data/donors.json", "utf8")).donors || [];
const res = TL.layout(donors.filter((d) => d.onShirt !== false), { maxWidth: 620, maxHeight: 700 });
fs.writeFileSync("tshirt.svg", TL.toSvg(res, { fill: "#111" }));
console.log(`tshirt.svg yazildi — ${res.lines.length} satir, ${donors.length - res.overflow.length} isim`);
if (res.overflow.length) console.log(`DISARIDA: ${res.overflow.length} isim — ${res.overflow.join(", ")}`);

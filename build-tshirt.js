#!/usr/bin/env node
/* Baskiya giden dosyalar. On ve arka ayni tasarim: tek dosya iki kez basilir. */
const fs = require("fs");
const TL = require("./tshirt-layout.js");
const c = JSON.parse(fs.readFileSync("data/campaign.json", "utf8"));
const donors = (JSON.parse(fs.readFileSync("data/donors.json", "utf8")).donors || [])
  .filter((d) => d.onShirt !== false);

const res = TL.layout(donors, Object.assign({ minAmount: c.minToAppear }, c.print));
fs.writeFileSync("tshirt-baski.svg", TL.toSvg(res, { fill: "#111" }));
fs.writeFileSync("tshirt-maket.svg", TL.toTeeSvg(res, { fill: "#111" }));
console.log(`tshirt-baski.svg (baskiya giden) + tshirt-maket.svg (onizleme)`);
console.log(`${res.lines.length} satir, ${donors.length - res.overflow.length} isim`);
if (res.overflow.length) console.log(`DISARIDA (${res.overflow.length}): ${res.overflow.join(", ")}`);

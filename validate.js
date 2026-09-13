#!/usr/bin/env node
/* Veri tutarlilik kontrolu. CI'da ve commit oncesi kosar. */
const fs = require("fs");
const path = require("path");
const TL = require("./tshirt-layout.js");

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

const regionsDoc = JSON.parse(fs.readFileSync("data/regions.json", "utf8"));
const donorsDoc = JSON.parse(fs.readFileSync("data/donors.json", "utf8"));

const c = regionsDoc.campaign || {};
["raceDateISO", "closeISO"].forEach((k) => {
  if (!c[k]) err(`campaign.${k} bos`);
  else if (isNaN(new Date(c[k]).getTime())) err(`campaign.${k} gecersiz tarih: ${c[k]}`);
});
if (new Date(c.closeISO) >= new Date(c.raceDateISO + "T23:59:59+03:00"))
  err("closeISO yaris gununden sonra");
["runner", "formUrl"].forEach((k) => { if (!c[k]) warn(`campaign.${k} hala bos`); });
if (!c.ngo || !c.ngo.name) warn("campaign.ngo.name hala bos");
if (!c.ngo || !c.ngo.donateUrl) warn("campaign.ngo.donateUrl hala bos");

const views = c.views || {};
["front", "back"].forEach((v) => {
  const used = (regionsDoc.regions || []).some((r) => r.view === v);
  if (used && !views[v]) err(`${v} gorunumunde bolge var ama campaign.views.${v} bos`);
  if (views[v] && !fs.existsSync(path.join("assets", views[v])))
    err(`campaign.views.${v}: dosya yok — assets/${views[v]}`);
  if (!views[v]) warn(`${v} fotografi yok — o gorunum sitede cikmaz`);
});

const ids = new Set();
const byView = { front: [], back: [] };

(regionsDoc.regions || []).forEach((r, i) => {
  const at = `regions[${i}] (${r.id || "?"})`;
  if (!r.id) err(`${at}: id yok`);
  if (ids.has(r.id)) err(`${at}: id tekrar ediyor`);
  ids.add(r.id);
  if (!r.label) err(`${at}: label yok`);
  if (!["front", "back"].includes(r.view)) err(`${at}: view front|back olmali`);
  if (!(typeof r.floor === "number" && r.floor > 0)) err(`${at}: floor pozitif sayi olmali`);

  const h = r.hotspot || {};
  ["x", "y", "w", "h"].forEach((k) => {
    if (typeof h[k] !== "number" || h[k] < 0 || h[k] > 100) err(`${at}: hotspot.${k} 0-100 disinda`);
  });
  if (h.x - h.w / 2 < 0 || h.x + h.w / 2 > 100 || h.y - h.h / 2 < 0 || h.y + h.h / 2 > 100)
    err(`${at}: hotspot cerceveden tasiyor`);
  if (byView[r.view]) byView[r.view].push(r);

  const brands = new Set();
  (r.sponsors || []).forEach((s, j) => {
    const sa = `${at}.sponsors[${j}]`;
    if (!s.brand) err(`${sa}: brand yok`);
    if (brands.has(s.brand)) err(`${sa}: ayni marka iki kez — birikmis toplam tek satirda olmali`);
    brands.add(s.brand);
    if (!(typeof s.total === "number" && s.total > 0)) err(`${sa}: total pozitif sayi olmali`);
    if (!s.lastAt || isNaN(new Date(s.lastAt).getTime())) err(`${sa}: lastAt gecersiz`);
    if (s.total >= r.floor && !s.logo) err(`${sa}: taban tutari gecmis ama logo yok`);
    if (s.logo && !fs.existsSync(path.join("logos", s.logo))) err(`${sa}: logo dosyasi yok — logos/${s.logo}`);
    if (s.total < r.floor) warn(`${sa}: taban altinda (${s.total} < ${r.floor}) — bolgeyi almaz`);
  });
});

// hotspot cakismasi
Object.entries(byView).forEach(([view, list]) => {
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i].hotspot, b = list[j].hotspot;
      const ox = Math.abs(a.x - b.x) * 2 < a.w + b.w;
      const oy = Math.abs(a.y - b.y) * 2 < a.h + b.h;
      if (ox && oy) warn(`${view}: ${list[i].id} ile ${list[j].id} hotspot'lari cakisiyor`);
    }
});

const names = new Set();
(donorsDoc.donors || []).forEach((d, i) => {
  const at = `donors[${i}] (${d.name || "?"})`;
  if (!d.name) err(`${at}: name yok`);
  if ([...d.name].length > 24) err(`${at}: 24 karakter siniri asildi (${[...d.name].length})`);
  if (names.has(d.name)) err(`${at}: ayni isim iki kez — birikmis toplam tek satirda olmali`);
  names.add(d.name);
  if (!(typeof d.total === "number" && d.total > 0)) err(`${at}: total pozitif sayi olmali`);
  if (!d.verifiedAt || isNaN(new Date(d.verifiedAt).getTime())) err(`${at}: verifiedAt gecersiz`);
});

// her bolge sponsoru donors icinde olmali (tisorte de girsin)
(regionsDoc.regions || []).forEach((r) =>
  (r.sponsors || []).forEach((s) => {
    if (s.brand && !names.has(s.brand)) warn(`${s.brand}: bolge sponsoru ama donors.json'da yok — tisorte girmez`);
  })
);

const shirt = TL.layout((donorsDoc.donors || []).filter((d) => d.onShirt !== false),
  { maxWidth: 620, maxHeight: 700 });
if (shirt.overflow.length) warn(`tisort kapasitesi asildi: ${shirt.overflow.length} isim disarida`);

warns.forEach((w) => console.log("UYARI  " + w));
errors.forEach((e) => console.log("HATA   " + e));
console.log(`\n${errors.length} hata, ${warns.length} uyari`);
process.exit(errors.length ? 1 : 0);

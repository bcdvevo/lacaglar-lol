#!/usr/bin/env node
/* Veri tutarlilik kontrolu. CI'da ve commit oncesi kosar. */
const fs = require("fs");
const TL = require("./tshirt-layout.js");

const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

const c = JSON.parse(fs.readFileSync("data/campaign.json", "utf8"));
const donors = JSON.parse(fs.readFileSync("data/donors.json", "utf8")).donors || [];

["raceDateISO", "closeISO"].forEach((k) => {
  if (!c[k]) err(`campaign.${k} bos`);
  else if (isNaN(new Date(c[k]).getTime())) err(`campaign.${k} gecersiz tarih: ${c[k]}`);
});
if (c.closeISO && c.raceDateISO && new Date(c.closeISO) >= new Date(c.raceDateISO + "T23:59:59+03:00"))
  err("closeISO yaris gununden sonra");
if (!(typeof c.minToAppear === "number" && c.minToAppear > 0)) err("campaign.minToAppear pozitif sayi olmali");
if (c.photo && !fs.existsSync("assets/" + c.photo)) err(`campaign.photo dosyasi yok: assets/${c.photo}`);
["runner", "contactEmail", "operator"].forEach((k) => { if (!c[k]) warn(`campaign.${k} hala bos`); });
if (!c.donationsOpen) warn("donationsOpen false — IBAN ve bildirim baglantisi sitede gizli");

const ngo = c.ngo || {};
["name", "iban", "campaignCode"].forEach((k) => { if (!ngo[k]) err(`campaign.ngo.${k} bos`); });
if (ngo.iban && !/^TR\d{24}$/.test(ngo.iban.replace(/\s/g, "")))
  err(`campaign.ngo.iban gecersiz TR IBAN: ${ngo.iban}`);

const names = new Set();
donors.forEach((d, i) => {
  const at = `donors[${i}] (${d.name || "?"})`;
  if (!d.name) err(`${at}: name yok`);
  else {
    if ([...d.name].length > 24) err(`${at}: 24 karakter siniri asildi (${[...d.name].length})`);
    if (names.has(d.name)) err(`${at}: ayni isim iki kez — birikmis toplam tek satirda olmali`);
    names.add(d.name);
  }
  if (!(typeof d.total === "number" && d.total > 0)) err(`${at}: total pozitif sayi olmali`);
  else if (d.total < c.minToAppear) warn(`${at}: alt sinirin altinda (${d.total} < ${c.minToAppear})`);
  if (!d.verifiedAt || isNaN(new Date(d.verifiedAt).getTime())) err(`${at}: verifiedAt gecersiz`);
});

const shirt = TL.layout(donors.filter((d) => d.onShirt !== false),
  Object.assign({ minAmount: c.minToAppear }, c.print));
if (shirt.overflow.length)
  warn(`tisort kapasitesi asildi: ${shirt.overflow.length} isim disarida (${shirt.overflow.join(", ")})`);

warns.forEach((w) => console.log("UYARI  " + w));
errors.forEach((e) => console.log("HATA   " + e));
console.log(`\n${errors.length} hata, ${warns.length} uyari`);
process.exit(errors.length ? 1 : 0);

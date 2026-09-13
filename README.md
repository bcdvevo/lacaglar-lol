# lacaglar.lol — Bağış Koşusu

LÖSEV'e bağış yap, adın **Lütfullah Çağlar**'ın HYROX İzmir'de (19 Eylül 2026)
giyeceği tişörte basılsın. Punto bağış tutarına göre.

**Site parayı hiç tutmaz.** Bağış doğrudan LÖSEV hesabına yapılır, dekont elle
doğrulanır. Açık artırma, vücut bölgesi, komisyon yok.

Bağış kapanışı: **16 Eylül 2026 23:59** · Canlı: https://lacaglar.lol

Tasarım notu: vault → `🏰 300-Projects/kosu-bagis/2026-09-13-tasarim.md`

## Çalıştırma

    python3 -m http.server 8000     # http://localhost:8000

Build adımı yok. `fetch` ile `data/*.json` okunur.

## Bir bağışı yayına alma

1. Dekontu doğrula: gönderen adı, tutar, açıklamadaki isim.
2. `data/donors.json` → ilgili ismin `total`'ını **güncelle**. Yeni satır açma;
   aynı kişi tekrar bağışladıysa toplamı artar, puntosu büyür.
3. `node validate.js` — hatasız olmalı.
4. Commit + push. Site yenilenir.

Toplam, sıralama ve punto **hesaplanır**, hiçbir dosyada yazmaz.

## Bağış kabulünü açma

`data/campaign.json` → `"donationsOpen": true`. IBAN kartı ve bildirim bağlantısı
aynı anda görünür olur. LÖSEV onayı gelmeden açma.

## Kapanıştan sonra (17 Eylül)

    node build-tshirt.js
    # tshirt-baski.svg  -> baskıcıya giden dosya
    # tshirt-maket.svg  -> tişört maketi (önizleme)

Ön ve arka aynı tasarım: tek dosya iki kez basılır.

## Punto nasıl hesaplanır

En yüksek bağış en büyük puntoyu alır, diğerleri ona göre ölçeklenir
(`(tutar / en_yüksek) ^ 0.45`). Sabit eşik kullanılmıyor; öyle olsaydı belli bir
tutardan sonra herkes aynı boyda çıkardı.

Dizgi sığmazsa **tüm puntolar orantılı küçültülür** ve yeniden denenir. Bağış
yapmış birini baskı dışında bırakmak son çare.

## Yayın

GitHub Pages, `bcdvevo/lacaglar-lol`, `main` dalı. Alan adı GoDaddy'de:
apex için dört A kaydı (185.199.108-111.153), `www` için CNAME.
`CNAME` dosyası repoda.

## Dosyalar

| Dosya | İş |
|---|---|
| `index.html` `style.css` `app.js` | tek sayfa |
| `tshirt-layout.js` | punto + dizgi — tarayıcı ve node ortak |
| `data/campaign.json` | kampanya, dernek, baskı ayarları |
| `data/donors.json` | bağışçılar |
| `validate.js` | şema + tutarlılık kontrolü |
| `build-tshirt.js` | baskı dosyaları |

## Yapılacak

- [ ] LÖSEV onayı → `donationsOpen: true`
- [ ] HYROX Race Director yazılı izni (tişört için gerekmiyor, vücut baskısı için gerekli)
- [ ] `bagis@lacaglar.lol` yönlendirmesi (ImprovMX)
- [ ] Baskıcı (İzmir, elden teslim)

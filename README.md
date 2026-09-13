# kosu-bagis

Bir koşucunun vücut bölgeleri, tek bir derneğe yapılan bağış karşılığında marka alanı.
**Site parayı hiç tutmaz** — bağış doğrudan derneğe yapılır, makbuz elle doğrulanır.

Yarış: **HYROX İzmir, 19 Eylül 2026** · Bağış kapanışı: **16 Eylül 2026 23:59**

Tasarım: vault → `🏰 300-Projects/kosu-bagis/2026-09-13-tasarim.md`

## Çalıştırma

    python3 -m http.server 8000     # sonra http://localhost:8000

Build adımı yok. Statik dosyalar; `fetch` ile `data/*.json` okunur.

## Bir bağışı yayına alma

1. Makbuzu doğrula (tutar + açıklamada marka adı).
2. Logoyu `logos/` altına koy (SVG tercih, yoksa saydam PNG).
3. `data/donors.json` → ilgili markanın `total`'ını **güncelle** (yeni satır açma, birikir).
4. Bölge alındıysa `data/regions.json` → o bölgenin `sponsors` dizisinde markanın
   `total`'ını güncelle.
5. `node validate.js` — hatasız olmalı.
6. Commit + push. Site yenilenir.

Sahiplik, taht sırası ve toplam bağış **hesaplanır**; hiçbir dosyada yazmaz.
Tek gerçek kaynağı `total` alanıdır.

## Kapanıştan sonra (17 Eyl)

    node build-tshirt.js    # tshirt.svg — baskıya giden dosya

Sitedeki önizleme ile baskı dosyası aynı fonksiyondan (`tshirt-layout.js`) çıkar.

## Dosyalar

| Dosya | İş |
|---|---|
| `index.html` `style.css` `app.js` | tek sayfa |
| `tshirt-layout.js` | isim dizgisi — tarayıcı + node ortak |
| `data/regions.json` | kampanya + bölgeler + bölge sponsorları |
| `data/donors.json` | tüm bağışçılar (tişört listesi) |
| `validate.js` | şema + tutarlılık kontrolü |
| `build-tshirt.js` | baskı dosyası üretimi |
| `assets/runner-*.svg` | **geçici siluet** — gerçek fotoğrafla değişecek |

## Yapılacak

- [ ] Koşucunun ön/arka fotoğrafı → `assets/`, hotspot koordinatları yeniden ölçülecek
- [ ] Dernek seçimi → `campaign.ngo`
- [ ] Bağış bildirim formu (Tally) → `campaign.formUrl`
- [ ] Taban tutarların gözden geçirilmesi
- [ ] HYROX Race Director yazılı izni (vücut yüzeyi bu izne bağlı)

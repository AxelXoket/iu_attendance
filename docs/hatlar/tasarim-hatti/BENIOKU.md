# tasarim.html üretim hattı

Repodaki `tasarim.html` bu klasörden üretilir. Repo dışındadır; araştırma ve ara dosyalar repoya girmez.

## Yeniden üretmek

```
cd variants/A2
node tools/build.js                       # tasarim.html'i tokens.json, bölümler ve doc/sections parçalarından kurar
node ../../tcheck.js tokens.json --css tokens.css --table contrast.html
node tools/build.js                       # kontrast tablosu değiştiyse ikinci kez
```

Sonra `variants/A2/tasarim.html`, `../../belgeler/tasarim.html` dosyasının yerine konur. 11 Ekim 2026 sürümü (backend bağlantısıyla) md5 35a92df2e204ff6c190a13e4b02660b3.

## Kapılar

- `node dgate.js <html> --repo ../../belgeler`: tire, yasak renk (sarı ve yeşil), kırık bağlantı, dış bağımlılık, köşe.
- `node shot.js <html> <çıktı> --widths 390,1440 --reduced --hover "#b-primary|#b-secondary|#b-ghost" --elements "#scr-home|#scr-scan|#scr-success|#scr-qr|#scr-records|#scr-panel"`: başsız Chrome; hata, taşma, hareket denetimi, ekran başına gece mavisi payı.
- `variants/A2/tools/rulecheck.js` ve `variants/A2/tools/interact.js`: CSS kuralları ve canlı etkileşim testleri.

## Diğerleri

- `locked.json`: kilitli renkler (değiştirilmez).
- `doc/sections/`: Özet, İlkeler, Erişilebilirlik, Platformlar, Kütüphaneler, Açık noktalar ve Kaynaklar parçaları.
- `lib/final.json`, `lib/stats.json`, `lib2html.js`: kütüphane tabloları (sayılar `libstats.js` ile ölçülür).
- `research/`, `verify/`, `research2html.js`: araştırma dosyası (`../tasarim-arastirmasi.html`).

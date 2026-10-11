# backend-hatti

belgeler/backend klasörünü üreten kaynak ve kapılar. Sayfalar elle düzeltilmez: değişiklik buradaki JSON'da yapılır, sonra `bash uret.sh` çalışır.

## Kaynak
- `spec/D01.json` .. `D15.json`: modül şartnameleri (tablolar ve sütunları, uç noktalar, işler, dış yüz, durumlar, kurallar, testler, açık noktalar, gerekçeler).
- `frag/Dxx.html`: modül sayfalarının metni (amaç, kurallar, durumlar, hata kodları, açık noktalar). Modüllerin çoğunda bu iki dosyayı `dXXwork/` ya da benzeri klasördeki bir üreteç yazar; üreteç varsa önce o değişir.
- `contracts.json`: hangi tablo, uç nokta, iş ve dosyanın hangi modülün olduğu, ortak kurallar, sınır kararları. `build-contracts.js` üretir.
- `packages/Dxx.json`: 302 iş paketi (dosyalar, tablolar, uçlar, işler, dışa açtıkları, kullandıkları, testler, bağımlılıklar, boy).
- `ozet/asama-NN.json`: 21 aşamanın özeti (kademe sayfalarının başındaki paragraflar).
- `align/`: mimarın modüller arası 128 kararı.

## Kapılar
- `spec-validate.js Dxx`: şartname contracts.json ile uyumlu, dosyalar modülün klasörlerinde, bağlantılar plan ve teknik çapalarına gidiyor.
- `schedule.js`: paketler çakışmıyor (dosya, tablo, uç, iş), döngü yok, aşamalar en çok 15 paket. `test-schedule.js` davranış testleri.
- `sahip-check.js`, `ozet-validate.js`, `link-check.js`: yazım kuralı, özet biçimi, bütün bağlantı ve çapalar.
- `gen-kademe.js <çıktı>`: aşamaları orta yüklü kademelere böler (A ve B) ve sayfaları yazar.

Ara dosyalar (wf-*.js iş akışları, dXXwork, d0Xfix, bak-sahip, out) çalışmanın izidir; yeniden üretim için gerekmez.

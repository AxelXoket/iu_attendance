// D05 "sahip" prose rewrite: exact, count-checked replacements in the generator sources and packages/D05.json notes.
// Usage: node edit.js [--dry]. Each pair must match exactly once, otherwise nothing is written.
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const GEN = B + '/D05work/gen/';
const R = {
  [GEN + 'icerik.js']: [
    ["cihazın sahibi olduğu imza doğrulandıktan sonra denetlenir.", "imza doğrulandıktan sonra cihazın bu öğrenciye ait olduğu denetlenir."],
    ["Liste sahibinde değişince bu tabloya göçü D05 yazar", "Bir liste sorumlu modülünde değişince bu tabloya göçü D05 yazar"],
    ["yalnız oturumun dersinin sahibi: D02.dersYetkisi(tx, istek.kimlik, dersId) üç parametreyle, sonuç 'sahip' olmalı.",
     "yalnız oturumun dersinin hocası: D02.dersYetkisi(tx, istek.kimlik, dersId) üç parametreyle çağrılır, sonuç dersin hocası olmalı."],
    ["oturum yok ya da çağıran o dersin sahibi değil (birleşim kuralı", "oturum yok ya da çağıran o dersin hocası değil (birleşim kuralı"],
    ["Okutma: D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) 'sahip' değil ve okutan, DersBilgisi.hocaAtamaGecmisi'nde okutma anının üst ucu bitisAni'sinden önce kalan önceki sahip de değil;",
     "Okutma: D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) sonucu dersin hocası değil ve okutan, DersBilgisi.hocaAtamaGecmisi'nde okutma anının üst ucu bitisAni'sinden önce kalan önceki hoca da değil;"],
    ["kararSurumu, etiketler } } } yalnız dersin sahibine\"", "kararSurumu, etiketler } } } yalnız dersin hocasına\""],
    ["okutan dersin sahibi değil (YOKLAMA_HOCANIN_DERSI_DEGIL, satır yazılır)", "okutan dersin hocası değil (YOKLAMA_HOCANIN_DERSI_DEGIL, satır yazılır)"],
    ["ya da dersin sahibine (okutma) taşır.", "ya da dersin hocasına (okutma) taşır."],
    ["(ders sahipliği kilitten sonra denetlenir, kalıcı iz kalmaz)", "(okutanın dersin hocası olduğu kilitten sonra denetlenir, kalıcı iz kalmaz)"],
    ["isleToplu gövdedeki hocayı paketin kişisiyle ve ders sahipliğini D02.dersYetkisi(tx, baglam.kimlik, dersId) ile (önceki sahip DersBilgisi.hocaAtamaGecmisi ile) denetler,",
     "isleToplu gövdedeki hocayı paketin kişisiyle, okutanın dersin hocası olduğunu da D02.dersYetkisi(tx, baglam.kimlik, dersId) ile (önceki hocayı DersBilgisi.hocaAtamaGecmisi ile) denetler,"],
    ["okutmayı makbuz_okutmalari'na yazar, dersin sahibine kaydın kararını döner.", "okutmayı makbuz_okutmalari'na yazar, dersin hocasına kaydın kararını döner."],
    ["CHECK kısıtları (değerler sahiplerinin sabitlerinden içe aktarılır,", "CHECK kısıtları (değerler sorumlu modüllerin sabitlerinden içe aktarılır,"],
    ["ders sahipliği (dersYetkisi ve hocaAtamaGecmisi)", "dersin hocası denetimi (dersYetkisi ve hocaAtamaGecmisi)"],
    ["dersin sahibi okutunca ZATEN_VAR.", "dersin hocası okutunca ZATEN_VAR."],
    ["DersBilgisi.hocaAtamaGecmisi'nde önceki sahip { kisiId, baslangicAni, bitisAni }", "DersBilgisi.hocaAtamaGecmisi'nde önceki hoca { kisiId, baslangicAni, bitisAni }"],
    ["öğede önceki sahip RET alır; şimdiki sahip (bitisAni null) her zaman KABUL", "öğede önceki hoca RET alır; şimdiki hoca (bitisAni null) her zaman KABUL"],
    ["(aynı hoca dersin sahibi yapıldı)", "(ders aynı hocaya devredildi)"],
    ["403 API_ROL_YETKISIZ; dersin sahibi 200.", "403 API_ROL_YETKISIZ; dersin hocası 200."],
    ["Sahibin kararı bekleniyor (D05-A01). O karara kadar önerilen seçenek kodlanır:", "Onay bekliyor (Açık noktalar, D05-A01). Karar verilene kadar önerilen seçenek kodlanır:"],
    ["tek tablodur; sahip öbür seçeneği seçerse yalnız bu tablo ve testleri değişir.", "tek tablodur; öbür seçenek seçilirse yalnız bu tablo ve testleri değişir."],
    ["öğrencinin makbuzunda ne gördüğünü değiştirdiği için sahip onaylar (D06-B05 aynı soru).", "öğrencinin makbuzunda ne gördüğünü değiştirdiği için bu bir ürün kararıdır ve onay bekler (D06-B05 aynı soru)."],
    ["okutmada OkutmaAyrintisi yalnız dersin sahibine.", "okutmada OkutmaAyrintisi yalnız dersin hocasına."],
    ["okutan kişi oturumun dersinin sahibi değilse (D02.dersYetkisi sonucu 'sahip' değil) kayıt işlenmez,",
     "okutan kişi oturumun dersinin hocası değilse (D02.dersYetkisi sonucu dersin hocası değilse) kayıt işlenmez,"],
    ["Birlikte işlenen şubelerde dersin sahibi olmak yeter. Ders sahipliği D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) ile üç parametreyle denetlenir;",
     "Birlikte işlenen şubelerde dersin hocası olmak yeter. Okutanın dersin hocası olduğu D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) ile üç parametreyle denetlenir;"],
    ["nesnesini kurmaz. Önceki sahip D02.dersGetir'in", "nesnesini kurmaz. Önceki hoca D02.dersGetir'in"],
    ["okutma anının üst ucu o sahipliğin bitisAni'sinden önceyse kabul edilir; okutma anı boşsa (çapasız öğe) önceki sahip kabul edilmez (D05-A13 kapandı).",
     "okutma anının üst ucu o hoca atamasının bitisAni'sinden önceyse kabul edilir; okutma anı boşsa (çapasız öğe) önceki hoca kabul edilmez (D05-A13 kapandı)."],
    ["D11'in QR kuralındaki gibi önceki sahibin yetkisiyle kalır;", "D11'in QR kuralındaki gibi önceki hocanın yetkisiyle kalır;"],
    ["Bu ayrım D05-A01 varsayılanıdır; sahip saklamadan reddi seçerse yalnız gerekceler.ts tablosu değişir", "Bu ayrım D05-A01 varsayılanıdır; saklamadan ret seçilirse yalnız gerekceler.ts tablosu değişir"],
    ["iOS 27 alanının sahibi bellidir;", "iOS 27 alanının sorumlu modülü bellidir;"],
    ["okutma yolunda önceki sahibin okutması okutma anının", "okutma yolunda önceki hocanın okutması okutma anının"],
    ["\"Yoklama modülü telefonda bir kez üretilip imzalanan kaydın sunucudaki tek sahibidir:", "\"Yoklama modülü telefonda bir kez üretilip imzalanan kaydın sunucudaki tek sorumlu modülüdür:"],
    ["Tek HTTP ucu, dersin sahibine oturumun kayıtlarını", "Tek HTTP ucu, dersin hocasına oturumun kayıtlarını"],
    ["büyük zaman damgası, tablo sahipliği, ana dalda generate farksızlığı", "büyük zaman damgası, tablonun sorumlu modülü, ana dalda generate farksızlığı"],
    ["listesinde yoklama_kaydi ve makbuz_okutmasi sahip 'yoklama' ile ve packages/contracts/src/yoklama.ts'teki ogeTuruTanimla şemalarıyla bulunur;",
     "listesinde yoklama_kaydi ve makbuz_okutmasi, öğe türünün modülü 'yoklama' olarak ve packages/contracts/src/yoklama.ts'teki ogeTuruTanimla şemalarıyla bulunur;"],
    // D13 renamed its option key to modul (s: { modul: ModulAdi }); the calls follow the callee signature.
    ["D13.ogeTuruTanimla('yoklama_kaydi', YoklamaKaydiGovdesi, { sahip: 'yoklama' })", "D13.ogeTuruTanimla('yoklama_kaydi', YoklamaKaydiGovdesi, { modul: 'yoklama' })"],
    ["D13.ogeTuruTanimla('makbuz_okutmasi', MakbuzOkutmasiGovdesi, { sahip: 'yoklama' })", "D13.ogeTuruTanimla('makbuz_okutmasi', MakbuzOkutmasiGovdesi, { modul: 'yoklama' })"],
    ["ogeTuruTanimla('yoklama_kaydi', KayitZarfiSemasi, { sahip: 'yoklama' });", "ogeTuruTanimla('yoklama_kaydi', KayitZarfiSemasi, { modul: 'yoklama' });"],
    ["ogeTuruTanimla('makbuz_okutmasi', OkutmaGovdesiSemasi, { sahip: 'yoklama' });", "ogeTuruTanimla('makbuz_okutmasi', OkutmaGovdesiSemasi, { modul: 'yoklama' });"],
  ],
  [GEN + 'uret.js']: [
    ["Bu modül o kaydın sunucudaki tek sahibidir:", "Bu modül o kaydın sunucudaki tek sorumlu modülüdür:"],
    ["değer listeleri sahibinin sözleşme sabitlerinden üretilir", "değer listeleri sorumlu modülün sözleşme sabitlerinden üretilir"],
    ["Bu ayrım varsayılandır, sahibin kararı D05-A01.", "Bu ayrım varsayılandır, onay bekliyor (Açık noktalar, D05-A01)."],
    ["Kilit ders sahipliğinden önce alınır:", "Kilit, okutanın dersin hocası olduğu denetlenmeden önce alınır:"],
    ["\"Okutan oturumun dersinin sahibi olmalı: D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) üç parametreyle 'sahip' döner. Önceki sahip D02.dersGetir'in DersBilgisi.hocaAtamaGecmisi alanından okunur ve yalnız okutma anının üst ucu o sahipliğin bitisAni'sinden önceyse kabul edilir; okutma anı boşsa önceki sahip kabul edilmez.",
     "\"Okutan oturumun dersinin hocası olmalı: D02.dersYetkisi(tx, PaketBaglami.kimlik, dersId) üç parametreyle dersin hocası sonucunu döner. Önceki hoca D02.dersGetir'in DersBilgisi.hocaAtamaGecmisi alanından okunur ve yalnız okutma anının üst ucu o hoca atamasının bitisAni'sinden önceyse kabul edilir; okutma anı boşsa önceki hoca kabul edilmez."],
    ["Dersin sahibine OkutmaAyrintisi ile kaydın kararı ve etiketleri döner.", "Dersin hocasına OkutmaAyrintisi ile kaydın kararı ve etiketleri döner."],
    ["D02.oturumGetir ve D02.dersYetkisi(tx, istek.kimlik, dersId) 'sahip' (değilse 404 YOKLAMA_BULUNAMADI);",
     "D02.oturumGetir ve D02.dersYetkisi(tx, istek.kimlik, dersId) ile dersin hocası sonucu (değilse 404 YOKLAMA_BULUNAMADI);"],
    ["Süre sahibin açık noktasıdır (plan.html#acik-saklama-suresi);", "Süre karar bekleyen açık noktadır (plan.html#acik-saklama-suresi);"],
    ["çağıran o oturumun dersinin sahibi değil (varlık sızdırılmaz)", "çağıran o oturumun dersinin hocası değil (varlık sızdırılmaz)"],
    ["D05-B05 ve D12-B18 sahibin D05-A01 kararına bağlı varsayılanla kodlanır.", "D05-B05 ve D12-B18, onay bekleyen D05-A01'in önerilen varsayılanıyla kodlanır."],
    ["o.needs_owner ? 'sahibin kararı' : 'koordinasyon'", "o.needs_owner ? 'onay bekliyor' : 'koordinasyon'"],
    ["Mimarın 10 Ekim 2026 kararlarıyla", "10 Ekim 2026 hizalama kararlarıyla"],
  ],
};
const dry = process.argv.includes('--dry');
let bad = 0; const out = {};
for (const [f, pairs] of Object.entries(R)) {
  let s = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log('COUNT', n, path.basename(f), JSON.stringify(a.slice(0, 80))); bad++; continue; }
    s = s.split(a).join(b);
  }
  out[f] = s;
}
// packages/D05.json: text fields only (notes), parsed and re-serialized with the same 1-space format.
const PK = B + '/packages/D05.json';
const raw = fs.readFileSync(PK, 'utf8');
const pk = JSON.parse(raw);
if (JSON.stringify(pk, null, 1) + '\n' !== raw) { console.log('packages/D05.json is not in canonical 1-space form'); bad++; }
const PN = [
  [8, 'Dersin sahibine kafa sayısı', 'Dersin hocasına kafa sayısı'],
  [10, '(hesap ve ders sahipliği, devirden önceki sahiplik,', '(hesap ve dersin hocası denetimi, devirden önceki hocanın okutması,'],
];
for (const [i, a, b] of PN) {
  const s = pk.packages[i].notes; const n = s.split(a).length - 1;
  if (n !== 1) { console.log('COUNT', n, 'packages', i, a); bad++; continue; }
  pk.packages[i].notes = s.split(a).join(b);
}
if (bad) { console.log(bad + ' problems, nothing written'); process.exit(1); }
if (!dry) { for (const [f, s] of Object.entries(out)) fs.writeFileSync(f, s, 'utf8'); fs.writeFileSync(PK, JSON.stringify(pk, null, 1) + '\n', 'utf8'); }
console.log((dry ? 'dry run OK, ' : 'written, ') + Object.values(R).reduce((a, p) => a + p.length, 0) + ' generator edits, ' + PN.length + ' package notes');

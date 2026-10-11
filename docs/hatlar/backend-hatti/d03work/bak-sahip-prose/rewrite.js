// One-shot prose rewrite: removes the "sahip" stem and third-person references to the decider
// from the D03 generator sources. Each replacement must match exactly the expected number of times.
'use strict';
const fs = require('fs'), path = require('path');
const W = path.resolve(__dirname, '..');
const R = [
  // build-d03.js
  ['build-d03.js', "row('Sahip olduğu',", "row('Sorumlu olduğu',", 1],
  ['build-d03.js', "yalnız dersin hocası görür (D02.dersYetkisi 'sahip'),", "yalnız dersin hocası görür (D02.dersYetkisi sonucu dersin hocası),", 1],
  ['build-d03.js', "D02.dersYetkisi(tx, kimlik, dersId) 'sahip' değilse 404 LISTELER_BULUNAMADI.", "D02.dersYetkisi(tx, kimlik, dersId) sonucu dersin hocası değilse 404 LISTELER_BULUNAMADI.", 1],
  ['build-d03.js', "// alignment round (align/D03.json): every open point left is the owner's; decided points are closed", "// alignment round (align/D03.json): every open point left awaits approval; decided points are closed", 1],
  ['build-d03.js', "const sahip = K.open_points.filter(o => o.needs_owner);", "const bekleyen = K.open_points.filter(o => o.needs_owner);", 1],
  ['build-d03.js', "<strong>Sahibin kararı gerekenler (${sahip.length})</strong>: spec önerilen seçenekle yazıldı, karar değişirse etkilenen yer yanında yazıyor.", "<strong>Onay bekleyenler (${bekleyen.length})</strong>: spec önerilen seçenekle yazıldı ve karar verilene kadar önerilen değer geçerlidir; karar değişirse etkilenen yer yanında yazıyor.", 1],
  ['build-d03.js', "${sahip.map(o => row(`${esc(o.id)} ${tag('warn', 'sahip')}`,", "${bekleyen.map(o => row(`${esc(o.id)} ${tag('warn', 'onay bekliyor')}`,", 1],
  // icerik.js
  ['icerik.js', "Yalnız dersin hocası: D02.dersYetkisi(tx, kimlik, dersId) 'sahip' döndürmeli; 'yonetici' ya da null ise", "Yalnız dersin hocası: D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu döndürmeli; 'yonetici' ya da null ise", 1],
  ['icerik.js', "ya da isteyen dersin hocası değilse ('sahip' değil) 404 LISTELER_BULUNAMADI", "ya da isteyen dersin hocası değilse (D02.dersYetkisi sonucu dersin hocası değil) 404 LISTELER_BULUNAMADI", 1],
  ['icerik.js', "yalnız dersin hocası (D02.dersYetkisi(tx, kimlik, dersId) 'sahip'), değilse 404 LISTELER_BULUNAMADI.", "yalnız dersin hocası (D02.dersYetkisi(tx, kimlik, dersId) sonucu dersin hocası), değilse 404 LISTELER_BULUNAMADI.", 4],
  ['icerik.js', "satırın dersinin hocası (D02.dersYetkisi(tx, kimlik, dersId) 'sahip'), değilse 404 LISTELER_BULUNAMADI.", "satırın dersinin hocası (D02.dersYetkisi(tx, kimlik, dersId) sonucu dersin hocası), değilse 404 LISTELER_BULUNAMADI.", 1],
  ['icerik.js', "isteyen dersin hocası değil (D02.dersYetkisi 'sahip' döndürmedi; 'yonetici' de bu kodu alır)", "isteyen dersin hocası değil (D02.dersYetkisi dersin hocası sonucunu döndürmedi; 'yonetici' de bu kodu alır)", 1],
  ['icerik.js', "(SubeId, DersId, DonemId, BirimId ve KisiId sahiplerinin markası;", "(SubeId, DersId, DonemId, BirimId ve KisiId kendi sorumlu modüllerinin markası;", 1],
  ['icerik.js', "Bugün D12'nin sureler.ts dosyası boştur, süre sahibin kararıyla gelene kadar hiçbir satır anonimleşmez", "Bugün D12'nin sureler.ts dosyası boştur; süre onay bekliyor ve karara bağlanıp gelene kadar hiçbir satır anonimleşmez", 1],
  ['icerik.js', "baştaki 0'ı düşmüş numara kendi sahibiyle eşleşemez", "baştaki 0'ı düşmüş numara kendi öğrencisiyle eşleşemez", 1],
  ['icerik.js', "anı kararın sahibi D07 seçer;", "anı karardan sorumlu modül D07 seçer;", 1],
  ['icerik.js', "kalanı metin. Sahipten maskeli bir gerçek örnek ve farklı dışa aktarım kullanan birim olup olmadığı bilgisi istenir (plan.html#acik);", "kalanı metin. Maskeli bir gerçek örnek ve farklı dışa aktarım kullanan birim olup olmadığı bilgisi bekleniyor (plan.html#acik);", 1],
  ['icerik.js', "(plan.html#kararlar-supheli-kayit), bu yüzden sahip onayı istenir. Spec bu öneriyle yazıldı.", "(plan.html#kararlar-supheli-kayit), bu yüzden bu nokta onay bekliyor. Spec bu öneriyle yazıldı.", 1],
  ['icerik.js', "\"Yalnız dersin hocası (D02.dersYetkisi(tx, kimlik, dersId) 'sahip'; 'yonetici' dönen yönetici 404 alır;", "\"Yalnız dersin hocası (D02.dersYetkisi(tx, kimlik, dersId) sonucu dersin hocası; 'yonetici' dönen yönetici 404 alır;", 1],
  ['icerik.js', "Ürün kararı ve D01'e yeni uç olduğundan sahip onayı ister.", "Ürün kararı ve D01'e yeni uç olduğundan onay bekliyor.", 1],
];
const src = {};
let fail = 0;
for (const [f, a, b, n] of R) {
  const p = path.join(W, f);
  if (!(f in src)) src[f] = fs.readFileSync(p, 'utf8');
  const got = src[f].split(a).length - 1;
  if (got !== n) { console.log(`MISMATCH ${f}: expected ${n}, found ${got}: ${a.slice(0, 80)}`); fail++; continue; }
  src[f] = src[f].split(a).join(b);
}
if (fail) { console.log('nothing written'); process.exit(1); }
for (const f in src) {
  if (/[–—]/.test(src[f])) { console.log('dash in ' + f); process.exit(1); }
  fs.writeFileSync(path.join(W, f), src[f], 'utf8');
}
for (const f in src) {
  const left = [...src[f].matchAll(/.{0,40}sahi[pb][a-zçğıöşü]*.{0,30}/gi)].map(m => m[0]);
  console.log(`${f}: ${left.length} stem left` + (left.length ? '\n  ' + left.join('\n  ') : ''));
}

// Rewrites the prose in build-d08.js that used the "sahip" stem. Each pair must match exactly the stated count.
// Original is saved next to this script as orig/build-d08.js (md5 dbe9aab2787a82ee0f7b0b341dc6f9f1).
// Usage: node patch-d08.js [--dry]
'use strict';
const fs = require('fs'), path = require('path');
const F = path.resolve(process.argv.find(a => a.endsWith('build-d08.js')) || 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/d08/build-d08.js');
const P = [
  // [from, to, expected count]
  ["p ve muaf değerlerini sahipleri yazar (D02, D03); D08 bu iki", "p değerini D02, muaf değerini D03 yazar; D08 bu iki", 1],
  ["D02.dersYetkisi(tx, kimlik, dersId) \\'sahip\\' dönmezse 404", "D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu vermezse 404", 2],
  ["Kaynak denetimi dersin sahipliğinden bağımsızdır:", "Kaynak denetimi kişinin dersin hocası olup olmamasından bağımsızdır:", 1],
  ["D02.dersYetkisi kullanılmaz, çünkü kişi dersin sahibiyse kapsama bakmadan \\'sahip\\' döner: dersin sahibi olan kapsam içi yönetici 200 alır",
   "D02.dersYetkisi kullanılmaz, çünkü kişi dersin hocasıysa kapsama bakmadan dersin hocası sonucunu verir: dersin hocası olan kapsam içi yönetici 200 alır", 1],
  ["dersin sahibi olan kapsam içi yönetici 200; 101", "dersin hocası olan kapsam içi yönetici 200; 101", 1],
  ["tanım farkı sahibe sorulan D02-A02\\'ye gider", "tanım farkı onay bekleyen açık nokta D02-A02\\'ye gider", 2],
  ["\"Sonradan değişenler\" listesinin sahibi D09 bununla", "\"Sonradan değişenler\" listesinin sorumlu modülü D09 bununla", 1],
  ["{ birimId }) sahiplikten bağımsız denetlenir (D02.dersYetkisi sahibe kapsama bakmadan sahip döner);",
   "{ birimId }) kişinin dersin hocası olup olmamasından bağımsız denetlenir (D02.dersYetkisi dersin hocasına kapsama bakmadan dersin hocası sonucunu verir);", 1],
  ["Sahiplik dalı kapsam kuralını iki yönden bozardı:", "D02.dersYetkisi\\'nin dersin hocası dalı kapsam kuralını iki yönden bozardı:", 1],
  ["ya da dersin sahibi olan kapsam içi yönetici 404 alırdı", "ya da dersin hocası olan kapsam içi yönetici 404 alırdı", 1],
  ["PLANLANAN tanımı sahibin açık noktası (D08-A06);", "PLANLANAN tanımı onay bekliyor (Açık noktalar, D08-A06);", 1],
  ["Teyitsiz numara sahiplenmesi başkasının devamını göremez.", "Numarayı teyitsiz üstlenen hesap başkasının devamını göremez.", 1],
  ["Sahip sonraki oturumu da tutmak isterse yalnız", "Sonraki oturum değişiminde de üçlü tutulmak istenirse yalnız", 1],
  [", true, 'sahip'),", ", true, 'onay bekliyor'),", 5],
  [", true, 'sahip, D10'),", ", true, 'onay bekliyor, D10'),", 1],
  [", true, 'sahip, D02'),", ", true, 'onay bekliyor, D02'),", 1],
  ["Sahiplerin sonuç birliği buna çevrilir:", "Değeri yazan modüllerin sonuç birliği buna çevrilir:", 1],
  ["(sahip rolüne vermek işleyiciyi yetki hatasıyla düşürürdü)", "(yetkiyi şemayı kuran yoklama_goc rolüne vermek işleyiciyi yetki hatasıyla düşürürdü)", 1],
  ["Sahiplerin sonuç birlikleri (D02.oranlariYaz, D03.muafIsaretle)", "Değeri yazan modüllerin sonuç birlikleri (D02.oranlariYaz, D03.muafIsaretle)", 1],
  ["4\\'ü sahibin açık noktasında (D08-A01, A02, A03, A04)", "4\\'ü onay bekleyen açık noktalarda (D08-A01, A02, A03, A04)", 1],
  ["p('Sahibin kararı gerekenlerde spec önerilen seçenekle yazıldı;", "p('Onay bekleyen noktalarda spec önerilen seçenekle yazıldı;", 1],
];
const raw = fs.readFileSync(F, 'utf8');
let s = raw;
const bad = [];
for (const [a, b, n] of P) {
  const got = s.split(a).length - 1;
  if (got !== n) bad.push(`expected ${n}, found ${got}: ${a}`);
  s = s.split(a).join(b);
}
if (bad.length) { console.log('STOP\n' + bad.join('\n')); process.exit(1); }
const left = s.match(/.{0,50}sahi[pb][a-zçğıöşü]*.{0,30}/gi) || [];
const dash = (s.match(/[\u2013\u2014]/g) || []).length;
if (!process.argv.includes('--dry')) fs.writeFileSync(F, s);
console.log(`${process.argv.includes('--dry') ? 'would rewrite' : 'rewrote'} ${P.reduce((t, p) => t + p[2], 0)} spots; sahip left: ${left.length}; dashes: ${dash}` + (left.length ? '\n' + left.join('\n') : ''));

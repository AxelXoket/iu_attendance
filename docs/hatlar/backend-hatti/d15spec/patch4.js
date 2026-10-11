// Review fixes, round 2.
'use strict';
const fs = require('fs');
const path = require('path');
let bad = 0;
function rep(file, a, b) {
  const p = path.join(__dirname, file);
  const t = fs.readFileSync(p, 'utf8');
  const n = t.split(a).length - 1;
  if (n !== 1) { console.log(`MATCH ${n} in ${file}: ${a.slice(0, 90)}`); bad++; return; }
  fs.writeFileSync(p, t.replace(a, () => b));
}
// tohum guard: refuse only in uretim (CI haftalık iş test ortamında küçük kipte kullanır)
rep('data4.js',
  "Tohum betiği apps/server/test/yuk/tohum.ts yalnız ISLETIM_ORTAM gelistirme ya da hazirlik iken çalışır (uretim'de ISLETIM_YUK_TOHUMU_YASAK ile çıkar).",
  "Tohum betiği apps/server/test/yuk/tohum.ts uretim dışındaki ortamlarda çalışır (gelistirme, test, hazirlik); ISLETIM_ORTAM uretim ise ISLETIM_YUK_TOHUMU_YASAK ile çıkar. --kucuk kipi (tek ders, tek öğrenci, tek cihaz) haftalık işin k6 denemesi içindir.");
rep('data2.js',
  "(3) k6 tek seferlik deneme (bir sanal kullanıcı, bir yineleme) aynı sunucuya: saat belgesi, gönderim, değişenler.",
  "(3) tohum.ts --kucuk ile tek ders, öğrenci ve cihaz kurulur; k6 tek seferlik deneme (bir sanal kullanıcı, bir yineleme) aynı sunucuya: saat belgesi, gönderim, değişenler.");
// stale schedule reference (D12 moved donem_bolumu_denetimi)
rep('data2.js',
  "D14 çizelgesine ek: 06:25 donem_bolumu_denetimi'nden sonra.",
  "D14 çizelgesine ek; 06:35'te başka günlük iş yok (en az 5 dakika aralık kuralı).");
if (bad) { console.log(bad + ' failed'); process.exit(1); }
console.log('patch4 ok');

const fs = require('fs');
let s = fs.readFileSync('build.js', 'utf8');
const R = [
  ['gosterim.steps.ts hocanın gösterim kaydını', 'gosterim.steps.ts (spec listesine eklenen adım dosyası) hocanın gösterim kaydını'],
  ['kapsam denetimleri (kapsam.steps.ts kancaları)', 'kapsam denetimleri (spec listesine eklenen kapsam.steps.ts kancaları)'],
  ['Bileşim kökünü gerektiren üç senaryo burada toplanır', 'Bileşim kökünü gerektiren üç senaryo spec listesine eklenen butunlesik.feature dosyasında toplanır'],
  ['Kilit testi D12 kilidini', 'Eklenen kilitler.test.ts D12 kilidini'],
  ['dinleyici testi aynı adın', 'eklenen dinleyiciler.test.ts aynı adın'],
  ['İki işlev de geçici veritabanında', 'İki işlev de eklenen iki test dosyasında geçici veritabanında'],
  ['ikisi de yazmaz. Geçici veritabanında', 'ikisi de yazmaz. Eklenen veri.test.ts geçici veritabanında'],
  ['D14.isGonder ile koyar. Geçici veritabanında doğrudan', 'D14.isGonder ile koyar. Eklenen baglanti.test.ts geçici veritabanında doğrudan'],
  ['(yeniden-hesap.ts içe aktarılmaz). Geçici veritabanında', '(yeniden-hesap.ts içe aktarılmaz). Eklenen onay.test.ts geçici veritabanında'],
];
for (const [a, b] of R) { const n = s.split(a).length - 1; if (n !== 1) console.log('count', n, a); s = s.split(a).join(b); }
fs.writeFileSync('build.js', s);

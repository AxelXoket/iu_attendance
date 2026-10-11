// Review fixes, round 3: backup set, two copies on one machine, cross-reference wording.
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
rep('data4.js',
  "Durumlar ve kurallar'daki çıkış listesi;",
  "D15-B10'daki çıkış listesi (Netleştirilenler);");
rep('data4.js',
  "Çevrimdışı yedek: anahtar-uret yedekle sırları ve özet listesini tek arşive koyar;",
  "Çevrimdışı yedek: anahtar-uret yedekle saat_belgesi, qr_anahtar_kaynagi ve ulasma_makbuzu kümelerini ve özet listesini tek arşive koyar (giriş kodu özeti, e-posta özeti ve inceleme kodu yedeklenmez, kaybolunca yenisi üretilir; ulaşma makbuzu anahtarı yedekten dönen makbuzlu kaydı doğrulamak için gerekir, D12-B31);");
rep('data4.js',
  "İki API kopyası (api-1, api-2) ayrı Compose servisi.",
  "İki API kopyası (api-1, api-2) aynı makinede ayrı Compose servisi; amaç kesintisiz yayındır, ölçek değil: teknik.html'deki 'kopyalar çoğalınca' (@fastify/otel, xprem için S3 deposu) çok makineli büyümeyi anlatır ve bu tasarımla tetiklenmez.");
rep('data4.js',
  "teknik.html#altyapi-guncellemeler xprem imajı Dependabot dışında.",
  "teknik.html#altyapi-guncellemeler xprem imajı Dependabot dışında; teknik.html#dagitim-ayrinti-korunacak-anahtarlar çevrimdışı yedek listesine ulaşma makbuzu anahtarı; teknik.html#altyapi-servisler aynı makinede iki API kopyası (kesintisiz yayın için) ve API imajının kayıt deposundan (GHCR) özetle çekilmesi.");
if (bad) { console.log(bad + ' failed'); process.exit(1); }
console.log('patch6 ok');

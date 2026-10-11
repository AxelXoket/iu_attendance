// Align round, part 9: two wording fixes found in the read-through. Exact-once.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 90)); s = s.replace(a, () => b); };
rep(`İstanbul günü dönüşümü D04\\'ün saat yardımcısından gelir.'`, `İstanbul günü dönüşümü D04\\'ün istanbulTarihi yardımcısından gelir.'`);
rep(`İmzalar contracts.json'daki D08 listesiyle aynıdır; oturumSaatleri ve kapsamdaMi sözleşmedeki 'oturumSaatleri ve kapsam yüklemi' satırının iki adıdır.`,
    `İşlev imzaları contracts.json'daki D08 listesiyle aynıdır; oturumSaatleri ve kapsamdaMi sözleşmedeki 'oturumSaatleri ve kapsam yüklemi' satırının iki adıdır. DEVAM_NEDENLERI, DEVAM_SON_DURUMLARI ve DEVAM_DENETIM_OLAYLARI sözleşme dosyasının sabitleridir; D02, D03, D05, D09 ve D10 onları içe aktarır, yeniden yazmaz.`);
fs.writeFileSync(f, s);
console.log('p9 ok');

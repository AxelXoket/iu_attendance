// Wire data6 (shared files, image, release workflows) into build.js.
'use strict';
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'build.js');
let t = fs.readFileSync(p, 'utf8');
let bad = 0;
function rep(a, b) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.log(`MATCH ${n}: ${a.slice(0, 80)}`); bad++; return; }
  t = t.replace(a, () => b);
}
rep("const d5 = require('./data5.js');", "const d5 = require('./data5.js');\nconst d6 = require('./data6.js');");
rep("  dosya_semalari: d5.dosya_semalari.map(([dosya, bicim, kim]) => ({ dosya, bicim, kim })),\n};",
  "  dosya_semalari: d5.dosya_semalari.map(([dosya, bicim, kim]) => ({ dosya, bicim, kim })),\n  paketler: d6.paketler,\n  imaj: d6.imaj,\n  yayin_is_akislari: d6.yayin_is_akislari,\n};");
rep("out.push(details('Süreç açılışı ve kapanışı (server.ts): sıra sabit, her adım tek yerde',",
  "out.push(details('Paylaşılan tek dosyalar: paket sürümleri, pnpm ayarları, Biome kuralları, betikler', ul(spec.paketler.map(T))));\n" +
  "out.push(details('İmaj: tek Dockerfile, iki hedef (sunucu ve caddy), özetle sabit tabanlar', ul(spec.imaj.map(T))));\n" +
  "out.push(details('Yayın iş akışları: sunucu imajı ve uzaktan güncelleme, ikisi de onaylı ortamda', ul(spec.yayin_is_akislari.map(T))));\n" +
  "out.push(details('Süreç açılışı ve kapanışı (server.ts): sıra sabit, her adım tek yerde',");
if (bad) { console.log(bad + ' failed'); process.exit(1); }
fs.writeFileSync(p, t);
console.log('patch2 ok');

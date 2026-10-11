// Fragment summaries: one informative line per <summary>.
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
rep("  const first = Object.keys(e.response)[0];\n  out.push(details(`${e.method} ${e.path}: ${e.client}, başarıda ${first}`, body));",
  "  const ozet = {\n" +
  "    '/health/live': 'iç ağdan canlılık: veritabanısız 204, kapanışta 503, aşırı yük dışında',\n" +
  "    '/health/ready': 'iç ağdan hazırlık: D12.semaDurumu 2 saniyede hazırsa 204, değilse nedenli 503',\n" +
  "    '/v1/durum': 'herkese açık dış denetim: gövdesiz 204, veritabanısız, aşırı yük dışında',\n" +
  "    '/v1/isletim/ekran-sureleri': 'panelin oturum ve ekran başına günlük ekran süresi toplamı, en büyük değer kalır',\n" +
  "  }[e.path];\n" +
  "  out.push(details(`${e.method} ${e.path}: ${ozet}`, body));");
rep("out.push(details(`${spec.contradictions_resolved.length} çelişki`,",
  "out.push(details(`${spec.contradictions_resolved.length} çelişki: ekran süresi oturum başına günlük toplam; sıra boşluğu bütün öğe türlerinin birleşiminde`,");
rep("out.push(details(`${spec.tests.length} test: ` + Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(', '),",
  "const turAdi = { behavior: 'davranış', property: 'özellik', contract: 'sözleşme', load: 'yük', mutation: 'mutasyon' };\n" +
  "out.push(details(`${spec.tests.length} test: ` + Object.entries(kinds).map(([k, n]) => `${n} ${turAdi[k] || k}`).join(', '),");
if (bad) { console.log(bad + ' failed'); process.exit(1); }
fs.writeFileSync(p, t);
console.log('patch3 ok');

// Mutation test of build.js self-checks and spec-validate.js for D06: each mutation must turn a check red,
// then the original bytes are written back and verified by md5. Finally the clean build must be green again.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const D = __dirname;
const run = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

const mutasyonlar = [
  { ad: 'gap B17 removed', dosya: 'veri-3.js', bul: 'gap: "D06-B17",', koy: 'gap: "D06-X17",', beklenen: /gap not resolved: D06-B17/ },
  { ad: 'en dash injected', dosya: 'veri-1.js', bul: 'Kurulum, bir uygulama kopyasında', koy: 'Kurulum – bir uygulama kopyasında', beklenen: /en or em dash present/ },
  { ad: 'broken anchor', dosya: 'veri-3.js', bul: 'plan.html#kararlar-gonderme-suresi', koy: 'plan.html#kararlar-gonderme-suresi-yok', beklenen: /broken anchor in spec/ },
  { ad: 'uncatalogued code', dosya: 'veri-3.js', bul: 'TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI (beklemeSaniye 5)', koy: 'TEKRAR_DENE ESITLEME_ZAMAN_ASIMI (beklemeSaniye 5)', beklenen: /code not in catalog: ESITLEME_ZAMAN_ASIMI/ },
  { ad: 'contradiction C02 removed', dosya: 'veri-3.js', bul: 'id: "D06-C02",', koy: 'id: "D06-Z02",', beklenen: /contradiction not resolved: D06-C02/ },
  { ad: 'owner gap without open point', dosya: 'veri-3.js', bul: '(D06-B05; D05-B05', koy: '(D05-B05', beklenen: /needs_owner gap without open point: D06-B05/ }
];

let kirmizi = 0;
for (const m of mutasyonlar) {
  const p = path.join(D, m.dosya);
  const asil = fs.readFileSync(p);
  const asilMd5 = md5(asil);
  const metin = asil.toString('utf8');
  if (!metin.includes(m.bul)) { console.log(`SKIP ${m.ad}: pattern not found`); process.exitCode = 1; continue; }
  fs.writeFileSync(p, metin.replace(m.bul, m.koy), 'utf8');
  delete require.cache[require.resolve(p)];
  const r = run(['build.js'], D);
  fs.writeFileSync(p, asil); // write original bytes back
  const geri = md5(fs.readFileSync(p));
  const cikti = r.stdout + r.stderr;
  const red = r.status !== 0 && m.beklenen.test(cikti);
  if (red) kirmizi++;
  console.log(`${red ? 'RED (good)' : 'NOT RED (bad)'}  ${m.ad}  exit=${r.status}  restored md5 ${geri === asilMd5 ? 'matches' : 'MISMATCH'}`);
  if (geri !== asilMd5) { console.log('ABORT: restore failed for ' + m.dosya); process.exit(2); }
}

// validator mutation: a planned file outside the globs must turn spec-validate.js red
const specYol = path.join(D, '..', 'spec', 'D06.json');
let r = run(['build.js'], D);
const temizSpec = fs.readFileSync(specYol);
const temizMd5 = md5(temizSpec);
const s = JSON.parse(temizSpec.toString('utf8'));
s.files.push('apps/server/src/modules/yoklama/sizinti.ts');
fs.writeFileSync(specYol, JSON.stringify(s, null, 2));
const v = run([path.join('..', 'spec-validate.js'), 'D06'], D);
fs.writeFileSync(specYol, temizSpec);
const vRed = v.status !== 0 && /planned file outside own globs/.test(v.stdout);
if (vRed) kirmizi++;
console.log(`${vRed ? 'RED (good)' : 'NOT RED (bad)'}  validator: file outside globs  restored md5 ${md5(fs.readFileSync(specYol)) === temizMd5 ? 'matches' : 'MISMATCH'}`);

// clean build and validator must be green again
r = run(['build.js'], D);
const v2 = run([path.join('..', 'spec-validate.js'), 'D06'], D);
console.log(`clean build exit=${r.status}, validator exit=${v2.status}: ${v2.stdout.trim()}`);
console.log(`${kirmizi}/${mutasyonlar.length + 1} mutations turned red`);
if (kirmizi !== mutasyonlar.length + 1 || r.status !== 0 || v2.status !== 0) process.exit(1);

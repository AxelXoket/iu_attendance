// Renames every code identifier that contains "sahip" (column, index, constraint, role, field and function names)
// across specs, sections, packages, contracts, the contracts generator and the module generator sources.
// Backs up each changed file under bak-sahip/ first. Usage: node rename-sahip.js [--dry]
const fs = require('fs'), path = require('path');
const D = __dirname;
const MAP = [
  ['yoklama_sahip_parolasi', 'yoklama_goc_parolasi'],
  ['yoklama_sahip', 'yoklama_goc'],
  ['onceki_sahip_kisi_idleri', 'onceki_hoca_kisi_idleri'],
  ['oncekiSahipKisiIdleri', 'oncekiHocaKisiIdleri'],
  ['sahip_hesap_durumu', 'hoca_hesap_durumu'],
  ['sahipHesapDurumu', 'hocaHesapDurumu'],
  ['sahiplik_gecmisi', 'hoca_atama_gecmisi'],
  ['sahiplikGecmisi', 'hocaAtamaGecmisi'],
  ['sahip_kisi_id', 'hoca_kisi_id'],
  ['sahipKisiId', 'hocaKisiId'],
  ['sahipsizDersKurali', 'hocasizDersKurali'],
  ['sahipDurumu', 'hocaDurumu'],
  ['sahipAtamaSurumu', 'hocaAtamaSurumu'],
  ['sahipBaglantiAdresi', 'gocBaglantiAdresi'],
  ['sahipAdresi', 'gocAdresi'],
];
const GEN = ['d01work', 'd02work', 'd03work', 'D04work', 'D05work', 'd06_spec_work', 'd07spec', 'd08', 'd09work', 'd10work', 'd11work', 'd12work', 'd13work', 'work-D14', 'd15work'];
const files = [
  ...fs.readdirSync(path.join(D, 'spec')).filter(f => f.endsWith('.json')).map(f => 'spec/' + f),
  ...fs.readdirSync(path.join(D, 'frag')).filter(f => f.endsWith('.html')).map(f => 'frag/' + f),
  ...fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f)).map(f => 'packages/' + f),
  'contracts.json', 'build-contracts.js',
  ...GEN.flatMap(g => fs.readdirSync(path.join(D, g), { recursive: true }).filter(f => /\.(js|json|html|md|txt)$/.test(f)).map(f => g + '/' + f.replace(/\\/g, '/'))),
];
const dry = process.argv.includes('--dry');
const count = Object.fromEntries(MAP.map(([a]) => [a, 0]));
let changed = 0;
for (const f of files) {
  const p = path.join(D, f);
  if (!fs.statSync(p).isFile()) continue;
  const raw = fs.readFileSync(p, 'utf8');
  let s = raw;
  for (const [a, b] of MAP) { const n = s.split(a).length - 1; if (n) { count[a] += n; s = s.split(a).join(b); } }
  if (s !== raw) {
    changed++;
    if (!dry) { const bk = path.join(D, 'bak-sahip', f); fs.mkdirSync(path.dirname(bk), { recursive: true }); fs.writeFileSync(bk, raw); fs.writeFileSync(p, s); }
  }
}
console.log((dry ? 'would change ' : 'changed ') + changed + ' files; ' + Object.entries(count).filter(([, n]) => n).map(([a, n]) => a + ' ' + n).join(', '));

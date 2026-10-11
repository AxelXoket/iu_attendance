// Mutation check of the D11 build gates: each mutant is applied to a scratch copy of d11work, the build must go red with the
// expected message, and the unmutated copy must go green (ground control). Never touches the shared tree.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const SRC = path.join(__dirname, '..', 'r17', 'backend');
const W = path.join(__dirname, 'mutB');
fs.rmSync(W, { recursive: true, force: true });
for (const d of ['inv', 'spec', 'frag', 'd11work']) fs.mkdirSync(path.join(W, d), { recursive: true });
fs.copyFileSync(path.join(SRC, 'contracts.json'), path.join(W, 'contracts.json'));
fs.copyFileSync(path.join(SRC, 'inv', 'D11.json'), path.join(W, 'inv', 'D11.json'));
for (const f of fs.readdirSync(path.join(SRC, 'spec'))) fs.copyFileSync(path.join(SRC, 'spec', f), path.join(W, 'spec', f));
fs.copyFileSync(path.join(SRC, 'frag', 'D06.html'), path.join(W, 'frag', 'D06.html'));
const kopyala = () => { for (const f of fs.readdirSync(path.join(SRC, 'd11work'))) fs.copyFileSync(path.join(SRC, 'd11work', f), path.join(W, 'd11work', f)); };
const kos = () => { try { return { kod: 0, cikti: cp.execFileSync('node', [path.join(W, 'd11work', 'build.js')], { env: { ...process.env, D11_OUT: path.join(W, 'out') }, encoding: 'utf8' }) }; } catch (e) { return { kod: e.status, cikti: String(e.stdout) }; } };
const MUT = [
  ['open point with needs_owner false', 'icerik-3.js', s => s.replace("'Mimarın önerisi:", "'X'), A('D11-A99', 'soru', 'öneri', false), A('D11-A98', 'q', 'Mimarın önerisi:"), /needs_owner false remain/],
  ['remark in export name', 'icerik-2.js', s => s.replace("name: 'qrKilitAnahtarlari',", "name: 'qrKilitAnahtarlari (ek: D05)',"), /export name not a plain identifier/],
  ['migration dir differs', 'icerik-1.js', s => s.replace("dir: 'apps/server/migrations/<14 haneli UTC>_projeksiyon_<açıklama>/'", "dir: 'apps/server/migrations/<UTC>_projeksiyon/'"), /migration dir differs/],
  ['job without twice-run scenario', 'icerik-3.js', s => s.replace("D14\\'ün \\'aynı veriyle iki kez çalışırsa\\' adımında ikinci çalışma hiçbir satır değiştirmez ve dinleyiciyi", "ikinci çalışma hiçbir satır değiştirmez ve dinleyiciyi"), /no D14 twice-run scenario for job projeksiyon_bekleyen_yeniden_hesapla/],
  ['audit dersId without birimId', 'icerik-2.js', s => s.replace("const DERS_ZARFI = 'donemId, birimId, dersId, oturumId';", "const DERS_ZARFI = 'donemId, dersId, oturumId';"), /audit event with dersId but no birimId/],
  ['D04 constant retyped', 'ortak.js', s => s.replace("const D04_IKINCI_CAPA_YOK = ['SONRA_YENIDEN_BASLATMA',", "const D04_IKINCI_CAPA_YOK = ['KURULMADI', 'SONRA_YENIDEN_BASLATMA',"), /D04 IKINCI_CAPA_YOK_NEDENLERI differs/],
  ['closed point left open', 'icerik-3.js', s => s.replace("A('D11-A12',", "A('D11-A07', 'eski', 'eski', true), A('D11-A12',"), /closed point still open: D11-A07/],
  ['old previous-owner list back', 'icerik-2.js', s => s.replace('(D02.dersGetir sahiplikGecmisi)', '(oncekiSahipKisiIdleri)'), /old D02 previous-owner list/],
  ['job file missing', 'icerik-2.js', s => s.replace("  'apps/server/src/jobs/projeksiyon/projeksiyon-bekleyen-yeniden-hesapla.ts',\n", ''), /job file missing: projeksiyon_bekleyen_yeniden_hesapla/],
  ['extra export without note', 'icerik-2.js', s => s.replace("note: 'contracts.json dış yüz satırı değil, sözleşme dosyasının şeması: D15", "nt: 'D15"), /unexplained extra export: projeksiyonAyarSemasi/],
];
let fail = 0;
kopyala(); const yer = kos();
if (yer.kod !== 0) { console.log('GROUND CONTROL RED:\n' + yer.cikti); process.exit(1); }
console.log('ground control green: ' + yer.cikti.trim());
for (const [ad, dosya, f, beklenen] of MUT) {
  kopyala(); const p = path.join(W, 'd11work', dosya), once = fs.readFileSync(p, 'utf8'), sonra = f(once);
  if (sonra === once) { console.log('MUTANT NOT APPLIED: ' + ad); fail++; continue; }
  fs.writeFileSync(p, sonra);
  const r = kos();
  if (r.kod !== 0 && beklenen.test(r.cikti)) console.log('killed: ' + ad);
  else { console.log('SURVIVED: ' + ad + '\n' + r.cikti.slice(0, 600)); fail++; }
}
kopyala(); const son = kos(); if (son.kod !== 0) { console.log('FINAL CONTROL RED'); fail++; }
console.log(fail ? fail + ' MUTATION FAILURES' : 'ALL MUTANTS KILLED');
process.exit(fail ? 1 : 0);

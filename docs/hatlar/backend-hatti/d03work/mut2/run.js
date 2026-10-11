// Mutation check for the alignment guards in build-d03.js.
// Each mutation edits icerik.js or build-d03.js in place, runs the builder with output redirected to
// mut2/out (spec/ and frag/ are never written), expects a named failure, then writes the original bytes
// back and verifies the md5. Exit 1 if any mutation survives or any restore fails.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const W = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const run = () => spawnSync(process.execPath, [path.join(W, 'build-d03.js')], { env: { ...process.env, OUT_SPEC: OUT, OUT_FRAG: OUT }, encoding: 'utf8' });

const M = [
  ['needs_owner false', 'icerik.js', s => s.replace("Spec GET'i bu durum olmadan yazdı.\", true)", "Spec GET'i bu durum olmadan yazdı.\", false)"), 'has needs_owner false'],
  ['closed id in invariant', 'icerik.js', s => s.replace('bir derste bir numaranın en çok bir etkin satırı vardır', 'bir derste bir numaranın en çok bir etkin satırı vardır (D03-A10)').replace('Bir derste bir numaranın en çok bir etkin satırı vardır', 'Bir derste bir numaranın en çok bir etkin satırı vardır (D03-A10)'), 'reference to a closed open point'],
  ['raw advisory call', 'icerik.js', s => s.replace("Olumlu yol kilitsiz okur.", "Olumlu yol kilitsiz okur. pg_advisory_xact_lock_shared(3, kova) alır."), 'raw pg_advisory_xact_lock call in spec'],
  ['old summary wording', 'icerik.js', s => s.replace('(karar aynı işlemde, devam iş kuyruğuyla)', '(karar ve devam iş kuyruğuyla)'), "summary must say"],
  ['old retention class', 'icerik.js', s => s.replace("saklama: \"D12.saklamaIsleyicisiKaydet('listeler.donem_verisi'", "saklama: \"D12.saklamaIsleyicisiKaydet('listeler.liste_satirlari'"), "retention class must be"],
  ['duplicate export', 'icerik.js', s => s.replace("    name: 'listeKovaAnahtari',", "    name: 'listeSatirlari',"), 'export listed twice'],
  ['combined export name', 'icerik.js', s => s.replace("    name: 'listeKovaAnahtari',", "    name: 'listeKovaAnahtari ve kovaNo',"), 'export name not one plain identifier'],
  ['decided point dropped', 'icerik.js', s => s.replace("  G('D03-A10', ", "  G('D03-X10', "), 'not closed'],
  ['contract param renamed', 'icerik.js', s => s.replace('ogrencininSatirlari(tx: Islem, ogrenciNo: OgrenciNo, s?:', 'ogrencininSatirlari(tx: Islem, ogrenciNo: OgrenciNo, secenek?:'), 'export ogrencininSatirlari param 2'],
  ['old 404 code', 'icerik.js', s => s.replace('"LISTELER_BULUNAMADI (404)", "400 (D13 doğrulama: bolum', '"LISTELER_SUBE_BULUNAMADI (404)", "400 (D13 doğrulama: bolum'), 'error code used but not in catalog'],
  ['fragment raw advisory call', 'build-d03.js', s => s.replace('Elle ${c(\'pg_advisory_xact_lock\')} yazılmaz;', 'Elle ${c(\'pg_advisory_xact_lock(3, kova)\')} yazılmaz;'), 'raw pg_advisory_xact_lock call in fragment'],
  ['fragment old 404 code', 'build-d03.js', s => s.replace("başka hocanın ve yöneticinin isteği 404 ${c('LISTELER_BULUNAMADI')}", "başka hocanın ve yöneticinin isteği 404 ${c('LISTELER_SUBE_BULUNAMADI')}"), 'stale wording in fragment'],
  ['migration dir drift', 'build-d03.js', s => s.replace('  migration_dir: mod.migration_dir,', "  migration_dir: 'apps/server/migrations/<UTC zaman>_listeler_<açıklama>/',"), 'migration']
];

let bad = 0;
// ground control: unmutated build passes
{ const r = run(); if (r.status !== 0) { console.log('GROUND CONTROL FAILED\n' + r.stdout + r.stderr); process.exit(1); } console.log('ground control: green'); }
for (const [ad, dosya, f, beklenen] of M) {
  const p = path.join(W, dosya); const orig = fs.readFileSync(p); const h0 = md5(orig);
  const mutated = f(orig.toString('utf8'));
  if (mutated === orig.toString('utf8')) { console.log(`NOT APPLIED  ${ad}`); bad++; continue; }
  fs.writeFileSync(p, mutated, 'utf8');
  let r; try { r = run(); } finally { fs.writeFileSync(p, orig); }
  if (md5(fs.readFileSync(p)) !== h0) { console.log(`RESTORE FAILED ${dosya}`); process.exit(2); }
  const out = (r.stdout || '') + (r.stderr || '');
  const red = r.status !== 0 && out.includes(beklenen);
  if (!red) bad++;
  console.log(`${red ? 'red (killed)' : 'SURVIVED    '}  ${ad}${red ? '' : '\n' + out.slice(0, 400)}`);
}
{ const r = run(); if (r.status !== 0) { console.log('POST CONTROL FAILED'); process.exit(1); } console.log('post control: green'); }
console.log(bad ? `${bad} mutation(s) survived or not applied` : `all ${M.length} mutations killed`);
process.exit(bad ? 1 : 0);

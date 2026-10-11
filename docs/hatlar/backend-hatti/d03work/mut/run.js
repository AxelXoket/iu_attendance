// Mutation run for build-d03.js gates: each mutant must make the build fail with the expected message.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const W = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(W, 'icerik.js'), 'utf8');
const build = fs.readFileSync(path.join(W, 'build-d03.js'), 'utf8')
  .replace("path.resolve(__dirname, '..')", JSON.stringify(path.resolve(W, '..')))
  .replace(/fs\.writeFileSync\([^;]+;/g, ''); // never write outputs from mutants
const mutants = [
  ['drop resolved gap B05', s => s.replace("G('D03-B05',", "G('D03-X05',"), /gap not handled: D03-B05|resolved unknown gap/],
  ['em dash in summary', s => s.replace('listeler modülü bir şubenin', 'listeler modülü \u2014 bir şubenin'), /U\+2013 or U\+2014/],
  ['broken plan anchor', s => s.replace('plan.html#kararlar-indirme); yerel', 'plan.html#yok-boyle-bir-yer); yerel'), /broken anchor plan\.html#yok-boyle-bir-yer/],
  ['unused catalog code', s => s.split('"LISTELER_BASKA_SUBEDE (409)", ').join(''), /catalog code never used by an endpoint or export: LISTELER_BASKA_SUBEDE/],
  ['extra endpoint', s => s.replace("method: 'GET', path: '/v1/listeler/subeler/{subeId}/yuklemeler'", "method: 'GET', path: '/v1/listeler/subeler/{subeId}/gecmis'"), /endpoints: extra|endpoints: missing/],
  ['export param order', s => s.replace('uyelikDenetle(tx: Tx, ogrenciNo: OgrenciNo, subeId', 'uyelikDenetle(tx: Tx, subeId: Uuid, ogrenciNo'), /export uyelikDenetle param/],
  ['file outside globs', s => s.replace("'apps/server/src/modules/listeler/saklama.ts'", "'apps/server/src/modules/devam/saklama.ts'"), /file outside globs/],
  ['needs_owner gap closed silently', s => s.replace("O('D03-A05', \"(D03-B16)", "O('D03-A05', \"(D03-Z16)"), /needs_owner gap not an open point: D03-B16|gap not handled: D03-B16/],
  ['code without behavior test', s => s.replace(/409 LISTELER_SATIR_ZATEN_VAR;/g, '409;'), /no behavior test asserts LISTELER_SATIR_ZATEN_VAR/]
];
let fail = 0;
fs.writeFileSync(path.join(__dirname, 'build.js'), build);
// ground control: unmutated content must pass
fs.writeFileSync(path.join(__dirname, 'icerik.js'), src);
let r = cp.spawnSync('node', [path.join(__dirname, 'build.js')], { encoding: 'utf8' });
console.log((r.status === 0 ? 'PASS' : 'FAIL') + ' ground control (unmutated builds clean)'); if (r.status !== 0) { fail++; console.log(r.stdout); }
for (const [name, f, expect] of mutants) {
  const m = f(src);
  if (m === src) { console.log('FAIL ' + name + ': mutation did not apply'); fail++; continue; }
  fs.writeFileSync(path.join(__dirname, 'icerik.js'), m);
  r = cp.spawnSync('node', [path.join(__dirname, 'build.js')], { encoding: 'utf8' });
  const killed = r.status !== 0 && expect.test(r.stdout);
  console.log((killed ? 'KILLED ' : 'SURVIVED ') + name + (killed ? '' : ' :: ' + r.stdout.slice(0, 300)));
  if (!killed) fail++;
}
fs.writeFileSync(path.join(__dirname, 'icerik.js'), src);
process.exit(fail ? 1 : 0);

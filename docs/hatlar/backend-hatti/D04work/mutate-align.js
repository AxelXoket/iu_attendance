// Mutation check for check-align.js. Each mutation breaks one instruction's trace in a COPY of spec/frag
// (directory given as argv[2]; the shared spec/ and frag/ are only read) and the gate must go red naming that instruction.
// A clean copy must stay green (positive control). Exit 1 if any mutation survives.
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const B = path.join(__dirname, '..');
const OUT = process.argv[2];
if (!OUT) { console.log('usage: node mutate-align.js <scratch dir>'); process.exit(2); }
const SPEC = fs.readFileSync(path.join(B, 'spec', 'D04.json'), 'utf8'), FRAG = fs.readFileSync(path.join(B, 'frag', 'D04.html'), 'utf8');
const sj = f => s => { const o = JSON.parse(s); f(o); return JSON.stringify(o, null, 2) + '\n'; };
const ex = (o, n) => o.exports.find(e => e.name === n);
const M = [
  { ref: 'I016', what: 'combined export name', spec: sj(o => { ex(o, 'istanbulAni').name = 'istanbulAni (infra/saat)'; }) },
  { ref: 'I017', what: 'migration file in spec.files', spec: sj(o => { o.files.push('apps/server/migrations/20261010000000_saat_ilk/migration.sql'); }) },
  { ref: 'I018', what: 'KURULMADI back in yok nedenleri', spec: sj(o => { ex(o, 'IKINCI_CAPA_YOK_NEDENLERI').signature = ex(o, 'IKINCI_CAPA_YOK_NEDENLERI').signature.replace("'GONDERILMEDI'", "'GONDERILMEDI', 'KURULMADI'"); }) },
  { ref: 'I018', what: 'saatBelgesiVer sentence dropped', spec: sj(o => { ex(o, 'saatBelgesiVer').purpose = ex(o, 'saatBelgesiVer').purpose.replace(' Saat belgesi yalnız saat çapası içindir; ulaşma kanıtı ya da makbuz olarak kullanılamaz.', ''); }) },
  { ref: 'I019', what: 'old map adapter', spec: sj(o => { o.registrations = o.registrations.map(r => r.replace('pencereleriHesapla(tx, olay.oturumlar))', 'pencereleriHesapla(tx, olay.oturumlar.map(o => ({ ...o, dersId: olay.dersId }))))')); }) },
  { ref: 'I019', what: 'job owner does not call surumAl', spec: sj(o => { const j = o.jobs.find(j => j.name === 'oturum_pencere_kapat'); j.does = j.does.replace('D06.surumAl(tx) bir kez', 'surumAl yok'); }) },
  { ref: 'I030', what: 'reliability not nullable', spec: sj(o => { ex(o, 'kesintiAraliklari').signature = ex(o, 'kesintiAraliklari').signature.replace('ulasmaAnlariGuvenilir: boolean | null', 'ulasmaAnlariGuvenilir: boolean'); }) },
  { ref: 'A4', what: 'D04-A08 reopened', spec: sj(o => { o.open_points.push({ id: 'D04-A08', question: 'SNTP?', recommendation: 'Onaylayın.', needs_owner: true }); }) },
  { ref: 'I064', what: 'fine class name', spec: sj(o => { o.registrations = o.registrations.map(r => r.replace("saklamaIsleyicisiKaydet('saat.donem_verisi'", "saklamaIsleyicisiKaydet('saat.pencere_degisiklikleri'")); }) },
  { ref: 'I064', what: 'handler reads D02', spec: sj(o => { o.registrations = o.registrations.map(r => /saklamaIsleyicisiKaydet/.test(r) ? r + '; kilit anı D02.kilitDurumu ile okunur' : r); }) },
  { ref: 'I071', what: 'cookie source allowed', spec: sj(o => { o.endpoints[0].auth = o.endpoints[0].auth.replace("kimlikKaynaklari ['bearer'], ", ''); }) },
  { ref: 'I014', what: 'advisory invariant removed', spec: sj(o => { o.invariants = o.invariants.filter(i => !/D04 danışma anahtarı almaz/.test(i)); }) },
  { ref: 'I009', what: 'scope object back', spec: sj(o => { o.endpoints[1].auth += ' YoneticiKapsami nesnesi kurulur.'; }) },
  { ref: 'I074', what: 'daily run at 03:30', spec: sj(o => { const j = o.jobs.find(j => j.name === 'oturum_pencere_kapat'); j.schedule = j.schedule.replace("cron: '* * * * *'", "cron: '30 3 * * *'"); }) },
  { ref: 'I074', what: 'twice scenario dropped', spec: sj(o => { const j = o.jobs.find(j => j.name === 'esitleme_sonrasi_yeniden_degerlendir'); j.idempotency = j.idempotency.replace("'aynı veriyle iki kez çalışırsa'", 'ikinci çalışma'); }) },
  { ref: 'I045', what: 'birimId missing on one event', spec: sj(o => { const e = ex(o, 'SAAT_DENETIM_OLAYLARI'); e.signature = e.signature.replace("'saat.erken_kapatildi' { oturumId, dersId, birimId,", "'saat.erken_kapatildi' { oturumId, dersId,"); }) },
  { ref: 'I070', what: 'old 404 code in section', frag: h => h.replace('<code>SAAT_BULUNAMADI</code></td><td>404', '<code>SAAT_PENCERE_BULUNAMADI</code></td><td>404') },
  { ref: 'I070', what: 'unprefixed module code', frag: h => h.replace('<code>SAAT_SUREC_YANLIS</code>', '<code>SUREC_YANLIS</code>') },
  { ref: 'close', what: 'integration note left open', spec: sj(o => { o.open_points.push({ id: 'D04-A99', question: 'x', recommendation: 'y', needs_owner: false }); }) },
];
const run = (spec, frag, tag) => {
  const root = path.join(OUT, tag);
  fs.mkdirSync(path.join(root, 'spec'), { recursive: true }); fs.mkdirSync(path.join(root, 'frag'), { recursive: true });
  fs.writeFileSync(path.join(root, 'spec', 'D04.json'), spec); fs.writeFileSync(path.join(root, 'frag', 'D04.html'), frag);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'check-align.js')], { env: { ...process.env, D04_ROOT: root }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};
const kontrol = run(SPEC, FRAG, 'kontrol');
let kalan = 0;
console.log(`positive control (clean copy): ${kontrol.code === 0 ? 'green' : 'RED, gate is broken'}`);
if (kontrol.code !== 0) { console.log(kontrol.out); process.exit(1); }
M.forEach((m, i) => {
  const spec = m.spec ? m.spec(SPEC) : SPEC, frag = m.frag ? m.frag(FRAG) : FRAG;
  if (spec === SPEC && frag === FRAG) { console.log(`#${i + 1} ${m.ref} ${m.what}: mutation did not apply`); kalan++; return; }
  const r = run(spec, frag, 'm' + (i + 1));
  const ok = r.code === 1 && new RegExp('^' + m.ref + ':', 'm').test(r.out);
  if (!ok) kalan++;
  console.log(`#${i + 1} ${m.ref} ${m.what}: ${ok ? 'killed' : 'SURVIVED'}`);
});
console.log(kalan ? `${kalan} mutation(s) survived` : `all ${M.length} mutations killed`);
process.exit(kalan ? 1 : 0);

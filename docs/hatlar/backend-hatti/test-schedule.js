// Behavioural tests for schedule.js on throwaway fixtures. Usage: node test-schedule.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const SRC = path.join(__dirname, 'schedule.js');
const mod = (id, name, extra = {}) => ({ id, name, migration_dir: `apps/server/migrations/<UTC zaman>_${name}_<açıklama>/`, owns_tables: [], owns_endpoints: [], owns_jobs: [], ...extra });
const pkg = (id, o = {}) => ({ id, title: 't', files: [], tables: [], endpoints: [], jobs: [], exports: [], needs: [], tests: ['x'], depends_on: [], size: 'S', ...o });
const run = (fx, args = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
  fs.mkdirSync(path.join(dir, 'spec')); fs.mkdirSync(path.join(dir, 'packages'));
  fs.copyFileSync(SRC, path.join(dir, 'schedule.js'));
  fs.writeFileSync(path.join(dir, 'contracts.json'), JSON.stringify({ modules: fx.modules, file_ownership: fx.globs }));
  for (const [id, s] of Object.entries(fx.specs)) fs.writeFileSync(path.join(dir, 'spec', id + '.json'), JSON.stringify(s));
  for (const [id, p] of Object.entries(fx.packages)) fs.writeFileSync(path.join(dir, 'packages', id + '.json'), JSON.stringify({ id, packages: p }));
  if (fx.ozet) { fs.mkdirSync(path.join(dir, 'ozet')); for (const [n, o] of Object.entries(fx.ozet)) fs.writeFileSync(path.join(dir, 'ozet', 'asama-' + String(n).padStart(2, '0') + '.json'), JSON.stringify(o)); }
  const r = spawnSync('node', [path.join(dir, 'schedule.js'), ...args], { encoding: 'utf8' });
  const sched = fs.existsSync(path.join(dir, 'schedule.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8')) : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: r.stdout + r.stderr, sched };
};
const base = () => ({
  modules: [mod('D01', 'kimlik', { owns_tables: ['kisiler'] }), mod('D02', 'dersler', { owns_endpoints: ['GET /v1/dersler'] })],
  globs: [{ glob: 'a/kimlik/*', owner: 'D01' }, { glob: 'a/dersler/*', owner: 'D02' }],
  specs: { D01: { files: ['a/kimlik/x.ts'], exports: [{ name: 'kisiGetir', signature: 'kisiGetir()' }] }, D02: { files: ['a/dersler/y.ts'], exports: [] } },
  packages: { D01: [pkg('D01-P01', { files: ['a/kimlik/x.ts'], tables: ['kisiler'], exports: ['kisiGetir'] })], D02: [pkg('D02-P01', { files: ['a/dersler/y.ts'], endpoints: ['GET /v1/dersler'], needs: ['D01.kisiGetir'] })] },
});
let fails = 0;
const t = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ' + detail)); if (!ok) fails++; };
// ground control: a valid fixture passes and the cross-module need orders D02 after D01
{ const r = run(base()); t('valid fixture passes, need resolves to an earlier phase', r.code === 0 && r.sched && r.sched.phases.length === 2 && r.sched.phases[0][0] === 'D01-P01' && r.sched.phases[1][0] === 'D02-P01', r.out); }
{ const f = base(); f.packages.D02[0].files.push('a/kimlik/x.ts'); const r = run(f); t('file outside own globs is rejected', r.code === 1 && /file not owned by D02/.test(r.out), r.out); }
{ const f = base(); f.packages.D01.push(pkg('D01-P02', { files: ['a/kimlik/x.ts'] })); const r = run(f); t('same file in two packages is rejected', r.code === 1 && /file a\/kimlik\/x.ts in D01-P01 and D01-P02/.test(r.out), r.out); }
{ const f = base(); f.packages.D02[0].needs = ['D01.yok']; const r = run(f); t('need of a missing export is rejected', r.code === 1 && /spec exports no yok/.test(r.out), r.out); }
{ const f = base(); f.packages.D01[0].tables = []; const r = run(f); t('owned table in no package is rejected', r.code === 1 && /table in no package: kisiler/.test(r.out), r.out); }
{ const f = base(); f.specs.D02.exports = [{ name: 'dersGetir' }]; f.packages.D02[0].exports = ['dersGetir']; f.packages.D01[0].needs = ['D02.dersGetir']; const r = run(f); t('cross-module cycle is rejected', r.code === 1 && /dependency cycle/.test(r.out), r.out); }
{ const f = base(); f.packages.D01[0].tests = []; const r = run(f); t('package without tests is rejected', r.code === 1 && /ships without tests/.test(r.out), r.out); }
{ const f = base(); f.packages.D01[0].files.push('apps/server/migrations/20261010120000_kimlik_baslangic/migration.sql'); const r = run(f); t('own migration folder is allowed', r.code === 0, r.out); }
{ const f = base(); f.packages.D01[0].files.push('apps/server/migrations/20261010120000_dersler_baslangic/migration.sql'); const r = run(f); t('another module migration folder is rejected', r.code === 1 && /file not owned/.test(r.out), r.out); }
{ const f = base(); f.packages.D01[0].title = 'a—b'; const r = run(f); t('em dash is rejected', r.code === 1 && /U\+2013 or U\+2014/.test(r.out), r.out); }
// capacity: 20 independent packages make phases of 15 and 5
{ const f = base(); f.specs.D02.files = []; f.packages.D02 = Array.from({ length: 20 }, (_, i) => pkg('D02-P' + String(i + 1).padStart(2, '0'), i === 0 ? { endpoints: ['GET /v1/dersler'] } : {}));
  const r = run(f); t('capacity 15 per phase', r.code === 0 && r.sched.phases.map(p => p.length).join(',') === '15,6', r.out); }
// critical path first: the head of a long chain goes into phase 1 ahead of loose packages
{ const f = base(); f.specs.D02.files = [];
  const loose = Array.from({ length: 15 }, (_, i) => pkg('D02-P' + String(i + 10), i === 0 ? { endpoints: ['GET /v1/dersler'] } : {}));
  const chain = [pkg('D02-P01'), pkg('D02-P02', { depends_on: ['D02-P01'] }), pkg('D02-P03', { depends_on: ['D02-P02'] })];
  f.packages.D02 = [...loose, ...chain]; const r = run(f);
  t('longest chain starts first', r.code === 0 && r.sched.phases[0].includes('D02-P01'), r.out); }
// html output renders every package
{ const f = base(); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedh-')); const out = path.join(dir, 'h.html'); const r = run(f, ['--html', out]);
  const h = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''; t('html lists both packages', r.code === 0 && /D01-P01/.test(h) && /D02-P01/.test(h) && /<section id="is-bolumu">/.test(h), r.out); fs.rmSync(dir, { recursive: true, force: true }); }
// phase briefing renders under its heading, package rows fold away; without a briefing the heading is bare (ground control)
{ const f = base(); f.ozet = { 1: { asama: 1, baslik: 'Kimlik temeli', paragraflar: ['Birinci paragraf metni.', 'İkinci paragraf metni.'] } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scho-')); const out = path.join(dir, 'h.html'); const r = run(f, ['--html', out]); const h = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  const has = x => h.includes(x);
  t('briefing renders', r.code === 0 && has('<h3 id="asama-1">Aşama 1 · Kimlik temeli</h3>') && has('<p>Birinci paragraf metni.</p>') && has('<p>İkinci paragraf metni.</p>') && has('<h3 id="asama-2">Aşama 2</h3>') && has('<summary>Aşama 1 paketleri (1)</summary>') && has('<a href="#asama-1">Aşama 1</a>: Kimlik temeli'), r.out + h.slice(0, 600)); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);

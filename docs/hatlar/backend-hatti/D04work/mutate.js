// Mutation check of the two gates (spec-validate.js and check-out.js) against D04 outputs.
// Each mutant must turn at least one gate red; originals are restored byte for byte and verified by md5.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const B = path.join(__dirname, '..');
const SPEC = path.join(B, 'spec', 'D04.json'), FRAG = path.join(B, 'frag', 'D04.html');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const orig = { spec: fs.readFileSync(SPEC), frag: fs.readFileSync(FRAG) };
const sums = { spec: md5(orig.spec), frag: md5(orig.frag) };
const run = () => {
  const a = spawnSync(process.execPath, [path.join(B, 'spec-validate.js'), 'D04'], { encoding: 'utf8' });
  const b = spawnSync(process.execPath, [path.join(__dirname, 'check-out.js')], { encoding: 'utf8' });
  const f = spawnSync(process.execPath, [path.join(__dirname, 'check-findings.js')], { encoding: 'utf8' });
  return { red: a.status !== 0 || /PROBLEMS/.test(b.stdout) || f.status !== 0, out: (a.stdout + b.stdout + f.stdout).split('\n').find(l => /ERRORS|PROBLEMS|spec |owned|gap|dash|broken|h3|glued|open/.test(l)) || '' };
};
const S = () => JSON.parse(orig.spec.toString('utf8'));
const mutants = [
  ['drop owned table', () => { const s = S(); s.tables = s.tables.slice(1); return { spec: JSON.stringify(s) }; }],
  ['extra foreign endpoint', () => { const s = S(); s.endpoints.push({ ...s.endpoints[0], path: '/v1/saat/yeni' }); return { spec: JSON.stringify(s) }; }],
  ['drop owned job', () => { const s = S(); s.jobs.pop(); return { spec: JSON.stringify(s) }; }],
  ['file outside globs', () => { const s = S(); s.files.push('apps/server/src/modules/yoklama/x.ts'); return { spec: JSON.stringify(s) }; }],
  ['en dash in summary', () => { const s = S(); s.summary += ' a – b'; return { spec: JSON.stringify(s) }; }],
  ['gap left unresolved', () => { const s = S(); s.resolved_gaps = s.resolved_gaps.filter(g => g.gap !== 'D04-B17'); return { spec: JSON.stringify(s) }; }],
  ['contradiction left', () => { const s = S(); s.contradictions_resolved.pop(); return { spec: JSON.stringify(s) }; }],
  ['contract export missing', () => { const s = S(); s.exports = s.exports.filter(e => !e.name.startsWith('kesintiAraliklari')); return { spec: JSON.stringify(s) }; }],
  ['broken plan anchor', () => ({ frag: orig.frag.toString('utf8').replace('plan.html#hedefler', 'plan.html#hedef-yok') })],
  ['unbalanced details', () => ({ frag: orig.frag.toString('utf8').replace('</details>', '') })],
  ['h3 order swapped', () => ({ frag: orig.frag.toString('utf8').replace('<h3>Testler</h3>', '<h3>Testlerr</h3>') })],
  ['glued suffix', () => ({ frag: orig.frag.toString('utf8').replace("D04'ün", 'D04ün') })],
  ['dangling open point', () => ({ frag: orig.frag.toString('utf8').replace('D04-A06)', 'D04-A99)') })],
  ['kurulum FK back', () => { const s = S(); s.tables[1].constraints.push('pencere_degisiklikleri_kurulum_id_fk: FOREIGN KEY (kurulum_id) REFERENCES kurulumlar (kurulum_id)'); return { spec: JSON.stringify(s) }; }],
  ['lock dropped from pencereSonucu', () => { const s = S(); const e = s.exports.find(x => x.name === 'pencereSonucu'); e.purpose = e.purpose.split('FOR KEY SHARE').join('kilitsiz'); return { spec: JSON.stringify(s) }; }],
  ['lowercase code value', () => { const s = S(); s.tables[0].constraints = s.tables[0].constraints.map(x => x.replace("'DERS'", "'ders'")); return { spec: JSON.stringify(s) }; }],
  ['race test removed', () => { const s = S(); s.tests = s.tests.filter(t => !/yarışmaz/.test(t.name)); return { spec: JSON.stringify(s) }; }],
];
let survived = 0;
try {
  const base = run(); console.log('baseline', base.red ? 'RED (unexpected)' : 'green');
  for (const [name, f] of mutants) {
    const m = f();
    fs.writeFileSync(SPEC, m.spec !== undefined ? m.spec : orig.spec);
    fs.writeFileSync(FRAG, m.frag !== undefined ? m.frag : orig.frag);
    const r = run();
    if (!r.red) survived++;
    console.log((r.red ? 'killed   ' : 'SURVIVED ') + name + (r.out ? '  | ' + r.out.trim().slice(0, 90) : ''));
  }
} finally {
  fs.writeFileSync(SPEC, orig.spec); fs.writeFileSync(FRAG, orig.frag);
  const ok = md5(fs.readFileSync(SPEC)) === sums.spec && md5(fs.readFileSync(FRAG)) === sums.frag;
  console.log('restored, md5 match:', ok, 'survivors:', survived);
}

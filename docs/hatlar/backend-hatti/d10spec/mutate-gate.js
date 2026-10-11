// Mutation check of gate.js and spec-validate.js: each mutation must turn a gate red; original bytes restored and md5-verified.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const B = path.join(__dirname, '..');
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const run = cmd => { try { cp.execSync(cmd, { cwd: B, stdio: 'pipe' }); return 'GREEN'; } catch { return 'RED'; } };
const spec = path.join(B, 'spec', 'D10.json'), frag = path.join(B, 'frag', 'D10.html');
const muts = [
  ['drop resolved gap D10-B04', spec, s => { const j = JSON.parse(s); j.resolved_gaps = j.resolved_gaps.filter(g => g.gap !== 'D10-B04'); return JSON.stringify(j); }, 'node d10spec/gate.js'],
  ['em dash in fragment', frag, s => s.replace('<h2>Raporlar ve AKSİS özeti</h2>', '<h2>Raporlar \u2014 AKSİS özeti</h2>'), 'node d10spec/gate.js'],
  ['uncatalogued error code', spec, s => s.replace('"RAPORLAR_SORGU_ZAMAN_ASIMI",', '"RAPORLAR_UYDURMA",'), 'node d10spec/gate.js'],
  ['owner gap moved to resolved', spec, s => { const j = JSON.parse(s); j.open_points = j.open_points.filter(o => !o.question.startsWith('D10-B02')); j.resolved_gaps.push({ gap: 'D10-B02', decision: 'x', why: 'x' }); return JSON.stringify(j); }, 'node d10spec/gate.js'],
  ['extra endpoint not owned', spec, s => { const j = JSON.parse(s); j.endpoints.push({ ...j.endpoints[0], path: '/v1/raporlar/fazla' }); return JSON.stringify(j); }, 'node spec-validate.js D10'],
  ['owned table dropped', spec, s => { const j = JSON.parse(s); j.tables.pop(); return JSON.stringify(j); }, 'node spec-validate.js D10'],
  ['broken plan anchor', frag, s => s.replace('href="plan.html#hedefler"', 'href="plan.html#yok-boyle-bir-yer"'), 'node spec-validate.js D10'],
  ['file outside globs', spec, s => { const j = JSON.parse(s); j.files.push('apps/server/src/modules/devam/x.ts'); return JSON.stringify(j); }, 'node spec-validate.js D10'],
];
let ok = true;
for (const [name, file, f, cmd] of muts) {
  const before = md5(file), orig = fs.readFileSync(file);
  fs.writeFileSync(file, f(orig.toString('utf8')));
  const r = run(cmd);
  fs.writeFileSync(file, orig);
  const after = md5(file);
  const restored = before === after;
  if (r !== 'RED' || !restored) ok = false;
  console.log(`${r === 'RED' ? 'killed' : 'SURVIVED'}  restored=${restored}  ${name}`);
}
console.log('baseline gate:', run('node d10spec/gate.js'), ' validator:', run('node spec-validate.js D10'));
process.exit(ok ? 0 : 1);

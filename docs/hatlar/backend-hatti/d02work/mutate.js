const fs = require('fs'); const { execFileSync } = require('child_process');
const base = JSON.parse(fs.readFileSync('../inv/D02.json', 'utf8'));
const rename = o => JSON.parse(JSON.stringify(o).replace(/D02-/g, 'ZZ9-').replace(/"id": ?"D02"/, '"id":"ZZ9"'));
const run = obj => { fs.writeFileSync('mut/inv/ZZ9.json', JSON.stringify(obj), 'utf8'); try { return 'OK: ' + execFileSync('node', ['mut/inv-validate.js', 'ZZ9']).toString().trim(); } catch (e) { return 'RED: ' + e.stdout.toString().split('\n').slice(0, 2).join(' | '); } };
const cases = [
  ['baseline (must be OK)', o => o],
  ['quote off by one char', o => { o.decided[0].quote = o.decided[0].quote.replace('derslik', 'dersl1k'); return o; }],
  ['anchor id missing', o => { o.decided[1].anchor = 'plan.html#yok-boyle-bir-id'; return o; }],
  ['en dash in fact', o => { o.decided[2].fact += ' – x'; return o; }],
  ['needs_owner as string', o => { o.gaps[0].needs_owner = 'false'; return o; }],
  ['quote moved to wrong file', o => { o.decided[0].anchor = 'teknik.html#sunucu'; return o; }],
];
let fail = 0;
for (const [name, f] of cases) { const r = run(f(rename(base))); const expectOk = name.startsWith('baseline'); const pass = expectOk ? r.startsWith('OK') : r.startsWith('RED'); if (!pass) fail++; console.log(pass ? 'PASS' : 'FAIL', name, '->', r.slice(0, 150)); }
fs.unlinkSync('mut/inv/ZZ9.json');
process.exit(fail ? 1 : 0);

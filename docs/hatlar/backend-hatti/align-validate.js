// Gate for the architect's integration output.
// align/decisions.json: [{ n: "I001", verdict: "ACCEPT"|"CHANGE"|"REJECT"|"OWNER", targets: ["D05"], decision: "<Turkish>" }]
// align/Dxx.json: { id, instructions: [{ refs: ["I001"], do: "<Turkish, exact change>" }] }
// Every inbox item has exactly one decision; every ACCEPT/CHANGE decision appears in each target's instructions;
// no U+2013/U+2014; contracts.json still validates. Usage: node align-validate.js
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const D = __dirname, A = path.join(D, 'align');
const IDS = ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15'];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const errs = [];
const inbox = read(path.join(A, 'inbox.json'));
const dec = read(path.join(A, 'decisions.json'));
const byN = new Map();
for (const d of dec) { if (byN.has(d.n)) errs.push('duplicate decision ' + d.n); byN.set(d.n, d);
  if (!['ACCEPT', 'CHANGE', 'REJECT', 'OWNER'].includes(d.verdict)) errs.push(d.n + ': bad verdict ' + d.verdict);
  if (!d.decision || d.decision.length < 20) errs.push(d.n + ': decision text missing');
  for (const t of d.targets || []) if (!IDS.includes(t)) errs.push(d.n + ': bad target ' + t);
  if (['ACCEPT', 'CHANGE'].includes(d.verdict) && !(d.targets || []).length) errs.push(d.n + ': accepted without targets'); }
for (const i of inbox) if (!byN.has(i.n)) errs.push('no decision for ' + i.n);
const refsBy = {};
for (const id of IDS) { const f = path.join(A, id + '.json'); if (!fs.existsSync(f)) { errs.push('missing align/' + id + '.json'); continue; }
  const a = read(f); refsBy[id] = new Set();
  for (const ins of a.instructions || []) { if (!ins.do || ins.do.length < 20) errs.push(id + ': empty instruction'); for (const r of ins.refs || []) refsBy[id].add(r); } }
for (const d of dec) if (['ACCEPT', 'CHANGE'].includes(d.verdict)) for (const t of d.targets || []) if (refsBy[t] && !refsBy[t].has(d.n)) errs.push(d.n + ': target ' + t + ' has no instruction for it');
for (const f of fs.readdirSync(A)) if (/[\u2013\u2014]/.test(fs.readFileSync(path.join(A, f), 'utf8'))) errs.push('align/' + f + ' has U+2013 or U+2014');
try { execSync('node ' + JSON.stringify(path.join(D, 'contracts-validate.js')), { stdio: 'pipe' }); } catch (e) { errs.push('contracts-validate fails: ' + String(e.stdout).slice(0, 300)); }
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 40).join('\n')); process.exit(1); }
const v = {}; for (const d of dec) v[d.verdict] = (v[d.verdict] || 0) + 1;
console.log('OK ' + dec.length + ' decisions ' + JSON.stringify(v) + '; instructions per module ' + IDS.map(id => id + ':' + (refsBy[id] ? refsBy[id].size : 0)).join(' '));

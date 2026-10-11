// Writes backend/align/decisions.json and align/D01..D15.json from align-build-dec.js and align-build-ins.js.
// Targets of each decision are the modules whose instructions reference it, so decisions and instructions cannot drift.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, 'r17', 'backend'), A = path.join(B, 'align');
const IDS = ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15'];
const dec = require('./align-build-dec.js'), ins = require('./align-build-ins.js');
const inbox = JSON.parse(fs.readFileSync(path.join(A, 'inbox.json'), 'utf8'));
const errs = [];
const known = new Map(dec.map(([n, v, t]) => [n, { n, verdict: v, decision: t }]));
if (known.size !== dec.length) errs.push('duplicate decision id');
for (const i of inbox) if (!known.has(i.n)) errs.push('no decision for ' + i.n);
for (const a of ['A1', 'A2', 'A3', 'A4', 'A5']) if (!known.has(a)) errs.push('no decision for ' + a);
const targets = new Map(dec.map(([n]) => [n, new Set()]));
for (const id of IDS) {
  if (!ins[id]) { errs.push('no instruction list for ' + id); continue; }
  for (const [refs, text] of ins[id]) {
    if (!refs.length) errs.push(id + ': instruction without refs');
    for (const r of refs) { if (!known.has(r)) errs.push(id + ': unknown ref ' + r); else targets.get(r).add(id); }
    if (!text || text.length < 20) errs.push(id + ': short instruction');
  }
}
for (const d of known.values()) if (['ACCEPT', 'CHANGE'].includes(d.verdict) && !targets.get(d.n).size) errs.push(d.n + ': accepted without targets');
const order = n => (n[0] === 'A' ? 1000 : 0) + parseInt(n.slice(1), 10);
const out = [...known.values()].sort((a, b) => order(a.n) - order(b.n)).map(d => ({ n: d.n, verdict: d.verdict, targets: IDS.filter(id => targets.get(d.n).has(id)), decision: d.decision }));
const all = JSON.stringify(out) + JSON.stringify(ins);
if (/[–—]/.test(all)) errs.push('U+2013 or U+2014 present');
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(A, 'decisions.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
for (const id of IDS) fs.writeFileSync(path.join(A, id + '.json'), JSON.stringify({ id, instructions: ins[id].map(([refs, text]) => ({ refs, do: text })) }, null, 1) + '\n', 'utf8');
const v = {}; for (const d of out) v[d.verdict] = (v[d.verdict] || 0) + 1;
console.log('wrote ' + out.length + ' decisions ' + JSON.stringify(v) + '; instructions ' + IDS.map(id => id + ':' + ins[id].length).join(' '));

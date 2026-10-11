// Collects every cross-module item (non-owner open points, spec.requests, D15 istekler, fixers' not_fixed notes)
// into align/inbox.json for the architect. Usage: node collect-inbox.js
const fs = require('fs'), path = require('path');
const D = __dirname;
const IDS = ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15'];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const items = [];
for (const id of IDS) {
  const s = read(path.join(D, 'spec', id + '.json'));
  for (const o of s.open_points || []) if (o.needs_owner === false) items.push({ from: id, kind: 'open_point', ref: o.id, text: o.question, proposal: o.recommendation });
  for (const r of s.requests || []) items.push({ from: id, kind: 'request', to: r.modul || r.module, text: r.istek || r.request || JSON.stringify(r) });
  for (const r of s.istekler || []) items.push({ from: id, kind: 'request', to: r.modul || r.module || r.hedef, text: r.istek || r.request || JSON.stringify(r) });
}
const J = path.join(process.env.USERPROFILE || 'C:/Users/USER', '.claude/projects/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/subagents/workflows/wf_769ccfc8-755/journal.jsonl');
if (fs.existsSync(J)) {
  const seen = {};
  for (const l of fs.readFileSync(J, 'utf8').split('\n')) { try { const r = JSON.parse(l); const v = r.result || r.value; if (r.type === 'result' && v && v.fixed !== undefined) seen[v.id] = v; } catch {} }
  for (const id of Object.keys(seen).sort()) for (const n of seen[id].not_fixed || []) items.push({ from: id, kind: 'fixer_note', text: n });
}
items.forEach((x, i) => { x.n = "I" + String(i + 1).padStart(3, "0"); });
fs.writeFileSync(path.join(D, 'align', 'inbox.json'), JSON.stringify(items, null, 1));
const by = {}; for (const i of items) by[i.kind] = (by[i.kind] || 0) + 1;
console.log('inbox: ' + items.length + ' items ' + JSON.stringify(by));

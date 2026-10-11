const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const all = [];
for (let i = 1; i <= 15; i++) { const id = 'D' + String(i).padStart(2, '0'); const P = rd(path.join(B, 'packages', id + '.json')); all.push(...P.packages.map(p => ({ ...p, module: id }))); }
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
const lv = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); const p = byId.get(id); const v = Math.max(-1, ...p.deps.map(level)) + 1; lv.set(id, v); return v; };
all.forEach(p => level(p.id));
const want = process.argv.slice(2);
const set = new Set();
for (const p of all) if (p.module === 'D03') for (const n of p.needs) set.add(n);
for (const n of want) set.add(n);
for (const n of [...set].sort()) { const q = byId.get(provider.get(n)); console.log(n.padEnd(36), q.id, q.size, 'L' + lv.get(q.id), '|', q.title, '| needs', q.needs.length, 'dep', q.depends_on.join(',')); }

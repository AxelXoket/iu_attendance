const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages';
const all = [];
for (const f of fs.readdirSync(B).filter(f => /^D\d\d\.json$/.test(f))) { const P = JSON.parse(fs.readFileSync(path.join(B, f), 'utf8')); all.push(...P.packages.map(p => ({ ...p, module: f.slice(0, 3) }))); }
const byId = new Map(all.map(p => [p.id, p]));
const prov = new Map(); for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const lv = new Map(); const L = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(-1, ...byId.get(id).deps.map(L)) + 1; lv.set(id, v); return v; };
all.forEach(p => L(p.id));
const want = process.argv.slice(2);
const set = new Set();
for (const p of all.filter(p => p.module === 'D11')) for (const n of p.needs) set.add(n);
for (const n of want) set.add(n);
for (const n of [...set].sort()) { const pid = prov.get(n); console.log(n.padEnd(40), pid, 'lv', lv.get(pid), '|', byId.get(pid).title); }

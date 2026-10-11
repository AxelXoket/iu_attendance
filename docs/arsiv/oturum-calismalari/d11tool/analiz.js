// Read-only: compute level/tail for all packages from current packages/*.json; print D11 rows and a module filter.
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages';
const override = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null; // alt D11 json path
const mods = (process.argv[3] || 'D11').split(',');
const all = [];
for (const f of fs.readdirSync(B).filter(f => /^D\d\d\.json$/.test(f))) {
  const fp = (override && f === 'D11.json') ? override : path.join(B, f);
  const P = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
  all.push(...P.packages.map(p => ({ ...p, module: f.slice(0, 3) })));
}
const byId = new Map(all.map(p => [p.id, p]));
const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const missing = []; for (const p of all) for (const n of p.needs || []) if (!prov.has(n)) missing.push(p.id + ' ' + n);
const dep = new Map(all.map(p => [p.id, []])); for (const p of all) for (const d of p.deps) dep.get(d).push(p.id);
const lv = new Map(), tl = new Map();
const L = (id, st = new Set()) => { if (lv.has(id)) return lv.get(id); if (st.has(id)) throw new Error('cycle at ' + id); st.add(id); const v = Math.max(-1, ...byId.get(id).deps.map(d => L(d, st))) + 1; st.delete(id); lv.set(id, v); return v; };
const T = (id, st = new Set()) => { if (tl.has(id)) return tl.get(id); if (st.has(id)) throw new Error('cycle at ' + id); st.add(id); const v = 1 + Math.max(0, ...dep.get(id).map(d => T(d, st))); st.delete(id); tl.set(id, v); return v; };
all.forEach(p => { L(p.id); T(p.id); });
const chain = Math.max(...all.map(p => lv.get(p.id) + tl.get(p.id)));
console.log('packages', all.length, 'global chain', chain, 'missing needs', missing.length ? missing.join('; ') : 0);
for (const p of all.filter(p => mods.includes(p.module))) {
  const bind = p.deps.filter(d => lv.get(d) === lv.get(p.id) - 1);
  const waiters = dep.get(p.id).filter(d => tl.get(d) === tl.get(p.id) - 1);
  console.log(`${p.id} ${p.size} lv ${lv.get(p.id)} tail ${tl.get(p.id)} sum ${lv.get(p.id) + tl.get(p.id)} | ${p.title}\n    bind: ${bind.map(b => b + '(' + lv.get(b) + ')').join(' ')}  waiters: ${waiters.map(w => w + '(' + tl.get(w) + ')').join(' ')}`);
}

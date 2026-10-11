// Read-only level analysis over current packages/*.json (does not write anything).
const fs = require('fs'), path = require('path');
const D = process.argv[2], focus = process.argv[3] || 'D01';
const alt = process.argv[4]; // optional alternative file for focus module
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  let P; try { P = JSON.parse(fs.readFileSync(alt && f === focus + '.json' ? alt : path.join(D, 'packages', f), 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.log('unreadable', f, e.message); continue; }
  for (const p of P.packages) all.push({ ...p, module: f.slice(0, 3) });
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) { p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])]; }
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) if (dependents.has(d)) dependents.get(d).push(p.id);
const lv = new Map(), tl = new Map(), why = new Map();
const L = (id, st = new Set()) => { if (lv.has(id)) return lv.get(id); if (st.has(id)) { console.log('CYCLE at', id); return 0; } st.add(id); let m = 0, w = null; for (const d of byId.get(id).deps) { if (!byId.has(d)) continue; const v = L(d, st) + 1; if (v > m) { m = v; w = d; } } lv.set(id, m); why.set(id, w); return m; };
const T = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(T)); tl.set(id, v); return v; };
all.forEach(p => { L(p.id); T(p.id); });
let chain = 0; for (const p of all) chain = Math.max(chain, lv.get(p.id) + 1);
console.log('packages', all.length, 'longest chain', chain, 'missing providers', missing.filter(m => m.startsWith(focus) || m.includes(' ' + focus + '.')).join('; '));
for (const p of all.filter(p => p.module === focus)) {
  const binding = why.get(p.id);
  const crit = dependents.get(p.id).sort((a, b) => tl.get(b) - tl.get(a))[0];
  console.log(`${p.id} ${p.size} lvl ${lv.get(p.id)} tail ${tl.get(p.id)} sum ${lv.get(p.id) + tl.get(p.id)} | ${p.title}\n   bind: ${binding} (lvl ${binding ? lv.get(binding) : '-'}) | next: ${crit || '-'} (tail ${crit ? tl.get(crit) : '-'})`);
}
// providers of focus needs
const needs = new Map();
for (const p of all.filter(p => p.module === focus)) for (const n of p.needs) { const pr = provider.get(n); needs.set(n, pr ? `${pr} lvl ${lv.get(pr)}` : 'NONE'); }
if (process.argv.includes('--needs')) for (const [n, v] of [...needs].sort()) console.log('  need', n, '->', v);
if (process.argv.includes('--waiters')) for (const p of all.filter(p => p.module !== focus)) { const n = (p.needs || []).filter(x => x.startsWith(focus + '.')); if (n.length) console.log('  waiter', p.id, 'lvl', lv.get(p.id), 'tail', tl.get(p.id), n.join(',')); }

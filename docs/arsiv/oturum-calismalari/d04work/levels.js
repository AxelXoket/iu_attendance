// Compute level and tail (in packages) over the current package files, tolerant of others' in-progress edits.
const fs = require('fs'), path = require('path');
const D = process.argv[2];
const focus = process.argv[3] || 'D04';
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  let P; try { P = JSON.parse(fs.readFileSync(path.join(D, 'packages', f), 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.log('skip', f, e.message); continue; }
  for (const p of P.packages) all.push({ ...p, module: P.id });
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) { p.deps = [...new Set([...(p.depends_on || []).filter(d => byId.has(d)), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])]; }
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const lv = new Map(), tl = new Map(), vis = new Set();
const level = id => { if (lv.has(id)) return lv.get(id); if (vis.has(id)) throw new Error('cycle at ' + id); vis.add(id); const v = Math.max(0, ...byId.get(id).deps.map(d => level(d) + 1)); lv.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(tail)); tl.set(id, v); return v; };
let maxc = 0;
for (const p of all) { level(p.id); maxc = Math.max(maxc, lv.get(p.id) + tail(p.id)); }
console.log('packages', all.length, 'longest chain', maxc, 'missing providers', missing.length);
if (process.argv.includes('--missing')) console.log(missing.join('\n'));
for (const p of all.filter(p => p.module === focus)) {
  const binding = p.deps.filter(d => lv.get(d) + 1 === lv.get(p.id)).map(d => d + '(' + lv.get(d) + ')');
  const waiters = dependents.get(p.id).filter(d => tail(d) + 1 === tail(p.id));
  console.log(`${p.id} ${p.size} L${lv.get(p.id)} T${tail(p.id)} sum ${lv.get(p.id) + tail(p.id)} | ${p.title}\n    bind ${binding.join(',')} | tailvia ${waiters.join(',')}`);
}
if (process.argv.includes('--chain')) {
  // print one longest chain
  let start = all.reduce((a, p) => (lv.get(p.id) + tail(p.id) > lv.get(a.id) + tail(a.id) ? p : a));
  let c = start.id; const back = [];
  while (true) { const p = byId.get(c); const b = p.deps.find(d => lv.get(d) + 1 === lv.get(c)); if (!b) break; back.unshift(b); c = b; }
  const fwd = [start.id]; c = start.id;
  while (true) { const n = dependents.get(c).find(d => tail(d) + 1 === tail(c)); if (!n) break; fwd.push(n); c = n; }
  console.log('chain:', [...back, ...fwd].map(id => id).join(' > '));
}

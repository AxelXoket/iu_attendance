const fs = require('fs'), path = require('path');
const D = process.argv[2], alt = process.argv[3];
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  const P = JSON.parse(fs.readFileSync(alt && f === 'D01.json' ? alt : path.join(D, 'packages', f), 'utf8').replace(/^\uFEFF/, ''));
  for (const p of P.packages) all.push({ ...p, module: f.slice(0, 3) });
}
const byId = new Map(all.map(p => [p.id, p])); const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) if (dependents.has(d)) dependents.get(d).push(p.id);
const lv = new Map(), tl = new Map();
const L = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(-1, ...byId.get(id).deps.filter(d => byId.has(d)).map(L)) + 1; lv.set(id, v); return v; };
const T = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(T)); tl.set(id, v); return v; };
all.forEach(p => { L(p.id); T(p.id); });
const max = Math.max(...all.map(p => lv.get(p.id) + tl.get(p.id)));
console.log('chain', max, 'packages', all.length);
// one critical path
let cur = all.filter(p => lv.get(p.id) === 0 && tl.get(p.id) === max).map(p => p.id)[0]; const pathIds = [];
while (cur) { pathIds.push(cur); cur = dependents.get(cur).find(d => lv.get(d) + tl.get(d) === max && lv.get(d) === lv.get(cur) + 1); }
console.log(pathIds.map(id => id + '(' + byId.get(id).size + ')').join(' > '));
const crit = all.filter(p => lv.get(p.id) + tl.get(p.id) === max).map(p => p.id);
console.log('all critical:', crit.join(' '));
const show = process.argv.slice(4);
for (const id of show) { const p = byId.get(id); console.log(id, 'lvl', lv.get(id), 'tail', tl.get(id), 'deps', p.deps.map(d => d + ':' + lv.get(d)).join(','), '| dependents', dependents.get(id).map(d => d + ':' + tl.get(d)).join(',')); }

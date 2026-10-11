// Compute level (longest predecessor chain, in packages) and tail (itself + longest dependent chain) over current packages/*.json
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const focus = process.argv[3] || 'D08';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const all = [];
for (const f of fs.readdirSync(path.join(B, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  const P = read(path.join(B, 'packages', f));
  for (const p of P.packages) all.push({ ...p, module: P.id });
}
const byId = new Map(all.map(p => [p.id, p]));
const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
const via = new Map();
for (const p of all) {
  p.deps = [];
  for (const d of p.depends_on || []) { p.deps.push(d); via.set(p.id + '<' + d, 'depends_on'); }
  for (const n of p.needs || []) { const d = prov.get(n); if (d && !p.deps.includes(d)) { p.deps.push(d); via.set(p.id + '<' + d, 'needs ' + n); } }
}
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) if (dependents.has(d)) dependents.get(d).push(p.id);
const L = new Map(), T = new Map();
const lev = id => { if (L.has(id)) return L.get(id); L.set(id, -1); const p = byId.get(id); const v = Math.max(0, ...p.deps.filter(d => byId.has(d)).map(d => lev(d) + 1)); L.set(id, v); return v; };
const tl = id => { if (T.has(id)) return T.get(id); T.set(id, -1); const v = 1 + Math.max(0, ...dependents.get(id).map(tl)); T.set(id, v); return v; };
all.forEach(p => { lev(p.id); tl(p.id); });
const maxChain = Math.max(...all.map(p => L.get(p.id) + T.get(p.id)));
console.log('global chain', maxChain, 'packages', all.length);
for (const p of all.filter(p => p.module === focus)) {
  const l = L.get(p.id), t = T.get(p.id);
  console.log(`${l + t > 20 ? 'TOO LATE' : 'ok      '} ${p.id} ${p.size} level ${l} tail ${t} | ${p.title}`);
  const binding = p.deps.filter(d => L.get(d) + 1 === l);
  for (const d of binding) console.log(`    waits on ${d} (level ${L.get(d)}) via ${via.get(p.id + '<' + d)}`);
  const late = dependents.get(p.id).filter(d => T.get(d) + 1 === t);
  for (const d of late) console.log(`    waited on by ${d} (tail ${T.get(d)}) via ${via.get(d + '<' + p.id)}`);
}
if (process.argv[4]) {
  const id = process.argv[4];
  // print the critical chain through id
  let cur = id, chain = [];
  while (true) { chain.unshift(cur); const p = byId.get(cur); const b = p.deps.find(d => L.get(d) + 1 === L.get(cur)); if (!b) break; cur = b; }
  cur = id;
  while (true) { const n = dependents.get(cur).find(d => T.get(d) + 1 === T.get(cur)); if (!n) break; chain.push(n); cur = n; }
  console.log('chain through ' + id + ':\n  ' + chain.map(c => `${c}(${byId.get(c).size}) L${L.get(c)} ${byId.get(c).title}`).join('\n  '));
}

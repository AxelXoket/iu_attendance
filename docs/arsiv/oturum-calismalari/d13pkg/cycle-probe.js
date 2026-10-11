// Read-only probe: loads whatever packages/Dxx.json exist, resolves needs to providing packages,
// reports dependency cycles and, for D13, which other packages need which D13 package.
const fs = require('fs'), path = require('path');
const B = path.resolve(process.argv[2]);
const dir = path.join(B, 'packages');
const all = [];
for (const f of fs.readdirSync(dir).filter(f => /^D\d\d\.json$/.test(f))) {
  let P; try { P = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '')); } catch (e) { console.log('skip ' + f + ': ' + e.message); continue; }
  for (const p of P.packages || []) all.push({ ...p, module: P.id });
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const unresolved = new Set();
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) unresolved.add(n.split('.')[0]); return v; }).filter(Boolean)])];
const cycles = [];
const state = new Map();
const visit = (id, stack) => {
  if (state.get(id) === 2) return; if (state.get(id) === 1) { cycles.push([...stack.slice(stack.indexOf(id)), id].join(' > ')); return; }
  state.set(id, 1); for (const d of byId.get(id).deps) if (byId.has(d)) visit(d, [...stack, id]); state.set(id, 2);
};
all.forEach(p => visit(p.id, []));
console.log('modules loaded: ' + [...new Set(all.map(p => p.module))].join(', '));
console.log('modules not yet written (needs unresolved): ' + [...unresolved].sort().join(', '));
console.log(cycles.length ? 'CYCLES:\n' + [...new Set(cycles)].join('\n') : 'no cycle among loaded modules');
const d13 = all.filter(p => p.module === 'D13');
for (const p of d13) {
  const users = all.filter(q => q.module !== 'D13' && q.deps.includes(p.id)).map(q => q.id);
  if (users.length) console.log(p.id + ' is needed by ' + users.join(', '));
}
for (const p of all.filter(p => p.module !== 'D13')) {
  const d13needs = (p.needs || []).filter(n => n.startsWith('D13.'));
  if (d13needs.length) console.log('  ' + p.id + ' needs ' + d13needs.map(n => n + '->' + provider.get(n)).join(', '));
}

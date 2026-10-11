// Partial cross-module cycle check over the packages files that exist now; unresolved needs are listed, not failed.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const dir = path.join(B, 'packages');
const all = [];
for (const f of fs.readdirSync(dir).filter(f => /^D\d\d\.json$/.test(f))) {
  const P = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  for (const p of P.packages || []) all.push({ ...p, module: P.id });
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const unresolved = new Set();
for (const p of all) p.deps = [...new Set([...(p.depends_on || []).filter(d => byId.has(d)), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) unresolved.add(n); return v; }).filter(Boolean)])];
const state = new Map(), cycles = [];
const visit = (id, stack) => {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { cycles.push([...stack.slice(stack.indexOf(id)), id].join(' > ')); return; }
  state.set(id, 1); for (const d of byId.get(id).deps) visit(d, [...stack, id]); state.set(id, 2);
};
all.forEach(p => visit(p.id, []));
const d06 = cycles.filter(c => c.includes('D06-'));
console.log('modules loaded:', [...new Set(all.map(p => p.module))].join(','));
console.log('cycles total:', cycles.length, 'involving D06:', d06.length);
d06.slice(0, 20).forEach(c => console.log('  ' + c));
const mine = [...unresolved].filter(n => all.some(p => p.module === 'D06' && (p.needs || []).includes(n)));
console.log('D06 needs not yet resolvable (module file missing or export not placed):', mine.join(', ') || 'none');
// depth of D06 packages in the partial graph
const depth = new Map();
const dp = id => { if (depth.has(id)) return depth.get(id); depth.set(id, 0); const v = 1 + Math.max(0, ...byId.get(id).deps.map(dp)); depth.set(id, v); return v; };
if (!cycles.length) all.filter(p => p.module === 'D06').forEach(p => console.log(p.id, 'earliest phase', dp(p.id)));

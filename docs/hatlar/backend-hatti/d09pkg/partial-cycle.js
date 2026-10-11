// Cycle probe over whichever packages/Dxx.json files exist now; needs to modules without a package file are ignored.
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages'))) {
  if (!/^D\d\d\.json$/.test(f)) continue;
  const P = JSON.parse(fs.readFileSync(path.join(D, 'packages', f), 'utf8').replace(/^﻿/, ''));
  for (const p of P.packages) all.push({ ...p, module: P.id });
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const unresolved = [];
for (const p of all) {
  p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
  for (const n of p.needs || []) if (!provider.has(n) && byId.has(n.slice(0, 3) + '-P01')) unresolved.push(p.id + ' ' + n);
}
const state = new Map(); const cycles = [];
const visit = (id, stack) => {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { cycles.push([...stack.slice(stack.indexOf(id)), id].join(' > ')); return; }
  state.set(id, 1); for (const d of byId.get(id).deps) visit(d, [...stack, id]); state.set(id, 2);
};
all.forEach(p => visit(p.id, []));
console.log('modules', [...new Set(all.map(p => p.module))].join(','), 'packages', all.length);
console.log('unresolved needs to present modules:', unresolved.length ? '\n  ' + unresolved.join('\n  ') : 'none');
console.log('cycles:', cycles.length ? '\n  ' + cycles.join('\n  ') : 'none');
for (const p of all.filter(p => p.module === 'D09')) {
  const ext = p.deps.filter(d => !d.startsWith('D09'));
  if (ext.length) console.log(p.id, 'waits on', ext.join(', '));
}

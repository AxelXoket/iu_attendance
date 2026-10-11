// Cross-module cycle probe over the package files that exist so far (read only).
// Prints: who needs D07 exports, which providers D07 needs exist, and any cycle that passes a D07 package.
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const dir = path.join(B, 'packages');
const all = [];
for (const f of fs.readdirSync(dir).filter(f => /^D\d\d\.json$/.test(f))) {
  const P = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  for (const p of P.packages || []) all.push({ ...p, module: P.id });
}
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const byId = new Map(all.map(p => [p.id, p]));
const deps = new Map(all.map(p => [p.id, [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])]]));
console.log('== other modules needing D07');
for (const p of all) if (p.module !== 'D07') { const n = (p.needs || []).filter(x => x.startsWith('D07.')); if (n.length) console.log(' ', p.id, n.join(', '), '->', n.map(x => provider.get(x)).join(',')); }
console.log('== D07 needs resolved / unresolved (module not yet planned)');
for (const p of all) if (p.module === 'D07') for (const n of p.needs) { const pr = provider.get(n); const mod = n.slice(0, 3); const planned = all.some(q => q.module === mod); if (planned) console.log(' ', p.id, n, '->', pr || 'NO PROVIDER'); }
// cycles
const color = new Map(); const cycles = [];
const visit = (id, stack) => {
  color.set(id, 1); stack.push(id);
  for (const d of deps.get(id) || []) {
    if (!deps.has(d)) continue;
    if (color.get(d) === 1) cycles.push(stack.slice(stack.indexOf(d)).concat(d));
    else if (!color.get(d)) visit(d, stack);
  }
  stack.pop(); color.set(id, 2);
};
for (const id of deps.keys()) if (!color.get(id)) visit(id, []);
const withD07 = cycles.filter(c => c.some(x => x.startsWith('D07-')));
console.log('== cycles total', cycles.length, 'through D07', withD07.length);
for (const c of withD07.slice(0, 10)) console.log('  ', c.join(' -> '));

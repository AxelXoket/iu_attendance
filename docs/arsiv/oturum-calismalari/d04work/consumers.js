// For each export of a module, list consumers with their current level and tail, and the latest level the provider may sit at for target T.
const fs = require('fs'), path = require('path');
const D = process.argv[2], mod = process.argv[3] || 'D04', T = +(process.argv[4] || 20);
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  try { const P = JSON.parse(fs.readFileSync(path.join(D, 'packages', f), 'utf8').replace(/^\uFEFF/, '')); for (const p of P.packages) all.push({ ...p, module: P.id }); } catch (e) { console.log('skip', f); }
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []).filter(d => byId.has(d)), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const lv = new Map(), tl = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); lv.set(id, 0); const v = Math.max(0, ...byId.get(id).deps.map(d => level(d) + 1)); lv.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); tl.set(id, 1); const v = 1 + Math.max(0, ...dependents.get(id).map(tail)); tl.set(id, v); return v; };
all.forEach(p => { level(p.id); tail(p.id); });
const rows = {};
for (const p of all) for (const n of p.needs || []) if (n.startsWith(mod + '.')) (rows[n] = rows[n] || []).push(p);
for (const [n, ps] of Object.entries(rows).sort()) {
  const maxT = Math.max(...ps.map(p => tl.get(p.id)));
  console.log(`${n.padEnd(42)} provider ${provider.get(n)} L${lv.get(provider.get(n))} | must be L<=${T - 1 - maxT} | ` + ps.map(p => `${p.id}(L${lv.get(p.id)} T${tl.get(p.id)})`).join(' '));
}

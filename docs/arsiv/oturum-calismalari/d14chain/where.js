// Read-only: for given Dxx.export names, show providing package, its level and its own needs.
const fs = require('fs'), path = require('path');
const B = process.argv[2]; const names = process.argv.slice(3);
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const C = read(path.join(B, 'contracts.json'));
const all = [];
for (const m of C.modules) all.push(...read(path.join(B, 'packages', m.id + '.json')).packages.map(p => ({ ...p, module: m.id })));
const by = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const lv = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(0, ...by.get(id).deps.map(d => level(d) + 1)); lv.set(id, v); return v; };
for (const n of names) { const id = prov.get(n); if (!id) { console.log(n, 'NO PROVIDER'); continue; } const p = by.get(id); console.log(`${n} -> ${id} L${level(id)} ${p.size} | ${p.title} | needs ${p.needs.join(',')} | dep ${p.depends_on.join(',')}`); }

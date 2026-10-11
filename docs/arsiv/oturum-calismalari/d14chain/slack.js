// Read-only: for every package that needs a D14 export, its level from non-D14 deps only (D14 deps ignored), and its tail.
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const C = read(path.join(B, 'contracts.json'));
const all = [];
for (const m of C.modules) all.push(...read(path.join(B, 'packages', m.id + '.json')).packages.map(p => ({ ...p, module: m.id })));
const by = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
// deps excluding anything in D14 (transitively we drop D14 nodes entirely)
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])].filter(d => !d.startsWith('D14-'));
const lv = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(0, ...by.get(id).deps.map(d => level(d) + 1)); lv.set(id, v); return v; };
const kids = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) kids.get(d).push(p.id);
const tl = new Map(); const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...kids.get(id).map(tail)); tl.set(id, v); return v; };
const rows = [];
for (const p of all) { if (p.module === 'D14') continue; const n = (p.needs || []).filter(x => x.startsWith('D14.')); if (!n.length) continue; rows.push([p.id, level(p.id), tail(p.id), n.join(',')]); }
rows.sort((a, b) => a[1] - b[1]);
for (const r of rows) console.log(`${r[0]} ownLevel ${r[1]} tail ${r[2]} -> D14 export must be at level <= ${r[1] - 1} to not bind | ${r[3]}`);
const chain = Math.max(...all.filter(p => !p.id.startsWith('D14-')).map(p => level(p.id) + tail(p.id)));
console.log('chain without D14', chain);

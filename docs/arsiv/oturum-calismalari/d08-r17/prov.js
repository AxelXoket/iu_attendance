const fs = require('fs'), path = require('path');
const B = process.argv[2]; const names = process.argv.slice(3);
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const all = [];
for (const f of fs.readdirSync(path.join(B, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) { const P = read(path.join(B, 'packages', f)); for (const p of P.packages) all.push({ ...p, module: P.id }); }
const byId = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const L = new Map(); const lev = id => { if (L.has(id)) return L.get(id); L.set(id, 0); const v = Math.max(0, ...byId.get(id).deps.map(d => lev(d) + 1)); L.set(id, v); return v; };
all.forEach(p => lev(p.id));
for (const n of names) { const d = prov.get(n); console.log(n, '->', d, d ? 'L' + L.get(d) + ' ' + byId.get(d).title : ''); }

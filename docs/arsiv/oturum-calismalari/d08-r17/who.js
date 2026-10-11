const fs = require('fs'), path = require('path');
const B = process.argv[2]; const ids = process.argv.slice(3);
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const all = [];
for (const f of fs.readdirSync(path.join(B, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) { const P = read(path.join(B, 'packages', f)); for (const p of P.packages) all.push({ ...p, module: P.id }); }
const byId = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const dependents = new Map(all.map(p => [p.id, []])); for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const L = new Map(), T = new Map();
const lev = id => { if (L.has(id)) return L.get(id); L.set(id, 0); const v = Math.max(0, ...byId.get(id).deps.map(d => lev(d) + 1)); L.set(id, v); return v; };
const tl = id => { if (T.has(id)) return T.get(id); T.set(id, 1); const v = 1 + Math.max(0, ...dependents.get(id).map(tl)); T.set(id, v); return v; };
all.forEach(p => { lev(p.id); tl(p.id); });
for (const id of ids) { const p = byId.get(id); console.log(id, p.size, 'L' + L.get(id), 'T' + T.get(id), p.title); console.log('   deps:', p.deps.map(d => d + '(L' + L.get(d) + ')').join(' ')); console.log('   dependents:', dependents.get(id).map(d => d + '(T' + T.get(d) + ')').join(' ')); }

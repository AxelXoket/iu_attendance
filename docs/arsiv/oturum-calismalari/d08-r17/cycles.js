const fs = require('fs'), path = require('path');
const B = process.argv[2];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const all = [];
for (const f of fs.readdirSync(path.join(B, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) { const P = read(path.join(B, 'packages', f)); for (const p of P.packages) all.push({ ...p, module: P.id }); }
const byId = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) { p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const d = prov.get(n); if (!d) missing.push(p.id + ' ' + n); return d; }).filter(Boolean)])]; }
const st = new Map(); const cyc = [];
const visit = (id, stack) => { if (st.get(id) === 2) return; if (st.get(id) === 1) { cyc.push([...stack.slice(stack.indexOf(id)), id].join(' > ')); return; } st.set(id, 1); for (const d of byId.get(id).deps) if (byId.has(d)) visit(d, [...stack, id]); st.set(id, 2); };
all.forEach(p => visit(p.id, []));
console.log('cycles:', cyc.length ? cyc.slice(0, 5) : 'none');
console.log('unresolved needs:', missing.filter(m => m.startsWith('D08')).length ? missing.filter(m => m.startsWith('D08')) : 'none for D08', '(all modules: ' + missing.length + ')');

// Read-only: compute level/tail over the CURRENT packages/*.json of all modules (no writes).
// usage: node levels.js <backendDir> [module=D14] [overrideFile]
const fs = require('fs'), path = require('path');
const B = process.argv[2], M = process.argv[3] || 'D14', OV = process.argv[4];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const C = read(path.join(B, 'contracts.json'));
const all = [];
for (const m of C.modules) {
  let P; try { P = (OV && m.id === M) ? read(OV) : read(path.join(B, 'packages', m.id + '.json')); } catch (e) { console.log('read fail', m.id, e.message); continue; }
  all.push(...P.packages.map(p => ({ ...p, module: m.id })));
}
const by = new Map(all.map(p => [p.id, p]));
const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) {
  p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const v = prov.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])];
}
const kids = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) if (kids.has(d)) kids.get(d).push(p.id);
const lv = new Map(), tl = new Map(), st = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); if (st.get(id)) { console.log('CYCLE at', id); return 0; } st.set(id, 1); const v = Math.max(0, ...by.get(id).deps.filter(d => by.has(d)).map(d => level(d) + 1)); lv.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...kids.get(id).map(tail)); tl.set(id, v); return v; };
all.forEach(p => { level(p.id); tail(p.id); });
const chain = Math.max(...all.map(p => lv.get(p.id) + tl.get(p.id)));
console.log('packages', all.length, 'chain', chain, missing.length ? 'missing ' + missing.join('; ') : '');
const why = (p, d) => (p.depends_on || []).includes(d) ? 'dep' : (p.needs || []).filter(n => prov.get(n) === d).join(',');
for (const p of all.filter(x => x.module === M)) {
  const L = lv.get(p.id), T = tl.get(p.id);
  const bind = p.deps.filter(d => lv.get(d) + 1 === L).map(d => `${d}[${why(p, d)}]`);
  const late = kids.get(p.id).filter(k => tl.get(k) + 1 === T).map(k => `${k}[${why(by.get(k), p.id)}]`);
  console.log(`${p.id} ${p.size} L${L} T${T} =${L + T} | ${p.title}\n   <- ${bind.join(' ')}\n   -> ${late.join(' ')}`);
}
if (process.argv.includes('--crit')) {
  // print one longest chain
  let cur = all.filter(p => lv.get(p.id) === 0).sort((a, b) => tl.get(b.id) - tl.get(a.id))[0].id;
  const ch = [cur];
  while (kids.get(cur).length) { cur = kids.get(cur).sort((a, b) => tl.get(b) - tl.get(a))[0]; ch.push(cur); }
  console.log('longest chain:', ch.map(id => id + '(' + why(by.get(id), ch[ch.indexOf(id) - 1]) + ')').join(' > '));
}

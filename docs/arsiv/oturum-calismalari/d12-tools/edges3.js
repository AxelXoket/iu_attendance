// Content-level: for each new package, the edges its files carried in the old packages, and which it no longer has.
const fs = require('fs');
const O = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).packages, N = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).packages;
const where = new Map(); for (const p of N) for (const f of p.files) where.set(f, p.id);
const oldWhere = new Map(); for (const p of O) for (const f of p.files) oldWhere.set(f, p.id);
const oById = new Map(O.map(p => [p.id, p])), nById = new Map(N.map(p => [p.id, p]));
// transitive deps of new package within D12
const clos = id => { const s = new Set(), st = [...nById.get(id).depends_on]; while (st.length) { const d = st.pop(); if (!s.has(d)) { s.add(d); st.push(...nById.get(d).depends_on); } } return s; };
let removed = 0; const lines = [];
for (const z of N) {
  const src = [...new Set(z.files.map(f => oldWhere.get(f)).filter(Boolean))];
  const inh = new Set();
  for (const x of src) { const op = oById.get(x); op.needs.forEach(n => inh.add('need ' + n)); op.depends_on.forEach(d => inh.add('dep ' + d)); }
  const c = clos(z.id); const gone = [];
  for (const e of inh) {
    if (e.startsWith('need ')) { if (!z.needs.includes(e.slice(5)) && ![...c].some(w => nById.get(w).needs.includes(e.slice(5)))) gone.push(e); continue; }
    const d = e.slice(4); const tgt = new Set(oById.get(d).files.map(f => where.get(f)));
    // kept if z still waits (directly or transitively) on every new package that now holds the old target's files, or holds them itself
    const still = [...tgt].every(w => w === z.id || c.has(w));
    if (!still) gone.push(e + ' (now ' + [...tgt].join('/') + ')');
  }
  removed += gone.length;
  if (gone.length) lines.push(`${z.id} [from ${src.join(',')}] drops: ${gone.join('; ')}`);
}
console.log(lines.join('\n')); console.log('content-level removed edges:', removed);

// Compare old and new D12 edges at file level: which old depends_on and needs edges survive.
const fs = require('fs');
const O = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).packages, N = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).packages;
const where = new Map(); for (const p of N) for (const f of p.files) where.set(f, p.id);
const nById = new Map(N.map(p => [p.id, p]));
const newOf = op => new Set(op.files.map(f => where.get(f)));
const oById = new Map(O.map(p => [p.id, p]));
let removed = [], kept = 0;
for (const op of O) {
  const Z = newOf(op);
  for (const d of op.depends_on) {
    const W = newOf(oById.get(d));
    const ok = [...Z].some(z => [...W].some(w => w === z || nById.get(z).depends_on.includes(w)));
    ok ? kept++ : removed.push(`${op.id} -> ${d}`);
  }
  for (const n of op.needs) {
    const ok = [...Z].some(z => nById.get(z).needs.includes(n));
    ok ? kept++ : removed.push(`${op.id} needs ${n}`);
  }
}
const added = [];
const oldWhere = new Map(); for (const p of O) for (const f of p.files) oldWhere.set(f, p.id);
for (const np of N) {
  const src = new Set(np.files.map(f => oldWhere.get(f)).filter(Boolean));
  for (const n of np.needs) if (![...src].some(s => oById.get(s).needs.includes(n))) added.push(`${np.id} needs ${n}`);
}
const oe = O.reduce((s, p) => s + p.depends_on.length + p.needs.length, 0), ne = N.reduce((s, p) => s + p.depends_on.length + p.needs.length, 0);
console.log(`old edges ${oe}, new edges ${ne}, old edges kept ${kept}, removed ${removed.length}`);
console.log('REMOVED:\n  ' + removed.join('\n  '));
console.log('ADDED needs:\n  ' + added.join('\n  '));

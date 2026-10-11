// Compare old and new D08 package plans edge by edge, mapped through files.
// An old internal edge A->B survives when some file of A sits in a new package that equals or directly
// depends on the new package of some file of B. An old need A->n survives when a new package holding a
// file of A still lists n. Prints removed and added edges and the counts.
const fs = require('fs');
const [, , oldPath, newPath] = process.argv;
const O = JSON.parse(fs.readFileSync(oldPath, 'utf8')).packages;
const N = JSON.parse(fs.readFileSync(newPath, 'utf8')).packages;
const newOf = new Map(); for (const p of N) for (const f of p.files) newOf.set(f, p);
const removed = [], kept = [];
for (const a of O) {
  const aNew = [...new Set(a.files.map(f => newOf.get(f)))];
  for (const bId of a.depends_on) {
    const b = O.find(p => p.id === bId);
    const bNew = new Set(b.files.map(f => newOf.get(f)));
    const ok = aNew.some(x => bNew.has(x) || x.depends_on.some(d => [...bNew].some(y => y.id === d)));
    (ok ? kept : removed).push(`${a.id} -> ${bId} (depends_on)`);
  }
  for (const n of a.needs) {
    const ok = aNew.some(x => x.needs.includes(n));
    (ok ? kept : removed).push(`${a.id} -> ${n} (needs)`);
  }
}
const oldNeeds = new Map(); for (const a of O) for (const f of a.files) oldNeeds.set(f, new Set(a.needs));
const added = [];
for (const p of N) for (const n of p.needs) if (!p.files.some(f => oldNeeds.get(f) && oldNeeds.get(f).has(n))) added.push(`${p.id} + ${n}`);
console.log('removed (' + removed.length + '):\n  ' + removed.join('\n  '));
console.log('added needs (' + added.length + '):\n  ' + added.join('\n  '));
console.log('kept', kept.length, '| old packages', O.length, '| new packages', N.length);

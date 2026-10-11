// Compares two D10 package files: edges removed/added per package, file/test/table/endpoint coverage, spec test coverage.
const fs = require('fs');
const [a, b, specPath] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
// Edges are keyed by what the package is (its files), not its id, because ids may move.
const fileOwner = (P) => { const m = new Map(); for (const p of P.packages) for (const f of p.files) m.set(f, p.id); return m; };
const edgesOf = (P) => {
  const own = new Map(P.packages.map(p => [p.id, p]));
  const e = new Set();
  for (const p of P.packages) {
    const me = p.files.join('|');
    for (const d of p.depends_on) e.add(me + ' -> ' + own.get(d).files.join('|'));
    for (const n of p.needs) e.add(me + ' -> ' + n);
  }
  return e;
};
// Per-file edge view: every (file, target-file-or-need) pair, so moving a file is not counted as edge churn.
const fileEdges = (P) => {
  const own = new Map(P.packages.map(p => [p.id, p]));
  const e = new Set();
  for (const p of P.packages) for (const f of p.files) {
    for (const d of p.depends_on) for (const g of own.get(d).files) e.add(f + ' -> ' + g);
    for (const n of p.needs) e.add(f + ' -> ' + n);
  }
  return e;
};
let pkgRemoved = 0, pkgAdded = 0;
const byIdA = new Map(A.packages.map(p => [p.id, p])), byIdB = new Map(B.packages.map(p => [p.id, p]));
for (const p of B.packages) {
  const q = byIdA.get(p.id);
  if (!q) { console.log(p.id, 'NEW'); continue; }
  const rd = q.depends_on.filter(x => !p.depends_on.includes(x)), ad = p.depends_on.filter(x => !q.depends_on.includes(x));
  const rn = q.needs.filter(x => !p.needs.includes(x)), an = p.needs.filter(x => !q.needs.includes(x));
  pkgRemoved += rd.length + rn.length; pkgAdded += ad.length + an.length;
  if (rd.length + ad.length + rn.length + an.length) console.log(p.id, '| -dep', rd.join(','), '| +dep', ad.join(','), '| -need', rn.join(','), '| +need', an.join(','));
}
console.log('package-level edges: removed', pkgRemoved, 'added', pkgAdded);
// coverage checks
const files = new Map(); for (const p of B.packages) for (const f of p.files) { if (files.has(f)) console.log('DUP FILE', f); files.set(f, p.id); }
for (const f of spec.files) { const fp = typeof f === 'string' ? f : f.path; if (!files.has(fp)) console.log('MISSING FILE', fp); }
const oldFiles = new Set(A.packages.flatMap(p => p.files)); for (const f of oldFiles) if (!files.has(f)) console.log('LOST FILE', f);
const tests = new Map(); for (const p of B.packages) for (const t of p.tests) { if (tests.has(t)) console.log('DUP TEST', t); tests.set(t, p.id); }
for (const t of spec.tests) if (!tests.has(t.name)) console.log('SPEC TEST IN NO PACKAGE', t.name);
const oldTests = new Set(A.packages.flatMap(p => p.tests)); for (const t of oldTests) if (!tests.has(t)) console.log('LOST TEST', t);
for (const k of ['tables', 'endpoints', 'jobs', 'exports']) {
  const o = A.packages.flatMap(p => p[k]).sort().join('|'), n = B.packages.flatMap(p => p[k]).sort().join('|');
  console.log(k, o === n ? 'same set' : 'CHANGED\n  old ' + o + '\n  new ' + n);
}
console.log('packages', A.packages.length, '->', B.packages.length);

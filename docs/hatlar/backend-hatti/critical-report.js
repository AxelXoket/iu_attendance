// Critical path report over schedule.json (run node schedule.js first).
// For every package: level (longest chain of packages before it), tail (longest chain after it, itself included),
// the edge that sets its level, and whether it lies on a chain longer than the target.
// Writes packages/rapor-Dxx.txt per module and prints a summary. Usage: node critical-report.js [target=16]
const fs = require('fs'), path = require('path');
const D = __dirname;
const T = Number(process.argv[2] || 16);
const S = JSON.parse(fs.readFileSync(path.join(D, 'schedule.json'), 'utf8'));
const by = new Map(S.packages.map(p => [p.id, p]));
const kids = new Map(S.packages.map(p => [p.id, []]));
for (const p of S.packages) for (const d of p.after) kids.get(d).push(p.id);
const lv = new Map(), tl = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(0, ...by.get(id).after.map(d => level(d) + 1)); lv.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...kids.get(id).map(tail)); tl.set(id, v); return v; };
S.packages.forEach(p => { level(p.id); tail(p.id); });
const chain = Math.max(...S.packages.map(p => lv.get(p.id) + tl.get(p.id)));
const why = (p, d) => {
  if (p.depends_on.includes(d)) return 'depends_on';
  const ex = by.get(d).exports || [];
  return 'needs ' + p.needs.filter(n => n.startsWith(by.get(d).module + '.') && ex.includes(n.split('.')[1])).join(', ');
};
const mods = [...new Set(S.packages.map(p => p.module))].sort();
let over = 0;
for (const m of mods) {
  const lines = [`Module ${m}. Global chain now ${chain} packages; target ${T} (234 packages at 15 per phase need at least 16 phases).`,
    'A package is TOO LATE when level + tail > target: level = packages that must finish before it, tail = it plus the longest chain waiting on it.',
    'Binding edge = the predecessor that sets its level. Remove an edge only if the code does not import that file or call that export to build or test; otherwise split the package so the early part does not wait.', ''];
  for (const p of S.packages.filter(x => x.module === m)) {
    const L = lv.get(p.id), Tl = tl.get(p.id), bad = L + Tl > T;
    if (bad) over++;
    const bind = p.after.filter(d => lv.get(d) + 1 === L);
    const late = kids.get(p.id).filter(k => tl.get(k) + 1 === Tl);
    lines.push(`${bad ? 'TOO LATE' : 'ok      '} ${p.id} ${p.size} level ${L} tail ${Tl} | ${p.title}`);
    if (bad) {
      for (const d of bind) lines.push(`    waits on ${d} (level ${lv.get(d)}, ${by.get(d).title}) via ${why(p, d)}`);
      for (const k of late) lines.push(`    is waited on by ${k} (tail ${tl.get(k)}, ${by.get(k).title}) via ${why(by.get(k), p.id)}`);
    }
  }
  fs.writeFileSync(path.join(D, 'packages', `rapor-${m}.txt`), lines.join('\n') + '\n');
}
console.log(`chain ${chain}, target ${T}, packages too late ${over} of ${S.packages.length}; reports in packages/rapor-Dxx.txt`);

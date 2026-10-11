// Simulate the global schedule with a candidate module file replacing that module's packages.
// node sim.js <candidate.json> [r1|live]
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const cand = read(process.argv[2]);
const mode = process.argv[3] || 'r1';
const mod = cand.id;
let others = [];
if (mode === 'r1') others = read(path.join(B, 'packages/r1/schedule.json')).packages.filter(p => !p.id.startsWith(mod + '-'));
else for (let i = 1; i <= 15; i++) { const id = 'D' + String(i).padStart(2, '0'); if (id === mod) continue; try { others.push(...read(path.join(B, 'packages', id + '.json')).packages); } catch (e) { console.log('skip', id, e.message); } }
const all = [...others, ...cand.packages].map(p => ({ ...p, exports: [...(p.exports || [])], module: p.id.slice(0, 3) }));
// --move D04.SaatOznesi=D04-P01 : what-if, the owner moves an export to another of its packages
if (process.argv.includes('--move')) for (const mv of process.argv[process.argv.indexOf('--move') + 1].split(',')) {
  const [ex, to] = mv.split('='); const [m, x] = ex.split('.');
  for (const p of all) if (p.module === m) p.exports = p.exports.filter(e => e !== x);
  all.find(p => p.id === to).exports.push(x);
}
const byId = new Map(all.map(p => [p.id, p]));
const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const v = prov.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])].filter(d => byId.has(d));
if (missing.length) console.log('unresolved needs:', missing.length, missing.slice(0, 10).join('; '));
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const lvl = new Map(), tl = new Map(), onstack = new Set();
const level = id => { if (lvl.has(id)) return lvl.get(id); if (onstack.has(id)) throw new Error('cycle at ' + id); onstack.add(id); const v = Math.max(-1, ...byId.get(id).deps.map(level)) + 1; onstack.delete(id); lvl.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(tail)); tl.set(id, v); return v; };
all.forEach(p => { level(p.id); tail(p.id); });
const chain = Math.max(...all.map(p => lvl.get(p.id) + tail(p.id)));
// list scheduling like schedule.js
const W = { S: 1, M: 2, L: 3 }, cpm = new Map();
const cp = id => { if (cpm.has(id)) return cpm.get(id); const v = W[byId.get(id).size] + Math.max(0, ...dependents.get(id).map(cp)); cpm.set(id, v); return v; };
const phaseOf = new Map(); let phases = 0;
while (phaseOf.size < all.length) {
  const ready = all.filter(p => !phaseOf.has(p.id) && p.deps.every(d => phaseOf.has(d) && phaseOf.get(d) < phases)).sort((a, b) => cp(b.id) - cp(a.id) || a.id.localeCompare(b.id));
  ready.slice(0, 15).forEach(p => phaseOf.set(p.id, phases)); phases++;
  if (phases > 200) break;
}
console.log(`mode ${mode}: ${all.length} packages, chain ${chain}, phases ${phases}`);
for (const p0 of cand.packages) { const p = byId.get(p0.id);
  const id = p.id, L = lvl.get(id), T = tl.get(id);
  const bind = p.deps.filter(d => lvl.get(d) === L - 1).map(d => d + '(' + lvl.get(d) + ')');
  const waiters = dependents.get(id).filter(d => tl.get(d) === T - 1).slice(0, 4);
  console.log(`${L + T > 20 ? 'LATE' : 'ok  '} ${id} ${p.size} lvl ${L} tail ${T} ph ${phaseOf.get(id)} | ${p.title.slice(0, 50)} | bind ${bind.join(',')} | waiters ${waiters.join(',')}`);
}
// print the critical chain
let start = all.filter(p => lvl.get(p.id) + tl.get(p.id) === chain && lvl.get(p.id) === 0).map(p => p.id)[0];
const ch = [];
let cur = start;
while (cur) { ch.push(cur); const nx = dependents.get(cur).filter(d => tl.get(d) === tl.get(cur) - 1 && lvl.get(d) === lvl.get(cur) + 1); cur = nx[0]; }
console.log('critical chain:', ch.join(' > '));
if (process.argv.includes('--who')) { const ids = process.argv[process.argv.indexOf('--who') + 1].split(','); for (const id of ids) console.log(id, 'lvl', lvl.get(id), 'tail', tl.get(id), 'deps', byId.get(id).deps.map(d => d + '(' + lvl.get(d) + ')').join(',')); }

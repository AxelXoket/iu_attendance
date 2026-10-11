// Read-only chain analysis. Usage: node analyze.js [D07 draft json] [--r1] [--focus D07]
// Loads every module's packages from the live packages/*.json (falls back to r1 snapshot when a file
// fails to parse), optionally overriding D07 with a draft, and prints level/tail (package counts).
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const argv = process.argv.slice(2);
const useR1 = argv.includes('--r1');
const draft = argv.find(a => a.endsWith('.json'));
const focus = argv.includes('--focus') ? argv[argv.indexOf('--focus') + 1] : 'D07';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const r1 = read(path.join(B, 'packages/r1/schedule.json')).packages;
const mods = [...new Set(r1.map(p => p.module || p.id.slice(0, 3)))];
let all = [];
for (const m of mods) {
  let pk = null;
  if (draft && m === 'D07') pk = read(draft).packages;
  else if (!useR1) { try { pk = read(path.join(B, 'packages', m + '.json')).packages; } catch (e) { console.error('fallback r1 for', m, e.message); } }
  if (!pk) pk = r1.filter(p => p.id.startsWith(m + '-'));
  all.push(...pk.map(p => ({ ...p, module: m })));
}
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) {
  p.deps = [...new Set([...(p.depends_on || []).filter(d => byId.has(d)), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])];
}
if (missing.length) console.log('unresolved needs:', missing.slice(0, 20).join('; '));
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) dependents.get(d).push(p.id);
const lvl = new Map(), tl = new Map();
const L = (id, st = new Set()) => { if (lvl.has(id)) return lvl.get(id); if (st.has(id)) throw new Error('cycle at ' + id); st.add(id); const v = Math.max(0, ...byId.get(id).deps.map(d => L(d, st) + 1)); st.delete(id); lvl.set(id, v); return v; };
const T = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(T)); tl.set(id, v); return v; };
all.forEach(p => { L(p.id); T(p.id); });
const chain = Math.max(...all.map(p => lvl.get(p.id) + tl.get(p.id)));
console.log('packages', all.length, 'global chain', chain);
const binding = id => byId.get(id).deps.filter(d => lvl.get(d) + 1 === lvl.get(id));
const waiters = id => dependents.get(id).filter(d => tl.get(d) + 1 === tl.get(id));
for (const p of all.filter(p => p.module === focus)) {
  console.log(`${p.id} ${p.size} lvl ${lvl.get(p.id)} tail ${tl.get(p.id)} sum ${lvl.get(p.id) + tl.get(p.id)} | ${p.title}`);
  for (const d of byId.get(p.id).deps) console.log(`    <- ${d} (lvl ${lvl.get(d)})${binding(p.id).includes(d) ? ' *' : ''}`);
  for (const d of dependents.get(p.id)) console.log(`    -> ${d} (tail ${tl.get(d)})${waiters(p.id).includes(d) ? ' *' : ''}`);
}
if (argv.includes('--path')) {
  // print one longest chain
  let start = all.filter(p => lvl.get(p.id) === 0).sort((a, b) => tl.get(b.id) - tl.get(a.id))[0].id;
  const seq = [start];
  while (dependents.get(seq[seq.length - 1]).length) { const c = seq[seq.length - 1]; seq.push(dependents.get(c).sort((a, b) => tl.get(b) - tl.get(a))[0]); }
  console.log('longest chain:', seq.join(' > '));
}
if (argv.includes('--levels')) {
  const ids = argv[argv.indexOf('--levels') + 1].split(',');
  for (const id of ids) console.log(id, 'lvl', lvl.get(id), 'tail', tl.get(id), byId.get(id)?.title);
}
if (argv.includes('--prov')) {
  const ns = argv[argv.indexOf('--prov') + 1].split(',');
  for (const n of ns) { const id = provider.get(n); console.log(n, '=>', id, 'lvl', lvl.get(id), 'tail', tl.get(id)); }
}

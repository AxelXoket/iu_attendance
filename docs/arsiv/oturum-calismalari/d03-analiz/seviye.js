// Read-only analysis: level and tail of every package in the live packages/*.json (or r1 with --r1).
// node seviye.js [--r1] [--mod D03] [--pkg D02-P05,...]
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const argv = process.argv.slice(2);
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
let all = [];
if (argv.includes('--r1')) all = rd(path.join(B, 'packages/r1/schedule.json')).packages.map(p => ({ ...p, module: p.id.slice(0, 3) }));
else for (let i = 1; i <= 15; i++) { const id = 'D' + String(i).padStart(2, '0'); try { const P = rd(path.join(B, 'packages', id + '.json')); all.push(...P.packages.map(p => ({ ...p, module: id }))); } catch (e) { console.log('skip', id, e.message); } }
const byId = new Map(all.map(p => [p.id, p]));
const provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
const missing = [];
for (const p of all) { p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => { const v = provider.get(n); if (!v) missing.push(p.id + ' ' + n); return v; }).filter(Boolean)])]; }
const dependents = new Map(all.map(p => [p.id, []]));
for (const p of all) for (const d of p.deps) if (dependents.has(d)) dependents.get(d).push(p.id);
const lv = new Map(), tl = new Map(), st = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); if (st.get(id)) { console.log('CYCLE at', id); return 0; } st.set(id, 1); const p = byId.get(id); const v = Math.max(-1, ...p.deps.filter(d => byId.has(d)).map(level)) + 1; st.set(id, 0); lv.set(id, v); return v; };
const tail = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dependents.get(id).map(tail)); tl.set(id, v); return v; };
all.forEach(p => level(p.id)); all.forEach(p => tail(p.id));
const chain = Math.max(...all.map(p => lv.get(p.id) + tl.get(p.id)));
console.log('packages', all.length, 'longest chain', chain, 'missing providers', missing.length);
const mi = argv.indexOf('--mod'); const mod = mi >= 0 ? argv[mi + 1] : null;
const pi = argv.indexOf('--pkg'); const pk = pi >= 0 ? argv[pi + 1].split(',') : null;
for (const p of all) {
  if (mod && p.module !== mod) if (!pk || !pk.includes(p.id)) continue;
  if (!mod && pk && !pk.includes(p.id)) continue;
  if (!mod && !pk) continue;
  const bind = p.deps.filter(d => byId.has(d)).sort((a, b) => lv.get(b) - lv.get(a))[0];
  const why = bind ? (p.depends_on || []).includes(bind) ? 'depends_on' : (p.needs || []).filter(n => provider.get(n) === bind).join(',') : '';
  const succ = dependents.get(p.id).sort((a, b) => tl.get(b) - tl.get(a))[0];
  console.log(`${p.id} ${p.size} L${lv.get(p.id)} T${tl.get(p.id)} = ${lv.get(p.id) + tl.get(p.id)} | ${p.title} | bind ${bind || '-'}(L${bind ? lv.get(bind) : ''}) via ${why} | succ ${succ || '-'}(T${succ ? tl.get(succ) : ''})`);
}
if (missing.length && argv.includes('--missing')) console.log(missing.join('\n'));

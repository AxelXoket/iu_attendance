const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages';
const override = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null;
const all = [];
for (const f of fs.readdirSync(B).filter(f => /^D\d\d\.json$/.test(f))) {
  const fp = (override && f === 'D11.json') ? override : path.join(B, f);
  const P = JSON.parse(fs.readFileSync(fp, 'utf8')); all.push(...P.packages.map(p => ({ ...p, module: f.slice(0, 3) })));
}
const byId = new Map(all.map(p => [p.id, p])); const prov = new Map();
for (const p of all) for (const x of p.exports || []) prov.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []), ...(p.needs || []).map(n => prov.get(n)).filter(Boolean)])];
const dep = new Map(all.map(p => [p.id, []])); for (const p of all) for (const d of p.deps) dep.get(d).push(p.id);
const lv = new Map(), tl = new Map();
const L = id => { if (lv.has(id)) return lv.get(id); const v = Math.max(-1, ...byId.get(id).deps.map(L)) + 1; lv.set(id, v); return v; };
const T = id => { if (tl.has(id)) return tl.get(id); const v = 1 + Math.max(0, ...dep.get(id).map(T)); tl.set(id, v); return v; };
all.forEach(p => { L(p.id); T(p.id); });
const max = Math.max(...all.map(p => lv.get(p.id) + tl.get(p.id)));
// print one critical path
let cur = all.filter(p => lv.get(p.id) === 0 && tl.get(p.id) === max).map(p => p.id)[0];
const pathIds = [cur];
while (dep.get(cur).length) { const n = dep.get(cur).find(d => tl.get(d) === tl.get(cur) - 1); if (!n) break; pathIds.push(n); cur = n; }
console.log('chain', max, ':', pathIds.join(' > '));
const d11on = all.filter(p => p.module === 'D11' && lv.get(p.id) + tl.get(p.id) === max).map(p => p.id);
console.log('D11 on a max chain:', d11on.join(' ') || 'none');
const over = all.filter(p => lv.get(p.id) + tl.get(p.id) > 20);
console.log('packages over 20:', over.length, 'of which D11:', over.filter(p => p.module === 'D11').map(p => p.id + '(' + (lv.get(p.id) + tl.get(p.id)) + ')').join(' '));

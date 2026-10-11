// Prints, for each package of a module, the provider and level of every need.
const fs = require('fs'), path = require('path');
const D = process.argv[2], mod = process.argv[3] || 'D04';
const all = [];
for (const f of fs.readdirSync(path.join(D, 'packages')).filter(f => /^D\d\d\.json$/.test(f))) {
  try { const P = JSON.parse(fs.readFileSync(path.join(D, 'packages', f), 'utf8').replace(/^\uFEFF/, '')); for (const p of P.packages) all.push({ ...p, module: P.id }); } catch (e) { console.log('skip', f); }
}
const byId = new Map(all.map(p => [p.id, p])), provider = new Map();
for (const p of all) for (const x of p.exports || []) provider.set(p.module + '.' + x, p.id);
for (const p of all) p.deps = [...new Set([...(p.depends_on || []).filter(d => byId.has(d)), ...(p.needs || []).map(n => provider.get(n)).filter(Boolean)])];
const lv = new Map();
const level = id => { if (lv.has(id)) return lv.get(id); lv.set(id, 0); const v = Math.max(0, ...byId.get(id).deps.map(d => level(d) + 1)); lv.set(id, v); return v; };
all.forEach(p => level(p.id));
for (const p of all.filter(p => p.module === mod)) console.log(p.id, 'L' + lv.get(p.id), (p.needs || []).map(n => `${n}=${provider.get(n)}(L${lv.get(provider.get(n))})`).join(' '));

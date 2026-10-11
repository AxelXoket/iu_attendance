// Assembles D01.json from part files. Usage: node assemble.js
const fs = require('fs'), path = require('path');
const dir = __dirname;
const read = f => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const pad = n => String(n).padStart(2, '0');
const decided = [...(read('k1.json') || []), ...(read('k2.json') || []), ...(read('k3.json') || [])]
  .map((d, i) => ({ id: 'D01-K' + pad(i + 1), fact: d.fact, anchor: d.anchor, quote: d.quote }));
const gaps = [...(read('g1.json') || []), ...(read('g2.json') || [])]
  .map((g, i) => ({ id: 'D01-B' + pad(i + 1), question: g.question, why: g.why, options: g.options, recommendation: g.recommendation, needs_owner: g.needs_owner }));
const rest = read('rest.json') || { contradictions: [], entities: [], endpoints: [], jobs: [], depends_on: [], touches_other_domains: [] };
// Gap references inside text use stable keys like {B:key}; resolve them to final ids.
const gapKeys = {};
[...(read('g1.json') || []), ...(read('g2.json') || [])].forEach((g, i) => { if (g.key) gapKeys[g.key] = 'D01-B' + pad(i + 1); });
const resolve = s => typeof s === 'string' ? s.replace(/\{B:([\w-]+)\}/g, (m, k) => { if (!gapKeys[k]) throw new Error('unknown gap key ' + k); return gapKeys[k]; }) : s;
const deep = v => Array.isArray(v) ? v.map(deep) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : resolve(v);
const contradictions = (rest.contradictions || []).map((c, i) => ({ id: 'D01-C' + pad(i + 1), a: c.a, b: c.b, note: c.note }));
const out = deep({
  id: 'D01', title: 'Kimlik, giriş ve yetki',
  decided, gaps, contradictions,
  entities: rest.entities, endpoints: rest.endpoints, jobs: rest.jobs,
  depends_on: rest.depends_on, touches_other_domains: rest.touches_other_domains,
});
fs.writeFileSync(path.join(dir, '..', 'D01.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`assembled: ${decided.length} decided, ${gaps.length} gaps, ${contradictions.length} contradictions`);

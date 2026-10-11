// Merges the D04 part files into inv/D04.json. Missing parts count as empty.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const read = (f, dflt) => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : dflt; };
const rest = read('rest.json', {});
const out = {
  id: 'D04',
  title: 'Yoklama penceresi ve saat',
  decided: [...read('decided1.json', []), ...read('decided2.json', [])],
  gaps: [...read('gaps1.json', []), ...read('gaps2.json', []), ...read('gaps3.json', [])],
  contradictions: read('contradictions.json', []),
  entities: rest.entities || [],
  endpoints: rest.endpoints || [],
  jobs: rest.jobs || [],
  depends_on: rest.depends_on || [],
  touches_other_domains: rest.touches_other_domains || [],
};
const ids = [...out.decided, ...out.gaps, ...out.contradictions].map(x => x.id);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) { console.log('DUPLICATE IDS: ' + dup.join(', ')); process.exit(1); }
fs.writeFileSync(path.join(dir, '..', 'inv', 'D04.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`merged: ${out.decided.length} decided, ${out.gaps.length} gaps, ${out.contradictions.length} contradictions`);

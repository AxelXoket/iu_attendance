// Merges D09 part files into inv/D09.json, numbering ids in order.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const read = (f, dflt) => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : dflt; };
const pad = n => String(n).padStart(2, '0');
const decided = [...read('a.json', []), ...read('b.json', [])].map((d, i) => ({ id: 'D09-K' + pad(i + 1), ...d }));
const gaps = [...read('c.json', []), ...read('d.json', [])].map((g, i) => ({ id: 'D09-B' + pad(i + 1), ...g }));
const rest = read('e.json', { contradictions: [], entities: [], endpoints: [], jobs: [], depends_on: [], touches_other_domains: [] });
const contradictions = (rest.contradictions || []).map((c, i) => ({ id: 'D09-C' + pad(i + 1), ...c }));
const out = {
  id: 'D09', title: 'Düzeltme, onay ve sorun bildirimi',
  decided, gaps, contradictions,
  entities: rest.entities || [], endpoints: rest.endpoints || [], jobs: rest.jobs || [],
  depends_on: rest.depends_on || [], touches_other_domains: rest.touches_other_domains || [],
};
fs.writeFileSync(path.join(dir, '..', 'inv', 'D09.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('written', decided.length, 'decided,', gaps.length, 'gaps,', contradictions.length, 'contradictions');

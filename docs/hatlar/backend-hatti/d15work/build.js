// Builds inv/D15.json from d15data.js and d15rest.js, with structural self-checks.
const fs = require('fs'), path = require('path');
const { decided } = require('./d15data.js');
const rest = require('./d15rest.js');

const out = {
  id: 'D15',
  title: 'İşletim, güvenlik ve test',
  decided: decided.map((d, i) => ({ id: 'D15-K' + String(i + 1).padStart(2, '0'), fact: d.fact, anchor: d.anchor, quote: d.quote })),
  gaps: rest.gaps,
  contradictions: rest.contradictions,
  entities: rest.entities,
  endpoints: rest.endpoints,
  jobs: rest.jobs,
  depends_on: rest.depends_on,
  touches_other_domains: rest.touches_other_domains,
};

const errs = [];
out.gaps.forEach((g, i) => { const want = 'D15-B' + String(i + 1).padStart(2, '0'); if (g.id !== want) errs.push(`gap ${i} id ${g.id} expected ${want}`); if (!Array.isArray(g.options) || !g.options.length) errs.push(`${g.id} options empty`); });
out.contradictions.forEach((c, i) => { const want = 'D15-C' + String(i + 1).padStart(2, '0'); if (c.id !== want) errs.push(`contradiction ${i} id ${c.id}`); });
const gapIds = new Set(out.gaps.map(g => g.id.replace('D15-', '')));
// every "B##" or "D15-B##" reference in the text must point at an existing gap
const text = JSON.stringify(out);
for (const m of text.matchAll(/(?<![A-Za-z0-9_-])(?:D15-)?(B\d\d)\b/g)) if (!gapIds.has(m[1])) errs.push('dangling reference ' + m[0]);
for (const m of text.matchAll(/D15-(C\d\d)\b/g)) if (!out.contradictions.some(c => c.id === 'D15-' + m[1])) errs.push('dangling reference ' + m[0]);
if (/[–—]/.test(text)) errs.push('contains U+2013 or U+2014');
const names = out.entities.map(e => e.name); if (new Set(names).size !== names.length) errs.push('duplicate entity');
if (!out.endpoints.every(e => ['telefon', 'panel', 'kürsü', 'sunucu'].includes(e.client))) errs.push('bad endpoint client');
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }

const dest = path.join(__dirname, '..', 'inv', 'D15.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('wrote', dest, out.decided.length, 'decided,', out.gaps.length, 'gaps,', out.contradictions.length, 'contradictions,', out.entities.length, 'entities,', out.endpoints.length, 'endpoints,', out.jobs.length, 'jobs');

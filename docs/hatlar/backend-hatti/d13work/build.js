// Builds inv/D13.json from facts.js and rest.js; anchors are computed, every cross reference is checked.
const fs = require('fs'), path = require('path');
const { locate } = require('./anchorlib.js');
const facts = require('./facts.js');
const R = require('./rest.js');
const pad = n => String(n).padStart(2, '0');

const decided = facts.map(([file, quote, fact], i) => ({ id: `D13-K${pad(i + 1)}`, fact, anchor: locate(file, quote), quote }));
const gaps = R.gaps.map((g, i) => ({ id: `D13-B${pad(i + 1)}`, question: g.question, why: g.why, options: g.options, recommendation: g.recommendation, needs_owner: g.needs_owner }));
const side = ([file, quote]) => `${locate(file, quote)}: "${quote}"`;
const contradictions = R.contradictions.map((c, i) => ({ id: `D13-C${pad(i + 1)}`, a: side(c.a), b: c.b.map(side).join('; '), note: c.note }));

const out = {
  id: 'D13', title: 'API yüzeyi ve sözleşmeler',
  decided, gaps, contradictions,
  entities: R.entities, endpoints: R.endpoints, jobs: R.jobs,
  depends_on: R.depends_on, touches_other_domains: R.touches,
};

// Cross-reference checks: every file.html#id mentioned anywhere must exist; every D13-Bnn / D13-Cnn / D13-Knn mentioned must exist.
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const ids = {};
for (const f of ['plan', 'teknik', 'tasarim']) ids[f] = new Set([...fs.readFileSync(REPO + f + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const all = JSON.stringify(out);
const errs = [];
for (const m of all.matchAll(/(plan|teknik|tasarim)\.html#([\w-]+)/g)) if (!ids[m[1]].has(m[2])) errs.push('missing anchor ' + m[0]);
const own = new Set([...decided.map(d => d.id), ...gaps.map(g => g.id), ...contradictions.map(c => c.id)]);
for (const m of all.matchAll(/D13-[BCK]\d\d/g)) if (!own.has(m[0])) errs.push('dangling ref ' + m[0]);
if (/[\u2013\u2014]/.test(all)) errs.push('forbidden dash');
if (/\$\{/.test(all)) errs.push('template leak');
if (errs.length) { console.error([...new Set(errs)].join('\n')); process.exit(1); }

const dest = path.join(__dirname, '..', 'inv', 'D13.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`wrote ${dest}: ${decided.length} decided, ${gaps.length} gaps (${gaps.filter(g => g.needs_owner).length} needs_owner), ${contradictions.length} contradictions, ${R.entities.length} entities, ${R.endpoints.length} endpoints, ${R.jobs.length} jobs`);

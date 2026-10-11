// Shape gate for research and verify JSON files.
// Usage: node validate.js R01            (research/R01.json)
//        node validate.js R01 verify     (verify/R01.json)
const fs = require('fs'), path = require('path');
const [, , id, kind] = process.argv;
const S = __dirname;
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const f = kind === 'verify' ? path.join(S, 'verify', id + '.json') : path.join(S, 'research', id + '.json');
const errs = [];
let j;
try { j = read(f); } catch (e) { console.log('INVALID JSON: ' + e.message); process.exit(1); }
if (/[–—]/.test(JSON.stringify(j))) errs.push('contains U+2013 or U+2014 dash');
if (j.id !== id) errs.push('id mismatch');
const url = u => /^https?:\/\/\S+$/.test(u || '');

if (kind === 'verify') {
  const V = ['doğrulandı', 'kısmen', 'desteklenmiyor', 'eskimiş', 'açılamadı'];
  if (!Array.isArray(j.checked) || !j.checked.length) errs.push('checked missing');
  (j.checked || []).forEach((c, i) => {
    if (!/^R\d\d-F\d\d+$/.test(c.finding || '')) errs.push(`checked[${i}].finding bad`);
    if (!V.includes(c.verdict)) errs.push(`checked[${i}].verdict bad: ${c.verdict}`);
    if (!c.note) errs.push(`checked[${i}].note empty`);
  });
  const r = read(path.join(S, 'research', id + '.json'));
  const got = new Set((j.checked || []).map(c => c.finding));
  r.findings.filter(x => x.load_bearing).forEach(x => { if (!got.has(x.id)) errs.push('load-bearing finding not checked: ' + x.id); });
} else {
  for (const k of ['angle', 'summary']) if (!j[k]) errs.push(k + ' missing');
  const F = Array.isArray(j.findings) ? j.findings : (errs.push('findings missing'), []);
  if (F.length < 10) errs.push('fewer than 10 findings');
  const ids = new Set(); let lb = 0;
  F.forEach((x, i) => {
    if (!/^R\d\d-F\d\d+$/.test(x.id || '')) errs.push(`findings[${i}].id bad`);
    if (ids.has(x.id)) errs.push('duplicate id ' + x.id);
    ids.add(x.id);
    for (const k of ['title', 'claim', 'evidence', 'implication']) if (!x[k]) errs.push(`${x.id}.${k} empty`);
    if (!Array.isArray(x.sources) || !x.sources.length) errs.push(`${x.id} has no sources`);
    else x.sources.forEach((s, k) => { if (!url(s.url)) errs.push(`${x.id}.sources[${k}].url bad`); if (!s.title) errs.push(`${x.id}.sources[${k}].title empty`); });
    if (!['yüksek', 'orta', 'düşük'].includes(x.confidence)) errs.push(`${x.id}.confidence bad`);
    if (x.load_bearing === true) lb++;
  });
  if (lb > 12) errs.push('more than 12 load_bearing findings');
  if (lb === 0) errs.push('no load_bearing findings');
  if (!Array.isArray(j.recommendations) || !j.recommendations.length) errs.push('recommendations missing');
  (j.recommendations || []).forEach((r, i) => {
    if (!/^R\d\d-K\d\d+$/.test(r.id || '')) errs.push(`recommendations[${i}].id bad`);
    if (!r.recommendation) errs.push(`${r.id}.recommendation empty`);
    (r.based_on || []).forEach(b => { if (!ids.has(b)) errs.push(`${r.id}.based_on unknown ${b}`); });
  });
  (j.signals || []).forEach((s, i) => {
    if (!url(s.url)) errs.push(`signals[${i}].url bad`);
    if (!s.paraphrase) errs.push(`signals[${i}].paraphrase empty`);
    if (s.quote && s.quote.trim().split(/\s+/).length > 15) errs.push(`signals[${i}].quote over 15 words`);
  });
  (j.benchmarks || []).forEach((b, i) => {
    if (!b.app) errs.push(`benchmarks[${i}].app missing`);
    if (!Array.isArray(b.sources) || !b.sources.length) errs.push(`benchmarks[${i}] has no sources`);
  });
  const min = { R07: ['benchmarks', 20], R08: ['signals', 30], R09: ['signals', 25] }[id];
  if (min && (j[min[0]] || []).length < min[1]) errs.push(`${min[0]} fewer than ${min[1]}`);
}
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 50).join('\n')); process.exit(1); }
console.log('OK', kind === 'verify'
  ? j.checked.length + ' checked'
  : `${j.findings.length} findings, ${(j.recommendations || []).length} recommendations, ${(j.signals || []).length} signals, ${(j.benchmarks || []).length} benchmarks`);

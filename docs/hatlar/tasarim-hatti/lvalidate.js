// Shape gate for library research files. Usage: node lvalidate.js L1
const fs = require('fs'), path = require('path');
const id = process.argv[2];
const f = path.join(__dirname, 'lib', id + '.json');
const errs = [];
let j;
try { j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); } catch (e) { console.log('INVALID JSON: ' + e.message); process.exit(1); }
if (/[–—]/.test(JSON.stringify(j))) errs.push('contains U+2013 or U+2014 dash');
if (j.id !== id) errs.push('id mismatch');
for (const k of ['area', 'summary']) if (!j[k]) errs.push(k + ' missing');
if (!Array.isArray(j.needs) || j.needs.length < 3) errs.push('needs: at least 3');
const C = Array.isArray(j.candidates) ? j.candidates : (errs.push('candidates missing'), []);
if (C.length < 12) errs.push('fewer than 12 candidates');
const V = ['seçildi', 'ikinci', 'reddedildi', 'gerekmez'];
const ids = new Set();
C.forEach((c, i) => {
  if (!new RegExp('^' + id + '-C\\d\\d+$').test(c.id || '')) errs.push(`candidates[${i}].id bad`);
  if (ids.has(c.id)) errs.push('duplicate ' + c.id); ids.add(c.id);
  for (const k of ['category', 'package', 'verdict', 'role', 'why', 'compat', 'modern']) if (!c[k]) errs.push(`${c.id}.${k} empty`);
  if (c.verdict && !V.includes(c.verdict)) errs.push(`${c.id}.verdict bad: ${c.verdict}`);
  if (c.repo && !/^[\w.-]+\/[\w.-]+$/.test(c.repo)) errs.push(`${c.id}.repo must be owner/name`);
  if (!Array.isArray(c.sources) || !c.sources.length) errs.push(`${c.id} has no sources`);
  else c.sources.forEach((s, k) => { if (!/^https?:\/\/\S+$/.test(s.url || '')) errs.push(`${c.id}.sources[${k}].url bad`); });
});
const cats = [...new Set(C.map(c => c.category))];
for (const cat of cats) if (!C.some(c => c.category === cat && (c.verdict === 'seçildi' || c.verdict === 'gerekmez'))) errs.push(`category "${cat}" has no seçildi or gerekmez entry`);
if (!Array.isArray(j.stack) || !j.stack.length) errs.push('stack missing');
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 50).join('\n')); process.exit(1); }
console.log(`OK ${C.length} candidates in ${cats.length} categories, ${C.filter(c => c.verdict === 'seçildi').length} picked`);

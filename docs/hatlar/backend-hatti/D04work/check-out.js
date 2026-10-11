// Deterministic checks on the generated spec and fragment beyond spec-validate.js.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const j = fs.readFileSync(path.join(B, 'spec', 'D04.json'), 'utf8');
const h = fs.readFileSync(path.join(B, 'frag', 'D04.html'), 'utf8');
const S = JSON.parse(j);
const errs = [];
const bs = String.fromCharCode(92);
if (j.includes(bs + "'")) errs.push('json has backslash-apostrophe');
if (h.includes(bs)) errs.push('html has a backslash: ' + h.slice(h.indexOf(bs) - 40, h.indexOf(bs) + 20));
if (/[–—]/.test(j + h)) errs.push('dash U+2013/U+2014 found');
// glued suffixes after module ids and clock times
const glued = /(?<![A-Za-z_.\/-])(D\d\d|[0-9]{1,2}:[0-9]{2})(ün|un|in|ın|nin|nın|ye|ya|e|a|de|da|te|ta|teyken)(?![A-Za-z0-9_(])/g;
const all = JSON.stringify(S) + h.replace(/<[^>]+>/g, ' ');
const g = all.match(glued); if (g) errs.push('glued suffix: ' + [...new Set(g)].join(', '));
// banned words from the owner's rules (English AI vocabulary) and KVKK
for (const w of ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay', 'KVKK'])
  if (new RegExp('\\b' + w + '\\b', 'i').test(all)) errs.push('banned word: ' + w);
// every gap and contradiction of the inventory is covered
const inv = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D04.json'), 'utf8'));
const gapIds = new Set(S.resolved_gaps.map(x => x.gap));
for (const g2 of inv.gaps) if (!gapIds.has(g2.id)) errs.push('gap not covered: ' + g2.id);
const cIds = new Set(S.contradictions_resolved.map(x => x.id));
for (const c of inv.contradictions) if (!cIds.has(c.id)) errs.push('contradiction not covered: ' + c.id);
// open point ids referenced in text exist
const opIds = new Set(S.open_points.map(o => o.id));
for (const m of (JSON.stringify(S) + h).matchAll(/D04-A\d\d/g)) if (!opIds.has(m[0])) errs.push('dangling open point ref ' + m[0]);
// h3 order
const want = ['Amaç ve sınırlar', 'Tablolar', 'Uç noktalar', 'İşler', 'Durumlar ve kurallar', 'Hata kodları', 'Testler', 'Netleştirilenler', 'Açık noktalar'];
const got = [...h.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
if (JSON.stringify(got) !== JSON.stringify(want)) errs.push('h3 order: ' + got.join(' | '));
// summary sentence count 3..6
const sent = S.summary.split(/(?<=[.!?])\s+/).length; if (sent < 3 || sent > 6) errs.push('summary sentences ' + sent);
// exports listed in contracts are present by name
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const mod = C.modules.find(m => m.id === 'D04');
for (const e of mod.exports) { const n = e.split('(')[0].trim(); if (!S.exports.some(x => x.name.startsWith(n))) errs.push('contract export missing: ' + n); }
// tables: every column has a note, type and boolean null
for (const t of S.tables) for (const col of t.columns) { if (typeof col.null !== 'boolean' || !col.type || !col.note) errs.push('column incomplete ' + t.name + '.' + col.name); }
// files unique
if (new Set(S.files).size !== S.files.length) errs.push('duplicate files');
// tests kinds valid
for (const t of S.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('bad kind ' + t.kind);
console.log(errs.length ? 'PROBLEMS:\n' + errs.join('\n') : 'check-out clean');
console.log('sizes: json', j.length, 'html', h.length, '| tests', S.tests.length, '| exports', S.exports.length);

// Extra gate for D10 beyond spec-validate.js: coverage, consistency and owner style rules.
// Run: node gate.js   (exit 1 on any failure)
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D10.json'), 'utf8'));
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D10.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const H = fs.readFileSync(path.join(B, 'frag', 'D10.html'), 'utf8');
const errs = [];
const all = JSON.stringify(S) + H;

// 1. every inventory gap exactly once: resolved, or named in an open point; owner gaps must be open points
const resolved = S.resolved_gaps.map(g => g.gap);
const opened = S.open_points.flatMap(o => o.question.match(/D10-B\d\d/g) || []);
for (const g of INV.gaps) {
  const n = resolved.filter(x => x === g.id).length + opened.filter(x => x === g.id).length;
  if (n !== 1) errs.push(`gap ${g.id} covered ${n} times`);
  if (g.needs_owner && !opened.includes(g.id)) errs.push(`owner gap ${g.id} is not an open point`);
}
for (const c of INV.contradictions) if (!S.contradictions_resolved.some(x => x.id === c.id)) errs.push(`contradiction ${c.id} unresolved`);
// open point ids sequential and owner flag boolean
S.open_points.forEach((o, i) => { if (o.id !== `D10-A${String(i + 1).padStart(2, '0')}`) errs.push('open point id order ' + o.id); if (typeof o.needs_owner !== 'boolean') errs.push('needs_owner not boolean ' + o.id); });

// 2. error codes: every endpoint code is catalogued, every catalogued code is used by an endpoint
const catalog = new Set(S.error_codes.map(e => e.kod));
const used = new Set(S.endpoints.flatMap(e => e.errors).filter(e => /^RAPORLAR_/.test(e)));
for (const u of used) if (!catalog.has(u)) errs.push('endpoint error not in catalog: ' + u);
for (const c of catalog) if (!used.has(c)) errs.push('catalog code unused by endpoints: ' + c);
for (const c of catalog) if (!/^RAPORLAR_[A-Z_]+$/.test(c)) errs.push('code naming: ' + c);
// every RAPORLAR_ code mentioned anywhere is catalogued
for (const m of new Set(all.match(/RAPORLAR_[A-Z_]+/g) || [])) if (!catalog.has(m)) errs.push('uncatalogued code mentioned: ' + m);

// 3. exports match contracts.json names
const mod = C.modules.find(m => m.id === 'D10');
for (const e of mod.exports) { const name = e.split('(')[0]; if (!S.exports.some(x => x.name === name)) errs.push('contract export missing: ' + name); }

// 4. consumes only modules listed in reads_from (plus non-module sources)
for (const c of S.consumes) if (/^D\d\d$/.test(c.module) && !mod.reads_from.includes(c.module)) errs.push('consumes module outside reads_from: ' + c.module);

// 5. fragment structure: required h3 parts in order, one section, h2 present
const want = ['Amaç ve sınırlar', 'Tablolar', 'Uç noktalar', 'İşler', 'Durumlar ve kurallar', 'Hata kodları', 'Testler', 'Netleştirilenler', 'Açık noktalar'];
const got = [...H.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
if (JSON.stringify(got) !== JSON.stringify(want)) errs.push('h3 parts: ' + got.join(' | '));
if ((H.match(/<section /g) || []).length !== 1) errs.push('section count');
if (!/^<section id="raporlar">\n<h2>/.test(H)) errs.push('fragment must start with the section and h2');
for (const d of H.match(/<details>/g) || []) void d;
if ((H.match(/<details>/g) || []).length !== (H.match(/<summary>/g) || []).length) errs.push('every details needs a summary');
if (/[\u0000-\u0008]/.test(H)) errs.push('control characters in fragment');

// 6. style rules: no en or em dash, no banned vocabulary, no KVKK, no phase re-staging words
if (/[–—]/.test(all)) errs.push('dash character');
const banned = ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay', 'KVKK'];
for (const w of banned) if (new RegExp('\\b' + w + '\\b', 'i').test(all)) errs.push('banned word: ' + w);
if (/Aşama [123]/.test(all)) errs.push('phase mention');

// 7. tables: CHECK lists use the reason codes; column names ASCII snake_case; anlık columns timestamptz end with _ani
const reasons = S.provisional_reasons.map(r => r.kod);
const chk = S.tables[0].constraints.find(c => c.includes('gecici_nedenleri <@'));
for (const r of reasons) if (!chk || !chk.includes(`'${r}'`)) errs.push('reason missing in CHECK: ' + r);
for (const t of S.tables) for (const c of t.columns) {
  if (!/^[a-z][a-z0-9_]*$/.test(c.name)) errs.push('column name ' + c.name);
  if (c.type === 'timestamptz' && !/_ani$/.test(c.name)) errs.push('timestamptz without _ani: ' + c.name);
  if (/_ani$/.test(c.name) && c.type !== 'timestamptz') errs.push('_ani not timestamptz: ' + c.name);
}
// 8. constraint and index names in the spec at most 63 bytes (the long PK is named by D12.kisitAdi)
for (const t of S.tables) for (const x of [...t.indexes, ...t.constraints]) for (const m of x.matchAll(/:\s*([a-z_]+_(?:pk|fk|uq|ck|idx))\b/g)) if (Buffer.byteLength(m[1]) > 63) errs.push('name > 63 bytes: ' + m[1]);
// 9. files unique and summary 3 to 6 sentences
if (new Set(S.files).size !== S.files.length) errs.push('duplicate files');
const sentences = S.summary.split(/(?<=[.])\s+(?=[A-ZÇĞİÖŞÜ])/).length;
if (sentences < 3 || sentences > 6) errs.push('summary sentences ' + sentences);

if (errs.length) { console.log('GATE FAIL (' + errs.length + ')\n' + errs.join('\n')); process.exit(1); }
console.log(`GATE OK: ${INV.gaps.length} gaps (${resolved.length} resolved, ${opened.length} open), ${S.contradictions_resolved.length} contradictions, ${catalog.size} error codes, ${got.length} h3 parts, summary ${sentences} sentences`);

// Gate for stage 2 output of one module: spec/Dxx.json and frag/Dxx.html.
// Checks: shape; tables, endpoints and jobs are exactly the module's own (contracts.json); every planned file sits inside the
// module's file globs; the fragment has the module section id, balanced tags, resolving plan/teknik/tasarim anchors, no dashes.
const fs = require('fs'), path = require('path');
const id = process.argv[2];
const D = __dirname, REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const C = JSON.parse(fs.readFileSync(path.join(D, 'contracts.json'), 'utf8'));
const mod = C.modules.find(m => m.id === id);
const errs = [];
if (!mod) { console.log('unknown module ' + id); process.exit(1); }
let S;
try { S = JSON.parse(fs.readFileSync(path.join(D, 'spec', id + '.json'), 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.log('INVALID spec JSON: ' + e.message); process.exit(1); }
const html = fs.existsSync(path.join(D, 'frag', id + '.html')) ? fs.readFileSync(path.join(D, 'frag', id + '.html'), 'utf8') : (errs.push('frag missing'), '');
if (/[\u2013\u2014]/.test(JSON.stringify(S) + html)) errs.push('contains U+2013 or U+2014');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');
const ep = s => String(s).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase();
const own = { t: new Set(mod.owns_tables.map(norm)), e: new Set(mod.owns_endpoints.map(ep)), j: new Set(mod.owns_jobs.map(norm)) };
const specT = new Set((S.tables || []).map(t => norm(t.name))), specE = new Set((S.endpoints || []).map(e => ep(e.method + ' ' + e.path))), specJ = new Set((S.jobs || []).map(j => norm(j.name)));
for (const t of specT) if (!own.t.has(t)) errs.push('spec table not owned by ' + id + ': ' + t);
for (const t of own.t) if (!specT.has(t)) errs.push('owned table missing from spec: ' + t);
for (const e of specE) if (!own.e.has(e)) errs.push('spec endpoint not owned by ' + id + ': ' + e);
for (const e of own.e) if (!specE.has(e)) errs.push('owned endpoint missing from spec: ' + e);
for (const j of specJ) if (!own.j.has(j)) errs.push('spec job not owned by ' + id + ': ' + j);
for (const j of own.j) if (!specJ.has(j)) errs.push('owned job missing from spec: ' + j);
for (const t of S.tables || []) if (!Array.isArray(t.columns) || !t.columns.length) errs.push(`table ${t.name} has no columns`);
for (const e of S.endpoints || []) for (const k of ['auth', 'request', 'response', 'errors']) if (e[k] === undefined) errs.push(`endpoint ${e.method} ${e.path} missing ${k}`);
const globs = C.file_ownership.filter(g => g.owner === id).map(g => g.glob.replace(/\*+$/, ''));
for (const f of S.files || []) if (!globs.some(g => f.startsWith(g))) errs.push('planned file outside own globs: ' + f);
if (!(S.files || []).length) errs.push('files: list the planned files');
if (!(S.tests || []).length) errs.push('tests: list the behavior tests');
// fragment checks
if (html) {
  if (!new RegExp(`<section id="${mod.name}"`).test(html)) errs.push(`fragment must start a <section id="${mod.name}">`);
  for (const t of ['section', 'div', 'table', 'tr', 'ul', 'ol', 'details', 'p', 'h2', 'h3', 'code', 'a']) { const o = (html.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'g')) || []).length, c = (html.match(new RegExp(`</${t}>`, 'g')) || []).length; if (o !== c) errs.push(`<${t}> open ${o} close ${c}`); }
  for (const doc of ['plan', 'teknik', 'tasarim']) {
    const ids = new Set([...fs.readFileSync(REPO + doc + '.html', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(new RegExp(`href="${doc}\\.html#([^"]+)"`, 'g'))) if (!ids.has(m[1])) errs.push(`broken link ${doc}.html#${m[1]}`);
  }
}
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 40).join('\n')); process.exit(1); }
console.log(`OK ${id}: ${specT.size} tables, ${specE.size} endpoints, ${specJ.size} jobs, ${(S.files || []).length} files, ${(S.tests || []).length} tests, ${(S.open_points || []).length} open points`);

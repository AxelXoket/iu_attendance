// Gate for contracts.json: one owner per table, endpoint, job and file glob; every inventory item mapped.
const fs = require('fs'), path = require('path');
const D = __dirname;
const C = JSON.parse(fs.readFileSync(path.join(D, 'contracts.json'), 'utf8'));
const inv = fs.readdirSync(path.join(D, 'inv')).filter(f => /^D\d\d\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(D, 'inv', f), 'utf8')));
const errs = [];
if (/[–—]/.test(JSON.stringify(C))) errs.push('contains U+2013 or U+2014');
const mods = C.modules || [];
if (mods.length !== 15) errs.push('expected 15 modules, found ' + mods.length);
const seen = { table: new Map(), endpoint: new Map(), job: new Map() };
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9_/{}:]/g, '');
const ep = s => String(s).replace(/\{[^}]+\}|:[a-z_]+/gi, '{x}').replace(/\/+$/, '').toLowerCase();
for (const m of mods) {
  for (const k of ['id', 'name', 'path']) if (!m[k]) errs.push(`module ${m.id || '?'} missing ${k}`);
  for (const t of m.owns_tables || []) { const k = norm(t); if (seen.table.has(k)) errs.push(`table ${t} owned by ${seen.table.get(k)} and ${m.id}`); seen.table.set(k, m.id); }
  for (const e of m.owns_endpoints || []) { const k = ep(e); if (seen.endpoint.has(k)) errs.push(`endpoint ${e} owned by ${seen.endpoint.get(k)} and ${m.id}`); seen.endpoint.set(k, m.id); }
  for (const j of m.owns_jobs || []) { const k = norm(j); if (seen.job.has(k)) errs.push(`job ${j} owned by ${seen.job.get(k)} and ${m.id}`); seen.job.set(k, m.id); }
}
// file ownership: no glob may be a prefix of another owner's glob
const globs = (C.file_ownership || []).map(g => ({ g: g.glob.replace(/\*+$/, ''), o: g.owner }));
for (let i = 0; i < globs.length; i++) for (let j = 0; j < globs.length; j++) if (i !== j && globs[i].o !== globs[j].o && globs[j].g.startsWith(globs[i].g)) errs.push(`file glob overlap: ${globs[i].g} (${globs[i].o}) contains ${globs[j].g} (${globs[j].o})`);
// every inventory item mapped through canonical names or renames
const ren = Object.fromEntries(Object.entries(C.renames || {}).map(([a, b]) => [norm(a), norm(b)]));
const dropped = new Set((C.dropped || []).map(x => norm(x.name || x)));
let unmapped = [];
for (const d of inv) {
  for (const e of d.entities || []) { const k = norm(e.name); if (dropped.has(k)) continue; const c = ren[k] || k; if (!seen.table.has(c)) unmapped.push(`table ${e.name} (${d.id})`); }
  for (const e of d.endpoints || []) { const k = ep(e.method + ' ' + e.path); if (dropped.has(norm(e.method + ' ' + e.path))) continue; const c = (C.endpoint_renames || {})[e.method + ' ' + e.path]; if (!seen.endpoint.has(c ? ep(c) : k)) unmapped.push(`endpoint ${e.method} ${e.path} (${d.id})`); }
  for (const e of d.jobs || []) { const k = norm(e.name); if (dropped.has(k)) continue; const c = ren[k] || k; if (!seen.job.has(c)) unmapped.push(`job ${e.name} (${d.id})`); }
}
if (unmapped.length) errs.push(`${unmapped.length} inventory items not mapped: ` + unmapped.slice(0, 15).join('; '));
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 40).join('\n')); process.exit(1); }
console.log(`OK ${mods.length} modules, ${seen.table.size} tables, ${seen.endpoint.size} endpoints, ${seen.job.size} jobs, ${globs.length} file globs, ${Object.keys(C.renames || {}).length} renames, ${(C.dropped || []).length} dropped`);

// Gate for backend inventory files. Usage: node inv-validate.js D01
// Checks shape, ids, that every anchor exists in plan.html or teknik.html, and that every quote appears in that file's text.
const fs = require('fs'), path = require('path');
const id = process.argv[2];
const REPO = require('path').join(__dirname, '..', '..', 'belgeler').split(require('path').sep).join('/') + '/';
const docs = {};
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) {
  const html = fs.readFileSync(REPO + f, 'utf8');
  docs[f] = {
    ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])),
    text: html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' '),
  };
}
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
let j;
try { j = JSON.parse(fs.readFileSync(path.join(__dirname, 'inv', id + '.json'), 'utf8').replace(/^\uFEFF/, '')); } catch (e) { console.log('INVALID JSON: ' + e.message); process.exit(1); }
const errs = [];
if (/[\u2013\u2014]/.test(JSON.stringify(j))) errs.push('contains U+2013 or U+2014');
if (j.id !== id) errs.push('id mismatch');
const anchorOk = a => { const m = String(a).match(/^(plan|teknik|tasarim)\.html(?:#([\w-]+))?$/); if (!m) return false; return !m[2] || docs[m[1] + '.html'].ids.has(m[2]); };
const quoteOk = (a, q) => { const m = String(a).match(/^(plan|teknik|tasarim)\.html/); if (!m) return false; return docs[m[1] + '.html'].text.includes(norm(q)); };
(j.decided || []).forEach((d, i) => {
  if (!new RegExp(`^${id}-K\\d\\d+$`).test(d.id || '')) errs.push(`decided[${i}].id bad`);
  if (!d.fact) errs.push(`${d.id} fact empty`);
  if (!anchorOk(d.anchor)) errs.push(`${d.id} anchor not found: ${d.anchor}`);
  else if (!d.quote || !quoteOk(d.anchor, d.quote)) errs.push(`${d.id} quote not found in ${String(d.anchor).split('#')[0]}: "${String(d.quote).slice(0, 60)}"`);
  if (d.quote && d.quote.split(/\s+/).length > 30) errs.push(`${d.id} quote longer than 30 words`);
});
if ((j.decided || []).length < 8) errs.push('fewer than 8 decided facts');
(j.gaps || []).forEach((g, i) => { if (!new RegExp(`^${id}-B\\d\\d+$`).test(g.id || '')) errs.push(`gaps[${i}].id bad`); for (const k of ['question', 'why', 'recommendation']) if (!g[k]) errs.push(`${g.id} ${k} empty`); if (typeof g.needs_owner !== 'boolean') errs.push(`${g.id} needs_owner must be boolean`); });
(j.contradictions || []).forEach((c, i) => { if (!c.a || !c.b || !c.note) errs.push(`contradictions[${i}] incomplete`); });
for (const k of ['entities', 'endpoints', 'jobs', 'depends_on']) if (!Array.isArray(j[k])) errs.push(k + ' must be an array');
(j.endpoints || []).forEach((e, i) => { if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(e.method || '')) errs.push(`endpoints[${i}].method bad`); if (!/^\/\S+/.test(e.path || '')) errs.push(`endpoints[${i}].path bad`); });
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 40).join('\n')); process.exit(1); }
console.log(`OK ${j.decided.length} decided, ${(j.gaps || []).length} gaps, ${(j.contradictions || []).length} contradictions, ${j.entities.length} entities, ${j.endpoints.length} endpoints, ${j.jobs.length} jobs`);

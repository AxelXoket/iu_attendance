// Deterministic checks for doc/sections/acik.html. Usage: node acik_check.js [fragment]
const fs = require('fs'), path = require('path');
const D = __dirname;
const file = process.argv[2] || path.join(D, 'doc', 'sections', 'acik.html');
const REPO = 'C:/Users/USER/Desktop/iu_attendance';
const html = fs.readFileSync(file, 'utf8');
const errs = [], info = [];

// 1. format of the opening
const head = '<section id="acik" class="sec">\n<div class="sec-h"><p class="sec-no">{{no}}</p><div><h2>Açık noktalar</h2><p class="lead">';
if (!html.startsWith(head)) errs.push('opening does not match the required heading block');
if (!/<\/section>\s*$/.test(html)) errs.push('does not end with </section>');
const lead = (html.match(/<p class="lead">([\s\S]*?)<\/p>/) || [])[1] || '';
const leadSentences = lead.split(/[.!?](\s|$)/).filter(s => s && s.trim()).length;
info.push(`lead sentences: ${leadSentences}`);
if (leadSentences > 2) errs.push('lead has more than two sentences');

// 2. dashes
for (const m of html.matchAll(/[\u2013\u2014]/g)) errs.push(`dash U+${m[0].charCodeAt(0).toString(16)} at ${m.index}`);

// 3. banned words (text only)
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const noStyle = html.replace(/<style>[\s\S]*?<\/style>/g, '');
const text = noStyle.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
const banned = ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay'];
for (const w of banned) for (const m of html.matchAll(new RegExp(`\\b${w}`, 'gi'))) errs.push(`banned word ${m[0]}`);
for (const p of ["here's the kicker", "here's the thing", 'plot twist', 'let me break this down', 'the bottom line', 'make no mistake']) if (html.toLowerCase().includes(p)) errs.push('banned phrase ' + p);
for (const w of ['KVKK', 'sponsor']) if (new RegExp(w, 'i').test(text)) errs.push('forbidden topic ' + w);

// 4. tag balance (full stack parse, void elements skipped)
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track']);
const stack = [];
for (const m of noStyle.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
  const [, close, tagRaw] = m; const tag = tagRaw.toLowerCase();
  if (VOID.has(tag)) continue;
  if (!close) stack.push(tag);
  else { const top = stack.pop(); if (top !== tag) { errs.push(`tag mismatch: </${tag}> closes <${top}> at ${m.index}`); break; } }
}
if (stack.length) errs.push('unclosed tags: ' + stack.join(','));
const styleCount = (html.match(/<style>/g) || []).length;
if (styleCount !== 1) errs.push(`style blocks: ${styleCount}`);

// 5. anchors: plan.html / teknik.html
const idsOf = f => new Set([...fs.readFileSync(path.join(REPO, f), 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const other = { 'plan.html': idsOf('plan.html'), 'teknik.html': idsOf('teknik.html') };
const docLinks = [...html.matchAll(/href="(plan|teknik)\.html#([^"]+)"/g)];
for (const m of docLinks) if (!other[m[1] + '.html'].has(m[2])) errs.push(`broken ${m[1]}.html#${m[2]}`);
info.push('plan/teknik anchors: ' + [...new Set(docLinks.map(m => `${m[1]}.html#${m[2]}`))].join(', '));
for (const m of html.matchAll(/href="(plan|teknik)\.html"/g)) info.push('bare doc link ' + m[0]);

// 6. internal anchors: own ids, and section ids expected in the built document
const ownIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dup = ownIds.filter((x, i) => ownIds.indexOf(x) !== i); if (dup.length) errs.push('duplicate ids ' + dup);
for (const id of ownIds) if (id !== 'acik' && !id.startsWith('acik-')) errs.push('id without acik- prefix: ' + id);
const specimenIds = new Set([...fs.readFileSync(path.join(D, 'variants', 'A', 'specimen.html'), 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const fragmentIds = new Set(['ozet', 'ilkeler', 'erisilebilirlik', 'platform', 'kutuphaneler', 'acik', 'kaynaklar']); // fix list 6.4
for (const m of html.matchAll(/href="#([^"]+)"/g)) {
  const id = m[1];
  if (ownIds.includes(id)) continue;
  if (specimenIds.has(id)) { info.push(`#${id}: section of direction A`); continue; }
  if (fragmentIds.has(id)) { info.push(`#${id}: fragment section (fix list 6.4)`); continue; }
  errs.push('internal link to unknown id #' + id);
}
for (const id of ownIds) if (specimenIds.has(id)) errs.push(`id ${id} collides with an id in direction A`);

// 7. external links come from the research files
const corpus = [
  ...fs.readdirSync(path.join(D, 'research')).map(f => path.join(D, 'research', f)),
  ...fs.readdirSync(path.join(D, 'lib')).filter(f => f.endsWith('.json')).map(f => path.join(D, 'lib', f)),
  path.join(D, 'digest.md'), path.join(D, 'digest-lib.md'),
].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const ext = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]))];
for (const u of ext) if (!corpus.includes(u)) errs.push('external link not in research files: ' + u);
info.push(`external links (${ext.length}):\n  ` + ext.join('\n  '));

// 8. research ids exist
const rids = [...new Set([...text.matchAll(/\b(R\d\d-[KF]\d\d|L\d-C\d\d)\b/g)].map(m => m[1]))];
const research = {};
for (const f of fs.readdirSync(path.join(D, 'research'))) { const j = JSON.parse(fs.readFileSync(path.join(D, 'research', f), 'utf8')); for (const x of [...j.findings, ...j.recommendations]) research[x.id] = x; }
const libIds = new Set([...fs.readFileSync(path.join(D, 'digest-lib.md'), 'utf8').matchAll(/\b(L\d-C\d\d)\b/g)].map(m => m[1]));
for (const id of rids) if (!(research[id] || libIds.has(id))) errs.push('unknown research id ' + id);
const rfiles = [...new Set([...text.matchAll(/\b(R\d\d)\b(?!-)/g)].map(m => m[1]))];
for (const r of rfiles) { const j = JSON.parse(fs.readFileSync(path.join(D, 'research', r + '.json'), 'utf8')); if (!(j.open_questions || []).length) errs.push(r + ' cited for open questions but has none'); }
info.push(`research ids (${rids.length}): ` + rids.join(' '));

// 9. style rules
const css = style.replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of css.matchAll(/([^{}@]+)\{[^{}]*\}/g)) for (const sel of m[1].split(',')) if (!sel.trim().startsWith('#acik')) errs.push('selector not scoped: ' + sel.trim());
if (/#[0-9a-fA-F]{3,8}\b(?![-\w])/.test(css.replace(/#acik[\w-]*/g, ''))) errs.push('hex color in style');
if (/rgba?\(|hsla?\(|oklch\(/.test(css)) errs.push('raw color function in style');
if (/radius/.test(css)) errs.push('radius in style');
if (/:hover/.test(css)) errs.push('hover rule in style');
for (const v of new Set([...css.matchAll(/var\(--([a-zA-Z0-9-]+)\)/g)].map(m => m[1]))) info.push('css var --' + v);
const tokensCss = fs.readFileSync(path.join(D, 'variants', 'A', 'tokens.css'), 'utf8') + fs.readFileSync(path.join(D, 'variants', 'A', 'src', 'specimen.css'), 'utf8');
for (const v of new Set([...css.matchAll(/var\(--([a-zA-Z0-9-]+)\)/g)].map(m => m[1]))) if (!new RegExp(`--${v}\\s*:`).test(tokensCss)) errs.push('undefined css var --' + v);

// 10. numbering, group counts, cross references
const nums = [...html.matchAll(/<p class="acik-no">(\d+)<\/p>/g)].map(m => +m[1]);
nums.forEach((n, i) => { if (n !== i + 1) errs.push(`item number ${n} at position ${i + 1}`); });
const groups = noStyle.split('<div class="sub">').slice(1).map(g => ({ note: +(g.match(/<p class="note">(\d+) nokta<\/p>/) || [])[1], items: (g.match(/class="acik-item"/g) || []).length }));
groups.forEach((g, i) => { if (g.note !== g.items) errs.push(`group ${i + 1}: note says ${g.note}, items ${g.items}`); });
info.push('groups: ' + JSON.stringify(groups));
const itemIdByNo = {}; for (const m of html.matchAll(/<li class="acik-item" id="([^"]+)"><p class="acik-no">(\d+)<\/p>/g)) itemIdByNo[+m[2]] = m[1];
for (const m of html.matchAll(/<a href="#(acik-[^"]+)">(\d+)\. madde/g)) if (itemIdByNo[+m[2]] !== m[1]) errs.push(`cross reference ${m[2]}. madde points to #${m[1]}, item is #${itemIdByNo[+m[2]]}`);
// every item has the four rows
for (const m of noStyle.matchAll(/<li class="acik-item"[\s\S]*?<\/li>/g)) {
  const dts = [...m[0].matchAll(/<dt>([^<]+)<\/dt>/g)].map(x => x[1]).join('|');
  if (dts !== 'Neden önemli|Öneri|Karar|Kaynak') errs.push('rows wrong in ' + (m[0].match(/id="([^"]+)"/) || [])[1] + ': ' + dts);
  if (!/<h4>[^<]+\?<\/h4>/.test(m[0])) errs.push('item heading is not a question: ' + (m[0].match(/id="([^"]+)"/) || [])[1]);
}

// 11. word count (visible text, without style)
const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
info.push(`words: ${words}`);

console.log(info.join('\n'));
if (errs.length) { console.log(`\nFAIL (${errs.length})\n` + errs.join('\n')); process.exit(1); }
console.log('\nPASS');

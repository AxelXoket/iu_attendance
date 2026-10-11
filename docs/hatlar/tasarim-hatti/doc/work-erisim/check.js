// Gate for the erisilebilirlik.html fragment. Usage: node check.js
// Exit code 1 on any error. Every check is deterministic.
const fs = require('fs');
const path = require('path');
const D = path.resolve(__dirname, '../..');                       // r16/design
const FRAG = process.argv[2] ? path.resolve(process.argv[2]) : path.join(D, 'doc/sections/erisilebilirlik.html');
const REPO = 'C:/Users/USER/Desktop/iu_attendance';
const html = fs.readFileSync(FRAG, 'utf8');
const errs = [], info = [];

// 1. dashes
for (const m of html.matchAll(/[\u2013\u2014]/g)) errs.push('dash U+' + m[0].charCodeAt(0).toString(16) + ' at ' + m.index);

// 2. banned words (visible text, style removed)
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const noStyle = html.replace(/<style>[\s\S]*?<\/style>/, '');
const text = noStyle.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
const banned = ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay'];
for (const w of banned) if (new RegExp('\\b' + w + '\\b', 'i').test(text)) errs.push('banned word ' + w);

// 3. tag balance with a stack (void and self-closed tags skipped)
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'col', 'source', 'wbr']);
const stack = [];
const body = noStyle.replace(/<!--[\s\S]*?-->/g, '');
for (const m of body.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
  const tag = m[1].toLowerCase(), closing = m[0][1] === '/', selfClose = m[2] === '/';
  if (VOID.has(tag) || selfClose) continue;
  if (!closing) stack.push([tag, m.index]);
  else {
    const top = stack.pop();
    if (!top || top[0] !== tag) { errs.push(`tag mismatch: </${tag}> at ${m.index}, open ${top ? top[0] + '@' + top[1] : 'none'}`); break; }
  }
}
if (stack.length) errs.push('unclosed: ' + stack.map(s => s[0] + '@' + s[1]).join(', '));
if (!/^<section id="erisilebilirlik" class="sec">\s*<div class="sec-h"><p class="sec-no">\{\{no\}\}<\/p><div><h2>Erişilebilirlik<\/h2><p class="lead">/.test(html)) errs.push('fragment does not start with the required section and heading block');
if (!/<\/section>\s*$/.test(html)) errs.push('fragment does not end with </section>');
if ((html.match(/\{\{no\}\}/g) || []).length !== 1) errs.push('{{no}} must appear exactly once');
if ((html.match(/<style>/g) || []).length !== 1) errs.push('exactly one <style> block expected');

// 4. plan.html and teknik.html anchors
const idsOf = f => new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const repoIds = { 'plan.html': idsOf(path.join(REPO, 'plan.html')), 'teknik.html': idsOf(path.join(REPO, 'teknik.html')) };
const docLinks = [];
for (const m of html.matchAll(/href="(plan|teknik)\.html#([^"]+)"/g)) {
  docLinks.push(m[1] + '.html#' + m[2]);
  if (!repoIds[m[1] + '.html'].has(m[2])) errs.push('broken ' + m[1] + '.html#' + m[2]);
}

// 5. in-page anchors: specimen A sections, sibling fragments mandated by the fix list, own ids
const pageIds = idsOf(path.join(D, 'variants/A/specimen.html'));
for (const f of fs.readdirSync(path.join(D, 'doc/sections'))) for (const id of idsOf(path.join(D, 'doc/sections', f))) pageIds.add(id);
const inPage = [];
for (const m of html.matchAll(/href="#([^"]+)"/g)) { inPage.push('#' + m[1]); if (!pageIds.has(m[1])) errs.push('broken #' + m[1]); }

// 6. duplicate ids against the specimen and the other fragments
const own = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const others = idsOf(path.join(D, 'variants/A/specimen.html'));
for (const f of fs.readdirSync(path.join(D, 'doc/sections'))) if (f !== 'erisilebilirlik.html') for (const id of idsOf(path.join(D, 'doc/sections', f))) others.add(id);
for (const id of own) if (others.has(id)) errs.push('duplicate id ' + id);
if (new Set(own).size !== own.length) errs.push('duplicate id inside fragment');

// 7. research and library ids exist
const known = new Set();
for (const dir of ['research', 'lib']) for (const f of fs.readdirSync(path.join(D, dir)).filter(f => /^(R\d\d|L\d)\.json$/.test(f))) {
  for (const m of fs.readFileSync(path.join(D, dir, f), 'utf8').matchAll(/"id":\s*"((?:R\d\d-[KF]|L\d-C)\d+)"/g)) known.add(m[1]);
}
const cited = [...new Set([...text.matchAll(/\b((?:R\d\d-[KF]|L\d-C)\d+)\b/g)].map(m => m[1]))];
for (const id of cited) if (!known.has(id)) errs.push('unknown research id ' + id);

// 8. external links come from the research files
const researchUrls = new Set();
for (const dir of ['research', 'lib']) for (const f of fs.readdirSync(path.join(D, dir)).filter(f => /\.json$/.test(f))) {
  for (const m of fs.readFileSync(path.join(D, dir, f), 'utf8').matchAll(/https?:\/\/[^"\s]+/g)) researchUrls.add(m[0].replace(/\\\//g, '/'));
}
const ext = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
for (const u of ext) if (!researchUrls.has(u)) errs.push('external link not in research files: ' + u);

// 9. CSS rules of the style block
const rules = style.replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of rules.matchAll(/([^{}@]+)\{[^{}]*\}/g)) {
  const sels = m[1].trim().split(',').map(s => s.trim()).filter(Boolean);
  for (const s of sels) if (!s.startsWith('#erisilebilirlik')) errs.push('selector outside #erisilebilirlik: ' + s);
}
if (/#[0-9a-fA-F]{3,8}\b/.test(rules.replace(/#erisilebilirlik\b/g, ''))) errs.push('hex color in style block');
if (/rgba?\(|hsla?\(|oklch\(/.test(rules)) errs.push('raw color function in style block');
if (/radius/.test(rules)) errs.push('radius in style block');
// every :hover must sit inside an @media (hover: hover) and (pointer: fine) block (brace-balanced removal)
{
  let rest = rules, i;
  while ((i = rest.indexOf('@media (hover: hover) and (pointer: fine)')) >= 0) {
    let j = rest.indexOf('{', i), depth = 0, k = j;
    for (; k < rest.length; k++) { if (rest[k] === '{') depth++; else if (rest[k] === '}' && --depth === 0) break; }
    rest = rest.slice(0, i) + rest.slice(k + 1);
  }
  if (/:hover/.test(rest)) errs.push('hover outside the pointer media query');
}
const vars = [...new Set([...rules.matchAll(/var\(--([a-zA-Z0-9-]+)\)/g)].map(m => m[1]))];
const tokensCss = fs.readFileSync(path.join(D, 'variants/A/tokens.css'), 'utf8') + fs.readFileSync(path.join(D, 'variants/A/src/specimen.css'), 'utf8');
const localVars = new Set([...rules.matchAll(/--([a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]));
for (const v of vars) if (!localVars.has(v) && !new RegExp('--' + v.replace(/[-]/g, '\\-') + '\\s*:').test(tokensCss)) errs.push('unknown variable --' + v);

// 10. inline icon paths are exact Material Symbols Sharp paths from icons.json
const icons = JSON.parse(fs.readFileSync(path.join(D, 'variants/A/icons.json'), 'utf8'));
const allPaths = new Map(); for (const [n, v] of Object.entries(icons)) for (const [k, d] of Object.entries(v)) allPaths.set(d, n + '.' + k);
for (const m of html.matchAll(/<path d="([^"]+)"/g)) { if (!allPaths.has(m[1])) errs.push('icon path not from icons.json: ' + m[1].slice(0, 40)); else info.push('icon ' + allPaths.get(m[1])); }

// 11. word count of visible text (code included)
const words = text.split(/\s+/).filter(Boolean).length;

console.log('words: ' + words);
console.log('plan/teknik links: ' + [...new Set(docLinks)].join(' '));
console.log('in-page links: ' + [...new Set(inPage)].join(' '));
console.log('research ids (' + cited.length + '): ' + cited.join(' '));
console.log('external links (' + ext.length + '):\n  ' + ext.join('\n  '));
console.log('css variables: ' + vars.join(' '));
console.log(info.join(', '));
if (errs.length) { console.log('FAIL (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }
console.log('PASS');

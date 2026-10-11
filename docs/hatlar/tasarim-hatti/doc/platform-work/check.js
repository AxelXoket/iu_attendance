// Gate for doc/sections/platform.html. Every check is deterministic; exit code 1 on any failure.
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const here = __dirname;
const design = path.join(here, '..', '..');
const REPO = 'C:\\Users\\USER\\Desktop\\iu_attendance';
const fileArg = process.argv.indexOf('--file');
const file = fileArg > 0 ? path.resolve(process.argv[fileArg + 1]) : path.join(here, '..', 'sections', 'platform.html');
const html = fs.readFileSync(file, 'utf8');
const errs = [], info = [];
const fail = m => errs.push(m);

// 1. dashes
for (const m of html.matchAll(/[\u2013\u2014]/g)) fail(`dash U+${m[0].charCodeAt(0).toString(16)} at ${m.index}`);

// 2. frame
const head = '<section id="platform" class="sec">\n<div class="sec-h"><p class="sec-no">{{no}}</p><div><h2>Platformlar</h2><p class="lead">';
if (!html.startsWith(head)) fail('fragment does not start with the required section and heading block');
if (!/<\/p><\/div><\/div>\n<style>/.test(html.slice(0, 900))) fail('heading block is not closed right before the style block');
if (!html.trimEnd().endsWith('</section>')) fail('fragment does not end with </section>');
if ((html.match(/\{\{/g) || []).length !== 1) fail('only {{no}} may use double braces');
const lead = html.slice(head.length, html.indexOf('</p>', head.length));
const leadSentences = lead.split(/(?<=[.!?])\s+/).filter(Boolean).length;
if (leadSentences < 1 || leadSentences > 2) fail(`lead has ${leadSentences} sentences`);

// 3. style block rules
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
if (styles.length !== 1) fail(`expected one <style> block, found ${styles.length}`);
const css = (styles[0] || '').replace(/\/\*[\s\S]*?\*\//g, '');
const flat = css.replace(/@media[^{]+\{/g, '{');
for (const m of flat.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
  const sels = m[1].split(',').map(s => s.trim()).filter(Boolean);
  for (const s of sels) if (!s.startsWith('#platform')) fail(`selector not scoped to #platform: ${s}`);
}
const decls = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).join(';');
for (const m of decls.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\(/g)) fail(`raw color in CSS: ${m[0]}`);
for (const m of decls.matchAll(/(?:^|[;\s])(?:color|background|background-color|border(?:-[a-z]+)?|box-shadow|outline)\s*:\s*([^;]+)/g)) {
  const val = m[1];
  const named = val.match(/\b(red|blue|green|yellow|orange|gold|lime|olive|teal|cyan|purple|pink|white|black|gray|grey|navy|maroon|aqua|fuchsia|silver)\b/i);
  if (named) fail(`named color in CSS: ${named[0]}`);
}
for (const m of decls.matchAll(/border(?:-[a-z]+)*-radius\s*:\s*([^;]+)/g)) if (!/^\s*0(px)?\s*$/.test(m[1])) fail(`radius not 0: ${m[0]}`);
if (/:hover/.test(css)) {
  const ok = [...css.matchAll(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{([\s\S]*?\})\s*\}/g)].map(m => m[1]).join('');
  if ((css.match(/:hover/g) || []).length !== (ok.match(/:hover/g) || []).length) fail(':hover outside the pointer media query');
}
const usedVars = [...new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map(m => m[1]))];
const tokensCss = fs.readFileSync(path.join(design, 'variants', 'A', 'tokens.css'), 'utf8');
const specCss = fs.readFileSync(path.join(design, 'variants', 'A', 'src', 'specimen.css'), 'utf8');
for (const v of usedVars) if (!tokensCss.includes(v + ':') && !specCss.includes(v + ':')) fail(`unknown CSS variable ${v}`);
info.push('css variables: ' + usedVars.join(' '));

// 4. plan.html and teknik.html anchors
for (const doc of ['plan.html', 'teknik.html']) {
  const ids = new Set([...fs.readFileSync(path.join(REPO, doc), 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const used = [...html.matchAll(new RegExp(`href="${doc.replace('.', '\\.')}#([^"]*)"`, 'g'))].map(m => m[1]);
  for (const id of used) if (!ids.has(id)) fail(`broken link ${doc}#${id}`);
  info.push(`${doc} anchors: ${[...new Set(used)].join(', ')}`);
  for (const m of html.matchAll(new RegExp(`href="${doc.replace('.', '\\.')}"`, 'g'))) fail(`${doc} link without anchor`);
}

// 5. internal anchors: specimen sections, planned fragment sections (fixlist 6.4) and our own ids
const spec = fs.readFileSync(path.join(design, 'variants', 'A', 'specimen.html'), 'utf8');
const specSections = new Set([...spec.matchAll(/<section id="([^"]+)" class="sec">/g)].map(m => m[1]));
const planned = ['ozet', 'ilkeler', 'erisilebilirlik', 'platform', 'kutuphaneler', 'acik', 'kaynaklar'];
const own = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const internal = [...new Set([...html.matchAll(/href="#([^"]*)"/g)].map(m => m[1]))];
for (const id of internal) if (!(specSections.has(id) || planned.includes(id) || own.has(id))) fail(`internal link #${id} has no target section`);
info.push('internal anchors: ' + internal.join(', '));

// 6. tag balance
const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
for (const t of ['section', 'div', 'p', 'span', 'a', 'h2', 'h3', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'b', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'style']) {
  const open = (html.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'g')) || []).length;
  const close = (html.match(new RegExp(`</${t}>`, 'g')) || []).length;
  if (open !== close) fail(`<${t}> open ${open} vs close ${close}`);
}
// nesting check with a stack (void elements excluded)
{
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, close, tag] = m; const t = tag.toLowerCase();
    if (['br', 'img', 'hr', 'meta', 'link', 'input', 'wbr'].includes(t)) continue;
    if (!close) stack.push(t);
    else { const top = stack.pop(); if (top !== t) { fail(`nesting error: </${t}> closes <${top}> near ${m.index}`); break; } }
  }
  if (stack.length) fail('unclosed tags: ' + stack.join(','));
}
if (/<p[^>]*>[^]*?<(div|ul|ol|dl|table|p)\b/.test('')) {}

// 7. ids
const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
if (new Set(allIds).size !== allIds.length) fail('duplicate id in fragment');
const specIds = new Set([...spec.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const id of allIds) if (id !== 'platform' && specIds.has(id)) fail(`id ${id} collides with the specimen`);

// 8. banned words and phrases (visible text)
const text = body.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
for (const w of ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay'])
  if (new RegExp(`\\b${w}\\b`, 'i').test(text)) fail(`banned word ${w}`);
for (const p of ['KVKK', 'sponsor', 'zaman çizelgesi', 'takvim'])
  if (text.toLowerCase().includes(p.toLowerCase())) fail(`off-limits topic: ${p}`);

// 9. external links come from the research and library files
const urlSet = new Set();
for (const dir of ['research', 'lib']) for (const f of fs.readdirSync(path.join(design, dir)).filter(f => f.endsWith('.json')))
  for (const m of fs.readFileSync(path.join(design, dir, f), 'utf8').matchAll(/https?:\/\/[^"\s)]+/g)) urlSet.add(m[0].replace(/\\$/, ''));
const ext = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
for (const u of ext) if (!urlSet.has(u)) fail(`external link not in research sources: ${u}`);
for (const m of html.matchAll(/<a href="https?:[^"]+"(?![^>]*rel="noopener")[^>]*>/g)) fail(`external link without rel=noopener: ${m[0].slice(0, 80)}`);
info.push(`external links: ${ext.length} (${new Set(ext).size} distinct)`);

// 10. table equals generator output
const table = execFileSync(process.execPath, [path.join(here, 'pe.js')], { encoding: 'utf8' }).trimEnd();
if (!html.includes(table)) fail('progressive enhancement table differs from pe.js output');

// 11. numbers in prose match web-features
const wf = require(path.join(design, 'f16', 'wf', 'package', 'data.json')).features;
const s = id => wf[id].status.support;
const expectProse = [
  [`oklch() ve color-mix() Chrome ${s('oklab').chrome}'de`, s('oklab').chrome === s('color-mix').chrome],
];
for (const [phrase, cond] of expectProse) { if (!cond) fail('oklch and color-mix differ in Chrome version'); if (!text.includes(phrase)) fail(`prose does not match data: "${phrase}"`); }

// 12. cited research ids exist
const known = new Set();
for (const f of fs.readdirSync(path.join(design, 'research')).filter(f => /^R\d+\.json$/.test(f))) {
  const r = require(path.join(design, 'research', f));
  for (const x of [...(r.findings || []), ...(r.recommendations || [])]) known.add(x.id);
}
for (const f of ['L1', 'L2', 'L3', 'L4', 'L5']) for (const c of require(path.join(design, 'lib', f + '.json')).candidates) known.add(c.id);
const cited = [...new Set([...html.matchAll(/<code>([RL]\d{1,2}-[KFC]\d{2})<\/code>/g)].map(m => m[1]))];
const citedText = [...new Set([...text.matchAll(/\b([RL]\d{1,2}-[KFC]\d{2})\b/g)].map(m => m[1]))];
for (const id of new Set([...cited, ...citedText])) if (!known.has(id)) fail(`unknown research id ${id}`);
info.push(`research ids: ${cited.length} distinct chips; ${[...new Set([...cited, ...citedText])].sort().join(' ')}`);

// 13. fix list values (2.1): hover 120/100 ms, press 0.97 at 100 ms; the old 70 ms and 0,98 must not appear
for (const old of ['70 ms', '0,98', '0.98', '110 ms']) if (text.includes(old)) fail(`stale motion value "${old}" (fix list 2.1)`);
for (const need of ['120 ms', '100 ms', '0,97']) if (!text.includes(need)) fail(`fix list value "${need}" missing`);
for (const hex of ['#3A3CA2', '#653749']) if (html.toUpperCase().includes(hex)) fail(`quotes a value the fix agent owns: ${hex}`);
if (/Görevli/.test(text)) fail('mentions Görevli (fix agent owns its ink)');

// 14. every decision row cites at least one source
for (const m of html.matchAll(/<div class="pf-row"><dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g))
  if (!/<code>[RL]\d{1,2}-[KFC]\d{2}<\/code>/.test(m[2]) && !/href="https?:/.test(m[2])) fail(`row "${m[1]}" has no source`);

// 15. words
const words = text.trim().split(/\s+/).filter(Boolean).length;
info.push(`visible words: ${words}`);
info.push(`bytes: ${html.length}`);

console.log(info.join('\n'));
if (errs.length) { console.log(`FAIL (${errs.length})\n` + errs.join('\n')); process.exit(1); }
console.log('PASS');

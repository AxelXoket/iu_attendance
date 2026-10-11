// Static checks on the page stylesheet (src/css/*.css, merged in @order sequence) for the task's motion rules (read-only):
// 1. every :hover selector sits inside @media (hover: hover) and (pointer: fine)
// 2. no transition or animation targets a layout property (width, height, top, left, right, bottom, margin, padding,
//    grid-template-*), with one named exception: the accordion body (.det), whose grid-template-rows opens and closes
//    it (decisions-r2 E10; Hareket, Kurallar 01)
// 3. every @keyframes block only changes transform, opacity or stroke-dashoffset; the focus ring's keyframes (ringIn) may
//    also change outline-color and outline-offset (Etkileşim tablosu, odak: the ring appears in dur.mikro)
// 4. every focus outline is at least 2 px; an outline that reads a variable is checked against the variable's value in
//    the block tools/build.js generates from tokens.json
const css = require('./lib/sources').pageCss().replace(/\/\*[\s\S]*?\*\//g, '');
const { tokenCss } = require('./lib/gencss');
const VARS = Object.fromEntries([...(require('fs').readFileSync(require('path').join(__dirname, '..', 'tokens.css'), 'utf8').split('@media')[0] + tokenCss().split('@media')[0]).matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const errs = [];
const blocks = [];
function parse(text, ctx) {
  let depth = 0, start = 0, head = '';
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '{') { if (depth === 0) { head = text.slice(start, k).trim(); start = k + 1; } depth++; }
    else if (text[k] === '}') { depth--; if (depth === 0) { const body = text.slice(start, k); if (head.startsWith('@media') || head.startsWith('@supports')) parse(body, ctx.concat(head)); else blocks.push({ head, body, ctx }); start = k + 1; } }
  }
}
parse(css, []);
const LAYOUT = /\b(width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*|grid-template-[\w]+|inset|font-size|line-height)\b/;
// The accordion body: the only rule allowed to transition grid-template-rows.
const GRID_OK = head => head.split(',').every(s => /(^|\s|>)\.det$/.test(s.trim()));
let gridAllowed = 0;
for (const b of blocks) {
  if (b.head.includes(':hover') && !b.ctx.some(c => /hover:\s*hover/.test(c) && /pointer:\s*fine/.test(c))) errs.push('hover outside pointer media: ' + b.head.slice(0, 80));
  const tp = b.body.match(/transition(?:-property)?\s*:\s*([^;]+)/g) || [];
  for (const t of tp) {
    const v = t.replace(/^transition(?:-property)?\s*:\s*/, '');
    for (const part of v.split(/,(?![^(]*\))/)) {
      const prop = part.trim().split(/\s+/)[0];
      if (prop === 'grid-template-rows' && GRID_OK(b.head)) { gridAllowed++; continue; }
      if (LAYOUT.test(prop)) errs.push('layout transition "' + prop + '" in ' + b.head.slice(0, 60));
    }
  }
  if (b.head.startsWith('@keyframes')) {
    const allowed = ['transform', 'opacity', 'stroke-dashoffset'].concat(/^@keyframes\s+ringIn$/.test(b.head) ? ['outline-color', 'outline-offset'] : []);
    for (const m of b.body.matchAll(/([a-z-]+)\s*:/g)) if (!allowed.includes(m[1])) errs.push('keyframes ' + b.head + ' animates ' + m[1]);
  }
  for (const m of b.body.matchAll(/(?:^|[;\s])outline\s*:\s*([^;]+)/g)) {
    const w = m[1].trim().split(/\s+/)[0];
    const v = /^var\(--([\w-]+)\)$/.test(w) ? VARS[w.slice(6, -1)] : w;
    if (v === undefined) { errs.push('outline width ' + w + ' does not resolve in ' + b.head.slice(0, 60)); continue; }
    if (/^\d/.test(v) && parseFloat(v) < 2) errs.push('outline under 2px (' + w + ') in ' + b.head.slice(0, 60));
  }
}
if (!gridAllowed) errs.push('the accordion body (.det) no longer transitions grid-template-rows (decisions-r2 E10)');
console.log(blocks.length + ' rules checked');
if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); }
console.log('PASS: hover only on pointer devices, no layout transitions (the accordion body\'s grid-template-rows excepted), keyframes use transform/opacity/stroke-dashoffset (the focus ring also outline-color and outline-offset), focus outlines 2 px');

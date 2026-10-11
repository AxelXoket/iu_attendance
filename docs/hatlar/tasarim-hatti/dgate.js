// Gate for tasarim.html (and the research file). Usage: node dgate.js <file.html> [--repo <dir with plan.html, teknik.html>] [--allow-radius "<selector words>"]
// Checks: no en or em dash, no banned words, lang and title, balanced tags, unique ids, every #link and plan/teknik link resolves,
// no external stylesheet, script, font or image dependency, border-radius at most 2px outside allowed illustration selectors.
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const file = argv[0];
const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const repo = opt('--repo');
const allowRadius = (opt('--allow-radius') || 'device,phone,frame,notch,island,swatch-dot,avatar').split(',');
const html = fs.readFileSync(file, 'utf8');
const errs = [], warns = [];
const lineOf = idx => html.slice(0, idx).split('\n').length;

for (const m of html.matchAll(/[–—]/g)) errs.push(`dash U+${m[0].charCodeAt(0).toString(16)} at line ${lineOf(m.index)}`);
const text = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
for (const w of ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced', 'multifaceted', 'furthermore', 'moreover', 'pivotal', 'landscape', 'tapestry', 'underscore', 'foster', 'showcase', 'intricate', 'vibrant', 'fundamental', 'significant', 'interplay'])
  for (const m of text.matchAll(new RegExp(`\\b${w}\\b`, 'gi'))) warns.push(`banned word "${m[0]}"`);
if (!/<html[^>]*\blang="tr"/.test(html) && !/^\s*<title>/.test(html)) warns.push('no <html lang="tr"> (fine if the skeleton adds it)');
if (!/<title>[^<]+<\/title>/.test(html)) errs.push('missing <title>');

// tag balance for common container tags (outside script and style)
const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
for (const t of ['section', 'div', 'nav', 'header', 'footer', 'main', 'table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'details', 'summary', 'figure', 'button', 'a', 'p', 'span', 'h2', 'h3', 'svg', 'dialog', 'label', 'code', 'strong', 'em']) {
  const open = (body.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'g')) || []).length;
  const close = (body.match(new RegExp(`</${t}>`, 'g')) || []).length;
  if (open !== close) errs.push(`<${t}> open ${open} vs close ${close}`);
}
// ids and links
const ids = new Map();
for (const m of body.matchAll(/\sid="([^"]+)"/g)) { if (ids.has(m[1])) errs.push(`duplicate id "${m[1]}"`); ids.set(m[1], true); }
for (const m of body.matchAll(/href="#([^"]*)"/g)) if (m[1] && !ids.has(m[1])) errs.push(`broken link #${m[1]}`);
if (repo) {
  for (const doc of ['plan.html', 'teknik.html']) {
    const p = path.join(repo, doc);
    if (!fs.existsSync(p)) continue;
    const other = new Set([...fs.readFileSync(p, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of body.matchAll(new RegExp(`href="${doc.replace('.', '\\.')}#([^"]+)"`, 'g'))) if (!other.has(m[1])) errs.push(`broken link ${doc}#${m[1]}`);
  }
}
// external dependencies
for (const m of html.matchAll(/<(link|script|img|iframe|source|video|audio)\b[^>]*\b(href|src)="(https?:)?\/\/[^"]+"/g)) errs.push(`external ${m[1]} dependency: ${m[0].slice(0, 120)}`);
for (const m of html.matchAll(/url\(\s*["']?(https?:)?\/\/[^)]+\)/g)) errs.push(`external url() in CSS: ${m[0].slice(0, 100)}`);
for (const m of html.matchAll(/@import\s+[^;]+;/g)) errs.push(`@import: ${m[0].slice(0, 100)}`);
// radius audit over CSS rules
const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim(), decl = m[2];
  for (const r of decl.matchAll(/border(-[a-z]+)*-radius\s*:\s*([^;]+)/g)) {
    const vals = r[2].split(/[\s/]+/).filter(Boolean);
    const big = vals.some(v => /%$/.test(v) ? parseFloat(v) > 0 : (/^var\(/.test(v) ? false : parseFloat(v) > 2));
    if (big && !allowRadius.some(a => sel.includes(a))) errs.push(`radius above 2px: "${sel.slice(0, 80)}" { ${r[0].trim()} }`);
  }
}
// Owner lock (6 October 2026): no yellow or green anywhere, in CSS, inline styles or SVG.
{
  const C = require('./color.js');
  const toHex = (r, g, b) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const banned = new Map();
  const check = (hex, raw) => { const o = C.hexToOklch(hex); if (o.C > 0.02 && o.H > 35 && o.H < 220) banned.set(raw, `oklch(${o.L} ${o.C} ${o.H})`); };
  // Only colors that are actually painted: <style> blocks, style="" attributes, SVG paint attributes, and inline scripts that set styles.
  const painted = [
    ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]),
    ...[...html.matchAll(/\sstyle="([^"]*)"/g)].map(m => m[1]),
    ...[...html.matchAll(/\s(fill|stroke|stop-color|flood-color|lighting-color|color)="([^"]*)"/g)].map(m => `${m[1]}:${m[2]}`),
    ...[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]),
  ].join('\n');
  const src = painted.replace(/data:[^"')]+/g, '');
  for (const m of src.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) check('#' + (m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]), m[0]);
  for (const m of src.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) check(toHex(+m[1], +m[2], +m[3]), m[0]);
  for (const m of src.matchAll(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/g)) { const L = m[2] ? +m[1] / 100 : +m[1]; check(C.oklchToHex(L, +m[3], +m[4]).hex, m[0]); }
  const named = /(?:color|background|background-color|fill|stroke|border(?:-[a-z]+)?|outline|box-shadow)\s*[:=]\s*["']?[^;"'}]*\b(yellow|gold|green|lime|olive|teal|khaki|chartreuse|lawngreen|greenyellow|yellowgreen|seagreen|forestgreen|darkgreen|springgreen|palegreen|lightgreen|olivedrab|goldenrod|lightyellow|lemonchiffon|palegoldenrod|cornsilk|beige|ivory|orange|darkorange|moccasin|wheat|aquamarine|turquoise|mediumaquamarine|darkseagreen|lightseagreen|mediumseagreen|mediumspringgreen|darkkhaki|darkolivegreen|cream)\b/gi;
  for (const m of src.matchAll(named)) banned.set(m[1], 'named color');
  for (const [raw, why] of banned) errs.push(`LOCK: banned yellow or green color ${raw} (${why})`);
}
const words = text.split(/\s+/).filter(Boolean).length;
warns.forEach(w => console.log('warn: ' + w));
if (errs.length) { console.log(`FAIL (${errs.length}):\n` + errs.slice(0, 80).join('\n')); process.exit(1); }
console.log(`PASS: ${Math.round(html.length / 1024)} KB, ${words} words, ${ids.size} ids`);

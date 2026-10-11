const fs = require('fs');
const f = 'build-frag.js';
let s = fs.readFileSync(f, 'utf8');
const a = s.indexOf('function rich(s) {');
const b = s.indexOf('\n}\n', a);
if (a < 0 || b < 0) throw new Error('rich() not found');
const body = String.raw`function rich(s) {
  const links = [], spans = [];
  const SPAN = '\u0001', LINK = '\u0002';
  let t = String(s).replace(/${'`'}([^${'`'}]+)${'`'}/g, (m, x) => { spans.push(x); return SPAN + (spans.length - 1) + SPAN; });
  t = t.replace(/\b(plan|teknik|tasarim)\.html#([a-z0-9-]+)/g, (m) => { links.push(m); return LINK + (links.length - 1) + LINK; });
  t = esc(t);
  t = t.replace(/\b(?:apps|packages|d10spec)\/[A-Za-z0-9_./&;*-]+/g, m => '<code>' + m + '</code>');
  t = t.replace(/(^|[^\w/>])([a-z][a-z0-9]*(?:_[a-z0-9]+)+)(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(/(^|[^\w/>])([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(/(^|[^\w/>.-])([A-Za-z][\w-]*\.(?:ts|js|json|feature))(?![\w<])/g, (m, p, x) => p + '<code>' + x + '</code>');
  t = t.replace(new RegExp(SPAN + '(\d+)' + SPAN, 'g'), (m, i) => '<code>' + esc(spans[+i]) + '</code>');
  t = t.replace(new RegExp(LINK + '(\d+)' + LINK, 'g'), (m, i) => { const href = links[+i]; return '<a href="' + href + '">' + esc(LABEL[href] || href) + '</a>'; });
  if (/[\u0000-\u0008]/.test(t)) throw new Error('placeholder left in: ' + t.slice(0, 80));
  return t;`;
s = s.slice(0, a) + body + s.slice(b);
fs.writeFileSync(f, s);
// sanity: no raw control characters remain in the builder source
const ctrl = (s.match(/[\u0000-\u0008]/g) || []).length;
console.log('rich() rewritten; raw control chars in source:', ctrl);

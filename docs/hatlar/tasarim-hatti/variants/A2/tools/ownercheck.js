// Checks the ownership split of the page sources against the built page (read-only). OWNERS.md says which sections
// each owner holds. A rule in an owner's own stylesheet (src/css/system.css, src/css/screens.css) may only match
// inside that owner's sections, and so may the elements that the owner's own script (src/js/system.js,
// src/js/screens.js) looks up; a keyframe defined there may only be used there. Anything the page itself, a fragment's
// neighbourhood or the other owner's sections also need belongs in base.css or base.js (owner F1a). So an edit to an
// owner's own files can only change that owner's sections. Section fragments are ignored: other authors write them.
// A selector matches a section when every class, id and attribute it names occurs in that section's markup; classes
// that the page script adds at run time count for the sections its file serves (base.js: every region).
// Run after the build: node tools/ownercheck.js [--file <html>]
const fs = require('fs'), path = require('path');
const { SETS, chunksOf } = require('./lib/sources');
const owners = require('./lib/owners');
const A = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const fileArg = argv.indexOf('--file');
const FILE = fileArg < 0 ? path.join(A, 'tasarim.html') : path.resolve(argv[fileArg + 1]);

// ---- owners and their sections (OWNERS.md) ----
const OWNERS = owners.readOwners(A);
const ownerOf = f => owners.ownerOf(OWNERS, f);
const sectionsOf = o => owners.sectionsOf(OWNERS, o);

// ---- regions of the built page: header (ust), footer, each own section, and the page itself; fragments dropped ----
function regionsOf(html) {
  let page = html.slice(html.indexOf('<body>'), html.indexOf('<script>window.QR_CODES'));
  page = page.replace(/<svg class="vh" aria-hidden="true" focusable="false"><defs>[\s\S]*?<\/defs><\/svg>/, '');
  const out = [];
  const cut = (re, name) => { const m = page.match(re); if (m) { out.push([name, m[0]]); page = page.replace(m[0], ''); } };
  cut(/<header class="cover" id="ust">[\s\S]*?<\/header>/, 'ust');
  cut(/<footer class="foot">[\s\S]*?<\/footer>/, 'footer');
  for (;;) {
    const i = page.indexOf('<section');
    if (i < 0) break;
    const re = /<section\b|<\/section>/g; re.lastIndex = i;
    let m, depth = 0, end = page.length;
    while ((m = re.exec(page))) { if (m[0] === '</section>') { if (!--depth) { end = m.index + 10; break; } } else depth++; }
    const s = page.slice(i, end), id = (/^<section[^>]*\sid="([^"]+)"/.exec(s) || [])[1];
    if (!/^<section[^>]*class="[^"]*\bfrag\b/.test(s)) out.push([id, s]);
    page = page.slice(0, i) + page.slice(end);
  }
  out.push(['page', page]);
  return out;
}
const html = fs.readFileSync(FILE, 'utf8');
const REGIONS = regionsOf(html);
const ALL = REGIONS.map(([n]) => n);
const index = new Map(); // token (.class, #id, [attr, tag) -> Set(region)
const add = (t, r) => { if (!index.has(t)) index.set(t, new Set()); index.get(t).add(r); };
for (const [name, h] of REGIONS) {
  for (const m of h.matchAll(/<([a-z][a-z0-9-]*)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*\/?>/g)) {
    add(m[1], name);
    for (const a of m[2].matchAll(/\s([^\s=>]+)(?:="([^"]*)")?/g)) {
      add('[' + a[1], name);
      if (a[1] === 'class') (a[2] || '').split(/\s+/).filter(Boolean).forEach(c => add('.' + c, name));
      if (a[1] === 'id') add('#' + a[2], name);
    }
  }
}

// ---- sources ----
const srcFiles = kind => SETS[kind].map(f => ({ f, chunks: chunksOf(f, fs.readFileSync(path.join(A, f), 'utf8')) }));
const CSS = srcFiles('css'), JS = srcFiles('js');
const isBase = f => /\/base\.(css|js)$/.test(f);
const unowned = [...SETS.css, ...SETS.js].filter(f => !ownerOf(f));
if (unowned.length) { console.log('FAIL\nno owner in OWNERS.md for: ' + unowned.join(', ')); process.exit(1); }
// String literals of a script, skipping comments and regex literals (enough for the page script's plain syntax).
function strings(src) {
  const out = [];
  let i = 0, last = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i) + 2; continue; }
    if (c === "'" || c === '"') { let s = ''; i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; } s += src[i++]; } i++; out.push(s); last = c; continue; }
    if (c === '/' && (last === '' || '(,=:!&|?{};['.includes(last))) {
      i++; let cls = false;
      while (i < src.length) { const e = src[i]; if (e === '\\') { i += 2; continue; } if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break; i++; }
      i++; last = '/'; continue;
    }
    if (!/\s/.test(c)) last = c;
    i++;
  }
  return out;
}
// Classes the page script adds at run time: words of its string literals that name a class of the stylesheet. base.js
// is page-level code, so its classes count everywhere; a class from system.js or screens.js counts for its owner's
// sections only when the markup has no such class (otherwise the markup already says where it lives).
const cssClasses = new Set();
for (const { chunks } of CSS) for (const c of chunks) for (const m of c.text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)) cssClasses.add(m[1]);
const inMarkup = new Set([...index.keys()].filter(t => t[0] === '.'));
for (const { f, chunks } of JS) {
  const regs = isBase(f) ? ALL : sectionsOf(ownerOf(f));
  for (const c of chunks) for (const str of strings(c.text)) {
    const words = /^\s*[a-z][\w-]*(\s+[a-z][\w-]*)*\s*$/.test(str) ? str.trim().split(/\s+/) : [...str.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/));
    for (const w of words) if (cssClasses.has(w) && (isBase(f) || !inMarkup.has('.' + w))) regs.forEach(r => add('.' + w, r));
  }
}

// ---- where a selector can match ----
const splitList = s => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
function selRegions(sel) {
  const s = sel.replace(/:where\([^)]*\)/g, ' ').replace(/::?[\w-]+(\([^)]*\))?/g, ' ');
  const toks = [];
  for (const m of s.matchAll(/([.#][a-zA-Z_][\w-]*)|\[([\w-]+)[^\]]*\]|(^|[\s>+~(])([a-z][a-z0-9]*)(?=[.#[\s>+~:)]|$)/g)) toks.push(m[1] || (m[2] ? '[' + m[2] : m[4]));
  if (!toks.length) return new Set(ALL);
  let set = null;
  for (const t of toks) { const u = index.get(t) || new Set(); set = set ? new Set([...set].filter(x => u.has(x))) : new Set(u); }
  return set;
}
const listRegions = list => { const set = new Set(); for (const s of splitList(list)) selRegions(s).forEach(x => set.add(x)); return set; };

// ---- stylesheet rules, with their line in the source file ----
function rulesOf(f, chunk) {
  const src = chunk.text, out = [];
  const line = pos => chunk.line + src.slice(0, pos).split('\n').length;
  let i = 0;
  const skipWs = () => { for (;;) { while (i < src.length && /\s/.test(src[i])) i++; if (src.startsWith('/*', i)) { i = src.indexOf('*/', i) + 2; continue; } break; } };
  for (;;) {
    skipWs();
    if (i >= src.length) break;
    const start = i;
    while (i < src.length && src[i] !== '{') { if (src.startsWith('/*', i)) i = src.indexOf('*/', i) + 2; else i++; }
    const prelude = src.slice(start, i).trim();
    let depth = 0; const b0 = i + 1;
    for (; i < src.length; i++) {
      if (src.startsWith('/*', i)) { i = src.indexOf('*/', i) + 1; continue; }
      if (src[i] === '"' || src[i] === "'") { const q = src[i++]; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
      if (src[i] === '{') depth++; else if (src[i] === '}' && !--depth) { i++; break; }
    }
    out.push({ f, line: line(start), prelude, body: src.slice(b0, i - 1).replace(/\/\*[\s\S]*?\*\//g, '') });
  }
  return out;
}
const RULES = [];
for (const { f, chunks } of CSS) for (const c of chunks) RULES.push(...rulesOf(f, c));
const problems = [];
let checked = 0;
const keyframes = new Map(); // name -> file that defines it
for (const r of RULES) if (/^@keyframes\s/.test(r.prelude)) keyframes.set(r.prelude.split(/\s+/)[1], r.f);
for (const r of RULES) {
  if (/^@keyframes\s/.test(r.prelude)) continue;
  for (const m of r.body.matchAll(/animation(?:-name)?\s*:([^;}]*)/g)) for (const [name, def] of keyframes) {
    if (new RegExp('(^|[\\s,])' + name + '([\\s,]|$)').test(m[1]) && !isBase(def) && def !== r.f) problems.push(r.f + ':' + r.line + ': uses @keyframes ' + name + ', which ' + def + ' defines; move the keyframes to base.css');
  }
  if (isBase(r.f)) continue;
  const allowed = new Set(sectionsOf(ownerOf(r.f)));
  const regs = /^@(media|supports|container)\b/.test(r.prelude)
    ? (() => { const s = new Set(); for (const m of r.body.matchAll(/([^{}]+)\{[^{}]*\}/g)) listRegions(m[1].trim()).forEach(x => s.add(x)); return s; })()
    : listRegions(r.prelude);
  checked++;
  const outside = [...regs].filter(x => !allowed.has(x));
  if (outside.length) problems.push(r.f + ':' + r.line + ': "' + r.prelude.replace(/\s+/g, ' ').slice(0, 70) + '" also matches ' + outside.join(', ') + '; it belongs in base.css');
}
// ---- script lookups over the whole document: $('sel'), $$('sel'), document.querySelector(All)('sel'),
// document.getElementById('id'). A lookup scoped to an element found earlier ($('x', el), el.closest()) stays inside it.
for (const { f, chunks } of JS) {
  if (isBase(f)) continue;
  const allowed = new Set(sectionsOf(ownerOf(f)));
  for (const c of chunks) {
    for (const m of c.text.matchAll(/(?<![\w.$])(\$\$?|document\.querySelector(?:All)?|document\.getElementById)\(\s*'([^']+)'\s*\)/g)) {
      const sel = m[1] === 'document.getElementById' ? '#' + m[2] : m[2];
      const outside = [...listRegions(sel)].filter(x => !allowed.has(x));
      checked++;
      if (outside.length) problems.push(f + ':' + (c.line + c.text.slice(0, m.index).split('\n').length) + ': looks up "' + sel + '", which also matches ' + outside.join(', ') + '; that code belongs in base.js');
    }
  }
}
console.log(checked + ' rules and lookups checked against ' + path.basename(FILE) + ' (' + (REGIONS.length - 1) + ' sections and the page)');
if (problems.length) { console.log('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('PASS: every rule and lookup in system.* and screens.* stays inside its owner\'s sections');

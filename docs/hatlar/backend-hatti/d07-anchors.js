// D07 helper: for every decided fact, find the quote in the validator-normalized text of the
// chosen file, map it back to the raw HTML offset, and set the anchor to the nearest id above it.
// Usage: node d07-anchors.js [--write]
const fs = require('fs'), path = require('path');
const REPO = require('path').join(__dirname, '..', '..', 'belgeler').split(require('path').sep).join('/') + '/';
const FILE = path.join(__dirname, 'inv', 'D07.json');
const write = process.argv.includes('--write');

function build(html) {
  const chars = [], pos = [];
  let i = 0;
  const ents = [['&nbsp;', ' '], ['&amp;', '&'], ['&quot;', '"'], ['&#39;', "'"]];
  outer: while (i < html.length) {
    if (html.startsWith('<style', i)) { const j = html.indexOf('</style>', i); i = j + 8; continue; }
    if (html.startsWith('<script', i)) { const j = html.indexOf('</script>', i); i = j + 9; continue; }
    if (html[i] === '<') { const j = html.indexOf('>', i + 1); if (j > i + 1) { chars.push(' '); pos.push(i); i = j + 1; continue; } }
    for (const [e, r] of ents) if (html.startsWith(e, i)) { chars.push(r); pos.push(i); i += e.length; continue outer; }
    chars.push(html[i]); pos.push(i); i++;
  }
  let out = '', opos = [], sp = false;
  for (let k = 0; k < chars.length; k++) {
    if (/\s/.test(chars[k])) { if (!sp) { out += ' '; opos.push(pos[k]); sp = true; } }
    else { out += chars[k]; opos.push(pos[k]); sp = false; }
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => ({ at: m.index, id: m[1] }));
  return { out, opos, ids };
}
const docs = {};
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) docs[f] = build(fs.readFileSync(REPO + f, 'utf8'));
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

const j = JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, ''));
let problems = 0, changed = 0;
for (const d of j.decided) {
  const file = String(d.anchor).split('#')[0];
  const doc = docs[file];
  if (!doc) { console.log(`${d.id} BAD FILE ${d.anchor}`); problems++; continue; }
  const q = norm(d.quote);
  const words = q.split(' ').length;
  if (words > 25) { console.log(`${d.id} QUOTE ${words} WORDS`); problems++; }
  const at = doc.out.indexOf(q);
  if (at < 0) { console.log(`${d.id} QUOTE NOT FOUND in ${file}: ${q.slice(0, 70)}`); problems++; continue; }
  const again = doc.out.indexOf(q, at + 1);
  if (again >= 0) console.log(`${d.id} WARN quote occurs more than once in ${file}`);
  const raw = doc.opos[at];
  let near = null;
  for (const x of doc.ids) { if (x.at < raw) near = x.id; else break; }
  const want = `${file}#${near}`;
  if (want !== d.anchor) { console.log(`${d.id} anchor ${d.anchor} -> ${want}`); d.anchor = want; changed++; }
}
console.log(`checked ${j.decided.length}, problems ${problems}, anchor changes ${changed}`);
if (write && changed) { fs.writeFileSync(FILE, JSON.stringify(j, null, 2) + '\n', 'utf8'); console.log('written'); }

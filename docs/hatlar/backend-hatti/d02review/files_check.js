// Reviewer check: does every D02 file fall under a D02-owned glob in contracts.json, and only that?
const path = require('path');
const base = path.join(__dirname, '..');
const c = require(path.join(base, 'contracts.json'));
const s = require(path.join(base, 'spec', 'D02.json'));
const fo = c.file_ownership;
console.log('sample entry:', JSON.stringify(fo[0]));
function globToRe(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*' && g[i + 1] === '*') { r += '.*'; i++; continue; }
    if (ch === '*') { r += '[^/]*'; continue; }
    if (ch === '<') { const j = g.indexOf('>', i); r += '[^/]*'; i = j; continue; }
    if ('.+^${}()|[]\\?'.includes(ch)) { r += '\\' + ch; continue; }
    r += ch;
  }
  return new RegExp('^' + r + '$');
}
const keyOf = (o) => o.glob || o.path || o.pattern || o.desen || o.dosya;
console.log('D02 globs:');
fo.filter((o) => o.owner === 'D02').forEach((o) => console.log('  ', keyOf(o)));
for (const f of s.files) {
  const owners = fo.filter((o) => { const g = keyOf(o); return g && globToRe(g).test(f); }).map((o) => o.owner);
  if (!(owners.length >= 1 && owners.every((x) => x === 'D02'))) console.log('FILE', f, 'owners:', owners.join(',') || '(none)');
}

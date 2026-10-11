const c = require('../contracts.json');
const s = require('../spec/D05.json');
const own = c.file_ownership;
console.log('sample:', JSON.stringify(own.slice(0, 2)));
const SPECIAL = new Set(['.', '+', '^', '$', '(', ')', '|', '[', ']', '{', '}', String.fromCharCode(92)]);
function toRe(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*' && g[i + 1] === '*') { r += '.*'; i++; if (g[i + 1] === '/') i++; continue; }
    if (ch === '*') { r += '[^/]*'; continue; }
    if (ch === '?') { r += '.'; continue; }
    if (SPECIAL.has(ch)) { r += String.fromCharCode(92) + ch; continue; }
    r += ch;
  }
  return new RegExp('^' + r + '$');
}
const key = (o) => o.glob || o.path || o.pattern || o.files;
for (const f of s.files) {
  const owners = own
    .filter((o) => { const g = key(o); return typeof g === 'string' && toRe(g).test(f); })
    .map((o) => (o.owner || o.module) + ':' + key(o));
  console.log((owners.length ? '' : '!! ') + f, '=>', owners.join(' | ') || 'NO OWNER');
}
console.log('D05 globs:', JSON.stringify(own.filter((o) => (o.owner || o.module) === 'D05')));
console.log(JSON.stringify(c.canonical_tables.filter((t) => JSON.stringify(t).includes('D05'))));

const base = process.argv[2];
const c = require(base + '/contracts.json');
const s = require(base + '/spec/D07.json');
const own = c.file_ownership;
console.log('sample entry:', JSON.stringify(own[0]));
function globToRe(g) {
  let out = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*' && g[i + 1] === '*') { out += '.*'; i++; continue; }
    if (ch === '*') { out += '[^/]*'; continue; }
    if ('.+^${}()|[]\\'.includes(ch)) { out += '\\' + ch; continue; }
    out += ch;
  }
  return new RegExp('^' + out + '$');
}
const all = own.map(f => ({ g: f.glob || f.path || f.pattern || f.files, o: f.owner || f.module || f.id }));
console.log('D07 globs:', JSON.stringify(all.filter(a => a.o === 'D07')));
for (const f of s.files) {
  const hits = all.filter(a => typeof a.g === 'string' && globToRe(a.g).test(f));
  const owners = [...new Set(hits.map(h => h.o))];
  if (owners.length !== 1 || owners[0] !== 'D07') console.log('FILE', f, '->', owners.join(',') || 'NONE');
}

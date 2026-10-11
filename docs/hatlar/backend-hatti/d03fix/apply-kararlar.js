// Swaps resolved-gap and open-point lines in icerik.js by id with the text in yeni-kararlar.js; appends new open points.
'use strict';
const fs = require('fs');
const { G, O } = require('./yeni-kararlar.js');
let lines = fs.readFileSync('icerik.js', 'utf8').split('\n');
const q = s => JSON.stringify(s);
const seen = new Set();
lines = lines.map(l => {
  let m = l.match(/^  G\('(D03-B\d\d)',/);
  if (m && G[m[1]]) { seen.add(m[1]); return `  G('${m[1]}', ${q(G[m[1]][0])}, ${q(G[m[1]][1])}),`; }
  m = l.match(/^  O\('(D03-A\d\d)',/);
  if (m && O[m[1]]) { seen.add(m[1]); return `  O('${m[1]}', ${q(O[m[1]][0])}, ${q(O[m[1]][1])}, ${O[m[1]][2]}),`; }
  return l;
});
// append open points not present
const end = lines.findIndex((l, i) => i > lines.findIndex(x => x.startsWith('const open_points')) && l === '];');
const extra = Object.keys(O).filter(k => !seen.has(k)).sort();
for (const k of extra) { lines.splice(end, 0, `  O('${k}', ${q(O[k][0])}, ${q(O[k][1])}, ${O[k][2]}),`); seen.add(k); }
for (const k of [...Object.keys(G), ...Object.keys(O)]) if (!seen.has(k)) { console.error('not applied: ' + k); process.exit(1); }
fs.writeFileSync('icerik.js', lines.join('\n'));
console.log('applied', seen.size, 'appended', extra);

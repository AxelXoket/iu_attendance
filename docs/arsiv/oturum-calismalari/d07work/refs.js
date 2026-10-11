// Which exports of other modules does the D07 spec mention (by bare name)?
const path = require('path');
const B = process.argv[2];
const nm = e => String(typeof e === 'string' ? e : (e.name || e.ad || '')).trim();
const s = require(path.join(B, 'spec/D07.json'));
const txt = JSON.stringify(s);
for (let i = 1; i <= 15; i++) {
  const id = 'D' + String(i).padStart(2, '0');
  if (id === 'D07') continue;
  const ex = (require(path.join(B, 'spec/' + id + '.json')).exports || []).map(nm);
  const hit = ex.map(n => (n.match(/^[A-Za-z0-9_]+/) || [n])[0]).filter(b => b.length > 3 && txt.includes(b));
  console.log(id, ex.length, '|', hit.join(', '));
}

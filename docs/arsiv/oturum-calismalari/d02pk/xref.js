const path = require('path');
const B = process.argv[2];
const s = require(path.join(B, 'spec/D02.json'));
const txt = JSON.stringify(s);
const nm = e => String(typeof e === 'string' ? e : (e.name || e.ad || '')).trim();
const esc = x => x.split('').map(ch => /[A-Za-z0-9_]/.test(ch) ? ch : '\\' + ch).join('');
for (const id of ['D01', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']) {
  const S = require(path.join(B, 'spec', id + '.json'));
  const names = (S.exports || []).map(nm);
  const hits = [];
  for (const n of names) {
    if (n.length < 3) continue;
    const re = new RegExp('(?<![A-Za-z0-9_])' + esc(n) + '(?![A-Za-z0-9_])', 'g');
    const c = (txt.match(re) || []).length;
    if (c) hits.push(n + '(' + c + ')');
  }
  console.log(id, names.length, 'hits:', hits.join(', '));
}

// Which other modules reference which D02 exports (by name), to place exports early.
const path = require('path');
const B = process.argv[2];
const nm = e => String(typeof e === 'string' ? e : (e.name || e.ad || '')).trim();
const esc = x => x.split('').map(ch => /[A-Za-z0-9_]/.test(ch) ? ch : '\\' + ch).join('');
const d02 = require(path.join(B, 'spec/D02.json')).exports.map(nm);
const C = require(path.join(B, 'contracts.json'));
const out = {};
for (const m of C.modules) {
  if (m.id === 'D02') continue;
  const S = require(path.join(B, 'spec', m.id + '.json'));
  const txt = JSON.stringify(S);
  const hits = [];
  for (const n of d02) {
    const re1 = new RegExp('D02\\.' + esc(n) + '(?![A-Za-z0-9_])', 'g');
    const re2 = new RegExp('(?<![A-Za-z0-9_.])' + esc(n) + '(?![A-Za-z0-9_])', 'g');
    const c1 = (txt.match(re1) || []).length, c2 = (txt.match(re2) || []).length;
    if (c1 || c2) hits.push(n + '(' + c1 + '/' + c2 + ')');
  }
  console.log(m.id, 'reads_from:', (m.reads_from || []).join(','), '| D02 refs:', hits.join(', '));
}

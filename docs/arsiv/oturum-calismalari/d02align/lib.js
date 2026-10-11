// Patch helpers: every edit asserts how many places it touches, so a drifted source fails loudly instead of half-patching.
const fs = require('fs'), path = require('path');
const BEFORE = path.join(__dirname, 'before');
const R2 = path.resolve(__dirname, '..', 'r17', 'backend', 'd02work', 'r2');
const J = s => JSON.stringify(s);
function load(name) { return fs.readFileSync(path.join(BEFORE, name), 'utf8'); }
function save(name, src) { fs.writeFileSync(path.join(R2, name), src, 'utf8'); }
function count(src, s) { let n = 0, i = 0; while ((i = src.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }
function rep(src, old, neu, n = 1) {
  const c = count(src, old);
  if (c !== n) throw new Error(`rep: beklenen ${n}, bulunan ${c}: ${old.slice(0, 90)}`);
  return src.split(old).join(neu);
}
function lineIdx(lines, anchor) {
  const hits = lines.map((l, i) => l.includes(anchor) ? i : -1).filter(i => i >= 0);
  if (hits.length !== 1) throw new Error(`satır: beklenen 1, bulunan ${hits.length}: ${anchor.slice(0, 90)}`);
  return hits[0];
}
function repLine(src, anchor, newLine) { const L = src.split('\n'); L[lineIdx(L, anchor)] = newLine; return L.join('\n'); }
function delLine(src, anchor) { const L = src.split('\n'); L.splice(lineIdx(L, anchor), 1); return L.join('\n'); }
function insAfter(src, anchor, newLines) { const L = src.split('\n'); L.splice(lineIdx(L, anchor) + 1, 0, ...[].concat(newLines)); return L.join('\n'); }
module.exports = { load, save, rep, repLine, delLine, insAfter, J, count };

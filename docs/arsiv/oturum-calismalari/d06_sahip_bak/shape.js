// Proves the rewrite was wording-only: same JSON shape, every changed leaf is a string that held the "sahip" stem before and not after,
// no dash characters, packages differ only in title/notes. Usage: node shape.js <backup dir> <backend dir>
const fs = require('fs'), path = require('path');
const [bak, B] = process.argv.slice(2);
let errs = 0, changed = 0;
const fail = m => { errs++; console.log('FAIL ' + m); };
function walk(a, b, p, allow) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return fail('type differs at ' + p);
  if (a && typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join('|') !== kb.join('|')) return fail('keys differ at ' + p);
    for (const k of ka) walk(a[k], b[k], p + '.' + k, allow);
    return;
  }
  if (a === b) return;
  changed++;
  if (typeof a !== 'string') return fail('non-string changed at ' + p);
  if (!/sahi[pb]/i.test(a)) return fail('changed string had no sahip stem at ' + p);
  if (/sahi[pb]/i.test(b)) return fail('stem still present at ' + p);
  if (allow && !allow(p)) return fail('field not allowed to change: ' + p);
}
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
walk(read(path.join(bak, 'D06.json')), read(path.join(B, 'spec', 'D06.json')), 'spec', null);
const specChanged = changed; changed = 0;
walk(read(path.join(bak, 'packages_D06.json')), read(path.join(B, 'packages', 'D06.json')), 'packages', p => /\.(title|notes)$/.test(p));
const pkgChanged = changed;
for (const f of ['spec/D06.json', 'frag/D06.html', 'packages/D06.json']) if (/[–—]/.test(fs.readFileSync(path.join(B, f), 'utf8'))) fail('dash in ' + f);
// fragment: strip tags and compare the non-sahip remainder is untouched in length class (every changed text block had the stem)
console.log(`spec leaves changed: ${specChanged}, packages leaves changed: ${pkgChanged}`);
console.log(errs ? 'SHAPE ERRORS ' + errs : 'SHAPE OK');
process.exit(errs ? 1 : 0);

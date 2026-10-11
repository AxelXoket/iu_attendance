// Compares two JSON files leaf by leaf: structure must be identical, prints every changed string leaf path.
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let changed = [], structural = [];
const walk = (x, y, p) => {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) return structural.push(p);
  if (x && typeof x === 'object') {
    const kx = Object.keys(x), ky = Object.keys(y);
    if (kx.join('|') !== ky.join('|')) return structural.push(p + ' keys');
    for (const k of kx) walk(x[k], y[k], p + '.' + k);
  } else if (x !== y) changed.push(p);
};
walk(a, b, '$');
console.log('structural diffs: ' + structural.length + (structural.length ? '\n  ' + structural.join('\n  ') : ''));
console.log('changed leaves: ' + changed.length + '\n  ' + changed.join('\n  '));
console.log('dash in new: ' + /[–—]/.test(JSON.stringify(b)));

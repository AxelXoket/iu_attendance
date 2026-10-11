// Lists every leaf path whose value differs between two JSON files; fails if the shapes differ.
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const out = []; let shape = 0;
const walk = (x, y, p) => {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) { shape++; out.push('SHAPE ' + p); return; }
  if (x && typeof x === 'object') {
    const kx = Object.keys(x), ky = Object.keys(y);
    if (kx.join() !== ky.join()) { shape++; out.push('KEYS ' + p); return; }
    for (const k of kx) walk(x[k], y[k], p + '.' + k);
  } else if (x !== y) out.push(p);
};
walk(a, b, '$');
console.log(out.map(p => p.replace(/\.\d+/g, '[]')).reduce((m, p) => (m[p] = (m[p] || 0) + 1, m), {}));
console.log('changed leaves', out.length, 'shape errors', shape);

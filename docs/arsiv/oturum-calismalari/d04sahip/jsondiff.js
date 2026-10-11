// Lists every leaf that differs between two JSON files, with its path; fails on any shape change.
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const out = [];
const walk = (x, y, p) => {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) { out.push(['SHAPE', p]); return; }
  if (x && typeof x === 'object') {
    const ka = Object.keys(x), kb = Object.keys(y);
    if (ka.join() !== kb.join()) { out.push(['KEYS', p]); return; }
    for (const k of ka) walk(x[k], y[k], p + (Array.isArray(x) ? `[${k}]` : '.' + k));
  } else if (x !== y) out.push(['TEXT', p]);
};
walk(a, b, '');
const shape = out.filter(o => o[0] !== 'TEXT');
console.log(out.map(o => o.join(' ')).join('\n'));
console.log(`${out.length} differing leaves, ${shape.length} shape changes`);
process.exit(shape.length ? 1 : 0);

// Compares two spec JSONs: same shape and same non-string values; lists string paths that differ.
const a = require(process.argv[2]), b = require(process.argv[3]);
const diffs = [], shape = [];
const walk = (x, y, p) => {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y)) return shape.push(p + ' type');
  if (Array.isArray(x)) { if (x.length !== y.length) shape.push(p + ' len'); x.forEach((v, i) => walk(v, y[i], p + '[' + i + ']')); return; }
  if (x && typeof x === 'object') { const ka = Object.keys(x).join(), kb = Object.keys(y).join(); if (ka !== kb) shape.push(p + ' keys'); for (const k of Object.keys(x)) walk(x[k], y[k], p + '.' + k); return; }
  if (x !== y) (typeof x === 'string' ? diffs : shape).push(p);
};
walk(a, b, '$');
console.log('shape/non-string diffs: ' + shape.length + (shape.length ? '\n' + shape.join('\n') : ''));
console.log('string diffs: ' + diffs.length + '\n' + diffs.join('\n'));

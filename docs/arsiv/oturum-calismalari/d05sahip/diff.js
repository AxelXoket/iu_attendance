// Structural diff: every key, array length, number, boolean and null must be equal; changed strings are listed.
const fs = require('fs');
const [a, b, label] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(a, 'utf8')), Bv = JSON.parse(fs.readFileSync(b, 'utf8'));
let struct = 0, changed = [];
function walk(x, y, p) {
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y) || (x === null) !== (y === null)) { struct++; console.log('TYPE', p); return; }
  if (Array.isArray(x)) { if (x.length !== y.length) { struct++; console.log('LEN', p); } x.forEach((v, i) => walk(v, y[i], p + '[' + i + ']')); return; }
  if (x && typeof x === 'object') { const ka = Object.keys(x).join(), kb = Object.keys(y).join(); if (ka !== kb) { struct++; console.log('KEYS', p); } for (const k of Object.keys(x)) walk(x[k], y[k], p + '.' + k); return; }
  if (typeof x === 'string') { if (x !== y) changed.push(p); return; }
  if (x !== y) { struct++; console.log('VALUE', p, x, y); }
}
walk(A, Bv, label);
console.log(label, 'structural differences:', struct, '| changed strings:', changed.length);
changed.forEach(p => console.log('  ' + p));

// Splice kilit.txt over the old mapping table and lock-order block of d11work/build.js (bounds by unique substrings).
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '..', 'r17', 'backend', 'd11work', 'build.js');
const L = fs.readFileSync(f, 'utf8').split('\n');
const a = L.findIndex(l => l.includes('ye önerilen eşleme: sahibi D07'));
const b = L.findIndex(l => l.includes('<p><strong>Hoca saati</strong>'));
if (a < 0 || b < 0 || b < a) throw new Error('bounds ' + a + ' ' + b);
const nr = fs.readFileSync(path.join(__dirname, 'kilit.txt'), 'utf8').replace(/\n$/, '').split('\n');
L.splice(a, b - a, ...nr);
fs.writeFileSync(f, L.join('\n'));
console.log('ok', a, b, nr.length);

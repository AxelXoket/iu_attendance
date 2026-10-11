// usage: node splice.js <file> <startMarker> <endMarker> <partFile>; replaces [start, end) with part
const fs = require('fs');
const [, , file, a, b, part] = process.argv;
const s = fs.readFileSync(file, 'utf8');
const i = s.indexOf(a), j = s.indexOf(b, i + 1);
if (i < 0 || j < 0 || s.indexOf(a, i + 1) >= 0 && s.indexOf(a, i + 1) < j) { console.error('marker not found or ambiguous', i, j); process.exit(1); }
fs.writeFileSync(file, s.slice(0, i) + fs.readFileSync(part, 'utf8') + s.slice(j));
console.log('spliced', file, i, j);

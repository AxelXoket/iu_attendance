const fs = require('fs');
const h = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/tasarim.html', 'utf8');
const low = h.toLocaleLowerCase('tr-TR');
let i = low.indexOf('hesabımı sil'); const out = new Set();
while (i >= 0) { const s = h.lastIndexOf(' id="', i); out.add(h.slice(s + 5, h.indexOf('"', s + 5))); i = low.indexOf('hesabımı sil', i + 1); }
console.log([...out].join('\n'));

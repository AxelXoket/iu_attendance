// Escape the Turkish suffix apostrophes inserted into build.js so every JS string literal stays valid.
'use strict';
const fs = require('fs');
const f = __dirname + '/build.js';
let s = fs.readFileSync(f, 'utf8');
const forms = ["kid'li", "kid'de", "15'ten", "10'a", "09:08'de", "10:30'da", "09:16'ya", "09:14'teyken", "09:46'da", "09:12'de",
  "D15'in", "D07'ye", "D04'te", "D02'nin", "D04'e ", "D07'nin", "D04'ün", "QR'ına", "2'nin", "B08'in", "B42'ye", "D04'ündür",
  "D02'de", "A04'te", "D12'ye", "D06'nın", "2'lik"];
let n = 0;
for (const form of forms) {
  const fixed = form.replace("'", "\\'");
  // only touch unescaped occurrences
  const re = new RegExp('(?<!\\\\)' + form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  s = s.replace(re, () => { n++; return fixed; });
}
fs.writeFileSync(f, s);
console.log('escaped', n);

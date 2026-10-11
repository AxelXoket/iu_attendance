const fs = require('fs');
let s = fs.readFileSync('build.js', 'utf8');
const before = s;
const BS = String.fromCharCode(92), Q = String.fromCharCode(39);
s = s.replace(/([A-Za-z0-9.])\\?'(?=[a-zçğıöşü])/g, (m, a) => a + BS + Q);
fs.writeFileSync('build.js', s);
console.log('changed', before !== s);

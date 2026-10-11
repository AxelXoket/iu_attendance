// veri.js'te hatalarTablosu'ndan dosya sonuna kadarki bölümü parca-tablolar.js ile değiştirir.
const fs = require('fs'), path = require('path');
const yol = path.join(__dirname, 'veri.js');
let v = fs.readFileSync(yol, 'utf8');
const p = fs.readFileSync(path.join(__dirname, 'parca-tablolar.js'), 'utf8');
const a = v.indexOf('const hatalarTablosu = [');
if (a < 0) throw new Error('işaret yok');
v = v.slice(0, a) + p;
fs.writeFileSync(yol, v);
const V = require('./veri.js');
console.log(Object.keys(V).join(' '));

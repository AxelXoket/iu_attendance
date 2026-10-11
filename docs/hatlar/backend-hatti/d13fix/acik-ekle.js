// veri.js'teki open_points bloğunu yeni-acik.js ile değiştirir (A01, A02, A06 korunur, A03 kapanır).
const fs = require('fs'), path = require('path');
const yol = path.join(__dirname, 'veri.js');
let v = fs.readFileSync(yol, 'utf8');
const Y = require('./yeni-acik.js');
const V = require('./veri.js');
const keep = Object.fromEntries(V.open_points.map(o => [o.id, o]));
const sira = [keep['D13-A01'], keep['D13-A02'], Y.A04, Y.A05, keep['D13-A06'], Y.A07, Y.A08, Y.A09];
if (sira.some(x => !x)) throw new Error('eksik açık nokta');
const a = v.indexOf('const open_points = [');
const b = v.indexOf('\n];', a);
if (a < 0 || b < 0) throw new Error('işaret yok');
v = v.slice(0, a) + 'const open_points = [\n' + sira.map(o => '  ' + JSON.stringify(o) + ',').join('\n') + v.slice(b);
fs.writeFileSync(yol, v);
delete require.cache[require.resolve('./veri.js')];
console.log(require('./veri.js').open_points.map(o => o.id).join(' '));

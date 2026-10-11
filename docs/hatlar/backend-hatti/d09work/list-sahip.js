// Lists every "sahip" stem occurrence with context in the D09 generator sources and packages/D09.json.
const fs = require('fs'), path = require('path');
const files = process.argv.slice(2);
let n = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/sahi[pb][a-zçğıöşü]*/gi)) {
    n++;
    const line = s.slice(0, m.index).split('\n').length;
    console.log(`${path.basename(f)}:${line}: ...${s.slice(Math.max(0, m.index - 140), m.index + 90).replace(/\s+/g, ' ')}...`);
  }
}
console.log('TOTAL ' + n);

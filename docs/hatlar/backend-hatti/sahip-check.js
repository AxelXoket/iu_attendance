// Gate: no "sahip" stem anywhere in a module's spec, section and packages (identifiers were renamed by rename-sahip.js;
// what is left is prose). Usage: node sahip-check.js D05 | node sahip-check.js --all (also contracts.json)
const fs = require('fs'), path = require('path');
const D = __dirname;
const ids = process.argv[2] === '--all' ? ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15'] : [process.argv[2]];
const files = ids.flatMap(id => ['spec/' + id + '.json', 'frag/' + id + '.html', 'packages/' + id + '.json']);
if (process.argv[2] === '--all') files.push('contracts.json');
let bad = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(D, f), 'utf8');
  const hits = [...s.matchAll(/.{0,50}sahi[pb][a-zçğıöşü]*.{0,30}/gi)].map(m => m[0].replace(/\s+/g, ' '));
  if (hits.length) { bad += hits.length; console.log(`${f}: ${hits.length}\n  ` + hits.slice(0, 8).join('\n  ')); }
}
if (bad) { console.log('ERRORS: ' + bad + ' occurrences'); process.exit(1); }
console.log('OK no sahip stem in ' + files.length + ' files');

// node splice.js <icerik.js> <constName> <fragmentFile>: replace top-level `const <name> = ...;` block (ends at first line '];' or '};' at column 0, or the same line if it ends with ';')
const fs = require('fs');
const [file, name, frag] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
const a = lines.findIndex(l => l.startsWith(`const ${name} = `));
if (a < 0) throw new Error('not found ' + name);
let b = a;
if (!/^const \w+ = `.*`;\s*$/.test(lines[a])) { b = lines.findIndex((l, i) => i > a && (l === '];' || l === '};')); }
if (b < 0) throw new Error('end not found');
const neu = fs.readFileSync(frag, 'utf8').replace(/\n$/, '').split('\n');
lines.splice(a, b - a + 1, ...neu);
fs.writeFileSync(file, lines.join('\n'));
console.log(`${name}: replaced lines ${a + 1}-${b + 1} with ${neu.length}`);

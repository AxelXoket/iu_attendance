const fs = require('fs');
const [,, src, out] = process.argv;
const res = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  let s = line;
  let first = true;
  while (s.length > 1400) {
    let cut = s.lastIndexOf(' ', 1400);
    if (cut < 200) cut = 1400;
    res.push((first ? '' : '  >> ') + s.slice(0, cut));
    s = s.slice(cut + 1);
    first = false;
  }
  res.push((first ? '' : '  >> ') + s);
}
fs.writeFileSync(out, res.join('\n'), 'utf8');
console.log(out, res.length);

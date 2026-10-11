// Search a spec JSON for words and print short context windows.
const s = require(process.argv[2]);
const txt = JSON.stringify(s);
const esc = w => w.split('').map(c => /[A-Za-z0-9_ -]/.test(c) ? c : '[' + (c === ']' || c === '\\' || c === '^' ? '\\' + c : c) + ']').join('');
const n = +process.argv[3] || 3;
for (const w of process.argv.slice(4)) {
  const re = new RegExp('[^"]{0,220}' + esc(w) + '[^"]{0,220}', 'g');
  const ms = [...new Set(txt.match(re) || [])];
  console.log('### ' + w + ' (' + ms.length + ')');
  ms.slice(0, n).forEach(m => console.log('  - ' + m));
}

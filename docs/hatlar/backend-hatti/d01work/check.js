const fs = require('fs');
const h = fs.readFileSync(__dirname + '/../frag/D01.html', 'utf8');
const j = fs.readFileSync(__dirname + '/../spec/D01.json', 'utf8');
for (const t of ['span', 'td', 'li', 'ol', 'summary']) {
  const o = (h.match(new RegExp('<' + t + '(\s[^>]*)?>', 'g')) || []).length;
  const c = (h.match(new RegExp('</' + t + '>', 'g')) || []).length;
  console.log(t, o, c, o === c ? 'ok' : 'MISMATCH');
}
for (const [name, txt] of [['html', h], ['json', j]]) {
  for (const w of ['undefined', '[object Object]', 'NaN']) {
    let i = -1; while ((i = txt.indexOf(w, i + 1)) >= 0) console.log(name, w, '...' + txt.slice(Math.max(0, i - 120), i + 60).replace(/\n/g, ' ') + '...');
  }
}

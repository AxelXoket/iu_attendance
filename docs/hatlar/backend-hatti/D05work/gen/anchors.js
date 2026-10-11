// Builds { "plan.html#id": "short title" } for every id in plan, teknik and tasarim.
// Title rule: a row's .k text, else the first h2/h3 inside the element, else the first words of its text.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function titles(file) {
  const html = fs.readFileSync(REPO + file, 'utf8');
  const out = {};
  const re = /<([a-zA-Z0-9]+)\b[^>]*\sid="([^"]+)"[^>]*>/g; let m;
  while ((m = re.exec(html))) {
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 4000);
    let t = null;
    const k = after.match(/^\s*<div class="k">([\s\S]*?)<\/div>/);
    if (k) t = strip(k[1]);
    if (!t) { const h = after.match(/^[\s\S]{0,400}?<h[23][^>]*>([\s\S]*?)<\/h[23]>/); if (h) t = strip(h[1]); }
    if (!t) t = strip(after).split(' ').slice(0, 5).join(' ');
    out[file + '#' + m[2]] = t;
  }
  return out;
}
module.exports = () => Object.assign({}, titles('plan.html'), titles('teknik.html'), titles('tasarim.html'));
if (require.main === module) {
  const T = module.exports();
  for (const a of process.argv.slice(2)) console.log(a, '=>', T[a] === undefined ? 'MISSING' : JSON.stringify(T[a]));
}

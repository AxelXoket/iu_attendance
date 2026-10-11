// Search string leaves of spec/Dxx.json files: node ara.js <regex> [modules comma list] [window]
const fs = require('fs'), path = require('path');
const [re, mods, win] = process.argv.slice(2);
const R = new RegExp(re, 'i');
const W = +(win || 220);
const dir = path.join(__dirname, '..', '..', 'spec');
const list = mods ? mods.split(',') : fs.readdirSync(dir).filter(f => /^D\d\d\.json$/.test(f)).map(f => f.slice(0, 3));
function walk(o, p, out) {
  if (typeof o === 'string') { const m = o.match(R); if (m) { const i = m.index; out.push(p + ': ' + (i > W ? '...' : '') + o.slice(Math.max(0, i - W), i + W) + (i + W < o.length ? '...' : '')); } return; }
  if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']', out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (R.test(k)) out.push(p + '.' + k + ' (key)'); walk(v, p + '.' + k, out); }
}
for (const m of list) {
  if (m === 'D06' && !process.env.SELF) continue;
  const s = JSON.parse(fs.readFileSync(path.join(dir, m + '.json'), 'utf8').replace(/^\uFEFF/, ''));
  const out = []; walk(s, m, out);
  if (out.length) console.log('=== ' + m + ' (' + out.length + ')\n' + out.join('\n'));
}

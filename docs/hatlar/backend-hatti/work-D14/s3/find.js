// Usage: node find.js <regex> [modules comma list] [maxLen]
// Prints every string leaf in spec/Dxx.json matching the regex, with its JSON path (snippet around the match).
const fs = require('fs'), path = require('path');
const [re, mods, maxLen] = process.argv.slice(2);
const R = new RegExp(re, 'i');
const dir = path.join(__dirname, '..', '..', 'spec');
const list = mods ? mods.split(',') : fs.readdirSync(dir).filter(f => /^D\d\d\.json$/.test(f)).map(f => f.slice(0, 3));
const L = +maxLen || 600;
for (const id of list) {
  const S = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'));
  const walk = (v, p) => {
    if (typeof v === 'string') { const m = v.match(R); if (m) { const i = m.index; const s = Math.max(0, i - L / 2); console.log(`[${id}] ${p}: ${s > 0 ? '...' : ''}${v.slice(s, s + L)}${s + L < v.length ? '...' : ''}`); } }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p + '.' + k);
  };
  walk(S, '');
}

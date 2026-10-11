// Query helper: node q.js <Dxx|contracts> <regex> [maxLen]  -> prints JSON paths of string leaves matching regex
// node q.js <Dxx> --path <a.b.0.c>  -> prints that subtree
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');
const [, , mod, pat, arg3] = process.argv;
const file = mod === 'contracts' ? path.join(B, 'contracts.json') : path.join(B, 'spec', mod + '.json');
const S = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
if (pat === '--path') {
  let o = S; for (const k of arg3.split('.')) o = o[k];
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
}
const re = new RegExp(pat, 'i'); const max = +(arg3 || 600);
const walk = (o, p) => {
  if (typeof o === 'string') { if (re.test(o)) { const i = o.search(re); const s = Math.max(0, i - max / 2); console.log(p + ': ' + (s > 0 ? '...' : '') + o.slice(s, s + max) + (s + max < o.length ? '...' : '')); } }
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '.' + i));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p ? p + '.' + k : k);
};
walk(S, '');

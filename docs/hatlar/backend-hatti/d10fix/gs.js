// Usage: node gs.js D08 'regex' [contextChars]
// Walks spec/<id>.json and prints each string leaf matching the regex (case-insensitive), with its JSON path.
const fs = require('fs'), path = require('path');
const [id, re, ctx] = process.argv.slice(2);
const S = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spec', id + '.json'), 'utf8').replace(/^\uFEFF/, ''));
const R = new RegExp(re, 'i'), C = +(ctx || 0);
function walk(v, p) {
  if (typeof v === 'string') {
    if (R.test(v)) {
      if (!C) console.log(p + ' :: ' + v);
      else { const m = v.match(R); const i = m.index; console.log(p + ' :: ...' + v.slice(Math.max(0, i - C), i + C) + '...'); }
    }
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p + '.' + k);
}
walk(S, id);

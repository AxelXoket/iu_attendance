// For each D07 spec file, print short snippets of spec text that mention it.
const path = require('path');
const B = process.argv[2];
const s = require(path.join(B, 'spec/D07.json'));
const chunks = [];
const walk = (v, where) => {
  if (typeof v === 'string') chunks.push({ where, t: v });
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, where + '[' + i + ']'));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], where + '.' + k);
};
for (const k of Object.keys(s)) if (k !== 'files') walk(s[k], k);
const only = process.argv[3];
for (const f of s.files) {
  if (only && !f.includes(only)) continue;
  const base = f.split('/').slice(-2).join('/');
  const short = f.split('/').pop();
  const hits = chunks.filter(c => c.t.includes(base) || (short.length > 9 && c.t.includes(short)));
  console.log('### ' + f + ' (' + hits.length + ')');
  for (const h of hits.slice(0, 6)) {
    const i = Math.max(h.t.indexOf(base), h.t.indexOf(short));
    console.log('   ' + h.where + ': ...' + h.t.slice(Math.max(0, i - 160), i + 160).replace(/\s+/g, ' ') + '...');
  }
}

// For each {file, quote}: find the quote in the validator's normalized text, map back to the raw HTML offset,
// and report the nearest element id above it. Usage: node anchor.js candidates.json
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const ents = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
function build(file) {
  const raw = fs.readFileSync(REPO + file, 'utf8');
  // blank out style/script exactly like the validator (removed entirely)
  const skip = []; for (const re of [/<style[\s\S]*?<\/style>/g, /<script[\s\S]*?<\/script>/g]) for (const m of raw.matchAll(re)) skip.push([m.index, m.index + m[0].length]);
  skip.sort((a, b) => a[0] - b[0]);
  let out = '', map = [], i = 0, lastSpace = true, s = 0;
  const push = (ch, at) => { if (/\s/.test(ch)) { if (!lastSpace) { out += ' '; map.push(at); lastSpace = true; } } else { out += ch; map.push(at); lastSpace = false; } };
  while (i < raw.length) {
    if (s < skip.length && i === skip[s][0]) { i = skip[s][1]; s++; continue; }
    if (raw[i] === '<') { const j = raw.indexOf('>', i); push(' ', i); i = j + 1; continue; }
    if (raw[i] === '&') { const e = Object.keys(ents).find(k => raw.startsWith(k, i)); if (e) { push(ents[e], i); i += e.length; continue; } }
    push(raw[i], i); i++;
  }
  const ids = [...raw.matchAll(/\sid="([^"]+)"/g)].map(m => [m.index, m[1]]);
  return { out, map, ids };
}
const cache = {};
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
const cands = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const c of cands) {
  const d = cache[c.file] || (cache[c.file] = build(c.file));
  const q = norm(c.quote), k = d.out.indexOf(q);
  if (k < 0) { console.log(`MISSING  ${c.id} [${c.file}] ${q.slice(0, 70)}`); continue; }
  const rawAt = d.map[k]; let near = null; for (const [at, id] of d.ids) { if (at < rawAt) near = id; else break; }
  const n = q.split(/\s+/).length;
  console.log(`${c.id}\t${c.file}#${near}\twords=${n}${n > 25 ? ' TOO-LONG' : ''}${c.anchor && c.anchor !== c.file + '#' + near ? '\tGIVEN=' + c.anchor : ''}`);
}

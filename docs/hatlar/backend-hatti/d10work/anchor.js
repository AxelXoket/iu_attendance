// Deterministic anchor finder for D10 inventory. Same text transform as inv-validate.js.
// Usage: node anchor.js facts.json  -> prints per fact: count of quote occurrences, nearest id above, and writes facts.out.json
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const transform = html => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
const docs = {};
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) {
  const html = fs.readFileSync(REPO + f, 'utf8');
  const text = transform(html);
  const ids = [];
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    const tagStart = html.lastIndexOf('<', m.index);
    ids.push({ id: m[1], L: transform(html.slice(0, tagStart)).length });
  }
  docs[f] = { text, ids };
}
const facts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0;
for (const d of facts) {
  const doc = docs[d.file];
  const q = norm(d.quote);
  const first = doc.text.indexOf(q);
  let count = 0, i = -1; while ((i = doc.text.indexOf(q, i + 1)) !== -1) count++;
  const words = q.split(/\s+/).length;
  if (first === -1) { console.log(`${d.id} NOT FOUND in ${d.file}: ${q.slice(0, 70)}`); bad++; continue; }
  let best = null; for (const x of doc.ids) if (x.L <= first) best = x.id;
  d.anchor = d.file + '#' + best;
  const flag = (count > 1 ? ' MULTI' + count : '') + (words > 25 ? ' LONG' + words : '');
  if (flag) bad++;
  console.log(`${d.id} ${d.anchor} words=${words}${flag}`);
}
fs.writeFileSync(process.argv[2].replace(/\.json$/, '.out.json'), JSON.stringify(facts, null, 2));
console.log(bad ? `PROBLEMS: ${bad}` : 'ALL QUOTES UNIQUE, <=25 WORDS');

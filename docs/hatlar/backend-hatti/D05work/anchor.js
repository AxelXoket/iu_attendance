// Fill anchors: for each decided fact with "src" (plan|teknik), find the quote in the validator-normalized text
// and set anchor to "<file>#<nearest preceding element id>". Reports misses, duplicates and word counts.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
function build(f) {
  let html = fs.readFileSync(REPO + f, 'utf8');
  html = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  // tags -> ' ', but id-bearing opening tags also leave a marker
  html = html.replace(/<[^>]+>/g, t => { const m = t.match(/^<[a-zA-Z0-9]+\b[^>]*\sid="([^"]+)"/); return m ? ' \u0001' + m[1] + '\u0002 ' : ' '; });
  html = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  let plain = '', marks = [], i = 0, prevWs = false;
  while (i < html.length) {
    const c = html[i];
    if (c === '\u0001') { const j = html.indexOf('\u0002', i); marks.push([plain.length, html.slice(i + 1, j)]); i = j + 1; continue; }
    if (/\s/.test(c)) { if (!prevWs) { plain += ' '; prevWs = true; } i++; continue; }
    plain += c; prevWs = false; i++;
  }
  return { plain, marks };
}
const docs = { plan: build('plan.html'), teknik: build('teknik.html') };
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
const file = process.argv[2];
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
let bad = 0;
for (const d of j.decided) {
  const src = d.src || String(d.anchor).split('.')[0];
  const doc = docs[src];
  const q = norm(d.quote);
  const idx = doc.plain.indexOf(q);
  const words = q.split(/\s+/).length;
  if (idx < 0) { console.log('MISS', d.id, src, q.slice(0, 80)); bad++; continue; }
  const second = doc.plain.indexOf(q, idx + 1);
  let id = null; for (const [p, k] of doc.marks) { if (p <= idx) id = k; else break; }
  d.anchor = src + '.html' + (id ? '#' + id : '');
  delete d.src;
  if (words > 25) { console.log('LONG', d.id, words); bad++; }
  if (second >= 0) console.log('DUP-OK', d.id, '(quote appears more than once; first occurrence used)');
}
fs.writeFileSync(file.replace(/\.src\.json$/, '.json'), JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log(bad ? bad + ' problems' : 'all quotes found', j.decided.length, 'facts');
for (const d of j.decided) console.log(d.id, d.anchor);

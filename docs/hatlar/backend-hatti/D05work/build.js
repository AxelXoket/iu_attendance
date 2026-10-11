// Build inv/D05.json from D05.src.js: compute each decided fact's anchor (nearest preceding element id
// in the validator-normalized text), verify every quote, check word counts and banned dashes.
const fs = require('fs'), path = require('path');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
function build(f) {
  let html = fs.readFileSync(REPO + f, 'utf8');
  html = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
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
const docs = { plan: build('plan.html'), teknik: build('teknik.html'), tasarim: build('tasarim.html') };
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
const j = require(path.resolve(process.argv[2]));
let bad = 0;
j.decided.forEach((d, n) => {
  d.id = 'D05-K' + String(n + 1).padStart(2, '0');
  const doc = docs[d.src];
  const q = norm(d.quote);
  const idx = doc.plain.indexOf(q);
  const words = q.split(/\s+/).length;
  if (idx < 0) { console.log('MISS', d.id, d.src, q.slice(0, 90)); bad++; return; }
  let id = null; for (const [p, k] of doc.marks) { if (p <= idx) id = k; else break; }
  d.anchor = d.src + '.html' + (id ? '#' + id : '');
  if (words > 25) { console.log('LONG', d.id, words); bad++; }
});
j.gaps.forEach((g, n) => { g.id = 'D05-B' + String(n + 1).padStart(2, '0'); });
j.contradictions.forEach((c, n) => { c.id = 'D05-C' + String(n + 1).padStart(2, '0'); });
const out = {
  id: j.id, title: j.title,
  decided: j.decided.map(d => ({ id: d.id, fact: d.fact, anchor: d.anchor, quote: d.quote })),
  gaps: j.gaps.map(g => ({ id: g.id, question: g.question, why: g.why, options: g.options, recommendation: g.recommendation, needs_owner: g.needs_owner })),
  contradictions: j.contradictions.map(c => ({ id: c.id, a: c.a, b: c.b, note: c.note })),
  entities: j.entities, endpoints: j.endpoints, jobs: j.jobs, depends_on: j.depends_on, touches_other_domains: j.touches_other_domains,
};
const s = JSON.stringify(out, null, 2) + '\n';
if (/[\u2013\u2014]/.test(s)) { console.log('BANNED DASH present'); bad++; }
fs.writeFileSync(process.argv[3], s, 'utf8');
console.log(bad ? bad + ' problems' : 'built OK', out.decided.length, 'facts,', out.gaps.length, 'gaps,', out.contradictions.length, 'contradictions');
if (process.argv[4] === '--anchors') out.decided.forEach(d => console.log(d.id, d.anchor, '|', d.quote.slice(0, 60)));

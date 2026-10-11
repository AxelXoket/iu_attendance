// Usage: node anchor.js <quotes.json>   quotes.json: [{file:"teknik.html", quote:"..."}]
// Prints for each quote: found?, all files containing it, nearest preceding id in the given file, occurrences count.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
function build(f) {
  const html = fs.readFileSync(REPO + f, 'utf8');
  const valText = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  let t = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  t = t.replace(/<[^>]+>/g, m => { const im = m.match(/\sid="([^"]+)"/); return im ? ' \u0001' + im[1] + '\u0002 ' : ' '; });
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const parts = t.split(/\u0001([^\u0002]*)\u0002/);
  let out = ''; const marks = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) { marks.push([out.length, parts[i]]); continue; }
    let seg = parts[i].replace(/\s+/g, ' ');
    if (out.endsWith(' ') && seg.startsWith(' ')) seg = seg.slice(1);
    out += seg;
  }
  if (out !== valText) console.error('WARN text mismatch for ' + f + ' ' + out.length + ' vs ' + valText.length);
  return { text: valText, marks, ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])) };
}
const docs = { 'plan.html': build('plan.html'), 'teknik.html': build('teknik.html'), 'tasarim.html': build('tasarim.html') };
const qs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const { file, quote } of qs) {
  const q = norm(quote);
  const where = Object.keys(docs).filter(k => docs[k].text.includes(q));
  const d = docs[file];
  const idx = d.text.indexOf(q);
  let near = null;
  if (idx >= 0) { for (const [p, id] of d.marks) { if (p <= idx) near = id; else break; } }
  const cnt = idx >= 0 ? d.text.split(q).length - 1 : 0;
  const words = q.split(/\s+/).length;
  console.log(`${idx >= 0 ? 'OK ' : 'NO '} ${file}#${near} occ=${cnt} words=${words} in=[${where.join(',')}] :: ${q.slice(0, 90)}`);
}

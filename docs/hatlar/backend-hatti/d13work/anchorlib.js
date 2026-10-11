// Locates a quote in plan/teknik/tasarim with the validator's text normalisation and returns the nearest id above it.
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
  if (out !== valText) throw new Error('text mismatch for ' + f);
  return { text: valText, marks };
}
const docs = {};
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) docs[f] = build(f);
function locate(file, quote) {
  const d = docs[file]; if (!d) throw new Error('unknown file ' + file);
  const q = norm(quote); const idx = d.text.indexOf(q);
  if (idx < 0) throw new Error('quote not found in ' + file + ': ' + q.slice(0, 80));
  let near = null; for (const [p, id] of d.marks) { if (p <= idx) near = id; else break; }
  const words = q.split(/\s+/).length;
  if (words > 25) throw new Error('quote over 25 words (' + words + '): ' + q.slice(0, 80));
  return file + (near ? '#' + near : '');
}
module.exports = { locate };

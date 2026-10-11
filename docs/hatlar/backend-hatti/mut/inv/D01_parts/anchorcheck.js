// For each decided fact: locate the quote in the file text and report the nearest element id above it.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const j = JSON.parse(fs.readFileSync(__dirname + '/../D01.json', 'utf8'));
const cache = {};
function build(f) {
  if (cache[f]) return cache[f];
  let html = fs.readFileSync(REPO + f, 'utf8');
  html = html.replace(/<style[\s\S]*?<\/style>/g, m => ' '.repeat(0)).replace(/<script[\s\S]*?<\/script>/g, '');
  let text = '', ids = [];
  const re = /<[^>]+>|[^<]+/g; let m;
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok[0] === '<') { const idm = tok.match(/\sid="([^"]+)"/); if (idm) ids.push([text.length, idm[1]]); text += ' '; }
    else text += tok.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  // collapse whitespace while remapping id positions
  let out = '', map = new Array(text.length + 1); let prevSpace = false;
  for (let i = 0; i < text.length; i++) { map[i] = out.length; const c = text[i]; if (/\s/.test(c)) { if (!prevSpace) out += ' '; prevSpace = true; } else { out += c; prevSpace = false; } }
  map[text.length] = out.length;
  ids = ids.map(([p, id]) => [map[p], id]);
  return (cache[f] = { text: out, ids });
}
const norm = s => String(s).replace(/\s+/g, ' ').trim();
let bad = 0;
for (const d of j.decided) {
  const [file, anchor] = d.anchor.split('#');
  const { text, ids } = build(file);
  const pos = text.indexOf(norm(d.quote));
  let near = null; for (const [p, id] of ids) { if (p <= pos) near = id; else break; }
  const count = text.split(norm(d.quote)).length - 1;
  if (near !== anchor || count !== 1) { bad++; console.log(d.id, 'anchor', anchor, 'nearest', near, 'occurrences', count); }
}
console.log(bad ? bad + ' to review' : 'all anchors are the nearest id above the quote, every quote unique');

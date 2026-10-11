// For each decided fact: locate the quote in the raw HTML (same text rules as inv-validate.js),
// find the last id="..." attribute before it, and compare with the fact's anchor.
const fs = require('fs'), path = require('path');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const inv = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'inv', 'D14.json'), 'utf8'));
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  let raw = fs.readFileSync(REPO + file, 'utf8');
  // Blank out style and script blocks with spaces so raw offsets stay valid.
  raw = raw.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, m => ' '.repeat(m.length));
  // Build text with a map back to raw offsets: tags become one space, entities decoded, whitespace collapsed.
  const ents = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
  let text = '', map = [], i = 0, lastSpace = true;
  const push = (ch, at) => {
    if (/\s/.test(ch)) { if (lastSpace) return; ch = ' '; lastSpace = true; } else lastSpace = false;
    text += ch; map.push(at);
  };
  while (i < raw.length) {
    if (raw[i] === '<') { const j = raw.indexOf('>', i); push(' ', i); i = j < 0 ? raw.length : j + 1; continue; }
    if (raw[i] === '&') { const e = Object.keys(ents).find(k => raw.startsWith(k, i)); if (e) { push(ents[e], i); i += e.length; continue; } }
    push(raw[i], i); i++;
  }
  const ids = [...raw.matchAll(/\sid="([^"]+)"/g)].map(m => ({ at: m.index, id: m[1] }));
  return (cache[file] = { raw, text, map, ids });
}

let bad = 0;
for (const d of inv.decided) {
  const [file, anchorId] = d.anchor.split('#');
  const doc = load(file);
  const q = norm(d.quote);
  const hits = [];
  for (let k = doc.text.indexOf(q); k >= 0; k = doc.text.indexOf(q, k + 1)) hits.push(k);
  if (!hits.length) { console.log(`${d.id} QUOTE NOT FOUND`); bad++; continue; }
  // Use the first occurrence whose nearest preceding id matches; report if none matches.
  const nearest = hits.map(h => { const rawAt = doc.map[h]; const before = doc.ids.filter(x => x.at < rawAt); return before.length ? before[before.length - 1].id : '(none)'; });
  if (!nearest.includes(anchorId)) { console.log(`${d.id} anchor=${anchorId} nearest=${[...new Set(nearest)].join('|')} occurrences=${hits.length}`); bad++; }
}
console.log(bad ? `${bad} mismatches` : `all ${inv.decided.length} anchors are the nearest id above their quote`);

// Checks each decided item: quote <= 25 words, and anchor id == nearest id preceding the quote in document order.
const fs = require('fs'), path = require('path');
const REPO = require('path').join(__dirname, '..', '..', 'belgeler').split(require('path').sep).join('/') + '/';
const inv = JSON.parse(fs.readFileSync(path.join(__dirname, 'inv', process.argv[2] + '.json'), 'utf8'));
const cache = {};
function load(f) {
  if (cache[f]) return cache[f];
  let html = fs.readFileSync(REPO + f, 'utf8');
  // blank out style/script but keep length so raw offsets stay valid
  html = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, m => ' '.repeat(m.length));
  const chars = [], map = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') { const j = html.indexOf('>', i); chars.push(' '); map.push(i); i = j + 1; continue; }
    if (html[i] === '&') {
      const ents = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
      const e = Object.keys(ents).find(k => html.startsWith(k, i));
      if (e) { chars.push(ents[e]); map.push(i); i += e.length; continue; }
    }
    chars.push(html[i]); map.push(i); i++;
  }
  // collapse whitespace keeping map of first char
  const out = [], omap = [];
  for (let k = 0; k < chars.length; k++) {
    const ws = /\s/.test(chars[k]);
    if (ws && out.length && out[out.length - 1] === ' ') continue;
    out.push(ws ? ' ' : chars[k]); omap.push(map[k]);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => ({ id: m[1], at: m.index }));
  return (cache[f] = { text: out.join(''), omap, ids });
}
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
let bad = 0;
for (const d of inv.decided) {
  const [file, anchor] = d.anchor.split('#');
  const doc = load(file);
  const q = norm(d.quote);
  const words = q.split(' ').length;
  const pos = doc.text.indexOf(q);
  if (pos < 0) { console.log(d.id, 'QUOTE NOT FOUND'); bad++; continue; }
  const raw = doc.omap[pos];
  const prev = doc.ids.filter(x => x.at < raw).pop();
  const nearest = prev ? prev.id : '(none)';
  const flags = [];
  if (words > 25) flags.push('words=' + words);
  if (nearest !== anchor) flags.push('nearest=' + nearest + ' anchor=' + anchor);
  if (flags.length) { console.log(d.id, flags.join(' | ')); bad++; }
}
console.log(bad ? `${bad} issue(s)` : `all ${inv.decided.length} anchors are nearest-above and quotes <= 25 words`);

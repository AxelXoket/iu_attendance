// Reproduces inv-validate.js text extraction with a source-offset map, so a quote can be
// located in the original HTML and its nearest preceding id="..." found deterministically.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const cache = {};

function build(file) {
  if (cache[file]) return cache[file];
  const html = fs.readFileSync(REPO + file, 'utf8');
  // ranges removed by the validator: <style>..</style> then <script>..</script>
  const removed = [];
  for (const re of [/<style[\s\S]*?<\/style>/g, /<script[\s\S]*?<\/script>/g]) {
    let m; while ((m = re.exec(html))) removed.push([m.index, m.index + m[0].length]);
  }
  removed.sort((a, b) => a[0] - b[0]);
  // step: tags -> ' ' (sticky match of /<[^>]+>/ at each '<')
  let chars = [], offs = [];
  const tagRe = /<[^>]+>/y;
  let i = 0, r = 0;
  while (i < html.length) {
    while (r < removed.length && removed[r][1] <= i) r++;
    if (r < removed.length && removed[r][0] <= i && i < removed[r][1]) { i = removed[r][1]; continue; }
    if (html[i] === '<') { tagRe.lastIndex = i; const m = tagRe.exec(html); if (m) { chars.push(' '); offs.push(i); i += m[0].length; continue; } }
    chars.push(html[i]); offs.push(i); i++;
  }
  // entities, in the validator's order
  for (const [ent, rep] of [['&nbsp;', ' '], ['&amp;', '&'], ['&quot;', '"'], ['&#39;', "'"]]) {
    const nc = [], no = [];
    for (let k = 0; k < chars.length; k++) {
      let hit = true;
      for (let t = 0; t < ent.length; t++) if (chars[k + t] !== ent[t]) { hit = false; break; }
      if (hit) { nc.push(rep); no.push(offs[k]); k += ent.length - 1; } else { nc.push(chars[k]); no.push(offs[k]); }
    }
    chars = nc; offs = no;
  }
  // collapse whitespace runs to one space
  const fc = [], fo = [];
  for (let k = 0; k < chars.length; k++) {
    if (/\s/.test(chars[k])) { if (fc.length && fc[fc.length - 1] === ' ' ) continue; fc.push(' '); fo.push(offs[k]); }
    else { fc.push(chars[k]); fo.push(offs[k]); }
  }
  const text = fc.join('');
  // ids with positions, skipping removed ranges
  const ids = [];
  const idRe = /\sid="([^"]+)"/g; let m;
  while ((m = idRe.exec(html))) { const p = m.index; if (!removed.some(([a, b]) => p >= a && p < b)) ids.push([p, m[1]]); }
  cache[file] = { html, text, offs: fo, ids };
  return cache[file];
}

const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

// Returns { ok, anchorId, occurrences:[ids] } ; `after` optionally forces the first occurrence after that id.
function locate(file, quote, after) {
  const d = build(file);
  const q = norm(quote);
  const occ = [];
  let from = 0, idx;
  while ((idx = d.text.indexOf(q, from)) !== -1) { occ.push(idx); from = idx + 1; }
  if (!occ.length) return { ok: false, occurrences: [] };
  const idAt = tpos => { const src = d.offs[tpos]; let best = ''; for (const [p, id] of d.ids) { if (p < src) best = id; else break; } return best; };
  const occIds = occ.map(idAt);
  let pick = 0;
  if (after) {
    const ap = (d.ids.find(([, id]) => id === after) || [])[0];
    if (ap !== undefined) { const k = occ.findIndex(t => d.offs[t] > ap); if (k >= 0) pick = k; }
  }
  return { ok: true, anchorId: occIds[pick], occurrences: occIds };
}

module.exports = { locate, build, norm };

if (require.main === module) {
  const [file, ...rest] = process.argv.slice(2);
  console.log(JSON.stringify(locate(file, rest.join(' '))));
}

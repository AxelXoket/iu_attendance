// Stricter than inv-validate.js: for each decided fact, find every occurrence of the quote in the
// validator's text form and report the nearest element id above that occurrence.
// Usage: node nearest.js <inventory.json>
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").trim();

// Build the same text the validator builds, but keep, for every output character, the last id seen.
function build(file) {
  let html = fs.readFileSync(REPO + file, 'utf8');
  html = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const chars = [];
  const ids = [];
  let cur = '';
  const re = /<[^>]+>/g;
  let last = 0, m;
  const pushText = (s) => {
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    for (const ch of s) { chars.push(ch); ids.push(cur); }
  };
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    const idm = m[0].match(/\sid="([^"]+)"/);
    if (idm) cur = idm[1];
    chars.push(' '); ids.push(cur);
    last = re.lastIndex;
  }
  pushText(html.slice(last));
  // collapse whitespace runs, carrying the id of the first char of each run
  const outC = [], outI = [];
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) {
      if (outC.length && outC[outC.length - 1] === ' ') continue;
      outC.push(' '); outI.push(ids[i]);
    } else { outC.push(chars[i]); outI.push(ids[i]); }
  }
  return { text: outC.join(''), ids: outI };
}

const docs = {};
for (const f of ['plan.html', 'teknik.html', 'tasarim.html']) docs[f] = build(f);

const inv = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
let bad = 0;
for (const d of inv.decided) {
  const [file, anchor] = String(d.anchor).split('#');
  const q = norm(d.quote);
  const doc = docs[file];
  if (!doc) { console.log(`${d.id} BAD FILE ${d.anchor}`); bad++; continue; }
  // the validator text array is built from chars; indexOf on the joined string is valid because
  // every char (including multi-unit ones) was pushed as one element only for BMP text; map via a scan
  const text = doc.text;
  const occ = [];
  let from = 0, k;
  while ((k = text.indexOf(q, from)) !== -1) { occ.push(k); from = k + 1; }
  const words = q.split(/\s+/).length;
  if (!occ.length) { console.log(`${d.id} QUOTE NOT FOUND in ${file}: "${q.slice(0, 70)}"`); bad++; continue; }
  // map string index to array index (code units vs code points): rebuild prefix lengths
  const near = occ.map(idx => {
    const prefix = text.slice(0, idx);
    const cpIndex = Array.from(prefix).length;
    return doc.ids[cpIndex];
  });
  const ok = near.includes(anchor);
  if (!ok || words > 25) {
    bad++;
    console.log(`${d.id} ${ok ? '' : 'ANCHOR MISMATCH'} ${words > 25 ? 'TOO LONG ' + words : ''} anchor=${anchor} nearest=[${[...new Set(near)].join(', ')}] occurrences=${occ.length}`);
  }
}
console.log(bad ? `${bad} problem(s)` : `all ${inv.decided.length} anchors are the nearest id above an occurrence, all quotes <= 25 words`);

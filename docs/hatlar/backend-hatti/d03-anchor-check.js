// Checks, for every decided fact in inv/<ID>.json, that the anchor is the nearest element id
// above the quote (document order) and that the quote has at most 25 words.
// Usage: node d03-anchor-check.js D03
const fs = require('fs'), path = require('path');
const id = process.argv[2] || 'D03';
const REPO = require('path').join(__dirname, '..', '..', 'belgeler').split(require('path').sep).join('/') + '/';
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = s => String(s).replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

function index(file) {
  const html = fs.readFileSync(REPO + file, 'utf8')
    .replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  // Walk tags and text; every character of the normalized text remembers the last id seen.
  let text = '', owner = [], cur = null;
  const re = /<[^>]+>|[^<]+/g; let m;
  const push = (chunk) => {
    for (const ch of chunk) {
      const c = /\s/.test(ch) ? ' ' : ch;
      if (c === ' ' && text.endsWith(' ')) continue;
      text += c; owner.push(cur);
    }
  };
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok.startsWith('<')) {
      const idm = tok.match(/\sid="([^"]+)"/);
      push(' ');
      if (idm) cur = idm[1];
    } else push(decode(tok));
  }
  return { text, owner };
}

const idx = {};
const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'inv', id + '.json'), 'utf8'));
let bad = 0;
for (const d of j.decided) {
  const [file, frag] = d.anchor.split('#');
  idx[file] = idx[file] || index(file);
  const { text, owner } = idx[file];
  const q = norm(d.quote);
  const pos = text.indexOf(q);
  const hits = text.split(q).length - 1;
  const words = d.quote.split(/\s+/).length;
  const nearest = pos >= 0 ? owner[pos] : null;
  const ok = pos >= 0 && nearest === frag && words <= 25;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${d.id} words=${words} hits=${hits} anchor=${frag} nearest=${nearest}`);
}
console.log(bad ? `${bad} problem(s)` : 'all anchors are the nearest id above their quote; all quotes <= 25 words');
process.exit(bad ? 1 : 0);

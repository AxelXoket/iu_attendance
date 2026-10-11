// Checks every relative link in the documents folder: the target file exists and, when a #fragment is given,
// the target has that id. Also flags U+2013/U+2014 and the sahip stem. Usage: node link-check.js <belgeler dir>
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]);
const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) files.push(p); } };
walk(root);
const idCache = new Map();
const idsOf = f => { if (!idCache.has(f)) idCache.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))); return idCache.get(f); };
const errs = []; let links = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/[–—]/.test(s)) errs.push(`${path.relative(root, f)}: U+2013 or U+2014`);
  if (path.relative(root, f).startsWith('backend') && /sahi[pb]/i.test(s.replace(/<style[\s\S]*?<\/style>/g, ''))) errs.push(`${path.relative(root, f)}: sahip stem`);
  for (const m of s.matchAll(/href="([^"]+)"/g)) {
    const h = m[1]; if (/^(https?:|mailto:|data:)/.test(h) || h.includes("' +") || h.includes("+ '")) continue; links++;
    const [file, frag] = h.split('#');
    const target = file ? path.resolve(path.dirname(f), file) : f;
    if (!fs.existsSync(target)) { errs.push(`${path.relative(root, f)}: missing file ${h}`); continue; }
    if (frag && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(frag))) errs.push(`${path.relative(root, f)}: missing anchor ${h}`);
  }
}
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 30).join('\n')); process.exit(1); }
console.log(`OK ${files.length} pages, ${links} links, every target and anchor exists`);

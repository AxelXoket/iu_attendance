// Render an HTML doc to readable text: keeps source line numbers, marks element ids as [#id], marks cell/list boundaries.
const fs = require('fs');
const f = process.argv[2], out = process.argv[3];
let html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + f, 'utf8');
html = html.replace(/<style[\s\S]*?<\/style>/g, m => '\n'.repeat((m.match(/\n/g) || []).length)).replace(/<script[\s\S]*?<\/script>/g, m => '\n'.repeat((m.match(/\n/g) || []).length));
const lines = html.split('\n').map((l, i) => {
  let t = l.replace(/<([a-zA-Z0-9]+)\b[^>]*\sid="([^"]+)"[^>]*>/g, ' [#$2] ')
    .replace(/<\/(td|th)>/g, ' ¦ ').replace(/<\/tr>/g, ' ⏎ ').replace(/<li[^>]*>/g, ' • ').replace(/<br\s*\/?>/g, ' ⏎ ')
    .replace(/<\/(p|h1|h2|h3|h4|div|ul|ol|table|li|summary|details|section)>/g, ' ⏎ ')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').trim();
  return t ? (i + 1) + ': ' + t : null;
}).filter(Boolean);
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(f, lines.length, 'nonempty lines', fs.statSync(out).size, 'bytes');

// Usage: node sec.js <doc> <id> [maxChars]
// Prints the text of the element carrying id="<id>"; for a heading, the text until the next heading of the same or higher level.
const fs = require('fs');
const [doc, id, max] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const S = String.fromCharCode(92) + 's';
const re = new RegExp('<([a-zA-Z0-9]+)(' + S + '[^>]*)?' + S + 'id="' + id + '"[^>]*>');
const m = re.exec(html);
if (!m) { console.log('NOT FOUND ' + id); process.exit(1); }
const tag = m[1];
let end;
if (/^h[1-6]$/.test(tag)) {
  const lvl = +tag[1];
  const hre = /<h([1-6])[ >]|<\/section>/g; hre.lastIndex = m.index + m[0].length;
  let hm; end = html.length;
  while ((hm = hre.exec(html))) { if (hm[0] === '</section>' || +hm[1] <= lvl) { end = hm.index; break; } }
} else {
  let depth = 1;
  const open = new RegExp('<' + tag + '([ ][^>]*)?>|</' + tag + '>', 'g');
  open.lastIndex = m.index + m[0].length; let mm;
  while ((mm = open.exec(html))) { if (mm[0].startsWith('</')) depth--; else depth++; if (depth === 0) break; }
  end = mm ? mm.index : html.length;
}
let s = html.slice(m.index, end);
s = s.replace(/<(br|\/p|\/li|\/tr|\/h[1-6]|\/div|\/summary|\/dt|\/dd)[^>]*>/g, '\n').replace(/<td[^>]*>/g, ' | ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\r/g, '').replace(/\n[ \t]*\n+/g, '\n');
console.log('[' + tag + '#' + id + '] ' + (max ? s.slice(0, +max) : s));

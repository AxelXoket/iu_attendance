// Print the plain text of an element by id from plan.html, teknik.html or tasarim.html.
// Usage: node sec.js plan kararlar [maxChars]
const fs = require('fs');
const [doc, id, maxArg] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const max = Number(maxArg || 60000);
const m = new RegExp('<([a-z0-9]+)([^>]*\\sid="' + id + '"[^>]*)>').exec(html);
if (!m) { console.log('NO ID ' + id); process.exit(1); }
const tag = m[1];
let start = m.index, end;
if (/^h[1-6]$/.test(tag)) {
  const lvl = Number(tag[1]);
  const re = new RegExp('<h[1-' + lvl + '][\\s>]|</section>', 'g');
  re.lastIndex = start + m[0].length;
  const n = re.exec(html);
  end = n ? n.index : html.length;
} else {
  const re = new RegExp('<' + tag + '[\\s>]|</' + tag + '>', 'g');
  re.lastIndex = start + m[0].length;
  let depth = 1, n;
  while ((n = re.exec(html))) { if (n[0][1] === '/') { if (--depth === 0) { end = n.index + n[0].length; break; } } else depth++; }
  if (!end) end = html.length;
}
let t = html.slice(start, end)
  .replace(/<(br|\/p|\/li|\/h[1-6]|\/tr|\/summary|\/div)[^>]*>/g, '\n')
  .replace(/<a [^>]*href="([^"]+)"[^>]*>/g, '[$1]')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
console.log('### ' + doc + '#' + id + ' <' + tag + '> ' + (end - start) + ' bytes');
console.log(t.slice(0, max));

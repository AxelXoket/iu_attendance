// Print plain text of the element carrying each given id (plan/teknik), to read anchored passages.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const [doc, ...ids] = process.argv.slice(2);
const html = fs.readFileSync(REPO + doc + '.html', 'utf8');
function elementAt(id) {
  const re = new RegExp('<([a-z0-9]+)([^>]*)\\sid="' + id + '"[^>]*>', 'i');
  const m = re.exec(html); if (!m) return null;
  const tag = m[1]; let i = m.index + m[0].length, depth = 1;
  const open = new RegExp('<' + tag + '(\\s[^>]*)?>', 'gi'), close = new RegExp('</' + tag + '>', 'gi');
  while (depth > 0) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(html), c = close.exec(html);
    if (!c) break;
    if (o && o.index < c.index) { depth++; i = o.index + o[0].length; } else { depth--; i = c.index + c[0].length; }
  }
  return html.slice(m.index, i);
}
const strip = s => s.replace(/<a [^>]*href="([^"]+)"[^>]*>/g, '[$1 ').replace(/<\/a>/g, ']').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
for (const id of ids) { const e = elementAt(id); console.log('##### ' + doc + '#' + id + (e ? '' : ' NOT FOUND')); if (e) console.log(strip(e)); }

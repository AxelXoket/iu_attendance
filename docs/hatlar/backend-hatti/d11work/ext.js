// Usage: node ext.js <doc> <id> [raw]  -> prints the element with that id (text, or raw HTML)
const fs = require('fs');
const [doc, id, raw] = process.argv.slice(2);
const h = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const re = new RegExp('<([a-z0-9]+)(?:\\s[^>]*)?\\sid="' + id + '"[^>]*>', 'i');
const m = re.exec(h);
if (!m) { console.log('NOT FOUND ' + id); process.exit(1); }
const tag = m[1].toLowerCase();
let depth = 0, end = -1;
const tre = new RegExp('<(/?)' + tag + '(\\s[^>]*)?>', 'gi');
tre.lastIndex = m.index;
let t;
while ((t = tre.exec(h))) { if (t[1]) { depth--; if (depth === 0) { end = t.index + t[0].length; break; } } else depth++; }
const frag = h.slice(m.index, end);
if (raw) { console.log(frag); process.exit(0); }
console.log(frag.replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/summary|\/tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\n\s*\n+/g, '\n'));

// Usage: node ext2.js <doc> <id> [maxChars] -> text from the element with that id up to the next element carrying an id
const fs = require('fs');
const [doc, id, max] = process.argv.slice(2);
const h = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const at = h.indexOf(' id="' + id + '"');
if (at < 0) { console.log('NOT FOUND ' + id); process.exit(1); }
const start = h.lastIndexOf('<', at);
const nextId = h.indexOf(' id="', at + 5);
const stop = nextId < 0 ? h.length : h.lastIndexOf('<', nextId);
const frag = h.slice(start, Math.min(stop, start + (Number(max) || 20000)));
console.log(frag.replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/summary|\/tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\n\s*\n+/g, '\n'));

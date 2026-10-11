// Print the plain text of a section of plan/teknik/tasarim.html from the element carrying id= up to the next id= element.
// usage: node sec.js plan kararlar-kafa-sayisi [maxChars]
const fs = require('fs');
const [doc, id, max] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const i = html.indexOf(`id="${id}"`);
if (i < 0) { console.log('NO ID ' + id); process.exit(1); }
const start = html.lastIndexOf('<', i);
const rest = html.slice(i + id.length + 5);
const re = /\sid="[^"]+"/g; let m, end = html.length;
while ((m = re.exec(rest))) { end = i + id.length + 5 + m.index; break; }
let seg = html.slice(start, end);
seg = seg.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div|\/summary)[^>]*>/g, '\n').replace(/<td[^>]*>/g, ' | ').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n\s*\n+/g, '\n');
console.log(seg.slice(0, Number(max) || 20000));

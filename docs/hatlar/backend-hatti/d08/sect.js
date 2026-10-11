// Print plain text of a section of plan/teknik/tasarim from id until the next id in the given list order.
const fs = require('fs');
const [doc, id, maxLen] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => ({ id: m[1], i: m.index }));
const k = ids.findIndex(x => x.id === id);
if (k < 0) { console.log('no id'); process.exit(1); }
const start = ids[k].i, end = k + 1 < ids.length ? ids[k + 1].i : html.length;
let t = html.slice(start, end).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<(br|\/p|\/li|\/div|\/h[1-6]|\/tr|\/summary)[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
console.log(t.slice(0, Number(maxLen || 20000)));

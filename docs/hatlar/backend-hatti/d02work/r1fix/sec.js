// Print the visible text of a section of plan.html or teknik.html by anchor id, up to the next element carrying an id.
const fs = require('fs');
const [doc, id, max] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const i = html.indexOf(' id="' + id + '"');
if (i < 0) { console.log('no id'); process.exit(1); }
const rest = html.slice(i);
const m = rest.slice(10).search(/ id="[^"]+"/);
const chunk = m < 0 ? rest : rest.slice(0, m + 10);
const text = chunk.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
console.log(text.slice(0, Number(max || 4000)));

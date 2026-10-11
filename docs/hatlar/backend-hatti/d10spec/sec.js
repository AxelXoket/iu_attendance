// Usage: node sec.js <doc> <id> [maxChars]
// Prints the stripped text of the element carrying that id, up to the next id-bearing block element.
const fs = require('fs');
const [doc, id, max] = process.argv.slice(2);
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/' + doc + '.html', 'utf8');
const needle = ' id="' + id + '"';
const at = html.indexOf(needle);
if (at < 0) { console.log('NOT FOUND'); process.exit(1); }
const start = html.lastIndexOf('<', at);
const tagEnd = html.indexOf('>', at);
const rest = html.slice(tagEnd + 1);
const nx = /<(section|h2|h3|h4|details|div|li)[^>]*\sid="[^"]+"/i.exec(rest);
const end = nx ? tagEnd + 1 + nx.index : html.length;
const chunk = html.slice(start, end);
const txt = chunk
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<br\s*\/?>/g, '\n')
  .replace(/<\/(p|li|tr|h[1-6]|div|summary|dt|dd)>/g, '\n')
  .replace(/<\/t[dh]>/g, ' | ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/\n\s*\n+/g, '\n').trim();
console.log(txt.slice(0, +max || 20000));

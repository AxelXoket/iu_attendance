// For tasarim quotes: list ids of elements that ENCLOSE the quote's first word in raw HTML (innermost last).
const fs = require('fs');
const html = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/tasarim.html', 'utf8');
const probes = process.argv.slice(2);
for (const p of probes) {
  const pos = html.indexOf(p);
  if (pos < 0) { console.log('NOT IN RAW: ' + p); continue; }
  // walk tags before pos, maintain a stack of open elements with ids
  const stack = [];
  const re = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g; let m;
  const voids = new Set(['br','img','meta','link','input','hr','col','source','wbr','area','base','embed','param','track']);
  while ((m = re.exec(html)) && m.index < pos) {
    const tag = m[1].toLowerCase(), isClose = m[0][1] === '/', self = /\/>$/.test(m[0]) || voids.has(tag);
    if (isClose) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.splice(i); break; } }
    else if (!self) { const idm = m[2].match(/\sid="([^"]+)"/); stack.push({ tag, id: idm ? idm[1] : null }); }
  }
  console.log(p.slice(0, 40) + ' => ' + stack.filter(s => s.id).map(s => s.id).join(' > '));
}

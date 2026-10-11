// Usage: node count.js file.json  -> words per paragraph, total, phase-word mentions
const o = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const w = s => s.split(/\s+/).filter(Boolean).length;
o.paragraflar.forEach((p, i) => console.log('p' + (i + 1), w(p)));
console.log('total', o.paragraflar.reduce((a, p) => a + w(p), 0), 'baslik', w(o.baslik));
const t = o.paragraflar.join(' ');
console.log('asama mentions:', [...t.matchAll(/\S*\s?\S*aşama\S*/gi)].map(m => m[0]));
console.log('ids:', [...new Set(t.match(/D\d\d-P\d\d/g))].length);

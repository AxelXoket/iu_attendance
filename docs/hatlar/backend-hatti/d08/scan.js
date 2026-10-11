const fs = require('fs');
const t = fs.readFileSync('spec/D08.json', 'utf8') + fs.readFileSync('frag/D08.html', 'utf8');
const bad = { dashes: /[\u2010-\u2015\u2212]/g, kvkk: /KVKK/gi, asama: /Aşama/g, sponsor: /sponsor/gi, ai: /\b(delve|crucial|robust|comprehensive|nuanced|multifaceted|furthermore|moreover|pivotal|landscape|tapestry|underscore|foster|showcase|intricate|vibrant|fundamental|significant|interplay)\b/gi };
for (const [k, re] of Object.entries(bad)) { const m = t.match(re); console.log(k.padEnd(8), m ? m.length + ' ' + [...new Set(m)].join(',') : 0); }

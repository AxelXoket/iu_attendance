// Per-row word counts, same tokenizer as secgate.js. node rows.js file.html
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
const body=x=>x.replace(/<!--[\s\S]*?-->/g,'');
const ent=x=>x.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const text=x=>ent(body(x).replace(/<[^>]+>/g,'\n')).replace(/[ \t]+/g,' ');
const words=x=>text(x).split(/\s+/).filter(Boolean).length;
let tot=words(s);let rowsum=0;
const rows=[...s.matchAll(/<div class="row"><div class="k">([^<]*)<\/div><div>([\s\S]*?)<\/div><\/div>/g)];
for(const m of rows){const w=words(m[2]);rowsum+=w;console.log(m[1].padEnd(20),String(w).padStart(4))}
console.log('rows body total',rowsum,'| file total',tot,'| outside rows',tot-rowsum);

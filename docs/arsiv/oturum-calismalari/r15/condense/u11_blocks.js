// per-block word counts, in vs out: node u11_blocks.js in out
const fs=require('fs');const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const words=s=>ent(s.replace(/<[^>]+>/g,' ')).split(/\s+/).filter(Boolean).length;
const blocks=s=>{const b=s.replace(/<pre>[\s\S]*?<\/pre>/g,'').replace(/<!--[\s\S]*?-->/g,'');return [...b.matchAll(/<li>([\s\S]*?)<\/li>|<p>([\s\S]*?)<\/p>|<div class="row">([\s\S]*?)<\/div><\/div>/g)].map(m=>m[0])};
const a=blocks(A),b=blocks(B);let ta=0,tb=0;
a.forEach((x,i)=>{const wa=words(x),wb=words(b[i]||'');ta+=wa;tb+=wb;console.log(String(i).padStart(2),String(wa).padStart(3),'->',String(wb).padStart(3),(wb/wa).toFixed(2),ent(x.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim().slice(0,60))});
console.log('blocks total',ta,'->',tb,(tb/ta).toFixed(3));

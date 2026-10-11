// Prints each item (li, card p, row value) of IN and OUT one after the other for a side-by-side meaning review.
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const strip=s=>s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const items=s=>[...s.matchAll(/<li>([\s\S]*?)<\/li>|<h3>[^<]*<\/h3>\s*<p>([\s\S]*?)<\/p>|<div class="k">[^<]*<\/div><div>([\s\S]*?)<\/div><\/div>/g)].map(m=>strip(m[1]||m[2]||m[3]));
const a=items(A),b=items(B);
a.forEach((x,i)=>{console.log('#'+(i+1)+' IN : '+x);console.log('#'+(i+1)+' OUT: '+b[i]);console.log()});

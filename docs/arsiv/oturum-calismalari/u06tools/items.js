// Per-block word counts, IN vs OUT, using the same word rule as secgate.js.
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const blocks=s=>{s=s.replace(/<!--[\s\S]*?-->/g,'');const out=[];const re=/<(li|p|h2|h3|summary)\b[^>]*>([\s\S]*?)<\/\1>/g;let m;while((m=re.exec(s)))out.push(ent(m[2].replace(/<[^>]+>/g,'\n')).replace(/[ \t]+/g,' '));return out};
const w=t=>t.split(/\s+/).filter(Boolean).length;
const a=blocks(A),b=blocks(B);
if(a.length!==b.length)console.log('BLOCK COUNT DIFF',a.length,b.length);
let ta=0,tb=0;
a.forEach((x,i)=>{const wa=w(x),wb=w(b[i]||'');ta+=wa;tb+=wb;console.log(String(i).padStart(2),String(wa).padStart(4),String(wb).padStart(4),(wb/wa).toFixed(2),x.replace(/\s+/g,' ').trim().slice(0,60))});
console.log('blocks total',ta,tb,(tb/ta).toFixed(3));

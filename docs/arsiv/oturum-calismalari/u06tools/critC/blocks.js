// per-line word counts, same tokenizer as secgate
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const w=l=>ent(l.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'\n')).split(/\s+/).filter(Boolean).length;
const la=A.split('\n'),lb=B.split('\n');let ta=0,tb=0;
for(let i=0;i<Math.max(la.length,lb.length);i++){const a=w(la[i]||''),b=w(lb[i]||'');ta+=a;tb+=b;if(a||b)console.log(String(i+1).padStart(3),String(a).padStart(4),String(b).padStart(4),(b/a).toFixed(2),(lb[i]||'').trim().slice(0,60));}
console.log('tot',ta,tb,(tb/ta).toFixed(3));

// Per-item word counts (gate tokenisation) for in vs out: li, card p, row value.
const fs=require('fs');
const [A,B]=process.argv.slice(2).map(f=>fs.readFileSync(f,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const wc=s=>ent(s.replace(/<[^>]+>/g,'\n')).split(/\s+/).filter(Boolean).length;
const items=s=>{const out=[];
 for(const m of s.matchAll(/<li>([\s\S]*?)<\/li>/g)){const k=(m[1].match(/<strong>([^<]*)<\/strong>/)||[,'li'])[1];out.push([k,wc(m[1])])}
 for(const m of s.matchAll(/<h3>([^<]*)<\/h3>\s*<p>([\s\S]*?)<\/p>/g))out.push([m[1],wc(m[2])]);
 for(const m of s.matchAll(/<div class="k">([^<]*)<\/div><div>([\s\S]*?)<\/div><\/div>/g))out.push([m[1],wc(m[2])]);
 return out};
const a=items(A),b=items(B);let ta=0,tb=0;
a.forEach(([k,n],i)=>{const m=b[i]?b[i][1]:0;ta+=n;tb+=m;console.log(k.padEnd(24),String(n).padStart(4),String(m).padStart(4),(m/n).toFixed(2))});
console.log('TOTAL'.padEnd(24),String(ta).padStart(4),String(tb).padStart(4),(tb/ta).toFixed(2));

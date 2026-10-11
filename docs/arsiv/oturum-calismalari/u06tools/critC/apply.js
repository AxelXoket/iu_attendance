// Apply proposals to a copy of OUT; each old string must occur exactly once. Prints per-proposal word saving.
const fs=require('fs');
const SRC='../../r15/condense/units/u06.out.html', DST='u06.critC.html';
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const wc=s=>ent(s.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'\n')).split(/\s+/).filter(Boolean).length;
const P=require('./props.js');
let t=fs.readFileSync(SRC,'utf8');const rows=[];let bad=0;
for(const [id,o,n] of P){const k=t.split(o).length-1;if(k!==1){console.log('NOT UNIQUE/FOUND',id,k);bad++;continue}
 const before=wc(t);t=t.replace(o,()=>n);rows.push([id,before-wc(t)]);}
fs.writeFileSync(DST,t);
rows.sort((a,b)=>b[1]-a[1]);for(const r of rows)console.log(r[0].padEnd(6),'-'+r[1]);
console.log('total saved',rows.reduce((s,r)=>s+r[1],0),'bad',bad);

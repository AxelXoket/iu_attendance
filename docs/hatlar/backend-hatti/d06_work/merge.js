const fs=require('fs');
const rd=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const decided=[...rd('decided1.json'),...rd('decided2.json'),...rd('decided3.json'),...rd('decided4.json')];
const gaps=[...rd('gaps1.json'),...rd('gaps2.json'),...rd('gaps3.json')];
const rest=rd('rest.json');
const pad=n=>String(n).padStart(2,'0');
const fix=s=>typeof s==='string'?s.replace(/bkz\. B(\d\d)/g,'bkz. D06-B$1'):s;
const out={id:'D06',title:'Gönderme ve eşitleme',
 decided:decided.map((d,i)=>({id:'D06-K'+pad(i+1),fact:d.fact,anchor:d.anchor,quote:d.quote})),
 gaps:gaps.map((g,i)=>({id:'D06-B'+pad(i+1),question:fix(g.question),why:fix(g.why),options:g.options.map(fix),recommendation:fix(g.recommendation),needs_owner:g.needs_owner})),
 contradictions:rest.contradictions.map((c,i)=>({id:'D06-C'+pad(i+1),a:c.a,b:c.b,note:c.note})),
 entities:rest.entities,endpoints:rest.endpoints,jobs:rest.jobs,depends_on:rest.depends_on,touches_other_domains:rest.touches_other_domains};
const s=JSON.stringify(out,null,2);
if(/[–—]/.test(s)) console.log('DASH FOUND');
fs.writeFileSync('../inv/D06.json',s,'utf8');
console.log('decided',out.decided.length,'gaps',out.gaps.length,'contradictions',out.contradictions.length);
// long quote check (task limit 25 words)
out.decided.forEach(d=>{const n=d.quote.split(/\s+/).length; if(n>25) console.log('LONG',d.id,n);});

// Read-only: load all packages/*.json (or r1 snapshot with --r1), compute level/tail like critical-report.js, show module M.
const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const args=process.argv.slice(2); const M=args[0]||'D15'; const r1=args.includes('--r1'); const over=args.find(a=>a.startsWith('--d15='));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const all=[];
for(const f of fs.readdirSync(path.join(B,'packages')).filter(f=>/^D\d\d\.json$/.test(f))){
  let file=path.join(B,r1?'packages/r1':'packages',f);
  if(over&&f==='D15.json') file=over.slice(6);
  const P=read(file); for(const p of P.packages) all.push({...p,module:P.id});
}
const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
const by=new Map(all.map(p=>[p.id,p]));
for(const p of all){ p.after=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])]; }
const miss=[]; for(const p of all) for(const n of p.needs||[]) if(!prov.has(n)) miss.push(p.id+' '+n);
const kids=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.after) if(kids.has(d)) kids.get(d).push(p.id);
const lv=new Map(),tl=new Map();
const level=(id,st=[])=>{if(lv.has(id))return lv.get(id); if(st.includes(id)) throw new Error('cycle '+st.join('>')+'>'+id); const v=Math.max(0,...by.get(id).after.filter(d=>by.has(d)).map(d=>level(d,[...st,id])+1)); lv.set(id,v); return v;};
const tail=id=>{if(tl.has(id))return tl.get(id); const v=1+Math.max(0,...kids.get(id).map(tail)); tl.set(id,v); return v;};
all.forEach(p=>{level(p.id);tail(p.id);});
const chain=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
console.log('packages',all.length,'chain',chain, 'missing needs',miss.length?miss.join('; '):'none');
for(const p of all.filter(p=>p.module===M)){
  const L=lv.get(p.id),T=tl.get(p.id);
  const bind=p.after.filter(d=>lv.get(d)+1===L).map(d=>d+'('+lv.get(d)+')');
  const late=kids.get(p.id).filter(k=>tl.get(k)+1===T).map(k=>k+'('+tl.get(k)+')');
  console.log(`${L+T>20?'LATE':'ok  '} ${p.id} ${p.size} L${L} T${T} =${L+T} | ${p.title.slice(0,50)} | waits ${bind.join(',')} | by ${late.join(',')}`);
}
if(args.includes('--chain')){ // print one longest chain
  let start=all.filter(p=>lv.get(p.id)===0).sort((a,b)=>tl.get(b.id)-tl.get(a.id))[0].id; const c=[start];
  while(kids.get(c[c.length-1]).length){const k=kids.get(c[c.length-1]).sort((a,b)=>tl.get(b)-tl.get(a))[0]; c.push(k);} console.log(c.join(' > '));
}

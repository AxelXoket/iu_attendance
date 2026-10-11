// read-only analysis: level and tail of every package from current packages/*.json
const fs=require('fs'),path=require('path');
const D='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages';
const all=[];
for(const f of fs.readdirSync(D).filter(f=>/^D\d\d\.json$/.test(f))){
  const OV=process.env.OV&&f==='D05.json'?process.env.OV:null; let P; try{P=JSON.parse(fs.readFileSync(OV||path.join(D,f),'utf8').replace(/^\uFEFF/,''));}catch(e){console.log('PARSE FAIL',f);continue;}
  for(const p of P.packages) all.push({...p,module:f.slice(0,3)});
}
const by=new Map(all.map(p=>[p.id,p]));
const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
for(const p of all){ p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])]; p.why={}; for(const d of p.depends_on||[]) (p.why[d]=p.why[d]||[]).push('dep'); for(const n of p.needs||[]){const q=prov.get(n); if(q)(p.why[q]=p.why[q]||[]).push(n);} }
const missing=[]; for(const p of all) for(const n of p.needs||[]) if(!prov.has(n)) missing.push(p.id+':'+n);
const dep=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.deps) if(dep.has(d)) dep.get(d).push(p.id);
const lv=new Map(), tl=new Map();
const L=(id,st=new Set())=>{ if(lv.has(id))return lv.get(id); if(st.has(id)){console.log('CYCLE',id);return 0;} st.add(id); const p=by.get(id); const v=Math.max(0,...p.deps.filter(d=>by.has(d)).map(d=>L(d,st)+1)); st.delete(id); lv.set(id,v); return v;};
const T=(id,st=new Set())=>{ if(tl.has(id))return tl.get(id); if(st.has(id))return 0; st.add(id); const v=1+Math.max(0,...dep.get(id).map(d=>T(d,st))); st.delete(id); tl.set(id,v); return v;};
all.forEach(p=>{L(p.id);T(p.id);});
const chain=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
console.log('packages',all.length,'longest chain',chain,'missing needs',missing.length, missing.slice(0,10).join(' '));
const mod=process.argv[2]||'D05';
for(const p of all.filter(p=>p.module===mod)){
  console.log(p.id,p.size,'level',lv.get(p.id),'tail',tl.get(p.id),'sum',lv.get(p.id)+tl.get(p.id),'|',p.title);
  const bind=p.deps.filter(d=>by.has(d)).sort((a,b)=>lv.get(b)-lv.get(a));
  for(const d of bind.slice(0,4)) console.log('   waits',d,'lv',lv.get(d),p.why[d].join(','));
  const w=dep.get(p.id).sort((a,b)=>tl.get(b)-tl.get(a));
  for(const d of w.slice(0,5)) console.log('   waitedBy',d,'tail',tl.get(d),(by.get(d).why[p.id]||[]).join(','));
}
// print the longest chain through each given package
if(process.argv[3]){
  for(const start of process.argv.slice(3)){
    const back=[]; let c=start; while(true){const p=by.get(c); const ds=p.deps.filter(d=>by.has(d)); if(!ds.length)break; c=ds.sort((a,b)=>lv.get(b)-lv.get(a))[0]; back.unshift(c+'('+(by.get(start)===p?'':'')+p.why[c].join(',')+')');}
    const fwd=[]; c=start; while(true){const ws=dep.get(c); if(!ws.length)break; const n=ws.sort((a,b)=>tl.get(b)-tl.get(a))[0]; fwd.push(n+'['+by.get(n).why[c].join(',')+']'); c=n;}
    console.log('\nCHAIN via',start,':\n  '+back.join('\n  ')+'\n  >> '+start+'\n  '+fwd.join('\n  '));
  }
}

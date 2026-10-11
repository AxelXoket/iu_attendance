// Compute level/tail (in packages) over live packages/*.json; read only.
const fs=require('fs'),path=require('path');
const D=process.argv[2]; const focus=process.argv[3]||'D09';
const mods=fs.readdirSync(path.join(D,'packages')).filter(f=>/^D\d\d\.json$/.test(f));
const all=[];for(const f of mods){const P=JSON.parse(fs.readFileSync(path.join(D,'packages',f),'utf8').replace(/^\uFEFF/,''));for(const p of P.packages)all.push({...p,module:f.slice(0,3)})}
const by=new Map(all.map(p=>[p.id,p]));const prov=new Map();
for(const p of all)for(const x of p.exports||[])prov.set(p.module+'.'+x,p.id);
const missing=[];
for(const p of all){p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>{const v=prov.get(n);if(!v)missing.push(p.id+' '+n);return v}).filter(Boolean)])]}
const dep=new Map(all.map(p=>[p.id,[]]));for(const p of all)for(const d of p.deps)if(dep.has(d))dep.get(d).push(p.id);
const lv=new Map(),tl=new Map(),st=new Map();
const L=id=>{if(lv.has(id))return lv.get(id);if(st.get(id))throw new Error('cycle at '+id);st.set(id,1);const p=by.get(id);const v=p.deps.length?1+Math.max(...p.deps.map(L)):0;lv.set(id,v);return v};
const T=id=>{if(tl.has(id))return tl.get(id);const v=1+Math.max(0,...dep.get(id).map(T));tl.set(id,v);return v};
try{all.forEach(p=>L(p.id))}catch(e){console.log(e.message);process.exit(1)}
all.forEach(p=>T(p.id));
const mx=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
console.log('packages',all.length,'chain',mx,'missing providers',missing.length?missing.join('; '):'none');
for(const p of all.filter(p=>p.module===focus)){
  const bind=p.deps.filter(d=>lv.get(d)===lv.get(p.id)-1);
  console.log(p.id,p.size,'L'+lv.get(p.id),'T'+tl.get(p.id),'=',lv.get(p.id)+tl.get(p.id),'|',p.title,'| bind:',bind.map(b=>b+'(L'+lv.get(b)+')').join(','));
}
if(process.argv[4]==='needs'){
  const ps=all.filter(p=>p.module===focus);
  const ns=[...new Set(ps.flatMap(p=>p.needs))].sort();
  for(const n of ns){const pid=prov.get(n);console.log('  ',n,'->',pid,'L'+(pid?lv.get(pid):'?'))}
}
if(process.argv[4]==='chain'){
  // print one longest chain and the chains through each D09 package's binding pred
  const start=all.filter(p=>lv.get(p.id)===0).sort((a,b)=>tl.get(b.id)-tl.get(a.id))[0];
  let cur=start.id;const ch=[cur];
  while(dep.get(cur).length){cur=dep.get(cur).sort((a,b)=>tl.get(b)-tl.get(a))[0];ch.push(cur)}
  console.log('longest:',ch.map(id=>id+'('+by.get(id).size+')').join(' > '));
  for(const id of (process.argv[5]||'').split(',').filter(Boolean)){
    const p=by.get(id);console.log('\n'+id,'needs->');for(const n of p.needs){const pv=prov.get(n);console.log('   ',n,pv,'L'+lv.get(pv))}
    console.log('  waited by:',dep.get(id).map(d=>d+'(T'+tl.get(d)+')').join(', '));
  }
}

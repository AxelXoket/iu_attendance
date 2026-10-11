// Compute level (count of packages on longest predecessor chain) and tail for all packages from current packages/*.json
const fs=require('fs'),path=require('path');
const D=process.argv[2];const show=process.argv[3]||'D12';
const all=[];
for(const f of fs.readdirSync(path.join(D,'packages')).filter(f=>/^D\d\d\.json$/.test(f))){
  let P;try{P=JSON.parse(fs.readFileSync(path.join(D,'packages',f),'utf8').replace(/^\uFEFF/,''));}catch(e){console.error('parse fail',f,e.message);continue;}
  for(const p of P.packages) all.push({...p,module:P.id});
}
const byId=new Map(all.map(p=>[p.id,p]));
const prov=new Map();for(const p of all)for(const x of p.exports||[])prov.set(p.module+'.'+x,p.id);
const missing=[];
for(const p of all){p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>{const v=prov.get(n);if(!v)missing.push(p.id+':'+n);return v;}).filter(Boolean)])].filter(d=>byId.has(d));}
const dependents=new Map(all.map(p=>[p.id,[]]));for(const p of all)for(const d of p.deps)dependents.get(d).push(p.id);
const lv=new Map(),tl=new Map();const onstack=new Set();
const level=id=>{if(lv.has(id))return lv.get(id);if(onstack.has(id)){console.log('CYCLE at',id);return 0;}onstack.add(id);const v=Math.max(0,...byId.get(id).deps.map(d=>level(d)+1));onstack.delete(id);lv.set(id,v);return v;};
const tail=id=>{if(tl.has(id))return tl.get(id);if(onstack.has(id)){return 0;}onstack.add(id);const v=1+Math.max(0,...dependents.get(id).map(tail));onstack.delete(id);tl.set(id,v);return v;};
all.forEach(p=>{level(p.id);tail(p.id);});
const chain=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
console.log('packages',all.length,'global chain',chain, 'missing needs',missing.length);
const mods=show.split(',');
for(const p of all.filter(p=>mods.includes(p.module))){
  const binding=p.deps.filter(d=>lv.get(d)+1===lv.get(p.id));
  const waiters=dependents.get(p.id).filter(w=>tl.get(w)+1===tl.get(p.id));
  console.log(`${p.id} ${p.size} lv ${lv.get(p.id)} tail ${tl.get(p.id)} sum ${lv.get(p.id)+tl.get(p.id)} | ${p.title}\n   bind: ${binding.map(b=>b+'(lv'+lv.get(b)+')').join(' ')}\n   waiters: ${waiters.map(w=>w+'(t'+tl.get(w)+')').join(' ')}`);
}
if(process.argv[4]){ // print longest chain
  let start=all.filter(p=>lv.get(p.id)===0).sort((a,b)=>tl.get(b.id)-tl.get(a.id))[0];
  const c=[start.id];let cur=start.id;while(dependents.get(cur).length){cur=dependents.get(cur).sort((a,b)=>tl.get(b)-tl.get(a))[0];c.push(cur);}console.log('chain:',c.join(' > '));
}

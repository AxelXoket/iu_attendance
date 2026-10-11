// Read-only: compute level (packages before, longest chain) and tail for all packages in current packages/*.json
const fs=require('fs'),path=require('path');
const D=process.argv[2]; const mod=process.argv[3]||'D10';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const all=[];
for(const f of fs.readdirSync(path.join(D,'packages')).filter(f=>/^D\d\d\.json$/.test(f))){
  try{const P=read(path.join(D,'packages',f));for(const p of P.packages)all.push({...p,module:P.id});}catch(e){console.log('ERR read',f,e.message)}
}
const byId=new Map(all.map(p=>[p.id,p]));
const prov=new Map();for(const p of all)for(const x of p.exports||[])prov.set(p.module+'.'+x,p.id);
for(const p of all)p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const dependents=new Map(all.map(p=>[p.id,[]]));for(const p of all)for(const d of p.deps)if(dependents.has(d))dependents.get(d).push(p.id);
const lv=new Map(),tl=new Map();
const L=(id,st=new Set())=>{if(lv.has(id))return lv.get(id);if(st.has(id))return 999;st.add(id);const p=byId.get(id);const v=p.deps.length?1+Math.max(...p.deps.filter(d=>byId.has(d)).map(d=>L(d,st))):0;lv.set(id,v);return v;};
const T=(id,st=new Set())=>{if(tl.has(id))return tl.get(id);if(st.has(id))return 999;st.add(id);const v=1+Math.max(0,...dependents.get(id).map(d=>T(d,st)));tl.set(id,v);return v;};
all.forEach(p=>{L(p.id);T(p.id);});
let mx=0;for(const p of all)mx=Math.max(mx,lv.get(p.id)+tl.get(p.id));
console.log('global chain',mx,'packages',all.length);
for(const p of all.filter(p=>p.module===mod)){
  console.log(`${p.id} ${p.size} level ${lv.get(p.id)} tail ${tl.get(p.id)} | ${p.title}`);
  for(const n of p.needs||[]){const q=prov.get(n);console.log(`   need ${n} -> ${q||'NONE'} level ${q?lv.get(q):'-'}`);}
  for(const d of p.depends_on||[])console.log(`   dep ${d} level ${lv.get(d)}`);
  for(const d of dependents.get(p.id))if(!d.startsWith(mod))console.log(`   waited by ${d} tail ${tl.get(d)} level ${lv.get(d)}`);
}

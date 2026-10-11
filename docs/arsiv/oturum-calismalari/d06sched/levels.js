// Read-only analysis: level and tail (in packages) for every package, from current packages/*.json
const fs=require('fs'),path=require('path');
const B=process.argv[2]; const MOD=process.argv[3]||'D06';
const C=JSON.parse(fs.readFileSync(path.join(B,'contracts.json'),'utf8').replace(/^\uFEFF/,''));
const all=[];
for(const m of C.modules){ try{ const P=JSON.parse(fs.readFileSync(path.join(B,'packages',m.id+'.json'),'utf8').replace(/^\uFEFF/,'')); all.push(...P.packages.map(p=>({...p,module:m.id}))); }catch(e){console.log('read fail',m.id,e.message)} }
const byId=new Map(all.map(p=>[p.id,p])); const prov=new Map();
for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
const missing=[];
for(const p of all){ p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>{const v=prov.get(n); if(!v) missing.push(p.id+' '+n); return v}).filter(Boolean)])]; }
const dep=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.deps) if(dep.has(d)) dep.get(d).push(p.id);
const lv=new Map(), tl=new Map(); const st=new Map();
const L=id=>{ if(lv.has(id)) return lv.get(id); if(st.get(id)) {console.log('CYCLE at',id); return 0;} st.set(id,1); const p=byId.get(id); const v=p.deps.length?1+Math.max(...p.deps.map(L)):0; lv.set(id,v); return v; };
const T=id=>{ if(tl.has(id)) return tl.get(id); const v=1+Math.max(0,...dep.get(id).map(T)); tl.set(id,v); return v; };
all.forEach(p=>{L(p.id);T(p.id)});
const maxc=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
console.log('packages',all.length,'longest chain',maxc, 'missing providers', missing.length?missing.slice(0,20):0);
for(const p of all.filter(p=>p.module===MOD)){
  console.log(`${p.id} ${p.size} lv ${lv.get(p.id)} tail ${tl.get(p.id)} sum ${lv.get(p.id)+tl.get(p.id)} | ${p.title}`);
  for(const n of p.needs||[]){ const v=prov.get(n); console.log(`   need ${n} -> ${v} lv ${v?lv.get(v):'?'}`); }
  const ws=dep.get(p.id).map(d=>`${d}(t${tl.get(d)})`); console.log('   waited by', ws.join(' '));
}
if(process.argv[4]){ // print longest chain
  let best=all.reduce((a,p)=>lv.get(p.id)+tl.get(p.id)>lv.get(a.id)+tl.get(a.id)?p:a);
  // walk back to start
  let cur=best.id; const chain=[cur];
  while(byId.get(cur).deps.length){ cur=byId.get(cur).deps.reduce((a,d)=>lv.get(d)>lv.get(a)?d:a); chain.unshift(cur); }
  cur=best.id; while(dep.get(cur).length){ cur=dep.get(cur).reduce((a,d)=>tl.get(d)>tl.get(a)?d:a); chain.push(cur); }
  console.log('CHAIN', chain.map(c=>c+'('+byId.get(c).size+')').join(' > '));
}

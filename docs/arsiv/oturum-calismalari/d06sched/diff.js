// Compare old and new D06 package graphs: splits and removed or added edges, measured per file.
const fs=require('fs');
const O=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).packages, N=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).packages;
const newOf=new Map(); for(const p of N) for(const f of p.files) newOf.set(f,p.id);
const oldOf=new Map(); for(const p of O) for(const f of p.files) oldOf.set(f,p.id);
const nById=new Map(N.map(p=>[p.id,p])), oById=new Map(O.map(p=>[p.id,p]));
// transitive closure of new depends_on
const clo=id=>{const s=new Set(),st=[id];while(st.length){for(const d of nById.get(st.pop()).depends_on) if(!s.has(d)){s.add(d);st.push(d);}}return s;};
let splits=0; for(const p of O){const t=new Set(p.files.map(f=>newOf.get(f))); if(t.size>1){splits++; console.log('split',p.id,'->',[...t].join(','));}}
let removed=0, kept=0, oldTotal=0;
for(const p of O){
  for(const n of p.needs){oldTotal++; const holders=new Set(p.files.map(f=>newOf.get(f))); const any=[...holders].some(h=>nById.get(h).needs.includes(n)); if(any) kept++; else {removed++; console.log('removed need',p.id,n,'(files now in',[...holders].join(','),')');}}
  for(const d of p.depends_on){oldTotal++; const tgt=new Set(oById.get(d).files.map(f=>newOf.get(f))); const holders=new Set(p.files.map(f=>newOf.get(f)));
    // kept if every holder that is not itself a target directly depends on some target package
    const ok=[...holders].every(h=>tgt.has(h)||nById.get(h).depends_on.some(x=>tgt.has(x)));
    if(ok) kept++; else {removed++; console.log('removed dep',p.id,'->',d,'| holders',[...holders].join(','),'targets',[...tgt].join(','));}}
}
let added=0; for(const p of N){ for(const n of p.needs){ const olds=new Set(p.files.map(f=>oldOf.get(f))); if(![...olds].some(o=>oById.get(o).needs.includes(n))){added++; console.log('added need',p.id,n);} } }
console.log({oldEdges:oldTotal,kept,removed,splits,addedNeeds:added, newEdges:N.reduce((a,p)=>a+p.needs.length+p.depends_on.length,0)});

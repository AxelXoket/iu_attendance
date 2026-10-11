// print longest chains (top N) through the graph using current packages and optional D02 override
const fs=require('fs');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const C=read(B+'/contracts.json'); const OV=process.argv[2];
const all=[]; for(const m of C.modules){const P=(OV&&m.id==='D02')?read(OV):read(B+'/packages/'+m.id+'.json'); for(const p of P.packages) all.push({...p,module:m.id});}
const by=new Map(all.map(p=>[p.id,p])); const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
for(const p of all) p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const kids=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.deps) kids.get(d).push(p.id);
const lv=new Map(),tl=new Map();
const L=id=>{if(lv.has(id))return lv.get(id);const v=Math.max(0,...by.get(id).deps.map(d=>L(d)+1));lv.set(id,v);return v};
const T=id=>{if(tl.has(id))return tl.get(id);const v=1+Math.max(0,...kids.get(id).map(T));tl.set(id,v);return v};
all.forEach(p=>{L(p.id);T(p.id)});
const chain=Math.max(...all.map(p=>lv.get(p.id)+tl.get(p.id)));
// reconstruct one longest path
let start=all.find(p=>lv.get(p.id)===0&&tl.get(p.id)===chain);
const path=[start.id]; let cur=start.id; while(kids.get(cur).length){const n=kids.get(cur).find(k=>tl.get(k)===tl.get(cur)-1); if(!n)break; path.push(n); cur=n;}
console.log('chain',chain); console.log(path.map(id=>id+'('+by.get(id).size+')').join(' > '));
const target=Number(process.argv[3]||20);
const late=all.filter(p=>lv.get(p.id)+tl.get(p.id)>target);
const byMod={}; for(const p of late) byMod[p.module]=(byMod[p.module]||0)+1; console.log('late by module',JSON.stringify(byMod));

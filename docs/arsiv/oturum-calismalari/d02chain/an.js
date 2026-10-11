// Analyse levels/tails across current packages/*.json (read only). Usage: node an.js [MOD] [override.json]
const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const C=read(B+'/contracts.json');
const MOD=process.argv[2]||'D02', OV=process.argv[3];
const all=[];
for(const m of C.modules){let P; try{P=(OV&&m.id===MOD)?read(OV):read(B+'/packages/'+m.id+'.json')}catch(e){console.log('read fail',m.id,e.message);continue}
 for(const p of P.packages) all.push({...p,module:m.id});}
const byId=new Map(all.map(p=>[p.id,p]));
const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
for(const p of all){p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])]; p.why=new Map(); for(const d of p.depends_on||[]) p.why.set(d,'depends_on'); for(const n of p.needs||[]){const q=prov.get(n); if(q) p.why.set(q,(p.why.get(q)&&p.why.get(q)!=='depends_on'?p.why.get(q)+',':'')+n)}}
const dep=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.deps) dep.get(d).push(p.id);
const lvl=new Map(),tl=new Map(),st=new Map();
const L=id=>{if(lvl.has(id))return lvl.get(id); if(st.get(id)){console.log('CYCLE at',id);return 0} st.set(id,1); const v=Math.max(0,...byId.get(id).deps.map(d=>L(d)+1)); lvl.set(id,v); return v};
const T=id=>{if(tl.has(id))return tl.get(id); const v=1+Math.max(0,...dep.get(id).map(T)); tl.set(id,v); return v};
all.forEach(p=>{L(p.id);T(p.id)});
console.log('global chain', Math.max(...all.map(p=>lvl.get(p.id)+tl.get(p.id))));
for(const p of all.filter(p=>p.module===MOD)){
 const l=lvl.get(p.id),t=tl.get(p.id);
 console.log(`${l+t>20?'LATE':'ok  '} ${p.id} ${p.size} L${l} T${t} = ${l+t} | ${p.title}`);
 for(const d of p.deps){ if(lvl.get(d)+1===l) console.log(`     binds: ${d} (L${lvl.get(d)}) via ${p.why.get(d)}`)}
 const ws=dep.get(p.id).filter(w=>tl.get(w)+1===t); for(const w of ws) console.log(`     tail via: ${w} (T${tl.get(w)}) [${byId.get(w).why.get(p.id)}]`);
}
if(process.argv[4]) for(const id of process.argv[4].split(',')) console.log(id, 'L'+lvl.get(id),'T'+tl.get(id), byId.get(id)&&byId.get(id).title, '\n   deps:', byId.get(id).deps.map(d=>d+'(L'+lvl.get(d)+')').join(' '));
if(process.env.NEEDS){ for(const n of process.env.NEEDS.split(',')){const q=prov.get(n); console.log(n.padEnd(32), q, q&&('L'+lvl.get(q)+' T'+tl.get(q)+' '+byId.get(q).size+' | '+byId.get(q).title+' | deps '+byId.get(q).deps.join(' ')))}}

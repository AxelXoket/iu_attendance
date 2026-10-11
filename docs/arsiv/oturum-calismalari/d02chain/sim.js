// Simulate schedule.js list scheduling (read only) with an optional D02 override. node sim.js [override.json]
const fs=require('fs');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const C=read(B+'/contracts.json'); const OV=process.argv[2];
const all=[]; for(const m of C.modules){const P=(OV&&m.id==='D02')?read(OV):read(B+'/packages/'+m.id+'.json'); for(const p of P.packages) all.push({...p,module:m.id});}
const by=new Map(all.map(p=>[p.id,p])); const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
for(const p of all) p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const dependents=new Map(all.map(p=>[p.id,[]])); for(const p of all) for(const d of p.deps) dependents.get(d).push(p.id);
const W={S:1,M:2,L:3}, tail=new Map();
const cp=id=>{if(tail.has(id))return tail.get(id);const v=W[by.get(id).size]+Math.max(0,...dependents.get(id).map(cp));tail.set(id,v);return v};
all.forEach(p=>cp(p.id));
const phaseOf=new Map(),phases=[];
while(phaseOf.size<all.length){const ready=all.filter(p=>!phaseOf.has(p.id)&&p.deps.every(d=>phaseOf.has(d))).sort((a,b)=>cp(b.id)-cp(a.id)||a.id.localeCompare(b.id));
 const take=ready.slice(0,15); if(!take.length){console.log('stuck');break} take.forEach(p=>phaseOf.set(p.id,phases.length)); phases.push(take.map(p=>p.id));}
console.log('packages',all.length,'phases',phases.length,'sizes',phases.map(p=>p.length).join(','));
const d02=all.filter(p=>p.module==='D02').map(p=>p.id.slice(4)+':'+(phaseOf.get(p.id)+1)); console.log('D02 phases',d02.join(' '));

// For each D12 export: consumers, their level, tail, and the max level among their OTHER deps (what level D12 export must be at to not bind)
const fs=require('fs'),path=require('path');const D=process.argv[2];
const all=[];for(const f of fs.readdirSync(path.join(D,'packages')).filter(f=>/^D\d\d\.json$/.test(f))){const P=JSON.parse(fs.readFileSync(path.join(D,'packages',f),'utf8'));for(const p of P.packages)all.push({...p,module:P.id});}
const byId=new Map(all.map(p=>[p.id,p]));const prov=new Map();for(const p of all)for(const x of p.exports||[])prov.set(p.module+'.'+x,p.id);
for(const p of all)p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const dependents=new Map(all.map(p=>[p.id,[]]));for(const p of all)for(const d of p.deps)dependents.get(d).push(p.id);
const lv=new Map(),tl=new Map();
const level=id=>{if(lv.has(id))return lv.get(id);lv.set(id,0);const v=Math.max(0,...byId.get(id).deps.map(d=>level(d)+1));lv.set(id,v);return v;};
const tail=id=>{if(tl.has(id))return tl.get(id);tl.set(id,0);const v=1+Math.max(0,...dependents.get(id).map(tail));tl.set(id,v);return v;};
all.forEach(p=>{level(p.id);tail(p.id);});
const rows=[];
for(const p of all){if(p.module==='D12')continue;const d12=(p.needs||[]).filter(n=>n.startsWith('D12.'));if(!d12.length)continue;
 const other=p.deps.filter(d=>!d.startsWith('D12-'));const otherMax=Math.max(-1,...other.map(d=>lv.get(d)));
 rows.push(`${p.id} lv ${lv.get(p.id)} tail ${tl.get(p.id)} otherDepsMaxLv ${otherMax} => D12 provider may sit at lv<=${otherMax} | ${d12.join(',')}`);}
console.log(rows.sort((a,b)=>+b.split('tail ')[1].split(' ')[0]-+a.split('tail ')[1].split(' ')[0]).join('\n'));

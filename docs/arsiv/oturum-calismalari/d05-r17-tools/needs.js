const fs=require('fs'),path=require('path');
const D='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages';
const all=[];
for(const f of fs.readdirSync(D).filter(f=>/^D\d\d\.json$/.test(f))){ const P=JSON.parse(fs.readFileSync(path.join(D,f),'utf8')); for(const p of P.packages) all.push({...p,module:f.slice(0,3)}); }
const by=new Map(all.map(p=>[p.id,p])); const prov=new Map(); for(const p of all) for(const x of p.exports||[]) prov.set(p.module+'.'+x,p.id);
for(const p of all) p.deps=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const lv=new Map(); const L=id=>{ if(lv.has(id))return lv.get(id); lv.set(id,0); const v=Math.max(0,...by.get(id).deps.map(d=>L(d)+1)); lv.set(id,v); return v;}; all.forEach(p=>L(p.id));
const mod=process.argv[2]||'D05';
const ns=new Set(); for(const p of all.filter(p=>p.module===mod)) for(const n of p.needs) ns.add(n);
for(const n of [...ns].sort((a,b)=>lv.get(prov.get(a))-lv.get(prov.get(b)))) console.log(n.padEnd(34), prov.get(n), 'lv', lv.get(prov.get(n)), '|', by.get(prov.get(n)).title);

const fs=require('fs'),path=require('path');const D=path.join(__dirname,'..','packages');
const all=[];for(const f of fs.readdirSync(D)){if(!/^D\d\d\.json$/.test(f))continue;const m=f.slice(0,3);for(const p of JSON.parse(fs.readFileSync(path.join(D,f),'utf8')).packages)all.push({...p,module:m});}
const prov=new Map();for(const p of all)for(const x of p.exports)prov.set(p.module+'.'+x,p.id);
const by=new Map(all.map(p=>[p.id,p]));for(const p of all)p.deps=[...new Set([...p.depends_on,...p.needs.map(n=>prov.get(n)).filter(Boolean)])];
const st=new Map();let bad=0;const v=(id,s)=>{if(st.get(id)===2)return;if(st.get(id)===1){console.log('CYCLE',[...s.slice(s.indexOf(id)),id].join(' > '));bad++;return;}st.set(id,1);for(const d of by.get(id).deps)v(d,[...s,id]);st.set(id,2);};
all.forEach(p=>v(p.id,[]));
const unresolved=all.flatMap(p=>p.needs.filter(n=>!prov.has(n)).map(n=>n.slice(0,3))); 
const depth=new Map();const dp=id=>{if(depth.has(id))return depth.get(id);const x=1+Math.max(0,...by.get(id).deps.map(dp));depth.set(id,x);return x;};
console.log('packages',all.length,'cycles',bad,'unresolved needs by module',JSON.stringify(unresolved.reduce((o,m)=>(o[m]=(o[m]||0)+1,o),{})));
for(const p of all.filter(p=>p.module==='D15'))console.log(p.id,'depth',dp(p.id),p.size,p.title);
for(const p of all.filter(p=>p.module==='D14'))console.log(p.id,'depth',dp(p.id));

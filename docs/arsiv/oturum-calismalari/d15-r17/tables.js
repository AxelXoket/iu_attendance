const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const all=[];for(const f of fs.readdirSync(path.join(B,'packages')).filter(f=>/^D\d\d\.json$/.test(f))){const P=read(path.join(B,'packages',f));for(const p of P.packages)all.push({...p,module:P.id});}
const prov=new Map();for(const p of all)for(const x of p.exports||[])prov.set(p.module+'.'+x,p.id);
const by=new Map(all.map(p=>[p.id,p]));for(const p of all)p.after=[...new Set([...(p.depends_on||[]),...(p.needs||[]).map(n=>prov.get(n)).filter(Boolean)])];
const lv=new Map();const level=id=>{if(lv.has(id))return lv.get(id);const v=Math.max(0,...by.get(id).after.map(d=>level(d)+1));lv.set(id,v);return v;};
for(const t of process.argv.slice(2)){const p=all.find(p=>(p.tables||[]).includes(t));console.log(t.padEnd(22),p?`${p.id} L${level(p.id)} ${p.size} ${p.title.slice(0,40)} | exports: ${p.exports.join(',')} | files: ${p.files.filter(f=>/tablolar|schema|sema/.test(f)).join(' ')}`:'none');}

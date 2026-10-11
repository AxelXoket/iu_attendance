// Collects workflow fixes/decisions; un-escapes only entity-encoded real tags (a, code, strong, span); prints a review table.
const fs=require('fs');const arr=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).result;
const tag=s=>s.replace(/&lt;(\/?)(a|code|strong|span)((?:\s[^&]*?)?)&gt;/g,'<$1$2$3>');
const fixes=[],dec=[];for(const r of arr){for(const f of r.fixes)fixes.push({key:r.key,file:f.file,from:tag(f.from),to:tag(f.to),reason:f.reason,source:f.source});for(const d of r.decisions)dec.push({key:r.key,...d})}
fs.writeFileSync('fixes_all.json',JSON.stringify(fixes,null,1));fs.writeFileSync('decisions_all.json',JSON.stringify(dec,null,1));
for(const r of arr)console.log(r.key,'claims',r.claims,'|',r.verdicts.filter(v=>!/CONFIRMED/.test(v)).join(' '));
console.log('fixes',fixes.length,'decisions',dec.length);
fixes.forEach((f,i)=>console.log('\n#'+i,f.key,f.file,'| WHY:',f.reason.slice(0,230).replace(/\s+/g,' '),'\n  TO:',f.to.slice(0,330).replace(/\s+/g,' ')));

// node collect2.js <workflow output> <prefix>: writes <prefix>_fixes.json (applier order) and <prefix>_decisions.json; prints a summary.
const fs=require('fs');const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).result;const P=process.argv[3];
const tag=s=>s.replace(/&lt;(\/?)(a|code|strong|span|li|div|p|ul|ol|h3)((?:\s[^&]*?)?)&gt;/g,'<$1$2$3>');
const fixes=[];for(const f of (r.fixlists||[]))for(const x of f.fixes)fixes.push({applier:f.applier,id:x.id,file:x.file,from:tag(x.from),to:tag(x.to)});
fs.writeFileSync(P+'_fixes.json',JSON.stringify(fixes,null,1));if(r.decisions)fs.writeFileSync(P+'_decisions.json',JSON.stringify(r.decisions,null,1));
if(r.decisions){const c={};for(const d of r.decisions)c[d.outcome]=(c[d.outcome]||0)+1;console.log('decisions',r.decisions.length,JSON.stringify(c),'missing',(r.missing||[]).join(' ')||'none')}
for(const f of (r.fixlists||[]))console.log('applier',f.applier,'fixes',f.fixes.length,'notes:',(f.notes||[]).join(' | ').slice(0,600));
console.log('total fixes',fixes.length);

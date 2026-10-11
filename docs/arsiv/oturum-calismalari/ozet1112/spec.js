const fs=require('fs'),path=require('path');
const B=process.argv[2], N=Number(process.argv[3]);
const ph=JSON.parse(fs.readFileSync(path.join(B,'ozet','asamalar.json'),'utf8'));
const phase=ph[N-1];
const cut=(s,n)=>{if(s===undefined)return "-"; s=typeof s==="string"?s:JSON.stringify(s); return s.length>n?s.slice(0,n)+'…':s;};
for(const pk of phase.paketler){
  const P=JSON.parse(fs.readFileSync(path.join(B,'packages',pk.modul+'.json'),'utf8')).packages.find(x=>x.id===pk.id);
  const S=JSON.parse(fs.readFileSync(path.join(B,'spec',pk.modul+'.json'),'utf8'));
  console.log('=== '+pk.id);
  for(const e of P.endpoints){ const [m,p]=e.split(' '); const s=S.endpoints.find(x=>x.method===m&&x.path===p); if(s) console.log('EP '+e+' client='+s.client+' auth='+cut(s.auth,150)+'\n  req='+cut(s.request,500)+'\n  resp='+cut(s.response,700)+'\n  err='+cut(s.errors,400)); else console.log('EP '+e+' (no spec)'); }
  for(const j of P.jobs){ const s=S.jobs.find(x=>x.name===j); console.log('JOB '+j+' '+cut(s,800)); }
  for(const x of P.exports){ const s=S.exports.find(y=>y.name===x); console.log('EXP '+x+' '+cut(s&&s.purpose,400)); }
  for(const t of P.tests){ const s=S.tests.find(y=>y.name===t); if(s) console.log('TEST '+t+' :: '+cut(s.asserts,500)); }
}

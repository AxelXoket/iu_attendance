const fs=require('fs'),path=require('path');
const D=process.argv[2]; const n=Number(process.argv[3]); const L=Number(process.argv[4]||400);
const ph=require(path.join(D,'ozet/asamalar.json'))[n-1];
const cut=(s)=>{s=typeof s==='string'?s:(JSON.stringify(s)||''); return s.length>L?s.slice(0,L)+'...':s};
for(const pk of ph.paketler){
  const mod=pk.modul; const P=require(path.join(D,'packages',mod+'.json')).packages.find(x=>x.id===pk.id);
  const S=require(path.join(D,'spec',mod+'.json'));
  console.log('\n##### '+pk.id+' ['+P.size+'] '+P.title);
  console.log('NOTES: '+P.notes);
  console.log('TABLES: '+JSON.stringify(P.tables)+' | EXPORTS: '+JSON.stringify(P.exports));
  for(const e of P.endpoints){ const key=typeof e==='string'?e:JSON.stringify(e); const se=(S.endpoints||[]).find(x=>key.includes(x.path)&&key.includes(x.method)); console.log('EP '+key+' :: '+(se?cut((se.does||se.purpose||'')+' | auth: '+se.auth+' | client: '+se.client):'?')); }
  for(const j of P.jobs){ const jn=typeof j==='string'?j:(j.name||JSON.stringify(j)); const sj=(S.jobs||[]).find(x=>x.name===jn); console.log('JOB '+jn+' :: '+(sj?cut(sj.does+' | sched: '+sj.schedule):'?')); }
  for(const t of P.tests){ const st=(S.tests||[]).find(x=>x.name===t)||(S.tests||[]).find(x=>x.name.startsWith(t)); console.log('TEST '+t+' :: '+(st?cut(st.asserts):'?')); }
  for(const x of P.exports){ const sx=(S.exports||[]).find(y=>y.name===x); if(sx) console.log('EXP '+x+' :: '+cut(sx.purpose)); }
}

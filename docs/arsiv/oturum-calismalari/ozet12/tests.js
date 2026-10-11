// usage: node tests.js PHASE  -> prints spec test asserts for each package's tests
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/';
const a=require(B+'ozet/asamalar.json')[+process.argv[2]-1];
for (const p of a.paketler){
  const P=require(B+'packages/'+p.modul+'.json').packages.find(x=>x.id===p.id);
  const s=require(B+'spec/'+p.modul+'.json');
  console.log('=== '+p.id+' '+P.title);
  for(const tn of P.tests){ const t=(s.tests||[]).find(x=>x.name===tn); console.log(' * '+tn+': '+(t?(t.asserts||JSON.stringify(t)).slice(0,420):'(not in spec)')); }
}

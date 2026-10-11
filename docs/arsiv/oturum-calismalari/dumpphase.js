const fs=require('fs'),path=require('path');
const D=process.argv[2], n=+process.argv[3];
const ph=JSON.parse(fs.readFileSync(path.join(D,'ozet','asamalar.json'),'utf8'))[n-1];
const cache={};
for(const p of ph.paketler){
  const m=p.modul; cache[m]=cache[m]||JSON.parse(fs.readFileSync(path.join(D,'packages',m+'.json'),'utf8'));
  let arr=cache[m]; if(!Array.isArray(arr)) arr=arr.packages||arr.paketler||Object.values(arr);
  const k=arr.find(x=>x.id===p.id);
  console.log('===== '+p.id+' | '+k.title+' | size '+k.size);
  console.log('tables: '+JSON.stringify(k.tables));
  console.log('endpoints: '+JSON.stringify(k.endpoints));
  console.log('jobs: '+JSON.stringify(k.jobs));
  console.log('exports: '+JSON.stringify(k.exports));
  console.log('notes: '+k.notes);
  console.log('tests:\n - '+(k.tests||[]).join('\n - '));
}

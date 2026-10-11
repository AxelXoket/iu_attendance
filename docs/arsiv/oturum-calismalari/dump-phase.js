const fs=require('fs'),path=require('path');
const D=process.argv[2], n=+process.argv[3];
const ph=JSON.parse(fs.readFileSync(path.join(D,'ozet','asamalar.json'),'utf8'));
const c=JSON.parse(fs.readFileSync(path.join(D,'contracts.json'),'utf8'));
const titles={}; for(const m of c.modules) titles[m.id]=m.title;
for(const p of ph[n-1].paketler){
  const mod=JSON.parse(fs.readFileSync(path.join(D,'packages',p.modul+'.json'),'utf8'));
  const pk=mod.packages.find(x=>x.id===p.id);
  console.log('=== '+p.id+' ['+titles[p.modul]+'] '+pk.title+' size='+pk.size);
  for(const k of ['tables','endpoints','jobs','exports','needs','tests']) if(pk[k]&&pk[k].length) console.log(k+': '+JSON.stringify(pk[k]));
  console.log('notes: '+pk.notes);
  console.log();
}

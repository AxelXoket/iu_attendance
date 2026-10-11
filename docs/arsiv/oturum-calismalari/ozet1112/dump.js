const fs=require('fs'),path=require('path');
const B=process.argv[2], N=Number(process.argv[3]);
const ph=JSON.parse(fs.readFileSync(path.join(B,'ozet','asamalar.json'),'utf8'));
const c=JSON.parse(fs.readFileSync(path.join(B,'contracts.json'),'utf8'));
const mods=c.modules;
const modTitle=m=>{ if(Array.isArray(mods)){const x=mods.find(y=>y.id===m); return x&&(x.title||x.baslik||x.name);} return mods[m]&& (mods[m].title||mods[m].baslik||JSON.stringify(mods[m]).slice(0,80)); };
const phase=ph[N-1];
for(const pk of phase.paketler){
  const P=JSON.parse(fs.readFileSync(path.join(B,'packages',pk.modul+'.json'),'utf8'));
  const p=P.packages.find(x=>x.id===pk.id);
  console.log('=== '+pk.id+' ['+modTitle(pk.modul)+'] '+p.title+' size='+p.size);
  console.log('notes: '+(Array.isArray(p.notes)?p.notes.join(' | '):p.notes));
  console.log('tables: '+JSON.stringify(p.tables));
  console.log('endpoints: '+JSON.stringify(p.endpoints));
  console.log('jobs: '+JSON.stringify(p.jobs));
  console.log('exports: '+JSON.stringify(p.exports));
  console.log('needs: '+JSON.stringify(p.needs));
  console.log('tests: '+JSON.stringify(p.tests));
}

const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/';
const ids=process.argv.slice(2);
for(const id of ids){const m=id.slice(0,3);const pk=require(B+'packages/'+m+'.json');const arr=Array.isArray(pk)?pk:(pk.paketler||pk.packages||Object.values(pk));const p=arr.find(x=>x.id===id);
const s=require(B+'spec/'+m+'.json');
console.log('=== '+id+' | '+p.title);console.log('NOTES: '+p.notes);console.log('JOBS: '+p.jobs.join(',')+' | EP: '+p.endpoints.join(',')+' | EXP: '+p.exports.join(','));
for(const t of p.tests){const st=(s.tests||[]).find(x=>x.name===t);console.log(' T: '+t+' :: '+(st?st.asserts:'(no spec)'));}
for(const j of p.jobs){const sj=(s.jobs||[]).find(x=>x.name===j);if(sj)console.log(' J: '+JSON.stringify(sj));}
}

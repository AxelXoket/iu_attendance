const path=require('path');
for (const a of process.argv.slice(2)) { const [m,n]=a.split('.'); const s=require(path.join(__dirname,'..','spec',m+'.json')); const e=(s.exports||[]).find(x=>x.name===n); console.log(a,'::',e?String(e.signature).slice(0,260):'MISSING'); }

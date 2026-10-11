const fs=require('fs');for(const f of process.argv.slice(2)){const t=fs.readFileSync(f,'utf8').trim();
t.split(/(?<=[.;])\s+/).forEach(s=>console.log(String(s.split(/\s+/).length).padStart(3),s.slice(0,70)));console.log(f,t.split(/\s+/).length);}

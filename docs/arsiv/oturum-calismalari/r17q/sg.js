// usage: node sg.js D01 regex [maxlen]
const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/';
const [m,re,ml]=process.argv.slice(2);const r=new RegExp(re,'i');const max=+ml||600;
const s=JSON.parse(fs.readFileSync(B+m+'.json','utf8'));
const walk=(v,p)=>{if(typeof v==='string'){if(r.test(v)){const i=v.search(r);console.log(p+': '+(v.length>max? '...'+v.slice(Math.max(0,i-max/2),i+max/2)+'...':v));}}else if(v&&typeof v==='object'){for(const k of Object.keys(v))walk(v[k],p+'.'+k);}};
walk(s,m);

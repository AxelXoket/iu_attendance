// usage: node find.js D09 "regex" [after=400] [max=4]
const path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/spec/';
const s=require(B+process.argv[2]+'.json'); const t=JSON.stringify(s);
const n=+(process.argv[4]||400), max=+(process.argv[5]||4);
const r=new RegExp(process.argv[3],'g'); let m,c=0;
while((m=r.exec(t))&&c<max){console.log('>>',t.slice(Math.max(0,m.index-150),m.index+n).replace(/\n/g,' '));c++;}

// Replay props_min.js on OUT; every old string must occur exactly once at its turn.
const fs=require('fs');let t=fs.readFileSync('../../r15/condense/units/u06.out.html','utf8');let bad=0,n=0;
for(const [id,o,r] of require('./props_min.js')){n++;const k=t.split(o).length-1;if(k!==1){console.log('NOT UNIQUE',id,k);bad++;continue}t=t.replace(o,()=>r);}
fs.writeFileSync('u06.critC.min.html',t);console.log('pairs',n,'bad',bad);

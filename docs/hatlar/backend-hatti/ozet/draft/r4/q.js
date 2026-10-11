// usage: node q.js D07 "regex" [sections comma]
const path=require('path');
const m=process.argv[2], re=new RegExp(process.argv[3],'i');
const secs=(process.argv[4]||'').split(',').filter(Boolean);
const d=require(path.join(__dirname,'..','..','..','spec',m+'.json'));
for(const k of Object.keys(d)){ if(secs.length&&!secs.includes(k)) continue; const v=d[k]; if(!Array.isArray(v)) continue;
 for(const it of v){const s=JSON.stringify(it); if(re.test(s)) console.log('['+k+'] '+s.slice(0, +process.env.L||1500)+'\n');}}

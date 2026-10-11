const s=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
const txt=[];
const walk=(o,p)=>{ if(typeof o==='string'){ txt.push([p,o]); } else if(o&&typeof o==='object') for(const k of Object.keys(o)) walk(o[k],p+'.'+k); };
walk(s,'');
const re=new RegExp(process.argv[3],'gi'); const W=+(process.argv[4]||250);
for(const [p,t] of txt){ if(p.startsWith('.files')) continue; for(const m of t.matchAll(re)){ const i=m.index; console.log(p,'::',t.slice(Math.max(0,i-W),i+W).replace(/\n/g,' '),'\n'); } }

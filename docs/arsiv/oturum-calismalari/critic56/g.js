// usage: node g.js <specfile> <regex> [maxlen]
const fs=require('fs');const [f,re,ml]=process.argv.slice(2);const s=JSON.parse(fs.readFileSync(f,'utf8'));
const R=new RegExp(re,'i');const max=+ml||600;
const walk=(v,p)=>{if(typeof v==='string'){if(R.test(v)){const i=v.search(R);const st=Math.max(0,i-max/2);console.log('['+p+'] '+(st>0?'...':'')+v.slice(st,st+max)+(st+max<v.length?'...':''));}}else if(Array.isArray(v))v.forEach((x,i)=>walk(x,p+'.'+i));else if(v&&typeof v==='object')for(const k of Object.keys(v))walk(v[k],p+'.'+k);};
walk(s,'');

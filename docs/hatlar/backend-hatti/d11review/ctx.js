// print JSON string values (with their paths) that match a regex
const fs=require('fs');
const [,,file,pat,maxlen]=process.argv;
const re=new RegExp(pat,'i');
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const L=+(maxlen||1500);
function walk(v,p){
  if(typeof v==='string'){ if(re.test(v)) console.log(p+': '+(v.length>L? v.slice(0,L)+' …['+v.length+']':v)+'\n'); }
  else if(Array.isArray(v)) v.forEach((x,i)=>walk(x,p+'['+i+']'));
  else if(v&&typeof v==='object') for(const k of Object.keys(v)) walk(v[k],p+'.'+k);
}
walk(j,'');

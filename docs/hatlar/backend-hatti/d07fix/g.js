// usage: node d07fix/g.js D04 regex [maxlen]
// prints every string leaf (with JSON path) in spec/<id>.json matching regex
const fs=require('fs');const [id,re,ml]=process.argv.slice(2);const R=new RegExp(re,'i');const max=+(ml||600);
const S=JSON.parse(fs.readFileSync(__dirname+'/../spec/'+id+'.json','utf8'));
function walk(v,p){ if(typeof v==='string'){ if(R.test(v)) console.log(p+': '+(v.length>max? v.slice(0,max)+' ...':v)); } else if(Array.isArray(v)) v.forEach((x,i)=>walk(x,p+'['+i+']')); else if(v&&typeof v==='object') for(const k of Object.keys(v)){ if(R.test(k)) console.log(p+'.'+k+' (key)'); walk(v[k],p+'.'+k);} }
walk(S,id);

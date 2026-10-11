// ara.js <regex> [modüller virgüllü] [bağlam]: spec/Dxx.json içindeki her dize alanında eşleşmeyi yolu ve çevresiyle yazar.
const fs=require('fs'),path=require('path');
const re=new RegExp(process.argv[2],'i');const mods=(process.argv[3]||'D01,D02,D03,D04,D05,D06,D07,D08,D09,D10,D11,D12,D14,D15').split(',');const W=+(process.argv[4]||160);
for(const m of mods){const S=JSON.parse(fs.readFileSync(path.join(__dirname,'..','spec',m+'.json'),'utf8').replace(/^\uFEFF/,''));
 const walk=(x,p)=>{if(typeof x==='string'){let mm;const g=new RegExp(re.source,'gi');while((mm=g.exec(x))){console.log(m+' '+p+': ...'+x.slice(Math.max(0,mm.index-W),mm.index+W).replace(/\n/g,' ')+'...');if(g.lastIndex===mm.index)g.lastIndex++;}}
 else if(Array.isArray(x))x.forEach((v,i)=>walk(v,p+'['+i+']'));else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x))walk(v,p+'.'+k);};walk(S,'');}

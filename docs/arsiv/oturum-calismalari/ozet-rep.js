// usage: node ozet-rep.js file.json '[["old","new"],...]'  replaces within paragraflar strings, fails on miss
const fs=require('fs');const [f,j]=process.argv.slice(2);const o=JSON.parse(fs.readFileSync(f,'utf8'));
for(const [a,b] of JSON.parse(j)){const i=o.paragraflar.findIndex(p=>p.includes(a));if(i<0){console.error('MISS: '+a);process.exit(1);}o.paragraflar[i]=o.paragraflar[i].replace(a,b);}
fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n');o.paragraflar.forEach(p=>console.log(p.split(/\s+/).filter(Boolean).length));

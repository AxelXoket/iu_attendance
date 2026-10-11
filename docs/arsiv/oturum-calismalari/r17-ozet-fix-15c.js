const fs=require('fs'),path=require('path');
const D=process.argv[2];
const f=path.join(D,'ozet','asama-15.json');const o=JSON.parse(fs.readFileSync(f,'utf8'));
for(const [a,b] of [["öne alınırlarsa yeşildir","ikisi öne alınırsa yeşildir"],["Bu iki süreyi hiçbir test sabitlemez","Bu iki süreyi test sabitlemez"]]){let hit=0;o.paragraflar=o.paragraflar.map(p=>{if(p.includes(a)){hit++;return p.split(a).join(b);}return p;});if(hit!==1)throw new Error('no unique hit '+a);}
fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n','utf8');
console.log(o.paragraflar.map(p=>p.split(/\s+/).filter(Boolean).length));

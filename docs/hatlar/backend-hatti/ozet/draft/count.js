const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
o.paragraflar.forEach((p,i)=>console.log('p'+(i+1),p.split(/\s+/).filter(Boolean).length));
console.log('total',o.paragraflar.join(' ').split(/\s+/).filter(Boolean).length);

const f=process.argv[2];const o=JSON.parse(require('fs').readFileSync(f,'utf8'));
o.paragraflar.forEach((p,i)=>console.log('p'+(i+1),p.split(/\s+/).filter(Boolean).length));
console.log('total',o.paragraflar.join(' ').split(/\s+/).filter(Boolean).length);

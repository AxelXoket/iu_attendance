const o=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
o.paragraflar.forEach((p,i)=>{p.split(/(?<=[.!])\s+(?=[A-ZÇĞİÖŞÜ])/).forEach(s=>console.log(i, s.split(/\s+/).filter(Boolean).length, s.slice(0,60)))});
console.log('total', o.paragraflar.join(' ').split(/\s+/).filter(Boolean).length);

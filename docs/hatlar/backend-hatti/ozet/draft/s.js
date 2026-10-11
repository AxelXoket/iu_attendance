// split sentences and count words per sentence
const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
o.paragraflar.forEach((p,i)=>{p.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ])/).forEach(s=>console.log(i+1, s.split(/\s+/).length, s.slice(0,60)));});
console.log('total',o.paragraflar.join(' ').split(/\s+/).filter(Boolean).length);

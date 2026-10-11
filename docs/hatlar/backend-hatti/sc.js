const o=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
o.paragraflar.forEach((p,i)=>{console.log('--p'+(i+1));p.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ"])/).forEach(s=>console.log(s.split(/\s+/).filter(Boolean).length,s.slice(0,70)));});

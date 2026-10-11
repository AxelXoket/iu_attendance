const o=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
o.paragraflar.forEach((p,i)=>{console.log('P'+(i+1));p.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ])/).forEach(s=>console.log(String(s.split(/\s+/).filter(Boolean).length).padStart(3),s.slice(0,90)))});

// Usage: node sc.js file.txt -> word count per sentence-ish segment (split on '. ' and '; ')
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').replace(/\s+/g,' ');
for(const s of t.split(/(?<=[.;])\s+(?=[A-ZÇĞİÖŞÜ0-9a-zçğıöşü])/)) console.log(String(s.split(/\s+/).filter(Boolean).length).padStart(3)+'  '+s.slice(0,90));

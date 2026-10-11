// Usage: node wc.js file.txt  (paragraphs separated by a blank line) -> word counts per sentence and paragraph
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').trim().split(/\n\s*\n/);
let tot=0;t.forEach((p,i)=>{p=p.replace(/\s+/g,' ').trim();const w=p.split(/\s+/).length;tot+=w;console.log('P'+(i+1)+': '+w);
p.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ"])/).forEach(s=>console.log('  '+s.split(/\s+/).length+'  '+s.slice(0,70)));});
console.log('TOTAL '+tot);

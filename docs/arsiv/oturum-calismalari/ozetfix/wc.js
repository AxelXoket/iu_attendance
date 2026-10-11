// Usage: node wc.js file.txt  -> per-paragraph word counts (paragraphs split by blank line)
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').split(/\n\s*\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
let tot=0;t.forEach((p,i)=>{const n=p.split(/\s+/).length;tot+=n;console.log('p'+(i+1)+': '+n);});console.log('total: '+tot);

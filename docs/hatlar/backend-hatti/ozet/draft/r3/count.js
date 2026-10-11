// usage: node count.js file.txt  (sentences separated by newline, paragraphs by blank line)
const t=require('fs').readFileSync(process.argv[2],'utf8');
let tot=0;for(const para of t.split(/\n\s*\n/)){let pt=0;for(const s of para.split('\n').filter(x=>x.trim())){const n=s.split(/\s+/).filter(Boolean).length;pt+=n;console.log(String(n).padStart(3),s.slice(0,70));}console.log('para',pt);tot+=pt;}
console.log('TOTAL',tot);

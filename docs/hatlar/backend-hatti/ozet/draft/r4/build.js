// usage: node build.js N "baslik" file.txt   -> writes ozet/asama-NN.json (paragraphs split by blank line, lines joined by space)
const fs=require('fs'),path=require('path');
const [n,baslik,f]=[+process.argv[2],process.argv[3],process.argv[4]];
const t=fs.readFileSync(f,'utf8').replace(/\r/g,'');
const paras=t.split(/\n\s*\n/).map(p=>p.split('\n').map(s=>s.trim()).filter(Boolean).join(' ')).filter(Boolean);
let tot=0;paras.forEach((p,i)=>{const w=p.split(/\s+/).filter(Boolean).length;tot+=w;console.log('p'+(i+1),w)});console.log('TOTAL',tot);
const out={asama:n,baslik,paragraflar:paras};
fs.writeFileSync(path.join(__dirname,'..','..','asama-'+String(n).padStart(2,'0')+'.json'),JSON.stringify(out,null,2)+'\n','utf8');

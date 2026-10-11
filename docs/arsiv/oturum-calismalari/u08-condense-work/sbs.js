// Side-by-side per row: node sbs.js in.html out.html [label-filter]
const fs=require('fs');const [a,b,f]=process.argv.slice(2);
const rows=s=>[...fs.readFileSync(s,'utf8').matchAll(/<div class="row"><div class="k">([^<]*)<\/div><div>([\s\S]*?)<\/div><\/div>/g)].map(m=>[m[1],m[2].replace(/<\/?code>/g,'`')]);
const A=rows(a),B=rows(b);
A.forEach(([k,t],i)=>{if(f&&k!==f)return;console.log('## '+k+(B[i][0]!==k?'  LABEL MISMATCH: '+B[i][0]:''));console.log('IN : '+t);console.log('OUT: '+B[i][1]);console.log()});

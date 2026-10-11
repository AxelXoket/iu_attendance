// Side-by-side rows: node sents.js in.html out.html -> prints each row IN and OUT text with word counts
const fs=require('fs');
const [a,b]=process.argv.slice(2).map(p=>fs.readFileSync(p,'utf8'));
const ent=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const txt=s=>ent(s.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
const w=s=>txt(s).split(' ').filter(Boolean).length;
const items=s=>[...s.matchAll(/<div class="row"><div class="k">([\s\S]*?)<\/div><div>([\s\S]*?)<\/div><\/div>|<li>([\s\S]*?)<\/li>/g)].map(m=>m[1]!==undefined?[m[1],m[2]]:['li',m[3]]);
const A=items(a),B=items(b);
A.forEach((x,i)=>{console.log('## '+x[0]+'  '+w(x[1])+' -> '+w(B[i][1]));console.log('IN : '+txt(x[1]));console.log('OUT: '+txt(B[i][1]));console.log()});

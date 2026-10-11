const fs=require('fs'),path=require('path');
const files=process.argv.slice(2);
let n=0;
for(const f of files){const s=fs.readFileSync(f,'utf8');
 for(const m of s.matchAll(/sahi[pb][a-zçğıöşü]*/gi)){n++;
  const a=Math.max(0,m.index-160),b=Math.min(s.length,m.index+m[0].length+90);
  console.log(`#${n} ${path.basename(f)}@${m.index}: ...${s.slice(a,b).replace(/\n/g,'\n')}...\n`);}}

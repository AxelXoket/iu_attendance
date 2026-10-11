// Extract one <section id="X"> from an HTML file (balanced section tags), print it
const fs=require('fs');
const [file,id,max]=process.argv.slice(2);
const s=fs.readFileSync(file,'utf8');
const start=s.indexOf('<section id="'+id+'"');
if(start<0){console.log('not found');process.exit(1);}
let depth=0,i=start;
const re=/<\/?section\b[^>]*>/g; re.lastIndex=start;
let m,end=-1;
while((m=re.exec(s))){ if(m[0].startsWith('</')) depth--; else depth++; if(depth===0){end=m.index+m[0].length;break;} }
const out=s.slice(start,end);
console.log(out.slice(0, max?+max:out.length));
console.error('length', out.length);

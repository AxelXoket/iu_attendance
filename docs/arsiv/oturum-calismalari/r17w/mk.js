// Usage: node mk.js N "baslik" in.txt out.json  -> writes the phase JSON from a blank-line separated text
const fs=require('fs');const [n,b,inp,out]=process.argv.slice(2);
const ps=fs.readFileSync(inp,'utf8').trim().split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim());
fs.writeFileSync(out,JSON.stringify({asama:Number(n),baslik:b,paragraflar:ps},null,2)+'\n');

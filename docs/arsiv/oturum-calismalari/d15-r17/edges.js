const fs=require('fs'),path=require('path');
const B='C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const O=JSON.parse(fs.readFileSync(path.join(B,'packages/r1/D15.json'),'utf8')).packages;
const N=JSON.parse(fs.readFileSync(path.join(__dirname,'D15.new.json'),'utf8')).packages;
const fileNew=new Map();for(const p of N)for(const f of p.files)fileNew.set(f.replace('20261021090000','20261012090500'),p.id);
const newOf=op=>[...new Set(op.files.map(f=>fileNew.get(f)))];
const oById=Object.fromEntries(O.map(p=>[p.id,p])), nById=Object.fromEntries(N.map(p=>[p.id,p]));
let oldEdges=0,removed=[];
for(const op of O){const mine=newOf(op);
  for(const d of op.depends_on){oldEdges++;const tg=newOf(oById[d]);const kept=mine.some(m=>nById[m].depends_on.some(x=>tg.includes(x))||tg.includes(m));if(!kept)removed.push(op.id+' -> '+d);}
  for(const n of op.needs){oldEdges++;const kept=mine.some(m=>nById[m].needs.includes(n));if(!kept)removed.push(op.id+' needs '+n);}}
const newEdges=N.reduce((s,p)=>s+p.depends_on.length+p.needs.length,0);
console.log('old edges',oldEdges,'new edges',newEdges,'old edges dropped',removed.length);console.log(removed.join('\n'));
const split=O.filter(op=>newOf(op).length>1).map(op=>op.id+' -> '+newOf(op).join(','));console.log('split old packages',split.length);console.log(split.join('\n'));
// transitive: an old internal edge X->Y is still enforced if every new package holding X's files reaches every new package holding Y's files
const reach=id=>{const s=new Set(),st=[id];while(st.length){const x=st.pop();for(const d of nById[x].depends_on)if(!s.has(d)){s.add(d);st.push(d);}}return s;};
let gone=[];
for(const op of O)for(const d of op.depends_on){const src=newOf(op),tg=newOf(oById[d]);const ok=src.every(s=>tg.every(t=>t===s||reach(s).has(t)));if(!ok)gone.push(op.id+' -> '+d+'  ['+src.join(',')+' vs '+tg.join(',')+']');}
let needGone=0;for(const op of O)for(const n of op.needs){const src=newOf(op);if(!src.some(s=>nById[s].needs.includes(n)))needGone++;}
console.log('\ninternal ordering constraints dropped (partial or full):',gone.length,'\n'+gone.join('\n'));console.log('needs entries dropped:',needGone);
let full=[];for(const op of O)for(const d of op.depends_on){const src=newOf(op),tg=newOf(oById[d]);const any=src.some(s=>tg.some(t=>t===s||reach(s).has(t)));if(!any)full.push(op.id+' -> '+d);}
console.log('\nfully dropped internal constraints:',full.length,full.join('; '));

// Edge removal measured per code file: an old edge X->T (or X needs N) counts as removed when some
// non-test file of X now sits in a package that no longer reaches T's files (or N) directly or transitively.
const fs=require('fs');
const O=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).packages, N=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).packages;
const newOf=new Map(); for(const p of N) for(const f of p.files) newOf.set(f,p.id);
const nById=new Map(N.map(p=>[p.id,p])), oById=new Map(O.map(p=>[p.id,p]));
const clo=id=>{const s=new Set([id]),st=[id];while(st.length){for(const d of nById.get(st.pop()).depends_on) if(!s.has(d)){s.add(d);st.push(d);}}return s;};
const needsReach=id=>{const s=new Set();for(const q of clo(id)) for(const n of nById.get(q).needs) s.add(n);return s;};
const code=f=>!/\/test\/|\.test\.ts$|\.feature$/.test(f);
let removed=0, total=0; const why=[];
for(const p of O){
  const cf=p.files.filter(code); const files=cf.length?cf:p.files;
  for(const n of p.needs){ total++; const lost=files.filter(f=>!needsReach(newOf.get(f)).has(n)); if(lost.length){removed++; why.push(`${p.id} needs ${n}: ${lost.join(' ')}`);} }
  for(const d of p.depends_on){ total++; const tp=new Set(oById.get(d).files.map(f=>newOf.get(f)));
    const lost=files.filter(f=>![...clo(newOf.get(f))].some(x=>tp.has(x))); if(lost.length){removed++; why.push(`${p.id} -> ${d}: ${lost.join(' ')}`);} }
}
console.log(why.join('\n')); console.log({total,removed});

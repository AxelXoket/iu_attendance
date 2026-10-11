// Edge accounting old vs new D02 (source files only: not tests, features, steps, kurucular, migrations).
const O=require('./D02.before.json').packages, N=require(process.argv[2]).packages;
const src=f=>!/\.test\.ts$|\.feature$|\/steps\/|\/kurucular\/|\/migrations\//.test(f);
const fileNew=new Map(); for(const p of N) for(const f of p.files) fileNew.set(f,p);
const byN=new Map(N.map(p=>[p.id,p]));
const reach=new Map(); const R=id=>{if(reach.has(id))return reach.get(id); const s=new Set(); for(const d of byN.get(id).depends_on){s.add(d); for(const x of R(d)) s.add(x)} reach.set(id,s); return s};
const needsT=id=>{const s=new Set(byN.get(id).needs); for(const d of R(id)) for(const n of byN.get(d).needs) s.add(n); return s};
let cutDep=0, cutNeed=0; const out=[];
for(const op of O){ const A=op.files.filter(src);
  for(const d of op.depends_on){ const B=O.find(x=>x.id===d).files.filter(src);
    const cutFor=A.filter(a=>{const pa=fileNew.get(a).id; return !B.some(b=>{const pb=fileNew.get(b).id; return pb===pa||R(pa).has(pb)})});
    if(cutFor.length){cutDep++; out.push(`${op.id}->${d} cut for ${cutFor.map(f=>f.split('/').pop()).join(',')}`)} }
  for(const n of op.needs){ const cutFor=A.filter(a=>!needsT(fileNew.get(a).id).has(n)); if(cutFor.length){cutNeed++; out.push(`${op.id} need ${n} cut for ${cutFor.map(f=>f.split('/').pop()).join(',')}`)} }
}
console.log(out.join('\n')); console.log('cut depends_on',cutDep,'cut needs',cutNeed,'total',cutDep+cutNeed);

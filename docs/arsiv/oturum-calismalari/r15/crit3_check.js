const fs=require('fs');
const P0=fs.readFileSync('snap/plan.r2.html','utf8'), T0=fs.readFileSync('snap/teknik.r2.html','utf8');
const P1=fs.readFileSync('out/plan.html','utf8'), T1=fs.readFileSync('out/teknik.html','utf8');
const fx=JSON.parse(fs.readFileSync('fixes3.json','utf8'));
const cnt=(s,sub)=>s.split(sub).length-1;
let p=P0,t=T0;
fx.forEach((f,i)=>{
  const before=f.file==='plan.html'?p:t;
  const c=cnt(before,f.from);
  if(c!==1) console.log('EDIT',i,'from count in pre-state =',c);
  const after=before.replace(f.from,f.to);
  if(f.file==='plan.html') p=after; else t=after;
});
console.log('replay==out plan:',p===P1,' teknik:',t===T1);
// ids
const ids=s=>{const m=new Set();for(const x of s.matchAll(/\sid="([^"]+)"/g)){if(m.has(x[1]))console.log('DUP id',x[1]);m.add(x[1]);}return m;};
const pid=ids(P1), tid=ids(T1);
const chk=(s,name,own,other,otherName)=>{
  for(const x of s.matchAll(/href="([^"]*)"/g)){
    const h=x[1];
    let m;
    if(h.startsWith('#')){ if(!own.has(h.slice(1))) console.log(name,'BROKEN same-file',h);}
    else if((m=h.match(/^(plan|teknik)\.html(?:#(.*))?$/))){
      const tgt=m[1]==='plan'?pid:tid;
      if(m[2]&&!tgt.has(m[2])) console.log(name,'BROKEN cross',h);
    }
  }
};
chk(P1,'plan',pid,tid);chk(T1,'teknik',tid,pid);
// which ids existed before vs after
const pid0=ids(P0), tid0=ids(T0);
console.log('new plan ids:',[...pid].filter(x=>!pid0.has(x)),'removed:',[...pid0].filter(x=>!pid.has(x)));
console.log('new teknik ids:',[...tid].filter(x=>!tid0.has(x)),'removed:',[...tid0].filter(x=>!tid.has(x)));
// also check whether incoming links in before-state are still valid

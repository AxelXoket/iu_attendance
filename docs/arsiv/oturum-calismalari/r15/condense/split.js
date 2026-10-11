// Splits drafts p1..p5 into unit inputs units/uNN.in.html at fixed markers.
const fs=require('fs');
const r=f=>fs.readFileSync(f,'utf8');
const cut=(s,ms)=>{const out=[];let prev=0;for(const m of ms){const i=typeof m==='function'?m(s):s.indexOf(m);if(i<=0)throw new Error('marker '+m);out.push(s.slice(prev,i));prev=i}out.push(s.slice(prev));return out};
const det=name=>s=>{const i=s.indexOf('<summary>'+name+'</summary>');return s.lastIndexOf('<details',i)};
const u=[...cut(r('p1.html'),['<h3>Yoklama <span class="tag ok">Aşama 1</span></h3>']),
 ...cut(r('p2.html'),['<!-- Aşama 2 ve 3 -->','<!-- Hile -->']),
 ...cut(r('p3.html'),['<!-- Dağıtım -->']),
 ...cut(r('p4.html'),[det('Veritabanı'),det('Telefon uygulaması')]),
 r('p5.html')];
const words=s=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
u.forEach((s,k)=>{const f='units/u'+String(k+1).padStart(2,'0')+'.in.html';fs.writeFileSync(f,s.trim()+'\n');console.log(f,words(s))});

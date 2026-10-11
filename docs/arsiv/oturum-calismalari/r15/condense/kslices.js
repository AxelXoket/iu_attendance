// Old-plan slices for the 7 coverage critics: slices/kN.src.html
const fs=require('fs');const s=fs.readFileSync('src.html','utf8');
const sec=id=>{const a=s.indexOf('<section id="'+id+'">');if(a<0)throw new Error(id);return s.slice(a,s.indexOf('</section>',a)+10)};
const t=sec('teknoloji'),cut=t.lastIndexOf('<details',t.indexOf('<summary>Veritabanı</summary>'));
const K=[sec('tek-bakista')+sec('kararlar'),sec('gun')+sec('asama23'),sec('hile')+sec('benzer')+sec('devam'),sec('hoca')+sec('dagitim'),t.slice(0,cut),t.slice(cut,t.lastIndexOf('<details',t.indexOf('<summary>Telefon uygulaması</summary>'))),t.slice(t.lastIndexOf('<details',t.indexOf('<summary>Telefon uygulaması</summary>'))),sec('baslangic')+sec('hedefler')+sec('acik')];
const w=x=>x.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
K.forEach((x,i)=>{fs.writeFileSync('slices/k'+(i+1)+'.src.html',x);console.log('k'+(i+1),w(x))});

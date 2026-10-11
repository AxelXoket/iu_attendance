// Cuts src.html and new.html into the same 11 critic slices: slices/cNN.src.html, slices/cNN.new.html
const fs=require('fs');
const sec=(s,id)=>{const m=s.match(new RegExp('<section id="'+id+'">[\s\S]*?</section>'));if(!m)throw new Error(id);return m[0]};
const splitAt=(s,i)=>[s.slice(0,i),s.slice(i)];
const det=(s,name)=>s.lastIndexOf('<details',s.indexOf('<summary>'+name+'</summary>'));
const cut=s=>{const k=sec(s,'kararlar'),[k1,k2]=splitAt(k,k.indexOf('<h3>Yoklama'));const t=sec(s,'teknoloji');const a=det(t,'Veritabanı'),b=det(t,'Telefon uygulaması');
 return [sec(s,'tek-bakista')+k1,k2,sec(s,'gun'),sec(s,'asama23'),sec(s,'hile')+sec(s,'benzer'),sec(s,'devam')+sec(s,'hoca'),sec(s,'dagitim'),t.slice(0,a),t.slice(a,b),t.slice(b),sec(s,'baslangic')+sec(s,'hedefler')+sec(s,'acik')]};
const S=cut(fs.readFileSync('src.html','utf8')),N=cut(fs.readFileSync('new.html','utf8'));
S.forEach((x,i)=>{const n='slices/c'+String(i+1).padStart(2,'0');fs.writeFileSync(n+'.src.html',x);fs.writeFileSync(n+'.new.html',N[i])});console.log('11 slices written');

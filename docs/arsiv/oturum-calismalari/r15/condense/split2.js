// new.html -> out/plan.html (ne ve neden) + out/teknik.html (tam olarak nasıl). Moves whole blocks only, never sentences.
const fs=require('fs');fs.mkdirSync('out',{recursive:true});
const N=fs.readFileSync('new.html','utf8');const E=N.includes('\r\n')?'\r\n':'\n';const L=s=>s.replace(/\r?\n/g,E);
const at=(s,n,f=0)=>{const i=s.indexOf(n,f);if(i<0)throw new Error('not found: '+n.slice(0,70));return i};
const sec=(s,id)=>{const a=at(s,'<section id="'+id+'">');return [a,at(s,'</section>',a)+'</section>'.length]};
const head=N.slice(0,at(N,'<header>'));
const header=N.slice(at(N,'<header>'),at(N,'</header>')+9);
const navEnd=at(N,'</nav>')+6, nav=N.slice(at(N,'<nav'),navEnd);
const tailAt=N.lastIndexOf('</div>',at(N,'<script>')), tail=N.slice(tailAt);
let body=N.slice(navEnd,tailAt);
const TK=[];
// 1 teknoloji: the seven detail blocks become teknik sections
let [a,b]=sec(body,'teknoloji');const T0=body.slice(a,b);let T=T0;
const ids={'Temel':'temel','Sunucu (ilk yazılacak)':'sunucu','Veritabanı':'veritabani','Testler (koddan önce)':'testler','Telefon uygulaması':'telefon','Web paneli':'panel','Altyapı ve işletim':'altyapi'};
T=T.replace(/[ \t]*<details class="det">\s*<summary>([^<]+)<\/summary>([\s\S]*?)<\/details>[ \t]*(\r?\n)?(\r?\n)?/g,(m,name,inner)=>{const id=ids[name];if(!id)throw new Error('det '+name);
  TK.push({id,nav:name.replace(/ \(.*\)$/,''),html:'<section id="'+id+'">'+E+'  <h2>'+name+'</h2>'+inner.replace(/\s+$/,'')+E+'</section>'});return ''});
if(TK.length!==7)throw new Error('expected 7 detail blocks, got '+TK.length);
const oz=at(T,'<h3>Özet</h3>'),ozEnd=at(T,E+'  </div>',oz)+(E+'  </div>').length;
let OZ=T.slice(oz,ozEnd);
for(const [lab,id] of [['Temel','temel'],['Sunucu','sunucu'],['Veritabanı','veritabani'],['Testler','testler'],['Telefon','telefon'],['Web paneli','panel'],['Altyapı','altyapi']])OZ=OZ.replace('<div class="k">'+lab+'</div>','<div class="k"><a href="teknik.html#'+id+'">'+lab+'</a></div>');
T=T.slice(0,oz)+OZ+E+E+'  <p>Her katmanın sürümleri, ayarları ve gerekçeli kütüphane seçimleri: <a href="teknik.html">teknik.html</a>.</p>'+T.slice(ozEnd);
body=body.replace(T0,T);
// 2 dagitim: four operational rows move
[a,b]=sec(body,'dagitim');const D0=body.slice(a,b);let D=D0;const rows=[];
for(const lab of ['Güncelleme sorgusu','xprem güvenliği','Korunacak anahtarlar','Derleme']){const m=D.match(new RegExp('[ \t]*<div class="row"><div class="k">'+lab+'</div>.*\r?\n'));if(!m)throw new Error('row '+lab);rows.push(m[0].replace(/\s+$/,''));D=D.replace(m[0],'')}
const g=at(D,'<h3>Güncelleme</h3>'),gEnd=at(D,E+'  </div>',g)+(E+'  </div>').length;
D=D.slice(0,gEnd)+E+'  <p>Güncelleme sorgusu, xprem güvenliği, korunacak anahtarlar ve derleme: <a href="teknik.html#dagitim-ayrinti">teknik.html, Dağıtım ayrıntıları</a>.</p>'+D.slice(gEnd);
body=body.replace(D0,D);
TK.push({id:'dagitim-ayrinti',nav:'Dağıtım ayrıntıları',html:L('<section id="dagitim-ayrinti">\n  <h2>Dağıtım ayrıntıları</h2>\n  <p>Dağıtım kararları: <a href="plan.html#dagitim">plan.html, Dağıtım ve güncelleme</a>.</p>\n  <div class="rows">\n')+rows.join(E)+L('\n  </div>\n</section>')});
// 3 baslangic: folder layout, data model, dev environment move
[a,b]=sec(body,'baslangic');const B0=body.slice(a,b);let B=B0;
const k1=B.lastIndexOf('\n',at(B,'<h3>Klasör yapısı</h3>'))+1,k2=B.lastIndexOf('\n',at(B,'<h3>İş sırası</h3>'))+1;
const kod=B.slice(k1,k2).replace(/\s+$/,'');
B=B.slice(0,k1)+'  <p>Klasör yapısı, veri modeli (ilk taslak) ve geliştirme ortamı: <a href="teknik.html#kod">teknik.html, Kod düzeni ve geliştirme ortamı</a>.</p>'+E+E+B.slice(k2);
body=body.replace(B0,B);
TK.push({id:'kod',nav:'Kod düzeni',html:L('<section id="kod">\n  <h2>Kod düzeni ve geliştirme ortamı</h2>\n')+kod+E+'</section>'});
// 4 plan header and nav
const rule='Her bilgi tek yerde durur, öbür dosya bağlantı verir.';
const pHeader=header.replace('<p class="meta">Plan ve kararlar · Son güncelleme 5 Ekim 2026</p>','<p class="meta">Plan ve kararlar · Son güncelleme 5 Ekim 2026 · Teknik ayrıntılar: <a href="teknik.html">teknik.html</a></p>'+E+'  <p class="meta">Bu dosya ne yapılacağını ve nedenini anlatır; tam olarak nasıl yapılacağı (sürüm, ayar, komut, dosya düzeni, test ve işletim) teknik.html\'dedir. '+rule+'</p>');
if(pHeader===header)throw new Error('plan meta not found');
const pNav=nav.replace('</nav>','  <a href="teknik.html">Teknik ayrıntılar</a>'+E+'</nav>');
fs.writeFileSync('out/plan.html',head+pHeader+E+E+pNav+body+tail);
// 5 teknik.html
const tHead=head.replace(/<title>[^<]*<\/title>/,'<title>İÜ Yoklama · Teknik ayrıntılar</title>');
const tHeader=L('<header>\n  <h1>İÜ Yoklama · Teknik ayrıntılar</h1>\n  <p class="lead">Planın teknik başvuru kısmı: sürümler, ayarlar, kod düzeni, testler ve işletim.</p>\n  <p class="meta">Kararlar ve gerekçeleri: <a href="plan.html">plan.html</a> · Son güncelleme 5 Ekim 2026</p>\n  <p class="meta">Bu dosya tam olarak nasıl yapılacağını anlatır; ne yapılacağı ve nedeni plan.html\'dedir. '+rule+'</p>\n</header>');
const tNav='<nav aria-label="Bölümler">'+E+TK.map(t=>'  <a href="#'+t.id+'">'+t.nav+'</a>').join(E)+E+'  <a href="plan.html">Plan</a>'+E+'  <a href="plan.html#kaynaklar">Kaynaklar</a>'+E+'  <a href="plan.html#sozluk">Sözlük</a>'+E+'</nav>';
fs.writeFileSync('out/teknik.html',tHead+tHeader+E+E+tNav+E+E+TK.map(t=>t.html).join(E+E)+E+E+tail);
console.log('teknik sections:',TK.map(t=>t.id).join(' '));

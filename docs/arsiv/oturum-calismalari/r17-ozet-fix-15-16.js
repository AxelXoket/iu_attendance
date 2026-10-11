const fs=require('fs'),path=require('path');
const D=process.argv[2];
const rep=(n,pairs)=>{const f=path.join(D,'ozet','asama-'+n+'.json');const o=JSON.parse(fs.readFileSync(f,'utf8'));
 for(const [a,b] of pairs){let hit=0;o.paragraflar=o.paragraflar.map(p=>{if(p.includes(a)){hit++;return p.split(a).join(b);}return p;});if(hit!==1)throw new Error('phase '+n+' no unique hit: '+a.slice(0,60));}
 fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n','utf8');
 console.log(n,o.paragraflar.map(p=>p.split(/\s+/).filter(Boolean).length));};
rep(15,[
 ["Uçtan uca senaryoların ortak düzeneği kurulur","Uçtan uca senaryoların düzeneği kurulur"],
 ["Açık sıra kararı: iş listesini kuran paket 16. aşamada olduğundan D02-P21, D02-P24, D02-P25 ve D02-P26'nın arka plan işi çalıştıran senaryoları o zamana dek kırmızıdır; paket öne alınırsa yeşildir.",
  "Açık sıra kararı: oturumları takvimden yeniden üreten iş ve iş listesi 16. aşamada yazılır; o zamana dek D02-P21'den D02-P26'ya altı paketin arka plan işi çalıştıran senaryoları kırmızıdır, ikisi öne alınırsa yeşildir."]
]);
rep(16,[
 ["Var olan saklama silmesini gece çalıştıran iş ile dönemlere bölünecek tablolarda eksik bölümü yakalayan, bugün boşta duran denetim yazılır; ikisinin yalnız saat ve süre ayarları denetlenir (D12-P10). Panelin liste dosyasını okuması için dosya türü ve parola tanıma, Türkçe kodlama ve CSV katmanı yazılır (D03-P05); saklama silmesinin davranışı ve satırları çıkaran okuma sonraki aşamalarda gelir.",
  "Var olan saklama silmesini her gece çalıştıran iş ile dönemlere bölünecek tablolarda eksik bölümü yakalayan, bugün boşta duran denetim yazılır (D12-P10); ikisinin yalnız saat ve kuyruk ayarları denetlenir, saklama işinin davranışını sınayan senaryolar sonraki aşamada gelir. Panelin liste dosyasını okuması için dosya türü ve parola tanıma, Türkçe kodlama ve CSV katmanı yazılır (D03-P05); satırları numara ve ada eşleyen okuma henüz yoktur."],
 ["20.000 işin partilerle tekli işlemeden en az 10 kat hızlı bitmesini","20.000 işin partilerle tek tek işlemeden en az 10 kat hızlı bitmesini"]
]);

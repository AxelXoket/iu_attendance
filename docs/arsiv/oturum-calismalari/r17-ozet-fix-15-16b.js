const fs=require('fs'),path=require('path');
const D=process.argv[2];
const rep=(n,pairs)=>{const f=path.join(D,'ozet','asama-'+n+'.json');const o=JSON.parse(fs.readFileSync(f,'utf8'));
 for(const [a,b] of pairs){let hit=0;o.paragraflar=o.paragraflar.map(p=>{if(p.includes(a)){hit++;return p.split(a).join(b);}return p;});if(hit!==1)throw new Error('phase '+n+' no unique hit: '+a.slice(0,60));}
 fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n','utf8');
 console.log(n,o.paragraflar.map(p=>p.split(/\s+/).filter(Boolean).length));};
rep(15,[["ikisi öne alınırsa yeşildir","öne alınırlarsa yeşildir"]]);
rep(16,[
 ["tek tek işlemeden","tekli işlemeden"],
 ["saklama silmesini her gece çalıştıran","saklama silmesini gece çalıştıran"],
 ["ikisinin yalnız saat ve kuyruk ayarları denetlenir, saklama işinin davranışını sınayan senaryolar","ikisinin yalnız ayarları denetlenir, saklama işini sınayan senaryolar"],
 ["bu kural burada gün sonu kopyasıyla","bu kural gün sonu kopyasıyla"],
 ["seçeneği açık (D10-P15). Güvenlik ağı","seçeneği açık; güvenlik ağı"]
]);

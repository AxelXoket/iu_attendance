// Critic round 2 fixes: exact unique replacements, abort on any miss.
const fs=require('fs');const f=process.argv[2];let s=fs.readFileSync(f,'utf8');
const R=[
 // A4 + B3: gapped verb at the end, drop tarayicida (web paneli implies the browser)
 ['hoca ve yönetici ayrıca tarayıcıda web panelini.</li>','hoca ve yönetici ayrıca web panelini kullanır.</li>'],
 // A5
 ['Yönetici, hoca (asistan, ortak hoca sonra).','Yönetici, hoca; asistan, ortak hoca rolleri sonra.'],
 // B2
 ['<code>@istanbul.edu.tr</code> uzantılı e-postayla','<code>@istanbul.edu.tr</code> e-postayla'],
 // A1: keep the finite negation next to its rationale
 ['e-posta kuyruğa konmadan, cevap beklenmeden gider (kuyruk','e-posta cevap beklenmeden gider, kuyruğa konmaz (kuyruk'],
 // A2: the level itself requires two factors
 ['Hedefim ASVS 5.0 seviye 2 (6.3.3 iki etkenli giriş ister);','Hedefim ASVS 5.0 seviye 2 (iki etkenli giriş ister, 6.3.3);'],
 // A3
 ['büyük küçük harf Türkçe kuralla yok sayılır.','büyük küçük harf farkı Türkçe kuralla yok sayılır.'],
 // B4
 ['Teyide kadar yoklama verilebilir, kayıtlar beklemede kalır.','Teyide kadar yoklama verilebilir, kayıtlar beklemede.'],
 // B5
 ['Deneme hocası yalnız kendi adresine tanımlı','Deneme hocası yalnız adresine tanımlı'],
 // A7
 ['İkisi de yalnız her an açık deneme dersini görür','İki hesap da yalnız her an açık deneme dersini görür'],
];
for(const [a,b] of R){const n=s.split(a).length-1;if(n!==1){console.error('NOT UNIQUE/MISSING ('+n+'): '+a);process.exit(1)}s=s.replace(a,b)}
fs.writeFileSync(f,s);console.log('applied',R.length);

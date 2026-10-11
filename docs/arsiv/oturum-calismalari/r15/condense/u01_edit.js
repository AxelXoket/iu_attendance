// Applies exact, unique string replacements to u01.out.html; aborts if any old string is missing or not unique.
const fs=require('fs');const f=process.argv[2];let s=fs.readFileSync(f,'utf8');
const R=[
 ['Az denenmiş yaklaşım: erken ve geniş denenir.','Erken ve geniş denenir (az denenmiş yaklaşım).'],
 ['bölüm ve yalnız <code>@istanbul.edu.tr</code> uzantılı kurumsal e-postayla başvuru','bölüm ve yalnız <code>@istanbul.edu.tr</code> uzantılı e-postayla başvuru'],
 ['Telefonda en geç 30 gün, kullanımla uzamaz; son 3 günde internet varken yeni kod istenir.','Telefonda en geç 30 gün, kullanımla uzamaz; bitmeden 3 gün önce, internet varken yeni kod istenir.'],
 ['Kod isteğinin cevabı ve hızı her durumda aynı; e-posta cevap beklenmeden gider, iş kuyruğuna konmaz (kuyruk','Kod isteğine her durumda aynı cevap, aynı hızda; e-posta kuyruğa konmadan, cevap beklenmeden gider (kuyruk'],
 ['tek numaraya bağlı','tek öğrenci numarasına bağlı'],
 ['Yalnız ilk kayıtta; sonra şifre, giriş yok.','Yalnız ilk kayıtta; sonra şifre ya da giriş yok.'],
 ['Çıkış ve silip yeniden kurma değişim sayılır.','Çıkış ya da silip yeniden kurma değişim sayılır.'],
 ['3 cihaz, tek telefon kuralından muaf','3 cihaz ve tek telefon kuralından muaf'],
];
for(const [a,b] of R){const n=s.split(a).length-1;if(n!==1){console.error('NOT UNIQUE/MISSING ('+n+'): '+a);process.exit(1)}s=s.replace(a,b)}
fs.writeFileSync(f,s);console.log('applied',R.length);

const fs=require('fs');const d=__dirname+'/../';
const edit=(file,pairs)=>{let s=fs.readFileSync(d+file,'utf8');for(const [a,b] of pairs){const n=s.split(a).length-1;if(n!==1)throw new Error(file+' count '+n+' for '+a.slice(0,70));s=s.replace(a,b);}fs.writeFileSync(d+file,s);};
edit('data-rest.js',[
 [`kilitAnahtarlari yalnız gövdeyi çözer, kilit almaz ve her öğe için 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' (katman 3) döner;`,
  `kilitAnahtarlari yalnız okur, kilit almaz: gövdedeki satırın numarasını D03.satirGetir ile bellekte çözer ve numaranın oturum şubelerindeki satırlarının 'duzeltmeler:zincir:<oturumId>:<satirId>' anahtarlarını (katman 3) döner;`],
 [`Hesabı olmayan öğrencide hesap işi ders düzeyinde konur: devamHesaplaIsiKoy(tx, dersId, null, neden) ve öğrenci sürümü çağrılmaz.",`,
  `Hesabı olmayan öğrencide hesap işi ders düzeyinde konur: devamHesaplaIsiKoy(tx, dersId, null, neden) ve öğrenci sürümü çağrılmaz. Tek öğrenci kuralının D09'daki karşılığı: aynı numaranın oturum şubelerinde birden çok satırı varsa (şube değişimi, yeniden ekleme) numaranın aynı oturumdaki başka satırında etkin düzeltme dururken gelen öğe RET DUZELTMELER_DUZELTME_VAR alır; bunun için zincir anahtarları numaranın o oturumun şubelerindeki bütün satırları için alınır (satırlar D03.ogrencininSatirlari ile kilitsiz okunur).",`],
 [`t('behavior', "201 öğeli toplu istek 400 alır",`,
  `t('behavior', "Aynı numaranın iki liste satırı tek öğrencidir", "Öğrenci ortak oturumu olan iki şube arasında ONCEKI_YOK ile taşındı: eski satıra Görevli düzeltmesi varken aynı oturumda yeni satıra gelen düzeltme RET DUZELTMELER_DUZELTME_VAR ve zincir sayısı 1; eski satırdaki düzeltme geri alınınca yeni satıra aynı öğe KABUL (pozitif kontrol); iki satıra eşzamanlı iki düzeltmeden yalnız biri KABUL."),\n  t('behavior', "201 öğeli toplu istek 400 alır",`]
]);
edit('data-endpoints.js',[
 [`Danışma anahtarları: bütün öğelerin 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' anahtarları (katman 3) işlemin ilk çağrısıdır;`,
  `Danışma anahtarları: bütün öğelerin 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' anahtarları (katman 3; numaranın aynı oturum şubelerindeki öbür satırlarınınkiler de, D09-A08) işlemin ilk çağrısıdır;`]
]);
edit('build-d09.js',[
 [`Toplu yazma uçları tek işlemde çalışır: önce danışma anahtarları tek çağrıda, sonra kanonik sırayla öğe başına SAVEPOINT (teyit kararları öğe başına ayrı işlem, D09-B40);`,
  `Toplu yazma uçları (öğe başına ayrı işlemle yürüyen teyit kararları dışında, D09-B40) tek işlemde çalışır: önce danışma anahtarları tek çağrıda, sonra kanonik sırayla öğe başına SAVEPOINT;`],
 [`Hesabı olmayan öğrencide hesap işi ders düzeyindedir: devamHesaplaIsiKoy(tx, dersId, null, neden) (contracts.json ortak kuralı, D09-A08).`,
  `Hesabı olmayan öğrencide hesap işi ders düzeyindedir: devamHesaplaIsiKoy(tx, dersId, null, neden). Numaranın aynı oturumdaki başka satırında etkin düzeltme varken gelen öğe RET DUZELTMELER_DUZELTME_VAR alır (contracts.json ortak kuralı, D09-A08).`]
]);
console.log('ok');

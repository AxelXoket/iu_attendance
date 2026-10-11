const fs=require('fs');
const R=[
[' Sunucu gelen baytları doğrular, yeniden biçimlendirmez.', ' Sunucu için anlamı: gelen baytlar doğrulanır, yeniden biçimlendirilmez (teknik.html#sunucu-imza-dogrulama).'],
[' Gönderme cevabı ulaşmayı ve kararı ayrı ayrı taşımalıdır.', ' Sunucu için anlamı: gönderme cevabı ulaşmayı ve kararı ayrı alanlarda taşır.'],
['; yani eşitleme öğrencinin kendi kayıtlarının ulaşma durumunu telefona taşımalıdır.', '. Sunucu için anlamı: eşitleme öğrencinin kendi kayıtlarının ulaşma durumunu telefona taşır.'],
[' Sunucu gece gelen gönderimleri olağan saymalıdır.', ' Sunucu için anlamı: gece gelen gönderim olağandır.'],
[' Paket imzasız da gelebilir.', ' Sunucu için anlamı: paket imzasız (ikinci çapasız) da gelebilir.'],
[' Sunucunun bütün cevapları telefonun tanıyabileceği tek biçimde olmalıdır.', ' Sunucu için anlamı: telefona giden her cevap sözleşmedeki biçimdedir, telefon başka biçimi başarısız sayar.'],
['; sunucu aynı kaydın sonradan yeniden gelmesine hazır olmalıdır.', '. Sunucu için anlamı: reddedilmiş kayıt sonradan aynen yeniden gelebilir.'],
[' Gönderim ucu geç kaydı kabul etmelidir.', ' Sunucu için anlamı: gönderim ucu geç kaydı kabul eder.'],
[' Sunucu her oturum için gönderme süresinin bitip bitmediğini bilmelidir.', ' Sunucu için anlamı: her oturum için gönderme süresinin bitip bitmediği hesaplanabilmeli.'],
[' İnen oturum satırı bu iki anı taşır.', ' Sunucu için anlamı: inen oturum satırı bu iki anı taşır.'],
[' (tasarımdaki örnek: \"1 iş telefonda bekliyor (kafa sayısı)\")', ''],
['; sunucu kararın telefona ulaştığı anı bilmelidir.', '. Sunucu için anlamı: kararın telefona ulaştığı an bilinmeli.'],
['; bu verinin telefona inmesi gerekir.', '. Sunucu için anlamı: bu veri telefona inmeli.'],
['; gönderim ucu eski anahtarın kayıtlarını kabul etmelidir.', '. Sunucu için anlamı: gönderim ucu eski anahtarla imzalı kayıtları kabul eder.'],
['; kaydı üreten sürüm sunucuda bilinmelidir.', '. Sunucu için anlamı: kaydı üreten sürüm bilinmeli.'],
['; sunucu öğrencinin telefonunun son bağlantı anını bilmelidir.', '. Sunucu için anlamı: öğrencinin telefonunun son bağlantı anı bilinmeli.'],
[' Öğe sonucu sözlüğü genişleyebilir olmalıdır.', ' Sunucu için anlamı: öğe sonucu sözlüğü genişleyebilen değerdir.'],
['; sunucu kayıtların sırasız gelmesine dayanıklıdır.', '. Sunucu için anlamı: kayıtlar sırasız gelebilir.'],
['; indirme cevapları ara katmanlarda önbelleğe alınmaz.', '. Sunucu için anlamı: indirme cevapları ara katmanlarda önbelleğe alınmaz.'],
['; bunun için öğe başına sonuç gerekir.', '. Sunucu için anlamı: öğe başına sonuç döner.'],
['; panel oturumun gönderme süresinin bitip bitmediğini sunucudan almalıdır.', '. Sunucu için anlamı: panel oturumun gönderme süresinin bitip bitmediğini sunucudan alır.'],
['; sürüm kontrolü API\'de, uzaktan güncelleme sorgusu xprem\'de karşılanır.', '. Sunucu için anlamı: sürüm kontrolü API\'de, uzaktan güncelleme sorgusu xprem\'de karşılanır.'],
['; bu kayıtların sunucuya bir yoldan ulaşması gerekir.', '. Sunucu için anlamı: bu kayıtlar değişimden sonra da sunucuya ulaşabilmeli.'],
[' Sunucu cevabı kanala göre farklılaşır.', ' Sunucu için anlamı: sürüm cevabı kanala göre farklılaşır.'],
[' Sunucu her oturum için', ' Sunucu için anlamı: her oturum için']
];
let hits=new Set();
for(const f of ['decided1.json','decided2.json','decided3.json']){
  let s=fs.readFileSync(f,'utf8');
  for(const [a,b] of R){ if(s.includes(a)){ s=s.split(a).join(b); hits.add(a);} }
  fs.writeFileSync(f,s,'utf8');
}
R.forEach(([a])=>{ if(!hits.has(a)) console.log('NO HIT: '+a.slice(0,60)); });

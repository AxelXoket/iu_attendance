const fs = require('fs');
const rep = (f, a, b) => { const s = fs.readFileSync(f, 'utf8'); const n = s.split(a).length - 1; if (n !== 1) { console.log('COUNT', n, f, JSON.stringify(a.slice(0, 70))); process.exitCode = 1; return; } fs.writeFileSync(f, s.replace(a, b)); console.log('ok', f, JSON.stringify(b.slice(0, 60))); };
// (a) değişmez 3: dönemler arası kalan yarış
rep('icerik.js', `"Bir kayıt kimliği tabloda en çok bir kez bulunur: (dönem, kimlik) birincil anahtarla, dönemler arası tekillik eklemeden önceki aramayla korunur (D05-C01).",`,
  `"Bir kayıt kimliği bir dönemde en çok bir kez bulunur (birincil anahtar); başka dönemde saklı kimlik eklemeden önceki aramayla bulunur ve karşılaştırılır. Kalan tek açık yarış, iki farklı cihazın aynı kimliği aynı anda iki ayrı dönemin oturumuna göndermesidir; iki satır da imzalı kanıttır, hiçbiri öbürünün yerine yazılmaz (D05-C01).",`);
// (b) değişmez 7: sürüm artışı notu
rep('icerik.js', `"RET ve TEKRAR_DENE yoklama_kayitlari'na satır yazmaz ve 2'lik sınırı, karar geçmişini, durum sürümünü değiştirmez; KABUL tam bir satır yazar.",`,
  `"RET ve TEKRAR_DENE yoklama_kayitlari'na satır yazmaz, 2'lik sınırı, karar geçmişini ve devam işini değiştirmez; KABUL tam bir satır yazar. Durum sürümü eklemeden önce alındığından eklemeyen yarışta yalnız zararsız bir sürüm artışı kalabilir (telefon boş değişiklik indirir).",`);
// (d) değişmez 15: kafa sayısı
rep('icerik.js', `"Kafa sayısı ya da 'ders yapıldı mı' cevabı gelmeden oturumun kayıt listesi ve sayıları hiçbir cevapta dönmez (plan.html#kararlar-kafa-sayisi).",`,
  `"Kafa sayısı ya da 'ders yapıldı mı' cevabı gelmeden oturumun kayıt listesi ve sayıları bu modülün hiçbir cevabında dönmez; okutma cevabı yalnız okutulan kaydın kararını taşır (plan.html#kararlar-kafa-sayisi).",`);
// (e) sayilanKayitlar: üst sınır yerine dizinli süzgeç
rep('icerik.js', `Oturum, öğrenci, cihaz ya da açık karar koşulundan biri zorunlu; sonuç 10.000 satırı aşarsa hata.`,
  `Oturum, öğrenci, cihaz ya da açık karar koşulundan biri zorunludur, dizin dışı tarama yapılmaz; bir dersin bütün şubeleri gibi büyük kümeler oturum listesiyle parça parça okunur.`);
// (f) öğe türüne göre gerekçe listeleri
rep('icerik.js', `    errors: RET_KODLARI.map(r => r[0]),
    idempotency: "(dönem, kimlik).`, `    errors: RET_KODLARI.map(r => r[0]).filter(k => !['HOCANIN_DERSI_DEGIL', 'HESAP_UYUSMUYOR'].includes(k)),
    idempotency: "(dönem, kimlik).`);
rep('icerik.js', `    errors: RET_KODLARI.map(r => r[0]),
    idempotency: "Öğe kimliği (makbuz_okutmalari.id) ve (kurulum, sıra) tekil; aynı öğe yeniden gelirse saklı sonuç ZATEN_VAR olarak döner, kayıt yeniden işlenmez. TEKRAR_DENE satır yazmaz.",`,
  `    errors: RET_KODLARI.map(r => r[0]).filter(k => !['GONDEREN_UYUSMUYOR', 'IKINCI_CAPA_GEREKLI'].includes(k)),
    idempotency: "Öğe kimliği (makbuz_okutmalari.id) ve (kurulum, sıra) tekil. Aynı öğe yeniden gelirse zarf özeti ve hoca aynıysa saklı sonuç ZATEN_VAR olarak döner, kayıt yeniden işlenmez; farklıysa RET KIMLIK_CAKISMASI, saklı satır değişmez (D13-B12). TEKRAR_DENE satır yazmaz.",`);
// (g) okutma durum makinesi ilk geçiş
rep('icerik.js', `{ from: 'GELDI', to: 'ZATEN_VAR', by: 'okutmaIsle', when: "Öğe kimliği makbuz_okutmalari'nda saklı: saklı sonuç ve kaydın güncel kararı döner, kayıt yeniden işlenmez." },`,
  `{ from: 'GELDI', to: 'ZATEN_VAR', by: 'okutmaIsle', when: "Öğe kimliği makbuz_okutmalari'nda aynı zarf özeti ve hocayla saklı: saklı sonuç ve kaydın güncel kararı döner, kayıt yeniden işlenmez (farklı içerikse RET KIMLIK_CAKISMASI)." },`);
// (h) A07 (3) ifadesi
rep('icerik.js', `danışma kilidiyle sıraya girer; sayılan dizinine takılan kayıt hiç oluşmaz, sonuç aynıdır (kayıt atılmaz, kabul alır).`,
  `danışma kilidiyle sıraya girer, sayılan dizinine takılma oluşmaz; sonuç aynıdır (kayıt atılmaz, kabul alır).`);
// RET_KODLARI KIMLIK_CAKISMASI açıklaması okutma çakışmasını da kapsasın
rep('icerik.js', `['KIMLIK_CAKISMASI', 'RET', "Aynı kimlik (herhangi bir dönemde) başka metinle saklı; saklanan kayıt değişmez.",`,
  `['KIMLIK_CAKISMASI', 'RET', "Aynı kayıt kimliği (herhangi bir dönemde) başka metinle saklı, ya da aynı okutma öğesi kimliği başka zarfla ya da başka hocayla saklı; saklanan satır değişmez.",`);
// (c), (i), (j), okutma adım 2: uret.js
rep('uret.js', `2'lik sınır kullanımı, karar geçmişi, devam işi ve Aşama 2 kanıt satırı yalnız satır eklendikten sonra yazılır; eklenmeyen kayıt iz bırakmaz.`,
  `2'lik sınır kullanımı, karar geçmişi, devam işi ve Aşama 2 kanıt satırı yalnız satır eklendikten sonra yazılır; eklenmeyen kayıt bunların hiçbirini bırakmaz. Durum sürümü eklemeden önce alınır; eklemeyen yarışta yalnız zararsız bir sürüm artışı kalabilir.`);
rep('uret.js', `sayılar panelSayilari ile, gönderme süresinin sonu D06.gondermeSuresiSonu ile.`,
  `sayılar panelSayilari ile, gönderme süresinin sonu D06.gondermeSuresiSonu ile, şimdiki an D04.simdi ile.`);
rep('uret.js', `Hesap silinmiş ve doğrulanmış saat silme anından sonraysa RET HESAP_SILINMIS.`,
  `Cihaz hesap silme nedeniyle kapalıysa silme anı D01.kisiGetir ile okunur; doğrulanmış saat silme anından sonraysa RET HESAP_SILINMIS.`);
rep('uret.js', `"Öğe kimliği makbuz_okutmalari'nda varsa saklı sonuç ZATEN_VAR olarak döner, kayıt yeniden işlenmez.",`,
  `"Öğe kimliği makbuz_okutmalari'nda varsa: zarf özeti ve hoca aynıysa saklı sonuç ZATEN_VAR olarak döner, kayıt yeniden işlenmez; farklıysa RET KIMLIK_CAKISMASI.",`);

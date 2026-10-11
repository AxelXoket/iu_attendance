const fs = require('fs');
const f = 'icerik.js'; let s = fs.readFileSync(f, 'utf8');
const after = (anchorStart, add) => { const i = s.indexOf(anchorStart); if (i < 0 || s.indexOf(anchorStart, i + 1) >= 0) throw new Error('anchor ' + anchorStart); const end = s.indexOf('\n', i); s = s.slice(0, end + 1) + add + s.slice(end + 1); };
after(`  T("Ulaşma anı saat arayüzünden", 'behavior'`,
`  T("Öğrencinin indirmesi yalnız kendi kayıtlarını verir", 'behavior', "ogrencininKayitlari yalnız o öğrencinin kayıtlarını ve verilen sürümden sonrakileri döner; zarf, cihaz ve anahtar alanı içermez; başka öğrencinin kaydı hiç inmez (pozitif kontrol: kendi kaydı hocanın okutmasıyla gelmişse iner)."),
  T("Eklenmeyen yarış iz bırakmaz", 'behavior', "İki bağlantı aynı kimliği farklı (oturum, öğrenci) metniyle aynı anda gönderir: biri KABUL, öbürü RET KIMLIK_CAKISMASI; karar geçmişinde, 2'lik sınır sayacında ve devam kuyruğunda yalnız kabul edilenin izi vardır."),
  T("Saklama işleyicisi yalnız verilen dönemi siler", 'behavior', "Silme kipinde verilen dönemin iki tablodaki satırları silinir, öbür dönem aynen kalır; anonimleştirme kipinde hiçbir satır değişmez; yoklama_api rolüyle silme yetki hatası verir."),
  T("Kanıt çıkarma", 'behavior', "kanitCikar saklı zarfı bayt bayt aynen, açık anahtarı ve imzanın şimdi yeniden doğrulandığını döner; anahtar yenilenip etkinliğini yitirmiş olsa da doğrulama geçer; bir baytı bozulmuş zarfta 'doğrulanmadı' der."),
`);
after(`  T("Karşılaştırma tablosu", 'property'`,
`  T("İlk kesin karar bir kez yazılır", 'property', "BEKLEMEDE ile başlayan rastgele karar dizileri kararSutunlariniYaz ile uygulanınca ilk_kesin_karar ilk BEKLEMEDE dışı karar olur ve sonra değişmez; her adımda tam bir sayılan kalır, CHECK hiç ihlal edilmez (gerçek veritabanı, numRuns 300)."),
`);
fs.writeFileSync(f, s); console.log('tests added');

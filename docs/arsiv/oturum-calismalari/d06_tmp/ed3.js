// One-off edits for veri-3.js (resolved gaps) in the D06 align round.
const fs = require('fs'); const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
const R = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) { console.error('MATCH ' + n + ': ' + a.slice(0, 90)); process.exitCode = 1; return; } s = s.replace(a, () => b); };

// B02: uppercase reasons from D04, no signing helper for the belge endpoint
R(`ogeler: [{ id, olaydanBelgeyeMs } ya da { id, yokNedeni: 'sonra_yeniden_baslatma' }] }.`,
  `ogeler: [{ id, olaydanBelgeyeMs } ya da { id, yokNedeni: 'SONRA_YENIDEN_BASLATMA' }] }.`);
R(`eşleşmeyen tür ya da tutmayan imza 'imza tutmuyor' sayılır: öğeler YOK paket_imzasiz alır ve imzadan kimlik kurulmaz.`,
  `eşleşmeyen tür ya da tutmayan imza 'imza tutmuyor' sayılır: öğeler YOK PAKET_IMZASIZ alır ve imzadan kimlik kurulmaz.`);
R(`işleyiciye öğe başına { durum: 'VAR', imzaTuru, belge, istekSuresiMs, olaydanBelgeyeMs } ya da { durum: 'YOK', yokNedeni } verilir (D04'ün IkinciCapa adlarıyla).",`,
  `işleyiciye öğe başına { durum: 'VAR', imzaTuru, belge, istekSuresiMs, olaydanBelgeyeMs } ya da { durum: 'YOK', yokNedeni } verilir. yokNedeni D04'ün büyük harfli sabitlerinden içe aktarılır (SONRA_YENIDEN_BASLATMA, PAKET_IMZASIZ, OKUTMA_YOLU, BASKA_CIHAZ_GONDERDI, ESITLEME_BOZUK, GONDERILMEDI); D06 bağlamda yalnız dördünü üretir (SONRA_YENIDEN_BASLATMA, PAKET_IMZASIZ, ESITLEME_BOZUK, GONDERILMEDI), OKUTMA_YOLU ve BASKA_CIHAZ_GONDERDI tipin parçasıdır. Belge ucu (POST /v1/saat/belge) için D06 ikinci çapa imza yardımcısı vermez: belge ucu oturumla ve app.ts'in saatOznesiKur'uyla çalışır.",`);
R(`Bölünen pakette yalnız bu küçük metin yeniden imzalanır. D06 D04'ün sunucu dış yüzünü çağırmaz (contracts notu)."`,
  `Bölünen pakette yalnız bu küçük metin yeniden imzalanır. D06 D04'ün sunucu dış yüzünü çağırmaz (contracts notu). Neden değerleri tek yerde yazılır, başka modül içe aktarır (contracts.json ortak kural, adlar)."`);

// B10: restricted session, Kimlik shape, PaketBaglami.kimlik, hesapSilindiMi
R(`D13'ün istek hattında, işleyiciden önce kurulur: kök oturum kancası Bearer'ı doğrular (bu rotada geçersiz Bearer yalnız istek.oturumHatasi'na yazılır);`,
  `D13'ün istek hattında, işleyiciden önce kurulur: kök oturum kancası Bearer'ı doğrular (bu rotada geçersiz Bearer ve değişim bekleyen kısıtlı oturum yalnız istek.oturumHatasi'na yazılır; KIMLIK_KAPSAM_SINIRLI olan istek oturumsuz sayılır);`);
R(`Oturum yok ve imza geçerliyse istek.kimlik = { tur: 'cihaz', kisiId, roller: ['ogrenci'], cihazId } yazılır; X-Saat-Belgesi kancası özneyi buradan bulur.`,
  `Oturum yok ve imza geçerliyse istek.kimlik = { tur: 'cihaz', kaynak: 'imza', kisiId, cihazId } yazılır; X-Saat-Belgesi kancası özneyi buradan bulur. İşleyicilere PaketBaglami.kimlik verilir: oturumdan gelen istek.kimlik, öğrenci cihaz imzalı oturumsuz pakette null (D05 dersYetkisi'ne bunu verir). Silinmiş hesap PaketBaglami'nda alan olarak taşınmaz; gerektiğinde D01.hesapSilindiMi ile denetlenir.`);

// B13: batch read
R(`kurulumSonTemasi kişinin bütün kurulumları içinde en son teması ve herhangi bir kurulumun kendi son temasında bekleyen yoklama bildirip bildirmediğini verir; KARAR BEKLİYOR kuralı D08 ve D10'undur.`,
  `kurulumSonTemasi kişinin bütün kurulumları içinde en son teması ve herhangi bir kurulumun kendi son temasında bekleyen yoklama bildirip bildirmediğini verir; çok kişide toplu kurulumSonTemaslari(tx, kisiIdler) tek sorguyla aynı değeri verir; bekleyen öğe sayısı (bekleyenOgeSayisi) verilmez, bağlantı nedeni için boolean yeterlidir. KARAR BEKLİYOR kuralı D08 ve D10'undur.`);

// B14: teyit in account summary
R(`hesap özeti kişi kimliği ile teyit durumunun ('1', '0', personelde '-') birleşiminin SHA-256'sının ilk 16 onaltılık hanesi, teyit değişince baştan indir).`,
  `hesap özeti kişi kimliği ile teyit durumunun ('1', '0', personelde '-') birleşiminin SHA-256'sının ilk 16 onaltılık hanesi; teyit durumu D01.ogrenciHesabiGetir'den okunur, teyit değişince baştan indirme olur ve öğrencinin adı o indirmede iner; D03 teyidi bilmez, degistiMi'ye teyit gelmez).`);

// B15: scope sources split
R(`Kapsam değişince o kullanıcıya baştan indir; kapsam değişikliği yalnız bu yolla işlenir. İki kapsam kaynağını da D02 kaydeder: öğrencinin kapsamı D03'ün liste kaynağındaki silinmemiş (etkin ya da pasif) liste satırlarından, personelinki ders sahipliğinden;`,
  `Kapsam değişince o kullanıcıya baştan indir; kapsam değişikliği yalnız bu yolla işlenir. Öğrenci kapsam kaynağını D03 'ogrenci_liste_kapsami' adıyla kaydeder (öğrencinin silinmemiş, etkin ya da pasif liste satırlarının şubeleri; veri ve uyelik_surumu D03'ün), personel kapsam kaynağını D02 kaydeder (ders sahipliği ve sahip atama sürümü);`);
R(`(D06 D01.ogrenciHesabiGetir ile okur, D03-A09);`, `(D06 D01.ogrenciHesabiGetir ile okur ve teyidi imleçteki hesap özetine katar, D03-A09);`);
R(`"'Şu sürümden beri değişenler' süzgeç değişince yanılır: sonradan eklenen öğrencinin dersi eski sürümde kalır. Üç modülün üç ayrı sahip saydığı kapsam tek sahipte birleşti; degistiMi'nin uygulayıcısı yoksa yeniden başlatma kuralı çalışmazdı.`,
  `"'Şu sürümden beri değişenler' süzgeç değişince yanılır: sonradan eklenen öğrencinin dersi eski sürümde kalır. Öğrencinin kapsamı D03'ün verisi ve sürümüyle hesaplanır; D02 üzerinden kurmak D03'ün satırını D02'nin içinden okuyan ikinci bir yol açardı (contracts.json karar 'Öğrenci kapsam kaynağı'); degistiMi'nin uygulayıcısı yoksa yeniden başlatma kuralı çalışmazdı.`);

// B16: lock source
R(`son hafta telefonun bildiği son oturumdan ve ders satırıyla inen birim son gününden çıkarılır (D08-B23).`,
  `son hafta telefonun bildiği son oturumdan ve D02'nin kilit genel kaynağındaki birim dönemi satırıyla inen son gün ve kilit anından çıkarılır (D02-B32; D08-B23).`);

// B18: first-use row, CLI path
R(`değeri yalnız D06'nın yönetim komutu (enEskiGecerliSurumuYukselt, aynı işlemde D09.denetimeYaz olayı) değiştirir, göç satır yazmaz (D12-B34).",`,
  `değeri yalnız D06'nın yönetim komutu (apps/server/src/cli/esitleme-en-eski-surum.ts, enEskiGecerliSurumuYukselt ve aynı işlemde D09.denetimeYaz olayı) değiştirir; göç satır yazmaz (D12-B34), satır ilk kullanımda INSERT ... ON CONFLICT (id) DO NOTHING ile açılır.",`);

// B19: version stamp mechanism
R(`surumAl(tx) INSERT INTO degisiklik_sayaci (id, surum) VALUES (1, 1) ON CONFLICT (id) DO UPDATE SET surum = degisiklik_sayaci.surum + 1 RETURNING surum çalıştırır; satır kilidi işlem sonuna kadar kalır; okuyucu satır yoksa sürümü 0 sayar. Kural: çağıran inen satırlarını yazdıktan sonra, işlemin son adımlarından biri olarak çağırır (satırlar, iş kuyruğu, sayaç; D03-A10), dönen sürümü o işlemde yazdığı inen satırlara tek UPDATE ile koyar ve sayaçtan sonra yeni satır kilidi almaz. Yalnız telefona inen bir sütun değişince sürüm alınır. Gönderim işleminde öğe işleyicisi surumAl çağırmaz: baglam.surumlaDamgala(async surum => ...) ile damga kaydeder; D06 bütün gruplardan ve öğrenci onayından sonra, defter yazımından hemen önce surumAl'ı bir kez çağırır ve damgaları sırayla çalıştırır. Damga yalnız işleyicinin kendi yazdığı satırları günceller; hata beklenmeyen hatadır, işlem geri alınır.`,
  `Sürüm tek düzenekle verilir (contracts.json ortak kural 'Sürüm damgası'): telefona inen satırı yazan kod surumDamgasiIste(tx, damga) ile damgayı işleme bağlar; işlemin sahibi son adımda surumAl(tx)'ı bir kez çağırır; surumAl UPDATE degisiklik_sayaci SET surum = surum + 1 WHERE id = 1 RETURNING surum çalıştırır (satır yoksa ilk kullanımda INSERT ... ON CONFLICT (id) DO NOTHING ile açar), sayaç bir kez artar ve bekleyen bütün damgalar aynı sürümle çağrılır; satır kilidi işlem sonuna kadar kalır, okuyucu satır yoksa sürümü 0 sayar. Damga yalnız işlemde zaten kilitli satırları günceller; sayaçtan sonra yeni satır kilidi alınmaz (bu kural kalır). Damgalı işlem surumAl çağrılmadan biterse surumDamgasiIste'nin D12.islemSonuKancasi ile kaydettiği denetim hata atar ve işlem geri alınır. Sıra: danışma anahtarları, satırlar, iş kuyruğu (D14.isGonder) ve öğrenci sürümü (ogrenciDurumuDegisti), en son genel sayaç. Yalnız telefona inen bir sütun değişince damga istenir. Gönderimde sahibi D06'dır: öğe işleyicisi surumAl çağırmaz, baglam.surumlaDamgala (surumDamgasiIste'ye giden kısayol) ile damga bırakır; D06 paket sonunda, bütün gruplardan, öğrenci onayından, defter ve kurulum yazımından sonra surumAl'ı bir kez çağırır. Üretimde sahibi D02'dir: D04'ün üretim dinleyicisi surumAl çağırmaz, damga bırakır. Parça SAVEPOINT'i geri alınınca o parçada kaydedilen damgalar düşer.`);
R(`D04'ün pencere işleyicileri paketin ortasında surumAl çağırsaydı sayaç satırı paketin geri kalanı`,
  `Damganın işleme bağlanması sürümü birden çok yazıcının arasında tek değere indirir ve unutulan surumAl'ı sessiz kalmaktan çıkarır (işlem geri alınır). D04'ün pencere işleyicileri paketin ortasında surumAl çağırsaydı sayaç satırı paketin geri kalanı`);

// B26: listener via kimlikDinleyicileriniKur, retention class
R(`D06, D01'in kimlikOlayiDinleyicisiKaydet'ine (app.ts'ten seçenekle) 'hesap_silindi' dinleyicisi kaydeder; dinleyici silen işlemin içinde kişinin karar_teslimleri, ogrenci_durum_surumleri ve kurulumlar satırlarını (defter cascade ile) siler.`,
  `D06 esitlemeKimlikDinleyicisi'ni dışa verir; bileşim kökleri onu D01.kimlikDinleyicileriniKur'a esitleme abonesi olarak verir (contracts.json ortak kural 'Kimlik olayları'); hesap_silindi olayında dinleyici olayı doğuran işlemin içinde kişinin karar_teslimleri, ogrenci_durum_surumleri ve kurulumlar satırlarını (defter cascade ile) siler, öbür olayları yok sayar.`);
R(`öğeler dağıtıldıktan sonra kişinin D06 satırları aynı işlemin sonunda yeniden silinir. D12'ye saklama işleyicisi kaydedilmez.",`,
  `öğeler dağıtıldıktan sonra kişinin D06 satırları aynı işlemin sonunda yeniden silinir; silinmişlik gönderim işleminde D01.hesapSilindiMi ile, kurulum satırından önce okunur. Hesap silme saklama sınıfı değildir; karar teslimlerinin süre sonu silmesi D12 kataloğundaki esitleme.donem_verisi sınıfı için kaydedilen tek saklama işleyicisinindir.",`);
R(`"D12'nin saklama arayüzü kişi başına değil zaman sınırlı partilerle çalışır ve 'hesap_silme' sınıfı yoktur (hesap silme D01'e geçti, D12-B17);`,
  `"D12'nin saklama arayüzü kişi başına değil zaman sınırlı partilerle çalışır ve 'hesap_silme' sınıfı yoktur (hesap silme D01'e geçti, D12-B17; contracts.json ortak kural 'Saklama');`);

// B29: rate key, wait value
R(`D06'nın 503 ESITLEME_KURULUM_MESGUL cevabı Retry-After 5 taşır. Hız sınırı: gönderim D13'ün 'gonderim' sınıfıyla, kimlik kurulduktan sonraki kancada, doğrulanmış cihaz (öğrenci) ya da oturum (personel) başına dakikada 30;`,
  `D06'nın 503 ESITLEME_KURULUM_MESGUL cevabı bekleme { sabit: 5 } ile Retry-After 5 taşır; D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI dahil) bekleme { aralik: [15, 45] } ile. Hız sınırı: gönderim D13'ün 'gonderim' sınıfıyla, kimlik kurulduktan sonraki kancada, anahtar doğrulanmış cihaz, cihaz yoksa giriş oturumu (X-Kurulum-Kimligi değil), dakikada 30;`);

// B30: kalanSureMs, VERITABANI_ZAMAN_ASIMI
R(`"Gönderim işlemi D12.islem({ zamanAsimiMs: 5000 }) ile açılır, ilk adımda SET LOCAL lock_timeout '2s' ve transaction_timeout '20s' (PostgreSQL 18, teknik.html#veritabani) yazılır; kurulum satırı kilidi beklenemezse 503 ESITLEME_KURULUM_MESGUL. İşleme bütçesi 8 saniyedir:`,
  `"Gönderim işlemi D12.islem({ zamanAsimiMs: 5000 }) ile açılır, ilk adımda SET LOCAL lock_timeout '2s' ve transaction_timeout = D13.kalanSureMs(istek) (D13'ün 20 saniyelik işleyici bütçesinden kalan; PostgreSQL 18, teknik.html#veritabani) yazılır; kurulum satırı kilidi beklenemezse 503 ESITLEME_KURULUM_MESGUL. İşleme bütçesi min(8000, kalanSureMs - 5000) milisaniyedir (sabit 25 saniye yoktur):`);
R(`transaction_timeout işlemi keserse (SQLSTATE 25P04) hiçbir şey yazılmamıştır ve cevap 503 API_SORGU_ZAMAN_ASIMI'dır.`,
  `transaction_timeout işlemi keserse (SQLSTATE 25P04; deyim süresi 57014 de aynı) hiçbir şey yazılmamıştır; D12.islem bunu VERITABANI_ZAMAN_ASIMI'na (503, bekleme { aralik: [15, 45] }) çevirir.`);
R(`"Bütçe yalnız parça sonunda ve statement_timeout yalnız tek deyimde denetlenseydi kilit beklemeli bir parça 25 saniyeyi aşar,`,
  `"Bütçe yalnız parça sonunda ve statement_timeout yalnız tek deyimde denetlenseydi kilit beklemeli bir parça işleyici bütçesini aşar,`);
if (process.exitCode) console.log('FAILED, nothing written'); else { fs.writeFileSync(f, s); console.log('ok'); }

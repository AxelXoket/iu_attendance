// One-off exact-replacement edits for veri-1.js (D06 align round). Each pattern must match exactly once.
const fs = require('fs'); const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
const R = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) { console.error('MATCH ' + n + ': ' + a.slice(0, 90)); process.exitCode = 1; return; } s = s.replace(a, () => b); };
R(`"İndirme (GET /v1/esitleme/degisiklikler) tek sayaç satırından alınan sürümle artımlıdır;`,
  `"İndirme (GET /v1/esitleme/degisiklikler) tek sayaç satırından işlemin son adımında bir kez alınan sürümle (sürüm damgası) artımlıdır;`);
R(`Satırlar hesap silinince (D01'in hesap_silindi olayı) ve 400 gün temassız kalınca silinir.`,
  `Satırlar hesap silinince (D01'in hesap_silindi olayında esitlemeKimlikDinleyicisi) ve 400 gün temassız kalınca (sira_boslugu_raporu) silinir.`);
R(`"kurulumlar_kisi_id_idx: (kisi_id); kurulumSonTemasi, kişi başına`, `"kurulumlar_kisi_id_idx: (kisi_id); kurulumSonTemasi ve kurulumSonTemaslari (kisi_id = ANY), kişi başına`);
R(`"Telefona inen bütün tabloların değişiklik sürümünü veren tek satırlık sayaç. surumAl satırı işlem sonuna kadar kilitler;`,
  `"Telefona inen bütün tabloların değişiklik sürümünü veren tek satırlık sayaç. Sürüm işlemin son adımında bir kez alınır ve işlemin bekleyen damgalarına yazılır (contracts.json ortak kural 'Sürüm damgası'); surumAl satırı işlem sonuna kadar kilitler;`);
R(`note: "Son verilen değişiklik sürümü; surumAl satırı açar ya da kilitleyip bir artırır." }`,
  `note: "Son verilen değişiklik sürümü; surumAl işlemde bir kez kilitleyip bir artırır." }`);
R(`"Göç satır yazmaz (D12-B34): satırı ilk surumAl INSERT ... ON CONFLICT ile açar; okuyucu satır yoksa surum ve en_eski_gecerli_surum'u 0 sayar. Test sıfırlamasındaki TRUNCATE dışında satır silinmez."`,
  `"Göç satır yazmaz (D12-B34): satırı ilk kullanım (surumAl ya da enEskiGecerliSurumuYukselt; UPDATE satır bulamazsa) INSERT INTO degisiklik_sayaci (id, surum, en_eski_gecerli_surum) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING ile açar, ardından UPDATE yinelenir; okuyucu satır yoksa surum ve en_eski_gecerli_surum'u 0 sayar. Test sıfırlamasındaki TRUNCATE dışında satır silinmez."`);
R(`Satırları hesap silinince hemen, son sunumdan 400 gün sonra sira_boslugu_raporu siler.",`,
  `Satırları hesap silinince hemen (esitlemeKimlikDinleyicisi), süresi dolunca D12 kataloğundaki esitleme.donem_verisi sınıfının saklama işleyicisi siler (son sunumu sınır anından eski satırlar; katalogda yoklama.donem_verisi'nden önce).",`);
R(`"karar_teslimleri_son_sunulma_ani_idx: (son_sunulma_ani); 400 günlük temizlik"`, `"karar_teslimleri_son_sunulma_ani_idx: (son_sunulma_ani); saklama işleyicisinin partileri (esitleme.donem_verisi)"`);
// POST auth
R(`"Rota tablosunda kimlik ['cihazImzasi', 'oturum'], roller ['ogrenci', 'personel'] (D13-B06). D13'ün kök oturum kancası Bearer'ı doğrular; geçersiz Bearer isteği düşürmez, istek.oturumHatasi'na yazılır. D06'nın kimlik kancası (kimlik-cozumu.ts, RotaUygulamasi.oncekiKancalar) D13'ün beyan denetiminden önce çalışır: oturumu istek.kimlik'ten okur (oturumDogrula'yı yeniden çağırmaz); ikinciCapa 'a' ya da 's' ise imzayı kayıtlı cihaz anahtarıyla doğrular (anahtar etkin, yenilenmiş, cihazı kapanmış ya da hesabı silinmiş olabilir) ve oturum yoksa istek.kimlik = { tur: 'cihaz', kisiId, roller: ['ogrenci'], cihazId } yazar.`,
  `"Rota tablosunda kimlik ['cihazImzasi', 'oturum'], roller ['ogrenci', 'personel'] (D13-B06). D13'ün kök oturum kancası Bearer'ı doğrular; geçersiz Bearer ve değişim bekleyen kısıtlı oturum (oturumHatasi KIMLIK_KAPSAM_SINIRLI) isteği düşürmez, istek.oturumHatasi'na yazılır ve istek oturumsuz sayılır. D06'nın kimlik kancası (kimlik-cozumu.ts, RotaUygulamasi.oncekiKancalar) D13'ün beyan denetiminden önce çalışır: oturumu istek.kimlik'ten okur (oturumDogrula'yı yeniden çağırmaz); ikinciCapa 'a' ya da 's' ise imzayı kayıtlı cihaz anahtarıyla doğrular (anahtar etkin, yenilenmiş, cihazı kapanmış ya da hesabı silinmiş olabilir) ve oturum yoksa istek.kimlik = { tur: 'cihaz', kaynak: 'imza', kisiId, cihazId } yazar (D13 Kimlik tipinin öbür alanları boş).`);
R(`ikinciCapa: "null ya da { metin: base64url (en çok 32768), imzaTuru: 'a' | 's' | 'o', imza: base64url (en çok 200) ya da null, anahtarId: UUID ya da null }. 'a' ve 's'de imza ve anahtarId zorunlu, 'o'da ikisi de null.",`,
  `ikinciCapa: "null ya da D13'ün imzaliMetinSemasi ile kurulan nesne (imzaliTurler ['a', 's'], imzasizTurler ['o'], ek { anahtarId }): { metin: base64url (en çok 32768), imzaTuru: 'a' | 's' | 'o', imza: base64url (en çok 200) ya da null, anahtarId: UUID ya da null }. 'a' ve 's'de imza ve anahtarId zorunlu, 'o'da ikisi de null.",`);
R(`ikinciCapaYokNedeni: "null ya da 'esitleme_bozuk' | 'imzalanamadi'; yalnız ikinciCapa null iken anlamlı.",`,
  `ikinciCapaYokNedeni: "null ya da 'ESITLEME_BOZUK' (D04 sabiti) | 'IMZALANAMADI' (telefon imzalayamadı, bağlamda PAKET_IMZASIZ olur); yalnız ikinciCapa null iken anlamlı.",`);
R(`"503 API_SUNUCU_YOGUN ya da API_SORGU_ZAMAN_ASIMI (D13), Retry-After ile",
        "503 ESITLEME_KURULUM_MESGUL, Retry-After 5",`,
  `"503 API_SUNUCU_YOGUN (D13) ya da D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI: 57014 ve 25P04, VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ; bekleme { aralik: [15, 45] }), Retry-After ile",
        "503 ESITLEME_KURULUM_MESGUL, bekleme { sabit: 5 } (Retry-After 5)",`);
R(`"D13 hız sınıfı 'gonderim', kimlik kurulduktan sonraki kancada: doğrulanmış cihaz (öğrenci; oturumdan ya da imzadan) ya da oturum (personel) başına dakikada 30 (D13-B09);`,
  `"D13 hız sınıfı 'gonderim', kimlik kurulduktan sonraki kancada: anahtar doğrulanmış cihazdır (öğrencide oturumun ya da paket imzasının cihazı), cihaz yoksa giriş oturumudur (personel); dakikada 30 (D13-B09);`);
// GET
R(`"Rota tablosunda kimlik ['oturum'], roller ['ogrenci', 'personel']: geçerli oturum (Bearer), D13'ün kök oturum kancası (D01).`,
  `"Rota tablosunda kimlik ['oturum'], kimlikKaynaklari ['bearer'], roller ['ogrenci', 'personel'], defterYazar: true (GET olduğu hâlde D06'nın kendi izini yazar): geçerli oturum (Bearer), D13'ün kök oturum kancası (D01); çerezle gelen istek 403 API_ROL_YETKISIZ, değişim bekleyen kısıtlı oturum 403 KIMLIK_KAPSAM_SINIRLI (D13 beyan denetimi).`);
R(`"401 D01 oturum kodları ya da API_KIMLIK_GEREKLI (kök kanca)",`, `"401 D01 oturum kodları ya da API_KIMLIK_GEREKLI (kök kanca)",
        "403 API_ROL_YETKISIZ (D13): kimlik kaynağı bearer değil",
        "403 KIMLIK_KAPSAM_SINIRLI (D13 beyan denetimi): değişim bekleyen kısıtlı oturum",`);
R(`"503 API_SUNUCU_YOGUN ya da API_SORGU_ZAMAN_ASIMI (D13), Retry-After ile",
        "500 API_SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Güvenli: iş verisini değiştirmez (D13-B08 GET kuralı). Yalnız D06'nın kendi izini yazar`,
  `"503 API_SUNUCU_YOGUN (D13) ya da D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI, VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ, VERITABANI_NESIL_BELIRSIZ; bekleme { aralik: [15, 45] }), Retry-After ile",
        "500 API_SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Güvenli: iş verisini değiştirmez (D13-B08 GET kuralı); rota defterYazar: true beyan eder, çünkü yalnız D06'nın kendi izini yazar`);
// job
R(`"D14.isTanimla: kuyruk SIRA_BOSLUGU_RAPORU (KuyrukTanimi, politika exclusive, veri şeması boş nesne), sureAsimiSaniye 600, zamanlama { cron: '10 5 * * *' } (Europe/Istanbul; D14 çizelgesindeki yer, 03:30 gecelik pg_dump ve 05:00 saklama işinden sonra). Kaçırılan çalıştırma D14'ün günlük iş kuralıyla bir kez (D14-B04).",`,
  `"jobs/esitleme/index.ts'teki export const isler dizisinde D14.isTanimla ile: kuyruk SIRA_BOSLUGU_RAPORU (KuyrukTanimi modules/esitleme/kuyruklar.ts'te; politika exclusive, veri şeması boş nesne), sureAsimiSaniye 600, zamanlama { cron: '10 5 * * *' } (Europe/Istanbul; D14 çizelgesindeki yer: 02:15 gecelik pg_dump ve 05:00 saklama işinden sonra, 03:00 ile 05:00 arasındaki günlük iş yasağının dışında, komşu işlerden en az 5 dakika uzakta). Kaçırılan çalıştırma D14'ün günlük iş kuralıyla bir kez (D14-B04).",`);
R(`exclusive politika aynı anda ikinci çalışmayı engeller. Sonuç defterin o anki halinden hesaplanır; aynı gün iki kez çalışınca aynı boşluk durumu yazılır.",`,
  `exclusive politika aynı anda ikinci çalışmayı engeller. Sonuç defterin o anki halinden hesaplanır; aynı gün iki kez çalışınca aynı boşluk durumu yazılır (senaryosu D14'ün 'aynı veriyle iki kez çalışırsa' adımıyla).",`);
R(`kesintisiz son sıranın altında kalan ve son görülmesi 400 günden eski defter satırlarını, son sunumu 400 günden eski karar_teslimleri satırlarını, 400 gündür temassız ve boşluksuz kurulum satırlarını 5000'lik işlemlerle siler.`,
  `kesintisiz son sıranın altında kalan ve son görülmesi 400 günden eski defter satırlarını ve 400 gündür temassız ve boşluksuz kurulum satırlarını 5000'lik işlemlerle siler (karar_teslimleri bu işte değil, esitleme.donem_verisi saklama işleyicisinde silinir).`);
if (process.exitCode) console.log('FAILED, nothing written'); else { fs.writeFileSync(f, s); console.log('ok'); }

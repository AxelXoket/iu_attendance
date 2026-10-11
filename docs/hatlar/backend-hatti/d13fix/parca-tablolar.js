const hatalarTablosu = [
  ["API_ISTEK_GECERSIZ", "400", "bol", "Zod istek doğrulaması ya da Fastify'ın öteki 400'leri; toplu istekte 200'ü aşan öğe de buradadır; alanlar dolu.", "İstekteki bazı alanlar geçersiz."],
  ["API_JSON_BOZUK", "400", "bol", "Gövde JSON olarak ayrışmadı ya da boş; __proto__ ve constructor anahtarları da buraya düşer.", "İstek okunamadı."],
  ["API_KIMLIK_GEREKLI", "401", "dur", "Rota oturum, cihaz imzası ya da projeksiyon kimliği istiyor, istekte yok.", "Bu işlem için giriş gerekiyor."],
  ["API_ROL_YETKISIZ", "403", "dur", "Kimlik var ama rol, kimlik türü ya da kimlik kaynağı (ör. yalnız Bearer kabul eden rotada çerez) rotanın beyanına uymuyor.", "Bu işlem için yetkiniz yok."],
  ["API_KOKEN_GECERSIZ", "403", "dur", "Yazma isteğinde Origin panel adresi değil.", "İstek bu panelden gelmedi; sayfayı yenileyip yeniden deneyin."],
  ["API_UC_BULUNAMADI", "404", "bol", "Yol ya da yöntem rota tablosunda yok (HEAD dahil).", "İstenen adres bulunamadı; sayfayı yenileyin."],
  ["API_GOVDE_COK_BUYUK", "413", "bol", "Gövde rotanın beyan ettiği sınırı aşıyor.", "Gönderilen veri çok büyük."],
  ["API_ICERIK_TURU", "415", "bol", "Gövde application/json değil ya da Content-Encoding taşıyor.", "İstek biçimi desteklenmiyor."],
  ["API_SONUC_COK_BUYUK", "422", "bol", "tamListeSemasi'lı cevapta liste 2000 satır sınırını aşıyor.", "Sonuç çok büyük; aralığı daraltın."],
  ["API_HIZ_SINIRI", "429", "gecici", "Hız sınıfının sınırı aşıldı; bekleme 'cagiran': pencerenin kalanı Retry-After ve beklemeSaniye'de.", "Çok sık istek gönderildi; biraz sonra yeniden deneyin."],
  ["API_SUNUCU_HATASI", "500", "gecici", "Beklenmeyen hata, cevap şemaya uymadı, beyan dışı kod (test kipi) ya da http null işletim kodu.", "Beklenmeyen bir hata oldu."],
  ["API_SUNUCU_YOGUN", "503", "gecici", "Aşırı yük ya da D12 dışından kaçan geçici SQLSTATE; bekleme aralik [15, 45].", "Sunucu şu an yoğun; birazdan yeniden denenecek."],
  ["API_SORGU_ZAMAN_ASIMI", "503", "gecici", "İşleyici 20 saniyelik bütçeyi aştı ya da D12 dışından kaçan 57014; bekleme aralik [15, 45]; panel bu kodda kendiliğinden yeniden denemez.", "İşlem çok uzun sürdü; aralığı daraltıp yeniden deneyin."],
  ["API_SURUM_BILGISI_YOK", "503", "gecici", "Platform ve kanal için eşik kaydı yok (olağan dışı; açılış alımı bunu önler); bekleme sabit 60.", "Sürüm bilgisi şu an alınamıyor."],
];

const rotaAlanlari = [
  ["modul", "ModulAdi", "On beş modülden biri; yolun ikinci bölümü bununla aynı (dört kök istisna hariç). Kod öneki de buradan."],
  ["ad", "metin", "Modül içinde tekil, camelCase; OpenAPI operationId modul.ad."],
  ["yontem, yol", "GET | POST | PUT | PATCH | DELETE; /v1/dersler/{dersId}/...", "Yol OpenAPI biçiminde yazılır, rotalariKaydet Fastify biçimine çevirir; (yöntem, yol) tekil. HEAD rotası yoktur."],
  ["kimlik", "[girissiz] | [girissiz, oturum] | [oturum] | [cihazImzasi, oturum] | [projeksiyon]", "Zorunlu küme, listelenenlerden biri yeter; anlamı kimlik birleşimleri tablosunda, öteki birleşim açılışı durdurur."],
  ["roller", "ogrenci | personel | hoca | yonetici", "Oturum rotasında zorunlu; /yonetim/ yolunda yalnız yonetici."],
  ["degisimBekleyenKabul", "true ya da yok", "Kısıtlı (degisim_bekliyor) oturumu kabul eder; yalnız DEGISIM_BEKLEYEN_ROTALARI'ndaki dört D01 rotasında, başka rotada açılışı durdurur."],
  ["kimlikKaynaklari", "('bearer' | 'cerez')[], varsayılan ikisi", "Yalnız kimliğinde oturum olan rotada; listede olmayan kaynakla kurulan kimlik 403 API_ROL_YETKISIZ (ör. ['bearer']: GET /v1/esitleme/degisiklikler, POST /v1/saat/belge)."],
  ["kitle", "ogrenci | hoca, isteğe bağlı", "Yalnız kimliğinde girissiz olan rotada: kimliksiz istekte hata mesajının kitlesi (öğrencinin girişsiz uçları ogrenci)."],
  ["hiz", "HizSinifiAdi ya da { kimliksiz: 'girissiz', kimlikli: ad }", "Zorunlu; değer HIZ_SINIFLARI'nda; girissiz yalnız kimliğinde girissiz olan rotada; nesne biçimi yalnız [girissiz, oturum] rotada; /v1/raporlar/ altında agir."],
  ["govdeSiniri", "bayt", "Yoksa 65536; en çok 2097152."],
  ["istek", "{yol, sorgu, govde, baslik} Zod şemaları", "Strip nesneler, her metin ve dizide üst sınır; sorguda numara, kod, anahtar yok."],
  ["cevap", "{durumlar: (200 | 201 | 204)[], sema}", "Durumlar tekil; oluşturma deseninde [201, 200] (yeni kaynak 201, aynı kimlik ve içerik 200); 204 yalnız tek başına ve sema null iken. Her durum için serileştirici kurulur, işleyici yalnız beyanlı durumu döndürebilir. Cevap kökü nesne, isteğe bağlı alan yok, büyüyebilen değerler genisleyenEnum."],
  ["hatalar", "kod listesi", "Rotanın döndürebileceği modül kodları; http null kod yazılamaz; örtük kodlar (ortukKodlar) yazılmaz."],
  ["defterYazar", "true ya da yok", "Yalnız GET'te: GET yalnız sahibinin defter tablosuna yazar (GET /v1/esitleme/degisiklikler, GET /v1/surum); belgede x-defter-yazar."],
  ["saatBelgesi", "boolean, varsayılan true", "false ise cevaba X-Saat-Belgesi eklenmez ve fetch yardımcısı X-Saat-Istegi koymaz (D04'ün belge ucu)."],
  ["istemciCevapDenetimi", "boolean, varsayılan false", "true ise fetch yardımcısı cevabı çalışma anında şemayla denetler; yalnız gönderim ucu."],
  ["baskiDisi", "boolean, varsayılan false", "true ise aşırı yükte de cevap verir (rota düzeyi pressureHandler isteği geçirir); yalnız /health/live ve /v1/durum, başka rotada açılışı durdurur."],
  ["ozet", "metin", "Tek cümle Türkçe; OpenAPI summary."],
];

const basliklarTablosu = [
  ["Authorization: Bearer", "istek", "telefon", "Oturum anahtarı (D01 doğrular). Varsa çerez okunmaz."],
  ["X-Uygulama-Surumu", "istek", "telefon", "MAJOR.MINOR.PATCH; her istekte; bozuksa null sayılır, istek reddedilmez."],
  ["X-Guncelleme-Kimligi", "istek", "telefon", "expo-updates updateId (UUID); log ve izleme."],
  ["X-Platform, X-Kanal", "istek", "telefon", "android | ios; play | github | appstore | testflight."],
  ["X-Kurulum-Kimligi", "istek", "telefon", "Bir uygulama kopyasında bir hesabın kurulum kimliği, UUIDv7 (D06-B08); girişten önce gönderilmez. GitHub kovası ve Caddy yük dağıtımı (D15); hız anahtarı değildir."],
  ["X-Saat-Istegi", "istek", "telefon", "16 rastgele bayt, base64url, 22 karakter; cevaptaki belgeye yazılır."],
  ["X-Arka-Plan", "istek", "panel", "1: kendiliğinden yeniden çekme; son kullanımı uzatmaz (D01)."],
  ["X-Panel-Surumu", "istek", "panel", "Derleme özeti, en çok 40 karakter; yalnız log."],
  ["Origin", "istek", "tarayıcı", "Yazma isteğinde panel adresine birebir eşit olmalı; yoksa çerez okunmaz."],
  ["X-Istek-Kimligi", "cevap", "sunucu", "UUIDv4; her cevapta; hata zarfındaki istekKimligi ile aynı (fetch yardımcısı zarfı bununla tanır)."],
  ["X-Saat-Belgesi", "cevap", "sunucu", "D04'ün belgesi, base64url; koşullar tutarsa; öznesi saat belgesi öznesi tablosundan."],
  ["Retry-After", "cevap", "sunucu", "Saniye; her 429 ve 503'te, kodun bekleme kuralından (sabit, 15 ile 45 aralığı ya da fırlatanın verdiği); beklemeSaniye ile aynı."],
  ["Cache-Control: no-store", "cevap", "sunucu", "Her API cevabında (teknik.html#sunucu-guvenlik)."],
  ["__Host-yoklama-oturum", "çerez", "panel", "D01 kurar; HttpOnly, Secure, SameSite=Lax, Path=/, süresiz (tarayıcı oturumu)."],
  ["__Host-yoklama-projeksiyon", "çerez", "kürsü", "D11 kurar; Secure, HttpOnly, SameSite=Strict, Path=/, Max-Age yok; oturum çerezinden adla ayrılır."],
];

const hizTablosu = [
  ["girissiz", "IP (trustProxy'den)", "3000", "onRequest (yalnız girişsiz rota artırır; öteki rotalar artırmadan okur, kimliksiz 401 onResponse'ta artırır)", "50.000", "Bir dakikada istek yapan ayrı adres: kampüs NAT'ı ve operatör adresleri, yük testi tahmini 20.000'in altında", "Girişsiz uçlar ve kimliksiz biten istekler."],
  ["oturum", "giriş oturumu kimliği", "120", "preParsing", "200.000", "Etkin giriş oturumu: öğrenci telefonları ve personel oturumları, yaklaşık 120.000", "Girişli uçların varsayılanı."],
  ["agir", "giriş oturumu kimliği", "20", "preParsing", "50.000", "Etkin personel giriş oturumu, 10.000'in altında", "/v1/raporlar/ altındaki bütün rotalar ve öteki pahalı uçlar."],
  ["gonderim", "imza doğrulandıysa cihaz kimliği, doğrulanmadıysa giriş oturumu kimliği", "30", "preHandler (imza doğrulamasından sonra)", "200.000", "Etkin öğrenci cihazı ve personel giriş oturumu, yaklaşık 70.000", "Gönderim ucu; bölme dizisini (yaklaşık 16 istek) kaldırır."],
  ["saat", "öğrencide cihaz kimliği, personelde giriş oturumu kimliği", "30", "preParsing", "200.000", "Etkin öğrenci cihazı ve personel giriş oturumu, yaklaşık 70.000", "Saat belgesi ucu (D04)."],
  ["projeksiyon", "projeksiyon kimliği", "60", "preParsing (D11 kancasından sonra)", "10.000", "Kayıtlı kürsü tarayıcısı, derslik sayısı kadar, 3.000'in altında", "Kürsü kod yoklaması."],
];

const bicimTablosu = [
  ["An", "anSemasi", "2026-03-02T07:00:00.000Z", "UTC, milisaniyeli, Z ile."],
  ["Takvim günü", "gunSemasi", "2026-03-02", "İstanbul günü; rapor aralığı bu biçimde gider."],
  ["Ders saati", "dersSaatiSemasi", "09:00", "İstanbul yerel saati."],
  ["Süre", "sureMsSemasi", "gecenSureMs: 900000", "Tam sayı milisaniye; alan adı Ms ile biter."],
  ["Yüzde", "bindeSemasi", "devamBinde: 695", "Onda bir birimli tam sayı (yüzde 69,5); alan adı Binde ile biter."],
  ["Büyük sayı", "buyukSayiSemasi", "'7329918423710239847'", "2^53'ü aşabilen tam sayı ondalık metin."],
  ["Kimlik", "kimlikSemasi('Ders')", "UUID metni", "Markalı tip; ders, oturum, öğrenci kimlikleri karışmaz."],
  ["İstemci kimliği", "istemciKimligiSemasi", "UUIDv7 metni", "Oluşturan işlerde tekrar anahtarı."],
  ["Öğrenci numarası", "ogrenciNoSemasi", "'0123456789'", "9 ya da 10 rakamlı metin; yola ve sorguya girmez."],
  ["Beklenen sürüm", "beklenenSurumNoSemasi", "beklenenSurumNo: 1842", "D02 ile aynı ad ve tip: 0 ile 2147483647 arası tam sayı; çevrimiçi düzenlemede gövde alanı; uymazsa 409 <MODÜL>_SURUM_DEGISTI."],
  ["İmleç", "sayfaSorgusuSemasi", "imlec, adet", "Opak base64url, en çok 200 karakter; adet 1 ile 500, varsayılan 100."],
  ["Tam liste", "tamListeSemasi(oge)", "{ ogeler: [...] }", "Sınıf boyu liste, en çok 2000 satır; aşılırsa 422 API_SONUC_COK_BUYUK (rotalariKaydet uygular)."],
  ["İmzalı metin", "imzaliMetinSemasi", "{metin, imzaTuru, imza, ...ek}", "Telefonun ürettiği metin aynen; imza metnin baytları üzerinde; imzasız türde imza null (D06 ikinciCapa: 'o' türü, ek anahtarId)."],
  ["Sürüm", "surumSemasi", "'1.4.2'", "MAJOR.MINOR.PATCH, her bölüm en çok 4 rakam."],
];

// Ek tablolar: spec'te de ayrı anahtar olarak yazılır (uret.js).
const surecTablosu = [
  ["Fastify örneği (exposeHeadRoutes false, listen yok)", "var", "var", "var"],
  ["@fastify/under-pressure, hız tabloları (saatli depo)", "var", "yok", "yok"],
  ["Kök kancalar, oturum kancası, onSend ve onResponse kancaları, yakalayıcılar, rota bekçisi", "var", "yok", "var (belgedeki başlıklar ve örtük kodlar için; istek karşılanmaz)"],
  ["Modül eklentileri: dinleyici, kuyruk öğesi işleyicisi, saklama işleyicisi, iş tanımı kayıtları", "var", "var", "var"],
  ["rotalariKaydet", "rotaları kaydeder", "rota kaydetmez, tanımları not eder; tamlık denetimi yok", "rotaları kaydeder"],
  ["@fastify/swagger", "yok", "yok", "var"],
  ["yayinBilgisiYukle ve listelerin salt okuma tazelemesi", "var", "var", "yok (dosya okunmaz)"],
  ["Eşik alımı (istemci_surum_esikleri'ne yazma) ve esikDurumu değerlendirmesi", "var", "yok", "yok"],
  ["Modül zamanlayıcıları (D04 saat_esitleme_denetimi, D15 ölçü yazıcısı)", "var", "yok", "yok"],
  ["Altyapı (veritabanı, kuyruk, e-posta)", "gerçek", "gerçek", "sahte, her kullanımda fırlatır"],
];

const kimlikBirlesimleri = [
  ["[girissiz]", "Kimlik bilgisi okunmaz, oturum aranmaz; girissiz IP sayacı onRequest'te artar.", "Yok; istek her zaman kimliksiz işlenir.", "girissiz"],
  ["[girissiz, oturum]", "Kimlik bilgisi okunur; geçerliyse kimlik kurulur.", "Geçersiz anahtar isteği düşürmez: istek kimliksiz işlenir, istek.oturumHatasi dolar.", "{ kimliksiz: 'girissiz', kimlikli: 'oturum' } ya da tek sınıf; kimliksiz istek girissiz sayacına girer."],
  ["[oturum]", "Kimlik bilgisi yoksa gövde okunmadan 401 API_KIMLIK_GEREKLI.", "Geçersiz anahtar gövde okunmadan 401 (D01 kodu).", "Kimlikli sınıf (oturum, agir ya da saat)."],
  ["[cihazImzasi, oturum]", "Biri yeter. İmza gövdede olduğundan gövde önce okunur, D06'nın kimlikKancasi preHandler'da doğrular. İkisi de doğrulanırsa tur cihaz, kaynak imza, girisOturumuId korunur.", "Geçersiz anahtar istek.oturumHatasi'na yazılır; kısıtlı oturum kimliğe taşınmaz (KIMLIK_KAPSAM_SINIRLI); hiçbiri doğrulanmazsa 401 ve kimliksiz sayaç artar.", "gonderim (cihaz, yoksa giriş oturumu)."],
  ["[projeksiyon]", "D11'in kimlikKancasi preParsing'de __Host-yoklama-projeksiyon çerezini doğrular.", "Doğrulanmazsa 401 ve kimliksiz sayaç artar.", "projeksiyon"],
];

const saatOznesiTablosu = [
  ["tur ogrenci (öğrenci oturumu, Bearer)", "{ tur: 'ogrenci_cihazi', cihazId: Kimlik.cihazId }", "Öğrenci oturumu cihaza bağlıdır; cihazId yoksa belge yok."],
  ["tur cihaz (imza doğrulandı)", "{ tur: 'ogrenci_cihazi', cihazId: Kimlik.cihazId }", "Gönderim cevabı da belge taşır."],
  ["tur personel, kaynak bearer (hoca telefonu)", "{ tur: 'personel', kisiId: Kimlik.kisiId }", "Kişi kimliği; giriş oturumu kimliği hiçbir zaman özne olmaz (D04-B14)."],
  ["kaynak cerez (panel)", "yok", "Panel X-Saat-Istegi koymaz; D04 belge ucu çerez kabul etmez."],
  ["tur projeksiyon", "yok", "Kürsü belge kullanmaz."],
  ["kimlik yok (girişsiz)", "yok", "Belgeye yazılacak doğrulanmış özne yok."],
];

const veritabaniEslemesi = [
  ["40P01, 40001 (D12 bir kez yeniden denedikten sonra), 55P03", "kilitlenme", "VERITABANI_KILITLENME 503", "API_SUNUCU_YOGUN 503", "aralik [15, 45]"],
  ["53300, havuz bekleme aşımı (2 saniye)", "havuz", "VERITABANI_HAVUZ_DOLU 503", "API_SUNUCU_YOGUN 503", "aralik [15, 45]"],
  ["57P01, 57P02, 57P03, 25P03, 08 sınıfı", "erisilemez", "VERITABANI_ERISILEMEZ 503", "API_SUNUCU_YOGUN 503", "aralik [15, 45]"],
  ["57014", "zaman_asimi", "VERITABANI_ZAMAN_ASIMI 503", "API_SORGU_ZAMAN_ASIMI 503", "aralik [15, 45]; panel yeniden denemez"],
  ["Nesil iki kaynakta tutarsız", "yok (D12'nin kendi denetimi)", "VERITABANI_NESIL_BELIRSIZ 503", "yok", "aralik [15, 45]"],
  ["23 sınıfı ve öteki her SQLSTATE", "yok", "VeritabaniHatasi, http 500", "API_SUNUCU_HATASI 500", "yok; logda yalnız SQLSTATE, kısıt ve tablo"],
];

const ortukKodlarTablosu = [
  ["Her rota", "Bütün API_ kodları; VERITABANI_HAVUZ_DOLU, VERITABANI_KILITLENME, VERITABANI_ERISILEMEZ, VERITABANI_ZAMAN_ASIMI, VERITABANI_NESIL_BELIRSIZ"],
  ["Kimliğinde oturum olan rota", "Ayrıca KIMLIK_OTURUM_YOK, KIMLIK_OTURUM_BITTI, KIMLIK_KAPSAM_SINIRLI"],
  ["Hiçbir rota", "http null işletim kodları (D12, D14 IS_KUYRUGU_, D15 açılış kodları): istekte fırlatılırsa 500 API_SUNUCU_HATASI ve kod loglanır"],
];

const sureButcesi = [
  ["Telefon istemcisi", "30 s (saat belgesi isteğinde 10 s)", "Aşılınca gecici, telefon yeniden dener (D04, teknik.html#telefon-gonderme-protokolu)."],
  ["Caddy response_header_timeout", "25 s", "Aşılınca zarfsız 502 ya da 504; fetch yardımcısı gecici sayar (D15)."],
  ["Fastify requestTimeout", "20 s", "Yalnız isteğin alınması; aşılınca Node 408."],
  ["İşleyici bütçesi (kalanSureMs)", "20 s, istek gelişinden", "Aşan işleyici 503 API_SORGU_ZAMAN_ASIMI; gönderim kalan öğelere TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI döner."],
  ["agir rotada deyim", "en çok 15 s (min(15000, kalanSureMs))", "D12 islem zamanAsimiMs; aşım VERITABANI_ZAMAN_ASIMI 503."],
  ["Yazan işlemde deyim", "5 s (D12 rol süresi)", "Gönderim parçaları SAVEPOINT ile; aşım parça düzeyinde TEKRAR_DENE (D06)."],
  ["Havuz beklemesi", "2 s", "Aşım VERITABANI_HAVUZ_DOLU 503 (D12)."],
];

const ikiYonluCiftler = [
  ["D01 ile D02", "D02, D01'i içe aktarır (kisiGetir, personelRolleri, yetkiDenetle).", "D01'in D02'den istediği birimGetir, dersYetkisi ve kilitliBirimDonemleri app.ts'te D01 eklentisine seçenek olarak verilir."],
  ["D01 ile D07", "D07, D01'i içe aktarır (cihazGetir, cihazDogrulamaSonucunuYaz).", "D01'in D07'den istediği cihazKanitiniDogrula, dogrulamaDegeriniTuket ve yenidenDegerlendir app.ts'te D01 eklentisine seçenek olarak verilir."],
  ["D05 ile D07", "D07, D05'i içe aktarır (kararSutunlariniYaz).", "D05'in D07'den istediği kararHesapla ve appAttestSayaciniDenetle app.ts'te D05 eklentisine seçenek olarak verilir."],
  ["D08 ile D09", "D09, D08'i içe aktarır (sonucuDegistirebilirMi, ogrenciDevamDurumu, dersSonuclari; devamHesaplaIsiKoy yaprak).", "D08'in D09'dan istediği sonDurumOnceligi app.ts'te D08 eklentisine seçenek olarak verilir (denetimeYaz yaprak.ts'ten, döngü kurmaz). İşlev saf çıkarsa D09 onu yaprak.ts'e taşır ve seçenek kalkar."],
];

const paketDosyalari = [
  ["packages/contracts/package.json", "Çalışma alanı paketi; exports her giriş noktası için iki koşul verir: kaynak (./src/<ad>.ts; Metro unstable_conditionNames, Vite resolve.conditions, tsconfig customConditions ve geliştirme ile testte node --conditions=kaynak) ve default (./dist/<ad>.js ile ./dist/<ad>.d.ts; imajdaki sunucu). Giriş noktaları: ., ./ortak, ./istemci, ./rotalar, ./hatalar ve her modülün sözleşme dosyası (./*). Bağımlılık yalnız zod (sürüm D15'in pnpm kataloğundan); Node yerleşik modülü yok."],
  ["packages/contracts/tsconfig.json", "D15'in tsconfig.base.json'ını genişletir; types: [] (Node tipleri yok, node: içe aktarması derlemede hata), lib: ES2022 ve DOM (fetch, AbortController, URL tipleri; çalışma anında yalnız Hermes ve Chrome 109'da olanlar kullanılır, D13-B23), allowImportingTsExtensions, noEmit. Biome noNodejsModules bu pakette hata düzeyinde (D15'in Biome yapılandırması)."],
  ["packages/contracts/tsconfig.build.json", "tsconfig.json'ı genişletir; noEmit false, rewriteRelativeImportExtensions: true (göreli .ts içe aktarmaları .js'e çevrilir), declaration: true, rootDir src, outDir dist; src/**/testler/** ve *.test.ts hariç. D15'in imaj derlemesi bu dosyayla çalışır; imaj açılış denetimi derlenmiş paketi koşulsuz içe aktarır."],
];

module.exports = { summary, tables, endpoints, jobs, state_machines, invariants, exports_, files, tests, resolved_gaps, contradictions_resolved, open_points, hatalarTablosu, rotaAlanlari, basliklarTablosu, hizTablosu, bicimTablosu, surecTablosu, kimlikBirlesimleri, saatOznesiTablosu, veritabaniEslemesi, ortukKodlarTablosu, sureButcesi, ikiYonluCiftler, paketDosyalari };

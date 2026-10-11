// Builds the new packages/D15.json into this folder (D15.new.json). Read-only toward the shared tree.
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'D15.before.json'), 'utf8'));
const oldBy = Object.fromEntries(old.packages.map(p => [p.id, p]));
const IZ = 'apps/server/src/infra/izleme/', AY = 'apps/server/src/infra/ayarlar/', IS = 'apps/server/src/jobs/isletim/';
const FE = 'apps/server/test/features/isletim/', ST = 'apps/server/test/steps/isletim/', YK = 'apps/server/test/yuk/', DI = 'docker/isletim/';
const VIEW_MIG = 'apps/server/migrations/20261021090000_isletim_olcum_gorunumleri/';
const P = [];
const add = (key, o) => P.push({ key, tables: [], endpoints: [], jobs: [], exports: [], needs: [], ...o });

add('workspace', {
  title: 'Çalışma alanı iskeleti ve Node sürümü denetimi',
  files: oldBy['D15-P01'].files, tests: ['Node sürümü üç dosyada aynı'], dep: [], size: 'M',
  notes: oldBy['D15-P01'].notes,
});
add('kok', {
  title: 'Kök kaydedici ve GizliDeger',
  files: [IZ + 'index.ts', AY + 'gizli-deger.ts', AY + 'gizli-deger.test.ts'],
  exports: ['log', 'GizliDeger'], tests: ['GizliDeger hiçbir çıktıda görünmez'], dep: ['workspace'], size: 'S',
  notes: "izleme/index.ts yalnız süreçteki kök log nesnesini verir: logOlustur çağrılmadan stderr'e info düzeyinde yazan pino kaydedicisi ve logOlustur'un sonradan bağlanacağı yönlendirme; log.ts'i, ayarları ve sözleşmeyi içe aktarmaz, bu yüzden log'u bekleyen modüller (D01, D02, D04, D05, D07, D11, D13) ayar ve sözleşme zincirini beklemez. gizli-deger.ts GizliDeger sarmalayıcısını yazar, ayarlar ve kalp atışı buradan alır; gizli-deger.test.ts JSON, String, util.inspect ve pino satırında yalnız [gizli] yazıldığını, ac() değerinin ise döndüğünü denetler. Kök log'un logOlustur'a bağlanması log.test.ts'te sınanır.",
});
add('sozlesme', {
  title: 'İşletim sözleşmesi',
  files: ['packages/contracts/src/isletim.ts', IZ + 'isletim-sozlesmesi.test.ts'],
  exports: ['ISLETIM_ROTALARI', 'ISLETIM_HATALARI', 'ISLETIM_OGE_GEREKCELERI', 'ekranSureleriIstegi', 'ekranSureleriCevabi', 'telefonSayaciGovdesiSemasi', 'gunAtlanirMi', 'ekranTavaniAnahtari', 'chronyDurumuSemasi', 'makineDurumuSemasi', 'bakimDosyasiSemasi', 'apiOlcumDosyasiSemasi', 'gizliAnahtarDosyasiSemasi', 'kalpAtisiSirriSemasi', 'EKRAN_TURLERI', 'SAYAC_ADLARI', 'UYARI_TURLERI', 'ISLETIM_GIRDILERI', 'ISLETIM_ESIKLERI', 'YEDEK_ESIKLERI', 'EKRAN_SURESI_TAVANI', 'ISLETIM_GIZLI_ALANLAR', 'OLCULEN_LOG_OLAYLARI', 'SIR_MATRISI'],
  needs: ['D13.rotaTanimla', 'D13.RotaTanimi', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.anSemasi', 'D13.gunSemasi', 'D13.kimlikSemasi', 'D13.istemciKimligiSemasi', 'D13.ModulAdi'],
  tests: ['Sıfır gün kuralı tek işlevden gelir'], dep: ['workspace'], size: 'L',
  notes: "isletim.ts dört rota tanımını, ISLETIM_ hata kataloğunu, öğe gerekçelerini, ekran süresi ve sayaç gövdesi şemalarını, durum dosyası ve sır şemalarını, gunAtlanirMi ile ekranTavaniAnahtari saf işlevlerini, uyarı türü kataloğunu, eşikleri ve sır matrisini verir; yalnız D13'ün ortak sözleşmesine dayanır, D13-P05 rota ve hata birleştirmesi bunu bekler. Anahtar dosyası okuyucusu (gizli-dosyalar.ts) testi ayarlariYukle'yi çağırdığından ayar paketine taşındı. Spec dosya listesine eklenen isletim-sozlesmesi.test.ts gunAtlanirMi özellik testini taşır: fast-check ile 2.000 rastgele gövdede yalnız bütün sayaçlar 0 ve listeler boşken true, bildirimIzni sonucu değiştirmez, tek ekran süresi ya da ret false yapar (pozitif kontrol: sayaçları sıfır, ekran süresi dolu hoca günü).",
});
add('ayarlar', {
  title: 'Ayar şeması, anahtar dosyaları ve ayarlariYukle',
  files: [AY + 'index.ts', AY + 'sema.ts', AY + 'cgroup.ts', AY + 'gizli-dosyalar.ts', AY + 'sema.test.ts', AY + 'gizli-dosyalar.test.ts'],
  exports: ['ayarlariYukle', 'ayarlar', 'Ayarlar', 'gizliAnahtar', 'gizliAnahtarSeti'],
  needs: ['D11.projeksiyonAyarSemasi'],
  tests: ['Eksik zorunlu ayar süreci açmaz ve değer sızdırmaz', 'Gizli anahtar dosyası kuralları', 'Süreç türüne göre zorunlu sırlar', 'Saat dilimi UTC değilse süreç açılmaz', 'Bellek eşiği kap sınırının altında olmalı', 'Saat eşitleme kapanış eşiği aralığın üç katından küçük olamaz'],
  dep: ['workspace', 'sozlesme', 'kok'], size: 'L',
  notes: "Elli ortam ayarının Zod şeması, süreç türüne göre SIR_MATRISI'nden zorunlu sırlar, UTC saat dilimi ve cgroup bellek sınırı denetimi, dondurulmuş Ayarlar nesnesi, amaç başına anahtar kümesi dosyalarını gizliAnahtarDosyasiSemasi ile okuyan gizli-dosyalar.ts ve gizliAnahtar ile gizliAnahtarSeti okuyucuları yazılır; sırlar kök paketteki GizliDeger ile sarılır, anahtarlar_yuklendi satırı kök log ile yazılır. sema.test.ts eksik ve hatalı ayarda değer sızdırmayan ISLETIM_AYAR_GECERSIZ, çocuk süreçte saat dilimi ve bellek sınırını, gizli-dosyalar.test.ts fast-check ile 2.000 rastgele kümede ayarlariYukle'nin yalnız tek ETKIN, en çok bir HAZIR ve tekil kid kurallarına uyan kümeyi kabul ettiğini ve gizliAnahtar'ın HAZIR anahtarı hiç vermediğini denetler. logOlustur'u beklemez.",
});
add('logOlustur', {
  title: 'Gizleyen log biçimlendiricisi ve logOlustur',
  files: [IZ + 'log.ts', IZ + 'log.test.ts'],
  exports: ['logOlustur'], tests: ['Log gizleme her derinlikte çalışır'], dep: ['kok', 'sozlesme', 'ayarlar'], size: 'M',
  notes: "log.ts logOlustur ile pino kurulumunu (UTC zaman, düzey, surec ve kopya taban alanları), redact yollarını, her derinlikte ISLETIM_GIZLI_ALANLAR ve ekGizliAdlar biçimlendiricisini, değersiz hata ve yığın yazımını ve OLCULEN_LOG_OLAYLARI sayacını verir, kök log'u kurduğu kaydediciye bağlar; Ayarlar tipini ayar paketinden alır. log.test.ts fast-check ile 1.000 iç içe nesnede gizli adların [gizli], öbür anahtarların aynen yazıldığını, sayılan satırın sayaçsız yazılanla aynı baytta kaldığını ve logOlustur'dan sonra kök log'un yeni hedefe yazdığını denetler.",
});
add('uyari', {
  title: 'İşletim tabloları, uyarı defteri ve kuralları',
  files: [IZ + 'tablolar.ts', 'apps/server/migrations/20261012090000_isletim_tablolar/migration.sql', 'apps/server/migrations/20261012090000_isletim_tablolar/snapshot.json', IZ + 'uyarilar.ts', IZ + 'kurallar.ts', IZ + 'kurallar.test.ts'],
  tables: ['telefon_sayaclari', 'hoca_ekran_sureleri', 'isletim_uyarilari'],
  exports: ['uyariAc'], needs: ['D12.Islem', 'D12.tabloYardimcilari', 'D12.kisitAdi', 'D14.IsSagligi'],
  tests: ['Uyarı kuralları sınırlarda doğru karar verir'], dep: ['sozlesme'], size: 'L',
  notes: "Üç tablo tabloYardimcilari ile tanımlanıp _isletim_ göçüyle açılır (komşu tabloya yabancı anahtar yok), uyariAc çağıranın işleminde (tur, anahtar) başına tek açık satırı numara maskesi ve uzunluk kesmesiyle yazar, kurallar.ts saf uyarı kararlarını ISLETIM_ESIKLERI, YEDEK_ESIKLERI ve D14 IsSagligi tipiyle üretir. Kaydedici ve ayar beklemez: uyariAc log yazmaz, kurallar saftır; bu yüzden uyariAc'ı bekleyen D01, D04, D07 ve D11 paketleri yalnız sözleşmeyi bekler. kurallar.test.ts her eşiği bir altı, eşiti ve bir üstüyle tablo testinde sınar; uyariAc'ın birikme ve maskeleme davranışı uyarı senaryolarında koşar.",
});
add('durum', {
  title: 'Saat ve makine betikleri, durum dosyası okuyucusu',
  files: oldBy['D15-P06'].files, jobs: ['saat_esitleme_izleme', 'makine_denetimi'], exports: ['saatEsitlemeDurumu'],
  tests: oldBy['D15-P06'].tests, dep: ['sozlesme', 'ayarlar'], size: 'L',
  notes: "Ana makinede chronyc çıktısından chrony.json, docker sayaçlarından makine.json yazan betikler ortak.sh, zamanlayıcı birimleri ve chrony.conf ile kurulur, durum-dosyalari.ts saatEsitlemeDurumu ile makine, bakım ve yedek dosyalarını sözleşme şemalarıyla okur, dizini ayarlar().genel.durumDizini'nden alır. durum-dosyalari.test.ts PATH'e konan sahte chronyc ve docker ile senkron, sapma, yeniden başlama ve bellek taşması sayımını ve 1.000 eşzamanlı okumada yarım dosya görülmediğini denetler. Kaydediciyi beklemez.",
});
add('betikler', {
  title: 'Yayın, log arşivi ve anahtar döndürme betikleri',
  files: [...oldBy['D15-P12'].files.filter(f => !f.endsWith('.test.ts')), DI + 'anahtar.sh', IZ + 'makine-betikleri.test.ts'],
  jobs: ['gunluk_log_arsivi'], tests: oldBy['D15-P12'].tests, dep: ['durum'], size: 'L',
  notes: "yayinla.sh imza, sürüm etiketi, İstanbul saati penceresi, yedek, göç ve servis sırasıyla geri dönüşlü yayını, log-arsivi.sh İstanbul gününe göre günlük arşivi, log-bul.sh arşiv aramasını, anahtar.sh iki adımlı döndürmeyi (süreçleri sırayla yeniden başlatıp kumeOzeti karşılaştırarak) ortak.sh üstünden yapar. makine-betikleri.test.ts sahte docker ve cosign ile imza tutmazsa hiçbir şeyin değişmediğini, her adım bozulunca geri dönüşü, bakim.json silinmesini, systemd-analyze ile zamanlayıcıların İstanbul saatini ve 'Anahtar döndürme iki adımda' testinin anahtar.sh çağrı sırası yarısını (hazirla, yeniden başlatma, özet denetimi, etkinleştir; özet tutmazsa yeni kid silinir) denetler. anahtar.sh bu test dosyasında sınandığından anahtar senaryolarından buraya alındı; Compose dosyasını beklemez, docker sahtedir.",
});
add('dunya', {
  title: 'Test dünyası sınıfı ve kurucu kaydı',
  files: oldBy['D15-P09'].files, exports: ['TestDunyasi', 'KurucuHaritasi', 'kurucuTanimla'],
  needs: ['D13.RotaTanimi', 'D13.RotaGirdisi', 'D13.hataZarfiSemasi', 'D13.API_HATALARI', 'D14.sahtePostaKutusu', 'D04.simdi'],
  tests: oldBy['D15-P09'].tests, dep: ['workspace'], size: 'M',
  notes: "TestDunyasi sınıfı istekGonder şema ve hata zarfı denetimi, kimlik başlıkları, kurucu haritası, gizliDegerKaydet ve logSatirlari ile, kurucuTanimla aynı adı iki kez reddeden kayıtla yazılır; uygulamaKur'u, ayarları ve D15'in başka kodunu içe aktarmaz, uygulamayı ve sahte posta kutusunu kancalar verir, bu yüzden modüllerin kurucu dosyaları ve modül testleri yalnız D13 sözleşmesini, D04 sahte saatini ve D14 sahte posta kutusu tipini bekler. dunya.test.ts çıplak Fastify örneğindeki deneme rotasıyla beyan dışı alanın, beyan dışı 409'un ve zarfa uymayan 4xx gövdesinin reddedildiğini, beyanlı 200 ve 400'ün geçtiğini denetler.",
});
add('compose', {
  title: 'Compose, Caddy ve xprem yapılandırması',
  files: oldBy['D15-P10'].files, tests: oldBy['D15-P10'].tests, dep: ['workspace', 'sozlesme'], size: 'L',
  notes: oldBy['D15-P10'].notes,
});
add('ci', {
  title: 'Kalite ve güvenlik iş akışları, OTA denetimi',
  files: oldBy['D15-P11'].files, jobs: oldBy['D15-P11'].jobs, tests: oldBy['D15-P11'].tests, dep: ['workspace'], size: 'L',
  notes: oldBy['D15-P11'].notes + " İş akışı dosyaları Compose testini adıyla çağırır, Compose dosyasını içe aktarmaz; OTA denetimi yalnız sahte xprem'le koşar, bu yüzden yalnız iskeleti bekler.",
});
add('yayinBilgisi', {
  title: 'Yayın bilgisi üretimi',
  files: [AY + 'yayin-bilgisi.kaynak.json', AY + 'yayin-bilgisi-uret.ts', AY + 'yayin-bilgisi-uret.test.ts'],
  needs: ['D13.yayinBilgisiSemasi'], tests: ['Yayın bilgisi üretimi'], dep: ['workspace'], size: 'M',
  notes: "yayin-bilgisi-uret kaynağa bicim 1, kaynağa dokunan commit sayısından sira ve son commit anından olusturmaAni ekler, en düşük ve en son sürüm sırasını ve önceki sunucu/v* etiketine göre hatalı sürüm başlangıcını denetler; yalnız D13 yayinBilgisiSemasi'na dayandığından sunucu imajından ayrıldı ve uygulamaKur'u beklemez. yayin-bilgisi-uret.test.ts çıktının yayinBilgisiSemasi'na uyduğunu, aynı commit'te aynı baytları verdiğini ve kırmızı ile yeşil sınırlarını denetler.",
});
add('haftalikIs', {
  title: 'Haftalık iş, yayın akışları ve mutasyon eşikleri',
  files: oldBy['D15-P18'].files, jobs: ['ci_haftalik_is'], tests: oldBy['D15-P18'].tests, dep: ['workspace'], size: 'L',
  notes: "Haftalık iş Stryker mutasyonu ve imaj derlemesiyle, sunucu, OTA ve telefon yayın iş akışları imza ve onay adımlarıyla, kur.sh ana makine kurulumuyla yazılır; yayin-telefon.yml ayrıştırılıp derleme işinin sözleşme kapısına bağlı olduğu ve kapının sahte GitHub API cevabında failure için 1, success için 0 verdiği, eşik betiğinin sahte düşük raporda kırmızı, yüksekte yeşil bittiği denetlenir. Testler yalnız kendi dosyalarını ve sahte raporları okur; imajın derlenmesini sunucu imajı paketi sınar, bu yüzden server.ts, betikler ve öbür iş akışları beklenmez.",
});
add('sayac', {
  title: 'Telefon sayacı öğesi ve kimlik olayı abonesi',
  files: oldBy['D15-P07'].files,
  exports: ['telefonSayaciOgesi', 'kimlikOlayiDinleyicisi'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D01.KimlikDinleyicisi', 'D01.KimlikOlayi', 'D13.KisiId', 'D04.simdi'],
  tests: ['Aynı gün için büyük sıra kazanır, varış sırası sonucu değiştirmez', 'Sayaç sıra kuralının mutasyonu'],
  dep: ['sozlesme', 'kok', 'uyari'], size: 'L',
  notes: "telefon_sayaci işleyicisi silinmiş hesap denetimi, gövde doğrulaması, büyük sıra kazanır kuralıyla tek INSERT ON CONFLICT, ekran süresi tavanı ve kilitAnahtarlari kancasıyla, kimlik abonesi hesap_silindi olayında kişinin satırlarını silerek, İstanbul günü yardımcısıyla yazılır; OgeIsleyici tipleri D06'nın sözleşme dosyasından gelir. telefon-sayaci.test.ts D12 test veritabanında 500 rastgele varış sırasında en büyük sıranın kazandığını denetler, sıra koşulu bilerek kaldırılınca kırmızıya döner (md5 ile geri yazılır). gunAtlanirMi testi sözleşme paketine geçti.",
});
add('kalp', {
  title: 'Kalp atışı ve dış erişim denetimi',
  files: [IZ + 'kalp-atisi.ts', IS + 'isletim-kalp-atisi.ts', IZ + 'kalp-atisi.test.ts'],
  jobs: ['isletim_kalp_atisi', 'dis_erisim_denetimi'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D14.IsSagligi', 'D04.simdi'],
  tests: ['Kalp atışı adres seçimi'], dep: ['sozlesme', 'ayarlar', 'uyari'], size: 'M',
  notes: "kalp-atisi.ts açık KRITIK uyarıya ve isSagligi'ndaki son başarılı isletim_denetimi anına göre normal ya da sorun adresine tek gövdesiz GET atar, isletim_uyarilari okunamazsa sorun adresini seçer; iş dosyası bag'den isSagligi, saat ve ayarları alır. Dış erişim denetiminin hizmet ayarı burada belgelenir. Spec dosya listesine eklenen kalp-atisi.test.ts D12 test veritabanı, sahte HTTP sunucusu ve sahte isSagligi ile adres seçiminin bütün yollarını ve uretim ortamında kalp_atisi sırrı yokken işçinin ayarlariYukle'sinin ISLETIM_AYAR_GECERSIZ verdiğini denetler; uygulamayı beklemez.",
});
add('sertifika', {
  title: 'Sertifika bitiş denetimi',
  files: [IZ + 'sertifika.ts', IZ + 'le-deneme-kokleri.pem', IS + 'sertifika-bitis-denetimi.ts', IZ + 'sertifika.test.ts'],
  jobs: ['sertifika_bitis_denetimi'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D04.simdi'],
  tests: ['Sertifika bitiş eşikleri'], dep: ['sozlesme', 'ayarlar', 'uyari'], size: 'M',
  notes: "sertifika.ts Caddy'nin sunduğu TLS zincirini acme ve elle türü eşikleriyle ve isteğe bağlı kök dosyasıyla sınar, iş uyariAc ile isletim.sertifika_bitiyor ya da sertifika_gecersiz açar ve yenilenmiş sertifikada kapatır, Caddy düşükken denetim girdisi uyarısı açar. Spec dosya listesine eklenen sertifika.test.ts testte üretilen kök ve sertifikalı yerel TLS sunucusuyla 15, 13, 6 ve 29 gün sınırlarını, adı tutmayan sertifikayı, kök dosyası verilmeyince sistem kökleriyle sonucu ve uretim ortamında ayarın reddini D12 test veritabanında denetler.",
});
add('eklenti', {
  title: 'İşletim eklentisi, uçlar, kapanış ve API ölçüsü',
  files: oldBy['D15-P08'].files, endpoints: oldBy['D15-P08'].endpoints,
  exports: ['isletimEklentisi', 'kapanisiBaslat', 'kapanisDurumu'],
  needs: ['D13.EklentiTemelSecenekleri', 'D13.UygulamaHatasi', 'D13.KisiId', 'D12.Islem'],
  tests: ['API ölçü dosyalarından uyarı'], dep: ['sozlesme', 'kok', 'ayarlar', 'logOlustur', 'uyari', 'sayac'], size: 'L',
  notes: "Eklenti rotalariKaydet, ogeTuruKaydet, danismaKilidi ve hesapSilindiMi seçenekleriyle dört ucu ve telefon_sayaci işleyicisini bağlar, sağlık uçları, kapanış durumu, birikmiş toplamlı ekran süresi yazımı ve dakikalık API ölçü dosyası yazıcısıyla okuyucusu gelir; ölçü dosyası logOlustur'un log olayı sayaçlarını ve ayarlardaki durum dizinini kullanır. api-olcum.test.ts iki kopyanın sahte ölçü dosyalarından 5xx, 503 oranı ve gönderim p95 uyarı kararlarını kurallar.ts ile sınırlarında denetler.",
});
add('olcum', {
  title: 'Ölçüm görünümleri, özet sorguları ve haftalık özet işi',
  files: [VIEW_MIG + 'migration.sql', VIEW_MIG + 'snapshot.json', IZ + 'olcumler.ts', IZ + 'olcum-ozeti.ts', IZ + 'olcum-ozeti.test.ts', IS + 'haftalik-olcum-ozeti.ts'],
  jobs: ['haftalik_olcum_ozeti'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D14.epostaGonder', 'D01.cihazGetir', 'D02.oturumGetir', 'D03.listeSatirlari', 'D05.kayitGetir', 'D06.kurulumSonTemasi', 'D07.oturumIsaretleri', 'D09.duzeltmeleriGetir'],
  tests: ['Ölçüm görünümleri kişisel veri çıkarmaz'], dep: ['sozlesme', 'uyari'], size: 'L',
  notes: "On bir olcum_ görünümü security_invoker ile _isletim_ göçünde açılır, olcumler.ts görünümleri bildirir, olcum-ozeti.ts hedef satırlarını kohort aralığıyla tek sorgudan üretir, haftalık iş her alıcıya tek e-posta yollar ve 13 aydan eski sayaç, ekran süresi ve kapanmış uyarı satırlarını siler. Görünümler D01, D02, D03, D05, D06, D07 ve D09 tablolarını okuduğundan göç bu tabloların göçlerinden sonra koşmalı: klasör 20261021090000 olarak bütün komşu göçlerin (en geç 20261020100000) arkasına alındı, needs içindeki yedi komşu okuyucu kodda çağrılmaz, yalnız o tabloların göçünü taşıyan ya da onlardan sonra gelen paketi işaret eder (tablo göçlerinin dış yüz adı yok); uygulamaKur ve kancalar beklenmez. olcum-ozeti.test.ts D12 test veritabanında katalogdan her görünümde kişisel sütun olmadığını ve security_invoker değerini denetler.",
});
add('denetim', {
  title: 'İşletim denetimi işi, girdileri ve iş listesi',
  files: [IZ + 'girdiler.ts', IS + 'isletim-denetimi.ts', IS + 'index.ts', IS + 'isletim-denetimi.test.ts'],
  jobs: ['isletim_denetimi'], exports: ['isletimIsleri'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D14.IsSagligi', 'D14.epostaGonder', 'D04.simdi'],
  tests: ['Bir girdi bozukken öbür kuralların uyarıları açılır', 'Okunamayan girdi açık uyarıyı kapatmaz'],
  dep: ['sozlesme', 'ayarlar', 'uyari', 'durum', 'eklenti', 'olcum', 'kalp', 'sertifika'], size: 'L',
  notes: "girdiler.ts veritabanı, sistem görünümü, sayaç, olcum_kayit_kaybi, durum ve API ölçü girdilerini her biri ayrı işlemde okur, iş kuralların kararlarını uyariAc ile yazar, kapanış süzgecini uygular, bildirimi süre bütçesiyle gönderir ve retSuSeviyesi çıktısı verir; index.ts dört işi isletimIsleri ile worker.ts için verir. İş listesi senaryoları değil yalnız iş kodlarını beklediğinden D14 worker.ts'i uygulamaKur'dan sonra tek adımda kurulabilir. Spec dosya listesine eklenen isletim-denetimi.test.ts D12 test veritabanı, sahte durum dizini, hata fırlatan sahte isSagligi ve sahte epostaGonder ile bozuk girdinin ayrı işlemde kaldığını (öbürleri 25P02 almaz), açık uyarının okunamayan girdide kapanmadığını ve düzeldi satırı gitmediğini denetler.",
});
add('komutlar', {
  title: 'Anahtar ve olay komut girişleri',
  files: ['apps/server/src/cli/anahtar-uret.ts', 'apps/server/src/cli/olay.ts', 'apps/server/src/cli/anahtar-uret.test.ts'],
  needs: ['D01.kimlikDinleyicileriniKur', 'D01.kimlikDinleyicileriHazir', 'D01.oturumlariKapat', 'D02.derslerKimlikDinleyicisi', 'D02.donemArasiMi', 'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D07.yenidenDegerlendir', 'D12.veritabaniKur', 'D04.saatBelgesiDogrula'],
  tests: ['Çevrimdışı yedek xprem ana anahtarını kapsar'], dep: ['sozlesme', 'ayarlar', 'logOlustur', 'sayac'], size: 'L',
  notes: "anahtar-uret uret, iki adımlı dondur, ele-gecirildi, yedekle, denetle ve donem-arasi alt komutlarını, olay oturumlari-kapat girişini dört aboneli kimlik kurulumuyla yazar; ikisi de komut bileşim köküdür ve uygulamaKur'u beklemez, böylece iki komutu birlikte sınayan senaryolar tek adımda kancalardan sonra gelir. Spec dosya listesine eklenen anahtar-uret.test.ts sahte gizli dizinde yedekle'nin dört girdili arşivini, xprem anahtarı yokken çıkış 1'i ve tek baytlık değişikliğin ikinci çalışmada fark edildiğini denetler.",
});
add('kancalar', {
  title: 'Test kancaları ve sağlık senaryoları',
  files: oldBy['D15-P13'].files, needs: oldBy['D15-P13'].needs, tests: oldBy['D15-P13'].tests,
  dep: ['sozlesme', 'ayarlar', 'logOlustur', 'dunya', 'eklenti'], size: 'L',
  notes: oldBy['D15-P13'].notes + " Bütün D15 senaryo paketleri bunu bekler; modül testleri beklemez.",
});
add('imaj', {
  title: 'Sunucu imajı ve server.ts girişi',
  files: ['apps/server/Dockerfile', 'apps/server/Dockerfile.dockerignore', 'apps/server/src/server.ts', 'docker/caddy/sayfalar/gizlilik.html'],
  needs: ['D12.veritabaniKur', 'D13.uygulamaKur', 'D14.isKuyruguKur', 'D14.epostaKur', 'D14.smtpTasiyicisi', 'D04.simdi'],
  tests: ['İmaj açılış denetimi derlenmiş sözleşme paketini ister'], dep: ['ayarlar', 'logOlustur', 'eklenti', 'yayinBilgisi', 'compose'], size: 'L',
  notes: "Çok aşamalı Dockerfile sunucu ve caddy hedefleriyle (caddy hedefi Caddyfile'ı ve gizlilik sayfasını, sunucu hedefi yayın bilgisi çıktısını alır), server.ts sekiz adımlı açılış ve kapanış sırasıyla yazılır; süreç girişi olduğu için uygulamaKur'u bekler. Deneme Dockerfile'ıyla derlenmiş sözleşme paketi olmadan imaj derlemesinin kırmızı, normal derlemenin yeşil olduğu denetlenir.",
});
add('sayacSenaryo', {
  title: 'Sayaç, ekran süresi ve hesap silme senaryoları',
  files: oldBy['D15-P20'].files, needs: oldBy['D15-P20'].needs, tests: oldBy['D15-P20'].tests,
  dep: ['sozlesme', 'kancalar', 'sayac', 'eklenti', 'olcum'], size: 'L',
  notes: oldBy['D15-P20'].notes + " olcum_hoca_isi sayımı için ölçüm görünümlerini, kurulum için kancaları bekler.",
});
add('uyariSenaryo', {
  title: 'Uyarı, kalp atışı ve sertifika senaryoları',
  files: [ST + 'uyari-adimlari.ts', FE + 'uyarilar.feature', FE + 'kalp-atisi.feature', FE + 'sertifika.feature'],
  needs: ['D14.isSagligi', 'D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem', 'D12.islem'],
  tests: ['Aynı uyarı tek açık satırda birikir', 'Uyarı satırında numara maskelenir, uzun metin kesilir', 'Bildirim, hatırlatma ve düzeldi iletisi', 'SMTP düşükken bildirim hatası kalp atışını çevirir', 'Bildirim adımı süre bütçesine uyar', 'Sessizlik kuralı başka modülün uyarısını kapatır', 'Sertifika uyarısını işletim denetimi kapatmaz', 'Uyarı kurallarının mutasyonu'],
  dep: ['kancalar', 'uyari', 'kalp', 'sertifika', 'denetim'], size: 'L',
  notes: "uyarilar.feature uyarı birikmesini, maskelemeyi ve kesmeyi, özet e-postayı, hatırlatma ve düzeldi iletisini, süre bütçesini ve sessizlik kapanışını, kalp-atisi.feature SMTP düşükken kalp atışının sorun adresine döndüğünü, sertifika.feature sertifika uyarısını işletim denetiminin kapatmadığını denetler; kural, kapanış süzgeci ve kalp atışı sonBasariAni denetimi bilerek bozulunca ilgili testler kırmızıya döner, dosyalar md5 ile geri yazılır.",
});
add('denetimSenaryo', {
  title: 'İşletim denetimi senaryoları',
  files: [ST + 'denetim-adimlari.ts', FE + 'isletim-denetimi.feature'],
  needs: ['D14.isSagligi', 'D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem', 'D12.islem'],
  tests: ['İşletim denetimi D14 sağlık ölçüsünden uyarı açar', 'Durum dosyalarından uyarı', 'Kanıt reddi ölçülür ve uyarı açar', 'Yeni ret kodu aynı gün uyarı açar', 'Devam tutarlılık farkı uyarıya döner', 'WAL arşivi ve bağlantı sayısı'],
  dep: ['kancalar', 'denetim'], size: 'L',
  notes: "isletim-denetimi.feature D14 sağlık ölçüsü, durum dosyaları ve yedek takvimi, kanıt reddi sayacı, yeni ret kodu su seviyesi, devam tutarlılığı, WAL ve bağlantı uyarılarını açılış ve kapanışlarıyla bütün uygulama üstünde denetler; işin kodu ve modül testi iş paketindedir.",
});
add('olcumSenaryo', {
  title: 'Ölçüm görünümü senaryoları ve olcum-raporu',
  files: ['apps/server/src/cli/olcum-raporu.ts', ST + 'olcum-adimlari.ts', FE + 'olcum-gorunumleri.feature', FE + 'haftalik-olcum-ozeti.feature'],
  needs: ['D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem', 'D12.veritabaniKur'],
  tests: ['Ölçüm görünümleri hedef tanımlarını uygular', 'Hocanın işi yalnız dersin sahiplerini sayar', 'Telefonda kalan kayıplar üç ayrı oranla sayılır', 'Haftalık özet ve 13 aylık silme'],
  dep: ['kancalar', 'olcum', 'ayarlar', 'logOlustur'], size: 'L',
  notes: "olcum-raporu komutu ölçüm özetini tarih aralığı ve birim için yazar; iki senaryo dosyası kurucu verisinde görünümlerin elle hesaplanan tabloyla aynı olduğunu, hocanın işini, telefonda kalan kayıpları, haftalık özeti ve ikinci çalışmanın 0 satır sildiğini denetler.",
});
add('surumSenaryo', {
  title: 'Eski sürüm istek örnekleri',
  files: oldBy['D15-P17'].files, needs: oldBy['D15-P17'].needs, tests: oldBy['D15-P17'].tests,
  dep: ['kancalar'], size: 'M', notes: oldBy['D15-P17'].notes,
});
add('komutSenaryo', {
  title: 'Anahtar döndürme ve komut girişi senaryoları',
  files: [ST + 'anahtar-adimlari.ts', ST + 'komut-adimlari.ts', FE + 'anahtar-dondurme.feature', FE + 'komut-girisleri.feature'],
  needs: ['D02.donemArasiMi', 'D04.saatBelgesiDogrula', 'D12.veritabaniKur'],
  tests: ['Anahtar döndürme iki adımda ve bütün süreçlerde', 'Ele geçirilen anahtarın şüphe anından sonraki kayıtları yeniden değerlendirilir', 'Komut girişleri kimlik dinleyicilerini kurar'],
  dep: ['kancalar', 'komutlar', 'betikler'], size: 'L',
  notes: "anahtar-dondurme.feature yeni kidin önce yalnız doğrulamada sonra etkin olduğunu ve anahtar.sh ele-gecirildi sonrası şüphe anından sonraki kayıtların yeniden değerlendirildiğini, komut-girisleri.feature olay oturumlari-kapat'ın dört aboneyle personel oturumlarını kapattığını, QR yuvasının iptal olduğunu, eksik aboneyle girişin açılmadığını ve donem-arasi çıktısının D02.donemArasiMi ile aynı olduğunu denetler.",
});
add('yuk', {
  title: 'Yük testi ortak parçaları ve ders çıkışı',
  files: oldBy['D15-P19'].files, jobs: ['yayin_oncesi_yuk_testi'], needs: oldBy['D15-P19'].needs, tests: oldBy['D15-P19'].tests,
  dep: ['dunya', 'compose', 'imaj'], size: 'L',
  notes: oldBy['D15-P19'].notes + " Koşu çalışan sunucu imajına karşı yapılır, bu yüzden kancaları değil imajı bekler.",
});
add('yukProfilleri', {
  title: 'Ders başı, gece ve giriş yığılması yük profilleri',
  files: oldBy['D15-P24'].files, tests: oldBy['D15-P24'].tests, dep: ['yuk'], size: 'S', notes: oldBy['D15-P24'].notes,
});
add('asvs', {
  title: 'ASVS eşlemesi ve eksiksizlik denetimi',
  files: oldBy['D15-P26'].files, tests: oldBy['D15-P26'].tests,
  dep: ['ayarlar', 'kancalar', 'sayacSenaryo', 'uyariSenaryo', 'denetimSenaryo', 'olcumSenaryo', 'surumSenaryo', 'komutSenaryo'], size: 'M',
  notes: "ASVS 5.0 seviye 2 maddeleri senaryo adlarına, ayar denetimlerine ya da gerekçeye bağlanır; asvs.test.ts feature dosyalarını ayrıştırdığından bütün D15 senaryo paketlerini bekler, her uygulanan maddenin var olan bir senaryoya bağlı, her uygulanmayan maddenin gerekçeli ve madde numaralarının tekil olduğunu denetler. Senaryodan modül testine taşınan beş test (kalp atışı adres seçimi, sertifika bitiş eşikleri, bozuk girdi yalıtımı, okunamayan girdi, çevrimdışı yedek) eşlemede senaryo adı olarak kullanılmaz.",
});

const id = new Map(P.map((p, i) => [p.key, 'D15-P' + String(i + 1).padStart(2, '0')]));
const out = { id: 'D15', packages: P.map(p => {
  for (const d of p.dep) if (!id.has(d)) throw new Error('bad dep ' + d + ' in ' + p.key);
  return { id: id.get(p.key), title: p.title, files: p.files, tables: p.tables, endpoints: p.endpoints, jobs: p.jobs, exports: p.exports, needs: p.needs, tests: p.tests, depends_on: p.dep.map(d => id.get(d)), size: p.size, notes: p.notes };
}) };
fs.writeFileSync(path.join(__dirname, 'D15.new.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote', out.packages.length, 'packages');

// Writes the D06 work packages. Run: node gen.js <path to packages/D06.json>
const fs = require('fs');
const out = process.argv[2];
const M = 'apps/server/src/modules/esitleme/';
const F = 'apps/server/test/features/esitleme/';
const S = 'apps/server/test/steps/esitleme/';
const K = 'packages/core/src/esitleme/';
const p = (n, o) => ({
  id: 'D06-P' + String(n).padStart(2, '0'),
  title: o.title,
  files: o.files,
  tables: o.tables || [],
  endpoints: o.endpoints || [],
  jobs: o.jobs || [],
  exports: o.exports || [],
  needs: o.needs || [],
  tests: o.tests,
  depends_on: (o.dep || []).map(d => 'D06-P' + String(d).padStart(2, '0')),
  size: o.size,
  notes: o.notes
});
const packages = [
  p(1, {
    title: 'Çekirdek: imleç, su seviyesi ve sayfa kesme',
    files: [K + 'imlec.ts', K + 'imlec.test.ts', K + 'su-seviyesi.ts', K + 'su-seviyesi.test.ts', K + 'sayfa.ts', K + 'sayfa.test.ts'],
    tests: ['İmleç kodlaması', 'Su seviyesi hesabı', 'Sayfa kesme'],
    size: 'M',
    notes: 'İmleç kodlaması, kesintisiz son sıra ve sürüm sınırında sayfa kesme saf işlev olarak yazılır; fast-check testleri kodla ve çöz tersliğini, 64 bitlik kimliğin kaybolmadığını, boşluk alanlarının sıfırlanmasını ve hiçbir sürümün iki sayfaya bölünmediğini sınar. Bağımlılığı yoktur.'
  }),
  p(2, {
    title: 'Çekirdek: ikinci çapa metni ve makbuz biçimi',
    files: [K + 'ikinci-capa-metni.ts', K + 'ikinci-capa-metni.test.ts', K + 'makbuz-bicimi.ts', K + 'makbuz-bicimi.test.ts'],
    tests: ['İkinci çapa metni', 'Ulaşma makbuzu'],
    size: 'M',
    notes: 'İkinci çapanın imzalı metni ve ulaşma makbuzunun bayt biçimi saf işlev olarak yazılır; özellik testleri tek bayt değişiminde doğrulamanın düştüğünü, anahtar türü eşlemesini ve kid kurallarını sınar. Bağımlılığı yoktur.'
  }),
  p(3, {
    title: 'Çekirdek: telefon kuyruk protokolü',
    files: [K + 'protokol.ts', K + 'protokol.test.ts'],
    tests: ['Telefon protokol kuralları', 'Tam indirme yarıda kalınca bayat satır kalmaz'],
    size: 'M',
    notes: 'Telefonun paket seçimi, bekleme, gerileme, bölme, ilk gönderim kaydırması ve tam indirme temizliği kuralları saf işlev olarak yazılır; fast-check testleri her kuralı rastgele cevap ve sayfa dizileriyle sınar. Bağımlılığı yoktur.'
  }),
  p(4, {
    title: 'Çekirdek: gönderme süresi ve dizin',
    files: [K + 'gonderme-suresi.ts', K + 'gonderme-suresi.test.ts', K + 'index.ts'],
    exports: ['gondermeSuresiSonu'],
    tests: ['Gönderme süresi sonu', 'Çekirdek kuralların mutasyon testi'],
    dep: [1, 2, 3],
    size: 'S',
    notes: 'Gönderme süresinin dışlayıcı sonu ve packages/core/src/esitleme dizini eklenir; D04, D07, D09 ve D10 gondermeSuresiSonu işlevini bu dizinden alır, D06 sunucu dosyaları da çekirdeği buradan içe aktarır. Tablo testi TZ=UTC ve TZ=Europe/Istanbul altında aynı sonucu, Stryker işi bütün çekirdek mutantlarının öldürüldüğünü gösterir; bu yüzden üç çekirdek paketini bekler.'
  }),
  p(5, {
    title: 'Sözleşme, tablolar, sürüm yaprağı ve kayıt defteri',
    files: ['packages/contracts/src/esitleme.ts', M + 'tablolar.ts', M + 'yaprak.ts', M + 'kayitlar.ts', 'apps/server/migrations/20261012090000_esitleme_ilk_tablolar/migration.sql', 'apps/server/migrations/20261012090000_esitleme_ilk_tablolar/snapshot.json', F + 'surum-damgasi.feature', S + 'surum-damgasi-adimlari.ts'],
    tables: ['gonderim_defteri', 'kurulumlar', 'degisiklik_sayaci', 'ogrenci_durum_surumleri', 'karar_teslimleri'],
    exports: ['surumAl', 'surumDamgasiIste', 'ogrenciDurumuDegisti', 'kurulumSonTemasi', 'kurulumSonTemaslari', 'kararTeslimAni', 'ogeTuruKaydet', 'indirmeKaynagiKaydet'],
    needs: ['D12.islem', 'D12.islemSonuKancasi', 'D12.kisitAdi', 'D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.imzaliMetinSemasi', 'D04.IKINCI_CAPA_YOK_NEDENLERI'],
    tests: ['Sürüm damgası tek sürümle yazılır'],
    size: 'L',
    notes: 'Öbür modüllerin beklediği her şey bu pakettedir ve modülün geri kalanını beklemez. Telefon sözleşmesinin tip, şema, rota ve hata tanımları (IkinciCapaBaglami ve GelenOge D04 sabitlerini ve tiplerini içe aktarır, bu yüzden D04.IKINCI_CAPA_YOK_NEDENLERI gerçek ihtiyaçtır), beş tablo ile göçü, yaprak dış yüzü (sayaç, damga, öğrenci sürümü, son temas, teslim bilgisi) ve öğe türü ile indirme kaynağı kayıt defteri (kayitlar.ts) yazılır. ogeTuruKaydet ve indirmeKaynagiKaydet kayitlar.ts içindedir ve index.ts yanında yaprak.ts üzerinden de dışa verilir: Modül sınırı başka modüle yalnız index.ts ve yaprak.ts kapısını açar, index.ts eklentiyi taşıdığı için geç gelir, yaprak.ts alan modülü içe aktarmadığından kayıt işlevleri burada erken hazırdır. surum-damgasi.feature tek sürümle damgalamayı, surumAl çağrılmadan biten işlemin geri alındığını, geri alınan SAVEPOINT içindeki damganın düştüğünü ve ilk surumAl eşzamanlılığını mutasyonla doğrular. Kayıt defterini P06 dağıtım senaryoları sahte işleyicilerle kullanır; çift kaydın açılışı durdurması, her türün tam bir kez kayıtlı olması ve tablo kısıtlarının sözleşme sabitleriyle aynılığı bütün göçlerin olduğu bileşik uygulamada P17 içinde sınanır.'
  }),
  p(6, {
    title: 'Öğe dağıtıcısı, danışma anahtarları ve gönderim test dili',
    files: [M + 'dagitici.ts', M + 'danisma-anahtarlari.ts', 'apps/server/test/support/kurucular/esitleme.ts', S + 'gonderim-adimlari.ts', F + 'dagitim-hatalari.feature'],
    needs: ['D12.islem', 'D12.kisitIhlali'],
    tests: ['İşleyicide kısıt hatası yalnız o öğeyi düşürür', 'Geçici çakışma yalnız parçayı bekletir', 'İşleyici sonuç sözleşmesi'],
    dep: [5],
    size: 'L',
    notes: 'Parçalı SAVEPOINT dağıtıcısı (ardışık aynı tür grupları, 50 öğelik parçalar, hızlı ve yedek yol, geçici kod ayrımı, bütçe denetimi, sonuç sözleşmesi), işleyicilerin kilitAnahtarlari kancalarından gelen anahtarları esitleme:kurulum_siniri anahtarıyla birleştiren saf işlevler (danisma-anahtarlari.ts; DanismaAnahtari tipi D12 sözleşmesinden), sahte işleyici ve sahte kaynak kurucuları ile kaynak sözleşme denetimi yardımcısı (support/kurucular/esitleme.ts; sahip modüller kendi kaynak testlerinde çağırır, geç ihtiyacı yoktur) ve paket kuran, sahte işleyici kaydeden, dağıtıcıyı süren gönderim adımları yazılır. dagitim-hatalari.feature kısıt hatası, geçici çakışma ve sonuç sözleşmesi dallarını sahte işleyicilerle ve sorgu günlüğüyle sınar. Bütçe dalı ve danışma anahtarlarının tek çağrısı gönderim ucu hazır olunca P12 içinde sınanır.'
  }),
  p(7, {
    title: 'Kurulum satırı, karar teslimi, iz, ulaşma makbuzu ve ikinci çapa bağlamı',
    files: [M + 'kurulum.ts', M + 'teslim.ts', M + 'iz.ts', M + 'ulasma-makbuzu.ts', M + 'ikinci-capa.ts', S + 'ogrenci-durumu-adimlari.ts', F + 'son-temas.feature'],
    needs: ['D12.islem', 'D12.danismaKilidi', 'D04.IKINCI_CAPA_YOK_NEDENLERI'],
    tests: ['Teslim bilgisi'],
    dep: [4, 5],
    size: 'L',
    notes: 'İki ucun ortak parçaları yazılır: kurulum satırının açılması, kişi başına 20 kurulum sınırı ve sayım anahtarı, 2 saniyelik kilit beklemesi, son temas ve su seviyesi yazımı, kişinin D06 satırlarını silme; karar teslimi sunum ve onay yazımı; gönderim ve indirme log satırı; ulaşma makbuzunun üretimi ve doğrulanması (kid anahtarı eklenti seçeneğinden); öğe başına ikinci çapa bağlamı (yokNedeni D04 sabitlerinden). kurulum.ts hata fırlatmaz: MESGUL, SINIR, ACILAMAZ ve BASKA_HESABIN sonuçlarını birlik tipiyle döner, uçlar bunları D13.uygulamaHatasi ile ESITLEME_KURULUM_ hatalarına çevirir; bu yüzden paket D13 api dış yüzünü beklemez. son-temas.feature kararTeslimAni dönüşünün üç durumunu ve sunan kurulumun son temas anını teslim.ts ile kurulum.ts işlevlerinin yazdığı satırlar üzerinden doğrular. Uçların son temas yazımı, 403 ve 503 dönüşleri P11, ulaşma makbuzu P14, ikinci çapa bağlamı P15 içinde uçtan sınanır.'
  }),
  p(8, {
    title: 'Gönderim ucu ve defter',
    files: [M + 'gonderim.ts', M + 'defter.ts', S + 'durum-makinesi-adimlari.ts', F + 'gonderim.feature'],
    endpoints: ['POST /v1/esitleme/gonderim'],
    needs: ['D12.islem', 'D12.danismaKilidi', 'D13.kalanSureMs', 'D13.uygulamaHatasi', 'D13.istekKimligi', 'D13.rotalariKaydet'],
    tests: ['200 öğelik paket tek işlemde işlenir', 'Aynı paket ardışık iki kez gönderilir', 'Bozuk öğe paketi düşürmez', 'İstek içi sıra tekrarı ve bozuk yerel ret paketi düşürmez', 'Bilinmeyen öğe türü atılmaz', 'Aynı sıra başka öğeyle gelir', 'Gövde sınırı ve öğe sayısı', 'Yerel ret bildirimi su seviyesini ilerletir', 'Rolü uymayan öğe'],
    dep: [4, 5, 6, 7],
    size: 'L',
    notes: 'POST /v1/esitleme/gonderim işleyicisi (işlem süresi ve bütçe, tek danışma kilidi çağrısı, kişi ve kurulum kilidi, ön denetim ve kilitten sonra yeniden okuma, karar teslimi onayı, dağıtım, öğrenci durum onayı, sayaç en sonda, silinmiş kişinin satırları, cevap şeması) ile gönderim defteri (defter.ts: ön denetim, ulaşma anı seçimi, toplu upsert, kesintisiz son sıra) yazılır; durum-makinesi-adimlari.ts uca HTTP ile paket gönderen adımları taşır. gonderim.feature rotayı test uygulamasına D13.rotalariKaydet ile bağlar, kimliği test kancasıyla verir ve 200 öğelik paketi, tekrarı, sıra çakışmasını, bozuk öğeyi, yerel reddi, bilinmeyen türü, gövde sınırını ve rol uyuşmazlığını sahte işleyicilerle doğrular. Bütçe, işlem süresi ve eşzamanlı gönderim P12, sayaç P13, ulaşma anı ve yedekten dönüş P14, durum makinesi P15 içinde sınanır.'
  }),
  p(9, {
    title: 'İndirme ucu',
    files: [M + 'indirme.ts', S + 'indirme-adimlari.ts', F + 'indirme.feature'],
    endpoints: ['GET /v1/esitleme/degisiklikler'],
    needs: ['D12.islem', 'D12.nesilOku', 'D13.uygulamaHatasi', 'D13.rotalariKaydet'],
    tests: ['Artımlı indirme', 'Baştan indir nedenleri', 'Tam indirme kendi kapsam satırı yüzünden yeniden başlamaz', 'Sayfalar sürüm sınırında kesilir', 'Teyitsiz öğrencinin kapsam bağlamı', 'Karar teslimi onayla yazılır'],
    dep: [4, 5, 6, 7],
    size: 'L',
    notes: 'GET /v1/esitleme/degisiklikler işleyicisi (imleç çözümü, baştan indirme nedenleri, kapsam, genel kaynak sayfaları, öğrenci bölümü, karar teslimi sunumu ve onayı) yazılır; gönderim ucunu beklemez. indirme.feature rotayı D13.rotalariKaydet ile bağlayıp artımlı indirmeyi, baştan indirme nedenlerini, sayfa sınırını, teyit bağlamını ve karar teslimi onayını P06 sahte kaynaklarıyla doğrular. Eşzamanlı yazmada değişiklik atlanmadığı P13 içinde sınanır.'
  }),
  p(10, {
    title: 'Saklama işleyicisi ve kimlik dinleyicisi',
    files: [M + 'saklama.ts', M + 'kimlik-dinleyicisi.ts', F + 'saklama.feature'],
    needs: ['D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D01.KimlikDinleyicisi', 'D01.KimlikOlayi'],
    tests: ['Saklama işleyicisi süresi dolan karar teslimlerini siler'],
    dep: [5, 7],
    size: 'M',
    notes: 'esitleme.donem_verisi saklama işleyicisi (son sunumu sınırdan eski karar_teslimleri satırlarını birincil anahtar sırasıyla FOR UPDATE SKIP LOCKED ile partilerle silen partiIsle) ve hesap_silindi olayında kurulum.ts silme işleviyle kişinin D06 satırlarını silen, öbür olayları yok sayan esitlemeKimlikDinleyicisi yazılır; tipler D01 sözleşmesinden. saklama.feature D12.saklamaIsleyicisiniCalistir ile yalnız süresi dolan karar teslimlerinin silindiğini, kurulumlar, defter ve öğrenci sürümünün değişmediğini, silinen kararda kararTeslimAni dönüşünün null olduğunu ve katalog dışı ince sınıf adının açılışı durdurduğunu doğrular. Dinleyici index.ts üzerinden P11 içinde dışa verilir; D01 olayıyla ve gönderimle birlikte davranışı bileşik uygulamada P17 içinde sınanır.'
  }),
  p(11, {
    title: 'Kimlik kancası, eklenti ve modül dizini',
    files: [M + 'kimlik-cozumu.ts', M + 'eklenti.ts', M + 'index.ts', F + 'gonderim-kimlik.feature'],
    exports: ['esitlemeEklentisi', 'esitlemeKimlikDinleyicisi'],
    needs: ['D12.islem', 'D12.saklamaIsleyicisiKaydet', 'D13.uygulamaHatasi', 'D13.rotalariKaydet'],
    tests: ['Kurulum kimliği başlığı', 'Hiçbir uygulama sürümüne kapanmaz', 'Oturumsuz ve imzasız gönderim reddedilir', 'Kapanmış Bearer ve pasif cihaz imzası kökten geçer', 'Cihaz değişiminden sonra eski telefonun bekleyen kayıtları ulaşır', 'Hoca oturumu bitince işler silinmez', 'Kişi uyuşmazlığı', 'Kurulum kilidi beklenemezse', 'Kişi başına kurulum sınırı', 'Cevap başlıkları', 'Hız sınırı doğrulanmış kimliğe bağlı', 'Kısıtlı oturum oturumsuz sayılır', 'Son temas ve bekleyen yoklama'],
    dep: [4, 8, 9, 10],
    size: 'L',
    notes: 'Gönderim ucunun kimlik kancası (kurulum başlığı, oturum, paket imzası, anahtar türü eşlemesi, ECDSA doğrulaması, kişi uyuşmazlığı; kısa salt okunur işlemde D01 işlevleri eklenti seçeneğinden), esitlemeEklentisi (rotalar yalnız D13.rotalariKaydet ile, saklama işleyicisi her süreçte D12.saklamaIsleyicisiKaydet ile, kayıtta veritabanına dokunmaz, zamanlayıcı kurmaz) ve modül dizini (index.ts: esitlemeEklentisi, esitlemeKimlikDinleyicisi, ogeTuruKaydet, indirmeKaynagiKaydet) yazılır. gonderim-kimlik.feature eklentiyi test uygulamasına bağlayıp iki uçtaki 401, 403, 429 ve 503 cevaplarını, satır açılmadığını, kurulum sınırını ve kilit beklemesini, cevap başlıklarını, kısıtlı oturumu ve uçların son temas ile bekleyen yoklama yazımını doğrular. Bileşim kökleri yalnız bu paketi bekler.'
  }),
  p(12, {
    title: 'Gönderim işlemi: bütçe, süre sınırı ve danışma kilidi',
    files: [F + 'danisma-kilidi.feature'],
    needs: ['D12.danismaKilidi'],
    tests: ['Zaman bütçesi kısmi sonuç verir', 'Aynı paket aynı anda iki kez gönderilir', 'İşlem süresi sınırı', 'Danışma anahtarları paket başında tek çağrıda'],
    dep: [8],
    size: 'M',
    notes: 'Gönderim ucunun işlem dalları test uygulamasında sahte işleyicilerle sınanır: parça ve öğe başına zaman bütçesi ile D13.kalanSureMs düşükken 5 saniyeye inen bütçe, aynı paketin eşzamanlı iki gönderiminde danışma anahtarı ve kurulum kilidi sırası ile kilitten sonraki yeniden okumanın mutasyonu (dosya md5 ile geri yazılır), transaction_timeout ile 503 ve şemaya uymayan sonuçla 500, D12.danismaKilidi işlevinin işlem başına tek çağrısı (sahte sayaçla). Hiçbir paket bunu beklemez.'
  }),
  p(13, {
    title: 'Sayaç eşzamanlılığı',
    files: [F + 'sayac-eszamanlilik.feature'],
    tests: ['Sayaç gönderimde bir kez ve en sonda alınır', 'Eşzamanlı yazmada değişiklik atlanmaz', 'Öğrenci gönderimi sayacı kilitlemez'],
    dep: [8, 9],
    size: 'M',
    notes: 'degisiklik_sayaci etrafındaki zamanlama iki uç birlikteyken zorlanır: hoca paketinde sayacın bir kez ve defter ile kurulum yazımından sonra alındığı, iki grubun damgalarının aynı sürümü yazıp sonraki indirmede indiği, sayaçtan sonra yeni satır kilidi olmadığı; iki yazıcı ve bir okuyucuyla hiçbir değişikliğin atlanmadığı; 200 yoklama öğelik öğrenci gönderimi açıkken sayacın beklemeden arttığı. Hiçbir paket bunu beklemez.'
  }),
  p(14, {
    title: 'Ulaşma anı ve yedekten dönüş',
    files: [S + 'yedekten-donus-adimlari.ts', F + 'yedekten-donus.feature'],
    tests: ['Sunucu tarafı bekletme ulaşma anını korur', 'Ulaşma makbuzu başka öğeye geçmez', 'Yedekten dönüşte makbuzlu kayıt kaybolmaz'],
    dep: [4, 8],
    size: 'M',
    notes: 'packages/core/src/esitleme/protokol.ts ile sürülen telefon benzetimi ve defter, kurulum su seviyesi ile kayıtları geri saran adımlar yazılır; yedekten-donus.feature sunucu tarafı bekletmede ulaşma anının korunduğunu, makbuzun başka öğeye, sıraya ya da kuruluma geçmediğini ve ELE_GECIRILDI anahtarının yok sayıldığını, geri sarmadan sonra sonSira gerilediğinde makbuzlu hiçbir kaydın kaybolmadığını doğrular.'
  }),
  p(15, {
    title: 'Gönderim durum makinesi ve ikinci çapa bağlamı',
    files: [F + 'gonderim-durum-makinesi.feature', F + 'ikinci-capa.feature'],
    needs: ['D04.IKINCI_CAPA_YOK_NEDENLERI'],
    tests: ['Gönderim durum makinesi', 'İkinci çapa bağlamı'],
    dep: [4, 11, 14],
    size: 'M',
    notes: 'gonderim-durum-makinesi.feature fast-check ile açıkça 200 denemede rastgele paketleri, eşzamanlı tekrarları, bozulan sırayı, yarıda kalan gönderimi, paket düzeyi hataları ve sonradan yedekten dönüşü protokol.ts ile sürer ve ULASTI olan her öğenin sahibinin tablosunda tam bir kez olduğunu gösterir (P14 geri sarma adımlarını kullanır); ikinci-capa.feature eklentiye bağlı kimlik kancasıyla imzalı paketlerde öğe başına bağlamı, anahtar türü uyuşmazlığını ve her yokNedeni değerinin D04 listesinde olduğunu doğrular.'
  }),
  p(16, {
    title: 'Sıra boşluğu raporu ve en eski sürüm komutu',
    files: [M + 'kuyruklar.ts', M + 'en-eski-surum.ts', 'apps/server/src/jobs/esitleme/index.ts', 'apps/server/src/jobs/esitleme/sira-boslugu-raporu.ts', 'apps/server/src/cli/esitleme-en-eski-surum.ts', S + 'is-adimlari.ts', F + 'sira-boslugu-raporu.feature', F + 'en-eski-surum.feature'],
    jobs: ['sira_boslugu_raporu'],
    exports: ['enEskiGecerliSurumuYukselt'],
    needs: ['D14.isTanimla', 'D14.isiCalistirVeBekle', 'D04.istanbulTarihi', 'D12.veritabaniKur', 'D12.islem', 'D15.ayarlariYukle', 'D09.denetimeYaz', 'D09.denetimOlaylariniKaydet'],
    tests: ['sira_boslugu_raporu boşlukları bulur ve eskiyi temizler', 'Boşluk raporlandıktan sonra eksik sıra gelir', 'En eski geçerli sürüm komutu'],
    dep: [5, 8, 9],
    size: 'M',
    notes: 'SIRA_BOSLUGU_RAPORU kuyruk tanımı (kuyruklar.ts, D14 içe aktarılmaz), gecelik sira_boslugu_raporu işi, enEskiGecerliSurumuYukselt (en-eski-surum.ts) ve onu D09.denetimeYaz ile aynı işlemde çağıran komut girişi yazılır; komut modülün dosyasını doğrudan içe aktarır, index.ts bu işlevi dışa vermez, eklenti bu paketi beklemez. sira-boslugu-raporu.feature boşluk ölçüsünü, eski defter temizliğini, iki kez çalışmanın aynı sonucu verdiğini ve raporlanan boşluk gönderimle kapanınca ilk_eksik_sira alanının boşaldığını (gönderim ucu gerekir); en-eski-surum.feature sürüm yükseltmesiyle denetim olayının tek işlemde yazıldığını ve sonraki indirmenin baştan indiğini (indirme ucu gerekir) doğrular.'
  }),
  p(17, {
    title: 'Sözleşme denetimleri ve hesap silme',
    files: [S + 'sozlesme-adimlari.ts', F + 'sozlesme.feature', F + 'hesap-silme.feature'],
    needs: ['D13.uygulamaKur', 'D15.TestDunyasi'],
    tests: ['Öğe türleri kayıtlı', 'Gönderim ve indirme şemaları', 'İndirme kaynağı sözleşme denetimi', 'Tablo kısıtları sözleşmeyle aynı', 'Modül sınırı', 'Eklenti birleşimi ve kayıtlar', 'Hesap silinince D06 satırları silinir'],
    dep: [11, 16],
    size: 'M',
    notes: 'Bileşik uygulamada (D13.uygulamaKur ve D15.TestDunyasi) koşan sözleşme senaryoları: OGE_TURLERI listesindeki her türün tam bir kez kayıtlı olduğu ve çift kaydın açılışı durdurduğu, OpenAPI belgesindeki genişleyen enum alanları ve cevap şeması, her kayıtlı indirme kaynağında support/kurucular/esitleme.ts yardımcısı, bütün göçler uygulanmışken tablo kısıtlarının sözleşme sabitleriyle aynılığı ve başka modülün kurulumlar tablosuna yabancı anahtarı olmadığı, jobs ve cli dahil dependency-cruiser modül sınırı, eklenti birleşimi ve denetim olayı kaydı; hesap-silme.feature D01 olayıyla dinleyicinin kişinin D06 satırlarını sildiğini, silinmiş kişinin imzalı paketini ve silmeyle gönderimin eşzamanlı çalışmasını doğrular. Hiçbir paket bunu beklemez.'
  }),
  p(18, {
    title: 'Uçtan uca senaryolar ve yük testi',
    files: [F + 'ogrenci-durumu.feature', F + 'kapsam.feature'],
    needs: ['D13.uygulamaKur', 'D15.TestDunyasi', 'D05.kararSutunlariniYaz'],
    tests: ['Öğrenci durum onayı karar yazımıyla kilitlenmez', 'Karar sürümü telefondan sorun bildirimine aynen döner', 'Öğrenciye yalnız kendi verisi iner', 'Kapsam değişince baştan indir', 'Ders çıkışı yük testi', 'Yedekten dönüş sonrası yük'],
    dep: [11],
    size: 'M',
    notes: 'Öbür modüllerin gerçek işleyici ve kaynaklarıyla bileşik uygulamada (D13.uygulamaKur ve D15.TestDunyasi) uçtan uca senaryolar ve k6 yük testleri koşulur; ogrenci-durumu.feature ve kapsam.feature kilitlenmesiz onayı, karar sürümünün sorun bildirimine aynen döndüğünü ve öğrenciye yalnız kendi verisinin indiğini, yük testleri p95, p99 ve 503 eşiklerini doğrular. Hiçbir paket bunu beklemez.'
  })
];
const txt = JSON.stringify({ id: 'D06', packages }, null, 1) + '\n';
if (/[–—]/.test(txt)) throw new Error('U+2013 or U+2014 in output');
fs.writeFileSync(out, txt);
console.log('wrote', packages.length, 'packages');

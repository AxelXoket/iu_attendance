// Rewrites packages/D10.json: keeps P01, P03-P07 untouched, reshapes P02 and P08-P16.
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(src, 'utf8'));
const old = Object.fromEntries(P.packages.map(p => [p.id, p]));
const S = 'apps/server/src/modules/raporlar/', F = 'apps/server/test/features/raporlar/';
const pk = (id, o) => ({ id, title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests, depends_on: o.depends_on || [], size: o.size, notes: o.notes });
const neu = [
  old['D10-P01'],
  pk('D10-P02', {
    title: 'Anlık tabloları, göç ve taban okuması',
    files: [S + 'tablolar.ts', 'apps/server/migrations/20261010090000_raporlar_aksis_ozet_anliklari/migration.sql', 'apps/server/migrations/20261010090000_raporlar_aksis_ozet_anliklari/snapshot.json', S + 'yaprak.ts', 'apps/server/test/steps/raporlar/anlik-adimlari.ts', F + 'anlik-saklama.feature'],
    tables: ['aksis_ozet_anliklari', 'aksis_ozet_anligi_satirlari'],
    exports: ['aksisAnligiGetir'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem'],
    tests: ['Şema kuralları iki tabloda tutar', 'aksisAnligiGetir sözleşmesi', 'Taban kuralı dış yüzden doğru anlığı verir'],
    depends_on: ['D10-P01', 'D10-P07'], size: 'L',
    notes: 'İki anlık tablosu tablolar.ts ve tek göç klasörüyle (içe aktarılan sabitlerden CHECK listeleri, GUN_SONU kısmi tekil dizini, @yalniz-ekleme yorumu, UPDATE ve DELETE yetkisinin geri alınması) kurulur, yaprak.ts yalnız ./tablolar.ts içe aktararak aksisAnligiGetir taban kuralını verir; anlik-saklama.feature şema kurallarını, taban kuralını ve dış yüz sözleşmesini anlik-adimlari.ts adımlarıyla denetler, taban senaryolarının anlıkları bu adımlarla doğrudan yazılır. saklama.ts ve yalnız ekleme yetkisi senaryosu D12.saklamaIsleyicisiniCalistir istediği için D10-P14 içindedir; böylece D09 aksisAnligiGetir için D12 saklama mekanizmasını beklemez.'
  }),
  old['D10-P03'], old['D10-P04'], old['D10-P05'], old['D10-P06'], old['D10-P07'],
  pk('D10-P08', {
    title: 'Okuma işlemi, okunan tablolar, kaynak yetkisi ve geçici nedenleri',
    files: [S + 'okuma-islemi.ts', S + 'okunan-tablolar.ts', S + 'yetki.ts', S + 'gecicilik.ts', 'apps/server/test/steps/raporlar/rapor-adimlari.ts', F + 'rapor-sozlesmesi.feature'],
    needs: ['D12.islem', 'D12.Islem', 'D13.kalanSureMs', 'D13.uygulamaHatasi', 'D02.dersYetkisi', 'D02.dersGetir', 'D02.subeGetir', 'D02.oturumlariGetir', 'D01.yetkiDenetle', 'D06.gondermeSuresiSonu'],
    tests: ['Büyüyebilen kodlar x-extensible-enum taşır', 'Okunan yabancı sütunlar şemada var', 'Rapor işlemi yazamaz'],
    depends_on: ['D10-P01', 'D10-P02', 'D10-P05', 'D10-P07'], size: 'L',
    notes: 'okuma-islemi.ts READ ONLY ve REPEATABLE READ işlemi süre bütçesi ve isteğe bağlı rapor okuma havuzuyla açar, okunan-tablolar.ts okuma istisnasındaki sorguları sahiplerin tipli tablolarıyla, yetki.ts yalnız sahip kabulünü, yönetici kapsamını ve varlık sızdırmayan 404 RAPORLAR_BULUNAMADI kararını toplar; sunucu gecicilik.ts çağıranın verdiği D08 satırlarından ve hücrelerinden, okunan-tablolar.ts kafa sayısı işareti ve kilitten sonra ulaşan kayıt okumalarından, D02.oturumlariGetir cevapsız listesinden ve D06.gondermeSuresiSonu ile süren gönderme sürelerinden neden sayılarını core gecicilik.ts sırası ve süzgeciyle toplar. gecicilik.ts D08 dış yüzünü çağırmaz (D08 satır tipleri sözleşmeden gelir), bu yüzden ders raporu ve AKSİS özeti paketleri birbirini beklemeden aynı toplayıcıyı kullanır; neden sayıları o iki paketin senaryolarında doğrulanır. rapor-sozlesmesi.feature EXPLAIN, 25006 ve x-extensible-enum senaryolarıyla, bütün rapor adımlarını taşıyan rapor-adimlari.ts üzerinden denetler.'
  }),
  pk('D10-P09', {
    title: 'AKSİS özeti kurucusu ve özet ucu',
    files: [S + 'aksis-ozeti.ts', F + 'aksis-ozeti.feature'],
    endpoints: ['GET /v1/raporlar/subeler/{subeId}/aksis-ozeti'],
    needs: old['D10-P09'].needs,
    tests: ['AKSİS özeti elle hesaplanan altın tabloyla birebir'],
    depends_on: ['D10-P01', 'D10-P02', 'D10-P05', 'D10-P08'], size: 'L',
    notes: 'Özet kurucusu D08.dersSonuclari sonucunu aynı okuma işleminde canlı okuyup sıra, tür bayrakları, ders işaretleri, çıktı durumu, taban ve ozetOzeti ile kurar, geçici nedenlerini D10-P08 gecicilik.ts toplayıcısından alır; GET ucu bu kurucuyu çağırır, çıktı ucu ve gün sonu işi aynı kurucuyu içe aktarır. aksis-ozeti.feature 14 öğrencilik elle hesaplanmış altın tabloyla her alanı, sırayı ve ozetOzeti değerini karşılaştırır. Ders raporunu beklemez: iki rapor ucu aynı aşamada yapılır.'
  }),
  pk('D10-P10', {
    title: 'Ders raporu',
    files: [S + 'ders-raporu.ts', F + 'ders-raporu.feature'],
    endpoints: ['GET /v1/raporlar/dersler/{dersId}'],
    needs: old['D10-P10'].needs,
    tests: ['Ders raporu satırları liste sırasıyla, sütunları biten oturumlarla gelir', 'Tarih aralığı iki ucu dahil, gün olarak ve dönem sınırına kırpılır', 'Hücre kodları oturum ve kayıt durumunu yansıtır', 'Onay bekleyen Kendi beyanı Var yazar ve rapor geçicidir'],
    depends_on: ['D10-P01', 'D10-P08'], size: 'L',
    notes: 'Ders raporu ucu kırpılmış tarih aralığını, biten ve iptal edilmemiş oturum sütunlarını, liste sırasındaki satırları ve D08.oturumSonDurumlari hücrelerinden hücre kodlarını kurar, geçici nedenlerini D10-P08 gecicilik.ts toplayıcısından alır; kırpma kuralı ve hücre eşlemesi öğrenci raporunun içe aktarabileceği adlı işlevlerdir. ders-raporu.feature sıra, aralık, hücre kodu ve geçicilik senaryolarıyla denetler. AKSİS özetini beklemez; hücre toplamlarının özetle tutması iki uç da hazır olunca D10-P11 içinde denetlenir.'
  }),
  pk('D10-P11', {
    title: 'Öğrenci raporu ve rapor toplamlarının özetle tutması',
    files: [S + 'ogrenci-raporu.ts', F + 'ogrenci-raporu.feature'],
    endpoints: ['GET /v1/raporlar/ogrenciler/{satirId}'],
    needs: old['D10-P11'].needs,
    tests: ['Öğrenci raporu yalnız isteyen hocanın derslerini kapsar', 'Ders raporu toplamları AKSİS özetiyle her an tutar'],
    depends_on: ['D10-P07', 'D10-P08', 'D10-P09', 'D10-P10'], size: 'M',
    notes: 'Öğrenci raporu ucu numarayı D03.satirGetir ile çözer, ders-raporu.ts kırpma ve hücre işlevlerini içe aktararak yalnız isteyen hocanın aynı dönemdeki derslerindeki satırları tek öğrenci olarak toplar ve kayıt kararını ekler. ogrenci-raporu.feature başka hocanın dersinin cevapta olmadığını ve o hocanın satır kimliğiyle 404 döndüğünü, ayrıca D10-P07 kurucusunun tohumu yazılı 50 dersinde her (ders, numara) ve tür için ders raporu hücre toplamlarının AKSİS özetiyle ve D08.dersSonuclari(tx, subeId, { an, hucreler: true }) hücreleriyle tuttuğunu denetler; bu karşılaştırma ders raporu ve özet ucu bittikten sonra koşabildiği için buradadır.'
  }),
  pk('D10-P12', {
    title: 'AKSİS özeti çıktısı ve hoca çıktısı anlığı',
    files: [S + 'cikti.ts', S + 'anlik.ts', F + 'aksis-ozeti-ciktisi.feature'],
    endpoints: ['POST /v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar'],
    needs: ['D12.islem', 'D13.kalanSureMs', 'D13.uygulamaHatasi', 'D08.dersSonuclari'],
    tests: old['D10-P12'].tests,
    depends_on: ['D10-P01', 'D10-P02', 'D10-P08', 'D10-P09'], size: 'L',
    notes: 'Çıktı ucu D10-P09 özet kurucusuyla özeti yeniden kurar, özet karşılaştırması, cevapsız oturum engeli, çıktı kimliğiyle tekrar ve 40001 sonrası yeniden çalıştırma ile çalışır, anlik.ts başlık ve satırları aynı işlemde yazar (gün sonu işi de bu yazıcıyı kullanır); ders raporunu beklemez. aksis-ozeti-ciktisi.feature 201 ve 200 ayrımını, 409 kodlarını, anlık satır sayısını, KARAR BEKLİYOR ve telafi değerlerinin (D08.dersSonuclari casusuyla) anlığa aynen geçtiğini ve ozet_ozeti değerinin yeniden hesapla tuttuğunu denetler.'
  }),
  pk('D10-P13', {
    title: 'Dönem sonu raporu',
    files: [S + 'donem-sonu.ts', F + 'donem-sonu-raporu.feature'],
    endpoints: ['GET /v1/raporlar/yonetim/donem-sonu'],
    needs: old['D10-P13'].needs,
    tests: old['D10-P13'].tests,
    depends_on: ['D10-P02', 'D10-P03', 'D10-P08', 'D10-P10'], size: 'M',
    notes: 'Dönem sonu ucu taban anlığına göre Haksız devamsız, mazeretli dönüş ve KARAR BEKLİYOR kalanı tek küme sorgusu ve degisimSinifi ile isimsiz sayar, D08 dış yüzünü çağırmaz; donem-sonu-raporu.feature sınıflamayı, onda bir birimli oranı, kilitSonrasiHesapTamam değerini, 409 RAPORLAR_DONEM_KILITLI_DEGIL kodunu ve cevapta numara olmadığını denetler. Taban anlıkları anlik-adimlari.ts adımlarıyla yazılır; D10-P10 yalnız testin olumlu kontrolü (kurulumdaki ad hocanın ders raporunda görünür) için beklenir.'
  }),
  pk('D10-P14', {
    title: 'Raporlar eklentisi, rotalar, kuyruk, kilit adımı ve saklama işleyicisi',
    files: [S + 'rotalar.ts', S + 'index.ts', S + 'kuyruk.ts', S + 'kilit-adimi.ts', S + 'saklama.ts', F + 'rapor-yetkisi.feature'],
    exports: ['raporlarEklentisi'],
    needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D02.kilitAdimiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D14.isGonder', 'D14.KuyrukTanimi'],
    tests: ['Başka hocanın dersi, şubesi ve öğrencisi bulunamadı döner', 'Rol ve kimlik denetimi rapor uçlarında çalışır', 'Rota listesi sözleşmeyle birebir', 'Eklenti birleşim kurallarına uyar', 'Anlık tablolarına uygulama rolleri yalnız ekler ve okur'],
    depends_on: ['D10-P02', 'D10-P03', 'D10-P08', 'D10-P09', 'D10-P10', 'D10-P11', 'D10-P12', 'D10-P13'], size: 'L',
    notes: 'raporlarEklentisi beş rotayı D13.rotalariKaydet ile, sira 20 kilit adımını ve saklama.ts raporlar.donem_verisi parti işleyicisini (kilit_ani sınırdan eski başlıkları siler, satırlar CASCADE ile gider) her süreçte kaydeder, index.ts aksisAnligiGetir ve degisimSinifi dış yüzünü de verir, kuyruk.ts stately aksisGunSonuKuyrugu tanımını, kilit-adimi.ts kilit işlemi içindeki isGonder çağrısını verir. rapor-yetkisi.feature rol ve kimlik reddini, varlık sızdırmayan 404 cevabını, rota listesinin sözleşmeyle aynılığını, eklenti birleşim kurallarını ve iki anlık tablosunda uygulama rollerinin yalnız ekleyip okuduğunu, silmenin yalnız D12.saklamaIsleyicisiniCalistir altında yoklama_saklama girişiyle geçtiğini denetler. Bileşim kökünü beklemez: senaryolar D13 senaryo düzeneğinde yalnız bu eklentiyle koşar.'
  }),
  pk('D10-P15', {
    title: old['D10-P15'].title,
    files: old['D10-P15'].files, jobs: old['D10-P15'].jobs,
    needs: ['D14.isTanimla', 'D14.isGonder', 'D02.kilitDurumu', 'D02.kilitliBirimDonemleri', 'D12.islem', 'D12.saklamaIsleyicisiniCalistir', 'D08.dersSonuclari'],
    tests: old['D10-P15'].tests,
    depends_on: ['D10-P02', 'D10-P09', 'D10-P12', 'D10-P14'], size: 'L',
    notes: old['D10-P15'].notes.replace('İş, kilit adımının', 'İş D10-P09 özet kurucusunu ve D10-P12 anlık yazıcısını kullanarak, kilit adımının')
  }),
  pk('D10-P16', {
    title: old['D10-P16'].title,
    files: old['D10-P16'].files,
    needs: ['D13.uygulamaKur'],
    tests: old['D10-P16'].tests,
    depends_on: ['D10-P14', 'D10-P15'], size: 'M',
    notes: old['D10-P16'].notes + ' Denetim olayı haritasının açılışta kaydı bileşim kökünde yapıldığından bu paket D13.uygulamaKur bekler; modülün tek uçtan uca paketi budur.'
  })
];
P.packages = neu;
fs.writeFileSync(dst, JSON.stringify(P, null, 1) + '\n');

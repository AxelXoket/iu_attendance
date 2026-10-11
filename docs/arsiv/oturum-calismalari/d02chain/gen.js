// Generates packages/D02.json (tightened). node gen.js <out>
// Packages are defined with symbolic keys; ids D02-P01.. follow list order, depends_on is resolved from keys.
const fs = require('fs');
const M = 'apps/server/src/modules/dersler/';
const J = 'apps/server/src/jobs/dersler/';
const F = 'apps/server/test/features/dersler/';
const ST = 'apps/server/test/steps/dersler/';
const CO = 'packages/core/src/dersler/';
const E2E = ['D13.uygulamaKur', 'D15.TestDunyasi'];
const defs = [];
const pk = (key, title, size, o) => defs.push({ key, title, size, ...o });

// ---- Sözleşme ve çekirdek (veritabanı yok) ----
pk('soz', 'Dersler sözleşmesi', 'L', {
  files: ['packages/contracts/src/dersler.ts'],
  exports: ['OturumUretimOlayi', 'OTURUM_TURLERI', 'OTURUM_DURUMLARI', 'IPTAL_NEDENLERI', 'YAPILDI_DURUMLARI', 'DERSLER_DENETIM_OLAYLARI'],
  needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.beklenenSurumNoSemasi', 'D13.anSemasi', 'D13.gunSemasi', 'D13.dersSaatiSemasi', 'D13.kimlikSemasi', 'D13.ogeSonuclariSemasi', 'D13.tamListeSemasi', 'D13.sayfaSemasi', 'D13.sayfaSorgusuSemasi'],
  tests: ['Dersler sözleşmesi derlenir: rota beyanları rotaTanimla denetiminden geçer, istek şemaları katıdır, sabit listeler tekil ve küçük harflidir'],
  notes: "31 rota tanımı, istek ve cevap şemaları, DERSLER_ hata kataloğu, dört sabit değer listesi, OturumUretimOlayi tipi ve denetim olay şemaları packages/contracts/src/dersler.ts dosyasına yazılır. Öbür modüllerin beklediği sabitler ve tipler burada çıkar; dosya yalnız D13'ün sözleşme parçalarını içe aktarır. tsc ve D13'ün Vitest sözleşme denetimiyle sınanır.",
});
pk('kural', 'Takvim, çakışma ve ders kodu kuralları', 'M', {
  files: [CO + 'takvim.ts', CO + 'takvim.test.ts', CO + 'cakisma.ts', CO + 'cakisma.test.ts', CO + 'normallestir.ts', CO + 'normallestir.test.ts'],
  tests: ['Son hafta, kilit günü ve dönem arası', 'Çakışma aralığı yarı açıktır', 'Program saati örtüşmesi', 'Normalleştirme sabit noktadır ve Türkçe harfi doğru büyütür'],
  notes: 'Son hafta, kilit günü, dönem arası, tatil ve sınav haftası kuralları, yarı açık aralık, program saati örtüşmesi ve Türkçe büyüten ders kodu normalleştirmesi hiçbir dosya içe aktarmayan saf işlevler olarak yazılır; Vitest ve fast-check özellikleri TZ=UTC ve TZ=Europe/Istanbul ile iki kez koşar.',
});
pk('plan', 'Oturum üretim planı', 'L', {
  files: [CO + 'uretim.ts', CO + 'uretim.test.ts', CO + 'index.ts'],
  tests: ['Üretim planı deterministik ve idempotenttir', 'Tatilde ve ders yapılmayan sınav haftasında planlı oturum kalmaz', 'Geçmiş oturuma dokunulmaz, hoca iptali geri gelmez', 'Oturum sayısı gün gün sayımla eşittir', 'Ortak kural paketi mutasyon kapısı'],
  dep: ['soz', 'kural'],
  notes: 'Programdan dönemin bütün oluşumlarını çıkaran ve yalnız başlamamış oturumların farkını (eklenecek, güncellenecek, iptal, geri alınacak) veren deterministik plan işlevi takvim kurallarının üstüne yazılır, iptal nedeni ve oturum türü tipleri sözleşmeden gelir; numRuns 1000 özellikleri, satır ve dal kapsamı yüzde 90 ve packages/core/src/dersler üzerinde Stryker kırma eşiğiyle denetlenir.',
});

// ---- Şema ve yaprak (dışa açılan okumalar erken) ----
pk('sema', 'Şema, göç ve saat çevirisi', 'L', {
  files: [M + 'tablolar.ts', 'apps/server/migrations/20261012090000_dersler_baslangic/migration.sql', 'apps/server/migrations/20261012090000_dersler_baslangic/snapshot.json', M + 'saat.ts', M + 'saat.test.ts'],
  tables: ['birimler', 'bolumler', 'donemler', 'takvimler', 'takvim_tatilleri', 'takvim_sinav_haftalari', 'birim_donemleri', 'dersler', 'subeler', 'program_saatleri', 'program_saati_subeleri', 'oturumlar', 'oturum_subeleri', 'oturum_degisiklikleri'],
  needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem'],
  tests: ['Göç boş test veritabanında kurulur; kısıt, dizin ve tetikleyici adları kisitAdi ile, CHECK listeleri sözleşme sabitleriyle aynıdır', 'saat.ts yaz saatli ve bugünkü örnekleri veritabanının saat dilimi verisiyle çevirir (TZ=UTC, sabit +03 kırmızı)'],
  dep: ['soz'],
  notes: "On dört tablo kisitAdi adlarıyla Drizzle şemasına, CHECK listeleri durumKisiti ile sözleşme sabitlerinden yazılır; tetikleyiciler, CHECK kısıtları ve modül içi yabancı anahtarlar tek başlangıç göçündedir. kisiler tablosuna giden üç yabancı anahtar D01'in göçünü (20261020090000) beklemesin diye ders paketindeki ayrı ileri göçe bırakılır; başlangıç göçü yalnız D12'nin işlevleriyle kurulur. saat.ts AT TIME ZONE çevirisini verir; saat.test.ts geçici test veritabanında koşar, göç D12 şema denetiminden geçer.",
});
pk('yaprak', 'Okuma yaprağı ve kayıt defterleri', 'L', {
  files: [M + 'yaprak.ts', M + 'kayitlar.ts', M + 'yaprak.test.ts'],
  exports: ['dersGetir', 'dersYetkisi', 'subeGetir', 'dersSubeleri', 'birimGetir', 'kilitliBirimDonemleri', 'hocaninDersleri', 'oturumGetir', 'oturumlariGetir', 'oturumSayfasi', 'oturumSubeleri', 'birimDonemiGetir', 'kilitDurumu', 'takvimGetir', 'donemArasiMi', 'denetlenecekDersler', 'oturumUretimDinleyicisiKaydet', 'kilitAdimiKaydet', 'listeKaynagiKaydet'],
  needs: ['D12.Islem', 'D13.Kimlik'],
  tests: ['Oturum okuma süzgeci kesik liste dönmez', 'Denetlenecek dersler ve uygulanmış kilit süzgeci'],
  dep: ['soz', 'kural', 'sema'],
  notes: "Öbür modüllerin beklediği on altı okuma işlevi yaprak kuralıyla yalnız tablolar.ts, sözleşme, core takvim kuralları ve D12 işlem tipi kullanılarak yaprak.ts içine, üç kayıt defteri (üretim dinleyicisi, kilit adımı, liste kaynağı) kayitlar.ts içine yazılır; başka alan modülüne bağlanmadığı için şemadan hemen sonra çıkar. yaprak.test.ts satırları tablolar.ts ile atıp işlevleri geçici test veritabanında doğrudan çağırır.",
});
pk('yetki', 'Yetki, liste sorguları ve çakışma ucu', 'M', {
  files: [M + 'yetki.ts', M + 'sorgular.ts', M + 'servis-cakisma.ts', M + 'yetki-ve-cakisma.test.ts'],
  endpoints: ['GET /v1/dersler/{dersId}/cakismalar'],
  needs: ['D01.yetkiDenetle', 'D01.kisiGetir', 'D13.uygulamaHatasi', 'D13.Kimlik', 'D12.Islem'],
  tests: ['Yetki yardımcısı: başka hocanın dersi ve kapsam dışı yönetici DERSLER_BULUNAMADI alır, inceleme hesabı deneme dışı derste reddedilir', 'Çakışma işleyicisi sahte liste kaynağıyla kesişen saati verir, bitişik saati vermez ve 2000 satırda API_SONUC_COK_BUYUK fırlatır'],
  dep: ['kural', 'sema', 'yaprak'],
  notes: "Kaynak ve inceleme hesabı yetki yardımcısı (dersYetkisi ve D01.yetkiDenetle), başka modüle bağlanmayan liste sorguları (hoca adı D01.kisiGetir'den) ve kayıtlı liste kaynağının etkin satırlarıyla numara ve isim döndürmeyen çakışma ucu işleyicisi yazılır; test dosyası işleyicileri geçici test veritabanında doğrudan çağırır, uygulama kurulmaz.",
});
pk('oran', 'Oran yazıcısı', 'S', {
  files: [M + 'oranlar.ts', M + 'oranlar.test.ts'],
  exports: ['oranlariYaz'],
  needs: ['D06.surumDamgasiIste', 'D12.Islem'],
  tests: ['oranlariYaz kilitli ve arşivdeki derste yazmaz, değişince ders satırına surumDamgasiIste ile damga bırakır ve surumAl çağırmaz'],
  dep: ['sema', 'yaprak'],
  notes: "D08'in oran ucunun kendi işleminde çağırdığı oranlariYaz (ders satırı FOR UPDATE, kilitDurumu ile aynı an, sonuç kodu, damga) yazım hattını ve D08'in iş kuyruğunu beklemesin diye ayrı dosyada yazılır; test dosyası sayaç casusuyla geçici test veritabanında koşar.",
});
pk('kafa', 'Kafa sayısı yazıcısı', 'S', {
  files: [M + 'kafa-sayisi.ts', M + 'kafa-sayisi.test.ts'],
  exports: ['kafaSayisiniYaz'],
  needs: ['D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D12.Islem'],
  tests: ['kafaSayisiniYaz FOR NO KEY UPDATE ile yazar: cevapsız oturumda yapıldı, aynı değerde degismedi, yapılmadı ya da iptal oturumda çelişki; yapıldı değişince tek D08 işi YAPILDI, sürüm almaz'],
  dep: ['sema', 'yaprak'],
  notes: "D07'nin kafa sayısı öğesinin son adımı olan kafaSayisiniYaz ve yapıldı cevabının da kullandığı çelişki kuralı oturum yazım hattını beklemesin diye ayrı dosyada yazılır (oturum satırı FOR NO KEY UPDATE, an saat arayüzünden, D08.devamHesaplaIsiKoy YAPILDI); test dosyası sahte D08 kaydıyla geçici test veritabanında koşar.",
});

// ---- Yazım hattı ve servisler ----
pk('hat', 'Oturum yazım hattı ve denetim yazıcısı', 'L', {
  files: [M + 'uretim.ts', M + 'denetim.ts', M + 'uretim.test.ts'],
  needs: ['D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D09.denetimeYaz', 'D12.Islem'],
  tests: ['Yazım hattı sırayı korur: satırlar ve değişiklik geçmişi, dinleyiciler, denetim, D08 işi, en son tek surumAl; dinleyici hata verince hiçbir satır kalmaz', 'Ortak arşiv ve devir kuralları: başlamamış oturumlar arsiv nedeniyle iptal olur, sahiplik geçmişi kapanıp yeni öğe açılır'],
  dep: ['plan', 'sema', 'yaprak'],
  notes: "Planı yazan hat (satırlar ve değişiklik geçmişi, üretim dinleyicileri, denetim, D08 işi, en son tek surumAl), program, ders, deneme ve hesap olayının paylaştığı arşiv kuralı (sahipsizDersKurali dahil) ile devir kuralı ve DERSLER_DENETIM_OLAYLARI ile D09.denetimeYaz'a yazan denetim yazıcısı yazılır; servisler birbirine değil bu dosyaya dayanır. uretim.test.ts sahte dinleyici ve sayaç casusuyla geçici test veritabanında koşar.",
});
pk('program', 'Program kaydı', 'M', {
  files: [M + 'servis-program.ts', M + 'servis-program.test.ts'],
  endpoints: ['GET /v1/dersler/{dersId}/program', 'POST /v1/dersler/{dersId}/program/onizleme', 'PUT /v1/dersler/{dersId}/program'],
  needs: ['D13.uygulamaHatasi'],
  tests: ['Program işleyicileri: önizleme ile kayıt aynı farkı verir, eski düzenleme numarası DERSLER_SURUM_UYUSMUYOR, örtüşen ortak şubeli saatler DERSLER_PROGRAM_CAKISIYOR alır'],
  dep: ['plan', 'yaprak', 'yetki', 'hat'],
  notes: 'Program görme, önizleme ve kaydetme işleyicileri yazım hattının üstüne yazılır (bugünkü oturum korunur, düzenleme numarası denetlenir); test dosyası işleyicileri geçici test veritabanında doğrudan çağırır, oturum üretimi senaryoları uçtan uca pakette koşar.',
});
pk('oturum', 'Oturum işlemleri ve Ders yapıldı mı', 'L', {
  files: [M + 'servis-oturum.ts', M + 'servis-oturum.test.ts'],
  endpoints: ['GET /v1/dersler/{dersId}/oturumlar', 'POST /v1/dersler/{dersId}/telafi', 'PATCH /v1/dersler/oturumlar/{oturumId}', 'POST /v1/dersler/oturumlar/{oturumId}/iptal', 'GET /v1/dersler/oturumlar/onaysiz', 'POST /v1/dersler/oturumlar/{oturumId}/yapildi-mi', 'POST /v1/dersler/oturumlar/yapildi-mi'],
  needs: ['D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
  tests: ['Oturum işleyicileri: telafi ve taşıma, iptal ve geri alma, başlamış oturum reddi, tek ve toplu yapıldı cevabının dersId sırasıyla kilitlenmesi'],
  dep: ['yaprak', 'yetki', 'kafa', 'hat'],
  notes: "Oturum listesi, telafi (taşıma ve sınır), tek oturum düzenleme, iptal ve geri alma, onaysız liste, tek ve toplu yapıldı cevabı (ders satırları dersId sırasıyla kilitlenir, çelişki kuralı kafa-sayisi.ts'ten) yazılır; test dosyası geçici test veritabanında koşar, telafi, iptal ve yapıldı senaryoları uçtan uca pakette koşar.",
});
pk('ders', 'Ders, şube ve devir', 'L', {
  files: [M + 'servis-ders.ts', M + 'servis-ders.test.ts', 'apps/server/migrations/20261020100000_dersler_kisi_baglari/migration.sql', 'apps/server/migrations/20261020100000_dersler_kisi_baglari/snapshot.json'],
  endpoints: ['GET /v1/dersler', 'POST /v1/dersler', 'GET /v1/dersler/{dersId}', 'PATCH /v1/dersler/{dersId}', 'POST /v1/dersler/{dersId}/arsivle', 'POST /v1/dersler/{dersId}/subeler', 'PATCH /v1/dersler/{dersId}/subeler/{subeId}', 'GET /v1/dersler/yonetim/dersler', 'POST /v1/dersler/yonetim/dersler/{dersId}/devir'],
  needs: ['D01.kisiGetir', 'D01.personelRolleri', 'D01.hesapSilindiMi', 'D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
  tests: ['Ders işleyicileri: birim, süre ve QR değişince aynı işlemde yeniden üretim, programaKat paralel saatleri atlar, öğrencili şube pasifleşmez, devir hedefi denetlenir'],
  dep: ['kural', 'yaprak', 'yetki', 'hat'],
  notes: "Ders açma, düzenleme (birim, süre ve QR değişince aynı işlemde yeniden üretim), arşiv, şube ekleme (programaKat) ve pasifleştirme, yönetici listesi ve devir işleyicileri yazılır; dersler.sahip_kisi_id, oturumlar.iptal_eden_kisi_id ve oturum_degisiklikleri.degistiren_kisi_id yabancı anahtarları D01 göçünden (20261020090000) sonra gelen ayrı ileri göçle eklenir. Test dosyası sahte liste kaynağı ve sahte D04 dinleyicisiyle geçici test veritabanında koşar.",
});
pk('takvim', 'Birim, dönem ve takvim yönetimi', 'L', {
  files: [M + 'servis-takvim.ts', M + 'kuyruklar.ts', M + 'servis-takvim.test.ts'],
  endpoints: ['GET /v1/dersler/birimler', 'GET /v1/dersler/yonetim/birimler', 'POST /v1/dersler/yonetim/birimler', 'PATCH /v1/dersler/yonetim/birimler/{birimId}', 'POST /v1/dersler/yonetim/birimler/{birimId}/bolumler', 'GET /v1/dersler/yonetim/donemler', 'POST /v1/dersler/yonetim/donemler', 'POST /v1/dersler/yonetim/takvimler', 'PUT /v1/dersler/yonetim/takvimler/{takvimId}', 'PUT /v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}'],
  needs: ['D12.donemBolumuAc', 'D14.isGonder', 'D14.KuyrukTanimi', 'D06.surumAl', 'D06.surumDamgasiIste', 'D13.uygulamaHatasi'],
  tests: ['Takvim işleyicileri: oluşturma uçları tekrarda güvenli, dönem açılırken donemBolumuAc bir kez çağrılır, takvim değişince iş aynı işlemde kuyruğa girer, kilit anı FOR SHARE ile türetilir'],
  dep: ['sema', 'yaprak', 'yetki', 'hat'],
  notes: 'Birim, bölüm, dönem, takvim ve birim dönemi bağı işleyicileri (FOR SHARE ile kilit anı türetme, son günü gerekçeyle ileri alma ve yeniden açma, aynı işlemde kuyruğa koyma) ile üç kuyruk tanımı yazılır; yeniden üretim işinin kendisi iş tanımları paketindedir. Test dosyası D12 bölüm casusu ve D14 test kuyruğuyla geçici test veritabanında koşar.',
});
pk('kilit', 'Dönem kilidi', 'M', {
  files: [M + 'servis-kilit.ts', J + 'donem-kilidi.ts', M + 'servis-kilit.test.ts'],
  endpoints: ['GET /v1/dersler/yonetim/kilitler'],
  jobs: ['donem_kilidi'],
  needs: ['D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
  tests: ['Kilit uygulaması: kayıtlı adımlar sira ile ve D02 arşivinden önce, adım hata verince hiçbir şey uygulanmaz, ikinci çalışma satır yazmaz'],
  dep: ['yaprak', 'yetki', 'hat'],
  notes: 'Kilit anının uygulanması (kayıtlı adımlar sira ile, sonra arşiv, ders başına KILIT işi, denetim ve sürüm), kilitler listesi ve donem_kilidi işleyicisi yazılır; test dosyası sahte kilit adımlarıyla geçici test veritabanında koşar, takvim ve kilit senaryoları uçtan uca pakette koşar.',
});
pk('deneme', 'Deneme dersi ve hesap olayları', 'M', {
  files: [M + 'servis-deneme.ts', M + 'dinleyiciler.ts', J + 'deneme-dersi-oturumlari.ts', M + 'deneme-ve-dinleyici.test.ts'],
  jobs: ['deneme_dersi_oturumlari'],
  exports: ['denemeDersiniKur', 'derslerKimlikDinleyicisi'],
  needs: ['D01.kisiGetir', 'D01.KimlikDinleyicisi', 'D01.KimlikOlayi', 'D12.donemBolumuAc', 'D06.surumDamgasiIste', 'D15.log'],
  tests: ['denemeDersiniKur eş güçlüdür ve farklı hocaya devreder; hesap_silindi olayı etkin dersleri arşivler, deneme dersinde yalnız sahip hesap durumunu değiştirir'],
  dep: ['yaprak', 'hat'],
  notes: "Eş güçlü denemeDersiniKur (inceleme dönemi, birimsiz deneme dersi, şube 1, 14 günlük oturum, yazım hattındaki devir kuralı), deneme_dersi_oturumlari işleyicisi ve yazım hattındaki sahipsizDersKurali'ni çağıran derslerKimlikDinleyicisi yazılır; ders servisini beklemez. Test dosyası sayaç casusu ve D12 bölüm casusuyla geçici test veritabanında koşar.",
});
pk('indirme', 'İndirme kaynakları ve personel kapsamı', 'M', {
  files: [M + 'indirme.ts', M + 'kapsam.ts', M + 'indirme.test.ts'],
  needs: ['D01.kisiGetir', 'D12.Islem'],
  tests: ['Beş indirme kaynağı imleç ile üst sürüm arasını rol başına satır şemasıyla döner, tatiller birim dönemi sürümüyle GREATEST alır; personel kapsamı ders sahipliğinden türer'],
  dep: ['sema', 'yaprak'],
  notes: 'Beş genel kaynak (dersler, program saatleri, oturumlar, tatiller, kilit) ve personel kapsam kaynağı kendi tipleriyle yazılır, D06 kaydını eklenti yapar; test dosyası kaynak işlevlerini geçici test veritabanında doğrudan çağırır, indirme senaryoları uçtan uca pakette koşar.',
});
pk('eklenti', 'Rotalar, eklenti ve modül girişi', 'M', {
  files: [M + 'rotalar-dersler.ts', M + 'rotalar-oturumlar.ts', M + 'rotalar-yonetim.ts', M + 'eklenti.ts', M + 'index.ts', M + 'eklenti.test.ts'],
  exports: ['derslerEklentisi', 'DerslerEklentisiSecenekleri'],
  needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D06.indirmeKaynagiKaydet'],
  tests: ['derslerEklentisi çıplak Fastify örneğinde 31 rotayı rotalariKaydet ile kaydeder, kayıt sırasında sorgu atmaz, ikinci kayıtta ve liste kaynağı yokken açılışta hata verir'],
  dep: ['soz', 'yaprak', 'yetki', 'oran', 'kafa', 'program', 'oturum', 'ders', 'takvim', 'kilit', 'deneme', 'indirme'],
  notes: 'Üç rota dosyası 31 işleyiciyi D13.rotalariKaydet ile bağlar, eklenti beş indirme kaynağını ve personel kapsamını kaydedip liste kaynağını açılışta denetler, index.ts dışa açılanları verir; iş tanımlarını içe aktarmaz. eklenti.test.ts sahte bağımlılıklarla çıplak Fastify örneğinde koşar, bileşim kökü kurulmaz.',
});
pk('isler', 'Takvim yenileme işi ve iş tanımları', 'M', {
  files: [J + 'takvim-oturumlarini-yenile.ts', J + 'index.ts', J + 'isler.test.ts'],
  jobs: ['takvim_oturumlarini_yenile'],
  exports: ['isler'],
  needs: ['D14.isTanimla', 'D15.log'],
  tests: ['İş çizelgesi D14 kurallarına uyar', 'Takvim yenileme işi olay verisiyle takvimin derslerini, boş veriyle gece onarımını yapar; ikinci çalışma boş fark bulur'],
  dep: ['yaprak', 'hat', 'takvim', 'kilit', 'deneme'],
  notes: "takvim_oturumlarini_yenile işinin olay ve gece onarımı çalışması yazım hattıyla yazılır, üç iş isTanimla ile isler dizisinde tanımlanır; isler.test.ts diziyi D14'ün çizelge doğrulayıcısından geçirir ve işi geçici test veritabanında iki kez çalıştırır.",
});

// ---- Test desteği (bileşim kökünü beklemez) ----
pk('kurucu', 'Veri kurucusu ve ortak adımlar', 'M', {
  files: ['apps/server/test/support/kurucular/dersler.ts', ST + 'takvim-adimlari.ts'],
  needs: ['D15.kurucuTanimla', 'D15.KurucuHaritasi', 'D15.TestDunyasi'],
  tests: ['Kurucu ve ortak adımlar tsc ile derlenir; dersler kurucusu KurucuHaritasi\'na tek adla kaydolur, aynı ad ikinci kez reddedilir'],
  dep: ['soz', 'sema'],
  notes: "Öbür modüllerin senaryolarının da kurucu('dersler') ile kullandığı veri kurucusu (birim, dönem, takvim, ders, şube, program saati ve oturum satırları) ve birim, dönem, takvim, tatil, sınav haftası, sahte saat ve TZ ortak adımları yalnız tablolar, saat.ts ve sözleşmeyle yazılır; servisleri ve bileşim kökünü beklemez.",
});
pk('adim', 'Senaryo adımları', 'L', {
  files: [ST + 'ders-adimlari.ts', ST + 'oturum-adimlari.ts', ST + 'yonetim-adimlari.ts', ST + 'sozlesme-adimlari.ts'],
  needs: ['D15.TestDunyasi', 'D13.TUM_ROTALAR', 'D09.denetimeYaz', 'D14.isiCalistirVeBekle'],
  tests: ['Senaryo adımları tsc ile derlenir; Cucumber kuru koşusu (dry-run) adımlarda belirsiz eşleşme bulmaz'],
  dep: ['soz', 'kurucu', 'yaprak', 'kafa', 'deneme'],
  notes: "Ders, şube, program, önizleme, telafi, iptal, yapıldı ve kafa sayısı adımları; birim, dönem, takvim, bağ, sahte üretim dinleyicisi ve sahte kilit adımı kaydı, denemeDersiniKur çağrısı, hesap silme ve iş çalıştırma adımları; rota tablosu, hata kataloğu ve denetim olayı örneklerini D13.TUM_ROTALAR ve D09.denetimeYaz doğrulayıcısıyla karşılaştıran sözleşme adımları yazılır. Uçları test dünyasının istekGonder'i ile sözleşmedeki rota tanımlarından çağırır; bütün senaryo paketleri bu adımları paylaştığı için bileşim kökünden önce tek yerde durur ve senaryo paketleri birbirini beklemez.",
});

// ---- Uçtan uca senaryolar (bileşik uygulama; birbirini beklemez) ----
const SCN = ['kurucu', 'adim'];
pk('sProgram', 'Program ve saat dilimi senaryoları', 'L', {
  files: [F + 'oturum-uretimi.feature', F + 'saat-dilimi.feature'],
  needs: E2E,
  tests: ['Program kaydı dönemin bütün oturumlarını üretir', 'Yarım gün tatil yalnız tatil saatinden sonra başlayan oturumu iptal eder', 'Ders yapılmayan sınav haftasında oturum üretilmez', 'Program değişikliği yalnız başlamamış oturumlara uygulanır', 'Aynı program ikinci kez kaydedilince hiçbir şey yazılmaz', 'Eski düzenleme numarasıyla program kaydı reddedilir', 'Yazım yarıda kalırsa hiçbir şey kalmaz', 'Önizleme ile kayıt aynı planı verir', 'Program saatlerinin örtüşmesi geçerlilik aralığına bakar', 'Yerel saat veritabanının saat dilimi verisiyle çevrilir'],
  dep: SCN,
  notes: 'Oturum üretimi ve saat dilimi senaryoları sahte dinleyici, sayaç casusu ve kurucunun takviminden hesaplanan kaba gün sayımıyla yazılır ve bileşik uygulamada HTTP üzerinden yeşil olur.',
});
pk('sDers', 'Ders ve şube senaryoları', 'L', {
  files: [F + 'ders-ve-program.feature'],
  needs: E2E,
  tests: ['Ders birimi değişince oturumlar yeni takvimle üretilir', 'Süre değişikliği başlamamış oturumlara iner ve pencereyi yeniden hesaplatır', 'QR ayarı bayrak kapalıyken açılamaz', 'Kod ve ad değişikliği denetime yazılır', 'Şube etiketi değişince ders satırı sürüm alır', 'Yeni şube paralel lab saatlerine kendiliğinden eklenmez', 'Şubede öğrenci varken şube pasifleştirilemez', 'Pasif şube boş program saati ve şubesiz oturum bırakmaz', 'Takvimsiz birime ders açılamaz, aynı kimlikle tekrar güvenlidir', 'Başlamış oturumu olan ders hoca tarafından arşivlenemez', 'Devir: yeni hoca dersi görür, eski hoca görmez', 'Devir hedefi denetlenir'],
  dep: SCN,
  notes: 'Ders, şube, arşiv ve devir senaryoları gerçek liste kaynağı ve D04 dinleyicisi kurulu bileşik uygulamada yazılır ve yeşil olur.',
});
pk('sOturum', 'Oturum senaryoları', 'L', {
  files: [F + 'telafi-iptal-ve-duzenleme.feature', F + 'ders-yapildi-mi.feature'],
  needs: E2E,
  tests: ['Hoca iptali yeniden üretimle geri gelmez', 'Sistem iptaline hoca iptali nedeni hoca yapar', 'Aynı gün telafi uyarıyla oluşur, taşıma eskisini iptal eder', 'Telafi sınırı yalnız planlı telafileri sayar', 'Başlamış oturum düzenlenemez, iptal edilemez, taşınamaz', 'Kısa kod tekil, değişmez ve 10 rakamlık metindir', 'Kafa sayısı yapıldı yapar, yapılmadı cevabından sonra çelişki açar', 'İptal ve çelişkili oturuma iki cevap', '"Ders yapıldı mı?" listesi yalnız bitmiş ve cevapsız oturumları gösterir', 'Toplu cevap öğe başına sonuç döner'],
  dep: SCN,
  notes: 'Telafi, iptal, düzenleme ve "Ders yapıldı mı?" senaryoları bileşik uygulamada yazılır ve yeşil olur.',
});
pk('sTakvim', 'Birim, dönem, takvim ve kilit senaryoları', 'L', {
  files: [F + 'birim-ve-donem.feature', F + 'takvim-ve-kilit.feature'],
  needs: E2E,
  tests: ['Yönetici oluşturma uçları tekrarda güvenlidir', 'Dönem açılırken bölüm açılır', 'Takvim değişince yeniden üretim aynı işlemde kuyruğa girer', 'Gece onarımı saat dilimi eşitliğini korur', '500 dersli birimde takvim değişikliği', 'Kilit anı son günün ertesi 00:00 İstanbul saatidir', 'Kilitten sonra cevapsız oturum cevaplanır, değişiklik reddedilir', 'Dönem kilidi işi yan etkileri bir kez uygular', 'Kilit adımları sıra numarasıyla ve D02 adımlarından önce çalışır', 'Kilit adımı hata verirse kilit uygulanmaz', 'Kilitten sonra son gün geri alınamaz, gerekçeyle ileri alınır ve dersler yeniden açılır', 'Ortak takvimli iki birimden yalnız biri uzatılır'],
  dep: SCN,
  notes: 'Birim, dönem, takvim, yeniden üretim işi, gece onarımı, kilit anı, kilit adımları, son günü ileri alma ve ortak takvim senaryoları sahte saat ve D14 iki kez çalıştırma adımıyla bileşik uygulamada yazılır ve yeşil olur; 500 derslik yük ölçümü geliştirme makinesinde koşar.',
});
pk('sDiger', 'Çakışma, deneme, hesap silme, yetki ve indirme senaryoları', 'L', {
  files: [F + 'cakismalar.feature', F + 'deneme-dersi.feature', F + 'hesap-silme.feature', F + 'yetki.feature', F + 'inceleme-hesabi.feature', F + 'indirme.feature'],
  needs: E2E,
  tests: ['Çakışma: kesişen saatler görünür, bitişik saatler görünmez', 'Deneme dersi denemeDersiniKur ile kurulur ve devredilir', 'Deneme dersi her gün 14 gün ileriye oturum taşır', 'Hoca hesabı silinince dersleri arşivlenir', 'Başka hocanın dersi görülmez ve değiştirilemez', 'İnceleme hocası ders açamaz ve yalnız deneme dersini görür', 'İndirme: öğrenciye yalnız şubesinin oturumları iner', 'İndirme: kaynaklar yalnız imleç ile üst sürüm arasını döner', 'İndirme: pasif liste satırında ders telefonda kalır', 'İndirme: şube kümesi daralan oturum öğrenciye silindi olarak iner', 'İndirme: takvim bağı değişince yeni takvimin tatilleri iner', 'İndirme: ders başka birime taşınınca kilit ve tatiller artımlı iner'],
  dep: SCN,
  notes: "Çakışma, deneme dersi, hesap silme, başka hocanın dersi (önce kırmızı yazılır) ve inceleme hesabı senaryoları ile D06'nın artımlı ve tam indirme adımlarını kullanan indirme senaryoları bileşik uygulamada yazılır ve yeşil olur.",
});
pk('sSozlesme', 'Sözleşme senaryoları', 'L', {
  files: [F + 'sozlesme.feature'],
  needs: E2E,
  tests: ['Dersler rota listesi sözleşmesi', 'Hata kataloğu ve genişleyen değerler', 'Yönetici uçları hocaya kapalıdır', 'Denetim olayları D09 doğrulayıcısından geçer', 'Eklenti iki süreçte aynı kaydı yapar', 'Şema adları, içe aktarma ve göç kuralları', 'Üretim olayı D04 sözleşmesine uyar', 'D08 işinin nedeni yola göre konur', 'Her yazım telefona inen satırları tek sürümle damgalar'],
  dep: SCN,
  notes: 'Rota listesi, hata kataloğu, yönetici uçları, denetim olayları, iki süreçte eklenti kayıtları, şema adları ve içe aktarma kuralları (kisiler yabancı anahtarları dahil), üretim olayı tipi, D08 nedenleri ve tek sürüm damgası bileşik uygulamada denetlenir.',
});
pk('sSon', 'Eşzamanlılık, yük ve bilinçli hatalar', 'L', {
  files: [F + 'eszamanlilik.feature'],
  needs: E2E,
  tests: ['Bağ ve takvim yazımı eşzamanlı olunca bayat kilit anı kalmaz', 'Liste yazımı pasifleştirme ve arşivle yarışınca pasif şubede ya da arşivdeki derste etkin satır kalmaz', 'Toplu cevap ve devir yarışında kilitlenme ve eski sahip yazımı olmaz', 'Cevaplar sözleşme şemasına uyar', 'Ders çıkışında kafa sayısı kayıtları bekletmez', 'Ders çıkışında D02 indirme kaynaklarının payı', 'Bilinçli hatalar testleri kırmızıya çevirir'],
  dep: [...SCN, 'sProgram', 'sDers', 'sOturum', 'sTakvim', 'sDiger', 'sSozlesme'],
  notes: "Üç eşzamanlılık senaryosu çok bağlantılı adımlarla, iki ders çıkışı ölçümü D15'in k6 koşusuyla yazılır; bütün D02 senaryoları cevap şemasıyla bir kez daha koşar ve bilinçli hata listesinin her maddesi kendi senaryosunu kırmızıya çevirir, özgün baytlar md5 denetimiyle geri yazılır.",
});

const idOf = new Map(defs.map((d, i) => [d.key, 'D02-P' + String(i + 1).padStart(2, '0')]));
const packages = defs.map(d => {
  for (const k of d.dep || []) if (!idOf.has(k)) throw new Error('unknown dep ' + k + ' in ' + d.key);
  return {
    id: idOf.get(d.key), title: d.title, files: d.files, tables: d.tables || [], endpoints: d.endpoints || [], jobs: d.jobs || [],
    exports: d.exports || [], needs: d.needs || [], tests: d.tests, depends_on: (d.dep || []).map(k => idOf.get(k)), size: d.size, notes: d.notes,
  };
});
fs.writeFileSync(process.argv[2], JSON.stringify({ id: 'D02', packages }, null, 1) + '\n');
console.log('wrote', packages.length);

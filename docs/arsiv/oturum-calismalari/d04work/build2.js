// Builds the reworked packages/D04.json. Run: node build2.js <backend dir>
const fs = require('fs'), path = require('path');
const D = process.argv[2];
const M = 'apps/server/src/modules/saat/', J = 'apps/server/src/jobs/saat/', F = 'apps/server/test/features/saat/', ST = 'apps/server/test/steps/saat/', K = 'packages/core/src/saat/';
const MIG = 'apps/server/migrations/20261020100000_saat_pencere_tablolari/';
const pk = (id, size, title, o) => ({ id: 'D04-P' + id, title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests, depends_on: (o.dep || []).map(d => 'D04-P' + d), size, notes: o.notes });
const packages = [
  pk('01', 'S', 'Saat arayüzü ve İstanbul yardımcıları', {
    files: [K + 'saat.ts', 'apps/server/src/infra/saat/index.ts', 'apps/server/src/infra/saat/sistem-saati.ts', 'apps/server/src/infra/saat/istanbul.ts', 'apps/server/src/infra/saat/istanbul.test.ts', 'apps/server/test/support/sahte-saat.ts'],
    exports: ['simdi', 'istanbulTarihi', 'istanbulAni', 'istanbulGunSonuAni', 'duvarSaatiFarkiMs'],
    tests: ['Saat dilimi bağımsızlığı ve İstanbul yardımcıları'],
    notes: 'Kural anlarının tek kaynağı Saat arayüzü, sistem saati, duvar saati farkı, pg-boss saatine bağlı sahte saat ve İstanbul tarih yardımcıları hiçbir modüle bağlanmadan yazılır; istanbul.test.ts yaz saatli ve bugünkü örnekleri TZ=UTC ve TZ=Europe/Istanbul altında iki kez koşar. Hiçbir şey beklemez; simdi ve istanbulTarihi bu yüzden ilk aşamada hazırdır.'
  }),
  pk('02', 'M', 'Saat sözleşmesi, çekirdek tipleri ve belge biçimi', {
    files: ['packages/contracts/src/saat.ts', K + 'sabitler.ts', K + 'tipler.ts', K + 'base64url.ts', K + 'belge.ts', K + 'belge.test.ts', K + 'belge-ornekleri.json'],
    exports: ['ILK_CAPA_DURUMLARI', 'IKINCI_CAPA_DURUMLARI', 'IKINCI_CAPA_YOK_NEDENLERI', 'ILK_CAPA_TELEFON_BILDIRIMLERI', 'SAAT_DURUMLARI', 'SAAT_KAYNAKLARI', 'PENCERE_SONUCLARI', 'KAPANIS_NEDENLERI', 'DEGISIKLIK_TURLERI', 'SAAT_DENETIM_OLAYLARI', 'SAAT_ROTALARI', 'PENCERE_SURESI_OGESI', 'ERKEN_KAPATMA_OGESI', 'SaatOznesi', 'belgeCoz', 'belgeImzaGirdisi', 'KAYMA_PPM', 'BELGE_EN_COK_YAS_MS', 'BELGE_ISTEK_EN_COK_MS', 'BELGE_BAYT', 'BELGE_KARAKTER', 'DEGER_BAYT'],
    needs: ['D13.CihazId', 'D13.KisiId', 'D13.rotaTanimla', 'D13.ogeTuruTanimla', 'D13.genisleyenEnum', 'D13.hataKodlariTanimla', 'D13.anSemasi'],
    tests: ['Belge biçimi kayıtlı örnekle aynı'],
    notes: 'packages/contracts/src/saat.ts (kod sabitleri, denetim olayları, SAAT_ROTALARI, iki öğe şeması, SAAT_ hata kataloğu) ile çekirdeğin sabitleri, SaatOznesi dahil tipleri, base64url kodlayıcısı ve 82 baytlık belge biçimi yazılır; belge.test.ts kayıtlı örnek belgeyi Buffer ve atob silinmiş ortamda bayt bayt denetler. Komşuların beklediği sözleşme sabitleri, SaatOznesi ve sayı sabitleri tanımlandıkları bu pakettedir: paket yalnız D13 sözleşme dışa verimlerini bekler, çekirdek girişi index.ts beklenmez.'
  }),
  pk('03', 'M', 'Çapa aralığı ve saat sonucu', {
    files: [K + 'capa.ts', K + 'sonuc.ts', K + 'capa.test.ts', K + 'sonuc.test.ts'],
    exports: ['capaAraligi', 'saatSonucu'],
    tests: ['Çapa aralığı gerçek anı kapsar', 'Pay plan formülüne uyar', '7 gün sınırı iki çapada da geçerli', '10 saniyeden uzun belge isteği çapa kurmaz', 'İki çapanın birleşimi', 'Ulaşma anı denetimi', 'Tahmin yalnız kaynak YOK iken boş', 'Başka öznenin belgesi çapa kurmaz'],
    dep: ['02'],
    notes: 'İleri ve geri çapa aralığı (100 ppm kayma payı) ile iki çapayı birleştiren saf saatSonucu yazılır; capa.test.ts ve sonuc.test.ts sabitleri içe aktararak fast-check özellikleri ve sınır tablolarıyla denetler. Yalnız sözleşme ve tipler paketini bekler, pencere hesabıyla aynı aşamada yapılır; D05, D09, D11 ve D13 saatSonucu için yalnız bu paketi bekler.'
  }),
  pk('04', 'M', 'Pencere hesabı ve eski program', {
    files: [K + 'pencere.ts', K + 'program.ts', K + 'pencere.test.ts', K + 'program.test.ts'],
    exports: ['pencereHesapla', 'pencereIcindeMi', 'pencereDurumu'],
    tests: ['Pencere sınırı öğrenci lehine ve yarı açık', 'Pencere hesabı varış sırasından bağımsız', 'Aynı kurulumun değişiklikleri sıra düzeninde', 'Değişiklik geçmişe işlemez', 'Kayıt anındaki süre ayarı', 'Eski programla gelen kayıt'],
    dep: ['02'],
    notes: 'Varış sırasından bağımsız pencereHesapla, öğrenci lehine ve yarı açık pencereIcindeMi, pencereDurumu ve eski program penceresi yazılır; pencere.test.ts ve program.test.ts fast-check özellikleri ve sınır tablolarıyla denetler. Çapa hesabını kullanmaz, yalnız sözleşme ve tipler paketini bekler.'
  }),
  pk('05', 'S', 'Çekirdek girişi ve mutasyon eşiği', {
    files: [K + 'index.ts'],
    tests: ['Saat çekirdeği mutasyon testi'],
    dep: ['01', '02', '03', '04'],
    notes: 'packages/core/src/saat/index.ts çekirdeği tek girişten yeniden dışa verir ve packages/core/src/saat için en az yüzde 90 Stryker öldürme eşiği kurulur (haftalık iş D15 tarafındadır, eşik bu modülündür); kayma payını sıfırlayan, sınırı değiştiren ve sıralamayı ters çeviren mutantlar ölmelidir. Dışa verimler tanımlandıkları paketlerdedir ve packages/core için dış yüz kuralı yoktur: komşular ve sunucu dosyaları işlevi tanımlandığı dosyadan alır, bu yüzden bu paketi hiçbir paket beklemez.'
  }),
  pk('06', 'L', 'Saat tabloları ve pencere servisi', {
    files: [M + 'tablolar.ts', MIG + 'migration.sql', MIG + 'snapshot.json', M + 'pencere-servisi.ts', M + 'pencere-kilidi.ts', M + 'surum-damgasi.ts', F + 'pencere-plani.feature', ST + 'pencere-adimlari.ts'],
    tables: ['oturum_pencereleri', 'pencere_degisiklikleri', 'saat_esitleme_kesintileri'],
    exports: ['pencereleriHesapla', 'pencereGetir', 'pencereSonucu'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem', 'D02.dersGetir', 'D02.oturumGetir', 'D02.OturumUretimOlayi', 'D02.OTURUM_DURUMLARI', 'D06.surumDamgasiIste', 'D06.surumAl', 'D15.TestDunyasi'],
    tests: ['Oturum üretimi pencere açar', 'Bileşik yabancı anahtar dönemi korur', 'D02 olayındaki oturum baştan hesaplanır'],
    dep: ['01', '02', '04'],
    notes: 'Üç tablonun Drizzle tanımı ve göçü (bileşik yabancı anahtarlar, sözleşme sabitlerinden CHECK listeleri; göç klasörü oturumlar (D02) ve kisiler (D01) göçlerinden sonraki zaman damgasını taşır), pencere kilidi, sürüm damgası, pencereleriHesapla, pencereGetir ve FOR KEY SHARE ile okuyan pencereSonucu yazılır. D05, D07 ve D11\'in beklediği pencere dışa verimleri burada hazır olur; paket belge, eşitleme ve eklenti beklemez. pencere-plani.feature D15 test dünyasında atılabilir veritabanıyla denetler; pencere adımları sonraki paketlerin senaryolarınca da kullanılır, ama yalnız bu pakette yazılır: sonraki paketler kendi koduna bağlı adımları kendi adım dosyalarına yazar, aynı aşamadaki paketler ortak dosyaya dokunmaz.'
  }),
  pk('07', 'M', 'Eşitleme durumu, saat belgesi servisi ve dinleyici kayıtları', {
    files: [M + 'esitleme-durumu.ts', M + 'anahtarlar.ts', M + 'belge-servisi.ts', M + 'dinleyiciler.ts', F + 'saat-belgesi.feature', ST + 'belge-adimlari.ts'],
    exports: ['esitlemeSaglikliMi', 'saatBelgesiVer', 'saatBelgesiDogrula', 'oturumKapandiDinleyicisiKaydet', 'kesintiKapandiDinleyicisiKaydet', 'pencereDegistiDinleyicisiKaydet'],
    needs: ['D15.gizliAnahtar', 'D13.UygulamaHatasi', 'D12.Islem', 'D15.TestDunyasi'],
    tests: ['Eski kid doğrulanır, yabancı kid ve bozuk MAC reddedilir', 'Ele geçirilmiş anahtarla belge çapa kurmaz'],
    dep: ['01', '02', '03'],
    notes: 'Süreç içi eşitleme durumu (SAGLIKLI ve BOZUK, duvar saati sıçraması denetimi, bekleyen açılış anı, işçide SAAT_SUREC_YANLIS), saat belgesi anahtar halkası ve veritabanına dokunmayan saatBelgesiVer ile saatBelgesiDogrula yazılır; oturumKapandi, kesintiKapandi ve pencereDegisti kayıt defterleri (tek ad kuralı ve olay tipleri, veritabanına dokunmaz) da buradadır, böylece D07, D08 ve D11 kayıt işlevlerini pencere ve kesinti işlerinden önce alır. Durum okumayı kendi küçük tipiyle alır, D15 durum dosyasını okuyan denetim P08\'dedir; SAAT_SUREC_YANLIS D13 sözleşmesindeki UygulamaHatasi sınıfıyla kurulur, bu yüzden paket api dış yüzünü beklemez. saat-belgesi.feature kid, eski kid, bozuk MAC ve ele geçirilmiş anahtar senaryolarını servis düzeyinde saatSonucu ile birlikte denetler; uç senaryoları P10\'dadır.'
  }),
  pk('08', 'L', 'Eşitleme denetimi ve kesinti kaydı', {
    files: [M + 'kesinti-servisi.ts', M + 'kuyruklar.ts', J + 'saat-esitleme-denetimi.ts', F + 'esitleme-kesintisi.feature', ST + 'esitleme-adimlari.ts'],
    jobs: ['saat_esitleme_denetimi'],
    exports: ['kesintiAraliklari'],
    needs: ['D12.Islem', 'D12.islem', 'D14.isGonder', 'D14.KuyrukTanimi', 'D15.saatEsitlemeDurumu', 'D15.log', 'D15.TestDunyasi'],
    tests: ['Bozuk süreç varken kesinti kapanmaz', 'Tek süreçte kesinti sonraki sağlıklı okumada kapanır', 'Yazılamayan açılış kaybolmaz', 'Kesinti sonrası güvenilirlik bilgisi'],
    dep: ['01', '06', '07'],
    notes: 'kesintiAraliklari ve tek güvenilirlik formülü, LEAST ile açılan tek açık kesinti satırı, 15 saniye kuralıyla koşullu kapanış ve aynı işlemde yeniden değerlendirme işini kuyruğa koyma, iki kuyruk tanımı ve api sürecindeki 5 saniyelik denetim yazılır; denetim D15 durum dosyasını okuyup P07\'deki eşitleme durumunu günceller. esitleme-kesintisi.feature iki sahte API süreci ve sahte chrony dosyasıyla atılabilir veritabanında denetler; bileşik uygulama beklenmez.'
  }),
  pk('09', 'L', 'Ders içi pencere değişikliği', {
    files: [M + 'degisiklik-isleyicisi.ts', F + 'pencere-degisikligi.feature', F + 'eski-program.feature', ST + 'degisiklik-adimlari.ts'],
    needs: ['D12.Islem', 'D02.dersGetir', 'D02.dersYetkisi', 'D02.kilitDurumu', 'D02.birimDonemiGetir', 'D06.gondermeSuresiSonu', 'D09.denetimeYaz', 'D15.TestDunyasi'],
    tests: ['Taşınan oturumda önceki erken kapatma etkisiz', 'Erken kapatma basma anında kapatır', 'Ters sırada ulaşan değişiklikler', 'Aynı öğe iki kez', 'Yetki: sahip, önceki sahip, yönetici', 'Süre sınırları', 'Kilitten sonra ulaşan değişiklik yalnız saklanır', 'Deneme dersi ve takvimsiz birim', 'Çapası kurulamayan hoca işlemi'],
    dep: ['02', '03', '04', '06', '07'],
    notes: 'pencere_suresi ve erken_kapatma öğe işleyicisi (kimlik tekrarı, yetki, süre sınırı, kilit, çapa, geçmişe işlememe, denetim olayı, pencereDegisti dinleyicilerine aynı işlemde olay) yazılır. Senaryo adımları işleyicinin isle işlevini D06 öğe bağlamıyla doğrudan çağırır; D06 eklentisi, uçlar ve bileşik uygulama beklenmez. pencere-degisikligi ve eski-program senaryoları atılabilir veritabanında denetler.'
  }),
  pk('10', 'M', 'Saat uçları ve veri kurucusu', {
    files: [M + 'rotalar.ts', F + 'pencere-ucu.feature', ST + 'uc-adimlari.ts', 'apps/server/test/support/kurucular/saat.ts'],
    endpoints: ['POST /v1/saat/belge', 'GET /v1/saat/pencereler/{oturumId}'],
    needs: ['D12.Islem', 'D13.Kimlik', 'D13.uygulamaHatasi', 'D13.rotalariKaydet', 'D13.DenemeSecenekleri', 'D02.dersYetkisi', 'D15.saatEsitlemeDurumu', 'D15.TestDunyasi', 'D15.kurucuTanimla'],
    tests: ['Saat belgesi ucu', 'Belge ucu yalnız Bearer oturumuyla', 'Eşitleme bozukken belge verilmez', 'Belge servisi veritabanına dokunmaz', 'Belge ucu hız sınırı', 'Pencere ucu yetkisi'],
    dep: ['02', '04', '06', '07'],
    notes: 'Belge ve pencere uçlarının işleyicileri ile saat veri kurucusu (pencere ve değişiklik satırları; sonraki senaryolar da kullanır) yazılır. pencere-ucu.feature iki ucun HTTP senaryolarını (Bearer kimliği, hız sınırı, eşitleme bozukken 503 ve başlık, sorgu sayacı, pencere ucu yetkisi) D13 senaryo düzeneğinde rotaları rotalariKaydet ile bağlayarak denetler; değişiklik geçmişi kurucuyla kurulur, bu yüzden P09 ve bileşik uygulama beklenmez.'
  }),
  pk('11', 'M', 'Pencereler indirme kaynağı ve saklama işleyicisi', {
    files: [M + 'indirme-kaynagi.ts', F + 'pencere-indirme.feature', M + 'saklama.ts', F + 'saat-saklama.feature', ST + 'indirme-saklama-adimlari.ts'],
    needs: ['D12.Islem', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D15.TestDunyasi'],
    tests: ['Şube eklenen oturumun penceresi yeni şubeye iner', 'Pencereler indirmesinin kapsamı', 'Saklama sınıfı ve partisi', 'pencere_degisiklikleri yalnız eklenir'],
    dep: ['06'],
    notes: 'Şube ve sürüm süzgeçli pencereler indirme kaynağı ile saat.donem_verisi saklama partisi yazılır; ikisi de yalnız saat tablolarını okur ve eklentide kaydedilir. pencere-indirme.feature öğrenci ve hoca kapsamını, başka şubenin inmediğini ve şube eklenince yeniden damgalanan satırı; saat-saklama.feature saklama sınıfını, partiyi ve yoklama_api ile UPDATE ve DELETE izin hatasını atılabilir veritabanında denetler.'
  }),
  pk('12', 'M', 'Kapanış ve yeniden değerlendirme işleri', {
    files: [J + 'index.ts', J + 'oturum-pencere-kapat.ts', J + 'esitleme-sonrasi-yeniden-degerlendir.ts', F + 'pencere-kapatma.feature', ST + 'is-adimlari.ts'],
    jobs: ['oturum_pencere_kapat', 'esitleme_sonrasi_yeniden_degerlendir'],
    needs: ['D14.isTanimla', 'D14.isiCalistirVeBekle', 'D12.islem', 'D06.surumAl', 'D15.uyariAc', 'D15.log', 'D15.TestDunyasi'],
    tests: ['Kapanış işi tekrar güvenli ve now() kullanmaz', 'Uzatma kapanmış pencereyi yeniden açar', 'Bir dinleyici hatası öbür kapanışları durdurmaz', 'İş tanımları D14 kurallarına uyar'],
    dep: ['01', '06', '07', '08', '09'],
    notes: 'Dakikalık, partili ve satır başına geri dönüş noktalı oturum_pencere_kapat (son adımda bir kez surumAl), imleçli esitleme_sonrasi_yeniden_degerlendir ve isler dizisi yazılır; işler dinleyici kayıt defterini ve kuyruk tanımlarını kullanır, eklentiyi beklemez. pencere-kapatma.feature sahte saat, sahte dinleyici ve D14 iki kez çalıştırma yardımcısıyla denetler.'
  }),
  pk('13', 'M', 'Saat eklentisi ve dış yüz', {
    files: [M + 'eklenti.ts', M + 'index.ts', M + 'sozlesme.test.ts'],
    exports: ['saatEklentisi', 'SaatEklentisiSecenekleri'],
    needs: ['D02.oturumUretimDinleyicisiKaydet', 'D06.ogeTuruKaydet', 'D06.indirmeKaynagiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.testVeritabaniHazirla', 'D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D13.TUM_OGE_TURLERI', 'D13.uygulamaHatasi', 'D13.Kimlik', 'D09.denetimOlaylariniKaydet', 'D15.gizliAnahtar', 'D15.saatEsitlemeDurumu', 'D15.log'],
    tests: ['İstanbul çevirisi D02 SQL çevirisiyle aynı', 'Öğe işleyicisi D06 sözleşmesine uyar', 'Kod değerleri BÜYÜK_HARF ve genişleyen enum', 'Eklenti birleşim kurallarına uyar', 'Denetim olayları kayıtlı ve birimli'],
    dep: ['02', '06', '07', '08', '09', '10', '11'],
    notes: 'D02 üretim dinleyicisi, D06 öğe işleyicileri ve indirme kaynağı, D12 saklama işleyicisi ve rota kayıtlarını yapan saatEklentisi (eşitleme zamanlayıcısı yalnız api sürecinde, SAAT_ESITLEME_AYARI_GECERSIZ denetimi) ile modülün index.ts dış yüzü yazılır. Bileşim kökünün (D13 uygulamaKur) beklediği tek geç parçadır; servis dışa verimleri önceki paketlerde hazırdır. sozlesme.test.ts birleşim, öğe sözleşmesi, kod, denetim olayı ve İstanbul çevirisi kurallarını denetler.'
  }),
  pk('14', 'M', 'Bütünleşik kayıt saat kuralları', {
    files: [F + 'saat-kurallari-kayit.feature', ST + 'butunlesik-kayit-adimlari.ts'],
    needs: ['D13.uygulamaKur', 'D14.isiCalistirVeBekle', 'D15.TestDunyasi'],
    tests: ['Kayıt saat kuralları uçtan uca (@butunlesik)', 'Duvar saati sıçraması belgeyi hemen durdurur', 'Tek açık kesinti ve tek yeniden değerlendirme', 'Yeniden değerlendirme partili ve kaldığı yerden', 'Yeniden değerlendirme işi aynı veriyle iki kez', 'Komşu CHECK listeleri D04 sabitleriyle aynı'],
    dep: ['06', '07', '08', '10', '12'],
    notes: 'D05, D06 ve D07 bileşik uygulamada hazır olunca koşan uçtan uca kayıt senaryoları yazılır: kayıt saat kuralları, duvar saati sıçraması, tek kesinti ve tek yeniden değerlendirme, partili ve kaldığı yerden süren yeniden değerlendirme, aynı veriyle iki kez çalışan yeniden değerlendirme, komşu CHECK listeleri; @butunlesik etiketiyle uygulamaKur ile kurulan uygulamada denetlenir.'
  }),
  pk('15', 'M', 'Bütünleşik kilit, sürüm ve süreç senaryoları', {
    files: [F + 'pencere-kilidi.feature', ST + 'butunlesik-kilit-adimlari.ts'],
    needs: ['D13.uygulamaKur', 'D15.TestDunyasi'],
    tests: ['Öğrenci kaydı ile ders içi değişiklik yarışmaz', 'Sürüm işlemin son adımında', 'Dinleyiciler iki süreçte aynı', 'Hoca hesabı silinince değişiklik izi kalır', 'Ders çıkışı yükü'],
    dep: ['06', '07', '09', '10', '12'],
    notes: 'Bileşik uygulamada kayıt ile ders içi değişikliğin yarışmadığı, sayaç güncellemesinin işlemin son adımında bir kez olduğu, api ve işçi süreçlerinde dinleyici kayıtlarının aynı olduğu ve hoca hesabı silinince değişiklik izinin kaldığı senaryolar ile D15 ders çıkışı yük profilinin belge ucu eşikleri yazılır; @butunlesik etiketiyle uygulamaKur ile denetlenir.'
  })
];
const txt = JSON.stringify({ id: 'D04', packages }, null, 1) + '\n';
if (/[–—]/.test(txt)) { console.error('U+2013 or U+2014 found'); process.exit(1); }
fs.writeFileSync(path.join(D, 'packages', 'D04.json'), txt);
console.log('wrote', packages.length, 'packages');

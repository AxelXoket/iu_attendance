// Builds packages/D03.json for the shortened plan. Run: node uret.js
const fs = require('fs'), path = require('path');
const HEDEF = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend/packages/D03.json';
const M = 'apps/server/src/modules/listeler/';
const C = 'packages/core/src/listeler/';
const F = 'apps/server/test/features/listeler/';
const S = 'apps/server/test/steps/listeler/';
const p = (n, o) => ({ id: 'D03-P' + String(n).padStart(2, '0'), title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: [], exports: o.exports || [], needs: o.needs || [], tests: o.tests, depends_on: (o.dep || []).map(d => 'D03-P' + String(d).padStart(2, '0')), size: o.size, notes: o.notes });
const ornekler = ['uret.ts', 'utf8-bom-noktali-virgul.csv', 'utf8-virgul-tirnakli.csv', 'windows-1254-noktali-virgul.csv', 'utf16le-sekme.txt', 'esittir-tirnak-numara.csv', 'sayi-hucreli.xlsx', 'sifir-bicimli.xlsx', 'baslik-ustu-satirli.xlsx', 'ad-soyad-ayri.xlsx', 'ikinci-sayfada.xlsx', 'eski-ikili.xls', 'html-tablo.xls', 'parolali.xlsx', 'aksis-maskeli.xlsx'].map(f => C + 'ornekler/' + f);
const packages = [
  p(1, {
    title: 'Liste sözleşmesi', size: 'M',
    files: ['packages/contracts/src/listeler.ts'],
    needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.kimlikSemasi', 'D13.ogrenciNoSemasi', 'D13.sayfaSorgusuSemasi'],
    tests: ['İstek şemaları katıdır', 'Cevaplarda kod değerleri genişleyebilir'],
    notes: "Altı ucun rota tanımları, istek ve cevap şemaları, on LISTELER_ hata kodu, yedi denetim olayı şeması, gizli alan listesi, CHECK sabitleri ve SatirId, YuklemeId markaları packages/contracts/src/listeler.ts'te yazılır; D13'ün Vitest sözleşme testleri istek şemalarının katılığını ve cevaptaki genişleyen kod alanlarını denetler. Sunucu paketleri tipleri ve sabitleri buradan alır."
  }),
  p(2, {
    title: 'Ad eşleştirme, kova ve şube anahtarları', size: 'M',
    files: ['isim.ts', 'isim.test.ts', 'kova.ts', 'kova.test.ts', 'sube.ts', 'sube.test.ts'].map(f => C + f),
    exports: ['listeKovaAnahtari'],
    tests: ['Ad anahtarı iki kez uygulanınca değişmez', 'Ad eşleşmesi yansımalı ve simetrik', 'Türkçe büyük harf kendi küçüğüyle eşleşir, harf sadeleştirmesi yoktur', 'Kova numarası belirlenimci', 'Şube anahtarı yazım farkında aynı kalır'],
    notes: 'Türkçe ad anahtarı ve isimlerEslesir, kovaNo ile listeKovaAnahtari ve şube anahtarı hiçbir dış bağımlılığı olmayan saf işlevler olarak yazılır, D01 ve D09\'un beklediği kova anahtarı burada çıkar; fast-check özellik testleri ve Türkçe harf tablo testi doğrular.'
  }),
  p(3, {
    title: 'Üyelik aralığı ve liste farkı', size: 'L', dep: [2],
    files: ['aralik.ts', 'aralik.test.ts', 'fark.ts', 'fark.test.ts'].map(f => C + f),
    tests: ['Fark uygulanınca etkin küme dosyanın numara kümesine eşit olur', 'Fark hiçbir satırı silmez'],
    notes: 'Yarı açık üyelik aralığı ile kırpma ve mevcut satırlarla dosya satırlarından fark (ekleme, pasif, canlanma, kırpma, şube değişimi, ad ve sıra) saf işlevlerle hesaplanır; fark ad karşılaştırmasında P02\'nin isimlerEslesir işlevini çağırır. fast-check testleri etkin kümenin dosyaya eşitlendiğini, ikinci farkın boş olduğunu ve hiçbir satırın silinmediğini gösterir.'
  }),
  p(4, {
    title: 'Numara, satır denetimi ve fark özeti', size: 'M', dep: [2, 3],
    files: ['numara.ts', 'numara.test.ts', 'satir-denetimi.ts', 'satir-denetimi.test.ts', 'fark-ozeti.ts', 'fark-ozeti.test.ts'].map(f => C + f),
    tests: ['Fark özeti farkla birebir', 'Numara denetimi'],
    notes: 'Numara biçimi, satır bulguları (HATA, UYARI, BILGI: tekrar, şube uyuşmazlığı, sayı hücresi; ad ve şube karşılaştırması P02\'den) ve P03 farkının sıradan bağımsız 43 karakterlik özeti yazılır; numara ve fark özeti özellik testleriyle doğrulanır.'
  }),
  p(5, {
    title: 'Dosya türü, kodlama ve CSV', size: 'M',
    files: ['dosya-turu.ts', 'dosya-turu.test.ts', 'kodlama.ts', 'kodlama.test.ts', 'csv.ts', 'csv.test.ts'].map(f => C + f),
    tests: ['CSV yazılıp okununca aynı hücreler', 'Kodlama gidiş dönüşü'],
    notes: 'Panelin dosya okuma zincirinin alt katmanı olan dosya türü ve parola tanıma, UTF-8, UTF-16 ve windows-1254 çözümü ve RFC 4180 CSV ayrıştırması yazılır; kodlama ve CSV gidiş dönüş özellik testleriyle doğrulanır.'
  }),
  p(6, {
    title: 'Başlık sözlüğü ve örnek dosyalar', size: 'M',
    files: [C + 'baslik.ts', C + 'baslik.test.ts', ...ornekler],
    tests: ['Başlık anahtarı yazım farkında aynı kalır'],
    notes: 'Başlık sözlüğü ve kendi harf katlamalı başlık anahtarı (ad eşleştirmesinden bağımsız) ile örnek dosya üreticisi ve örnek dosyalar yazılır; üretici baytları okuyucunun kodlama ve CSV işlevlerini kullanmadan kendisi yazar ki örnek testi okuyucuyu kendi çıktısıyla onaylamasın. Başlık özellik testi doğrular; örneklerin okunması P07\'nin testidir.'
  }),
  p(7, {
    title: 'Dosya okuma ve core dizini', size: 'M', dep: [2, 3, 4, 5, 6],
    files: [C + 'okuma.ts', C + 'okuma.test.ts', C + 'index.ts'],
    tests: ['Örnek dosyalar okunur', 'Ortak kurallar mutasyon eşiği'],
    notes: 'Satırları numara ve ada eşleyen okuma işlevi (dosya türü, kodlama, CSV, başlık ve numara katmanlarının üstünde) ve bütün core listeler işlevlerini veren index.ts yazılır; dizini panel kullanır, sunucu yalnız gerektiği core dosyalarını (isim, kova, fark, fark özeti, satır denetimi, numara) doğrudan içe aktarır ve bu paketi beklemez. Örnek dosya testi ve D15\'in haftalık Stryker eşiği doğrular.'
  }),
  p(8, {
    title: 'Liste tabloları, göç, dinleyici defteri ve modül girişi', size: 'M', dep: [1],
    files: [M + 'tablolar.ts', M + 'dinleyiciler.ts', M + 'index.ts', 'apps/server/migrations/20261012090000_listeler_liste_tablolari/migration.sql', 'apps/server/migrations/20261012090000_listeler_liste_tablolari/snapshot.json'],
    tables: ['liste_satirlari', 'sube_listeleri', 'liste_yuklemeleri'],
    exports: ['listeDegisikligiDinleyicisiKaydet'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem'],
    tests: ['Göç adları ve türleri kurala uyar'],
    notes: "Üç tablonun Drizzle tanımı (CHECK listeleri P01 sabitlerinden), tek ileri göç klasörü, liste değişikliği defteri (ListeDegisikligi tipi, ESLESTIRME, KARAR, HESAP sırasıyla çağırma, aynı adın reddi) ve modülün index.ts'i yazılır; index.ts burada listeDegisikligiDinleyicisiKaydet ile açılır, P09, P10 ve P12 kendi dışa açma satırlarını ekler (bu paketler zincirde ardışıktır, aynı aşamaya düşmez). Defter tabloya dokunmaz, D01, D07 ve D08 eklentileri onu modülün geri kalanını beklemeden bağlar. D12'nin şema ve göç denetimi kısıt adlarını kisitAdi ile, CHECK listelerini sözleşme sabitleriyle karşılaştırır; defterin davranışı P13 ve P17 senaryolarında sınanır."
  }),
  p(9, {
    title: 'Kilit sırası ve okuma işlevleri', size: 'L', dep: [1, 2, 8],
    files: [M + 'kilitler.ts', M + 'sorgular.ts'],
    exports: ['listeSatirlari', 'satirGetir', 'uyelikDenetle', 'numaraIleEslestir', 'ogrencininEtkinSatirlari', 'ogrencininSatirlari'],
    needs: ['D12.Islem', 'D12.danismaKilidi', 'D12.danismaKilidiDene', 'D07.dogrulamaListeAnahtari', 'D02.subeGetir', 'D02.dersGetir', 'D02.dersSubeleri', 'D02.kilitDurumu'],
    tests: ["Modül sınırı: kilitler.ts dogrulamaListeAnahtari'nı packages/contracts/src/dogrulama.ts'ten alır, listeler D01, D07 ve D08 modüllerini içe aktarmaz"],
    notes: "Yazma kilit sırası ('dogrulama:liste' anahtarları, şube satırları, D02 paylaşımlı okuma, kova anahtarları) ile işlem başına kova kümesi ve altı okuma işlevi (uyelikDenetle'nin paylaşımlı kova anahtarlı yeniden okuması ve numaraIleEslestir dahil) yazılır, index.ts'e eklenir; core'dan yalnız isim.ts ve kova.ts doğrudan içe aktarılır, panelin dosya okuma zinciri beklenmez. Kilit alınamazsa kilitler.ts fırlatmaz, MESGUL sonucu döner; 503 LISTELER_MESGUL'a P12'deki rotalar.ts çevirir, bu yüzden paket D13 api dış yüzünü beklemez. D07, D01, D05, D08, D09 ve D10'un beklediği okuma dış yüzü burada çıkar; davranışı P13, P14, P15 ve P18 senaryoları sınar."
  }),
  p(10, {
    title: 'Yazma servisi, deneme listesi ve denetim yazıcısı', size: 'L', dep: [1, 3, 4, 8, 9],
    files: [M + 'servis.ts', M + 'deneme.ts', M + 'denetim-olaylari.ts'],
    exports: ['muafIsaretle', 'denemeListesiniKur'],
    needs: ['D02.subeGetir', 'D02.dersGetir', 'D02.kilitDurumu', 'D02.oturumlariGetir', 'D02.OTURUM_DURUMLARI', 'D02.OTURUM_TURLERI', 'D02.IPTAL_NEDENLERI', 'D06.surumAl', 'D09.denetimeYaz', 'D12.Islem'],
    tests: ['Modül sınırı: servis.ts, deneme.ts ve denetim-olaylari.ts yalnız D02, D06 ve D09 dış yüzlerini, D12 dış yüzünü ve sözleşmeyi içe aktarır, uç katmanına bağlı değildir'],
    notes: "Önizleme, uygulama, elle ekleme, satır düzenleme ve muafIsaretle servisi, denemeListesiniKur ve denetim olayı yazıcısı (D09.denetimeYaz) yazılır, index.ts'e eklenir. Fark, fark özeti, satır denetimi ve numara core'un kendi dosyalarından doğrudan alınır. Servis beklenen retleri (onay, sürüm, kilit, sınır, meşgul) LISTELER_ kodlu sonuç birliği olarak döner, muafIsaretle gibi fırlatmaz; HTTP hatasına P12'deki rotalar.ts çevirir. Böylece D08'in muaf ucu ve D01'in inceleme hesapları işi rota ve eklenti katmanını beklemez. Davranışı P13, P14 ve P16 senaryoları sınar."
  }),
  p(11, {
    title: 'Liste ve indirme kaynakları, saklama işleyicisi', size: 'M', dep: [1, 8],
    files: [M + 'liste-kaynagi.ts', M + 'indirme-kaynagi.ts', M + 'kapsam-kaynagi.ts', M + 'saklama.ts'],
    needs: ['D12.Islem', 'D02.subeGetir', 'D02.dersGetir'],
    tests: ["Modül sınırı: saklama.ts hiçbir modülün index.ts'ini içe aktarmaz"],
    notes: "D02 liste kaynağının etkinSatirlar işlevi, D06'nın iki indirme kaynağı (liste_satirlari ve ogrenci_liste_kapsami; kapsam dersleri ve birimleri D02.subeGetir ve dersGetir'den) ve saklama partiIsle ile kilit adımı calistir işlevleri yazılır. Kaynak ve işleyici tipleri packages/contracts'tan (esitleme.ts, dersler.ts, veritabani.ts) gelir; kayıt çağrılarının hepsi P12'deki eklenti.ts'tedir. Davranışı P15, P16 ve P17 senaryoları sınar."
  }),
  p(12, {
    title: 'Uçlar ve eklenti', size: 'M', dep: [1, 8, 9, 10, 11],
    files: [M + 'rotalar.ts', M + 'eklenti.ts', 'apps/server/src/jobs/listeler/index.ts'],
    endpoints: ['GET /v1/listeler/subeler/{subeId}', 'POST /v1/listeler/subeler/{subeId}/onizleme', 'POST /v1/listeler/subeler/{subeId}/uygula', 'POST /v1/listeler/subeler/{subeId}/satirlar', 'PATCH /v1/listeler/satirlar/{satirId}', 'GET /v1/listeler/subeler/{subeId}/yuklemeler'],
    exports: ['listelerEklentisi'],
    needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D13.uygulamaHatasi', 'D02.dersYetkisi', 'D02.listeKaynagiKaydet', 'D02.kilitAdimiKaydet', 'D06.indirmeKaynagiKaydet', 'D09.denetimOlaylariniKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.islem', 'D04.simdi'],
    tests: ['Rota listesi altı uçtan oluşur', 'Modül sınırı'],
    notes: "Altı uç (dersYetkisi denetimi, servis sonuç birliğinin uygulamaHatasi ile LISTELER_ koduna çevrilmesi), listelerEklentisi (D02 liste kaynağı ve kilit adımı, D06 iki indirme kaynağı, D09 denetim olay türleri, D12 saklama işleyicisi kayıtları ve defterin örneğe bağlanması) ve boş iş listesi yazılır, index.ts'e eklenir. Altı ucun sözleşmedeki rota listesiyle birebir kaydı D13'ün rota tablosu denetimiyle, modül sınırı Biome ve dependency-cruiser ile doğrulanır."
  }),
  p(13, {
    title: 'Liste kurucusu, ortak adımlar ve yükleme senaryoları', size: 'L', dep: [10, 12],
    files: ['apps/server/test/support/kurucular/listeler.ts', S + 'liste-adimlari.ts', F + 'liste-yukleme.feature'],
    needs: ['D15.TestDunyasi', 'D15.kurucuTanimla'],
    tests: ['İlk yükleme önizlenir ve uygulanır', 'Aynı dosya ikinci kez uygulanırsa yazma olmaz', 'Önizlemeden sonra fark değişirse uygula reddedilir', 'Dosyada olmayan öğrenci pasif olur, silinmez', 'Boş şubeye başka şubenin dosyası onaysız uygulanmaz', 'Hatalı satırlı dosya uygulanamaz', 'Sayı olarak saklanmış numara işaretlenir', 'Aynı numara iki kez', 'Şube sütunlu dosyada yalnız seçilen şubenin satırları girer', 'Öğrenci aynı dersin başka şubesine geçer', 'Yeni yükleme muafı ve geç kayıt seçimini korur', 'Ad farkı eşleştirme kuralına göre ayrılır', 'Hata önceliği', 'Numara ve ad loga, adres satırına ve denetime düşmez'],
    notes: "Liste kurucusu (listeleri servisle kurar, kurucuTanimla ile kaydolur; D07, D08 ve D09 senaryoları da kullanır), uç, işlev ve satır durumu adımları ve bütün D03 senaryolarına bağlanan numara ve ad sızıntısı kancası yazılır. Yükleme senaryoları modül dünyasında (listeler eklentisi ve D12 test veritabanı, bileşim kökü yok) koşar; ESLESTIRME dinleyicisi adımın kaydettiği kaydedici dinleyicidir. Önizleme, eş güçlü uygulama, onaylar, şube değişimi, ad farkı ve hata önceliği yeşil olur."
  }),
  p(14, {
    title: 'Satır, yetki ve kilit senaryoları', size: 'L', dep: [13],
    files: [S + 'yaris-adimlari.ts', F + 'liste-satirlari.feature', F + 'liste-yetki-ve-kilit.feature'],
    needs: ['D15.TestDunyasi', 'D12.danismaKilidi', 'D07.dogrulamaListeAnahtari'],
    tests: ['Her geçiş kendi denetim olayını yazar', 'Geç kayıt seçimi dersteki bütün satırlara yazılır', 'Elle ekleme sona ekler', 'Geç eklenen öğrencide seçim', 'Yükleme geçmişi sayfalı ve kişisel veri taşımaz', 'Pasif satırlar sayfalı döner', 'Satır sınırları', 'Başka şubede etkin öğrenciyi elle eklemek onay ister', 'Kilitten sonra liste salt okunur', 'Başka hocanın listesi görünmez', 'Kilit beklemesi aşılırsa uç meşgul döner', "Liste yazması dogrulama:liste anahtarlarını önce alır"],
    notes: "Çok bağlantılı yarış adımları (ikinci bağlantıda satır ve danışma anahtarı tutma, pg_locks bekleme denetimi) ile elle ekleme, PATCH, geç kayıt seçimi, sayfalı GET, satır sınırları, başka hocanın listesi, dönem kilidi, kilit beklemesi ve 'dogrulama:liste' sırası senaryoları modül dünyasında yeşil olur. Bu paket ve P13 on LISTELER_ kodunun hepsini döndürür; kapsama P19'da denetlenir."
  }),
  p(15, {
    title: 'Eşleme ve indirme senaryoları', size: 'L', dep: [13],
    files: [S + 'esleme-adimlari.ts', F + 'liste-esleme.feature', F + 'liste-indirme.feature'],
    needs: ['D15.TestDunyasi'],
    tests: ['Üyelik yarı açık aralıkla cevaplanır', 'Satırların üyelik aralıkları kesişmez', 'Numara ile eşleştirme', 'Öğrencinin bütün satırları', 'Hocaya şubenin bütün satırları, öğrenciye yalnız kendi satırı iner', 'Teyitsiz öğrenciye ad inmez', 'İndirme kaynağı sayfa kesmeye uyar', 'Öğrenci kapsamı yalnız üyelik değişince yenilenir', 'Değişen her satır işlemin tek sürümünü alır', 'Sürüm son adım mutasyonu'],
    notes: "Dış yüz işlevlerini ve D06'nın kaynak sözleşme yardımcısını (D06'nın test desteği, eklentinin kaydettiği kaynaklarla) çağıran adımlarla üyelik, eşleme, aralık kesişmezliği, telefon indirme, öğrenci kapsamı ve tek sürüm senaryoları modül dünyasında yeşil olur; sürüm sırası mutasyonu tek sürüm senaryosunu kırmızıya döndürür."
  }),
  p(16, {
    title: 'Saklama ve deneme listesi senaryoları', size: 'M', dep: [13],
    files: [F + 'liste-saklama.feature', F + 'liste-deneme.feature'],
    needs: ['D15.TestDunyasi', 'D12.saklamaIsleyicisiniCalistir', 'D02.isler', 'D02.denemeDersiniKur', 'D09.denetimeYaz'],
    tests: ['Saklama işleyicisi süresi dolan birim dönemini anonimleştirir', 'Kilit adımı saklama damgasını yazar', 'Saklama damgası mutasyonu', 'Deneme listesi kurulur', 'Denetim olayları kayıtlı ve birim taşır'],
    notes: "Saklama anonimleştirmesi D12.saklamaIsleyicisiniCalistir ile gerçek rolle, kilit damgası D02'nin donem_kilidi işiyle, deneme listesi D02.denemeDersiniKur'un açtığı şubede, denetim olay türleri ve birim alanı D09.denetimeYaz ile modül dünyasında sınanır; bileşim kökünü beklemez. Saklama damgası mutasyonu iki saklama senaryosunu kırmızıya döndürür."
  }),
  p(17, {
    title: 'Açılış, dinleyici zinciri ve modüller arası senaryolar', size: 'L', dep: [13, 15],
    files: [F + 'liste-acilis.feature'],
    needs: ['D15.TestDunyasi', 'D13.uygulamaKur'],
    tests: ['Liste kaynağı ve kayıtlar açılışta hazır', 'Dinleyiciler basamak sırasıyla ve aynı işlemde çağrılır', 'Yanlış dosya onaysız uygulanmaz, doğru dosya kaybı geri getirir', 'Yanlış şubeye yüklenen dosya düzeltilince oturumlar karışmaz', 'Geçmiş dönemin satırı eşleşmeye ve yetkiye girmez', 'PATCH gövdesi muaf alanını kabul etmez', 'Kırpma mutasyonu'],
    notes: "Uygulamanın bütün olarak kurulmasını gerektiren senaryolar: API ve işçi kurulumundaki altı kayıt, D01, D07 ve D08 dinleyicileriyle aynı işlemdeki zincir, KARAR dinleyicisiyle doğru dosyanın kaybı geri getirmesi, D08'in T hesabıyla yanlış şube düzeltmesi, D09 teyit ucunda geçmiş dönem ve D08 muaf ucuyla PATCH ayrımı uygulamaKur'un kurduğu dünyada yeşil olur; kırpma mutasyonu bu paketin ve P15'in aralık senaryolarını kırmızıya döndürür."
  }),
  p(18, {
    title: 'Eşzamanlılık senaryoları', size: 'M', dep: [13, 14, 15],
    files: [F + 'liste-yarislar.feature'],
    needs: ['D15.TestDunyasi', 'D13.uygulamaKur'],
    tests: ['Bekleyen kayıt liste uygulanınca eşleşir', 'Gönderim ile canlanma yarışı ret bırakmaz', 'Kayıt ile liste aynı anda kilitlenme kurmaz', 'Şube pasifleştirme ile uygula yarışmaz', 'muafIsaretle beklenen durumda fırlatmaz', 'Danışma kilidi mutasyonu'],
    notes: "D01 bekleyen kaydı, D07 gönderimi, D08 muaf ucu ve D02 şube pasifleştirmesiyle yarışlar P14'ün çok bağlantılı adımlarıyla bütün uygulamada pg_locks üzerinden sınanır; danışma kilidi mutasyonu iki yarış senaryosunu ve P14'teki 'dogrulama:liste' senaryosunu kırmızıya döndürür."
  }),
  p(19, {
    title: 'Yük testi ve hata kodu kapsaması', size: 'M', dep: [12, 13, 14],
    files: [F + 'liste-yuk.k6.js'],
    needs: ['D13.uygulamaKur'],
    tests: ['Her LISTELER_ kodu en az bir senaryoda döner', 'Liste uçlarının süre bütçesi', 'Dönem başı yoğunluğu'],
    notes: "k6 betiği kurulmuş sunucuda liste uçlarının süre bütçesini ve öğrenci kayıtlarıyla birlikte dönem başı yoğunluğunu ölçer; D13'ün kapsama testi on LISTELER_ kodunun her birinin P13 ve P14 senaryolarında gerçekten döndüğünü doğrular. Bileşim kökünden sonra gelen tek ve son pakettir, başka senaryo paketi onu beklemez."
  })
];
const out = { id: 'D03', packages };
const txt = JSON.stringify(out, null, 2) + '\n';
if (/[\u2013\u2014]/.test(txt)) { console.error('forbidden dash'); process.exit(1); }
fs.writeFileSync(HEDEF, txt);
console.log('wrote', packages.length, 'packages');

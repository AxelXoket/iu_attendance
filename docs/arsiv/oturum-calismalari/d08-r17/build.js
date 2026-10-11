// Builds the new packages/D08.json from the saved original (core packages reused verbatim).
// node build.js <D08.before.json> <out D08.json>
const fs = require('fs');
const [, , beforePath, outPath] = process.argv;
const old = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const o = id => old.packages.find(p => p.id === id);
const pkg = (id, size, title, files, extra, tests, depends_on, needs, notes) => ({
  id, title, files, tables: extra.tables || [], endpoints: extra.endpoints || [], jobs: extra.jobs || [],
  exports: extra.exports || [], needs, tests, depends_on, size, notes });
const S = 'apps/server/src/modules/devam/', F = 'apps/server/test/features/devam/', T = 'apps/server/test/steps/devam/';
const core = (oldId, newId, deps) => ({ ...o(oldId), id: newId, depends_on: deps });
const P = [];
P.push(core('D08-P01', 'D08-P01', []));
P.push(core('D08-P03', 'D08-P02', ['D08-P01']));
P.push(core('D08-P04', 'D08-P03', ['D08-P01']));
P.push(core('D08-P05', 'D08-P04', ['D08-P01', 'D08-P03']));
P.push(core('D08-P06', 'D08-P05', ['D08-P02', 'D08-P03', 'D08-P04']));
P.push(pkg('D08-P06', 'L', 'Devam sözleşmesi, dört tablo ve göç',
  ['packages/contracts/src/devam.ts', S + 'tablolar.ts',
    'apps/server/migrations/20261010120000_devam_tablolari/migration.sql',
    'apps/server/migrations/20261010120000_devam_tablolari/snapshot.json'],
  { tables: ['devam_sonuclari', 'devam_durumlari', 'devam_seviye_gecmisi', 'oturum_son_durumlari'],
    exports: ['DEVAM_NEDENLERI', 'DEVAM_SON_DURUMLARI', 'DEVAM_DENETIM_OLAYLARI'] },
  ['DEVAM_SON_DURUMLARI ve CHECK listeleri sözleşme sabitleriyle aynı'],
  [],
  ['D09.SON_DURUMLAR', 'D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.kimlikSemasi',
    'D13.ogrenciNoSemasi', 'D13.anSemasi', 'D13.gunSemasi', 'D12.tabloYardimcilari', 'D12.kisitAdi'],
  "packages/contracts/src/devam.ts başka modüllerin beklediği DEVAM_NEDENLERI, DEVAM_TETIKLEYEN_TURLERI, DEVAM_FARK_TURLERI, DEVAM_SON_DURUMLARI (D09.SON_DURUMLAR içe aktarılarak) ve DEVAM_DENETIM_OLAYLARI sabitlerini, üç rota tanımını ve DEVAM_ hata kodlarını verir; dört tablo CHECK kısıtları, durumKisiti listeleri ve @yalniz-ekleme yorumuyla tek göçte kurulur. Sabitler iş kuyruğunu beklemez: D14.isGonder'e bağlı yaprak D08-P07'dedir, böylece D02, D05 ve D10 sabitleri sözleşme araçları biter bitmez alır. Tablolar CHECK listelerini bu sabitlerden içe aktardığı için aynı pakettedir; ayrılsalar hesap işi yaprağı bir aşama geç kalırdı. Test: D12 şema testi CHECK listelerini durumKisiti kaydından okuyup sabitlerle karşılaştırır; DEVAM_SON_DURUMLARI kodları SON_DURUMLAR artı MUAF'tır."));
P.push(pkg('D08-P07', 'S', 'Hesap işi yaprağı',
  [S + 'yaprak.ts', F + 'sozlesme.feature'],
  { exports: ['devamHesaplaIsiKoy'] },
  ['Veritabanı kısıtları kuralı korur', 'Geri dönüş noktasında iş kaybolmaz'],
  ['D08-P06'],
  ['D14.isGonder', 'D14.KuyrukTanimi', 'D14.kuyruktakiIsler'],
  "yaprak.ts devamHesaplaKuyrugu tanımını ve devamHesaplaIsiKoy işlevini yazar, yalnız infra/is-kuyrugu ve sözleşmeyi içe aktarır. Paket yalnız sözleşmeyi ve D14.isGonder'i bekler; dinleyiciler, hesap, uçlar ve işler burada değildir, böylece D02, D05 ve D09 yalnız bu yaprağı bekler. sozlesme.feature D12 şema adımlarıyla hak formülüne, saat toplamına, seviye tabanına ve muaf kararına aykırı yazımın kısıt adıyla reddedildiğini, D14.kuyruktakiIsler okumasıyla da geri dönüş noktasına dönülüp yeniden çağrılınca kuyrukta tam bir iş kaldığını denetler; iki işin işçide birleşmesi D08-P17'deki Parti işleyicisi testindedir."));
P.push(pkg('D08-P08', 'L', 'Saklanan durumun okumaları, dinleyiciler ve saklama işleyicisi',
  [S + 'indirme.ts', S + 'dinleyiciler.ts', S + 'saklama.ts', F + 'saklama.feature'],
  {},
  ['Saklama'],
  ['D08-P06', 'D08-P07'],
  ['D01.ogrenciHesabiGetir', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir'],
  "indirme.ts D06 öğrenci indirme kaynağını (teyitli hesaba yalnız verilen sürümden sonra değişen ders satırları, pasif ders silindi satırı) ve ogrenciDevamDurumu okumasını (kişi kimliği D01.ogrenciHesabiGetir ile numaraya) yazar; dinleyiciler.ts D02 oturum üretimi, D03 liste değişikliği ve D04 oturum kapanışı dinleyicilerini (devamHesaplaIsiKoy ile) ve kilit adımını (devam_sonuclari.kilit_ani yazımı ve KILIT işi) yazar, kayıtlarını eklenti yapar; saklama.ts devam.donem_verisi işleyicisini yazar. Üçü hesabı beklemez; böylece eklenti ve dış yüz canlı hesabın hemen arkasından kurulur. saklama.feature işleyiciyi D12.saklamaIsleyicisiKaydet ile kendisi kaydedip kilit adımıyla damgalanan satırlarda D12.saklamaIsleyicisiniCalistir ile kilit anına göre parti parti silmeyi, CASCADE'i, sınırdan 1 ms sonraki ve boş satırın kalmasını ve yoklama_isci'nin geçmiş tablosunda 42501 almasını denetler; indirme senaryoları iş çalıştırdığı için D08-P16'dadır."));
P.push({ ...o('D08-P07'), id: 'D08-P09', title: 'Canlı hesap: girdiler ve hesap', exports: [],
  needs: [...o('D08-P07').needs, 'D12.islem', 'D15.TestDunyasi'], depends_on: ['D08-P05', 'D08-P06'],
  notes: "girdiler.ts dersin bütün girdilerini öğrenci sayısından bağımsız toplu okumalarla yükler; hesap.ts çekirdekle repeatable read denetimli canlı dersSonuclari, oturumSonDurumlari ve sonucuDegistirebilirMi işlevlerini kurar. Bu işlevler başka modüllere index.ts dış yüzüyle D08-P10'da açılır (ortak kural: modülün tek girişi index.ts'tir). Hesap iş kuyruğunu, yaprağı ve saklanan tabloları beklemez; yalnız sözleşmeyi ve çekirdeği bekler. hesap.steps.ts modülün ortak kurgu ve okuma adımlarını verir, işlemi D12.islem ile repeatable read açar; donem-sonu.feature bağlantı nedenini, cevapsız oturumu ve kilitte donan kararları denetler." });
P.push(pkg('D08-P10', 'L', 'Uçlar, eklenti ve dış yüz',
  [S + 'uclar.ts', S + 'yetki.ts', S + 'eklenti.ts', S + 'index.ts', F + 'eklenti.feature'],
  { endpoints: ['GET /v1/devam/dersler/{dersId}/karar-bekleyenler', 'PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf', 'PUT /v1/devam/yonetim/dersler/{dersId}/oranlar'],
    exports: ['dersSonuclari', 'oturumSonDurumlari', 'sonucuDegistirebilirMi', 'ogrenciDevamDurumu', 'devamEklentisi'] },
  ['Eklenti kaydı'],
  ['D08-P06', 'D08-P07', 'D08-P08', 'D08-P09'],
  ['D01.yetkiDenetle', 'D02.dersYetkisi', 'D02.dersGetir', 'D02.oranlariYaz', 'D03.satirGetir', 'D03.muafIsaretle',
    'D09.denetimeYaz', 'D12.islem', 'D13.uygulamaHatasi', 'D13.istekKimligi',
    'D02.oturumUretimDinleyicisiKaydet', 'D02.kilitAdimiKaydet', 'D03.listeDegisikligiDinleyicisiKaydet',
    'D04.oturumKapandiDinleyicisiKaydet', 'D06.indirmeKaynagiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D13.rotalariKaydet'],
  "Üç uç kaynak yetkisi, D03 ve D02 sonuç birliklerinin DEVAM_ kodlarına çevrilmesi, denetim olayı ve aynı işlemde kuyruğa giren hesap işiyle yazılır; devamEklentisi yaprak saatini, dinleyicileri, kilit adımını, indirme kaynağını, saklama işleyicisini ve rotaları veritabanına dokunmadan kaydeder; index.ts dersSonuclari, oturumSonDurumlari, sonucuDegistirebilirMi, ogrenciDevamDurumu ve devamEklentisi'ni dışa açar. Başka modüller bu adları index.ts'ten içe aktardığı için (D09 ve D10 dahil) hepsi bu paketle açılır; uçlar dosyası da burada olduğundan paket canlı hesabın bir aşama arkasındadır, iş paketlerini ve senaryoları beklemez. eklenti.feature sorgu sayacının 0 kalmasını, zamanlayıcı kurulmamasını, kayıtları, üç rotayı, setErrorHandler kullanılmamasını ve bilinmeyen satır ile öğrenci rolü zarflarını denetler; uç senaryoları D08-P12 ve D08-P15'tedir."));
P.push({ ...o('D08-P08'), id: 'D08-P11', title: 'Saklanan durumun yazımı ve seviye geçmişi', exports: [],
  needs: ['D06.ogrenciDurumuDegisti', 'D15.TestDunyasi'], depends_on: ['D08-P05', 'D08-P06', 'D08-P09'],
  notes: "Hesap sonucunu saklananla karşılaştırıp değişen satırları kanonik öğrenci sırasıyla yazan, gösterilen seviyeyi geri gitmez kuralıyla tutan, geçmişe etken ve neden ekleyen, durum sürümünü D06'dan alan yazım kurulur; yazım hesap sonucunu çekirdek tipleriyle alır, ogrenciDevamDurumu okuması D08-P08'dedir. seviye.feature sinir.steps.ts adımlarıyla (hesap ve yazım doğrudan çağrılır, iş kuyruğu gerekmez) Beklemede, İncelemede, telafi, sonraki oturum, kendi beyanı reddi, kilitten sonraki kayıt ve sahte saat davranışlarını denetler." });
P.push(pkg('D08-P12', 'M', 'Karar bekleyenler ve canlı okuma senaryoları',
  [T + 'uclar.steps.ts', F + 'karar-bekleyenler.feature'],
  {},
  ['Karar bekleyenler ucu', 'Canlı hesap süresi', 'Yalıtım denetimi'],
  ['D08-P09', 'D08-P10'],
  ['D15.TestDunyasi'],
  "uclar.steps.ts üç ucun istek ve cevap adımlarını verir (muaf ve oran senaryoları da kullanır); karar-bekleyenler.feature son ders gününden önce boş listeyi, BAGLANTI_YOK nedenini ve çevirecek oturumu, kilitten sonra nedenin düşmesini, başka hocanın dersinde 404 DEVAM_BULUNAMADI'yı, agir hız sınıfını, READ COMMITTED işlemde DevamYalitimHatasi'nı, salt okunur repeatable read cevabını ve 300 öğrencide 1 saniyelik p95 ile sabit sorgu sayısını denetler. Canlı okumalar iş çalıştırmadığı için paket iş işleyicisini beklemez."));
P.push({ ...o('D08-P09'), id: 'D08-P13', title: 'devam_hesapla parti işleyicisi',
  needs: ['D02.dersGetir', 'D12.islem', 'D12.danismaKilidi', 'D09.sonDurumOnceligi', 'D14.PartiIsi', 'D14.PartiBaglami', 'D14.kuyruktakiIsler', 'D15.log', 'D15.TestDunyasi'],
  depends_on: ['D08-P09', 'D08-P11'],
  notes: "Partiyi derse göre gruplayan, aynı (ders, öğrenci) işlerini birleştiren, her grubu devam:hesap:<dersId> kilidiyle ayrı işlemde hesaplayıp yazan, deneme dersini atlayan ve başarısız grubu yalnız kendi işleriyle düşüren işleyici yazılır; isler.steps.ts kuyruktaki devam işlerini (D14.kuyruktakiIsler) işleyiciyi doğrudan çağırarak işleyen adımı verir, uç ve indirme senaryoları bu adımı kullanır. hesap.feature D09.sonDurumOnceligi içe aktarılarak oturum satırını, devam.saat_tutarsiz artı kontrolünü ve kilit ile yazım sırasını denetler." });
P.push({ ...o('D08-P14'), id: 'D08-P14', title: 'Bağımsız kahin ve örnek ders kurucusu',
  tests: ['Bağımsız kahin', 'Eşik ve kural mutasyonları'],
  needs: ['D15.kurucuTanimla', 'D15.TestDunyasi'], depends_on: ['D08-P05', 'D08-P09', 'D08-P11'],
  notes: "Çekirdeği ve D09 işlevini içe aktarmayan başvuru hesabı ile ekle-bırak, Md.9/4, karma oturum, düzeltme, muaf, telafi ve kilit örnek derslerini kuran ve D15.kurucuTanimla ile kaydolan devam kurucusu yazılır; kahin.feature dersSonuclari ile birebir eşitliği ve md5 ile geri yazılan eşik ve kural mutasyonlarının çekirdek, donem-sonu ve seviye testlerinde kırmızısını denetler. Kahin eklentiyi ve işleri beklemez; ders çıkışı yükü D08-P17'dedir." });
P.push(pkg('D08-P15', 'M', 'Muaf ve oran senaryoları',
  [F + 'muaf.feature', F + 'oranlar.feature'],
  {},
  ['Muaf ucu', 'Muaf şube değişiminde kalır', 'Oran ucu', 'Denetim olayları', 'Sözleşme: rota listesi ve kodlar'],
  ['D08-P10', 'D08-P12', 'D08-P13'],
  ['D09.denetimOlaylariniKaydet'],
  "muaf.feature ve oranlar.feature uclar.steps.ts adımlarıyla 404, 409 ve 403 kodlarını, eş güçlülüğü, D03 sonuç birliğinin sahte saat ve kurucuyla zorlanan kodlarını, şube değişiminde muafın kalmasını ve iş sonrası sonucu (isler.steps.ts işleyici adımı) denetler; denetim olayları D09.denetimOlaylariniKaydet ile kaydedilip birimId, donemId ve listeSatiriId taşır. Sözleşme testi üç rotanın beyanını, OpenAPI x-extensible-enum alanlarını ve dört DEVAM_ kodunun her birinin bir senaryoda döndüğünü bu iki dosya ile karar bekleyenler senaryosu üstünden denetler."));
P.push(pkg('D08-P16', 'M', 'İndirme ve deneme dersi senaryoları',
  [F + 'indirme.feature'],
  {},
  ['Aynı numaranın iki hesabı', 'Öğrenci bölümü yalnız değişen dersler', 'Öğrenci bölümü yalnız teyitli hesaba', 'Deneme dersi hesaplanmaz'],
  ['D08-P08', 'D08-P09', 'D08-P10', 'D08-P13'],
  [],
  "indirme.feature hesap.steps.ts ve isler.steps.ts adımlarıyla tam ve kısmi bölümü, teyitsiz hesabın boş bölümünü, aynı numaranın iki hesabını, pasif dersin silindi satırını, EXPLAIN'de sıralı tarama olmamasını ve deneme dersinin satır yazmadan atlanıp inceleme hesabının indirmesinde devam bölümü taşımamasını denetler; kaynak ve dinleyiciler eklentiyle kaydolduğu için paket D08-P10'u bekler."));
P.push(pkg('D08-P17', 'M', 'Gece tutarlılık denetimi ve iş tanımları',
  [S + 'kuyruklar.ts', 'apps/server/src/jobs/devam/tutarlilik-denetimi.ts', 'apps/server/src/jobs/devam/index.ts', F + 'tutarlilik.feature'],
  { jobs: ['devam_hesapla', 'devam_tutarlilik_denetimi'] },
  ['Kayıt gelince seviye işle güncellenir', 'Aynı durumda ikinci çalışma hiçbir şey yazmaz', 'Canlı hesap bekleyen işe bağlı değil',
    'Gece tutarlılık denetimi', 'dersSonuclari D10 sözleşmesi', 'Parti işleyicisi'],
  ['D08-P09', 'D08-P11', 'D08-P13'],
  ['D02.denetlenecekDersler', 'D12.islem', 'D12.danismaKilidi', 'D14.isTanimla', 'D14.isiCalistirVeBekle', 'D14.kuyruktakiIsler', 'D14.isSagligi', 'D15.log'],
  "devamTutarlilikKuyrugu, her dersi devam:hesap kilidiyle sıfırdan hesaplayıp farkları DEVAM_FARK_TURLERI ile sayan ve düzelten gece işi ve iki işin isTanimla tanımları (parti 50 ve 2, cron 35 5 * * *) yazılır; tutarlilik.feature D14 kuyruk adımlarıyla (isiCalistirVeBekle, kuyruktakiIsler, isSagligi) aynı işlemde kuyruğa girmeyi, ikinci çalışmanın yazmamasını, canlı ile saklananın eşitliğini, bozulan satırın sayılmasını, ölü kuyruktaki dersin EKSIK_SATIR sayılmasını, partinin 50 ve 2 ile alınmasını ve iş bittikten sonra dersSonuclari'nin saklananla aynı kalmasını denetler. Paket eklentiyi beklemez; uç ve indirme senaryoları iş işleyicisini doğrudan çağırdığı için bu paketi beklemez."));
P.push(pkg('D08-P18', 'M', 'Gizlilik, modül sınırı ve ders çıkışı yükü',
  [F + 'gizlilik.feature'],
  {},
  ['İş verisi ve loglarda kişisel veri yok', 'Modül sınırı', 'Ders çıkışı yükü'],
  ['D08-P10', 'D08-P14', 'D08-P17'],
  ['D14.kuyruktakiIsler', 'D15.log'],
  "Modülün son doğrulama paketi: gizlilik.feature devam_hesapla ve devam_tutarlilik_denetimi işlerinin pg-boss verisinde (D14.kuyruktakiIsler) ve loglarında öğrenci numarası ve isim olmadığını, bilerek numara içeren log çağrısının D15 gizleme süzgecine takıldığını denetler; D13'ün sınır testi bütün D08 dosyaları yazıldıktan sonra burada sıfır ihlalle ve md5 ile geri yazılan iki artı kontrolle koşar; ders çıkışı yükü D15 yük testine D08-P14 kurucusunun verisini verir ve devam_hesapla gecikmesini, gönderim bütçesini ve indirmenin D08 bölümünü ölçer. Kimse bu paketi beklemez."));
const out = { id: 'D08', packages: P };
const txt = JSON.stringify(out, null, 1);
if (new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']').test(txt)) throw new Error('U+2013 or U+2014 found');
fs.writeFileSync(outPath, txt + '\n');
console.log('wrote', P.length, 'packages');

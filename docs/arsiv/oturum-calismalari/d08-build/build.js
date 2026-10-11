// Builds packages/D08.json from spec/D08.json by index so names and paths are copied, never retyped.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..', 'r17', 'backend');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D08.json'), 'utf8'));
const T = i => S.tests[i - 1].name;
const files = S.files.map(f => typeof f === 'string' ? f : f.path);
const F = full => { if (!files.includes(full)) throw new Error('not a spec file: ' + full); return full; };
const C = 'packages/core/src/devam/', M = 'apps/server/src/modules/devam/', J = 'apps/server/src/jobs/devam/';
const FE = 'apps/server/test/features/devam/', ST = 'apps/server/test/steps/devam/';
const MIG = 'apps/server/migrations/20261010120000_devam_tablolari/';
const id = n => 'D08-P' + String(n).padStart(2, '0');
const P = (n, o) => ({
  id: id(n), title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [],
  exports: o.exports || [], needs: o.needs || [], tests: o.tests.map(T), depends_on: (o.dep || []).map(id), size: o.size, notes: o.notes
});
const packages = [
  P(1, {
    title: 'Çekirdek: tipler, hak formülü ve kapsam yüklemi', size: 'M',
    files: [C + 'tipler.ts', C + 'hak.ts', C + 'hak.test.ts', C + 'kapsam.ts', C + 'kapsam.test.ts'].map(F),
    exports: ['oturumSaatleri', 'kapsamdaMi'], tests: [1, 2, 3, 49, 56],
    notes: "Hak, yüzde ve tür kararı ile D09'un da içe aktardığı oturumSaatleri ve kapsamdaMi saf ve Intl'siz yazılır, hesabın katılımla genişleyen kapsam kararı da kapsam.ts'te durur; tanım tabanlı özellik testleri, ondalıklı karşı örnek ve 99 sabitinin md5 ile geri yazılan mutasyonu denetler."
  }),
  P(2, {
    title: 'Devam sözleşmesi, hesap işi yaprağı ve şema', size: 'L',
    files: ['packages/contracts/src/devam.ts', M + 'yaprak.ts', M + 'tablolar.ts', FE + 'sozlesme.feature'].map(F).concat([MIG + 'migration.sql', MIG + 'snapshot.json']),
    tables: ['devam_sonuclari', 'devam_durumlari', 'devam_seviye_gecmisi', 'oturum_son_durumlari'],
    exports: ['DEVAM_NEDENLERI', 'DEVAM_SON_DURUMLARI', 'DEVAM_DENETIM_OLAYLARI', 'devamHesaplaIsiKoy'],
    needs: ['D09.SON_DURUMLAR', 'D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.kimlikSemasi', 'D13.ogrenciNoSemasi', 'D13.anSemasi', 'D13.gunSemasi', 'D14.isGonder', 'D12.tabloYardimcilari', 'D12.kisitAdi'],
    tests: [43],
    notes: "Başka modüllerin beklediği sabitler, üç rota tanımı, DEVAM_ hata kodları, devamHesaplaKuyrugu ile devamHesaplaIsiKoy yaprağı ve dört tablo CHECK kısıtları, durumKisiti listeleri ve @yalniz-ekleme yorumuyla tek göçte kurulur; sozlesme.feature D12'nin şema adımlarıyla hak formülüne, saat toplamına, seviye tabanına ve muaf kararına aykırı yazımın kısıt adıyla reddedildiğini denetler."
  }),
  P(3, {
    title: 'Çekirdek: oturum katmanı ve MUAF örtüsü', size: 'S',
    files: [C + 'oturum-katmani.ts', C + 'oturum-katmani.test.ts'].map(F),
    needs: ['D09.sonDurumOnceligi'], tests: [10], dep: [1],
    notes: "Öğrencinin kapsamındaki oturumları seçip D09.sonDurumOnceligi girdisine sayimDisi ve kilitli alanlarını dolduran ve üstüne yalnız MUAF örtüsünü koyan katman yazılır; ekle-bırak, Md.9/4, pasif satır, eklenmeden önceki katılım ve şube değişimi davranış testiyle denetlenir."
  }),
  P(4, {
    title: 'Çekirdek: uyarı seviyesi ve geri gitmez kuralı', size: 'M',
    files: [C + 'seviye.ts', C + 'seviye.test.ts'].map(F), tests: [4, 5, 6, 7, 8], dep: [1],
    notes: "Tahmini hak, kalan hak, sonraki oturum ve üç seviyenin eşikleri ile gösterilen üçlünün geri gitmez kuralı saf işlev olarak yazılır; açıkça yazılmış küçük hak tablosu, eşitlik eşikleri, en yüksek seviye ve 20.000 denemelik fast-check özellikleriyle denetlenir."
  }),
  P(5, {
    title: 'Çekirdek: genel sonuç ve karar bekliyor nedenleri', size: 'M',
    files: [C + 'sonuc.ts', C + 'sonuc.test.ts', C + 'karar-bekliyor.ts', C + 'karar-bekliyor.test.ts'].map(F),
    tests: [12, 13], dep: [1, 4],
    notes: "Tür sonuçları, genel sonuç, en iyi ve en kötü çözüm ile ACIK_ISARET ve BAGLANTI_YOK nedenleri saf işlev olarak yazılır; planlı saati olmayan türün davranışı ve 1.660.725 durumluk tekdüzelik ve aralık sınaması özellik testiyle denetlenir."
  }),
  P(6, {
    title: 'Çekirdek: telafi eksiği, telefon düzeltmesi ve dış yüz', size: 'M',
    files: [C + 'telafi.ts', C + 'telafi.test.ts', C + 'telefon.ts', C + 'telefon.test.ts', C + 'metinler.ts', C + 'index.ts'].map(F),
    tests: [15, 17, 16], dep: [3, 4, 5],
    notes: "Telafi eksiğinin tek tanımı, telefonun gönderilmemiş kayıt düzeltmesi, mesaj metinleri ve packages/core/src/devam dış yüzü tamamlanır; taşınma süzgeçli telafi örneği, telefon yerel düzeltmesi ve bütün çekirdek testlerinin TZ=UTC ile TZ=Europe/Istanbul altında aynı sonucu vermesiyle denetlenir."
  }),
  P(7, {
    title: 'Canlı hesap: girdiler, dersSonuclari ve sonucuDegistirebilirMi', size: 'L',
    files: [M + 'girdiler.ts', M + 'hesap.ts', FE + 'donem-sonu.feature', ST + 'hesap.steps.ts'].map(F),
    exports: ['dersSonuclari', 'oturumSonDurumlari', 'sonucuDegistirebilirMi'],
    needs: ['D01.ogrenciHesabiGetir', 'D02.dersGetir', 'D02.dersSubeleri', 'D02.oturumlariGetir', 'D02.kilitDurumu', 'D02.takvimGetir', 'D02.OTURUM_TURLERI', 'D02.OTURUM_DURUMLARI', 'D02.IPTAL_NEDENLERI', 'D03.listeSatirlari', 'D05.sayilanKayitlar', 'D05.kayitGetir', 'D06.kurulumSonTemaslari', 'D09.duzeltmeleriGetir', 'D09.acikSorunBildirimleri'],
    tests: [14, 25, 32], dep: [2, 6],
    notes: "Dersin bütün girdileri öğrenci sayısından bağımsız toplu okumalarla yüklenir ve çekirdekle repeatable read denetimli canlı dersSonuclari, oturumSonDurumlari ve sonucuDegistirebilirMi kurulur; hesap.steps.ts modülün ortak kurgu ve okuma adımlarını verir, donem-sonu.feature bağlantı nedenini, cevapsız oturumu ve kilitte donan kararları denetler."
  }),
  P(8, {
    title: 'Saklanan durumun yazımı ve seviye geçmişi', size: 'M',
    files: [M + 'yazim.ts', FE + 'seviye.feature', ST + 'sinir.steps.ts'].map(F),
    exports: ['ogrenciDevamDurumu'],
    needs: ['D01.ogrenciHesabiGetir', 'D06.ogrenciDurumuDegisti'],
    tests: [11, 20, 21, 22, 23, 24, 31, 42], dep: [7],
    notes: "Hesap sonucunu saklananla karşılaştırıp değişen satırları kanonik öğrenci sırasıyla yazan, gösterilen seviyeyi geri gitmez kuralıyla tutan, geçmişe etken ve neden ekleyen, durum sürümünü D06'dan alan yazım ile ogrenciDevamDurumu okuması kurulur; seviye.feature sinir.steps.ts adımlarıyla Beklemede, İncelemede, telafi, sonraki oturum, kendi beyanı reddi, kilitten sonraki kayıt ve sahte saat davranışlarını denetler."
  }),
  P(9, {
    title: 'devam_hesapla parti işleyicisi', size: 'M',
    files: [J + 'devam-hesapla.ts', FE + 'hesap.feature', ST + 'isler.steps.ts'].map(F),
    needs: ['D02.dersGetir', 'D12.islem', 'D12.danismaKilidi'],
    tests: [9, 52], dep: [8],
    notes: "Partiyi derse göre gruplayan, aynı (ders, öğrenci) işlerini birleştiren, her grubu devam:hesap:<dersId> kilidiyle ayrı işlemde hesaplayıp yazan, deneme dersini atlayan ve başarısız grubu yalnız kendi işleriyle düşüren işleyici yazılır; hesap.feature isler.steps.ts adımlarıyla D09 çıktısıyla birebir oturum satırını, devam.saat_tutarsiz artı kontrolünü ve kilit ile yazım sırasını denetler."
  }),
  P(10, {
    title: 'Gece tutarlılık denetimi ve iş tanımları', size: 'M',
    files: [M + 'kuyruklar.ts', J + 'tutarlilik-denetimi.ts', J + 'index.ts', FE + 'tutarlilik.feature', FE + 'gizlilik.feature'].map(F),
    jobs: ['devam_hesapla', 'devam_tutarlilik_denetimi'],
    needs: ['D02.denetlenecekDersler', 'D12.islem', 'D14.isTanimla'],
    tests: [18, 19, 30, 33, 37, 46, 53, 35], dep: [9],
    notes: "devamTutarlilikKuyrugu, her dersi sıfırdan hesaplayıp farkları DEVAM_FARK_TURLERI ile sayan ve düzelten gece işi ve iki işin isTanimla tanımları (parti 50 ve 2, cron 35 5 * * *) yazılır; tutarlilik.feature ve gizlilik.feature D14 kuyruk adımlarıyla aynı işlemde kuyruğa girmeyi, ikinci çalışmanın yazmamasını, canlı ile saklananın eşitliğini, bozulan satırın sayılmasını ve iş verisinde numara olmamasını denetler."
  }),
  P(11, {
    title: 'Muaf, oran ve karar bekleyenler uçları', size: 'L',
    files: [M + 'uclar.ts', M + 'yetki.ts', FE + 'muaf.feature', FE + 'oranlar.feature', FE + 'karar-bekleyenler.feature', ST + 'uclar.steps.ts'].map(F),
    endpoints: ['GET /v1/devam/dersler/{dersId}/karar-bekleyenler', 'PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf', 'PUT /v1/devam/yonetim/dersler/{dersId}/oranlar'],
    needs: ['D01.yetkiDenetle', 'D02.dersYetkisi', 'D02.dersGetir', 'D02.oranlariYaz', 'D03.satirGetir', 'D03.muafIsaretle', 'D09.denetimeYaz', 'D12.islem', 'D13.uygulamaHatasi', 'D13.istekKimligi'],
    tests: [26, 28, 29, 48, 51, 54], dep: [7, 10],
    notes: "Üç uç kaynak yetkisi, D03 ve D02 sonuç birliklerinin DEVAM_ kodlarına çevrilmesi, denetim olayı ve aynı işlemde kuyruğa giren hesap işiyle yazılır; muaf, oran ve karar bekleyenler senaryoları uclar.steps.ts adımlarıyla 404, 409 ve 403 kodlarını, eş güçlülüğü, salt okunur repeatable read cevabını ve 300 öğrencide 1 saniyelik p95 ile sabit sorgu sayısını denetler."
  }),
  P(12, {
    title: 'Öğrenci indirme kaynağı', size: 'S',
    files: [M + 'indirme.ts', FE + 'indirme.feature'].map(F),
    needs: ['D01.ogrenciHesabiGetir'],
    tests: [39, 40, 44], dep: [8, 10],
    notes: "Teyitli hesaba yalnız kendi derslerinin verilen sürümden sonra değişen satırlarını, pasif dersi silindi satırı olarak veren D06 öğrenci kaynağı yazılır; indirme.feature tam ve kısmi bölümü, teyitsiz hesabın boş bölümünü, aynı numaranın iki hesabını ve EXPLAIN'de sıralı tarama olmamasını denetler."
  }),
  P(13, {
    title: 'Eklenti, dinleyiciler, saklama ve modül girişi', size: 'M',
    files: [M + 'dinleyiciler.ts', M + 'saklama.ts', M + 'eklenti.ts', M + 'index.ts', FE + 'eklenti.feature', FE + 'saklama.feature'].map(F),
    exports: ['devamEklentisi'],
    needs: ['D02.oturumUretimDinleyicisiKaydet', 'D02.kilitAdimiKaydet', 'D03.listeDegisikligiDinleyicisiKaydet', 'D04.oturumKapandiDinleyicisiKaydet', 'D06.indirmeKaynagiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D13.rotalariKaydet'],
    tests: [27, 36, 38, 41, 45, 55], dep: [11, 12],
    notes: "devamEklentisi yaprak saatini, D02, D03 ve D04 dinleyicilerini, kilit adımını, indirme kaynağını, devam.donem_verisi saklama işleyicisini ve rotaları veritabanına dokunmadan kaydeder, index.ts modülün dış yüzünü açar; eklenti ve saklama senaryoları sorgu sayacının 0 kalmasını, sınır testinin sıfır ihlalini, rota ve kod sözleşmesini, şube değişiminde muafı, deneme dersini ve kilit anına göre parti parti silmeyi denetler."
  }),
  P(14, {
    title: 'Bağımsız kahin, örnek ders kurucusu ve yük', size: 'L',
    files: [ST + 'kahin.ts', 'apps/server/test/support/kurucular/devam.ts', FE + 'kahin.feature'].map(F),
    tests: [34, 50, 47], dep: [6, 13],
    notes: "Çekirdeği ve D09 işlevini içe aktarmayan başvuru hesabı ile ekle-bırak, Md.9/4, karma oturum, düzeltme, muaf, telafi ve kilit örnek derslerini kuran devam kurucusu yazılır; kahin.feature dersSonuclari ile birebir eşitliği, md5 ile geri yazılan eşik ve kural mutasyonlarının kırmızısını ve ders çıkışı yükündeki p95 sınırlarını denetler."
  })
];
const out = { id: 'D08', packages };
const txt = JSON.stringify(out, null, 1);
if (/[–—]/.test(txt)) throw new Error('contains U+2013 or U+2014');
const used = new Map();
for (const p of packages) for (const t of p.tests) { if (used.has(t)) throw new Error('test twice: ' + t); used.set(t, p.id); }
const missing = S.tests.map(t => t.name).filter(n => !used.has(n));
if (missing.length) throw new Error('tests not shipped: ' + missing.join(' | '));
const seenFile = new Map();
for (const p of packages) for (const f of p.files) { if (seenFile.has(f)) throw new Error('file twice: ' + f); seenFile.set(f, p.id); }
const ids = new Set(packages.map(p => p.id));
for (const p of packages) for (const d of p.depends_on) if (!ids.has(d) || d >= p.id) throw new Error(p.id + ' bad depends_on ' + d);
fs.writeFileSync(path.join(B, 'packages', 'D08.json'), txt + '\n');
console.log('wrote', packages.length, 'packages,', used.size, 'tests,', seenFile.size, 'files');

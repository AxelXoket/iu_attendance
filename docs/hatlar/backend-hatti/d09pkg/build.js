// Builds packages/D09.json from the D09 spec: test names are taken by index so they match the spec verbatim.
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(D, 'spec', 'D09.json'), 'utf8'));
const T = i => { if (!S.tests[i]) throw new Error('no test ' + i); return S.tests[i].name; };
const M = 'apps/server/src/modules/duzeltmeler/';
const J = 'apps/server/src/jobs/duzeltmeler/';
const C = 'packages/core/src/duzeltmeler/';
const F = 'apps/server/test/features/duzeltmeler/';
const ST = 'apps/server/test/steps/duzeltmeler/';
const GOC = 'apps/server/migrations/20261012080000_duzeltmeler_tablolar/';
const p = (n, o) => ({ id: 'D09-P' + String(n).padStart(2, '0'), title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests.map(T), depends_on: (o.dep || []).map(d => 'D09-P' + String(d).padStart(2, '0')), size: o.size, notes: o.notes });
const packages = [
  p(1, {
    title: 'Ortak saf kurallar',
    files: ['index.ts', 'katalog.ts', 'son-durum.ts', 'zincir.ts', 'belge-no.ts', 'istek-ozeti.ts', 'sorun-suresi.ts', 'parti.ts',
      'katalog.test.ts', 'son-durum.test.ts', 'zincir.test.ts', 'belge-no.test.ts', 'istek-ozeti.test.ts', 'sorun-suresi.test.ts', 'parti.test.ts'].map(f => C + f),
    exports: ['sonDurumOnceligi', 'SEBEP_KODLARI', 'NEDEN_KODLARI', 'SON_DURUMLAR'],
    tests: [55, 56, 57, 58, 59, 60, 70],
    size: 'L',
    notes: 'Sebep ve neden kodu kataloğu, son durum önceliği, düzeltme zinciri, belge numarası, istek özeti, sorun süresi ve parti seçimi Intl kullanmayan saf işlevler olarak yazılır; fast-check özellik testleri TZ=UTC ve TZ=Europe/Istanbul koşularında, Stryker yüzde 80 kırma eşiğiyle doğrulanır.'
  }),
  p(2, {
    title: 'Düzeltme sözleşmesi',
    files: ['packages/contracts/src/duzeltmeler.ts'],
    exports: ['elleEklemeOgeTuru', 'sorunBildirimiOgeTuru'],
    needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.ogeTuruTanimla', 'D13.ogeSonuclariSemasi', 'D13.sayfaSemasi', 'D13.genisleyenEnum'],
    tests: [63],
    dep: [1],
    size: 'M',
    notes: 'Sözleşme dosyasına 16 rota tanımı, DUZELTMELER_ hata kataloğu, DenetimOlayiGirdisi ile DUZELTMELER_DENETIM_OLAYLARI, iki kuyruk öğesi gövdesi ve cevap tipleri katalogdan türetilerek yazılır; rota listesi contracts.json ile yöntem, yol, kimlik ve hız sınıfı düzeyinde birebir karşılaştırılarak doğrulanır.'
  }),
  p(3, {
    title: 'Şema ve denetim yaprağı',
    files: [M + 'tablolar.ts', M + 'yaprak.ts', M + 'denetim-ayrinti.ts', M + 'denetim-ayrinti.test.ts', GOC + 'migration.sql', GOC + 'snapshot.json'],
    tables: ['duzeltmeler', 'sorun_bildirimleri', 'denetim_kayitlari', 'gunluk_inceleme_partileri'],
    exports: ['denetimeYaz', 'denetimOlaylariniKaydet', 'duzeltmeleriGetir', 'acikSorunBildirimleri'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi'],
    tests: [42, 43, 62, 66],
    dep: [1, 2],
    size: 'M',
    notes: 'Dört tablo D01, D02, D03 ve D05 tablolarına yabancı anahtarla tek göçte kurulur ve yaprak.ts başka modül içe aktarmadan denetim yazma, olay kaydı ve iki okuma işlevini verir; rol yetkisi, ayrıntı izin listesi, CHECK ile katalog eşliği ve olay şeması testleriyle doğrulanır.'
  }),
  p(4, {
    title: 'Okuma uçları ve yetki',
    files: [M + 'yetki.ts', M + 'imlec.ts', M + 'denetim-sorgulari.ts', 'apps/server/test/support/kurucular/duzeltmeler.ts', ST + 'denetim-adimlari.ts', F + 'denetim-kaydi.feature'],
    endpoints: ['GET /v1/duzeltmeler', 'GET /v1/duzeltmeler/denetim'],
    needs: ['D02.dersYetkisi', 'D02.hocaninDersleri', 'D13.uygulamaHatasi', 'D13.rotalariKaydet', 'D15.kurucuTanimla'],
    tests: [44],
    dep: [2, 3],
    size: 'M',
    notes: 'yetki.ts sahip ve yönetici kapsam kuralını, imlec.ts opak anahtar kümesi imlecini, denetim-sorgulari.ts iki okuma ucunu ve kurucular D09 satır kurucularını verir; hoca, kapsamlı ve kapsamsız yönetici ile eşzamanlı eklemede sayfalama senaryosuyla doğrulanır.'
  }),
  p(5, {
    title: 'Düzeltme girişi ve geri alma',
    files: [M + 'toplu-isleyici.ts', M + 'zincir-deposu.ts', M + 'duzeltme-servisi.ts', ST + 'duzeltme-adimlari.ts', F + 'duzeltme.feature', F + 'geri-alma.feature'],
    endpoints: ['POST /v1/duzeltmeler', 'POST /v1/duzeltmeler/{id}/geri-al'],
    needs: ['D01.ogrenciHesabiGetir', 'D02.dersGetir', 'D02.dersSubeleri', 'D02.oturumGetir', 'D02.oturumSubeleri', 'D02.kilitDurumu', 'D03.satirGetir', 'D03.ogrencininSatirlari', 'D05.kayitGetir', 'D06.ogrenciDurumuDegisti', 'D07.oturumIsaretleri', 'D08.devamHesaplaIsiKoy', 'D08.oturumSaatleri', 'D08.kapsamdaMi', 'D10.aksisAnligiGetir', 'D12.danismaKilidi', 'D12.kisitAdi', 'D12.kisitIhlali', 'D13.uygulamaHatasi', 'D13.istekKimligi', 'D13.rotalariKaydet'],
    tests: [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 51, 52, 61],
    dep: [1, 3, 4],
    size: 'L',
    notes: 'Toplu işleyici (kanonik sıra, anahtarlar baştan, öğe SAVEPOINT\'i, 40P01 yeniden denemesi), zincir deposu ve düzeltme servisi panelden düzeltme, değiştirme ve geri almayı denetim olayı, devam işi ve öğrenci sürümüyle aynı işlemde yazar; düzeltme ve geri alma senaryoları ile saat türü özellik testiyle doğrulanır.'
  }),
  p(6, {
    title: 'Sorun bildirimi',
    files: [M + 'sorun-bildirimi-ogesi.ts', M + 'sorun-bildirimi-servisi.ts', ST + 'sorun-bildirimi-adimlari.ts', F + 'sorun-bildirimi.feature'],
    endpoints: ['GET /v1/duzeltmeler/sorun-bildirimleri', 'POST /v1/duzeltmeler/sorun-bildirimleri/{id}/kapat'],
    exports: ['sorunBildirimiOgesi'],
    needs: ['D01.ogrenciHesabiGetir', 'D02.dersGetir', 'D02.oturumGetir', 'D02.oturumSubeleri', 'D03.satirGetir', 'D03.ogrencininSatirlari', 'D03.uyelikDenetle', 'D03.listeKovaAnahtari', 'D04.saatSonucu', 'D05.kayitGetir', 'D06.kararTeslimAni', 'D06.ogeTuruKaydet', 'D06.ogrenciDurumuDegisti', 'D08.devamHesaplaIsiKoy', 'D12.danismaKilidi', 'D13.uygulamaHatasi', 'D13.istekKimligi', 'D13.rotalariKaydet'],
    tests: [16, 17, 18, 19, 20, 21, 22, 23],
    dep: [4, 5],
    size: 'L',
    notes: 'sorun_bildirimi kuyruk öğesi bağ, 72 saatlik süre ve tekrar kurallarıyla açılır, hoca listesi BUGUN, ACIK, KAPALI ve SURE_DISI görünümleriyle okunur ve kapat ucu bildirimi değişiklik yapmadan kapatır; süre sınırı, bağ, tekrar ve düzeltmeyle kapanıp geri almayla açılma senaryolarıyla doğrulanır.'
  }),
  p(7, {
    title: 'Elle ekleme öğesi ve indirme kaynakları',
    files: [M + 'elle-ekleme-ogesi.ts', M + 'indirme-kaynaklari.ts', F + 'elle-ekleme.feature', F + 'indirme.feature'],
    exports: ['elleEklemeOgesi', 'ogrencininDuzeltmeleri', 'ogrencininSorunBildirimleri'],
    needs: ['D01.ogrenciHesabiGetir', 'D03.satirGetir', 'D03.ogrencininSatirlari', 'D04.saatSonucu', 'D06.ogeTuruKaydet', 'D06.indirmeKaynagiKaydet'],
    tests: [12, 13, 14, 15, 47, 49],
    dep: [5, 6],
    size: 'M',
    notes: 'elle_ekleme işleyicisi zincir anahtarlarını kilit almadan D06 paket çağrısına verir ve düzeltme servisini kullanır, iki öğrenci kaynağı düzeltme ve bildirimleri belge numarası, yapan ve kapatan olmadan tam liste indirir; kuyruk tekrarı, panelle eşzamanlı yazım, paket kilidi ve eşitleme indirmesi senaryolarıyla doğrulanır.'
  }),
  p(8, {
    title: 'İlk kayıt teyidi',
    files: [M + 'teyit-servisi.ts', F + 'ilk-kayit-teyidi.feature'],
    endpoints: ['GET /v1/duzeltmeler/teyitler', 'POST /v1/duzeltmeler/teyitler/kararlar'],
    needs: ['D01.ogrenciHesabiGetir', 'D01.ogrenciTeyitEt', 'D01.ogrenciTeyidiniReddet', 'D01.topluTeyitUygunMu', 'D02.dersSubeleri', 'D03.listeSatirlari', 'D06.ogrenciDurumuDegisti', 'D07.dogrulamaTeyitAnahtari', 'D12.islem', 'D13.uygulamaHatasi', 'D13.istekKimligi', 'D13.rotalariKaydet'],
    tests: [31, 32, 50],
    dep: [4, 5],
    size: 'M',
    notes: 'Teyit listesi D01\'in toplu kuralıyla dört gruba ayrılır, kararlar öğe başına ayrı işlemde D01.ogrenciTeyitEt ve ogrenciTeyidiniReddet\'e islemId ile gider ve sonuç öğe koduna eşlenir; grup, gerekçeli ret, tekrar ve 200 öğelik sıra denetimi senaryolarıyla doğrulanır.'
  }),
  p(9, {
    title: 'Onay listeleri ve özet',
    files: [M + 'onay-listeleri.ts', ST + 'onay-adimlari.ts', F + 'onay-ozeti.feature'],
    endpoints: ['GET /v1/duzeltmeler/onaylar/ozet', 'GET /v1/duzeltmeler/kendi-beyani', 'GET /v1/duzeltmeler/incelemeler', 'GET /v1/duzeltmeler/isaretli-oturumlar'],
    needs: ['D02.oturumlariGetir', 'D03.listeSatirlari', 'D05.sayilanKayitlar', 'D07.oturumIsaretleri', 'D13.uygulamaHatasi', 'D13.rotalariKaydet'],
    tests: [34],
    dep: [4, 6, 8],
    size: 'M',
    notes: 'Kendi beyanı, İncelemede ve işaretli oturum listeleri ile menü özeti kafa sayısı bekleyen oturumları ve kilitli birim dönemlerini dışarıda bırakarak, BUGUN görünümünü gunluk_inceleme_partileri\'nden okuyarak kurulur; özet toplamı ve ayrı sayılan kafa sayısı bekleyen oturum senaryosuyla doğrulanır.'
  }),
  p(10, {
    title: 'Hoca kararları',
    files: [M + 'karar-servisi.ts', F + 'kendi-beyani.feature', F + 'inceleme.feature', F + 'karar-degistirme.feature', F + 'isaretli-oturum.feature', F + 'toplu-istek.feature', F + 'yetki.feature'],
    endpoints: ['POST /v1/duzeltmeler/kendi-beyani/kararlar', 'POST /v1/duzeltmeler/incelemeler/kararlar', 'POST /v1/duzeltmeler/isaretli-oturumlar/{oturumId}/incelendi'],
    needs: ['D02.oturumGetir', 'D05.kayitGetir', 'D06.ogrenciDurumuDegisti', 'D07.kararAnahtarlari', 'D07.kararDegistir', 'D07.isaretIncelendi', 'D07.oturumIsaretleri', 'D08.devamHesaplaIsiKoy', 'D12.danismaKilidi', 'D13.uygulamaHatasi', 'D13.istekKimligi', 'D13.rotalariKaydet'],
    tests: [5, 24, 25, 26, 28, 33, 41, 48, 53],
    dep: [5, 8, 9],
    size: 'L',
    notes: 'Kendi beyanı ve İncelemede kararları ile KARAR_DEGISTIR bağlamı, D07.kararAnahtarlari\'nın anahtarları öğe SAVEPOINT\'lerinden önce alınarak D07.kararDegistir\'e birleşik biçimle verilir ve incelendi ucu D07.isaretIncelendi\'yi çağırır; karar, sayılan bilgisi, iki rollü kişi, ters sıralı eşzamanlı toplu istek ve 201 öğe senaryolarıyla doğrulanır.'
  }),
  p(11, {
    title: 'Sonradan değişenler',
    files: [M + 'sonradan-degisenler.ts', F + 'sonradan-degisenler.feature', F + 'kilit-sonrasi.feature'],
    endpoints: ['GET /v1/duzeltmeler/sonradan-degisenler'],
    needs: ['D02.birimDonemiGetir', 'D02.dersSubeleri', 'D02.kilitDurumu', 'D02.oturumlariGetir', 'D05.sayilanKayitlar', 'D06.gondermeSuresiSonu', 'D08.dersSonuclari', 'D08.sonucuDegistirebilirMi', 'D10.aksisAnligiGetir', 'D10.degisimSinifi', 'D12.islem', 'D13.uygulamaHatasi', 'D13.rotalariKaydet'],
    tests: [30, 40],
    dep: [4, 5, 7],
    size: 'M',
    notes: 'GEC_ULASAN, SONUCU_DEGISEN ve SAYILIRSA_DEGISECEK bölümleri repeatable read işleminde D08 ve D10 işlevleriyle sorgu anında kurulur ve tek keyset akışıyla sayfalanır; bölüm, degisimSinifi eşliği, sayfalama ve kilitten sonra anlık bekleme senaryolarıyla doğrulanır.'
  }),
  p(12, {
    title: 'Eklenti, rotalar ve saklama',
    files: [M + 'index.ts', M + 'eklenti.ts', M + 'rotalar.ts', M + 'saklama.ts', F + 'saklama-ve-hesap-silme.feature'],
    exports: ['duzeltmelerEklentisi'],
    needs: ['D01.hesabiSil', 'D06.ogeTuruKaydet', 'D06.indirmeKaynagiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D13.rotalariKaydet'],
    tests: [45, 46, 65, 67, 68],
    dep: [4, 5, 6, 7, 8, 9, 10, 11],
    size: 'M',
    notes: 'duzeltmelerEklentisi 16 rotayı, iki kuyruk öğesini, iki indirme kaynağını, duzeltmeler.donem_verisi saklama işleyicisini ve denetim olaylarını kayıt sırasında veritabanına dokunmadan kaydeder; saklama, hesap silme, toplu sonuç sözleşmesi, içe aktarma sınırı ve k6 yük testleriyle doğrulanır.'
  }),
  p(13, {
    title: 'Gece inceleme sıralaması',
    files: [M + 'kuyruklar.ts', J + 'index.ts', J + 'gece-inceleme-siralamasi.ts', ST + 'gece-isi-adimlari.ts', F + 'gece-inceleme-siralamasi.feature'],
    jobs: ['gece_inceleme_siralamasi'],
    needs: ['D02.dersGetir', 'D04.istanbulTarihi', 'D05.sayilanKayitlar', 'D07.oturumIsaretleri', 'D08.sonucuDegistirebilirMi', 'D12.islem', 'D14.isTanimla', 'D14.isiCalistirVeBekle'],
    tests: [27, 29, 35, 36, 37, 38, 39, 54, 64, 69, 71],
    dep: [9, 10, 11, 12],
    size: 'L',
    notes: 'gece_inceleme_siralamasi 05:50 İstanbul tetiklemesinin gününde her hocaya sira 0 başlık satırlı, kritikleri önde parti yazar, 30 günden eski partiyi siler ve hiçbir kararı değiştirmez; kritik sıra, iki kez çalışma, tetikleme günü, bugün görünümü, kilitli dönem, eklenti birleşimi, hata kodu kapsamı, yük ve koruma mutasyonu testleriyle doğrulanır.'
  })
];
const out = { id: 'D09', packages };
const s = JSON.stringify(out, null, 1);
if (/[–—]/.test(s)) throw new Error('dash');
fs.writeFileSync(path.join(D, 'packages', 'D09.json'), s + '\n');
// coverage self-check: every spec test in exactly one package
const all = packages.flatMap(x => x.tests);
const missing = S.tests.map(t => t.name).filter(n => !all.includes(n));
const dup = all.filter((n, i) => all.indexOf(n) !== i);
console.log('packages', packages.length, 'tests', all.length, '/', S.tests.length, 'missing', missing.length, 'dup', dup.length);
console.log(packages.map(x => `${x.id} ${x.size} files ${x.files.length} tests ${x.tests.length} needs ${x.needs.length} deps ${x.depends_on.join(',')}`).join('\n'));

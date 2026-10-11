// Generate the candidate D13 work breakdown and check it against the spec before it is written.
// node gen.js <out.json>
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const S = read(path.join(B, 'spec/D13.json'));
const OLD = read(path.join(B, 'packages/r1/schedule.json')).packages.filter(p => p.id.startsWith('D13-'));
const oldOf = id => OLD.find(p => p.id === id);
const C = 'packages/contracts/', O = C + 'src/ortak/', T = O + 'testler/', I = 'apps/server/src/infra/api/', K = I + 'kancalar/', U = I + 'surum/';
const F = 'apps/server/test/features/api/', ST = 'apps/server/test/steps/api/', OR = F + 'ornekler/';
const MIG = 'apps/server/migrations/20261012090000_api_istemci_surum_esikleri/';
const APP_NEEDS = oldOf('D13-P09').needs;

const P = [
  {
    key: 'C1', size: 'L',
    title: 'Sözleşme paketi iskeleti ile rota, hata, kimlik, sayfa ve öğe temelleri',
    files: [C + 'package.json', C + 'tsconfig.json', C + 'tsconfig.build.json', O + 'moduller.ts', O + 'enum.ts', O + 'zaman.ts', O + 'kimlik.ts', O + 'sayfa.ts', O + 'hata.ts', O + 'hiz.ts', O + 'basliklar.ts', O + 'oge.ts', O + 'oge-sonucu.ts', O + 'rota.ts', T + 'kimlik.test.ts', T + 'semalar.test.ts'],
    exports: ['MODULLER', 'ModulAdi', 'genisleyenEnum', 'anSemasi', 'gunSemasi', 'dersSaatiSemasi', 'sureMsSemasi', 'bindeSemasi', 'buyukSayiSemasi', 'Kimlik', 'KisiId', 'GirisOturumuId', 'CihazId', 'ProjeksiyonId', 'BirimId', 'kimlikNesnesiSemasi', 'kimlikSemasi', 'istemciKimligiSemasi', 'ogrenciNoSemasi', 'beklenenSurumNoSemasi', 'sayfaSemasi', 'sayfaSorgusuSemasi', 'tamListeSemasi', 'hataKodlariTanimla', 'HataTanimi', 'UygulamaHatasi', 'hataZarfiSemasi', 'GECICI_SQLSTATELER', 'HataAyrintisi', 'HIZ_SINIFLARI', 'BASLIKLAR', 'CEREZLER', 'IstemciBilgisi', 'ogeTuruTanimla', 'OgeTuruTanimi', 'ogeSonuclariSemasi', 'rotaTanimla', 'RotaTanimi', 'KimlikBirlesimi', 'RotaGirdisi'],
    needs: [], deps: [],
    tests: ['Kimlik nesnesi tek şemaya uyar', 'Öğe sonucu şeması yalnız ekleme alanlarını kabul eder'],
    notes: 'Her modülün sözleşme paketinin ilk adımda içe aktardığı her şey tek pakette ve hiçbir şeyi beklemeden yazılır, böylece modül sözleşmeleri ikinci aşamada başlar: packages/contracts çalışma alanı paketi kaynak ve default koşullu giriş noktalarıyla ve Node tipsiz tsconfig ile kurulur; modül adları, genişleyen enum, zaman, kimlik, sayfa, hata kataloğu tanımı ile markalı UygulamaHatasi ve hata zarfı, geçici SQLSTATE tablosu, hız sınıfları, başlık ve çerez adları, öğe türü ve öğe sonucu şemaları ve tanım anı kurallarıyla rotaTanimla yazılır (HataAyrintisi hatalar.ts içe aktarılmadan onun genişlettiği kayıt arayüzüyle kurulur). Kimlik nesnesi testi geçerli ve geçersiz örnekleri, öğe sonucu testi ek alan kabulünü ve reddini denetler.'
  },
  {
    key: 'C2', size: 'M',
    title: 'İmzalı metin, sürüm şemaları ve api sözleşmesi',
    files: [O + 'imzali-metin.ts', O + 'surum.ts', O + 'index.ts', C + 'src/api.ts', T + 'surum.test.ts', OR + 'yayin-bilgisi/d07-ornegi.json'],
    exports: ['imzaliMetinSemasi', 'surumSemasi', 'surumAyristir', 'surumKarsilastir', 'API_HATALARI', 'API_ROTALARI', 'DEGISIM_BEKLEYEN_ROTALARI', 'PLATFORMLAR', 'KANALLAR', 'ESIK_KARARLARI', 'surumCevabiSemasi', 'yayinBilgisiSemasi', 'YayinBilgisi', 'KanalGirdisi', 'HataliSurum'],
    needs: [], deps: ['C1'],
    tests: ['Sürüm karşılaştırması toplam sıralamadır', 'Yayın bilgisi D07 alanlarıyla katı doğrulanır'],
    notes: 'İmzalı metin şeması, sürüm ayrıştırma ve karşılaştırma, api.ts içindeki D13 hata kodları, GET /v1/surum rota tanımı, değişim bekleyen rotalar listesi, platform, kanal ve eşik kararı listeleri ile katı yayın bilgisi şeması yazılır, ortak/index.ts açılır; yalnız ilk paketin tanımlarını kullanır. fast-check sürüm sıralamasını, D07 örnek dosyası yayın bilgisi şemasını denetler.'
  },
  {
    key: 'F1', size: 'L',
    title: 'Hata kataloğu birleştirmesi ve altyapı dış yüzü: tipler, uygulamaHatasi, yakalayıcı, istek kimliği, süre bütçesi',
    files: [C + 'src/hatalar.ts', I + 'tipler.ts', K + 'istek-kimligi.ts', I + 'hata-yakalayici.ts', I + 'sure-butcesi.ts', I + 'index.ts', ST + 'sinir-adimlari.ts', F + 'bilesim.feature'],
    exports: ['TUM_HATALAR', 'HataKodu', 'ortukKodlar', 'uygulamaHatasi', 'istekKimligi', 'kalanSureMs', 'ISLEYICI_BUTCESI_MS', 'EklentiTemelSecenekleri', 'FastifyRequest', 'ApiBagimliliklari', 'OturumGirdisi', 'OturumSonucu', 'RotaIsleyicisi', 'DenemeSecenekleri'],
    needs: ['D14.IS_KUYRUGU_HATA_KODLARI', 'D15.ISLETIM_HATALARI', 'D01.KimlikOlayi', 'D02.OTURUM_TURLERI', 'D04.SAAT_ROTALARI', 'D05.yoklamaCiftAnahtari', 'D07.dogrulamaTeyitAnahtari', 'D08.DEVAM_SON_DURUMLARI', 'D09.elleEklemeOgeTuru', 'D10.AksisAnligi', 'D11.KODLAR_ISTEGI', 'D12.Islem', 'D12.veritabaniKur', 'D04.simdi', 'D04.SaatOznesi'],
    deps: ['C1', 'C2'],
    tests: ['Sınır testi içe aktarma kurallarını sıfır ihlalle geçer'],
    notes: 'Modüllerin en erken beklediği dışa açıklar kancalardan ve apiKur\'dan önce, modül sözleşmelerinin hemen ardından teslim edilir. hatalar.ts on beş modülün sözleşme dosyasındaki hata kataloglarını bir kez birleştirir, çift kodu yüklenirken reddeder, ortukKodlar kimlik beyanına göre örtük kodları verir; uygulamaHatasi HataKodu\'na bağlı olduğu için bu dosyayla aynı pakettedir. needs listesindeki D01, D02, D04, D05, D07, D08, D09, D10 ve D11 adları hatalar.ts\'in içe aktardığı sözleşme dosyalarını o dosyanın bir dışa açığıyla gösterir; D03, D06 ve D12\'nin sözleşme dosyalarında (listeler.ts, esitleme.ts, veritabani.ts) adlandırılmış dışa açık olmadığından onları içeren paketler de bundan önce bitmiş olmalıdır. tipler.ts (Fastify istek eklemesi, eklenti ve api bağımlılık tipleri, D12 ve D04\'ten yalnız import type), uygulamaHatasi ile kök hata ve bulunamadı yakalayıcıları, istek kimliği kancası, süre bütçesi ve index.ts yazılır. index.ts bu pakette açılır; ona satır ekleyen sonraki paketler (yayın bilgisi, apiKur ve GET /v1/surum paketleri) depends_on ile birbirine sıralıdır ve yalnız kendi dışa açık satırlarını ekler. dependency-cruiser sınır testi infra/api ve modül içe aktarma kurallarını pozitif denetimlerle denetler; yakalayıcının davranışı apiKur paketinin hata zarfı senaryolarında, katalog kuralları sözleşme kuralları paketinde koşar.'
  },
  {
    key: 'MG', size: 'M',
    title: 'Rota tablosu ve öğe türleri birleştirmesi',
    files: [C + 'src/rotalar.ts', T + 'rota-tablosu.test.ts'],
    exports: ['TUM_ROTALAR', 'TUM_OGE_TURLERI'],
    needs: ['D04.SAAT_ROTALARI', 'D04.PENCERE_SURESI_OGESI', 'D04.ERKEN_KAPATMA_OGESI', 'D09.elleEklemeOgeTuru', 'D09.sorunBildirimiOgeTuru', 'D15.ISLETIM_ROTALARI'],
    deps: ['C1', 'C2', 'F1'],
    tests: ['Rota tablosu kuralları'],
    notes: 'rotalar.ts on beş modülün sözleşme dosyalarındaki rota listelerini ve öğe türlerini bir kez birleştirir, çift rota ve çift tür yüklenirken reddedilir. Rota tablosu sözleşme testi yalnız sözleşme verisini taradığı için burada koşar: tekil yol ve ad, önek, kimlik birleşimi, hız sınıfı, gövde sınırı, hatalar listesindeki her kodun TUM_HATALAR\'da olması ve değişim bekleyen rotalar zemin denetimli sayımlarla denetlenir (bu yüzden hata kataloğu paketinden sonra gelir).'
  },
  {
    key: 'IS', size: 'M',
    title: 'Telefon ve panelin ortak fetch yardımcısı ve derlenmiş paket denetimi',
    files: [C + 'src/istemci.ts', T + 'istemci.test.ts', T + 'paket.test.ts'],
    exports: ['istemciKur', 'sonucSinifi', 'IstekSonucu'],
    needs: [], deps: ['C1', 'C2', 'F1', 'MG'],
    tests: ['İstemci yardımcısı protokol tablosuna uyar', "Derlenmiş sözleşme paketi Node'da açılır"],
    notes: 'istemciKur girdiyi istek şemasıyla denetleyip zaman aşımıyla gönderir ve sonucu protokol tablosuna göre basari, gecici, bol ya da dur diye sınıflar; sahte fetch ile protokol tablosu testi her satırı denetler. Derlenmiş paket testi bütün giriş noktalarını (istemci, hatalar ve rotalar dahil) dist üstünden Node ile açtığı için iki birleştirmeden sonra koşar; sunucuda hiçbir paket bunun dışa açıklarını beklemez.'
  },
  {
    key: 'S1', size: 'M',
    title: 'Sürüm eşiği tablosu, yayın bilgisi okuyucusu ve eşik karar işlevleri',
    files: [I + 'tablolar.ts', MIG + 'migration.sql', MIG + 'snapshot.json', U + 'yayin-bilgisi.ts', U + 'esik-karari.ts', U + 'esik-deposu.ts', U + 'kova.ts'],
    tables: ['istemci_surum_esikleri'],
    exports: ['yayinBilgisi', 'yayinBilgisiYukle'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem', 'D04.simdi'],
    deps: ['C1', 'C2', 'F1'],
    tests: ['Kurulum kovası kararlı ve düzgün dağılır', 'Eşik karar işlevi dönem içinde yükseltmez'],
    notes: 'istemci_surum_esikleri tablosu ve api göçü, yayın bilgisi okuyucusu ve süreç önbelleği, saf eşik karar işlevi, eşik deposu ve kurulum kovası yazılır, yayinBilgisi ve yayinBilgisiYukle satırları index.ts\'e eklenir; kancaları ve apiKur\'u beklemez, yalnız sözleşmedeki yayın bilgisi şemasını, D12 tablo yardımcılarını ve D04 saatini kullanır (hata kataloğu paketine bağlılığı index.ts\'in açılmış olmasıdır). Kova ve karar işlevinin fast-check özellikleri denetler; okuyucu ve depo GET /v1/surum paketinin senaryolarında veritabanıyla, açılış alımı eşik kararı senaryolarında koşar.'
  },
  {
    key: 'F2', size: 'L',
    title: 'Kök kancalar, hız sınıfları, saatli depo ve aşırı yük',
    files: [K + 'istemci-basliklari.ts', K + 'koken.ts', K + 'kimlik.ts', K + 'beyan-denetimi.ts', K + 'kimliksiz-sayac.ts', K + 'cevap-basliklari.ts', K + 'saat-belgesi.ts', K + 'istek-logu.ts', I + 'hiz-siniflari.ts', I + 'saatli-depo.ts', I + 'asiri-yuk.ts'],
    exports: [],
    needs: ['D04.simdi'],
    deps: ['C1', 'C2', 'F1'],
    tests: ['İstemci başlık ayrıştırıcısı hiçbir girdide fırlatmaz'],
    notes: 'İstemci başlıkları, köken, oturum, beyan denetimi, kimliksiz sayaç, cevap başlıkları, saat belgesi ve istek logu kancaları, hız sınıfları, saatli depo ve aşırı yük yazılır; hepsi tipler.ts ve uygulamaHatasi üstüne kurulur, oturum ve saat belgesi işlevleri ApiBagimliliklari ile içeri verilir, index.ts\'e dokunmaz. İstemci başlık ayrıştırıcısının fast-check özelliği denetler; kancaların davranışı apiKur paketi ve senaryo paketlerinde koşar.'
  },
  {
    key: 'F3', size: 'L',
    title: 'apiKur, rota kaydı ve senaryo düzeneği ile hata zarfı senaryoları',
    files: [I + 'kur.ts', I + 'rota-kaydi.ts', ST + 'ortak-adimlar.ts', ST + 'deneme-eklentisi.ts', F + 'hata-zarfi.feature'],
    exports: ['rotalariKaydet', 'apiKur', 'hizSinifi'],
    needs: ['D04.simdi', 'D14.IS_KUYRUGU_HATA_KODLARI'],
    deps: ['F1', 'MG', 'F2', 'S1'],
    tests: ['Bozuk JSON gövdesi tek zarfla 400 alır', 'Şemaya uymayan istekte yalnız alan yolu ve kod döner, değer yankılanmaz', 'Bilinmeyen /v1 yolu zarflı 404 döner', 'Her cevap no-store ve sunucu istek kimliği taşır', "Geçici veritabanı hataları 503'e çevrilir", 'Modül 429 ve 503 kodları bekleme süresiyle döner', "İşletim kodu istekte 500'e çevrilir", 'Kök log veritabanı hatasının nedenini yazar', 'İş kuyruğu kodları http değerine göre döner', 'Yakalayıcı gelen değeri yankılarsa senaryo kırmızı olur'],
    notes: 'apiKur kök kancaları belirtilen sırayla kurar, rotalariKaydet beyanları TUM_ROTALAR ve örtük kodlarla denetleyip rotaları kaydeder ve tamlık için not eder; index.ts\'e rotalariKaydet, apiKur ve hizSinifi satırları eklenir (yayın bilgisi paketine bağlılığı yalnız index.ts satırlarının sırasıdır, aynı aşamada iki paket o dosyaya yazmaz). Ortak adımlar ve deneme eklentisi uygulamayı apiKur ve deneme rotalarıyla kurar, bileşim kökünü beklemez ve sonraki senaryo paketlerinin adım dağarcığını sağlar; hata zarfı senaryoları ve yakalayıcı mutasyonu denetler.'
  },
  {
    key: 'S2', size: 'M',
    title: 'Eşik durumu, GET /v1/surum ve sürüm senaryoları',
    files: [U + 'esik-durumu.ts', U + 'surum-ucu.ts', ST + 'surum-adimlari.ts', F + 'surum.feature', OR + 'yayin-bilgisi/gecerli.json', T + 'tipler.tip-testi.ts'],
    endpoints: ['GET /v1/surum'],
    exports: ['enDusukSurumDenetle', 'apiEklentisi'],
    needs: ['D12.veritabaniKur', 'D12.testVeritabaniHazirla', 'D12.senaryoOncesiSifirla', 'D04.simdi'],
    deps: ['F1', 'S1', 'F3'],
    tests: ['Veritabanı kısıt hatası yalnız kod ve kısıt adıyla loglanır', 'Sürüm başlıkları bozuk ya da yokken istek reddedilmez', 'En düşük sürümün altındaki istemci reddedilmez', 'GET /v1/surum platform ve kanala göre cevap verir', 'Kanal kaydı yokken GET /v1/surum 503 döner', 'GitHub kademesi aynı kuruluma her gün aynı kararı verir', 'Altyapı tipleri D12 ile aynıdır'],
    notes: 'Eşik durumu önbelleği ve enDusukSurumDenetle, apiEklentisi ile GET /v1/surum yazılır, index.ts\'e bu iki satır eklenir. Sürüm senaryoları apiKur düzeneği ve atılabilir test veritabanıyla koşar, bileşim kökünü beklemez; altyapı tip testi ApiBagimliliklari ile D12 tiplerinin eşitliğini ve eşik tazelemesinin salt okuma seçeneğini denetler.'
  },
  {
    key: 'SC1', size: 'M',
    title: 'Kimlik, köken ve rota beyanı senaryoları',
    files: [F + 'kimlik-ve-koken.feature', F + 'rota-tablosu.feature'],
    exports: [], needs: [], deps: ['F3'],
    tests: oldOf('D13-P11').tests,
    notes: 'Rol ve kısıtlı oturum beyanı, Origin ve çerez kuralları, Bearer önceliği, cihaz imzası, altı kimlik birleşimi, projeksiyon çerezi, beyan dışı ve örtük kodlar ile 200 ve 201 serileştirmesi apiKur düzeneğinin deneme rotalarıyla senaryolaştırılır; senaryolar ile köken, çerez, beyan ve projeksiyon mutasyonları denetler.'
  },
  {
    key: 'SC2', size: 'M',
    title: 'Gövde, hız, aşırı yük, saat belgesi ve süre bütçesi senaryoları',
    files: [F + 'govde-ve-icerik.feature', F + 'hiz-siniri.feature', F + 'asiri-yuk.feature', F + 'saat-belgesi-basligi.feature', F + 'sure-butcesi.feature'],
    exports: [], needs: [], deps: ['F3'],
    tests: oldOf('D13-P12').tests,
    notes: 'İçerik türü ve gövde sınırı, gövdeden önce yetki ve hız, IP ve oturum sayaçları, kimliksiz sayaç, aşırı yük 503, saat belgesi başlığı koşulları ve istek bütçesi ile sonuç sınırı apiKur düzeneğinin deneme rotalarıyla senaryolaştırılır (kimlik senaryolarının dosyalarını kullanmaz, onları beklemez); senaryolar ile kanca sırası, preParsing ve kimliksiz sayaç mutasyonları denetler.'
  },
  {
    key: 'KR', size: 'M',
    title: 'Hız sınıfı ve hata kataloğu sözleşme kuralları',
    files: [T + 'hiz.test.ts', T + 'hata-katalogu.test.ts'],
    exports: [], needs: ['D14.IS_KUYRUGU_HATA_KODLARI'], deps: ['F1', 'MG', 'F3', 'S2', 'SC1', 'SC2'],
    tests: ['Hata kataloğu kuralları', 'Hız sınıfı kuralları'],
    notes: 'TUM_HATALAR ve HIZ_SINIFLARI bütün modüllerin dolu sözleşmeleri ve TUM_ROTALAR üstünde taranır; apiKur düzeneğiyle kurulan uygulamanın sayaç tabloları ve her API_ kodunun senaryo kapsaması (hata zarfı, kimlik, gövde ve hız ile sürüm senaryoları) denetlenir, bileşim kökünü beklemez; iki sözleşme testi zemin denetimli sayımlarla denetler.'
  },
  {
    key: 'APP', size: 'L',
    title: 'Bileşim kökü uygulamaKur ve süreç türleri',
    files: ['apps/server/src/app.ts', I + 'openapi.ts', ST + 'surec-adimlari.ts', F + 'surec.feature'],
    exports: ['uygulamaKur', 'UygulamaBagimliliklari', 'saatOznesiKur'],
    needs: APP_NEEDS, deps: ['F1', 'F3', 'S1', 'S2'],
    tests: ['HEAD ikizi açılışı durdurmaz', 'Süreç türü kurulumu belirler', 'Kimlik dinleyicileri eklentilerden önce kurulur', 'Ölçü yazıcısı yalnız verilen seçenekle açılır', 'Kimlik dinleyicileri eklentilerden sonra kurulursa senaryo kırmızı olur'],
    notes: 'app.ts kimlik dinleyicilerini eklentilerden önce kurar, apiKur ve bütün <ad>Eklentisi kayıtlarını süreç tablosuna göre bağlar, açılışta yayın bilgisini ve eşik alımını yapar, belge kipinde openapi.ts ile swagger kaydeder; süreç senaryoları, açılış adım kaydı, HEAD ikizi ve dinleyici sırası mutasyonu denetler. Bütün eklentileri beklediği için yalnız uçtan uca paketler ve süreç girişleri bunu bekler.'
  },
  {
    key: 'EK', size: 'S',
    title: 'Eşik kararı ve açılış alımı senaryoları',
    files: [F + 'esik-karari.feature', OR + 'yayin-bilgisi/bozuk.json'],
    exports: [], needs: [], deps: ['S2', 'APP'],
    tests: oldOf('D13-P10').tests,
    notes: oldOf('D13-P10').notes
  },
  {
    key: 'OA', size: 'M',
    title: 'OpenAPI belgesi üretimi ve saklama işi',
    files: ['apps/server/scripts/api/openapi-belgesi-sakla.ts', ST + 'sozlesme-adimlari.ts', F + 'openapi-belgesi.feature'],
    jobs: ['openapi_belgesi_sakla'],
    exports: [], needs: oldOf('D13-P13').needs, deps: ['APP'],
    tests: oldOf('D13-P13').tests,
    notes: oldOf('D13-P13').notes
  },
  {
    key: 'OD', size: 'M',
    title: 'oasdiff kırılma kapısı ve sözleşme iş akışı',
    files: oldOf('D13-P14').files,
    jobs: ['oasdiff_kirilma_denetimi'],
    exports: [], needs: [], deps: ['OA'],
    tests: oldOf('D13-P14').tests,
    notes: oldOf('D13-P14').notes + ' Kapı senaryosunun adımları sozlesme-adimlari.ts içinde olduğu için OpenAPI paketinden sonra gelir.'
  },
  {
    key: 'BT', size: 'M',
    title: 'Bütünleşik doğrulama',
    files: oldOf('D13-P16').files,
    exports: [], needs: oldOf('D13-P16').needs, deps: ['APP'],
    tests: oldOf('D13-P16').tests,
    notes: oldOf('D13-P16').notes
  }
];

const ids = new Map(P.map((p, i) => [p.key, 'D13-P' + String(i + 1).padStart(2, '0')]));
const out = { id: 'D13', packages: P.map(p => ({
  id: ids.get(p.key), title: p.title, files: p.files, tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [],
  exports: p.exports, needs: p.needs, tests: p.tests, depends_on: p.deps.map(d => { if (!ids.has(d)) throw new Error('bad dep ' + d); return ids.get(d); }), size: p.size, notes: p.notes
})) };
// self checks: every spec file, export and test exactly once; no dash characters
const cnt = (list, key) => { const m = new Map(); for (const p of out.packages) for (const x of p[key]) m.set(x, (m.get(x) || 0) + 1); return m; };
const errs = [];
const fm = cnt(null, 'files'), em = cnt(null, 'exports'), tm = cnt(null, 'tests');
for (const f of S.files) { const fp = typeof f === 'string' ? f : f.path; if (fm.get(fp) !== 1) errs.push('file ' + fp + ' x' + (fm.get(fp) || 0)); }
for (const [f] of fm) if (!S.files.includes(f) && !f.startsWith('apps/server/migrations/')) errs.push('extra file ' + f);
for (const e of S.exports) if (em.get(e.name) !== 1) errs.push('export ' + e.name + ' x' + (em.get(e.name) || 0));
for (const t of S.tests) if (tm.get(t.name) !== 1) errs.push('test ' + t.name + ' x' + (tm.get(t.name) || 0));
for (const [t] of tm) if (!S.tests.find(x => x.name === t)) errs.push('extra test ' + t);
if (/[\u2013\u2014]/.test(JSON.stringify(out))) errs.push('dash');
if (errs.length) { console.log('SELF CHECK FAILED\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
console.log('wrote ' + process.argv[2] + ': ' + out.packages.length + ' packages; ' + out.packages.map(p => p.id + '=' + P[out.packages.indexOf(p)].key).join(' '));

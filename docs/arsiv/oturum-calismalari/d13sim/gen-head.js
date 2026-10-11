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

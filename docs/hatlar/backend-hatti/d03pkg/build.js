// Builds packages/D03.json from spec/D03.json. Files and test names are taken from the spec by
// path suffix and by index, never retyped, so a typo cannot slip in. Fails loudly on any gap.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D03.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const mod = C.modules.find(m => m.id === 'D03');

const specFiles = S.files.map(f => (typeof f === 'string' ? f : f.path));
const used = new Set();
const F = (...suffixes) => suffixes.map(sfx => {
  const hits = specFiles.filter(p => p === sfx || p.endsWith('/' + sfx));
  if (hits.length !== 1) throw new Error(`file suffix ${sfx} matched ${hits.length}`);
  if (used.has(hits[0])) throw new Error(`file ${hits[0]} used twice`);
  used.add(hits[0]);
  return hits[0];
});
const ORNEKLER = () => specFiles.filter(p => p.includes('/listeler/ornekler/')).map(p => { if (used.has(p)) throw new Error(p); used.add(p); return p; });
const usedTests = new Set();
const T = (...idx) => idx.map(i => {
  if (!S.tests[i]) throw new Error(`no test ${i}`);
  if (usedTests.has(i)) throw new Error(`test ${i} used twice`);
  usedTests.add(i);
  return S.tests[i].name;
});
const MIG = 'apps/server/migrations/20261012090000_listeler_liste_tablolari/';
const ep = mod.owns_endpoints.slice();
const ex = n => { if (!S.exports.some(e => e.name === n)) throw new Error(`no export ${n}`); return n; };

const P = [];
const add = p => P.push({ id: `D03-P${String(P.length + 1).padStart(2, '0')}`, tables: [], endpoints: [], jobs: [], exports: [], needs: [], depends_on: [], ...p });

// P01
add({ title: 'Liste sözleşmesi',
  files: F('packages/contracts/src/listeler.ts'),
  needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.kimlikSemasi', 'D13.ogrenciNoSemasi', 'D13.sayfaSorgusuSemasi'],
  tests: T(64, 65), size: 'M',
  notes: "Altı ucun rota tanımları, istek ve cevap şemaları, on LISTELER_ hata kodu, yedi denetim olayı şeması, gizli alan listesi ve CHECK sabitleri packages/contracts/src/listeler.ts'te yazılır; D13'ün Vitest sözleşme testleri istek şemalarının katılığını ve cevaptaki genişleyen kod alanlarını denetler." });
// P02
add({ title: 'Ad eşleştirme, kova ve şube anahtarları',
  files: F('core/src/listeler/isim.ts', 'core/src/listeler/isim.test.ts', 'core/src/listeler/kova.ts', 'core/src/listeler/kova.test.ts', 'core/src/listeler/sube.ts', 'core/src/listeler/sube.test.ts'),
  exports: [ex('listeKovaAnahtari')],
  tests: T(50, 51, 52, 56, 57), size: 'M',
  notes: "Türkçe ad anahtarı ve isimlerEslesir, kovaNo ile listeKovaAnahtari ve şube anahtarı hiçbir dış bağımlılığı olmayan saf işlevler olarak yazılır, D01, D07 ve D09'un beklediği kova anahtarı burada çıkar; fast-check özellik testleri ve Türkçe harf tablo testi doğrular." });
// P03
add({ title: 'Üyelik aralığı ve liste farkı',
  files: F('core/src/listeler/aralik.ts', 'core/src/listeler/aralik.test.ts', 'core/src/listeler/fark.ts', 'core/src/listeler/fark.test.ts'),
  depends_on: ['D03-P02'],
  tests: T(53, 54), size: 'L',
  notes: "Yarı açık üyelik aralığı ile kırpma ve mevcut satırlarla dosya satırlarından fark (ekleme, pasif, canlanma, kırpma, şube değişimi, ad ve sıra) saf işlevlerle hesaplanır; fast-check testleri etkin kümenin dosyaya eşitlendiğini, ikinci farkın boş olduğunu ve hiçbir satırın silinmediğini gösterir." });
// P04
add({ title: 'Numara, satır denetimi ve fark özeti',
  files: F('core/src/listeler/numara.ts', 'core/src/listeler/numara.test.ts', 'core/src/listeler/satir-denetimi.ts', 'core/src/listeler/satir-denetimi.test.ts', 'core/src/listeler/fark-ozeti.ts', 'core/src/listeler/fark-ozeti.test.ts'),
  depends_on: ['D03-P02', 'D03-P03'],
  tests: T(55, 61), size: 'M',
  notes: "Numara biçimi, satır bulguları (HATA, UYARI, BILGI: tekrar, şube uyuşmazlığı, sayı hücresi) ve farkın sıradan bağımsız 43 karakterlik özeti yazılır; numara ve fark özeti özellik testleriyle doğrulanır." });
// P05
add({ title: 'Dosya türü, kodlama ve CSV',
  files: F('core/src/listeler/dosya-turu.ts', 'core/src/listeler/dosya-turu.test.ts', 'core/src/listeler/kodlama.ts', 'core/src/listeler/kodlama.test.ts', 'core/src/listeler/csv.ts', 'core/src/listeler/csv.test.ts'),
  tests: T(58, 59), size: 'M',
  notes: "Panelin dosya okuma zincirinin alt katmanı olan dosya türü ve parola tanıma, UTF-8, UTF-16 ve windows-1254 çözümü ve RFC 4180 CSV ayrıştırması yazılır; kodlama ve CSV gidiş dönüş özellik testleriyle doğrulanır." });
// P06
add({ title: 'Başlık eşleme, dosya okuma ve örnek dosyalar',
  files: [...F('core/src/listeler/baslik.ts', 'core/src/listeler/baslik.test.ts', 'core/src/listeler/okuma.ts', 'core/src/listeler/okuma.test.ts', 'core/src/listeler/index.ts'), ...ORNEKLER()],
  depends_on: ['D03-P02', 'D03-P03', 'D03-P04', 'D03-P05'],
  tests: T(60, 62, 71), size: 'L',
  notes: "Başlık sözlüğü, satırları numara ve ada eşleyen okuma işlevi, örnek dosya üreticisi, örnek dosyalar ve core listeler dizini yazılır; örnek dosya testi, başlık özellik testi ve D15'in haftalık Stryker eşiği doğrular." });
// P07
add({ title: 'Liste tabloları, göç ve dinleyici defteri',
  files: [...F('modules/listeler/tablolar.ts', 'modules/listeler/dinleyiciler.ts'), MIG + 'migration.sql', MIG + 'snapshot.json'],
  tables: mod.owns_tables.slice(),
  needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem'],
  depends_on: ['D03-P01'],
  tests: T(66), size: 'M',
  notes: "Üç tablonun Drizzle tanımı, tek ileri göç klasörü ve liste değişikliği defteri (ESLESTIRME, KARAR, HESAP sırasıyla çağırma) yazılır; D12'nin şema ve göç denetimi kısıt adlarını kisitAdi ile, CHECK listelerini sözleşme sabitleriyle karşılaştırır." });
// P08
add({ title: 'Kilit sırası, okuma işlevleri ve kaynaklar',
  files: F('modules/listeler/kilitler.ts', 'modules/listeler/sorgular.ts', 'modules/listeler/denetim-olaylari.ts', 'modules/listeler/liste-kaynagi.ts', 'modules/listeler/indirme-kaynagi.ts', 'modules/listeler/kapsam-kaynagi.ts', 'modules/listeler/saklama.ts', 'modules/listeler/deneme.ts'),
  needs: ['D12.Islem', 'D12.danismaKilidi', 'D12.danismaKilidiDene', 'D07.dogrulamaListeAnahtari', 'D02.subeGetir', 'D02.dersGetir', 'D02.dersSubeleri', 'D02.kilitDurumu', 'D06.surumAl', 'D09.denetimeYaz', 'D13.uygulamaHatasi'],
  depends_on: ['D03-P01', 'D03-P02', 'D03-P07'],
  tests: T(68), size: 'L',
  notes: "Yazma kilit sırası ile işlem başına kova kümesi, altı okuma işlevi, D02 liste kaynağı, iki indirme kaynağı, saklama işleyicisi ile kilit adımı, denetim olayı yazıcısı ve denemeListesiniKur yazılır; modül sınırı denetimi (Biome ve dependency-cruiser) içe aktarmaları doğrular, davranışı D03-P10 ile D03-P14 arasındaki senaryolar sınar." });
// P09
add({ title: 'Yazma servisi, uçlar ve eklenti',
  files: F('modules/listeler/servis.ts', 'modules/listeler/rotalar.ts', 'modules/listeler/eklenti.ts', 'modules/listeler/index.ts', 'apps/server/src/jobs/listeler/index.ts'),
  endpoints: ep,
  exports: ['listeSatirlari', 'satirGetir', 'uyelikDenetle', 'numaraIleEslestir', 'ogrencininEtkinSatirlari', 'ogrencininSatirlari', 'muafIsaretle', 'denemeListesiniKur', 'listeDegisikligiDinleyicisiKaydet', 'listelerEklentisi'].map(ex),
  needs: ['D02.dersYetkisi', 'D02.subeGetir', 'D02.kilitDurumu', 'D02.oturumlariGetir', 'D02.OTURUM_DURUMLARI', 'D02.OTURUM_TURLERI', 'D02.IPTAL_NEDENLERI', 'D02.listeKaynagiKaydet', 'D02.kilitAdimiKaydet', 'D06.surumAl', 'D06.indirmeKaynagiKaydet', 'D09.denetimOlaylariniKaydet', 'D12.Islem', 'D12.islem', 'D12.saklamaIsleyicisiKaydet', 'D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D13.uygulamaHatasi', 'D04.simdi'],
  depends_on: ['D03-P01', 'D03-P03', 'D03-P04', 'D03-P07', 'D03-P08'],
  tests: T(63), size: 'L',
  notes: "Önizleme, uygulama, elle ekleme, satır düzenleme ve muafIsaretle servisi, altı uç, listelerEklentisi kayıtları ve index.ts yazılır, modülün bütün dış yüzü burada açılır; altı ucun sözleşmedeki rota listesiyle birebir kaydı D13'ün rota tablosu denetimiyle doğrulanır." });
// P10
add({ title: 'Liste kurucusu, ortak adımlar ve yükleme senaryoları',
  files: F('test/support/kurucular/listeler.ts', 'test/steps/listeler/liste-adimlari.ts', 'test/features/listeler/liste-yukleme.feature'),
  needs: ['D15.TestDunyasi', 'D15.kurucuTanimla', 'D02.denemeDersiniKur'],
  depends_on: ['D03-P09'],
  tests: T(0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 14, 47), size: 'L',
  notes: "Liste kurucusu ve sonraki senaryo paketlerinin de kullandığı uç, işlev ve satır durumu adımları yazılır; önizleme, eş güçlü uygulama, onaylar, şube değişimi, ad farkı ve hata önceliği senaryoları test dünyasında yeşil olur." });
// P11
add({ title: 'Eşleme, üyelik ve indirme senaryoları',
  files: F('test/steps/listeler/esleme-adimlari.ts', 'test/features/listeler/liste-esleme.feature', 'test/features/listeler/liste-indirme.feature'),
  needs: ['D15.TestDunyasi', 'D08.devamEklentisi'],
  depends_on: ['D03-P10'],
  tests: T(28, 29, 30, 31, 32, 34, 35, 36, 37, 39, 74, 75), size: 'L',
  notes: "Dış yüz işlevlerini ve D06'nın kaynak sözleşme yardımcısını çağıran adımlarla eşleme, üyelik, aralık kesişmezliği, yanlış şube düzeltmesi, telefon indirme, öğrenci kapsamı ve tek sürüm senaryoları yeşil olur; kırpma ve sürüm sırası mutasyonları bu senaryoları kırmızıya döndürür." });
// P12
add({ title: 'Satır, yetki ve kilit senaryoları',
  files: F('test/features/listeler/liste-satirlari.feature', 'test/features/listeler/liste-yetki-ve-kilit.feature'),
  needs: ['D15.TestDunyasi', 'D08.devamEklentisi', 'D09.duzeltmelerEklentisi'],
  depends_on: ['D03-P10', 'D03-P11'],
  tests: T(4, 13, 15, 16, 17, 18, 19, 20, 38, 41, 42, 48, 49), size: 'M',
  notes: "Elle ekleme, PATCH, geç kayıt seçimi, sayfalı GET, satır sınırları, başka hocanın listesi, dönem kilidi ve muaf senaryoları D08'in muaf ucu ve D09'un teyit ucu kurulu dünyada yazılır ve yeşil olur." });
// P13
add({ title: 'Açılış, deneme, saklama ve dinleyici zinciri senaryoları',
  files: F('test/features/listeler/liste-acilis.feature', 'test/features/listeler/liste-deneme.feature', 'test/features/listeler/liste-saklama.feature'),
  needs: ['D15.TestDunyasi', 'D13.uygulamaKur', 'D02.derslerEklentisi', 'D02.isler', 'D12.saklamaIsleyicisiniCalistir', 'D09.denetimeYaz', 'D01.kimlikEklentisi', 'D07.dogrulamaEklentisi', 'D08.devamEklentisi'],
  depends_on: ['D03-P10', 'D03-P11'],
  tests: T(5, 26, 27, 40, 43, 44, 46, 73), size: 'M',
  notes: "API ve işçi açılışındaki altı kayıt, denetim olay türleri, deneme listesi, saklama anonimleştirmesi, kilit damgası ve D01, D07, D08 dinleyicileriyle aynı işlemdeki zincir senaryoları yeşil olur; saklama damgası mutasyonu kırmızıya döner." });
// P14
add({ title: 'Eşzamanlılık senaryoları',
  files: F('test/steps/listeler/yaris-adimlari.ts', 'test/features/listeler/liste-yarislar.feature'),
  needs: ['D15.TestDunyasi', 'D12.danismaKilidi', 'D07.dogrulamaListeAnahtari', 'D01.kimlikEklentisi', 'D02.derslerEklentisi', 'D08.devamEklentisi'],
  depends_on: ['D03-P10', 'D03-P11'],
  tests: T(21, 22, 23, 24, 25, 33, 45, 72), size: 'L',
  notes: "Bekleyen kayıt, canlanma, şube pasifleştirme, kilit beklemesi ve dogrulama:liste anahtarı yarışları çok bağlantılı adımlarla pg_locks üzerinden sınanır, numara ve ad sızıntısı denetimi bütün senaryolara kanca olarak bağlanır; danışma kilidi mutasyonu üç yarış senaryosunu kırmızıya döndürür." });
// P15
add({ title: 'Yük testi ve hata kodu kapsaması',
  files: F('test/features/listeler/liste-yuk.k6.js'),
  needs: ['D01.kimlikEklentisi'],
  depends_on: ['D03-P11', 'D03-P12', 'D03-P13', 'D03-P14'],
  tests: T(67, 69, 70), size: 'M',
  notes: "k6 betiği liste uçlarının süre bütçesini ve öğrenci kayıtlarıyla birlikte dönem başı yoğunluğunu ölçer, D13'ün kapsama testi on LISTELER_ kodunun her birinin bir senaryoda gerçekten döndüğünü doğrular." });

// completeness gates
const missingFiles = specFiles.filter(p => !used.has(p));
if (missingFiles.length) throw new Error('files in no package: ' + missingFiles.join(', '));
const missingTests = S.tests.map((t, i) => i).filter(i => !usedTests.has(i));
if (missingTests.length) throw new Error('tests in no package: ' + missingTests.join(', '));
const order = ['id', 'title', 'files', 'tables', 'endpoints', 'jobs', 'exports', 'needs', 'tests', 'depends_on', 'size', 'notes'];
const out = { id: 'D03', packages: P.map(p => Object.fromEntries(order.map(k => [k, p[k]]))) };
const txt = JSON.stringify(out, null, 2) + '\n';
if (/[–—]/.test(txt)) throw new Error('dash found');
fs.writeFileSync(path.join(B, 'packages', 'D03.json'), txt);
console.log(`wrote ${P.length} packages, ${used.size} spec files, ${usedTests.size} tests`);

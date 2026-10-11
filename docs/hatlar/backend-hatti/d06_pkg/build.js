// Builds packages/D06.json from spec/D06.json: test names are pulled by index so no name is retyped.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D06.json'), 'utf8'));
const T = i => S.tests[i].name;
const M = 'apps/server/src/modules/esitleme/', C = 'packages/core/src/esitleme/', F = 'apps/server/test/features/esitleme/', A = 'apps/server/test/steps/esitleme/';
const GOC = 'apps/server/migrations/20261012090000_esitleme_ilk_tablolar/';
const P = [
 { title: 'Sözleşme, tablolar ve sürüm yaprağı',
   files: ['packages/contracts/src/esitleme.ts', M + 'tablolar.ts', M + 'yaprak.ts', GOC + 'migration.sql', GOC + 'snapshot.json', F + 'surum-damgasi.feature', A + 'surum-damgasi-adimlari.ts'],
   tables: ['gonderim_defteri', 'kurulumlar', 'degisiklik_sayaci', 'ogrenci_durum_surumleri', 'karar_teslimleri'], endpoints: [], jobs: [],
   exports: ['surumAl', 'surumDamgasiIste', 'ogrenciDurumuDegisti', 'kurulumSonTemasi', 'kurulumSonTemaslari', 'kararTeslimAni'],
   needs: ['D12.islem', 'D12.islemSonuKancasi', 'D12.kisitAdi', 'D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.imzaliMetinSemasi'],
   tests: [52, 65], depends_on: [], size: 'L',
   notes: 'Telefon sözleşmesinin tip, şema, rota ve hata tanımları, beş tablo ile göçü ve yaprak dış yüzü (sayaç, damga, öğrenci sürümü, son temas, teslim bilgisi) kurulur; surum-damgasi.feature tek sürümle damgalamayı, surumAl çağrılmadan biten işlemin geri alındığını ve tablo kısıtlarının sözleşme sabitleriyle aynı olduğunu mutasyonla doğrular.' },
 { title: 'Çekirdek: imleç, su seviyesi ve sayfa kesme',
   files: [C + 'imlec.ts', C + 'imlec.test.ts', C + 'su-seviyesi.ts', C + 'su-seviyesi.test.ts', C + 'sayfa.ts', C + 'sayfa.test.ts'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: [], tests: [55, 54, 56], depends_on: [], size: 'M',
   notes: 'İmleç kodlaması, kesintisiz son sıra ve sürüm sınırında sayfa kesme saf işlev olarak yazılır; fast-check testleri kodla ve çöz tersliğini, 64 bitlik kimliğin kaybolmadığını, boşluk alanlarının sıfırlanmasını ve hiçbir sürümün iki sayfaya bölünmediğini sınar.' },
 { title: 'Çekirdek: ikinci çapa metni ve makbuz biçimi',
   files: [C + 'ikinci-capa-metni.ts', C + 'ikinci-capa-metni.test.ts', C + 'makbuz-bicimi.ts', C + 'makbuz-bicimi.test.ts'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: [], tests: [58, 59], depends_on: [], size: 'M',
   notes: 'İkinci çapanın imzalı metni ve ulaşma makbuzunun bayt biçimi saf işlev olarak yazılır; özellik testleri tek bayt değişiminde doğrulamanın düştüğünü, anahtar türü eşlemesini ve kid kurallarını sınar.' },
 { title: 'Çekirdek: telefon kuyruk protokolü',
   files: [C + 'protokol.ts', C + 'protokol.test.ts'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: [], tests: [60, 61], depends_on: [], size: 'M',
   notes: 'Telefonun paket seçimi, bekleme, gerileme, bölme, ilk gönderim kaydırması ve tam indirme temizliği kuralları saf işlev olarak yazılır; fast-check testleri her kuralı rastgele cevap ve sayfa dizileriyle sınar.' },
 { title: 'Çekirdek: gönderme süresi ve dizin',
   files: [C + 'gonderme-suresi.ts', C + 'gonderme-suresi.test.ts', C + 'index.ts'],
   tables: [], endpoints: [], jobs: [], exports: ['gondermeSuresiSonu'], needs: [], tests: [57, 70], depends_on: ['P02', 'P03', 'P04'], size: 'S',
   notes: 'Gönderme süresinin dışlayıcı sonu ve packages/core/src/esitleme dizini eklenir; tablo testi TZ=UTC ve TZ=Europe/Istanbul altında aynı sonucu, Stryker işi bütün çekirdek mutantlarının öldürüldüğünü gösterir.' },
 { title: 'Öğe dağıtıcısı ve gönderim test dili',
   files: [M + 'kayitlar.ts', M + 'dagitici.ts', 'apps/server/test/support/kurucular/esitleme.ts', A + 'gonderim-adimlari.ts', F + 'dagitim-hatalari.feature'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: ['D12.islem', 'D12.kisitIhlali'], tests: [20, 23, 24, 25], depends_on: ['P01'], size: 'L',
   notes: 'Öğe türü ve indirme kaynağı kayıt defteri, parçalı SAVEPOINT dağıtıcısı, sahte işleyici ve sahte kaynak kurucuları ile sonraki paketlerin kullandığı gönderim adımları yazılır; dagitim-hatalari.feature bütçe, kısıt hatası, geçici çakışma ve sonuç sözleşmesi dallarını sahte işleyicilerle ve sorgu günlüğüyle sınar.' },
 { title: 'Kurulum satırı, karar teslimi ve iz',
   files: [M + 'kurulum.ts', M + 'teslim.ts', M + 'iz.ts', A + 'ogrenci-durumu-adimlari.ts', F + 'son-temas.feature'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: ['D12.islem', 'D12.danismaKilidi', 'D13.uygulamaHatasi'], tests: [43, 41], depends_on: ['P01', 'P05'], size: 'M',
   notes: 'Kurulum satırının açılması, kişi başına sınır, 2 saniyelik kilit beklemesi, son temas ve su seviyesi yazımı, kişinin satırlarını silme, karar teslimi sunum ve onay yazımı ile gönderim ve indirme log satırı yazılır; son-temas.feature son temas ve bekleyen yoklama dönüşlerini ve kararTeslimAni üç durumunu doğrular.' },
 { title: 'Defter, ulaşma anı ve ikinci çapa bağlamı',
   files: [M + 'defter.ts', M + 'ulasma-makbuzu.ts', M + 'ikinci-capa.ts', A + 'yedekten-donus-adimlari.ts', F + 'yedekten-donus.feature', F + 'gonderim-durum-makinesi.feature'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: ['D04.IKINCI_CAPA_YOK_NEDENLERI'], tests: [26, 29, 44, 53], depends_on: ['P01', 'P05', 'P06'], size: 'L',
   notes: 'Gönderim defterinin ön denetimi, kilitten sonra yeniden okunması ve toplu upsert kuralı, ulaşma anı seçimi ile makbuz üretip doğrulama ve öğe başına ikinci çapa bağlamı yazılır; protokol.ts ile sürülen telefon benzetimi yedekten dönüşte ve 200 denemelik durum makinesinde makbuzlu hiçbir kaydın kaybolmadığını gösterir.' },
 { title: 'Gönderim ucu',
   files: [M + 'gonderim.ts', M + 'danisma-anahtarlari.ts', A + 'durum-makinesi-adimlari.ts', F + 'gonderim.feature', F + 'danisma-kilidi.feature'],
   tables: [], endpoints: ['POST /v1/esitleme/gonderim'], jobs: [], exports: [],
   needs: ['D12.islem', 'D12.danismaKilidi', 'D13.kalanSureMs', 'D13.uygulamaHatasi', 'D13.istekKimligi'],
   tests: [0, 1, 2, 3, 4, 5, 6, 7, 8, 16, 21, 27, 51], depends_on: ['P06', 'P07', 'P08'], size: 'L',
   notes: 'POST /v1/esitleme/gonderim işleyicisi (işlem süresi ve bütçe, tek danışma kilidi çağrısı, kişi ve kurulum kilidi, dağıtım, sayaç en sonda, cevap şeması) yazılır; gonderim.feature ve danisma-kilidi.feature 200 öğelik paketi, tekrar ve eşzamanlı gönderimi, sıra çakışmasını ve sayacın bir kez en sonda alındığını sahte sayaç ve sorgu günlüğüyle doğrular.' },
 { title: 'İndirme ucu',
   files: [M + 'indirme.ts', A + 'indirme-adimlari.ts', F + 'indirme.feature', F + 'sayac-eszamanlilik.feature'],
   tables: [], endpoints: ['GET /v1/esitleme/degisiklikler'], jobs: [], exports: [],
   needs: ['D12.islem', 'D12.nesilOku', 'D13.uygulamaHatasi'],
   tests: [33, 34, 36, 37, 49, 40, 38, 39], depends_on: ['P05', 'P06', 'P07'], size: 'L',
   notes: 'GET /v1/esitleme/degisiklikler işleyicisi (imleç çözümü, baştan indirme nedenleri, kapsam, genel kaynak sayfaları, öğrenci bölümü ve karar teslimi) yazılır; indirme.feature ve sayac-eszamanlilik.feature artımlı indirmeyi, sayfa sınırını, teyit bağlamını ve zorlanmış zamanlamada hiçbir değişikliğin atlanmadığını sahte kaynaklarla doğrular.' },
 { title: 'Gönderim kimlik kancası',
   files: [M + 'kimlik-cozumu.ts', F + 'gonderim-kimlik.feature', F + 'ikinci-capa.feature'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: ['D12.islem', 'D13.uygulamaHatasi', 'D04.IKINCI_CAPA_YOK_NEDENLERI'],
   tests: [10, 11, 12, 13, 14, 15, 17, 18, 19, 30, 31, 50, 22], depends_on: ['P09', 'P10'], size: 'M',
   notes: 'Gönderim ucunun kimlik kancası (kurulum başlığı, oturum, paket imzası, anahtar türü eşlemesi, ECDSA doğrulaması, kişi uyuşmazlığı) yazılır; gonderim-kimlik.feature ve ikinci-capa.feature iki uçtaki 401, 403, 429 ve 503 cevaplarını, satır açılmadığını ve ikinci çapa bağlamını D04 sabit listesine karşı doğrular.' },
 { title: 'Eklenti, dizin ve sözleşme denetimleri',
   files: [M + 'eklenti.ts', M + 'index.ts', M + 'kuyruklar.ts', M + 'kimlik-dinleyicisi.ts', M + 'saklama.ts', M + 'en-eski-surum.ts', A + 'sozlesme-adimlari.ts', F + 'sozlesme.feature', F + 'hesap-silme.feature', F + 'saklama.feature'],
   tables: [], endpoints: [], jobs: [],
   exports: ['ogeTuruKaydet', 'indirmeKaynagiKaydet', 'esitlemeKimlikDinleyicisi', 'enEskiGecerliSurumuYukselt', 'esitlemeEklentisi'],
   needs: ['D13.rotalariKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir'],
   tests: [62, 63, 64, 66, 67, 45, 47], depends_on: ['P09', 'P10', 'P11'], size: 'L',
   notes: 'esitlemeEklentisi, modül dizini, kuyruk tanımı, kimlik dinleyicisi, saklama işleyicisi ve en eski sürüm işlevi birleştirilir; sozlesme.feature öğe türü ve kaynak kayıtlarını, OpenAPI şemalarını, modül sınırını ve eklenti kurallarını, hesap-silme.feature ile saklama.feature yalnız D06 satırlarının silindiğini doğrular.' },
 { title: 'Sıra boşluğu raporu ve en eski sürüm komutu',
   files: ['apps/server/src/jobs/esitleme/index.ts', 'apps/server/src/jobs/esitleme/sira-boslugu-raporu.ts', 'apps/server/src/cli/esitleme-en-eski-surum.ts', A + 'is-adimlari.ts', F + 'sira-boslugu-raporu.feature', F + 'en-eski-surum.feature'],
   tables: [], endpoints: [], jobs: ['sira_boslugu_raporu'], exports: [],
   needs: ['D14.isTanimla', 'D14.isiCalistirVeBekle', 'D04.istanbulTarihi', 'D12.veritabaniKur', 'D12.islem', 'D15.ayarlariYukle', 'D09.denetimeYaz', 'D09.denetimOlaylariniKaydet'],
   tests: [46, 9, 48], depends_on: ['P12'], size: 'M',
   notes: 'Gecelik sira_boslugu_raporu işi ve en eski geçerli sürüm komut girişi yazılır; sira-boslugu-raporu.feature boşluk ölçüsünü, eski defter temizliğini ve iki kez çalışmanın aynı sonucu verdiğini, en-eski-surum.feature sürüm yükseltmesiyle denetim olayının tek işlemde yazıldığını doğrular.' },
 { title: 'Uçtan uca senaryolar ve yük testi',
   files: [F + 'ogrenci-durumu.feature', F + 'kapsam.feature'],
   tables: [], endpoints: [], jobs: [], exports: [], needs: ['D05.kararSutunlariniYaz'],
   tests: [28, 42, 32, 35, 68, 69], depends_on: ['P12'], size: 'M',
   notes: 'Öbür modüllerin gerçek işleyici ve kaynaklarıyla uçtan uca senaryolar ve k6 yük testleri koşulur; ogrenci-durumu.feature ve kapsam.feature kilitlenmesiz onayı, karar sürümünün sorun bildirimine aynen döndüğünü ve öğrenciye yalnız kendi verisinin indiğini, yük testleri p95, p99 ve 503 eşiklerini doğrular.' },
];
const pad = n => String(n).padStart(2, '0');
const out = { id: 'D06', packages: P.map((p, i) => ({
  id: 'D06-P' + pad(i + 1), title: p.title, files: p.files, tables: p.tables, endpoints: p.endpoints, jobs: p.jobs,
  exports: p.exports, needs: p.needs, tests: p.tests.map(T), depends_on: p.depends_on.map(d => 'D06-' + d), size: p.size, notes: p.notes })) };
// self-checks: every spec test exactly once, depends_on only points backwards, no dash characters
const used = P.flatMap(p => p.tests);
const dup = used.filter((x, i) => used.indexOf(x) !== i);
const missing = S.tests.map((_, i) => i).filter(i => !used.includes(i));
if (dup.length || missing.length) { console.error('test coverage error dup', dup, 'missing', missing); process.exit(1); }
out.packages.forEach((p, i) => p.depends_on.forEach(d => { if (Number(d.slice(-2)) >= i + 1) { console.error(p.id, 'depends forward on', d); process.exit(1); } }));
const txt = JSON.stringify(out, null, 1);
if (/[–—]/.test(txt)) { console.error('dash found'); process.exit(1); }
fs.writeFileSync(path.join(B, 'packages', 'D06.json'), txt + '\n');
console.log('wrote', out.packages.length, 'packages,', used.length, 'tests of', S.tests.length);

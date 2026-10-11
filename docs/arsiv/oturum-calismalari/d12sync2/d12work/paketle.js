// D12 work packages: writes packages/D12.json and checks file, test and export coverage against spec/D12.json.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D12.json'), 'utf8'));
const V = 'apps/server/src/infra/veritabani/';
const J = 'apps/server/src/jobs/veritabani/';
const F = 'apps/server/test/features/veritabani/';
const A = 'apps/server/test/steps/veritabani/';
const K = 'docker/postgres/';
const M = 'apps/server/migrations/';
const T = name => { const t = S.tests.find(x => x.name === name || x.name.startsWith(name)); if (!t) throw new Error('test yok: ' + name); return t.name; };

const P = [
  {
    title: 'Dış yüz girişi, tablo yardımcıları ve kısıt adı',
    files: [V + 'index.ts', V + 'kisit-adi.ts', V + 'tablo-yardimcilari.ts', V + 'kisit-adi.test.ts', 'apps/server/drizzle.config.ts'],
    exports: ['Islem', 'kisitAdi', 'tabloYardimcilari'], needs: [],
    tests: [T('kisitAdi')], depends_on: [], size: 'S',
    notes: 'index.ts dış yüzün tek girişi olarak Islem tipini, kisitAdi ve tabloYardimcilari ile açılır, drizzle.config.ts bütün tablolar.ts dosyalarını yükler, sonraki altyapı paketleri (P04, P05, P06, P09) index.ts\'e yalnız kendi dışa açma satırlarını ekler ve bağımlılık zinciri bunların aynı aşamaya düşmesini önler; kisitAdi fast-check özelliğiyle (63 bayt, ASCII, özet, ek) denetlenir.',
  },
  {
    title: 'Sözleşme dosyası ve saklama kuralları',
    files: ['packages/contracts/src/veritabani.ts', V + 'saklama/sureler.ts', V + 'saklama/sinir.ts', V + 'saklama/sure-sirasi.ts', V + 'saklama/sinir.test.ts', V + 'saklama/sure-sirasi.test.ts'],
    exports: [],
    needs: ['D13.hataKodlariTanimla', 'D13.rotaTanimla', 'D13.ModulAdi', 'D13.sayfaSemasi', 'D13.sayfaSorgusuSemasi', 'D13.anSemasi', 'D13.genisleyenEnum', 'D13.kimlikSemasi', 'D13.UygulamaHatasi'],
    tests: [T('Saklama: ay kırpma'), T('Saklama: süre sırası kuralı'), T('Saklama: bağımlılık sırası')], depends_on: [], size: 'M',
    notes: 'İskelette açılan veritabani.ts doldurulur (VERITABANI_HATALARI, rota ve uç şemaları, DANISMA_KATMANLARI, SAKLAMA_VERI_SINIFLARI, TABLO_ISARETLERI, GOC_BELIRTECLERI, YedekIsDurumu) ve boş sureler.ts ile takvim ayı sınırı ve süre sırası denetimi yazılır; ay kırpma, süre sırası ve bağımlılık sırası fast-check özellikleriyle denetlenir.',
  },
  {
    title: 'PostgreSQL imajı ve küme ayarları',
    files: [K + 'Dockerfile', K + 'compose.yaml', K + 'postgresql.conf', K + 'pg_hba.conf', K + 'pg_hba.test.conf', K + '.gitignore', K + 'surum-denetimi.sh'],
    exports: [], needs: [],
    tests: [T('Sürüm denetimi')], depends_on: [], size: 'M',
    notes: 'PostgreSQL 18 imajı (pgBackRest, pg_stat_statements), üretim ve postgres-test servisleri, ayar ve pg_hba dosyaları kurulur, böylece bütün modüllerin testleri aynı kümeyle koşar; surum-denetimi.sh uyuşan sürümlerde yeşil, bozulmuş kopyada VERITABANI_SURUM_UYUSMAZ ile kırmızı koşar.',
  },
  {
    title: 'Bağlantı havuzu, işlem yardımcısı, hata çevirisi ve nesil',
    files: [V + 'baglanti.ts', V + 'islem.ts', V + 'hata.ts', V + 'sema-durumu.ts', V + 'nesil.ts', V + 'nesil.test.ts',
      M + '20261012090000_veritabani_islevler/migration.sql', M + '20261012090000_veritabani_islevler/snapshot.json'],
    exports: ['veritabaniKur', 'islem', 'islemSonuKancasi', 'kisitIhlali', 'nesilOku'],
    needs: ['D13.UygulamaHatasi', 'D13.GECICI_SQLSTATELER'],
    tests: [T('Nesil kararı')], depends_on: ['D12-P01', 'D12-P02'], size: 'L',
    notes: 'veritabaniKur (rol başına havuz ve bekleme sınırları, semaDurumu), islem (yalıtım, salt okunur, zamanAsimiMs, tek yeniden deneme), islemSonuKancasi, GECICI_SQLSTATELER ile hata çevirisi, kisitIhlali ve nesil işlevleri göçüyle nesilOku yazılır, dışa açma satırları index.ts\'e eklenir; nesil kararı 10000 denemeli fast-check ile, davranış senaryoları P14 ve P17\'de denetlenir.',
  },
  {
    title: 'Danışma kilidi ve dönem bölümleri',
    files: [V + 'kilit.ts', V + 'kilit.test.ts', V + 'kurallar/elle-danisma-kilidi.grit', V + 'bolum/ac.ts', V + 'bolum/denetim.ts'],
    exports: ['danismaKilidi', 'danismaKilidiDene', 'donemBolumuAc'],
    needs: ['D13.UygulamaHatasi'],
    tests: [T('Danışma kilidi: katman tablosu ve önek')], depends_on: ['D12-P04'], size: 'M',
    notes: 'Katman ve metin sıralı danismaKilidi, beklemeyen danismaKilidiDene, elle kilit yazımını reddeden Biome kuralı, donemBolumuAc ve varsayılan bölüm denetimi yazılır, dışa açma satırları index.ts\'e eklenir; katman tablosu, bilinmeyen önek hatası ve Biome kuralı kilit.test.ts ile, eşzamanlılık senaryoları P14\'te denetlenir.',
  },
  {
    title: 'Saklama mekanizması, D12 tabloları ve gece işleri',
    files: [V + 'tablolar.ts', V + 'saklama/kayit.ts', V + 'saklama/calistir.ts', V + 'saklama/kayit.test.ts',
      J + 'index.ts', J + 'saklama-suresi.ts', J + 'donem-bolumu.ts',
      M + '20261013090000_veritabani_baslangic/migration.sql', M + '20261013090000_veritabani_baslangic/snapshot.json'],
    tables: ['geri_yukleme_kayitlari', 'saklama_islemleri'],
    jobs: ['saklama_suresi_isi', 'donem_bolumu_denetimi'],
    exports: ['saklamaIsleyicisiKaydet', 'saklamaIsleyicisiniCalistir', 'veritabaniIsleri'],
    needs: ['D13.UygulamaHatasi'],
    tests: [T('Saklama: katalog ve kayıt denetimi')], depends_on: ['D12-P02', 'D12-P05'], size: 'L',
    notes: 'İki D12 tablosu ve başlangıç göçü, saklama işleyicisi kaydı, yoklama_saklama girişiyle parti ve kanıt döngüsü, saklama_suresi_isi ile donem_bolumu_denetimi ve veritabaniIsleri yazılır, dışa açma satırları index.ts\'e eklenir; katalog ve kayıt denetimi kayit.test.ts ile, iş davranışı P16\'nın senaryolarıyla denetlenir.',
  },
  {
    title: 'Kurulum adımı ve SCRAM parola doğrulayıcısı',
    files: [V + 'goc/kurulum.ts', V + 'goc/scram.ts', V + 'goc/scram.test.ts'],
    exports: [], needs: ['D13.UygulamaHatasi'],
    tests: [T('Kurulum adımı tekrar çalıştırılabilir')], depends_on: ['D12-P02', 'D12-P03'], size: 'M',
    notes: 'Roller, veritabanları, uygulama, drizzle ve pgboss şemaları, eklenti ve varsayılan yetkiler kurulur, parola istemcide hesaplanan SCRAM doğrulayıcısıyla yalnız sırla tutmadığında yazılır; scram.test.ts postgres-test üstünde iki çalıştırmada katalogun değişmediğini ve pg_stat_statements\'ta sır kalmadığını denetler.',
  },
  {
    title: 'Göç çalıştırıcısı ve test veritabanı',
    files: [V + 'goc/calistir.ts', V + 'goc/es-zamanli-dizin.ts', V + 'goc/ayarlar.ts', 'apps/server/test/support/sifirlama.ts', 'apps/server/test/support/sifirlama.test.ts'],
    tables: ['__drizzle_migrations'],
    exports: ['testVeritabaniHazirla', 'senaryoOncesiSifirla', 'testVeritabaniAdi'],
    needs: ['D13.UygulamaHatasi'],
    tests: [T('Test veritabanı ulaşılamıyor'), T('Test veritabanı ilk açılışta hazır')], depends_on: ['D12-P01', 'D12-P04', 'D12-P07'], size: 'L',
    notes: 'veritabani:goc adımı (kurulum, oncesi-concurrently dizinleri, geçersiz dizin onarımı, 3 saniyelik kilit ve 10 basamaklı yeniden deneme) ile şablondan işçi başına test veritabanı ve senaryo öncesi sıfırlama yazılır; spec dosya listesine eklenen sifirlama.test.ts kapalı kümede VERITABANI_TEST_ULASILAMIYOR\'u ve 4 işçiyle ilk açılışı denetler.',
  },
  {
    title: 'Geri yükleme kayıtları ve yönetici ucu eklentisi',
    files: [V + 'geri-yukleme/servis.ts', V + 'geri-yukleme/eklenti.ts', V + 'geri-yukleme/servis.test.ts'],
    endpoints: ['GET /v1/veritabani/yonetim/geri-yuklemeler'],
    exports: ['geriYuklemePencereleri', 'veritabaniEklentisi'],
    needs: ['D13.rotalariKaydet', 'D13.UygulamaHatasi'],
    tests: [T('Geri yükleme pencereleri')], depends_on: ['D12-P06', 'D12-P08'], size: 'M',
    notes: 'geriYuklemePencereleri, imleçli ve salt okunur geri yükleme listesi ve rotayı rotalariKaydet ile kaydeden veritabaniEklentisi yazılır, dışa açma satırları index.ts\'e eklenir; spec dosya listesine eklenen servis.test.ts test veritabanında boş ve iki kayıtlı durumu denetler, uç senaryoları P18\'dedir.',
  },
  {
    title: 'Göç denetimi CI adımı',
    files: [V + 'goc/denetim.ts', V + 'goc/tablo-haritasi.ts', V + 'goc/squawk.toml', V + 'goc/denetim.test.ts'],
    exports: [], needs: ['D13.UygulamaHatasi'],
    tests: [T('Göç denetimi: klasör adı ve belirteç'), T('Göç denetimi: zaman sırası')], depends_on: ['D12-P02', 'D12-P08'], size: 'M',
    notes: 'CI göç denetimi (klasör adı ve belirteç, zaman sırası, katalog farkıyla modül sınırı, satır yazan göç, zaman aşımı satırları, drizzle-kit generate ve check), canonical_tables\'tan üretilen tablo haritası ve Squawk ayarı yazılır; ad ve sıra kuralları denetim.test.ts ile, katalog kuralları P15\'in senaryolarıyla denetlenir.',
  },
  {
    title: 'Yedek ortak katmanı, pgBackRest ve gecelik döküm',
    files: [K + 'pgbackrest.conf', K + 'yedek/ortak.sh', K + 'yedek/pgbackrest.sh', K + 'yedek/gecelik-dokum.sh', K + 'yedek/saklama-secimi.sh', K + 'yedek/yedek.env.ornek',
      F + 'yedek-betikleri.feature', A + 'yedek.adimlari.ts'],
    jobs: ['gecelik_pg_dump', 'xprem_birimi_yedegi', 'pgbackrest_tam_yedek', 'pgbackrest_fark_yedek', 'pgbackrest_dogrulama'],
    exports: [], needs: ['D15.TestDunyasi'],
    tests: [T('Yedek durum dosyası'), T('Yedek saklama sınırı'), T('Geri yükleme sırasında makine işi atlanır')], depends_on: ['D12-P02', 'D12-P03'], size: 'L',
    notes: 'Ortak kilit, geri yükleme işareti ve yarım kalmayan durum dosyası, pgBackRest tam, fark ve doğrulama komutları, gecelik pg_dump ile xprem birimi yedeği ve 34 günlük saklama seçimi yazılır; durum dosyası şeması, saklama sınırı ve geri yükleme sırasında atlama yedek-betikleri.feature ile denetlenir, zamanlayıcıları P20 kurar.',
  },
  {
    title: 'Kurulum, yetki ve yapılandırma senaryoları',
    files: [F + 'kurulum.feature', F + 'yetkiler.feature', F + 'yapilandirma.feature', A + 'yapilandirma.adimlari.ts',
      K + 'compose.gelistirme.yaml', K + 'pg_hba.gelistirme.conf', K + 'gelistirme-gizli-uret.sh', K + 'yedek/compose.deneme.yaml', K + 'yedek/pg_hba.deneme.conf'],
    exports: [], needs: ['D15.TestDunyasi', 'D09.denetimeYaz', 'D14.kuyruklariKur'],
    tests: [T('Kurulum boş kümede'), T('Yetki: yalnız ekleme tabloları'), T('Yetki: uygulama rolleri DDL'), T('Yetki: drizzle ve pgboss'), T('Yetki: saklama rolü'), T('Yetki: nesil işlevleri'), T('Yapılandırma denetimleri')],
    depends_on: ['D12-P06', 'D12-P07', 'D12-P08', 'D12-P11'], size: 'L',
    notes: 'Geliştirme ve deneme Compose ile pg_hba dosyaları, geliştirme sırrı üreticisi ve kurulum, rol yetkisi ve yapılandırma senaryoları yazılır; üretim pg_hba ile boş kümede kurulum, beş yetki kuralı ve docker compose config çıktısı Cucumber senaryolarıyla denetlenir.',
  },
  {
    title: 'Şema denetimi senaryoları ve kod kuralları',
    files: [F + 'sema-kurallari.feature', F + 'zaman-tipleri.feature', A + 'sema.adimlari.ts',
      V + 'kurallar/on-conflict-hedefli.grit', V + 'kurallar/sql-raw-deger.grit', V + 'kurallar/db-havuz-erisimi.grit'],
    exports: [], needs: ['D15.TestDunyasi'],
    tests: [T('Şema: sunucu kimlikleri'), T('Şema: zaman sütunları'), T('Şema: enum yok'), T('Şema: yerel ve sıralama'), T('Şema: kısıt, dizin'), T('Şema: bölünebilir'), T('Şema: public'),
      T('An gidiş dönüşü'), T('Gün metni'), T('ON CONFLICT hedefli'), T('Şema denetimleri bozulunca kırmızı')],
    depends_on: ['D12-P06', 'D12-P08', 'D12-P12'], size: 'L',
    notes: 'Göçlerle kurulmuş test veritabanının kataloğunda koşan şema kuralları, an ve gün gidiş dönüşü ile hedefsiz ON CONFLICT, değerli sql.raw ve modules altında .db ya da .havuz erişimini reddeden Biome kuralları yazılır; her şema kuralı bir kez bozulup senaryonun kırmızıya döndüğü görülür ve özgün baytlar md5 ile geri yazılır.',
  },
  {
    title: 'İşlem, havuz ve danışma kilidi senaryoları',
    files: [F + 'islem-ve-havuz.feature', F + 'danisma-kilidi.feature', F + 'islem-sonu-kancasi.feature', A + 'islem.adimlari.ts'],
    exports: [], needs: ['D15.TestDunyasi', 'D13.DenemeSecenekleri', 'D13.GECICI_SQLSTATELER', 'D13.TUM_HATALAR', 'D13.ortukKodlar', 'D13.rotaTanimla'],
    tests: [T('Havuz dolu'), T('Zaman aşımı ve salt okunur'), T('Kilitlenmede tek yeniden deneme'), T('Geçici hatalar D12 kodlarına'), T('Yalıtım seçeneği'),
      T('Danışma kilidi: tek çağrıda'), T('Danışma kilidi: artan sıra'), T('Danışma kilidi: beklemeyen deneme'), T('Danışma kilidi: geri alınan SAVEPOINT'),
      T('İşlem sonu kancası'), T('Hata kataloğu D13'), T('Ders çıkışı yükünde havuz')],
    depends_on: ['D12-P05', 'D12-P08'], size: 'L',
    notes: 'Havuz dolması, zaman aşımı, kilitlenme, geçici hata çevirisi, yalıtım, danışma kilidi sırası ve SAVEPOINT davranışı, işlem sonu kancası ve hata kataloğu senaryoları yazılır; Cucumber senaryolarıyla ve D13 deneme rotasıyla denetlenir, havuz yük ölçütü D15\'in k6 ders çıkışı koşusunda okunur.',
  },
  {
    title: 'Göç akışı ve göç denetimi senaryoları',
    files: [F + 'goc-akisi.feature', F + 'goc-denetimi.feature', A + 'goc.adimlari.ts'],
    exports: [], needs: ['D15.TestDunyasi'],
    tests: [T('Göç: kilit varken'), T('Göç: geçersiz CONCURRENTLY'), T('Göç: oncesi dosyası'),
      T('Göç denetimi: modül sınırı'), T('Göç denetimi: birleşmiş göç'), T('Göç denetimi: satır yazan'), T('Göç denetimi: zaman aşımı satırları'), T('Göç denetimi: ana dalda'), T('Göç denetimi: drizzle-kit check')],
    depends_on: ['D12-P08', 'D12-P10'], size: 'L',
    notes: 'Kilit merdiveni, geçersiz CONCURRENTLY dizin onarımı ve oncesi dosyası atlama senaryoları ile modül sınırı, değişmezlik, satır yazma, zaman aşımı, üretim farkı ve snapshot zinciri denetimi senaryoları yazılır; sahte uyku, geçici git dalları ve ayrı veritabanlarıyla Cucumber üstünde denetlenir.',
  },
  {
    title: 'Saklama senaryoları',
    files: [F + 'saklama.feature', A + 'saklama.adimlari.ts'],
    exports: [], needs: ['D15.TestDunyasi', 'D14.isGonder', 'D14.isTanimla'],
    tests: [T('Saklama: süre yokken dokunmaz'), T('Saklama: sınır bir kez'), T('Saklama: işleyicisiz sınıf'), T('Saklama: test yardımcısı'), T('İş tanımları D14')],
    depends_on: ['D12-P06', 'D12-P08'], size: 'M',
    notes: 'Süre yokken dokunmama, takvim ayıyla tek sınır ve kanıttan sürme, işleyicisiz sınıf, yoklama_saklama yolunun aynılığı ve iş tanımlarının isTanimla\'dan geçmesi senaryoları yazılır; örnek işleyici ve sahte saatle Cucumber üstünde denetlenir.',
  },
  {
    title: 'Sıfırlama, hazırlık, bölüm ve log gizliliği senaryoları',
    files: [F + 'test-sifirlama.feature', F + 'nesil-ve-hazirlik.feature', F + 'log-gizliligi.feature', A + 'sifirlama.adimlari.ts'],
    exports: [], needs: ['D15.TestDunyasi'],
    tests: [T('Senaryo öncesi sıfırlama'), T('Hazırlık: geride değil'), T('Dönem bölümü açma'), T('Log gizliliği')],
    depends_on: ['D12-P05', 'D12-P08'], size: 'M',
    notes: 'Senaryo öncesi sıfırlamanın pgboss\'a dokunmaması, semaDurumu hazırlığı, dönem bölümü açma ve pino ile PostgreSQL loglarında değer bulunmaması senaryoları yazılır; sürücü kancası ve log taramasıyla Cucumber üstünde denetlenir.',
  },
  {
    title: 'Geri yükleme komutu, iptaller ve yönetici ucu senaryoları',
    files: ['apps/server/src/cli/geri-yukleme.ts', 'apps/server/src/cli/geri-yukleme-iptaller.ts', F + 'geri-yuklemeler-ucu.feature', F + 'geri-yukleme-iptalleri.feature', A + 'geri-yukleme.adimlari.ts'],
    exports: [],
    needs: ['D01.kimlikDinleyicileriniKur', 'D01.kimlikDinleyicileriHazir', 'D01.hesabiSil', 'D01.oturumlariKapat', 'D02.derslerKimlikDinleyicisi', 'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D15.kimlikOlayiDinleyicisi', 'D15.TestDunyasi'],
    tests: [T('Uç: yönetici listeyi'), T('Uç: yetki ve imleç'), T('Geri yükleme kaydı aynı nesli'), T('Geri yükleme iptalleri'), T('Koruma kodu bozulunca kırmızı')],
    depends_on: ['D12-P09', 'D12-P14', 'D12-P15', 'D12-P16'], size: 'L',
    notes: 'Bileşim kökü cli/geri-yukleme (doğrula, kaydet, dört kimlik abonesiyle iptaller) ve yönetici ucu senaryoları yazılır; uç, kayıt ve iptal senaryoları Cucumber ile denetlenir, ardından koruma kodları tek tek kaldırılıp ilgili senaryonun kırmızıya döndüğü görülür ve özgün baytlar md5 ile geri yazılır.',
  },
  {
    title: 'Geri yükleme betiği ve aylık deneme',
    files: [K + 'yedek/geri-yukle.sh', K + 'yedek/geri-yukleme-denemesi.sh', K + 'geri-yukleme-kilavuzu.md'],
    jobs: ['geri_yukleme_denemesi'],
    exports: [], needs: [],
    tests: [T('Geri yükleme denemesi')], depends_on: ['D12-P11', 'D12-P12', 'D12-P18'], size: 'L',
    notes: 'Trafiği kapatıp nesil, göç, kayıt ve iptallerden sonra açan geri-yukle.sh, ayrı Compose projesinde PITR ve döküm dönüşünü sınayan aylık deneme ve geri yükleme kılavuzu yazılır; geri-yukleme-denemesi.sh gerçek yedekten koşup nesil, pg_amcheck, satır sayısı ve anahtar kurallarını raporlar.',
  },
  {
    title: 'Makine zamanlayıcıları ve takvim denetimi',
    files: ['service', 'timer'].flatMap(u => ['pgbackrest-tam', 'pgbackrest-fark', 'pgbackrest-dogrulama', 'dokum', 'geri-yukleme-denemesi'].map(n => K + 'zamanlayici/iu-yoklama-' + n + '.' + u)).concat([K + 'zamanlayici/kur.sh', K + 'zamanlayici/takvim-denetimi.sh']),
    exports: [], needs: [],
    tests: [T('Zamanlayıcılar İstanbul saatiyle')], depends_on: ['D12-P11', 'D12-P19'], size: 'S',
    notes: 'Beş makine işinin systemd service ve timer dosyaları ile kurulum betiği yazılır; takvim-denetimi.sh her timer\'da Europe/Istanbul ve Persistent=true olduğunu, systemd-analyze ile döküm saatinin 23:15 UTC ve denemenin ayın ilk cumartesisi olduğunu denetler.',
  },
];

const out = { id: 'D12', packages: P.map((p, i) => ({
  id: 'D12-P' + String(i + 1).padStart(2, '0'), title: p.title, files: p.files,
  tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [], exports: p.exports, needs: p.needs,
  tests: p.tests, depends_on: p.depends_on, size: p.size, notes: p.notes,
})) };

// own coverage checks beyond schedule.js: every spec test once, every spec file once, no unknown test, extra files listed
const errs = [];
const seenT = new Map(), seenF = new Map();
for (const p of out.packages) {
  for (const t of p.tests) { if (seenT.has(t)) errs.push('test iki kez: ' + t); seenT.set(t, p.id); }
  for (const f of p.files) { if (seenF.has(f)) errs.push('dosya iki kez: ' + f); seenF.set(f, p.id); }
  for (const d of p.depends_on) if (Number(d.slice(-2)) >= Number(p.id.slice(-2))) errs.push(p.id + ' ileri bağımlılık ' + d);
}
for (const t of S.tests) if (!seenT.has(t.name)) errs.push('pakette olmayan test: ' + t.name);
const specFiles = new Set(S.files.map(f => typeof f === 'string' ? f : f.path));
for (const f of specFiles) if (!seenF.has(f)) errs.push('pakette olmayan dosya: ' + f);
const extra = [...seenF.keys()].filter(f => !specFiles.has(f) && !/^apps\/server\/migrations\//.test(f));
if (/[–—]/.test(JSON.stringify(out))) errs.push('U+2013 ya da U+2014 var');
fs.writeFileSync(path.join(B, 'packages', 'D12.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`paket ${out.packages.length}, test ${seenT.size}/${S.tests.length}, spec dosyası ${[...specFiles].filter(f => seenF.has(f)).length}/${specFiles.size}, ek dosya: ${extra.join(', ')}`);
console.log('boy: ' + JSON.stringify(out.packages.reduce((o, p) => (o[p.size] = (o[p.size] || 0) + 1, o), {})));
if (errs.length) { console.log('HATALAR:\n' + errs.join('\n')); process.exit(1); }
console.log('kapsam tamam');

// Builds the restructured D12 package list from the old one, reusing exact file and test strings.
// node build.js <old D12.json> <out D12.json>
const fs = require('fs');
const [, , oldPath, outPath] = process.argv;
const old = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const allFiles = new Set(old.packages.flatMap(p => p.files));
const allTests = new Set(old.packages.flatMap(p => p.tests));
const usedF = new Set(), usedT = new Set();
const F = list => list.map(f => {
  const full = f.includes('/') && (f.startsWith('apps/') || f.startsWith('docker/') || f.startsWith('packages/')) ? f : null;
  if (!full) throw new Error('bad path ' + f);
  if (!allFiles.has(full) && !NEW_FILES.includes(full)) throw new Error('unknown file ' + full);
  if (usedF.has(full)) throw new Error('file twice ' + full);
  usedF.add(full); return full;
});
const T = list => list.map(t => {
  if (!allTests.has(t)) throw new Error('unknown test ' + t);
  if (usedT.has(t)) throw new Error('test twice ' + t);
  usedT.add(t); return t;
});
const V = 'apps/server/src/infra/veritabani/';
const NEW_FILES = [V + 'kurallar/kurallar.test.ts', 'apps/server/src/jobs/veritabani/index.test.ts'];
const pk = (n, o) => ({
  id: 'D12-P' + String(n).padStart(2, '0'), title: o.title, files: F(o.files), tables: o.tables || [], endpoints: o.endpoints || [],
  jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: T(o.tests), depends_on: (o.dep || []).map(d => 'D12-P' + String(d).padStart(2, '0')),
  size: o.size, notes: o.notes,
});
const P = [];
P.push(pk(1, {
  title: 'Dış yüz girişi, tablo yardımcıları, kısıt adı ve ortak SQL işlevleri',
  files: [V + 'index.ts', V + 'kisit-adi.ts', V + 'tablo-yardimcilari.ts', V + 'kisit-adi.test.ts', 'apps/server/drizzle.config.ts',
    'apps/server/migrations/20261012090000_veritabani_islevler/migration.sql', 'apps/server/migrations/20261012090000_veritabani_islevler/snapshot.json'],
  exports: ['Islem', 'kisitAdi', 'tabloYardimcilari'], tests: ['kisitAdi'], size: 'M',
  notes: 'index.ts dış yüzün tek girişi olarak Islem tipini, kisitAdi ve tabloYardimcilari ile açılır, sonraki altyapı paketleri index.ts\'e yalnız kendi dışa açma satırlarını ekler; drizzle.config.ts bütün tablolar.ts dosyalarını yükler. veritabani_islevler göçü (uygulama.veritabani_degismez_sutun() tetikleyici işlevi ve nesil okuma işlevleri, yoklama_sahip sahipli SECURITY DEFINER, uygulama rollerine yalnız EXECUTE) bilerek burada: D02 kendi göçünde bu tetikleyici işlevini bağlar ve yalnız bu paketin dışa açtıklarını bekler, işlev göçü böylece her tablo göçünden önce gelir. kisitAdi fast-check özelliğiyle (63 bayt, ASCII, özet, ek) denetlenir. Hiçbir şey beklemez.',
}));
P.push(pk(2, {
  title: 'Kod kuralları: hedefli ON CONFLICT, değersiz sql.raw ve modül havuz erişimi',
  files: [V + 'kurallar/on-conflict-hedefli.grit', V + 'kurallar/sql-raw-deger.grit', V + 'kurallar/db-havuz-erisimi.grit', V + 'kurallar/kurallar.test.ts'],
  tests: ['ON CONFLICT hedefli'], size: 'S',
  notes: 'Hedefsiz onConflictDoNothing ve onConflictDoUpdate ile hedefsiz ham ON CONFLICT\'i, sql.raw\'a değer vermeyi ve modules altında .db ya da .havuz erişimini reddeden üç Biome kuralı yazılır; spec dosya listesine eklenen kurallar.test.ts her kuralı reddedilen ve geçen örnekle (yer kontrolü) ve depo taramasıyla denetler. Kurallar ilk aşamada geldiğinden öbür modüllerin kodu baştan bu kurallarla yazılır. Hiçbir şey beklemez.',
}));
P.push(pk(3, {
  title: 'PostgreSQL imajı ve küme ayarları',
  files: ['docker/postgres/Dockerfile', 'docker/postgres/compose.yaml', 'docker/postgres/postgresql.conf', 'docker/postgres/pg_hba.conf', 'docker/postgres/pg_hba.test.conf', 'docker/postgres/.gitignore', 'docker/postgres/surum-denetimi.sh'],
  tests: ['Sürüm denetimi'], size: 'M',
  notes: 'PostgreSQL 18 imajı (pgBackRest, pg_stat_statements), üretim ve postgres-test servisleri, ayar ve pg_hba dosyaları kurulur, böylece bütün modüllerin testleri aynı kümeyle koşar; surum-denetimi.sh uyuşan sürümlerde yeşil, bozulmuş kopyada VERITABANI_SURUM_UYUSMAZ ile kırmızı koşar. Hiçbir şey beklemez.',
}));
P.push(pk(4, {
  title: 'Sözleşme dosyası, hata çevirisi, nesil ve şema durumu',
  files: ['packages/contracts/src/veritabani.ts', V + 'hata.ts', V + 'nesil.ts', V + 'nesil.test.ts', V + 'sema-durumu.ts'],
  exports: ['kisitIhlali', 'nesilOku'],
  needs: ['D13.hataKodlariTanimla', 'D13.rotaTanimla', 'D13.ModulAdi', 'D13.sayfaSemasi', 'D13.sayfaSorgusuSemasi', 'D13.anSemasi', 'D13.genisleyenEnum', 'D13.kimlikSemasi', 'D13.UygulamaHatasi', 'D13.GECICI_SQLSTATELER'],
  tests: ['Nesil kararı'], dep: [1], size: 'L',
  notes: 'İskelette açılan veritabani.ts doldurulur (VERITABANI_HATALARI, rota ve uç şemaları, DANISMA_KATMANLARI, SAKLAMA_VERI_SINIFLARI, TABLO_ISARETLERI, GOC_BELIRTECLERI, YedekIsDurumu). Aynı pakette yalnız sözleşmeyi ve Islem tipini kullanan üç dosya yazılır, böylece işlem çekirdeği bir aşama erken başlar: GECICI_SQLSTATELER ile hata çevirisi ve kisitIhlali (hata.ts), nesilOku (nesil.ts, işlevleri P01\'in göçünde) ve göç klasörüyle defteri ve nesli okuyan şema durumu (sema-durumu.ts). Dışa açma satırları index.ts\'e eklenir; nesil kararı 10000 denemeli fast-check ile denetlenir. Sözleşme rota tanımı için D13.rotaTanimla\'yı bekler, başka bekleme yoktur.',
}));
P.push(pk(5, {
  title: 'Bağlantı havuzu, işlem yardımcısı ve danışma kilidi',
  files: [V + 'baglanti.ts', V + 'islem.ts', V + 'kilit.ts', V + 'kilit.test.ts', V + 'kurallar/elle-danisma-kilidi.grit'],
  exports: ['veritabaniKur', 'islem', 'islemSonuKancasi', 'danismaKilidi', 'danismaKilidiDene'],
  needs: ['D13.UygulamaHatasi'],
  tests: ['Danışma kilidi: katman tablosu ve önek'], dep: [1, 4], size: 'L',
  notes: 'veritabaniKur (rol başına havuz ve bekleme sınırları, semaDurumu), islem (yalıtım, salt okunur, zamanAsimiMs, tek yeniden deneme, işlem bağlamı ve SAVEPOINT izi), islemSonuKancasi, katman ve metin sıralı danismaKilidi, beklemeyen danismaKilidiDene ve elle kilit yazımını reddeden Biome kuralı yazılır, dışa açma satırları index.ts\'e eklenir. Kilit islem.ts\'in işlem bağlamını okuduğundan (geri alınan SAVEPOINT\'in izi, yeniden denemede silinen iz) aynı pakettedir; ayrılırsa en çok beklenen iki dış yüz bir aşama geç kalır. Katman tablosu, bilinmeyen önek hatası ve Biome kuralı kilit.test.ts ile, davranış senaryoları P14\'te denetlenir.',
}));
P.push(pk(6, {
  title: 'Saklama kuralları ve dönem bölümleri',
  files: [V + 'saklama/sureler.ts', V + 'saklama/sinir.ts', V + 'saklama/sure-sirasi.ts', V + 'saklama/sinir.test.ts', V + 'saklama/sure-sirasi.test.ts', V + 'bolum/ac.ts', V + 'bolum/denetim.ts'],
  exports: ['donemBolumuAc'], needs: ['D13.UygulamaHatasi'],
  tests: ['Saklama: ay kırpma', 'Saklama: süre sırası kuralı', 'Saklama: bağımlılık sırası'], dep: [1, 4], size: 'M',
  notes: 'Boş sureler.ts ile takvim ayı sınırı ve süre sırası ve bağımlılık sırası denetimi, donemBolumuAc ve varsayılan bölüm denetimi yazılır, dışa açma satırı index.ts\'e eklenir. Hepsi yalnız sözleşmeyi ve Islem tipini kullanır, işlem yardımcısını beklemez. Ay kırpma, süre sırası ve bağımlılık sırası fast-check özellikleriyle, dönem bölümü açma P17\'nin senaryosuyla denetlenir.',
}));
P.push(pk(7, {
  title: 'Kurulum adımı ve SCRAM parola doğrulayıcısı',
  files: [V + 'goc/kurulum.ts', V + 'goc/scram.ts', V + 'goc/scram.test.ts'],
  needs: ['D13.UygulamaHatasi'],
  tests: ['Kurulum adımı tekrar çalıştırılabilir ve parola sızdırmaz'], dep: [3, 4], size: 'M',
  notes: 'Roller, veritabanları, uygulama, drizzle ve pgboss şemaları, eklenti ve varsayılan yetkiler kurulur, parola istemcide hesaplanan SCRAM doğrulayıcısıyla yalnız sırla tutmadığında yazılır; scram.test.ts postgres-test üstünde iki çalıştırmada katalogun değişmediğini ve pg_stat_statements\'ta sır kalmadığını denetler. Hata kodları için sözleşmeyi, test için P03\'ün kümesini bekler.',
}));
P.push(pk(8, {
  title: 'Saklama kaydı, çalıştırıcısı ve D12 tabloları',
  files: [V + 'tablolar.ts', V + 'saklama/kayit.ts', V + 'saklama/calistir.ts', V + 'saklama/kayit.test.ts',
    'apps/server/migrations/20261013090000_veritabani_baslangic/migration.sql', 'apps/server/migrations/20261013090000_veritabani_baslangic/snapshot.json'],
  tables: ['geri_yukleme_kayitlari', 'saklama_islemleri'],
  exports: ['saklamaIsleyicisiKaydet', 'saklamaIsleyicisiniCalistir'], needs: ['D13.UygulamaHatasi'],
  tests: ['Saklama: katalog ve kayıt denetimi'], dep: [1, 4, 5, 6], size: 'M',
  notes: 'İki D12 tablosu ve başlangıç göçü, saklama işleyicisi kaydı ve yoklama_saklama girişiyle bölüm kaldırma, parti ve kanıt döngüsünü işle aynı yoldan koşan saklamaIsleyicisiniCalistir yazılır, dışa açma satırları index.ts\'e eklenir. Gece işleri ayrı pakette (P10) olduğundan modüllerin beklediği iki saklama dış yüzü işleri beklemez. Katalog ve kayıt denetimi kayit.test.ts ile, çalıştırma davranışı P16\'nın senaryolarıyla denetlenir.',
}));
P.push(pk(9, {
  title: 'Göç çalıştırıcısı ve test veritabanı',
  files: [V + 'goc/calistir.ts', V + 'goc/es-zamanli-dizin.ts', V + 'goc/ayarlar.ts', 'apps/server/test/support/sifirlama.ts', 'apps/server/test/support/sifirlama.test.ts'],
  tables: ['__drizzle_migrations'],
  exports: ['testVeritabaniHazirla', 'senaryoOncesiSifirla', 'testVeritabaniAdi'], needs: ['D13.UygulamaHatasi'],
  tests: ['Test veritabanı ulaşılamıyor', 'Test veritabanı ilk açılışta hazır'], dep: [3, 4, 5, 7], size: 'L',
  notes: 'veritabani:goc adımı (kurulum, oncesi-concurrently dizinleri, geçersiz dizin onarımı, 3 saniyelik kilit ve 10 basamaklı yeniden deneme) ile şablondan işçi başına test veritabanı ve senaryo öncesi sıfırlama yazılır. Öbür modüllerin beklediği test desteği budur ve uygulama bileşimini beklemez: yalnız kurulum adımını, sözleşmeyi ve sifirlama.test.ts\'in açtığı havuzlar için veritabaniKur\'u kullanır. Spec dosya listesine eklenen sifirlama.test.ts kapalı kümede VERITABANI_TEST_ULASILAMIYOR\'u ve 4 işçiyle ilk açılışı ve bağlantı sayısını denetler.',
}));
P.push(pk(10, {
  title: 'Gece işleri: saklama süresi ve dönem bölümü denetimi',
  files: ['apps/server/src/jobs/veritabani/index.ts', 'apps/server/src/jobs/veritabani/saklama-suresi.ts', 'apps/server/src/jobs/veritabani/donem-bolumu.ts', 'apps/server/src/jobs/veritabani/index.test.ts'],
  jobs: ['saklama_suresi_isi', 'donem_bolumu_denetimi'],
  exports: ['veritabaniIsleri'], needs: ['D13.UygulamaHatasi', 'D14.isTanimla'],
  tests: ['İş tanımları D14 kurallarına uyar'], dep: [5, 6, 8], size: 'M',
  notes: 'saklama_suresi_isi (açılış denetimi, sınıf sırası, sınıf başına saklamaIsleyicisiniCalistir, iptalde iki parti arasında durma) ile donem_bolumu_denetimi ve ikisini D14 isTanimla girdisi biçiminde döndüren veritabaniIsleri yazılır; D12 kodu D14\'ü içe aktarmaz. Spec dosya listesine eklenen index.test.ts iki öğeyi D14.isTanimla\'dan geçirir (boş strict veri, exclusive, süre aşımı, deneme, cron ve D14-B05 penceresi), iş davranışı P16\'nın senaryolarıyla denetlenir.',
}));
P.push(pk(11, {
  title: 'Göç denetimi CI adımı',
  files: [V + 'goc/denetim.ts', V + 'goc/tablo-haritasi.ts', V + 'goc/squawk.toml', V + 'goc/denetim.test.ts'],
  needs: ['D13.UygulamaHatasi'],
  tests: ['Göç denetimi: klasör adı ve belirteç', 'Göç denetimi: zaman sırası'], dep: [1, 4, 9], size: 'M',
  notes: 'CI göç denetimi (klasör adı ve belirteç, zaman sırası, göç çalıştırıcısıyla kurulan katalog farkıyla sahiplik, satır yazan göç, zaman aşımı satırları, drizzle.config.ts ile drizzle-kit generate ve check), canonical_tables\'tan üretilen tablo haritası ve Squawk ayarı yazılır; ad ve sıra kuralları denetim.test.ts ile, katalog kuralları P15\'in senaryolarıyla denetlenir.',
}));
P.push(pk(12, {
  title: 'Geri yükleme kayıtları ve yönetici ucu eklentisi',
  files: [V + 'geri-yukleme/servis.ts', V + 'geri-yukleme/eklenti.ts', V + 'geri-yukleme/servis.test.ts'],
  endpoints: ['GET /v1/veritabani/yonetim/geri-yuklemeler'],
  exports: ['geriYuklemePencereleri', 'veritabaniEklentisi'], needs: ['D13.rotalariKaydet', 'D13.UygulamaHatasi'],
  tests: ['Geri yükleme pencereleri'], dep: [4, 5, 8, 9], size: 'M',
  notes: 'geriYuklemePencereleri, imleçli ve salt okunur geri yükleme listesi ve rotayı rotalariKaydet ile kaydeden veritabaniEklentisi yazılır, dışa açma satırları index.ts\'e eklenir; spec dosya listesine eklenen servis.test.ts test veritabanında boş ve iki kayıtlı durumu denetler, uç senaryoları P20\'dedir.',
}));
P.push(pk(13, {
  title: 'Yedek ortak katmanı, pgBackRest ve gecelik döküm',
  files: ['docker/postgres/pgbackrest.conf', 'docker/postgres/yedek/ortak.sh', 'docker/postgres/yedek/pgbackrest.sh', 'docker/postgres/yedek/gecelik-dokum.sh', 'docker/postgres/yedek/saklama-secimi.sh', 'docker/postgres/yedek/yedek.env.ornek',
    'apps/server/test/features/veritabani/yedek-betikleri.feature', 'apps/server/test/steps/veritabani/yedek.adimlari.ts'],
  jobs: ['gecelik_pg_dump', 'xprem_birimi_yedegi', 'pgbackrest_tam_yedek', 'pgbackrest_fark_yedek', 'pgbackrest_dogrulama'],
  needs: ['D15.TestDunyasi'],
  tests: ['Yedek durum dosyası', 'Yedek saklama sınırı', 'Geri yükleme sırasında makine işi atlanır'], dep: [3, 4], size: 'L',
  notes: 'Ortak kilit, geri yükleme işareti ve yarım kalmayan durum dosyası, pgBackRest tam, fark ve doğrulama komutları, gecelik pg_dump ile xprem birimi yedeği ve 34 günlük saklama seçimi yazılır; durum dosyası şeması (sözleşmedeki YedekIsDurumu), saklama sınırı ve geri yükleme sırasında atlama (kilit ve işaret ortak.sh ile tutulur) yedek-betikleri.feature ile denetlenir. Zamanlayıcılar P22\'de, geri yükleme betiği P21\'dedir.',
}));
P.push(pk(14, {
  title: 'İşlem, havuz ve danışma kilidi senaryoları',
  files: ['apps/server/test/features/veritabani/islem-ve-havuz.feature', 'apps/server/test/features/veritabani/danisma-kilidi.feature', 'apps/server/test/features/veritabani/islem-sonu-kancasi.feature', 'apps/server/test/steps/veritabani/islem.adimlari.ts'],
  needs: ['D15.TestDunyasi', 'D13.apiKur', 'D13.DenemeSecenekleri', 'D13.GECICI_SQLSTATELER', 'D13.TUM_HATALAR', 'D13.ortukKodlar', 'D13.rotaTanimla'],
  tests: ['Havuz dolu: API\'de 2 saniyede 503', 'Zaman aşımı ve salt okunur', 'Kilitlenmede tek yeniden deneme', 'Geçici hatalar D12 kodlarına çevrilir', 'Yalıtım seçeneği',
    'Danışma kilidi: tek çağrıda katman ve metin sırası', 'Danışma kilidi: artan sıra kuralı', 'Danışma kilidi: beklemeyen deneme', 'Danışma kilidi: geri alınan SAVEPOINT ve paylaşımlı kip',
    'İşlem sonu kancası', 'Hata kataloğu D13\'e uyar', 'Ders çıkışı yükünde havuz'],
  dep: [5, 9], size: 'L',
  notes: 'Havuz dolması, zaman aşımı, kilitlenme, geçici hata çevirisi, yalıtım, danışma kilidi sırası ve SAVEPOINT davranışı, işlem sonu kancası ve hata kataloğu senaryoları yazılır. API\'li senaryolar uygulamanın bütününü değil, yalnız D13.apiKur ile kurulan ve deneme rotası taşıyan bir API\'yi ve kendi test veritabanını kullanır; havuz yük ölçütü D15\'in k6 ders çıkışı koşusunda okunur.',
}));
P.push(pk(15, {
  title: 'Göç akışı ve göç denetimi senaryoları',
  files: ['apps/server/test/features/veritabani/goc-akisi.feature', 'apps/server/test/features/veritabani/goc-denetimi.feature', 'apps/server/test/steps/veritabani/goc.adimlari.ts'],
  needs: ['D15.TestDunyasi'],
  tests: ['Göç: kilit varken 3 saniyede düşer, birlikte geri alınır, yeniden denenir', 'Göç: geçersiz CONCURRENTLY dizini bir kez yeniden açılır', 'Göç: oncesi dosyası henüz olmayan hedefte atlanır',
    'Göç denetimi: sahiplik', 'Göç denetimi: birleşmiş göç değişmez', 'Göç denetimi: satır yazan göç', 'Göç denetimi: zaman aşımı satırları', 'Göç denetimi: ana dalda üretim farkı yok', 'Göç denetimi: drizzle-kit check ve yeniden dayanma'],
  dep: [1, 9, 11], size: 'L',
  notes: 'Kilit merdiveni, geçersiz CONCURRENTLY dizin onarımı ve oncesi dosyası atlama senaryoları ile sahiplik, değişmezlik, satır yazma, zaman aşımı, üretim farkı ve snapshot zinciri denetimi senaryoları yazılır; sahte uyku, geçici git dalları ve ayrı veritabanlarıyla Cucumber üstünde denetlenir.',
}));
P.push(pk(16, {
  title: 'Saklama senaryoları ve koruma kodu mutasyonu',
  files: ['apps/server/test/features/veritabani/saklama.feature', 'apps/server/test/steps/veritabani/saklama.adimlari.ts'],
  needs: ['D15.TestDunyasi', 'D14.isGonder'],
  tests: ['Saklama: süre yokken dokunmaz', 'Saklama: sınır bir kez, takvim ayıyla', 'Saklama: işleyicisiz sınıf', 'Saklama: test yardımcısı işle aynı yoldan', 'Koruma kodu bozulunca kırmızı'],
  dep: [8, 9, 10, 14, 15], size: 'L',
  notes: 'Süre yokken dokunmama, takvim ayıyla tek sınır ve kanıttan sürme, işleyicisiz sınıf ve yoklama_saklama yolunun aynılığı senaryoları örnek işleyici ve sahte saatle yazılır. Koruma kodu mutasyonu burada koşar, çünkü kaldırılan korumaların senaryoları (P14 işlem ve kilit, P15 göç, bu paketin saklaması, birim testleri) bu noktada hazırdır: her koruma tek tek kaldırılır, ilgili senaryonun kırmızıya döndüğü görülür ve özgün baytlar md5 ile geri yazılır.',
}));
P.push(pk(17, {
  title: 'Sıfırlama, hazırlık, bölüm, zaman tipleri ve log gizliliği senaryoları',
  files: ['apps/server/test/features/veritabani/test-sifirlama.feature', 'apps/server/test/features/veritabani/nesil-ve-hazirlik.feature', 'apps/server/test/features/veritabani/log-gizliligi.feature', 'apps/server/test/features/veritabani/zaman-tipleri.feature', 'apps/server/test/steps/veritabani/sifirlama.adimlari.ts'],
  needs: ['D15.TestDunyasi', 'D13.apiKur', 'D13.DenemeSecenekleri'],
  tests: ['Senaryo öncesi sıfırlama', 'Hazırlık: geride değil, ileride hazır', 'Dönem bölümü açma', 'Log gizliliği', 'An gidiş dönüşü', 'Gün metni'],
  dep: [1, 5, 6, 9], size: 'L',
  notes: 'Senaryo öncesi sıfırlamanın pgboss\'a dokunmaması, semaDurumu hazırlığı, dönem bölümü açma, pino ile PostgreSQL loglarında değer bulunmaması ve tabloYardimcilari an ve gün sütunlarının iki saat diliminde gidiş dönüşü senaryoları yazılır; sürücü kancası, log taraması ve fast-check ile kendi test veritabanında denetlenir; log gizliliği senaryosu uygulamanın bütününü değil, D13.apiKur ile kurulan ve 23505, 22P02 ve yavaş sorgu üreten deneme rotası taşıyan bir API\'yi kullanır. Zaman tipleri senaryoları katalog değil sütun gidiş dönüşü olduğundan şema paketinden buraya alındı.',
}));
P.push(pk(18, {
  title: 'Kurulum ve yapılandırma senaryoları, geliştirme ve deneme kümeleri',
  files: ['apps/server/test/features/veritabani/kurulum.feature', 'apps/server/test/features/veritabani/yapilandirma.feature', 'apps/server/test/steps/veritabani/yapilandirma.adimlari.ts',
    'docker/postgres/compose.gelistirme.yaml', 'docker/postgres/pg_hba.gelistirme.conf', 'docker/postgres/gelistirme-gizli-uret.sh', 'docker/postgres/yedek/compose.deneme.yaml', 'docker/postgres/yedek/pg_hba.deneme.conf'],
  needs: ['D15.TestDunyasi'],
  tests: ['Kurulum boş kümede, üretim pg_hba ile', 'Yapılandırma denetimleri'], dep: [3, 7, 13], size: 'M',
  notes: 'Geliştirme ve deneme Compose ile pg_hba dosyaları, geliştirme sırrı üreticisi, boş kümede üretim pg_hba ile kurulum senaryosu ve docker compose config denetimleri yazılır. Deneme kümesi dosyaları burada olduğundan aylık deneme (P21) yetki senaryolarını ve iş kuyruğu kur adımını beklemez; yapılandırma denetimi pgbackrest.conf için P13\'ü bekler.',
}));
P.push(pk(19, {
  title: 'Şema ve yetki denetimleri',
  files: ['apps/server/test/features/veritabani/sema-kurallari.feature', 'apps/server/test/features/veritabani/yetkiler.feature', 'apps/server/test/steps/veritabani/sema.adimlari.ts'],
  needs: ['D15.TestDunyasi', 'D09.denetimeYaz', 'D14.kuyruklariKur'],
  tests: ['Şema: sunucu kimlikleri uuidv7() varsayılanlı', 'Şema: zaman sütunları tipten denetlenir', 'Şema: enum yok, durum CHECK\'leri sözleşmeyle aynı', 'Şema: yerel ve sıralama kuralı',
    'Şema: kısıt, dizin ve tetikleyici adları', 'Şema: bölünebilir tablolarda donem_id', 'Şema: public\'te tablo yok, dizinsiz yabancı anahtar bilerek kabul',
    'Yetki: yalnız ekleme tabloları', 'Yetki: uygulama rolleri DDL ve TRUNCATE yapamaz, dizileri kullanır', 'Yetki: drizzle ve pgboss şemaları', 'Yetki: saklama rolü ayrı girişle', 'Yetki: nesil işlevleri uygulama rolüyle çalışır',
    'Şema denetimleri bozulunca kırmızı'],
  dep: [1, 4, 5, 8, 9], size: 'L',
  notes: 'D12-B11\'in katalog testi: göçlerle kurulmuş test veritabanının kataloğunda TABLO_ISARETLERI\'yle iki yönlü şema kuralları ve rol yetkisi senaryoları yazılır, her şema kuralı bir kez bozulup senaryonun kırmızıya döndüğü görülür ve özgün baytlar md5 ile geri yazılır. Yalnız iki gerçek bekleme vardır: pgboss yetki senaryosu D14\'ün kur adımını (kuyruklariKur) çalıştırır, saklama rolü senaryosu D09.denetimeYaz\'ı çağırır. Hiçbir paket bunu beklemez. Katalog bütün modüllerin işaretli tablolarını içerdiğinde anlamlıdır.',
}));
P.push(pk(20, {
  title: 'Geri yükleme komutu, iptaller ve yönetici ucu senaryoları',
  files: ['apps/server/src/cli/geri-yukleme.ts', 'apps/server/src/cli/geri-yukleme-iptaller.ts', 'apps/server/test/features/veritabani/geri-yuklemeler-ucu.feature', 'apps/server/test/features/veritabani/geri-yukleme-iptalleri.feature', 'apps/server/test/steps/veritabani/geri-yukleme.adimlari.ts'],
  needs: ['D01.kimlikDinleyicileriniKur', 'D01.kimlikDinleyicileriHazir', 'D01.hesabiSil', 'D01.oturumlariKapat', 'D02.derslerKimlikDinleyicisi', 'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D15.kimlikOlayiDinleyicisi', 'D15.TestDunyasi', 'D13.apiKur', 'D13.DenemeSecenekleri'],
  tests: ['Uç: yönetici listeyi yeniden eskiye alır', 'Uç: yetki ve imleç hataları', 'Geri yükleme kaydı aynı nesli kabul etmez, tekrar çalışır', 'Geri yükleme iptalleri'],
  dep: [5, 8, 9, 12], size: 'L',
  notes: 'Bileşim kökü cli/geri-yukleme (doğrula, kaydet, dört kimlik abonesiyle iptaller) ve yönetici ucu senaryoları yazılır; uç senaryoları D13.apiKur ile kurulan ve deneme oturumu taşıyan API\'de, kayıt ve iptal senaryoları Cucumber ile denetlenir. D01, D02, D06, D11 ve D15 beklemeleri bileşim kökünün gerçek çağrılarıdır. Koruma kodu mutasyonu P16\'ya taşındı, bu paket öbür senaryo paketlerini beklemez.',
}));
P.push(pk(21, {
  title: 'Geri yükleme betiği ve aylık deneme',
  files: ['docker/postgres/yedek/geri-yukle.sh', 'docker/postgres/yedek/geri-yukleme-denemesi.sh', 'docker/postgres/geri-yukleme-kilavuzu.md'],
  jobs: ['geri_yukleme_denemesi'],
  tests: ['Geri yükleme denemesi'], dep: [13, 18, 20], size: 'L',
  notes: 'Trafiği kapatıp nesil, göç, kayıt ve iptallerden sonra açan geri-yukle.sh (ortak.sh ve pgbackrest.sh\'yi kullanır, cli/geri-yukleme\'yi çağırır), ayrı Compose projesinde (P18\'in deneme dosyaları) PITR ve döküm dönüşünü sınayan aylık deneme ve geri yükleme kılavuzu yazılır; geri-yukleme-denemesi.sh gerçek yedekten koşup nesil, pg_amcheck, satır sayısı ve anahtar kurallarını raporlar. Deneme API, Mailpit ve xprem açan uçtan uca bir koşudur, bu yüzden geri yükleme komutunu bekler.',
}));
P.push(pk(22, {
  title: 'Makine zamanlayıcıları ve takvim denetimi',
  files: ['docker/postgres/zamanlayici/iu-yoklama-pgbackrest-tam.service', 'docker/postgres/zamanlayici/iu-yoklama-pgbackrest-fark.service', 'docker/postgres/zamanlayici/iu-yoklama-pgbackrest-dogrulama.service',
    'docker/postgres/zamanlayici/iu-yoklama-dokum.service', 'docker/postgres/zamanlayici/iu-yoklama-geri-yukleme-denemesi.service', 'docker/postgres/zamanlayici/iu-yoklama-pgbackrest-tam.timer',
    'docker/postgres/zamanlayici/iu-yoklama-pgbackrest-fark.timer', 'docker/postgres/zamanlayici/iu-yoklama-pgbackrest-dogrulama.timer', 'docker/postgres/zamanlayici/iu-yoklama-dokum.timer',
    'docker/postgres/zamanlayici/iu-yoklama-geri-yukleme-denemesi.timer', 'docker/postgres/zamanlayici/kur.sh', 'docker/postgres/zamanlayici/takvim-denetimi.sh'],
  tests: ['Zamanlayıcılar İstanbul saatiyle'], size: 'S',
  notes: 'Beş makine işinin systemd service ve timer dosyaları ile kurulum betiği yazılır; takvim-denetimi.sh her timer\'da Europe/Istanbul ve Persistent=true olduğunu, systemd-analyze ile döküm saatinin 23:15 UTC ve denemenin ayın ilk cumartesisi olduğunu denetler. Service dosyaları betikleri yalnız yol ve komut adıyla anar, takvim denetimi betikleri çalıştırmaz; paket hiçbir şey beklemez.',
}));
const missF = [...allFiles].filter(f => !usedF.has(f)), missT = [...allTests].filter(t => !usedT.has(t));
if (missF.length || missT.length) { console.error('missing files', missF, 'missing tests', missT); process.exit(1); }
fs.writeFileSync(outPath, JSON.stringify({ id: 'D12', packages: P }, null, 1) + '\n');
console.log('wrote', P.length, 'packages,', usedF.size, 'files,', usedT.size, 'tests');

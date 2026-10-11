h.push(row('PostgreSQL kabı', `PostgreSQL 18.6, kendi imajı ${code('iu-attendance-postgres:18.6-pgbackrest2.59.3')} (${link('teknik.html#veritabani-yedek', 'Yedek')}). Servis tanımları D12'nin Compose parçasında: ${code('docker/postgres/compose.yaml')}; D15'in ${code('compose.yaml')} dosyası onu ${code('include')} ile bir kez alır, API, işçi, göç servisi ve xprem ${code('veritabani')} ağına katılır; göç servisinin adresi sabittir (${code('172.30.12.20')}), öbür kaplar ${code('ip_range 172.30.12.128/25')}'ten adres alır. Üretimde PostgreSQL makineye kapı yayımlamaz; geliştirmede ${code('compose.gelistirme.yaml')} ${code('127.0.0.1:5432')}'yi yayımlar, geliştirme pg_hba'sını bağlar ve ${code('archive_mode=off')} verir. Sağlık denetimi TCP'den (${code('pg_isready -h 127.0.0.1')}). Veri birimi ${code('/var/lib/postgresql')} yoluna bağlanır, adı ${code('IU_POSTGRES_BIRIMI')} değişkeninden gelir (döküm dönüşü yeni birim açar). initdb builtin C.UTF-8 (${link('teknik.html#veritabani-donem-alani', 'Zaman ve sıralama')}).`));
h.push(row('Şemalar ve roller', `Şemalar ${code('uygulama')}, ${code('drizzle')}, ${code('pgboss')}. Rolleri, veritabanlarını, eklentiyi ve uygulama şemasının varsayılan yetkilerini kurulum adımı açar; pgboss'ta yalnız şema USAGE verir, tablo yetkileri D14'ün kur adımındadır. Kurulum parolayı istemcide hesaplanan SCRAM doğrulayıcısıyla, ${code('pg_stat_statements.track_utility')} kapalı oturumda ve yalnız saklı doğrulayıcı tutmuyorsa yazar. Parolalar Compose sırrıyla yalnız gereken servise (${link('teknik.html#sunucu-ayarlar', 'Ayarlar')}). Ayrıntı aşağıdaki tabloda.`));
h.push(row('Ad ve sütun kuralları', `Bağlayıcı ad kuralı; kısıt, dizin ve tetikleyici adını yalnız ${code('kisitAdi')} verir (NOT NULL kısıtları hariç). Kimlik ${code('uuid')} ve ${code('uuidv7()')}, an ${code('timestamptz(3)')} ve ${code('_ani')} sonekli, gün ${code('date')}, saat ${code('time')}; durum metin ve ${code('durumKisiti')} ile adlı CHECK; etiket ayrı evet/hayır sütunu; ON CONFLICT her zaman hedefli (${link('teknik.html#sunucu-mimari', 'Veritabanı erişimi')}, ${link('teknik.html#veritabani', 'Kısıtlar')}). Yaşam sütunları ${code('silinme_ani')}, ${code('pasif_ani')}, ${code('arsiv_ani')}; kısmi dizin koşulu IS NULL. Tablo işaretleri sözleşme dosyasındaki ${code('TABLO_ISARETLERI')} listesinde: ${code('istemci_kimligi')}, ${code('yalniz_ekleme')}, ${code('donem_bolunebilir')}, ${code('tekil_satir')}, ${code('dizinsiz_kabul')}; şema testi listeyi katalogla iki yönde karşılaştırır.`));
h.push(row('Zaman', `Sunucu ve roller UTC; an milisaniye hassasiyetli ve değeri saat arayüzünden gelir, kural için SQL ${code('now()')} yok; gün ve saat metin okunur; İstanbul gün sınırı SQL'de açık ${code("AT TIME ZONE 'Europe/Istanbul'")} ile; Türkçe sıralama yalnız sorguda ve dizinsiz (${link('teknik.html#testler-veritabani-sifirlama', 'Saat ve sahteler')}).`));
h.push(row('İşlem ve hata', `Her sorgu ${code('islem')} içinden geçer; varsayılan READ COMMITTED, tutarlı çok deyimli okuma için ${code("yalitim: 'repeatable_read'")}; sayaç kurallarında işlem başına tek ${code('danismaKilidi')} çağrısı, ilk yazımdan önce; kilit sırası danışma anahtarları, satırlar, en sonda D06'nın sürüm sayacı; kilitlenmede tek yeniden deneme; dış yüz tx alır (${link('teknik.html#sunucu-mimari', 'Mimari')}). Havuz beklemesi API'de 2 saniye, işçide 30 saniye. Geçici hatalar ortak ${code('UygulamaHatasi')} ile D13'ün 503 kodlarına çevrilir; öteki hata yalnız SQLSTATE, kısıt ve tablo taşır; PostgreSQL logu ERROR iletisi yazmaz, terse ve parametresizdir (${link('teknik.html#sunucu-ayarlar', 'Loglar')}).`));
h.push(row('Göç akışı', `Tek klasör ${code('apps/server/migrations/')}; her göç ${code('<UTC zaman>_<belirteç>_<açıklama>/')} altında ${code('migration.sql')}, ${code('snapshot.json')} ve gerekirse ${code('oncesi-concurrently.sql')}. ${code('db:migrate')}: önce D12'nin ${code('veritabani:goc')} adımı (kurulum, hedefi var olan CONCURRENTLY dizinler ve geçerlilik denetimi, Drizzle göçleri), sonra D14'ün pg-boss migrate ve kuyruk adımı; göç servisi, geliştirme ve test koordinatörü aynı betiği çalıştırır (${link('teknik.html#altyapi-imaj', 'İmaj ve kapanış')}). CI denetimi ${code('veritabani:goc-denetimi')}: ad ve belirteç (${code('GOC_BELIRTECLERI')}'nden en uzun eşleşme, ör. ${code('is_kuyrugu')}), zaman sırası, ana dala girmiş klasörün değişmemesi, yeniden üretme farkı, Squawk, katalog farkıyla sahiplik, deyim düzeyinde satır yazma yakalama, zaman aşımı ayarı; ayrıca ${code('surum-denetimi.sh')}. Sahiplik ${code('goc/tablo-haritasi.ts')}'ten okunur (tasarımdaki canonical_tables'tan: tablo, sahip modül, belirteç); kısıt ${code('conrelid')} ile tablosuna atanır, ${code('tgisinternal')} tetikleyiciler sayılmaz, işlev sahibi ad önekinden okunur; isletim göçü yalnız ${code('olcum_')} önekli görünüm açar ya da değiştirir, görünüm başka tabloları yalnız okur (${code('pg_depend')}) ve okuduğu sütunları ekleyen göçlerden sonra zamanlanır (boş veritabanına bütün göçlerin uygulanması bunu dener). CONCURRENTLY adımı ${code('db:migrate')} içindedir, yayın betiği ayrıca çağırmaz.`));
h.push(row('Nesil', `${code('nesilOku')}: ${code('system_identifier')} ve ${code('timeline_id')}; zaman çizelgesi WAL dosya adıyla çapraz denetlenir (${link('teknik.html#kod-veri-modeli', 'Veri modeli')}, ${link('plan.html#kararlar-indirme', 'İndirme')}). Geri yüklemede nesil değişmeden trafik açılmaz.`));
h.push(row('Saklama', `Veri sınıfları ${code('SAKLAMA_VERI_SINIFLARI')} kataloğunda (${code('<belirteç>.<sınıf>')}, sahip, başlangıç, ${code('oncesinde')}); modül kendi sınıfını ${code('saklamaIsleyicisiKaydet')} ile kaydeder, satırı kendi kodu ayrı ${code('yoklama_saklama')} girişiyle siler ya da anonimleştirir, D12 kanıtı aynı işlemde yazar. İşleyici INSERT, iş kuyruğu ve denetim yazmaz; modüller işleyicilerini bugün ${code('saklamaIsleyicisiniCalistir')} ile dener. Süreler ${code('saklama/sureler.ts')}'te ve bugün boş: hiçbir şey silinmez (${link('plan.html#acik-saklama-suresi', 'Saklama süresi')}, ${link('plan.html#kararlar-hesap-silme', 'Hesap silme')}). Hesap silme bir saklama sınıfı değildir, D01'in kimlik olayıyla yürür.`));
h.push(row('Yedek', `pgBackRest ile PITR (zamana göre 21 gün), restic ile gecelik döküm ve xprem birimi (34 günlük takvim kesimi); silinen veri yedeklerden en geç 35 günde çıkar. Depolar sunucu dışında, yurt içinde, şifreli (${link('teknik.html#veritabani-yedek', 'Yedek')}, ${link('plan.html#teknoloji-sunucu-yeri', 'Sunucu yeri')}); parolalar çevrimdışı yedeklenir (${link('teknik.html#dagitim-ayrinti-korunacak-anahtarlar', 'Korunacak anahtarlar')}, ${link('teknik.html#dagitim-ayrinti-guncelleme-sunucusu', 'xprem birimi')}). Compose dosya sırlarında uid ve mode yok sayıldığından sır dosyaları makinede 0400 izinli durur, pgBackRest sırrı kap içindeki postgres kullanıcısına (uid 999) aittir. Stanza'yı ${code('pgbackrest.sh kur')} açar.`));
h.push(row('Geri yükleme', `Yalnız işletmecinin SSH ile başlattığı ${code('docker/postgres/yedek/geri-yukle.sh')}; makine işlerinin kilidini akış boyunca tutar. Adımlar aşağıdaki durum makinesinde, kılavuz ${code('docker/postgres/geri-yukleme-kilavuzu.md')}: nesil doğrulama, göç, kayıt, iptallerin yeniden uygulanması (bütün panel oturumları kapanır), stanza, sonra trafik. Telefonlar kuyruklarını yeniden gönderir, program ve listeler baştan iner (${link('plan.html#gun-kenar-durumlar', 'Kenar durumlar')}).`));
h.push(row('Test veritabanı', `${code('postgres-test')}: aynı imaj, tmpfs, kendi ağı (${code('172.30.13.0/24')}) ve ${code('pg_hba.test.conf')}; üretimdeki ortam değişkenleri, sırlar ve sağlık denetimi; fsync, synchronous_commit, full_page_writes ve archive_mode kapalı; ${code('127.0.0.1:5433')} (${link('teknik.html#testler-veritabani-sifirlama', 'Veritabanı sıfırlama')}). Koordinatörde ${code('testVeritabaniHazirla')}, her senaryodan önce ${code('senaryoOncesiSifirla')}; geliştirme ve test sırlarını ${code('gelistirme-gizli-uret.sh')} üretir; test havuzları Cucumber işçisi başına API 5, işçi 3, saklama 1, sahip 2.`));
h.push('  </div>');

h.push(details('Roller ve yetkiler: beş giriş rolü ve süper kullanıcı', table(['Rol', 'Giriş', 'Kim kullanır', 'Yetki ve ayar'], [
  [code('postgres'), 'yerel soket (peer); ağdan yalnız göç servisinin sabit adresinden (172.30.12.20/32) postgres ve yoklama veritabanlarına, scram-sha-256', 'kurulum adımı, pgBackRest, gece dökümü, geri yükleme betiği', 'süper kullanıcı'],
  [code('yoklama_sahip'), 'ağ, scram-sha-256', 'göç servisi, test sıfırlaması, veri kurucular, cli/geri-yukleme', 'bütün nesnelerin sahibi; DDL; SECURITY DEFINER işlevlerin sahibi'],
  [code('yoklama_api'), 'ağ, scram-sha-256', 'API kopyaları, yonetici-ekle', 'uygulama: SELECT, INSERT, UPDATE, DELETE, dizilerde USAGE ve SELECT (yalnız ekleme tablolarında DELETE ve tablo düzeyinde UPDATE yok); drizzle: SELECT; pgboss: yalnız şema USAGE, tablo yetkisi D14 kur; nesil işlevleri EXECUTE; statement_timeout 5 s, lock_timeout 2 s, boşta işlem 30 s; havuz beklemesi 2 s'],
  [code('yoklama_isci'), 'ağ, scram-sha-256', 'işçi', 'API ile aynı; ayrıca pg_monitor; yoklama_saklama üyeliği yok; statement_timeout 5 dk, lock_timeout 30 s, boşta işlem 5 dk; havuz beklemesi 30 s'],
  [code('yoklama_saklama'), 'ağ, scram-sha-256; parolası yalnız işçide ve göç servisinde', 'yalnız saklama_suresi_isi, işçide ayrı bağlantı (havuz 1)', 'uygulama: USAGE, SELECT, UPDATE, DELETE; saklama_islemleri: INSERT; başka INSERT ve pgboss yetkisi yok; hiçbir rol üyesi değil; bölüm kaldırma işlevinde EXECUTE; süreler işçiyle aynı'],
  [code('xprem'), 'ağ, scram-sha-256', 'xprem', 'yalnız xprem veritabanının sahibi'],
])));
h.push(details('Bağlantı bütçesi: 64 bağlantı, sınır 80, max_connections 100', table(['Bileşen', 'Bağlantı'], [
  ['API kopyası, 2 kopya ve kopya başına 20', '40'], ['İşçi (pg-boss 2, Drizzle 3; D14-B10)', '5'], ['Saklama bağlantısı (yoklama_saklama)', '1'], ['xprem', '10'], ['Göç servisi', '2'], ['pgBackRest', '2'], ['Gece dökümü', '1'], ['Süper kullanıcıya ayrılan', '3'], ['Toplam (üçüncü API kopyasına yer var)', '64'],
])));
const yaml = `# docker/postgres/compose.yaml (D12). D15'in compose.yaml dosyası: include: [docker/postgres/compose.yaml]
# Geliştirme ayrıca compose.gelistirme.yaml ekler: 127.0.0.1:5432, pg_hba.gelistirme.conf, archive_mode=off.
x-postgres-ortak: &ortak
  build: .
  image: iu-attendance-postgres:18.6-pgbackrest2.59.3
  environment:
    POSTGRES_PASSWORD_FILE: /run/secrets/postgres_parolasi
    POSTGRES_INITDB_ARGS: --locale-provider=builtin --builtin-locale=C.UTF-8 --locale=C.UTF-8 --encoding=UTF8
  secrets: [postgres_parolasi]
  shm_size: 256mb
  # geçici sunucu yalnız sokete açılır; TCP'den yanıt gerçek sunucuyu gösterir
  healthcheck: { test: [CMD, pg_isready, -h, 127.0.0.1, -p, "5432"], interval: 5s, retries: 24 }
services:
  postgres:                    # profilsiz; üretimde kapı yayımlamaz
    <<: *ortak
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf]
    volumes:
      - veri:/var/lib/postgresql
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
      - ./pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro
    secrets:
      - postgres_parolasi
      - { source: pgbackrest_gizli, target: /etc/pgbackrest/conf.d/gizli.conf }
    restart: unless-stopped
    networks: [veritabani]
  postgres-test:
    <<: *ortak
    profiles: [test]
    command: [postgres, -c, config_file=/etc/postgresql/postgresql.conf,
              -c, hba_file=/etc/postgresql/pg_hba.test.conf, -c, fsync=off,
              -c, synchronous_commit=off, -c, full_page_writes=off, -c, archive_mode=off,
              -c, shared_buffers=512MB, -c, logging_collector=on]
    volumes:
      - { type: tmpfs, target: /var/lib/postgresql, tmpfs: { size: 2147483648 } }
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./pg_hba.test.conf:/etc/postgresql/pg_hba.test.conf:ro
    ports: ["127.0.0.1:5433:5432"]
    networks: [veritabani-test]
  yedek:                       # tek seferlik: docker compose --profile yedek run --rm yedek ...
    profiles: [yedek]
    image: restic/restic:0.19.1
    secrets: [restic_gizli]
volumes:
  veri: { name: "\${IU_POSTGRES_BIRIMI:-iu-yoklama-postgres-veri}" }
networks:
  veritabani:                  # goc: ipv4_address 172.30.12.20 (D15 compose.yaml)
    ipam: { config: [{ subnet: 172.30.12.0/24, ip_range: 172.30.12.128/25 }] }
  veritabani-test:
    ipam: { config: [{ subnet: 172.30.13.0/24 }] }
secrets:                       # dosyalar \${IU_GIZLI_DIZIN} altında: postgres, yoklama_sahip, yoklama_api,
                               # yoklama_isci, yoklama_saklama, xprem parolaları; pgbackrest_gizli; restic_gizli
                               # (geliştirme ve test için gelistirme-gizli-uret.sh üretir)`;
h.push(details('Compose parçasının iskeleti: postgres, postgres-test ve yedek servisleri', `    <pre><code>${esc(yaml)}</code></pre>`));

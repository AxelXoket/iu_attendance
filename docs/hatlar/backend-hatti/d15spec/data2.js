// D15 spec, part 2: jobs, state machines, invariants.
'use strict';

const jobs = [
  {
    name: 'isletim_denetimi',
    schedule: "10 dakikada bir, :00, :10, ... (cron '*/10 * * * *', tz Europe/Istanbul); pg-boss, işçide; exclusive kuyruk, kaçırılan çalışma atlanır (missed: skip), sureAsimiSaniye 300, 2 deneme. D14 çizelgesindeki yeri aynen.",
    idempotency:
      'Ölçer ve açık uyarı defterini koşula göre günceller: aynı durumda ikinci çalışma yeni satır açmaz (tür ve anahtar başına tek açık satır), hatırlatma süresi dolmadan aynı uyarıyı yeniden bildirmez; bildirim yalnız D14.epostaGonder GONDERILDI dönünce işaretlenir.',
    does:
      "(1) Girdileri okur: D14.isSagligi (kuyruk ve zamanlama sağlığı, e-posta özeti, şema sürümü, iş çıktıları), PostgreSQL sistem görünümleri (pg_stat_archiver, pg_stat_activity, max_connections; işçi rolü pg_monitor üyesi, D12), durum dosyaları (/durum/saat/chrony.json, /durum/makine/makine.json, /durum/veritabani/<iş>.json, /durum/api/<kopya>.json), son 15 dakikada yazılan telefon_sayaclari satırlarındaki ret kodları ve olcum_kayit_kaybi'ndan son 24 saatte makbuzla yeniden gelen öğe sayısı. " +
      "(2) infra/izleme/kurallar.ts'teki saf kurallar girdileri ISLETIM_ESIKLERI ile karşılaştırır, her biri { tur, anahtar, seviye, deger, satirlar } kararı üretir (tablo: Durumlar ve kurallar, Uyarı kuralları); kararlar aynı işlemde uyariAc ile açılır ya da güncellenir, bu çalışmada gözlenmeyen KOSUL uyarıları kapanır, 26 saattir yeniden açılmayan SESSIZLIK uyarıları kapanır. " +
      "(3) Bildirim: bildirilmemiş ya da hatırlatma süresi (KRITIK 6, UYARI 24 saat) dolmuş açık uyarılar ve bildirilmiş ama kapanmış uyarılar düz metin satırlarla D14.epostaGonder('isletim_uyarisi', { adres }, { konu, satirlar }) ile ISLETIM_UYARI_ALICILARI'ndaki her adrese gider; gönderilemezse bildirim_hatasi işaretlenir ve kalp atışı sorun adresine döner. Tek log satırı: { olay: isletim.denetim, acilan, kapanan, bildirilen, bildirilemeyen, sureMs }.",
  },
  {
    name: 'dis_erisim_denetimi',
    schedule: "5 dakikada bir, sunucu dışındaki izleme hizmetinden ve Türkiye dışındaki bir denetim noktasından; hizmetin ayarıdır, depoda kodu yoktur (hizmet seçimi D15-A05).",
    idempotency: 'Salt okunur GET; tekrarı yan etkisiz.',
    does:
      "https://<ALAN_ADI>/v1/durum adresine 10 saniye zaman aşımıyla istek atar, 204 bekler. Art arda 2 başarısızlıkta sahibe anlık bildirim ve e-posta gider, düzelince tek düzeldi iletisi; ikinci alıcı D15-A10'a bağlı. Aynı hizmet sertifika bitişini de izler (14 gün kala; sertifika_bitis_denetimi'nin ikinci katmanı). Yurt dışından denetim, mağaza incelemesi için gereken yurt dışı erişimi de sınar (plan.html#kararlar-inceleme-hesaplari). Hizmete kişisel veri gitmez, bu yüzden üçüncü taraf analitik yasağına (plan.html#kararlar-olcum) girmez.",
  },
  {
    name: 'isletim_kalp_atisi',
    schedule: "10 dakikada bir, :05, :15, ... (cron '5-59/10 * * * *', tz Europe/Istanbul); pg-boss, işçide; exclusive, missed: skip, sureAsimiSaniye 30, deneme yok (sonraki çalışma zaten 10 dakika sonra).",
    idempotency: 'Dış hizmete tek GET; aynı pencerede iki istek hizmet için tek kalp atışıdır.',
    does:
      "Açık KRITIK uyarı ve bildirim_hatasi işaretli açık uyarı yoksa kalp_atisi sırrındaki normalAdres'e, varsa sorunAdres'e 10 saniye zaman aşımıyla GET yapar; sorunAdres tanımlı değilse hiç istek atmaz (sessizlik sorun demektir). Hizmet 25 dakika kalp atışı görmezse ya da sorun isteği alırsa sahibe SMTP'den bağımsız bildirim gönderir: işçi, PostgreSQL, pg-boss zamanlaması, dışarı çıkış ya da SMTP düşünce de haber gider. Adres yoksa (gelistirme, test) istek atmaz, debug log yazar; uretim ve hazirlik ortamında sır yoksa işçi açılmaz (ayar şeması). İstek gövdesiz, sorgu dizesiz; kişisel veri yok.",
  },
  {
    name: 'sertifika_bitis_denetimi',
    schedule: "Her gün 06:35 (cron '35 6 * * *', tz Europe/Istanbul); pg-boss, işçide; exclusive, missed: once, sureAsimiSaniye 60, 3 deneme (30 saniyeden üstel). D14 çizelgesine ek; 06:35'te başka günlük iş yok (en az 5 dakika aralık kuralı).",
    idempotency: 'Salt okur; uyarı defterine tür ve anahtar başına tek açık satır yazar, aynı gün ikinci çalışma aynı sonucu verir.',
    does:
      "ISLETIM_CADDY_ADRESI'ne (varsayılan caddy:443) SNI olarak ALAN_ADI ile TLS bağlantısı açar; zincir ve adı doğrular, bitiş anını ve düzenleyeni okur. Doğrulanamazsa KRITIK isletim.sertifika_gecersiz. Kalan süre ISLETIM_SERTIFIKA_TURU acme ise 14, elle ise 30 günün altına inince UYARI, 7 günün altına inince KRITIK isletim.sertifika_bitiyor (teknik.html#altyapi-caddy). Caddy ömrün üçte biri kala yenilediğinden acme uyarısı yalnız yenileme kaçınca gelir. Üniversite ağ geçidi TLS'i önde bitirirse ağ geçidinin sertifikasını dış izleme hizmeti denetler.",
  },
  {
    name: 'saat_esitleme_izleme',
    schedule: '30 saniyede bir, ana makinede systemd zamanlayıcısı (iu-yoklama-saat-esitleme.timer: OnBootSec=10s, OnUnitActiveSec=30s, AccuracySec=1s); pg-boss dışında, API ve işçi düşükken de çalışır.',
    idempotency: 'Durumu her seferinde baştan okur; dosyayı aynı dizinde geçici dosyaya yazıp rename ile değiştirir, okuyan hiçbir zaman yarım dosya görmez; iki çalışma çakışırsa son yazan geçerlidir.',
    does:
      "chronyc -c tracking çıktısından: senkron (Leap status 'Not synchronised' değil ve katman 1..15), sapmaMs (|sistem saati farkı| + kök dağılımı + kök gecikmesinin yarısı; chrony belgesindeki hata üst sınırı, milisaniyeye yukarı yuvarlanır), katman, kaynak (referans adı) ve olcumAni (UTC). Senkron değilse ya da sapma SAAT_ESITLEME_ESIK_MS'den büyükse sonBozukAni bu an olur, değilse önceki dosyadan taşınır. /var/lib/iu-yoklama/durum/saat/chrony.json olarak yazılır; API ve işçi kaplarına /durum/saat salt okunur bağlıdır. D04 her API sürecinde 5 saniyede bir saatEsitlemeDurumu() ile okur ve belge kuralını uygular; D15 işletim denetiminde uyarır. chrony ayarı (makine/chrony.conf): önce BİDB'nin NTP sunucusu (iburst prefer), yedek tr.pool.ntp.org, makestep 1.0 3, rtcsync.",
  },
  {
    name: 'makine_denetimi',
    schedule: '10 dakikada bir, :08, :18, ... (iu-yoklama-makine-denetimi.timer: OnCalendar=*:08/10, Persistent=false), ana makinede; işletim denetimi :10, :20 ... okuduğunda dosya 2 dakikalıktır.',
    idempotency: 'Ölçer ve tek dosyayı bütün olarak yazar (geçici dosya ve rename); yeniden başlama artışı /var/lib/iu-yoklama/makine-onceki.json ile hesaplanır, aynı artış iki kez bildirilmez.',
    does:
      "df ile kök dosya sisteminin ve Docker veri dizininin doluluğunu, /proc/meminfo ile kullanılabilir belleği, docker inspect ile Compose servislerinin (caddy, api-1, api-2, isci, postgres, xprem) durumunu, sağlık sonucunu, yeniden başlama sayısını, OOMKilled işaretini ve başlama anını okur; önceki çalışmaya göre yeniden başlama artışını hesaplar; /var/lib/iu-yoklama/durum/makine/makine.json olarak yazar. Eşik uygulamaz: işletim denetimi okur ve uyarır (disk yüzde 80 UYARI, 90 KRITIK; bellek yüzde 10'un altı UYARI; kap yeniden başladı UYARI; OOMKilled ya da çalışmayan servis KRITIK; dosya 25 dakikadan eski UYARI).",
  },
  {
    name: 'gunluk_log_arsivi',
    schedule: 'Her gün 03:15 Europe/Istanbul, ana makinede (iu-yoklama-log-arsivi.timer, Persistent=true); pg-boss dışında. 02:15 gece dökümü (D12) ile ve 03:00-05:00 pg-boss boşluğuyla çakışmaz; D14 çizelgesindeki 03:30 önerisinin yerine.',
    idempotency: 'Servis ve gün başına tek dosya: hedef var ve gzip -t geçiyorsa atlanır; yazım geçici dosya ve rename ile; 30 günden eski dosyalar silinir, ikinci çalışma aynı dosya kümesini bırakır.',
    does:
      "Önceki İstanbul gününün (00:00-24:00) loglarını docker compose logs --no-color --no-log-prefix --timestamps --since --until ile api-1, api-2, isci, caddy, xprem ve postgres servislerinden alır; gzip ile /var/log/iu-yoklama/<servis>/<YYYY-AA-GG>.log.gz (root:adm, 0640) yazar. local log sürücüsünün döndürmesinden önce kaybı önler. Loglar numara, isim, kod ve jeton taşımadığından arşiv de taşımaz. makine/log-bul.sh bir istek kimliğinin (UUID biçimi denetlenir) güncel ve arşivdeki bütün satırlarını getirir (D15-B18).",
  },
  {
    name: 'ota_yayin_denetimi',
    schedule: "Her gece 04:23 Europe/Istanbul (cron '23 1 * * *' UTC), GitHub Actions'ta guvenlik.yml'nin ikinci işi; elle de başlatılır. D14 çizelgesindeki pg-boss 06:15 yeri boşalır.",
    idempotency: 'Salt okur: güncelleme bildirimini sorar ve depo etiketleriyle karşılaştırır; tekrarı yan etkisiz.',
    does:
      "yayin-bilgisi kaynağındaki desteklenen her uygulama sürümünün runtimeVersion'ı ve her platform için güncelleme bildirimini Expo Updates protokolüyle (expo-protocol-version 1, expo-platform, expo-runtime-version, expo-channel-name) 40 farklı rastgele istemci kimliğiyle sorar ve dönen güncelleme kimliklerini toplar. Her kimlik için depoda ota/<runtimeVersion>/<güncelleme kimliği> etiketi olmalıdır; etiketi yalnız onaylı yayin-ota.yml koşusu açar. Etiketsiz güncelleme görülürse iş kırmızı biter: GitHub sahibe e-posta gönderir, CI kalp atışı gönderilmez. xprem'in yönetim paneline, yayın anahtarına ve veritabanına dokunmaz (D15-B31).",
  },
  {
    name: 'haftalik_olcum_ozeti',
    schedule: "Pazartesi 07:10 (cron '10 7 * * 1', tz Europe/Istanbul); pg-boss, işçide; exclusive, missed: once, sureAsimiSaniye 900, 2 deneme. Ders başı yoğunluğundan önce; D14 çizelgesindeki 08:00 önerisinin yerine.",
    idempotency: 'Aynı hafta için aynı sayıları üretir; yeniden denemede e-posta bir kez daha gidebilir (yalnız sahibe, zararsız). Silme adımı tarih sınırından eski satırları siler; ikinci çalışma 0 satır siler.',
    does:
      "Önceki pazartesi 00:00 ile bu pazartesi 00:00 (İstanbul) arası ve içinde bulunulan dönem için olcum_ görünümlerinden Hedefler'deki sayıları (gönderme, saati doğrulanamayan Android ve iPhone ayrı, işaretlenmeden kabul ve üç ayrı etiket oranı, kafa sayısı aşımı olmayan oturum oranı, hocanın işi ortancası), kayıt kaybı göstergelerini, telefon sayaçlarının özetini (gönderilmemiş kayıt, başarısız deneme, bildirim izni oranı, en sık beş ekran hatası, çökmeler, yeni ret kodları), benimseme sayılarını ve açık uyarıları hesaplar; hedefle birlikte düz metin satırlar olarak D14.epostaGonder ile ISLETIM_UYARI_ALICILARI'na yollar (tür isletim_ozeti, D14'e ekleme isteği; eklenene kadar isletim_uyarisi, konu 'Haftalık ölçüm özeti'). Ardından telefon_sayaclari ve hoca_ekran_sureleri'nde gun < bugün - 395 gün, isletim_uyarilari'nda kapanma_ani 395 günden eski satırları 5.000'lik kısa işlemlerle siler, sayıları loglar.",
  },
  {
    name: 'ci_kalite_kapilari',
    schedule: 'Her çekme isteğinde, ana dala her gönderimde ve birleştirme kuyruğunda (merge_group); GitHub Actions kalite.yml; aynı dal için yeni koşu eskisini iptal eder (concurrency).',
    idempotency: 'Aynı commit için aynı sonucu verir: kilit dosyası değişmeden kurulum (pnpm install --frozen-lockfile), test veritabanı her koşuda tmpfs\'te sıfırdan.',
    does:
      "Sırayla: Biome ci (biçim, kurallar, modül sınırları); tsc tip denetimi; D12'nin göç denetimleri (yeniden üretme farkı, sahiplik haritası, Squawk) ve docker/postgres/surum-denetimi.sh; packages/core'da Vitest ve fast-check, satır ve dal kapsamı en az yüzde 90 (@vitest/coverage-v8), TZ=UTC ve TZ=Europe/Istanbul ile iki koşu; apps/server Vitest testleri; docker compose --profile test up --wait postgres-test ve Cucumber senaryoları (paralel koşu os.availableParallelism(): açık depoda 4, özel depoda 2); docker compose config ile Compose doğrulaması ve servis sırları matrisi; Caddyfile doğrulaması ve Caddy başlık senaryosu; yayin-bilgisi kaynağının D13 şemasıyla denetimi. oasdiff kırılma kapısı D13'ün sozlesme.yml dosyasındadır. permissions: contents: read; her dış eylem tam commit özetiyle; eylemlerin çalışma ortamı Node 24 (teknik.html#altyapi-imaj).",
  },
  {
    name: 'ci_gecelik_guvenlik_denetimi',
    schedule: "Her gece 04:23 Europe/Istanbul (cron '23 1 * * *' UTC, saat başı değil); GitHub Actions guvenlik.yml; elle de başlatılır.",
    idempotency: 'Salt okur; aynı kilit dosyasıyla aynı sonuç.',
    does:
      "pnpm audit --prod --audit-level high: yüksek ve kritik duyuru kırmızıdır, orta düzey iş özetine yazılır (teknik.html#altyapi-guncellemeler). SheetJS npm dışında olduğundan bu denetime girmez, elle izlenir. Bu iş ve ota_yayin_denetimi yeşil biterse CI kalp atışı adresine (depo sırrı ISLETIM_CI_KALP_ATISI_ADRESI) istek atılır; hizmet 26 saatte görmezse sahibi uyarır, böylece GitHub'ın 60 günlük hareketsizlikte zamanlanmış işleri kapatması da fark edilir.",
  },
  {
    name: 'ci_haftalik_is',
    schedule: "Pazar 06:41 Europe/Istanbul (cron '41 3 * * 0' UTC); GitHub Actions haftalik.yml; elle de başlatılır ve her sunucu yayınından önce bir kez elle koşar (teknik.html#testler-kalite).",
    idempotency: 'Aynı commit için aynı sonucu verir; Stryker artımsız koşar (önceki sonuca dayanmaz).',
    does:
      "(1) Stryker packages/core üzerinde komut çalıştırıcısıyla (testRunner command, komut paketin vitest run'ı; teknik.html#testler-kalite); stryker-esik-denetimi.ts JSON raporundaki mutasyon puanını klasör başına stryker-esikler.json ile karşılaştırır (varsayılan kırma eşiği 80, saat 90; eşik yalnız yükselir) ve yaşayan mutantları özete yazar. (2) Sunucu imajının sunucu ve caddy hedefleri derlenir; postgres, göç ve bir API kopyasıyla açılır, iç ağdan /health/ready 204 beklenir. (3) tohum.ts --kucuk ile tek ders, öğrenci ve cihaz kurulur; k6 tek seferlik deneme (bir sanal kullanıcı, bir yineleme) aynı sunucuya: saat belgesi, gönderim, değişenler. (4) İki imaj Trivy ile taranır; düzeltmesi olan yüksek ve kritik bulgu kırmızıdır. Kırmızı haftalık iş bir sonraki sunucu yayınını durdurur (yayin-sunucu.yml son koşunun sonucuna bakar).",
  },
  {
    name: 'dependabot_guncellemeleri',
    schedule: 'Haftalık, pazartesi 06:00 Europe/Istanbul; güvenlik güncellemeleri beklemeden (.github/dependabot.yml).',
    idempotency: 'Dependabot aynı güncelleme için açık istek varken ikincisini açmaz.',
    does:
      "Ekosistemler: npm (kök; gruplar: üretim küçük ve geliştirme küçük güncellemeleri), github-actions, docker (apps/server/Dockerfile, docker/postgres/Dockerfile) ve docker-compose (compose.yaml, docker/postgres/compose.yaml). 3 günlük bekleme varsayılandır, yazılmaz (teknik.html#altyapi-guncellemeler). Dışarıda kalanlar: Expo'nun belirlediği paketler (expo, expo-*, react, react-native; SDK yükseltmesinde topluca), xprem imajı (eoas aracıyla aynı sürümde elle, teknik.html#dagitim-ayrinti-xprem-guvenligi), pgBackRest paket sürümü (elle), SheetJS (npm dışında). Büyük sürüm ayrı istek açar; elle ve testler yeşilken birleştirilir.",
  },
  {
    name: 'yayin_oncesi_yuk_testi',
    schedule: 'Elle, tetik tablosuna göre (Durumlar ve kurallar, Yük testi): ilk yayından, her dönem başından, gönderim, saat belgesi, kimlik ya da yoklama şemasına dokunan sunucu yayınından ve Fastify, PostgreSQL, Node ya da Drizzle büyük sürüm geçişinden önce; hazırlık makinesinde (D15-A04).',
    idempotency: 'Hazırlık veritabanı her koşudan önce tohum betiğiyle aynı tohumdan sıfırdan kurulur; aynı tohum aynı veriyi üretir.',
    does:
      "apps/server/test/yuk/ altındaki k6 senaryoları üretim boyutundaki (4 çekirdek, 8 GB, 100 GB SSD) hazırlık makinesinde, sınırlar açık, binlerce ayrı cihaz kimliğiyle, sabit geliş hızıyla koşar: ders başı, ders çıkışı (en kötü durum 20.000 telefon 1 dakikada), gece ve giriş yığılması profilleri; ders çıkışı sürerken 50 hoca rapor ve AKSİS özeti ister. Veritabanı bir dönemlik veriyle (yaklaşık 4,2 milyon kayıt) doludur. Geçme ölçütleri k6 thresholds ve koşu sonrası denetim betiğiyle otomatik verilir; ölçülen makine boyutu, eşikler, havuz ve 100.000 kayıt başına tablo boyutu teknik.html'e yazılmak üzere raporlanır (teknik.html#altyapi-sunucu-makinesi).",
  },
];

const state_machines = [
  {
    name: 'İşletim uyarısı (isletim_uyarilari satırı)',
    states: ['YOK', 'ACIK_BILDIRILMEDI', 'ACIK_BILDIRILDI', 'KAPANDI_BILDIRILMEDI', 'KAPANDI'],
    transitions: [
      { from: 'YOK', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc (D15 denetimi ya da başka modül)', when: "(tur, anahtar) için açık satır yok: yeni satır, durum ACIK, son_bildirim_ani boş." },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc', when: 'Koşul yeniden görüldü: son_gorulme_ani, tekrar_sayisi, son_deger ve satirlar yenilenir.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILDI', by: 'isletim_denetimi', when: 'E-posta en az bir alıcıya GONDERILDI: son_bildirim_ani yazılır, bildirim_hatasi false.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILMEDI', by: 'isletim_denetimi', when: 'E-posta gitmedi: bildirim_hatasi true; kalp atışı sorun adresine döner, sonraki çalışma yeniden dener.' },
      { from: 'ACIK_BILDIRILDI', to: 'ACIK_BILDIRILDI', by: 'isletim_denetimi', when: 'Hatırlatma: son bildirimden bu yana KRITIK 6, UYARI 24 saat geçti; yeni e-posta, bildirim_sayisi artar.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'KAPANDI', by: 'isletim_denetimi', when: 'KOSUL uyarısı bu çalışmada gözlenmedi ya da SESSIZLIK uyarısı 26 saattir yeniden açılmadı ve hiç bildirilmemişti: kapanma_ani yazılır, düzeldi iletisi gitmez.' },
      { from: 'ACIK_BILDIRILDI', to: 'KAPANDI_BILDIRILMEDI', by: 'isletim_denetimi', when: 'Aynı kapanma koşulu, uyarı daha önce bildirilmişti.' },
      { from: 'KAPANDI_BILDIRILMEDI', to: 'KAPANDI', by: 'isletim_denetimi', when: 'Düzeldi e-postası gitti: kapanis_bildirimi_ani yazılır.' },
      { from: 'KAPANDI', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc', when: 'Aynı tür ve anahtar yeniden görüldü: eski satır kanıt olarak kalır, yeni satır açılır (kısmi tekil dizin yalnız açık satırı sayar).' },
      { from: 'KAPANDI', to: 'YOK', by: 'haftalik_olcum_ozeti', when: 'kapanma_ani 395 günden eski: satır silinir.' },
    ],
  },
  {
    name: 'API kopyası (server.ts süreci)',
    states: ['ACILIYOR', 'VERITABANI_BEKLENIYOR', 'HAZIR', 'HAZIR_DEGIL', 'KAPANIYOR', 'KAPANDI'],
    transitions: [
      { from: 'ACILIYOR', to: 'KAPANDI', by: 'server.ts', when: 'ayarlariYukle hata verdi (eksik ayar ya da sır, TZ UTC değil, bellek eşiği kap sınırından büyük): çıkış kodu 78, Docker yeniden başlatır.' },
      { from: 'ACILIYOR', to: 'VERITABANI_BEKLENIYOR', by: 'server.ts', when: 'Ayarlar ve log hazır, veritabanı havuzu kuruldu.' },
      { from: 'VERITABANI_BEKLENIYOR', to: 'HAZIR', by: 'server.ts', when: 'semaDurumu hazir döndü; iş kuyruğu (D14, rol api) ve e-posta kuruldu, app.ts uygulamayı kurdu, listen başladı. /health/live 204.' },
      { from: 'VERITABANI_BEKLENIYOR', to: 'KAPANDI', by: 'server.ts', when: 'semaDurumu geride: imajın beklediği göç uygulanmamış; ISLETIM_SEMA_GERIDE loglanır, çıkış kodu 1. Yeni şemayı bekleyen kod trafiğe çıkmaz; yayın betiği göçü API\'den önce çalıştırır.' },
      { from: 'VERITABANI_BEKLENIYOR', to: 'KAPANDI', by: 'server.ts', when: '120 saniye içinde semaDurumu ulasilamiyor ya da nesil_belirsiz durumundan çıkmadı (1, 2, 4, 8, 10 saniye aralıkla denendi): çıkış kodu 1, Docker yeniden başlatır.' },
      { from: 'HAZIR', to: 'HAZIR_DEGIL', by: 'GET /health/ready', when: 'semaDurumu hazır değil ya da 2 saniyede cevap yok; /health/live yine 204 (Caddy trafiği kesmez, istekler D13 zarfıyla 503 alır).' },
      { from: 'HAZIR_DEGIL', to: 'HAZIR', by: 'GET /health/ready', when: 'semaDurumu yeniden hazır.' },
      { from: 'HAZIR', to: 'KAPANIYOR', by: 'SIGTERM ya da SIGINT', when: 'kapanisiBaslat: /health/live, /health/ready ve /v1/durum 503 ISLETIM_KAPANIYOR; Caddy kopyayı en geç 4 saniyede devreden çıkarır.' },
      { from: 'HAZIR_DEGIL', to: 'KAPANIYOR', by: 'SIGTERM ya da SIGINT', when: 'Aynı.' },
      { from: 'KAPANIYOR', to: 'KAPANDI', by: 'server.ts', when: 'KAPANIS_ONCESI_BEKLEME_MS (6 saniye) sonra sırayla app.close (eldeki istekler biter), eposta.kapat(10 sn), iş kuyruğu durdur, havuz kapat, log flush; 25 saniyeyi aşarsa ya da ikinci sinyal gelirse çıkış kodu 1 (Compose stop_grace_period 30 saniye).' },
    ],
  },
  {
    name: 'Telefon sayacı satırı ((kurulum_id, gun) anahtarı)',
    states: ['YOK', 'KAYITLI', 'SILINDI'],
    transitions: [
      { from: 'YOK', to: 'KAYITLI', by: 'telefon_sayaci öğesi', when: 'Gövde geçerli, gün aralıkta: satır eklenir; sonuç KABUL { uygulandi: true }.' },
      { from: 'KAYITLI', to: 'KAYITLI', by: 'telefon_sayaci öğesi', when: 'Aynı gün için daha büyük sıralı öğe: bütün sayaçlar yeni değerlerle yazılır; KABUL { uygulandi: true }.' },
      { from: 'KAYITLI', to: 'KAYITLI', by: 'telefon_sayaci öğesi', when: 'Aynı oge_kimligi: değişiklik yok, ZATEN_VAR. Daha küçük ya da eşit sıralı başka öğe: değişiklik yok, KABUL { uygulandi: false }.' },
      { from: 'YOK', to: 'YOK', by: 'telefon_sayaci öğesi', when: 'Bozuk gövde, aralık dışı gün ya da öğrenci paketinde ekran süresi: RET ve gerekçe kodu; satır yazılmaz.' },
      { from: 'KAYITLI', to: 'SILINDI', by: 'haftalik_olcum_ozeti ya da kimlikOlayiDinleyicisi', when: 'gun 395 günden eski ya da kişinin hesabı silindi (hesap_silindi olayı, aynı işlemde).' },
    ],
  },
  {
    name: 'Gizli anahtar (amaç başına kid)',
    states: ['URETILDI', 'ETKIN', 'YALNIZ_DOGRULAMA', 'ELE_GECIRILDI', 'SILINDI'],
    transitions: [
      { from: 'URETILDI', to: 'ETKIN', by: 'anahtar-uret uret ya da dondur', when: 'İlk kurulum ya da dönem arası döndürme: 32 rastgele bayt, kid deseni ^[a-z0-9-]{1,8}$ (ör. sb27b), etkinKid bu kid olur.' },
      { from: 'ETKIN', to: 'YALNIZ_DOGRULAMA', by: 'anahtar-uret dondur', when: 'Yeni kid etkin oldu: eski anahtar yalnız doğrulamada kalır, emeklilikAni yazılır.' },
      { from: 'YALNIZ_DOGRULAMA', to: 'SILINDI', by: 'anahtar-uret dondur', when: 'Bir sonraki döndürmede (bir dönem sonra): önceki döndürmede emekliye ayrılan anahtar silinir; böylece eski anahtar en az dönem kilidine kadar ve bir dönem daha durur.' },
      { from: 'ETKIN', to: 'ELE_GECIRILDI', by: 'anahtar-uret ele-gecirildi', when: 'Sızıntı şüphesi: kid işaretlenir, aynı komut yeni kid\'i etkin yapar; bu kid\'le doğrulanan belge anahtarEleGecirildi true döner (D04), kayıt İncelemede alınır (D07).' },
      { from: 'YALNIZ_DOGRULAMA', to: 'ELE_GECIRILDI', by: 'anahtar-uret ele-gecirildi', when: 'Emekli anahtar için şüphe.' },
      { from: 'ELE_GECIRILDI', to: 'SILINDI', by: 'anahtar-uret dondur', when: 'Bir sonraki dönem arası döndürmesinde.' },
    ],
  },
  {
    name: 'Sunucu yayını (makine/yayinla.sh)',
    states: ['HAZIRLIK', 'IMAJ_DOGRULANDI', 'YEDEK_DENETLENDI', 'GOC_TAMAM', 'ISCI_YENI', 'API_1_YENI', 'API_2_YENI', 'CADDY_YENI', 'TAMAM', 'GERI_DONULDU'],
    transitions: [
      { from: 'HAZIRLIK', to: 'IMAJ_DOGRULANDI', by: 'yayinla.sh', when: 'Sürüm etiketi çekildi; sunucu, caddy ve (değiştiyse) xprem imajları özetle indirildi ve cosign verify geçti; imaj etiketindeki revizyon depo etiketinin commit\'iyle aynı; anahtar-uret denetle geçti.' },
      { from: 'HAZIRLIK', to: 'GERI_DONULDU', by: 'yayinla.sh', when: 'İmza, revizyon ya da anahtar denetimi tutmadı: hiçbir servis değişmez, betik durur.' },
      { from: 'IMAJ_DOGRULANDI', to: 'YEDEK_DENETLENDI', by: 'yayinla.sh', when: 'D12 docker/postgres/yedek/pgbackrest.sh denetle başarılı.' },
      { from: 'YEDEK_DENETLENDI', to: 'GOC_TAMAM', by: 'yayinla.sh', when: 'docker compose run --rm goc (node --run db:migrate: D12 göç adımı, pg-boss migrate, D14 kur) 0 ile bitti.' },
      { from: 'GOC_TAMAM', to: 'ISCI_YENI', by: 'yayinla.sh', when: 'isci yeni imajla yeniden kuruldu (eski işçi 40 saniyede pg-boss\'u düzgün durdurur).' },
      { from: 'ISCI_YENI', to: 'API_1_YENI', by: 'yayinla.sh', when: 'api-1 yeniden kuruldu; eski kopya kapanışta devreden çıktı; yeni kopyada Compose sağlığı healthy ve /health/ready 204 (120 saniye içinde).' },
      { from: 'API_1_YENI', to: 'API_2_YENI', by: 'yayinla.sh', when: 'api-2 için aynı adım.' },
      { from: 'API_2_YENI', to: 'CADDY_YENI', by: 'yayinla.sh', when: 'caddy imajı değiştiyse yeniden kuruldu (panel dosyaları API\'den sonra; D13-B31 sırası), değişmediyse atlandı.' },
      { from: 'CADDY_YENI', to: 'TAMAM', by: 'yayinla.sh', when: "Duman denemesi: ana makineden https://<ALAN_ADI>/v1/durum 204, iki kopyada /health/ready 204; /var/log/iu-yoklama/yayinlar.log'a satır." },
      { from: 'API_1_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri', when: 'Bir adım tutmadı: surum.env.onceki geri yazılır, işçi ve API kopyaları önceki özetle aynı sırayla yeniden kurulur; göç geri alınmaz (önce genişlet, sonra daralt kuralıyla eski imaj yeni şemada çalışır, teknik.html#sunucu-mimari).' },
    ],
  },
];

const invariants = [
  'telefon_sayaclari, hoca_ekran_sureleri ve isletim_uyarilari tablolarına yalnız D15 kodu yazar; başka modül uyarıyı yalnız uyariAc ile açar, sayaçlar yalnız telefon_sayaci öğesiyle ve ekran-sureleri ucuyla gelir.',
  'D15 tabloları alan tablolarına yabancı anahtar kurmaz ve infra/izleme ile jobs/isletim hiçbir alan modülünü (D01 ile D11) içe aktarmaz; D06, D12, D13 ve D14 dış yüzleri bileşim köklerinden parametreyle gelir. D01, D03 ve D04\'e yalnız bileşim kökleri (app.ts eklenti seçenekleriyle, server.ts, anahtar-uret komutu) ve test dünyası dokunur.',
  '(kurulum_id, gun) başına en çok bir telefon sayacı satırı vardır ve satır o gün için gelmiş en büyük sıralı geçerli öğenin değerlerini taşır; aynı öğeler hangi sırayla ulaşırsa ulaşsın sonuç aynıdır.',
  'hoca_ekran_sureleri.saniye aynı (kişi, oturum, gün, ekran, kaynak, kaynak kimliği) anahtarında hiç azalmaz ve 86400\'ü aşmaz.',
  "isletim_uyarilari'nda (tur, anahtar) başına en çok bir ACIK satır vardır; bir uyarı hatırlatma süresi dolmadan ikinci kez bildirilmez, hiç bildirilmemiş uyarının kapanışı bildirilmez.",
  'Açık KRITIK uyarı ya da gönderilemeyen bildirim varken kalp atışı normal adrese gitmez: sahibe SMTP\'den bağımsız en az bir yol her zaman açıktır.',
  'D15 tablolarında, loglarında, uyarı metinlerinde, iş verisinde ve durum dosyalarında öğrenci numarası, isim, e-posta adresi, kod, jeton ve gizli anahtar bulunmaz; yalnız iç kimlik (UUID) ve rota kalıbı bulunur.',
  '/health/live ve /v1/durum veritabanına dokunmaz, aşırı yük denetimi dışındadır ve yalnız kapanışta 503 döner; /health/* dışarıdan Caddy üzerinden hiçbir zaman API\'ye ulaşmaz.',
  'Hiçbir süreç gizli anahtarı açılışta üretmez; sürecin zorunlu sırrı yoksa ya da geçersizse süreç açılmaz. Her amaçta tam bir ETKIN anahtar vardır, kid amaç içinde tekildir, anahtar 32 bayttır.',
  'API, işçi ve göç kapları TZ=UTC ile çalışır; süreç saat farkı 0 değilse ayarlariYukle açılışı durdurur. İstanbul günü yalnız açık zaman dilimiyle hesaplanır.',
  'Ana makinede yazılan her durum dosyası geçici dosya ve rename ile bütün olarak yazılır ve ölçüm anı taşır; okuyan taraf eskimiş ya da okunamayan dosyayı hata sayar, hiçbir zaman sağlıklı saymaz.',
  'Bütün havuzların ve ayrılmış bağlantıların toplamı 80\'i geçmez (D12 bütçesi: iki API kopyası 40, işçi 5, xprem 10, göç 2, pgBackRest 2, gece dökümü 1, süper kullanıcı 3).',
  'Üretimde imaj yalnız özetle çekilir ve cosign verify geçmeden kurulmaz; CI sunucuya erişmez, yayını sahibin SSH ile başlattığı betik yapar.',
  'Her CI iş akışı varsayılan olarak yalnız okuma yetkilidir (permissions: contents: read); yazma yetkisi yalnız yayın işlerinde ve iş düzeyinde verilir; her dış eylem tam commit özetiyle sabittir.',
  'Kırmızı kalite kapısı birleştirmeyi, kırmızı haftalık iş sunucu yayınını durdurur.',
];

module.exports = { jobs, state_machines, invariants };

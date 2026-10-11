// D15 spec, part 2: jobs, state machines, invariants.
'use strict';

const jobs = [
  {
    name: 'isletim_denetimi',
    schedule: "10 dakikada bir, :00, :10, ... (cron '*/10 * * * *', tz Europe/Istanbul); pg-boss, işçide; exclusive kuyruk, kaçırılan çalışma atlanır (missed: skip), sureAsimiSaniye 300, 2 deneme. D14 çizelgesindeki yeri aynen.",
    idempotency:
      'Ölçer ve açık uyarı defterini koşula göre günceller: aynı durumda ikinci çalışma yeni satır açmaz (tür ve anahtar başına tek açık satır), girdisi okunamayan uyarıya dokunmaz, hatırlatma süresi dolmadan aynı uyarıyı yeniden bildirmez; bildirim yalnız D14.epostaGonder GONDERILDI dönünce işaretlenir. Bildirim sonucunun yazımı hata verirse sonraki çalışma aynı uyarıyı bir kez daha bildirebilir (yalnız sahibe yinelenen e-posta, zararsız).',
    does:
      "(1) Girdiler ayrı ayrı okunur; veritabanı girdisi kendi kısa salt okunur işleminde (bir sorgunun hatası PostgreSQL işlemini bozduğundan ortak işlem kullanılmaz), dosya kendi okumasında. Girdiler: is_sagligi (D14.isSagligi: kuyruk ve zamanlama sağlığı, e-posta özeti, şema sürümü, iş çıktıları), pg_sistem (pg_stat_archiver, pg_stat_activity, max_connections; işçi rolü pg_monitor üyesi, D12), durum dosyaları (/durum/saat/chrony.json, /durum/makine/makine.json ve bakim.json, /durum/veritabani/<iş>.json, /durum/api/<kopya>.json), telefon_sayaclari (su seviyesinden sonra yazılan satırların ret kodları; su seviyesi önceki başarılı çalışmanın çıktısındaki retSuSeviyesi, D14 sonCikti; yoksa şimdiden 15 dakika önce) ve olcum_kayit_kaybi (son 24 saatte makbuzla yeniden gelen öğe sayısı). Okunamayan durum dosyası kendi türünde uyarı açar (isletim.makine_denetimi_sessiz, isletim.saat_esitleme, isletim.yedek_durumu_okunamadi, isletim.api_olcum_yok); okunamayan veritabanı girdisi ya da hata veren kural isletim.denetim_girdisi uyarısını (anahtar girdi adı) açar. Öbür girdiler ve kurallar çalışmayı sürdürür; bir girdinin hatası bütün denetimi düşürmez. " +
      "(2) infra/izleme/kurallar.ts'teki saf kurallar okunan girdileri ISLETIM_ESIKLERI ile karşılaştırır, her biri { tur, anahtar, seviye, deger, satirlar } kararı üretir (tablo: Durumlar ve kurallar, Uyarı kuralları). Kendi işleminde ve commit ile biter: kararlar uyariAc ile açılır ya da güncellenir; KOSUL kapanışı yalnız UYARI_TURLERI'nde değerlendireni isletim_denetimi olan ve girdisi bu çalışmada okunan türlerde (yedek ve API ölçüsünde anahtarın kendi dosyası okunmuş olmalı), koşulu gözlenmeyen açık satırlara uygulanır. Girdisi okunamayan türün açık uyarısı ne kapanır ne yenilenir; sertifika_* türlerini yalnız sertifika_bitis_denetimi kapatır. 26 saattir yeniden açılmayan SESSIZLIK uyarıları kapanır. " +
      "(3) Bildirim, adım 2'nin işleminden sonra: bildirilmemiş ya da hatırlatma süresi (KRITIK 6, UYARI 24 saat) dolmuş açık uyarılar ile bildirilmiş ama kapanmış uyarılar alıcı başına tek özet e-postaya satır satır girer (uyarı başına kısa kimlik, seviye, tür, anahtar, son değer ve satırları; en çok 50 uyarı, fazlası tek satırda sayılır; konu seviye sayılarını taşır). D14.epostaGonder('isletim_uyarisi', { adres }, { konu, satirlar }) ISLETIM_UYARI_ALICILARI'ndaki adreslere paralel çağrılır. Bildirim adımının 120 saniyelik bütçesi vardır ve iş iptal sinyaline uyar: süre dolunca ya da sinyal gelince bitmemiş gönderimler gitmedi sayılır. D14'ün en kötü tek gönderimi (10 saniyelik bağlantı zaman aşımı, geçici hatada 5 ve 30 saniye sonra iki deneme daha) yaklaşık 65 saniye sürdüğünden paralel gönderim bütçeye sığar; okuma ve kurallar 60 saniyede kesildiğinden iş 300 saniyelik sınırın altında kalır. Sonuçlar gelince her uyarının son_bildirim_ani, bildirim_sayisi, bildirim_hatasi ve kapanis_bildirimi_ani alanları ayrı kısa işlemde yazılır: en az bir alıcıya GONDERILDI ise bildirildi, hiçbir alıcıya gitmediyse bildirim_hatasi true ve kalp atışı sorun adresine döner. " +
      "(4) İş çıktısı { retSuSeviyesi } döner; D14.isSagligi bu kuyruğun sonBasariAni'sini ve sonCikti'sini verir, kalp atışı sonBasariAni'ye bakar. Tek log satırı: { olay: isletim.denetim, okunamayanGirdiler, acilan, kapanan, bildirilen, bildirilemeyen, sureMs }.",
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
      "Üç şeyi okur: açık KRITIK uyarı, bildirim_hatasi işaretli açık uyarı ve D14.isSagligi'nda isletim_denetimi kuyruğunun zamanlama.sonBasariAni'si. Üçü de temizse (açık KRITIK yok, bildirim hatası yok, son başarılı denetim 25 dakikadan yeni; hiç başarılı denetim yoksa işçinin açılışından bu yana 25 dakika geçmemiş) kalp_atisi sırrındaki normalAdres'e, değilse ya da okumalardan biri hata verirse sorunAdres'e 10 saniye zaman aşımıyla GET yapar; sorunAdres tanımlı değilse hiç istek atmaz (sessizlik sorun demektir). Böylece isletim_denetimi her çalışmada hata verse de (başka bir modülün göçünden sonra kırılan sorgu, biçimi değişen durum dosyası) izleme sessizce kör kalmaz: üç çalışma üst üste başarısız olunca sonraki kalp atışı sorun adresine gider. Hizmet 25 dakika kalp atışı görmezse ya da sorun isteği alırsa sahibe SMTP'den bağımsız bildirim gönderir: işçi, PostgreSQL ya da pg-boss zamanlaması düşünce (iş hiç koşmaz), dışarı çıkış ya da SMTP kapanınca da haber gider. Adres yoksa (gelistirme, test) istek atmaz, debug log yazar; uretim ve hazirlik ortamında sır yoksa işçi açılmaz (ayar şeması). İstek gövdesiz, sorgu dizesiz; kişisel veri yok.",
  },
  {
    name: 'sertifika_bitis_denetimi',
    schedule: "Her gün 06:35 (cron '35 6 * * *', tz Europe/Istanbul); pg-boss, işçide; exclusive, missed: once, sureAsimiSaniye 60, 3 deneme (30 saniyeden üstel). D14 çizelgesine ek; 06:35'te başka günlük iş yok (en az 5 dakika aralık kuralı).",
    idempotency: 'Salt okur; uyarı defterine tür ve anahtar başına tek açık satır yazar, aynı gün ikinci çalışma aynı sonucu verir.',
    does:
      "ISLETIM_CADDY_ADRESI'ne (varsayılan caddy:443) SNI olarak ALAN_ADI ile TLS bağlantısı açar; zinciri ve adı doğrular, bitiş anını ve düzenleyeni okur. ISLETIM_SERTIFIKA_KOK_DOSYASI verilmişse zincir yalnız o PEM dosyasındaki köklerle doğrulanır (hazırlıkta Let's Encrypt deneme kökleri), verilmemişse Node'un sistem kökleriyle. Zincir ya da ad doğrulanamazsa KRITIK isletim.sertifika_gecersiz. Kalan süre ISLETIM_SERTIFIKA_TURU acme ise 14, elle ise 30 günün altına inince UYARI, 7 günün altına inince KRITIK isletim.sertifika_bitiyor (teknik.html#altyapi-caddy). Caddy ömrün üçte biri kala yenilediğinden acme uyarısı yalnız yenileme kaçınca gelir. Bu iş sertifika türlerinin tek değerlendiricisidir: açık sertifika uyarısını yalnız bu iş, sertifikayı okuduğu ve koşulun düzeldiği çalışmada kapatır; isletim_denetimi bu uyarılara dokunmaz, yalnız bildirir ve hatırlatır. TCP ya da TLS bağlantısı kurulamazsa (Caddy düşük; isletim.kap_calismiyor ayrıca uyarır) sertifika türlerine dokunulmaz, isletim.denetim_girdisi (anahtar sertifika) açılır. Üniversite ağ geçidi TLS'i önde bitirirse ağ geçidinin sertifikasını dış izleme hizmeti denetler.",
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
    idempotency: "Ölçer ve tek dosyayı bütün olarak yazar (geçici dosya ve rename). Önceki çalışmanın anı ve kap kimliği başına yeniden başlama sayısı /var/lib/iu-yoklama/makine-onceki.json'da durur; olay penceresi önceki çalışmanın anından bu çalışmanın anına kadardır, pencereler çakışmadığından aynı bellek taşması ve aynı yeniden başlama iki kez sayılmaz.",
    does:
      "df ile kök dosya sisteminin ve Docker veri dizininin doluluğunu, /proc/meminfo ile kullanılabilir belleği, docker inspect ile Compose servislerinin (caddy, api-1, api-2, isci, postgres, xprem) kap kimliğini, durumunu, sağlık sonucunu, yeniden başlama sayısını ve başlama anını okur. Bellek taşmasını durum olarak değil olay olarak sayar: docker events --since <önceki çalışmanın anı> --until <şimdi> --filter event=oom ile kap başına oomArtisi (inspect'teki OOMKilled yalnız son çıkışı anlatır ve Docker sürümüne göre yeniden başlatmada sıfırlanır ya da kalır; kullanılmaz). Yeniden başlama artışı yalnız aynı kap kimliğinin önceki sayısıyla hesaplanır: kimlik değiştiyse (yayın kabı yeniden kurdu, RestartCount sıfırlandı) artış 0'dır, hiçbir zaman eksi çıkmaz. Önceki dosya yoksa pencere son 10 dakikadır. /var/lib/iu-yoklama/durum/makine/makine.json olarak yazar. Eşik uygulamaz: işletim denetimi okur ve uyarır (disk yüzde 80 UYARI, 90 KRITIK; bellek yüzde 10'un altı UYARI; yeniden başlama artışı UYARI; oomArtisi ya da çalışmayan servis KRITIK, bakım dosyası geçerliyken çalışmayan servis değerlendirilmez; dosya 25 dakikadan eski ya da okunamıyor UYARI).",
  },
  {
    name: 'gunluk_log_arsivi',
    schedule: 'Her gün 03:15 Europe/Istanbul, ana makinede (iu-yoklama-log-arsivi.timer: OnCalendar=*-*-* 03:15:00 Europe/Istanbul, Persistent=true; dilim birimde açıkça yazılır, makinenin saat dilimine güvenilmez, kur.sh onu değiştirmez); pg-boss dışında. 02:15 gece dökümü (D12) ile ve 03:00-05:00 pg-boss boşluğuyla çakışmaz; D14 çizelgesindeki 03:30 önerisinin yerine.',
    idempotency: 'Servis ve gün başına tek dosya: hedef var ve gzip -t geçiyorsa atlanır; yazım geçici dosya ve rename ile; 30 günden eski dosyalar silinir, ikinci çalışma aynı dosya kümesini bırakır.',
    does:
      "Önceki İstanbul gününün (00:00-24:00; gün ve sınırlar TZ=Europe/Istanbul date ile hesaplanır, makine UTC'de olsa da) loglarını docker compose logs --no-color --no-log-prefix --timestamps --since --until ile api-1, api-2, isci, caddy, xprem ve postgres servislerinden alır; gzip ile /var/log/iu-yoklama/<servis>/<YYYY-AA-GG>.log.gz (root:adm, 0640) yazar. local log sürücüsünün döndürmesinden önce kaybı önler. Loglar numara, isim, kod ve jeton taşımadığından arşiv de taşımaz. makine/log-bul.sh bir istek kimliğinin (UUID biçimi denetlenir) güncel ve arşivdeki bütün satırlarını getirir (D15-B18).",
  },
  {
    name: 'ota_yayin_denetimi',
    schedule: "Her gece 04:23 Europe/Istanbul (cron '23 1 * * *' UTC), GitHub Actions'ta guvenlik.yml'nin ikinci işi; elle de başlatılır. D14 çizelgesindeki pg-boss 06:15 yeri boşalır.",
    idempotency: 'Salt okur: güncelleme bildirimini sorar ve depo etiketleriyle karşılaştırır; tekrarı yan etkisiz.',
    does:
      "apps/server/src/infra/izleme/ota-denetimi.ts betiği. Sorulan sürümler: runtimeVersion uygulama sürümüne eşittir (appVersion politikası), bu yüzden liste packages/contracts/openapi/ altında saklı her uygulama sürümü belgesinden (D13; her uygulama yayınında bir dosya eklenir) yayin-bilgisi kaynağındaki o kanalın en düşük sürümüne eşit ya da yüksek olanlardır; yalnız en düşük ve en son sürüm değil, aradakilerin hepsi sorulur. Her sürüm, platform ve kanal için güncelleme bildirimini Expo Updates protokolüyle (expo-protocol-version 1, expo-platform, expo-runtime-version, expo-channel-name) sorar. Kademeli açma yüzdesini saldırgan seçebildiğinden istemci kimlikleri rastgele değil kovaları kapsayacak biçimde seçilir: xprem'in kova hesabı (istemci kimliği özetinden 0..99 kova) ilk kurulumda xprem belgesinden ve MIT çekirdeğinin kaynağından alınır ve betikte aynen yazılır; betik her kova için o kovaya düşen sabit bir kimlik kullanır (100 kimlik), yüzde 1'lik yayın bile kesin görülür. Kova hesabı belgelenemezse 460 rastgele kimlik kullanılır: yüzde 1'lik yayını bir gecede kaçırma olasılığı 0,99^460, yaklaşık 0,0098 (40 kimlikte yaklaşık 0,67, yüzde 5'te 0,13 idi). Dönen güncelleme kimlikleri toplanır. Her kimlik için depoda ota/<runtimeVersion>/<güncelleme kimliği> etiketi olmalıdır; etiketi yalnız onaylı yayin-ota.yml koşusu açar. Etiketsiz güncelleme görülürse iş kırmızı biter: GitHub sahibe e-posta gönderir, CI kalp atışı gönderilmez. xprem'in yönetim paneline, yayın anahtarına ve veritabanına dokunmaz (D15-B31).",
  },
  {
    name: 'haftalik_olcum_ozeti',
    schedule: "Pazartesi 07:10 (cron '10 7 * * 1', tz Europe/Istanbul); pg-boss, işçide; exclusive, missed: once, sureAsimiSaniye 900, 2 deneme. Ders başı yoğunluğundan önce; D14 çizelgesindeki 08:00 önerisinin yerine.",
    idempotency: 'Aynı hafta için aynı sayıları üretir; yeniden denemede e-posta bir kez daha gidebilir (yalnız sahibe, zararsız). Silme adımı tarih sınırından eski satırları siler; ikinci çalışma 0 satır siler.',
    does:
      "İki aralık kullanır. Hedefler satırları olgun kohortla hesaplanır: özet pazartesisinden 14 ile 7 gün önceki hafta (bir hafta gecikmeli); kayıt hesaplanan_ani'sinin, oturum tarihinin İstanbul gününe göre bu haftaya düşer. Böylece hafta bittikten sonra ulaşan geç kayıtlar, Beklemede kararlar ve kesinleşmemiş kafa sayısı işaretleri oranı olduğundan iyi göstermez (gönderme hedefi ulaşma anıyla ölçülür, plan.html#hedefler). Satır kohort aralığını yazar; olcum-raporu aynı kuralı kullanır (bitişi 7 günden yeni aralıkta oranı 'olgunlaşmadı' diye işaretler). İşletim satırları son haftayla: önceki pazartesi 00:00 ile bu pazartesi 00:00 (İstanbul) arası. Hesaplananlar: Hedefler'deki sayılar (gönderme, saati doğrulanamayan Android ve iPhone ayrı, işaretlenmeden kabul ve üç ayrı etiket oranı, kafa sayısı aşımı olmayan oturum oranı, hocanın işi ortancası) ve içinde bulunulan dönemin toplamı; kayıt kaybı göstergeleri ve plan.html#hedefler'deki üç ayrı oran (telefonda kalıp kaybolan, onaylı cihaz değişimi, beyana dayalı düzeltme; olcum_telefonda_kayip); telefon sayaçlarının özeti (gönderilmemiş kayıt, başarısız deneme, en sık beş ekran hatası, çökmeler, yeni ret kodları) ve bildirim izni oranı (yalnız paket gelen günlerden değil, son 35 günde paket gönderen her kurulumun son bildirdiği değerden: DISTINCT ON (kurulum_id) gun DESC, bildirim_izni dolu satırlar); benimseme sayıları ve açık uyarılar; hedefle birlikte düz metin satırlar olarak D14.epostaGonder ile ISLETIM_UYARI_ALICILARI'na yollar (tür isletim_ozeti, D14'e ekleme isteği; eklenene kadar isletim_uyarisi, konu 'Haftalık ölçüm özeti'). Ardından telefon_sayaclari ve hoca_ekran_sureleri'nde gun < bugün - 395 gün, isletim_uyarilari'nda kapanma_ani 395 günden eski satırları 5.000'lik kısa işlemlerle siler, sayıları loglar.",
  },
  {
    name: 'ci_kalite_kapilari',
    schedule: 'Her çekme isteğinde, ana dala her gönderimde ve birleştirme kuyruğunda (merge_group); GitHub Actions kalite.yml; aynı dal için yeni koşu eskisini iptal eder (concurrency).',
    idempotency: 'Aynı commit için aynı sonucu verir: kilit dosyası değişmeden kurulum (pnpm install --frozen-lockfile), test veritabanı her koşuda tmpfs\'te sıfırdan.',
    does:
      "Sırayla: Biome ci (biçim, kurallar, modül sınırları); tsc tip denetimi; D12'nin göç denetimleri (yeniden üretme farkı, sahiplik haritası, Squawk) ve docker/postgres/surum-denetimi.sh; packages/core'da Vitest ve fast-check, satır ve dal kapsamı en az yüzde 90 (@vitest/coverage-v8), TZ=UTC ve TZ=Europe/Istanbul ile iki koşu; apps/server Vitest testleri; docker compose --profile test up --wait postgres-test ve Cucumber senaryoları (paralel koşu os.availableParallelism(): açık depoda 4, özel depoda 2); docker compose config ile Compose doğrulaması ve servis sırları matrisi; Caddyfile doğrulaması ve Caddy yol, başlık ve gövde sınırı senaryosu; yayin-bilgisi kaynağının D13 şemasıyla denetimi; Node sürümü denetimi (.node-version, apps/server/Dockerfile'daki taban imaj etiketi ve apps/mobile/eas.json'daki node sürümü aynı değilse kırmızı; üç dosyada aynı sürüm kararı teknik.html#temel, Dependabot yalnız Dockerfile'ı yükselttiğinde sürümler sessizce ayrışmasın). oasdiff kırılma kapısı D13'ün sozlesme.yml dosyasındadır. permissions: contents: read; her dış eylem tam commit özetiyle; eylemlerin çalışma ortamı Node 24 (teknik.html#altyapi-imaj).",
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
      "Ekosistemler: npm (kök; gruplar: üretim küçük ve geliştirme küçük güncellemeleri), github-actions, docker (apps/server/Dockerfile, docker/postgres/Dockerfile; Node taban imajı ayrı 'node-taban' grubunda, tek başına istek açar ve kalite kapısının Node sürümü denetimi .node-version ile eas.json aynı istekte güncellenene kadar kırmızı kalır) ve docker-compose (compose.yaml, docker/postgres/compose.yaml). 3 günlük bekleme varsayılandır, yazılmaz (teknik.html#altyapi-guncellemeler). Dışarıda kalanlar: Expo'nun belirlediği paketler (expo, expo-*, react, react-native; SDK yükseltmesinde topluca), xprem imajı (eoas aracıyla aynı sürümde elle, teknik.html#dagitim-ayrinti-xprem-guvenligi), pgBackRest paket sürümü (elle), SheetJS (npm dışında). Büyük sürüm ayrı istek açar; elle ve testler yeşilken birleştirilir.",
  },
  {
    name: 'yayin_oncesi_yuk_testi',
    schedule: 'Elle, tetik tablosuna göre (Durumlar ve kurallar, Yük testi): ilk yayından, her dönem başından, gönderim, saat belgesi, kimlik ya da yoklama şemasına dokunan sunucu yayınından ve Fastify, PostgreSQL, Node ya da Drizzle büyük sürüm geçişinden önce; hazırlık makinesinde (D15-A04).',
    idempotency: 'Hazırlık veritabanı her koşudan önce tohum betiğiyle aynı tohumdan sıfırdan kurulur; aynı tohum aynı veriyi üretir.',
    does:
      "apps/server/test/yuk/ altındaki k6 senaryoları üretim boyutundaki (4 çekirdek, 8 GB, 100 GB SSD) hazırlık makinesinde, sınırlar açık, binlerce ayrı cihaz kimliğiyle, sabit geliş hızıyla koşar: ders başı, ders çıkışı (en kötü durum 20.000 telefon 1 dakikada), gece ve giriş yığılması profilleri; ders çıkışı sürerken 50 hoca rapor ve AKSİS özeti ister, Aşama 2 sunucu parçası (D11) yayındaysa 500 kürsü 10 saniyede bir GET /v1/projeksiyon/kodlar ister ve telefonların kayıtları QR alanı taşır (D11 senaryosu, apps/server/test/yuk/ortak/kursu.ts). Veritabanı bir dönemlik veriyle (yaklaşık 4,2 milyon kayıt) doludur. Geçme ölçütleri k6 thresholds ve koşu sonrası denetim betiğiyle otomatik verilir; ölçülen makine boyutu, eşikler, havuz ve 100.000 kayıt başına tablo boyutu teknik.html'e yazılmak üzere raporlanır (teknik.html#altyapi-sunucu-makinesi).",
  },
];

const state_machines = [
  {
    name: 'İşletim uyarısı (isletim_uyarilari satırı)',
    states: ['YOK', 'ACIK_BILDIRILMEDI', 'ACIK_BILDIRILDI', 'KAPANDI_BILDIRILMEDI', 'KAPANDI'],
    transitions: [
      { from: 'YOK', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc (D15 denetimi ya da başka modül)', when: "(tur, anahtar) için açık satır yok: yeni satır, durum ACIK, son_bildirim_ani boş." },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc', when: 'Koşul yeniden görüldü: son_gorulme_ani, tekrar_sayisi, son_deger ve satirlar yenilenir.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILDI', by: 'isletim_denetimi (bildirim adımı)', when: 'Alıcı başına özet e-posta en az bir alıcıya GONDERILDI: son_bildirim_ani yazılır, bildirim_hatasi false (sonuç ayrı kısa işlemde).' },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILMEDI', by: 'isletim_denetimi (bildirim adımı)', when: 'Hiçbir alıcıya gitmedi ya da 120 saniyelik bütçe doldu: bildirim_hatasi true; kalp atışı sorun adresine döner, sonraki çalışma yeniden dener.' },
      { from: 'ACIK_BILDIRILDI', to: 'ACIK_BILDIRILDI', by: 'isletim_denetimi (bildirim adımı)', when: 'Hatırlatma: son bildirimden bu yana KRITIK 6, UYARI 24 saat geçti; yeni e-posta, bildirim_sayisi artar.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'ACIK_BILDIRILMEDI', by: 'isletim_denetimi ya da sertifika_bitis_denetimi', when: 'Türün girdisi bu çalışmada okunamadı (durum dosyası yok ya da bozuk, sorgu hata verdi, Caddy bağlantısı yok) ya da tür bu işin değerlendirdiği türlerden değil: satıra dokunulmaz, kapanmaz ve yenilenmez (okunamayan dosya hiçbir zaman sağlıklı sayılmaz). ACIK_BILDIRILDI için de aynı.' },
      { from: 'ACIK_BILDIRILMEDI', to: 'KAPANDI', by: "türün değerlendiricisi (UYARI_TURLERI: isletim_denetimi; sertifika_* için sertifika_bitis_denetimi) ya da SESSIZLIK'te isletim_denetimi", when: 'KOSUL uyarısında değerlendirici bu çalışmada girdiyi başarıyla okudu ve koşul o anahtar için yanlış çıktı; ya da SESSIZLIK uyarısı 26 saattir yeniden açılmadı. Hiç bildirilmemişti: kapanma_ani yazılır, düzeldi iletisi gitmez.' },
      { from: 'ACIK_BILDIRILDI', to: 'KAPANDI_BILDIRILMEDI', by: 'aynı', when: 'Aynı kapanma koşulu, uyarı daha önce bildirilmişti.' },
      { from: 'KAPANDI_BILDIRILMEDI', to: 'KAPANDI', by: 'isletim_denetimi (bildirim adımı)', when: 'Düzeldi satırı özet e-postayla en az bir alıcıya gitti: kapanis_bildirimi_ani yazılır.' },
      { from: 'KAPANDI', to: 'ACIK_BILDIRILMEDI', by: 'uyariAc', when: 'Aynı tür ve anahtar yeniden görüldü: eski satır kanıt olarak kalır, yeni satır açılır (kısmi tekil dizin yalnız açık satırı sayar).' },
      { from: 'KAPANDI', to: 'YOK', by: 'haftalik_olcum_ozeti', when: 'kapanma_ani 395 günden eski: satır silinir.' },
    ],
  },
  {
    name: 'API kopyası (server.ts süreci)',
    states: ['ACILIYOR', 'VERITABANI_BEKLENIYOR', 'HAZIR', 'HAZIR_DEGIL', 'KAPANIYOR', 'KAPANDI'],
    transitions: [
      { from: 'ACILIYOR', to: 'KAPANDI', by: 'server.ts', when: 'ayarlariYukle hata verdi (eksik ayar ya da sır, saat dilimi adı UTC ya da Etc/UTC değil, bellek eşiği kap sınırından büyük): çıkış kodu 78, Docker yeniden başlatır.' },
      { from: 'ACILIYOR', to: 'VERITABANI_BEKLENIYOR', by: 'server.ts', when: "Ayarlar ve log hazır, veritabanı havuzu kuruldu. Yüklenen her anahtar amacı için { olay: isletim.anahtarlar_yuklendi, amac, kumeOzeti } log satırı yazılmıştır (kumeOzeti: sıralı kid, durum ve anahtar özetinin SHA-256'sı; anahtarın kendisi değil); işçi de aynı satırı yazar, döndürmede makine/anahtar.sh bunu dosyayla karşılaştırır." },
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
      { from: 'YOK', to: 'YOK', by: 'telefon_sayaci öğesi', when: "Paketin kişisinin hesabı silinmiş (app.ts'ten gelen hesapSilindiMi(tx, kisiId) true; D01 okuyucusu kişi satırını FOR SHARE ile okuduğundan eşzamanlı silmeyle sıralanır): hiçbir tabloya yazılmaz, KABUL { uygulandi: false } döner ve telefonun kuyruğu boşalır." },
      { from: 'YOK', to: 'YOK', by: 'telefon_sayaci öğesi', when: 'Personel paketindeki ekran süreleri kişi ve gün tavanını (500 satır ya da 5 kaynak kimliği; yalnız yeni anahtarlar sayılır) aşıyor: öğe hiçbir tabloya yazılmaz, KABUL { uygulandi: false } ve { olay: isletim.ekran_suresi_tavani, atilan } log satırı. KAYITLI satır için de aynı, satır değişmez.' },
      { from: 'KAYITLI', to: 'SILINDI', by: 'haftalik_olcum_ozeti ya da kimlikOlayiDinleyicisi', when: 'gun 395 günden eski ya da kişinin hesabı silindi (hesap_silindi olayı, aynı işlemde).' },
    ],
  },
  {
    name: 'Gizli anahtar (amaç başına kid)',
    states: ['URETILDI', 'HAZIR', 'ETKIN', 'YALNIZ_DOGRULAMA', 'ELE_GECIRILDI', 'SILINDI'],
    transitions: [
      { from: 'URETILDI', to: 'ETKIN', by: 'anahtar-uret uret', when: 'Yalnız ilk kurulumda, henüz hiçbir süreç yokken: 32 rastgele bayt, kid deseni ^[a-z0-9-]{1,8}$ (ör. sb27b), etkinKid bu kid olur.' },
      { from: 'URETILDI', to: 'HAZIR', by: 'makine/anahtar.sh dondur, adım 1 (anahtar-uret dondur --hazirla)', when: "Döndürmenin ilk adımı: yeni kid dosyaya HAZIR durumda eklenir; doğrulamada kabul edilir, imzada kullanılmaz (gizliAnahtar(amac) hâlâ eski etkin anahtarı verir). Sonra isci, api-1 ve api-2 sırayla yeniden başlar ve anahtar.sh her sürecin açılış logundaki kumeOzeti'nin dosyanınkiyle aynı olduğunu doğrular; tutmazsa yeni kid silinir, dosya önceki haline döner, süreçler yeniden başlar, betik durur." },
      { from: 'HAZIR', to: 'ETKIN', by: 'makine/anahtar.sh dondur, adım 2 (anahtar-uret dondur --etkinlestir)', when: 'Bütün süreçler yeni kidi doğrulamada tanıyınca: etkinKid yeni kid olur; süreçler aynı sırayla yeniden başlar ve küme özeti yine denetlenir. Geçişte yeni kidle imzalayan süreç ile henüz yeniden başlamamış süreç aynı belgeyi doğrular, KID_BILINMIYOR oluşmaz.' },
      { from: 'ETKIN', to: 'YALNIZ_DOGRULAMA', by: 'makine/anahtar.sh dondur, adım 2', when: 'Yeni kid etkin oldu: eski anahtar yalnız doğrulamada kalır, emeklilikAni yazılır.' },
      { from: 'YALNIZ_DOGRULAMA', to: 'SILINDI', by: 'makine/anahtar.sh dondur, adım 2', when: 'Bir sonraki döndürmede (bir dönem sonra): önceki döndürmede emekliye ayrılan anahtar silinir; böylece eski anahtar en az dönem kilidine kadar ve bir dönem daha durur.' },
      { from: 'ETKIN', to: 'ELE_GECIRILDI', by: 'makine/anahtar.sh ele-gecirildi --supheden <an>', when: "Sızıntı şüphesi: aynı iki adım (yeni kid önce HAZIR, sonra ETKIN); ikinci adımda eski kid ELE_GECIRILDI olur ve eleGecirilmeAni şüphe anı yazılır. Bu kidle doğrulanan belge anahtarEleGecirildi true döner (D04), kayıt İncelemede alınır (D07). Son adımda saat belgesi ve QR amaçlarında anahtar-uret, o kidli belgeyi taşıyıp şüphe anından sonra ulaşmış ama işaretten önce doğrulanmış kayıtları D07.yenidenDegerlendir ile yeniden değerlendirir." },
      { from: 'YALNIZ_DOGRULAMA', to: 'ELE_GECIRILDI', by: 'makine/anahtar.sh ele-gecirildi --supheden <an>', when: 'Emekli anahtar için şüphe: etkin kid değişmez, tek adım (işaret, eleGecirilmeAni, süreçlerin yeniden başlaması, küme özeti, yeniden değerlendirme).' },
      { from: 'ELE_GECIRILDI', to: 'SILINDI', by: 'makine/anahtar.sh dondur, adım 2', when: 'Bir sonraki dönem arası döndürmesinde.' },
    ],
  },
  {
    name: 'Sunucu yayını (makine/yayinla.sh)',
    states: ['HAZIRLIK', 'IMAJ_DOGRULANDI', 'YEDEK_DENETLENDI', 'GOC_TAMAM', 'XPREM_YENI', 'ISCI_YENI', 'API_1_YENI', 'API_2_YENI', 'CADDY_YENI', 'TAMAM', 'DURDU', 'GERI_DONULDU'],
    transitions: [
      { from: 'HAZIRLIK', to: 'IMAJ_DOGRULANDI', by: 'yayinla.sh <sürüm>', when: "Yayın penceresi uygun (İstanbul saatiyle, TZ=Europe/Istanbul date; hafta içi 08:00-20:00 arası yalnız --simdi ile). /var/lib/iu-yoklama/durum/makine/bakim.json yazılır (betik her çıkışta trap ile siler). Girdiler sabit: ghcr.io/<depo>/iu-yoklama-sunucu:<sürüm> özete çözülür ve o özet makinedeki sabit açık anahtarla (/opt/iu-yoklama/cosign-sunucu.pub, kur.sh bir kez koyar; imajla gelmez) cosign verify'dan geçer; imajın org.opencontainers.image.version etiketi istenen sürüme eşittir (eski imzalı imaja dönüş saldırısı reddedilir). compose.yaml, D12'nin docker/postgres klasörü, docker/xprem/surum.env (caddy ve xprem özetleri) ve ana makine betikleri doğrulanmış imajın /app/yayin/ klasöründen docker create ve docker cp ile alınır; github.com'a erişilmez, D15-B10 çıkış listesi değişmez. caddy ve (değiştiyse) xprem imajları surum.env'deki özetle çekilip cosign verify geçer (xprem kendi açık anahtarıyla, docker/xprem/cosign.pub). Yeni ayar /opt/iu-yoklama/yayin.env'e, öncekisi surum.env.onceki'ye yazılır. anahtar-uret denetle geçer." },
      { from: 'HAZIRLIK', to: 'DURDU', by: 'yayinla.sh', when: 'Pencere dışı, imza, sürüm etiketi ya da anahtar denetimi tutmadı: hiçbir servis değişmez, bakim.json silinir, betik 1 ile çıkar.' },
      { from: 'IMAJ_DOGRULANDI', to: 'YEDEK_DENETLENDI', by: 'yayinla.sh', when: 'D12 docker/postgres/yedek/pgbackrest.sh denetle başarılı.' },
      { from: 'IMAJ_DOGRULANDI', to: 'DURDU', by: 'yayinla.sh', when: 'Yedek denetimi tutmadı: hiçbir servis değişmez, betik durur.' },
      { from: 'YEDEK_DENETLENDI', to: 'GOC_TAMAM', by: 'yayinla.sh', when: 'docker compose run --rm goc (node --run db:migrate: D12 göç adımı, pg-boss migrate, D14 kur) 0 ile bitti.' },
      { from: 'YEDEK_DENETLENDI', to: 'DURDU', by: 'yayinla.sh', when: 'Göç hata verdi: hiçbir servis değişmez, betik durur, yayin.env önceki haline döner. O ana kadar uygulanmış göçler geri alınmaz; çalışan eski kopyalar önce genişlet, sonra daralt kuralıyla genişlemiş şemada çalışır (teknik.html#sunucu-mimari). Sahip hatayı göç defterinden okur (D12).' },
      { from: 'GOC_TAMAM', to: 'XPREM_YENI', by: 'yayinla.sh', when: "xprem özeti değiştiyse xprem yeni imajla yeniden kurulur ve 120 saniye içinde Compose sağlığı healthy olur; değişmediyse adım atlanır. xprem imajı ile eoas aynı sürümde tutulur (teknik.html#dagitim-ayrinti-xprem-guvenligi)." },
      { from: 'XPREM_YENI', to: 'ISCI_YENI', by: 'yayinla.sh', when: "isci yeni imajla yeniden kuruldu (eski işçi 40 saniyede pg-boss'u düzgün durdurur); yeni kap 60 saniye içinde running ve yeniden başlamadı." },
      { from: 'ISCI_YENI', to: 'API_1_YENI', by: 'yayinla.sh', when: 'api-1 yeniden kuruldu; eski kopya kapanışta devreden çıktı; yeni kopyada Compose sağlığı healthy ve /health/ready 204 (120 saniye içinde).' },
      { from: 'API_1_YENI', to: 'API_2_YENI', by: 'yayinla.sh', when: 'api-2 için aynı adım.' },
      { from: 'API_2_YENI', to: 'CADDY_YENI', by: 'yayinla.sh', when: "caddy imajı değiştiyse yeniden kuruldu (panel dosyaları API'den sonra; D13-B31 sırası), değişmediyse atlandı." },
      { from: 'CADDY_YENI', to: 'TAMAM', by: 'yayinla.sh', when: "Duman denemesi: ana makineden https://<ALAN_ADI>/v1/durum 204, iki kopyada /health/ready 204; bakim.json silinir; /var/log/iu-yoklama/yayinlar.log'a satır." },
      { from: 'XPREM_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri (kendiliğinden)', when: 'xprem sağlığı 120 saniyede gelmedi: önceki özetler geri yazılır, xprem önceki imajla yeniden kurulur.' },
      { from: 'ISCI_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri (kendiliğinden)', when: 'İşçi 60 saniyede kararlı açılmadı: değişen servisler (xprem, işçi) önceki özetle aynı sırayla yeniden kurulur.' },
      { from: 'API_1_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri (kendiliğinden)', when: 'api-1 sağlığı ya da /health/ready 120 saniyede gelmedi: surum.env.onceki geri yazılır, değişen servisler (xprem, işçi, api-1) önceki özetle aynı sırayla yeniden kurulur; göç geri alınmaz (önce genişlet, sonra daralt kuralıyla eski imaj yeni şemada çalışır, teknik.html#sunucu-mimari).' },
      { from: 'API_2_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri (kendiliğinden)', when: 'api-2 adımı tutmadı: aynı geri dönüş, api-1 ve api-2 dahil.' },
      { from: 'CADDY_YENI', to: 'GERI_DONULDU', by: 'yayinla.sh --geri (kendiliğinden)', when: 'caddy açılmadı ya da duman denemesi tutmadı: bütün değişen servisler (xprem, işçi, iki API kopyası, caddy) önceki özetle aynı sırayla yeniden kurulur; geri dönüşten sonra duman denemesi yeniden koşar, o da tutmazsa betik sahibe yazıp durur. Her geri dönüşte bakim.json silinir ve yayinlar.log satırı yazılır.' },
    ],
  },
];

const invariants = [
  'telefon_sayaclari, hoca_ekran_sureleri ve isletim_uyarilari tablolarına yalnız D15 kodu yazar; başka modül uyarıyı yalnız uyariAc ile açar, sayaçlar yalnız telefon_sayaci öğesiyle ve ekran-sureleri ucuyla gelir.',
  'D15 tabloları alan tablolarına yabancı anahtar kurmaz ve infra/izleme ile jobs/isletim hiçbir alan modülünü (D01 ile D11) içe aktarmaz; D06, D12, D13 ve D14 dış yüzleri bileşim köklerinden parametreyle gelir. D01, D03, D04 ve D07\'ye yalnız bileşim kökleri (app.ts eklenti seçenekleriyle, server.ts, anahtar-uret komutu) ve test dünyası dokunur.',
  '(kurulum_id, gun) başına en çok bir telefon sayacı satırı vardır ve satır o gün için gelmiş en büyük sıralı geçerli öğenin değerlerini taşır; aynı öğeler hangi sırayla ulaşırsa ulaşsın sonuç aynıdır.',
  'hoca_ekran_sureleri.saniye aynı (kişi, oturum, gün, ekran, kaynak, kaynak kimliği) anahtarında hiç azalmaz ve 86400\'ü aşmaz.',
  "isletim_uyarilari'nda (tur, anahtar) başına en çok bir ACIK satır vardır; bir uyarı hatırlatma süresi dolmadan ikinci kez bildirilmez, hiç bildirilmemiş uyarının kapanışı bildirilmez.",
  "Bir KOSUL uyarısını yalnız türünü UYARI_TURLERI'nde değerlendiren iş, o çalışmada türün girdisini başarıyla okuyup koşulu yanlış bulduğunda kapatır; girdisi okunamayan uyarı açık kalır ve 'düzeldi' iletisi gitmez.",
  "Açık KRITIK uyarı, gönderilemeyen bildirim ya da son başarısı 25 dakikadan eski işletim denetimi varken kalp atışı normal adrese gitmez; kalp atışının kendi okuması hata verirse de gitmez: sahibe SMTP'den ve denetimin kendisinden bağımsız en az bir yol her zaman açıktır.",
  "Silinmiş hesabın kişisine ait hiçbir telefon sayacı ya da ekran süresi satırı yeniden oluşmaz: gecikmiş telefon_sayaci öğesi hiçbir tabloya yazmadan KABUL { uygulandi: false } alır.",
  "hoca_ekran_sureleri'nde (kisi_id, gun) başına en çok 500 satır ve en çok 5 ayrı kaynak_kimligi vardır (panel ucunda kesin, telefon yolunda panel ile eşzamanlı istek kadar aşılabilir).",
  'D15 tablolarında, loglarında, uyarı metinlerinde, iş verisinde ve durum dosyalarında öğrenci numarası, isim, e-posta adresi, kod, jeton ve gizli anahtar bulunmaz; yalnız iç kimlik (UUID) ve rota kalıbı bulunur.',
  '/health/live ve /v1/durum veritabanına dokunmaz, aşırı yük denetimi dışındadır ve yalnız kapanışta 503 döner; /health/* dışarıdan Caddy üzerinden hiçbir zaman API\'ye ulaşmaz.',
  'Hiçbir süreç gizli anahtarı açılışta üretmez; sürecin zorunlu sırrı yoksa ya da geçersizse süreç açılmaz. Her amaçta tam bir ETKIN ve en çok bir HAZIR anahtar vardır, kid amaç içinde tekildir, anahtar 32 bayttır. Bir kid, onu kullanan bütün süreçler (api-1, api-2, isci) onu doğrulamada tanımadan etkin olmaz.',
  "API, işçi ve göç kapları TZ=UTC ile çalışır; sürecin saat dilimi adı (Intl.DateTimeFormat().resolvedOptions().timeZone) UTC ya da Etc/UTC değilse ayarlariYukle açılışı durdurur (saat farkına bakılmaz: Europe/London kışın sıfır farkla geçerdi). İstanbul günü yalnız açık zaman dilimiyle hesaplanır; ana makinedeki zamanlayıcı ve betikler de dilimi açıkça yazar (OnCalendar ... Europe/Istanbul, TZ=Europe/Istanbul date), makinenin saat dilimine güvenilmez.",
  'Ana makinede yazılan her durum dosyası geçici dosya ve rename ile bütün olarak yazılır ve ölçüm anı taşır; okuyan taraf eskimiş ya da okunamayan dosyayı hata sayar, hiçbir zaman sağlıklı saymaz.',
  'Bütün havuzların ve ayrılmış bağlantıların toplamı 80\'i geçmez (D12 bütçesi: iki API kopyası 40, işçi 5, xprem 10, göç 2, pgBackRest 2, gece dökümü 1, süper kullanıcı 3).',
  'Üretimde imaj yalnız özetle çekilir ve cosign verify geçmeden kurulmaz; CI sunucuya erişmez, yayını sahibin SSH ile başlattığı betik yapar.',
  'Her CI iş akışı varsayılan olarak yalnız okuma yetkilidir (permissions: contents: read); yazma yetkisi yalnız yayın işlerinde ve iş düzeyinde verilir; her dış eylem tam commit özetiyle sabittir.',
  'Kırmızı kalite kapısı birleştirmeyi, kırmızı haftalık iş sunucu yayınını durdurur.',
];

module.exports = { jobs, state_machines, invariants };

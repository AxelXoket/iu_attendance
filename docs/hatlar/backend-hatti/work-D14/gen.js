// Generates inv/D14.json. Run: node gen.js
const fs = require('fs'), path = require('path');
const P = 'plan.html', T = 'teknik.html', S = 'tasarim.html';
const a = (f, id) => id ? `${f}#${id}` : f;

// [fact, file, id, quote]
const decided = [
  // Is sistemi (pg-boss)
  [`İş sistemi pg-boss 12'dir; en az 12.36.0, sürüm tam sabitlenir.`, T, 'sunucu-arka-plan', `pg-boss 12, en az 12.36.0, sürüm tam sabit.`],
  [`İşçiler API'den ayrı süreçte çalışır.`, T, 'sunucu-arka-plan', `İşçiler API'den ayrı süreçte.`],
  [`Ortak altyapı (veritabanı, iş kuyruğu, oturum doğrulama, saat, e-posta) sunucunun kökünde bir kez kaydedilir; modüller kendi eklentileriyle /v1 altında durur.`, T, 'sunucu', `Ortak altyapı (veritabanı, iş kuyruğu, oturum doğrulama, saat, e-posta) kökte bir kez kaydedilir`],
  [`apps/server/src/app.ts uygulamayı kurar; veritabanı, saat, e-posta ve iş kuyruğu ona dışarıdan verilir.`, T, 'kod', `uygulamayı kurar (veritabanı, saat, e-posta, iş kuyruğu dışarıdan verilir)`],
  [`apps/server/src/worker.ts işçi sürecini başlatır (pg-boss işleri); iş görevleri jobs/ klasöründe, iş kuyruğu ve e-posta altyapısı infra/ içinde durur.`, T, 'kod', `işçi sürecini başlatır (pg-boss işleri)`],
  [`İşler veritabanı işlemiyle birlikte kuyruğa girer; API'deki pg-boss yalnız iş gönderir ve Drizzle'ın havuzunu kullanır.`, T, 'sunucu-arka-plan', `İşler veritabanı işlemiyle birlikte kuyruğa girer; API'deki pg-boss yalnız iş gönderir, Drizzle'ın havuzunu kullanır.`],
  [`pg-boss tablolarını yayın adımında, Drizzle göçlerinden sonra pg-boss migrate kurar ve günceller.`, T, 'sunucu-arka-plan', `pg-boss tablolarını yayın adımında, Drizzle göçlerinden sonra`],
  [`API ve işçi açılırken göç yapmaz; sebebi pg-boss'un güncelleme komutlarının Drizzle'ın tek işleminde çalışamaması.`, T, 'sunucu-arka-plan', `uygulama açılırken göç yapmaz (pg-boss'un güncelleme komutları Drizzle'ın tek işleminde çalışamaz)`],
  [`apps/server/migrations yalnız ileri Drizzle SQL dosyalarını tutar; pg-boss tablolarını pg-boss'un kendi komutu kurar.`, T, 'kod', `pg-boss tablolarını kendi komutu kurar`],
  [`Göç servisi tek betik çalıştırır: db:migrate (önce Drizzle göçleri, sonra pg-boss'un kendi CLI'sıyla pg-boss migrate); geliştirme ortamı ve test koordinatörü de aynı betiği kullanır.`, T, 'altyapi-imaj', `geliştirme ortamı ve test koordinatörü de aynı betiği kullanır, göç adımı başka yerde yazılmaz`],
  [`Aynı imaj API, işçi ve tek seferlik göç servisi olur; API ve işçi göçlerin bitmesini bekler.`, T, 'altyapi-imaj', `Aynı imaj API, işçi ve tek seferlik göç servisi olur; API ve işçi göçlerin bitmesini bekler.`],
  [`Kapanışta işçi pg-boss'u düzgün durdurur; kapanma bekleme süresi pg-boss'un durdurma süresinden uzundur (örnek değer 40 saniye).`, T, 'altyapi-imaj', `işçi pg-boss'u düzgün durdurur; kapanma bekleme süresi pg-boss'unkinden uzun (ör. 40 saniye)`],
  [`Compose'ta işçi prod profilinde çalışır; Mailpit yalnız dev profilindedir.`, T, 'altyapi-servisler', `Caddy, API, işçi, göç servisi ve xprem prod profilinde, Mailpit yalnız dev profilinde`],
  [`İşçi kabı restart: unless-stopped ayarıyla kendiliğinden yeniden kalkar.`, T, 'altyapi-servisler', `Caddy, API, işçi, PostgreSQL ve xprem'de restart: unless-stopped`],
  [`API ve işçinin bellek sınırı var; belleği taşan süreç PostgreSQL'i değil kendi kabını düşürür.`, T, 'altyapi-servisler', `API ve işçinin bellek sınırı var`],
  [`İşçideki iş kuyruğu doğrudan bağlantıda kalır; API'nin iş göndermesi Drizzle'ın havuzunu kullandığından PgBouncer eklenince onun üstünden geçer.`, T, 'veritabani-donem-alani', `İşçideki iş kuyruğu doğrudan bağlantıda kalır`],
  [`PostgreSQL'in varsayılan 100 bağlantı sınırına göre yapılan bağlantı hesabına işçi de girer (API kopyaları, xprem, göç servisi, pgBackRest ve süper kullanıcıya ayrılan 3 bağlantıyla birlikte).`, T, 'veritabani-donem-alani', `hesaba API kopyalarıyla birlikte işçi, xprem`],
  [`Sunucu kendi içinde durum tutmadığından aynı imajdan birden çok kopya çalışabilir; işçiler API'den ayrı ölçeklenir.`, P, 'teknoloji-sunucu-yeri', `Sunucu kendi içinde durum tutmadığından aynı imajdan birden çok kopya, önündeki Caddy'yle çalışabilir; işçiler ayrı ölçeklenir.`],
  [`pg-boss'un yedeği graphile-worker'dır; o da tek bakımcılı olduğundan yalnız kaçış yoludur.`, T, 'temel-yedek-paketler', `pg-boss (graphile-worker; o da tek bakımcılı: npm'de tek yayımcısı Benjie Gillam`],
  [`İşçinin çalıştığı pg-boss'un kayıt tablosundan izlenir; /health/ready veritabanına ve şema sürümüne bakar, işçiye bağlanmaz.`, T, 'sunucu-ayarlar', `İşçinin çalıştığı pg-boss'un kayıt tablosundan izlenir.`],
  [`İlk sürümde OpenTelemetry yok; sunucu kopyaları çoğalınca @fastify/otel eklenir, pg-boss'un OpenTelemetry desteği hazır.`, T, 'sunucu-ayarlar', `sunucu kopyaları çoğalınca @fastify/otel eklenir (pg-boss'un OpenTelemetry desteği hazır)`],

  // Zamanlanmis isler
  [`Ders oturumu başına iş kurulmaz: birkaç dakikada bir çalışan tek zamanlanmış iş süresi dolmuş, kapanmamış bütün oturumları kapatır; aralık sayı olarak yazılmamış.`, T, 'sunucu-arka-plan', `Oturum başına iş yok: birkaç dakikada bir tek zamanlanmış iş süresi dolmuş, kapanmamış bütün oturumları kapatır`],
  [`Program değişince iş iptali gerekmez; oturum kapatma işi iki kez çalışsa da sonuç değişmez.`, T, 'sunucu-arka-plan', `program değişince iş iptali gerekmez, iş iki kez çalışsa da sonuç değişmez.`],
  [`Oturum satırında "kapandı mı" alanı var ve süresi dolanı zamanlanmış iş kapatır; açılış ve kapanış anı UTC (timestamptz) olarak sunucuda üretilir.`, T, 'kod-veri-modeli', `kapandı mı (süresi dolanı zamanlanmış iş kapatır)`],
  [`Gece inceleme sıralaması İstanbul saatiyle, yoğunluk dışı ve gecelik pg_dump ile çakışmayan bir saatte zamanlanır; saatin kendisi yazılmamış.`, T, 'sunucu-arka-plan', `İstanbul saatiyle, yoğunluk dışı ve gecelik`],
  [`İşçi kapalıyken kaçan gece inceleme sıralaması işçi açılınca bir kez çalışır (pg-boss ayarı missed: once).`, T, 'sunucu-arka-plan', `işçi kapalıysa açılınca bir kez çalışır`],
  [`Şüpheli kayıtlar hocaya her gece aşamalı sorulur, dönem sonunda yığılmasın diye.`, P, 'kararlar-supheli-kayit', `her gece aşamalı sorulur (dönem sonunda yığılmasın)`],
  [`Gece inceleme sıralaması işi kararı değiştirmez; kararlar kayıt geldiğinde ya da ilgili olay olduğunda (teyit, ayar değişikliği, kafa sayısı) aynı işlemde verilir, işe bırakılmaz.`, P, 'kararlar-supheli-kayit', `Gece inceleme sıralaması işi kararı değiştirmez: kararlar kayıt geldiğinde ya da ilgili olay olduğunda (teyit, ayar değişikliği, kafa sayısı) aynı işlemde verilir.`],
  [`Gece işi bekleyen incelemeleri ve sorun bildirimlerini sıralayıp her hocanın ertesi gün göreceği küçük partiye koyar (sıralama ölçütü ve parti boyu D09'un).`, P, 'kararlar-supheli-kayit', `Gece işi bekleyen incelemeleri ve sorun bildirimlerini sıralayıp her hocanın ertesi gün göreceği küçük partiye koyar`],
  [`Gece inceleme sıralaması aynı girdiyle iki kez çalışsa da sonuç değişmez.`, P, 'kararlar-supheli-kayit', `Aynı girdiyle iki kez çalışsa da sonuç değişmez`],
  [`pgBackRest'in istenen âna dönülebilen yedeğine ek olarak gecelik pg_dump alınır ve düzenli geri yükleme denemesi yapılır; ikisinin saati ve sıklığı yazılmamış.`, T, 'veritabani-yedek', `ayrıca gecelik pg_dump ve düzenli geri yükleme denemesi`],
  [`xprem'in güncelleme dosyalarını tutan birim PostgreSQL yedeğine girmediğinden her gece pg_dump'tan sonra aynı şifreli yedek deposuna kopyalanır; kopyalama aracı henüz seçilmedi.`, T, 'dagitim-ayrinti-guncelleme-sunucusu', `PostgreSQL yedekleri bu birimi kapsamadığından birim her gece`],
  [`Android anahtar kanıtının iptal listesi düzenli çekilir; sıklığı yazılmamış.`, T, 'sunucu-imza-dogrulama', `iptal listesi düzenli çekilir`],
  [`CI'da (sunucuda değil) iki zamanlanmış iş var: saat başı olmayan bir dakikada gecelik pnpm audit --prod ve haftalık iş.`, T, 'altyapi-imaj', `Zamanlanmış iki iş var: gecelik pnpm audit --prod (saat başı olmayan bir dakikada`],
  [`Caddy'nin aldığı sertifikada bitişine 14 gün, elle yenilenen üniversite sertifikasında 30 gün kala uyarı verilir; uyarıyı neyin ürettiği yazılmamış.`, T, 'altyapi-caddy', `Caddy'nin aldığı sertifikada bitişine 14 gün kala uyarı`],
  [`Sunucu makinesinin saati NTP ile eşitlenir ve izlenir.`, T, 'altyapi-servisler', `Sunucu makinesinin saati NTP ile eşitlenir ve izlenir`],
  [`Ölçüm için ayrı ham olay tablosu yok; gönderme süresi, saati doğrulanamayan ve işaretli oranlar yoklama kayıtlarından tek sorguyla hesaplanır.`, P, 'kararlar-olcum', `Ayrı ham olay tablosu yok: gönderme süresi, saati doğrulanamayan ve işaretli oranlar yoklama kayıtlarından tek sorguyla hesaplanır.`],

  // Is verisi ve log kurallari
  [`İş kuyruğundaki işler kod, isim ve öğrenci numarası taşımaz.`, P, 'kararlar-roller', `iş kuyruğundaki işler kod, isim, öğrenci numarası taşımaz`],
  [`Öğrenci numarası ve isim loglara hiç yazılmaz, yalnız iç kimlik (UUID); pino'nun gizleme ayarı ikinci güvencedir.`, T, 'sunucu-ayarlar', `Öğrenci numarası ve isim loglara hiç yazılmaz, yalnız iç kimlik (UUID); pino'nun gizleme ayarı ikinci güvence.`],
  [`Veritabanı hatası yalnız hata kodu ve kısıt adıyla loglanır, sorgu değerleriyle değil.`, T, 'sunucu-ayarlar', `Veritabanı hatası yalnız hata kodu ve kısıt adıyla loglanır, sorgu değerleriyle değil`],

  // Saat ve saat dilimi
  [`Kural taşıyan her zaman (ulaşma anı, gönderme süresinin sonu, dönem kilidi) ortak kurallar paketindeki saat arayüzünden gelir; kural için SQL'de now() kullanılmaz.`, T, 'testler-veritabani-sifirlama', `kural taşıyan her zaman (ulaşma anı, gönderme süresinin sonu, dönem kilidi) arayüzden gelir`],
  [`Testlerde ortak kurallar paketinin sahte saati ile pg-boss'un test saati (TestClock, 12.33.0'dan beri, clock ayarıyla) tek nesneden yürür; bağlantıyı sunucunun test kurulumu yapar.`, T, 'testler-veritabani-sifirlama', `ortak kurallar paketinin sahte saati ile pg-boss'un test saati tek nesneden yürür`],
  [`TestClock yalnız pg-boss'un kendi SQL saatini (job_now()) kaydırır, uygulamanın SQL'indeki now()'u kaydırmaz; kural için now() yasağı bu yüzden de gerekli.`, T, 'testler-veritabani-sifirlama', `kural için now() yasağı bu yüzden de gerekli`],
  [`Test açık bir veritabanı işlemi tutarken saat ilerletilmez (tick kilidi bekler); uzun sıçramada tick değil setTime kullanılır.`, T, 'testler-veritabani-sifirlama', `Test açık bir veritabanı işlemi tutarken saat ilerletilmez`],
  [`Test komutları saat dilimini TZ=UTC'ye sabitler; senaryodaki saatler adımlarda açıkça İstanbul saatiyle yorumlanır; ortak kurallar paketinin testleri bir kez de TZ=Europe/Istanbul ile koşar.`, T, 'testler-veritabani-sifirlama', `Test komutları saat dilimini sabitler (TZ=UTC); senaryodaki saatler adımlarda açıkça İstanbul saatiyle yorumlanır`],
  [`Anlık zamanlar timestamptz; ders programındaki gün ve saat yerel time olarak tutulur ve Europe/Istanbul bölgesiyle yorumlanır, ders günü date.`, T, 'veritabani-donem-alani', `Ders programındaki gün ve saat yerel:`],
  [`Saatler İstanbul saatidir: sunucu her oturumun açılış ve kapanış anını UTC üretip telefona indirir, telefonun saat dilimi kullanılmaz.`, P, 'kararlar-inceleme-hesaplari', `Saatler İstanbul saati: sunucu her oturumun açılış ve kapanış anını UTC üretip telefona indirir`],
  [`packages/core Intl'i ve telefonun dil ayarını kullanmaz, saatleri UTC milisaniyeyle hesaplar.`, T, 'kod', `Intl'i ve telefonun dil ayarını kullanmaz, saatleri UTC milisaniyeyle hesaplar`],
  [`Panelde tarih ve saatler her zaman İstanbul saatiyle (Europe/Istanbul) ve Türkçe biçimle gösterilir, bilgisayarın saat dilimine bırakılmaz; e-postalar için ayrı kural yazılmamış.`, P, 'hoca', `Tarih ve saatler her zaman İstanbul saatiyle (Europe/Istanbul), Türkçe biçimle gösterilir`],

  // Testler
  [`Her senaryodan önce iş kuyruğu pg-boss'un deleteAllJobs komutuyla temizlenir; pg-boss'un iç tabloları elle sayılmaz.`, T, 'testler-veritabani-sifirlama', `iş kuyruğu pg-boss'un deleteAllJobs komutuyla temizlenir (iç tabloları elle sayılmaz)`],
  [`Testlerde işlem geri alma kullanılmaz; gerekçe: uygulama ve iş kuyruğu ayrı bağlantıda, geri alma gerçek hataları gizler.`, T, 'testler-veritabani-sifirlama', `İşlem geri alma kullanılmaz: uygulama ve iş kuyruğu ayrı bağlantıda, geri alma gerçek hataları gizler.`],
  [`Geliştirmede e-postalar gerçek adrese değil yerel test posta kutusuna (Mailpit) gider; testlerde bellek içi posta kutusuna düşer.`, T, 'sunucu-arka-plan', `Geliştirmede e-postalar gerçek adrese değil, yerel test posta kutusuna (Mailpit) gider; testlerde bellek içi posta kutusu.`],

  // E-posta
  [`E-posta Nodemailer'la SMTP üzerinden, tek arayüzün arkasında gönderilir; bu yüzden Nodemailer'ın son iyi sürümü sabitlenir, gerekirse çatallanır.`, T, 'temel-yedek-paketler', `Nodemailer (tek arayüzün arkasında durduğu için son iyi sürüm sabitlenir, gerekirse çatallanır)`],
  [`Kod e-postası sunucunun iş kuyruğuna konmaz ve cevap beklenmeden gider (istek e-postanın gitmesini beklemez).`, P, 'kararlar-roller', `e-posta cevap beklenmeden gider, sunucunun iş kuyruğuna konmaz`],
  [`Kod isteğine her durumda aynı cevap, aynı hızda döner.`, P, 'kararlar-roller', `Kod isteğine her durumda aynı cevap, aynı hızda`],
  [`Aynı adrese en sık dakikada 1, saatte 5, günde 10 kod gönderilir.`, P, 'kararlar-roller', `Aynı adrese en sık dakikada 1, saatte 5, günde 10 kod.`],
  [`Kopyalar arası kesin olması gereken sayaçlar (giriş kodları) PostgreSQL'de, kaba sınırlar her kopyanın belleğinde tutulur; Valkey yok.`, P, 'teknoloji-sunucu-yeri', `kopyalar arası kesin olması gereken sayaçlar (giriş kodları) zaten PostgreSQL'de, kaba sınırlar her kopyanın belleğinde`],
  [`Sunucu e-posta adresinin tamamını küçük harfe çevirir; İ ve I de i olur.`, P, 'kararlar-roller', `sunucu adresin tamamını küçük harfe çevirir, İ ve I de i olur.`],
  [`Giriş kodu e-postayla gelen 6 haneli koddur: 5 dakika geçerli, tek kullanımlık, 3 yanlış denemede geçersiz (doğrulaması D01'in).`, P, 'kararlar-roller', `E-postaya 6 haneli kod: 5 dakika geçerli, tek kullanımlık, 3 yanlış denemede geçersiz`],
  [`Kod ulaşmazsa hoca yenisini ister; onay bekleyen başvuru sahibine kod yerine "onay bekliyor" e-postası gider.`, P, 'kararlar-roller', `Kod ulaşmazsa hoca yenisini ister; onay bekleyene kod yerine "onay bekliyor" e-postası gider.`],
  [`Hoca başvurusu da e-postayla gelen kodla doğrulanır: kod girilince başvuru "onay bekliyor" olarak yöneticiye düşer, yönetici tek tek onaylar.`, P, 'kararlar-roller', `E-postadaki kod girilince başvuru "onay bekliyor" olarak yöneticiye düşer; yönetici tek tek onaylar`],
  [`Hoca başvurusu uygulamadan ya da panelden, ad-soyad, bölüm ve yalnız @istanbul.edu.tr e-postasıyla yapılır.`, P, 'kararlar-roller', `Uygulamadan ya da panelden ad-soyad, bölüm ve yalnız @istanbul.edu.tr e-postayla başvuru.`],
  [`Her başarılı girişte hocaya kısa bir bildirim e-postası gider: cihaz ya da tarayıcı türü ve saat yazar.`, P, 'kararlar-roller', `Her başarılı girişte hocaya kısa bir bildirim e-postası gider: cihaz ya da tarayıcı türü ve saat`],
  [`Bildirimde en eski oturum kapandıysa o da yazılır ve "Sen değilsen Oturumlarım ekranından kapat" cümlesi bulunur.`, P, 'kararlar-roller', `en eski oturum kapandıysa o da yazılır; "Sen değilsen Oturumlarım ekranından kapat"`],
  [`Bildirim e-postası gidemezse giriş geri alınmaz; durum denetim kaydına yazılır.`, P, 'kararlar-tek-etkenli-giris', `Bildirim e-postası gidemezse giriş geri alınmaz, durum denetim kaydına yazılır`],
  [`Gerekçe: kod e-postası aynı yoldan az önce ulaştığından bildirim hatası çoğunlukla geçicidir; bedeli o girişin uyarısının hocaya gitmemesi, giriş oturum listesinde ve denetim kaydında yine görünür.`, P, 'kararlar-tek-etkenli-giris', `kod e-postası aynı yoldan az önce ulaştığından bu çoğunlukla geçici bir gönderim hatasıdır`],
  [`Her girişteki bildirim e-postası tek etkenli girişin telafi önlemidir (ASVS 6.3.5, seviye 3 maddesi).`, P, 'kararlar-tek-etkenli-giris', `her girişte bildirim e-postası (ASVS 6.3.5; seviye 3 maddesi, telafi önlemi olarak alıyorum)`],
  [`Kodla giriş başarılı olunca giriş bildirimi kod e-postasıyla aynı yoldan gider; gidemezse durum denetim kaydına yazılır.`, T, 'sunucu-kimlik', `Kodla giriş başarılı olunca giriş bildirimi e-postası kod e-postasıyla aynı yoldan gider`],
  [`Kodlar sunucudan doğrudan @istanbul.edu.tr adına gönderilmez; üniversite postası Google Workspace'tedir ve sunucudan doğrudan giden böyle bir e-posta doğrulamadan geçmez.`, P, 'kararlar-e-posta-gonderimi', `Kodlar sunucumdan doğrudan @istanbul.edu.tr adına gitmez: üniversite postası Google Workspace'te`],
  [`istanbul.edu.tr'nin SPF kaydı yalnız Google'ı, Mailjet'i ve üniversitenin adres bloğunu tanıyor; DMARC politikası "p=none" (5 Ekim 2026).`, P, 'kararlar-e-posta-gonderimi', `alan adının SPF kaydı yalnız Google'ı, Mailjet'i ve üniversitenin kendi adres bloğunu tanıyor, DMARC politikası "p=none" (5 Ekim 2026)`],
  [`"p=none" yüzünden herkes yoklama@istanbul.edu.tr adına sahte e-posta yollayabilir; bu proje bunu değiştiremez.`, P, 'kararlar-e-posta-gonderimi', `"p=none" yüzünden herkes yoklama@istanbul.edu.tr adına sahte e-posta yollayabilir`],
  [`Her kod e-postasında ve giriş bildiriminde aynı sabit cümle durur.`, P, 'kararlar-e-posta-gonderimi', `Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.`],
  [`E-postalarda bağlantı yoktur; metin "yalnız kod var" der (kodsuz bildirim ve "onay bekliyor" e-postasıyla gerilim: D14-C02).`, P, 'kararlar-e-posta-gonderimi', `E-postalarda bağlantı yok, yalnız kod var.`],
  [`Kod biri tarafından kandırılarak alınırsa her girişte giden bildirim e-postası hocayı uyarır.`, P, 'kararlar-e-posta-gonderimi', `Kod biri tarafından kandırılarak alınırsa her girişte giden bildirim e-postası hocayı uyarır.`],
  [`Gönderici hesap (ör. yoklama@istanbul.edu.tr) BİDB'den Kurumsal e-Posta Talep Formu (İÜ/BİDB/FR-005) ve bir birimin resmî yazısıyla istenir.`, P, 'kararlar-e-posta-gonderimi', `BİDB'den (Bilgi İşlem Daire Başkanlığı) "Kurumsal e-Posta Talep Formu" (İÜ/BİDB/FR-005) ve bir birimin resmî yazısıyla gönderici hesap (ör. yoklama@istanbul.edu.tr) isterim`],
  [`Formda röle olmadığından sunucunun adresine Google SMTP rölesi izni aynı yazıda istenir; rölenin sınırı gönderici hesap başına günde 10.000 tekil alıcıdır.`, P, 'kararlar-e-posta-gonderimi', `formda röle yok, sunucu adresime Google SMTP rölesi iznini aynı yazıda isterim (rölenin sınırı gönderici hesap başına günde 10.000 tekil alıcı)`],
  [`Röle olmazsa aynı gönderici hesapla OAuth2 kullanılır.`, P, 'kararlar-e-posta-gonderimi', `röle olmazsa aynı hesapla OAuth2.`],
  [`BİDB gönderici hesap vermezse e-posta kendi alan adından, SPF, DKIM ve DMARC hizalı kurularak gönderilir; önce birkaç hoca adresinde denenir.`, P, 'kararlar-e-posta-gonderimi', `BİDB gönderici hesap vermezse kendi alan adımdan gönderirim: SPF, DKIM, DMARC hizalı kurulur, önce birkaç hoca adresinde denenir.`],
  [`Açık nokta: resmî yazıyı hangi birimin göndereceği ve aynı yazıda Google SMTP rölesi izni verilip verilmeyeceği belli değil.`, P, 'acik-hesap-ucretleri', `Aynı yazıda Google SMTP rölesi izni verilir mi?`],
  [`Aynı yazıda DMARC'ın kademeli olarak "quarantine" düzeyine çekilmesi önerilir; karar BİDB'nin, plan buna bağlı değil.`, P, 'acik-hesap-ucretleri', `DMARC'ın Google'ın önerdiği sırayla kademeli olarak "quarantine" düzeyine çekilmesini öneririm; karar BİDB'nin, plan buna bağlı değil.`],
  [`BİDB'ye resmî yazı (gönderici hesap ve SMTP rölesi) iş sırasının ilk adımında başlar; hoca girişi buna bağlıdır.`, P, 'baslangic', `gönderici e-posta hesabı ve SMTP rölesi, hoca girişi buna bağlı`],
  [`SMTP parolası dahil gizli anahtarlar ortam değişkeniyle değil, Compose secrets dosyasıyla ve yalnız gereken servise verilir.`, T, 'sunucu-ayarlar', `ortam değişkeniyle değil, Compose secrets dosyasıyla ve yalnız gereken servise verilir`],
  [`Her gizli anahtar tek iş içindir; ör. giriş kodu özet anahtarı saat belgesi ya da QR anahtarıyla paylaşılmaz.`, T, 'sunucu-ayarlar', `Her anahtar tek iş içindir: giriş kodu özet anahtarı saat belgesi ya da QR anahtarıyla paylaşılmaz.`],
  [`Öğrencinin e-postası, şifresi ve TC kimlik numarası tutulmaz; öğrenciye e-posta gönderilemez.`, P, 'kararlar-e-posta-gonderimi', `E-posta, şifre, TC kimlik numarası yok.`],
  [`Bildirimler yalnız telefonda yereldir (hak uyarısı, gönderilmemiş kayıt); push sonraya kaldı.`, P, 'kararlar-supheli-kayit', `Yalnız yerel (hak uyarısı, gönderilmemiş kayıt); push sonra.`],
  [`Hesap silme web adresinde hoca panele e-posta koduyla girip silmeyi başlatır.`, P, 'kararlar-hesap-silme', `Hoca o adreste panele e-posta koduyla girip silmeyi başlatır.`],
  [`Hoca hesabı silinince e-posta adresi ve giriş kodları silinir, oturumları kapanır.`, P, 'kararlar-hesap-silme', `Hoca hesabı silinince giriş bilgileri (e-posta adresi, giriş kodları) silinir, oturumları kapanır`],
  [`İnceleme için deneme hocası yalnız adresine tanımlı sabit kodla girer; kod depoda değil, mağaza panelinde ve sunucunun gizli ayarındadır.`, P, 'kararlar-inceleme-hesaplari', `Deneme hocası yalnız adresine tanımlı sabit kodla girer: kod depoda değil, mağaza panelinde ve sunucunun gizli ayarında`],
  [`İnceleme hesaplarının her girişi ve yanlış denemesi loglanır.`, P, 'kararlar-inceleme-hesaplari', `her girişi ve yanlış denemesi loglanır`],
  [`İlk yönetici komutu şifre ya da kod üretmez; yönetici de normal e-posta koduyla girer.`, T, 'sunucu-ilk-yonetici', `Şifre ya da kod üretmez; yönetici normal e-posta koduyla girer.`],
  [`Biome'un noFloatingPromises kuralı (unutulan await) sunucu kodunda hata düzeyindedir; kural deneme grubunda ve her durumu yakalamıyor.`, T, 'temel',`noFloatingPromises (unutulan await) sunucu ve telefon kodunda hata düzeyinde`],
  [`tasarim.html'deki giriş bildirimi örneği: başlık "Giriş bildirimi", zaman "6 Ekim 2026 Salı, 09:58" biçiminde, tarayıcı ve işletim sistemi, kapanan eski oturum; iki plan cümlesi dışındaki satırlar öneri metnidir.`, S, 'durumlar', `Hesabına 6 Ekim 2026 Salı, 09:58'de giriş yapıldı.`],
  [`Aynı örnek e-postayı düz yazı diye tarif eder ama uyarı satırını kalın, sabit satırı en altta küçük ister.`, S, 'durumlar', `Düz yazı: uyarı satırı kalın, e-postaların sabit satırı en altta küçük`],
  [`Ürün metinlerinde hitap açık noktadır: tasarım öğrenciye "sen", hocaya "siz" öneriyor; "Siz" seçilirse plan.html'deki iki hoca cümlesi değişir.`, S, 'acik-hitap', `"Siz" seçilirse plan.html'deki iki hoca cümlesi değişir.`],
];

const gaps = [
  {
    question: `Hangi kuyruklar var, adları ne ve her birinin pg-boss ayarları (aynı anda tek çalışma politikası, yeniden deneme sayısı ve bekleme, süre aşımı, tamamlanan ve başarısız işlerin saklama süresi, ölü mektup kuyruğu) ne olacak?`,
    why: `Belgeler yalnız iki işi adlandırıyor (oturum kapatma, gece inceleme sıralaması) ve yalnız bu ikisinin tekrar çalışmaya dayanıklı olduğunu yazıyor. pg-boss işleri en az bir kez teslim eder (yeniden deneme, süre aşımı, yedekten dönüş). pg-boss belgesine göre (pgboss.io/api/queues) varsayılanlar standard politika, 2 yeniden deneme, beklemesiz deneme (retryDelay 0, retryBackoff false), 15 dakikalık süre aşımı, 14 gün saklama ve 7 gün sonra silmedir; bu ayarlarla 15 dakikayı aşan gece işi süre aşımına düşüp yeniden başlar, her dakika çalışan iş üst üste binebilir, ölü mektup kuyruğu olmadığından başarısız iş sessizce kaybolur.`,
    options: [`Her kuyruk tek kayıt dosyasında (apps/server/src/jobs/kuyruklar.ts) açık ayarlarla tanımlanır`, `pg-boss varsayılanları kullanılır, ayar yalnız sorun çıkınca yazılır`],
    recommendation: `Birincisi. Her kuyruk için ad, sahibi olan modül, politika (zamanlanmış işlerde aynı anda tek iş: pg-boss'un stately ya da exclusive politikası), yeniden deneme (ör. 3 kez, retryBackoff açık), açık süre aşımı (expireInSeconds, işin ölçülen süresinin birkaç katı; uzun işte heartbeatSeconds), saklama (tamamlanan 7 gün, başarısız 30 gün; yük yalnız iç kimlik taşıdığından saklama kişisel veri tutmaz) ve deadLetter kuyruğu yazılır. Genel kural: her işleyici aynı girdiyle iki kez çalışınca aynı sonucu verir; belgelerin iki iş için koyduğu kural (teknik.html#sunucu-arka-plan, plan.html#kararlar-supheli-kayit) bütün işlere genişletilir.`,
    needs_owner: false,
  },
  {
    question: `İş, iş kuralının veritabanı işlemiyle aynı bağlantıda nasıl kuyruğa girecek?`,
    why: `teknik.html "İşler veritabanı işlemiyle birlikte kuyruğa girer" diyor ama API'deki pg-boss'un "Drizzle'ın havuzunu kullandığını" yazıyor: havuzdan alınan başka bir bağlantı işlemin dışında kalır. O zaman işlem geri alınınca iş yine çalışır ya da iş eklenip işlem yarıda kalır. Testlerdeki "uygulama ve iş kuyruğu ayrı bağlantıda" cümlesi de bunu karıştırıyor (D14-C01).`,
    options: [`pg-boss'un hazır Drizzle bağdaştırıcısı: send(kuyruk, veri, { db: fromDrizzle(tx, sql) }) (pgboss.io/api/adapters)`, `Kendi executeSql bağdaştırıcısı`, `İşi işlem bittikten sonra göndermek (atomik değil, iş kaybolabilir)`, `Kendi giden kutusu (outbox) tablosu ve onu pg-boss'a aktaran iş`],
    recommendation: `Birincisi; hazır olan varken kendi bağdaştırıcı yazılmaz. Dış yüzler zaten çağıranın işlemini (tx) parametre alıyor (teknik.html#sunucu-mimari); infra/is-kuyrugu içinde tek bir gonder(tx, kuyruk, veri) yardımcısı fromDrizzle(tx, sql) ile gönderir, modüller pg-boss'u doğrudan çağırmaz. İki davranış senaryosu: işlem geri alınınca kuyrukta iş yok; işlem bitince tam bir iş var. teknik.html'deki "Drizzle'ın havuzunu kullanır" cümlesi "iş kuralının işlemiyle gönderir" diye düzeltilir (D14-C01).`,
    needs_owner: false,
  },
  {
    question: `API ve işçi süreçlerinde pg-boss hangi ayarlarla açılır ve kapanır?`,
    why: `pg-boss belgesine göre (pgboss.io/api/constructor) migrate, supervise ve schedule seçenekleri varsayılan olarak true: açılışta şema göçü, bakım ve izleme, zamanlama işletme. Kararlar "uygulama açılırken göç yapmaz" ve "API'deki pg-boss yalnız iş gönderir" diyor ama ayarı yazmıyor; yazılmazsa her API kopyası bakım ve zamanlama yapar, açılışta göç kuralı çiğnenir. Kapanış için yalnız "pg-boss'unkinden uzun (ör. 40 saniye)" var; pg-boss'un durdurma süresi ve Compose'un bekleme süresi sayı olarak yazılmamış.`,
    options: [`Rol başına açık ayar: API'de migrate, supervise ve schedule false; işçide migrate false, supervise ve schedule true`, `İki süreçte de varsayılan ayar`],
    recommendation: `Birincisi; infra/is-kuyrugu içinde iki kurucu (API için, işçi için), ikisi de schema: 'pgboss' ve createSchema false (şemayı yayın adımı kurar). Açılışta pg-boss şema sürümü beklenenle aynı değilse süreç açılmaz (göç adımı atlanmış demektir; /health/ready şema sürümüne zaten bakıyor). Kapanış: işçi pg-boss'u açık yazılmış bir durdurma süresiyle (ör. 30 saniye) düzgün kapatır, Compose'ta işçinin stop_grace_period değeri 40 saniye; yarıda kalan iş süre aşımı ve yeniden denemeyle tamamlanır (D14-B01'deki tekrar kuralı).`,
    needs_owner: false,
  },
  {
    question: `Kuyruklar ve zamanlamalar ne zaman, hangi veritabanı rolüyle açılır; API ve işçi pg-boss tablolarına hangi yetkiyle bağlanır?`,
    why: `Göçleri sahip rol çalıştırıyor, ayrı uygulama rolü kısıtlı (teknik.html, Denetim kaydı). pg-boss belgesine göre kuyruklar kullanılmadan önce açılmalı (createQueue) ve partition: true verilen kuyruğa ayrı tablo açılır; pg-boss'un CLI'sında yalnız migrate var, kuyruk ve zamanlama açan komut yok (pgboss.io/cli). Kuyruklar çalışma anında açılırsa uygulama rolüne fazladan yetki gerekebilir, hiç açılmazsa ilk gönderim hata verir.`,
    options: [`Kuyruklar ve zamanlamalar yayın adımında, db:migrate'te pg-boss migrate'ten sonra küçük bir betikle, sahip rolle ve tekrar çalışmaya dayanıklı olarak açılır; API ve işçi yalnız veri yetkili rolle bağlanır`, `İşçi açılırken kuyrukları açar; uygulama rolüne pg-boss şemasında tablo yetkisi verilir`],
    recommendation: `Birincisi: göç adımının tek yerde durması kuralına (teknik.html#altyapi-imaj) uyar, çalışma anında tablo yetkisi gerekmez. Betik kuyruk listesini D14-B01'deki kayıt dosyasından okur, var olan kuyruğu ayarlarıyla günceller. partition: true kullanılmaz (bu ölçekte gerekmez, kuyruk açmak tablo açmaz). Drizzle göçlerindeki "SQL'i gözden geçir" kuralı pg-boss için de uygulanır: pg-boss migrate --dry-run çıktısı yayından önce okunur. Uygulama rolünün en az yetkisi kurulumda bir testle denetlenir.`,
    needs_owner: false,
  },
  {
    question: `Gece ve dönemsel işlerin tam listesi, her birinin nerede çalıştığı (pg-boss, sunucu makinesi, CI) ve İstanbul saatiyle saati ne?`,
    why: `Belgeler gece inceleme sıralamasını "İstanbul saatiyle, yoğunluk dışı" ve gecelik pg_dump'la çakışmadan zamanlıyor ama pg_dump'ın saati ve nerede zamanlandığı, xprem birim kopyasının aracı, geri yükleme denemesinin ve iptal listesi çekmenin sıklığı yazılmamış. Gece de boş değil: iPhone'lar arka planda "çoğunlukla gece" gönderir (plan.html#kararlar-gonderme). İnceleme partisi hocanın ertesi gün göreceği iş olduğundan ilk dersten önce bitmeli.`,
    options: [`Sabit saat tablosu (İstanbul saatiyle) ve ölçülen sürelere göre boşluk`, `Zincirleme: pg_dump bitince sıradaki iş başlar`],
    recommendation: `İkisi birlikte: makine işleri tek betikte zincir (pg_dump, bitince xprem birim kopyası), pg-boss işleri sabit saatte. Öneri tablo teknik.html'e yazılır: 02:15 pg_dump ve ardından xprem kopyası (makinede, pg-boss dışında; yedek işçi bozukken de alınmalı), 04:30 temizlik işleri, 05:10 gece inceleme sıralaması, 05:40 iptal listesi (günde bir), geri yükleme denemesi haftada bir. 03:00 ile 04:00 arası boş kalır: Türkiye yaz saatine dönerse geçiş geçmişte bu saatlerdeydi, o aralıktaki iş atlanır ya da iki kez çalışır. pg-boss'ta missed varsayılanı skip'tir (hiçbir işçi çalışmıyorken gelen zaman hiç gönderilmez; pgboss.io/api/scheduling); bu yüzden gece ve günlük işlerin hepsinde missed: once, her dakika çalışan oturum kapatmada varsayılan kalır. İlk haftalarda her işin süresi ölçülür; pg_dump'ın bitişi ile inceleme işinin başı arasında en az 1 saat kalır.`,
    needs_owner: false,
  },
  {
    question: `"Birkaç dakikada bir" çalışan oturum kapatma işinin aralığı ne ve iş gecikirse kararlar etkilenir mi?`,
    why: `Aralık yazılmamış. İş gecikirse ya da işçi kapalıysa "kapandı mı" alanı geç değişir; kayıt kararı ya da pencere hesabı bu alana dayanırsa iş gecikmesi sonucu değiştirir.`,
    options: [`Her dakika`, `5 dakikada bir`],
    recommendation: `Her dakika (pg-boss zamanlaması dakikada en çok bir iş gönderir, zamanlamalar 30 saniyede bir denetlenir), aynı anda tek iş. Kurallar alanın değil oturumun kapanış anının (UTC, timestamptz) kendisine dayanır; iş yalnız görünen durumu günceller. İş "bütün" süresi dolmuş oturumları kapattığından işçi kapalı kaldıysa açılınca ilk çalışma hepsini toplar, ayrı telafi ayarı gerekmez. Bedeli: alan kapanış anından en çok yaklaşık 1,5 dakika sonra doğru olur; bu ekranda görünen bir gecikmedir, kararı değiştirmez.`,
    needs_owner: false,
  },
  {
    question: `Gece inceleme partisinin "ertesi gün"ü hangi takvime göre bulunur ve iş aynı gün ikinci kez çalışırsa ne olur?`,
    why: `İş İstanbul gece yarısından sonra çalışınca UTC tarihi bir önceki gündür (İstanbul 02:00, UTC'de önceki günün 23:00'ü). "missed: once" ile iş öğlen de çalışabilir, elle de yeniden başlatılabilir; ikinci çalışma gün içinde gelen yeni incelemelerle partiyi değiştirirse hoca gün ortasında başka liste görür. "Aynı girdiyle iki kez çalışsa da sonuç değişmez" kuralı yalnız aynı girdi için güvence veriyor.`,
    options: [`Parti (hoca, İstanbul tarihi) anahtarıyla bir kez yazılır; aynı güne ikinci çalışma var olan partiye dokunmaz`, `Her çalışma o günün partisini yeniden hesaplar`],
    recommendation: `Birincisi. İstanbul tarihi işin çalıştığı an saat arayüzünden alınıp Europe/Istanbul'a çevrilerek bulunur (D14-B08). Partinin içeriği D09'un; tekil anahtar ve "varsa dokunma" kuralı işletim kuralıdır. Test: TestClock ile İstanbul 02:00'ye (UTC 23:00) kurulup partinin İstanbul tarihini taşıdığı ve ikinci çalışmada değişmediği denetlenir.`,
    needs_owner: false,
  },
  {
    question: `Yayında API, işçi ve PostgreSQL hangi saat diliminde çalışır ve İstanbul tarih ve saatine dönüşüm (gece işinin günü, e-postadaki giriş saati, dönem kilidi anı) hangi kodda yapılır?`,
    why: `Testler TZ=UTC ile koşuyor ama yayın ayarı yazılmamış. packages/core Intl kullanmıyor ve saatleri UTC milisaniyeyle hesaplıyor; İstanbul dönüşümünün yeri belli değil. Süreç İstanbul diliminde çalışırsa tarih kodu ortama göre farklı sonuç verir; sabit +03:00 yazılırsa kural değişince saat dilimi verisi güncellemesiyle düzelmez.`,
    options: [`Her süreç ve PostgreSQL UTC; İstanbul yalnız açık dönüşümle (sunucuda Intl ile Europe/Istanbul, zamanlamada pg-boss'un saat dilimi ayarı)`, `Süreçler TZ=Europe/Istanbul ile çalışır`, `Sabit +03:00 hesabı packages/core içinde`],
    recommendation: `Birincisi. API, işçi ve göç kaplarında TZ=UTC, PostgreSQL'de timezone = 'UTC'. İstanbul dönüşümü infra/saat içinde tek yardımcıda durur (Intl yasağı packages/core için; sunucu Node'un tam ICU verisiyle Intl kullanabilir). Her pg-boss zamanlaması tz: 'Europe/Istanbul' ile kaydedilir; pg-boss'ta tz yazılmazsa varsayılan UTC'dir (pgboss.io/api/scheduling), yani "İstanbul saatiyle" kuralı ancak açık ayarla tutar. Yardımcının testleri ortak kurallar paketindeki gibi bir kez TZ=UTC, bir kez TZ=Europe/Istanbul ile koşar; sınır örnekleri İstanbul 00:00 ve 02:59.`,
    needs_owner: false,
  },
  {
    question: `Birimin son günü, 7 günlük gönderme süresinin sonu ve kafa sayısı karşılaştırmasının "kesinleşmesi" hangi anda olur; bunlar için zamanlanmış iş gerekir mi?`,
    why: `Son gün tarih olarak giriliyor; günün hangi anında bittiği yazılmamış. "Dönem kilidine kadar onaylanmayan kayıt sayılmış haliyle kilitlenir, denetim kaydına onaysız kilitlendiği yazılır" kilit anında bir yazma ister; kafa sayısı karşılaştırması "gönderme süresi bitince kesinleşir". Bunlar bir işe bağlanırsa iş gecikmesi kuralı da geciktirir.`,
    options: [`Kural sonuçları okuma ya da varış anında saat arayüzüyle hesaplanır; iş yalnız kalıcı yan etkiler için`, `Her olay için o anda çalışan zamanlanmış iş`],
    recommendation: `Birincisi. Son günün bitişi o günün ertesi günü 00:00 Europe/Istanbul (dışlayıcı) olarak tek yardımcıda hesaplanır; gönderme süresi ve kesinleşme varış ya da okuma anında bu yardımcıyla değerlendirilir, işi beklemez. Yalnız kalıcı yan etki olan "onaysız kilitlendi" denetim kaydı için günlük, tekrar çalışmaya dayanıklı bir iş (00:20 Europe/Istanbul) son günü geçmiş birimleri işler. Anın kendisi D02 ve D06 ile birlikte onaylanır.`,
    needs_owner: false,
  },
  {
    question: `Kaç işçi kopyası çalışır, kuyruk başına aynı anda kaç iş işlenir ve işçinin bağlantı havuzu kaç bağlantıdır?`,
    why: `"İşçiler ayrı ölçeklenir" yazıyor ama sayı yok; PostgreSQL'in 100 bağlantılık sınırına göre yapılan hesap işçiyi de içeriyor. İşçi fazla eşzamanlı çalışırsa gece işi ya da temizlik ders çıkışı yüküyle yarışır, bağlantı sınırına yaklaşılır.`,
    options: [`Tek işçi kopyası, zamanlanmış işlerde eşzamanlılık 1, küçük havuz`, `API kopyası sayısı kadar işçi`],
    recommendation: `Başlangıçta tek işçi kopyası, kuyruk başına aynı anda 1 iş (pg-boss'ta localConcurrency ve batchSize varsayılanı zaten 1, yoklama aralığı 2 saniye), işçi havuzu 5 bağlantı; sayı teknik.html'deki bağlantı hesabına yazılır. Yük testinden sonra gerekirse artırılır. pg-boss belgesine göre birden çok kopya çalışsa da bir zamanlama tek iş gönderir (pgboss.io/api/scheduling); kopya artırmak zamanlamayı çoğaltmaz.`,
    needs_owner: false,
  },
  {
    question: `İş hataları, hiç çalışmayan zamanlanmış işler ve işletim uyarıları (sertifika bitişi, NTP eşitlemesi, art arda e-posta hatası) nasıl izlenir; uyarı kime, hangi kanaldan gider?`,
    why: `Belgeler "İşçinin çalıştığı pg-boss'un kayıt tablosundan izlenir" diyor ve sertifikada 14 ve 30 gün kala uyarı istiyor, ama ölçüyü, eşiği ve kanalı yazmıyor. Gece işi hiç çalışmazsa hocalar boş parti görür, kimse fark etmez. Uyarı e-postayla gidiyorsa SMTP düştüğünde uyarı da gidemez.`,
    options: [`İşçideki denetim işi uyarıları e-posta arayüzünden sahibin adresine yollar; dış erişim denetimi kendi kanalını kullanır`, `Bütün uyarılar dış izleme hizmetinden`],
    recommendation: `Birincisi: her zamanlanmış iş için son başarılı çalışma pg-boss tablosundan okunur; beklenen aralığın iki katı geçerse, ölü mektup kuyruğunda iş varsa ya da art arda 5 e-posta gönderimi başarısızsa işçideki küçük denetim işi (10 dakikada bir) sahibe "işletim uyarısı" türünde e-posta yollar. SMTP'nin kendisi düşerse bu e-posta da gidemez; bu yüzden dış erişim denetimi (GET /v1/durum) ayrı kanalda kalır. Kanal ve alıcı D15'in; bu alan ölçüyü ve e-posta türünü verir. İlk sürümde OpenTelemetry yok (karar).`,
    needs_owner: false,
  },
  {
    question: `İş verisi, pg-boss'un sakladığı iş çıktısı ve hata metni, loglar ve e-posta gönderim kayıtları hangi alanları taşıyabilir?`,
    why: `Plan iş kuyruğundaki işlerin "kod, isim, öğrenci numarası" taşımamasını şart koşuyor; ama pg-boss işleyicide yakalanmayan hatayı işin output alanına yazıp kendi tablosunda saklıyor (pgboss.io/api/workers) ve veritabanı hata mesajı değer içerebilir (teknik.html: hata yalnız hata kodu ve kısıt adıyla loglanır). E-posta adresinin loglara yazılıp yazılmayacağı hiç yazılmamış; hoca hesabı silinince adres silinmeli.`,
    options: [`İş verisi yalnız iç kimlik (UUID) ve tarih; işleyici hatayı pg-boss'a yalnız hata kodu ve kısıt adıyla iletir; e-posta adresi ve kod hiçbir loga ve iş satırına yazılmaz`, `Yalnız loglarda gizleme (pino redact)`],
    recommendation: `Birincisi; pino gizlemesi ikinci güvence kalır. İşleyicileri saran tek fonksiyon hatayı süzer. Bir davranış senaryosu pg-boss iş tablosunu ve logları tarar: öğrenci numarası, isim, e-posta adresi ve 6 haneli kod yok; artı kontrol olarak bilerek değer içeren bir hata üretilip süzgecin onu temizlediği görülür.`,
    needs_owner: false,
  },
  {
    question: `Davranış senaryolarında işler nasıl çalıştırılır; zamanlama (cron ifadesi, saat dilimi, missed: once) nasıl denetlenir?`,
    why: `Senaryolar gerçek PostgreSQL'e yazıyor, TestClock pg-boss'un SQL saatini kaydırıyor, kuyruk her senaryoda temizleniyor; ama işçinin senaryoda nasıl koştuğu yazılmamış. pg-boss zamanlamayı aralıklarla denetlediğinden gerçek beklemeye dayanan test yavaş ve kırılgan olur.`,
    options: [`İşleyiciler "Eğer ki gece işi çalışırsa" gibi bir adımla doğrudan çağrılır; zamanlama ayrı küçük testlerle denetlenir`, `Her senaryoda gerçek işçi açılır, zaman ilerletilip işin çalışması beklenir`],
    recommendation: `Birincisi. Ek olarak: her zamanlanmış işin cron ifadesi ve tz: 'Europe/Istanbul' değeri kayıt dosyasından okunup bir testte denetlenir; TestClock setTime ile "işçi kapalıyken saat geçti, açılınca bir kez çalışır" senaryosu missed: once davranışını (pg-boss belgesine göre kaç zaman kaçmış olursa olsun en sonuncusu için tek iş) sabitlenen sürümde gösterir; her işleyici aynı girdiyle iki kez çalıştırılıp sonucun değişmediği denetlenir; bilerek tekrar etmeyen bir işleyiciyle bu testin kırmızıya döndüğü bir kez görülür.`,
    needs_owner: false,
  },
  {
    question: `Süresi dolmuş giriş kodları, kayıt kodları, bitmiş oturumlar, e-posta gönderim satırları ve pg-boss'un eski iş satırları ne zaman silinir?`,
    why: `Doğruluk için gerekmiyor (süre kullanım anında denetleniyor) ama tablolar ve sınır sorgusunun dizini büyür; hiçbir silme süresi yazılmamış. Hoca hesabı silinince e-posta adresi silinmeli; adres tutan bir gönderim satırı kalırsa bu kural delinir.`,
    options: [`Tek gecelik temizlik işi; her tablo sahibi silme fonksiyonunu kendi dış yüzünden verir`, `Her alan kendi temizlik işini kurar`],
    recommendation: `Birincisi (04:30, D14-B05). Öneri süreler: e-posta gönderim satırları 7 gün (sınır penceresi 1 gün); giriş ve kayıt kodları bittikten 1 gün sonra; bitmiş oturumlar D01'in kararıyla. pg-boss'un kendi iş satırları D14-B01'deki saklama ayarıyla pg-boss bakımında silinir. Her silme tekrar çalışmaya dayanıklıdır ve küçük partilerle yapılır (uzun kilit olmasın).`,
    needs_owner: false,
  },
  {
    question: `Sistem hangi e-postaları gönderir? Kararlı olanlar: kayıt kodu, giriş kodu, "onay bekliyor", giriş bildirimi. Belirsiz olanlar: başvuru onaylandı, yöneticiye yeni başvuru, yönetici bütün oturumları kapatınca bildirim, hesap silme başladı ya da tamamlandı, tanınmayan adrese kod isteği, Aşama 2'de projeksiyon kodu ikinci kez kullanılınca "hocaya bildirilir", hocaya günlük inceleme özeti, sahibe işletim uyarısı.`,
    why: `Şablonlar, sınırlar ve testler bu listeye bağlı. Onaydan önce giriş yok ve onay bildirimi yazılmadığından hoca onaylandığını ancak kod isteyerek anlar. DMARC "p=none" olduğundan herkes aynı adla sahte e-posta yollayabilir; her yeni e-posta türü hocaya "bu adresten bilgi gelir" alışkanlığı kazandırır ve oltalama yüzeyini büyütür; "E-postalarda bağlantı yok" kuralı da bu yüzden var.`,
    options: [`Yalnız dört kararlı tür`, `Dört tür ve başvuru onaylandı e-postası (kodsuz, bağlantısız)`, `Dört tür, onay e-postası ve yöneticiye günlük başvuru özeti`],
    recommendation: `İkincisi: başvuru onaylandı e-postası kod ve bağlantı taşımaz, hocanın onay beklerken kör deneme yapmasını önler. Tanınmayan adrese hiçbir şey gönderilmez (cevap "aynı cevap, aynı hız" kuralıyla zaten aynı). Yöneticiye ve hocaya özet, silme ve oturum kapatma e-postası yok; bunlar panelde liste olarak görünür. Projeksiyon uyarısı (Aşama 2) uygulama içinde verilir (D11). Sahibe giden işletim uyarısı ürün e-postası sayılmaz, ayrı türdür (D14-B11).`,
    needs_owner: true,
  },
  {
    question: `E-posta şablonlarının biçimi (düz metin mi, HTML mi), konu satırları, gönderen görünen adı, hitap ("sen" mi "siz" mi) ve her türün alanları ne?`,
    why: `Belgelerde yalnız iki sabit cümle var. tasarim.html'deki bildirim örneği "Düz yazı" diyor ama aynı satırda uyarı satırını kalın, sabit satırı en altta küçük istiyor; düz metinde kalın ve küçük yazı olmaz (D14-C04). Hitap tasarim.html'de açık nokta ve "Siz" seçilirse iki sabit cümle değişir. Gönderen adı "Ad ve logo" kararına bağlı (kurum adı izin ister). Giriş saatinin biçimi yazılmamış; panelde tarih ve saat her zaman İstanbul saatiyle ve Türkçe biçimle.`,
    options: [`Yalnız düz metin (text/plain, UTF-8)`, `Düz metin ve HTML birlikte (multipart), HTML'de bağlantı yok`],
    recommendation: `Yalnız düz metin: bağlantı, izleme pikseli ve uzak görsel olamaz, "bağlantı yok" kuralını biçim garanti eder; vurgu satır sırasıyla verilir (uyarı satırı ayrı paragraf, sabit cümle en altta). Konu satırında kod yok (kilit ekranı önizlemesi): "İÜ Yoklama giriş kodu", "İÜ Yoklama kayıt kodu", "İÜ Yoklama: başvurun onay bekliyor", "İÜ Yoklama: yeni giriş". Kod e-postası: kod, "5 dakika geçerli", sabit cümle. Bildirim: İstanbul saatiyle Türkçe biçimde zaman (ör. "6 Ekim 2026 Salı, 09:58"), cihaz ya da tarayıcı türü, kapanan eski oturum, "Sen değilsen..." ve sabit cümle. Metne alan adı ve adres yazılmaz (istemciler bağlantıya çevirir). Otomatik yanıt döngüsü olmasın diye Auto-Submitted: auto-generated başlığı. Şablonlar saf fonksiyon; sabit cümleler tek sabittir, senaryolar onu içe alıp bellek içi posta kutusunda arar. Hitap ve gönderen görünen adı sahibin kararı (tasarim.html açık nokta 11, plan.html "Ad ve logo").`,
    needs_owner: true,
  },
  {
    question: `Kod ve "onay bekliyor" e-postası iş kuyruğuna konmadan, cevaptan sonra nasıl gönderilir: hata yakalama, eşzamanlılık sınırı, zaman aşımları, yeniden deneme ve süreç kapanırken yolda olan gönderimler?`,
    why: `Kod düz metin olarak yalnız üretildiği anda var (veritabanında HMAC özeti), bu yüzden kuyruğa konamaz; plan bunu bilerek seçti. Ama süreç kapanırsa ya da SMTP geçici hata verirse e-posta kaybolur. Nodemailer'ın varsayılan zaman aşımları dakikalarca (nodemailer.com/smtp: connectionTimeout 120 saniye, greetingTimeout 30 saniye, socketTimeout 600 saniye); Biome'un noFloatingPromises kuralı sunucuda hata düzeyinde; kapanışta "API elindeki istekleri bitirir" ama cevaptan sonra süren gönderim istek sayılmaz.`,
    options: [`Süreç içi küçük gönderici: cevap yazıldıktan sonra başlar, havuzlu SMTP bağlantısı, eşzamanlı gönderim sınırı, kısa zaman aşımları, yalnız geçici SMTP hatasında (4xx) kısa beklemeyle bir kez yeniden deneme, kapanışta yoldaki gönderimleri sınırlı süre bekler`, `Yeniden deneme yok; kod ulaşmazsa hoca yenisini ister`],
    recommendation: `Birincisi. Gönderim Fastify'ın cevap gönderildikten sonraki aşamasında başlar; cevap süresi gönderimden bağımsız kalır (aynı cevap, aynı hız). Nodemailer havuzlu taşıma, en çok 5 eşzamanlı bağlantı; bağlantı ve karşılama zaman aşımı 10 saniye, soket 30 saniye; tek yeniden deneme 5 saniye sonra (kod 5 dakika geçerli). Söz açıkça yakalanır (noFloatingPromises), hata yalnız tür, SMTP yanıt kodu ve iç kimlikle loglanır. Kapanışta Fastify onClose kancası yoldaki gönderimleri en çok 10 saniye bekler (40 saniyelik kapanma süresinin içinde). Kalan risk: süreç çökerse e-posta kaybolur, hoca 1 dakika sonra yeni kod ister (plan: "Kod ulaşmazsa hoca yenisini ister").`,
    needs_owner: false,
  },
  {
    question: `Giriş bildirimi e-postası da kod e-postası gibi süreç içinde mi gider, yoksa yeniden denemeli bir iş olarak mı?`,
    why: `teknik.html bildirimin "kod e-postasıyla aynı yoldan" gittiğini yazıyor; bu aynı SMTP yolu mu, aynı süreç içi mekanizma mı belli değil. Bildirim tek etkenli girişin telafi önlemi; yeniden denemesiz giderse geçici bir röle hatasında uyarı hocaya hiç ulaşmaz (plan bunu "çoğunlukla geçici bir gönderim hatası" diye kabul ediyor). Bildirim kod taşımadığından plan'ın iş kuyruğu yasağına girmez.`,
    options: [`Süreç içi, yeniden denemesiz; hata denetim kaydına`, `pg-boss işi: yük yalnız oturum kimliği, üstel yeniden deneme; son deneme de başarısızsa denetim kaydına`],
    recommendation: `İkincisi: iş giriş işlemiyle aynı işlemde kuyruğa girer (D14-B02), yük yalnız oturum kimliğidir, işleyici zamanı ve cihaz türünü oturum satırından okur; geç teslimde bile e-postadaki saat girişin saatidir. Yeniden deneme 1 saat içinde birkaç kez; hepsi başarısızsa denetim kaydına yazılır (plan.html#kararlar-tek-etkenli-giris kuralı korunur). Bedeli: SMTP gizli ayarı işçiye de verilir (teknik.html: "yalnız gereken servise").`,
    needs_owner: false,
  },
  {
    question: `"Aynı adrese dakikada 1, saatte 5, günde 10 kod" sınırı kayan pencere mi, takvim günü mü; hangi e-postalar sayılır; sınır aşılınca ne olur?`,
    why: `"Günde" İstanbul takvim günü olursa gece yarısının iki yanında 20 kod gidebilir ve sınır saat dilimine bağlanır. "onay bekliyor" e-postası kodun yerine gidiyor; sayılmazsa onay bekleyen birinin kutusu bu e-postayla doldurulabilir. Kayıt kodunun aynı sayaca girip girmediği yazılmamış. Sayaç kopyalar arası kesin olmalı (PostgreSQL'de).`,
    options: [`Kayan pencereler; istekle tetiklenen her e-posta (kayıt kodu, giriş kodu, onay bekliyor) tek sayaçta`, `Takvim penceresi (İstanbul günü); yalnız kod e-postaları sayılır`],
    recommendation: `Birincisi: son 60, 3.600 ve 86.400 saniye, saat diliminden bağımsız. Başarısız gönderim de sayılır (döngü olmasın). Giriş bildirimi ve onay e-postası sayılmaz (yalnız başarılı giriş ya da yönetici işlemi tetikler). Sınır aşılınca e-posta gitmez, cevap yine aynıdır; olay yalnız sayı olarak loglanır. Sayma ve ekleme tek işlemde, adres özeti başına işlem kilidiyle (pg_advisory_xact_lock) yapılır; aynı anda gelen iki istek sınırı aşamaz. Sınır sayıları tek sabitte durur, testler onları içe alır.`,
    needs_owner: false,
  },
  {
    question: `Gönderim sınırının sayacı ve gönderim sonucu nerede tutulur, adres nasıl saklanır?`,
    why: `Kimlik modülü bilerek iki tabloyla sınırlı (giriş kodları, oturumlar); "onay bekliyor" ve tanınmayan adres kod satırı üretmez, bu yüzden kod tablosundan saymak eksik kalır. Adres açık yazılırsa hesap silinince adresin silinmesi kuralı (plan.html#kararlar-hesap-silme) bu tabloda delinir.`,
    options: [`Kimlik modülünün giriş kodları tablosundan sayma`, `infra/eposta içinde ayrı eposta_gonderimleri tablosu; adres yerine anahtarlı özet`],
    recommendation: `İkincisi. Satır: iç kimlik, normalleştirilmiş adresin (plan.html'deki küçük harf ve İ, I kuralı) ayrı bir gizli anahtarla HMAC'i, tür, zaman (timestamptz), sonuç, SMTP yanıt kodu. Anahtar tek iş içindir (teknik.html#sunucu-ayarlar) ve Compose secrets ile verilir; giriş kodu özet anahtarı gibi yedeklenmez, kaybolursa yenisi üretilir, yalnız sayaçlar sıfırlanır. Satırlar 7 gün sonra silinir (D14-B14). Normalleştirme D01'in tek fonksiyonundan alınır, yeniden yazılmaz.`,
    needs_owner: false,
  },
  {
    question: `Üç gönderim yolu (Google SMTP rölesi, aynı hesapla OAuth2, kendi alan adı) yazılımda nasıl yapılandırılır; röle için sunucunun çıkış adresi sabit mi; günlük hacim sınırlara sığar mı; geri dönen e-postaları kim okur?`,
    why: `BİDB'nin cevabı açık nokta. Her yolun Nodemailer ayarı farklı (röle: IP izni ya da hesapla kimlik doğrulama; OAuth2: Google belirteci ve yenilenmesi; kendi alan adı: DKIM imza anahtarı). Röle izni sunucunun çıkış IP'sine verilir; makine paylaşılan bir NAT arkasındaysa aynı IP'den çıkan başka makineler de üniversite adına gönderebilir. Röle sınırı tekil alıcı sayar (günde 10.000) ve bir girişin iki e-postası (kod, bildirim) aynı alıcıya gider; OAuth2 yolunda ise Gmail'in kendi sınırı geçerli (Google Workspace "Gmail sending limits" sayfası: kullanıcı başına günde 2.000 ileti, 24 saatlik kayan pencere; röle sınırları ayrı) ve panel oturumu en geç 24 saatte bittiğinden günlük ileti sayısı hoca sayısının birkaç katı olabilir.`,
    options: [`Tek arayüz, yol ortam ayarıyla seçilir; otomatik yedek yol yok`, `Birinci yol düşünce ikinciye kendiliğinden geçen yedekli gönderici`],
    recommendation: `Birincisi. İlk kurulan genel SMTP ayarıdır (ana makine, port, TLS, kimlik), Mailpit ile denenir; röle gelince yalnız ayar değişir. Röle için BİDB'den hem IP izni hem gönderici hesabıyla SMTP kimlik doğrulaması istenir (yalnız IP'ye dayanmasın). OAuth2 ve DKIM kodu yalnız o yol seçilirse yazılır. Günlük ileti ve tekil alıcı sayısı eposta_gonderimleri tablosundan sayılır, sınırın %80'inde işletim uyarısı gider (D14-B11). Geri dönen e-postalar gönderici hesabın kutusunda kalır, ilk sürümde otomatik işlenmez. SMTP gizli ayarı yalnız e-posta gönderen servislere verilir (API, D14-B18 seçilirse işçi).`,
    needs_owner: false,
  },
  {
    question: `Deneme hocası sabit kodla girerken kod isteği e-posta üretir mi; giriş bildirimi ona da gider mi?`,
    why: `Deneme hocası "yalnız adresine tanımlı sabit kodla girer"; kod isteği normal kod e-postası üretirse kullanılamayan bir kod gider, adres gerçek bir kutu değilse e-postalar geri döner. "Her başarılı girişte hocaya bildirim e-postası gider" kuralı uygulanırsa Apple ve Google incelemesindeki her giriş e-posta üretir; uygulanmazsa bu güvenlik kuralına yeni bir istisnadır (hesap zaten 3 cihaz ve tek telefon kuralından muaf).`,
    options: [`Deneme hesabına hiç e-posta gitmez; girişler zaten loglanıyor`, `Kod e-postası gitmez, giriş bildirimi sahibin belirlediği bir kutuya gider`],
    recommendation: `Birincisi: sabit kodlu hesaba üretilen kod kullanılamaz, bildirim de inceleme sırasında gürültü olur; "her girişi ve yanlış denemesi loglanır" kuralı izlemeyi sağlar. Kod isteğine cevap yine aynıdır (aynı hız kuralı). Bir güvenlik kuralına istisna olduğundan sahibin onayı gerekir.`,
    needs_owner: true,
  },
];

const contradictions = [
  {
    a: `teknik.html#sunucu-arka-plan: "İşler veritabanı işlemiyle birlikte kuyruğa girer; API'deki pg-boss yalnız iş gönderir, Drizzle'ın havuzunu kullanır."`,
    b: `teknik.html#testler-veritabani-sifirlama: "uygulama ve iş kuyruğu ayrı bağlantıda"; teknik.html#veritabani-donem-alani (Bağlantı havuzu): "API'nin iş göndermesi Drizzle'ın havuzunu kullandığından"`,
    note: `İşin işlemle birlikte kuyruğa girmesi için gönderim, iş kuralının işlemiyle aynı bağlantıda çalışmalı; "havuzu kullanır" ve "ayrı bağlantıda" başka bir bağlantı izlenimi veriyor, o zaman ekleme atomik olmaz. Ayrı bağlantı yalnız işçinin işleri çalıştırması için doğru. teknik.html'de "API iş gönderirken iş kuralının işlemini kullanır (pg-boss'un fromDrizzle bağdaştırıcısı); işçi ayrı, doğrudan bağlantıda" diye yazılmalı (D14-B02).`,
  },
  {
    a: `plan.html#kararlar-e-posta-gonderimi: "E-postalarda bağlantı yok, yalnız kod var." ve her kod e-postasında ve giriş bildiriminde aynı cümle: "Bu kodu yalnız uygulamaya ya da panele gir; ..."`,
    b: `plan.html#kararlar-roller (Hoca oturumu): "Her başarılı girişte hocaya kısa bir bildirim e-postası gider: cihaz ya da tarayıcı türü ve saat"; (Hoca girişi): "onay bekleyene kod yerine "onay bekliyor" e-postası gider"`,
    note: `Giriş bildirimi ve "onay bekliyor" e-postası kod taşımıyor, başka bilgi taşıyor; "yalnız kod var" bunlara uymuyor, kodsuz bildirimdeki "Bu kodu..." cümlesinin neye işaret ettiği de belirsiz. Kuralın amacı "bağlantı yok" görünüyor; metin "E-postalarda bağlantı yok; içerik yalnız kod ya da bildirim bilgisi" diye düzeltilmeli, bildirimdeki sabit cümlenin biçimi şablon kararında netleşir (D14-B16).`,
  },
  {
    a: `plan.html#kararlar-e-posta-gonderimi: "Bu kodu yalnız uygulamaya ya da panele gir"; plan.html#kararlar-roller: "Sen değilsen Oturumlarım ekranından kapat" (ikisi de yalnız hocalara giden e-postalarda, "sen" hitabıyla)`,
    b: `tasarim.html#acik-hitap: Öğrenciye "sen", hocaya "siz" önerisi ve ""Siz" seçilirse plan.html'deki iki hoca cümlesi değişir."`,
    note: `E-postalar yalnız hocalara gidiyor; plan'daki sabit cümleler "sen" diyor, tasarım hocaya "siz" öneriyor. Karar verilene kadar şablonlar plan metniyle yazılır; cümleler tek sabitte durduğundan değişiklik tek yerde olur (D14-B16).`,
  },
  {
    a: `tasarim.html#durumlar (giriş bildirimi örneği): "Düz yazı"`,
    b: `tasarim.html#durumlar, aynı cümle: "uyarı satırı kalın, e-postaların sabit satırı en altta küçük"`,
    note: `Düz metin e-postada kalın ve küçük yazı yoktur: ya HTML parçası gerekir (bağlantısız) ya da vurgu satır düzeniyle verilir. Biçim seçilmeden şablon yazılamaz (D14-B16).`,
  },
];

const entities = [
  {
    name: `eposta_gonderimleri`,
    purpose: `Adres başına gönderim sınırını (dakikada 1, saatte 5, günde 10) kopyalar arası kesin saymak, günlük hacmi ölçmek ve gönderim sonucunu izlemek; adres açık yazılmaz, 7 gün sonra silinir.`,
    key_fields: [`id (uuidv7)`, `alici_ozeti (normalleştirilmiş adresin ayrı anahtarla HMAC'i)`, `tur (metin ve CHECK: kayit_kodu, giris_kodu, onay_bekliyor, giris_bildirimi, onay_bildirimi, isletim_uyarisi)`, `olusturma_zamani (timestamptz)`, `sonuc (metin ve CHECK: gonderildi, basarisiz, sinirda_atlandi)`, `smtp_yanit_kodu`, `istek_kimligi`],
    proposed_owner: `D14`,
  },
  {
    name: `pgboss_semasi`,
    purpose: `pg-boss'un kendi tabloları (işler, kuyruklar, zamanlamalar, sürüm); yayın adımında pg-boss migrate kurar, Drizzle göçlerine girmez; iş verisi yalnız iç kimlik ve tarih taşır.`,
    key_fields: [`iş: kuyruk adı, veri (yalnız UUID ve tarih), durum, başlama zamanı, tekillik anahtarı, deneme sayısı, çıktı (yalnız hata kodu ve kısıt adı)`, `kuyruk: ad, politika, yeniden deneme, süre aşımı, saklama, ölü mektup kuyruğu`, `zamanlama: ad, cron ifadesi, saat dilimi (Europe/Istanbul)`],
    proposed_owner: `D14`,
  },
];

const jobs = [
  [`oturum_kapatma`, `Birkaç dakikada bir (aralık yazılmamış; öneri her dakika), pg-boss, işçide`, `Süresi dolmuş, kapanmamış bütün ders oturumlarını kapatır; oturum başına iş yok, iki kez çalışsa da sonuç değişmez.`, `D04`],
  [`gece_inceleme_siralamasi`, `Her gece, Europe/Istanbul, yoğunluk dışı ve gecelik pg_dump ile çakışmayan saat (saat yazılmamış; öneri 05:10); işçi kapalıysa açılınca bir kez (missed: once)`, `Bekleyen incelemeleri ve sorun bildirimlerini sıralayıp her hocanın ertesi gün göreceği partiye koyar; kararı değiştirmez.`, `D09`],
  [`gecelik_pg_dump`, `Her gece (saat ve zamanlayıcı yazılmamış; öneri 02:15, makinede, pg-boss dışında)`, `Mantıksal yedeği şifreli, yurt içindeki yedek deposuna alır.`, `D12`],
  [`xprem_birim_kopyasi`, `Her gece, pg_dump bittikten sonra (araç seçilmedi; öneri aynı betikte zincir)`, `xprem'in güncelleme dosyaları birimini aynı şifreli yedek deposuna kopyalar.`, `D15`],
  [`geri_yukleme_denemesi`, `Düzenli (sıklık yazılmamış; öneri haftada bir)`, `Yedekten geri yükler; neslin değiştiğini, telefonların baştan indirdiğini ve bir xprem güncellemesinin telefona indiğini denetler.`, `D12`],
  [`android_iptal_listesi_cekme`, `Düzenli (sıklık yazılmamış; öneri günde bir 05:40 Europe/Istanbul, pg-boss, missed: once)`, `Android anahtar kanıtı iptal listesini çeker ve bütün API kopyalarının okuyacağı yere yazar.`, `D07`],
  [`pgboss_bakimi`, `pg-boss'un kendi bakım aralığıyla, yalnız işçide`, `Süresi aşan işleri yeniden denemeye ya da ölü mektup kuyruğuna geçirir, saklama süresi dolan iş satırlarını siler.`, `D14`],
  [`eposta_gonderim_temizligi`, `Her gece (öneri 04:30 Europe/Istanbul, temizlik işleriyle birlikte, missed: once)`, `7 günden eski e-posta gönderim satırlarını küçük partilerle siler.`, `D14`],
  [`giris_kodu_ve_oturum_temizligi`, `Her gece (öneri 04:30 Europe/Istanbul, missed: once)`, `Süresi dolmuş giriş ve kayıt kodlarını, D01'in belirleyeceği süreden eski bitmiş oturumları siler.`, `D01`],
  [`giris_bildirimi_eposta`, `Zamanlanmış değil; her başarılı girişte giriş işlemiyle birlikte kuyruğa girer (D14-B18 önerisi)`, `Giriş bildirimi e-postasını yeniden denemeli gönderir; yük yalnız oturum kimliği.`, `D14`],
  [`donem_kilidi_yan_etkileri`, `Her gün 00:20 Europe/Istanbul, missed: once (öneri; belgede iş olarak yazılmamış)`, `Son günü geçen birimlerde onaylanmadan kilitlenen Kendi beyanı kayıtlarını denetim kaydına yazar; tekrar çalışınca ikinci kayıt yazmaz.`, `D02`],
  [`saklama_suresi_temizligi`, `Saklama süresi belli olunca (açık nokta); öneri ayda bir`, `Süresi dolan yoklama kayıtlarını, düzeltmeleri ve denetim kaydını siler ya da anonimleştirir.`, `D12`],
  [`isletim_denetimi`, `10 dakikada bir (öneri), işçide`, `Zamanlanmış işlerin son başarılı çalışmasını, ölü mektup kuyruğunu ve art arda e-posta hatalarını denetler; eşik aşılınca sahibe işletim uyarısı yollar.`, `D14`],
  [`sertifika_bitis_denetimi`, `Günde bir (öneri; nerede çalışacağı D15'in)`, `Caddy sertifikasında bitişe 14, üniversite sertifikasında 30 gün kala uyarır.`, `D15`],
  [`saat_esitleme_izleme`, `Sürekli (öneri dakikada bir; yeri D15'in)`, `Sunucu makinesinin NTP eşitlemesini izler; bozulunca saat belgesi verilmemesi için durumu bildirir.`, `D15`],
  [`ci_gecelik_guvenlik_denetimi`, `Her gece, saat başı olmayan bir dakikada (GitHub Actions, sunucu işi değil)`, `pnpm audit --prod ile ikinci güvenlik denetimi.`, `D15`],
  [`ci_haftalik_is`, `Haftada bir, saat başı olmayan bir dakikada, elle de başlatılabilir (GitHub Actions, sunucu işi değil)`, `Ortak kurallar paketine Stryker mutasyon testi, k6 --once denemesi, imajı derleyip /health/ready denetimi.`, `D15`],
  [`dis_erisim_denetimi`, `Birkaç dakikada bir (sunucu dışından)`, `Caddy üzerinden GET /v1/durum çağırır, cevap gelmezse sahibi uyarır.`, `D15`],
];

const touches = [
  [`D01`, `Kayıt kodu, giriş kodu, "onay bekliyor" ve giriş bildirimi e-postalarını D01'in akışları tetikler, D14 gönderir. Sınır anahtarı D01'in adres normalleştirmesini kullanır; "aynı cevap, aynı hız" için gönderim cevaptan sonra başlar; bildirim hatası denetim kaydına yazılır; inceleme hesabı istisnası (D14-B22); hesap silinince adres silinir, gönderim satırları adres tutmaz; kod ve oturum temizliği.`],
  [`D02`, `Dönem kilidi anı (birimin son günü, ertesi gün 00:00 Europe/Istanbul) ve kilitte onaysız Kendi beyanı kayıtlarının denetim kaydı için günlük iş (D14-B09).`],
  [`D04`, `Oturum kapatma işi; kararlar "kapandı mı" alanına değil UTC kapanış anına dayanır (D14-B06).`],
  [`D06`, `Gönderme süresinin (7 gün, birimin son günü) bitiş anı varışta hesaplanır, işe bağlanmaz; iPhone'ların gece gönderimi gece işlerinin saat seçimini etkiler.`],
  [`D07`, `İptal listesi çekme işinin sıklığı ve liste eskiyince davranış; kafa sayısı karşılaştırmasının gönderme süresi bitince kesinleşmesi okuma anında hesaplanır.`],
  [`D08`, `Hak uyarıları sunucudan gitmez (yalnız telefonda yerel); D08 için sunucuda bildirim işi yok.`],
  [`D09`, `Gece inceleme sıralamasının içeriği (öncelik, parti boyu 20, kalanların devri) D09'un; zamanlama, saat dilimi, missed: once, (hoca, İstanbul tarihi) anahtarı ve tekrar kuralı D14'ün. E-posta hataları denetim kaydına yazılır.`],
  [`D10`, `Excel panelde SheetJS ile üretildiğinden sunucuda rapor işi görünmüyor; D10 onaylar.`],
  [`D11`, `Aşama 2'de projeksiyon kodu ikinci kez kullanılınca "hocaya bildirilir" kanalı (öneri uygulama içi, e-posta değil); eşleştirme kodlarının temizliği aynı gece temizliğine girer.`],
  [`D12`, `pg-boss tablolarının db:migrate içinde Drizzle'dan sonra kurulması, kuyrukların yayın adımında sahip rolle açılması, uygulama rolünün yetkileri, işçinin bağlantı payı, gecelik pg_dump saati, saklama işi, yedekten dönüşte işlerin yeniden çalışması.`],
  [`D13`, `Kod isteği ucunun aynı cevabı ve girişsiz uçların IP sınırı; log kuralları (adres ve kod yok); iş hata çıktısının yalnız hata kodu ve kısıt adı taşıması.`],
  [`D15`, `İşçi servisi (Compose prod profili, restart, bellek sınırı, 40 saniyelik kapanma), SMTP ve e-posta adres özet anahtarının Compose secrets ile dağıtımı, Mailpit dev profili, izleme ve uyarı kanalı, sertifika ve NTP denetimleri, CI zamanlanmış işleri, röle için sabit çıkış IP'si.`],
];

const pad = n => String(n).padStart(2, '0');
const out = {
  id: 'D14',
  title: 'Arka plan işleri ve e-posta',
  decided: decided.map(([fact, f, id, quote], i) => ({ id: `D14-K${pad(i + 1)}`, fact, anchor: a(f, id), quote })),
  gaps: gaps.map((g, i) => ({ id: `D14-B${pad(i + 1)}`, ...g })),
  contradictions: contradictions.map((c, i) => ({ id: `D14-C${pad(i + 1)}`, ...c })),
  entities,
  endpoints: [],
  jobs: jobs.map(([name, schedule, purpose, proposed_owner]) => ({ name, schedule, purpose, proposed_owner })),
  depends_on: ['D01', 'D12', 'D15'],
  touches_other_domains: touches.map(([domain, what]) => ({ domain, what })),
};

// Local checks: quote length per the task (25 words), banned dashes.
const long = out.decided.filter(d => d.quote.split(/\s+/).length > 25).map(d => `${d.id} ${d.quote.split(/\s+/).length}`);
if (long.length) console.log('QUOTES OVER 25 WORDS: ' + long.join(', '));
const s = JSON.stringify(out, null, 2);
if (/[–—]/.test(s)) console.log('DASH FOUND');
fs.writeFileSync(path.join(__dirname, '..', 'inv', 'D14.json'), s + '\n', 'utf8');
console.log(`wrote ${out.decided.length} decided, ${out.gaps.length} gaps, ${out.contradictions.length} contradictions, ${out.jobs.length} jobs`);

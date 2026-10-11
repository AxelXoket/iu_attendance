import json, re, sys
E = []
def e(id, frm, to):
    E.append({"id": id, "file": "teknik.html", "from": frm, "to": to})

# ---------- sunucu ----------
e("D62", "Kodlar HMAC'le saklanır;",
  "Kodlar kendine ayrılmış giriş kodu özet anahtarıyla HMAC'le saklanır (bkz. <a href=\"#sunucu-ayarlar\">Ayarlar</a>); inceleme hesabının sabit kodu da gizli ayardan okunur ve aynı sabit süreli karşılaştırmayla denetlenir;")

e("D60", "      <div class=\"row\" id=\"sunucu-imza-dogrulama\"><div class=\"k\">İmza doğrulama</div><div>Kayıt telefonda",
  "      <div class=\"row\" id=\"sunucu-ilk-yonetici\"><div class=\"k\">İlk yönetici</div><div>Sunucu imajındaki küçük bir komut (<code>yonetici-ekle</code>), sunucu makinesinde <code>docker compose run --rm</code> ile göç servisinin imajından çalışır: verilen <code>@istanbul.edu.tr</code> adresine onaylı yönetici hesabı açar, denetim kaydına \"komut satırı\" diye yazar. Şifre ya da kod üretmez; yönetici normal e-posta koduyla girer. HTTP ucu, ortam değişkeniyle kurulan açılış hesabı ve ilk gelene yönetici yapan kurulum sayfası yok (açık kalan kurulum sayfası ele geçirilebilir). Komutu yalnız sunucuya SSH'la giren çalıştırır; bütün yöneticiler erişimini kaybederse kurtarma yolu da bu. Mastodon da ilk sahibini sunucudaki komutla açıyor (tootctl). Geliştirmede ve testlerde yönetici veri kurucuyla açılır. Karar: bkz. <a href=\"plan.html#kararlar\">Kararlar, Roller</a>.</div></div>\n"
  "      <div class=\"row\" id=\"sunucu-imza-dogrulama\"><div class=\"k\">İmza doğrulama</div><div>Kayıt telefonda")

e("D66", "aynı kayıt yeniden gelirse sayaca bakılmadan \"zaten var\" döner.",
  "aynı kayıt yeniden gelirse sayaca bakılmadan \"zaten var\" döner. Hocanın okuttuğu makbuz aynı doğrulamadan geçer; zarfı getiren hocanın oturumu kaydı değiştirmez, yalnız geliş yolu olarak saklanır.")

e("D68", "Gece sınıflandırması İstanbul saatiyle zamanlanır;",
  "Gece sınıflandırması (ne yaptığı: bkz. <a href=\"plan.html#kararlar\">Kararlar, Şüpheli kayıt</a>) İstanbul saatiyle, yoğunluk dışı ve gecelik <code>pg_dump</code>'la çakışmayan bir saatte zamanlanır;")

e("D62", "<div class=\"row\"><div class=\"k\">Ayarlar</div><div>Ortam değişkenleri açılışta Zod'la doğrulanır; eksik ya da hatalıysa sunucu açılmaz. Gizli anahtarlar (saat belgesi anahtarı, QR anahtar kaynağı, SMTP ve veritabanı parolaları) ortam değişkeniyle değil, Compose secrets dosyasıyla ve yalnız gereken servise verilir. Geliştirmede .env dosyasını Node <code>--env-file</code> ile okur, dotenv yok. Saat belgesi ve QR anahtarı açılışta üretilmez; yoksa sunucu açılmaz.",
  "<div class=\"row\" id=\"sunucu-ayarlar\"><div class=\"k\">Ayarlar</div><div>Ortam değişkenleri açılışta Zod'la doğrulanır; eksik ya da hatalıysa sunucu açılmaz. Gizli anahtarlar (saat belgesi anahtarı, QR anahtar kaynağı, giriş kodu özet anahtarı, inceleme hesabının sabit kodu, SMTP ve veritabanı parolaları; pgBackRest'in depo şifreleme parolası ve depo erişim bilgisi yalnız PostgreSQL kabına) ortam değişkeniyle değil, Compose secrets dosyasıyla ve yalnız gereken servise verilir. Geliştirmede .env dosyasını Node <code>--env-file</code> ile okur, dotenv yok. Saat belgesi, QR ve giriş kodu özet anahtarı açılışta üretilmez; yoksa sunucu açılmaz. Her anahtar tek iş içindir: giriş kodu özet anahtarı saat belgesi ya da QR anahtarıyla paylaşılmaz.")

# ---------- veritabani ----------
e("D63", "imaj tam ara sürüme sabit (şu an 18.6)",
  "imaj tam ara sürüme sabit (şu an 18.6; kendi imajımın tabanı, bkz. <a href=\"#veritabani-yedek\">Yedek</a>)")

e("D50", "öğrencide tek etkin cihaz, yalnız teyitli",
  "öğrencide tek etkin cihaz (inceleme hesaplarının cihazları hariç: cihaz satırındaki \"inceleme cihazı\" evet/hayır alanı dizinin koşulunda; kısmi dizinin koşulu yalnız aynı tablonun sütunlarını görebildiğinden alan cihaz kaydında hesaptan kopyalanır; muafiyet: bkz. <a href=\"plan.html#kararlar-inceleme-hesaplari\">İnceleme hesapları</a>), yalnız teyitli")

e("D55", "Yedek deposu sunucu dışında (S3 uyumlu depo ya da SFTP ile başka makine), şifreli;",
  "Yedek deposu sunucu dışında ve yurt içinde (S3 uyumlu depo ya da SFTP ile başka makine; gerekçe: bkz. <a href=\"#altyapi-sunucu-makinesi\">Sunucu makinesi</a>), şifreli;")

e("D63", "PostgreSQL kabında (yedeği: bkz. <a href=\"#temel-yedek-paketler\">Yedek paketler</a>).",
  "PostgreSQL kabında (yedeği: bkz. <a href=\"#temel-yedek-paketler\">Yedek paketler</a>). Resmî imajda pgBackRest yok; bu yüzden kendi imajım: depo kökünde <code>docker/postgres/Dockerfile</code>, tabanı <code>postgres:18.6-trixie</code>, içine resmî imajda zaten tanımlı PostgreSQL apt deposundan (apt.postgresql.org) yalnız <code>pgbackrest</code> paketi tam sürümüyle (şu an 2.59.3-1.pgdg13+1) kurulur, başka değişiklik yok. İmajın adı <code>iu-attendance-postgres:18.6-pgbackrest2.59.3</code>; Compose'daki PostgreSQL servisi onu bu dosyadan <code>build</code> ile derler, ayrı kayıt deposu (registry) yok. Geliştirmede, CI'da ve sunucuda aynı imaj. Sabitlenen paket apt.postgresql.org'dan kalkarsa apt-archive.postgresql.org'dan alınır.")

# ---------- testler ----------
e("D59", "<div class=\"row\"><div class=\"k\">Veritabanı sıfırlama</div><div>Testcontainers yok: testler yerelde zaten açık Docker Compose PostgreSQL'ini, CI'da GitHub Actions'ın PostgreSQL servis kabını kullanır (ikisinde aynı imaj etiketi ve C.UTF-8 yereli).",
  "<div class=\"row\" id=\"testler-veritabani-sifirlama\"><div class=\"k\">Veritabanı sıfırlama</div><div>Testcontainers yok: testler yayın PostgreSQL servisini değil, Compose'ta yalnız <code>test</code> profilindeki ayrı <code>postgres-test</code> servisini kullanır; yerelde de CI'da da <code>docker compose --profile test up --wait</code> ile açılır (GitHub'ın Ubuntu makinelerinde Docker Compose kurulu). Servis yayındakiyle aynı kendi imajımdan derlenir (bkz. <a href=\"#veritabani-yedek\">Yedek</a>); GitHub Actions'ın servis kabı Dockerfile derleyemediğinden kullanılmaz, böylece imaj etiketi ve C.UTF-8 yereli tek tanımda kalır.")

e("D59", "göçleri şablona uygular,",
  "şablonu yayındaki göç betiğiyle kurar (<code>db:migrate</code>: Drizzle göçleri, sonra <code>pg-boss migrate</code>; bkz. <a href=\"#altyapi-imaj\">İmaj ve kapanış</a>),")

e("D59", "Test veritabanında dayanıklılık ayarları kapalı (fsync, synchronous_commit, full_page_writes; CI'da veri klasörü bellekte); yayında asla.",
  "Dayanıklılık ayarları (fsync, synchronous_commit, full_page_writes) yalnız <code>postgres-test</code> servisinin komut satırında kapalı, verisi her yerde bellekte (tmpfs); fsync ve full_page_writes sunucu düzeyinde ayarlandığından veritabanı başına kapatılamaz, bu yüzden test servisi ayrı; yayın PostgreSQL servisi bu ayarları hiç taşımaz.")

e("D41", "ortak kurallar paketinin sahte saati ile pg-boss'un test saati tek nesneden yürür.",
  "ortak kurallar paketinin sahte saati ile pg-boss'un test saati tek nesneden yürür: sunucu testlerinde saat arayüzü pg-boss'un <code>TestClock</code>'undan okur (12.33.0'dan beri var, <code>clock</code> ayarıyla verilir; ortak kurallar paketi pg-boss'a bağlanmaz, bağlantıyı sunucunun test kurulumu yapar). <code>TestClock</code> yalnız pg-boss'un kendi SQL saatini (<code>job_now()</code>) kaydırır, uygulamanın SQL'indeki <code>now()</code>'u kaydırmaz; kural için <code>now()</code> yasağı bu yüzden de gerekli. Test açık bir veritabanı işlemi tutarken saat ilerletilmez (<code>tick</code> kilidi bekler); uzun sıçramada <code>tick</code> değil <code>setTime</code> kullanılır.")

e("D40", "(Stryker, kırma eşiğiyle; Vitest 5 eklentisindeki hata düzelene kadar <code>coverageAnalysis: \"all\"</code>)",
  "(Stryker, kırma eşiğiyle; Stryker'ın Vitest eklentisi yerine yerleşik komut çalıştırıcısıyla: <code>testRunner: \"command\"</code>, komut paketin <code>vitest run</code>'ı. Vitest eklentisi <code>coverageAnalysis</code> ayarını yok sayıp hep test başına kapsam kullanıyor ve bu kapsam Vitest 5'te yanlış eşleniyor; Stryker bu hatayı 3 Ekim 2026'da düzeltmeden kapattı. Komut çalıştırıcı her mutantta bütün testleri koşar: yavaş ama doğru, küçük paket için haftalık işte yeter; eklenti kurulmadığından Vitest sürümü tek kalır)")

e("D55", "Yayından önce: gerçek sunucu boyutunda,",
  "Yayından önce: gerçek sunucu boyutunda (bkz. <a href=\"#altyapi-sunucu-makinesi\">Sunucu makinesi</a>),")

e("D21+D26+D44", "Android 7.0 emülatöründe kayıt gönderme denemesi;",
  "Android 7.0 emülatöründe kayıt gönderme ve yeniden başlatma algılama (BOOT_COUNT, <code>boot_id</code>) denemesi, aynı algılama elde bulunan güncel (Android 15 ya da üstü) bir Android telefonda da bir kez; xprem denemesi (ilk derlemede ve her Expo SDK yükseltmesinde; xprem SDK uyumunu ayrıca yazmıyor): imzalı güncelleme yayımlanır, yüzde ile açılır, geri alınır, imzası bozulmuş güncellemenin telefonda reddedildiği görülür; düşerse yedek yol: bkz. <a href=\"plan.html#dagitim-guncelleme\">Dağıtım, Güncelleme</a>;")

# ---------- telefon ----------
e("D31", "58 beta'da (React Native 0.88, React 19.3), alt sınırları aynı.",
  "58 beta'da (React Native 0.88 sürüm adayı, React 19.3), alt sınırları aynı: Android 7 (minSdk 24), iOS 16.4.")

e("D61", "Mac olmadığından modülün her iPhone değişikliği bir EAS derlemesi harcar:",
  "Mac olmadığından modülün her iPhone değişikliği bir EAS derlemesi harcar ve iPhone'a kurulan her EAS derlemesi ücretli Apple hesabıyla imzalanır (hesap kararı: bkz. <a href=\"plan.html#dagitim-hesap\">Dağıtım, iPhone, Hesap</a>):")

e("D43", "400 ya da 413'te paket ikiye bölünür;",
  "400 ya da 413'te paket tek kayıt kalana kadar ikiye bölünür; tek kayıt yine 400 ya da 413 alırsa \"ret\" işaretlenir, HTTP kodu ve sunucunun hata koduna göre günlük sayaçlara yazılır, kayıt yeniden yalnız <code>runtimeVersion</code> ya da expo-updates'in güncelleme kimliği değişince bir kez denenir (davranış: bkz. <a href=\"plan.html#kararlar\">Kararlar, Yeniden deneme</a>);")

e("D02", "kullanıcı uygulamayı kaydırıp kapatırsa görev durur.",
  "kullanıcı uygulamayı kaydırıp kapatırsa görev durur. Görev çoğunlukla telefon kilitliyken çalıştığından anahtarların erişim ayarı buna göre seçildi (bkz. <a href=\"#telefon-anahtar-imza\">Anahtar ve imza</a>).")

e("D02+D49+D10+D20", "<div class=\"row\"><div class=\"k\">Anahtar ve imza</div>",
  "<div class=\"row\" id=\"telefon-anahtar-imza\"><div class=\"k\">Anahtar ve imza</div>")

e("D02+D49+D10+D20", "Güvenli depodaki oturum anahtarı \"yalnız bu cihaz\" ayarında (<code>WHEN_UNLOCKED_THIS_DEVICE_ONLY</code>).",
  "Güvenli depodaki oturum anahtarı \"yalnız bu cihaz, ilk kilit açılışından sonra\" ayarında (<code>AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY</code>; önceki seçim <code>WHEN_UNLOCKED_THIS_DEVICE_ONLY</code> idi). Sebebi: iPhone'un uzun iş görevi yalnız telefon boştayken, çoğunlukla da kilitliyken çalışır; kilitliyken okunamayan anahtarla arka planda hiçbir şey gidemezdi. Apple bu sınıfı arka planda okunan kayıtlar için önerir; kayıt yedekle başka telefona geçmez. Secure Enclave'deki ikinci anahtar da aynı korumayla üretilir (<code>kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly</code> ve <code>.privateKeyUsage</code>; biyometri ya da şifre şartı yok), çünkü gönderim paketini arka planda o imzalar; arka plan görevi App Attest onayı istemez (yeni kayıt imzalamaz). Telefon yeniden başlayıp kilidi bir kez açılmadan ikisi de okunamaz, arka plan gönderimi bekler. Yerel veritabanı dosyası iOS'un varsayılan koruma sınıfında (ilk kilit açılışına kadar korumalı) kalır; daha sıkı sınıf verilmez, verilirse kilitli telefonda kuyruk okunamaz. Kilitli telefonda arka plan gönderimi kabul testinde denenir. "
  "Hocanın 5 günlük QR anahtarları (HMAC-SHA256) sunucudan TLS ile gelir; Android'de <code>KeyStore.setEntry</code> ve <code>KeyProtection</code> ile yalnız imzalama amacıyla Keystore'a aktarılır, bayt dizisi aktarımdan hemen sonra sıfırlanır. Sarılı aktarım (<code>importWrappedKey</code>) kullanılmaz: Android 9 ve Keymaster 4 istiyor, alt sınır Android 7 olduğundan ikinci bir yol, cihazda sarma anahtarı ve sunucuda ASN.1 sarma kodu gerekirdi; iPhone'da da Secure Enclave yalnız P-256 anahtarı tuttuğundan HMAC anahtarı her kullanımda uygulama belleğine okunur. StrongBox istenmez (<code>setIsStrongBoxBacked</code> çağrılmaz): Android'e göre daha yavaş ve çoğu uygulama için gereksiz, QR ise her 5 saniyede doğrulama kodu üretir; anahtar telefonun Keystore'unda, donanım destekliyse TEE'de durur. "
  "Android'de kayıt isteği <code>UserManager.isSystemUser()</code> sonucunu da taşır (API 23'ten beri, izin istemez); sonuç imzalı istekte gider, sunucu cihaz kaydında tek evet/hayır alanı olarak tutar ve false ise o cihazın kayıtlarına \"İkinci profil\" etiketi koyar (bkz. <a href=\"plan.html#gun\">Yoklama günü, Kayıt etiketleri</a>). Gerekçe: anahtar kanıtındaki uygulama kimliği yalnız paket adı, sürüm ve imza özeti taşır, kullanıcı ya da profil bilgisi taşımaz; ikinci profildeki kopya kendi geçerli kanıtını alır. Paket adını değiştiren sanal kopyalama uygulamaları kanıttaki paket ve imza denetiminde zaten reddedilir. Kök açılmış telefonda bu değer gizlenebilir.")

e("D21+D44", "<code>boot_id</code> ya da BOOT_COUNT değişmişse yeniden başlatma sayılır.",
  "<code>boot_id</code> ya da BOOT_COUNT değişmişse yeniden başlatma sayılır. BOOT_COUNT <code>Settings.Global</code>'da Android 7.0'dan (API 24) beri herkese açık, izin istemez; önce o okunur. <code>boot_id</code>'yi Android'in güvenlik politikası Kasım 2017'de bütün uygulamaların okumasına açtı (sepolicy: <code>allow domain proc_random:file r_file_perms</code>, Android 9 ve sonrası); Android 7 ile 8.1'de ya da üreticinin değiştirdiği politikada okunamayabilir. Okunamayan değer değişmiş sayılmaz; <code>elapsedRealtimeNanos</code> kayıtlı değerin altına düşmüşse de yeniden başlatma sayılır; BOOT_COUNT ile <code>boot_id</code>'nin ikisi de okunamazsa yeniden başlatma sayılır. Okuma hatası günlük sayaçlara yazılır. Algılama Android 7.0 emülatöründe ve güncel bir Android telefonda denenir (bkz. <a href=\"#testler-kalite\">Kalite kapıları</a>).")

e("D68", "Ekranların hata sınırları ve genel hata yakalayıcı hataları olay kaydıma yazar.",
  "Ekranların hata sınırları ve genel hata yakalayıcı hataları günlük sayaçlara yazar: hata türü ve ekran adına göre sayı; hata metni ve kişisel veri gitmez (bkz. <a href=\"plan.html#kararlar-olcum\">Ölçüm</a>).")

e("D64", "yoksa izin penceresi hiç çıkmaz.",
  "yoksa izin penceresi hiç çıkmaz. Hak uyarısı her ders ve tür (teori, uygulama) için sabit bir bildirim kimliğiyle gösterilir; yeni seviye aynı kimlikle eskisinin yerine geçer, art arda birden çok uyarı yığılmaz (kural: bkz. <a href=\"plan.html#devam\">Devamsızlık, Uyarı seviyeleri</a>).")

e("D66", "öğrencinin telefonu makbuzu çizer (kareler düz görünümlerle; react-native-qrcode-svg yok)",
  "öğrencinin telefonu makbuzu çizer (kareler düz görünümlerle; react-native-qrcode-svg yok). Makbuz QR'ının içeriği imza zarfının kendisi (bkz. <a href=\"#sunucu-imza-dogrulama\">İmza doğrulama</a>), yeniden biçimlendirilmez; bayt kipinde, L düzeyinde. Tahmini boyut 600 ile 900 bayt, yani sürüm 20 ile 25 arası (L düzeyinde sürüm 20 en çok 858, sürüm 25 en çok 1273 bayt); yakından okutulduğu için büyük QR sorun değil, gerçek boyut ilk kayıtla ölçülür (karar: bkz. <a href=\"plan.html#kararlar\">Kararlar, Kayıt ve makbuz</a>)")

e("D09", "tarama için konum izni (\"konum için kullanılmaz\" anlamındaki <code>neverForLocation</code> bildirilemez)",
  "tarama için konum izni (\"konum için kullanılmaz\" anlamındaki <code>neverForLocation</code> bildirilemez); bu yüzden konum servisi kapalıyken tarama sonuç vermez (Android 12 ve üstünde bu şart yalnız <code>neverForLocation</code> bildirenler için kalkar), modül taramadan önce konum servisinin açık olduğunu denetler")

# ---------- altyapi ----------
e("D55+D63", "      <div class=\"row\" id=\"altyapi-servisler\"><div class=\"k\">Servisler</div><div>Docker Compose. PostgreSQL profilsiz;",
  "      <div class=\"row\" id=\"altyapi-sunucu-makinesi\"><div class=\"k\">Sunucu makinesi</div><div>Tek Linux sanal makine, bütün Compose servisleri (Caddy, API, işçi, göç servisi, PostgreSQL, xprem) üzerinde; yer kararı: bkz. <a href=\"plan.html#teknoloji\">Kullanılacak teknolojiler, Sunucu yeri</a>. Başlangıç boyutu 4 sanal çekirdek, 8 GB bellek, 100 GB SSD (PostgreSQL'in <code>shared_buffers</code> değeri buna göre yaklaşık 2 GB). Bu ölçülmüş değil, başlangıç değeri: yayından önceki ders çıkışı yük testi bu boyutta koşar (bkz. <a href=\"#testler-kalite\">Kalite kapıları</a>), boyut testten ve 100.000 kayıt başına ölçülen tablo boyutundan (bkz. <a href=\"#veritabani\">Veritabanı, Dönem alanı</a>) sonra kesinleşip buraya yazılır. Büyüme önce dikey (çekirdek, bellek, disk), sonra plandaki sırayla (bkz. <a href=\"plan.html#teknoloji\">Kullanılacak teknolojiler, Ölçeklenme yolu</a>). Yedekler bu makinede değil (bkz. <a href=\"#veritabani-yedek\">Yedek</a>).</div></div>\n"
  "      <div class=\"row\" id=\"altyapi-servisler\"><div class=\"k\">Servisler</div><div>Docker Compose. PostgreSQL profilsiz (kendi imajım, bkz. <a href=\"#veritabani-yedek\">Yedek</a>);")

e("D59", "Mailpit yalnız <code>dev</code> profilinde.",
  "Mailpit yalnız <code>dev</code> profilinde, test PostgreSQL'i (<code>postgres-test</code>) yalnız <code>test</code> profilinde (bkz. <a href=\"#testler-veritabani-sifirlama\">Testler, Veritabanı sıfırlama</a>).")

e("D47+D59", "<div class=\"row\"><div class=\"k\">İmaj ve kapanış</div><div>Sunucu imajı çok aşamalı derlenir, <code>pnpm deploy</code> ile yalnız sunucunun paketlerini alır; süreç root değil node kullanıcısıyla, Compose'da <code>init: true</code> ile çalışır. Aynı imaj API, işçi ve tek seferlik göç servisi olur; API ve işçi göçlerin bitmesini bekler.",
  "<div class=\"row\" id=\"altyapi-imaj\"><div class=\"k\">İmaj ve kapanış</div><div>Sunucu imajı çok aşamalı derlenir, <code>pnpm deploy</code> ile yalnız sunucunun paketlerini alır (12.2.0'dan beri <code>injectWorkspacePackages</code> gerekmez; bir eş bağımlılık iki sürüme çözülürse deploy durur, <code>overrides</code> ile tek sürüme sabitlenir); süreç root değil node kullanıcısıyla, Compose'da <code>init: true</code> ile çalışır. Aynı imaj API, işçi ve tek seferlik göç servisi olur; API ve işçi göçlerin bitmesini bekler. Göç servisi tek betiği çalıştırır: <code>db:migrate</code> (önce Drizzle göçleri, sonra pg-boss'un kendi CLI'sıyla <code>pg-boss migrate</code>); geliştirme ortamı ve test koordinatörü de aynı betiği kullanır, göç adımı başka yerde yazılmaz.")

e("D47", "acil açıkta <code>pnpm audit --fix</code> paketi geçici olarak bekleme dışına alır, düzeltme oturunca çıkarılır.",
  "acil açıkta önce <code>pnpm audit --fix=update</code> çalışır: kilit dosyasını günceller, düzeltilmiş sürümü geçici olarak bekleme dışına alır (<code>minimumReleaseAgeExclude</code>). Sürüm aralığı izin vermezse <code>pnpm audit --fix</code> ayrıca <code>overrides</code> ekler. Düzeltme oturunca bekleme istisnası da override da çıkarılır.")

e("D63", "Dependabot npm'in yanında GitHub Actions, Docker ve Docker Compose imajlarını da günceller.",
  "Dependabot npm'in yanında GitHub Actions, Docker ve Docker Compose imajlarını da günceller. <code>docker/postgres/Dockerfile</code>'daki taban imajı da Dependabot günceller; içindeki pgBackRest paket sürümü onun dışında kalır, pgBackRest yayınları GitHub'da izlenip elle yükseltilir.")

e("D53", "eski telefon sürümleri en düşük sürüm kontrolüyle yönetilir, kayıt gönderme ucu en son kapatılır",
  "eski telefon sürümleri en düşük sürüm kontrolüyle yönetilir (eşik yalnız dönem arasında yükselir), kayıt gönderme ucu hiçbir sürüme kapatılmaz")

# ---------- dagitim-ayrinti ----------
e("D38", "xprem \"control plane\" modunda (kademeli açma yalnız bu modda var);",
  "xprem \"control plane\" modunda (kademeli açma yalnız bu modda var; control plane, yönetim paneli, yüzdeyle kademeli açma, elle geri alma ve uçtan uca kod imzası MIT çekirdekte, xprem'in CONTRIBUTING.md'sine göre MIT çıkan özellik ticari kısma taşınmaz; <code>ee/</code> klasörlerindeki yetki rolleri, bölge ya da kullanıcı grubuna göre hedefleme, kendiliğinden geri alma, SSO, denetim kaydı kullanılmaz);")

e("D51", "İnternetsiz açılışta beklenmez: <code>fallbackToCacheTimeout</code> 0.",
  "Sorgu ve indirme <code>Updates.checkForUpdateAsync</code> ile <code>Updates.fetchUpdateAsync</code>; arka plan görevinde de bu ikisi çağrılır, <code>reloadAsync</code> çağrılmaz (Expo'nun örneğinden farklı: kullanıcı ekrandayken uygulama yeniden başlamaz, güncelleme sonraki açılışta devreye girer). Son sorgu anı yerel veritabanında tutulur. İnternetsiz açılışta beklenmez: <code>fallbackToCacheTimeout</code> 0.")

e("D46", "xprem'in saatlik kullanım bildirimi kapalı.",
  "xprem'in saatlik kullanım bildirimi (sunucu adresini, uygulama ve kullanıcı sayısını, kurulum türünü üreticiye gönderir) <code>DISABLE_TELEMETRY=true</code> ile kapalı.")

e("D26", "yayın anahtarına erişene karşı korumaz.",
  "yayın anahtarına erişene karşı korumaz. Kod imzası ve kademeli açma xprem'in MIT çekirdeğinde; <code>ee/</code> klasörlerindeki ticari kısım bana gerekmiyor (lisans sınırı: bkz. <a href=\"#dagitim-ayrinti-guncelleme-sunucusu\">Güncelleme sunucusu</a>).")

e("D46", "v3.2.0'dan beri eski eoas ile yayın reddediliyor, güvenlik düzeltmesi yalnız son 3.x sürüme geliyor.",
  "v3.2.0'da yükleme protokolü değişti ve xprem eoas'ın sunucuyla aynı sürümde olmasını istiyor (eski sunucuda eoas uyarı verir); güvenlik politikasına göre düzeltme yalnız son 3.x sürüme gelir, eski sürüme taşınmaz, bu yüzden 3.x içinde geride kalınmaz. İmaj cosign ile imzalı yayımlanır; yeni imaj kurulmadan önce <code>cosign verify</code> ile doğrulanır.")

e("D46", "xprem'in ana anahtarı",
  "xprem'in ana anahtarı (<code>DB_KEYS_MASTER_KEY_B64</code>)")

e("D62", "QR anahtar kaynağı çevrimdışı yedeklenir",
  "QR anahtar kaynağı, pgBackRest depo şifreleme parolası (kaybolursa şifreli yedekler açılamaz) çevrimdışı yedeklenir")

e("D62", "mağazadaki uygulama etkilenmez.",
  "mağazadaki uygulama etkilenmez. Giriş kodu özet anahtarı ve inceleme hesabının sabit kodu yedeklenmez: kaybolursa yenisi üretilir; ilkinde yalnız o anda geçerli 5 dakikalık kodlar düşer, ikincisinde yeni kod mağaza panellerine yazılır.")

e("D45", "(Android 15 ve üstünü hedefleyen uygulamada Kasım 2025'ten beri Play şartı), derlemede denetlenir;",
  "(Android 15 ve üstünü hedefleyen uygulamada Kasım 2025'ten beri Play şartı), derlemede denetlenir: GitHub'daki APK Android build-tools 35 ve üstünün <code>zipalign -c -P 16 -v 4</code> komutuyla (son satır \"Verification successful\"), AAB Play Console'un uyumluluk uyarısıyla; Kotlin modülüm .so eklemez, denetim React Native ve Expo kütüphanelerinin .so dosyaları için;")

# ---------- kod ----------
e("D63", "<li><code>packages/contracts</code>: istek ve cevap şemaları, rota tablosu, fetch yardımcısı, her yayının saklanan OpenAPI belgesi</li>",
  "<li><code>packages/contracts</code>: istek ve cevap şemaları, rota tablosu, fetch yardımcısı, her yayının saklanan OpenAPI belgesi</li>\n    <li><code>docker/postgres</code>: pgBackRest eklenmiş PostgreSQL imajının Dockerfile'ı (bkz. <a href=\"#veritabani-yedek\">Yedek</a>)</li>")

e("D60", "  jobs/             iş kuyruğu görevleri",
  "  jobs/             iş kuyruğu görevleri\n  cli/              sunucu makinesinde elle çalışan komutlar (ilk yönetici)")

e("D54", "Hoca oturumları ve giriş kodları kimlik modülünün iki tablosunda.",
  "Hoca oturumları ve giriş kodları kimlik modülünün iki tablosunda. Silinen hesapta giriş alanları (e-posta, kodlar, oturumlar) silinir, kişi satırı öğrenci numarasıyla ve \"silindi\" işaretiyle kalır; yoklama kayıtları ve açık anahtarlar saklama süresi dolana kadar kalır (kapsam: bkz. <a href=\"plan.html#kararlar\">Kararlar, Hesap silme</a>).")

e("D48", "iPhone'da son App Attest sayacı",
  "iPhone'da her App Attest anahtarının son sayacı (anahtar yenilenince eskisi de kalır)")

e("D50", "Öğrencide tek etkin cihaz.",
  "Öğrencide tek etkin cihaz; inceleme hesabının cihazları bu kuraldan muaf (cihaz satırında \"inceleme cihazı\" işareti).")

e("D58", "<strong>Dersler, ders saatleri ve şubeler:</strong> gün, yerel saat, derslik, teori ya da uygulama, yoklama süresi, p değeri.",
  "<strong>Dersler, ders saatleri ve şubeler:</strong> gün, yerel saat, derslik, teori ya da uygulama, yoklama süresi; derste teori ve uygulama için iki ayrı p değeri (varsayılan 70 ve 80; bkz. <a href=\"plan.html#devam\">Devamsızlık hesabı</a>).")

e("D66", "sunucuya ulaşma zamanı,",
  "sunucuya ulaşma zamanı, geliş yolu (öğrencinin telefonu ya da makbuzu okutan hoca ve hocanın telefonundaki okutma zamanı),")

e("D68+D56", "sürüm tek sayaç satırından, eşitleme belirtecinde veritabanı nesli.",
  "sürüm tek sayaç satırından; telefonun imlecinde (bkz. <a href=\"plan.html#kararlar-indirme\">İndirme</a>) veritabanı nesli. Nesil: <code>pg_control_system()</code> fonksiyonunun <code>system_identifier</code> değeri ile <code>pg_control_checkpoint()</code> fonksiyonunun <code>timeline_id</code> değeri; API her indirmede değişenler sorgusuyla aynı işlemde okur, ayrı tablo ya da elle adım yok. Büyük sürüm geçişi nesli değiştirirse bu yalnız bir kez baştan indirmedir. Yedekten dönüş denemesinde (bkz. <a href=\"#veritabani-yedek\">Yedek</a>) neslin değiştiği de denetlenir. Sunucu indirmeyi role göre süzer: listelerin tamamı yalnız dersin hocasına, öğrenciye yalnız kendi liste satırı (karar: bkz. <a href=\"plan.html#kararlar-indirme\">İndirme</a>).")

e("D59", "PostgreSQL'de <code>pg_isready</code> sağlık denetimi), sonra uygulamaları açar.",
  "PostgreSQL'de <code>pg_isready</code> sağlık denetimi), sonra yayındaki göç betiğini (<code>db:migrate</code>, bkz. <a href=\"#altyapi-imaj\">İmaj ve kapanış</a>) çalıştırır, sonra uygulamaları açar. Testler kendi <code>postgres-test</code> servisini açar (bkz. <a href=\"#testler-veritabani-sifirlama\">Testler, Veritabanı sıfırlama</a>).")

# ---------- verify ----------
src = open(r"C:\Users\USER\Desktop\iu_attendance\teknik.html", encoding="utf-8").read()
ok = True
for x in E:
    c = src.count(x["from"])
    if c != 1:
        print("COUNT", c, x["id"], x["from"][:60]); ok = False
    if "\u2014" in x["to"] or "\u2013" in x["to"]:
        print("DASH", x["id"]); ok = False
# sequential apply
s = src
for x in E:
    c = s.count(x["from"])
    if c != 1:
        print("SEQCOUNT", c, x["id"], x["from"][:60]); ok = False
    s = s.replace(x["from"], x["to"], 1)
ids = set(re.findall(r'id="([^"]*)"', s))
pids = set(re.findall(r'id="([^"]*)"', open(r"C:\Users\USER\Desktop\iu_attendance\plan.html", encoding="utf-8").read()))
dup = [i for i in ids if len(re.findall('id="%s"' % re.escape(i), s)) > 1]
print("dup ids", dup)
for h in re.findall(r'href="([^"]*)"', s):
    if h.startswith("#"):
        if h[1:] not in ids: print("BROKEN", h); ok = False
    elif h.startswith("plan.html#"):
        if h[10:] not in pids: print("BROKEN", h); ok = False
open(sys.argv[1] + "/teknik.applied.html", "w", encoding="utf-8").write(s)
json.dump(E, open(sys.argv[1] + "/edits.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("OK" if ok else "FAIL", len(E))

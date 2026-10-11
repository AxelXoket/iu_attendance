### D15-B01 (needs_owner=true)
Q: BİDB veri merkezinde sunucu makinesi verilebilecek mi; verilemezse hangi yerli sağlayıcı kullanılacak; makinenin ağ koşulları (sabit genel IP, 443 ve 80 portu, yurt dışından erişim, dışarı çıkış izni, ayrı yedek deposu) ne olacak?
WHY: plan.html#acik-sunucu-makinesi açık nokta. Sertifika (B03, B04), güvenlik duvarı ve dışarı çıkış (B10), yük testinin koşacağı makine (B13) ve tehdit modelindeki hipervizör erişimi (B27) bu cevaba bağlı. Makine yurt dışından erişilemezse mağaza incelemesi reddedilir (plan.html#kararlar-inceleme-hesaplari).
OPTIONS: BİDB veri merkezinde Linux sanal makine (planın birinci sırası) || Kurum kontrolünde, Türkiye'de kurulu yerli sağlayıcıda kurum adına sanal makine
REC: Planın sırası korunur: önce BİDB. Resmî yazıya plandaki sorulara ek olarak şunlar konur: sabit genel IPv4 ve ters DNS; 443 ile birlikte 80 portu (yalnız ACME doğrulaması ve HTTPS'e yönlendirme, B04); sunucunun dışarı çıkış listesi (B10); sanal makine diskinin şifreli olup olmadığı ve hipervizöre kimlerin eriştiği (B27); aynı boyutta ikinci, geçici bir sanal makine (B13); makinenin anlık görüntü (snapshot) politikası. 4 çekirdek, 8 GB, 100 GB SSD başlangıç değeri olarak kalır (teknik.html#altyapi-sunucu-makinesi).

### D15-B02 (needs_owner=true)
Q: API, panel, güncelleme sunucusu (xprem), gizlilik politikası ve hesap silme sayfası hangi alan adında ve kaç ana makine adında yayımlanır: sahibin kendi alan adı mı, istanbul.edu.tr altında bir ad mı?
WHY: Uygulama API ve güncelleme adresini derlemeye gömer; ad sonradan değişirse eski sürümler yeni adı bilemez, değişiklik ancak yeni sürümle gelir. Plan güncelleme adresini ve gizlilik metnini sahibin alan adına koyuyor (plan.html#dagitim-guncelleme, plan.html#dagitim-gizlilik-politikasi); teknik.html#panel-sunulma panel ile API'yi aynı adresten, teknik.html#altyapi-caddy güncelleme yolunu aynı Caddy'den sunuyor; plan.html#acik-sunucu-makinesi ise BİDB'den alan adı istiyor. Üniversite alanında ad seçilirse sertifika sağlayıcısı (CAA kaydı), HSTS includeSubDomains ve her DNS değişikliği BİDB'ye bağlanır.
OPTIONS: Hepsi sahibin alan adında, tek ana makine adı altında || Hepsi istanbul.edu.tr altında bir adda || Panel üniversite adında, API ve güncelleme sahibin alan adında
REC: Birincisi: tek ad (ör. yoklama.<sahibin alan adı>), panel kökte, API /v1 altında, güncelleme yolu aynı adda (teknik.html#panel-sunulma, teknik.html#altyapi-caddy). DNS sahibin elinde kalınca ACME doğrulaması ve ileride makine değişikliği BİDB'ye bağlı olmaz. Kurumsal görünüş istenirse üniversite adı yalnız panel için ek ad olarak sonra eklenir; panel adresi uygulamaya gömülmediğinden bu kırılma yaratmaz. Karar ilk Android ve iPhone derlemesinden önce verilmeli.

### D15-B03 (needs_owner=true)
Q: Sertifikayı Caddy ACME ile mi alır, üniversite mi verir; Let's Encrypt seçilirse Android 7.0 desteği alt sınırı 7.1.1'e çıkararak mı, uygulamaya ISRG Root X1'i ek kök koyarak mı korunur?
WHY: plan.html#acik-sunucu-sertifikasi açık. Seçim uygulamanın ilk derlemesine girer (ağ güvenlik ayarı uygulama dosyasında, teknik.html#altyapi-caddy) ve desteklenen Android sürümünü değiştirebilir (plan.html#dagitim-desteklenen-surumler). Elle yenilenen sertifika unutulursa bütün telefonlar bağlanamaz; Düzce'nin uygulaması sertifika hatasıyla 10 gün kullanılamadı (plan.html#benzer).
OPTIONS: Caddy, Let's Encrypt ve uygulamada ek ISRG Root X1 (Android 7.0 kalır) || Caddy, Let's Encrypt ve alt sınır Android 7.1.1 || Caddy ve kökü Android 7.0 deposunda bulunan başka bir ACME sağlayıcısı || Üniversite sertifikası, elle yenileme ve 30 gün kala uyarı
REC: Birincisi. Kendiliğinden yenileme, elle yenilemenin unutulma riskini kaldırır; ek kök sabitleme değildir, sertifika sunucuda yenilenmeye devam eder (teknik.html#altyapi-caddy). Bedeli plan.html#dagitim-desteklenen-surumler'de yazılı: Let's Encrypt kök değiştirirse yeni kök Android 7.0'a ancak yeni sürümle gelir; bu yüzden Let's Encrypt'in duyurduğu yeni kökler bir sonraki mağaza sürümünde ek kök listesine girer. Android 7.0 emülatöründe kayıt gönderme denemesi (teknik.html#testler-kalite) her yeni uygulama sürümünde ve her sertifika sağlayıcısı değişikliğinde bu yolu sınar (B14).

### D15-B04 (needs_owner=false)
Q: Sertifika doğrulaması hangi yolla yapılır (80 portundan HTTP-01, 443'ten TLS-ALPN-01, DNS-01); üniversite önüne HTTPS ağ geçidi koyarsa ağ geçidi ile Caddy arası şifreli mi; Caddy'nin sertifika ve ACME hesabı verisi kalıcı birimde mi?
WHY: plan.html#acik-sunucu-makinesi BİDB'den yalnız 443'ü istiyor; HTTP-01 80 portunu ister, TLS-ALPN-01 ise TLS'in Caddy'ye kadar gelmesini ister. teknik.html#altyapi-caddy ağ geçidi verilirse "TLS orada biter" diyor; ağ geçidinden Caddy'ye düz HTTP giderse oturum anahtarları ve çerezler kampüs ağında açık taşınır, ağ geçidi varken de Caddy sertifika alamaz. Caddy'nin veri dizini kaybolursa her yeniden kurulumda sertifika yeniden alınır ve sağlayıcının oran sınırına takılabilir.
OPTIONS: 80 ve 443 açık; Caddy'nin varsayılan HTTP-01 ve TLS-ALPN-01 doğrulaması || Yalnız 443 ve TLS-ALPN-01 || DNS-01 ve sunucuda DNS API anahtarı
REC: Birincisi: 80 yalnız ACME ve HTTPS'e yönlendirme için açılır, Caddy iki doğrulamayı da dener. Ağ geçidi verilirse ağ geçidi ile Caddy arası da TLS olur ve ağ geçidi istemci adresini tek bir başlıkta yazar, Caddy yalnız ona güvenir (teknik.html#altyapi-caddy). Caddy'nin /data ve /config dizinleri adlı Compose biriminde durur; yedeklenmez (sertifika yeniden alınabilir). Geliştirme ve hazırlık ortamında ACME sağlayıcısının deneme (staging) adresi kullanılır. Üniversite adı seçilirse (B02) istanbul.edu.tr'nin CAA kaydının sağlayıcıya izin verdiği önce denetlenir.

### D15-B05 (needs_owner=false)
Q: Caddy'nin panel için yazdığı güvenlik başlıkları ve CSP tam olarak ne; API'de @fastify/helmet hangi başlıkları yazar; HSTS süresi ve includeSubDomains ne olur?
WHY: teknik.html#altyapi-caddy "CSP dahil sayfa güvenlik başlıklarını sunar" diyor, teknik.html#sunucu-guvenlik API'de helmet kullanıyor; değerler yazılmamış. İki katman CSP'yi farklı değerle yazarsa tarayıcı ikisini birden uygular ve beklenmeyen engeller çıkar; öbür başlıklar iki kez yazılınca davranış tarayıcıya göre değişir. includeSubDomains üniversite alanında açılırsa başka üniversite alt alanlarını da etkiler.
OPTIONS: Panel başlıkları yalnız Caddy'de, API başlıkları yalnız helmet'te || Bütün başlıklar Caddy'de, helmet kapalı
REC: Birincisi. Panel: Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"; Strict-Transport-Security max-age=31536000 (includeSubDomains ve preload yalnız ad sahibin alanındaysa, B02); X-Content-Type-Options nosniff; Referrer-Policy no-referrer; Permissions-Policy camera=(), microphone=(), geolocation=(), screen-wake-lock=(self) (projeksiyon sayfası Screen Wake Lock kullanır, plan.html#hoca). API (/v1): helmet yalnız JSON'a uyan başlıkları yazar (nosniff, frame-ancestors 'none', HSTS); Cache-Control: no-store zaten karar (teknik.html#sunucu-guvenlik). CSP önce Report-Only ile en eski hedef tarayıcıda denenir (teknik.html#panel-cati: kürsüde Chrome 109 olasılığı), sonra zorunlu yapılır. Bir davranış senaryosu API başlıklarını, bir CI denetimi Caddy başlıklarını sınar.

### D15-B06 (needs_owner=false)
Q: Gizli anahtarlar nasıl üretilir, hangi uzunlukta, sunucuda hangi biçimde durur (etkin anahtar ve yalnız doğrulamada kullanılan eskiler), ne zaman ve nasıl değiştirilir; çevrimdışı yedek hangi ortamda ve kimde durur?
WHY: teknik.html#sunucu-ayarlar anahtarların açılışta üretilmediğini, kid taşıdığını ve eski anahtarın en az dönem kilidine kadar saklandığını yazıyor; üretim yöntemi, dosya biçimi, değiştirme takvimi ve kesintisiz değiştirme adımları yok. teknik.html#dagitim-ayrinti-korunacak-anahtarlar "çevrimdışı yedeklenir" diyor; ortam, şifreleme ve geri açma denemesi yazılmamış. Ortam değişkenleri Zod'la doğrulanıyor ama gizli değerler dosyadan geliyor; ayar şemasının dosyayı nasıl okuyacağı da yazılmamış.
OPTIONS: Her dönem arasında planlı değiştirme, şüphede hemen değiştirme || Yalnız şüphede değiştirme
REC: Birincisi. cli/ altına anahtar-uret komutu: amaç başına 32 bayt crypto.randomBytes, base64. Sunucuda her amaç için bir secrets dosyası: {etkin_kid, anahtarlar: {kid: değer}}; kid amaç önekli ve tarihli (ör. sb-2027b); dosya 0400, yalnız ilgili servise bağlı; ayar şeması /run/secrets/<ad> dosyasını okur ve aynı Zod şemasıyla doğrular. Saat belgesi anahtarı ve QR anahtar kaynağı her dönem arasında değiştirilir; bu pencere en düşük sürümün yükseltildiği pencereyle aynıdır (plan.html#dagitim-guncelleme-ilkesi). Giriş kodu özet anahtarı her an değiştirilebilir, yalnız 5 dakikalık kodlar düşer (teknik.html#dagitim-ayrinti-korunacak-anahtarlar). Değiştirme: yeni kid eklenir, etkin_kid değişir, API kopyaları sırayla yeniden başlar, eski kid yalnız doğrulamada kalır (B07). Çevrimdışı yedek: anahtarlar ve pgBackRest parolası parola korumalı tek şifreli dosyada, iki ayrı fiziksel ortamda; geri yükleme denemesi (D12) bu dosyanın açılmasını da kapsar.

### D15-B07 (needs_owner=false)
Q: Değiştirilen saat belgesi ve QR anahtarı tam olarak ne zaman silinir; silindikten sonra o anahtarla belgelenmiş kayıt gelirse ne olur?
WHY: teknik.html#sunucu-ayarlar "en az dönem kilidine kadar" diyor; oysa gönderilmemiş kayıt telefonda gidene kadar bekler ve birimin son gününden sonra gelen geçerli kayıt da saklanır (plan.html#kararlar-gonderme-suresi). Anahtar silinmişse sunucu böyle bir kaydın geçerli olduğunu doğrulayamaz; ne karar verileceği yazılmamış.
OPTIONS: Emekli anahtar bir dönem daha yalnız doğrulamada tutulur, sonra silinir; daha geç gelen kayıt "anahtar emekli" gerekçesiyle saklanır || Emekli anahtar kayıtların saklama süresi boyunca tutulur
REC: Birincisi. Dönem kilidinden sonra gelen kayıt sayımı zaten değiştiremez (plan.html#kararlar-gonderme-suresi), bu yüzden bir dönem daha yeter; gizli anahtarı yıllarca tutmak sızıntı yüzeyini büyütür. Daha geç gelen kayıt ret almaz, "anahtar emekli" gerekçe koduyla saklanır (ham kayıt kanıttır, plan.html#kararlar-cihaz-dogrulamasi). Gerekçe kodu D05 ve D07'nin listesine girer.

### D15-B08 (needs_owner=false)
Q: Bir gizli anahtar, xprem yayın anahtarı, SSH anahtarı ya da sunucunun kendisi ele geçirilirse hangi adımlar atılır; şüpheli dönemde gelen kayıtlara ne olur?
WHY: Belgelerde olay müdahalesi yok. kid var, ama sızıntıdan anahtar değişimine kadar sahte saat belgesiyle gelen kayıtlar ayırt edilemez. İmza xprem'de sunucuda atıldığından (teknik.html#dagitim-ayrinti-xprem-guvenligi) sunucuyu ya da yayın anahtarını ele geçiren bütün telefonlara kod gönderebilir.
OPTIONS: Depoda yazılı kısa müdahale listesi ve gerekli CLI komutları || Olay anında el yordamıyla
REC: Birincisi: docs/isletim/olay.md ve cli/ komutları. Saat belgesi ya da QR anahtarı: yeni kid etkin olur, eski kid "ele geçirildi" işaretlenir; o kid'le belgelenmiş ve şüphe anından sonra ulaşan kayıtlar gerekçe koduyla İncelemede alınır (karar D04 ve D07 ile). Giriş kodu özet anahtarı: hemen değiştirilir. Bütün hoca oturumlarını kapatan bir komut eklenir (yönetici bugün yalnız bir hesabın oturumlarını kapatabiliyor, plan.html#kararlar-roller). xprem: yayın anahtarı değiştirilir, son yayımlanan güncellemeler CI kayıtlarıyla karşılaştırılır, bilinmeyen güncelleme geri alınır (B31). Sunucu: temiz imajla yeniden kurulur, veritabanı şüpheden önceki âna PITR ile döner (D12); telefonlar sonraki kayıtları yeniden gönderir (plan.html#gun-kenar-durumlar). Her adımın sorumlusu sahiptir (B38).

### D15-B09 (needs_owner=false)
Q: Sunucuya kim, hangi yoldan erişir: SSH anahtar türü, parola ve kök girişi, SSH'ın hangi ağlardan açık olduğu, BİDB personelinin konsol erişimi?
WHY: İlk yönetici komutu ve xprem yönetim paneli yalnız SSH'la kullanılıyor (teknik.html#sunucu-ilk-yonetici, teknik.html#dagitim-ayrinti-xprem-guvenligi); SSH'ı ele geçiren veritabanını, gizli anahtarları ve güncelleme imzasını ele geçirir. Erişim kuralı yazılmamış.
OPTIONS: SSH yalnız BİDB VPN'inden ya da izinli adreslerden, yalnız donanım anahtarlı SSH anahtarıyla || SSH internete açık, yalnız anahtarla ve deneme sınırıyla
REC: Birincisi: parola ve kök girişi kapalı, ed25519-sk (donanım anahtarlı) SSH anahtarı, sudo için ayrı parola; SSH portu internete açılmaz. BİDB VPN'i yoksa izinli adres listesi; o da olmazsa ikinci seçenek ve sshd'de deneme sınırı. Hipervizör ve konsol erişimi tehdit modelinde kabul edilen risk olarak yazılır (B27).

### D15-B10 (needs_owner=false)
Q: Sunucuya hangi portlardan girilir, sunucu dışarıda hangi adreslere çıkar?
WHY: BİDB veri merkezleri çoğu zaman dışarı çıkışı kısıtlar. Sunucu Android anahtar kanıtı iptal listesini düzenli çeker (teknik.html#sunucu-imza-dogrulama), saatini NTP ile eşitler (teknik.html#altyapi-servisler), SMTP'ye bağlanır (plan.html#kararlar-e-posta-gonderimi), sertifika alır (teknik.html#altyapi-caddy), imaj ve paket çeker. Biri kapalıysa ilgili iş sessizce bozulur; NTP kapalıysa saat belgesi verilmez (plan.html#gun-ikinci-capa).
OPTIONS: Yazılı giriş ve çıkış izin listesi BİDB'ye verilir || Dışarı çıkış serbest
REC: Birincisi. Giriş: 443, 80 (B04), SSH yalnız B09'daki yoldan. Çıkış: ACME sağlayıcısı, Google anahtar kanıtı iptal listesi adresi (D07), SMTP rölesi ya da gönderici sunucu (D14), NTP sunucuları (BİDB'ninki varsa önce o), imaj ve paket depoları (B11), dış izleme hizmetinin kalp atışı adresi (B19). Uygulama kodu kullanıcıdan gelen bir adrese istek atmaz (SSRF yüzeyi yok); bu bir kod inceleme kuralı olarak yazılır. Her çıkış hedefinin son başarılı erişimi işletim denetiminde (D14) izlenir.

### D15-B11 (needs_owner=false)
Q: API ve işçi imajı ile Caddy ve panel dosyaları nerede derlenir, sunucuya nasıl gelir, nasıl doğrulanır?
WHY: PostgreSQL imajı için "ayrı kayıt deposu (registry) yok", Compose build ile derleniyor (teknik.html#veritabani-yedek); xprem imajı cosign ile doğrulanıyor (teknik.html#dagitim-ayrinti-xprem-guvenligi). API imajı ve panel dosyaları için yol yazılmamış. Sunucuda derlemek 4 çekirdekli makineye ders saatinde yük getirir ve CI'da sınanan imajla aynı olmayabilir; CI'ya sunucunun SSH anahtarını vermek CI'yı ele geçireni sunucuya taşır.
OPTIONS: CI imajı derler, cosign ile imzalar, kayıt deposuna (GHCR) yükler; sunucu özetle (digest) çeker ve doğrular || Sunucu git etiketinden Compose build ile derler || CI imajı SSH ile sunucuya taşır
REC: Birincisi. API ve işçi imajı ile Caddy imajı (Caddyfile, panelin derlenmiş dosyaları ve gizlilik politikası sayfası içinde; böylece panel ile Caddy ayarı birlikte değişir) CI'da derlenir, anahtarlı cosign ile imzalanır (sunucu doğrulamak için dışarı çıkmasın diye anahtarsız imza kullanılmaz), GHCR'ye yüklenir. Sunucu salt okunur jetonla çeker, compose dosyasında imajlar özetle sabittir, kurulumdan önce cosign verify koşar (xprem'deki kuralın aynısı). CI sunucuya erişmez; yayını sahibin SSH'la başlattığı komut yapar (B12). Depo özel kalırsa GHCR'nin ücretsiz kotası dar gelebilir (B30); o zaman ikinci seçenek yedek yoldur. PostgreSQL imajı mevcut kararla sunucuda derlenir.

### D15-B12 (needs_owner=false)
Q: Sunucu yayını hangi sırayla yapılır, kesinti kabul edilir mi, hangi saatlerde yapılır, kötü yayın nasıl geri alınır, makine yeniden açılınca servisler hangi sırayla kalkar?
WHY: teknik.html göçlerin ayrı yayın adımında uygulandığını (teknik.html#sunucu-mimari), API ve işçinin göçleri beklediğini ve kapanışta isteklerin bitirildiğini (teknik.html#altyapi-imaj) yazıyor; adımların sırası, yayın zamanı ve geri dönüş yazılmamış. Tek API kopyası yeniden başlarken hizmet kesilir. Docker, makine ya da Docker yeniden başladığında Compose'un depends_on koşullarını uygulamaz; API PostgreSQL'den önce kalkabilir. Benzer ürünlerde kesintiler dönemin ilk haftasında yaşanmış (plan.html#benzer).
OPTIONS: İki API kopyası, sırayla yeniden başlatma, ders saatleri dışında yayın penceresi || Tek kopya, kısa kesinti kabul
REC: Birincisi. Tek betik (cli/yayinla): imajları özetle çek ve doğrula; dolu tablo dizinlerini CONCURRENTLY aç ve indisvalid denetle (teknik.html#sunucu-mimari, D12); göç servisini çalıştır (db:migrate); işçiyi, sonra API kopyalarını birer birer yeniden başlat (Caddy etkin sağlık denetimiyle kopyayı devreden çıkarıp alır, B41); /v1/durum ve /health/ready ile duman denemesi. Yayın penceresi hafta içi 20:00 sonrası ya da hafta sonu; birimin devamsızlık işleme son günü haftasında ve dönemin ilk haftasında yalnız güvenlik düzeltmesi. Geri dönüş: önceki imaj özetine dön; "önce genişlet, sonra daralt" (teknik.html#sunucu-mimari) eski imajın yeni şemayla çalışmasını sağlar, daraltma göçü bir sonraki yayına kalır. API açılışta veritabanına ulaşamazsa çökmez: /health/live canlı, /health/ready hazır değil der ve bağlantıyı yeniden dener.

### D15-B13 (needs_owner=true)
Q: Yayından önceki gerçek boyutlu yük testi, ilk yayından sonra hangi makinede koşar; ayrı bir hazırlık (staging) ortamı olacak mı?
WHY: teknik.html#testler-kalite yük testinin gerçek sunucu boyutunda koşmasını istiyor; geliştirme ortamı yalnız sahte veriyle çalışıyor (teknik.html#kod-gelistirme-ortami). İlk yayından sonra üretim makinesinde yük testi gerçek veriyi ve süren dersleri etkiler. Deneme dönemi ve inceleme hesapları üretimde yaşıyor (plan.html#kararlar-inceleme-hesaplari).
OPTIONS: BİDB'den aynı boyutta ikinci sanal makine: hazırlık ortamı ve yük testi || Yalnız yük testi için, sahte veriyle, yerli sağlayıcıda saatlik kiralanan geçici makine || Üretim makinesinde, bakım penceresinde, ayrı veritabanıyla
REC: Birincisi; olmazsa ikincisi (yalnız sahte veri taşıdığından gerçek veri barındırma ölçütüne girmez, ama maliyet ve sağlayıcı sahibin onayını ister). Üçüncüsü reddedilir: aynı disk ve çekirdekleri paylaştığından ölçüm hem yanlış hem tehlikeli. Hazırlık ortamı aynı Compose dosyasının prod profiliyle, ayrı alan adıyla ve sahte veriyle kurulur; xprem denemesi (teknik.html#testler-kalite) ve yayın betiği (B12) önce burada koşar.

### D15-B14 (needs_owner=false)
Q: teknik.html'deki "Yayından önce" denemeleri hangi yayında koşar: her sunucu yayınında mı, her mağaza sürümünde mi, her uzaktan güncellemede mi?
WHY: teknik.html#testler-kalite listeyi veriyor (yük testi, haftalık işin elle koşusu, Android 7.0 emülatörü, xprem denemesi) ama tetikleyiciyi yalnız xprem için yazıyor (ilk derleme ve her Expo SDK yükseltmesi). Her sunucu yayınında tam yük testi pahalıdır; hiç koşmamak kapasite gerilemesini gözden kaçırır.
OPTIONS: Yayın türüne göre tablo || Her yayında hepsi
REC: Tablo: ders yükü testi ilk yayından, her dönem başından, gönderme, saat belgesi, kimlik ya da yoklama tablosu şemasına dokunan sunucu yayınından ve Fastify, PostgreSQL, Node ya da Drizzle büyük sürüm geçişinden önce; haftalık işin elle koşusu her sunucu yayınından önce; Android 7.0 emülatörü ve güncel Android denemesi her mağaza ve APK sürümünde ve sertifika sağlayıcısı değişince; xprem denemesi kararlaştırıldığı gibi. Tablo teknik.html'deki Kalite kapıları satırına eklenir.

### D15-B15 (needs_owner=false)
Q: Yük testinin tam profili, veri hacmi ve geçme ölçütleri ne?
WHY: teknik.html#testler-kalite en kötü durumu (20.000 telefon 1 dakikada, telefon başına 2 ya da 3 istek) veriyor, geçme ölçütü vermiyor. Test yalnız "ders çıkışı" diye adlanıyor, oysa kayıt yoklama anında da gönderilir (plan.html#kararlar-gonderme) ve plan ders başı yoğunluğunu ayrıca anıyor (plan.html#dagitim-guncelleme). Telefon belgeyi açılışta ve ağ değişince de yeniler (plan.html#gun-ikinci-capa); bu istekler gönderim öncesi belge isteğiyle birleşmezse telefon başına istek 3'ü aşar. D10-B22 en büyük sınıfın tam dönem özetinin süre sınırını bu testten bekliyor.
OPTIONS: Üç profil (ders başı, ders çıkışı, gece) ve dolu veritabanıyla, yazılı eşiklerle || Yalnız ders çıkışı profili
REC: Birincisi. Veritabanı bir dönemlik veriyle doldurulur (yaklaşık 4,2 milyon kayıt; yılda 8,4 milyon, plan.html#teknoloji-sunucu-yeri). Profiller: (a) ders başı: 20.000 telefon bir saat başında 60 saniyeye yayılmış yoklama ve gönderim; (b) ders çıkışı: aynı sayı, internetsiz kalmış telefonların toplu gönderimi, paket başına 1 ile 6 kayıt, yüzde 5'i 200 kayıtlık paket; (c) gece: iPhone arka plan gönderimi ile gece işlerinin çakışması. Aynı anda panelde 50 hocanın rapor ve AKSİS özeti istekleri. Geçme: gönderme ucunda p95 1 saniyenin, p99 3 saniyenin altında; 503 dışında 5xx sıfır; 503 oranı yüzde 2'nin altında ve hepsi Retry-After taşıyor; her makbuzlu kayıt tam bir kez (teknik.html#testler-kalite); PostgreSQL bağlantısı sınırın yüzde 80'inin altında; en büyük sınıfın tam dönem AKSİS özeti yük altında p95 2 saniyenin altında (D10-B22). Açılış, ağ değişimi ve gönderim öncesi belge istekleri tek istekte birleşmeli; bu D04 ve D06'ya kural olarak yazılır, test istek sayısını sayar.

### D15-B16 (needs_owner=false)
Q: k6 binlerce ayrı cihaz kimliğini ve geçerli imzaları nasıl üretir?
WHY: Gönderme ucu cihaz imzalı ve saat belgesi sunucunun HMAC'ini taşıyor (plan.html#gun-saati-degistirmek-neden-ise-yaramaz); rastgele istek derine giremez (teknik.html#testler-kalite, Schemathesis gerekçesi). Binlerce cihaz için gerçek App Attest ya da anahtar kanıtı üretilemez; sahte doğrulayıcıyla koşmak ise "sınırlar açık" üretim ayarından sapar.
OPTIONS: Kurulum komutu cihazları kanıtsız yoldan (Cihaz doğrulanmadı) gerçek P-256 açık anahtarlarla kaydeder; k6 WebCrypto ile ECDSA P-256 imzalar || Önceden imzalanmış zarflar dosyadan okunur || Yük üreteci Node ile yazılır
REC: Birincisi. Kanıtsız telefon yolu üretimde zaten var (plan.html#kararlar-cihaz-dogrulamasi) ve aynı imza doğrulama kodundan geçer; sunucu ayarı değişmez. Kayıt zarfları kurulum aşamasında (k6 setup) hazırlanabilir, ama gönderim paketinin imzası taze saat belgesine bağlı olduğundan (plan.html#gun-ikinci-capa) çalışma anında imzalanır. Kurulum komutu (cli/yuk-cihazlari) yalnız hazırlık ortamında çalışır; üretimde açılmasını bir ortam değişkeni engeller.

### D15-B17 (needs_owner=false)
Q: Yük testinden önce hangi başlangıç değerleriyle başlanır: API kopya sayısı, kopya başına havuz, işçi ve xprem havuzu, kap bellek sınırları, under-pressure eşikleri, gövde sınırı, sunucu zaman aşımları?
WHY: teknik.html eşiklerin yük testinden yazılacağını (teknik.html#sunucu-guvenlik), bağlantı hesabının yazılacağını (teknik.html#veritabani-donem-alani, Bağlantı havuzu) ve gövde sınırının açıkça yazılacağını (teknik.html#sunucu) söylüyor; ilk kod ve ilk yük testi bir başlangıç değeri ister. Telefon 30 saniyede vazgeçtiğinden (teknik.html#telefon-gonderme-protokolu) sunucu daha önce cevap vermeli; yoksa aynı paket boşuna iki kez işlenir.
OPTIONS: Aşağıdaki başlangıç değerleri; yük testinden sonra ölçülenler teknik.html'e yazılır
REC: API 2 kopya, kopya başına havuz 20; işçi 5 (D14-B10); xprem 10; göç servisi 2; pgBackRest 2; süper kullanıcı 3: toplam 62, sınır 100. Havuz bekleme süresi 2 saniye, sonra 503 (teknik.html#sunucu-mimari). Bellek: API kabı 1 GB, işçi 512 MB; under-pressure: maxRssBytes kap sınırının yüzde 85'i, maxEventLoopDelay 1000 ms, maxEventLoopUtilization 0,98, retryAfter 10 saniye; /health/live ve /v1/durum bu denetimin dışında (B41). Gövde sınırı: gönderme ucunda 1 MiB (200 zarf, zarf başına 600 ile 900 bayt, teknik.html#telefon-kamera-qr), liste yükleme ucunda D03'ün satır sınırına göre, öbür uçlarda 64 KiB; Caddy'de aynı sınırlar. Fastify requestTimeout 20 saniye; uygulama rolünde statement_timeout 10 saniye (D12).

### D15-B18 (needs_owner=false)
Q: Her istek ve iş logunda hangi alanlar bulunur, hangi düzeyler kullanılır, loglar ne kadar ve nerede tutulur, kullanıcının gördüğü istek kimliğiyle log nasıl bulunur?
WHY: teknik.html#sunucu-ayarlar neyin yazılmayacağını ve istek kimliği ile sürenin yazılacağını söylüyor; alan listesi, saklama süresi ve arama yolu yok. local log sürücüsü kap başına sınırlı boyut tutar; yoğun bir günde sorun anının logu sahip bakmadan silinebilir. Kullanıcı hata ekranında istek kimliğini görüyor (tasarim.html#tipografi, kod-01); destek için bu kimlikle arama gerekir. Caddy'nin erişim logu açılırsa adresin tamamını yazar.
OPTIONS: Sabit alan listesi, pino redact yolları, local sürücüde boyut ayarı ve günlük sıkıştırılmış dışa aktarım || Ayrı log toplama hizmeti
REC: Birincisi. İstek logu: reqId, rota kalıbı, yöntem, durum kodu, süre, istemci türü, uygulama sürümü, runtimeVersion ve updateId (plan.html#dagitim-guncelleme), iç kullanıcı ya da cihaz UUID'si, hata kodu; IP yalnız hız sınırı olayında. Düzey üretimde info, geliştirmede debug. pino redact yolları: authorization, cookie, set-cookie ve gövdedeki kod, jeton, isim alanları. local sürücüde kap başına max-size 50m, max-file 10; her gece günün logları sıkıştırılıp 30 gün sunucuda tutulur. Caddy erişim logu kapalı, yalnız hata logu. İstek kimliği hata ekranında gösterilen değerle aynıdır (biçimi D13'ün); cli/log-bul bir istek kimliğinin API ve işçideki bütün satırlarını getirir.

### D15-B19 (needs_owner=true)
Q: Uyarılar sahibe hangi kanaldan gider; dış erişim denetimi hangi hizmetle, nereden, hangi sıklıkla yapılır; sunucu ya da SMTP düşünce uyarı nasıl yine ulaşır?
WHY: teknik.html#sunucu-ayarlar "cevap gelmezse beni uyarır" diyor, kanal yok. Uyarı yalnız sunucunun e-postasıyla giderse sunucu ya da SMTP düşünce uyarı da gidemez (D14-B11). GitHub Actions zamanlanmış işleri gecikebilir ve açık depoda 60 gün hareketsizlikte kapanır (teknik.html#altyapi-imaj); dış denetim için uygun değil.
OPTIONS: Dış izleme hizmeti: /v1/durum denetimi, sertifika bitişi denetimi ve işçinin kalp atışı (sessizlik uyarısı) aynı hizmette; e-posta yalnız acil olmayan uyarılar için || Yalnız sunucunun e-postası
REC: Birincisi. Hizmet yurt dışından denetler (inceleme için gereken yurt dışı erişim de sınanır, plan.html#kararlar-inceleme-hesaplari), 5 dakikada bir, art arda 2 başarısızlıkta sahibin telefonuna anlık bildirim ve e-posta. Hizmete kişisel veri gitmez: yalnız /v1/durum'un 204'ü ve işçinin boş kalp atışı isteği; bu yüzden "üçüncü taraf analitik yok" kuralına (plan.html#kararlar-olcum) aykırı değildir. Uyarı kuralları tek tabloda (isletim_uyarilari): açık uyarı 6 saatte bir hatırlatılır, kapanınca tek "düzeldi" iletisi gider. Hizmet seçimi ve hesabı sahibin.

### D15-B20 (needs_owner=false)
Q: Sunucu tarafında hangi ölçüler hangi eşikle uyarı üretir ve nerede hesaplanır?
WHY: teknik.html#sunucu-ayarlar "veritabanından birkaç sayı yeter" diyor, hangileri olduğu yok. WAL arşivi başarısız olursa WAL diskte birikir, 100 GB disk dolunca PostgreSQL durur; bu, yedekten önce hizmeti düşürür. NTP, sertifika ve işçi izlenmesi isteniyor (teknik.html#altyapi-servisler, teknik.html#altyapi-caddy) ama eşikler yazılmamış.
OPTIONS: İşçideki işletim denetimi (D14) ve makinedeki küçük betik aşağıdaki listeyi 10 dakikada bir okur || Ayrı ölçüm sunucusu (Prometheus)
REC: Birincisi; ilk sürümde OpenTelemetry yok kararıyla uyumlu (teknik.html#sunucu-ayarlar). Eşikler: disk kullanımı yüzde 80; pg_stat_archiver failed_count artışı ya da son başarılı arşivin 15 dakikadan eski olması (archive_timeout 300 saniye, teknik.html#veritabani-yedek); son başarılı pgBackRest ve pg_dump yedeğinin 26 saatten eski olması (D12); PostgreSQL bağlantısı sınırın yüzde 80'i; son 10 dakikada 503 dışı 5xx sayısı 20 ya da 503 oranı yüzde 5; gönderme ucu p95 süresi 2 saniye (pino loglarından); kap yeniden başlama sayısı; NTP durumu (B21); sertifika bitişi 14 ya da 30 gün (teknik.html#altyapi-caddy); zamanlanmış işlerin son başarısı (D14-B11). Disk, kap ve NTP makinedeki betikten; veritabanı ve log ölçüleri işçiden okunur.

### D15-B21 (needs_owner=false)
Q: API kabının içinden makinenin NTP durumu nasıl okunur, hangi sapmada "eşitleme bozuk" sayılır, durum değişince ne olur?
WHY: Eşitleme bozulunca yeni saat belgesi verilmez ve ulaşma anı reddi durur (plan.html#gun-ikinci-capa); bu, API'nin bilmesi gereken bir girdidir. Kap makinenin saat servisini göremez; eşik yazılmamış. Kayıt payının sabit kısmı belge isteğinin süresi kadar küçük olduğundan (plan.html#gun-ikinci-capa), sunucu saatindeki yarım saniyelik bir sıçrama iki çapayı ayrıştırıp kayıtları gereksiz incelemeye düşürebilir.
OPTIONS: Makinede chrony; bir zamanlayıcı 30 saniyede bir durumu küçük bir JSON dosyasına yazar, dosya API'ye salt okunur bağlanır || API kendisi bir NTP sunucusuna sorup sapmayı ölçer
REC: Birincisi. Dosya alanları: senkron, sapma_ms, katman, ölçüm zamanı. "Bozuk": senkron değil, ya da mutlak sapma 100 ms'yi aşıyor, ya da dosya 120 saniyeden eski. Durum değişimi loglanır ve B19'daki kanala uyarı gider; düzelince belgeler kendiliğinden yeniden verilir. Bir davranış senaryosu dosyayı "bozuk" yapıp belge isteğinin reddini ve ulaşma anı denetiminin İncelemede'ye dönüşünü sınar (kararın sahibi D04). NTP kaynağı önce BİDB'nin sunucusu, yedek olarak tr.pool.ntp.org.

### D15-B22 (needs_owner=false)
Q: Telefonun günlük sayaçları ve panelin onay ekranı süreleri hangi uçla, hangi biçimde gelir, hangi modülde ve tabloda tutulur, ne kadar saklanır?
WHY: plan.html#kararlar-olcum sayaçların içeriğini, teknik.html#kod-veri-modeli "Telefon sayaçları" tablosunu veriyor; uç, alan listesi, gün sınırı, tekrar gönderimde ne olacağı ve panelin süreleri için tablo yok. teknik.html#sunucu-mimari modül listesinde ölçüm modülü yok.
OPTIONS: Ayrı olcum modülü; telefon sayaçları ve hoca ekran süreleri iki tabloda || Sayaçlar yoklama modülünün içinde
REC: Birincisi. POST /v1/olcum/sayaclar (telefon, ortak kuyruktan) ve POST /v1/olcum/ekran-sureleri (panel). Satır anahtarı (cihaz, İstanbul günü); aynı gün yeniden gelirse üzerine yazılır, toplanmaz (tekrar gönderim sayıyı şişirmesin). Sayaç adları sözleşme paketinde sabit bir listede, değerler negatif olmayan tam sayı; liste dışı ad reddedilmez, saklanmaz, yalnız bilinmeyen ad sayısı loglanır (eski ve yeni sürümler birlikte yaşar). Her satırda platform, uygulama sürümü, runtimeVersion ve updateId. Kişisel veri, hata metni, öğrenci kimliği yok (teknik.html#telefon-arka-plan). Saklama iki dönem.

### D15-B23 (needs_owner=false)
Q: "Ders başına onay ekranı süresi" nasıl ölçülür: hangi ekranlar sayılır, toplu onayda süre derslere nasıl paylaştırılır, ortanca hangi oturumlar üzerinden alınır?
WHY: Hedef ders başına ortanca istiyor (plan.html#hedefler), ölçüm günlük toplam gönderiyor (plan.html#kararlar-olcum) (bkz. D15-C01). Toplu onay ve gece sıralanan inceleme partileri birden çok oturuma yayılır.
OPTIONS: İstemci süreyi oturum başına tutar, günlük paket oturum başına satır taşır; çok oturumlu ekranda süre ekrandaki oturumlara eşit bölünür || Yalnız kafa sayısı ekranı ölçülür
REC: Birincisi. Sayılan ekranlar: kafa sayısı, "Ders yapıldı mı?", Kendi beyanı ve ilk kayıt teyidi toplu onayı, İncelemede kayıtlar, sorun bildirimleri. Süre ekranın önde açık kaldığı süredir, 60 saniye dokunma ya da kaydırma olmazsa durur (boşta açık kalan ekran hedefi şişirmesin). Ortanca, kafa sayısı girilmiş oturumlar üzerinden hoca ve dönem başına hesaplanır. Paket kişisel veri taşımaz; oturum kimliği iç UUID'dir.

### D15-B24 (needs_owner=false)
Q: Hedefler'deki sayılar ve telefon sayaçları sahibe nerede, ne sıklıkla görünür?
WHY: Ölçüm kararları ve hedefler var (plan.html#kararlar-olcum, plan.html#hedefler), "sorun günlük sayaçlarla bana ulaşır" deniyor (plan.html#kararlar-yeniden-deneme); görüntüleme yeri yok. Panelde yeni bir ekran ürün kararıdır ve tasarım envanterinde yok. Dönem sonu raporu D10'un (D10-B18).
OPTIONS: SQL görünümleri, bir CLI komutu ve haftalık özet e-postası || Yönetici panelinde işletim sayfası
REC: Birincisi: her hedef için bir SQL görünümü (olcum_ önekli); cli/olcum-raporu tarih aralığı ve birim için Hedefler tablosunu yazar; haftalık iş aynı tabloyu sahibe e-postayla yollar. Ret sayaçlarında yeni bir HTTP ya da sunucu hata kodu görünürse aynı gün uyarı gider (B19). Panel sayfası sonraki sürümde, ürün kararıyla.

### D15-B25 (needs_owner=true)
Q: Benimseme nasıl ölçülür ve hedefi ne?
WHY: plan.html#benzer "benimseme baştan ölçülmeli" diyor; plan.html#hedefler'de benimseme satırı yok. Ölçü tanımlanmazsa deneme döneminden App Store'a geçiş ölçütü (plan.html#acik-asama1) de eksik kalır.
OPTIONS: Ders başına kayıtlı telefonu olan öğrenci oranı, kayıt alan oturum oranı, kafa sayısı girilen oturum oranı, haftalık etkin hoca sayısı || Yalnız kayıtlı öğrenci sayısı
REC: Birincisi; dördü de mevcut tablolardan tek sorguyla çıkar, ayrı olay tablosu gerekmez (plan.html#kararlar-olcum). Hedef değerleri sahip deneme dönemi kapsamıyla birlikte koyar.

### D15-B26 (needs_owner=false)
Q: CI'ın yazdığı yayın bilgisi dosyası sunucuya nasıl gelir, biçimi ne, bozuk ya da eksikse sunucu ne yapar?
WHY: plan.html#dagitim-guncelleme "Yayın bilgisini CI yayında küçük dosyaya yazar, sunucu yalnız onu okur; GitHub'a sorulmaz" diyor; dosyanın sunucuya ulaşma yolu yok. CI'ın sunucuya yazması B11'deki gerekçeyle istenmiyor. En düşük sürüm yalnız dönem arasında yükselir (plan.html#dagitim-guncelleme-ilkesi); yanlış bir dosya bütün telefonları güncelleme ekranına düşürebilir.
OPTIONS: Dosya sunucu imajına gömülür; uygulama yayını küçük bir sunucu yayınıdır || Dosya ayrı salt okunur birimde, yayın komutuyla güncellenir
REC: Birincisi: dosya CI'da üretilip imaja girer, imaj imzalı olduğundan dosya da imzalı gelir, yayın adımı (B12) zaten var. Sunucu açılışta dosyayı Zod'la doğrular; geçersizse açılmaz (sırayla yeniden başlatmada eski kopya hizmette kalır). En düşük sürüm bir önceki değerden yüksekse ve herhangi bir birim dönem içindeyse (birim takvimleri D02'den) sunucu eski değeri kullanır ve uyarı verir; böylece plan.html#dagitim-guncelleme-ilkesi kodla korunur. Alanların anlamı D06'nın.

### D15-B27 (needs_owner=false)
Q: Sunucunun varlıkları, saldırganları, güven sınırları, önlemleri ve kabul edilen riskleri nerede ve nasıl yazılır?
WHY: Belgeler önlemleri dağınık veriyor (teknik.html#sunucu-guvenlik, teknik.html#altyapi-caddy, teknik.html#dagitim-ayrinti-xprem-guvenligi) ve hile tarafını ayrıca anlatıyor (plan.html#hile), ama sunucuya yönelik saldırıların listesi yok. Bazı riskler kabul edilmiş ama tek yerde değil: güncelleme imzası sunucuda (sunucuyu ya da yayın anahtarını ele geçiren bütün telefonlara kod gönderir), hoca girişi tek etken (plan.html#kararlar-tek-etkenli-giris), sunucu yurt dışına açık (coğrafi engel konamaz), sanal makine diski ve hipervizör BİDB'nin elinde. ASVS seviye 2 doğrulaması bu modele bağlanmadan yapılamaz.
OPTIONS: teknik.html'e kısa bir tehdit modeli bölümü ve ASVS seviye 2 eşleme tablosu || Ayrı belge
REC: Birincisi. Varlıklar: imzalı kayıtlar ve denetim kaydı, saat belgesi anahtarı, QR anahtar kaynağı, giriş kodu özet anahtarı, oturum özetleri, xprem imza ve yayın anahtarları, veritabanı ve yedekler, SSH. Saldırganlar: toplu hile isteyen öğrenci, dışarıdan saldırgan, ele geçmiş hoca hesabı, kötü niyetli yönetici, tedarik zinciri, BİDB içinden erişim. Güven sınırları: internet ile Caddy, Caddy ile API, API ile PostgreSQL, CI ile xprem, sahip ile SSH. Her satır var olan bir önleme (belge çapasıyla) ya da bu listedeki açık bir boşluğa bağlanır. ASVS 5.0 seviye 2'nin uygulanan maddeleri bir senaryoya ya da ayar denetimine bağlanır; uygulanmayanlar (6.3.3 gibi) gerekçeyle yazılır.

### D15-B28 (needs_owner=false)
Q: Yetki ve hile senaryolarına ek olarak hangi güvenlik denetimleri koşar?
WHY: Planın yetki ve hile senaryoları (plan.html#baslangic) ve bağımlılık denetimi (teknik.html#altyapi-guncellemeler) var; imaj taraması, kod taraması ve yayın öncesi dış inceleme kararı yok. CodeQL ücretsiz yalnız açık depoda (B30).
OPTIONS: Haftalık işe imaj taraması, depo açıksa CodeQL, ilk gerçek dönemden önce dış güvenlik incelemesi || Yalnız mevcut denetimler
REC: Birincisi. Haftalık iş (teknik.html#testler-kalite) sunucu ve Caddy imajını bilinen açıklara karşı tarar; yüksek ve kritik bulgu kırmızıdır. Davranış senaryolarına eklenir: başka hocanın oturumunu kapatma, panel isteğinde yanlış Origin (teknik.html#sunucu-kimlik), gövde sınırını aşan paket, sağlık uçlarının Caddy üzerinden API'ye ulaşmadığı, loglarda öğrenci numarası ve isim bulunmadığı (artı kontrol olarak bilerek loga verilen değerin gizlendiği görülür). Dış inceleme bütçe gerektirirse sahibe sorulur.

### D15-B29 (needs_owner=false)
Q: Stryker kırma eşiği kaç; %90 kapsam hangi ölçüyle (satır, dal) hesaplanır; haftalık iş kırmızı olursa ne olur?
WHY: teknik.html#testler-kalite "kırma eşiğiyle" diyor, değer yok; kapsam ölçüsü yazılmamış. Kırmızı haftalık iş yayını durdurmuyorsa kimse fark etmeyebilir.
OPTIONS: İlk eşik 80, sonra ölçülen değerin altına inmez; kapsam satır ve dal için ayrı ayrı %90; kırmızı haftalık iş bir sonraki sunucu yayınını durdurur || Eşiksiz rapor
REC: Birincisi. Kapsam @vitest/coverage-v8 ile, eşik vitest ayarında. Hayatta kalan mutantlar haftalık raporda listelenir; eşdeğer mutant dosyada gerekçeyle işaretlenir. Haftalık işin elle koşusu zaten yayın öncesi kapıda (teknik.html#testler-kalite).

### D15-B30 (needs_owner=true)
Q: Kod deposu açık mı, özel mi?
WHY: plan.html'de açık nokta (Açık noktalar, Depo görünürlüğü). CI'ın gücü buna bağlı: zorunlu denetimli korumalı dal, onaylı ortam (environment) kuralları, CodeQL ve 4 çekirdekli makine ücretsiz planda yalnız açık depoda; özel depoda paralel senaryo sayısı 2'ye iner (teknik.html#testler) ve "kırmızıysa birleştirilmez" yalnız sahibin kuralı kalır (teknik.html#altyapi-imaj).
OPTIONS: Açık depo || Özel depo ve yalnız sürüm dosyaları için ayrı açık depo
REC: Güvenlik ve test açısından açık depo: gizli bilgi depoda hiç durmuyor (teknik.html#sunucu-ayarlar), kod gizliliği bir güvenlik önlemi sayılmıyor, korumalar ücretsiz geliyor. Özel kalırsa B31'deki onaylı yayın ortamı ve B11'deki kayıt deposu için ücretli plan gerekebilir.

### D15-B31 (needs_owner=false)
Q: xprem'e güncelleme yayımlamak kimin onayına bağlı, yayınlar nasıl kaydedilir ve izlenir?
WHY: İmza sunucuda atılıyor ve yayın anahtarına erişene karşı korumuyor (teknik.html#dagitim-ayrinti-xprem-guvenligi); xprem'in denetim kaydı ticari kısımda ve kullanılmıyor (teknik.html#dagitim-ayrinti-guncelleme-sunucusu). Sahibin GitHub hesabı ya da CI ele geçerse bütün telefonlara kod gider ve bunun kaydı tutulmaz.
OPTIONS: Yayın yalnız onay gerektiren bir GitHub ortamından; her yayın sahibe bildirilir; gece işi xprem'deki yayınları CI kayıtlarıyla karşılaştırır || Mevcut karar (anahtar yalnız CI'da)
REC: Birincisi. Yayın anahtarı yalnız "ota-yayin" ortamının gizli değeri; ortam sahibin elle onayını ister (açık depoda ücretsiz, B30); sahibin GitHub hesabında donanım anahtarlı iki etken. Her yayın bir CI yapıtı bırakır (güncelleme kimliği, runtimeVersion, yüzde, commit) ve sahibe bildirim gider. Gece denetimi xprem'in son yayınlarını salt okunur yoldan okur ve CI yapıtında olmayan bir güncelleme görürse uyarır (B19).

### D15-B32 (needs_owner=false)
Q: "Kayıt gönderme ucu hiçbir sürüme kapanmaz" kuralı oasdiff dışında nasıl sınanır?
WHY: oasdiff belge düzeyinde kırılmayı yakalar (teknik.html#sunucu-mimari, Sözleşme), ama eski bir istemcinin gerçekten gönderdiği baytların hâlâ kabul edildiğini sınamaz. Kayıt metni sunucuda yeniden biçimlendirilmeden doğrulanıyor (teknik.html#sunucu-imza-dogrulama); bir sürümün ürettiği zarf biçimi sonradan reddedilirse o sürümün bekleyen kayıtları kaybolur (plan.html#dagitim-guncelleme-ilkesi: bekleyen kayıtlar hiçbir zaman engellenmez).
OPTIONS: Her yayımlanan uygulama sürümünden örnek istekler depoda saklanır ve her değişiklikte yeniden oynatılır || Yalnız oasdiff
REC: Birincisi: test/fixtures/surumler/<sürüm>/ altında her istek türünden sahte veriyle imzalanmış örnekler; bir davranış senaryosu bunları sahte saatle geçerli pencerede oynatır ve kabul bekler. Desteklenen sürüm listesi oasdiff'in kullandığı listeyle aynıdır (D13).

### D15-B33 (needs_owner=false)
Q: "İmzası bozulmuş güncellemenin telefonda reddedildiği" deneme nasıl üretilir?
WHY: teknik.html#testler-kalite bu denemeyi istiyor; imza sunucuda atıldığından (teknik.html#dagitim-ayrinti-xprem-guvenligi) xprem bozuk imzalı güncelleme yayımlamaz.
OPTIONS: Hazırlık ortamında güncelleme cevabının imza başlığını değiştiren küçük bir deneme vekili || Başka anahtarla imzalayan ikinci bir xprem
REC: İkisi de: ikincisi yanlış anahtarla imzalanmış güncellemeyi, birincisi aktarımda değişmiş güncellemeyi sınar. Deneme yalnız hazırlık ortamında (B13) ve deneme telefonlarıyla yapılır; sonuç yayın kontrol listesine yazılır.

### D15-B34 (needs_owner=false)
Q: "İlk kararı var olan" kayıt sayımı için kaydın ilk kararı nerede saklanır?
WHY: plan.html#hedefler payı ilk karara göre tanımlıyor (Beklemede kayıt, beklemesi bitince verilen kararla girer); veri modelinde kayıtta tek bir sunucu kararı alanı var (teknik.html#kod-veri-modeli). Karar sonradan onayla değişince ilk karar kaybolur; denetim kaydı düzeltme ve onayları tutuyor (teknik.html#veritabani-donem-alani, Denetim kaydı), kendiliğinden geçişleri tutmuyor.
OPTIONS: Kayıtta bir kez yazılan ilk_karar ve ilk_karar_zamani alanları || Her karar değişimini denetim kaydına yazıp oradan hesaplamak
REC: Birincisi: Beklemede'den çıkan ilk karar ya da doğrudan verilen karar bir kez yazılır, sonra değişmez; ölçü tek sorguyla kalır (plan.html#kararlar-olcum). Alanların sahibi D05 ve D07.

### D15-B35 (needs_owner=false)
Q: "(cihaz, sıra numarası) boşlukları" hangi tabloda, hangi iş türleri üzerinden ve ne sıklıkla hesaplanır?
WHY: Sıra numarası telefonun ortak kuyruğundaki bütün işler için tek ve artan görünüyor (plan.html#gun-kenar-durumlar); yalnız yoklama tablosunda bakılırsa sorun bildirimi ve sayaç paketleri boşluk gibi görünür (bkz. D15-C02).
OPTIONS: Sıra taşıyan her iş türü (cihaz, sıra) ile saklanır; boşluk bütün türlerin birleşimi üzerinden hesaplanır || Yoklama kayıtları için ayrı sıra
REC: Birincisi: sıra numarasını taşıyan her tablo (yoklama, sorun bildirimi, sayaç paketi, hocanın işleri) (cihaz, sıra) ile saklanır; haftalık ölçüm birleşim üzerinde boşlukları bulur, onaylanan cihaz değişimi ve beyana dayalı düzeltmeyle açıklananları ayırır (plan.html#hedefler). "Sunucuya ulaştı" makbuzlu kayıp (hedef 0) görülürse aynı gün uyarı gider. Sıra tanımı D06'nın.

### D15-B36 (needs_owner=false)
Q: "100 kişilik sınıfta %90 katılıma en çok 120 sn" ölçüsünde %90'ın tabanı, başlangıç anı ve ortancanın birimi ne?
WHY: plan.html#hedefler kayıtlardaki QR zaman dilimlerinden ölçüleceğini söylüyor; taban (kafa sayısı mı, liste mi, oturumun kayıtları mı) ve başlangıç anı yazılmamış. QR gösterim kaydı bu ânı taşıyor (plan.html#asama23-degisme-ve-kabul).
OPTIONS: Taban o oturumda sonunda kabul edilen kayıt sayısı; başlangıç QR gösterim kaydındaki ilk zaman dilimi; ortanca oturumlar üzerinden || Taban kafa sayısı
REC: Birincisi: kafa sayısı yaklaşık bir sayıdır (plan.html#kararlar-kafa-sayisi), kabul edilen kayıtlar kesindir. Ölçüye yalnız 60 ve üstü kayıtlı oturumlar girer. Aşama 2 sunucu parçası D11'in; gereken alanlar ilk QR sürümünde hazır olur.

### D15-B37 (needs_owner=true)
Q: Sistem hesabının elle hesapla karşılaştırması kim tarafından, hangi örnekle, ne zaman yapılır?
WHY: plan.html#hedefler "Hesabın elle hesaplananla uyuşmazlığı da 0" diyor; elle hesabı kimin, hangi derslerde yapacağı yok. Bu hocaya ek iş getirir ve deneme döneminin kapsamına bağlıdır (plan.html#acik-asama1).
OPTIONS: Deneme döneminde seçilen birkaç derste hoca kâğıt yoklamayı paralel tutar, dönem sonunda karşılaştırılır || Sahip rastgele seçilen derslerde kayıtlardan elle hesaplar
REC: İkisi birlikte: hak ve yüzde hesabı zaten tanımla karşılaştırılarak sınanıyor (teknik.html#testler-birim); elle karşılaştırma uçtan uca hatayı (eksik kayıt, yanlış oturum) yakalar. Hangi derslerde kâğıt yoklamanın paralel tutulacağı deneme kapsamıyla birlikte sahibin kararı.

### D15-B38 (needs_owner=true)
Q: Sahip ulaşılamazken sunucuyu kim işletir; gizli anahtar yedekleri, mağaza hesapları ve SSH erişimi kime emanet edilir?
WHY: İlk yönetici, SSH, xprem paneli, imza anahtarları ve çevrimdışı yedekler yalnız sahipte (plan.html#kararlar-roller, teknik.html#dagitim-ayrinti-korunacak-anahtarlar); uyarılar "beni uyarır" diyor (teknik.html#sunucu-ayarlar). Sahip birkaç gün ulaşılamazsa sertifika, disk ya da güvenlik uyarısına cevap veren kimse yok.
OPTIONS: Mühürlü zarfla emanet ve üniversitede ikinci bir işletmeci || Kabul edilen risk olarak yazmak
REC: En az: çevrimdışı anahtar yedeğinin bir kopyası ve işletim notları (B08) mühürlü olarak üniversitede güvenilen bir kişiye emanet edilir; uyarılar ikinci bir alıcıya da gider. Kim olacağı sahibin kararı.

### D15-B39 (needs_owner=true)
Q: Sunucunun hedef erişilebilirliği ve kesintide en geç ne kadar sürede geri dönmesi gerektiği ne?
WHY: WAL arşivi veri kaybını en çok 5 dakikayla sınırlıyor ve aradaki kayıtları telefonlar yeniden gönderiyor (teknik.html#veritabani-yedek); geri dönüş süresi ve dönemin kritik günleri için hedef yazılmamış. Öğrenci kayıtları telefonda beklediğinden kısa kesinti yoklamayı bozmaz, ama hoca girişi, panel ve birimin son günü sunucuya bağlı (plan.html#devam-donem-sonu). Benzer ürünlerde kesintiler dönemin ilk haftasında yaşanmış (plan.html#benzer).
OPTIONS: Ders döneminde aylık %99,5; geri dönüş normal günde 4 saat, son gün haftasında ve dönemin ilk haftasında 1 saat || Hedef yok, en iyi çaba
REC: Birincisi; geri yükleme denemesi (D12) süreyi ölçer ve hedefle karşılaştırır. 1 saatlik hedef yazılı bir geri yükleme betiği ve hazır imaj ister; ikinci makine (B13) bu hedefi kolaylaştırır.

### D15-B40 (needs_owner=false)
Q: Üretim kaplarında ve PostgreSQL'de saat dilimi ayarı ne olur?
WHY: Test komutları TZ=UTC'yi sabitliyor (teknik.html#testler-veritabani-sifirlama), üretim için yazılmamış. Bir kod yolu yanlışlıkla yerel saati kullanırsa üretim ile test farklı davranır.
OPTIONS: Bütün kaplarda TZ=UTC, PostgreSQL timezone UTC; Europe/Istanbul yalnız açıkça || Kaplarda Europe/Istanbul
REC: Birincisi; testlerle aynı ortam. pino zaman damgası UTC ISO biçiminde. İşlerin İstanbul saatiyle zamanlanması D14'ün kuralıyla açıkça yazılır.

### D15-B41 (needs_owner=false)
Q: /health/ready "şema sürümü"nü neyle karşılaştırır; /v1/durum aşırı yük denetiminden muaf mı; Compose ve Caddy hangi sağlık ucunu kullanır?
WHY: teknik.html#sunucu-ayarlar /health/live'ın aşırı yük denetimi dışında olduğunu, /v1/durum'un onunla "aynı işi" yaptığını ama IP sınırı altında olduğunu söylüyor; /v1/durum için aşırı yük muafiyeti yazılmamış. Ders başı yoğunluğunda under-pressure 503 verirse dış denetim yanlış alarm üretir. Şema sürümü karşılaştırması tanımsız.
OPTIONS: /v1/durum da aşırı yük denetiminden muaf; Caddy etkin sağlık denetimi /health/ready, Compose sağlık denetimi /health/live || /v1/durum aşırı yükte 503 verir
REC: Birincisi. /health/ready imaja gömülü son göç adının veritabanındaki Drizzle göç tablosunda bulunduğunu denetler (D12); bulunmazsa hazır değil. Aşırı yükü ayrıca 503 oranı ölçüsü (B20) yakalar.

### D15-B42 (needs_owner=false)
Q: Caddy birden çok API kopyası arasında istekleri hangi kurala göre dağıtır; bellekteki istek sınırları kopya sayısıyla nasıl tutarlı kalır?
WHY: Kaba sınırlar her kopyanın belleğinde (plan.html#teknoloji-sunucu-yeri, Valkey satırı) ve cihaza ya da oturuma bağlı (teknik.html#sunucu-guvenlik). Caddy istekleri sırayla dağıtırsa bir cihazın istekleri bütün kopyalara yayılır, etkin sınır kopya sayısı katına çıkar. IP'ye göre dağıtmak kampüs ağının tek adresinden çıkan yüzlerce telefonu tek kopyaya yığar (teknik.html#sunucu-guvenlik).
OPTIONS: Girişli isteklerde Authorization, gönderme ucunda telefonun cihaz kimliği başlığının özetine göre dağıtım; girişsizlerde rastgele || Sırayla dağıtım ve sınırları kopya sayısına bölmek
REC: Birincisi: Caddy'nin başlık özeti politikası (lb_policy header); başlık yoksa rastgele. Kopya düşünce o kopyanın istekleri başka kopyaya geçer ve sayaçlar sıfırdan başlar; bu "kaba sınır" kararıyla uyumlu. Cihaz kimliği başlığının adı D06 ve D13'ün, sınır değerleri D13'ün.

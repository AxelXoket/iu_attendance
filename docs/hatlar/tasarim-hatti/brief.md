# İÜ Yoklama: arayüz tasarımı için ürün özeti

Kaynak: plan.html (5 Ekim 2026), teknik.html (6 Ekim 2026). Çapa dosyadaki kimlik; kimliksiz satırın adı parantezde. Tırnak içi aynen alıntı. Belgede olmayan ekran eklenmedi; yazılmamış nokta "(belgede belirsiz)" ile işaretli.

## 1) Ürün ve roller

Telefonla çalışan, internetsiz de yoklama alabilen ders yoklama uygulaması; çıta "kâğıt imzadan iyi ve basit" (plan.html#tek-bakista).

- Telefon uygulaması iki modlu: öğrenci (yoklama, makbuz, kendi kayıtları, sorun bildirme; e-posta ve şifre yok) ve hoca (derste yoklama işleri, kafa sayısı, onaylar; Aşama 2'de QR, Aşama 3'te Bluetooth) (plan.html#hoca).
- Web paneli (internet gerekir): hoca ders, liste, rapor, düzeltme, onay ve AKSİS özeti işlerini; yönetici hoca onayı, birim takvimi, dönem kilidi ve devam oranlarını yürütür. İlk yönetici sunucudaki komutla açılır (plan.html#kararlar-roller).
- Projeksiyon sayfası (Aşama 2): kürsü bilgisayarında, hocanın hesabı açılmadan yalnız QR (plan.html#asama23-nereden-gosterilir).

Aşama 1 (şimdi): yalnız makbuz QR'ı; Aşama 2: yoklama QR'ı; Aşama 3: konum. Aşama 2 ve 3 yeni sürümle gelir (plan.html#dagitim-guncelleme). Modun nasıl seçildiği ve iki modun tek telefonda birlikte olup olamayacağı yazılmamış (belgede belirsiz).

## 2) Ekran envanteri

Ö, O, H, P, Y: ekran, görünüm, pencere ya da şerit (54 adet); D: uygulama dışı yüzey, sayılmadı.

### Telefon, öğrenci modu

- Ö1. Öğrenci kaydı: numara ve okuldaki kayıtlı isim; listede yoksa kayıt bekler; teyide kadar yoklama kayıtları beklemede; tek kullanımlık kayıt kodu açık nokta. plan.html#kararlar (Öğrenci kaydı, İlk kayıt teyidi)
- Ö2. Yoklama: pencere ders saatinde kendiliğinden açılır, sayaç, "Yoklamamı ver"; süre dolunca düğme kapanır. plan.html#gun
- Ö3. Makbuz: "Telefonda kayıtlı, gönderilmedi", "Sunucuya ulaştı" ve ayrıca sunucu kararı. plan.html#kararlar-kayit-ve-makbuz
- Ö4. Makbuz QR'ı: hocaya okutulur; her kayıt ayrı QR, bekleyenler sırayla. plan.html#kararlar-kayit-ve-makbuz
- Ö5. Öğrencinin ekranı: "Kendi kayıtları, durumları, her derste kalan hakkı". plan.html#kararlar (Öğrencinin ekranı)
- Ö6. Sorun bildir: 3 gün içinde, hocanın listesine düşer. plan.html#kararlar (Sorun bildir)
- Ö7. Gönderilmemiş kayıt şeridi: bildirim izni yoksa açılışta ekranın üstünde; son hafta her açılışta. plan.html#kararlar (Bildirim), plan.html#devam-donem-sonu
- Ö8. Bildirim izni isteği: ilk yoklamadan hemen sonra, amacı söylenerek. plan.html#kararlar (Bildirim)
- Ö9. Yerel bildirimler: hak uyarısı; gönderilemeyen kayda günde bir hatırlatma. plan.html#devam-uyari-seviyeleri, plan.html#kararlar-yeniden-deneme
- Ö10. Cihaz değişimi akışı: hoca yüz yüze onaylar; öğrenci ekranları tarif edilmemiş (belgede belirsiz). plan.html#kararlar-ogrenci-telefonu
- Ö11. Cihaz durumu: "yetki hatasında gönderim durur, cihaz durumu gösterilir". plan.html#kararlar-yeniden-deneme
- Ö12. App Store'a geçiş bağlantısı (TestFlight'taki iPhone): yalnız gönderilmemiş kayıt yokken. plan.html#dagitim (Kalıcı yol)
- Ö13. QR okutma (Aşama 2): yalnız canlı kamera, 2x yakınlaştırma (bkz. 5). plan.html#asama23-okutma
- Ö14. Yedek kod girişi (Aşama 2): 6 rakam. plan.html#asama23 (Yedek kod)
- Ö15. Bluetooth taraması (Aşama 3): en çok 30 saniye, ekran açık; konum ve Bluetooth açma istekleri; iPhone'da geçici kesin konum izni. plan.html#asama23, plan.html#asama23-gps

### Telefon, iki modda ortak

- O1. Güncelleme ekranı: en düşük sürümün altında; yeni yoklama kaydı alınmaz, makbuzlar ve bekleyen gönderim çalışır. plan.html#dagitim-guncelleme-ilkesi
- O2. Hesap silme: "hesabımı sil"; neyin silinip neyin kaldığını, nedenini, süresini yazar. plan.html#kararlar-hesap-silme
- O3. Çıkış: öğrencide gönderilmemiş kayıt varken yapılamaz; hocada indirilen listeler silinir. plan.html#kararlar-ogrenci-telefonu, plan.html#kararlar-indirme
- O4. Hata ekranı: ekran hata sınırları; görünümü yazılmamış (belgede belirsiz). teknik.html#telefon-arka-plan

### Telefon, hoca modu

- H1. Hoca kaydı (uygulama ve panel): ad-soyad, bölüm, yalnız @istanbul.edu.tr e-posta; e-postadaki kodla "onay bekliyor". plan.html#kararlar (Hoca kaydı)
- H2. Hoca girişi (uygulama ve panel): e-posta, 6 haneli kod; telefonda oturum en geç 30 gün, bitmeden 3 gün önce yeni kod. plan.html#kararlar (Hoca girişi, Hoca oturumu)
- H3. Oturumlarım: görme ve kapatma; istemcisi yazılmamış (belgede belirsiz). plan.html#kararlar (Hoca oturumu)
- H4. Yoklama süresi (öneri 15 dakika) ve erken kapatma; panelde de var mı yazılmamış (belgede belirsiz). plan.html#hoca
- H5. Kafa sayısı: kayıt sayısı görülmeden girilir, "ders yapıldı" onayı; sonra kayıt sayısı ve aşım işareti. plan.html#kararlar-kafa-sayisi
- H6. "Ders yapıldı mı?": kafa sayısı girilmemiş geçmiş ders; cevaplanmadan dönem sonu çıktısı alınamaz; istemcisi yazılmamış (belgede belirsiz). plan.html#kararlar (Onaysız ders)
- H7. Onay ekranları: Kendi beyanı ve ilk kayıt teyidi toplu onay (doğrulanamayan telefonlar ayrı, işaretli); İncelemede kayıtlar ve sorun bildirimleri gece sıralanır, başlangıçta hoca başına 20. plan.html#kararlar-supheli-kayit
- H8. Hocanın listesi: kayıtlar etiketleriyle, çakışmalar; istemcisi yazılmamış (belgede belirsiz). plan.html#gun-kayit-etiketleri, plan.html#kararlar (Çakışan dersler)
- H9. Rastgele isim: düğme birkaç kişi seçer, "burada değil" işaretlenir; internet ister. plan.html#hile-rastgele-isim
- H10. Elle ekleme ve telafi işaretlemesi: telefona inen sınıf listesinden, internetsiz de. plan.html#kararlar-indirme
- H11. Makbuz QR'ı okutma: yakından, 1x. plan.html#asama23-okutma
- H12. Telefon değişimi onayı: yüz yüze, kimlik görülerek. plan.html#hoca
- H13. Projeksiyon eşleştirme (Aşama 2): eşleştirme QR'ını okutup ders için onay; "bağlı kürsüleri görür, tek dokunuşla keser". plan.html#hoca
- H14. QR gösterme (Aşama 2): internet yoksa hocanın telefonunda. plan.html#asama23-nereden-gosterilir
- H15. Yedek kod gösterimi (Aşama 2): hocanın telefonunda, o öğrenciye. plan.html#asama23 (Yedek kod)
- H16. Bluetooth yayını (Aşama 3): 2 ile 3 dakika, ekran açık. plan.html#asama23

### Web paneli, hoca

- P1. Giriş ve hoca kaydı (H1, H2): "çıkış düğmesi her sayfada"; 1 saat işlemsizlikte ya da en geç 24 saatte oturum biter. plan.html#kararlar (Hoca oturumu)
- P2. Ders ve program: gün, saat, derslik, saatin teori ya da uygulama türü; telafi dersi önceden programa girilir. plan.html#hoca
- P3. Öğrenci listesi: yükleme, ekleme, çıkarma (pasif olur); "Değişiklikler uygulanmadan önce gösterilir"; sonradan eklenen öğrencide seçim. plan.html#hoca-liste-yukleme, plan.html#devam
- P4. Devamdan muaf: açma kapama anahtarı, altında yardım satırı. plan.html#devam
- P5. Raporlar: ders, öğrenci, tarih aralığı; yalnız Excel indirilir. plan.html#hoca
- P6. Baskı görünümü: rapor ve AKSİS özeti; üstte ders, tarih aralığı ve "geçici" durumu. plan.html#hoca
- P7. Düzeltmeler: sebep kodu, belge numarası, saat türü, saat sayısı; serbest metin yok. plan.html#devam
- P8. Onay listeleri ve sorun bildirimleri. plan.html#hoca
- P9. AKSİS özeti: teori ve uygulama ayrı sütunlarda toplam, devam yüzdesi, DEVAMLI/DEVAMSIZ; tek Sonuç sütunu. plan.html#devam
- P10. "sonradan değişenler" listesi. plan.html#kararlar-gonderme-suresi
- P11. KARAR BEKLİYOR öğrencilerin listesi, son ders gününden itibaren. plan.html#devam-donem-sonu
- P12. Projeksiyon sayfası (Aşama 2): eşleştirme kodu QR'ıyla; onaydan sonra "yalnız QR'ı, düğmeyle açılan tam ekranda gösterir", 5 saniyede bir değişir; "bağlantı bekleniyor"; ekran açık tutulur. plan.html#asama23-nereden-gosterilir, plan.html#hoca
- P13. Hesap silme web adresi: hoca e-posta koduyla başlatır; öğrenciye uygulamadaki yolu ya da hocasına başvurmayı yazar. plan.html#kararlar-hesap-silme
- P14. Panel ana sayfası: içeriği yazılmamış (belgede belirsiz). teknik.html#sunucu (Loglar ve izleme)

### Web paneli, yönetici

- Y1. Hoca onayı (tek tek) ve yönetici ekleme. plan.html#hoca
- Y2. Birim takvimi: dönem tarihleri, ekle-bırak bitişi, tatil ve sınav haftaları, devamsızlık işleme son günü. plan.html#hoca
- Y3. Dönem sonu kilidi. plan.html#devam-donem-sonu
- Y4. Devam oranları: teori ve uygulama için ayrı p. plan.html#hoca
- Y5. Bir hesabın bütün oturumlarını kapatma. plan.html#kararlar (Hoca oturumu)

### Uygulama dışı yüzeyler

- D1. E-postalar: giriş kodu, giriş bildirimi, "onay bekliyor"; bağlantı yok, yalnız kod. plan.html#kararlar-e-posta-gonderimi
- D2. Gizlilik politikası sayfası. plan.html#dagitim-gizlilik-politikasi

## 3) Ana akışlar

### 3.1 Öğrenci yoklaması (plan.html#gun)

1. Önceden, internet varken dersler ve saat belgesi iner.
2. Pencere İstanbul saatiyle açılır; "telefonun saat dilimi hiç kullanılmaz" (plan.html#kararlar (Yoklama penceresi)).
3. "Yoklamamı ver": kayıt imzalanır, kalıcı yazılınca "Telefonda kayıtlı" görünür (teknik.html#telefon-yerel-veri); ilk yoklamadan hemen sonra Ö8.
4. İnternet varsa gider: "Sunucuya ulaştı", sonra karar. Yoksa açılışta, internet gelince ve arka planda (garantisiz) denenir; Ö7 ve Ö9 devreye girer (plan.html#kararlar-gonderme).
5. Süre dolunca düğme kapanır. Süre seçilmemiş derste pencere ders boyunca açık, kayıt Kendi beyanı.
6. Gönderimi reddedilen kayıt sunucuya ulaşmadığından "Telefonda kayıtlı, gönderilmedi" kalır; yol makbuz QR'ı (3.3), o da reddedilirse hoca "beyana dayalı" kodla düzeltir (plan.html#kararlar-yeniden-deneme).

Aşama 2'de QR (Ö13) ya da yedek kod (Ö14), Aşama 3'te ayrıca Bluetooth (Ö15); "Yoklamamı ver" ile ilişkisi yazılmamış (belgede belirsiz).

### 3.2 Hocanın dersi ve QR

1. Önceden, internet varken liste, program ve yoklama süresi (plan.html#gun).
2. Aşama 1'de başlatma yok, pencere kendiliğinden açılır. Süre değişir ya da erken kapanırsa internetsiz telefonlar bilemez, kayıtlar beklemede (plan.html#kararlar (Ders içinde değişiklik)).
3. Derste H9, H10, H11. Ders sonunda kafa sayısı (H5); aşım işareti derste çıkarsa bütün liste okunur.
4. Sonra onay ekranları (H7). Hedef: ders başına en çok 2 dakika (plan.html#hedefler).

Aşama 2: P12 eşleştirme kodunu QR'ıyla gösterir, hoca okutup onaylar (H13), sayfa tam ekranda QR gösterir; internet yoksa H14; okutamayana H15 ya da elle ekleme. Kod ikinci kez kullanılırsa projeksiyon kapanır, hocaya bildirilir (plan.html#asama23-nereden-gosterilir).

### 3.3 Makbuz (plan.html#kararlar-kayit-ve-makbuz)

Öğrenci makbuz QR'ını gösterir (Ö4), hoca okutur (H11); hocanın telefonu kaydın kendi dersine ait olduğunu denetler. Sunucu öğrencinin imzasını doğrular; sonuç düzeltme değil normal kayıttır, ulaşmış kayıtta "zaten var". Öğrencinin telefonu eşitleyince makbuz "Sunucuya ulaştı" olur.

### 3.4 Düzeltme (plan.html#gun-son-durumlar)

Öğrenci sorun bildirir (Ö6). Hoca sebep kodu seçer (P7); belge numarası yalnız Görevli ve Belgeli düzeltmede zorunlu; rapora dayanan düzeltmede saat türü yalnız teori; blok derste saat sayısı seçilir. Kim, ne zaman, neden kaydedilir; seviye yeniden hesaplanır, öğrenciye bildirilir.

### 3.5 Devamsızlık uyarısı (plan.html#devam-uyari-seviyeleri)

Teori ve uygulama ayrı; uyarı yalnız seviye değişince, birden çok seviyede yalnız en yüksek. Yerel bildirim, ders ve tür başına tek, yenisi eskisinin yerine (teknik.html#telefon-arka-plan). Push yok, uygulama açılana kadar gecikebilir. "Muaf öğrenciye hak uyarısı gitmez."

### 3.6 Güncelleme gerekli (plan.html#dagitim-guncelleme)

Sürüm günde en çok bir kez, açık pencere ve gönderim dışında sorulur. En düşük sürümün altında O1 açılır; Play, App Store (denemede TestFlight) ya da GitHub bağlantısını açar. En düşük sürüm yalnız dönem arasında yükselir. Uzaktan güncelleme sonraki açılışta devreye girer, uygulama kendini yeniden başlatmaz.

### 3.7 Hesap silme (plan.html#kararlar-hesap-silme)

"hesabımı sil" (O2): bekleyen kayıt ya da iş varsa silme sıraya girer, "ekranda bu yazar". Web yolu: P13. Silinen öğrenci listede kalır, yeni kayıt gönderemez; silinen hocanın dersleri arşivlenir.

### 3.8 İlk açılış ve kayıt

Öğrenci (plan.html#kararlar (Öğrenci kaydı, Öğrenci girişi)): internet varken numara ve isim; sunucu Türkçe kuralla eşleştirir ("IŞIK ile ışık eşleşir; Sahin ile Şahin eşleşmez, hoca onayına düşer"); telefon hesaba bağlanır; sonra giriş yok. Çıkış ya da silip yeniden kurma değişim sayılır, cihaz değişimi akışı başlar (plan.html#kararlar-ogrenci-telefonu).

Hoca (plan.html#kararlar (Hoca kaydı, Hoca girişi)): başvuru, e-posta kodu, "onay bekliyor", yönetici onayı (Y1); sonra her girişte kod: 5 dakika geçerli, tek kullanımlık, 3 yanlışta geçersiz. "Kod isteğine her durumda aynı cevap, aynı hızda". Aynı adrese dakikada 1, saatte 5, günde 10 kod; yanlışta bekleme uzar, kendiliğinden kalkar. Her girişte bildirim e-postası; en fazla 3 cihaz.

## 4) Durumlar ve etiketler

- Son durumlar (plan.html#gun-son-durumlar): Var, Yok, Görevli, Belgeli düzeltme, Elle eklendi; ders düzeyinde Devamdan muaf. Rapor harfleri: V, Y, G, B, E, M.
- Sebep kodu: görevlendirme, Görevli; öğrenci işlerinin yazısı ya da kurul kararı, Belgeli düzeltme; beyana dayalı, "telefonu yok ya da çalışmıyor", "QR okutamadı", Elle eklendi; "yoklamada sınıfta değil", Yok.
- Sunucu kararları: Var, Beklemede, İncelemede, Ret; gerekçe koduyla (plan.html#gun-kayit-etiketleri).
- Kayıt etiketleri, birden çok olabilir: QR'sız, Kendi beyanı, Saat doğrulanamadı, Cihaz doğrulanmadı, İkinci profil, Yedek kodlu, Doğrulanmış (son ikisi Aşama 2). "Sayımı etiket değil sunucu kararı belirler."
- Uyarı seviyeleri (plan.html#devam-uyari-seviyeleri): 1 "Hakkının yarısını kullandın." 2 "Bir ders daha kaçırırsan hakkın biter." (kalan hak sonraki oturumun saatinden azsa "Bir ders daha kaçırırsan devamsız kalırsın") 3 "Hakkın kalmadı." 4 "Hakkını aştın. Kesin durum AKSİS'te ilan edilir."
- AKSİS özeti (plan.html#devam): DEVAMLI, DEVAMSIZ, "DEVAMLI (muaf)", "KARAR BEKLİYOR", çıktı "geçici"; yüzde aşağı yuvarlanır, tek ondalık ("ör. 69,5").
- İşaretler: kafa sayısını "3 kişiden ve %5'ten fazla" aşan ders; 2'lik ortak sınırı aşan kayıt İncelemede (plan.html#hile-otomatik-kabul-kurali).
- Bağlantı ve hesap: makbuz durumları (Ö3), "kayıtların bir kısmı henüz gelmemiş olabilir", "bağlantı bekleniyor", "Bluetooth yok", "konum yok", "onay bekliyor".
- Yazılı metinler: "Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez." ve "Sen değilsen Oturumlarım ekranından kapat". Beklenmeyen hatada "istemciye yalnız genel mesaj ve istek kimliği döner" (teknik.html#sunucu); aşırı yükte 503, Retry-After (teknik.html#sunucu-guvenlik). Başka hata metni yazılmamış (belgede belirsiz).

## 5) Var olan tasarım ve erişilebilirlik kararları

Çapası yazılmayanlar plan.html#hoca.

- "Panel ve telefonda hedef WCAG 2.2 AA."
- "Ayrı yazı boyutu ve kontrast ayarı yok"; "renkler baştan yeterli kontrastlı (yazıda en az 4,5:1)".
- "Panel yalnız klavyeyle de kullanılır", "tıklanan öğeler en az 24 piksel", "e-posta kodu alanında yapıştırma ve otomatik doldurma açık"; telefon için yazılmamış (belgede belirsiz).
- "E-posta alanında otomatik büyük harf kapalı" (plan.html#kararlar (Hoca girişi)).
- "Panel Türkçe dil ve Türkçe biçimle çalışır"; harf, sıralama, tarih ve sayı işleri açıkça tr yerel ayarıyla (teknik.html#panel-cati). Telefonun dili ve tarih biçimi yazılmamış (belgede belirsiz).
- "Tarih ve saatler her zaman İstanbul saatiyle (Europe/Istanbul), Türkçe biçimle gösterilir".
- Öğrenci numarası metin, başı 0 olabilir (plan.html#hoca-liste-yukleme); isimler Türkçe kuralla sıralanır (teknik.html#veritabani).
- Ekran açık: projeksiyonda Screen Wake Lock; telefonda expo-keep-awake (teknik.html#telefon-arka-plan); Aşama 3'te hoca ve öğrenci ekranı (plan.html#asama23).
- "QR açık zeminde koyu karelerle çizilir; panelin koyu teması QR'a uygulanmaz." (plan.html#asama23). Koyu tema yalnız burada geçer (belgede belirsiz).
- Yoklama QR'ı: "kareler büyük, uzaktan okunur" (plan.html#asama23); "her yanında dört kare boş kenar". Makbuz QR'ı "kareler düz görünümlerle", sürüm 17 ile 21 (teknik.html#telefon-kamera-qr).
- "Kamera ana (1x) kamerayla açılır (0,5x geniş açı kamerası açılmaz)" (plan.html#asama23-okutma).
- "Hazır arayüz kütüphanesi yerine tarayıcının kendi öğeleri (düğme, tablo, form, dialog, tarih kutusu)." (teknik.html#panel-cati)
- Baskıda sayfa numarası şart değil. Excel'de numara ve isimler metin, formül yok (plan.html#hoca), başta harf açıklaması (plan.html#gun-son-durumlar); "renk ve kalın yazı gerekmez" (teknik.html#panel-excel).
- Mağaza: "yoksa işi anlatan nötr ad ve simge" (plan.html#dagitim (Ad ve logo)).
- Denetim: TalkBack, VoiceOver, yalnız klavye, Lighthouse (teknik.html#testler-kalite).
- Belgelerin kendi koyu görünümü ürün kararı değil. Yazı tipi, simge, renk paleti ve hareket kararı yok.

## 6) Arayüzü etkileyen teknik çerçeve

- Telefon: Expo SDK 57 (React Native 0.86, React 19.2); 58 beta (React Native 0.88 sürüm adayı, React 19.3); başlarken en güncel kararlı SDK; sayfalar Expo Router ile (teknik.html#telefon).
- En düşük sürüm: Android 7 (minSdk 24), iOS 16.4 (plan.html#dagitim-desteklenen-surumler).
- Kamera ve QR: expo-camera (Android'de ML Kit), launchScanner yok; QR çizimi telefonda ve panelde saf JavaScript qrcode (teknik.html#telefon-kamera-qr).
- Yerel veri: expo-sqlite; "Bütün ekranlar yerel veritabanından okur"; hoca modunun birkaç ekranı internet ister (teknik.html#telefon, Sunucu verisi).
- Arka plan ve bildirim: expo-background-task (garantisiz), expo-network, expo-notifications (yalnız yerel) (teknik.html#telefon-arka-plan). Uzaktan güncelleme: expo-updates, xprem.
- Panel: React 19, Vite 8, TanStack Router 1, TanStack Query 5, SheetJS; stil yöntemi seçilmemiş (belgede belirsiz). Hedef Chrome ve Edge 111, Firefox 114, Safari 16.4; kürsüde Chrome 109 olabilir (teknik.html#panel-cati).
- Baskı tarayıcıdan PDF (teknik.html#panel-excel). Titreşim (haptics) yazılmamış.

## 7) Kısıtlar

- Cihaz: Türkiye'de Android %77, iPhone %23 (plan.html#benzer); Google servissiz telefonlar (plan.html#dagitim), 32 bit telefonlar (teknik.html#dagitim-ayrinti-derleme); ucuz telefonda kamera karesi 720p'ye yakın (teknik.html#telefon-kamera-qr); eski Android'de Intl farklı davranır (plan.html#kararlar (Öğrenci kaydı)).
- Hız: Aşama 2'de 100 kişilik sınıfta %90 katılıma en çok 120 saniye; QR en arka sırada en ucuz Android ve en eski iPhone ile 5 saniye içinde okunur (plan.html#hedefler).
- Bağlantı: sınıfta internet olmayabilir; bodrum kapsaması bilinmiyor (plan.html#acik); kampüs ağının giriş sayfası başarısız sayılır (plan.html#kararlar-gonderme).
- Sınıf: küçük QR arka sıradan okunmuyor (plan.html#asama23-nereden-gosterilir); ortak kürsü bilgisayarı (plan.html#kararlar (Hoca oturumu)); Windows ekranı karartır (plan.html#hoca). Güneş ışığı belgelerde yok.
- Gizlilik: öğrenci telefonuna "başka öğrencinin adı ya da numarası hiç inmez" (plan.html#kararlar-indirme).
- Dil: Türkçe (bkz. 5). Dönem ortasında zorunlu güncelleme yok (plan.html#dagitim-guncelleme-ilkesi).

## 8) Ekranda görünecek terimler

- Sözlükten (plan.html#sozluk): Pencere, Sayaç (geri sayım), Oturum (ders ve giriş, iki anlam), Makbuz, Kafa sayısı, Kendi beyanı, İncelemede, Gönderme, Uzaktan güncelleme, Cihaz doğrulaması. İç sayaç, saat belgesi, çapa, İmleç ve veritabanı nesli iç terimdir, ekrana çıkmaz.
- Envanterdeki adlara ek olarak metinden: kürsü, ders yapıldı, telafi dersi, blok ders, teori, uygulama, kalan hak, sebep kodu, belge numarası, ilk kayıt teyidi, cihaz değişimi, dönem kilidi, Haksız devamsız (dönem sonu raporu), birim, derslik, şube, ekle-bırak, makbuz QR'ı, yedek kod, eşleştirme kodu.

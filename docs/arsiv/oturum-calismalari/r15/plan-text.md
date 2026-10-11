İÜ Yoklama Planı

# İÜ Yoklama

Telefonla çalışan, internetsiz de yoklama alabilen ders yoklama uygulaması.

Plan ve kararlar · Son güncelleme 4 Ekim 2026

Tek bakışta 
Kararlar 
Yoklama günü 
Aşama 2 ve 3 
Hile ve sınırlar 
Benzer sistemler 
Devamsızlık 
Hoca ve yönetici 
Dağıtım 
Teknolojiler 
Başlangıç 
Hedefler 
Açık noktalar 
Kaynaklar 

## Tek bakışta

- Ne yapar: Öğrenci ders saatinde telefonundan yoklama verir. Kayıt telefonda saklanır, internet bulununca sunucuya gider.

- Kim kullanır: Öğrenci ve hoca aynı telefon uygulamasını kullanır (öğrenci modu, hoca modu). Hoca ve yönetici ayrıca her tarayıcıda açılan web panelini kullanır.

- Temel kural: Yoklama anında telefonda internet olmayabilir. Çıta: kâğıt imzadan iyi ve basit.

- Neden internetsiz: Türkiye'deki yoklama uygulamalarının en sık şikâyeti "derse gelip yok yazılmak": giriş hataları ve kampüste çekmeyen internet. İnternetsiz kayıt alıp sonra gönderen bir ürün araştırmada bulunamadı; yaklaşım yeni olduğu için erken ve geniş denenir.

- AKSİS: Otomatik bağlantı yok. Hoca "AKSİS özeti" ekranına bakıp değerleri elle girer.

- Dağıtım: Android için GitHub'daki APK. iPhone için deneme döneminde TestFlight, kalıcı olarak listelenmeyen App Store bağlantısı.

- Geliştirme: Önce sunucu ve davranış testleri, sonra telefon ve panel.

Şimdi

### Aşama 1 · Temel sistem

QR yok. Ders saatinde yoklama kendiliğinden açılır, saat değiştirmek işe yaramaz. Sınıfta olma kanıtı henüz yok.

Sonra

### Aşama 2 · QR

Hoca 5 saniyede bir değişen QR'ı projeksiyondan gösterir. QR'ı okutan öğrencinin sınıfta olduğu doğrulanır.

Sonra

### Aşama 3 · Konum

Bluetooth ile sınıfa yakınlık, GPS ile bina civarı kontrolü. Referans hocanın telefonu.

## Kararlar

### Hesaplar ve giriş

Roller
Yönetici ve hoca. İlk yönetici benim, bölüm başkanını sonra kaydettiririm; diğer yöneticileri o ekler. Asistan ve ortak hoca rolünü sonra ekleyeceğim.

Hoca kaydı
Hoca uygulamadan ya da panelden ad-soyad, bölüm ve kurumsal e-postasıyla kayıt formunu doldurur; hesap "onay bekliyor" olarak açılır. Yönetici tek tek onaylar. Onaydan önce giriş yapılamaz.

Hoca girişi
E-postaya 6 haneli kod gelir: 5 dakika geçerli ve tek kullanımlık, 3 yanlış denemeden sonra yeni kod gerekir. Kod veritabanında açık değil özet olarak tutulur; bir adrese gönderilebilecek kod sayısı sınırlıdır. Oturum açık kalır ama en geç 30 günde bir yeniden kodla girilir. En fazla 3 cihaz.

Öğrenci kaydı
Öğrenci numarası ve okuldaki kayıtlı isim, hocaların yüklediği listelerle eşleşir (Türkçe harf duyarlı: I/ı, İ/i). E-posta, şifre ve TC kimlik numarası yok. Eşleşmezse hoca onaylar. Öğrenci henüz hiçbir listede yoksa kayıt bekler, liste yüklenince kendiliğinden eşleşir.

İlk kayıt teyidi
Öğrencinin derslerinden herhangi birinin hocası bir kez, toplu olarak teyit eder. Aynı numarayı iki kişi isterse hoca karar verir. Teyide kadar öğrenci yoklama verebilir, kayıtları beklemede kalır. Gerekirse hocanın verdiği tek kullanımlık kayıt koduna geçilir.

Cihaz doğrulaması
Kayıtta telefonun gerçek ve uygulamanın değiştirilmemiş olduğu Google (Play Integrity) ya da Apple (App Attest) üzerinden doğrulanır. Telefonun gizli anahtarı güvenli donanımında üretilir ve dışarı çıkmaz. Google servisleri olmayan telefonlarda (ör. Huawei) doğrulama yapılamaz; bu telefonlar hoca teyidiyle kabul edilir ve kayıtları işaretlenir. İlk sürümlerde yazılım anahtarı da kabul edilir, bu kayıtlar da işaretlenir.

Öğrenci girişi
Yalnız ilk kayıtta. Sonra şifre ya da giriş yok, telefona bağlı gizli anahtar yeter.

Öğrenci telefonu
Her öğrenci hesabı tek telefona bağlı. Telefon değişimi ya da kaybı yüz yüze, kimlik görülerek hoca onayıyla yapılır. Çıkış yapmak ya da uygulamayı silip yeniden kurmak cihaz değişimi sayılır. Gönderilmemiş kayıt varken çıkış ve hesap silme yapılamaz.

Geliştirme e-postası
Geliştirirken e-postalar gerçek adrese gitmez, yerel bir test posta kutusunda (Mailpit) toplanır. Böylece yayın sürümüne özel bir "kodu göster" ayarı gerekmez.

### Yoklama Aşama 1

Yoklama penceresi
Ders saatinde kendiliğinden açılır. Hoca dersin ayarlarında süre seçtiyse o kadar açık kalır (öneri 15 dakika, örnek 09:00–09:15) ve sayaç bitince kapanır.

Süre seçilmediyse
Pencere ders boyunca açık kalır ve kayıtlar "kendi beyanı" olur. Süre seçilmemesi yoklamanın takip edilmediğini gösterebilir, bu yüzden hoca bu kayıtları toplu onaylar.

Ders içinde değişiklik
Hoca süreyi değiştirir ya da yoklamayı erken kapatırsa internetsiz telefonlar bunu bilemez. Kayıtlar beklemede kalır, son kararı sunucu hocanın ayarına göre verir.

Kafa sayısı
Hoca ders sonunda yaklaşık kafa sayısını girer; kayıt sayısını sayıyı girdikten sonra görür. Bu aynı zamanda "ders yapıldı" onayıdır. Kayıt sayısı kafa sayısını 3 kişiden ve %5'ten fazla aşarsa ders işaretlenir; hoca isterse isim okuyarak kontrol eder.

Onaysız ders
Kafa sayısı girilmemiş geçmiş ders için hocaya "Ders yapıldı mı?" diye sorulur. Cevaplanmadan dönem sonu çıktısı alınamaz. Yapılmadı denen dersin kayıtları ve saatleri hesaba girmez.

Telafi dersi
Önceden programa girilir. Aynı gün girilirse internetsiz telefonlar haberdar olamaz; o derste hoca öğrencileri listeden işaretler.

Geç gelen
Pencere açıkken gelen "var" sayılır.

Blok ders
Tek yoklama dersin bütün saatlerini sayar.

Çakışan dersler
Öğrenci aynı saatte yalnız bir derse yoklama verebilir; çakışma hocalara gösterilir. Çift anadal ve yandal dersleri kendi listeleriyle ayrı tutulur.

Birlikte işlenen şubeler
Tek yoklama ve tek kafa sayısı (böyle şube varsa).

### Kayıt ve gönderme

Kayıt ve makbuz
Telefon kaydı imzalar ve saklar. Öğrenci iki durumu açıkça görür: "Telefonda kayıtlı, gönderilmedi" ve "Sunucuya ulaştı". Sunucunun kararı (var, incelemede) ayrıca görünür.

Gönderme
Yoklama verildiği anda, uygulama açılınca, internet gelince ve fırsat buldukça arka planda denenir. Arka plan garantili değildir: Android en sık 15 dakikada bir dener, iPhone'da zamanı sistem seçer. Kayıtlar sırayla, en çok 200'lük paketlerle gider ve her kayıt için ayrı sonuç döner: kabul, zaten var, ret, tekrar dene.

Yeniden deneme
Başarısız gönderim 2 saniyeden 10 dakikaya kadar artan, rastgele kaydırılmış aralıklarla yeniden denenir. Ders çıkışında herkes aynı anda göndermesin diye ilk deneme de birkaç saniye kaydırılır. Gönderilemeyen kayıt için günde bir yerel hatırlatma çıkar.

İndirme
Program ve listeler "şu sürümden beri değişenler" diye çekilir; telefonun saati kullanılmaz. Silinen kayıtlar silindi işaretiyle iner.

Gönderme süresi
En geç 7 gün. Sonra gelen geçerli kayıt kabul edilir ve "sonradan değişenler" listesine düşer.

Şüpheli kayıt
"İncelemede" kalır, hoca onaylayana kadar sayılmaz. Sorular dönem sonunda yığılmasın diye her gece aşamalı sorulur.

Öğrencinin ekranı
Öğrenci kendi kayıtlarını, durumlarını ve her ders için kalan hakkını görür. Türkiye'deki uygulamalarda en çok istenen özellik bu.

Sorun bildir
Öğrenci bir dersin yoklamasında sorun yaşarsa 3 gün içinde uygulamadan bildirir; bildirim hocanın listesine düşer. Her düzeltme kim, ne zaman ve neden bilgisiyle kaydedilir.

Bildirim
Yalnız telefonda yerel bildirim (hak uyarısı, gönderilmemiş kayıt). Push sonra.

Ölçüm
Uygulama kendi olay kaydını tutar: gönderme oranı, saati doğrulanamayan oran, işaretli oran. Üçüncü taraf analitik yok.

Ortak kurallar
Hak hesabı, uyarı seviyeleri, saat ve işaretleme kuralları tek ortak kod paketinde yazılır. Telefon, sunucu ve panel aynı kuralı aynı testlerle kullanır.

## Yoklama günü Aşama 1

### Önceden, internet varken

- Hoca öğrenci listesini yükler. Dersin programını (her saatin teori mi uygulama mı olduğu dahil) ve yoklama süresini ayarlar.

- Öğrenci numara ve isimle kayıt olur, telefonu doğrulanıp hesabına bağlanır. Dersleri, saatleri ve yerleri telefona iner. Telefon sunucudan saat belgesini alır.

### Derste, internet olmasa da

- Ders saati gelince yoklama kendiliğinden açılır ve sayaç başlar.

- Öğrenci "Yoklamamı ver"e basar. Telefon kaydı imzalayıp saklar, öğrenci "Telefonda kayıtlı" makbuzunu görür.

- Süre dolunca düğme kapanır.

- Hoca ders sonunda kafa sayısını girer; ders yapıldı onayı da böylece verilmiş olur (hedef: ders başına en çok 2 dakika).

### Sonra, internet bulunca

- Telefon kaydı gönderir, makbuz "Sunucuya ulaştı" olur. Sunucu kontrol eder: geçerli kayıt "var" olur, şüpheli kayıt "incelemede" kalır.

- Hoca kendi beyanı kayıtlarını ve yeni kayıtları toplu onaylar, şüphelileri ve sorun bildirimlerini inceler.

### Saati değiştirmek neden işe yaramaz?

- Telefon internetteyken sunucudan imzalı bir saat belgesi alır ve o anki iç sayaç değerini yanına yazar.

- Yoklama anında gerçek saat = saklanan saat + o andan beri geçen süre. Geçen süreyi telefonun iç sayacı ölçer; bu sayaç ayarlardan değiştirilemez ve telefon uykudayken de işler.

- Her kayıt bu saat belgesini taşır. Böylece kaydın en erken ne zaman verilebileceği kanıtlanır; en geç zamanı da sunucuya ulaştığı an belirler. Sunucuya ulaştığı andan sonrasını gösteren kayıt reddedilir.

- İç sayacın kayması için pay bırakılır: 2 saniye + geçen sürenin milyonda 100'ü (haftada yaklaşık 1 dakika). Belge en çok 7 günlük olabilir.

- Pencere ve sayaç telefonun saatine değil bu hesaplanan saate göre çalışır. Telefonun kendi saati yalnız not düşülür.

- Uygulama her açıldığında ve ağ değiştiğinde, internet varsa, saat belgesini yeniler.

Zayıf nokta: yeniden başlatma. Telefon yeniden başlayınca iç sayaç sıfırlanır. Android bunu açılış sayısından anlar; telefon açıldıktan sonra bir kez internete çıktıysa Google'ın güvenilir saat servisiyle saati yeniden kurabilir. iPhone yeniden başlatmayı bir sistem işaretinden anlar. Saat kurulamazsa kayıt "saat doğrulanamadı" olur; bunlardan her öğrenci için her derste dönem başına en çok 2 tanesi otomatik kabul edilir, fazlası hocanın incelemesine düşer. Aşama 2'de QR'ın zaman dilimi de saat kanıtı olur.

### Kayıt etiketleri

QR'sız
Aşama 1'deki her kayıt. Sınıfta olduğu doğrulanmamıştır.

Kendi beyanı
Süre seçilmemiş derste verilen kayıt. Hoca onayı ister.

Beklemede
Teyidi gelmemiş öğrencinin kaydı ya da ders içinde ayarı değişen dersin kaydı.

İncelemede
Şüpheli kayıt. Hoca onaylayana kadar sayılmaz.

Saat doğrulanamadı
Yeniden başlatma yüzünden saat kurulamadı. Yukarıdaki 2'lik sınır geçerli.

Cihaz doğrulanmadı
Cihaz doğrulaması yapılamamış telefondan gelen kayıt (yazılım anahtarı ya da Google servisleri olmayan telefon).

Doğrulanmış
QR ile alınan kayıt (Aşama 2'den itibaren).

### Son durumlar

Her oturum için öğrencinin son durumu: Var, Yok, Görevli, Belgeli düzeltme ya da Elle eklendi. Ders düzeyinde ayrıca Muaf vardır.

Kenar durumlar

- Öğrenci hiç göndermiyor: Devamsız görünür. Makbuz QR'ını gösterirse hoca telefonuyla okutup düzeltir. Gösteremezse düzeltme "beyana dayalı" sebep koduyla yapılır.

- Telefonu yok ya da şarjı bitik: Hoca öğrenciyi elle ekler.

- Telefon göndermeden kayboldu: Kayıt kaybolur. Hoca "beyana dayalı" kodla düzeltir.

- Program değişti (iptal, telafi): Değişiklik internet varken telefona iner. İnternetsizken eski program geçerlidir, son karar sunucuda verilir.

- Cihaz değişimi sırasında eski telefonda bekleyen kayıt: Değişim onaylanınca birlikte karara bağlanır.

- Uygulama silindi: Gönderilmemiş kayıtlar gider ve anahtar kaybolur. Yeniden kurulum cihaz değişimi akışıyla yapılır.

## Aşama 2 ve 3

### Aşama 2 · QR Sonra

- Nereden gösterilir: Öncelik projeksiyon. Hoca telefonundan o ders için kısa süreli bir eşleştirme kodu açar; kürsü bilgisayarındaki panel bu kodla yalnız o dersin QR'ını sunucudan alıp tam ekran gösterir ve ders bitince kapanır. Bilgisayarda hocanın hesabı açılmaz. Kürsüde internet yoksa hocanın telefonu QR'ı internetsiz üretir. Türkiye'de amfilerde küçük QR'ın arka sıralardan okunmadığı görüldü.

- Değişme ve kabul: QR 5 saniyede bir değişir; şimdiki ve bir önceki kod kabul edilir. Saati doğrulanmış kayıtta QR ile okutma arasındaki fark 10 saniyeye kadar normal sayılır, 10–30 saniye işaretlenir, 30 saniyeden fazlası reddedilir. Bunlar başlangıç değerleri, denemeyle ayarlanır. Başka okullarda 15–30 saniyelik kodlar mesajla paylaşıldı.

- Okutma: Yalnız canlı kamerayla; galeriden resim seçilemez, web'den yoklama yok. Kamera varsayılan geniş lensle açılır (0,5x açılmaz); 2x yakınlaştırma telefonun en büyük yakınlaştırma değerinden hesaplanır.

- QR boyutu: İçerik kısa tutulur, en küçük QR sürümü ve düşük hata düzeltme seçilir; kareler büyük olur ve uzaktan okunur. Bu yüzden QR'da dijital imza değil kısa bir doğrulama kodu (MAC) kullanılır; imza QR'ı büyütür.

- Anahtar: QR internetsiz de üretilebilsin diye hocanın telefonu internetteyken önümüzdeki 5 günün anahtarlarını indirir. Anahtar hocanın cihazına özeldir. Sunucu sahte ya da eski QR'ı ayırt eder.

- Saat kanıtı: QR'ın zaman dilimi, saati doğrulanamayan kayıtlar için de kanıt olur.

- QR'sız kayıtlar ayrı kalır, hoca isterse onaylar. QR okutamayan öğrenci için kısa bir yedek kod vardır; hoca öğrenciyi elle de ekleyebilir.

- Hocanın telefonunun saati yanlışsa ders işaretlenir. Aynı ders için yoklama iki kez başlatılırsa kayıtlar tek oturumda birleşir.

### Aşama 3 · Konum Sonra

- Bluetooth: Hocanın telefonu 10–15 saniyede bir değişen kısa bir kodu, servis kimliğinin içinde yayar. İnternet gerekmez. Öğrenci telefonu 2–3 dakikalık bir pencerede tarar ve sinyal gücünü kaydeder. Sinyal duvarı geçip koridora taştığı için duvar gibi kullanılmaz; öğrencilerin %2–5'inin kaçırılması beklenir ve elle düzeltilir.

- Sınırlar: iPhone yayına yalnız bir isim ve servis kimliği koyabilir (28 bayt) ve arka planda yayın kısıtlanır; hoca uygulaması yoklama boyunca açık, ekranı açık kalır. Telefonun yayın desteği önceden kontrol edilir. iBeacon kullanılmaz, çünkü iPhone'da algılanması için konum izni gerekir. Android 12 ve üstünde yalnız Bluetooth izni, Android 11 ve altında konum izni ve açık konum gerekir. Sınıfta bırakılan bir telefonla canlı aktarma engellenemez.

- GPS: Yalnız yoklama anında okunur, sürekli izlenmez. "Bina civarında mı" sorusunu cevaplar; referans hocanın telefonudur. Sınıfın konumu öğrenci telefonuna gönderilmez; başka bir üründe bu bilgi sızdı ve sahte konumla kullanıldı. Kapalı alanda onlarca metre sapabilir, tek başına kullanılmaz.

- Sahte konum: Android'in sahte konum işareti ve iPhone'un yazılım simülasyonu işareti zayıf sinyal olarak kaydedilir. iPhone'un işareti yalnız Apple'ın kendi simülasyonunu yakalıyor, sahte konum uygulamalarını yakalamıyor; kökü açılmış Android'de işaret gizlenebiliyor. Sunucu imkânsız yer değiştirmeleri ayrıca kontrol eder.

- Bluetooth ya da GPS hiçbir zaman tek yöntem olmaz; QR ve yedek kod her zaman durur.

## Hile ve sınırlar

Kâğıt imzada bu hilelerin çoğunun karşılığı da var. Hedef kâğıttan iyi olmak.

### Engellenir

- Telefonun saatini değiştirmek (yeniden başlatma hariç, o işaretlenir)

- Başka telefona bağlı hesabı kullanmak

- Tek telefondan birden çok hesaba yoklama vermek

- Galerideki QR resmini okutmak (yalnız canlı kamera)

- Listesinde olmadığı derse yoklama vermek (sunucu reddeder)

### İşaretlenir ya da sınırlanır

- Başkasının numarasıyla kayıt olmak: hoca teyidi

- Kafa sayısını aşan kayıtlar: ders işaretlenir

- QR'ı mesajla iletmek (Aşama 2): 10 sn'ye kadar normal, 10–30 sn işaretlenir, 30 sn üstü reddedilir

- Yedek kodu iletmek: her derste dönem başına en çok 2

- Değiştirilmiş uygulama ve emülatör: cihaz doğrulamasıyla zorlaşır

- Çalınan hoca anahtarı (Aşama 2): cihaza özel ve 5 gün geçerli

### Önlenemez

- Aşama 1'de evden ya da sınıf dışından yoklama vermek (kafa sayısı yalnız büyük farkı yakalar)

- Canlı aktarım (görüntülü arama, sınıfta bırakılan telefon)

- Arkadaşının telefonunu derse getirmek

- Android'de ikinci profil (Güvenli Klasör)

- Kökü açılmış telefonda sahte konum (Aşama 3)

- Yoklama verip dersten çıkmak (blok derslerde daha ağır)

Aşama 1 tek başına kâğıttan zayıf. Kâğıtta en azından birinin sınıfta imza atması gerekiyor; Aşama 1'de evden basmak yetiyor. Araştırmada kanıtsız sistemlerde en yaygın hile kodun paylaşılması çıktı. Bu yüzden gerçek yoklamaya QR ile (Aşama 2) geçmek gerekiyor.

Otomatik kabul kuralı: Saati doğrulanamayan ve yedek kodla alınan kayıtlardan her öğrenci için her derste dönem başına en çok 2 tanesi otomatik kabul edilir. Fazlası incelemeye düşer. QR okuyamayan öğrenciyi hoca tarafsız bir sebep koduyla elle ekler.

Deneme sınırı: E-posta kodu ve yedek kod için yanlış denemeler sunucuda sayılır ve sınırlanır.

## Benzer sistemlerden dersler

### Dünyada

- İnternetsiz kayıt alıp sonra gönderen bir yoklama ürünü bulunamadı; hepsi yoklama anında internet istiyor.

- Dönen QR süreleri: Edusign 5 sn, Qwickly 3 sn; Moodle 15 sn, Manchester ve Uppsala 30 sn. Manchester'da öğrenciler kodun paylaşılıp derse gelinmediğini açıkça yazdı.

- Konum her üründe zayıf halka: iClicker'da bir hatayla sınıfın konumu sızdı ve sahte konum betikleri yazıldı; Poll Everywhere geniş alan seçmeyi öneriyor.

- Bluetooth: iClicker 2026'da ekledi; Acadly %95–98 yakalama bildiriyor (üretici verisi). 2018'deki bir çalışmada sabit işaretler ucuz bir cihazla kopyalandı.

- Çin'de tek telefondan çok hesaba yoklama veren, konumu ve QR'ı taklit eden açık kaynak hile uygulamaları yaygın.

- Kesintiler dönemin ilk haftasında ve bulut ya da anlık mesaj servisleri çökünce yaşandı. Top Hat, Ohio'da az kullanıldığı ve pahalı olduğu için bırakılıyor.

### Türkiye'de

- En sık şikâyet derse gelip "yok" yazılmak. Sebepler: giriş hataları, kampüste çekmeyen internet (Düzce, UBYS Mobil, Isparta) ve bir güncellemenin Android'de girişi kilitlemesi (Proliz, Mart 2026).

- Amfilerde QR ön sıralardan sonra okunmuyor (Hacettepe); bazı uygulamalar iPhone kamerasını 0,5x açtığı için en ön sırada bile okunamadı.

- Çok kısa QR süresi saat farkıyla hatalı ret üretti ("QR hatalı ya da geçmiş").

- Bluetooth cihaz modeline ve izinlere göre değişiyor; yalnız Bluetooth'a geçen bir sistemde öğrenciler kodu geri istedi.

- Kayıtların kaybolması (Nişantaşı) güveni bitirdi; bir öğrencinin aktarımına göre imzalara dönüldü.

- Her dönem zorunlu yeniden giriş ve zorunlu güncelleme şikâyet konusu.

- QR yoklama 2025'te basında "fişleme" diye eleştirildi.

- İÜ İstanbul Tıp Fakültesi 2018–2021 arasında sabit QR ve Google Formu ile 2 dakikalık bir yoklama denemiş; sonucu bilinmiyor.

- Telefon dağılımı (Türkiye, Eylül 2026): Android %77, iPhone %23.

### Bu yüzden plana girenler

- İnternetsiz kayıt ve açık makbuz durumları ("Telefonda kayıtlı" / "Sunucuya ulaştı").

- QR projeksiyondan, 5 saniyede bir; önceki kod da kabul, gecikmeye göre işaretleme.

- Yalnız canlı kamera, varsayılan geniş lens, kısa QR.

- Tek cihaza bağlı hesap ve cihaz doğrulaması.

- Kafa sayısı, hızlı elle düzeltme ve her değişikliğin kaydı.

- Öğrencinin kendi kayıtlarını ve kalan hakkını görmesi; "sorun bildir".

- Dönem ortasında zorunlu güncelleme ve yeniden giriş yok.

- Konum yalnız Aşama 3'te ve yalnız yoklama anında okunur; Aşama 1 ve 2 konum toplamaz.

## Devamsızlık hesabı

- Kural (Md.19): İlk kez alınan derste teoriye en az %70, uygulamaya en az %80 devam şartı var; ikisi ayrı hesaplanır. Şartı sağlamayan öğrenci sınavlardan önce AKSİS'te ilan edilir.

- Sayım: Ders saati bazında, yapılan dersler üzerinden. Programda her ders saati teori ya da uygulama olarak işaretlidir.

- Görevli (Md.35): Spor, kültür ve sanat etkinliğine görevlendirilen öğrencinin o saatleri devamsızlıktan sayılmaz. Belge numarasıyla girilir.

- Muaf (Md.20): Devamsızlık dışı bir nedenle tekrar alınan derste devam şartı yok. Hoca işaretler.

- Rapor ve izin: Ayrı kategori yok. Hoca "belgeli düzeltme" koduyla belge numarasını girer. Sağlık bilgisi tutulmaz.

- Ekle-bırak: Sonradan eklenen öğrencinin önceki haftaları sayılmaz. Hoca değiştirebilir.

- Elle düzeltme: Sebep kodu ve belge numarası girilir, serbest metin yok. Kim ve ne zaman yaptığı kaydedilir.

- Dönem sonu: Yönetici kayıtları kilitler. Kilitten sonra gelen geçerli kayıt saklanır ve gösterilir; sayım yalnız denetim kaydı bırakan bir düzeltmeyle değişir. Ders silinmez, arşivlenir.

- AKSİS özeti: Öğrenciler liste sırasıyla yer alır. Teori ve uygulama için ayrı sütunlarda toplam, yüzde ve DEVAMLI/DEVAMSIZ bulunur. Sonucu değiştirebilecek açık bir işaret varsa "KARAR BEKLİYOR" yazar ve çıktı "geçici" kalır.

### Uyarı seviyeleri

Öğrenciye uyarı yalnız seviye değişince gider:

- Hakkının yarısını kullandın.

- Bir ders daha kaçırırsan hakkın biter.

- Hakkın kalmadı.

- Hakkını aştın. Kesin durum AKSİS'te ilan edilir.

Hak formülü ve test notları

Devamsızlık hakkı yalnız tam sayıyla hesaplanır:

hak = T − (T × p + 99) div 100

- T: yapılan ders saatlerinin toplamı. p: 70 (teori) ya da 80 (uygulama). div: kalansız tam sayı bölmesi.

- Ondalıklı hesap (floor(T × (1 − p/100))) %80'de T'nin 1–199 arasındaki 39 değerinde yanlış sonuç verir. Örnek: T=15 için doğru hak 3, ondalıklı hesap 2 bulur. %70'te hata çıkmaz. Bu hesap için regresyon testi zorunlu.

- Dönem ortasında seviye, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır; aksi halde ilk hafta kaçıran öğrenci hemen "hakkını aştın" uyarısı alırdı. Dönem sonu tahmini değişince seviye geri gitmez. Düzeltme yapılırsa seviye yeniden hesaplanır ve öğrenciye bildirilir.

- 2. seviye, kalan hak dersin bir oturumunun saatine eşit ya da ondan az olunca tetiklenir.

- Küçük haklarda seviyeler çakışabilir (%80'de T=3 için hak 0, T=5 için hak 1). Bunun için ayrı bir test tablosu yazılır.

## Hoca ve yönetici

### Telefon uygulaması (hoca modu)

- Yoklama süresini ayarlar, yoklamayı erken kapatır.

- Kafa sayısını, kayıt sayısını görmeden girer; bu aynı zamanda "ders yapıldı" onayıdır.

- Kendi beyanı kayıtlarını ve yeni kayıtları toplu onaylar, şüpheli kayıtları ve sorun bildirimlerini inceler.

- Telefonu olmayan öğrenciyi elle ekler, makbuz QR'ını okutur.

- Öğrencinin telefon değişimini kimliği görüp yüz yüze onaylar.

- Aşama 2'de projeksiyon için eşleştirme kodu açar ya da QR'ı kendisi gösterir, Aşama 3'te Bluetooth işareti yayar.

### Web paneli · hoca (her tarayıcıda, internet gerekir)

- Ders ve program: gün, saat, derslik, her saatin teori mi uygulama mı olduğu. Oturumlar programdan otomatik üretilir.

- Öğrenci listesini yükleme, listeye öğrenci ekleme ve listeden çıkarma.

- Raporlar: ders, öğrenci ve tarih aralığı. Excel olarak indirilir, PDF tarayıcıdan yazdırılır.

- Düzeltmeler, onay listeleri, sorun bildirimleri, AKSİS özeti.

- Projeksiyon sayfası (Aşama 2): eşleştirme koduyla açılır, yalnız QR'ı tam ekran gösterir.

### Web paneli · yönetici

- Hoca onayı ve yönetici ekleme.

- Dönem, tatil ve sınav haftaları (genel İÜ takvimi).

- Dönem sonu kilidi.

### Liste yükleme kuralları

- Öğrenci numarası metin olarak tutulur (9–10 hane, başı 0 olabilir).

- Dosya türü içeriğinden tanınır. Karakter kodlaması önce UTF-8, olmazsa Türkçe (cp1254) denenir. Başlık satırı Türkçe harf duyarlı bulunur.

- Değişiklikler uygulanmadan önce gösterilir. Listeden çıkarılan öğrenci silinmez, pasif olur; böylece yanlış dosya kayıt kaybettirmez.

- İndirilen CSV ve Excel dosyalarında =, +, -, @ ile başlayan hücreler kaçışlanır. Durum işareti olarak V (var) ve Y (yok) kullanılır.

### Erişilebilirlik

Ekran okuyucu desteği, yazı boyutu ve kontrast ayarları. QR okuyamayan öğrenciyi hoca elle ekler.

## Dağıtım ve güncelleme

### Android

GitHub APK
GitHub Releases sayfasından APK indirilir ve kurulur; telefonda "bilinmeyen kaynaktan kurulum" izni açılır. Play Protect yeni kurulan APK için tarama önerebilir. APK yalnız iki işlemci türü için derlenir (arm64-v8a, armeabi-v7a) ve küçültülür; 32 bit bir telefonda denenir.

Google doğrulaması
30 Eylül 2026'da yalnız dört ülkede ve belirli mağazalardan kurulumlarda başladı; doğrudan APK kurulumu henüz denetlenmiyor. 2027'de dünya geneline genişleyecek, Türkiye için tarih açıklanmadı. O zaman doğrulanmamış uygulamayı kurmak için geliştirici ayarlarını açıp 24 saat beklemek gerekecek. Bu yüzden tam doğrulama yaparım (kimlik ve 25 USD): paket adı ve imza anahtarının parmak izi Google'a kaydedilir. Ücretsiz sınırlı hesap 20 cihazla sınırlı, sınıfa yetmez.

İmza anahtarı
Anahtar EAS'ta durur; eas credentials ile indirilir ve çevrimdışı yedeklenir. Kaybolursa güncelleme kurulmaz ve paket Google'a kaydedilemez. Google Play de kullanılırsa aynı anahtar oraya yüklenir.

Google Play (öneri)
Kapalı test kanalı da eklenirse bilinmeyen kaynak izni ve tarama uyarısı olmaz, güncellemeler kendiliğinden gelir. Yeni bireysel hesapta önce 12 kişilik kapalı test 14 gün sürer, sonra yayına başvurulur. GitHub APK yedek yol olarak kalır; Play sürümünde kendi kendini güncelleme olmaz. Karar açık noktalarda.

Obtainium
Uygulamaları GitHub'dan kurup güncelleyen Obtainium'a pasif destek: sabit dosya adları ve "Obtainium'a ekle" bağlantısı. Ana yol yapılmaz.

### iPhone

Deneme
TestFlight: en çok 10.000 kişi, her derleme 90 gün. İlk derleme Apple incelemesinden geçer ve süresi dolmayan bir deneme hesabı ister; uygulamada deneme hesabı ve her an açık deneme dersi bulunur. Apple'ın sözleşmesine göre TestFlight yalnız test içindir, kalıcı dağıtım kanalı olarak kullanılamaz.

Kalıcı yol
Listelenmeyen App Store dağıtımı: uygulama yalnız bağlantıyla bulunur, aramada çıkmaz; Apple yükseköğretim öğrencilerini uygun kitle sayıyor. Tam inceleme gerekir; derlemeler 90 günde bitmez, güncellemeler normal gelir. Bireysel hesabın bunu kullanıp kullanamayacağı doğrulanmadı.

Ad ve logo
App Store incelemesi kurum adı ve logosu için izin ister; izin yoksa nötr bir ad kullanılır.

Ücret
Apple geliştirici hesabı yılda 99 USD; bireysel hesaba ücret muafiyeti yok. Ücretsiz yollar (AltStore vb.) 7 günde bir yenileme istediği için kullanılmaz.

### Güncelleme

Uzaktan güncelleme
Uygulamanın JavaScript kısmı, mağazaya gitmeden kendi sunucumdaki güncelleme servisiyle (xprem, Expo Updates protokolü) güncellenir. Güncellemeler imzalıdır, kademeli açılır ve geri alınabilir. Yalnız hata düzeltmeleri için kullanılır; Apple yeni özelliği bu yolla vermeye izin vermiyor. Yerel kod değişikliği ve yeni özellik yeni sürümle gelir. Bu altyapı ilk yayın sürümüne baştan konur.

Sürüm kontrolü
Uygulama açılışta, günde en çok bir kez kendi sunucuma sorar. Sunucu yayın bilgisini yayın sırasında yazılan bir dosyadan ya da GitHub'dan anahtarla ve önbellekle okur; APK'nın özet değerini ve izin verilen en düşük sürümü bildirir. Doğrudan GitHub'a sorulmaz, çünkü GitHub girişsiz isteklerde aynı internet adresine saatte yalnız 60 cevap veriyor.

Güncelleme ilkesi
Dönem ortasında zorunlu güncelleme ve zorunlu yeniden giriş yok; güncellemeler kademeli açılır. Desteklenmeyen sürüm güncelleme ekranı görür, ama kayıt gönderme ucu eski sürümlere en son kapatılır; bekleyen kayıtlar hiçbir zaman engellenmez.

Desteklenen sürümler
Android 7 ve üstü, iOS 16.4 ve üstü (Expo SDK 57'nin alt sınırı). Türkiye'de Android kullanımının yaklaşık %98'i, iOS kullanımının yaklaşık %97,5'i bu aralıkta (StatCounter, Eylül 2026).

Korunacak anahtarlar
Android imza anahtarı, güncelleme imza anahtarı ve Apple sertifikaları çevrimdışı yedeklenir.

Derleme
Mac olmadan iPhone derlemesi EAS ile bulutta yapılır. Ücretsiz planda ayda 15 Android ve 15 iPhone derlemesi var, sıra önceliği düşük.

## Kullanılacak teknolojiler

Seçim ölçütü: yıllarca bakımı kolay, yaygın, iyi belgelenmiş, az parçalı ve büyümeye hazır olmak. Her yerde TypeScript, tek depo. Sürümler kilit dosyasıyla sabitlenir; büyük sürüm geçişleri bilerek ve testler yeşilken yapılır.

### Özet

Temel
TypeScript 6, Node.js 24 LTS, pnpm, Turborepo, Biome 2

Sunucu
Fastify 5, Zod 4 sözleşmeleri ve OpenAPI, Drizzle ORM 1.0 RC, Better Auth 1.7, pg-boss 12

Veritabanı
PostgreSQL 18

Testler
Cucumber.js 13 (Türkçe), Vitest 5, fast-check, Testcontainers, k6, oasdiff, Schemathesis, Stryker

Telefon
Expo SDK 57, expo-sqlite ve drizzle, TanStack Query 5, @expo/app-integrity, kendi küçük yerel modülüm

Web paneli
React 19, Vite 8, TanStack Query 5

Altyapı
Docker Compose, GitHub Actions, Dependabot, pino, OpenTelemetry, xprem

Temel

Dil
TypeScript 6, sıkı modda. Ayarlar TypeScript 7 ile uyumlu tutulur. 7.0 çok hızlı ama araçların kullandığı programlama arayüzünü henüz içermiyor; bu arayüz 7.1 ile gelince geçerim.

Çalışma ortamı
Node.js'in uzun destekli (LTS) sürümü, şu an 24. Node 26 LTS olunca ona geçilir; CI şimdiden 24 ve 26 ile birlikte çalışır. LTS dışı sürüm kullanılmaz.

Paket yöneticisi
pnpm, sürümü depoda sabit. Node 25'ten itibaren corepack gelmediği için CI ve Docker'da pnpm ayrıca kurulur. Yeni yayımlanan paket sürümü en az 1 gün bekletilir, sürüm düşürmeye izin verilmez.

Depo düzeni
pnpm çalışma alanları ve Turborepo (görev sırası ve önbellek). Expo bu düzeni kendiliğinden tanır.

Kod kalitesi
Biome 2: biçimlendirme ve kural denetimi tek araçta. TypeScript derleyicisine bağlı olmadığı için TypeScript 7 geçişini engellemez.

Sunucu (ilk yazılacak)

Çatı
Fastify 5. Ortak altyapı (veritabanı, iş kuyruğu, kimlik, saat, e-posta) kökte bir kez kaydedilir; her modül /v1/<modül> altında kendi eklentisidir. Fastify 6'ya hazırlık: tek kök hata yakalayıcı, kullanımdan kalkan API'ler kullanılmaz.

Mimari
Modüllere ayrılmış tek uygulama: kimlik, dersler, listeler, oturumlar, yoklama, düzeltmeler, raporlar, yönetim. Modüller birbirinin tablolarına dokunmaz, birbirinin dış yüzünü çağırır; bu sınır CI'da dependency-cruiser ile denetlenir. Gerekirse bir modül sonradan ayrı servise çıkarılabilir.

Kurallar
packages/core içinde saf fonksiyonlar; veritabanı ve saat dışarıdan verilir. Kurallar çatıdan bağımsız kalır ve hızlı test edilir.

Sözleşme
İstek ve cevap şemaları Zod 4 ile packages/contracts içinde. Fastify istekleri bu şemalarla doğrular (fastify-type-provider-zod), aynı şemalardan OpenAPI belgesi üretilir (@fastify/swagger). Telefon ve panelin istemcisi bu belgeden türetilir (openapi-typescript, openapi-fetch). Kırıcı değişiklikler CI'da oasdiff ile, desteklenen her uygulama sürümünün sözleşmesine karşı yakalanır. Uygulama sürümünü bildirir; istemciler bilinmeyen değerlere dayanıklı yazılır. Tek kişinin bakımındaki kütüphanelerin yedeği belli: fastify-zod-openapi, Orval.

Veritabanı erişimi
Drizzle ORM 1.0 RC, sürüm tam sabit. Henüz göç ve sorgu olmadığı için 0.45'ten sonradan geçiş derdi baştan yok; sorun çıkarsa 0.45.3'e dönülür. Göç akışı: üret, SQL'i gözden geçir, Squawk ile denetle, drizzle-kit check, sonra açılışta değil ayrı bir yayın adımı olarak uygula. Değişiklikler "önce genişlet, sonra daralt" yöntemiyle ve kilit zaman aşımıyla yapılır.

Kimlik
Better Auth 1.7.7, sürüm tam sabit ve sıkı ayarla: yalnız e-posta kodu eklentisi; kendi kendine kayıt kapalı (kayıt bizim kayıt ucumuzdan); kod özet olarak saklanır; kod uçlarına ve adres başına gönderime sıkı sınır; oturumlar yalnız veritabanında ve en uzun süre sınırıyla. Panelde güvenli çerez, telefonda @better-auth/expo. Proje 2026'da çok sayıda güvenlik duyurusu yayımladı; duyurular takip edilir. Risk büyürse yerine küçük bir kendi kod ve oturum modülüm yazılır.

İmza doğrulama
Kayıt tam baytlarıyla imzalanır (JWS ES256 biçimi), yeniden biçimlendirme hatası olmaz. Node'un yerleşik kripto modülü donanım imzalarını (DER) ve yazılım imzalarını (ham r||s) doğrular. Android anahtar kanıtı @peculiar/asn1-android, iPhone App Attest node-app-attest ile doğrulanır.

Arka plan işleri
pg-boss 12. Her oturumun gönderme süresi tek bir ertelenmiş işle kapanır; gece sınıflandırması İstanbul saatine göre zamanlanır; işler veritabanı işlemiyle birlikte kuyruğa girer. pg-boss'un tabloları da göç dosyası olarak depoda durur. İşçiler API'den ayrı süreçte çalışır.

E-posta
Nodemailer ile SMTP. Geliştirmede Mailpit, testlerde bellek içi posta kutusu.

Güvenlik
@fastify/helmet, @fastify/cors, @fastify/rate-limit ve aşırı yükte "sonra dene" (503) dönen @fastify/under-pressure. Hedef OWASP ASVS 5.0 seviye 2; telefon için OWASP MASVS.

Ayarlar
Ortam değişkenleri açılışta Zod ile doğrulanır; eksik ya da hatalıysa sunucu açılmaz.

Loglar ve izleme
pino ile JSON log; oturum başlıkları, çerezler, kodlar ve imzalar loglara yazılmaz, öğrenci numarası ve isim maskelenir. Baştan küçük bir OpenTelemetry kurulumu (@fastify/otel). Sağlık uçları: /health/live (dış bağımlılık yok) ve /health/ready (veritabanı, iş kuyruğu, şema sürümü).

Veritabanı

Sürüm
PostgreSQL 18. 19 çıkınca hemen geçilmez.

Kimlikler
UUIDv7: zamana göre sıralı, dizinleri küçük, PostgreSQL 18'de yerleşik. Oluşturulma zamanını ele verdiği için dışarıya açık jeton olarak kullanılmaz. Yoklama kaydının kimliğini telefon üretir ve bu aynı zamanda tekrar gönderme anahtarıdır; aynı kayıt iki kez gönderilse de tek kayıt olur. (Cihaz, sıra numarası) da tekildir.

Kısıtlar
Kurallar veritabanında da korunur: bir oturumda bir öğrenciye tek kayıt, yabancı anahtarlar, geçerli değer kontrolleri. Kodda hata olsa bile bozuk veri yazılamaz.

Dönem alanı
Yoklama tablosunun tekil anahtarlarında dönem kimliği baştan yer alır. Tablo sunucunun belleğinden büyüyünce döneme göre bölünür; tahmin yılda 1–3 GB, şimdilik gerekmez.

Dizinler
Gerçek sorgulara göre birkaç dizin; raporlar için kayıt zamanında hafif bir aralık dizini (BRIN).

Zaman ve sıralama
Bütün zamanlar UTC olarak tutulur. İsim sıralaması Türkçe kurallarla (ICU tr-TR) yapılır.

Denetim kaydı
Düzeltmeler ve onaylar ayrı tabloya yazılır, silinmez.

Bağlantı havuzu
PgBouncer şimdilik yok; gerekince eklenir. İş kuyruğu doğrudan bağlantıda kalır.

Yedek
pgBackRest ile istenen ana geri dönülebilen yedek, ayrıca gecelik pg_dump ve düzenli geri yükleme denemesi.

Testler (koddan önce)

Yaklaşım
Her özellik önce davranış senaryosuyla yazılır: senaryo kırmızı, kod yazılır, senaryo yeşil. Senaryosu olmayan özellik bitmiş sayılmaz.

Davranış testleri
Cucumber.js 13, Türkçe Gherkin. Yalnız temel anahtar kelimeler kullanılır: Özellik, Geçmiş, Kural, Senaryo, Senaryo taslağı, Örnekler, Diyelim ki, Eğer ki, O zaman, Ve, Fakat. Senaryolar sunucuya gerçek istek gibi gider (Fastify inject, ağ açmadan) ve gerçek PostgreSQL'e yazar. 4 paralel koşu.

Veritabanı sıfırlama
Her koşuda bir PostgreSQL kabı (Testcontainers). Göçler bir şablon veritabanına bir kez uygulanır, her paralel koşu ondan kopya açar; her senaryodan önce tablolar boşaltılır. İşlem geri alma yöntemi kullanılmaz, çünkü uygulama, iş kuyruğu ve kimlik ayrı bağlantılar kullanıyor ve geri alma gerçek hataları gizler.

Saat ve sahteler
Saat çekirdekte bir arayüzdür; testte sahte saat kullanılır, iş kuyruğunun da test saati vardır. E-posta bellek içi posta kutusuna düşer. Ders, oturum ve öğrenci cihazı için hazır veri kurucular bulunur.

Birim ve özellik testleri
Vitest 5 ve fast-check. Ortak kurallar binlerce rastgele girdiyle denenir; örneğin hak formülü her T için tam sayı hesabıyla karşılaştırılır.

Kalite kapıları
Her değişiklikte: sözleşme kırılma denetimi (oasdiff), göç denetimi (Squawk), çekirdekte en az %90 kapsam ve özellik testleri. Her gece: OpenAPI'ye rastgele istek testi (Schemathesis, giriş uçları hariç) ve kısa yük testi (k6). Haftada bir: çekirdek kurallar için mutasyon testi (Stryker). Yayından önce: ders çıkışı yoğunluğunu taklit eden yük testi.

Örnek senaryo:

# language: tr
Özellik: Yoklama penceresi

Senaryo: Süre seçilmiş derste pencere içinde verilen yoklama sayılır
Diyelim ki "MAT101" dersi pazartesi 09:00-11:00 arasında ve yoklama süresi 15 dakika
Ve "2024000123" numaralı öğrenci bu derse kayıtlı
Eğer ki öğrenci pazartesi 09:07'de yoklama verirse
O zaman kaydın durumu "var" olur

Senaryo: Aynı kayıt iki kez gönderilirse tek kayıt sayılır
Diyelim ki öğrenci pazartesi 09:07'de yoklama vermiş
Eğer ki telefon aynı kaydı iki kez gönderirse
O zaman o oturumda öğrenci için tek kayıt bulunur

Telefon uygulaması

Çatı
Expo SDK 57 (React Native 0.86, React 19.2), sayfalar Expo Router ile. Yerel modül olduğu için Expo Go değil, kendi geliştirme derlemesi kullanılır. Kendi yerel modülüm npx create-expo-module --local ile kurulur, yapılandırma eklentisi gerekmez.

Yerel veri ve kuyruk
expo-sqlite ve drizzle. Gönderme kuyruğunda her kaydın kimliği, sıra numarası, imzalı baytları, durumu ve sonraki deneme zamanı durur. Hazır eşitleme motorları (Zero, PowerSync, Electric vb.) kullanılmaz: veri büyük ölçüde yalnız ekleniyor, Zero internetsiz yazmayı desteklemiyor, diğerleri ya kendi veritabanını getiriyor ya da yakın zamanda el değiştirdi.

Sunucu verisi
TanStack Query 5 ve OpenAPI'den üretilen istemci.

Anahtar ve imza
Hedef: Android'de Keystore'da P-256 anahtarı (kayıtta anahtar kanıtıyla), iPhone'da App Attest (her kayıt için artan sayaçlı onay). @expo/app-integrity (alfa, sürümü sabit) ve kendi yerel modülüm kullanılır. App Attest'in internetsiz imzalaması belgelenmemiş; uçak modunda denenecek. İlk sürümlerde yazılım anahtarı (@noble/curves, expo-secure-store "yalnız bu cihaz") kabul edilir ve kayıtları işaretlenir.

İç sayaç ve saat
Kendi yerel modülüm: Android'de elapsedRealtimeNanos, açılış sayısı (BOOT_COUNT) ve Google'ın güvenilir saat servisi (TrustedTime); iPhone'da CLOCK_MONOTONIC ve yeniden başlatmayı anlamak için bir sistem işareti. Expo'nun hazır çalışma süresi fonksiyonu Android'de uykuyu saymadığı için kullanılmaz. iPhone'un gizlilik bildiriminde açılış süresi kullanımı beyan edilir; açılış zamanı telefondan dışarı gönderilmez, yalnız geçen süreler gider.

Arka plan ve bildirim
expo-background-task (çalışması garanti değil; gönderme asıl olarak uygulama açılınca yapılır) ve yerel bildirim için expo-notifications.

Kamera (Aşama 2)
expo-camera. Android'de Google'ın ML Kit tarayıcısını kullanır (yaklaşık 2,4 MB) ve kareleri en yüksek çözünürlükte işler; düşük modelli telefonlarda denenir. Varsayılan geniş lens kullanılır. expo-camera gerçek yakınlaştırma katsayısını vermediği için 2x değeri telefonun en büyük yakınlaştırmasından yerel modülde hesaplanır.

Bluetooth (Aşama 3)
Tarama için react-native-ble-manager; react-native-ble-plx'in Expo eklentisinin SDK 56'da bozulduğu bildirildi. Yayın için kendi yerel modülüm ya da sürümü sabitlenmiş munim-bluetooth (yeni ve tek geliştiricili).

Konum (Aşama 3)
expo-location; Android'de sahte konum işareti hazır geliyor, iPhone'un işareti için küçük yerel kod gerekir.

Uzaktan güncelleme
expo-updates, kendi sunucumdaki xprem ile; güncellemeler imzalı.

Web paneli

Çatı
React 19 ve Vite 8, TanStack Query 5, aynı OpenAPI istemcisi. Her tarayıcıda çalışır, internet gerektirir.

Excel ve PDF
Okuma için SheetJS (kendi sitesinden; npm'deki xlsx paketi kullanılmaz), yazma için write-excel-file. PDF tarayıcıdan yazdırılır.

Altyapı ve işletim

Çalıştırma
Docker Compose: API, işçi, PostgreSQL, güncelleme servisi (xprem) ve geliştirmede Mailpit. Sunucu imajı çok aşamalı derlenir; aynı imaj hem API hem işçi olarak çalışır.

CI
GitHub Actions, Node 24 ve 26 ile: kilit dosyası değişmeden kurulum, Biome, tip kontrolü, OpenAPI ve istemciyi yeniden üretip fark varsa durdurma, oasdiff, drizzle-kit check, Squawk, Vitest kapsam kapısı, 4 paralel Cucumber koşusu. Kırmızıysa birleştirilmez. Gece: Schemathesis, Stryker, k6.

Güncellemeler
Dependabot gruplu ve 3 gün bekletmeli; güvenlik güncellemeleri beklemez. Büyük sürümler elle ve testler yeşilken alınır.

API sürümü
/v1 ile başlar, yalnız ekleme yapılarak değişir. Eski telefon sürümleri en düşük sürüm kontrolüyle yönetilir; kayıt gönderme ucu en son kapatılır.

### Ölçeklenme yolu

- Hacim: 50.000 öğrenci, 6 ders, haftada 1 oturum ve 28 hafta yılda yaklaşık 8,4 milyon kayıt eder. Tek PostgreSQL bunu rahat taşır.

- Hız: 20.000 telefonun 1–5 dakika içinde göndermesi saniyede yaklaşık 70–330 istek eder. Her gönderim tek kısa veritabanı işlemiyle tek sunucuda karşılanır; k6 ile kanıtlanır. Gönderimler rastgele kaydırıldığı için ders çıkışı yığılması yumuşar.

- Yatay büyüme: Sunucu kendi içinde durum tutmadığı için aynı imajdan birden çok kopya, önünde yük dengeleyiciyle çalışabilir. İşçiler ayrı ölçeklenir.

- Büyüdükçe sırasıyla: bağlantı havuzu (PgBouncer), istek sınırı için Valkey, raporlar için okuma kopyası, yoklama tablosunun döneme göre bölünmesi.

- Birimlere genişleme: Birim ve bölüm alanları baştan modelde; tek bölümle başlansa da yapı değişmeden genişler.

### Sürdürülebilirlik ilkeleri

- Az bağımlılık: her yeni paket için bir gerekçe; bakımı durmuş paket alınmaz.

- Tek kişinin bakımındaki paketlerin yedeği belli (fastify-zod-openapi, Orval, graphile-worker).

- Tek kaynak: şemalar packages/contracts içinde, kurallar packages/core içinde.

- Kurallar saf ve testli; çatı değişse de kurallar kalır.

- Tek komutla kurulum: docker compose up ve pnpm dev; sahte veri üreticisiyle dolu bir deneme ortamı.

- Güvenlik duyuruları takip edilir, özellikle kimlik kütüphanesinde.

- Her önemli karar bu plana işlenir.

## Başlangıç

Her şey sunucudan ve davranış testlerinden başlar. Telefon ve panel, sunucu sözleşmesi oturduktan sonra yazılır.

### Klasör yapısı

- apps/server: sunucu

- apps/mobile: telefon uygulaması (öğrenci ve hoca modu)

- apps/panel: web paneli

- packages/core: ortak kurallar (hak hesabı, saat, işaretleme) ve testleri

- packages/contracts: istek ve cevap şemaları, OpenAPI belgesi, üretilen istemci

apps/server/src/
app.ts uygulamayı kurar (veritabanı, saat, e-posta, iş kuyruğu dışarıdan verilir)
infra/ ortak altyapı: ayarlar, veritabanı, iş kuyruğu, kimlik, saat, e-posta, izleme
modules/<ad>/ eklenti ve dış yüz, uçlar, servis, veri erişimi, tablolar
jobs/ iş kuyruğu görevleri
apps/server/migrations/ Drizzle ve pg-boss SQL dosyaları (yalnız ileri)
apps/server/test/
features/<modül>/ Türkçe senaryolar (.feature)
steps/ adım tanımları
support/ test dünyası, kancalar, sıfırlama, veri kurucular, sahte saat ve posta

### Veri modeli (ilk taslak)

- Birimler ve dönemler: fakülte, bölüm; dönem, tatil, sınav haftaları.

- Kişiler: yönetici, hoca, öğrenci (öğrenci numarası metin).

- Cihazlar: kişiye bağlı telefonlar, açık anahtarları, anahtar türü (donanım ya da yazılım) ve doğrulama sonucu.

- Dersler ve ders saatleri: gün, saat, derslik, teori ya da uygulama, yoklama süresi.

- Ders listeleri: hangi öğrenci hangi derste; aktif ya da pasif, muaf mı.

- Oturumlar: her ders günü; kafa sayısı, yapıldı mı, ayar değişiklikleri.

- Yoklama kayıtları: telefonun ürettiği kimlik, (cihaz, sıra numarası), dönem, saat belgesi, imza, hesaplanan saat, telefon saati, etiket.

- Düzeltmeler, sorun bildirimleri ve denetim kaydı: sebep kodu, belge numarası, kim, ne zaman.

- Olay kaydı: gönderme ve hata ölçümleri.

### Geliştirme ortamı

- docker compose up ile PostgreSQL ve Mailpit ayağa kalkar; sahte veri üreticisi deneme hesaplarını ve dersleri kurar.

- Telefonlar sunucuya bilgisayarın yerel ağ adresinden ya da geçici bir tünelden ulaşır.

### İş sırası

- İskelet: pnpm, Turborepo, TypeScript, Biome ve CI ilk günden kurulur.

- Ortak kurallar: hak hesabı, saat hesabı ve işaretleme; Vitest ve fast-check testleriyle.

- Davranış senaryoları: Türkçe olarak önce yazılır: hoca kaydı ve yönetici onayı, ders ve program, liste yükleme, öğrenci kaydı ve teyit, yoklama gönderme, kafa sayısı, düzeltme, sorun bildirimi, AKSİS özeti.

- Sunucu: senaryolar modül modül yeşile çevrilir; OpenAPI belgesi ve istemci üretilir.

- Yük testi: gönderme ucu k6 ile denenir.

- Telefon uygulaması: üretilen istemciyle; önce öğrenci modu, sonra hoca modu.

- Web paneli: raporlar ve AKSİS özeti.

- Dağıtım: deneme hesabı, uzaktan güncelleme altyapısı, derleme; Android'de GitHub, iPhone'da TestFlight, sonra listelenmeyen App Store.

## Hedefler

Hocanın işi
Ders başına en çok 2 dakika.

Gönderme
Kayıtların en az %95'i 24 saat içinde sunucuda.

Saati doğrulanamayan
Kayıtların en çok %2'si (Android ve iPhone ayrı ölçülür).

İşaretlenmeden kabul
En az %98. Kafa sayısıyla fark en çok %5.

Haksız devamsız
0. Hesabın elle hesaplananla uyuşmazlığı da 0.

Kayıt kaybı
0. Makbuzu olup sunucuda bulunmayan kayıt çıkmamalı.

Yoklama hızı (Aşama 2)
100 kişilik sınıfta katılımın %90'a ulaşması en çok 120 sn (ortanca).

QR okuma (Aşama 2)
En büyük amfide en arka sıradan okunur.

Bluetooth (Aşama 3)
Sınıftaki öğrencilerin en çok %5'i kaçırılır.

## Açık noktalar

- Aşama 1 gerçek yoklamada kullanılacak mı? Önerim: hayır, yalnız deneme için. Gerçek yoklamaya QR ile geçilir.

- Android'de Google Play kapalı test kanalı da eklensin mi? Önerim: evet; GitHub APK yedek yol olarak kalır.

- Hesap ücretleri: Apple geliştirici hesabı (yılda 99 USD) ve Google geliştirici doğrulaması (25 USD).

- İÜ'de daha önce denenen sistem: Hangisiydi, neden olmadı? İstanbul Tıp Fakültesi'nin 2018–2021 arasındaki sabit QR ve Google Formu denemesi olabilir.

- Derslik koşulları: Binalarda ve bodrumlarda internet kapsaması nasıl? Her derslikte kürsü bilgisayarından tarayıcı açılıp projeksiyona yansıtılabiliyor mu? En büyük sınıf kaç kişi?

- AKSİS: İlandan sonra düzeltme yapılabiliyor mu? Yapılabiliyorsa dönem sonu sıkışması sorun olmaz.

- Gerçek bir AKSİS liste örneği (isimler maskeli): sütun başlıkları, e-posta sütunu, ekle-bırak, çift anadal ve tekrar alınan dersler.

- Uygulama (lab) dersleri: Oturumları hoca mı yürütüyor? Asistan yürütüyorsa asistan rolü öne çekilir. Blok derslerde ikinci okutma gerekli mi?

- Tek kullanımlık kayıt kodu baştan mı gelsin, yoksa önce hoca teyidiyle mi başlansın?

- Birlikte işlenen şubeler var mı?

- Akıllı telefonu olmayan öğrenci sayısı. Bu öğrencileri hoca elle ekliyor.

- Hoca onayı: Kurumsal alan adı (@istanbul.edu.tr) yeterli mi, yoksa her hoca elle mi onaylansın? Şimdilik elle. Alan adı sınırı öğrenciyi eler (öğrencilerin adresi başka alan adında) ama emekli personeli elemez.

## Kaynaklar

Benzer sistemler

- Moodle Attendance ayarları (dönen QR, 15 sn) 

- Edusign (5 sn QR) 

- Manchester, SEAtS 30 sn kod · öğrenci gazetesi 

- iClicker konum sızıntısı (2024) · iClicker Bluetooth (2026) 

- Acadly · Ohio, Top Hat'ten çıkış 

- Chaoxing hile uygulaması · Bluetooth işaret kopyalama (2018) 

- İstanbul Tıp Fakültesi QR yoklama kılavuzu 

- UBYS Mobil · Proliz · Nişantaşı şikâyeti 

- Sözcü, "fişleme" eleştirisi (2025) · BUÜ akıllı yoklama · Kadir Has yoklama modülü 

- StatCounter, Türkiye mobil işletim sistemi payları 

Kurallar, internetsiz çalışma ve saat

- İÜ Önlisans ve Lisans Eğitim ve Öğretim Yönetmeliği (Resmî Gazete, 28.09.2025) : Md.19, Md.20, Md.35

- Zero: internetsiz yazma desteği yok · PowerSync 

- Rastgele kaydırmalı yeniden deneme 

- Android TrustedTime · Android SystemClock 

- iPhone'da yeniden başlatmayı anlama · Apple gerekçe isteyen API'ler 

- iPhone sahte konum işaretinin sınırı · expo-location 

- Play Integrity · App Attest · Android anahtar kanıtı · @expo/app-integrity 

- iPhone Bluetooth yayın sınırları · Android Bluetooth izinleri 

- expo-secure-store · expo-background-task · expo-device 

Sunucu ve testler

- Node.js sürüm takvimi · Node 25 ve corepack · TypeScript 7 ve araç uyumu 

- Fastify destek süreleri · Fastify örnek proje · Fastify ile test 

- fastify-type-provider-zod · oasdiff 

- Drizzle 1.0 değişiklikleri · Drizzle sürümleri 

- Better Auth e-posta kodu · Better Auth güvenlik duyuruları 

- pg-boss · PostgreSQL bölme · PostgreSQL 18 ve UUIDv7 · pgBackRest 

- Cucumber.js · Gherkin Türkçe anahtar kelimeler · Testcontainers PostgreSQL 

- Vitest · Schemathesis · k6 · Biome 

- OWASP ASVS 5.0 · OWASP MASVS · OpenTelemetry JS 

- GitHub REST API istek sınırları · Better Auth ve Fastify 

Dağıtım ve cihazlar

- Android geliştirici doğrulaması, SSS · Google duyurusu (Haziran 2026) 

- Play Protect uyarıları · Google Play test şartı · Obtainium 

- EAS imzalama bilgileri · Expo ve EAS planları 

- TestFlight · App Review deneme hesabı · Apple geliştirici sözleşmesi 

- Listelenmeyen App Store dağıtımı · Apple ücret muafiyeti 

- Expo Updates protokolü · xprem 

- Expo SDK sürümleri ve desteklenen işletim sistemleri · Expo SDK 57 · Expo Modules · Expo tek depo düzeni 

- ML Kit barkod tarama · munim-bluetooth · react-native-ble-plx 

- Mailpit 

Kısa sözlük

- Pencere: Yoklamanın verilebildiği zaman aralığı.

- Sayaç: Pencerenin kalan süresini gösteren geri sayım.

- İç sayaç: Telefonun açıldığından beri geçen süreyi sayan, ayarlardan değiştirilemeyen saat.

- Saat belgesi: Sunucunun imzaladığı, telefonun en son ne zaman doğru saati aldığını gösteren kayıt.

- Cihaz doğrulaması: Telefonun gerçek ve uygulamanın değiştirilmemiş olduğunun Google ya da Apple üzerinden kanıtlanması.

- Uzaktan güncelleme: Mağazaya gitmeden uygulamanın JavaScript kısmının güncellenmesi.

- Gönderme: Telefondaki kaydın sunucuya iletilmesi.

- Makbuz: Kaydın alındığını gösteren, telefonun imzaladığı belge.

- Kafa sayısı: Hocanın sınıfta saydığı yaklaşık öğrenci sayısı.

- Kendi beyanı: Süre seçilmemiş derste verilen, hoca onayı bekleyen kayıt.

- İncelemede: Şüpheli bulunup hocanın onayını bekleyen kayıt.

import json, sys, re
P = r"C:\Users\USER\Desktop\iu_attendance\plan.html"
E = []
def e(i, f, t): E.append({"id": i, "file": "plan.html", "from": f, "to": t})

# D05
e("D05", "değerleri AKSİS'e elle girer.</li>",
  "değerleri AKSİS'e elle girer. Dosyadan yükleme sorusu: bkz. <a href=\"#acik\">Açık noktalar</a>.</li>")
# D06
e("D06", "sık şikâyeti \"derse gelip yok yazılmak\" (giriş hataları, kampüste çekmeyen internet).",
  "sık şikâyeti \"derse gelip yok yazılmak\" (giriş hataları, kampüste çekmeyen internet; Proliz ve UBYS Mobil Play yorumları, 6 Ekim 2026'da yeniden bakıldı).")
# D60 roller
e("D60", "diğer yöneticileri o ekler.</div>",
  "diğer yöneticileri o ekler. İlk yönetici kayıt sayfasından değil, sunucu makinesinde bir kez çalışan komutla açılır; aynı komut bütün yöneticiler erişimini kaybederse kurtarma yolu (bkz. <a href=\"teknik.html#sunucu\">Sunucu, İlk yönetici</a>).</div>")
# D07
e("D07", "(alan adı idari personel ve emeklilerde de var)",
  "(alan adı bütün çalışanlarda, idari personel dahil; emeklilerde, çünkü emeklinin hesabı silinmiyor; FR-006 ile açılan misafir ve geçici görevli personelde ve FR-005 ile açılan birim hesaplarında da var: İÜ BİDB E-posta Kullanım Talimatı, TL-008)")
# D62
e("D62", "(HMAC; 1 milyon olasılıkta düz özet işe yaramaz)",
  "(HMAC, kendine ayrılmış anahtarla; 1 milyon olasılıkta düz özet işe yaramaz; anahtar listesi: bkz. <a href=\"teknik.html#sunucu\">Sunucu, Ayarlar</a>)")
# D01 hoca oturumu
e("D01", "4. girişte en eski oturum kapanır, hocaya e-posta gider.",
  "4. girişte en eski oturum kapanır. Her başarılı girişte hocaya kısa bir bildirim e-postası gider: cihaz ya da tarayıcı türü ve saat; en eski oturum kapandıysa o da yazılır; \"Sen değilsen Oturumlarım ekranından kapat\".")
# D01 tek etkenli
e("D01", "yeni cihaz girişinde e-posta",
  "her girişte bildirim e-postası (ASVS 6.3.5)")
# D03
e("D03", "istenmeyene düşebilir ya da reddedilebilir.",
  "istenmeyene düşebilir ya da reddedilebilir. \"p=none\" yüzünden herkes yoklama@istanbul.edu.tr adına sahte e-posta yollayabilir ve alıcı sunucu onu yine teslim edebilir; bunu ben değiştiremem. Bu yüzden her kod e-postasında ve giriş bildiriminde aynı cümle durur: \"Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.\" E-postalarda bağlantı yok, yalnız kod var. Kod biri tarafından kandırılarak alınırsa her girişte giden bildirim e-postası hocayı uyarır.")
# D04
e("D04", "BİDB'den (Bilgi İşlem Daire Başkanlığı) FR-005 formuyla gönderici hesap (ör. yoklama@istanbul.edu.tr) ve sunucu adresime Google SMTP rölesi izni isterim;",
  "BİDB'den (Bilgi İşlem Daire Başkanlığı) \"Kurumsal e-Posta Talep Formu\" (İÜ/BİDB/FR-005) ve bir birimin resmî yazısıyla gönderici hesap (ör. yoklama@istanbul.edu.tr) isterim; formda röle yok, sunucu adresime Google SMTP rölesi iznini aynı yazıda isterim (rölenin sınırı gönderici hesap başına günde 10.000 tekil alıcı);")
# D02
e("D02", "Anahtar güvenli depoda, \"yalnız bu cihaz\" ayarıyla; sunucuda yalnız özeti.",
  "Anahtar güvenli depoda, \"yalnız bu cihaz\" ayarıyla; telefon kilitliyken de arka plan gönderimi için okunabilir, yeniden başlatmadan sonra ilk kilit açılışını bekler (ayarı: bkz. <a href=\"teknik.html#telefon\">Telefon uygulaması, Anahtar ve imza</a>); sunucuda yalnız özeti.")
# D54
e("D54", "<div class=\"row\"><div class=\"k\">Hesap silme</div>",
  "<div class=\"row\" id=\"kararlar-hesap-silme\"><div class=\"k\">Hesap silme</div>")
e("D54", "onlar gidince yapılır; ekranda bu yazar.</div></div>",
  "onlar gidince yapılır; ekranda bu yazar. Öğrenci hesabı silinince giriş bilgileri (e-posta adresi, giriş kodları, oturumlar), cihazların etkinliği ve telefon sayaçları silinir; telefonda yerel veritabanı ve anahtarlar bekleyen kayıtlar gittikten sonra silinir. Hocanın yüklediği ders listesindeki satır, yoklama kayıtları (imzalı ham metin ve imzayı doğrulayan açık anahtar dahil), düzeltmeler ve denetim kaydı kalır: devam kararının dayanağı ve itirazda kanıttır; üniversitenin saklama süresi dolunca silinir ya da anonimleştirilir (süre: bkz. <a href=\"#acik\">Açık noktalar</a>). Silinen öğrenci listede kalır, yeni kayıt gönderemez; yeniden kaydolursa ilk kayıt teyidinden geçer. Hoca hesabı silinince giriş ve oturumları kapanır; dersleri arşivlenir, düzeltmeleri denetim kaydında kalır. Silme ekranı ve web adresi neyin silinip neyin kaldığını, nedenini ve süresini yazar (Apple ve Google Play, tutulan veri kullanıcıya söylenince saklamaya izin veriyor).</div></div>")
# D67 süre seçilmediyse
e("D67", "hoca bunları toplu onaylar (yoklama takip edilmiyor olabilir).",
  "hoca bunları toplu onaylar (yoklama takip edilmiyor olabilir); onaya kadar geçici olarak sayılır (bkz. <a href=\"#gun-kayit-etiketleri\">Kayıt etiketleri</a>).")
# D66 kayıt ve makbuz
e("D66", "<div class=\"row\"><div class=\"k\">Kayıt ve makbuz</div>",
  "<div class=\"row\" id=\"kararlar-kayit-ve-makbuz\"><div class=\"k\">Kayıt ve makbuz</div>")
e("D66", "Ulaşanlar da dönem kilitlenene kadar telefonda saklanır.</div></div>",
  "Ulaşanlar da dönem kilitlenene kadar telefonda saklanır. Makbuz QR'ı kaydın imzalı zarfını aynen taşır (kayıt metni, imza türü, imza; biçim: bkz. <a href=\"teknik.html#telefon-kamera-qr\">Kamera ve QR</a>). Hoca okutunca telefonu yalnız kaydın kendi dersine ait olduğunu denetler, zarfı ortak kuyruğa \"makbuz okutma\" olarak koyar; zarf hocanın oturumuyla gider, sunucu öğrencinin cihaz imzasını normal gönderimdeki gibi doğrular ve aynı kurallarla karar verir. Hoca kaydı değiştiremez, imza bozulur. Kayıt zaten ulaştıysa \"zaten var\" döner; ulaşma anı hocanın gönderiminin sunucuya ulaştığı an. Kayıtta geliş yolu (öğrencinin telefonu ya da okutan hoca ve okutma zamanı) saklanır; sonuç düzeltme değil, normal kayıttır. Öğrencinin telefonu sonra eşitlediğinde makbuz \"Sunucuya ulaştı\" olur. Her kayıt ayrı QR; birden çok bekleyen kayıt sırayla gösterilir.</div></div>")
# D57 ortak kuyruk
e("D57", "süre değişikliği, elle ekleme, makbuz okutma.",
  "süre değişikliği, elle ekleme, makbuz okutma, Aşama 2'de QR gösterim kaydı (bkz. <a href=\"#asama23-degisme-ve-kabul\">Değişme ve kabul</a>).")
# D68 ortak kuyruk
e("D68", "Olay kaydı yoklama kayıtlarından sonra gider.",
  "Günlük sayaçlar (bkz. <a href=\"#kararlar-olcum\">Ölçüm</a>) yoklama kayıtlarından sonra gider.")
# D49 gönderme
e("D49", "Kilitli telefonda paket imzalanamazsa o gönderimde ikinci çapa kurulmaz; bu yüzden saati yalnız ikinci çapayla kurulabilen kayıtlar (ilk çapası bozuk olanlar, ör. kayıttan önce yeniden başlatma: bkz. <a href=\"#gun-zayif-nokta\">Zayıf nokta</a>) arka planda değil, uygulama açılınca gider.",
  "Anahtarlar, yeniden başlatmadan sonra kilit bir kez açılınca telefon kilitliyken de kullanılır; arka plan görevi kilitli telefonda da gönderir, indirir ve paketi imzalar (ayar: bkz. <a href=\"teknik.html#telefon\">Telefon uygulaması, Anahtar ve imza</a>). Yeniden başlatmadan sonra kilit hiç açılmadıysa arka plan görevi o turda bir şey yapmaz. Paket imzalanamadığı her durumda o gönderimde ikinci çapa kurulmaz; saati yalnız ikinci çapayla kurulabilen kayıtlar (ilk çapası bozuk olanlar, ör. kayıttan önce yeniden başlatma: bkz. <a href=\"#gun-zayif-nokta\">Zayıf nokta</a>) o turda gitmez, sonraki turda ya da uygulama açılınca gider.")
# D43 yeniden deneme
e("D43", "<div class=\"row\"><div class=\"k\">Yeniden deneme</div>",
  "<div class=\"row\" id=\"kararlar-yeniden-deneme\"><div class=\"k\">Yeniden deneme</div>")
e("D43", "ikiye bölünerek sorunlu kayıt bulunur, \"ret\" işaretlenir ama silinmez, kuyruk sürer;",
  "ikiye bölünerek sorunlu kayıt bulunur, \"ret\" işaretlenir ama silinmez, kuyruk sürer. Tek başına da reddedilen kayıt kendiliğinden yeniden denenmez (aynı istek aynı cevabı alır): sorun günlük sayaçlarla bana ulaşır (HTTP kodu ve sunucunun hata kodu; bkz. <a href=\"#kararlar-olcum\">Ölçüm</a>), uygulama ya da uzaktan güncelleme değişince kayıt bir kez daha denenir. O arada makbuzu \"Telefonda kayıtlı, gönderilmedi\" kalır, günlük hatırlatma sürer; öğrenci makbuz QR'ını hocasına okutabilir (bkz. <a href=\"#kararlar-kayit-ve-makbuz\">Kayıt ve makbuz</a>), o da reddedilirse hoca \"beyana dayalı\" kodla düzeltir;")
# D56 + D68 indirme
e("D56+D68", "silinenler silindi işaretiyle iner. İmleç veritabanı neslini taşır;",
  "silinenler silindi işaretiyle iner. Herkes yalnız kendine gerekeni indirir: sınıf listesi yalnız o dersin hocasının telefonuna iner (internetsiz elle ekleme ve telafi işaretlemesi için); öğrenci telefonuna yalnız kendi dersleri, ders saatleri, oturumları, tatiller ve kendi liste satırı iner, başka öğrencinin adı ya da numarası hiç inmez (KVKK md.4, amaçla sınırlı veri). Hoca çıkış yapınca indirilen listeler telefondan silinir; gönderilmemiş işleri kuyrukta kalır. İmleç (telefonun son aldığı değişiklik sürümü) veritabanı neslini taşır. Nesil elle tutulmaz: PostgreSQL'in küme kimliği ile zaman çizelgesinden oluşur; pgBackRest'ten geri yükleme yeni zaman çizelgesi açar, pg_dump'tan dönüş yeni küme kurar, ikisinde de nesil kendiliğinden değişir (ayrıntı: bkz. <a href=\"teknik.html#kod\">Kod düzeni, Veri modeli</a>);")
# D68 şüpheli kayıt
e("D68", "<div class=\"row\"><div class=\"k\">Şüpheli kayıt</div><div>\"İncelemede\" kalır, hoca onaylayana kadar sayılmaz; her gece aşamalı sorulur (dönem sonunda yığılmasın).</div></div>",
  "<div class=\"row\" id=\"kararlar-supheli-kayit\"><div class=\"k\">Şüpheli kayıt</div><div>\"İncelemede\" kalır, hoca onaylayana kadar sayılmaz; her gece aşamalı sorulur (dönem sonunda yığılmasın). Gece sınıflandırma işi kararı değiştirmez: kararlar kayıt geldiğinde ya da ilgili olay olduğunda (teyit, ayar değişikliği, kafa sayısı) aynı işlemde verilir. Gece işi bekleyen incelemeleri ve sorun bildirimlerini sıralayıp her hocanın ertesi gün göreceği küçük partiye koyar: önce öğrencinin devam sonucunu değiştirebilecekler, sonra en eskiler. Parti boyu başlangıç değeri hoca başına 20, kullanımla ayarlanır; kalanlar sonraki geceye devreder. Aynı girdiyle iki kez çalışsa da sonuç değişmez (zamanlama: bkz. <a href=\"teknik.html#sunucu\">Sunucu, Arka plan işleri</a>).</div></div>")
# D06 öğrencinin ekranı
e("D06", "Türkiye'deki uygulamalarda en çok istenen özellik.",
  "Türkiye'deki uygulamaların Play yorumlarında öğrencilerin övdüğü, çalışmayınca da şikâyet ettiği özellik (UBYS Mobil, Proliz; Ekim 2026).")
# D52 / D67 heading id
e("D52+D67", "<h3>Kayıt etiketleri</h3>", "<h3 id=\"gun-kayit-etiketleri\">Kayıt etiketleri</h3>")
# D67 QR'sız
e("D67", "<div>Aşama 1'deki her kayıt; sınıfta olduğu doğrulanmamıştır.</div>",
  "<div>Aşama 1'deki her kayıt; sınıfta olduğu doğrulanmamıştır. Aşama 1 dersinde sayılır; QR'lı derste QR'sız gelen kayıt İncelemede kalır, hoca onaylayana kadar sayılmaz.</div>")
# D67 Kendi beyanı
e("D67", "<div>Süre seçilmemiş dersteki kayıt; hoca onayı ister.</div>",
  "<div>Süre seçilmemiş dersteki kayıt; kararı var, onaydan önce de geçici olarak sayılır; hoca toplu onaylar. Reddederse kayıt Yok olur, seviye yeniden hesaplanır, öğrenciye bildirilir. Onay bekleyen varken AKSİS özeti geçici kalır (bkz. <a href=\"#devam\">Devamsızlık</a>). Dönem kilidine kadar onaylanmayan kayıt sayılmış haliyle kilitlenir, denetim kaydına onaysız kilitlendiği yazılır.</div>")
# D20 + D67 new rows before Doğrulanmış
e("D20+D67", "<div class=\"row\"><div class=\"k\"><span class=\"tag ok\">Doğrulanmış</span></div>",
  "<div class=\"row\"><div class=\"k\"><span class=\"tag warn\">İkinci profil</span></div><div>Uygulama telefonun ana kullanıcısında değil, ikinci profilde ya da kopyada (Özel alan, Güvenli Klasör, ikiz uygulama) kurulu; kayıtta bir kez bildirilir, cihaz kaydında tutulur. Kayıt sayılır, hocanın listesinde bu etiketle görünür (bkz. <a href=\"#hile\">Hile ve sınırlar</a>).</div></div>\n"
  "    <div class=\"row\"><div class=\"k\"><span class=\"tag warn\">Yedek kodlu</span></div><div>QR yerine hocanın telefonunda gösterilen yedek kodla alınan kayıt (Aşama 2); Doğrulanmış etiketi almaz; 2'lik ortak sınır içinde sayılır, sınırı aşan İncelemede kalır (bkz. <a href=\"#hile-otomatik-kabul-kurali\">Otomatik kabul kuralı</a>).</div></div>\n"
  "    <div class=\"row\"><div class=\"k\"><span class=\"tag ok\">Doğrulanmış</span></div>")
# D67 paragraph
e("D67", "<p>Kayıtta birden çok etiket olabilir;",
  "<p>Sayımı etiket değil sunucu kararı belirler. Kayıtta birden çok etiket olabilir;")
# D68 son durumlar
e("D68", "beyana dayalı düzeltme ve elle ekleme Elle eklendi.",
  "beyana dayalı düzeltme ve elle ekleme Elle eklendi; elle eklemenin sebep kodları \"telefonu yok ya da çalışmıyor\" ve \"QR okutamadı\" (öğrenciyi suçlamayan tarafsız kod).")
# D66 kenar
e("D66", "makbuz QR'ını gösterirse hoca telefonuyla okutup düzeltir",
  "makbuz QR'ını gösterirse hoca telefonuyla okutur, kayıt hocanın telefonundan aynen sunucuya gider ve normal kayıt gibi karara bağlanır (düzeltme sayılmaz; bkz. <a href=\"#kararlar-kayit-ve-makbuz\">Kayıt ve makbuz</a>)")
# D48 kenar
e("D48", "İnternet varken uygulama her açılışta küçük deneme onayı üretir; anahtar bozuksa hemen yenisini alır,",
  "İnternet varken uygulama her açılışta küçük deneme onayı üretir; deneme onayı telefonda kalır, sunucuya gitmez; anahtar bozuksa Apple onayı geçersiz anahtar hatasıyla üretmez, uygulama bunu böyle anlar; bu durumda hemen yenisini alır,")
# D57 değişme ve kabul
e("D57", "geçerli belge yoksa QR yine üretilir ama ders işaretlenir.",
  "geçerli belge yoksa QR yine üretilir ama ders işaretlenir. Hoca telefonunun da saat payı var: internetsiz gösterilen QR'da 10 ve 30 saniyelik sınırlar öğrencinin payıyla hoca telefonunun payı toplanarak uygulanır. Hoca telefonu QR'ı hangi saat belgesiyle ve belgeden ne kadar sonra gösterdiğini QR gösterim kaydı olarak ortak kuyruktan gönderir, ikinci çapası da kurulur; sunucu payı öğrenci kaydındaki kuralla hesaplar (QR'daki anahtar cihaza özel olduğundan hangi telefonun ürettiği bellidir). Bu kayıt gelene kadar o oturumun QR kayıtlarının gecikmesi kesinleşmez, kayıtlar beklemede kalır. Projeksiyonda kodları sunucu verir, sayfa sunucu saatiyle gösterir; ayrı pay eklenmez.")
# D10 anahtar
e("D10", "iPhone'da güvenli depoda \"yalnız bu cihaz\" olarak durur.",
  "iPhone'da güvenli depoda \"yalnız bu cihaz\" olarak durur. Anahtar indirilirken bir an uygulama belleğinde durur; bu kabul edildi (iPhone'da her kullanımda zaten öyle; aktarım ayrıntısı: bkz. <a href=\"teknik.html#telefon\">Telefon uygulaması, Anahtar ve imza</a>).")
# D67 yedek kod
e("D67", "hoca kendi telefonunda o öğrenciye gösterir. 2'lik ortak sınıra girer.",
  "hoca kendi telefonunda o öğrenciye gösterir. 2'lik ortak sınıra girer; kayıt \"Yedek kodlu\" etiketi alır.")
e("D67", "<li>QR'sız kayıtlar ayrı kalır, hoca isterse onaylar.</li>",
  "<li>QR'lı derste QR'sız gelen kayıtlar İncelemede kalır (sayılmaz), hoca isterse onaylar (bkz. <a href=\"#gun-kayit-etiketleri\">Kayıt etiketleri</a>).</li>")
# D09
e("D09", "diye bildirilemez; Bluetooth'u açma penceresi",
  "diye bildirilemez; konum servisi kapalıyken Android tarama sonucu vermez; uygulama taramadan önce bunu denetler, kapalıysa öğrenciden açmasını ister, açılmazsa kayıt \"Bluetooth yok\" sayılır, öğrencinin aleyhine kullanılmaz; Bluetooth'u açma penceresi")
# D20 hile
e("D20", "<li>Değiştirilmiş uygulama ve emülatör: cihaz doğrulamasıyla zorlaşır</li>",
  "<li id=\"hile-ikinci-profil\">Android'de ikinci profil ya da uygulama kopyası (Özel alan, Güvenli Klasör, ikiz uygulama): kopya kendi anahtarını ve geçerli anahtar kanıtını alır, kanıtta profil bilgisi olmadığından sunucu onu ayrı telefondan ayıramaz; ama uygulama ana kullanıcıda çalışmadığını bilir ve bunu kayıtta bildirir, o telefonun kayıtları \"İkinci profil\" etiketiyle görünür (bkz. <a href=\"#gun-kayit-etiketleri\">Kayıt etiketleri</a>). iPhone'da yok.</li>\n"
  "        <li>Değiştirilmiş uygulama ve emülatör: cihaz doğrulamasıyla zorlaşır</li>")
e("D20", "<li>Android'de ikinci profil ya da uygulama kopyası (Özel alan, Güvenli Klasör, ikiz uygulama); iPhone'da yok</li>",
  "<li>Kökü açılmış Android'de ikinci profil işaretini gizlemek (bkz. <a href=\"#hile-ikinci-profil\">İşaretlenir</a>)</li>")
# D68 hile
e("D68", "QR okuyamayan öğrenciyi hoca tarafsız sebep koduyla elle ekler.",
  "QR okuyamayan öğrenciyi hoca \"QR okutamadı\" sebep koduyla elle ekler (tarafsız kod, son durumu Elle eklendi; bkz. <a href=\"#gun-son-durumlar\">Son durumlar</a>).")
# D12
e("D12", "Manchester'da QR'la birlikte gösterilen altı haneli kod ders boyunca geçerli; öğrenciler kodun paylaşılıp derse gelinmediğini açıkça yazdı.",
  "Manchester'da (SEAtS) 30 sn'lik canlı kod varsayılan oldu ama hoca sabit ders kodunu seçmeye devam edebiliyor; öğrenci QR okutuyor ya da kodu yazıyor, öğrenciler kodun paylaşılıp derse gelinmediğini açıkça yazdı (kodun uzunluğu ve geçerlilik süresi kaynaklarda yok).")
# D16
e("D16", "iClicker'da bir hatayla sınıfın konumu sızdı, sahte konum betikleri yazıldı;",
  "iClicker'ın sunucusu oturumun tam konumunu öğrencinin tarayıcısına gönderiyordu; 2024'te bu konumu alıp sahte konum olarak geri yollayan bir betik yayımlandı (yamalanıp yamalanmadığı bilinmiyor);")
# D11
e("D11", "Acadly %95 ile 98 yakalama bildiriyor (üretici verisi, öğrenci telefonları arası aktarmalı yöntem).",
  "Acadly, uygulama herkeste kuruluysa sınıftakilerin ortalama %95'inden fazlasını, ilk derste öğrencilere gösterilip deneme yapılırsa yaklaşık %98'ini yakaladığını bildiriyor (üretici verisi; öğrenci telefonları arası aktarmalı Bluetooth ağı, yoklama 2,5 dakika sürüyor; yakalanmayan öğrenci elle eklenmeye yönlendiriliyor).")
# D15
e("D15", "girişi kilitleyen bir güncelleme (Proliz, Mart 2026).",
  "girişi kilitleyen bir güncelleme (Proliz Mobil, Nisan 2026, mağaza yorumları: giriş yapılamadı, öğrenci 2 hafta derse gelip yok yazıldı).")
e("D15", "Aksaray Üniversitesi yönergesi (Senato, 15.01.2025): internet yokken yoklama imzayla alınır, 1 hafta içinde sisteme girilir.",
  "Aksaray Üniversitesi Ders Devamının Takibi Uygulama Yönergesi (Senato, 15.01.2025, karar 2025/01-04): internet erişimi yokluğu gibi mücbir sebeplerde yoklama imza karşılığı alınır, 1 hafta içinde sisteme işlenir (Md.5/2); sınıfta olup sistemle sorun yaşayan öğrenciyi hoca aynı gün elle ekler (Md.5/3).")
# D14
e("D14", "UBYS MOBİL Eylül 2026'da QR kamera yakınlaştırmasını düzeltti;",
  "UBYS MOBİL 28 Eylül 2026 sürümünde QR yoklamada kameranın geniş açıda takılı kalmasını giderdi, yakınlaştırıp uzaklaştırmayı ekledi (mağaza sürüm notu);")
# D17b
e("D17", "numara ve QR'ı yedek tuttu.", "numara ve QR'ı yedek tuttu (Aralık 2025).")
# D18
e("D18", "Nişantaşı'nda QR yoklamada bir derste 25 ile 30 öğrencinin kayıtları görünmedi (Ocak 2024).",
  "Nişantaşı'nda bir öğrencinin şikâyetine göre (Ocak 2024) QR yoklamada tek bir derste dört yoklamanın ikisi kaydında görünmedi; öğrenci sınıfında 25 ile 30 kişinin durumunun benzer olduğunu yazıyor.")
# D17
e("D17", "QR yoklama 2025'te basında \"fişleme\" diye eleştirildi; 2025 ile 2026'da hızla yayıldı (Düzce Şubat 2026, BUÜ Eylül 2026 web tabanlı). İstanbul Atlas'ın Bluetooth'a geçişi yukarıda. Türkiye'deki uygulamaların hepsi yoklama anında internet istiyor.",
  "QR yoklama Nisan 2025'te basında \"fişleme\" diye eleştirildi (Hacettepe ve Üsküdar, 15 saniyede değişen QR); 2025 ile 2026'da hızla yayıldı: Düzce'nin D.Ü. Mobil uygulaması Şubat 2026'da bütün öğrencilere açıldı (QR ile yoklama), Anadolu Şubat 2026'da kartlı yoklamadan QR'a geçti (uygulama üniversitenin internet ağı üzerinden çalışıyor, telefonu olmayana hoca elle yoklama alıyor), BUÜ 28 Eylül 2026'da web tabanlı QR yoklamaya başladı (ayrı uygulama yok, telefonun tarayıcısından okutuluyor). İstanbul Atlas'ın Bluetooth'a geçişi yukarıda. İncelediğim QR uygulamalarının hepsi yoklama anında internet istiyor; Bluetooth kullanan Atlas'ın kaynağı internetten söz etmiyor.")
# D19
e("D19", "İÜ İstanbul Tıp Fakültesi 2018'de intörn oryantasyon gününde sabit QR ve Google Formuyla 2 dakikalık yoklama aldı (sabah 377, öğleden sonra 422 katılım).",
  "İÜ İstanbul Tıp Fakültesi 24 Temmuz 2018'de intörn oryantasyon gününde sabit QR ve Google Formuyla 2 dakikalık yoklama aldı (sabah 377, öğleden sonra 422 katılım; forma öğrenci e-postasıyla oturum açılıyordu).")
# D22 kural
e("D22", "<strong>Kural (Md.19):</strong>", "<strong>Kural (Md.19/1 ve 19/3):</strong>")
# D58 kural
e("D58", "yönetici dersin oranını (p) değiştirir.", "yönetici dersin teori ve uygulama oranlarını (iki ayrı p) değiştirir.")
# D22 muaf
e("D22", "<strong>Devamdan muaf (Md.20):</strong>", "<strong>Devamdan muaf (Md.20/5):</strong>")
e("D22", "FD ile tekrarda, iki kez kalınan klinik uygulamalı derste (Md.20/5) ve Md.28/4 kapsamındaki son dönem öğrencisinin uygulamalı derslerinde var",
  "FD (devamsız başarısız, Md.21) ile tekrarda, iki kez kalınan klinik uygulamalı derste ve Md.28/4 kapsamındaki (AGNO'sunu yükseltmek için sınırsız sınav hakkı verilen) son dönem öğrencisinin uygulamalı, uygulaması olan ya da daha önce almadığı derslerinde var")
# D23
e("D23", "İÜ Öğrenci Sağlık Raporları Yönergesi'ne göre sıradan sağlık raporu devamsızlığı silmez, bir şey girilmez.",
  "İÜ Öğrenci Sağlık Raporları Yönergesi'ne göre (Md.7/2) raporlu süreler devamsızlığa dahildir, sıradan sağlık raporu devamsızlığı silmez, bir şey girilmez.")
e("D23", "Yalnız yatarak tedavi ve sağlık kurulu raporlarının kapsadığı teori saatleri devamsızlıktan düşülür:",
  "Yalnız yatarak tedavi ve sağlık kurulu raporlarının kapsadığı teori saatleri devamsızlıktan düşülür (Md.7/3); öğrenci raporu bitiminden sonra en geç üç iş günü içinde birim öğrenci işlerine verir (Md.6):")
# D24 dönem sonu
e("D24", "Lisans takviminde bu gün dersin bittiği gün: son haftanın kayıtlarına 7 günlük pay yok.",
  "Bu gün takvimde dersin bittiği güne denk gelebiliyor (Eczacılık'ın 2025 ile 2026 öğretim yılı takviminde ikisi de 2 Ocak 2026; 2026 ile 2027 lisans takvimi okunamadı, bkz. <a href=\"#acik\">Açık noktalar</a>); bu yüzden son haftanın kayıtlarına 7 günlük pay güvenilmez, süre en geç bu gündür.")
# D64 uyarı
e("D64", "<p>Öğrenciye uyarı yalnız seviye değişince gider; seviye teori ve uygulama için ayrı hesaplanır, mesajda hangisi olduğu yazar:</p>",
  "<p>Öğrenciye uyarı yalnız seviye değişince gider; seviye teori ve uygulama için ayrı hesaplanır, mesajda hangisi olduğu yazar. Seviye durumdan hesaplanır: aynı anda birden çok seviyenin koşulu sağlanırsa yalnız en yüksek seviyenin mesajı gider, atlanan seviyelerin mesajı sonradan gönderilmez. Seviye ilk devamsızlıktan önce de hesaplanır; küçük hakta öğrenci ilk günden uyarı görebilir. Telefonda her ders ve tür için tek bildirim durur, yenisi eskisinin yerine geçer (bkz. <a href=\"teknik.html#telefon-arka-plan\">Arka plan ve bildirim</a>):</p>")
# D58 p
e("D58", "<strong>p:</strong> dersin oranı, varsayılan 70 (teori) ya da 80 (uygulama).",
  "<strong>p:</strong> dersin o türdeki oranı; derste teori ve uygulama için iki ayrı alan, varsayılan teoride 70, uygulamada 80. Formül her tür için kendi T ve p'siyle ayrı çalışır.")
# D64 test
e("D64", "Küçük haklarda çakışabilen seviyeler (%80'de hak T=3 için 0, T=5 için 1) ayrı test tablosuyla denenir.",
  "Küçük haklarda çakışabilen seviyeler (%80'de hak T=3 için 0, T=5 için 1) ayrı test tablosuyla denenir; tabloda beklenen mesaj en yüksek seviyenin mesajıdır. 1 saatlik oturumlarla: T=3'te ilk günden \"Hakkın kalmadı\"; T=5'te ilk günden \"Bir ders daha kaçırırsan hakkın biter\", ilk devamsızlıkta yalnız \"Hakkın kalmadı\".")
# D29
e("D29", "Sayfa numarası yalnız Chrome ve Edge'de çıktığı için şart değil.",
  "Sayfa numarası (CSS sayfa kenar kutuları) yalnız Chrome ve Edge'de, 131. sürümden beri çıkıyor, Firefox ve Safari'de çıkmıyor; bu yüzden şart değil.")
# D28
e("D28", "çünkü Windows ekranı 5 dakikada karartabiliyor.",
  "çünkü Windows dokunulmayan ekranı güç ayarına göre birkaç dakikada karartır (Microsoft'un enerji önerisi 3 ya da 10 dakika; kürsü bilgisayarının ayarını bilmiyorum).")
# D24 hoca
e("D24", "Tek genel takvim varsayılmaz (İÜ; Tıp, Diş Hekimliği, Hukuk, AUZEF, Eczacılık ve Konservatuvar için ayrı takvim yayımlıyor).",
  "Tek genel takvim varsayılmaz: İÜ genel ön lisans ve lisans takviminin yanında birimlere ayrı takvim yayımlıyor (Eczacılık'ın 2025 ile 2026 öğretim yılı takvimi ayrı; Tıp, Diş Hekimliği, Hukuk, AUZEF ve Konservatuvar için de ayrı takvim olduğu yazılmıştı, 2026 ile 2027 takvimleri okunamadığından teyit edilmedi).")
# D58 yönetici
e("D58", "Kuralı farklı programdaki dersin devam oranı (p)",
  "Kuralı farklı programdaki dersin devam oranları (teori ve uygulama için ayrı p)")

src = open(P, encoding="utf-8").read()
ok = True
for x in E:
    c = src.count(x["from"])
    if c != 1:
        print("ORIG COUNT", c, x["id"], x["from"][:70]); ok = False
cur = src
for x in E:
    c = cur.count(x["from"])
    if c != 1:
        print("SEQ COUNT", c, x["id"], x["from"][:70]); ok = False
        continue
    cur = cur.replace(x["from"], x["to"])
for x in E:
    for ch in "\u2013\u2014":
        if ch in x["to"]: print("DASH", x["id"]); ok = False
ids_new = re.findall(r'id="([^"]+)"', cur)
dup = {i for i in ids_new if ids_new.count(i) > 1}
print("dup ids", dup)
hrefs = set(re.findall(r'href="#([^"]+)"', cur))
missing = [h for h in hrefs if h not in ids_new]
print("missing internal", missing)
tk = open(r"C:\Users\USER\Desktop\iu_attendance\teknik.html", encoding="utf-8").read()
tids = set(re.findall(r'id="([^"]+)"', tk))
th = set(re.findall(r'href="teknik\.html#([^"]+)"', cur))
print("missing teknik", [h for h in th if h not in tids])
print("edits", len(E), "ok", ok)
open(r"C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\a1_edits.json", "w", encoding="utf-8").write(json.dumps(E, ensure_ascii=False, indent=1))
open(r"C:\Users\USER\AppData\Local\Temp\claude\C--Users-USER-Desktop-iu-attendance\7abdd45e-faba-44fe-954e-90155d6bca30\scratchpad\a1_plan_preview.html", "w", encoding="utf-8").write(cur)

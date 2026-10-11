import json, io, sys
D = r"C:/Users/USER/Desktop/iu_attendance/"
E = []
def e(i, f, a, b): E.append({"id": i, "file": f, "from": a, "to": b})

# F031
e("F031", "plan.html",
  "Her istekte zaman aşımı (ör. 30 saniye); beklenmeyen biçimdeki cevap (kampüs ağının giriş sayfası gibi) başarısız sayılır. Kayıtlar sırayla, en çok 200'lük paketlerle gider;",
  "Her istekte zaman aşımı var; beklenmeyen biçimdeki cevap (kampüs ağının giriş sayfası gibi) başarısız sayılır. Kayıtlar sırayla, sınırlı boyutta paketlerle gider (zaman aşımı ve paket boyu: bkz. <a href=\"teknik.html#telefon-gonderme-protokolu\">Gönderme protokolü</a>);")
e("F031", "teknik.html",
  "<div class=\"k\">Gönderme protokolü</div><div>Yeniden deneme yalnız",
  "<div class=\"k\">Gönderme protokolü</div><div>Her isteğin zaman aşımı 30 saniye; bir pakette en çok 200 kayıt. Yeniden deneme yalnız")

# F032
e("F032", "plan.html",
  "Google'ın güvenilir saat servisi (TrustedTime) ilk sürümde yok; Android'de saati doğrulanamayan oran %2'yi aşarsa eklenir.",
  "Google'ın güvenilir saat servisi (TrustedTime) ilk sürümde yok ve bu sorunu çözmez: yeniden başlatmadan sonra saat vermesi için telefonun bir kez internete çıkması gerekir, o zamana kadar boş döner (Android Developers Blog, Şubat 2025); Google Play hizmetlerini de ister. \"Saat doğrulanamadı\" ise tam da internetsiz yeniden başlatma durumudur. Android'de saati doğrulanamayan oran %2'yi aşarsa önce sebebi ölçümle ayırırım (kayıttan önce mi sonra mı yeniden başlatma, 7 günden eski belge mi); TrustedTime yalnız yeniden başlatmadan sonra internete çıkıp sunucumdan belge alamamış telefonlara yarar, oran bunlardan geliyorsa eklenir.")

# F033
e("F033", "plan.html",
  "Öğrenci bunu derste internetsizken öğrenmez; eski anahtarla imzalı bekleyen kayıtlar yine gönderilir.",
  "Deneme internet varken yapılır, çünkü bozuk anahtar ancak internetle yenilenir (yeni anahtarın onayı Apple'a gider). Anahtar derste internetsizken bozuksa öğrenci bunu öğrenmez: yeni kayıt ikinci donanım anahtarıyla imzalanır, \"Cihaz doğrulanmadı\" etiketi alır, yine sayılır; anahtar internet gelince yenilenir. Eski anahtarla imzalı bekleyen kayıtlar yine gönderilir.")

# F034
e("F034", "plan.html",
  "Telefon sunucuya ulaşan kayıtları da dönem kilidine kadar sakladığından sunucu her eşitlemede",
  "Telefon ortak kuyruğun bütün işlerini (öğrencinin kayıtlarını ve hocanın kafa sayısı, erken kapatma, süre değişikliği, elle ekleme, makbuz okutma, QR gösterim kaydı gibi işlerini) sunucuya ulaşsa da sıra numarasıyla dönem kilidine kadar sakladığından sunucu her eşitlemede")
e("F034", "plan.html",
  "Makbuzlu kayıt kaybolmaz, geri sarılan",
  "Makbuzlu kayıt, telefon elde olduğu sürece kaybolmaz; geri sarılan")

# F035
e("F035", "plan.html",
  "eşitleme bozulursa yeni belge verilmez, telefonlar eldeki belgeyle devam eder.",
  "eşitleme bozulursa yeni belge verilmez, telefonlar eldeki belgeyle devam eder. O arada ilk çapası sağlam kayıtlar ikinci çapasız gider; saati yalnız ikinci çapayla kurulabilen kayıtlar telefonda bekler, belge yeniden verilince gider. Eşitleme bozukken sunucu \"ulaşma anını aşamaz\" denetiminden ret vermez: aşan kayıt gerekçe koduyla İncelemede kalır.")

# F036
e("F036", "plan.html",
  "    <div class=\"row\"><div class=\"k\"><span class=\"tag warn\">Beklemede</span></div><div>Teyidi gelmemiş öğrencinin ya da ders içinde ayarı değişen dersin kaydı.</div></div>",
  "")
e("F036", "plan.html",
  "    <div class=\"row\"><div class=\"k\"><span class=\"tag warn\">İncelemede</span></div><div>Şüpheli kayıt; hoca onaylayana kadar sayılmaz.</div></div>",
  "")
e("F036", "plan.html",
  "Beklemede ve İncelemede ise sunucu kararıdır (var, beklemede, incelemede, ret), gerekçe koduyla ayrı tutulur.</p>",
  "Beklemede ve İncelemede etiket değil sunucu kararıdır: her kaydın tek kararı vardır (var, beklemede, incelemede, ret), gerekçe koduyla ayrı tutulur.</p><h3>Sunucu kararları</h3><div class=\"rows\"><div class=\"row\"><div class=\"k\">Var</div><div>Geçerli kayıt; sayılır.</div></div><div class=\"row\"><div class=\"k\">Beklemede</div><div>Teyidi gelmemiş öğrencinin ya da ders içinde ayarı değişen dersin kaydı.</div></div><div class=\"row\"><div class=\"k\">İncelemede</div><div>Şüpheli kayıt; hoca onaylayana kadar sayılmaz.</div></div><div class=\"row\"><div class=\"k\">Ret</div><div>Geçersiz kayıt; sayılmaz.</div></div></div>")

# F037
e("F037", "plan.html",
  "Projeksiyonda kodları sunucu verir, sayfa sunucu saatiyle gösterir; ayrı pay eklenmez. Bunlar başlangıç değerleri, denemeyle ayarlanır.",
  "Projeksiyonda kodları sunucu verir, sayfa sunucu saatiyle gösterir; ayrı pay eklenmez. Pay geçen süreyle büyür (milyonda 100): 1 günlük belgede yaklaşık 8,6 saniye, sabit kısımla birlikte okutma 5 saniyelik dilimin ilk 1 saniyesinde olmazsa 10 saniye aşılır; 2 günlük belgede (ör. hafta sonundan sonra) yaklaşık 17,3 saniye, normal imkânsız olur; internetsiz QR'da hoca telefonunun payı da eklenir. Bu yüzden QR kaydında sunucu iki çapadan payı küçük olanı kullanır: kayıt dersten sonra birkaç saat içinde gönderilirse pay küçük kalır (3 saatte yaklaşık 1,1 saniye). İki çapası da eski olan kayıt İncelemede kalır; bu oran ilk QR denemesinde ölçülür. Bunlar başlangıç değerleri, denemeyle ayarlanır.")

# F038
e("F038", "plan.html",
  "Başka okullarda 15 ile 30 saniyelik kodlar mesajla paylaşıldı.",
  "Başka okullarda dönen kodlar 15 ile 30 saniyelik; Manchester'da öğrenciler kodun paylaşılıp derse gelinmediğini yazdı, ama orada kodun süresi kaynaklarda yok ve hoca sabit kodu da seçebiliyor (bkz. <a href=\"#benzer\">Benzer sistemler</a>).")

# F039
e("F039", "plan.html",
  "Kamera varsayılan geniş lensle açılır (0,5x açılmaz) ve 2x yakınlaştırılır;",
  "Kamera ana (1x) kamerayla açılır (0,5x geniş açı kamerası açılmaz); Aşama 2'nin uzaktan okutulan yoklama QR'ında 2x yakınlaştırılır, yakından okutulan makbuz QR'ında yakınlaştırılmaz (1x);")

# F040
e("F040", "plan.html",
  "QR'ın zaman diliminden üretilir, onunla değişir; projeksiyonda gösterilmez, hoca kendi telefonunda o öğrenciye gösterir.",
  "QR'ın zaman diliminden üretilir, onunla değişir; projeksiyonda gösterilmez, hoca kendi telefonunda o öğrenciye gösterir. Kod 6 rakam. Kabul QR'daki gecikme kuralıyla, ama yazma süresi için normal sınırı 10 değil 20 saniye; ret sınırı yine 30 saniye (başlangıç değerleri).")

# F041
e("F041", "plan.html",
  "Aşama 3'ün Bluetooth kodu da aynı anahtardan üretilir.",
  "Yedek kod ve Aşama 3'ün Bluetooth kodu da aynı anahtardan üretilir; her biri hesaba ayrı bir amaç baytı katar, böylece birinde görülen kod ötekinde geçmez (her anahtar tek iş içindir: bkz. <a href=\"teknik.html#sunucu-ayarlar\">Ayarlar</a>).")

# F042
e("F042", "plan.html",
  "<li>Aynı derse yoklama iki kez başlatılırsa kayıtlar tek oturumda birleşir.</li>",
  "<li>Aynı derste QR iki kaynaktan gösterilirse (projeksiyon ve hocanın telefonu) ya da hoca QR'ı kapatıp yeniden açarsa kayıtlar tek oturumda birleşir.</li>")

# F043
e("F043", "plan.html",
  "<li>QR'lı derste QR'sız gelen kayıtlar İncelemede kalır (sayılmaz), hoca isterse onaylar (bkz. <a href=\"#gun-kayit-etiketleri\">Kayıt etiketleri</a>).</li>",
  "<li>QR'lı derste QR'sız gelen kayıtların kararı: bkz. <a href=\"#gun-kayit-etiketleri\">Kayıt etiketleri, QR'sız</a>.</li>")
e("F043", "plan.html",
  "QR'lı derste QR'sız gelen kayıt İncelemede kalır, hoca onaylayana kadar sayılmaz.",
  "QR'lı derste QR'sız gelen kayıt İncelemede kalır, hoca isterse onaylar; onaylayana kadar sayılmaz.")

# F044
e("F044", "plan.html",
  "<p><strong>Rastgele isim:</strong> Hoca ekranındaki \"rastgele isim\" düğmesi yalnız sunucuya ulaşmış kayıtlardan birkaç kişi seçer, hoca okur; \"burada değil\" denenin kaydı düşer.",
  "<p id=\"hile-rastgele-isim\"><strong>Rastgele isim:</strong> Hoca ekranındaki \"rastgele isim\" düğmesi yalnız sunucuya ulaşmış kayıtlardan birkaç kişi seçer, hoca okur; \"burada değil\" denenin kaydı düşer: sunucu kararı \"ret\" olur, gerekçe kodu \"yoklamada sınıfta değil\", son durumu Yok; kimin ne zaman işaretlediği denetim kaydına yazılır.")
e("F044", "plan.html",
  "elle eklemenin sebep kodları \"telefonu yok ya da çalışmıyor\" ve \"QR okutamadı\" (öğrenciyi suçlamayan tarafsız kod).",
  "elle eklemenin sebep kodları \"telefonu yok ya da çalışmıyor\" ve \"QR okutamadı\" (öğrenciyi suçlamayan tarafsız kod); rastgele isim okumasındaki \"yoklamada sınıfta değil\" Yok (bkz. <a href=\"#hile-rastgele-isim\">Rastgele isim</a>).")

# F045
e("F045", "plan.html",
  "<li>Telefonun saatini değiştirmek (ilk çapa bozukken, yani kayıttan önce yeniden başlatma ya da 7 günden eski belgeyle, kayıttan sonra da yeniden başlatma hariç; o işaretlenip 2'lik sınıra girer, bkz. <a href=\"#gun-zayif-nokta\">Zayıf nokta</a>)</li>",
  "<li>Telefonun saatini değiştirmek (tek istisnası \"İşaretlenir ya da sınırlanır\" listesinde)</li>")
e("F045", "plan.html",
  "<li>Başkasının numarasıyla kayıt olmak: hoca teyidi</li>",
  "<li>İlk çapa bozuksa (kayıttan önce yeniden başlatma ya da 7 günden eski belge) ve kayıttan sonra da yeniden başlatma olursa telefonun saatini değiştirmek: kayıt \"Saat doğrulanamadı\" olur, 2'lik ortak sınıra girer (bkz. <a href=\"#gun-zayif-nokta\">Zayıf nokta</a>)</li><li>Başkasının numarasıyla kayıt olmak: hoca teyidi</li>")

ok = True
txt = {f: open(D+f, encoding="utf-8", newline="").read() for f in ("plan.html", "teknik.html")}
for x in E:
    c = txt[x["file"]].count(x["from"])
    if c != 1: print("BAD", x["id"], c, x["from"][:60]); ok = False
    for ch in ("\u2014", "\u2013"):
        if ch in x["to"]: print("DASH", x["id"]); ok = False
    txt[x["file"]] = txt[x["file"]].replace(x["from"], x["to"], 1)
print("ok" if ok else "fail", len(E))
json.dump(E, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False)

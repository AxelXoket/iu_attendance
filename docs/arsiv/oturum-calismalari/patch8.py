"""Round-6 critic fixes (A6, B6, C6). Every old string must match exactly once unless a count is given."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []   # (old, new, expected_count)

def r(old, new, n=1):
    R.append((old, new, n))

# ---- Tek bakışta ----
r("""    <li><b>Teknoloji:</b>""",
  """    <li><b>Önlenemeyen:</b> Canlı aktarım, arkadaşının telefonunu derse getirmek ve değiştirilmiş uygulama. Kâğıt da bunları önleyemiyor.</li>
    <li><b>Teknoloji:</b>""")

# ---- Kararlar ----
r("""Her ders ve şube için günlük anahtar üretilir, hocanın her cihazına ayrı türetilir ve sonraki 3 iş günü için (en fazla 5 takvim günü) önceden indirilir. Her "Başlat" rastgele bir değer üretir.""",
  """Sunucu her ders ve şube için günlük anahtar üretir, bundan her cihaza ayrı bir anahtar türetir ve sonraki 5 takvim gününün anahtarlarını cihaza indirir. Günlük anahtar cihaza hiç gelmez. Her "Başlat" rastgele bir değer üretir.""")
r("""<td data-l="Karar">Expo SDK 57 (React 19.2), expo-sqlite ve drizzle. Android'de QR, ML Kit yerine ZXing ile çözülür.</td>""",
  """<td data-l="Karar">Expo SDK 57 (React 19.2), expo-sqlite ve drizzle. QR, iOS'ta expo-camera ile okunur. Android'de ML Kit yerine kendi kamera modülümüz kullanılır (CameraX ve zxing-cpp 3.1.1).</td>""")
r("""<td data-l="Karar">Yalnız yerel bildirim. Üçüncü parti analitik ya da çökme SDK'sı yok.</td>""",
  """<td data-l="Karar">Yalnız yerel bildirim. Üçüncü parti analitik ya da çökme SDK'sı yok. Uygulama kendi hata kaydını İÜ sunucusuna gönderir.</td>""")

# ---- Akış ----
r("Sonraki 3 iş gününün (en fazla 5 takvim günü) anahtarlarını indirir.",
  "Sonraki 5 takvim gününün anahtarlarını indirir.")
r("""<tr><td>Hocanın cihazı 3 iş gününden uzun internetsiz kaldı</td>""",
  """<tr><td>Hocanın cihazı 5 günden uzun internetsiz kaldı</td>""")

# ---- Hile ----
r("""İki istisna var: iletilen yedek kod (dönemde en fazla 2 kez) ve değiştirilmiş uygulama.""",
  """Üç istisna var: iletilen yedek kod, zamanı belirlenemeyen kayıt (bu ikisi birlikte her derste dönem başına en fazla 2 kez kabul edilir) ve değiştirilmiş uygulama.""")
r("""      <li>Telefonun saatini değiştirmek</li>
""", "")
r("""      <li>Başka bir dersin QR'ını (sunucu reddeder) ya da eski bir QR fotoğrafını okutmak</li>""",
  """      <li>Başka bir dersin QR'ını okutmak (sunucu reddeder)</li>""")
r("""      <li>Zamanı belirlenemeyen kayıt</li>""",
  """      <li>Telefonun saatini değiştirmek ya da eski bir QR fotoğrafını okutmak: zaman belirlenebiliyorsa yakalanır. Telefon arada yeniden başlatıldıysa kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>""")
r("""Ayrıntılar ve "yedek kod muaf" işareti <a href="#ek-c">Ek C</a>'de.</p>""",
  """Ayrıntılar <a href="#ek-c">Ek C</a>'de. QR okuyamayan öğrenciyi hoca elle ekler.</p>""")

# ---- neutral reason code instead of "kurul kararı" ----
r('''"kurul kararı" sebep kodu ve belge numarasıyla''', '''"yetkili karar" sebep kodu ve belge numarasıyla''')
r('''diğerleri "kurul kararı" sebep koduyla işlenir''', '''diğerleri "yetkili karar" sebep koduyla işlenir''')
r('''kategorisiz "kurul kararı" koduyla işlenir''', '''kategorisiz "yetkili karar" koduyla işlenir''')

# ---- KVKK ----
r("""Mağazalar, test kanalları ve çökme verisi <a href="#ek-e">Ek E</a>'de, açık soru olarak S15'te.</li>""",
  """Mağazalar, test kanalları ve çökme verisi <a href="#ek-e">Ek E</a>'de. ML Kit için İÜ onayı S15'te soruluyor.</li>""")

# ---- Kapsam ----
r("""Ekran okuyucu desteği, yazı boyutu ve kontrast ayarları. Gerekince "yedek kod muaf" işareti.</li>""",
  """Ekran okuyucu desteği, yazı boyutu ve kontrast ayarları. QR okuyamayan öğrenciyi hoca elle ekler.</li>""")

# ---- Takvim ----
r("""        <li>İÜ sunucusu, SMTP rölesi ve güvenlik testi.</li>""",
  """        <li>İÜ sunucusu (1 Aralık'a kadar), SMTP rölesi ve güvenlik testi.</li>""")
r("""Tek kişi için 9 haftada yüksek risk. Yetişmezse pilot Güz 2027'ye kalır.</li>""",
  """Android kamera modülüyle birlikte (~1 hafta) bu, tek kişi için 9 haftada yüksek bir risk. Yetişmezse pilot Güz 2027'ye kalır.</li>""")
r("""        <li>~20 Ocak: pilot sürümü yüklenir ve BİDB'de yeniden test edilir. TestFlight sürümleri 90 gün geçerli.</li>""",
  """        <li>13 Ocak'a kadar: pilot sürümü BİDB'de yeniden test edilir.</li>
        <li>~20 Ocak: pilot sürümü yüklenir. TestFlight sürümleri 90 gün geçerli. Yeniden test geçmezse pilot, test edilmiş Aralık sürümüyle başlar ve 11 Mart'a kadar yeni bir sürüm yüklenir.</li>""")

# ---- Ölçütler ----
r("Kâğıt imzanın süresi Güz'ün son haftalarında, aynı derslerde kronometreyle ölçülecek.",
  "Kâğıt imzanın süresi Güz'ün son haftalarında, pilot hocalarının derslerinde kronometreyle ölçülecek.")

# ---- Sorular ----
r("""<td data-l="Varsayılan">İzin yok, yalnız yerel bildirim kullanılır.</td>""",
  """<td data-l="Varsayılan">İzin yok. Yalnız yerel bildirim kullanılır, Android'de kendi QR modülümüz çalışır, çökme ölçümü kendi hata kaydımızla yapılır.</td>""")
r("""<td data-l="Varsayılan">İÜ hesabı, sahibi bir öğretim üyesi. İzin gelene kadar nötr bir isim kullanılır. Apple'dan yanıt gelene kadar 99 USD ödenir.</td>""",
  """<td data-l="Varsayılan">İÜ hesabı. Sahibi, rektörlüğün yazılı olarak yetkilendirdiği bir kişi. İzin gelene kadar nötr bir isim kullanılır. Apple'dan yanıt gelene kadar 99 USD ödenir.</td>""")

# ---- Ek A ----
r("""Ders ve şube başına günlük anahtar, her cihaz için ayrı türetilir. Sonraki 3 iş günü için geçerli, en fazla 5 takvim günü.""",
  """Sunucu, ders ve şube başına günlük anahtardan her cihaza ayrı bir anahtar türetir. Cihaza yalnız kendi anahtarı iner, 5 takvim günü için.""")
r("""<td data-l="Seçim">Android'de ZXing (zxing-cpp) kullanılır. Olmazsa ML Kit S15'te onaya sunulur.</td>""",
  """<td data-l="Seçim">Android'de expo-camera yerine kendi kamera modülümüz kullanılır (CameraX ve zxing-cpp). ML Kit ancak İÜ onaylarsa 2. seçenek olur (S15).</td>""")
r("""<td data-l="Seçim">MVP'de mağaza konsolları ve senkron verisi kullanılır. Sentry, İÜ onayıyla sonra.</td>""",
  """<td data-l="Seçim">MVP'de uygulama kendi hata kaydını İÜ sunucusuna gönderir, senkron verisi de kullanılır. Mağaza konsollarına dayanılmaz. Sentry, İÜ onayıyla sonra.</td>""")

# ---- Ek C ----
r("""<tr><td>Başlatma kaydı gelmedi</td><td data-l="Etkisi">Kayıtlar geçici kalır. Hocaya her oturum için bir kez sorulur.""",
  """<tr><td>Başlatma kaydı gelmedi</td><td data-l="Etkisi">Kayıtlar geçici kalır ve hoca cevaplayana kadar sayılmaz. Cevap gelmezse AKSİS sayfasında "KARAR BEKLİYOR" yazar. Hocaya her oturum için bir kez sorulur.""")
r("""<tr><td>Yedek kod oranı %5'i aştı (muaf öğrenciler hariç)</td>""",
  """<tr><td>Yedek kod oranı %5'i aştı</td>""")
r("""Hoca bir öğrenciyi "yedek kod muaf" olarak işaretleyebilir, örneğin görme engelli bir öğrenciyi. Görme engelli öğrenci için hoca kodu sesli okur ya da öğrenciyi elle ekler. Bu işlemler denetim kaydına geçer.""",
  """Öğrenci başına muafiyet işareti tutulmaz, çünkü engellilik bilgisi sağlık verisidir. QR okuyamayan öğrenciyi hoca tarafsız bir sebep koduyla elle ekler ve bu denetim kaydına geçer.""")
r("""          <li>Ders ve şube için (birleşik şubelerde grup için) günlük anahtar üretilir. Hocanın her cihazı kendi anahtarını bundan türetir; anahtar numarası QR'da yer alır. Birleşik şubelerde tek kafa sayısı girilir.</li>""",
  """          <li>Sunucu, ders ve şube (birleşik şubelerde grup) için günlük anahtar üretir ve bundan her cihaza ayrı bir anahtar türetir (HKDF). Cihaza yalnız kendi anahtarı iner, günlük anahtar inmez. Anahtar numarası QR'da yer alır. İptal edilen bir cihazın anahtar numarasıyla gelen kayıtlar reddedilir. Birleşik şubelerde tek kafa sayısı girilir.</li>""")
r("""Çapalar arası en fazla 48 saat olabilir, hız uyumu için mutlak tolerans 2 sn.""",
  """Çapalar arası en fazla 48 saat olabilir. Hız uyumu toleransı 2 sn + aradaki süre × 50 ppm; 48 saatte en fazla ~10,6 sn. Çapa olarak gidiş-dönüş süresi en kısa ölçüm kullanılır.""")
r("""<li>İki senaryo regresyon testi olarak yazılır: "yeniden başlat ve iletilen QR'ı okut" ile "iOS'ta saati kaydır ve okut".</li>""",
  """<li>İki senaryo regresyon testi olarak yazılır: "yeniden başlat ve iletilen QR'ı okut" ile "iOS'ta saati kaydır ve okut". Testin beklediği sonuç, kaydın "belirlenemeyen" olması ve 2'lik sınıra girmesidir.</li>""")
r("""Saat kaynakları uygulamada doğrulanacak. Bunun için tek küçük yerel modül yazılacak.""",
  """Saat kaynakları uygulamada doğrulanacak. Yerel kod iki yerde gerekiyor: saat için küçük bir modül ve Android'de CameraX ile zxing-cpp kullanan kamera modülü (tahmini ~1 hafta ek iş).""")
r("""<li><b>Yedek kod:</b> 6 gizli hane ve 1 kontrol hanesi (Damm), 20-30 sn'de bir değişir. Tahminle tutturma olasılığı her kayıt için 1/1.000.000. Otomatik kabul kuralı Bölüm 3'te.</li>""",
  """<li><b>Yedek kod:</b> 6 gizli hane ve 1 kontrol hanesinden (Damm) oluşur, 20-30 saniyede bir değişir.
        <ul>
          <li>Öğrenci kodu girerken dersi listeden seçer ya da ders kodunu yazar. Her oturumda yalnız bir yedek kod girişi yapılabilir.</li>
          <li>Tahminle tutturma olasılığı, zamanı belirlenebilen kayıtta ~1/1.000.000, belirlenemeyen kayıtta ~1/14.000 (24 dilim × 3 cihaz). İki durumda da 2'lik sınır geçerli.</li>
        </ul>
      </li>""")
r("""<li>expo-camera'da yakınlaştırma 0 ile 1 arasında oransal bir değer. 2x'in karşılığı cihaz başına ayarlanır. Geniş lens seçilir ve iPhone Pro üzerinde denenir.</li>""",
  """<li>iOS'ta expo-camera'daki yakınlaştırma 0 ile 1 arasında oransal bir değer. 2x'in karşılığı cihaz başına ayarlanır, geniş lens seçilir ve iPhone Pro'da denenir. Android'de yakınlaştırma ve lens seçimini kendi CameraX modülümüz yapar.</li>""")

# ---- Ek D ----
r("""<tr><td>Google ML Kit (QR çözme)</td><td data-l="Sürüm">expo-camera'nın Android çözücüsü</td><td data-l="Durum">Elendi. Google'a tanılama ve kullanım verisi gönderiyor. Yerine ZXing kullanılacak.</td></tr>""",
  """<tr><td>zxing-cpp</td><td data-l="Sürüm">3.1.1 (29.07.2026)</td><td data-l="Durum">Seçildi. Android'de QR çözmek için CameraX ile birlikte kullanılacak.</td></tr>
        <tr><td>Google ML Kit (QR çözme)</td><td data-l="Sürüm">expo-camera'nın Android çözücüsü</td><td data-l="Durum">2. seçenek, yalnız İÜ onayıyla (S15). Google'a tanılama ve kullanım verisi gönderiyor.</td></tr>""")

# ---- Ek E ----
r("""<li><b>QR çözücü ve dağıtım:</b> Android'de expo-camera'nın QR çözücüsü Google ML Kit, Google'a tanılama ve kullanım verisi gönderiyor. Bu yüzden Android'de QR, planlanan yerel modüle eklenecek ZXing (zxing-cpp) ile çözülecek; bu yapılamazsa ML Kit S15'te onaya sunulur.""",
  """<li><b>QR çözücü ve dağıtım:</b>
        <ul>
          <li>Android'de expo-camera, Google ML Kit'i varsayılan olarak içeriyor (SDK 57 build.gradle). ML Kit de Google'a tanılama ve kullanım verisi gönderiyor (Google'ın veri açıklaması).</li>
          <li>expo-camera kamera görüntüsünü dışarıya vermediği için ZXing ona eklenemiyor. Bu yüzden Android'de kendi kamera modülümüz (CameraX ve zxing-cpp) yazılacak. Bu tahminen ~1 haftalık ek iş ve 1 Aralık riskini artırıyor.</li>
          <li>ML Kit yalnız İÜ onaylarsa 2. seçenek olur (S15).</li>
        </ul>""")
r("""App Store'daki İÜ hesabı ise AUZEF'e ait (S17). Bir fakülte ya da bölüm kendi başına kurum hesabı açamaz,""",
  """App Store'da AUZEF adıyla (satıcı: "Auzef") yayın yapan bir hesap var, ama hangi tüzel kişi adına açıldığı bilinmiyor (S17). Bir fakülte ya da bölüm Apple'da kendi başına kurum hesabı açamaz,""")
r("""          <li>APK yolu: Android geliştirici doğrulamasının 2027 ve sonrasında bütün dünyada zorunlu olması planlanıyor. 2026-27 pilotunda APK hâlâ çalışıyor.</li>
""", "")
r("""          <li>expo-camera'nın SDK 57'de hâlâ varsayılan olarak ML Kit kullanması.</li>
""", "")
r("""Yeni bir kurum hesabı, D-U-N-S numarası ve doğrulama nedeniyle süreye 2-6 hafta ekler (tahmin).</li>""",
  """Yeni bir kurum hesabı, D-U-N-S numarası ve doğrulama nedeniyle süreye 2-6 hafta ekler (tahmin). APK yolu: Android geliştirici doğrulamasının 2027 ve sonrasında bütün dünyada zorunlu olması planlanıyor; 2026-27 pilotunda APK hâlâ çalışıyor.</li>""")

# ---- Ek F ----
r("""<td data-l="Ölçüt">Çökme yaşamayan kullanıcı (mağaza konsolları); tamamlanan oturum (senkron verisi)</td>""",
  """<td data-l="Ölçüt">Çökme yaşamayan kullanıcı (uygulamanın İÜ sunucusuna gönderdiği hata kaydı); tamamlanan oturum (senkron verisi)</td>""")

# ---- Ek G ----
r("""      <li><b>Zaman aralığı:</b>""",
  """      <li><b>MVP:</b> İlk kullanılabilir sürüm, pilotta kullanılacak en küçük özellik seti.</li>
      <li><b>SSO:</b> Tek oturum açma, bir kurumsal hesapla birçok sisteme giriş.</li>
      <li><b>Docker Compose:</b> Sunucudaki servisleri birlikte kurup çalıştıran araç.</li>
      <li><b>D-U-N-S:</b> Apple'ın kurum hesabı için istediği kurum numarası.</li>
      <li><b>Damm:</b> Tek hanelik yazım hatalarını yakalayan kontrol hanesi yöntemi.</li>
      <li><b>UTC:</b> Dünya saati. Bütün zaman kontrolleri bununla yapılır.</li>
      <li><b>ppm:</b> Milyonda bir. Saat kayması için kullanılır; 50 ppm günde ~4,3 sn eder.</li>
      <li><b>P-256:</b> İmza anahtarının türü.</li>
      <li><b>HKDF:</b> Bir ana anahtardan alt anahtarlar türetme yöntemi.</li>
      <li><b>CameraX:</b> Android'in kamera kütüphanesi.</li>
      <li><b>Zaman aralığı:</b>""")

# ---- Ek H ----
r("""      <li><a href="https://github.com/expo/expo/issues/4817">Expo: QR'da sıfır bayt sorunu (#4817)</a></li>""",
  """      <li><a href="https://github.com/expo/expo/issues/4817">Expo: QR'da sıfır bayt sorunu (#4817)</a> · <a href="https://github.com/zxing-cpp/zxing-cpp/releases/tag/v3.1.1">zxing-cpp 3.1.1</a></li>
      <li><a href="https://developers.google.com/ml-kit/android-data-disclosure">Google ML Kit Android veri açıklaması</a> · <a href="https://developer.apple.com/forums/thread/125634">Apple DTS: kern.boottime</a> · <a href="https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview">TestFlight</a></li>""")

for old, new, n in R:
    c = t.count(old)
    assert c == n, (c, n, old[:100])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

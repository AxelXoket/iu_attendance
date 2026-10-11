"""Round-5 critic fixes (A5, B5, C5). Every old string must match exactly once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

# ---- Tek bakışta: freeze wording ----
R.append(("Güvenlik testine yetişmek için çekirdek özellikler 1 Aralık'ta dondurulmalı.",
          "Güvenlik testine yetişmek için MVP 1 Aralık'ta tamamlanıp dondurulmalı. Bu, tek kişi için yüksek bir risk."))

# ---- Kararlar ----
R.append(("hocanın her cihazına ayrı türetilir ve 3 gün önceden indirilir.",
          "hocanın her cihazına ayrı türetilir ve sonraki 3 iş günü için (en fazla 5 takvim günü) önceden indirilir."))
R.append(("""<td data-l="Karar">Expo SDK 57 (React 19.2), expo-sqlite ve drizzle</td>""",
          """<td data-l="Karar">Expo SDK 57 (React 19.2), expo-sqlite ve drizzle. Android'de QR, ML Kit yerine ZXing ile çözülür.</td>"""))
R.append(("""<td data-l="2. seçenek">Flutter 3.47. PWA ise açık soru (G-B).</td>""",
          """<td data-l="2. seçenek">Flutter 3.47. Öğrenci için PWA elendi (Ek A).</td>"""))

# ---- Akış ----
R.append(("Önümüzdeki 3 ders gününün anahtarlarını indirir.",
          "Sonraki 3 iş gününün (en fazla 5 takvim günü) anahtarlarını indirir."))
R.append(("""<tr><td>Okuttuktan sonra şarjı bitti</td><td data-l="Ne olur">Kayıt telefonda durur. Zamanı, aynı açılıştaki zaman çapasından hesaplanır.</td></tr>""",
          """<tr><td>Okuttuktan sonra şarjı bitti</td><td data-l="Ne olur">Kayıt telefonda durur. Android'de zamanı okutmadan önceki çapadan hesaplanır (çapa 24 saatten yeniyse). iOS'ta zamanı belirlenemeyen sayılır ve otomatik kabul kuralına girer (Bölüm 3).</td></tr>"""))
R.append(("""<tr><td>Hocanın cihazı 3 günden uzun internetsiz kaldı</td>""",
          """<tr><td>Hocanın cihazı 3 iş gününden uzun internetsiz kaldı</td>"""))
R.append(("""<td data-l="Ne olur">Gecikmeler aynı başlatma değerindeki kayıtların ortancasına göre ölçülür. Kayıt 8'den azsa cihazın ölçülen saat farkı kullanılır. Fark 10 dakikayı aşarsa ders işaretlenir.</td>""",
          """<td data-l="Ne olur">Gecikme, hoca cihazının her senkronda ölçülen saat farkına göre hesaplanır. Bu fark 10 dakikayı aşarsa ya da kayıtların ortancası referanstan saparsa ders işaretlenir.</td>"""))

# ---- Hile ----
R.append(("""<p class="small">Kâğıtta herkes herkesin yerine imza atabiliyor. Bu sistemde hile için ya telefonu derse getirmek ya da canlı aktarım yapmak gerekiyor.</p>""",
          """<p class="small">Kâğıtta herkes herkesin yerine imza atabiliyor. Bu sistemde hile için çoğunlukla telefonu derse getirmek ya da canlı aktarım yapmak gerekiyor. İki istisna var: iletilen yedek kod (dönemde en fazla 2 kez) ve değiştirilmiş uygulama.</p>"""))
R.append(("""<li>Çalınan hoca anahtarı: anahtar cihaza özel ve 3 gün geçerli. Bilinmeyen başlatma değerleri hocaya sorulur.</li>""",
          """<li>Çalınan hoca anahtarı: anahtar cihaza özel ve en fazla 5 takvim günü geçerli. Bilinmeyen başlatma değerleri ve kayıp diye iptal edilen cihazın kayıtları incelemeye düşer.</li>"""))
R.append(("Sıra, QR'daki zaman aralığına göredir. Dışa aktarılmış bir kayıt sonradan yerinden edilmez.",
          "Sıra, kaydın zaman aralığına göredir; yedek kodda bu, kodun zaman dilimidir. Bu sıralama, dışa aktarılmış bir kaydın durumunu değiştirmez."))

# ---- Mevzuat ----
R.append(("""MVP'de belge numarasıyla girilen bir "Görevli (Md.35 / ilgili mevzuat)" durumu olacak. İlgili mevzuattaki istisnalar ve engelli öğrenciler için kurul düzenlemeleri (Md.36) de bu durumla işlenir.</li>""",
          """MVP'de belge numarasıyla girilen bir "Görevli (Md.35)" durumu olacak. İlgili mevzuattaki diğer istisnalar ve engelli öğrenciler için yapılan kurul düzenlemeleri (Md.36) uygulamada ayrı bir kategori olarak tutulmaz, çünkü sağlık bilgisi açığa çıkabilir. Bu durumlarda düzeltme yalnız "kurul kararı" sebep kodu ve belge numarasıyla yapılır.</li>"""))
R.append(("""  <ol class="small">
    <li>Hakkının yarısını kullandın.</li>""",
          """  <p class="small">Dönem ortasında seviye, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır ve seviye geri gitmez (Ek C).</p>
  <ol class="small">
    <li>Hakkının yarısını kullandın.</li>"""))

# ---- KVKK ----
R.append(("""      Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır. Uygulama bunlara kişisel veri göndermez.""",
          """      Android'de expo-camera'nın QR çözücüsü Google ML Kit, Google'a tanılama ve kullanım verisi gönderiyor. Bu yüzden Android'de QR, planlanan yerel modüle eklenecek ZXing (zxing-cpp) ile çözülecek. Bu yapılamazsa ML Kit S15'te onaya sunulur. Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır, uygulama bunlara kişisel veri göndermez. Pilotta test kullanıcısı listesi tutulmaz: iOS'ta TestFlight'ın herkese açık linki, Android'de İÜ hesabından Play açık testi kullanılır."""))

# ---- Kapsam ----
R.append(("""Devamsızlığı düşüren izinler, Md.35 görevlendirmesi ve ilgili mevzuattaki durumlarla sınırlı. Bunlar "Görevli" durumuyla belge numarası girilerek işlenir. Diğer izinler sayımı değiştirmez. Rapor ise sağlık verisidir (S5).""",
          """Devamsızlığı düşüren izinler, Md.35 görevlendirmesi ve ilgili mevzuattaki durumlarla sınırlı. Md.35 "Görevli" durumuyla, diğerleri "kurul kararı" sebep koduyla işlenir, kategori tutulmaz. Diğer izinler sayımı değiştirmez. Rapor ise sağlık verisidir (S5)."""))

# ---- Takvim ----
R.append(("""        <li>Çekirdeğin 1 Aralık'ta dondurulması. Çekirdek şunlardan oluşuyor: kayıt ve giriş, ders tanımı ve liste içe aktarma, Başlat-QR-okutma-senkron, sunucu doğrulaması, devam hesabı, AKSİS sayfası ve hesap silme. Bu 9 hafta demek, tek kişi için sıkı. Çekirdek zamanında donmazsa pilot Güz 2027'ye kalır.</li>""",
          """        <li>MVP'nin 1 Aralık'ta tamamlanıp dondurulması. Güvenlik testi, yetki gerektiren bütün akışları kapsamalı:
          <ul>
            <li>giriş, ders ve liste yönetimi</li>
            <li>Başlat, QR, okutma ve senkron</li>
            <li>sunucu doğrulaması, inceleme ve onay</li>
            <li>rollere göre elle düzeltme</li>
            <li>cihaz değişimi ve iptali</li>
            <li>takvim, Md.35 ve muafiyet</li>
            <li>devam hesabı, AKSİS sayfası ve hesap silme</li>
          </ul>
          İÜ sunucusu da 1 Aralık'ta hazır olmalı. ~20 Ocak sürümü BİDB'de yeniden test edilir. Bunun için 9 hafta var ve tek kişi için bu yüksek bir risk. MVP zamanında donmazsa pilot Güz 2027'ye kalır.</li>"""))
R.append(("""        <li>iOS'ta PWA yedek olamaz. Zaman çapası ve arka plan görevi PWA'da çalışmadığı için protokol taşınamıyor.</li>""",
          """        <li>iOS'ta PWA yedek olamaz, çünkü zaman çapası ve arka plan görevi PWA'da çalışmıyor (eleştirmen çıkarımı, Ek A). Yalnız Android ile pilot yapılmaz, yoksa iOS kullanan öğrenciler dışarıda kalır.</li>"""))
R.append(("""        <li>1 Aralık: ana özellikler tamamlanıp dondurulur.</li>""",
          """        <li>1 Aralık: MVP dondurulur, İÜ sunucusu hazır olur, güvenlik testi başlar.</li>"""))
R.append(("""        <li>Güz finallerinden önce, 21 Aralık'a kadar: TestFlight beta incelemesi ve Play kapalı testi.</li>
        <li>~20 Ocak: pilot sürümü yüklenir. TestFlight sürümleri 90 gün geçerli.</li>""",
          """        <li>Güz finallerinden önce, 21 Aralık'a kadar: TestFlight beta incelemesi (herkese açık link) ve Play açık testi.</li>
        <li>~20 Ocak: pilot sürümü yüklenir ve BİDB'de yeniden test edilir. TestFlight sürümleri 90 gün geçerli.</li>"""))
R.append(("""        <li>Expo: pilotta ücretsiz, kampüs genelinde ayda ~19 USD gerekebilir.</li>""",
          """        <li>Expo: ücretsiz planın derleme hakkı yeterli. Sunucuları yurtdışında olduğu için EAS Update kullanılmaz, güncellemeler mağazadan gelir.</li>"""))

# ---- Ölçütler ----
R.append(("Kâğıt imzanın süresi ilk iki haftada kronometreyle ölçülecek.",
          "Kâğıt imzanın süresi Güz'ün son haftalarında, aynı derslerde kronometreyle ölçülecek."))

# ---- Sorular ----
R.append(("Hocaya bir iş günü gerekiyorsa senkron süresi Cuma 23:59'da kapatılır.",
          "Pazar günü giriş kabul edilir. Edilmezse senkron süresi Perşembe 23:59'da kapanır, son Cuma dersinin kayıtlarını hoca ayrıca kontrol eder."))
R.append(("Her derste dönem başına 2 otomatik kabul (Bölüm 3).",
          "Her öğrenci için her derste dönem başına 2 otomatik kabul (Bölüm 3)."))
R.append(("""<td>S15. Push gibi yurtdışı aktarıma izin var mı? Öğrenci e-posta kutularının Google'da olması sorun mu?</td><td data-l="Neden">Push bildirimleri buna bağlı.</td>""",
          """<td>S15. Şu yurtdışı aktarımlara izin var mı: push, mağaza konsollarındaki çökme verisi, Android'de ML Kit? Öğrenci e-posta kutularının Google'da olması sorun mu?</td><td data-l="Neden">Push, çökme izleme ve QR çözücü seçimi buna bağlı.</td>"""))
R.append(("Uygulama hangi hesaptan yayınlanacak (AUZEF hesabı kullanılabilir mi)?",
          "Uygulama hangi hesaptan yayınlanacak (AUZEF hesabı kullanılabilir mi)? Apple hesabının yasal yetkili sahibi (Account Holder) kim olacak?"))
R.append(("""      <tr><td>G-B. Öğrenci tarafı PWA mı olsun, yerel uygulama mı?</td><td data-l="Neden">PWA mağazayı devreden çıkarırdı. Ama iOS'ta zaman çapası ve arka plan görevi yok, kayıtlar silinebilir, kamera yakınlaştırma belirsiz.</td><td data-l="Varsayılan">Yerel uygulama. Öğrenci için PWA elendi, yalnız hoca paneli PWA.</td></tr>
""", ""))
R.append(("<td>G-C. Kaç kişi kod yazacak?</td>", "<td>G-B. Kaç kişi kod yazacak?</td>"))
R.append(("<td>G-D. Pilot hangi dönemde yapılacak?</td>", "<td>G-C. Pilot hangi dönemde yapılacak?</td>"))

# ---- Ek A ----
R.append(("Ders ve şube başına günlük anahtar, her cihaz için ayrı türetilir, 3 gün geçerli.",
          "Ders ve şube başına günlük anahtar, her cihaz için ayrı türetilir. Sonraki 3 iş günü için geçerli, en fazla 5 takvim günü."))
R.append(("""        <tr><td>Hız hedefi</td>""",
          """        <tr><td>QR çözücü</td><td data-l="Ayrışma">01 expo-camera'yı seçti. E, Android'de expo-camera'nın Google ML Kit kullandığını ve ML Kit'in Google'a tanılama verisi gönderdiğini gösterdi.</td><td data-l="Seçim">Android'de ZXing (zxing-cpp) kullanılır. Olmazsa ML Kit S15'te onaya sunulur.</td></tr>
        <tr><td>Görevli durumu</td><td data-l="Ayrışma">Bir önceki sürüm "ilgili mevzuat" ve Md.36 durumlarını da bu duruma bağlıyordu. 05'e göre Md.36 düzenlemeleri sağlık verisi.</td><td data-l="Seçim">Görevli durumu yalnız Md.35 için. Diğer durumlar kategorisiz "kurul kararı" koduyla işlenir.</td></tr>
        <tr><td>Hız hedefi</td>"""))

# ---- Ek B note ----
R.append(("Türkçe karşılıkları Bölüm 9'daki S1-S18 ve G-A..G-D sorularında.",
          "Türkçe karşılıkları Bölüm 9'daki S1-S19 ve G-A..G-C sorularında."))

# ---- Ek C ----
R.append(("""<tr><td>Başlatma kaydı gelmedi</td><td data-l="Etkisi">Planlı derste kayıtlar geçerlidir. Planlanmamış derste kayıtlar bekler.</td><td data-l="Kim">Hoca "ders yapıldı" der</td></tr>""",
          """<tr><td>Başlatma kaydı gelmedi</td><td data-l="Etkisi">Kayıtlar geçici kalır. Hocaya her oturum için bir kez sorulur. Kayıp diye iptal edilen cihazın kayıtları incelemeye düşer.</td><td data-l="Kim">Hoca, tek dokunuşla</td></tr>"""))
R.append(("""<td data-l="Etkisi">Ders işaretlenir. Gecikme ortancaya göre ölçülür. Kayıtlar sayılmaya devam eder.</td>""",
          """<td data-l="Etkisi">Ders işaretlenir. Gecikme, ölçülen saat farkı düzeltilerek hesaplanır. Kayıtlar sayılmaya devam eder.</td>"""))
R.append(("""              <li>iOS'ta açılış kimliği yok. <code>kern.boottime</code> saat değiştirilince kayıyor (Apple DTS). Bu yüzden iOS'ta kayıt ancak okutmanın iki yanındaki çapalar aynı hızla uyuşursa zamanlanır. Tek yanlı iOS kaydı "belirlenemeyen" sayılır. Dürüst öğrencide bu nadir olur, çünkü senkron uygulama açılınca yapılır ve o anda ikinci çapa alınır.</li>""",
          """              <li>iOS'ta açılış kimliği yok. <code>kern.boottime</code> saat değiştirilince kayıyor (Apple DTS). Bu yüzden iOS'ta bir kaydın zamanı ancak okutmanın iki yanındaki çapalar aynı hızla uyuşursa hesaplanır. Çapalar arası en fazla 48 saat olabilir, hız uyumu için mutlak tolerans 2 sn. Tek yanlı iOS kaydı "belirlenemeyen" sayılır. Senkron uygulama açılınca yapıldığı ve o anda ikinci çapa alındığı için bunun seyrek olması bekleniyor; oranı pilotta ölçülecek (Ek F).</li>"""))
R.append(("""<li>Android'de tek çapa varsa gecikme eşiğine, çapaya olan uzaklığın her günü için 50 ppm eklenir. Çapa 24 saatten eskiyse kaydın zamanı "belirlenemeyen" sayılır.</li>""",
          """<li>Android'de tek çapa varsa gecikme eşiğine, çapadan bu yana geçen süre × 50 ppm eklenir (günde ~4,3 sn). Çapa 24 saatten eskiyse kaydın zamanı "belirlenemeyen" sayılır.</li>"""))
R.append(("""          <li>Aynı başlatma değerindeki kayıtların ortancasına göre ölçülür. Kayıt 8'den azsa hoca cihazının ölçülen saat farkı kullanılır.</li>""",
          """          <li>Referans, hoca cihazının ölçülen saat farkıdır. Aynı başlatma değerindeki kayıtların ortancası bu referanstan eşikten fazla saparsa ders işaretlenir. Böylece iletilen kayıtlar çoğunlukta olsa bile ortancayı kaydıramaz.</li>"""))
R.append(("""          <li>Tarayıcı en az 1080p görüntü istemeli. 640x480 yetmeyebilir; bu bir tahmin.</li>""",
          """          <li>Tarayıcı en az 1080p görüntü istemeli. 640x480 yetmeyebilir; bu bir tahmin.</li>
          <li>expo-camera'da yakınlaştırma 0 ile 1 arasında oransal bir değer. 2x'in karşılığı cihaz başına ayarlanır. Geniş lens seçilir ve iPhone Pro üzerinde denenir.</li>"""))
R.append(("""      <li><b>Hoca paneli:</b>""",
          """      <li><b>Uyarı hesabı:</b> Dönem ortasında uyarı seviyesi, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır, seviye geri gitmez. Yalnız yapılan saatlerle hesaplansaydı, ilk hafta 3 saatlik bir dersi kaçıran öğrenci 1-3. haftalarda "hakkını aştın" uyarısı alırdı. Bunun için regresyon testi zorunlu.</li>
      <li><b>Hoca paneli:</b>"""))

# ---- Ek D ----
R.append(("""<tr><td>expo-sqlite + drizzle-orm</td><td data-l="Sürüm">57.0.3; 0.45.3 (21.09.2026)</td><td data-l="Durum">Seçildi.</td></tr>""",
          """<tr><td>expo-sqlite + drizzle-orm</td><td data-l="Sürüm">57.0.3 (11.09.2026); 0.45.3 (21.09.2026)</td><td data-l="Durum">Seçildi.</td></tr>
        <tr><td>op-sqlite</td><td data-l="Sürüm">18.2.5 (20.09.2026)</td><td data-l="Durum">2. seçenek. Performans gerekirse kullanılır, drizzle ile çalışıyor.</td></tr>
        <tr><td>Next.js</td><td data-l="Sürüm">16.3.6 (22.09.2026)</td><td data-l="Durum">Elendi, hoca paneli için. Sunucu tarafında sayfa üretmeye gerek yok, panel çevrimdışı çalışan statik bir PWA.</td></tr>"""))
R.append(("""<tr><td>Keycloak</td>""",
          """<tr><td>Firebase Auth</td><td data-l="Sürüm">-</td><td data-l="Durum">Elendi. Veri yurtdışında. E-posta linkiyle giriş özelliği, Dynamic Links 25.08.2025'te kapanınca yeniden yazılmak zorunda kaldı.</td></tr>
        <tr><td>Keycloak</td>"""))
R.append(("""<tr><td>xlsx (npm)</td><td data-l="Sürüm">0.18.5</td>""",
          """<tr><td>xlsx (npm)</td><td data-l="Sürüm">0.18.5 (24.03.2022)</td>"""))
R.append(("""      <li>Öğrenci için PWA (iOS'ta protokolü taşıyamıyor)</li>
""", ""))
R.append(("""        <tr><td>Cihaz kimliği özeti (IDFV / ANDROID_ID)</td>""",
          """        <tr><td>Öğrenci için PWA</td><td data-l="Sürüm">-</td><td data-l="Durum">Elendi. iOS'ta zaman çapası ve arka plan görevi yok, kayıtlar silinebilir. Bu eleştirmenin çıkarımı; 09, QR için PWA'yı gerçekçi bulmuştu.</td></tr>
        <tr><td>Google ML Kit (QR çözme)</td><td data-l="Sürüm">expo-camera'nın Android çözücüsü</td><td data-l="Durum">Elendi. Google'a tanılama ve kullanım verisi gönderiyor. Yerine ZXing kullanılacak.</td></tr>
        <tr><td>EAS Update</td><td data-l="Sürüm">-</td><td data-l="Durum">Elendi. Sunucuları yurtdışında. Güncellemeler mağazadan gelir.</td></tr>
        <tr><td>Cihaz kimliği özeti (IDFV / ANDROID_ID)</td>"""))

# ---- Ek E ----
R.append(("""Play'de İÜ adına yayın yapan bir hesap var (<code>edu.istanbul.mobile</code>). App Store'daki İÜ hesabı ise AUZEF'e ait (S17).</li>""",
          """Play'de İÜ adına yayın yapan bir hesap var (<code>edu.istanbul.mobile</code>). App Store'daki İÜ hesabı ise AUZEF'e ait (S17). Bir fakülte ya da bölüm kendi başına kurum hesabı açamaz, başvuruyu imza yetkisi olan biri yapar; öğrenci bunu yapamaz. Yeni bir kurum hesabı, D-U-N-S numarası ve doğrulama nedeniyle süreye 2-6 hafta ekler (tahmin).</li>"""))
R.append(("""          <li>APK yolu: Android geliştirici doğrulaması 2027'den itibaren küresel olarak zorunlu hale geliyor.</li>""",
          """          <li>APK yolu: Android geliştirici doğrulamasının 2027 ve sonrasında bütün dünyada zorunlu olması planlanıyor. 2026-27 pilotunda APK hâlâ çalışıyor.</li>
          <li>Apple 5.1.1(ix) kuralının bu uygulamaya uygulanması.</li>
          <li>expo-camera'nın SDK 57'de hâlâ varsayılan olarak ML Kit kullanması.</li>"""))

# ---- Ek F ----
R.append(("""        <tr><td>Ders tanımlama</td>""",
          """        <tr><td>Listeyle eşleşme</td><td data-l="Ölçüt">Hocanın elle onayına düşen kayıt oranı; yanlış eşleşme</td><td data-l="Hedef">≤%5; 0</td></tr>
        <tr><td>Ders tanımlama</td>"""))
R.append(("""<td data-l="Ölçüt">Zamanı belirlenemeyen kayıtların oranı</td>""",
          """<td data-l="Ölçüt">Zamanı belirlenemeyen kayıtların oranı (Android ve iOS ayrı raporlanır)</td>"""))

# ---- Ek G ----
R.append(("""      <li><b>Kafa sayısı:</b>""",
          """      <li><b>Zaman aralığı:</b> QR'ın 5 saniyelik dilimi. Yedek kodda kodun geçerli olduğu dilim.</li>
      <li><b>ML Kit / ZXing:</b> Google'ın görüntü tanıma kütüphanesi / açık kaynak QR çözücü.</li>
      <li><b>Kafa sayısı:</b>"""))

for old, new in R:
    n = t.count(old)
    assert n == 1, (n, old[:100])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

"""Round-4 critic fixes (A4, B4, C4) applied to the assembled HTML. Every old string must match exactly once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")

R = []  # (old, new)

# ---------- Tek bakışta ----------
R.append(("Push dahil hiçbir yurtdışı servis İÜ hukuk biriminin onayı olmadan kullanılmaz.",
          "Kişisel veri işleyen hiçbir yurtdışı servis, push dahil, İÜ hukuk biriminin onayı olmadan kullanılmaz."))
R.append(("""    <li><b>Takvimi belirleyen:</b> Gerçek veriyle pilot yapmak için İÜ protokolü, İÜ sunucusu ve güvenlik testi gerekiyor. Takvimi kod değil, bunlar belirliyor.</li>""",
          """    <li><b>Takvimi belirleyen:</b> Gerçek veriyle pilot için İÜ protokolü, İÜ sunucusu, güvenlik testi ve İÜ mağaza hesabı gerekiyor. Güvenlik testine yetişmek için çekirdek özellikler 1 Aralık'ta dondurulmalı.</li>"""))
R.append(("""<p class="small muted">Sürümler, tarihler ve elenen seçeneklerin gerekçeleri <a href="#ek-d">Ek D</a>'de.</p>""",
          """<p class="small muted">Sürümler, tarihler ve elenen seçeneklerin gerekçeleri <a href="#ek-d">Ek D</a>'de. Terimler <a href="#ek-g">Ek G</a>'de.</p>"""))

# ---------- Kararlar ----------
R.append(("""<td data-l="Karar">React 19, kurulabilir PWA</td>""",
          """<td data-l="Karar">React 19 ve Vite 8, kurulabilir PWA (Workbox). Anahtarlar tarayıcıda dışa aktarılamaz biçimde saklanır.</td>"""))
R.append(("""<td data-l="2. seçenek">pdfmake</td>""",
          """<td data-l="2. seçenek">Yazmada SheetJS (stilsiz), PDF'te pdfmake. Okumada 2. seçenek yok (Ek D).</td>"""))

# ---------- Akış ----------
R.append(("""    <li><b>Hocanın cihazı:</b> Önümüzdeki 3 günün anahtarlarını indirir.</li>""",
          """    <li><b>Hocanın cihazı:</b> Önümüzdeki 3 ders gününün anahtarlarını indirir. Son internet bağlantısında süre azsa uyarır.</li>"""))
R.append(("""        <li>QR öğrencinin derslerinden birine ait değilse ve telefondaki liste güncelse telefon reddeder.</li>
        <li>Liste güncel değilse kaydı bekletir.</li>""",
          """        <li>Telefon ders üyeliğine bakarak reddetmez. QR öğrencinin listesindeki bir derse ait değilse kaydı saklar ve "Listende yok, liste yüklenince değerlendirilir" der. Ders kaydını sunucu denetler.</li>"""))
R.append(("""    <li>Hoca kafa sayısını girer ve yoklamayı kapatır. Pilot boyunca kafa sayısı her derste girilir.</li>""",
          """    <li>Yoklama seçilen süre dolunca kendiliğinden kapanır. Süre varsayılan 10 dakikadır ve hoca değiştirebilir. Hoca yoklamayı istediği an elle de kapatabilir. Kafa sayısı pilot boyunca her derste girilir.</li>"""))
R.append(("""        <li>Senkron süresi 7 gün. Son haftada bu süre, AKSİS son gününden bir önceki gün 23:59'da biter; yine de en az 24 saat tanınır.</li>""",
          """        <li>Senkron süresi 7 gündür, ama AKSİS son gününden bir önceki gün 23:59'da biter. Süre her durumda en az 24 saattir.</li>"""))

# ---------- Hile ----------
R.append(("""      <li>Başka bir dersin QR'ını ya da eski bir QR fotoğrafını okutmak</li>""",
          """      <li>Başka bir dersin QR'ını (sunucu reddeder) ya da eski bir QR fotoğrafını okutmak</li>"""))
R.append(("""      <li>QR'ı mesajla iletmek: gecikme eşiği ilk olarak 8-10 sn, pilotta ayarlanacak.</li>""",
          """      <li>QR'ı mesajla iletmek (değiştirilmemiş uygulamada): gecikme eşiği ilk olarak 8-10 sn, pilotta ayarlanacak.</li>"""))
R.append(("""    <div class="card risk"><h4>Önlenemez (kâğıt da önleyemiyor)</h4><ul>""",
          """    <div class="card risk"><h4>Önlenemez</h4><ul>"""))
R.append(("""Her öğrenci için her derste dönem başına en fazla 2 tanesi otomatik kabul edilir; sıra okutma zamanına göredir. Fazlası incelemeye düşer. Hoca bir öğrenciyi "yedek kod muaf" olarak işaretleyebilir, örneğin görme engelli bir öğrenciyi. Bu işlem denetim kaydına geçer.""",
          """Her öğrenci için her derste dönem başına en fazla 2 tanesi otomatik kabul edilir. Sıra, QR'daki zaman aralığına göredir. Dışa aktarılmış bir kayıt sonradan yerinden edilmez. Fazlası incelemeye düşer. Hoca bir öğrenciyi "yedek kod muaf" olarak işaretleyebilir, örneğin görme engelli bir öğrenciyi. Görme engelli öğrenci için hoca kodu sesli okur ya da öğrenciyi elle ekler. Bu işlemler denetim kaydına geçer."""))

# ---------- Mevzuat ----------
R.append(("""    <li><b>Md.20:</b> Devamsızlık dışı bir nedenle tekrar alınan derste devam şartı yok. Bunun için bir "muaf" alanı olacak. Devam nota katılabilir.</li>""",
          """    <li><b>Md.20:</b> Devamsızlık dışı bir nedenle tekrar alınan derste devam şartı yok. Bunun için bir "muaf" alanı olacak. Devam nota katılabilir; pilot bölümde katılıp katılmadığı S10'da soruluyor.</li>"""))
R.append(("""MVP'de belge numarasıyla girilen bir "Görevli (Md.35)" durumu olacak.</li>""",
          """MVP'de belge numarasıyla girilen bir "Görevli (Md.35 / ilgili mevzuat)" durumu olacak. İlgili mevzuattaki istisnalar ve engelli öğrenciler için kurul düzenlemeleri (Md.36) de bu durumla işlenir.</li>"""))
R.append(("""<p class="small">Burada T, yapılan ders saatlerinin toplamıdır. Ondalıklı sayıyla yapılan hesap %80'de 39 durumda yanlış sonuç veriyor (Ek C). Bu yüzden regresyon testi zorunlu.</p>""",
          """<p class="small">T, yapılan ders saatlerinin toplamıdır. Ondalıklı hesap yanlış sonuç veriyor (Ek C), bu yüzden bu hesap için regresyon testi zorunlu.</p>"""))

# ---------- KVKK ----------
R.append(("""    <li><b>Hukuki sebep:</b> Md.5(2)(ç), hukuki yükümlülük.""",
          """    <li><b>Hukuki sebep:</b> KVKK Md.5(2)(ç), hukuki yükümlülük."""))
R.append(("""      Öğrenci e-posta kutularının Google'da olması ayrıca sorulmalı (S15).</li>""",
          """      Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır. Uygulama bunlara kişisel veri göndermez. Mağaza konsollarındaki çökme verisini Apple ve Google kendi hizmetleri kapsamında topluyor. Bu durum ve öğrenci e-posta kutularının Google'da olması S15'te soruluyor.</li>"""))

# ---------- Kapsam ----------
R.append(("""<td data-l="Not">Devamsızlığı düşüren tek izin Md.35 görevlendirmesi, diğer izinler sayımı değiştirmiyor. Rapor ise sağlık verisi (S5).</td>""",
          """<td data-l="Not">Devamsızlığı düşüren izinler, Md.35 görevlendirmesi ve ilgili mevzuattaki durumlarla sınırlı. Bunlar "Görevli" durumuyla belge numarası girilerek işlenir. Diğer izinler sayımı değiştirmez. Rapor ise sağlık verisidir (S5).</td>"""))
R.append(("""Sayfada öğrenciler liste sırasıyla, toplam, yüzde ve DEVAMLI/DEVAMSIZ bilgisiyle yer alır.</td>""",
          """Sayfada öğrenciler liste sırasıyla yer alır. Teori ve uygulama için ayrı sütunlarda toplam, yüzde ve DEVAMLI/DEVAMSIZ bilgisi bulunur.</td>"""))
R.append(("""<td data-l="Not">Değişiklikler uygulanmadan önce gösterilir. Çıkarılan öğrenci pasif olur, silinmez. Böylece yanlış dosya yüklenince kayıt kaybolmaz, ekle-bırakta çıkan öğrencinin geçmişi korunur.</td>""",
          """<td data-l="Not">Değişiklikler uygulanmadan önce gösterilir. Çıkarılan öğrenci silinmez, pasif olur. Böylece yanlış bir dosya kayıt kaybettirmez ve dersten çıkan öğrencinin geçmişi korunur.</td>"""))
R.append(("""<td data-l="Not">5 saniyede bir değişir. Diğer üniversitelerde bu süre 10-15 saniye.</td>""",
          """<td data-l="Not">5 saniyede bir değişir.</td>"""))
R.append(("""<td data-l="Not">Sabit kod elendi, çünkü gruplarda anında dolaşır. Indiana Üniversitesi'nde Top Hat ile bu yaşandı.</td>""",
          """<td data-l="Not">Sabit kod elendi, çünkü öğrenci gruplarında anında dolaşır.</td>"""))
R.append(("""    <li><b>Hesap:</b> Cihaz bağlama ve yüz yüze cihaz değişimi. Hesap kurtarma: e-posta koduyla yeniden giriş yapılır, telefon değiştiyse yüz yüze onay gerekir.</li>""",
          """    <li><b>Hesap:</b> Cihaz bağlama ve yüz yüze cihaz değişimi. Hesap kurtarma: e-posta koduyla yeniden giriş yapılır, telefon değiştiyse yüz yüze onay gerekir. Gönderilmemiş kayıt varken çıkış yapılamaz ve hesap silinemez.</li>"""))

# ---------- Takvim ----------
R.append(("""    <li><b>Pilotu kaydıran ön koşullar:</b> Hepsi 15 Aralık'a kadar tamamlanmalı, başvuruların son günü 2 Ekim.
      <ul>
        <li>İÜ protokolü ve VERBİS kaydı</li>
        <li>İÜ sunucusu, SMTP rölesi ve güvenlik testi. Güvenlik testine yetişmesi için ana özellikler 1 Aralık'ta tamamlanıp dondurulmalı. Bu 9 hafta demek, tek kişi için sıkı bir süre.</li>
        <li>Aydınlatma metinleri</li>
      </ul>
    </li>""",
          """    <li><b>Pilotu kaydıran ön koşullar:</b> Hepsi 15 Aralık'a kadar tamamlanmalı. Başvurular için hedef tarih 2 Ekim.
      <ul>
        <li>İÜ protokolü ve VERBİS kaydı.</li>
        <li>İÜ sunucusu, SMTP rölesi ve güvenlik testi.</li>
        <li>Aydınlatma metinleri.</li>
        <li>İÜ mağaza hesabı (aşağıda).</li>
        <li>Çekirdeğin 1 Aralık'ta dondurulması. Çekirdek şunlardan oluşuyor: kayıt ve giriş, ders tanımı ve liste içe aktarma, Başlat-QR-okutma-senkron, sunucu doğrulaması, devam hesabı, AKSİS sayfası ve hesap silme. Bu 9 hafta demek, tek kişi için sıkı. Çekirdek zamanında donmazsa pilot Güz 2027'ye kalır.</li>
      </ul>
    </li>"""))
R.append(("""    <li><b>Mağaza hesabı:</b> Pilotu kaydırmaz, olmazsa yedek yol kullanılır.
      <ul>
        <li>Apple (5.1.1(ix)), hassas veri işleyen uygulamanın kurum hesabından yayınlanmasını istiyor.</li>
        <li>Play, kamu adına yapılan uygulamanın kurum hesabından yayınlanmasını istiyor. Bunun İÜ için de geçerli olduğu bir çıkarım. Kurum hesaplarına 12 kişi x 14 gün test şartı uygulanmıyor.</li>
        <li>İÜ'nün Play hesabı var (<code>edu.istanbul.mobile</code>). App Store'daki hesap AUZEF'e ait; başka bir birimin bu hesabı kullanıp kullanamayacağı belirsiz (S17).</li>
        <li>Yedek yol: iOS'ta PWA. Android'de PWA ya da doğrudan APK kurulumu.</li>
      </ul>
    </li>""",
          """    <li><b>Mağaza hesabı:</b> İÜ'nün kurum hesabı pilot için ön koşul.
      <ul>
        <li>Apple ve Play, hassas veri işleyen ya da kamu adına yapılan uygulamaları kurum hesabından istiyor (Ek E).</li>
        <li>iOS'ta PWA yedek olamaz. Zaman çapası ve arka plan görevi PWA'da çalışmadığı için protokol taşınamıyor.</li>
        <li>Android'de doğrudan APK kurulumu yalnız son çare (Ek E).</li>
      </ul>
    </li>"""))
R.append(("""        <li>Güz finallerinden önce (21 Aralık): TestFlight beta incelemesi ve Play kapalı testi.</li>
        <li>25 Ocak: pilot başlar. İlk haftanın kayıtları, sınıf listesi yüklendiğinde (29 Ocak-2 Şubat) eşleşir. Ekle-bırak bitince liste yeniden yüklenir.</li>
        <li>~22 Mart: yeni TestFlight sürümü. Sürümler 90 gün geçerli, dönem ise 95 gün.</li>""",
          """        <li>Güz finallerinden önce, 21 Aralık'a kadar: TestFlight beta incelemesi ve Play kapalı testi.</li>
        <li>~20 Ocak: pilot sürümü yüklenir. TestFlight sürümleri 90 gün geçerli.</li>
        <li>25 Ocak: pilot başlar. İlk haftanın kayıtları, sınıf listesi yüklendiğinde (29 Ocak-2 Şubat) eşleşir. Ekle-bırak bitince liste yeniden yüklenir.</li>
        <li>En geç 10 Nisan: yeni TestFlight sürümü yüklenir.</li>"""))
R.append(("""    <li><b>Maliyet:</b> Karar verdirecek büyüklükte değil.
      <ul>
        <li>Apple: yılda 99 USD. Kurum muafiyeti olup olmadığı sorulmalı.</li>
        <li>Google: bir kez 25 USD.</li>
        <li>Expo: pilotta ücretsiz. Kampüs geneline yayılırsa ayda ~19 USD gerekebilir.</li>
        <li>Sunucu: İÜ'nün sunucusu.</li>
        <li>Veri hacmi: <a href="#ek-d">Ek D</a>'de.</li>
      </ul>
    </li>""",
          """    <li><b>Maliyet:</b> Karar verdirecek büyüklükte değil.
      <ul>
        <li>Apple: yılda 99 USD.</li>
        <li>Google: bir kez 25 USD.</li>
        <li>Expo: pilotta ücretsiz, kampüs genelinde ayda ~19 USD gerekebilir.</li>
        <li>Sunucu: İÜ.</li>
      </ul>
      Veri hacmi <a href="#ek-d">Ek D</a>'de.
    </li>"""))
R.append(("""        <li>Devamsızlığın AKSİS'e işlenmesi için son gün 20 Aralık ve 2 Mayıs. İkisi de Pazar gününe denk geliyor.</li>""",
          """        <li>Devamsızlığın AKSİS'e işlenmesi için son gün 20 Aralık ve 2 Mayıs. İkisi de Pazar gününe denk geliyor. Senkron süresi Cumartesi 23:59'da biteceği için hocaya AKSİS girişi için yalnız Pazar günü kalıyor (S3).</li>"""))

# ---------- Ölçütler ----------
R.append(("""    <li><b>Hocanın zamanı:</b> Ders başına en fazla 2 dk. Kâğıt imzanın süresi ilk iki haftada ölçülecek.</li>""",
          """    <li><b>Hocanın zamanı:</b> Ders başına en fazla 2 dk. Kâğıt imzanın süresi ilk iki haftada kronometreyle ölçülecek.</li>"""))

# ---------- Sorular ----------
R.append(("""<td>S1. Geçen seferki sistem hangisiydi, sorun neydi?</td><td data-l="Neden">Bu konuda hiçbir kaynak yok.</td>""",
          """<td>S1. Geçen seferki sistem hangisiydi, sorun neydi?</td><td data-l="Neden">Aynı hata tekrarlanmasın diye soruluyor. Bu konuda hiçbir kaynak yok.</td>"""))
R.append(("""<td data-l="Varsayılan">Toplam ve DEVAMLI/DEVAMSIZ girilir. Son tarih genel takvime göre: 20 Aralık / 2 Mayıs.</td>""",
          """<td data-l="Varsayılan">Toplam ve DEVAMLI/DEVAMSIZ girilir. Son tarih genel takvime göre 20 Aralık / 2 Mayıs. Hocaya bir iş günü gerekiyorsa senkron süresi Cuma 23:59'da kapatılır.</td>"""))
R.append(("""<td>S13. Veri sorumlusu, protokolü imzalayacak kişi, KVKK irtibat kişisi ve ihlal bildiriminin gideceği yer kim?</td>""",
          """<td>S13. Protokolü kim imzalayacak? KVKK irtibat kişisi kim, ihlal bildirimi kime gidecek?</td>"""))
R.append(("""<td>S14. BİDB sunucu, yedekleme, güvenlik testi, SMTP rölesi, alan adı ve nöbetçi sorumlu sağlayabilir mi? Google ile girişe izin verir mi?</td>""",
          """<td>S14. BİDB sunucu, yedekleme, güvenlik testi, SMTP rölesi, alan adı ve nöbetçi sorumlu sağlayabilir mi? Güvenlik testi ne kadar sürer? Google ile girişe izin verir mi?</td>"""))
R.append(("""<td data-l="Varsayılan">İÜ hesabı, sahibi bir öğretim üyesi. İzin gelene kadar nötr bir isim kullanılır. Muafiyet için Apple'a başvurulur.</td>""",
          """<td data-l="Varsayılan">İÜ hesabı, sahibi bir öğretim üyesi. İzin gelene kadar nötr bir isim kullanılır. Apple'dan yanıt gelene kadar 99 USD ödenir.</td>"""))
R.append(("""      <tr><td>S18. Pilot bölümde birlikte işlenen şubeler var mı?</td><td data-l="Neden">QR yalnız bir şubeye aitse diğer şubenin telefonları reddeder.</td><td data-l="Varsayılan">Birlikte işlenen şubeler tek yoklamada birleştirilir.</td></tr>""",
          """      <tr><td>S18. Pilot bölümde birlikte işlenen şubeler var mı?</td><td data-l="Neden">Şubelerin tek yoklamada birleştirilip birleştirilmeyeceğini belirler.</td><td data-l="Varsayılan">Birleştirilir. Grup için ayrı bir anahtar ve tek bir kafa sayısı kullanılır.</td></tr>
      <tr><td>S19. Pilot dersliklerde projeksiyon cihazına nasıl bağlanılıyor (HDMI, USB-C)?</td><td data-l="Neden">Hoca kendi cihazının ekranını yansıtacak.</td><td data-l="Varsayılan">Hoca kendi adaptörünü getirir.</td></tr>"""))
R.append(("""<td data-l="Neden">PWA mağaza sürecini ortadan kaldırır. Ama iOS'ta kayıtlar silinebilir, zamanlanmış bildirim yok, kamera yakınlaştırma desteği belirsiz.</td><td data-l="Varsayılan">Yerel uygulama. iOS Safari'de 1 günlük denemeyle kesinleşir.</td>""",
          """<td data-l="Neden">PWA mağazayı devreden çıkarırdı. Ama iOS'ta zaman çapası ve arka plan görevi yok, kayıtlar silinebilir, kamera yakınlaştırma belirsiz.</td><td data-l="Varsayılan">Yerel uygulama. Öğrenci için PWA elendi, yalnız hoca paneli PWA.</td>"""))

# ---------- Ek A additions ----------
R.append(("""        <tr><td>Hız hedefi</td>""",
          """        <tr><td>iOS yedek yolu</td><td data-l="Ayrışma">09, PWA'yı yedek olarak öneriyordu. E, PWA'nın zaman çapası ve arka plan görevi olmadan protokolü taşıyamayacağını gösterdi.</td><td data-l="Seçim">İÜ mağaza hesabı ön koşul. Öğrenci için PWA elendi.</td></tr>
        <tr><td>Telefonda ders üyeliği kontrolü</td><td data-l="Ayrışma">Önceki taslakta "liste güncelse reddet" deniyordu. E, bu kuralla ilk haftanın bütün okutmalarının reddedileceğini gösterdi.</td><td data-l="Seçim">Telefon hiç reddetmez, saklar. Ders kaydını sunucu denetler.</td></tr>
        <tr><td>Hız hedefi</td>"""))

# ---------- Ek C ----------
R.append(("""        <tr><td>Yedek kod oranı %5'i aştı</td><td data-l="Etkisi">Ders işaretlenir.</td><td data-l="Kim">Hoca</td></tr>
        <tr><td>Hocanın saat farkı 10 dakikayı aştı</td><td data-l="Etkisi">Ders işaretlenir.</td><td data-l="Kim">Hoca</td></tr>""",
          """        <tr><td>Yedek kod oranı %5'i aştı (muaf öğrenciler hariç)</td><td data-l="Etkisi">Ders işaretlenir. Kayıtlar sayılmaya devam eder.</td><td data-l="Kim">Hoca</td></tr>
        <tr><td>Hocanın saat farkı 10 dakikayı aştı</td><td data-l="Etkisi">Ders işaretlenir. Gecikme ortancaya göre ölçülür. Kayıtlar sayılmaya devam eder.</td><td data-l="Kim">Hoca</td></tr>
        <tr><td>Dönem kilidinden sonra gelen geçerli kayıt</td><td data-l="Etkisi">Saklanır ve gösterilir. Sayım yalnız denetim kaydı bırakan bir düzeltmeyle değişir.</td><td data-l="Kim">Hoca</td></tr>"""))
R.append(("""          <li>Yük Base45 alfanümerik olarak ~47 karakter tutar, QR sürüm 3-M'ye sığar (kapasite 61). Ham bayt kullanılmaz, çünkü iOS'ta sıfır baytta kesilme raporları var.</li>""",
          """          <li>Yük Base45 alfanümerik olarak ~47 karakter tutar. Başına ve sonuna boşluk olmayan sabit bir işaret eklenince ~51 karakter olur, QR sürüm 3-M'ye sığar (kapasite 61). Ham bayt kullanılmaz, çünkü iOS'ta sıfır baytta kesilme raporları var.</li>"""))
R.append(("""          <li>Ders ve şube için günlük anahtar üretilir. Hocanın her cihazı kendi anahtarını bundan türetir; anahtar numarası QR'da yer alır.</li>
          <li>Cihaz iptal edilince o cihazın anahtarları yenilenir.</li>""",
          """          <li>Ders ve şube için (birleşik şubelerde grup için) günlük anahtar üretilir. Hocanın her cihazı kendi anahtarını bundan türetir; anahtar numarası QR'da yer alır. Birleşik şubelerde tek kafa sayısı girilir.</li>
          <li>Cihaz iptal edilince o cihazın anahtarları yenilenir.</li>
          <li>Hocanın cihaz listesi panelde görünür. Her yeni cihaz için e-posta gider. Cihaz sayısı en fazla 3.</li>"""))
R.append(("""          <li>Sunucu, bir ders, şube ve saat için bildirilen bütün başlatma değerlerini kabul eder. Bilinmeyen bir değer taşıyan kayıtlar gruplanıp hocaya tek dokunuşla sorulur.</li>""",
          """          <li>Sunucu, bir ders, şube ve saat için bildirilen bütün başlatma değerlerini kabul eder. Başlatma değerleri senkron süresinin sonunda sınıflanır. Bilinmeyen bir değer taşıyan kayıtlar gruplanıp hocaya tek dokunuşla sorulur.</li>"""))
R.append(("""          <li>"Aynı açılış mı" kararı yalnız telefonda, açılış kimliğine bakılarak verilir: Android'de <code>BOOT_COUNT</code>, iOS'ta <code>kern.boottime</code>. iOS'ta bu değer Apple'ın 35F9.1 kuralı gereği cihazdan çıkmaz; sunucuya yalnız aralıklar ve evet/hayır gider.</li>
          <li>Okutmanın iki yanında birer çapa varsa zaman aralarında ölçülen hızla hesaplanır. Çapalar tutarsızsa kaydın zamanı "belirlenemeyen" sayılır.</li>
          <li>Tek çapa varsa gecikme eşiğine, çapaya olan uzaklık başına 50 ppm eklenir.</li>""",
          """          <li>"Aynı açılış mı" kararı yalnız telefonda verilir. Sunucuya yalnız aralıklar ve evet/hayır gider.
            <ul>
              <li>Android'de <code>BOOT_COUNT</code> kullanılır.</li>
              <li>iOS'ta açılış kimliği yok. <code>kern.boottime</code> saat değiştirilince kayıyor (Apple DTS). Bu yüzden iOS'ta kayıt ancak okutmanın iki yanındaki çapalar aynı hızla uyuşursa zamanlanır. Tek yanlı iOS kaydı "belirlenemeyen" sayılır. Dürüst öğrencide bu nadir olur, çünkü senkron uygulama açılınca yapılır ve o anda ikinci çapa alınır.</li>
            </ul>
          </li>
          <li>İki yanda çapa varsa zaman, aralarında ölçülen hızla hesaplanır. Çapalar tutarsızsa kaydın zamanı "belirlenemeyen" sayılır.</li>
          <li>Android'de tek çapa varsa gecikme eşiğine, çapaya olan uzaklığın her günü için 50 ppm eklenir. Çapa 24 saatten eskiyse kaydın zamanı "belirlenemeyen" sayılır.</li>"""))
R.append(("""          <li>"Yeniden başlat ve iletilen QR'ı okut" senaryosu regresyon testi olarak yazılır.</li>""",
          """          <li>İki senaryo regresyon testi olarak yazılır: "yeniden başlat ve iletilen QR'ı okut" ile "iOS'ta saati kaydır ve okut".</li>"""))
R.append(("""      <li><b>Senkron süresi:</b> 7 gün. Son haftada AKSİS son gününden bir önceki gün 23:59'a (İstanbul) kadar, ama en az 24 saat.</li>""",
          """      <li><b>Senkron süresi:</b> Her ders için 7 gün ile AKSİS son gününden bir önceki gün 23:59 (İstanbul saati) arasında hangisi önce gelirse. Her durumda en az 24 saat.</li>"""))
R.append(("""      <li><b>Ondalıklı hesap hatası:</b>""",
          """      <li><b>Hoca paneli:</b> Vite 8.3.1 (24.09.2026) ve Workbox 7.4.1 (04.05.2026) kullanılır. Anahtarlar WebCrypto'nun dışa aktarılamayan anahtarı olarak IndexedDB'de tutulur. Verinin silinmemesi için <code>storage.persist()</code> istenir ve panel kurulabilir PWA olarak kullanılır.</li>
      <li><b>Ondalıklı hesap hatası:</b>"""))
R.append(("""          <li>Play Integrity kotası günde 10.000 istek; artırılması yaklaşık 1 hafta sürüyor.</li>
          <li>Şubat 2026'dan beri yeni bir P-384 kök sertifikası var.</li>""",
          """          <li>Play Integrity kotası günde 10.000 istek. Artırılması bir haftaya kadar sürebiliyor.</li>
          <li>Android anahtar doğrulaması için Şubat 2026'dan beri yeni bir P-384 kök sertifikası kullanılıyor.</li>"""))

# ---------- Ek D ----------
R.append(("""<td data-l="Sürüm">0.20.3, Temmuz 2024. O tarihten beri yeni sürüm yok.</td><td data-l="Durum">Seçildi, okuma için. Eski xls ve HTML .xls dosyalarını okuyabilen tek olgun seçenek.</td>""",
          """<td data-l="Sürüm">0.20.3, npm aynasına göre Temmuz 2024</td><td data-l="Durum">Seçildi, okuma için. Eski .xls ve HTML .xls dosyalarını da okuyabiliyor. Okumada 2. seçenek yok, çünkü exceljs .xls okuyamıyor, npm'deki xlsx paketinde de güvenlik açığı var. Yazmada 2. seçenek SheetJS'in kendi yazıcısı, ama ücretsiz sürümü stil yazamıyor.</td>"""))
R.append(("""<td data-l="Sürüm">0.15.1 (17.07.2026) / 0.3.11 / 25.12.0 (son ikisinin tarihi kaynakta yok)</td>""",
          """<td data-l="Sürüm">0.15.1 (17.07.2026) / 0.3.11 (12.06.2026) / 25.12.0 (23.09.2026)</td>"""))
R.append(("""      <li>UBYS Mobil'in puanı 2,1. Bunun bir nedeni, iPhone Pro'larda kameranın 0,5x açılması.</li>""",
          """      <li>UBYS Mobil'in puanı 2,1. Kullanıcı yorumlarına göre bunun bir nedeni iPhone Pro'larda kameranın 0,5x açılması.</li>
      <li>Indiana Üniversitesi'nde paylaşılan Top Hat kodlarıyla kopya vakaları yaşandı.</li>"""))
R.append(("""      <li>Katılma isteği ve numara önerisi</li>""",
          """      <li>Katılma isteği ve numara önerisi</li>
      <li>Öğrenci için PWA (iOS'ta protokolü taşıyamıyor)</li>"""))

# ---------- Ek E ----------
R.append(("""      <li><b>Yurtdışına aktarım:</b> Standart sözleşme, noter onaylı çeviri ve 5 iş günü içinde Kuruma bildirim gerekir. Kamu kurumları rıza ve sözleşme istisnalarını kullanamaz (Md.9(7)).</li>""",
          """      <li><b>Yurtdışına aktarım:</b> Standart sözleşme, noter onaylı çeviri ve 5 iş günü içinde Kuruma bildirim gerekir. Kamu kurumları, kamu hukukuna tabi faaliyetlerinde rıza ve sözleşme istisnalarını kullanamaz (KVKK Md.9(7)).</li>
      <li><b>Kurum hesabı kuralları:</b> Apple 5.1.1(ix), hassas veri işleyen uygulamanın kurum hesabından gönderilmesini istiyor. Play, kamu adına yapılan uygulamanın kurum hesabından yayınlanmasını istiyor. Kurum hesaplarına 12 kişi x 14 gün test şartı uygulanmıyor. Play'de İÜ adına yayın yapan bir hesap var (<code>edu.istanbul.mobile</code>). App Store'daki İÜ hesabı ise AUZEF'e ait (S17).</li>"""))
R.append(("""          <li>Play'in kamu uygulaması kuralının İÜ'ye uygulanması.</li>""",
          """          <li>Play'in kamu uygulaması kuralının İÜ'ye uygulanması ve <code>edu.istanbul.mobile</code> hesabının İÜ'nün kurum hesabı olması.</li>
          <li>APK yolu: Android geliştirici doğrulaması 2027'den itibaren küresel olarak zorunlu hale geliyor.</li>"""))

# ---------- Ek F ----------
R.append(("""<td data-l="Ölçüt">Ders başına süre; 60'tan fazla öğrencisi olan hoca için kâğıda göre haftalık kazanç</td>""",
          """<td data-l="Ölçüt">Ders başına süre; 60 ve üzeri öğrencisi olan hoca için kâğıda göre haftalık kazanç</td>"""))
R.append(("""        <tr><td>Senkron</td>""",
          """        <tr><td>Giriş</td><td data-l="Ölçüt">E-posta kodunun 1 dakika içinde ulaşma oranı</td><td data-l="Hedef">≥%98</td></tr>
        <tr><td>Ders tanımlama</td><td data-l="Ölçüt">Bir dersin kurulum süresi; yanlış üretilen oturum</td><td data-l="Hedef">≤10 dk; 0</td></tr>
        <tr><td>Birleşik şube</td><td data-l="Ölçüt">Yanlış şube diye reddedilen geçerli kayıt</td><td data-l="Hedef">0</td></tr>
        <tr><td>Senkron</td>"""))

# ---------- Ek G ----------
R.append(("""      <li><b>OTA:</b> Mağazaya gitmeden uygulamaya kod güncellemesi göndermek.</li>""",
          """      <li><b>APK:</b> Android uygulama dosyası; mağaza olmadan doğrudan kurulabilir.</li>
      <li><b>npm:</b> JavaScript paketlerinin yayımlandığı kayıt.</li>
      <li><b>RG:</b> Resmî Gazete.</li>
      <li><b>Workbox / Vite:</b> PWA'yı çevrimdışı çalıştıran kütüphane / web uygulaması derleme aracı.</li>"""))

for old, new in R:
    n = t.count(old)
    assert n == 1, (n, old[:90])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

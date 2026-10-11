"""Round-7 critic fixes (A7, B7, C7). Every old string must match exactly once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

def r(old, new):
    R.append((old, new))

# ---- Tek bakışta / §3 lead ----
r("""<li><b>Önlenemeyen:</b> Canlı aktarım, arkadaşının telefonunu derse getirmek ve değiştirilmiş uygulama. Kâğıt da bunları önleyemiyor.</li>""",
  """<li><b>Önlenemeyen:</b> Canlı aktarım, arkadaşının telefonunu derse getirmek, Android'de ikinci profil (Güvenli Klasör) ve değiştirilmiş uygulama. Kâğıt imza da bunları önleyemiyor.</li>""")
r("""Üç istisna var: iletilen yedek kod, zamanı belirlenemeyen kayıt (bu ikisi birlikte her derste dönem başına en fazla 2 kez kabul edilir) ve değiştirilmiş uygulama.""",
  """Dört istisna var: iletilen yedek kod ve zamanı belirlenemeyen kayıt (bu ikisi birlikte her öğrenci için her derste dönem başına en fazla 2 kez kabul edilir), Android'de ikinci profil ve değiştirilmiş uygulama.""")

# ---- Kararlar ----
r("""<td data-l="Neden">İnternet ve konum gerekmez. Tek izin kamera.</td>""",
  """<td data-l="Neden">İnternet ve konum gerekmez. Doğrulama için tek izin kamera.</td>""")
r("""QR, iOS'ta expo-camera ile okunur. Android'de ML Kit yerine kendi kamera modülümüz kullanılır (CameraX ve zxing-cpp 3.1.1).</td>""",
  """QR, iOS'ta expo-camera ile okunur. Android'de expo-camera derlemeye hiç alınmaz ve ML Kit yerine kendi kamera modülümüz kullanılır (CameraX ve zxing-cpp 3.1.1).</td>""")
r("""Uygulama kendi hata kaydını İÜ sunucusuna gönderir.</td>""",
  """Uygulama kendi hata ve çökme kaydını İÜ sunucusuna gönderir (Bölüm 5).</td>""")

# ---- neutral correction code ----
r('''Bu durumlarda düzeltme yalnız "yetkili karar" sebep kodu ve belge numarasıyla yapılır.</li>''',
  '''Bu durumlarda düzeltme, genel "belgeli düzeltme" koduyla ve belge numarasıyla yapılır.</li>''')
r('''diğerleri "yetkili karar" sebep koduyla işlenir, kategori tutulmaz.''',
  '''diğerleri genel "belgeli düzeltme" koduyla işlenir, kategori tutulmaz.''')
r('''Diğer durumlar kategorisiz "yetkili karar" koduyla işlenir.''',
  '''Diğer durumlar genel "belgeli düzeltme" koduyla işlenir.''')

# ---- warnings: corrections recompute ----
r("""<p class="small">Dönem ortasında seviye, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır ve seviye geri gitmez (Ek C).</p>""",
  """<p class="small">Dönem ortasında seviye, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır. Tahmin değişti diye seviye geri gitmez. Ama bir düzeltme yapılırsa seviye yeniden hesaplanır ve öğrenciye bildirilir (Ek C).</p>""")
r("""Dönem ortasında uyarı seviyesi, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır, seviye geri gitmez.""",
  """Dönem ortasında uyarı seviyesi, yapılan ve kalan planlı saatlerin toplamı üzerinden hesaplanır. Tahmin değişince seviye geri gitmez. Bir düzeltme, örneğin Md.35 kaydı girildiğinde ise seviye yeniden hesaplanır ve öğrenciye bildirilir.""")

# ---- KVKK: error log ----
r("""<li><b>Saklama:</b> Kayıt resmi sayılırsa""",
  """<li><b>Hata kaydı:</b> Uygulama İÜ sunucusuna şunları gönderir: hata türü, yığın izi, uygulama ve işletim sistemi sürümü, kurulum başına rastgele bir kimlik. Yerel çökmeler bir sonraki açılışta okunur (Android'de ApplicationExitInfo, iOS'ta MetricKit). Kayıtlar 90 gün saklanır ve aydınlatma metninde belirtilir.</li>
    <li><b>Saklama:</b> Kayıt resmi sayılırsa""")

# ---- Takvim ----
r("""<li>İÜ sunucusu (1 Aralık'a kadar), SMTP rölesi ve güvenlik testi.</li>""",
  """<li>İÜ sunucusu ve SMTP rölesi (1 Aralık'a kadar). Güvenlik testinin geçmesi ve yüksek önemde bulgu kalmaması.</li>""")
r("""<li>~20 Ocak: pilot sürümü yüklenir. TestFlight sürümleri 90 gün geçerli. Yeniden test geçmezse pilot, test edilmiş Aralık sürümüyle başlar ve 11 Mart'a kadar yeni bir sürüm yüklenir.</li>""",
  """<li>~20 Ocak: pilot sürümü yüklenir. TestFlight sürümleri 90 gün geçerli, bu yüzden her sürümden en geç 80 gün sonra yenisi yüklenir. Yeniden test geçmezse pilot, testi geçmiş Aralık sürümüyle başlar. Sonraki her sürüm ya test edilmiş koddan çıkar ya da BİDB'de yeniden test edilir.</li>""")
r("""İÜ sunucusu da 1 Aralık'ta hazır olmalı. ~20 Ocak sürümü BİDB'de yeniden test edilir.""",
  """İÜ sunucusu ve SMTP rölesi de 1 Aralık'ta hazır olmalı. Pilot sürümü 13 Ocak'a kadar BİDB'de yeniden test edilir.""")

# ---- Sorular ----
r("""çökme ölçümü kendi hata kaydımızla yapılır.</td>""",
  """çökme ölçümü kendi hata kaydımızla yapılır. Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi; e-posta koduyla giriş bundan etkilenmez.</td>""")

# ---- Ek A ----
r("""MVP'de uygulama kendi hata kaydını İÜ sunucusuna gönderir, senkron verisi de kullanılır.""",
  """MVP'de uygulama kendi hata ve çökme kaydını İÜ sunucusuna gönderir. Yerel çökmeler Android'de ApplicationExitInfo, iOS'ta MetricKit ile okunur. Senkron verisi de kullanılır.""")

# ---- Ek C ----
r("""İptal edilen bir cihazın anahtar numarasıyla gelen kayıtlar reddedilir.""",
  """Bir cihaz iptal edilince:
            <ul>
              <li>Başlatma kaydı iptalden önce sunucuya ulaşmış oturumların kayıtları normal değerlendirilir.</li>
              <li>Diğer kayıtlar incelemeye düşer; hocaya her oturum için bir kez sorulur.</li>
              <li>Yalnız iptal edilen cihazın kendi senkronu reddedilir.</li>
              <li>İptal edilen cihaz numarası bir daha kullanılmaz. Yeniden eklenen cihaz yeni bir numara alır. Numaralar ders içinde tektir.</li>
              <li>Bunun regresyon testi yazılır: cihaz kaybolur, iptal edilir, öğrenci geç senkronlar, kayıt reddedilmez.</li>
            </ul>""")
r("""          <li>Cihaz iptal edilince o cihazın anahtarları yenilenir.</li>
""", "")
r("""<li>İki senaryo regresyon testi olarak yazılır: "yeniden başlat ve iletilen QR'ı okut" ile "iOS'ta saati kaydır ve okut". Testin beklediği sonuç, kaydın "belirlenemeyen" olması ve 2'lik sınıra girmesidir.</li>""",
  """<li>Regresyon testleri:
            <ul>
              <li>"Yeniden başlat ve iletilen QR'ı okut": kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>
              <li>"iOS'ta yeniden başlatmadan saati kaydır ve okut": gecikme yakalanır, kayıt incelemeye düşer.</li>
            </ul>
          </li>""")
r("""<li>Tahminle tutturma olasılığı, zamanı belirlenebilen kayıtta ~1/1.000.000, belirlenemeyen kayıtta ~1/14.000 (24 dilim × 3 cihaz). İki durumda da 2'lik sınır geçerli.</li>""",
  """<li>Tahminle tutturma olasılığı, zamanı belirlenebilen kayıtta milyonda birkaç düzeyinde. Zamanı belirlenemeyen kayıtta geçerli kod aralığı büyüdüğü için on binde bir düzeyine çıkabilir (tahmin). İki durumda da 2'lik sınır geçerli.</li>""")
r("""Android 14'te tam zamanlı alarm varsayılan olarak kapalı, bu yüzden bildirim 1 saate kadar gecikebilir.</li>""",
  """Android 14'te tam zamanlı alarm varsayılan olarak kapalı, bu yüzden bildirim 1 saate kadar gecikebilir. Yerel bildirimler için ayrıca bildirim izni istenir. İzin verilmezse uygulama içinde uyarı gösterilir.</li>""")

# ---- Ek D ----
r("""<td data-l="Durum">2. seçenek, yalnız İÜ onayıyla (S15). Google'a tanılama ve kullanım verisi gönderiyor.</td></tr>""",
  """<td data-l="Durum">2. seçenek, yalnız İÜ onayıyla (S15). Google'a tanılama ve kullanım verisi gönderiyor. Android derlemesinde expo-camera autolinking dışında bırakılır (<code>expo.autolinking.android.exclude</code>). Derleme sırasında APK'da ML Kit, Google kod tarayıcısı ve RECORD_AUDIO izni bulunmadığı kontrol edilir. iOS'ta mikrofon izni kapatılır.</td></tr>
        <tr><td>react-native-vision-camera</td><td data-l="Sürüm">5.2.3 (20.08.2026)</td><td data-l="Durum">Android kamerası için 2. seçenek. Kod tarayıcısı Android'de yine ML Kit kullanıyor, ZXing için topluluk eklentisi gerekiyor.</td></tr>""")

# ---- Ek E ----
r("""Bu tahminen ~1 haftalık ek iş ve 1 Aralık riskini artırıyor.</li>""",
  """Bu tahminen ~1 haftalık ek iş ve 1 Aralık riskini artırıyor. expo-camera, Android derlemesinde autolinking dışında bırakılır. Aksi hâlde ML Kit uygulamaya yine girer (expo #39449).</li>""")

# ---- Ek F ----
r("""        <tr><td>Listeyle eşleşme</td>""",
  """        <tr><td>Tek katılım</td><td data-l="Ölçüt">Aynı oturumda aynı öğrenci için sayılan çift kayıt (testle)</td><td data-l="Hedef">0</td></tr>
        <tr><td>Hesap kurtarma</td><td data-l="Ölçüt">Yeni telefonla yoklamaya dönme süresi, yüz yüze onay dahil</td><td data-l="Hedef">≤1 ders günü</td></tr>
        <tr><td>Hoca onayı</td><td data-l="Ölçüt">Hoca hesabının onaylanma süresi</td><td data-l="Hedef">≤2 iş günü</td></tr>
        <tr><td>Listeyle eşleşme</td>""")
r("""<tr><td>Benimsenme</td>""", """<tr><td>Benimseme</td>""")
r("""Çökme yaşamayan kullanıcı (uygulamanın İÜ sunucusuna gönderdiği hata kaydı)""",
  """Çökme yaşamayan kullanıcı (İÜ sunucusuna gönderilen hata kaydı; yerel çökmeler bir sonraki açılışta okunur)""")

# ---- Ek G ----
r("""      <li><b>MVP:</b>""",
  """      <li><b>Ürün adları:</b>
        <ul>
          <li>Expo: React Native tabanlı mobil geliştirme platformu.</li>
          <li>React: arayüz kütüphanesi.</li>
          <li>TypeScript: tip denetimli JavaScript.</li>
          <li>Fastify: Node.js sunucu çatısı.</li>
          <li>PostgreSQL: veritabanı.</li>
          <li>Flutter: Google'ın mobil geliştirme çatısı.</li>
          <li>SheetJS: Excel okuma kütüphanesi.</li>
          <li>drizzle: veritabanı erişim kütüphanesi.</li>
          <li>ApplicationExitInfo / MetricKit: Android'in ve iOS'un çökme bilgisini veren sistem arayüzleri.</li>
          <li>autolinking: Expo'nun kütüphaneleri derlemeye otomatik ekleme mekanizması.</li>
        </ul>
      </li>
      <li><b>MVP:</b>""")

for old, new in R:
    c = t.count(old)
    assert c == 1, (c, old[:100])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

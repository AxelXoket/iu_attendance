"""Round-8 critic fixes (A8, B8, C8). Every old string must match exactly once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

def r(old, new):
    R.append((old, new))

# crash log without native code
r("""<li><b>Hata kaydı:</b> Uygulama İÜ sunucusuna şunları gönderir: hata türü, yığın izi, uygulama ve işletim sistemi sürümü, kurulum başına rastgele bir kimlik. Yerel çökmeler bir sonraki açılışta okunur (Android'de ApplicationExitInfo, iOS'ta MetricKit). Kayıtlar 90 gün saklanır ve aydınlatma metninde belirtilir.</li>""",
  """<li><b>Hata kaydı:</b> JavaScript hataları genel hata yakalayıcıyla toplanır. Uygulamanın düzgün kapanıp kapanmadığı bir sonraki açılışta bir işaretle anlaşılır; böylece yerel çökmeler de sayılır ama ayrıntısı olmadan. İÜ sunucusuna giden bilgiler: hata türü, JavaScript yığın izi, uygulama ve işletim sistemi sürümü, kurulum başına rastgele bir kimlik. Kayıtlar 90 gün saklanır ve aydınlatma metninde belirtilir.</li>""")
r("""MVP'de uygulama kendi hata ve çökme kaydını İÜ sunucusuna gönderir. Yerel çökmeler Android'de ApplicationExitInfo, iOS'ta MetricKit ile okunur. Senkron verisi de kullanılır.""",
  """MVP'de uygulama JavaScript hatalarını ve düzgün kapanmama işaretini İÜ sunucusuna gönderir. Bunun için yerel kod gerekmez. Senkron verisi de kullanılır. Yerel çökme ayrıntısı (ApplicationExitInfo, MetricKit) sonraki faza kaldı, çünkü E bunun üçüncü bir yerel modül gerektirdiğini gösterdi.""")
r("""Çökme yaşamayan kullanıcı (İÜ sunucusuna gönderilen hata kaydı; yerel çökmeler bir sonraki açılışta okunur)""",
  """Çökme yaşamayan kullanıcı (düzgün kapanma işareti ve İÜ sunucusuna gönderilen hata kaydı)""")
r("""<li>ApplicationExitInfo / MetricKit: Android'in ve iOS'un çökme bilgisini veren sistem arayüzleri.</li>""",
  """<li>ApplicationExitInfo / MetricKit: Android'in ve iOS'un çökme ayrıntısını veren sistem arayüzleri (sonraki faz).</li>""")
r("""      <li>Otomatik imha</li>""",
  """      <li>Otomatik imha</li>
      <li>Yerel çökme ayrıntısı (ApplicationExitInfo, MetricKit)</li>""")

# S15 legal inference + fallback
r("""Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi; e-posta koduyla giriş bundan etkilenmez.</td>""",
  """Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi, bu yüzden e-posta koduyla girişin etkilenmeyeceği düşünülüyor (çıkarım, hukuk birimi teyit etmeli). Aksi görüş çıkarsa girişte yerli bir SMS sağlayıcısı kullanılır.</td>""")

# revocation scope, found device queue, edge row
r("""Bilinmeyen başlatma değerleri ve kayıp diye iptal edilen cihazın kayıtları incelemeye düşer.</li>""",
  """Bilinmeyen başlatma değerleri incelemeye düşer. Kayıp diye iptal edilen cihazın kayıtları da, başlatma kaydı iptalden önce sunucuya ulaşmamışsa incelemeye düşer.</li>""")
r("""Kayıp diye iptal edilen cihazın kayıtları incelemeye düşer.</td>""",
  """Kayıp diye iptal edilen cihazın kayıtları da, başlatma kaydı iptalden önce sunucuya ulaşmamışsa incelemeye düşer.</td>""")
r("""Kayıp cihaz web panelinden iptal edilir ve anahtarları yenilenir.""",
  """Kayıp cihaz web panelinden iptal edilir, numarası bir daha kullanılmaz.""")
r("""<li>Yalnız iptal edilen cihazın kendi senkronu reddedilir.</li>""",
  """<li>İptal edilen cihazın kendi senkronu reddedilir. Cihaz bulunursa, kuyruğundaki kafa sayısı, düzeltme ve onaylar hocaya onay için gösterilir.</li>""")

# unscheduled start does not count until confirmed
r("""<li>Bir ders, başlatma kaydı ya da elle giriş varsa yapılmış sayılır.</li>""",
  """<li>Planlı bir ders, başlatma kaydı ya da elle giriş varsa yapılmış sayılır. Programda olmayan bir başlatma, hoca "Ders yapıldı mı?" sorusunu onaylayıp saati girene kadar sayılmaz.</li>""")

# Android anchors: later same-boot anchor, split regression test
r("""<li>Android'de tek çapa varsa gecikme eşiğine,""",
  """<li>Okutmadan sonra aynı açılışta alınan çapa da kullanılır, örneğin senkron anında alınan. Android'de tek çapa varsa gecikme eşiğine,""")
r("""<li>"Yeniden başlat ve iletilen QR'ı okut": kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>""",
  """<li>Android, "okut, yeniden başlat, sonra senkronla": kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>
              <li>Android, "yeniden başlat, iletilen QR'ı okut, aynı açılışta senkronla": zaman belirlenir ve gecikme yakalanır.</li>""")

# panel receipt decoder
r("""<tr><td>zxing-cpp</td><td data-l="Sürüm">3.1.1 (29.07.2026)</td><td data-l="Durum">Seçildi. Android'de QR çözmek için CameraX ile birlikte kullanılacak.</td></tr>""",
  """<tr><td>zxing-cpp</td><td data-l="Sürüm">3.1.1 (29.07.2026)</td><td data-l="Durum">Seçildi. Android'de QR çözmek için CameraX ile birlikte kullanılacak.</td></tr>
        <tr><td>zxing-wasm</td><td data-l="Sürüm">3.1.4 (10.09.2026)</td><td data-l="Durum">Seçildi. Hoca panelinde makbuz QR'ını okumak için. Masaüstü tarayıcıların çoğunda yerleşik QR okuyucu yok. Yedek olarak makbuzda elle yazılabilen kısa bir kod var.</td></tr>""")
r("""<li><b>Makbuz:</b> İmzalı kayıt bir QR olarak gösterilir. Hoca bu QR'ı panelde okutup doğrular.""",
  """<li><b>Makbuz:</b> İmzalı kayıt bir QR olarak gösterilir. Hoca bu QR'ı panelde okutup doğrular (zxing-wasm). Kamera yoksa makbuzdaki kısa kod elle yazılır.""")

# timeline wording
r("""Bunun için 9 hafta var ve tek kişi için bu yüksek bir risk.""",
  """1 Aralık'a 9 hafta var ve tek kişi için bu yüksek bir risk.""")
r("""<li>En geç 10 Nisan: yeni TestFlight sürümü yüklenir.</li>""",
  """<li>En geç 10 Nisan: yeni TestFlight sürümü yüklenir. Pilot Aralık sürümüyle başlarsa bu tarih ~11 Mart olur.</li>""")

# build output + expo-camera iOS-only import + explicit rejected row
r("""Aksi hâlde ML Kit uygulamaya yine girer (expo #39449).</li>""",
  """Aksi hâlde ML Kit uygulamaya yine girer (expo #39449). expo-camera yalnız iOS dosyalarında (<code>*.ios.tsx</code>) içe aktarılır.</li>""")
r("""Derleme sırasında APK'da ML Kit, Google kod tarayıcısı ve RECORD_AUDIO izni bulunmadığı kontrol edilir.""",
  """Derleme sırasında, çıktıda (AAB ve APK) ML Kit, Google kod tarayıcısı ve RECORD_AUDIO (mikrofon) izni bulunmadığı kontrol edilir.""")
r("""ZXing için topluluk eklentisi gerekiyor.</td></tr>""",
  """ZXing için topluluk eklentisi gerekiyor.</td></tr>
        <tr><td>expo-camera (Android)</td><td data-l="Sürüm">SDK 57</td><td data-l="Durum">Android'de elendi. ML Kit'i içeriyor ve kamera görüntüsünü dışarı vermiyor.</td></tr>""")

# glossary
r("""          <li>autolinking: Expo'nun kütüphaneleri derlemeye otomatik ekleme mekanizması.</li>""",
  """          <li>autolinking: Expo'nun kütüphaneleri derlemeye otomatik ekleme mekanizması.</li>
          <li>NestJS: Node.js için daha büyük bir sunucu çatısı.</li>
          <li>Supabase: PostgreSQL üzerine kurulu hazır backend hizmeti.</li>
          <li>expo-sqlite / expo-camera: Expo'nun telefondaki veritabanı / kamera kütüphanesi.</li>
          <li>Google Workspace: İÜ'nün e-posta hizmetini aldığı Google kurumsal paketi.</li>
          <li>RECORD_AUDIO: Android'in mikrofon izni.</li>
          <li>zxing-wasm: Tarayıcıda çalışan QR çözücü.</li>
          <li>Yığın izi: Bir hatanın koddaki yerini gösteren döküm.</li>
          <li>AAB / APK: Play'e yüklenen / doğrudan kurulan Android paket biçimi.</li>""")

for old, new in R:
    c = t.count(old)
    assert c == 1, (c, old[:100])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

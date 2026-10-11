"""Round-9 critic fixes (A9, C9). Every old string must match exactly once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

def r(old, new):
    R.append((old, new))

r("""Aksi görüş çıkarsa girişte yerli bir SMS sağlayıcısı kullanılır.</td>""",
  """Hukuk birimi aksi görüşteyse giriş yöntemi onunla birlikte yeniden belirlenir. Bir seçenek, hocanın ilk derste verdiği tek kullanımlık kayıt kodu. Bu durumda her öğrenci eşleşmesi hoca onayı ister ve pilot takvimi etkilenebilir.</td>""")
r("""Telefon arada yeniden başlatıldıysa kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>""",
  """Okutmayla aynı açılışta hiç çapa yoksa kayıt "belirlenemeyen" olur ve 2'lik sınıra girer. iOS'ta çapaların okutmanın iki yanında olması gerekir.</li>""")
r("""<li>Android, "okut, yeniden başlat, sonra senkronla": kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>""",
  """<li>Android, okutmayla aynı açılışta hiç çapa yok ("çevrimdışı aç, okut, yeniden başlat, sonra senkronla"): kayıt "belirlenemeyen" olur ve 2'lik sınıra girer.</li>
              <li>Android, okutmadan önce aynı açılışta taze çapa var, sonra pil bitiyor: zaman belirlenir.</li>""")
r("""Hoca bu QR'ı panelde okutup doğrular (zxing-wasm). Kamera yoksa makbuzdaki kısa kod elle yazılır.""",
  """Hoca bu QR'ı panelde okutup doğrular (zxing-wasm). Kamera yoksa düzeltme "beyana dayalı" koduyla yapılır.""")
r("""Masaüstü tarayıcıların çoğunda yerleşik QR okuyucu yok. Yedek olarak makbuzda elle yazılabilen kısa bir kod var.</td>""",
  """Masaüstü tarayıcıların çoğunda yerleşik QR okuyucu yok. WASM dosyasını varsayılan olarak yurtdışındaki bir CDN'den (jsDelivr) indiriyor; bu yüzden dosya İÜ sunucusundan sunulur (<code>locateFile</code>) ve Workbox ile önbelleğe alınır.</td>""")
r("""<li>İptal edilen cihazın kendi senkronu reddedilir. Cihaz bulunursa, kuyruğundaki kafa sayısı, düzeltme ve onaylar hocaya onay için gösterilir.</li>""",
  """<li>İptal edilen cihazın kendi senkronu sayıma katılmaz, karantinada tutulur. Cihaz bulunursa kuyruğundaki kafa sayısı, düzeltme ve onaylar hocaya onay için gösterilir.</li>""")
r("""Uygulamanın düzgün kapanıp kapanmadığı bir sonraki açılışta bir işaretle anlaşılır; böylece yerel çökmeler de sayılır ama ayrıntısı olmadan.""",
  """Uygulama ön plana gelince bir işaret koyar, arka plana geçince kaldırır. Bir sonraki açılışta işaret hâlâ duruyorsa ve telefon arada yeniden başlatılmamışsa bu bir çökme sayılır. Böylece yerel çökmeler de sayılır, ama ayrıntısı olmadan.""")
r("""Çökme yaşamayan kullanıcı (düzgün kapanma işareti ve İÜ sunucusuna gönderilen hata kaydı)""",
  """Çökme yaşamayan kullanıcı (yaklaşık ölçüm: kapanma işareti ve İÜ sunucusuna gönderilen hata kaydı; JavaScript başlamadan önceki çökmeler görünmez)""")


r("""Workbox ile önbelleğe alınır.</td></tr>""",
  """Workbox ile önbelleğe alınır.</td></tr>
        <tr><td>jsQR</td><td data-l="Sürüm">1.4.0 (24.04.2021)</td><td data-l="Durum">2. seçenek. Saf JavaScript, WASM gerekmez; ama 2021'den beri yeni sürüm yok ve daha yavaş.</td></tr>
        <tr><td>BarcodeDetector (tarayıcı API'si)</td><td data-l="Sürüm">-</td><td data-l="Durum">Elendi. Windows ve Linux'taki masaüstü Chrome'da, Firefox'ta ve Safari'de yok.</td></tr>""")
r("""<tr><td>expo-camera (Android)</td><td data-l="Sürüm">SDK 57</td>""",
  """<tr><td>expo-camera (Android)</td><td data-l="Sürüm">57.0.0 (25.06.2026)</td>""")
r("""Android'de tek çapa varsa gecikme eşiğine, çapadan bu yana geçen süre × 50 ppm eklenir (günde ~4,3 sn). Çapa 24 saatten eskiyse kaydın zamanı "belirlenemeyen" sayılır.""",
  """Android'de tek çapa varsa gecikme eşiğine, çapa ile okutma arasındaki süre × 50 ppm eklenir (günde ~4,3 sn). Bu süre 24 saati aşarsa kaydın zamanı "belirlenemeyen" sayılır.""")
r("""Cihaz bulunursa kuyruğundaki kafa sayısı, düzeltme ve onaylar hocaya onay için gösterilir.</li>""",
  """Cihaz bulunursa kuyruğundaki kafa sayısı, düzeltme ve onaylar hocaya gösterilir; hoca bunları kabul eder ya da reddeder.</li>""")
r("""Kayıp cihaz web panelinden iptal edilir, numarası bir daha kullanılmaz.""",
  """Kayıp cihaz web panelinden iptal edilir, cihaz numarası bir daha kullanılmaz.""")
r("""Anahtar numarası QR'da yer alır.""",
  """Cihaz numarası (anahtar numarası olarak) QR'da yer alır.""")
r("""Tahmin değişti diye seviye geri gitmez.""",
  """Dönem sonu tahmini değişti diye seviye geri gitmez.""")
r("""Kâğıt imza da bunları önleyemiyor.</li>""",
  """Kâğıt imzada bunların karşılıkları da önlenemiyor.</li>""")
r("""          <li>RECORD_AUDIO: Android'in mikrofon izni.</li>""",
  """          <li>RECORD_AUDIO: Android'in mikrofon izni.</li>
          <li>Google kod tarayıcısı: Google Play hizmetlerinin hazır QR tarama ekranı.</li>
          <li>jsQR / BarcodeDetector: saf JavaScript QR çözücü / bazı tarayıcıların yerleşik QR okuma arayüzü.</li>""")

for old, new in R:
    c = t.count(old)
    assert c == 1, (c, old[:100])
    t = t.replace(old, new)
p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

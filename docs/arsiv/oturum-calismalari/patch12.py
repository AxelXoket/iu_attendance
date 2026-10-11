"""Final polish after round-10 PASS (A10, B10, C10 MINOR/SPEC wording only). Each old string must match once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

def r(old, new):
    R.append((old, new))

r("""Öğrenci e-posta kutularının Google'da olması sorun mu?</td><td data-l="Neden">Push, çökme izleme ve QR çözücü seçimi buna bağlı.</td>""",
  """Öğrenci ve personel e-posta kutularının Google'da olması sorun mu?</td><td data-l="Neden">Push, çökme izleme, QR çözücü ve giriş yöntemi buna bağlı.</td>""")
r("""Öğrenci e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi,""",
  """Öğrenci ve personel e-posta kutularının Google Workspace'te olması İÜ'nün kendi tercihi,""")
r("""Bir seçenek, hocanın ilk derste verdiği tek kullanımlık kayıt kodu.""",
  """Bir seçenek, hocanın ilk derste her öğrenciye ayrı verdiği tek kullanımlık kayıt kodu; hoca eşleşmeleri toplu onaylar.""")
r("""<td data-l="Sürüm">57.0.0 (25.06.2026)</td>""",
  """<td data-l="Sürüm">SDK 57: 57.0.0 (25.06.2026), güncel 57.0.5 (11.09.2026)</td>""")
r("""Bunun için yerel kod gerekmez.""", """Bunun için ek yerel kod gerekmez.""")
r("""ama 2021'den beri yeni sürüm yok ve daha yavaş.""", """ama 2021'den beri yeni sürüm yok.""")
r("""Elendi. Windows ve Linux'taki masaüstü Chrome'da, Firefox'ta ve Safari'de yok.""",
  """Elendi. Masaüstü Chrome ve Edge'de yalnız ChromeOS ve macOS'ta var, Firefox'ta yok, Safari'de ayarla açılabiliyor ama varsayılan olarak kapalı (MDN).""")
r("""<a href="https://github.com/zxing-cpp/zxing-cpp/releases/tag/v3.1.1">zxing-cpp 3.1.1</a></li>""",
  """<a href="https://github.com/zxing-cpp/zxing-cpp/releases/tag/v3.1.1">zxing-cpp 3.1.1</a> · <a href="https://github.com/Sec-ant/zxing-wasm">zxing-wasm (CDN ve locateFile)</a> · <a href="https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector">MDN: BarcodeDetector</a></li>""")
r("""Hoca bu QR'ı panelde okutup doğrular (zxing-wasm). Kamera yoksa düzeltme "beyana dayalı" koduyla yapılır. Doğrulanamayan bir düzeltme "beyana dayalı" sebep koduyla yapılır.""",
  """Hoca bu QR'ı panelde okutup doğrular (zxing-wasm). Bilgisayarda kamera yoksa panel hocanın kayıtlı telefonunda açılıp orada okutulur. Doğrulanamayan her düzeltme "beyana dayalı" sebep koduyla yapılır.""")
r("""Bir sonraki açılışta işaret hâlâ duruyorsa ve telefon arada yeniden başlatılmamışsa bu bir çökme sayılır.""",
  """Bir sonraki açılışta işaret hâlâ duruyorsa ve telefon arada yeniden başlatılmamışsa bu bir çökme sayılır. Yeniden başlatma Android'de BOOT_COUNT ile, iOS'ta açılıştan beri geçen sürenin azalmasıyla anlaşılır.""")
r("""Bu yüzden Android'de kendi kamera modülümüz (CameraX ve zxing-cpp) yazılacak.""",
  """Bu yüzden Android'de kendi kamera modülümüz (CameraX ve zxing-cpp) yazılacak. Modül ayrı bir Activity olarak değil, uygulama içinde bir görünüm olarak çalışacak; böylece çökme işareti doğru çalışır.""")
r("""("çevrimdışı aç, okut, yeniden başlat, sonra senkronla")""",
  """("yeniden başlat, çevrimdışı aç, okut, yeniden başlat, sonra senkronla")""")
r("""          <li>zxing-wasm: Tarayıcıda çalışan QR çözücü.</li>""",
  """          <li>zxing-wasm: Tarayıcıda çalışan QR çözücü.</li>
          <li>WASM / CDN: Tarayıcıda çalışan derlenmiş kod biçimi / dosyaları dünyanın farklı yerlerinden sunan dağıtım ağı.</li>
          <li>locateFile: zxing-wasm'a WASM dosyasını nereden alacağını söyleyen ayar.</li>""")
r("""Tahmin değişince seviye geri gitmez.""", """Dönem sonu tahmini değişince seviye geri gitmez.""")

for old, new in R:
    c = t.count(old)
    assert c == 1, (c, old[:100])
    t = t.replace(old, new)
p.write_text(t, encoding="utf-8")
print(f"applied {len(R)} replacements")

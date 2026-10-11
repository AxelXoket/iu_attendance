"""Length pass: move reference detail from the main body into appendices, add a reading guide."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
R = []

# reading guide under Tek bakışta
R.append(("""<section id="ozet" class="glance">
  <h2>Tek bakışta</h2>""",
          """<section id="ozet" class="glance">
  <h2>Tek bakışta</h2>
  <p class="small"><b>Kısa okuma (~10 dk):</b> Bu kutu, Bölüm 1 (kararlar), Bölüm 6 (kapsam) ve Bölüm 9 (açık sorular). Diğer bölümler ve ekler başvuru içindir.</p>"""))

# §3: auto-accept paragraph -> one line, detail to Ek C
AUTO_OLD_START = """  <p class="small"><b>Otomatik kabul kuralı:</b>"""
i = t.find(AUTO_OLD_START)
j = t.find("</p>", i)
assert i != -1 and j != -1
auto_full = t[i:j + 4]
t = t[:i] + """  <p class="small"><b>Otomatik kabul:</b> Yedek kodla alınan ya da zamanı belirlenemeyen kayıtlardan her öğrenci için her derste dönem başına en fazla 2 tanesi otomatik kabul edilir, fazlası incelemeye düşer. Ayrıntılar ve "yedek kod muaf" işareti <a href="#ek-c">Ek C</a>'de.</p>""" + t[j + 4:]
auto_li = auto_full.replace('  <p class="small"><b>Otomatik kabul kuralı:</b>', '      <li><b>Otomatik kabul kuralı:</b>').replace("</p>", "</li>")

# §5: long ML Kit / distribution paragraph -> one line, detail to Ek E
KV_OLD = """      Android'de expo-camera'nın QR çözücüsü Google ML Kit, Google'a tanılama ve kullanım verisi gönderiyor. Bu yüzden Android'de QR, planlanan yerel modüle eklenecek ZXing (zxing-cpp) ile çözülecek. Bu yapılamazsa ML Kit S15'te onaya sunulur. Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır, uygulama bunlara kişisel veri göndermez. Pilotta test kullanıcısı listesi tutulmaz: iOS'ta TestFlight'ın herkese açık linki, Android'de İÜ hesabından Play açık testi kullanılır. Mağaza konsollarındaki çökme verisini Apple ve Google kendi hizmetleri kapsamında topluyor. Bu durum ve öğrenci e-posta kutularının Google'da olması S15'te soruluyor.</li>"""
KV_NEW = """      Android'de QR çözümü için Google ML Kit yerine ZXing kullanılır, çünkü ML Kit Google'a veri gönderiyor. Mağazalar, test kanalları ve çökme verisi <a href="#ek-e">Ek E</a>'de, açık soru olarak S15'te.</li>"""
R.append((KV_OLD, KV_NEW))

# §7: freeze list -> one line, detail to Ek E
FR_OLD_START = """        <li>MVP'nin 1 Aralık'ta tamamlanıp dondurulması. Güvenlik testi, yetki gerektiren bütün akışları kapsamalı:"""
i = t.find(FR_OLD_START)
j = t.find("</li>", t.find("</ul>", i))
assert i != -1 and j != -1
freeze_full = t[i:j + 5]
t = t[:i] + """        <li>MVP'nin tamamı 1 Aralık'ta dondurulmalı ve İÜ sunucusu hazır olmalı, çünkü güvenlik testi yetki gerektiren bütün akışları kapsayacak (liste <a href="#ek-e">Ek E</a>'de). Tek kişi için 9 haftada yüksek risk. Yetişmezse pilot Güz 2027'ye kalır.</li>""" + t[j + 5:]
freeze_li = freeze_full.replace("        <li>MVP'nin 1 Aralık'ta tamamlanıp dondurulması.", "      <li><b>Güvenlik testi kapsamı:</b> MVP'nin 1 Aralık'ta tamamlanıp dondurulması.")

# Ek C: receive the auto-accept detail
R.append(("""      <li><b>Yedek kod:</b>""", auto_li + "\n      <li><b>Yedek kod:</b>"))

# Ek E: receive ML Kit / distribution detail and the freeze list
R.append(("""      <li><b>Yurtdışına aktarım:</b>""",
          """      <li><b>QR çözücü ve dağıtım:</b> Android'de expo-camera'nın QR çözücüsü Google ML Kit, Google'a tanılama ve kullanım verisi gönderiyor. Bu yüzden Android'de QR, planlanan yerel modüle eklenecek ZXing (zxing-cpp) ile çözülecek; bu yapılamazsa ML Kit S15'te onaya sunulur. Mağazalar ve derleme hizmeti (App Store, Google Play, TestFlight, EAS) uygulamayı dağıtır, uygulama bunlara kişisel veri göndermez. Pilotta test kullanıcısı listesi tutulmaz: iOS'ta TestFlight herkese açık linki, Android'de İÜ hesabından Play açık testi kullanılır. Mağaza konsollarındaki çökme verisini Apple ve Google kendi hizmetleri kapsamında topluyor (S15).</li>
""" + freeze_li + """
      <li><b>Yurtdışına aktarım:</b>"""))

for old, new in R:
    n = t.count(old)
    assert n == 1, (n, old[:100])
    t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print("length pass applied")

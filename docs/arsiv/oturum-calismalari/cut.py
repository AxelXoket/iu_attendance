"""Second compression pass on the assembled HTML: exact-substring replacements, each must hit once."""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")

LATER_OLD = '''    <li><span class="b b-later">Sonra</span>
      <ul>
        <li><b>Roller ve arayüz:</b> Asistan ve denetçi rolleri. İngilizce arayüz. Koyu mod. Birim takvimleri.</li>
        <li><b>Kayıt kolaylıkları:</b> Katılma isteği. Numara hatası önerisi.</li>
        <li><b>Doğrulama ve bildirim:</b> App Attest ve Play Integrity (KVKK onayı gerekir). BLE, NFC, push. Google ile giriş.</li>
        <li><b>Diğer:</b> İtiraz akışı, analitik, devamın nota katkısı.</li>
      </ul>
    </li>
    <li><span class="b b-no">Elendi</span> Elenen yöntemler ve gerekçeleri <a href="#ek-d">Ek D</a>'de.</li>
  </ul>
  <p class="note small"><b>Diğer üniversiteler:</b> Fırat, Hacettepe, Düzce, ÇOMÜ ve BUÜ QR kullanıyor. ESTÜ yalnız kampüs ağında çalışıyor. Hiçbiri çevrimdışı katılımı duyurmuyor. Basın QR yoklamayı "fişleme" diye eleştirdi, bu yüzden gözetim izlenimi verecek her şeyden kaçınılmalı.</p>'''
LATER_NEW = '''    <li><span class="b b-later">Sonra</span> ve <span class="b b-no">Elendi</span> Listeler ve gerekçeleri <a href="#ek-d">Ek D</a>'de.</li>
  </ul>'''

EK_D_TAIL_OLD = '''    <p class="small muted">İş ilanları: LinkedIn Türkiye'de 561 Flutter, 180 React Native ilanı var. Tek ve gürültülü bir kaynak.</p>'''
EK_D_TAIL_NEW = '''    <p class="small"><b>Sonraya kalanlar:</b></p>
    <ul class="small">
      <li>Asistan ve denetçi rolleri</li>
      <li>İngilizce arayüz, koyu mod</li>
      <li>Birimlere özel takvimler</li>
      <li>Derse katılma isteği, numara hatası önerisi</li>
      <li>App Attest ve Play Integrity (KVKK onayı gerekir)</li>
      <li>BLE, NFC, push, Google ile giriş</li>
      <li>İtiraz akışı, analitik, devamın nota katkısı</li>
    </ul>
    <p class="small"><b>Diğer üniversiteler:</b></p>
    <ul class="small">
      <li>Fırat, Hacettepe, Düzce, ÇOMÜ ve BUÜ QR ile yoklama alıyor. ESTÜ ise yalnız kampüs ağında çalışıyor.</li>
      <li>Hiçbiri çevrimdışı katılım sunduğunu duyurmuyor.</li>
      <li>Basında QR yoklama "fişleme" diye eleştirildi. Bu yüzden gözetim izlenimi veren her şeyden kaçınılmalı.</li>
    </ul>
    <p class="small muted">İş ilanları: LinkedIn Türkiye'de 561 Flutter, 180 React Native ilanı var. Bu, tek ve güvenilirliği sınırlı bir kaynak.</p>'''

TAKVIM_OLD_START = '''    <li><b>Neden İÜ hesabı:</b>'''
TAKVIM_OLD_END = '''        <li>Ölçekleme aşamasında App Store'da Unlisted dağıtım. Bu tam incelemeden geçer ve 3.2 (dar kitle) kuralı risk oluşturur.</li>
      </ul>
    </li>'''
TAKVIM_NEW = '''    <li><b>İÜ hesabı gerekli:</b> Apple (5.1.1(ix)) hassas veri işleyen uygulamayı, Play ise kamu adına yapılan uygulamayı kurum hesabından istiyor. Kurum hesabına 12 kişi x 14 gün test şartı uygulanmıyor. İÜ'nün hesapları zaten var: Play'de <code>edu.istanbul.mobile</code>, App Store'da AUZEF. İÜ hesabı kullanılamazsa iOS'ta yedek çözüm PWA.</li>
    <li><b>Pilot takvimi:</b>
      <ul>
        <li>15 Aralık: İÜ hesabına erişim.</li>
        <li>Ocak başı: TestFlight ve Play kapalı test.</li>
        <li>25 Ocak: pilot başlar.</li>
        <li>~22 Mart: yeni TestFlight sürümü. Sürümler 90 gün geçerli, dönem ise 95 gün sürüyor.</li>
      </ul>
      Ölçeklenince uygulama App Store'da Unlisted olarak dağıtılır. Bu tam inceleme gerektirir ve 3.2 dar kitle riski taşır.
    </li>'''

REPLACEMENTS = [
    (LATER_OLD, LATER_NEW),
    (EK_D_TAIL_OLD, EK_D_TAIL_NEW),
    # decisions table: shorter cells
    ('<td data-l="Neden">Telafi dersi dahil internetsiz başlatılabilir. Çalınan anahtarla üretilen sahte QR fark edilir.</td>',
     '<td data-l="Neden">İnternetsiz başlatılabilir, telafi dersinde de. Sahte QR fark edilir.</td>'),
    ('<td data-l="Neden">Giriş derste gerekmez. Onay şartı, kimsenin kendini hoca olarak kaydetmemesi için. Emekliler de <code>@istanbul.edu.tr</code> kullanıyor.</td>',
     '<td data-l="Neden">Giriş yalnız kayıtta gerekir. Onay, başkasının hoca gibi kayıt olmasını önler; emekliler de <code>@istanbul.edu.tr</code> kullanıyor.</td>'),
    ('<td data-l="Neden">Başkasının hesabını kendi telefonuna taşımayı engeller. Özel bir yerel modül gerektirmez.</td>',
     '<td data-l="Neden">Başkasının hesabını kendi telefonuna taşımayı engeller.</td>'),
    # questions: shorter
    ('<td>S13. Veri sorumlusu kim? Protokolü kim imzalayacak? KVKK irtibat kişisi kim, veri ihlali kime bildirilecek?</td>',
     '<td>S13. Veri sorumlusu, protokolü imzalayacak kişi, KVKK irtibatı, ihlal bildirimlerinin gideceği yer</td>'),
    ('<td>S14. BİDB sunucu, yedek, güvenlik testi, SMTP rölesi, alan adı ve nöbetçi sorumlu sağlar mı? Google ile girişe izin verir mi?</td>',
     '<td>S14. BİDB şunları sağlar mı: sunucu, yedek, güvenlik testi, SMTP rölesi, alan adı, nöbetçi? Google ile girişe izin var mı?</td>'),
    ('<td>S17. İÜ adı ve logosu kullanılabilir mi? Uygulama hangi hesaptan yayınlanacak? Kaynak kod ve hesaplar kimin olacak? Apple ücretinden muafiyet mümkün mü?</td>',
     '<td>S17. İÜ adı ve logosu, yayıncı hesap, kaynak kodun ve hesapların sahibi, Apple ücret muafiyeti</td>'),
    ('<td data-l="Neden">Apple\'ın 5.1.1(ix) kuralı ve geliştirici mezun olduktan sonra projeyi kimin devralacağı.</td>',
     '<td data-l="Neden">Apple 5.1.1(ix) kuralı. Mezuniyetten sonra projeyi kim devralacak?</td>'),
    ('<td data-l="Neden">PWA mağaza sürecini kaldırır. Ama iOS\'ta kayıtlar silinebilir, zamanlanmış bildirim yok, kamera yakınlaştırması belirsiz.</td>',
     '<td data-l="Neden">PWA mağazayı devreden çıkarır. Ama iOS\'ta kayıt silinebilir, zamanlı bildirim yok, yakınlaştırma belirsiz.</td>'),
    # flow note: shorter
    ('Bu iş kâğıttan azdır: liste sınıfta dolaşmaz, dönem sonunda sayım otomatik yapılır.',
     'Kâğıttan az iş: liste dolaşmaz, dönem sonu sayımı otomatik.'),
]

for old, new in REPLACEMENTS:
    n = t.count(old)
    assert n == 1, (old[:60], n)
    t = t.replace(old, new)

i = t.find(TAKVIM_OLD_START)
j = t.find(TAKVIM_OLD_END)
assert i != -1 and j != -1 and j > i, (i, j)
t = t[:i] + TAKVIM_NEW + t[j + len(TAKVIM_OLD_END):]

p.write_text(t, encoding="utf-8")
print("cut applied")

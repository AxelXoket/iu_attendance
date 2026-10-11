import json, re
D = "C:/Users/USER/Desktop/iu_attendance/"
E = [
("F025+F024", "plan.html", 'aynı komut bütün yöneticiler erişimini kaybederse kurtarma yolu (bkz. <a href="teknik.html#sunucu">Sunucu, İlk yönetici</a>).',
 'bütün yöneticiler erişimini kaybederse kurtarma yolu da aynı komuttur (bkz. <a href="teknik.html#sunucu-ilk-yonetici">Sunucu, İlk yönetici</a>).'),
("F023", "plan.html", 'veritabanında sunucunun gizli anahtarıyla özetlenir (HMAC, kendine ayrılmış anahtarla; 1 milyon olasılıkta düz özet işe yaramaz; anahtar listesi: bkz. <a href="teknik.html#sunucu">Sunucu, Ayarlar</a>).',
 'veritabanında açık durmaz, sunucunun gizli anahtarıyla özetlenir (yöntem, gerekçesi ve anahtar: bkz. <a href="teknik.html#sunucu-kimlik">Sunucu, Kimlik</a>).'),
("F023-teknik-id", "teknik.html", '<div class="row"><div class="k">Kimlik</div>', '<div class="row" id="sunucu-kimlik"><div class="k">Kimlik</div>'),
("F023-teknik", "teknik.html", 'Kodlar kendine ayrılmış giriş kodu özet anahtarıyla HMAC\'le saklanır (bkz. <a href="#sunucu-ayarlar">Ayarlar</a>);',
 'Kodlar kendine ayrılmış giriş kodu özet anahtarıyla HMAC\'le saklanır: 6 haneli kodda yalnız 1 milyon olasılık var, düz özet hepsi denenerek çözülür (anahtar listesi: bkz. <a href="#sunucu-ayarlar">Ayarlar</a>);'),
("F026", "plan.html", 'sunucu adresi tek kuralla düzeltir (İ ve I, i olur).', 'sunucu adresin tamamını küçük harfe çevirir, İ ve I de i olur.'),
("F022", "plan.html", 'röle olmazsa aynı hesapla OAuth2. Kendi alan adımdan gönderirsem SPF, DKIM, DMARC hizalı kurulur,',
 'röle olmazsa aynı hesapla OAuth2. BİDB gönderici hesap vermezse kendi alan adımdan gönderirim: SPF, DKIM, DMARC hizalı kurulur,'),
("F024-ogrenci-girisi", "plan.html", '(ayarı: bkz. <a href="teknik.html#telefon">Telefon uygulaması, Anahtar ve imza</a>)', '(ayarı: bkz. <a href="teknik.html#telefon-anahtar-imza">Telefon uygulaması, Anahtar ve imza</a>)'),
("F024-gonderme", "plan.html", '(ayar: bkz. <a href="teknik.html#telefon">Telefon uygulaması, Anahtar ve imza</a>)', '(ayar: bkz. <a href="teknik.html#telefon-anahtar-imza">Telefon uygulaması, Anahtar ve imza</a>)'),
("F024-asama23-anahtar", "plan.html", 'aktarım ayrıntısı: bkz. <a href="teknik.html#telefon">', 'aktarım ayrıntısı: bkz. <a href="teknik.html#telefon-anahtar-imza">'),
("F018", "plan.html", 'Önceden programa girilir; aynı gün girilirse internetsiz telefon bilemez, hoca öğrencileri listeden işaretler.',
 'Önceden programa girilir. Aynı gün girilirse programı internetteyken indiren telefonlarda açılır; indirmemiş, internetsiz telefon bilemez, hoca kaydı olmayan öğrencileri listeden işaretler.'),
("F028", "plan.html", 'çift anadal ve yandal dersleri ayrı listelerle tutulur.',
 'çift anadal ve yandal dersleri her programın kendi ders listesinde ayrı tutulur, çakışma bu listeler arasında da denetlenir.'),
("F020", "plan.html", 'Nesil elle tutulmaz: PostgreSQL\'in küme kimliği ile zaman çizelgesinden oluşur; pgBackRest\'ten geri yükleme yeni zaman çizelgesi açar, pg_dump\'tan dönüş yeni küme kurar, ikisinde de nesil kendiliğinden değişir (ayrıntı: bkz. <a href="teknik.html#kod">Kod düzeni, Veri modeli</a>);',
 'Nesil elle tutulmaz, veritabanının kendisinden okunur ve yedekten dönüşte kendiliğinden değişir (nasıl ve dönüşte uyulacak kural: bkz. <a href="teknik.html#kod-veri-modeli">Kod düzeni, Veri modeli</a>);'),
("F020-teknik-id", "teknik.html", '<h3>Veri modeli (ilk taslak)</h3>', '<h3 id="kod-veri-modeli">Veri modeli (ilk taslak)</h3>'),
("F020-teknik", "teknik.html", 'değeri; API her indirmede değişenler sorgusuyla aynı işlemde okur, ayrı tablo ya da elle adım yok.',
 'değeri; API her indirmede değişenler sorgusuyla aynı işlemde okur, ayrı tablo ya da elle adım yok. pgBackRest\'ten geri yükleme yeni zaman çizelgesi açar; <code>pg_dump</code>\'tan dönüş her zaman <code>initdb</code> ile yeni kurulmuş kümeye yapılır, var olan kümeye geri yüklenmez (orada küme kimliği ve zaman çizelgesi aynı kalır, nesil değişmez ve telefonlar eski imleçle değişiklik atlar); böylece ikisinde de nesil kendiliğinden değişir.'),
("F021", "plan.html", 'Beklenen süre en geç 7 gün; dönemin son haftasında birimin "devamsızlıkların işlenmesi için son gün"ü (bkz. <a href="#devam-donem-sonu">Devamsızlık, Dönem sonu</a>). Bu süreden geç gelen geçerli kayıt reddedilmez, "sonradan değişenler" listesine düşer: 7 günden sonra gelse de kabul edilir;',
 'Beklenen süre en geç 7 gündür; dönemin son haftasında süre en geç birimin "devamsızlıkların işlenmesi için son gün"ünde biter (bkz. <a href="#devam-donem-sonu">Devamsızlık, Dönem sonu</a>). 7 günden geç gelen geçerli kayıt reddedilmez, kendiliğinden sayılır ve hocanın "sonradan değişenler" listesinde gösterilir;'),
("F027", "plan.html", 'Gece sınıflandırma işi kararı değiştirmez', 'Gece inceleme sıralaması işi kararı değiştirmez'),
("F024-arka-plan", "plan.html", '(zamanlama: bkz. <a href="teknik.html#sunucu">Sunucu, Arka plan işleri</a>)', '(zamanlama: bkz. <a href="teknik.html#sunucu-arka-plan">Sunucu, Arka plan işleri</a>)'),
("F024-teknik-id", "teknik.html", '<div class="row"><div class="k">Arka plan işleri</div>', '<div class="row" id="sunucu-arka-plan"><div class="k">Arka plan işleri</div>'),
("F027-teknik", "teknik.html", 'Gece sınıflandırması (ne yaptığı: bkz. <a href="plan.html#kararlar">Kararlar, Şüpheli kayıt</a>)', 'Gece inceleme sıralaması (ne yaptığı: bkz. <a href="plan.html#kararlar-supheli-kayit">Kararlar, Şüpheli kayıt</a>)'),
("F019", "plan.html", 'Öğrenci yoklama sorununu 3 gün içinde uygulamadan bildirir,',
 'Öğrenci yoklama sorununu uygulamadan 3 gün içinde bildirir (süre, kaydı varsa sunucu kararı telefonuna ulaşınca, kaydı yoksa ders bitince başlar),'),
("F029", "plan.html", 'Hocanın kafa sayısı ve onay ekranlarındaki süresi de ölçülür;',
 'Hocanın kafa sayısı ve onay ekranlarındaki süresi de ölçülür: kafa sayısı sunucuya zaten gelir, onay ekranlarındaki süreyi telefon ve panel ölçüp günlük toplam olarak gönderir;'),
("F023-ortak", "plan.html", 'Paket Intl\'i ve telefonun dil ayarını kullanmaz, saatleri UTC milisaniyeyle hesaplar (Hermes JavaScript motoru eski Android\'de farklı davranabiliyor).',
 'Paket her cihazda aynı sonucu verir, telefonun dil ayarına bağlı değildir (nasıl: bkz. <a href="teknik.html#kod">Kod düzeni</a>).'),
("F023-ortak-teknik", "teknik.html", '<li><code>packages/core</code>: ortak kurallar (hak hesabı, saat, işaretleme), testleriyle</li>',
 '<li><code>packages/core</code>: ortak kurallar (hak hesabı, saat, işaretleme), testleriyle; Intl\'i ve telefonun dil ayarını kullanmaz, saatleri UTC milisaniyeyle hesaplar (Hermes JavaScript motoru eski Android\'de farklı davranabiliyor)</li>'),
]
txt = {f: open(D + f, encoding='utf-8').read() for f in ("plan.html", "teknik.html")}
ok = True
for i, f, a, b in E:
    c = txt[f].count(a)
    bad = [ch for ch in b if ch in '\u2013\u2014']
    if c != 1 or bad:
        ok = False
    print(i, f, c, bad)
for i, f, a, b in E:
    if txt[f].count(a) != 1:
        print("SEQFAIL", i); ok = False
    txt[f] = txt[f].replace(a, b)
for f in txt:
    ids = re.findall(r'id="([^"]+)"', txt[f])
    print(f, "dup ids", [x for x in set(ids) if ids.count(x) > 1])
for m in re.findall(r'href="teknik.html#([^"]+)"', txt["plan.html"]):
    if f'id="{m}"' not in txt["teknik.html"]: print("missing teknik id", m)
for m in re.findall(r'href="plan.html#([^"]+)"', txt["teknik.html"]):
    if f'id="{m}"' not in txt["plan.html"]: print("missing plan id", m)
print("OK" if ok else "FAIL")
json.dump([{"id": i, "file": f, "from": a, "to": b} for i, f, a, b in E], open("C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/f2_edits.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

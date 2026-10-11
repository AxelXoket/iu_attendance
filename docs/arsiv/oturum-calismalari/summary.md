# İÜ Yoklama: Araştırma Özeti (29 Eylül 2026)

**Sabit kısıtlar:** AKSİS/SSO entegrasyonu yok. Yoklama anında öğrencinin telefonunda internet olmadığı varsayılır, kayıt sonra senkronize edilir. Hile çıtası "kâğıt imzadan iyi olmak".

## 1. Kararlar

| Konu | Öneri | Gerekçe | Alternatif / elenen |
|---|---|---|---|
| **Doğrulama** | Birkaç saniyede bir değişen QR + öğrencinin telefonunda imzalanıp saklanan çevrimdışı kayıt + ders sonunda hocanın girdiği kafa sayısı + kamera çalışmazsa dönen 6 haneli yedek kod | İnternetsiz çalışır, tek izin kamera, 150 kişi aynı ekranı okur (~1 dk, tahmin). QR'da imza değil kısa bir MAC (96 bit) var: kod küçük kalır, 20 m'deki arka sıra ~2-2,3 m genişlikte bir QR'ı okuyabilir. İmza koymak bunu 2,6-3,3 m'ye çıkarıyor | 2.: BLE "güçlü mod", ileride ve isteğe bağlı. Elenenler: konum (kapalı alanda çalışmıyor, KVKK yükü), sabit PIN (grupta anında dolaşır; Indiana Üniv. Top Hat kopya vakaları), ses dalgası (Google 2021'de bıraktı), yüz (KVKK 2026/921: rıza olsa bile ölçüsüz), Wi-Fi kontrolü (eduroam 802.1X, iOS'ta konum izni gerekir), NFC (iOS'ta Türkiye'de yok), IMEI (Android 10+ vermiyor) |
| **Mobil** | Expo (React Native), yalnız öğrenci uygulaması. Çevrimdışı DB: expo-sqlite + drizzle | Mac olmadan iOS derlemesi bulutta (EAS). Mobil, web ve backend tek dil (TypeScript) | 2.: Flutter 3.47 (Dart biliyorsan veya Mac varsa). Elenen: Compose Multiplatform (web beta, iOS için Mac), Capacitor, WatermelonDB (Nisan 2025'ten beri sürüm yok) |
| **Hoca tarafı** | React web panel, çevrimdışı açılabilen PWA. QR projeksiyonda, telefonda da çalışır | Excel yükleme, rapor ve projeksiyon masaüstü işi. Flutter web tablo, kopyalama ve yazdırmada zayıf | Elenen: ayrı yerel hoca uygulaması |
| **Backend** | Fastify + PostgreSQL, Docker Compose. Yer: İÜ BİDB sunucusu, 2. ULAKBİM, 3. yerli sağlayıcı | Genelge 2019/12 kamu verisini kurum dışı yabancı buluta koymayı yasaklıyor, hiçbir BaaS'ın Türkiye bölgesi yok. İmza doğrulama zaten özel kod gerektiriyor. Otomatik kapanma için zamanlayıcı gerekmez (`closes_at` geçince kapalı), hatırlatma kuyruğu pg-boss | 2.: kendi sunucumuzda Supabase (13 servis, yönetilen yedek yok). Elenen: Firebase, Appwrite, PocketBase (1.0 öncesi), Supabase Cloud (gerçek veri için) |
| **Kod yapısı** | Tek TypeScript monorepo: `apps/mobile`, `apps/web`, `apps/api`, `packages/core` (tipler, şemalar, senkron protokolü, QR doğrulama) | Mantık bir kez yazılır, üç yerde kullanılır | |
| **Giriş** | Öğrenci `@ogr.iu.edu.tr`, hoca `@istanbul.edu.tr` + bölüm yöneticisi onayı. Yöntem: e-postaya 6 haneli kod. BİDB izin verirse ek olarak "Google ile giriş". Kütüphane: Better Auth | İki alan adı da Google Workspace (MX kaydıyla doğrulandı). Giriş nadiren gerekir, yoklama anında hiç gerekmez: geçen seferki "herkes aynı anda merkezi sisteme giriyor" sorunu oluşmaz | Alan adı tek başına yetmez (emekli personel, eski Cerrahpaşa hesapları). Asıl kanıt listedeki öğrenci no eşleşmesi. Elenen: SMS ana yöntem olarak (maliyet), passkey cihaz bağlama olarak (senkronize olur, paylaşılabilir) |
| **Listeyle eşleşme** | Öğrenci no (metin olarak, 9-10 hane, başta 0 olabilir) + Türkçe harf katlamalı isim. Uymazsa hoca onayına düşer, tek hane hatasında öneri sunulur, sessiz düzeltme yok | Öğrenci e-posta kullanıcı adı öğrenci no içermiyor | |
| **Cihaz bağlama** | Öğrenci başına 1 aktif cihaz, bir cihazda dönem başına 1 öğrenci. Donanımda saklanan P-256 anahtar (Keystore / Secure Enclave). Cihaz değişimi: 48 saat bekleme veya hoca onayı, dönemde en fazla 2 kez, eski cihaza ve e-postaya bildirim | "Arkadaşın hesabına kendi telefonundan girme"yi engeller. Her iki stack'te de küçük bir yerel (native) modül yazmak gerekir | Sonraya: App Attest / Play Integrity (veri Apple/Google'a gider). Elenen: biyometriye bağlı anahtar (her Face ID değişiminde yeniden bağlama) |
| **Bildirim** | MVP'de yalnız yerel bildirim, telefondaki ders programından üretilir, internetsiz çalışır. 7 günlük pencere, en fazla ~50 bildirim (iOS sınırı 64) | FCM/APNs yurtdışı aktarım. Bodrumdaki telefona push zaten zamanında gelmez. Android 14'te tam zamanlı alarm varsayılan kapalı, bildirim birkaç dakika ile 1 saat arası gecikebilir | Sonraya: içeriksiz sunucu push'u (İÜ aktarımı onaylarsa). OneSignal ücretsiz planı 1.000 MAU ile sınırlı |
| **Excel / PDF** | İçe aktarma: SheetJS 0.20.3 (CDN'den; npm'deki 0.18.5'te 2 CVE var). xls, xlsx, .xls adlı HTML ve CSV (UTF-8, olmazsa cp1254) okur; başlık üstü satırlar ve birleşik hücreler desteklenir. Dışa aktarma: xlsx (ExcelJS'in bakımlı çatalı veya write-excel-file) + PDF (pdfmake, TTF font gömülü). CSV: UTF-8 BOM, `;` ayraç, formül enjeksiyonuna karşı kaçış | Gömülü font olmadan ğ ş ı İ bozulur | Elenen: Syncfusion (ücretsiz lisans vergiyle finanse edilen kurumları kapsamıyor) |
| **Hata izleme** | Yabancı analitik veya crash SDK'sı yok. Gerekirse İÜ sunucusunda kendi kurulumumuz | Yurtdışı aktarım; Cumhuriyet'in Ocak 2026 haberi bir yoklama uygulamasındaki gizli izleyicileri konu aldı | |

## 2. Yoklama akışı

1. Hoca "Yoklama başlat" der ve süreyi seçer. İnternet gerekmez: oturum anahtarı, hoca cihazının kayıt sırasında sunucuyla paylaştığı sırdan türetilir.
2. Ekranda birkaç saniyede bir değişen QR, canlı sayaç ve yedek kod gösterilir.
3. Öğrenci yakınlaştırmalı tarayıcıyla okutur. Telefon kaydı donanım anahtarıyla imzalar, saklar ve "Yoklamanız alındı, senkron bekliyor" makbuzunu gösterir.
4. Zaman, öğrencinin saatinden değil, QR'daki zaman diliminden ve telefonun monotonik saatinden hesaplanır. Saati geri almak işe yaramaz.
5. Uygulama her açıldığında ve bağlantı her değiştiğinde senkron dener. Arka plan senkronu iki platformda da garanti değil. Sunucu imza, MAC, zaman ve liste kontrolünden sonra kaydı kabul eder, işaretler ya da reddeder. İkinci katılım reddedilir.
6. Hoca dersin sonunda kafa sayısını girer. Kayıt sayısı bu sayıyı max(3, %5) aşarsa uyarı çıkar.
7. Önerilen senkron süresi 7 gün. Dışa aktarımdan sonra gelen kayıtlar hocanın inceleme kuyruğuna düşer, dönem sonunda kayıtlar kilitlenir.
8. Telefonu olmayan ya da şarjı biten öğrenciyi hoca elle ekler, bu işlem denetim kaydına düşer.

**Önlenen hileler:** arkadaşının hesabına kendi telefonundan girmek, sabit kod paylaşmak, telefon saatini değiştirmek, QR fotoğrafını sonradan WhatsApp'la göndermek (gecikme kuralı işaretler; bodrumda zaten gönderilemez), bir telefondan iki öğrenci.
**Önlenemeyen hileler:** canlı görüntülü aramayla QR'ı aktarmak, arkadaşının telefonunu derse getirmek. İkisini de yalnız kafa sayısı yakalar. Kâğıt imza bunların hiçbirini yakalamıyor.

## 3. Mevzuat ve hesaplama

Kaynak: İÜ Önlisans ve Lisans Yönetmeliği, RG 28.09.2025/33031.
- **Md.19(1):** İlk kez alınan derste teoride %70, uygulamada %80 devam şartı var. İkisi ayrı hesaplanır.
- **Md.19(2):** Tıp, diş hekimliği, eczacılık ve hemşirelikte klinik devam bölüm bazında hesaplanır.
- **Md.19(3):** Devamsız öğrenciler finalden önce otomasyon sisteminde, yani AKSİS'te ilan edilir. Senato bir yönerge çıkarmadıkça uygulama yardımcı bir araçtır. Emsal: Dokuz Eylül'ün 05.09.2025 tarihli yönergesiyle elektronik yoklama resmi yöntem oldu.
- **Md.20(5):** Devamsızlık dışı bir nedenle tekrar edilen derste devam şartı yok. Kayda "devamdan muaf" alanı eklenecek.
- **Md.20(2):** Devam nota katılabilir.
- **Md.9(4):** Geç kayıttan önce geçen süre devamsız sayılır.
- **Md.35:** Resmi görevlendirme devamsızlık sayılmaz. Sağlık raporuna muafiyet yok, rapor yalnız mazeret sınavı ve kayıt dondurmada geçerli (Md.24, 29).
- **Md.14(2):** Dönem 14 hafta.

**Devamsızlık hakkı:** Yalnız tam sayıyla hesaplanır: `hak = T - ceil(T*p/100)`. Ondalıklı hesap %80'de T=1..199 arasında 39 değerde yanlış çıkıyor (script ile doğrulandı; örnek: T=15'te doğru cevap 3, ondalıklı hesap 2). Bunun regresyon testi zorunlu.

**Uyarı seviyeleri:**
- hakkın yarısı kullanıldı
- 1 hak kaldı
- "devamsızlık hakkınız kalmadı"
- aşıldı ("kesin durum AKSİS'te ilan edilir")

Bildirim yalnız seviye değişince gönderilir.

## 4. KVKK

- **Veri sorumlusu:** Tüzel kişi olarak İÜ. KVKK Kurulu 2024/197 ve 2021/1214 sayılı kararlarında üniversiteyi sorumlu saydı. Öğrenci uygulamayı kendi başına işletirse hukuki dayanağı olmayan bir veri sorumlusu olur. Bu yüzden proje İÜ ile bir protokol altında yürümeli; geliştirici "veri işleyen" sıfatıyla gizlilik sözleşmesi imzalamalı. VERBİS kaydı 7 gün içinde güncellenir.
- **Hukuki sebep:** Md.5(2)(ç), hukuki yükümlülük. Açık rıza istenmez, yalnız aydınlatma metni gösterilir (ilke kararı 2026/347).
- **Tutulmayacak veriler:**
  - "Raporlu" durumu yok, çünkü sağlık verisidir (Md.6). Yalnız Md.35 kapsamında "görevli, var sayılır" durumu ve karar numarası tutulur. Raporlar dilekçe ve EBYS üzerinden işlenir.
  - TC kimlik numarası hiçbir yerde tutulmaz. Öğrenciler birbirlerinin verisini görmez (Kurul 2021/1214).
  - GPS, biyometri ve donanım kimliği kullanılmaz.
- **Barındırma:** Yurt içinde. Yurtdışı için Türk standart sözleşmesi, noter onaylı çeviri ve 5 iş günü içinde Kurul'a bildirim gerekir. Kamu kurumları rıza ve sözleşme istisnalarını kullanamaz (Md.9(7)). Push, crash raporlama, analitik ve yabancı e-posta servisi de yurtdışı aktarım sayılır. E-posta İÜ sunucusundan gönderilir.
- **Saklama:** YÖK dosya planı 302.07'ye göre 10 yıl, sonra imha. Bu süre uygulama resmi kayıt sayılırsa geçerli. Periyodik imha en az 6 ayda bir yapılır, imha kayıtları 3 yıl tutulur, silme talebi 30 gün içinde cevaplanır.
- **Güvenlik:** KVKK Veri Güvenliği Rehberi (Nisan 2025) uygulanır. İhlal 72 saat içinde Kurul'a bildirilir. Genelge 2019/12 "arka kapı yok" taahhüdü ve canlıya almadan önce güvenlik testi istiyor.
- **Hesap silme:** Apple ve Google uygulama içinden silme istiyor, Google ek olarak bir web linki istiyor. Yoklama kaydı hesaba değil, hocanın listedeki satırına bağlı. Hesap silinince kimlik bağı kopar, yasal kayıt kalır. Bunun aydınlatma metninde açıklanması gerekir.

## 5. Kapsam

### Hocanın notları
- **Ders yönetimi:** Hepsi MVP'de: görüntüleme, oluşturma/düzenleme/silme, gün/saat/derslik, kayıtlı öğrenciler, CSV veya Excel ile toplu ekleme ve çıkarma. Liste yeniden yüklenince önce fark gösterilir: eklenen, çıkan ve değişen öğrenciler. Çıkarılan öğrenci silinmez, pasifleşir. Her yükleme dosya hash'iyle denetim kaydına geçer.
- **Yoklama alma:** Hepsi MVP'de: başlatma, süreli açık tutma, uygulamadan katılım, tarih ve saat kaydı, tek katılım, otomatik ve manuel kapatma.
- **Doğrulama:**
  - QR MVP'de, dönen kod olarak.
  - PIN yalnız dönen yedek kod olarak var, sabit PIN elendi.
  - Konum ve QR+konum elendi.
  - BLE ileride eklenebilir.
- **Kayıtlar:** Hepsi MVP'de. İstisna: "raporlu" durumu KVKK ve yönetmelik nedeniyle olmayacak; "izinli" durumunun karşılığı Md.35'teki "görevli" durumu olacak.
- **Raporlama:** Hepsi MVP'de. Ek olarak AKSİS'e giriş için bir dışa aktarma dosyası:
  - AKSİS listesindeki sırayla her öğrenci için toplam saat, katıldığı saat, yüzde ve DEVAMLI/DEVAMSIZ bilgisi
  - Yalnız devamsızları içeren ayrı bir sayfa
  - Haftalık matris sayfası
- **Bildirimler:** MVP'de yerel bildirim olarak:
  - "Ders başladı, yoklamayı unutma"
  - "Kayıt yok, yoklama kapanmak üzere"
  - Eşik uyarısı (uygulama içinde de gösterilir)

  Sunucudan push ileride.

### Notlara eklenenler (MVP)
- **Roller:** süper yönetici, hocayı onaylayan bölüm yöneticisi, hoca, ortak hoca.
- **Dönem ve takvim:**
  - Dönem ve akademik takvim: tatil, iptal ve telafi dersleri. Bunlar devamsızlık hesabının paydasını değiştirir.
  - 6 birimin (İstanbul Tıp, Diş Hekimliği, Hukuk, AUZEF, Eczacılık, Konservatuvar) takvimi ayrı.
- **Ders yapısı ve sayım:**
  - Şube.
  - Blok ders ve ders saati bazında sayım.
  - Teori ve uygulamanın ayrı hesaplanması.
  - Dersi tekrar eden öğrencinin muafiyeti.
- **Yoklama güvencesi:**
  - Kafa sayısı ve yedek kod.
  - Telefonsuz öğrenci için elle ekleme.
  - Cihaz bağlama ve cihaz değişimi.
- **Kayıtların bütünlüğü:**
  - Öğrenci makbuzu ve hoca için karşılaştırma ekranı. Nişantaşı'nda 25-30 öğrencinin kaydı kaybolmuştu.
  - Geç senkron için inceleme kuyruğu ve dönem sonu kilidi.
- **Yasal gereklilikler:** uygulama içi ve web üzerinden hesap silme, aydınlatma metni.
- **Arayüz:**
  - Türkçe ve İngilizce.
  - Sistem temasına uyan koyu mod.
  - QR tarayıcıda yakınlaştırma. UBYS Mobil'in puanı 2.1; iPhone Pro modellerinde kamera 0.5x açılıyor ve QR okunamıyor.
- **Veri:** üçüncü parti analitik yok.

### Sonraya kalanlar
- BLE güçlü mod
- App Attest ve Play Integrity
- Sunucudan push
- Öğrencinin itiraz akışı
- Bölüm analitiği
- Dönüşümlü laboratuvar grupları
- Asistan için kısıtlı yetki
- Devamın nota katkısı

### Elenenler
- Konum ve QR+konum
- Sabit PIN
- Ses dalgası
- Yüz ve biyometri
- NFC
- Wi-Fi kontrolü
- "Raporlu" durumu
- Ayrı yerel hoca uygulaması

### Rakiplerden dersler
- **Çevrimdışı katılım:** Fırat, Hacettepe, Düzce, ÇOMÜ, BUÜ, ESTÜ ve diğerlerinin hiçbirinde öğrenci çevrimdışı yoklamaya katılamıyor. Projenin asıl farkı bu olacak.
- **Varsayılan şifre:** Hacettepe'de varsayılan şifre TC kimlik numarasının ilk 6 hanesi. Bizde böyle bir şey olmayacak.
- **Gözetim algısı:** QR yoklama basında "fişleme" olarak eleştirildi. Gözetim gibi görünen her şeyden (konum geçmişi, analitik) kaçınılacak.
- **İÜ'deki önceki kullanım:** İstanbul Tıp Fakültesi 2021'de `@ogr.iu.edu.tr` ile sınırlı QR ve Google Forms yoklaması kullandı. İÜ'nün resmi uygulamasında yoklama özelliği yok.

## 6. Takvim, dağıtım ve maliyet

- **İÜ takvimi:**
  - Güz: 14 Eylül - 18 Aralık 2026, ekle-bırak 5-6 Ekim.
  - Bahar: 25 Ocak - 30 Nisan 2027, ekle-bırak 8-9 Şubat.
- **Pilot dağıtımı:** Kişisel geliştirici hesaplarıyla, İÜ adı ve logosu olmadan, nötr bir isimle.
  - iOS: TestFlight harici test. Herkese açık link, en fazla 10.000 test kullanıcısı. İlk sürüm Beta App Review'dan geçer, sürümler 90 günde geçersiz olur.
  - Android: Google Play kapalı test. Yeni kişisel Play hesapları üretime çıkmadan önce 12 test kullanıcısıyla 14 gün kesintisiz test yapmak zorunda. Bu süre ilk gün başlatılmalı.
  - Örnek takvim, ilk derleme 5 Ekim olursa: TestFlight ~8 Ekim, Play üretimi ~29 Ekim - 5 Kasım, App Store 2-4 hafta.
- **Ölçeklenince:** Uygulama İÜ'nün mevcut kurumsal hesaplarından yayınlanır. Play'de `edu.istanbul.mobile` yayıncısı, App Store'da AUZEF hesabı var. Öğrenci takım üyesi olarak eklenir.
  - iOS'ta Unlisted dağıtım kullanılır, Apple bu kategoride yükseköğretim öğrencilerini açıkça sayıyor.
  - Kurumsal hesap 12 kullanıcı x 14 gün şartına tabi değil.
  - Play, kamu kurumu adına yapılan uygulamalar için kurumsal hesap istiyor.
- **Mağaza inceleme riskleri:**
  - Apple 3.2: dar kitleye yönelik uygulama. Çözümü Unlisted dağıtım.
  - Apple 5.2.1: izinsiz İÜ adı veya logosu.
  - Apple 2.1: inceleme ekibine demo hesap ve QR'sız bir deneme yolu verilmeli.
  - Apple 5.1.1(v): hesap silme.
  - Play: 31 Ağustos 2026'dan beri yeni uygulamalar API 36'yı hedeflemek zorunda.
- **PWA'yı öğrenci uygulaması olarak kullanmak:** QR okuma ve çevrimdışı çalışma mümkün, ama donanım anahtarı, BLE ve cihaz doğrulaması yok. iOS'ta push ancak ana ekrana eklenirse çalışıyor. Bu yüzden PWA yalnız hoca paneli ve yedek olarak kullanılacak.
- **Maliyet:**
  - Apple: 99 USD/yıl. Bazı kullanıcılar uygulama içinden kayıtta ~650 TL raporluyor, teyitsiz. Kamu kurumu için ücret muafiyetini Apple'a sormak gerekiyor.
  - Google: 25 USD, tek seferlik.
  - Expo: ücretsiz plan pilot için yeterli (ayda 15 Android + 15 iOS derleme). Kampüs geneli için 19 USD/ay.
  - Sunucu: İÜ VM'i veya yerli bir VM.
  - Ölçek: 50 bin öğrencide yılda 8,4 milyon kayıt, 4,2 GB veri, en yoğun anda ~33 yazma/sn. Maliyet karar verdirecek büyüklükte değil.

## 7. Pilot ölçütleri

- **Hız:** 100 öğrencilik derste medyan süre, yoklama açılışından %90 katılıma kadar, en fazla 120 sn. Karşılaştırma için kâğıt imzanın süresi ilk 2 haftada kronometreyle ölçülecek.
- **Senkron:** Kayıtların en az %95'i 24 saatte, en az %99,5'i 7 günde senkronize olmalı.
- **Kayıt kaybı:** Makbuzu olup kaybolan kayıt 0.
- **Elle düzeltme:** 100 kayıtta en fazla 3.
- **Kafa sayısı:** Kayıt sayısı ile kafa sayısı arasındaki fark en fazla %5.
- **Kararlılık:** Çökmeden tamamlanan oturum en az %99,5. Bunu ölçmek için kendi sunucumuzda hata izleme gerekir.
- **Benimsenme:** Öğrencilerin en az %90'ı 3. haftaya kadar kaydolmuş olmalı.
- **Dışa aktarma:** En fazla 5 dakika, uyuşmazlık 0.
- **Hoca memnuniyeti:** SUS puanı en az 75.
- **Doğruluk:** Haksız yere finalden men edilen öğrenci 0.

## 8. Açık sorular

### Hocalara ve üniversiteye
Her sorunun sonunda cevap gelmezse uygulanacak varsayılan var.

**Geçmiş deneyim ve AKSİS**
1. Geçen seferki sistem hangisiydi, asıl sorun neydi: giriş mi, sunucu yükü mü, internet mi? *Varsayılan: tasarım üçüne karşı da hazırlandı.*
2. AKSİS'ten indirilmiş gerçek bir öğrenci listesi Excel'i, isimleri maskelenmiş olarak. *Varsayılan: bilinen tüm başlık biçimleri desteklenir.*
3. AKSİS'in devamsızlık giriş ekranı nasıl: haftalık mı, toplam saat mi, tek bir işaret mi? *Varsayılan: toplam saat + DEVAMLI/DEVAMSIZ.*

**Devam kuralları**
4. Devamsızlık ders saati üzerinden mi, oturum üzerinden mi sayılıyor? Payda planlanan saatler mi, yapılan saatler mi? *Varsayılan: ders saati; payda yapılan saatler (iptal edilen hariç, telafi dahil).*
5. Rapor devamsızlığı siliyor mu? *Varsayılan: hayır, yönetmelik öyle diyor.*
6. Ekle-bırakta sonradan eklenen öğrencinin önceki haftaları devamsız sayılıyor mu? *Varsayılan: sayılmaz, hoca değiştirebilir. Md.9(4) geç kayıtta saydığı için sorulmalı.*
7. Dersi tekrar eden ve devamdan muaf olan öğrenciler nasıl belirlenecek? *Varsayılan: hoca listede işaretler.*
8. Geç gelen öğrenci "var" sayılıyor mu? *Varsayılan: oturum açıkken katılan var sayılır, kapandıktan sonra gelen öğrenciyi hoca elle ekler.*
9. Sistemin şüpheli olarak işaretlediği kayıtlar "var" sayılsın mı? *Varsayılan: evet, ama hocaya ayrıca gösterilir.*
10. Senkron süresi ne olsun? *Varsayılan: 7 gün.*
11. Devam nota katılıyor mu, katılıyorsa ağırlığı ne? *Varsayılan: katılmıyor.*

**Kimlik**
12. Kurumsal e-postası olmayan öğrenci kişisel e-postasıyla kaydolabilsin mi? *Varsayılan: hayır, hoca elle ekler.*

**KVKK ve BİDB**
13. Veri sorumlusu kim, protokolü kim imzalayacak? KVKK irtibat kişisi kim, ihlal bildirimi kime gidecek? *Varsayılan: bu çözülmeden gerçek veriyle pilot yapılmaz, geliştirme sahte veriyle sürer.*
14. BİDB'den istenecekler: sunucu, yedekleme, güvenlik testi, Google ile giriş izni, e-posta göndericisi için izin, alan adı. *Varsayılan: yerli bir VM ve e-posta kodu.*
15. Push bildirimi gibi yurtdışı aktarım kabul edilir mi? *Varsayılan: hayır, yalnız yerel bildirim.*
16. Uygulamanın kaydı resmi devam çizelgesi mi, yardımcı kayıt mı? Senato yönerge çıkaracak mı? *Varsayılan: yardımcı kayıt.*

**Sahiplik ve takvim**
17. İÜ adı ve logosu kullanılabilir mi? Uygulama hangi hesaptan yayınlanacak, kaynak kodun sahibi kim? *Varsayılan: pilot nötr bir isimle kişisel hesaplardan yayınlanır.*
18. Birimin kendi takvimi, tatiller ve ara sınav haftaları neler? *Varsayılan: resmi İÜ takvimi, yönetici düzenler.*

### Sana
1. TypeScript/React mı, Dart/Flutter mı sana daha yakın? Mac'in var mı? Mobil stack buna göre kesinleşecek.
2. Kaç kişi kod yazacak?
3. Pilot hangi dönemde olsun? Önerim Bahar 2027. Güz'ün ekle-bırakı 5-6 Ekim'de; İÜ onayı, KVKK süreci ve mağaza süreleri Güz'e yetişmez.

Ajanların eskalasyonlarının tam metni: `scratchpad/escalations.md`. Kaynaklı raporlar: `scratchpad/research/01..10`.

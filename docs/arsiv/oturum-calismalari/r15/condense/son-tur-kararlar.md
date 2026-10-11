# Son tur: senin kararını ya da elle doğrulamanı bekleyenler

Kaynak: 5 denetçi ve 10 web araştırmacısı (5 Ekim 2026). Metne dokunulmadı.

- **A1 / plan.html**: Tek etkenli giriş lists 'yeni cihaz girişinde e-posta' as a mitigation, but Hoca oturumu only e-mails on the 4th device overflow. Should every new-device login e-mail the hoca (matching the ASVS deviation mitigation), or should the mitigation list say e-mail goes only when the oldest session is closed?
  Alıntı: "4. girişte en eski oturum kapanır, hocaya e-posta gider"
- **A1 / plan.html**: teknik sets WHEN_UNLOCKED_THIS_DEVICE_ONLY, which cannot be read on a locked iPhone; the iOS background task (BGProcessingTask, runs when idle, usually locked) then cannot download or send sorun bildirimi with the session key. Keep it and write that these requests wait until unlock, or switch to AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY (still not backed up, readable in background after first unlock)?
  Alıntı: "Anahtar güvenli depoda, "yalnız bu cihaz" ayarıyla; sunucuda yalnız özeti."
- **A1 / plan.html**: istanbul.edu.tr DMARC is p=none, so anyone can spoof yoklama@istanbul.edu.tr to phish hocas. Do you want to ask BİDB to move DMARC to quarantine/reject, or add a note to hocas that the app never asks for the code by e-mail reply?
  Alıntı: "Kodlar sunucumdan doğrudan <code>@istanbul.edu.tr</code> adına gitmez"
- **A1 / plan.html**: No public trace of an IU BİDB form numbered FR-005 was found. Is the form number confirmed from BİDB? (Workspace SMTP relay itself is still supported, 10,000 messages per user per day.)
  Alıntı: "BİDB'den (Bilgi İşlem Daire Başkanlığı) FR-005 formuyla"
- **A1 / plan.html**: Could not verify whether IU AKSİS offers Excel import for devamsızlık (other Turkish OBS systems do for grades). Can you confirm with an IU instructor before fixing the 'elle girer' design?
  Alıntı: "hoca "AKSİS özeti" ekranına bakıp değerleri AKSİS'e elle girer."
- **A1 / plan.html**: Store reviews of Turkish attendance apps were not re-checked; this and 'Türkiye'deki uygulamalarda en çok istenen özellik' (Öğrencinin ekranı) are unverified as of Oct 2026. Keep as is, or soften to 'sık görülen'?
  Alıntı: "Türkiye'deki yoklama uygulamalarının sık şikâyeti "derse gelip yok yazılmak""
- **A1 / plan.html**: No public IU source confirms that administrative staff and retirees get @istanbul.edu.tr addresses. The design (yönetici approval) holds either way; keep the parenthetical as stated or mark it as unconfirmed?
  Alıntı: "(alan adı idari personel ve emeklilerde de var)"
- **A1 / plan.html**: Google's FAQ shows a 25 USD fee for full distribution verification described as similar to the Play fee, not explicitly one combined fee. Confirm in Play Console that verification via the existing Play account costs nothing extra before keeping 'dahil'.
  Alıntı: "Google Play Console (bir kerelik 25 USD, Android geliştirici doğrulaması dahil)"
- **A2 / plan.html**: Android 12+ belgesi konum iznini doğruluyor ama sistem konum anahtarının açık olması şartını API 31 ile 36 için birincil kaynakta bulamadık. 'açık konum ister' bir cihazda denenene kadar kalsın mı, yoksa 'konum izni ister (konumun açık olması da gerekebilir, denemede ölçülür)' diye yumuşatılsın mı?
  Alıntı: "Android'de Bluetooth taraması da konum izni ve açık konum ister"
- **A2 / plan.html**: İçe aktarma doğru ama düz setEntry ile ham anahtar kısa süre uygulama belleğinde durur. Sunucudan gelen anahtar sarılı aktarımla (importWrappedKey, API 28+) mı gelsin, yoksa kısa bellek süresi kabul mü? StrongBox yoksa TEE'ye düşüş açıkça yazılsın mı?
  Alıntı: "Android'de Keystore'da dışarı çıkarılamayan HMAC anahtarı"
- **A2 / plan.html**: Aktarmalı yöntem doğrulandı, %95 ile 98 rakamı bulunamadı; #hedefler'deki '%2 ile 5 kaçırma oranı ... Acadly'den' de buna dayanıyor. Rakamın kaynağı (Acadly'nin kendi sayfası) eklensin mi, yoksa iki yerde de 'kaynağı doğrulanamadı' denip yumuşatılsın mı?
  Alıntı: "Acadly %95 ile 98 yakalama bildiriyor (üretici verisi, öğrenci telefonları arası aktarmalı yöntem)"
- **A2 / plan.html**: Manchester 30 sn doğrulandı; Uppsala'nın dönen QR'ı var ama süresi okunan sayfada yok. Manchester SEAtS SSS'si kod ve QR'ın 30 saniyede yenilendiğini söylüyor, 'altı haneli kod ders boyunca geçerli' doğrulanamadı. Bu cümlenin kaynağı (öğrenci yorumu) var mı; yoksa çıkarılmak yerine 'doğrulanamadı' notuyla mı kalsın?
  Alıntı: "Manchester ve Uppsala 30 sn. Manchester'da QR'la birlikte gösterilen altı haneli kod ders boyunca geçerli"
- **A2 / plan.html**: Hiçbir kaynak bulunamadı. Elinde duyuru ya da mağaza notu varsa kaynaklara eklensin mi, yoksa 'kaynaksız' diye işaretlensin mi?
  Alıntı: "Düzce'nin D.Ü. Mobil uygulaması 8 ile 18 Mayıs 2026 arasında sertifika hatası yüzünden kullanılamadı; düzeltme yeni uygulama sürümü istedi."
- **A2 / plan.html**: Mağaza sürüm notu bulunamadı. Kaynak eklenecek mi, 'kaynaksız' işaretlenecek mi?
  Alıntı: "UBYS MOBİL Eylül 2026'da QR kamera yakınlaştırmasını düzeltti"
- **A2 / plan.html**: Aksaray yönergesinin Senato tarihi (15.01.2025, karar 01/04) doğrulandı; imza ve 1 hafta kuralı yönerge PDF'i okunmadan doğrulanamadı (https://ogris.aksaray.edu.tr/indir/8e182fcf-d4bf-493a-8d29-7634355fc1ca.pdf). Proliz Mart 2026 olayı için kaynak yok. İkisi için kaynak eklensin mi?
  Alıntı: "girişi kilitleyen bir güncelleme (Proliz, Mart 2026). Aksaray Üniversitesi yönergesi (Senato, 15.01.2025): internet yokken yoklama imzayla alınır, 1 hafta içinde sisteme girilir."
- **A2 / plan.html**: Poll Everywhere'in geniş alan önerisi doğrulandı; iClicker konum sızıntısı ve sahte konum betikleri için birincil kaynak bulunamadı. Bu, #asama23-gps'teki 'sınıfın konumu öğrenci telefonuna gönderilmez' kararının gerekçesi. Kaynak eklensin mi, yoksa gerekçe genel 'tarayıcı konumu kolay taklit edilir' diye mi yazılsın?
  Alıntı: "iClicker'da bir hatayla sınıfın konumu sızdı, sahte konum betikleri yazıldı"
- **A2 / plan.html**: Halk TV haberi var ama tam okunmadı; Düzce Şubat 2026 ve BUÜ Eylül 2026 bulunamadı. Atlas'ın 'numara ve QR yedek' kısmı da doğrulanamadı. Ayrıca Anadolu Üniversitesi 2026 QR yoklaması bulundu, eklensin mi? Kaynaksız olanlar için kaynak verilecek mi?
  Alıntı: "QR yoklama 2025'te basında "fişleme" diye eleştirildi; 2025 ile 2026'da hızla yayıldı (Düzce Şubat 2026, BUÜ Eylül 2026 web tabanlı"
- **A2 / plan.html**: Kaynak bulunamadı. Kaynak eklensin mi, 'kaynaksız' işaretlensin mi?
  Alıntı: "Nişantaşı'nda QR yoklamada bir derste 25 ile 30 öğrencinin kayıtları görünmedi (Ocak 2024)."
- **A2 / plan.html**: Çalışma ve 377/422 rakamları bulunamadı. Elindeki makale künyesi kaynaklara eklensin mi?
  Alıntı: "İÜ İstanbul Tıp Fakültesi 2018'de intörn oryantasyon gününde sabit QR ve Google Formuyla 2 dakikalık yoklama aldı (sabah 377, öğleden sonra 422 katılım)."
- **A2 / plan.html**: Kaynaklar yalnız ikinci kopyanın kurulabildiğini doğruluyor; kopyanın kendi anahtar kanıtını alıp almadığı doğrulanmadı. İlk denemede Özel alan (Android 15+) ve Güvenli Klasör'de anahtar kanıtı cihazda test edilsin mi?
  Alıntı: "Android'de ikinci profil ya da uygulama kopyası (Özel alan, Güvenli Klasör, ikiz uygulama); iPhone'da yok"
- **A2 / plan.html**: boot_id'nin okunabildiğine dair AOSP değişikliği var ama Android 14 ile 16 için SELinux durumu ve BOOT_COUNT okunabilirliği doğrulanmadı. Kabul testine Android 14, 15, 16 cihazlarda okuma denemesi eklensin mi?
  Alıntı: "Android'de çekirdeğin açılış kimliğinden ya da açılış sayısından"
- **A3 / plan.html**: The research confirmed only the Md.19 rates (70/80) and the basic exemption rule in Md.20. The fetched summary of the regulation as amended on 28.09.2025 gave Md.28/4 as unlimited exams for final-year students and Md.35 as student exchange, not 'görevli'. It also did not confirm the AKSİS wording, the FF/DC/DD versus FD split, 20/5 or 9/4. Will you check the article numbers against the current Resmi Gazete or mevzuat text before these citations stay?
  Alıntı: "Kural (Md.19) ... Görevli (Md.35) ... Md.20/5 ... Md.28/4 ... geç ders kaydında (Md.9/4)"
- **A3 / plan.html**: The research found no İÜ directive online (searches returned only other universities). Can you confirm the directive's name and content on istanbul.edu.tr or with öğrenci işleri? The 'only inpatient and health board reports, theory hours only' rule depends on it.
  Alıntı: "İÜ Öğrenci Sağlık Raporları Yönergesi'ne göre sıradan sağlık raporu devamsızlığı silmez"
- **A3 / plan.html**: The official 2026 to 2027 calendars could not be read. Which units have separate calendars, and is 'devamsızlıkların otomasyona işlenmesi için son gün' still the last class day in the lisans calendar? The plan's 'no 7-day grace in the last week' depends on that.
  Alıntı: "Tek genel takvim varsayılmaz (İÜ; Tıp, Diş Hekimliği, Hukuk, AUZEF, Eczacılık ve Konservatuvar için ayrı takvim yayımlıyor)."
- **A3 / plan.html**: The research could not add up the totals from StatCounter's summary. A 19 Jan 2026 anti-fingerprinting change also skews the iOS point-release split. Keep these figures, or re-sum them from the full CSV and add a note that the iOS split is distorted?
  Alıntı: "Türkiye'de Android kullanımının yaklaşık %98'i, iOS kullanımının yaklaşık %97,7'si bu aralıkta (StatCounter sürüm sayfaları, Eylül 2026)."
- **A3 / plan.html**: xprem v3.2.5 (26 Sep 2026) confirmed rollout, rollback and the protocol. Its licence (MIT core), explicit SDK 57 compatibility and Expo-style code signing of updates were not confirmed. Do you want to check these before you depend on it?
  Alıntı: "Uygulamanın JavaScript kısmı mağazaya gitmeden sunucumdaki xprem ile güncellenir (Expo Updates protokolü)."
- **A3 / plan.html**: The research found no primary source saying that turning Samsung Auto Blocker back on blocks the next update of an already sideloaded APK. Should this be tested on a Samsung phone, or softened?
  Alıntı: "yeniden açılırsa sonraki güncelleme yine engellenir."
- **A3 / plan.html**: The 5-minute display-off default could not be confirmed. Microsoft's default differs by edition and power plan, and is often 10 minutes on mains power. Keep 'karartabiliyor', or measure it on a lecture-room PC?
  Alıntı: "çünkü Windows ekranı 5 dakikada karartabiliyor."
- **A3 / plan.html**: MDN's @page page still lists margin boxes as unsupported, and no compat table was checked. The conclusion ('şart değil') still holds either way. Should the browser list be checked by a real print test, or reworded to 'her tarayıcıda çıkmadığı için'?
  Alıntı: "Sayfa numarası yalnız Chrome ve Edge'de çıktığı için şart değil."
- **A3 / plan.html**: Google registers apps by package name plus signing key, which implies the GitHub APK is covered, but no source says so word for word. Keep this as stated, or mark it as something to confirm in Play Console once verification reaches Turkey?
  Alıntı: "aynı anahtarla imzalandığı için GitHub APK da kapsanır."
- **A3 / teknik.html**: SDK 57's minimums (Android 7, iOS 16.4) are confirmed. SDK 58's minimums were not read. Check the SDK 58 changelog before plan.html's 'Expo SDK 57 ve 58'in alt sınırı' stays?
  Alıntı: "58 beta'da (React Native 0.88, React 19.3), alt sınırları aynı."
- **A4 / teknik.html**: Resmî @fastify/type-provider-zod 19 Nisan 2026'dan beri npm'de (1.0.0). Şimdi ona mı geçilsin, yoksa resmî paketin bir sonraki sürümü mü beklensin? Cevaba göre cümle 'şimdi geçilir' ya da '1.0.0'dan sonraki sürümde geçilir' olarak yazılmalı.
  Alıntı: "Fastify'ın resmî @fastify/type-provider-zod paketi yeni sürüm yayımlayınca ona geçilir, kullanım aynı"
- **A4 / teknik.html**: 17 bağımlılık ve Vercel'in 7 Temmuz 2026'daki satın alımı doğrulandı; '27 duyuru' sayısı (bulunan 10 ile 16 arası, tutarsız), başlıktan IP okuma ve açık oturum anahtarı doğrulanamadı. Sayı 'onlarca' gibi yumuşatılsın mı, iki davranış iddiası belirli GHSA kayıtlarıyla mı bağlansın?
  Alıntı: "Better Auth bu iş için 17 doğrudan bağımlılık, 2026'da 27 güvenlik duyurusu, IP'yi yalnız başlıktan okuma, oturum anahtarını açık saklama getiriyordu"
- **A4 / teknik.html**: pmOnFail ayarı var ama anlamı (paket yöneticisi sürüm uyuşmazlığında ne yapılacağı) kilit dosyasını tek parça tutmakla ilişkili görünmüyor; Dependabot'un pnpm 12 desteği de doğrulanamadı. Ayar elle denenip cümle doğru ayarla ve 'hangi dosya, neden' açıklamasıyla yeniden mi yazılsın?
  Alıntı: "Dependabot pnpm 12'nin kilit dosyasını henüz tam okuyamadığından dosya <code>pmOnFail: ignore</code> ile tek parça"
- **A4 / teknik.html**: Sağlık uçları yalnız iç ağdan çağrılıyor; dış denetimin çağırdığı herkese açık uç hangisi (panel ana sayfası mı, Caddy'nin ayrı bir ucu mu)? Adı yazılmazsa okuyucu /health/live sanıp iç ağ kuralıyla çelişki görür.
  Alıntı: "Dışarıdan bir erişim denetimi herkese açık bir ucu birkaç dakikada bir çağırır"
- **A4 / teknik.html**: 'kimlik' hem kökteki ortak altyapıda hem modül listesinde geçiyor. Kökteki kısım oturum doğrulama kancası, modül ise giriş uçları mı? Ayrım tek cümleyle yazılsın mı?
  Alıntı: "Ortak altyapı (veritabanı, iş kuyruğu, kimlik, saat, e-posta) kökte bir kez kaydedilir"
- **A4 / teknik.html**: graphile-worker'ın tek bakımcılı olduğu doğrulanamadı (MIT, sponsor destekli). 'o da tek kişilik' kalsın mı, yumuşatılsın mı?
  Alıntı: "pg-boss (graphile-worker, o da tek kişilik; yalnız kaçış yolu)"
- **A4 / teknik.html**: xprem'in ee/ klasörleri ticari lisanslı. Control plane modu ve kademeli açma MIT çekirdekte mi, yoksa ee/ kısmında mı? Ticari kısımdaysa 'MIT çekirdekle sürer' yedeği bu özelliği kapsamaz.
  Alıntı: "xprem "control plane" modunda (kademeli açma yalnız bu modda var)"
- **A4 / teknik.html**: 2025 ile 2026 arasında SheetJS sürümü bulunamadı ama CDN sayfası okunamadığı için kesinleşmedi; read-excel-file ve write-excel-file bakım durumu denetlenmedi. Elle kontrol edilsin mi?
  Alıntı: "SheetJS (2024'ten beri yeni sürüm yok; yedek read-excel-file ve write-excel-file)"
- **A5 / teknik.html**: Stryker issue #6240 (per-test coverage wrong on Vitest 5) was closed on 3 Oct 2026 as 'not planned'. Its text says the vitest-runner ignores coverageAnalysis, so 'all' does not work around it (moderate confidence, from a summarised issue page). Options: (a) pin Vitest 4 for the weekly mutation run only; (b) keep Vitest 5 and accept that the kırma eşiği is unreliable until Stryker supports it; (c) drop mutation testing until support lands. Which one?
  Alıntı: "Stryker, kırma eşiğiyle; Vitest 5 eklentisindeki hata düzelene kadar <code>coverageAnalysis: "all"</code>"
- **A5 / teknik.html**: No pg-boss 12 source shows an injectable or test clock, and deleteAllJobs is not in docs/api/queues.md (only deleteQueue and deleteJob; one secondary summary lists deleteAllJobs). Should I confirm both against the installed 12.x types before writing code? If there is no clock, use only the core fake clock plus SQL time shifting; if deleteAllJobs is missing, use deleteQueue or deleteJob per queue.
  Alıntı: "ortak kurallar paketinin sahte saati ile pg-boss'un test saati tek nesneden yürür"
- **A5 / teknik.html**: A search snippet reports SheetJS CE 0.20.4 with security fixes (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9), but cdn.sheetjs.com could not confirm it. Should the pinned version move to 0.20.4 once cdn.sheetjs.com shows it?
  Alıntı: "kendi sitesindeki 0.20.3 paket dosyasından kurulur"
- **A5 / teknik.html**: Splitting has no stated end. A single record that still gets 400 has no defined fate, while the plan says a receipted record is never lost. What should happen to it: keep it locally, flag it 'reddedildi' on the student screen, and stop retrying until the next app update? Or report it to the server through a separate error path?
  Alıntı: "400 ya da 413'te paket ikiye bölünür"
- **A5 / teknik.html**: Whether apps can read /proc/sys/kernel/random/boot_id under SELinux on recent Android was not verified. Should the doc say that if the read fails, reboot detection falls back to BOOT_COUNT plus an elapsedRealtime going backwards, and that this is tested on a real Android 15+ phone?
  Alıntı: "çekirdeğin her açılışta ürettiği açılış kimliği (<code>boot_id</code>)"
- **A5 / teknik.html**: Since Nov 2025, Google Play requires native libraries in apps targeting Android 15+ to be 16 KB page aligned. Should the Derleme row add that the AAB is checked for 16 KB alignment (Play Console or zipalign -P 16)? The local module is Kotlin and adds no .so, so the check applies to React Native and Expo libraries.
  Alıntı: "AAB yalnız arm64-v8a ve armeabi-v7a içerir, küçültülür"
- **A5 / teknik.html**: Confirmed: xprem exists with an MIT core, control plane mode on PostgreSQL, v3.2.0 (7 Sep 2026), latest v3.2.5. NOT confirmed from any source: v3.2.0 rejecting old eoas, the latest-3.x-only security policy, the setting name for 'saatlik kullanım bildirimi', and the server-held signing key. Should these be checked against the GitBook and SECURITY.md before release, or kept as they are?
  Alıntı: "v3.2.0'dan beri eski eoas ile yayın reddediliyor, güvenlik düzeltmesi yalnız son 3.x sürüme geliyor"
- **A5 / teknik.html**: These pnpm 12 details were not found on pnpm.io: minimumReleaseAge defaulting to 1 day, audit --fix adding the fixed package to minimumReleaseAgeExclude, and pnpm deploy needing inject-workspace-packages or --legacy. The Dependabot 3-day default cooldown is confirmed. Should I verify these against the pnpm 12 release notes before setup?
  Alıntı: "<code>minimumReleaseAge</code> yeni yayımlanan sürümü en az 1 gün bekletir (açıkça yazılınca katı mod)"

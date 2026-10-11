// D06 spec data, part 3: resolved gaps, contradictions, open points.
module.exports = {
  resolved_gaps: [
    {
      gap: "D06-B01",
      decision: "Tek toplu uç POST /v1/esitleme/gonderim (contracts kararı). D06 yalnız dağıtır: öğeler türüne göre ogeTuruKaydet ile kaydolmuş işleyiciye, aynı işlemde, artan sıra düzeninde ve ardışık aynı tür grupları halinde verilir. Kayıtlı olmayan tür TEKRAR_DENE ve ESITLEME_TUR_BILINMIYOR alır, defterde saklanır.",
      why: "Sıra numarası tek alandır, ikinci çapa paket başına imzalanır, gönderimin yazmaları tek işlemdedir (teknik.html#sunucu-mimari); ayrı uçlar son sıra hesabını ve paket imzasını türlere bölerdi. Kayıt deseni yeni türü ortak dosyaya dokunmadan ekletir."
    },
    {
      gap: "D06-B02",
      decision: "İkinci çapa paketin tek imzalı bölümüdür: metin, UTF-8 JSON'un base64url halidir { tur: 'ikinci_capa', v: 1, kurulum, paket, belge (saat belgesi aynen), istekSuresiMs, ogeler: [{ id, olaydanBelgeyeMs } ya da { id, yokNedeni: 'SONRA_YENIDEN_BASLATMA' }] }. İmza metnin ASCII baytları üzerinde ECDSA P-256 SHA-256, DER: 'a' Android cihaz anahtarı, 's' iPhone Secure Enclave ikinci anahtarı (D05-B02 kodları); personel paketinde 'o' imzasızdır, geçerli personel oturumuna bağlanır. D06 anahtarı D01.cihazAnahtariGetir'den (app.ts'ten seçenekle) alır ve türü eşler: 'a' yalnız 'android_p256', 's' yalnız 'secure_enclave' anahtarıyla doğrulanır; 'app_attest' anahtarı paket imzasında hiç geçmez (App Attest düz ECDSA değil, onay üretir); eşleşmeyen tür ya da tutmayan imza 'imza tutmuyor' sayılır: öğeler YOK PAKET_IMZASIZ alır ve imzadan kimlik kurulmaz. Açık anahtarın kodlaması D01'den beklenir (SPKI DER önerisi). D06 tur, v, kurulum ve paket alanlarını karşılaştırır, belgeyi açmaz; belgenin MAC'i ve çapa hesabı işleyicinin çağırdığı D04.saatBelgesiDogrula ve packages/core/src/saat saatSonucu'nundur. Öğeler imzalı bölümün dışında, kendi zarflarıyla gider; işleyiciye öğe başına { durum: 'VAR', imzaTuru, belge, istekSuresiMs, olaydanBelgeyeMs } ya da { durum: 'YOK', yokNedeni } verilir. yokNedeni D04'ün büyük harfli sabitlerinden içe aktarılır (SONRA_YENIDEN_BASLATMA, PAKET_IMZASIZ, OKUTMA_YOLU, BASKA_CIHAZ_GONDERDI, ESITLEME_BOZUK, GONDERILMEDI); D06 bağlamda yalnız dördünü üretir (SONRA_YENIDEN_BASLATMA, PAKET_IMZASIZ, ESITLEME_BOZUK, GONDERILMEDI), OKUTMA_YOLU ve BASKA_CIHAZ_GONDERDI tipin parçasıdır. Belge ucu (POST /v1/saat/belge) için D06 ikinci çapa imza yardımcısı vermez: belge ucu oturumla ve app.ts'in saatOznesiKur'uyla çalışır.",
      why: "Kayıt zarfı ilkesiyle aynı: gelen baytlar doğrulanır, yeniden biçimlendirilmez (teknik.html#sunucu-imza-dogrulama); JSON ayrıştırıcıdan bağımsızdır. tur alanı aynı Android anahtarının kayıt imzasıyla karışmasını önler. Tür eşlemesi yanlış türden anahtarla doğrulama yapılmasını engeller. Bölünen pakette yalnız bu küçük metin yeniden imzalanır. D06 D04'ün sunucu dış yüzünü çağırmaz (contracts notu). Neden değerleri tek yerde yazılır, başka modül içe aktarır (contracts.json ortak kural, adlar)."
    },
    {
      gap: "D06-B03",
      decision: "Rota şeması yalnız zarfı denetler: ogeler en çok 200; her öğede tur (64), sira (1 ile 2^53-1), ogeKimligi (64), govde (65536), ilkCapa (nesne ya da null), ulasmaMakbuzu (128); yerelRetler gevşek zarfla (sıra herhangi bir tam sayı, metinler 512). Tür deseni, UUIDv7, ilkCapa şeması (yalnız ilkCapaVar türde), türün govdeEnBuyukBayt sınırı ve yerel ret girdileri D06'da tek tek denetlenir; uymayan öğe RET ESITLEME_OGE_GECERSIZ alır ve deftere yazılır, uymayan yerel ret girdisi atılır ve sayılır. Gövde sınırı 1 MiB (D13-B11); telefon paketi 200 öğe ve 768 KiB ile sınırlar. 200'ü aşan öğe sayısı alan yolu ogeler olan şema hatasıdır (400 API_ISTEK_GECERSIZ); telefon bunu 413 gibi böler. Alan yolu ogeler dışını gösteren 400 bölünmez (D06-C05).",
      why: "Plan 'bozuk kayıt paketi düşürmez' der (plan.html#kararlar-gonderme); şema öğe içini tiplerse tek bozuk öğe paketi 400 ile düşürür ve telefon 16 kadar istekle böler. yerelRetler sıkı şemayla denetlenseydi tek öğede reddedilen değer (aşırı uzun kimlik ya da tür) aynen yerel ret girdisine geçer, her sonraki paket 400 alır ve kurulumun bütün kayıtları güncellemeye kadar takılırdı. Envanterdeki 512 KB önerisinin yerine D13'ün tek gövde sınırı geçerlidir; telefonun 768 KiB payı 413'ü olağan akıştan çıkarır."
    },
    {
      gap: "D06-B04",
      decision: "Öğe sonucu { sira, ogeKimligi, tur, sonuc, gerekce, ulasmaAni, ulasmaMakbuzu, beklemeSaniye, ayrinti }; sonuc KABUL, ZATEN_VAR, RET, TEKRAR_DENE ve gerekce x-extensible-enum. ulasmaAni, defterin kabul_ani'si ve makbuzun anı tek değerdir: işleyicinin döndürdüğü OgeSonucu.ulasmaAni (KABUL'de GelenOge.ulasmaAni, ZATEN_VAR'da öğe türünün modülünün sakladığı ilk ulaşma, ör. hocanın makbuz okutmasıyla gelen kaydın anı). ZATEN_VAR öğe türünün modülündeki güncel ayrıntıyı (yoklamada karar) da döner. ayrinti şeması öğe türünün modülünün sözleşmesindedir. Telefon bilinmeyen sonucu TEKRAR_DENE gibi, en uzun aralıkla işler ve günlük sayaçlara yazar.",
      why: "Makbuz ulaşmayı ve kararı ayrı adımlar olarak gösterir (tasarim.html#ph-success); hoca okutmasıyla ulaşmış kaydı yeniden yollayan telefon ZATEN_VAR ile 'Sunucuya ulaştı' olur ve gördüğü an kaydın kendi modülünde saklanan anla aynıdır (plan.html#kararlar-kayit-ve-makbuz). Bilinmeyeni TEKRAR_DENE saymak 'makbuzu olan kayıt kaybolmaz' kuralını (teknik.html#testler-birim) bozmayan tek seçenektir."
    },
    {
      gap: "D06-B05",
      decision: "D06'nın payı karara bağlandı: RET ve TEKRAR_DENE öğe sonuçlarıdır, sunucu kararı (Var, Beklemede, İncelemede, Ret) ayrıntıda ayrı alandır. D06'nın kendi RET kodları yalnız taşıma düzeyindedir: zarf geçersiz, sıra çakışması, rol uymuyor, oturum isteyen türde kapanmış cihaz, kısıt ihlali, yerel ret. Doğrulanabilen ama geçersiz bir kaydın KABUL ve Ret kararıyla mı saklanacağı, RET ile mi geri çevrileceği öğrencinin ekranını değiştirdiği için ürün kararı olarak onaya bırakıldı: açık nokta D06-A01.",
      why: "Plan 'ret' sözcüğünü iki anlamda kullanıyor; sözlük ayrımı D06'da kesin olmalı ki telefon makbuzu doğru göstersin. Hangi gerekçenin hangi sınıfta olduğu D05 ve D07'nin işleyici kuralıdır (D05-B05, D07-B03 aynı soruyu taşıyor)."
    },
    {
      gap: "D06-B06",
      decision: "Öğe düzeyinde TEKRAR_DENE: D06'nın gerekçeleri ESITLEME_TUR_BILINMIYOR (beklemeSaniye 3600), ESITLEME_OTURUM_GEREKLI, ESITLEME_GECICI_CAKISMA (kilitlenme, serileştirme, kilit ya da deyim zaman aşımı), ESITLEME_ISLEYICI_HATASI (beklemeSaniye 600) ve ESITLEME_ZAMAN_BUTCESI; öğe türü modüllerinin geçici gerekçeleri kendi kodlarıyla. Öğe düzeyindeki TEKRAR_DENE'de yalnız o öğe 2 saniyeden 10 dakikaya artan, rastgele kaydırılmış aralıkla, en az beklemeSaniye kadar bekler; öğenin defter satırı olduğundan sonraki paketler onu atlayabilir. Paket düzeyindeki hatada (ağ, zaman aşımı, 408, 429, 5xx) öğeler değil kurulum bekler ve sonraki paket en küçük cevapsız sıradan başlar; bekleme sırasında oluşan öğe tek başına gitmez. Yoklama anında tetiklenen ilk gönderim de 0 ile N saniye kaydırılır (N başlangıçta 10, yük testiyle yazılır). Saati yalnız ikinci çapayla kurulabilen kayıt da pakete konur: ikinci çapa yoksa işleyici (D05) kaydı saklamadan TEKRAR_DENE döner. plan.html#kararlar-gonderme'deki 'o turda gitmez' böylece kayıt sayılmadan telefonda beklemek olarak karşılanır. TEKRAR_DENE deftere yazılır.",
      why: "Tek öğenin geçici sorunu öbür 199 öğeyi bekletmez; aralık plandaki kuralla aynıdır (teknik.html#telefon-gonderme-protokolu). Paket hatasında öğe başına bekleme, beklerken oluşan öğeyi tek başına ve cevapsız öğelerin üstünde gönderir, defterde delik açardı; kurulum beklemesi deliği açmaz. İlk gönderim kaydırması plan.html#kararlar-yeniden-deneme'nin kararıdır (ders çıkışında herkes aynı anda göndermesin). Kaydı telefonda tutmak yerine göndermek kararı tek yerde (sunucuda) bırakır ve defterde boşluk açmaz."
    },
    {
      gap: "D06-B07",
      decision: "Kesintisiz son sıra kurulum başınadır: en büyük n ki 1..n her sıranın defterde (sonucu ne olursa olsun) satırı var. Her öğe türü sıra tüketir; sıra kurulumda 1'den başlar, boşluksuz artar, dönemle sıfırlanmaz. Gönderim ve indirme cevaplarının ikisi de sonSira döner. Telefon kurulum başına gördüğü en büyük sonSira'yı saklar; daha küçük bir sonSira gerilemedir (sunucu yedekten döndü): telefon yeni değerin üstündeki ULASTI ve RET öğelerini o gerileme için bir kez, ulaşma makbuzlarıyla yeniden gönderir ve saklanan değeri yeni değere indirir; 'bir kez' öğenin ömrü değil gerileme başınadır. Olağan akışta delik açılmaz: paket her zaman en küçük cevapsız sıradan başlar, TEKRAR_DENE ve yerel retler deftere yazılır, bölünen paketin sol yarısı önce sonuçlanır. Tek öğe yine bölünecek cevap alırsa (yalnız telefon hatasında olur) telefon sonraki pakette yerelRetler ile bildirir, D06 RET ESITLEME_YEREL_RET yazar; böyle öğe yeniden gönderilmez, gerilemede yeniden bildirilir. teknik.html#kod-veri-modeli'nin Cihazlar maddesindeki 'cihazdan alınan son sıra numarası' cihaz satırında değil kurulumlar tablosunda tutulur; plan.html#hedefler'deki (cihaz, sıra numarası) boşluğu burada (kurulum, sıra) boşluğudur.",
      why: "En büyük sıra, sırasız varışta küçük sıralı öğe ulaşmadan ilerler; WAL'ın en çok 5 dakikalık kaybı (teknik.html#veritabani-yedek) onu silerse telefon yeniden yollamaz ve 'makbuzlu kayıtta kayıp 0' bozulur. Gerilemeyi saklanan en büyük değerle anlamak, delik üstünde kalmış bir öğenin tek yeniden gönderim hakkını olağan akışta harcamasını önler; plan.html#gun-kenar-durumlar'ın 'telefon sonrakileri yeniden gönderir' kuralı her dönüşte yeniden çalışır. Son sıra tek yazar kuralıyla D06'dadır (contracts: kurulumlar)."
    },
    {
      gap: "D06-B08",
      decision: "Kurulum, bir uygulama kopyasında bir hesabın kuyruğudur. Telefon her hesap için ayrı UUIDv7 kurulum kimliği üretip yerel veritabanında saklar, aynı hesap yeniden girince aynı kimliği kullanır; yerel veritabanı ile anahtarlar tutmazsa (yedekten dönüş, başka telefona aktarma) bütün kimlikleri yeniler, eski öğeler eski kimlik ve sıralarıyla, X-Kurulum-Kimligi başlığında eski kimlikle gider. Sunucuda kurulumlar satırı ilk doğrulanmış istekte açılır, kişisi değişmez. Kurulum başka kişininse istek 403 ESITLEME_KURULUM_BASKA_HESABIN alır: bu telefon hatasıdır, telefon o kurulumu durdurur, olayı sayar ve aynı cihazda bu yüzden yeni kurulum açmaz (yeni kimlik sıraları 1'den başlatır ve D05'in (dönem, cihaz, sıra) tekilliğine çarpardı). Kayıt giriş güveninde kullanılmaz.",
      why: "Planın kurtarma kuralı hoca işlerine de uygulanır ve oturum yenilense de bozulmaz (plan.html#gun-kenar-durumlar). Bir hesabın bekleyen işi başka hesabın su seviyesini takmaz. Yedekten dönen kopya eski kimliği sürdürseydi eski telefonun kullandığı sıraları yeniden kullanır, geçerli yeni kayıtlar SIRA_CAKISMASI alırdı. 401 yerine 403: personel telefonu indirmede 401'i çıkış sayıp listeleri siler (D06-B27), telefon hatası listeleri sildirmemeli; teknik.html#telefon-gonderme-protokolu 403'te de gönderimi durdurur."
    },
    {
      gap: "D06-B09",
      decision: "Öğeler paket içinde artan sıra düzeninde işlenir; ardışık aynı tür öğeler tek grupta işleyiciye verilir. Paketteki bütün öğeler kurulumun hesabınındır; isteğin kişisi kurulumun kişisi değilse istek 403 alır. Telefon kurulum K'nin paketine K'nin hesabı girişliyse onun oturumunu koyar; değilse öğrencide Bearer'sız gönderir (yalnız imza), personelde göndermez ve girişi bekler. Böylece personel işi yalnız ait olduğu hesabın oturumuyla işlenir, başka hesabın işi telefonda o hesabın kurulumunda bekler ve o hesap yeniden girince gider (D01-B14). Aynı ayar için birden çok kaynaktan gelen işlerin sırası ve geç gelen değişiklikte kararların yeniden verilmesi D04'ündür; işlem anının ilk çapası öğe zarfının ilkCapa alanında (şeması D04'ün IlkCapaAlanlari, kaydında ilkCapaVar true olan her türde), ikinci çapası bağlamda gelir.",
      why: "'Girişten sonra gider' kuralı (plan.html#kararlar-roller) yanlış hesaba gitmeden korunur. D04 spec'indeki 'öğe hesabı oturumun kişisiyle aynı olmalı' şartı paket düzeyinde karşılanır: başka hesabın öğesi işleyiciye hiç ulaşmaz. D09'un sorun_bildirimi oluşturma anını aynı ilkCapa alanında taşıdığından alan personel işleriyle sınırlı değildir."
    },
    {
      gap: "D06-B10",
      decision: "İstek düzeyinde kişi D13'ün istek hattında, işleyiciden önce kurulur: kök oturum kancası Bearer'ı doğrular (bu rotada geçersiz Bearer ve değişim bekleyen kısıtlı oturum yalnız istek.oturumHatasi'na yazılır; KIMLIK_KAPSAM_SINIRLI olan istek oturumsuz sayılır); D06'nın kimlik kancası (oncekiKancalar) oturumu istek.kimlik'ten okur, oturumDogrula'yı yeniden çağırmaz; ikinciCapa 'a' ya da 's' ise imzalı metinden yalnız kurulum ve paket alanlarını çözer, kısa bir salt okunur işlemde D01.cihazAnahtariGetir, cihazGetir ve kisiGetir (app.ts'ten seçenekle) ile anahtarı, cihazın durumunu ve kişiyi okur, türü eşleyip imzayı doğrular (anahtar etkin, yenilenmiş, cihazı kapanmış ya da hesabı silinmiş olabilir). Oturum yok ve imza geçerliyse istek.kimlik = { tur: 'cihaz', kaynak: 'imza', kisiId, cihazId } yazılır; X-Saat-Belgesi kancası özneyi buradan bulur. İşleyicilere PaketBaglami.kimlik verilir: oturumdan gelen istek.kimlik, öğrenci cihaz imzalı oturumsuz pakette null (D05 dersYetkisi'ne bunu verir). Silinmiş hesap PaketBaglami'nda alan olarak taşınmaz; gerektiğinde D01.hesapSilindiMi ile denetlenir. İkisi de varsa ve kişiler farklıysa 403 ESITLEME_KIMLIK_UYUSMUYOR. Ardından D13'ün beyan denetimi: kimlik yoksa 401 API_KIMLIK_GEREKLI. Kurulumun kişisi işleyicide, kurulum satırı kilidi altında denetlenir. Öğe düzeyinde tür kaydı roller ve oturumGerekli taşır: yoklama_kaydi öğrenci, oturumsuz (kendi imzası); sorun_bildirimi öğrenci, oturumlu; hoca işleri personel, oturumlu; telefon_sayaci iki rol, oturumsuz. Rol uymazsa RET ESITLEME_YETKI_YOK; oturum yoksa imzalayan cihaz kapanmışsa (cihazGetir durum 'kapandi') RET ESITLEME_OTURUM_KAPALI, değilse TEKRAR_DENE ESITLEME_OTURUM_GEREKLI. Pasif cihazın kayıtlarının kararı D01 ve D07'nindir.",
      why: "D13 beyan denetimini modül kancalarından sonra, işleyiciden önce yapar (D13-B05, D13-B06); kimliği işleyicide kurmak her imzalı paketi kökte 401 ile düşürür, D06-C03'ü ve plan.html#gun-kenar-durumlar'ı bozardı. Oturum şart olsaydı cihaz değişiminden sonra eski telefondaki ve yedekten dönen kayıtlar hiç ulaşamazdı; bekleyen kayıtlar hiçbir zaman engellenmez (plan.html#dagitim-guncelleme-ilkesi). Kapanmış cihazın telefonu bir daha oturum alamaz; oturum isteyen öğesi TEKRAR_DENE ile sonsuza dek bekleyip bekleyen sayısını ve hesap silme koşulunu tıkardı."
    },
    {
      gap: "D06-B11",
      decision: "Öğrencinin kendi verisi öğrenci başına sürümle (ogrenci_durum_surumleri) GET /v1/esitleme/degisiklikler cevabının ogrenci bölümünde iner; bölümler D05 (kayıtlar ve kararlar), D08 (devam durumu) ve D09 (düzeltmeler ve sorun bildirimleri) kaynaklarından. Kaynak 'şu sürümden beri' farkı ya da tam liste döner (tam bayrağı). ogrenci_kayitlari bölümünün her satırı ve kararlar listesi KararSurumu taşır (kayit_karar_gecmisi.sira, tam sayı en az 1); telefon onu kayıtla saklar ve sorun bildiriminde aynen geri yollar. Bölüm çok sayfalı indirmenin ilk sayfasında gelir. Telefon sunucunun listesinde bulduğu her yerel kaydı ULASTI yapar.",
      why: "Genel sayaç satırında sıcak nokta olmaz, yalnız o öğrencinin satırı kilitlenir; ayrı uç açılmadığı için ders çıkışındaki 2 ile 3 istek bütçesi korunur (plan.html#teknoloji-sunucu-yeri). Karar değişiklikleri push olmadan çekmeyle iner (plan.html#kararlar-supheli-kayit). Telefon yalnız indirdiğini geri yollayabilir; karar sürümü indirmede yoksa D09'un teslim araması hiç eşleşmez ve 3 günlük sınır uygulanamazdı."
    },
    {
      gap: "D06-B12",
      decision: "Teslim anı telefonun sakladığını kanıtladığı sunumdur: indirme bir karar sürümünü sunduğunda karar_teslimleri satırına sunulan_durum_surumu, sunulan_kurulum_id ve son_sunulma_ani yazılır; telefon sayfayı ve imleci aynı yerel işlemde saklar; sonraki istekte (gönderim ya da indirme) imleçteki öğrenci sürümü sunulan sürüme eşit ya da büyükse telefona_ulasti_ani = son_sunulma_ani tek UPDATE ile yazılır. Cevap kaybolursa onay gelmez, sonraki sunumun anı geçerli olur. Gönderim cevabındaki karar ayrıntısı teslim sayılmaz. kararTeslimAni sunum ve teslim anlarını birlikte verir; onaysız sunumun nasıl sayılacağı açık nokta D06-A02. Anlar saat arayüzünden yazılır.",
      why: "Sunucu cevabın telefona yazıldığını ancak telefonun sonraki isteğinden öğrenir; kaybolan cevapta süre yanlış başlamaz, gecikme öğrencinin lehinedir. Yalnız onay anı dönseydi imlecini hiç geri yollamayan istemci her şikâyet penceresini sonsuza dek açık tutar, D09 'hiç sunulmadı' ile 'çok kez sunuldu, onaylanmadı'yı ayıramazdı. Kural taşıyan an SQL now() ile yazılmaz (teknik.html#testler-veritabani-sifirlama). Karar değişince sürenin yeniden başlaması D09'un kuralıdır."
    },
    {
      gap: "D06-B13",
      decision: "kurulumlar.son_temas_ani her doğrulanmış gönderim ve indirmede saat arayüzünden yazılır, seyreltilmez; bekleyen_yoklama_sayisi telefonun bildirdiği sonuçlanmamış yoklama_kaydi sayısıdır (gönderimde paketin TEKRAR_DENE alan yoklama_kaydi öğeleri eklenir, en çok 100000); telefon_sayaci ve sorun_bildirimi gibi türler sayılmaz. İndirmenin yazımı satır kilitliyse atlanır (aynı anda süren gönderim zaten yazar). kurulumSonTemasi kişinin bütün kurulumları içinde en son teması ve herhangi bir kurulumun kendi son temasında bekleyen yoklama bildirip bildirmediğini verir; çok kişide toplu kurulumSonTemaslari(tx, kisiIdler) tek sorguyla aynı değeri verir; bekleyen öğe sayısı (bekleyenOgeSayisi) verilmez, bağlantı nedeni için boolean yeterlidir. KARAR BEKLİYOR kuralı D08 ve D10'undur. Ders başına bekleyen listesi tutulmaz: bekleyen yoklaması olan bir kurulum bütün dersler için 'bağlanmamış' sayılabilir, bu yön öğrencinin lehinedir (D08-B16'nın ders başına beklentisinin yerine).",
      why: "Son oturumun kapanışından hemen sonraki temas atlanırsa öğrenci yanlışlıkla KARAR BEKLİYOR görünür (plan.html#devam-donem-sonu). Yalnız en son temasın kurulumuna bakmak, yeni telefon eşitlenirken eski telefonda gönderilmemiş kayıtları gizlerdi; gün kapanışındaki sayaç gibi rutin öğeler de yanlış KARAR BEKLİYOR üretirdi. Bekleyen yoklamayla temas seyrektir; ders listesi taşımak sözleşmeyi büyütürdü."
    },
    {
      gap: "D06-B14",
      decision: "GET /v1/esitleme/degisiklikler?imlec&adet&yapiSurumu&bekleyenYoklamaSayisi. İmleç opak base64url: '1|sistemKimligi|zamanCizelgesi|genelSurum|kapsamSurumu|ogrenciSurumu|yapiSurumu|hesapOzeti' (64 bitlik değer ondalık metin; hesap özeti kişi kimliği ile teyit durumunun ('1', '0', personelde '-') birleşiminin SHA-256'sının ilk 16 onaltılık hanesi; teyit durumu D01.ogrenciHesabiGetir'den okunur, teyit değişince baştan indirme olur ve öğrencinin adı o indirmede iner; D03 teyidi bilmez, degistiMi'ye teyit gelmez). kapsamSurumu, kapsamın en son hesaplandığı sayaç değeridir; kapsam değişikliği yalnız bundan sonrası için sorulur, yoksa çok sayfalı tam indirmede öğrencinin kendi liste satırı indirmeyi her sayfada baştan başlatırdı. Sayfa sürüm sınırında kesilir (Durumlar ve kurallar, sayfa kesme). İmleç hesap ve yapı sürümüne bağlıdır; telefon her sayfayı tek yerel işlemde uygular, imleci aynı işlemde saklar. Baştan indir hata kodu değil 200 cevabında alandır (D13). Tam indirme numarası: telefon bastanIndir gelen sayfayla aynı yerel işlemde yeni bir numara yazar, o tam indirme boyunca gelen her satıra damgalar (uygulama yeniden başlasa da numara kalır), devamiVar false olunca bu numarayı taşımayan program ve liste satırlarını siler; herhangi bir sayfada yeni bastanIndir yeni numara açar. Önbellek baştan boşaltılmaz; sonuç plan.html#kararlar-indirme'deki 'silip yeniden çeker' ile aynıdır ve arada program boş kalmaz.",
      why: "Ders çıkışındaki 'gerekirse değişenler' tek istektir (plan.html#teknoloji-sunucu-yeri); imleç metin olduğu için 64 bit sorun olmaz (D13-B15); hesap özeti başka hesabın imleciyle veri kaçırmayı önler, teyidi de taşıdığı için teyitten sonra öğrencinin kendi adı ve teyide bağlı devam bilgisi hemen iner. Kalıcı numara olmadan yarıda kalan tam indirme artımlı gibi sürer ve yalnız yedekten dönüş öncesinde var olan bir telafi oturumu ya da hocanın kaybettiği ders telefonda kalırdı. Sayfa adı adet, D13-B13 sorgu adıyla aynı."
    },
    {
      gap: "D06-B15",
      decision: "Kapsam değişince o kullanıcıya baştan indir; kapsam değişikliği yalnız bu yolla işlenir. Öğrenci kapsam kaynağını D03 'ogrenci_liste_kapsami' adıyla kaydeder (öğrencinin silinmemiş, etkin ya da pasif liste satırlarının şubeleri; veri ve uyelik_surumu D03'ün), personel kapsam kaynağını D02 kaydeder (dersin hocası ve hoca atama sürümü); degistiMi kapsamSurumu'ndan sonra öğrencinin liste satırlarında ya da kişinin hocası olduğu derslerde herhangi bir değişiklik olduysa true döner (yanlış pozitif serbest, yanlış negatif yasak). Kapsam şube, ders ve birim kümesidir; öğrencide numarası ve teyit durumu da bağlamda verilir (D06 D01.ogrenciHesabiGetir ile okur ve teyidi imleçteki hesap özetine katar, D03-A09); teyitsiz öğrenciye kendi liste satırının adı inmez, çünkü kapsamı yalnız numara iddiasına dayanır. Her genel kaynak yalnız surumden < surum <= surumeKadar satırlarını döner: sanal kapsamdan çıkış satırı ve 'sürüme bakılmadan' satır yoktur, sonradan eklenen öğrenci ya da devralan hoca dersin bütün satırlarını baştan indirmeyle alır. Silindi işareti satır kullanıcının görme kapsamından çıkınca kullanılır; pasiflik veri alanıdır, pasif liste satırı dersi kapsamdan çıkarmaz, pasif öğrencide ders telefonda kalır (D03-B13). Satır ve sütun süzgeci kaynağı kaydeden modülün rol başına sütun listesidir (D02 satırları için D02-B29: öğrenci oturum satırında saat sayıları, kısa kod ve QR ayarı alır; bunlar yerel hak hesabı, QR karşılaştırması ve internetsiz kamera için gerekir). D06'nın sabit kuralı yalnız şudur: kafa sayısı ve yapıldı öğrenciye inmez.",
      why: "'Şu sürümden beri değişenler' süzgeç değişince yanılır: sonradan eklenen öğrencinin dersi eski sürümde kalır. Öğrencinin kapsamı D03'ün verisi ve sürümüyle hesaplanır; D02 üzerinden kurmak D03'ün satırını D02'nin içinden okuyan ikinci bir yol açardı (contracts.json karar 'Öğrenci kapsam kaynağı'); degistiMi'nin uygulayıcısı yoksa yeniden başlatma kuralı çalışmazdı. Sürüme bakmayan satırlar sayfa kesmeyi bozar (üst sürüm imleçten küçük kalır, devamiVar döngüye girer). Öğrencinin tam indirmesi birkaç yüz, hocanınki birkaç bin satırdır; kapsam değişikliği seyrek olduğundan baştan indirme ucuz ve kesin doğrudur. Sabit sütun listesi telefonun ihtiyaç duyduğu alanları atardı."
    },
    {
      gap: "D06-B16",
      decision: "Dönem durumu D02'nin kilit kaynağıyla (kapsamdaki birimlerin birim ve dönem satırı) genel indirmede iner; son hafta telefonun bildiği son oturumdan ve D02'nin kilit genel kaynağındaki birim dönemi satırıyla inen son gün ve kilit anından çıkarılır (D02-B32; D08-B23). Telefon kilitli dönemin yalnız ULASTI öğelerini siler; sonuçlanmamış öğeyi kilitten sonra da saklar ve gönderir.",
      why: "Contracts D02'yi kilit kaynağı olarak kaydetti; öğrenciye inen 'yalnız' listesine kişisel veri eklenmez (plan.html#kararlar-indirme). Son günden sonra gelen kayıt yine saklanır (plan.html#kararlar-gonderme-suresi)."
    },
    {
      gap: "D06-B17",
      decision: "Dönemin bütün oturumları üretildikçe iner (öğrenci başına dönemde en çok yaklaşık 170 satır); kayan pencere yok.",
      why: "Kayan pencere 'değişenler' mantığıyla ifade edilemez; aynı gün eklenen telafi dersi yeni sürümle hemen internetteki telefona iner (plan.html#kararlar-kafa-sayisi)."
    },
    {
      gap: "D06-B18",
      decision: "Silindi işaretli satırlar temizlenmez (indirilen tablolar küçüktür; D12-B16'ya göre bu satırlar fiziksel silinmez). degisiklik_sayaci.en_eski_gecerli_surum (başta 0, satır yoksa 0 sayılır) yükseltilirse altındaki imleçler baştan indirir; değeri yalnız D06'nın yönetim komutu (apps/server/src/cli/esitleme-en-eski-surum.ts, enEskiGecerliSurumuYukselt ve aynı işlemde D09.denetimeYaz olayı) değiştirir; göç satır yazmaz (D12-B34), satır ilk kullanımda INSERT ... ON CONFLICT (id) DO NOTHING ile açılır.",
      why: "Bugün ek iş yok; ileride bir veri düzeltmesi bu değeri yükseltip herkesi güvenle baştan indirtebilir. 'Çok eski imleç' tek değere bağlanır. Test sıfırlaması bütün tabloları boşalttığından göçle eklenen satır her senaryoda kaybolurdu; komut denetim izi bırakır."
    },
    {
      gap: "D06-B19",
      decision: "Sürüm tek düzenekle verilir (contracts.json ortak kural 'Sürüm damgası'): telefona inen satırı yazan kod surumDamgasiIste(tx, damga) ile damgayı işleme bağlar; işlemi kuran modül son adımda surumAl(tx)'ı bir kez çağırır; surumAl UPDATE degisiklik_sayaci SET surum = surum + 1 WHERE id = 1 RETURNING surum çalıştırır (satır yoksa ilk kullanımda INSERT ... ON CONFLICT (id) DO NOTHING ile açar), sayaç bir kez artar ve bekleyen bütün damgalar aynı sürümle çağrılır; satır kilidi işlem sonuna kadar kalır, okuyucu satır yoksa sürümü 0 sayar. Damga yalnız işlemde zaten kilitli satırları günceller; sayaçtan sonra yeni satır kilidi alınmaz (bu kural kalır). Damgalı işlem surumAl çağrılmadan biterse surumDamgasiIste'nin D12.islemSonuKancasi ile kaydettiği denetim hata atar ve işlem geri alınır. Sıra: danışma anahtarları, satırlar, iş kuyruğu (D14.isGonder) ve öğrenci sürümü (ogrenciDurumuDegisti), en son genel sayaç. Yalnız telefona inen bir sütun değişince damga istenir. Gönderimde işlemi kuran modül D06'dır: öğe işleyicisi surumAl çağırmaz, baglam.surumlaDamgala (surumDamgasiIste'ye giden kısayol) ile damga bırakır; D06 paket sonunda, bütün gruplardan, öğrenci onayından, defter ve kurulum yazımından sonra surumAl'ı bir kez çağırır. Üretimde işlemi kuran modül D02'dir: D04'ün üretim dinleyicisi surumAl çağırmaz, damga bırakır. Parça SAVEPOINT'i geri alınınca o parçada kaydedilen damgalar düşer. Öğrencinin yoklama gönderimi damga kaydetmez, sayaca dokunmaz. Okuyucu sayacı kilitsiz okur ve satırları surum <= okunan değer ile süzer.",
      why: "teknik.html#kod-veri-modeli tek sayaç satırını seçti; satır kilidi bitiş sırasıyla sürüm sırasını eşitler, okuyucu v+1'i görüp v'yi atlayamaz (SEQUENCE bunu garanti etmez). Damganın işleme bağlanması sürümü birden çok yazıcının arasında tek değere indirir ve unutulan surumAl'ı sessiz kalmaktan çıkarır (işlem geri alınır). D04'ün pencere işleyicileri paketin ortasında surumAl çağırsaydı sayaç satırı paketin geri kalanı (bir kafa sayısı bütün oturumu D07 ve D05 üstünden yeniden karara bağlar) boyunca, 8 saniyeye kadar kilitli kalır, ders sonunda inen satır yazan her işlem lock_timeout alır ve panel işlemleriyle kilitlenme kurulurdu. Ertelenmiş damga kilidi COMMIT'e en yakın ana çeker. Sıcak yol (saniyede 70 ile 330 gönderim) sayaçtan uzak kalır."
    },
    {
      gap: "D06-B20",
      decision: "Nesil D12.nesilOku(tx) ile değişenler sorgusuyla aynı işlemde okunur; okuma yetkisi, terfiden sonraki CHECKPOINT ve zaman çizelgesinin çapraz denetimi D12'nindir (D12-B32). Geri yükleme denemesinde eski imleçle baştan indir alındığı D06 senaryosuyla da denenir.",
      why: "Nesil elle tutulmaz (plan.html#kararlar-indirme); veritabanı kurulumu ve dönüş adımları D12'nin kapsamı."
    },
    {
      gap: "D06-B21",
      decision: "Saat belgesi D06 gövdesine girmez: telefon her isteğe X-Saat-Istegi başlığıyla tek kullanımlık değer koyar, kök onSend kancası (D13, D04) iki D06 cevabına da X-Saat-Belgesi ekler (iki rotada saatBelgesi true), eşitleme bozukken eklemez. İmzayla gelen gönderimde öznenin cihazı D06 kimlik kancasının yazdığı istek.kimlik'tedir. Gönderimden hemen önceki belge D04'ün POST /v1/saat/belge ucundan alınır ve ikinci çapaya girer.",
      why: "Plan 'sunucunun diğer cevapları da yeni belge taşır' der (plan.html#gun-ikinci-capa); tek mekanizma kökte kalınca her modül ayrı yazmaz (D13-B22), kanca doğrulanmış özne ister. Gönderme cevabındaki belge gönderim öncesi isteğin yerini tutmaz (plan.html#teknoloji-sunucu-yeri)."
    },
    {
      gap: "D06-B22",
      decision: "gondermeSuresiSonu(oturumBitisAni, kilitAni) = en erken(oturumBitisAni + 7 x 86.400.000 ms, kilitAni); dışlayıcı sınır; kilitAni null ise yalnız 7 gün. kilitAni D02'nin BirimDonemiBilgisi.kilitAni değeridir (son günün ertesi 00:00 Europe/Istanbul, D02 hesaplar); birimsiz derste (deneme dersi, kilitDurumu kaynak 'takvim_yok') birim dönemi olmadığından null verilir. Saf hesap packages/core/src/esitleme/gonderme-suresi.ts'te UTC milisaniyeyle; Intl, infra ve modül içe aktarması yok; çağıranlar packages/core'dan alır. Zamanlanmış iş gerekmez, okuma anında hesaplanır.",
      why: "Kafa sayısının kesinleştiği an, panel şeridinin kalktığı an (tasarim.html#durumlar) ve geç kaydın 'sonradan değişenler'e düştüğü an aynı sonucu bulmalı; D14-B09'un son gün tanımıyla (ertesi gün 00:00, dışlayıcı) aynı. Ortak kural packages/core'da Intl yasaklar ve apps/server'ı içe aktaramaz; D02'nin kilit anı İstanbul hesabını zaten yapmış durumdadır. index.ts'ten dışa verilseydi dört modül D06'nın modül dosyalarını çekerdi."
    },
    {
      gap: "D06-B23",
      decision: "Sürüm sorgusu D13'ün GET /v1/surum ucu oldu (contracts). D06'nın payı X-Kurulum-Kimligi'dir: rastgele UUIDv7 olduğundan GitHub APK kademeli duyurusunun kovası (özet mod 100) bundan hesaplanabilir; kimlik hesap başına olduğu için aynı telefonda hesap değişince kova da değişebilir.",
      why: "Contracts GET /v1/esitleme/surum'u D13'e bağladı; sürüm, kanal ve bağlantı bilgisi tek uçta kalır."
    },
    {
      gap: "D06-B24",
      decision: "Yayın bilgisi dosyası yayin-bilgisi.json: CI yazar (D15), şema ve okuma D13'ün (contracts). D06 bu dosyayı okumaz.",
      why: "Contracts kararı: dosya tablo değil, üç öneri tek dosyada birleşti."
    },
    {
      gap: "D06-B25",
      decision: "Kaydı üreten sürüm kayıt metnindedir (D05); D06 istek başlıklarını yalnız gönderen sürümü olarak deftere (gonderen_uygulama_surumu, gonderen_guncelleme_kimligi) ve kurulum satırına yazar.",
      why: "İmzalı metindeki sürüm değiştirilemez ve doğru sürümü gösterir; kural ve gerekçe kodu D07'nin (plan.html#dagitim-guncelleme-ilkesi)."
    },
    {
      gap: "D06-B26",
      decision: "Hesap silme kuyruk öğesi değildir (contracts öğe türleri listesi). Telefon D01'in silme ucunu kuyruğunda sonuçlanmamış öğe kalmayınca çağırır; bunu her öğenin sonucundan bilir. D06 esitlemeKimlikDinleyicisi'ni dışa verir; bileşim kökleri onu D01.kimlikDinleyicileriniKur'a esitleme abonesi olarak verir (contracts.json ortak kural 'Kimlik olayları'); hesap_silindi olayında dinleyici olayı doğuran işlemin içinde kişinin karar_teslimleri, ogrenci_durum_surumleri ve kurulumlar satırlarını (defter cascade ile) siler, öbür olayları yok sayar. Başka modül kurulumlar'a yabancı anahtar koymaz (D04, D09 iz sütunu tutar), silme bu yüzden takılmaz. Silmeden sonra gelen öğelerin sonucunu öğe türlerinin modülleri verir (D12-B18): silinen hesabın oturumu kapalıdır, kişi yalnız imzadan çözülür, kurulum gerekirse yeniden açılır (kapanmış cihaz kuralının tek istisnası); öğeler dağıtıldıktan sonra kişinin D06 satırları aynı işlemin sonunda yeniden silinir; silinmişlik gönderim işleminde D01.hesapSilindiMi ile, kurulum satırından önce okunur. Hesap silme saklama sınıfı değildir; karar teslimlerinin süre sonu silmesi D12 kataloğundaki esitleme.donem_verisi sınıfı için kaydedilen tek saklama işleyicisinindir.",
      why: "D12'nin saklama arayüzü kişi başına değil zaman sınırlı partilerle çalışır ve 'hesap_silme' sınıfı yoktur (hesap silme D01'e geçti, D12-B17; contracts.json ortak kural 'Saklama'); D01'in yürütücüsü kimlik olayı dinleyicilerini çağırır ve D06'yı zaten bu yolla anar. Bu satırlar planın 'kalır' listesinde değildir (plan.html#kararlar-hesap-silme); kayıtların kendisi D05'te kalır. Geç imzalı paketin yeniden açtığı satırlar başka hiçbir yolla silinmezdi. D12-B20'nin 'son sıra numarası kalır' önerisi geç gelen kaydın doğrulaması içindi; o doğrulama D05'in (dönem, cihaz, sıra) tekilliğindedir."
    },
    {
      gap: "D06-B27",
      decision: "Personel telefonu GET /v1/esitleme/degisiklikler'de yalnız 401 alırsa çıkış gibi davranır: sınıf listelerini ve o hesabın imlecini siler, kuyruktaki işleri saklar; yeniden girişte imleçsiz istekle hoca verisi baştan iner. 403 (kurulum başka hesabın, kurulum sınırı, kurulum kimliği başlığı) listeleri silmez. Gönderimde 401 ve 403 yalnız o kurulumun gönderimini durdurur.",
      why: "Çıkıştaki gizlilik gerekçesinin aynısı (plan.html#kararlar-indirme); işler girişten sonra gider (plan.html#kararlar-roller). Telefon hatasının hocanın listelerini sildirmesi derste internetsiz çalışmayı bozardı. Derste internetsizken 401 görülmez."
    },
    {
      gap: "D06-B28",
      decision: "Günlük sayaçlar D15'in telefon_sayaci öğesidir; gün sınırı, tekillik ve birikme D15'in. Sıra kuralı kendiliğinden korunur: öğe gün kapanınca kuyruğa girer ve o günün kayıtlarından sonraki sırayı alır. Durdurulmuş kurulumun sayaç öğesi o kurulumda beklediğinden, D06 her 403 ve 401 cevabını kurulum ve kişi iç kimliği ve kodla kendi logunda da sayar; olay telefon sayacına bağlı kalmaz. Panel süreleri POST /v1/isletim/ekran-sureleri (D15).",
      why: "Contracts kararı; D06 yalnız taşır. Tıkalı kurulumun olayını yalnız o kurulumdan gidecek sayaca bırakmak olayı hiç ulaştırmazdı."
    },
    {
      gap: "D06-B29",
      decision: "Paket düzeyinde 429 ve 503 D13'ündür (Retry-After; 503 API_SUNUCU_YOGUN 15 ile 45 saniye, D13-B10). D06'nın 503 ESITLEME_KURULUM_MESGUL cevabı bekleme { sabit: 5 } ile Retry-After 5 taşır; D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI dahil) bekleme { aralik: [15, 45] } ile. Hız sınırı: gönderim D13'ün 'gonderim' sınıfıyla, kimlik kurulduktan sonraki kancada, anahtar doğrulanmış cihaz, cihaz yoksa giriş oturumu (X-Kurulum-Kimligi değil), dakikada 30; kimliği kurulamayan istek girissiz IP sayacından düşer; indirme 'oturum' sınıfıyla oturum başına dakikada 120 (D13-B09). Bir bölme dizisi (yaklaşık 16 istek) sınırın altında kalır. Kesin değerler ders çıkışı yük testiyle yazılır.",
      why: "teknik.html#sunucu-guvenlik sınırı doğrulamadan sonraki kancada doğrulanmış cihaza ya da oturuma bağlar; çağıranın seçtiği X-Kurulum-Kimligi'ne bağlı sınır başlığı değiştirene hiç uygulanmaz, doğrulanamayan isteklerin işlem, anahtar okuması ve imza doğrulaması maliyetini sınırsız bırakırdı. Telefon Retry-After'a en az o kadar, üstüne rastgele payla uyar (teknik.html#telefon-gonderme-protokolu)."
    },
    {
      gap: "D06-B30",
      decision: "Gönderim işlemi D12.islem({ zamanAsimiMs: 5000 }) ile açılır, ilk adımda SET LOCAL lock_timeout '2s' ve transaction_timeout = D13.kalanSureMs(istek) (D13'ün 20 saniyelik işleyici bütçesinden kalan; PostgreSQL 18, teknik.html#veritabani) yazılır; kurulum satırı kilidi beklenemezse 503 ESITLEME_KURULUM_MESGUL. İşleme bütçesi min(8000, kalanSureMs - 5000) milisaniyedir: gruplar en çok 50 öğelik parçalarla işleyiciye verilir; bütçe isleToplu'da her parçadan, isle'de her öğeden sonra denetlenir; bütçe dolunca kalan öğeler işleyiciye verilmeden TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI (beklemeSaniye 5) alır, işlenenler aynı işlemde kalır ve işlem biter. transaction_timeout işlemi keserse (SQLSTATE 25P04; deyim süresi 57014 de aynı) hiçbir şey yazılmamıştır; D12.islem bunu VERITABANI_ZAMAN_ASIMI'na (503, bekleme { aralik: [15, 45] }) çevirir. Cevap nesnesi COMMIT'ten önce cevap şemasıyla doğrulanır; uymazsa işlem geri alınır, 500. Telefonun zaman aşımı 30 saniyedir; sunucu ondan önce ya yazmış ya geri almış olur.",
      why: "Bütçe yalnız parça sonunda ve statement_timeout yalnız tek deyimde denetlenseydi kilit beklemeli bir parça işleyici bütçesini aşar, işlem 5xx gittikten sonra COMMIT edebilir, telefonun yeniden denemesi kurulum kilidinde beklerdi; '4xx ya da 5xx cevapta değişiklik kalmaz' değişmezi tutmazdı. Bütçe aşımında bütün işlemi geri alıp 503 vermek hep yavaş kalan bir paketi sonsuza dek döndürürdü; kısmi sonuç her turda ilerleme sağlar ve sıra düzenini bozmaz (kesilen öğeler hep sondadır). Değerler yük testiyle ayarlanır."
    },
    {
      gap: "D06-B31",
      decision: "İmleç telefonun yerel yapı sürümünü (PRAGMA user_version) taşır; istekteki yapiSurumu imleçtekinden farklıysa baştan indir. Sunucu alan süzmez: eski sürüm bilmediği tablo ve alanı yok sayar.",
      why: "Yeni tablo ya da alanın satırları imleçten eski sürümde kalır, baştan indirme onları getirir; karar sunucuda ve test edilebilir (teknik.html#telefon-yerel-veri). İstemciler bilinmeyene dayanıklı yazılır (teknik.html#sunucu-mimari)."
    }
  ],

  contradictions_resolved: [
    {
      id: "D06-C01",
      resolution:
        "Rota şeması yalnız zarfı denetler; öğe içi doğrulama D06'da öğe başına yapılır ve RET olarak döner (D06-B03). Böylece teknik.html#sunucu-mimari'deki şema doğrulaması ile plan.html#kararlar-gonderme'deki 'bozuk kayıt paketi düşürmez' birlikte tutar; 400 ve 413 yalnız zarf ya da boyut hatasında döner, bölme yolu korunur."
    },
    {
      id: "D06-C02",
      resolution:
        "kurulumlar giriş güveninde kullanılmayan, hesap başına sıra izidir; tanınan cihaz kaydı değildir, teknik.html#sunucu-kimlik doğru kalır. 'Cihazdan alınan son sıra numarası' (teknik.html#kod-veri-modeli, Cihazlar) cihaz satırından bu tabloya taşınmıştır. teknik.html'e bu iki cümlenin eklenmesi önerilir."
    },
    {
      id: "D06-C03",
      resolution:
        "Gönderim ucunda kişi oturumdan ya da paket imzasından çözülür (D06-B10); 401 yalnız ikisi de yoksa döner, kişi uyuşmazlığı 403'tür. Yoklama kayıtları oturumsuz işlenir, oturum isteyen öğe yalnız kendisi TEKRAR_DENE (cihaz kapanmışsa RET) alır; eski telefondaki ve yedekten dönen kayıtlar değişim kararına ulaşır (plan.html#gun-kenar-durumlar), teknik.html#telefon-gonderme-protokolu'ndaki '401'de gönderim durur' kuralı da kişi çözülemeyen istek için geçerli kalır."
    },
    {
      id: "D06-C04",
      resolution:
        "teknik.html#sunucu-mimari 'gönderim baştan sona tek bağlantıda, tek işlemde' der. D13'ün istek hattı kimliği işleyiciden önce, modül kancasında ister; imzalı paketin anahtarı bu yüzden D06 kancasında, gönderim işlemi açılmadan önce kısa bir salt okunur işlemle okunur ve bağlantı havuza döner: istek hiçbir anda iki bağlantı tutmaz, oturum okuması da D13'ün kök kancasında zaten işlem dışındadır. Bütün yazmalar tek işlemde kalır. Bu tek salt okunur istisnanın teknik.html'e yazılması önerilir."
    },
    {
      id: "D06-C05",
      resolution:
        "teknik.html#telefon-gonderme-protokolu '400 ya da 413'te ikiye böl, öbür 4xx 400 gibi' der; D13'ün sonucSinifi da bütün 4xx'i 'bol' sayar. Gönderim kuyruğu bunu inceltir: yalnız 413 ve alan yolu ogeler'i gösteren 400 böler; isteğin kendisindeki hata (kurulum kimliği başlığı, içerik türü, bozuk JSON, paket düzeyi alan) hiçbir öğede olmadığından bölme onu bulamaz ve geçerli tek öğeleri boşuna YEREL_RET yapardı. Bu 4xx'ler kurulumu durdurur, olay sayılır, uygulama ya da güncelleme değişince bir kez yeniden denenir (plan.html#kararlar-yeniden-deneme'deki tek kayıt kuralıyla aynı yön). Kurulum kimliği başlığının hatası bu yüzden 400 değil 403'tür. Saf kural packages/core/src/esitleme/protokol.ts'tedir."
    },
    {
      id: "D06-C06",
      resolution:
        "Ortak kural 64 bitlik değerleri JSON'da metin ister. Kuyruk sırası sira 1 ile 2^53-1 arasıyla sınırlı tam sayıdır (veritabanı CHECK'i ve rota şeması), JSON sayısı olarak kayıpsız taşınır; kayıtlı istisna olarak sayı kalır. D04'ün aynı değeri taşıyan sira_no alanı aynı biçime uyar (beklenen)."
    }
  ],

  open_points: [
    {
      id: "D06-A01",
      question:
        "İmzası doğrulanan ama geçersiz bir kayıt (listede olmadığı ders, pencere dışı, ulaşma anını aşan saat) gönderimde RET mi almalı, yoksa KABUL alıp 'Ret' kararıyla mı saklanmalı? Birincisinde makbuz 'Telefonda kayıtlı, gönderilmedi' kalır ve her gün hatırlatılır; ikincisinde 'Sunucuya ulaştı' ve 'Sunucu kararı: Ret' görünür, öğrenci 3 gün içinde sorun bildirebilir.",
      recommendation:
        "İkincisi: gönderim RET'i yalnız saklanamayan öğede (zarf çözülemiyor, imza doğrulanamıyor, kimlik ya da sıra çakışması, rol uymuyor); doğrulanabilen her kayıt KABUL alır ve kararı gerekçesiyle saklanır. Gerekçe: ham kayıt kanıttır, atılmaz (plan.html#kararlar-cihaz-dogrulamasi); 'Kaydım yanlış derse düştü' bildirimi ancak böyle yapılabilir (tasarim.html#sh-d); işaretlenmeden kabul oranı saklanan kararlardan hesaplanır (plan.html#hedefler). D06'nın sözlüğü iki seçeneği de taşır; karar D05 ve D07 işleyicilerinin kuralını belirler (D06-B05; D05-B05 ve D07-B03 aynı soru).",
      needs_owner: true
    },
    {
      id: "D06-A02",
      question:
        "Telefona sunulmuş ama onayı hiç gelmemiş bir karar için sorun bildirme süresi (plan.html#kararlar-supheli-kayit: 3 gün, karar telefona ulaşınca başlar) ne zaman başlamalı? Bugünkü kurala göre onay gelmezse süre hiç başlamaz: imlecini geri yollamayan bir istemci (değiştirilmiş uygulama ya da imleci kaybeden hata) her şikâyet penceresini sonsuza dek açık tutar.",
      recommendation:
        "Onay yokken, sunumun yapıldığı kurulum ilk sunumdan en az 24 saat sonra başarılı bir istek yaptıysa (sunulanKurulumSonTemasAni >= ilkSunulmaAni + 24 saat) süre ilk_sunulma_ani'dan başlasın; onay varsa onay anından. Gerekçe: dürüst telefon sayfayı aldığı yerel işlemde imleci de saklar ve sonraki her istekte onay gider; onaysız başarılı istek ancak imleci yollamayan istemcide olur, gecikme yine öğrencinin lehine 24 saatle sınırlı kalır. Kuralı D09 uygular; D06 gereken girdileri kararTeslimAni ile verir (ilkSunulmaAni, sonSunulmaAni, telefonaUlastiAni, sunulanKurulumSonTemasAni). Seçilmezse süre bugünkü gibi yalnız onayla başlar.",
      needs_owner: true
    }
  ]
};

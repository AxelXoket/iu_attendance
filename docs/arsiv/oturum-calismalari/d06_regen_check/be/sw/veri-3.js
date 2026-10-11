// D06 spec data, part 3: resolved gaps, contradictions, open points.
module.exports = {
  resolved_gaps: [
    {
      gap: "D06-B01",
      decision: "Tek toplu uç POST /v1/esitleme/gonderim (contracts kararı). D06 yalnız dağıtır: öğeler türüne göre ogeTuruKaydet ile kaydolmuş işleyiciye, aynı işlemde, artan sıra düzeninde ve ardışık aynı tür grupları halinde verilir. Kayıtlı olmayan tür TEKRAR_DENE ve ESITLEME_TUR_BILINMIYOR alır, defterde saklanır.",
      why: "Sıra numarası tek alandır, ikinci çapa paket başına imzalanır, gönderim tek bağlantıda tek işlemdir (teknik.html#sunucu-mimari); ayrı uçlar son sıra hesabını ve paket imzasını türlere bölerdi. Kayıt deseni yeni türü ortak dosyaya dokunmadan ekletir."
    },
    {
      gap: "D06-B02",
      decision: "İkinci çapa paketin tek imzalı bölümüdür: metin, UTF-8 JSON'un base64url halidir { tur: 'ikinci_capa', v: 1, kurulum, paket, belge (saat belgesi aynen), istekSuresiMs, ogeler: [{ id, olaydanBelgeyeMs } ya da { id, yokNedeni: 'sonra_yeniden_baslatma' }] }. İmza metnin ASCII baytları üzerinde ECDSA P-256 SHA-256, DER: 'a' Android cihaz anahtarı, 's' iPhone Secure Enclave ikinci anahtarı (D05-B02 kodları); personel paketinde 'o' imzasızdır, geçerli personel oturumuna bağlanır. D06 imzayı D01.cihazAnahtariGetir'in açık anahtarıyla doğrular, tur, v, kurulum ve paket alanlarını karşılaştırır, belgeyi açmaz; belgenin MAC'i ve çapa hesabı işleyicinin çağırdığı D04.saatBelgesiDogrula ve packages/core/src/saat saatSonucu'nundur. Öğeler imzalı bölümün dışında, kendi zarflarıyla gider; işleyiciye öğe başına { durum: 'VAR', imzaTuru, belge, istekSuresiMs, olaydanBelgeyeMs } ya da { durum: 'YOK', yokNedeni } verilir (D04'ün IkinciCapa adlarıyla).",
      why: "Kayıt zarfı ilkesiyle aynı: gelen baytlar doğrulanır, yeniden biçimlendirilmez (teknik.html#sunucu-imza-dogrulama); JSON ayrıştırıcıdan bağımsızdır. tur alanı aynı Android anahtarının kayıt imzasıyla karışmasını önler. Bölünen pakette yalnız bu küçük metin yeniden imzalanır. D06 D04'ün sunucu dış yüzünü çağırmaz (contracts notu)."
    },
    {
      gap: "D06-B03",
      decision: "Rota şeması yalnız zarfı denetler: ogeler en çok 200; her öğede tur (64), sira (1 ile 2^53-1), ogeKimligi (64), govde (65536), ilkCapa (nesne ya da null), ulasmaMakbuzu (128). Tür deseni, UUIDv7, ilkCapa şeması ve türün govdeEnBuyukBayt sınırı D06'da öğe başına denetlenir; uymayan öğe RET ESITLEME_OGE_GECERSIZ alır ve deftere yazılır. Gövde sınırı 1 MiB (D13-B11); telefon paketi 200 öğe ve 768 KiB ile sınırlar. 200'ü aşan öğe sayısı şema hatasıdır (400); telefonun tepkisi 413 ile aynıdır (ikiye böler).",
      why: "Plan 'bozuk kayıt paketi düşürmez' der (plan.html#kararlar-gonderme); şema öğe içini tiplerse tek bozuk öğe paketi 400 ile düşürür ve telefon 16 kadar istekle böler. Envanterdeki 512 KB önerisinin yerine D13'ün tek gövde sınırı geçerlidir; telefonun 768 KiB payı 413'ü olağan akıştan çıkarır."
    },
    {
      gap: "D06-B04",
      decision: "Öğe sonucu { sira, ogeKimligi, tur, sonuc, gerekce, ulasmaAni, ulasmaMakbuzu, beklemeSaniye, ayrinti }; sonuc KABUL, ZATEN_VAR, RET, TEKRAR_DENE ve gerekce x-extensible-enum. ZATEN_VAR da saklanan ulaşma anını ve sahibin güncel ayrıntısını (yoklamada karar) döner. ayrinti şeması öğe türünün sahibinin sözleşmesindedir. Telefon bilinmeyen sonucu TEKRAR_DENE gibi, en uzun aralıkla işler ve günlük sayaçlara yazar.",
      why: "Makbuz ulaşmayı ve kararı ayrı adımlar olarak gösterir (tasarim.html#ph-success); hoca okutmasıyla ulaşmış kaydı yeniden yollayan telefon ZATEN_VAR ile 'Sunucuya ulaştı' olur (plan.html#kararlar-kayit-ve-makbuz). Bilinmeyeni TEKRAR_DENE saymak 'makbuzu olan kayıt kaybolmaz' kuralını (teknik.html#testler-birim) bozmayan tek seçenektir."
    },
    {
      gap: "D06-B05",
      decision: "D06'nın payı karara bağlandı: RET ve TEKRAR_DENE öğe sonuçlarıdır, sunucu kararı (Var, Beklemede, İncelemede, Ret) ayrıntıda ayrı alandır. D06'nın kendi RET kodları yalnız taşıma düzeyindedir: zarf geçersiz, sıra çakışması, rol uymuyor, kısıt ihlali, yerel ret. Doğrulanabilen ama geçersiz bir kaydın KABUL ve Ret kararıyla mı saklanacağı, RET ile mi geri çevrileceği öğrencinin ekranını değiştirdiği için sahibin kararına bırakıldı: açık nokta D06-A01.",
      why: "Plan 'ret' sözcüğünü iki anlamda kullanıyor; sözlük ayrımı D06'da kesin olmalı ki telefon makbuzu doğru göstersin. Hangi gerekçenin hangi sınıfta olduğu D05 ve D07'nin işleyici kuralıdır (D05-B05, D07-B03 aynı soruyu taşıyor)."
    },
    {
      gap: "D06-B06",
      decision: "Öğe düzeyinde TEKRAR_DENE: D06'nın gerekçeleri ESITLEME_TUR_BILINMIYOR (beklemeSaniye 3600), ESITLEME_OTURUM_GEREKLI, ESITLEME_GECICI_CAKISMA (kilitlenme, serileştirme, kilit ya da deyim zaman aşımı) ve ESITLEME_ISLEYICI_HATASI (beklemeSaniye 600); sahiplerin geçici gerekçeleri kendi kodlarıyla. Telefon yalnız o öğeye 2 saniyeden 10 dakikaya artan, rastgele kaydırılmış aralığı, en az beklemeSaniye kadar uygular. Saati yalnız ikinci çapayla kurulabilen kayıt da pakete konur: ikinci çapa yoksa işleyici (D05) kaydı saklamadan TEKRAR_DENE döner. plan.html#kararlar-gonderme'deki 'o turda gitmez' böylece kayıt sayılmadan telefonda beklemek olarak karşılanır. TEKRAR_DENE deftere yazılır.",
      why: "Tek öğenin geçici sorunu öbür 199 öğeyi bekletmez; aralık plandaki kuralla aynıdır (teknik.html#telefon-gonderme-protokolu). Kaydı telefonda tutmak yerine göndermek kararı tek yerde (sunucuda) bırakır ve defterde boşluk açmaz; boşluk açılsaydı su seviyesi takılır, telefon her eşitlemede üstteki öğeleri yeniden gönderirdi."
    },
    {
      gap: "D06-B07",
      decision: "Kesintisiz son sıra kurulum başınadır: en büyük n ki 1..n her sıranın defterde (sonucu ne olursa olsun) satırı var. Her öğe türü sıra tüketir; sıra kurulumda 1'den başlar, boşluksuz artar, dönemle sıfırlanmaz. Gönderim ve indirme cevaplarının ikisi de sonSira döner. Telefon sonSira'dan büyük sıradaki ULASTI ve RET öğelerini bir kez, ulaşma makbuzlarıyla yeniden gönderir. Tek öğe yine 400 ya da 413 alırsa (yalnız telefon hatasında olur) telefon sonraki pakette yerelRetler ile bildirir, D06 RET ESITLEME_YEREL_RET yazar; böyle öğe yeniden gönderilmez, gerekirse yeniden bildirilir. Bölünen paketin yarıları önce sol yarı sonuçlanarak gider, böylece olağan akışta sonSira'nın üstünde ULASTI öğe kalmaz. teknik.html#kod-veri-modeli'nin Cihazlar maddesindeki 'cihazdan alınan son sıra numarası' cihaz satırında değil kurulumlar tablosunda tutulur; plan.html#hedefler'deki (cihaz, sıra numarası) boşluğu burada (kurulum, sıra) boşluğudur.",
      why: "En büyük sıra, sırasız varışta (bölünen paket, öğe düzeyinde TEKRAR_DENE) küçük sıralı öğe ulaşmadan ilerler; WAL'ın en çok 5 dakikalık kaybı (teknik.html#veritabani-yedek) onu silerse telefon yeniden yollamaz ve 'makbuzlu kayıtta kayıp 0' bozulur. TEKRAR_DENE ve yerel retler de deftere yazıldığından su seviyesi olağan akışta takılmaz. Son sıra tek yazar kuralıyla D06'dadır (contracts: kurulumlar)."
    },
    {
      gap: "D06-B08",
      decision: "Kurulum, bir uygulama kopyasında bir hesabın kuyruğudur. Telefon her hesap için ayrı UUIDv7 kurulum kimliği üretip yerel veritabanında saklar, aynı hesap yeniden girince aynı kimliği kullanır; yerel veritabanı ile anahtarlar tutmazsa (yedekten dönüş, başka telefona aktarma) bütün kimlikleri yeniler, eski öğeler eski kimlik ve sıralarıyla, X-Kurulum-Kimligi başlığında eski kimlikle gider. Sunucuda kurulumlar satırı ilk doğrulanmış istekte açılır, kişisi değişmez; başka kişiyle gelen istek 401 ESITLEME_KIMLIK_UYUSMUYOR alır, telefon yeni kimlik üretir. Kayıt giriş güveninde kullanılmaz.",
      why: "Planın kurtarma kuralı hoca işlerine de uygulanır ve oturum yenilense de bozulmaz (plan.html#gun-kenar-durumlar). Bir hesabın bekleyen işi başka hesabın su seviyesini takmaz. Yedekten dönen kopya eski kimliği sürdürseydi eski telefonun kullandığı sıraları yeniden kullanır, geçerli yeni kayıtlar SIRA_CAKISMASI alırdı. (kurulum, sıra) bütün sistemde tekil kalır; D04'ün pencere_degisiklikleri (kurulum_id, sira_no) tekil dizini buna dayanır."
    },
    {
      gap: "D06-B09",
      decision: "Öğeler paket içinde artan sıra düzeninde işlenir; ardışık aynı tür öğeler tek grupta işleyiciye verilir. Paketteki bütün öğeler kurulumun hesabınındır; isteğin kişisi kurulumun kişisi değilse istek 401 alır. Böylece personel işi yalnız sahibinin oturumuyla işlenir, başka hesabın işi telefonda o hesabın kurulumunda bekler ve o hesap yeniden girince gider (D01-B14). Aynı ayar için birden çok kaynaktan gelen işlerin sırası ve geç gelen değişiklikte kararların yeniden verilmesi D04'ündür; işlem anının ilk çapası öğe zarfının ilkCapa alanında (şeması D04'ün IlkCapaAlanlari), ikinci çapası bağlamda gelir.",
      why: "'Girişten sonra gider' kuralı (plan.html#kararlar-roller) yanlış hesaba gitmeden korunur. D04 spec'indeki 'öğe hesabı oturumun kişisiyle aynı olmalı' şartı paket düzeyinde karşılanır: başka hesabın öğesi işleyiciye hiç ulaşmaz, öğe düzeyinde ayrı TEKRAR_DENE gerekmez."
    },
    {
      gap: "D06-B10",
      decision: "İstek düzeyinde kişi: geçerli oturum ya da kayıtlı bir cihaz anahtarıyla geçerli paket imzası (anahtar etkin, yenilenmiş, cihazı değişmiş ya da hesabı silinmiş olabilir). İkisi de yoksa 401 ESITLEME_KIMLIK_YOK; oturumun, imzanın ve kurulumun kişisi birbirini tutmazsa 401 ESITLEME_KIMLIK_UYUSMUYOR. Geçersiz Bearer kökte 401 değildir; D06 D01.oturumDogrula'nın 401 sınıfı hatasını 'oturum yok' sayar. Öğe düzeyinde tür kaydı roller ve oturumGerekli taşır: yoklama_kaydi öğrenci, oturumsuz (kendi imzası); sorun_bildirimi öğrenci, oturumlu; hoca işleri personel, oturumlu; telefon_sayaci iki rol, oturumsuz. Rol uymazsa RET ESITLEME_YETKI_YOK, oturum yoksa TEKRAR_DENE ESITLEME_OTURUM_GEREKLI. Pasif cihazın kayıtlarının kararı D01 ve D07'nindir.",
      why: "Yoklama kayıtları donanım anahtarıyla imzalanır, öbür istekler oturumla gider (plan.html#kararlar-cihaz-dogrulamasi). Oturum şart olsaydı cihaz değişiminden sonra eski telefondaki ve yedekten dönen kayıtlar hiç ulaşamazdı (plan.html#gun-kenar-durumlar); bekleyen kayıtlar hiçbir zaman engellenmez (plan.html#dagitim-guncelleme-ilkesi). Hız sınırı doğrulanmış cihaza bağlıdır (teknik.html#sunucu-guvenlik), burada kurulum kimliğine."
    },
    {
      gap: "D06-B11",
      decision: "Öğrencinin kendi verisi öğrenci başına sürümle (ogrenci_durum_surumleri) GET /v1/esitleme/degisiklikler cevabının ogrenci bölümünde iner; bölümler D05 (kayıtlar ve kararlar), D08 (devam durumu) ve D09 (düzeltmeler ve sorun bildirimleri) kaynaklarından. Kaynak 'şu sürümden beri' farkı ya da tam liste döner (tam bayrağı). Bölüm çok sayfalı indirmenin ilk sayfasında gelir. Telefon sunucunun listesinde bulduğu her yerel kaydı ULASTI yapar.",
      why: "Genel sayaç satırında sıcak nokta olmaz, yalnız o öğrencinin satırı kilitlenir; ayrı uç açılmadığı için ders çıkışındaki 2 ile 3 istek bütçesi korunur (plan.html#teknoloji-sunucu-yeri). Karar değişiklikleri push olmadan çekmeyle iner (plan.html#kararlar-supheli-kayit)."
    },
    {
      gap: "D06-B12",
      decision: "Teslim anı telefonun sakladığını kanıtladığı sunumdur: indirme bir karar sürümünü sunduğunda karar_teslimleri satırına sunulan_durum_surumu ve son_sunulma_ani yazılır; telefon sayfayı ve imleci aynı yerel işlemde saklar; sonraki istekte (gönderim ya da indirme) imleçteki öğrenci sürümü sunulan sürüme eşit ya da büyükse telefona_ulasti_ani = son_sunulma_ani tek UPDATE ile yazılır. Cevap kaybolursa onay gelmez, sonraki sunumun anı geçerli olur. Gönderim cevabındaki karar ayrıntısı teslim sayılmaz. Anlar saat arayüzünden yazılır.",
      why: "Sunucu cevabın telefona yazıldığını ancak telefonun sonraki isteğinden öğrenir; kaybolan cevapta süre yanlış başlamaz, gecikme öğrencinin lehinedir. Kural taşıyan an SQL now() ile yazılmaz (teknik.html#testler-veritabani-sifirlama). Karar değişince sürenin yeniden başlaması D09'un kuralıdır; D06 her karar sürümü için anı verir."
    },
    {
      gap: "D06-B13",
      decision: "kurulumlar.son_temas_ani her doğrulanmış gönderim ve indirmede saat arayüzünden yazılır, seyreltilmez; bekleyen_oge_sayisi telefonun bildirdiğinden (gönderimde paketin TEKRAR_DENE öğeleri eklenerek). İndirmenin yazımı satır kilitliyse atlanır (aynı anda süren gönderim zaten yazar). kurulumSonTemasi kişinin en son temasını ve o temastaki bekleyen sayısını verir; KARAR BEKLİYOR kuralı D08 ve D10'undur. Ders başına bekleyen listesi tutulmaz: bekleyen öğesi olan son temas bütün dersler için 'bağlanmamış' sayılabilir, bu yön öğrencinin lehinedir.",
      why: "Son oturumun kapanışından hemen sonraki temas atlanırsa öğrenci yanlışlıkla KARAR BEKLİYOR görünür (plan.html#devam-donem-sonu). Kurulum hesap başına olduğundan son temas kişiye kesin bağlanır. Bekleyen öğeyle temas seyrektir; ders listesi taşımak sözleşmeyi büyütürdü."
    },
    {
      gap: "D06-B14",
      decision: "GET /v1/esitleme/degisiklikler?imlec&adet&yapiSurumu&bekleyenOgeSayisi. İmleç opak base64url: '1|sistemKimligi|zamanCizelgesi|genelSurum|kapsamSurumu|ogrenciSurumu|yapiSurumu|hesapOzeti' (64 bitlik değer ondalık metin, hesap özeti kişi kimliğinin SHA-256'sının ilk 16 onaltılık hanesi). kapsamSurumu, kapsamın en son hesaplandığı sayaç değeridir; kapsam değişikliği yalnız bundan sonrası için sorulur, yoksa çok sayfalı tam indirmede öğrencinin kendi liste satırı (sürümü ilk sayfanın üst sürümünden büyük) indirmeyi her sayfada baştan başlatırdı. Sayfa sürüm sınırında kesilir (Durumlar ve kurallar, sayfa kesme). İmleç hesap ve yapı sürümüne bağlıdır; telefon her sayfayı tek yerel işlemde uygular, imleci aynı işlemde saklar. Baştan indir hata kodu değil 200 cevabında alandır (D13). Telefon tam indirme bitince gelmeyen satırları siler; önbelleği baştan boşaltmaz, sonuç plan.html#kararlar-indirme'deki 'silip yeniden çeker' ile aynıdır ve arada program boş kalmaz.",
      why: "Ders çıkışındaki 'gerekirse değişenler' tek istektir (plan.html#teknoloji-sunucu-yeri); imleç metin olduğu için 64 bit sorun olmaz (D13-B15); hesap özeti başka hesabın imleciyle veri kaçırmayı önler. Sayfa adı adet, D13-B13 sorgu adıyla aynı."
    },
    {
      gap: "D06-B15",
      decision: "Kapsam değişince o kullanıcıya baştan indir. Kapsam kaynağı (öğrencide D03, personelde D02) kapsamı belirleyen satırlarından biri imleçten sonra değiştiyse true döner (yanlış pozitif serbest, yanlış negatif yasak). Kapsam şube, ders ve birim kümesidir; öğrencide numarası ve teyit durumu da bağlamda verilir (D06 D01.ogrenciHesabiGetir ile okur, D03-A09); teyitsiz öğrenciye kendi liste satırının adı inmez, çünkü kapsamı yalnız numara iddiasına dayanır. Silindi işareti satır kullanıcının görme kapsamından çıkınca kullanılır; pasiflik veri alanıdır, pasif öğrencide ders telefonda kalır (D03-B13). Her kaynak satırı ve sütunu role göre süzer: öğrenciye oturumun yalnız ders, derslik, açılış, kapanış, iptal ve tür alanları iner; kafa sayısı ve hoca ayarı inmez.",
      why: "'Şu sürümden beri değişenler' süzgeç değişince yanılır: sonradan eklenen öğrencinin dersi eski sürümde kalır. Öğrencinin tam indirmesi birkaç yüz, hocanınki birkaç bin satırdır; kapsam değişikliği seyrek olduğundan baştan indirme ucuz ve kesin doğrudur, kapsam olayı mantığı gerekmez."
    },
    {
      gap: "D06-B16",
      decision: "Dönem durumu D02'nin kilit kaynağıyla (kapsamdaki birimlerin birim ve dönem satırı) genel indirmede iner; son hafta telefonun bildiği son oturumdan ve ders satırıyla inen birim son gününden çıkarılır (D08-B23). Telefon kilitli dönemin yalnız ULASTI öğelerini siler; sonuçlanmamış öğeyi kilitten sonra da saklar ve gönderir.",
      why: "Contracts D02'yi kilit kaynağı olarak kaydetti; öğrenciye inen 'yalnız' listesine kişisel veri eklenmez (plan.html#kararlar-indirme). Son günden sonra gelen kayıt yine saklanır (plan.html#kararlar-gonderme-suresi)."
    },
    {
      gap: "D06-B17",
      decision: "Dönemin bütün oturumları üretildikçe iner (öğrenci başına dönemde en çok yaklaşık 170 satır); kayan pencere yok.",
      why: "Kayan pencere 'değişenler' mantığıyla ifade edilemez; aynı gün eklenen telafi dersi yeni sürümle hemen internetteki telefona iner (plan.html#kararlar-kafa-sayisi)."
    },
    {
      gap: "D06-B18",
      decision: "Silindi işaretli satırlar temizlenmez (indirilen tablolar küçüktür; D12-B16'ya göre bu satırlar fiziksel silinmez). degisiklik_sayaci.en_eski_gecerli_surum (başta 0) yükseltilirse altındaki imleçler baştan indirir; değeri yalnız D06 göçü değiştirir.",
      why: "Bugün ek iş yok; ileride saklama silmesi ya da bir veri düzeltmesi bu değeri yükseltip herkesi güvenle baştan indirtebilir. 'Çok eski imleç' tek değere bağlanır."
    },
    {
      gap: "D06-B19",
      decision: "surumAl(tx) her çağrıda UPDATE degisiklik_sayaci SET surum = surum + 1 WHERE id = 1 RETURNING surum çalıştırır; satır kilidi işlem sonuna kadar kalır. Kural: çağıran inen satırlarını yazdıktan sonra, işlemin son adımlarından biri olarak çağırır (satırlar, iş kuyruğu, sayaç; D03-A10), dönen sürümü o işlemde yazdığı inen satırlara tek UPDATE ile koyar ve sayaçtan sonra yeni satır kilidi almaz. Yalnız telefona inen bir sütun değişince sürüm alınır. Öğrencinin yoklama gönderimi sayaca dokunmaz; gönderim işleminde sayacı alan personel işinden sonraki gruplarda kilitlenme olursa yalnız o grup TEKRAR_DENE alır. Okuyucu sayacı kilitsiz okur ve satırları surum <= okunan değer ile süzer.",
      why: "teknik.html#kod-veri-modeli tek sayaç satırını seçti; satır kilidi bitiş sırasıyla sürüm sırasını eşitler, okuyucu v+1'i görüp v'yi atlayamaz (SEQUENCE bunu garanti etmez). Son adımda almak kilidi kısa tutar. Sıcak yol (saniyede 70 ile 330 gönderim) sayaçtan uzak kalır."
    },
    {
      gap: "D06-B20",
      decision: "Nesil D12.nesilOku(tx) ile değişenler sorgusuyla aynı işlemde okunur; okuma yetkisi, terfiden sonraki CHECKPOINT ve zaman çizelgesinin çapraz denetimi D12'nindir (D12-B32). Geri yükleme denemesinde eski imleçle baştan indir alındığı D06 senaryosuyla da denenir.",
      why: "Nesil elle tutulmaz (plan.html#kararlar-indirme); veritabanı kurulumu ve dönüş adımları D12'nin kapsamı."
    },
    {
      gap: "D06-B21",
      decision: "Saat belgesi D06 gövdesine girmez: telefon her isteğe X-Saat-Istegi başlığıyla tek kullanımlık değer koyar, kök kanca (D13, D04) iki D06 cevabına da X-Saat-Belgesi ekler, eşitleme bozukken eklemez. Gönderimden hemen önceki belge D04'ün POST /v1/saat/belge ucundan alınır ve ikinci çapaya girer.",
      why: "Plan 'sunucunun diğer cevapları da yeni belge taşır' der (plan.html#gun-ikinci-capa); tek mekanizma kökte kalınca her modül ayrı yazmaz (D13-B22). Gönderme cevabındaki belge gönderim öncesi isteğin yerini tutmaz (plan.html#teknoloji-sunucu-yeri)."
    },
    {
      gap: "D06-B22",
      decision: "gondermeSuresiSonu = en erken(dersin bitiş anı + 7 x 86.400.000 ms, devamsızlık işleme son gününden sonraki günün 00:00 Europe/Istanbul anı); dışlayıcı sınır. Saf hesap packages/core/src/esitleme/gonderme-suresi.ts'te UTC milisaniyeyle, İstanbul gün sonu infra/saat'in istanbulGunSonuAni yardımcısıyla; zamanlanmış iş gerekmez, okuma anında hesaplanır.",
      why: "Kafa sayısının kesinleştiği an, panel şeridinin kalktığı an (tasarim.html#durumlar) ve geç kaydın 'sonradan değişenler'e düştüğü an aynı sonucu bulmalı; D14-B09'un son gün tanımıyla (ertesi gün 00:00, dışlayıcı) aynı."
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
      decision: "Hesap silme kuyruk öğesi değildir (contracts öğe türleri listesi). Telefon D01'in silme ucunu kuyruğunda sonuçlanmamış öğe kalmayınca çağırır; bunu her öğenin sonucundan bilir. Silmeden sonra gelen öğelerin sonucu sahiplerinindir (D12-B18); silinen hesabın oturumu kapalıdır, kişi yalnız imzadan çözülür. Hesap silinince D06 o kişinin kurulumlar, gonderim_defteri, ogrenci_durum_surumleri ve karar_teslimleri satırlarını D12'nin saklama işleyicisiyle siler.",
      why: "Sıralama telefonda kesin bilinir (her öğenin sonucu var), çökmeden etkilenmez. Bu satırlar planın 'kalır' listesinde değildir (plan.html#kararlar-hesap-silme); kayıtların kendisi D05'te kalır. D12-B20'nin 'son sıra numarası kalır' önerisi geç gelen kaydın doğrulaması içindi; o doğrulama D05'in (dönem, cihaz, sıra) tekilliğindedir, kurulum su seviyesi gerekmez."
    },
    {
      gap: "D06-B27",
      decision: "Personel telefonu GET /v1/esitleme/degisiklikler'de 401 alırsa çıkış gibi davranır: sınıf listelerini ve o hesabın imlecini siler, kuyruktaki işleri saklar; yeniden girişte imleçsiz istekle hoca verisi baştan iner. Gönderimde 401 yalnız o kurulumun gönderimini durdurur.",
      why: "Çıkıştaki gizlilik gerekçesinin aynısı (plan.html#kararlar-indirme); işler girişten sonra gider (plan.html#kararlar-roller). Derste internetsizken 401 görülmez, internetsiz çalışma etkilenmez."
    },
    {
      gap: "D06-B28",
      decision: "Günlük sayaçlar D15'in telefon_sayaci öğesidir; gün sınırı, tekillik ve birikme D15'in. Sıra kuralı kendiliğinden korunur: öğe gün kapanınca kuyruğa girer ve o günün kayıtlarından sonraki sırayı alır. Panel süreleri POST /v1/isletim/ekran-sureleri (D15).",
      why: "Contracts kararı; D06 yalnız taşır."
    },
    {
      gap: "D06-B29",
      decision: "Paket düzeyinde 429 ve 503 D13'ündür (Retry-After; 503 SUNUCU_YOGUN 15 ile 45 saniye, D13-B10). D06'nın 503 ESITLEME_KURULUM_MESGUL cevabı Retry-After 5 taşır. Hız sınırı: gönderim X-Kurulum-Kimligi başına dakikada 30, indirme oturum başına dakikada 120 (D13-B09); bir bölme dizisi (yaklaşık 16 istek) sınırın altında kalır. Kesin değerler ders çıkışı yük testiyle yazılır.",
      why: "Telefon Retry-After'a en az o kadar, üstüne rastgele payla uyar (teknik.html#telefon-gonderme-protokolu); değerler tek yerde (D13) durur."
    },
    {
      gap: "D06-B30",
      decision: "Gönderim işlemi SET LOCAL statement_timeout '5s' ve lock_timeout '2s' ile açılır; kurulum satırı kilidi beklenemezse 503 ESITLEME_KURULUM_MESGUL. İşleme bütçesi 8 saniyedir: gruplar en çok 50 öğelik parçalarla işleyiciye verilir ve bütçe her parçadan sonra denetlenir; bütçe dolunca kalan öğeler işleyiciye verilmeden TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI (beklemeSaniye 5) alır, işlenenler aynı işlemde kalır ve işlem biter. Fastify isteği 25 saniye (D13-B26), telefon 30 saniye; telefon yeniden göndermeden önce sunucu kesin bitirmiş olur.",
      why: "Sunucu telefonun zaman aşımından sonra yazmayı sürdürseydi yeniden gönderimle yük ikiye katlanırdı. Bütçe aşımında bütün işlemi geri alıp 503 vermek, hep yavaş kalan bir paketi sonsuza dek döndürürdü; kısmi sonuç her turda ilerleme sağlar ve sıra düzenini bozmaz (kesilen öğeler hep sondadır). Değerler yük testiyle ayarlanır."
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
        "Gönderim ucunda kişi oturumdan ya da paket imzasından çözülür (D06-B10); 401 yalnız ikisi de yoksa ya da kişiler tutmuyorsa döner. Yoklama kayıtları oturumsuz işlenir, oturum isteyen öğe yalnız kendisi TEKRAR_DENE alır; eski telefondaki ve yedekten dönen kayıtlar değişim kararına ulaşır (plan.html#gun-kenar-durumlar), teknik.html#telefon-gonderme-protokolu'ndaki '401'de gönderim durur' kuralı da kişi çözülemeyen istek için geçerli kalır."
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
    }
  ]
};

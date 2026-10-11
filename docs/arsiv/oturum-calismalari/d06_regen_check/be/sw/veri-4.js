// D06 spec data, part 4: flows, rules, error codes, types, cross-module usage. Extra keys for the integrator; the fragment renders them.
module.exports = {
  olcum: [
    "Makbuzlu kayıtta kayıp 0: gönderim durum makinesi testi ve yedekten dönüş senaryosu her değişiklikte; geri yükleme denemesinde sonSira ve baştan indirme (plan.html#hedefler).",
    "Gönderim ucunda p95 1 saniye, p99 3 saniye altı; 503 oranı yüzde 2 altı (ders çıkışı yük testi, D15-B15).",
    "Açık sıra boşluğu olan kurulum sayısı ve 24 saatten eski boşluk sayısı: sira_boslugu_raporu'nun gecelik log satırı ve kurulumlar sütunları (plan.html#hedefler, boşluklar hata yakalamak için).",
    "Gönderim izi: her gönderimde tek log satırı (istek kimliği, kurulum ve kişi iç kimliği, öğe sayısı, sonuçların koda göre sayısı, ikinci çapa durumu, süre, sonSira). İndirme izi: baştan indirme nedeni, satır sayısı, sayfa, süre. Kayıtların yüzde 95'inin 24 saatte ulaşması kayıt satırlarından ölçülür (D15)."
  ],

  dis_yuz_kullanimi: [
    "D01: oturumDogrula(istek) (gönderimde 401 sınıfı hata 'oturum yok' sayılır), cihazAnahtariGetir(tx, anahtarId) (paket imzası), ogrenciHesabiGetir(tx, { kisiId }) (öğrenci kapsam bağlamındaki numara ve teyit durumu; numara loga girmez)",
    "D12: islem(fn), nesilOku(tx), saklamaIsleyicisiKaydet(veriSinifi, isleyici), kisitAdi(tablo, sutunlar, tur), testVeritabaniHazirla()",
    "D13: rotalariKaydet(app, ESITLEME_ROTALARI), uygulamaHatasi(kod, ayrinti), istekKimligi(istek), hizSinifi('esitleme_gonderim')",
    "infra/saat: istanbulGunSonuAni(tarih) (gönderme süresi sonu); Saat arayüzü ve log bileşim kökünden parametreyle",
    "packages/core/src/saat: yalnız tipler (IlkCapaAlanlari, IkinciCapa yok nedenleri); D06 belgeyi doğrulamaz",
    "jobs/esitleme: D14.isTanimla (iş tanımı kurucusu, D14 isteği); modules/esitleme D14'ü içe aktarmaz"
  ],

  kayitlar: [
    "app.ts: esitlemeEklentisi(app, { saat, log, ulasmaMakbuzu: { etkinKid, anahtarlar } }); anahtarlar D15.gizliAnahtar('ulasma_makbuzu', kid) ile bileşim kökünde okunur",
    "D13.rotalariKaydet(app, ESITLEME_ROTALARI): gönderim için kimlik ['cihaz-imzasi', 'oturum'], gövde sınırı 1 MiB, hız sınıfı esitleme_gonderim; indirme için kimlik oturum (öğrenci, personel), defter yazan GET işareti",
    "D12.saklamaIsleyicisiKaydet('hesap_silme', kisininEsitlemeSatirlariniSil); D12.saklamaIsleyicisiKaydet('yoklama_kayitlari', donemTeslimleriniSil): saklama süresi dolan dönemin karar_teslimleri satırları, kayıtlardan önce (sınıf adları D12 listesinden). Defterin 400 günlük teknik temizliği D12'nin saklama işine değil sira_boslugu_raporu'na bağlıdır: saklama işi süreler belirlenene kadar kapalıdır, geçici veriyi her modül kendi işiyle siler (contracts).",
    "jobs/esitleme/index.ts: export const isler = [isTanimla({ kuyruk: SIRA_BOSLUGU_RAPORU, isleyici, sureAsimiSaniye: 600, zamanlama: { cron: '10 5 * * *' } })]; worker.ts toplar"
  ],

  beklenenler: [
    "D01: cihazAnahtariGetir dönüşünde { anahtarId, cihazId, kisiId, tur: 'a' | 'i' | 's', acikAnahtarSpki, durum }; oturumDogrula'nın 401 sınıfı hataları ayırt edilebilir (kod alanı).",
    "D12: nesilOku(tx) dönüşü { sistemKimligi: string (64 bit ondalık), zamanCizelgesi: number }; uygulama rolüne pg_control_system ve pg_control_checkpoint yetkisi; kayıt veri sınıfında D06'nın işleyicisi D05'inkinden önce çalışır; hesap silme sınıfı D01'in yürütücüsünden çağrılır.",
    "D13: gönderim rotasında geçersiz Bearer kökte 401 değildir (isteğe oturum hatası işareti konur ya da D06 oturumDogrula'yı kendisi çağırır); indirme GET'i defter yazan uç olarak kayıtlı; hız sınıfı anahtarı X-Kurulum-Kimligi; X-Saat-Belgesi kök kancası iki uçta; başlık adları ve PLATFORMLAR, KANALLAR sabitleri sözleşmede.",
    "D14: contracts.json'da D06 reads_from listesine D14 eklenmeli (yalnız jobs/esitleme'nin isTanimla kullanımı; döngü oluşmaz, D14 D06'yı okumaz).",
    "D04: infra/saat'in istanbulGunSonuAni(tarih) yardımcısı (D04 spec'inde 'sözleşmeye ek') contracts.json dış yüz listesine girmeli; gondermeSuresiSonu ona dayanır, D06 D04'ün modül dış yüzünü çağırmaz.",
    "D15: 'ulasma_makbuzu' amaçlı gizli anahtar (kid'li; eski anahtar en az dönem kilidine kadar saklanır, teknik.html#sunucu-ayarlar listesine eklenir); ders çıkışı yük testinde gönderim ve indirme profili; olcum_ görünümleri kurulumlar ve gonderim_defteri'ni okur.",
    "Öğe sahipleri (D04, D05, D07, D09, D11, D15): ogeTuruKaydet ile kaydolur; işleyici beklenen her sonucu döner, fırlatmaz, hızlı yolda öğe başına SAVEPOINT açmaz; ayrıntı şemasını kendi sözleşmesinde yazar; öğe kimliğini kendi tablosunda hedefli ON CONFLICT ile tekil tutar; GelenOge.ulasmaAni'yi (paket anı ya da makbuz anı) ulaşma anı olarak yazar.",
    "D05: saati yalnız ikinci çapayla kurulabilen kayıt için ikinci çapa YOK ise kaydı saklamadan TEKRAR_DENE döner; ogrencininKayitlari kaynağı karar sürümlerini kararlar listesinde verir; kayıt metnindeki sıra öğe sırasıyla aynıdır.",
    "D03: öğrenci kapsamı numaraya dayandığından teyitsiz öğrenciye (Kapsam.teyitli false) kendi liste satırının adı gönderilmez; numarayı başkasının numarasıyla kaydeden kişi o öğrencinin adını öğrenemez (öğrenciye başka öğrencinin adı inmez kuralı, plan.html#kararlar-indirme).",
    "İndirme kaynakları (D02, D03, D04, D05, D08, D09): telefona inen satırda bigint sürüm sütunu ve silinme işareti; sürüm surumAl ile işlemin son adımında; kapsam ve sürüm süzgecine uygun dizin, ör. (ders_id, surum); öğrenci verisini değiştiren her işlem ogrenciDurumuDegisti çağırır. D04'ün ve D03'ün önerdiği imzalar bu arayüze bağlanır: surumden null tam indirme demektir, sürümler süreç içinde bigint, sayfa sınırı adet."
  ],

  akislar: {
    gonderim: [
      "Kök: hız sınırı (X-Kurulum-Kimligi), gövde sınırı 1 MiB, zarf şeması. Bu uçta geçersiz Bearer kökte 401 değildir.",
      "ulasmaAni = saat.simdi(): paket başına bir kez okunur.",
      "İşlem açılır (D12.islem): SET LOCAL statement_timeout '5s', lock_timeout '2s'.",
      "Kişi çözümü: Bearer varsa D01.oturumDogrula (401 sınıfı hata oturumsuz sayılır); ikinciCapa 'a' ya da 's' ise D01.cihazAnahtariGetir ve imza doğrulaması. İkisi de yoksa 401 ESITLEME_KIMLIK_YOK; kişiler tutmazsa 401 ESITLEME_KIMLIK_UYUSMUYOR.",
      "Kurulum satırı: yoksa kişi ve rolle açılır (kişinin 20 kurulumu varsa 403 ESITLEME_KURULUM_SINIRI), varsa SELECT ... FOR UPDATE; kişisi farklıysa 401 ESITLEME_KIMLIK_UYUSMUYOR; kilit 2 saniyede alınamazsa 503 ESITLEME_KURULUM_MESGUL.",
      "İkinci çapa bağlamı: metin çözülür, tur, v, kurulum ve paket denetlenir; her öğe için VAR ya da YOK ve yokNedeni çıkarılır.",
      "Öğrenci onayı: imlec geçerliyse (nesil ve hesap özeti tutuyor) ve öğrenci sürümü onaylanandan büyükse teslimler yazılır.",
      "yerelRetler deftere RET ESITLEME_YEREL_RET yazılır (KABUL ve ZATEN_VAR satırına dokunmaz).",
      "Paketin sıraları için defter tek sorguyla okunur; öğeler artan sırayla ön denetimden geçer: zarf, sıra çakışması, tür kaydı, rol, oturum. Ulaşma makbuzu geçerliyse öğenin ulaşma anı makbuzdaki andır.",
      "Ardışık aynı tür öğe grupları en çok 50 öğelik parçalarla: SAVEPOINT, işleyici (isleToplu bir kez ya da isle tek tek), sonuç sözleşmesi denetimi, RELEASE. Hata: geri dön; geçici kod (40001, 40P01, 55P03, 57014) ise parça TEKRAR_DENE ESITLEME_GECICI_CAKISMA, değilse öğe başına SAVEPOINT ile yeniden (23 sınıfı RET ESITLEME_KISIT_IHLALI, öbürü TEKRAR_DENE ESITLEME_ISLEYICI_HATASI). Her parçadan sonra 8 saniyelik bütçe denetlenir; dolduysa kalan öğeler TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI alır.",
      "Defter toplu upsert (KABUL ve ZATEN_VAR satırını değiştirmeyen kural); kesintisiz son sıra ve en büyük sıra hesabı; kurulum satırı (son temas, son gönderim, bekleyen, sürüm başlıkları, son cihaz).",
      "COMMIT. Cevap: istek sırasıyla sonuçlar ve ulaşma makbuzları, sonSira, degisiklikVar. Tek log satırı."
    ],
    indirme: [
      "Kök: oturum kancası (öğrenci ya da personel), hız sınırı; X-Kurulum-Kimligi ve sorgu şeması.",
      "an = saat.simdi(); işlem READ COMMITTED.",
      "Kurulum satırı: yoksa açılır (kişinin 20 kurulumu varsa 403 ESITLEME_KURULUM_SINIRI); kişisi farklıysa 401 ESITLEME_KIMLIK_UYUSMUYOR. Son temas, son indirme, bekleyen ve yapı sürümü SKIP LOCKED ile yazılır (süren gönderim kilitliyse atlanır).",
      "nesil = D12.nesilOku(tx); S = degisiklik_sayaci.surum (kilitsiz); öğrencide So = öğrenci sürümü, D01.ogrenciHesabiGetir ile numara ve teyit durumu.",
      "İmleç çözümü: nesil, hesap özeti, yapı sürümü, S ve en_eski_gecerli_surum aralığı; geçerli ve öğrenciyse onay (teslimler).",
      "Kapsam: rolün kapsam kaynağı kapsamı şimdiki veriden kurar; imleç geçerliyse degistiMi(kişi, imleçteki kapsamSurumu, S) sorulur, true ise baştan indir. Yeni imlecin kapsamSurumu S olur.",
      "Genel kaynaklar: degisenler(kapsam, surumden c ya da null, S, adet); sayfa kesme kuralıyla üst sürüm U; U'dan büyük satırlar çıkar; aynı kaynaktan aynı kimlik bir kez.",
      "Öğrenci bölümü: baştan indirmede ya da So imleçtekinden büyükse her öğrenci kaynağından bolum; dönen karar sürümleri karar_teslimleri'ne sunum olarak yazılır.",
      "Yeni imleç (nesil, U, S, So, yapı sürümü, hesap özeti); cevap; tek log satırı."
    ]
  },

  kurallar: [
    { ad: "Su seviyesi", metin: "Gönderim sonunda kesintisiz_son_sira'nın üstündeki sıralar artan okunur (en çok 1000'lik parçalarla) ve 1..n kesintisiz olan en büyük n yazılır; ilerlediyse sira_ilerleme_ani güncellenir. Saf hesap packages/core/src/esitleme/su-seviyesi.ts." },
    { ad: "Sayfa kesme", metin: "Her genel kaynak (surumden, surumeKadar] aralığındaki satırları surum sırasıyla en çok adet kadar döner. adet kadar dönen kaynak kesilmiş sayılır: dönen satırlar tek sürümdense D06 o sürümü sınırsız ister ve kaynağın sınırı o sürüm olur; birden çok sürümse son sürüm bölünmüş olabileceğinden sınır son sürümden bir eksiktir. Sayfanın üst sürümü U kesilen kaynakların sınırlarının en küçüğüdür (kesilen yoksa S); U'dan büyük satırlar sonraki sayfaya kalır. Her sayfa ilerler (U imleçten büyüktür). Saf hesap packages/core/src/esitleme/sayfa.ts." },
    { ad: "İmleç biçimi", metin: "base64url('1|sistemKimligi|zamanCizelgesi|genelSurum|kapsamSurumu|ogrenciSurumu|yapiSurumu|hesapOzeti'), en çok 256 karakter; genelSurum <= kapsamSurumu; personelde ogrenciSurumu 0. kapsamSurumu kapsamın en son hesaplandığı sayaç değeridir: her istekte degistiMi(kapsamSurumu, S) sorulur, false ise yeni imleçte kapsamSurumu = S olur. Baştan indir nedenleri: imleç yok ya da çözülemiyor, biçim sürümü bilinmiyor, nesil farklı, hesap özeti farklı, yapı sürümü farklı, genel ya da kapsam sürümü sayaçtan büyük, genel sürüm en_eski_gecerli_surum'dan küçük, öğrenci sürümü sunucudakinden büyük, kapsam kapsamSurumu'ndan sonra değişti." },
    { ad: "İkinci çapa metni", metin: "base64url(UTF-8 JSON) { tur: 'ikinci_capa', v: 1, kurulum, paket, belge, istekSuresiMs, ogeler: [{ id, olaydanBelgeyeMs } | { id, yokNedeni: 'sonra_yeniden_baslatma' }] }, en çok 200 öğe, kimlikler tekil. İmza metnin ASCII baytları üzerinde ECDSA P-256 SHA-256, DER. Öğe bağlamı: listede süreyle varsa VAR; listede yokNedeniyle varsa YOK ve o neden; listede yoksa YOK gonderilmedi; ikinciCapa null ise YOK esitleme_bozuk (ikinciCapaYokNedeni öyleyse) ya da paket_imzasiz; imza ya da bağlam tutmazsa YOK paket_imzasiz ve log." },
    { ad: "Ulaşma makbuzu", metin: "base64url(biçim 1 bayt (1) | kid 1 bayt | kabulAniMs 8 bayt büyük uçlu | HMAC-SHA256(anahtar[kid], 'esitleme.ulasma.1' | kurulum 16 bayt | sira 8 bayt | ogeKimligi 16 bayt | SHA-256(govde) 32 bayt | kabulAniMs 8 bayt)), 42 bayt, 56 karakter. Doğrulama timingSafeEqual ile; geçerli makbuz öğenin ulaşma anını makbuzdaki an yapar. Anahtar listesinde olmayan kid yok sayılır (ulaşma anı paketin anı olur)." },
    { ad: "Defter güncelleme", metin: "INSERT ... ON CONFLICT (kurulum_id, sira) DO UPDATE: önceki sonuç KABUL ya da ZATEN_VAR ise sonuc, gerekce ve kabul_ani kalır; değilse yeni sonuç yazılır; son_gorulme_ani, gorulme_sayisi, son_paket_kimligi ve gönderen sürüm her gelişte güncellenir; öğe kimliği farklıysa satır değişmez (çakışma ön denetimde RET alır)." },
    { ad: "Kilit sırası", metin: "Gönderimde önce kurulum satırı, sonra öğe sahiplerinin satırları; sayaç (surumAl) yalnız inen satır yazan işlemde ve son adımlardan biri olarak; öğrenci durum satırı (ogrenciDurumuDegisti) öğrencinin verisini yazan adımda. İndirme sayaç ve öğrenci satırını kilitsiz okur, kurulum satırını SKIP LOCKED ile yazar." }
  ],

  telefon_sozlesmesi: [
    "Her öğe oluşturulduğu yerel işlemde (kurulum, sıra) alır; sıra kurulum başına 1'den boşluksuz artar. Kurulum kimliği hesap başınadır; yerel veritabanı ile anahtarlar tutmazsa telefon bütün kimlikleri yeniler, eski öğeler eski kimlikle gider.",
    "Paket: bir kurulumun sonuçlanmamış ve bekleme süresi dolmuş öğeleri artan sırayla, en çok 200 öğe ve 768 KiB; varsa bildirilmemiş yerel retler. Bir kurulum için aynı anda tek gönderim (ön plan ve arka plan aynı kilidi paylaşır).",
    "İkinci çapa: göndermeden hemen önce POST /v1/saat/belge; metin kurulur ve imzalanır; bölünen her yarı yeni paketKimligi alır ve yeniden imzalanır; ilk çapası bozuk kayıt da pakete girer.",
    "Sonuç: KABUL ve ZATEN_VAR öğeyi ULASTI yapar (ulaşma anı ve makbuzu saklanır); RET makbuzu 'gönderilmedi' bırakır; TEKRAR_DENE ve bilinmeyen sonuç öğeyi beklemeye alır.",
    "sonSira kuralı: sonSira'dan büyük sıradaki ULASTI ve RET öğeleri bir kez, makbuzlarıyla yeniden gönderilir (plan.html#gun-kenar-durumlar); YEREL_RET öğesi gönderilmez, yerelRetler ile yeniden bildirilir.",
    "HTTP: ağ hatası, zaman aşımı, 408, 429, 5xx ve beklenmeyen biçim paketi yeniden dener (2 saniyeden 10 dakikaya, rastgele, Retry-After en az); 400 ve 413 ikiye böler, yarılar derinlik öncelikli ve önce sol (küçük sıralı) yarı sonuçlanarak gönderilir; tek öğe yine 400 ya da 413 alırsa YEREL_RET olur ve sonraki pakette bildirilir; 401 ve 403 o kurulumun gönderimini durdurur; öbür 4xx 400 gibi (teknik.html#telefon-gonderme-protokolu).",
    "ESITLEME_KIMLIK_UYUSMUYOR telefon hatasıdır: telefon o hesap için yeni kurulum kimliği üretir, olay günlük sayaçlara yazılır.",
    "İndirme: her sayfa ve imleç tek yerel işlemde; bastanIndir ile tam indirme başlar, devamiVar false olunca gelmeyen satırlar silinir; kuyruk etkilenmez. Personel 401 alırsa listeler ve imleç silinir, kuyruk kalır.",
    "Telefon her isteğe X-Saat-Istegi koyar ve cevaptaki X-Saat-Belgesi'ni saklar; X-Kurulum-Kimligi, X-Uygulama-Surumu, X-Guncelleme-Kimligi, X-Platform ve X-Kanal her istekte gider.",
    "Saf kurallar (paket seçimi, bekleme aralığı, sonSira kuralı) packages/core/src/esitleme/protokol.ts'tedir; telefonun kuyruğu (apps/mobile) ve sunucunun durum makinesi testi aynı işlevleri kullanır."
  ],

  hata_kodlari: [
    { kod: "ESITLEME_KURULUM_KIMLIGI_GECERSIZ", duzey: "istek", sonuc: "400", ne: "X-Kurulum-Kimligi yok ya da UUIDv7 değil." },
    { kod: "ESITLEME_KIMLIK_YOK", duzey: "istek", sonuc: "401", ne: "Geçerli oturum da kayıtlı anahtarla geçerli paket imzası da yok; telefon o kurulumun gönderimini durdurur." },
    { kod: "ESITLEME_KIMLIK_UYUSMUYOR", duzey: "istek", sonuc: "401", ne: "Oturumun, paket imzasının ya da kurulumun kişisi birbirini tutmuyor; telefon yeni kurulum kimliği üretir." },
    { kod: "ESITLEME_KURULUM_MESGUL", duzey: "istek", sonuc: "503, Retry-After 5", ne: "Aynı kurulumun süren gönderiminin kilidi 2 saniyede bırakılmadı; hiçbir satır yazılmadı." },
    { kod: "ESITLEME_KURULUM_SINIRI", duzey: "istek", sonuc: "403", ne: "Kişinin 20 kurulum satırı var, yenisi açılmadı; telefon gönderimi durdurur, olay günlük sayaçlara yazılır. Kötüye kullanıma karşı sınır: kurulum kimliğini döndürerek sınırsız satır açmayı ve kuruluma bağlı hız sınırını aşmayı önler." },
    { kod: "ESITLEME_OGE_GECERSIZ", duzey: "öğe", sonuc: "RET", ne: "Tür deseni, UUIDv7, ilkCapa şeması ya da türün gövde sınırı tutmuyor; deftere yazılır." },
    { kod: "ESITLEME_SIRA_CAKISMASI", duzey: "öğe", sonuc: "RET", ne: "Sıra defterde başka öğe kimliğiyle var; deftere yazılmaz, ilk satır değişmez." },
    { kod: "ESITLEME_YETKI_YOK", duzey: "öğe", sonuc: "RET", ne: "Türün rolü isteğin kişisine uymuyor (ör. öğrenci oturumuyla hoca işi)." },
    { kod: "ESITLEME_KISIT_IHLALI", duzey: "öğe", sonuc: "RET", ne: "İşleyicide beklenmeyen kısıt hatası; öğe tek başına yeniden denendi, kısıt adı loglanır." },
    { kod: "ESITLEME_YEREL_RET", duzey: "öğe", sonuc: "RET (yalnız defter)", ne: "Telefonun tek öğede 400 ya da 413 aldığı öğe, yerelRetler ile bildirildi." },
    { kod: "ESITLEME_TUR_BILINMIYOR", duzey: "öğe", sonuc: "TEKRAR_DENE, beklemeSaniye 3600", ne: "Tür bu sunucuda kayıtlı değil (yeni istemci, eski sunucu); atılmaz." },
    { kod: "ESITLEME_OTURUM_GEREKLI", duzey: "öğe", sonuc: "TEKRAR_DENE", ne: "Tür oturum ister, istekte geçerli oturum yok (ör. cihaz değişiminden sonra eski telefondaki sorun bildirimi)." },
    { kod: "ESITLEME_GECICI_CAKISMA", duzey: "öğe", sonuc: "TEKRAR_DENE", ne: "Grupta kilitlenme, serileştirme, kilit ya da deyim zaman aşımı." },
    { kod: "ESITLEME_ISLEYICI_HATASI", duzey: "öğe", sonuc: "TEKRAR_DENE, beklemeSaniye 600", ne: "İşleyici fırlattı ya da sonuç sözleşmesine uymadı; hata loglanır, öğe telefonda kalır." },
    { kod: "ESITLEME_ZAMAN_BUTCESI", duzey: "öğe", sonuc: "TEKRAR_DENE, beklemeSaniye 5", ne: "8 saniyelik işleme bütçesi doldu; öğe işleyiciye verilmedi, önceki öğeler işlendi." }
  ],

  tipler: [
    "// packages/contracts/src/esitleme.ts (tipler ve Zod şemaları), apps/server/src/modules/esitleme/index.ts (dış yüz)",
    "export const OGE_TURLERI = { yoklama_kaydi: 'D05', makbuz_okutmasi: 'D05', pencere_suresi: 'D04', erken_kapatma: 'D04',",
    "  kafa_sayisi: 'D07', elle_ekleme: 'D09', sorun_bildirimi: 'D09', gosterim_kaydi: 'D11', telefon_sayaci: 'D15' } as const;",
    "export type OgeTuru = keyof typeof OGE_TURLERI;",
    "export const OGE_SONUCLARI = ['KABUL', 'ZATEN_VAR', 'RET', 'TEKRAR_DENE'] as const;  // x-extensible-enum",
    "export type IkinciCapaBaglami =",
    "  | { durum: 'VAR'; imzaTuru: 'a' | 's' | 'o'; belge: string; istekSuresiMs: number; olaydanBelgeyeMs: number }",
    "  | { durum: 'YOK'; yokNedeni: 'sonra_yeniden_baslatma' | 'paket_imzasiz' | 'esitleme_bozuk' | 'gonderilmedi' };",
    "export interface GelenOge { tur: OgeTuru; sira: number; ogeKimligi: string; govde: string;",
    "  ilkCapa: IlkCapaAlanlari | null; ulasmaAni: Date; ikinciCapa: IkinciCapaBaglami;",
    "  onceki: { sonuc: OgeSonucuKodu; gerekce: string | null; kabulAni: Date | null } | null }",
    "export interface PaketBaglami { kurulumId: string; kisiId: KisiId; rol: 'OGRENCI' | 'PERSONEL';",
    "  oturum: { oturumId: string; cihazId: CihazId | null } | null; imzalayan: { cihazId: CihazId; anahtarId: string } | null;",
    "  paketKimligi: string; istekKimligi: string; gonderenSurum: string | null }",
    "export type OgeSonucu =",
    "  | { sonuc: 'KABUL' | 'ZATEN_VAR'; ulasmaAni: Date; ayrinti?: Record<string, unknown> }",
    "  | { sonuc: 'RET'; gerekce: string; ayrinti?: Record<string, unknown> }",
    "  | { sonuc: 'TEKRAR_DENE'; gerekce: string; beklemeSaniye?: number };",
    "export interface Kapsam { kisiId: KisiId; rol: 'OGRENCI' | 'PERSONEL'; ogrenciNo: string | null; teyitli: boolean | null;",
    "  subeler: readonly string[]; dersler: readonly string[]; birimler: readonly string[] }",
    "export interface IndirilenSatir { id: string; surum: bigint; silindi: boolean; veri: Record<string, unknown> | null }",
    "export interface GenelKaynak { tur: 'genel'; roller: readonly ('OGRENCI' | 'PERSONEL')[];",
    "  degisenler(tx: Islem, i: { kapsam: Kapsam; surumden: bigint | null; surumeKadar: bigint; adet: number }): Promise<readonly IndirilenSatir[]> }",
    "export interface KapsamKaynagi { tur: 'kapsam'; rol: 'OGRENCI' | 'PERSONEL';",
    "  kapsam(tx: Islem, k: { kisiId: KisiId; ogrenciNo: string | null }): Promise<Pick<Kapsam, 'subeler' | 'dersler' | 'birimler'>>;",
    "  degistiMi(tx: Islem, k: { kisiId: KisiId; ogrenciNo: string | null }, kapsamSurumu: bigint, surumeKadar: bigint): Promise<boolean> }",
    "export interface OgrenciKaynagi { tur: 'ogrenci';",
    "  bolum(tx: Islem, ogrenciId: KisiId, i: { surumden: bigint | null; surumeKadar: bigint }): Promise<{ tam: boolean;",
    "    satirlar: readonly Omit<IndirilenSatir, 'surum'>[]; kararlar: readonly { donemId: DonemId; kayitId: KayitId; kararSurumu: number }[] }> }"
  ]
};

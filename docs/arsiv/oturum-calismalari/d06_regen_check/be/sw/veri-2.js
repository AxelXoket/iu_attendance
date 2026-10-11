// D06 spec data, part 2: state machines, invariants, exports, files, tests.
module.exports = {
  state_machines: [
    {
      name: "Defter satırı (öğe sonucu)",
      states: ["YOK", "TEKRAR_DENE", "RET", "KABUL", "ZATEN_VAR"],
      transitions: [
        { from: "YOK", to: "KABUL", by: "öğe işleyicisi", when: "Öğe ilk kez geldi, sahibi kabul edip sakladı." },
        { from: "YOK", to: "ZATEN_VAR", by: "öğe işleyicisi", when: "Öğe başka yoldan zaten ulaşmıştı (ör. aynı kayıt önce makbuz okutmasıyla geldi)." },
        { from: "YOK", to: "RET", by: "D06 ya da öğe işleyicisi", when: "Zarf geçersiz, rol uymuyor, beklenmeyen kısıt hatası ya da sahip öğeyi saklamadan reddetti; yerelRetler ile bildirilen öğe de RET ESITLEME_YEREL_RET yazılır." },
        { from: "YOK", to: "TEKRAR_DENE", by: "D06 ya da öğe işleyicisi", when: "Tür kayıtlı değil, oturum gerekli, geçici çakışma, işleyici hatası ya da sahibin geçici gerekçesi (ör. saati yalnız ikinci çapayla kurulabilen kayıtta ikinci çapa yok)." },
        { from: "TEKRAR_DENE", to: "KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE", by: "öğe işleyicisi", when: "Öğe bekleme süresinden sonra yeniden geldi; yeniden değerlendirilir." },
        { from: "RET", to: "KABUL, ZATEN_VAR ya da RET", by: "öğe işleyicisi", when: "Öğe uygulama ya da uzaktan güncelleme değişince ya da sonSira altına düşünce bir kez yeniden geldi; sonuç önbellekten değil yeniden değerlendirmeden gelir." },
        { from: "KABUL", to: "KABUL", by: "D06", when: "Aynı öğe yeniden geldi: cevap ZATEN_VAR, satırın sonucu ve kabul_ani değişmez, gorulme_sayisi artar. ZATEN_VAR satırı da aynı kuralla kalır." }
      ]
    },
    {
      name: "Telefondaki kuyruk öğesi (D06 protokolü, uygulaması apps/mobile)",
      states: ["BEKLIYOR", "GONDERILIYOR", "ULASTI", "RET", "YEREL_RET"],
      transitions: [
        { from: "BEKLIYOR", to: "GONDERILIYOR", by: "telefon", when: "Sırası geldi ve bekleme süresi doldu; paket kurulumun öğeleriyle artan sırada, en çok 200 öğe ve 768 KiB." },
        { from: "GONDERILIYOR", to: "ULASTI", by: "telefon", when: "Sonuç KABUL ya da ZATEN_VAR; ulaşma anı ve ulaşma makbuzu saklanır, makbuz 'Sunucuya ulaştı' olur." },
        { from: "GONDERILIYOR", to: "RET", by: "telefon", when: "Sonuç RET; makbuz 'Telefonda kayıtlı, gönderilmedi' kalır, günlük sayaçlara yazılır." },
        { from: "GONDERILIYOR", to: "BEKLIYOR", by: "telefon", when: "Sonuç TEKRAR_DENE ya da bilinmeyen sonuç (bekleme en az beklemeSaniye, 2 saniyeden 10 dakikaya artan, rastgele kaydırılmış) ya da paket düzeyinde ağ hatası, zaman aşımı, beklenmeyen biçim, 408, 429, 5xx." },
        { from: "GONDERILIYOR", to: "YEREL_RET", by: "telefon", when: "Bölünen paket tek öğeye indi ve yine 400 ya da 413 aldı; sonraki pakette yerelRetler ile bildirilir." },
        { from: "ULASTI", to: "BEKLIYOR", by: "telefon", when: "Cevaptaki sonSira öğenin sırasından küçük (sunucu yedekten döndü); bir kez, ulaşma makbuzuyla yeniden gönderilir." },
        { from: "RET", to: "BEKLIYOR", by: "telefon", when: "runtimeVersion ya da updateId değişti, ya da sonSira öğenin sırasından küçük; bir kez." },
        { from: "YEREL_RET", to: "BEKLIYOR", by: "telefon", when: "Yalnız runtimeVersion ya da updateId değişince, bir kez. sonSira öğenin sırasından küçükse öğe gönderilmez, sonraki pakette yerelRetler ile yeniden bildirilir (yeniden göndermek bölme döngüsü açardı)." },
        { from: "BEKLIYOR", to: "BEKLIYOR", by: "telefon", when: "401 ya da 403: bu kurulumun gönderimi durur, cihaz ya da giriş durumu gösterilir; öğe silinmez." }
      ]
    },
    {
      name: "İndirme imleci",
      states: ["YOK", "TAM_INDIRME", "GUNCEL"],
      transitions: [
        { from: "YOK", to: "TAM_INDIRME", by: "sunucu", when: "İmleçsiz istek: bastanIndir true, ilk sayfa." },
        { from: "GUNCEL ya da TAM_INDIRME", to: "TAM_INDIRME", by: "sunucu", when: "Nesil, hesap özeti ya da yapı sürümü tutmuyor, imleç sayaçtan ileri ya da en_eski_gecerli_surum altında, imleç çözülemiyor ya da kapsam kaynağı kapsamın imleçteki kapsamSurumu'ndan sonra değiştiğini söylüyor; ilk sayfa yeniden gelir." },
        { from: "TAM_INDIRME", to: "TAM_INDIRME", by: "telefon", when: "devamiVar true: sayfa ve imleç tek yerel işlemde yazılır, hemen sonraki sayfa istenir." },
        { from: "TAM_INDIRME", to: "GUNCEL", by: "telefon", when: "devamiVar false: bu tam indirmede gelmeyen program ve liste satırları silinir; gönderme kuyruğuna dokunulmaz." },
        { from: "GUNCEL", to: "GUNCEL", by: "telefon", when: "Artımlı sayfa uygulandı." },
        { from: "GUNCEL ya da TAM_INDIRME", to: "YOK", by: "telefon", when: "Personel çıkış yaptı ya da indirmede 401 aldı: sınıf listeleri ve o hesabın imleci silinir, kuyruktaki işler kalır." }
      ]
    },
    {
      name: "Karar teslimi (karar_teslimleri satırı)",
      states: ["SUNULMADI", "SUNULDU", "TELEFONA_ULASTI"],
      transitions: [
        { from: "SUNULMADI", to: "SUNULDU", by: "indirme", when: "Öğrenci bölümü bu karar sürümünü telefona gönderdi: satır açılır, sunulan_durum_surumu ve iki sunum anı yazılır." },
        { from: "SUNULDU", to: "SUNULDU", by: "indirme", when: "Onay gelmeden yeniden sunuldu (önceki cevap kaybolmuş olabilir): son_sunulma_ani ve sunulan_durum_surumu ilerler." },
        { from: "SUNULDU", to: "TELEFONA_ULASTI", by: "gönderim ya da indirme", when: "İstekteki geçerli imlecin öğrenci sürümü sunulan_durum_surumu'na eşit ya da büyük: telefona_ulasti_ani = son_sunulma_ani, onay_ani = istek anı; bir daha değişmez." }
      ]
    }
  ],

  invariants: [
    "Gönderim cevabındaki sonuçlar istekteki öğelerle aynı sırada ve birebirdir; (sira, ogeKimligi) çiftleri eşleşmeyen cevap telefonda hiçbir öğeyi ULASTI yapmaz (D13-B21).",
    "(kurulum, sıra) için defterde en çok bir satır vardır; KABUL ya da ZATEN_VAR olmuş satır başka sonuca dönmez ve kabul_ani değişmez.",
    "kesintisiz_son_sira, 1'den o sayıya kadar her sıranın defterde bulunduğu en büyük sayıdır ve en_buyuk_sira'yı aşmaz.",
    "Bir kurulumun kişisi açılışta yazılır ve değişmez; başka kişinin oturumu ya da imzasıyla gelen istek o kurulum için hiçbir öğe işletmez. Bir kişinin en çok 20 kurulum satırı olur.",
    "Bir gönderim her zaman ilerler: işleme bütçesi dolarsa işlenen öğeler kalır, kalanlar TEKRAR_DENE alır; bütçe aşımı hiçbir zaman bütün paketi geri almaz.",
    "Bir gönderim tek bağlantıda tek veritabanı işlemidir; 4xx ya da 5xx cevapta ne defterde ne öğe sahiplerinin tablolarında değişiklik kalır, 200 cevaptaki her sonuç işlenmiştir.",
    "Hızlı yolda işlem başına geri dönüş noktası sayısı paketteki ardışık öğe türü grubu sayısını aşmaz; öğe başına geri dönüş noktası yalnız bir grup hata verince açılır.",
    "Öğrencinin yoklama gönderimi degisiklik_sayaci satırını kilitlemez; sayaç yalnız telefona inen bir satır yazan işlemde alınır.",
    "Telefona inen bir satırın sürümü, onu yazan işlem bitmeden hiçbir okuyucunun gördüğü sayaç değerinden küçük ya da eşit olamaz; okuyucu imleci yazılmamış bir sürümün üstüne geçmez.",
    "Öğrenciye inen hiçbir satırda ve öğrenci bölümünde başka öğrencinin adı, numarası ya da kaydı bulunmaz.",
    "Baştan indirme gönderme kuyruğunu etkilemez: aynı istekteki sonSira baştan indirmeyle değişmez.",
    "Kayıt gönderme ucu hiçbir uygulama sürümüne kapanmaz; bilinmeyen öğe türü atılmaz, TEKRAR_DENE alır ve defterde saklanır.",
    "telefona_ulasti_ani yalnız telefonun imleçle sakladığını bildirdiği öğrenci durum sürümüne kadar sunulmuş karar sürümlerine ve bir kez yazılır.",
    "Kural taşıyan anlar (ulaşma, son temas, sunum, teslim, gönderme süresi sonu) saat arayüzünden gelir; modülün SQL kodunda now(), TypeScript kodunda Date.now() yoktur.",
    "Ulaşma makbuzu yalnız aynı kurulum, sıra, öğe kimliği ve gövde baytları için geçer; geçerli makbuz ulaşma anını ileri almaz, ilk anı geri getirir.",
    "D06 öğe gövdesini ayrıştırmaz ve yeniden biçimlendirmez; gövde, ilk çapa ve ikinci çapa metni gelen değerlerle aynen işleyiciye geçer.",
    "Numara, isim, gövde metni, imleç, oturum anahtarı ve ulaşma makbuzu loga ve iş verisine girmez; loglarda kurulum ve kişi iç kimliği, rota kalıbı, sonuç ve gerekçe kodu bulunur."
  ],

  exports: [
    {
      name: "surumAl",
      signature: "surumAl(tx: Islem): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Telefona inen bir tabloya yazan işlem, inen satırlarını yazdıktan sonra işlemin son adımlarından biri olarak çağırır (sıra: satırlar, iş kuyruğu, sayaç; D03-A10). degisiklik_sayaci satırını işlem sonuna kadar kilitleyip bir artırır ve yeni sürümü döner; çağıran bu sürümü aynı işlemde yazdığı inen satırların sürüm sütununa tek UPDATE ile koyar ve sayaçtan sonra yeni satır kilidi almaz. Her çağrı yeni sürüm verir. Başka modül çağırmaz."
    },
    {
      name: "ogeTuruKaydet",
      signature:
        "ogeTuruKaydet(tur: OgeTuru, isleyici: OgeIsleyici): void; OgeIsleyici = { roller: readonly ('OGRENCI' | 'PERSONEL')[]; oturumGerekli: boolean; govdeEnBuyukBayt: number; ayrintiSemasi?: z.ZodType } & ({ isle(tx: Islem, oge: GelenOge, baglam: PaketBaglami): Promise<OgeSonucu> } | { isleToplu(tx: Islem, ogeler: readonly GelenOge[], baglam: PaketBaglami): Promise<readonly OgeSonucu[]> })",
      purpose:
        "Öğe türünün sahibi eklentisi yüklenirken bir kez kaydolur; aynı tür ikinci kez kaydolursa açılış durur. Sahipler: yoklama_kaydi, makbuz_okutmasi (D05); pencere_suresi, erken_kapatma (D04); kafa_sayisi (D07); elle_ekleme, sorun_bildirimi (D09); gosterim_kaydi (D11); telefon_sayaci (D15). İşleyici ardışık aynı tür öğeleri sıra düzeninde alır (isleToplu bir çağrıda, isle tek tek), aynı uzunlukta ve sırada sonuç döner, beklenen hiçbir durumda fırlatmaz, hızlı yolda öğe başına SAVEPOINT açmaz."
    },
    {
      name: "indirmeKaynagiKaydet",
      signature:
        "indirmeKaynagiKaydet(ad: string, kaynak: GenelKaynak | KapsamKaynagi | OgrenciKaynagi): void  // tipler packages/contracts/src/esitleme.ts",
      purpose:
        "Telefona inen veri kaynakları kaydolur: genel kaynaklar D02 (dersler, ders saatleri, oturumlar, tatiller, kilit), D03 (liste satırları), D04 (pencereler); kapsam kaynakları D03 (öğrenci) ve D02 (personel); öğrenci kaynakları D05 (kayıtlar ve kararlar), D08 (devam durumu), D09 (düzeltmeler ve sorun bildirimleri). Ad cevaptaki anahtardır, tekildir; çift kayıt açılışı durdurur."
    },
    {
      name: "ogrenciDurumuDegisti",
      signature: "ogrenciDurumuDegisti(tx: Islem, ogrenciId: KisiId): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Öğrencinin kendi verisini (kayıt, karar, düzeltme, sorun bildirimi, devam durumu) değiştiren her işlem aynı işlemde çağırır. Öğrencinin satırını kilitleyip sürümü bir artırır (satır yoksa 1 ile açar) ve yeni sürümü döner; çağıran bu sürümü kendi satırına yazar ki kaynağı 'şu sürümden beri' sorusunu cevaplayabilsin. Başka modül çağırmaz."
    },
    {
      name: "gondermeSuresiSonu",
      signature:
        "gondermeSuresiSonu(oturum: { bitisAni: Date }, birimDonemi: { devamsizlikSonGunu: string /* YYYY-MM-DD, İstanbul günü */ }): Date",
      purpose:
        "Oturumun gönderme süresinin dışlayıcı sonu: en erken(dersin bitiş anı + 7 x 86.400.000 ms, devamsızlık işleme son gününden sonraki günün 00:00 Europe/Istanbul anı). Ulaşma anı bu andan küçükse süre içindedir. Hesap packages/core/src/esitleme/gonderme-suresi.ts'te saf; İstanbul gün sonu infra/saat'in istanbulGunSonuAni yardımcısıyla. D04, D07, D09 ve D10 aynı işlevi kullanır."
    },
    {
      name: "kurulumSonTemasi",
      signature: "kurulumSonTemasi(tx: Islem, kisiId: KisiId): Promise<{ sonTemasAni: Date | null; bekleyenOgeSayisi: number }>",
      purpose:
        "Kişinin bütün kurulumları arasında en son doğrulanmış temasın anı ve o temasta bildirilen sonuçlanmamış öğe sayısı; hiç temas yoksa { null, 0 }. KARAR BEKLİYOR hesabı (D08, D10) için; kural onların."
    },
    {
      name: "kararTeslimAni",
      signature: "kararTeslimAni(tx: Islem, kayitAnahtari: { donemId: DonemId; kayitId: KayitId }, kararSurumu: number): Promise<Date | null>",
      purpose:
        "Kaydın verilen karar sürümünün öğrencinin telefonuna ulaştığı an; sunulmamış ya da onaylanmamışsa null. Sorun bildirme süresinin (3 gün) başı (D09)."
    }
  ],

  files: [
    "apps/server/src/modules/esitleme/index.ts",
    "apps/server/src/modules/esitleme/yaprak.ts",
    "apps/server/src/modules/esitleme/tablolar.ts",
    "apps/server/src/modules/esitleme/eklenti.ts",
    "apps/server/src/modules/esitleme/kayitlar.ts",
    "apps/server/src/modules/esitleme/kimlik-cozumu.ts",
    "apps/server/src/modules/esitleme/ikinci-capa.ts",
    "apps/server/src/modules/esitleme/gonderim.ts",
    "apps/server/src/modules/esitleme/dagitici.ts",
    "apps/server/src/modules/esitleme/defter.ts",
    "apps/server/src/modules/esitleme/kurulum.ts",
    "apps/server/src/modules/esitleme/ulasma-makbuzu.ts",
    "apps/server/src/modules/esitleme/indirme.ts",
    "apps/server/src/modules/esitleme/teslim.ts",
    "apps/server/src/modules/esitleme/saklama.ts",
    "apps/server/src/modules/esitleme/iz.ts",
    "apps/server/src/jobs/esitleme/index.ts",
    "apps/server/src/jobs/esitleme/sira-boslugu-raporu.ts",
    "packages/contracts/src/esitleme.ts",
    "packages/core/src/esitleme/index.ts",
    "packages/core/src/esitleme/imlec.ts",
    "packages/core/src/esitleme/imlec.test.ts",
    "packages/core/src/esitleme/su-seviyesi.ts",
    "packages/core/src/esitleme/su-seviyesi.test.ts",
    "packages/core/src/esitleme/sayfa.ts",
    "packages/core/src/esitleme/sayfa.test.ts",
    "packages/core/src/esitleme/gonderme-suresi.ts",
    "packages/core/src/esitleme/gonderme-suresi.test.ts",
    "packages/core/src/esitleme/ikinci-capa-metni.ts",
    "packages/core/src/esitleme/ikinci-capa-metni.test.ts",
    "packages/core/src/esitleme/protokol.ts",
    "packages/core/src/esitleme/protokol.test.ts",
    "apps/server/test/features/esitleme/gonderim.feature",
    "apps/server/test/features/esitleme/gonderim-kimlik.feature",
    "apps/server/test/features/esitleme/ikinci-capa.feature",
    "apps/server/test/features/esitleme/dagitim-hatalari.feature",
    "apps/server/test/features/esitleme/indirme.feature",
    "apps/server/test/features/esitleme/kapsam.feature",
    "apps/server/test/features/esitleme/sayac-eszamanlilik.feature",
    "apps/server/test/features/esitleme/ogrenci-durumu.feature",
    "apps/server/test/features/esitleme/yedekten-donus.feature",
    "apps/server/test/features/esitleme/son-temas.feature",
    "apps/server/test/features/esitleme/sira-boslugu-raporu.feature",
    "apps/server/test/features/esitleme/gonderim-durum-makinesi.feature",
    "apps/server/test/features/esitleme/sozlesme.feature",
    "apps/server/test/steps/esitleme/gonderim-adimlari.ts",
    "apps/server/test/steps/esitleme/indirme-adimlari.ts",
    "apps/server/test/steps/esitleme/ogrenci-durumu-adimlari.ts",
    "apps/server/test/steps/esitleme/yedekten-donus-adimlari.ts",
    "apps/server/test/steps/esitleme/durum-makinesi-adimlari.ts",
    "apps/server/test/steps/esitleme/sozlesme-adimlari.ts",
    "apps/server/test/steps/esitleme/is-adimlari.ts",
    "apps/server/test/support/kurucular/esitleme.ts"
  ],

  tests: [
    // behavior: gönderim
    { name: "200 öğelik paket tek işlemde işlenir", kind: "behavior", asserts: "Her öğeye istekteki sırayla tek sonuç döner, (sira, ogeKimligi) birebir; sonSira 200; defterde 200 satır; sahte işleyici öğeleri ardışık aynı tür grupları halinde, sıra düzeninde alır." },
    { name: "Aynı paket ardışık iki kez gönderilir", kind: "behavior", asserts: "İkinci cevapta KABUL'lerin yerini ZATEN_VAR alır ve ulaşma anı ilk anla aynıdır; defter satırının sonucu ve kabul_ani değişmez, gorulme_sayisi 2; işleyici tablosunda öğe tek." },
    { name: "Aynı paket aynı anda iki kez gönderilir", kind: "behavior", asserts: "İki istek kurulum satırı kilidinde sıraya girer; her öğe sahibinin tablosunda tam bir kez; öğe başına biri KABUL, öbürü ZATEN_VAR." },
    { name: "Bozuk öğe paketi düşürmez", kind: "behavior", asserts: "199 geçerli öğe ve UUIDv7 olmayan 1 öğe: HTTP 200, bozuk öğe RET ESITLEME_OGE_GECERSIZ ve defterde, ötekiler KABUL. Zemin kontrolü: 200 geçerli öğenin hepsi KABUL." },
    { name: "Bilinmeyen öğe türü atılmaz", kind: "behavior", asserts: "TEKRAR_DENE, ESITLEME_TUR_BILINMIYOR, beklemeSaniye 3600; defterde saklanır, sonSira üstünden geçer." },
    { name: "Aynı sıra başka öğeyle gelir", kind: "behavior", asserts: "RET ESITLEME_SIRA_CAKISMASI; ilk defter satırı ve işleyici tablosu değişmez; çakışan öğe deftere yazılmaz." },
    { name: "Gövde sınırı ve öğe sayısı", kind: "behavior", asserts: "200 öğelik en büyük gerçekçi paket 200 döner; 1 MiB'ı 1 bayt aşan istek 413; 201 öğe 400; türün govdeEnBuyukBayt sınırını aşan tek öğe yalnız kendisi RET ESITLEME_OGE_GECERSIZ alır." },
    { name: "Yerel ret bildirimi su seviyesini ilerletir", kind: "behavior", asserts: "yerelRetler ile bildirilen sıra RET ESITLEME_YEREL_RET yazılır, sonSira üstünden geçer; aynı sıradaki KABUL satırına dokunulmaz (kontrol)." },
    { name: "Hiçbir uygulama sürümüne kapanmaz", kind: "behavior", asserts: "En düşük sürümün altındaki X-Uygulama-Surumu ile ve sürüm başlıklarının hiçbiri yokken gönderim işlenir; geçersiz başlık değerleri kurulum satırına boş yazılır." },
    // behavior: kimlik
    { name: "Oturumsuz ve imzasız gönderim reddedilir", kind: "behavior", asserts: "401 ESITLEME_KIMLIK_YOK; kurulumlar ve defterde satır açılmaz. Pozitif kontrol: aynı paket geçerli oturumla 200." },
    { name: "Cihaz değişiminden sonra eski telefonun bekleyen kayıtları ulaşır", kind: "behavior", asserts: "Oturum kapalı, paket pasif cihaz anahtarıyla imzalı: yoklama_kaydi işleyiciye gider; sorun_bildirimi TEKRAR_DENE ESITLEME_OTURUM_GEREKLI; HTTP 200." },
    { name: "Hoca oturumu bitince işler silinmez", kind: "behavior", asserts: "Süresi dolmuş oturumla 401 ESITLEME_KIMLIK_YOK, defter değişmez; yeniden girişten sonra aynı öğeler KABUL alır." },
    { name: "Rolü uymayan öğe", kind: "behavior", asserts: "Öğrenci oturumuyla gelen pencere_suresi RET ESITLEME_YETKI_YOK; aynı paketteki yoklama_kaydi etkilenmez." },
    { name: "Kişi uyuşmazlığı", kind: "behavior", asserts: "Oturum ile paket imzası farklı kişilere aitse ya da kurulum başka kişinin kurulumuysa 401 ESITLEME_KIMLIK_UYUSMUYOR; hiçbir öğe işlenmez." },
    { name: "Kurulum kilidi beklenemezse", kind: "behavior", asserts: "Aynı kurulumun satırı 2 saniyeden uzun kilitli tutulunca 503 ESITLEME_KURULUM_MESGUL ve Retry-After 5; hiçbir satır yazılmaz." },
    { name: "Kişi başına kurulum sınırı", kind: "behavior", asserts: "20 kurulumu olan kişinin 21. kurulum kimliğiyle gönderimi ve indirmesi 403 ESITLEME_KURULUM_SINIRI, satır açılmaz; var olan 20 kurulumu çalışmayı sürdürür (kontrol)." },
    { name: "Zaman bütçesi kısmi sonuç verir", kind: "behavior", asserts: "Sahte işleyici parça başına 3 saniye beklerken 200 öğelik paket: ilk parçalar işlenir ve kalır, bütçeden sonraki öğeler işleyiciye hiç verilmeden TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI alır; cevap 25 saniyeden önce döner; aynı paket yeniden gönderilince işlenenler ZATEN_VAR, kalanlar ilerler." },
    // behavior: ikinci çapa ve dağıtım
    { name: "İkinci çapa bağlamı", kind: "behavior", asserts: "Geçerli imza: işleyici bağlamında VAR, belge ve olaydanBelgeyeMs aynen; tek baytı değişmiş metin, başka kurulumun ya da paketin metni ve öğrencide 'o' türü: YOK, yokNedeni paket_imzasiz; listede olmayan öğe: YOK gonderilmedi; ikinciCapa null ve neden esitleme_bozuk: YOK esitleme_bozuk; personel oturumunda 'o': VAR." },
    { name: "İşleyicide kısıt hatası yalnız o öğeyi düşürür", kind: "behavior", asserts: "Grupta bir öğe kısıt ihlali: o RET ESITLEME_KISIT_IHLALI, gruptaki öbürleri KABUL; hızlı yolda tek SAVEPOINT, yedek yolda öğe başına SAVEPOINT (sorgu günlüğünden sayılır)." },
    { name: "Geçici çakışma yalnız grubu bekletir", kind: "behavior", asserts: "İşleyicide kilitlenme (40P01) ya da kilit zaman aşımı (55P03): grubun öğeleri TEKRAR_DENE ESITLEME_GECICI_CAKISMA; öbür gruplar KABUL, işlem sürer." },
    { name: "İşleyici sonuç sözleşmesi", kind: "behavior", asserts: "Sonuç sayısı ya da sırası uymayan işleyicinin grubu geri alınır ve öğeler tek tek denenir; yine uymazsa TEKRAR_DENE ESITLEME_ISLEYICI_HATASI, beklemeSaniye 600." },
    { name: "Ulaşma makbuzu başka öğeye geçmez", kind: "behavior", asserts: "Gövdesi bir bayt değişmiş, başka sıradaki ya da başka kurulumdaki öğeye takılan makbuz yok sayılır, ulaşma anı paketin anı olur; değişmemiş öğede makbuzdaki an kullanılır." },
    { name: "Cevap başlıkları", kind: "behavior", asserts: "İki uçta Cache-Control: no-store; eşitleme sağlamken X-Saat-Belgesi var, bozukken yok ve gönderim yine işlenir." },
    { name: "Hız sınırı kuruluma bağlı", kind: "behavior", asserts: "Aynı kurulumdan dakikada 31. gönderim 429 ve Retry-After; başka kurulumun istekleri etkilenmez." },
    // behavior: indirme
    { name: "Öğrenciye yalnız kendi verisi iner", kind: "behavior", asserts: "İmleçsiz indirmede bastanIndir true; tablolar yalnız öğrencinin şubelerinin ders, ders saati, oturum, pencere, tatil, kilit satırları ve kendi liste satırı; başka öğrencinin numarası ve adı cevabın hiçbir yerinde geçmez. Pozitif kontrol: aynı tohumla hocanın cevabında geçer." },
    { name: "Artımlı indirme", kind: "behavior", asserts: "İmleçten sonra değişen satır iner, değişmeyen inmez; silinen satır silindi true ve veri null ile iner; sonSira her cevapta döner." },
    { name: "Baştan indir nedenleri", kind: "behavior", asserts: "Nesil değişti, imleç sayaçtan ileri, en_eski_gecerli_surum altında, bozuk imleç, başka hesabın imleci, yapı sürümü değişti: her birinde 200 ve bastanIndir true; sonSira değişmez." },
    { name: "Kapsam değişince baştan indir", kind: "behavior", asserts: "Derse sonradan eklenen öğrencinin sonraki indirmesi bastanIndir true ve dersin bütün satırlarını taşır; dersten alınan hocanın sonraki tam indirmesinde o dersin listesi yok." },
    { name: "Tam indirme kendi kapsam satırı yüzünden yeniden başlamaz", kind: "behavior", asserts: "Öğrencinin liste satırının sürümü ilk sayfanın üst sürümünden büyükken adet 100 ile çok sayfalı tam indirme her sayfada ilerler ve devamiVar false ile biter; ikinci sayfada bastanIndir false. Kontrol: kapsamSurumu'ndan sonra öğrenci yeni şubeye eklenince sonraki istek bastanIndir true." },
    { name: "Sayfalar sürüm sınırında kesilir", kind: "behavior", asserts: "adet 100 ile çok sayfalı indirmede aynı sürümün satırları iki sayfaya bölünmez; sayfaların birleşimi tek seferde indirilenle aynı; 300 satırlık tek sürüm tek sayfada gelir." },
    { name: "Eşzamanlı yazmada değişiklik atlanmaz", kind: "behavior", asserts: "Sürüm v'yi alan işlem açıkken v+1 alınamaz; iki yazıcı ve bir okuyucuyla zorlanmış zamanlamada okuyucunun imleci bitmemiş sürümün üstüne geçmez ve her değişiklik bir sayfada görünür." },
    { name: "Öğrenci gönderimi sayacı kilitlemez", kind: "behavior", asserts: "200 yoklama öğelik gönderim işlemi açıkken başka işlem degisiklik_sayaci satırını beklemeden artırır." },
    // behavior: öğrenci durumu, temas, saklama, iş
    { name: "Karar teslimi onayla yazılır", kind: "behavior", asserts: "Karar değişince öğrenci bölümü iner ve satır SUNULDU olur; sonraki istekteki imleç öğrenci sürümünü taşıyınca telefona_ulasti_ani = son sunum anı; cevap kaybolursa (imleç saklanmadı) yazılmaz, sonraki sunumun anıyla yazılır." },
    { name: "Sunulmamış karar sürümünün teslim anı yok", kind: "behavior", asserts: "kararTeslimAni sunulmamış ya da onaylanmamış sürüm için null, onaylı sürüm için tek ve değişmeyen an." },
    { name: "Son temas ve bekleyen öğe", kind: "behavior", asserts: "Gönderim ve indirme son_temas_ani'yi saat arayüzünden yazar; 401 ve 503 ile biten istek yazmaz; kurulumSonTemasi kişinin en son temasını ve o temastaki bekleyen sayısını verir." },
    { name: "Yedekten dönüşte makbuzlu kayıt kaybolmaz", kind: "behavior", asserts: "Defter, kurulum su seviyesi ve kayıtlar son dakikaların öncesine geri sarılınca sonraki cevapta sonSira düşer; telefon kuralı (packages/core) üstteki ULASTI öğeleri bir kez yeniden gönderir; her makbuzlu kayıt sahibinin tablosunda tam bir kez ve ulaşma anı makbuzdaki ilk an." },
    { name: "Hesap silinince D06 satırları silinir", kind: "behavior", asserts: "Saklama işleyicisi kişinin kurulumlar, defter, öğrenci sürümü ve karar teslimi satırlarını siler; başka kişinin satırlarına dokunmaz (kontrol)." },
    { name: "sira_boslugu_raporu boşlukları bulur ve eskiyi temizler", kind: "behavior", asserts: "Boşluklu kurulumda acik_bosluk_sayisi ve ilk_eksik_sira doğru, boşluksuz kurulumda sıfır (kontrol), kapanan boşluk sıfırlanır; su seviyesinin altında ve 401 günlük satır silinir, 399 günlük ve su seviyesinin üstündeki satır kalır (kontrol); aynı gün iki kez çalışınca aynı sonuç; log satırında numara ve isim yok." },
    { name: "Teyitsiz öğrencinin kapsam bağlamı", kind: "behavior", asserts: "Teyitsiz öğrencinin indirmesinde kapsam kaynağına teyitli false ve numara verilir; sahte liste kaynağı adı bu bayrakla siler ve cevapta ad yok. Kontrol: teyitli öğrencide kendi adı iner." },
    // property
    { name: "Gönderim durum makinesi", kind: "property", asserts: "fast-check, deneme sayısı açıkça 200: rastgele en çok 200'lük paketler, aynı paketin eşzamanlı iki kez gönderimi, paket sırasının bozulması, yarıda kalan gönderim (işlem geri alınır), öğe düzeyinde TEKRAR_DENE ve yedekten dönüş (son satırlar silinir); telefon tarafı packages/core/src/esitleme/protokol.ts ile sürülür. Değişmez: ULASTI olan her öğe sahibinin tablosunda tam bir kez, defterde KABUL ya da ZATEN_VAR (teknik.html#testler-kalite)." },
    { name: "Su seviyesi hesabı", kind: "property", asserts: "Rastgele varış sırasında kesintisizSonSira en büyük n'dir ve 1..n'nin hepsi vardır; tekrar varış sonucu değiştirmez; geri sarma dışında azalmaz." },
    { name: "İmleç kodlaması", kind: "property", asserts: "Kodla ve çöz birbirinin tersi; 64 bitlik sistem kimliği kayıpsız; genelSurum'u kapsamSurumu'ndan büyük imleç tanınmaz; rastgele metin hiç fırlatmaz, tanınmaz sonucu verir." },
    { name: "Sayfa kesme", kind: "property", asserts: "Rastgele sürüm dağılımında sayfa üst sürümü kesilen kaynakların sınırlarının en küçüğü; sayfa birleşimi tam küme; hiçbir sürüm iki sayfaya bölünmez; her sayfa ilerler." },
    { name: "Gönderme süresi sonu", kind: "property", asserts: "Tablo: 7 gün sınırı ve son gün sınırı, son günün 23:59:59.999'u içeride, ertesi gün 00:00 dışarıda; TZ=UTC ve TZ=Europe/Istanbul altında aynı sonuç; sonuç iki sınırdan büyük olmaz." },
    { name: "İkinci çapa metni", kind: "property", asserts: "Kur ve çöz birbirinin tersi; imza metnin ASCII baytları üzerinde; metnin tek baytı değişince doğrulama başarısız." },
    { name: "Ulaşma makbuzu", kind: "property", asserts: "Kurulum, sıra, öğe kimliği, gövde özeti, an ya da kid'den biri değişince doğrulama başarısız; listede duran eski kid ile üretilen makbuz geçer, listeden çıkan geçmez." },
    { name: "Telefon protokol kuralları", kind: "property", asserts: "yenidenGonderilecekler sonSira'dan büyük ULASTI ve RET öğelerini bir kez seçer, YEREL_RET öğesini hiç seçmez (yerelRetler'e koyar); bekleme 2 saniye ile 10 dakika arasında ve beklemeSaniye'den kısa değil; paket seçimi en çok 200 öğe ve 768 KiB, artan sıra, tek kurulum; bölme sırası önce sol yarı. Rastgele 400 ve 413 dağılımında bölme sonlu sayıda istekle biter." },
    // contract
    { name: "Öğe türleri kayıtlı", kind: "contract", asserts: "Bileşik uygulamada OGE_TURLERI'nin her türü tam bir kez kayıtlı; çift kayıt açılışta hata verir; bir tür bilerek kaydedilmeyince test kırmızı." },
    { name: "Gönderim ve indirme şemaları", kind: "contract", asserts: "OpenAPI belgesinde sonuc ve gerekce alanları x-extensible-enum taşır, enum anahtarı yok; cevap şeması sunucu cevabını doğrular (serializerCompiler); 64 bitlik değerler yalnız opak imleç içinde." },
    { name: "İndirme kaynağı sözleşme denetimi", kind: "contract", asserts: "support/kurucular/esitleme.ts'teki yardımcı her kayıtlı kaynakta: satırlar sürüm sırasında, silindi satırda veri null, öğrenci rolünde başka öğrencinin verisi yok, aynı girdiyle aynı sonuç. Sahip modüller kendi testlerinde çağırır." },
    { name: "Tablo kısıtları sözleşmeyle aynı", kind: "contract", asserts: "CHECK değer listeleri OGE_SONUCLARI ve rol sabitlerinden; D12'nin şema testi eşleşmeyi denetler; sabitten bir değer bilerek silinince test kırmızı." },
    { name: "Modül sınırı", kind: "contract", asserts: "Başka modül yalnız modules/esitleme/index.ts ve yaprak.ts'i içe aktarır; modules/esitleme yalnız D01, D12 ve D13 dış yüzlerini ve infra/saat'i içe aktarır, öğe ve kaynak sahiplerini içe aktarmaz; jobs/esitleme yalnız D14.isTanimla'yı kullanır; yaprak.ts başka modül içe aktarmaz (Biome noPrivateImports ve dependency-cruiser)." },
    // load
    { name: "Ders çıkışı yük testi", kind: "load", asserts: "k6 sabit geliş hızıyla 20.000 telefon 1 dakikada; telefon başına belge, gönderim ve gerekirse indirme; gönderim p95 1 saniye ve p99 3 saniye altında, 503 oranı yüzde 2 altında ve hepsi Retry-After'lı, 503 dışı 5xx sıfır, her makbuzlu kayıt tam bir kez (D15-B15 profili); sayaç kilidi bekleme süresi ölçülür." },
    { name: "Yedekten dönüş sonrası yük", kind: "load", asserts: "Nesil değişince 20.000 telefonun baştan indirmesi ve sonSira'ya göre yeniden gönderimi aynı eşiklerle; telefonların tam indirme süresi yazılır." },
    // mutation
    { name: "Çekirdek kuralların mutasyon testi", kind: "mutation", asserts: "Haftalık Stryker işinde packages/core/src/esitleme'nin imleç, su seviyesi, sayfa kesme, gönderme süresi, ikinci çapa metni ve protokol mutantları öldürülür (eşik D15'in); her değişmez testi bir kez bilerek bozulup kırmızıya döndüğü görülür, dosya md5 ile geri yazılır." }
  ]
};

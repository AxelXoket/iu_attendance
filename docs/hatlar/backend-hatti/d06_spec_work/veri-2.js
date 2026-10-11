// D06 spec data, part 2: state machines, invariants, exports, files, tests.
module.exports = {
  state_machines: [
    {
      name: "Defter satırı (öğe sonucu)",
      states: ["YOK", "TEKRAR_DENE", "RET", "KABUL", "ZATEN_VAR"],
      transitions: [
        { from: "YOK", to: "KABUL", by: "öğe işleyicisi", when: "Öğe ilk kez geldi, öğe türünün modülü kabul edip sakladı." },
        { from: "YOK", to: "ZATEN_VAR", by: "öğe işleyicisi", when: "Öğe başka yoldan zaten ulaşmıştı (ör. aynı kayıt önce makbuz okutmasıyla geldi); kabul_ani öğe türünün modülünün sakladığı ilk ulaşma anıdır." },
        { from: "YOK", to: "RET", by: "D06 ya da öğe işleyicisi", when: "Zarf geçersiz, rol uymuyor, oturum isteyen türde imzalayan cihaz kapanmış (ESITLEME_OTURUM_KAPALI), beklenmeyen kısıt hatası ya da öğe türünün modülü öğeyi saklamadan reddetti; yerelRetler ile bildirilen öğe de RET ESITLEME_YEREL_RET yazılır. Aynı istekte ikinci kez gelen sıra deftere hiç yazılmaz, yalnız cevapta RET ESITLEME_SIRA_CAKISMASI alır." },
        { from: "YOK", to: "TEKRAR_DENE", by: "D06 ya da öğe işleyicisi", when: "Tür kayıtlı değil, oturum gerekli, geçici çakışma, işleyici hatası, zaman bütçesi ya da öğe türünün modülünün geçici gerekçesi (ör. saati yalnız ikinci çapayla kurulabilen kayıtta ikinci çapa yok; işleyicinin danismaKilidiDene ile alamadığı yeni anahtar). Sunucu tarafı dört nedende sunucu_bekletme_ani yazılır." },
        { from: "TEKRAR_DENE", to: "KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE", by: "öğe işleyicisi", when: "Öğe bekleme süresinden sonra yeniden geldi; yeniden değerlendirilir. Gövde özeti tutuyor ve sunucu_bekletme_ani doluysa işleyiciye ulaşma anı olarak o an verilir." },
        { from: "RET", to: "KABUL, ZATEN_VAR ya da RET", by: "öğe işleyicisi", when: "Öğe uygulama ya da uzaktan güncelleme değişince ya da sonSira gerileyip öğenin altına düşünce bir kez yeniden geldi; sonuç önbellekten değil yeniden değerlendirmeden gelir." },
        { from: "KABUL", to: "KABUL", by: "D06", when: "Aynı öğe yeniden geldi: cevap ZATEN_VAR, satırın sonucu ve kabul_ani değişmez, gorulme_sayisi artar. ZATEN_VAR satırı da aynı kuralla kalır." }
      ]
    },
    {
      name: "Telefondaki kuyruk öğesi (D06 protokolü, uygulaması apps/mobile)",
      states: ["BEKLIYOR", "GONDERILIYOR", "ULASTI", "RET", "YEREL_RET"],
      transitions: [
        { from: "BEKLIYOR", to: "GONDERILIYOR", by: "telefon", when: "Kurulum beklemede değil ve öğenin sırası geldi: hiç cevap almamış öğeler en küçük sıradan başlayarak atlanmadan, TEKRAR_DENE almış öğeler kendi bekleme süresi dolunca; paket en çok 200 öğe ve 768 KiB. Yoklama anında tetiklenen ilk gönderim 0 ile N saniye rastgele kaydırılır (plan.html#kararlar-yeniden-deneme)." },
        { from: "GONDERILIYOR", to: "ULASTI", by: "telefon", when: "Sonuç KABUL ya da ZATEN_VAR; ulaşma anı ve ulaşma makbuzu saklanır, makbuz 'Sunucuya ulaştı' olur." },
        { from: "GONDERILIYOR", to: "RET", by: "telefon", when: "Sonuç RET; makbuz 'Telefonda kayıtlı, gönderilmedi' kalır, günlük sayaçlara yazılır." },
        { from: "GONDERILIYOR", to: "BEKLIYOR", by: "telefon", when: "Öğe sonucu TEKRAR_DENE ya da bilinmeyen sonuç: yalnız bu öğe bekler (en az beklemeSaniye, 2 saniyeden 10 dakikaya artan, rastgele kaydırılmış); öğenin defter satırı vardır, sonraki paketler onu atlayabilir." },
        { from: "GONDERILIYOR", to: "BEKLIYOR", by: "telefon", when: "Paket düzeyinde ağ hatası, zaman aşımı, beklenmeyen biçim, 408, 429 ya da 5xx: öğeler değil kurulum bekler (2 saniyeden 10 dakikaya, rastgele, Retry-After en az); öğeler cevap almamış sayılır, sonraki paket en küçük cevapsız sıradan başlar. Bekleme sırasında oluşan öğe tek başına gitmez, kurulumla birlikte bekler." },
        { from: "GONDERILIYOR", to: "YEREL_RET", by: "telefon", when: "Bölünen paket tek öğeye indi ve yine 413 ya da alan yolu ogeler'i gösteren 400 aldı; sonraki pakette yerelRetler ile bildirilir." },
        { from: "ULASTI", to: "BEKLIYOR", by: "telefon", when: "Cevaptaki sonSira kurulum için saklanan en büyük sonSira'dan küçük (gerileme: sunucu yedekten döndü) ve öğenin sırasından küçük; o gerileme için bir kez, ulaşma makbuzuyla yeniden gönderilir." },
        { from: "RET", to: "BEKLIYOR", by: "telefon", when: "runtimeVersion ya da updateId değişti, ya da gerilemede sonSira öğenin sırasından küçük; her olay için bir kez." },
        { from: "YEREL_RET", to: "BEKLIYOR", by: "telefon", when: "Yalnız runtimeVersion ya da updateId değişince, bir kez. Gerilemede sonSira öğenin sırasından küçükse öğe gönderilmez, sonraki pakette yerelRetler ile yeniden bildirilir (yeniden göndermek bölme döngüsü açardı)." },
        { from: "BEKLIYOR", to: "BEKLIYOR", by: "telefon", when: "401, 403 ya da bölünmeyen öbür 4xx: bu kurulumun gönderimi durur, cihaz ya da giriş durumu gösterilir, olay günlük sayaca yazılır; öğe silinmez. 401'de yeniden girişten sonra, öbürlerinde runtimeVersion ya da updateId değişince bir kez yeniden denenir." }
      ]
    },
    {
      name: "İndirme imleci",
      states: ["YOK", "TAM_INDIRME", "GUNCEL"],
      transitions: [
        { from: "YOK", to: "TAM_INDIRME", by: "sunucu", when: "İmleçsiz istek: bastanIndir true, ilk sayfa; telefon yeni tam indirme numarasını bu sayfayla aynı yerel işlemde yazar." },
        { from: "GUNCEL ya da TAM_INDIRME", to: "TAM_INDIRME", by: "sunucu", when: "Nesil, hesap özeti (kişi ve teyit durumu) ya da yapı sürümü tutmuyor, imleç sayaçtan ileri ya da en_eski_gecerli_surum altında, imleç çözülemiyor ya da kapsam kaynağı kapsamın imleçteki kapsamSurumu'ndan sonra değiştiğini söylüyor; ilk sayfa yeniden gelir, telefon yeni tam indirme numarası açar." },
        { from: "TAM_INDIRME", to: "TAM_INDIRME", by: "telefon", when: "devamiVar true: sayfa, imleç ve sayfadaki satırlara damgalanan tam indirme numarası tek yerel işlemde yazılır, hemen sonraki sayfa istenir; uygulama yeniden başlasa da numara kalıcıdır." },
        { from: "TAM_INDIRME", to: "GUNCEL", by: "telefon", when: "devamiVar false: güncel tam indirme numarasını taşımayan program ve liste satırları silinir; gönderme kuyruğuna dokunulmaz." },
        { from: "GUNCEL", to: "GUNCEL", by: "telefon", when: "Artımlı sayfa uygulandı; gelen satırlar güncel numarayı alır." },
        { from: "GUNCEL ya da TAM_INDIRME", to: "YOK", by: "telefon", when: "Personel çıkış yaptı ya da indirmede 401 aldı: sınıf listeleri ve o hesabın imleci silinir, kuyruktaki işler kalır. 403 listeleri silmez." }
      ]
    },
    {
      name: "Karar teslimi (karar_teslimleri satırı)",
      states: ["SUNULMADI", "SUNULDU", "TELEFONA_ULASTI"],
      transitions: [
        { from: "SUNULMADI", to: "SUNULDU", by: "indirme", when: "Öğrenci bölümü bu karar sürümünü telefona gönderdi: satır açılır, sunulan_durum_surumu, sunulan_kurulum_id ve iki sunum anı yazılır." },
        { from: "SUNULDU", to: "SUNULDU", by: "indirme", when: "Onay gelmeden yeniden sunuldu (önceki cevap kaybolmuş olabilir): son_sunulma_ani, sunulan_durum_surumu ve sunulan_kurulum_id ilerler." },
        { from: "SUNULDU", to: "TELEFONA_ULASTI", by: "gönderim ya da indirme", when: "İstekteki geçerli imlecin öğrenci sürümü sunulan_durum_surumu'na eşit ya da büyük: telefona_ulasti_ani = son_sunulma_ani, onay_ani = istek anı; bir daha değişmez." }
      ]
    }
  ],

  invariants: [
    "Gönderim cevabındaki sonuçlar istekteki öğelerle aynı sırada ve birebirdir; (sira, ogeKimligi) çiftleri eşleşmeyen cevap telefonda hiçbir öğeyi ULASTI yapmaz (D13-B21).",
    "(kurulum, sıra) için defterde en çok bir satır vardır; KABUL ya da ZATEN_VAR olmuş satır başka sonuca dönmez ve kabul_ani değişmez. Bir istekte aynı sıra iki kez gelirse yalnız ilki işlenir.",
    "kesintisiz_son_sira, 1'den o sayıya kadar her sıranın defterde bulunduğu en büyük sayıdır ve en_buyuk_sira'yı aşmaz. Gönderim su seviyesini ilk_eksik_sira'ya ya da üstüne taşıyınca boşluk alanlarını aynı UPDATE'te sıfırlar; izleme sütunu hiçbir gönderimi durduramaz.",
    "Bir kurulumun kişisi açılışta yazılır ve değişmez; başka kişinin oturumu ya da imzasıyla gelen istek o kurulum için hiçbir öğe işletmez (403). Bir kişinin en çok 20 canlı kurulumu olur; sayım ve açılış kişi başına danışma kilidi altındadır. Yeni kurulum yalnız oturumla, etkin cihazın anahtarıyla ya da hesabı silinmiş kişinin anahtarıyla açılır.",
    "Bir gönderim her zaman ilerler: işleme bütçesi dolarsa işlenen öğeler kalır, kalanlar TEKRAR_DENE alır; bütçe aşımı hiçbir zaman bütün paketi geri almaz.",
    "Bir gönderimin bütün yazmaları tek veritabanı işlemindedir (kimlik kancasının salt okunur anahtar okuması tek istisna, D06-C04) ve işlem D13'ün 20 saniyelik işleyici bütçesinden kalan süreyi aşmaz (transaction_timeout = D13.kalanSureMs). Cevap nesnesi COMMIT'ten önce cevap şemasıyla doğrulanır; 4xx ya da 5xx cevapta ne defterde ne öğeleri saklayan modüllerin tablolarında değişiklik kalır, 200 cevaptaki her sonuç işlenmiştir.",
    "Hızlı yolda işlem başına geri dönüş noktası sayısı parça sayısını aşmaz: ardışık aynı tür grubu en çok 50 öğelik parçalara bölünür, parça başına bir SAVEPOINT; öğe başına geri dönüş noktası yalnız bir parça hata verince açılır.",
    "Sayaç işlemde en çok bir kez artar: damgalı işlemi kuran modül son adımda surumAl'ı bir kez çağırır ve bekleyen bütün damgalar aynı sürümle yazılır; surumAl'sız biten damgalı işlem COMMIT edilemez (D12.islemSonuKancasi). Öğrencinin yoklama gönderimi degisiklik_sayaci satırını kilitlemez. Gönderimde sayaç yalnız bir işleyici damga kaydettiyse, bütün gruplardan, defter ve kurulum yazımından sonra, işlemin son yazımı olarak alınır; sayaçtan sonra yeni satır kilidi alınmaz, damgalar yalnız işlemde zaten kilitli satırları günceller.",
    "Gönderim işleminde danışma anahtarları (bütün grupların kilitAnahtarlari kancalarından gelenler ve esitleme:kurulum_siniri:<kisiId>) tek D12.danismaKilidi çağrısıyla, hiçbir satır kilidinden ve hiçbir işleyiciden önce alınır; modülde elle pg_advisory_xact_lock yoktur.",
    "Telefona inen bir satırın sürümü, onu yazan işlem bitmeden hiçbir okuyucunun gördüğü sayaç değerinden küçük ya da eşit olamaz; okuyucu imleci yazılmamış bir sürümün üstüne geçmez.",
    "İndirmede her kaynak satırının sürümü isteğin (surumden, surumeKadar] aralığındadır; aralık dışı satır atılır ve loglanır, her sayfa ilerler.",
    "Öğrenciye inen hiçbir satırda ve öğrenci bölümünde başka öğrencinin adı, numarası ya da kaydı bulunmaz; kafa sayısı ve yapıldı öğrenciye inmez.",
    "Baştan indirme gönderme kuyruğunu etkilemez: aynı istekteki sonSira baştan indirmeyle değişmez.",
    "Telefon kurulum başına gördüğü en büyük sonSira'yı saklar; olağan akışta hiçbir öğe, kendisinden küçük sıradaki hiç cevap almamış bir öğeden önce gönderilmez. Daha küçük sonSira (gerileme) üstteki ULASTI ve RET öğelerini o gerileme için bir kez yeniden gönderir.",
    "Kayıt gönderme ucu hiçbir uygulama sürümüne kapanmaz; bilinmeyen öğe türü atılmaz, TEKRAR_DENE alır ve defterde saklanır.",
    "telefona_ulasti_ani yalnız telefonun imleçle sakladığını bildirdiği öğrenci durum sürümüne kadar sunulmuş karar sürümlerine ve bir kez yazılır.",
    "Kural taşıyan anlar (ulaşma, son temas, sunum, teslim) saat arayüzünden gelir; modülün SQL kodunda now(), TypeScript kodunda Date.now() yoktur. gondermeSuresiSonu saftır ve Intl kullanmaz.",
    "Ulaşma makbuzu yalnız aynı kurulum, sıra, öğe kimliği ve gövde baytları için geçer; geçerli makbuz ulaşma anını ileri almaz, ilk anı geri getirir; ELE_GECIRILDI durumundaki anahtarın makbuzu yok sayılır.",
    "D06 öğe gövdesini ayrıştırmaz ve yeniden biçimlendirmez; gövde, ilk çapa ve ikinci çapa metni gelen değerlerle aynen işleyiciye geçer.",
    "Numara, isim, gövde metni, imleç, oturum anahtarı ve ulaşma makbuzu loga ve iş verisine girmez; loglarda kurulum ve kişi iç kimliği, rota kalıbı, sonuç ve gerekçe kodu bulunur."
  ],

  exports: [
    {
      name: "surumAl",
      signature: "surumAl(tx: Islem): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "İşlemi kuran modül, telefona inen satırlarını, iş kuyruğunu ve öğrenci sürümünü yazdıktan sonra işlemin son adımı olarak bir kez çağırır (contracts.json ortak kural 'Danışma kilidi katmanları' sırası). UPDATE degisiklik_sayaci SET surum = surum + 1 WHERE id = 1 RETURNING surum; satır yoksa (ilk kullanım) INSERT ... VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING ve UPDATE yinelenir. Satır işlem sonuna kadar kilitli kalır; sayaç bir kez artar, işlemin bekleyen bütün damgaları (surumDamgasiIste) bu sürümle kayıt sırasıyla çağrılır ve yeni sürüm döner. Aynı işlemde ikinci çağrı sayacı yeniden artırmaz, aynı sürümü döner. Çağıran dönen sürümü yalnız işlemde zaten kilitli satırlara koyar; sayaçtan sonra yeni satır kilidi alınmaz (D06-B19). Gönderimde işlemi kuran modül D06'dır: öğe işleyicisi surumAl çağırmaz, baglam.surumlaDamgala ile damga bırakır; D06 paket sonunda, bütün gruplardan sonra bir kez çağırır. Alan modülü içe aktarmaz."
    },
    {
      name: "surumDamgasiIste",
      signature: "surumDamgasiIste(tx: Islem, damga: (surum: bigint) => Promise<void>): void  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Telefona inen satırın sürümünü işlemin sonuna bırakır (contracts.json ortak kural 'Sürüm damgası'): damga işleme bağlanır, işlemi kuran modül son adımda surumAl'ı çağırınca bütün bekleyen damgalarla aynı sürümle çağrılır. Damga yalnız işlemde zaten kilitli satırları günceller (ör. UPDATE ... SET surum = $1 WHERE id = ANY(yazilanlar)). İşlemdeki ilk bekleyen damgada D12.islemSonuKancasi(tx, denetim) kaydedilir: işlem surumAl çağrılmadan biterse denetim hata atar ve işlem geri alınır (API isteğinde 500 API_SUNUCU_HATASI, log satırında damga sayısı). surumAl'dan sonra aynı işlemde çağrılırsa hata atar. Liste en dış işleme bağlıdır (D12.islemSonuKancasi ile aynı bağ); geri alınan bir SAVEPOINT içinde kaydedilen damga düşer. PaketBaglami.surumlaDamgala gönderimde bu işleve giden kısayoldur; üretimde (D02) ve dinleyici yolunda (D04 pencereleriHesapla) aynı işlev kullanılır."
    },
    {
      name: "ogrenciDurumuDegisti",
      signature: "ogrenciDurumuDegisti(tx: Islem, ogrenciId: KisiId): Promise<bigint>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Öğrencinin kendi verisini (kayıt, karar, düzeltme, sorun bildirimi, devam durumu, hesap teyidi) değiştiren her işlem aynı işlemde, kendi satır yazımlarından ve iş kuyruğundan sonra, genel sayaçtan önce çağırır. Öğrencinin satırını kilitleyip sürümü bir artırır (satır yoksa 1 ile açar) ve yeni sürümü döner; çağıran bu sürümü kendi satırına yazar ki kaynağı 'şu sürümden beri' sorusunu cevaplayabilsin. Alan modülü içe aktarmaz."
    },
    {
      name: "kurulumSonTemasi",
      signature: "kurulumSonTemasi(tx: Islem, kisiId: KisiId): Promise<{ sonTemasAni: Date | null; bekleyenYoklamaVar: boolean }>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Kişinin bütün kurulumları arasında en son doğrulanmış temasın anı; bekleyenYoklamaVar, kişinin herhangi bir kurulumu kendi son temasında sonuçlanmamış yoklama_kaydi bildirdiyse true (telefon_sayaci gibi öbür türler sayılmaz). Hiç temas yoksa { null, false }. KARAR BEKLİYOR hesabı (D08, D10) için; kural onların, ders başına ayrım yoktur. Çok kişide kurulumSonTemaslari kullanılır."
    },
    {
      name: "kurulumSonTemaslari",
      signature: "kurulumSonTemaslari(tx: Islem, kisiIdler: readonly KisiId[]): Promise<ReadonlyMap<KisiId, { sonTemasAni: Date | null; bekleyenYoklamaVar: boolean }>>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "kurulumSonTemasi'nın toplu biçimi, tek sorgu (kurulumlar WHERE kisi_id = ANY($1), kisi_id başına toplama). Sonuç istenen her kişi için bir değer taşır; kurulumu olmayan kişi { sonTemasAni: null, bekleyenYoklamaVar: false } alır. Ders ya da kurulum başına bekleyen öğe sayısı verilmez: KARAR BEKLİYOR'un bağlantı nedeni için boolean yeterlidir (D08'in canlı hesabı bunu kullanır)."
    },
    {
      name: "kararTeslimAni",
      signature: "kararTeslimAni(tx: Islem, kayitAnahtari: { donemId: DonemId; kayitId: KayitId }, kararSurumu: KararSurumu): Promise<{ telefonaUlastiAni: Date | null; ilkSunulmaAni: Date; sonSunulmaAni: Date; sunulanKurulumSonTemasAni: Date | null } | null>  // modules/esitleme/yaprak.ts [yaprak]",
      purpose:
        "Kaydın verilen karar sürümünün teslim bilgisi: hiç sunulmadıysa ya da satır saklama süresi dolup silindiyse null; sunulduysa iki sunum anı, onaylandıysa telefona ulaştığı an, ayrıca sunumun yapıldığı kurulumun son temas anı. Sorun bildirme süresinin (3 gün) başı D09'un kuralıdır; null 'sunulmadı' demektir, onaysız sunumun nasıl sayılacağı açık nokta D06-A02."
    },
    {
      name: "ogeTuruKaydet",
      signature:
        "ogeTuruKaydet<T extends OgeTuru>(tur: T, isleyici: OgeIsleyici<T>): void; OgeIsleyici<T> = { roller: readonly ('OGRENCI' | 'PERSONEL')[]; oturumGerekli: boolean; govdeEnBuyukBayt: number; ilkCapaVar: boolean; ayrintiSemasi?: z.ZodType; kilitAnahtarlari?(tx: Islem, ogeler: readonly GelenOge[], baglam: PaketBaglami): Promise<readonly DanismaAnahtari[]> } & ({ isle(tx: Islem, oge: GelenOge<T>, baglam: PaketBaglami): Promise<OgeSonucu> } | { isleToplu(tx: Islem, ogeler: readonly GelenOge<T>[], baglam: PaketBaglami): Promise<readonly OgeSonucu[]> })  // DanismaAnahtari D12'nin: string | { anahtar: string; kip: 'paylasimli' }",
      purpose:
        "Öğe türünün modülü eklentisi yüklenirken bir kez kaydolur; aynı tür ikinci kez kaydolursa açılış durur. Bu modüller ve işleyici biçimleri Başka modüllerden beklenenler bölümünde. İşleyici ardışık aynı tür öğeleri sıra düzeninde alır (isleToplu bir çağrıda, isle tek tek), aynı uzunlukta ve sırada sonuç döner, beklenen hiçbir durumda fırlatmaz, hızlı yolda öğe başına SAVEPOINT açmaz, gövdeyi ham metinden kendisi ayrıştırır, gönderim içinde surumAl çağırmaz (baglam.surumlaDamgala kullanır); yan etki belleği (ör. bir okuma önbelleği) tek isleToplu çağrısına yereldir, çağrılar arasında taşınmaz. kilitAnahtarlari isteğe bağlıdır: grubun danışma anahtarlarını saf anahtar işlevleriyle gövdeden çıkarır (beklemez, satır kilitlemez); D06 paketin bütün gruplarının anahtarlarını kendi esitleme:kurulum_siniri:<kisiId> anahtarıyla birleştirip hiçbir grubu işlemeden önce tek D12.danismaKilidi çağrısında alır. İşleyicinin aynı anahtarlar için kendi danismaKilidi çağrısı işlemsizdir; sırada geride kalan yeni anahtarı yalnız D12.danismaKilidiDene ile alır, alamazsa öğeye kendi geçici koduyla TEKRAR_DENE döner."
    },
    {
      name: "indirmeKaynagiKaydet",
      signature:
        "indirmeKaynagiKaydet(ad: string, kaynak: GenelKaynak | KapsamKaynagi | OgrenciKaynagi): void  // tipler packages/contracts/src/esitleme.ts",
      purpose:
        "Telefona inen veri kaynakları kaydolur: genel kaynaklar D02 (dersler, ders saatleri, oturumlar, tatiller, kilit), D03 (liste satırları), D04 (pencereler); öğrenci kapsam kaynağını D03 ('ogrenci_liste_kapsami', öğrencinin silinmemiş liste satırlarının şubeleri; pasif satırın şubesi kapsamda kalır), personel kapsam kaynağını D02 (dersin hocası) kaydeder; öğrenci kaynakları D05 (kayıtlar ve kararlar), D08 (devam durumu), D09 (düzeltmeler ve sorun bildirimleri). Ad cevaptaki anahtardır, tekildir; çift kayıt ya da rol başına birden çok kapsam kaynağı açılışı durdurur."
    },
    {
      name: "gondermeSuresiSonu",
      signature:
        "gondermeSuresiSonu(oturumBitisAni: Date, kilitAni: Date | null): Date  // packages/core/src/esitleme/gonderme-suresi.ts, saf; modules/esitleme/index.ts dışa vermez",
      purpose:
        "Oturumun gönderme süresinin dışlayıcı sonu: en erken(oturumBitisAni + 7 x 86.400.000 ms, kilitAni). kilitAni D02.birimDonemiGetir'in BirimDonemiBilgisi.kilitAni değeridir (son günün ertesi 00:00 Europe/Istanbul, D02 hesaplar); birim dönemi yoksa (deneme dersi, kilitDurumu kaynak 'takvim_yok') null verilir ve sonuç ders bitişi artı 7 gündür. Ulaşma anı bu andan küçükse süre içindedir. UTC milisaniyeyle hesaplanır, Intl ve infra kullanmaz. D04, D07, D09 ve D10 packages/core/src/esitleme'den içe aktarır; D06'nın modül dosyalarını çekmez."
    },
    {
      name: "enEskiGecerliSurumuYukselt",
      signature: "enEskiGecerliSurumuYukselt(tx: Islem): Promise<{ oncekiDeger: bigint; yeniDeger: bigint }>  // modules/esitleme/en-eski-surum.ts",
      purpose:
        "Yönetim komutunun işlevi: en_eski_gecerli_surum'u güncel surum'a çıkarır (satır yoksa ilk kullanım kuralıyla açar), herkesin sonraki indirmesi baştan iner. Komut satırı girişi apps/server/src/cli/esitleme-en-eski-surum.ts (bileşim kökü): aynı işlemde D09.denetimeYaz ile 'esitleme.en_eski_surum_yukseltildi' olayı yazar (dersId taşımaz; tür ESITLEME_DENETIM_OLAYLARI'nda, giriş D09.denetimOlaylariniKaydet ile kaydeder); modules/esitleme D09'u içe aktarmaz."
    },
    {
      name: "esitlemeKimlikDinleyicisi",
      signature: "esitlemeKimlikDinleyicisi: KimlikDinleyicisi  // (tx: Islem, olay: KimlikOlayi) => Promise<void>; tipler D01'in; modules/esitleme/kimlik-dinleyicisi.ts, index.ts dışa verir",
      purpose:
        "D01.kimlikDinleyicileriniKur'a esitleme abonesi olarak bileşim kökleri verir (app.ts uygulamaKur api ve isci süreçlerinde, D12 cli/geri-yukleme, D15 cli/anahtar-uret ve cli/olay*); D01 olayı doğuran işlemde dersler aboneden sonra, projeksiyondan önce çağırır. hesap_silindi olayında kişinin karar_teslimleri, ogrenci_durum_surumleri ve kurulumlar satırlarını (gonderim_defteri cascade ile) olayı doğuran işlemde siler; öbür olaylar (giris_oturumu_kapandi, giris_oturumu_yenilendi, cihaz_kapandi, hesap_durumu_degisti) yok sayılır. Alan modülü içe aktarmaz, iş kuyruğuna koymaz, genel sayaç almaz."
    },
    {
      name: "esitlemeEklentisi",
      signature: "esitlemeEklentisi: FastifyPluginAsync<EsitlemeEklentisiSecenekleri>; EsitlemeEklentisiSecenekleri = EklentiTemelSecenekleri & { saat: Saat; log: Logger; ulasmaMakbuzu: { etkin(): GizliAnahtar; anahtar(kid: string): GizliAnahtar | null }; kimlik: { cihazAnahtariGetir; cihazGetir; kisiGetir; hesapSilindiMi; ogrenciHesabiGetir }; esitlemeSaglikliMi: () => boolean }  // modules/esitleme/eklenti.ts, index.ts dışa verir; EklentiTemelSecenekleri = { surec: 'api' | 'isci' } (D13)",
      purpose:
        "Modülün Fastify eklentisi (contracts.json ortak kural 'Birleşim'). Altyapıyı seçenekten alır, kayıt sırasında veritabanına dokunmaz. Dinleyici kayıtlarını her süreçte yapar: D12.saklamaIsleyicisiKaydet('esitleme.donem_verisi', ...); zamanlayıcısı yoktur (surec 'api' iken de kurmaz). Rotaları yalnız D13.rotalariKaydet ile ekler; setErrorHandler ve setNotFoundHandler kullanmaz. Hata kodu öneki ESITLEME_; rota düzeyi rol reddi D13'ün API_ROL_YETKISIZ'idir; yolda kaynak kimliği olmadığından kaynak düzeyi 404 (ESITLEME_BULUNAMADI) doğmaz. Seçeneklerde kimlikOlayiDinleyicisiKaydet yoktur: kimlik olayları esitlemeKimlikDinleyicisi ile gelir."
    }
  ],

  files: [
    "apps/server/src/modules/esitleme/index.ts",
    "apps/server/src/modules/esitleme/yaprak.ts",
    "apps/server/src/modules/esitleme/tablolar.ts",
    "apps/server/src/modules/esitleme/eklenti.ts",
    "apps/server/src/modules/esitleme/kayitlar.ts",
    "apps/server/src/modules/esitleme/kuyruklar.ts",
    "apps/server/src/modules/esitleme/kimlik-cozumu.ts",
    "apps/server/src/modules/esitleme/ikinci-capa.ts",
    "apps/server/src/modules/esitleme/gonderim.ts",
    "apps/server/src/modules/esitleme/dagitici.ts",
    "apps/server/src/modules/esitleme/danisma-anahtarlari.ts",
    "apps/server/src/modules/esitleme/defter.ts",
    "apps/server/src/modules/esitleme/kurulum.ts",
    "apps/server/src/modules/esitleme/ulasma-makbuzu.ts",
    "apps/server/src/modules/esitleme/indirme.ts",
    "apps/server/src/modules/esitleme/teslim.ts",
    "apps/server/src/modules/esitleme/kimlik-dinleyicisi.ts",
    "apps/server/src/modules/esitleme/saklama.ts",
    "apps/server/src/modules/esitleme/en-eski-surum.ts",
    "apps/server/src/modules/esitleme/iz.ts",
    "apps/server/src/jobs/esitleme/index.ts",
    "apps/server/src/jobs/esitleme/sira-boslugu-raporu.ts",
    "apps/server/src/cli/esitleme-en-eski-surum.ts",
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
    "packages/core/src/esitleme/makbuz-bicimi.ts",
    "packages/core/src/esitleme/makbuz-bicimi.test.ts",
    "packages/core/src/esitleme/protokol.ts",
    "packages/core/src/esitleme/protokol.test.ts",
    "apps/server/test/features/esitleme/gonderim.feature",
    "apps/server/test/features/esitleme/gonderim-kimlik.feature",
    "apps/server/test/features/esitleme/ikinci-capa.feature",
    "apps/server/test/features/esitleme/dagitim-hatalari.feature",
    "apps/server/test/features/esitleme/danisma-kilidi.feature",
    "apps/server/test/features/esitleme/surum-damgasi.feature",
    "apps/server/test/features/esitleme/indirme.feature",
    "apps/server/test/features/esitleme/kapsam.feature",
    "apps/server/test/features/esitleme/sayac-eszamanlilik.feature",
    "apps/server/test/features/esitleme/ogrenci-durumu.feature",
    "apps/server/test/features/esitleme/yedekten-donus.feature",
    "apps/server/test/features/esitleme/son-temas.feature",
    "apps/server/test/features/esitleme/hesap-silme.feature",
    "apps/server/test/features/esitleme/saklama.feature",
    "apps/server/test/features/esitleme/en-eski-surum.feature",
    "apps/server/test/features/esitleme/sira-boslugu-raporu.feature",
    "apps/server/test/features/esitleme/gonderim-durum-makinesi.feature",
    "apps/server/test/features/esitleme/sozlesme.feature",
    "apps/server/test/steps/esitleme/gonderim-adimlari.ts",
    "apps/server/test/steps/esitleme/indirme-adimlari.ts",
    "apps/server/test/steps/esitleme/ogrenci-durumu-adimlari.ts",
    "apps/server/test/steps/esitleme/surum-damgasi-adimlari.ts",
    "apps/server/test/steps/esitleme/yedekten-donus-adimlari.ts",
    "apps/server/test/steps/esitleme/durum-makinesi-adimlari.ts",
    "apps/server/test/steps/esitleme/sozlesme-adimlari.ts",
    "apps/server/test/steps/esitleme/is-adimlari.ts",
    "apps/server/test/support/kurucular/esitleme.ts"
  ],

  goc:
    "Göç tablolar.ts dosyasından drizzle-kit generate ile üretilir ve contracts.json migration_dir ile aynı yere yazılır: apps/server/migrations/<14 haneli UTC (YYYYMMDDHHMMSS)>_esitleme_<açıklama>/ (migration.sql ve snapshot.json; dosya haritasında apps/server/migrations/??????????????_esitleme_* globu D06'nındır). Göç yalnız D06'nın beş tablosuna dokunur ve satır yazmaz (D12-B34; degisiklik_sayaci satırı ilk kullanımda açılır). Göç dosyaları dosya listesine değil iş paketine yazılır; klasör kuralı ve CI göç denetimi D12'nindir. Paket birleşmeden önce ana dala yeniden dayanır; arada ana dala yeni göç klasörü girdiyse kendi klasörünü silip drizzle-kit generate ile yeniden üretir.",

  tests: [
    // behavior: gönderim
    { name: "200 öğelik paket tek işlemde işlenir", kind: "behavior", asserts: "Her öğeye istekteki sırayla tek sonuç döner, (sira, ogeKimligi) birebir; sonSira 200; defterde 200 satır; sahte işleyici öğeleri ardışık aynı tür grupları halinde, sıra düzeninde ve ham gövde metniyle alır." },
    { name: "Aynı paket ardışık iki kez gönderilir", kind: "behavior", asserts: "İkinci cevapta KABUL'lerin yerini ZATEN_VAR alır ve ulaşma anı ilk anla aynıdır; defter satırının sonucu ve kabul_ani değişmez, gorulme_sayisi 2; işleyici tablosunda öğe tek." },
    { name: "Aynı paket aynı anda iki kez gönderilir", kind: "behavior", asserts: "İki istek aynı danışma anahtarında (esitleme:kurulum_siniri) ve kurulum satırı kilidinde sıraya girer; her öğe kendi modülünün tablosunda tam bir kez; öğe başına biri KABUL, öbürü ZATEN_VAR. Aynı sıra başka öğe kimliğiyle eşzamanlı gelince ikinci paket defteri kilitten önce okumuş olsa da kilitten sonraki yeniden okuma RET ESITLEME_SIRA_CAKISMASI verir, öğe türünün modülünün tablosunda tek öğe kalır; yeniden okuma bilerek kaldırılınca senaryo kırmızı (dosya md5 ile geri yazılır)." },
    { name: "Bozuk öğe paketi düşürmez", kind: "behavior", asserts: "199 geçerli öğe ve UUIDv7 olmayan 1 öğe: HTTP 200, bozuk öğe RET ESITLEME_OGE_GECERSIZ ve defterde, ötekiler KABUL. Zemin kontrolü: 200 geçerli öğenin hepsi KABUL." },
    { name: "İstek içi sıra tekrarı ve bozuk yerel ret paketi düşürmez", kind: "behavior", asserts: "Her biri HTTP 200: (a) iki öğe aynı sırayla: ilki işlenir, ikincisi RET ESITLEME_SIRA_CAKISMASI ve deftere yazılmaz; ogeler'deki bir sırayı taşıyan yerelRetler girdisi atılır; (b) ogeKimligi UUID olmayan yerel ret defterde oge_kimligi boş, RET ESITLEME_YEREL_RET; tür 512 karakter ve sıra 0 olan girdi atılır, sayılır; (c) bekleyenYoklamaSayisi 100000 ve paketin TEKRAR_DENE yoklama öğeleri: kurulumda 100000. Kontrol: aynı istek tekrar ve bozuk girdi olmadan da 200 ve aynı geçerli satırlar." },
    { name: "Bilinmeyen öğe türü atılmaz", kind: "behavior", asserts: "TEKRAR_DENE, ESITLEME_TUR_BILINMIYOR, beklemeSaniye 3600; defterde saklanır, sunucu_bekletme_ani yazılır, sonSira üstünden geçer." },
    { name: "Aynı sıra başka öğeyle gelir", kind: "behavior", asserts: "RET ESITLEME_SIRA_CAKISMASI; ilk defter satırı ve işleyici tablosu değişmez; çakışan öğe deftere yazılmaz." },
    { name: "Gövde sınırı ve öğe sayısı", kind: "behavior", asserts: "200 öğelik en büyük gerçekçi paket 200 döner; 1 MiB'ı 1 bayt aşan istek 413 API_GOVDE_COK_BUYUK; 201 öğe 400 API_ISTEK_GECERSIZ ve alan yolu ogeler; türün govdeEnBuyukBayt sınırını aşan tek öğe ve ilkCapaVar false türde ilkCapa taşıyan öğe yalnız kendisi RET ESITLEME_OGE_GECERSIZ alır." },
    { name: "Yerel ret bildirimi su seviyesini ilerletir", kind: "behavior", asserts: "yerelRetler ile bildirilen sıra RET ESITLEME_YEREL_RET yazılır, sonSira üstünden geçer; aynı sıradaki KABUL satırına dokunulmaz (kontrol)." },
    { name: "Boşluk raporlandıktan sonra eksik sıra gelir", kind: "behavior", asserts: "Sıra 3 eksik, 1, 2, 4, 5 defterde; sira_boslugu_raporu ilk_eksik_sira 3 yazar; sonra sıra 3 gelir: HTTP 200, sonSira 5, ilk_eksik_sira boş ve acik_bosluk_sayisi 0. Mutasyon: gönderimin sıfırlama ifadesi bilerek kaldırılınca senaryo kırmızı (ilk_eksik_sira dolu kalır); dosya md5 ile geri yazılır." },
    { name: "Kurulum kimliği başlığı", kind: "behavior", asserts: "X-Kurulum-Kimligi yok ya da UUID değil: iki uçta 403 ESITLEME_KURULUM_KIMLIGI_GECERSIZ, satır açılmaz. Kontrol: UUIDv4 başlık kabul edilir, 200." },
    { name: "Hiçbir uygulama sürümüne kapanmaz", kind: "behavior", asserts: "En düşük sürümün altındaki X-Uygulama-Surumu ile ve sürüm başlıklarının hiçbiri yokken gönderim işlenir; geçersiz başlık değerleri kurulum satırına boş yazılır." },
    // behavior: kimlik
    { name: "Oturumsuz ve imzasız gönderim reddedilir", kind: "behavior", asserts: "D13 beyan denetiminden 401 API_KIMLIK_GEREKLI; kurulumlar ve defterde satır açılmaz; istek girissiz IP sayacına yazılır. Pozitif kontrol: aynı paket geçerli oturumla 200." },
    { name: "Kapanmış Bearer ve pasif cihaz imzası kökten geçer", kind: "behavior", asserts: "Kapanmış oturumun Bearer'ı ve cihazı değişmiş öğrencinin eski anahtarıyla geçerli imza: D13 beyan denetimi geçer, HTTP 200, istek.kimlik.tur cihaz, eşitleme sağlamken X-Saat-Belgesi var; D01 oturum doğrulaması istek başına bir kez çağrılır (sahte sayaçla)." },
    { name: "Cihaz değişiminden sonra eski telefonun bekleyen kayıtları ulaşır", kind: "behavior", asserts: "Oturumsuz, paket kapanmış cihazın anahtarıyla imzalı: yoklama_kaydi işleyiciye gider; sorun_bildirimi RET ESITLEME_OTURUM_KAPALI; HTTP 200. Kontrol: cihaz etkinken oturumsuz sorun_bildirimi TEKRAR_DENE ESITLEME_OTURUM_GEREKLI." },
    { name: "Hoca oturumu bitince işler silinmez", kind: "behavior", asserts: "Süresi dolmuş oturumla 401 API_KIMLIK_GEREKLI, defter değişmez; yeniden girişten sonra aynı öğeler KABUL alır." },
    { name: "Rolü uymayan öğe", kind: "behavior", asserts: "Öğrenci oturumuyla gelen pencere_suresi RET ESITLEME_YETKI_YOK; aynı paketteki yoklama_kaydi etkilenmez." },
    { name: "Kişi uyuşmazlığı", kind: "behavior", asserts: "Oturum ile paket imzası farklı kişilerin: 403 ESITLEME_KIMLIK_UYUSMUYOR; kurulum başka kişinin: iki uçta 403 ESITLEME_KURULUM_BASKA_HESABIN; hiçbir öğe işlenmez. Personel indirmesinde bu 403 listeleri sildirmez (telefon kuralı, protokol.ts)." },
    { name: "Kurulum kilidi beklenemezse", kind: "behavior", asserts: "Aynı kurulumun satırı 2 saniyeden uzun kilitli tutulunca 503 ESITLEME_KURULUM_MESGUL, hata zarfında bekleme { sabit: 5 } ve Retry-After 5; hiçbir satır yazılmaz." },
    { name: "Kişi başına kurulum sınırı", kind: "behavior", asserts: "20 canlı kurulumu olan kişinin yeni kurulum kimliğiyle gönderimi ve indirmesi 403 ESITLEME_KURULUM_SINIRI, satır açılmaz; var olan 20 kurulum çalışmayı sürdürür (kontrol); 180 günden eski temaslı, bekleyensiz ve boşluksuz kurulum sayılmaz (kontrol). 19 canlı kurulumda iki yeni kurulumla eşzamanlı ilk istek: tam biri açılır, öbürü 403. Oturumsuz, kapanmış cihazın imzasıyla bilinmeyen kurulum 403 ESITLEME_KURULUM_ACILAMAZ; aynı kurulum oturumla açılır (kontrol); hesabı silinmiş kişinin imzasıyla açılır (kontrol)." },
    { name: "Zaman bütçesi kısmi sonuç verir", kind: "behavior", asserts: "Sahte işleyici parça başına 3 saniye beklerken 200 öğelik paket: ilk parçalar işlenir ve kalır, bütçeden sonraki öğeler işleyiciye hiç verilmeden TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI alır; isle biçimli işleyicide bütçe her öğeden sonra denetlenir; aynı paket yeniden gönderilince işlenenler ZATEN_VAR, kalanlar ilerler. Kancası yavaş istekte (işlem açılırken D13.kalanSureMs 10000) bütçe 5 saniyeye iner." },
    { name: "İşlem süresi sınırı", kind: "behavior", asserts: "İşleyici bütçesinden uzun bekleyen sahte işleyici: transaction_timeout (D13.kalanSureMs) işlemi keser, D12.islem 25P04'ü VERITABANI_ZAMAN_ASIMI'na çevirir, cevap 503 ve bekleme { aralik: [15, 45] }, hiçbir tabloda satır kalmaz. Cevap şemasına uymayan sonuç üreten sahte işleyici: işlem COMMIT'ten önce geri alınır, 500 ve satır yok. Kontrol: 12 saniyelik tek parça 200 döner (bütçe aşımı yalnız sonraki öğeleri TEKRAR_DENE yapar)." },
    // behavior: ikinci çapa ve dağıtım
    { name: "İkinci çapa bağlamı", kind: "behavior", asserts: "Geçerli imza: işleyici bağlamında VAR, belge ve olaydanBelgeyeMs aynen; tek baytı değişmiş metin, başka kurulumun ya da paketin metni ve öğrencide 'o' türü: YOK, yokNedeni PAKET_IMZASIZ; listede SONRA_YENIDEN_BASLATMA nedeniyle duran öğe: YOK SONRA_YENIDEN_BASLATMA; listede olmayan öğe: YOK GONDERILMEDI; ikinciCapa null ve neden ESITLEME_BOZUK: YOK ESITLEME_BOZUK; neden IMZALANAMADI: YOK PAKET_IMZASIZ; personel oturumunda 'o': VAR. Bağlamdaki her yokNedeni değeri D04'ün sabitler listesinde (sözleşme testi listeden okur, yazımı yeniden yazmaz). Anahtar türü uyuşmazlığı ('a' ile secure_enclave ya da app_attest anahtarı, 's' ile android_p256): YOK PAKET_IMZASIZ ve imzadan kimlik kurulmaz." },
    { name: "İşleyicide kısıt hatası yalnız o öğeyi düşürür", kind: "behavior", asserts: "Parçada bir öğe kısıt ihlali: o RET ESITLEME_KISIT_IHLALI, parçadaki öbürleri KABUL; hızlı yolda parça başına tek SAVEPOINT, yedek yolda öğe başına SAVEPOINT (sorgu günlüğünden sayılır)." },
    { name: "Geçici çakışma yalnız parçayı bekletir", kind: "behavior", asserts: "İşleyicide kilitlenme (40P01) ya da kilit zaman aşımı (55P03): parçanın öğeleri TEKRAR_DENE ESITLEME_GECICI_CAKISMA; öbür parçalar KABUL, işlem sürer." },
    { name: "İşleyici sonuç sözleşmesi", kind: "behavior", asserts: "Sonuç sayısı ya da sırası uymayan işleyicinin parçası geri alınır ve öğeler tek tek denenir; yine uymazsa TEKRAR_DENE ESITLEME_ISLEYICI_HATASI, beklemeSaniye 600." },
    { name: "Sunucu tarafı bekletme ulaşma anını korur", kind: "behavior", asserts: "Öğe t1'de TEKRAR_DENE ESITLEME_ZAMAN_BUTCESI alır, t2'de aynı gövdeyle gelir: işleyici ulasmaAni t1 alır. Gövdesi değişmiş aynı öğe t2 alır (kontrol); ilk sonucu ESITLEME_OTURUM_GEREKLI olan öğe t2 alır (kontrol). İlk gelişte ZATEN_VAR dönen öğenin kabul_ani'si, cevaptaki ulasmaAni'si ve makbuz anı öğe türünün modülünün sakladığı ilk ulaşmadır." },
    { name: "Sayaç gönderimde bir kez ve en sonda alınır", kind: "behavior", asserts: "Hoca paketi [erken_kapatma, kafa_sayisi]: kafa_sayisi grubu sürerken başka işlem degisiklik_sayaci'nı beklemeden artırır; surumAl gönderim başına bir kez, defter ve kurulum yazımından sonra çağrılır, iki grubun damgaları aynı sürümü yazar ve satırlar sonraki indirmede iner; sayaçtan sonra sorgu günlüğünde yeni satır kilidi yok. Öğrenci paketi sayaca hiç dokunmaz (kontrol)." },
    { name: "Öğrenci durum onayı karar yazımıyla kilitlenmez", kind: "behavior", asserts: "Öğrencinin paketi (imleç onayı, yoklama ve sorun bildirimi öğeleri) ile aynı öğrencinin kaydına hoca onayı (D05.kararSutunlariniYaz yolu) zorlanmış zamanlamayla 50 kez eşzamanlı: 40P01 sayısı 0; onay satırı kilitliyken gönderim onayı atlar ve 200 döner, sonraki istek yazar." },
    { name: "Ulaşma makbuzu başka öğeye geçmez", kind: "behavior", asserts: "Gövdesi bir bayt değişmiş, başka sıradaki ya da başka kurulumdaki öğeye takılan makbuz yok sayılır, ulaşma anı paketin anı olur; değişmemiş öğede makbuzdaki an kullanılır; ELE_GECIRILDI anahtarlı makbuz yok sayılır." },
    { name: "Cevap başlıkları", kind: "behavior", asserts: "İki uçta Cache-Control: no-store; eşitleme sağlamken X-Saat-Belgesi var (imzayla gelen istekte de), bozukken yok ve gönderim yine işlenir." },
    { name: "Hız sınırı doğrulanmış kimliğe bağlı", kind: "behavior", asserts: "Aynı cihazdan dakikada 31. gönderim 429 API_HIZ_SINIRI ve Retry-After; her istekte X-Kurulum-Kimligi değiştirmek sınırı sıfırlamaz; başka cihazın istekleri etkilenmez (kontrol); tutmayan imzalı istekler girissiz IP sayacından düşer." },
    // behavior: indirme
    { name: "Öğrenciye yalnız kendi verisi iner", kind: "behavior", asserts: "İmleçsiz indirmede bastanIndir true; tablolar yalnız öğrencinin şubelerinin ders, ders saati, oturum, pencere, tatil, kilit satırları ve kendi liste satırı; oturum satırı D02'nin rol listesindeki saat sayılarını, kısa kodu ve QR ayarını taşır, kafa sayısı ve yapıldı taşımaz; başka öğrencinin numarası ve adı cevabın hiçbir yerinde geçmez. Pozitif kontrol: aynı tohumla hocanın cevabında geçer." },
    { name: "Artımlı indirme", kind: "behavior", asserts: "İmleçten sonra değişen satır iner, değişmeyen inmez; silinen satır silindi true ve veri null ile iner; sonSira her cevapta döner." },
    { name: "Baştan indir nedenleri", kind: "behavior", asserts: "Nesil değişti, imleç sayaçtan ileri, en_eski_gecerli_surum altında, bozuk imleç, başka hesabın imleci, yapı sürümü değişti, öğrencinin teyit durumu değişti: her birinde 200 ve bastanIndir true; sonSira değişmez. degisiklik_sayaci satırı yokken (test sıfırlamasından sonra) indirme sürümü 0 sayar ve 200 döner." },
    { name: "Kapsam değişince baştan indir", kind: "behavior", asserts: "Derse sonradan eklenen öğrencinin sonraki indirmesi bastanIndir true ve dersin bütün satırlarını taşır; dersten alınan hocanın sonraki tam indirmesinde o dersin listesi yok; liste satırı pasifleşen öğrencide ders tam indirmede kalır." },
    { name: "Tam indirme kendi kapsam satırı yüzünden yeniden başlamaz", kind: "behavior", asserts: "Öğrencinin liste satırının sürümü ilk sayfanın üst sürümünden büyükken adet 100 ile çok sayfalı tam indirme her sayfada ilerler ve devamiVar false ile biter; ikinci sayfada bastanIndir false. Kontrol: kapsamSurumu'ndan sonra öğrenci yeni şubeye eklenince sonraki istek bastanIndir true." },
    { name: "Sayfalar sürüm sınırında kesilir", kind: "behavior", asserts: "adet 100 ile çok sayfalı indirmede aynı sürümün satırları iki sayfaya bölünmez; sayfaların birleşimi tek seferde indirilenle aynı; 300 satırlık tek sürüm tek sayfada gelir. surumden'e eşit sürümlü satır döndüren sahte kaynak: satır atılır, loglanır, sayfa yine ilerler." },
    { name: "Eşzamanlı yazmada değişiklik atlanmaz", kind: "behavior", asserts: "Sürüm v'yi alan işlem açıkken v+1 alınamaz; iki yazıcı ve bir okuyucuyla zorlanmış zamanlamada okuyucunun imleci bitmemiş sürümün üstüne geçmez ve her değişiklik bir sayfada görünür." },
    { name: "Öğrenci gönderimi sayacı kilitlemez", kind: "behavior", asserts: "200 yoklama öğelik gönderim işlemi açıkken başka işlem degisiklik_sayaci satırını beklemeden artırır." },
    // behavior: öğrenci durumu, temas, hesap silme, iş
    { name: "Karar teslimi onayla yazılır", kind: "behavior", asserts: "Karar değişince öğrenci bölümü iner ve satır SUNULDU olur; sonraki istekteki imleç öğrenci sürümünü taşıyınca telefona_ulasti_ani = son sunum anı; cevap kaybolursa (imleç saklanmadı) yazılmaz, sonraki sunumun anıyla yazılır." },
    { name: "Teslim bilgisi", kind: "behavior", asserts: "kararTeslimAni sunulmamış sürüm için null; sunulmuş ama onaylanmamış sürüm için iki sunum anı, telefonaUlastiAni null ve sunulan kurulumun son temas anı; onaylı sürüm için tek ve değişmeyen telefonaUlastiAni." },
    { name: "Karar sürümü telefondan sorun bildirimine aynen döner", kind: "behavior", asserts: "D05, D07 ve D09 hazır olunca koşar: öğrenci bölümündeki kayıt satırının kararSurumu kayit_karar_gecmisi.sira ile aynı tam sayı; karar sunulup onaylandıktan 4 gün sonra aynı kararSurumu ile gelen sorun_bildirimi süre dışı (D09'un DUZELTMELER_SURE_DISI bilgisi); 2 gün sonra gelen süre içinde (kontrol)." },
    { name: "Son temas ve bekleyen yoklama", kind: "behavior", asserts: "Gönderim ve indirme son_temas_ani'yi saat arayüzünden yazar; 401, 403 ve 503 ile biten istek yazmaz; kurulumSonTemasi kişinin en son temasını verir ve eski telefon bekleyen yoklama bildirdiyse yeni telefonun bekleyensiz temasından sonra da bekleyenYoklamaVar true; yalnız telefon_sayaci bekleyen kurulumda false (kontrol). kurulumSonTemaslari üç kişi için tek sorgu çalıştırır (sorgu günlüğünden), her kişide kurulumSonTemasi ile aynı değeri verir, kurulumu olmayan kişi { null, false } ile haritada bulunur." },
    { name: "Yedekten dönüşte makbuzlu kayıt kaybolmaz", kind: "behavior", asserts: "Defter, kurulum su seviyesi ve kayıtlar son dakikaların öncesine geri sarılınca sonraki cevapta sonSira geriler; telefon kuralı (packages/core) gerilemeyi saklanan en büyük sonSira'dan anlar ve üstteki ULASTI öğeleri bir kez yeniden gönderir; her makbuzlu kayıt kendi modülünün tablosunda tam bir kez ve ulaşma anı makbuzdaki ilk an." },
    { name: "Hesap silinince D06 satırları silinir", kind: "behavior", asserts: "D01.kimlikDinleyicileriniKur ile kurulan esitleme abonesi (esitlemeKimlikDinleyicisi) hesap_silindi olayında aynı işlemde kişinin kurulumlar, defter (cascade), öğrenci sürümü ve karar teslimi satırlarını siler; başka kişinin satırlarına dokunmaz (kontrol); giris_oturumu_kapandi, giris_oturumu_yenilendi, cihaz_kapandi ve hesap_durumu_degisti olaylarında hiçbir D06 satırı değişmez (kontrol). Silinmiş kişinin imzalı paketi: D01.hesapSilindiMi true, öğeler türlerinin modüllerine dağıtılır, HTTP 200 ve sonSira döner, işlem sonunda kişinin D06 satırları yeniden silinmiş olur. Silme ile gönderim eşzamanlı: 40P01 yok (gönderim kişi satırını kurulum satırından önce FOR SHARE alır)." },
    { name: "sira_boslugu_raporu boşlukları bulur ve eskiyi temizler", kind: "behavior", asserts: "Boşluklu kurulumda acik_bosluk_sayisi ve ilk_eksik_sira doğru, boşluksuz kurulumda sıfır (kontrol), kapanan boşluk sıfırlanır; gönderimin kilitlediği kurulum atlanır ve sayılır; su seviyesinin altında ve 401 günlük defter satırı silinir, 399 günlük ve su seviyesinin üstündeki satır kalır (kontrol); karar_teslimleri satırına dokunulmaz (kontrol); D14'ün 'aynı veriyle iki kez çalışırsa' adımıyla iki kez çalışınca kurulumlar ve defter ilk çalışmadan sonrakiyle aynı; log satırında numara ve isim yok." },
    { name: "Saklama işleyicisi süresi dolan karar teslimlerini siler", kind: "behavior", asserts: "D12.saklamaIsleyicisiniCalistir(saklamaVeritabani, 'esitleme.donem_verisi', { sinirAni, ... }) yoklama_saklama girişiyle: son sunumu sinirAni'dan eski karar_teslimleri satırları partilerle silinir, yeni olan kalır (kontrol); kurulumlar, gonderim_defteri ve ogrenci_durum_surumleri değişmez (kontrol); işleyici başka modülün tablosuna dokunmaz, INSERT yapmaz. Satırı silinmiş kararda kararTeslimAni null döner. Kayıt katalogda olmayan ince bir sınıf adıyla (<modül>.<tablo> biçiminde) yapılınca D12 açılışı durdurur (kontrol)." },
    { name: "En eski geçerli sürüm komutu", kind: "behavior", asserts: "cli/esitleme-en-eski-surum.ts çalışınca en_eski_gecerli_surum güncel surum olur ve aynı işlemde esitleme.en_eski_surum_yukseltildi denetim olayı yazılır (birimId ve dersId yok); sonraki indirme bastanIndir true. degisiklik_sayaci satırı yokken komut satırı açar (0) ve hata vermez. Denetim yazımı bilerek başarısız edilince sürüm değişmez (tek işlem)." },
    { name: "Teyitsiz öğrencinin kapsam bağlamı", kind: "behavior", asserts: "Teyitsiz öğrencinin indirmesinde öğrenci kapsam kaynağına (D03'ün ogrenci_liste_kapsami kaydı yerine sahte kaynak) teyitli false ve numara verilir; sahte liste kaynağı adı bu bayrakla siler ve cevapta ad yok. Teyit durumu D01.ogrenciHesabiGetir'den imleçteki hesap özetine girer: teyitten sonraki indirme bastanIndir true ve kendi adını taşır (kontrol); teyit değişmeden ikinci indirme bastanIndir false (kontrol)." },
    { name: "Kısıtlı oturum oturumsuz sayılır", kind: "behavior", asserts: "Değişim bekleyen kısıtlı oturumun Bearer'ı (oturumHatasi KIMLIK_KAPSAM_SINIRLI) ve geçerli paket imzası: HTTP 200, yoklama_kaydi işlenir, sorun_bildirimi TEKRAR_DENE ESITLEME_OTURUM_GEREKLI, PaketBaglami.oturum ve kimlik null. Aynı istek imzasız: 401 API_KIMLIK_GEREKLI. İndirmede aynı oturum 403 KIMLIK_KAPSAM_SINIRLI; çerezle gelen indirme 403 API_ROL_YETKISIZ." },
    { name: "Danışma anahtarları paket başında tek çağrıda", kind: "behavior", asserts: "kilitAnahtarlari kancası olan iki sahte türle paket: D12.danismaKilidi işlem başına tam bir kez çağrılır (sahte sayaçla), anahtarlar iki grubun anahtarları ve esitleme:kurulum_siniri:<kisiId>, çağrı hiçbir işleyiciden ve kurulum satırı kilidinden önce; kancasız tür anahtar vermez (kontrol). PaketBaglami.kimlik oturumlu pakette istek.kimlik, oturumsuz imzalı pakette null. İşleyici sırada geride kalan yeni anahtarı danismaKilidiDene ile alamayınca yalnız o öğe TEKRAR_DENE alır." },
    { name: "Sürüm damgası tek sürümle yazılır", kind: "behavior", asserts: "Bir işlemde üç surumDamgasiIste ve bir surumAl: sayaç bir artar, üç damga aynı sürümü alır, kayıt sırasıyla. surumAl çağrılmadan biten damgalı işlem D12.islemSonuKancasi ile geri alınır ve hiçbir satır kalmaz; aynı işlem surumAl ile COMMIT eder (pozitif kontrol). surumAl'dan sonra surumDamgasiIste hata atar; aynı işlemde ikinci surumAl sayacı artırmaz, aynı sürümü döner; geri alınan SAVEPOINT içinde kaydedilen damga çalışmaz ve denetimi tetiklemez. degisiklik_sayaci satırı yokken ilk surumAl satırı açar ve 1 döner; eşzamanlı iki ilk surumAl 1 ve 2 döner. Mutasyon: denetim kancası kaydı bilerek kaldırılınca senaryo kırmızı (dosya md5 ile geri yazılır)." },
    // property
    { name: "Gönderim durum makinesi", kind: "property", asserts: "fast-check, deneme sayısı açıkça 200: rastgele en çok 200'lük paketler, aynı paketin eşzamanlı iki kez gönderimi, paket sırasının bozulması, yarıda kalan gönderim (işlem geri alınır), paket düzeyinde hatalar (ağ, 5xx, 429), bekleme sırasında oluşan öğeler, öğe düzeyinde TEKRAR_DENE ve sonradan yedekten dönüş (son satırlar silinir); telefon tarafı packages/core/src/esitleme/protokol.ts ile sürülür. Değişmez: ULASTI olan her öğe kendi modülünün tablosunda tam bir kez, defterde KABUL ya da ZATEN_VAR (teknik.html#testler-kalite)." },
    { name: "Su seviyesi hesabı", kind: "property", asserts: "Rastgele varış sırasında kesintisizSonSira en büyük n'dir ve 1..n'nin hepsi vardır; tekrar varış sonucu değiştirmez; geri sarma dışında azalmaz; yeni değer ilk eksik sıraya ulaşınca boşluk alanları sıfırlanır." },
    { name: "İmleç kodlaması", kind: "property", asserts: "Kodla ve çöz birbirinin tersi; 64 bitlik sistem kimliği kayıpsız; genelSurum'u kapsamSurumu'ndan büyük imleç tanınmaz; teyit durumu değişince hesap özeti değişir; rastgele metin hiç fırlatmaz, tanınmaz sonucu verir." },
    { name: "Sayfa kesme", kind: "property", asserts: "Rastgele sürüm dağılımında sayfa üst sürümü kesilen kaynakların sınırlarının en küçüğü; sayfa birleşimi tam küme; hiçbir sürüm iki sayfaya bölünmez; aralık dışı satır içeren kaynakta da her sayfa ilerler." },
    { name: "Gönderme süresi sonu", kind: "property", asserts: "Tablo: 7 gün sınırı ve kilit anı sınırı, kilit anından 1 ms önce içeride, kilit anında dışarıda; kilitAni null iken yalnız 7 gün; TZ=UTC ve TZ=Europe/Istanbul altında aynı sonuç; sonuç iki sınırdan büyük olmaz; modül Intl ve infra içe aktarmaz." },
    { name: "İkinci çapa metni", kind: "property", asserts: "Kur ve çöz birbirinin tersi; imza metnin ASCII baytları üzerinde; metnin tek baytı değişince doğrulama başarısız; imzaTuru ile anahtar türü eşlemesi dışındaki her çift reddedilir." },
    { name: "Ulaşma makbuzu", kind: "property", asserts: "Biçim: uzunluk baytı ve ASCII kid, 1 ile 8 karakterlik her kid'de en çok 50 bayt ve 67 karakter; kurulum, sıra, öğe kimliği, gövde özeti, an ya da kid'den biri değişince doğrulama başarısız; YALNIZ_DOGRULAMA kid ile üretilen makbuz geçer, listeden çıkan ve ELE_GECIRILDI olan geçmez." },
    { name: "Telefon protokol kuralları", kind: "property", asserts: "Paket seçimi hiç cevap almamış öğeyi atlamaz, en çok 200 öğe ve 768 KiB, artan sıra, tek kurulum; paket düzeyinde hatada kurulum bekler, öğe beklemesi değişmez; gerileme kuralı ULASTI ve RET öğelerini gerileme başına bir kez seçer, YEREL_RET öğesini seçmez (yerelRetler'e koyar), gerileme olmadan hiçbir ULASTI öğe seçilmez; yerel ret girdisi sığan değerlerden kurulur ve bölünen yarılara konmaz; bekleme 2 saniye ile 10 dakika arasında ve beklemeSaniye'den kısa değil; ilk gönderim kaydırması 0 ile N saniye arasında; bölme yalnız 413 ve alan yolu ogeler'i gösteren 400'de, önce sol yarı; öbür 4xx kurulumu durdurur; 403 listeleri silmez, 401 siler. Rastgele 400 ve 413 dağılımında bölme sonlu sayıda istekle biter." },
    { name: "Tam indirme yarıda kalınca bayat satır kalmaz", kind: "property", asserts: "Rastgele sayfa dizileri, sayfalar arasında uygulama yeniden başlaması ve herhangi bir sayfada gelen bastanIndir: devamiVar false olduğunda yerelde yalnız son tam indirmede gelen program ve liste satırları kalır; yarıda kalan tam indirme artımlıya dönmez." },
    // contract
    { name: "Öğe türleri kayıtlı", kind: "contract", asserts: "Bileşik uygulamada OGE_TURLERI'nin her türü tam bir kez kayıtlı; çift kayıt açılışta hata verir; bir tür bilerek kaydedilmeyince test kırmızı." },
    { name: "Gönderim ve indirme şemaları", kind: "contract", asserts: "OpenAPI belgesinde sonuc ve gerekce alanları x-extensible-enum taşır, enum anahtarı yok; cevap şeması sunucu cevabını doğrular; yerelRetler gevşek zarfı 512 karakterlik metni ve aralık dışı sırayı 400'süz kabul eder; 64 bitlik değerler yalnız opak imleç içinde, sira kayıtlı istisna (D06-C06)." },
    { name: "İndirme kaynağı sözleşme denetimi", kind: "contract", asserts: "support/kurucular/esitleme.ts'teki yardımcı her kayıtlı kaynakta: satırlar sürüm sırasında ve hepsi (surumden, surumeKadar] aralığında (surumden'e eşit ya da küçük sürüm kırmızı), sanal kapsam satırı yok, silindi satırda veri null, öğrenci rolünde başka öğrencinin verisi ile kafa sayısı ve yapıldı yok, aynı girdiyle aynı sonuç. Kaynağı kaydeden modüller kendi testlerinde çağırır." },
    { name: "Tablo kısıtları sözleşmeyle aynı", kind: "contract", asserts: "CHECK değer listeleri OGE_SONUCLARI ve rol sabitlerinden; D12'nin şema testi eşleşmeyi denetler; sabitten bir değer bilerek silinince test kırmızı; başka modülün tablosunda kurulumlar'a başvuran yabancı anahtar yok." },
    { name: "Modül sınırı", kind: "contract", asserts: "Başka modül yalnız modules/esitleme/index.ts ve yaprak.ts'i içe aktarır; modules/esitleme yalnız D12 ve D13 dış yüzlerini, infra'yı ve packages/core/src/saat sabitlerini içe aktarır, D01 ve D04 işlevleri esitlemeEklentisi seçeneğiyle gelir, öğe türlerini ve kaynakları kaydeden modülleri içe aktarmaz; yaprak.ts alan modülü içe aktarmaz (yalnız D12'nin islemSonuKancasi'nı ve tipleri); jobs/esitleme modülün kendi dosyalarını, D14.isTanimla'yı ve infra/saat'i kullanır; modules/esitleme jobs/ ya da cli/ içe aktarmaz; dependency-cruiser no-circular D06'yı içeren döngü bulmaz ve modules/esitleme'ye bilerek D01 içe aktarması eklenince kırmızı (Biome noPrivateImports)." },
    { name: "Eklenti birleşimi ve kayıtlar", kind: "contract", asserts: "esitlemeEklentisi kayıt sırasında veritabanına sorgu göndermez (sorgu sayacı 0); surec 'api' ve 'isci' için saklama işleyicisini kaydeder, zamanlayıcı kurmaz; setErrorHandler ve setNotFoundHandler çağırmaz; rotalar yalnız rotalariKaydet'ten gelir. Seçenek tipinde kimlikOlayiDinleyicisiKaydet yok; uygulamaKur esitleme abonesi olarak esitlemeKimlikDinleyicisi verir, abone eksikse süreç açılmaz. ESITLEME_DENETIM_OLAYLARI'nın her türü esitleme. önekli, D09.denetimOlaylariniKaydet ile kayıtlı ve dersId taşımaz; ESITLEME_ hata kodlarının hepsi esitleme.ts'teki listede. Rota tablosunda indirme defterYazar: true ve kimlikKaynaklari ['bearer'], gönderim kimlik ['cihazImzasi', 'oturum'] ve hız 'gonderim'." },
    // load
    { name: "Ders çıkışı yük testi", kind: "load", asserts: "k6 sabit geliş hızıyla 20.000 telefon 1 dakikada; telefon başına belge, gönderim ve gerekirse indirme; gönderimlerin varışı protokol.ts'in ilk gönderim kaydırma işlevinden çekilir; gönderim p95 1 saniye ve p99 3 saniye altında, 503 oranı yüzde 2 altında ve hepsi Retry-After'lı, 503 dışı 5xx sıfır, her makbuzlu kayıt tam bir kez (D15-B15 profili); hoca paketleri [erken_kapatma, kafa_sayisi] ile sayaç kilidi bekleme süresi ölçülür ve ilk gönderim kaydırmasının N değeri buradan yazılır." },
    { name: "Yedekten dönüş sonrası yük", kind: "load", asserts: "Nesil değişince 20.000 telefonun baştan indirmesi ve gerilemeye göre yeniden gönderimi aynı eşiklerle; telefonların tam indirme süresi yazılır." },
    // mutation
    { name: "Çekirdek kuralların mutasyon testi", kind: "mutation", asserts: "Haftalık Stryker işinde packages/core/src/esitleme'nin imleç, su seviyesi, sayfa kesme, gönderme süresi, ikinci çapa metni, makbuz biçimi ve protokol mutantları öldürülür (eşik D15'in); her değişmez testi bir kez bilerek bozulup kırmızıya döndüğü görülür, dosya md5 ile geri yazılır." }
  ]
};

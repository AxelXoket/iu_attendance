// D06 spec data, part 1: summary, tables, endpoints, jobs. Rendered by build.js into spec/D06.json and frag/D06.html.
module.exports = {
  id: "D06",
  module: "esitleme",
  summary:
    "esitleme modülü telefonun ortak kuyruğunu tek uçtan (POST /v1/esitleme/gonderim) alır, her öğeyi türünün modülüne aynı veritabanı işleminde dağıtır ve her (kurulum, sıra) için tek defter satırı tutar; bozuk öğe paketi düşürmez, her öğeye KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE döner. " +
    "Kurulum, bir uygulama kopyasında bir hesabın kuyruğudur; kesintisiz son sıra her eşitlemede telefona bildirilir, yedekten dönüşte telefon sonrakileri yeniden gönderir ve imzalı ulaşma makbuzu ilk ulaşma anını korur. " +
    "İndirme (GET /v1/esitleme/degisiklikler) tek sayaç satırından işlemin son adımında bir kez alınan sürümle (sürüm damgası) artımlıdır; imleç nesli, genel ve kapsam sürümünü, öğrencinin durum sürümünü, yerel yapı sürümünü ve hesap özetini taşır, nesil, kapsam, teyit ya da yapı değişince baştan indir der ve gönderme kuyruğuna dokunmaz. " +
    "Öğrencinin kendi kayıtları, kararları, düzeltmeleri ve devam durumu öğrenci başına sürümle iner; telefonun imleçle sakladığını bildirdiği sürüm, kararın telefona ulaştığı anı (sorun bildirme süresinin başı) yazar. " +
    "Modül iş kuralı tutmaz: öğe işleyicileri ve indirme kaynakları sorumlu modüllerin eklentisinde ogeTuruKaydet ve indirmeKaynagiKaydet ile kaydolur; D01 ve D04 işlevleri eklentiye app.ts'ten seçenekle gelir.",

  tables: [
    {
      name: "gonderim_defteri",
      purpose:
        "Her kurulumdan gelen her kuyruk öğesinin tek satırı (bütün öğe türleri). Kesintisiz son sıranın, sıra çakışmasının, tekrar gönderim sayısının ve sıra boşluğu ölçüsünün kaynağı. Öğenin içeriğini değil taşınmasını saklar; içerik öğe türünün modülünün tablosundadır.",
      columns: [
        { name: "kurulum_id", type: "uuid", null: false, default: "", note: "Kurulum (kurulumlar.kurulum_id)." },
        { name: "sira", type: "bigint", null: false, default: "", note: "Kurulumun sırası: 1'den başlar, boşluksuz artar, dönemle sıfırlanmaz. JSON'da tam sayı, 2^53-1 ile sınırlı (ortak kuraldan kayıtlı istisna, D06-C06)." },
        { name: "oge_kimligi", type: "uuid", null: true, default: "", note: "Öğenin UUIDv7 kimliği; zarfı çözülemeyen öğede (ESITLEME_OGE_GECERSIZ) ve kimliği UUID olmayan yerel rette (ESITLEME_YEREL_RET) boş." },
        { name: "oge_turu", type: "text", null: true, default: "", note: "Öğe türü (ör. yoklama_kaydi); desene uymayan değer boş yazılır." },
        { name: "sonuc", type: "text", null: false, default: "", note: "KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE. KABUL ve ZATEN_VAR olmuş satır başka sonuca dönmez." },
        { name: "gerekce", type: "text", null: true, default: "", note: "RET ve TEKRAR_DENE kodu: ESITLEME_ önekli ya da öğe türünün modülünün kodu. KABUL ve ZATEN_VAR'da boş." },
        { name: "ilk_gorulme_ani", type: "timestamptz", null: false, default: "", note: "Öğenin geldiği ilk paketin ulaşma anı (saat arayüzü, paket başına bir kez okunur)." },
        { name: "son_gorulme_ani", type: "timestamptz", null: false, default: "", note: "Öğenin geldiği son paketin ulaşma anı." },
        { name: "sunucu_bekletme_ani", type: "timestamptz", null: true, default: "", note: "Öğe ilk kez sunucu tarafı bir nedenle (ESITLEME_ZAMAN_BUTCESI, ESITLEME_GECICI_CAKISMA, ESITLEME_ISLEYICI_HATASI, ESITLEME_TUR_BILINMIYOR) TEKRAR_DENE aldığında o paketin ulaşma anı; sonra değişmez. Aynı gövdeyle yeniden gelen öğenin ulaşma anı budur (Kurallar, ulaşma anı)." },
        { name: "govde_ozeti", type: "bytea", null: true, default: "", note: "Öğenin ilk gelişindeki gövde baytlarının SHA-256'sı (32 bayt); sonra değişmez. Yerel rette ve zarfı çözülemeyen öğede boş." },
        { name: "kabul_ani", type: "timestamptz", null: true, default: "", note: "Öğenin sunucuya ulaşma anı: işleyicinin döndürdüğü OgeSonucu.ulasmaAni (KABUL'de GelenOge.ulasmaAni, ZATEN_VAR'da öğe türünün modülünün sakladığı ilk ulaşma). Cevabın ulasmaAni alanı ve ulaşma makbuzunun anı budur; bir kez yazılır." },
        { name: "gorulme_sayisi", type: "integer", null: false, default: "1", note: "Öğenin kaç pakette geldiği (tekrar gönderim ölçüsü)." },
        { name: "son_paket_kimligi", type: "uuid", null: false, default: "", note: "Öğenin geldiği son paketin kimliği (iz)." },
        { name: "gonderen_uygulama_surumu", type: "text", null: true, default: "", note: "Son gönderen isteğin X-Uygulama-Surumu değeri (en çok 32 karakter). Kaydı üreten sürüm kayıt metnindedir (D05)." },
        { name: "gonderen_guncelleme_kimligi", type: "uuid", null: true, default: "", note: "Son gönderen isteğin X-Guncelleme-Kimligi değeri (expo-updates updateId)." }
      ],
      indexes: [
        "gonderim_defteri_kurulum_id_sira_pk: PRIMARY KEY (kurulum_id, sira)",
        "gonderim_defteri_son_gorulme_ani_idx: (son_gorulme_ani); sira_boslugu_raporu'nun temizlik adımı ve günlük RET sayımı"
      ],
      constraints: [
        "gonderim_defteri_kurulum_id_fk: FOREIGN KEY (kurulum_id) REFERENCES kurulumlar (kurulum_id) ON DELETE CASCADE; iki tablo da D06'nın",
        "gonderim_defteri_sira_ck: CHECK (sira BETWEEN 1 AND 9007199254740991)",
        "gonderim_defteri_sonuc_ck: CHECK (sonuc IN ('KABUL', 'ZATEN_VAR', 'RET', 'TEKRAR_DENE')); liste OGE_SONUCLARI sözleşme sabitinden üretilir",
        "gonderim_defteri_gerekce_ck: CHECK ((gerekce IS NULL) = (sonuc IN ('KABUL', 'ZATEN_VAR')) AND (gerekce IS NULL OR gerekce ~ '^[A-Z][A-Z0-9_]{2,63}$'))",
        "gonderim_defteri_kabul_ani_ck: CHECK ((kabul_ani IS NOT NULL) = (sonuc IN ('KABUL', 'ZATEN_VAR')))",
        "gonderim_defteri_oge_ck: CHECK ((oge_kimligi IS NOT NULL AND oge_turu ~ '^[a-z][a-z0-9_]{1,63}$') OR gerekce IN ('ESITLEME_OGE_GECERSIZ', 'ESITLEME_YEREL_RET'))",
        "gonderim_defteri_gorulme_ck: CHECK (gorulme_sayisi >= 1 AND son_gorulme_ani >= ilk_gorulme_ani AND (sunucu_bekletme_ani IS NULL OR sunucu_bekletme_ani >= ilk_gorulme_ani))",
        "gonderim_defteri_ozet_ck: CHECK (govde_ozeti IS NULL OR octet_length(govde_ozeti) = 32)",
        "gonderim_defteri_surum_ck: CHECK (gonderen_uygulama_surumu IS NULL OR char_length(gonderen_uygulama_surumu) <= 32)"
      ]
    },
    {
      name: "kurulumlar",
      purpose:
        "Bir uygulama kopyasında bir hesabın kuyruğunun sunucudaki kalıcı izi (öğrenci ve personel): kesintisiz son sıra, en büyük sıra, son temas, bekleyen yoklama sayısı, sürüm ve kanal, sıra boşluğu durumu. Kişisi açılışta yazılır, değişmez. Giriş güveninde kullanılmaz; tanınan cihaz kaydı değildir (teknik.html#sunucu-kimlik). Başka modül bu tabloya yabancı anahtar koymaz: kurulum_id ve sira başka tablolarda iz sütunudur (D04, D05, D09, D15). Satırlar hesap silinince (D01'in hesap_silindi olayında esitlemeKimlikDinleyicisi) ve 400 gün temassız kalınca (sira_boslugu_raporu) silinir.",
      columns: [
        { name: "kurulum_id", type: "uuid", null: false, default: "", note: "Birincil anahtar: telefonun bu hesap için ürettiği kimlik (X-Kurulum-Kimligi). Telefon UUIDv7 üretir; sunucu her RFC 9562 UUID'yi kabul eder, üretmez." },
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Kurulumun hesabı (kisiler.id, D01); satır açılırken isteğin doğrulanmış kişisinden yazılır, sonra değişmez." },
        { name: "rol", type: "text", null: false, default: "", note: "OGRENCI ya da PERSONEL; açılıştaki kişiden." },
        { name: "son_cihaz_id", type: "uuid", null: true, default: "", note: "Öğrencide son isteğin cihazı (oturumdan ya da paket imzasından; cihazlar.id, D01). Personelde boş." },
        { name: "platform", type: "text", null: true, default: "", note: "X-Platform; D13 sözleşmesindeki listede değilse boş." },
        { name: "kanal", type: "text", null: true, default: "", note: "X-Kanal; D13 sözleşmesindeki listede değilse boş." },
        { name: "uygulama_surumu", type: "text", null: true, default: "", note: "X-Uygulama-Surumu (en çok 32 karakter)." },
        { name: "guncelleme_kimligi", type: "uuid", null: true, default: "", note: "X-Guncelleme-Kimligi (expo-updates updateId)." },
        { name: "yapi_surumu", type: "integer", null: true, default: "", note: "Telefonun yerel veri yapısı sürümü (PRAGMA user_version); indirme isteğinden." },
        { name: "kesintisiz_son_sira", type: "bigint", null: false, default: "0", note: "En büyük n ki 1..n her sıranın defterde bir satırı var; her eşitlemede sonSira olarak döner." },
        { name: "en_buyuk_sira", type: "bigint", null: false, default: "0", note: "Defterdeki en büyük sıra." },
        { name: "sira_ilerleme_ani", type: "timestamptz", null: true, default: "", note: "kesintisiz_son_sira'nın son ilerlediği an; açık boşluğun yaşı buradan ölçülür." },
        { name: "bekleyen_yoklama_sayisi", type: "integer", null: false, default: "0", note: "Son temasta telefonun bildirdiği sonuçlanmamış yoklama_kaydi sayısı (öbür türler sayılmaz); gönderimde paketin TEKRAR_DENE alan yoklama_kaydi öğeleri eklenir, LEAST(..., 100000) ile yazılır." },
        { name: "son_temas_ani", type: "timestamptz", null: false, default: "", note: "Son doğrulanmış gönderim ya da indirme anı (saat arayüzü); KARAR BEKLİYOR hesabının girdisi." },
        { name: "son_gonderim_ani", type: "timestamptz", null: true, default: "", note: "Son başarılı gönderimin anı." },
        { name: "son_indirme_ani", type: "timestamptz", null: true, default: "", note: "Son başarılı indirmenin anı." },
        { name: "acik_bosluk_sayisi", type: "integer", null: false, default: "0", note: "sira_boslugu_raporu'nun bulduğu eksik sıra sayısı (kesintisiz son sıranın üstünde)." },
        { name: "ilk_eksik_sira", type: "bigint", null: true, default: "", note: "İlk eksik sıra; boşluk yoksa boş. sira_boslugu_raporu yazar; gönderim su seviyesini bu sıraya ya da üstüne taşıyınca aynı UPDATE'te boş ve acik_bosluk_sayisi 0 yazar, sonraki rapor yeniden hesaplar." },
        { name: "bosluk_denetim_ani", type: "timestamptz", null: true, default: "", note: "Son boşluk denetiminin anı." },
        { name: "olusturma_ani", type: "timestamptz", null: false, default: "", note: "Satırın açıldığı an (saat arayüzü)." }
      ],
      indexes: [
        "kurulumlar_kurulum_id_pk: PRIMARY KEY (kurulum_id)",
        "kurulumlar_kisi_id_idx: (kisi_id); kurulumSonTemasi ve kurulumSonTemaslari (kisi_id = ANY), kişi başına canlı kurulum sayımı (kişinin birkaç satırı taranır) ve hesap silme",
        "Depolama: fillfactor 80. Gönderim ve indirmedeki güncellemeler dizinli sütuna dokunmaz, HOT güncelleme kalır."
      ],
      constraints: [
        "kurulumlar_kisi_id_fk: FOREIGN KEY (kisi_id) REFERENCES kisiler (id)",
        "kurulumlar_son_cihaz_id_fk: FOREIGN KEY (son_cihaz_id) REFERENCES cihazlar (id)",
        "kurulumlar_rol_ck: CHECK (rol IN ('OGRENCI', 'PERSONEL') AND (rol = 'OGRENCI' OR son_cihaz_id IS NULL))",
        "kurulumlar_sira_ck: CHECK (kesintisiz_son_sira >= 0 AND en_buyuk_sira >= kesintisiz_son_sira)",
        "kurulumlar_sayilar_ck: CHECK (bekleyen_yoklama_sayisi BETWEEN 0 AND 100000 AND acik_bosluk_sayisi >= 0 AND (ilk_eksik_sira IS NULL OR ilk_eksik_sira >= 1)); ilk_eksik_sira ile kesintisiz_son_sira arasında koşul bilerek yok: izleme sütunu hiçbir gönderimi durduramaz",
        "kurulumlar_yapi_surumu_ck: CHECK (yapi_surumu IS NULL OR yapi_surumu BETWEEN 1 AND 10000)",
        "kurulumlar_metin_ck: CHECK (char_length(coalesce(uygulama_surumu, '')) <= 32 AND char_length(coalesce(platform, '')) <= 16 AND char_length(coalesce(kanal, '')) <= 16)"
      ]
    },
    {
      name: "degisiklik_sayaci",
      purpose:
        "Telefona inen bütün tabloların değişiklik sürümünü veren tek satırlık sayaç. Sürüm işlemin son adımında bir kez alınır ve işlemin bekleyen damgalarına yazılır (contracts.json ortak kural 'Sürüm damgası'); surumAl satırı işlem sonuna kadar kilitler; bu yüzden sürümler yazma işlemlerinin bitiş sırasıyla verilir ve okuyucu henüz bitmemiş bir sürümün üstüne geçemez (teknik.html#kod-veri-modeli).",
      columns: [
        { name: "id", type: "smallint", null: false, default: "1", note: "Tek satır; değeri her zaman 1." },
        { name: "surum", type: "bigint", null: false, default: "0", note: "Son verilen değişiklik sürümü; surumAl işlemde bir kez kilitleyip bir artırır." },
        { name: "en_eski_gecerli_surum", type: "bigint", null: false, default: "0", note: "Genel sürümü bundan küçük imleç baştan indirir. Yalnız D06'nın yönetim komutu (enEskiGecerliSurumuYukselt, aynı işlemde denetim olayıyla) yükseltir; göç değiştirmez." }
      ],
      indexes: ["degisiklik_sayaci_id_pk: PRIMARY KEY (id)"],
      constraints: [
        "degisiklik_sayaci_id_ck: CHECK (id = 1)",
        "degisiklik_sayaci_surum_ck: CHECK (surum >= 0 AND en_eski_gecerli_surum BETWEEN 0 AND surum)",
        "Göç satır yazmaz (D12-B34): satırı ilk kullanım (surumAl ya da enEskiGecerliSurumuYukselt; UPDATE satır bulamazsa) INSERT INTO degisiklik_sayaci (id, surum, en_eski_gecerli_surum) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING ile açar, ardından UPDATE yinelenir; okuyucu satır yoksa surum ve en_eski_gecerli_surum'u 0 sayar. Test sıfırlamasındaki TRUNCATE dışında satır silinmez."
      ]
    },
    {
      name: "ogrenci_durum_surumleri",
      purpose:
        "Öğrenci başına durum sürümü: öğrencinin kendi kayıtları, kararları, düzeltmeleri, sorun bildirimleri, devam durumu ve hesap teyidi değişince aynı işlemde artar. Telefonun imleçle sakladığını bildirdiği en büyük sürüm karar teslim anının kaynağıdır. Genel sayaçtan ayrıdır; ders çıkışındaki gönderim yolu sıcak satır üretmez.",
      columns: [
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Öğrenci (kisiler.id, D01); birincil anahtar." },
        { name: "surum", type: "bigint", null: false, default: "0", note: "Öğrencinin kendi verisinin sürümü; ogrenciDurumuDegisti satırı kilitleyip bir artırır, satır yoksa 1 ile açar." },
        { name: "onaylanan_surum", type: "bigint", null: false, default: "0", note: "Telefonun imleçle sakladığını bildirdiği en büyük sürüm. Gönderimde bütün gruplardan sonra, indirmede imleç çözümünde SKIP LOCKED ile yazılır; satır kilitliyse yazım atlanır (yalnız en büyük değeri tutar, sonraki istek yazar)." },
        { name: "onay_ani", type: "timestamptz", null: true, default: "", note: "onaylanan_surum'un son arttığı an (saat arayüzü)." }
      ],
      indexes: ["ogrenci_durum_surumleri_kisi_id_pk: PRIMARY KEY (kisi_id)"],
      constraints: [
        "ogrenci_durum_surumleri_kisi_id_fk: FOREIGN KEY (kisi_id) REFERENCES kisiler (id)",
        "ogrenci_durum_surumleri_surum_ck: CHECK (surum >= 0 AND onaylanan_surum BETWEEN 0 AND surum)",
        "ogrenci_durum_surumleri_onay_ck: CHECK ((onay_ani IS NULL) = (onaylanan_surum = 0))"
      ]
    },
    {
      name: "karar_teslimleri",
      purpose:
        "Bir yoklama kaydının her karar sürümünün öğrencinin telefonuna sunulduğu ve telefonun sakladığını bildirdiği an. Sorun bildirme süresi (3 gün) bu andan başlar (plan.html#kararlar-supheli-kayit); karar değişince sürenin yeniden başlayıp başlamadığı D09'un kuralıdır, onaysız sunumun ne sayılacağı açık nokta D06-A02. Türetilmiş veridir: yoklama_kayitlari'na yabancı anahtar bilerek yoktur, çünkü kayıt saklaması dönem bölümünü DETACH PARTITION ile kaldırır (D12-B14) ve başvuran satır bunu durdururdu. Satırları hesap silinince hemen (esitlemeKimlikDinleyicisi), süresi dolunca D12 kataloğundaki esitleme.donem_verisi sınıfının saklama işleyicisi siler (son sunumu sınır anından eski satırlar; katalogda yoklama.donem_verisi'nden önce).",
      columns: [
        { name: "donem_id", type: "uuid", null: false, default: "", note: "Kaydın dönemi (iz sütunu, teknik.html#veritabani-donem-alani)." },
        { name: "kayit_id", type: "uuid", null: false, default: "", note: "Yoklama kaydının kimliği (iz sütunu)." },
        { name: "karar_surumu", type: "integer", null: false, default: "", note: "KararSurumu: kaydın güncel kayit_karar_gecmisi.sira değeri (D07), tam sayı en az 1. Öğrenci kaynağı (D05) her kayıt satırında ve kararlar listesinde verir; telefon saklar ve sorun bildiriminde aynen geri yollar (D09)." },
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Kaydın öğrencisi (kisiler.id)." },
        { name: "sunulan_durum_surumu", type: "bigint", null: false, default: "", note: "Bu karar sürümünü taşıyan son sunumun öğrenci durum sürümü." },
        { name: "sunulan_kurulum_id", type: "uuid", null: true, default: "", note: "Son sunumun yapıldığı kurulum; kurulum silinince boş. Onaysız sunum kuralının girdisi (D06-A02)." },
        { name: "ilk_sunulma_ani", type: "timestamptz", null: false, default: "", note: "Karar sürümünün telefona ilk gönderildiği an." },
        { name: "son_sunulma_ani", type: "timestamptz", null: false, default: "", note: "Onaydan önceki son gönderim anı; cevap kaybolup yeniden sunulursa ilerler." },
        { name: "telefona_ulasti_ani", type: "timestamptz", null: true, default: "", note: "Telefonun sakladığı sunumun anı: onay gelince son_sunulma_ani yazılır, bir daha değişmez." },
        { name: "onay_ani", type: "timestamptz", null: true, default: "", note: "Onayı taşıyan isteğin anı (saat arayüzü)." }
      ],
      indexes: [
        "karar_teslimleri_donem_id_kayit_id_karar_surumu_pk: PRIMARY KEY (donem_id, kayit_id, karar_surumu)",
        "karar_teslimleri_kisi_id_idx: (kisi_id); onay güncellemesi ve hesap silme",
        "karar_teslimleri_son_sunulma_ani_idx: (son_sunulma_ani); saklama işleyicisinin partileri (esitleme.donem_verisi)"
      ],
      constraints: [
        "karar_teslimleri_kisi_id_fk: FOREIGN KEY (kisi_id) REFERENCES kisiler (id)",
        "karar_teslimleri_sunulan_kurulum_id_fk: FOREIGN KEY (sunulan_kurulum_id) REFERENCES kurulumlar (kurulum_id) ON DELETE SET NULL; iki tablo da D06'nın",
        "karar_teslimleri_surum_ck: CHECK (karar_surumu >= 1 AND sunulan_durum_surumu >= 1)",
        "karar_teslimleri_sunum_ck: CHECK (son_sunulma_ani >= ilk_sunulma_ani)",
        "karar_teslimleri_teslim_ck: CHECK ((telefona_ulasti_ani IS NULL) = (onay_ani IS NULL) AND (telefona_ulasti_ani IS NULL OR (telefona_ulasti_ani = son_sunulma_ani AND onay_ani >= telefona_ulasti_ani)))"
      ]
    }
  ],

  endpoints: [
    {
      method: "POST",
      path: "/v1/esitleme/gonderim",
      client: "telefon",
      auth:
        "Rota tablosunda kimlik ['cihazImzasi', 'oturum'], roller ['ogrenci', 'personel'] (D13-B06). D13'ün kök oturum kancası Bearer'ı doğrular; geçersiz Bearer ve değişim bekleyen kısıtlı oturum (oturumHatasi KIMLIK_KAPSAM_SINIRLI) isteği düşürmez, istek.oturumHatasi'na yazılır ve istek oturumsuz sayılır. D06'nın kimlik kancası (kimlik-cozumu.ts, RotaUygulamasi.oncekiKancalar) D13'ün beyan denetiminden önce çalışır: oturumu istek.kimlik'ten okur (oturumDogrula'yı yeniden çağırmaz); ikinciCapa 'a' ya da 's' ise imzayı kayıtlı cihaz anahtarıyla doğrular (anahtar etkin, yenilenmiş, cihazı kapanmış ya da hesabı silinmiş olabilir) ve oturum yoksa istek.kimlik = { tur: 'cihaz', kaynak: 'imza', kisiId, cihazId } yazar (D13 Kimlik tipinin öbür alanları boş). Ne oturum ne geçerli imza varsa beyan denetimi 401 API_KIMLIK_GEREKLI verir. İkisi de varsa aynı kişi olmalı, kurulumun kişisi de o olmalı. Öğe düzeyinde türün rolü ve oturum isteği ayrıca aranır.",
      request: {
        "X-Kurulum-Kimligi (başlık)": "UUID (RFC 9562, her sürüm; telefon UUIDv7 üretir), zorunlu: bu paketin kurulumu. Rota şemasında değil D06 kancasında denetlenir; yoksa ya da UUID değilse 403 ESITLEME_KURULUM_KIMLIGI_GECERSIZ (telefon o kurulumu durdurur).",
        "Authorization (başlık)": "Bearer oturum anahtarı, isteğe bağlı: kurulumun hesabı bu telefonda girişliyse onun oturumu; değilse öğrencide Bearer'sız (yalnız imza), personelde paket gönderilmez.",
        "X-Uygulama-Surumu, X-Guncelleme-Kimligi, X-Platform, X-Kanal, X-Saat-Istegi (başlık)": "İsteğe bağlı (D13). Geçersiz değer isteği düşürmez, boş yazılır.",
        paketKimligi: "UUIDv7, zorunlu; her deneme ve bölünen her yarı yeni kimlik alır.",
        imlec: "metin (en çok 256) ya da null: telefonun sakladığı indirme imleci; öğrenci durum onayı ve degisiklikVar için.",
        bekleyenYoklamaSayisi: "tam sayı 0 ile 100000: bu paketin dışında bu kurulumda sonuçlanmamış yoklama_kaydi öğesi sayısı; öbür türler sayılmaz.",
        ikinciCapa: "null ya da D13'ün imzaliMetinSemasi ile kurulan nesne (imzaliTurler ['a', 's'], imzasizTurler ['o'], ek { anahtarId }): { metin: base64url (en çok 32768), imzaTuru: 'a' | 's' | 'o', imza: base64url (en çok 200) ya da null, anahtarId: UUID ya da null }. 'a' ve 's'de imza ve anahtarId zorunlu, 'o'da ikisi de null.",
        ikinciCapaYokNedeni: "null ya da 'ESITLEME_BOZUK' (D04 sabiti) | 'IMZALANAMADI' (telefon imzalayamadı, bağlamda PAKET_IMZASIZ olur); yalnız ikinciCapa null iken anlamlı.",
        ogeler: "dizi, en çok 200: { tur: metin (en çok 64), sira: tam sayı 1 ile 9007199254740991 (JSON sayı, D06-C06), ogeKimligi: metin (en çok 64), govde: metin (en çok 65536; ham metin, öğe türünün modülü ayrıştırır), ilkCapa: nesne ya da null (IlkCapaAlanlari, şeması packages/contracts/src/saat.ts; yalnız kaydında ilkCapaVar true olan türde), ulasmaMakbuzu: metin (en çok 128) ya da null }. Öğe içi biçim öğe başına denetlenir, paketi düşürmez.",
        yerelRetler: "dizi, en çok 200, gevşek zarf: { sira: tam sayı, ogeKimligi: metin (en çok 512) ya da null, tur: metin (en çok 512) ya da null, httpKodu: tam sayı, hataKodu: metin (en çok 512) ya da null }. D06 girdileri tek tek denetler; uymayan girdi (sıra 1 ile 2^53-1 dışında, istekte tekrar eden ya da ogeler'de bulunan sıra) atılır ve sayılır, istek bu yüzden hiçbir zaman 400 almaz. ogeler ile yerelRetler toplamı en az 1.",
        "gövde sınırı": "1 MiB (D13-B11); telefon paketi en çok 200 öğe ve 768 KiB ile kurar."
      },
      response: {
        sonuclar: "dizi, istekteki ogeler sırasıyla birebir: { sira, ogeKimligi, tur, sonuc: 'KABUL' | 'ZATEN_VAR' | 'RET' | 'TEKRAR_DENE', gerekce: metin ya da null, ulasmaAni: ISO 8601 UTC milisaniyeli ya da null (defterin kabul_ani'si), ulasmaMakbuzu: metin ya da null, beklemeSaniye: tam sayı ya da null, ayrinti: nesne ya da null (şeması öğe türünün modülünün sözleşmesinde) }; sonuc ve gerekce x-extensible-enum.",
        sonSira: "tam sayı: bu kurulumun kesintisiz son sırası.",
        degisiklikVar: "boolean: imleç nesil, genel sayaç ya da öğrenci durumu bakımından geride olabilir (kaba işaret); telefon değişenleri ister.",
        "X-Saat-Belgesi (başlık)": "Kök onSend kancası ekler (D13-B22, D04): rota saatBelgesi true; özne istek.kimlik'ten, imzayla gelen istekte D06 kancasının yazdığı cihaz; eşitleme bozukken yok."
      },
      errors: [
        "400 API_ISTEK_GECERSIZ (D13): zarf şemaya uymuyor; alan yolu ogeler ile başlıyorsa (200'ü aşan öğe, öğe zarfı) telefon böler, değilse kurulumu durdurur",
        "400 API_JSON_BOZUK (D13)",
        "401 API_KIMLIK_GEREKLI (D13 beyan denetimi): ne geçerli oturum ne geçerli paket imzası",
        "403 ESITLEME_KURULUM_KIMLIGI_GECERSIZ",
        "403 ESITLEME_KIMLIK_UYUSMUYOR",
        "403 ESITLEME_KURULUM_BASKA_HESABIN",
        "403 ESITLEME_KURULUM_ACILAMAZ",
        "403 ESITLEME_KURULUM_SINIRI",
        "413 API_GOVDE_COK_BUYUK (D13)",
        "415 API_ICERIK_TURU (D13)",
        "429 API_HIZ_SINIRI (D13), Retry-After ile",
        "503 API_SUNUCU_YOGUN (D13) ya da D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI: 57014 ve 25P04, VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ; bekleme { aralik: [15, 45] }), Retry-After ile",
        "503 ESITLEME_KURULUM_MESGUL, bekleme { sabit: 5 } (Retry-After 5)",
        "500 API_SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Öğe düzeyinde: (kurulum, sıra) defter anahtarı ve öğe kimliği. Aynı öğe yeniden gelirse işleyici yine çağrılır ve ZATEN_VAR döner (ilk ulaşma anıyla); KABUL olmuş satır değişmez; aynı sıra başka öğe kimliğiyle ya da aynı istekte ikinci kez gelirse RET ESITLEME_SIRA_CAKISMASI. Aynı kurulum için eşzamanlı iki istek kurulum satırı kilidinde sıraya girer. Ayrı Idempotency-Key yok (D13-B12).",
      rate_limit:
        "D13 hız sınıfı 'gonderim', kimlik kurulduktan sonraki kancada: anahtar doğrulanmış cihazdır (öğrencide oturumun ya da paket imzasının cihazı), cihaz yoksa giriş oturumudur (personel); dakikada 30 (D13-B09); X-Kurulum-Kimligi'ne bağlı değildir, başlığı değiştiren istemci sınırdan kaçamaz. Aşan 429 API_HIZ_SINIRI ve Retry-After. Kimliği kurulamayan istek (geçersiz Bearer, tutmayan imza) D13'ün girissiz IP sayacından düşer (teknik.html#sunucu-guvenlik). En düşük sürüm denetimi bu ucu hiçbir zaman kapatmaz (plan.html#dagitim-guncelleme-ilkesi)."
    },
    {
      method: "GET",
      path: "/v1/esitleme/degisiklikler",
      client: "telefon",
      auth:
        "Rota tablosunda kimlik ['oturum'], kimlikKaynaklari ['bearer'], roller ['ogrenci', 'personel'], defterYazar: true (GET olduğu hâlde D06'nın kendi izini yazar): geçerli oturum (Bearer), D13'ün kök oturum kancası (D01); çerezle gelen istek 403 API_ROL_YETKISIZ, değişim bekleyen kısıtlı oturum 403 KIMLIK_KAPSAM_SINIRLI (D13 beyan denetimi). Oturum yok, bitmiş ya da kapanmışsa kökte 401; personel telefonu yalnız 401'de çıkış gibi davranır. Oturumun kişisi kurulumun kişisi olmalı (değilse 403).",
      request: {
        "X-Kurulum-Kimligi (başlık)": "UUID (RFC 9562), zorunlu: isteği yapan hesabın bu kopyadaki kurulumu; yoksa ya da UUID değilse 403 ESITLEME_KURULUM_KIMLIGI_GECERSIZ. Çapraz site gezinmesi başlık koyamadığından çerezli bir gezinme bu uçta hiçbir şey yazamaz.",
        "Authorization (başlık)": "Bearer, zorunlu.",
        "imlec (sorgu)": "metin (en çok 256), isteğe bağlı; yoksa ya da tanınmazsa tam indirme.",
        "adet (sorgu)": "tam sayı 100 ile 5000, varsayılan 1000: sayfa satır hedefi. Tek sürümün satırları bölünmediğinden aşılabilir.",
        "yapiSurumu (sorgu)": "tam sayı 1 ile 10000, zorunlu: telefonun yerel veri yapısı sürümü (PRAGMA user_version).",
        "bekleyenYoklamaSayisi (sorgu)": "tam sayı 0 ile 100000, varsayılan 0: bu kurulumda sonuçlanmamış yoklama_kaydi sayısı."
      },
      response: {
        imlec: "metin: bu sayfa uygulandıktan sonra aynı yerel işlemde saklanır.",
        bastanIndir: "boolean: true ise bu sayfa yeni bir tam indirmenin ilk sayfasıdır (telefon yeni tam indirme numarası açar); hata kodu değil 200 cevabında alandır.",
        devamiVar: "boolean: true ise yeni imleçle hemen yeniden istenir.",
        tablolar: "{ [kaynakAdi]: Array<{ id: metin, silindi: boolean, veri: nesne ya da null }> }: yalnız satırı olan kaynaklar; silindi satırda veri null. Rol başına sütunlar kaynağı kaydeden modülün sözleşmesinde (D02 satırları için D02-B29).",
        ogrenci: "null ya da { bolumler: { [ad]: { tam: boolean, satirlar: Array<{ id, silindi, veri }> } } }: yalnız öğrencide ve durum sürümü imleçten ilerideyse; tam true ise telefon o bölümün yerel satırlarını bununla değiştirir. ogrenci_kayitlari bölümünün her satırı kararSurumu taşır.",
        sonSira: "tam sayı: bu kurulumun kesintisiz son sırası (her eşitlemede bildirilir).",
        "X-Saat-Belgesi (başlık)": "Kök onSend kancası ekler (D13-B22, D04); rota saatBelgesi true."
      },
      errors: [
        "400 API_ISTEK_GECERSIZ (D13): sorgu şemaya uymuyor",
        "401 D01 oturum kodları ya da API_KIMLIK_GEREKLI (kök kanca)",
        "403 API_ROL_YETKISIZ (D13): kimlik kaynağı bearer değil",
        "403 KIMLIK_KAPSAM_SINIRLI (D13 beyan denetimi): değişim bekleyen kısıtlı oturum",
        "403 ESITLEME_KURULUM_KIMLIGI_GECERSIZ",
        "403 ESITLEME_KURULUM_BASKA_HESABIN",
        "403 ESITLEME_KURULUM_SINIRI",
        "429 API_HIZ_SINIRI (D13), Retry-After ile",
        "503 API_SUNUCU_YOGUN (D13) ya da D12.islem'in geçici kodları (VERITABANI_ZAMAN_ASIMI, VERITABANI_KILITLENME, VERITABANI_HAVUZ_DOLU, VERITABANI_ERISILEMEZ, VERITABANI_NESIL_BELIRSIZ; bekleme { aralik: [15, 45] }), Retry-After ile",
        "500 API_SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Güvenli: iş verisini değiştirmez (D13-B08 GET kuralı); rota defterYazar: true beyan eder, çünkü yalnız D06'nın kendi izini yazar (son temas, karar sunumu, onay); aynı istek iki kez gelirse aynı veri döner ve onay bir kez yazılır.",
      rate_limit: "D13 hız sınıfı 'oturum': oturum başına dakikada 120 (D13-B09)."
    }
  ],

  jobs: [
    {
      name: "sira_boslugu_raporu",
      schedule:
        "jobs/esitleme/index.ts'teki export const isler dizisinde D14.isTanimla ile: kuyruk SIRA_BOSLUGU_RAPORU (KuyrukTanimi modules/esitleme/kuyruklar.ts'te; politika exclusive, veri şeması boş nesne), sureAsimiSaniye 600, zamanlama { cron: '10 5 * * *' } (Europe/Istanbul; D14 çizelgesindeki yer: 02:15 gecelik pg_dump ve 05:00 saklama işinden sonra, 03:00 ile 05:00 arasındaki günlük iş yasağının dışında, komşu işlerden en az 5 dakika uzakta). Kaçırılan çalıştırma D14'ün günlük iş kuralıyla bir kez (D14-B04).",
      idempotency:
        "İş verisi boştur; raporun İstanbul günü IsBaglami.tetiklemeAni'dan D04'ün istanbulTarihi yardımcısıyla türetilir. exclusive politika aynı anda ikinci çalışmayı engeller. Sonuç defterin o anki halinden hesaplanır; aynı gün iki kez çalışınca aynı boşluk durumu yazılır (senaryosu D14'ün 'aynı veriyle iki kez çalışırsa' adımıyla).",
      does:
        "Rapor adımı: kesintisiz_son_sira < en_buyuk_sira ya da acik_bosluk_sayisi > 0 olan kurulum satırlarını 100'lük kısa işlemlerle tarar. Her işlem satırları SELECT ... FOR UPDATE SKIP LOCKED ile alır (gönderimin kilitlediği satır atlanır, sayılır, ertesi gün yeniden bakılır); kilit altında kesintisiz son sıranın üstündeki defter satırlarını LEAD ile sıralayıp eksik sıra sayısını ve ilk eksik sırayı bulur (boşluk aralığını üretmez, satır sayısıyla sınırlıdır) ve aynı işlemde acik_bosluk_sayisi, ilk_eksik_sira ve bosluk_denetim_ani yazar, boşluğu kapanmış satırı sıfırlar; okuma ile yazma arasında su seviyesi değişemez. Temizlik adımı (contracts: her modül kendi geçici verisini kendi işiyle siler): kesintisiz son sıranın altında kalan ve son görülmesi 400 günden eski defter satırlarını ve 400 gündür temassız ve boşluksuz kurulum satırlarını 5000'lik işlemlerle siler (karar_teslimleri bu işte değil, esitleme.donem_verisi saklama işleyicisinde silinir). Sonunda tek log satırı: boşluklu kurulum sayısı, 24 saatten eski boşluk sayısı (sira_ilerleme_ani), toplam eksik sıra, kilitli diye atlanan satır, önceki İstanbul gününün gerekçe koduna göre RET ve TEKRAR_DENE sayıları, silinen satır sayıları; numara, isim ve gövde yok. D15'in olcum_ görünümleri kurulumlar ve gonderim_defteri tablolarını okur."
    }
  ]
};

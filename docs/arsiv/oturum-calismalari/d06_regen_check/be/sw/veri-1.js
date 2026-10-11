// D06 spec data, part 1: summary, tables, endpoints, jobs. Rendered by build.js into spec/D06.json and frag/D06.html.
module.exports = {
  id: "D06",
  module: "esitleme",
  summary:
    "esitleme modülü telefonun ortak kuyruğunu tek uçtan (POST /v1/esitleme/gonderim) alır, her öğeyi türünün sahibine aynı veritabanı işleminde dağıtır ve her (kurulum, sıra) için tek defter satırı tutar; bozuk öğe paketi düşürmez, her öğeye KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE döner. " +
    "Kurulum, bir uygulama kopyasında bir hesabın kuyruğudur; kesintisiz son sıra her eşitlemede telefona bildirilir, yedekten dönüşte telefon sonrakileri yeniden gönderir ve imzalı ulaşma makbuzu ilk ulaşma anını korur. " +
    "İndirme (GET /v1/esitleme/degisiklikler) tek sayaç satırından alınan sürümle artımlıdır; imleç nesli, genel ve kapsam sürümünü, öğrencinin durum sürümünü, yerel yapı sürümünü ve hesap özetini taşır, nesil, kapsam ya da yapı değişince baştan indir der ve gönderme kuyruğuna dokunmaz. " +
    "Öğrencinin kendi kayıtları, kararları, düzeltmeleri ve devam durumu öğrenci başına sürümle iner; telefonun imleçle sakladığını bildirdiği sürüm, kararın telefona ulaştığı anı (sorun bildirme süresinin başı) yazar. " +
    "Modül iş kuralı tutmaz: öğe işleyicileri ve indirme kaynakları sahip modüllerin eklentisinde ogeTuruKaydet ve indirmeKaynagiKaydet ile kaydolur.",

  tables: [
    {
      name: "gonderim_defteri",
      purpose:
        "Her kurulumdan gelen her kuyruk öğesinin tek satırı (bütün öğe türleri). Kesintisiz son sıranın, sıra çakışmasının, tekrar gönderim sayısının ve sıra boşluğu ölçüsünün kaynağı. Öğenin içeriğini değil taşınmasını saklar; içerik öğe sahibinin tablosundadır.",
      columns: [
        { name: "kurulum_id", type: "uuid", null: false, default: "", note: "Kurulum (kurulumlar.kurulum_id); telefonun ürettiği UUIDv7." },
        { name: "sira", type: "bigint", null: false, default: "", note: "Kurulumun sırası: 1'den başlar, boşluksuz artar, dönemle sıfırlanmaz. JSON'da sayı (2^53 altında kalır)." },
        { name: "oge_kimligi", type: "uuid", null: true, default: "", note: "Öğenin UUIDv7 kimliği; yalnız zarfı çözülemeyen öğede (ESITLEME_OGE_GECERSIZ) boş." },
        { name: "oge_turu", type: "text", null: true, default: "", note: "Öğe türü (ör. yoklama_kaydi); desene uymayan değer boş yazılır." },
        { name: "sonuc", type: "text", null: false, default: "", note: "KABUL, ZATEN_VAR, RET ya da TEKRAR_DENE. KABUL ve ZATEN_VAR olmuş satır başka sonuca dönmez." },
        { name: "gerekce", type: "text", null: true, default: "", note: "RET ve TEKRAR_DENE kodu: ESITLEME_ önekli ya da öğe sahibinin kodu. KABUL ve ZATEN_VAR'da boş." },
        { name: "ilk_gorulme_ani", type: "timestamptz", null: false, default: "", note: "Öğenin geldiği ilk paketin ulaşma anı (saat arayüzü, paket başına bir kez okunur)." },
        { name: "son_gorulme_ani", type: "timestamptz", null: false, default: "", note: "Öğenin geldiği son paketin ulaşma anı." },
        { name: "kabul_ani", type: "timestamptz", null: true, default: "", note: "Öğenin sunucuya ulaşma anı: ilk KABUL ya da ZATEN_VAR anı; geçerli ulaşma makbuzuyla yeniden gelen öğede makbuzdaki an. Ulaşma makbuzu bu anı imzalar." },
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
        "gonderim_defteri_oge_ck: CHECK ((oge_kimligi IS NOT NULL AND oge_turu ~ '^[a-z][a-z0-9_]{1,63}$') OR gerekce = 'ESITLEME_OGE_GECERSIZ')",
        "gonderim_defteri_gorulme_ck: CHECK (gorulme_sayisi >= 1 AND son_gorulme_ani >= ilk_gorulme_ani)",
        "gonderim_defteri_surum_ck: CHECK (gonderen_uygulama_surumu IS NULL OR char_length(gonderen_uygulama_surumu) <= 32)"
      ]
    },
    {
      name: "kurulumlar",
      purpose:
        "Bir uygulama kopyasında bir hesabın kuyruğunun sunucudaki kalıcı izi (öğrenci ve personel): kesintisiz son sıra, en büyük sıra, son temas, bekleyen öğe sayısı, sürüm ve kanal, sıra boşluğu durumu. Kişisi açılışta yazılır, değişmez. Giriş güveninde kullanılmaz; tanınan cihaz kaydı değildir (teknik.html#sunucu-kimlik).",
      columns: [
        { name: "kurulum_id", type: "uuid", null: false, default: "", note: "Birincil anahtar: telefonun bu hesap için ürettiği UUIDv7 (X-Kurulum-Kimligi); sunucu üretmez." },
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Kurulumun hesabı (kisiler.id, D01); satır açılırken isteğin doğrulanmış kişisinden yazılır, sonra değişmez." },
        { name: "rol", type: "text", null: false, default: "", note: "OGRENCI ya da PERSONEL; açılıştaki kişiden." },
        { name: "son_cihaz_id", type: "uuid", null: true, default: "", note: "Öğrencide son isteğin cihazı (oturumdan ya da paket imzasından; cihazlar.id, D01). Personelde boş." },
        { name: "platform", type: "text", null: true, default: "", note: "X-Platform; D13 sözleşmesindeki listede değilse boş." },
        { name: "kanal", type: "text", null: true, default: "", note: "X-Kanal; D13 sözleşmesindeki listede değilse boş." },
        { name: "uygulama_surumu", type: "text", null: true, default: "", note: "X-Uygulama-Surumu (en çok 32 karakter)." },
        { name: "guncelleme_kimligi", type: "uuid", null: true, default: "", note: "X-Guncelleme-Kimligi (expo-updates updateId)." },
        { name: "yapi_surumu", type: "integer", null: true, default: "", note: "Telefonun yerel veri yapısı sürümü (PRAGMA user_version); indirme isteğinden." },
        { name: "kesintisiz_son_sira", type: "bigint", null: false, default: "0", note: "En büyük n ki 1..n her sıra defterde bir satıra sahip; her eşitlemede sonSira olarak döner." },
        { name: "en_buyuk_sira", type: "bigint", null: false, default: "0", note: "Defterdeki en büyük sıra." },
        { name: "sira_ilerleme_ani", type: "timestamptz", null: true, default: "", note: "kesintisiz_son_sira'nın son ilerlediği an; açık boşluğun yaşı buradan ölçülür." },
        { name: "bekleyen_oge_sayisi", type: "integer", null: false, default: "0", note: "Son temasta telefonun bildirdiği sonuçlanmamış öğe sayısı; gönderimde paketin TEKRAR_DENE öğeleri eklenir." },
        { name: "son_temas_ani", type: "timestamptz", null: false, default: "", note: "Son doğrulanmış gönderim ya da indirme anı (saat arayüzü); KARAR BEKLİYOR hesabının girdisi." },
        { name: "son_gonderim_ani", type: "timestamptz", null: true, default: "", note: "Son başarılı gönderimin anı." },
        { name: "son_indirme_ani", type: "timestamptz", null: true, default: "", note: "Son başarılı indirmenin anı." },
        { name: "acik_bosluk_sayisi", type: "integer", null: false, default: "0", note: "sira_boslugu_raporu'nun bulduğu eksik sıra sayısı (kesintisiz son sıranın üstünde)." },
        { name: "ilk_eksik_sira", type: "bigint", null: true, default: "", note: "İlk eksik sıra; boşluk yoksa boş." },
        { name: "bosluk_denetim_ani", type: "timestamptz", null: true, default: "", note: "Son boşluk denetiminin anı." },
        { name: "olusturma_ani", type: "timestamptz", null: false, default: "", note: "Satırın açıldığı an (saat arayüzü)." }
      ],
      indexes: [
        "kurulumlar_kurulum_id_pk: PRIMARY KEY (kurulum_id)",
        "kurulumlar_kisi_id_idx: (kisi_id); kurulumSonTemasi, kişi başına 20 kurulum sınırı ve hesap silme",
        "Depolama: fillfactor 80. İndirmedeki son temas güncellemesi dizinli sütuna dokunmaz, HOT güncelleme kalır."
      ],
      constraints: [
        "kurulumlar_kisi_id_fk: FOREIGN KEY (kisi_id) REFERENCES kisiler (id)",
        "kurulumlar_son_cihaz_id_fk: FOREIGN KEY (son_cihaz_id) REFERENCES cihazlar (id)",
        "kurulumlar_rol_ck: CHECK (rol IN ('OGRENCI', 'PERSONEL') AND (rol = 'OGRENCI' OR son_cihaz_id IS NULL))",
        "kurulumlar_sira_ck: CHECK (kesintisiz_son_sira >= 0 AND en_buyuk_sira >= kesintisiz_son_sira)",
        "kurulumlar_sayilar_ck: CHECK (bekleyen_oge_sayisi BETWEEN 0 AND 100000 AND acik_bosluk_sayisi >= 0 AND (ilk_eksik_sira IS NULL OR ilk_eksik_sira > kesintisiz_son_sira))",
        "kurulumlar_yapi_surumu_ck: CHECK (yapi_surumu IS NULL OR yapi_surumu BETWEEN 1 AND 10000)",
        "kurulumlar_metin_ck: CHECK (char_length(coalesce(uygulama_surumu, '')) <= 32 AND char_length(coalesce(platform, '')) <= 16 AND char_length(coalesce(kanal, '')) <= 16)"
      ]
    },
    {
      name: "degisiklik_sayaci",
      purpose:
        "Telefona inen bütün tabloların değişiklik sürümünü veren tek satırlık sayaç. surumAl satırı işlem sonuna kadar kilitler; bu yüzden sürümler yazma işlemlerinin bitiş sırasıyla verilir ve okuyucu henüz bitmemiş bir sürümün üstüne geçemez (teknik.html#kod-veri-modeli).",
      columns: [
        { name: "id", type: "smallint", null: false, default: "1", note: "Tek satır; değeri her zaman 1." },
        { name: "surum", type: "bigint", null: false, default: "0", note: "Son verilen değişiklik sürümü; surumAl satırı kilitleyip bir artırır." },
        { name: "en_eski_gecerli_surum", type: "bigint", null: false, default: "0", note: "Genel sürümü bundan küçük imleç baştan indirir. Yalnız D06 göçüyle yükseltilir (ör. bir veri düzeltmesinden sonra herkese baştan indirme)." }
      ],
      indexes: ["degisiklik_sayaci_id_pk: PRIMARY KEY (id)"],
      constraints: [
        "degisiklik_sayaci_id_ck: CHECK (id = 1)",
        "degisiklik_sayaci_surum_ck: CHECK (surum >= 0 AND en_eski_gecerli_surum BETWEEN 0 AND surum)",
        "İlk göç tek satırı (1, 0, 0) ekler; satır silinmez."
      ]
    },
    {
      name: "ogrenci_durum_surumleri",
      purpose:
        "Öğrenci başına durum sürümü: öğrencinin kendi kayıtları, kararları, düzeltmeleri, sorun bildirimleri ve devam durumu değişince aynı işlemde artar. Telefonun imleçle sakladığını bildirdiği en büyük sürüm karar teslim anının kaynağıdır. Genel sayaçtan ayrıdır; ders çıkışındaki gönderim yolu sıcak satır üretmez.",
      columns: [
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Öğrenci (kisiler.id, D01); birincil anahtar." },
        { name: "surum", type: "bigint", null: false, default: "0", note: "Öğrencinin kendi verisinin sürümü; ogrenciDurumuDegisti satırı kilitleyip bir artırır, satır yoksa 1 ile açar." },
        { name: "onaylanan_surum", type: "bigint", null: false, default: "0", note: "Telefonun imleçle sakladığını bildirdiği en büyük sürüm." },
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
        "Bir yoklama kaydının her karar sürümünün öğrencinin telefonuna sunulduğu ve telefonun sakladığını bildirdiği an. Sorun bildirme süresi (3 gün) bu andan başlar (plan.html#kararlar-supheli-kayit); karar değişince sürenin yeniden başlayıp başlamadığı D09'un kuralıdır.",
      columns: [
        { name: "donem_id", type: "uuid", null: false, default: "", note: "Kaydın dönemi; (donem_id, kayit_id) yoklama_kayitlari'na başvurur (teknik.html#veritabani-donem-alani)." },
        { name: "kayit_id", type: "uuid", null: false, default: "", note: "Yoklama kaydının kimliği." },
        { name: "karar_surumu", type: "integer", null: false, default: "", note: "Kararın sürümü (D07 karar geçmişi numarası); öğrenci kaynağı (D05) verir." },
        { name: "kisi_id", type: "uuid", null: false, default: "", note: "Kaydın öğrencisi (kisiler.id)." },
        { name: "sunulan_durum_surumu", type: "bigint", null: false, default: "", note: "Bu karar sürümünü taşıyan son sunumun öğrenci durum sürümü." },
        { name: "ilk_sunulma_ani", type: "timestamptz", null: false, default: "", note: "Karar sürümünün telefona ilk gönderildiği an." },
        { name: "son_sunulma_ani", type: "timestamptz", null: false, default: "", note: "Onaydan önceki son gönderim anı; cevap kaybolup yeniden sunulursa ilerler." },
        { name: "telefona_ulasti_ani", type: "timestamptz", null: true, default: "", note: "Telefonun sakladığı sunumun anı: onay gelince son_sunulma_ani yazılır, bir daha değişmez." },
        { name: "onay_ani", type: "timestamptz", null: true, default: "", note: "Onayı taşıyan isteğin anı (saat arayüzü)." }
      ],
      indexes: [
        "karar_teslimleri_donem_id_kayit_id_karar_surumu_pk: PRIMARY KEY (donem_id, kayit_id, karar_surumu)",
        "karar_teslimleri_kisi_id_idx: (kisi_id); onay güncellemesi ve hesap silme"
      ],
      constraints: [
        "karar_teslimleri_donem_id_kayit_id_fk: FOREIGN KEY (donem_id, kayit_id) REFERENCES yoklama_kayitlari (donem_id, id) ON DELETE NO ACTION; kayıt saklama silmesinde D06'nın işleyicisi önce bu satırları siler",
        "karar_teslimleri_kisi_id_fk: FOREIGN KEY (kisi_id) REFERENCES kisiler (id)",
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
        "Kişi isteğin kendisinden çözülür: geçerli oturum (Bearer; öğrenci ya da personel, D01.oturumDogrula) ya da ikinci çapa bölümünün D01'de kayıtlı bir cihaz anahtarıyla geçerli imzası (anahtar etkin, yenilenmiş, cihazı değişmiş ya da hesabı silinmiş olabilir). En az biri gerekir; ikisi de varsa aynı kişi, o kişi de kurulumun kişisi olmalı. Rota tablosunda kimlik ['cihaz-imzasi', 'oturum'] ve geçersiz Bearer kökte 401 değildir (D13-B06). Öğe düzeyinde türün rolü ve oturum isteği ayrıca aranır.",
      request: {
        "X-Kurulum-Kimligi (başlık)": "UUIDv7, zorunlu: bu paketin kurulumu (bir kopyada bir hesabın kuyruğu). Yoksa ya da geçersizse 400 ESITLEME_KURULUM_KIMLIGI_GECERSIZ.",
        "Authorization (başlık)": "Bearer oturum anahtarı, isteğe bağlı; yoksa paket imzası gerekir.",
        "X-Uygulama-Surumu, X-Guncelleme-Kimligi, X-Platform, X-Kanal, X-Saat-Istegi (başlık)": "İsteğe bağlı (D13). Geçersiz değer isteği düşürmez, boş yazılır.",
        paketKimligi: "UUIDv7, zorunlu; her deneme ve bölünen her yarı yeni kimlik alır.",
        imlec: "metin (en çok 256) ya da null: telefonun sakladığı indirme imleci; öğrenci durum onayı ve degisiklikVar için.",
        bekleyenOgeSayisi: "tam sayı 0 ile 100000: bu paketin dışında bu kurulumda sonuçlanmamış öğe sayısı.",
        ikinciCapa: "null ya da { metin: base64url (en çok 32768), imzaTuru: 'a' | 's' | 'o', imza: base64url (en çok 200) ya da null, anahtarId: UUID ya da null }. 'a' ve 's'de imza ve anahtarId zorunlu, 'o'da ikisi de null.",
        ikinciCapaYokNedeni: "null ya da 'esitleme_bozuk' | 'imzalanamadi'; yalnız ikinciCapa null iken anlamlı.",
        ogeler: "dizi, en çok 200: { tur: metin (en çok 64), sira: tam sayı 1 ile 9007199254740991, ogeKimligi: metin (en çok 64), govde: metin (en çok 65536), ilkCapa: nesne ya da null (IlkCapaAlanlari, şeması packages/contracts/src/saat.ts; yalnız işlem anı taşıyan personel işlerinde), ulasmaMakbuzu: metin (en çok 128) ya da null }. Öğe içi biçim öğe başına denetlenir, paketi düşürmez.",
        yerelRetler: "dizi, en çok 200: { sira, ogeKimligi: metin (en çok 64), tur: metin (en çok 64), httpKodu: 400 ile 499, hataKodu: metin (en çok 64) ya da null }; ogeler ile yerelRetler toplamı en az 1.",
        "gövde sınırı": "1 MiB (D13-B11); telefon paketi en çok 200 öğe ve 768 KiB ile kurar."
      },
      response: {
        sonuclar: "dizi, istekteki ogeler sırasıyla birebir: { sira, ogeKimligi, tur, sonuc: 'KABUL' | 'ZATEN_VAR' | 'RET' | 'TEKRAR_DENE', gerekce: metin ya da null, ulasmaAni: ISO 8601 UTC milisaniyeli ya da null, ulasmaMakbuzu: metin ya da null, beklemeSaniye: tam sayı ya da null, ayrinti: nesne ya da null (şeması öğe türünün sahibinin sözleşmesinde) }; sonuc ve gerekce x-extensible-enum.",
        sonSira: "tam sayı: bu kurulumun kesintisiz son sırası.",
        degisiklikVar: "boolean: imleç nesil, genel sayaç ya da öğrenci durumu bakımından geride olabilir (kaba işaret); telefon değişenleri ister.",
        "X-Saat-Belgesi (başlık)": "Kök kanca ekler (D13, D04); eşitleme bozukken yok."
      },
      errors: [
        "400 D13 doğrulama hatası: zarf şemaya uymuyor ya da 200'ü aşan öğe (telefon ikiye böler)",
        "400 ESITLEME_KURULUM_KIMLIGI_GECERSIZ",
        "401 ESITLEME_KIMLIK_YOK",
        "401 ESITLEME_KIMLIK_UYUSMUYOR",
        "403 ESITLEME_KURULUM_SINIRI",
        "413 GOVDE_COK_BUYUK (D13)",
        "415 JSON dışı içerik (D13)",
        "429 D13 hız sınırı, Retry-After ile",
        "503 SUNUCU_YOGUN (D13), Retry-After ile",
        "503 ESITLEME_KURULUM_MESGUL, Retry-After 5",
        "500 SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Öğe düzeyinde: (kurulum, sıra) defter anahtarı ve öğe kimliği. Aynı öğe yeniden gelirse işleyici yine çağrılır ve ZATEN_VAR döner (ilk ulaşma anıyla); KABUL olmuş satır değişmez; aynı sıra başka öğe kimliğiyle gelirse RET ESITLEME_SIRA_CAKISMASI. Aynı kurulum için eşzamanlı iki istek kurulum satırı kilidinde sıraya girer. Ayrı Idempotency-Key yok (D13-B12).",
      rate_limit:
        "D13.hizSinifi('esitleme_gonderim'): X-Kurulum-Kimligi başına dakikada 30 istek (D13-B09); aşan 429 ve Retry-After. IP sınırı yok (kampüs NAT). En düşük sürüm denetimi bu ucu hiçbir zaman kapatmaz (plan.html#dagitim-guncelleme-ilkesi)."
    },
    {
      method: "GET",
      path: "/v1/esitleme/degisiklikler",
      client: "telefon",
      auth:
        "Geçerli oturum (Bearer): öğrenci ya da personel, kök oturum kancası (D01). Oturum yok, bitmiş ya da kapanmışsa kökte 401; personel telefonu 401'de çıkış gibi davranır. Oturumun kişisi kurulumun kişisi olmalı.",
      request: {
        "X-Kurulum-Kimligi (başlık)": "UUIDv7, zorunlu: isteği yapan hesabın bu kopyadaki kurulumu.",
        "Authorization (başlık)": "Bearer, zorunlu.",
        "imlec (sorgu)": "metin (en çok 256), isteğe bağlı; yoksa ya da tanınmazsa tam indirme.",
        "adet (sorgu)": "tam sayı 100 ile 5000, varsayılan 1000: sayfa satır hedefi. Tek sürümün satırları bölünmediğinden aşılabilir.",
        "yapiSurumu (sorgu)": "tam sayı 1 ile 10000, zorunlu: telefonun yerel veri yapısı sürümü (PRAGMA user_version).",
        "bekleyenOgeSayisi (sorgu)": "tam sayı 0 ile 100000, varsayılan 0: bu kurulumda sonuçlanmamış öğe sayısı."
      },
      response: {
        imlec: "metin: bu sayfa uygulandıktan sonra aynı yerel işlemde saklanır.",
        bastanIndir: "boolean: true ise bu sayfa tam indirmenin ilk sayfasıdır; hata kodu değil 200 cevabında alandır.",
        devamiVar: "boolean: true ise yeni imleçle hemen yeniden istenir.",
        tablolar: "{ [kaynakAdi]: Array<{ id: metin, silindi: boolean, veri: nesne ya da null }> }: yalnız satırı olan kaynaklar; silindi satırda veri null. Rol başına sütunlar kaynağın sahibinin sözleşmesinde.",
        ogrenci: "null ya da { bolumler: { [ad]: { tam: boolean, satirlar: Array<{ id, silindi, veri }> } } }: yalnız öğrencide ve durum sürümü imleçten ilerideyse; tam true ise telefon o bölümün yerel satırlarını bununla değiştirir.",
        sonSira: "tam sayı: bu kurulumun kesintisiz son sırası (her eşitlemede bildirilir).",
        "X-Saat-Belgesi (başlık)": "Kök kanca ekler (D13, D04)."
      },
      errors: [
        "400 D13 doğrulama hatası (sorgu)",
        "400 ESITLEME_KURULUM_KIMLIGI_GECERSIZ",
        "401 D01 oturum kodları (kök kanca)",
        "401 ESITLEME_KIMLIK_UYUSMUYOR",
        "403 ESITLEME_KURULUM_SINIRI",
        "429 D13 hız sınırı, Retry-After ile",
        "503 SUNUCU_YOGUN (D13), Retry-After ile",
        "500 SUNUCU_HATASI (D13)"
      ],
      idempotency:
        "Güvenli: kullanıcı verisini değiştirmez. Yalnız D06 defterine yazar (son temas, karar sunumu, onay); aynı istek iki kez gelirse aynı veri döner ve onay bir kez yazılır. Rota tablosunda defter yazan GET olarak işaretlenir, çerez kabul etmez.",
      rate_limit: "Oturum başına dakikada 120 (D13-B09 girişli uç sınıfı)."
    }
  ],

  jobs: [
    {
      name: "sira_boslugu_raporu",
      schedule:
        "Her gün 05:10 Europe/Istanbul (D14 zamanlama çizelgesindeki yer; 03:30 gecelik pg_dump ve 05:00 saklama işinden sonra), pg-boss zamanlaması, politika exclusive, işçi kapalıysa açılınca bir kez (missed: once), süre aşımı 600 saniye.",
      idempotency:
        "Tekillik anahtarı İstanbul günü; iş verisi yalnız gün (YYYY-MM-DD) taşır. Sonuç defterin o anki halinden hesaplanır; aynı gün iki kez çalışınca aynı boşluk durumu yazılır.",
      does:
        "Birinci adım, rapor: kesintisiz_son_sira < en_buyuk_sira ya da acik_bosluk_sayisi > 0 olan kurulum satırlarını 500'lük işlemlerle tarar. Her biri için kesintisiz son sıranın üstündeki defter satırlarını LEAD ile sıralayıp eksik sıra sayısını ve ilk eksik sırayı bulur (boşluk aralığını üretmez, satır sayısıyla sınırlıdır); acik_bosluk_sayisi, ilk_eksik_sira ve bosluk_denetim_ani yazar, boşluğu kapanmış satırı sıfırlar. İkinci adım, temizlik (contracts: her modül kendi geçici verisini kendi işiyle siler): kesintisiz son sıranın altında kalan ve son görülmesi 400 günden eski defter satırlarını, 400 gündür temassız ve boşluksuz kurulum satırlarını 5000'lik işlemlerle siler. Sonunda tek log satırı: boşluklu kurulum sayısı, 24 saatten eski boşluk sayısı (sira_ilerleme_ani), toplam eksik sıra, önceki İstanbul gününün gerekçe koduna göre RET ve TEKRAR_DENE sayıları, silinen satır sayıları; numara, isim ve gövde yok. D15'in olcum_ görünümleri kurulumlar ve gonderim_defteri tablolarını okur."
    }
  ]
};

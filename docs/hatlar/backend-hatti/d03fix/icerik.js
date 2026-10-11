// D03 (listeler) spec content: single source for spec/D03.json and frag/D03.html.
// Plain Turkish, no U+2013/U+2014. build-d03.js validates and renders this.
'use strict';

const summary = "listeler modülü bir şubenin öğrenci listesini tutar: satır öğrenciyi numara ve dosyadaki adla tutar, hiç silinmez, listeden çıkan pasif olur; bir derste bir numaranın üyelik aralıkları kesişmez. Dosyayı panel okur, sunucuya yalnız eşlenmiş satırlar JSON olarak gider; sunucu farkı hesaplar, önizleme hiçbir şey yazmaz ve farkın özetini döner, uygulama bu özetle tek işlemde yürür ve aynı dosyanın ikinci kez gelmesi zararsızdır. Uygulama aynı işlemde kayıtlı dinleyicileri eşleştirme, karar ve devam hesabı sırasıyla çağırır (karar ve devam iş kuyruğuyla); bekleyen öğrenci kayıtlarıyla yarışı numaranın kovasındaki danışma kilidi önler, telefona inen sürüm işlemin son adımında alınır. Üyelik, numara ile eşleştirme, satır okuma ve deneme listesi öbür modüllere dış yüzden verilir; D03 kendisi D02'ye liste kaynağı, D06'ya indirme ve öğrenci kapsam kaynağı, D12'ye saklama işleyicisi olarak kaydolur; muaf işaretini yalnız D08'in ucu muafIsaretle ile yazar. Dönem kilidinden sonra liste salt okunurdur ve geçmiş dönemin satırı eşleşmeye girmez; numara ve isim adres satırına, loga, kilit anahtarına ve iş verisine girmez.";

const col = (name, type, nul, def, note) => ({ name, type, null: nul, default: def, note });

const tables = [
  {
    name: 'liste_satirlari',
    kisa: 'öğrenci satırı; hiç silinmez, pasif olur',
    purpose: "Bir şubenin ders listesindeki öğrenci satırı. Öğrenciyi hesapla değil numara ve dosyadaki adla tutar; hiç silinmez, listeden çıkan pasif olur, yalnız saklama süresi dolunca numara ve ad silinir. Telefona inen tablodur (hocaya şubenin bütün satırları, öğrenciye yalnız kendi satırı); D10 yalnız okur, bu yüzden sütun adları önce genişlet sonra daralt ile değişir.",
    columns: [
      col('id', 'uuid', false, 'uuidv7()', "Satır kimliği; adres satırında satır bununla anılır, dışa açık jeton değildir."),
      col('sube_id', 'uuid', false, '', "Şube (subeler, D02). Yükleme tek şubeye yapılır."),
      col('ders_id', 'uuid', false, '', "Şubenin dersi; yazılırken D02.subeGetir'den kopyalanır. Derste tek etkin satır dizini ve (ders, numara) kuralları için gerekir (kısmi dizin yalnız kendi tablosunu görür)."),
      col('donem_id', 'uuid', false, '', "Dersin dönemi; kopya. Saklama işleyicisi, açık dönem süzgeci ve dönem sorguları için."),
      col('birim_id', 'uuid', true, '', "Dersin birimi (birimler, D02); yazılırken D02.dersGetir'den kopyalanır, deneme dersinde boş. Saklama işleyicisi (birim döneminin kilit anı) ve açık dönem süzgeci okur; D03 dersler tablosunu okumaz."),
      col('ogrenci_no', 'text', true, '', "9 ya da 10 ASCII rakam, metin (baştaki 0 korunur). Yalnız saklama süresi dolunca boşalır."),
      col('ad_soyad', 'text', true, '', "Görünen ad: NFC, boşluklar sadeleşmiş, harfler dosyadaki gibi; 1 ile 200 karakter. Yalnız saklama süresi dolunca boşalır."),
      col('sira', 'integer', false, '', "Etkin satırlarda son yüklemenin dosya sırası (1, 2, 3); elle eklenen en büyük artı 1; pasif satır son sırasını korur. Tekil değildir, sıralama (sira, id)."),
      col('kaynak', 'text', false, '', "Üyeliği son kuran yol: DOSYA, ELLE (elle ekleme ve PATCH canlandırması) ya da SISTEM (denemeListesiniKur) (CHECK)."),
      col('eklenme_ani', 'timestamptz', false, '', "Şubeye ilk eklendiği an (saat arayüzünden). Canlanınca korunur."),
      col('pasif_ani', 'timestamptz', true, '', "Listeden çıktığı an; boşsa etkin. Canlanınca boşalır; aynı dersteki başka satırın canlanması aralığı kesince kırpılır (D03-A04)."),
      col('gec_kayit_secimi', 'text', false, "'ONCEKI_SAYILMAZ'", "Ekle-bırak (ONCEKI_SAYILMAZ) ya da Md.9/4 geç kayıt (ONCEKI_YOK); (ders, numara) başına tek değer: yazan her yol numaranın o dersteki bütün satırlarına aynı işlemde yazar, şube değişimi hedef satıra kopyalar. Anlamı ve hesabı D08'in. Telefona inmez."),
      col('muaf', 'boolean', false, 'false', "Devamdan muaf; (ders, numara) başına tek değer, bütün satırlara yazılır. Yalnız muafIsaretle (D08'in ucu) değiştirir; şube değişimi değeri hedef satıra kopyalar, bunun dışında yükleme yazmaz. Telefona inmez, D08'in devam durumuyla iner."),
      col('ilk_yukleme_id', 'uuid', true, '', "Satırı açan yükleme (liste_yuklemeleri); elle ve sistemde boş."),
      col('son_yukleme_id', 'uuid', true, '', "Satıra en son dokunan yükleme."),
      col('degistiren_kisi_id', 'uuid', true, '', "Son değiştiren kişi (kisiler, D01); sistem yazımında boş."),
      col('degisiklik_ani', 'timestamptz', false, '', "Son değişiklik anı (saat arayüzünden)."),
      col('degisiklik_surumu', 'bigint', false, '0', "Telefona inen sürüm. Yalnız inen bir sütun (numara, ad, sıra, eklenme, pasif, silinme) değişince işlemin son adımında D06.surumAl ile yazılır; işlem içinde geçici 0. JSON'da metin."),
      col('uyelik_surumu', 'bigint', false, '0', "Üyelik sürümü: yalnız şube üyeliği (ekleme, eklenme, pasif, silinme) değişince degisiklik_surumu ile aynı surumAl değeri yazılır; ad ve sıra değişikliği yazmaz. Öğrenci kapsam kaynağının degistiMi sorusu ve D02'nin pasiflesenSatirlar süzgeci okur; ad düzeltmesi öğrencilere baştan indirme yaptırmaz."),
      col('silinme_ani', 'timestamptz', true, '', "Saklama süresiyle anonimleştirildiği an; telefona inen silindi işareti bundan türer.")
    ],
    indexes: [
      "liste_satirlari_sube_id_ogrenci_no_uq: UNIQUE (sube_id, ogrenci_no); etkin ve pasif satırları kapsar, canlanma aynı satırı kullanır",
      "liste_satirlari_ders_id_ogrenci_no_uq: UNIQUE (ders_id, ogrenci_no) WHERE pasif_ani IS NULL; derste öğrenci başına tek etkin satır",
      "liste_satirlari_ogrenci_no_uyelik_surumu_idx: (ogrenci_no, uyelik_surumu); numaraIleEslestir, ogrencininEtkinSatirlari, ogrencininSatirlari, öğrencinin indirmesi ve kapsam degistiMi",
      "liste_satirlari_sube_id_degisiklik_surumu_idx: (sube_id, degisiklik_surumu); hocanın artımlı indirmesi",
      "liste_satirlari_birim_id_donem_id_idx: (birim_id, donem_id) WHERE silinme_ani IS NULL; saklama işleyicisinin partisi",
      "liste_satirlari_uyelik_surumu_idx: (uyelik_surumu) WHERE silinme_ani IS NOT NULL; anonimleştirmeden sonra kapsam degistiMi"
    ],
    constraints: [
      "liste_satirlari_id_pk: PRIMARY KEY (id)",
      "liste_satirlari_sube_id_fk: FOREIGN KEY (sube_id) REFERENCES subeler (id); dizin: sube_id_ogrenci_no_uq önünde",
      "liste_satirlari_ders_id_fk: FOREIGN KEY (ders_id) REFERENCES dersler (id); @dizinsiz-kabul (ders satırı silinmez; sorgular kısmi ders_id_ogrenci_no_uq ile)",
      "liste_satirlari_donem_id_fk: FOREIGN KEY (donem_id) REFERENCES donemler (id); @dizinsiz-kabul (dönem satırı silinmez)",
      "liste_satirlari_birim_id_fk: FOREIGN KEY (birim_id) REFERENCES birimler (id); @dizinsiz-kabul (birim satırı silinmez; sorgular kısmi birim_id_donem_id_idx ile)",
      "liste_satirlari_ilk_yukleme_id_fk: FOREIGN KEY (ilk_yukleme_id) REFERENCES liste_yuklemeleri (id); @dizinsiz-kabul (yükleme satırı silinmez)",
      "liste_satirlari_son_yukleme_id_fk: FOREIGN KEY (son_yukleme_id) REFERENCES liste_yuklemeleri (id); @dizinsiz-kabul (yükleme satırı silinmez)",
      "liste_satirlari_degistiren_kisi_id_fk: FOREIGN KEY (degistiren_kisi_id) REFERENCES kisiler (id); @dizinsiz-kabul (kişi satırı fiziksel silinmez, D12-B16)",
      "liste_satirlari_ogrenci_no_ck: CHECK (ogrenci_no ~ '^[0-9]{9,10}$')",
      "liste_satirlari_ad_soyad_ck: CHECK (char_length(ad_soyad) BETWEEN 1 AND 200)",
      "liste_satirlari_sira_ck: CHECK (sira > 0)",
      "liste_satirlari_kaynak_ck: CHECK (kaynak IN ('DOSYA','ELLE','SISTEM'))",
      "liste_satirlari_gec_kayit_secimi_ck: CHECK (gec_kayit_secimi IN ('ONCEKI_SAYILMAZ','ONCEKI_YOK'))",
      "liste_satirlari_pasif_ani_eklenme_ani_ck: CHECK (pasif_ani IS NULL OR pasif_ani >= eklenme_ani); sıfır uzunluklu (kırpılmış) aralık eşitlikle geçer",
      "liste_satirlari_silinme_ani_ogrenci_no_ad_soyad_ck: CHECK ((silinme_ani IS NULL AND ogrenci_no IS NOT NULL AND ad_soyad IS NOT NULL) OR (silinme_ani IS NOT NULL AND ogrenci_no IS NULL AND ad_soyad IS NULL))",
      "liste_satirlari_degisiklik_surumu_ck: CHECK (degisiklik_surumu >= 0)",
      "liste_satirlari_uyelik_surumu_ck: CHECK (uyelik_surumu >= 0)"
    ]
  },
  {
    name: 'sube_listeleri',
    kisa: 'şube başına liste sürümü ve son yazan',
    purpose: "Şube başına liste durumu: satirlar ve PATCH isteklerinin beklenenListeSurumu'yla karşılaştırılan liste sürümü, son yükleme ve son yazan. İlk yazmada açılır; D03'ün her yazması dersin bütün şubelerinin satırlarını kimlik sırasıyla FOR UPDATE ile kilitler, böylece aynı dersin yazanları sıraya girer.",
    columns: [
      col('sube_id', 'uuid', false, '', "Şube (subeler, D02); birincil anahtar."),
      col('ders_id', 'uuid', false, '', "Şubenin dersi; kopya."),
      col('donem_id', 'uuid', false, '', "Dersin dönemi; kopya."),
      col('liste_surumu', 'integer', false, '0', "D03 uçlarından ve denemeListesiniKur'dan gelen her yazmada, yazılan her şubede tam 1 artar; muafIsaretle artırmaz. Panel satirlar ve PATCH isteğinde bunu beklenenListeSurumu olarak geri yollar."),
      col('son_yukleme_id', 'uuid', true, '', "Son uygulanan yükleme (liste_yuklemeleri)."),
      col('guncelleyen_kisi_id', 'uuid', true, '', "Son yazan kişi (kisiler, D01)."),
      col('guncelleme_ani', 'timestamptz', false, '', "Son yazma anı."),
      col('olusturma_ani', 'timestamptz', false, '', "İlk yazma anı.")
    ],
    indexes: [
      "Birincil anahtar dışında dizin yok; erişim hep sube_id ile."
    ],
    constraints: [
      "sube_listeleri_sube_id_pk: PRIMARY KEY (sube_id)",
      "sube_listeleri_sube_id_fk: FOREIGN KEY (sube_id) REFERENCES subeler (id); dizin: birincil anahtar",
      "sube_listeleri_ders_id_fk: FOREIGN KEY (ders_id) REFERENCES dersler (id); @dizinsiz-kabul (ders satırı silinmez; dersin şubeleri D02.dersSubeleri'nden gelir, kilit birincil anahtarla)",
      "sube_listeleri_donem_id_fk: FOREIGN KEY (donem_id) REFERENCES donemler (id); @dizinsiz-kabul (dönem satırı silinmez)",
      "sube_listeleri_son_yukleme_id_fk: FOREIGN KEY (son_yukleme_id) REFERENCES liste_yuklemeleri (id); @dizinsiz-kabul (yükleme satırı silinmez)",
      "sube_listeleri_guncelleyen_kisi_id_fk: FOREIGN KEY (guncelleyen_kisi_id) REFERENCES kisiler (id); @dizinsiz-kabul (kişi satırı fiziksel silinmez)",
      "sube_listeleri_liste_surumu_ck: CHECK (liste_surumu >= 0)"
    ]
  },
  {
    name: 'liste_yuklemeleri',
    kisa: 'uygulanan her yüklemenin özeti; numara ve ad yok',
    purpose: "Uygulanan her dosya yüklemesinin özeti: kim, ne zaman, dosya türü, kodlama, ayırıcı, değişiklik sayıları ve onay. Dosyanın kendisi, numaralar ve adlar saklanmaz. Dosyayla eklenen satırın kim ve ne zaman bilgisi buradan okunur (satırdaki ilk_yukleme_id).",
    columns: [
      col('id', 'uuid', false, 'uuidv7()', "Yükleme kimliği."),
      col('sube_id', 'uuid', false, '', "Yüklemenin şubesi (subeler, D02)."),
      col('donem_id', 'uuid', false, '', "Dersin dönemi; kopya, saklama için."),
      col('yukleyen_kisi_id', 'uuid', false, '', "Uygulayan hoca (kisiler, D01)."),
      col('uygulama_ani', 'timestamptz', false, '', "İşlem anı (saat arayüzünden)."),
      col('dosya_turu', 'text', false, '', "XLSX, XLS, HTML_XML ya da CSV (CHECK)."),
      col('kodlama', 'text', true, '', "Yalnız CSV'de: UTF_8, UTF_16LE, UTF_16BE ya da WINDOWS_1254."),
      col('ayirici', 'text', true, '', "Yalnız CSV'de: VIRGUL, NOKTALI_VIRGUL ya da SEKME."),
      col('satir_sayisi', 'integer', false, '', "Farka giren geçerli satır sayısı (1 ile 2.000); SUBE_UYUSMUYOR ile dışarıda kalanlar sayılmaz."),
      col('disarida_kalan', 'integer', false, '', "Şube sütunu seçilen şubeye uymadığı için farka girmeyen satır sayısı."),
      col('eklenen', 'integer', false, '', "Yeni açılan satır sayısı."),
      col('pasif_olan', 'integer', false, '', "Pasif olan satır sayısı (başka şubeye geçenlerin eski satırları dahil)."),
      col('canlanan', 'integer', false, '', "Yeniden etkin olan satır sayısı (şube değişiminde hedef şubede canlananlar dahil)."),
      col('kirpilan', 'integer', false, '', "Canlanmanın aralığını kestiği, aynı dersin öbür şubelerindeki pasif satır sayısı (D03-A04)."),
      col('isim_degisen', 'integer', false, '', "Eşleştirme işlevine göre adı değişen satır sayısı."),
      col('sube_degisen', 'integer', false, '', "Aynı dersin başka şubesinden gelen öğrenci sayısı."),
      col('sira_degisen', 'integer', false, '', "Yalnız sırası değişen etkin satır sayısı."),
      col('uyari_sayisi', 'integer', false, '', "Hocanın onayladığı UYARI bulgusu sayısı."),
      col('buyuk_degisiklik_onayi', 'boolean', false, 'false', "Büyük değişiklik (2 x (pasif olacak + şube değişecek) > bu şubenin etkin satırı + taşınacakların eski şubelerindeki etkin satırlar) varken hoca ikinci onayı verdi mi."),
      col('sube_degisikligi_onayi', 'boolean', false, 'false', "Başka şubede etkin öğrenciler bu şubeye taşınırken hoca şube değişikliği onayını verdi mi."),
      col('onceki_liste_surumu', 'integer', false, '', "Uygulamadan önceki liste sürümü."),
      col('yeni_liste_surumu', 'integer', false, '', "Uygulamadan sonraki liste sürümü (önceki artı 1).")
    ],
    indexes: [
      "liste_yuklemeleri_sube_id_uygulama_ani_idx: (sube_id, uygulama_ani DESC, id DESC); yükleme geçmişinin imleçli sayfası"
    ],
    constraints: [
      "liste_yuklemeleri_id_pk: PRIMARY KEY (id)",
      "liste_yuklemeleri_sube_id_fk: FOREIGN KEY (sube_id) REFERENCES subeler (id); dizin: sube_id_uygulama_ani_idx önünde",
      "liste_yuklemeleri_donem_id_fk: FOREIGN KEY (donem_id) REFERENCES donemler (id); @dizinsiz-kabul (dönem satırı silinmez)",
      "liste_yuklemeleri_yukleyen_kisi_id_fk: FOREIGN KEY (yukleyen_kisi_id) REFERENCES kisiler (id); @dizinsiz-kabul (kişi satırı fiziksel silinmez)",
      "liste_yuklemeleri_dosya_turu_ck: CHECK (dosya_turu IN ('XLSX','XLS','HTML_XML','CSV'))",
      "liste_yuklemeleri_dosya_turu_kodlama_ayirici_ck: CHECK ((dosya_turu = 'CSV' AND kodlama IN ('UTF_8','UTF_16LE','UTF_16BE','WINDOWS_1254') AND ayirici IN ('VIRGUL','NOKTALI_VIRGUL','SEKME')) OR (dosya_turu <> 'CSV' AND kodlama IS NULL AND ayirici IS NULL))",
      "liste_yuklemeleri_satir_sayisi_ck: CHECK (satir_sayisi BETWEEN 1 AND 2000)",
      "liste_yuklemeleri_disarida_kalan_ck: CHECK (disarida_kalan >= 0)",
      "liste_yuklemeleri_eklenen_ck: CHECK (eklenen >= 0)",
      "liste_yuklemeleri_pasif_olan_ck: CHECK (pasif_olan >= 0)",
      "liste_yuklemeleri_canlanan_ck: CHECK (canlanan >= 0)",
      "liste_yuklemeleri_kirpilan_ck: CHECK (kirpilan >= 0)",
      "liste_yuklemeleri_isim_degisen_ck: CHECK (isim_degisen >= 0)",
      "liste_yuklemeleri_sube_degisen_ck: CHECK (sube_degisen >= 0)",
      "liste_yuklemeleri_sira_degisen_ck: CHECK (sira_degisen >= 0)",
      "liste_yuklemeleri_uyari_sayisi_ck: CHECK (uyari_sayisi >= 0)",
      "liste_yuklemeleri_yeni_liste_surumu_onceki_liste_surumu_ck: CHECK (yeni_liste_surumu = onceki_liste_surumu + 1)"
    ]
  }
];

const SATIR = "{satirId, ogrenciNo, adSoyad, sira, kaynak: DOSYA|ELLE|SISTEM, eklenmeAni, pasifAni|null, gecKayitSecimi: ONCEKI_SAYILMAZ|ONCEKI_YOK, gecEklendi: boolean, muaf: boolean, degisiklikAni}";
const D13_ORTAK = ["401 (D13: girişsiz)", "403 (D13: rol hoca değil)", "429 (D13: hız sınırı)"];

const endpoints = [
  {
    method: 'GET', path: '/v1/listeler/subeler/{subeId}', client: 'panel',
    purpose: "Şubenin listesi iki bölümde: bolum=ETKIN (varsayılan) etkin satırları sırasıyla ve kesmeden, bolum=PASIF pasif satırları D13 imleç deseniyle sayfa sayfa döner; ikisi de liste sürümü, satır sayıları, kilit nedeni, ilk yapılan dersin anı ve ekle-bırak bitişini (ipucu) taşır. Ayrı pasif uç yerine sorgu parametresi seçildi, çünkü uç kümesi contracts.json'da sabittir.",
    auth: "Oturumlu hoca (panel çerezi, kökteki D01 kancası). Yalnız dersin hocası (D02.dersYetkisi); değilse 404, varlık sızdırılmaz.",
    request: {
      "subeId (yol)": "uuid; şube D02'de yoksa ya da isteyen dersin hocası değilse 404 LISTELER_SUBE_BULUNAMADI",
      "bolum (sorgu)": "ETKIN | PASIF, varsayılan ETKIN (istekte kapalı enum)",
      "imlec (sorgu)": "yalnız bolum=PASIF: opak base64url (pasif_ani, id), en çok 200 karakter; yoksa en yeniden başlar; numara ve ad taşımaz (D13-B13)",
      "adet (sorgu)": "yalnız bolum=PASIF: 1 ile 500, varsayılan 100"
    },
    response: {
      "subeId": "uuid",
      "dersId": "uuid",
      "listeSurumu": "tam sayı >= 0 (liste hiç yazılmadıysa 0); satirlar ve PATCH isteğine beklenenListeSurumu olarak geri gelir",
      "kilit": "null | DONEM_KILIDI | DERS_ARSIVDE | SUBE_PASIF | DENEME_DERSI (x-extensible-enum)",
      "ilkYapilanDersAni": "UTC metin | null (bu şubeyi kapsayan ilk yapılan oturum, D03-B12)",
      "ekleBirakBitisi": "YYYY-MM-DD | null (yalnız ipucu)",
      "etkinSayisi": "tam sayı, en çok 2.000",
      "pasifSayisi": "tam sayı",
      "ogeler": "Satir[]: bolum=ETKIN'de etkin satırların hepsi, sira artan, sonra satirId (en çok 2.000, D13-B13 sınırının içinde, kesilmez); bolum=PASIF'te pasif satırların bir sayfası, pasifAni azalan, sonra satirId",
      "sonrakiImlec": "metin | null (bolum=ETKIN'de her zaman null)",
      "Satir": SATIR
    },
    errors: ["LISTELER_SUBE_BULUNAMADI (404)", "400 (D13 doğrulama: bolum, imleç, adet)", ...D13_ORTAK],
    idempotency: "Okuma; yan etkisiz, kilit almaz.",
    rate_limit: "Oturum başına dakikada 120 (D13 girişli uç sınıfı)."
  },
  {
    method: 'POST', path: '/v1/listeler/subeler/{subeId}/onizleme', client: 'panel',
    purpose: "Panelin okuduğu eşlenmiş satırlarla farkı hesaplar: eklenecek, pasif olacak, canlanacak, kırpılacak, ad değişecek, şube değişecek, sıra değişecek; bulgular, geç eklenenler ve farkın özeti. Hiçbir tabloya yazmaz.",
    auth: "Oturumlu hoca; yalnız dersin hocası, değilse 404.",
    request: {
      "subeId (yol)": "uuid",
      "dosya": "{tur: XLSX|XLS|HTML_XML|CSV, kodlama: UTF_8|UTF_16LE|UTF_16BE|WINDOWS_1254|null, ayirici: VIRGUL|NOKTALI_VIRGUL|SEKME|null}; kodlama ve ayırıcı yalnız CSV'de dolu, öbür türlerde null",
      "satirlar": "1 ile 2.000 öğe; her öğe {dosyaSatirNo: tam sayı >= 1 ve istekte tekil, ogrenciNo: metin en çok 32 (ham; kural sunucuda), adSoyad: metin en çok 300 (ham), subeEtiketi: metin en çok 40 | null, sayiHucresi: boolean}. Şube sütunlu dosyada panel satırları seçilen şubeye göre önceden süzer (D03-B15); 2.000 sınırı süzülmüş satırlara uygulanır",
      "kural": "Şema katı: bilinmeyen alan 400; gövde en çok 2 MiB"
    },
    response: {
      "listeSurumu": "tam sayı; bilgi (uygula fark özetiyle denetlenir)",
      "farkOzeti": "base64url SHA-256, 43 karakter: kurallı farkın özeti (packages/core/src/listeler/fark-ozeti.ts; satır başına satirId ya da numara, değişiklik türü, eski ve hedef şube, yeni ad ve sıra, geç eklenme). uygula isteğine beklenenFarkOzeti olarak geri gelir",
      "uygulanabilir": "boolean: HATA bulgusu yok, kilit yok ve satirSiniriAsilir false",
      "satirSiniriAsilir": "boolean: uygulanırsa şubenin etkin satırı 2.000'i aşar",
      "kilit": "GET'teki gibi",
      "buyukDegisiklik": "boolean, tam sayıyla: 2 x (pasifOlacak + subeDegisecek) > (bu şubenin etkin satırı + taşınacakların eski şubelerindeki etkin satırlar)",
      "subeDegisikligiGerekli": "boolean: ozet.subeDegisecek > 0 (uygula subeDegisikligiOnaylandi ister)",
      "ozet": "{eklenecek, pasifOlacak, canlanacak, kirpilacak, isimDegisecek, yazimDuzeltilecek, subeDegisecek, siraDegisecek, degismeyen, disaridaKalan}: tam sayılar",
      "eklenecekler": "[{dosyaSatirNo, ogrenciNo, adSoyad, gecEklendi: boolean}] (gecEklendi yalnız dersin hiçbir satırı olmayan numarada true olabilir)",
      "canlanacaklar": "[{satirId, dosyaSatirNo, ogrenciNo, adSoyad, eklenmeAni, pasifAni}]",
      "kirpilacaklar": "[{satirId, subeId, subeEtiketi, ogrenciNo, eklenmeAni, pasifAni, yeniPasifAni}]: canlanmanın aralığını kestiği aynı dersteki öbür pasif satırlar (D03-A04)",
      "pasifOlacaklar": "[{satirId, ogrenciNo, adSoyad, kaynak}] (kaynak ELLE ise panel 'elle eklenmişti' notu düşer)",
      "isimDegisecekler": "[{satirId, dosyaSatirNo, eskiAd, yeniAd}]",
      "subeDegisecekler": "[{dosyaSatirNo, ogrenciNo, adSoyad, eskiSatirId, eskiSubeId, eskiSubeEtiketi, hedefSatirId: uuid | null}] (hedefSatirId bu şubedeki pasif satırdır; varsa o satır canlanır, yoksa yeni satır açılır)",
      "bulgular": "[{dosyaSatirNo, duzey: HATA|UYARI|BILGI, kod}] (kod x-extensible-enum; liste Hata kodları bölümünde)",
      "ilkYapilanDersAni": "UTC metin | null",
      "ekleBirakBitisi": "YYYY-MM-DD | null"
    },
    errors: ["LISTELER_SUBE_BULUNAMADI (404)", "400 (D13 doğrulama; yalnız alan yolu)", "413 GOVDE_COK_BUYUK (D13)", ...D13_ORTAK],
    idempotency: "Yan etkisiz: hiçbir tabloya yazmaz, kilit almaz. Şubenin satırları ve gelen numaraların aynı dersteki öbür satırları tek SQL deyimiyle (tek anlık görüntü) okunur; aynı liste durumunda aynı cevap ve aynı farkOzeti.",
    rate_limit: "Oturum başına dakikada 120; gövde en çok 2 MiB (D13-B11)."
  },
  {
    method: 'POST', path: '/v1/listeler/subeler/{subeId}/uygula', client: 'panel',
    purpose: "Aynı satırları, önizlemenin fark özetini, onayları ve geç kayıt seçimlerini alır; farkı kilitler altında yeniden hesaplayıp tek işlemde uygular: pasif yapma, canlandırma, kırpma, ekleme, ad ve sıra, yükleme özeti, denetim olayları, dinleyiciler, en son telefon sürümü. Hata sırası: şema 400, yetki 404, HATA bulgusu 400 LISTELER_HATALI_SATIR (kilit almadan); kilitler altında fark boşsa 200 ZATEN_UYGULANMIS (yazma olmadığından kilitli dönemde de); sonra kilit 409 LISTELER_KILITLI, fark özeti 409 LISTELER_SURUM_DEGISTI, onaylar 409 LISTELER_ONAY_GEREKLI, etkin satır sınırı 409 LISTELER_SATIR_SINIRI; kilit beklemesi aşılırsa 503 LISTELER_MESGUL.",
    auth: "Oturumlu hoca; yalnız dersin hocası, değilse 404.",
    request: {
      "subeId (yol)": "uuid",
      "dosya": "önizlemedeki gibi",
      "satirlar": "önizlemedeki satırlar, aynı kurallar",
      "beklenenFarkOzeti": "önizlemenin döndürdüğü farkOzeti (43 karakter base64url)",
      "uyarilarOnaylandi": "boolean; UYARI bulgusu varsa true olmalı",
      "buyukDegisiklikOnaylandi": "boolean; buyukDegisiklik true ise true olmalı",
      "subeDegisikligiOnaylandi": "boolean; ozet.subeDegisecek > 0 ise true olmalı ('Bu dosyadaki N öğrenci başka şubeden bu şubeye taşınacak')",
      "gecKayitSecimleri": "[{ogrenciNo, secim: ONCEKI_SAYILMAZ|ONCEKI_YOK}] en çok 2.000; yalnız dersin hiçbir satırı olmayan ve geç eklenen numaralara uygulanır, öbürleri yok sayılır; verilmeyen ONCEKI_SAYILMAZ. Şube değiştiren ya da canlanan numara dersteki değeri korur"
    },
    response: {
      "sonuc": "UYGULANDI | ZATEN_UYGULANMIS",
      "yuklemeId": "uuid | null (ZATEN_UYGULANMIS'ta null)",
      "listeSurumu": "tam sayı: yeni sürüm ya da değişmeyen sürüm",
      "ozet": "önizlemedeki sayılar, uygulanan değerlerle"
    },
    errors: ["LISTELER_SUBE_BULUNAMADI (404)", "LISTELER_KILITLI (409)", "LISTELER_SURUM_DEGISTI (409)", "LISTELER_ONAY_GEREKLI (409)", "LISTELER_SATIR_SINIRI (409)", "LISTELER_HATALI_SATIR (400)", "LISTELER_MESGUL (503, Retry-After)", "400 (D13 doğrulama)", "413 GOVDE_COK_BUYUK (D13)", ...D13_ORTAK],
    idempotency: "İçerik ve fark özetiyle: kilitler alındıktan sonra fark yeniden hesaplanır; boşsa 200 ZATEN_UYGULANMIS ve hiçbir yazma yok (çift tıklama, yeniden deneme, kilitten sonra gelen yeniden deneme); özeti beklenenFarkOzeti'nden farklıysa 409 LISTELER_SURUM_DEGISTI ve yazma yok (hoca görmediği farkı onaylayamaz); eşitse uygulanır. Başka şubeye yapılan ve bu şubenin farkını değiştirmeyen yazma (ör. seçim PATCH'i) uygulamayı engellemez.",
    rate_limit: "Oturum başına dakikada 120; gövde en çok 2 MiB (D13-B11)."
  },
  {
    method: 'POST', path: '/v1/listeler/subeler/{subeId}/satirlar', client: 'panel',
    purpose: "Tek öğrenciyi listeye elle ekler ya da aynı numaralı pasif satırı canlandırır; sıra etkinlerin en büyüğü artı 1, kaynak ELLE. Hata sırası: şema 400, yetki 404; kilitler altında numara bu şubede aynı adla etkinse 200 ZATEN_LISTEDE (kilitli dönemde de); sonra kilit 409, sürüm 409, başka şube onayı 409 LISTELER_BASKA_SUBEDE, başka adla etkin 409 LISTELER_SATIR_ZATEN_VAR, sınır 409; kilit beklemesi aşılırsa 503 LISTELER_MESGUL.",
    auth: "Oturumlu hoca; yalnız dersin hocası, değilse 404.",
    request: {
      "subeId (yol)": "uuid",
      "ogrenciNo": "9 ya da 10 ASCII rakam (packages/contracts ogrenciNoSemasi)",
      "adSoyad": "1 ile 200 karakter, denetim karakteri yok (core isimDenetle)",
      "beklenenListeSurumu": "tam sayı >= 0",
      "gecKayitSecimi": "ONCEKI_SAYILMAZ | ONCEKI_YOK | null; yalnız dersin hiçbir satırı olmayan ve geç eklenen numarada kullanılır, öbür durumda dersteki değer korunur",
      "subeDegisikligiOnaylandi": "boolean, varsayılan false; öğrenci aynı dersin başka şubesinde etkinse true olmalı"
    },
    response: {
      "sonuc": "EKLENDI | CANLANDI | ZATEN_LISTEDE",
      "satir": "Satir (GET'teki biçim)",
      "listeSurumu": "tam sayı"
    },
    errors: ["LISTELER_SUBE_BULUNAMADI (404)", "LISTELER_KILITLI (409)", "LISTELER_SURUM_DEGISTI (409)", "LISTELER_SATIR_ZATEN_VAR (409)", "LISTELER_BASKA_SUBEDE (409)", "LISTELER_SATIR_SINIRI (409)", "LISTELER_MESGUL (503, Retry-After)", "400 (D13 doğrulama)", ...D13_ORTAK],
    idempotency: "Doğal anahtar (şube, numara): numara bu şubede aynı adla etkinse 200 ZATEN_LISTEDE ve yazma yok; bu durumda sürüm farkı hata sayılmaz.",
    rate_limit: "Oturum başına dakikada 120; gövde en çok 64 KiB."
  },
  {
    method: 'PATCH', path: '/v1/listeler/satirlar/{satirId}', client: 'panel',
    purpose: "Satırı pasif yapar ya da canlandırır, geç kayıt seçimini değiştirir. Canlandırmada sira etkinlerin en büyüğü artı 1, kaynak ELLE; aynı dersteki kesişen aralıklar kırpılır. Seçim numaranın bu dersteki bütün satırlarına aynı işlemde yazılır (tek denetim olayı); pasif satırda da aynı kural. Gövdede muaf alanı yoktur: muafı yalnız D08'in ucu değiştirir. Hata sırası: şema 400, yetki 404; kilitler altında istenen durum zaten varsa 200 degisti false (kilitli dönemde de); sonra kilit 409, sürüm 409, geç kayıt değil 409 LISTELER_GEC_KAYIT_DEGIL, başka şube onayı 409, sınır 409; kilit beklemesi aşılırsa 503 LISTELER_MESGUL.",
    auth: "Oturumlu hoca; satırın dersinin hocası, değilse 404.",
    request: {
      "satirId (yol)": "uuid",
      "beklenenListeSurumu": "tam sayı >= 0",
      "pasif": "boolean, isteğe bağlı: true listeden çıkarır, false canlandırır",
      "gecKayitSecimi": "ONCEKI_SAYILMAZ | ONCEKI_YOK, isteğe bağlı; numara bu derse ilk yapılan dersten sonra eklenmemişse (gecEklendi false) 409 LISTELER_GEC_KAYIT_DEGIL",
      "subeDegisikligiOnaylandi": "boolean, isteğe bağlı; yalnız pasif: false ile anlamlı",
      "kural": "pasif ya da gecKayitSecimi'nden en az biri; muaf ya da başka alan 400 (şema katı)"
    },
    response: {
      "satir": "Satir",
      "listeSurumu": "tam sayı",
      "degisti": "boolean; istenen durum zaten varsa false"
    },
    errors: ["LISTELER_SATIR_BULUNAMADI (404)", "LISTELER_KILITLI (409)", "LISTELER_SURUM_DEGISTI (409)", "LISTELER_GEC_KAYIT_DEGIL (409)", "LISTELER_BASKA_SUBEDE (409)", "LISTELER_SATIR_SINIRI (409)", "LISTELER_MESGUL (503, Retry-After)", "400 (D13 doğrulama)", ...D13_ORTAK],
    idempotency: "İstenen son durum: zaten varsa 200, degisti false, yazma yok ve sürüm farkına bakılmaz.",
    rate_limit: "Oturum başına dakikada 120; gövde en çok 64 KiB."
  },
  {
    method: 'GET', path: '/v1/listeler/subeler/{subeId}/yuklemeler', client: 'panel',
    purpose: "Şubenin yükleme geçmişi, yeniden eskiye: kim, ne zaman, dosya türü, onaylar ve değişiklik sayıları; numara ve ad yok.",
    auth: "Oturumlu hoca; yalnız dersin hocası, değilse 404.",
    request: {
      "subeId (yol)": "uuid",
      "imlec (sorgu)": "opak base64url (uygulama_ani, id); yoksa en yeniden başlar; içinde numara ve ad yok",
      "adet (sorgu)": "1 ile 500, varsayılan 100"
    },
    response: {
      "ogeler": "[{yuklemeId, yukleyenKisiId, benMi, uygulamaAni, dosyaTuru, kodlama, ayirici, satirSayisi, disaridaKalan, eklenen, pasifOlan, canlanan, kirpilan, isimDegisen, subeDegisen, siraDegisen, uyariSayisi, buyukDegisiklikOnayi, subeDegisikligiOnayi, yeniListeSurumu}], uygulamaAni azalan",
      "sonrakiImlec": "metin | null"
    },
    errors: ["LISTELER_SUBE_BULUNAMADI (404)", "400 (D13 doğrulama: imleç, adet)", ...D13_ORTAK],
    idempotency: "Okuma; yan etkisiz.",
    rate_limit: "Oturum başına dakikada 120 (D13 girişli uç sınıfı)."
  }
];

const HATALAR = [
  ['LISTELER_SUBE_BULUNAMADI', 404, "Şube yok ya da isteyen dersin hocası değil; varlık sızdırılmaz (D13-B02)."],
  ['LISTELER_SATIR_BULUNAMADI', 404, "Satır yok, anonimleştirilmiş ya da isteyen satırın dersinin hocası değil. muafIsaretle bu kodu fırlatmaz, SATIR_YOK sonucunu döner."],
  ['LISTELER_KILITLI', 409, "Dönem kilidi (işlem anına göre), arşivlenmiş ders, pasif şube ya da deneme dersi; GET kilit nedenini döner. muafIsaretle bu kodu fırlatmaz, KILITLI sonucunu nedeniyle döner (D08 kendi koduna çevirir)."],
  ['LISTELER_SURUM_DEGISTI', 409, "satirlar ve PATCH'te beklenenListeSurumu güncel değil ve istenen değişiklik henüz yok; uygula'da kilitler altında yeniden hesaplanan farkın özeti beklenenFarkOzeti'nden farklı. Panel yeniden önizler ya da listeyi yeniler."],
  ['LISTELER_ONAY_GEREKLI', 409, "UYARI bulgusu, büyük değişiklik ya da şube değişikliği var ama ilgili onay alanı false."],
  ['LISTELER_SATIR_SINIRI', 409, "Şubenin etkin satırı 2.000'i aşacak. Pasif satırlar sınıra girmez, toplam satır sınırı yok."],
  ['LISTELER_SATIR_ZATEN_VAR', 409, "Elle eklemede numara bu şubede başka adla etkin."],
  ['LISTELER_BASKA_SUBEDE', 409, "Öğrenci aynı dersin başka şubesinde etkin ve subeDegisikligiOnaylandi false (satirlar ve PATCH)."],
  ['LISTELER_GEC_KAYIT_DEGIL', 409, "PATCH'te geç kayıt seçimi var ama numara bu derse ilk yapılan dersten sonra eklenmemiş (gecEklendi false); seçim anlamsız olduğundan yazılmaz."],
  ['LISTELER_HATALI_SATIR', 400, "uygula isteğinde HATA bulgulu satır var; alanlar yalnız yol taşır, değer yankılanmaz."],
  ['LISTELER_MESGUL', 503, "Yazma işlemi dersin şube satırlarını ya da öğrenci kova kilidini SET LOCAL lock_timeout (3 s) içinde alamadı (55P03); hiçbir şey yazılmaz, Retry-After: 2. Panel isteği bir kez yeniden gönderir."]
];

const BULGULAR = [
  ['NUMARA_BICIMI', 'HATA', "Numara 9 ya da 10 ASCII rakam değil (baş ve son boşluk ile =\"...\" sarmalı soyulduktan sonra)."],
  ['NUMARA_KISA_SAYI_HUCRESI', 'HATA', "Excel sayı hücresi 9 rakamdan kısa: baştaki 0'lar düşmüş."],
  ['SAYI_HUCRESI_9_HANE', 'UYARI', "Excel sayı hücresi 9 rakam: gerçek 9 haneli de olabilir, baştaki 0'ı düşmüş 10 haneli de; hoca onaylar."],
  ['SAYI_HUCRESI_10_HANE', 'BILGI', "Excel sayı hücresi 10 rakam: 0 kaybetmiş olamaz, yalnız gösterilir (plan sayı olarak saklanmış numarayı işaretletiyor)."],
  ['KARISIK_UZUNLUK', 'UYARI', "Tür bilgisi olmayan dosyada (CSV ve HTML tablo) 9 ve 10 haneli numaralar karışık: azınlıktaki uzunluk (eşitlikte 9 haneliler) uyarı alır."],
  ['NUMARA_TEKRAR_AYNI_ISIM', 'UYARI', "Aynı numara iki kez, adlar eşleştirme işlevine göre aynı: ilk satır sayılır."],
  ['NUMARA_TEKRAR_FARKLI_ISIM', 'HATA', "Aynı numara iki kez, adlar farklı."],
  ['ISIM_BOS', 'HATA', "Numarası dolu satırın adı boş."],
  ['ISIM_COK_UZUN', 'HATA', "Ad 200 karakterden uzun."],
  ['ISIM_DENETIM_KARAKTERI', 'HATA', "Adda denetim karakteri var."],
  ['SUBE_UYUSMUYOR', 'UYARI', "Şube sütunundaki etiket seçilen şubeye uymuyor. Karşılaştırma core şube anahtarıyla (sube.ts): NFC, Türkçe kuralla küçültme, 'şube' sözcüğü ile harf ve rakam dışı karakterler atılır ('1. Şube', '1.ŞUBE' ve '1' aynı). Satır farka girmez (pasif yapmaz, eklemez), onayla dışarıda kalır; panel bu satırları ayrı bölümde gösterir."],
  ['SUBE_SATIRI_YOK', 'HATA', "Şube sütunu var ama hiçbir satır seçilen şubeye uymuyor (yanlış şube ya da yanlış dosya); bulgu ilk veri satırına bağlanır, dosya uygulanamaz."]
];

const OKUMA = [
  ['DOSYA_BOS', "Dosya boş."],
  ['DOSYA_COK_BUYUK', "Dosya 10 MiB'tan büyük; panel okumaz."],
  ['DOSYA_OKUNAMADI', "Tanınan türde ama okunamadı (bozuk ya da desteklenmeyen içerik)."],
  ['DOSYA_PAROLALI', "D0 CF 11 E0 kabındaki parolalı .xlsx."],
  ['BASLIK_BULUNAMADI', "İlk 20 satırda (bütün sayfalarda) numara ve ad başlığı birlikte yok; panel elle eşleme açar."],
  ['AYIRICI_BELIRSIZ', "CSV'de birden çok ayırıcı başlığı ayırıyor."],
  ['COK_FAZLA_SATIR', "Başlıktan sonra (şube sütunu varsa seçilen şubeye göre süzüldükten sonra) 2.000'den çok dolu satır."]
];

const state_machines = [
  {
    name: 'liste_satiri',
    states: ['YOK', 'ETKIN', 'PASIF', 'ANONIM'],
    transitions: [
      { from: 'YOK', to: 'ETKIN', by: "POST /v1/listeler/subeler/{subeId}/uygula", when: "Numara dosyada var (şube sütunu uyuyor), bu şubede satırı yok: eklenme_ani işlem anı, kaynak DOSYA, sıra dosya sırası; dersin başka satırı varsa muaf ve seçim ondan kopyalanır, yoksa geç eklenense seçim istekten. Olay yalnız listeler.yukleme_uygulandi." },
      { from: 'YOK', to: 'ETKIN', by: "POST /v1/listeler/subeler/{subeId}/satirlar", when: "Hoca numarayı elle ekler: kaynak ELLE, sıra en büyük artı 1; olay listeler.satir_eklendi (ELLE)." },
      { from: 'YOK', to: 'ETKIN', by: "denemeListesiniKur (D01'in inceleme_hesaplari_kurulumu işi)", when: "Deneme dersinin şubesine inceleme öğrencisi: kaynak SISTEM, sıra 1; olay listeler.satir_eklendi (SISTEM)." },
      { from: 'ETKIN', to: 'PASIF', by: "POST /v1/listeler/subeler/{subeId}/uygula", when: "Numara yeni dosyada yok ya da SUBE_UYUSMUYOR ile dışarıda kaldı: pasif_ani işlem anı; satır, muaf ve seçim kalır; olay listeler.satir_pasif (DOSYA, yuklemeId)." },
      { from: 'ETKIN', to: 'PASIF', by: "PATCH /v1/listeler/satirlar/{satirId}", when: "pasif: true; olay listeler.satir_pasif (ELLE)." },
      { from: 'ETKIN', to: 'PASIF', by: "uygula ya da satirlar (aynı dersin başka şubesi)", when: "Öğrenci aynı dersin başka şubesine eklenir (şube değişimi, onaylı): eski satır aynı işlemde pasif, olay listeler.satir_pasif (SUBE_DEGISIMI); hedef satır dersin muaf ve seçim değerini taşır." },
      { from: 'ETKIN', to: 'PASIF', by: "denemeListesiniKur", when: "İnceleme numarası değişti: deneme şubesindeki eski numaranın satırı pasif, olay listeler.satir_pasif (SISTEM)." },
      { from: 'PASIF', to: 'ETKIN', by: "uygula, satirlar, PATCH (pasif: false), şube değişiminin hedefi ya da denemeListesiniKur", when: "Numara yeniden listede: aynı satır canlanır, eklenme_ani korunur, pasif_ani boşalır; PATCH ve elle eklemede sıra en büyük artı 1, kaynak ELLE; aynı (ders, numara) için bu aralıkla kesişen öbür satırlar kırpılır; olay listeler.satir_canlandi (DOSYA, ELLE, SUBE_DEGISIMI ya da SISTEM); KARAR dinleyicisi aynı işlemde yeniden değerlendirme işi koyar (D03-A04)." },
      { from: 'PASIF', to: 'PASIF', by: "aynı dersteki başka satırın canlanması", when: "Kırpma: aralığı canlananın [eklenme_ani, sonsuz) aralığıyla kesişen pasif satırda, eklenme_ani canlananınkinden önceyse pasif_ani = canlananın eklenme_ani, değilse pasif_ani = eklenme_ani (sıfır uzunluk). Olay listeler.satir_kirpildi (CANLANMA); satır ListeDegisikligi'ne KIRPILDI türüyle girer (KARAR, HESAP)." },
      { from: 'ETKIN', to: 'ETKIN', by: "uygula, PATCH ya da D08 muafIsaretle", when: "Ad, sıra, kaynak, geç kayıt seçimi ya da muaf değişir; üyelik aralığı aynı kalır." },
      { from: 'ETKIN', to: 'ANONIM', by: "D12 saklama_suresi_isi (D03 saklama işleyicisi 'listeler.liste_satirlari')", when: "Satırın birim döneminin kilit anı saklama sınırından (sinirAni) eski: numara ve ad silinir, silinme_ani yazılır, hocaya silindi iner." },
      { from: 'PASIF', to: 'ANONIM', by: "D12 saklama_suresi_isi (D03 saklama işleyicisi 'listeler.liste_satirlari')", when: "Aynı kural." }
    ]
  },
  {
    name: 'sube_listesi',
    states: ['YOK', 'ACIK', 'KILITLI'],
    transitions: [
      { from: 'YOK', to: 'ACIK', by: "ilk yazma (uygula, satirlar ya da denemeListesiniKur)", when: "sube_listeleri satırı açılır, liste_surumu 1 olur. Bir yazma dersin bütün şubelerinin satırlarını açar (INSERT ... ON CONFLICT DO NOTHING) ve kilitler; yalnız yazılanınki artar." },
      { from: 'ACIK', to: 'ACIK', by: "uygula, satirlar, PATCH ya da denemeListesiniKur", when: "Her yazma yazılan her şubenin liste_surumu'nu tam 1 artırır (şube değişiminde iki şube); muafIsaretle artırmaz." },
      { from: 'ACIK', to: 'KILITLI', by: "D02 (dönem kilidi, arşiv, şube pasif) ya da deneme dersi", when: "Durum saklanmaz; her istekte işlem anına göre D02'den türetilir (şube ve ders satırı paylaşımlı kilitle okunur). Kilitliyken yalnız okuma, saklama işleyicisi ve denemeListesiniKur." },
      { from: 'YOK', to: 'KILITLI', by: "D02 (dönem kilidi, arşiv, şube pasif) ya da deneme dersi", when: "Aynı kural; hiç yazılmamış liste kilitten sonra da açılmaz." }
    ]
  }
];

const invariants = [
  "Bir şubede bir numaranın en çok bir satırı vardır, etkin ya da pasif (liste_satirlari_sube_id_ogrenci_no_uq).",
  "Bir derste bir numaranın en çok bir etkin satırı vardır (liste_satirlari_ders_id_ogrenci_no_uq, pasif_ani IS NULL).",
  "Bir derste bir numaranın üyelik aralıkları [eklenme_ani, pasif_ani) kesişmez: canlanma pasif aralığını silerken aynı (ders_id, ogrenci_no) için kesişen öbür satırları aynı işlemde kırpar (D03-A04). D08'in satır birleşimi (D08-B12) ve uyelikDenetle bu yüzden iki şubede aynı anda üye demez.",
  "Liste satırı fiziksel silinmez; çıkan pasif olur, numara ve adı yalnız saklama işleyicisi siler (silinme_ani).",
  "pasif_ani boş ya da eklenme_ani'den küçük değildir; pasif yazılırken GREATEST(işlem anı, eklenme_ani) kullanılır; kırpılmış satırda eşit olabilir (sıfır uzunluk).",
  "Satır [eklenme_ani, pasif_ani) yarı açık aralığında üyedir; canlanma kendi pasif aralığını üyelikten siler (D03-A04).",
  "muaf ve gec_kayit_secimi (ders, numara) başına tek değerdir: aynı (ders_id, ogrenci_no) satırlarında eşittir. Yazan her yol (muafIsaretle, PATCH, satirlar, uygula'da yeni numara) numaranın o dersteki bütün satırlarına aynı işlemde yazar; şube değişimi değeri hedef satıra kopyalar; bunun dışında yükleme bu iki sütunu yazmaz.",
  "D03'ün her yazması yazdığı her şubenin liste_surumu değerini tam 1 artırır; önizleme ve iki GET hiçbir tabloya yazmaz; muafIsaretle liste_surumu'nu artırmaz.",
  "Telefona inen bir sütunu (numara, ad, sıra, eklenme, pasif, silinme) değişen her satır işlemin tek sürümünü D06.surumAl ile işlemin son adımında alır; üyeliği (eklenme, pasif, silinme ya da yeni satır) değişen satır aynı değeri uyelik_surumu'na da yazar; değişmeyen satırın sürümü değişmez; yalnız muaf ya da geç kayıt seçimi değişen işlem sayaç kilidi almaz.",
  "Uygula ya tamamen uygulanır ya hiç: satırlar, yükleme özeti, denetim olayları, dinleyiciler (iş kuyruğu dahil) ve sürüm tek işlemde; dinleyici hatası bütün işlemi geri alır.",
  "HATA bulgulu dosya uygulanamaz; UYARI, büyük değişiklik ve şube değişikliği açık onaysız uygulanamaz; uygulanan fark önizlemede gösterilen farkla aynıdır (farkOzeti).",
  "Kilitli şubede (dönem kilidi, arşiv, pasif şube, deneme dersi) hiçbir D03 ucu ve muafIsaretle yazmaz; kilit, kilitler alındıktan sonra saat arayüzünden bir kez okunan işlem anına (muafIsaretle'de çağıranın anına) göre denetlenir, şube ve ders satırı D02'den paylaşımlı kilitle (FOR SHARE) okunur (D03-A07). Fark boşsa kilitli şubede de ZATEN_UYGULANMIS döner (yazma yok). Deneme dersine yalnız denemeListesiniKur yazar.",
  "Öğrenci kova kilidi: kova = SHA-256(numaranın ASCII baytları)'nın ilk baytı, 0 ile 255 (packages/core/src/listeler/kova.ts kovaNo). Anahtar iki tam sayılı pg_advisory_xact_lock(3, kova); D12.danismaKilidi'nin tek bigint anahtar uzayıyla çakışmaz, numara anahtara girmez. D03 yazması üyeliği ya da adı değişen numaraların (eklenen, pasif olan, canlanan, kırpılan, adı değişen) kovalarını artan sırayla dışlayıcı alır (en çok 256); numaraIleEslestir ve uyelikDenetle'nin ret yolu paylaşımlı alır. Yalnız seçim ya da muaf yazan işlem kova kilidi almaz.",
  "numaraIleEslestir her çağıranın işleminde ilk kilittir (D01 kayıt işlemi, bekleyen_kayit_kapatma). Birden çok numarayı tek işlemde işleyen çağıran kovaları artan kovaNo sırasıyla alır ya da her numarayı ayrı işlemde işler. Bir D03 yazmasının içinde (ESLESTIRME dinleyicisi) yalnız o yazmanın kova kümesindeki numarayla çağrılabilir; değilse iç hata atar (kilitlenme döngüsünü önler).",
  "Kilit ve adım sırası (her D03 yazması): SET LOCAL lock_timeout = '3s'; dersin bütün şubelerinin sube_listeleri satırları kimlik sırasıyla FOR UPDATE; D02 şube ve ders satırları FOR SHARE; işlem anı ve kilit denetimi; fark; kova kilitleri artan sırayla; liste_satirlari yazımları; denetim; dinleyiciler (iş kuyruğu dahil); en son sayaç sürümü. 55P03 503 LISTELER_MESGUL olur, işlem geri alınır.",
  "Şube başına en çok 2.000 etkin satır; pasif satırlar sınıra girmez ve toplam sınır yoktur. GET bolum=ETKIN etkinleri hiç kesmez (D13-B13 sınırının içinde), bolum=PASIF pasifleri imleçle sayfalar.",
  "Etkin satırlarda sira 1'den başlar ve son yüklemenin dosya sırasını izler; elle eklenen ve PATCH ile canlanan en büyük artı 1; sıralama (sira, id) ile kararlıdır.",
  "Dış yüzlerdeki 'etkin satır' tanımı tektir: pasif_ani IS NULL (an verilen işlevde eklenme_ani <= an < pasif_ani), silinme_ani IS NULL, ders arşivde değil ve satırın birim dönemi an itibarıyla kilitli değil (D02.kilitDurumu, satırdaki birim_id ve donem_id ile); birimsiz deneme dersi hiç kilitlenmez. Geçmiş dönemin satırları eşleşmeye, teyit ve cihaz değişimi yetkisine girmez.",
  "Ad karşılaştırması yalnız packages/core/src/listeler/isim.ts ile yapılır; SQL lower() ve Intl kullanılmaz.",
  "kaynak, gec_kayit_secimi, dosya_turu, kodlama ve ayirici CHECK listeleri packages/contracts/src/listeler.ts'teki sabitlerle aynıdır; şema testi sabitleri içe aktarır, yeniden yazmaz.",
  "Numara ve ad adres satırına, loga, iş verisine, danışma kilidi anahtarına ve denetim ayrıntısına girmez; yükleme özeti numara ve ad taşımaz.",
  "liste_satirlari.ders_id, donem_id ve birim_id satırın şubesinin dersine, dönemine ve birimine eşittir (yazılırken D02'den kopyalanır).",
  "Bir yüklemenin sayıları o yüklemenin yazdığı satır değişikliklerine birebir eşittir."
];

const LS = "ListeSatiri = { satirId: SatirId; subeId: SubeId; dersId: DersId; donemId: DonemId; birimId: BirimId | null; ogrenciNo: OgrenciNo; adSoyad: string; sira: number; kaynak: 'DOSYA' | 'ELLE' | 'SISTEM'; eklenmeAni: Date; pasifAni: Date | null; gecKayitSecimi: 'ONCEKI_SAYILMAZ' | 'ONCEKI_YOK'; muaf: boolean; degisiklikSurumu: bigint; uyelikSurumu: bigint }. Tipler: Islem D12'nin işlem tipi; kimlikler packages/contracts/src/ortak kimlikSemasi ile markalı (SubeId, DersId, DonemId, BirimId ve KisiId sahiplerinin markası; SatirId 'ListeSatiri', YuklemeId 'ListeYuklemesi'), OgrenciNo ortak ogrenciNoSemasi'nin tipi. Modül kendi takma adını (Tx, Uuid) yazmaz.";

const exports_ = [
  {
    name: 'listeSatirlari',
    signature: "listeSatirlari(tx: Islem, subeId: SubeId): Promise<readonly ListeSatiri[]>",
    purpose: `Şubenin anonimleştirilmemiş bütün satırları (dönem kilidinden sonra da): etkinler sira ve satirId sırasıyla, sonra pasifler. ${LS} D08 (T, muaf, seçim; devam_hesapla işi) ve D09 okur; kilit almaz.`
  },
  {
    name: 'satirGetir',
    signature: "satirGetir(tx: Islem, satirId: SatirId): Promise<ListeSatiri | null>",
    purpose: "Tek satır; yoksa ya da anonimleştirilmişse null. D08 muaf ucunda satırı ve dersini doğrular, D09 düzeltmede okur, D07'nin liste işi numarayı çözer."
  },
  {
    name: 'uyelikDenetle',
    signature: "uyelikDenetle(tx: Islem, ogrenciNo: OgrenciNo, subeId: SubeId | readonly SubeId[], an: Date): Promise<{ uye: true; satirId: SatirId; subeId: SubeId } | { uye: false; neden: 'SATIR_YOK' | 'HENUZ_EKLENMEMISTI' | 'PASIFTI' }>",
    purpose: "Öğrenci verilen şubelerden birinde an anında listede miydi: eklenme_ani <= an < pasif_ani (pasif boşsa sınırsız; kırpılmış satır aralığıyla). Birlikte işlenen şubeler için oturumun şube dizisi verilir, biri yeter. Anı kararın sahibi D07 seçer (öneri: kaydın hesaplanan saati; ulaşma anı hiç). Olumlu yol kilitsiz okur. Olumsuz cevap vermeden önce numaranın kovasında pg_advisory_xact_lock_shared(3, kova) alır ve satırları yeniden okur: süren bir liste yazması taahhüt edilene kadar bekler, böylece eşzamanlı ekleme ya da canlanma ret kaydına dönüşmez; yazma kilidi almadan önce taahhüt edilen ret ise o yazmanın KARAR işiyle yeniden değerlendirilir. Kilit çağıranın işlemi bitene kadar kalır, bekleme rolün lock_timeout'uyla sınırlıdır. Birden çok numarayı tek işlemde değerlendiren çağıran (D07 işleri) numaraları kovaNo sırasıyla işler; çağıran iş kuyruğu adımından önce çağırır (D03-A10)."
  },
  {
    name: 'numaraIleEslestir',
    signature: "numaraIleEslestir(tx: Islem, numara: OgrenciNo, isim: string): Promise<{ durum: 'ESLESTI' | 'ISIM_UYUSMUYOR' | 'LISTEDE_YOK'; isimlerTutarsiz: boolean; satirlar: readonly { satirId: SatirId; subeId: SubeId; dersId: DersId }[] }>",
    purpose: "Kayıttaki numara ve ad, numaranın etkin satırlarıyla (değişmezlerdeki tanım: pasif değil, anonim değil, ders arşivde değil, birim dönemi işlem anında kilitli değil; an D03'ün saat arayüzünden) core isimlerEslesir işleviyle karşılaştırılır: etkin satır yoksa LISTEDE_YOK; hepsinin adı eşleşiyorsa ESLESTI; değilse ISIM_UYUSMUYOR (satırların adları kendi aralarında farklıysa isimlerTutarsiz true). Kural tektir: açık dönemlerdeki bütün etkin satırlar eşleşmeli; geçmiş dönemde farklı yazılmış ad sonucu bozmaz (D01-B19'daki 'herhangi bir etkin satır' bu kurala göre düzelir, D03-A07). İlk adımda pg_advisory_xact_lock_shared(3, kovaNo(numara)) alır ve çağıranın işlemi bitene kadar tutar; her çağıranın işleminde ilk kilittir. D01 kanıtı (D07 zinciri, CBOR) ilk veritabanı adımından önce ayrıştırıp doğrular ki kilit kısa kalsın. Bekleme rolün lock_timeout'uyla (yoklama_api 2 s) sınırlıdır; 55P03 çağırana VeritabaniHatasi olarak çıkar, D01 kayıt işlemini bir kez yeniden dener. Bir D03 yazmasının içinde yalnız o yazmanın kova kümesindeki numarayla çağrılabilir, değilse iç hata (kilitler.ts işlem başına tutulan kova kümesine bakar)."
  },
  {
    name: 'ogrencininEtkinSatirlari',
    signature: "ogrencininEtkinSatirlari(tx: Islem, ogrenciNo: OgrenciNo, an: Date): Promise<readonly ListeSatiri[]>",
    purpose: "Numaranın an anında etkin satırları (değişmezlerdeki tanım; açık dönemlerde çift anadal ve yandal listeleri dahil), dersId sırasıyla. Açık dönem satırdaki birim_id ve donem_id ile D02.kilitDurumu'ndan, arşiv D02.dersGetir'den süzülür (ayrık çiftler bir kez sorulur). D01 (teyit ve cihaz değişimi yetkisi), D04 ve D09 (teyit kapsamı) kullanır: kilitli dönemdeki dersin hocası bu yetkileri almaz. Kilit almaz."
  },
  {
    name: 'ogrencininSatirlari',
    signature: "ogrencininSatirlari(tx: Islem, ogrenciNo: OgrenciNo, s?: { donemIdler?: readonly DonemId[] }): Promise<readonly ListeSatiri[]>",
    purpose: "Sözleşme eki (D03-A07): numaranın anonimleştirilmemiş bütün satırları, etkin ve pasif, şube değişimleri ve kilitli dönemler dahil; dersId, sonra eklenmeAni sırasıyla; donemIdler verilirse yalnız o dönemler. D09 öğrencinin düzeltmelerini şube değişimleri boyunca bulmak için okur; kilit almaz."
  },
  {
    name: 'muafIsaretle',
    signature: "muafIsaretle(tx: Islem, satirId: SatirId, muaf: boolean, b: { an: Date; yapan: { kisiId: KisiId } | null }): Promise<{ sonuc: 'YAZILDI' | 'DEGISMEDI'; satir: ListeSatiri; onceki: boolean; degisti: boolean } | { sonuc: 'KILITLI'; neden: 'DONEM_KILIDI' | 'DERS_ARSIVDE' | 'SUBE_PASIF' | 'DENEME_DERSI' } | { sonuc: 'SATIR_YOK' }>",
    purpose: "Muaf işaretini yazan tek yol; yalnız D08'in PUT /v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf ucu çağırır. Beklenen durumlarda fırlatmaz: satır yoksa ya da anonimse SATIR_YOK, kilitliyse KILITLI ve nedeni döner; D08 sonucu kendi beyanlı DEVAM_ kodlarına çevirir (D13-B02'de beyan dışı kod test kipinde 500 olur). an çağıranın işlem anıdır, kilit bununla denetlenir; şube ve ders satırı D02'den paylaşımlı kilitle okunur. Numaranın o dersteki bütün satırlarını FOR UPDATE kilitler ve önceki değeri kilit altında okur: değer aynıysa DEGISMEDI, degisti false ve yazma yok (eşzamanlı aynı değerli iki çağrıda ikincisi DEGISMEDI alır; D08 denetim olayını ve işi yalnız degisti true iken yazar, onceki doğrudur); değişince değer bütün satırlara yazılır. Liste sürümünü artırmaz, dinleyici çağırmaz, sayaç sürümü ve kova kilidi almaz; denetim olayını D08 yazar. Çağıran işlemde iş kuyruğu adımından önce çağrılır."
  },
  {
    name: 'listeDegisikligiDinleyicisiKaydet',
    signature: "listeDegisikligiDinleyicisiKaydet(dinleyici: { ad: string; basamak: 'ESLESTIRME' | 'KARAR' | 'HESAP'; isle(tx: Islem, degisiklik: ListeDegisikligi): Promise<void> }): void",
    purpose: "Eklentiler yüklenirken kaydolunur. Defter modül düzeyinde değil, listelerEklentisi'nin Fastify örneğine bağlıdır (decorate): app.ts, worker.ts ve test dünyası uygulamayı her kurduğunda boş başlar; aynı örnekte aynı ad iki kez kaydolursa açılış hata verir. Uyarlayıcılar her modülün kendi eklenti.ts'indedir (D03-A11): D01 ESLESTIRME, değişikliğin satırlarındaki numaralar için bekleyen hesapları eşleştirir (bekleyenKayitlariEslestir değişikliğin ayrık subeId'leri için çağrılır ve yalnız değişikliğin numaralarını işler); D07 KARAR, kayıtları işlem içinde değerlendirmez, aynı işlemde yeniden değerlendirme işi koyar (iş verisi { dersId, satirIdleri } en çok 2.000, numara yok; iş satirGetir ile numarayı çözer ve D07.yenidenDegerlendir(tx, { dersId, subeIdleri, ogrenciNolari }, 'LISTE_DEGISTI') çağırır); D08 HESAP, devamHesaplaIsiKoy(tx, dersId, null, 'LISTE', { tur: 'LISTE_SATIRI', id: yuklemeId ya da satirId, donemId }). D03 bir yazma işleminde satırlar ve denetim yazıldıktan sonra, sürümden önce basamak sırasıyla, basamak içinde kayıt sırasıyla çağırır. ListeDegisikligi = { dersId: DersId; donemId: DonemId; an: Date; neden: 'YUKLEME' | 'ELLE_EKLEME' | 'SATIR_DUZENLEME' | 'DENEME_KURULUMU'; yuklemeId: YuklemeId | null; yapanKisiId: KisiId | null; satirlar: readonly { satirId: SatirId; subeId: SubeId; ogrenciNo: OgrenciNo; turler: ReadonlySet<'EKLENDI' | 'PASIF_OLDU' | 'CANLANDI' | 'KIRPILDI' | 'ISIM_DEGISTI' | 'GEC_KAYIT_SECIMI_DEGISTI'>; eklenmeAni: Date; oncekiPasifAni: Date | null; pasifAni: Date | null }[] }: her satır bir kez gelir, hem canlanan hem adı değişen satır tek kayıtta iki türle. Olay işlem içi olduğu için numara taşır; dinleyici numarayı iş verisine ve loga koymaz, genel sayaç sürümü almaz; hata atarsa bütün işlem geri alınır."
  },
  {
    name: 'denemeListesiniKur',
    signature: "denemeListesiniKur(tx: Islem, subeId: SubeId, ogrenciNo: OgrenciNo, adSoyad: string): Promise<ListeSatiri>",
    purpose: "Sözleşme eki (D02-A13, D03-A07): D01'in inceleme_hesaplari_kurulumu işi D02.denemeDersiniKur'un döndürdüğü şubeyle çağırır. Şubenin dersi deneme dersi değilse iç hata (LISTELER_ kodu değil, uca çıkmaz). Öbür yazmalarla aynı kilit sırası (şube satırları, kova). (şube, numara) ile eş güçlü: satır aynı adla etkinse yazmaz; farklı adla etkinse adı günceller; pasifse canlandırır; şubede başka etkin numara varsa (inceleme numarası değişti) o satır pasif olur. Kaynak SISTEM, sira 1; olay listeler.satir_eklendi ya da satir_canlandi (SISTEM); dinleyiciler neden DENEME_KURULUMU ile; son adımda surumAl. DENEME_DERSI kilidi yalnız uçları bağlar, bu işlevi bağlamaz."
  }
];

const kayitlar = [
  "D02.listeKaynagiKaydet({ etkinSatirlar, pasiflesenSatirlar }) (sözleşme eki D02-A12; liste-kaynagi.ts): etkinSatirlar(tx, { subeIdleri?, ogrenciNolari? }) pasif_ani IS NULL AND silinme_ani IS NULL satırlarını sube_id = ANY($1) ve/veya ogrenci_no = ANY($2) süzgeciyle döner (ikisi de boşsa iç hata), öğe { satirId, subeId, ogrenciNo, surum: degisiklik_surumu }. pasiflesenSatirlar(tx, ogrenciNo, surumden) ogrenci_no = $1 AND pasif_ani IS NOT NULL AND uyelik_surumu > $2 satırlarını { subeId, surum: uyelik_surumu } olarak döner (D02 ile D06 öğrenci kapsamını D03'e bırakırsa bu işlev kalkar, D03-A09). D02'nin şube pasifleştirme denetimi (DERSLER_SUBEDE_OGRENCI_VAR) ve çakışma ucu bunu kullanır; kayıt yoksa D02'nin eklentisi açılmaz.",
  "D06.indirmeKaynagiKaydet('liste_satirlari', { tur: 'genel', roller: ['OGRENCI', 'PERSONEL'], degisenler }) (indirme-kaynagi.ts; ayrıntı D03-B27).",
  "D06.indirmeKaynagiKaydet('ogrenci_liste_kapsami', { tur: 'kapsam', rol: 'OGRENCI', kapsam, degistiMi }) (kapsam-kaynagi.ts; ayrıntı D03-B27, sahiplik D03-A09).",
  "D12.saklamaIsleyicisiKaydet('listeler.liste_satirlari', { islem: 'anonimlestirme', partiIsle }) (saklama.ts; ayrıntı İşler bölümünde).",
  "D13.rotalariKaydet(app, LISTELER_ROTALARI): altı uç; LISTELER_GIZLI_ALANLAR server.ts'ten D15'in log biçimlendiricisine (ekGizliAdlar) verilir.",
  "Liste değişikliği defteri listelerEklentisi'nin Fastify örneğine bağlanır; app.ts (API) ve worker.ts (D14: işçi aynı uygulamayı kurar) aynı kurucuyla kaydeder. Açılış testi iki girişi de kurup dört kaydın varlığını denetler."
];

const files = [
  'apps/server/src/modules/listeler/index.ts',
  'apps/server/src/modules/listeler/eklenti.ts',
  'apps/server/src/modules/listeler/tablolar.ts',
  'apps/server/src/modules/listeler/sorgular.ts',
  'apps/server/src/modules/listeler/servis.ts',
  'apps/server/src/modules/listeler/rotalar.ts',
  'apps/server/src/modules/listeler/dinleyiciler.ts',
  'apps/server/src/modules/listeler/kilitler.ts',
  'apps/server/src/modules/listeler/indirme-kaynagi.ts',
  'apps/server/src/modules/listeler/kapsam-kaynagi.ts',
  'apps/server/src/modules/listeler/liste-kaynagi.ts',
  'apps/server/src/modules/listeler/deneme.ts',
  'apps/server/src/modules/listeler/saklama.ts',
  'apps/server/src/modules/listeler/denetim-olaylari.ts',
  'apps/server/src/jobs/listeler/index.ts',
  'packages/contracts/src/listeler.ts',
  'packages/core/src/listeler/index.ts',
  'packages/core/src/listeler/isim.ts',
  'packages/core/src/listeler/numara.ts',
  'packages/core/src/listeler/baslik.ts',
  'packages/core/src/listeler/dosya-turu.ts',
  'packages/core/src/listeler/kodlama.ts',
  'packages/core/src/listeler/csv.ts',
  'packages/core/src/listeler/okuma.ts',
  'packages/core/src/listeler/satir-denetimi.ts',
  'packages/core/src/listeler/fark.ts',
  'packages/core/src/listeler/fark-ozeti.ts',
  'packages/core/src/listeler/aralik.ts',
  'packages/core/src/listeler/kova.ts',
  'packages/core/src/listeler/sube.ts',
  'packages/core/src/listeler/isim.test.ts',
  'packages/core/src/listeler/numara.test.ts',
  'packages/core/src/listeler/baslik.test.ts',
  'packages/core/src/listeler/dosya-turu.test.ts',
  'packages/core/src/listeler/kodlama.test.ts',
  'packages/core/src/listeler/csv.test.ts',
  'packages/core/src/listeler/okuma.test.ts',
  'packages/core/src/listeler/satir-denetimi.test.ts',
  'packages/core/src/listeler/fark.test.ts',
  'packages/core/src/listeler/fark-ozeti.test.ts',
  'packages/core/src/listeler/aralik.test.ts',
  'packages/core/src/listeler/kova.test.ts',
  'packages/core/src/listeler/sube.test.ts',
  'packages/core/src/listeler/ornekler/uret.ts',
  'packages/core/src/listeler/ornekler/utf8-bom-noktali-virgul.csv',
  'packages/core/src/listeler/ornekler/utf8-virgul-tirnakli.csv',
  'packages/core/src/listeler/ornekler/windows-1254-noktali-virgul.csv',
  'packages/core/src/listeler/ornekler/utf16le-sekme.txt',
  'packages/core/src/listeler/ornekler/esittir-tirnak-numara.csv',
  'packages/core/src/listeler/ornekler/sayi-hucreli.xlsx',
  'packages/core/src/listeler/ornekler/sifir-bicimli.xlsx',
  'packages/core/src/listeler/ornekler/baslik-ustu-satirli.xlsx',
  'packages/core/src/listeler/ornekler/ad-soyad-ayri.xlsx',
  'packages/core/src/listeler/ornekler/ikinci-sayfada.xlsx',
  'packages/core/src/listeler/ornekler/eski-ikili.xls',
  'packages/core/src/listeler/ornekler/html-tablo.xls',
  'packages/core/src/listeler/ornekler/parolali.xlsx',
  'packages/core/src/listeler/ornekler/aksis-maskeli.xlsx',
  'apps/server/test/features/listeler/liste-yukleme.feature',
  'apps/server/test/features/listeler/liste-satirlari.feature',
  'apps/server/test/features/listeler/liste-yetki-ve-kilit.feature',
  'apps/server/test/features/listeler/liste-esleme.feature',
  'apps/server/test/features/listeler/liste-indirme.feature',
  'apps/server/test/features/listeler/liste-saklama.feature',
  'apps/server/test/features/listeler/liste-yarislar.feature',
  'apps/server/test/features/listeler/liste-acilis.feature',
  'apps/server/test/features/listeler/liste-deneme.feature',
  'apps/server/test/features/listeler/liste-yuk.k6.js',
  'apps/server/test/steps/listeler/liste-adimlari.ts',
  'apps/server/test/steps/listeler/esleme-adimlari.ts',
  'apps/server/test/steps/listeler/yaris-adimlari.ts',
  'apps/server/test/support/kurucular/listeler.ts'
];

const T = (name, kind, asserts) => ({ name, kind, asserts });
const tests = [
  T("İlk yükleme önizlenir ve uygulanır", 'behavior', "Önizlemeden sonra GET boş ve liste sürümü 0 (yazma yok). Uygula sonrası etkin satırlar dosya sırasıyla 1..n, kaynak DOSYA, eklenme_ani sahte saatin anı, liste sürümü 1, tek liste_yuklemeleri satırı ve sayıları dosyayla birebir; birim_id ve donem_id dersinkine eşit."),
  T("Aynı dosya ikinci kez uygulanırsa yazma olmaz", 'behavior', "İkinci istek aynı beklenenFarkOzeti ile 200 ZATEN_UYGULANMIS; liste sürümü, satırların degisiklik_surumu ve yükleme sayısı değişmez. Kontrol: tek satırı farklı dosya eski özetle 409 LISTELER_SURUM_DEGISTI alır, kendi önizlemesinin özetiyle uygulanır."),
  T("Önizlemeden sonra fark değişirse uygula reddedilir", 'behavior', "A şubesi önizlenir; araya aynı dersin B şubesine aynı numara elle eklenir (A'nın liste sürümü değişmez, A'nın farkında eklenecek şube değişecek olur); A uygulanınca 409 LISTELER_SURUM_DEGISTI ve hiçbir satır, yükleme ya da denetim olayı yazılmaz, B'deki satır etkin kalır. Kontrol: araya farkı değiştirmeyen bir seçim PATCH'i girince A uygulanır."),
  T("Dosyada olmayan öğrenci pasif olur, silinmez", 'behavior', "Satır pasif_ani ile kalır, GET bolum=PASIF'te görünür, tablo satır sayısı azalmaz; listeler.satir_pasif olayı ayrinti.neden DOSYA ve yuklemeId ile, listeSatiriId var, numara ve ad yok."),
  T("Her geçiş kendi denetim olayını yazar", 'behavior', "Senaryo taslağı: ETKIN'den PASIF'e DOSYA, ELLE (PATCH) ve SUBE_DEGISIMI için listeler.satir_pasif; PASIF'ten ETKIN'e aynı nedenlerle listeler.satir_canlandi; elle eklemede listeler.satir_eklendi (ELLE), denemeListesiniKur'da (SISTEM); dosyayla eklemede satır olayı yok, yalnız listeler.yukleme_uygulandi; kırpmada listeler.satir_kirpildi (CANLANMA); seçim PATCH'inde tek listeler.gec_kayit_secimi_degisti. Her olayda listeSatiriId ve yapan var, numara ve ad yok (pozitif kontrol: kimlik alanı dolu)."),
  T("Yanlış dosya onaysız uygulanmaz, doğru dosya kaybı geri getirir", 'behavior', "2 x (pasifOlacak + subeDegisecek) bu şubenin ve taşınacakların eski şubelerinin etkin satırlarından büyükken buyukDegisiklikOnaylandi olmadan 409 LISTELER_ONAY_GEREKLI; onayla uygulanır. Doğru dosyada aynı satırlar canlanır (satır kimliği ve eklenme_ani aynı, pasif_ani boş); KARAR basamağındaki dinleyici CANLANDI satırlarıyla çağrılır ve aynı işlemde yeniden değerlendirme işi koyar (iş verisinde numara yok)."),
  T("Boş şubeye başka şubenin dosyası onaysız uygulanmaz", 'behavior', "A şubesi boşken B şubesinin dosyası A'ya önizlenir: subeDegisikligiGerekli true, buyukDegisiklik true; subeDegisikligiOnaylandi olmadan 409 LISTELER_ONAY_GEREKLI ve yazma yok. Kontrol: iki onayla uygulanınca B öğrencileri A'ya taşınır, B satırları satir_pasif (SUBE_DEGISIMI) ile pasif olur."),
  T("Hatalı satırlı dosya uygulanamaz", 'behavior', "Önizleme HATA bulgusunu dosya satır numarasıyla döner ve uygulanabilir false; uygula 400 LISTELER_HATALI_SATIR, alanlar yalnız yol taşır; tabloda değişiklik yok."),
  T("Sayı olarak saklanmış numara işaretlenir", 'behavior', "Senaryo taslağı: 9 haneli sayı hücresi UYARI, 10 haneli BILGI, 8 haneli HATA; uyarılı dosya uyarilarOnaylandi olmadan 409 LISTELER_ONAY_GEREKLI, onayla geçer; '0000000000' biçimli hücrenin baştaki 0'ı korunur."),
  T("Aynı numara iki kez", 'behavior', "Adlar eşleştirme işlevine göre aynıysa NUMARA_TEKRAR_AYNI_ISIM uyarısı ve tek satır; farklıysa NUMARA_TEKRAR_FARKLI_ISIM hatası."),
  T("Şube sütunlu dosyada yalnız seçilen şubenin satırları girer", 'behavior', "'1. Şube', '1.ŞUBE' ve '1' seçilen 1 şubesine uyar; '2. Şube' satırı SUBE_UYUSMUYOR UYARI alır, farka girmez (pasif yapmaz, eklemez) ve uyarilarOnaylandi olmadan 409 LISTELER_ONAY_GEREKLI; onayla uygulanınca disarida_kalan sayılır. Hiçbir satır uymazsa SUBE_SATIRI_YOK HATA ve uygula 400 LISTELER_HATALI_SATIR."),
  T("Öğrenci aynı dersin başka şubesine geçer", 'behavior', "A şubesindeki satır aynı işlemde pasif, B'de yeni satır ya da B'deki pasif satır canlanır (subeDegisecekler.hedefSatirId bu satırı gösterir); muaf ve geç kayıt seçimi dersin değeriyle taşınır; iki şubenin liste sürümü 1 artar; derste tek etkin satır kalır; önizleme eski şube etiketini gösterir; subeDegisikligiOnaylandi olmadan uygula 409."),
  T("Yeni yükleme muafı ve geç kayıt seçimini korur", 'behavior', "Muaf ve ONCEKI_YOK seçili satır yeni dosyayla uygulanınca iki değer aynı kalır; pasif olup canlanan satırda da aynı değerler; aynı (ders, numara) satırlarında değerler hep eşit."),
  T("Geç kayıt seçimi dersteki bütün satırlara yazılır", 'behavior', "Şube değişiminden sonra yeni satırda PATCH ile ONCEKI_YOK seçilince eski pasif satır da ONCEKI_YOK olur, tek gec_kayit_secimi_degisti olayı yazılır ve D08'in okuduğu ilk satırın değeri ONCEKI_YOK. Geç eklenmemiş numarada seçim PATCH'i 409 LISTELER_GEC_KAYIT_DEGIL ve yazma yok (kontrol: geç eklenen numarada 200)."),
  T("Ad farkı eşleştirme kuralına göre ayrılır", 'behavior', "Yalnız harf büyüklüğü ve boşluk farkı isimDegisecek sayılmaz, yazimDuzeltilecek sayılır ve görünen ad yenilenir; gerçek fark isimDegisecek ve listeler.isim_degisti olayı (değer yok) üretir, ESLESTIRME dinleyicisine ISIM_DEGISTI türüyle gider; uyelik_surumu değişmez."),
  T("Elle ekleme sona ekler", 'behavior', "Sıra etkinlerin en büyüğü artı 1, kaynak ELLE; aynı numara aynı adla ikinci kez 200 ZATEN_LISTEDE ve yazma yok; farklı adla 409 LISTELER_SATIR_ZATEN_VAR; pasif satırın numarası CANLANDI, eklenme_ani korunur, sıra en büyük artı 1 ve kaynak ELLE olur. PATCH pasif: false ile canlanmada da sıra ve kaynak aynı kuralla."),
  T("Geç eklenen öğrencide seçim", 'behavior', "İlk yapılan ders satırın şubesini kapsayan oturumlardan seçilir: aynı dersin öbür şubesinin daha erken oturumu sayılmaz (o şubede henüz ders yokken eklenen öğrenci gecEklendi false). İptal edilmiş ve 'yapılmadı' denmiş oturum sayılmaz, onaysız geçmiş oturum ve yapılmış telafi oturumu sayılır, deneme oturumu sayılmaz. İlk yapılan dersten sonra eklenen satırda gecEklendi true ve varsayılan ONCEKI_SAYILMAZ. PATCH ile seçim değişince HESAP dinleyicisi çağrılır; satırın degisiklik_surumu değişmez."),
  T("Kilitten sonra liste salt okunur", 'behavior', "Senaryo taslağı (dönem kilidi, arşivlenmiş ders, pasif şube, deneme dersi): uygula, satirlar ve PATCH 409 LISTELER_KILITLI; muafIsaretle fırlatmadan { sonuc: KILITLI, neden } döner; GET 200 ve kilit nedeni. Sahte saatle kilit anından 1 ms önceki işlem yazar, kilit anındaki işlem yazamaz."),
  T("muafIsaretle beklenen durumda fırlatmaz", 'behavior', "Deneme dersindeki satırda { sonuc: KILITLI, neden: DENEME_DERSI } döner ve D08'in muaf ucu beyanlı 409 DEVAM_ koduyla cevap verir (500 API_SUNUCU_HATASI değil); yok satırda SATIR_YOK. Aynı değerle iki eşzamanlı çağrıda (iki bağlantı) biri YAZILDI ve degisti true, öbürü DEGISMEDI, onceki ikisinde de doğru; değer numaranın dersteki bütün satırlarına yazılır."),
  T("Başka hocanın listesi görünmez", 'behavior', "Başka hocanın şubesine altı uçtan her biri 404 (LISTELER_SUBE_BULUNAMADI ya da LISTELER_SATIR_BULUNAMADI) ve cevapta numara yok; öğrenci oturumu 403; girişsiz 401. Kontrol: dersin hocası aynı isteklerde 200 alır."),
  T("PATCH gövdesi muaf alanını kabul etmez", 'behavior', "Gövdede muaf olan PATCH 400 ve satır değişmez. D08'in muaf ucu muafIsaretle ile yazar: liste sürümü ve satırın degisiklik_surumu değişmez, GET muafı gösterir."),
  T("Bekleyen kayıt liste uygulanınca eşleşir", 'behavior', "Belirlenimci iç içe geçme: bağlantı 1 BEGIN ve numaraIleEslestir (LISTEDE_YOK); bağlantı 2 aynı numarayı ekleyen uygulamayı başlatır ve beklediği doğrulanır (pg_locks'ta granted false); bağlantı 1 D01 kurucusuyla bekleyen hesabı ekler ve COMMIT; bağlantı 2 biter; hesap eslesti. Kova kilidi kaldırılınca bağlantı 2 beklemez ve iddia kırmızı olur. Ters sıra (önce liste) ayrıca: kayıt ESLESTI."),
  T("Gönderim ile canlanma yarışı ret bırakmaz", 'behavior', "İki bağlantı ve bariyer: bağlantı 1 gönderim işleminde uyelikDenetle'nin ilk okumasını yapar (PASIFTI); bağlantı 2 canlanmayı uygular ve kovayı tutarken bekletilir; bağlantı 1'in ret yolu kova kilidinde bekler (pg_locks granted false); bağlantı 2 taahhüt edilir; bağlantı 1 yeniden okur ve karar Var. Öbür sıra (gönderim kovayı önce alır): gönderim Ret ile taahhüt edilir, canlanmanın KARAR işi kararı Var'a çevirir."),
  T("Kayıt ile liste aynı anda kilitlenme kurmaz", 'behavior', "50 eşzamanlı kayıt (numaraIleEslestir ilk adım) ve 5 yükleme; hiçbir işlem 40P01 ya da 55P03 ile düşmez, kayıp eşleşme 0. D08'in muaf işlemi (muafIsaretle önce, iş kuyruğu sonra) eşzamanlı yüklemeyle de kilitlenme kurmaz. ESLESTIRME içinde kova kümesi dışındaki numarayla numaraIleEslestir iç hata atar (kontrol: küme içindeki numara geçer)."),
  T("Şube pasifleştirme ile uygula yarışmaz", 'behavior', "İki bağlantı: D02 şube pasifleştirmesi ile aynı şubeye uygula eşzamanlı; sonunda ya şube etkin ve satırlar var ya şube pasif, etkin satırı yok ve uygula 409 LISTELER_KILITLI; etkin satırlı pasif şube hiç oluşmaz. Ders arşivi ile aynı senaryo (D03-A07'deki paylaşımlı kilit eki gerekir)."),
  T("Kilit beklemesi aşılırsa uç meşgul döner", 'behavior', "Bağlantı 1 dersin sube_listeleri satırını açık işlemde tutarken uygula 3 s sonra 503 LISTELER_MESGUL ve Retry-After döner, hiçbir şey yazılmaz. Kontrol: bağlantı 1 bitince aynı istek 200."),
  T("Liste kaynağı ve kayıtlar açılışta hazır", 'behavior', "app.ts ve worker.ts girişleri ayrı ayrı kurulunca D02 liste kaynağı, iki indirme kaynağı ve saklama işleyicisi kayıtlıdır; aynı süreçte uygulama iki kez kurulunca 'aynı ad' hatası olmaz (defter örneğe bağlı). Kaynak kayıtlıyken etkin satırlı şubeyi pasif yapma DERSLER_SUBEDE_OGRENCI_VAR alır; satırsız şube pasif olur (pozitif kontrol)."),
  T("Dinleyiciler basamak sırasıyla ve aynı işlemde çağrılır", 'behavior', "Kayıt sırası tersine verilse de ESLESTIRME, KARAR, HESAP sırası; dinleyici aynı işlemin yazdığı satırları görür; hem canlanan hem adı değişen satır tek kayıtta iki türle gelir; bir dinleyici hata atarsa satır, liste sürümü, yükleme satırı ve denetim olayı kalmaz."),
  T("Hocaya şubenin bütün satırları, öğrenciye yalnız kendi satırı iner", 'behavior', "D06'nın ortak kaynak sözleşme yardımcısıyla (apps/server/test/support/kurucular/esitleme.ts, tipler packages/contracts/src/esitleme.ts): personelde Kapsam.subeler'deki satırlar sira dahil, değiştiren, kaynak, muaf ve seçim inmez; öğrencide yalnız kendi numarası (pozitif kontrol: kendi satırı var); pasif satır pasifAni ile ve silindi false; personelde anonim satır { id, silindi: true, veri: null }."),
  T("Teyitsiz öğrenciye ad inmez", 'behavior', "Kapsam.teyitli false iken öğrencinin kendi satırında adSoyad null (alan atlanmaz) ve cevapta yalnız kendi numarası; başkasının numarasıyla kaydolan teyitsiz hesap o öğrencinin adını alamaz. Kontrol: teyitli true iken aynı satırda ad var."),
  T("İndirme kaynağı sayfa kesmeye uyar", 'behavior', "2.000 satırlık tek yükleme tek sürüm taşır: (v-1, v] aralığında adet 100 ile çağrı 2.000 satırın hepsini döner; çok sürümlü aralıkta en çok adet satır, surum ve id artan; surumden null tam indirmede anonim satır yok."),
  T("Öğrenci kapsamı yalnız üyelik değişince yenilenir", 'behavior', "degistiMi ekleme, pasif, canlanma, kırpma ve şube değişiminden sonra true; yalnız ad ya da sıra değişince false (uyelik_surumu değişmez); bir anonimleştirmeden sonra herkes için true (yanlış pozitif serbest). kapsam anonim olmayan etkin ve pasif satırların şube, ders ve birim kümesi; devirde D03 sahipAtamaSurumu okumaz."),
  T("Değişen her satır işlemin tek sürümünü alır", 'behavior', "Bir uygulamanın inen sütunu değişen bütün satırları aynı degisiklik_surumu'nu, üyeliği değişenler aynı uyelik_surumu'nu taşır, değişmeyen satırınki eskidir; sürüm alma çağrısı dinleyicilerden ve denetimden sonra gelir (çağrı sırası kaydıyla)."),
  T("Numara ve ad loga, adres satırına ve denetime düşmez", 'behavior', "Senaryolar boyunca yakalanan pino satırlarında, denetim ayrıntısında, iş verisinde ve pg_locks anahtarlarında numara ve ad yok (pozitif kontrol: satır kimliği ve rota kalıbı var); doğrulama hatası değeri yankılamaz."),
  T("Üyelik yarı açık aralıkla cevaplanır", 'behavior', "Senaryo taslağı: an = eklenme_ani üye; an = pasif_ani PASIFTI; an < eklenme_ani HENUZ_EKLENMEMISTI; satır yoksa SATIR_YOK; birlikte işlenen şubelerden birinde satır yeter; sıfır uzunluklu kırpılmış satır hiçbir anda üye değil."),
  T("Satırların üyelik aralıkları kesişmez", 'property', "fast-check 500 deneme: rastgele yükleme, şube değişimi, elle ekleme, PATCH pasif ve canlandırma dizilerinden sonra (core aralik.ts ve fark.ts üzerinden, sunucuda da aynı dizilerle) her (ders, numara) için [eklenme_ani, pasif_ani) aralıkları ayrık ve etkin satır en çok bir."),
  T("Yanlış şubeye yüklenen dosya düzeltilince oturumlar karışmaz", 'behavior', "B şubesinin dosyası t1'de A'ya yüklenir (B öğrencileri A'ya taşınır), t2'de A'nın doğru dosyası, t3'te B'nin dosyası yüklenir: B öğrencilerinin A satırları kırpılır ([t1, t1)), A'nın [t1, t2) oturumları B öğrencilerinin T'sine girmez ve uyelikDenetle onları A'da üye saymaz; A öğrencileri [eA, sonsuz) ile döner."),
  T("Numara ile eşleştirme", 'behavior', "Senaryo taslağı: IŞIK ile ışık ESLESTI; Sahin ile Şahin ISIM_UYUSMUYOR; yalnız pasif satır LISTEDE_YOK; açık dönemdeki iki etkin satırda farklı ad ISIM_UYUSMUYOR ve isimlerTutarsiz; U+00A0 ve çift boşluk eşleşir."),
  T("Geçmiş dönemin satırı eşleşmeye ve yetkiye girmez", 'behavior', "Kilitli dönemde farklı yazılmış ad ESLESTI'yi bozmaz (kontrol: aynı satır açık dönemdeyken ISIM_UYUSMUYOR); ogrencininEtkinSatirlari kilitli dönemdeki dersi döndürmez, arşivlenmiş dersi döndürmez; D09'un teyit ucunda kilitli dönemdeki dersin hocası 404, açık dönemdeki hoca 200 (pozitif kontrol)."),
  T("Öğrencinin bütün satırları", 'behavior', "ogrencininSatirlari şube değişiminden sonra eski pasif ve yeni etkin satırı, kilitli dönemin satırını da döner; donemIdler süzgeci yalnız o dönemleri bırakır; anonim satır dönmez."),
  T("Deneme listesi kurulur", 'behavior', "denemeListesiniKur ilk çağrıda kaynak SISTEM, sira 1 satır açar; aynı numara ve adla ikinci çağrı yazmaz; farklı numarayla çağrıda eski satır pasif, yenisi etkin; deneme olmayan şubede iç hata; deneme şubesinde hoca uçları 409 LISTELER_KILITLI (DENEME_DERSI) alırken işlev yazar."),
  T("Yükleme geçmişi sayfalı ve kişisel veri taşımaz", 'behavior', "Yeniden eskiye; adet sınırı ve sonrakiImlec ile bütün sayfalar gezilince her yükleme bir kez; cevapta numara ve ad yok; bozuk imleç 400."),
  T("Pasif satırlar sayfalı döner", 'behavior', "bolum=PASIF adet 500 ile 1.200 pasif satır üç sayfada, pasifAni azalan, her satır bir kez; bolum=ETKIN'de sonrakiImlec null ve en çok 2.000 öğe; bozuk imleç 400."),
  T("Saklama işleyicisi süresi dolan birim dönemini anonimleştirir", 'behavior', "saklamaIsleyicisiKaydet('listeler.liste_satirlari') ile kayıtlı; sahte saatle birim döneminin kilit anı sinirAni'den 1 ms sonra olan satır kalır, sinirAni'ye eşit ya da önce olan anonimleşir (numara ve ad boş, silinme_ani işlem anı, tek sürüm); partiBoyutu 2 ile 5 satır üç partide, son partide bitti true; tekrar çağrı satirSayisi 0 ve bitti true; birimsiz deneme dersi seçilmez; D12'nin kanıt satırı veri sınıfı adıyla yazılır; dış yüzler bu satırları döndürmez, hocanın indirmesinde silindi true."),
  T("Hata önceliği", 'behavior', "Senaryo taslağı: kilitli dönemde başarılı uygulamanın yeniden denemesi 200 ZATEN_UYGULANMIS; HATA bulgulu istek kilitli şubede de 400 LISTELER_HATALI_SATIR; kilitli şubede farklı dosya 409 LISTELER_KILITLI (özet farklı olsa da); onaysız ve sınırı aşan dosya önce LISTELER_ONAY_GEREKLI."),
  T("Satır sınırları", 'behavior', "2.001 satırlı istek 400; etkin satırı 2.000'i aşacak uygulama 409 LISTELER_SATIR_SINIRI ve önizlemede satirSiniriAsilir true, uygulanabilir false; üç yanlış dosyayla toplam satır 6.000'i geçtikten sonra elle ekleme yine yapılır (toplam sınır yok); 2 MiB üstü gövde 413 GOVDE_COK_BUYUK; 2.000 satırlık en büyük istek kabul edilir."),
  T("Başka şubede etkin öğrenciyi elle eklemek onay ister", 'behavior', "subeDegisikligiOnaylandi olmadan 409 LISTELER_BASKA_SUBEDE ve yazma yok; onayla şube değişimi olur. PATCH pasif: false için aynı kural."),
  T("Ad anahtarı iki kez uygulanınca değişmez", 'property', "fast-check 1.000 deneme: isimAnahtari(isimAnahtari(x)) = isimAnahtari(x); Türkçe harf, U+00A0, sıfır genişlikli karakter ve birleşik nokta içeren üreteçlerle."),
  T("Ad eşleşmesi yansımalı ve simetrik", 'property', "fast-check 1.000 deneme: isimlerEslesir(a, a) ve isimlerEslesir(a, b) = isimlerEslesir(b, a)."),
  T("Türkçe büyük harf kendi küçüğüyle eşleşir, harf sadeleştirmesi yoktur", 'property', "Açık eşlemeyle büyütülen her ad kendi küçüğüyle eşleşir; Ş ile S, Ç ile C, Ğ ile G, Ö ile O, Ü ile U, I ile i eşleşmez (tablo testi ve üreteç)."),
  T("Fark uygulanınca etkin küme dosyanın numara kümesine eşit olur", 'property', "fast-check 500 deneme: rastgele mevcut liste ve dosyayla fark uygulanınca etkin numaralar dosyadaki geçerli ve şubeye uyan numaralara eşit; aynı dosyayla ikinci fark boş (eş güçlü)."),
  T("Fark hiçbir satırı silmez", 'property', "fast-check 500 deneme: farktan sonra satır sayısı azalmaz; pasif olan ve etkin kalanların toplamı önceki etkinlere eşit; sıra 1..n kesintisiz."),
  T("Fark özeti farkla birebir", 'property', "fast-check 500 deneme: aynı fark aynı özeti verir (satır sırasından bağımsız); tek alanı (tür, hedef şube, ad, sıra, geç eklenme) değişen fark farklı özet verir; boş farkın özeti sabittir."),
  T("Kova numarası belirlenimci", 'property', "fast-check 1.000 deneme: kovaNo 0 ile 255 arasında ve aynı numaraya hep aynı; 100.000 rastgele numarada her kova beklenenin yarısından çok ve iki katından az."),
  T("Şube anahtarı yazım farkında aynı kalır", 'property', "'1. Şube', '1.ŞUBE', 'şube 1', ' 1 ' aynı anahtara iner; '1' ile '11' ve 'A' ile 'B' farklı kalır."),
  T("CSV yazılıp okununca aynı hücreler", 'property', "fast-check 1.000 deneme: tırnak, ayırıcı ve satır sonu içeren hücrelerle RFC 4180 metni noktalı virgül, virgül ve sekmeyle yazılıp okununca aynı hücreler ve aynı ayırıcı."),
  T("Kodlama gidiş dönüşü", 'property', "Rastgele Türkçe metin UTF-8, UTF-8 BOM, UTF-16LE ve UTF-16BE BOM'lu ve windows-1254 baytlarına çevrilip geri çözülünce aynı metin ve doğru kodlama adı."),
  T("Başlık anahtarı yazım farkında aynı kalır", 'property', "'ÖĞRENCİ NO', 'Öğrenci No:', 'OGRENCI  NO' ve 'öğr. no' gibi biçimler sözlükteki anahtara iner; 'Sıra No' 'no' ile eşleşmez."),
  T("Numara denetimi", 'property', "9 ya da 10 ASCII rakam dışındaki her metin NUMARA_BICIMI; =\"0123456789\" sarmalı soyulur; Arapça ve tam genişlikli rakamlar reddedilir."),
  T("Örnek dosyalar okunur", 'behavior', "Vitest: ornekler klasöründeki her dosya (BOM'lu ve 1254 CSV, UTF-16 sekmeli metin, sayı hücreli ve sıfır biçimli xlsx, başlık üstü satırlı, ayrı ad soyadlı, ikinci sayfada, eski xls, HTML tablolu xls) beklenen satırlara; parolalı dosya DOSYA_PAROLALI; maskeli AKSİS örneği geldiğinde aynı testle (D03-A01). SheetJS packages/core'da yalnız test bağımlılığıdır, panelle aynı sabit paket dosyası (istek D15'e); okuma.ts onu içe aktarmaz."),
  T("Rota listesi altı uçtan oluşur", 'contract', "packages/contracts/src/listeler.ts rota listesi bu altı yöntem ve yolla birebir; GET'in bolum, imlec ve adet sorgu şeması D13'ün sayfaSorgusuSemasi'ndan; D13'ün rota tablosu testi her uç için kimliksiz 401, yanlış rol 403 dener."),
  T("İstek şemaları katıdır", 'contract', "Bilinmeyen alan 400; PATCH'te muaf 400; satirlar 1 ile 2.000; dosya türü ile kodlama ve ayırıcı tutarlılığı; dosyaSatirNo istekte tekil; beklenenFarkOzeti 43 karakter base64url."),
  T("Cevaplarda kod değerleri genişleyebilir", 'contract', "kilit, kaynak, bulgu kodları, sonuc ve hata kodları cevap şemasında x-extensible-enum; istek şemalarında (bolum dahil) kapalı enum."),
  T("Göç adları ve türleri kurala uyar", 'contract', "Her kısıt ve dizin adı kisitAdi(tablo, gerçek sütun listesi, tür) çağrısıyla üretilir ve şema testi aynı çağrıyla karşılaştırır (çok sütunlu CHECK'lerde bütün sütunlar adda; hepsi 63 baytın altında); dizinsiz her yabancı anahtar @dizinsiz-kabul yorumlu ya da bir dizinin önünde; uuidv7() varsayılanı; anlar timestamptz; CHECK listeleri sözleşmedeki sabitlerle aynı (sabitler içe aktarılır); göç yalnız D03 tablolarına dokunur."),
  T("Her LISTELER_ kodu en az bir senaryoda döner", 'contract', "D13'ün kapsama testi: katalogdaki on bir kodun her biri bir senaryoda gerçekten döner."),
  T("Modül sınırı", 'contract', "Biome noPrivateImports: başka modül yalnız modules/listeler/index.ts'i içe aktarır; listeler D01, D07 ve D08'i içe aktarmaz; dependency-cruiser döngü bulmaz."),
  T("Liste uçlarının süre bütçesi", 'load', "Yayın öncesi yük testinde: 2.000 satırlık önizleme p95 500 ms, uygula p95 2 s, 2.000 etkin satırlık GET p95 300 ms altında; uygulamada kova kilitlerinin tutulma süresi p95 500 ms, sayaç kilidinin p95 50 ms altında."),
  T("Dönem başı yoğunluğu", 'load', "Saniyede 200 öğrenci kaydıyla birlikte dakikada 10 liste uygulaması, aralarında bir adet 2.000 satırlık canlanma yüklemesi: kayıtlarda 55P03 ve 5xx sayısı 0, kilitlenme 0, kayıp eşleşme 0, kayıt işleminin kova kilidi beklemesi p95 1 s altında. Ayrıca saniyede 50 kayıt sürerken 300 satırlık 5 uygulama: 55P03 yok."),
  T("Ortak kurallar mutasyon eşiği", 'mutation', "D15'in haftalık Stryker işinde packages/core/src/listeler kırma eşiğinin altına düşmez; isim.ts, numara.ts, fark.ts, fark-ozeti.ts, aralik.ts ve kova.ts'te yaşayan mutant kalmaz (bilinçli eşdeğerler yorumla gerekçelenir)."),
  T("Danışma kilidi mutasyonu", 'mutation', "kilitler.ts'teki dışlayıcı kova kilidi kaldırılınca 'Bekleyen kayıt liste uygulanınca eşleşir' senaryosu, uyelikDenetle'nin ret yolu kilidi kaldırılınca 'Gönderim ile canlanma yarışı ret bırakmaz' senaryosu kırmızı olur; dosya md5 ile geri yazılınca yeşil."),
  T("Kırpma mutasyonu", 'mutation', "aralik.ts'teki kırpma adımı kaldırılınca 'Satırların üyelik aralıkları kesişmez' ve 'Yanlış şubeye yüklenen dosya düzeltilince oturumlar karışmaz' kırmızı olur; geri yazılınca yeşil."),
  T("Sürüm son adım mutasyonu", 'mutation', "surumAl çağrısı dinleyicilerden önceye alınınca 'Değişen her satır işlemin tek sürümünü alır' senaryosu kırmızı olur; geri yazılınca yeşil.")
];

const G = (gap, decision, why) => ({ gap, decision, why });
const resolved_gaps = [
  G('D03-B02', "Dosyayı panel okur (SheetJS ile; okuma kuralları packages/core/src/listeler'de). Sunucuya yalnız eşlenmiş satırlar JSON olarak gider: dosyaSatirNo, ogrenciNo (ham metin), adSoyad, subeEtiketi, sayiHucresi ve dosya bilgisi (tür, kodlama, ayırıcı). Satır kurallarını panel ve sunucu aynı core işlevleriyle uygular; istek şeması katıdır. Dosya ve fazladan sütunlar (e-posta, TC) sunucuya hiç ulaşmaz; tür, kodlama ve ayırıcı yalnız liste_yuklemeleri satırına yazılır.", "API yalnız JSON alır (D13) ve SheetJS yalnız panel sayfalarında yüklenir (teknik.html#panel-excel); sunucuda ayrıştırıcı ve zip bombası yüzeyi açılmaz, tutulmayan veri (plan.html#kararlar-e-posta-gonderimi: e-posta ve TC yok) hiç gelmez."),
  G('D03-B03', "Fark sunucuda hesaplanır; önizleme ve uygula durumsuz iki uçtur, saklanan önizleme yok. Önizleme şubenin satırlarını ve gelen numaraların aynı dersteki öbür satırlarını tek SQL deyimiyle (tek anlık görüntü) okur, farkı ve farkın özetini döner: farkOzeti = base64url(SHA-256(kurallı fark)), kurallı fark satır başına satirId ya da numara, değişiklik türü, eski ve hedef şube, yeni ad, sıra ve geç eklenme bilgisinin sıralı listesidir (packages/core/src/listeler/fark-ozeti.ts). Uygula aynı satırları ve beklenenFarkOzeti'ni taşır; kilitlerden sonra fark yeniden hesaplanır: boşsa 200 ZATEN_UYGULANMIS (yazma yok), özet farklıysa 409 LISTELER_SURUM_DEGISTI, eşitse bütün değişiklikler, dinleyiciler ve sürüm tek işlemde. Şubenin liste_surumu satirlar ve PATCH için kalır.", "Hoca görmediği bir farkı onaylayamaz: yalnız hedef şubenin sürümü, dersin öbür şubesine yapılan ve bu şubenin farkını değiştiren yazmayı (eklenecek öğrencinin şube değişecek olması) yakalamazdı; özet bunu ve READ COMMITTED altında ayrı deyimlerle okumanın yarattığı tutarsızlığı kapatır. Çift tıklama ve yeniden deneme zararsız kalır; tek işlem yarım listeyi önler (teknik.html#sunucu-mimari)."),
  G('D03-B04', "Hepsi ya da hiçbiri; satır başına seçim yalnız geç eklenenlerin geç kayıt seçimi. Önizleme türleri: eklenecek, pasif olacak, canlanacak, kırpılacak, ad değişecek, yazım düzeltilecek, şube değişecek, sıra değişecek (yalnız sayı), değişmeyen, dışarıda kalan; bulgular HATA, UYARI, BILGI. Büyük değişiklik tam sayıyla tanımlanır: 2 x (pasifOlacak + subeDegisecek) > (bu şubenin etkin satırı + taşınacakların eski şubelerindeki etkin satırlar); öyleyse uygula buyukDegisiklikOnaylandi ister ('Bu dosya bu şubenin listesine benzemiyor'). Şube değişecek öğrenci varsa (ozet.subeDegisecek > 0) uygula subeDegisikligiOnaylandi ister; tek öğrenciyi elle almakla (satirlar, PATCH) aynı kural. Önizleme hiçbir tabloya yazmaz.", "Yanlış dosya en çok pasif olacaklarda ve taşınacaklarda zarar verir: başka şubenin dosyası boş şubeye yüklenince o şubenin bütün öğrencileri taşınır ve satırları pasif olur, yalnız bu şubenin pasif olacaklarını sayan kural bunu görmezdi. Plan değişikliklerin uygulanmadan önce gösterilmesini istiyor (plan.html#hoca-liste-yukleme)."),
  G('D03-B05', "HATA bulgusu varken uygula 400 LISTELER_HATALI_SATIR; UYARI varken uyarilarOnaylandi olmadan 409 LISTELER_ONAY_GEREKLI. Sayı hücresinde biçimli metin yalnız rakamsa kullanılır, değilse tam sayı ham değer; 10 rakam BILGI, 9 rakam UYARI, 9'dan kısa HATA. Tür bilgisi olmayan dosyada (CSV ve HTML tablo) 9 ve 10 haneli numaralar karışıksa azınlıktaki uzunluk (eşitlikte 9 haneliler) UYARI. Aynı numara iki kez: adlar eşleşiyorsa UYARI ve ilk satır sayılır, değilse HATA. Tamamen boş satır ve numarası da adı da boş dipnot satırı panelde atlanır, bilgi olarak gösterilir; adı dolu numarası boş satır HATA (NUMARA_BICIMI). Ad 1 ile 200 karakter, denetim karakteri yok.", "Atlanan hatalı satır öğrenciyi 'dosyada yok' sayıp pasif yapar; baştaki 0'ı düşmüş numara kendi sahibiyle eşleşemez ve kaydı bekletir (plan.html#kararlar-e-posta-gonderimi)."),
  G('D03-B06', "Sabit sözlük packages/core/src/listeler/baslik.ts'te, öncelik sırasıyla: numara 'öğrenci no', 'öğrenci numarası', 'öğr no', sonra 'numara', en son 'no'; ad 'ad soyad', 'adı soyadı', 'ad soyadı' ya da ayrı 'ad'/'adı' ile 'soyad'/'soyadı' (birleştirme: ad, bir boşluk, soyad); şube 'şube'. Başlık anahtarı: NFC, Türkçe kuralla küçültme, Türkçe harf sadeleştirme, baş ve son boşluk silme, çoklu boşluğu teke indirme, nokta ve iki noktayı atma; eşleşme anahtarın tamamıyla. İlk 20 satırda numara ve ad başlığını birlikte taşıyan ilk satır başlıktır; ilk sayfada yoksa sonraki sayfalar. Bulunamazsa panel elle eşleme açar ve aynı işlev açık eşlemeyle çağrılır.", "Plan yalnız dönüşümü yazıyor (plan.html#hoca-liste-yukleme); 'Sıra No' gibi sütunun 'no' ile karışmaması için öncelik ve tam eşleşme gerekir. Kesin sözlük maskeli AKSİS örneğiyle güncellenir (D03-A01)."),
  G('D03-B07', "Kodlama teknik.html#panel-excel sırasıyla: BOM (UTF-8, UTF-16LE, UTF-16BE), yoksa katı UTF-8, olmazsa windows-1254 (core'da sabit tabloyla, ICU verisine bağlı değil). Ayırıcı adayları noktalı virgül, virgül ve sekme: her biriyle ilk 20 satırda başlık aranır, başlığı bulan tek aday seçilir; birden çoğu bulursa AYIRICI_BELIRSIZ, hiçbiri bulamazsa elle eşleme. RFC 4180 tırnak kuralları; numara hücresinde =\"...\" sarmalı soyulur.", "Türkçe Excel CSV'yi noktalı virgülle, 'Unicode metin' çıktısını UTF-16 ve sekmeyle kaydeder; seçim kuralı yazılmazsa aynı dosya iki yerde farklı okunur."),
  G('D03-B08', "Satır öğrenciyi numara (metin) ve dosyadaki adla tutar; kişi tablosuna yabancı anahtar yok. (şube, numara) tekil; hesapla bağ numara üzerinden sorgu anında kurulur (numaraIleEslestir, ogrencininEtkinSatirlari).", "Liste kayıttan önce yüklenir (plan.html#gun), telefonsuz öğrenci hiç kaydolmayabilir, silinen hesap yeniden kaydolunca yeni hesap açılır (plan.html#kararlar-hesap-silme); sözleşmedeki dış yüz de numarayla çalışıyor. Modüller arası öğrenci kimliği D03-A08'de."),
  G('D03-B10', "uyelikDenetle tek bir anda cevaplar: satır [eklenme_ani, pasif_ani) yarı açık aralığında ve verilen şubelerden birinde ise üye. Envanterdeki pencere kesişimi önerisi yerine tek an seçildi: sözleşme imzası tek an alıyor ve kararın sahibi D07 'oturum anı' diyor (D07-B21); öneri kaydın hesaplanan saati, ulaşma anı hiç. Birlikte işlenen şubeler için şube dizisi kabul edilir.", "Yarı açık aralık pasif olmadan önceki oturumun geç gelen kaydını reddetmez, ders sırasında eklenip yoklama veren öğrenciyi de reddetmez; hangi anın kullanılacağı karar kuralıdır, D07'nin."),
  G('D03-B12', "gec_kayit_secimi metin ve CHECK (ONCEKI_SAYILMAZ varsayılan, ONCEKI_YOK); değer (ders, numara) başına tektir, yazan her yol numaranın o dersteki bütün satırlarına aynı işlemde yazar (tek denetim olayı), şube değişimi hedef satıra kopyalar; D08 hangi satırı okursa okusun aynı değeri görür. Seçim yalnız derse eklenme anı (numaranın o dersteki satırlarının en eski eklenme_ani) ilk yapılan dersten sonra olan numarada anlamlıdır (gecEklendi; önizlemede ve GET'te tek ad). İlk yapılan ders o en eski satırın şubesini kapsayan oturumlardan seçilir: D02.oturumlariGetir({ subeId, durum: 'planlandi', baslangicAniEnCok: işlem anı, sira: 'artan' }), yapildi false olanlar atlanır, onaysız (yapildi null) geçmiş oturum sayılır; telafi oturumu yapıldıysa sayılır (yapılmış derstir), deneme oturumu sayılmaz (denemeDahil false). Seçim önizlemede satır başına verilir (panel toplu seçtirebilir), sonra PATCH ile değişir; gecEklendi false numarada seçim PATCH'i 409 LISTELER_GEC_KAYIT_DEGIL. Her değişiklik denetime yazılır ve HESAP dinleyicisi (D08) çağrılır. Ekle-bırak bitişi GET ve önizlemede yalnız ipucudur (D02-B31); varsayılan değişmez.", "Plan varsayılanı ilki diyor ve seçimi yalnız ilk yapılan dersten sonra eklenende gösteriyor (plan.html#devam); listesini geç yükleyen hocanın bütün öğrencileri yanlışlıkla Yok almasın. Satır başına saklanan seçim şube değişiminden sonra iki satırda ayrışır ve D08'in okuduğu eski satır hocanın yeni seçimini sessizce yok sayardı; şubeleri farklı günlerde ders yapan derste başka şubenin ilk dersi henüz dersi olmamış şubeye eklenen öğrenciyi geç eklenmiş gösterirdi."),
  G('D03-B13', "Pasif satır telefona silindi işaretiyle değil pasifAni dolu güncelleme olarak iner; silindi yalnız satır anonimleştirilince true olur. Envanterdeki evet/hayır silindi sütunu yerine D12-B16'daki yaşam döngüsü biçimi: silinme_ani (boş olabilen an) ve telefona inen silindi bundan türer. D08-B12'deki 'pasif silindi işaretiyle iner' sözü yerine bu kural geçerlidir; dersin öğrenci kapsamından çıkıp çıkmayacağı D06'nın kapsam kuralıdır (D06-B15). Telefon pasifAni'den sonra başlayan oturumda pencere açmaz, gönderilmemiş kayıtları yine gider, kararı sunucu verir. Hoca telefonunda pasif öğrenci elle ekleme seçiminde çıkmaz ama satır kalır (makbuzdaki ad çözülür).", "Satır hiç silinmez (plan.html#hoca-liste-yukleme); silindi işareti pasiflik için kullanılırsa canlanmada telefon veriyi kaybeder."),
  G('D03-B15', "Yükleme hocanın seçtiği tek şubeye yapılır. Dosyada şube sütunu varsa panel satırları core şube anahtarıyla (sube.ts: NFC, Türkçe küçültme, 'şube' sözcüğü ile harf ve rakam dışı atılır; '1. Şube' ile '1' aynı) seçilen şubeye göre süzer ve dışarıda kalanları ayrı gösterir; sunucu gelen satırlarda etiketi aynı işlevle yeniden denetler: uymayan satır SUBE_UYUSMUYOR UYARI olur, farka girmez ve onayla dışarıda kalır; hiçbir satır uymazsa SUBE_SATIRI_YOK HATA. (ders_id, ogrenci_no) üzerinde etkin satırlar için kısmi tekil dizin; ders_id satıra şubeden kopyalanır. Başka şubede etkin öğrenci önizlemede şube değişecek görünür (hedefSatirId ile) ve uygula subeDegisikligiOnaylandi ister; uygula aynı işlemde eski satırı pasif yapar, hedef şubede numaranın pasif satırı varsa onu canlandırır (tekil dizin yeni satıra izin vermez), yoksa yeni satır açar; muaf ve seçim (ders, numara) değeri olduğundan hedef satırda aynıdır (kopyalanır); iki şubenin liste sürümünü artırır.", "Liste şubeye bağlı (teknik.html#kod-veri-modeli); iki şubede etkin satır iki pencere ve çift sayım demek. AKSİS biçimi bilinmezken (D03-A01) yazım farkı ('1. Şube' ile '1') ya da ders bazlı dışa aktarım hocayı yükleme yapamaz bırakmamalı; süzme bunu karşılar, öbür şubenin öğrencisini sessizce pasif yapmaz. AKSİS dışa aktarımı ders bazlı çıkarsa sözlük ve örnekler güncellenir."),
  G('D03-B17', "Dönem kilidi (D02.kilitDurumu'nun verdiği kilit anı işlem anıyla karşılaştırılır), arşivlenmiş ders, pasif şube ve deneme dersi listeyi salt okunur yapar: bütün yazma uçları 409 LISTELER_KILITLI, muafIsaretle fırlatmadan KILITLI sonucu; GET kilit nedenini döner. Kilitten sonra yalnız saklama işleyicisi, deneme şubesinde de denemeListesiniKur yazar. Yazma çarpıklığını önlemek için D03 kendi şube satırı kilidinden sonra şube ve ders satırını D02'den paylaşımlı kilitle okur (subeGetir ve dersGetir'e kilitle: 'paylasimli' seçeneği, SELECT ... FOR SHARE); D02'nin pasifleştirme ve arşiv işlemleri aynı satırları FOR UPDATE alır ve liste kaynağını kilitten sonra sorar (sözleşme eki D03-A07). Kilitli dönemde bile fark boşsa ZATEN_UYGULANMIS döner (yazma yok).", "AKSİS özeti ve T liste satırlarına dayanır; kilitten sonra değişen liste kesinleşmiş sonucu sessizce değiştirir (plan.html#devam-donem-sonu). READ COMMITTED altında D02 'etkin satır yok' koşulunu, D03 'şube etkin' koşulunu kilitsiz okusaydı ikisi birlikte taahhüt edilip etkin satırlı pasif şube kurabilirdi."),
  G('D03-B18', "Eşleştirme packages/core/src/listeler/isim.ts'te tek saf işlevdir, sunucuda numaraIleEslestir içinden çağrılır; Intl ve SQL lower() kullanılmaz. Adımlar: NFC; Unicode boşlukları (U+00A0 dahil) boşluk; U+200B, U+200C, U+200D ve U+FEFF silinir; baş ve son boşluk silinir, çoklu boşluk teke iner; I ı'ya, İ i'ye açık eşlemeyle, sonra yerel ayarsız küçültme; i'den sonra gelen U+0307 silinir. Harf sadeleştirme ve noktalama silme yok. Yalnız etkin satırlarla eşleşir; etkin tanımı dış yüzlerde tektir: pasif değil, anonim değil, ders arşivde değil ve birim dönemi işlem anında kilitli değil. Kural: açık dönemlerdeki bütün etkin satırlar eşleşmeli; numaranın bu satırları kendi aralarında farklı addaysa ISIM_UYUSMUYOR ve isimlerTutarsiz. ogrencininEtkinSatirlari aynı tanımla teyit ve cihaz değişimi yetkisini verir.", "Veritabanı C.UTF-8 (teknik.html#veritabani-donem-alani); Excel'den gelen bölünmez boşluk ya da birleşik nokta doğru öğrenciyi hoca onayına düşürmesin; IŞIK ile ışık eşleşir, Sahin ile Şahin eşleşmez (plan.html#kararlar-e-posta-gonderimi). Satırlar dönem sonunda pasif olmadığından tanımda dönem olmasaydı geçmiş yılın listesi kalıcı ISIM_UYUSMUYOR üretir, yıllar önceki dersin hocası teyit yetkisi alırdı."),
  G('D03-B19', "Bekleyen kayıtların eşleşmesi aynı işlemde, öğrenci kova kilidiyle: kova = SHA-256(numara)'nın ilk baytı (kovaNo, 0 ile 255); D03 yazması fark hesaplandıktan sonra üyeliği ya da adı değişen numaraların kovalarını artan sırayla pg_advisory_xact_lock(3, kova) ile dışlayıcı alır (3 modül numarası; iki tam sayılı uzay D12.danismaKilidi'nin bigint anahtarlarıyla çakışmaz, anahtarda numara yok); numaraIleEslestir aynı kovanın paylaşımlı kilidini alır ve her çağıranda işlemin ilk kilididir; uyelikDenetle ret yolunda aynı paylaşımlı kilidi alır. Yalnız seçim ve muaf yazımı kova almaz. Aynı dersin yazanları dersin şubelerinin sube_listeleri satırlarını kimlik sırasıyla FOR UPDATE alarak sıralanır. Uygula ESLESTIRME basamağında D01'in dinleyicisini yalnız değişikliğin numaralarıyla çağırır; KARAR basamağı kayıtları kilit içinde değerlendirmez, aynı işlemde D07'nin yeniden değerlendirme işini kuyruğa koyar. Her yazma SET LOCAL lock_timeout = '3s' koyar; 55P03 503 LISTELER_MESGUL olur; kayıt tarafı (D01) bir kez yeniden dener. D01'in istediği numara başına anahtar kova ile karşılanır.", "Tek global anahtar her yazmada üniversitedeki bütün kayıtları durdururdu ve kilit KARAR dinleyicisinin binlerce kaydı yeniden değerlendirmesi boyunca tutulurdu; yoklama_api'nin 2 s lock_timeout'u (D12-B03) dönem başında kayıtları 55P03 ile düşürürdü. Numara başına kilit 2.000 satırlık yüklemede 2.000 kilit alırdı; 256 kova bunu sınırlar, kilit yalnız yazım ve eşleştirme süresince tutulur. Zamanlanmış uzlaştırma işi öğrenciyi gereksiz bekletirdi."),
  G('D03-B20', "Her uygulama bir liste_yuklemeleri satırı (kim, ne zaman, dosya türü, kodlama, ayırıcı, sayılar, onaylar; dosya, numara ve ad yok) ve listeler.yukleme_uygulandi olayı yazar. Geçiş başına kural: her ETKIN'den PASIF'e geçişte listeler.satir_pasif (ayrinti.neden DOSYA, ELLE, SUBE_DEGISIMI ya da SISTEM; yuklemeId), her PASIF'ten ETKIN'e geçişte listeler.satir_canlandi (aynı nedenler), her kırpmada listeler.satir_kirpildi (CANLANMA), elle ve SISTEM eklemede listeler.satir_eklendi, dosyayla eklemede satır olayı yok (yalnız yükleme olayı), ad değişiminde listeler.isim_degisti (değer yok), seçim değişiminde tek listeler.gec_kayit_secimi_degisti. Sıra değişikliği olay yazmaz; muaf olayını D08 yazar. Olaylar D09.denetimeYaz ile, listeSatiriId, yapan ve yükleme kimliğiyle; numara ve ad yok.", "Pasiflik ve seçim devam sonucunu değiştirdiği için kimin ne zaman çıkardığı itirazda kanıttır (plan.html#devam), satırda yalnız son durum durur. Dosyayla eklemenin kimi ve anı yükleme satırında olduğundan 2.000 olayı tek olaya indirmek bilgi kaybettirmez."),
  G('D03-B21', "Şube başına en çok 2.000 etkin satır; pasif satırlar sınıra girmez ve toplam satır sınırı yoktur. İstek en çok 2.000 satır; önizleme ve uygula gövdesi en çok 2 MiB, öbür uçlar 64 KiB; panel 10 MiB üstü dosyayı okumaz. Envanterdeki 1 MB yerine D13-B11'in 2 MiB değeri alındı. D13-B13'ün sınıf boyu sert sınırı (2.000 satır) GET bolum=ETKIN'e uyar; pasif satırlar bolum=PASIF ile D13 imleç deseniyle (pasifAni azalan, id; adet en çok 500) gelir, istisna gerekmez. Önizleme ve uygula eşzamanlı ve tek işlemde; sunucu ilerleme bildirmez, ilerleme çubuğu panelin dosya okumasını gösterir (tasarim.html#anat-progress).", "Gövde sınırı açıkça yazılır (teknik.html#sunucu); 2.000 satırın en kötü JSON'u yaklaşık 1,8 MB. Satır hiç silinmediği için toplam sınır birkaç yanlış dosyadan sonra şubeyi kalıcı olarak kilitlerdi ve hocanın çıkış yolu olmazdı; pasifler sayfalandığından cevap boyu toplamla büyümez."),
  G('D03-B22', "Uçlar /v1/listeler altında, şube ve satır UUIDv7 kimliğiyle; numara yolda ve sorguda yok. Kodlar paylaşılan kuraldaki modül önekiyle (LISTELER_, envanterdeki LISTE_ değil). Başka hocanın kaynağı 403 değil 404 (D13-B02, envanterdeki LISTE_YETKI_YOK kalktı); 403 yalnız rol için. Doğrulama hatasında yalnız alan yolu; gizleme yolları sözleşmedeki LISTELER_GIZLI_ALANLAR sabitiyle D15'in pino ayarına verilir.", "Öğrenci numarası adres satırına konmaz (teknik.html#sunucu-ayarlar); yetkisiz kaynağın varlığını sızdırmamak için 404 (plan.html#baslangic: başka hocanın dersini görme ret senaryosu)."),
  G('D03-B24', "Elle ekleme dosya satırıyla aynı kurallardan geçer: numara 9 ya da 10 ASCII rakam, ad 1 ile 200 karakter; sıra etkin satırların en büyüğü artı 1, kaynak ELLE; geç eklenen ve dersin hiçbir satırı olmayan numarada seçim aynı istekte. Numara bu şubede etkin ve ad eşleşiyorsa ZATEN_LISTEDE (yazma yok), eşleşmiyorsa 409 LISTELER_SATIR_ZATEN_VAR; pasif satır varsa yeni satır açılmaz, satır canlanır (sıra en büyük artı 1, kaynak ELLE) ve ad yenilenir; başka şubede etkinse subeDegisikligiOnaylandi ister. PATCH pasif: false da aynı sıra ve kaynak kuralıyla canlandırır. Sonraki dosyada olmayan elle eklenmiş öğrenci önizlemede 'elle eklenmişti' notuyla pasif olacaklar arasında görünür.", "plan.html#devam-donem-sonu: elle eklenen sona eklenir; ayrı gevşek form AKSİS ile tutarsız satır üretirdi."),
  G('D03-B25', "Yükleme yalnız üyeliği, sırayı, görünen adı ve kaynağı değiştirir; muaf ve geç kayıt seçimi (ders, numara) değeridir: korunur, canlanan ve şube değiştiren satırda dersin değeri yazılır. Adlar eşleştirme işlevine göre aynıysa (büyük küçük harf, boşluk) değişiklik sayılmaz ama görünen ad dosyadakiyle yenilenir (yazimDuzeltilecek); gerçek farkta isimDegisecek ve olay. Teyitli hesap etkilenmez, eşleştirme yalnız kayıtta.", "Muafı hoca işaretler, dosya taşımaz (plan.html#devam); yükleme işareti sıfırlasaydı muaf öğrenciye hak uyarısı giderdi."),
  G('D03-B26', "Deneme dersinin listesi tek satırdır, kaynak SISTEM; deneme dersi bütün liste yazma uçlarına kilitlidir (LISTELER_KILITLI, kilit DENEME_DERSI). Satırı D01'in inceleme_hesaplari_kurulumu işi D02.denemeDersiniKur'un döndürdüğü şubeyle D03.denemeListesiniKur(tx, subeId, ogrenciNo, adSoyad) çağırarak kurar: eş güçlü, inceleme numarası değişince eski satır pasif, deneme olmayan şubede iç hata, öbür yazmalarla aynı kilit sırası, dinleyiciler ve son adımda sürüm. Dış yüz yalnız eklemeyle büyüdüğünden şimdi tanımlandı; contracts.json'a eklenmesi D03-A07'de.", "İnceleme hesapları yalnız deneme dersini görür, silinirse sunucu yeniden kurar (plan.html#kararlar-inceleme-hesaplari); hoca uçları deneme listesini bozmamalı, tanım olmadan D01'in kurulum işi yazılamaz ve inceleme öğrencisi boş ders görür."),
  G('D03-B27', "İki indirme kaynağı (D06 arayüzü, tipler packages/contracts/src/esitleme.ts). (1) Genel kaynak 'liste_satirlari' { tur: 'genel', roller: ['OGRENCI', 'PERSONEL'], degisenler(tx, { kapsam, surumden, surumeKadar, adet }) }: degisiklik_surumu (surumden, surumeKadar] aralığındaki satırlar surum, sonra id artan, en çok adet; aralık tek sürümse (surumeKadar = surumden + 1) adet uygulanmaz, o sürümün bütün satırları döner (D06 sayfa kesme kuralı; 2.000 satırlık yükleme tek sürüm taşır); surumden null tam indirmedir, anonim satır dönmez. Personelde sube_id = ANY(Kapsam.subeler), öğrencide ogrenci_no = Kapsam.ogrenciNo. Satır { id: satirId, surum, silindi, veri }: veri öğrencide subeId, dersId, ogrenciNo, adSoyad, eklenmeAni, pasifAni; personelde bunlar ve sira; öğrenci rolünde Kapsam.teyitli true değilse adSoyad null (alan atlanmaz, D13-B14); personelde anonim satır { id, silindi: true, veri: null }. Muaf, seçim, kaynak ve değiştiren inmez: hak seviyesini ve muafı D08 öğrencinin devam durumuyla indirir (D08-B06, D08-B24). (2) Kapsam kaynağı 'ogrenci_liste_kapsami' { tur: 'kapsam', rol: 'OGRENCI', kapsam(tx, { kisiId, ogrenciNo }), degistiMi(tx, k, kapsamSurumu, surumeKadar) }: kapsam numaranın anonim olmayan etkin ve pasif satırlarının şube, ders ve birim kümesi (birim satırdaki birim_id kopyasından; pasif öğrencide ders telefonda kalır, D06-B15); degistiMi numaranın uyelik_surumu (kapsamSurumu, surumeKadar] içinde satırı varsa ya da bu aralıkta herhangi bir satır anonimleştiyse true (numarası silinen satır numarayla bulunamaz; yanlış pozitif serbest). Ad ve sıra değişikliği uyelik_surumu'nu değiştirmez, öğrencilere toplu baştan indirme yaptırmaz. Devirde yeni hocanın listesi D06'nın personel kapsam sıfırlamasıyla gelir; D03 sahipAtamaSurumu okumaz. Teyit değişince ad inmesi için baştan indirme D06'nın kuralıdır (D03-A09). Testler D06'nın ortak kaynak sözleşme yardımcısıyla koşar.", "Veri amaçla sınırlı ve başka öğrencinin adı hiç inmez (plan.html#kararlar-indirme): kayıt herkese açık olduğundan (D01-B20) teyitsiz kapsam yalnız numara iddiasına dayanır, başkasının numarasıyla kaydolan kişi o öğrencinin adını indirmemeli (D06-B15). Tek sürümün kesilmesi sayfa sınırını bozardı. Muaf değişikliği sayaç kilidi alsaydı D08'in muaf işlemi ile liste yüklemesi iş kuyruğu üzerinden kilitlenme döngüsü kurabilirdi."),
  G('D03-B28', "Saklanan sira her yüklemede geçerli satırların dosya sırasıyla 1, 2, 3 diye yeniden yazılır; elle eklenen en büyük artı 1; pasif satır son sırasını korur ama sıralı listelerde gösterilmez; şube değiştiren öğrenci yeni şubede o yüklemenin sırasını alır. Dosya satır numarası (bulguların yeri) yalnız önizleme ve uygula cevabında döner, saklanmaz. sira tekil değildir, sıralama (sira, id) ile kararlıdır.", "AKSİS özeti listenin sırasını kullanır (plan.html#devam-donem-sonu); kısmi tekil sıra dizini toplu yeniden numaralamada ara ihlal verirdi.")
];

const contradictions_resolved = [
  { id: 'D03-C01', resolution: "SheetJS kaldıkça çelişki yok: .xlsx, .xls ve HTML ya da XML tabanlı .xls okunur (teknik.html#panel-excel). Yedeğe geçilirse read-excel-file .xls okumaz; o durumda panel .xls için 'dosyayı Excel'de .xlsx olarak kaydedip yükle' iletisini verir ve plandaki .xls kuralı bu iletiyle karşılanır. teknik.html#temel-yedek-paketler satırına bu not eklenmeli." },
  { id: 'D03-C02', resolution: "Kabul edilen türler Excel (.xlsx, .xls) ve CSV. Panelin okuma sonuç kodları core'dadır (DOSYA_BOS, DOSYA_COK_BUYUK, DOSYA_OKUNAMADI, DOSYA_PAROLALI, BASLIK_BULUNAMADI, AYIRICI_BELIRSIZ, COK_FAZLA_SATIR) ve her biri ayrı metin alır; genel 'okunamadı' metni türleri plan gibi sayar: 'Bu dosya okunamadı. AKSİS'ten indirdiğin Excel (.xlsx, .xls) ya da CSV dosyasını seç.' tasarim.html#anat-toast örnek metni buna göre düzeltilmeli." },
  { id: 'D03-C03', resolution: "İki ayrı ad: liste satırının kaynağı ELLE (ekranda 'listeye elle eklendi') ve yoklamadaki son durum 'Elle eklendi' (D09). AKSİS özetinin sırası liste satırının sira alanından gelir, yoklama son durumundan değil; kodda kaynak alanı ile son durum kodu ayrı sözlüklerdedir." }
];

const O = (id, question, recommendation, needs_owner) => ({ id, question, recommendation, needs_owner });
const open_points = [
  O('D03-A01', "(D03-B01) AKSİS'in ders listesi dışa aktarımı gerçekte hangi biçimde (gerçek .xlsx, eski .xls, HTML ya da XML tabanlı .xls, CSV), hangi sütunlarla (numara; ad ve soyad birleşik mi ayrı mı; şube; e-posta; TC; tekrar ya da muaf) ve başlıktan önce kaç satırla geliyor?", "Spec genel sözlükle ve dört dallı ilk bayt kuralıyla yazıldı: 50 4B 03 04 xlsx; D0 CF 11 E0 A1 B1 1A E1 xls ya da parolalı xlsx; BOM ve boşluktan sonra '<' HTML ya da XML tablo; kalanı metin. Sahipten maskeli bir gerçek örnek ve farklı dışa aktarım kullanan birim olup olmadığı bilgisi istenir (plan.html#acik); örnek gelince sözlük ve okuma testleri güncellenir, dışa aktarım ders bazlıysa D03-B15 yeniden açılır.", true),
  O('D03-A02', "(D03-B09) Çift anadal ya da yandal öğrencisi AKSİS'te ikinci programda ayrı numara alıyor mu?", "Öğrenci işlerinden ve AKSİS örneğinden teyit (plan.html#acik çift anadalı zaten soruyor). Ayrı numara çıkarsa hesap ile numara arasında çok satırlı bağ (D01) kurulur; liste tarafı numarayla çalıştığından değişmez. Teyide kadar tek numara varsayılır.", true),
  O('D03-A03', "(D03-B11) 'Derse eklendiği tarihten sonra yapılan saatler' gün mü, an mı?", "An: eklenme ve pasif timestamptz (saat arayüzünden). Başlangıcı eklenme anından sonra olan oturum T'ye girer; eklenmeden önce başlamış oturuma geçerli kaydı varsa o oturum da girer. Hesap D08'in (D08-B12 aynı yönde); iki kural da öğrenci lehine. Spec bu öneriyle yazıldı; gün seçilirse yalnız D08'in hesabı değişir, D03 tablosu değişmez.", true),
  O('D03-A04', "(D03-B14) Pasif satır canlanınca aynı satır mı döner, aradaki 'listede değil' kayıtlar yeniden karara bağlanır mı?", "Aynı satır canlanır, eklenme anı korunur, pasif aralığı üyelikten silinir; canlanan satırlar KARAR basamağının kuyruğa koyduğu yeniden değerlendirme işiyle (D07.yenidenDegerlendir) yeniden değerlendirilir, Var'a dönen kayıt 'sonradan değişenler' listesine düşer (D09). Sonuç: canlanma aynı (ders, numara) için kesişen öbür satırları kırpar (değişmez: bir derste bir numaranın üyelik aralıkları kesişmez). A'dan B'ye geçip A'ya dönen öğrencide A satırı [eA, sonsuz) olur, B'deki [t1, t2) aralığı kırpılır (eklenme A'dan sonraysa sıfır uzunluk): A'nın o aralıktaki oturumları T'ye girer, B'ninkiler girmez, öğrenci iki şubede birden Yok almaz; yanlış şubeye yüklenip düzeltilen dosyada gidilmeyen şubenin oturumları devamsızlık yazdırmaz. Kırpılan satırlar önizlemede kirpilacaklar ile gösterilir, olaya ve dinleyicilere girer. Gerçek bırakıp yeniden alma ile yanlış dosya ayırt edilemediğinden ikisi aynı işlenir; yanlış dosyayla eklenip sonradan gerçekten derse alınan öğrencide eski eklenme anı korunacağından önizleme canlanacak satırın önceki eklenme ve pasif anını gösterir. Plan liste değişikliğini kararların yeniden verildiği olaylar arasında saymıyor (plan.html#kararlar-supheli-kayit), bu yüzden sahip onayı istenir. Spec bu öneriyle yazıldı.", true),
  O('D03-A05', "(D03-B16) Şube listesini kim okur ve yazar; yönetici de görür mü?", "Yalnız dersin hocası (D02.dersYetkisi; kendi dersi olan yönetici o derste hocadır). Yönetici okuması gerekirse D02-B24 kararıyla birlikte, salt okunur ve denetim kayıtlı açılır; şimdiden açılmaz. Spec bu öneriyle yazıldı.", true),
  O('D03-A06', "(D03-B23) Liste ekranında öğrencinin uygulamaya kaydolup kaydolmadığı (kaydolmadı, teyit bekliyor, teyitli, hesap silindi) görünsün mü?", "Görünsün ama D03'ün GET'inde değil: D03 D01'i okumaz (iki yönlü çağrı kurulmaz). D01'in kendi önekinde şube kimliği alan bir okuma ucu, D03.listeSatirlari ile birleştirip satirId başına durum döner; panel listeyle birleştirir. Ürün kararı ve D01'e yeni uç olduğundan sahip onayı ister. Spec GET'i bu durum olmadan yazdı.", true),
  O('D03-A07', "Sözleşme ekleri: contracts.json ve karşı spec'lerde hangi yalnız ekleyen değişiklikler gerekir?", "Bütünleştirici ekler (hepsi yalnız ekleme, paylaşılan kural 20): (1) D03 dış yüzüne denemeListesiniKur(tx, subeId, ogrenciNo, adSoyad) ve ogrencininSatirlari(tx, ogrenciNo, s?); muafIsaretle'nin dördüncü parametresi ve sonuç birliği (D08 sonucu kendi kodlarına çevirir). (2) D02 dış yüz listesine listeKaynagiKaydet ve D03 notlarına 'D03 eklentisinde D02.listeKaynagiKaydet ile kaydolur'. (3) D02 subeGetir ve dersGetir'e kilitle?: 'paylasimli' seçeneği (SELECT ... FOR SHARE); D02'nin şube pasifleştirme ve arşiv işlemleri aynı satırları FOR UPDATE alır ve liste kaynağını kilitten sonra sorar. (4) D02 dersGetir açıklamasındaki 'D03 devirde sahipAtamaSurumu okur' notu kalkar (devir D06'nın personel kapsamıyla). (5) D01-B19 eşleşme kuralı 'açık dönemlerdeki bütün etkin satırlar eşleşmeli' olur. Eklenene kadar deneme öğrencisinin listesi kurulamaz ve yazma çarpıklığı D02 tarafında açık kalır.", false),
  O('D03-A08', "Öğrenci modüller arasında hangi kimlikle anılır? D03 satırı numarayla tutar (bkz. D03-B08); D05, D07, D08 ve D09 kişi kimliği (ogrenci_id) kullanıyor; hesabı olmayan (telefonsuz) öğrencinin elle eklemesi, muafı ve devam hesabı kişi kimliği olmadan yürümez.", "Ders içindeki öğrenci için iç kimlik liste satırı kimliği (satirId), hesaplar arası birleştirme numarayla: D08 ve D10 devamı ve özeti (ders, numara) üzerinden toplar, iş verisine ve yola satirId konur (D08 muaf yolunu {satirId} yaptı, D08-A09); kayıtlar ogrenci_id taşır ve numaraya D01'in dış yüzüyle bağlanır. D03 dinleyici olayında satirId ile ogrenciNo'yu birlikte verir. Bütünleştirici D05, D08, D09 ve D10 ile birlikte kesinleştirir.", false),
  O('D03-A09', "Öğrenci kapsam kaynağını kim kaydeder ve teyit değişince öğrencinin adı nasıl iner?", "D03 kaydeder ('ogrenci_liste_kapsami', D03-B27): D06 spec'i kapsam kaynaklarını 'D03 (öğrenci) ve D02 (personel)' diye dağıtıyor, veri ve uyelik_surumu D03'ün; D02 üzerinden kurmak D03'ün satırını D02'nin içinden okuyan ikinci bir yol açar. Bütünleştirici D06'nın önerisiyle D02'yi seçerse D03 kapsam-kaynagi.ts kaydını kaldırır, D02 aynı kuralı listeKaynagiKaydet'in etkinSatirlar ve pasiflesenSatirlar işlevleriyle kurar; uyelik_surumu ikisine de yeter. Teyit: D03 teyidi bilmez (degistiMi'ye teyit gelmez); D06 imleçteki hesap özetine teyit durumunu katar, teyit değişince baştan indirme olur ve ad o indirmede iner. İki spec'e (D06 ve D03) aynı cümleyle yazılmalı.", false),
  O('D03-A10', "Liste işlemleriyle kesişen işlemlerde kilit ve adım sırası nasıl ortak kurala bağlanır?", "Ortak kurallara eklenmesi önerilen sıra: (1) öğrenci kova kilidi (numaraIleEslestir; birden çok numarada artan kovaNo sırasıyla) işlemin ilk kilididir; (2) D03 yazmasında dersin sube_listeleri satırları kimlik sırasıyla, D02 şube ve ders satırları FOR SHARE, kova kilitleri artan sırayla; (3) satır yazımları; (4) iş kuyruğu (D14.isGonder); (5) en son sayaç sürümü (D06.surumAl). D08'in muaf işleminde muafIsaretle iş kuyruğundan önce çağrılır; uyelikDenetle (ret yolu kilidiyle) kayıt ve iş kuyruğu adımından önce çağrılır; liste dinleyicileri genel sayaç sürümü almaz; D12'nin saklama işi her saklama işleyicisini ayrı işlemde çağırır. Bu sıra bozulursa pg-boss tekil anahtarlı iş ekleme beklemesi ile satır, kova ya da sayaç kilidi arasında döngü kurulur; D12'nin bir kez yeniden deneme kuralı (D12-B08) yalnız son güvencedir. Senaryolar: 'Kayıt ile liste aynı anda kilitlenme kurmaz', 'Gönderim ile canlanma yarışı ret bırakmaz'.", false),
  O('D03-A11', "Liste değişikliği dinleyicilerinin uyarlayıcıları karşı modüllerde nasıl kurulur?", "Her uyarlayıcı kendi modülünün eklenti.ts'inde: D01 ESLESTIRME: değişikliğin ayrık subeId'leri için bekleyenKayitlariEslestir, ama yalnız değişikliğin numaralarıyla (D01'e numara süzgeci eklenir; D03 yazmasının kova kümesi dışındaki numara iç hata verir, kilit döngüsü kurmaz). D07 KARAR: kayıtları liste kilidi içinde değerlendirmez; aynı işlemde yeniden değerlendirme işi koyar (iş verisi { dersId, satirIdleri }, numara yok), iş satirGetir ile numarayı çözer ve yenidenDegerlendir(tx, { dersId, subeIdleri, ogrenciNolari }, 'LISTE_DEGISTI') çağırır; D07'nin YenidenNeden'ine LISTE_DEGISTI eklenir, iş numaraları kovaNo sırasıyla işler. Doğruluk uyelikDenetle'nin ret yolu kilidinden gelir, gecikme (startAfter) gerekmez. D08 HESAP: devamHesaplaIsiKoy(tx, dersId, null, 'LISTE', { tur: 'LISTE_SATIRI', id, donemId }). Üç modülün spec'i bu eşlemeyle güncellenir.", false),
];

module.exports = { summary, tables, endpoints, HATALAR, BULGULAR, OKUMA, state_machines, invariants, exports_, kayitlar, files, tests, resolved_gaps, contradictions_resolved, open_points };

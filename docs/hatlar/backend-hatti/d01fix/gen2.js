// D01 (kimlik) spec and fragment generator. One data source, two outputs: spec/D01.json and frag/D01.html.
// Run: node gen.js ; then node ../spec-validate.js D01
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = process.env.D01_OUT || path.join(__dirname, '..');

const C = (name, type, nul, def, note) => ({ name, type, null: nul, default: def, note });
const T = (name, purpose, columns, indexes, constraints) => ({ name, purpose, columns, indexes, constraints });

// ---------------------------------------------------------------- tables
const tables = [
  T('kisiler',
    'Bütün hesapların ortak satırı. Tür personel ya da öğrencidir; yönetici ayrı tür değil, personel rolüdür. Satır hiç fiziksel silinmez (D12-B16): silinen hesapta silindi işaretiyle kalır (öğrencide numarası ogrenci_hesaplari satırında durur), 24 saatte doğrulanmayan başvuruda da adres ve ad-soyad boşaltılıp silindi olur.',
    [
      C('id', 'uuid', false, 'uuidv7()', 'Kişinin iç kimliği; dışa açık jeton olarak kullanılmaz.'),
      C('tur', 'text', false, '', 'personel ya da ogrenci.'),
      C('durum', 'text', false, '', 'kod_bekliyor, onay_bekliyor, aktif, pasif, reddedildi, kapandi, silindi. Öğrencide yalnız aktif, reddedildi, kapandi, silindi.'),
      C('ad_soyad', 'text', true, '', 'Personelde ad-soyad (NFC, 2 ile 120 karakter); öğrencide NULL. Satır ilk başvuruda açılırken yazılır; aynı adresle sonraki başvurunun bilgileri giris_kodlari satırında bekler ve yalnız doğrulamada buraya kopyalanır. Onaylanmamış başvuru silinince NULL olur; onaylı hocada silmeden sonra da kalır (denetim kaydında kimin yaptığı okunsun diye).'),
      C('eposta', 'text', true, '', 'Yalnız personelde, epostaNormallestir çıktısı; silmede NULL.'),
      C('birim_id', 'uuid', true, '', 'birimler(id), D02. Başvuruda seçilen birim. Hedef yönetici rolü taşımıyorsa yönetici kapsamı bununla, taşıyorsa hedefin rol kapsamıyla karşılaştırılır (D01-B35).'),
      C('bolum_id', 'uuid', true, '', 'bolumler(id), D02. Başvuruda seçilen bölüm.'),
      C('inceleme_hesabi', 'boolean', false, 'false', 'Apple ve Google deneme hesabı; 3 cihaz ve tek telefon kuralından muaf. Yalnız ayarlardaki adresle (personel) ya da numarayla (öğrenci) eşleşen hesapta true; inceleme_hesaplari_kurulumu her çalışmada eşleşmeyen hesaptan kaldırır.'),
      C('son_ret_ani', 'timestamptz', true, '', 'Son başvuru reddinin anı; yeniden başvuruda yöneticiye gösterilir.'),
      C('son_ret_gerekcesi', 'text', true, '', 'hoca_degil, bolum_yanlis, bilgi_eksik, diger.'),
      C('olusturma_ani', 'timestamptz', false, '', 'Saat arayüzünden yazılır; veritabanı varsayılanı yok.'),
      C('durum_ani', 'timestamptz', false, '', 'Son durum değişikliğinin anı (saat arayüzünden).'),
      C('silinme_ani', 'timestamptz', true, '', 'Hesap silme anı; durum silindi ile birlikte dolar.'),
    ],
    [
      'kisiler_pk: PRIMARY KEY (id)',
      'kisiler_eposta_uq: UNIQUE (eposta) WHERE eposta IS NOT NULL',
      "kisiler_durum_birim_id_idx: (durum, birim_id) WHERE tur = 'personel'",
      'kisiler_inceleme_hesabi_idx: (inceleme_hesabi) WHERE inceleme_hesabi',
    ],
    [
      "kisiler_tur_ck: tur IN ('personel','ogrenci')",
      "kisiler_durum_ck: durum IN ('kod_bekliyor','onay_bekliyor','aktif','pasif','reddedildi','kapandi','silindi') AND (tur = 'personel' OR durum IN ('aktif','reddedildi','kapandi','silindi')) AND (tur = 'ogrenci' OR durum <> 'kapandi')",
      "kisiler_eposta_ck: (tur = 'personel' OR eposta IS NULL) AND (eposta IS NULL OR eposta ~ '^[a-z0-9._-]{1,64}@istanbul[.]edu[.]tr$')",
      "kisiler_silinme_ani_ck: ((durum = 'silindi') = (silinme_ani IS NOT NULL)) AND (durum <> 'silindi' OR eposta IS NULL)",
      "kisiler_ad_soyad_ck: (tur = 'ogrenci' AND ad_soyad IS NULL) OR (tur = 'personel' AND (ad_soyad IS NOT NULL OR durum = 'silindi'))",
      "kisiler_son_ret_gerekcesi_ck: son_ret_gerekcesi IS NULL OR son_ret_gerekcesi IN ('hoca_degil','bolum_yanlis','bilgi_eksik','diger')",
      'kisiler_birim_id_fk: birim_id REFERENCES birimler(id); kisiler_bolum_id_fk: bolum_id REFERENCES bolumler(id)',
    ]),

  T('personel_rolleri',
    'Personelin rolleri (hoca, yonetici) ve yöneticinin kapsamı. Kanca her istekte etkin satırları okur; geri alınan rol satırı silinmez, geri_alinma_ani dolar.',
    [
      C('id', 'uuid', false, 'uuidv7()', ''),
      C('kisi_id', 'uuid', false, '', 'kisiler(id); yalnız personel.'),
      C('rol', 'text', false, '', 'hoca ya da yonetici. Asistan ve ortak hoca sonra yeni CHECK değeriyle eklenir (D01-A12).'),
      C('kapsam_birim_id', 'uuid', true, '', 'Yalnız yöneticide; NULL bütün üniversite (tüm), dolu ise birimler(id).'),
      C('kaynak', 'text', false, '', 'basvuru_onayi, yonetici_ekleme, komut_satiri, inceleme_kurulumu.'),
      C('veren_kisi_id', 'uuid', true, '', 'kisiler(id); komut satırı ve inceleme kurulumunda NULL.'),
      C('verilme_ani', 'timestamptz', false, '', ''),
      C('geri_alinma_ani', 'timestamptz', true, '', ''),
      C('geri_alan_kisi_id', 'uuid', true, '', 'kisiler(id).'),
      C('geri_alinma_nedeni', 'text', true, '', 'yonetici ya da hesap_silindi.'),
    ],
    [
      'personel_rolleri_pk: PRIMARY KEY (id)',
      'personel_rolleri_kisi_id_rol_uq: UNIQUE (kisi_id, rol) WHERE geri_alinma_ani IS NULL',
      'personel_rolleri_rol_kapsam_birim_id_idx: (rol, kapsam_birim_id) WHERE geri_alinma_ani IS NULL',
    ],
    [
      "personel_rolleri_rol_ck: rol IN ('hoca','yonetici')",
      "personel_rolleri_kapsam_ck: rol = 'yonetici' OR kapsam_birim_id IS NULL",
      "personel_rolleri_kaynak_ck: kaynak IN ('basvuru_onayi','yonetici_ekleme','komut_satiri','inceleme_kurulumu')",
      "personel_rolleri_geri_alinma_ck: (geri_alinma_ani IS NULL) = (geri_alinma_nedeni IS NULL) AND (geri_alinma_nedeni IS NULL OR geri_alinma_nedeni IN ('yonetici','hesap_silindi'))",
      'personel_rolleri_kisi_id_fk, personel_rolleri_kapsam_birim_id_fk (birimler), personel_rolleri_veren_kisi_id_fk, personel_rolleri_geri_alan_kisi_id_fk',
    ]),

  T('giris_kodlari',
    'Personelin e-posta kodları: giriş, başvuru doğrulama ve oturumsuz silme. Kod açık durmaz; giriş kodu özet anahtarıyla HMAC özeti tutulur. Başvuru kodu satırı o başvurunun bilgilerini de taşır: kişi satırı yalnız doğrulamada güncellenir, adresi bilmeyen biri başkasının başvurusunu değiştiremez. Gönderim sınırı (dakikada 1, saatte 5, günde 10) bu tablodan değil D14\'ün eposta_gonderimleri tablosundan sayılır.',
    [
      C('id', 'uuid', false, 'uuidv7()', ''),
      C('kisi_id', 'uuid', false, '', 'kisiler(id); kod yalnız var olan kişi satırına üretilir.'),
      C('amac', 'text', false, '', 'giris, basvuru, basvuru_silme. basvuru_silme oturumsuz silme kodudur: onaylanmamış başvuru ve pasif personel (oturum açamayan iki durum) bununla siler.'),
      C('kod_ozeti', 'bytea', false, '', "HMAC-SHA256(giriş kodu özet anahtarı, 'kod:' + amac + ':' + kisi_id + ':' + kod); 32 bayt. Kod kişiye ve amaca bağlıdır."),
      C('anahtar_kid', 'text', false, '', 'Özeti üreten anahtarın kimliği (D15.gizliAnahtar); anahtar değişince eski kodlar eski kid ile doğrulanır.'),
      C('olusturma_ani', 'timestamptz', false, '', ''),
      C('bitis_ani', 'timestamptz', false, '', 'olusturma_ani + 300 saniye (KOD_GECERLILIK_SN).'),
      C('yanlis_sayisi', 'smallint', false, '0', 'Kişinin açık kodlarında ortak sayılır; 3 olunca kod geçersiz.'),
      C('kullanilma_ani', 'timestamptz', true, '', ''),
      C('gecersiz_ani', 'timestamptz', true, '', '3 yanlış ya da başka bir kodla başarılı giriş.'),
      C('basvuru_ad_soyad', 'text', true, '', 'Yalnız amac basvuru: bu başvuruda yazılan ad-soyad (NFC, 2 ile 120). Doğrulamada kisiler satırına kopyalanır; kod satırıyla 24 saatte silinir.'),
      C('basvuru_birim_id', 'uuid', true, '', 'Yalnız amac basvuru; birimler(id), D02.'),
      C('basvuru_bolum_id', 'uuid', true, '', 'Yalnız amac basvuru; bolumler(id), D02.'),
    ],
    [
      'giris_kodlari_pk: PRIMARY KEY (id)',
      'giris_kodlari_kisi_id_amac_idx: (kisi_id, amac) WHERE kullanilma_ani IS NULL AND gecersiz_ani IS NULL',
      'giris_kodlari_olusturma_ani_idx: (olusturma_ani)',
    ],
    [
      "giris_kodlari_amac_ck: amac IN ('giris','basvuru','basvuru_silme')",
      'giris_kodlari_kod_ozeti_ck: octet_length(kod_ozeti) = 32',
      "giris_kodlari_bitis_ani_ck: bitis_ani > olusturma_ani AND bitis_ani <= olusturma_ani + interval '5 minutes'",
      'giris_kodlari_yanlis_sayisi_ck: yanlis_sayisi BETWEEN 0 AND 3',
      'giris_kodlari_kapanis_ck: NOT (kullanilma_ani IS NOT NULL AND gecersiz_ani IS NOT NULL)',
      "giris_kodlari_basvuru_ck: (amac = 'basvuru') = (basvuru_ad_soyad IS NOT NULL AND basvuru_birim_id IS NOT NULL AND basvuru_bolum_id IS NOT NULL) AND (amac = 'basvuru' OR (basvuru_ad_soyad IS NULL AND basvuru_birim_id IS NULL AND basvuru_bolum_id IS NULL))",
      'giris_kodlari_kisi_id_fk, giris_kodlari_basvuru_birim_id_fk (birimler), giris_kodlari_basvuru_bolum_id_fk (bolumler)',
    ]),

  T('eposta_giris_durumlari',
    'Adres başına ardışık yanlış deneme sayacı ve uzayan bekleme. Kopyalar arası kesin olması gerektiği için PostgreSQL\'de; adres açık değil, özetle tutulur. Kayıtsız adreste de aynı satır yazılır, böylece bekleme adresin varlığını sızdırmaz. Satırda adres değil yalnız HMAC durduğundan hesap silme bu satıra dokunmaz (işçi süreci giriş kodu anahtarını yüklemez); kimlik_temizligi son yanlıştan 24 saat sonra siler. Bu satırda adres özeti giriş kodu işinin parçasıdır, anahtarı giriş koduyla ortaktır.',
    [
      C('adres_ozeti', 'bytea', false, '', "HMAC-SHA256(giriş kodu özet anahtarı, 'adres:' + normal adres); 32 bayt."),
      C('anahtar_kid', 'text', false, '', 'Özeti üreten anahtarın kimliği; anahtar değişince eski satırlar 24 saatte temizlenir, bekleme sıfırlanmış olur.'),
      C('ardisik_yanlis', 'integer', false, '0', 'Başarılı girişte ya da 24 saat yanlış gelmeyince sıfırlanır (satır silinir).'),
      C('bekleme_baslangic_ani', 'timestamptz', true, '', 'Süren beklemenin başladığı an. Bu andan sonra üretilmiş açık giriş kodu beklemede de denenebilir: o kod yalnız posta kutusuna gitti, adresi bilen yabancı onu bilmez (D01-B07).'),
      C('bekleme_bitis_ani', 'timestamptz', true, '', 'Dolu ve gelecekteyse deneme yalnız bekleme_baslangic_ani\'ndan sonra üretilmiş açık kodlarla karşılaştırılır; tutmazsa ya da böyle kod yoksa KIMLIK_BEKLEME_SURUYOR döner (iki durumda aynı cevap).'),
      C('son_yanlis_ani', 'timestamptz', true, '', ''),
      C('guncelleme_ani', 'timestamptz', false, '', ''),
    ],
    [
      'eposta_giris_durumlari_pk: PRIMARY KEY (adres_ozeti)',
      'eposta_giris_durumlari_guncelleme_ani_idx: (guncelleme_ani)',
    ],
    [
      'eposta_giris_durumlari_adres_ozeti_ck: octet_length(adres_ozeti) = 32',
      'eposta_giris_durumlari_ardisik_yanlis_ck: ardisik_yanlis >= 0',
      'eposta_giris_durumlari_bekleme_ck: (bekleme_bitis_ani IS NULL) = (bekleme_baslangic_ani IS NULL) AND (bekleme_bitis_ani IS NULL OR bekleme_bitis_ani > bekleme_baslangic_ani)',
    ]),

  T('giris_oturumlari',
    'Öğrenci ve personel giriş oturumları. Kökteki kanca her istekte anahtar özetinin tekil dizininden okur. Başka modül bu tabloya yabancı anahtar kurmaz: satırlar bittikten 30 gün sonra ve hesap silinince fiziksel silinir.',
    [
      C('id', 'uuid', false, 'uuidv7()', 'Sözleşmede ve JSON\'da girisOturumuId.'),
      C('kisi_id', 'uuid', false, '', 'kisiler(id).'),
      C('tur', 'text', false, '', 'personel ya da ogrenci (teknik.html\'deki rol alanı).'),
      C('istemci', 'text', false, '', 'telefon ya da panel; öğrencide yalnız telefon.'),
      C('kapsam', 'text', false, "'tam'", 'tam ya da degisim_bekliyor. Değişim bekleyen yeni telefonun oturumu kancada yalnız degisim_bekleyen rolünü taşır; bu rolü yalnız /ben, /cikis ve değişim uçları kabul eder, öbür rotaları D13\'ün rol beyanı 403 API_ROL_YETKISIZ ile keser.'),
      C('anahtar_ozeti', 'bytea', false, '', 'SHA-256(256 bit rastgele oturum anahtarı); 32 bayt, tekil.'),
      C('cihaz_id', 'uuid', true, '', 'cihazlar(id); yalnız öğrencide ve zorunlu. Kanca cihazın durumunu da okur: kapanmış cihazın oturumu 401 alır.'),
      C('cihaz_etiketi', 'text', true, '', 'Oturumlarım ve bildirim için kısa etiket: packages/core/src/kimlik/cihaz-etiketi.ts önce D14\'ün kümesine (harf, rakam, boşluk, virgül, nokta, parantez, tire) süzer, sonra en çok 60 karaktere keser; panelde User-Agent\'tan (ör. Edge, Windows), telefonda girişte gelen model ve platform. IP saklanmaz. Öğrencinin hesabı reddedilince, kapanınca ya da silinince NULL.'),
      C('olusturma_ani', 'timestamptz', false, '', '3 cihaz kuralında en eski oturum bu alana göre seçilir.'),
      C('son_kullanim_ani', 'timestamptz', false, '', 'En çok dakikada bir yazılır; X-Arka-Plan: 1 taşıyan panel isteği ilerletmez.'),
      C('bitis_ani', 'timestamptz', true, '', 'Personel telefonunda olusturma + 30 gün, panelde + 24 saat; öğrencide NULL (bitiş yok).'),
      C('kapanma_ani', 'timestamptz', true, '', ''),
      C('kapanma_nedeni', 'text', true, '', 'cikis, kendisi_kapatti, yonetici, en_eski, yenilendi, pasif, cihaz_degisimi, degisim_ret, degisim_iptal, degisim_zaman_asimi, teyit_ret, bekleme_bitti, inceleme_bitti, olay_komutu, geri_yukleme.'),
      C('onceki_oturum_id', 'uuid', true, '', 'giris_oturumlari(id) ON DELETE SET NULL; telefon yenilemesinde yerine geçtiği oturum (D11 QR anahtar yuvasını bununla devreder).'),
    ],
    [
      'giris_oturumlari_pk: PRIMARY KEY (id)',
      'giris_oturumlari_anahtar_ozeti_uq: UNIQUE (anahtar_ozeti)',
      'giris_oturumlari_kisi_id_idx: (kisi_id) WHERE kapanma_ani IS NULL',
      'giris_oturumlari_cihaz_id_idx: (cihaz_id) WHERE kapanma_ani IS NULL',
      'giris_oturumlari_kapanma_ani_idx: (kapanma_ani) WHERE kapanma_ani IS NOT NULL',
      'giris_oturumlari_bitis_ani_idx: (bitis_ani) WHERE bitis_ani IS NOT NULL',
    ],
    [
      "giris_oturumlari_tur_ck: tur IN ('personel','ogrenci')",
      "giris_oturumlari_istemci_ck: istemci IN ('telefon','panel') AND (tur = 'personel' OR istemci = 'telefon')",
      "giris_oturumlari_kapsam_ck: kapsam IN ('tam','degisim_bekliyor') AND (tur = 'ogrenci' OR kapsam = 'tam')",
      "giris_oturumlari_cihaz_id_ck: (tur = 'ogrenci') = (cihaz_id IS NOT NULL)",
      "giris_oturumlari_bitis_ani_ck: (tur = 'ogrenci') = (bitis_ani IS NULL)",
      "giris_oturumlari_kapanma_ck: (kapanma_ani IS NULL) = (kapanma_nedeni IS NULL) AND (kapanma_nedeni IS NULL OR kapanma_nedeni IN ('cikis','kendisi_kapatti','yonetici','en_eski','yenilendi','pasif','cihaz_degisimi','degisim_ret','degisim_iptal','degisim_zaman_asimi','teyit_ret','bekleme_bitti','inceleme_bitti','olay_komutu','geri_yukleme'))",
      'giris_oturumlari_anahtar_ozeti_ck: octet_length(anahtar_ozeti) = 32',
      'giris_oturumlari_kisi_id_fk, giris_oturumlari_cihaz_id_fk, giris_oturumlari_onceki_oturum_id_fk (ON DELETE SET NULL)',
    ]),

  T('ogrenci_hesaplari',
    'Öğrenciye özgü alanlar: numara, girilen isim, liste eşleşmesi ve ilk kayıt teyidi. Bir numaraya zamanla birden çok hesap düşebilir (silme ve yeniden kayıt, aynı numarayı isteyen iki kişi); teyitli ve silinmemiş olan en çok bir tanedir.',
    [
      C('kisi_id', 'uuid', false, '', 'kisiler(id), birincil anahtar; kişi türü ogrenci.'),
      C('ogrenci_no', 'text', false, '', '9 ya da 10 ASCII rakam, başı 0 olabilir (D03 şeması). Silmede kalır.'),
      C('girilen_ad_soyad', 'text', true, '', 'Kayıtta yazılan isim (NFC, en çok 120); hoca ekranlarında liste satırındaki isim görünür, girilen isim yalnız teyit bekleyen hesapta D09\'un teyit ekranına döner. Silmede, teyit reddinde ve hesabın kapanmasında NULL (D01-B34).'),
      C('eslesme_durumu', 'text', false, '', 'eslesti, isim_uyusmuyor, listede_yok; D03.numaraIleEslestir sonucudur, teyit bekleyen hesapta liste değişince yenilenir.'),
      C('eslesme_ani', 'timestamptz', false, '', ''),
      C('teyit_durumu', 'text', false, "'bekliyor'", 'bekliyor, teyitli, reddedildi.'),
      C('teyit_yolu', 'text', true, '', 'hoca_toplu, hoca_tek, kayit_kodu, inceleme.'),
      C('teyit_eden_kisi_id', 'uuid', true, '', 'kisiler(id); teyit eden hoca ya da kayıt kodunu veren hoca.'),
      C('teyit_ani', 'timestamptz', true, '', ''),
      C('teyit_ret_gerekcesi', 'text', true, '', 'bu_ogrenci_degil, numara_baskasinda, diger.'),
      C('kayit_kodu_id', 'uuid', true, '', 'kayit_kodlari(id) ON DELETE SET NULL; kodla kayıtta.'),
      C('silinme_ani', 'timestamptz', true, '', 'kisiler.silinme_ani kopyası; kısmi dizin koşulu başka tabloyu göremediği için aynı işlemde yazılır.'),
    ],
    [
      'ogrenci_hesaplari_pk: PRIMARY KEY (kisi_id)',
      "ogrenci_hesaplari_ogrenci_no_uq: UNIQUE (ogrenci_no) WHERE teyit_durumu = 'teyitli' AND silinme_ani IS NULL",
      'ogrenci_hesaplari_ogrenci_no_idx: (ogrenci_no)',
      "ogrenci_hesaplari_eslesme_durumu_idx: (eslesme_durumu) WHERE teyit_durumu = 'bekliyor' AND silinme_ani IS NULL",
    ],
    [
      "ogrenci_hesaplari_ogrenci_no_ck: ogrenci_no ~ '^[0-9]{9,10}$'",
      "ogrenci_hesaplari_eslesme_durumu_ck: eslesme_durumu IN ('eslesti','isim_uyusmuyor','listede_yok')",
      "ogrenci_hesaplari_teyit_ck: teyit_durumu IN ('bekliyor','teyitli','reddedildi') AND ((teyit_durumu = 'teyitli') = (teyit_yolu IS NOT NULL AND teyit_ani IS NOT NULL)) AND (teyit_durumu <> 'reddedildi' OR teyit_ret_gerekcesi IS NOT NULL)",
      "ogrenci_hesaplari_teyit_yolu_ck: teyit_yolu IS NULL OR (teyit_yolu IN ('hoca_toplu','hoca_tek','kayit_kodu','inceleme') AND (teyit_yolu = 'inceleme' OR teyit_eden_kisi_id IS NOT NULL))",
      "ogrenci_hesaplari_teyit_ret_gerekcesi_ck: teyit_ret_gerekcesi IS NULL OR teyit_ret_gerekcesi IN ('bu_ogrenci_degil','numara_baskasinda','diger')",
      'ogrenci_hesaplari_kisi_id_fk, ogrenci_hesaplari_teyit_eden_kisi_id_fk, ogrenci_hesaplari_kayit_kodu_id_fk (ON DELETE SET NULL)',
    ]),

  T('cihazlar',
    'Öğrenci telefonunun hesaba bağlanması: durum, platform, ikinci profil, doğrulama sonucu, telefon modeli (D11) ve son görülen istemci (D13). Öğrencide tek etkin cihaz (inceleme cihazları muaf); değişim bekleyen cihaz birden çok olabilir, her birinin tek açık talebi vardır (D01-B25). Cihazdan alınan son sıra numarası D06\'nın kurulumlar tablosunda, App Attest sayaçları D07\'nin app_attest_sayaclari tablosundadır.',
    [
      C('id', 'uuid', false, 'uuidv7()', 'Kayıt metnindeki cihaz kimliği.'),
      C('kisi_id', 'uuid', false, '', 'kisiler(id); öğrenci.'),
      C('durum', 'text', false, '', 'etkin, degisim_bekliyor, kapandi.'),
      C('platform', 'text', false, '', 'android ya da ios.'),
      C('model', 'text', true, '', 'Android Build.MODEL ya da iPhone donanım kimliği (en çok 60); D11\'in model başına ölçümü için. Silmede NULL.'),
      C('inceleme_cihazi', 'boolean', false, 'false', 'Hesabın inceleme_hesabi değerinin kopyası; kısmi dizin koşulu kişi tablosunu göremez.'),
      C('is_system_user', 'boolean', true, '', 'Android UserManager.isSystemUser() sonucu, kanıta bağlı; false ise kayıtlara İkinci profil etiketi (D07). iPhone\'da NULL. Silmede kalır (silmeden önce imzalanıp sonra ulaşan kayıtların etiketi için).'),
      C('dogrulama_sonucu', 'text', false, '', 'dogrulandi ya da dogrulanamadi; Cihaz doğrulanmadı etiketinin dayanağı. Satır kanıttan önce geçici dogrulanamadi ile yazılır (D07\'nin cihaz_kanitlari satırı cihaz ve anahtar satırına bağlandığı için), aynı işlemde D07 sonucuyla güncellenir; sonra yalnız cihazDogrulamaSonucunuYaz ile. D07 REDDEDILDI dönüp bağlama sürerse (D01-A19) dogrulanamadi.'),
      C('guvenlik_duzeyi', 'text', true, '', 'Android kanıtındaki güvenlik düzeyi (en çok 32). Silmede NULL.'),
      C('dogrulanmis_acilis', 'boolean', true, '', 'Silmede NULL.'),
      C('ios_acilis_dogrulama_turu', 'text', true, '', 'iOS 27 kanıt alanı (en çok 64). Silmede NULL.'),
      C('ios_paket_surumu', 'text', true, '', 'iOS 27 kanıt alanı (en çok 32). Silmede NULL.'),
      C('son_kanit_id', 'uuid', true, '', 'D07 cihaz_kanitlari satırı; yabancı anahtar değil (kanıt satırının yaşam döngüsü D07\'nin).'),
      C('dogrulama_ani', 'timestamptz', false, '', ''),
      C('olusturma_ani', 'timestamptz', false, '', ''),
      C('etkinlesme_ani', 'timestamptz', true, '', 'Etkin olduğu an (kayıt ya da değişim onayı).'),
      C('kapanma_ani', 'timestamptz', true, '', 'D13\'ün kaldırılma anı, D07\'nin etkinlik bitişi.'),
      C('kapanma_nedeni', 'text', true, '', 'degisim, cikis, silme, teyit_ret, bekleme_bitti, degisim_ret, degisim_iptal, degisim_zaman_asimi, inceleme_bitti.'),
      C('son_gorulme_ani', 'timestamptz', true, '', 'Kanca öğrenci isteğinde en çok dakikada bir yazar. Silmede NULL.'),
      C('son_uygulama_surumu', 'text', true, '', 'X-Uygulama-Surumu başlığından (en çok 32). Silmede NULL.'),
      C('son_guncelleme_kimligi', 'text', true, '', 'X-Guncelleme-Kimligi başlığından (en çok 64). Silmede NULL.'),
      C('kanal', 'text', true, '', 'X-Kanal başlığından (en çok 32). Silmede NULL.'),
    ],
    [
      'cihazlar_pk: PRIMARY KEY (id)',
      "cihazlar_kisi_id_etkin_uq: UNIQUE (kisi_id) WHERE durum = 'etkin' AND NOT inceleme_cihazi",
      'cihazlar_kisi_id_idx: (kisi_id)',
    ],
    [
      "cihazlar_durum_ck: durum IN ('etkin','degisim_bekliyor','kapandi') AND ((durum = 'kapandi') = (kapanma_ani IS NOT NULL)) AND ((kapanma_ani IS NULL) = (kapanma_nedeni IS NULL)) AND (durum <> 'etkin' OR etkinlesme_ani IS NOT NULL)",
      "cihazlar_platform_ck: platform IN ('android','ios') AND (platform = 'android' OR is_system_user IS NULL)",
      "cihazlar_dogrulama_sonucu_ck: dogrulama_sonucu IN ('dogrulandi','dogrulanamadi')",
      "cihazlar_kapanma_nedeni_ck: kapanma_nedeni IS NULL OR kapanma_nedeni IN ('degisim','cikis','silme','teyit_ret','bekleme_bitti','degisim_ret','degisim_iptal','degisim_zaman_asimi','inceleme_bitti')",
      'cihazlar_kisi_id_fk',
    ]),

  T('cihaz_anahtarlari',
    'Cihaza bağlı açık anahtarlar: Android P-256, iPhone App Attest ve Secure Enclave. Kanıttır: satır silinmez, anahtar baytları değişmez; yenilenen App Attest anahtarının eskisi gecersiz_ani ile kalır ve eski kayıtları doğrular. Satırlar D07 kanıtından önce yazılır, çünkü cihaz_kanitlari.anahtar_id bunlara yabancı anahtarla bağlanır (D07-A07).',
    [
      C('id', 'uuid', false, 'uuidv7()', 'Kayıt metnindeki anahtar kimliği; kayıtta ve yenilemede telefona döner.'),
      C('cihaz_id', 'uuid', false, '', 'cihazlar(id).'),
      C('tur', 'text', false, '', 'android_p256, app_attest, secure_enclave.'),
      C('acik_anahtar', 'bytea', false, '', 'SPKI DER, P-256.'),
      C('acik_anahtar_ozeti', 'bytea', false, '', 'SHA-256(acik_anahtar); tekil: bir donanım anahtarı tek cihaz satırına, dolayısıyla tek hesaba bağlanır.'),
      C('app_attest_anahtar_kimligi', 'bytea', true, '', 'Apple keyId (32 bayt); yalnız app_attest türünde, tekil.'),
      C('olusturma_ani', 'timestamptz', false, '', ''),
      C('gecersiz_ani', 'timestamptz', true, '', 'Yalnız App Attest anahtarında dolar: yenilenen eski anahtarda ya da kanıtı doğrulanamayan yeni anahtarda (aynı işlemde; satır ve D07 kanıt satırı kalır, sıklık sayımı başarısız yenilemeyi de görür).'),
      C('yerine_gecen_id', 'uuid', true, '', 'cihaz_anahtarlari(id); yenilemede yeni anahtar (yeni anahtar sonradan düşse de yazılır).'),
    ],
    [
      'cihaz_anahtarlari_pk: PRIMARY KEY (id)',
      'cihaz_anahtarlari_acik_anahtar_ozeti_uq: UNIQUE (acik_anahtar_ozeti)',
      'cihaz_anahtarlari_app_attest_anahtar_kimligi_uq: UNIQUE (app_attest_anahtar_kimligi) WHERE app_attest_anahtar_kimligi IS NOT NULL',
      'cihaz_anahtarlari_cihaz_id_tur_uq: UNIQUE (cihaz_id, tur) WHERE gecersiz_ani IS NULL',
    ],
    [
      "cihaz_anahtarlari_tur_ck: tur IN ('android_p256','app_attest','secure_enclave') AND ((tur = 'app_attest') = (app_attest_anahtar_kimligi IS NOT NULL)) AND (tur = 'app_attest' OR gecersiz_ani IS NULL)",
      'cihaz_anahtarlari_acik_anahtar_ozeti_ck: octet_length(acik_anahtar_ozeti) = 32',
      'cihaz_anahtarlari_degismez: BEFORE UPDATE OR DELETE tetikleyicisi; cihaz_id, tur, acik_anahtar, acik_anahtar_ozeti ve app_attest_anahtar_kimligi değişemez, satır silinemez (yalnız gecersiz_ani ve yerine_gecen_id bir kez dolar).',
      'cihaz_anahtarlari_cihaz_id_fk, cihaz_anahtarlari_yerine_gecen_id_fk',
    ]),

  T('cihaz_degisim_talepleri',
    'Yeni telefonun açtığı değişim talebi, QR\'da gösterilen tek kullanımlık değerin özeti ve kararı. Cihaz başına tek açık talep; bir hesapta birden çok açık talep olabilir, böylece numarayı bilen biri gerçek öğrencinin talebini düşüremez. Hoca karşısındaki öğrencinin kimliğini görüp onun telefonundaki QR\'ı onaylar, onay aynı hesabın öbür açık taleplerini iptal eder; hesabın etkin cihazı ya da talebi açan yeni cihaz da reddedebilir. Açık talep 72 saatte düşer.',
    [
      C('id', 'uuid', false, 'uuidv7()', 'QR\'da talep kimliği olarak taşınır; tek başına yetki vermez.'),
      C('ogrenci_kisi_id', 'uuid', false, '', 'kisiler(id); numarası teyitli hesap.'),
      C('yeni_cihaz_id', 'uuid', false, '', 'cihazlar(id); durum degisim_bekliyor.'),
      C('eski_cihaz_id', 'uuid', true, '', 'cihazlar(id); talep anında etkin cihaz, yoksa NULL (çıkıştan sonra yeniden kurulum).'),
      C('durum', 'text', false, '', 'bekliyor, onaylandi, reddedildi, iptal.'),
      C('deger_ozeti', 'bytea', false, '', 'SHA-256(128 bit QR değeri); değer yenilenince değişir.'),
      C('deger_bitis_ani', 'timestamptz', false, '', 'Değer üretimi + 900 saniye; süresi geçen değerle onay olmaz, telefon yeni değer ister.'),
      C('olusturma_ani', 'timestamptz', false, '', ''),
      C('talep_bitis_ani', 'timestamptz', false, '', 'olusturma_ani + 72 saat (DEGISIM_TALEBI_SAAT). Geçince kimlik_temizligi talebi iptal (zaman_asimi) yapar, yeni cihazı ve kısıtlı oturumu degisim_zaman_asimi ile kapatır.'),
      C('karar_ani', 'timestamptz', true, '', ''),
      C('karar_veren_kisi_id', 'uuid', true, '', 'kisiler(id).'),
      C('karar_veren_tur', 'text', true, '', 'hoca, ogrenci_eski_cihaz, ogrenci_yeni_cihaz, sistem.'),
      C('karar_gerekcesi', 'text', true, '', 'kimlik_goruldu, kimlik_uyusmadi, ogrenci_reddetti, vazgecildi, baska_talep_onaylandi, zaman_asimi, hesap_kapandi.'),
    ],
    [
      'cihaz_degisim_talepleri_pk: PRIMARY KEY (id)',
      "cihaz_degisim_talepleri_yeni_cihaz_id_uq: UNIQUE (yeni_cihaz_id) WHERE durum = 'bekliyor'",
      "cihaz_degisim_talepleri_ogrenci_kisi_id_idx: (ogrenci_kisi_id) WHERE durum = 'bekliyor'",
      "cihaz_degisim_talepleri_talep_bitis_ani_idx: (talep_bitis_ani) WHERE durum = 'bekliyor'",
      'cihaz_degisim_talepleri_karar_ani_idx: (karar_ani) WHERE karar_ani IS NOT NULL',
    ],
    [
      "cihaz_degisim_talepleri_durum_ck: durum IN ('bekliyor','onaylandi','reddedildi','iptal') AND ((durum = 'bekliyor') = (karar_ani IS NULL))",
      "cihaz_degisim_talepleri_karar_ck: karar_veren_tur IS NULL OR karar_veren_tur IN ('hoca','ogrenci_eski_cihaz','ogrenci_yeni_cihaz','sistem')",
      "cihaz_degisim_talepleri_gerekce_ck: karar_gerekcesi IS NULL OR karar_gerekcesi IN ('kimlik_goruldu','kimlik_uyusmadi','ogrenci_reddetti','vazgecildi','baska_talep_onaylandi','zaman_asimi','hesap_kapandi')",
      "cihaz_degisim_talepleri_talep_bitis_ani_ck: talep_bitis_ani > olusturma_ani AND talep_bitis_ani <= olusturma_ani + interval '72 hours'",
      'cihaz_degisim_talepleri_cihaz_ck: eski_cihaz_id IS NULL OR eski_cihaz_id <> yeni_cihaz_id',
      'cihaz_degisim_talepleri_deger_ozeti_ck: octet_length(deger_ozeti) = 32',
      'cihaz_degisim_talepleri_ogrenci_kisi_id_fk, _yeni_cihaz_id_fk, _eski_cihaz_id_fk, _karar_veren_kisi_id_fk',
    ]),

  T('kayit_kodlari',
    'Hocanın tek öğrenci numarası için verdiği tek kullanımlık kayıt kodu. Tablo ve uç baştan durur ki karar gelince göç gerekmesin; kullanım D15 ayarı kimlik.kayitKoduAcik\'e bağlıdır (KIMLIK_KAYIT_KODU_ACIK, varsayılan false; D01-A06), testler ayarı açıp kapatarak iki yolu da sınar.',
    [
      C('id', 'uuid', false, 'uuidv7()', ''),
      C('ogrenci_no', 'text', false, '', 'Kodun bağlı olduğu numara.'),
      C('kod_ozeti', 'bytea', false, '', "HMAC-SHA256(kayıt kodu özet anahtarı, D15 amacı kayit_kodu_ozeti, 'kayit:' + ogrenci_no + ':' + kod); 40 bitlik kod düz özetle çevrimdışı denenebileceği için anahtarlı. Giriş kodu anahtarından ayrıdır: o anahtar her an döndürülebilir ve kaybı yalnız 5 dakikalık kodları düşürmeli (teknik.html#sunucu-ayarlar, D01-A18)."),
      C('anahtar_kid', 'text', false, '', 'Özeti üreten kid. Döndürmede eski kid son açık kodun bitişine kadar (72 saat) YALNIZ_DOGRULAMA durumunda kalır; D15-B06 döndürme kuralına bu bekleme eklenir (D01-A14).'),
      C('veren_kisi_id', 'uuid', false, '', 'kisiler(id); hoca.'),
      C('ders_id', 'uuid', false, '', 'dersler(id), D02; yetkiyi veren ders (denetim için).'),
      C('olusturma_ani', 'timestamptz', false, '', ''),
      C('bitis_ani', 'timestamptz', false, '', 'olusturma_ani + 72 saat.'),
      C('yanlis_sayisi', 'smallint', false, '0', '5 olunca kod geçersiz. Yanlış denemede sayaç ve tüketilen D07 değeri işlenir (işlem biter), hata ondan sonra döner; geri alınan hata sayacı sıfırlayamaz, aynı değer yeniden denenemez.'),
      C('kullanilma_ani', 'timestamptz', true, '', ''),
      C('kullanan_kisi_id', 'uuid', true, '', 'kisiler(id); kodla açılan öğrenci hesabı.'),
      C('gecersiz_ani', 'timestamptz', true, '', '5 yanlış ya da aynı numaraya yeni kod.'),
    ],
    [
      'kayit_kodlari_pk: PRIMARY KEY (id)',
      'kayit_kodlari_ogrenci_no_uq: UNIQUE (ogrenci_no) WHERE kullanilma_ani IS NULL AND gecersiz_ani IS NULL',
      'kayit_kodlari_bitis_ani_idx: (bitis_ani)',
    ],
    [
      "kayit_kodlari_ogrenci_no_ck: ogrenci_no ~ '^[0-9]{9,10}$'",
      'kayit_kodlari_kod_ozeti_ck: octet_length(kod_ozeti) = 32',
      "kayit_kodlari_bitis_ani_ck: bitis_ani > olusturma_ani AND bitis_ani <= olusturma_ani + interval '72 hours'",
      'kayit_kodlari_yanlis_sayisi_ck: yanlis_sayisi BETWEEN 0 AND 5',
      'kayit_kodlari_kullanim_ck: (kullanilma_ani IS NULL) = (kullanan_kisi_id IS NULL)',
      'kayit_kodlari_veren_kisi_id_fk, kayit_kodlari_ders_id_fk (dersler), kayit_kodlari_kullanan_kisi_id_fk',
    ]),

  T('hesap_silme_istekleri',
    '"Hesabımı sil" isteğinin kaydı. Bekleyen iş yoksa istek aynı işlemde yapılır; varsa sıraya girer. Kişinin her açık telefon oturumu kendi kuyruğunun boşaldığını ayrı bildirir (iki telefonlu hocanın öbür telefonundaki iş beklenir); hepsi bildirince ya da 7 günlük gönderme süresi dolunca yapılır.',
    [
      C('id', 'uuid', false, 'uuidv7()', ''),
      C('kisi_id', 'uuid', false, '', 'kisiler(id); silinecek hesap.'),
      C('isteyen_kisi_id', 'uuid', false, '', 'kisiler(id); hesabın kendisi ya da yüz yüze başlatan hoca.'),
      C('kaynak', 'text', false, '', 'telefon, panel, hoca_yuz_yuze, kod (pasif personelin oturumsuz silmesi).'),
      C('durum', 'text', false, '', 'sirada, yapildi, iptal.'),
      C('istek_ani', 'timestamptz', false, '', 'Bu andan sonra imzalanan yoklama kaydı D07 kuralıyla sayılmaz. cihazGetir ve ogrenciHesabiGetir bu anı yalnız istek sirada ya da yapildi iken verir; iptal edilmiş istekte null döner.'),
      C('bos_bildiren_oturumlar', 'uuid[]', false, "'{}'", 'Kuyruğunun boş olduğunu (bekleyenOgeSayisi 0) bildiren telefon giriş oturumlarının kimlikleri. İstek, kişinin bütün açık telefon oturumları bu listedeyse yürütülür; yabancı anahtar değildir (oturum satırı temizlikte silinebilir).'),
      C('son_bildirim_ani', 'timestamptz', true, '', 'Telefonun son bildirdiği an.'),
      C('son_yurutme_ani', 'timestamptz', false, '', 'istek_ani + 7 gün (SILME_BEKLEME_GUN); gecelik iş bu anı geçeni yapar.'),
      C('yapilma_ani', 'timestamptz', true, '', ''),
      C('iptal_ani', 'timestamptz', true, '', ''),
    ],
    [
      'hesap_silme_istekleri_pk: PRIMARY KEY (id)',
      "hesap_silme_istekleri_kisi_id_uq: UNIQUE (kisi_id) WHERE durum = 'sirada'",
      "hesap_silme_istekleri_son_yurutme_ani_idx: (son_yurutme_ani) WHERE durum = 'sirada'",
    ],
    [
      "hesap_silme_istekleri_kaynak_ck: kaynak IN ('telefon','panel','hoca_yuz_yuze','kod')",
      "hesap_silme_istekleri_durum_ck: durum IN ('sirada','yapildi','iptal') AND ((durum = 'yapildi') = (yapilma_ani IS NOT NULL)) AND ((durum = 'iptal') = (iptal_ani IS NOT NULL))",
      'hesap_silme_istekleri_kisi_id_fk, hesap_silme_istekleri_isteyen_kisi_id_fk',
    ]),
];

// ---------------------------------------------------------------- endpoints
const E = (method, p, client, auth, request, response, errors, idempotency, rate_limit, grup) => ({ method, path: p, client, auth, request, response, errors, idempotency, rate_limit, grup });
const GIRISSIZ_IP = 'Girişsiz uçların geniş IP sınırı (D13 hizSinifi girissiz).';
const OTURUM = 'Oturum başına sınır (D13 hizSinifi oturum).';
const AGIR = 'Oturum başına ağır işlem sınırı (D13 hizSinifi agir).';
const endpoints = [
  E('POST', '/v1/kimlik/kod', 'telefon|panel', 'Girişsiz.',
    { eposta: 'metin, en çok 254; sunucuda epostaNormallestir ile küçültülür (İ, I ve ı i olur), yalnız @istanbul.edu.tr', amac: 'isteğe bağlı: giris (varsayılan) ya da basvuru_silme (oturumsuz silme kodu: onaylanmamış başvuru ve pasif personel)' },
    { durum: '202', gecerlilikSaniye: 'tamsayı, her durumda 300' },
    ['KIMLIK_EPOSTA_GECERSIZ'],
    'Her çağrı yeni kod üretebilir; tekrar zararsızdır. Gövde, durum kodu ve alt süre (SABIT_CEVAP_MS) hesap durumundan bağımsızdır; e-posta cevap yazıldıktan sonra gider, iş kuyruğuna girmez.',
    GIRISSIZ_IP + ' Adres başına dakikada 1, saatte 5, günde 10 e-posta (D14.epostaSiniriDenetle, kayan pencere); aşımda e-posta gitmez, cevap yine aynıdır.', 'giris'),
  E('POST', '/v1/kimlik/giris', 'telefon|panel', `Girişsiz; telefonda isteğe bağlı Bearer (yenileme). Önce D13'ün köken kuralı işler (D13-B08): başka kökenli Origin 403 API_KOKEN_GECERSIZ.`,
    { eposta: 'metin, en çok 254', kod: '6 ASCII rakam', istemci: 'telefon | panel', cihaz: `telefonda zorunlu { platform: android | ios, model: metin en çok 60 }; panelde yok, etiket User-Agent'tan` },
    { durum: 'giris | onay_bekliyor (genişleyen değer); onay_bekliyor yalnız kod_bekliyor başvuru sahibi açık başvuru kodunu giriş formuna yazınca döner, oturum açılmaz ve öbür alanlar gelmez', girisOturumuId: 'uuid', oturumAnahtari: `yalnız telefonda, base64url 43 karakter; panelde yerine Set-Cookie: ad D13'ün CEREZLER sabitinden (__Host-yoklama-oturum; HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age yok), yalnız istek.panelden true iken kurulur`, bitisAni: 'ISO 8601 UTC', kapananOturum: '{ istemci, cihazEtiketi } ya da null', kisi: '{ kisiId, roller: [{ rol, kapsamBirimId }] }' },
    ['KIMLIK_EPOSTA_GECERSIZ', 'KIMLIK_KOD_GECERSIZ', 'KIMLIK_BEKLEME_SURUYOR', 'KIMLIK_KOKEN_GECERSIZ'],
    `Kod tek kullanımlıktır; cevabı kaybolan istemci yeni kod ister. Yanlış, süresi geçmiş, kullanılmış ve hiç olmayan kod tek hata koduyla ve aynı alt süreyle döner. KIMLIK_KOKEN_GECERSIZ yalnız istemci panel olup Origin taşımayan girişte döner (D13 Origin'siz yazma isteğini telefon sayar, çerez kurulmaz).`,
    GIRISSIZ_IP + ' Adres başına ardışık yanlışta uzayan bekleme (eposta_giris_durumlari); beklemede yalnız bekleme başladıktan sonra üretilmiş kod denenebilir (D01-B07).', 'giris'),
  E('POST', '/v1/kimlik/cikis', 'telefon|panel', 'Geçerli oturum (rol beyanı ogrenci, degisim_bekleyen ve personel).',
    { bekleyenOgeSayisi: 'öğrencide zorunlu tamsayı (0 ya da büyük); personelde yok sayılır' },
    { cikildi: 'true; panelde çerez Max-Age=0 ile silinir' },
    ['KIMLIK_GONDERILMEMIS_KAYIT_VAR'],
    'Kapanmış oturumla tekrar 401 (kanca kodu) döner; istemci bunu çıkılmış sayar. Teyit bekleyen öğrenci hesabının tek cihazı çıkışla kapanınca hesap da aynı işlemde kapandi olur (D01-B28): numarada cihazsız teyitsiz hesap kalmaz. Telefon çıkıştan önce teyitsiz hesapta "bu telefondan verdiğin teyit bekleyen yoklamalar sayılmaz" uyarısını gösterir.',
    OTURUM, 'giris'),
  E('GET', '/v1/kimlik/oturumlar', 'telefon|panel', 'Personel (rol beyanı personel).',
    {},
    { oturumlar: '[{ girisOturumuId, istemci, cihazEtiketi, olusturmaAni, sonKullanimAni, bitisAni, buOturum }]; yalnız etkin olanlar, en yeni önce' },
    [],
    'Salt okuma.', OTURUM, 'giris'),
  E('DELETE', '/v1/kimlik/oturumlar/{girisOturumuId}', 'telefon|panel', 'Personel (rol beyanı personel); yalnız kendi oturumu.',
    { girisOturumuId: 'yol, uuid' },
    { durum: '204, gövde yok' },
    ['KIMLIK_OTURUM_BULUNAMADI'],
    'Zaten kapanmış kendi oturumu için de 204.', OTURUM, 'giris'),
  E('GET', '/v1/kimlik/ben', 'telefon|panel', 'Geçerli oturum (rol beyanı ogrenci, degisim_bekleyen ve personel).',
    {},
    { kisiId: 'uuid; kısıtlı oturumda yok', tur: 'personel | ogrenci', durum: 'genişleyen enum', incelemeHesabi: 'boolean', roller: '[{ rol, kapsamBirimId }]', oturum: '{ girisOturumuId, istemci, kapsam, bitisAni }', personel: '{ adSoyad, eposta, birimId, bolumId } ya da null', ogrenci: '{ ogrenciNo, eslesmeDurumu, teyitDurumu, cihaz: { cihazId, durum, dogrulandi, ikinciProfil }, acikDegisimTalepleri: [{ talepId, yeniCihazPlatformu, olusturmaAni, talepBitisAni }] (öğrenci bilmediği talebi etkin cihazından reddeder) } ya da null; kısıtlı oturumda yalnız { degisimTalebi: { talepId, durum, qrBitisAni, talepBitisAni } }', silme: '{ durum: yok | sirada, istekAni, sonYurutmeAni, bekleyenTelefonSayisi }' },
    [],
    'Salt okuma; telefonun cihaz durumunu ve yetki hatasının nedenini gösterdiği kaynak.', OTURUM, 'giris'),
  E('POST', '/v1/kimlik/basvuru', 'telefon|panel', 'Girişsiz.',
    { adSoyad: 'metin 2 ile 120, NFC, denetim karakteri yok', eposta: 'metin, en çok 254, yalnız @istanbul.edu.tr', birimId: 'uuid (GET /v1/dersler/birimler listesinden)', bolumId: 'uuid; birimin bölümü olmalı (D02.birimGetir)' },
    { durum: '202', gecerlilikSaniye: 'tamsayı, her durumda 300' },
    ['KIMLIK_EPOSTA_GECERSIZ', 'KIMLIK_BOLUM_GECERSIZ'],
    'Bir adres en çok bir silinmemiş kişi satırıdır (kisiler_eposta_uq). Kayıtsız adreste kişi satırı başvurunun bilgileriyle kod_bekliyor açılır. Adres kod_bekliyor ya da reddedildi durumundaysa kişi satırına dokunulmaz: yeni ad-soyad, birim ve bölüm yalnız yeni başvuru kodunun satırında durur ve doğrulamada kişiye yazılır, böylece adresi bilen yabancı gerçek başvuruyu değiştiremez. Öbür durumlarda duruma uygun e-posta gider; cevap her durumda aynıdır.',
    GIRISSIZ_IP + ' Adres başına e-posta sınırı (D14).', 'basvuru'),
  E('POST', '/v1/kimlik/basvuru/dogrula', 'telefon|panel', 'Girişsiz.',
    { eposta: 'metin, en çok 254', kod: '6 ASCII rakam' },
    { durum: 'onay_bekliyor' },
    ['KIMLIK_EPOSTA_GECERSIZ', 'KIMLIK_KOD_GECERSIZ', 'KIMLIK_BEKLEME_SURUYOR'],
    `Kod tek kullanımlık; oturum açılmaz. Doğru kod, kendi satırındaki ad-soyad, birim ve bölümü kişi satırına yazar; kod_bekliyor ve reddedildi kişi onay_bekliyor olur (yöneticiye önceki ret gösterilir). Zaten onay bekleyen hesapta kod tüketilmez, KIMLIK_KOD_GECERSIZ döner. Aynı doğrulama giriş formundan da yapılabilir (POST /v1/kimlik/giris, durum onay_bekliyor).`,
    GIRISSIZ_IP + ' Adres başına bekleme (giriş koduyla ortak).', 'basvuru'),
  E('POST', '/v1/kimlik/basvuru/silme', 'telefon|panel', 'Girişsiz; POST /v1/kimlik/kod ile amac basvuru_silme olarak alınan kod. Oturumsuz silme ucudur: onaylanmamış başvuru (kod_bekliyor, onay_bekliyor, reddedildi) ve oturum açamayan pasif personel.',
    { eposta: 'metin, en çok 254', kod: '6 ASCII rakam' },
    { silindi: 'true' },
    ['KIMLIK_EPOSTA_GECERSIZ', 'KIMLIK_KOD_GECERSIZ', 'KIMLIK_BEKLEME_SURUYOR'],
    'Kod tek kullanımlık; silinmiş hesaba kod üretilmez. Onaylanmamış başvuruda ad-soyad ve adres silinir. Pasif personelde hesabiSil hocanın alan listesini uygular (ad-soyad ve bölüm kalır, D01-B33); pasif hesabın oturumu olmadığından beklenecek telefon işi yoktur, istek kaynak kod ile aynı işlemde yapildi olur.',
    GIRISSIZ_IP + ' Adres başına bekleme.', 'basvuru'),
  E('POST', '/v1/kimlik/ogrenci/kayit', 'telefon', 'Girişsiz.',
    { ogrenciNo: '9 ya da 10 ASCII rakam (D03 şeması)', adSoyad: 'metin 2 ile 120, NFC', platform: 'android | ios', model: 'isteğe bağlı, en çok 60', dogrulamaDegeri: 'base64url, 32 bayt; POST /v1/dogrulama/deger ile amaç KAYIT', kanit: 'android: { acikAnahtar (SPKI, base64), sertifikaZinciri (isteğe bağlı, en çok 10 DER), isSystemUser, baglamaImzasi }; ios: { secureEnclaveAcikAnahtar (SPKI), baglamaImzasi, appAttest (isteğe bağlı) { kanit (CBOR, en çok 16 KiB), anahtarKimligi } }', kayitKodu: 'isteğe bağlı, 8 Crockford karakteri; yalnız D15 ayarı kimlik.kayitKoduAcik true iken' },
    { durum: 'teyit_bekliyor | teyitli | degisim_bekliyor', kisiId: 'yalnız yeni ya da yeniden bağlanan hesapta', cihazId: 'uuid', oturumAnahtari: 'base64url 43 karakter, yalnız bu cevapta', anahtarlar: '[{ anahtarId, tur }]', eslesme: 'eslesti | isim_uyusmuyor | listede_yok (değişimde yok)', cihazDogrulandi: 'boolean', degisimTalebi: '{ talepId, qrDegeri, qrBitisAni, talepBitisAni } ya da null' },
    ['KIMLIK_DOGRULAMA_DEGERI_GECERSIZ', 'KIMLIK_CIHAZ_KANITI_REDDEDILDI', 'KIMLIK_CIHAZ_BAGLI', 'KIMLIK_CIHAZ_KAPANDI', 'KIMLIK_COK_BEKLEYEN_HESAP', 'KIMLIK_COK_DEGISIM_TALEBI', 'KIMLIK_KAYIT_KODU_GECERSIZ', 'KIMLIK_KAYIT_KODU_KAPALI', 'KIMLIK_NUMARA_TEYITLI'],
    'Doğrulama değeri tek kullanımlık. Kaybolan cevap: aynı donanım anahtarı aynı numarayla yeniden gelirse ve anahtarın cihazı etkin ya da degisim_bekliyor, hesabı aktifse var olan hesap yeni oturum anahtarıyla döner, önceki oturum yenilendi diye kapanır, cihazın durumu değişmez (değişim bekleyen cihazda yeni QR değeri de döner). Anahtarın cihazı kapandiysa ya da hesap aktif değilse 409 KIMLIK_CIHAZ_KAPANDI ve oturum açılmaz: telefon yeni anahtar üretip değişim yolundan gelir (çalınan ya da değiştirilen eski telefon anahtarıyla hesaba dönemez, plan.html#hile). Aynı anahtar başka numarayla gelirse KIMLIK_CIHAZ_BAGLI. Yanlış kayıt kodunda sayaç ve tüketilen değer işlenir, hata sonra döner.',
    GIRISSIZ_IP + ' Numara başına en çok 5 etkin cihazlı teyitsiz hesap (BEKLEYEN_HESAP_SINIRI) ve son 24 saatte en çok 10 yeni hesap (KAYIT_NUMARA_GUNLUK_SINIRI); geçerli kayıt kodu iki sınırı da aşar.', 'ogrenci'),
  E('POST', '/v1/kimlik/cihaz/app-attest-yenile', 'telefon', 'Öğrenci, tam oturum (rol beyanı ogrenci), iPhone cihazı.',
    { dogrulamaDegeri: 'base64url, 32 bayt; amaç ANAHTAR_YENILEME', appAttestKanit: 'CBOR, en çok 16 KiB', appAttestAnahtarKimligi: 'base64, 32 bayt', secureEnclaveImzasi: 'DER; değer ile yeni anahtar kimliğinin birleşiminin SHA-256 özeti üstünde, hesaptaki Secure Enclave anahtarıyla' },
    { anahtarId: 'uuid ya da null (kanıt doğrulanamadı ya da reddedildi)', dogrulama: 'dogrulandi | dogrulanamadi | reddedildi (genişleyen değer)' },
    ['KIMLIK_DOGRULAMA_DEGERI_GECERSIZ', 'KIMLIK_IMZA_GECERSIZ', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL'],
    `Aynı App Attest anahtar kimliği ikinci kez gelirse var olan anahtarId ve sonuç döner. Sıra: eski anahtarın gecersiz_ani dolar, yeni anahtar yazılır, D07 kanıtı doğrular (kanıt satırı yeni anahtara bağlanır). Kanıt doğrulandi değilse yeni anahtarın gecersiz_ani aynı işlemde dolar (tek izinli dolum), işlem yine işlenir: kanıt satırı ve kimlik.app_attest_yenileme denetimi kalır, D07'nin sıklık sayımı başarısız yenilemeyi de görür, cihaz Secure Enclave anahtarıyla sürer. iPhone olmayan cihazda 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL.`,
    OTURUM + ' Her yenileme, başarısız olan da, denetime ve D07 kanıt satırına yazılır.', 'ogrenci'),
  E('POST', '/v1/kimlik/cihaz-degisimi', 'telefon', 'Girişsiz (yeni telefonun ilk talebi) ya da değişim bekleyen öğrenci oturumu (QR değerini yenileme; rol beyanı degisim_bekleyen).',
    { govde: 'girişsizken POST /v1/kimlik/ogrenci/kayit alanları (amaç CIHAZ_DEGISIMI, kayitKodu yok); değişim bekleyen oturumla boş gövde' },
    { talepId: 'uuid', qrDegeri: 'base64url, 16 bayt, yalnız bu cevapta', qrBitisAni: 'ISO 8601 UTC (900 saniye)', talepBitisAni: 'ISO 8601 UTC (72 saat)', cihazId: 'uuid', oturumAnahtari: 'yalnız ilk açılışta', anahtarlar: '[{ anahtarId, tur }], yalnız ilk açılışta' },
    ['KIMLIK_DOGRULAMA_DEGERI_GECERSIZ', 'KIMLIK_CIHAZ_KANITI_REDDEDILDI', 'KIMLIK_CIHAZ_BAGLI', 'KIMLIK_CIHAZ_KAPANDI', 'KIMLIK_COK_DEGISIM_TALEBI', 'KIMLIK_DEGISIM_GEREKMIYOR'],
    'Cihaz başına tek açık talep; başka bir cihazdan gelen talep öncekine dokunmaz (numarayı bilen biri gerçek talebi düşüremez). Hesapta doğrulanamayan cihazlı açık talep en çok 3 (DEGISIM_TALEBI_SINIRI): sınır kanıt sonucundan sonra denetlenir, dogrulanamadi cihazlı yeni talep sınırı aşacaksa işlem geri alınır ve 409 KIMLIK_COK_DEGISIM_TALEBI döner; doğrulanmış cihazın talebi sınıra takılmaz. Açık talep 72 saatte düşer (kimlik_temizligi). Yenileme yalnız QR değerini ve bitişini değiştirir. Kaybolan cevapta kayıt ucunun yeniden bağlama kuralı geçerlidir.',
    GIRISSIZ_IP + ' Oturumla gelende oturum sınıfı.', 'ogrenci'),
  E('GET', '/v1/kimlik/cihaz-degisimi/{talepId}', 'telefon', 'Hoca (rol beyanı hoca); öğrencinin etkin liste satırı olan bir dersin hocası (D03.ogrencininEtkinSatirlari ve D02.dersYetkisi).',
    { talepId: 'yol, uuid' },
    { talepId: 'uuid', durum: 'bekliyor | onaylandi | reddedildi | iptal', ogrenciNo: 'metin', listeAdSoyad: 'yetkili dersin liste satırındaki isim (D03)', eskiCihaz: '{ platform, sonGorulmeAni } ya da null', yeniCihaz: '{ platform, dogrulandi }', acikTalepSayisi: `hesabın açık talep sayısı; 1'den büyükse hoca ekranı başka telefonlardan da talep olduğunu yazar, onay öbürlerini iptal eder`, olusturmaAni: 'ISO 8601', qrBitisAni: 'ISO 8601' },
    ['KIMLIK_TALEP_BULUNAMADI'],
    'Salt okuma; yetki dışı talep de yok sayılır (404), varlık sızmaz.', OTURUM, 'ogrenci'),
  E('POST', '/v1/kimlik/cihaz-degisimi/{talepId}/onay', 'telefon', 'Hoca (rol beyanı hoca); aynı yetki.',
    { talepId: 'yol, uuid', qrDegeri: `base64url, 16 bayt (okutulan QR'dan)`, kimlikGoruldu: 'true sabiti' },
    { durum: 'onaylandi' },
    ['KIMLIK_TALEP_BULUNAMADI', 'KIMLIK_DEGER_GECERSIZ', 'KIMLIK_TALEP_KAPANMIS'],
    'Onaylanmış talebe aynı hocanın tekrar onayı 200 ve aynı sonuç. Onay tek işlemdir ve hesabın öbür açık taleplerini baska_talep_onaylandi ile iptal eder; onların yeni cihazları ve kısıtlı oturumları degisim_iptal ile kapanır.', OTURUM, 'ogrenci'),
  E('POST', '/v1/kimlik/cihaz-degisimi/{talepId}/ret', 'telefon', 'Yetkili hoca (rol hoca), hesabın etkin cihazının öğrenci oturumu (rol ogrenci, "bu ben değilim") ya da talebi açan yeni cihazın oturumu (rol degisim_bekleyen, vazgeçme).',
    { talepId: 'yol, uuid', gerekceKodu: 'hocada kimlik_uyusmadi; eski cihazda ogrenci_reddetti; yeni cihazda vazgecildi' },
    { durum: 'reddedildi | iptal' },
    ['KIMLIK_TALEP_BULUNAMADI', 'KIMLIK_TALEP_KAPANMIS'],
    'Kapanmış talebe aynı karar 200 döner.', OTURUM, 'ogrenci'),
  E('POST', '/v1/kimlik/hesap-silme', 'telefon|panel', 'Personel ya da öğrenci, tam oturum (rol beyanı ogrenci ve personel). Personelde ilk istek son 15 dakikada açılmış oturum ister (YAKIN_GIRIS_DK); sıradaki isteğe telefondan bildirim yeniden giriş istemez.',
    { bekleyenOgeSayisi: 'telefonda zorunlu tamsayı (0 ya da büyük); panelde yok' },
    { durum: 'sirada | yapildi', sonYurutmeAni: 'sırada ise ISO 8601', bekleyenTelefonSayisi: 'sırada ise kuyruğunun boşaldığını henüz bildirmeyen açık telefon oturumu sayısı' },
    ['KIMLIK_YENIDEN_GIRIS_GEREKLI'],
    `Hesap başına tek sıradaki istek; tekrar aynı satırı döner. Telefondan bekleyenOgeSayisi 0 gelince o giriş oturumu bos_bildiren_oturumlar'a eklenir; kişinin bütün açık telefon oturumları listedeyse istek aynı işlemde yürütülür. Böylece iki telefonlu hocada biri boş bildirince öbürünün işi beklenir (plan.html#kararlar-hesap-silme). Panelden istek kişinin açık telefon oturumu yoksa hemen yapılır.`,
    OTURUM, 'silme'),
  E('DELETE', '/v1/kimlik/hesap-silme', 'telefon|panel', 'Aynı hesabın tam oturumu (rol beyanı ogrenci ve personel).',
    {},
    { durum: 'iptal' },
    ['KIMLIK_SILME_ISTEGI_YOK'],
    'Sırada istek yoksa 404; yapılmış silme geri alınmaz. İptalden sonra cihazGetir ve ogrenciHesabiGetir silme anını null döner, sonraki kayıtlar yine sayılır.', OTURUM, 'silme'),
  E('POST', '/v1/kimlik/ogrenciler/{kisiId}/hesap-silme', 'telefon|panel', 'Hoca (rol beyanı hoca); gövdedeki dersin hocası ve öğrencinin o derste etkin liste satırı var, kimliği yüz yüze görerek. Yalnız etkin cihazı olmayan hesapta: telefonu olmayan öğrenci (plan.html#kararlar-hesap-silme), reddedilmiş ya da kapanmış hesap.',
    { kisiId: 'yol, uuid', dersId: 'uuid; yetkiyi veren ders, denetime yazılır', kimlikGoruldu: 'true sabiti' },
    { durum: 'yapildi' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL'],
    'Silinmiş hesapta 200 yapildi. Etkin cihazı olan hesapta 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL, hesap değişmez: öğrenci uygulamadan siler. Ele geçirilmiş bir hoca hesabı bütün sınıfı bu uçla silemez. kimlik.hesap_silindi denetimi dersId ile yazılır.',
    AGIR, 'silme'),
  E('POST', '/v1/kimlik/kayit-kodlari', 'telefon|panel', 'Hoca (rol beyanı hoca); numara hocanın dersinde etkin liste satırında olmalı.',
    { ogrenciNo: '9 ya da 10 ASCII rakam (gövdede, adres satırında değil)' },
    { kod: '8 Crockford karakteri, 4 ve 4 gruplu, yalnız bu cevapta', bitisAni: 'ISO 8601 (72 saat)' },
    ['KIMLIK_KAYIT_KODU_KAPALI', 'KIMLIK_OGRENCI_LISTEDE_DEGIL', 'KIMLIK_NUMARA_TEYITLI'],
    'Numara başına tek açık kod; yeni istek öncekini geçersiz kılar. kimlik.kayitKoduAcik false iken 403.', OTURUM, 'ogrenci'),
  E('GET', '/v1/kimlik/yonetim/basvurular', 'panel', 'Yönetici (rol beyanı yonetici); kapsamına göre süzülür (yetkiDenetle).',
    { durum: 'sorgu: onay_bekliyor (varsayılan) | reddedildi', imlec: 'sorgu, opak', adet: 'sorgu, 1 ile 500, varsayılan 100' },
    { ogeler: '[{ kisiId, adSoyad, eposta, birimId, bolumId, basvuruAni, sonRetAni, sonRetGerekcesi }]', sonrakiImlec: 'metin ya da null' },
    [],
    'Salt okuma; anahtar kümesi sayfalaması (D13-B13).', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/basvurular/{kisiId}/onay', 'panel', 'Yönetici; başvurunun birimi kapsamında (dışındaysa 404).',
    { kisiId: 'yol, uuid' },
    { durum: 'aktif' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL'],
    'Zaten aktif ve hoca rolü olan hesapta 200.', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/basvurular/{kisiId}/ret', 'panel', 'Yönetici; başvurunun birimi kapsamında (dışındaysa 404).',
    { kisiId: 'yol, uuid', gerekceKodu: 'hoca_degil | bolum_yanlis | bilgi_eksik | diger' },
    { durum: 'reddedildi' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL'],
    'Zaten reddedilmiş başvuruda 200.', OTURUM, 'yonetim'),
  E('GET', '/v1/kimlik/yonetim/hesaplar', 'panel', 'Yönetici (rol beyanı yonetici); kapsamına göre süzülür.',
    { durum: 'sorgu, isteğe bağlı', rol: 'sorgu, hoca | yonetici', birimId: 'sorgu, uuid', imlec: 'sorgu, opak', adet: 'sorgu, 1 ile 500' },
    { ogeler: '[{ kisiId, adSoyad, eposta, birimId, bolumId, durum, roller, etkinOturumSayisi, incelemeHesabi }]', sonrakiImlec: 'metin ya da null' },
    [],
    'Salt okuma. İsim araması adres satırına girmesin diye panelde yapılır.', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/hesaplar/{kisiId}/oturumlari-kapat', 'panel', 'Yönetici; yalnız kapsamındaki personel. Yönetici rolü taşıyan hedef ancak rol kapsamı arayanın kapsamının içindeyse kapsamdadır (tüm kapsamlı yöneticiye yalnız tüm kapsamlı yönetici dokunur); öğrenci hesabı ve kapsam dışı hedef 404.',
    { kisiId: 'yol, uuid' },
    { kapatilan: 'tamsayı' },
    ['KIMLIK_HESAP_BULUNAMADI'],
    'Tekrar 0 kapatır, 200.', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/hesaplar/{kisiId}/pasif', 'panel', 'Yönetici; kapsamındaki personel, yönetici hedefte rol kapsamı kuralıyla (oturumlari-kapat ile aynı).',
    { kisiId: 'yol, uuid' },
    { durum: 'pasif' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL', 'KIMLIK_SON_YONETICI'],
    'Zaten pasifte 200. Bütün oturumlar aynı işlemde kapanır.', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/hesaplar/{kisiId}/etkin', 'panel', 'Yönetici; kapsamındaki personel, yönetici hedefte rol kapsamı kuralıyla.',
    { kisiId: 'yol, uuid' },
    { durum: 'aktif' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL'],
    'Zaten aktifte 200.', OTURUM, 'yonetim'),
  E('POST', '/v1/kimlik/yonetim/yoneticiler', 'panel', 'Yönetici; kapsamlı yönetici yalnız kendi kapsamındaki birime ve yalnız birim kapsamlı yönetici ekler, hoca rolünü yalnız kapsamındaki personele verir.',
    { eposta: 'metin, @istanbul.edu.tr', adSoyad: 'yeni hesapta zorunlu, 2 ile 120', birimId: 'yeni hesapta zorunlu, uuid', bolumId: 'yeni hesapta zorunlu, uuid', rol: 'isteğe bağlı: yonetici (varsayılan) ya da hoca', kapsamBirimId: 'yalnız rol yonetici iken: uuid ya da null (tüm)' },
    { kisiId: 'uuid', yeniHesap: 'boolean' },
    ['KIMLIK_EPOSTA_GECERSIZ', 'KIMLIK_BOLUM_GECERSIZ', 'KIMLIK_HESAP_DURUMU_UYGUN_DEGIL', 'KIMLIK_KAPSAM_YETERSIZ'],
    'Aynı rol ve aynı kapsam zaten varsa 200 ve yeniHesap false. Kişi başka bir kapsamla yönetici ise 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL: önce DELETE ile rol geri alınır (son yönetici koruması orada), sonra yeniden eklenir; uç rolü hiçbir zaman sessizce daraltmaz. rol hoca aktif personele hoca rolü verir (yönetici olarak eklenen bölüm başkanı ders de verir, D01-B01); kimlik.rol_verildi denetimi.', OTURUM, 'yonetim'),
  E('DELETE', '/v1/kimlik/yonetim/yoneticiler/{kisiId}', 'panel', 'Yönetici; yönetici rolünde hedefin kapsamı kendi kapsamının içinde, hoca rolünde hedef kapsamındaki personel.',
    { kisiId: 'yol, uuid', rol: 'sorgu, isteğe bağlı: yonetici (varsayılan) ya da hoca' },
    { durum: '204, gövde yok' },
    ['KIMLIK_HESAP_BULUNAMADI', 'KIMLIK_SON_YONETICI'],
    'Bu rolü olmayan kişide 204. Hoca rolü de bu uçtan geri alınır (yol adı sözleşmede sabit, D01-A14); kimlik.rol_alindi denetimi.', OTURUM, 'yonetim'),
];

// ---------------------------------------------------------------- jobs
const jobs = [
  { name: 'kimlik_temizligi',
    schedule: 'Saatlik, her saatin 17. dakikası, Europe/Istanbul; sık iş olduğu için missed: skip (D14-B05).',
    idempotency: 'Koşullar saat arayüzündeki ana göredir; ikinci çalıştırma işlenecek satır bulmaz. 1000 satırlık partiler, her parti kendi işleminde; iş verisi boş. İşçide çalışır, gizli anahtar istemez.',
    does: `24 saatten eski giriş kodlarını ve son yanlıştan 24 saat geçmiş, beklemesi bitmiş eposta_giris_durumlari satırlarını siler. Son başvuru kodu üretildikten 24 saat sonra hâlâ kod_bekliyor olan ve açık kodu kalmayan başvuruyu silindi yapar (adres ve ad-soyad NULL; kişi satırı fiziksel silinmez, D12-B16). Retten 30 gün sonra reddedilmiş başvurunun ad-soyadını ve adresini silip durumunu silindi yapar. 72 saati dolan açık değişim taleplerini iptal (zaman_asimi) yapar, yeni cihazlarını ve kısıtlı oturumlarını degisim_zaman_asimi ile kapatır (olay ve D07.yenidenDegerlendir aynı işlemde). Geçersiz ya da kullanılmış olmasının üstünden 7 gün geçen kayıt kodlarını ve karar verilmesinin üstünden 30 gün geçen değişim taleplerini siler. İşlenen satır sayılarını yalnız sayı olarak loglar.` },
  { name: 'giris_oturumu_temizligi',
    schedule: 'Her gece 02:20 Europe/Istanbul (D14 çizelgesi; 03:00 ile 05:00 arası günlük işe kapalı, D14-B05), missed: once.',
    idempotency: 'Yalnız kapanışı ya da bitişi 30 günden eski satırları seçer; ikinci çalıştırma boş geçer.',
    does: 'Kapanmış ya da süresi dolmuş (personelde bitiş, panelde 1 saat işlemsizlik) ve bunun üstünden 30 gün geçmiş giriş oturumu satırlarını siler. Giriş ve kapanış olayları denetim kaydında kalır.' },
  { name: 'hesap_silme_yurutucu',
    schedule: 'Her gece 02:10 Europe/Istanbul (D14 çizelgesi), missed: once.',
    idempotency: 'Sıradaki istekler FOR UPDATE SKIP LOCKED ile alınır, her biri kendi işleminde yürür; yapılmış istek durum yapildi olduğundan yeniden seçilmez, silinmiş hesapta hesabiSil değişiklik yapmaz.',
    does: `Durumu sirada olan ve son_yurutme_ani geçmiş ya da kişinin bütün açık telefon oturumları bos_bildiren_oturumlar'da olan (öbür telefonun oturumu bu arada kapanmış olabilir) istekleri hesabiSil ile yürütür (alan listesi: Durumlar ve kurallar). Bekleyen iş telefon kaybolduğu için hiç gelmese de mağaza şartı gereği silme yapılır (7 gün sahibin kararına bağlı, D01-A21). İşçi süreci giriş kodu anahtarını yüklemez; hesabiSil anahtar istemez, çünkü adres bekleme satırına dokunmaz. Kimlik olayları işçinin bileşim kökünde kurulan dinleyicilere gider (D15 telefon sayaçlarını, D11 QR yuvasını, D06 kurulum izlerini siler).` },
  { name: 'inceleme_hesaplari_kurulumu',
    schedule: 'İşçi açılışında bir kez (yayın adımı), her gece 00:45 Europe/Istanbul (D14 çizelgesi) ve inceleme hocası silinince silme işleminde kuyruğa (D14.isGonder, gün başına tekil anahtar); missed: once.',
    idempotency: 'Ayarlardaki adresle aktif inceleme hocası, deneme dersi ve deneme liste satırı varsa satır eklemez; D02.denemeDersiniKur ve D03.denemeListesiniKur da eş güçlüdür. Bütün adımlar tek işlemde; biri hata verirse hiçbiri kalmaz.',
    does: `Tek işlemde: (1) D15.ayarlar'daki deneme hocası adresi ve adıyla onaylı, hoca rollü, inceleme_hesabi işaretli personel hesabını kurar ya da silinmişse yeniden kurar; (2) D02.denemeDersiniKur(tx, hocaKisiId) ile deneme dersini kurdurur, ders başka hocadaysa yeni hocaya devrettirir; (3) dönen şubeye D03.denemeListesiniKur(tx, subeId, INCELEME_OGRENCI_NO, INCELEME_OGRENCI_ADI) ile deneme öğrencisinin liste satırını kurdurur; (4) ayarlarla artık eşleşmeyen hesaplardan inceleme işaretini kaldırır: eski inceleme hocasının oturumlarını inceleme_bitti ile kapatır (sabit kod, bildirim istisnası ve 3 oturum muafiyeti biter), eski deneme öğrencisi hesabını cihazları ve oturumlarıyla inceleme_bitti nedeniyle kapatır; (5) deneme numarasının deneme dersi dışında etkin liste satırı varsa (D03.ogrencininEtkinSatirlari) D15.uyariAc ile kimlik.inceleme_numarasi_cakisiyor uyarısını açar. Deneme öğrencisi hesabı bu işle değil, ayarlardaki numarayla gelen ilk kayıtta teyitli açılır. Ayar eksikse D15.uyariAc ile işletim uyarısı açar; gizli sabit kodun varlığını API süreci açılışta denetler (işçi onu yüklemez).` },
  { name: 'bekleyen_kayit_kapatma',
    schedule: `Her gece 00:30 Europe/Istanbul, sonra: donem_kilidi (D02, 00:20); D14 çizelgesindeki 00:15 yeri donem_kilidi'nden önce kaldığı için 00:30'a taşınır (D01-A14). missed: once.`,
    idempotency: 'Kapanan hesap durumu kapandi olduğundan yeniden seçilmez; her hesap kendi işleminde.',
    does: 'Teyit bekleyen, eşleşmesi listede_yok olan, en az 30 günlük ve oluşturulmasından sonra en az iki birim ve dönem kilidi geçmiş (BEKLEYEN_KAPATMA_KILIT 2, D12-A03 ile aynı; D02.kilitliBirimDonemleri) öğrenci hesabını D03.numaraIleEslestir ile son kez dener; yine listede yoksa hesabı kapandi, cihazını kapandi (bekleme_bitti) yapar, oturumunu kapatır, girilen ismi ve cihaz ayrıntılarını siler ve D07.yenidenDegerlendir çağırır. Süre sahibin kararına bağlı (D01-A25).' },
];

// ---------------------------------------------------------------- state machines
const SM = (name, states, transitions) => ({ name, states, transitions });
const TR = (from, to, by, when) => ({ from, to, by, when });
const state_machines = [
  SM('personel_hesabi', ['yok', 'kod_bekliyor', 'onay_bekliyor', 'aktif', 'pasif', 'reddedildi', 'silindi'], [
    TR('yok', 'kod_bekliyor', 'POST /v1/kimlik/basvuru', 'Adres kayıtlı değil; kişi satırı başvurunun bilgileriyle açılır, başvuru kodu e-postası gider.'),
    TR('kod_bekliyor', 'onay_bekliyor', 'POST /v1/kimlik/basvuru/dogrula, POST /v1/kimlik/giris', 'Doğru başvuru kodu; kod satırındaki bilgiler kişiye yazılır, oturum açılmaz.'),
    TR('kod_bekliyor', 'silindi', 'kimlik_temizligi', 'Son başvuru kodundan 24 saat sonra doğrulanmadı ve açık kodu yok; adres ve ad-soyad NULL olur, kişi satırı kalır.'),
    TR('onay_bekliyor', 'aktif', 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/onay', 'Kapsamındaki yönetici onaylar; hoca rolü verilir.'),
    TR('onay_bekliyor', 'reddedildi', 'POST /v1/kimlik/yonetim/basvurular/{kisiId}/ret', 'Gerekçe koduyla; son_ret_ani dolar.'),
    TR('reddedildi', 'onay_bekliyor', 'POST /v1/kimlik/basvuru, sonra POST /v1/kimlik/basvuru/dogrula', 'Aynı adresle yeni başvuru kişi satırını değiştirmez; doğrulamada yeni bilgiler yazılır, yöneticiye önceki ret gösterilir.'),
    TR('yok', 'aktif', 'yonetici-ekle, POST /v1/kimlik/yonetim/yoneticiler, inceleme_hesaplari_kurulumu', 'Onaylı hesap doğrudan açılır.'),
    TR('kod_bekliyor, onay_bekliyor, reddedildi', 'aktif', 'yonetici-ekle, POST /v1/kimlik/yonetim/yoneticiler', 'Yöneticinin ya da komutun açık işlemi onay sayılır.'),
    TR('aktif', 'pasif', 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/pasif', 'Bütün oturumlar aynı işlemde kapanır; son tüm kapsamlı yönetici pasif olamaz.'),
    TR('pasif', 'aktif', 'POST /v1/kimlik/yonetim/hesaplar/{kisiId}/etkin, yonetici-ekle', 'Oturum açılmaz, kişi yeniden kodla girer.'),
    TR('aktif', 'silindi', 'POST /v1/kimlik/hesap-silme, hesap_silme_yurutucu', 'E-posta, kodlar ve oturum satırları silinir, roller geri alınır; ad-soyad ve bölüm kalır.'),
    TR('pasif', 'silindi', 'POST /v1/kimlik/basvuru/silme (amac basvuru_silme kodu)', 'Pasif personel oturum açamadığı için e-posta koduyla oturumsuz siler; alan listesi aktifteki gibi (plan.html#kararlar-hesap-silme: silme her zaman başlatılabilir).'),
    TR('kod_bekliyor, onay_bekliyor, reddedildi', 'silindi', 'POST /v1/kimlik/basvuru/silme, kimlik_temizligi', 'Başvuru sahibinin isteği ya da retten 30 gün sonra; ad-soyad ve adres de silinir.'),
  ]),
  SM('ogrenci_hesabi', ['yok', 'aktif_teyit_bekliyor', 'aktif_teyitli', 'reddedildi', 'kapandi', 'silindi'], [
    TR('yok', 'aktif_teyit_bekliyor', 'POST /v1/kimlik/ogrenci/kayit', `Numarada teyitli hesap yok; numaranın etkin cihazlı teyitsiz hesabı 5'ten az ve son 24 saatte açılan hesabı 10'dan az.`),
    TR('yok', 'aktif_teyitli', 'POST /v1/kimlik/ogrenci/kayit', 'Geçerli kayıt kodu (kimlik.kayitKoduAcik iken; iki sınırı aşar, numaranın öbür teyitsiz hesaplarını aynı işlemde numara_baskasinda ile reddeder) ya da ayarlardaki inceleme numarası (deneme dersi dışında etkin liste satırı yoksa).'),
    TR('aktif_teyit_bekliyor', 'aktif_teyitli', 'ogrenciTeyitEt (D09 ucu)', 'Öğrencinin etkin liste satırı olan dersin hocası; toplu yolda yalnız eşleşmiş, cihazı doğrulanmış ve çakışmasız hesap.'),
    TR('aktif_teyit_bekliyor', 'reddedildi', 'ogrenciTeyidiniReddet, aynı numaranın başka hesabının teyidi ya da kodla kaydı', 'Cihaz ve oturum kapanır, açık talepler iptal olur, girilen isim ve cihaz ayrıntıları silinir, kayıtları D07 yeniden değerlendirir (sonucu D01-A05).'),
    TR('aktif_teyit_bekliyor', 'kapandi', 'bekleyen_kayit_kapatma', 'Hiçbir listede yok, en az 30 gün ve oluşturmadan sonra iki dönem kilidi geçti; girilen isim ve cihaz ayrıntıları silinir.'),
    TR('aktif_teyit_bekliyor', 'kapandi', 'POST /v1/kimlik/cikis', 'Tek cihazı çıkışla kapanan teyitsiz hesap aynı işlemde kapanır; yeniden kayıt yeni hesap açar, numarada cihazsız teyitsiz hesap kalmaz.'),
    TR('aktif_teyit_bekliyor, aktif_teyitli', 'kapandi', 'inceleme_hesaplari_kurulumu', 'Ayarlar değişince eski deneme öğrencisi hesabı (inceleme_bitti).'),
    TR('aktif_teyit_bekliyor, aktif_teyitli', 'silindi', 'POST /v1/kimlik/hesap-silme, hesap_silme_yurutucu', 'Oturum satırları ve girilen isim silinir, cihaz kapanır; numara, teyit bilgisi ve açık anahtarlar kalır.'),
    TR('aktif_teyit_bekliyor, aktif_teyitli, reddedildi, kapandi', 'silindi', 'POST /v1/kimlik/ogrenciler/{kisiId}/hesap-silme', 'Hoca yüz yüze başlatır; yalnız etkin cihazı olmayan hesapta. Reddedilen ve kapanan hesapta girilen isim ve cihaz ayrıntıları zaten o anda silinmiştir; bu yol kalan oturum satırlarını da siler.'),
  ]),
  SM('eslesme_durumu', ['listede_yok', 'isim_uyusmuyor', 'eslesti'], [
    TR('yok', 'listede_yok, isim_uyusmuyor, eslesti', 'POST /v1/kimlik/ogrenci/kayit', 'D03.numaraIleEslestir sonucu; isimde yalnız NFC, boşluk ve Türkçe büyük küçük harf farkı yok sayılır.'),
    TR('listede_yok, isim_uyusmuyor, eslesti', 'listede_yok, isim_uyusmuyor, eslesti', 'bekleyenKayitlariEslestir (D03 liste dinleyicisi)', 'Şubenin listesi uygulanınca aynı işlemde; yalnız teyit bekleyen hesaplar. Teyitli hesabın eşleşmesi değişmez.'),
  ]),
  SM('cihaz', ['yok', 'etkin', 'degisim_bekliyor', 'kapandi'], [
    TR('yok', 'etkin', 'POST /v1/kimlik/ogrenci/kayit', 'Yeni hesap ya da inceleme hesabına ek cihaz. Satır ve anahtarları kanıttan önce geçici dogrulanamadi ile yazılır, aynı işlemde D07 sonucu yazılır.'),
    TR('yok', 'degisim_bekliyor', 'POST /v1/kimlik/ogrenci/kayit, POST /v1/kimlik/cihaz-degisimi', 'Numarada teyitli hesap var; bu cihaza bir talep açılır.'),
    TR('degisim_bekliyor', 'etkin', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/onay', 'Hoca kimliği görür ve QR değeriyle onaylar; aynı işlemde eski cihaz kapanır, hesabın öbür değişim bekleyen cihazları degisim_iptal ile kapanır.'),
    TR('degisim_bekliyor', 'kapandi', 'ret, iptal, başka talebin onayı, 72 saat, çıkış, hesap silme', 'Nedenler degisim_ret, degisim_iptal, degisim_zaman_asimi, cikis, silme.'),
    TR('etkin', 'kapandi', 'değişim onayı (eski cihaz), POST /v1/kimlik/cikis, hesap silme, teyit reddi, bekleyen_kayit_kapatma, inceleme_hesaplari_kurulumu', 'Nedenler degisim, cikis, silme, teyit_ret, bekleme_bitti, inceleme_bitti; kapanma_ani etkinlik bitişidir, açık anahtarlar kalır. Kapanmış cihaz hiçbir yoldan yeniden etkinleşmez: aynı anahtarla kayıt 409 KIMLIK_CIHAZ_KAPANDI.'),
  ]),
  SM('giris_oturumu', ['yok', 'acik', 'kapali', 'suresi_dolmus', 'silinmis'], [
    TR('yok', 'acik', 'POST /v1/kimlik/giris, öğrenci kaydı, değişim talebi', 'Personelde yalnız durum aktif kişiye (kişi satırı kilidinden sonra yeniden okunur); değişim bekleyen cihazın oturumu kapsam degisim_bekliyor ile açılır.'),
    TR('acik (degisim_bekliyor)', 'acik (tam)', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/onay', 'Aynı satırın kapsamı değişir, telefon anahtarı aynı kalır.'),
    TR('acik', 'kapali', 'çıkış, Oturumlarım, yönetici, 4. giriş, yenileme, pasif, cihaz değişimi, teyit reddi, bekleme bitti, talebin 72 saati, inceleme ayarı, olay komutu, geri yükleme', 'kapanma_nedeni yazılır, denetime düşer, kimlik olayı dinleyicilere gider.'),
    TR('acik', 'suresi_dolmus', 'saat arayüzü', 'Personel bitis_ani geçti ya da panelde son kullanımdan 1 saat geçti; satıra yazılmaz, kanca hesaplar. Öğrencide süre yok; cihazı kapanmışsa kanca 401 verir (neden cihaz_kapandi).'),
    TR('kapali, suresi_dolmus', 'silinmis', 'giris_oturumu_temizligi', 'Kapanış ya da bitişten 30 gün sonra.'),
    TR('acik, kapali, suresi_dolmus', 'silinmis', 'hesap silme', 'Aynı işlemde; oturum anahtarının özeti kalmaz.'),
  ]),
  SM('cihaz_degisim_talebi', ['bekliyor', 'onaylandi', 'reddedildi', 'iptal'], [
    TR('bekliyor', 'onaylandi', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/onay', 'Yetkili hoca, süresi geçmemiş QR değeri.'),
    TR('bekliyor', 'reddedildi', 'POST /v1/kimlik/cihaz-degisimi/{talepId}/ret', 'Yetkili hoca ya da hesabın etkin cihazı.'),
    TR('bekliyor', 'iptal', 'ret ucu (yeni cihaz), çıkış, aynı hesabın başka talebinin onayı, 72 saat (kimlik_temizligi), hesabın kapanması', 'karar_gerekcesi vazgecildi, baska_talep_onaylandi, zaman_asimi ya da hesap_kapandi. Başka cihazdan yeni talep açılması bir talebi düşürmez.'),
  ]),
  SM('hesap_silme_istegi', ['yok', 'sirada', 'yapildi', 'iptal'], [
    TR('yok', 'yapildi', 'POST /v1/kimlik/hesap-silme', 'Kişinin açık telefon oturumu yok (panel isteği), ya da tek açık telefon oturumu isteği yapan bu telefondur ve 0 bildirdi; aynı işlemde.'),
    TR('yok', 'sirada', 'POST /v1/kimlik/hesap-silme', 'Bu telefonda bekleyen öğe var ya da kişinin başka açık telefon oturumu var.'),
    TR('sirada', 'yapildi', 'POST /v1/kimlik/hesap-silme (bekleyenOgeSayisi 0), hesap_silme_yurutucu', 'Kişinin bütün açık telefon oturumları boş bildirdi ya da 7 gün doldu.'),
    TR('sirada', 'iptal', 'DELETE /v1/kimlik/hesap-silme', 'Yapılmadan önce aynı hesap vazgeçer; silme anı dış yüzlerde null olur.'),
    TR('yok', 'yapildi', 'POST /v1/kimlik/ogrenciler/{kisiId}/hesap-silme', 'Hoca yüz yüze; etkin cihaz yok, beklenecek iş yok.'),
    TR('yok', 'yapildi', 'POST /v1/kimlik/basvuru/silme', 'Pasif personel; oturumu olmadığından beklenecek telefon işi yok (kaynak kod).'),
  ]),
  SM('giris_kodu', ['acik', 'kullanildi', 'gecersiz', 'suresi_doldu', 'silinmis'], [
    TR('acik', 'kullanildi', 'giris, basvuru/dogrula, basvuru/silme', 'Doğru kod; aynı işlemde kişinin aynı amaçlı öbür açık kodları gecersiz olur. Başvuru kodu giriş formundan da kullanılabilir.'),
    TR('acik', 'gecersiz', 'yanlış deneme', 'Kişinin aday açık kodlarında ortak 3. yanlış (beklemede yalnız bekleme başladıktan sonra üretilmiş kodlar adaydır).'),
    TR('acik', 'suresi_doldu', 'saat arayüzü', '300 saniye; satıra yazılmaz.'),
    TR('kullanildi, gecersiz, suresi_doldu', 'silinmis', 'kimlik_temizligi', 'Oluşturmadan 24 saat sonra.'),
  ]),
  SM('kayit_kodu', ['acik', 'kullanildi', 'gecersiz', 'suresi_doldu', 'silinmis'], [
    TR('acik', 'kullanildi', 'POST /v1/kimlik/ogrenci/kayit', 'Doğru kod ve aynı numara; hesap teyitli açılır, numaranın öbür teyitsiz hesapları reddedilir.'),
    TR('acik', 'gecersiz', 'yanlış deneme ya da yeni kod', '5. yanlış (sayaç hata cevabından önce işlenir, geri alınmaz) ya da aynı numaraya yeni kod.'),
    TR('acik', 'suresi_doldu', 'saat arayüzü', '72 saat.'),
    TR('kullanildi, gecersiz, suresi_doldu', 'silinmis', 'kimlik_temizligi', '7 gün sonra.'),
  ]),
];

// ---------------------------------------------------------------- invariants
const invariants = [
  `D01 tablolarına yalnız D01 kodu yazar; öbür modüller okumak ve değiştirmek için dış yüzü çağırır, giris_oturumlari satırına yabancı anahtar kurmaz.`,
  `Teyitli ve silinmemiş bir öğrenci numarası en çok bir hesapta durur (ogrenci_hesaplari_ogrenci_no_uq).`,
  `Bir öğrencinin en çok bir etkin cihazı olur (inceleme cihazları hariç). Değişim bekleyen her cihazın en çok bir açık talebi olur; bir hesapta doğrulanamayan cihazlı açık talep en çok 3, her açık talep en çok 72 saat yaşar.`,
  `Bir donanım açık anahtarı en çok bir cihaz satırına, bir cihaz satırı tek hesaba bağlıdır; aynı uygulama kopyası iki hesaba bağlanamaz.`,
  `Açık anahtar satırları silinmez ve anahtar baytları değişmez; yalnız App Attest anahtarının gecersiz_ani bir kez dolar (yenilenen eski anahtarda ya da kanıtı tutmayan yeni anahtarda). Anahtar satırları D07 kanıtından önce yazılır, kanıt satırı saklanan anahtara bağlanır.`,
  `Kod, oturum anahtarı, QR değeri ve kayıt kodu açık saklanmaz: giriş, başvuru ve silme kodları giriş kodu özet anahtarıyla, kayıt kodları ayrı kayıt kodu özet anahtarıyla HMAC; oturum anahtarı ve QR değeri SHA-256 olarak durur; karşılaştırma timingSafeEqual ile sabit sürelidir.`,
  `Her gizli anahtar tek iştedir (teknik.html#sunucu-ayarlar): giris_kodu_ozeti yalnız e-posta kodlarında ve aynı işin adres sayacında (kod, adres önekleri); kayit_kodu_ozeti yalnız kayıt kodunda ve numara kilidinin anahtarında (kayit, kilit önekleri). Saat belgesi ve QR anahtarıyla paylaşılmaz. İşçi süreci ikisini de yüklemez; işçide çalışan kimlik kodu (temizlik, silme, kapatma) anahtar istemez.`,
  `Kod isteği, başvuru ve silme kodu isteği hesap durumundan bağımsız aynı gövdeyi, aynı durum kodunu ve aynı alt süreyi döner; e-posta cevaptan sonra gider ve iş kuyruğuna girmez. Beklemedeki adrese gelen deneme, kod tutmadığında aday kod olsun olmasın aynı cevabı alır.`,
  `Personel oturumu yalnız durumu aktif kişiye açılır; durum aktiften çıkınca bütün oturumları aynı işlemde kapanır. Onaydan önce giriş yoktur. Giriş durumu kişi satırı kilidinden sonra okur, bu yüzden pasif ile giriş yarışında açık oturum kalmaz.`,
  `Personel akışlarında kilit sırası tektir: kisiler satırı (varsa), eposta_giris_durumlari, giris_kodlari, giris_oturumlari. Giriş, başvuru doğrulama, oturumsuz silme, pasif, etkin, hesap silme ve yönetici kapatması bu sırayla kilitler; birbirini kilitleyip 40P01 almazlar.`,
  `Bir personelin aynı anda en çok 3 etkin oturumu vardır (inceleme hesabı hariç); sayım kişi satırının FOR UPDATE kilidiyle tek sıradadır, telefon yenilemesi sayıma girmez.`,
  `Telefon oturumu en geç 30 günde, panel oturumu en geç 24 saatte ya da 1 saat işlemsizlikte biter; kullanım bitişi uzatmaz. Öğrenci oturumunun bitişi yoktur, cihaz kapanınca ya da hesap silinince kapanır; kanca öğrenci isteğinde cihazın durumunu da okur, kapanmış cihazın oturumu 401 alır.`,
  `Kaybolan cevapta yeniden bağlama yalnız etkin ya da değişim bekleyen cihaza ve aktif hesaba olur, cihazın durumunu değiştirmez; kapanmış cihazın anahtarı hiçbir yoldan oturum alamaz (plan.html#hile: başka telefona bağlı hesabı kullanmak engellenir).`,
  `Yetkiler her istekte veritabanından okunur; kanca önbellek tutmaz, geri alınan rol ya da kapatılan oturum bir sonraki istekte düşer. Rol ve kimlik türü denetimi D13'ün rota beyanındadır (401 API_KIMLIK_GEREKLI, 403 API_ROL_YETKISIZ); yetkiDenetle yalnız yönetici kapsamını yanıtlar, kaynak sahipliği modül servisinde 404'tür.`,
  `Kural taşıyan her an D04'ün saat arayüzünden gelir; SQL now() ve Date.now() kullanılmaz, zamanlamalar Europe/Istanbul ve D14-B05 penceresine uyar.`,
  `Öğrenci numarası, isim, e-posta adresi, kod ve anahtar loga, adres satırına, iş verisine, danışma kilidi anahtarına ve denetim ayrıntısına girmez; yalnız iç kimlik ya da anahtarlı özet yazılır.`,
  `Kişi satırı fiziksel silinmez (D12-B16). Silinen hesapta e-posta, giriş kodları ve oturum satırları kalmaz; kişi satırı silindi işaretiyle, öğrencide numarasıyla kalır. Reddedilen ve kapanan öğrenci hesabında girilen isim ve cihaz ayrıntıları aynı işlemde silinir.`,
  `Son etkin tüm kapsamlı yönetici pasifleştirilemez ve yönetici rolü geri alınamaz; kendi hesabını silmesi engellenmez, kurtarma yonetici-ekle komutudur (sahibin kararı D01-A23). Yönetici rolü taşıyan hedefe yalnız rol kapsamı kendi kapsamının içinde olan yönetici dokunur.`,
  `Kayıt işleminde D03'ün paylaşımlı liste kilidi (numaraIleEslestir) numara kilidinden önce alınır; bekleyenKayitlariEslestir numara kilidi almaz, böylece liste yazımıyla kayıt arasında kilitlenme olmaz.`,
  `Kimlik olayları D09.denetimeYaz ile kimlik.<olay> türünde yazılır. Alanlar: yapan işlemi yapan kişi (oturumsuz başvuru, doğrulama ve silmede SISTEM, komutta KOMUT_SATIRI); başvuru olaylarında başvuran yalnız hedef { KISI, kisiId } alanında, ogrenciId boş; öğrenci olaylarında ogrenciId hesabın kimliği; teyit olaylarında D09'un islemId'si; hocanın yüz yüze silmesinde dersId. Geri alınmaması gereken olaylar (oturum kapatma, pasif, cihaz değişimi, hesap silme) ayrıca pino'ya yalnız iç kimlik ve olay türüyle yazılır (geri yükleme sonrası yeniden uygulama için).`,
  `Cihaz kanıtı bağlamayı engellemez, sonucu etikettir (plan.html#kararlar-cihaz-dogrulamasi). D07 REDDEDILDI dönerse bağlama yalnız D15 ayarı kimlik.kanitReddiBaglamayiEngeller açıksa reddedilir (varsayılan kapalı, sahibin kararı D01-A19); kapalıyken cihaz dogrulanamadi ile bağlanır, kanıt satırı REDDEDILDI kalır.`,
  `Kod ve başvuru isteğinde e-posta türü yalnız hesap durumundan seçilir. Kod (giris): aktif hoca ya da yönetici giriş kodu; onay_bekliyor "onay bekliyor"; kod_bekliyor yeni başvuru kodu (son başvurunun bilgileri kod satırına taşınır); pasif, reddedildi, inceleme, kayıtsız ve silinmiş hiçbir şey. Kod (basvuru_silme): kod_bekliyor, onay_bekliyor, reddedildi ve pasif oturumsuz silme kodu; öbürleri hiçbir şey. Başvuru: kayıtsız adres yeni kişi satırı ve başvuru kodu; kod_bekliyor ve reddedildi kişi satırına dokunmadan, bilgileri kod satırında taşıyan başvuru kodu; onay_bekliyor "onay bekliyor"; aktif giriş kodu; pasif ve inceleme hiçbir şey. Hepsi D14 sınırından geçer, cevap hepsinde aynıdır.`,
  `Sayısal kurallar packages/contracts/src/kimlik.ts içindeki KIMLIK_SABITLERI'nden okunur ve testler oradan içe alır: KOD_GECERLILIK_SN 300, KOD_YANLIS_SINIRI 3, BEKLEME_ILK_SN 30, BEKLEME_UST_SN 900, SABIT_CEVAP_MS 400, PERSONEL_EN_COK_OTURUM 3, TELEFON_OTURUM_GUN 30, YENILEME_ONCESI_GUN 3, PANEL_EN_UZUN_SAAT 24, PANEL_ISLEMSIZLIK_DK 60, SON_KULLANIM_YAZMA_SN 60, DEGISIM_QR_GECERLILIK_SN 900, DEGISIM_TALEBI_SAAT 72, DEGISIM_TALEBI_SINIRI 3, KAYIT_KODU_SAAT 72, KAYIT_KODU_YANLIS_SINIRI 5, BEKLEYEN_HESAP_SINIRI 5, KAYIT_NUMARA_GUNLUK_SINIRI 10, BEKLEYEN_KAPATMA_GUN 30, BEKLEYEN_KAPATMA_KILIT 2, SILME_BEKLEME_GUN 7, YAKIN_GIRIS_DK 15, OTURUM_SATIRI_SAKLAMA_GUN 30, CIHAZ_ETIKETI_EN_COK 60. Açılıp kapanan iki davranış sabit değil D15 ayarıdır: kimlik.kayitKoduAcik (KIMLIK_KAYIT_KODU_ACIK) ve kimlik.kanitReddiBaglamayiEngeller (KIMLIK_KANIT_REDDI_ENGELLER), ikisi de varsayılan false; testler ayarı değiştirerek iki yolu da koşar.`,
  `Kimlik olayı dinleyicileri olayı doğuran işlemin içinde çağrılır; bir dinleyici hata verirse işlemin tamamı geri alınır, yarım durum (kapanmış oturum ama iptal edilmemiş QR yuvası gibi) kalmaz. Dinleyiciler eklentide değil, her bileşim kökünde (app.ts, worker.ts ve her komut satırı girişi) iş başlamadan kimlikDinleyicileriniKur ile kurulur; zorunlu abonelerden (projeksiyon, isletim, esitleme) biri eksikse süreç açılmaz, olay yayan iç işlev kurulmamış kayıtla sessizce çalışmaz.`,
  `Değişim bekleyen cihazın kısıtlı oturumu kancada yalnız degisim_bekleyen rolünü taşır ve hesabın verisini görmez: /ben yalnız kendi talebinin durumunu döner, numara, teyit ve kayıt bilgisi dönmez; öbür rotaları D13'ün rol beyanı keser.`,
  `Öğrencinin teyidi, teyit reddi ve kodla teyitli kaydın öbür hesapları reddetmesi aynı işlemde D06.ogrenciDurumuDegisti çağırır; telefonun indirdiği durum sürümü ilerler.`,
];

// step order of the critical flows (html only; the JSON carries the same rules as invariants and transitions)
const akislar = [
  ['Kodla giriş', [
    `Adresi epostaNormallestir ile çevir; biçim tutmazsa 400. İstemci panel ise istek.panelden true olmalı, değilse (Origin'siz panel girişi) 403 KIMLIK_KOKEN_GECERSIZ; başka kökenli Origin'i D13 önce keser.`,
    `Kilit sırası (bütün personel akışlarında aynı): adrese ait kişi varsa kisiler satırını durumu ne olursa olsun FOR UPDATE ile kilitle; sonra eposta_giris_durumlari satırını ekle ya da FOR UPDATE ile kilitle.`,
    `Kişi aktifse amac giris, kod_bekliyor ise amac basvuru açık kodlarını yalnız kod satırlarını kilitleyerek (FOR UPDATE OF giris_kodlari) oku. Bekleme sürüyorsa yalnız bekleme_baslangic_ani'ndan sonra üretilmiş kodlar aday kalır; aday yoksa deneme sayılmadan 429. Her aday için HMAC al, timingSafeEqual ile karşılaştır; kişi yoksa ya da aday yoksa sahte bir karşılaştırma yap (iş miktarı aynı kalsın). Sabit kod yalnız inceleme_hesabi true ve adres INCELEME_HOCA_ADRESI ile aynıysa karşılaştırılır.`,
    `Yanlışsa: aday kodların yanlış sayısını artır, 3 olanları gecersiz yap. Bekleme sürmüyorsa ardışık yanlışı da artır, 3 ve üstünde beklemeyi yaz (başlangıç anı yalnız yeni bekleme başlarken), işlemi bitir, sabit alt süreden sonra KIMLIK_KOD_GECERSIZ. Bekleme sürüyorsa ardışık yanlışa ve bekleme bitişine dokunma, işlemi bitir, KIMLIK_BEKLEME_SURUYOR dön: kalan süre aday kod olmayan adresteki kadar kalır, cevap hesabın kod isteyip istemediğini sızdırmaz.`,
    `Doğru başvuru koduysa: kodu kullanıldı yap, kod satırındaki ad-soyad, birim ve bölümü kişiye yaz, kişiyi onay_bekliyor yap, bekleme satırını sil, işlemi bitir; durum onay_bekliyor döner, oturum açılmaz.`,
    `Doğru giriş koduysa: kodu kullanıldı, kişinin öbür açık giriş kodlarını gecersiz yap, bekleme satırını sil. Kilitli kişi satırında durum hâlâ aktif değilse (pasif yarışı) KIMLIK_KOD_GECERSIZ.`,
    `giris_oturumlari'nı kilitle (sıranın son adımı). Geçerli telefon Bearer anahtarı aynı kişininse eski oturumu yenilendi diye kapat; değilse ve inceleme hesabı değilse etkin oturum 3 ise en eski paneli, yoksa en eski telefonu en_eski diye kapat.`,
    `Yeni oturumu yaz (anahtarın SHA-256 özeti, D14 kümesine süzülmüş en çok 60 karakterlik etiket, bitiş), kimlik.giris_basarili (incelemede kimlik.inceleme_giris) denetimini ve olayları yaz, işlemi bitir, cevabı dön; panelde çerez yalnız istek.panelden true iken kurulur.`,
    `Cevap gittikten sonra giriş bildirimini D14.epostaGonder ile gönder (inceleme hesabında gönderme, D01-A13); söz reddedilirse (programlama hatası) ya da sonuç BASARISIZ ise ayrı işlemde kimlik.bildirim_gonderilemedi yaz.`,
  ]],
  ['Öğrenci kaydı', [
    `D03.numaraIleEslestir çağır (D03'ün paylaşımlı liste kilidi önce alınır), sonra numara kilidini D12.danismaKilidi ile al; anahtar 'kimlik.numara.' ile HMAC-SHA256(kayıt kodu özet anahtarı, 'kilit:' + numara) değerinin birleşimidir, numaranın kendisi değil.`,
    `D07.dogrulamaDegeriniTuket ile değeri amaç KAYIT (değişimde CIHAZ_DEGISIMI) olarak tüket; tutmazsa 400.`,
    `Birincil cihaz anahtarını çıkar (Android: sertifika zincirinin yaprağı node:crypto X509Certificate ile ya da açık anahtar alanı; iPhone: Secure Enclave anahtarı) ve özetini ara. Aynı numaranın hesabına bağlıysa: cihaz etkin ya da degisim_bekliyor ve hesap aktifse yeniden bağlama yolu (yeni oturum, eskisi yenilendi, cihaz durumu değişmez, değişim bekleyende yeni QR değeri); cihaz kapandi ya da hesap aktif değilse 409 KIMLIK_CIHAZ_KAPANDI. Başka numaraya bağlıysa 409 KIMLIK_CIHAZ_BAGLI.`,
    `Kayıt kodu geldiyse (kimlik.kayitKoduAcik değilse 403 KIMLIK_KAYIT_KODU_KAPALI; numarada teyitli hesap varsa 409 KIMLIK_NUMARA_TEYITLI) numaranın açık koduyla karşılaştır; yanlışsa yanlış sayısını artır, işlemi bitir (değer tüketilmiş kalır), sonra 400 KIMLIK_KAYIT_KODU_GECERSIZ. Doğru kod iki sınırı da aşar.`,
    `Numarada teyitli ve silinmemiş hesap varsa ve inceleme numarası değilse değişim talebi yoluna geç. Değilse, kodsuz kayıtta etkin cihazlı teyitsiz hesap 5 ya da son 24 saatte açılan hesap 10 ise 409 KIMLIK_COK_BEKLEYEN_HESAP. İnceleme numarası deneme dersi dışında etkin liste satırındaysa ayrıcalık verilmez, kayıt olağan yoldan yürür.`,
    `Kişi ve öğrenci hesabı (değişim yolunda yok), cihaz satırı (dogrulama_sonucu geçici dogrulanamadi) ve bütün anahtar satırlarını yaz; sonra D07.cihazKanitiniDogrula ile kanıtı ve bağlama imzasını doğrulat (cihaz_kanitlari.anahtar_id yazılmış anahtara bağlanır). Sonuç REDDEDILDI ve kimlik.kanitReddiBaglamayiEngeller açıksa 403 ve işlem geri alınır; kapalıyken dogrulanamadi ile sürer. Sonucu cihaz satırına yaz.`,
    `Değişim yolunda: sonuç dogrulandi değilse ve hesabın doğrulanamayan cihazlı açık talebi 3 ise işlemi geri al, 409 KIMLIK_COK_DEGISIM_TALEBI; değilse talebi (QR 900 saniye, talep 72 saat) aç. Kodla kayıtta: numaranın öbür teyitsiz hesaplarını numara_baskasinda ile reddet (ogrenciTeyitEt ile aynı yol, D07 ve D06 çağrıları dahil), kodu kullanıldı yap.`,
    `Tam ya da değişimde kısıtlı oturumu yaz, kimlik.ogrenci_kaydi ya da kimlik.cihaz_degisim_talebi denetimini yaz, işlemi bitir; oturum anahtarı yalnız bu cevapta döner.`,
  ]],
  ['App Attest yenileme', [
    `Değeri amaç ANAHTAR_YENILEME olarak tüket; Secure Enclave imzasını hesabın anahtarıyla doğrula, tutmazsa 400 KIMLIK_IMZA_GECERSIZ. Aynı anahtar kimliği zaten varsa var olan sonucu dön.`,
    `Etkin App Attest anahtarının gecersiz_ani ve yerine_gecen_id değerini doldur, sonra yeni anahtar satırını yaz (tekil dizin önce eskinin kapanmasını ister).`,
    `D07.cihazKanitiniDogrula (ANAHTAR_YENILEME) çağır; kanıt satırı yeni anahtara bağlanır.`,
    `Sonuç dogrulandi değilse yeni anahtarın gecersiz_ani'yi aynı işlemde doldur (tek izinli dolum) ve anahtarId null dön. Her durumda kimlik.app_attest_yenileme denetimini yaz ve işlemi bitir: başarısız yenileme de kanıt satırı ve denetimle kalır, cihaz Secure Enclave anahtarıyla sürer.`,
  ]],
  ['Cihaz değişimi onayı', [
    `Talebi FOR UPDATE ile oku; yoksa ya da hoca öğrencinin etkin liste satırı olan bir dersin hocası değilse 404.`,
    `Talep bekliyor değilse: aynı hocanın onaylanmış talebiyse 200, değilse 409. QR değerinin özeti ve bitişi tutmuyorsa 400.`,
    `Eski cihazı kapandi (degisim, kapanma_ani onay anı) yap, oturumlarını cihaz_degisimi diye kapat; yeni cihazı etkin yap, kısıtlı oturumunu tam yap; talebi onaylandi yap. Hesabın öbür açık taleplerini baska_talep_onaylandi ile iptal et, onların yeni cihazlarını ve kısıtlı oturumlarını degisim_iptal ile kapat.`,
    `D07.yenidenDegerlendir ile eski, yeni ve kapanan cihazların bekleyen kayıtlarını aynı işlemde karara bağlat; kimlik.cihaz_degisim_onay denetimini ve olayları yaz.`,
  ]],
  ['Hesap silme (hesabiSil)', [
    `Kişi satırını FOR UPDATE ile kilitle (personel kilit sırasının ilk adımı); zaten silindiyse dokunmadan dön.`,
    `Giriş kodlarını ve oturum satırlarını sil; adres bekleme satırına dokunma (yalnız HMAC taşır, kimlik_temizligi 24 saatte siler; böylece işçi ve komut süreçlerinde yol gizli anahtar istemez). Rolleri hesap_silindi diye geri al; açık değişim taleplerini iptal et.`,
    `Personelde e-postayı NULL yap (onaylanmamış başvuruda ad-soyadı da); öğrencide girilen ismi NULL yap, cihazları kapandi (silme) yapıp ayrıntılarını boşalt, ogrenci_hesaplari.silinme_ani'yi yaz.`,
    `Kişiyi silindi yap, sıradaki isteği yapildi yap, D07.yenidenDegerlendir (öğrencide), kimlik.hesap_silindi denetimi, hesap_silindi olayı (aboneler bileşim kökünde kuruludur) ve yapısal log; inceleme hocasıysa kurulum işini kuyruğa koy.`,
  ]],
];

// ---------------------------------------------------------------- exports
const X = (name, signature, purpose) => ({ name, signature, purpose });
const exportsList = [
  X('oturumDogrula', "oturumDogrula(bilgi: { tur: 'bearer' | 'cerez'; anahtar: string }, baglam: { an: Date; arkaPlan: boolean; istemci: IstemciBilgisi }): Promise<{ durum: 'gecerli'; kimlik: Kimlik } | { durum: 'gecersiz'; kod: 'KIMLIK_OTURUM_YOK' | 'KIMLIK_OTURUM_BITTI'; neden: OturumBitisNedeni | null }>",
    `Kökteki oturum kancasının D01 tarafı. Başlık ve çerez okumaz: D13'ün kök kancası köken ve Bearer kuralını uygulayıp (D13-B08: Origin'siz yazma isteğinde çerez okunmaz, Bearer varken çerez okunmaz) istek.kimlikBilgisi'ni kurar; app.ts yalnız onu, saat arayüzünün anını, X-Arka-Plan bilgisini ve D13'ün istemci bilgisini geçirir, kimlik bilgisi yoksa çağırmaz (D13 401 API_KIMLIK_GEREKLI verir). Veritabanını bileşim kökü D01 eklentisinin seçeneğiyle verir. Anahtarı SHA-256 özetiyle bulur; süreyi, hesap durumunu ve öğrencide cihazın durumunu denetler (kapanmış cihaz KIMLIK_OTURUM_BITTI, neden cihaz_kapandi). Kimlik D13'ün ortak tipidir, D01 ayrı tip tanımlamaz; D01'in istediği genişletme (D01-A14): girisOturumuId (oturumId yerine; tek başına oturum ders oturumudur), roller [{ rol, kapsamBirimId }] (değişim bekleyen kısıtlı oturumda yalnız degisim_bekleyen), oturumKapsami ve incelemeHesabi. gecersiz sonucundaki neden D13'ün 401 zarfının ayrıntısına taşınır, telefon nedeni gösterir (D01-B49). Son kullanımı ve öğrencide cihazın son görülmesini en çok dakikada bir, isteğin işleminden ayrı kendi kısa işleminde yazar; bu yazma isteği bekletmez ve hatası isteği düşürmez.`),
  X('yetkiDenetle', "yetkiDenetle(kimlik: Kimlik, rol: 'hoca' | 'yonetici', kapsam?: { birimId: BirimId | null }): boolean  // [yaprak]",
    `Saf işlev, yalnız yönetici kapsamı için: kimliğin bu rolü taşıyıp taşımadığını ve rol yönetici ise kapsamının birimi içerip içermediğini yanıtlar (kapsamBirimId NULL bütün birimleri içerir; birimId null olan hedefi yalnız tüm kapsamlı yönetici görür). D02, D04, D09 ve D10 yetkiDenetle(kisi, 'yonetici', { birimId }) biçiminde çağırır ve false'u kendi 404'üne çevirir (varlık sızmaz). Rol ve kimlik türü denetimi ile 401 ve 403 kodları D13'ün rota beyanındadır (API_KIMLIK_GEREKLI, API_ROL_YETKISIZ); D13 bu işlevi çağırmaz. Kaynak düzeyi (bu dersin hocası mı) modül servisindedir; D02.dersYetkisi kapsamı aynı Kimlik nesnesinin roller alanından okur.`),
  X('kisiGetir', 'kisiGetir(tx: Tx, kisiId: KisiId): Promise<{ kisiId: KisiId; tur: KisiTuru; durum: HesapDurumu; adSoyad: string | null; birimId: BirimId | null; bolumId: BolumId | null; incelemeHesabi: boolean; silinmeAni: Date | null } | null>  // [yaprak]',
    `Kişinin özeti; e-posta dönmez. D02 ders yükündeki hoca adı ve sahipsiz ders görünümü (silinmeAni), D10 raporları ve denetim ekranları için.`),
  X('personelRolleri', "personelRolleri(tx: Tx, kisiId: KisiId): Promise<ReadonlyArray<{ rol: 'hoca' | 'yonetici'; kapsamBirimId: BirimId | null; verilmeAni: Date }>>  // [yaprak]",
    'Etkin roller; geri alınanlar dönmez.'),
  X('ogrenciHesabiGetir', 'ogrenciHesabiGetir(tx: Tx, anahtar: { kisiId: KisiId }): Promise<OgrenciHesabi | null>; ogrenciHesabiGetir(tx: Tx, anahtar: { numara: string } | { numaralar: ReadonlyArray<string> } | { kisiIdler: ReadonlyArray<KisiId> }): Promise<ReadonlyArray<OgrenciHesabi>>  // [yaprak]',
    `OgrenciHesabi = { kisiId, ogrenciNo, durum, teyitDurumu, teyitYolu, teyitAni, teyitEdenKisiId, eslesmeDurumu, girilenAdSoyad (yalnız teyit_durumu bekliyor iken, öbür durumlarda null; yalnız hoca ekranlarına döner, loga ve denetime girmez), topluTeyitEngeli (null | isim_uyusmuyor | listede_yok | cihaz_dogrulanmadi | ayni_numara; ogrenciTeyitEt'in toplu kuralıyla aynı saf işlevden, packages/core/src/kimlik/teyit.ts), incelemeHesabi, etkinCihaz: { cihazId, dogrulandi, ikinciProfil } | null, acikDegisimTalepleri: [{ talepId, yeniCihazId, olusturmaAni }], silmeIstegiAni (yalnız istek sirada ya da yapildi iken), silinmeAni, olusturmaAni }. Numarayla sorgu silinmişler dahil bütün hesapları döner (numara listede kalıcı kimliktir). kisiIdler biçimi D05'in oturum kayıt listesi için tek sorguda toplu okumadır (D05 açık noktası 5). D03 liste ekranı, D05, D08 ve D10 toplama, D09 teyit grupları buradan okur.`),
  X('cihazGetir', "cihazGetir(tx: Tx, cihazId: CihazId): Promise<{ cihazId: CihazId; kisiId: KisiId; durum: 'etkin' | 'degisim_bekliyor' | 'kapandi'; platform: 'android' | 'ios'; incelemeCihazi: boolean; dogrulamaSonucu: 'dogrulandi' | 'dogrulanamadi'; isSystemUser: boolean | null; model: string | null; etkinlesmeAni: Date | null; kapanmaAni: Date | null; kapanmaNedeni: CihazKapanmaNedeni | null; bekleyenDegisimTalebi: { talepId: TalepId; olusturmaAni: Date } | null; hesapSilmeIstegiAni: Date | null } | null>  // [yaprak]",
    `D05 imza yolunda ve D07 kararında cihazın durumu, etkinlik bitişi, ikinci profil ve doğrulama özeti için. hesapSilmeIstegiAni yalnız hesabın sirada ya da yapildi silme isteğinin istek_ani'sidir; istek iptal edilince null döner, böylece vazgeçen öğrencinin sonraki kayıtları D07'de reddedilmez.`),
  X('cihazAnahtariGetir', "cihazAnahtariGetir(tx: Tx, anahtarId: CihazAnahtariId): Promise<{ anahtarId: CihazAnahtariId; cihazId: CihazId; kisiId: KisiId; tur: 'android_p256' | 'app_attest' | 'secure_enclave'; acikAnahtar: Uint8Array; appAttestAnahtarKimligi: Uint8Array | null; olusturmaAni: Date; gecersizAni: Date | null } | null>  // [yaprak]",
    'Kayıt metnindeki anahtar kimliğiyle açık anahtar; kapanmış cihazın ve yenilenmiş anahtarın satırı da döner (kanıt).'),
  X('cihazDogrulamaSonucunuYaz', "cihazDogrulamaSonucunuYaz(tx: Tx, cihazId: CihazId, sonuc: { sonuc: 'dogrulandi' | 'dogrulanamadi'; kanitId: string; guvenlikDuzeyi: string | null; dogrulanmisAcilis: boolean | null; iosAcilisDogrulamaTuru: string | null; iosPaketSurumu: string | null; neden: 'iptal_listesi' | 'yeniden_dogrulama' }): Promise<void>",
    `D07'nin sonradan değişen doğrulama sonucunu (iptal listesi gibi) cihaz satırına D01 yazar; değişiklik kimlik.cihaz_dogrulama_degisti olarak denetime düşer. Geçmiş kayıtların etiketi değişmez (D07). Kayıt anındaki ilk sonucu D01 kendi kayıt işleminde yazar.`),
  X('ogrenciTeyitEt', "ogrenciTeyitEt(tx: Tx, istek: { yapan: Kimlik; ogrenciKisiId: KisiId; yol: 'toplu' | 'tek'; islemId?: string }): Promise<{ sonuc: 'teyitli' | 'zaten_teyitli' | 'tek_tek_gerekli' | 'numara_teyitli' | 'bulunamadi'; reddedilenHesaplar: ReadonlyArray<KisiId> }>",
    `D09'un teyit ucu öğe başına kendi SAVEPOINT'inde çağırır. Yetkiyi (öğrencinin etkin liste satırı olan dersin hocası), toplu yol kuralını (topluTeyitEngeli ile aynı saf işlev) ve tekil numarayı D01 denetler; aynı numaranın öbür teyitsiz hesaplarını numara_baskasinda ile reddeder (girilen isim ve cihaz ayrıntıları silinir), aynı işlemde D07.yenidenDegerlendir ve D06.ogrenciDurumuDegisti çağırır (modules/esitleme/yaprak.ts, dosya döngüsü kurmaz) ve kimlik.teyit yazar; islemId verildiyse olayın islemId alanına yazılır. D09 kendi duzeltmeler.teyit_karari olayını ayrıca yazar: kimlik olayı hesabın durum değişikliğidir, D09 olayı teyit ekranındaki işin tekrar denetimidir.`),
  X('ogrenciTeyidiniReddet', "ogrenciTeyidiniReddet(tx: Tx, istek: { yapan: Kimlik; ogrenciKisiId: KisiId; gerekceKodu: 'bu_ogrenci_degil' | 'diger'; islemId?: string }): Promise<{ sonuc: 'reddedildi' | 'zaten_reddedildi' | 'teyitli_hesap' | 'bulunamadi' }>",
    `Teyit bekleyen hesabı reddeder: hesap ve teyit reddedildi, cihaz ve oturum kapanır, açık talepler iptal olur, girilen isim ve cihaz ayrıntıları silinir, D07.yenidenDegerlendir ve D06.ogrenciDurumuDegisti çağrılır, kimlik.teyit_ret yazılır (islemId ile).`),
  X('bekleyenKayitlariEslestir', 'bekleyenKayitlariEslestir(tx: Tx, subeId: SubeId): Promise<{ degisenHesaplar: ReadonlyArray<KisiId> }>',
    `D03'e listeDegisikligiDinleyicisiKaydet ile kaydolur; liste uygulanırken D03'ün dışlayıcı kilidi altında, aynı işlemde şubenin etkin ve pasif satırlarındaki numaralara sahip teyit bekleyen hesapların eşleşmesini D03.numaraIleEslestir ile yeniler (çıkarılan öğrenci listede_yok'a da dönebilir). Numara kilidi almaz.`),
  X('kimlikDinleyicileriniKur', "kimlikDinleyicileriniKur(aboneler: { projeksiyon: KimlikDinleyicisi; isletim: KimlikDinleyicisi; esitleme: KimlikDinleyicisi }): void; kimlikDinleyicileriHazir(): void; type KimlikDinleyicisi = (tx: Tx, olay: KimlikOlayi) => Promise<void>; type KimlikOlayi = { tur: 'giris_oturumu_kapandi'; girisOturumuId: GirisOturumuId; kisiId: KisiId; neden: OturumBitisNedeni; an: Date } | { tur: 'giris_oturumu_yenilendi'; eskiId: GirisOturumuId; yeniId: GirisOturumuId; kisiId: KisiId; an: Date } | { tur: 'cihaz_kapandi'; cihazId: CihazId; kisiId: KisiId; neden: CihazKapanmaNedeni; an: Date } | { tur: 'hesap_durumu_degisti'; kisiId: KisiId; eski: HesapDurumu; yeni: HesapDurumu; an: Date } | { tur: 'hesap_silindi'; kisiId: KisiId; kisiTuru: KisiTuru; an: Date }",
    `Ek dış yüz (D01-A14), eski kimlikOlayiDinleyicisiKaydet'in yerine. Kayıt eklentiden ayrıldı, çünkü D01 olayları işçiden (hesap_silme_yurutucu, bekleyen_kayit_kapatma, kimlik_temizligi) ve komut süreçlerinden (D15 anahtar-uret oturumlari-kapat, D12 geri yükleme) de doğar ve oralarda eklenti yüklenmez. Her bileşim kökü (app.ts D13, worker.ts D14, D15 ve D12 komut girişleri, D01'in yonetici-ekle komutu) iş başlamadan bir kez çağırır ve aboneleri adıyla verir: projeksiyon D11 (QR anahtar yuvasını iptal eder ya da yenilenen oturuma devreder), isletim D15 (telefon sayaçları ve ekran süreleri), esitleme D06 (hesap silinince kurulum izleri). Abone modüller kendi dinleyici işlevini dışa verir, eklentilerinde kaydolmaz; D01 onları içe aktarmaz. Tip üç adı zorunlu kılar; kimlikDinleyicileriHazir() kayıt kurulmamışsa ya da bir abone eksikse KIMLIK_DINLEYICI_EKSIK fırlatır ve bileşim kökü açılışta bunu çağırdığı için süreç açılmaz. Olay yayan iç işlev de aynı denetimi yapar. Dinleyiciler olayı doğuran işlemin içinde çağrılır.`),
  X('oturumlariKapat', "oturumlariKapat(tx: Tx, suzgec: { kisiId?: KisiId; tur?: KisiTuru; istemci?: 'telefon' | 'panel' }, neden: 'olay_komutu' | 'geri_yukleme'): Promise<number>",
    `Ek dış yüz (D01-A14): D15'in olay müdahalesindeki bütün hoca oturumlarını kapatma komutu ve D12'nin geri yüklemeden sonra panel oturumlarını kapatma adımı için; kapatılan sayıyı döner, her oturum için olay ve denetim yazar. Komut süreci kimlikDinleyicileriniKur'dan önce çağıramaz (kimlikDinleyicileriHazir fırlatır); böylece olay komutunda D11 QR yuvaları aynı işlemde iptal olur.`),
  X('girisOturumuGetir', "girisOturumuGetir(tx: Tx, girisOturumuId: GirisOturumuId): Promise<{ girisOturumuId: GirisOturumuId; kisiId: KisiId; tur: KisiTuru; istemci: 'telefon' | 'panel'; olusturmaAni: Date; bitisAni: Date | null; kapanmaAni: Date | null; kapanmaNedeni: OturumBitisNedeni | null; oncekiOturumId: GirisOturumuId | null } | null>  // [yaprak]",
    'Ek dış yüz (D01-A14): hoca telefonunun kimliği giriş oturumu olduğundan D04 saat belgesi öznesi ve D11 QR yuvası için. Silinmiş satırda null.'),
  X('hesabiSil', "hesabiSil(tx: Tx, istek: { kisiId: KisiId; kaynak: 'geri_yukleme_yeniden' }): Promise<'yapildi' | 'zaten_silinmis'>",
    `Ek dış yüz (D01-A14): D12'nin geri yükleme komutu, kayıp penceredeki hesap silmeyi yapısal logdan yeniden uygularken çağırır; uçların ve gecelik işin kullandığı iç işlevle aynıdır. Gizli anahtar istemez (adres bekleme satırına dokunmaz), komut süreci kimlikDinleyicileriniKur'dan sonra çağırır.`),
  X('epostaNormallestir', "epostaNormallestir(ham: string): { tamam: true; adres: string } | { tamam: false } (packages/core/src/kimlik/eposta.ts)",
    `Tek adres kuralı: baş ve son boşluk silinir, İ, I ve ı açık eşlemeyle i olur (toLowerCase'in İ için ürettiği birleşen nokta oluşmaz), A ile Z küçültülür; alan adı tam olarak istanbul.edu.tr, yerel kısım yalnız a-z, 0-9, nokta, alt çizgi, tire (1 ile 64), + ve ardışık nokta yok. D14 sınır özeti, telefon ve panel aynı işlevi kullanır.`),
];

// ---------------------------------------------------------------- files
const files = [
  'apps/server/src/modules/kimlik/index.ts',
  'apps/server/src/modules/kimlik/yaprak.ts',
  'apps/server/src/modules/kimlik/eklenti.ts',
  'apps/server/src/modules/kimlik/tablolar.ts',
  'apps/server/src/modules/kimlik/sorgular.ts',
  'apps/server/src/modules/kimlik/kanca.ts',
  'apps/server/src/modules/kimlik/yetki.ts',
  'apps/server/src/modules/kimlik/ozetler.ts',
  'apps/server/src/modules/kimlik/sabit-sure.ts',
  'apps/server/src/modules/kimlik/eposta-yolu.ts',
  'apps/server/src/modules/kimlik/giris-servisi.ts',
  'apps/server/src/modules/kimlik/oturum-servisi.ts',
  'apps/server/src/modules/kimlik/basvuru-servisi.ts',
  'apps/server/src/modules/kimlik/ogrenci-servisi.ts',
  'apps/server/src/modules/kimlik/teyit-servisi.ts',
  'apps/server/src/modules/kimlik/cihaz-servisi.ts',
  'apps/server/src/modules/kimlik/degisim-servisi.ts',
  'apps/server/src/modules/kimlik/silme-servisi.ts',
  'apps/server/src/modules/kimlik/yonetim-servisi.ts',
  'apps/server/src/modules/kimlik/inceleme.ts',
  'apps/server/src/modules/kimlik/olaylar.ts',
  'apps/server/src/modules/kimlik/uclar.ts',
  'apps/server/src/modules/kimlik/kanca.test.ts',
  'apps/server/src/modules/kimlik/ozetler.test.ts',
  'apps/server/src/modules/kimlik/yetki.test.ts',
  'apps/server/src/modules/kimlik/olaylar.test.ts',
  'apps/server/src/modules/kimlik/sinirlar.test.ts',
  'apps/server/src/jobs/kimlik/index.ts',
  'apps/server/src/jobs/kimlik/kimlik-temizligi.ts',
  'apps/server/src/jobs/kimlik/giris-oturumu-temizligi.ts',
  'apps/server/src/jobs/kimlik/hesap-silme-yurutucu.ts',
  'apps/server/src/jobs/kimlik/inceleme-hesaplari-kurulumu.ts',
  'apps/server/src/jobs/kimlik/bekleyen-kayit-kapatma.ts',
  'apps/server/src/jobs/kimlik/zamanlama.test.ts',
  'apps/server/src/cli/yonetici-ekle.ts',
  'packages/contracts/src/kimlik.ts',
  'packages/core/src/kimlik/index.ts',
  'packages/core/src/kimlik/eposta.ts',
  'packages/core/src/kimlik/eposta.test.ts',
  'packages/core/src/kimlik/bekleme.ts',
  'packages/core/src/kimlik/bekleme.test.ts',
  'packages/core/src/kimlik/oturum-kurallari.ts',
  'packages/core/src/kimlik/oturum-kurallari.test.ts',
  'packages/core/src/kimlik/cihaz-etiketi.ts',
  'packages/core/src/kimlik/cihaz-etiketi.test.ts',
  'packages/core/src/kimlik/kayit-kodu.ts',
  'packages/core/src/kimlik/kayit-kodu.test.ts',
  'packages/core/src/kimlik/teyit.ts',
  'packages/core/src/kimlik/teyit.test.ts',
  'apps/server/test/features/kimlik/hoca-basvurusu.feature',
  'apps/server/test/features/kimlik/hoca-girisi.feature',
  'apps/server/test/features/kimlik/oturumlar.feature',
  'apps/server/test/features/kimlik/kanca.feature',
  'apps/server/test/features/kimlik/yetki.feature',
  'apps/server/test/features/kimlik/ogrenci-kaydi.feature',
  'apps/server/test/features/kimlik/kayit-kodu.feature',
  'apps/server/test/features/kimlik/ilk-kayit-teyidi.feature',
  'apps/server/test/features/kimlik/cihaz-degisimi.feature',
  'apps/server/test/features/kimlik/app-attest-yenileme.feature',
  'apps/server/test/features/kimlik/hesap-silme.feature',
  'apps/server/test/features/kimlik/yonetim.feature',
  'apps/server/test/features/kimlik/inceleme-hesaplari.feature',
  'apps/server/test/features/kimlik/ilk-yonetici.feature',
  'apps/server/test/features/kimlik/kimlik-isleri.feature',
  'apps/server/test/features/kimlik/bilesim.feature',
  'apps/server/test/features/kimlik/eszamanlilik.feature',
  'apps/server/test/features/kimlik/gizlilik.feature',
  'apps/server/test/steps/kimlik/giris.steps.ts',
  'apps/server/test/steps/kimlik/ogrenci.steps.ts',
  'apps/server/test/steps/kimlik/cihaz.steps.ts',
  'apps/server/test/steps/kimlik/yonetim.steps.ts',
  'apps/server/test/steps/kimlik/silme.steps.ts',
  'apps/server/test/steps/kimlik/isler.steps.ts',
  'apps/server/test/steps/kimlik/bilesim.steps.ts',
  'apps/server/test/support/kurucular/kimlik.ts',
  'docker/caddy/sayfalar/hesap-silme.html',
];

// ---------------------------------------------------------------- tests
const TT = (name, kind, asserts) => ({ name, kind, asserts });
const tests = [
  TT('Kod isteği her durumda aynı cevabı verir', 'behavior', 'Aktif, onay bekleyen, kod bekleyen, pasif, reddedilmiş, kayıtsız, silinmiş ve inceleme adresleri için gövde, durum kodu ve bekleticiye verilen hedef süre aynı. Sahte postaya yalnız aktif hocaya kod, onay bekleyene "onay bekliyor", kod bekleyene başvuru kodu düşer; amac basvuru_silme ile pasif hesaba silme kodu düşer, aktif hesaba düşmez; pozitif kontrol: aktif hocanın kodu gerçekten gelir ve girişte işler.'),
  TT('Adres başına gönderim sınırı sessiz kalır', 'behavior', `Aynı adrese 60 saniye içinde ikinci istekte cevap aynı, ikinci e-posta yok ve giris_kodlari'na satır eklenmez; sahte saat 61. saniyeye geçince yeni kod gelir.`),
  TT('Kod 5 dakika geçerli ve tek kullanımlık', 'behavior', 'Sahte saatle 299. saniyede giriş olur, 301. saniyede KIMLIK_KOD_GECERSIZ; kullanılmış kod ikinci kez KIMLIK_KOD_GECERSIZ. Değerler KOD_GECERLILIK_SN sabitinden içe alınır.'),
  TT('Üç yanlış denemede adresin açık kodları düşer', 'behavior', 'İki açık kod varken 3 yanlıştan sonra iki kod da gecersiz, doğru kod da reddedilir; inceleme hocasının sabit kodu 3 yanlışta düşmez.'),
  TT('Ardışık yanlışta bekleme uzar ve kendiliğinden kalkar', 'behavior', '3. yanlıştan sonra 30, sonra 60, 120 saniye, en çok 900 saniye; bekleme sırasında aday kod yokken gelen deneme sayılmaz ve KIMLIK_BEKLEME_SURUYOR ile beklemeSaniye alır; sahte saat ilerleyince kalkar. Kayıtsız adreste aynı adımlar ve aynı cevaplar görülür (varlık sızmaz).'),
  TT('Bekleme yabancıyı durdurur, sahibin yeni kodunu durdurmaz', 'behavior', 'Adresi bilen saldırgan her bekleme bitişinde bir yanlış kodla adresi 900 saniyelik beklemede tutar; sahip bu sırada yeni kod ister ve onunla girer (oturum açılır). Bekleme başlamadan önce üretilmiş kod beklemede 429 alır; yeni koda gelen yanlış deneme 429 döner, kalan bekleme değişmez (aday kodu olmayan kayıtsız adresle aynı cevap ve aynı kalan süre) ama kodun 3 yanlış hakkından düşer. Ground control: saldırgan yokken aynı akış beklemesiz geçer. Seçenek kararı D01-A24.'),
  TT('Onaydan önce giriş yok', 'behavior', `kod_bekliyor, onay_bekliyor, reddedildi ve pasif hesaplar giriş yapamaz, giris_oturumlari'na satır yazılmaz; ground control: aynı adımlar aktif hesapta oturum açar.`),
  TT('Başvuru kodu giriş formunda da doğrular', 'behavior', 'Doğrulamamış başvuru sahibi giriş ekranından kod ister, gelen başvuru kodunu giriş formuna yazar: cevap durum onay_bekliyor, oturum yok, hesap onay_bekliyor; aynı kodu ikinci kez yazmak KIMLIK_KOD_GECERSIZ.'),
  TT('Telefon oturumu 30 günde biter, kullanımla uzamaz', 'behavior', 'Her gün istek atılsa da 30. günün sonunda KIMLIK_OTURUM_BITTI (neden suresi_doldu); 29. günde geçerli.'),
  TT('Panel oturumu 1 saat işlemsizlikte ve 24 saatte biter', 'behavior', 'X-Arka-Plan: 1 istekleri son kullanımı ilerletmez ve 61. dakikada oturum biter; kullanıcı isteği ilerletir; sürekli kullanımda da 24. saatte biter.'),
  TT('Dördüncü girişte önce en eski panel oturumu kapanır', 'behavior', `1 telefon ve 2 panel varken 4. giriş oluşturma anına göre en eski paneli kapatır, panel yoksa en eski telefonu; bildirim e-postası kapanan oturumun etiketini yazar; pozitif kontrol: 3. girişte hiçbir oturum kapanmaz; eşzamanlı iki girişte etkin oturum sayısı 3'ü geçmez.`),
  TT('Telefon yenilemesi kendi oturumunun yerine geçer', 'behavior', 'Geçerli Bearer ile kodla giriş eski oturumu yenilendi diye kapatır, panel oturumları kapanmaz, bildirimde kapanan oturum satırı yok, dinleyici giris_oturumu_yenilendi olayını eski ve yeni kimlikle alır.'),
  TT('Bildirim e-postası gidemezse giriş geri alınmaz', 'behavior', 'Sahte posta BASARISIZ dönünce ve sahte gönderici sözü reddedince (programlama hatası) oturum geçerli kalır, iki durumda da kimlik.bildirim_gonderilemedi denetim satırı yazılır, oturum Oturumlarım listesinde görünür.'),
  TT('Oturumlarım yalnız kendi oturumlarını gösterir ve kapatır', 'behavior', 'Başka hocanın oturum kimliğiyle DELETE 404 ve o oturum açık kalır; kapatılan kendi oturumuyla sonraki istek 401 KIMLIK_OTURUM_BITTI, zarfın ayrıntısında neden kendisi_kapatti.'),
  TT('Gerçek kanca köken ve çerez kuralını uygular', 'behavior', `D13'ün app.ts bileşimiyle gerçek D01 eklentisi ve kancası (sahte oturumDogrula yok): geçerli panel çereziyle Origin'siz POST 401 API_KIMLIK_GEREKLI ve oturumDogrula çağrılmaz; aynı istek panel Origin'iyle 200; Origin'siz GET aynı çerezle 200; Bearer ve çerez birlikte gelince Bearer'ın kişisi kullanılır. Çerez adı CEREZLER sabitinden içe alınır. Kapatılmış oturumun 401 zarfı neden alanını taşır.`),
  TT('Yönetici oturumları kapatır, pasif hesabın oturumları biter', 'behavior', 'Kapatma ve pasiften sonra sonraki istek 401 (neden yonetici ya da pasif); pasif adrese kod e-postası gitmez ama cevap aynı.'),
  TT('Hoca başvurusu, doğrulama, onay ve ret', 'behavior', `Başvuru onay_bekliyor'a düşer, onaylanan hoca girer ve hoca rolü taşır, reddedilen giremez; aynı adresle yeniden başvuruda yönetici listesinde sonRetAni dolu görünür.`),
  TT('Doğrulanmamış ikinci başvuru kişi satırını değiştirmez', 'behavior', 'kod_bekliyor ve reddedildi adrese başka ad-soyad, birim ve bölümle yeni başvuru: kisiler satırı ve durum aynı kalır (reddedildi yönetici listesinde eski bilgilerle durur); bu başvurunun kodu doğrulanınca kişi satırı yeni bilgileri alır ve onay_bekliyor olur. Ground control: kayıtsız adreste ilk başvuru kişi satırını bilgileriyle açar.'),
  TT('Kapsamlı yönetici kapsamı dışını göremez', 'behavior', 'Birim kapsamlı yönetici başka birimin başvurusunu listede görmez, onay isteği 404 alır; tüm kapsamlı yönetici aynı işi yapar (ground control).'),
  TT('Yönetici hedefinde rol kapsamı geçerli', 'behavior', `Birimi A biriminde olan tüm kapsamlı yöneticiye A kapsamlı yönetici pasif, etkin ve oturumlari-kapat isteğinde 404 alır ve hedef değişmez; tüm kapsamlı yönetici aynı işleri yapar. Tüm kapsamlı yöneticiye POST /v1/kimlik/yonetim/yoneticiler ile birim kapsamı istemek 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL ve rol değişmez; önce DELETE (son yönetici koruması), sonra ekleme işler. Kapsamlı yöneticinin tüm kapsamlı yönetici ekleme isteği 403 KIMLIK_KAPSAM_YETERSIZ.`),
  TT('Son tüm kapsamlı yönetici korunur', 'behavior', 'Tek tüm yönetici varken pasif ve rol geri alma KIMLIK_SON_YONETICI (409); ikinci tüm yönetici eklenince ikisi de izinli.'),
  TT('Hoca rolü yönetici ucundan verilir ve alınır', 'behavior', 'POST /v1/kimlik/yonetim/yoneticiler ile açılan yönetici rol hoca ile hoca rolü alır ve D02 ders oluşturma ucu 201 döner; rol hoca ile DELETE sonrası aynı uç 403 API_ROL_YETKISIZ. Ground control: hoca rolü verilmeden ders oluşturma 403.'),
  TT('Rol geri alınınca açık oturumda yetki hemen düşer', 'behavior', 'Yönetici rolü alınan kişinin aynı oturumla sonraki yönetim isteği D13 rol beyanından 403 API_ROL_YETKISIZ; hoca uçları çalışmaya devam eder (pozitif kontrol).'),
  TT('Öğrenci kaydında eşleşme durumları', 'behavior', 'Numara ve isim listedeyse eslesti; IŞIK ile ışık eslesti; Sahin ile Şahin isim_uyusmuyor; listede yoksa listede_yok; şubeye liste uygulanınca bekleyenKayitlariEslestir listede_yok hesabı eslesti yapar.'),
  TT('Teyitli numaraya gelen kayıt değişim talebine döner', 'behavior', 'Yeni hesap açılmaz; cevap degisim_bekliyor, talep ve kısıtlı oturum döner; kısıtlı oturum ogrenci rolü isteyen rotada (indirme, hesap silme) D13 rol beyanından 403 API_ROL_YETKISIZ alır, /ben ve /cikis çalışır.'),
  TT('Aynı numarada iki teyitsiz hesap: biri teyit edilince öbürü reddedilir', 'behavior', 'İkisi de toplu yolda tek_tek_gerekli alır; biri tek yolla teyitli olur, öbürü reddedildi (numara_baskasinda), cihazı kapandi, oturumu kapalı, girilen ismi NULL; D07.yenidenDegerlendir iki hesap için, D06.ogrenciDurumuDegisti iki hesap için çağrılır.'),
  TT('Teyit yetkisi yalnız öğrencinin dersinin hocasında', 'behavior', 'Öğrencinin hiçbir etkin liste satırının dersini vermeyen hoca bulunamadi alır, hesap değişmez; liste satırı pasif olan dersin hocası da alamaz.'),
  TT('Teyit ekranının verisi', 'behavior', `ogrenciHesabiGetir teyit bekleyen hesapta girilenAdSoyad ve topluTeyitEngeli döner (isim_uyusmuyor, cihaz_dogrulanmadi, ayni_numara), teyitli hesapta girilenAdSoyad null; islemId ile teyit kimlik.teyit satırına islemId yazar; kisiIdler ile toplu sorgu tek sorguda bütün hesapları döner. Pino çıktısında girilen isim yok.`),
  TT('Doğrulanmamış cihaz toplu teyide girmez', 'behavior', 'dogrulanamadi cihazlı ve isim_uyusmuyor hesap toplu yolda tek_tek_gerekli, tek yolda teyitli olur.'),
  TT('Aynı donanım anahtarı ikinci hesaba bağlanamaz', 'behavior', 'Aynı açık anahtarla başka numarayla kayıt KIMLIK_CIHAZ_BAGLI; aynı numarayla yeniden kayıt (kaybolan cevap) etkin cihazda aynı kisiId ve yeni oturum anahtarı döner, önceki oturum yenilendi kapanır, cihaz durumu değişmez.'),
  TT('Kapanmış cihazın anahtarı oturum alamaz', 'behavior', `Değişimle kapanan eski telefon kendi anahtarı ve numarasıyla yeniden kayıt ister: 409 KIMLIK_CIHAZ_KAPANDI, giris_oturumlari'na satır yazılmaz, cihaz kapandi kalır; çıkışla kapanan cihazda da aynı. Kapanmış cihazın kalmış oturumuyla istek 401 KIMLIK_OTURUM_BITTI (neden cihaz_kapandi). Pozitif kontrol: etkin cihazda kaybolan cevap tekrarı aynı kisiId'yi döner; değişim bekleyen cihazda yeni QR değeri döner.`),
  TT('Kayıt ve değişimde kanıt satırı saklanan anahtara bağlanır', 'behavior', `Android ve iPhone kaydında, değişim talebinde ve App Attest yenilemesinde: işlemden sonra her cihaz_kanitlari satırının anahtar_id'si cihaz_anahtarlari'ndaki gerçek satırı gösterir ve cihazlar.dogrulama_sonucu kanıtın sonucuyla aynı; yabancı anahtar ihlali yok. Mutasyon: anahtar satırı kanıttan sonra yazılırsa senaryo kırmızı olur.`),
  TT('Kanıt reddi ayara bağlı', 'behavior', 'kimlik.kanitReddiBaglamayiEngeller kapalı (varsayılan): sahte doğrulayıcı REDDEDILDI dönünce hesap ve cihaz açılır, dogrulama_sonucu dogrulanamadi, kanıt satırı REDDEDILDI. Ayar açık: 403 KIMLIK_CIHAZ_KANITI_REDDEDILDI ve hiçbir satır kalmaz. İki ayarda da DOGRULANAMADI dönen kanıt etiketle bağlanır (ground control).'),
  TT('Cihaz değişimi onayı tek işlemdir', 'behavior', 'Onayda eski cihaz kapandi (degisim) ve kapanma_ani onay anı, eski oturum kapalı, yeni cihaz etkin, kısıtlı oturum tam olur, D07.yenidenDegerlendir çağrılır; yanlış QR değeri KIMLIK_DEGER_GECERSIZ, süresi geçmiş değer de; aynı onayın tekrarı 200; yetkisiz hoca 404.'),
  TT('Başka cihazdan talep gerçek talebi düşürmez', 'behavior', 'A telefonu talep açar; B telefonu aynı numarayla talep açar: A talebi bekliyor, A kısıtlı oturumu açık kalır. Hoca A QR değerini onaylar: A etkin, B talebi iptal (baska_talep_onaylandi), B cihazı ve oturumu kapalı (degisim_iptal). Dogrulanamadi cihazla 4. açık talep 409 KIMLIK_COK_DEGISIM_TALEBI ve yeni cihaz satırı kalmaz; doğrulanmış cihazın talebi sınıra takılmaz. 72. saatte kimlik_temizligi açık talebi zaman_asimi ile iptal eder, kısıtlı oturum 401 (neden degisim_zaman_asimi).'),
  TT('Değişim talebini hesabın etkin cihazı reddeder', 'behavior', `Etkin cihazın oturumuyla /ben açık talepleri listeler, ret talebi reddedildi yapar, yeni cihaz kapanır, eski cihaz etkin kalır; başka öğrencinin oturumu 404 alır.`),
  TT('Öğrenci çıkışı cihazı kapatır', 'behavior', 'bekleyenOgeSayisi 0 ile cihaz kapandi (cikis) ve oturum kapalı; 3 ile 409 KIMLIK_GONDERILMEMIS_KAYIT_VAR ve hiçbir şey değişmez.'),
  TT('Teyitsiz hesapta çıkış ve yeniden kayıt tek hesap bırakır', 'behavior', `Teyit bekleyen öğrenci çıkış yapar: hesap kapandi (cikis), girilen isim NULL; aynı numarayla yeniden kayıt yeni hesap açar. Numaranın teyitsiz ve etkin cihazlı hesabı bir tanedir, D09 aynı numara grubuna düşmez, hoca yeni hesabı toplu yolda teyit edebilir.`),
  TT('App Attest anahtarı yenilenir, eski anahtar kalır', 'behavior', 'Doğru Secure Enclave imzasıyla yeni anahtar eklenir, eskisinin gecersiz_ani dolar, cihazAnahtariGetir ikisini de döner; yanlış imza KIMLIK_IMZA_GECERSIZ; aynı anahtar kimliği tekrarında aynı anahtarId.'),
  TT('App Attest yenilemesi doğrulanamazsa iz kalır', 'behavior', `Sahte doğrulayıcı DOGRULANAMADI dönünce cevap 200, anahtarId null; yeni anahtar satırı gecersiz_ani dolu olarak durur, D07 kanıt satırı ona bağlı, kimlik.app_attest_yenileme denetimi yazılı, cihaz Secure Enclave ile kayıt göndermeye devam eder. Android cihazdan istek 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL.`),
  TT('Hesap silme: bekleyen iş yoksa hemen, varsa sırada', 'behavior', 'Öğrenci 0 ile silindi: oturum satırı yok, girilen isim NULL, cihaz kapandi ve model, sürüm, son görülme NULL, açık anahtarlar ve numara duruyor; 2 ile sirada, sonra 0 ile yapildi; dokunulmayan istek 7. günün gecesi işle yapılır; iptal sıradakini kaldırır.'),
  TT('İki telefonlu hocanın silmesi öbür telefonu bekler', 'behavior', 'Hocanın A ve B telefon oturumu açık: A 0 bildirir, istek sirada kalır (bekleyenTelefonSayisi 1); B 0 bildirince aynı işlemde yapildi. B oturumu bildirmeden kapanırsa gecelik iş isteği yürütür. Ground control: tek telefonlu hocada 0 bildirimi hemen siler.'),
  TT('Silme isteği iptalinden sonra kayıt sayılır', 'behavior', 'Öğrenci silme ister (sirada), sonra iptal eder: cihazGetir ve ogrenciHesabiGetir silme anını null döner, iptalden sonra imzalanan kayıt D07 tarafından hesap silme gerekçesiyle reddedilmez.'),
  TT('Hoca silmesi yakın giriş ister ve adresi siler', 'behavior', '16 dakikalık oturumla 403 KIMLIK_YENIDEN_GIRIS_GEREKLI; yeni girişten sonra yapılır: e-posta NULL, kodlar ve oturum satırları yok, ad-soyad ve bölüm duruyor, dinleyici hesap_silindi alır; aynı adresle yeni başvuru yeni kişi satırı açar.'),
  TT('İşçide personel silmesi anahtarsız biter', 'behavior', `Panelden istenen, telefonu bildirmeyen personel silmesi 7 gün sonra worker.ts bileşimiyle hesap_silme_yurutucu tarafından, giris_kodu_ozeti yüklenmemiş süreçte yürür: istek yapildi, ölü kuyrukta iş yok, D15 telefon sayaçları ve ekran süreleri silinmiş. Adres bekleme satırı 24 saat sonra kimlik_temizligi ile gider.`),
  TT('Silinen öğrenci yeniden kaydolunca yeni hesap ve yeniden teyit', 'behavior', 'Yeniden kayıt yeni kisiId ve teyit bekliyor; silinmiş teyitli eski satır kısmi tekil dizine takılmaz, yeni hesap teyit edilebilir.'),
  TT('Hocanın yüz yüze başlattığı öğrenci silmesi', 'behavior', `Etkin cihazı olmayan öğrenci için yetkili hoca dersId ile hemen yapildi, denetimde dersId; etkin cihazı olan öğrenci 409 KIMLIK_HESAP_DURUMU_UYGUN_DEGIL ve hesap değişmez; öğrencinin dersini vermeyen hoca 404 alır.`),
  TT('Başvuru sahibi onaydan önce silebilir', 'behavior', 'basvuru_silme koduyla onay bekleyen başvuru silindi, ad-soyad ve adres NULL; aktif hesaba basvuru_silme kodu gitmez.'),
  TT('Her durumda bir silme yolu var', 'behavior', `Pasif hoca basvuru_silme koduyla siler: e-posta NULL, ad-soyad ve bölüm duruyor, istek kaynak kod ile yapildi. Teyidi reddedilen ve bekleyen kapatmayla kapanan öğrencide girilen isim, cihaz modeli, sürümü ve son görülmesi o anda NULL; hoca yüz yüze silme bu hesaplarda da yapildi döner.`),
  TT('İnceleme hesapları her an çalışır', 'behavior', 'Sabit kodla giriş olur, 3 yanlışta kod düşmez ama bekleme uzar, 4. oturum kimseyi kapatmaz, e-posta gitmez, giriş ve yanlış deneme denetime yazılır; deneme numarasıyla kayıt teyitsiz teyitli olur ve ikinci telefon ilkini kapatmaz; silinen deneme hocası aynı gün iş kuyruğundan yeniden kurulur.'),
  TT('Boş veritabanında inceleme yolu uçtan uca', 'behavior', `Boş veritabanı, ayarlar dolu: işçi açılışında kurulum işi koşar; inceleme hocası sabit kodla girer ve ders listesinde deneme dersini görür; deneme öğrencisi kayıt olur, eşleşmesi eslesti, ders ve oturum takvimini indirir. INCELEME_HOCA_ADRESI değişip iş yeniden koşunca deneme dersi yeni hocaya geçer.`),
  TT('İnceleme ayarı değişince eski hesap ayrıcalığını kaybeder', 'behavior', `Adres değişince eski inceleme hocasının inceleme_hesabi false, oturumları kapalı (inceleme_bitti), sabit kodla giriş KIMLIK_KOD_GECERSIZ, 4. girişte en eski oturum yine kapanır. Numara değişince eski deneme öğrencisi hesabı kapandi. Deneme numarası gerçek bir dersin etkin listesindeyse uyarı açılır ve o numarayla kayıt teyitsiz, tek telefonlu olağan yoldan yürür.`),
  TT('İlk yönetici komutu', 'behavior', 'Boş veritabanında onaylı, tüm kapsamlı yönetici açar ve denetimde yapan komut_satiri; ikinci çalıştırma yeni satır açmaz; pasif hesabı etkinleştirir; @istanbul.edu.tr dışı adresi reddeder; dinleyiciler kurulmadan komut açılmaz.'),
  TT('Bekleyen kayıt kapatma', 'behavior', 'İki dönem kilidinden sonra 30 günlük listede_yok hesap kapandi olur, cihazı kapandi (bekleme_bitti), girilen isim NULL; tek kilit geçmiş, eşleşmiş, teyitli ya da 30 günden genç hesaba dokunmaz; iki kez çalışınca sonuç aynı. Kilit sayısı BEKLEYEN_KAPATMA_KILIT sabitinden içe alınır.'),
  TT('Temizlik işleri yalnız eski satırları işler', 'behavior', '24 saatten eski kodlar silinir, doğrulanmamış başvuru silindi olur (adres ve ad-soyad NULL, kişi satırı ve ona bağlı denetim satırları duruyor), 30 günden eski bitmiş oturum satırları silinir; daha yeni satırlar durur (pozitif kontrol); ikinci çalıştırma hiçbir şey işlemez.'),
  TT('Panel girişinde köken denetimi', 'behavior', `Başka kökenli Origin'le giriş D13'ten 403 API_KOKEN_GECERSIZ, Set-Cookie yok; istemci panel ve Origin'siz giriş 403 KIMLIK_KOKEN_GECERSIZ, Set-Cookie yok; panel Origin'iyle giriş çerezi kurar (pozitif kontrol); telefon girişi Origin'siz kabul, çerez kurulmaz.`),
  TT('Kişisel veri hiçbir loga, adres satırına ve iş verisine girmez', 'behavior', 'Bütün kimlik senaryolarından sonra pino çıktısı, pg-boss iş tablosu, danışma kilidi anahtarları ve denetim ayrıntısı taranır: öğrenci numarası, isim, e-posta adresi, 6 haneli kod ve oturum anahtarı yok; pozitif kontrol: bilerek loga verilen numara gizleme ayarıyla maskelenmiş görünür.'),
  TT('Liste uygulanırken eşzamanlı kayıt bekleyende kalmaz', 'behavior', 'Aynı numara için kayıt işlemi ve liste uygulama işlemi iki bağlantıda aynı anda koşturulur (her iki sırayla); sonunda hesap eslesti, kilitlenme hatası yok (D03-B19 kilit sırası).'),
  TT('Aynı numarada eşzamanlı iki teyit tek teyitli hesap bırakır', 'behavior', 'İki hoca aynı numaranın iki teyitsiz hesabını aynı anda teyit eder; tam olarak biri teyitli, öbürü reddedildi (numara_baskasinda), kısmi tekil dizin ihlali istemciye 500 olarak dönmez.'),
  TT('Personel akışları eşzamanlı kilitlenmez', 'behavior', 'İki bağlantıda aynı anda: pasif ile doğru kodla giriş (her iki sırayla) sonunda hesap pasif ve açık oturum yok; hesabiSil ile giriş ve oturumsuz silme ile giriş 40P01 olmadan biter (islem yeniden denemesi sayacı 0). Mutasyon: girişte kişi kilidi kod kilidinden sonra alınırsa senaryo kırmızı olur.'),
  TT('Teyitsiz hesap sınırı ve kayıt kodu', 'behavior', `Numarada 5 etkin cihazlı teyitsiz hesap varken kodsuz kayıt 409 KIMLIK_COK_BEKLEYEN_HESAP; hoca biri reddedince yer açılır ama 24 saatte 10. hesaptan sonra yine 409; çıkışla cihazı kapanan hesap sınıra sayılmaz. kimlik.kayitKoduAcik açıkken geçerli kodla kayıt iki sınırı da aşar, hesap teyitli açılır, numaranın öbür teyitsiz hesapları aynı işlemde reddedildi (numara_baskasinda).`),
  TT('Kayıt kodu kuralları', 'behavior', `kayit-kodu.feature, kimlik.kayitKoduAcik açık: kod 72. saatte KIMLIK_KAYIT_KODU_GECERSIZ, 71. saatte geçerli; 5 yanlış denemeden sonra doğru kod da reddedilir ve yanlış sayısı veritabanında 5 (hata cevabı sayacı geri almaz); aynı D07 değeriyle ikinci deneme KIMLIK_DOGRULAMA_DEGERI_GECERSIZ; aynı numaraya yeni kod eskisini geçersiz kılar; doğru kodla hesap teyitli ve teyit_yolu kayit_kodu. Ground control: ayar kapalıyken kod üretme ve kullanma 403 KIMLIK_KAYIT_KODU_KAPALI. Değerler sabitlerden içe alınır.`),
  TT('Sonradan değişen doğrulama sonucu cihaz satırına yazılır', 'behavior', 'cihazDogrulamaSonucunuYaz dogrulanamadi ile çağrılınca cihaz özeti değişir ve kimlik.cihaz_dogrulama_degisti denetimi yazılır; aynı sonuçla tekrar çağrı denetim satırı eklemez.'),
  TT('Olay komutu bütün personel oturumlarını kapatır', 'behavior', `D15'in anahtar-uret oturumlari-kapat komutu kendi bileşim köküyle koşar: bütün personel oturumları kapanır, D11 QR anahtar yuvaları aynı işlemde iptal olur, öğrenci oturumlarına dokunulmaz; sonraki personel isteği 401 neden olay_komutu.`),
  TT('Dinleyiciler her bileşim kökünde kurulur', 'behavior', `bilesim.feature: worker.ts bileşimiyle hesap_silme_yurutucu D15 telefon_sayaclari ve hoca_ekran_sureleri satırlarını siler; komut süreci olay komutunda D11 yuvasını iptal eder. kimlikDinleyicileriniKur çağrılmamış ya da bir abone eksik bileşim kökü açılışta KIMLIK_DINLEYICI_EKSIK ile durur ve hiçbir iş yürümez.`),
  TT('Dinleyici hatası işlemi geri alır', 'behavior', 'Hata veren bir test dinleyicisi kayıtlıyken en eski oturumu kapatacak giriş ve hesap silme işlemi geri alınır: oturum ve hesap satırları önceki halinde; dinleyici kaldırılınca aynı istek başarır.'),
  TT('Kopya alanlar tutarlı kalır', 'behavior', 'Bütün kimlik senaryolarından sonra cihazlar.inceleme_cihazi kişinin inceleme_hesabi değerine, ogrenci_hesaplari.silinme_ani kişinin silinme_ani değerine eşit; bilerek bozulan kopya bu testi kırmızı yapar.'),
  TT('E-posta normalleştirme', 'property', 'fast-check: iki kez uygulamak değişmez; büyük küçük harf ile İ, I, ı varyantları aynı adrese iner; istanbul.edu.tr dışı alan, alt alan ve + içeren adres reddedilir; çıktı yalnız [a-z0-9._-], tek @ ve sabit alan adı taşır.'),
  TT('Bekleme süresi tekdüze ve sınırlı', 'property', `Ardışık yanlış arttıkça süre azalmaz, 900 saniyeyi geçmez, 3'ün altında 0; sabitler BEKLEME_ILK_SN ve BEKLEME_UST_SN'den içe alınır.`),
  TT('Kapatılacak oturumun seçimi', 'property', `Rastgele oturum kümelerinde seçilen her zaman en eski panel, panel yoksa en eski telefon; 3'ten az etkin oturumda ya da inceleme hesabında hiçbiri.`),
  TT('Cihaz etiketi D14 kümesinde kalır', 'property', `Bilinen User-Agent örneklerinden Edge, Chrome, Firefox, Safari ve Windows, macOS, Android, iOS çıkar; bilinmeyen ya da 512 karakteri aşan değer "Tarayıcı" olur. fast-check: eğik çizgi, alt çizgi, emoji ve 80 karakterlik model girdilerinde (ör. SM-G991B/DS) çıktı yalnız harf, rakam, boşluk, virgül, nokta, parantez ve tire taşır ve CIHAZ_ETIKETI_EN_COK'u (60) geçmez; her çıktı D14'ün giris_bildirimi şemasından geçer.`),
  TT('Kayıt kodu biçimi', 'property', `Crockford ayrıştırma büyük küçük harfi, O ile 0'ı, I ve L ile 1'i aynı koda indirir, tireyi atar; üretilen her kod 8 karakter ve 40 bit.`),
  TT('Toplu teyit kuralı tek yerde', 'property', 'packages/core/src/kimlik/teyit.ts: rastgele hesap durumlarında topluTeyitEngeli null olan her hesap ogrenciTeyitEt toplu yolunda teyitli, null olmayan tek_tek_gerekli alır (aynı saf işlev).'),
  TT('Rota listesi tam ve yetkili', 'contract', `kimlik rota listesinde 28 uç, hepsi /v1/kimlik önekli, her birinin kimlik ve rol beyanı dolu, hız sınıfı D13'ün HizSinifiAdi listesinden (girissiz, oturum, agir); yol parametreleri yalnız uuid; istek şemalarında ogrenciNo, eposta, kod ve adSoyad yalnız gövdede (şema nesnesinden üretilen JSON Schema üzerinden); degisim_bekleyen rolünü yalnız /ben, /cikis ve iki değişim ucu (POST /v1/kimlik/cihaz-degisimi ile QR yenileme ve talebin ret ucunda vazgeçme) kabul eder.`),
  TT('Hata kodları ve genişleyen değerler', 'contract', 'Bütün kodlar KIMLIK_ önekli ve tek HTTP durumuna bağlı; her kod en az bir senaryoda gerçekten döner; cevaplardaki durum, neden ve eşleşme alanları x-extensible-enum taşır.'),
  TT('Modül sınırı döngüsüz', 'contract', `sinirlar.test.ts dependency-cruiser ile: modules/kimlik/yaprak.ts hiçbir modülü içe aktarmaz; D07, D05, D09 ve öbür çağıranlar D01'i yalnız yaprak.ts üstünden içe aktarır; kimlik ile dogrulama arasında tek yön kalır, no-circular kuralı kimlik dosyalarında ihlal bulmaz. Mutasyon: dogrulama içinden kimlik/index.ts içe aktarılınca test kırmızı.`),
  TT('İş zamanlaması kurala uyar', 'contract', `zamanlama.test.ts: D01'in beş işinin cron'u D14'ün kural denetleyicisinden geçer (03:00 ile 05:00 arasında başlamaz, öbür günlük işlerle en az 5 dakika arası var, sık iş missed: skip, günlük iş missed: once), bekleyen_kayit_kapatma donem_kilidi'nden sonradır.`),
  TT('Kurallar mutasyona dayanıklı', 'mutation', 'Stryker packages/core/src/kimlik üzerinde; ayrıca elle: timingSafeEqual yerine eşitlik, kısmi dizin koşulundan silinme_ani, en eski oturum seçiminde panel önceliği, kanca işlemsizlik denetimi, kancanın cihaz durumu denetimi ve yeniden bağlamada cihaz durumu koşulu bozulunca ilgili senaryo kırmızı olur; dosya md5 ile geri yazılır.'),
  TT('Kanca yük altında hafif kalır', 'load', `D15'in ders çıkışı k6 senaryosunda kanca her istekte tek dizinli okuma ve en çok dakikada bir ayrı işlemde yazma yapar; kanca süresi p95 istek süresinin yüzde 10'unu geçmez (pg_stat_statements ve istek logundan ölçülür).`),
];

// ---------------------------------------------------------------- resolved gaps
const G = (gap, decision, why) => ({ gap, decision, why });
const resolved_gaps = [
  G('D01-B01', 'Tek personel hesabı ve ayrı personel_rolleri tablosu (hoca, yonetici). Giriş kodu ve oturum kuralları bütün personelde aynı; oturum satırı yalnız personel ya da öğrenci ayrımını tutar, roller her istekte rol tablosundan okunur. Yönetici olarak eklenen kişiye hoca rolü de yönetici ucundan verilir (D01-B36).', 'İlk yönetici e-posta koduyla giriyor ve bölüm başkanı ders de veriyor; geri alınan yetki açık oturumda hemen düşmeli (plan.html#kararlar-roller, teknik.html#sunucu-ilk-yonetici).'),
  G('D01-B04', `Personel durumları: kod_bekliyor, onay_bekliyor, aktif, pasif, reddedildi, silindi. Yönetici gerekçe koduyla reddedebilir; reddedilene ve pasife giriş kodu gitmez, kod isteğine yine aynı cevap döner; reddedilen aynı adresle yeniden başvurabilir, yeni onay gerekir ve yöneticiye önceki ret gösterilir. Onay ve ret e-postası D01-A03'te.`, 'Durum alanının CHECK listesi ve "aynı cevap" kuralı bu listeye bağlı; ret olmadan hoca olmayan başvuru süresiz bekler.'),
  G('D01-B05', `POST /v1/kimlik/basvuru kod üretir, POST /v1/kimlik/basvuru/dogrula doğrular; kod giris_kodlari tablosunda amac basvuru ile ve başvurunun ad-soyad, birim, bölüm bilgisiyle durur. 5 dakika, 3 yanlış, adres başına bekleme ve e-posta sınırı giriş koduyla ortak. Adres kayıtlıysa yeni satır açılmaz ve kişi satırı ancak doğrulamada güncellenir.`, 'Tek tablo ve tek kural seti sınırların tutarsızlaşmasını ve durum sızmasını önler; doğrulanmamış istek başkasının başvurusunu değiştiremez.'),
  G('D01-B06', `Kod isteği her durumda 202 ve aynı gövdeyi döner; hesap durumuna göre değişen iş sabit alt sürenin (SABIT_CEVAP_MS, 400 ms) altında kalır, bekletici hedefi bütün yollarda aynıdır; e-posta cevaptan sonra gider. Pasif, reddedilmiş, kayıtsız, silinmiş ve inceleme adresine giriş kodu gitmez; kayıtsız adrese "hesap yok" e-postası D01-A04'te.`, 'plan.html#kararlar-roller: her durumda aynı cevap, aynı hızda.'),
  G('D01-B07', `Adres özeti başına ardışık yanlış sayacı PostgreSQL'de (eposta_giris_durumlari). 3. yanlıştan sonra bekleme 30 saniye, her yanlışta iki katı, üst sınır 900 saniye; başarılı girişte ya da 24 saat yanlış gelmeyince sıfırlanır. Bekleme yalnız tahmini yavaşlatır, sahibi kilitlemez: beklemede deneme yalnız bekleme başladıktan sonra üretilmiş açık kodlarla karşılaştırılır (o kod yalnız posta kutusuna gitti); böyle kod yoksa deneme sayılmadan 429; varsa yanlış deneme o kodun 3 yanlış hakkından düşer ama bekleme uzamaz ve yine aynı kalan süreyle 429 döner (cevap hesabın kod isteyip istemediğini sızdırmaz). Tahmin bütçesi adres başına günde 10 kod x 3 yanlışta kalır. IP'ye bağlanmaz; inceleme hesabına da aynı kural. Kayıtsız adreste de satır tutulur. Seçenekler ve kalan risk D01-A24'te.`, `Sayılar olmadan kural test edilemez; kampüs NAT'ı IP anahtarını kullanılmaz kılar; kayıtsız adreste farklı davranış varlığı sızdırır. Yalnız adrese bağlı bekleme, adresi bilen herkesin saatte 4 istekle hocayı süresiz dışarıda tutmasına izin verirdi; plan.html#kararlar-roller elle kilidi tam bu yüzden reddediyor.`),
  G('D01-B08', `Sınır kayan penceredir (60 saniye, 60 dakika, 24 saat) ve D14'ün eposta_gonderimleri tablosunda sayılır: giriş kodu, başvuru kodu, silme kodu ve "onay bekliyor" aynı sayaca girer; giriş bildirimi girmez. Aşımda kod satırı yazılmaz, e-posta gitmez, cevap aynı.`, `Takvim günü gece yarısında 20 koda izin verir; sayaç contracts.json'da D14'ün tablosunda.`),
  G('D01-B09', `Süresi dolmamış bütün kodlar geçerlidir; yanlış deneme kişinin aynı amaçlı aday açık kodlarının hepsinde artar, 3'te hepsi düşer; bir kodla giriş başarılı olunca öbür açık kodlar gecersiz olur.`, 'Geç gelen e-postadaki kod da işler; tahmin bütçesi adres başına günde en çok 10 kod x 3 yanlış = 30 denemede kalır (1 milyonda).'),
  G('D01-B10', `Giriş isteği e-posta, 6 rakam, istemci ve telefonda cihaz bilgisini taşır. Yanlış, süresi geçmiş, kullanılmış ve hiç olmayan kod tek kodla (KIMLIK_KOD_GECERSIZ) ve aynı alt süreyle döner; bekleme sürüyorsa ve kod tutmadıysa yalnız KIMLIK_BEKLEME_SURUYOR ve kalan saniye. kod_bekliyor kişinin açık başvuru kodu giriş formunda da doğrular, cevap durum onay_bekliyor ve oturum yok. Başarıda telefona gövdede anahtar, panele çerez.`, 'Ayrı hatalar adresin durumunu sızdırır; bekleme kayıtsız adreste de aynı işlediği için kalan süre sızıntı değildir. Kod iste ekranından başvuru kodu alan kişi yanlış forma düşüp yanlış deneme biriktirmez.'),
  G('D01-B11', `Oturum satırında istemci ve kısa cihaz etiketi: panelde User-Agent'tan packages/core'daki küçük eşleştirmeyle (yeni paket yok, bilinmeyen "Tarayıcı"), telefonda girişte gelen model ve platform. Etiket önce D14'ün giris_bildirimi kümesine (harf, rakam, boşluk, virgül, nokta, parantez, tire) süzülür, sonra 60 karaktere kesilir; D14 başka veriyi programlama hatası sayıp e-postayı göndermez. IP saklanmaz.`, `Bildirim cihaz ya da tarayıcı türü istiyor (tasarim.html#durumlar örneği "Edge, Windows"); IP plan'da istenmiyor. Süzülmemiş model adı (SM-G991B/DS gibi) bildirimi, yani plan.html#kararlar-tek-etkenli-giris'in dengeleyici önlemini, sessizce düşürürdü.`),
  G('D01-B12', 'Giriş isteği geçerli bir telefon oturumunun Bearer anahtarını taşırsa ve kişi aynıysa yeni oturum onun yerine geçer: eski oturum yenilendi diye kapanır, onceki_oturum_id yazılır, 3 cihaz sayımı ve en eski oturumu kapatma çalışmaz. Eşzamanlı girişler kişi satırı kilidiyle sıralanır.', 'Yenileme yeni giriş sayılsaydı her 30 günde bir panel oturumu düşerdi (D01-C08).'),
  G('D01-B13', 'En eski oturum oluşturma anına göre seçilir; önce panel, panel yoksa telefon. Bildirim kapanan oturumun etiketini yazar.', `plan.html#kararlar-roller "en eski" diyor ve bildirim metni buna dayanıyor.`),
  G('D01-B14', `Kanca isteğe kişiyi koyar; gönderim paketindeki kurulumun hesabını isteğin kişisiyle karşılaştırmak D06'nın kuralıdır ve istek düzeyindedir (D06-B09): kurulumun kişisi isteğin kişisi değilse istek 401 ESITLEME_KIMLIK_UYUSMUYOR alır, kurulum başına; başka hesabın işi telefonda o hesabın kurulumunda bekler ve o hesap yeniden girince gider.`, 'Gönderim tek uçtan gelir ve D06 yalnız dağıtır (contracts.json kararı); kural D06-B09 ile tek cümle.'),
  G('D01-B15', 'Panelin kendiliğinden attığı istekler X-Arka-Plan: 1 başlığı taşır, son kullanımı ilerletmez; kullanıcı istekleri ilerletir. Son kullanım en çok dakikada bir, isteğin işleminden ayrı kısa bir işlemde yazılır; telefonda yalnız bilgidir, süreyi uzatmaz. Süre saat arayüzüyle denetlenir.', `Kürsüde açık kalan panelde asıl önlem 1 saatlik süre (plan.html#kararlar-roller); D13-B07 ile aynı başlık.`),
  G('D01-B16', `Kimlik D13'ün ortak tipidir; D01 kendi tipini tanımlamaz, D13'ten genişletme ister: girisOturumuId (oturumId yerine), roller [{ rol, kapsamBirimId }], oturumKapsami, incelemeHesabi ve kısıtlı oturum için degisim_bekleyen rol değeri (D01-A14). Kimlik bilgisi yoksa D13 401 API_KIMLIK_GEREKLI, rol ya da kimlik türü rota beyanına uymazsa 403 API_ROL_YETKISIZ verir; D13 yetkiDenetle çağırmaz. yetkiDenetle(kimlik, rol, kapsam?) yalnız yönetici kapsamını yanıtlar ve modüller (D02, D04, D09, D10) kendi 404'üne çevirir; kaynak düzeyi denetim modül servisinde, yetkisiz kaynak 404.`, 'Elle yazılan denetim unutulan ucu açık bırakır; rol denetimini tek yerde (D13 rota beyanı) tutmak D13-B05 ile çakışmayı kaldırır. D02 ve D10 yetkiDenetle(kisi, yonetici, { birimId }) biçiminde çağırıyor.'),
  G('D01-B17', `Kanıt değeri D07'nin POST /v1/dogrulama/deger ucundan alınır (contracts.json yeniden adlandırması); D01 değeri D07.dogrulamaDegeriniTuket ile amaç denetleyerek (KAYIT, CIHAZ_DEGISIMI, ANAHTAR_YENILEME) aynı işlemde tüketir.`, 'Değeri veren ve tüketen modül tek olunca tazelik kuralı tek yerde kalır.'),
  G('D01-B18', `Kayıt isteği: ogrenciNo, adSoyad, platform, model, dogrulamaDegeri, kanıt (Android açık anahtar, isteğe bağlı sertifika zinciri, isSystemUser, bağlama imzası; iPhone Secure Enclave açık anahtarı, bağlama imzası, isteğe bağlı App Attest kanıtı) ve isteğe bağlı kayıt kodu. Cevap durum (teyit_bekliyor, teyitli, degisim_bekliyor), cihaz, anahtar kimlikleri, oturum anahtarı (yalnız bu cevapta), eşleşme ve doğrulama özeti. Bağlama imzası (değerin, numaranın ve platformun özeti üstünde, cihaz anahtarıyla) kanıtsız telefonda da anahtarın sahipliğini gösterir; kanıtı da bağlama imzasını da D07.cihazKanitiniDogrula doğrular. Sıra: cihaz ve bütün anahtar satırları yazılır, sonra D07 çağrılır, sonra sonuç cihaz satırına yazılır (D07-A07).`, `Başkasının açık anahtarını kendi hesabına bağlatıp gerçek sahibini KIMLIK_CIHAZ_BAGLI'ya düşürmek engellenir; imza doğrulaması tek modülde kalır; cihaz_kanitlari.anahtar_id yabancı anahtarı ancak bu sırayla tutar.`),
  G('D01-B19', `İsim tek alandır; eşleşme numara ve normalleştirilmiş isimle, öğrencinin bulunduğu herhangi bir etkin liste satırıyla (D03.numaraIleEslestir). Hoca ekranlarında liste satırındaki isim görünür; girilen isim yalnız eşleşmede, uyuşmazlıkta ve teyit bekleyen hesabın teyit ekranında kullanılır.`, `Liste biçimi D03'te; tek alan bugünkü planla uyumlu, gerekirse göçle bölünür.`),
  G('D01-B20', `Listede olmayan kayıt bekler; teyitsiz, listede_yok, en az 30 günlük ve oluşturmadan sonra en az iki birim ve dönem kilidi geçmiş hesap gecelik bekleyen_kayit_kapatma işiyle kapanır (D01-A25). Numara başına en çok 5 etkin cihazlı teyitsiz hesap (cihazı kapanmış hesap sayılmaz) ve son 24 saatte en çok 10 yeni hesap açılır, fazlası KIMLIK_COK_BEKLEYEN_HESAP; girişsiz IP sınırı ve donanım anahtarının tekilliği ayrıca keser. Geçerli kayıt kodu iki sınırı da aşar ve numaranın öbür teyitsiz hesaplarını aynı işlemde numara_baskasinda ile reddeder.`, `plan.html#kararlar-e-posta-gonderimi bekleyişin süresini yazmıyor. Sınırlar bir numaranın satır sayısını ve yeniden doldurma hızını keser ama kötü niyetli doldurmayı tek başına önlemez: sahte hesaplar hoca ekranında aynı numara grubunda görünür ve reddedilir; sınır dolu iken gerçek öğrencinin kesin yolu kayıt kodudur, anahtarı kapalıyken bu yol yoktur (sahibin kararı D01-A06).`),
  G('D01-B21', 'Teyitli numaraya gelen kayıt yeni hesap açmaz, aynı istekte değişim talebi açar (degisim_bekliyor). Teyitsiz hesaplar çakışırsa hepsi toplu teyitten çıkar, D09 ekranında yan yana görünür; hoca birini teyit edince öbürleri numara_baskasinda gerekçesiyle reddedilir. Sahibin kararı D01-A20.', `plan.html: teyitli iki hesap aynı numarayı alamaz, iki kişi isterse hoca karar verir; silip yeniden kurma değişim sayılır (plan.html#kararlar-ogrenci-telefonu).`),
  G('D01-B22', `Teyit ve ret iki ayrı dış yüz işlevidir; yetki öğrencinin etkin liste satırı bulunan herhangi bir dersin hocasında. Doğrulanamayan telefon, isim uyuşmazlığı ve çakışma toplu yolda tek_tek_gerekli alır; aynı kural ogrenciHesabiGetir'in topluTeyitEngeli alanında D09'a döner. Reddin hesaba sonucu D01-A05'te.`, 'plan.html#kararlar-e-posta-gonderimi: herhangi bir dersin hocası, doğrulanamayanlar tek tek.'),
  G('D01-B23', `Teyit, beklemedeki kayıtları aynı işlemde D07.yenidenDegerlendir ile karara bağlatır ve D06.ogrenciDurumuDegisti ile telefonun indirdiği durumu ilerletir. Toplu istek D09 ucunda en çok 200 öğe alır, her öğe kendi SAVEPOINT'inde; iş kuyruğu kullanılmaz.`, 'plan.html#kararlar-supheli-kayit: kararlar olay anında; D13-B28 öğe başına sonuç deseni; teyitten sonra telefon kendi adını ve devam bölümünü indirebilmeli.'),
  G('D01-B25', `Değişim: yeni telefon kayıt ya da değişim ucuyla kanıtını verir, degisim_bekliyor cihazı ve kısıtlı oturumu alır; QR'da talep kimliği ve 128 bitlik tek kullanımlık değer (900 saniye, yenilenebilir). Talep cihaz başınadır ve 72 saatte düşer; aynı hesaba başka cihazdan gelen talep öncekini düşürmez, hesapta doğrulanamayan cihazlı en çok 3 açık talep olur. Hoca hoca modunda okutur, numarayı ve liste ismini görür, kimliği görüp karşısındakinin QR'ını onaylar. Onay tek işlemde: eski cihaz kapanır (degisim), eski oturum kapanır, yeni cihaz etkin, kısıtlı oturum tam olur, öbür açık talepler iptal olur, cihazların bekleyen kayıtları D07 ile karara bağlanır.`, `plan.html#kararlar-ogrenci-telefonu ve plan.html#gun-kenar-durumlar; makbuz kamerası zaten var. Hesap başına tek talep, numarayı bilen birinin birkaç saniyede bir istekle gerçek talebi sürekli düşürmesine izin verirdi.`),
  G('D01-B27', `Kapanan cihazın açık anahtarları silinmez, etkinlik bitişi cihazlar.kapanma_ani'dir. Eski anahtarla imzalı kayıt imza yolundan gelir (D13-B06, oturum aranmaz); kabul ve karar D05 ile D07'nindir. Kapanmış cihazın öğrenci oturumu 401 alır: kapanış oturumları kapatır, kanca ayrıca cihazın durumunu okur, ve aynı anahtarla yeniden kayıt oturum vermez (409 KIMLIK_CIHAZ_KAPANDI).`, `Yedekten dönen bekleyen kayıtlar karara eklenebilsin, çalınan eski telefonun yeni kaydı sayılmasın ve o telefon yeniden kayıt isteğiyle hesaba dönemesin (plan.html#hile).`),
  G('D01-B28', `Öğrencinin çıkışı sunucuya bildirilir: cihaz kapanır (cikis), oturum biter; telefon anahtarları yalnız bu cevaptan sonra siler. bekleyenOgeSayisi 0 değilse 409; internetsiz çıkış yok. Teyit bekleyen hesabın tek cihazı çıkışla kapanınca hesap da aynı işlemde kapandi olur. Uygulaması silinen telefonun eski cihazı değişim onayında kapanır.`, 'plan.html#kararlar-ogrenci-telefonu: çıkış değişim sayılır, gönderilmemiş kayıt varken çıkış yok. Cihazsız teyitsiz hesap kalsaydı numara sınırına sayılır, D09 aynı numara grubunu doldurur ve hoca yanlış hesabı teyit edebilirdi.'),
  G('D01-B29', `İstek hemen kaydedilir. Telefon bekleyen öğe sayısını bildirir; 0 bildiren giriş oturumu isteğe yazılır ve kişinin bütün açık telefon oturumları 0 bildirince aynı işlemde silinir, değilse sirada kalır. Panelden personel isteğinde açık telefon oturumu varsa sırada, yoksa hemen. Hiç bildirim gelmezse 7 gün sonra gecelik iş siler (sahibin kararı D01-A21); istekten sonra imzalanan kayıt sayılmaz (D07, istek anı dış yüzden okunur, iptalde null).`, `7 gün plan.html#kararlar-gonderme-suresi'ndeki beklenen gönderme süresidir; mağaza şartı silmenin gerçekten yapılmasını ister; tek sayaç iki telefonlu hocanın öbür telefonundaki işi beklemezdi (plan.html#kararlar-hesap-silme).`),
  G('D01-B30', 'Sıradaki istek yapılana kadar aynı hesaptan iptal edilir (DELETE /v1/kimlik/hesap-silme), iptal denetime yazılır. Personelin ilk silme isteği son 15 dakikada açılmış oturum ister (KIMLIK_YENIDEN_GIRIS_GEREKLI); istek her zaman başlatılabilir, yalnız kodla bir kez daha girilir.', 'Silme geri alınamaz ve panel ortak kürsü bilgisayarında da açılıyor (plan.html#kararlar-roller); ASVS seviye 2 hassas işlemde yeniden doğrulama ister, mağazalar buna izin veriyor.'),
  G('D01-B32', 'Oturum açamayan hesabın sahibi web sayfasında e-posta koduyla (amac basvuru_silme) oturumsuz siler: POST /v1/kimlik/basvuru/silme kod_bekliyor, onay_bekliyor, reddedildi ve pasif için. Ayrıca doğrulanmamış başvuru 24 saatte, reddedilmiş başvuru retten 30 gün sonra silindi olur (kişi satırı kalır, adres ve ad-soyad boşalır); onay bekleyen başvuru kendiliğinden silinmez. Sahibin kararı D01-A22.', `Onaydan önce giriş yok ama başvuruda ad, bölüm ve adres var (D01-C05); pasif hoca da plan.html#kararlar-hesap-silme gereği her zaman silebilmeli; onay bekleyeni sessizce silmek yöneticinin işini kaybettirirdi.`),
  G('D01-B33', `Hocada ad-soyad ve bölüm kalır, e-posta NULL olur; aynı adresle yeni başvuru yeni kişi satırı açar. Öğrencide yeniden kayıt yeni kişi satırı açar ve ilk kayıt teyidinden geçer; numaranın kısmi tekil dizini teyitli ve silinmemiş satırlarla sınırlı. Öğrencinin kalıcı kimliği listedeki numaradır, kişi satırı bir hesaptır (D01-A15). Kişi satırı hiçbir durumda fiziksel silinmez.`, `Eski satırı geri açmak (D12-B19) silindi işaretini siler, aynı numarayı isteyen ikinci kişiyi eski geçmişe bağlar ve teyide kadar süzgeç ister; liste satırı zaten numarayla durur (D03-B08), telefonu hiç olmayan öğrencinin de devamı numarayla hesaplanır. D12-B19'un bu kararla değişmesi D01-A14'te.`),
  G('D01-B34', `Öğrenci silinince: oturum satırları, girilen isim, cihazların etkinliği ve cihaz ayrıntıları (model, son görülme, sürüm, kanal, güvenlik düzeyi, doğrulanmış açılış, iOS alanları) silinir; telefon sayaçlarını D15 kimlik olayıyla siler. Kalır: numara, teyit bilgisi, cihaz platformu, doğrulama özeti ve isSystemUser, açık anahtarlar. Teyidi reddedilen ve kapanan (bekleme bitti, çıkış, inceleme bitti) hesapta girilen isim, cihaz ayrıntıları ve oturum etiketi aynı işlemde silinir; oturum satırı telefona nedeni göstermek için 30 gün kalır. Bu hesapların oturumu olmadığından kalan silme yolu hocanın yüz yüze silmesidir; hesap silme sayfası bunu yazar.`, 'Silmeden önce imzalanıp sonra ulaşan kaydın imzası ve etiketi için en az bu alanlar gerekir (D12-B18); kayıtlardaki etiketler kanıtı zaten taşır. Reddedilen ya da kapanan hesabın sahibinin uygulamadan silme yolu yok; yazılmış ismi ve telefon bilgisi silme beklemeden gider.'),
  G('D01-B35', `Kapsamındaki yönetici pasifleştirir ve geri açar; aynı işlemde bütün oturumlar kapanır, kod isteğine aynı cevap döner, e-posta gitmez. Hedef yönetici rolü taşıyorsa kapsam, hedefin birimiyle değil rol kapsamıyla karşılaştırılır: tüm kapsamlı yöneticiye yalnız tüm kapsamlı yönetici dokunur (pasif, etkin, oturumları kapatma). Dersler ve kayıtlar olduğu gibi kalır; pasif hocanın telefonundaki işler oturumu olmadığı için gönderilemez, yeniden etkinleşip girince gider. Son tüm kapsamlı yönetici pasifleştirilemez ve rolü alınamaz; kendi hesabını silmesi engellenmez (sahibin kararı D01-A23).`, 'plan.html#kararlar-roller pasifleşen hesabın oturumlarının bittiğini söylüyor; bütün yöneticiler kilitlenirse yol yalnız SSH komutu; birim kapsamlı bir yönetici birimindeki tüm kapsamlı yöneticiyi kilitleyememeli.'),
  G('D01-B36', `POST /v1/kimlik/yonetim/yoneticiler adres kayıtlı ve aktifse istenen rolü (yonetici ya da hoca) ekler, kayıtlı değilse onaylı personel hesabı açar (ad, birim, bölümle), onay bekleyen ya da reddedilmiş başvuruyu aktif yapar; pasif hesap önce etkinleştirilir. Kişi başka kapsamla yönetici ise 409: rol önce DELETE ile geri alınır, son yönetici koruması orada çalışır, uç kapsamı sessizce daraltmaz. Roller DELETE /v1/kimlik/yonetim/yoneticiler/{kisiId}?rol= ile geri alınır; yetkiler her istekte okunduğu için hemen düşer. Hepsi denetime (kimlik.rol_verildi, rol_alindi).`, 'plan.html#hoca: yönetici ekleme; bölüm başkanı önce hoca olarak başvurmuş olabilir ya da önce yönetici eklenip sonra ders verebilir.'),
  G('D01-B37', `Yöneticinin oturum kapatması yalnız personel hesaplarına; öğrencide eşdeğeri cihaz değişimi akışıdır (öğrenci hesabına 404).`, `Öğrencinin yeniden giriş yolu yok; kapatma yüz yüze akışı dolaylı başlatırdı.`),
  G('D01-B38', `Gizli ayarlarda deneme hocası adresi ve adı, deneme öğrenci numarası ve adı, gizli sabit kod (D15). inceleme_hesaplari_kurulumu işi hocayı, deneme dersini (D02.denemeDersiniKur) ve deneme listesini (D03.denemeListesiniKur) tek işlemde idempotent kurar, silinmişse aynı gün yeniden kurar, ayar değişince işareti eski hesaplardan kaldırır. Sabit kod yalnız inceleme_hesabi true ve adres ayardakiyle aynıysa denenir. Deneme hocasının kod isteği e-posta göndermez, aynı cevabı döner. Deneme numarasıyla gelen kayıt teyitli ve inceleme cihazı işaretiyle bağlanır, önceki cihazlar kapanmaz; numara deneme dersi dışında etkin bir listedeyse uyarı açılır ve ayrıcalık verilmez. Her giriş ve yanlış deneme denetime ve loga.`, 'plan.html#kararlar-inceleme-hesaplari: iki hesap da yalnız her an açık deneme dersini görür, inceleme anında çalışmayan hesap ret sebebi; ayar değişince kalan işaretli hesap izlenmeyen bir arka kapı olurdu.'),
  G('D01-B39', `Alan adı tam olarak istanbul.edu.tr; yerel kısımda İ, I ve ı i olur, A ile Z küçülür; yalnız a-z, 0-9, nokta, alt çizgi, tire; + ve ardışık nokta reddedilir; biçim hatası 400 (varlık sızmaz). Tek işlev packages/core/src/kimlik/eposta.ts, telefon, panel ve D14 de kullanır.`, `Alt alan öğrenci adresine, + takma adı aynı kutuya birden çok hesaba kapı açar; JavaScript toLowerCase İ'yi birleşen noktayla bozar.`),
  G('D01-B40', `Olaylar D09'un denetim_kayitlari tablosuna D09.denetimeYaz ile, türleri packages/contracts/src/kimlik.ts'te: kimlik.basvuru, basvuru_dogrulandi, basvuru_onay, basvuru_ret, basvuru_silindi, giris_basarili, inceleme_giris, inceleme_yanlis_deneme, inceleme_kaldirildi, bildirim_gonderilemedi, oturum_kapandi, rol_verildi, rol_alindi, hesap_pasif, hesap_etkin, ogrenci_kaydi, teyit, teyit_ret, cihaz_degisim_talebi, cihaz_degisim_onay, cihaz_degisim_ret, cihaz_degisim_zaman_asimi, cihaz_cikis, app_attest_yenileme, cihaz_dogrulama_degisti, kayit_kodu_uretildi, kayit_kodu_kullanildi, kayit_kodu_yanlis, hesap_silme_istegi, hesap_silme_iptal, hesap_silindi, bekleyen_kayit_kapandi, komut_satiri_yonetici, olay_komutu_oturumlar. Ayrıntıda yalnız iç kimlikler; hangi alanın dolduğu Durumlar ve kurallar bölümündeki değişmezde.`, 'Tek denetim tablosu contracts.json kararı; kod, adres ve numara denetim metnine yazılmaz. Başvuran oturumsuz olduğundan yapan alanına değil hedef alanına yazılır, ogrenci_id yalnız öğrenci hesabıdır.'),
  G('D01-B41', `Bildirim kod e-postasıyla aynı süreç içi yoldan (D14.epostaGonder) gider, iş kuyruğuna girmez; D14'ün kendi yeniden denemeleri dışında ek deneme yok. Sonuç BASARISIZ ise ya da söz reddedilirse (programlama hatası) ayrı bir işlemde kimlik.bildirim_gonderilemedi denetime yazılır.`, 'contracts.json kararı (giriş bildirimi işi yok); yeniden deneme istenirse sahibin kararı. Reddedilen sözü yakalamamak, bildirimin gitmediğini kimsenin görmemesi demekti.'),
  G('D01-B42', 'GET /v1/kimlik/ben tür, roller, hesap durumu, teyit, cihaz, hesabın açık değişim talepleri ve silme durumunu döner; GET /v1/kimlik/oturumlar yalnız etkin personel oturumlarını, şu anki işaretli. Uçlar telefon ve panelde ortak.', 'Telefon yetki hatasında cihaz durumunu göstermeli (plan.html#kararlar-yeniden-deneme); öğrenci bilmediği talebi görüp reddedebilmeli.'),
  G('D01-B43', 'Kodlar oluşturmadan 24 saat sonra, bekleme satırları 24 saat yanlışsız kalınca, doğrulanmamış başvurular 24 saatte (silindi işaretiyle), reddedilmiş başvurular retten 30 gün sonra (silindi işaretiyle), açık değişim talepleri 72 saatte (iptal), kayıt kodları kapanıştan 7 gün sonra, kararı verilmiş talepler 30 gün sonra (kimlik_temizligi); bitmiş oturum satırları 30 gün sonra (giris_oturumu_temizligi). İşler yalnız sayı loglar.', 'Gereksiz kişisel veri birikmesin; kodun tazelik kuralı sorgu anında zaten denetlenir; kişi satırı denetim satırlarının yabancı anahtarı olduğu için kalır (D12-B16).'),
  G('D01-B46', `contracts.json'a göre kimlik 11 tabloyu, 28 ucu ve 5 işi sahiplenir; kayıt soruları D07'nin cihaz_dogrulama_degerleri tablosu, teyit uçları D09'da (teyit alanlarını D01 yazar), birim listesi D02'nin GET /v1/dersler/birimler ucu.`, `teknik.html#sunucu-kimlik'teki iki tablo ve beş uç giriş çekirdeğiydi; kalan hesap işleri de aynı veriye dokunuyor.`),
  G('D01-B47', `Tablo giris_oturumlari (D01), ders oturumu oturumlar (D02); sözleşmedeki /v1/kimlik/oturumlar yolu korunur ama yol parametresi ve JSON alanı girisOturumuId (contracts.json'daki {oturumId} adının değişmesi D01-A14'te). Ekranda "Oturumlarım" kalır.`, `contracts.json "Giriş oturumu adı" kararı; tek başına oturum ders oturumudur (ortak kural 5).`),
  G('D01-B48', `D01 hoca telefonu için cihaz tablosu ve sıra alanı tutmaz; QR anahtar yuvası D11'in qr_anahtar_yuvalari tablosunda giriş oturumuna bağlanır. Yenilemede onceki_oturum_id ve giris_oturumu_yenilendi olayı yuvayı devrettirir; kapanış olayı yuvayı iptal ettirir. D11 dinleyicisi eklentide değil, her bileşim kökünde kimlikDinleyicileriniKur ile kurulur; böylece olay komutu ve işçi de yuvayı iptal ettirir.`, '"Ayrı bir tanınan cihaz kaydı tutulmaz" (teknik.html#sunucu-kimlik) korunur; yuva Aşama 2\'nin verisi. Eklentide kayıt, olayı komut ya da işçiden doğduğunda boş kayıtla sessizce kaybederdi.'),
  G('D01-B49', `401: kimlik bilgisi yoksa D13'ün API_KIMLIK_GEREKLI; varsa kancanın KIMLIK_OTURUM_YOK (tanınmıyor) ya da KIMLIK_OTURUM_BITTI (neden: suresi_doldu, islemsizlik, cikis, kendisi_kapatti, yonetici, en_eski, yenilendi, pasif, cihaz_degisimi, degisim_ret, degisim_iptal, degisim_zaman_asimi, teyit_ret, bekleme_bitti, inceleme_bitti, cihaz_kapandi, olay_komutu, geri_yukleme). Neden D13'ün 401 zarfının ayrıntısında döner. 403: rol (D13 API_ROL_YETKISIZ), köken (D13 API_KOKEN_GECERSIZ, Origin'siz panel girişinde KIMLIK_KOKEN_GECERSIZ), yönetici kapsamı (KIMLIK_KAPSAM_YETERSIZ), yeniden giriş. Görülmemesi gereken kaynak 404. Ayrıntı yalnız anahtarın sahibine döner. Zarf D13'ün.`, `Telefon 401 ve 403'te durup nedeni göstermeli (teknik.html#telefon-gonderme-protokolu); D13-B02 eşlemesiyle aynı; D13'ün döndürdüğü kodu D01'in testleri beklemeli.`),
  G('D01-B50', `Başvuruda birim ve bölüm D02'nin listesinden seçilir (GET /v1/dersler/birimler, girişsiz); sunucu D02.birimGetir ile bölümün birime ait olduğunu denetler, ikisini de saklar.`, 'Yönetici kapsamı ve onay listesi süzülebilmeli; serbest metin süzülemez.'),
  G('D01-B53', `Köken kuralı tek yerde, D13'ün kökünde (D13-B08): başka kökenli Origin 403 API_KOKEN_GECERSIZ, Origin'siz yazma isteğinde çerez okunmaz. D01 giriş ucunda çerezi yalnız istek.panelden true iken kurar; istemci panel olup Origin taşımayan girişe 403 KIMLIK_KOKEN_GECERSIZ verir (D13 onu telefon sayar). Telefon girişinde Origin aranmaz, çerez hiç kurulmaz. Çerez adı D13'ün CEREZLER sabitindendir (__Host-yoklama-oturum).`, 'Giriş ucu çerez kurduğu için başka siteden giriş yaptırma (giriş CSRF) kapanmalı; telefonun fetch\'i Origin göndermez. Kuralın ikinci kopyası D01\'de dursaydı biri değişince öbürü sessizce açık kalırdı.'),
];

const contradictions_resolved = [
  { id: 'D01-C01', resolution: `Yönetici personel hesabının rolüdür (D01-B01); giriş kodları bütün personelde kullanılır. teknik.html#kod-veri-modeli'deki "Giriş kodları yalnız hocalarda" cümlesi "yalnız personelde" olarak güncellenir (D01-A18).` },
  { id: 'D01-C02', resolution: `Kimlik modülü contracts.json'daki 11 tabloyu ve 28 ucu sahiplenir (D01-B46); teknik.html#sunucu-kimlik'teki iki tablo ve beş uç bunların giriş çekirdeğidir, cümle bu bölüme bağlanır (D01-A18).` },
  { id: 'D01-C03', resolution: `Girişe güven veren ayrı bir hoca cihazı kaydı yoktur; Aşama 2 QR anahtar yuvası D11'in tablosunda giriş oturumuna bağlıdır, yenilemede devredilir, kapanışta iptal edilir (D01-B48).` },
  { id: 'D01-C04', resolution: 'Silmede kişi satırı numarasıyla kalır, yeniden kayıt yeni satır açar; tekil dizin "teyitli ve silinmemiş" koşulludur, silinme anı kısmi dizin için ogrenci_hesaplari satırına da yazılır (D01-B33).' },
  { id: 'D01-C05', resolution: 'Onaylanmamış başvuru ve pasif personel e-posta koduyla oturumsuz silinir (POST /v1/kimlik/basvuru/silme); onaydan önce giriş yok kuralı bozulmaz (D01-B32).' },
  { id: 'D01-C06', resolution: `Kanca öğrenci ve personel için aynı yoldan kimliği (tür, kişi, roller, cihaz) ekler; teknik.html#sunucu'daki "hocanın kimliğini" ifadesi "kimliği" olarak güncellenir (D01-B16, D01-A18).` },
  { id: 'D01-C07', resolution: `Gönderim oturumla değil imzayla doğrulandığından kapanmış cihazın imzalı kaydı yetki hatası almaz; anahtarlar ve kapanma anı kalır, karar D07'nin (D01-B27). Yetki hatasında durma kuralı yalnız oturumlu isteklere uygulanır.` },
  { id: 'D01-C08', resolution: 'Telefon yenilemesi kendi oturumunun yerine geçer, 3 cihaz sayımına girmez ve başka oturum kapatmaz (D01-B12).' },
  { id: 'D01-C09', resolution: `Silinen ve kalan alanların tek listesi bu bölümdedir (D01-B34): oturum satırları iki rolde de silinir (plan'daki "kapanır" ve teknik'teki "silinir" birlikte sağlanır), cihazların etkinliği kalkar, telefon sayaçlarını D15 hesap_silindi olayıyla siler.` },
];

// ---------------------------------------------------------------- open points
const O = (id, question, recommendation, needs_owner) => ({ id, question, recommendation, needs_owner });
const open_points = [
  O('D01-A01', 'Yönetici bütün üniversitede mi yetkili, yalnız kendi biriminde mi (hoca onayı, hesaplar, yönetici ekleme; D02 takvim ve kilit, D08 oranlar)? (D01-B02, D02-B22)', 'Alan ve kural baştan: personel_rolleri.kapsam_birim_id (NULL tüm) ve yetkiDenetle kapsamı uygular, kapsamlı yönetici yalnız kendi biriminde ve yalnız birim kapsamlı yönetici ekler, yönetici hedefte rol kapsamı karşılaştırılır. İlk sürümde yöneticiler tüm kapsamla açılır; birimlere genişlemede kapsam göçsüz devreye girer.', true),
  O('D01-A02', 'Yönetici hocaların derslerini, kayıtlarını ve raporlarını görebilir ya da hoca adına işlem yapabilir mi? (D01-B03, D10-B17)', 'İlk sürümde görmez; yönetici yalnız sayılan işleri yapar. "Başka hocanın dersini görme" ret senaryosu yöneticiye de uygulanır; ihtiyaç doğarsa kapsamındaki derslere salt okuma eklenir.', true),
  O('D01-A03', 'Başvuru onaylanınca ve reddedilince hocaya e-posta gitsin mi? Plan yalnız kod, "onay bekliyor" ve giriş bildirimini sayıyor. (D01-B04, D14-B15)', 'Onayda kısa, bağlantısız ve kodsuz "hesabın onaylandı, uygulamadan giriş yap" e-postası gitsin (hoca kör deneme yapmasın); ret e-postası gitmesin, kod isteği yine aynı cevabı alır. Karar gelene kadar ikisi de gitmez.', true),
  O('D01-A04', 'Kayıtsız bir @istanbul.edu.tr adresi kod isterse "bu adresle hesap yok, uygulamadan başvur" e-postası gitsin mi? (D01-B06)', 'Gitmesin: her adrese e-posta yollamak yabancı kutulara e-posta yağdırmaya açılır ve D14-B15 de önermiyor. Uygulama kod ekranında "kod gelmediyse hesabın yoksa başvur" yazar. Karar gelene kadar gitmez.', true),
  O('D01-A05', 'Hoca ilk kayıt teyidini reddederse hesap kapanır mı? (D01-B22, D09-B14)', 'Kapanır: hesap ve teyit reddedildi, cihaz ve oturum kapanır, girilen isim ve cihaz ayrıntıları silinir, beklemedeki kayıtlar teyit_reddedildi ile ret alır (ham kayıt kalır), öğrenci yüz yüze yeniden kaydolur. Ret gerekçe kodu ve denetimle; tasarım bu davranışla kuruldu.', true),
  O('D01-A06', 'Tek kullanımlık kayıt kodu baştan mı gelsin, yoksa önce hoca teyidiyle mi başlansın? Numara başına teyitsiz hesap sınırı dolduğunda gerçek öğrencinin kesin yolu da bu koddur. (D01-B24, D01-B20, plan.html#acik)', 'Önce hoca teyidi. Tablo, uç ve kurallar hazır (8 Crockford karakteri, 40 bit, 72 saat, 5 yanlışta düşer, tek numaraya bağlı, kodla kayıt teyitli sayılır, sınırları aşar ve numaranın öbür teyitsiz hesaplarını reddeder). Anahtar D15 ayarı kimlik.kayitKoduAcik (varsayılan false), karar gelince sürüm gerekmeden açılır. Öneri: genel açılış kararı ne olursa olsun, sınırı dolu numara için hocanın kod üretmesine izin verilsin; karar gelene kadar sınır dolu iken öğrenci hocanın sahte hesapları reddetmesini bekler.', true),
  O('D01-A07', 'Cihaz değişimi onaylanmadan yeni telefon ders ve oturum takvimini indirebilsin mi? (D01-B26)', 'Bugünkü davranış: yeni telefonun imzalı yoklama kaydı oturum aranmadan gönderim yolundan gelir ve kabul edilir; D07 onu Beklemede CIHAZ_DEGISIMI_BEKLIYOR tutar, onayda normal kuralla karara bağlar, ret ya da düşmede Ret CIHAZ_ONAYLANMADI verir (D07-B12). Kısıtlı oturum yalnız /ben, /cikis ve değişim uçlarına girdiğinden telefon ders ve oturum takvimini indiremez. Öneri: yalnız ders ve oturum takvimi insin (geçmiş kayıt, karar ve devam inmesin); karar gelene kadar indirme kapalı kalır.', true),
  O('D01-A08', 'Dönem içinde hesabını silen hocanın dersleri hemen mi arşivlenir? (D01-B31, D02-B23)', 'Giriş bilgileri ve oturumlar hemen silinir (mağaza şartı); dersler dönem kilidine kadar açık kalır, D02 sahipsiz dersi kisiGetir.silinmeAni ile yöneticiye gösterir, devir yetkisi yöneticide (D02 hesap_silindi gerekçeli devir ucu), kilitte arşivlenir. D02 kimlik olayına abone olmaz.', true),
  O('D01-A09', 'Aynı uygulama kopyasında öğrenci bağlaması ve personel oturumu birlikte durabilir mi (hem öğrenci hem görevli olan kişi)? (D01-B44)', 'İlk sürümde bir kopyada tek hesap; mod hesabın türünden gelir. Sunucu buna ayrı denetim koymaz (cihaz ve oturum ayrı tablolar); asistan rolü gelince yeniden bakılır.', true),
  O('D01-A10', `İlk yönetici proje sahibi olacaksa onun @istanbul.edu.tr adresi var mı? (D01-B45)`, 'Varsa o adresle yonetici-ekle çalışır; yoksa ilk yönetici bölüm başkanı olarak açılır. Alan adı kuralına istisna açılmaz.', true),
  O('D01-A11', `Apple hesabı değişirse ya da TestFlight'tan App Store'a geçişte veri kaybolursa yüzlerce iPhone öğrencisinin yüz yüze değişimi nasıl karşılanır? (D01-B51)`, `Önce geçiş kendi iPhone'unda denenir. Ek olarak yöneticinin açtığı süreli bir geçiş penceresinde, hesaba bağlı Secure Enclave anahtarıyla imzalı yeniden bağlanma kabul edilebilir (App Attest yenilemesiyle aynı imza yolu); Apple ekip kimliği değişirse bu da çalışmaz, tek yol yüz yüze akış. Pencereyi açmak ürün kararı.`, true),
  O('D01-A12', 'Uygulama (lab) derslerini asistan yürütüyorsa asistan rolü ilk sürüme çekilsin mi; yetkileri ne olsun? (D01-B52, plan.html#acik)', `Rol listesi metin ve CHECK olduğundan yeni değer göçle eklenir; "bu dersin hocası mı" denetimi D02.dersYetkisi'nde tek yerde. Asistan gelirse ders başına atanır, pencere ve kafa sayısını yapar, teyit ve değişim onayı vermez; karar fakültenin cevabına bağlı.`, true),
  O('D01-A13', 'İnceleme hesabına hiç e-posta gitmesin mi? Kod e-postası kullanılamaz, ama giriş bildirimi bir güvenlik kuralıdır. (D14-B22)', 'Gitmesin: adres gerçek bir kutu olmayabilir, geri dönen e-posta göndericinin itibarını bozar; her giriş ve yanlış deneme zaten denetime ve loga yazılıyor. Kural istisnası olduğu için sahibin onayı gerekir; tasarım gönderilmeyecek biçimde kuruldu ve istisna yalnız ayardaki adresle eşleşen işaretli hesaba uygulanır.', true),
  O('D01-A14', `contracts.json ve öbür modüllerin tasarımına gereken eklemeler (hepsi yalnız ekleme, adı değişen iki dış yüz dışında).`, `D13: ortak Kimlik tipine girisOturumuId (oturumId yerine), roller [{ rol, kapsamBirimId }], oturumKapsami ve incelemeHesabi; Rol ve rota beyanı rollerine degisim_bekleyen değeri; OturumSonucu'nun gecersiz koluna neden ve bu nedenin 401 zarfının ayrıntısına taşınması; app.ts'in oturumDogrula'ya yalnız istek.kimlikBilgisi, an, X-Arka-Plan ve istek.istemci geçirmesi, gerçek D01 eklentisiyle köken senaryosu; app.ts açılışında kimlikDinleyicileriniKur ve kimlikDinleyicileriHazir. D01 dış yüzü: kimlikOlayiDinleyicisiKaydet yerine kimlikDinleyicileriniKur, incelemeHesaplari kaldırılır (tüketicisi yok), oturumlariKapat, girisOturumuGetir, hesabiSil, epostaNormallestir eklenir, yaprak işlevler modules/kimlik/yaprak.ts'te. contracts.json'da DELETE /v1/kimlik/oturumlar/{oturumId} yol parametresi {girisOturumuId} olur; /v1/kimlik/yonetim/yoneticiler yolu hoca rolünü de taşıdığı için roller adına çevrilebilir. D14: worker.ts açılışında kimlikDinleyicileriniKur; çizelgede bekleyen_kayit_kapatma 00:15 yerine 00:30 (donem_kilidi 00:20'den sonra), D01 işleri 00:45, 02:10, 02:20 ve saat başı :17 (missed: skip). D12 ile D14: D12'nin temizlik işlerini 04:00 ile 05:00 arasına koyan ortak kuralı D14-B05'in 03:00 ile 05:00 yasağıyla çelişir, iki modül tek kurala bağlamalı; D12-B19 (silinen öğrencinin satırını yeniden açma) yerine D01-B33 geçer; D12 geri yükleme komutu kimlikDinleyicileriniKur'dan sonra hesabiSil ve oturumlariKapat çağırır. D15: GizliAmac'a kayit_kodu_ozeti (API sürecinde zorunlu, işçide aranmaz; döndürmede eski kid 72 saat YALNIZ_DOGRULAMA), ayarlara kimlik.kayitKoduAcik ve kimlik.kanitReddiBaglamayiEngeller (ikisi de varsayılan false), kimlikOlayiDinleyicisi'nin isletim abonesi olarak dışa verilmesi (isletimEklentisi seçeneği kalkar), anahtar-uret komutunda kimlikDinleyicileriniKur. D11: projeksiyon abonesi olarak dinleyici işlevini dışa verir. D06: esitleme abonesi olarak hesap_silindi dinleyicisi (D06-B25'teki kurulum izi silmesi) ve ogrenciDurumuDegisti'nin teyit ve teyit reddinde çağrılması; oturumDogrula'yı doğrudan çağırmak yerine istek.kimlik ve istek.oturumHatasi'nı okur. D02: denemeDersiniKur (D02-A13) D01 işinden çağrılır. D03: denemeListesiniKur (D03-A07) D01 işinden çağrılır. D07: kayıt sırası D07-A07 ile aynı; REDDEDILDI'nin bağlamaya etkisi D01-A19 ayarına bağlı. D04: saat arayüzü simdi, bileşim kökünden parametreyle. D14 şablonu basvuru_silme_kodu oturumsuz silme kodu olarak pasif personele de gider.`, `D01 akışları bu eklemelerle kuruldu; bir modül eklemeyi kendi tasarımına almazsa yalnız çağrı yeri uyarlanır, kural değişmez. Bağımlılıklar tek yönlü kalır: abone modüller D01'i yalnız yaprak.ts üstünden içe aktarır, D01 aboneleri içe aktarmaz.`, false),
  O('D01-A15', 'Öğrenci kimliğinin anlamı: kayıt, karar, düzeltme ve devam tablolarındaki ogrenci_id hesap (kişi satırı) kimliğidir; öğrencinin kalıcı kimliği listedeki numaradır. D05, D08, D09 ve D10 bunu aynı okumalı.', 'Devam, rapor ve AKSİS özeti liste satırı (numara) üzerinden toplar; bir numaranın bütün hesapları ogrenciHesabiGetir({ numaralar }) ile bulunur (silinmiş hesabın kayıtları da sayılır). Çift anadalda ikinci numara gelirse (D03-B09) hesap ile numara arasına bağ tablosu eklenir.', false),
  O('D01-A16', `Değişim talebi girişsiz açılabildiği için, açık talep süresince eski cihazın kayıtlarını Beklemede tutmak (D07-B13) başkasının numarasıyla talep açarak gerçek öğrencinin kayıtlarını bekletmeye açıktır.`, `D07 eski cihazın kaydını talep açıkken bekletmesin; yalnız onaydan sonra gelen ve saati etkinlik bitişinden sonra olan kaydı ret ya da İncelemede alsın. Gerçek öğrenci açık talepleri /ben'de görür ve etkin cihazından reddeder (POST /v1/kimlik/cihaz-degisimi/{talepId}/ret); talep 72 saatte kendiliğinden düşer.`, false),
  O('D01-A17', 'Deneme dersinin sahibi ve listesi kimde? İnceleme öğrencisi deneme dersinin listesinde olmalı; D01 liste satırı yazamaz.', `Kapandı: D01'in inceleme_hesaplari_kurulumu işi aynı işlemde hocayı kurar, D02.denemeDersiniKur(tx, hocaKisiId) ile dersi kurdurur ya da yeni hocaya devrettirir ve dönen şubeye D03.denemeListesiniKur(tx, subeId, numara, ad) ile tek satırı kurdurur (D02-A13, D03-A07). D02'nin deneme_dersi_oturumlari işi yalnız oturumları üretir. incelemeHesaplari dış yüzü tüketicisi kalmadığı için kaldırıldı.`, false),
  O('D01-A18', `teknik.html'de bu bölüme göre güncellenecek cümleler; biri teknik.html#sunucu-ayarlar'daki anahtar kuralına dokunduğu için sahibin onayı gerekir.`, `Kod, veri modeli: "Giriş kodları yalnız hocalarda" yerine "yalnız personelde"; "Oturumlar ve giriş kodları kimlik modülünün iki tablosunda" yerine kimlik tablolarının listesi; cihaz kaydındaki son sıra numarası D06 kurulumlarında, App Attest sayaçları D07'de. Sunucu: kanca "isteğe kimliği (tür, kişi, roller, cihaz) ekler"; Kimlik satırındaki "iki tablo, beş uç" bu bölüme bağlanır. Anahtarlar: kayıt kodu için ayrı kayit_kodu_ozeti anahtarı listeye eklenir (D15 GizliAmac) ve giriş kodu anahtarının adres sayacında da kullanıldığı yazılır; teknik.html#dagitim-ayrinti-korunacak-anahtarlar'daki "kaybı yalnız 5 dakikalık kodları düşürür" cümlesi böylece doğru kalır. Öneri: bu ayrımla onaylansın; kayıt kodu giriş anahtarında kalsaydı anahtar kaybı ya da döndürme açık bütün kayıt kodlarını düşürürdü.`, true),
  O('D01-A19', 'Kanıt geçerli ama paket adı, imza sertifikası ya da App ID bizim değilse (D07 sonucu REDDEDILDI) telefon hesaba bağlansın mı? Plan "Sonuç yalnız etiket, kayıt reddedilmez" diyor (plan.html#kararlar-cihaz-dogrulamasi); D07-A01 bağlamanın reddini öneriyor. (D01-K43, D07-A01)', 'Tasarım iki seçimi de taşır: D15 ayarı kimlik.kanitReddiBaglamayiEngeller. Karar gelene kadar plan geçerli: ayar kapalı, telefon dogrulanamadi etiketiyle bağlanır, kanıt satırı REDDEDILDI kalır. Öneri D07-A01 ile aynı: ayar açılsın, çünkü kanıt uygulamanın bizim olmadığını olumlu biçimde gösteriyor (plan.html#hile). Yoklama kaydı hiçbir seçimde cihaz kanıtı yüzünden reddedilmez.', true),
  O('D01-A20', 'Teyitli numaraya gelen kayıt ve çakışan teyitsiz hesaplar: önerilen davranış kabul mü? (D01-B21)', 'Seçilen: teyitli numaraya gelen kayıt yeni hesap açmaz, değişim talebi açar; çakışan teyitsiz hesaplar toplu teyitten çıkar, hoca birini teyit edince öbürleri numara_baskasinda ile reddedilir, cihazları kapanır, kayıtları D07 kuralıyla ret alır. Seçenek: çakışan hesaplar reddedilmez, kapanmadan bekler ve hoca her birini ayrı ayrı karara bağlar (daha çok iş, sahte hesap birikir). Öneri seçilen.', true),
  O('D01-A21', 'Telefon kuyruğunun boşaldığını hiç bildirmezse silme 7 gün sonra gönderilmemiş kayıtlara bakmadan yapılsın mı? (D01-B29)', 'Seçilen: 7 gün (plan.html#kararlar-gonderme-suresi\'ndeki beklenen gönderme süresi) dolunca gecelik iş siler; istekten önce imzalanmış ve sonra gelen kayıtlar kabul edilir, sonrakiler sayılmaz. Seçenek: süre uzatılır (ör. 14 gün) ya da silme yalnız bildirimle olur; ikincisi kaybolan telefonda mağaza şartını karşılamaz. Öneri seçilen.', true),
  O('D01-A22', 'Onay bekleyen başvuru kendiliğinden silinsin mi? Envanter önerisi 30 günde silinmesiydi. (D01-B32)', 'Seçilen: onay bekleyen başvuru kendiliğinden silinmez; sahibi oturumsuz silme koduyla her an siler, reddedilmiş başvuru retten 30 gün sonra silindi olur. Seçenek (envanter önerisi): onay bekleyen başvuru 30 günde silindi olur; yönetici geç bakarsa hoca yeniden başvurmak zorunda kalır. Öneri seçilen; yönetici listesi bekleme süresini gösterir.', true),
  O('D01-A23', 'Son tüm kapsamlı yönetici kendi hesabını silebilsin mi? Envanter önerisi 409 ile engellemekti. (D01-B35)', 'Seçilen: pasifleştirme ve rol geri alma engellenir (KIMLIK_SON_YONETICI), kendi hesabını silmesi engellenmez; silme mağaza şartıdır ve kurtarma yolu SSH ile yonetici-ekle komutudur. Seçenek (envanter önerisi): son tüm kapsamlı yöneticinin silmesi de 409 alır, önce başka yönetici eklenir; bu, mağazanın "her zaman silinebilir" şartıyla çatışır. Öneri seçilen.', true),
  O('D01-A24', 'Adres başına bekleme sahibini kilitleyebilir mi? Hangi denge seçilsin? (D01-B07)', 'Seçilen: bekleme yalnız bekleme başladıktan sonra üretilmiş koda açıktır; sahip yeni kod isteyip girer, saldırganın saatte birkaç isteği onu durduramaz. Kalan risk: adresi bilen biri sürekli deneme göndererek sahibin yeni kodunu 3 yanlışla düşürebilir (bugün de 3 yanlış kuralı böyle işler); bu saniyede çok istek ister ve denetim kaydında görünür. Seçenek 1: bekleme (adres, istemci IP) çiftine bağlanır, adres başına üst sınır yüksek tutulur; kampüs NAT\'ında hoca ile saldırgan aynı IP\'yi paylaşabilir. Seçenek 2: başarılı girişten sonra tarayıcıya ve telefona imzalı cihaz çerezi verilir, çerezli istemci adres beklemesinden muaf kendi sayacını kullanır (OWASP cihaz çerezi deseni); en güçlü koruma, ama yeni ayar ve çerez ister. Öneri: seçilen kural ilk sürümde, cihaz çerezi kötüye kullanım görülürse.', true),
  O('D01-A25', 'Listede hiç görünmeyen teyitsiz kayıt ne zaman kapansın? (D01-B20, D12-A03)', 'Seçilen, D12-A03 ile aynı: oluşturmadan sonra iki birim ve dönem kilidi geçmiş ve en az 30 günlük hesap kapanır. Seçenek: bir kilit (geç gelen liste öğrenciyi yeniden kaydolmaya zorlar) ya da hiç kapanmaz (satır ve sahte hesap birikir). Öneri seçilen; sayı BEKLEYEN_KAPATMA_KILIT sabitindedir.', true),
];

const spec = {
  id: 'D01',
  module: 'kimlik',
  summary: `Kimlik modülü hocanın ve yöneticinin e-posta koduyla girişini, öğrencinin numara ve isimle tek telefona bağlanan kaydını, giriş oturumlarını ve yönetici kapsamını sahiplenir. Personel tek hesap türüdür; hoca ve yönetici rolleri ayrı tabloda durur ve her istekte veritabanından okunur, böylece geri alınan yetki açık oturumda da hemen düşer; rol denetimi D13'ün rota beyanında, kapsam denetimi D01'in yetkiDenetle işlevindedir. Öğrencinin hesabı, cihazları, açık anahtarları, cihaz değişimi talepleri, ilk kayıt teyidinin alanları, kayıt kodları ve hesap silme istekleri bu modülün tablolarındadır; kanıtı D07 doğrular, teyit listesi D09'da, e-postayı D14 gönderir. Kodlar, oturum anahtarları ve QR değerleri yalnız özet olarak saklanır, kod isteği her durumda aynı cevabı aynı sürede verir. Öbür modüller kimliği yalnız kökteki oturum kancasından ve dış yüz işlevlerinden alır.`,
  tables,
  endpoints: endpoints.map(({ grup, ...e }) => e),
  jobs,
  state_machines,
  invariants,
  exports: exportsList,
  files,
  tests,
  resolved_gaps,
  contradictions_resolved,
  open_points,
};

// ---------------------------------------------------------------- error catalog (for html and contracts)
const hatalar = [
  ['KIMLIK_OTURUM_YOK', 401, `Kancanın kodu: kimlik bilgisi var ama tanınmıyor ya da satırı silinmiş. Kimlik bilgisi hiç yoksa D13'ün API_KIMLIK_GEREKLI kodu döner.`],
  ['KIMLIK_OTURUM_BITTI', 401, `Kancanın kodu: oturum kapandı, süresi doldu ya da öğrencinin cihazı kapandı; neden D13 zarfının ayrıntısında (suresi_doldu, islemsizlik, cikis, kendisi_kapatti, yonetici, en_eski, yenilendi, pasif, cihaz_degisimi, degisim_ret, degisim_iptal, degisim_zaman_asimi, teyit_ret, bekleme_bitti, inceleme_bitti, cihaz_kapandi, olay_komutu, geri_yukleme).`],
  ['KIMLIK_KOKEN_GECERSIZ', 403, `İstemci panel olan giriş Origin taşımıyor (istek.panelden false); çerez kurulmaz. Başka kökenli Origin'i D13 API_KOKEN_GECERSIZ ile önce keser.`],
  ['KIMLIK_KAPSAM_YETERSIZ', 403, 'Yönetici kapsamı istenen işi kapsamıyor: kapsamlı yönetici tüm kapsamlı yönetici ekleyemez, kapsamı dışındaki birime rol veremez.'],
  ['KIMLIK_YENIDEN_GIRIS_GEREKLI', 403, 'Personelin ilk silme isteği için oturum 15 dakikadan eski.'],
  ['KIMLIK_CIHAZ_KANITI_REDDEDILDI', 403, 'D07 kanıtın başka ya da değiştirilmiş uygulamayı gösterdiğini söyledi ve kimlik.kanitReddiBaglamayiEngeller açık; hiçbir satır yazılmaz. Ayar kapalıyken dönmez (D01-A19).'],
  ['KIMLIK_KAYIT_KODU_KAPALI', 403, 'kimlik.kayitKoduAcik false iken kayıt kodu üretme ya da kullanma.'],
  ['KIMLIK_EPOSTA_GECERSIZ', 400, 'Biçim ya da alan adı kuralı tutmuyor; adresin varlığını söylemez.'],
  ['KIMLIK_BOLUM_GECERSIZ', 400, 'Bölüm seçilen birime ait değil ya da yok (D02.birimGetir).'],
  ['KIMLIK_KOD_GECERSIZ', 400, 'Kod yanlış, süresi geçmiş, kullanılmış ya da hiç yok; hepsi aynı.'],
  ['KIMLIK_KAYIT_KODU_GECERSIZ', 400, 'Kayıt kodu yanlış ya da geçersiz; numaranın açık kodunda yanlış sayısı artar ve bu artış hata cevabından önce işlenir.'],
  ['KIMLIK_DOGRULAMA_DEGERI_GECERSIZ', 400, 'D07 değeri yok, süresi geçmiş, kullanılmış ya da başka amaçlı.'],
  ['KIMLIK_IMZA_GECERSIZ', 400, 'App Attest yenilemesinde Secure Enclave imzası tutmuyor.'],
  ['KIMLIK_DEGER_GECERSIZ', 400, 'Değişim onayında QR değeri tutmuyor ya da süresi geçmiş.'],
  ['KIMLIK_BEKLEME_SURUYOR', 429, 'Adres beklemede ve kod, bekleme başladıktan sonra üretilmiş açık kodlardan biri değil; beklemeSaniye ve Retry-After ile.'],
  ['KIMLIK_HESAP_BULUNAMADI', 404, 'Hesap yok, yetki ya da kapsam dışı (varlık sızmaz).'],
  ['KIMLIK_OTURUM_BULUNAMADI', 404, 'Oturum yok ya da başkasının.'],
  ['KIMLIK_TALEP_BULUNAMADI', 404, 'Değişim talebi yok ya da hoca yetkili değil.'],
  ['KIMLIK_SILME_ISTEGI_YOK', 404, 'İptal edilecek sıradaki silme isteği yok.'],
  ['KIMLIK_OGRENCI_LISTEDE_DEGIL', 404, 'Numara hocanın derslerinin etkin listesinde yok.'],
  ['KIMLIK_HESAP_DURUMU_UYGUN_DEGIL', 409, 'İşlem hesabın şimdiki durumunda yapılamaz (ör. etkin cihazlı öğrenciyi hoca silemez, başka kapsamla yönetici olan kişiye yeni kapsam, iPhone olmayan cihazda App Attest yenilemesi).'],
  ['KIMLIK_SON_YONETICI', 409, 'Son etkin tüm kapsamlı yönetici pasifleştirilemez, rolü alınamaz.'],
  ['KIMLIK_NUMARA_TEYITLI', 409, 'Numarada teyitli başka hesap var.'],
  ['KIMLIK_COK_BEKLEYEN_HESAP', 409, 'Numarada 5 etkin cihazlı teyitsiz hesap var ya da son 24 saatte 10 hesap açıldı; hoca ekranında çözülür, kayıt kodu aşar.'],
  ['KIMLIK_COK_DEGISIM_TALEBI', 409, 'Hesapta doğrulanamayan cihazlı 3 açık değişim talebi var; talepler 72 saatte düşer ya da hesabın etkin cihazından reddedilir.'],
  ['KIMLIK_CIHAZ_BAGLI', 409, 'Donanım anahtarı başka numaranın hesabına bağlı.'],
  ['KIMLIK_CIHAZ_KAPANDI', 409, 'Donanım anahtarının cihazı kapanmış ya da hesabı aktif değil; telefon yeni anahtar üretip değişim yolundan gelir.'],
  ['KIMLIK_TALEP_KAPANMIS', 409, 'Talep bekliyor durumunda değil.'],
  ['KIMLIK_DEGISIM_GEREKMIYOR', 409, 'Numarada teyitli hesap yok; kayıt ucu kullanılır.'],
  ['KIMLIK_GONDERILMEMIS_KAYIT_VAR', 409, 'Öğrenci çıkışında bekleyen öğe var.'],
];
const usedCodes = new Set(endpoints.flatMap(e => e.errors));
for (const c of usedCodes) if (!hatalar.find(h => h[0] === c)) throw new Error('error code missing from catalog: ' + c);

// ---------------------------------------------------------------- html
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const a = (doc, id, label) => `<a href="${doc}.html#${id}">${esc(label)}</a>`;
const code = s => `<code>${esc(s)}</code>`;
const row = (k, v) => `<div class="row"><div class="k">${k}</div><div>${v}</div></div>`;
const tableHtml = (head, rows) => `<table><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

const grupAd = { giris: 'Giriş ve oturum', basvuru: 'Hoca başvurusu', ogrenci: 'Öğrenci kaydı, cihaz ve kayıt kodu', silme: 'Hesap silme', yonetim: 'Yönetim' };
const fmtObj = o => Object.keys(o).length ? '<ul>' + Object.entries(o).map(([k, v]) => `<li>${code(k)}: ${esc(v)}</li>`).join('') + '</ul>' : '<p>Gövde yok.</p>';

let h = '';
h += '<section id="kimlik">\n';
h += '<h2>Kimlik, giriş ve yetki</h2>\n';
h += `<p>${esc(spec.summary)}</p>\n`;

// Amaç ve sınırlar
h += '<h3>Amaç ve sınırlar</h3>\n<div class="rows">\n';
h += row('Amaç', `Hoca ve yönetici girişi (${a('plan', 'kararlar-roller', 'Roller, Hoca girişi, Hoca oturumu')}, ${a('plan', 'kararlar-tek-etkenli-giris', 'Tek etkenli giriş')}), öğrenci kaydı ve tek telefona bağlama (${a('plan', 'kararlar-e-posta-gonderimi', 'Öğrenci kaydı, İlk kayıt teyidi')}, ${a('plan', 'kararlar-ogrenci-telefonu', 'Öğrenci telefonu')}), hesap silme (${a('plan', 'kararlar-hesap-silme', 'Hesap silme')}) ve inceleme hesapları (${a('plan', 'kararlar-inceleme-hesaplari', 'İnceleme hesapları')}). Yöntem ve anahtarlar ${a('teknik', 'sunucu-kimlik', 'teknik: Kimlik')} ve ${a('teknik', 'sunucu-ilk-yonetici', 'İlk yönetici')} satırlarında.`) + '\n';
h += row('Sahip olduğu', `11 tablo, 28 uç, 5 iş; kökteki oturum kancası ${code('oturumDogrula')} (kökte D13 kaydeder), ${code('apps/server/src/cli/yonetici-ekle.ts')} komutu ve Caddy\'nin sunduğu ${code('docker/caddy/sayfalar/hesap-silme.html')} sayfası. Göç ${code('apps/server/migrations/<UTC zaman>_kimlik_<açıklama>/')} altında; klasör D12\'nin, içerik yalnız bu tablolar.`) + '\n';
h += row('Yapmadığı', 'Cihaz kanıtını doğrulamaz ve kayıt kararı vermez (D07); ilk kayıt teyidi listesini ve uçlarını tutmaz (D09, teyit alanlarını D01 yazar); e-postayı göndermez ve gönderim sınırını saymaz (D14); denetim tablosu D09\'un; rota kaydı, rol ve kimlik türü beyanının denetimi (API_KIMLIK_GEREKLI, API_ROL_YETKISIZ), hata zarfı, köken kuralı ve çerez ile Bearer seçimi D13\'ün; ortak Kimlik tipi ve çerez adı D13\'ün packages/contracts/src/ortak dosyalarında; kuyruk öğesinin hesap denetimi D06\'nın; birim ve bölüm listesi, deneme dersi D02\'nin; deneme listesi D03\'ün.') + '\n';
h += row('Hesap silme sayfası', `Girişsiz, durağan, API düşse de açılır. Rolüne göre dört satır yazar: ne silinir, ne kalır, neden kalır ve ne kadar kalır (silinen ve kalan alanlar: Durumlar ve kurallar; süre ${a('plan', 'acik-saklama-suresi', 'Saklama süresi')} açık noktasına bağlı). Hocaya: panele e-posta koduyla gir, Hesabım ekranından sil; hesabı pasifse paneldeki kodla silme ekranından (e-posta koduyla, oturumsuz). Öğrenciye: uygulamada Hesabımı sil; telefonu yoksa, hesabı reddedildiyse ya da kapandıysa hocasına kimliğiyle yüz yüze başvur (reddedilen ve kapanan hesapta yazdığın isim ve telefon bilgisi o anda silinmiştir, numara ve teyit bilgisi kalır). Onaylanmamış başvuru sahibine: paneldeki kodla silme ekranı (e-posta koduyla). Bağlantı yalnız aynı adresteki panele verilir; Play\'in veri güvenliği formuna bu adres yazılır.`) + '\n';
h += row('Çağırdığı dış yüzler', [
  'D02: birimGetir, subeGetir, dersYetkisi, kilitliBirimDonemleri, denemeDersiniKur',
  'D03: numaraIleEslestir, ogrencininEtkinSatirlari, listeSatirlari, listeDegisikligiDinleyicisiKaydet, denemeListesiniKur',
  'D06: ogrenciDurumuDegisti (modules/esitleme/yaprak.ts)',
  'D07: dogrulamaDegeriniTuket, cihazKanitiniDogrula, yenidenDegerlendir',
  'D09: denetimeYaz (modules/duzeltmeler/yaprak.ts)',
  'D12: islem, danismaKilidi, saklamaIsleyicisiKaydet, kisitAdi, testVeritabaniHazirla',
  'D13: rotalariKaydet, uygulamaHatasi, istekKimligi, hizSinifi (girissiz, oturum, agir); ortak Kimlik tipi ve CEREZLER',
  'D14: isGonder, isTanimla, epostaGonder, epostaSiniriDenetle',
  'D15: ayarlar, gizliAnahtar (giris_kodu_ozeti, kayit_kodu_ozeti), log, uyariAc',
  'Saat: D04\'ün simdi() arayüzü, bileşim kökünden parametreyle (D01-A14)',
  'Abone olanlar (D01 bunları içe aktarmaz, bileşim kökü kimlikDinleyicileriniKur ile verir): D11 projeksiyon, D15 isletim, D06 esitleme',
].map(esc).join('<br>')) + '\n';
h += row('Dış yüz', exportsList.map(x => code(x.name)).join(', ') + `. İmzalar aşağıdaki ayrıntıda; [yaprak] işaretliler başka modül çağırmaz ve ${code('apps/server/src/modules/kimlik/yaprak.ts')} dosyasındadır, çağıranlar onları oradan içe aktarır (D07 ile dosya döngüsü kurulmaz). Sözleşmeye eklenecekler ve adı değişenler D01-A14'te.`) + '\n';
h += '</div>\n';
h += `<details><summary>Dış yüz imzaları: ${exportsList.length} işlev. tx alanlar çağıranın işleminde çalışır; oturumDogrula son kullanımı kendi kısa işleminde yazar, yetkiDenetle, kimlikDinleyicileriniKur ve epostaNormallestir veritabanına dokunmaz</summary>\n<div class="rows">\n`;
for (const x of exportsList) h += row(code(x.name), `<p>${code(x.signature)}</p><p>${esc(x.purpose)}</p>`) + '\n';
h += '</div></details>\n';

// Tablolar
h += '<h3>Tablolar</h3>\n';
h += `<p>Adlar ASCII Türkçe ve çoğul, kimlikler ${code('uuidv7()')}, anlar ${code('timestamptz')} ve saat arayüzünden, durum listeleri metin ve CHECK (${a('teknik', 'veritabani', 'teknik: Veritabanı')}, ${a('teknik', 'kod-veri-modeli', 'Veri modeli')}). Kısmi tekil dizinler kuralın kendisidir: teyitli ve silinmemiş numara, öğrencide tek etkin cihaz, cihazda tek açık talep, tek açık kayıt kodu, tek sıradaki silme isteği.</p>\n`;
for (const t of tables) {
  h += `<details><summary>${code(t.name)}: ${esc(t.purpose.split('. ')[0].replace(/\.$/, ''))}</summary>\n`;
  h += `<p>${esc(t.purpose)}</p>\n`;
  h += tableHtml(['Sütun', 'Tür', 'Boş', 'Varsayılan', 'Not'], t.columns.map(c => [code(c.name), esc(c.type), c.null ? 'evet' : 'hayır', c.default ? code(c.default) : '', esc(c.note)])) + '\n';
  h += `<p>Dizinler:</p><ul>${t.indexes.map(i => `<li>${code(i)}</li>`).join('')}</ul>\n`;
  h += `<p>Kısıtlar:</p><ul>${t.constraints.map(i => `<li>${code(i)}</li>`).join('')}</ul>\n`;
  h += '</details>\n';
}

// Uç noktalar
h += '<h3>Uç noktalar</h3>\n';
h += `<p>Hepsi ${code('/v1/kimlik')} önekli; yönetici uçları ${code('/v1/kimlik/yonetim')} altında. Numara, e-posta, kod ve isim yalnız gövdede, adres satırında yalnız UUID. Yanıt zarfı, sayfalama ve hız sınıfları D13\'ün; giriş uçları en düşük sürüm denetimine takılmaz (${a('plan', 'dagitim-guncelleme-ilkesi', 'Güncelleme ilkesi')}). Çerez ve Bearer kuralı ${a('teknik', 'sunucu-kimlik', 'teknik: Kimlik')}, IP sınırının yalnız girişsiz uçlarda olması ${a('teknik', 'sunucu-guvenlik', 'teknik: Güvenlik')}. Her rota kimlik ve rol beyanıyla kaydedilir; değişim bekleyen kısıtlı oturum yalnız degisim_bekleyen rolünü taşır. Oturum rotalarında şu kodlar her uçta geçerlidir ve uç listelerine yazılmaz: D13'ün API_KIMLIK_GEREKLI, API_ROL_YETKISIZ ve API_KOKEN_GECERSIZ kodları, D01 kancasının KIMLIK_OTURUM_YOK ve KIMLIK_OTURUM_BITTI kodları (nedeni zarfın ayrıntısında).</p>\n`;
h += '<details><summary>28 uç tek tabloda: yöntem, yol, istemci ve kim çağırır</summary>\n';
h += tableHtml(['Yöntem', 'Yol', 'İstemci', 'Yetki'], endpoints.map(e => [esc(e.method), code(e.path), esc(e.client), esc(e.auth)])) + '\n';
h += '</details>\n';
for (const g of Object.keys(grupAd)) {
  const list = endpoints.filter(e => e.grup === g);
  h += `<details><summary>${esc(grupAd[g])}: ${list.length} ucun isteği, cevabı, hatası ve tekrarı</summary>\n<div class="rows">\n`;
  for (const e of list) {
    h += row(code(e.method + ' ' + e.path),
      `<p>${esc(e.auth)} İstemci: ${esc(e.client)}.</p><p>İstek:</p>${fmtObj(e.request)}<p>Cevap:</p>${fmtObj(e.response)}<p>Hatalar: ${e.errors.length ? e.errors.map(code).join(', ') : 'yalnız kanca ve D13 kodları'}.</p><p>Tekrar: ${esc(e.idempotency)}</p><p>Sınır: ${esc(e.rate_limit)}</p>`) + '\n';
  }
  h += '</div></details>\n';
}

// İşler
h += '<h3>İşler</h3>\n';
h += `<p>İş adı kuyruk adıdır, işleyiciler ${code('apps/server/src/jobs/kimlik/')} altında, ${code('jobs/kimlik/index.ts')} tanımları D14.isTanimla ile verir. İş verisi yalnız iç kimlik taşır, iki kez çalışan iş aynı sonucu verir; e-posta hiçbir zaman kuyruğa girmez (${a('plan', 'kararlar-roller', 'Hoca girişi')}).</p>\n<div class="rows">\n`;
for (const j of jobs) h += row(code(j.name), `<p>${esc(j.does)}</p><p>Zaman: ${esc(j.schedule)}</p><p>Tekrar: ${esc(j.idempotency)}</p>`) + '\n';
h += row(`${code('yonetici-ekle')} <span class="tag mute">Komut</span>`, `<p>İş değil, sunucu makinesinde SSH ile girenin göç servisinin imajından ${code('docker compose run --rm')} ile çalıştırdığı komut (${a('teknik', 'sunucu-ilk-yonetici', 'İlk yönetici')}). Bağımsız değişkenler: ${code('--eposta')} (zorunlu, @istanbul.edu.tr), ${code('--ad-soyad')} (yeni hesapta zorunlu), isteğe bağlı ${code('--hoca')} (hoca rolünü de verir). Adres yoksa aktif personel açar, varsa hesabı aktif yapar; tüm kapsamlı yönetici rolünü verir; iş başlamadan kimlikDinleyicileriniKur çağırır, dinleyiciler kurulamazsa çalışmaz; kimlik.komut_satiri_yonetici denetimi yapan komut_satiri. Kod ya da şifre üretmez, aynı girdiyle ikinci çalıştırma satır eklemez. Çıktı yalnız iç kimlik ve "yeni hesap" ya da "var olan hesap".</p>`) + '\n';
h += '</div>\n';

// Durumlar ve kurallar
h += '<h3>Durumlar ve kurallar</h3>\n';
h += '<div class="rows">\n';
h += row('Kod', `6 rakam, 300 saniye, tek kullanım; kişinin aday açık kodlarında ortak 3 yanlışta düşer. Özet: HMAC-SHA256, giriş kodu özet anahtarı, kişiye ve amaca bağlı; karşılaştırma ${code('timingSafeEqual')}. Bekleme 3. yanlıştan sonra 30 saniye, ikişer katlanır, en çok 900 saniye, 24 saatte sıfırlanır; beklemede yalnız bekleme başladıktan sonra üretilmiş kod denenebilir, böylece adresi bilen yabancı sahibi dışarıda tutamaz (D01-B07, D01-A24). Kayıt kodu ayrı anahtarla (${a('teknik', 'sunucu-ayarlar', 'teknik: Ayarlar')}, her anahtar tek iş).`) + '\n';
h += row('Oturum', 'Anahtar 256 bit rastgele, veritabanında SHA-256 özeti. Telefon 30 gün, panel 24 saat ve 1 saat işlemsizlik; öğrencide bitiş yok, cihaz kapanınca oturum da düşer. En çok 3 etkin personel oturumu; 4. girişte en eski panel, yoksa en eski telefon kapanır; telefon yenilemesi kendi oturumunun yerine geçer. Personel akışlarının kilit sırası: kisiler, eposta_giris_durumlari, giris_kodlari, giris_oturumlari.') + '\n';
h += row('Yetki', 'Kanca kimliği ekler; rol ve kimlik türünü D13 rota beyanı denetler (401 API_KIMLIK_GEREKLI, 403 API_ROL_YETKISIZ); yönetici kapsamını modüller yetkiDenetle ile, kaynak sahipliğini modül servisi denetler (404). Yönetici kapsamı hedefin birimiyle, hedef yöneticiyse onun rol kapsamıyla karşılaştırılır. Değişim bekleyen oturum yalnız degisim_bekleyen rolünü taşır, bu yüzden yalnız /ben, /cikis ve değişim uçlarına girer.') + '\n';
h += row('Öğrenci', `Kayıtta cihaz ve anahtar satırları yazılır, sonra D07 kanıtı doğrular (sonuç etikettir, ${a('plan', 'kararlar-cihaz-dogrulamasi', 'Cihaz doğrulaması')}), D03 eşleştirir; numarada teyitli hesap varsa kayıt cihaz başına bir değişim talebine döner, kapanmış cihazın anahtarı yeniden oturum alamaz. Teyit öğrencinin etkin liste satırı olan dersin hocasında; toplu yol yalnız eşleşmiş, doğrulanmış, çakışmasız hesapta (${a('plan', 'kararlar-e-posta-gonderimi', 'İlk kayıt teyidi')}).`) + '\n';
h += row('Silmede silinen', 'Personel: e-posta, giriş kodları, oturum satırları; roller geri alınır (adres bekleme satırı yalnız HMAC taşır, 24 saatte kendiliğinden gider). Öğrenci: oturum satırları, girilen isim, cihazların etkinliği ve ayrıntıları (model, son görülme, sürüm, kanal, güvenlik düzeyi, doğrulanmış açılış, iOS alanları); telefon sayaçlarını D15 hesap_silindi olayıyla siler. Reddedilen ve kapanan öğrenci hesabında girilen isim ve cihaz ayrıntıları o anda silinir.') + '\n';
h += row('Silmede kalan', `Kişi satırı silindi işaretiyle (hocada ad-soyad ve bölüm, öğrencide numara ve teyit bilgisi), cihaz platformu, doğrulama özeti ve isSystemUser, açık anahtarlar; liste satırı, yoklama kayıtları, düzeltmeler ve denetim kaydı öbür modüllerde (${a('plan', 'kararlar-hesap-silme', 'Hesap silme')}). Saklama süresi dolunca numara ve isim D12\'nin saklama işiyle, D01\'in kaydettiği işleyiciyle silinir (${a('plan', 'acik-saklama-suresi', 'Saklama süresi')}).`) + '\n';
h += '</div>\n';
h += '<details><summary>' + akislar.length + ' akışın adım sırası: kilit sırası ve işlem sınırı buradan okunur</summary>\n<div class="rows">\n';
for (const [ad, adimlar] of akislar) h += row(esc(ad), `<ol>${adimlar.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`) + '\n';
h += '</div></details>\n';
for (const sm of state_machines) {
  h += `<details><summary>${code(sm.name)}: ${esc(sm.states.join(', '))}</summary>\n<ul>`;
  for (const t of sm.transitions) h += `<li>${esc(t.from)} → ${esc(t.to)} (${esc(t.by)}): ${esc(t.when)}</li>`;
  h += '</ul></details>\n';
}
h += '<div class="callout"><p><strong>Her zaman doğru kalanlar</strong></p><ul>';
for (const i of invariants) h += `<li>${esc(i)}</li>`;
h += '</ul></div>\n';

// Hata kodları
h += '<h3>Hata kodları</h3>\n';
h += `<p>Kodlar ${code('packages/contracts/src/kimlik.ts')} içinde, her biri tek HTTP durumuna bağlı; ${code('hatalar.ts')} birleştirir (D13). Kimlik bilgisi yokluğu, rol ve köken için D13'ün API_ kodları döner, D01 bunların kopyasını tanımlamaz. Ayrıntı yalnız anahtarın sahibine döner; kaynak görülmemeliyse 404.</p>\n`;
h += `<details><summary>${hatalar.length} kod: 401 oturum, 403 ilke, 400 girdi, 404 görülmeyen, 409 durum, 429 bekleme</summary>\n`;
h += tableHtml(['Kod', 'HTTP', 'Ne zaman'], hatalar.map(([k, s, n]) => [code(k), String(s), esc(n)])) + '\n';
h += '</details>\n';

// Testler
h += '<h3>Testler</h3>\n';
h += `<p>Türkçe davranış senaryoları ${code('apps/server/test/features/kimlik/')}, adımlar ${code('steps/kimlik/')}, veri kurucusu ${code('support/kurucular/kimlik.ts')}; saat D04\'ün sahte saati, posta D14\'ün sahte postası, kanıt doğrulayıcısı sahte. Yetki ve hile senaryoları ret beklentisiyle önce kırmızı yazılır (${a('plan', 'baslangic', 'Başlangıç')}); sabitler sözleşmeden içe alınır, yokluk iddiası pozitif kontrolle birlikte.</p>\n`;
h += `<details><summary>${tests.length} test: davranış, özellik, sözleşme, mutasyon ve yük</summary>\n`;
h += tableHtml(['Test', 'Tür', 'Doğruladığı'], tests.map(t => [esc(t.name), esc(t.kind), esc(t.asserts)])) + '\n';
h += '</details>\n';

// Netleştirilenler
h += '<h3>Netleştirilenler</h3>\n';
h += `<details><summary>${resolved_gaps.length} boşluğun kararı ve gerekçesi</summary>\n`;
h += tableHtml(['Boşluk', 'Karar', 'Neden'], resolved_gaps.map(g => [code(g.gap), esc(g.decision), esc(g.why)])) + '\n';
h += '</details>\n';
h += `<details><summary>${contradictions_resolved.length} çelişkinin çözümü</summary>\n`;
h += tableHtml(['Çelişki', 'Çözüm'], contradictions_resolved.map(c => [code(c.id), esc(c.resolution)])) + '\n';
h += '</details>\n';

// Açık noktalar
h += '<h3>Açık noktalar</h3>\n';
h += `<p>Sahip kararı gerekenler tasarımda en dar ve geri alınabilir yolla kuruldu; sözleşme notları modüller arası eklemelerdir. Planın kendi açık noktaları: ${a('plan', 'acik', 'Açık noktalar')}.</p>\n<div class="rows">\n`;
for (const o of open_points) {
  const tag = o.needs_owner ? '<span class="tag warn">Sahip kararı</span>' : '<span class="tag mute">Sözleşme</span>';
  h += row(`${code(o.id)} ${tag}`, `<p>${esc(o.question)}</p><p>Öneri: ${esc(o.recommendation)}</p>`) + '\n';
}
h += '</div>\n';
h += '</section>\n';

// ---------------------------------------------------------------- guards and write
const all = JSON.stringify(spec) + h;
if (/[–—]/.test(all)) throw new Error('contains U+2013 or U+2014');
if (/KVKK/.test(all)) throw new Error('contains KVKK');
fs.writeFileSync(path.join(OUT, 'spec', 'D01.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'frag', 'D01.html'), h, 'utf8');
console.log('written', { tables: tables.length, endpoints: endpoints.length, jobs: jobs.length, exports: exportsList.length, files: files.length, tests: tests.length, gaps: resolved_gaps.length, contradictions: contradictions_resolved.length, open: open_points.length, errors: hatalar.length, htmlBytes: Buffer.byteLength(h) });

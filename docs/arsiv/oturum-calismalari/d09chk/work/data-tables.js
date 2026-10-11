// D09 tablo tanımları (spec ve fragment aynı veriden üretilir).
const c = (name, type, nul, def, note) => ({ name, type, null: nul, default: def, note });

const KATALOG_KODLARI = "'GOREVLENDIRME','OGRENCI_ISLERI_YAZISI','KURUL_KARARI','BEYANA_DAYALI','TELEFON_YOK_CALISMIYOR','QR_OKUTAMADI'";
const BELGELI = "'GOREVLENDIRME','OGRENCI_ISLERI_YAZISI','KURUL_KARARI'";
const ELLE = "'TELEFON_YOK_CALISMIYOR','QR_OKUTAMADI'";

module.exports = [
  {
    name: 'duzeltmeler',
    purpose: "Hocanın bir oturum ve liste satırı (öğrenci) için girdiği her düzeltme: Görevli, Belgeli düzeltme, beyana dayalı düzeltme ve elle ekleme, ayrıca bunları geri alan satırlar. Yalnız eklenir; değiştirme ve geri alma yeni satırdır. Oturum ve liste satırı başına satırlar tek doğrusal zincir kurar, etkin düzeltme zincirin son satırıdır.",
    columns: [
      c('id', 'uuid', false, 'uuidv7()', "Satırın kimliği. İstemcinin ürettiği UUIDv7 (panel öğesi ya da kuyruk öğesi) tekrar anahtarıdır; sunucu kendisi yazarsa varsayılan."),
      c('islem_id', 'uuid', false, '', "Aynı istekte yazılan satırların ortak işlem kimliği; kuyruk öğesinde satırın kendi kimliği."),
      c('tur', 'text', false, '', "DUZELTME ya da GERI_ALMA (CHECK)."),
      c('sebep_kodu', 'text', true, '', "Katalogdaki sebep kodu; CHECK listesi packages/core/src/duzeltmeler/katalog.ts'ten üretilir. GERI_ALMA'da boş, DUZELTME'de dolu."),
      c('donem_id', 'uuid', false, '', "Oturumun dönemi; FK donemler (D02)."),
      c('ders_id', 'uuid', false, '', "Oturumun dersi, yazarken oturumdan kopyalanır; FK dersler (D02). Yetki ve liste sorguları için."),
      c('oturum_id', 'uuid', false, '', "Düzeltilen ders oturumu; FK oturumlar (D02)."),
      c('liste_satiri_id', 'uuid', false, '', "Düzeltilen öğrenci: oturumun şubelerinden birindeki liste satırı; FK liste_satirlari (D03). Hesabı olmayan öğrenci de bu satırla düzeltilir."),
      c('kayit_donem_id', 'uuid', true, '', "İlgili kaydın dönemi; kayit_id ile birlikte boş ya da dolu, doluysa donem_id'ye eşit."),
      c('kayit_id', 'uuid', true, '', "İlgili yoklama kaydı (isteğe bağlı); FK (kayit_donem_id, kayit_id) yoklama_kayitlari (D05)."),
      c('belge_no', 'text', true, '', "Görevli ve Belgeli kodlarında zorunlu, ötekilerde boş; NFC, kırpılmış, 1 ile 64 karakter, denetim karakteri yok; tekil değil, loga yazılmaz."),
      c('teori_saat', 'smallint', true, '', "Düzeltmenin kapsadığı teori saati; GERI_ALMA'da boş, DUZELTME'de 0 ile 24 arası ve oturumun teori saatini aşmaz (kural kodunda)."),
      c('uygulama_saat', 'smallint', true, '', "Kapsanan uygulama saati; GERI_ALMA'da boş, DUZELTME'de 0 ile 24 arası, teori ile toplamı en az 1; OGRENCI_ISLERI_YAZISI'nda 0."),
      c('onceki_duzeltme_id', 'uuid', true, '', "Zincirde yerine geçilen ya da geri alınan satır; zincir başında boş; aynı oturum ve liste satırında olmalı (bileşik FK)."),
      c('sorun_bildirimi_id', 'uuid', true, '', "Bu düzeltmeyle kapanan sorun bildirimi; FK sorun_bildirimleri."),
      c('kaynak', 'text', false, '', "PANEL, TELEFON (hoca modunun çevrimiçi isteği) ya da TELEFON_KUYRUGU (elle_ekleme öğesi) (CHECK)."),
      c('kurulum_id', 'uuid', true, '', "Kuyruk öğesinde hocanın telefon kurulumu; FK kurulumlar (D06). Yalnız TELEFON_KUYRUGU'nda dolu."),
      c('sira_no', 'bigint', true, '', "Kuyruk öğesinin sıra numarası; yalnız iz için, tekilliği D06'nın gönderim defteri tutar. kurulum_id ile birlikte boş ya da dolu."),
      c('yapan_kisi_id', 'uuid', false, '', "Düzeltmeyi yapan hoca; FK kisiler (D01)."),
      c('istemci_ani', 'timestamptz', true, '', "Kuyruk öğesinde saat belgesiyle çapalanmış işlem anı (D06 öğe zarfı); doğrulanamazsa boş."),
      c('olusturma_ani', 'timestamptz', false, '', "Sunucunun yazdığı an; saat arayüzünden gelir, SQL now() kullanılmaz.")
    ],
    indexes: [
      "duzeltmeler_id_pk: PRIMARY KEY (id)",
      "duzeltmeler_id_oturum_id_liste_satiri_id_uq: UNIQUE (id, oturum_id, liste_satiri_id); bileşik FK'nin hedefi",
      "duzeltmeler_oturum_id_liste_satiri_id_uq: UNIQUE (oturum_id, liste_satiri_id) WHERE onceki_duzeltme_id IS NULL; oturum ve öğrenci başına tek zincir başı",
      "duzeltmeler_onceki_duzeltme_id_uq: UNIQUE (onceki_duzeltme_id); her satırın en çok bir halefi, zincir dallanmaz",
      "duzeltmeler_liste_satiri_id_oturum_id_idx: (liste_satiri_id, oturum_id); zincir okuması ve öğrencinin düzeltmeleri",
      "duzeltmeler_oturum_id_idx: (oturum_id); oturumun düzeltmeleri",
      "duzeltmeler_ders_id_olusturma_ani_idx: (ders_id, olusturma_ani DESC, id DESC); hoca listesi, keyset sayfalama",
      "duzeltmeler_kayit_donem_id_kayit_id_idx: (kayit_donem_id, kayit_id) WHERE kayit_id IS NOT NULL",
      "duzeltmeler_sorun_bildirimi_id_idx: (sorun_bildirimi_id) WHERE sorun_bildirimi_id IS NOT NULL",
      "duzeltmeler_islem_id_idx: (islem_id)"
    ],
    constraints: [
      "duzeltmeler_tur_ck: tur IN ('DUZELTME','GERI_ALMA')",
      `duzeltmeler_sebep_kodu_ck: (tur = 'GERI_ALMA') = (sebep_kodu IS NULL) AND (sebep_kodu IS NULL OR sebep_kodu IN (${KATALOG_KODLARI}))`,
      `duzeltmeler_belge_no_ck: COALESCE(sebep_kodu IN (${BELGELI}), false) = (belge_no IS NOT NULL) AND (belge_no IS NULL OR (belge_no IS NFC NORMALIZED AND char_length(belge_no) BETWEEN 1 AND 64 AND belge_no = btrim(belge_no) AND position('  ' in belge_no) = 0 AND belge_no !~ '[[:cntrl:]]'))`,
      "duzeltmeler_teori_saat_uygulama_saat_ck: (tur = 'GERI_ALMA' AND teori_saat IS NULL AND uygulama_saat IS NULL) OR (tur = 'DUZELTME' AND teori_saat IS NOT NULL AND uygulama_saat IS NOT NULL AND teori_saat BETWEEN 0 AND 24 AND uygulama_saat BETWEEN 0 AND 24 AND teori_saat + uygulama_saat >= 1)",
      "duzeltmeler_uygulama_saat_ck: sebep_kodu IS DISTINCT FROM 'OGRENCI_ISLERI_YAZISI' OR uygulama_saat = 0",
      "duzeltmeler_onceki_duzeltme_id_ck: onceki_duzeltme_id IS DISTINCT FROM id AND (tur <> 'GERI_ALMA' OR onceki_duzeltme_id IS NOT NULL)",
      "duzeltmeler_kayit_donem_id_kayit_id_ck: (kayit_donem_id IS NULL) = (kayit_id IS NULL) AND (kayit_donem_id IS NULL OR kayit_donem_id = donem_id)",
      `duzeltmeler_kaynak_ck: kaynak IN ('PANEL','TELEFON','TELEFON_KUYRUGU') AND (kaynak = 'TELEFON_KUYRUGU') = (kurulum_id IS NOT NULL) AND (kurulum_id IS NULL) = (sira_no IS NULL) AND (kaynak <> 'TELEFON_KUYRUGU' OR COALESCE(sebep_kodu IN (${ELLE}), false))`,
      "duzeltmeler_onceki_duzeltme_id_oturum_id_liste_satiri_id_fk: FOREIGN KEY (onceki_duzeltme_id, oturum_id, liste_satiri_id) REFERENCES duzeltmeler (id, oturum_id, liste_satiri_id)",
      "Öbür FK'ler <tablo>_<sütunlar>_fk adıyla: donem_id, ders_id, oturum_id, liste_satiri_id, (kayit_donem_id, kayit_id), sorun_bildirimi_id, kurulum_id, yapan_kisi_id",
      "Yetki (elle yazılan göç, drizzle-kit generate --custom): yoklama_api ve yoklama_isci yalnız SELECT ve INSERT; UPDATE, DELETE, TRUNCATE geri alınır"
    ]
  },
  {
    name: 'sorun_bildirimleri',
    purpose: "Öğrencinin bir oturum için ortak kuyruktan gönderdiği yoklama sorunu: neden kodu taşır, serbest metin yok. 3 günlük süre sunucuda hesaplanır; hoca düzeltmeyle ya da değişiklik yapmadan kapatır. Durum ve kapanış dışındaki sütunlar hiç değişmez.",
    columns: [
      c('id', 'uuid', false, 'uuidv7()', "Telefonun ürettiği UUIDv7 (kuyruk öğesinin kimliği); tekrar anahtarı."),
      c('donem_id', 'uuid', false, '', "Oturumun dönemi; FK donemler."),
      c('ders_id', 'uuid', false, '', "Oturumun dersi, oturumdan kopyalanır; FK dersler."),
      c('oturum_id', 'uuid', false, '', "Bildirimin oturumu; FK oturumlar."),
      c('ogrenci_id', 'uuid', false, '', "Bildiren öğrenci (oturum anahtarının kişisi); FK kisiler (D01)."),
      c('liste_satiri_id', 'uuid', true, '', "Öğrencinin oturum anında oturumun şubelerindeki etkin liste satırı; yoksa boş (ör. kayıt yanlış derse düştü)."),
      c('kayit_donem_id', 'uuid', true, '', "İlgili kaydın dönemi; kayit_id ile birlikte."),
      c('kayit_id', 'uuid', true, '', "Bildirimin ilgili olduğu kayıt; FK yoklama_kayitlari; kayıt sunucuda yoksa boş."),
      c('karar_surumu', 'bigint', true, '', "Öğrencinin bildirim anında gördüğü karar sürümü; süre bu sürümün telefona ulaştığı andan başlar; yalnız kayıtla dolu."),
      c('neden_kodu', 'text', false, '', "TELEFON_YOK_CALISMIYOR, QR_OKUTAMADI ya da KAYIT_YANLIS_DERSTE (CHECK; liste D09-A05)."),
      c('durum', 'text', false, '', "ACIK, DUZELTILDI, DEGISIKLIK_YOK ya da SURE_DISI (CHECK)."),
      c('istemci_ani', 'timestamptz', true, '', "Telefondaki oluşturma anı, saat belgesiyle çapalanmış (D06 öğe zarfı); doğrulanamazsa boş."),
      c('ulasma_ani', 'timestamptz', false, '', "Sunucuya ulaştığı an (saat arayüzü)."),
      c('sure_baslangic_ani', 'timestamptz', false, '', "3 günlük sürenin başı: kayda bağlıysa karar sürümünün teslim anı (D06.kararTeslimAni), teslim bilinmiyorsa ulaşma anı; kayıtsızsa oturumun bitiş anı."),
      c('sure_bitis_ani', 'timestamptz', false, '', "sure_baslangic_ani + 72 saat (CHECK)."),
      c('kurulum_id', 'uuid', false, '', "Öğrencinin telefon kurulumu; FK kurulumlar (D06)."),
      c('sira_no', 'bigint', false, '', "Kuyruk sıra numarası; yalnız iz için."),
      c('kapatan_kisi_id', 'uuid', true, '', "Kapatan hoca; FK kisiler; yalnız DUZELTILDI ve DEGISIKLIK_YOK'ta dolu."),
      c('kapanis_ani', 'timestamptz', true, '', "Kapanış anı; kapatan_kisi_id ile birlikte."),
      c('kapanis_islem_id', 'uuid', true, '', "Kapatan isteğin işlem kimliği; aynı isteğin tekrarı aynı cevabı alır.")
    ],
    indexes: [
      "sorun_bildirimleri_id_pk: PRIMARY KEY (id)",
      "sorun_bildirimleri_ogrenci_id_oturum_id_uq: UNIQUE (ogrenci_id, oturum_id) WHERE durum = 'ACIK'; öğrenci ve oturum başına en çok bir açık bildirim",
      "sorun_bildirimleri_ders_id_durum_ulasma_ani_idx: (ders_id, durum, ulasma_ani, id); hoca listesi",
      "sorun_bildirimleri_ogrenci_id_ulasma_ani_idx: (ogrenci_id, ulasma_ani); öğrencinin indirmesi",
      "sorun_bildirimleri_oturum_id_idx: (oturum_id)",
      "sorun_bildirimleri_kayit_donem_id_kayit_id_idx: (kayit_donem_id, kayit_id) WHERE kayit_id IS NOT NULL"
    ],
    constraints: [
      "sorun_bildirimleri_neden_kodu_ck: neden_kodu IN ('TELEFON_YOK_CALISMIYOR','QR_OKUTAMADI','KAYIT_YANLIS_DERSTE')",
      "sorun_bildirimleri_durum_ck: durum IN ('ACIK','DUZELTILDI','DEGISIKLIK_YOK','SURE_DISI')",
      "sorun_bildirimleri_kayit_donem_id_kayit_id_ck: (kayit_donem_id IS NULL) = (kayit_id IS NULL) AND (kayit_id IS NULL OR kayit_donem_id = donem_id) AND (karar_surumu IS NULL OR kayit_id IS NOT NULL)",
      "sorun_bildirimleri_sure_bitis_ani_ck: sure_bitis_ani = sure_baslangic_ani + interval '72 hours'",
      "sorun_bildirimleri_kapanis_ani_ck: (durum IN ('DUZELTILDI','DEGISIKLIK_YOK')) = (kapatan_kisi_id IS NOT NULL) AND (kapatan_kisi_id IS NULL) = (kapanis_ani IS NULL) AND (kapanis_islem_id IS NULL OR kapanis_ani IS NOT NULL)",
      "FK'ler: donem_id, ders_id, oturum_id, ogrenci_id, liste_satiri_id, (kayit_donem_id, kayit_id), kurulum_id, kapatan_kisi_id",
      "Yetki: yoklama_api ve yoklama_isci SELECT, INSERT ve yalnız UPDATE (durum, kapatan_kisi_id, kapanis_ani, kapanis_islem_id); DELETE ve TRUNCATE yok"
    ]
  },
  {
    name: 'denetim_kayitlari',
    purpose: "Bütün modüllerin denetim olayları (kim, neyi, ne zaman, neden): düzeltmeler, onaylar, teyitler, rastgele isim, kilit kapanışı, kimlik olayları ve öbürleri. Tek yazma yolu D09.denetimeYaz; uygulama rolleri yalnız ekler ve okur, satır güncellenmez ve silinmez. Saklama süresi dolunca yalnız sahip rol işler.",
    columns: [
      c('id', 'uuid', false, 'uuidv7()', "Olayın kimliği."),
      c('olay_turu', 'text', false, '', "<modül>.<olay> biçimi (ör. duzeltmeler.duzeltme_eklendi); tür listesi ve ayrıntı şeması her modülün sözleşme dosyasında."),
      c('olay_ani', 'timestamptz', false, '', "Çağıranın saat arayüzünden verdiği an."),
      c('yapan_tur', 'text', false, '', "KISI, SISTEM ya da KOMUT_SATIRI (CHECK)."),
      c('yapan_kisi_id', 'uuid', true, '', "yapan_tur KISI ise dolu; FK kisiler. Silinen kişinin satırı kaldığından bağ bozulmaz."),
      c('yapan_rol', 'text', true, '', "OGRENCI, HOCA ya da YONETICI; yalnız KISI'de."),
      c('istemci', 'text', false, '', "TELEFON, PANEL, KURSU ya da SUNUCU (CHECK)."),
      c('istek_kimligi', 'text', true, '', "İsteğin kimliği (D13.istekKimligi) ya da iş kimliği; loglarla eşleştirmek için; en çok 64 karakter."),
      c('islem_id', 'uuid', true, '', "Toplu işlemin ortak kimliği; tekrar gelen isteği tanımak için."),
      c('istemci_ani', 'timestamptz', true, '', "İnternetsiz yapılan işte telefonun çapalanmış işlem anı."),
      c('donem_id', 'uuid', true, '', "FK donemler."),
      c('ders_id', 'uuid', true, '', "FK dersler; hocanın okuma süzgeci."),
      c('oturum_id', 'uuid', true, '', "FK oturumlar."),
      c('ogrenci_id', 'uuid', true, '', "Olayın öğrencisi (hesap); FK kisiler."),
      c('liste_satiri_id', 'uuid', true, '', "Olayın liste satırı; FK liste_satirlari."),
      c('kayit_donem_id', 'uuid', true, '', "Kayıt çiftinin dönemi; kayit_id ile birlikte."),
      c('kayit_id', 'uuid', true, '', "FK (kayit_donem_id, kayit_id) yoklama_kayitlari."),
      c('hedef_tur', 'text', true, '', "Öbür nesnenin türü (ör. DUZELTME, SORUN_BILDIRIMI, CIHAZ, KISI, ISARET); BÜYÜK_HARF, yabancı anahtarsız."),
      c('hedef_id', 'uuid', true, '', "Öbür nesnenin kimliği; hedef_tur ile birlikte."),
      c('kod', 'text', true, '', "Sebep ya da gerekçe kodu, BÜYÜK_HARF."),
      c('onceki', 'jsonb', true, '', "Değişen alanların önceki değeri; yalnız iç kimlik, kod, sayı ve an."),
      c('sonraki', 'jsonb', true, '', "Değişen alanların sonraki değeri; aynı kural."),
      c('ayrinti', 'jsonb', false, "'{}'::jsonb", "Olay türüne özgü alanlar; en çok 8 KB; isim, öğrenci numarası, e-posta, kod, anahtar, jeton ve belge numarası yok.")
    ],
    indexes: [
      "denetim_kayitlari_id_pk: PRIMARY KEY (id)",
      "denetim_kayitlari_ders_id_olay_ani_idx: (ders_id, olay_ani DESC, id DESC) WHERE ders_id IS NOT NULL; hocanın denetim görünümü",
      "denetim_kayitlari_ogrenci_id_olay_ani_idx: (ogrenci_id, olay_ani DESC, id DESC) WHERE ogrenci_id IS NOT NULL",
      "denetim_kayitlari_liste_satiri_id_olay_ani_idx: (liste_satiri_id, olay_ani DESC) WHERE liste_satiri_id IS NOT NULL",
      "denetim_kayitlari_kayit_donem_id_kayit_id_idx: (kayit_donem_id, kayit_id) WHERE kayit_id IS NOT NULL",
      "denetim_kayitlari_olay_ani_idx: (olay_ani DESC, id DESC); yönetici görünümü",
      "denetim_kayitlari_islem_id_idx: (islem_id) WHERE islem_id IS NOT NULL; tekrar tanıma",
      "denetim_kayitlari_hedef_tur_hedef_id_idx: (hedef_tur, hedef_id) WHERE hedef_id IS NOT NULL",
      "denetim_kayitlari_olay_turu_olay_ani_idx: (olay_turu, olay_ani DESC); ilk liste, pg_stat_statements ile gözden geçirilir (D12-B15)"
    ],
    constraints: [
      "denetim_kayitlari_olay_turu_ck: olay_turu ~ '^(kimlik|dersler|listeler|saat|yoklama|esitleme|dogrulama|devam|duzeltmeler|raporlar|projeksiyon|veritabani|api|is-kuyrugu|isletim)[.][a-z][a-z0-9_]{1,62}$'",
      "denetim_kayitlari_yapan_tur_ck: yapan_tur IN ('KISI','SISTEM','KOMUT_SATIRI') AND (yapan_tur = 'KISI') = (yapan_kisi_id IS NOT NULL) AND (yapan_rol IS NULL OR (yapan_tur = 'KISI' AND yapan_rol IN ('OGRENCI','HOCA','YONETICI')))",
      "denetim_kayitlari_istemci_ck: istemci IN ('TELEFON','PANEL','KURSU','SUNUCU')",
      "denetim_kayitlari_kayit_donem_id_kayit_id_ck: (kayit_donem_id IS NULL) = (kayit_id IS NULL)",
      "denetim_kayitlari_hedef_tur_hedef_id_ck: (hedef_tur IS NULL) = (hedef_id IS NULL) AND (hedef_tur IS NULL OR hedef_tur ~ '^[A-Z][A-Z0-9_]{0,39}$')",
      "denetim_kayitlari_kod_ck: kod IS NULL OR kod ~ '^[A-Z][A-Z0-9_]{0,63}$'",
      "denetim_kayitlari_istek_kimligi_ck: istek_kimligi IS NULL OR char_length(istek_kimligi) <= 64",
      "denetim_kayitlari_ayrinti_ck: jsonb_typeof(ayrinti) = 'object' AND pg_column_size(ayrinti) <= 8192 AND (onceki IS NULL OR (jsonb_typeof(onceki) = 'object' AND pg_column_size(onceki) <= 8192)) AND (sonraki IS NULL OR (jsonb_typeof(sonraki) = 'object' AND pg_column_size(sonraki) <= 8192))",
      "FK'ler: yapan_kisi_id, donem_id, ders_id, oturum_id, ogrenci_id, liste_satiri_id, (kayit_donem_id, kayit_id)",
      "Yetki: yoklama_api ve yoklama_isci yalnız SELECT ve INSERT; UPDATE, DELETE, TRUNCATE yok (teknik.html#veritabani-donem-alani)"
    ]
  },
  {
    name: 'gunluk_inceleme_partileri',
    purpose: "Gece işinin her hoca için o İstanbul günü göstereceği sıralı küçük parti (varsayılan 20 öğe): karar verilebilir İncelemede kayıtlar, açık sorun bildirimleri ve dersten sonra işaretlenen oturumlar. Kararı değiştirmez; (gün, hoca) için bir kez yazılır, gün içinde çözülen öğe okuma anında düşer, 30 günden eski parti silinir.",
    columns: [
      c('gun', 'date', false, '', "Partinin İstanbul günü (saat arayüzünün İstanbul yardımcısıyla)."),
      c('hoca_id', 'uuid', false, '', "Partinin hocası: dersin o geceki sahibi; FK kisiler."),
      c('sira', 'smallint', false, '', "1'den başlayan sıra; CHECK 1 ile 500."),
      c('oge_turu', 'text', false, '', "INCELEME, SORUN_BILDIRIMI ya da ISARETLI_OTURUM (CHECK)."),
      c('ders_id', 'uuid', false, '', "Öğenin dersi; FK dersler. Okurken yetki süzgeci için."),
      c('oturum_id', 'uuid', false, '', "Öğenin oturumu; FK oturumlar."),
      c('kayit_donem_id', 'uuid', true, '', "INCELEME öğesinde kaydın dönemi."),
      c('kayit_id', 'uuid', true, '', "INCELEME öğesinde kayıt; FK yoklama_kayitlari."),
      c('sorun_bildirimi_id', 'uuid', true, '', "SORUN_BILDIRIMI öğesinde bildirim; FK sorun_bildirimleri."),
      c('kritik', 'boolean', false, '', "Öğe öğrencinin devam sonucunu değiştirebilir mi (D08)."),
      c('bekleme_baslangic_ani', 'timestamptz', false, '', "Öğenin beklemeye girdiği an: karar anı, ulaşma anı ya da işaret anı."),
      c('olusturma_ani', 'timestamptz', false, '', "İşin yazdığı an (saat arayüzü).")
    ],
    indexes: [
      "gunluk_inceleme_partileri_gun_hoca_id_sira_pk: PRIMARY KEY (gun, hoca_id, sira)",
      "gunluk_inceleme_partileri_gun_hoca_id_kayit_id_uq: UNIQUE (gun, hoca_id, kayit_donem_id, kayit_id) WHERE kayit_id IS NOT NULL; ad 63 baytı aşmasın diye kayit_donem_id adda yok",
      "gunluk_inceleme_partileri_gun_hoca_id_sorun_bildirimi_id_uq: UNIQUE (gun, hoca_id, sorun_bildirimi_id) WHERE sorun_bildirimi_id IS NOT NULL",
      "gunluk_inceleme_partileri_gun_hoca_id_oturum_id_uq: UNIQUE (gun, hoca_id, oturum_id) WHERE oge_turu = 'ISARETLI_OTURUM'"
    ],
    constraints: [
      "gunluk_inceleme_partileri_sira_ck: sira BETWEEN 1 AND 500",
      "gunluk_inceleme_partileri_oge_turu_ck: oge_turu IN ('INCELEME','SORUN_BILDIRIMI','ISARETLI_OTURUM') AND (oge_turu = 'INCELEME') = (kayit_id IS NOT NULL) AND (kayit_donem_id IS NULL) = (kayit_id IS NULL) AND (oge_turu = 'SORUN_BILDIRIMI') = (sorun_bildirimi_id IS NOT NULL)",
      "FK'ler: hoca_id, ders_id, oturum_id, (kayit_donem_id, kayit_id), sorun_bildirimi_id",
      "Yetki: yoklama_isci SELECT, INSERT ve DELETE (yalnız 30 günden eski parti); yoklama_api yalnız SELECT; UPDATE yok"
    ]
  }
];

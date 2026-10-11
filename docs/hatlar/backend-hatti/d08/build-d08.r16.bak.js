// Builds spec/D08.json and frag/D08.html from one data source so the two never drift.
// Mini markup inside strings: {plan:anchor|label} {teknik:anchor|label} {tasarim:anchor|label} -> link; `x` -> code.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- text helpers
const LINK = /\{(plan|teknik|tasarim):([a-z0-9-]+)\|([^}]+)\}/g;
const plain = s => String(s).replace(LINK, (m, d, a, l) => `${l} (${d}.html#${a})`).replace(/`([^`]+)`/g, '$1');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = s => esc(s).replace(/\{(plan|teknik|tasarim):([a-z0-9-]+)\|([^}]+)\}/g, (m, d, a, l) => `<a href="${d}.html#${a}">${l}</a>`).replace(/`([^`]+)`/g, '<code>$1</code>');
const deep = (o, f) => Array.isArray(o) ? o.map(x => deep(x, f)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v, f)])) : typeof o === 'string' ? f(o) : o;

// ---------------------------------------------------------------- data
const summary = 'Devam modülü (D08) öğrencinin her derste teori ve uygulama için hakkını, uyarı seviyesini, oturum başına son durumunu ve AKSİS\'e girecek sonucunu tek kuralla hesaplar; kural `packages/core/src/devam` içinde telefonla ortak saf fonksiyondur ({plan:devam-uyari-seviyeleri|Uyarı seviyeleri}). Saklanan dört tablo, tetikleyen değişiklikle aynı işlemde kuyruğa giren `devam_hesapla` işiyle yazılır; D10\'un özeti, karar bekleyenler listesi ve D09\'un sıralaması ise çağıranın işleminde canlı hesaplanır, bekleyen işe bağlı kalmaz. Öğrencinin bu dersteki anahtarı (ders, öğrenci numarası) çiftidir; hesabı olmayan, şube değiştiren ya da yeniden kaydolan öğrenci tek satırda kalır. Hak formülü, tür kararı ve yüzde veritabanında CHECK kısıtıyla da korunur; gece tutarlılık denetimi saklananı sıfırdan hesapla karşılaştırıp farkı sayar ve "hesabın elle hesaplananla uyuşmazlığı 0" hedefinin izini bırakır ({plan:hedefler|Hedefler}). p ve muaf değerlerini sahipleri yazar (D02, D03); D08 bu iki değerin anlamını, yetkisini, denetim kaydını ve yeniden hesabını tutar.';

const col = (name, type, nul, def, note) => ({ name, type, null: nul, default: def, note });

const tables = [
  {
    name: 'devam_sonuclari',
    purpose: 'Ders öğrencisi satırı: (ders, öğrenci numarası) başına bir satır. AKSİS tabanında (T) genel sonuç, KARAR BEKLİYOR ve nedenleri, açık işaret sayısı, muaf ve etkinlik, seviye kuralının veri değişikliğini anlaması için üyelik özeti. Öbür üç D08 tablosu buna başvurur.',
    columns: [
      col('id', 'uuid', false, 'uuidv7()', 'Ders öğrencisi kimliği; öbür D08 tabloları buna başvurur. Dışa açık jeton değildir.'),
      col('donem_id', 'uuid', false, '', 'Dersin dönemi (donemler, D02). Saklama ve gece denetimi süzgeci.'),
      col('birim_id', 'uuid', false, '', 'Dersin birimi (birimler, D02); her hesapta dersten kopyalanır. Kilit adımı birimin derslerini bununla bulur.'),
      col('ders_id', 'uuid', false, '', 'Ders (dersler, D02).'),
      col('ogrenci_no', 'text', false, '', 'Liste satırındaki öğrenci numarası (9 ya da 10 rakam). Öğrencinin bu dersteki anahtarı; iş verisine, loga ve adres satırına girmez.'),
      col('etkin', 'boolean', false, '', 'Derste pasif olmayan liste satırı var mı. false iken seviye 0, satır telefona inmez, AKSİS özetine girmez.'),
      col('muaf', 'boolean', false, 'false', 'Etkin (yoksa en son) liste satırının muaf değeri; değeri D03 yazar, değiştiren uç D08\'in.'),
      col('sonuc', 'text', false, '', 'DEVAMLI, DEVAMSIZ ya da DEVAMLI_MUAF; hesap anında AKSİS tabanıyla genel sonuç (bir tür DEVAMSIZ ise DEVAMSIZ).'),
      col('acik_isaret_sayisi', 'integer', false, '0', 'Sonucu henüz kesin olmayan oturum sayısı: Beklemede, İncelemede, onay bekleyen Kendi beyanı, açık sorun bildirimi.'),
      col('karar_bekliyor_acik_isaret', 'boolean', false, 'false', 'Açık işaretler hepsi lehine ve hepsi aleyhine çözülünce genel sonuç farklı çıkıyor.'),
      col('karar_bekliyor_baglanti', 'boolean', false, 'false', 'Son oturumdan sonra telefon bağlanmadı ve tek kayıt sonucu DEVAMSIZ\'dan DEVAMLI\'ya çevirebiliyor. Hesap anındaki değerdir; liste ucu ve dersSonuclari bunu canlı yeniden hesaplar.'),
      col('son_temas_ani', 'timestamptz', true, '', 'Bağlantı hesabında kullanılan son temas anı (D06.kurulumSonTemasi); hesabı olmayan öğrencide boş.'),
      col('uyelik_ozeti', 'bytea', false, '', 'Öğrencinin bu dersteki liste satırlarının (şube, eklenme anı, pasif anı, geç kayıt seçimi) sıralı listesinin SHA-256 özeti; seviye kuralı veri değişikliğini bununla anlar.'),
      col('sayim_tabani', 'text', false, "'YAPILAN'", 'Hesapta kullanılan sayım tabanı: YAPILAN ya da PLANLANAN ({plan:acik-sayim-tabani|Sayım tabanı}).'),
      col('kural_surumu', 'integer', false, '', '`packages/core/src/devam` içindeki KURAL_SURUMU; kural değişince gece denetimi yeniden hesaplar.'),
      col('hesaplandigi_an', 'timestamptz', false, '', 'Son hesap anı (D04.simdi).'),
      col('olusturma_ani', 'timestamptz', false, '', 'Satırın ilk yazıldığı an (D04.simdi).'),
    ],
    indexes: ['devam_sonuclari_donem_id_birim_id_idx (donem_id, birim_id)'],
    constraints: [
      'devam_sonuclari_id_pk PRIMARY KEY (id)',
      'devam_sonuclari_ders_id_ogrenci_no_uq UNIQUE (ders_id, ogrenci_no)',
      'devam_sonuclari_ders_id_fk FOREIGN KEY (ders_id) REFERENCES dersler (id)',
      'devam_sonuclari_donem_id_fk FOREIGN KEY (donem_id) REFERENCES donemler (id)',
      'devam_sonuclari_birim_id_fk FOREIGN KEY (birim_id) REFERENCES birimler (id)',
      "devam_sonuclari_ogrenci_no_ck CHECK (ogrenci_no ~ '^[0-9]{9,10}$')",
      "devam_sonuclari_sonuc_ck CHECK (sonuc IN ('DEVAMLI', 'DEVAMSIZ', 'DEVAMLI_MUAF'))",
      "devam_sonuclari_muaf_ck CHECK ((sonuc = 'DEVAMLI_MUAF') = muaf)",
      'devam_sonuclari_karar_bekliyor_ck CHECK ((etkin AND NOT muaf) OR NOT (karar_bekliyor_acik_isaret OR karar_bekliyor_baglanti))',
      'devam_sonuclari_acik_isaret_sayisi_ck CHECK (acik_isaret_sayisi >= 0 AND (acik_isaret_sayisi > 0 OR NOT karar_bekliyor_acik_isaret))',
      "devam_sonuclari_sayim_tabani_ck CHECK (sayim_tabani IN ('YAPILAN', 'PLANLANAN'))",
      'devam_sonuclari_kural_surumu_ck CHECK (kural_surumu > 0)',
      'devam_sonuclari_uyelik_ozeti_ck CHECK (octet_length(uyelik_ozeti) = 32)',
    ],
  },
  {
    name: 'devam_durumlari',
    purpose: 'Ders öğrencisi ve tür (TEORI, UYGULAMA) başına hesaplanmış durum: taban ve planlı saat, katılım, mazeretli, açık ve devamsız saat, hak ve tür kararı, yüzde, tahmini hak, kalan hak, sonraki oturumun saati, saf seviye ve öğrenciye gösterilen seviye üçlüsü (seviye, mesaj kodu, kalan hak). Hak formülü, tür kararı ve yüzde CHECK ile korunur.',
    columns: [
      col('devam_sonucu_id', 'uuid', false, '', 'Ders öğrencisi (devam_sonuclari).'),
      col('tur', 'text', false, '', 'TEORI ya da UYGULAMA. Öğrencinin kapsamında o türde taban ya da planlı saat yoksa satır yoktur.'),
      col('p', 'smallint', false, '', 'Hesapta kullanılan oran (dersler satırından, D02.dersGetir).'),
      col('taban_saat', 'integer', false, '', 'T: sayım tabanına göre saat; YAPILAN tabanda öğrencinin kapsamındaki yapılan oturumların bu türdeki saati.'),
      col('planli_kalan_saat', 'integer', false, '', 'Kapsamdaki, tabana henüz girmemiş planlı saat: gelecekteki oturumlar ve "Ders yapıldı mı?" sorusu cevapsız geçmiş oturumlar.'),
      col('katildigi_saat', 'integer', false, '', 'Var ve Elle eklendi saatleri (onay bekleyen Kendi beyanı dahil).'),
      col('mazeretli_saat', 'integer', false, '', 'Görevli ve Belgeli düzeltme saatleri; T\'yi değiştirmez, devamsızlıktan düşülür.'),
      col('beklemede_saat', 'integer', false, '', 'Kararı Beklemede kayda düşen saat.'),
      col('incelemede_saat', 'integer', false, '', 'Kararı İncelemede kayda düşen saat.'),
      col('devamsiz_saat', 'integer', false, '', 'AKSİS tabanında devamsızlık: Yok + Beklemede + İncelemede = taban_saat - katildigi_saat - mazeretli_saat.'),
      col('hak', 'integer', false, '', 'T - (T x p + 99) div 100; AKSİS kararı bununla.'),
      col('tur_sonucu', 'text', false, '', 'devamsiz_saat <= hak ise DEVAMLI, değilse DEVAMSIZ.'),
      col('yuzde_onda', 'smallint', true, '', '(T - devamsiz_saat) x 1000 div T; 695 = %69,5; T = 0 iken boş.'),
      col('kullanilan_saat', 'integer', false, '', 'Seviye tabanında kullanılan hak: devamsiz_saat - beklemede_saat (Beklemede seviyede geçici var sayılır; D08-A01).'),
      col('tahmini_hak', 'integer', false, '', 'Hak formülü T + planli_kalan_saat ile: dönem ortası seviye tabanı.'),
      col('kalan_hak', 'integer', false, '', 'tahmini_hak - kullanilan_saat; eksi değer aşımdır.'),
      col('sonraki_oturum_saati', 'smallint', true, '', 'Hesap anından sonra başlayan, iptal edilmemiş, öğrencinin kapsamındaki ve bu türde saati olan ilk oturumun bu türdeki saati (telafi dahil); yoksa boş.'),
      col('hesaplanan_seviye', 'smallint', false, '', '0 ile 4; o anki durumun saf fonksiyonu; muaf ve pasifte 0.'),
      col('seviye', 'smallint', false, '', 'Öğrenciye gösterilen seviye; hesaplanan_seviye\'den küçük olamaz, yalnız tahmin değişince düşmez.'),
      col('mesaj_kodu', 'text', true, '', 'Gösterilen seviyenin mesaj kodu: YARISINI_KULLANDIN, BIR_DERS_DAHA_HAKKIN_BITER, BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN, HAKKIN_KALMADI, HAKKINI_ASTIN; seviye 0 iken boş.'),
      col('gosterilen_kalan_hak', 'integer', false, '', 'Gösterilen seviyeyle birlikte gösterilen kalan hak; seviye tutulduğunda tutulduğu andaki değerde kalır.'),
      col('seviye_degisim_ani', 'timestamptz', true, '', 'Gösterilen seviyenin son değiştiği an.'),
      col('hesaplandigi_an', 'timestamptz', false, '', 'Son hesap anı (D04.simdi).'),
    ],
    indexes: [],
    constraints: [
      'devam_durumlari_devam_sonucu_id_tur_pk PRIMARY KEY (devam_sonucu_id, tur)',
      'devam_durumlari_devam_sonucu_id_fk FOREIGN KEY (devam_sonucu_id) REFERENCES devam_sonuclari (id) ON DELETE CASCADE',
      "devam_durumlari_tur_ck CHECK (tur IN ('TEORI', 'UYGULAMA'))",
      'devam_durumlari_p_ck CHECK (p BETWEEN 0 AND 100)',
      'devam_durumlari_saat_ck CHECK (taban_saat >= 0 AND planli_kalan_saat >= 0 AND katildigi_saat >= 0 AND mazeretli_saat >= 0 AND beklemede_saat >= 0 AND incelemede_saat >= 0 AND taban_saat + planli_kalan_saat > 0)',
      'devam_durumlari_devamsiz_saat_ck CHECK (devamsiz_saat = taban_saat - katildigi_saat - mazeretli_saat AND devamsiz_saat >= beklemede_saat + incelemede_saat)',
      'devam_durumlari_hak_ck CHECK (hak = taban_saat - (taban_saat * p + 99) / 100)',
      "devam_durumlari_tur_sonucu_ck CHECK (tur_sonucu = CASE WHEN devamsiz_saat <= hak THEN 'DEVAMLI' ELSE 'DEVAMSIZ' END)",
      'devam_durumlari_yuzde_onda_ck CHECK (yuzde_onda IS NOT DISTINCT FROM CASE WHEN taban_saat = 0 THEN NULL ELSE (taban_saat - devamsiz_saat) * 1000 / taban_saat END)',
      'devam_durumlari_kullanilan_saat_ck CHECK (kullanilan_saat = devamsiz_saat - beklemede_saat)',
      'devam_durumlari_tahmini_hak_ck CHECK (tahmini_hak = (taban_saat + planli_kalan_saat) - ((taban_saat + planli_kalan_saat) * p + 99) / 100)',
      'devam_durumlari_kalan_hak_ck CHECK (kalan_hak = tahmini_hak - kullanilan_saat)',
      'devam_durumlari_sonraki_oturum_saati_ck CHECK (sonraki_oturum_saati IS NULL OR sonraki_oturum_saati >= 1)',
      'devam_durumlari_seviye_ck CHECK (hesaplanan_seviye BETWEEN 0 AND 4 AND seviye BETWEEN hesaplanan_seviye AND 4)',
      "devam_durumlari_mesaj_kodu_ck CHECK ((seviye = 0 AND mesaj_kodu IS NULL) OR (seviye = 1 AND mesaj_kodu = 'YARISINI_KULLANDIN') OR (seviye = 2 AND mesaj_kodu IN ('BIR_DERS_DAHA_HAKKIN_BITER', 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN')) OR (seviye = 3 AND mesaj_kodu = 'HAKKIN_KALMADI') OR (seviye = 4 AND mesaj_kodu = 'HAKKINI_ASTIN'))",
      'devam_durumlari_gosterilen_kalan_hak_ck CHECK ((seviye <> 3 OR gosterilen_kalan_hak = 0) AND (seviye <> 4 OR gosterilen_kalan_hak < 0))',
    ],
  },
  {
    name: 'devam_seviye_gecmisi',
    purpose: 'Gösterilen seviyenin her gerçek değişiminin silinmeyen izi: eski ve yeni seviye ve mesaj, etken (veri, tahmin, ilk hesap), birleşen işlerin neden kodları, tetikleyen olay ve iş kimliği. Geri gitmez kuralının, öğrenci itirazının ve uyarı ölçümünün dayanağı. Uygulama ve işçi rolleri yalnız INSERT ve SELECT; silme yalnız sahip rolle saklama işinde.',
    columns: [
      col('id', 'uuid', false, 'uuidv7()', 'Satır kimliği.'),
      col('devam_sonucu_id', 'uuid', false, '', 'Ders öğrencisi.'),
      col('donem_id', 'uuid', false, '', 'Saklama süzgeci (donemler).'),
      col('tur', 'text', false, '', 'TEORI ya da UYGULAMA.'),
      col('eski_seviye', 'smallint', true, '', 'Önceki gösterilen seviye; ilk hesapta boş.'),
      col('yeni_seviye', 'smallint', false, '', 'Yeni gösterilen seviye.'),
      col('eski_mesaj_kodu', 'text', true, '', 'Önceki mesaj kodu.'),
      col('yeni_mesaj_kodu', 'text', true, '', 'Yeni mesaj kodu.'),
      col('etken', 'text', false, '', 'VERI (kullanılan saat, p, muaf, üyelik, kural sürümü ya da sayım tabanı değişti), TAHMIN (yalnız planlı saat ya da sonraki oturum; yalnız artış) ya da ILK.'),
      col('nedenler', 'text[]', false, '', 'Birleşen işlerin neden kodları: KAYIT, KARAR, DUZELTME, SORUN_BILDIRIMI, LISTE, MUAF, ORAN, PROGRAM, YAPILDI, OTURUM_KAPANDI, KILIT, TUTARLILIK, KURAL.'),
      col('tetikleyen_tur', 'text', true, '', 'KAYIT, DUZELTME, SORUN_BILDIRIMI, LISTE_SATIRI, OTURUM ya da DERS; birleşen işlerde ilki.'),
      col('tetikleyen_id', 'uuid', true, '', 'Tetikleyen olayın iç kimliği.'),
      col('tetikleyen_donem_id', 'uuid', true, '', 'Tetikleyen kayıtsa kaydın dönemi ((donem_id, kayit_id) çifti kuralı).'),
      col('is_kimligi', 'uuid', true, '', 'pg-boss iş kimliği; log satırıyla eşleştirmek için.'),
      col('an', 'timestamptz', false, '', 'Değişim anı (D04.simdi).'),
    ],
    indexes: ['devam_seviye_gecmisi_devam_sonucu_id_tur_an_idx (devam_sonucu_id, tur, an)', 'devam_seviye_gecmisi_donem_id_idx (donem_id)'],
    constraints: [
      'devam_seviye_gecmisi_id_pk PRIMARY KEY (id)',
      'devam_seviye_gecmisi_devam_sonucu_id_fk FOREIGN KEY (devam_sonucu_id) REFERENCES devam_sonuclari (id) ON DELETE CASCADE',
      'devam_seviye_gecmisi_donem_id_fk FOREIGN KEY (donem_id) REFERENCES donemler (id)',
      "devam_seviye_gecmisi_tur_ck CHECK (tur IN ('TEORI', 'UYGULAMA'))",
      'devam_seviye_gecmisi_seviye_ck CHECK (yeni_seviye BETWEEN 0 AND 4 AND (eski_seviye IS NULL OR eski_seviye BETWEEN 0 AND 4) AND eski_seviye IS DISTINCT FROM yeni_seviye)',
      "devam_seviye_gecmisi_etken_ck CHECK (etken IN ('VERI', 'TAHMIN', 'ILK') AND ((etken = 'ILK') = (eski_seviye IS NULL)) AND (etken <> 'ILK' OR yeni_seviye > 0) AND (etken <> 'TAHMIN' OR yeni_seviye > eski_seviye))",
      "devam_seviye_gecmisi_nedenler_ck CHECK (cardinality(nedenler) > 0 AND nedenler <@ ARRAY['KAYIT', 'KARAR', 'DUZELTME', 'SORUN_BILDIRIMI', 'LISTE', 'MUAF', 'ORAN', 'PROGRAM', 'YAPILDI', 'OTURUM_KAPANDI', 'KILIT', 'TUTARLILIK', 'KURAL']::text[])",
      "devam_seviye_gecmisi_tetikleyen_ck CHECK ((tetikleyen_tur IS NULL) = (tetikleyen_id IS NULL) AND (tetikleyen_tur IS NULL OR tetikleyen_tur IN ('KAYIT', 'DUZELTME', 'SORUN_BILDIRIMI', 'LISTE_SATIRI', 'OTURUM', 'DERS')) AND (tetikleyen_donem_id IS NULL OR tetikleyen_tur = 'KAYIT'))",
    ],
  },
  {
    name: 'oturum_son_durumlari',
    purpose: 'Ders öğrencisi, oturum ve tür başına var, yok, mazeretli ve açık saat ile son durum (VAR, YOK, GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI; muaf öğrencide MUAF; kararı açıkken boş). Yalnız öğrencinin kapsamındaki yapılan oturumlar için satır vardır. Öğrencinin "durumları" ekranı bu satırlarla iner; raporlar (D10) okuma istisnasıyla okur; devam_durumlari toplamları bu satırların toplamıdır.',
    columns: [
      col('oturum_id', 'uuid', false, '', 'Oturum (oturumlar, D02).'),
      col('devam_sonucu_id', 'uuid', false, '', 'Ders öğrencisi.'),
      col('tur', 'text', false, '', 'TEORI ya da UYGULAMA; oturumun o türde saati varsa satır var.'),
      col('donem_id', 'uuid', false, '', 'Saklama süzgeci.'),
      col('saat', 'smallint', false, '', 'Oturumun bu türdeki saati (hesap anında, D02).'),
      col('var_saat', 'smallint', false, '0', 'Var ve Elle eklendi saati.'),
      col('yok_saat', 'smallint', false, '0', 'Yok saati.'),
      col('mazeretli_saat', 'smallint', false, '0', 'Görevli ve Belgeli düzeltme saati.'),
      col('acik_saat', 'smallint', false, '0', 'Kararı açık (Beklemede, İncelemede) kayda düşen saat.'),
      col('son_durum', 'text', true, '', 'VAR, YOK, GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI (D09\'un son durum değerleri) ya da muaf öğrencide MUAF; kararı açık ve düzeltmesiz oturumda boş.'),
      col('acik_karar', 'text', true, '', 'BEKLEMEDE ya da INCELEMEDE; acik_saat > 0 iken dolu.'),
      col('gecici', 'boolean', false, 'false', 'Onay bekleyen Kendi beyanı kaydına dayanıyor.'),
      col('kaynak_kayit_donem_id', 'uuid', true, '', 'Son durumu veren sayılan kaydın dönemi.'),
      col('kaynak_kayit_id', 'uuid', true, '', 'Son durumu veren sayılan kayıt.'),
      col('kaynak_duzeltme_id', 'uuid', true, '', 'Son durumu veren düzeltme (D09).'),
      col('hesaplandigi_an', 'timestamptz', false, '', 'Son hesap anı.'),
    ],
    indexes: ['oturum_son_durumlari_devam_sonucu_id_idx (devam_sonucu_id)', 'oturum_son_durumlari_donem_id_idx (donem_id)'],
    constraints: [
      'oturum_son_durumlari_oturum_id_devam_sonucu_id_tur_pk PRIMARY KEY (oturum_id, devam_sonucu_id, tur)',
      'oturum_son_durumlari_oturum_id_fk FOREIGN KEY (oturum_id) REFERENCES oturumlar (id)',
      'oturum_son_durumlari_devam_sonucu_id_fk FOREIGN KEY (devam_sonucu_id) REFERENCES devam_sonuclari (id) ON DELETE CASCADE',
      "oturum_son_durumlari_tur_ck CHECK (tur IN ('TEORI', 'UYGULAMA'))",
      'oturum_son_durumlari_saat_ck CHECK (saat >= 1 AND var_saat >= 0 AND yok_saat >= 0 AND mazeretli_saat >= 0 AND acik_saat >= 0 AND var_saat + yok_saat + mazeretli_saat + acik_saat = saat)',
      "oturum_son_durumlari_son_durum_ck CHECK (son_durum IS NULL OR son_durum IN ('VAR', 'YOK', 'GOREVLI', 'BELGELI_DUZELTME', 'ELLE_EKLENDI', 'MUAF'))",
      "oturum_son_durumlari_acik_karar_ck CHECK ((acik_karar IS NULL) = (acik_saat = 0) AND (acik_karar IS NULL OR acik_karar IN ('BEKLEMEDE', 'INCELEMEDE')) AND (son_durum IS NOT NULL OR acik_saat > 0))",
      'oturum_son_durumlari_kaynak_ck CHECK ((kaynak_kayit_donem_id IS NULL) = (kaynak_kayit_id IS NULL))',
    ],
  },
];

const endpoints = [
  {
    method: 'GET', path: '/v1/devam/dersler/{dersId}/karar-bekleyenler', client: 'panel',
    auth: 'Hoca oturumu (panel çerezi ya da hoca telefonu Bearer; rota tablosunda kimlik: oturum, rol: hoca). D02.dersYetkisi kişinin dersin hocası olmadığını söylerse 404 DEVAM_DERS_YOK (varlık sızmaz, D13 kuralı).',
    request: { dersId: 'yol; uuid (z.uuidv7())' },
    response: {
      dersId: 'uuid',
      hesapAni: 'metin; UTC ISO 8601 (D04.simdi)',
      sonDersGunu: 'metin YYYY-AA-GG ya da null; dersin iptal edilmemiş son oturumunun İstanbul günü',
      basladi: 'boolean; hesap anının İstanbul günü sonDersGunu ya da sonrası',
      sonGun: 'metin YYYY-AA-GG ya da null; birimin devamsızlık işleme son günü (D02.takvimGetir)',
      ogrenciler: 'dizi, en çok 2000 (D13 sert sınırı); basladi false iken boş. Öğe: { satirId: uuid, subeId: uuid, ogrenciNo: metin, adSoyad: metin, nedenler: (BAGLANTI | ACIK_ISARET)[] x-extensible-enum, sonuc: DEVAMSIZ | DEVAMLI x-extensible-enum, sonTemasAni: metin ya da null, tekKayitOturumlari: [{ oturumId, tarih, teoriSaat, uygulamaSaat }], acikIsaretler: [{ oturumId, tur: BEKLEMEDE | INCELEMEDE | KENDI_BEYANI_ONAY | SORUN_BILDIRIMI x-extensible-enum }] }',
    },
    errors: ['DEVAM_DERS_YOK'],
    idempotency: 'GET; hiçbir şey yazmaz. Tek REPEATABLE READ, READ ONLY işlemde canlı hesap (packages/core/src/devam); saklanan satıra ve bekleyen işe bağlı değil.',
    rate_limit: 'Girişli uçların genel sınırı (oturum başına dakikada 120, D13). Hesap bütçesi: 300 öğrenci ve 70 oturumda p95 en çok 1 saniye.',
  },
  {
    method: 'PUT', path: '/v1/devam/dersler/{dersId}/ogrenciler/{satirId}/muaf', client: 'panel',
    auth: 'Hoca oturumu (panel; kimlik: oturum, rol: hoca). Dersin hocası değilse 404 DEVAM_DERS_YOK. Yönetici bu ucu kullanmaz ({plan:devam|Devamdan muaf: hoca işaretler}).',
    request: { dersId: 'yol; uuid', satirId: 'yol; uuid; bu dersin bir şubesindeki liste satırı (D03.satirGetir). Sözleşmedeki {ogrenciId} adı bu anlamla satirId oldu (D08-A09).', muaf: 'boolean; zorunlu' },
    response: { satirId: 'uuid', muaf: 'boolean', degisti: 'boolean; false ise hiçbir şey yazılmadı', hesapKuyrukta: 'boolean' },
    errors: ['DEVAM_DERS_YOK', 'DEVAM_OGRENCI_YOK', 'DEVAM_SATIR_PASIF', 'DEVAM_DONEM_KILITLI', 'DEVAM_DERS_ARSIVDE'],
    idempotency: 'PUT doğal eş güçlü: istenen değer zaten satırdaysa 200 degisti: false, denetim ve iş yok. Değişiklikte tek işlemde D03.muafIsaretle, D09.denetimeYaz (devam.muaf_degisti: satır kimliği, önceki ve yeni değer) ve devamHesaplaIsiKoy(tx, dersId, null, MUAF).',
    rate_limit: 'Girişli uçların genel sınırı (D13).',
  },
  {
    method: 'PUT', path: '/v1/devam/dersler/{dersId}/oranlar', client: 'panel',
    auth: 'Yönetici oturumu (panel; kimlik: oturum, rol: yonetici). Rolü yönetici olmayan kökte 403 (D13). D02.dersYetkisi yöneticinin kapsamının dersin birimini içermediğini söylerse 404 DEVAM_DERS_YOK.',
    request: { dersId: 'yol; uuid', teoriP: 'tam sayı 0 ile 100 (z.int().min(0).max(100)); zorunlu', uygulamaP: 'tam sayı 0 ile 100; zorunlu' },
    response: { dersId: 'uuid', teoriP: 'tam sayı', uygulamaP: 'tam sayı', degisti: 'boolean', hesapKuyrukta: 'boolean' },
    errors: ['DEVAM_DERS_YOK', 'DEVAM_DONEM_KILITLI', 'DEVAM_DERS_ARSIVDE'],
    idempotency: 'PUT: iki değer zaten öyleyse 200 degisti: false. Değilse tek işlemde D02.oranlariYaz, D09.denetimeYaz (devam.oran_degisti: önceki ve yeni iki değer) ve devamHesaplaIsiKoy(tx, dersId, null, ORAN). Aralık dışı ya da tam sayı olmayan değer Zod doğrulamasıyla 400 (D13 zarfı).',
    rate_limit: 'Girişli uçların genel sınırı (D13).',
  },
];

const jobs = [
  {
    name: 'devam_hesapla',
    schedule: 'Olay anında: tetikleyen değişiklikle aynı işlemde devamHesaplaIsiKoy (yaprak.ts) D14.isGonder(tx, devam_hesapla, veri) çağırır. Veri yalnız iç kimlik: { dersId, ogrenciId: kişi kimliği ya da null (dersin bütün öğrencileri), neden, tetikleyen?: { tur, id, donemId? } }; kaynak istek kimliğini D14.isGonder ekler (D13-B04), yaprak işlev isteği görmez. İşçide partiyle alım (batchSize 50), aynı anda 2 parti; retryLimit 3 artan beklemeyle; expireInSeconds 120; tükenen iş D14\'ün ölü mektup kuyruğuna. Ders geneli YAPILDI 5 dakika, OTURUM_KAPANDI 15 dakika gecikmeyle başlar (ders çıkışı tepesini boşaltmak için; gecikme nedenden koddaki tabloyla belirlenir).',
    idempotency: 'Tekil anahtar yok: düşen gönderim nedenini kaybettirmesin. Parti içinde aynı (ders, öğrenci) birleşir; aynı işlemde aynı (ders, öğrenci) için ikinci devamHesaplaIsiKoy çağrısı iş eklemez. Ders başına pg_advisory_xact_lock(hashtext(\'devam\'), hashtext(ders_id::text)) işlemin ilk komutudur (READ COMMITTED). Her ders grubu ayrı işlemdir; bir grubun hatası yalnız o grubun işlerini başarısız sayar, öbür gruplar tamamlanır (D14\'ün parti yardımcısı). Hesap veritabanı durumu ve saatin saf fonksiyonudur; satırlar yalnız IS DISTINCT FROM ise yazılır, geçmiş yalnız gösterilen seviye değişince eklenir; aynı durumda ikinci çalışma hiçbir satır yazmaz.',
    does: 'Partiyi derse göre gruplar; her ders grubu tek işlemde: ders kilidi, ders düzeyi girdiler bir kez (D02 ders, oturumlar, şubeler, takvim; D03 şube listeleri), gruptaki öğrenciler için öğrenci girdileri (D01 numara eşlemesi, D05 sayılan kayıtlar, D09 düzeltmeler ve açık sorun bildirimleri, son oturum bitmişse D06 son temas), saklanan önceki durum. packages/core/src/devam ile kapsam, oturum son durumları, tür durumları, seviye (geri gitmez kuralıyla) ve genel sonuç hesaplanır; değişen satırlar yazılır, kapsamdan çıkan satırlar silinir, seviye değişimi devam_seviye_gecmisi\'ne eklenir; telefona inen bir değeri değişen her öğrencinin teyitli hesabı için D06.ogrenciDurumuDegisti çağrılır. Log: ders, öğrenci sayısı, yazılan satır, süre; numara ve isim yok.',
  },
  {
    name: 'devam_tutarlilik_denetimi',
    schedule: 'Her gece 04:10 Europe/Istanbul (cron 10 4 * * *, tz Europe/Istanbul, missed: once); stately politika, aynı anda tek. 02:15 yedek zincirinden, 03:00 ile 04:00 arasındaki yaz saati boşluğundan (D14-B05) sonra, D09\'un 05:10 gece sıralamasından önce.',
    idempotency: 'Fark yazıldıktan sonra ikinci çalışma 0 fark bulur. Ders başına ayrı işlem ve aynı ders kilidi; yarıda kesilirse kalan dersler sonraki çalışmada.',
    does: 'Kilidi uygulanmamış ya da kilidinden bu yana 30 günden az geçmiş birim dönemlerinin, devam_sonuclari\'nda satırı olan her dersini sıfırdan hesaplar ve saklananla karşılaştırır. Farkları sınıflar (saat, hak ve karar, oturum son durumu, hesaplanan seviye, KARAR BEKLİYOR açık işaret; bağlantı nedeninin yenilenmesi ve seviye tutmasından gelen gösterilen > hesaplanan fark sayılmaz), düzeltir ve tek log satırı yazar: { olay: devam.tutarlilik, dersSayisi, ogrenciSayisi, farkSayisi, farkTurleri }. kural_surumu ya da sayim_tabani ayardan farklı satırları yeniden hesaplar (neden KURAL). Aynı sayılar pg-boss iş çıktısına da yazılır; fark > 0 "hesabın elle hesaplananla uyuşmazlığı 0" hedefinin ihlalidir. D08 D15\'i çağırmaz: uyarıyı D15\'in isletim_denetimi iş çıktısından açar (D08-A08).',
  },
];

const stateMachines = [
  {
    name: 'Gösterilen uyarı seviyesi (ders öğrencisi, tür)',
    states: ['YOK (satır yok)', 'SEVIYE_0', 'SEVIYE_1', 'SEVIYE_2', 'SEVIYE_3', 'SEVIYE_4'],
    transitions: [
      { from: 'YOK (satır yok)', to: 'SEVIYE_n', by: 'devam_hesapla', when: 'İlk hesap; gösterilen = hesaplanan; n > 0 ise geçmişe ILK.' },
      { from: 'SEVIYE_n', to: 'SEVIYE_m, m > n', by: 'devam_hesapla', when: 'Hesaplanan seviye yükseldi (veri ya da tahmin); seviye, mesaj ve kalan hak üçlüsü yenilenir, geçmişe VERI ya da TAHMIN.' },
      { from: 'SEVIYE_n', to: 'SEVIYE_m, m < n', by: 'devam_hesapla', when: 'Hesaplanan seviye düştü ve veri değişti (kullanılan saat, p, muaf, üyelik, kural sürümü ya da sayım tabanı); üçlü yenilenir, geçmişe VERI.' },
      { from: 'SEVIYE_n', to: 'SEVIYE_n (tutulur)', by: 'devam_hesapla', when: 'Hesaplanan seviye düştü ama yalnız tahmin değişti (telafi, iptal, sonraki oturumun saati, zaman); üçlü olduğu gibi kalır, geçmişe satır yok.' },
      { from: 'SEVIYE_n', to: 'SEVIYE_0', by: 'muaf ucu ya da D03 liste değişikliği', when: 'Muaf açıldı ya da öğrenci pasif oldu (veri değişikliği); telefon o dersin bildirimini kaldırır.' },
    ],
  },
  {
    name: 'Oturum son durumu (ders öğrencisi, oturum, tür)',
    states: ['KAPSAM_DISI', 'PLANLI', 'ACIK', 'VAR', 'YOK', 'GOREVLI', 'BELGELI_DUZELTME', 'ELLE_EKLENDI', 'MUAF'],
    transitions: [
      { from: 'KAPSAM_DISI', to: 'PLANLI', by: 'D02 oturum üretimi ya da D03 liste', when: 'Oturum öğrencinin şubesinde ve üyelik aralığında; gelecekte ya da cevapsız (satır yok, planli_kalan_saat\'e girer).' },
      { from: 'PLANLI', to: 'YOK', by: 'D02 yapıldı (kafa sayısı ya da cevap)', when: 'Oturum yapıldı ve öğrencinin sayılan kaydı yok.' },
      { from: 'PLANLI', to: 'VAR', by: 'D02 yapıldı ve D05 sayılan kayıt', when: 'Sayılan kaydın kararı Var (onay bekleyen Kendi beyanı dahil, gecici true).' },
      { from: 'PLANLI', to: 'ACIK', by: 'D02 yapıldı ve D05 sayılan kayıt', when: 'Sayılan kaydın kararı Beklemede ya da İncelemede (son_durum boş).' },
      { from: 'ACIK', to: 'VAR ya da YOK', by: 'D07 karar değişimi (D05 yazar, D09 onay ve ret)', when: 'Karar Var ya da Ret olur.' },
      { from: 'YOK', to: 'VAR', by: 'D05 geç gelen kayıt', when: 'Son günden önce gelen geçerli kayıt sayılır.' },
      { from: 'VAR, YOK ya da ACIK', to: 'GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI ya da YOK', by: 'D09 düzeltme', when: 'Bu tür için en son etkin düzeltme kazanır; düzeltmenin saatinin dışında kalan saat bölüşüm kuralıyla dağılır.' },
      { from: 'herhangi', to: 'MUAF', by: 'muaf ucu', when: 'Muaf açıldı; saatler bilgi için hesaplanmaya devam eder.' },
      { from: 'PLANLI ya da yapılan herhangi', to: 'KAPSAM_DISI', by: 'D02 iptal ya da yapılmadı, D03 liste', when: 'Oturum sayılmaz ya da üyelik aralığı oturumu artık kapsamıyor ve katılım yok; satır silinir.' },
    ],
  },
  {
    name: 'KARAR BEKLİYOR (ders öğrencisi)',
    states: ['KESIN', 'ACIK_ISARET', 'BAGLANTI', 'IKISI'],
    transitions: [
      { from: 'KESIN', to: 'ACIK_ISARET', by: 'devam_hesapla ya da canlı hesap', when: 'Açık işaretler lehine çözülünce genel sonuç DEVAMLI, aleyhine çözülünce DEVAMSIZ.' },
      { from: 'KESIN', to: 'BAGLANTI', by: 'canlı hesap (liste ucu, dersSonuclari) ve gece denetimi', when: 'Son oturum bitti, son temas son oturumun bitişinden önce ve son temastan sonra başlayan tek bir Yok oturumu Var sayınca sonuç DEVAMSIZ\'dan DEVAMLI\'ya dönüyor.' },
      { from: 'ACIK_ISARET ya da IKISI', to: 'KESIN ya da BAGLANTI', by: 'D05, D07, D09 tetikleri', when: 'İşaret çözüldü (karar, onay, ret, sorun bildirimi kapandı).' },
      { from: 'BAGLANTI ya da IKISI', to: 'KESIN ya da ACIK_ISARET', by: 'canlı hesap', when: 'Telefon son oturumdan sonra bağlandı ya da gelen kayıt sonucu çevirdi.' },
      { from: 'herhangi', to: 'KESIN', by: 'muaf ucu ya da liste', when: 'Öğrenci muaf ya da pasif oldu.' },
    ],
  },
];

const invariants = [
  'hak = T - (T x p + 99) div 100 ve 0 <= hak <= T; yalnız tam sayı. devam_durumlari_hak_ck ve _tahmini_hak_ck aynı formülü veritabanında korur.',
  'Her oturum satırında var_saat + yok_saat + mazeretli_saat + acik_saat = saat.',
  'Bir tür satırındaki taban_saat, katildigi_saat, mazeretli_saat, beklemede_saat ve incelemede_saat, kapsamdaki oturum satırlarının toplamına eşittir; gece denetimi her gece doğrular.',
  'tur_sonucu = DEVAMLI ancak ve ancak devamsiz_saat <= hak ancak ve ancak (yuzde_onda boş ya da yuzde_onda >= 10 x p).',
  'Genel sonuç: muafta DEVAMLI_MUAF; değilse satırı olan türlerden biri DEVAMSIZ ise DEVAMSIZ, yoksa DEVAMLI.',
  'seviye >= hesaplanan_seviye; muaf ya da pasif öğrencide ikisi de 0 ve mesaj yok; gösterilen seviye 3 iken gösterilen kalan hak 0, 4 iken eksi.',
  'Gösterilen seviye yalnız veri değişikliğinde (kullanılan saat, p, muaf, üyelik özeti, kural sürümü, sayım tabanı) düşer; yalnız tahmin değişince (planlı saat, sonraki oturum) düşmez ve üçlü aynen kalır.',
  'KARAR BEKLİYOR yalnız etkin ve muaf olmayan öğrencide; ACIK_ISARET ancak ve ancak en iyi ve en kötü çözüm farklı genel sonuç verir; BAGLANTI yalnız son oturum bittikten sonra ve teyitli hesabı olan öğrencide.',
  '(ders_id, ogrenci_no) başına tek devam_sonuclari satırı; öğrenci numarası iş verisine, loga ve adres satırına girmez.',
  'D08 başka modülün tablosuna yazmaz: p D02.oranlariYaz, muaf D03.muafIsaretle, denetim D09.denetimeYaz ile ve değişiklikle aynı işlemde yazılır.',
  'Aynı veritabanı durumu ve aynı saatle devam_hesapla\'nın ikinci çalışması hiçbir satır yazmaz; devam_seviye_gecmisi\'ne yalnız gösterilen seviye gerçekten değişince satır eklenir ve satır saklama süresi dışında silinmez.',
  'Kural kodunda SQL now() ve Date.now() yok; her an D04.simdi()\'den, İstanbul günü dönüşümü D04\'ün saat yardımcısından gelir.',
  'Öğrenci telefonuna yalnız kendi teyitli hesabının dersleri iner; başka öğrencinin satırı, numarası ya da adı inmez.',
  'dersSonuclari, karar bekleyenler ucu ve sonucuDegistirebilirMi çağıranın işleminde canlı hesaplar; saklanan satırlar iş bitince aynı değere iner, gece denetimi farkı sayar.',
  'Kayıt oturumun bütün saatlerini sayar (kaydın saat_sayisi alanı hesaba girmez); kısmi saat yalnız düzeltmeyle gelir; Görevli ve Belgeli saatleri T\'yi değiştirmez.',
];

const T = 'Islem';
const exports_ = [
  { name: 'devamHesaplaIsiKoy', signature: `devamHesaplaIsiKoy(tx: ${T}, dersId: DersId, ogrenciId: OgrenciId | null, neden: DevamNedeni, tetikleyen?: { tur: DevamTetikleyenTuru; id: string; donemId?: DonemId }): Promise<void>`, purpose: 'Yaprak: modules/devam/yaprak.ts, yalnız infra/is-kuyrugu ve sözleşmeyi içe aktarır, dosya düzeyinde döngü kurmaz. Çağıranın işleminde D14.isGonder(tx, devam_hesapla, veri). ogrenciId kişi kimliğidir; null dersin bütün öğrencilerini hesaplatır (hesapsız öğrenci, liste, program, oran, muaf). Aynı işlemde aynı (ders, öğrenci) için ikinci çağrı iş eklemez (işlem nesnesine bağlı küme). Ders geneli YAPILDI işi 5 dakika, OTURUM_KAPANDI işi 15 dakika sonra başlar (isGonder startAfter): ders çıkışı tepesinden sonra çalışır, yalnız zamana bağlı alanları yeniler; öbür nedenler hemen.' },
  { name: 'dersSonuclari', signature: `dersSonuclari(tx: ${T}, subeId: SubeId): Promise<SubeDevamSonuclari>`, purpose: 'D10\'un AKSİS özeti ve anlığı için: şubenin etkin liste satırları sırasıyla { satirId, ogrenciId | null, muaf, sonuc, kararBekliyor: { acikIsaret, baglanti }, gecici, turler: [{ tur, tabanSaat, devamsizSaat, mazeretliSaat, katildigiSaat, acikSaat, hak, yuzdeOnda, turSonucu, enIyi, enKotu }] }, şube düzeyinde { hesapAni, sayimTabani, kuralSurumu, teoriP, uygulamaP, sonOturumBitti, telafiEksigi: { TEORI, UYGULAMA }, cevapsizOturumSayisi, onayBekleyenVar, acikKararVar }. Çağıranın işleminde canlı hesap; bekleyen işe bağlı değil.' },
  { name: 'ogrenciDevamDurumu', signature: `ogrenciDevamDurumu(tx: ${T}, ogrenciId: OgrenciId, dersId: DersId): Promise<OgrenciDevamDurumu | null>`, purpose: 'Saklanan durum (öğrencinin gördüğü): { dersId, muaf, etkin, sonuc, hesaplandigiAn, turler: [{ tur, seviye, mesajKodu, gosterilenKalanHak, kalanHak, tahminiHak, kullanilanSaat, tabanSaat, planliKalanSaat, sonrakiOturumSaati, hak, devamsizSaat, mazeretliSaat, yuzdeOnda, turSonucu }] }. Kişi kimliği D01 ile numaraya çevrilir; öğrenci derste yoksa null.' },
  { name: 'sonucuDegistirebilirMi', signature: `sonucuDegistirebilirMi(tx: ${T}, hedef: { donemId: DonemId; kayitId: KayitId } | { oturumId: OturumId; ogrenciId: OgrenciId }): Promise<boolean>`, purpose: 'D09\'un gece sıralaması ve sonradan değişenler listesi için: hedef oturum Var ve Yok çözülünce tür kararı (kullanilan <= tahmini hak) ya da hesaplanan seviye farklıysa true. Dönem ortasında tahmini tabanla, son oturumdan sonra AKSİS tabanıyla (planlı saat 0). Kayıt anahtarı İncelemede kayıt ve son günden sonra gelen kayıt için, (oturum, öğrenci) sorun bildirimi için. Canlı hesap.' },
];

const files = [
  'apps/server/src/modules/devam/index.ts', 'apps/server/src/modules/devam/yaprak.ts', 'apps/server/src/modules/devam/eklenti.ts',
  'apps/server/src/modules/devam/dinleyiciler.ts', 'apps/server/src/modules/devam/tablolar.ts', 'apps/server/src/modules/devam/uclar.ts',
  'apps/server/src/modules/devam/yetki.ts', 'apps/server/src/modules/devam/girdiler.ts', 'apps/server/src/modules/devam/hesap.ts',
  'apps/server/src/modules/devam/yazim.ts', 'apps/server/src/modules/devam/indirme.ts', 'apps/server/src/modules/devam/saklama.ts',
  'apps/server/src/jobs/devam/index.ts', 'apps/server/src/jobs/devam/devam-hesapla.ts', 'apps/server/src/jobs/devam/tutarlilik-denetimi.ts',
  'packages/contracts/src/devam.ts',
  'packages/core/src/devam/index.ts', 'packages/core/src/devam/tipler.ts', 'packages/core/src/devam/hak.ts', 'packages/core/src/devam/kapsam.ts',
  'packages/core/src/devam/oturum-saatleri.ts', 'packages/core/src/devam/seviye.ts', 'packages/core/src/devam/sonuc.ts',
  'packages/core/src/devam/karar-bekliyor.ts', 'packages/core/src/devam/telafi.ts', 'packages/core/src/devam/telefon.ts', 'packages/core/src/devam/metinler.ts',
  'packages/core/src/devam/hak.test.ts', 'packages/core/src/devam/seviye.test.ts', 'packages/core/src/devam/kapsam.test.ts',
  'packages/core/src/devam/oturum-saatleri.test.ts', 'packages/core/src/devam/sonuc.test.ts', 'packages/core/src/devam/karar-bekliyor.test.ts',
  'packages/core/src/devam/telafi.test.ts', 'packages/core/src/devam/telefon.test.ts',
  'apps/server/test/features/devam/hesap.feature', 'apps/server/test/features/devam/seviye.feature', 'apps/server/test/features/devam/muaf.feature',
  'apps/server/test/features/devam/oranlar.feature', 'apps/server/test/features/devam/karar-bekleyenler.feature', 'apps/server/test/features/devam/donem-sonu.feature',
  'apps/server/test/features/devam/tutarlilik.feature', 'apps/server/test/features/devam/gizlilik.feature', 'apps/server/test/features/devam/sozlesme.feature',
  'apps/server/test/steps/devam/hesap.steps.ts', 'apps/server/test/steps/devam/uclar.steps.ts', 'apps/server/test/steps/devam/isler.steps.ts',
  'apps/server/test/support/kurucular/devam.ts',
];

const t = (name, kind, asserts) => ({ name, kind, asserts });
const tests = [
  t('Hak formülü tanımla birebir', 'property', '0 ile 1000 arasındaki her T ve 0 ile 100 arasındaki her p için (101.101 durum) hak(T, p), (T - k) x 100 >= p x T koşulunu sağlayan en büyük k\'ya eşit. Tablo {teknik:testler-birim|teknik.html\'deki} p=70 ve p=80 tablosunun genişletilmişidir: yalnız o ikisiyle 90 ile 98 arasındaki 9 yanlış sabit de geçer, her p ile yalnız 99 geçer (betik d08/mut-check2.js).'),
  t('Ondalıklı hesap karşı örneği', 'property', 'floor(T x (1 - p/100)) p=80\'de T 1 ile 199 arasında 39 değerde, p=70\'te 0 değerde hak\'tan ayrılır; T=15, p=80\'de hak 3, ondalıklı 2 ({plan:devam-uyari-seviyeleri|plan}). Tanım tabanlı denetimin ondalıklı hatayı yakaladığını gösteren zemin kontrolü.'),
  t('Yüzde ile karar tutarlı', 'property', 'T 1 ile 400, her p (0 ile 100) ve her devamsızlık için (8.140.600 durum) tür kararı DEVAMSIZ ancak ve ancak yuzdeOnda < 10 x p; T=200, p=70, 61 saatte yuzdeOnda 695 ve DEVAMSIZ; T=0\'da yuzdeOnda null ve DEVAMLI.'),
  t('Küçük hak seviye tablosu', 'behavior', '1 saatlik oturumlarla p=80: T=3 ilk gün seviye 3 HAKKIN_KALMADI; T=5 ilk gün seviye 2 BIR_DERS_DAHA_HAKKIN_BITER, ilk devamsızlıkta yalnız seviye 3. Beklenen değerler testte açıkça yazılı, koddan türetilmez.'),
  t('1. seviye eşiği eşitlikte açılır', 'behavior', 'p=70, tahmini T=14 (hak 4): 1 saatte seviye 0, 2 saatte seviye 1 (2 x 2 = 4); p=70, T=10 (hak 3): 1 saatte 0, 2 saatte 1.'),
  t('2. seviyenin iki mesajı ve sonraki oturumun yokluğu', 'behavior', 'p=70, tahmini T=42, 10 saat devamsızlık (kalan 2): sonraki oturum 1 saatse seviye 1; 2 saatse seviye 2 BIR_DERS_DAHA_HAKKIN_BITER; 3 saatse seviye 2 BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN; sonraki oturum yoksa seviye 1.'),
  t('En yüksek seviye kazanır', 'property', 'p {0, 50, 70, 80, 100}, T 0 ile 60, devamsızlık 0 ile T+2, sonraki oturum {yok, 1, 2, 3} için (40.260 durum) seviye, koşulu sağlanan en yüksek seviyeye eşit; atlanan seviyenin mesajı dönmez.'),
  t('Geri gitmez kuralı', 'property', 'fast-check, açık yazılmış 20.000 deneme: yalnız tahmin değişen adımda gösterilen seviye düşmez ve üçlü (seviye, mesaj, kalan hak) aynen kalır; veri değişen adımda gösterilen seviye hesaplanana eşit; her adımda gösterilen >= hesaplanan.'),
  t('Oturum saat bölüşümü', 'property', 'H 1 ile 6, her kayıt durumu, her düzeltme türü ve saati için var + yok + mazeretli + açık = H. 3 saatlik Var kayıtta 2 saatlik Var türü düzeltme 2 var 1 yok verir, 1 saatlik Yok düzeltmesi 2 var 1 yok verir; Yok kayıtta 2 saatlik Belgeli düzeltme 2 mazeretli 1 yok verir.'),
  t('Kapsam: ekle-bırak, Md.9/4, pasif, eklenmeden önceki katılım', 'behavior', 'onceki_sayilmaz seçiminde eklenmeden önce başlayan oturum tabana girmez; onceki_yok seçiminde girer ve Yok sayılır; pasif anından sonra başlayan oturum girmez; eklenmeden önce başlamış oturumda Var kaydı olan öğrencide oturum Var olarak girer; şube değiştiren öğrencide iki satırın birleşimi kullanılır.'),
  t('Görevli ve Belgeli saatleri T\'yi değiştirmez', 'behavior', 'Yok olan 2 saatlik teori oturumuna 2 saatlik Belgeli düzeltme girilince taban_saat aynı kalır, devamsiz_saat 2 azalır, mazeretli_saat 2 artar ({plan:devam-uyari-seviyeleri|plan}).'),
  t('Planlı saati olmayan tür', 'behavior', 'Yalnız teori oturumu olan derste UYGULAMA satırı üretilmez ve genel sonuç yalnız teoriden; taban 0 ve planlı 3 iken yuzdeOnda null, tür kararı DEVAMLI, seviye tahmini tabandan.'),
  t('Açık işaret aralık sınaması ve tekdüzelik', 'property', 'Bir oturumu Var yapmak ya da kapsama Var olarak eklemek hiçbir türü DEVAMLI\'dan DEVAMSIZ\'a çevirmez (1.660.725 durum); en iyi ve en kötü çözüm farklı genel sonuç verince ACIK_ISARET; öbür tür kesin DEVAMSIZ iken vermez.'),
  t('Bağlantı nedeni', 'behavior', 'Son oturum bitmiş, son temas son oturumun bitişinden önce ve son temastan sonra başlayan tek Yok oturum sonucu çeviriyorsa BAGLANTI; son temas son oturumdan sonraysa, hesap yoksa ya da iki kayıt gerekiyorsa vermez; karma oturumda tek kayıt iki türü birden Var yapar.'),
  t('Telafi eksiği', 'behavior', 'Hoca iptali 2 saat ve yapılmadı 1 saat, yapılan telafi 2 saat: eksik 1; tatil iptali eksik sayılmaz; fazla telafi eksiği 0\'ın altına indirmez.'),
  t('Saat diliminden bağımsız', 'contract', 'packages/core/src/devam testleri TZ=UTC ve TZ=Europe/Istanbul ile iki kez koşar ve aynı sonucu verir; İstanbul gece yarısı ve 02:59 sınır anları dahil ({teknik:testler-veritabani-sifirlama|Saat ve sahteler}).'),
  t('Telefon yerel düzeltmesi', 'behavior', 'Gönderilmemiş kaydın oturumu sunucuda Yok ise kalan hak o saat kadar artar; sunucuda zaten Var ise değişmez; gönderilmemiş kayıt varken o ders ve türde seviye artışı bildirilecek seviye olarak dönmez.'),
  t('Kayıt gelince seviye işle güncellenir', 'behavior', 'Sayılan kaydı yazan işlemde (D05) ve oturumu yapıldı yapan işlemde (D02) devam_hesapla kuyruğa girer; işlem geri alınınca kuyrukta iş yoktur (kontrol); iş çalışınca devam_durumlari, oturum_son_durumlari ve devam_seviye_gecmisi (etken VERI) yazılır, öğrencinin durum sürümü (D06) artar.'),
  t('Aynı durumda ikinci çalışma hiçbir şey yazmaz', 'behavior', 'devam_hesapla aynı veri ve aynı saatle iki kez çalışınca ikinci çalışmada yazılan satır sayısı 0 ve geçmişe yeni satır yok; araya bir kayıt değişikliği girince aynı test yazma görür (kontrol).'),
  t('Beklemede kayıt', 'behavior', 'Teyidi gelmemiş öğrencinin kaydı seviyede var sayılır (kullanilan değişmez), AKSİS tabanında devamsız ve açık işarettir; sonucu çevirebiliyorsa dersSonuclari KARAR BEKLİYOR (ACIK_ISARET) döner; teyit gelince işaret düşer (D08-A01 varsayılanı).'),
  t('İncelemede onayı seviyeyi düşürür', 'behavior', 'İncelemede kayıt Var olunca kullanilan azalır, gösterilen seviye düşer, geçmişe etken VERI ve neden KARAR yazılır.'),
  t('Telafi eklenince seviye düşmez', 'behavior', 'Seviye 3 iken telafi eklenip tahmini hak 1 artınca gösterilen seviye, mesaj ve kalan hak aynı kalır, hesaplanan_seviye düşer; sonraki Var kaydında gösterilen seviye hesaplanana iner (D08-A03 varsayılanı).'),
  t('Kendi beyanı reddi', 'behavior', 'Onay bekleyen Kendi beyanı geçici Var (gecici true) sayılır; hoca reddedince oturum Yok olur, seviye yeniden hesaplanır ({plan:gun-kayit-etiketleri|Kayıt etiketleri}).'),
  t('Cevapsız oturum', 'behavior', 'Kafa sayısı girilmemiş geçmiş oturum planlı saatte kalır, kaydı olmayan öğrenciye devamsızlık yazılmaz; "yapıldı" cevabıyla tabana geçer ve Yok yazılır; "yapılmadı" cevabıyla düşer (D08-A02 varsayılanı).'),
  t('Muaf ucu', 'behavior', 'Dersin hocası muafı açınca D03 satırı değişir, denetime devam.muaf_degisti yazılır, iş kuyruğa girer; iş sonrası seviye 0, sonuç DEVAMLI_MUAF, oturum son durumu MUAF. Aynı değer ikinci kez gelince 200 degisti false ve denetim satırı yok; başka hocanın dersi 404 DEVAM_DERS_YOK; başka dersin satırı 404 DEVAM_OGRENCI_YOK; pasif satır 409 DEVAM_SATIR_PASIF; kilitli dönem 409 DEVAM_DONEM_KILITLI.'),
  t('Oran ucu', 'behavior', 'Kapsamı dersin birimini içeren yönetici teori p\'sini 70\'ten 60\'a indirince D02 ders satırı değişir, denetim kaydı önceki ve yeni değerle yazılır, dersin bütün öğrencileri yeniden hesaplanır ve seviye düşebilir; hoca 403; kapsam dışı yönetici 404 DEVAM_DERS_YOK; 101 ve 70.5 400 doğrulama hatası; kilitli dönem 409 DEVAM_DONEM_KILITLI; arşivlenmiş ders 409 DEVAM_DERS_ARSIVDE.'),
  t('Karar bekleyenler ucu', 'behavior', 'Son ders gününden önce basladi false ve liste boş; sonra telefonu son oturumdan beri bağlanmamış ve tek kaydı sonucu çeviren öğrenci BAGLANTI nedeni ve çevirecek oturumla döner; son oturumdan sonra bağlanan öğrenci dönmez; başka hocanın dersi 404.'),
  t('Canlı hesap bekleyen işe bağlı değil', 'behavior', 'Kayıt eklenip iş henüz çalışmamışken dersSonuclari ve karar bekleyenler yeni değeri verir; iş çalışınca saklanan satır aynı değere iner.'),
  t('Kilitten sonra gelen kayıt sayılmaz', 'behavior', 'Birimin son gününden sonra gelen kayıt sayımı değiştirmez ve sonucuDegistirebilirMi sayılsaydı çevireceği durumda true döner; denetimli düzeltme gelince sayım değişir ({plan:kararlar-gonderme-suresi|Gönderme süresi}).'),
  t('Gece tutarlılık denetimi', 'behavior', 'Bozulmamış veride fark 0 (zemin kontrolü); bilerek bozulan bir saklı satır (saat ve oturum son durumu) düzeltilir ve fark logda türüyle görünür (pozitif kontrol); ikinci çalışma 0 fark; seviye tutmasından gelen gösterilen > hesaplanan fark sayılmaz.'),
  t('İş verisi ve loglarda kişisel veri yok', 'behavior', 'devam_hesapla ve tutarlılık işinin pg-boss verisinde ve loglarında öğrenci numarası ve isim geçmez; bilerek numara içeren bir log çağrısı gizleme süzgecine takılır (pozitif kontrol).'),
  t('Saklama', 'behavior', 'Saklama süresi dolan dönem için D12 işleyicisi çağrılınca o dönemin D08 satırları silinir, başka dönemin satırları kalır.'),
  t('Kural için SQL now() yok', 'behavior', 'Sahte saat (D04) sonraki oturumun başlangıcından sonraya kurulunca sonraki_oturum_saati ve planli_kalan_saat değişir; veritabanı saati değişmeden sonuç saat arayüzüne uyar.'),
  t('Veritabanı kısıtları kuralı korur', 'behavior', 'Hak formülüne uymayan hak, saat toplamı tutmayan oturum satırı, hesaplanandan küçük seviye ve muafta DEVAMSIZ yazma girişimi kısıt adıyla reddedilir; log yalnız hata kodunu ve kısıt adını taşır.'),
  t('Öğrenci bölümü yalnız teyitli hesaba', 'behavior', 'Teyitli öğrencinin indirmesinde kendi dersleri ve oturum son durumları gelir, başka öğrencinin satırı gelmez; aynı numarayla teyitsiz hesap boş devam bölümü alır; pasif olduğu dersin satırı inmez.'),
  t('Sözleşme: rota listesi ve kodlar', 'contract', 'packages/contracts/src/devam.ts üç rotayı yöntem, yol ve kimlik beyanıyla verir; cevaplardaki mesajKodu, sonuc, nedenler, tur, sonDurum ve acikKarar alanları OpenAPI belgesinde x-extensible-enum taşır; DEVAM_ önekli beş hata kodu hatalar.ts birleşiminde ve her birinin bir senaryosu var.'),
  t('dersSonuclari D10 sözleşmesi', 'contract', 'dersSonuclari şubenin yalnız etkin liste satırlarını döner; her satırda tür başına tabanSaat, devamsizSaat, hak, yuzdeOnda, turSonucu, genel sonuç ve KARAR BEKLİYOR nedenleri; değerler iş bittikten sonra saklanan devam_durumlari ile aynı.'),
  t('Ders çıkışı yükü', 'load', '20.000 kayıt 5 dakikada gelirken devam_hesapla gecikmesi (işin oluşmasından bitişine) p95 en çok 5 dakika, olağan saatte p95 en çok 30 saniye; gönderim işlemine eklenen tek iş satırı gönderim p95 bütçesini aşmaz (D15 yük testi, veri D08 kurucusundan).'),
  t('Canlı hesap süresi', 'load', '300 öğrencili, 70 oturumlu derste karar bekleyenler ucu ve dersSonuclari p95 en çok 1 saniye.'),
  t('Formül mutasyonu', 'mutation', 'hak formülünde 99 yerine 98 ya da 100 yazılınca "Hak formülü tanımla birebir" kırmızı olur (yalnız p=70 ve p=80 tablosuyla 98 geçerdi); bozuk dosya özgün baytlarla geri yazılır ve md5 ile denetlenir.'),
  t('Eşik ve kural mutasyonları', 'mutation', '1. seviyede >= yerine >, 2. seviyede <= yerine < yazılınca küçük hak ve eşik testleri kırmızı; geri gitmez kuralı kaldırılınca "Geri gitmez kuralı" ve "Telafi eklenince seviye düşmez" kırmızı.'),
];

const g = (gap, decision, why) => ({ gap, decision, why });
const resolved = [
  g('D08-B03', '1. seviye koşulu 2 x kullanılan >= tahmini hak, tam sayıyla; eşitlik durumu (p=70, T=14, hak 4, 2 saat) test tablosunda.', 'Mesaj "yarısını kullandın" diyor; hak 3\'te 1 saat yarı değildir. İki okuma 52 durumda farklı seviye veriyordu (d08/check-levels.js); tam sayı kuralı {plan:devam-uyari-seviyeleri|Uyarı seviyeleri} ile uyumlu.'),
  g('D08-B04', 'Sonraki oturum: başlangıcı hesap anından sonra olan, iptal edilmemiş, öğrencinin kapsamındaki (şube ve üyelik) ve bu türde saati olan ilk oturum (telafi dahil; sıra başlangıç, sonra kimlik). Yoksa sonraki_oturum_saati boş ve 2. seviye değerlendirilmez; 1, 3 ve 4 yine hesaplanır. Süren oturum sonraki sayılmaz.', 'Planın "o türdeki saati" ifadesine uyar, karma ya da başka türdeki oturumu atlar; hesap anı D04.simdi()\'den gelir ({teknik:testler-veritabani-sifirlama|kural için SQL now() yok}).'),
  g('D08-B07', 'Yetkili seviye sunucuda saklanır (devam_durumlari) ve öğrencinin kendi bölümüyle iner. packages/core/src/devam/telefon.ts telefona tek iş verir: gönderilmemiş kaydın oturumu sunucuda Yok sayılıyorsa o saati geçici var sayıp ekrandaki kalan hakkı düzeltir ve o ders ve türde gönderilmemiş kayıt kalmayana kadar seviye artışı bildirimini bekletir.', 'Geri gitmez kuralı ve dönem sonu tek kaynak ister; telefon değişince geçmiş kaybolmaz. Arka plan görevi önce gönderip sonra indirdiğinden bekletme seyrek devreye girer ({plan:kararlar-supheli-kayit|Bildirim}).'),
  g('D08-B08', 'Ayrı devam modülü: apps/server/src/modules/devam/, kurallar packages/core/src/devam/, sözleşme packages/contracts/src/devam.ts. contracts.json\'daki bağlayıcı "Modül adları ve klasörler" kararıyla kapandı; {teknik:sunucu-mimari|teknik.html modül listesi} bu ayrımı henüz yazmıyor, backend belgesi taşır.', 'Raporlar modülünün "yalnız okur" kuralı bozulmaz, en sıcak uç olan gönderimin modülü büyümez; sınır yalnız index.ts dış yüzü.'),
  g('D08-B09', 'Tetikleyen işlemde devamHesaplaIsiKoy ile iş; tekil anahtar yok, partide birleşme, ders kilidi; gece denetimi kaçan tetiği yakalar ve sayar. Canlı okumalar (dersSonuclari, karar bekleyenler, sonucuDegistirebilirMi) işi beklemez.', 'Gönderim işlemine yalnız bir iş satırı eklenir ({teknik:sunucu-arka-plan|Arka plan işleri}); tekil anahtarla düşen gönderim nedeni kaybettirirdi; hesap saf fonksiyon olduğu için iki kez çalışmak zararsız.'),
  g('D08-B10', 'Oturum son durumu oturum_son_durumlari\'nda saklanır. Kazanan kayıt ya da düzeltme her tür için D09.sonDurumOnceligi ile seçilir; saat bölüşümü D08\'in saf fonksiyonudur: düzeltme kendi saatine (boşsa bütün saate) kendi durumunu verir, kalan saat Var türü düzeltmede Yok, öbürlerinde kaydın durumuna gider. Kayıt bütün saatleri sayar; kaydın saat_sayisi alanı hesaba girmez. Muafta son durum MUAF, saatler bilgi için hesaplanır.', 'Tek kaynak ({plan:teknoloji-surdurulebilirlik|Sürdürülebilirlik}): hak hesabı, öğrencinin durumları ve raporlar aynı satırı ya da aynı fonksiyonu kullanır; kısmi saat yalnız düzeltmeyle gelir ({plan:kararlar-kafa-sayisi|Blok ders}).'),
  g('D08-B11', 'Görevli ve Belgeli düzeltme oturum ve tür başınadır; mazeretli saat oturumun o türdeki saatini aşamaz (D08 savunma olarak kırpar). Girişte reddetmek D09\'undur ve packages/core/src/devam oturumSaatleri fonksiyonunu kullanır.', 'Son durum oturum başına ({plan:gun-son-durumlar|Son durumlar}); toplu saat var olunan saati de düşürüp devamsızlığı eksiye indirebilirdi.'),
  g('D08-B12', 'Kapsam (kapsam.ts): oturum, öğrencinin bu dersteki bir liste satırının şubesini kapsıyor ve başlangıcı [eklenme anı, pasif anı) aralığındaysa kapsamdadır. İlk satırın (en erken eklenme) geç kayıt seçimi onceki_yok (Md.9/4) ise ilk eklenmeden önceki oturumlar Yok olarak girer; varsayılan onceki_sayilmaz. Eklenmeden önce başlamış oturumda var ya da mazeretli saati olan öğrencide oturum yine girer. Pasif öğrencide sonraki oturumlar girmez, etkin false, seviye 0, telefona inmez. Yeniden eklemede D03 aynı satırı canlandırır; şube değişiminde satırların birleşimi kullanılır. Seçim liste_satirlari.gec_kayit_secimi sütunudur (D03-B12).', 'Anlar timestamptz ({teknik:veritabani-donem-alani|Zaman ve sıralama}); oturum başlangıcı D02\'den gelir, pencere ayrıca okunmaz; iki kural da öğrenci lehine (D03-B11); varsayılan {plan:devam|plandaki gibi} ekle-bırak.'),
  g('D08-B13', 'Kapsamda bir türde taban ve planlı saat toplamı 0 ise o tür için satır yok; genel sonuç yalnız satırı olan türlerden. T = 0 iken yuzde_onda boş, tür kararı DEVAMLI.', 'Formül T=0\'da hak 0 verir; satır üretilseydi öğrenci boş türde "Hakkın kalmadı" alırdı.'),
  g('D08-B14', 'API tür başına tabanSaat, devamsizSaat, mazeretliSaat, katildigiSaat, acikSaat, hak ve yuzdeOnda (onda bir birimli tam sayı, 695 = %69,5) döner; "toplam" sütununun seçimi ve metin biçimi D10\'un.', 'Bütün sayılar döndüğü için gerçek AKSİS örneği görülünce yalnız D10\'un sütun seçimi değişir. Tam sayı yüzde ile karar her p, T 1 ile 400 ve her devamsızlıkta 8.140.600 durumda çelişmez (d08/ref.js).'),
  g('D08-B15', 'Telafi eksiği ders ve şube düzeyinde, tür başına: geçmişte hoca nedeniyle iptal edilen ya da "yapılmadı" denen NORMAL oturum saati eksi yapılan TELAFI oturum saati, 0\'ın altına inmez; tatil iptali girmez. dersSonuclari telafiEksigi alanında döner.', 'Bağ alanı gerektirmez, hocaya iş yüklemez; D10-B19 ile aynı tanım. {plan:devam|Planın işareti} bu sayıdan kurulur.'),
  g('D08-B16', 'BAGLANTI: öğrencinin kapsamındaki iptal edilmemiş son oturum bitmiş, öğrencinin teyitli hesabı var (teyitsiz hesabın gelecek kaydı Beklemede olur, sonucu çeviremez) ve D06.kurulumSonTemasi\'nın son temas anı bu oturumun bitişinden önce (ya da son temasta bu derse bekleyen öğe bildirilmiş). Tek kayıt: başlangıcı son temastan sonra olan, yapılan ve son durumu Yok olan her oturum tek tek bütün saatleriyle Var sayılır; biri genel sonucu DEVAMSIZ\'dan DEVAMLI\'ya çeviriyorsa KARAR BEKLİYOR. Son temas D08\'e tetik getirmediği için liste ucu ve dersSonuclari bu nedeni canlı hesaplar.', '{plan:devam-donem-sonu|Planın iki koşulunu} ölçülebilir kılar; karma oturumda tek kaydın iki türü birden değiştirdiğini sayar; hesabı olmayan öğrencinin bekleyen kaydı olamaz.'),
  g('D08-B17', 'Açık işaretler: kararı Beklemede ve İncelemede sayılan kayıt, onay bekleyen Kendi beyanı, açık sorun bildirimi. Aralık sınaması: hepsi lehine (Var) ve hepsi aleyhine (Yok) iki hesap; genel sonuç farklıysa ACIK_ISARET. Kafa sayısı işareti bu listede değil (D08-A05).', 'Karar açık işaretlerde tekdüzedir (bir oturumu Var yapmak hiçbir türü DEVAMLI\'dan DEVAMSIZ\'a çevirmez; d08/ref.js 1.660.725 durum), bu yüzden iki uç hesap kesin cevap verir ve gereksiz KARAR BEKLİYOR üretmez.'),
  g('D08-B18', 'Anlık D08\'de tutulmaz: contracts.json "AKSİS anlığı" kararıyla anlık tabloları D10\'un, değerler dersSonuclari ile gelir. Kilit anı D02\'nindir (son günün ertesi 00:00 Europe/Istanbul). dersSonuclari çağıranın işleminde canlı hesapladığından anlık bekleyen devam_hesapla işine bağlı kalmaz.', 'Tek yazar kuralı; hoca çıktısı ve gün sonu anlığının ayrıntısı D10-B13\'te.'),
  g('D08-B19', 'Son günden sonra gelen kaydı D05 ve D07 sayılmayan olarak saklar, D08 saymaz. "Sonradan değişenler" listesinin sahibi D09; listeye almak için sonucuDegistirebilirMi\'yi çağırır (kayıt sayılsaydı sonuç değişir miydi). Kilitte İncelemede ve Beklemede kalan sayılmaz; sonradan onaylanırsa aynı sınamadan geçer. Sayım ancak denetimli düzeltmeyle değişir.', '{plan:kararlar-gonderme-suresi|Gönderme süresi} ile {plan:devam-donem-sonu|Dönem sonu} birlikte okunur (D08-C03).'),
  g('D08-B20', 'Muaf: yalnız dersin hocası, dönem kilidine ve arşive kadar, pasif satırda değil; her değişiklik D09.denetimeYaz (devam.muaf_degisti). Muafta tür sayıları hesaplanır ve gösterilir, seviye 0, sonuç DEVAMLI_MUAF, KARAR BEKLİYOR yok, oturum son durumu MUAF; açılınca telefon o dersin bildirimini kaldırır, kapanınca seviye veri değişikliği olarak baştan hesaplanır.', 'Hatalı işaret sayılardan hemen görülür; her düzeltme kim, ne zaman, neden ile kaydedilir ({plan:kararlar-supheli-kayit|Sorun bildir}); {plan:devam|muaf öğrenciye hak uyarısı gitmez}.'),
  g('D08-B21', 'p tam sayı 0 ile 100, iki tür ayrı; yalnız kapsamı dersin birimini içeren yönetici; dönem kilidine ve arşive kadar; denetim devam.oran_degisti (önceki ve yeni değer); değişiklik veri değişikliğidir, seviye serbestçe yeniden hesaplanır. p dönem boyunca tek değerdir; devam_durumlari.p üstünde CHECK var, dersler tablosundaki CHECK D02\'nin.', 'Formül yalnız tam sayıyla çalışır; kural veritabanında da korunur ({teknik:veritabani|Kısıtlar}).'),
  g('D08-B22', 'Sayım tabanı açılışta Zod\'la doğrulanan tek genel ayar DEVAM_SAYIM_TABANI; ilk sürümde yalnız YAPILAN kabul edilir. Taban satırda (sayim_tabani) ve dersSonuclari cevabında yazar; ayar değişince gece denetimi açık dönemleri yeniden hesaplar. Birim farkı çıkarsa birim_donemleri\'ne (D02) sütun eklenir.', '{plan:acik-sayim-tabani|Teyide kadar yapılan saat}; PLANLANAN tanımı sahibin açık noktası (D08-A06); ayar şeması D15\'in infra/ayarlar dosyasında, D08 bileşim kökünden parametre olarak alır ({teknik:sunucu-ayarlar|Ayarlar}).'),
  g('D08-B24', 'Öğrencinin kendi bölümü D06\'ya kayıtlı devam indirme kaynağıyla tam liste iner: açık dönemlerdeki etkin dersleri için tür başına seviye, mesajKodu, gösterilen kalan hak, tahmini hak, kullanılan saat, taban ve planlı saat, sonraki oturum saati, muaf; oturum başına son durum ve saatler. Değişince iş D06.ogrenciDurumuDegisti çağırır. Yalnız teyitli hesaba iner. Yeni kurulumda telefon 1 ve üstü seviyeleri bir kez bildirir.', '{plan:kararlar-indirme|Planın indirme listesi} başka öğrencinin verisini dışlamak için "yalnız" der; öğrencinin kendi devam durumu ekranın ihtiyacıdır ({plan:kararlar-supheli-kayit|Öğrencinin ekranı: her derste kalan hakkı}) ve contracts.json "Öğrencinin kendi durumu" kararı ile D06-B11 bunu öğrenci bölümüne koyar; liste bu anlamda genişler, başka öğrencinin verisi yine inmez. Satır başına sürüm gerekmez; teyitsiz numara sahiplenmesi başkasının devamını göremez.'),
  g('D08-B25', 'sonucuDegistirebilirMi dönem ortasında tahmini tabanla çalışır: oturum Var ve Yok çözülünce tür kararı (kullanılan <= tahmini hak) ya da hesaplanan seviye farklıysa true; son oturumdan sonra planlı saat 0 olduğundan AKSİS tabanına iner.', 'Seviyeyle aynı tahmin tabanı; dönem başında her devamsızlığı kritik saymaz (D09-B20 ile aynı tanım).'),
];

const contradictions = [
  { id: 'D08-C01', resolution: 'Bildirim yalnız gösterilen seviye değişince gider. Seviyeyi değiştirmeyen ret ya da düzeltmede öğrenci değişikliği kendi kayıtlarında ve oturum son durumunda görür (öğrenci bölümü iner); "öğrenciye bildirilir" bu iki yolla karşılanır. Düşüşte bildirimin nasıl değiştiği D08-A04.' },
  { id: 'D08-C02', resolution: 'hesaplanan_seviye durumun saf fonksiyonudur ("durumdan hesaplanır"; atlanan seviyenin mesajı sonradan gönderilmez); gösterilen seviyeye geri gitmez kuralı uygulanır ve ayrı sütunda saklanır. CHECK seviye >= hesaplanan_seviye ikisini bağlar; kuralın kapsamı D08-A03.' },
  { id: 'D08-C03', resolution: 'Son günden sonra gelen kayıt sayılmaz; "sonucu değiştirirse" cümlesi "sayılsaydı değiştirecek olsaydı" diye okunur: D09 sonucuDegistirebilirMi ile listeye alır, sayım yalnız denetimli düzeltmeyle değişir (D08-B19).' },
  { id: 'D08-C04', resolution: 'Sunucu değişmez: seviye ilk günden hesaplanır ve iner; izin verildiği anda telefon geçerli seviyeyi bir kez bildirir, izin yokken uyarı yalnız ekranda görünür ({tasarim:ph-home|öğrenci ana ekranı}).' },
];

const o = (id, question, recommendation, needs_owner, kim) => ({ id, question, recommendation, needs_owner, kim });
const openPoints = [
  o('D08-A01', 'Beklemede kararlı kayıt hak, seviye ve AKSİS hesabında nasıl sayılır? (D08-B01)', 'Seviye ve kalan hakta geçici var (kullanilan_saat = devamsiz_saat - beklemede_saat); AKSİS kararında devamsız; sonucu çevirebiliyorsa açık işaret ve KARAR BEKLİYOR. Beklemede bir ret değil geçiş durumudur ({plan:hedefler|"beklemesi bitince verilen kararla girer"}). Spec bu seçenekle yazıldı; başka seçenekte değişen yer seviye girdisi (seviye.ts) ve devam_durumlari_kullanilan_saat_ck kısıtı.', true, 'sahip'),
  o('D08-A02', 'Kafa sayısı girilmemiş ve "Ders yapıldı mı?" sorusu cevapsız geçmiş oturum cevaba kadar nasıl sayılır? (D08-B02)', 'Cevaba kadar planlı saat olarak tahmini T\'de kalır, devamsızlık yazılmaz; "yapıldı" gelince tabana geçer, "yapılmadı" gelince düşer. Yanlış uyarı üretmez ve "taban: yapılan dersler" kuralına uyar; cevapsız oturum varken {plan:kararlar-kafa-sayisi|dönem sonu çıktısı zaten alınamaz}. Bedeli kafa sayısı girmeyen hocanın derslerinde uyarının gecikmesi; cevapsizOturumSayisi dersSonuclari\'nda döner ve ölçülür.', true, 'sahip'),
  o('D08-A03', '"Seviye geri gitmez" kuralı hangi değişikliklerde geçerli? (D08-B05)', 'Veri ve tahmin ayrımı: kullanılan saat, p, muaf, üyelik, kural sürümü ya da sayım tabanı değiştiyse (kayıt, karar, onay, ret, düzeltme, liste, muaf, oran) seviye serbestçe yeniden hesaplanır ve düşebilir; yalnız planlı saat ve sonraki oturum değiştiyse (telafi, iptal, yalnız T\'yi düşüren "yapılmadı", zaman) gösterilen seviye, mesaj ve kalan hak üçlüsü aynen kalır. Kural iş nedenine değil saklanan girdilere bakar, birleşen işlerde de aynı sonucu verir. Bedeli: tutulan üçlü sonraki veri değişikliğine kadar biraz kötümser kalır (telafi 1 saat hak açsa da "Hakkın kalmadı" görünür).', true, 'sahip'),
  o('D08-A04', 'Seviye düşünce ya da 0\'a inince öğrenciye ne gösterilir? (D08-B06)', 'Aynı bildirim kimliği yeni seviyenin metniyle değiştirilir; 0\'a inince bildirim kaldırılır, yeni metin yok ({teknik:telefon-arka-plan|tek bildirim, yenisi eskisinin yerine}). Sunucu yalnız seviye ve mesajKodu gönderir; metinler packages/core/src/devam/metinler.ts içinde tek yerde.', true, 'sahip'),
  o('D08-A05', 'Kafa sayısı aşımıyla işaretli ve incelenmemiş oturum öğrencinin KARAR BEKLİYOR\'una girer mi? (D10-B07 neden 4 ile D08-B17 ayrışıyor)', 'Öğrenci düzeyinde girmez: işaret kararı değiştirmez (D07-B05) ve D08 sözleşmede D07\'yi okumaz (D07 ile D08 izinli iki yönlü çift değil). Planın "çıktı geçici kalır" kuralı şube düzeyinde D10\'un geçici nedeni olarak karşılanır; D10 tabloyu okuma istisnasıyla görür. Öğrenci düzeyinde istenirse D07\'nin işaret listesini D08\'e veren dinleyici kaydı gerekir.', true, 'sahip, D10'),
  o('D08-A06', 'Sayım tabanı PLANLANAN seçilirse taban hangi oturumlardan oluşur?', 'Öğrenci işleri teyidine kadar yalnız YAPILAN açık ({plan:acik-sayim-tabani|Sayım tabanı}). PLANLANAN için öneri: kapsamdaki, programdan üretilmiş (NORMAL), iptal edilmemiş bütün oturumların saati; "yapılmadı" denen oturum tabanda kalır ama devamsızlık yazılmaz, telafi tabana girmez, telafide var olunan saat katılım sayılır. Teyit gelince ayar açılır, gece denetimi yeniden hesaplar.', true, 'sahip'),
  o('D08-A07', 'D08 kayıtların ve düzeltmelerin kişi kimliğini öğrenci numarasına nasıl çevirir?', 'contracts.json D08.reads_from listesine D01 eklenir; yalnız D01.ogrenciHesabiGetir(tx, {kisiId | numara}) kullanılır (kişiden numaraya; numaradan teyitli hesaba). D01 D08\'i okumadığından yeni iki yönlü çift doğmaz, dosya düzeyinde döngü yok. Numara anahtarı hesapsız, şube değiştiren ve yeniden kaydolan öğrenciyi tek satırda tutar (D01-B33 ile D12-B19 hangisi seçilirse seçilsin).', false, 'sözleşme, D01'),
  o('D08-A08', 'Öbür modüllerden beklenen tetik çağrıları ve alanlar sahiplerinin speclerinde var mı?', 'D05: sayılan işareti ya da kararı değişen her kayıt yazımında aynı işlemde devamHesaplaIsiKoy(tx, dersId, ogrenciId, KAYIT ya da KARAR); sayilanKayitlar süzgeci {dersId, ogrenciIdler?}, alanlar karar, kendiBeyani, onayBekliyor. D02: kafa sayısı ve "Ders yapıldı mı?" yazımında devamHesaplaIsiKoy(tx, dersId, null, YAPILDI); dersYetkisi dönüşü {hoca, yonetici (kapsam dahil)}; oturumlariGetir oturumda şube kimlikleri, tür (NORMAL, TELAFI), durum, iptal nedeni, yapildi, saatler. D06: kurulumSonTemasi dönüşünde son temas anı ve varsa ders başına bekleyen öğe sayısı. D09: düzeltme ve sorun bildirimi açılış ve kapanışında devamHesaplaIsiKoy; sonDurumOnceligi dönüşünde kazanan düzeltmenin kimliği; hesapsız öğrencinin düzeltmesinde liste satırı kimliği; duzeltmeleriGetir süzgeci {dersId, ogrenciIdler?}. D15: ayar şemasına DEVAM_SAYIM_TABANI (ilk sürümde yalnız YAPILAN); isletim_denetimi devam_tutarlilik_denetimi çıktısındaki farkSayisi > 0 için işletim uyarısı açar.', false, 'D02, D05, D06, D09, D15'),
  o('D08-A09', 'Muaf ucunun yol parametresi neyi taşır?', 'contracts.json\'daki {ogrenciId} adı {satirId} olur: hesabı olmayan öğrenci de muaf işaretlenebilsin (tekrarlayan öğrenci uygulamayı hiç kurmayabilir); değer D03.muafIsaretle\'nin aldığı liste satırı kimliği. Yolun biçimi (ogrenciler/{x}/muaf) aynı kalır.', false, 'sözleşme'),
  o('D08-A10', 'Son hafta hatırlatması için birimin son günü telefona hangi yoldan iner? (D08-B23)', 'D08\'in sunucu hesabı son güne ihtiyaç duymaz. D02-B32 (ders satırında son gün) ile D06-B16 (son oturumdan çıkarım) ayrışıyor; öneri D02-B32, çünkü gönderme süresi en geç son gündür ve son gün son ders gününden sonra olabilir ({plan:devam-donem-sonu|Dönem sonu}).', false, 'D02, D06'),
  o('D08-A11', 'Paneldeki oturum tablosunun Son durum sütunu (D05\'in oturum kayıtları ucu) D08\'den nasıl gelir?', 'D08 dış yüzüne ekleme: oturumSonDurumlari(tx, oturumId) oturumun bütün öğrencileri için oturum_son_durumlari satırlarını liste satırı kimliğiyle döner; D05 çağırır. Sözleşmedeki dört dış yüzde karşılığı yok.', false, 'sözleşme, D05'),
];

const errorCodes = [
  ['DEVAM_DERS_YOK', '404', 'Ders yok ya da çağıran göremiyor: dersin hocası değil (karar bekleyenler, muaf) ya da kapsamı dersin birimini içermeyen yönetici (oranlar). Varlık sızmaz.'],
  ['DEVAM_OGRENCI_YOK', '404', 'satirId bu dersin bir şubesine ait liste satırı değil.'],
  ['DEVAM_SATIR_PASIF', '409', 'Pasif liste satırında muaf değiştirilmez; önce satır canlandırılır (D03).'],
  ['DEVAM_DONEM_KILITLI', '409', 'Birimin dönem kilidi uygulandı (D02.kilitDurumu); muaf ve oran değişmez.'],
  ['DEVAM_DERS_ARSIVDE', '409', 'Ders arşivlendi; muaf ve oran değişmez.'],
];

// ---------------------------------------------------------------- spec JSON
const spec = deep({
  id: 'D08', module: 'devam', summary,
  tables, endpoints, jobs, state_machines: stateMachines, invariants, exports: exports_, files, tests,
  resolved_gaps: resolved, contradictions_resolved: contradictions,
  open_points: openPoints.map(({ kim, ...r }) => r),
}, plain);
fs.mkdirSync(path.join(B, 'spec'), { recursive: true });
fs.writeFileSync(path.join(B, 'spec', 'D08.json'), JSON.stringify(spec, null, 2) + '\n');

// ---------------------------------------------------------------- fragment HTML
const L = [];
const p = s => L.push(`<p>${html(s)}</p>`);
const rows = items => { L.push('<div class="rows">'); for (const [k, v] of items) L.push(`<div class="row"><div class="k">${html(k)}</div><div>${html(v)}</div></div>`); L.push('</div>'); };
const table = (head, body) => { L.push('<table>'); L.push('<thead><tr>' + head.map(h => `<th>${html(h)}</th>`).join('') + '</tr></thead>'); L.push('<tbody>'); for (const r of body) L.push('<tr>' + r.map(c => `<td>${html(c)}</td>`).join('') + '</tr>'); L.push('</tbody>'); L.push('</table>'); };
const details = (summaryText, fn) => { L.push(`<details><summary>${html(summaryText)}</summary>`); fn(); L.push('</details>'); };

L.push('<section id="devam">');
L.push(`<h2>Devamsızlık hesabı ve uyarılar <span class="tag mute">D08 devam</span></h2>`);
p(summary);

L.push('<h3>Amaç ve sınırlar</h3>');
rows([
  ['Ne yapar', 'Hak ({plan:devam-uyari-seviyeleri|formül}), tür kararı ve yüzde ({plan:devam-donem-sonu|AKSİS özeti}), dört uyarı seviyesi, oturum başına son durum ({plan:gun-son-durumlar|Son durumlar}), KARAR BEKLİYOR, telafi eksiği. Muaf ({plan:devam|Md.20/5}) ve oran uçları; denetim ve yeniden hesap.'],
  ['Ne yapmaz', 'p ve muaf sütunlarını yazmaz (D02.oranlariYaz, D03.muafIsaretle); kayıt kararı vermez (D07, yazan D05); AKSİS anlığı tutmaz (D10); bildirim göndermez: hak uyarısı telefonda yereldir ({plan:kararlar-supheli-kayit|Bildirim}), sunucuda bildirim işi yok. AKSİS\'e bağlanmaz ({plan:tek-bakista|hoca elle girer}); rapor türü, tarihi ve sağlık bilgisi tutmaz ({plan:devam|Rapor ve izin}); yıllık ders ve anabilim dalı bazında uygulama hesabı (Md.19/2) ilk sürümde yok ({plan:teknoloji-sunucu-yeri|Birimlere genişleme}).'],
  ['Ölçülen sonuç', 'Gece denetiminin fark sayısı 0 (hedef: {plan:hedefler|hesabın elle hesaplananla uyuşmazlığı 0}); devam_hesapla gecikmesi p95 olağan saatte en çok 30 saniye, ders çıkışında en çok 5 dakika (pg-boss iş tablosundan); canlı hesap 300 öğrenci ve 70 oturumda p95 en çok 1 saniye. Haksız devamsız sayımı D10\'un raporunda, girdisi dersSonuclari ve sonucuDegistirebilirMi.'],
  ['Öğrenci anahtarı', '(ders_id, ogrenci_no): liste satırı numarayla tutar (D03-B08), kayıtlar kişi kimliğiyle (D05). Kişi kimliği D01.ogrenciHesabiGetir ile numaraya çevrilir (D08-A07). Hesapsız öğrenci de tek satır alır: Yok oturumları, düzeltmeleri ve AKSİS sonucu vardır, KARAR BEKLİYOR olmaz.'],
  ['Kod yerleri', 'apps/server/src/modules/devam/ (dış yüz index.ts, yaprak.ts), apps/server/src/jobs/devam/, packages/core/src/devam/ (saf kurallar, telefon ve panel de kullanır), packages/contracts/src/devam.ts (şemalar, üç rota, DEVAM_ hata kodları, denetim olayları devam.muaf_degisti ve devam.oran_degisti, iş verisi ve indirme bölümü şeması). Göç: apps/server/migrations/<UTC zaman>_devam_tablolar/ (sözleşmenin migration_dir kuralı; klasör sahipliği haritada D12\'nin).'],
  ['Okuduğu dış yüzler', 'D02 dersGetir, subeGetir, dersYetkisi, dersSubeleri, oturumlariGetir, oturumSubeleri, birimDonemiGetir, takvimGetir, kilitDurumu, oranlariYaz, oturumUretimDinleyicisiKaydet, kilitAdimiKaydet; D03 listeSatirlari, satirGetir, muafIsaretle, listeDegisikligiDinleyicisiKaydet; D04 simdi, oturumKapandiDinleyicisiKaydet; D05 sayilanKayitlar, kayitGetir; D06 indirmeKaynagiKaydet, ogrenciDurumuDegisti, kurulumSonTemasi; D09 denetimeYaz, duzeltmeleriGetir, sonDurumOnceligi, ogrencininSorunBildirimleri; D12 islem, saklamaIsleyicisiKaydet, kisitAdi; D13 rotalariKaydet, uygulamaHatasi, hizSinifi; D14 isGonder, isTanimla; önerilen D01 ogrenciHesabiGetir.'],
  ['Yetkiler', 'yoklama_api dört tabloda yalnız SELECT (uçlar D08 tablosuna yazmaz). yoklama_isci devam_sonuclari\'nda SELECT, INSERT, UPDATE; devam_durumlari ve oturum_son_durumlari\'nda ayrıca DELETE; devam_seviye_gecmisi\'nde yalnız INSERT ve SELECT. Satır silme (saklama) yalnız yoklama_goc rolüyle; devam_sonuclari silinince öbür üçü CASCADE ile gider.'],
  ['Kayıtlar', 'Eklentide (API ve işçi bileşiminde bir kez): D02\'ye oturum üretim dinleyicisi ve kilit adımı, D03\'e liste dinleyicisi, D04\'e oturum kapanış dinleyicisi (hepsi ders geneli devamHesaplaIsiKoy; YAPILDI ve OTURUM_KAPANDI gecikmeli; kesinti kapanışına dinleyici yok, çünkü kesinti sonrası değişen kararları D07 verir, D05 yazar ve D05 tetikler), D06\'ya devam indirme kaynağı, D12\'ye saklama işleyicisi (yoklama kayıtlarıyla aynı süre; oturumlar silinmeden önce çalışmalı), D13\'e rota listesi, D14\'e iki iş. index.ts yüklenirken başka modül çağırmaz.'],
]);

L.push('<h3>Tablolar</h3>');
p('Dört tablo, hepsi `modules/devam/tablolar.ts` içinde; kimlikler `uuidv7()`, anlar timestamptz, kod listeleri metin ve CHECK ({teknik:sunucu-mimari|Veritabanı erişimi}). Hak, tür kararı ve yüzde CHECK ile veritabanında da hesaplanır: kod hatası bozuk değer yazdıramaz ({teknik:veritabani|Kısıtlar}). Bu DDL tasarım sırasında PostgreSQL 17.5 (PGlite; uuidv7 yerine yalnız testte gen_random_uuid) üstünde çalıştırıldı: kural modelinden üretilen 1.718 geçerli satır kabul edildi, 26 kısıtın her biri yalnız kendi kuralını bozan satırı adıyla reddetti, saklama silmesi CASCADE ile çocukları götürdü (betik d08/pg/ddl-test.mjs).');
for (const tb of tables) {
  p(`\`${tb.name}\`: ${tb.purpose}`);
  details(`${tb.name}: ${tb.columns.length} sütun, ${tb.constraints.length} kısıt${tb.indexes.length ? ', ' + tb.indexes.length + ' dizin' : ''}`, () => {
    table(['Sütun', 'Tür', 'Boş', 'Varsayılan', 'Not'], tb.columns.map(c => [`\`${c.name}\``, c.type, c.null ? 'evet' : 'hayır', c.default || '', c.note]));
    L.push('<ul>'); for (const k of tb.constraints.concat(tb.indexes.map(i => 'dizin ' + i))) L.push(`<li><code>${esc(k)}</code></li>`); L.push('</ul>');
  });
}

L.push('<h3>Uç noktalar</h3>');
rows(endpoints.map(e => [`${e.method} ${e.path}`, `${e.auth} ${e.idempotency} Hata kodları: ${e.errors.join(', ')}. Sınır: ${e.rate_limit}`]));
details('İstek ve cevap alanları (üç uç; JSON camelCase, kod değerleri BÜYÜK_HARF, büyüyebilen kodlar x-extensible-enum, D13)', () => {
  for (const e of endpoints) {
    p(`\`${e.method} ${e.path}\``);
    table(['Yön', 'Alan', 'Tür ve kural'], [
      ...Object.entries(e.request).map(([k, v]) => ['istek', `\`${k}\``, v]),
      ...Object.entries(e.response).map(([k, v]) => ['cevap', `\`${k}\``, v]),
    ]);
  }
});

L.push('<h3>İşler</h3>');
rows(jobs.map(j => [j.name, `${j.does} Zamanlama: ${j.schedule} Tekrar: ${j.idempotency}`]));
details('Tetikler: devam_hesapla işini kim, hangi olayda, hangi kapsamla koyar', () => {
  table(['Olay', 'Çağıran', 'Yol', 'Kapsam', 'Neden'], [
    ['Kayıt sayıldı ya da sayılan kaydın kararı değişti (gönderim, makbuz okutma, teyit, onay, ret, rastgele isim, kesinti sonrası yeniden değerlendirme)', 'D05 (kayıt satırının tek yazarı)', 'devamHesaplaIsiKoy', 'öğrenci', 'KAYIT, KARAR'],
    ['Düzeltme eklendi ya da geri alındı', 'D09', 'devamHesaplaIsiKoy', 'öğrenci; hesapsızda ders', 'DUZELTME'],
    ['Sorun bildirimi açıldı ya da kapandı', 'D09', 'devamHesaplaIsiKoy', 'öğrenci', 'SORUN_BILDIRIMI'],
    ['Liste yüklendi, satır eklendi, pasif oldu, canlandı, geç kayıt seçimi değişti', 'D03 dinleyici (D08 kaydeder)', 'listeDegisikligiDinleyicisiKaydet', 'ders', 'LISTE'],
    ['Oturumlar üretildi ya da yeniden üretildi (program, telafi, iptal, takvim)', 'D02 dinleyici', 'oturumUretimDinleyicisiKaydet', 'ders', 'PROGRAM'],
    ['Kafa sayısı ya da "Ders yapıldı mı?" cevabı', 'D02', 'devamHesaplaIsiKoy (5 dakika sonra)', 'ders', 'YAPILDI'],
    ['Oturum penceresi kapandı', 'D04 dinleyici', 'oturumKapandiDinleyicisiKaydet (15 dakika sonra)', 'ders', 'OTURUM_KAPANDI'],
    ['Dönem kilidi (birimin dersleri devam_sonuclari.birim_id ile bulunur)', 'D02 kilit adımı', 'kilitAdimiKaydet', 'ders', 'KILIT'],
    ['Oran ya da muaf değişti', 'D08 uçları', 'devamHesaplaIsiKoy', 'ders', 'ORAN, MUAF'],
    ['Gece', 'devam_tutarlilik_denetimi', 'doğrudan hesap', 'ders', 'TUTARLILIK, KURAL'],
  ]);
});
details('devam_hesapla bir ders grubunda sırasıyla ne yapar', () => {
  L.push('<ol>');
  for (const s of [
    'İşlemin ilk komutu ders kilidi: pg_advisory_xact_lock(hashtext(\'devam\'), hashtext(ders_id::text)); işlem READ COMMITTED, kilitten sonraki her okuma önceki yazanın sonucunu görür.',
    'Saat bir kez okunur: an = D04.simdi(). Ders düzeyi girdiler bir kez: D02.dersGetir (p, birim, dönem, arşiv), oturumlariGetir (şube kimlikleri yoksa oturumSubeleri), birimDonemiGetir ve takvimGetir; D03.listeSatirlari her şube için.',
    'Öğrenci kümesi: gruptaki işlerin ogrenciId değerleri D01 ile numaraya çevrilir; null iş varsa dersin bütün liste numaraları. Öğrenci girdileri: D05.sayilanKayitlar, D09.duzeltmeleriGetir, teyitli hesap için D09.ogrencininSorunBildirimleri, son oturum bitmişse D06.kurulumSonTemasi; saklanan önceki durum.',
    'packages/core/src/devam: kapsam, oturum son durumları (D09.sonDurumOnceligi ile kazanan, D08 bölüşümü), tür durumları, hesaplanan seviye, gösterilen üçlü (geri gitmez kuralı), genel sonuç, KARAR BEKLİYOR.',
    'Yazım: INSERT ... ON CONFLICT DO UPDATE ... WHERE (sütunlar) IS DISTINCT FROM (EXCLUDED); kapsamdan çıkan oturum ve tür satırları silinir; gösterilen seviye değiştiyse devam_seviye_gecmisi\'ne satır.',
    'Telefona inen bir değeri değişen her öğrencinin teyitli hesabı için D06.ogrenciDurumuDegisti(tx, kisiId).',
    'Log satırı: ders kimliği, öğrenci sayısı, yazılan ve silinen satır, süre, iş kimlikleri; numara ve isim yok.',
  ]) L.push(`<li>${html(s)}</li>`);
  L.push('</ol>');
});

L.push('<h3>Durumlar ve kurallar</h3>');
L.push(`<p class="card formula"><code>hak = T - (T x p + 99) div 100</code></p>`);
p('Formül, T ve p\'nin tanımı plandadır ({plan:devam-uyari-seviyeleri|Hak formülü ve test notları}); burada yalnız sunucunun kesinleştirdikleri yazar.');
rows([
  ['Kapsam ve T', 'Öğrencinin bu dersteki satırlarından biri oturumun şubesini kapsıyor ve oturum başlangıcı [eklenme anı, pasif anı) içinde; Md.9/4 (onceki_yok) seçiminde ilk eklenmeden önceki oturumlar da, eklenmeden önce başlamış oturumda katılım varsa o oturum da kapsamda. T: kapsamdaki yapılan (durum planlandı, yapildi evet) oturumların türdeki saati.'],
  ['Planlı kalan saat', 'Kapsamdaki gelecek oturumlar ile "Ders yapıldı mı?" cevapsız geçmiş oturumlar (D08-A02). Seviye tahmini hak = hak(T + planlı, p) ile; AKSİS kararı yalnız T ile ({plan:devam-uyari-seviyeleri|plan}).'],
  ['Seviye', 'kullanılan > tahmini hak: 4 HAKKINI_ASTIN; kalan = 0: 3 HAKKIN_KALMADI; sonraki oturum varsa ve kalan <= onun saati: 2 (kalan < saat ise BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN, eşitse BIR_DERS_DAHA_HAKKIN_BITER); 2 x kullanılan >= tahmini hak: 1 YARISINI_KULLANDIN; değilse 0. İlk sağlanan kazanır; muaf ve pasifte 0.'],
  ['Geri gitmez', 'Gösterilen üçlü (seviye, mesaj, kalan hak) yalnız veri değişikliğinde düşer; yalnız tahmin değişince aynen kalır, yükseliş her zaman gösterilir. Veri: kullanılan saat, p, muaf, etkinlik, üyelik özeti, kural sürümü, sayım tabanı (D08-A03).'],
  ['Oturum saatleri', 'Kayıt Var (onay bekleyen Kendi beyanı dahil, geçici) bütün saati var; Beklemede ve İncelemede açık; kayıt yoksa ya da Ret ise yok. Kazanan düzeltme kendi saatine kendi durumunu verir (Elle eklendi var, Görevli ve Belgeli mazeretli, sınıfta değil yok); kalan saat Var türü düzeltmede yok, öbürlerinde kaydın durumunda.'],
  ['Tür sonucu ve yüzde', 'devamsız = yok + Beklemede + İncelemede = T - katılım - mazeretli; DEVAMLI ancak ve ancak devamsız <= hak; yuzde_onda = (T - devamsız) x 1000 div T, aşağı yuvarlanmış tek ondalık ({plan:devam-donem-sonu|AKSİS özeti}). Görevli ve Belgeli saatleri T\'yi değiştirmez.'],
  ['Genel sonuç', 'Muafta DEVAMLI_MUAF; değilse satırı olan türlerden biri DEVAMSIZ ise DEVAMSIZ. KARAR BEKLİYOR ayrı bayrak: ACIK_ISARET (aralık sınaması) ve BAGLANTI (son temas ve tek kayıt).'],
  ['Saklanan ve canlı', 'Telefonun gördüğü seviye ve geçmiş saklanır (devam_hesapla). dersSonuclari, karar bekleyenler ve sonucuDegistirebilirMi aynı fonksiyonlarla çağıranın işleminde canlı hesaplar; iki yol yalnız zamanda ayrışabilir, gece denetimi ölçer.'],
]);
details('Durum makineleri (3)', () => {
  for (const sm of stateMachines) {
    p(`${sm.name}: ${sm.states.join(', ')}`);
    table(['Nereden', 'Nereye', 'Kim', 'Ne zaman'], sm.transitions.map(x => [x.from, x.to, x.by, x.when]));
  }
});
details(`Değişmezler (${invariants.length}; testler ve CHECK kısıtları bunları korur)`, () => { L.push('<ol>'); for (const s of invariants) L.push(`<li>${html(s)}</li>`); L.push('</ol>'); });
details('Dış yüz: sözleşmedeki dört işlev', () => { p('Tipler: Islem D12\'nin; DersId, SubeId, OturumId, OgrenciId, DonemId, KayitId D13\'ün ortak markalı kimlikleri (packages/contracts/src/ortak); DevamNedeni, DevamTetikleyenTuru, SubeDevamSonuclari, OgrenciDevamDurumu packages/contracts/src/devam.ts içinde.'); table(['İşlev', 'İmza', 'Amaç'], exports_.map(x => [x.name, `\`${x.signature}\``, x.purpose])); });

L.push('<h3>Hata kodları</h3>');
p('Modül kodları packages/contracts/src/devam.ts içinde, hata zarfı ve kök hataları (401, rol uyuşmazlığında 403, 400 doğrulama, 429, 503) D13\'ün. Başka hocanın dersi 403 değil 404 döner.');
rows(errorCodes.map(([k, s, v]) => [`${k} (${s})`, v]));

L.push('<h3>Testler</h3>');
const byKind = tests.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {});
p(`${tests.length} test: ${Object.entries(byKind).map(([k, v]) => `${v} ${k}`).join(', ')}. Saf kurallar Vitest ve fast-check ile packages/core/src/devam içinde, davranışlar Türkçe Gherkin ile apps/server/test/features/devam içinde ({teknik:testler|Testler}). Testler kuralı tanımla ya da açıkça yazılmış beklenen değerle karşılaştırır, koddan türetmez; yokluk iddia eden her test bir artı kontrol taşır.`);
details(`Test listesi (${tests.length})`, () => { table(['Ad', 'Tür', 'Denetlediği'], tests.map(x => [x.name, x.kind, x.asserts])); });
details(`Dosyalar (${files.length}, hepsi D08\'in klasörlerinde)`, () => { L.push('<ul>'); for (const f of files) L.push(`<li><code>${esc(f)}</code></li>`); L.push('</ul>'); });

L.push('<h3>Netleştirilenler</h3>');
p(`Envanterdeki 25 boşluğun ${resolved.length}\'si burada karara bağlandı, 5\'i açık noktada (D08-A01, A02, A03, A04, A10); 4 çelişkinin hepsi çözüldü.`);
details(`Boşluk kararları (${resolved.length})`, () => { table(['Boşluk', 'Karar', 'Neden'], resolved.map(x => [x.gap, x.decision, x.why])); });
details('Çelişkiler (4)', () => { table(['Çelişki', 'Çözüm'], contradictions.map(x => [x.id, x.resolution])); });

L.push('<h3>Açık noktalar</h3>');
p('Sahibin kararı gerekenlerde spec önerilen seçenekle yazıldı; değişirse etkilenen yer satırda yazar.');
L.push('<div class="rows">');
for (const x of openPoints) L.push(`<div class="row"><div class="k">${html(x.id)} <span class="tag${x.needs_owner ? ' warn' : ' mute'}">${html(x.kim)}</span></div><div>${html(x.question)} <strong>Öneri:</strong> ${html(x.recommendation)}</div></div>`);
L.push('</div>');
L.push('</section>');

const out = L.join('\n') + '\n';
fs.mkdirSync(path.join(B, 'frag'), { recursive: true });
fs.writeFileSync(path.join(B, 'frag', 'D08.html'), out);

// ---------------------------------------------------------------- self checks (deterministic)
const all = JSON.stringify(spec) + out;
if (/[–—]/.test(all)) throw new Error('dash found');
if (/KVKK/i.test(all)) throw new Error('KVKK found');
console.log('built', 'spec tables', spec.tables.length, 'endpoints', spec.endpoints.length, 'jobs', spec.jobs.length, 'tests', spec.tests.length, 'resolved', spec.resolved_gaps.length, 'open', spec.open_points.length, 'html bytes', out.length);

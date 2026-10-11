// D15 spec, part 1: summary, tables, endpoints. Turkish content; no U+2013 or U+2014.
'use strict';

const summary =
  "İşletim modülü (D15) sunucunun ayakta, güvenli ve ölçülebilir kalmasını sağlar: doğrulanmış ortam ayarları ve gizli anahtar dosyaları, pino logları, sağlık ve durum uçları, makinedeki saat eşitleme ve makine denetimi, uyarılar, Compose, Caddy, imaj ve yayın adımları, CI kapıları, yük testi ve ortak test dünyası onundur. " +
  "Üç tablosu telefonların günlük sayaçlarını, hocaların ekran sürelerini ve işletim uyarılarını tutar; sayaç paketi ortak kuyruktan telefon_sayaci öğesiyle, panelin ekran süreleri POST /v1/isletim/ekran-sureleri ile gelir. " +
  "Uyarılar tek defterde açılır ve kapanır; sahibe e-postayla ve SMTP'den bağımsız bir dış kalp atışı hizmetiyle ulaşır, dışarıdan GET /v1/durum denetimi alan adını, sertifikayı, Caddy'yi ve API'yi birlikte sınar. " +
  "Hedefler'deki sayılar olcum_ önekli görünümlerden tek sorguyla çıkar; haftalık özet e-postası ve olcum-raporu komutu bunları yazar, ayrı ham olay tablosu yoktur. " +
  "Alan modüllerini içe aktarmaz: D06, D12, D13 ve D14'ün dış yüzleri bileşim köklerinden parametreyle gelir; kendi dış yüzü (ayarlar, gizli anahtar, log, uyarı, saat eşitleme durumu, sayaç işleyicisi, test dünyası) öbür modüllere verilir.";

const col = (name, type, nul, def, note) => ({ name, type, null: nul, default: def, note });

const tables = [
  {
    name: 'telefon_sayaclari',
    purpose:
      "Telefonların günlük sayaç paketi: kurulum ve İstanbul günü başına tek satır, sunucunun göremediği sayılar (gönderilmemiş kayıt, başarısız deneme, bildirim izni, yerel modül çökmesi, iç sayaç okuma hatası, bilinmeyen öğe sonucu, ekran hataları, tek başına da reddedilen kaydın HTTP ve sunucu kodu). Aynı gün için daha büyük sıralı öğe satırı baştan yazar, küçük sıralı öğe yok sayılır; bu yüzden varış sırası sonucu değiştirmez. Ham olay tablosu değildir (plan.html#kararlar-olcum); hata metni, öğrenci numarası, isim yoktur; kisi_id yalnız hesap silinince satırları bulmak için durur. 13 ayda silinir.",
    columns: [
      col('id', 'uuid', false, 'uuidv7()', 'Birincil anahtar.'),
      col('kurulum_id', 'uuid', false, '', 'Paketi gönderen kurulum (D06 PaketBaglami.kurulumId). Yabancı anahtar yok: altyapı modülü alan tablosuna bağlanmaz (Durumlar ve kurallar, Bağımlılık yönü).'),
      col('gun', 'date', false, '', 'Sayıların ait olduğu İstanbul günü, telefonun gün sınırı. Ulaşma gününden en çok 395 gün eski, en çok 1 gün ileri olabilir.'),
      col('kisi_id', 'uuid', false, '', 'Paketin kişisi (PaketBaglami.kisiId). Yalnız hesap silinince satırları silmek için; ölçüm görünümleri çıktıya koymaz.'),
      col('rol', 'text', false, '', 'OGRENCI ya da PERSONEL (PaketBaglami.rol).'),
      col('platform', 'text', false, '', 'android ya da ios; CHECK listesi packages/contracts/src/api.ts PLATFORMLAR ile aynı (D13).'),
      col('uygulama_surumu', 'text', false, '', 'Günün sonundaki uygulama sürümü, en çok 32 karakter (paketteki uygulamaSurumu).'),
      col('runtime_surumu', 'text', true, '', 'expo-updates runtimeVersion; bildirilmezse boş.'),
      col('guncelleme_kimligi', 'uuid', true, '', 'Çalışan uzaktan güncellemenin kimliği (updateId); gömülü pakette boş.'),
      col('sira', 'bigint', false, '', 'Öğenin kurulumdaki sıra numarası (GelenOge.sira, 1 ve üstü); aynı gün için büyük sıra kazanır.'),
      col('oge_kimligi', 'uuid', false, '', 'Satırı son yazan öğenin UUIDv7 kimliği; aynı öğe yeniden gelirse ZATEN_VAR döner.'),
      col('gonderilmemis_kayit', 'integer', false, '0', 'Gün sonunda telefonda bekleyen, sunucuya ulaşmamış yoklama kaydı sayısı.'),
      col('basarisiz_deneme', 'integer', false, '0', 'Gün içindeki başarısız gönderim denemesi (ağ hatası, zaman aşımı, 408, 429, 5xx, öğe düzeyinde TEKRAR_DENE; D06-B06).'),
      col('bildirim_izni', 'boolean', true, '', 'Gün sonunda bildirim izni var mı; telefon bildirmezse boş (ölçümde paydaya girmez).'),
      col('yerel_modul_cokmesi', 'integer', false, '0', 'Açılışta okunan yerel modül çökmeleri (Android 11 ve üstünde süreç çıkış nedenleri, iPhone MetricKit; teknik.html#telefon-arka-plan).'),
      col('ic_sayac_okuma_hatasi', 'integer', false, '0', 'İç sayaç ve yeniden başlatma değerlerinin okuma hatası (teknik.html#telefon-ic-sayac).'),
      col('bilinmeyen_sonuc', 'integer', false, '0', 'Telefonun tanımadığı öğe sonucu sayısı; telefon bunu tekrar dene sayar (D06-B04).'),
      col('ekran_hatalari', 'jsonb', false, "'[]'::jsonb", "[{tur: HATA_SINIRI | GENEL, ekran: ^[a-z][a-z0-9_]{0,47}$, sayi: 1..1000000}], en çok 100 öğe; hata metni yok (teknik.html#telefon-arka-plan)."),
      col('retler', 'jsonb', false, "'[]'::jsonb", "[{http: 400..599, kod: BÜYÜK_HARF sunucu kodu ya da null, sayi: 1..1000000}], en çok 50 öğe; tek başına da reddedilen kaydın sorunu (plan.html#kararlar-yeniden-deneme)."),
      col('bilinmeyen_ad_sayisi', 'integer', false, '0', 'Pakette olup bu sunucunun tanımadığı sayaç adı sayısı; değerleri saklanmaz (eski ve yeni sürümler birlikte yaşar).'),
      col('ilk_alinma_ani', 'timestamptz', false, '', 'Bu (kurulum, gün) için ilk öğenin ulaşma anı (GelenOge.ulasmaAni).'),
      col('son_alinma_ani', 'timestamptz', false, '', 'Satırı son yazan öğenin ulaşma anı; yeni ret kodu denetimi son 15 dakikayı buradan seçer.'),
    ],
    indexes: [
      'telefon_sayaclari_id_pk: PRIMARY KEY (id)',
      'telefon_sayaclari_kurulum_id_gun_uq: UNIQUE (kurulum_id, gun); ON CONFLICT hedefi',
      'telefon_sayaclari_gun_idx: (gun); ölçüm görünümleri ve 13 aylık silme',
      'telefon_sayaclari_kisi_id_idx: (kisi_id); hesap silme dinleyicisi',
      'telefon_sayaclari_son_alinma_ani_idx: (son_alinma_ani); yeni ret kodu denetimi',
    ],
    constraints: [
      "telefon_sayaclari_rol_ck: rol IN ('OGRENCI','PERSONEL')",
      'telefon_sayaclari_platform_ck: platform IN (PLATFORMLAR)',
      'telefon_sayaclari_sayilar_ck: gonderilmemis_kayit, basarisiz_deneme, yerel_modul_cokmesi, ic_sayac_okuma_hatasi, bilinmeyen_sonuc ve bilinmeyen_ad_sayisi BETWEEN 0 AND 1000000',
      "telefon_sayaclari_listeler_ck: jsonb_typeof(ekran_hatalari) = 'array' AND jsonb_array_length(ekran_hatalari) <= 100 AND jsonb_typeof(retler) = 'array' AND jsonb_array_length(retler) <= 50",
      'telefon_sayaclari_surum_ck: char_length(uygulama_surumu) BETWEEN 1 AND 32 AND (runtime_surumu IS NULL OR char_length(runtime_surumu) BETWEEN 1 AND 32)',
      'telefon_sayaclari_sira_ck: sira >= 1',
      'telefon_sayaclari_alinma_ck: ilk_alinma_ani <= son_alinma_ani',
    ],
  },
  {
    name: 'hoca_ekran_sureleri',
    purpose:
      "Hocanın kafa sayısı ve onay ekranlarında geçirdiği sürenin oturum, gün, ekran türü ve kaynak (telefon kurulumu ya da panel tarayıcısı) başına birikmiş toplamı; 'ders başına en çok 2 dakika' hedefinin kaynağı (plan.html#hedefler). Değer aynı anahtarda hiç azalmaz, en büyüğü kalır: yeniden gönderim ve sıra bozulması sonucu değiştirmez. Ölçüm yalnız dersin sahibine ait satırları sayar. 13 ayda ve hesap silinince silinir.",
    columns: [
      col('id', 'uuid', false, 'uuidv7()', 'Birincil anahtar.'),
      col('kisi_id', 'uuid', false, '', 'Süreyi gönderen personel: panelde oturumun kişisi, telefonda paketin kişisi.'),
      col('oturum_id', 'uuid', false, '', 'Ekranın ait olduğu ders oturumu (oturumlar.id, D02). Yabancı anahtar yok; ölçüm görünümü eşleşmeyen ya da başkasının dersine ait satırı dışarıda bırakır.'),
      col('gun', 'date', false, '', 'İstemcinin İstanbul günü.'),
      col('ekran_turu', 'text', false, '', 'KAFA_SAYISI, DERS_YAPILDI_MI, KENDI_BEYANI_ONAYI, TEYIT_ONAYI, INCELEME, SORUN_BILDIRIMI (EKRAN_TURLERI, packages/contracts/src/isletim.ts).'),
      col('kaynak', 'text', false, '', 'TELEFON ya da PANEL.'),
      col('kaynak_kimligi', 'uuid', false, '', 'TELEFON: kurulum kimliği; PANEL: tarayıcının ilk açılışta ürettiği istemci kimliği. İki tarayıcı ya da iki telefon ayrı satır yazar, ölçüm toplar.'),
      col('saniye', 'integer', false, '', 'Ekranın önde ve son 60 saniyede dokunularak açık kaldığı süre; 1..86400.'),
      col('ilk_alinma_ani', 'timestamptz', false, '', 'Satırın ilk yazıldığı an (saat arayüzü ya da GelenOge.ulasmaAni).'),
      col('son_alinma_ani', 'timestamptz', false, '', 'Değerin son arttığı an.'),
    ],
    indexes: [
      'hoca_ekran_sureleri_id_pk: PRIMARY KEY (id)',
      'UNIQUE (kisi_id, oturum_id, gun, ekran_turu, kaynak, kaynak_kimligi); adı D12.kisitAdi verir (63 baytı aştığından özetli kısaltma); ON CONFLICT hedefi',
      'hoca_ekran_sureleri_oturum_id_idx: (oturum_id); hocanın işi görünümü',
      'hoca_ekran_sureleri_gun_idx: (gun); 13 aylık silme',
      'hoca_ekran_sureleri_kisi_id_idx: (kisi_id); hesap silme dinleyicisi',
    ],
    constraints: [
      "hoca_ekran_sureleri_ekran_turu_ck: ekran_turu IN (EKRAN_TURLERI)",
      "hoca_ekran_sureleri_kaynak_ck: kaynak IN ('TELEFON','PANEL')",
      'hoca_ekran_sureleri_saniye_ck: saniye BETWEEN 1 AND 86400',
      'hoca_ekran_sureleri_alinma_ck: ilk_alinma_ani <= son_alinma_ani',
    ],
  },
  {
    name: 'isletim_uyarilari',
    purpose:
      "İşletim uyarılarının tek defteri: tür ve anahtar başına en çok bir açık satır, tekrar görülme, bildirim ve kapanış anları. İşletim denetimi bildirimi buradan yapar, aynı uyarıyı hatırlatma süresi dolmadan yinelemez, düzelince tek 'düzeldi' iletisi gönderir; açık KRITIK uyarı kalp atışını sorun adresine çevirir. Kişisel veri taşımaz; kapanmış satırlar 13 ay sonra silinir.",
    columns: [
      col('id', 'uuid', false, 'uuidv7()', 'Birincil anahtar; e-postada uyarının kısa kimliği olarak ilk 8 karakteri yazılır.'),
      col('tur', 'text', false, '', '<modül>.<olay> (ör. isletim.disk_doluluk, dogrulama.iptal_listesi_eski); modül adı contracts.json listesinden.'),
      col('anahtar', 'text', false, "''", "Aynı türün ayrı örnekleri: kuyruk adı, servis adı, bağlama noktası ya da '<http>:<kod>'. Kişi kimliği ve kişisel veri değildir."),
      col('seviye', 'text', false, '', 'KRITIK ya da UYARI. isletim.* türlerinde UYARI_TURLERI kataloğundan, başka modülün türünde çağıranın verdiği değer (varsayılan UYARI).'),
      col('kapanma_kurali', 'text', false, '', 'KOSUL: D15 denetimi koşul düzelince kapatır. SESSIZLIK: 26 saat yeniden açılmazsa kapanır (olay türü uyarılar ve başka modüllerin açtıkları).'),
      col('durum', 'text', false, "'ACIK'", 'ACIK ya da KAPANDI.'),
      col('ilk_gorulme_ani', 'timestamptz', false, '', 'Uyarının açıldığı an (çağıranın saati: uyariAc ayrinti.an).'),
      col('son_gorulme_ani', 'timestamptz', false, '', 'Koşulun son görüldüğü an.'),
      col('tekrar_sayisi', 'integer', false, '1', 'Açık kaldığı sürece kaç kez görüldüğü.'),
      col('son_deger', 'text', true, '', "Son ölçülen değerin kısa metni (ör. 'yüzde 87', '3 iş'), en çok 120 karakter."),
      col('satirlar', 'text[]', false, "'{}'", 'E-postaya giren ayrıntı satırları: en çok 10, her biri en çok 200 karakter; 9 ile 11 haneli rakam dizisi yazılmadan önce [gizli] olur.'),
      col('son_bildirim_ani', 'timestamptz', true, '', 'Son başarılı e-posta bildiriminin anı; boşsa henüz bildirilmedi.'),
      col('bildirim_sayisi', 'integer', false, '0', 'Başarılı bildirim (ilk ileti ve hatırlatmalar) sayısı.'),
      col('bildirim_hatasi', 'boolean', false, 'false', 'Son bildirim denemesi gitmedi (SMTP düşük ya da kapasite); kalp atışı sorun adresine döner.'),
      col('kapanma_ani', 'timestamptz', true, '', 'KAPANDI anı.'),
      col('kapanis_bildirimi_ani', 'timestamptz', true, '', "'Düzeldi' iletisinin anı; hiç bildirilmemiş uyarının kapanışı bildirilmez."),
    ],
    indexes: [
      'isletim_uyarilari_id_pk: PRIMARY KEY (id)',
      "isletim_uyarilari_tur_anahtar_uq: UNIQUE (tur, anahtar) WHERE durum = 'ACIK'; uyariAc ON CONFLICT hedefi",
      'isletim_uyarilari_durum_seviye_idx: (durum, seviye); kalp atışı ve bildirim seçimi',
      "isletim_uyarilari_kapanma_ani_idx: (kapanma_ani) WHERE durum = 'KAPANDI'; 13 aylık silme ve düzeldi iletisi",
    ],
    constraints: [
      "isletim_uyarilari_tur_ck: tur ~ '^(kimlik|dersler|listeler|saat|yoklama|esitleme|dogrulama|devam|duzeltmeler|raporlar|projeksiyon|veritabani|api|is-kuyrugu|isletim)[.][a-z][a-z0-9_]{1,62}$' (D09 denetim türüyle aynı modül listesi)",
      "isletim_uyarilari_anahtar_ck: anahtar ~ '^[A-Za-z0-9_.:/-]{0,100}$'",
      "isletim_uyarilari_seviye_ck: seviye IN ('KRITIK','UYARI')",
      "isletim_uyarilari_kapanma_kurali_ck: kapanma_kurali IN ('KOSUL','SESSIZLIK')",
      "isletim_uyarilari_durum_ck: durum IN ('ACIK','KAPANDI') AND (durum = 'KAPANDI') = (kapanma_ani IS NOT NULL)",
      'isletim_uyarilari_kapanis_bildirimi_ck: kapanis_bildirimi_ani IS NULL OR kapanma_ani IS NOT NULL',
      'isletim_uyarilari_sayilar_ck: tekrar_sayisi >= 1 AND bildirim_sayisi >= 0',
      'isletim_uyarilari_metin_ck: (son_deger IS NULL OR char_length(son_deger) <= 120) AND cardinality(satirlar) <= 10',
      'isletim_uyarilari_anlar_ck: ilk_gorulme_ani <= son_gorulme_ani',
    ],
  },
];

const ic = "Girişsiz; yalnız iç ağdan: Compose sağlık denetimi kabın içinden 127.0.0.1'e, Caddy'nin etkin sağlık denetimi iç ağdan gelir. API portu yayımlanmaz; Caddy /health/* yolunu dışarıdan 404 ile keser (CI Caddy senaryosu sınar). API'de vekil başlığına bakan ikinci bir bekçi yoktur: Caddy'nin kendi sağlık isteklerini yanlışlıkla kesip iki kopyayı birden devreden çıkarabilirdi.";

const endpoints = [
  {
    method: 'GET',
    path: '/health/live',
    client: 'sunucu',
    auth: ic + ' Rota beyanı (packages/contracts/src/isletim.ts, rotaTanimla): kimlik [girissiz], hiz girissiz, baskiDisi true, saatBelgesi false, cevap 204 ve şema null.',
    request: { '(yok)': 'Gövde, sorgu ve özel başlık yok; gelen gövde yok sayılır.' },
    response: { '204': 'Gövdesiz: süreç canlı ve kapanışta değil. Caddy etkin sağlık denetimi ve Compose sağlık denetimi bu ucu kullanır.' },
    errors: [
      '503 ISLETIM_KAPANIYOR: kapanış başladı (kapanisiBaslat); Caddy kopyayı en geç 4 saniyede devreden çıkarır',
      '429 API_HIZ_SINIRI: girissiz IP sınıfı (pratikte oluşmaz)',
    ],
    idempotency: 'Salt okur; veritabanına, dosyaya ve dış hizmete dokunmaz; aşırı yük denetimi dışında (D13 rota düzeyi pressureHandler null döner).',
    rate_limit: "D13.hizSinifi('girissiz'): IP başına dakikada 3000. Sağlık denetimleri kopya başına dakikada en çok 36 istek üretir.",
  },
  {
    method: 'GET',
    path: '/health/ready',
    client: 'sunucu',
    auth: ic + ' Rota beyanı: kimlik [girissiz], hiz girissiz, baskiDisi false (D13 kuralı: aşırı yükte API_SUNUCU_YOGUN alır), cevap 204. Çağıranlar: yayın betiği (her kopyadan sonra), haftalık CI işi, geri yükleme ve terfi betiği (D12-B32).',
    request: { '(yok)': 'Gövde, sorgu ve özel başlık yok.' },
    response: { '204': 'Gövdesiz: kapanışta değil ve D12.semaDurumu() 2 saniye içinde hazir=true döndü (veritabanına ulaşılıyor, imajdaki son göçün özeti göç defterinde var, nesil tutarlı).' },
    errors: [
      '503 ISLETIM_KAPANIYOR: kapanış başladı',
      '503 ISLETIM_HAZIR_DEGIL_VERITABANI: semaDurumu neden ulasilamiyor ya da 2 saniyede cevap gelmedi',
      '503 ISLETIM_HAZIR_DEGIL_SEMA: semaDurumu neden geride ya da nesil_belirsiz',
      '503 API_SUNUCU_YOGUN: aşırı yük (D13 under-pressure)',
      '429 API_HIZ_SINIRI',
    ],
    idempotency: 'Salt okur: D12.semaDurumu tek kısa sorgu (göç defterinde özet ve nesil); iş, dosya ve uyarı yazmaz.',
    rate_limit: "D13.hizSinifi('girissiz').",
  },
  {
    method: 'GET',
    path: '/v1/durum',
    client: 'sunucu',
    auth: "Girişsiz ve herkese açık; Caddy üzerinden gelir, dış izleme hizmeti 5 dakikada bir çağırır (teknik.html#sunucu-ayarlar). Rota beyanı: kimlik [girissiz], hiz girissiz, baskiDisi true, saatBelgesi false, cevap 204. Modülsüz kök uç istisnasıdır (contracts.json, Uç yolu öneki).",
    request: { '(yok)': 'Gövde, sorgu ve özel başlık yok.' },
    response: { '204': 'Gövdesiz; /health/live ile aynı iş: veritabanına dokunmaz. Alan adı, sertifika, Caddy ve API süreci tek denetimde sınanır.' },
    errors: ['503 ISLETIM_KAPANIYOR: kapanan kopyaya denk geldi (art arda iki başarısızlık gerektiğinden yanlış alarm üretmez)', '429 API_HIZ_SINIRI: girissiz IP sınıfı'],
    idempotency: 'Salt okur, yan etkisiz; aşırı yük denetimi dışında.',
    rate_limit: "D13.hizSinifi('girissiz'): IP başına dakikada 3000.",
  },
  {
    method: 'POST',
    path: '/v1/isletim/ekran-sureleri',
    client: 'panel',
    auth: "Panel oturum çerezi (D01 oturum kancası, D13): kimlik [oturum], roller [personel]; çerezli yazma isteği olduğundan Origin panel adresine birebir eşit olmalı (D13 köken kancası). Telefon aynı bilgiyi telefon_sayaci öğesinin ekranSureleri alanında taşır, bu uca gelmez. Rota beyanı: hiz oturum, govdeSiniri 16384, baskiDisi false, saatBelgesi false, cevap 200 ekranSureleriCevabi.",
    request: {
      istemciKimligi: 'metin; D13 istemciKimligiSemasi: tarayıcının ilk açılışta ürettiği UUIDv7, yerel depoda kalır',
      gun: 'metin; YYYY-AA-GG İstanbul günü (D13 gunSemasi); sunucunun İstanbul gününden ileri olamaz, en çok 14 gün eski olabilir',
      sureler: "dizi, 1 ile 200 öğe: { oturumId: UUID (D13 kimlikSemasi('oturum')), ekranTuru: KAFA_SAYISI | DERS_YAPILDI_MI | KENDI_BEYANI_ONAYI | TEYIT_ONAYI | INCELEME | SORUN_BILDIRIMI (kapalı enum), saniye: tam sayı 1..86400 }; (oturumId, ekranTuru) çifti tekil; saniyelerin toplamı en çok 86400",
      '(fazla alan)': 'Zod strip ile atılır.',
    },
    response: { kaydedilen: 'tam sayı; eklenen ya da değeri artan satır sayısı (eşit ya da küçük değer satırı değiştirmez, sayılmaz)' },
    errors: [
      '400 API_ISTEK_GECERSIZ: şemaya uymuyor (D13 zarfı, alanlar yolu)',
      '400 ISLETIM_GUN_ARALIK_DISI: gun ileri tarihli ya da 14 günden eski',
      '400 ISLETIM_SURE_GECERSIZ: (oturumId, ekranTuru) çifti tekrar ediyor ya da saniyelerin toplamı 86400 üstü',
      '401 API_KIMLIK_GEREKLI',
      '403 API_ROL_YETKISIZ',
      '403 API_KOKEN_GECERSIZ',
      '413 API_GOVDE_COK_BUYUK: 16 KiB üstü',
      '415 API_ICERIK_TURU',
      '429 API_HIZ_SINIRI',
      '503 API_SUNUCU_YOGUN',
    ],
    idempotency:
      'Her değer o günün birikmiş toplamıdır: tek işlemde INSERT ... ON CONFLICT (kisi_id, oturum_id, gun, ekran_turu, kaynak, kaynak_kimligi) DO UPDATE SET saniye = EXCLUDED.saniye, son_alinma_ani = EXCLUDED.son_alinma_ani WHERE hoca_ekran_sureleri.saniye < EXCLUDED.saniye. Aynı istek iki kez gelirse ya da eski toplam yenisinden sonra ulaşırsa sonuç değişmez; kaynak PANEL, kaynak_kimligi istemciKimligi.',
    rate_limit: "D13.hizSinifi('oturum'): oturum başına dakikada 120. Sözleşme kuralı: panel en çok 5 dakikada bir, sayfa gizlenirken (visibilitychange) bir kez daha gönderir.",
  },
];

module.exports = { summary, tables, endpoints };

// r17 review fixes for D10. Input: d10fix/orig/D10.r16.json (the r16 spec, md5 48892baf...).
// Output: spec/D10.json. Deterministic and re-runnable; every edit is structural (by name) or a whole-string set,
// and every helper throws when its target is missing, so a silent no-op cannot happen.
// Run: node r17.js && node ../d10spec/build-frag.js && node ../spec-validate.js D10 && node ../d10spec/gate.js
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'orig', 'D10.r16.json');
const OUT = path.join(__dirname, '..', 'spec', 'D10.json');
const S = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const byKey = (arr, key, val) => { const x = arr.find(e => e[key] === val); if (!x) throw new Error(`missing ${key}=${val}`); return x; };
const byName = (arr, n) => byKey(arr, 'name', n);
const col = (name, type, nul, note) => ({ name, type, null: nul, default: '', note });
const insertAfter = (arr, afterName, ...items) => { const i = arr.findIndex(c => c.name === afterName); if (i < 0) throw new Error('insertAfter missing ' + afterName); arr.splice(i + 1, 0, ...items); };
const removeBy = (arr, key, val) => { const i = arr.findIndex(e => e[key] === val); if (i < 0) throw new Error(`remove missing ${key}=${val}`); arr.splice(i, 1); };
const REASONS = "ARRAY['ONAY_BEKLEYEN_KENDI_BEYANI','KARARI_ACIK_KAYIT','KARAR_BEKLIYOR_OGRENCI','KAFA_SAYISI_ISARETI','GONDERME_SURESI_SURUYOR','CEVAPSIZ_OTURUM']::text[]";

// ---------------------------------------------------------------- summary
S.summary = `Raporlar modülü hocanın panelindeki ders raporunu, öğrenci raporunu ve şube başına AKSİS özetini JSON olarak verir; Excel ve baskıyı panel aynı cevaptan ve ortak paketteki aynı biçim fonksiyonlarıyla üretir, sunucu dosya üretmez ve AKSİS'e hiçbir şey göndermez (plan.html#tek-bakista, teknik.html#panel-excel). Değer hesaplamaz: tür başına saatleri, onda bir birimli yüzdeyi, tür kararlarını, Sonuç'u, KARAR BEKLİYOR'u, telafi eksiğini ve cevapsız oturum sayısını D08.dersSonuclari'nın canlı hesabından, oturum hücrelerini D08'in saklanan son durum tablosundan tek REPEATABLE READ, READ ONLY işlemde okur; kendisi yalnız sırayı, geçici nedenlerini, çıktı engelini ve özetin kanonik içeriğiyle SHA-256 özetini kurar. Yazdığı tek şey AKSİS özetinin değişmez anlığıdır: hoca dönem sonu penceresinde özeti ekranda gördüğünde ya da Excel veya baskı aldığında (gördüğü özet sunucunun hesabıyla birebir aynıysa ve şubenin son anlığından farklıysa) ve D02'nin kilit işleminin kuyruğa koyduğu işte şube başına bir kez; D09'un sonradan değişenler listesi ve Haksız devamsız bu tabana göre hesaplanır. Dönem sonu raporu birim ve dönem için Haksız devamsız (hedef 0) ile Görevli ve Belgeli dönüşleri isimsiz sayar; özetin elle hesapla uyuşmazlığı 0 hedefi (plan.html#hedefler) altın tablo testiyle ve D08 kuyruğu boşken ders raporu toplamlarının özetle tutmasıyla kanıtlanır.`;

// ---------------------------------------------------------------- tables
const T0 = byName(S.tables, 'aksis_ozet_anliklari');
T0.purpose = `AKSİS özetinin değişmez anlığının başlığı. Kaynak HOCA_CIKTISI: hoca dönem sonu penceresinde (şubenin son oturumu bittikten sonra, kilit anından önce) özeti ekranda gördüğünde, Excel ya da baskı aldığında veya "AKSİS'e girdim" onayında (D10-A07), gördüğü özet sunucunun hesabıyla birebir aynıysa ve şubenin son HOCA_CIKTISI anlığından farklıysa yazılır. Kaynak GUN_SONU: kilit uygulandıktan sonra D02'nin kilit işleminin kuyruğa koyduğu aksis_gun_sonu_anligi işi şube başına bir kez yazar. Kanonik içerik (biçim 1, D10-B29) yalnız saklanan sütunlardan kurulur; taban kuralı yalnız saklanan değerlerle çözülür (aksisAnligiGetir). Yazıldıktan sonra değişmez, tablo yorumu @yalniz-ekleme.`;
{
  const C = n => byName(T0.columns, n);
  C('cikti_kimligi').note = 'Panelin istekte gönderdiği UUIDv7 tekrar anahtarı (istemciKimligiSemasi, D13-B12); yalnız HOCA_CIKTISI satırında dolu, tekil.';
  C('cikti_turu').note = `EXCEL, BASKI, EKRAN (panel özeti dönem sonu penceresinde gösterdi) ya da ONAY (hocanın "AKSİS'e girdim" onayı, D10-A07); yalnız HOCA_CIKTISI.`;
  C('kilit_ani').note = 'Birim ve dönemin kilit anı (D02), anlık anındaki değer; pencere CHECK kısıtının ve taban kuralının dayanağı. Takvimsiz birimde kilit anı yoktur, o şubede anlık yazılmaz.';
  C('ozet_bicim_surumu').note = 'Kanonik içerik biçiminin sürümü (D10-B29); ilk sürüm 1. Anlık her zaman kendi sürümünün kurucusuyla yeniden kurulur.';
  C('gecici').note = 'Alındığı anda özet geçici miydi; gecici_nedenleri boş değilse true. Kilitten sonra yalnız kilitten sonra yaşayan nedenler sayılır, GUN_SONU anlığı da true olabilir (D10-C04).';
  C('sayim_tabani').note = 'YAPILAN ya da PLANLANAN; D08.dersSonuclari sayimTabani (plan.html#acik-sayim-tabani).';
  C('teori_p').note = 'D08 teoriP, anlık anındaki değer (0 ile 100).';
  C('uygulama_p').note = 'D08 uygulamaP (0 ile 100).';
  C('teori_programda').note = `Programda teori saati var mı; D02 program verisinden okunur (dersSonuclari'ndan türetilmez, boş şubede de doğru). Yoksa satırlardaki teori sütunları boştur.`;
  C('uygulama_programda').note = 'Programda uygulama saati var mı (D02 program verisi).';
  C('teori_telafi_edilmeyen_saat').note = 'D08.dersSonuclari telafiEksigi.TEORI aynen (tek tanım D08-B15, D10-B19); D10 hesaplamaz.';
  C('uygulama_telafi_edilmeyen_saat').note = 'D08 telafiEksigi.UYGULAMA aynen.';
  C('cevapsiz_oturum_sayisi').note = 'D08.dersSonuclari cevapsizOturumSayisi aynen ("Ders yapıldı mı?" cevapsız oturum); HOCA_CIKTISI anlığında her zaman 0.';
  C('ogrenci_sayisi').note = 'Yazılan satır sayısı; tamlık denetimi bununla yapılır.';
  insertAfter(T0.columns, 'sube_id',
    col('ders_kodu', 'text', false, 'Dersin kodu, anlık anındaki haliyle (D02-B11: kod kilitten önce değişebilir); kâğıttaki üst bilginin kanıtı, kanonik içerikte.'),
    col('ders_adi', 'text', false, 'Dersin adı, anlık anındaki haliyle; kanonik içerikte.'),
    col('sube_etiketi', 'text', false, 'Şubenin etiketi, anlık anındaki haliyle; kanonik içerikte.'),
    col('takip_baslangici', 'date', true, 'Dersin takip başlangıcı (D02 dersGetir), anlık anında; yoksa boş. Kanonik içerikte.'));
  insertAfter(T0.columns, 'kilit_ani',
    col('son_oturum_bitis_ani', 'timestamptz', true, 'Şubenin iptal edilmemiş son oturumunun bitiş anı, anlık anındaki değer (dönem sonu penceresinin başı). HOCA_CIKTISI satırında dolu; GUN_SONU satırında oturumsuz şubede boş. Taban kuralı bu saklanan değerle çözülür, sonradan eklenen telafi eski anlığı tabandan düşürmez.'),
    col('son_yapilan_ders_gunu', 'date', true, 'Şubenin yapılan son oturumunun ders günü (baskı üst bilgisi "dönem, son yapılan ders"); yoksa boş. Kanonik içerikte.'));
  insertAfter(T0.columns, 'gecici_nedenleri',
    col('gecici_neden_sayilari', 'integer[]', false, 'gecici_nedenleri ile aynı sırada her nedenin sayısı (özet cevabındaki geciciNedenleri[].sayi); kanonik içerikte.'));
  T0.indexes = [
    'PRIMARY KEY (id): aksis_ozet_anliklari_id_pk',
    "UNIQUE (sube_id) WHERE kaynak = 'GUN_SONU': aksis_ozet_anliklari_sube_id_uq (şube başına tek gün sonu anlığı; iş INSERT ... ON CONFLICT (sube_id) WHERE kaynak = 'GUN_SONU' DO NOTHING ile buna dayanır)",
    'UNIQUE (cikti_kimligi): aksis_ozet_anliklari_cikti_kimligi_uq (boş değerler çakışmaz; çıktı isteğinin tekrar anahtarı)',
    '(sube_id, kaynak, alinma_ani DESC): aksis_ozet_anliklari_sube_id_kaynak_alinma_ani_idx (son hoca çıktısı, aynı özet denetimi ve taban araması)',
    '(donem_id, birim_id): aksis_ozet_anliklari_donem_id_birim_id_idx (dönem sonu raporu, gece taraması ve saklama işleyicisi)',
  ];
  T0.constraints = [
    'FOREIGN KEY (donem_id) REFERENCES donemler(id): aksis_ozet_anliklari_donem_id_fk',
    'FOREIGN KEY (birim_id) REFERENCES birimler(id): aksis_ozet_anliklari_birim_id_fk',
    'FOREIGN KEY (ders_id) REFERENCES dersler(id): aksis_ozet_anliklari_ders_id_fk',
    'FOREIGN KEY (sube_id) REFERENCES subeler(id): aksis_ozet_anliklari_sube_id_fk',
    'FOREIGN KEY (alan_kisi_id) REFERENCES kisiler(id): aksis_ozet_anliklari_alan_kisi_id_fk (birim, ders ve kişi satırları silinmediğinden bu üç yabancı anahtar dizinsiz kalır; @dizinsiz-kabul yorumuyla D12-B15 listesine bilerek girer)',
    "CHECK (kaynak IN ('GUN_SONU','HOCA_CIKTISI')): aksis_ozet_anliklari_kaynak_ck",
    "CHECK (cikti_turu IS NULL OR cikti_turu IN ('EXCEL','BASKI','EKRAN','ONAY')): aksis_ozet_anliklari_cikti_turu_ck",
    "CHECK ((kaynak = 'HOCA_CIKTISI' AND alan_kisi_id IS NOT NULL AND cikti_kimligi IS NOT NULL AND cikti_turu IS NOT NULL) OR (kaynak = 'GUN_SONU' AND alan_kisi_id IS NULL AND cikti_kimligi IS NULL AND cikti_turu IS NULL)): aksis_ozet_anliklari_kaynak_alan_kisi_id_ck (iki dal ayrı yazılır: alan_kisi_id ya da cikti_kimligi dolu GUN_SONU satırı geçemez, çıktı tekil dizinini tüketemez)",
    "CHECK ((kaynak = 'HOCA_CIKTISI' AND son_oturum_bitis_ani IS NOT NULL AND alinma_ani >= son_oturum_bitis_ani AND alinma_ani < kilit_ani AND cevapsiz_oturum_sayisi = 0) OR (kaynak = 'GUN_SONU' AND alinma_ani >= kilit_ani)): aksis_ozet_anliklari_kaynak_alinma_ani_ck (gün sonu anlığı geçici olabilir: kilitten sonra yaşayan nedenler, D10-C04)",
    'CHECK (octet_length(ozet_ozeti) = 32): aksis_ozet_anliklari_ozet_ozeti_ck',
    `CHECK (gecici_nedenleri <@ ${REASONS} AND gecici = (cardinality(gecici_nedenleri) > 0) AND cardinality(gecici_neden_sayilari) = cardinality(gecici_nedenleri) AND 1 <= ALL (gecici_neden_sayilari)): aksis_ozet_anliklari_gecici_nedenleri_ck (liste packages/core/src/raporlar kod sabitinden üretilir)`,
    'CHECK (char_length(ders_kodu) >= 1 AND char_length(ders_adi) >= 1 AND char_length(sube_etiketi) >= 1): aksis_ozet_anliklari_ders_kodu_ck (üst sınırlar D02 sütunlarının)',
    "CHECK (sayim_tabani IN ('YAPILAN','PLANLANAN')): aksis_ozet_anliklari_sayim_tabani_ck",
    'CHECK (teori_p BETWEEN 0 AND 100 AND uygulama_p BETWEEN 0 AND 100): aksis_ozet_anliklari_teori_p_uygulama_p_ck',
    'CHECK (teori_telafi_edilmeyen_saat >= 0 AND uygulama_telafi_edilmeyen_saat >= 0 AND cevapsiz_oturum_sayisi >= 0 AND ogrenci_sayisi >= 0 AND ozet_bicim_surumu >= 1): aksis_ozet_anliklari_sayilar_ck',
    "Yetki ve yorum: tablo yorumu @yalniz-ekleme (D12); D10 göçü yoklama_api ve yoklama_isci'den UPDATE ve DELETE yetkisini geri alır (TRUNCATE ve DDL zaten yok, D12-B03); uygulama yalnız ekler ve okur; silme yalnız D12'nin saklama_suresi_isi içinde SET LOCAL ROLE yoklama_saklama ile, D10'un 'raporlar.aksis_ozet_anliklari' işleyicisiyle (D10-B30)",
  ];
}

const T1 = byName(S.tables, 'aksis_ozet_anligi_satirlari');
T1.purpose = `Anlıktaki her öğrenci satırı: liste satırı, o anki numara, ad, liste sırası ve kaynak, tür başına D08 değerleri, Sonuç ve KARAR BEKLİYOR nedeni. Başlıkla aynı işlemde yazılır ve değişmez (tablo yorumu @yalniz-ekleme); kanonik içerik bu satırlarla başlıktan yeniden kurulup ozet_ozeti ile karşılaştırılır. Numara ve ad kopyası taşıdığından saklama süresi liste satırlarının anonimleştirme süresinden uzun olamaz (D10-B30).`;
{
  const C = n => byName(T1.columns, n);
  C('ogrenci_no').note = 'Liste satırındaki numara, metin (9 ya da 10 rakam; plan.html#hoca-liste-yukleme). Anlık yalnız dönem sonu penceresinde ve kilitten sonraki 14 gün içinde alındığından numara her zaman doludur.';
  C('liste_sirasi').note = 'Liste satırının sırası, anlık anında (plan.html#devam-donem-sonu); satırlar (liste_sirasi, liste_satiri_id) sırasıyla.';
  insertAfter(T1.columns, 'liste_sirasi',
    col('kaynak', 'text', false, 'Liste satırının kaynağı DOSYA, ELLE ya da SISTEM (D03), anlık anında; kanonik içerikte.'));
  C('muaf').note = 'Devamdan muaf mı (D08 satırı, anlık anında).';
  C('teori_yapilan_saat').note = 'Teoride yapılan saat T (D08 tabanSaat); programda teori yoksa boş.';
  C('teori_devamsiz_saat').note = 'Net devamsızlık (D08 devamsizSaat): Görevli ve Belgeli saatleri düşülmüş (plan.html#devam-uyari-seviyeleri).';
  C('teori_mazeretli_saat').note = 'Görevli ve Belgeli düzeltme saatleri (D08 mazeretliSaat).';
  const yt = C('teori_yuzde_onda'); yt.name = 'teori_yuzde_binde'; yt.note = 'Onda bir birimli yüzde (D08 yuzdeOnda; ad D13-B15 Binde kuralıyla): floor((T - devamsız) x 1000 / T); T = 0 ise boş.';
  C('teori_karar').note = 'D08 tür kararı (turSonucu): DEVAMLI ya da DEVAMSIZ; muaf öğrencide de D08 değeri yazılır (D10-B11).';
  C('uygulama_yapilan_saat').note = 'Uygulamada yapılan saat T (D08 tabanSaat); programda uygulama yoksa boş.';
  C('uygulama_devamsiz_saat').note = 'Net devamsızlık (D08 devamsizSaat).';
  C('uygulama_mazeretli_saat').note = 'Görevli ve Belgeli saatleri (D08 mazeretliSaat).';
  const yu = C('uygulama_yuzde_onda'); yu.name = 'uygulama_yuzde_binde'; yu.note = 'Onda bir birimli yüzde (D08 yuzdeOnda); T = 0 ise boş.';
  C('uygulama_karar').note = 'D08 tür kararı: DEVAMLI ya da DEVAMSIZ.';
  C('sonuc').note = 'D08 sonuc: DEVAMLI, DEVAMSIZ ya da DEVAMLI_MUAF; KARAR BEKLİYOR ayrı sütundadır.';
  C('karar_bekliyor_nedeni').note = 'D08 kararBekliyor eşlemesi: acikIsaret true ise ACIK_ISARET, değilse baglanti true ise BAGLANTI_YOK, ikisi de false ise boş (D10-B06).';
  T1.constraints = [
    'FOREIGN KEY (aksis_ozet_anligi_id) REFERENCES aksis_ozet_anliklari(id) ON DELETE CASCADE: aksis_ozet_anligi_satirlari_aksis_ozet_anligi_id_fk',
    "FOREIGN KEY (liste_satiri_id) REFERENCES liste_satirlari(id): aksis_ozet_anligi_satirlari_liste_satiri_id_fk (saklamada bu sınıf D03'ün liste satırı sınıfından önce işlenir, D10-B30)",
    "CHECK (ogrenci_no ~ '^[0-9]{9,10}$'): aksis_ozet_anligi_satirlari_ogrenci_no_ck",
    'CHECK (liste_sirasi >= 1): aksis_ozet_anligi_satirlari_liste_sirasi_ck',
    "CHECK (kaynak IN ('DOSYA','ELLE','SISTEM')): aksis_ozet_anligi_satirlari_kaynak_ck (liste D03 sözleşme sabitinden)",
    "CHECK (sonuc IN ('DEVAMLI','DEVAMSIZ','DEVAMLI_MUAF') AND muaf = (sonuc = 'DEVAMLI_MUAF')): aksis_ozet_anligi_satirlari_sonuc_ck (liste D08'in sözleşme sabitinden)",
    "CHECK (karar_bekliyor_nedeni IS NULL OR (karar_bekliyor_nedeni IN ('ACIK_ISARET','BAGLANTI_YOK') AND NOT muaf)): aksis_ozet_anligi_satirlari_karar_bekliyor_nedeni_ck",
    "CHECK (tür grubu: teori_* beş sütunu birlikte boş ya da teori_yapilan_saat >= 0, teori_devamsiz_saat >= 0, teori_mazeretli_saat >= 0, teori_devamsiz_saat + teori_mazeretli_saat <= teori_yapilan_saat, (teori_yuzde_binde IS NULL) = (teori_yapilan_saat = 0), teori_yuzde_binde BETWEEN 0 AND 1000, teori_karar IN ('DEVAMLI','DEVAMSIZ')): aksis_ozet_anligi_satirlari_teori_ck",
    'CHECK (aynı kural uygulama_* sütunlarına): aksis_ozet_anligi_satirlari_uygulama_ck',
    "Yetki ve yorum: tablo yorumu @yalniz-ekleme; yoklama_api ve yoklama_isci yalnız INSERT ve SELECT; satırlar yalnız başlıkla birlikte (ON DELETE CASCADE) saklama işinde, yoklama_saklama rolüyle silinir",
  ];
}

// ---------------------------------------------------------------- endpoints
const AGIR = `D13 agir hız sınıfı (rota beyanı hiz: 'agir', oturum başına dakikada 20; D13-B09, D13-B26)`;
const OKUMA = `okuma işlemi islem(fn, { saltOkunur: true, zamanAsimiMs: 15000 }) ve REPEATABLE READ (D12'den istenen yalitim seçeneğiyle; gelene kadar fn'nin ilk deyimi SET TRANSACTION ISOLATION LEVEL REPEATABLE READ)`;
const ORTAK = 'D13 ortak kodları: API_ISTEK_GECERSIZ 400, API_KIMLIK_GEREKLI 401, API_ROL_YETKISIZ 403, API_HIZ_SINIRI 429, API_SUNUCU_YOGUN 503, API_SUNUCU_HATASI 500';
const SAHIP = `Kaynak yetkisi D02.dersYetkisi(tx, kisi, dersId) === 'sahip' ile; 'yonetici' sonucu, null, ders yoksa ya da deneme dersiyse var olmayan kimlikle aynı 404 (hoca ve yönetici rollü kişi kendi kapsamındaki başka hocanın dersini de göremez, D10-A08). Arşivlenmiş ders dahil.`;
const KIRPMA = `Kırpma aralığı [max(takvim.dersBaslangic, ders.takipBaslangici), min(takvim.sonGun, bugün)] (D02.takvimGetir ve dersGetir; takvim yoksa alt uç takipBaslangici, o da yoksa şubelerin ilk oturum günü, üst uç bugün). İstenen aralık bununla kesiştirilir ve kesişen kısım cevapta döner; kesişme boşsa 400 RAPORLAR_TARIH_ARALIGI_GECERSIZ (neden DONEM_DISI). Üst uç dersBitis değil sonGun'dür: son güne kadar girilen telafi ve ders yapılan sınav haftası oturumları AKSİS özetiyle aynı kapsamda kalır (D10-B14).`;
const TUR_HUCRESI = '{ durum: HucreKodu, varSaat: number, yokSaat: number, mazeretliSaat: number, acikSaat: number } (oturum_son_durumlari satırının dört saati aynen, toplamları oturumun o türdeki saati; D08 satırı yoksa dördü de 0; kod önceliği Durumlar ve kurallar, hücre kodları)';
const HUCRE_HESAP = `anlık | null: okunan oturum_son_durumlari satırlarının en büyük hesaplandigi_an değeri, satır yoksa null. Hücreler D08'in saklanan son durumlarıdır; son D08 işinden sonra gelen kayıt ve düzeltme iş çalışınca görünür (OTURUM_KAPANDI işi 15, YAPILDI işi 5 dakika sonra başlar, D08 devamHesaplaIsiKoy). Toplamların özetle tutması D08 kuyruğu boşken iddia edilir (D10-B24, D10-A10).`;

S.endpoints = [
  {
    method: 'GET', path: '/v1/raporlar/dersler/{dersId}', client: 'panel',
    auth: `Panel oturumu, rota beyanı roller ['hoca']. ${SAHIP} Yönetici erişimi D10-A08 kararına bağlı, o zamana kadar yok.`,
    request: {
      'dersId (yol)': 'UUIDv7 (z.uuidv7())',
      'sube (sorgu, isteğe bağlı)': 'UUIDv7 (z.uuidv7()); verilirse yalnız o şube, dersin şubesi değilse 404 RAPORLAR_SUBE_BULUNAMADI; verilmezse dersin bütün şubeleri ayrı bölümlerde',
      'baslangic (sorgu, isteğe bağlı)': 'YYYY-AA-GG İstanbul günü (gunSemasi, z.iso.date()); dahil; verilmezse kırpma aralığının alt ucu',
      'bitis (sorgu, isteğe bağlı)': 'YYYY-AA-GG İstanbul günü (gunSemasi); dahil; verilmezse kırpma aralığının üst ucu',
      '(kural) kırpma': KIRPMA,
    },
    response: {
      ders: '{ dersId, kod, ad, donemId, birimId, arsivlendi: boolean, takipBaslangici: tarih | null }',
      aralik: '{ baslangic: tarih, bitis: tarih } (kırpılmış)',
      hazirlanmaAni: 'anlık, UTC ISO (anSemasi, D13-B15)',
      hucreHesapAni: HUCRE_HESAP,
      gecici: 'boolean',
      geciciNedenleri: 'Array<{ kod: GeciciNedeni, sayi: number }> (sabit sırayla; sayi etkilenen hücre, yani oturum ve öğrenci çifti, kafa sayısı ve gönderme süresinde oturum; KARAR_BEKLIYOR_OGRENCI bu raporda yok)',
      kilit: '{ kilitAni: anlık | null, sonGun: tarih | null, uygulandi: boolean, kilittenSonraSayilmayanKayit: number } (D02.kilitDurumu; kaynak takvim_yok iken kilitAni ve sonGun null, uygulandi false)',
      subeler: 'Array<{ subeId, etiket, oturumlar: Oturum[], ogrenciler: DersRaporuSatiri[] }>',
      '(tip) Oturum': `{ oturumId, dersGunu: tarih, baslangicSaati: 'SS:DD' İstanbul, teoriSaat, uygulamaSaat, tur: NORMAL | TELAFI, yapildi: EVET | HAYIR | CEVAPSIZ, gondermeSuresiSonu: anlık | null (D06.gondermeSuresiSonu({ bitisAni }, { devamsizlikSonGunu: birimDonemi.sonGun }); takvimsiz birimde null, D06 çağrılmaz), kafaSayisiIsareti: boolean (D07 oturum_isaretleri: tur = 'KAFA_SAYISI_ASIMI' AND gecerli AND NOT derste AND incelendi_ani IS NULL) } (yalnız iptal edilmemiş ve bitişi geçmiş oturumlar, ders günü ve başlangıca göre sıralı)`,
      '(tip) DersRaporuSatiri': '{ listeSatiriId, ogrenciNo: metin | null, adSoyad: metin | null, saklamaSuresiDoldu: boolean (liste satırı saklama süresiyle anonimleştiyse true, numara ve ad null), sira, kaynak: DOSYA | ELLE | SISTEM, muaf: boolean, eklenmeAni: anlık, pasifAni: anlık | null, oncekiSubeler: Array<{ subeId, etiket }> (aynı derste aynı numarayla başka şubede de satırı olan öğrencide o şubeler; hücreler yalnız bu şubenin oturumlarıdır, AKSİS özeti bütün şubeleri sayar), hucreler: Hucre[] (oturumlar ile aynı sırada) } (etkin satırlar liste sırasıyla, listeden çıkarılanlar sonda; D10-A06)',
      '(tip) Hucre': '{ teori: TurHucresi | null, uygulama: TurHucresi | null } (oturumun o türde saati yoksa null)',
      '(tip) TurHucresi': TUR_HUCRESI,
    },
    errors: ['RAPORLAR_DERS_BULUNAMADI', 'RAPORLAR_SUBE_BULUNAMADI', 'RAPORLAR_TARIH_ARALIGI_GECERSIZ', 'API_SONUC_COK_BUYUK (422, D13-B13: 2000 öğrenci satırı ya da 2000 oturum aşılınca uygulamaHatasi ile)', 'API_SORGU_ZAMAN_ASIMI (503, D13 kök eşlemesi: 57014)', ORTAK],
    idempotency: 'Yan etkisiz GET; aynı veri ve aynı saat değeri aynı cevabı verir.',
    rate_limit: `${AGIR}; ${OKUMA}`,
  },
  {
    method: 'GET', path: '/v1/raporlar/ogrenciler/{ogrenciId}', client: 'panel',
    auth: `Rota beyanı roller ['hoca']. Verilen liste satırının dersi için D02.dersYetkisi === 'sahip' değilse, satır yoksa, saklama süresiyle anonimleştiyse ya da deneme dersindeyse 404 RAPORLAR_OGRENCI_BULUNAMADI. Rapor yalnız bu hocanın sahibi olduğu, aynı dönemdeki dersleri kapsar (plan.html#baslangic yetki senaryosu).`,
    request: {
      'ogrenciId (yol)': 'UUIDv7 (z.uuidv7()): öğrencinin bu hocanın listelerinden birindeki liste satırı kimliği (D10-A11); sunucu satırdan numarayı çözer ve hocanın aynı dönemdeki bütün derslerinde aynı numaralı satırları toplar; numara adres satırına girmez',
      'baslangic (sorgu, isteğe bağlı)': 'YYYY-AA-GG İstanbul günü (gunSemasi); dahil',
      'bitis (sorgu, isteğe bağlı)': 'YYYY-AA-GG İstanbul günü (gunSemasi); dahil; her dersin kendi kırpma aralığıyla (ders raporundaki kural) kesiştirilir',
    },
    response: {
      ogrenci: '{ ogrenciNo, adSoyad } (verilen liste satırından)',
      donemId: 'uuid',
      aralik: '{ baslangic: tarih, bitis: tarih } (kırpılmış)',
      hazirlanmaAni: 'anlık',
      hucreHesapAni: 'anlık | null (ders raporundaki tanım)',
      gecici: 'boolean',
      geciciNedenleri: 'Array<{ kod: GeciciNedeni, sayi: number }> (sayi etkilenen oturum)',
      dersler: 'Array<{ dersId, kod, ad, subeId, subeEtiketi, listeSatiriId, muaf, pasifAni: anlık | null, oturumlar: OgrenciOturumu[] }>',
      '(tip) OgrenciOturumu': '{ oturumId, dersGunu, baslangicSaati, teoriSaat, uygulamaSaat, yapildi, teori: TurHucresi | null, uygulama: TurHucresi | null, kayit: { karar: KararKodu (D05 ve D07), onayBekliyor: boolean } | null } (TurHucresi ders raporundakiyle aynı, acikSaat dahil; kayit D08 son durumunun dayandığı kayıttır; etiket ve gerekçe raporda yok)',
    },
    errors: ['RAPORLAR_OGRENCI_BULUNAMADI', 'RAPORLAR_TARIH_ARALIGI_GECERSIZ', 'API_SONUC_COK_BUYUK (422, D13-B13)', 'API_SORGU_ZAMAN_ASIMI (503, D13 kök eşlemesi)', ORTAK],
    idempotency: 'Yan etkisiz GET.',
    rate_limit: `${AGIR}; ${OKUMA}`,
  },
  {
    method: 'GET', path: '/v1/raporlar/subeler/{subeId}/aksis-ozeti', client: 'panel',
    auth: `Rota beyanı roller ['hoca']; şubenin dersi için ${SAHIP}`,
    request: { 'subeId (yol)': 'UUIDv7 (z.uuidv7())' },
    response: {
      ders: '{ dersId, kod, ad, donemId, birimId, arsivlendi, takipBaslangici: tarih | null }',
      sube: '{ subeId, etiket }',
      sayimTabani: 'YAPILAN | PLANLANAN (D08 sayimTabani)',
      oranlar: '{ teoriP: number, uygulamaP: number } (D08 teoriP ve uygulamaP)',
      turler: `{ teori: boolean, uygulama: boolean } (programda o türün saati var mı; D02 program verisinden okunur, dersSonuclari'ndan türetilmez, boş şubede de doğru)`,
      sonYapilanDersGunu: 'tarih | null (baskı üst bilgisi: "dönem, son yapılan ders")',
      sonOturumBitisAni: 'anlık | null (dönem sonu penceresinin başı; D08 sonOturumBitti ile tutarlılığı testte)',
      sonGun: 'tarih | null (birimin devamsızlık işleme son günü, D02.kilitDurumu; takvim_yok iken null)',
      kilitAni: 'anlık | null (takvim_yok iken null)',
      kilitUygulandi: 'boolean',
      hazirlanmaAni: 'anlık',
      hesapAni: `anlık (D08 dersSonuclari hesapAni; canlı hesap olduğundan aynı okuma işlemindedir)`,
      gecici: 'boolean (geciciNedenleri boş değilse true; kilitten sonra yalnız kilitten sonra yaşayan nedenler, D10-C04)',
      geciciNedenleri: 'Array<{ kod: GeciciNedeni, sayi: number }> (sabit sırayla; sayi etkilenen öğrenci, CEVAPSIZ_OTURUM, KAFA_SAYISI_ISARETI ve GONDERME_SURESI_SURUYOR için oturum; GONDERME_SURESI_SURUYOR yalnız cikti.durum DONEM_ICI iken sayılır, D10-A03)',
      gondermeSuresiSurenOturum: `number (gönderme süresi bitmemiş oturum sayısı, durumdan bağımsız; DONEM_SONU'nda panel "kayıtlar son güne kadar gelebilir" bilgi satırını bununla yazar; kanonik içerikte yok)`,
      dersIsaretleri: `{ telafiEdilmeyenSaat: { teori: number, uygulama: number } (D08 telafiEksigi.TEORI ve .UYGULAMA aynen, D10-B19), cevapsizOturumlar: Array<{ oturumId, dersGunu, baslangicSaati }> (D02.oturumlariGetir(tx, { subeId, yapildi: 'cevapsiz', bitmis: true, durum: 'planlandi' }); uzunluğu D08 cevapsizOturumSayisi ile aynı, test denetler) }`,
      cikti: '{ durum: DONEM_ICI | DONEM_SONU | KILITLI, engel: ONAYSIZ_DERS_VAR (DONEM_SONU ya da KILITLI ve cevapsız oturum var) | null, anlikAlinir: boolean (DONEM_SONU, kilit anı biliniyor ve engel yok) } (takvim_yok iken KILITLI olmaz ve anlikAlinir false)',
      taban: "{ anlikId, kaynak: GUN_SONU | HOCA_CIKTISI, ciktiTuru: EXCEL | BASKI | EKRAN | ONAY | null, alinmaAni } | null (yalnız KILITLI durumda; aksisAnligiGetir(tx, subeId, 'TABAN'))",
      kilittenSonraSayilmayanKayit: 'number (kilit anından sonra ulaşan ve sayılmayan kayıt; ayrıntı D09 sonradan değişenler)',
      satirlar: 'AksisSatiri[] (yalnız etkin liste satırları, (sira, id) liste sırasıyla; D08 dersSonuclari aynı sırayı verir)',
      '(tip) AksisSatiri': '{ listeSatiriId (D08 satirId), ogrenciNo: metin | null, adSoyad: metin | null, saklamaSuresiDoldu: boolean, sira, kaynak: DOSYA | ELLE | SISTEM, muaf, teori: TurOzeti | null, uygulama: TurOzeti | null, sonuc: DEVAMLI | DEVAMSIZ | DEVAMLI_MUAF, kararBekliyor: { neden: ACIK_ISARET | BAGLANTI_YOK } | null } (tür, D08 turler dizisinin TEORI ve UYGULAMA ögesinden; dizide yoksa null; eşleme D10-B06)',
      '(tip) TurOzeti': '{ yapilanSaat (D08 tabanSaat), devamsizSaat (net, D08 devamsizSaat), mazeretliSaat, katildigiSaat, yuzdeBinde: number | null (D08 yuzdeOnda; bindeSemasi, T = 0 ise null), karar: DEVAMLI | DEVAMSIZ (D08 turSonucu, muaf öğrencide de) }',
      ozetOzeti: '64 küçük hex: biçim 1 kanonik içeriğinin SHA-256 değeri (D10-B29); içerik yalnız anlıkta saklanan alanlardan oluşur, hazırlanma anı, hesapAni, cikti, taban ve kilit bilgisi içerikte yoktur',
    },
    errors: ['RAPORLAR_SUBE_BULUNAMADI', 'API_SONUC_COK_BUYUK (422, D13-B13)', 'API_SORGU_ZAMAN_ASIMI (503, D13 kök eşlemesi)', ORTAK],
    idempotency: 'Yan etkisiz GET; aynı veriyle ozetOzeti aynıdır (saat dilimi ve yerel ayardan bağımsız).',
    rate_limit: `${AGIR}; ${OKUMA}`,
  },
  {
    method: 'POST', path: '/v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar', client: 'panel',
    auth: `Rota beyanı roller ['hoca']; şubenin dersi için ${SAHIP} Çerezli istekte Origin denetimi kökte (D13, API_KOKEN_GECERSIZ). Panel AKSİS özetinin Excel ya da baskısını yalnız bu uçtan 200 ya da 201 alınca üretir; DONEM_SONU'nda özeti gösterince (cikti.anlikAlinir true ise) tur EKRAN ile kendiliğinden çağırır.`,
    request: {
      'subeId (yol)': 'UUIDv7 (z.uuidv7())',
      ciktiKimligi: 'UUIDv7 (istemciKimligiSemasi); panel düğmeye basınca ya da özeti gösterince üretir; tekrar anahtarı (D13-B12)',
      ozetOzeti: '64 küçük hex (^[0-9a-f]{64}$); GET cevabındaki değer aynen',
      tur: `EXCEL | BASKI | EKRAN | ONAY (kapalı z.enum). EKRAN: panel özeti DONEM_SONU'nda gösterdi (hocanın asıl yolu ekrandan okumak, plan.html#tek-bakista; Ctrl+P ile yazdırma da böyle yakalanır). ONAY: hocanın "AKSİS'e girdim" onayı, panelde gösterilmesi D10-A07 kararına bağlı.`,
    },
    response: {
      anlik: "{ anlikId, kaynak: 'HOCA_CIKTISI', ciktiTuru, alinmaAni } | null (201: yeni anlık yazıldı; 200: aynı kimlikle zaten yazılmış, şubenin son HOCA_CIKTISI anlığı aynı özeti taşıyor ve o anlık döner, ya da dönem sonu penceresi dışında anlık gerekmez ve null)",
      cikti: '{ durum: DONEM_ICI | DONEM_SONU | KILITLI, engel: null, anlikAlinir: boolean }',
    },
    errors: ['RAPORLAR_SUBE_BULUNAMADI', 'RAPORLAR_KIMLIK_CAKISMASI', 'RAPORLAR_ONAYSIZ_DERS_VAR', 'RAPORLAR_OZET_DEGISTI', 'API_SORGU_ZAMAN_ASIMI (503, D13 kök eşlemesi)', 'API_KOKEN_GECERSIZ (403, D13)', ORTAK],
    idempotency: `Tek işlem: islem(fn, { yalitim: 'repeatable_read', yenidenDene: true }) (yalitim D12'den istenir, D10-A13; gelene kadar fn'nin ilk deyimi SET TRANSACTION ISOLATION LEVEL REPEATABLE READ). Sıra: (1) cikti_kimligi ile satır varsa aynı şube, aynı ozet_ozeti ve aynı cikti_turu ise o anlık 200 ile döner (özet o arada değişmiş olsa da); biri farklıysa 409 RAPORLAR_KIMLIK_CAKISMASI (tur farkı da çakışmadır, D13-B12). (2) Çıktı durumu; DONEM_SONU değilse ya da kilit anı yoksa 200 ve anlik null (KILITLI'da cevapsız oturum engeli yine 409). (3) Cevapsız oturum engeli. (4) Özet yeniden kurulur; ozetOzeti eşit değilse 409 RAPORLAR_OZET_DEGISTI. (5) Şubenin son HOCA_CIKTISI anlığının ozet_ozeti aynıysa o anlık 200 ile döner, satır yazılmaz (kimliği saklanmadığından bu isteğin tekrarı da 5. adıma gelir; veri o arada değiştiyse 409 RAPORLAR_OZET_DEGISTI alır ve panel özeti yeniler). (6) Başlık ve satırlar INSERT ... ON CONFLICT (cikti_kimligi) DO NOTHING ile yazılır, 201. Aynı kimlikle eşzamanlı iki istekte (çift tıklama, ağ yeniden denemesi) ikincinin eklemesi, anlık görüntüsünde görünmeyen işlenmiş satıra çarptığından REPEATABLE READ'te sessiz kalmaz, SQLSTATE 40001 verir; D12 fn'yi bir kez baştan çalıştırır ve (1) adımı var olan anlığı 200 ile döndürür. Farklı kimlikli eşzamanlı iki istek aynı özet için iki satır yazabilir; taban en son alinma_ani'yi seçtiğinden sonuç değişmez.`,
    rate_limit: `${AGIR}; yazma işlemi API rolünün 5 sn statement_timeout'u içinde (D12 yazmada üstüne çıkmaz); en büyük şubede süre yük testinde 5 sn bütçesiyle ölçülür; tekrar eden kimlikte özet yeniden hesaplanmaz.`,
  },
  {
    method: 'GET', path: '/v1/raporlar/donem-sonu', client: 'panel',
    auth: `Rota beyanı roller ['yonetici']; D01.yetkiDenetle(istek.kimlik, { roller: ['yonetici'] }, { birimId }) izin vermezse 404 RAPORLAR_BIRIM_BULUNAMADI. Cevapta öğrenci adı ve numarası yoktur. Hocanın erişimi ve içerik D10-A09 kararına bağlı. Yol D13-B14 gereği /v1/raporlar/yonetim/donem-sonu olmalı; contracts.json owns_endpoints değişince aynı adımda taşınır (D10-A13).`,
    request: {
      'donem (sorgu)': 'UUIDv7 (z.uuidv7()), zorunlu',
      'birim (sorgu)': 'UUIDv7 (z.uuidv7()), zorunlu',
    },
    response: {
      donemId: 'uuid',
      birimId: 'uuid',
      kilitAni: 'anlık',
      hazirlanmaAni: 'anlık',
      enEskiSonucHesabi: `anlık | null (okunan devam_sonuclari satırlarının en küçük hesaplandigi_an değeri; şimdiki Sonuç D08'in saklanan değeridir)`,
      kilitSonrasiHesapTamam: `boolean (enEskiSonucHesabi >= kilitUygulandiAni: D02 kilit işleminde her dersin hesabını kuyruğa koyduğundan false iken kilit sonrası hesap bitmemiştir ve panel "hesap güncelleniyor" yazar)`,
      toplam: '{ sube, anlikEksikSube, tabandaDevamsiz, haksizDevamsiz, mazeretliDonus, mazeretliDonusOraniBinde: number | null (bindeSemasi; floor(mazeretliDonus x 1000 / tabandaDevamsiz), tabandaDevamsiz 0 ise null), kararBekliyorKalan, digerDegisim }',
      dersler: 'Array<{ dersId, kod, ad, subeler: Array<{ subeId, etiket, taban: { kaynak, ciktiTuru, alinmaAni } | null, tabandaDevamsiz, haksizDevamsiz, mazeretliDonus, kararBekliyorKalan, digerDegisim }> }> (deneme dersi hariç)',
    },
    errors: ['RAPORLAR_BIRIM_BULUNAMADI', 'RAPORLAR_DONEM_KILITLI_DEGIL', 'API_SORGU_ZAMAN_ASIMI (503, D13 kök eşlemesi)', ORTAK],
    idempotency: `Yan etkisiz GET; tabanlar değişmediğinden aynı veriyle aynı sayılar. Şube başına dış yüz çağrısı yapılmaz: tek küme sorgusu her şubenin tabanını (taban kuralı, DISTINCT ON), şimdiki Sonucu (D08 devam_sonuclari, okuma istisnası), tabandan sonraki düzeltmeleri ve kayıtları toplar; yalnız Sonucu dönen öğrenciler degisimSinifi ile sınıflanır. Canlı dersSonuclari ile hesap 1000 şubede 15 sn'ye sığmadığından seçilmedi; gecikme enEskiSonucHesabi ile görünür kalır.`,
    rate_limit: `${AGIR}; ${OKUMA}`,
  },
];

// ---------------------------------------------------------------- job
S.jobs = [{
  name: 'aksis_gun_sonu_anligi',
  schedule: `İki yoldan tetiklenir. (1) Asıl yol: D10 modül kaydında D02.kilitAdimiKaydet({ ad: 'raporlar.gun_sonu_anligi', sira: D07 adımından büyük, calistir }) ile kilit adımı kaydeder; adım D02'nin donem_kilidi işleminin içinde D14.isGonder(tx, aksisGunSonuKuyrugu, { birimId, donemId }, { tekillikAnahtari: '<birimId>:<donemId>' }) çağırır. İş yalnız kilit işlenirse kuyruğa girer: bir kilit adımı hata verip işlem geri alınırsa iş de yoktur. (2) Güvenlik ağı: isTanimla zamanlaması { cron: '40 0 * * *', sonra: ['donem_kilidi'] }; saat dilimi D14 gereği Europe/Istanbul, kaçan çalışma missed: once. 00:40, D02'nin 00:20 donem_kilidi işinden 20 dakika sonra ve 03:00 ile 05:00 arasının dışındadır; D14 çizelgesindeki 00:05 donem_kilidi ve 00:25 aksis_gun_sonu_anligi satırları D02 ile eşitlenmeli (D10-A13). Kuyruk tanımı apps/server/src/modules/raporlar/kuyruk.ts'te: KuyrukTanimi { ad: 'aksis_gun_sonu_anligi', veri: z.object({ birimId: z.uuid(), donemId: z.uuid() }).partial().strict() (şema packages/contracts/src/raporlar.ts'ten), politika: 'stately' }: çalışan iş varken bir bekleyen açılabildiğinden tekrar zinciri kopmaz. isTanimla({ kuyruk, isleyici, sureAsimiSaniye: 1800, kalpAtisiSaniye: 60, zamanlama }); deneme D14 varsayılanı (3 kez, üstel).`,
  idempotency: `Birim ve dönem verili iş yalnız o birim ve dönemin GUN_SONU anlığı olmayan şubelerini işler; her şube kendi işleminde INSERT ... ON CONFLICT (sube_id) WHERE kaynak = 'GUN_SONU' DO NOTHING ile yazar, satırlar başlık eklendiyse aynı işlemde yazılır, yarım anlık kalmaz. Aynı veriyle ikinci çalışma hiçbir şey yazmaz. İş verisi yalnız iç kimlik taşır.`,
  does: `Birim ve dönem verili iş (asıl yol): D02.kilitDurumu ile kilidin uygulandığını doğrular (uygulanmamışsa hiçbir şey yazmaz ve hata vermez), birimin o dönemdeki deneme olmayan derslerinin (kilitle arşivlenenler dahil) GUN_SONU anlığı olmayan şubelerini bulur. Her şube için islem(fn, { yalitim: 'repeatable_read' }) açar, GET ucundaki özet kurucusunun aynısıyla özeti ve ozetOzeti'ni kurar ve başlığı ile satırları yazar; boş şube 0 satırlı anlık alır. D08.dersSonuclari canlı hesap olduğundan kilit işleminin D07 kapanışını içerir ve bekleyen devam_hesapla işini beklemez. Bir şubenin hatası ötekileri durdurmaz; iş sonunda hatalı şube varsa iş hata atar, D14 politikasıyla yeniden dener (yalnız eksik şubeler işlenir), sonunda ölü mektuba düşer ve D15'in isletim_denetimi (D14.isSagligi) uyarı açar. Verisiz iş (güvenlik ağı): D02.kilitliBirimDonemleri(tx, şimdi) sonucunu yakın kilitlere süzer. kilitUygulandiAni dolu ve şimdiden en çok 14 gün eski birim ve dönemde GUN_SONU anlığı eksik şube varsa o birim ve dönem için yukarıdaki işi isGonder ile koyar (tekillikAnahtari '<birimId>:<donemId>'). kilitUygulandiAni boş ve kilitAni en çok 24 saat eski birim ve dönemi bekleyen sayar ve kendini bir kez 15 dakika sonrasına koyar: isGonder(tx, aksisGunSonuKuyrugu, {}, { tekillikAnahtari: 'tarama', baslamaAni: şimdi + 15 dakika }); 24 saatten eski uygulanmamış kilit D02'nin kendi ölü mektubunda görünür, D10 onu beklemez. 14 günden eski kilitlere hiç bakılmaz: saklama işleyicisinin sildiği eski anlıklar yeniden alınmaz, anonimleştirilmiş liste satırı kopyalanmaz. Log yalnız sayılar ve iç kimliklerle: işlenen birim ve dönem, alınan, zaten var olan ve hatalı şube sayısı, bekleyen kilit sayısı ve süre.`,
}];

// ---------------------------------------------------------------- state machines
S.state_machines = [
  {
    name: 'AKSİS özeti çıktı durumu (şube başına, saklanmaz; her istekte saatten ve D02 verisinden türetilir)',
    states: ['DONEM_ICI', 'DONEM_SONU', 'KILITLI'],
    transitions: [
      { from: 'DONEM_ICI', to: 'DONEM_SONU', by: 'saat', when: 'Şubenin iptal edilmemiş son oturumunun bitiş anı geçince. Bu durumda panel özeti gösterince EKRAN, Excel ya da baskıda EXCEL ya da BASKI anlığı yazılır (son HOCA_CIKTISI anlığıyla aynı özetse yazılmaz); cevapsız oturum çıktıyı engeller. Kilit anı bilinmiyorsa (takvim_yok) anlık yazılmaz.' },
      { from: 'DONEM_SONU', to: 'DONEM_ICI', by: 'D02 (telafi ya da yeni oturum)', when: 'Son oturumdan sonra yeni oturum eklenirse, o oturum bitene kadar; o arada alınan çıktı anlık yazmaz, önceki anlıklar kalır ve kendi son_oturum_bitis_ani değeriyle taban adayı olmayı sürdürür.' },
      { from: 'DONEM_ICI', to: 'KILITLI', by: 'saat', when: 'Birimin kilit anı geçince (son oturum bitmemiş olsa da). Takvimsiz birimde bu geçiş yoktur.' },
      { from: 'DONEM_SONU', to: 'KILITLI', by: 'saat', when: 'Birimin kilit anı geçince. Çıktı alınabilir ama anlık yazmaz; cevapsız oturum engeli sürer (D10-A05).' },
    ],
  },
  {
    name: 'Gün sonu anlığı (şube başına)',
    states: ['YOK', 'KUYRUKTA', 'ALINDI', 'SILINDI'],
    transitions: [
      { from: 'YOK', to: 'KUYRUKTA', by: 'D02 donem_kilidi (D10 kilit adımı)', when: 'Kilit işlemi D10 adımını çağırır, birim ve dönem işi aynı işlemde kuyruğa girer. Kilit işlemi geri alınırsa iş de yoktur ve durum YOK kalır.' },
      { from: 'YOK', to: 'KUYRUKTA', by: 'aksis_gun_sonu_anligi (güvenlik ağı)', when: 'Kilidi son 14 günde uygulanmış ve anlığı eksik şube bulununca.' },
      { from: 'KUYRUKTA', to: 'KUYRUKTA', by: 'D14 yeniden deneme', when: 'Şube işlemi hata verirse iş yeniden dener, yalnız eksik şubeler işlenir; üç denemeden sonra ölü mektup ve D15 uyarısı.' },
      { from: 'KUYRUKTA', to: 'ALINDI', by: 'aksis_gun_sonu_anligi', when: 'Kilit uygulanmışsa başlık ve satırlar şube başına tek işlemde yazılır; D08 hesabı canlı olduğundan beklenecek iş yoktur. ALINDI anlığı değişmez.' },
      { from: 'ALINDI', to: 'SILINDI', by: 'D12 saklama_suresi_isi (D10 işleyicisi)', when: 'Birim ve dönemin kilit anı saklama sınırından eskiyse başlık silinir, satırlar CASCADE ile gider. Güvenlik ağı 14 günden eski kilide bakmadığından anlık yeniden alınmaz.' },
    ],
  },
  {
    name: 'Rapor ve özet geçiciliği (saklanmaz; anlıkta o anki değer dondurulur)',
    states: ['GECICI', 'KESIN'],
    transitions: [
      { from: 'KESIN', to: 'GECICI', by: 'veri ya da saat', when: 'Geçici nedenlerinden biri doğunca (ör. yeni oturum bitti ve gönderme süresi başladı, onay bekleyen Kendi beyanı geldi).' },
      { from: 'GECICI', to: 'KESIN', by: 'veri ya da saat', when: 'Nedenlerin hepsi kalkınca.' },
      { from: 'GECICI', to: 'KESIN', by: 'D02 donem_kilidi', when: 'Kilit uygulanınca kilitte ölen nedenler (ONAY_BEKLEYEN_KENDI_BEYANI, KARARI_ACIK_KAYIT, KAFA_SAYISI_ISARETI, GONDERME_SURESI_SURUYOR) sayılmaz; başka neden yoksa kesinleşir.' },
      { from: 'GECICI', to: 'GECICI', by: 'D02 donem_kilidi', when: 'KARAR_BEKLIYOR_OGRENCI ya da CEVAPSIZ_OTURUM kilitten sonra da yaşar (plan.html#devam-donem-sonu: KARAR BEKLİYOR varken çıktı geçici kalır); gün sonu anlığı da bu durumda gecici yazılır (D10-C04, D10-A03).' },
    ],
  },
];

// ---------------------------------------------------------------- invariants
S.invariants = [
  'Modül yalnız aksis_ozet_anliklari ve aksis_ozet_anligi_satirlari tablolarına yazar; başka her erişim SELECT\'tir ve rapor uçlarında REPEATABLE READ, READ ONLY işleminde koşar, yazma denemesi PostgreSQL\'de 25006 ile düşer (teknik.html#sunucu-mimari istisnası).',
  'Bir anlık yazıldıktan sonra değişmez: iki tablo @yalniz-ekleme yorumludur, uygulama rollerinin UPDATE ve DELETE yetkisi yoktur (TRUNCATE ve DDL zaten yok); satırlar yalnız saklama süresi dolunca D12\'nin saklama_suresi_isi içinde, yoklama_saklama rolüyle, başlıkla birlikte silinir.',
  'Her şube için en çok bir GUN_SONU anlığı vardır ve yalnız kilit uygulandıktan sonra alınır; HOCA_CIKTISI anlığı yalnız şubenin son oturumu bittikten sonra ve kilit anından önce, cevapsız oturum yokken alınır; ardışık iki HOCA_CIKTISI anlığı aynı özeti ancak farklı kimlikli eşzamanlı iki istekte taşıyabilir.',
  'Bir anlığın satır sayısı, alındığı anda şubenin etkin liste satırı sayısına eşittir; ozet_ozeti, saklanan başlık ve satırlardan anlığın kendi ozet_bicim_surumu kurucusuyla yeniden kurulunca aynı çıkar (D10-B29).',
  'HOCA_CIKTISI anlığının içeriği, hocanın gördüğü GET cevabının kanonik içeriğiyle birebir aynıdır: ozetOzeti eşit değilse anlık yazılmaz.',
  'D08 kuyruğu boşken (bekleyen devam_hesapla işi yokken) bir öğrencinin (ders, numara) bir türdeki ders raporu hücrelerinin bütün şubelerdeki tam dönem toplamı, etkin olduğu şubenin AKSİS özetine eşittir: varSaat + yokSaat + mazeretliSaat + acikSaat toplamı yapilanSaat, yokSaat + acikSaat toplamı devamsizSaat, mazeretliSaat toplamı mazeretliSaat (uyuşmazlık 0, plan.html#hedefler). İş beklerken hücreler son D08 işi kadar geride kalabilir; cevap bunu hucreHesapAni ile gösterir (D10-B24, D10-A10).',
  'Rapor değer üretmez: tür değerleri, yüzde, tür kararları, Sonuç, KARAR BEKLİYOR, telafi eksiği ve cevapsız oturum sayısı D08.dersSonuclari\'dan, hücre son durumları ve saatleri D08\'in son durum tablosundan aynen gelir; D10 yalnız sıralar, işaretler, eşler ve birleştirir. Tek gösterim kuralı: muaf öğrencinin Sonuç\'u harfler.ts\'te "DEVAMLI (muaf)" diye yazılır.',
  'Bir istek ya da bir şubenin iş adımı tek "şimdi" kullanır: hazırlanma anı, aralık kırpma, gönderme süresi, çıktı durumu ve kilit karşılaştırması aynı saat değerinden; SQL now() ve Date.now() yoktur, İstanbul günü SQL\'de AT TIME ZONE \'Europe/Istanbul\' ile verilen andan bulunur.',
  'Kilit uygulanınca yalnız kilitten sonra yaşayan geçici nedenleri (KARAR_BEKLIYOR_OGRENCI, CEVAPSIZ_OTURUM) sayılır; kilit anından sonra ulaşan kayıt hiçbir hücreyi ve toplamı değiştirmez, yalnız sayısı gösterilir.',
  'Karar DEVAMSIZ olan türde yüzde metni hiçbir zaman p\'ye ulaşmış görünmez: yuzdeBinde < 10 x p ancak ve ancak DEVAMSIZ; tür kararı her satırda D08 değeri olduğundan muaf satırda da geçerlidir (T 1 ile 1000, p 1 ile 100 arasındaki 50.150.000 durum betikle denendi, istisna yok).',
  'Hoca yalnız sahibi olduğu (D02.dersYetkisi === \'sahip\') derslerin, arşivli dahil, raporunu, özetini ve çıktısını görür; \'yonetici\' sonucu dahil başka her durumda kaynak yok gibi 404 döner, cevap gövdesi istekKimligi dışında var olmayan kimlikle aynıdır.',
  'Öğrenci numarası ve isim adres satırına, loga ve iş verisine girmez; loglarda rota kalıbı, iç kimlik, satır ve oturum sayısı ile süre yazar.',
  'Excel ve baskı aynı JSON cevaptan ve packages/core/src/raporlar fonksiyonlarıyla üretilir; hiçbir hücre formül değildir, tarih, yüzde, numara ve isim metindir.',
  'AKSİS özeti satırları (sira, id) liste sırasındadır, listeden çıkarılan özette yer almaz; ders raporunda listeden çıkarılan sonda pasif anıyla görünür; saklama süresiyle anonimleşen satır numara ve ad olmadan saklamaSuresiDoldu işaretiyle döner.',
  'Deneme dersi hiçbir rapora, anlığa ve dönem sonu raporuna girmez (D02-B30).',
  'Gün sonu anlığı yalnız kilidi son 14 günde uygulanmış birim ve dönemde alınır; saklama işleyicisinin sildiği anlık yeniden alınmaz ve anlık saklama süresi liste satırlarının anonimleştirme süresinden uzun değildir (D10-B30).',
];

// ---------------------------------------------------------------- exports
{
  const e = byName(S.exports, 'aksisAnligiGetir');
  e.purpose = `[yaprak] modules/raporlar/yaprak.ts içinde; yalnız D10'un iki tablosunu çağıranın işleminde okur. İçe aktardığı tek modül dosyası ./tablolar.ts'tir (o da yabancı anahtar için D01, D02 ve D03 tablo dosyalarını içe aktarır); servis ya da dış yüz içe aktarmaz, böylece D09'dan gelen çağrı D10 üzerinden D08'e döngü kurmaz. GUN_SONU şubenin gün sonu anlığını, SON_HOCA_CIKTISI alinma_ani en büyük HOCA_CIKTISI anlığını, TABAN taban kuralının seçtiğini verir; yoksa null. Taban kuralı yalnız saklanan değerlerle çözülür: alinma_ani >= son_oturum_bitis_ani ve alinma_ani < kilit_ani olan (CHECK her HOCA_CIKTISI için bunu garanti eder) en son HOCA_CIKTISI (tur EXCEL, BASKI, EKRAN ya da ONAY), yoksa GUN_SONU (D10-A07). D09 sonradan değişenler listesinde kullanır.`;
  const t = byName(S.exports, 'AksisAnligi (tip)');
  t.signature = "type AksisAnligi = { anlikId: string; kaynak: 'GUN_SONU' | 'HOCA_CIKTISI'; ciktiTuru: 'EXCEL' | 'BASKI' | 'EKRAN' | 'ONAY' | null; donemId: string; birimId: string; dersId: string; subeId: string; alinmaAni: string; kilitAni: string; sonOturumBitisAni: string | null; gecici: boolean; geciciNedenleri: GeciciNedeni[]; sayimTabani: 'YAPILAN' | 'PLANLANAN'; teoriP: number; uygulamaP: number; satirlar: Array<{ listeSatiriId: string; ogrenciNo: string; muaf: boolean; teori: AnlikTuru | null; uygulama: AnlikTuru | null; sonuc: 'DEVAMLI' | 'DEVAMSIZ' | 'DEVAMLI_MUAF'; kararBekliyorNedeni: 'ACIK_ISARET' | 'BAGLANTI_YOK' | null }> }; type AnlikTuru = { yapilanSaat: number; devamsizSaat: number; mazeretliSaat: number; yuzdeBinde: number | null; karar: 'DEVAMLI' | 'DEVAMSIZ' }";
}

// ---------------------------------------------------------------- files
{
  const f = S.files;
  for (const gone of ['packages/core/src/raporlar/telafi.ts', 'packages/core/src/raporlar/telafi.test.ts']) if (!f.includes(gone)) throw new Error('file missing ' + gone);
  S.files = f.filter(x => x !== 'packages/core/src/raporlar/telafi.ts' && x !== 'packages/core/src/raporlar/telafi.test.ts');
  const add = (after, ...items) => { const i = S.files.indexOf(after); if (i < 0) throw new Error('file missing ' + after); S.files.splice(i + 1, 0, ...items); };
  add('apps/server/src/modules/raporlar/saklama.ts', 'apps/server/src/modules/raporlar/kuyruk.ts', 'apps/server/src/modules/raporlar/kilit-adimi.ts');
  add('apps/server/test/features/raporlar/gun-sonu-anligi.feature', 'apps/server/test/features/raporlar/anlik-saklama.feature');
}

// ---------------------------------------------------------------- tests
{
  const T = S.tests;
  const set = (name, fields) => Object.assign(byName(T, name), fields);
  removeBy(T, 'name', 'Hesap sürerken dönem sonu anlığı alınmaz');
  removeBy(T, 'name', 'Gün sonu anlığı hesap bitmeden alınmaz');
  set('Tarih aralığı iki ucu dahil, gün olarak ve dönem sınırına kırpılır', {
    asserts: 'bitis günündeki oturum dahil, baslangictan önceki değil; bitis < baslangic 400 RAPORLAR_TARIH_ARALIGI_GECERSIZ (neden TERS); kırpma aralığıyla hiç kesişmeyen istek 400 (neden DONEM_DISI), kısmen kesişen istek 200 ve kırpılmış aralik; parametresiz istek [max(dersBaslangic, takipBaslangici), min(sonGun, bugün)]; dersBitis ile sonGun arasındaki telafi oturumu (sonGun\'den bir gün önce) parametresiz raporda sütun olarak görünür (mutasyon: üst uç dersBitis yapılınca senaryo kırmızı); takvimsiz derste alt uç takipBaslangici. TZ=UTC ve TZ=Europe/Istanbul ile aynı cevap; İstanbul 00:30 (UTC önceki gün 21:30) anında "bugün" İstanbul günüdür.',
  });
  set('Hücre kodları oturum ve kayıt durumunu yansıtır', {
    asserts: 'yapılmadı denen oturum YAPILMADI, cevapsız oturum CEVAP_BEKLIYOR, eklenmeden önceki oturum KAPSAM_DISI, Beklemede ya da İncelemede kayıt KARAR_ACIK, karışık hücre (2 saat Elle eklendi, 1 saat İncelemede) KARAR_ACIK ile varSaat 2 ve acikSaat 1, muaf öğrenci MUAF, 3 saatlik blokta 2 saat Görevli GOREVLI ile mazeretliSaat 2 ve yokSaat 1; olumlu kontrol: sayılan kayıt VAR. Her hücrenin dört saati oturum_son_durumlari satırıyla aynı ve toplamları oturum saati; yapılmadı oturumda dördü 0. V, Y, G, B ve E harfleri D09.SON_DURUMLAR\'dan içe aktarılan değerle karşılaştırılır.',
  });
  set('AKSİS özeti elle hesaplanan altın tabloyla birebir', {
    asserts: 'T = 0, programda olmayan tür, boş şube (turler D02 programından), muaf (tür kararı D08 değeri, Sonuç DEVAMLI_MUAF), Görevli ve Belgeli, kısmi saat, Md.9/4 geç kayıt, şube değiştiren öğrenci, birlikte işlenen oturum, KARAR BEKLİYOR (acikIsaret ve baglanti ikisi de true iken ACIK_ISARET), elle eklenen ve SISTEM kaynaklı öğrenciyi kapsayan 14 öğrencilik kurulumda her alan, sıra ve ozetOzeti elle yazılmış tabloyla aynı (uyuşmazlık 0 hedefi, plan.html#hedefler).',
  });
  set('Ders raporu toplamları AKSİS özetiyle tutar', {
    asserts: 'fast-check kurucusu (tohum yazılı) 50 ders üretir; şube değişimi, birlikte işlenen oturum, Md.9/4 geç kayıt ve ekle-bırak dahil. D08 kuyruğu boşaltıldıktan sonra her (ders, numara) ve tür için bütün şubelerdeki hücre toplamları etkin şubenin özetindeki yapilanSaat, devamsizSaat ve mazeretliSaat ile aynı. İkinci senaryo kayıt ve kafa sayısı girildikten hemen sonra, iş çalışmadan: özet yeni kaydı sayar, ders raporunun hucreHesapAni kaydın ulaşma anından küçüktür (gecikme görünür); iş çalışınca toplamlar tutar. D08 canlı oturumSonDurumlari verirse (D10-A10) ikinci senaryo eşitlik iddiasına döner.',
  });
  set('KARAR BEKLİYOR öğrenci hesaplanan Sonuç ile döner', {
    asserts: 'sonuc DEVAMSIZ ve kararBekliyor.neden ACIK_ISARET birlikte döner; başlıkta KARAR_BEKLIYOR_OGRENCI nedeni 1; bağlantısı olmayan öğrencide neden BAGLANTI_YOK; D08 iki bayrağı birden verirse ACIK_ISARET.',
  });
  set('Dönem sonu penceresinde cevapsız oturum çıktıyı engeller', {
    asserts: 'Son oturum bitince cevapsız oturum varken GET cikti.engel ONAYSIZ_DERS_VAR ve POST 409 RAPORLAR_ONAYSIZ_DERS_VAR (ayrıntıda oturum kimlikleri); cevapsizOturumlar uzunluğu D08 cevapsizOturumSayisi ile aynı; D02 yapıldı cevabından sonra POST geçer. Son oturum bitmeden cevapsız oturum çıktıyı engellemez, yalnız CEVAPSIZ_OTURUM nedeni olur.',
  });
  set('Çıktı anlığı yalnız dönem sonu penceresinde yazılır', {
    asserts: 'DONEM_ICI POST 200 anlik null ve tabloda satır yok; DONEM_SONU tur EKRAN POST 201 HOCA_CIKTISI, satır sayısı etkin liste satırı sayısı, ozet_ozeti istekteki değer, son_oturum_bitis_ani dolu; aynı özetle yeni kimlikli EKRAN ve ardından EXCEL 200 ve aynı anlikId, satır sayısı artmaz; özet değişince yeni EKRAN 201; KILITLI POST 200 anlik null. Takvimsiz birimde kilitAni ve sonGun null, cikti.anlikAlinir false, POST 200 anlik null ve D06.gondermeSuresiSonu çağrılmaz (casus).',
  });
  set('Aynı çıktı kimliği yeniden gelince aynı anlık döner', {
    asserts: 'Aynı istek ikinci kez 200 ve aynı anlikId, satır sayısı artmaz; özet o arada değişmiş olsa da tekrar 409 almaz; aynı kimlik başka şube, başka özet ya da başka tur ile 409 RAPORLAR_KIMLIK_CAKISMASI. Aynı kimlikle eşzamanlı iki POST (iki bağlantı; ilk işlem ekledikten sonra ikinci başlar ve eklemede bekler): biri 201, öbürü 200, aynı anlikId, tek başlık satırı; log 40001 sonrası bir yeniden çalıştırma gösterir. Mutasyon: yenidenDene kapatılınca ikinci istek 503 API_SUNUCU_YOGUN alır ve senaryo kırmızı.',
  });
  set('Gün sonu anlığı kilitten sonra şube başına bir kez alınır', {
    asserts: 'D02 donem_kilidi işlemi D10 adımıyla iş koyar; iş her şubeye bir GUN_SONU yazar (deneme dersi hariç, kilitle arşivlenen ders dahil, boş şube 0 satır); iş ikinci kez çalışınca anlık sayısı aynı. Kilit adımlarından biri hata verip kilit işlemi geri alınınca kuyrukta iş yok, güvenlik ağı (kilitUygulandiAni boş) o birim için hiçbir anlık yazmaz ve kendini 15 dakika sonrasına koyar. Mutasyon: kısmi tekil dizin kaldırılınca senaryo kırmızı; kilitUygulandiAni süzgeci kaldırılınca hata senaryosu kırmızı.',
  });
  set('Taban kuralı dış yüzden doğru anlığı verir', {
    asserts: 'aksisAnligiGetir TABAN: pencere içindeki en son HOCA_CIKTISI (EKRAN dahil), yoksa GUN_SONU, ikisi de yoksa null; anlıktan sonra eklenen telafi eski anlığı tabandan düşürmez (saklanan son_oturum_bitis_ani); SON_HOCA_CIKTISI alinma_ani en büyük olanı verir; çağıranın işlemindeki yazılmamış ekleme görülür.',
  });
  set('Kilitten sonra özet kesin, gelen kayıt sayılmaz', {
    name: 'Kilitten sonra yalnız yaşayan nedenler özeti geçici tutar',
    asserts: 'Kilitte donan İncelemede kayıt, onaysız Kendi beyanı ve incelenmemiş kafa sayısı işareti kilitten sonra gecici yapmaz (kilitten önce yaparlardı: olumlu kontrol); KARAR BEKLİYOR öğrenci varken gecici true ve GUN_SONU anlığı gecici true ile yazılır; kilit anından sonra ulaşan kayıt hiçbir hücreyi ve toplamı değiştirmez, kilittenSonraSayilmayanKayit 1, taban gösterilir.',
  });
  set('Dönem sonu raporu Haksız devamsızı ve mazeretli dönüşü ayırır', {
    asserts: 'Tabanda DEVAMSIZ: Elle eklendi düzeltmesiyle DEVAMLI olan HAKSIZ, yalnız Görevli ile dönen MAZERETLI, ikisi birden HAKSIZ, tabandan sonra ulaşan sayılan kayıtla dönen HAKSIZ, DEVAMLI kalan sayılmaz; mazeretliDonusOraniBinde onda bir birimli. Kilitten hemen sonra D08 işleri beklerken kilitSonrasiHesapTamam false, işler çalışınca true. Cevapta öğrenci adı ve numarası yok (olumlu kontrol: kurulumdaki ad hocanın ders raporunda görünür). Kilitten önce 409 RAPORLAR_DONEM_KILITLI_DEGIL.',
  });
  set('Telafi edilmeyen saat işareti', {
    asserts: 'Özetteki telafiEdilmeyenSaat D08 telafiEksigi ile aynı, D10 hesaplamaz (casus: dersSonuclari dönüşü değiştirilince cevap aynı değişir). D10-B19 kuralıyla beklenen değerler: taşınan oturum (2 saat teori) ve telafisiz hoca iptali (2 saat) teori 2; yalnız taşıma ve taşınan oturum yapıldı 0; tatil iptali 0. D08-B15 kuralı farklı kalırsa beklenen değerler D08 ile birlikte düzeltilir (D10-A10).',
  });
  set('Başka hocanın dersi, şubesi ve öğrencisi bulunamadı döner', {
    asserts: 'Dört hoca ucunda başka hocanın kimlikleriyle 404 ve gövde istekKimligi dışında var olmayan kimlikle aynı (varlık sızmaz); hoca ve yönetici rollü kişi kendi kapsamındaki birimde başka hocanın dersini, şubesini ve öğrencisini isteyince de 404 (dersYetkisi \'yonetici\' kabul edilmez); dönem sonu raporunda kapsam dışı birim 404. Kontrol: sahibi aynı isteklerle 200 alır (plan.html#baslangic yetki senaryosu). Mutasyon: \'sahip\' karşılaştırması null değil denetimine çevrilince senaryo kırmızı.',
  });
  set('Rol ve kimlik denetimi rapor uçlarında çalışır', {
    asserts: 'Girişsiz istek 401 API_KIMLIK_GEREKLI, öğrenci oturumu 403 API_ROL_YETKISIZ, hoca rolü olmayan yönetici hoca uçlarında 403; yönetici olmayan hoca dönem sonu raporunda 403; çerezli POST Origin olmadan 403 API_KOKEN_GECERSIZ.',
  });
  set('Rota listesi sözleşmeyle birebir', {
    asserts: 'packages/contracts/src/raporlar.ts rota listesindeki beş uç (yöntem, yol, kimlik türü, gerekli rol, hız sınıfı) sunucunun kaydettikleriyle aynı; raporlar modülünün bütün rotalarının hız sınıfı agir; sabitler içe aktarılır, yeniden yazılmaz.',
  });
  set('Her RAPORLAR_ hata kodu bir senaryoda döner', {
    asserts: 'Katalogdaki her RAPORLAR_ kodu en az bir senaryoda gerçek cevapta görülür, HTTP durumu katalogdakiyle aynı ve hoca ile öğrenci metni dolu (D13-B02 kapsama testi); 2000 satır aşımı 422 API_SONUC_COK_BUYUK, 15 sn aşımı 503 API_SORGU_ZAMAN_ASIMI döner.',
  });
  set('Büyüyebilen kodlar x-extensible-enum taşır', {
    asserts: 'Üretilen OpenAPI belgesinde HucreKodu, GeciciNedeni, sonuç, tür kararı, KARAR BEKLİYOR nedeni, liste satırı kaynağı, çıktı türü, çıktı durumu ve engel alanlarında x-extensible-enum var, enum anahtarı yok (D13-B20).',
  });
  set('Okunan yabancı sütunlar şemada var', {
    asserts: 'okunan-tablolar.ts içindeki her okuma sorgusu (oturum_son_durumlari, devam_sonuclari.hesaplandigi_an, liste_satirlari.silinme_ani, oturum_isaretleri yüklemi dahil) göçlerle kurulmuş test veritabanında EXPLAIN ile koşar; tipli Drizzle tanımları sahiplerin tablolar.ts dosyalarından gelir. Mutasyon: atılacak bir göçte okunan sütunun adı değiştirilince test kırmızı.',
  });
  set('Anlık tablolarına uygulama rolleri yalnız ekler ve okur', {
    asserts: 'İki tablonun yorumu @yalniz-ekleme; has_table_privilege yoklama_api ve yoklama_isci için iki tabloda INSERT ve SELECT true, UPDATE, DELETE ve TRUNCATE false; yoklama_api ile gerçek UPDATE 42501 alır; aynı işlemde SET LOCAL ROLE yoklama_saklama sonrası silme geçer.',
  });
  set('Anlık özeti yeniden hesaplanınca tutar', {
    asserts: 'Kurulumdaki her anlıkta saklanan başlık ve satırlardan anlığın kendi ozet_bicim_surumu kurucusuyla kurulan kanonik içeriğin SHA-256 değeri ozet_ozeti ile aynı, satır sayısı ogrenci_sayisi ile aynı; aynı anlık alındığı andaki GET cevabının ozetOzeti ile de aynı.',
  });
  set('aksisAnligiGetir sözleşmesi', {
    asserts: 'Dönüş AksisAnligi Zod şemasından geçer, kayıt yoksa null; yaprak.ts yalnız ./tablolar.ts ve tablo dosyalarını içe aktarır, servis ya da dış yüz içe aktarmaz (dependency-cruiser kuralı); dependency-cruiser no-circular D09 ile D10 arasında döngü bulmaz.',
  });
  set('Şema kuralları iki tabloda tutar', {
    asserts: 'CHECK listeleri packages/core/src/raporlar, D03 ve D08 sözleşme sabitleriyle aynı (sabitler içe aktarılır); kaynak kısıtının iki dalı: alan_kisi_id ya da cikti_kimligi dolu GUN_SONU satırı ve üç alandan biri boş HOCA_CIKTISI satırı 23514 alır (olumlu kontrol: doğru iki satır geçer); id varsayılanı uuidv7(); anlık sütunları timestamptz; kısıt adları 63 baytı geçmez; enum tipi yok.',
  });
  set('Yüzde metni kararla çelişmez', {
    asserts: 'T 1 ile 400, p 1 ile 100, devamsızlık 0 ile T arasında her durumda (D08\'in hak fonksiyonu içe aktarılır): yuzdeBinde < 10 x p ancak ve ancak DEVAMSIZ; DEVAMSIZ türde metin p\'ye ulaşmış görünmez; muaf satırda tür kararı D08 değeri olduğundan aynı kural geçerli. Tek tek, rastgele değil (teknik.html#testler-birim).',
  });
  set('Kanonik özet içeriği kararlıdır', {
    asserts: 'fast-check (numRuns 1000): biçim 1 içeriğindeki her alan tek tek değişince özet değişir; içerik dışı alan (hazırlanma anı, hesapAni, cikti, taban, kilittenSonraSayilmayanKayit, kilitUygulandi, kilitAni, sonGun, sonOturumBitisAni, gondermeSuresiSurenOturum, cevapsız oturum kimlikleri) değişince değişmez; NFD ve NFC yazılmış aynı isim aynı özeti verir; saat dilimi ve yerel ayardan bağımsız; sabit örneğin biçim 1 metni depodaki altın metinle bayt bayt aynı.',
  });
  set('Tarih metinleri Intl olmadan', {
    asserts: 'tabloTarihi(\'2026-10-06\') \'06.10.2026\', metinTarihi \'6 Ekim 2026 Salı\', sutunTarihi \'6 Eki\'; 2020-01-01 ile 2040-12-31 arasındaki her günde haftanın günü bir öncekinden bir ileri, ay adları doğru (tasarim.html#tipografi). istanbulSaatiMetni(anMs) sabit +03:00 ile \'06.10.2026 14:05\' verir; 2020 ile 2040 arasındaki rastgele anlarda saat veritabanıyla (Intl.DateTimeFormat, timeZone Europe/Istanbul) aynı.',
  });
  set('Çıktı durumu zamanla doğru ilerler', {
    asserts: 'fast-check zaman dizileri: yeni oturum eklenmedikçe DONEM_ICI, DONEM_SONU, KILITLI sırası geri gitmez; ONAYSIZ_DERS_VAR yalnız DONEM_SONU ve KILITLI\'da; anlikAlinir yalnız DONEM_SONU, kilit anı biliniyor ve engel yokken; kilit anı yoksa KILITLI hiç olmaz.',
  });
  set('Gün sonu işi ve dönem sonu raporu büyük birimde', {
    asserts: '1000 şubelik birimde birim ve dönem işi 10 dakikayı (sureAsimiSaniye 1800\'ün yarısı) geçmez, her şube kendi işleminde, işlem başına kilit tutma süresi ölçülür; en büyük şubede çıktı ucu (POST) 5 sn statement_timeout\'un altında, p95 en çok 2 sn; aynı birimin dönem sonu raporu tek küme sorgusuyla p95 en çok 5 sn.',
  });
  set('Sunucu korumaları bilerek bozulur', {
    asserts: 'Yedi elle mutasyon her biri adı geçen testi kırmızıya çevirir: özet karşılaştırması her zaman eşit, GUN_SONU kısmi tekil dizini yok, READ ONLY yok, 404 yerine 403, \'sahip\' yerine null değil denetimi, güvenlik ağında kilitUygulandiAni süzgeci yok, güvenlik ağında 14 gün sınırı yok. Dosya md5 ile alınır, özgün baytlar geri yazılır ve md5 tutar; git checkout ya da stash kullanılmaz.',
  });
  const at = (afterName, ...items) => { const i = T.findIndex(t => t.name === afterName); if (i < 0) throw new Error('test missing ' + afterName); T.splice(i + 1, 0, ...items); };
  at('Aynı çıktı kimliği yeniden gelince aynı anlık döner', {
    name: 'Ekrandan okunan özet taban olur', kind: 'behavior',
    asserts: 'DONEM_SONU\'nda panel özeti gösterir (EKRAN anlığı, öğrencinin sonucu DEVAMSIZ); pencere içinde, son günden önce ulaşan geçerli kayıt sonucu DEVAMLI yapar; kilitten sonra taban EKRAN anlığıdır ve D09 sonradan değişenler bu öğrenciyi listeler. Kontrol: aynı akışta EKRAN anlığı yoksa (yalnız GUN_SONU) öğrenci listede yok, yani fark EKRAN yakalamasından gelir.',
  });
  at('Gün sonu anlığı kilitten sonra şube başına bir kez alınır', {
    name: 'İşçi kesintisinden sonra kilit ve anlık aynı sayımı verir', kind: 'behavior',
    asserts: 'İşçi kapalıyken İstanbul gece yarısı geçer; açılınca missed: once ile donem_kilidi çalışır ve D10 işi aynı işlemde kuyruğa girer; iş bitince anlıktaki her öğrencinin sonucu kilit işleminden hemen sonra okunan D08.dersSonuclari ile aynı; anlıktan sonra girilen düzeltme D09 sonradan değişenlerde görünür. Güvenlik ağı kilit uygulanmadan önce çalışırsa hiçbir şey yazmaz ve kendini 15 dakika sonrasına koyar.',
  }, {
    name: 'Güvenlik ağı tekrar zinciri kopmaz', kind: 'behavior',
    asserts: 'Kilit anı geçmiş ama uygulanmamışken güvenlik ağının art arda üç tekrarı da kuyruğa girer (isGonder isId boş değil, her biri çalışırken bir sonraki açılır, stately); kilit uygulanınca sonraki çalışma kendini koymaz ve zincir durur. Mutasyon: politika exclusive yapılınca ikinci tekrar açılmaz ve senaryo kırmızı.',
  }, {
    name: 'Eski anlıklar yeniden alınmaz, anonim satır 500 vermez', kind: 'behavior',
    asserts: '15 gün önce kilitlenen birimin anlığı saklama işleyicisiyle silindikten sonra güvenlik ağı çalışır: o birime hiçbir şey yazmaz ve hata vermez (olumlu kontrol: 1 gün önce kilitlenen birimin eksik anlığı aynı çalışmada alınır). Saklama işleyicisi yalnız kilit anı sinirAni\'dan eski birim ve dönemin başlıklarını siler, satırlar CASCADE ile gider, kanıt saklama_islemleri\'ne \'raporlar.aksis_ozet_anliklari\' sınıfıyla yazılır. Anonimleştirilmiş liste satırı ders raporu ve özette ogrenciNo ve adSoyad null, saklamaSuresiDoldu true ile 200 döner; öğrenci raporu o satırın kimliğiyle 404.',
  });
  at('Şema kuralları iki tabloda tutar', {
    name: 'Kilit adımı, iş tanımı ve saklama süresi sahiplerin kurallarına uyar', kind: 'contract',
    asserts: 'D02\'nin kayıtlı kilit adımları listesinde raporlar.gun_sonu_anligi D07 adımından sonra; isTanimla tanımı D14 sözleşme testinden geçer (sureAsimiSaniye 1800, kalpAtisiSaniye 60, stately, sonra [\'donem_kilidi\'], cron 03:00 ile 05:00 dışında ve donem_kilidi\'nden en az 10 dakika sonra); kuyruk veri şeması strict ve yalnız z.uuid alanlı. D12 sureler.ts\'te liste satırı süresi tanımlıysa \'raporlar.aksis_ozet_anliklari\' süresi tanımlı ve ondan büyük değil, D03 kaydının oncekiSiniflar listesinde bu sınıf var (sabitler içe aktarılır).',
  });
}

// ---------------------------------------------------------------- resolved gaps
{
  const G = S.resolved_gaps;
  const set = (gap, fields) => Object.assign(byKey(G, 'gap', gap), fields);
  set('D10-B06', {
    decision: `Sunucu hesaplar, panel yalnız biçimler. Satır değerleri D08.dersSonuclari(tx, subeId) dönüşünden, yayımlanan imzayla şu eşlemeyle gelir: satirId -> listeSatiriId; turler dizisinin TEORI ve UYGULAMA ögeleri -> teori ve uygulama (dizide olmayan tür null); tabanSaat -> yapilanSaat; devamsizSaat, mazeretliSaat ve katildigiSaat aynen; yuzdeOnda -> yuzdeBinde; turSonucu -> karar; sonuc aynen; kararBekliyor { acikIsaret, baglanti } -> acikIsaret true ise ACIK_ISARET, değilse baglanti true ise BAGLANTI_YOK, ikisi de false ise null. Şube düzeyinde sayimTabani, teoriP, uygulamaP ve hesapAni aynen; telafiEksigi.TEORI ve .UYGULAMA -> dersIsaretleri.telafiEdilmeyenSaat; cevapsizOturumSayisi -> CEVAPSIZ_OTURUM sayısı ve anlığın cevapsiz_oturum_sayisi; sonOturumBitti D10'un sonOturumBitisAni ile testte karşılaştırılır. Satırın gecici bayrağı ONAY_BEKLEYEN_KENDI_BEYANI, türlerden birinde acikSaat > 0 KARARI_ACIK_KAYIT sayısını verir (D08 onayBekleyenVar ve acikKararVar ile tutarlılık testte). Programda tür bayrakları (turler) D02 program verisinden okunur, dersSonuclari'ndan türetilmez. Oturum hücreleri D08'in son durum tablosundan. D10 kendi kurduğu şey olarak yalnız liste sırasını, geçici nedenlerini, çıktı durumunu ve kanonik özeti kurar; panel "tr" ile biçimler, ekranda sıralar ve süzer, SheetJS ile .xlsx'i ve baskı görünümünü packages/core/src/raporlar fonksiyonlarıyla çizer, karar hesaplamaz.`,
    why: `Aynı değer iki yerde hesaplanırsa ekran, Excel ve anlık ayrışır; Haksız devamsız ve sonradan değişenler sunucudaki değeri ister. D10'un daha önce beklediği şekil (hesap bekleme bayrağı, tür bayrakları, açık işaret sayıları) D08'in yayımladığı imzada yoktu; eşleme yazılı olmayınca mühendis iki tanımdan birini seçmek zorunda kalırdı.`,
  });
  set('D10-B11', {
    decision: `Muaf öğrencinin özetinde toplamlar, yüzde ve iki tür kararı D08 değeriyle bilgi olarak yazar (D08 tür kararını muafta da aynı formülle hesaplar), Sonuç DEVAMLI_MUAF'tır ve "DEVAMLI (muaf)" gösterimi yalnız harfler.ts'teki Sonuç kuralıdır; KARAR BEKLİYOR olmaz. Ders raporunda muaf öğrencinin hücresi D08 son durumu MUAF ("M"), saatler D08 değeriyle kalır, toplam eşitliği bozulmaz.`,
    why: `Plan muafı ders düzeyi durum sayıyor (plan.html#gun-son-durumlar) ve özette "DEVAMLI (muaf)" yazıyor; tür kararını D10 değiştirseydi "Rapor değer üretmez" kuralı ve yüzde ile karar özelliği muaf satırda bozulurdu.`,
  });
  set('D10-B14', {
    decision: `baslangic ve bitis YYYY-AA-GG, ikisi de dahil, oturumun ders günü (date, İstanbul) alanına uygulanır. Kırpma aralığı [max(takvim.dersBaslangic, ders.takipBaslangici), min(takvim.sonGun, bugün)] (D02.takvimGetir ve dersGetir); takvim yoksa alt uç takipBaslangici, o da yoksa şubelerin ilk oturum günü, üst uç bugün. Parametresiz istek bu aralığın tamamıdır; istenen aralık bununla kesiştirilir, cevap kesişen aralığı döner. bitis baslangictan önceyse 400 (neden TERS), kesişme boşsa 400 (neden DONEM_DISI). Bitişi geçmemiş oturum rapora girmez.`,
    why: `Plan "gün olarak gider" diyor (plan.html#hoca); dahil ya da hariç belirsizliği son gündeki oturumu düşürebilirdi. Üst uç dersBitis olsaydı dersBitis ile sonGun arasındaki telafi oturumları (D02-A03: telafi son güne kadar girilebilir) ve ders yapılan sınav haftası oturumları ders raporundan düşer, AKSİS özeti onları saymaya devam eder ve tam dönem toplam eşitliği bozulurdu. Takip başlangıcından önceki günler D08'in hesabında da yoktur. Bugün, verilen andan SQL'de AT TIME ZONE 'Europe/Istanbul' ile bulunur (D12-B06).`,
  });
  set('D10-B19', {
    decision: `Telafi edilmeyen saat D08'in telafiEksigi alanıdır, D10 yalnız gösterir; packages/core/src/raporlar/telafi.ts yoktur. Tek tanım D08-B15'te durur ve şu kuralı almalıdır: borç = hoca iptali ve taşıma (iptal nedeni tasindi) ile kapanan oturumların saati artı "yapılmadı" denen NORMAL oturumların saati; kapatan = yapılan TELAFI oturumlarının saati; tatil, sınav haftası, takvim, program ve arşiv iptali borç değildir; sonuç en az 0. Örnek: A oturumu (2 saat teori) taşınır ve taşınan oturum yapılır, B (2 saat) hoca iptaliyle düşer ve telafi edilmez: borç 2 + 2 - 2 = 2. Yalnız taşıma: 2 - 2 = 0. Sıfırdan büyükse özet dersIsaretleri.telafiEdilmeyenSaat ile işaretler.`,
    why: `Plan "yapılmayıp telafi edilmeyen saat" işaretini istiyor (plan.html#devam). D02'de taşıma eski oturumu tasindi ile kapatıp yenisini TELAFI olarak açtığından taşıma borca girmezse taşınan oturumun yapılması başka bir yapılmayan oturumun borcunu siler (örnekte 0 çıkardı, gerçek borç 2). D08-B15 bugün taşımayı saymıyor, D02-A02 önerisi "taşınan oturumun telafisi borcu kapatır" diyor; ikisi bu kurala çekilmeli (D10-A10). İki modülde ayrı tanım ekran ile anlığı ayırırdı.`,
  });
  {
    const b05 = byKey(G, 'gap', 'D10-B05');
    const a = 'Yüzde API\'de onda bir birimli tam sayıdır (yuzdeOnda, 695 = %69,5), D08';
    if (!b05.decision.startsWith(a)) throw new Error('D10-B05 text changed');
    b05.decision = 'Yüzde API\'de onda bir birimli tam sayıdır (yuzdeBinde, 695 = %69,5; alan adı D13-B15 kuralıyla Binde ile biter, D08\'in iç adı yuzdeOnda), D08' + b05.decision.slice(a.length);
  }
  set('D10-B22', {
    decision: `Her rapor tek işlemde: islem(fn, { saltOkunur: true, zamanAsimiMs: 15000 }) ile READ ONLY ve SET LOCAL statement_timeout = '15s', REPEATABLE READ (D12'den istenen yalitim seçeneği; gelene kadar fn'nin ilk deyimi SET TRANSACTION ISOLATION LEVEL REPEATABLE READ). 15 sn, D12'nin salt okunur işleme izin verdiği 20 sn'nin ve Fastify'ın 20 saniyelik requestTimeout'unun altındadır (D13-B26). İlk sürümde ayrı rol açılmaz, READ ONLY yazmayı veritabanında keser; bileşim kökü ders raporu, öğrenci raporu ve dönem sonu raporu için ayrı havuz verebilir, okuma kopyasına geçiş yalnız bu havuzun adresidir; AKSİS özeti, çıktı ucu ve gece işi her zaman ana veritabanında kalır (özet özeti karşılaştırması gecikmeli kopyayla 409 döngüsüne girmesin). Sorgu şubeden ve tarih aralığından oturuma başlar; sayfalama yok, sert sınır 2000 öğrenci satırı ya da 2000 oturum, aşılınca 422 API_SONUC_COK_BUYUK (D13-B13). Deyim süresi aşımı (57014) kökte 503 API_SORGU_ZAMAN_ASIMI olur; panel bu kodu yeniden denemez (D13-B23). Bütçe: en büyük sınıfın tam dönem raporu p95 2 sn (yük testi).`,
    why: `Ayrı sorgular arada gelen kayıtla hücreyi ve toplamı uyuşmaz yapardı (plan.html#hedefler); okuma kopyası büyüme sırasının ikinci adımı (plan.html#teknoloji-sunucu-yeri); BRIN baştan konmaz (teknik.html#veritabani-donem-alani). Modüle özgü boyut ve süre kodları D13-B02 kuralına aykırıydı ve süre kodu hiçbir cevapta görülemezdi.`,
  });
  set('D10-B23', {
    decision: `Cevapta kodlar BÜYÜK_HARF ASCII (D13-B14): hücre VAR, YOK, GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI, MUAF, KARAR_ACIK, YAPILMADI, CEVAP_BEKLIYOR, KAPSAM_DISI; Sonuç DEVAMLI, DEVAMSIZ, DEVAMLI_MUAF; tür kararı DEVAMLI, DEVAMSIZ; KARAR BEKLİYOR nedeni ACIK_ISARET, BAGLANTI_YOK; liste satırı kaynağı DOSYA, ELLE, SISTEM; çıktı türü EXCEL, BASKI, EKRAN, ONAY; hepsi x-extensible-enum. Kodu harfe ve sabit metne ("DEVAMLI", "DEVAMSIZ", "DEVAMLI (muaf)", "KARAR BEKLİYOR") çeviren tek tablo packages/core/src/raporlar/harfler.ts içinde, Intl'siz; büyük harfe çevirme yapılmaz. V, Y, G, B ve E harfleri D09'un SON_DURUMLAR sabitinden (packages/core/src/duzeltmeler/katalog.ts) içe aktarılır; harfler.ts yalnız M'yi (MUAF, ders düzeyi, D09 kataloğunda yok) ve dört ek kodun işaretini tanımlar.`,
    why: `Tasarım sonuçların sabit metin yazılmasını istiyor (tasarim.html#tipografi); büyüyebilen değerler ilk yayından x-extensible-enum taşır (teknik.html#sunucu-mimari), yeni durum eski paneli bozmaz. Harf iki yerde yazılırsa D09'un oturum tablosu ile rapor ayrışır.`,
  });
  set('D10-B24', {
    decision: `D10 son durumu türetmez: hücreler D08'in oturum_son_durumlari tablosundan okuma istisnasıyla okunur (dört saat ve son durum aynen; türetimi D09.sonDurumOnceligi ile D08 yapar). Bu tablo D08'in devam_hesapla işiyle, işin gecikmesiyle yazılır; AKSİS özeti ise dersSonuclari'nın canlı hesabıdır. Bu yüzden tek okuma işlemi iki kaynağı eşitlemez: kayıt ya da kafa sayısı girildikten sonra iş çalışana kadar (YAPILDI 5, OTURUM_KAPANDI 15 dakika) hücre eski, özet yeni olabilir. Toplam eşitliği D08 kuyruğu boşken iddia edilir; cevap hucreHesapAni ile hücrelerin hangi D08 hesabını gösterdiğini söyler. D08 canlı oturumSonDurumlari(tx, { subeId, oturumIdler }) verirse (D10-A10) hücreler oradan aynı işlemde okunur, oturum_son_durumlari okuma istisnasından çıkar ve eşitlik her an geçerli olur.`,
    why: `contracts.json oturum_son_durumlari tablosunu D08'e verdi; iki yerde türetim ekran ile özeti ayırırdı. Önceki gerekçe ("tablo sonuçla aynı işlemde yazıldığından tek okuma işleminde toplam tutar") D08 tasarımıyla yanlıştı: özet saklanan değerden değil canlı hesaptan gelir, fark eşzamanlılıktan değil iş gecikmesinden doğar ve REPEATABLE READ onu kapatmaz. Sözlük son durumu oturum başına tanımlıyor (plan.html#sozluk).`,
  });
  set('D10-B27', {
    decision: `Kilit uygulandıktan sonra rapor ve özet kilitli sayımı gösterir; kilit anından sonra ulaşan kayıt hücreyi değiştirmez, üst bilgide "kilitten sonra gelen N kayıt sayılmadı" yazar (kilittenSonraSayilmayanKayit), ayrıntı D09'un sonradan değişenler listesindedir. Denetim kaydı bırakan düzeltme yapılınca rapor düzeltmeyi gösterir. Geçicilik kilitten sonra yalnız yaşayan nedenlerle sürer (D10-C04).`,
    why: `Son günden sonra gelen kayıt yalnız saklanır, sayım ancak denetimli düzeltmeyle değişir (plan.html#kararlar-gonderme-suresi).`,
  });
  G.push(
    {
      gap: 'D10-B28',
      decision: `Gün sonu anlığı kilit işlemine bağlanır: D10, D02.kilitAdimiKaydet ile D07 adımından sonra gelen 'raporlar.gun_sonu_anligi' adımını kaydeder; adım donem_kilidi işleminin içinde birim ve dönem işini D14.isGonder ile kuyruğa koyar. Anlıkların kendisi kilit işleminde değil, iş içinde şube başına kısa işlemlerle yazılır. Zamanlanmış çalışma (00:40, sonra: ['donem_kilidi']) yalnız güvenlik ağıdır: son 14 günde uygulanmış kilitlerde eksik anlığı tamamlar, kilit anı geçmiş ama uygulanmamış birim ve dönemi bekleyen sayıp kendini 15 dakika sonrasına koyar. D08'in bekleyen işi beklenmez. Kilitten sonraki yazmalar (D09 düzeltmesi, D02 yapıldı cevabı) bekletilmez.`,
      why: `Önceki tasarımda anlık sırası yalnız duvar saatine bağlıydı ve üç modül farklı saat yazıyordu; işçi gece yarısını kapsayan bir kesintiden sonra açılınca iki kaçan iş aynı anda koşabiliyor, D10 işi kilitten önce çalışınca hiçbir şube bulmuyor ve anlık 24 saat gecikiyordu; o arada kilitten sonraki düzeltmeler tabana karışıyordu. İş kilit işleminde kuyruğa girdiği için kilit uygulanmadan çalışamaz, uygulanınca saniyeler içinde başlar. Anlıklar kilit işleminde yazılsaydı 1000 şubelik birimde kilit işlemi dakikalarca satır kilidi tutar, tek şubenin beklenmeyen verisi bütün kilidi geri alıp D07 kapanışını ve arşivlemeyi durdururdu. dersSonuclari canlı olduğundan iş D07 kapanışını görür. Kalan fark: kilit anı ile anlık anı arasındaki düzeltme (normal gecede 00:00 ile en geç 00:30 arası) tabana girer; öneri D10-A07'de.`,
    },
    {
      gap: 'D10-B29',
      decision: `Kanonik özet içeriği biçim 1 (packages/core/src/raporlar/ozet-icerigi.ts). İçerik yalnız anlıkta saklanan sütunlardan oluşur. Başlık dizisi, bu sırayla: ozet_bicim_surumu (1), ders_id, sube_id, ders_kodu, ders_adi, sube_etiketi, takip_baslangici, son_yapilan_ders_gunu, sayim_tabani, teori_p, uygulama_p, teori_programda, uygulama_programda, teori_telafi_edilmeyen_saat, uygulama_telafi_edilmeyen_saat, cevapsiz_oturum_sayisi, gecici_nedenleri, gecici_neden_sayilari, ogrenci_sayisi. Her öğrenci için bir satır dizisi, (liste_sirasi, liste_satiri_id) sırasıyla ve bu alan sırasıyla: liste_satiri_id, ogrenci_no, ad_soyad, liste_sirasi, kaynak, muaf, teori_yapilan_saat, teori_devamsiz_saat, teori_mazeretli_saat, teori_yuzde_binde, teori_karar, uygulama_yapilan_saat, uygulama_devamsiz_saat, uygulama_mazeretli_saat, uygulama_yuzde_binde, uygulama_karar, sonuc, karar_bekliyor_nedeni. İçerikte olmayanlar: hazırlanma ve alınma anı, D08 hesapAni, cikti, taban, kilittenSonraSayilmayanKayit, kilitUygulandi, kilitAni, sonGun, sonOturumBitisAni, gondermeSuresiSurenOturum, cevapsız oturum kimlikleri (sayısı içeriktedir), saklamaSuresiDoldu (ogrenci_no boşluğundan çıkar) ve katildigiSaat (yapılan, devamsız ve mazeretli saatten çıkar, D08 CHECK'i). Serileştirme: her dizi JSON.stringify ile konumsal yazılır (nesne anahtarı yok, anahtar sırası sorunu doğmaz); diziler LF (\\n) ile ayrılır, metin LF ile biter; tam sayılar ondalık JSON sayısı, boolean true ya da false, boş değer null, tarih 'YYYY-AA-GG' metni, kimlik küçük harfli UUID metni, kodlar BÜYÜK_HARF metni; bütün metinler önce normalize('NFC'). Metin UTF-8 ile kodlanır, SHA-256 alınır: cevapta 64 küçük hex, tabloda 32 bayt. Biçim değişirse yeni sürüm eklenir, eski kurucu silinmez (KURUCULAR = { 1: kurBicim1 }); anlık hep kendi ozet_bicim_surumu ile yeniden kurulur, yeni anlık en son sürümle yazılır.`,
      why: `Önceki tanım ("hazırlanma anı, hesap durumu ve çıktı hariç bütün GET cevabı") anlıkta saklanmayan alanları da kapsıyordu; ders kodu ve adı, şube etiketi, son yapılan ders günü gibi basılan alanlar saklanmadığından anlık kâğıttaki çıktının kanıtı olamıyor ve "saklanan satırlardan yeniden kurulunca aynı çıkar" değişmezi hiçbir zaman geçemiyordu; gün sonu anlığının özeti zamanla değişen taban ve sayılmayan kayıt alanlarına da bağlıydı. Biçim yazılı olmayınca iki uygulama aynı veriden farklı özet üretebilirdi.`,
    },
    {
      gap: 'D10-B30',
      decision: `Saklama: veri sınıfı 'raporlar.aksis_ozet_anliklari' (D12 '<modül>.<sınıf>' biçimi), işleyici saklamaIsleyicisiKaydet ile { islem: 'silme', partiIsle } olarak kaydolur. partiIsle({ tx, sinirAni, partiBoyutu }) birim_donemleri.kilit_ani < sinirAni olan birim ve dönemlerin başlıklarından en çok partiBoyutu kadarını donem_id sırasıyla siler, satırlar ON DELETE CASCADE ile gider, { satirSayisi, donemId, bitti } döner; işlem D12'nin saklama_suresi_isi içinde yoklama_saklama rolüyledir. Anlık numara ve ad kopyası taşıdığından süresi D12 sureler.ts'te liste satırlarının anonimleştirme süresinden uzun olamaz ve sınıf D03'ün liste satırı sınıfından önce işlenir (D03 kaydında oncekiSiniflar: ['raporlar.aksis_ozet_anliklari']); ikisi D10 sözleşme testinde denetlenir. Güvenlik ağı 14 günden eski kilide bakmadığından silinen anlık yeniden alınmaz. Rapor uçları anonimleşmiş liste satırını (silinme_ani dolu) numara ve ad olmadan, saklamaSuresiDoldu true ile döndürür; öğrenci raporu böyle bir satırın kimliğiyle 404 verir.`,
      why: `Gece işi kilit anı geçmiş bütün birim ve dönemleri tarasaydı saklamanın sildiği anlıkları ertesi gece yeniden almaya kalkar: liste anonimleştiyse satır eklemesi ogrenci_no NOT NULL kısıtına takılıp iş her gece ölü mektuba düşer, anonimleşmediyse süresi dolmuş numara ve isim bugünün tarihiyle yeniden kopyalanır ve yıllar sonra alınmış sahte bir gün sonu tabanı dönem sonu raporuna girerdi. Rapor uçları da anonim satırda boş olmayan metin beklediğinden 500 verirdi.`,
    },
    {
      gap: 'D10-B31',
      decision: `Hücre kuralı: önce oturum düzeyi (yapılmadı denen oturum YAPILMADI, cevapsız oturum CEVAP_BEKLIYOR); D08 satırı yoksa KAPSAM_DISI; son durum MUAF ise MUAF; acik_saat > 0 ise KARAR_ACIK (son durum dolu olsa da: karışık hücre, ör. 2 saat Elle eklendi ve 1 saat İncelemede); yoksa D08 son durumu. Saatler her zaman D08 satırının dört saatidir (varSaat = var_saat, yokSaat = yok_saat, mazeretliSaat = mazeretli_saat, acikSaat = acik_saat), satır yoksa 0. Bir (oturum, numara) hücresi tek liste satırına yazılır: oturum başlangıcında etkin olan satır, yoksa oturumdan sonra ilk eklenen satır; aynı numaranın öbür satırlarında hücre KAPSAM_DISI'dır. Birlikte işlenen oturum iki şubenin bölümünde sütun olsa da öğrencinin saati bir kez sayılır. Kafa sayısı işareti yüklemi tur = 'KAFA_SAYISI_ASIMI' AND gecerli AND NOT derste AND incelendi_ani IS NULL (D07 ile teyit edilir).`,
      why: `oturum_son_durumlari dört saat taşır ve kararı açık saat varken son durum dolu olabilir; üç saatli hücre ve öncelik kuralı olmadan "hücre saatleri D08 satırıyla aynı" testi kurulamıyordu. Derste çıkan işaret liste okunarak çözülür ve toplu incelemeye girmez; yüklemde derste olmasaydı o oturumlu her özet kalıcı olarak geçici kalırdı (D07 oturum_isaretleri).`,
    },
  );
}

// ---------------------------------------------------------------- contradictions
S.contradictions_resolved.push({
  id: 'D10-C04',
  resolution: `plan.html#devam-donem-sonu "KARAR BEKLİYOR öğrenci için de hesaplanan sonuç girilir; çıktı geçici işaretli kalır" diyor, plan.html#kararlar-gonderme-suresi ise kilitten sonra sayımın yalnız denetimli düzeltmeyle değiştiğini söylüyor; önceki tasarım bundan "kilitten sonra özet hiç geçici değildir" çıkarıp gün sonu anlığında geçiciliği CHECK ile yasaklamıştı. Çözüm neden başına: kilitte donan Beklemede ve İncelemede (D07), kilitte sayılmış haliyle kilitlenen onaysız Kendi beyanı, kesinleşmiş kafa sayısı işareti ve kilit anında biten gönderme süresi kilitten sonra geçicilik nedeni değildir; KARAR BEKLİYOR öğrenci (açık sorun bildirimi ve düzeltmeyle değişebilen sonuç D08'in kararBekliyor hesabındadır) ve cevapsız oturum (D02 cevabı kilitten sonra da kabul eder, D10-A05) kilitten sonra da geçici tutar. CHECK'ten "gün sonu anlığı geçici olamaz" kısmı çıkarıldı; ayrım D10-A03 ile sahibe sorulur.`,
});

// ---------------------------------------------------------------- open points
{
  const O = S.open_points;
  const set = (id, fields) => Object.assign(byKey(O, 'id', id), fields);
  set('D10-A03', {
    recommendation: `Altı neden kodla döner: onay bekleyen Kendi beyanı ve KARAR BEKLİYOR öğrenci planın koşulları (plan.html#gun-kayit-etiketleri, plan.html#devam-donem-sonu); kararı açık kayıt, incelenmemiş kafa sayısı işareti, gönderme süresi bitmemiş oturum ve cevapsız oturum öneridir. Dönemin sürmesi tek başına geçici sayılmaz. Kilitten sonra yalnız KARAR_BEKLIYOR_OGRENCI ve CEVAPSIZ_OTURUM yaşar, gün sonu anlığı da geçici yazılabilir (D10-C04); sahip "kilitten sonra hiçbir şey geçici değildir" derse yalnız bu iki nedenin kilit sonrası sayımı kapanır. Gönderme süresi: son haftadaki oturumda süre birimin son gününde, yani kilit anında biter (D06.gondermeSuresiSonu); son oturum son haftadaysa dönem sonu penceresinin tamamında bu neden doğru kalır ve penceredeki her hoca çıktısı geçici olurdu, işaret bilgi taşımazdı. Öneri ve kurulan davranış: GONDERME_SURESI_SURUYOR AKSİS özetinde yalnız DONEM_ICI'de sayılır; DONEM_SONU'nda özet "kayıtlar son güne kadar gelebilir" bilgi satırını gondermeSuresiSurenOturum ile gösterir. Sahip ek dört nedenden birini istemezse kod listesinde kalır ama hesaba girmez, sözleşme değişmez.`,
  });
  set('D10-A07', {
    recommendation: `Taban: şubenin dönem sonu penceresinde (son oturum bitişi ile kilit anı arası) alınan en son HOCA_CIKTISI anlığı, yoksa gün sonu anlığı; D10.aksisAnligiGetir(tx, subeId, 'TABAN') kuralı yalnız anlıkta saklanan son_oturum_bitis_ani ve kilit_ani ile uygular, sonradan eklenen telafi eski anlığı tabandan düşürmez. Hocanın asıl yolu ekrandan okumak olduğundan (plan.html#tek-bakista) panel özeti DONEM_SONU'nda gösterince tur EKRAN ile anlık yazılır (aynı özet için ikinci satır yazılmaz); Ctrl+P ile yazdırma da böyle yakalanır. Böylece son gün ekrandan DEVAMSIZ girilip aynı gün ulaşan geçerli kayıtla DEVAMLI olan öğrenci sonradan değişenlere düşer (plan.html#devam-donem-sonu). Öneri: özet ekranına ek olarak "AKSİS'e girdim" onayı (tur ONAY) konur; sahip istemezse EKRAN, EXCEL ve BASKI kalır, sözleşme değişmez. Kilitten sonra yazma bekletmesi yoktur: gün sonu anlığı kilit işleminin kuyruğa koyduğu işte saniyeler içinde alınır (D10-B28). Kalan aralık: kilit anı ile anlık anı arasında yapılan düzeltme (normal gecede kilit 00:20'de uygulanır) tabana girer; öneri: D09 sonradan değişenlerde olusturma_ani >= kilit_ani olan düzeltmeleri tabandan bağımsız listeler. Taban seçimi Haksız devamsız ölçüsünün tanımını değiştirdiği için sahip onaylamalı.`,
  });
  {
    const a02 = byKey(O, 'id', 'D10-A02');
    const a = '(yapilanSaat, devamsizSaat, mazeretliSaat, katildigiSaat, yuzdeOnda)';
    if (a02.recommendation.split(a).length !== 2) throw new Error('D10-A02 text changed');
    a02.recommendation = a02.recommendation.replace(a, '(yapilanSaat, devamsizSaat, mazeretliSaat, katildigiSaat, yuzdeBinde)');
  }
  set('D10-A08', {
    recommendation: `Hoca yalnız kendi derslerinin (arşivli dahil) raporunu, özetini ve çıktısını görür; kaynak yetkisi yalnız D02.dersYetkisi === 'sahip' sonucudur, hoca ve yönetici rolü olan kişi de başka hocanın dersinde 404 alır; öğrenci raporu yalnız o hocanın derslerini kapsar (plan.html#baslangic). Yönetici ilk sürümde ders verisi görmez (D01-B03 önerisiyle aynı); hesabı silinen hocanın dersi D02-B23 devriyle yeni hocaya geçer ve raporları onunla gider; devir kabul edilmezse yöneticiye yalnız hocası olmayan derslerde salt okuma açılır (ekleyerek büyür, uç değişmez).`,
  });
  set('D10-A09', {
    recommendation: `Yönetici panelinde birim ve dönem için, kilit uygulandıktan sonra açılan salt okunur sayfa (bugün GET /v1/raporlar/donem-sonu; yol D10-A13 ile /yonetim/ altına taşınır). İçerik ders ve şube başına isimsiz sayılar: tabanda DEVAMSIZ, Haksız devamsız (Elle eklendi gibi Haksız sayılan düzeltme ya da tabandan sonra ulaşan sayılan kayıtla DEVAMLI olanlar), ayrı oranla Görevli ve Belgeli dönüş, tabanda KARAR BEKLİYOR olanlar, öbür değişimler. Hem sistem kaynaklı hem mazeretli değişimi olan öğrenci Haksız sayılır (hedef 0 olduğundan şüphe görünür kalsın). İsimli ayrıntıyı hoca D09'un sonradan değişenler listesinde görür. Ayrı olay tablosu yok, anlık, düzeltme ve kayıttan hesaplanır (plan.html#kararlar-olcum).`,
  });
  set('D10-A10', {
    question: 'D08 ve D02 ile arayüz: dersSonuclari eşlemesi, canlı hücre okuması, telafi tanımı ve D10 hesap beklemesine dair başka modüllerde kalan metinler.',
    recommendation: `dersSonuclari'nın yayımlanan imzası özet için yeterlidir, eşleme D10-B06'da; hesap bekleme bayrağı istenmez, gün sonu anlığı ve çıktı ucu bekleyen işe bakmaz (canlı hesap kilit işlemindeki D07 kapanışını içerir). D08'den istenenler: (1) canlı oturumSonDurumlari(tx, { subeId, oturumIdler }): oturum_son_durumlari satırlarının aynısını liste satırı kimliğiyle, dersSonuclari ile aynı işlemde canlı hesaplar; gelince hücreler oradan okunur ve toplam eşitliği her an geçerli olur (D10-B24), gelene kadar eşitlik D08 kuyruğu boşken iddia edilir ve cevap hucreHesapAni taşır. (2) D08-B15 telafi kuralı D10-B19'daki tanıma çekilir (taşıma borca girer, kapatan yalnız yapılan TELAFI). Başka sahiplerin metninden kaldırılacaklar: contracts.json'daki D10 notu ("aksis_gun_sonu_anligi, kilit işleminin kuyruğa koyduğu devam_hesapla işleri bitmeden anlık almaz") ve D02 donem_kilidi metnindeki "(D10'un gün sonu anlığı bu işleri bekler)" cümlesi; yerine "D10'un kilit adımı gün sonu anlığı işini kuyruğa koyar" yazılmalı.`,
    needs_owner: false,
  });
  O.push({
    id: 'D10-A13',
    question: 'D10 bu tasarımda hangi sözleşme düzeltmelerini başka sahiplerden ve contracts.json\'dan bekliyor?',
    recommendation: `(a) contracts.json owns_endpoints'te dönem sonu raporu yolu GET /v1/raporlar/yonetim/donem-sonu olmalı: yönetici uçları /v1/<modül>/yonetim/ altındadır ve D13 rol denetimini yol kalıbından ikinci kez ancak orada uygular (D13-B14); spec yolu aynı değişiklikte taşınır, bugün spec contracts.json ile birebir kalmak zorunda olduğundan eski yolda. (b) D14 çizelgesindeki donem_kilidi 00:05 ve aksis_gun_sonu_anligi 00:25 satırları D02'nin 00:20'si ve D10'un 00:40'ı ile eşitlenmeli (00:25, 00:20'den sonraki 10 dakika kuralını bozar). (c) D12.islem'e yalitim: 'repeatable_read' seçeneği. (d) D03 liste satırı saklama kaydına oncekiSiniflar: ['raporlar.aksis_ozet_anliklari'] ve D12 sureler.ts'te anlık süresinin liste satırı süresinden uzun olmaması kuralı. (e) D02.kilitliBirimDonemleri'ne isteğe bağlı { uygulanmis: true } süzgeci; gelene kadar D10 sonucu kilitUygulandiAni dolu olanlara kendisi süzer. (f) D02'nin kilit adımları listesinde 'raporlar.gun_sonu_anligi' adımının D07'den sonraki sıra numarası.`,
    needs_owner: false,
  });
}

// ---------------------------------------------------------------- consumes
S.consumes = [
  { module: 'D01', uses: "oturumDogrula (kök kanca, D13 bağlar); yetkiDenetle(istek.kimlik, { roller: ['yonetici'] }, { birimId }) dönem sonu raporunda (izin false ise 404)" },
  { module: 'D02', uses: "dersGetir(tx, dersId); dersYetkisi(tx, kisi, dersId) (yalnız 'sahip' kabul edilir); subeGetir(tx, subeId); dersSubeleri(tx, dersId); oturumlariGetir(tx, { subeId, tarihten, tarihe, bitmis: true, durum: 'planlandi', denemeDahil: false }) ve cevapsız liste için oturumlariGetir(tx, { subeId, yapildi: 'cevapsiz', bitmis: true, durum: 'planlandi' }); birimDonemiGetir(tx, birimId, donemId) (sonGun, kilitAni, kilitUygulandiAni); takvimGetir(tx, birimId, donemId) (dersBaslangic ve sonGun: kırpma aralığı); kilitDurumu(tx, birimId, donemId, an); kilitliBirimDonemleri(tx, an) (D10 kilitUygulandiAni dolu ve son 14 günde olanlara süzer, D10-A13); kilitAdimiKaydet({ ad: 'raporlar.gun_sonu_anligi', sira, calistir }) modül kaydında bir kez; program verisi (tür bayrakları) okuma istisnasıyla" },
  { module: 'D06', uses: 'gondermeSuresiSonu({ bitisAni }, { devamsizlikSonGunu: birimDonemi.sonGun }): oturumun gönderme süresinin dışlayıcı sonu (geçici nedeni ve oturum sütunu); takvimsiz birimde çağrılmaz' },
  { module: 'D08', uses: 'dersSonuclari(tx, subeId): SubeDevamSonuclari, yayımlanan imzayla (eşleme D10-B06); canlı hesap, bekleyen işe bakılmaz' },
  { module: 'D12', uses: "veritabani.islem(fn, { saltOkunur: true, zamanAsimiMs: 15000 }) rapor okumasında; islem(fn, { yenidenDene: true }) çıktı ucunda; REPEATABLE READ için yalitim seçeneği (D10-A13; gelene kadar fn'nin ilk deyimi SET TRANSACTION ISOLATION LEVEL REPEATABLE READ); saklamaIsleyicisiKaydet('raporlar.aksis_ozet_anliklari', { islem: 'silme', partiIsle }); kisitAdi; tabloYardimcilari" },
  { module: 'D13', uses: "rotaTanimla (hiz: 'agir'), rotalariKaydet(app, rotalar), uygulamaHatasi(kod, ayrinti) (API_SONUC_COK_BUYUK dahil), hataKodlariTanimla('raporlar', kodlar), genisleyenEnum, ortak şemalar (gunSemasi, anSemasi, bindeSemasi, istemciKimligiSemasi, ogrenciNoSemasi)" },
  { module: 'D14', uses: "isTanimla({ kuyruk: aksisGunSonuKuyrugu, isleyici, sureAsimiSaniye: 1800, kalpAtisiSaniye: 60, zamanlama: { cron: '40 0 * * *', sonra: ['donem_kilidi'] } }); isGonder(tx, aksisGunSonuKuyrugu, veri, { tekillikAnahtari, baslamaAni })" },
  { module: 'bileşim kökü', uses: 'saat (D04\'ün saat arayüzü, parametreyle; D04 dış yüzü çağrılmaz), sunucu sürümü, isteğe bağlı rapor okuma havuzu' },
  { module: 'okuma istisnası (yalnız SELECT, teknik.html#sunucu-mimari)', uses: "liste_satirlari (D03): sıra, numara, ad, kaynak, muaf, eklenme, pasif ve silinme anı; oturumlar, oturum_subeleri, dersler, subeler ve program (D02): iş adayları, aralık matrisi ve tür bayrakları; oturum_son_durumlari (D08): hücreler, D08 canlı işlevi gelene kadar (D10-A10); devam_sonuclari (D08): dönem sonu raporunda şimdiki Sonuç ve hesaplandigi_an, tek küme sorgusuyla; oturum_isaretleri (D07): kafa sayısı işareti yüklemi (D10-B31); yoklama_kayitlari (D05) ve ogrenci_hesaplari (D01): kilitten ve tabandan sonra ulaşan kayıtlar ile öğrenci raporunun kayıt kararı; duzeltmeler (D09): tabandan sonraki düzeltmeler. Tipli okuma sahiplerin tablolar.ts tanımlarıyla, hepsi okunan-tablolar.ts dosyasında." },
  { module: 'sözleşme sabitleri (dış yüz çağrısı değil)', uses: 'packages/core/src/duzeltmeler/katalog.ts (D09: SON_DURUMLAR harfleri, SEBEP_KODLARI Haksız sayılır ve mazeretli bilgisi), packages/contracts/src/devam.ts (sonuç ve tür kararı kodları), packages/contracts/src/yoklama.ts (karar kodları), D03 liste satırı kaynak kodları, packages/core/src/devam hak fonksiyonu (yalnız testte)' },
];

// ---------------------------------------------------------------- error codes
const OGR = 'Bu bilgi öğrenci hesabıyla görüntülenemez.';
S.error_codes = [
  { kod: 'RAPORLAR_DERS_BULUNAMADI', http: 404, ne: 'Ders yok, deneme dersi ya da isteyen hocanın sahibi olduğu ders değil (varlık sızdırılmaz).', hoca: 'Ders bulunamadı.', ogrenci: OGR },
  { kod: 'RAPORLAR_SUBE_BULUNAMADI', http: 404, ne: 'Şube yok, verilen dersin şubesi değil ya da dersin sahibi isteyen değil.', hoca: 'Şube bulunamadı.', ogrenci: OGR },
  { kod: 'RAPORLAR_OGRENCI_BULUNAMADI', http: 404, ne: 'Liste satırı yok, saklama süresiyle anonimleşmiş ya da isteyen hocanın sahibi olduğu hiçbir listede değil.', hoca: 'Öğrenci bulunamadı.', ogrenci: OGR },
  { kod: 'RAPORLAR_BIRIM_BULUNAMADI', http: 404, ne: 'Birim ya da dönem yok ya da yöneticinin kapsamında değil.', hoca: 'Birim ya da dönem bulunamadı.', ogrenci: OGR },
  { kod: 'RAPORLAR_TARIH_ARALIGI_GECERSIZ', http: 400, ne: 'bitis baslangictan önce ya da istenen aralık kırpma aralığıyla hiç kesişmiyor (ayrıntı: neden TERS ya da DONEM_DISI).', hoca: 'Tarih aralığı geçersiz: bitiş başlangıçtan önce ya da aralık dönemin dışında.', ogrenci: OGR },
  { kod: 'RAPORLAR_ONAYSIZ_DERS_VAR', http: 409, ne: 'Dönem sonu penceresinde ya da kilitten sonra cevapsız "Ders yapıldı mı?" oturumu var; ayrıntı oturum kimlikleri, ders günleri ve başlangıç saatleri.', hoca: '"Ders yapıldı mı?" sorusu cevaplanmamış oturum var; önce o oturumları cevaplayın.', ogrenci: OGR },
  { kod: 'RAPORLAR_OZET_DEGISTI', http: 409, ne: 'Gönderilen ozetOzeti sunucunun şimdi hesapladığıyla tutmuyor; ayrıntıda güncel ozetOzeti, panel özeti yeniler.', hoca: 'Özet siz bakarken değişti; yenilenen özeti kontrol edip yeniden deneyin.', ogrenci: OGR },
  { kod: 'RAPORLAR_KIMLIK_CAKISMASI', http: 409, ne: 'Aynı ciktiKimligi daha önce başka şube, başka özet ya da başka tur ile kullanılmış (D13-B12 kalıbı).', hoca: 'Bu çıktı isteği başka bir özetle zaten kaydedilmiş; sayfayı yenileyip yeniden deneyin.', ogrenci: OGR },
  { kod: 'RAPORLAR_DONEM_KILITLI_DEGIL', http: 409, ne: 'Dönem sonu raporu birim ve dönemin kilidi uygulanmadan istendi.', hoca: 'Dönem sonu raporu kilitten sonra açılır.', ogrenci: OGR },
];

// ---------------------------------------------------------------- cell codes
{
  const K = S.cell_codes;
  const set = (kod, fields) => Object.assign(byKey(K, 'kod', kod), fields);
  set('VAR', { ne: 'Sayılan kayıt ya da onay bekleyen Kendi beyanı (D08 son durumu VAR); harf D09.SON_DURUMLAR\'dan' });
  set('YOK', { ne: 'Kayıt yok ya da sayılmadı; Md.9/4 geç kayıtta eklenmeden önceki oturum da Y; harf D09.SON_DURUMLAR\'dan' });
  set('GOREVLI', { ne: 'Görevli düzeltmesi; harf D09.SON_DURUMLAR\'dan' });
  set('BELGELI_DUZELTME', { ne: 'Belgeli düzeltme; harf D09.SON_DURUMLAR\'dan' });
  set('ELLE_EKLENDI', { ne: 'Elle ekleme ya da beyana dayalı düzeltme; harf D09.SON_DURUMLAR\'dan' });
  set('MUAF', { ne: 'Devamdan muaf öğrencinin D08 son durumu MUAF; M harfi harfler.ts\'te (ders düzeyi, D09 kataloğunda yok); saatler bilgi olarak D08 değeriyle kalır' });
  set('KARAR_ACIK', { ne: 'D08 satırında acik_saat > 0 (kayıt Beklemede ya da İncelemede); son durum dolu olsa da bu kod önce gelir (karışık hücre: ör. 2 saat Elle eklendi, 1 saat İncelemede); dört saat D08 satırından' });
  set('KAPSAM_DISI', { ne: 'D08 satırı yok ve oturum yapıldı: öğrenci o oturumda kapsamda değil (eklenmeden önce ekle-bırakta, listeden çıktıktan sonra ya da hücre aynı numaranın başka satırına yazıldı, D10-B31). Listedeki öğrencide D08 işi çalışana kadar da böyle görünür: kayıt ve kafa sayısından sonra dakikalarca (YAPILDI 5, OTURUM_KAPANDI 15 dakika), cevaptaki hucreHesapAni bunu gösterir; saatler 0' });
}

// ---------------------------------------------------------------- provisional reasons
{
  const P = S.provisional_reasons;
  const set = (kod, fields) => Object.assign(byKey(P, 'kod', kod), fields);
  set('ONAY_BEKLEYEN_KENDI_BEYANI', { ne: 'Kapsamda onay bekleyen Kendi beyanı var (özette D08 satırının gecici bayrağı, raporda oturum_son_durumlari.gecici)', kilit: 'ölür: kilitte sayılmış haliyle kilitlenir (D07)' });
  set('KARARI_ACIK_KAYIT', { ne: 'Kapsamda Beklemede ya da İncelemede kayıt var (özette bir türde acikSaat > 0, raporda acik_saat > 0)', kilit: 'ölür: kararlar kilitte donar (D07)' });
  set('KARAR_BEKLIYOR_OGRENCI', { ne: 'Özette KARAR BEKLİYOR öğrenci var (yalnız AKSİS özeti; D08 kararBekliyor)', kilit: 'yaşar (plan.html#devam-donem-sonu, D10-C04)' });
  set('KAFA_SAYISI_ISARETI', { ne: "Kapsamda tur = 'KAFA_SAYISI_ASIMI' AND gecerli AND NOT derste AND incelendi_ani IS NULL işaretli oturum var (derste çıkan işaret toplu incelemeye girmediğinden sayılmaz; yüklem D07 ile teyit edilir)", kilit: 'ölür: kilitten sonra karar değişmez (D07)' });
  set('GONDERME_SURESI_SURUYOR', { ne: 'Kapsamda gönderme süresi bitmemiş oturum var (D06.gondermeSuresiSonu); AKSİS özetinde yalnız cikti.durum DONEM_ICI iken sayılır (D10-A03); takvimsiz birimde hesaplanmaz', kilit: 'ölür: süre en geç kilit anında biter' });
  set('CEVAPSIZ_OTURUM', { ne: 'Kapsamda "Ders yapıldı mı?" cevapsız oturum var (özette D08 cevapsizOturumSayisi)', kilit: 'yaşar: D02 cevabı kilitten sonra da kabul eder (D10-A05)' });
}

const txt = JSON.stringify(S, null, 2) + '\n';
if (/[–—]/.test(txt)) throw new Error('dash in output');
fs.writeFileSync(OUT, txt, 'utf8');
console.log('wrote', OUT, 'tests', S.tests.length, 'gaps', S.resolved_gaps.length, 'open', S.open_points.length, 'files', S.files.length, 'codes', S.error_codes.length);

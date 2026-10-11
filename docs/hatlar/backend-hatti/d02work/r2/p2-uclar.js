// D02 spec, part 2: endpoints (exactly the 31 owned by D02 in contracts.json).
const RL = "hiz 'oturum' (D13 hizSinifi: oturum başına dakikada 120).";
const RL_AGIR = "hiz 'agir' (D13 hizSinifi: oturum başına dakikada 20): dönem boyu plan ya da çok dersli sorgu çalıştırır.";
const RL_GIRISSIZ = "hiz 'girissiz' (D13 hizSinifi: IP başına dakikada 3000). Cevap öbür API cevapları gibi Cache-Control: no-store taşır (teknik.html#sunucu-guvenlik); D02 önbellek başlığı koymaz.";
const HOCA = "Oturum (panel çerezi ya da Bearer), rol hoca: rol rota düzeyinde denetlenir, uymazsa 403 API_ROL_YETKISIZ (D13). Dersin hocası olmalı (dersYetkisi(tx, kimlik, dersId) = 'hoca'; yazan uçta ders satırı FOR UPDATE ile kilitlendikten sonra dersin hocası yeniden denetlenir, devirle yarışan yazım eski hocayla işlenmez). Dersin hocası değilse 404 DERSLER_BULUNAMADI: başka hocanın dersinin varlığı sızmaz (D13 ortak kuralı, plan.html#baslangic yetki senaryosu). İnceleme hesabı (kimlik.incelemeHesabi; D13'ün ortak Kimlik tipi, D01 çağrısı gerekmez) deneme dersi dışındaki hiçbir dersi okuyamaz: okuma uçlarında da 404.";
const INCELEME = ' İnceleme hesabı (kimlik.incelemeHesabi true) deneme dersi dışındaki hiçbir hedefe yazamaz: 403 DERSLER_INCELEME_HESABI (ilke düzeyi red, D13-B02; plan.html#kararlar-inceleme-hesaplari); hedef deneme dersiyse olağan kural DERSLER_DENEME_DERSI_DEGISTIRILEMEZ verir.';
const HOCA_YAZ = HOCA + INCELEME;
const HOCA_OTURUM = "Oturum, rol hoca (rota düzeyi; uymazsa 403 API_ROL_YETKISIZ); oturumun dersinin hocası olmalı (dersYetkisi = 'hoca'; yazan uçta dersin hocası, ders satırı kilitlendikten sonra yeniden denetlenir). Değilse 404 DERSLER_BULUNAMADI.";
const HOCA_OTURUM_YAZ = HOCA_OTURUM + INCELEME;
const YON = (kapsam) => "Oturum, rol yonetici: rol rota düzeyinde denetlenir, uymazsa 403 API_ROL_YETKISIZ (D13). Birim kapsamı modül içinde D01.yetkiDenetle(kimlik, 'yonetici', kapsam) ile kimlik.roller'dan okunur (kapsamBirimId null: bütün birimler; ilk sürümde her yönetici genel, D02-A06); kapsam dışı hedef 404 DERSLER_BULUNAMADI (varlık sızmaz). Kapsam: " + kapsam;
const OLUSTUR_HOCA = (ad, durum = "yeni kayıt da tekrar da 200 döner (D13-B12)") => "Gövdedeki id (istemcinin ürettiği UUIDv7) tekrar anahtarıdır; " + durum + ". Hedefli ON CONFLICT (id) DO NOTHING; çakışmada var olan satır okunur: dersi isteyen hocanın değilse içeriğe bakılmadan 404 DERSLER_BULUNAMADI (başka hocanın kimliği varlık sızdırmaz); isteyenin ve içerik aynıysa 200 ile var olan " + ad + "; içerik farklıysa 409 DERSLER_KIMLIK_CAKISMASI.";
const OLUSTUR_YON = (ad) => `Gövdedeki id tekrar anahtarıdır; yeni kayıt da tekrar da 200 döner (D13-B12). Hedefli ON CONFLICT (id) DO NOTHING; çakışmada var olan satır kapsam dışıysa 404 DERSLER_BULUNAMADI, aynı içerikse 200 ile var olan ${ad}, farklı içerikse 409 DERSLER_KIMLIK_CAKISMASI.`;
const GET = 'Yan etkisiz okuma; aynı an ve aynı veriyle aynı cevap.';

const DersOzeti = 'DersOzeti { id, donemId, birimId: uuid|null, bolumId: uuid|null, kod, ad, teoriP: int, uygulamaP: int, yoklamaSuresiDk: int|null, qrIleYoklama: bool, denemeDersi: bool, takipBaslangici: tarih|null, durum: etkin|arsiv (arsiv_ani sütunundan türer; x-extensible-enum), arsivNedeni: hoca|kilit|hoca_silindi|null, duzenlemeNo: int, subeler: [{ id, etiket, durum: etkin|pasif }], kilit: { sonGun: tarih|null, kilitAni: an|null, kilitli: bool } }';
const ProgramSaati = 'ProgramSaati { id, gun: 1-7, baslangicSaati: HH:MM, bitisSaati: HH:MM, teoriSaat: int, uygulamaSaat: int, derslik: metin|null, gecerlilikBaslangic: tarih|null, gecerlilikBitis: tarih|null, subeIdleri: uuid[] }';
const OturumPanel = 'OturumPanel { id, dersId, tur: normal|telafi|deneme, tarih, baslangicSaati, bitisSaati, baslangicAni: an, bitisAni: an, teoriSaat, uygulamaSaat, derslik: metin|null, yoklamaSuresiDk: int|null, qrIleYoklama: bool, durum: planlandi|iptal, iptalNedeni: metin|null, kisaKod: 10 rakamlık metin, subeIdleri: uuid[], elleDuzenlendi: bool, telafiEdilenOturumId: uuid|null, yapildi: { durum: cevapsiz|yapildi|yapilmadi|celiskili, kaynak: kafa_sayisi|hoca_cevabi|null, kafaSayisi: int|null } } (durum alanları x-extensible-enum; değerler sözleşmedeki OTURUM_TURLERI, OTURUM_DURUMLARI, IPTAL_NEDENLERI, YAPILDI_DURUMLARI sabitlerinden)';
const OturumEtkisi = 'OturumEtkisi { eklenen: int, guncellenen: int, iptal: int, geriAlinan: int }';
const programSaatleriIstek = 'ProgramSaati girdisi dizisi, 0 ile 20 öğe: { id: uuidv7 (var olan saat kendi kimliğiyle, yeni saat için istemci üretir: tekrarlanan istek aynı gövde olur; silinmiş saatin kimliği kullanılamaz), gun: 1-7, baslangicSaati: HH:MM, bitisSaati: HH:MM (başlangıçtan büyük, en geç 23:59), teoriSaat: 0-12, uygulamaSaat: 0-12 (toplam 1-12), derslik: metin 1-40 ya da null, gecerlilikBaslangic?: tarih, gecerlilikBitis?: tarih (dönem içinde, başlangıç <= bitiş), subeIdleri: uuidv7[] 1-20, dersin etkin şubeleri }. Örtüşme: aynı gün, [başlangıç, bitiş) saatleri kesişen ve geçerlilik aralıkları kesişen iki saat örtüşür; örtüşen iki saatin şube kümeleri ayrık olmalı (paralel lab saatleri), geçerlilikleri ayrık iki saat (dönem ortası saat değişikliği, D02-B14) şube paylaşabilir. Biçim ve tersine aralık şema düzeyinde 400 (D13), örtüşme DERSLER_PROGRAM_CAKISIYOR.';

const uclar = [
  {
    method: 'GET', path: '/v1/dersler', client: 'panel', auth: 'Oturum, rol hoca; yalnız hocası olduğu dersler döner. İnceleme hesabına (kimlik.incelemeHesabi) yalnız deneme dersi döner, başka bir dersin hocası olsa bile (plan.html#kararlar-inceleme-hesaplari).',
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı', durum: 'etkin|arsiv, sorgu, isteğe bağlı' },
    response: { dersler: `${DersOzeti}[]; kod sırasıyla, en çok 500` },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler', client: 'panel', auth: "Oturum, rol hoca (rota düzeyi; uymazsa 403 API_ROL_YETKISIZ, D13); açılan dersin hocası isteği yapan hocadır. İnceleme hesabı (kimlik.incelemeHesabi) ders açamaz: 403 DERSLER_INCELEME_HESABI (plan.html#kararlar-inceleme-hesaplari; mağaza konsolundaki inceleme hesabıyla gerçek birime sahte ders açılıp gerçek numaralara indirilmesin).",
    request: {
      id: 'uuidv7, istemci üretir (tekrar anahtarı)',
      donemId: 'uuidv7; inceleme dönemi olamaz',
      birimId: 'uuidv7; etkin birim; bu birim ve dönemin takvimi bağlı olmalı (D02-B25)',
      bolumId: 'uuidv7|null; birimin bölümü',
      kod: 'metin 1-20; NFC, boşluk sadeleşir, Türkçe büyük harfe çevrilir; hocanın bu dönemdeki etkin dersleri arasında tekil',
      ad: 'metin 1-120; NFC, boşluk sadeleşir',
      yoklamaSuresiDk: 'tam sayı 1-240 ya da null (süre seçilmedi: Kendi beyanı)',
      subeler: 'dizi 1-20: { id: uuidv7, etiket: metin 1-20 }, etiketler tekil',
    },
    response: { ders: `${DersOzeti}; yeni derste 201, aynı kimlik ve içerikle tekrarda 200 (rota beyanı durumlar [201, 200], D13; I071)` },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_BIRIM_PASIF', 'DERSLER_TAKVIM_YOK', 'DERSLER_DONEM_KILITLI', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_HOCA('ders', "yeni ders 201, aynı kimlik ve içerikle tekrar 200 döner (rota beyanı durumlar [201, 200], D13)") + " Açılışta hoca_atama_gecmisi tek açık öğeyle ({ hoca, açılış anı, null }) yazılır ve kapsam_degisim_surumu işlemin sürümüdür (personel kapsamı değişti).", rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}', client: 'panel', auth: HOCA + ' İnceleme hesabı yalnız deneme dersini okur.',
    request: { dersId: 'uuidv7, yol' },
    response: {
      ders: DersOzeti,
      programSaatleri: `${ProgramSaati}[] (silinmemiş)`,
      takvim: '{ takvimId, ad, dersBaslangic, dersBitis, ekleBirakBitis, sonGun, sonHaftaBaslangici: tarih } | null (deneme dersinde null)',
      sayilar: '{ planlanan: int, yapilan: int, yapilmayan: int, cevapsiz: int, iptal: int } (deneme dersi hariç dönem toplamı)',
    },
    errors: ['DERSLER_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/{dersId}', client: 'panel', auth: HOCA_YAZ,
    request: {
      beklenenSurumNo: "tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); ders.duzenlemeNo ile aynı olmalı (gövde istenen değerlerle zaten aynıysa bakılmaz)",
      kod: 'metin 1-20, isteğe bağlı (denetim kaydında dersKodu)',
      ad: 'metin 1-120, isteğe bağlı (denetim kaydında dersAdi)',
      birimId: 'uuidv7, isteğe bağlı; yeni birim ve dönemin takvimi bağlı olmalı; aynı işlemde başlamamış oturumlar yeni takvimle yeniden üretilir, yeni birim ve dönemin birim_donemleri satırı bu işlemin sürümünü alır (kilit satırı ve yeni takvimin tatilleri artımlı iner) ve dersin kapsam_degisim_surumu yazılır',
      bolumId: 'uuidv7|null, isteğe bağlı',
      yoklamaSuresiDk: 'tam sayı 1-240 ya da null, isteğe bağlı; başlamamış ve yoklama_suresi_elle olmayan oturumlara kopyalanır, D04 dinleyicisi neden sure ile pencereleri yeniden hesaplar',
      qrIleYoklama: 'bool, isteğe bağlı; başlamamış oturumlara kopyalanır; true yalnız QR ayarı bayrağı açıkken (D02-A10)',
    },
    response: { ders: DersOzeti, oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_BIRIM_PASIF', 'DERSLER_TAKVIM_YOK', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_QR_AYARI_KAPALI'],
    idempotency: 'İstenen değerler zaten kayıtlıysa 200 ve değişiklik yok (numaraya bakılmaz, denetim kaydı ve sürüm yazılmaz); farklıysa beklenen numara tutmalı, tutmazsa 409 ve cevapta güncel ders. Birim ya da süre değişince D08 işi neden PROGRAM.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/arsivle', client: 'panel', auth: HOCA_YAZ,
    request: { dersId: 'uuidv7, yol; gövde boş' },
    response: { ders: DersOzeti, iptalEdilenOturum: 'int (gelecekteki planlı oturumlar iptal, neden arsiv)', etkinListeSatiri: "int (liste kaynağının kilitten sonra verdiği etkin liste satırı sayısı: telefonundan ders kalkacak öğrenci; denetim ayrıntısına da yazılır)" },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_DERS_BASLAMIS', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: "Arşivdeki derse 200 ve değişiklik yok. Arşiv tek işlemde: önce ders satırı, sonra dersin şube satırları kimlik sırasıyla FOR UPDATE ile kilitlenir, liste kaynağı (etkinSatirlar) kilitten sonra sorulur (D03 liste yazmadan önce aynı satırları dersGetir ve subeGetir(..., { kilitle: 'paylasimli' }) ile FOR SHARE alır, arşivdeki derse yeni etkin satır yazılamaz; I011); kapsam_degisim_surumu yazılır (hocanın telefonu baştan indirir, öğrenciye ders satırı silindi olarak iner) ve D08 işi neden PROGRAM.", rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/subeler', client: 'panel', auth: HOCA_YAZ,
    request: { id: 'uuidv7, tekrar anahtarı', etiket: 'metin 1-20, derste tekil', programaKat: 'bool, varsayılan true: şube aynı gün örtüşen başka saati olmayan program saatlerine ve onların başlamamış normal oturumlarına eklenir; paralel saatler (aynı gün örtüşen saat grubu, ör. iki şubenin aynı saatteki labı) atlanır, çünkü eklemek şube kümelerinin ayrıklığını bozar ve şubenin öğrencisine eşzamanlı iki oturum açar; sonuç program aynı saf doğrulamadan geçer' },
    response: { sube: '{ id, etiket, durum }', oturumEtkisi: OturumEtkisi, atlananProgramSaatleri: 'uuid[] (paralel olduğu için şubenin eklenmediği saatler; hoca bunlara program PUT ile ekler)' },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_SUBE_ETIKETI_KULLANIMDA', 'DERSLER_SUBE_SINIRI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_HOCA('şube') + ' Programa katılan şube D08 işini neden PROGRAM ile koyar.', rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/{dersId}/subeler/{subeId}', client: 'panel', auth: HOCA_YAZ,
    request: { etiket: 'metin 1-20, isteğe bağlı', durum: "etkin|pasif, isteğe bağlı; pasif yalnız şubede etkin liste satırı yokken ve dersin başka etkin şubesi varken: önce ders, sonra şube satırı FOR UPDATE ile kilitlenir, liste kaynağı (etkinSatirlar) kilitten sonra sorulur (D03 satır yazmadan önce ders ve şubeyi aynı sırayla dersGetir ve subeGetir(..., { kilitle: 'paylasimli' }) ile FOR SHARE alır; I010, I011); pasif şube başlamamış oturumlardan ve program saatlerinden çıkar, yalnız bu şubeye hizmet eden program saati aynı işlemde silinir (silinme_ani, değişiklik geçmişi ve sürümle), şubesiz kalan başlamamış oturum iptal (program)" },
    response: { sube: '{ id, etiket, durum }', oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_SUBE_ETIKETI_KULLANIMDA', 'DERSLER_SUBEDE_OGRENCI_VAR', 'DERSLER_SON_ETKIN_SUBE', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Aynı değerler 200 ve değişiklik yok. Etiket değişince ders satırı sürüm alır (şube dizisi ders satırıyla iner). Pasifleştirme D08 işini neden PROGRAM ile koyar.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/program', client: 'panel', auth: HOCA,
    request: { dersId: 'uuidv7, yol' },
    response: { duzenlemeNo: 'int', programSaatleri: `${ProgramSaati}[] (silinmemiş, gün ve saat sırasıyla)` },
    errors: ['DERSLER_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/program/onizleme', client: 'panel', auth: HOCA,
    request: { programSaatleri: programSaatleriIstek },
    response: {
      eklenecek: 'int', guncellenecek: '[{ oturumId, tarih, alanlar: metin[] }]', iptalEdilecek: '[{ oturumId, tarih, baslangicSaati, neden }]', geriAlinacak: '[{ oturumId, tarih }]',
      donemToplami: '{ planlanan: int, teoriSaat: int, uygulamaSaat: int } (yazılırsa oluşacak planlı oturumlar)',
      uyarilar: 'metin[] (x-extensible-enum): BASLAMIS_OTURUMLAR_DEGISMEZ, BUGUNKU_OTURUM_KORUNDU (yeni başlangıcı şimdiye eşit ya da geçmişte kalacak bugünkü oturum değişmez), TATIL_GUNLERI_ATLANDI, SINAV_HAFTASI_ATLANDI',
    },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_TAKVIM_YOK', 'DERSLER_PROGRAM_GECERSIZ', 'DERSLER_PROGRAM_CAKISIYOR', 'DERSLER_PROGRAM_COK_BUYUK', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Hiçbir şey yazmaz; PUT ile aynı saf plan fonksiyonunu aynı girdi ve aynı anla çalıştırır: aynı an ve aynı gövdeyle önizleme ile PUT\'un yazdığı fark birebir aynıdır (davranış testi).', rate_limit: RL_AGIR,
  },
  {
    method: 'PUT', path: '/v1/dersler/{dersId}/program', client: 'panel', auth: HOCA_YAZ,
    request: { beklenenSurumNo: "tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); dersin duzenlemeNo değeri", programSaatleri: programSaatleriIstek },
    response: { duzenlemeNo: 'int', programSaatleri: `${ProgramSaati}[]`, oturumEtkisi: OturumEtkisi, uyarilar: 'metin[] (önizlemedekiyle aynı değerler)' },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_TAKVIM_YOK', 'DERSLER_PROGRAM_GECERSIZ', 'DERSLER_PROGRAM_CAKISIYOR', 'DERSLER_PROGRAM_COK_BUYUK', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Gövde kayıtlı programla aynıysa (id ve alanlar) 200, numara artmaz, oturum ve sürüm değişmez. Farklıysa beklenen numara tutmalı, tutmazsa 409 ve cevapta güncel program. Yazım tek işlemde ve şu sırayla: program saatleri, oturum üretimi ve değişiklik geçmişi, üretim dinleyicileri (D04), denetim, D08 işi (neden PROGRAM), en son sürüm.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/oturumlar', client: 'panel', auth: HOCA,
    request: { baslangic: 'tarih, sorgu, isteğe bağlı (varsayılan dönemin ders başlangıcı)', bitis: 'tarih, sorgu, isteğe bağlı (varsayılan son gün); aralık en çok 200 gün', durum: 'planlandi|iptal, isteğe bağlı', subeId: 'uuidv7, isteğe bağlı' },
    response: { oturumlar: `${OturumPanel}[]; başlangıç anı sırasıyla, en çok 1000` },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_ARALIK_COK_GENIS'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/telafi', client: 'panel', auth: HOCA_YAZ,
    request: {
      id: 'uuidv7, tekrar anahtarı (oturum kimliği olur)',
      tarih: 'tarih; dönemin ders başlangıcı ile birimin son günü arasında',
      baslangicSaati: 'HH:MM', bitisSaati: 'HH:MM (başlangıçtan büyük, en geç 23:59)',
      teoriSaat: '0-12', uygulamaSaat: '0-12 (toplam 1-12)',
      derslik: 'metin 1-40 ya da null',
      subeIdleri: 'uuidv7[] 1-20, isteğe bağlı; varsayılan dersin bütün etkin şubeleri',
      yoklamaSuresiDk: 'tam sayı 1-240 ya da null, isteğe bağlı; verilirse oturumda yoklama_suresi_elle true olur ve ders ayarı değişince bu süre değişmez; verilmezse ders ayarı',
      telafiEdilenOturumId: 'uuidv7, isteğe bağlı; aynı dersin oturumu (telafi borcu bağı)',
      eskisiniIptalEt: 'bool, varsayılan false; true ise telafiEdilenOturumId zorunlu, o oturum başlamamış ve planlı olmalı (zaten iptalse 409 DERSLER_OTURUM_IPTAL): aynı işlemde iptal (tasindi) olur (taşıma); çakışma denetiminde iptal edilecek eski oturum sayılmaz',
    },
    response: { oturum: OturumPanel, iptalEdilen: 'OturumPanel|null (taşımada eski oturum)', uyarilar: 'metin[] (x-extensible-enum): AYNI_GUN (yalnız programı internetteyken indiren telefonlarda açılır), GECMIS (hiçbir telefon bilemez, kaydı olmayanları listeden işaretleyin), TATIL_GUNU, SINAV_HAFTASI' },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_TARIH_DONEM_DISI', 'DERSLER_TELAFI_SINIRI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_OTURUM_IPTAL', 'DERSLER_OTURUM_CAKISIYOR', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_HOCA('telafi oturumu') + ' eskisiniIptalEt true iken telafiEdilenOturumId yoksa istek şema düzeyinde 400 alır (Zod refine). Telafi sınırı dönemde derste planlı (iptal edilmemiş) telafi sayısıdır (30). D08 işi neden PROGRAM.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/cakismalar', client: 'panel', auth: HOCA,
    request: { baslangic: 'tarih, sorgu, isteğe bağlı (varsayılan bugün, İstanbul)', bitis: 'tarih, sorgu, isteğe bağlı (varsayılan dönemin ders bitişi); aralık en çok 200 gün' },
    response: {
      cakismalar: '[{ satirId: uuid (bu dersin liste satırı; numara ve isim dönmez, panel D03 listesinden eşler), subeId, oturumId, tarih, baslangicSaati, bitisSaati, digerDers: { kod, ad }, digerOturum: { tarih, baslangicSaati, bitisSaati } }]; en çok 2000 öğe, aşılırsa 422 API_SONUC_COK_BUYUK (D13 kodu, D13-B13; kesik liste dönmez, aralık daraltılır)',
      ogrenciSayisi: 'int (çakışması olan farklı öğrenci)',
    },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_ARALIK_COK_GENIS'], idempotency: GET, rate_limit: RL_AGIR,
  },
  {
    method: 'PATCH', path: '/v1/dersler/oturumlar/{oturumId}', client: 'panel', auth: HOCA_OTURUM_YAZ,
    request: {
      baslangicSaati: 'HH:MM, isteğe bağlı (aynı gün)', bitisSaati: 'HH:MM, isteğe bağlı', derslik: 'metin 1-40 ya da null, isteğe bağlı',
      teoriSaat: '0-12, isteğe bağlı', uygulamaSaat: '0-12, isteğe bağlı (toplam 1-12)',
      iptaliGeriAl: 'true, isteğe bağlı; yalnız hoca nedeniyle iptal edilmiş, başlamamış oturumda; öteki alanlarla birlikte gelemez',
    },
    response: { oturum: OturumPanel },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_OTURUM_IPTAL', 'DERSLER_IPTAL_GERI_ALINAMAZ', 'DERSLER_OTURUM_CAKISIYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'İstenen değerler zaten kayıtlıysa 200 ve değişiklik yok. Oturum başlamışsa ya da yeni başlangıç anı saat arayüzünün anına eşit ya da ondan önceyse 409 DERSLER_OTURUM_BASLAMIS (bitmiş ve penceresiz oturum yaratılmaz, I4). Değişiklik: önceki değerler oturum_degisiklikleri satırına, oturum elle_duzenlendi olur, D04 dinleyicisi pencereyi yeniden hesaplar; saat sayısı değişirse D08 işi neden PROGRAM.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/{oturumId}/iptal', client: 'panel', auth: HOCA_OTURUM_YAZ,
    request: { oturumId: 'uuidv7, yol; gövde boş (neden her zaman hoca)' },
    response: { oturum: OturumPanel },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Hoca, tasindi ya da arsiv nedeniyle zaten iptal oturuma 200 ve değişiklik yok. Sistem nedeniyle (tatil, sinav_haftasi, takvim, program) iptal edilmiş başlamamış oturuma hoca iptali 200 döner ve iptal_nedeni hoca olur (oturum_degisiklikleri satırı, sürüm, denetim): tatil sonra kalksa da oturum geri gelmez. Planlı oturumun iptalinde D08 işi neden PROGRAM. Oturum silinmez; kimliği geçerli kalır, eski programla gelen kaydın kararı D07\'nindir.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/oturumlar/onaysiz', client: 'panel', auth: 'Oturum, rol hoca; yalnız hocası olduğu derslerin oturumları. Hoca telefonu da internetliyken aynı ucu çağırır.',
    request: { dersId: 'uuidv7, sorgu, isteğe bağlı' },
    response: {
      oturumlar: "[{ oturumId, dersId, dersKodu, dersAdi, tarih, baslangicSaati, bitisSaati, teoriSaat, uygulamaSaat, durum: planlandi|iptal, celiskili: bool, kafaSayisi: int|null }]; tarih sırasıyla. Kapsam: bitmiş (bitis_ani <= şimdi), planlı ve cevapsız oturumlar ile kafa sayısı çelişkisi olan (iptal dahil) oturumlar; deneme dersi hariç",
      toplam: 'int',
    },
    errors: ['DERSLER_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/{oturumId}/yapildi-mi', client: 'panel', auth: HOCA_OTURUM_YAZ + ' Hoca telefonu da internetliyken çağırır.',
    request: { yapildi: 'bool' },
    response: { oturum: '{ oturumId, durum: planlandi|iptal, yapildi: { durum, kaynak, kafaSayisi } }' },
    errors: ['DERSLER_INCELEME_HESABI', 'DERSLER_BULUNAMADI', 'DERSLER_OTURUM_BASLAMADI', 'DERSLER_OTURUM_IPTAL', 'DERSLER_DONEM_KILITLI', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Aynı cevap zaten kayıtlıysa ve çelişki yoksa 200, denetim kaydı ikinci kez yazılmaz. Kilitli dönemde yalnız cevapsız ya da çelişkili oturuma yazılır. Çelişkisiz iptal oturuma 409 DERSLER_OTURUM_IPTAL. İptal ve çelişkili oturumda: "yapılmadı" çelişkiyi kapatır, durum iptal ve yapildi boş kalır, cevap oturum_degisiklikleri\'ne yapildi_cevabi nedeniyle yazılır (sürüm yok); "yapıldı" oturumu planlıya döndürür, iptal alanları boşalır, yapildi true olur, oturum sürüm alır ve üretim dinleyicileri neden iptal_geri ile çağrılır. Değişen cevap aynı işlemde D08.devamHesaplaIsiKoy(tx, dersId, null, DEVAM_NEDENLERI.YAPILDI) koyar (D08 ders geneli YAPILDI işini 5 dakika geciktirir).', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/yapildi-mi', client: 'panel', auth: 'Oturum, rol hoca; her öğe ayrı denetlenir (dersinin hocası olmadığı oturum bulunamadi sonucu alır). İnceleme hesabının isteği bütünüyle 403 DERSLER_INCELEME_HESABI.',
    request: { oturumIdleri: 'uuidv7[] 1-200, tekil', yapildi: 'bool (hepsine tek cevap)' },
    response: { sonuclar: '[{ oturumId, sonuc: yazildi|degismedi|bulunamadi|baslamadi|iptal|kilitli (x-extensible-enum) }]; istekteki sırayla' },
    errors: ['DERSLER_INCELEME_HESABI'], idempotency: 'Öğe düzeyinde: aynı cevap degismedi döner, ikinci denetim kaydı yazılmaz; öğe kuralları tek uçtakiyle aynı (iptal ve çelişkili dal dahil). Bütün öğeler tek işlemde: önce öğelerin ders satırları dersId sırasıyla FOR UPDATE ile kilitlenir (ters sıralı iki toplu istek kilitlenme döngüsü kurmaz), dersin hocası kilitten sonra denetlenir; gövde bozuksa yalnız genel 400. Ders başına tek D08 işi, neden YAPILDI.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/birimler', client: 'telefon', auth: 'Girişsiz (hoca başvuru formu, uygulamada ve panelde; D01-B50).',
    request: {},
    response: { birimler: '[{ id, ad, tur (x-extensible-enum), bolumler: [{ id, ad }] }]; yalnız etkin (pasif_ani boş) birim ve bölümler, ad sırasıyla (COLLATE tr-TR-x-icu)' },
    errors: [], idempotency: GET, rate_limit: RL_GIRISSIZ,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/birimler', client: 'panel', auth: YON('her yönetici; birim kapsamlı yönetici yalnız kendi birimini görür.'),
    request: {},
    response: { birimler: '[{ id, ad, tur, etkin, bolumler: [{ id, ad, etkin }] }]; pasifler dahil' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/birimler', client: 'panel', auth: YON('yalnız genel yönetici.'),
    request: { id: 'uuidv7, tekrar anahtarı', ad: 'metin 1-120, tekil', tur: 'fakulte|enstitu|yuksekokul|meslek_yuksekokulu|konservatuvar' },
    response: { birim: '{ id, ad, tur, etkin, bolumler: [] }' },
    errors: ['DERSLER_BIRIM_ADI_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_YON('birim'), rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/yonetim/birimler/{birimId}', client: 'panel', auth: YON('birimi kapsayan yönetici; ad, tür ve etkin alanlarını yalnız genel yönetici değiştirir.'),
    request: { ad: 'metin 1-120, isteğe bağlı', tur: 'isteğe bağlı', etkin: 'bool, isteğe bağlı (pasif_ani yazılır ya da boşalır; pasif birim yeni ders ve başvuruda görünmez, var olan dersler sürer)', bolumler: 'isteğe bağlı dizi 1-200: { id: uuidv7 (birimin bölümü), ad?: metin 1-120, etkin?: bool } (bölüm adı ve etkinliği; her değişen bölüm ayrı dersler.bolum_degisti denetim olayı yazar)' },
    response: { birim: '{ id, ad, tur, etkin, bolumler: [{ id, ad, etkin }] }' },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_BIRIM_ADI_KULLANIMDA', 'DERSLER_BOLUM_ADI_KULLANIMDA'],
    idempotency: 'Aynı değerler 200 ve değişiklik yok.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/birimler/{birimId}/bolumler', client: 'panel', auth: YON('birimi kapsayan yönetici.'),
    request: { id: 'uuidv7, tekrar anahtarı', ad: 'metin 1-120, birimde tekil' },
    response: { bolum: '{ id, birimId, ad, etkin }' },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_BOLUM_ADI_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_YON('bölüm'), rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/donemler', client: 'panel', auth: YON('her yönetici (takvim bilgisi kapsamdan bağımsız); birimler dizisi kapsama göre süzülür.'),
    request: {},
    response: { donemler: '[{ id, akademikYil, yariyil (x-extensible-enum), takvimler: [{ id, ad, dersBaslangic, dersBitis, ekleBirakBitis, devamsizlikSonGun, surumNo, tatiller: [{ id, ad, baslangicTarihi, bitisTarihi, yarimGunBaslangic }], sinavHaftalari: [{ id, tur, baslangicTarihi, bitisTarihi, dersYapilir }] }], birimler: [{ birimId, takvimId, kilitAni, kilitli }] }]; yeniden eskiye, inceleme dönemi hariç' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/donemler', client: 'panel', auth: YON('yalnız genel yönetici.'),
    request: { id: 'uuidv7, tekrar anahtarı', akademikYil: 'YYYY-YYYY, ikinci yıl birincinin bir fazlası', yariyil: 'guz|bahar|yaz' },
    response: { donem: '{ id, akademikYil, yariyil }' },
    errors: ['DERSLER_DONEM_VAR', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_YON('dönem') + " Yeni dönem açan işlemde D12.donemBolumuAc(tx, donemId) çağrılır (tablo bölünmemişse işlem yapmaz; tekrar isteğinde çağrılmaz; I063).", rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/takvimler', client: 'panel', auth: YON('yalnız genel yönetici (bağsız takvim, D02-A06).'),
    request: {
      id: 'uuidv7, tekrar anahtarı', donemId: 'uuidv7; inceleme dönemi olamaz', ad: 'metin 1-120, dönemde tekil',
      dersBaslangic: 'tarih', dersBitis: 'tarih (> dersBaslangic)', ekleBirakBitis: 'tarih (<= dersBitis)', devamsizlikSonGun: 'tarih (>= dersBitis)',
      tatiller: 'dizi 0-60: { id: uuidv7, ad: metin 1-120, baslangicTarihi, bitisTarihi (>= başlangıç), yarimGunBaslangic: HH:MM|null }',
      sinavHaftalari: 'dizi 0-10: { id: uuidv7, tur: ara|final|butunleme, baslangicTarihi, bitisTarihi, dersYapilir: bool (varsayılan false, D02-A01) }',
    },
    response: { takvim: '{ id, donemId, ad, dersBaslangic, dersBitis, ekleBirakBitis, devamsizlikSonGun, surumNo, tatiller, sinavHaftalari }' },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_TAKVIM_ADI_KULLANIMDA', 'DERSLER_TAKVIM_TARIHLERI_GECERSIZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR_YON('takvim') + ' Takvim birime bağlanana kadar hiçbir oturumu etkilemez.', rate_limit: RL,
  },
  {
    method: 'PUT', path: '/v1/dersler/yonetim/takvimler/{takvimId}', client: 'panel', auth: YON('takvime bağlı her birimi kapsayan yönetici; bağsız takvimde genel yönetici.'),
    request: {
      beklenenSurumNo: "tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); takvimin surumNo değeri", ad: 'metin 1-120',
      dersBaslangic: 'tarih', dersBitis: 'tarih', ekleBirakBitis: 'tarih', devamsizlikSonGun: 'tarih',
      tatiller: 'dizi 0-60: { id: uuidv7 (var olan kendi kimliğiyle, yeni tatil için istemci üretir), ad, baslangicTarihi, bitisTarihi, yarimGunBaslangic: HH:MM|null }; listede olmayan var olan tatil silinme_ani alır',
      sinavHaftalari: 'dizi 0-10: { id: uuidv7 (yeni için istemci üretir), tur, baslangicTarihi, bitisTarihi, dersYapilir: bool }',
      hemenKilitle: 'bool, varsayılan false; yeni son gün bağlı bir birimi şimdi kilitleyecekse true olmalı',
      sonGunGerekcesi: 'birim_karari|yanlis_giris, isteğe bağlı; kilit anı geçmiş bir birimin son günü ileri alınırken zorunlu (D02-A05)',
    },
    response: { takvim: 'POST cevabıyla aynı', etkilenenBirimDonemi: 'int', yenidenAcilanDers: 'int (kilitten dönüşte etkin olan ders)', yenidenUretim: 'bool (takvim_oturumlarini_yenile işi aynı işlemde kuyruğa kondu mu)' },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_TAKVIM_TARIHLERI_GECERSIZ', 'DERSLER_KILIT_HEMEN_OLUR', 'DERSLER_SON_GUN_GERI_ALINAMAZ', 'DERSLER_GEREKCE_GEREKLI', 'DERSLER_TAKVIM_ADI_KULLANIMDA'],
    idempotency: 'Gövde kayıtlı takvimle aynıysa 200, numara artmaz, iş konmaz. Değişiklikte aynı işlemde ve kilit sırasıyla (takvimler FOR UPDATE, bağlı birim_donemleri birimId sırasıyla, kilitten dönen dersler dersId sırasıyla): takvim satırları, bağlı birim_donemleri.kilit_ani ve sürümü, değişen her tatil için dersler.tatil_degisti ve takvim için dersler.takvim_degisti denetimi, D14.isGonder(tx, takvim_oturumlarini_yenile, { takvimId }). Kilit anı geçmiş birimde son gün ileri alınınca (gerekçeyle) kilit_uygulandi_ani boşalır, arsiv_nedeni kilit olan dersleri aynı işlemde etkin olur (sürüm, kapsam_degisim_surumu, dersler.ders_yeniden_acildi); donem_kilidi işi yeni kilit anında onları yeniden arşivler. Aynı takvime bağlı birimlerin hepsi birlikte uzar; tek birimi uzatmak bağ PUT\'unun uzatma yoludur.', rate_limit: RL,
  },
  {
    method: 'PUT', path: '/v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}', client: 'panel', auth: YON('birimi kapsayan yönetici.'),
    request: { takvimId: 'uuidv7; aynı dönemin takvimi', hemenKilitle: 'bool, varsayılan false; bağlanan takvimin son günü geçmişse true olmalı', sonGunGerekcesi: 'birim_karari|yanlis_giris, isteğe bağlı; kilitli birim ve dönemin uzatma yoluyla başka takvime bağlanmasında zorunlu' },
    response: { birimDonemi: '{ birimId, donemId, takvimId, sonGun, kilitAni, kilitli }', yenidenAcilanDers: 'int', yenidenUretim: 'bool' },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_TAKVIM_DONEMI_UYUSMUYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_KILIT_HEMEN_OLUR', 'DERSLER_SON_GUN_GERI_ALINAMAZ', 'DERSLER_GEREKCE_GEREKLI'],
    idempotency: 'Aynı takvime bağlıysa 200 ve değişiklik yok. Bağ değişince aynı işlemde: yeni takvimler satırı FOR SHARE ile kilitlenir, son gün o satırdan okunur ve kilit_ani aynı UPDATE deyiminde hesaplanır (eşzamanlı takvim PUT\'u bayat kilit anı bırakamaz), birim_donemleri sürüm alır, takvim_oturumlarini_yenile işi ({ birimId, donemId }) konur. Kilitli birim ve dönemin bağı yalnız uzatma yoluyla değişir: yeni takvimin son günü eskisinden sonra ve sonGunGerekcesi var (yoksa 409 DERSLER_GEREKCE_GEREKLI; daha erken son gün 409 DERSLER_SON_GUN_GERI_ALINAMAZ; uzatma değilse 409 DERSLER_DONEM_KILITLI); uzatmada takvim PUT\'undaki kilitten dönüş kuralı yalnız bu birim için uygulanır. Ortak takvimi kullanan tek birim böyle kopya bir takvime bağlanıp uzatılır (plan.html#devam-donem-sonu: son gün birim ve dönem başına).', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/kilitler', client: 'panel', auth: YON('kapsamdaki birimler.'),
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı' },
    response: { donemArasi: 'bool (donemArasiMi ile aynı hesap)', birimDonemleri: '[{ birimId, birimAdi, donemId, akademikYil, yariyil, takvimId, sonGun, kilitAni, kilitli, kilitUygulandiAni: an|null, cevapsizOturum: int }]' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/dersler', client: 'panel', auth: YON('kapsamdaki birimlerin dersleri. Öğrenci listesi, yoklama ve kafa sayısı dönmez (D02-A08).'),
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı', birimId: 'uuidv7, sorgu, isteğe bağlı', hocaDurumu: 'aktif|pasif|silindi, sorgu, isteğe bağlı (dersler.hoca_hesap_durumu; hocası aktif olmayan dersleri binlerce ders arasından bulmak için)', imlec: 'opak metin, isteğe bağlı (keyset: kod ve id)', adet: '1-500, varsayılan 100' },
    response: { ogeler: '[{ id, kod, ad, donemId, birimId, birimAdi, hoca: { kisiId, adSoyad (D01.kisiGetir), hesapDurumu: aktif|pasif|silindi }, teoriP, uygulamaP, yoklamaSuresiDk, durum, arsivNedeni }]; deneme dersi hariç', sonrakiImlec: 'metin|null' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/dersler/{dersId}/devir', client: 'panel', auth: YON('dersin birimini kapsayan yönetici.'),
    request: { hedefKisiId: "uuidv7; D01.kisiGetir ile aktif, inceleme hesabı olmayan personel ve D01.personelRolleri ile hoca rolü taşımalı; D01.hesapSilindiMi kişi satırını FOR SHARE kilitler, eşzamanlı hesap silme silinmiş hoca bırakmaz (üçü de modules/kimlik/yaprak.ts'ten); değilse 409 DERSLER_DEVIR_HEDEFI_GECERSIZ", gerekce: 'hoca_ayrildi|hesap_silindi|gorev_degisikligi' },
    response: { ders: DersOzeti },
    errors: ['DERSLER_BULUNAMADI', 'DERSLER_DEVIR_HEDEFI_GECERSIZ', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: "Dersin hocası zaten hedefse 200 ve değişiklik yok. Devirde aynı işlemde (ders satırı FOR UPDATE): dersin hocası değişir, hoca_atama_gecmisi'nin son öğesi devir anıyla kapanır ve yeni hoca açık öğe olarak sona eklenir (I027), hoca_hesap_durumu aktif olur, kapsam_degisim_surumu ve ders sürümü işlemin sürümü olur (iki hocanın telefonu da baştan indirir), denetim kaydı yazılır. Kilitli ya da arşivdeki ders yalnız hocası silinmiş ya da pasif ve cevapsız oturumu kalmışsa devredilir (yoksa DERSLER_DONEM_KILITLI ya da DERSLER_DERS_ARSIVDE); yeni hoca orada yalnız cevapsız oturumları cevaplar. Kural onay bekliyor (Açık noktalar, D02-A07). Deneme dersi bu uçla devredilmez (DERSLER_DENEME_DERSI_DEGISTIRILEMEZ); onu denemeDersiniKur aynı devir kuralıyla, gerekçe inceleme_hesabi_yenilendi ile devreder.", rate_limit: RL,
  },
];
uclar.tipler = { DersOzeti, ProgramSaati, OturumPanel, OturumEtkisi, ProgramSaatiGirdisi: programSaatleriIstek };
module.exports = uclar;

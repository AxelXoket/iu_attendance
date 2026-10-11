// D02 spec, part 2: endpoints (exactly the 31 owned by D02 in contracts.json).
const RL = 'Girişli sınıf (D13 hizSinifi): oturum başına dakikada 120 istek.';
const RL_GIRISSIZ = 'Girişsiz sınıf (D13 hizSinifi): IP başına dakikada 3000 istek; cevap Cache-Control: public, max-age=300.';
const HOCA = 'Oturum (panel çerezi ya da Bearer), rol hoca; ders sahibi olmalı (dersYetkisi = sahip). Sahip değilse 404 DERSLER_DERS_BULUNAMADI: başka hocanın dersinin varlığı sızmaz (D13-B02, plan.html#baslangic yetki senaryosu).';
const HOCA_OTURUM = 'Oturum, rol hoca; oturumun dersinin sahibi olmalı. Değilse 404 DERSLER_OTURUM_BULUNAMADI.';
const YON = 'Oturum, rol yonetici; kapsam her istekte D01.yetkiDenetle(kisi, yonetici, { birimId }) ile sorulur (ilk sürümde genel yönetici: D02-A06). Rol uymazsa 403 (D13 genel kodu).';
const OLUSTUR = (ad) => `Gövdedeki id (istemcinin ürettiği UUIDv7) tekrar anahtarıdır: aynı id ve aynı içerik 200 ile var olan ${ad} döner, aynı id farklı içerik 409 DERSLER_KIMLIK_CAKISMASI (D13-B12 deseni). Hedefli ON CONFLICT (id) DO NOTHING.`;
const GET = 'Yan etkisiz okuma; aynı an ve aynı veriyle aynı cevap.';

const DersOzeti = 'DersOzeti { id, donemId, birimId: uuid|null, bolumId: uuid|null, kod, ad, teoriP: int, uygulamaP: int, yoklamaSuresiDk: int|null, qrIleYoklama: bool, denemeDersi: bool, takipBaslangici: tarih|null, durum: etkin|arsiv (x-extensible-enum), arsivNedeni: hoca|kilit|null, duzenlemeNo: int, subeler: [{ id, etiket, durum: etkin|pasif }], kilit: { sonGun: tarih|null, kilitAni: an|null, kilitli: bool } }';
const ProgramSaati = 'ProgramSaati { id, gun: 1-7, baslangicSaati: HH:MM, bitisSaati: HH:MM, teoriSaat: int, uygulamaSaat: int, derslik: metin|null, gecerlilikBaslangic: tarih|null, gecerlilikBitis: tarih|null, subeIdleri: uuid[] }';
const OturumPanel = 'OturumPanel { id, dersId, tur: normal|telafi|deneme, tarih, baslangicSaati, bitisSaati, baslangicAni: an, bitisAni: an, teoriSaat, uygulamaSaat, derslik: metin|null, yoklamaSuresiDk: int|null, qrIleYoklama: bool, durum: planlandi|iptal, iptalNedeni: metin|null, kisaKod: 10 rakamlık metin, subeIdleri: uuid[], elleDuzenlendi: bool, telafiEdilenOturumId: uuid|null, yapildi: { durum: cevapsiz|yapildi|yapilmadi|celiskili, kaynak: kafa_sayisi|hoca_cevabi|null, kafaSayisi: int|null } } (durum alanları x-extensible-enum)';
const OturumEtkisi = 'OturumEtkisi { eklenen: int, guncellenen: int, iptal: int, geriAlinan: int }';
const programSaatleriIstek = 'ProgramSaati girdisi dizisi, 0 ile 20 öğe: { id: uuidv7 (var olan saat kendi kimliğiyle, yeni saat için istemci üretir: tekrarlanan istek aynı gövde olur), gun: 1-7, baslangicSaati: HH:MM, bitisSaati: HH:MM (başlangıçtan büyük, en geç 23:59), teoriSaat: 0-12, uygulamaSaat: 0-12 (toplam 1-12), derslik: metin 1-40 ya da null, gecerlilikBaslangic?: tarih, gecerlilikBitis?: tarih (dönem içinde, başlangıç <= bitiş), subeIdleri: uuidv7[] 1-20, dersin etkin şubeleri }. Aynı gün kesişen iki saatin şube kümeleri ayrık olmalı.';

const uclar = [
  {
    method: 'GET', path: '/v1/dersler', client: 'panel', auth: 'Oturum, rol hoca; yalnız sahibi olduğu dersler döner (deneme hocası yalnız deneme dersini görür).',
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı', durum: 'etkin|arsiv, sorgu, isteğe bağlı' },
    response: { dersler: `${DersOzeti}[]; kod sırasıyla, en çok 500` },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler', client: 'panel', auth: 'Oturum, rol hoca; sahip isteği yapan hocadır.',
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
    response: { ders: `${DersOzeti}; yeni derste 201, aynı id ve içerikte 200` },
    errors: ['DERSLER_DONEM_BULUNAMADI', 'DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BOLUM_BULUNAMADI', 'DERSLER_BIRIM_PASIF', 'DERSLER_TAKVIM_YOK', 'DERSLER_DONEM_KILITLI', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('ders'), rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}', client: 'panel', auth: HOCA,
    request: { dersId: 'uuidv7, yol' },
    response: {
      ders: DersOzeti,
      programSaatleri: `${ProgramSaati}[] (silinmemiş)`,
      takvim: '{ takvimId, ad, dersBaslangic, dersBitis, ekleBirakBitis, sonGun, sonHaftaBaslangici: tarih } | null (deneme dersinde null)',
      sayilar: '{ planlanan: int, yapilan: int, yapilmayan: int, cevapsiz: int, iptal: int } (deneme dersi hariç dönem toplamı)',
    },
    errors: ['DERSLER_DERS_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/{dersId}', client: 'panel', auth: HOCA,
    request: {
      beklenenDuzenlemeNo: 'tam sayı; ders.duzenlemeNo ile aynı olmalı (gövde istenen değerlerle zaten aynıysa bakılmaz)',
      kod: 'metin 1-20, isteğe bağlı',
      ad: 'metin 1-120, isteğe bağlı',
      birimId: 'uuidv7, isteğe bağlı; yeni birim ve dönemin takvimi bağlı olmalı; başlamamış oturumlar yeni takvimle yeniden üretilir',
      bolumId: 'uuidv7|null, isteğe bağlı',
      yoklamaSuresiDk: 'tam sayı 1-240 ya da null, isteğe bağlı; başlamamış oturumlara kopyalanır, pencereleri D04 dinleyicisi yeniden hesaplar',
      qrIleYoklama: 'bool, isteğe bağlı; true yalnız QR ayarı bayrağı açıkken (D02-A10)',
    },
    response: { ders: DersOzeti, oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BIRIM_PASIF', 'DERSLER_BOLUM_BULUNAMADI', 'DERSLER_TAKVIM_YOK', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_QR_AYARI_KAPALI'],
    idempotency: 'İstenen değerler zaten kayıtlıysa 200 ve değişiklik yok (numaraya bakılmaz, denetim kaydı ve sürüm yazılmaz); farklıysa beklenen numara tutmalı, tutmazsa 409 ve cevapta güncel ders.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/arsivle', client: 'panel', auth: HOCA,
    request: { dersId: 'uuidv7, yol; gövde boş' },
    response: { ders: DersOzeti, iptalEdilenOturum: 'int (gelecekteki planlı oturumlar iptal, neden arsiv)' },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_DERS_BASLAMIS', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Arşivdeki derse 200 ve değişiklik yok.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/subeler', client: 'panel', auth: HOCA,
    request: { id: 'uuidv7, tekrar anahtarı', etiket: 'metin 1-20, derste tekil', programaKat: 'bool, varsayılan true: şube bütün program saatlerine ve başlamamış normal oturumlarına eklenir' },
    response: { sube: '{ id, etiket, durum }', oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_SUBE_ETIKETI_KULLANIMDA', 'DERSLER_SUBE_SINIRI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('şube'), rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/{dersId}/subeler/{subeId}', client: 'panel', auth: HOCA,
    request: { etiket: 'metin 1-20, isteğe bağlı', durum: 'etkin|pasif, isteğe bağlı; pasif yalnız şubede etkin liste satırı yokken (liste kaynağı sorulur) ve dersin başka etkin şubesi varken; pasif şube başlamamış oturumlardan ve program saatlerinden çıkar, şubesiz kalan oturum iptal (program)' },
    response: { sube: '{ id, etiket, durum }', oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_SUBE_ETIKETI_KULLANIMDA', 'DERSLER_SUBEDE_OGRENCI_VAR', 'DERSLER_SON_ETKIN_SUBE', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Aynı değerler 200 ve değişiklik yok.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/program', client: 'panel', auth: HOCA,
    request: { dersId: 'uuidv7, yol' },
    response: { duzenlemeNo: 'int', programSaatleri: `${ProgramSaati}[] (silinmemiş, gün ve saat sırasıyla)` },
    errors: ['DERSLER_DERS_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/program/onizleme', client: 'panel', auth: HOCA,
    request: { programSaatleri: programSaatleriIstek },
    response: {
      eklenecek: 'int', guncellenecek: '[{ oturumId, tarih, alanlar: metin[] }]', iptalEdilecek: '[{ oturumId, tarih, baslangicSaati, neden }]', geriAlinacak: '[{ oturumId, tarih }]',
      donemToplami: '{ planlanan: int, teoriSaat: int, uygulamaSaat: int } (yazılırsa oluşacak planlı oturumlar)',
      uyarilar: 'metin[] (x-extensible-enum): BASLAMIS_OTURUMLAR_DEGISMEZ, TATIL_GUNLERI_ATLANDI, SINAV_HAFTASI_ATLANDI',
    },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_TAKVIM_YOK', 'DERSLER_PROGRAM_GECERSIZ', 'DERSLER_PROGRAM_CAKISIYOR', 'DERSLER_PROGRAM_COK_BUYUK', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Hiçbir şey yazmaz; PUT ile aynı saf plan fonksiyonunu aynı anla çalıştırır, aynı girdi aynı önizleme.', rate_limit: RL,
  },
  {
    method: 'PUT', path: '/v1/dersler/{dersId}/program', client: 'panel', auth: HOCA,
    request: { beklenenDuzenlemeNo: 'tam sayı; dersin duzenlemeNo değeri', programSaatleri: programSaatleriIstek },
    response: { duzenlemeNo: 'int', programSaatleri: `${ProgramSaati}[]`, oturumEtkisi: OturumEtkisi },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_TAKVIM_YOK', 'DERSLER_PROGRAM_GECERSIZ', 'DERSLER_PROGRAM_CAKISIYOR', 'DERSLER_PROGRAM_COK_BUYUK', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Gövde kayıtlı programla aynıysa (id ve alanlar) 200, numara artmaz, oturum ve sürüm değişmez. Farklıysa beklenen numara tutmalı, tutmazsa 409 ve cevapta güncel program. Yazım tek işlemde: program saatleri, oturum üretimi, dinleyiciler (D04), denetim, D08 işi, sürüm.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/oturumlar', client: 'panel', auth: HOCA,
    request: { baslangic: 'tarih, sorgu, isteğe bağlı (varsayılan dönemin ders başlangıcı)', bitis: 'tarih, sorgu, isteğe bağlı (varsayılan son gün); aralık en çok 200 gün', durum: 'planlandi|iptal, isteğe bağlı', subeId: 'uuidv7, isteğe bağlı' },
    response: { oturumlar: `${OturumPanel}[]; başlangıç anı sırasıyla, en çok 1000` },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_ARALIK_COK_GENIS'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/{dersId}/telafi', client: 'panel', auth: HOCA,
    request: {
      id: 'uuidv7, tekrar anahtarı (oturum kimliği olur)',
      tarih: 'tarih; dönemin ders başlangıcı ile birimin son günü arasında',
      baslangicSaati: 'HH:MM', bitisSaati: 'HH:MM (başlangıçtan büyük, en geç 23:59)',
      teoriSaat: '0-12', uygulamaSaat: '0-12 (toplam 1-12)',
      derslik: 'metin 1-40 ya da null',
      subeIdleri: 'uuidv7[] 1-20, isteğe bağlı; varsayılan dersin bütün etkin şubeleri',
      yoklamaSuresiDk: 'tam sayı 1-240 ya da null, isteğe bağlı; verilmezse ders ayarı',
      telafiEdilenOturumId: 'uuidv7, isteğe bağlı; aynı dersin oturumu (telafi borcu bağı)',
      eskisiniIptalEt: 'bool, varsayılan false; true ise telafiEdilenOturumId zorunlu ve o oturum başlamamış olmalı: aynı işlemde iptal (tasindi) olur (taşıma); çakışma denetiminde iptal edilecek eski oturum sayılmaz',
    },
    response: { oturum: OturumPanel, iptalEdilen: 'OturumPanel|null (taşımada eski oturum)', uyarilar: 'metin[] (x-extensible-enum): AYNI_GUN (yalnız programı internetteyken indiren telefonlarda açılır), GECMIS (hiçbir telefon bilemez, kaydı olmayanları listeden işaretleyin), TATIL_GUNU, SINAV_HAFTASI' },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_TARIH_DONEM_DISI', 'DERSLER_TELAFI_SINIRI', 'DERSLER_OTURUM_BULUNAMADI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_OTURUM_CAKISIYOR', 'DERSLER_SUBE_BULUNAMADI', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('telafi oturumu') + ' eskisiniIptalEt true iken telafiEdilenOturumId yoksa istek şema düzeyinde 400 alır (Zod refine).', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/{dersId}/cakismalar', client: 'panel', auth: HOCA,
    request: { baslangic: 'tarih, sorgu, isteğe bağlı (varsayılan bugün, İstanbul)', bitis: 'tarih, sorgu, isteğe bağlı (varsayılan dönemin ders bitişi); aralık en çok 200 gün' },
    response: {
      cakismalar: '[{ satirId: uuid (bu dersin liste satırı; numara ve isim dönmez, panel D03 listesinden eşler), subeId, oturumId, tarih, baslangicSaati, bitisSaati, digerDers: { kod, ad }, digerOturum: { tarih, baslangicSaati, bitisSaati } }]; en çok 2000 öğe',
      ogrenciSayisi: 'int (çakışması olan farklı öğrenci)',
    },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_ARALIK_COK_GENIS', 'DERSLER_SONUC_COK_BUYUK'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/oturumlar/{oturumId}', client: 'panel', auth: HOCA_OTURUM,
    request: {
      baslangicSaati: 'HH:MM, isteğe bağlı (aynı gün)', bitisSaati: 'HH:MM, isteğe bağlı', derslik: 'metin 1-40 ya da null, isteğe bağlı',
      teoriSaat: '0-12, isteğe bağlı', uygulamaSaat: '0-12, isteğe bağlı (toplam 1-12)',
      iptaliGeriAl: 'true, isteğe bağlı; yalnız hoca nedeniyle iptal edilmiş, başlamamış oturumda; öteki alanlarla birlikte gelemez',
    },
    response: { oturum: OturumPanel },
    errors: ['DERSLER_OTURUM_BULUNAMADI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_OTURUM_IPTAL', 'DERSLER_IPTAL_GERI_ALINAMAZ', 'DERSLER_OTURUM_CAKISIYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'İstenen değerler zaten kayıtlıysa 200 ve değişiklik yok. Değişiklik: önceki değerler oturum_degisiklikleri satırına, oturum elle_duzenlendi olur, D04 dinleyicisi pencereyi yeniden hesaplar.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/{oturumId}/iptal', client: 'panel', auth: HOCA_OTURUM,
    request: { oturumId: 'uuidv7, yol; gövde boş (neden her zaman hoca)' },
    response: { oturum: OturumPanel },
    errors: ['DERSLER_OTURUM_BULUNAMADI', 'DERSLER_OTURUM_BASLAMIS', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Zaten iptal oturuma 200 ve değişiklik yok. Oturum silinmez; kimliği geçerli kalır, eski programla gelen kaydın kararı D07\'nindir.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/oturumlar/onaysiz', client: 'panel', auth: 'Oturum, rol hoca; yalnız sahibi olduğu derslerin oturumları. Hoca telefonu da internetliyken aynı ucu çağırır.',
    request: { dersId: 'uuidv7, sorgu, isteğe bağlı' },
    response: {
      oturumlar: "[{ oturumId, dersId, dersKodu, dersAdi, tarih, baslangicSaati, bitisSaati, teoriSaat, uygulamaSaat, durum: planlandi|iptal, celiskili: bool, kafaSayisi: int|null }]; tarih sırasıyla. Kapsam: bitmiş (bitis_ani <= şimdi), planlı ve cevapsız oturumlar ile kafa sayısı çelişkisi olan (iptal dahil) oturumlar; deneme dersi hariç",
      toplam: 'int',
    },
    errors: ['DERSLER_DERS_BULUNAMADI'], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/{oturumId}/yapildi-mi', client: 'panel', auth: HOCA_OTURUM + ' Hoca telefonu da internetliyken çağırır.',
    request: { yapildi: 'bool' },
    response: { oturum: '{ oturumId, durum: planlandi|iptal, yapildi: { durum, kaynak, kafaSayisi } }' },
    errors: ['DERSLER_OTURUM_BULUNAMADI', 'DERSLER_OTURUM_BASLAMADI', 'DERSLER_OTURUM_IPTAL', 'DERSLER_DONEM_KILITLI', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Aynı cevap zaten kayıtlıysa ve çelişki yoksa 200, denetim kaydı ikinci kez yazılmaz. Kilitli dönemde yalnız cevapsız ya da çelişkili oturuma yazılır. Değişen cevap aynı işlemde D08.devamHesaplaIsiKoy(tx, dersId, null, program) koyar.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/oturumlar/yapildi-mi', client: 'panel', auth: 'Oturum, rol hoca; her öğe ayrı denetlenir (sahip olmadığı oturum bulunamadi sonucu alır).',
    request: { oturumIdleri: 'uuidv7[] 1-200, tekil', yapildi: 'bool (hepsine tek cevap)' },
    response: { sonuclar: '[{ oturumId, sonuc: yazildi|degismedi|bulunamadi|baslamadi|iptal|kilitli (x-extensible-enum) }]; istekteki sırayla' },
    errors: [], idempotency: 'Öğe düzeyinde: aynı cevap degismedi döner, ikinci denetim kaydı yazılmaz. Bütün öğeler tek işlemde; gövde bozuksa yalnız genel 400. Ders başına tek D08 işi konur.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/birimler', client: 'telefon', auth: 'Girişsiz (hoca başvuru formu, uygulamada ve panelde; D01-B50).',
    request: {},
    response: { birimler: '[{ id, ad, tur (x-extensible-enum), bolumler: [{ id, ad }] }]; yalnız etkin birim ve bölümler, ad sırasıyla (COLLATE tr-TR-x-icu)' },
    errors: [], idempotency: GET, rate_limit: RL_GIRISSIZ,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/birimler', client: 'panel', auth: YON,
    request: {},
    response: { birimler: '[{ id, ad, tur, etkin, bolumler: [{ id, ad, etkin }] }]; pasifler dahil' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/birimler', client: 'panel', auth: YON,
    request: { id: 'uuidv7, tekrar anahtarı', ad: 'metin 1-120, tekil', tur: 'fakulte|enstitu|yuksekokul|meslek_yuksekokulu|konservatuvar' },
    response: { birim: '{ id, ad, tur, etkin, bolumler: [] }' },
    errors: ['DERSLER_BIRIM_ADI_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('birim'), rate_limit: RL,
  },
  {
    method: 'PATCH', path: '/v1/dersler/yonetim/birimler/{birimId}', client: 'panel', auth: YON,
    request: { ad: 'metin 1-120, isteğe bağlı', tur: 'isteğe bağlı', etkin: 'bool, isteğe bağlı (pasif birim yeni ders ve başvuruda görünmez, var olan dersler sürer)', bolumler: 'isteğe bağlı dizi 1-200: { id: uuidv7 (birimin bölümü), ad?: metin 1-120, etkin?: bool } (bölüm adı ve etkinliği)' },
    response: { birim: '{ id, ad, tur, etkin, bolumler: [{ id, ad, etkin }] }' },
    errors: ['DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BIRIM_ADI_KULLANIMDA', 'DERSLER_BOLUM_BULUNAMADI', 'DERSLER_BOLUM_ADI_KULLANIMDA'],
    idempotency: 'Aynı değerler 200 ve değişiklik yok.', rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/birimler/{birimId}/bolumler', client: 'panel', auth: YON,
    request: { id: 'uuidv7, tekrar anahtarı', ad: 'metin 1-120, birimde tekil' },
    response: { bolum: '{ id, birimId, ad, etkin }' },
    errors: ['DERSLER_BIRIM_BULUNAMADI', 'DERSLER_BOLUM_ADI_KULLANIMDA', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('bölüm'), rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/donemler', client: 'panel', auth: YON,
    request: {},
    response: { donemler: '[{ id, akademikYil, yariyil (x-extensible-enum), takvimler: [{ id, ad, dersBaslangic, dersBitis, ekleBirakBitis, devamsizlikSonGun, surumNo, tatiller: [{ id, ad, baslangicTarihi, bitisTarihi, yarimGunBaslangic }], sinavHaftalari: [{ id, tur, baslangicTarihi, bitisTarihi, dersYapilir }] }], birimler: [{ birimId, takvimId, kilitAni, kilitli }] }]; yeniden eskiye, inceleme dönemi hariç' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/donemler', client: 'panel', auth: YON,
    request: { id: 'uuidv7, tekrar anahtarı', akademikYil: 'YYYY-YYYY, ikinci yıl birincinin bir fazlası', yariyil: 'guz|bahar|yaz' },
    response: { donem: '{ id, akademikYil, yariyil }' },
    errors: ['DERSLER_DONEM_VAR', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('dönem'), rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/takvimler', client: 'panel', auth: YON,
    request: {
      id: 'uuidv7, tekrar anahtarı', donemId: 'uuidv7; inceleme dönemi olamaz', ad: 'metin 1-120, dönemde tekil',
      dersBaslangic: 'tarih', dersBitis: 'tarih (> dersBaslangic)', ekleBirakBitis: 'tarih (<= dersBitis)', devamsizlikSonGun: 'tarih (>= dersBitis)',
      tatiller: 'dizi 0-60: { id: uuidv7, ad: metin 1-120, baslangicTarihi, bitisTarihi (>= başlangıç), yarimGunBaslangic: HH:MM|null }',
      sinavHaftalari: 'dizi 0-10: { id: uuidv7, tur: ara|final|butunleme, baslangicTarihi, bitisTarihi, dersYapilir: bool (varsayılan false, D02-A01) }',
    },
    response: { takvim: '{ id, donemId, ad, dersBaslangic, dersBitis, ekleBirakBitis, devamsizlikSonGun, surumNo, tatiller, sinavHaftalari }' },
    errors: ['DERSLER_DONEM_BULUNAMADI', 'DERSLER_TAKVIM_ADI_KULLANIMDA', 'DERSLER_TAKVIM_TARIHLERI_GECERSIZ', 'DERSLER_KIMLIK_CAKISMASI'],
    idempotency: OLUSTUR('takvim') + ' Takvim birime bağlanana kadar hiçbir oturumu etkilemez.', rate_limit: RL,
  },
  {
    method: 'PUT', path: '/v1/dersler/yonetim/takvimler/{takvimId}', client: 'panel', auth: YON,
    request: {
      beklenenSurumNo: 'tam sayı; takvimin surumNo değeri', ad: 'metin 1-120',
      dersBaslangic: 'tarih', dersBitis: 'tarih', ekleBirakBitis: 'tarih', devamsizlikSonGun: 'tarih',
      tatiller: 'dizi 0-60: { id: uuidv7 (var olan kendi kimliğiyle, yeni tatil için istemci üretir), ad, baslangicTarihi, bitisTarihi, yarimGunBaslangic: HH:MM|null }; listede olmayan var olan tatil silindi olur',
      sinavHaftalari: 'dizi 0-10: { id: uuidv7 (yeni için istemci üretir), tur, baslangicTarihi, bitisTarihi, dersYapilir: bool }',
      hemenKilitle: 'bool, varsayılan false; yeni son gün bağlı bir birimi şimdi kilitleyecekse true olmalı',
      sonGunGerekcesi: 'birim_karari|yanlis_giris, isteğe bağlı; kilit anı geçmiş bir birimin son günü ileri alınırken zorunlu (D02-A05)',
    },
    response: { takvim: 'POST cevabıyla aynı', etkilenenBirimDonemi: 'int', yenidenUretim: 'bool (takvim_oturumlarini_yenile işi aynı işlemde kuyruğa kondu mu)' },
    errors: ['DERSLER_TAKVIM_BULUNAMADI', 'DERSLER_SURUM_UYUSMUYOR', 'DERSLER_TAKVIM_TARIHLERI_GECERSIZ', 'DERSLER_KILIT_HEMEN_OLUR', 'DERSLER_SON_GUN_GERI_ALINAMAZ', 'DERSLER_GEREKCE_GEREKLI', 'DERSLER_TAKVIM_ADI_KULLANIMDA'],
    idempotency: 'Gövde kayıtlı takvimle aynıysa 200, numara artmaz, iş konmaz. Değişiklikte aynı işlemde: takvim satırları, bağlı birim_donemleri.kilit_ani ve sürümü, denetim kaydı, D14.isGonder(tx, takvim_oturumlarini_yenile, { takvimId }).', rate_limit: RL,
  },
  {
    method: 'PUT', path: '/v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}', client: 'panel', auth: YON,
    request: { takvimId: 'uuidv7; aynı dönemin takvimi', hemenKilitle: 'bool, varsayılan false; bağlanan takvimin son günü geçmişse true olmalı' },
    response: { birimDonemi: '{ birimId, donemId, takvimId, sonGun, kilitAni, kilitli }', yenidenUretim: 'bool' },
    errors: ['DERSLER_BIRIM_BULUNAMADI', 'DERSLER_DONEM_BULUNAMADI', 'DERSLER_TAKVIM_BULUNAMADI', 'DERSLER_TAKVIM_DONEMI_UYUSMUYOR', 'DERSLER_DONEM_KILITLI', 'DERSLER_KILIT_HEMEN_OLUR'],
    idempotency: 'Aynı takvime bağlıysa 200 ve değişiklik yok. Bağ değişince aynı işlemde kilit anı yeniden hesaplanır ve takvim_oturumlarini_yenile işi ({ birimId, donemId }) konur. Kilitli birim ve dönemin bağı değişmez.', rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/kilitler', client: 'panel', auth: YON,
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı' },
    response: { donemArasi: 'bool (donemArasiMi ile aynı hesap)', birimDonemleri: '[{ birimId, birimAdi, donemId, akademikYil, yariyil, takvimId, sonGun, kilitAni, kilitli, kilitUygulandiAni: an|null, cevapsizOturum: int }]' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'GET', path: '/v1/dersler/yonetim/dersler', client: 'panel', auth: YON + ' Öğrenci listesi, yoklama ve kafa sayısı dönmez (D02-A08).',
    request: { donemId: 'uuidv7, sorgu, isteğe bağlı', birimId: 'uuidv7, sorgu, isteğe bağlı', imlec: 'opak metin, isteğe bağlı (keyset: kod ve id)', adet: '1-500, varsayılan 100' },
    response: { ogeler: '[{ id, kod, ad, donemId, birimId, birimAdi, sahip: { kisiId, adSoyad, hesapDurumu } (D01.kisiGetir), teoriP, uygulamaP, yoklamaSuresiDk, durum, arsivNedeni }]; deneme dersi hariç', sonrakiImlec: 'metin|null' },
    errors: [], idempotency: GET, rate_limit: RL,
  },
  {
    method: 'POST', path: '/v1/dersler/yonetim/dersler/{dersId}/devir', client: 'panel', auth: YON,
    request: { hedefKisiId: 'uuidv7; D01.kisiGetir ile etkin personel ve D01.personelRolleri ile hoca rolü taşımalı', gerekce: 'hoca_ayrildi|hesap_silindi|gorev_degisikligi' },
    response: { ders: DersOzeti },
    errors: ['DERSLER_DERS_BULUNAMADI', 'DERSLER_DEVIR_HEDEFI_GECERSIZ', 'DERSLER_KOD_KULLANIMDA', 'DERSLER_DONEM_KILITLI', 'DERSLER_DERS_ARSIVDE', 'DERSLER_DENEME_DERSI_DEGISTIRILEMEZ'],
    idempotency: 'Sahip zaten hedefse 200 ve değişiklik yok. Devirde aynı işlemde: sahip değişir, eski sahip onceki_hoca_kisi_idleri dizisine eklenir, sahip_atama_surumu ve ders sürümü yeni sürüm olur, denetim kaydı yazılır. Kilitli ya da arşivdeki ders yalnız sahibi silinmiş ya da pasif ve cevapsız oturumu kalmışsa devredilir; yeni hoca orada yalnız cevapsız oturumları cevaplar. Kural sahibin onayını bekliyor (D02-A07).', rate_limit: RL,
  },
];
uclar.tipler = { DersOzeti, ProgramSaati, OturumPanel, OturumEtkisi, ProgramSaatiGirdisi: programSaatleriIstek };
module.exports = uclar;

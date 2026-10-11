// D09 uçları (spec ve fragment aynı veriden üretilir).
const GIRISLI = "Hız sınıfı oturum (D13.hizSinifi): oturum başına dakikada 120 istek (D13-B09 başlangıç değeri)";
const AGIR = "Hız sınıfı agir (D13.hizSinifi): oturum başına dakikada 20 istek; liste her istekte birçok modülden canlı kurulur";
const TOPLU = GIRISLI + "; istek başına en çok 200 öğe (fazlası 400 API_ISTEK_GECERSIZ), gövde sınırı 256 KiB (aşan 413 API_GOVDE_COK_BUYUK, D13-B11)";
const OKUMA = "Yalnız okuma; tekrar zararsız.";
const SAHIP = "kaynak düzeyinde yalnız D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' geçer (üç parametre, I009); 'yonetici' ya da null sonucu DUZELTMELER_BULUNAMADI alır (iki rollü kişi başka birimin dersine yazamaz, plan.html#baslangic)";
const HOCA_YETKI = "Rota tablosunda kimlik: oturum, roller [hoca] (panel çerezi ya da telefonun hoca modundaki Bearer anahtarı); " + SAHIP;
const HOCA_LISTE = "Rota roller [hoca] (panel ya da telefonun hoca modu); yalnız kişinin sahibi olduğu dersler: liste D02.hocaninDersleri(tx, kimlik.kisiId, { acikDonem: true }) ile süzülür; dersId verilip D02.dersYetkisi(tx, kimlik, dersId) 'sahip' değilse 404 DUZELTMELER_BULUNAMADI";
const ORTAK_HATALAR = ["API_KIMLIK_GEREKLI (401, D13)", "API_ROL_YETKISIZ (403, D13: rol uymuyor)", "API_HIZ_SINIRI (429) ve API_SUNUCU_YOGUN (503), Retry-After ile (D13)"];
const SORGU_HATASI = "API_ISTEK_GECERSIZ (400, D13: sorgu ya da gövde şemaya uymuyor)";
const TOPLU_HATALAR = ["API_ISTEK_GECERSIZ (400, D13: şemaya uymayan gövde ya da 200'den fazla öğe)", "API_GOVDE_COK_BUYUK (413, D13: gövde 256 KiB'ı aşıyor)", ...ORTAK_HATALAR];
const BUYUK = "API_SONUC_COK_BUYUK (422, D13-B13: 2000 satırı aşan sınıf boyu liste; kesik liste dönmez, istemci dersId ile daraltır)";
const SONUC = (ek) => "ogeSonuclariSemasi (D13-B28) dizisi, istek sırasıyla: { kimlik: " + ek.kimlik + ", sonuc: KABUL | ZATEN_VAR | RET | TEKRAR_DENE (x-extensible-enum), kod: hata kodu ya da null" + (ek.alan ? ", " + ek.alan : "") + " }; TEKRAR_DENE yalnız kod DUZELTMELER_GECICI_CAKISMA ya da DUZELTMELER_ANLIK_BEKLENIYOR ile, öbür öğeler etkilenmez (D09-B32)";
const TOPLU_TEKRAR = "Tek işlem: önce danışma anahtarları işlemin ilk çağrısında tek D12.danismaKilidi ile (D09-B40), sonra öğe başına SAVEPOINT (D13-B28). Öğeler kanonik sırayla işlenir (öğrencinin kişi kimliği, hesapsız öğrencide liste satırı kimliği; sonra oturumId; sonra kayıt kimliği), cevap istek sırasıyla döner; 40P01 ve 55P03 öğe başına yakalanır, ROLLBACK TO SAVEPOINT ve bir kez yeniden denenir, yine olursa öğe TEKRAR_DENE DUZELTMELER_GECICI_CAKISMA alır (D09-B32). Öğrenci sürümü (D06.ogrenciDurumuDegisti) öğrenci başına bir kez, o öğrencinin öğelerinden sonra.";

module.exports = [
  {
    group: 'Düzeltmeler',
    method: 'POST', path: '/v1/duzeltmeler', client: 'panel',
    purpose: "Bir ya da çok oturum ve öğrenci için düzeltme yazar ya da zincirin son düzeltmesini değiştirir; isteğe bağlı olarak açık sorun bildirimini aynı işlemde kapatır. İşaretli oturumun toplu incelemesinde 'yoklamada sınıfta değil' (YOKLAMADA_SINIFTA_DEGIL) da bu uçla girilir.",
    auth: HOCA_YETKI + "; her öğe ayrı denetlenir, yetkisiz öğe DUZELTMELER_BULUNAMADI alır (varlık sızdırılmaz). Yönetici ve öğrenci 403.",
    request: {
      islemId: "uuid, UUIDv7 (z.uuidv7); isteğin işlem kimliği, bütün satırların islem_id'si",
      ogeler: "dizi, 1 ile 200 öğe; kanonik sırayla işlenir, cevap istek sırasıyla",
      'ogeler[].id': "uuid, UUIDv7; yazılacak satırın kimliği, istemci üretir (tekrar anahtarı)",
      'ogeler[].oturumId': "uuid; başlamış, iptal edilmemiş, yapılmadı denmemiş oturum",
      'ogeler[].listeSatiriId': "uuid; oturumun şubelerinden birinde; D08'in kapsam yüklemine (packages/core/src/devam/kapsam.ts) göre oturumun başlangıç anında öğrencinin kapsamında (Md.9/4 onceki_yok seçiminde eklenmeden önceki oturum da kapsamda)",
      'ogeler[].sebepKodu': "GOREVLENDIRME | OGRENCI_ISLERI_YAZISI | KURUL_KARARI | BEYANA_DAYALI | TELEFON_YOK_CALISMIYOR | QR_OKUTAMADI | YOKLAMADA_SINIFTA_DEGIL (son kod yalnız oturumda açık işaret varken, D09-B29)",
      'ogeler[].belgeNo': "metin ya da null; Görevli ve Belgeli kodlarında zorunlu, ötekilerde null; belgeNoNormalize sonrası 1 ile 64 karakter",
      'ogeler[].teoriSaat': "tam sayı ya da null; null oturumun bütün teori saatleri; 0 ile oturumun teori saati arası (D08 oturumSaatleri)",
      'ogeler[].uygulamaSaat': "tam sayı ya da null; null bütün uygulama saatleri, OGRENCI_ISLERI_YAZISI'nda null 0 sayılır",
      'ogeler[].oncekiDuzeltmeId': "uuid ya da null; değiştirmede zincirin son satırı; son satır GERI_ALMA ise null da kabul (sunucu doldurur, istek özetine girmez)",
      'ogeler[].sorunBildirimiId': "uuid ya da null; aynı oturum ve liste satırının ACIK bildirimi, aynı işlemde DUZELTILDI olur",
      'ogeler[].kayit': "{ donemId: uuid, kayitId: uuid } ya da null; aynı oturum ve öğrencinin kaydı; sonradan değişenlerdeki SAYILIRSA_DEGISECEK satırının düzeltmesinde dolu"
    },
    response: {
      islemId: "uuid",
      sonuclar: SONUC({ kimlik: "öğe id", alan: "duzeltme: Duzeltme ya da null (KABUL ve ZATEN_VAR'da; ogeSonuclariSemasi'na yalnız ekleme alanı)" }),
      Duzeltme: "{ id, islemId, tur, sebepKodu, sonDurum, birimId, dersId, oturumId, listeSatiriId, kayit, belgeNo, teoriSaat, uygulamaSaat, oncekiDuzeltmeId, sorunBildirimiId, kaynak, yapanKisiId, istemciAniAlt, istemciAniUst, saatKaynagi, ulasmaAni, olusturmaAni } (anlar ISO 8601 UTC metni)"
    },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_KIMLIK_CAKISMASI", "öğe: DUZELTMELER_OTURUM_BASLAMADI", "öğe: DUZELTMELER_OTURUM_IPTAL", "öğe: DUZELTMELER_OTURUM_YAPILMADI", "öğe: DUZELTMELER_LISTEDE_DEGIL", "öğe: DUZELTMELER_BELGE_NO_GEREKLI", "öğe: DUZELTMELER_BELGE_NO_YASAK", "öğe: DUZELTMELER_BELGE_NO_GECERSIZ", "öğe: DUZELTMELER_SAAT_GECERSIZ", "öğe: DUZELTMELER_SAAT_TURU_YASAK", "öğe: DUZELTMELER_DUZELTME_VAR", "öğe: DUZELTMELER_DUZELTME_DEGISTI", "öğe: DUZELTMELER_SORUN_BILDIRIMI_UYUSMUYOR", "öğe: DUZELTMELER_KAYIT_UYUSMUYOR", "öğe: DUZELTMELER_ISARETLI_OTURUM_DEGIL", "öğe (TEKRAR_DENE): DUZELTMELER_ANLIK_BEKLENIYOR", "öğe (TEKRAR_DENE): DUZELTMELER_GECICI_CAKISMA"],
    idempotency: "Öğe kimliği birincil anahtar: aynı id ve aynı istek_ozeti ZATEN_VAR ve saklanan satır; aynı id farklı özet RET DUZELTMELER_KIMLIK_CAKISMASI, satır değişmez. Özet isteğin gönderildiği halinden hesaplanır (null saatler ve null oncekiDuzeltmeId null kalır), sunucunun çözdüğü değerlerle karşılaştırılmaz (D09-B30). Danışma anahtarları: bütün öğelerin 'duzeltmeler:zincir:<oturumId>:<listeSatiriId>' anahtarları (katman 3; numaranın aynı oturum şubelerindeki öbür satırlarınınkiler de, D09-A08) işlemin ilk çağrısıdır; kuyruk işleyicisi aynı anahtarı kilitAnahtarlari kancasıyla D06'ya verir. Hesap işi D08.devamHesaplaIsiKoy(tx, dersId, ogrenciId ya da hesapsız öğrencide null, DUZELTME, { tur: 'DUZELTME', id }); liste satırından hesaba geçiş D03 satırının numarasıyla D01.ogrenciHesabiGetir(tx, { numaralar }) toplu çağrısıdır, numara yalnız bellekte. " + TOPLU_TEKRAR,
    rate_limit: TOPLU
  },
  {
    group: 'Düzeltmeler',
    method: 'GET', path: '/v1/duzeltmeler', client: 'panel',
    purpose: "Düzeltme geçmişi: ders, oturum ya da öğrenciye göre, değiştirilen ve geri alınan satırlar dahil.",
    auth: "Rol HOCA: dersId zorunlu ve D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse ve kişi yönetici de değilse 404). Rol YONETICI: salt okuma; kapsam kimlik.roller'daki yönetici rolünün kapsamBirimId'si (I009): kapsamlı yönetici yalnız birim_id = kapsam satırlarını, kapsamsız yönetici hepsini (birim_id boş olanlar dahil) okur. İki rollü kişi sahibi olduğu derste hoca kuralıyla, öbür derslerde yönetici kuralıyla okur. Öğrenci 403.",
    request: {
      dersId: "uuid (sorgu); hocada zorunlu",
      oturumId: "uuid (sorgu), isteğe bağlı",
      listeSatiriId: "uuid (sorgu), isteğe bağlı",
      sebepKodu: "SebepKodu (sorgu), isteğe bağlı",
      yalnizEtkin: "boolean (sorgu), varsayılan false; true ise yalnız zincirlerin etkin satırları",
      imlec: "metin (sorgu); opak base64url keyset imleci (olusturma_ani, id), içinde numara ve isim yok (D13 sayfaSorgusuSemasi)",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      ogeler: "Duzeltme[]; olusturmaAni azalan, eşitlikte id; ek alanlar: oturumBaslangicAni, ogrenciAdSoyad (liste satırındaki), etkin (boolean), kilitSonrasi (boolean)",
      sonrakiImlec: "metin ya da null"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_IMLEC_GECERSIZ (400: başka sorgunun imleci)", "DUZELTMELER_BULUNAMADI (404: ders kişinin değil ve kapsamında değil)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Düzeltmeler',
    method: 'POST', path: '/v1/duzeltmeler/{id}/geri-al', client: 'panel',
    purpose: "Zincirin son düzeltmesini GERI_ALMA satırıyla geri alır; düzeltmenin kapattığı bildirimi yeniden açar.",
    auth: HOCA_YETKI + " (satırın dersi).",
    request: {
      id: "uuid (yol); geri alınacak satır: zincirin son satırı ve türü DUZELTME",
      geriAlmaId: "uuid, UUIDv7 (gövde); yazılacak GERI_ALMA satırının kimliği, tekrar anahtarı"
    },
    response: {
      geriAlma: "Duzeltme (tur GERI_ALMA)",
      geriAlinan: "Duzeltme",
      yenidenAcilanSorunBildirimiId: "uuid ya da null"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_DUZELTME_DEGISTI (409: satır zincirin son satırı değil)", "DUZELTMELER_ZATEN_GERI_ALINDI (409)", "DUZELTMELER_KIMLIK_CAKISMASI (409: geriAlmaId başka hedefe ait)", "DUZELTMELER_ANLIK_BEKLENIYOR (409: birim dönemi kilitli ve gün sonu anlığı henüz yok, D09-B33)", ...ORTAK_HATALAR],
    idempotency: "geriAlmaId birincil anahtar, istek özeti { tur: GERI_ALMA, hedef: id }: aynı id ve aynı hedef 200 ve aynı satırlar; aynı id başka hedef 409. Danışma kilidi POST /v1/duzeltmeler ile aynı anahtarda, işlemin ilk çağrısı.",
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/onaylar/ozet', client: 'panel',
    purpose: "Hocanın bekleyen iş sayıları; paneldeki Onaylar menüsünün sayısı ve telefonun hoca modundaki özet.",
    auth: HOCA_LISTE + ".",
    request: { '(yok)': "gövde ve sorgu yok" },
    response: {
      kendiBeyani: "tam sayı; kafa sayısı ya da yapıldı cevabı gelmiş oturumlarda, kilitli olmayan birim dönemlerinde onay bekleyen Kendi beyanı kaydı",
      teyit: "{ toplu: tam sayı, tekTek: tam sayı }",
      inceleme: "tam sayı; karar verilebilir İncelemede kayıt (kilitli birim dönemleri hariç, D09-B23)",
      sorunBildirimi: "tam sayı; ACIK bildirim",
      isaretliOturum: "tam sayı; açık işaretli, incelenmemiş oturum (D09-B29 tanımı)",
      kafaSayisiBekleyenOturum: "tam sayı; bitmiş, kafa sayısı ya da yapıldı cevabı gelmemiş oturum; kayıtları sayılara girmez",
      bugunkuParti: "{ gun: tarih (İstanbul), toplam: tam sayı, kalan: tam sayı }; gun bugünden büyük olmayan en son partinin günü (D09-B20)",
      toplam: "tam sayı; kendiBeyani + teyit.toplu + teyit.tekTek + inceleme + sorunBildirimi + isaretliOturum"
    },
    errors: [...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/kendi-beyani', client: 'panel',
    purpose: "Onay bekleyen Kendi beyanı kayıtları, oturuma göre gruplu; kafa sayısı bekleyen oturumların kayıtları ve kilitli birim dönemleri gösterilmez.",
    auth: HOCA_LISTE + ".",
    request: { dersId: "uuid (sorgu), isteğe bağlı", oturumId: "uuid (sorgu), isteğe bağlı" },
    response: {
      oturumlar: "dizi: { oturumId, dersId, dersAdi, baslangicAni, kayitlar: [{ kayit: {donemId, kayitId}, listeSatiriId, ogrenciAdSoyad, ulasmaAni, etiketler }] }",
      kafaSayisiBekleyenOturumlar: "dizi: { oturumId, dersId, baslangicAni }; kayıt ve sayı yok",
      toplam: "tam sayı"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404)", BUYUK, ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/kendi-beyani/kararlar', client: 'panel',
    purpose: "Kendi beyanı kayıtlarını toplu onaylar ya da reddeder; yalnız hocanın ekranda gördüğü ve hâlâ bekleyen kayıtlar işlenir.",
    auth: HOCA_YETKI + " (kaydın oturumunun dersi).",
    request: {
      islemId: "uuid, UUIDv7",
      ogeler: "dizi, 1 ile 200: { kayit: { donemId, kayitId }, karar: ONAY | RET }"
    },
    response: { islemId: "uuid", sonuclar: SONUC({ kimlik: "kayitId" }) },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_KENDI_BEYANI_DEGIL", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS", "öğe: DUZELTMELER_KAFA_SAYISI_BEKLENIYOR", "öğe: DUZELTMELER_DONEM_KILITLI", "öğe (TEKRAR_DENE): DUZELTMELER_GECICI_CAKISMA"],
    idempotency: "islemId ve kayıt: aynı islemId ile aynı kayda yazılmış duzeltmeler.kendi_beyani_karari olayı varsa ZATEN_VAR. Danışma anahtarları: kayıtlar önce kilitsiz okunur (D05.kayitGetir), D07.kararAnahtarlari(kayıtların { oturumId, ogrenciId, anahtarId } listesi) çift ve sayaç anahtarlarını üretir, işlemin ilk çağrısında alınır. Onay D07.kararDegistir(tx, kayit, { karar: 'VAR', beklenenKarar: 'VAR' }, { tur: 'HOCA', kisiId, olay: 'KENDI_BEYANI_ONAY', islemId }), ret { karar: 'RET', beklenenKarar: 'VAR' } ve olay KENDI_BEYANI_RET (birleşik biçim, D09-B12; dersId ve istemci D09'un olayında). D07 hataları: KARAR_DEGISTI ZATEN_KARAR_VERILMIS, DONEM_KILITLI DONEM_KILITLI, YETKISIZ_HOCA BULUNAMADI, GECIS_GECERSIZ KENDI_BEYANI_DEGIL olur. Olay, D08 hesap işi ve öğrenci durum sürümü aynı işlemde. " + TOPLU_TEKRAR,
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/teyitler', client: 'panel',
    purpose: "İlk kayıt teyidi bekleyen öğrenciler, dört grupta: toplu teyit edilebilenler, cihazı doğrulanmamışlar, isim eşleşmeyenler, aynı numarayı isteyen hesaplar.",
    auth: HOCA_LISTE + "; yalnız kişinin açık dönemdeki derslerinde etkin liste satırı olan teyitsiz hesaplar.",
    request: { dersId: "uuid (sorgu), isteğe bağlı; liste 2000 satırı aşınca daraltmak için" },
    response: {
      toplu: "TeyitOgesi[]; D01'in toplu kuralına uyanlar (eslesmeDurumu eslesti, etkinCihaz.dogrulandi true, aynı numarada başka teyitsiz hesap yok; D09-B13)",
      cihaziDogrulanmamis: "TeyitOgesi[]; etkinCihaz.dogrulandi false ya da cihaz yok; tek tek teyit",
      isimEslesmeyen: "TeyitOgesi[] (girilenAdSoyad dolu); eslesmeDurumu isim_uyusmuyor; tek tek teyit",
      ayniNumara: "dizi: { ogrenciNo, listeAdSoyad, hesaplar: TeyitOgesi[] }; tek tek karar",
      TeyitOgesi: "{ ogrenciId, ogrenciNo, listeAdSoyad, girilenAdSoyad (yalnız isimEslesmeyen ve ayniNumara; kaynak D01 OgrenciHesabi.girilenAdSoyad, D01 yalnız ekleme alanı olarak verdi, D09-A09), dersler: [{ dersId, dersAdi }], kayitAni }",
      toplam: "tam sayı"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404: dersId kişinin değil)", BUYUK, ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: AGIR
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/teyitler/kararlar', client: 'panel',
    purpose: "İlk kayıt teyidi: toplu teyit (yalnız toplu grup), tek tek teyit ya da gerekçeli ret.",
    auth: "Rol HOCA; yetki ve toplu kuralını D01.ogrenciTeyitEt ve ogrenciTeyidiniReddet denetler (öğrencinin etkin liste satırı olan dersin hocası); D09 yalnız sonucu eşler.",
    request: {
      islemId: "uuid, UUIDv7; D01'e istekle geçer, kimlik.teyit ve kimlik.teyit_ret olayları taşır",
      ogeler: "dizi, 1 ile 200: { ogrenciId: uuid, karar: TEYIT | RET, toplu: boolean, gerekceKodu: BU_OGRENCI_DEGIL | DIGER ya da null }; toplu yalnız TEYIT ile true olabilir; gerekceKodu RET'te zorunlu, TEYIT'te null (değilse 400); D01'e küçük harfle (bu_ogrenci_degil, diger) geçer"
    },
    response: { islemId: "uuid", sonuclar: SONUC({ kimlik: "ogrenciId" }) },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_TEK_TEK_ONAYLANMALI", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS", "öğe (TEKRAR_DENE): DUZELTMELER_GECICI_CAKISMA"],
    idempotency: "islemId ve öğrenci: denetim_kayitlari'nda aynı islem_id, olay_turu kimlik.teyit ya da kimlik.teyit_ret ve ogrenci_id ile satır varsa ZATEN_VAR (D01 olayı yazar, D09 ayrı olay yazmaz; D09-B15). D01 sonuç eşlemesi: teyitli ve reddedildi KABUL; zaten_teyitli ZATEN_VAR; tek_tek_gerekli RET DUZELTMELER_TEK_TEK_ONAYLANMALI; numara_teyitli, teyitli_hesap ve zaten_reddedildi RET DUZELTMELER_ZATEN_KARAR_VERILMIS; bulunamadi RET DUZELTMELER_BULUNAMADI. reddedilenHesaplar'ın her biri için aynı işlemde D06.ogrenciDurumuDegisti. Öğe başına ayrı işlem (D09-B40): her öğenin işleminde ilk kilit D01'in 'dogrulama:teyit:<ogrenciId>' anahtarı (katman 2), sonra D07'nin yeniden değerlendirme anahtarları; öğeler kanonik sırayla (ogrenciId) işlenir, cevap istek sırasıyla döner; 40P01 ve 55P03'te öğenin işlemi bir kez yeniden denenir, yine olursa TEKRAR_DENE DUZELTMELER_GECICI_CAKISMA.",
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/incelemeler', client: 'panel',
    purpose: "Karar verilebilir İncelemede kayıtlar, gerekçe kodu ve etiketleriyle; bugünkü parti ya da hepsi. Kilitli birim dönemlerinin kayıtları (SON_GUNDEN_SONRA dahil) listelenmez; onların yolu sonradan değişenler ve düzeltmedir (D09-B23).",
    auth: HOCA_LISTE + ".",
    request: {
      gorunum: "BUGUN | HEPSI (sorgu), varsayılan BUGUN: gun değeri bugünden (İstanbul) büyük olmayan en son partide olup hâlâ bekleyenler; HEPSI bütün bekleyenler, partide olanlar işaretli",
      dersId: "uuid (sorgu), isteğe bağlı",
      oturumId: "uuid (sorgu), isteğe bağlı"
    },
    response: {
      gun: "tarih (İstanbul); BUGUN görünümünde kullanılan partinin günü, parti yoksa null",
      ogeler: "dizi: { kayit, oturumId, dersId, dersAdi, oturumBaslangicAni, listeSatiriId, ogrenciAdSoyad, gerekceKodu, etiketler, ulasmaAni, kararAni, partiSirasi (ya da null), kritik (partide ise, değilse null) }",
      kafaSayisiBekleyenOturumlar: "dizi: { oturumId, dersId, baslangicAni }",
      toplam: "tam sayı"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404)", BUYUK, ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/incelemeler/kararlar', client: 'panel',
    purpose: "İncelemede kaydı onaylar ya da reddeder; hocanın kilitten önce kendi verdiği kararı (İncelemede onayı ya da reddi, Kendi beyanı onayı ya da reddi) geri çevirir.",
    auth: HOCA_YETKI + " (kaydın oturumunun dersi).",
    request: {
      islemId: "uuid, UUIDv7",
      ogeler: "dizi, 1 ile 200: { kayit: { donemId, kayitId }, baglam: INCELEME | KARAR_DEGISTIR, beklenenKarar: INCELEMEDE | VAR | RET, yeniKarar: VAR | RET }",
      kural: "INCELEME: beklenenKarar INCELEMEDE, yeniKarar VAR (onay) ya da RET. KARAR_DEGISTIR (D09-B34): beklenenKarar VAR ve yeniKarar RET ya da tersi; yalnız son geçişi HOCA kaynaklı ve bu dersin kararı olan kayıtta, birim dönemi kilitlenmeden; D07'nin durum makinesindeki 'Hoca kendi kararını kilitten önce değiştirdi' geçişi. Gerekçe sabitlerini D07 seçer (packages/contracts/src/dogrulama.ts'ten içe aktarılır; ör. HOCA_ONAYLADI, HOCA_REDDETTI, KENDI_BEYANI_ONAYLANDI, KENDI_BEYANI_REDDEDILDI)"
    },
    response: { islemId: "uuid", sonuclar: SONUC({ kimlik: "kayitId", alan: "yeniKarar: VAR | RET ya da null, sayilan: boolean ya da null (ogeSonuclariSemasi'na yalnız ekleme alanları)" }) },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS", "öğe: DUZELTMELER_KARAR_DEGISTIRILEMEZ", "öğe: DUZELTMELER_KAFA_SAYISI_BEKLENIYOR", "öğe: DUZELTMELER_DONEM_KILITLI", "öğe (KABUL ile bilgi): DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR", "öğe (TEKRAR_DENE): DUZELTMELER_GECICI_CAKISMA"],
    idempotency: "islemId ve kayıt: aynı islemId ile yazılmış duzeltmeler.inceleme_karari ya da karar_degistirildi olayı varsa ZATEN_VAR; beklenenKarar tutmazsa ZATEN_KARAR_VERILMIS (ikinci cihaz üzerine yazamaz). D07 hataları: KARAR_DEGISTI ZATEN_KARAR_VERILMIS, DONEM_KILITLI DONEM_KILITLI, YETKISIZ_HOCA BULUNAMADI; GECIS_GECERSIZ INCELEME bağlamında ZATEN_KARAR_VERILMIS, KARAR_DEGISTIR bağlamında KARAR_DEGISTIRILEMEZ olur. Danışma anahtarları kendi-beyani kararlarıyla aynı: D07.kararAnahtarlari ile işlemin ilk çağrısında. KararKaynagi { tur: 'HOCA', kisiId, olay: INCELEME_ONAY | INCELEME_RET | KARAR_DEGISTIR, islemId }, YeniKarar { karar: yeniKarar, beklenenKarar } (D09-B12). Onayda D07.kararDegistir dönüşündeki kaydın (KararDegisimi.kayit) sayilan bayrağı okunur: onaylanan kayıt sayılan değilse KABUL ile DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR bilgisi, sayılansa bilgi yok (D09-B12). " + TOPLU_TEKRAR,
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/isaretli-oturumlar', client: 'panel',
    purpose: "Kafa sayısı aşımı dersten sonra çıkan ve toplu incelemesi bitmemiş oturumlar (açık işaret: tür KAFA_SAYISI_ASIMI, derste false, incelendi_ani boş, gecerli true; kesinleşmiş olsa da).",
    auth: HOCA_LISTE + ".",
    request: { dersId: "uuid (sorgu), isteğe bağlı" },
    response: {
      ogeler: "dizi: { oturumId, isaretId, dersId, dersAdi, baslangicAni, kafaSayisi, kayitSayisi, ilkIsaretAni, kesinlesti, partiSirasi (ya da null) } (değerler D07.oturumIsaretleri'nden)",
      toplam: "tam sayı"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/isaretli-oturumlar/{oturumId}/incelendi', client: 'panel',
    purpose: "İşaretli oturumun toplu incelemesini kapatır: oturumun açık işaretini D07.oturumIsaretleri ile bulur, D07.isaretIncelendi(tx, isaretId, { kisiId }) çağırır ve denetime yazar. Aynı oturumdaki QR_BELGESIZ_GOSTERIM işaretine dokunmaz.",
    auth: HOCA_YETKI + " (oturumun dersi).",
    request: { oturumId: "uuid (yol)", islemId: "uuid, UUIDv7 (gövde)" },
    response: { oturumId: "uuid", isaretId: "uuid", incelendiAni: "metin, ISO 8601 UTC" },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404: ders kişinin değil ya da oturumda açık işaret yok)", "DUZELTMELER_ZATEN_INCELENDI (409: başka islemId ile incelenmiş)", ...ORTAK_HATALAR],
    idempotency: "Aynı islemId ile tekrar 200 ve aynı cevap (duzeltmeler.isaretli_oturum_incelendi olayından okunur).",
    rate_limit: GIRISLI
  },
  {
    group: 'Sorun bildirimleri',
    method: 'GET', path: '/v1/duzeltmeler/sorun-bildirimleri', client: 'panel',
    purpose: "Hocanın sorun bildirimi listesi; bugünkü parti işaretiyle ve önerilen sebep koduyla. Kafa sayısı ya da yapıldı cevabı gelmemiş oturumun bildirimi kayıt alanları olmadan görünür.",
    auth: HOCA_LISTE + ".",
    request: {
      gorunum: "BUGUN | ACIK | KAPALI | SURE_DISI (sorgu), varsayılan ACIK; BUGUN gun değeri bugünden büyük olmayan en son parti; KAPALI ve SURE_DISI sayfalı",
      dersId: "uuid (sorgu), isteğe bağlı",
      imlec: "metin (sorgu), yalnız sayfalı görünümde",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      gun: "tarih ya da null; yalnız BUGUN görünümünde",
      ogeler: "dizi: { id, dersId, dersAdi, oturumId, oturumBaslangicAni, ogrenciId, listeSatiriId, ogrenciAdSoyad, kayit, kayitKarari (kafa sayısı bekleyen oturumda ikisi de null), nedenKodu, onerilenSebepKodu, durum, istemciAniAlt, ulasmaAni, sureBitisAni, kapanisAni, kapatanKisiId, duzeltmeId, partiSirasi, kritik }",
      sonrakiImlec: "metin ya da null"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404)", BUYUK, ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Sorun bildirimleri',
    method: 'POST', path: '/v1/duzeltmeler/sorun-bildirimleri/{id}/kapat', client: 'panel',
    purpose: "Bildirimi değişiklik yapmadan kapatır (DEGISIKLIK_YOK); düzeltmeyle kapanış POST /v1/duzeltmeler içindedir.",
    auth: HOCA_YETKI + " (bildirimin dersi).",
    request: { id: "uuid (yol)", islemId: "uuid, UUIDv7 (gövde)" },
    response: { sorunBildirimi: "SorunBildirimi (durum DEGISIKLIK_YOK)" },
    errors: [SORGU_HATASI, "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_BILDIRIM_ACIK_DEGIL (409)", ...ORTAK_HATALAR],
    idempotency: "kapanis_islem_id = islemId ise 200 ve aynı satır; UPDATE ... WHERE durum = 'ACIK' tek satır değiştirmezse 409. Olay, öğrenci durum sürümü ve D08.devamHesaplaIsiKoy(tx, dersId, ogrenciId, 'SORUN_BILDIRIMI', { tur: 'SORUN_BILDIRIMI', id }) aynı işlemde (açık işaret kalktı).",
    rate_limit: GIRISLI
  },
  {
    group: 'Sonradan değişenler ve denetim',
    method: 'GET', path: '/v1/duzeltmeler/sonradan-degisenler', client: 'panel',
    purpose: "Dersin sonradan değişenler listesi, tek sayfalı akış: geç ulaşan ya da geç değişen kayıtlar, kilitten sonra sonucu değişen öğrenciler, sayılırsa sonucu değiştirecek kayıtlar (eylemi düzeltme).",
    auth: "Rol HOCA; dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404).",
    request: {
      dersId: "uuid (sorgu), zorunlu",
      bolum: "GEC_ULASAN | SONUCU_DEGISEN | SAYILIRSA_DEGISECEK (sorgu), isteğe bağlı; verilmezse üçü sırayla",
      imlec: "metin (sorgu); opak keyset imleci (bölüm sırası, an, kimlik); liste her sayfada aynı kuralla kurulur",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      kilit: "{ kilitli: boolean, kilitAni: metin ya da null } (D02.kilitDurumu)",
      ogeler: "dizi, her öğe bolum alanı taşır: GEC_ULASAN { bolum, kayit, oturumId, oturumBaslangicAni, listeSatiriId, ogrenciAdSoyad, neden: GEC_ULASTI | GEC_KARAR, ulasmaAni, kararAni, gondermeSuresiSonu, karar }; SONUCU_DEGISEN { bolum, listeSatiriId, ogrenciAdSoyad, tur: TEORI | UYGULAMA | GENEL, tabanSonucu, simdikiSonuc, tabanAni, sinif (D10'un degisimSinifi sonucu; Haksız devamsız sınıflaması, I048), kaynaklar: [{ tur: DUZELTME | KARAR | GEC_KAYIT, sebepKodu, duzeltmeId, kayit, ani }] }; SAYILIRSA_DEGISECEK { bolum, kayit, oturumId, listeSatiriId, ogrenciAdSoyad, ulasmaAni, eylem: { yol: POST /v1/duzeltmeler, onerilenSebepKodu: BEYANA_DAYALI (D09-A06), kayit } }",
      sonrakiImlec: "metin ya da null"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404)", ...ORTAK_HATALAR],
    idempotency: OKUMA + " Liste sorgu anında, yalitim 'repeatable_read' ile açılan okuma işleminde kurulur, ayrı tablo yok; D08.sonucuDegistirebilirMi kip 'AKSIS' ve isteğin anıyla çağrılır (I038); sayfalama D13-B13 keyset desenidir.",
    rate_limit: AGIR
  },
  {
    group: 'Sonradan değişenler ve denetim',
    method: 'GET', path: '/v1/duzeltmeler/denetim', client: 'panel',
    purpose: "Denetim kaydını okur: hoca kendi dersinin olaylarını, yönetici kapsamındaki olayları; süzgeçli ve sayfalı.",
    auth: "Rol HOCA: dersId zorunlu, D02.dersYetkisi(tx, kimlik, dersId) === 'sahip' (değilse 404). Rol YONETICI: salt okuma; kimlik.roller'daki yönetici rolünün kapsamBirimId'si doluysa yalnız birim_id = kapsam, boşsa hepsi (birim_id boş olaylar, ör. kimlik.* ve veritabani.*, yalnız kapsamsız yöneticiye). İki rollü kişi GET /v1/duzeltmeler ile aynı kural. Öğrenci 403.",
    request: {
      dersId: "uuid (sorgu); hocada zorunlu",
      oturumId: "uuid (sorgu), isteğe bağlı",
      listeSatiriId: "uuid (sorgu), isteğe bağlı",
      ogrenciId: "uuid (sorgu), isteğe bağlı",
      kayitDonemId: "uuid (sorgu), kayitId ile birlikte",
      kayitId: "uuid (sorgu), isteğe bağlı",
      olayTuru: "metin (sorgu), önek; ör. duzeltmeler.",
      baslangic: "tarih YYYY-AA-GG (sorgu), İstanbul günü, isteğe bağlı",
      bitis: "tarih YYYY-AA-GG (sorgu), isteğe bağlı",
      imlec: "metin (sorgu), keyset (olay_ani, id)",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      ogeler: "DenetimOlayi[]: { id, olayTuru, olayAni, yapan: { tur, kisiId, rol, adSoyad }, istemci, islemId, istemciAni, donemId, birimId, dersId, oturumId, ogrenciId, listeSatiriId, kayit, hedef, kod, onceki, sonraki, ayrinti }",
      sonrakiImlec: "metin ya da null"
    },
    errors: [SORGU_HATASI, "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  }
];

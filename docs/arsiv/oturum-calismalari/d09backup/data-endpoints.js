// D09 uçları (spec ve fragment aynı veriden üretilir).
const GIRISLI = "Girişli uç sınıfı (D13.hizSinifi): oturum başına dakikada 120 istek (D13-B09 başlangıç değeri)";
const TOPLU = GIRISLI + "; istek başına en çok 200 öğe, fazlası 413";
const OKUMA = "Yalnız okuma; tekrar zararsız.";
const HOCA_YETKI = "Rota tablosunda kimlik: oturum, rol HOCA (panel çerezi ya da telefonun hoca modundaki Bearer anahtarı); kaynak düzeyinde D02.dersYetkisi(tx, kisi, dersId)";
const ORTAK_HATALAR = ["401 (D13 ortak kodu: oturum yok ya da geçersiz)", "403 (D13 ortak kodu: rol uymuyor)", "429 ve 503 (D13 ortak kodları, Retry-After ile)"];
const TOPLU_HATALAR = ["DUZELTMELER_GECERSIZ_ISTEK (400)", ...ORTAK_HATALAR, "413 (D13 ortak kodu: 200 öğeden fazla)"];
const SONUC = "dizi, istek sırasıyla: { ..., sonuc: KABUL | ZATEN_VAR | RET (x-extensible-enum), kod: hata kodu ya da null }";

module.exports = [
  {
    group: 'Düzeltmeler',
    method: 'POST', path: '/v1/duzeltmeler', client: 'panel',
    purpose: "Bir ya da çok oturum ve öğrenci için düzeltme yazar ya da zincirin son düzeltmesini değiştirir; isteğe bağlı olarak açık sorun bildirimini aynı işlemde kapatır.",
    auth: HOCA_YETKI + "; her öğe ayrı denetlenir, yetkisiz öğe DUZELTMELER_BULUNAMADI alır (varlık sızdırılmaz). Yönetici ve öğrenci 403.",
    request: {
      islemId: "uuid, UUIDv7 (z.uuidv7); isteğin işlem kimliği, bütün satırların islem_id'si",
      ogeler: "dizi, 1 ile 200 öğe; sunucu (oturumId, listeSatiriId) sırasıyla kilitleyip işler, cevabı istek sırasıyla verir",
      'ogeler[].id': "uuid, UUIDv7; yazılacak satırın kimliği, istemci üretir (tekrar anahtarı)",
      'ogeler[].oturumId': "uuid; başlamış, yapılmadı denmemiş oturum",
      'ogeler[].listeSatiriId': "uuid; oturumun şubelerinden birinde, oturum anında etkin satır",
      'ogeler[].sebepKodu': "GOREVLENDIRME | OGRENCI_ISLERI_YAZISI | KURUL_KARARI | BEYANA_DAYALI | TELEFON_YOK_CALISMIYOR | QR_OKUTAMADI",
      'ogeler[].belgeNo': "metin ya da null; Görevli ve Belgeli kodlarında zorunlu, ötekilerde null; belgeNoNormalize sonrası 1 ile 64 karakter",
      'ogeler[].teoriSaat': "tam sayı ya da null; null oturumun bütün teori saatleri; 0 ile oturumun teori saati arası",
      'ogeler[].uygulamaSaat': "tam sayı ya da null; null bütün uygulama saatleri, OGRENCI_ISLERI_YAZISI'nda null 0 sayılır",
      'ogeler[].oncekiDuzeltmeId': "uuid ya da null; değiştirmede zincirin son satırı; son satır GERI_ALMA ise null da kabul",
      'ogeler[].sorunBildirimiId': "uuid ya da null; aynı oturum ve liste satırının ACIK bildirimi, aynı işlemde DUZELTILDI olur",
      'ogeler[].kayit': "{ donemId: uuid, kayitId: uuid } ya da null; aynı oturum ve öğrencinin kaydı"
    },
    response: {
      islemId: "uuid",
      sonuclar: SONUC.replace('...', 'id: uuid') + ", duzeltme: Duzeltme ya da null (KABUL ve ZATEN_VAR'da)",
      Duzeltme: "{ id, islemId, tur, sebepKodu, sonDurum, dersId, oturumId, listeSatiriId, kayit, belgeNo, teoriSaat, uygulamaSaat, oncekiDuzeltmeId, sorunBildirimiId, kaynak, yapanKisiId, istemciAni, olusturmaAni } (anlar ISO 8601 UTC metni)"
    },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_KIMLIK_CAKISMASI", "öğe: DUZELTMELER_OTURUM_BASLAMADI", "öğe: DUZELTMELER_OTURUM_YAPILMADI", "öğe: DUZELTMELER_LISTEDE_DEGIL", "öğe: DUZELTMELER_BELGE_NO_GEREKLI", "öğe: DUZELTMELER_BELGE_NO_YASAK", "öğe: DUZELTMELER_BELGE_NO_GECERSIZ", "öğe: DUZELTMELER_SAAT_GECERSIZ", "öğe: DUZELTMELER_SAAT_TURU_YASAK", "öğe: DUZELTMELER_DUZELTME_VAR", "öğe: DUZELTMELER_DUZELTME_DEGISTI", "öğe: DUZELTMELER_SORUN_BILDIRIMI_UYUSMUYOR", "öğe: DUZELTMELER_KAYIT_UYUSMUYOR"],
    idempotency: "Öğe kimliği birincil anahtar: aynı id ve aynı içerik ZATEN_VAR ve saklanan satır; aynı id farklı içerik RET DUZELTMELER_KIMLIK_CAKISMASI, satır değişmez. Tek işlem, öğe başına SAVEPOINT (D13-B28); (oturum, liste satırı) için pg_advisory_xact_lock sabit sırayla.",
    rate_limit: TOPLU
  },
  {
    group: 'Düzeltmeler',
    method: 'GET', path: '/v1/duzeltmeler', client: 'panel',
    purpose: "Düzeltme geçmişi: ders, oturum ya da öğrenciye göre, değiştirilen ve geri alınan satırlar dahil.",
    auth: "Rol HOCA: dersId zorunlu ve D02.dersYetkisi geçmeli (yoksa 404). Rol YONETICI: salt okuma, dersId isteğe bağlı, kapsam D01.yetkiDenetle ile; iki rolü olan kişi yönetici kuralıyla okur. Öğrenci 403.",
    request: {
      dersId: "uuid (sorgu); hocada zorunlu",
      oturumId: "uuid (sorgu), isteğe bağlı",
      listeSatiriId: "uuid (sorgu), isteğe bağlı",
      sebepKodu: "SebepKodu (sorgu), isteğe bağlı",
      yalnizEtkin: "boolean (sorgu), varsayılan false; true ise yalnız zincirlerin etkin satırları",
      imlec: "metin (sorgu); opak base64url keyset imleci (olusturma_ani, id), içinde numara ve isim yok",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      ogeler: "Duzeltme[]; olusturmaAni azalan, eşitlikte id; ek alanlar: oturumBaslangicAni, ogrenciAdSoyad (liste satırındaki), etkin (boolean), kilitSonrasi (boolean)",
      sonrakiImlec: "metin ya da null"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404: ders hocanın değil)", ...ORTAK_HATALAR],
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
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_DUZELTME_DEGISTI (409: satır zincirin son satırı değil)", "DUZELTMELER_ZATEN_GERI_ALINDI (409)", "DUZELTMELER_KIMLIK_CAKISMASI (409: geriAlmaId başka satıra ait)", ...ORTAK_HATALAR],
    idempotency: "geriAlmaId birincil anahtar: aynı id ve aynı hedef 200 ve aynı satırlar; aynı id başka hedef 409.",
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/onaylar/ozet', client: 'panel',
    purpose: "Hocanın bekleyen iş sayıları; paneldeki Onaylar menüsünün sayısı ve telefonun hoca modundaki özet.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız kendi dersleri.",
    request: { '(yok)': "gövde ve sorgu yok" },
    response: {
      kendiBeyani: "tam sayı; kafa sayısı ya da yapıldı cevabı gelmiş oturumlarda onay bekleyen Kendi beyanı kaydı",
      teyit: "{ toplu: tam sayı, tekTek: tam sayı }",
      inceleme: "tam sayı; karar verilebilir İncelemede kayıt",
      sorunBildirimi: "tam sayı; ACIK bildirim",
      isaretliOturum: "tam sayı; dersten sonra işaretlenen, incelenmemiş oturum",
      kafaSayisiBekleyenOturum: "tam sayı; bitmiş, kafa sayısı ya da yapıldı cevabı gelmemiş oturum; kayıtları sayılara girmez",
      bugunkuParti: "{ gun: tarih (İstanbul), toplam: tam sayı, kalan: tam sayı }",
      toplam: "tam sayı; kendiBeyani + teyit.toplu + teyit.tekTek + inceleme + sorunBildirimi + isaretliOturum"
    },
    errors: [...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/kendi-beyani', client: 'panel',
    purpose: "Onay bekleyen Kendi beyanı kayıtları, oturuma göre gruplu; kafa sayısı bekleyen oturumların kayıtları gösterilmez.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız kendi dersleri, dersId verilirse D02.dersYetkisi.",
    request: { dersId: "uuid (sorgu), isteğe bağlı", oturumId: "uuid (sorgu), isteğe bağlı" },
    response: {
      oturumlar: "dizi: { oturumId, dersId, dersAdi, baslangicAni, kayitlar: [{ kayit: {donemId, kayitId}, listeSatiriId, ogrenciAdSoyad, ulasmaAni, etiketler }] }",
      kafaSayisiBekleyenOturumlar: "dizi: { oturumId, dersId, baslangicAni }; kayıt ve sayı yok",
      toplam: "tam sayı"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_LISTE_COK_BUYUK (400: 2000 satırı aşan liste, ders süzgeciyle istenir)", ...ORTAK_HATALAR],
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
    response: { islemId: "uuid", sonuclar: SONUC.replace('...', 'kayit') },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_KENDI_BEYANI_DEGIL", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS", "öğe: DUZELTMELER_KAFA_SAYISI_BEKLENIYOR", "öğe: DUZELTMELER_DONEM_KILITLI"],
    idempotency: "islemId ve kayıt: aynı islemId ile aynı kayda yazılmış duzeltmeler.kendi_beyani_karari olayı varsa ZATEN_VAR. Onay D07.kararDegistir(tx, kayit, 'VAR', kaynak), ret 'RET'; olay, D08 hesap işi ve öğrenci durum sürümü aynı işlemde.",
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/teyitler', client: 'panel',
    purpose: "İlk kayıt teyidi bekleyen öğrenciler, dört grupta: toplu teyit edilebilenler, cihazı doğrulanmamışlar, isim eşleşmeyenler, aynı numarayı isteyen hesaplar.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız hocanın açık dönemdeki derslerinde etkin liste satırı olan teyitsiz hesaplar.",
    request: { '(yok)': "gövde ve sorgu yok" },
    response: {
      toplu: "TeyitOgesi[]",
      cihaziDogrulanmamis: "TeyitOgesi[]; tek tek teyit",
      isimEslesmeyen: "TeyitOgesi[] (girilenAdSoyad dolu); tek tek teyit",
      ayniNumara: "dizi: { ogrenciNo, listeAdSoyad, hesaplar: TeyitOgesi[] }; tek tek karar",
      TeyitOgesi: "{ ogrenciId, ogrenciNo, listeAdSoyad, girilenAdSoyad (yalnız isimEslesmeyen ve ayniNumara), dersler: [{ dersId, dersAdi }], kayitAni }",
      toplam: "tam sayı"
    },
    errors: ["DUZELTMELER_LISTE_COK_BUYUK (400)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/teyitler/kararlar', client: 'panel',
    purpose: "İlk kayıt teyidi: toplu teyit (yalnız toplu grup), tek tek teyit ya da ret.",
    auth: "Rol HOCA; öğrencinin hocanın derslerinden birinde etkin liste satırı olmalı (D03.ogrencininEtkinSatirlari ve D02.dersYetkisi).",
    request: {
      islemId: "uuid, UUIDv7",
      ogeler: "dizi, 1 ile 200: { ogrenciId: uuid, karar: TEYIT | RET, toplu: boolean }; toplu yalnız TEYIT ile true olabilir; grup sunucuda yeniden hesaplanır, istemcinin grubu güvenilmez"
    },
    response: { islemId: "uuid", sonuclar: SONUC.replace('...', 'ogrenciId') },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_TEK_TEK_ONAYLANMALI", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS"],
    idempotency: "islemId ve öğrenci: aynı islemId ile yazılmış duzeltmeler.teyit_karari olayı varsa ZATEN_VAR. Teyit D01.ogrenciTeyitEt, ret D01.ogrenciTeyidiniReddet ile aynı işlemde; beklemedeki kayıtları D01 aynı işlemde D07'ye karara bağlatır.",
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/incelemeler', client: 'panel',
    purpose: "Karar verilebilir İncelemede kayıtlar, gerekçe kodu ve etiketleriyle; bugünkü parti ya da hepsi.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız kendi dersleri.",
    request: {
      gorunum: "BUGUN | HEPSI (sorgu), varsayılan BUGUN: yalnız bugünkü partide olup hâlâ bekleyenler; HEPSI bütün bekleyenler, partide olanlar işaretli",
      dersId: "uuid (sorgu), isteğe bağlı",
      oturumId: "uuid (sorgu), isteğe bağlı"
    },
    response: {
      gun: "tarih (İstanbul)",
      ogeler: "dizi: { kayit, oturumId, dersId, dersAdi, oturumBaslangicAni, listeSatiriId, ogrenciAdSoyad, gerekceKodu, etiketler, ulasmaAni, kararAni, kilitSonrasiUlasti, partiSirasi (ya da null), kritik (partide ise, değilse null) }",
      kafaSayisiBekleyenOturumlar: "dizi: { oturumId, dersId, baslangicAni }",
      toplam: "tam sayı"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_LISTE_COK_BUYUK (400)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/incelemeler/kararlar', client: 'panel',
    purpose: "İncelemede kaydı onaylar ya da reddeder; işaretli oturumda Var kaydı düşürür.",
    auth: HOCA_YETKI + " (kaydın oturumunun dersi).",
    request: {
      islemId: "uuid, UUIDv7",
      ogeler: "dizi, 1 ile 200: { kayit: { donemId, kayitId }, karar: ONAY | RET, baglam: INCELEME | ISARETLI_OTURUM, beklenenKarar: INCELEMEDE | VAR }",
      kural: "INCELEME: beklenenKarar INCELEMEDE, ONAY Var, RET Ret. ISARETLI_OTURUM: beklenenKarar VAR, yalnız RET. Gerekçeyi D07 kataloğu verir (D07-B01 önerileri HOCA_ONAYLADI, INCELEME_REDDEDILDI; işaretli oturumda öneri YOKLAMADA_SINIFTA_DEGIL)"
    },
    response: { islemId: "uuid", sonuclar: SONUC.replace('...', 'kayit, yeniKarar: VAR | RET ya da null') },
    errors: [...TOPLU_HATALAR, "öğe: DUZELTMELER_BULUNAMADI", "öğe: DUZELTMELER_ZATEN_KARAR_VERILMIS", "öğe: DUZELTMELER_ISARETLI_OTURUM_DEGIL", "öğe: DUZELTMELER_KAFA_SAYISI_BEKLENIYOR", "öğe: DUZELTMELER_DONEM_KILITLI", "öğe (KABUL ile bilgi): DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR"],
    idempotency: "islemId ve kayıt: aynı islemId ile yazılmış duzeltmeler.inceleme_karari ya da isaretli_oturum_karari olayı varsa ZATEN_VAR; beklenenKarar tutmazsa ZATEN_KARAR_VERILMIS (ikinci cihaz üzerine yazamaz).",
    rate_limit: TOPLU
  },
  {
    group: 'Onay listeleri',
    method: 'GET', path: '/v1/duzeltmeler/isaretli-oturumlar', client: 'panel',
    purpose: "Kafa sayısı aşımı dersten sonra çıkan ve toplu incelemesi bitmemiş oturumlar.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız kendi dersleri.",
    request: { dersId: "uuid (sorgu), isteğe bağlı" },
    response: {
      ogeler: "dizi: { oturumId, dersId, dersAdi, baslangicAni, kafaSayisi, kayitSayisi, ilkIsaretAni, kesinlesti, partiSirasi (ya da null) } (değerler D07.oturumIsaretleri'nden)",
      toplam: "tam sayı"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  },
  {
    group: 'Onay listeleri',
    method: 'POST', path: '/v1/duzeltmeler/isaretli-oturumlar/{oturumId}/incelendi', client: 'panel',
    purpose: "İşaretli oturumun toplu incelemesini kapatır (D07.isaretIncelendi) ve denetime yazar.",
    auth: HOCA_YETKI + " (oturumun dersi).",
    request: { oturumId: "uuid (yol)", islemId: "uuid, UUIDv7 (gövde)" },
    response: { oturumId: "uuid", incelendiAni: "metin, ISO 8601 UTC" },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404: ders hocanın değil ya da açık işaret yok)", "DUZELTMELER_ZATEN_INCELENDI (409: başka islemId ile incelenmiş)", ...ORTAK_HATALAR],
    idempotency: "Aynı islemId ile tekrar 200 ve aynı cevap (duzeltmeler.isaretli_oturum_incelendi olayından okunur).",
    rate_limit: GIRISLI
  },
  {
    group: 'Sorun bildirimleri',
    method: 'GET', path: '/v1/duzeltmeler/sorun-bildirimleri', client: 'panel',
    purpose: "Hocanın sorun bildirimi listesi; bugünkü parti işaretiyle ve önerilen sebep koduyla.",
    auth: "Rol HOCA (panel ya da telefonun hoca modu); yalnız kendi dersleri.",
    request: {
      gorunum: "BUGUN | ACIK | KAPALI | SURE_DISI (sorgu), varsayılan ACIK; KAPALI ve SURE_DISI sayfalı",
      dersId: "uuid (sorgu), isteğe bağlı",
      imlec: "metin (sorgu), yalnız sayfalı görünümde",
      adet: "tam sayı (sorgu), 1 ile 500, varsayılan 100"
    },
    response: {
      ogeler: "dizi: { id, dersId, dersAdi, oturumId, oturumBaslangicAni, ogrenciId, listeSatiriId, ogrenciAdSoyad, kayit, kayitKarari, nedenKodu, onerilenSebepKodu, durum, istemciAni, ulasmaAni, sureBitisAni, kapanisAni, kapatanKisiId, duzeltmeId, partiSirasi, kritik }",
      sonrakiImlec: "metin ya da null"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_LISTE_COK_BUYUK (400)", ...ORTAK_HATALAR],
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
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_BILDIRIM_ACIK_DEGIL (409)", ...ORTAK_HATALAR],
    idempotency: "kapanis_islem_id = islemId ise 200 ve aynı satır; UPDATE ... WHERE durum = 'ACIK' tek satır değiştirmezse 409. Olay ve öğrenci durum sürümü aynı işlemde.",
    rate_limit: GIRISLI
  },
  {
    group: 'Sonradan değişenler ve denetim',
    method: 'GET', path: '/v1/duzeltmeler/sonradan-degisenler', client: 'panel',
    purpose: "Dersin sonradan değişenler listesi: geç ulaşan ya da geç değişen kayıtlar, kilitten sonra sonucu değişen öğrenciler, sayılırsa sonucu değiştirecek kayıtlar.",
    auth: "Rol HOCA; dersId zorunlu, D02.dersYetkisi.",
    request: { dersId: "uuid (sorgu), zorunlu" },
    response: {
      kilit: "{ kilitli: boolean, kilitAni: metin ya da null } (D02.kilitDurumu)",
      gecUlasanlar: "dizi: { kayit, oturumId, oturumBaslangicAni, listeSatiriId, ogrenciAdSoyad, neden: GEC_ULASTI | GEC_KARAR, ulasmaAni, kararAni, gondermeSuresiSonu, karar }",
      sonucuDegisenler: "dizi: { listeSatiriId, ogrenciAdSoyad, tur: TEORI | UYGULAMA | GENEL, tabanSonucu, simdikiSonuc, tabanAni, kaynaklar: [{ tur: DUZELTME | KARAR | GEC_KAYIT, sebepKodu, duzeltmeId, kayit, ani }] }",
      sayilirsaDegisecekler: "dizi: { kayit, oturumId, listeSatiriId, ogrenciAdSoyad, ulasmaAni }"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_BULUNAMADI (404)", "DUZELTMELER_LISTE_COK_BUYUK (400)", ...ORTAK_HATALAR],
    idempotency: OKUMA + " Liste sorgu anında kurulur, ayrı tablo yok.",
    rate_limit: GIRISLI
  },
  {
    group: 'Sonradan değişenler ve denetim',
    method: 'GET', path: '/v1/duzeltmeler/denetim', client: 'panel',
    purpose: "Denetim kaydını okur: hoca kendi dersinin olaylarını, yönetici bütün olayları; süzgeçli ve sayfalı.",
    auth: "Rol HOCA: dersId zorunlu, D02.dersYetkisi (yoksa 404). Rol YONETICI: salt okuma, kapsam D01.yetkiDenetle. Öğrenci 403.",
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
      ogeler: "DenetimOlayi[]: { id, olayTuru, olayAni, yapan: { tur, kisiId, rol, adSoyad }, istemci, islemId, istemciAni, donemId, dersId, oturumId, ogrenciId, listeSatiriId, kayit, hedef, kod, onceki, sonraki, ayrinti }",
      sonrakiImlec: "metin ya da null"
    },
    errors: ["DUZELTMELER_GECERSIZ_ISTEK (400)", "DUZELTMELER_IMLEC_GECERSIZ (400)", "DUZELTMELER_BULUNAMADI (404)", ...ORTAK_HATALAR],
    idempotency: OKUMA,
    rate_limit: GIRISLI
  }
];

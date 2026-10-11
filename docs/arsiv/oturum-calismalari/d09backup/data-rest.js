// D09: işler, durumlar, değişmezler, dış yüz, dosyalar, testler, netleştirmeler, açık noktalar, kataloglar.

const summary = "duzeltmeler modülü hocanın düzeltmelerini (Görevli, Belgeli düzeltme, beyana dayalı, elle ekleme), Kendi beyanı, İncelemede ve işaretli oturum kararlarını, ilk kayıt teyidi listesini ve öğrencinin sorun bildirimlerini yürütür. Kayıt kararını ve teyit alanını kendisi yazmaz: karar D07.kararDegistir, teyit D01 ile aynı veritabanı işleminde değişir; D09 yalnız kendi dört tablosuna yazar. Bütün modüllerin tek denetim tablosu denetim_kayitlari bu modüldedir, tek yazma yolu yaprak denetimeYaz işlevidir ve uygulama rolleri bu tabloda ve düzeltmelerde yalnız ekler ve okur. Sebep kodu kataloğu ve son durum önceliği packages/core/src/duzeltmeler içinde saf tablo ve işlevdir; sunucu, panel ve telefon aynısını kullanır. Gece inceleme sıralaması hiçbir kararı değiştirmeden her hocaya o günün küçük partisini yazar.";

const jobs = [
  {
    name: 'gece_inceleme_siralamasi',
    schedule: "Her gün 05:10 Europe/Istanbul (pg-boss zamanlaması, tz açıkça 'Europe/Istanbul'); kesin dakika D14'ün zamanlama listesinde gecelik pg_dump'tan ve D08'in devam_tutarlilik_denetimi işinden sonra kalacak biçimde verilir; işçi kapalıysa açılınca bir kez (missed: once).",
    idempotency: "İş verisi yalnız { gun: 'YYYY-AA-GG' } taşır (boşsa saat arayüzünün İstanbul günü). Girdi kesimi o günün İstanbul 00:00 anıdır: yalnız bu andan önce beklemeye girmiş öğeler aday olur. (gun, hoca) için parti varsa o hocaya dokunulmaz (INSERT ... ON CONFLICT DO NOTHING, hoca başına ayrı işlem). İki kural birlikte aynı gün ikinci çalışmayı etkisiz kılar; 30 günden eski partinin silinmesi de tekrarda aynı sonucu verir.",
    does: "1) Adayları toplar: karar verilebilir İncelemede kayıtlar (D05 süzgeci; kilitli birim döneminde yalnız kilitten sonra ulaşanlar; yapıldı cevabı gelmemiş ya da yapılmadı denen oturumun kayıtları hariç), ACIK sorun bildirimleri, dersten sonra işaretlenmiş ve incelenmemiş oturumlar (D07.oturumIsaretleri). 2) Her öğeyi dersin bugünkü hocasına bağlar (D02.dersGetir). 3) Kritikliği bulur: kayda bağlı öğede D08.sonucuDegistirebilirMi; kayıtsız bildirimde D08.ogrenciDevamDurumu'nun tür başına kalan hakkı ile oturumun o türdeki saati (kalan hak 0'ın altında ve kalan hak artı saat en az 0); işaretli oturum kritik sayılmaz. 4) packages/core/src/duzeltmeler/parti.ts partiSec ile sıralar: kritik önce, sonra oturum başlangıcı, bekleme başlangıcı, öğe türü (INCELEME, SORUN_BILDIRIMI, ISARETLI_OTURUM), öğe kimliği; parti boyu kadarını (varsayılan 20) yazar. 5) 30 günden eski partileri siler. 6) Hoca, öğe, kritik öğe ve devreden öğe sayısını ve dünkü partiden çözülen öğe oranını loglar (iç kimlik ve isim yok). Karar, bildirim ve düzeltme değiştirmez."
  }
];

const state_machines = [
  {
    name: "Düzeltme zinciri (oturum ve liste satırı başına; tablo duzeltmeler)",
    states: ['DUZELTMESIZ', 'ETKIN', 'GERI_ALINMIS'],
    transitions: [
      { from: 'DUZELTMESIZ', to: 'ETKIN', by: "POST /v1/duzeltmeler (oncekiDuzeltmeId yok) ya da elle_ekleme öğesi", when: "Oturum başlamış ve yapılmadı denmemiş, liste satırı oturum anında etkin, kod ve saat kuralı geçerli; zincir başı yazılır." },
      { from: 'ETKIN', to: 'ETKIN', by: "POST /v1/duzeltmeler (oncekiDuzeltmeId = son satır)", when: "Değiştirme: yeni DUZELTME satırı son satırın yerine geçer, eski satır kalır. Eşzamanlı ikinci değiştirme DUZELTMELER_DUZELTME_DEGISTI alır." },
      { from: 'ETKIN', to: 'GERI_ALINMIS', by: "POST /v1/duzeltmeler/{id}/geri-al", when: "Geri alınan satır zincirin son satırı ve türü DUZELTME; GERI_ALMA satırı eklenir, kapattığı bildirim yeniden açılır." },
      { from: 'GERI_ALINMIS', to: 'ETKIN', by: "POST /v1/duzeltmeler (oncekiDuzeltmeId = GERI_ALMA satırı ya da null) ya da elle_ekleme öğesi", when: "Yeni düzeltme zinciri GERI_ALMA satırından sürdürür." }
    ]
  },
  {
    name: "Sorun bildirimi (tablo sorun_bildirimleri)",
    states: ['ACIK', 'SURE_DISI', 'DUZELTILDI', 'DEGISIKLIK_YOK'],
    transitions: [
      { from: '(yeni)', to: 'ACIK', by: "sorun_bildirimi öğesi (POST /v1/esitleme/gonderim)", when: "Bildirim anı süre bitişinden önce ve öğrencinin aynı oturumda açık bildirimi yok." },
      { from: '(yeni)', to: 'SURE_DISI', by: "sorun_bildirimi öğesi", when: "Bildirim anı süre bitişinde ya da sonra; saklanır, hocanın varsayılan listesine ve partiye düşmez." },
      { from: 'ACIK', to: 'DUZELTILDI', by: "POST /v1/duzeltmeler (öğede sorunBildirimiId)", when: "Aynı oturum ve liste satırı için düzeltme kabul edilir; aynı işlemde." },
      { from: 'ACIK', to: 'DEGISIKLIK_YOK', by: "POST /v1/duzeltmeler/sorun-bildirimleri/{id}/kapat", when: "Hoca değişiklik yapmadan kapatır." },
      { from: 'DUZELTILDI', to: 'ACIK', by: "POST /v1/duzeltmeler/{id}/geri-al", when: "Bildirimi kapatan düzeltme geri alınır ve öğrencinin aynı oturumda başka açık bildirimi yoktur; kapanış alanları boşalır, olay denetimde." }
    ]
  },
  {
    name: "D09'un tetiklediği kayıt kararı geçişleri (sütunlar D05'in, geçiş D07.kararDegistir)",
    states: ['VAR_KENDI_BEYANI_ONAYSIZ', 'VAR_ONAYLI', 'INCELEMEDE', 'VAR', 'RET'],
    transitions: [
      { from: 'VAR_KENDI_BEYANI_ONAYSIZ', to: 'VAR_ONAYLI', by: "POST /v1/duzeltmeler/kendi-beyani/kararlar (ONAY)", when: "Kayıt hâlâ onaysız Kendi beyanı, oturumun kafa sayısı ya da yapıldı cevabı gelmiş, birim dönemi kilitli değil." },
      { from: 'VAR_KENDI_BEYANI_ONAYSIZ', to: 'RET', by: "POST /v1/duzeltmeler/kendi-beyani/kararlar (RET)", when: "Aynı koşullar; gerekçe D07 kataloğundan (D07-B01 önerisi KENDI_BEYANI_REDDEDILDI), son durum Yok, seviye yeniden hesaplanır." },
      { from: 'INCELEMEDE', to: 'VAR', by: "POST /v1/duzeltmeler/incelemeler/kararlar (ONAY, baglam INCELEME)", when: "beklenenKarar tutar, D07 karara izin verir (kilitte donmamış); gerekçe D07 kataloğundan (öneri HOCA_ONAYLADI); aynı oturumda sayılan kayıt varsa kayıt sayılmayan Var kalır." },
      { from: 'INCELEMEDE', to: 'RET', by: "POST /v1/duzeltmeler/incelemeler/kararlar (RET, baglam INCELEME)", when: "beklenenKarar tutar; gerekçe D07 kataloğundan (öneri INCELEME_REDDEDILDI)." },
      { from: 'VAR', to: 'RET', by: "POST /v1/duzeltmeler/incelemeler/kararlar (RET, baglam ISARETLI_OTURUM)", when: "Oturumda dersten sonra çıkmış, incelenmemiş kafa sayısı işareti var; gerekçeyi D07 verir." }
    ]
  },
  {
    name: "İlk kayıt teyidi (alan D01'in, geçiş D01.ogrenciTeyitEt ve ogrenciTeyidiniReddet)",
    states: ['BEKLIYOR', 'TEYITLI', 'REDDEDILDI'],
    transitions: [
      { from: 'BEKLIYOR', to: 'TEYITLI', by: "POST /v1/duzeltmeler/teyitler/kararlar (TEYIT)", when: "Öğrencinin hocanın derslerinden birinde etkin liste satırı var; toplu öğe yalnız toplu gruptan." },
      { from: 'BEKLIYOR', to: 'REDDEDILDI', by: "POST /v1/duzeltmeler/teyitler/kararlar (RET)", when: "Aynı yetki; hesabın ve beklemedeki kayıtların akıbeti D01'in kuralı (D09-A04)." }
    ]
  }
];

const invariants = [
  "Uygulama rolleri (yoklama_api, yoklama_isci) duzeltmeler ve denetim_kayitlari tablolarında yalnız SELECT ve INSERT yapar; sorun_bildirimleri'nde yalnız durum, kapatan_kisi_id, kapanis_ani ve kapanis_islem_id sütunlarını günceller; üç tabloda DELETE ve TRUNCATE yoktur. Silme ve anonimleştirme yalnız saklama süresi dolunca sahip rolle olur (D12 saklama işi, D09 işleyicisi).",
  "Oturum ve liste satırı başına düzeltmeler tek doğrusal zincirdir: en çok bir zincir başı (kısmi tekil dizin), her satırın en çok bir halefi (tekil dizin), halef aynı oturum ve liste satırındadır (bileşik FK). Etkin düzeltme zincirin son satırıdır; son satır GERI_ALMA ise etkin düzeltme yoktur.",
  "Her sebep kodu tek son duruma bağlıdır; CHECK listesi, Zod şeması, istemci seçenekleri ve son durum işlevi packages/core/src/duzeltmeler/katalog.ts'teki tek tablodan türer, katalog dışında kod yazılamaz.",
  "Belge numarası yalnız GOREVLENDIRME, OGRENCI_ISLERI_YAZISI ve KURUL_KARARI kodlarında bulunur ve orada zorunludur; NFC, kırpılmış, 1 ile 64 karakterdir; loga, iş verisine, adres satırına, denetim ayrıntısına ve öğrencinin indirmesine girmez.",
  "Düzeltme saatleri oturumun o türdeki saatini aşmaz ve toplamı en az 1'dir; OGRENCI_ISLERI_YAZISI'nda uygulama saati 0'dır; tek saatlik oturumda saat seçilmez.",
  "Düzeltme satırında rapor türü, rapor tarihi ve sağlık bilgisi tutulmaz; belge numarası dışında serbest metin alanı yoktur (plan.html#devam).",
  "Son durum yalnız sonDurumOnceligi işlevinden türer: yapılmadı denen oturumda son durum yoktur; etkin düzeltme varsa kodun son durumu kazanır, kapsamadığı saatler kayda göre belirlenir; düzeltme yoksa sayılan kayıt Var (onaysız Kendi beyanında geçici), kararı açık kayıt boş, öbür hâller Yok. Tür başına saatlerin toplamı oturumun saatine eşittir.",
  "D09 kayıt kararını, teyit alanını ve devam sonucunu kendisi yazmaz: karar D07.kararDegistir, teyit D01.ogrenciTeyitEt ve ogrenciTeyidiniReddet, hesap D08.devamHesaplaIsiKoy ile aynı veritabanı işleminde istenir.",
  "D09 uçlarından ve kuyruk öğelerinden geçen her yazma aynı işlemde bir duzeltmeler.* denetim olayı yazar; olay yazılamazsa işlem geri alınır. Tekrar gelen istek bu olayların islem_id'siyle tanınır.",
  "Denetim olayında öğrenci numarası, isim, e-posta, kod, anahtar, jeton ve belge numarası bulunmaz; denetimeYaz yasak alan adlarını ve 8 KB'yi aşan ayrıntıyı reddeder.",
  "Hoca yalnız dersin bugünkü hocası olduğu (D02.dersYetkisi) oturumların düzeltmesini, kararını, bildirimini ve denetim olayını görür ve değiştirir; yetkisiz kaynak 404 ya da öğe sonucu DUZELTMELER_BULUNAMADI alır. Yönetici yalnız GET /v1/duzeltmeler ve GET /v1/duzeltmeler/denetim uçlarını okur; öğrenci hiçbir D09 ucunu çağırmaz, verisi eşitleme indirmesiyle gelir.",
  "Kafa sayısı ya da yapıldı cevabı gelmemiş oturumun kayıtları ve sayıları onay listelerinde, özette ve partide görünmez; hoca kafa sayısını kayıt sayısını görmeden girer (plan.html#kararlar-kafa-sayisi).",
  "Bir öğrenci ve oturum için en çok bir ACIK sorun bildirimi vardır; sorun bildirimi süre yüzünden ret almaz, süre dışı olan SURE_DISI ile saklanır ve hocanın varsayılan listesine düşmez.",
  "Gece inceleme sıralaması yalnız gunluk_inceleme_partileri tablosuna yazar ve oradan siler; karar, bildirim ve düzeltme değiştirmez; (gün, hoca) partisi bir kez yazılır.",
  "Kural taşıyan her an (olusturma_ani, ulasma_ani, olay_ani, süre sınırları, parti günü) bileşim kökünden verilen saat arayüzünden gelir; kural kodunda SQL now() ve Date.now() yoktur.",
  "Öğrencinin gördüğü veriyi değiştiren her yazma, öğrencinin hesabı varsa aynı işlemde D06.ogrenciDurumuDegisti çağırır; devam sonucunu etkileyen her yazma D08.devamHesaplaIsiKoy ile hesap işini koyar (hesapsız öğrencide ders düzeyinde, öğrenci kimliği null).",
  "Kuyruktan gelen öğe iki kez işlense de tek satır yazılır (öğe kimliği birincil anahtar); aynı kimlik farklı içerikle gelirse öğe RET DUZELTMELER_KIMLIK_CAKISMASI alır ve saklanan satır değişmez.",
  "Kayıt kararının gerekçe kodlarını D07 seçer; D09 D07.kararDegistir'e yalnız kaynağı (tür HOCA, kişi, işlem: KENDI_BEYANI_ONAY, KENDI_BEYANI_RET, INCELEME_ONAY, INCELEME_RET, ISARETLI_OTURUM_RET, işlem kimliği) verir ve gerekçe sabitlerini D07 sözleşmesinden okur.",
  "Dönem kilidinden sonra düzeltme açık kalır ve sonradan değişenler listesinde kaynağıyla görünür; kilitte donan kararlar listelenmez, D07'nin izin vermediği karar isteği DUZELTMELER_DONEM_KILITLI alır.",
  "Sorun bildirimi süresi 72 saattir: kayda bağlı bildirimde öğrencinin gördüğü karar sürümünün telefona ulaştığı andan (D06.kararTeslimAni; bilinmiyorsa ulaşma anı), kayıtsız bildirimde oturumun bitişinden başlar; bildirim anı saat belgesiyle çapalanmış oluşturma anıdır, doğrulanamazsa ulaşma anı.",
  "D09 başka modülün tablosuna yazmaz, yalnız şu dış yüzleri çağırır: D01 kisiGetir, ogrenciHesabiGetir, cihazGetir, yetkiDenetle, ogrenciTeyitEt, ogrenciTeyidiniReddet; D02 dersGetir, dersYetkisi, dersSubeleri, oturumGetir, oturumlariGetir, oturumSubeleri, birimDonemiGetir, kilitDurumu; D03 listeSatirlari, satirGetir, ogrencininEtkinSatirlari; D05 kayitGetir, oturumKayitlari, sayilanKayitlar; D06 ogeTuruKaydet, indirmeKaynagiKaydet, ogrenciDurumuDegisti, gondermeSuresiSonu, kararTeslimAni; D07 kararDegistir, oturumIsaretleri, isaretIncelendi, cihazDogrulanmadiMi; D08 devamHesaplaIsiKoy, dersSonuclari, ogrenciDevamDurumu, sonucuDegistirebilirMi; D10 aksisAnligiGetir; D12 islem, saklamaIsleyicisiKaydet, kisitAdi; D13 rotalariKaydet, uygulamaHatasi, istekKimligi, hizSinifi; D14 isTanimla. Saat arayüzü (infra/saat) ve ayarlar bileşim kökünden parametreyle gelir."
];

const exportsList = [
  { name: 'denetimeYaz', signature: "denetimeYaz(tx: Islem, olay: DenetimOlayiGirdisi): Promise<{ id: string }>", purpose: "[yaprak] modules/duzeltmeler/yaprak.ts. Bütün modüllerin tek denetim yazma yolu: zarfı Zod'la doğrular, yasak alan adlarını (ogrenciNo, numara, adSoyad, ad, eposta, kod, anahtar, jeton, belgeNo; iç içe de) ve 8 KB'yi aşan ayrıntıyı reddeder, satırı çağıranın işleminde ekler; hata çağıranın işlemini geri aldırır. Başka modül çağırmaz; olay anını çağıran saat arayüzünden verir. DenetimOlayiGirdisi (packages/contracts/src/duzeltmeler.ts): { tur: '<modül>.<olay>', ani: Date, yapan: { tur: 'KISI', kisiId, rol } | { tur: 'SISTEM' | 'KOMUT_SATIRI' }, istemci: TELEFON | PANEL | KURSU | SUNUCU, istekKimligi?, islemId?, istemciAni?, donemId?, dersId?, oturumId?, ogrenciId?, listeSatiriId?, kayit?: { donemId, kayitId }, hedef?: { tur, id }, kod?, onceki?, sonraki?, ayrinti? }." },
  { name: 'duzeltmeleriGetir', signature: "duzeltmeleriGetir(tx: Islem, suzgec: { oturumIdler?: readonly string[]; listeSatiriIdler?: readonly string[]; dersId?: string; sonrasi?: Date; yalnizZincirSonu?: boolean }): Promise<DuzeltmeSatiri[]>", purpose: "D08 (son durum ve devam hesabı), D05 (oturum kayıtları ekranının düzeltme sütunu) ve D10 için. Süzgeçte oturumIdler, listeSatiriIdler ya da dersId'den biri zorunludur (tam tablo taraması yok). DuzeltmeSatiri: { id, islemId, tur, sebepKodu, sonDurum, donemId, dersId, oturumId, listeSatiriId, kayit, belgeNo, teoriSaat, uygulamaSaat, oncekiDuzeltmeId, sorunBildirimiId, kaynak, yapanKisiId, istemciAni, olusturmaAni }; GERI_ALMA satırları zincir için döner." },
  { name: 'sonDurumOnceligi', signature: "sonDurumOnceligi(kayitlar: readonly SonDurumKaydi[], duzeltmeler: readonly SonDurumDuzeltmesi[], oturum: SonDurumOturumu): OturumSonDurumu", purpose: "packages/core/src/duzeltmeler/son-durum.ts, saf, Intl'siz, bir öğrenci ve bir oturum için. SonDurumKaydi: { sayilan, karar: VAR | BEKLEMEDE | INCELEMEDE | RET, kendiBeyani, onayli }; SonDurumDuzeltmesi: { id, tur, sebepKodu, teoriSaat, uygulamaSaat, oncekiDuzeltmeId }; SonDurumOturumu: { teoriSaat, uygulamaSaat, yapildi: boolean | null }; OturumSonDurumu: { sonDurum: VAR | YOK | GOREVLI | BELGELI_DUZELTME | ELLE_EKLENDI | null, harf, gecici, kaynak: DUZELTME | KAYIT | KAYITSIZ | YAPILMADI, etkinDuzeltmeId, oturumOnayBekliyor, teori: { var, yok, mazeretli, acik }, uygulama: aynı }. contracts.json'daki iki parametreli imzaya oturum üçüncü parametre olarak eklendi (yalnız ekleme). D08, D10, panel ve telefon aynı işlevi kullanır; Devamdan muaf ders düzeyinde D08 ve D10'da uygulanır." },
  { name: 'elleEklemeOgesi', signature: "elleEklemeOgesi(tx: Islem, oge: KuyrukOgesi): Promise<OgeSonucu>", purpose: "elle_ekleme kuyruk öğesinin işleyicisi; eklenti.ts'te D06.ogeTuruKaydet('elle_ekleme', ...) ile kaydolur. Gövde ElleEklemeGovdesi: { id: UUIDv7, oturumId, listeSatiriId, sebepKodu: TELEFON_YOK_CALISMIYOR | QR_OKUTAMADI, teoriSaat: tam sayı ya da null, uygulamaSaat: tam sayı ya da null }. Oturumun rolü HOCA olmalı. KuyrukOgesi ve OgeSonucu tipleri packages/contracts/src/esitleme.ts'te (D06)." },
  { name: 'sorunBildirimiOgesi', signature: "sorunBildirimiOgesi(tx: Islem, oge: KuyrukOgesi): Promise<OgeSonucu>", purpose: "sorun_bildirimi kuyruk öğesinin işleyicisi; D06.ogeTuruKaydet('sorun_bildirimi', ...) ile kaydolur. Gövde SorunBildirimiGovdesi: { id: UUIDv7, oturumId, kayit: { donemId, kayitId } ya da null, kararSurumu: metin (64 bit) ya da null, nedenKodu }. Oturumun rolü OGRENCI olmalı. Süre dışı bildirim KABUL ve DUZELTMELER_SURE_DISI bilgisiyle saklanır." },
  { name: 'ogrencininSorunBildirimleri', signature: "ogrencininSorunBildirimleri(tx: Islem, ogrenciId: string, surumden: string | null): Promise<OgrenciSorunBildirimi[]>", purpose: "Öğrencinin açık dönemlerdeki bütün sorun bildirimleri ve durumları, tam liste (surumden yalnız imza uyumu için; D06-B11 tam liste kararı). D06.indirmeKaynagiKaydet('sorun_bildirimleri', ...) ile kaydolur. Öğrencinin düzeltmeleri ayrı 'duzeltmeler' kaynağıyla duzeltmeleriGetir üstünden iner; belge numarası ve yapan inmez." },
  { name: 'SEBEP_KODLARI, NEDEN_KODLARI, SON_DURUMLAR', signature: "SEBEP_KODLARI: readonly SebepKoduTanimi[]; NEDEN_KODLARI: readonly NedenKoduTanimi[]; SON_DURUMLAR: readonly SonDurumTanimi[]", purpose: "packages/core/src/duzeltmeler/katalog.ts; contracts.json listesine ek (yalnız ekleme). SebepKoduTanimi: { kod, sonDurum, belgeZorunlu, izinliSaatTurleri, haksizDevamsizSayilir, kuyruktaSecilebilir }; SonDurumTanimi: { kod, harf, saatSinifi: VAR | MAZERETLI }. D08 saat sınıfını, D10 harfi ve Haksız devamsız bayrağını, istemciler seçenekleri buradan okur." }
];

const files = [
  'apps/server/src/modules/duzeltmeler/index.ts',
  'apps/server/src/modules/duzeltmeler/yaprak.ts',
  'apps/server/src/modules/duzeltmeler/eklenti.ts',
  'apps/server/src/modules/duzeltmeler/tablolar.ts',
  'apps/server/src/modules/duzeltmeler/rotalar.ts',
  'apps/server/src/modules/duzeltmeler/yetki.ts',
  'apps/server/src/modules/duzeltmeler/zincir-deposu.ts',
  'apps/server/src/modules/duzeltmeler/duzeltme-servisi.ts',
  'apps/server/src/modules/duzeltmeler/elle-ekleme-ogesi.ts',
  'apps/server/src/modules/duzeltmeler/sorun-bildirimi-ogesi.ts',
  'apps/server/src/modules/duzeltmeler/sorun-bildirimi-servisi.ts',
  'apps/server/src/modules/duzeltmeler/onay-listeleri.ts',
  'apps/server/src/modules/duzeltmeler/karar-servisi.ts',
  'apps/server/src/modules/duzeltmeler/teyit-servisi.ts',
  'apps/server/src/modules/duzeltmeler/sonradan-degisenler.ts',
  'apps/server/src/modules/duzeltmeler/denetim-sorgulari.ts',
  'apps/server/src/modules/duzeltmeler/denetim-ayrinti.ts',
  'apps/server/src/modules/duzeltmeler/denetim-ayrinti.test.ts',
  'apps/server/src/modules/duzeltmeler/indirme-kaynaklari.ts',
  'apps/server/src/modules/duzeltmeler/saklama.ts',
  'apps/server/src/modules/duzeltmeler/imlec.ts',
  'apps/server/src/jobs/duzeltmeler/index.ts',
  'apps/server/src/jobs/duzeltmeler/gece-inceleme-siralamasi.ts',
  'packages/contracts/src/duzeltmeler.ts',
  'packages/core/src/duzeltmeler/index.ts',
  'packages/core/src/duzeltmeler/katalog.ts',
  'packages/core/src/duzeltmeler/son-durum.ts',
  'packages/core/src/duzeltmeler/zincir.ts',
  'packages/core/src/duzeltmeler/belge-no.ts',
  'packages/core/src/duzeltmeler/saat-kurali.ts',
  'packages/core/src/duzeltmeler/sorun-suresi.ts',
  'packages/core/src/duzeltmeler/parti.ts',
  'packages/core/src/duzeltmeler/katalog.test.ts',
  'packages/core/src/duzeltmeler/son-durum.test.ts',
  'packages/core/src/duzeltmeler/zincir.test.ts',
  'packages/core/src/duzeltmeler/belge-no.test.ts',
  'packages/core/src/duzeltmeler/saat-kurali.test.ts',
  'packages/core/src/duzeltmeler/sorun-suresi.test.ts',
  'packages/core/src/duzeltmeler/parti.test.ts',
  'apps/server/test/features/duzeltmeler/duzeltme.feature',
  'apps/server/test/features/duzeltmeler/geri-alma.feature',
  'apps/server/test/features/duzeltmeler/elle-ekleme.feature',
  'apps/server/test/features/duzeltmeler/sorun-bildirimi.feature',
  'apps/server/test/features/duzeltmeler/kendi-beyani.feature',
  'apps/server/test/features/duzeltmeler/inceleme.feature',
  'apps/server/test/features/duzeltmeler/isaretli-oturum.feature',
  'apps/server/test/features/duzeltmeler/ilk-kayit-teyidi.feature',
  'apps/server/test/features/duzeltmeler/onay-ozeti.feature',
  'apps/server/test/features/duzeltmeler/gece-inceleme-siralamasi.feature',
  'apps/server/test/features/duzeltmeler/sonradan-degisenler.feature',
  'apps/server/test/features/duzeltmeler/denetim-kaydi.feature',
  'apps/server/test/features/duzeltmeler/yetki.feature',
  'apps/server/test/features/duzeltmeler/indirme.feature',
  'apps/server/test/steps/duzeltmeler/duzeltme-adimlari.ts',
  'apps/server/test/steps/duzeltmeler/onay-adimlari.ts',
  'apps/server/test/steps/duzeltmeler/sorun-bildirimi-adimlari.ts',
  'apps/server/test/steps/duzeltmeler/denetim-adimlari.ts',
  'apps/server/test/steps/duzeltmeler/gece-isi-adimlari.ts',
  'apps/server/test/support/kurucular/duzeltmeler.ts'
];

const t = (kind, name, asserts) => ({ name, kind, asserts });
const tests = [
  t('behavior', "Görevli düzeltmesi belge numarasıyla girilir", "POST /v1/duzeltmeler öğesi KABUL; satır tur DUZELTME, sebep GOREVLENDIRME, belge NFC ve kırpılmış; son durum G; aynı işlemde duzeltmeler.duzeltme_eklendi olayı, devam_hesapla işi ve öğrenci durum sürümü artışı var. Ret beklentili adımlar önce kırmızı yazılır."),
  t('behavior', "Belgesiz Görevli ve belgeli beyana dayalı düzeltme reddedilir", "Görevli'de belgeNo null öğesi RET DUZELTMELER_BELGE_NO_GEREKLI, BEYANA_DAYALI'da belgeNo dolu öğesi RET DUZELTMELER_BELGE_NO_YASAK, satır yazılmaz. Kontrol: aynı öğeler doğru belge alanıyla KABUL."),
  t('behavior', "Öğrenci işleri yazısında uygulama saati seçilemez", "uygulamaSaat 1 öğesi RET DUZELTMELER_SAAT_TURU_YASAK; teori saati olmayan oturumda da RET. Kontrol: teori saatiyle KABUL ve uygulama_saat 0."),
  t('behavior', "Saat sınırı ve blok ders", "Oturumun teori saatinden fazlası RET DUZELTMELER_SAAT_GECERSIZ; 3 saatlik blokta 2 saatlik Elle eklendi KABUL ve kalan saat kayda göre Yok; tek saatlik oturumda farklı saat RET."),
  t('behavior', "Başka hocanın dersi görülmez ve düzeltilmez", "Başka hocanın oturumuna öğe RET DUZELTMELER_BULUNAMADI, GET /v1/duzeltmeler o dersId ile 404, denetime olay yazılmaz. Kontrol: kendi dersinde aynı öğe KABUL."),
  t('behavior', "Öğrenci ve yönetici düzeltme yazamaz", "Öğrenci oturumuyla POST 403, yönetici oturumuyla POST 403; yönetici GET /v1/duzeltmeler 200 (pozitif kontrol)."),
  t('behavior', "Aynı öğe kimliği iki kez gelince tek satır", "Aynı id ve içerik ikinci istekte ZATEN_VAR ve satır sayısı 1; aynı id farklı sebep kodu RET DUZELTMELER_KIMLIK_CAKISMASI, saklanan satır değişmez."),
  t('behavior', "Değiştirme ve geri alma zinciri", "oncekiDuzeltmeId ile değiştirme KABUL, eski satır kalır, etkin satır yeni; geri-al GERI_ALMA satırı yazar ve son durum kayda döner; ikinci geri-al 409 DUZELTMELER_ZATEN_GERI_ALINDI; geri alınmış zincirde yeni düzeltme KABUL."),
  t('behavior', "Eşzamanlı iki değiştirmeden biri kazanır", "Aynı oncekiDuzeltmeId ile iki istek aynı anda: biri KABUL, öbürü DUZELTMELER_DUZELTME_DEGISTI; zincirde dal yok, etkin satır tek."),
  t('behavior', "Etkin düzeltme varken oncekiDuzeltmeId'siz düzeltme reddedilir", "RET DUZELTMELER_DUZELTME_VAR, zincir değişmez. Kontrol: geri almadan sonra aynı öğe KABUL."),
  t('behavior', "Hocanın internetsiz elle eklemesi kuyrukla gelir", "POST /v1/esitleme/gonderim içindeki elle_ekleme öğesi KABUL; satır kaynak TELEFON_KUYRUGU, istemci_ani çapalı an, kurulum ve sıra dolu; aynı öğe yeniden gelince ZATEN_VAR; son durum E."),
  t('behavior', "Etkin düzeltmesi olan öğrenciye kuyruktan elle ekleme yazılmaz", "Panelde Görevli girilmiş öğrenciye gelen elle_ekleme RET DUZELTMELER_DUZELTME_VAR ve duzeltmeler.elle_ekleme_reddedildi olayı; zincir değişmez."),
  t('behavior', "Sorun bildirimi süresinde hocanın listesine düşer", "sorun_bildirimi öğesi KABUL, durum ACIK, sure_bitis_ani teslim anı artı 72 saat; hocanın GET listesinde ve öğrencinin eşitleme indirmesinde görünür."),
  t('behavior', "Süre dışı sorun bildirimi saklanır, listeye düşmez", "Sahte saatle bildirim anı bitiş anına eşit: SURE_DISI, varsayılan listede yok, SURE_DISI görünümünde var; bitişten 1 ms önce ACIK (sınır kontrolü)."),
  t('behavior', "Kayıtsız bildirimde süre ders bitişinden başlar, teslim anı yoksa bildirim süre içindedir", "Kaydı olmayan oturumda sure_baslangic_ani oturumun bitişi; kayda bağlı ama teslim anı olmayan bildirimde başlangıç ulaşma anı ve durum ACIK."),
  t('behavior', "Öğrencinin ikinci açık bildirimi reddedilir", "Aynı oturuma ikinci bildirim RET DUZELTMELER_ACIK_BILDIRIM_VAR. Kontrol: ilki kapandıktan sonra süre içindeki yeni bildirim KABUL."),
  t('behavior', "Bildirim düzeltmeyle kapanır, düzeltme geri alınınca yeniden açılır", "sorunBildirimiId taşıyan düzeltme bildirimi DUZELTILDI yapar; geri-al bildirimi ACIK'a döndürür; iki geçiş de denetimde ve öğrencinin indirmesinde."),
  t('behavior', "Bildirim değişiklik yapmadan kapanır", "kapat DEGISIKLIK_YOK yapar, kapatan ve an dolu; aynı islemId ile tekrar 200; kapalı bildirime başka islemId ile kapat 409 DUZELTMELER_BILDIRIM_ACIK_DEGIL."),
  t('behavior', "Kendi beyanı toplu onayı yalnız görülen ve bekleyen kayıtları işler", "Liste alındıktan sonra gelen kayıt onaylanmaz ve listede kalır; başka cihazdan onaylanmış kayıt ZATEN_KARAR_VERILMIS; onaylananlar onaylı Var."),
  t('behavior', "Kendi beyanı reddi kaydı Ret ve son durumu Yok yapar", "RET sonrası kararı Ret ve gerekçesi D07 sözleşmesinden içe aktarılan Kendi beyanı reddi kodu (sabit yeniden yazılmaz), son durum Y, devam_hesapla işi kuyrukta, öğrenci durum sürümü artmış."),
  t('behavior', "Kafa sayısı gelmemiş oturumun kayıtları görünmez", "Yapıldı cevabı yokken kendi-beyani ve incelemeler oturumu kafaSayisiBekleyenOturumlar'da verir, kayıt ve sayı vermez; karar isteği DUZELTMELER_KAFA_SAYISI_BEKLENIYOR. Kontrol: kafa sayısı girilince kayıtlar görünür."),
  t('behavior', "İncelemede kayıt onayı ve reddi", "ONAY kararı Var yapar ve kayıt sayılır; öğrencinin aynı oturumda sayılan kaydı varsa KABUL ve DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR, kısmi tekil dizin korunur; beklenenKarar tutmazsa ZATEN_KARAR_VERILMIS."),
  t('behavior', "Kilitte donan kayıt onaylanamaz, kilitten sonra ulaşan onaylanır", "Kilitte İncelemede donan kayıt listede yok ve kararı DUZELTMELER_DONEM_KILITLI; kilitten sonra ulaşan kayıt listede, onayı KABUL ve sonradan değişenlerde görünür."),
  t('behavior', "İlk kayıt teyidi grupları ve toplu teyit", "teyitler dört grubu döner; toplu öğe cihazı doğrulanmamış öğrenci için RET DUZELTMELER_TEK_TEK_ONAYLANMALI; tek tek TEYIT KABUL; teyit edilen öğrenci başka hocanın listesinden düşer; hocanın listelerinde olmayan öğrenci DUZELTMELER_BULUNAMADI."),
  t('behavior', "İşaretli oturum incelemesi", "Dersten sonra işaretlenen oturum listede ve partide; baglam ISARETLI_OTURUM ile Var kayıt RET; incelendi işareti kapatır ve oturum listeden düşer; işaretsiz oturumda RET DUZELTMELER_ISARETLI_OTURUM_DEGIL."),
  t('behavior', "Onay özeti menü sayısını verir", "toplam = kendiBeyani + teyit.toplu + teyit.tekTek + inceleme + sorunBildirimi + isaretliOturum; kafa sayısı bekleyen oturum ayrı sayılır ve toplamı değiştirmez."),
  t('behavior', "Gece sıralaması kritikleri önce, sonra en eskileri koyar", "25 bekleyen öğeli hocada partide 20 öğe; D08'in kritik dediği öğeler önce; kalan 5 ertesi gece partisinde; gün 00:00'dan sonra beklemeye giren öğe o günün partisinde yok."),
  t('behavior', "Gece işi aynı gün ikinci kez çalışınca partiyi değiştirmez", "Sahte saat İstanbul 02:00 (UTC 23:00): parti günü İstanbul tarihi; ikinci çalışmada satırlar birebir aynı; 30 günden eski parti silinir."),
  t('behavior', "Gece işi hiçbir kararı, bildirimi ve düzeltmeyi değiştirmez", "İşten önce ve sonra yoklama kararları, sorun bildirimleri ve düzeltmeler aynı. Kontrol: parti satırları yazılmış, boş çıktı testi geçirmez."),
  t('behavior', "Sonradan değişenler üç bölümü doğru kurar", "7 günden geç ulaşıp sayılan kayıt gecUlasanlar'da; kilitten sonra Elle eklendi düzeltmesi sonucu DEVAMSIZ'dan DEVAMLI'ya çeviren öğrenci sonucuDegisenler'de kaynağıyla; kilitten sonra ulaşan kayıt sayilirsaDegisecekler'de ve sayım değişmez."),
  t('behavior', "Uygulama rolü denetim ve düzeltme satırlarını değiştiremez", "yoklama_api ile denetim_kayitlari ve duzeltmeler üzerinde UPDATE ve DELETE 42501; INSERT ve SELECT çalışır (pozitif kontrol); sorun_bildirimleri'nde neden_kodu UPDATE 42501, durum UPDATE çalışır."),
  t('behavior', "Denetim olayına kişisel veri yazılamaz", "Ayrıntısında ogrenciNo, adSoyad, eposta ya da kod alanı olan olay reddedilir ve satır yazılmaz; iç kimlikli aynı olay yazılır; 8 KB'yi aşan ayrıntı reddedilir."),
  t('behavior', "Denetim okuma yetkisi ve sayfalama", "Hoca kendi dersinin olaylarını görür, başka dersin dersId'siyle 404; yönetici hepsini okur; öğrenci 403; sayfalar arasında eşzamanlı eklemede satır atlanmaz ve tekrar etmez."),
  t('behavior', "Saklama işleyicisi yalnız sahip rolle ve süre verilince siler", "Varsayılan 'silme yok' ayarında işleyici hiçbir satır silmez; süre verilip sahip rolle çağrılınca dönemin D09 satırlarını siler ya da kişi bağlarını boşaltır ve satır sayısını D12'ye döner; uygulama rolüyle aynı silme 42501."),
  t('behavior', "Öğrencinin düzeltmeleri ve bildirimleri eşitleme indirmesinde iner", "Düzeltme ve bildirimden sonra öğrenci durum sürümü artar; GET /v1/esitleme/degisiklikler D09 bölümlerinde öğrencinin satırları var, belge numarası ve yapan yok, başka öğrencinin satırı yok."),
  t('property', "Son durum önceliği tek ve tam", "fast-check, en az 2000 deneme: her girdiye tek sonuç; tür başına var + yok + mazeretli + açık = oturum saati (yapılmadıysa 0); kayıt ve düzeltme sırası sonucu değiştirmez; etkin düzeltme yokken kararı açık kayıt boş son durum verir; Ret kaydı ve kayıtsızlık Y verir."),
  t('property', "Düzeltme zinciri doğrusal kalır", "Rastgele ekle, değiştir, geri al dizilerinde (en az 1000 deneme) zincir başı tek, her satırın en çok bir halefi, etkin satır son satır; son satır GERI_ALMA ise etkin yok; zincir hatası yalnız bozuk girdide."),
  t('property', "Belge numarası normalleştirmesi", "belgeNoNormalize iki kez uygulanınca aynı sonuç; sonuç NFC, başta ve sonda boşluk yok; 64 karakteri aşan ve denetim karakterli girdi hata; Türkçe harfler korunur."),
  t('property', "Sorun bildirimi süresi sınırı", "Her başlangıç için bitiş = başlangıç + 72 saat; bildirim anı bitişten önceyse ACIK, değilse SURE_DISI; teslim anı yoksa ACIK; sonuç TZ=UTC ve TZ=Europe/Istanbul koşularında aynı."),
  t('property', "Parti seçimi belirlenimli", "Aday dizisinin her permütasyonunda aynı parti; en çok parti boyu öğe; her kritik öğe her kritik olmayandan önce; aynı kritiklikte eski oturum önce; iki kez çalıştırma aynı sonucu verir."),
  t('property', "Saat kuralı", "Rastgele oturum saatlerinde kabul edilen düzeltme oturumu aşmaz ve toplamı en az 1; tek saatlik oturumda boş saat oturumun saatine çözülür; OGRENCI_ISLERI_YAZISI'nda uygulama 0."),
  t('contract', "Katalog, CHECK ve Zod aynı", "packages/contracts/src/duzeltmeler.ts SebepKodu ve NedenKodu listeleri katalogla birebir; göçteki CHECK listeleri katalogdan üretilen değerle aynı (D12 şema testiyle); cevaplarda x-extensible-enum işareti var."),
  t('contract', "Rota listesi contracts.json ile birebir", "duzeltmeler rota listesinde 16 uç var, yöntem ve yollar contracts.json owns_endpoints ile aynı; her uç zorunlu kimlik alanı taşır; GET uçları yazma açmaz."),
  t('contract', "Hata kodları sözleşmede ve senaryoda", "Her DUZELTMELER_ kodu tek HTTP durumuna ya da öğe sonucuna bağlı ve en az bir senaryoda gerçekten döner; kullanılmayan kod katalogda kalmaz."),
  t('contract', "Denetim olay türü önekleri", "Bütün modüllerin sözleşme dosyalarındaki olay türleri <modül>.<olay> biçiminde ve denetim_kayitlari CHECK desenine uyar; duzeltmeler.* ayrıntı şemaları kişisel alan taşımaz."),
  t('load', "Onay özeti ve listeler süre bütçesinde", "6 dersli, ders başına 150 öğrenci ve 40 oturumlu hocada GET /v1/duzeltmeler/onaylar/ozet 95. yüzdelikte 300 ms, incelemeler ve teyitler 600 ms altında (k6, yayın öncesi gerçek sunucu boyutu); aşılırsa D09-A09'daki toplu okumalar istenir."),
  t('load', "Gece işi süre bütçesi", "3.000 hoca ve 60.000 bekleyen öğeyle gece_inceleme_siralamasi 10 dakikada biter; öğe başına sorgu sayısı sabit kalır."),
  t('mutation', "Ortak kurallar mutasyon testi", "Stryker (haftalık iş) packages/core/src/duzeltmeler için kırma eşiği yüzde 80; son-durum, zincir, sorun-suresi ve parti dosyalarında yaşayan mutant gerekçesiz kalmaz."),
  t('mutation', "Korumalar bozulunca test kırmızı olur", "denetim_kayitlari'na UPDATE yetkisi verilince yetki senaryosu, zincir başı kısmi tekil dizini kaldırılınca eşzamanlı değiştirme senaryosu, kafa sayısı gizleme koşulu kaldırılınca gizleme senaryosu kırmızı olur; bozma geri alınınca yeşile döner.")
];

const g = (gap, decision, why) => ({ gap, decision, why });
const resolved_gaps = [
  g('D09-B01', "Katalog packages/core/src/duzeltmeler/katalog.ts'te sabit tablo; değerler BÜYÜK_HARF ASCII ve sözleşmeyle aynı: GOREVLENDIRME (Görevli, belge zorunlu, teori ve uygulama), OGRENCI_ISLERI_YAZISI (Belgeli düzeltme, belge zorunlu, yalnız teori), KURUL_KARARI (Belgeli düzeltme, belge zorunlu, teori ve uygulama), BEYANA_DAYALI, TELEFON_YOK_CALISMIYOR ve QR_OKUTAMADI (Elle eklendi, belgesiz, Haksız devamsız sayımına girer; son ikisi kuyruktaki elle eklemede de seçilir). 'Yoklamada sınıfta değil' katalogda yok (D09-C05). CHECK, Zod şeması, istemci seçenekleri ve son durum işlevi bu tablodan türer; cevaplarda x-extensible-enum.", "teknik.html#sunucu-mimari kod listelerini metin ve CHECK ile tutar; plan.html#gun-son-durumlar her kodu tek son duruma bağlar; tek tablo dört tüketicinin ayrışmasını önler."),
  g('D09-B02', "Ara karar: kaydı sayılan öğrencide 'saatin bir kısmı var' için kod yok, sunucu bunu kabul etmez; saat seçimi düzeltme kodlarının kendisinde var (ör. 3 saatin 2'si Elle eklendi ya da Görevli). Kalıcı kod sahibin kararı: D09-A01.", "Her düzeltme sebep koduyla girilir (plan.html#devam); kodsuz satır yazılamaz ve yeni kod ürün kararıdır."),
  g('D09-B03', "Ara karar: iki kod; OGRENCI_ISLERI_YAZISI yalnız teori (CHECK ile uygulama_saat 0), KURUL_KARARI saat türü serbest; ikisi de Belgeli düzeltme ve belge zorunlu. Öğrenci işleri yazısının rapor dışında gelip gelmediği D09-A02.", "plan.html#gun-son-durumlar Belgeli düzeltmeyi iki kaynakla tanımlar, plan.html#devam rapora dayananı yalnız teoriye bağlar; rapor türü tutulmadığından ayrım kaynağın kodudur ve CHECK'le zorlanır."),
  g('D09-B04', "Bir istek en çok 200 öğe taşır; her öğe tek oturum ve tek liste satırıdır, hepsi aynı islemId ile yazılır. Belgenin kapsadığı oturumları panel seçer, sunucu tarih aralığını kendisi genişletmez. Satırda teori_saat ve uygulama_saat ayrıdır; boş gelen tür oturumun o türdeki bütün saatleridir; tek saatlik oturumda seçim yoktur.", "Öğe başına doğrulama ve sonuç (D13-B28) ve karma blok oturum (D02-B04) ayrı saat ister; açık öğe listesi sunucuyu tarih yorumundan kurtarır, toplu giriş hocanın ders başına 2 dakika hedefini korur (plan.html#hedefler)."),
  g('D09-B05', "Düzeltme (oturum_id, liste_satiri_id) ile bağlanır, ikisi zorunlu; kayıt (dönem, kimlik) çifti isteğe bağlıdır, ikisi birlikte boş ya da dolu (CHECK), doluysa yoklama_kayitlari'na FK. Sorun bildirimi (oturum_id, ogrenci_id) ile bağlanır; liste satırı ve kayıt çifti isteğe bağlıdır.", "Hesabı olmayan öğrenci yalnız liste satırıyla vardır (D03-B08); yer tutucu kayıt imzalı kanıtı bulandırır (teknik.html#veritabani); kayda başvuru çiftle olur (teknik.html#veritabani-donem-alani)."),
  g('D09-B06', "sonDurumOnceligi: yapılmadı denen oturumda son durum yok; zincirin etkin satırı varsa onun son durumu ve kapsadığı saatler (Görevli ve Belgeli mazeretli, Elle eklendi var); kapsanmayan saatler ve düzeltmesiz durumda sayılan kayıt Var (onaysız Kendi beyanında geçici), kararı açık kayıt boş, öbürü Yok. Devamdan muaf ders düzeyinde D08 ve D10'da uygulanır.", "Düzeltme kaydı silmez, ikisi yan yana durur; tek işlev rapor, AKSİS, hak hesabı ve telefonun aynı sonucu vermesini sağlar (plan.html#kararlar-olcum, tasarim.html#pnl-drawer)."),
  g('D09-B07', "Yanlış düzeltme silinmez ve güncellenmez: değiştirme yeni DUZELTME satırı (onceki_duzeltme_id son satır), geri alma GERI_ALMA satırı (sebep kodu yok). Zincir veritabanında doğrusal tutulur (zincir başı kısmi tekil dizini, halef tekil dizini, bileşik FK). Geri alınan düzeltme son durumda ve Haksız devamsızda sayılmaz. Geri almanın ayrı neden kodu D09-A03.", "teknik.html#veritabani-donem-alani yalnız ekleme ister; her değişiklik kim, ne zaman, ne ile kalır; kodsuz geri alma yeni ürün kodu açmadan çalışır."),
  g('D09-B08', "Dört tablo: duzeltmeler (yalnız ekleme), sorun_bildirimleri (yalnız durum ve kapanış sütunları güncellenir), denetim_kayitlari (yalnız ekleme), gunluk_inceleme_partileri (işin çalışma tablosu). Hoca kararları ayrı tablo değil: geçmişi D07'nin kayit_karar_gecmisi tablosuna D07.kararDegistir yazar, işlemin olayı D09'un denetim tablosuna. Yetkiler göçte elle yazılan SQL ile.", "contracts.json 'Kayıt kararının tek yazarı' kararı kayit_onayi tablosunu kaldırdı; son durum ve liste sorguları ayrı tablo ister."),
  g('D09-B09', "Tek tablo denetim_kayitlari ve tek yazma yolu yaprak denetimeYaz(tx, olay). Sabit sütunlar: olay türü (<modül>.<olay>), olay anı, yapan (tür, kişi, rol), istemci, istek ve işlem kimliği, istemci anı, dönem, ders, oturum, öğrenci, liste satırı, kayıt çifti, hedef, kod, önceki ve sonraki değer, ayrıntı. Tür listesi ve ayrıntı şeması her modülün sözleşme dosyasında; CHECK biçimi ve modül önekini denetler. Ayrıntıda isim, numara, kod ve jeton yok.", "plan.html#benzer her değişikliğin kaydını ister; itirazda kanıt aranabilmesi ortak biçim ister (plan.html#kararlar-hesap-silme); contracts.json 'Denetim kaydı' kararı."),
  g('D09-B10', "GET /v1/duzeltmeler ve GET /v1/duzeltmeler/denetim: hoca yalnız kendi derslerinin satırlarını ve olaylarını görür (ders süzgeci zorunlu), yönetici hepsini salt okur (D01.yetkiDenetle kapsamıyla), öğrenci 403. İkisi keyset sayfalı (D13-B13).", "Hoca düzeltmeleri panelde yürütür (plan.html#hoca), yönetici itirazda okur; başka hocanın dersini görme yasağı (plan.html#baslangic)."),
  g('D09-B11', "İstek hocanın gördüğü kayıt kimliklerini ve işlem kimliğini taşır (en çok 200); sunucu yalnız hâlâ onay bekleyenleri işler, öbürlerine ZATEN_KARAR_VERILMIS döner, ekran açıkken gelen yeni kayıt onaylanmaz. Onay D07.kararDegistir ile kararı Var bırakıp onayı yazdırır; ret kararı Ret yapar (gerekçe D07 kataloğundan, D07-B01 önerisi KENDI_BEYANI_REDDEDILDI), son durum Yok. İkisi de denetime, D08 hesap işine ve öğrenci durum sürümüne gider.", "plan.html#gun-kayit-etiketleri; görülmeyen kaydın onaylanması ve iki cihazın aynı kaydı işlemesi böyle önlenir."),
  g('D09-B12', "Onay D07.kararDegistir ile Var, ret Ret; gerekçeleri D07 kataloğu verir (D07-B01 önerisi HOCA_ONAYLADI ve INCELEME_REDDEDILDI), D09 kaynakta hoca işlemini (INCELEME_ONAY, INCELEME_RET) bildirir. Aynı oturumda öğrencinin sayılan kaydı varsa kısmi tekil dizin korunur, onaylanan kayıt sayılmayan Var kalır, öğe KABUL ve DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR alır. İstek beklenen eski kararı taşır, tutmazsa ZATEN_KARAR_VERILMIS. Kayıt tek listede görünür: kararı İncelemede olan Kendi beyanı kaydı İncelemede listesindedir.", "Kanıt değişmez, dizin korunur (teknik.html#veritabani); karar ve onay aynı işlemde (plan.html#kararlar-supheli-kayit)."),
  g('D09-B13', "Liste, hocanın açık dönemdeki derslerinde etkin liste satırı olan teyitsiz hesaplardan kurulur ve dört gruba ayrılır (öncelik sırasıyla): aynı numarayı isteyen hesaplar, isim eşleşmeyenler, cihazı doğrulanmamışlar (D07.cihazDogrulanmadiMi), toplu teyit edilebilenler. Toplu öğe yalnız son gruptan kabul edilir, öbürleri DUZELTMELER_TEK_TEK_ONAYLANMALI. Biri teyit edince öğrenci herkesin listesinden düşer.", "plan.html#kararlar-e-posta-gonderimi: toplu teyit, doğrulanamayan telefon tek tek, aynı numara hoca kararı, isim eşleşmezse hoca onayı; kural yalnız arayüzde kalmaz."),
  g('D09-B14', "Ara karar: RET kararı desteklenir ve D01.ogrenciTeyidiniReddet'e gider; hesabın ve beklemedeki kayıtların akıbeti D01'in kuralıdır (D01-B22). Sahibin kararı: D09-A04.", "Plan yalnız 'hoca karar verir' diyor; hesabı kapatmak ürün kararıdır."),
  g('D09-B15', "Liste ve uçlar D09'da; teyit alanlarını D01.ogrenciTeyitEt ve ogrenciTeyidiniReddet aynı işlemde yazar; beklemedeki kayıtları D01 aynı işlemde D07 ile karara bağlatır (D01-B23), D09 ayrıca D07 çağırmaz.", "contracts.json 'Teyit ve elle ekleme' kararı; onay listeleri tek modülde, veri sahipliği dış yüzle korunur."),
  g('D09-B16', "Hocanın telefondan yaptığı onay, ret, inceleme, teyit ve bildirim kapatma yazmaları ortak kuyruğa girmez; çevrimiçi ekrandan ortak fetch yardımcısıyla aynı uçlara doğrudan gider. İşlem kimliği ve beklenen eski durum tekrarı ve çakışmayı çözer. Kuyruktan yalnız elle_ekleme (hoca) ve sorun_bildirimi (öğrenci) gelir.", "contracts.json 'Ortak kuyruk tek uçtan gelir' kararı D09'a yalnız bu iki öğe türünü verir; plan.html#kararlar-kayit-ve-makbuz'un saydığı kuyruk öğeleri arasında onay yok; teknik.html#telefon-gonderme-protokolu internet isteyen hoca ekranlarının doğrudan istek yaptığını yazar; liste zaten çevrimiçi okunur."),
  g('D09-B17', "Süre 72 saat. Başlangıç: kayda bağlı bildirimde öğrencinin gönderdiği karar sürümünün telefona ulaştığı an (D06.kararTeslimAni); teslim anı yoksa ya da karar sürümü gelmediyse ulaşma anı (bildirim süre içinde sayılır); kayıtsız bildirimde oturumun bitişi (D02.oturumGetir). Bildirim anı saat belgesiyle çapalanmış oluşturma anı (D06 öğe zarfı), doğrulanamazsa ulaşma anı. Bildirim anı bitişten önceyse ACIK, değilse SURE_DISI. Karar değişince yeni sürümün teslimiyle süre yeniden başlar; yeni bildirim yeni sürümü taşır.", "contracts.json 'Öğrencinin kendi durumu' kararı teslim anını D06'ya verir; sunucu kararın telefona ulaştığını ancak telefonun onayıyla bilir; kayıt saatiyle aynı güven düzeyi (plan.html#gun-saati-degistirmek-neden-ise-yaramaz)."),
  g('D09-B18', "Ara karar: tek seçimli neden kodu, serbest metin yok: TELEFON_YOK_CALISMIYOR, QR_OKUTAMADI, KAYIT_YANLIS_DERSTE (tasarim.html#acik-sorun-nedenleri önerisi ve tasarim.html#sh-d çizimi). İlk ikisi aynı adlı sebep koduna tek dokunuşla çevrilir. Öğrenci ve oturum başına en çok bir ACIK bildirim (kısmi tekil dizin). Listenin onayı D09-A05.", "plan.html#devam serbest metni kaldırır; neden listesi tasarım belgesinde sahibin onayına bağlı."),
  g('D09-B19', "Durumlar ACIK, DUZELTILDI, DEGISIKLIK_YOK, SURE_DISI. 'Süre doldu' durumu yok: kilitte açık kalan bildirim açık kalır ve hocanın listesinde görünür. Öğrenci bildirimlerini ve durumlarını eşitleme indirmesinde görür.", "contracts.json 'Öğrencinin kendi durumu' kararı sorun bildirimlerini öğrenciye indirir; kendiliğinden kapanan bildirim çözülmemiş şikâyeti gizler."),
  g('D09-B20', "Kritik: kayda bağlı öğede D08.sonucuDegistirebilirMi; kayıtsız bildirimde D08.ogrenciDevamDurumu'nun tür başına kalan hakkı ve oturumun o türdeki saati (kalan hak 0'ın altında, kalan hak artı saat en az 0); işaretli oturum kritik değil. Sıra: kritik önce, oturum başlangıcı, bekleme başlangıcı (karar, ulaşma ya da işaret anı), öğe türü, öğe kimliği. Parti (gün, hoca) anahtarıyla bir kez yazılır; gün içinde çözülen öğe okuma anında düşer, yerine öğe gelmez; partide olmayan bekleyenler HEPSI görünümünde işlenebilir; kalanlar sonraki gece yeniden yarışır.", "plan.html#kararlar-supheli-kayit sıralamayı ve 'aynı girdiyle aynı sonuç'u ister; tam sıra ve girdi kesimi bunu test edilebilir yapar."),
  g('D09-B21', "Parti boyu ortam ayarı DUZELTMELER_PARTI_BOYU (varsayılan 20, parti.ts sabiti), worker.ts işe parametreyle verir; işletmeci onay ekranı sürelerine bakıp değiştirir. Hoca başına kendiliğinden uyarlama yok.", "plan.html#kararlar-olcum onay ekranı süresini ölçer, hedef ders başına en çok 2 dakika (plan.html#hedefler); kendiliğinden değişen değer işin belirlenimliliğini bozar."),
  g('D09-B22', "Liste sorgu anında kurulur, ayrı tablo yok. Üç bölüm: (1) geç ulaşanlar: gönderme süresinden (D06.gondermeSuresiSonu) sonra ulaşan ya da kararı süreden sonra kendiliğinden değişen kayıtlar (Ret dışı); (2) kilitten sonra sonucu değişenler: taban anlıktaki (D10.aksisAnligiGetir) sonucu D08.dersSonuclari'ndakinden farklı öğrenciler, kaynaklarıyla (düzeltme, hoca kararı, geç kayıt); (3) sayılırsa değiştirecekler: kilitten sonra ulaşıp sayılmayan ve D08.sonucuDegistirebilirMi doğru olan kayıtlar.", "Hoca AKSİS'i elle düzelteceği için değişikliği görmeli (plan.html#devam-donem-sonu); taban D10'un değişmez anlığıdır (contracts.json 'AKSİS anlığı' kararı)."),
  g('D09-B23', "Ara karar (AKSİS açık noktası kapanana kadar): kilitten sonra düzeltme ve geri alma aynı kurallarla açık; Kendi beyanı onayı kapanır (kilitte sayılmış haliyle donar); İncelemede kararı yalnız D07'nin izin verdiği kayıtlarda (kilitten sonra ulaşanlar) açık, kilitte donanlar listelenmez; teyit hesap düzeyinde olduğundan sürer; sorun bildirimi alınır ve açık kalır. Kilit sonrası yazmalar sonradan değişenlerde ve denetimde görünür. Süreç kararı D09-A06.", "plan.html#kararlar-gonderme-suresi sayımın yalnız denetim kaydı bırakan işlemle değişmesine izin verir; kimin hangi kararla yapacağı plan.html#acik-aksis'te açık."),
  g('D09-B24', "Öğe reddi: ders hocanın değil (DUZELTMELER_BULUNAMADI), oturum başlamadı, yapılmadı denmiş, liste satırı oturumun şubelerinde değil ya da oturum anında etkin değil (Md.9/4 'önceki oturumlar Yok' seçiminde eklenmeden önceki oturum kabul), kod ve saat kuralı, etkin düzeltme varken oncekiDuzeltmeId yok. Pasifleşmiş ya da hesabı silinmiş öğrencinin etkin olduğu döneme ait oturumda düzeltme kabul; Devamdan muaf öğrencide düzeltme yazılır, sonucu D08 değiştirmez.", "teknik.html#veritabani 'Kod hatası bile bozuk veri yazdıramaz'; kurallar ortak pakette, hata kodları sözleşmede (D13)."),
  g('D09-B25', "Yönetici düzeltme ve onay yapmaz, yalnız okur. Bekleyen işler dersin bugünkü hocasına aittir: yetki her istekte D02.dersYetkisi ile denetlenir, parti dersin o geceki sahibine göre kurulur; ders devredilince işler yeni hocaya geçer, eski hocanın partisindeki öğeler yetki süzgecinde düşer.", "plan.html#hoca yöneticinin işlerini sayar, düzeltme aralarında yok; başka hocanın dersini onaylama yasağı (plan.html#baslangic)."),
  g('D09-B26', "belgeNoNormalize (packages/core): NFC, baştaki ve sondaki boşluk silinir, iç boşluklar teke iner; sonuç 1 ile 64 karakter, denetim karakteri yok; tekil değil. Görevli ve Belgeli kodlarında zorunlu, ötekilerde boş (CHECK). Loga, denetim ayrıntısına, iş verisine ve öğrencinin indirmesine yazılmaz.", "Aynı yazı tek biçimde saklanır; bir yazı birçok öğrenci ve oturumu kapsadığından tekil kısıt yoktur."),
  g('D09-B27', "Elle ekleme duzeltmeler tablosuna yazılır: telefondan elle_ekleme kuyruk öğesiyle (kaynak TELEFON_KUYRUGU, öğe kimliği satır kimliği, kurulum ve sıra izi, çapalanmış işlem anı), panelden POST /v1/duzeltmeler ile. Yoklama tablosuna imzasız satır girmez. Etkin düzeltmesi olan öğrenciye kuyruktan gelen elle ekleme yazılmaz, RET ve denetim olayı alır.", "contracts.json 'Teyit ve elle ekleme' kararı; imzalı kanıt tablosu imzasız satırla karışmaz (D05-B11)."),
  g('D09-B28', "Yeni bildirim türü yok. Ret, düzeltme, geri alma ve bildirim kapanışı aynı işlemde D06.ogrenciDurumuDegisti ile öğrencinin durum sürümünü artırır; telefon değişikliği indirip Kayıtlar ekranında gösterir; seviye değiştiyse D08'in hak uyarısı çıkar.", "plan.html#kararlar-supheli-kayit yerel bildirimleri hak uyarısı ve gönderilmemiş kayıtla sınırlar; 'bildirilir' bu iki yolla karşılanır, ürün kuralı değişmez."),
  g('D09-B29', "İşaretli oturum partiye tek öğe olarak girer. Hoca oturumun kayıtlarını D05'in oturum kayıtları ucunda görür; düşürmek istediği Var kaydı POST /v1/duzeltmeler/incelemeler/kararlar ile baglam ISARETLI_OTURUM ve RET gönderir (gerekçeyi D07 verir, öneri YOKLAMADA_SINIFTA_DEGIL); bitince POST /v1/duzeltmeler/isaretli-oturumlar/{oturumId}/incelendi ile kapatır (D07.isaretIncelendi). Derste çıkan işarette bütün liste D07'nin 'burada değil' akışıyla okunur.", "plan.html#kararlar-kafa-sayisi 'sonra çıkarsa oturumun kayıtlarını toplu inceler'; aynı gerekçe iki yerde aynı anlamı taşır; işaret D07'nin, inceleme D09'un.")
];

const contradictions_resolved = [
  { id: 'D09-C01', resolution: "'Silinmez' günlük işleyişin kuralıdır: uygulama rolleri bu tablolarda silemez ve güncelleyemez. Saklama süresi dolunca (plan.html#acik-saklama-suresi) D12'nin saklama_suresi_isi sahip rolle D09'un kaydettiği işleyiciyi (saklama.ts) çağırır; işleyici dönem bazında siler ya da kişi bağlarını boşaltır, kanıtı D12 yazar. Süre belli olana kadar varsayılan silme yok." },
  { id: 'D09-C02', resolution: "Son günden sonra ulaşan kayıt sayılmaz (D07: kararı İncelemede, kilitten sonra ulaştı gerekçesiyle) ve sonradan değişenlerin 'sayılırsa değiştirecekler' bölümünde görünür. Sayım ancak denetim olayı bırakan bir hoca işlemiyle değişir: kaydın onayı ya da düzeltme. plan.html#devam-donem-sonu'daki 'sonucu değiştirirse' bu varsayımsal sınama olarak okunur; plan cümlesine bu anlamın eklenmesi önerilir." },
  { id: 'D09-C03', resolution: "'Öğrenciye bildirilir' yeni bildirim türü değildir: değişiklik öğrenci durum sürümüyle telefona iner ve Kayıtlar ekranında görünür, seviye değiştiyse hak uyarısı çıkar (D09-B28). plan.html#kararlar-supheli-kayit'taki bildirim kuralı değişmez." },
  { id: 'D09-C04', resolution: "plan.html#kararlar-kayit-ve-makbuz 'bütün yazmalar' cümlesinin hemen ardından kuyruk öğelerini sayar ve onay işlemleri aralarında değildir; onaylar çevrimiçi ekrandan doğrudan istekle gider (teknik.html#telefon-gonderme-protokolu). Kuyrukta D09'un iki öğesi var: elle_ekleme ve sorun_bildirimi (D09-B16)." },
  { id: 'D09-C05', resolution: "'Yoklamada sınıfta değil' D07'nin karar gerekçesidir (Ret), D09'un sebep kodu değildir; düzeltme satırı yazılmaz. sonDurumOnceligi sayılmayan Ret kaydını Yok'a bağladığından plan.html#gun-son-durumlar'daki Yok sonucu aynen tutar." }
];

const o = (id, question, recommendation, needs_owner) => ({ id, question, recommendation, needs_owner });
const open_points = [
  o('D09-A01', "Kaydı sayılan öğrencinin geç gelip erken çıkması ('3 saatin 2'si var', plan.html#kararlar-kafa-sayisi) hangi sebep koduyla girilir? (D09-B02)", "Yeni kod KISMI_DEVAM: son durum Var, düzeltmenin kapsadığı saatler var, kapsamadığı saatler Yok; belge yok; Haksız devamsız sayımına girmez. Karar gelene kadar sunucu bu durumu kabul etmez; saat seçimi yalnız var olan düzeltme kodlarında.", true),
  o('D09-A02', "Öğrenci işlerinin yazısı yalnız rapor (yatarak tedavi, sağlık kurulu) için mi gelir; rapor dışı yazılar hangi kodla girilir? (D09-B03)", "İki kod kalsın: OGRENCI_ISLERI_YAZISI yalnız teori, KURUL_KARARI saat türü serbest. Öğrenci işleri rapor dışı yazı da gönderiyorsa saat türü serbest üçüncü bir kod eklenir; 'yalnız teori' kuralı rapor koduna bağlı kalır.", true),
  o('D09-A03', "Düzeltmenin geri alınması ayrı bir neden kodu ister mi ('yanlış öğrenci', 'yanlış oturum' gibi)? (D09-B07)", "Hayır: GERI_ALMA türü, yapan, an ve zincir 'kim, ne zaman, neden'i karşılar; neden listesi hoca ekranına adım ekler. Gerekirse sonradan sütun eklenir (yalnız ekleme).", true),
  o('D09-A04', "Hoca ilk kayıt teyidini reddederse hesap ne olur? (D09-B14, D01-B22 ile ortak)", "Hesap reddedildi olur, cihazı kapanır, beklemedeki kayıtları Ret (teyit reddedildi) alır, ham kayıt kalır; öğrenci yüz yüze yeniden kaydolur. D09 tarafı değişmez: ret kararı D01'e gider.", true),
  o('D09-A05', "Sorun bildiriminin neden listesi tasarımdaki üç neden mi (Telefonum yoktu ya da çalışmadı, QR'ı okutamadım, Kaydım yanlış derse düştü)? (D09-B18)", "Evet; serbest metin yok, ilk ikisi düzeltmeye tek dokunuşla çevrilir; plan.html'deki Sorun bildir kararına liste eklenir (tasarim.html#acik-sorun-nedenleri).", true),
  o('D09-A06', "Birimin son gününden sonra sayımı kim, hangi belgeyle değiştirir? (D09-B23, plan.html#acik-aksis)", "AKSİS açık noktası kapanana kadar ara karar sürer: dersin hocası düzeltir, belge kuralı aynı, her işlem sonradan değişenlerde ve denetimde görünür. Üniversite kurul kararı isterse kilit sonrası her düzeltmede belge numarası zorunlu olur (kural kodunda kilit anına bağlı, CHECK değişmez).", true),
  o('D09-A07', "Aynı gün girilen telafide telefonu dersi bilmeyen öğrenciyi hoca hangi kodla işaretler? (plan.html#kararlar-kafa-sayisi, Telafi dersi; D02-B17)", "Tarafsız yeni kod TELAFI_TELEFONA_INMEDI: Elle eklendi, belgesiz, kuyruktaki elle eklemede seçilir, ölçümde ayrı görünür. Karar gelene kadar hoca TELEFON_YOK_CALISMIYOR kullanır.", true),
  o('D09-A08', "Hesabı olmayan öğrencinin (telefonsuz, hiç kaydolmamış) devam ve AKSİS satırları hangi öğrenci anahtarıyla tutulur?", "Ortak öğrenci anahtarı liste satırı (ya da öğrenci numarası) olsun; D09 düzeltmeyi liste satırıyla yazar. Hesapsız öğrencide D09 hesap işini ders düzeyinde koyar (devamHesaplaIsiKoy(tx, dersId, null, neden)); D08 ve D10 aynı anahtarı seçmeli.", false),
  o('D09-A09', "D09'un çağırdığı dış yüzlerde hangi süzgeç ve alanlar gerekir?", "Sahipleri yalnız ekleyerek sağlar: D05.sayilanKayitlar süzgecinde dersIdler, kararlar, etiket, onaysız ve ulaşma aralığı, dönen kayıtta karar, gerekçe, karar anı, karar kaynağı, karar sürümü, ulaşma anı, etiketler ve onaylayan; D02.oturumlariGetir'de hocanın açık dönemdeki dersleri; D01.ogrenciHesabiGetir'in bir numaradaki bütün silinmemiş hesapları dönmesi, yük testinde yavaşsa toplu okuma; D06 öğe zarfında çapalanmış işlem anı ve kimlik; D07.kararDegistir kaynağında hoca işlemi (KENDI_BEYANI_ONAY, KENDI_BEYANI_RET, INCELEME_ONAY, INCELEME_RET, ISARETLI_OTURUM_RET) ve 'kilitte dondu' sonucu; D10.aksisAnligiGetir'de karşılaştırma tabanı; D15 ayarlarında DUZELTMELER_PARTI_BOYU; D12 saklama sırasında kayda başvuran satırların kayıtlardan önce işlenmesi.", false)
];

// Hata kodu kataloğu (packages/contracts/src/duzeltmeler.ts).
const e = (kod, nerede, ne) => ({ kod, nerede, ne });
const hataKodlari = [
  e('DUZELTMELER_GECERSIZ_ISTEK', '400', "Gövde ya da sorgu şemaya uymuyor."),
  e('DUZELTMELER_IMLEC_GECERSIZ', '400', "İmleç çözülemedi ya da başka bir sorgunun imleci."),
  e('DUZELTMELER_LISTE_COK_BUYUK', '400', "Sınıf boyu liste 2000 satırı aşıyor; ders süzgeciyle yeniden istenir (kesik liste dönmez)."),
  e('DUZELTMELER_BULUNAMADI', '404 ya da öğe', "Kaynak yok ya da hocanın dersi değil; varlık sızdırılmaz."),
  e('DUZELTMELER_DUZELTME_DEGISTI', '409 ya da öğe', "oncekiDuzeltmeId ya da geri alınan satır zincirin son satırı değil."),
  e('DUZELTMELER_ZATEN_GERI_ALINDI', '409', "Satır zaten geri alınmış."),
  e('DUZELTMELER_KIMLIK_CAKISMASI', '409 ya da öğe', "Aynı kimlik başka içerikle ya da başka hedefle geldi; saklanan satır değişmez."),
  e('DUZELTMELER_BILDIRIM_ACIK_DEGIL', '409', "Kapatılacak bildirim ACIK değil."),
  e('DUZELTMELER_ZATEN_INCELENDI', '409', "Oturum başka bir işlemle incelenmiş."),
  e('DUZELTMELER_GECERSIZ_OGE', 'öğe (kuyruk)', "Kuyruk öğesinin gövdesi şemaya uymuyor."),
  e('DUZELTMELER_YETKI_YOK', 'öğe (kuyruk)', "Öğeyi gönderen oturumun rolü uymuyor: elle eklemede HOCA, bildirimde OGRENCI olmalı."),
  e('DUZELTMELER_OTURUM_BASLAMADI', 'öğe', "Oturum henüz başlamadı."),
  e('DUZELTMELER_OTURUM_YAPILMADI', 'öğe', "Oturum için 'yapılmadı' denmiş."),
  e('DUZELTMELER_LISTEDE_DEGIL', 'öğe', "Liste satırı oturumun şubelerinde değil ya da oturum anında etkin değil."),
  e('DUZELTMELER_BELGE_NO_GEREKLI', 'öğe', "Görevli ya da Belgeli kodunda belge numarası yok."),
  e('DUZELTMELER_BELGE_NO_YASAK', 'öğe', "Belgesiz kodda belge numarası verilmiş."),
  e('DUZELTMELER_BELGE_NO_GECERSIZ', 'öğe', "Normalleştirme sonrası belge numarası boş, 64 karakterden uzun ya da denetim karakterli."),
  e('DUZELTMELER_SAAT_GECERSIZ', 'öğe', "Saat oturumun o türdeki saatini aşıyor, toplam 0 ya da tek saatlik oturumda farklı saat."),
  e('DUZELTMELER_SAAT_TURU_YASAK', 'öğe', "Öğrenci işleri yazısında uygulama saati ya da teori saati olmayan oturum."),
  e('DUZELTMELER_DUZELTME_VAR', 'öğe', "Etkin düzeltme var ve oncekiDuzeltmeId verilmedi (kuyruktaki elle eklemede de)."),
  e('DUZELTMELER_SORUN_BILDIRIMI_UYUSMUYOR', 'öğe', "Bildirim başka oturum ya da öğrencinin ya da ACIK değil."),
  e('DUZELTMELER_KAYIT_UYUSMUYOR', 'öğe', "Verilen kayıt bu oturum ve öğrencinin değil."),
  e('DUZELTMELER_ZATEN_KARAR_VERILMIS', 'öğe', "Kayıt ya da teyit artık beklemiyor; beklenen eski durum tutmadı."),
  e('DUZELTMELER_KENDI_BEYANI_DEGIL', 'öğe', "Kayıt onay bekleyen Kendi beyanı değil."),
  e('DUZELTMELER_KAFA_SAYISI_BEKLENIYOR', 'öğe', "Oturumun kafa sayısı ya da yapıldı cevabı gelmedi."),
  e('DUZELTMELER_DONEM_KILITLI', 'öğe', "D07 kilitte donan karara izin vermiyor."),
  e('DUZELTMELER_ISARETLI_OTURUM_DEGIL', 'öğe', "Oturumda dersten sonra çıkmış, incelenmemiş işaret yok."),
  e('DUZELTMELER_ZATEN_SAYILAN_KAYIT_VAR', 'öğe (KABUL ile bilgi)', "Onaylanan kayıt, öğrencinin aynı oturumda sayılan kaydı olduğundan sayılmayan Var kaldı."),
  e('DUZELTMELER_TEK_TEK_ONAYLANMALI', 'öğe', "Toplu teyit öğesi toplu grupta değil."),
  e('DUZELTMELER_ACIK_BILDIRIM_VAR', 'öğe (kuyruk)', "Öğrencinin aynı oturumda ACIK bildirimi var."),
  e('DUZELTMELER_SURE_DISI', 'öğe (KABUL ile bilgi)', "Bildirim süre dışında; SURE_DISI ile saklandı, hocanın listesine düşmez.")
];

// Sebep kodu kataloğu (packages/core/src/duzeltmeler/katalog.ts).
const sk = (kod, sonDurum, harf, belge, saat, haksiz, kuyruk, kaynak) => ({ kod, sonDurum, harf, belge, saat, haksiz, kuyruk, kaynak });
const sebepKodlari = [
  sk('GOREVLENDIRME', 'GOREVLI', 'G', 'zorunlu', 'teori ve uygulama', 'hayır (ayrı oran)', 'hayır', "plan.html#devam (Md.35)"),
  sk('OGRENCI_ISLERI_YAZISI', 'BELGELI_DUZELTME', 'B', 'zorunlu', 'yalnız teori', 'hayır (ayrı oran)', 'hayır', "plan.html#devam (Md.7/3), D09-A02"),
  sk('KURUL_KARARI', 'BELGELI_DUZELTME', 'B', 'zorunlu', 'teori ve uygulama', 'hayır (ayrı oran)', 'hayır', "plan.html#gun-son-durumlar"),
  sk('BEYANA_DAYALI', 'ELLE_EKLENDI', 'E', 'yok', 'teori ve uygulama', 'evet', 'hayır', "plan.html#gun-kenar-durumlar"),
  sk('TELEFON_YOK_CALISMIYOR', 'ELLE_EKLENDI', 'E', 'yok', 'teori ve uygulama', 'evet', 'evet', "plan.html#gun-son-durumlar"),
  sk('QR_OKUTAMADI', 'ELLE_EKLENDI', 'E', 'yok', 'teori ve uygulama', 'evet', 'evet', "plan.html#hile-otomatik-kabul-kurali")
];

const nedenKodlari = [
  { kod: 'TELEFON_YOK_CALISMIYOR', metin: "Telefonum yoktu ya da çalışmadı", oneri: 'TELEFON_YOK_CALISMIYOR' },
  { kod: 'QR_OKUTAMADI', metin: "QR'ı okutamadım", oneri: 'QR_OKUTAMADI' },
  { kod: 'KAYIT_YANLIS_DERSTE', metin: "Kaydım yanlış derse düştü", oneri: "yok (hoca kayda bakar)" }
];

const denetimOlaylari = [
  ['duzeltmeler.duzeltme_eklendi', "Yeni zincir başı ya da GERI_ALMA'dan sonraki düzeltme; hedef DUZELTME, kod sebep kodu."],
  ['duzeltmeler.duzeltme_degistirildi', "Etkin düzeltmenin yerine yenisi; önceki ve sonraki satır kimliği."],
  ['duzeltmeler.duzeltme_geri_alindi', "GERI_ALMA satırı; yeniden açılan bildirim varsa ayrıntıda."],
  ['duzeltmeler.elle_ekleme_reddedildi', "Kuyruktan gelen elle ekleme etkin düzeltme yüzünden yazılmadı."],
  ['duzeltmeler.kendi_beyani_karari', "kod ONAY ya da RET; kayıt çifti, önceki ve sonraki karar."],
  ['duzeltmeler.inceleme_karari', "kod ONAY ya da RET; beklenen ve yeni karar."],
  ['duzeltmeler.isaretli_oturum_karari', "İşaretli oturumda Var kaydın düşürülmesi."],
  ['duzeltmeler.isaretli_oturum_incelendi', "Toplu incelemenin kapanışı; hedef ISARET."],
  ['duzeltmeler.teyit_karari', "kod TEYIT ya da RET; öğrenci, grup ve toplu bayrağı."],
  ['duzeltmeler.sorun_bildirimi_alindi', "Yeni bildirim; kod neden kodu, ayrıntıda durum (ACIK ya da SURE_DISI)."],
  ['duzeltmeler.sorun_bildirimi_kapatildi', "kod DUZELTILDI ya da DEGISIKLIK_YOK."],
  ['duzeltmeler.sorun_bildirimi_yeniden_acildi', "Kapatan düzeltme geri alındı."]
];

module.exports = { summary, jobs, state_machines, invariants, exportsList, files, tests, resolved_gaps, contradictions_resolved, open_points, hataKodlari, sebepKodlari, nedenKodlari, denetimOlaylari };

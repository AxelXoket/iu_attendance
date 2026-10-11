// Patch the testler array in icerik.js: replace entries by name and insert new ones after given names.
const fs = require('fs');
const file = process.argv[2];
let src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('const testler = [');
const end = src.indexOf('\n];', start) + 3;
const C = require(file);
let T = C.testler.map(t => [...t]);
const byName = n => { const i = T.findIndex(t => t[0] === n); if (i < 0) throw new Error('no test ' + n); return i; };
const set = (n, kind, text) => { const i = byName(n); T[i] = [T[i][0], kind || T[i][1], text]; };
const after = (n, rows) => { const i = byName(n); T.splice(i + 1, 0, ...rows); };

set('Geçiş tablosu', null, `izinliGecis yüklemi: güncel karar OTOMATIK iken VAR'dan INCELEMEDE dışında her geçiş izinli; dört satır ayrıca denenir: Ret LISTEDE_DEGIL'den Beklemede TEYIT_BEKLIYOR (canlanan satır, teyitsiz öğrenci), Ret'ten İncelemede CAPALAR_AYRISIYOR, İncelemede'den Beklemede AYAR_KESINLESMEDI, aynı sınıfta gerekçe değişimi (yeni satır yazılır). VAR'dan INCELEMEDE'de yenidenDegerlendir yazmaz ve korunan 1 döner; aynı kayıt Beklemede iken İncelemede'ye geçer (pozitif kontrol). HOCA olayları yalnız tablodaki geçişlere izinli: kaynağı HOCA olan karardan otomatik geçiş, etiketsiz kayda KENDI_BEYANI_RET, SON_GUNDEN_SONRA kayda onay, işaret hiç açılmamış oturumda ISARETLI_OTURUM_RET ve otomatik ya da burada değil kararında KARAR_DEGISTIR DOGRULAMA_GECIS_GECERSIZ fırlatır; ilk_isaret_ani dolu oturumda ISARETLI_OTURUM_RET Var'ı Ret YOKLAMADA_SINIFTA_DEGIL yapar (işaret sonradan kalkmış olsa da); beklenen eski karar uymayınca DOGRULAMA_KARAR_DEGISTI; dörtlü değişmeyince satır yazılmaz ve degisti false döner, KENDI_BEYANI_ONAY Var'dan Var'a yazar. Her izinli geçiş en az bir satırda.`);

set('iOS 27 beklenmeyen alanı', null, `D13.yayinBilgisi().iosPaketSurumleri'nde olmayan paket sürümü YAYIMLANMAMIS_PAKET_SURUMU, iosDagitimTurleri'nde olmayan açılış doğrulama türü BEKLENMEYEN_DAGITIM_TURU yazar; etiket ve karar değişmez, dogrulama.ios_beklenmeyen_alan D09.denetimeYaz ile düşer; aynı değeri taşıyan 50 kayıt tek olay ve tek D01 güncellemesi (neden onay_alani) yazar; listelerdeki değerle gelen kayıt olay yazmaz ve alan hiç gelmezse (iOS 26) olay yazılmaz (pozitif ve negatif kontrol). Değerler KayitTaslagi.appAttest.iosUzantilari'ndan okunur.`);

set('Listede olmayan derse yoklama', null, `Kayıt saklanır, gönderim sonucu kabul, karar Ret LISTEDE_DEGIL (önce kırmızı yazılır, [[plan#baslangic|Başlangıç]]); liste satırı eklenince D03'ün liste işleminin içinde, iş kuyruğu olmadan, D07'nin KARAR dinleyicisi yenidenDegerlendir(tx, { dersId, subeIdleri, ogrenciNolari }, 'LISTE_DEGISTI') ile kararı Var yapar; işlem geri alınınca karar da Ret kalır (kontrol).`);

set('Ders sırasında listeye eklenen öğrenci', null, `D03, D07 ve D08'in ortak senaryosu (apps/server/test/features/dogrulama/liste-degisikligi.feature): oturum 09:00'da başlar, öğrenci 09:10'da listeye eklenir, 09:12 saatli imzalı kayıt Var olur ve D08 devam işi oturumu öğrencinin T'sine katar (D08-B12, D08.ogrenciDevamDurumu ile okunur); aynı öğrencinin 09:05 saatli kaydı Ret LISTEDE_DEGIL (kontrol); saat doğrulanamadı kaydı oturum başlangıcıyla denetlenir; satırı 09:20'de pasif olan öğrencinin 09:15 kaydı Var. Üyelik anı sözleşmedir: kaydın hesaplanan saati, saat yoksa oturum başlangıcı, ulaşma anı hiç.`);

set('Ulaşma anını aşan kayıt', null, `Eşitleme sağlıklıyken Ret ULASMA_ANINI_ASIYOR; eşitleme bozukken İncelemede SAAT_ESITLEMESI_BOZUK; kesinti ulasmaAnlariGuvenilir true ile kapanınca aralıkta eşitleme bozukken ulaşmış bütün kayıtlar (birincil gerekçesi SAYAC_ARTMADI ya da TEYIT_BEKLIYOR olup SAAT_ESITLEMESI_BOZUK'u ek gerekçe taşıyanlar dahil) yeniden değerlendirilir ve ulaşma anını aşan Ret ULASMA_ANINI_ASIYOR alır; false ile kapanınca İncelemede kalır; sonraki teyit olayı kapanmış kesintiyi D04.kesintiAraliklari'nın ulasmaAnlariGuvenilir alanıyla bağlamda temizlenmiş görür; alan null iken yedek kural (enBuyukSapmaMs dolu ve eşiğin altında) uygulanır.`);

set('Ele geçirilmiş saat anahtarı', null, `SaatSonucu.eleGecmisAnahtar true olan kayıt İncelemede SAAT_ANAHTARI_ELE_GECIRILDI; aynı kayıt etkin anahtarla (false) Var (pozitif kontrol); bilinmeyen anahtar kimliğiyle gelen belge (KID_BILINMIYOR) Saat doğrulanamadı yolundan ortak sınıra gider, ayrı gerekçe yoktur. D15'in ele-gecirildi son adımı yenidenDegerlendir(tx, { belgeKid: { amac: 'saat_belgesi', kid: K } }, 'ANAHTAR_ELE_GECIRILDI') ile çağrılınca K ile çapa kuran ve şüphe anından sonra, işaretten önce ulaşan Var kayıt İncelemede SAAT_ANAHTARI_ELE_GECIRILDI olur; şüpheden önce ulaşan kayıt ve başka kid'le çapa kuran kayıt değişmez (kontroller); ikinci çağrı satır yazmaz.`);

set('Eski program', null, `D04.pencereSonucu'nun dört sonucu D07'de tek eşlemeyle karara döner: oturum 09:00'dan 11:00'e taşınır; 09:05 saatli çevrimdışı kayıt için D04 ESKI_PROGRAM döner ve karar İncelemede ESKI_PROGRAM; 10:00 saatli kayıt DISINDA, Ret PENCERE_DISINDA (kontrol); değişiklik geçmişi olmayan oturumda 09:05 saatli kayıt Ret PENCERE_DISINDA. D07 eski pencereyi kendisi hesaplamaz; D04'ün eskiProgram alanı kaldırılırsa senaryo kırmızı.`);

set('Kendi beyanı', null, `D04.pencereSonucu kayitAnindaSureSecildi false dönen derste kayıt Var ve etiket_kendi_beyani; ders sırasında süre seçilince ondan sonra ulaşan kayıt (kayitAnindaSureSecildi true) etiket almaz, önce ulaşan alır; toplu onay kararı değiştirmez, geçmişe KENDI_BEYANI_ONAYLANDI satırı ve D05 onay sütunları yazılır; ret Ret KENDI_BEYANI_REDDEDILDI ve onay sütunları boşalır; kilitte onay bekleyen yüklemi (etiket, Var, onay_ani boş) Var ORTAK_SINIRLA_KABUL gerekçeli Kendi beyanını da sayar.`);

set('Hatalı sürüm', null, `D13.yayinBilgisi().hataliSurumler'deki (platform, uygulamaSurumu, guncellemeKimligi, baslangicAni) sürümün baslangicAni'ndan sonra ulaşan kaydı İncelemede HATALI_SURUM; baslangicAni'ndan önce ulaşmış kayıt değişmez; başka sürüm etkilenmez (pozitif kontrol). D07'de yayin-bilgisi.json okuyucusu ve yayinBilgisiYolu ayarı yoktur; baslangicAni yükleme anından önceki girdi açılışta dogrulama.hatali_surum_gec_yuklendi uyarısını açar.`);

set('Uç yetkileri', null, `Rota tablosundan üretilen senaryo: değer ucu kimliksiz 200; öbür dört uç kimliksiz 401, öğrenci oturumuyla rota düzeyinde 403 API_ROL_YETKISIZ, başka hocanın oturumunda ve dersin yöneticisiyle ('yonetici') kaynak düzeyinde 404 DOGRULAMA_BULUNAMADI; rastgele isim panel çereziyle 401. D02.dersYetkisi her uçta (tx, istek.kimlik, dersId) üç parametresiyle çağrılır.`);

set('Sözleşme ve genişleyen enum', null, `Cevap şemalarında karar, gerekçe, etiket, durum ve hata kodu alanları x-extensible-enum taşır, enum anahtarı taşımaz; istek şemaları kapalıdır; her DOGRULAMA_ kodu en az bir senaryoda gerçekten döner; YENIDEN_NEDENLERI (on bir değer), KARAR_OLAYLARI (sekiz değer, KARAR_DEGISTIR dahil) ve GECMIS_OLAYLARI tek listeden içe aktarılır ve geçmişin olay CHECK'i GECMIS_OLAYLARI'ndan türer; KararSonucu'nun altı ortak alanı D05'in beklediği adlarla derlenir.`);

set('kafa_sayisi kuyruk öğesi', null, `Öğe türü D06'ya { roller: ['PERSONEL'], oturumGerekli: true, ilkCapaVar: true, govdeEnBuyukBayt: 1024 } ve kilitAnahtarlari kancasıyla kayıtlı (D06'nın "Öğe türleri kayıtlı" sözleşme testi); gövde şeması D13.ogeTuruTanimla ile TUM_OGE_TURLERI'nde. Kanca oturumun işaret anahtarını ve kayıtlarının kararAnahtarlari sonucunu döner. Sahip olmayan gönderen RET DOGRULAMA_YETKISIZ_HOCA; bozuk gövde RET DOGRULAMA_GOVDE_GECERSIZ; D02 sonucu celiski (iptal oturum, yapılmadı denmiş ders) KABUL, olay sonuç celiski ile yazılır, yeniden değerlendirme olmaz; degismedi KABUL ve olay yazılmaz; oturum_yok RET DOGRULAMA_BULUNAMADI; kilitten sonra değer yazılır, karar ve işaret değişmez; D02.kafaSayisiniYaz öğenin son çağrısıdır (sorgu izinde ondan sonra oturum satırı kilidi beklenmez); aynı öğe iki kez gelince D06 zaten var der ve değer bir kez yazılır.`);

set('Dosya döngüsü yok', null, `dependency-cruiser no-circular ve yaprak kuralı: modules/dogrulama D01'i yalnız modules/kimlik/yaprak.ts'ten, D05'i yalnız modules/yoklama/yaprak.ts'ten, D09'u yalnız modules/duzeltmeler/yaprak.ts'ten içe aktarır, üçünün index.ts'ini içe aktarmaz; cihazDogrulamaSonucunuYaz eklenti seçeneğiyle gelir; packages/core/src/dogrulama packages/contracts'ı çalışma zamanında içe aktarmaz (yalnız import type). Her kural için bir içe aktarma bilerek eklenince sınır testi kırmızı.`);

set('Kayıt bağları ve çizelge', null, `Açılışta D06 (kafa_sayisi, ilkCapaVar true, kilitAnahtarlari), D02 (dogrulama.karar_kapanisi, sira 10, calistir sarmalayıcısı), D03 (dogrulama, basamak KARAR), D04 (pencereDegisti ve oturumKapandi { ad, calistir } biçiminde, kesintiKapandi partili imzayla), D11 (dogrulama.gosterim_kaydi, anahtarlar ve calistir), D12 (yalnız dogrulama.donem_verisi) ve D09 (DOGRULAMA_DENETIM_OLAYLARI) kayıtları sahiplerin tipleriyle derlenir ve kaydolur; D14 çizelge denetimi bekleyen_kararlari_coz (25 5 * * *) ve android_iptal_listesi_cek (5 6 * * *) ile geçer, pencere_beklemede_kesinlestir cron'suz ve stately; jobs/dogrulama/index.ts isler dizisi D14.isTanimla'dan geçer.`);

after('Ulaşma anını aşan kayıt', [
  ['Kesinti partileri', 'behavior', `D04'ün esitleme_sonrasi_yeniden_degerlendir işi 1200 işaretli kayıtlı kesintide D07 dinleyicisini { imlec, adet: 500 } ile üç kez çağırır: 500, 500 ve 200 kayıt, son çağrı bitti true; ikinci partide iş yeniden başlatılınca imleçten devam eder ve biten parti tekrar yazılmaz; aralık dışındaki (degerlendirmeAltAni'dan önce, acikKesintiBaslangici'ndan sonra) kayıt dokunulmaz (kontrol); ulasmaAnlariGuvenilir false iken ilk çağrı { sonImlec: null, bitti: true } döner ve hiçbir satır yazılmaz.`],
]);

after('Eski program', [
  ['Pencere sonucu eşlemesi', 'behavior', `D04.pencereSonucu'nun her sonucu için tablo satırı: ICINDE pencere kuralını geçer (Var); DEGISIM_DILIMI kafa sayısı yokken ve gönderme süresi bitmemişken Beklemede AYAR_KESINLESMEDI, kafa sayısı gelmişken ya da süre bitmişken Ret PENCERE_DISINDA; ESKI_PROGRAM İncelemede ESKI_PROGRAM; DISINDA Ret PENCERE_DISINDA. Eşleme Record<PencereSonucu['sonuc'], ...> ile yazıldığından D04'e eklenen yeni değer derlemeyi kırar; küçük harfli eski değerler (icinde, dilimde, disinda) kodda yoktur.`],
]);

after('Eski cihaz, silinen hesap ve iptal edilen talep', [
  ['Açık değişim talebi süren eski cihaz', 'behavior', `Öğrencinin açık değişim talebi varken eski etkin cihazdan gelen kayıt Beklemede CIHAZ_DEGISIMI_BEKLIYOR; gerçek öğrenci talebi etkin cihazından reddedince D01'in ret işleminde (CIHAZ_DEGISIMI_REDDEDILDI, { ogrenciId }) aynı işlemde Var olur; talep 72 saatte düşünce de (DEGISIM_IPTAL) aynı işlemde Var; onaylanınca kapanmadan önce imzalanan kayıt Var, sonrası Ret ESKI_CIHAZ; hiç etkinleşmeyen yeni cihazın kaydı ret ve düşmede Ret CIHAZ_ONAYLANMADI; açık talebi olmayan öğrencinin kaydı Var (kontrol).`],
]);

after('Geçiş tablosu', [
  ['Hoca kendi kararını değiştirir', 'behavior', `D09'un KARAR_DEGISTIR bağlamı kararDegistir'e { karar, beklenenKarar } ve { tur: 'HOCA', kisiId, olay: 'KARAR_DEGISTIR', islemId } ile gelir: Kendi beyanı reddi (KENDI_BEYANI_REDDEDILDI) Var'a dönünce gerekçe KENDI_BEYANI_ONAYLANDI ve onay sütunları dolar; İncelemede reddi (HOCA_REDDETTI) Var'a dönünce HOCA_ONAYLADI; dönüşte KararDegisimi { degisti, onceki, sonraki, kayit } gelir ve kayit sayilan bayrağını taşır; otomatik Ret ve YOKLAMADA_SINIFTA_DEGIL DOGRULAMA_GECIS_GECERSIZ, başka dersin hocası DOGRULAMA_YETKISIZ_HOCA, kilitten sonra DOGRULAMA_DONEM_KILITLI fırlatır (D09 eşler).`],
]);

after('Yeniden değerlendirme ile gönderim', [
  ['Katman sırası', 'behavior', `D12'nin sıra denetimi açıkken (ihlalde hata) her D07 yolu ihlalsiz koşar: gönderim paketinde kararHesapla ve kararGecmisineYaz, 200 öğelik D09 isteğinde kararDegistir, D01 teyit işleminde yenidenDegerlendir (teyit anahtarı tutulurken liste anahtarı Dene ile), D03 liste işleminde KARAR dinleyicisi (liste anahtarı tutulurken teyit anahtarı Dene ile), [erken_kapatma, kafa_sayisi] hoca paketi ve D11 gösterim işlemi. İki oturumda işaret yazan pakette metinde büyük işaret anahtarı tutulurken küçüğü Dene ile denenir; alınamayınca dogrulama.isaret_ertelendi düşer ve GET doğru sayıyı döner. Bağlam anahtarı başka işlemde tutulurken yenidenDegerlendir o öğrencinin kayıtlarını korunan sayar, bağlamı değiştiren işlem kendi değerlendirmesinde doğru kararı yazar.`],
  ['Anahtar işlevleri', 'contract', `dogrulamaTeyitAnahtari('a') 'dogrulama:teyit:a', dogrulamaListeAnahtari('b') 'dogrulama:liste:b' döner; kararAnahtarlari çift anahtarı D05'in yoklamaCiftAnahtari'ndan içe aktararak üretir (D07'de kopya yok), anahtarId verilen girdiye 'dogrulama:sayac:<anahtarId>' ekler, aynı girdiler tekrarsız döner, bağlam ve işaret anahtarı içermez; D12'nin DANISMA_KATMANLARI tablosu bu öneklerin katmanlarını 1, 2, 3, 4 ve 5 olarak verir. Üçü saf: aynı girdiyle aynı çıktı, veritabanı yok.`],
]);

after('Doğrulanmış etiketi (Aşama 2)', [
  ['QR sonuç eşlemesi tam', 'contract', `D11'in packages/contracts/src/projeksiyon.ts'teki DOGRULAMA ve GECIKME listeleri içe aktarılır ve her değerin karar.ts'teki qrEslemesi'nde bir satırı olduğu sınanır; ANAHTAR_ELE_GECIRILDI İncelemede QR_ANAHTAR_ELE_GECIRILDI, INDIRME_KAYDI_YOK İncelemede QR_ANAHTAR_IPTAL; D11'e eklenen yeni değer eşlenmeden test kırmızı. Eşleme tipi import type ile QrDogrulama ve QrGecikme anahtarlıdır, core contracts'ı çalışma zamanında içe aktarmaz.`],
]);

after('Kilit ve son gün', [
  ['Saklama işleyicisi', 'behavior', `D12.saklamaIsleyicisiniCalistir(saklamaVeritabani, 'dogrulama.donem_verisi', { sinirAni, sureAy, saat }) ile: süresi dolan dönemin kayit_karar_gecmisi, oturum_isaretleri, rastgele_isim_secimleri ve ortak_sinir_sayaclari satırları ve sınır anından eski app_attest_sayaclari satırları silinir; süresi dolmamış dönem kalır (kontrol); işleyici yoklama_saklama rolüyle yalnız SELECT, UPDATE ve DELETE yapar, D07 dışı tabloya dokunmaz; kayıtta sınıf adı yalnız dogrulama.donem_verisi, oncekiSiniflar yok; katalog sırasıyla yoklama.donem_verisi'nden önce koşunca yabancı anahtar hatası olmaz.`],
  ['İşler aynı veriyle iki kez', 'behavior', `D14'ün "aynı veriyle iki kez çalışırsa" adımıyla her iş için: android_iptal_listesi_cek, bekleyen_kararlari_coz ve pencere_beklemede_kesinlestir ikinci çalışmada satır, olay ve iş yazmaz; ikinci bekleyen_kararlari_coz'un koyduğu pencere_beklemede_kesinlestir isteği tekillik anahtarıyla bekleyen işe katılır.`],
]);

after('Kişisel veri sızmaz', [
  ['Denetim olayları kayıtlı', 'contract', `DOGRULAMA_DENETIM_OLAYLARI'ndaki her tür D09.denetimOlaylariniKaydet ile kayıtlıdır ve D07'nin yazdığı her olay türü listededir; dersId taşıyan her tür birimId taşır (şema testi her türü dener); listede olmayan tür denetimeYaz'da reddedilir (negatif kontrol).`],
  ['Eklenti birleşimi', 'contract', `dogrulamaEklentisi kayıt sırasında veritabanına dokunmaz (sorgu sayan sahte veritabanıyla 0); surec isci'de rota kaydetmez, dinleyicileri ve öğe türünü kaydeder; surec api'de beş rota D13.rotalariKaydet ile gelir; eklenti setErrorHandler ve setNotFoundHandler çağırmaz; seçenek tipi EklentiTemelSecenekleri'ni genişletir ve cihazDogrulamaSonucunuYaz seçenekten gelir.`],
]);

const out = 'const testler = [\n' + T.map(([n, k, a]) => `  [${JSON.stringify(n)}, '${k}', \`${a}\`],`).join('\n') + '\n];';
src = src.slice(0, start) + out + src.slice(end);
fs.writeFileSync(file, src);
console.log('tests', T.length);

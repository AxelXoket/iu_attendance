'use strict';
// Resolved gaps, open points, queue item, registrations, read interfaces, settings, secrets, alert rules.
const { rep, find, idx, strIdx } = require('./lib.js');

module.exports = function p4(S) {
  const g = (id) => find(S.resolved_gaps, 'gap', id);

  // ---------- resolved gaps ----------
  const b06 = g('D15-B06');
  rep(b06, 'decision', '(D04-B20 kuralı;', '(D04-B20 kuralı, D04 ve D11 aynı deseni kullanır: I018, I052;');
  rep(b06, 'decision',
    "Veritabanına dokunan alt komutlar (oturumlari-kapat, ele-gecirildi'nin yeniden değerlendirmesi) goc kabının yoklama_api_parolasi sırrıyla yoklama_api rolüyle bağlanır;",
    "Veritabanına dokunan komutlar (olay oturumlari-kapat, anahtar-uret ele-gecirildi'nin yeniden değerlendirmesi ve anahtar-uret donem-arasi) goc kabının yoklama_api_parolasi sırrıyla yoklama_api rolüyle bağlanır; cli/anahtar-uret ve cli/olay bileşim köküdür, açılışta D01.kimlikDinleyicileriniKur'u dört aboneyle (dersler D02, esitleme D06, projeksiyon D11, isletim D15) ve kimlikDinleyicileriHazir'ı çağırır (I050, I080);");
  rep(b06, 'decision', '(D12\'den istek).', "(D12 kabul etti, I083: kopya /opt/iu-yoklama/deneme/xprem-ana-anahtar, 0400).");

  const b07 = g('D15-B07');
  rep(b07, 'decision',
    "Silinmiş kid'le gelen belge D04'te KID_BILINMIYOR sonucunu alır; kayıt D05'te ham kanıt olarak saklanır, kararını D07 verir ('anahtar emekli' gerekçesi D07 kataloğuna istek, D15-A12).",
    "Silinmiş kid'le gelen belge D04'te KID_BILINMIYOR sonucunu alır; belge çapa kurmaz, kayıt D05'te ham kanıt olarak saklanır ve Saat doğrulanamadı yolundan gider (D07-B19). Ayrı bir 'anahtar emekli' gerekçesi yoktur (istek reddedildi: I080, I086).");
  rep(b07, 'why', "Kural takvime bakmadan, döndürme sırasından çıkar; D15 D02'yi okumaz.",
    "Kural takvime bakmadan, döndürme sırasından çıkar; D15'in modül kodu D02'yi okumaz (yalnız yayın penceresi için cli/anahtar-uret donem-arasi bileşim kökü olarak D02.donemArasiMi'yi çağırır, I006).");

  const b08 = g('D15-B08');
  rep(b08, 'decision', "komutun son adımında D07.yenidenDegerlendir ile İncelemede'ye döner)",
    "komutun son adımında D07.yenidenDegerlendir(tx, { belgeKid: { amac, kid } }, 'ANAHTAR_ELE_GECIRILDI') ile İncelemede'ye döner; I086)");
  rep(b08, 'decision', 'anahtar-uret oturumlari-kapat (D01.oturumlariKapat, bütün personel oturumları)',
    'olay oturumlari-kapat (apps/server/src/cli/olay.ts, olay komutlarının globu cli/olay*; D01.oturumlariKapat, bütün personel oturumları; I080)');

  rep(g('D15-B10'), 'decision', 'Google anahtar kanıtı iptal listesi (IPTAL_LISTESI_ADRESI, D07)',
    'Google anahtar kanıtı iptal listesi (IPTAL_LISTESI_ADRESI, varsayılan https://android.googleapis.com/attestation/status; D07, I031)');

  const b12 = g('D15-B12');
  rep(b12, 'decision',
    'Yayın penceresi hafta içi 20:00 sonrası ya da hafta sonu; betik hafta içi 08:00-20:00 arasında --simdi olmadan durur.',
    "Yayın penceresi dönem arasında her saat, dönem içinde hafta içi 20:00 sonrası ya da hafta sonu; betik dönem içinde hafta içi 08:00-20:00 arasında --simdi olmadan durur. Dönem arası bilgisini betik çalışan sürümün komutuyla alır (docker compose run --rm --no-deps goc node src/cli/anahtar-uret.ts donem-arasi): bileşim kökü olan bu giriş D02.donemArasiMi(tx) çağırır (I006; infra/izleme D02'yi içe aktarmaz), komut hata verirse dönem içi sayılır.");
  rep(b12, 'decision',
    "Dönemin ilk haftasında ve birimin son günü haftasında yalnız güvenlik düzeltmesi yayımlanır (yazılı kural; betik takvimi okumaz, D15 D02'yi okumaz).",
    "Dönemin ilk haftasında ve birimin son günü haftasında yalnız güvenlik düzeltmesi yayımlanır (yazılı kural; betik bu haftaları ayırt etmez, yalnız dönem arasını okur). Yeni imajda çalışan sürümün dosyasında olmayan bir hatalı sürüm girdisinin baslangic'i yayın anından önceyse betik --gec-ilan olmadan durur (I031). Göç eski işçi ve eski API kopyaları açıkken çalışır; önce genişlet, sonra daralt merdiveni bunu karşılar (I061).");

  rep(g('D15-B17'), 'decision',
    'işçi 5 bağlantı (pg-boss 2, Drizzle 3); xprem 10; göç 2; pgBackRest 2; gece dökümü 1; süper kullanıcı 3: toplam 63, üst sınır 80.',
    "işçi 5 bağlantı (pg-boss 2 + Drizzle 3, Drizzle'ın 2'si devam_hesapla partileri; I077); saklama bağlantısı 1 (D12, ayrı yoklama_saklama girişi); xprem 10; göç 2; pgBackRest 2; gece dökümü 1; süper kullanıcı 3: toplam 64, üst sınır 80.");

  const b20 = g('D15-B20');
  rep(b20, 'decision', 'üst üste iki atlandi sonucu UYARI (tek atlama yaş eşiğiyle zaten görünür)',
    "üst üste iki atlandi sonucu UYARI (tek atlama yaş eşiğiyle zaten görünür: atlandi sonucu sonBasariAni'yi değiştirmediğinden atlanan iş eskime kuralına düşer; I061)");
  rep(b20, 'decision', "D14 sağlığından ölü mektup, iş sessizliği, kuyruk birikmesi ve e-posta sorunları.",
    "D14 sağlığından ölü mektup, iş sessizliği, kuyruk birikmesi ve e-posta sorunları; devam tutarlılık farkı yalnız devam_tutarlilik_denetimi'nin sonCikti.farkSayisi > 0 iken (kuralYenidenHesapSayisi uyarı açmaz; I038); son 10 dakikada 10 ve üstü dogrulama.kanit_reddedildi log satırı UYARI (D07'nin ayar yanlışlığı güvencesi, API ölçü dosyasının logOlaylari alanından; I031).");

  rep(g('D15-B21'), 'decision', 'makestep yalnız açılışta.',
    "makestep yalnız açılışta. D04'ün dört ayarı ayar şemasındadır: SAAT_ESITLEME_ESIK_MS 100, SAAT_ESITLEME_DOSYA_YASI_MS 120000, SAAT_ESITLEME_DENETIM_ARALIGI_MS 5000 ve SAAT_ESITLEME_KAPANIS_ESIGI_MS 15000 (aralığın en az üç katı, şema denetler; I018). D04'ün kapanamayan pencere uyarısı saat.pencere_kapanamadi katalogdadır.");

  const b26 = g('D15-B26');
  rep(b26, 'decision', '(kanallar, hatalı sürümler, iOS paket sürümleri; sahip çekme isteğiyle değiştirir)',
    '(kanallar, hatalı sürümler, iOS paket sürümleri ve iOS dağıtım türleri iosDagitimTurleri, I031; sahip çekme isteğiyle değiştirir)');
  rep(b26, 'decision', 'sira (kaynağa dokunan commit sayısı)',
    'sira (kaynağa dokunan commit sayısı; ana dal doğrusal olduğundan artar, önceki sunucu/v* etiketindekinden büyük değilse iş kırmızı)');
  rep(b26, 'decision', 'Okuma, en düşük sürüm koruması ve tarihçe D13\'ün (D13-B18).',
    "CI yazarı hatalı sürüm girdisinde baslangic'i ilanın canlıya çıktığı andan önceye yazmaz: önceki sunucu/v* etiketindeki kaynakta olmayan girdinin baslangic'i olusturmaAni'den önceyse iş kırmızı; ilan canlıya yayinla.sh ile çıktığından betik de çalışan sürümün dosyasında olmayan girdinin baslangic'i yayın anından önceyse --gec-ilan olmadan durur; kalan boşluğu D07 açılışta dogrulama.hatali_surum_gec_yuklendi uyarısıyla gösterir (I031). Okuma, en düşük sürüm koruması ve tarihçe D13'ün (D13-B18); D07 dosyayı yalnız D13.yayinBilgisi() ile okur.");

  rep(g('D15-B32'), 'decision',
    "eski-surum-istekleri.feature D13'ün destek listesindeki (packages/contracts/openapi/destek.json) her sürümün örneklerini sahte saatle geçerli pencerede oynatır ve aynı sonucu bekler.",
    "eski-surum-istekleri.feature D13'ün destek listesindeki (packages/contracts/openapi/destek.json) tamDenetimTabani'na eşit ya da yüksek her sürümün bütün örneklerini, bütün saklı sürümlerin ise gönderim ve hepSurumYollari örneklerini sahte saatle geçerli pencerede oynatır ve aynı sonucu bekler (I069). Örnekleri üretmek telefon uygulamasının işidir (harita dışı istek, I090).");

  const b42 = g('D15-B42');
  b42.decision = "Caddy lb_policy header X-Kurulum-Kimligi { fallback client_ip_hash }: kopya başlığın özetiyle seçilir (D13 aynı başlığı hız anahtarı yapar), başlık yoksa (panel, girişten önce) istemci adresinin özetiyle (I069). Kopya düşünce o kopyanın istekleri öbürüne geçer, bellek sayaçları sıfırdan başlar: kaba sınır kararıyla uyumlu (plan.html#teknoloji-sunucu-yeri). Sınır değerleri D13'ün.";
  b42.why = "Sırayla ya da rastgele dağıtım bir cihazın ya da bir adresin isteklerini bütün kopyalara yayar ve etkin sınırı kopya sayısı katına çıkarır; girişsiz sınıfın sayacı istemci adresine bağlı olduğundan aynı adres aynı kopyaya gitmelidir. Kampüs NAT'ı arkasındaki telefonların girişli istekleri başlık taşıdığından adres özetine düşen yalnız panel ve girişten önceki isteklerdir; bunlar az olduğundan tek kopyaya yığılma yük sorunu yaratmaz (teknik.html#sunucu-guvenlik).";

  S.resolved_gaps.push({
    gap: 'D15-A12',
    decision: "Mimar kararıyla kapandı (I080 CHANGE; I081 ile I086, A1, A2). contracts.json'a D15 dış yüzü (ayarlariYukle, ayarlar, gizliAnahtar, gizliAnahtarSeti, log, logOlustur, uyariAc, saatEsitlemeDurumu, telefonSayaciOgesi, kimlikOlayiDinleyicisi, isletimEklentisi, isletimIsleri, kapanisiBaslat, TestDunyasi, kurucuTanimla), reads_from'a bileşim kökü notuyla D01, D03, D04 ve D07, dosya haritasına .node-version, .gitignore, compose.gelistirme.yaml, docker/isletim/* ve apps/server/src/cli/olay* globları eklendi; makine betikleri infra/izleme/makine altından docker/isletim'e, oturumları kapatma komutu cli/olay.ts'e taşındı. İki ayrım: kimlik olayına bağlanma kimlikOlayiDinleyicisiKaydet ile değil D01.kimlikDinleyicileriniKur'un isletim abonesiyledir (kimlikOlayiDinleyicisi; kurulumu app.ts uygulamaKur, D12 cli/geri-yukleme, D15 cli/anahtar-uret ve cli/olay yapar), KID_BILINMIYOR için 'anahtar emekli' gerekçesi reddedildi (D07-B19). Yaprak kuralı: infra/izleme ve infra/ayarlar alan modülü içe aktarmaz; D01, D03, D04 ve D07'yi D15'in dosyalarından yalnız server.ts ve cli/ girişleri çağırır. Komşu istekleri: D13 I081, D14 I082, D12 I083, D06 I084, D01 I085, D07 I086 (Başka modüllerden beklenenler).",
    why: "Sözleşme dosyası ve dosya haritası mimarındır; D15 yalnız önerdi. Karar contracts.json ve align/decisions.json'da.",
  });

  // ---------- open points: architect decided A12 ----------
  S.open_points.splice(idx(S.open_points, 'id', 'D15-A12'), 1);
  if (S.open_points.some((o) => !o.needs_owner)) throw new Error('open point with needs_owner false left');

  // ---------- queue item ----------
  const q = S.queue_items[0];
  q.kilit = "OgeIsleyici.kilitAnahtarlari: paketteki PERSONEL öğesinde ekranSureleri doluysa ekranTavaniAnahtari(kisiId, gun) döner ('isletim:ekran_tavani:<kisiId>:<gun>', katman 1); D06 paketin anahtarlarını kendi 'esitleme:kurulum_siniri:<kisiId>' anahtarıyla birleştirip hiçbir grubu işlemeden önce tek D12.danismaKilidi çağrısında alır. Öğrenci öğesinde, boş ekranSureleri'nde ve ayrıştırılamayan gövdede anahtar yoktur; isle yeni anahtar istemez (I014).";
  rep(q, 'sinir', 'govdeEnBuyukBayt 49152 (', 'govdeEnBuyukBayt 49152 ve ilkCapaVar false (I084; ');

  // ---------- registrations ----------
  const R = S.registrations;
  R[0] = R[0] + ' İşleyici govdeEnBuyukBayt 49152, ilkCapaVar false ve kilitAnahtarlari kancasıyla kaydolur (I084, I014).';
  R[strIdx(R, 'D01.kimlikOlayiDinleyicisiKaydet')] = "D01.kimlikDinleyicileriniKur({ dersler, esitleme, projeksiyon, isletim: kimlikOlayiDinleyicisi }): D15 kendisi kaydolmaz; app.ts uygulamaKur (api ve isci), D12'nin cli/geri-yukleme'si ve D15'in cli/anahtar-uret ile cli/olay girişleri dört aboneyle kurar, sonra kimlikDinleyicileriHazir çağırır (I050, I080).";

  // ---------- interfaces read ----------
  S.dis_yuz_kullanimi = [
    "D06 (contracts.json): ogeTuruKaydet (app.ts'ten seçenekle); OgeIsleyici (kilitAnahtarlari kancası dahil), GelenOge, PaketBaglami, OgeSonucu, OGE_SONUCLARI tipleri (packages/contracts/src/esitleme.ts); esitlemeKimlikDinleyicisi (cli girişlerinde abone).",
    "D12 (contracts.json): veritabaniKur (server.ts ve cli girişleri), Veritabani.islem, semaDurumu ve danismaKilidi (katmanlı; DanismaAnahtari tipi packages/contracts/src/veritabani.ts; eklenti ve işler, parametreyle), tabloYardimcilari ve kisitAdi (tablolar.ts), testVeritabaniHazirla, senaryoOncesiSifirla ve testVeritabaniAdi (kancalar), YedekIsDurumu şeması (packages/contracts/src/veritabani.ts).",
    "D13 (contracts.json): uygulamaKur (server.ts ve test dünyası; surec ve olcumYazici seçenekleriyle), EklentiTemelSecenekleri, rotalariKaydet (app.ts'ten), rotaTanimla, hataKodlariTanimla, UygulamaHatasi, hataZarfiSemasi, genisleyenEnum ve ortak şemalar (packages/contracts/src/ortak/), HIZ_SINIFLARI (yük testi), PLATFORMLAR ve yayinBilgisiSemasi (iosDagitimTurleri dahil; packages/contracts/src/api.ts), TUM_ROTALAR (test dünyası).",
    "D14 (contracts.json): isSagligi (zamanlama.sonCikti dahil) ve epostaGonder (işlere bag ile; isletim_uyarisi ve isletim_ozeti türleri), isKuyruguKur, epostaKur ve smtpTasiyicisi (server.ts), sahtePostaKutusu, isKuyrugunuBosalt ve test kuyruğu yardımcıları (test dünyası), EPOSTA_TURLERI.",
    "D01 (bileşim kökü yoluyla, I080 ve I085): kimlikDinleyicileriniKur ve kimlikDinleyicileriHazir (cli/anahtar-uret ve cli/olay girişleri, dört aboneyle), hesapSilindiMi okuyucusu (yaprak; app.ts'ten eklentiye), oturumlariKapat (cli/olay oturumlari-kapat); KimlikDinleyicisi ve KimlikOlayi tipleri.",
    "D02 (bileşim kökü yoluyla, I006 ve I050): donemArasiMi (yalnız cli/anahtar-uret donem-arasi, yayın penceresi için), derslerKimlikDinleyicisi (cli girişlerinde abone).",
    "D07 (bileşim kökü yoluyla, I080 ve I086): yenidenDegerlendir(tx, { belgeKid: { amac, kid } }, 'ANAHTAR_ELE_GECIRILDI') (yalnız anahtar-uret ele-gecirildi'nin son adımı).",
    "D11 (sözleşme ve bileşim kökü yoluyla, I050, I052 ve I088): projeksiyonAyarSemasi (packages/contracts/src/projeksiyon.ts; Ayarlar.projeksiyon), projeksiyonKimlikDinleyicisi (cli girişlerinde abone), apps/server/test/support/kurucular/projeksiyon.ts kurucusu ve kodlar ucunun istek biçimi (yük testi).",
    "D03 (sözleşme sabiti, I080): LISTELER_GIZLI_ALANLAR, server.ts'te logOlustur'a ekGizliAdlar.",
    "D04 (bileşim kökü yoluyla, I080): Saat arayüzü simdi() (parametreyle), sistemSaati (server.ts), sahte saat ve pgBossSaati (test dünyası).",
    "Bütün modüllerin veri kurucuları: KurucuHaritasi ile (test dünyası); olcum_ görünümleri D01, D02, D03, D05, D06, D07 ve D09 tablolarını yalnız okur (contracts.json istisnası; okunan komşu sütunlar Tablolar bölümünde).",
  ];

  // ---------- settings schema ----------
  const A = S.ayar_semasi;
  const a = (env) => find(A, 'env', env);
  const after = (env, ...rows) => A.splice(idx(A, 'env', env) + 1, 0, ...rows);
  rep(a('YAYIN_BILGISI_YOLU'), 'isteyen', 'D13, D07', 'D13 (yayinBilgisi(); D07 dosyayı yalnız bununla okur, I031)');
  after('SAAT_ESITLEME_DENETIM_ARALIGI_MS', { env: 'SAAT_ESITLEME_KAPANIS_ESIGI_MS', alan: 'saat.esitlemeKapanisEsigiMs', kural: '3000..600000 ve en az 3 x SAAT_ESITLEME_DENETIM_ARALIGI_MS (şema denetler, tutmazsa ISLETIM_AYAR_GECERSIZ); D04 eşitleme kesintisi satırını son bozuk okumadan bu süre geçince kapatır', varsayilan: '15000', surecler: 'api', isteyen: 'D04 (I018)' });
  for (const env of ['EPOSTA_SMTP_SUNUCU', 'EPOSTA_GONDEREN_ADRES', 'EPOSTA_GONDEREN_AD', 'EPOSTA_URUN_ADI']) rep(a(env), 'varsayilan', 'yok', 'yok (api ve isci zorunlu; eksikse işçi de açılmaz, I077)');
  after('VERITABANI_HAVUZ_BEKLEME_MS',
    { env: '(türetilir)', alan: 'veritabani.isciBaglantiAdresi', kural: 'postgres://yoklama_isci@VERITABANI_SUNUCU:VERITABANI_PORT/VERITABANI_ADI, parola yoklama_isci_parolasi sırrından; GizliDeger', varsayilan: 'ayarlardan', surecler: 'isci', isteyen: 'D14 (isKuyruguKur baglantiAdresi, I077)' },
    { env: '(türetilir)', alan: 'veritabani.sahipBaglantiAdresi', kural: 'postgres://yoklama_sahip@VERITABANI_SUNUCU:VERITABANI_PORT/VERITABANI_ADI, parola yoklama_sahip_parolasi sırrından; GizliDeger', varsayilan: 'ayarlardan', surecler: 'goc', isteyen: 'D14 (kur adımında kuyruklariKur sahipBaglantiAdresi, I077)' });
  rep(a('ASAMA2_QR_ACIK'), 'kural', "(app.ts derslerEklentisi'ne qrDersAyariAcik, D11 eklentisine verir)", "(app.ts derslerEklentisi'ne qrDersAyariAcik, projeksiyonEklentisi'ne qrAcik olarak verir; I052)");
  after('ASAMA2_QR_ACIK', { env: '(yok)', alan: 'projeksiyon', kural: 'isteğe bağlı bölüm; şeması projeksiyonAyarSemasi (packages/contracts/src/projeksiyon.ts, D11); ortamdan okunmaz, değişikliği kod değişikliğidir', varsayilan: "projeksiyonAyarSemasi.parse({}): 10, 20 ve 30 sn sınırları, 1 sn tolerans, 5 dk kod süresi, 15 dk onay öncesi, 10 dk'da 5 yanlış, adres başına 10 dk'da 100 yeni tarayıcı, 200.000 depolama tavanı, 60 sn önceki çerez kabulü, yedek kod sınırları, Bluetooth ve konum değerleri", surecler: 'api, isci', isteyen: 'D11 (I052)' });
  for (const env of ['ANDROID_PAKET_ADI', 'ANDROID_IMZA_OZETLERI', 'APP_ATTEST_UYGULAMA_KIMLIGI']) rep(a(env), 'isteyen', 'D07', 'D07 (I031)');
  rep(a('IPTAL_LISTESI_ADRESI'), 'isteyen', 'D07', 'D07 (I031)');
  rep(a('IPTAL_LISTESI_ADRESI'), 'kural', 'https adresi', 'https adresi; ana makinesi sunucunun dışarı çıkış listesindedir (D15-B10)');
  rep(a('DEVAM_SAYIM_TABANI'), 'isteyen', 'D08', 'D08 (I038)');
  rep(a('DUZELTMELER_PARTI_BOYU'), 'isteyen', 'D09', 'D09 (I045)');

  // ---------- secrets matrix ----------
  const Z = S.sirlar;
  rep(find(Z, 'ad', 'eposta_ozeti'), 'servisler', 'api-1, api-2, isci', 'api-1, api-2, isci (koşulsuz, I077)');
  rep(find(Z, 'ad', 'smtp_parolasi'), 'tur', 'tek değer (EPOSTA_SMTP_KULLANICI varsa)', "tek değer; Compose'da koşulsuz bağlanır, değeri EPOSTA_SMTP_KULLANICI doluyken zorunlu (I077)");
  Z.splice(idx(Z, 'ad', 'yoklama_isci_parolasi') + 1, 0, { ad: 'yoklama_saklama_parolasi', tur: 'tek değer (D12)', servisler: 'isci, goc', kullanan: 'D12 (saklama işleri ayrı yoklama_saklama girişli bağlantıyla, havuz 1; göç kurulum adımı parolayı yeniler; I061)' });

  // ---------- alert rules ----------
  const U = S.uyari_kurallari;
  const u = (tur) => find(U, 'tur', tur);
  rep(u('isletim.yedek_eski'), 'kosul', 'ilk cumartesiler arası 35 gün olabilir', "ilk cumartesiler arası 35 gün olabilir; atlandi sonucu sonBasariAni'yi değiştirmez, atlanan iş bu yaş eşiğiyle eskime kuralına düşer (I061)");
  rep(u('isletim.devam_tutarlilik_farki'), 'kosul', 'devam_tutarlilik_denetimi son çıktısında farkSayisi > 0 (D08-A08)', "D14 IsSagligi'nda devam_tutarlilik_denetimi kuyruğunun zamanlama.sonCikti.farkSayisi > 0; kuralYenidenHesapSayisi uyarı açmaz (I038, I077)");
  const baska = u('<başka modül>.<olay>');
  rep(baska, 'kosul', 'uyariAc çağrısı (ör. dogrulama.iptal_listesi_eski, kimlik.inceleme_ayari_eksik)',
    "uyariAc çağrısı. Örnekler: dogrulama.iptal_listesi_eski (D07); dogrulama.app_attest_yenileme_sik (D07; bir cihazın 24 saatte 2'den çok anahtar yenilemesi, anahtar esik-2-24s); dogrulama.hatali_surum_gec_yuklendi (D07; açılışta, yüklenen hatalı sürüm girdisinin baslangic'i yükleme anından önce); kimlik.inceleme_ayari_eksik (D01) (I031)");
  rep(baska, 'girdi', 'D01, D07 uyariAc çağrısı', 'D01, D04, D07 uyariAc çağrısı');
  U.splice(idx(U, 'tur', '<başka modül>.<olay>'), 0, { tur: 'saat.pencere_kapanamadi', anahtar: 'oturum kimliği', seviye: 'UYARI (çağıranın varsayılanı)', kapanma: 'SESSIZLIK', kosul: 'D04 pencere kapanışında kapanış anından 3 dakika sonra hâlâ kapanamayan satır (dinleyici hatası; değer hata kodu); her başarısız denemede tekrar_sayisi artar, dinleyici düzelince yeniden açılmaz (I018)', degerlendiren: 'isletim_denetimi (yalnız SESSIZLIK kapanışı)', girdi: 'D04 uyariAc çağrısı' });
  U.splice(idx(U, 'tur', 'isletim.api_olcum_yok'), 0, { tur: 'isletim.kanit_reddi', anahtar: '', seviye: 'UYARI', kapanma: 'KOSUL', kosul: "son 10 dakikada dogrulama.kanit_reddedildi log satırı >= 10 (API ölçü dosyalarının logOlaylari alanı; satırlarda platform ve gerekçe dağılımı). Ayardaki imza özeti ya da App ID yanlışsa bütün gerçek kayıtlar reddedilir (D07, I031)", degerlendiren: 'isletim_denetimi', girdi: 'api_olcum' });
};

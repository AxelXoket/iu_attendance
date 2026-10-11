'use strict';
// Files and tests.
const { rep, find, idx } = require('./lib.js');

module.exports = function p3(S) {
  // ---------- files ----------
  let F = S.files.slice();
  const isletimDosyalari = F.filter((f) => f.startsWith('docker/isletim/') && f !== 'docker/isletim/makine.test.ts');
  if (isletimDosyalari.length !== 16) throw new Error('expected 16 machine files, got ' + isletimDosyalari.length);
  F = F.filter((f) => !f.startsWith('docker/isletim/'));
  const ins = (after, ...yeni) => { const i = F.indexOf(after); if (i < 0) throw new Error('files: ' + after); F.splice(i + 1, 0, ...yeni); };
  ins('apps/server/src/infra/izleme/node-surumu-denetimi.test.ts', 'apps/server/src/infra/izleme/makine-betikleri.test.ts');
  ins('apps/server/src/cli/olcum-raporu.ts', 'apps/server/src/cli/olay.ts');
  ins('apps/server/test/features/isletim/anahtar-dondurme.feature', 'apps/server/test/features/isletim/komut-girisleri.feature', 'apps/server/test/features/isletim/cevap-semasi-denetimi.feature');
  ins('apps/server/test/steps/isletim/anahtar-adimlari.ts', 'apps/server/test/steps/isletim/komut-adimlari.ts');
  ins('.env.example', '.node-version', '.gitignore');
  ins('compose.yaml', 'compose.gelistirme.yaml');
  ins('docker/xprem/cosign.pub', ...isletimDosyalari);
  ins('.github/workflows/yayin-ota.yml', '.github/workflows/yayin-telefon.yml');
  if (new Set(F).size !== F.length) throw new Error('duplicate file');
  S.files = F;

  // ---------- tests ----------
  const T = S.tests;
  const t = (name) => find(T, 'name', name);
  const add = (afterName, test) => T.splice(idx(T, 'name', afterName) + 1, 0, test);

  rep(t('Kapanış başlayınca sağlık uçları 503 döner, süren istek biter'), 'asserts',
    '503 ISLETIM_KAPANIYOR; açık istek 200 ile tamamlanır;',
    "503 ISLETIM_KAPANIYOR ve Retry-After 5 (bekleme { sabit: 5 }, I069); açık istek 200 ile tamamlanır;");
  add('Bellek eşiği kap sınırının altında olmalı', {
    name: 'Saat eşitleme kapanış eşiği aralığın üç katından küçük olamaz', kind: 'behavior',
    asserts: "SAAT_ESITLEME_DENETIM_ARALIGI_MS 5000 iken SAAT_ESITLEME_KAPANIS_ESIGI_MS 14999 ile ayarlariYukle ISLETIM_AYAR_GECERSIZ verir ve ileti yalnız iki ayarın adını sayar; 15000 kabul (sınır yer kontrolü); aralık 6000 ve eşik 15000 yine ISLETIM_AYAR_GECERSIZ. Dört SAAT_ESITLEME_ ayarının varsayılanları (100, 120000, 5000, 15000) ayar şemasından içe aktarılır, test yeniden yazmaz (I018).",
  });
  rep(t('Süreç türüne göre zorunlu sırlar'), 'asserts',
    'isci iken giris_kodu_ozeti ve ulasma_makbuzu aranmaz, istenirse ISLETIM_GIZLI_ANAHTAR_YOK fırlar.',
    "isci iken giris_kodu_ozeti ve ulasma_makbuzu aranmaz, istenirse ISLETIM_GIZLI_ANAHTAR_YOK fırlar; isci iken yoklama_isci_parolasi ve yoklama_saklama_parolasi zorunlu (I061); EPOSTA_SMTP_SUNUCU eksikken api de isci de ISLETIM_AYAR_GECERSIZ ile açılmaz (I077).");
  rep(t('Ekran süresi kişi ve gün tavanı'), 'asserts',
    'aynı paketteki yoklama kaydı KABUL alır.',
    "aynı paketteki yoklama kaydı KABUL alır. Eşzamanlılık: aynı hoca ve gün için tavana bir yeni anahtar kala panel isteği ile yeni anahtar taşıyan telefon_sayaci öğesi iki bağlantıdan aynı anda gelir: yalnız biri yazar, satır sayısı 500'ü geçmez (iki yol aynı 'isletim:ekran_tavani:<kisiId>:<gun>' anahtarını alır; I014). Öğrenci paketinde ve ekranSureleri boş personel öğesinde kilitAnahtarlari anahtar döndürmez (zemin).");
  rep(t('Hesap silinince sayaçlar ve ekran süreleri silinir'), 'asserts',
    "D01'in hesap_silindi olayı (kurucu ile tetiklenir)",
    "D01'in hesap_silindi olayı (kurucu ile tetiklenir; kimlikOlayiDinleyicisi uygulamaKur'daki kimlikDinleyicileriniKur ile isletim abonesi olarak kurulmuştur)");
  rep(t('Durum dosyalarından uyarı'), 'asserts',
    'Ayın ilk cumartesileri arasındaki 35 günlük aralıkta geri yükleme denemesi uyarısı yok.',
    "Ayın ilk cumartesileri arasındaki 35 günlük aralıkta geri yükleme denemesi uyarısı yok. sonSonuc atlandi ve sonBasariAni 27 saat önce olan gecelik_pg_dump dosyası KRITIK isletim.yedek_eski açar (atlandi sonBasariAni'yi taşıdığından eskime kuralına düşer), 25 saat önce olan açmaz; pgbackrest_tam_yedek'in son başarısı 8 gün 1 saat önceyse UYARI, 7 gün 23 saat önceyse uyarı yok (I061).");
  t('Devam tutarlılık farkı uyarıya döner').asserts =
    "D14 isSagligi devam_tutarlilik_denetimi kuyruğunun zamanlama.sonCikti'sında farkSayisi 3 verirken isletim.devam_tutarlilik_farki açılır; sonraki çıktı 0 olunca kapanır. kuralYenidenHesapSayisi 5 ve farkSayisi 0 iken uyarı açılmaz (zemin; I038, I077).";
  rep(t('Compose dosyası kuralları'), 'asserts',
    'caddy onyuz ağında 172.30.11.10.',
    "caddy onyuz ağında 172.30.11.10; goc veritabani ağında 172.30.12.20 (D12'nin pg_hba postgres satırı yalnız bu adresten); yoklama_saklama_parolasi yalnız isci ve goc'ta; smtp_parolasi ve eposta_ozeti api-1, api-2 ve isci'de koşulsuz (I061, I077). docker compose -f compose.yaml -f compose.gelistirme.yaml config geçerli ve D12'nin geliştirme parçasını içerir (postgres 127.0.0.1:5432); yalnız compose.yaml ile postgres kapı yayımlamaz (yer kontrolü); imajın /app/yayin/ paketinde compose.gelistirme.yaml yoktur.");
  rep(t('Caddy yolları ve başlıkları'), 'asserts',
    '65 MB gövde 413.',
    "65 MB gövde 413. Yük dağıtımı: kendi adını yankılayan iki sahte API kopyasıyla aynı X-Kurulum-Kimligi taşıyan 20 istek hep aynı kopyaya, başlıksız 20 istek aynı istemci adresinden hep aynı kopyaya gider; farklı başlık değerleri iki kopyaya dağılır (yer kontrolü; I069).");
  t('Yayın bilgisi üretimi').asserts =
    "yayin-bilgisi-uret kaynağa bicim 1, sira (kaynak dosyasına dokunan commit sayısı; ana dal doğrusal olduğundan her kaynak değişikliğinde artar) ve olusturmaAni (son commit anı) ekler; iosDagitimTurleri kaynaktan aynen geçer; çıktı D13 yayinBilgisiSemasi'na uyar; aynı commit iki kez aynı baytları üretir; en düşük sürümü en son sürümden büyük kaynak kırmızı. Bir önceki sunucu/v* etiketindeki kaynakta olmayan hatalı sürüm girdisinin baslangic'i olusturmaAni'den önceyse kırmızı, eşit ya da sonraysa yeşil (I031); önceki etiketteki sıradan büyük olmayan sira kırmızı.";
  t('Eski sürüm istekleri hâlâ kabul edilir').asserts =
    "packages/contracts/openapi/destek.json'daki tamDenetimTabani'na eşit ya da yüksek her saklı sürümün ornekler/surumler/<sürüm>/ altındaki bütün örnekleri, bütün saklı sürümlerin ise gönderim (POST /v1/esitleme/gonderim, öğe gövdeleri dahil) ve hepSurumYollari örnekleri, sahte saat örneğin geçerli penceresine kurularak oynatılır; beklenen durum ve öğe sonuçları aynen döner (plan.html#dagitim-guncelleme-ilkesi, I069). Klasör boşken senaryo örnek sayısının sıfır olmadığını yazar ve kırmızıdır (ilk uygulama yayınından sonra).";
  rep(t('Yayın betiği imza tutmazsa hiçbir şey değiştirmez'), 'asserts',
    'pencere İstanbul saatine göre denetlenir.',
    "pencere İstanbul saatine göre denetlenir. Dönem arası sahte anahtar-uret donem-arasi'dan gelir: hafta içi İstanbul 09:00'da { donemArasi: true } iken --simdi olmadan geçer, false iken durur, komut hata verince durur (dönem içi sayılır; I006). Çalışan sürümün dosyasında olmayan hatalı sürüm girdisinin baslangic'i yayın anından önceyse betik --gec-ilan olmadan durur, sonraysa geçer (I031).");
  rep(t('Anahtar döndürme iki adımda ve bütün süreçlerde'), 'asserts', 'makine.test.ts:', 'makine-betikleri.test.ts:');
  rep(t('Ele geçirilen anahtarın şüphe anından sonraki kayıtları yeniden değerlendirilir'), 'asserts',
    "ikinci kayıt D07.yenidenDegerlendir ile İncelemede'ye döner",
    "ikinci kayıt D07.yenidenDegerlendir(tx, { belgeKid: { amac: 'saat_belgesi', kid: K } }, 'ANAHTAR_ELE_GECIRILDI') ile İncelemede'ye döner (I086)");
  const t65 = t('Ders çıkışı yük testi geçme ölçütleri');
  rep(t65, 'asserts', 'k6 thresholds (esikler.ts):', "k6 thresholds (esikler.ts; telefon başına istek hızı D13'ün HIZ_SINIFLARI değerlerinden içe aktarılır, I069; değişenler isteği öğrenci indirmesinin D08 devam bölümünü içerir, I038):");
  rep(t65, 'asserts', 'Aşama 2 yayındaysa (D11 senaryosu):', "Aşama 2 yayındaysa (projeksiyon senaryosu D15'in ortak/kursu.ts ve ders-cikisi.ts dosyalarında, kürsü eşleştirmesi D11'in support/kurucular/projeksiyon.ts kurucusuyla; I088):");
  rep(t('Ölçü dosyası yazıcısı yalnız sunucu sürecinde açılır'), 'asserts',
    'app.ts test dünyasındaki gibi olcumYazici verilmeden kurulup app.ready() çağrılınca',
    "uygulamaKur test dünyasındaki gibi olcumYazici verilmeden çağrılıp app.ready() yapılınca (surec 'belge' ile de)");

  add('Anahtar döndürme iki adımda ve bütün süreçlerde', {
    name: 'Komut girişleri kimlik dinleyicilerini kurar', kind: 'behavior',
    asserts: "komut-girisleri.feature: olay oturumlari-kapat --tur personel açılışta D01.kimlikDinleyicileriniKur'u dört aboneyle (dersler D02, esitleme D06, projeksiyon D11, isletim D15) ve kimlikDinleyicileriHazir'ı çağırır; bütün personel oturumları kapanır, her biri için denetim kaydı yazılır ve hocanın etkin QR yuvası olay anıyla iptal olur (projeksiyon abonesinin bağlandığının davranış kanıtı); öğrenci oturumları açık kalır (zemin). anahtar-uret donem-arasi, dersi başlamış ve kilidi gelmemiş etkin bir birim dönemi varken { donemArasi: false }, yokken true yazar ve D02.donemArasiMi ile aynı değeri verir. Abonelerden biri verilmeden kurulan giriş açılmaz (D01 kuralı) ve hiçbir oturum kapanmaz (I050, I080).",
  });
  add('API ölçü dosyalarından uyarı', {
    name: 'Kanıt reddi ölçülür ve uyarı açar', kind: 'behavior',
    asserts: "dogrulama.kanit_reddedildi olaylı 10 log satırı (platform android, gerekçe BAGLAMA_IMZASI_GECERSIZ) son 10 dakikada iki kopyanın ölçü dosyalarına logOlaylari olarak düşer ve isletim_denetimi UYARI isletim.kanit_reddi açar, satırlar platform ve gerekçe sayılarını taşır; 9 satırda açılmaz (sınır yer kontrolü); sayılan log satırının içeriği sayaç olmadan yazılanla bayt bayt aynı. Eşik ISLETIM_ESIKLERI'nden içe aktarılır (I031).",
  });
  add('Senaryo loglarında numara ve isim bulunmaz', {
    name: 'Ortak test kancası cevabı beyanlı şemayla denetler', kind: 'behavior',
    asserts: "cevap-semasi-denetimi.feature: deneme rotası beyan ettiği 200 şemasında olmayan bir alan döndürünce senaryo kırmızı; beyan etmediği 409 ile dönünce kırmızı; 4xx gövdesi hataZarfiSemasi'na uymayınca kırmızı; şemaya uyan 200 ve hataZarfiSemasi'na uyan beyanlı 400 yeşil (yer kontrolü; D13, I069).",
  });
  add('Node sürümü üç dosyada aynı', {
    name: 'Telefon yayın iş akışı sözleşme kapısını bekler', kind: 'contract',
    asserts: "yayin-telefon.yml ayrıştırılır: ikiliyi derleyen iş sozlesme-kapisi işine needs ile bağlı; kapı adımı sahte GitHub API cevabıyla mobil/vX etiketinin commit'indeki sozlesme.yml koşusunun sozlesme işi (etiket kipi) failure ya da yokken 1 ile, success iken 0 ile çıkar (I069); iş akışının varsayılan yetkisi contents: read.",
  });
  add('Telefon yayın iş akışı sözleşme kapısını bekler', {
    name: 'İmaj açılış denetimi derlenmiş sözleşme paketini ister', kind: 'behavior',
    asserts: "Haftalık işin imaj derlemesinde son adım derlenmiş packages/contracts ve packages/core paketlerini koşul bayrağı olmadan içe aktarır: tsconfig.build.json derlemesi atlanmış deneme Dockerfile'ıyla imaj derlemesi kırmızı, normal derleme yeşil (yer kontrolü). Geliştirme ve testte aynı içe aktarma --conditions=kaynak ile .ts kaynağına gider (I069).",
  });
  add('Sayaç sıra kuralının mutasyonu', {
    name: 'Ekran tavanı kilidinin mutasyonu', kind: 'mutation',
    asserts: "telefon-sayaci.ts'te kilitAnahtarlari boş dizi döndürecek biçimde bozulunca 'Ekran süresi kişi ve gün tavanı' testinin eşzamanlılık adımı kırmızı olur (satır sayısı 501); ekran-sureleri.ts'te danismaKilidi çağrısı kaldırılınca aynı adım kırmızı; dosyalar md5 ile karşılaştırılarak geri yazılır, git kullanılmaz.",
  });
};

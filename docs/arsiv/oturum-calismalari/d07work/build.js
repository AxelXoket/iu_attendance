// Builds packages/D07.json from a compact plan; test names come from the spec by index so none is retyped.
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec/D07.json'), 'utf8'));
const T = i => { const t = S.tests[i]; if (!t) throw new Error('no test ' + i); return t.name; };
const core = f => 'packages/core/src/dogrulama/' + f;
const mod = f => 'apps/server/src/modules/dogrulama/' + f;
const job = f => 'apps/server/src/jobs/dogrulama/' + f;
const feat = f => 'apps/server/test/features/dogrulama/' + f;
const step = f => 'apps/server/test/steps/dogrulama/' + f;
const MIG = 'apps/server/migrations/20261012080000_dogrulama_tablolar/';

const P = [
  {
    title: 'Sözleşme ve kod kataloğu',
    files: [core('kodlar.ts'), core('sabitler.ts'), core('ortak-sinir.ts'), core('ortak-sinir.test.ts'), 'packages/contracts/src/dogrulama.ts'],
    exports: ['dogrulamaTeyitAnahtari', 'dogrulamaListeAnahtari', 'kararAnahtarlari'],
    needs: ['D05.yoklamaCiftAnahtari', 'D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.ogeTuruTanimla', 'D13.anSemasi', 'D13.kimlikSemasi'],
    tests: [33, 2], depends_on: [], size: 'L',
    notes: "Gerekçe, etiket ve hata kodlarını kodlar.ts ve sabitler.ts'te, ortak sınır kuralını ortak-sinir.ts'te, tipleri, beş rota tanımını, kafa_sayisi gövde şemasını, YENIDEN_NEDENLERI ile KARAR_OLAYLARI listelerini ve üç saf anahtar işlevini contracts/dogrulama.ts'te kurar; ortak sınır özelliği fast-check ile, anahtar işlevlerinin çıktısı ve D05'in yoklamaCiftAnahtari'ndan içe aktarım Vitest sözleşme denetimiyle sınanır."
  },
  {
    title: 'Tablolar, göç ve saklama',
    files: [mod('tablolar.ts'), mod('saklama.ts'), 'apps/server/test/support/kurucular/dogrulama.ts', feat('saklama.feature'), MIG + 'migration.sql', MIG + 'snapshot.json'],
    tables: ['cihaz_dogrulama_degerleri', 'cihaz_kanitlari', 'app_attest_sayaclari', 'android_iptal_listesi', 'ortak_sinir_sayaclari', 'kayit_karar_gecmisi', 'oturum_isaretleri', 'rastgele_isim_secimleri'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D15.kurucuTanimla'],
    tests: [59], depends_on: ['P01'], size: 'L',
    notes: "Sekiz D07 tablosunu kısıt ve dizinleriyle Drizzle'da tanımlayıp tek göç klasörüne üretir (yabancı anahtarlar D01, D02 ve D05 tablolarına bağlanır, olay CHECK'i GECMIS_OLAYLARI'ndan türer), senaryoların kullandığı kurucuları ve dogrulama.donem_verisi saklama işleyicisini yazar; saklama.feature D12.saklamaIsleyicisiniCalistir ile süresi dolan dönemin silindiğini, dolmayanın kaldığını ve D07 dışı tabloya dokunulmadığını gösterir."
  },
  {
    title: 'Meydan okuma düzeni ve örnek kanıtlar',
    files: [core('meydan-okuma.ts'), core('meydan-okuma.test.ts'), feat('ornek-kanitlar.json')],
    needs: [], tests: [7], depends_on: ['P01'], size: 'S',
    notes: "meydanOkumaMetni ve baglamaMetni'nin altı satırlık bayt düzenini saf işlev olarak yazar ve telefon testlerinin de koştuğu kayıtlı örnekleri (üç meydan okuma örneği, Android zincirleri, App Attest nesneleri) ornek-kanitlar.json'da dondurur; meydan-okuma.test.ts baytları ve SHA-256'yı onaltılık olarak birebir karşılaştırır."
  },
  {
    title: 'Doğrulama değeri, kanıt arayüzü ve ölçütler',
    files: [mod('deger.ts'), mod('dogrulayici.ts'), core('android-olcut.ts'), core('app-attest-olcut.ts'), core('seri-no.ts'), core('olcut.test.ts'), core('seri-no.test.ts')],
    exports: ['dogrulamaDegeriniTuket', 'cihazKanitiniDogrula', 'cihazDogrulanmadiMi'],
    needs: ['D04.simdi', 'D15.ayarlar', 'D15.uyariAc', 'D15.log'],
    tests: [10, 17], depends_on: ['P01', 'P02', 'P03'], size: 'L',
    notes: "Değer üretimini ve dogrulamaDegeriniTuket'i deger.ts'te, CihazDogrulayici arayüzünü, bağlama imzası denetimini, cihazKanitiniDogrula ve cihazDogrulanmadiMi'yi dogrulayici.ts'te, Android ve App Attest ölçütleriyle seri numarası normalleştirmesini core'da yazar; ölçüt tablosu ve kayıtlı zincirle seri numarası testleri Vitest ile koşar, sunucu yolu D07-P05'in senaryolarında sınanır."
  },
  {
    title: 'Gerçek doğrulayıcılar ve cihaz senaryoları',
    files: [mod('kokler.ts'), mod('kanit-android.ts'), mod('kanit-app-attest.ts'), feat('cihaz-dogrulama.feature'), step('cihaz-dogrulama.steps.ts')],
    needs: [], tests: [8, 9, 12, 13, 16, 18, 19], depends_on: ['P02', 'P03', 'P04'], size: 'L',
    notes: "Google ve Apple köklerini, Android anahtar kanıtı ve App Attest doğrulayıcılarını CihazDogrulayici arkasında yazar; cihaz-dogrulama.feature sahte ve gerçek doğrulayıcıyla bağlama imzasını, yaprak SPKI eşleşmesini, değerin tek kullanımını ve 5 dakikasını, kayıtlı örneklerin sonuç ve gerekçesini ve yenileme sıklığı uyarısını ağ açmadan sınar."
  },
  {
    title: 'App Attest sayacı ve danışma kilitleri',
    files: [core('sayac.ts'), core('sayac.test.ts'), mod('sayac.ts'), mod('kilitler.ts')],
    exports: ['appAttestSayaciniDenetle'],
    needs: ['D12.danismaKilidi', 'D12.danismaKilidiDene'],
    tests: [4], depends_on: ['P01', 'P02'], size: 'M',
    notes: "Sıra numarasına göre sayaç kuralını saf sayacDenetle ile, appAttestSayaciniDenetle'yi dogrulama:sayac anahtarı ve app_attest_sayaclari satırıyla, bağlam, işaret ve sayaç anahtarlarını katman sırasıyla alan yardımcıları kilitler.ts'te yazar; sayaç özelliği varış permütasyonları, boşluklu dizi ve aynı sıranın başka sayaçla tekrarı üzerinde fast-check ile sınanır."
  },
  {
    title: 'Saf karar motoru',
    files: [core('karar.ts'), core('etiketler.ts'), core('karar-tablosu.ts'), core('karar.test.ts')],
    needs: ['D11.DOGRULAMA', 'D11.GECIKME', 'D04.PENCERE_SONUCLARI'],
    tests: [0, 1, 11], depends_on: ['P01'], size: 'L',
    notes: "kararVer'i, etiket hesabını, pencereEslemesi ve qrEslemesi'ni ve telefonla panelin de koştuğu tek karar tablosunu core'da saf işlev olarak yazar; karar.test.ts tablonun her satırını, öncelik özelliğini ve sistem saati ile saat diliminden bağımsızlığı sınar."
  },
  {
    title: 'Geçiş yüklemi, eşik ve karar bağlamı',
    files: [core('gecisler.ts'), core('gecisler.test.ts'), core('eslemeler.test.ts'), core('kafa-sayisi.ts'), core('kafa-sayisi.test.ts'), core('kafa-sayisi-tam-tarama.periyodik.test.ts'), core('index.ts'), mod('baglam.ts')],
    needs: ['D11.DOGRULAMA', 'D11.GECIKME', 'D04.PENCERE_SONUCLARI', 'D03.uyelikDenetle', 'D04.pencereSonucu', 'D04.kesintiAraliklari', 'D01.cihazGetir', 'D01.ogrenciHesabiGetir', 'D01.cihazAnahtariGetir', 'D02.oturumGetir', 'D02.kilitDurumu', 'D02.OTURUM_DURUMLARI', 'D02.OTURUM_TURLERI', 'D02.IPTAL_NEDENLERI', 'D06.gondermeSuresiSonu', 'D13.yayinBilgisi'],
    tests: [5, 3, 38, 70, 71], depends_on: ['P01', 'P02', 'P03', 'P04', 'P06', 'P07'], size: 'L',
    notes: "izinliGecis yüklemini, kafaSayisiKarsilastir eşiğini ve core dizinini tamamlar, kararın bağlamını üyelik, pencere, cihaz, oturum, kilit ve hatalı sürüm sahiplerinin dış yüzünden toplayan baglam.ts'i yazar; geçiş tablosu, BigInt eşik özelliği ile gece tam taraması, D04 ve D11 listelerine karşı eşleme bütünlüğü ve haftalık Stryker eşiği (yüzde 90) ile sınanır."
  },
  {
    title: 'İlk karar ve karar yazıcısı',
    files: [mod('karar.ts'), step('karar.steps.ts'), feat('ortak-sinir.feature')],
    exports: ['kararHesapla', 'kararGecmisineYaz', 'kararDegistir'],
    needs: ['D05.kayitGetir', 'D05.kayitlariKilitle', 'D05.kararSutunlariniYaz', 'D02.dersGetir', 'D02.kilitDurumu', 'D09.denetimeYaz', 'D09.duzeltmeleriGetir', 'D13.uygulamaHatasi', 'D13.yayinBilgisi', 'D12.danismaKilidi', 'D12.danismaKilidiDene', 'D04.simdi'],
    tests: [41, 42, 39, 40, 20, 69, 66], depends_on: ['P02', 'P06', 'P08'], size: 'L',
    notes: "kararHesapla, kararGecmisineYaz, kararDegistir, tek geçiş yazıcısını ve işaret yenilemesini karar.ts'te yazar (cihazDogrulamaSonucunuYaz eklenti seçeneğiyle gelir), karar senaryolarının ortak adımlarını karar.steps.ts'te kurar; ortak-sinir.feature 2'lik sınırı, eklenmeyen kaydın hak harcamadığını, sayacı artmayan ve sırasız iPhone kayıtlarını, iOS 27 alanını, Doğrulanmış etiketini ve sorgu bütçesini sınar."
  },
  {
    title: 'Yeniden değerlendirme ve karar kuralları',
    files: [mod('yeniden.ts'), step('isler.steps.ts'), feat('karar-kurallari.feature')],
    exports: ['yenidenDegerlendir'],
    needs: ['D05.sayilanKayitlar', 'D05.kayitlariKilitle', 'D02.kilitDurumu', 'D12.danismaKilidi', 'D12.danismaKilidiDene', 'D15.log'],
    tests: [29, 55, 56, 28, 37, 53, 54, 44, 6, 14, 15], depends_on: ['P05', 'P09'], size: 'L',
    notes: "yenidenDegerlendir'i süzgeç alanları, bağlam kilidi denemesi, tek kayitlariKilitle çağrısı ve korunan sayımıyla yazar, olay ve iş adımlarını isler.steps.ts'e koyar; karar-kurallari.feature teyit, cihaz değişimi, hesap silme, ele geçirilmiş anahtar, eski program, hatalı sürüm, çakışan oturum, Kendi beyanı, hoca kararı değişikliği ve cihaz doğrulanmadı etiketini sınar."
  },
  {
    title: 'Olay dinleyicileri ve eşzamanlılık',
    files: [mod('dinleyiciler.ts'), step('eszamanlilik.steps.ts'), feat('eszamanlilik.feature')],
    needs: ['D04.kesintiAraliklari', 'D11.gosterimAraliklari', 'D03.satirGetir', 'D05.kayitlariKilitle'],
    tests: [30, 31, 43, 26, 27, 35], depends_on: ['P10'], size: 'L',
    notes: "D03 KARAR, D04 pencereDegisti, oturumKapandi ve partili kesintiKapandi, D11 gösterim dinleyicilerini dinleyiciler.ts'te yazar; eszamanlilik.feature iki bağlantıyla bağlam yarışını, yeniden değerlendirme ile gönderimi, son ortak sınır hakkını, imleçli kesinti partilerini ve kapanmış pencereye geç ulaşan değişikliği sınar, bağlam kilidi kaldırılınca kırmızıya döner."
  },
  {
    title: 'Kafa sayısı ve oturum işaretleri',
    files: [mod('kafa-sayisi.ts'), step('kafa-sayisi.steps.ts'), feat('kafa-sayisi.feature')],
    exports: ['kafaSayisiOgesi', 'oturumIsaretleri', 'isaretIncelendi'],
    needs: ['D02.oturumGetir', 'D02.birimDonemiGetir', 'D02.dersYetkisi', 'D02.kafaSayisiniYaz', 'D06.gondermeSuresiSonu', 'D09.denetimeYaz', 'D13.uygulamaHatasi', 'D04.simdi'],
    tests: [46, 47, 48, 49, 34], depends_on: ['P11'], size: 'L',
    notes: "kafaSayisiOgesi'ni, karşılaştırma ucunun okuma yolunu, işaret açma ve kesinleştirmeyi, oturumIsaretleri ve isaretIncelendi'yi kafa-sayisi.ts'te yazar; kafa-sayisi.feature çift sayım olmadığını, işaretin ve derste bilgisinin doğru yazıldığını, iki bağlantıda işaretin bir kez açıldığını, erken kapatma ile kafa sayısını ve kesinleşmeden sonra gelen kaydı sınar."
  },
  {
    title: 'Rastgele isim, burada değil ve dönem kilidi',
    files: [mod('rastgele-isim.ts'), mod('kilit.ts'), step('rastgele-isim.steps.ts'), feat('rastgele-isim.feature'), feat('donem-kilidi.feature')],
    exports: ['donemKilidiKararKapanisi'],
    needs: ['D02.oturumGetir', 'D02.dersYetkisi', 'D02.oturumSayfasi', 'D03.satirGetir', 'D05.sayilanKayitlar', 'D09.denetimeYaz', 'D13.uygulamaHatasi', 'D04.simdi', 'D04.istanbulTarihi'],
    tests: [50, 51, 52, 45, 58], depends_on: ['P12'], size: 'L',
    notes: "Rastgele isim seçimini, burada değil işaretini ve aynı gün geri almasını rastgele-isim.ts'te, donemKilidiKararKapanisi'ni 150 kayıtlık olay parçalarıyla kilit.ts'te yazar; rastgele-isim.feature ve donem-kilidi.feature tekrarsız seçimi, kafa sayısından önceki basış sınırını, işaretli öğrencinin sonraki kaydını, geri alma kurallarını ve kilit olaylarının işlemle birlikte geri alındığını sınar."
  },
  {
    title: 'Arka plan işleri',
    files: [mod('iptal-listesi.ts'), mod('kuyruklar.ts'), job('android-iptal-listesi-cek.ts'), job('bekleyen-kararlari-coz.ts'), job('pencere-beklemede-kesinlestir.ts'), job('index.ts'), feat('iptal-listesi.feature'), feat('bekleyen-kararlar.feature')],
    jobs: ['android_iptal_listesi_cek', 'bekleyen_kararlari_coz', 'pencere_beklemede_kesinlestir'],
    needs: ['D14.isGonder', 'D14.isTanimla', 'D02.oturumSayfasi', 'D02.birimDonemiGetir', 'D02.OTURUM_TURLERI', 'D06.gondermeSuresiSonu', 'D15.ayarlar', 'D15.uyariAc', 'D01.cihazDogrulamaSonucunuYaz', 'D09.denetimeYaz', 'D04.simdi'],
    tests: [21, 22, 23, 36, 57, 60], depends_on: ['P12'], size: 'L',
    notes: "Üç işin kuyruk tanımlarını, iptal listesi çekimini ve kanıt yeniden denetimini, bekleyen kararların dört adımlı gece kapanışını ve pencere kesinleştirmesini isler dizisiyle yazar; iptal-listesi.feature ve bekleyen-kararlar.feature ileriye etkili iptali, 7 günlük eski liste uyarısını, kafa sayısı gelmeyen oturumu, süresi dolan değişim talebini ve D14'ün aynı veriyle iki kez adımını sınar."
  },
  {
    title: 'Eklenti, rotalar ve uçtan uca senaryolar',
    files: [mod('eklenti.ts'), mod('index.ts'), mod('rotalar.ts'), feat('kayit-baglari.feature'), feat('yetki.feature'), feat('liste-degisikligi.feature'), feat('hile-senaryolari.feature')],
    endpoints: ['POST /v1/dogrulama/deger', 'GET /v1/dogrulama/oturumlar/{oturumId}/kafa-sayisi', 'POST /v1/dogrulama/oturumlar/{oturumId}/rastgele-isim', 'POST /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil', 'DELETE /v1/dogrulama/oturumlar/{oturumId}/sinifta-degil/{ogrenciId}'],
    exports: ['dogrulamaEklentisi'],
    needs: ['D13.rotalariKaydet', 'D13.hizSinifi', 'D06.ogeTuruKaydet', 'D02.kilitAdimiKaydet', 'D03.listeDegisikligiDinleyicisiKaydet', 'D04.pencereDegistiDinleyicisiKaydet', 'D04.oturumKapandiDinleyicisiKaydet', 'D04.kesintiKapandiDinleyicisiKaydet', 'D11.gosterimKaydiDinleyicisiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D09.denetimOlaylariniKaydet', 'D01.cihazDogrulamaSonucunuYaz', 'D08.ogrenciDevamDurumu'],
    tests: [63, 64, 65, 68, 73, 74, 24, 25, 32, 61, 62, 67, 72], depends_on: ['P02', 'P05', 'P13', 'P14'], size: 'L',
    notes: "dogrulamaEklentisi'ni, dış yüzü veren index.ts'i, beş rotayı ve D06, D02, D03, D04, D11, D12, D09 kayıtlarını yazar; birleşik uygulamada yetki.feature uç yetkilerini ve sözleşmeyi, kayit-baglari.feature kayıtları, kuyruk öğesini ve katman sırasını, liste-degisikligi.feature D03 ve D08 ortak senaryosunu, hile-senaryolari.feature durum makinesi özelliklerini sınar, log süzgeci ve dosya döngüsü kuralı da burada koşar."
  }
];

const out = { id: 'D07', packages: P.map((p, i) => ({
  id: 'D07-P' + String(i + 1).padStart(2, '0'),
  title: p.title,
  files: p.files,
  tables: p.tables || [],
  endpoints: p.endpoints || [],
  jobs: p.jobs || [],
  exports: p.exports || [],
  needs: p.needs || [],
  tests: p.tests.map(T),
  depends_on: (p.depends_on || []).map(d => 'D07-' + d),
  size: p.size,
  notes: p.notes
})) };

// Every spec test exactly once (own check; the gate does not enforce it).
const seen = new Map();
for (const p of P) for (const i of p.tests) { if (seen.has(i)) throw new Error('test ' + i + ' twice'); seen.set(i, 1); }
const missing = S.tests.map((_, i) => i).filter(i => !seen.has(i));
if (missing.length) throw new Error('tests in no package: ' + missing.join(','));
const txt = JSON.stringify(out, null, 2) + '\n';
if (/[–—]/.test(txt)) throw new Error('dash');
fs.mkdirSync(path.join(B, 'packages'), { recursive: true });
fs.writeFileSync(path.join(B, 'packages/D07.json'), txt, 'utf8');
console.log('written', out.packages.length, 'packages,', seen.size, 'of', S.tests.length, 'tests');

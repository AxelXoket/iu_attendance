// Builds packages/D15.json from the plan below and checks coverage of files, tests, exports, jobs, endpoints, tables.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D15.json'), 'utf8'));
const T = S.tests.map(t => t.name);
const t = (...ix) => ix.map(i => { if (!T[i]) throw new Error('no test ' + i); return T[i]; });
const A = 'apps/server/src/infra/ayarlar/', I = 'apps/server/src/infra/izleme/', J = 'apps/server/src/jobs/isletim/';
const F = 'apps/server/test/features/isletim/', ST = 'apps/server/test/steps/isletim/', Y = 'apps/server/test/yuk/', D = 'docker/isletim/';
const MIG1 = 'apps/server/migrations/20261012090000_isletim_tablolar/';
const MIG2 = 'apps/server/migrations/20261012090500_isletim_olcum_gorunumleri/';
const P = [];
const K = new Map();
const pk = (o) => { const id = 'D15-P' + String(P.length + 1).padStart(2, '0'); if (K.has(o.key)) throw new Error('dup key ' + o.key); K.set(o.key, id); P.push({ id, title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests, depends_on: (o.dep || []).map(k => { if (!K.has(k)) throw new Error(o.key + ' depends on unknown or later key ' + k); return K.get(k); }), size: o.size, notes: o.notes }); };

pk({ key: 'iskelet',
  title: 'Çalışma alanı iskeleti ve Node sürümü denetimi',
  files: ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'biome.json', 'tsconfig.base.json', '.node-version', '.gitignore', '.env.example',
    'apps/server/package.json', 'apps/server/tsconfig.json', 'apps/server/cucumber.js', 'packages/core/package.json', 'packages/core/tsconfig.json',
    I + 'node-surumu-denetimi.ts', I + 'node-surumu-denetimi.test.ts'],
  tests: t(73), size: 'M',
  notes: 'Kök ve sunucu paket bildirimleri, pnpm çalışma alanı ve katalog, biome kuralları, ortak tsconfig, *.test.ts dosyalarını yüklemeyen Cucumber ayarı, .env.example ve .node-version yazılır, bütün paketler bunun üstüne kurulur; node-surumu-denetimi.test.ts deneme klasöründe .node-version, Dockerfile ve eas.json sürümleri ayrışınca çıkış 1, aynıyken 0 bekler.'
});
pk({ key: 'sozlesme',
  title: 'İşletim sözleşmesi ve anahtar dosyası doğrulaması',
  files: ['packages/contracts/src/isletim.ts', A + 'gizli-dosyalar.ts', A + 'gizli-dosyalar.test.ts'],
  exports: ['ISLETIM_ROTALARI', 'ISLETIM_HATALARI', 'ISLETIM_OGE_GEREKCELERI', 'ekranSureleriIstegi', 'ekranSureleriCevabi', 'telefonSayaciGovdesiSemasi',
    'gunAtlanirMi', 'ekranTavaniAnahtari', 'chronyDurumuSemasi', 'makineDurumuSemasi', 'bakimDosyasiSemasi', 'apiOlcumDosyasiSemasi',
    'gizliAnahtarDosyasiSemasi', 'kalpAtisiSirriSemasi', 'EKRAN_TURLERI', 'SAYAC_ADLARI', 'UYARI_TURLERI', 'ISLETIM_GIRDILERI', 'ISLETIM_ESIKLERI',
    'YEDEK_ESIKLERI', 'EKRAN_SURESI_TAVANI', 'ISLETIM_GIZLI_ALANLAR', 'OLCULEN_LOG_OLAYLARI', 'SIR_MATRISI'],
  needs: ['D13.rotaTanimla', 'D13.RotaTanimi', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.anSemasi', 'D13.gunSemasi', 'D13.kimlikSemasi',
    'D13.istemciKimligiSemasi', 'D13.ModulAdi'],
  tests: t(7), dep: ['iskelet'], size: 'L',
  notes: 'Sözleşme dosyası dört rota tanımını, ISLETIM_ hata kataloğunu, ekran süresi ve sayaç gövdesi şemalarını, durum dosyası ve sır şemalarını, gunAtlanirMi ile ekranTavaniAnahtari işlevlerini, uyarı kataloğunu, eşikleri ve sır matrisini verir, gizli-dosyalar.ts amaç başına anahtar kümesini okuyup doğrular; gizli-dosyalar.test.ts fast-check ile 2.000 rastgele kümede yalnız tek ETKIN, en çok bir HAZIR ve tekil kid kurallarına uyan kümenin kabul edildiğini denetler.'
});
pk({ key: 'ayarlar',
  title: 'Ayar şeması, GizliDeger ve ayarlariYukle',
  files: [A + 'index.ts', A + 'sema.ts', A + 'cgroup.ts', A + 'gizli-deger.ts', A + 'sema.test.ts', A + 'gizli-deger.test.ts'],
  exports: ['ayarlariYukle', 'ayarlar', 'Ayarlar', 'GizliDeger', 'gizliAnahtar', 'gizliAnahtarSeti'],
  needs: ['D11.projeksiyonAyarSemasi'],
  tests: t(6, 8, 9, 10, 11, 12), dep: ['iskelet', 'sozlesme'], size: 'L',
  notes: 'Elli ortam ayarının Zod şeması, süreç türüne göre zorunlu sırlar, UTC saat dilimi ve cgroup bellek sınırı denetimi, dondurulmuş Ayarlar nesnesi, GizliDeger sınıfı ve gizliAnahtar ile gizliAnahtarSeti okuyucuları yazılır; sema.test.ts eksik ve hatalı ayarda değer sızdırmayan ISLETIM_AYAR_GECERSIZ, çocuk süreçte saat dilimi ve bellek sınırını, gizli-deger.test.ts ise JSON, String, inspect ve pino çıktısında yalnız [gizli] yazıldığını denetler.'
});
pk({ key: 'log',
  title: 'Kök kaydedici ve gizleyen log biçimlendiricisi',
  files: [I + 'index.ts', I + 'log.ts', I + 'log.test.ts'],
  exports: ['log', 'logOlustur'],
  tests: t(13), dep: ['sozlesme', 'ayarlar'], size: 'M',
  notes: 'index.ts süreçteki kök log nesnesini, log.ts logOlustur ile pino kurulumunu, her derinlikte gizli alan biçimlendiricisini, değersiz hata yazımını ve OLCULEN_LOG_OLAYLARI sayacını verir (öbür izleme dış yüzleri kendi dosyalarından içe aktarılır); log.test.ts fast-check ile 1.000 iç içe nesnede gizli adların [gizli], öbür anahtarların aynen yazıldığını denetler.'
});
pk({ key: 'tablo',
  title: 'İşletim tabloları, uyarı defteri ve kuralları',
  files: [I + 'tablolar.ts', MIG1 + 'migration.sql', MIG1 + 'snapshot.json', I + 'uyarilar.ts', I + 'kurallar.ts', I + 'kurallar.test.ts'],
  tables: ['telefon_sayaclari', 'hoca_ekran_sureleri', 'isletim_uyarilari'],
  exports: ['uyariAc'],
  needs: ['D12.Islem', 'D12.tabloYardimcilari', 'D12.kisitAdi', 'D14.IsSagligi'],
  tests: t(36), dep: ['sozlesme', 'log'], size: 'L',
  notes: 'Üç tablo tabloYardimcilari ile tanımlanıp _isletim_ göçüyle açılır, uyariAc çağıranın işleminde (tur, anahtar) başına tek açık satırı numara maskesi ve uzunluk kesmesiyle yazar, kurallar.ts saf uyarı kararlarını ISLETIM_ESIKLERI ve YEDEK_ESIKLERI ile üretir; kurallar.test.ts her eşiği bir altı, eşiti ve bir üstüyle tablo testinde sınar.'
});
pk({ key: 'durum',
  title: 'Saat ve makine betikleri, durum dosyası okuyucusu',
  files: [D + 'ortak.sh', D + 'saat-esitleme-izleme.sh', D + 'makine-denetimi.sh', D + 'chrony.conf',
    D + 'iu-yoklama-saat-esitleme.service', D + 'iu-yoklama-saat-esitleme.timer', D + 'iu-yoklama-makine-denetimi.service', D + 'iu-yoklama-makine-denetimi.timer',
    I + 'durum-dosyalari.ts', I + 'durum-dosyalari.test.ts'],
  jobs: ['saat_esitleme_izleme', 'makine_denetimi'],
  exports: ['saatEsitlemeDurumu'],
  tests: t(60, 61), dep: ['iskelet', 'sozlesme', 'ayarlar'], size: 'L',
  notes: 'Ana makinede chronyc çıktısından chrony.json, docker sayaçlarından makine.json yazan betikler ortak.sh, zamanlayıcı birimleri ve chrony.conf ile kurulur, durum-dosyalari.ts saatEsitlemeDurumu ile makine, bakım ve yedek dosyalarını şemayla okur; durum-dosyalari.test.ts PATH\'e konan sahte chronyc ve docker ile senkron, sapma, yeniden başlama ve bellek taşması sayımını ve 1.000 eşzamanlı okumada yarım dosya görülmediğini denetler.'
});
pk({ key: 'sayac',
  title: 'Telefon sayacı öğesi ve kimlik olayı abonesi',
  files: [I + 'telefon-sayaci.ts', I + 'telefon-sayaci.test.ts', I + 'kimlik-dinleyicisi.ts', I + 'istanbul-gunu.ts'],
  exports: ['telefonSayaciOgesi', 'kimlikOlayiDinleyicisi'],
  needs: ['D12.Islem', 'D12.veritabaniKur', 'D01.KimlikDinleyicisi', 'D01.KimlikOlayi', 'D13.KisiId', 'D04.simdi'],
  tests: t(23, 29, 77), dep: ['sozlesme', 'log', 'tablo'], size: 'L',
  notes: 'telefon_sayaci işleyicisi silinmiş hesap denetimi, gövde doğrulaması, büyük sıra kazanır kuralıyla tek INSERT ON CONFLICT, ekran süresi tavanı ve kilitAnahtarlari kancasıyla, kimlik abonesi hesap_silindi olayında kişinin satırlarını silerek, İstanbul günü yardımcısıyla yazılır; telefon-sayaci.test.ts test veritabanında 500 rastgele varış sırasında en büyük sıranın kazandığını ve 2.000 gövdede gunAtlanirMi kuralını denetler, sıra koşulu bilerek kaldırılınca kırmızıya döner.'
});
pk({ key: 'eklenti',
  title: 'İşletim eklentisi, uçlar, kapanış ve API ölçüsü',
  files: [I + 'eklenti.ts', I + 'saglik.ts', I + 'kapanis.ts', I + 'ekran-sureleri.ts', I + 'api-olcum.ts', I + 'api-olcum.test.ts'],
  endpoints: ['GET /health/live', 'GET /health/ready', 'GET /v1/durum', 'POST /v1/isletim/ekran-sureleri'],
  exports: ['isletimEklentisi', 'kapanisiBaslat', 'kapanisDurumu'],
  needs: ['D13.EklentiTemelSecenekleri', 'D13.UygulamaHatasi', 'D13.KisiId', 'D12.Islem'],
  tests: t(42), dep: ['ayarlar', 'log', 'tablo', 'sayac'], size: 'L',
  notes: 'Eklenti rotalariKaydet, ogeTuruKaydet, danismaKilidi ve hesapSilindiMi seçenekleriyle dört ucu ve telefon_sayaci işleyicisini bağlar, sağlık uçları, kapanış durumu, birikmiş toplamlı ekran süresi yazımı ve dakikalık API ölçü dosyası yazıcısıyla okuyucusu gelir; api-olcum.test.ts iki kopyanın sahte ölçü dosyalarından 5xx, 503 oranı ve gönderim p95 uyarı kararlarını sınırlarıyla denetler.'
});
pk({ key: 'dunya',
  title: 'Test dünyası sınıfı ve kurucu kaydı',
  files: ['apps/server/test/support/dunya.ts', 'apps/server/test/support/dunya.test.ts'],
  exports: ['TestDunyasi', 'KurucuHaritasi', 'kurucuTanimla'],
  needs: ['D13.RotaTanimi', 'D13.RotaGirdisi', 'D13.hataZarfiSemasi', 'D13.API_HATALARI', 'D14.sahtePostaKutusu', 'D04.simdi'],
  tests: t(15), dep: ['iskelet'], size: 'M',
  notes: 'TestDunyasi sınıfı istekGonder şema ve hata zarfı denetimi, kimlik başlıkları, kurucu haritası, gizliDegerKaydet ve logSatirlari ile, kurucuTanimla aynı adı iki kez reddeden kayıtla yazılır ve uygulamaKur\'u çağırmadığından modüllerin kurucu dosyaları erkenden buna dayanır; dunya.test.ts çıplak Fastify örneğindeki deneme rotasıyla beyan dışı alanın, beyan dışı 409\'un ve zarfa uymayan 4xx gövdesinin reddedildiğini, beyanlı 200 ve 400\'ün geçtiğini denetler.'
});
pk({ key: 'compose',
  title: 'Compose, Caddy ve xprem yapılandırması',
  files: ['compose.yaml', 'compose.gelistirme.yaml', 'docker/caddy/Caddyfile', 'docker/xprem/surum.env', 'docker/xprem/xprem.env.ornek', 'docker/xprem/cosign.pub',
    I + 'compose-denetimi.test.ts'],
  tests: t(55, 56), dep: ['iskelet', 'sozlesme'], size: 'L',
  notes: 'Üretim ve geliştirme Compose servisleri sır matrisi, ağ adresleri ve kaynak sınırlarıyla, Caddyfile yol, başlık, gövde sınırı ve güncelleme eşleyicisiyle, xprem sürüm ve imza dosyalarıyla yazılır; compose-denetimi.test.ts docker compose config çıktısını SIR_MATRISI ve servis kurallarıyla karşılaştırır ve sahte API ile sahte xprem arkasında Caddy yollarını ve başlıklarını sınar.'
});
pk({ key: 'kalite',
  title: 'Kalite ve güvenlik iş akışları, OTA denetimi',
  files: ['.github/workflows/kalite.yml', '.github/workflows/guvenlik.yml', '.github/dependabot.yml', I + 'ota-denetimi.ts', I + 'ota-denetimi.test.ts'],
  jobs: ['ci_kalite_kapilari', 'ci_gecelik_guvenlik_denetimi', 'dependabot_guncellemeleri', 'ota_yayin_denetimi'],
  tests: t(72), dep: ['iskelet', 'compose'], size: 'L',
  notes: 'kalite.yml her çekme isteğinde biome, tip, birim, senaryo, göç ve Compose kapılarını, guvenlik.yml gece pnpm audit ve OTA denetimini, dependabot.yml gruplu güncellemeleri tanımlar, ota-denetimi.ts bütün kovaları kapsayan sabit kimliklerle etiketsiz güncellemeyi arar; ota-denetimi.test.ts sahte xprem yalnız yüzde 1 kovaya etiketsiz güncelleme verince kırmızı, bütün güncellemeler etiketliyken yeşil bitişi denetler.'
});
pk({ key: 'yayinbetik',
  title: 'Yayın ve log arşivi betikleri',
  files: [D + 'yayinla.sh', D + 'log-arsivi.sh', D + 'log-bul.sh', D + 'iu-yoklama-log-arsivi.service', D + 'iu-yoklama-log-arsivi.timer',
    D + 'cosign-sunucu.pub', I + 'makine-betikleri.test.ts'],
  jobs: ['gunluk_log_arsivi'],
  tests: t(62, 63, 64), dep: ['sozlesme', 'durum', 'compose'], size: 'L',
  notes: 'yayinla.sh imza, sürüm etiketi, İstanbul saati penceresi, yedek, göç ve servis sırasıyla geri dönüşlü yayını, log-arsivi.sh İstanbul gününe göre günlük arşivi, log-bul.sh arşiv aramasını yapar; makine-betikleri.test.ts sahte docker ve cosign ile imza tutmazsa hiçbir şeyin değişmediğini, her adım bozulunca geri dönüşü, bakim.json silinmesini ve systemd-analyze ile zamanlayıcıların İstanbul saatini denetler.'
});
pk({ key: 'kanca',
  title: 'Test kancaları ve sağlık senaryoları',
  files: ['apps/server/test/support/kancalar.ts', ST + 'saglik-adimlari.ts',
    F + 'saglik-uclari.feature', F + 'sunucu-kapanisi.feature', F + 'cevap-semasi-denetimi.feature', F + 'log-gizliligi.feature'],
  needs: ['D13.uygulamaKur', 'D13.TUM_ROTALAR', 'D13.TUM_HATALAR', 'D13.DenemeSecenekleri',
    'D12.testVeritabaniHazirla', 'D12.senaryoOncesiSifirla', 'D12.testVeritabaniAdi', 'D12.veritabaniKur',
    'D14.sahtePostaKutusu', 'D14.isKuyrugunuBosalt', 'D14.isKuyruguKur', 'D14.epostaKur', 'D04.simdi'],
  tests: t(0, 1, 2, 3, 4, 5, 14, 16, 54, 76), dep: ['ayarlar', 'log', 'eklenti', 'dunya'], size: 'L',
  notes: 'Kancalar koordinatörde test veritabanını hazırlar, işçi başına uygulamaKur ile uygulamayı kurar, her senaryodan önce veritabanı, kuyruk ve sahte saati sıfırlar, sonra loglarda kayıtlı gizli değerleri arar, sağlık adımları deneme rotalarını kurar; dört senaryo dosyası sağlık uçlarını, kapanışı, beyanlı cevap denetiminin kancalar üstünden de kırmızıya döndüğünü, loglarda numara ve değer bulunmamasını, rota kurallarını ve ölçü yazıcısının yalnız olcumYazici ile açıldığını denetler.'
});
pk({ key: 'imaj',
  title: 'Sunucu imajı, server.ts girişi ve yayın bilgisi',
  files: ['apps/server/Dockerfile', 'apps/server/Dockerfile.dockerignore', 'apps/server/src/server.ts', A + 'yayin-bilgisi.kaynak.json', A + 'yayin-bilgisi-uret.ts',
    A + 'yayin-bilgisi-uret.test.ts', 'docker/caddy/sayfalar/gizlilik.html'],
  needs: ['D12.veritabaniKur', 'D13.uygulamaKur', 'D13.yayinBilgisiSemasi', 'D14.isKuyruguKur', 'D14.epostaKur', 'D14.smtpTasiyicisi', 'D04.simdi'],
  tests: t(57, 75), dep: ['ayarlar', 'log', 'eklenti', 'compose'], size: 'L',
  notes: 'Çok aşamalı Dockerfile sunucu ve caddy hedefleriyle, server.ts sekiz adımlı açılış ve kapanış sırasıyla, yayin-bilgisi-uret artan sıra ve hatalı sürüm denetimiyle, gizlilik sayfası caddy hedefine yazılır; yayin-bilgisi-uret.test.ts çıktının yayinBilgisiSemasi\'na uyduğunu ve aynı commit\'te aynı baytları verdiğini, deneme Dockerfile\'ı derlenmiş sözleşme paketi olmadan imaj derlemesinin kırmızı olduğunu denetler.'
});
pk({ key: 'olcumgor',
  title: 'Ölçüm görünümleri ve özet sorguları',
  files: [MIG2 + 'migration.sql', MIG2 + 'snapshot.json', I + 'olcumler.ts', I + 'olcum-ozeti.ts', I + 'olcum-ozeti.test.ts'],
  needs: ['D12.Islem', 'D12.veritabaniKur'],
  tests: t(51), dep: ['tablo', 'kanca'], size: 'L',
  notes: 'On bir olcum_ görünümü security_invoker ile _isletim_ göçünde açılır ve olcumler.ts ile olcum-ozeti.ts hedef satırlarını kohort aralığıyla tek sorgudan üretir, görünümler D01, D02, D03, D05, D06, D07 ve D09 tablolarını okuduğundan bütün eklentileri toplayan uygulamaKur\'u kullanan kancalardan sonra yapılır; olcum-ozeti.test.ts katalogdan her görünümde kişisel sütun olmadığını ve security_invoker değerini denetler.'
});
pk({ key: 'anahtar',
  title: 'Anahtar komutu, döndürme betiği ve ele geçirme',
  files: ['apps/server/src/cli/anahtar-uret.ts', D + 'anahtar.sh', ST + 'anahtar-adimlari.ts', F + 'anahtar-dondurme.feature'],
  needs: ['D01.kimlikDinleyicileriniKur', 'D01.kimlikDinleyicileriHazir', 'D02.derslerKimlikDinleyicisi', 'D02.donemArasiMi',
    'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D07.yenidenDegerlendir', 'D12.veritabaniKur', 'D04.saatBelgesiDogrula'],
  tests: t(65, 67, 68), dep: ['ayarlar', 'log', 'durum', 'sayac', 'dunya', 'kanca'], size: 'L',
  notes: 'anahtar-uret uret, iki adımlı dondur, ele-gecirildi, yedekle, denetle ve donem-arasi alt komutlarını dört aboneli kimlik kurulumuyla, anahtar.sh süreçleri sırayla yeniden başlatıp küme özetini karşılaştırarak yazılır; anahtar-dondurme.feature yeni kidin önce yalnız doğrulamada sonra etkin olduğunu, sahte docker ile çağrı sırasını, şüphe anından sonraki kayıtların yeniden değerlendirilmesini ve çevrimdışı yedeğin xprem anahtarını kapsadığını denetler.'
});
pk({ key: 'surum',
  title: 'Eski sürüm istek örnekleri',
  files: [ST + 'surum-ornekleri-adimlari.ts', F + 'eski-surum-istekleri.feature', F + 'ornekler/surumler/.gitkeep'],
  needs: ['D13.TUM_ROTALAR', 'D13.surumKarsilastir'],
  tests: t(58), dep: ['dunya', 'kanca'], size: 'M',
  notes: 'Adımlar ornekler/surumler altındaki saklı istekleri tamDenetimTabani kuralına göre seçip sahte saati örneğin penceresine kurarak oynatır; eski-surum-istekleri.feature beklenen durum ve öğe sonuçlarının aynen döndüğünü ve ilk uygulama yayınından sonra boş klasörün kırmızı olduğunu denetler.'
});
pk({ key: 'akis',
  title: 'Haftalık iş, yayın akışları ve mutasyon eşikleri',
  files: ['.github/workflows/haftalik.yml', '.github/workflows/yayin-sunucu.yml', '.github/workflows/yayin-ota.yml', '.github/workflows/yayin-telefon.yml',
    'packages/core/stryker.config.json', 'packages/core/stryker-esikler.json', 'packages/core/stryker-esik-denetimi.ts', D + 'kur.sh'],
  jobs: ['ci_haftalik_is'],
  tests: t(74, 79), dep: ['durum', 'yayinbetik', 'imaj', 'kalite'], size: 'L',
  notes: 'Haftalık iş Stryker mutasyonu ve imaj derlemesiyle, sunucu, OTA ve telefon yayın iş akışları imza ve onay adımlarıyla, kur.sh ana makine kurulumuyla yazılır; yayin-telefon.yml ayrıştırılıp derleme işinin sözleşme kapısına bağlı olduğu ve kapının sahte GitHub API cevabında failure için 1, success için 0 verdiği, eşik betiğinin sahte düşük raporda kırmızı, yüksekte yeşil bittiği denetlenir.'
});
pk({ key: 'yuk',
  title: 'Yük testi ortak parçaları ve ders çıkışı',
  files: [Y + 'esikler.ts', Y + 'ortak/imza.ts', Y + 'ortak/telefon.ts', Y + 'ortak/kursu.ts', Y + 'tohum.ts', Y + 'ders-cikisi.ts', Y + 'panel-raporlari.ts', Y + 'sonrasi-denetim.ts'],
  jobs: ['yayin_oncesi_yuk_testi'],
  needs: ['D13.HIZ_SINIFLARI', 'D11.KODLAR_ISTEGI'],
  tests: t(69), dep: ['dunya', 'kanca', 'compose'], size: 'L',
  notes: 'k6 eşikleri HIZ_SINIFLARI\'ndan, imzalı telefon ve kürsü istemcileri, kurucularla tohum, 50 hocalık panel rapor yükü ve koşu sonrası denetimle ders çıkışı profili yazılır; ders-cikisi.ts 20.000 telefonda gönderim ve saat belgesi gecikme eşiklerini, 5xx ve 429 yokluğunu, makbuzlu her kaydın tam bir kez yazıldığını ve bağlantı sınırını denetler.'
});
pk({ key: 'sayacsen',
  title: 'Sayaç, ekran süresi ve hesap silme senaryoları',
  files: [ST + 'sayac-adimlari.ts', F + 'telefon-sayaci.feature', F + 'ekran-sureleri.feature', F + 'hesap-silme.feature'],
  needs: ['D13.TUM_ROTALAR', 'D12.islem'],
  tests: t(17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 78), dep: ['sayac', 'eklenti', 'dunya', 'kanca', 'olcumgor'], size: 'L',
  notes: 'Sayaç adımları kurucularla öğrenci ve personel gönderimi, panel ekran süresi istekleri ve hesap silmeyi kurar; üç senaryo dosyası birikmiş toplam, gün ve tavan sınırları, yetki ve köken, KABUL, ZATEN_VAR ve RET sonuçları, olcum_hoca_isi sayımı ve silinmiş hesabın gecikmiş öğesini denetler, kilitAnahtarlari ya da danismaKilidi bilerek bozulunca eşzamanlılık adımı kırmızıya döner.'
});
pk({ key: 'denetim',
  title: 'İşletim denetimi işi ve girdileri',
  files: [I + 'girdiler.ts', J + 'isletim-denetimi.ts', ST + 'denetim-adimlari.ts', F + 'isletim-denetimi.feature'],
  jobs: ['isletim_denetimi'],
  needs: ['D14.isSagligi', 'D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem', 'D12.islem'],
  tests: t(37, 38, 39, 41, 43, 44, 45, 46), dep: ['tablo', 'durum', 'eklenti', 'dunya', 'kanca', 'olcumgor'], size: 'L',
  notes: 'girdiler.ts veritabanı, sistem görünümü, sayaç, durum ve API ölçü girdilerini her biri ayrı işlemde okur, iş kuralların kararlarını uyariAc ile yazar, kapanış kurallarını uygular, bildirimi süre bütçesiyle gönderir ve retSuSeviyesi çıktısı verir; isletim-denetimi.feature D14 sağlık ölçüsü, durum dosyaları, okunamayan girdi, kanıt reddi, yeni ret kodu, devam tutarlılığı, WAL ve bağlantı uyarılarını açılış ve kapanışlarıyla denetler.'
});
pk({ key: 'haftalik',
  title: 'Haftalık ölçüm özeti ve olcum-raporu',
  files: [J + 'haftalik-olcum-ozeti.ts', 'apps/server/src/cli/olcum-raporu.ts', ST + 'olcum-adimlari.ts',
    F + 'olcum-gorunumleri.feature', F + 'haftalik-olcum-ozeti.feature'],
  jobs: ['haftalik_olcum_ozeti'],
  needs: ['D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem', 'D12.veritabaniKur'],
  tests: t(49, 50, 52, 53), dep: ['dunya', 'kanca', 'olcumgor'], size: 'L',
  notes: 'Haftalık iş hedef tablosunu olgun kohorttan her alıcıya tek e-postayla yollar ve 13 aydan eski sayaç, ekran süresi ve kapanmış uyarı satırlarını siler, olcum-raporu aynı tabloyu tarih aralığı ve birim için yazar; iki senaryo dosyası kurucu verisinde görünümlerin elle hesaplanan tabloyla aynı olduğunu, hocanın işini, telefonda kalan kayıpları ve ikinci çalışmanın 0 satır sildiğini denetler.'
});
pk({ key: 'olay',
  title: 'Olay komutu ve komut girişleri',
  files: ['apps/server/src/cli/olay.ts', ST + 'komut-adimlari.ts', F + 'komut-girisleri.feature'],
  needs: ['D01.kimlikDinleyicileriniKur', 'D01.kimlikDinleyicileriHazir', 'D01.oturumlariKapat', 'D02.derslerKimlikDinleyicisi', 'D02.donemArasiMi',
    'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D12.veritabaniKur'],
  tests: t(66), dep: ['sayac', 'dunya', 'kanca', 'anahtar'], size: 'M',
  notes: 'olay oturumlari-kapat girişi dört aboneyle kimlik dinleyicilerini kurup D01.oturumlariKapat çağırır; komut-girisleri.feature personel oturumlarının kapandığını, QR yuvasının iptal olduğunu, öğrenci oturumlarının açık kaldığını, eksik aboneyle girişin açılmadığını ve donem-arasi çıktısının D02.donemArasiMi ile aynı olduğunu denetler.'
});
pk({ key: 'yukprofil',
  title: 'Ders başı, gece ve giriş yığılması yük profilleri',
  files: [Y + 'ders-basi.ts', Y + 'gece.ts', Y + 'giris-yiginlasmasi.ts'],
  tests: t(70), dep: ['yuk'], size: 'S',
  notes: 'Ortak parçalarla 60 saniyeye yayılmış 20.000 telefonluk ders başı, 30 dakikaya yayılmış 5.000 iPhone\'luk gece ve 300 hocalık giriş yığılması profilleri yazılır; her profil aynı k6 eşikleriyle koşar, gece profili iş sürelerini ve gönderim p95 değerini yazar.'
});
pk({ key: 'bildirim',
  title: 'Uyarı bildirimi, kalp atışı, sertifika ve iş listesi',
  files: [I + 'kalp-atisi.ts', J + 'isletim-kalp-atisi.ts', I + 'sertifika.ts', I + 'le-deneme-kokleri.pem', J + 'sertifika-bitis-denetimi.ts',
    J + 'index.ts', ST + 'uyari-adimlari.ts', F + 'uyarilar.feature', F + 'kalp-atisi.feature', F + 'sertifika.feature'],
  jobs: ['dis_erisim_denetimi', 'isletim_kalp_atisi', 'sertifika_bitis_denetimi'],
  exports: ['isletimIsleri'],
  needs: ['D14.isSagligi', 'D14.epostaGonder', 'D14.isiCalistirVeBekle', 'D12.Islem'],
  tests: t(30, 31, 32, 33, 34, 35, 40, 47, 48, 71), dep: ['tablo', 'dunya', 'kanca', 'denetim', 'haftalik'], size: 'L',
  notes: 'Kalp atışı açık KRITIK ve son başarılı denetime göre normal ya da sorun adresine tek GET atar, sertifika denetimi TLS zincirini acme ve elle eşikleriyle sınar, dış erişim denetiminin hizmet ayarı belgelenir, index.ts dört pg-boss işini isletimIsleri ile worker.ts için verir; üç senaryo dosyası uyarı birikmesini, maskelemeyi, özet e-postayı, SMTP düşükken kalp atışını, süre bütçesini, sessizlik kapanışını ve sertifika eşiklerini denetler, kural ve kapanış süzgeci bilerek bozulunca ilgili senaryolar kırmızıya döner.'
});
pk({ key: 'asvs',
  title: 'ASVS eşlemesi ve eksiksizlik denetimi',
  files: [F + 'asvs-eslemesi.json', I + 'asvs.test.ts'],
  tests: t(59), dep: ['ayarlar', 'dunya', 'kanca', 'sayacsen', 'denetim', 'bildirim', 'haftalik', 'anahtar', 'olay', 'surum'], size: 'M',
  notes: 'ASVS 5.0 seviye 2 maddeleri senaryo adlarına, ayar denetimlerine ya da gerekçeye bağlanır ve bütün senaryo paketlerinden sonra yazılır; asvs.test.ts feature dosyalarını ayrıştırıp her uygulanan maddenin var olan bir senaryoya bağlı, her uygulanmayan maddenin gerekçeli ve madde numaralarının tekil olduğunu denetler.'
});

// coverage checks
const errs = [];
const allFiles = P.flatMap(p => p.files);
for (const f of S.files) if (!allFiles.includes(f)) errs.push('file missing: ' + f);
const EXTRA = ['apps/server/test/support/dunya.test.ts'];
for (const f of allFiles) if (!S.files.includes(f) && !/^apps\/server\/migrations\/\d{14}_isletim_/.test(f) && !EXTRA.includes(f)) errs.push('unexpected file: ' + f);
const dupF = allFiles.filter((f, i) => allFiles.indexOf(f) !== i); if (dupF.length) errs.push('dup files: ' + dupF);
const allTests = P.flatMap(p => p.tests);
T.forEach((n, i) => { const c = allTests.filter(x => x === n).length; if (c !== 1) errs.push(`test ${i} "${n}" in ${c} packages`); });
const ex = P.flatMap(p => p.exports); S.exports.forEach(e => { if (ex.filter(x => x === e.name).length !== 1) errs.push('export ' + e.name); });
const jb = P.flatMap(p => p.jobs); S.jobs.forEach(j => { if (jb.filter(x => x === j.name).length !== 1) errs.push('job ' + j.name); });
// depends_on must point backwards (acyclic by construction)
P.forEach((p, i) => p.depends_on.forEach(d => { if (+d.slice(-2) >= i + 1) errs.push(p.id + ' depends forward on ' + d); }));
const out = { id: 'D15', packages: P };
const js = JSON.stringify(out, null, 1);
if (/[–—]/.test(js)) errs.push('dash found');
if (errs.length) { console.log('BUILD ERRORS\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(B, 'packages', 'D15.json'), js + '\n');
console.log(`wrote ${P.length} packages, files ${allFiles.length}/${S.files.length} spec (+${allFiles.length - S.files.length} migration), tests ${allTests.length}/${T.length}, exports ${ex.length}/${S.exports.length}, jobs ${jb.length}/${S.jobs.length}`);
const sz = P.reduce((o, p) => (o[p.size] = (o[p.size] || 0) + 1, o), {}); console.log(JSON.stringify(sz));

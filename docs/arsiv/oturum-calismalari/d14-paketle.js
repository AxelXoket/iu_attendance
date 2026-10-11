// Builds packages/D14.json from spec/D14.json; test names are taken by index so they match the spec exactly.
const fs = require('fs'), path = require('path');
const D = process.argv[2];
const S = JSON.parse(fs.readFileSync(path.join(D, 'spec', 'D14.json'), 'utf8'));
const T = i => S.tests[i].name;
const isk = f => 'apps/server/src/infra/is-kuyrugu/' + f;
const ep = f => 'apps/server/src/infra/eposta/' + f;
const ft = f => 'apps/server/test/features/is-kuyrugu/' + f;
const st = f => 'apps/server/test/steps/is-kuyrugu/' + f;
const MIG = 'apps/server/migrations/20261010140000_is_kuyrugu_eposta_gonderimleri/';
const pid = n => 'D14-P' + String(n).padStart(2, '0');
const P = (n, o) => ({
  id: pid(n), title: o.title, files: o.files, tables: o.tables || [], endpoints: [], jobs: o.jobs || [],
  exports: o.exports || [], needs: o.needs || [], tests: o.tests.map(T), depends_on: (o.dep || []).map(pid),
  size: o.size, notes: o.notes,
});
const packages = [
  P(1, { title: 'Sözleşme tipleri, hata kataloğu ve iş tanımı doğrulaması', size: 'L',
    files: ['packages/contracts/src/is-kuyrugu.ts', isk('tanim.ts'), isk('veri-semasi.ts'), isk('zamanlama.ts'), isk('tanim.test.ts')],
    exports: ['KuyrukTanimi', 'IsBaglami', 'PartiIsi', 'PartiBaglami', 'IsSagligi', 'IsKuyrugu', 'Eposta', 'IS_KUYRUGU_HATA_KODLARI', 'isTanimla'],
    needs: ['D13.hataKodlariTanimla'], tests: [13, 15],
    notes: "Sözleşme dosyasındaki tipler ve 20 kodluk IS_KUYRUGU_HATA_KODLARI ile saf isTanimla, veri şeması yaprak ve en kötü boyut denetimi, tekillik anahtarı parçaları ve tanım başına zamanlama kuralları yazılır; tanim.test.ts örnek şemalarla ve jobs/*/index.ts'teki isler dizileriyle ad ve veri kurallarını, fast-check ile 2.000 tekillik anahtarını denetler." }),
  P(2, { title: 'E-posta türleri, sabit metinler, Türkçe saat biçimi ve bağlantı denetimi', size: 'M',
    files: [ep('turler.ts'), ep('sabit-metinler.ts'), ep('bicim.ts'), ep('baglanti-denetimi.ts'), ep('bicim.test.ts'), ep('baglanti-denetimi.test.ts')],
    exports: ['EPOSTA_TURLERI', 'EpostaVerisi', 'EpostaHataTuru', 'baglantiDenetle'], tests: [25, 39],
    notes: "Türler, şablon verisi şemaları ve hata türleri tek sabitten, sabit cümleler, İstanbul saatini Türkçe yazan biçim ve baglantiDenetle yazılır; bicim.test.ts 1.440 dakikanın saat ekini bağımsız türetimle, baglanti-denetimi.test.ts örnek tablosunu içe alarak denetler." }),
  P(3, { title: 'E-posta şablonları', size: 'M',
    files: ['giris-kodu', 'basvuru-kodu', 'basvuru-silme-kodu', 'onay-bekliyor', 'giris-bildirimi', 'isletim-uyarisi', 'isletim-ozeti']
      .map(s => ep('sablonlar/' + s + '.ts')).concat([ep('sablonlar.test.ts')]),
    tests: [26], dep: [2],
    notes: "Yedi türün düz metin şablonları sabit son paragraf, bağlantı denetimi ve cihaz etiketi kuralıyla yazılır; sablonlar.test.ts fast-check ile 2.000 geçerli veride ürün metninde bağlantı olmadığını, son paragrafın SABIT_UYARI_CUMLESI olduğunu ve işletim metinlerinde belirtecin [adres] olduğunu denetler." }),
  P(4, { title: 'Gönderim tablosu, adres özeti, kayan pencere sınırı ve temizlik işi', size: 'L',
    files: [ep('tablolar.ts'), ep('ozet.ts'), ep('sinir.ts'), ep('saglik.ts'), ep('temizlik.ts'), ep('sinir.test.ts'),
      'apps/server/src/jobs/is-kuyrugu/index.ts', 'apps/server/src/jobs/is-kuyrugu/eposta-gonderim-temizligi.ts',
      MIG + 'migration.sql', MIG + 'snapshot.json'],
    tables: ['eposta_gonderimleri'], jobs: ['eposta_gonderim_temizligi'],
    exports: ['epostaSagligi', 'epostaGonderimleriniTemizle'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.danismaKilidi', 'D12.islem'], tests: [16], dep: [1, 2],
    notes: "eposta_gonderimleri tablosu tabloYardimcilari ve is_kuyrugu göçüyle, HMAC adres özeti ve kilit anahtarı, READ COMMITTED denetimli sınır mantığı, epostaSagligi, 1.000'lik partili temizlik ve eposta_gonderim_temizligi tanımı yazılır; sinir.test.ts 5.000 rastgele istek dizisinde EPOSTA_SINIRLARI'nın hiçbir pencerede aşılmadığını ve gereksiz ret olmadığını denetler." }),
  P(5, { title: 'SMTP taşıyıcısı, süreç içi gönderici, sahte posta kutusu ve epostaKur', size: 'L',
    files: [ep('tasiyici.ts'), ep('gonderici.ts'), ep('index.ts'), 'apps/server/test/support/sahte-posta.ts', ep('tasiyici.test.ts')],
    exports: ['epostaKur', 'epostaGonder', 'epostaSiniriDenetle', 'smtpTasiyicisi', 'sahtePostaKutusu'],
    needs: ['D12.islem'], tests: [38], dep: [1, 2, 3, 4],
    notes: "Nodemailer havuzlu smtpTasiyicisi, deneme beklemeli ve kapanışlı süreç içi gönderici, epostaGonder ile epostaSiniriDenetle'yi bağlayan epostaKur ve testler için sahtePostaKutusu yazılır; tasiyici.test.ts STARTTLS ilan etmeyen sahte sunucuya AUTH ve DATA gitmediğini, ilan edende iletinin gittiğini ve TLS ayarlarını denetler." }),
  P(6, { title: 'pg-boss örneği, iş gönderme, tek iş sarmalayıcısı ve test yardımcıları', size: 'L',
    files: [isk('pgboss.ts'), isk('gonder.ts'), isk('hata-suzgeci.ts'), isk('sarmalayici.ts'), 'apps/server/test/support/is-kuyrugu.ts', isk('hata-suzgeci.test.ts')],
    tables: ['pgboss_semasi'], jobs: ['pgboss_bakimi'],
    exports: ['isKuyrugunuBosalt', 'isiCalistirVeBekle', 'kuyruktakiIsler', 'zamanlamaliOrnekAc'], tests: [5], dep: [1],
    notes: "pg-boss 12 örneği (API'de fromDrizzle, işçide havuz 2, açık bakım değerleri, şema sürümü denetimi), işlem içi isGonder, tek iş sarmalayıcısı, hata süzgeci ve test kuyruğu yardımcıları yazılır; hata-suzgeci.test.ts gerçek pg-boss ile değer taşıyan hatanın iş çıktısına ve yakalanan loga sızmadığını artı denetimle sınar." }),
  P(7, { title: 'Parti işleyicisi, iş sağlığı, kuyruk politikası ve isKuyruguKur dış yüzü', size: 'L',
    files: [isk('parti.ts'), isk('saglik.ts'), isk('politika.ts'), isk('index.ts'), st('test-kuyruklari.ts'), isk('parti.test.ts')],
    exports: ['isGonder', 'isSagligi', 'isKuyruguKur'], tests: [34, 35], dep: [1, 5, 6],
    notes: "Parti sarmalayıcısı, isSagligi sorguları, tanımdan kuyruk ayarı üreten politika, test kuyruğu tanımları ve dış yüzü örneğe bağlayan isKuyruguKur yazılır; parti.test.ts 50'lik partide yalnız başarısız sayılan işlerin retry olduğunu ve 20.000 işlik yükün tek işli ayardan en az 10 kat hızlı bittiğini ölçer." }),
  P(8, { title: 'Altyapı iş uyarlayıcısı, kur adımı ve worker.ts bileşim kökü', size: 'L',
    files: [isk('altyapi-uyarlayici.ts'), isk('kur.ts'), 'apps/server/src/worker.ts', isk('altyapi-uyarlayici.test.ts'), isk('zamanlama.test.ts')],
    exports: ['altyapiIsleriniUyarla', 'kuyruklariKur'],
    needs: ['D15.ayarlariYukle', 'D15.logOlustur', 'D15.gizliAnahtar', 'D15.isletimIsleri', 'D12.veritabaniKur', 'D12.veritabaniIsleri', 'D13.uygulamaKur'],
    tests: [14, 48], dep: [1, 4, 5, 7],
    notes: "D15 tanımlarını isTanimla biçimine çeviren uyarlayıcı, yetki, kuyruk ve zamanlamayı eşitleyen kuyruklariKur ve 11 adımlı açılışla kur alt komutunu taşıyan worker.ts yazılır; altyapi-uyarlayici.test.ts ve zamanlama.test.ts worker.ts'in topladığı gerçek kayıtta uyarlanan işleri ve 14 günlük İstanbul zamanlama kurallarını denetler." }),
  P(9, { title: 'İş kuyruğu senaryoları, iş adımları ve kancalar', size: 'L',
    files: [st('is-adimlari.ts'), st('kancalar.ts'), ft('is-gonderme.feature'), ft('is-calistirma.feature'), ft('zamanlama.feature'),
      ft('kurulum.feature'), ft('saglik.feature'), ft('isci-sureci.feature')],
    needs: ['D15.TestDunyasi', 'D13.TUM_HATALAR', 'D12.veritabaniKur', 'D12.islem'],
    tests: [0, 1, 2, 12, 44, 3, 4, 36, 40, 6, 7, 9, 10, 11, 43, 30, 41, 31, 42], dep: [5, 6, 7, 8],
    notes: "is-adimlari.ts ortak iş adımlarını ('aynı veriyle iki kez çalışırsa' dahil) ve kancalar.ts senaryo öncesi temizliği taşır; gönderme, çalıştırma, zamanlama, kurulum, sağlık ve işçi süreci senaryoları D15 test dünyasında TestClock ile her biri zemin denetimiyle koşar." }),
  P(10, { title: 'E-posta senaryoları ve e-posta adımları', size: 'L',
    files: [st('eposta-adimlari.ts'), ft('eposta-sinir.feature'), ft('eposta-gonderim.feature'), ft('eposta-sablon.feature'), ft('eposta-temizlik.feature')],
    needs: ['D15.TestDunyasi', 'D12.islem', 'D12.danismaKilidi', 'D12.danismaKilidiDene'],
    tests: [17, 18, 19, 33, 37, 45, 46, 47, 20, 21, 22, 27, 28, 49, 32, 23, 24, 29, 8, 50], dep: [4, 5, 9],
    notes: "eposta-adimlari.ts ile sınır, gönderim, şablon ve temizlik senaryoları sahte posta kutusu ve TestClock üzerinde koşar, ardından koruyucu testler md5 denetimli kasıtlı bozmayla tek tek kırmızıya döndürülüp geri yüklenir." }),
];
const out = { id: 'D14', packages };
const txt = JSON.stringify(out, null, 1);
if (/[–—]/.test(txt)) throw new Error('contains U+2013 or U+2014');
// every spec test exactly once
const seen = new Map();
for (const p of packages) for (const t of p.tests) seen.set(t, (seen.get(t) || 0) + 1);
const bad = S.tests.map(t => t.name).filter(n => seen.get(n) !== 1);
if (bad.length) throw new Error('test coverage: ' + JSON.stringify(bad));
fs.writeFileSync(path.join(D, 'packages', 'D14.json'), txt + '\n');
console.log('wrote', packages.length, 'packages,', seen.size, 'of', S.tests.length, 'tests');

// Builds packages/D04.json from spec/D04.json. Tests are referenced by spec index so names are never retyped.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D04.json'), 'utf8'));
const T = i => { const t = S.tests[i]; if (!t) throw new Error('no test ' + i); return t.name; };
const C = 'packages/core/src/saat/', M = 'apps/server/src/modules/saat/', J = 'apps/server/src/jobs/saat/', F = 'apps/server/test/features/saat/', ST = 'apps/server/test/steps/saat/';
const MIG = 'apps/server/migrations/20261012080000_saat_pencere_tablolari/';
const pk = (n, o) => ({ id: 'D04-P' + String(n).padStart(2, '0'), title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests.map(T), depends_on: (o.dep || []).map(d => 'D04-P' + String(d).padStart(2, '0')), size: o.size, notes: o.notes });
const P = [
  pk(1, {
    title: 'Saat arayüzü ve İstanbul yardımcıları', size: 'S',
    files: [C + 'saat.ts', 'apps/server/src/infra/saat/index.ts', 'apps/server/src/infra/saat/sistem-saati.ts', 'apps/server/src/infra/saat/istanbul.ts', 'apps/server/src/infra/saat/istanbul.test.ts', 'apps/server/test/support/sahte-saat.ts'],
    exports: ['simdi', 'istanbulTarihi', 'istanbulAni', 'istanbulGunSonuAni', 'duvarSaatiFarkiMs'],
    tests: [16],
    notes: 'Kural anlarının tek kaynağı Saat arayüzü, sistem saati, duvar saati farkı, pg-boss saatine bağlı sahte saat ve İstanbul tarih yardımcıları hiçbir modüle bağlanmadan yazılır; istanbul.test.ts yaz saatli ve bugünkü örnekleri TZ=UTC ve TZ=Europe/Istanbul altında iki kez koşar.',
  }),
  pk(2, {
    title: 'Saat sözleşmesi ve belge biçimi', size: 'M',
    files: ['packages/contracts/src/saat.ts', C + 'sabitler.ts', C + 'tipler.ts', C + 'base64url.ts', C + 'belge.ts', C + 'belge.test.ts', C + 'belge-ornekleri.json'],
    exports: ['ILK_CAPA_DURUMLARI', 'IKINCI_CAPA_DURUMLARI', 'IKINCI_CAPA_YOK_NEDENLERI', 'ILK_CAPA_TELEFON_BILDIRIMLERI', 'SAAT_DURUMLARI', 'SAAT_KAYNAKLARI', 'PENCERE_SONUCLARI', 'KAPANIS_NEDENLERI', 'DEGISIKLIK_TURLERI', 'SAAT_DENETIM_OLAYLARI', 'SAAT_ROTALARI', 'PENCERE_SURESI_OGESI', 'ERKEN_KAPATMA_OGESI'],
    needs: ['D13.CihazId', 'D13.KisiId', 'D13.rotaTanimla', 'D13.ogeTuruTanimla', 'D13.genisleyenEnum', 'D13.hataKodlariTanimla', 'D13.anSemasi'],
    tests: [18],
    notes: 'packages/contracts/src/saat.ts (kod sabitleri, denetim olayları, SAAT_ROTALARI, iki öğe şeması, SAAT_ hata kataloğu) ile çekirdeğin sabitleri, tipleri, base64url kodlayıcısı ve 82 baytlık belge biçimi yazılır; belge.test.ts kayıtlı örnek belgeyi Buffer ve atob silinmiş ortamda bayt bayt denetler.',
  }),
  pk(3, {
    title: 'Çapa aralığı ve saat sonucu', size: 'M',
    files: [C + 'capa.ts', C + 'sonuc.ts', C + 'capa.test.ts', C + 'sonuc.test.ts'],
    tests: [0, 1, 2, 3, 4, 5, 6, 7], dep: [2],
    notes: 'İleri ve geri çapa aralığı (100 ppm kayma payı) ile iki çapayı birleştiren saf saatSonucu yazılır; capa.test.ts ve sonuc.test.ts sabitleri içe aktararak fast-check özellikleri ve sınır tablolarıyla denetler.',
  }),
  pk(4, {
    title: 'Pencere hesabı ve çekirdek girişi', size: 'L',
    files: [C + 'pencere.ts', C + 'program.ts', C + 'pencere.test.ts', C + 'program.test.ts', C + 'index.ts'],
    exports: ['SaatOznesi', 'saatSonucu', 'capaAraligi', 'pencereHesapla', 'pencereIcindeMi', 'pencereDurumu', 'belgeCoz', 'belgeImzaGirdisi', 'KAYMA_PPM', 'BELGE_EN_COK_YAS_MS', 'BELGE_ISTEK_EN_COK_MS', 'BELGE_BAYT', 'BELGE_KARAKTER', 'DEGER_BAYT'],
    tests: [9, 10, 11, 12, 13, 14, 64], dep: [1, 2, 3],
    notes: 'Varış sırasından bağımsız pencereHesapla, öğrenci lehine pencereIcindeMi, pencereDurumu, eski program penceresi ve dış modüllerin çekirdeği aldığı index.ts girişi yazılır (çekirdek dışa verimleri bu yüzden bu pakettedir); özellik testleri ve en az yüzde 90 Stryker eşiğiyle denetlenir.',
  }),
  pk(5, {
    title: 'Saat tabloları ve pencere servisi', size: 'L',
    files: [M + 'tablolar.ts', MIG + 'migration.sql', MIG + 'snapshot.json', M + 'pencere-servisi.ts', M + 'pencere-kilidi.ts', M + 'surum-damgasi.ts', F + 'pencere-plani.feature', ST + 'pencere-adimlari.ts'],
    tables: ['oturum_pencereleri', 'pencere_degisiklikleri', 'saat_esitleme_kesintileri'],
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem', 'D02.dersGetir', 'D02.oturumGetir', 'D02.OturumUretimOlayi', 'D02.OTURUM_DURUMLARI', 'D06.surumDamgasiIste', 'D06.surumAl'],
    tests: [25, 54], dep: [1, 2, 4],
    notes: 'Üç tablonun Drizzle tanımı ve göçü (bileşik yabancı anahtarlar, sözleşme sabitlerinden CHECK listeleri), pencere kilidi, sürüm damgası, pencereleriHesapla, pencereGetir ve FOR KEY SHARE ile okuyan pencereSonucu yazılır; pencere-plani.feature D15 test dünyasında denetler ve pencere adımları sonraki paketlerin senaryolarınca da kullanılır.',
  }),
  pk(6, {
    title: 'Eşitleme denetimi ve kesinti kaydı', size: 'L',
    files: [M + 'esitleme-durumu.ts', M + 'kesinti-servisi.ts', M + 'kuyruklar.ts', J + 'saat-esitleme-denetimi.ts', F + 'esitleme-kesintisi.feature', ST + 'esitleme-adimlari.ts'],
    jobs: ['saat_esitleme_denetimi'],
    needs: ['D12.islem', 'D14.isGonder', 'D14.KuyrukTanimi', 'D15.saatEsitlemeDurumu', 'D15.log', 'D13.uygulamaHatasi'],
    tests: [43, 44, 45, 46], dep: [1, 5],
    notes: 'Süreç içi eşitleme durumu, api sürecindeki 5 saniyelik denetim, LEAST ile açılan tek açık kesinti satırı, 15 saniye kuralıyla koşullu kapanış ve yeniden değerlendirme işini kuyruğa koyma yazılır; esitleme-kesintisi.feature iki sahte API süreci ve sahte chrony dosyasıyla denetler.',
  }),
  pk(7, {
    title: 'Saat belgesi servisi ve uçlar', size: 'M',
    files: [M + 'anahtarlar.ts', M + 'belge-servisi.ts', M + 'rotalar.ts', F + 'saat-belgesi.feature', ST + 'belge-adimlari.ts'],
    endpoints: ['POST /v1/saat/belge', 'GET /v1/saat/pencereler/{oturumId}'],
    needs: ['D15.gizliAnahtar', 'D13.uygulamaHatasi', 'D02.dersYetkisi'],
    tests: [8, 19, 20, 21, 22, 24, 52], dep: [4, 5, 6],
    notes: 'Saat belgesi anahtar halkası, veritabanına dokunmayan saatBelgesiVer ve saatBelgesiDogrula ile belge ve pencere uçlarının işleyicileri yazılır; saat-belgesi.feature Bearer kimliği, hız sınırı, eşitleme bozukken 503 ve kid senaryolarıyla denetler.',
  }),
  pk(8, {
    title: 'Ders içi pencere değişikliği', size: 'L',
    files: [M + 'degisiklik-isleyicisi.ts', M + 'dinleyiciler.ts', F + 'pencere-degisikligi.feature', F + 'eski-program.feature', F + 'pencere-ucu.feature'],
    needs: ['D02.dersGetir', 'D02.dersYetkisi', 'D02.kilitDurumu', 'D02.birimDonemiGetir', 'D06.gondermeSuresiSonu', 'D09.denetimeYaz'],
    tests: [15, 26, 28, 29, 30, 31, 32, 33, 34, 35, 51, 61], dep: [4, 5, 7],
    notes: 'pencere_suresi ve erken_kapatma öğe işleyicisi (kimlik tekrarı, yetki, süre sınırı, kilit, çapa, geçmişe işlememe, denetim olayı) ve üç dinleyici kaydı yazılır; pencere-degisikligi, eski-program ve pencere-ucu senaryolarıyla denetlenir.',
  }),
  pk(9, {
    title: 'Pencereler indirme kaynağı', size: 'S',
    files: [M + 'indirme-kaynagi.ts', F + 'pencere-indirme.feature'],
    tests: [27, 50], dep: [5],
    notes: 'Şube ve sürüm süzgeçli pencereler indirme kaynağı yazılır; pencere-indirme.feature öğrenci ve hoca kapsamını, başka şubenin inmediğini ve şube eklenince yeniden damgalanan satırı denetler.',
  }),
  pk(10, {
    title: 'Saklama, saat eklentisi ve dış yüz', size: 'M',
    files: [M + 'saklama.ts', F + 'saat-saklama.feature', M + 'eklenti.ts', M + 'index.ts', M + 'sozlesme.test.ts'],
    exports: ['saatBelgesiVer', 'saatBelgesiDogrula', 'pencereleriHesapla', 'pencereGetir', 'pencereSonucu', 'esitlemeSaglikliMi', 'kesintiAraliklari', 'oturumKapandiDinleyicisiKaydet', 'kesintiKapandiDinleyicisiKaydet', 'pencereDegistiDinleyicisiKaydet', 'saatEklentisi', 'SaatEklentisiSecenekleri'],
    needs: ['D02.oturumUretimDinleyicisiKaydet', 'D06.ogeTuruKaydet', 'D06.indirmeKaynagiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D12.saklamaIsleyicisiniCalistir', 'D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D13.TUM_OGE_TURLERI'],
    tests: [17, 36, 53, 55, 58, 60, 62], dep: [5, 6, 7, 8, 9],
    notes: 'saat.donem_verisi saklama partisi, D02, D06, D12 ve rota kayıtlarını yapan saatEklentisi ile modülün index.ts dış yüzü yazılır (modül dışa verimleri bu yüzden bu pakettedir); sozlesme.test.ts ve saat-saklama.feature birleşim, kod, öğe sözleşmesi ve saklama kurallarını denetler.',
  }),
  pk(11, {
    title: 'Kapanış ve yeniden değerlendirme işleri', size: 'M',
    files: [J + 'index.ts', J + 'oturum-pencere-kapat.ts', J + 'esitleme-sonrasi-yeniden-degerlendir.ts', F + 'pencere-kapatma.feature'],
    jobs: ['oturum_pencere_kapat', 'esitleme_sonrasi_yeniden_degerlendir'],
    needs: ['D14.isTanimla', 'D12.islem', 'D15.uyariAc', 'D15.log'],
    tests: [37, 39, 40, 41, 49], dep: [10],
    notes: 'Dakikalık, partili ve satır başına geri dönüş noktalı oturum_pencere_kapat, imleçli esitleme_sonrasi_yeniden_degerlendir ve isler dizisi yazılır; pencere-kapatma.feature sahte saat ve D14 iki kez çalıştırma adımıyla denetler.',
  }),
  pk(12, {
    title: 'Bütünleşik saat senaryoları', size: 'M',
    files: [F + 'saat-kurallari-kayit.feature', F + 'pencere-kilidi.feature', 'apps/server/test/support/kurucular/saat.ts'],
    needs: ['D15.kurucuTanimla', 'D13.uygulamaKur'],
    tests: [23, 38, 42, 47, 48, 56, 57, 59, 63], dep: [10, 11],
    notes: 'Saat veri kurucusu ile D05, D06 ve D07 hazır olunca koşan uçtan uca senaryolar (kayıt saat kuralları, yarışma, sıçrama, kesinti sonrası yeniden değerlendirme, komşu CHECK listeleri, iki süreçte dinleyiciler, ders çıkışı yükü) yazılır; @butunlesik etiketiyle bileşik uygulamada denetlenir.',
  }),
];
// local guards: every test exactly once, every spec file exactly once, no file outside spec except the migration folder
const used = P.flatMap(p => p.tests);
const dupT = used.filter((t, i) => used.indexOf(t) !== i);
const missT = S.tests.map(t => t.name).filter(n => !used.includes(n));
const specFiles = S.files.map(f => typeof f === 'string' ? f : f.path);
const allF = P.flatMap(p => p.files);
const extra = allF.filter(f => !specFiles.includes(f) && !f.startsWith(MIG));
if (dupT.length || missT.length || extra.length) { console.log({ dupT, missT, extra }); process.exit(1); }
const out = { id: 'D04', packages: P };
fs.writeFileSync(path.join(B, 'packages', 'D04.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote', P.length, 'packages,', used.length, 'tests,', allF.length, 'files');

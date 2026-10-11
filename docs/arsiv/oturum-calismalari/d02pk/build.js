// Builds packages/D02.json from index lists so test names, endpoints and files are copied, never retyped.
// node build.js <backend dir>
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D02.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const M = C.modules.find(m => m.id === 'D02');
const T = i => { if (!S.tests[i]) throw new Error('no test ' + i); return S.tests[i].name; };
const F = p => { const all = S.files.map(f => typeof f === 'string' ? f : f.path); if (!all.includes(p)) throw new Error('not a spec file: ' + p); return p; };
const E = s => { if (!M.owns_endpoints.includes(s)) throw new Error('not owned endpoint: ' + s); return s; };
const mod = n => F('apps/server/src/modules/dersler/' + n);
const job = n => F('apps/server/src/jobs/dersler/' + n);
const core = n => F('packages/core/src/dersler/' + n);
const feat = n => F('apps/server/test/features/dersler/' + n);
const step = n => F('apps/server/test/steps/dersler/' + n);
const MIG = 'apps/server/migrations/20261012090000_dersler_baslangic/';

const P = [
  {
    title: 'Dersler sözleşmesi ve ders kodu normalleştirme',
    files: [F('packages/contracts/src/dersler.ts'), core('normallestir.ts'), core('normallestir.test.ts')],
    exports: ['OturumUretimOlayi', 'OTURUM_TURLERI', 'OTURUM_DURUMLARI', 'IPTAL_NEDENLERI', 'YAPILDI_DURUMLARI', 'DERSLER_DENETIM_OLAYLARI'],
    needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.beklenenSurumNoSemasi', 'D13.anSemasi', 'D13.gunSemasi', 'D13.dersSaatiSemasi', 'D13.kimlikSemasi', 'D13.ogeSonuclariSemasi', 'D13.tamListeSemasi', 'D13.sayfaSemasi', 'D13.sayfaSorgusuSemasi'],
    tests: [69], dep: [], size: 'L',
    notes: '31 rota tanımı, istek ve cevap şemaları, DERSLER_ hata kataloğu, dört sabit değer listesi, OturumUretimOlayi tipi ve denetim olay şemaları packages/contracts/src/dersler.ts dosyasına, Türkçe büyüten ders kodu normalleştirmesi packages/core altına yazılır; tsc ve normallestir.test.ts fast-check özelliğiyle denetlenir.',
  },
  {
    title: 'Takvim ve çakışma kuralları',
    files: [core('takvim.ts'), core('takvim.test.ts'), core('cakisma.ts'), core('cakisma.test.ts')],
    tests: [70, 68, 67], dep: [1], size: 'M',
    notes: 'Son hafta, kilit günü, dönem arası, tatil ve sınav haftası kuralları ile yarı açık aralık ve program saati örtüşmesi saf işlevler olarak yazılır; Vitest ve fast-check özellikleri TZ=UTC ve TZ=Europe/Istanbul ile iki kez koşar.',
  },
  {
    title: 'Oturum üretim planı',
    files: [core('uretim.ts'), core('uretim.test.ts'), core('index.ts')],
    tests: [63, 64, 65, 66, 82], dep: [1, 2], size: 'L',
    notes: 'Programdan dönemin bütün oluşumlarını çıkaran ve yalnız başlamamış oturumların farkını (eklenecek, güncellenecek, iptal, geri alınacak) veren deterministik plan işlevi yazılır; numRuns 1000 özellikleri, satır ve dal kapsamı yüzde 90 ve Stryker kırma eşiğiyle denetlenir.',
  },
  {
    title: 'Şema, göç, saat çevirisi ve test kurucuları',
    files: [mod('tablolar.ts'), MIG + 'migration.sql', MIG + 'snapshot.json', mod('saat.ts'), F('apps/server/test/support/kurucular/dersler.ts'), feat('saat-dilimi.feature'), step('takvim-adimlari.ts')],
    tables: M.owns_tables.slice(),
    needs: ['D12.tabloYardimcilari', 'D12.kisitAdi'],
    tests: [60], dep: [1], size: 'L',
    notes: 'On dört tablo kisitAdi adlarıyla Drizzle şemasına, tetikleyiciler, CHECK kısıtları ve kisiler yabancı anahtarlarıyla tek göç klasörüne yazılır, AT TIME ZONE çevirisi ve veri kurucuları eklenir; göç D12 göç denetiminden geçer ve saat dilimi senaryosu TZ=UTC ile koşar.',
  },
  {
    title: 'Okuma yaprağı, kayıt defterleri ve liste sorguları',
    files: [mod('yaprak.ts'), mod('kayitlar.ts'), mod('sorgular.ts'), feat('yetki.feature')],
    exports: ['dersGetir', 'dersYetkisi', 'subeGetir', 'dersSubeleri', 'birimGetir', 'kilitliBirimDonemleri', 'hocaninDersleri', 'oturumGetir', 'oturumlariGetir', 'oturumSayfasi', 'oturumSubeleri', 'birimDonemiGetir', 'kilitDurumu', 'takvimGetir', 'donemArasiMi', 'denetlenecekDersler', 'oturumUretimDinleyicisiKaydet', 'kilitAdimiKaydet', 'listeKaynagiKaydet'],
    needs: ['D12.Islem', 'D13.Kimlik'],
    tests: [30], dep: [2, 4], size: 'L',
    notes: 'Öbür modüllerin beklediği on altı okuma işlevi yalnız tablolar, sözleşme, core ve D12 işlem tipiyle yaprak.ts içine, üç kayıt defteri (üretim dinleyicisi, kilit adımı, liste kaynağı) ve başka modüle bağlanmayan liste sorguları ayrı dosyalara yazılır; tsc ile denetlenir, yetki senaryosu dersYetkisi kuralını D02-P14 rotaları bağlayınca HTTP üzerinden sınar.',
  },
  {
    title: 'Oturum yazım hattı ve program kaydı',
    files: [mod('uretim.ts'), mod('denetim.ts'), mod('yetki.ts'), mod('servis-program.ts'), feat('oturum-uretimi.feature'), step('ders-adimlari.ts')],
    endpoints: [E('GET /v1/dersler/{dersId}/program'), E('POST /v1/dersler/{dersId}/program/onizleme'), E('PUT /v1/dersler/{dersId}/program')],
    needs: ['D01.yetkiDenetle', 'D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D09.denetimeYaz', 'D13.uygulamaHatasi'],
    tests: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 77], dep: [3, 4, 5], size: 'L',
    notes: 'Planı yazan hat (satırlar ve değişiklik geçmişi, üretim dinleyicileri, denetim, D08 işi, en son tek surumAl), kaynak ve inceleme hesabı yetki yardımcısı, denetim yazıcısı ve program görme, önizleme, kaydetme işleyicileri yazılır; oturum üretimi senaryoları sahte dinleyici, sayaç casusu ve kaba gün sayımıyla denetlenir, HTTP adımları D02-P14 rotaları bağlayınca koşar.',
  },
  {
    title: 'Dönem kilidi',
    files: [mod('servis-kilit.ts'), job('donem-kilidi.ts'), feat('takvim-ve-kilit.feature')],
    endpoints: [E('GET /v1/dersler/yonetim/kilitler')],
    jobs: ['donem_kilidi'],
    needs: ['D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
    tests: [20, 21, 22, 23, 24, 27, 28, 59], dep: [6], size: 'M',
    notes: 'Kilit anının uygulanması (kayıtlı adımlar sira ile, sonra arşiv, ders başına KILIT işi, denetim ve sürüm), son gün gerekçeyle ileri alınınca yeniden açma, kilitler listesi ve donem_kilidi işleyicisi yazılır; takvim ve kilit senaryoları D14 iki kez çalıştırma adımı ve sahte kilit adımlarıyla denetlenir, HTTP adımları D02-P14 ile koşar.',
  },
  {
    title: 'Birim, dönem, takvim ve yenileme işi',
    files: [mod('servis-takvim.ts'), mod('kuyruklar.ts'), job('takvim-oturumlarini-yenile.ts'), feat('birim-ve-donem.feature')],
    endpoints: [E('GET /v1/dersler/birimler'), E('GET /v1/dersler/yonetim/birimler'), E('POST /v1/dersler/yonetim/birimler'), E('PATCH /v1/dersler/yonetim/birimler/{birimId}'), E('POST /v1/dersler/yonetim/birimler/{birimId}/bolumler'), E('GET /v1/dersler/yonetim/donemler'), E('POST /v1/dersler/yonetim/donemler'), E('POST /v1/dersler/yonetim/takvimler'), E('PUT /v1/dersler/yonetim/takvimler/{takvimId}'), E('PUT /v1/dersler/yonetim/birimler/{birimId}/donemler/{donemId}')],
    jobs: ['takvim_oturumlarini_yenile'],
    needs: ['D12.donemBolumuAc', 'D14.isGonder', 'D14.KuyrukTanimi', 'D06.surumAl', 'D06.surumDamgasiIste', 'D13.uygulamaHatasi', 'D15.log'],
    tests: [44, 45, 25, 26, 79], dep: [6, 7], size: 'L',
    notes: 'Birim, bölüm, dönem, takvim ve birim dönemi bağı işleyicileri (FOR SHARE ile kilit anı türetme, aynı işlemde kuyruğa koyma), üç kuyruk tanımı ve takvim_oturumlarini_yenile işinin olay ve gece onarımı çalışması yazılır; tekrar güvenliği, zorla geri alma ve 500 derslik yük ölçümüyle denetlenir, HTTP adımları D02-P14 ile koşar.',
  },
  {
    title: 'Ders, şube ve devir',
    files: [mod('servis-ders.ts'), feat('ders-ve-program.feature')],
    endpoints: [E('GET /v1/dersler'), E('POST /v1/dersler'), E('GET /v1/dersler/{dersId}'), E('PATCH /v1/dersler/{dersId}'), E('POST /v1/dersler/{dersId}/arsivle'), E('POST /v1/dersler/{dersId}/subeler'), E('PATCH /v1/dersler/{dersId}/subeler/{subeId}'), E('GET /v1/dersler/yonetim/dersler'), E('POST /v1/dersler/yonetim/dersler/{dersId}/devir')],
    exports: ['oranlariYaz'],
    needs: ['D01.kisiGetir', 'D01.personelRolleri', 'D01.hesapSilindiMi', 'D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
    tests: [34, 35, 36, 37, 38, 39, 40, 42, 43, 46, 47, 48], dep: [6], size: 'L',
    notes: 'Ders açma, düzenleme (birim, süre ve QR değişince aynı işlemde yeniden üretim), arşiv, şube ekleme (programaKat) ve pasifleştirme, yönetici listesi, devir işleyicileri ile oranlariYaz yazılır; ders senaryoları sahte liste kaynağı, sahte D04 dinleyicisi ve D06 indirme adımlarıyla denetlenir, HTTP adımları D02-P14 ile koşar.',
  },
  {
    title: 'Oturum işlemleri ve Ders yapıldı mı',
    files: [mod('servis-oturum.ts'), feat('telafi-iptal-ve-duzenleme.feature'), feat('ders-yapildi-mi.feature'), step('oturum-adimlari.ts')],
    endpoints: [E('GET /v1/dersler/{dersId}/oturumlar'), E('POST /v1/dersler/{dersId}/telafi'), E('PATCH /v1/dersler/oturumlar/{oturumId}'), E('POST /v1/dersler/oturumlar/{oturumId}/iptal'), E('GET /v1/dersler/oturumlar/onaysiz'), E('POST /v1/dersler/oturumlar/{oturumId}/yapildi-mi'), E('POST /v1/dersler/oturumlar/yapildi-mi')],
    exports: ['kafaSayisiniYaz'],
    needs: ['D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D13.uygulamaHatasi'],
    tests: [4, 5, 12, 13, 14, 61, 15, 16, 17, 18, 62, 81], dep: [6], size: 'L',
    notes: 'Oturum listesi, telafi (taşıma ve sınır), tek oturum düzenleme, iptal ve geri alma, onaysız liste, tek ve toplu yapıldı cevabı (ders satırları dersId sırasıyla kilitlenir) ile FOR NO KEY UPDATE kullanan kafaSayisiniYaz yazılır; telafi, iptal ve yapıldı senaryoları ve ders çıkışı yük ölçümüyle denetlenir, HTTP adımları D02-P14 ile koşar.',
  },
  {
    title: 'Çakışma ucu',
    files: [mod('servis-cakisma.ts'), feat('cakismalar.feature')],
    endpoints: [E('GET /v1/dersler/{dersId}/cakismalar')],
    tests: [50], dep: [6], size: 'S',
    notes: 'Kayıtlı liste kaynağının etkin satırlarıyla öğrenci başına yarı açık aralık çakışmalarını numara ve isim döndürmeden veren uç işleyicisi yazılır; sahte liste kaynağıyla çakışma senaryosu ve 2000 satır sınırındaki 422 ile denetlenir, senaryo D02-P14 ile koşar.',
  },
  {
    title: 'Deneme dersi ve hesap olayları',
    files: [mod('servis-deneme.ts'), mod('dinleyiciler.ts'), job('deneme-dersi-oturumlari.ts'), feat('deneme-dersi.feature'), feat('hesap-silme.feature'), step('yonetim-adimlari.ts')],
    jobs: ['deneme_dersi_oturumlari'],
    exports: ['denemeDersiniKur', 'derslerKimlikDinleyicisi'],
    needs: ['D01.kisiGetir', 'D01.KimlikDinleyicisi', 'D01.KimlikOlayi', 'D12.donemBolumuAc', 'D06.surumAl', 'D06.surumDamgasiIste', 'D08.devamHesaplaIsiKoy', 'D08.DEVAM_NEDENLERI', 'D15.log'],
    tests: [57, 33, 58], dep: [9], size: 'M',
    notes: 'Eş güçlü denemeDersiniKur (inceleme dönemi, birimsiz deneme dersi, şube 1, 14 günlük oturum, devir), deneme_dersi_oturumlari işleyicisi ve hesap silme ile pasifleşmeyi işleyen derslerKimlikDinleyicisi yazılır; deneme ve hesap silme senaryoları sayaç casusu ve iki kez çalıştırma adımıyla denetlenir, HTTP adımları D02-P14 ile koşar.',
  },
  {
    title: 'İndirme kaynakları ve personel kapsamı',
    files: [mod('indirme.ts'), mod('kapsam.ts'), feat('indirme.feature')],
    needs: ['D01.kisiGetir'],
    tests: [51, 52, 53, 54, 55, 56, 80], dep: [5], size: 'M',
    notes: 'Beş genel kaynak (dersler, program saatleri, oturumlar, tatiller, kilit) imleç ile üst sürüm arasını rol başına satır şemasıyla, tatilleri birim dönemi sürümüyle GREATEST alarak döner ve personel kapsam kaynağı ders sahipliğinden yazılır; indirme senaryoları D06 artımlı ve tam indirme adımlarıyla denetlenir ve kaynaklar D02-P14 eklentisiyle kaydolunca koşar.',
  },
  {
    title: 'Rotalar, eklenti ve modül girişi',
    files: [mod('rotalar-dersler.ts'), mod('rotalar-oturumlar.ts'), mod('rotalar-yonetim.ts'), mod('eklenti.ts'), mod('index.ts'), feat('inceleme-hesabi.feature')],
    exports: ['derslerEklentisi', 'DerslerEklentisiSecenekleri'],
    needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D06.indirmeKaynagiKaydet'],
    tests: [32], dep: [6, 7, 8, 9, 10, 11, 12, 13], size: 'M',
    notes: 'Üç rota dosyası 31 işleyiciyi D13.rotalariKaydet ile bağlar, eklenti beş indirme kaynağını ve personel kapsamını kaydedip liste kaynağını açılışta denetler, index.ts dışa açılanları verir; önceki paketlerin bütün D02 senaryoları burada uygulamada uçtan uca koşar ve hepsi ile inceleme hesabı senaryosu yeşil olmadan paket bitmez.',
  },
  {
    title: 'İş tanımları, sözleşme ve eşzamanlılık doğrulaması',
    files: [job('index.ts'), feat('sozlesme.feature'), feat('eszamanlilik.feature'), step('sozlesme-adimlari.ts')],
    exports: ['isler'],
    needs: ['D14.isTanimla'],
    tests: [74, 71, 72, 73, 31, 75, 76, 78, 19, 29, 41, 49, 83], dep: [7, 8, 12, 14], size: 'M',
    notes: 'Üç iş isTanimla ile isler dizisinde tanımlanır; rota listesi, hata kataloğu, cevap şemaları, iş çizelgesi, denetim olayları, eklenti kayıtları, şema adları ve içe aktarma kuralları, D08 nedenleri ve üç eşzamanlılık senaryosu koşar, bilinçli hata listesinin her maddesi kendi senaryosunu kırmızıya çevirir ve özgün baytlar md5 denetimiyle geri yazılır.',
  },
];

const pid = i => 'D02-P' + String(i).padStart(2, '0');
const out = { id: 'D02', packages: P.map((p, i) => ({
  id: pid(i + 1), title: p.title, files: p.files, tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [],
  exports: p.exports || [], needs: p.needs || [], tests: p.tests.map(T), depends_on: (p.dep || []).map(pid), size: p.size, notes: p.notes,
})) };

// self checks: every test once, every spec file once, ids of depends_on earlier than self
const seenT = new Map(); out.packages.forEach(p => p.tests.forEach(t => { if (seenT.has(t)) throw new Error('test twice: ' + t); seenT.set(t, p.id); }));
const missingT = S.tests.map(t => t.name).filter(n => !seenT.has(n)); if (missingT.length) throw new Error('tests in no package: ' + missingT.join(' | '));
out.packages.forEach(p => p.depends_on.forEach(d => { if (d >= p.id) throw new Error(p.id + ' depends on later ' + d); }));
const txt = JSON.stringify(out, null, 1);
if (/[–—]/.test(txt)) throw new Error('dash found');
fs.writeFileSync(path.join(B, 'packages', 'D02.json'), txt + '\n');
console.log('wrote', out.packages.length, 'packages;', seenT.size, 'tests;', out.packages.reduce((n, p) => n + p.files.length, 0), 'files');
console.log(out.packages.map(p => `${p.id} ${p.size} files=${p.files.length} tests=${p.tests.length} ep=${p.endpoints.length} ex=${p.exports.length} needs=${p.needs.length} dep=[${p.depends_on.join(',')}]`).join('\n'));

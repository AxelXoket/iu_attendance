// Generates packages/D11.json from spec/D11.json. Test names and file paths are taken from the spec by index or exact path,
// so nothing is retyped; the script fails if a referenced path or test index does not exist or if coverage is incomplete.
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D11.json'), 'utf8'));
const files = S.files.map(f => (typeof f === 'string' ? f : f.path));
const M = 'apps/server/src/modules/projeksiyon/';
const J = 'apps/server/src/jobs/projeksiyon/';
const C = 'packages/core/src/projeksiyon/';
const F = 'apps/server/test/features/projeksiyon/';
const ST = 'apps/server/test/steps/projeksiyon/';
const MIG = 'apps/server/migrations/20261012090000_projeksiyon_tablolar/';
const f = p => { if (!files.includes(p)) throw new Error('not in spec files: ' + p); return p; };
const t = (...ix) => ix.map(i => { if (!S.tests[i]) throw new Error('no test ' + i); return S.tests[i].name; });

const P = [
  {
    title: 'Sözleşme: rotalar, şemalar ve sonuç sözlükleri',
    files: [f('packages/contracts/src/projeksiyon.ts')],
    exports: ['DOGRULAMA', 'GECIKME', 'projeksiyonAyarSemasi', 'KODLAR_ISTEGI'],
    needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.ogeTuruTanimla', 'D13.CEREZLER'],
    tests: t(53), depends_on: [], size: 'M',
    notes: 'Yedi rota tanımı, PROJEKSIYON_ hata kataloğu, gosterim_kaydi ve KayitKanitAlanlari şemaları, DOGRULAMA ve GECIKME listeleri, varsayılanlı projeksiyonAyarSemasi ve KODLAR_ISTEGI tek dosyada yazılır; dosyaya bilerek eklenen dogrulama.ts içe aktarmasını kırmızıya çeviren dependency-cruiser kuralıyla denetlenir.',
  },
  {
    title: 'Çekirdek: QR içeriği, doğrulama kodu ve kilit anahtarları',
    files: [C + 'sabitler.ts', C + 'dilim.ts', C + 'qr-icerigi.ts', C + 'mac.ts', C + 'kilit-anahtarlari.ts', C + 'qr-icerigi.test.ts', C + 'mac.test.ts', C + 'kilit-anahtarlari.test.ts'].map(f),
    exports: ['qrKilitAnahtarlari'], needs: [],
    tests: t(44, 47), depends_on: [], size: 'M',
    notes: '41 rakamlık QR içeriği, 8 baytlık doğrulama kodu, 5 saniyelik dilim hesabı ve qrKilitAnahtarlari saf işlev olarak yazılır (kilit işlevinin girdi tipi yapısaldır, sözleşme paketini beklemez); fast-check gidiş dönüş özelliği ve yalnız gerekeni kilitleyen anahtar özelliğiyle denetlenir.',
  },
  {
    title: 'Çekirdek: gecikme kuralı ve hoca saati',
    files: [C + 'gecikme.ts', C + 'hoca-saati.ts', C + 'gecikme.test.ts', C + 'hoca-saati.test.ts'].map(f),
    exports: [], needs: [],
    tests: t(45, 51), depends_on: ['D11-P02'], size: 'M',
    notes: 'Planın 10, 20 ve 30 saniye sınırları, projeksiyon toleransı, öğrenci ve hoca payı ile iki çapadan payı küçük olanı seçen hoca saati saf işlev olarak yazılır; 20.000 ve 5.000 koşulu fast-check özellikleriyle denetlenir.',
  },
  {
    title: 'Çekirdek: kod penceresi ve kürsü durumu',
    files: [C + 'kod-penceresi.ts', C + 'kursu-durumu.ts', C + 'kod-penceresi.test.ts', C + 'kursu-durumu.test.ts'].map(f),
    exports: [], needs: [],
    tests: t(46, 49), depends_on: ['D11-P02'], size: 'M',
    notes: 'Şimdi artı 30 saniye ve pencere kapanışıyla sınırlı en çok 7 ardışık dilim, son_dilim formülü ve yedi durumlu kursuDurumu işlevi yazılır; fast-check pencere özelliği ve belgedeki durum makinesiyle karşılaştıran tablo testiyle denetlenir.',
  },
  {
    title: 'Çekirdek: yedek kod, Bluetooth ve konum',
    files: [C + 'yedek-kod.ts', C + 'bluetooth.ts', C + 'konum.ts', C + 'yedek-kod.test.ts', C + 'bluetooth.test.ts', C + 'konum.test.ts'].map(f),
    exports: [], needs: [],
    tests: t(52), depends_on: ['D11-P02'], size: 'M',
    notes: 'Amaç baytı ayrı 6 rakamlık yedek kod ve 16 onaltılık Bluetooth kodu türetimi ile yarıçap sınırı, 50 metre pay ve saatte 300 km imkânsız hız kuralını uygulayan konum karşılaştırması yazılır; birim testleri ve fast-check konum özelliğiyle denetlenir.',
  },
  {
    title: 'Çekirdek: yuva seçimi, eşleştirme QR ve dış yüz',
    files: [C + 'yuva.ts', C + 'eslestirme-qr.ts', C + 'yuva.test.ts', C + 'index.ts'].map(f),
    exports: [], needs: [],
    tests: t(50, 61), depends_on: ['D11-P02', 'D11-P03', 'D11-P04', 'D11-P05'], size: 'M',
    notes: '(hoca, rakam, gün) tekilliğini koruyan yuva seçimi, IUY:E1: önekli eşleştirme QR içeriği ve bütün çekirdeği dışa veren index.ts yazılır; 2.000 koşulu fast-check durum makinesiyle ve çekirdeğin ortak kural mutantlarını öldüren haftalık Stryker koşusuyla denetlenir.',
  },
  {
    title: 'Ortak altyapı: anahtar türetme, kilitler ve test vektörleri',
    files: [M + 'anahtar-turetme.ts', M + 'anahtar-turetme.test.ts', M + 'kilitler.ts', M + 'denetim.ts', M + 'dinleyiciler.ts', M + 'ayarlar.ts', M + 'kuyruklar.ts', C + 'test-vektorleri.json', C + 'test-vektorleri.test.ts'].map(f),
    exports: ['gosterimKaydiDinleyicisiKaydet'],
    needs: ['D12.danismaKilidi', 'D12.danismaKilidiDene', 'D09.denetimeYaz'],
    tests: t(55), depends_on: ['D11-P01', 'D11-P02', 'D11-P05'], size: 'L',
    notes: 'Gün, projeksiyon ve eşleştirme kodu anahtarlarının her kid için türetimi, katman sıralı danışma kilidi sarmalayıcısı, PROJEKSIYON_DENETIM_OLAYLARI ile denetim yazıcısı, gösterim kaydı dinleyici kaydı, ayarlar ve üç kuyruk tanımı yazılır; telefonla ortak test vektörleri Node crypto ve sunucunun Zod şemalarıyla koşulur, bozulmuş vektör baytı testi kırmızıya çevirir.',
  },
  {
    title: 'Şema: sekiz tablo ve ilk göç',
    files: [f(M + 'tablolar.ts'), MIG + 'migration.sql', MIG + 'snapshot.json'],
    tables: ['projeksiyon_tarayicilari', 'projeksiyon_eslestirme_kodlari', 'projeksiyon_baglantilari', 'eslestirme_yanlis_denemeleri', 'qr_anahtar_yuvalari', 'qr_anahtar_indirmeleri', 'gosterim_kayitlari', 'yoklama_kanitlari'],
    exports: [],
    needs: ['D04.ILK_CAPA_DURUMLARI', 'D04.IKINCI_CAPA_DURUMLARI', 'D04.ILK_CAPA_TELEFON_BILDIRIMLERI', 'D04.IKINCI_CAPA_YOK_NEDENLERI', 'D12.tabloYardimcilari'],
    tests: t(54), depends_on: ['D11-P01'], size: 'L',
    notes: 'tablolar.ts sekiz tabloyu, kısmi tekil dizinleri ve CHECK listelerini D04 sabitlerinden ve kendi sözlüklerinden üretir, göç drizzle-kit generate ile çıkar ve kisiler, oturumlar, dersler ve yoklama_kayitlari tablolarına yabancı anahtar verdiğinden D01, D02 ve D05 şemaları ana dalda olunca birleşir; çapa CHECK listelerinin D04 sabitleriyle aynı kaldığını gösteren sözleşme testiyle denetlenir.',
  },
  {
    title: 'Kanıt ayrıştırma, QR sonucu ve gösterim aralıkları',
    files: [M + 'kanit.ts', M + 'veri.ts', ST + 'kanit.steps.ts', F + 'qr-kaniti.feature', F + 'yedek-kod.feature'].map(f),
    exports: ['qrKanitiniAyristir', 'qrSonucu', 'gosterimAraliklari'],
    needs: ['D02.oturumGetir', 'D02.dersGetir', 'D04.pencereGetir', 'D14.isGonder', 'D15.log'],
    tests: t(20, 26, 29), depends_on: ['D11-P02', 'D11-P03', 'D11-P04', 'D11-P05', 'D11-P07', 'D11-P08'], size: 'L',
    notes: 'D05 ve D07\'nin beklediği qrKanitiniAyristir, qrSonucu ve gosterimAraliklari yazılır, kanıt adımları bağlantı satırını doğrudan kurup işlevi D06 grubundaki gibi tek işlemde çağırır; projeksiyon gecikme sınırları, başka oturumun ve başka hocanın QR\'ı ve yedek kod deneme sınırı senaryolarıyla denetlenir.',
  },
  {
    title: 'Saklama işleyicisi',
    files: [M + 'saklama.ts', F + 'saklama.feature'].map(f),
    exports: [], needs: ['D12.saklamaIsleyicisiniCalistir'],
    tests: t(37), depends_on: ['D11-P08', 'D11-P09'], size: 'S',
    notes: 'projeksiyon.donem_verisi partiIsle işleyicisi en eski dönemi yalnız kendi tablolarından seçip kanıt, gösterim, bağlantı, tarayıcı, indirme ve yuva sırasıyla partili siler; D12.saklamaIsleyicisiniCalistir ile gerçek yoklama_saklama girişinde, başka tabloya sorgu olmadığını gösteren sorgu günlüğüyle ve CASCADE mutasyonuyla denetlenir.',
  },
  {
    title: 'Kürsü uçları: eşleştirme kodu ve dönen kodlar',
    files: [M + 'kurusu.ts', M + 'tarayici-cerezi.ts', M + 'tarayici-cerezi.test.ts', M + 'tarayici-etiketi.ts', M + 'tarayici-etiketi.test.ts', M + 'adres-siniri.ts', M + 'adres-siniri.test.ts', M + 'esli-kullanim.ts', ST + 'kurusu.steps.ts', F + 'eslestirme.feature'].map(f),
    endpoints: ['POST /v1/projeksiyon/eslestirme-kodu', 'GET /v1/projeksiyon/kodlar', 'DELETE /v1/projeksiyon/tarayici'],
    exports: [],
    needs: ['D02.oturumGetir', 'D02.dersGetir', 'D04.pencereGetir', 'D04.esitlemeSaglikliMi', 'D13.uygulamaHatasi', 'D15.log', 'D15.uyariAc'],
    tests: t(0, 1, 38, 39), depends_on: ['D11-P01', 'D11-P02', 'D11-P04', 'D11-P06', 'D11-P07', 'D11-P08'], size: 'L',
    notes: 'Üç kürsü ucu, kimlik kancası, tarayıcı çerezi ve önceki değer kabulü, tarayıcı etiketi, adres sınırı ve eşli kullanım izi yazılır (GET kodlar ucunun bağlı durumu D11-P13\'te senaryolaşır); kod alma, aynı çerezle yenileme, adres başına yeni tarayıcı sınırı ve kullanılmış koda düşen çakışma senaryolarıyla denetlenir.',
  },
  {
    title: 'Hoca onayı ve kürsü kurucusu',
    files: [M + 'onay.ts', 'apps/server/test/support/kurucular/projeksiyon.ts', ST + 'hoca-telefonu.steps.ts', F + 'guvenlik.feature'].map(f),
    endpoints: ['POST /v1/projeksiyon/onay'],
    exports: ['kursuEslestir'],
    needs: ['D02.dersYetkisi', 'D02.oturumGetir', 'D02.dersGetir', 'D02.OTURUM_DURUMLARI', 'D04.pencereGetir', 'D13.uygulamaHatasi', 'D14.isGonder', 'D15.kurucuTanimla'],
    tests: t(4, 8, 9, 11, 12, 40), depends_on: ['D11-P07', 'D11-P08', 'D11-P11'], size: 'L',
    notes: 'Onay ucu kod özetini setteki her kid ile arar, yanlış deneme sayacını, ikinci kullanımı, zaman aşımı tekrarını ve dersteki tek projeksiyonu danışma kilitleri altında işleyip kapatma işini koyar, hoca telefonu adımları sözleşmedeki bütün hoca isteklerini (onay, bağlantılar, QR anahtarı, gösterim kaydı) kapsar; çerez yenileme, ikinci kullanım, deneme sınırı, varlık sızmayan ret ve kid dönüşü senaryolarıyla denetlenir.',
  },
  {
    title: 'Kürsü kod senaryoları',
    files: [f(F + 'projeksiyon-kodlari.feature')],
    exports: [], needs: [],
    tests: t(3, 5, 6, 7, 59), depends_on: ['D11-P11', 'D11-P12'], size: 'S',
    notes: 'Onaylanmış kürsünün GET kodlar davranışı (öbür tarayıcının kod alamaması, eşli kullanım uyarısı, 30 saniye ve pencere sınırı, saat eşitlemesi bozukken boş liste) ve kursuEslestir kurucusunun uçla aynı satırları kurması senaryolaştırılır; her senaryonun kontrol adımı ve kurucusuz tarayıcının ESLESME_BEKLIYOR görmesiyle denetlenir.',
  },
  {
    title: 'Bağlantılar ve kapatma işi',
    files: [M + 'baglanti.ts', J + 'projeksiyon-baglanti-kapat.ts', F + 'baglantilar.feature'].map(f),
    endpoints: ['GET /v1/projeksiyon/baglantilar', 'DELETE /v1/projeksiyon/baglantilar/{id}'],
    jobs: ['projeksiyon_baglanti_kapat'],
    exports: [],
    needs: ['D02.oturumGetir', 'D02.dersGetir', 'D02.OTURUM_DURUMLARI', 'D04.pencereGetir', 'D13.uygulamaHatasi', 'D14.isGonder'],
    tests: t(2, 10, 14, 15, 16, 35), depends_on: ['D11-P04', 'D11-P07', 'D11-P11', 'D11-P12'], size: 'M',
    notes: 'Bağlantı listesi ve kesme uçları, oturum kapanış dinleyicisinin işlevi ve bitis_ani ile son_dilim kuralını yazan kapatma işi eklenir; tek dokunuşla kesme, dersteki tek projeksiyon, ders bitişi, program değişikliği, iptal, salt okunur GET ve aynı veriyle iki kez çalışan iş senaryolarıyla denetlenir.',
  },
  {
    title: 'QR anahtarları, yuvalar ve kimlik dinleyicisi',
    files: [M + 'qr-anahtarlari.ts', M + 'kimlik-dinleyicisi.ts', F + 'qr-anahtarlari.feature'].map(f),
    endpoints: ['POST /v1/projeksiyon/qr-anahtarlari'],
    exports: ['projeksiyonKimlikDinleyicisi'],
    needs: ['D01.kisiGetir', 'D13.uygulamaHatasi'],
    tests: t(13, 17, 18, 19), depends_on: ['D11-P06', 'D11-P07', 'D11-P08', 'D11-P09', 'D11-P12'], size: 'M',
    notes: 'QR anahtarları ucu yuva seçip bugün dahil 5 günün anahtarını türetir ve indirme satırını yazar, kimlik dinleyicisi giriş oturumu olayında yuvayı iptal eder ya da devreder; aynı gün aynı bayt, dokuz rakam sınırı, inceleme hesabı, oturum kapanışı ve panel ile kürsü kimliğinin reddi senaryolarıyla denetlenir.',
  },
  {
    title: 'Gösterim kaydı ve yeniden hesap',
    files: [M + 'gosterim.ts', M + 'yeniden-hesap.ts', F + 'gosterim-kaydi.feature'].map(f),
    exports: ['gosterimKaydiOgesi'],
    needs: ['D02.oturumGetir', 'D02.dersGetir', 'D04.saatSonucu', 'D14.isGonder', 'D15.log'],
    tests: t(21, 24, 25, 27, 28, 32, 33), depends_on: ['D11-P03', 'D11-P07', 'D11-P09', 'D11-P12', 'D11-P15'], size: 'L',
    notes: 'gosterim_kaydi işleyicisi kilit kancası, gövde ve sahiplik denetimi, çakışmasız yazım, hoca saati ve yuva bağıyla, oturumun bekleyen kanıtlarını SKIP LOCKED ile yeniden hesaplayıp dinleyicinin calistir aşamasını çağıran ortak işlevle birlikte yazılır; bekleyen kayıt, hoca payı, hoca saati yok, ders devri, yedek kod 20 saniye sınırı ve çift gönderim senaryolarıyla denetlenir.',
  },
  {
    title: 'Eklenti ve modül dış yüzü',
    files: [M + 'eklenti.ts', M + 'index.ts', F + 'eklenti.feature'].map(f),
    exports: ['projeksiyonEklentisi'],
    needs: ['D04.oturumKapandiDinleyicisiKaydet', 'D06.ogeTuruKaydet', 'D12.saklamaIsleyicisiKaydet', 'D13.rotalariKaydet'],
    tests: t(34, 56, 57, 58), depends_on: ['D11-P02', 'D11-P07', 'D11-P09', 'D11-P10', 'D11-P11', 'D11-P12', 'D11-P14', 'D11-P15', 'D11-P16'], size: 'M',
    notes: 'Eklenti yedi rotayı, gosterim_kaydi öğesini, oturum kapanış dinleyicisini ve saklama işleyicisini veritabanına dokunmadan kaydedip temizlik zamanlayıcısını yalnız api sürecinde kurar, index.ts modülün dış yüzünü toplar; Aşama 2 bayrağı, rota tablosu ve hata kataloğu, denetim olayları ve boş sorgu günlüğüyle kayıt testleriyle denetlenir.',
  },
  {
    title: 'Yarış ve bekleyen yeniden hesap işi',
    files: [J + 'projeksiyon-bekleyen-yeniden-hesapla.ts', ST + 'yaris.steps.ts', F + 'gosterim-yarisi.feature', F + 'yeniden-hesap.feature'].map(f),
    jobs: ['projeksiyon_bekleyen_yeniden_hesapla'],
    exports: [],
    needs: ['D14.isGonder', 'D14.kuyruktakiIsler', 'D15.log'],
    tests: t(22, 23, 41, 42, 43), depends_on: ['D11-P09', 'D11-P12', 'D11-P16'], size: 'L',
    notes: 'Bekleyen yeniden hesap işi tek kilit çağrısı, SKIP LOCKED ve zincir sınırıyla yazılır ve engel noktalı yarış adımları eklenir; öğrenci ile hoca yarışında bekleyen kalmaması, Bluetooth ve konum bekleyenleri, iki aşamalı tek kilitli dinleyici çağrısı ve 5 saniyelik işin atlanan satırı tamamlaması senaryolarıyla denetlenir.',
  },
  {
    title: 'Gece temizliği, iş listesi ve geri yükleme',
    files: [J + 'projeksiyon-eslestirme-temizle.ts', J + 'index.ts', F + 'isler.feature', F + 'geri-yukleme.feature'].map(f),
    jobs: ['projeksiyon_eslestirme_temizle'],
    exports: ['isler'],
    needs: ['D14.isTanimla', 'D15.log'],
    tests: t(30, 31, 36, 48, 60), depends_on: ['D11-P11', 'D11-P14', 'D11-P15', 'D11-P16', 'D11-P18'], size: 'L',
    notes: 'Gece temizliği ve gösterim güvenlik ağı işi ile üç işi toplayan isler listesi yazılır; üç işin aynı veriyle iki kez çalışma senaryoları, kid dönüşü ve yedekten dönüş senaryoları, bütün işlemleri kapsayan katman sıralı danışma kilidi casus testi ve D15 yük profilindeki projeksiyon eşikleriyle denetlenir.',
  },
];

const out = { id: 'D11', packages: P.map((p, i) => ({
  id: 'D11-P' + String(i + 1).padStart(2, '0'),
  title: p.title, files: p.files, tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [],
  exports: p.exports || [], needs: p.needs || [], tests: p.tests, depends_on: p.depends_on, size: p.size, notes: p.notes,
})) };

// self checks: every spec file, test and export exactly once; depends_on only points backwards
const seen = new Map();
for (const p of out.packages) for (const x of p.files) { if (seen.has(x)) throw new Error('file twice ' + x); seen.set(x, p.id); }
const missing = files.filter(x => !seen.has(x)); if (missing.length) throw new Error('files missing ' + missing.join(', '));
const tn = new Map(); for (const p of out.packages) for (const x of p.tests) { if (tn.has(x)) throw new Error('test twice ' + x); tn.set(x, p.id); }
const tmiss = S.tests.map(x => x.name).filter(x => !tn.has(x)); if (tmiss.length) throw new Error('tests missing ' + tmiss.join(' | '));
const ex = new Map(); for (const p of out.packages) for (const x of p.exports) { if (ex.has(x)) throw new Error('export twice ' + x); ex.set(x, p.id); }
const emiss = S.exports.map(e => e.name).filter(x => !ex.has(x)); if (emiss.length) throw new Error('exports missing ' + emiss.join(', '));
for (const p of out.packages) for (const d of p.depends_on) if (d >= p.id) throw new Error(p.id + ' depends forward on ' + d);
const txt = JSON.stringify(out, null, 1);
if (/[–—]/.test(txt)) throw new Error('dash found');
fs.writeFileSync(path.join(B, 'packages', 'D11.json'), txt + '\n');
console.log('wrote', out.packages.length, 'packages;', seen.size, 'files;', tn.size, 'tests;', ex.size, 'exports');

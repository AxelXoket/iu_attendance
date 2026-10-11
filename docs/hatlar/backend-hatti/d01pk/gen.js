// Builds packages/D01.json from index references into spec/D01.json (tests, files) and contracts.json (endpoints, jobs).
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D01.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const M = C.modules.find(m => m.id === 'D01');
const T = i => { if (!S.tests[i]) throw new Error('no test ' + i); return S.tests[i].name; };
const sf = new Set(S.files);
const F = p => { if (!sf.has(p)) throw new Error('not a spec file: ' + p); return p; };
const mk = n => F('apps/server/src/modules/kimlik/' + n);
const jb = n => F('apps/server/src/jobs/kimlik/' + n);
const co = n => F('packages/core/src/kimlik/' + n);
const fe = n => F('apps/server/test/features/kimlik/' + n + '.feature');
const st = n => F('apps/server/test/steps/kimlik/' + n + '.steps.ts');
const E = s => { if (!M.owns_endpoints.includes(s)) throw new Error('no endpoint ' + s); return s; };
const J = s => { if (!M.owns_jobs.includes(s)) throw new Error('no job ' + s); return s; };
const MIG = 'apps/server/migrations/20261020090000_kimlik_ilk_sema/';
const P = [];
const pid = n => 'D01-P' + String(n).padStart(2, '0');
const add = o => P.push({ id: pid(P.length + 1), title: o.title, files: o.files, tables: o.tables || [], endpoints: o.endpoints || [], jobs: o.jobs || [], exports: o.exports || [], needs: o.needs || [], tests: o.tests.map(T), depends_on: (o.dep || []).map(pid), size: o.size, notes: o.notes });

add({ title: 'Kimlik sözleşmesi ve yetki işlevi', size: 'L',
  files: [F('packages/contracts/src/kimlik.ts'), mk('yetki.ts'), mk('yetki.test.ts')],
  exports: ['KimlikDinleyicisi', 'KimlikOlayi'],
  needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.Kimlik', 'D13.KisiId', 'D13.BirimId', 'D13.DEGISIM_BEKLEYEN_ROTALARI', 'D13.HIZ_SINIFLARI', 'D12.Islem'],
  tests: [79],
  notes: "Sözleşme dosyasına 28 rotanın şemaları, KIMLIK_ hata kodları, denetim olay türleri, KIMLIK_SABITLERI ve kimlik olayı tipleri, yetki.ts'e saf yetkiDenetle yazılır; yetki.test.ts rota beyanlarını ve yönetici kapsam kuralını denetler." });

add({ title: 'Saf kurallar: e-posta, bekleme ve oturum seçimi', size: 'M', dep: [1],
  files: [co('eposta.ts'), co('eposta.test.ts'), co('bekleme.ts'), co('bekleme.test.ts'), co('oturum-kurallari.ts'), co('oturum-kurallari.test.ts')],
  exports: ['epostaNormallestir'],
  tests: [73, 74, 75],
  notes: 'E-posta normalleştirme, uzayan bekleme süresi ve kapatılacak oturumun seçimi saf işlev olarak yazılır; fast-check özellik testleri sabitleri sözleşme dosyasından içe alarak denetler.' });

add({ title: 'Saf kurallar: cihaz etiketi, kayıt kodu ve toplu teyit', size: 'M', dep: [1, 2],
  files: [co('index.ts'), co('cihaz-etiketi.ts'), co('cihaz-etiketi.test.ts'), co('kayit-kodu.ts'), co('kayit-kodu.test.ts'), co('teyit.ts'), co('teyit.test.ts')],
  exports: ['topluTeyitUygunMu'],
  tests: [76, 77, 78],
  notes: 'Cihaz etiketi, Crockford kayıt kodu, toplu teyit yüklemi ve engel işlevi saf işlev olarak yazılır ve core dizini kurulur; özellik testleri etiket kümesini, kod biçimini ve yüklemle engelin her girdide aynı sonucu verdiğini denetler.' });

add({ title: 'Şema, göç ve yaprak okuyucular', size: 'L', dep: [1, 3],
  files: [mk('tablolar.ts'), mk('yaprak.ts'), mk('ozetler.ts'), mk('ozetler.test.ts'), MIG + 'migration.sql', MIG + 'snapshot.json'],
  tables: M.owns_tables.slice(),
  exports: ['yetkiDenetle', 'kisiGetir', 'personelRolleri', 'hesapSilindiMi', 'ogrenciHesabiGetir', 'cihazGetir', 'cihazAnahtariGetir', 'girisOturumuGetir'],
  needs: ['D12.tabloYardimcilari', 'D12.Islem'],
  tests: [70],
  notes: 'On bir tablo kısmi tekil dizinleri ve kopya sütunlarıyla tek göç klasöründe kurulur, sekiz yaprak okuyucu ve kod ile anahtar özet işlevleri yazılır; ozetler.test.ts özetleri, timingSafeEqual karşılaştırmasını ve toplu okuyucunun gerçek veritabanında tek sorgu yaptığını denetler.' });

add({ title: 'Olay yayını, cihaz satırı ve ortak sorgular', size: 'L', dep: [4],
  files: [mk('olaylar.ts'), mk('olaylar.test.ts'), mk('cihaz-servisi.ts'), mk('sorgular.ts'), mk('inceleme.ts')],
  exports: ['kimlikDinleyicileriniKur', 'kimlikDinleyicileriHazir', 'cihazDogrulamaSonucunuYaz'],
  needs: ['D09.denetimeYaz', 'D15.log', 'D15.ayarlar'],
  tests: [63],
  notes: 'Dört aboneye sabit sırayla olay veren kayıt ve yapısal olay log satırı, D07 çağırmayan cihaz satırı işlemleri (bağlama, kapatma, doğrulama sonucu yazma), ortak kilit sorguları ve inceleme kuralları yazılır; olaylar.test.ts abone sırasını, eksik abonede KIMLIK_DINLEYICI_EKSIK hatasını ve aynı sonuçla ikinci çağrının denetim satırı eklemediğini denetler.' });

add({ title: 'Oturum servisi ve kök oturum kancası', size: 'L', dep: [5, 2],
  files: [mk('oturum-servisi.ts'), mk('kanca.ts'), mk('kanca.test.ts')],
  exports: ['oturumDogrula', 'oturumlariKapat'],
  needs: ['D13.OturumGirdisi', 'D13.OturumSonucu', 'D13.CEREZLER', 'D13.IstemciBilgisi', 'D04.simdi', 'D12.islem', 'D09.denetimeYaz'],
  tests: [8, 9, 64],
  notes: 'Oturum açma, üç oturum sınırı, telefon yenilemesi, kapatma ve oturumlariKapat ile kökteki oturumDogrula kancası yazılır; kanca.test.ts sahte saatle telefon ve panel sürelerini, X-Arka-Plan başlığını ve olay komutu kapatmasından sonra olay_komutu nedenini denetler.' });

add({ title: 'Kişi bağı saklama işleyicisi', size: 'S', dep: [4],
  files: [mk('saklama.ts'), fe('saklama')],
  needs: ['D12.saklamaIsleyicisiniCalistir'],
  tests: [69],
  notes: 'kimlik.kisi_bagi işleyicisi silinmiş, kapanmış ve reddedilmiş öğrenci hesaplarında numarayı ve girilen ismi partiler halinde siler; saklama.feature sınır anından önceki ve sonraki hesaplarla denetler.' });

add({ title: 'Kod isteği, e-posta yolu ve personel girişi', size: 'L', dep: [6, 3],
  files: [mk('sabit-sure.ts'), mk('eposta-yolu.ts'), mk('giris-servisi.ts'), st('giris'), fe('hoca-girisi')],
  endpoints: [E('POST /v1/kimlik/kod'), E('POST /v1/kimlik/giris')],
  needs: ['D14.epostaSiniriDenetle', 'D14.epostaGonder', 'D15.gizliAnahtar', 'D09.denetimeYaz', 'D04.simdi'],
  tests: [0, 1, 2, 3, 4, 5, 6],
  notes: 'Her durumda aynı cevabı aynı sürede veren kod isteği, D14 sınırından geçen e-posta yolu ve kodla giriş (tek kullanım, 5 dakika, üç yanlış, uzayan bekleme, inceleme sabit kodu) yazılır; hoca-girisi.feature sahte saat ve sahte posta kutusuyla denetler.' });

add({ title: 'Hoca başvurusu ve yönetici onayı', size: 'M', dep: [8],
  files: [mk('basvuru-servisi.ts'), fe('hoca-basvurusu')],
  endpoints: [E('POST /v1/kimlik/basvuru'), E('POST /v1/kimlik/basvuru/dogrula'), E('GET /v1/kimlik/yonetim/basvurular'), E('POST /v1/kimlik/yonetim/basvurular/{kisiId}/onay'), E('POST /v1/kimlik/yonetim/basvurular/{kisiId}/ret')],
  needs: ['D02.birimGetir', 'D09.denetimeYaz'],
  tests: [7, 16, 17],
  notes: 'Hoca başvurusu, kod doğrulaması, onay bekleyenler listesi ve yöneticinin onayı ile reddi yazılır; hoca-basvurusu.feature doğrulanmamış ikinci başvurunun kişi satırını değiştirmediğini ve başvuru kodunun giriş formunda da doğruladığını denetler.' });

add({ title: 'Oturumlarım ve yönetici hesap işlemleri', size: 'L', dep: [8],
  files: [mk('yonetim-servisi.ts'), st('yonetim'), fe('yonetim'), fe('oturumlar')],
  endpoints: [E('GET /v1/kimlik/oturumlar'), E('DELETE /v1/kimlik/oturumlar/{girisOturumuId}'), E('GET /v1/kimlik/yonetim/hesaplar'), E('POST /v1/kimlik/yonetim/hesaplar/{kisiId}/oturumlari-kapat'), E('POST /v1/kimlik/yonetim/hesaplar/{kisiId}/pasif'), E('POST /v1/kimlik/yonetim/hesaplar/{kisiId}/etkin'), E('POST /v1/kimlik/yonetim/yoneticiler'), E('DELETE /v1/kimlik/yonetim/yoneticiler/{kisiId}')],
  needs: ['D02.birimGetir', 'D09.denetimeYaz'],
  tests: [10, 11, 12, 13, 15, 20],
  notes: 'Oturumlarım listesi ve kapatma, yöneticinin hesap listesi, oturum kapatma, pasif ve etkin yapma, yönetici ve hoca rolü verme ve geri alma yazılır; oturumlar.feature ve yonetim.feature dördüncü girişi, telefon yenilemesini, bildirim hatasını ve son tüm kapsamlı yönetici korumasını denetler.' });

add({ title: 'İlk kayıt teyidi ve liste eşleştirmesi', size: 'L', dep: [6],
  files: [mk('teyit-servisi.ts'), st('ogrenci'), fe('ilk-kayit-teyidi')],
  exports: ['ogrenciTeyitEt', 'ogrenciTeyidiniReddet', 'bekleyenKayitlariEslestir'],
  needs: ['D02.dersYetkisi', 'D02.dersGetir', 'D03.ogrencininEtkinSatirlari', 'D03.numaraIleEslestir', 'D06.ogrenciDurumuDegisti', 'D07.yenidenDegerlendir', 'D07.dogrulamaTeyitAnahtari', 'D12.danismaKilidi', 'D12.danismaKilidiDene', 'D09.denetimeYaz', 'D15.gizliAnahtar', 'D15.ayarlar'],
  tests: [25, 26, 27, 28],
  notes: 'ogrenciTeyitEt, ogrenciTeyidiniReddet, bekleyenKayitlariEslestir ve kayıt kodu üretimi teyit anahtarı, numara satırı kilidi ve aynı işlemde D07 ile D06 çağrısıyla yazılır; ilk-kayit-teyidi.feature toplu ve tek yolu, teyit yetkisini ve aynı numaradaki öbür hesabın reddini denetler.' });

add({ title: 'Cihaz değişimi ve App Attest yenilemesi', size: 'L', dep: [11],
  files: [mk('degisim-servisi.ts'), st('cihaz'), fe('cihaz-degisimi'), fe('app-attest-yenileme')],
  endpoints: [E('POST /v1/kimlik/cihaz-degisimi'), E('GET /v1/kimlik/cihaz-degisimi/{talepId}'), E('POST /v1/kimlik/cihaz-degisimi/{talepId}/onay'), E('POST /v1/kimlik/cihaz-degisimi/{talepId}/ret'), E('POST /v1/kimlik/cihaz/app-attest-yenile')],
  needs: ['D07.dogrulamaDegeriniTuket', 'D07.cihazKanitiniDogrula', 'D07.yenidenDegerlendir', 'D02.dersYetkisi', 'D03.ogrencininEtkinSatirlari', 'D09.denetimeYaz', 'D15.ayarlar'],
  tests: [33, 34, 35, 38, 39],
  notes: 'Girişsiz değişim talebi, QR değeri ve yenilemesi, hocanın tek işlemdeki onayı, etkin cihazın ve hocanın reddi ve App Attest anahtar yenilemesi yazılır; cihaz-degisimi.feature ve app-attest-yenileme.feature sahte doğrulayıcıyla denetler.' });

add({ title: 'Öğrenci kaydı, çıkış ve kayıt kodu', size: 'L', dep: [12],
  files: [mk('ogrenci-servisi.ts'), fe('ogrenci-kaydi'), fe('kayit-kodu')],
  endpoints: [E('POST /v1/kimlik/ogrenci/kayit'), E('POST /v1/kimlik/cikis'), E('GET /v1/kimlik/ben'), E('POST /v1/kimlik/kayit-kodlari')],
  needs: ['D07.dogrulamaDegeriniTuket', 'D07.cihazKanitiniDogrula', 'D07.yenidenDegerlendir', 'D07.dogrulamaTeyitAnahtari', 'D03.numaraIleEslestir', 'D03.listeKovaAnahtari', 'D02.dersGetir', 'D06.ogrenciDurumuDegisti', 'D12.danismaKilidi', 'D09.denetimeYaz', 'D15.ayarlar'],
  tests: [23, 24, 29, 30, 31, 32, 36, 37, 61, 62],
  notes: 'Öğrenci kaydı (eşleşme, tek etkin cihaz, kaybolan cevapta yeniden bağlama, teyitli numarada değişim talebi, teyitsiz hesap sınırı, kayıt koduyla kayıt), öğrenci çıkışı ve /ben yazılır; ogrenci-kaydi.feature ve kayit-kodu.feature sahte doğrulayıcı ve ayar anahtarlarıyla denetler.' });

add({ title: 'Hesap silme', size: 'L', dep: [13, 10, 9],
  files: [mk('silme-servisi.ts'), mk('kuyruklar.ts'), st('silme'), fe('hesap-silme'), F('docker/caddy/sayfalar/hesap-silme.html')],
  endpoints: [E('POST /v1/kimlik/hesap-silme'), E('DELETE /v1/kimlik/hesap-silme'), E('POST /v1/kimlik/ogrenciler/{kisiId}/hesap-silme'), E('POST /v1/kimlik/basvuru/silme')],
  exports: ['hesabiSil'],
  needs: ['D07.yenidenDegerlendir', 'D07.dogrulamaTeyitAnahtari', 'D02.dersYetkisi', 'D02.dersGetir', 'D03.ogrencininEtkinSatirlari', 'D12.danismaKilidi', 'D14.isGonder', 'D14.KuyrukTanimi', 'D09.denetimeYaz', 'D15.gizliAnahtar'],
  tests: [40, 41, 42, 43, 45, 46, 47, 48],
  notes: 'Hemen ya da sırada yürüyen silme isteği ve iptali, iki telefonlu hocanın beklemesi, hocanın yüz yüze öğrenci silmesi, oturumsuz başvuru silmesi, hesabiSil ve durağan hesap silme sayfası yazılır; hesap-silme.feature her hesap durumunda bir silme yolu olduğunu ve D07 çağrısının aynı işlemde yapıldığını denetler.' });

add({ title: 'Eklenti, uç bağlama ve dış yüz', size: 'L', dep: [7, 9, 10, 14],
  files: [mk('uclar.ts'), mk('eklenti.ts'), mk('index.ts'), mk('sinirlar.test.ts')],
  exports: ['kimlikEklentisi'],
  needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D03.listeDegisikligiDinleyicisiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D09.denetimOlaylariniKaydet'],
  tests: [71, 81],
  notes: '28 rotanın işleyicileri rotalariKaydet ile bağlanır, kimlikEklentisi D03, D12 ve D09 kayıtlarını her süreçte yapar ve index.ts dış yüzü kurulur; sinirlar.test.ts dependency-cruiser ile yaprak kuralını, eklentinin kapalı veritabanı havuzuyla kaydolduğunu ve rota listesinin tam geldiğini denetler.' });

add({ title: 'İnceleme hesapları kurulum işi', size: 'M', dep: [15],
  files: [jb('inceleme-hesaplari-kurulumu.ts'), fe('inceleme-hesaplari')],
  jobs: [J('inceleme_hesaplari_kurulumu')],
  needs: ['D02.denemeDersiniKur', 'D03.denemeListesiniKur', 'D03.ogrencininEtkinSatirlari', 'D15.ayarlar', 'D15.uyariAc', 'D13.uygulamaKur'],
  tests: [49, 50, 51],
  notes: 'inceleme_hesaplari_kurulumu deneme hocasını, deneme dersini ve deneme liste satırını tek işlemde kurar ve ayar değişince eski hesabın ayrıcalığını kaldırır; inceleme-hesaplari.feature boş veritabanında işçi açılışından inceleme girişine kadar denetler.' });

add({ title: 'Temizlik, silme yürütücü ve bekleyen kayıt kapatma işleri', size: 'L', dep: [16],
  files: [jb('index.ts'), jb('kimlik-temizligi.ts'), jb('giris-oturumu-temizligi.ts'), jb('hesap-silme-yurutucu.ts'), jb('bekleyen-kayit-kapatma.ts'), jb('zamanlama.test.ts'), st('isler'), fe('kimlik-isleri')],
  jobs: [J('kimlik_temizligi'), J('giris_oturumu_temizligi'), J('hesap_silme_yurutucu'), J('bekleyen_kayit_kapatma')],
  needs: ['D14.isTanimla', 'D14.isiCalistirVeBekle', 'D02.kilitliBirimDonemleri', 'D03.numaraIleEslestir', 'D03.listeKovaAnahtari', 'D07.yenidenDegerlendir', 'D07.dogrulamaTeyitAnahtari', 'D12.danismaKilidi', 'D13.uygulamaKur'],
  tests: [44, 53, 54, 82, 83],
  notes: 'Dört iş yazılır ve beş iş isler dizisinde D14.isTanimla ile tanımlanır; zamanlama.test.ts D14 çizelge kuralını, kimlik-isleri.feature ikinci çalışmanın hiçbir satırı değiştirmediğini ve işçide personel silmesinin anahtarsız bittiğini denetler.' });

add({ title: 'Gerçek kanca, köken ve yetki senaryoları', size: 'M', dep: [15],
  files: [fe('kanca'), fe('yetki'), F('apps/server/test/support/kurucular/kimlik.ts')],
  needs: ['D13.uygulamaKur', 'D15.kurucuTanimla'],
  tests: [14, 18, 19, 21, 22, 55, 86],
  notes: 'D13 bileşimi üstünde gerçek kanca, çerez ve köken kuralı, rol ve kapsam reddi senaryoları ile öbür modüllerin kullanacağı kimlik veri kurucuları yazılır; kanca.feature ve yetki.feature sahte oturumDogrula olmadan denetler, yük senaryosu kancanın p95 payını ölçer.' });

add({ title: 'Bileşim kökleri ve ilk yönetici komutu', size: 'L', dep: [17, 18],
  files: [F('apps/server/src/cli/yonetici-ekle.ts'), st('bilesim'), fe('bilesim'), fe('ilk-yonetici')],
  needs: ['D13.uygulamaKur', 'D02.derslerKimlikDinleyicisi', 'D06.esitlemeKimlikDinleyicisi', 'D11.projeksiyonKimlikDinleyicisi', 'D15.kimlikOlayiDinleyicisi', 'D15.ayarlariYukle', 'D12.veritabaniKur'],
  tests: [52, 65, 66, 67, 68],
  notes: 'yonetici-ekle komutu dört aboneyle kendi bileşim kökünü kurar; bilesim.feature dinleyicilerin her kökte sırayla kurulduğunu, dinleyici hatasının işlemi geri aldığını, olay log satırlarını ve denetim türlerinin kaydını, ilk-yonetici.feature komutun tekrar çalışmasını denetler.' });

add({ title: 'Eşzamanlılık, kilit katmanları ve gizlilik taramaları', size: 'L', dep: [19],
  files: [fe('eszamanlilik'), fe('kilit-katmanlari'), fe('gizlilik')],
  tests: [56, 57, 58, 59, 60, 72, 80, 84, 85],
  notes: 'İki bağlantıda eşzamanlı kayıt, teyit ve personel akışları, danışma kilidi sırası, kişisel veri taraması, kopya alan tutarlılığı, hata kodlarının tamlığı ve mutasyon koşusu bütün kimlik senaryoları üstünde denetlenir.' });

const out = { id: 'D01', packages: P };
const js = JSON.stringify(out, null, 2);
if (/[–—]/.test(js)) throw new Error('contains U+2013 or U+2014');
const used = new Map();
for (const p of P) for (const f of p.files) { if (used.has(f)) throw new Error('dup file ' + f); used.set(f, p.id); }
const missF = S.files.filter(f => !used.has(f)); if (missF.length) throw new Error('missing files ' + missF);
const tn = P.flatMap(p => p.tests);
const dupT = tn.filter((t, i) => tn.indexOf(t) !== i); if (dupT.length) throw new Error('dup tests ' + dupT);
const missT = S.tests.map(t => t.name).filter(n => !tn.includes(n)); if (missT.length) throw new Error('missing tests ' + missT);
for (const p of P) for (const d of p.depends_on) if (d >= p.id) throw new Error(p.id + ' depends on later ' + d);
fs.writeFileSync(path.join(B, 'packages', 'D01.json'), js + '\n');
console.log('wrote', P.length, 'packages;', tn.length, 'tests;', used.size, 'files');

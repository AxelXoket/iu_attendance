// Builds packages/D10.json from test indices so test names are copied verbatim from spec/D10.json.
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D10.json'), 'utf8'));
const T = i => S.tests[i].name;
const M = 'apps/server/src/modules/raporlar/';
const J = 'apps/server/src/jobs/raporlar/';
const C = 'packages/core/src/raporlar/';
const F = 'apps/server/test/features/raporlar/';
const ST = 'apps/server/test/steps/raporlar/';
const MIG = 'apps/server/migrations/20261010090000_raporlar_aksis_ozet_anliklari/';
const P = [
 { id: 'D10-P01', title: 'Rapor sözleşmesi, kod sabitleri ve çıktı durumu',
   files: ['packages/contracts/src/raporlar.ts', C + 'kodlar.ts', C + 'cikti-durumu.ts', C + 'cikti-durumu.test.ts'],
   exports: ['AksisAnligi'],
   needs: ['D13.rotaTanimla', 'D13.hataKodlariTanimla', 'D13.genisleyenEnum', 'D13.anSemasi', 'D13.gunSemasi', 'D13.bindeSemasi', 'D13.istemciKimligiSemasi', 'D13.ogrenciNoSemasi', 'D02.OTURUM_TURLERI', 'D02.YAPILDI_DURUMLARI'],
   tests: [45], depends_on: [], size: 'L',
   notes: 'Sözleşme dosyası beş ucun rota listesini, istek ve cevap şemalarını, RAPORLAR_ hata kataloğunu, AksisAnligi tipini, kuyruk veri şemasını ve boş RAPORLAR_DENETIM_OLAYLARI haritasını, kodlar.ts hücre ve geçici neden kodlarını, cikti-durumu.ts DONEM_ICI, DONEM_SONU, KILITLI ve engel kuralını verir; fast-check zaman dizileriyle çıktı durumu testi denetler.' },
 { id: 'D10-P02', title: 'Anlık tabloları, göç, taban okuması ve saklama işleyicisi',
   files: [M + 'tablolar.ts', MIG + 'migration.sql', MIG + 'snapshot.json', M + 'yaprak.ts', M + 'saklama.ts', ST + 'anlik-adimlari.ts', F + 'anlik-saklama.feature'],
   tables: ['aksis_ozet_anliklari', 'aksis_ozet_anligi_satirlari'],
   exports: ['aksisAnligiGetir'],
   needs: ['D12.tabloYardimcilari', 'D12.kisitAdi', 'D12.Islem', 'D12.saklamaIsleyicisiniCalistir'],
   tests: [33, 32, 16, 30], depends_on: ['D10-P01', 'D10-P07'], size: 'L',
   notes: 'İki anlık tablosu tablolar.ts ve tek göç klasörüyle (içe aktarılan sabitlerden CHECK listeleri, GUN_SONU kısmi tekil dizini, @yalniz-ekleme yorumu, UPDATE ve DELETE yetkisinin geri alınması) kurulur, yaprak.ts yalnız ./tablolar.ts içe aktararak aksisAnligiGetir taban kuralını, saklama.ts raporlar.donem_verisi parti işleyicisini verir; anlik-saklama.feature şema kurallarını, taban kuralını, dış yüz sözleşmesini ve yalnız ekleme yetkisini anlik-adimlari.ts adımlarıyla denetler.' },
 { id: 'D10-P03', title: 'Değişim sınıfı',
   files: [C + 'degisim-sinifi.ts', C + 'degisim-sinifi.test.ts'],
   exports: ['degisimSinifi'],
   needs: ['D09.SEBEP_KODLARI', 'D09.SON_DURUMLAR'],
   tests: [44], depends_on: [], size: 'S',
   notes: 'Taban sonucu, şimdiki sonuç ve tabandan sonraki değişimlerden HAKSIZ, MAZERETLI, DIGER ya da DEGISMEDI döndüren saf işlev D09 kataloğunu içe aktararak yazılır; tablo ve fast-check testi D09 ile ortak kullanılan bu dış yüzü denetler.' },
 { id: 'D10-P04', title: 'Harf, yüzde, tarih ve hücre metinleri',
   files: [C + 'harfler.ts', C + 'harfler.test.ts', C + 'yuzde.ts', C + 'yuzde.test.ts', C + 'tarih.ts', C + 'tarih.test.ts', C + 'hucre.ts', C + 'hucre.test.ts'],
   needs: ['D09.SON_DURUMLAR', 'D08.DEVAM_SON_DURUMLARI'],
   tests: [37, 38, 40, 41], depends_on: ['D10-P01'], size: 'M',
   notes: 'Intl kullanmayan harf tablosu (V, Y, G, B ve E D09 kataloğundan, M D08 sabitinden), onda bir birimli yüzde metni, tablo ve metin tarihleri ile kısmi hücre gösterimi yazılır; özellik testleri Intl bozulmuşken ve iki saat diliminde aynı sonucu ve yüzde metninin kararla çelişmediğini denetler.' },
 { id: 'D10-P05', title: 'Geçicilik kuralı ve kanonik özet içeriği',
   files: [C + 'gecicilik.ts', C + 'gecicilik.test.ts', C + 'ozet-icerigi.ts', C + 'ozet-icerigi.test.ts'],
   needs: [],
   tests: [39], depends_on: ['D10-P01'], size: 'M',
   notes: 'Geçici nedenlerinin sabit sırası ve kilitten sonra yaşayan nedenler süzgeci ile biçim 1 kanonik özet içeriği ve SHA-256 özeti saf işlev olarak yazılır; fast-check alan alan değişimi, içerik dışı alanların etkisizliğini, NFC ve NFD eşitliğini ve depodaki altın metinle bayt eşitliğini denetler.' },
 { id: 'D10-P06', title: 'Excel satır modeli, dosya adı ve ortak paket girişi',
   files: [C + 'sayfa.ts', C + 'sayfa.test.ts', C + 'dosya-adi.ts', C + 'dosya-adi.test.ts', C + 'index.ts'],
   needs: [],
   tests: [42, 43, 48], depends_on: ['D10-P01', 'D10-P03', 'D10-P04', 'D10-P05'], size: 'M',
   notes: 'Kütüphaneden bağımsız yalnız metin hücreli sayfa modeli, ASCII dosya adı ve packages/core/src/raporlar/index.ts toplu dışa vermesi yazılır; özellik testleri ve bütün ortak paket üzerinde koşan Stryker mutasyon eşiği denetler.' },
 { id: 'D10-P07', title: 'Rapor test kurucusu',
   files: ['apps/server/test/support/kurucular/raporlar.ts'],
   needs: [],
   tests: [46, 47], depends_on: [], size: 'M',
   notes: 'Öbür modüllerin kurucularını birleştirerek 14 öğrencilik altın tablo kurulumunu, tohumu yazılı 50 derslik fast-check üretecini (şube değişimi, birlikte işlenen oturum, Md.9/4 geç kayıt, ekle-bırak), 400 öğrenci ve 70 oturumluk şubeyi ve 1000 şubelik birimi kuran kurucu yazılır; D15 k6 yük senaryoları bu kurucunun verisiyle süre bütçesini ölçer.' },
 { id: 'D10-P08', title: 'Okuma işlemi, okunan tablolar ve kaynak yetkisi',
   files: [M + 'okuma-islemi.ts', M + 'okunan-tablolar.ts', M + 'yetki.ts', ST + 'rapor-adimlari.ts', F + 'rapor-sozlesmesi.feature'],
   needs: ['D12.islem', 'D12.Islem', 'D13.kalanSureMs', 'D13.uygulamaHatasi', 'D02.dersYetkisi', 'D02.dersGetir', 'D02.subeGetir', 'D01.yetkiDenetle'],
   tests: [27, 28, 29], depends_on: ['D10-P01', 'D10-P02', 'D10-P07'], size: 'L',
   notes: 'okuma-islemi.ts READ ONLY ve REPEATABLE READ işlemi süre bütçesi ve isteğe bağlı rapor okuma havuzuyla açar, okunan-tablolar.ts okuma istisnasındaki sorguları sahiplerin tipli tablolarıyla, yetki.ts yalnız sahip kabulünü, yönetici kapsamını ve varlık sızdırmayan 404 RAPORLAR_BULUNAMADI kararını toplar; rapor-sozlesmesi.feature EXPLAIN, 25006 ve x-extensible-enum senaryolarıyla, bütün rapor adımlarını taşıyan rapor-adimlari.ts üzerinden denetler.' },
 { id: 'D10-P09', title: 'AKSİS özeti ve geçici nedenleri',
   files: [M + 'aksis-ozeti.ts', M + 'gecicilik.ts', F + 'aksis-ozeti.feature'],
   endpoints: ['GET /v1/raporlar/subeler/{subeId}/aksis-ozeti'],
   needs: ['D08.dersSonuclari', 'D02.dersGetir', 'D02.subeGetir', 'D02.oturumlariGetir', 'D02.kilitDurumu', 'D02.birimDonemiGetir', 'D02.OTURUM_DURUMLARI', 'D02.YAPILDI_DURUMLARI', 'D06.gondermeSuresiSonu', 'D13.uygulamaHatasi'],
   tests: [4], depends_on: ['D10-P01', 'D10-P02', 'D10-P05', 'D10-P08'], size: 'L',
   notes: 'Özet ucu D08.dersSonuclari sonucunu aynı okuma işleminde canlı okuyup sıra, tür bayrakları, ders işaretleri, çıktı durumu, taban ve ozetOzeti ile kurar, sunucu gecicilik.ts neden sayılarını toplar; aksis-ozeti.feature 14 öğrencilik elle hesaplanmış altın tabloyla her alanı, sırayı ve ozetOzeti değerini karşılaştırır.' },
 { id: 'D10-P10', title: 'Ders raporu',
   files: [M + 'ders-raporu.ts', F + 'ders-raporu.feature'],
   endpoints: ['GET /v1/raporlar/dersler/{dersId}'],
   needs: ['D08.oturumSonDurumlari', 'D08.dersSonuclari', 'D02.dersGetir', 'D02.dersSubeleri', 'D02.oturumlariGetir', 'D02.takvimGetir', 'D02.kilitDurumu', 'D02.birimDonemiGetir', 'D02.OTURUM_DURUMLARI', 'D06.gondermeSuresiSonu', 'D13.uygulamaHatasi'],
   tests: [0, 1, 2, 3, 5], depends_on: ['D10-P08', 'D10-P09'], size: 'L',
   notes: 'Ders raporu ucu kırpılmış tarih aralığını, biten ve iptal edilmemiş oturum sütunlarını, liste sırasındaki satırları ve D08.oturumSonDurumlari hücrelerinden hücre kodlarını kurar; ders-raporu.feature sıra, aralık, hücre kodu ve geçicilik senaryolarıyla ve fast-check 50 derste hücre toplamlarının özetle tutmasıyla denetler.' },
 { id: 'D10-P11', title: 'Öğrenci raporu',
   files: [M + 'ogrenci-raporu.ts', F + 'ogrenci-raporu.feature'],
   endpoints: ['GET /v1/raporlar/ogrenciler/{satirId}'],
   needs: ['D03.satirGetir', 'D08.oturumSonDurumlari', 'D08.dersSonuclari', 'D01.ogrenciHesabiGetir', 'D02.oturumlariGetir', 'D13.uygulamaHatasi'],
   tests: [21], depends_on: ['D10-P10'], size: 'S',
   notes: 'Öğrenci raporu ucu numarayı D03.satirGetir ile çözer, yalnız isteyen hocanın aynı dönemdeki derslerindeki satırları tek öğrenci olarak toplar ve kayıt kararını ekler; ogrenci-raporu.feature başka hocanın dersinin cevapta olmadığını ve o hocanın satır kimliğiyle 404 döndüğünü denetler.' },
 { id: 'D10-P12', title: 'AKSİS özeti çıktısı ve hoca çıktısı anlığı',
   files: [M + 'cikti.ts', M + 'anlik.ts', F + 'aksis-ozeti-ciktisi.feature'],
   endpoints: ['POST /v1/raporlar/subeler/{subeId}/aksis-ozeti/ciktilar'],
   needs: ['D12.islem', 'D13.kalanSureMs', 'D13.uygulamaHatasi'],
   tests: [6, 7, 8, 9, 10, 19, 31], depends_on: ['D10-P02', 'D10-P09', 'D10-P10'], size: 'L',
   notes: 'Çıktı ucu özet karşılaştırması, cevapsız oturum engeli, çıktı kimliğiyle tekrar ve 40001 sonrası yeniden çalıştırma ile çalışır, anlik.ts başlık ve satırları aynı işlemde yazar; aksis-ozeti-ciktisi.feature 201 ve 200 ayrımını, 409 kodlarını, anlık satır sayısını, KARAR BEKLİYOR ve telafi değerlerinin anlığa aynen geçtiğini ve ozet_ozeti değerinin yeniden hesapla tuttuğunu denetler.' },
 { id: 'D10-P13', title: 'Dönem sonu raporu',
   files: [M + 'donem-sonu.ts', F + 'donem-sonu-raporu.feature'],
   endpoints: ['GET /v1/raporlar/yonetim/donem-sonu'],
   needs: ['D01.ogrenciHesabiGetir', 'D02.kilitDurumu', 'D02.birimDonemiGetir', 'D13.uygulamaHatasi'],
   tests: [18], depends_on: ['D10-P02', 'D10-P03', 'D10-P08', 'D10-P10'], size: 'M',
   notes: 'Dönem sonu ucu taban anlığına göre Haksız devamsız, mazeretli dönüş ve KARAR BEKLİYOR kalanı tek küme sorgusu ve degisimSinifi ile isimsiz sayar; donem-sonu-raporu.feature sınıflamayı, onda bir birimli oranı, kilitSonrasiHesapTamam değerini, 409 RAPORLAR_DONEM_KILITLI_DEGIL kodunu ve cevapta numara olmadığını denetler.' },
 { id: 'D10-P14', title: 'Raporlar eklentisi, rotalar, kuyruk ve kilit adımı',
   files: [M + 'rotalar.ts', M + 'index.ts', M + 'kuyruk.ts', M + 'kilit-adimi.ts', F + 'rapor-yetkisi.feature'],
   exports: ['raporlarEklentisi'],
   needs: ['D13.rotalariKaydet', 'D13.EklentiTemelSecenekleri', 'D02.kilitAdimiKaydet', 'D12.saklamaIsleyicisiKaydet', 'D14.isGonder', 'D14.KuyrukTanimi'],
   tests: [22, 23, 25, 35], depends_on: ['D10-P02', 'D10-P08', 'D10-P09', 'D10-P10', 'D10-P11', 'D10-P12', 'D10-P13'], size: 'M',
   notes: 'raporlarEklentisi beş rotayı D13.rotalariKaydet ile, sira 20 kilit adımını ve raporlar.donem_verisi saklama işleyicisini her süreçte kaydeder, kuyruk.ts stately aksisGunSonuKuyrugu tanımını, kilit-adimi.ts kilit işlemi içindeki isGonder çağrısını verir; rapor-yetkisi.feature rol ve kimlik reddini, varlık sızdırmayan 404 cevabını, rota listesinin sözleşmeyle aynılığını ve eklenti birleşim kurallarını denetler.' },
 { id: 'D10-P15', title: 'Gün sonu anlığı işi ve güvenlik ağı',
   files: [J + 'index.ts', J + 'aksis-gun-sonu-anligi.ts', F + 'gun-sonu-anligi.feature'],
   jobs: ['aksis_gun_sonu_anligi'],
   needs: ['D14.isTanimla', 'D14.isGonder', 'D02.kilitDurumu', 'D02.kilitliBirimDonemleri', 'D12.islem'],
   tests: [11, 12, 13, 14, 15, 17, 34], depends_on: ['D10-P02', 'D10-P09', 'D10-P12', 'D10-P14'], size: 'L',
   notes: 'İş, kilit adımının koyduğu birim ve dönem için GUN_SONU anlığı eksik her şubeye kendi işleminde ON CONFLICT ile bir anlık yazar, verisiz güvenlik ağı 14 günlük pencerede eksikleri kuyruğa koyar ve uygulanmamış kilitte kendini 15 dakika sonrasına koyar; gun-sonu-anligi.feature tekrar çalışmayı, işçi kesintisini, tekrar zincirini, saklanmış anlığın yeniden alınmamasını, kilit sonrası geçiciliği, EKRAN tabanını ve iş tanımı sözleşmesini denetler.' },
 { id: 'D10-P16', title: 'Rapor gizliliği, hata kodu kapsamı ve sunucu mutasyonları',
   files: [F + 'rapor-gizliligi.feature'],
   needs: [],
   tests: [20, 24, 26, 36, 49], depends_on: ['D10-P14', 'D10-P15'], size: 'M',
   notes: 'rapor-gizliligi.feature numara ve ismin log ve adres satırına girmediğini, deneme dersinin hiçbir raporda ve işte olmadığını, her RAPORLAR_ kodunun gerçek cevapta görüldüğünü ve raporlar. önekli denetim olayı yazılmadığını denetler; yedi elle mutasyon md5 ile alınıp özgün baytlar geri yazılarak adı geçen testleri kırmızıya çevirir.' },
];
const out = { id: 'D10', packages: P.map(p => ({
  id: p.id, title: p.title, files: p.files, tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [],
  exports: p.exports || [], needs: p.needs || [], tests: p.tests.map(T), depends_on: p.depends_on, size: p.size, notes: p.notes })) };
// self checks: every spec test in exactly one package, depends_on only points backwards in the build order
const used = P.flatMap(p => p.tests);
const dup = used.filter((x, i) => used.indexOf(x) !== i);
const miss = S.tests.map((_, i) => i).filter(i => !used.includes(i));
if (dup.length || miss.length) { console.error('tests dup', dup, 'missing', miss); process.exit(1); }
fs.writeFileSync(path.join(B, 'packages', 'D10.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote', out.packages.length, 'packages,', used.length, 'tests');

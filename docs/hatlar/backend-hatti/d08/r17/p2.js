// Align round, part 2: oturum_son_durumlari text, endpoints, jobs. Exact-once replacements.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 90)); s = s.replace(a, () => b); };

// ---- oturum_son_durumlari purpose
rep(`Saatler ve son durum D09.sonDurumOnceligi\\'nin o türdeki çıktısıdır; D08 yalnız kendi katmanını uygular (kapsam, son günden sonra gelen kaydın dışlanması, kilitte donan karar, MUAF örtüsü; oturum-katmani.ts).`,
    `Saatler ve son durum D09.sonDurumOnceligi\\'nin o türdeki çıktısıdır; D08 girdiyi doldurur (kapsam; son günden sonra gelen kayıtta SonDurumKaydi.sayimDisi; kilitli birim döneminde SonDurumOturumu.kilitli) ve üstüne yalnız MUAF örtüsünü koyar (oturum-katmani.ts).`);

// ---- endpoint 1: karar-bekleyenler
rep(`auth: 'Hoca oturumu (panel çerezi ya da hoca telefonu Bearer; rota tablosunda kimlik: oturum, rol: hoca). D02.dersYetkisi sahip dönmezse 404 DEVAM_BULUNAMADI (varlık sızmaz, D13-B02).`,
    `auth: 'Hoca oturumu (panel çerezi ya da hoca telefonu Bearer; rota tablosunda kimlik: oturum, rol: hoca; rolü uymayan 403 API_ROL_YETKISIZ, D13). D02.dersYetkisi(tx, kimlik, dersId) \\'sahip\\' dönmezse 404 DEVAM_BULUNAMADI (varlık sızmaz, D13-B02).`);
rep(`ogrenciNo: metin, adSoyad: metin, nedenler: (BAGLANTI_YOK | ACIK_ISARET)[] x-extensible-enum, sonuc: DEVAMSIZ | DEVAMLI x-extensible-enum, sonTemasAni: metin ya da null, sonTemastaBekleyenVar: boolean,`,
    `ogrenciNo: metin, adSoyad: metin, nedenler: (BAGLANTI_YOK | ACIK_ISARET)[] x-extensible-enum, sonuc: DEVAMSIZ | DEVAMLI x-extensible-enum, sonTemasAni: metin ya da null, sonTemastaBekleyenVar: boolean (D06 bekleyenYoklamaVar),`);
rep(`idempotency: 'GET; hiçbir şey yazmaz. Tek REPEATABLE READ, READ ONLY işlemde canlı hesap (packages/core/src/devam, dersSonuclari ile aynı fonksiyon); saklanan satıra ve bekleyen işe bağlı değil.',`,
    `idempotency: 'GET; hiçbir şey yazmaz. Tek işlemde canlı hesap: D12.islem(fn, { yalitim: \\'repeatable_read\\', saltOkunur: true }); packages/core/src/devam, dersSonuclari ile aynı fonksiyon; saklanan satıra ve bekleyen işe bağlı değil.',`);
rep(`sorgu sayısı öğrenci sayısından bağımsız (toplu okumalar, D08-A08).',`,
    `sorgu sayısı öğrenci sayısından bağımsız (toplu okumalar: D01.ogrenciHesabiGetir { numaralar } ve { kisiIdler }, D05.sayilanKayitlar, D06.kurulumSonTemaslari, D09 duzeltmeleriGetir ve acikSorunBildirimleri).',`);

// ---- endpoint 2: muaf
rep(`auth: 'Hoca oturumu (panel; kimlik: oturum, rol: hoca). D02.dersYetkisi sahip dönmezse 404 DEVAM_BULUNAMADI; deneme dersinde de 404.`,
    `auth: 'Hoca oturumu (panel; kimlik: oturum, rol: hoca; rolü uymayan 403 API_ROL_YETKISIZ). D02.dersYetkisi(tx, kimlik, dersId) \\'sahip\\' dönmezse 404 DEVAM_BULUNAMADI; deneme dersinde de 404.`);
rep(`satirId: 'yol; uuid; bu dersin bir şubesindeki liste satırı (D03.satirGetir). Sözleşmedeki {ogrenciId} adı bu anlamla satirId oldu (D08-A09).', muaf: 'boolean; zorunlu' },`,
    `satirId: 'yol; uuid; bu dersin bir şubesindeki liste satırı (D03.satirGetir); hesabı olmayan öğrenci de işaretlenir. Yol contracts.json ile aynı (D08-A09).', muaf: 'boolean; zorunlu' },`);
rep(`degisti: 'boolean; false ise hiçbir şey yazılmadı', yazilanSatirSayisi: 'tam sayı; aynı numaranın bu dersteki satırlarından değeri değişenler', hesapKuyrukta: 'boolean' },`,
    `degisti: 'boolean; false ise hiçbir şey yazılmadı', hesapKuyrukta: 'boolean' },`);
{
  const a = s.indexOf(`    idempotency: 'PUT doğal eş güçlü. Muaf ders ve numara düzeyindedir:`);
  const b = s.indexOf(`\n`, a);
  if (a < 0 || s.indexOf(`    idempotency: 'PUT doğal eş güçlü. Muaf ders ve numara düzeyindedir:`, a + 1) >= 0) throw new Error('muaf idempotency line');
  s = s.slice(0, a) + `    idempotency: 'PUT doğal eş güçlü. Muaf (ders, numara) başına tek değerdir (A3): tek işlemde D03.satirGetir ile satır, dersi ve etkinliği doğrulanır (başka dersin satırı 404 DEVAM_BULUNAMADI, pasif satır 409 DEVAM_SATIR_PASIF), sonra D03.muafIsaretle(tx, satirId, muaf, { an, yapan: { kisiId } }) numaranın dersteki bütün satırlarını kilitleyip yazar ve sonuç birliği döner. DEGISMEDI: 200 degisti false, denetim ve iş yok. YAZILDI: aynı işlemde tek D09.denetimeYaz (devam.muaf_degisti; donemId, birimId, dersId, listeSatiriId, onceki ve sonraki muaf) ve devamHesaplaIsiKoy(tx, dersId, null, \\'MUAF\\', { tur: \\'LISTE_SATIRI\\', id: satirId, donemId }, istekKimligi). Sonuç birliği D08 kodlarına çevrilir: KILITLI ve neden DONEM_KILIDI 409 DEVAM_DONEM_KILITLI, DERS_ARSIVDE 409 DEVAM_DERS_ARSIVDE, SUBE_PASIF 409 DEVAM_SATIR_PASIF, DENEME_DERSI ve SATIR_YOK 404 DEVAM_BULUNAMADI; beyan dışı kod çıkmaz (D13-B02). D02.kilitDurumu(tx, birimId, donemId, an).kilitli ve D02.dersGetir durumu yalnız ön denetimdir; kesin cevap muafIsaretle\\'nin kilit altındaki sonucudur (00:00 ile 00:05 arasında da kilitli). Sıra: satır kilitleri (muafIsaretle), denetim, iş kuyruğu; danışma anahtarı gerekmez.',` + s.slice(b);
}

// ---- endpoint 3: oranlar
rep(`method: 'PUT', path: '/v1/devam/dersler/{dersId}/oranlar', client: 'panel',`, `method: 'PUT', path: '/v1/devam/yonetim/dersler/{dersId}/oranlar', client: 'panel',`);
{
  const a = s.indexOf(`    auth: 'Yönetici oturumu (panel; kimlik: oturum, rol: yonetici).`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('oran auth');
  s = s.slice(0, a) + `    auth: 'Yönetici oturumu (panel; kimlik: oturum, rol: yonetici). Yol {teknik:sunucu|yönetici uçları kuralıyla} /v1/devam/yonetim/ altındadır (D08-A14); rolü yönetici olmayan 403 API_ROL_YETKISIZ (D13). Kaynak denetimi dersin sahipliğinden bağımsızdır: D01.yetkiDenetle(kimlik, \\'yonetici\\', { birimId: ders.birimId }) false ise 404 DEVAM_BULUNAMADI. D02.dersYetkisi kullanılmaz, çünkü kişi dersin sahibiyse kapsama bakmadan \\'sahip\\' döner: dersin sahibi olan kapsam içi yönetici 200 alır, başka birimin yöneticisi olan hoca kendi dersinde 404 alır. Birimsiz deneme dersi kapsam dışıdır (404).',` + s.slice(b);
}
{
  const a = s.indexOf(`    idempotency: 'PUT: iki değer zaten öyleyse 200 degisti: false.`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('oran idempotency');
  s = s.slice(0, a) + `    idempotency: 'PUT eş güçlü. Tek işlemde D02.oranlariYaz(tx, dersId, { teoriP, uygulamaP }) ders satırını kilitleyip aynı anla denetler ve sonuç birliği döner: degismedi 200 degisti false (denetim ve iş yok); kilitli 409 DEVAM_DONEM_KILITLI; arsivde 409 DEVAM_DERS_ARSIVDE; yazildi: aynı işlemde D09.denetimeYaz (devam.oran_degisti; donemId, birimId, dersId, onceki ve sonraki iki değer) ve devamHesaplaIsiKoy(tx, dersId, null, \\'ORAN\\', { tur: \\'DERS\\', id: dersId }, istekKimligi). Aralık dışı ya da tam sayı olmayan değer Zod doğrulamasıyla 400 (D13 zarfı).',` + s.slice(b);
}

// ---- job devam_hesapla
{
  const a = s.indexOf(`    schedule: 'Olay anında: tetikleyen değişiklikle aynı işlemde devamHesaplaIsiKoy`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('job1 schedule');
  s = s.slice(0, a) + `    schedule: 'Olay anında: tetikleyen değişiklikle aynı işlemde devamHesaplaIsiKoy (yaprak.ts) D14.isGonder(tx, devamHesaplaKuyrugu, veri, { baslamaAni?, istekKimligi? }) çağırır. KuyrukTanimi devamHesaplaKuyrugu modules/devam/yaprak.ts içindedir: { ad: devam_hesapla, politika: standard, veri: strict { dersId: z.uuid(), ogrenciId: z.uuid() ya da null (kişi kimliği; null dersin bütün öğrencileri), neden: z.enum(DEVAM_NEDENLERI), tetikleyen?: { tur: z.enum(DEVAM_TETIKLEYEN_TURLERI), id: z.uuid(), donemId?: z.uuid() } } }; numara, isim ve kod yoktur. İstek kimliğini çağıran verirse işe eklenir (D08 uçları verir); dinleyici ve iş kaynaklı tetiklerde istek yoktur, iz tetikleyen alanıyla kurulur. Tanım jobs/devam/index.ts\\'teki export const isler dizisinde D14.isTanimla ile: partiIsleyici ve parti { boyut: 50, esZamanli: 2 }; sureAsimiSaniye 300 bütün parti için (ders başına en çok yaklaşık 1 saniyelik 50 grup ve pay); deneme { sayi: 3, beklemeSaniye: 30, ustel: true }; tükenen iş D14\\'ün devam_hesapla_olu kuyruğuna. İşçinin Drizzle havuzu 3 bağlantının 2\\'sini bu partiler kullanır (D12, D14, D15 bütçesi). Yalnız ders geneli YAPILDI işi 5 dakika sonra başlar: baslamaAni, eklentinin yaprağa verdiği saat arayüzünden (yaprakKur({ saat })) + 5 dakika; Date.now() yok, pg-boss TestClock testleri aynı saati sürer. Gerekçe: hoca kafa sayısını çoğunlukla ders sonunda, ders çıkışındaki kayıt tepesiyle aynı dakikalarda girer; ders geneli yeniden hesap tepeden sonra çalışır, canlı okumalar bu gecikmeden etkilenmez. OTURUM_KAPANDI ve öbür nedenler hemen başlar: pencere yoklama süresi bitince kapanır, ders çıkışından önce.',` + s.slice(b);
}
rep(`Fazla işler işçide partide aynı (ders, öğrenci) olarak birleşir; hesap eş güçlü olduğundan iki kez çalışmak zararsız. Ders başına D12.danismaKilidi(tx, [devam:hesap:<dersId>]) işlemin ilk komutudur (READ COMMITTED). Her ders grubu ayrı işlemdir;`,
    `Fazla işler işçide partide aynı (ders, öğrenci) olarak birleşir; hesap eş güçlü olduğundan iki kez çalışmak zararsız. Ders başına D12.danismaKilidi(tx, [\\'devam:hesap:<dersId>\\']) işlemin ilk çağrısıdır (katman 1, dışlayıcı; READ COMMITTED). Kilit sırası ortak danışma kilidi kuralına (D12, katmanlar) uyar: danışma anahtarı, D08 satırları öğrencinin kanonik sırasıyla (D09-B32: teyitli hesabın kişi kimliği, hesapsız öğrencide en eski liste satırının kimliği; öğrenci içinde oturumId ve tür), sonra D06.ogrenciDurumuDegisti aynı kişi kimliği sırasıyla; durum_surumu işlemin zaten yazdığı satıra yazılır, yeni kilit almaz; iş kuyruğa koymaz, genel sayaç (D06.surumAl) almaz. Her ders grubu ayrı işlemdir;`);
rep(`Hesap veritabanı durumu ve saatin saf fonksiyonudur; satırlar yalnız IS DISTINCT FROM ise yazılır, geçmiş yalnız gösterilen seviye değişince eklenir; aynı durumda ikinci çalışma hiçbir satır yazmaz.',`,
    `Hesap veritabanı durumu ve saatin saf fonksiyonudur; satırlar yalnız IS DISTINCT FROM ise yazılır, geçmiş yalnız gösterilen seviye değişince eklenir; aynı durumda ikinci çalışma hiçbir satır yazmaz (D14\\'ün \\'aynı veriyle iki kez çalışırsa\\' adımıyla sınanır).',`);
{
  const a = s.indexOf(`    does: 'Partiyi derse göre gruplar;`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('job1 does');
  s = s.slice(0, a) + `    does: 'Partiyi derse göre gruplar; her ders grubu tek işlemde: ders kilidi; D02.dersGetir; deneme dersiyse hiçbir şey yazmadan biter ve log satırına atlandi: DENEME yazar (D08-A13). Ders düzeyi girdiler bir kez: D02 oturumlar (tür ve iptal nedeni D02\\'nin OTURUM_TURLERI, OTURUM_DURUMLARI ve IPTAL_NEDENLERI sabitleriyle karşılaştırılır, kopya yazılmaz), şubeler, takvim ve kilit durumu; D03 şube listeleri; D01.ogrenciHesabiGetir(tx, { numaralar }) dersin bütün liste numaraları için tek toplu çağrı (kişi kimliği, numara, teyit durumu; silinmiş hesaplar dahil), kayıtlarda ya da sorun bildirimlerinde bu sonuçta olmayan kişi kimlikleri varsa onlar için tek { kisiIdler } çağrısı; D05.sayilanKayitlar(tx, { donemId, oturumIdler }) oturum listesiyle; D09\\'un modules/duzeltmeler/yaprak.ts dosyasından duzeltmeleriGetir(tx, { dersId }) ve acikSorunBildirimleri(tx, { dersId }); son oturum bitmişse teyitli hesaplar için D06.kurulumSonTemaslari(tx, kisiIdler) tek çağrı; saklanan önceki durum. packages/core/src/devam ile kapsam, D09.sonDurumOnceligi (girdide sayimDisi ve kilitli D08\\'in doldurduğu alanlar) ve MUAF örtüsüyle oturum satırları, tür durumları, seviye (geri gitmez kuralıyla) ve genel sonuç hesaplanır; değişen satırlar kanonik öğrenci sırasıyla yazılır, kapsamdan çıkan oturum ve tür satırları silinir, seviye değişimi devam_seviye_gecmisi\\'ne eklenir, kilit_ani kilit durumundan yazılır. Telefona inen bir değeri değişen her öğrencinin teyitli hesabı için D06.ogrenciDurumuDegisti çağrılır ve dönen sürüm o dersin durum_surumu sütununa yazılır. Log: ders, öğrenci sayısı, yazılan satır, süre; numara ve isim yok.',` + s.slice(b);
}

// ---- job devam_tutarlilik_denetimi
{
  const a = s.indexOf(`    schedule: 'Her gece 05:35 Europe/Istanbul`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('job2 schedule');
  s = s.slice(0, a) + `    schedule: 'Her gece 05:35 Europe/Istanbul. Tanım jobs/devam/index.ts\\'teki isler dizisinde D14.isTanimla ile: kuyruk devamTutarlilikKuyrugu (modules/devam/kuyruklar.ts; politika stately, aynı anda tek; veri boş strict nesne; cikti şeması aşağıda), isleyici, sureAsimiSaniye 3600, zamanlama { cron: 35 5 * * *, sonra: [bekleyen_kararlari_coz] } (saat dilimi D14\\'ün, her zaman Europe/Istanbul). Yeri D14\\'ün çizelgesindedir: D07\\'nin 05:25 bekleyen_kararlari_coz işinden sonra (gecenin karar değişiklikleri hesaba girmiş olur), D09\\'un 05:50 gece_inceleme_siralamasi işinden önce (D09 bu işi sonra listesinde taşır). Çizelge kuralına uyar: 03:00 ile 05:00 arası günlük iş yok, komşu işlerle en az 5 dakika aralık (D14-B05; işçi açılışı, kur ve sözleşme testi denetler).',` + s.slice(b);
}
rep(`idempotency: 'Fark yazıldıktan sonra ikinci çalışma 0 fark bulur. Dersler sabit sırayla işlenir: denetlendigi_an boş olanlar`,
    `idempotency: 'Fark yazıldıktan sonra ikinci çalışma 0 fark bulur ve hiçbir satır yazmaz (D14\\'ün \\'aynı veriyle iki kez çalışırsa\\' adımı). Dersler sabit sırayla işlenir: denetlenme_ani boş olanlar`);
rep(`Her ders ayrı işlem ve aynı ders kilidi; ders bitince satırlarına denetlendigi_an yazılır.`,
    `Her ders ayrı işlem ve ilk çağrısı aynı ders kilidi (\\'devam:hesap:<dersId>\\', katman 1); yazım sırası devam_hesapla ile aynı; ders bitince satırlarına denetlenme_ani yazılır.`);
{
  const a = s.indexOf(`    does: 'Ders listesini D02\\'den alır, D08\\'in kendi tablosundan değil:`);
  const b = s.indexOf(`\n`, a);
  if (a < 0) throw new Error('job2 does');
  s = s.slice(0, a) + `    does: 'Ders listesini D02.denetlenecekDersler(tx, { an, kilittenSonraGun: 30 }) ile alır, D08\\'in kendi tablosundan değil: kilidi uygulanmamış ya da 30 günden yeni uygulanmış birim dönemlerinin deneme dışı bütün dersleri (arşiv dahil); böylece ilk tetiği kaybolmuş, hiç satırı olmayan ders de denetlenir. Her dersi sıfırdan hesaplar ve saklananla karşılaştırır. Farkları DEVAM_FARK_TURLERI ile sınıflar (SAAT, HAK_KARAR, OTURUM_SON_DURUMU, HESAPLANAN_SEVIYE, ACIK_ISARET, EKSIK_SATIR, FAZLA_SATIR; bağlantı nedeninin yenilenmesi ve seviye tutmasından gelen gösterilen > hesaplanan fark sayılmaz) ve düzeltir. kural_surumu ya da sayim_tabani ayardan farklı satırları yeniden hesaplar (neden KURAL) ve bunları ayrı sayar. İşleyici kuyruğun çıktı şemasına uyan { dersSayisi, ogrenciSayisi, farkSayisi, farkTurleri } nesnesini döndürür: üç sayı z.int().min(0).max(10_000_000), farkTurleri z.array(z.enum(DEVAM_FARK_TURLERI)).max(7); D14 bunu iş çıktısına yazar, IsSagligi\\'nda zamanlama.sonCikti olarak görünür. Tek log satırı (olay devam.tutarlilik) aynı dört değere kontrolEdilmeyenDersSayisi ve kuralYenidenHesapSayisi\\'nı ekler. farkSayisi "saklanan ile yeniden hesap farkı"dır: kaçan tetik, yarım kalan iş, elle bozulmuş satırı ölçer; kural hatasını ölçmez, çünkü iki taraf aynı kodla hesaplanır. Kural sürümü değişikliğinin yeniden hesabı farkSayisi\\'na girmez, uyarı açmaz. Planın "hesabın elle hesaplananla uyuşmazlığı 0" hedefi ayrı izlenir: CI\\'daki bağımsız kahin testi ve dönem başına elle denetlenen örnek (D15-A09). D08 D15\\'i çağırmaz: D15\\'in isletim.devam_tutarlilik_farki kuralı IsSagligi\\'nda bu kuyruğun sonCikti.farkSayisi > 0 koşulunu okur.',` + s.slice(b);
}

fs.writeFileSync(f, s);
console.log('p2 ok');

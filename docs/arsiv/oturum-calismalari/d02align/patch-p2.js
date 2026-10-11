// p2-uclar.js: architect alignment (I009, I010, I011, I027, I063, I070, I071).
const { load, save, rep, repLine, J } = require('./lib.js');
let s = load('p2-uclar.js');

s = repLine(s, 'const HOCA = ', `const HOCA = ${J("Oturum (panel çerezi ya da Bearer), rol hoca: rol rota düzeyinde denetlenir, uymazsa 403 API_ROL_YETKISIZ (D13). Ders sahibi olmalı (dersYetkisi(tx, kimlik, dersId) = sahip; yazan uçta ders satırı FOR UPDATE ile kilitlendikten sonra sahip yeniden denetlenir, devirle yarışan yazım eski sahiple işlenmez). Sahip değilse 404 DERSLER_BULUNAMADI: başka hocanın dersinin varlığı sızmaz (D13 ortak kuralı, plan.html#baslangic yetki senaryosu). İnceleme hesabı (kimlik.incelemeHesabi; D13'ün ortak Kimlik tipi, D01 çağrısı gerekmez) deneme dersi dışındaki hiçbir dersi okuyamaz: okuma uçlarında da 404.")};`);
s = rep(s, '(D01.kisiGetir incelemeHesabi true)', '(kimlik.incelemeHesabi true)');
s = repLine(s, 'const HOCA_OTURUM = ', `const HOCA_OTURUM = ${J('Oturum, rol hoca (rota düzeyi; uymazsa 403 API_ROL_YETKISIZ); oturumun dersinin sahibi olmalı (dersYetkisi = sahip; yazan uçta sahip ders satırı kilitlendikten sonra yeniden denetlenir). Değilse 404 DERSLER_BULUNAMADI.')};`);
s = repLine(s, 'const YON = ', `const YON = (kapsam) => ${J("Oturum, rol yonetici: rol rota düzeyinde denetlenir, uymazsa 403 API_ROL_YETKISIZ (D13). Birim kapsamı modül içinde D01.yetkiDenetle(kimlik, 'yonetici', kapsam) ile kimlik.roller'dan okunur (kapsamBirimId null: bütün birimler; ilk sürümde her yönetici genel, D02-A06); kapsam dışı hedef 404 DERSLER_BULUNAMADI (varlık sızmaz). Kapsam: ")} + kapsam;`);
s = repLine(s, 'const OLUSTUR_HOCA = ', `const OLUSTUR_HOCA = (ad, durum = ${J('yeni kayıt da tekrar da 200 döner (D13-B12)')}) => ${J('Gövdedeki id (istemcinin ürettiği UUIDv7) tekrar anahtarıdır; ')} + durum + ${J('. Hedefli ON CONFLICT (id) DO NOTHING; çakışmada var olan satır okunur: dersi isteyen hocanın değilse içeriğe bakılmadan 404 DERSLER_BULUNAMADI (başka hocanın kimliği varlık sızdırmaz); isteyenin ve içerik aynıysa 200 ile var olan ')} + ad + ${J('; içerik farklıysa 409 DERSLER_KIMLIK_CAKISMASI.')};`);
s = rep(s, 'çakışmada var olan satır kapsam dışıysa 404, ', 'çakışmada var olan satır kapsam dışıysa 404 DERSLER_BULUNAMADI, ');
s = rep(s, 'İnceleme hesabına (D01.kisiGetir incelemeHesabi) yalnız deneme dersi döner', 'İnceleme hesabına (kimlik.incelemeHesabi) yalnız deneme dersi döner');

// POST /v1/dersler: durumlar [201, 200], sahiplik geçmişi
s = repLine(s, "method: 'POST', path: '/v1/dersler', client:", `    method: 'POST', path: '/v1/dersler', client: 'panel', auth: ${J('Oturum, rol hoca (rota düzeyi; uymazsa 403 API_ROL_YETKISIZ, D13); sahip isteği yapan hocadır. İnceleme hesabı (kimlik.incelemeHesabi) ders açamaz: 403 DERSLER_INCELEME_HESABI (plan.html#kararlar-inceleme-hesaplari; mağaza konsolundaki inceleme hesabıyla gerçek birime sahte ders açılıp gerçek numaralara indirilmesin).')},`);
s = repLine(s, 'yeni derste de tekrarda da 200', '    response: { ders: `${DersOzeti}; yeni derste 201, aynı kimlik ve içerikle tekrarda 200 (rota beyanı durumlar [201, 200], D13; I071)` },');
s = repLine(s, "idempotency: OLUSTUR_HOCA('ders')", `    idempotency: OLUSTUR_HOCA('ders', ${J('yeni ders 201, aynı kimlik ve içerikle tekrar 200 döner (rota beyanı durumlar [201, 200], D13)')}) + ${J(' Açılışta sahiplik_gecmisi tek açık öğeyle ({ sahip, açılış anı, null }) yazılır ve kapsam_degisim_surumu işlemin sürümüdür (personel kapsamı değişti).')}, rate_limit: RL,`);

// Beklenen sürüm: ortak beklenenSurumNoSemasi
s = repLine(s, "beklenenDuzenlemeNo: 'tam sayı; ders.duzenlemeNo ile aynı olmalı", `      beklenenSurumNo: ${J('tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); ders.duzenlemeNo ile aynı olmalı (gövde istenen değerlerle zaten aynıysa bakılmaz)')},`);
s = repLine(s, "request: { beklenenDuzenlemeNo: 'tam sayı; dersin duzenlemeNo değeri'", `    request: { beklenenSurumNo: ${J('tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); dersin duzenlemeNo değeri')}, programSaatleri: programSaatleriIstek },`);
s = repLine(s, "beklenenSurumNo: 'tam sayı; takvimin surumNo değeri'", `      beklenenSurumNo: ${J('tam sayı 0 ile 2147483647 (ortak beklenenSurumNoSemasi, D13; I071); takvimin surumNo değeri')}, ad: 'metin 1-120',`);

// Ders arşivi: FOR UPDATE, sonra liste kaynağı
s = repLine(s, "iptalEdilenOturum: 'int (gelecekteki planlı oturumlar iptal, neden arsiv)'", `    response: { ders: DersOzeti, iptalEdilenOturum: 'int (gelecekteki planlı oturumlar iptal, neden arsiv)', etkinListeSatiri: ${J('int (liste kaynağının kilitten sonra verdiği etkin liste satırı sayısı: telefonundan ders kalkacak öğrenci; denetim ayrıntısına da yazılır)')} },`);
s = repLine(s, "idempotency: 'Arşivdeki derse 200", `    idempotency: ${J("Arşivdeki derse 200 ve değişiklik yok. Arşiv tek işlemde: önce ders satırı, sonra dersin şube satırları kimlik sırasıyla FOR UPDATE ile kilitlenir, liste kaynağı (etkinSatirlar) kilitten sonra sorulur (D03 liste yazmadan önce aynı satırları dersGetir ve subeGetir(..., { kilitle: 'paylasimli' }) ile FOR SHARE alır, arşivdeki derse yeni etkin satır yazılamaz; I011); kapsam_degisim_surumu yazılır (hocanın telefonu baştan indirir, öğrenciye ders satırı silindi olarak iner) ve D08 işi neden PROGRAM.")}, rate_limit: RL,`);

// Şube pasifleştirme
s = repLine(s, "request: { etiket: 'metin 1-20, isteğe bağlı', durum:", `    request: { etiket: 'metin 1-20, isteğe bağlı', durum: ${J("etkin|pasif, isteğe bağlı; pasif yalnız şubede etkin liste satırı yokken ve dersin başka etkin şubesi varken: önce ders, sonra şube satırı FOR UPDATE ile kilitlenir, liste kaynağı (etkinSatirlar) kilitten sonra sorulur (D03 satır yazmadan önce ders ve şubeyi aynı sırayla dersGetir ve subeGetir(..., { kilitle: 'paylasimli' }) ile FOR SHARE alır; I010, I011); pasif şube başlamamış oturumlardan ve program saatlerinden çıkar, yalnız bu şubeye hizmet eden program saati aynı işlemde silinir (silinme_ani, değişiklik geçmişi ve sürümle), şubesiz kalan başlamamış oturum iptal (program)")} },`);

// Dönem açılışı: D12.donemBolumuAc
s = repLine(s, "idempotency: OLUSTUR_YON('dönem')", `    idempotency: OLUSTUR_YON('dönem') + ${J(' Yeni dönem açan işlemde D12.donemBolumuAc(tx, donemId) çağrılır (tablo bölünmemişse işlem yapmaz; tekrar isteğinde çağrılmaz; I063).')}, rate_limit: RL,`);

// Devir: sahiplik geçmişi
s = repLine(s, 'request: { hedefKisiId:', `    request: { hedefKisiId: ${J("uuidv7; D01.kisiGetir ile aktif, inceleme hesabı olmayan personel ve D01.personelRolleri ile hoca rolü taşımalı; D01.hesapSilindiMi kişi satırını FOR SHARE kilitler, eşzamanlı hesap silme silinmiş sahip bırakmaz (üçü de modules/kimlik/yaprak.ts'ten); değilse 409 DERSLER_DEVIR_HEDEFI_GECERSIZ")}, gerekce: 'hoca_ayrildi|hesap_silindi|gorev_degisikligi' },`);
s = repLine(s, "idempotency: 'Sahip zaten hedefse 200", `    idempotency: ${J("Sahip zaten hedefse 200 ve değişiklik yok. Devirde aynı işlemde (ders satırı FOR UPDATE): sahip değişir, sahiplik_gecmisi'nin son öğesi devir anıyla kapanır ve yeni sahip açık öğe olarak sona eklenir (I027), sahip_hesap_durumu aktif olur, kapsam_degisim_surumu ve ders sürümü işlemin sürümü olur (iki hocanın telefonu da baştan indirir), denetim kaydı yazılır. Kilitli ya da arşivdeki ders yalnız sahibi silinmiş ya da pasif ve cevapsız oturumu kalmışsa devredilir (yoksa DERSLER_DONEM_KILITLI ya da DERSLER_DERS_ARSIVDE); yeni hoca orada yalnız cevapsız oturumları cevaplar. Kural sahibin onayını bekliyor (D02-A07). Deneme dersi bu uçla devredilmez (DERSLER_DENEME_DERSI_DEGISTIRILEMEZ); onu denemeDersiniKur aynı devir kuralıyla, gerekçe inceleme_hesabi_yenilendi ile devreder.")}, rate_limit: RL,`);

// Kaynak düzeyi ret tek kod: DERSLER_BULUNAMADI (I070, D13 ortak kuralı)
s = s.replace(/DERSLER_(DERS|SUBE|OTURUM|BIRIM|BOLUM|DONEM|TAKVIM)_BULUNAMADI/g, 'DERSLER_BULUNAMADI');
s = s.split('\n').map(l => l.replace(/errors: \[([^\]]*)\]/, (m, inner) => {
  const toks = inner.split(',').map(x => x.trim()).filter(Boolean);
  return `errors: [${[...new Set(toks)].join(', ')}]`;
})).join('\n');

save('p2-uclar.js', s);
require('../r17/backend/d02work/r2/p2-uclar.js');
console.log('p2 tamam');

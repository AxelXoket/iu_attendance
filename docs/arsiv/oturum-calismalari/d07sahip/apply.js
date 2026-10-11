// Rewrites every prose "sahip" stem in D07 sources (icerik.js, build.js) and packages/D07.json notes.
// Each replacement must match exactly the expected number of times, otherwise nothing is written.
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
const ELDE = 'telefonun anahtarı elinde tuttuğunun';
const plan = {
  'd07spec/icerik.js': [
    ['cihaz, liste ve oturum bilgisi sahiplerinin dış yüzünden gelir', 'cihaz, liste ve oturum bilgisi sorumlu modüllerin dış yüzünden gelir', 1],
    ["(D04; pencere sonucunun tek sahibi D04'tür, D07 yalnız karara eşler)", "(D04; pencere sonucunun tek sorumlusu D04'tür, D07 yalnız karara eşler)", 1],
    ["dersYetkisi(tx, kimlik, dersId) (yalnız 'sahip' sonucu geçer, 'yonetici' yetmez)", "dersYetkisi(tx, kimlik, dersId) (yalnız kişinin dersin hocası olduğunu söyleyen sonuç geçer, 'yonetici' yetmez)", 1],
    ['telefonun anahtarın sahibi olduğunun ve değeri bu anahtara bağladığının kanıtı', ELDE + ' ve değeri bu anahtara bağladığının kanıtı', 1],
    ["Hesap silmede silinip silinmeyeceği sahibe sorulan D12-A01'e bağlıdır", "Hesap silmede silinip silinmeyeceği onay bekleyen D12-A01'e bağlıdır", 1],
    ["D02.dersYetkisi(tx, istek.kimlik, dersId) oturumun dersi için 'sahip' dönmeli ('yonetici' yetmez)", "D02.dersYetkisi(tx, istek.kimlik, dersId) oturumun dersi için kişinin dersin hocası olduğunu dönmeli ('yonetici' yetmez)", 2],
    ["oturumun dersinde D02.dersYetkisi(tx, istek.kimlik, dersId) 'sahip' (değilse 404", "oturumun dersinde D02.dersYetkisi(tx, istek.kimlik, dersId) sonucu dersin hocası (değilse 404", 1],
    ["D13.ogeTuruTanimla('kafa_sayisi', kafaSayisiGovdesi, { sahip: 'dogrulama' }) ile tanımlıdır (KafaSayisiGovdesi)", "D13.ogeTuruTanimla('kafa_sayisi', kafaSayisiGovdesi, ...) ile, öğe türünün modülü 'dogrulama' verilerek tanımlıdır (KafaSayisiGovdesi)", 1],
    ["ya da gönderen oturumun dersi için D02.dersYetkisi(tx, baglam.kimlik, dersId) 'sahip' değil (DOGRULAMA_YETKISIZ_HOCA)", "ya da gönderen, D02.dersYetkisi(tx, baglam.kimlik, dersId) sonucuna göre oturumun dersinin hocası değil (DOGRULAMA_YETKISIZ_HOCA)", 1],
    ["pencere ve eski program hesabının tek sahibi D04'tür", "pencere ve eski program hesabının tek sorumlusu D04'tür", 1],
    ["QR'ı üreten anahtar bulunamadı ya da sahibi o dersin hocası değil", "QR'ı üreten anahtar bulunamadı ya da anahtarın ait olduğu kişi o dersin hocası değil", 1],
    ["sınıfı sahibe sorulan D11-A16'ya bağlı", "sınıfı onay bekleyen D11-A16'ya bağlı", 1],
    ['(D11-B20 sahibin kararına bağlı)', '(D11-B20 onay bekliyor)', 1],
    ['tek sahibi packages/core/src/dogrulama/karar.ts', 'tek yeri packages/core/src/dogrulama/karar.ts', 1],
    ["'İncelemede (sahibe sorulan D11-A16 değiştirebilir)'", "'İncelemede (onay bekleyen D11-A16 değiştirebilir)'", 1],
    ['kanıtsız telefonda anahtarın sahipliğinin ve değerin bu anahtara bağlandığının tek kanıtı budur', 'kanıtsız telefonda ' + ELDE + ' ve değerin bu anahtara bağlandığının tek kanıtı budur', 1],
    ["hesap silmede yalnız sahibe sorulan D12-A01'in cevabıyla", "hesap silmede yalnız onay bekleyen D12-A01'in cevabıyla", 1],
    ['Bağlamı sahiplerinin dış yüzünden toplar', 'Bağlamı sorumlu modüllerin dış yüzünden toplar', 1],
    ["(kaynak kişi D02.dersGetir'e göre dersin sahibi değil; D07 Kimlik kurmaz)", "(kaynak kişi D02.dersGetir'e göre dersin hocası değil; D07 Kimlik kurmaz)", 1],
    ["hoca D02.dersGetir'e göre dersin sahibi değilse DOGRULAMA_YETKISIZ_HOCA", "hoca D02.dersGetir'e göre dersin hocası değilse DOGRULAMA_YETKISIZ_HOCA", 1],
    ['ile oturumun dersinin sahibi olarak doğrular', 'ile oturumun dersinin hocası olarak doğrular', 1],
    ['RET yalnız gövde bozuksa, oturum yoksa ve gönderen sahip değilse;', 'RET yalnız gövde bozuksa, oturum yoksa ve gönderen dersin hocası değilse;', 1],
    ['oturum yok ya da çağıran o dersin sahibi değil (varlık sızdırılmaz)', 'oturum yok ya da çağıran o dersin hocası değil (varlık sızdırılmaz)', 1],
    ["'Kaynak hoca o dersin sahibi değil (D09 uçları önce 404 verir", "'Kaynak hoca o dersin hocası değil (D09 uçları önce 404 verir", 1],
    ['Sahip olmayan gönderen RET DOGRULAMA_YETKISIZ_HOCA', 'Dersin hocası olmayan gönderen RET DOGRULAMA_YETKISIZ_HOCA', 1],
    ['kayıtları sahiplerin tipleriyle derlenir ve kaydolur', 'kayıtları, kaydı tutan modüllerin tipleriyle derlenir ve kaydolur', 1],
    ['Aynı soru D05-B05 ve D06-B05 ile sahibe gidiyor;', "Aynı soru D05-B05 ve D06-B05'te de onay bekliyor;", 1],
    ['kafa_sayisi öğesi oturum varsa ve gönderen sahipse her durumda', 'kafa_sayisi öğesi oturum varsa ve gönderen dersin hocasıysa her durumda', 1],
    ['RET yalnız oturum yoksa, gövde bozuksa ve gönderen sahip değilse.', 'RET yalnız oturum yoksa, gövde bozuksa ve gönderen dersin hocası değilse.', 1],
    ["Pencere hesabının tek sahibi D04'tür", "Pencere hesabının tek sorumlusu D04'tür", 2],
    ['sahip Ret derse yalnız katalogda bu kodun sınıfı değişir (D07-A03)', 'Ret seçilirse yalnız katalogda bu kodun sınıfı değişir (D07-A03)', 1],
    ['kanıtsız telefonda anahtar sahipliğinin tek kanıtı odur', 'kanıtsız telefonda ' + ELDE + ' tek kanıtı odur', 1],
    ['Her kayıt sahibinin tipiyle yazılır:', 'Her kayıt, kaydı tutan modülün tipiyle yazılır:', 1],
    ['cihazKanitAyrintilariniSil sahibe sorulan D12-A01 cevaplanınca eklenir', 'cihazKanitAyrintilariniSil onay bekleyen D12-A01 cevaplanınca eklenir', 1],
    ['Kanıt ayrıntısının silinmesi kişisel veri kararıdır ve sahibindir.', 'Kanıt ayrıntısının silinmesi kişisel veri kararıdır ve onay bekler (D12-A01).', 1],
    ['karar.ts sınıf ve gerekçe eşlemesinin tek sahibidir', 'karar.ts sınıf ve gerekçe eşlemesinin tek yeridir', 1],
    ['sahibe sorulan D07-A02 ve D11-A16 bunları değiştirebilir', 'onay bekleyen D07-A02 ve D11-A16 bunları değiştirebilir', 1],
    ["Eşlemenin tek sahibi olunca D11'e eklenen her değer", "Eşleme tek yerde olunca D11'e eklenen her değer", 1],
    ['değer yazımları sahibinin sabitinden geldiği için', 'değer yazımları sorumlu modülün sabitinden geldiği için', 1],
    ["belirteçli klasör adı tablo sahipliğini CI'da denetlenebilir kılar", "belirteçli klasör adı tablonun sorumlu modülünü CI'da denetlenebilir kılar", 1],
    ['bu sahiplik kanıtıdır, cihaz doğrulaması değildir', 'bu ' + ELDE + ' kanıtıdır, cihaz doğrulaması değildir', 1],
    ['cümlesini daralttığı için sahibin kararı: D07-A01.', 'cümlesini daralttığı için onay bekliyor (Açık noktalar, D07-A01).', 1],
    ["INDIRME_KAYDI_YOK'un sınıfı sahibe ayrıca sorulan D11-A16'ya bağlıdır", "INDIRME_KAYDI_YOK'un sınıfı ayrıca onay bekleyen D11-A16'ya bağlıdır", 1],
    ['Başka modüllerde sahibe giden şu kararlar', 'Başka modüllerde onay bekleyen şu kararlar', 1],
    ['D07 bu önerilerle tasarlandı ve sahip başka seçerse yalnız', 'D07 bu önerilerle tasarlandı ve başka bir seçim yapılırsa yalnız', 1],
    ['(D07-B22 gerekçesi); sahip birini seçmeli.', '(D07-B22 gerekçesi); ikisinden biri seçilmeli.', 1],
  ],
  'd07spec/build.js': [
    ['tek sahibi packages/core/src/dogrulama/karar.ts`', 'tek yeri packages/core/src/dogrulama/karar.ts`', 1],
    ['D07-B11 ve D07-B25 sahibe soruldu (D07-A01, D07-A02)', 'D07-B11 ve D07-B25 onay bekliyor (Açık noktalar, D07-A01, D07-A02)', 1],
    ["D07-C01'in bağlama kısmı sahibin kararına bağlı", "D07-C01'in bağlama kısmı onay bekliyor (D07-A01)", 1],
    ["'sahibin kararı' : 'modül hizalaması'", "'onay bekliyor' : 'modül hizalaması'", 1],
  ],
  'packages/D07.json': [
    ['(eşleme testi, eşlemenin sahibi olan bu pakete taşındı)', '(eşleme testi, eşlemeyi tutan bu pakete taşındı)', 1],
    ['Kararın bağlamını üyelik, pencere, kesinti, cihaz, oturum, kilit ve hatalı sürüm sahiplerinin dış yüzünden toplayan', 'Kararın bağlamını üyelik, pencere, kesinti, cihaz, oturum, kilit ve hatalı sürüm bilgisini sorumlu modüllerin dış yüzünden toplayan', 1],
  ],
};
const dry = process.argv.includes('--dry');
let errs = 0;
const out = {};
for (const [f, reps] of Object.entries(plan)) {
  let s = fs.readFileSync(path.join(B, f), 'utf8');
  for (const [a, b, n] of reps) {
    const got = s.split(a).length - 1;
    if (got !== n) { console.log(`${f}: expected ${n}, found ${got}: ${a.slice(0, 80)}`); errs++; continue; }
    s = s.split(a).join(b);
  }
  if (/[\u2013\u2014]/.test(s)) { console.log(f + ': dash found'); errs++; }
  out[f] = s;
}
if (errs) { console.log('ABORT, ' + errs + ' errors'); process.exit(1); }
if (!dry) for (const [f, s] of Object.entries(out)) fs.writeFileSync(path.join(B, f), s, 'utf8');
for (const [f, s] of Object.entries(out)) {
  const left = [...s.matchAll(/.{0,60}sahi[pb][a-zçğıöşü]*.{0,40}/gi)].map(m => m[0]);
  console.log(f + ': remaining ' + left.length + (left.length ? '\n  ' + left.join('\n  ') : ''));
}
console.log(dry ? 'dry run ok' : 'written');

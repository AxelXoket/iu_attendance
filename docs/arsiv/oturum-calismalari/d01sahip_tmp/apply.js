// Rewrites every "sahip" stem in D01's generator prose (d01work/gen.js) and the two test names copied into packages/D01.json.
// Each pair must match exactly the expected number of times, otherwise nothing is written.
// Usage: node apply.js <backendDir> [--dry]
'use strict';
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const dry = process.argv.includes('--dry');
const R = String.raw;

const GEN = [
  [R`onay_bekliyor yalnız kod_bekliyor başvuru sahibi açık başvuru kodunu`, R`onay_bekliyor yalnız kod_bekliyor durumundaki başvuran açık başvuru kodunu`, 1],
  [R`D03.ogrencininEtkinSatirlari ve D02.dersYetkisi(tx, kimlik, dersId) 'sahip')`, R`D03.ogrencininEtkinSatirlari ve D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucu)`, 2],
  [R`Yetki D02.dersYetkisi(tx, kimlik, dersId) 'sahip' ile;`, R`Yetki D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucuyla;`, 1],
  [R`(7 gün sahibin kararına bağlı, D01-A21)`, R`(7 gün onay bekliyor, D01-A21)`, 1],
  [R`D02 sahipsiz ders kuralı`, R`D02 hocasız ders kuralı`, 2],
  [R`Süre sahibin kararına bağlı (D01-A25).`, R`Süre onay bekliyor (D01-A25).`, 1],
  [R`'Başvuru sahibinin isteği ya da retten 30 gün sonra`, R`'Başvuranın isteği ya da retten 30 gün sonra`, 1],
  [R`(dersYetkisi 'sahip');`, R`(dersYetkisi dersin hocası sonucu);`, 1],
  [R`D03-A02 sahip kararına kadar eklenmez`, R`D03-A02 için karar verilene kadar eklenmez`, 2],
  [R`başlangıç ve süre D12-A03 sahip kararına bağlıdır`, R`başlangıç ve süre D12-A03'te onay bekliyor`, 1],
  [R`(sahibin kararı D01-A23)`, R`(onay bekliyor, D01-A23)`, 2],
  [R`(varsayılan kapalı, sahibin kararı D01-A19)`, R`(varsayılan kapalı, onay bekliyor: D01-A19)`, 1],
  [R`D12-A01 sahip kararı silinmesini kabul ederse`, R`D12-A01'de silinmesi kabul edilirse`, 1],
  [R`(D02.dersYetkisi(tx, kimlik, dersId) 'sahip' dönmüyorsa)`, R`(D02.dersYetkisi(tx, kimlik, dersId) dersin hocası sonucunu dönmüyorsa)`, 1],
  [R`(D07.cihazKanitAyrintilariniSil D12-A01 sahip kararı gelince eklenir)`, R`(D07.cihazKanitAyrintilariniSil D12-A01 kararı verilince eklenir)`, 1],
  [R`hoca adı ve sahipsiz ders görünümü`, R`hoca adı ve hocasız ders görünümü`, 1],
  [R`o numaralara sahip teyit bekleyen hesapların`, R`o numaraları taşıyan teyit bekleyen hesapların`, 1],
  [R`hesap_silindi ile sahipsiz ders kuralı`, R`hesap_silindi ile hocasız ders kuralı`, 1],
  [R`'Bekleme yabancıyı durdurur, sahibin yeni kodunu durdurmaz'`, R`'Bekleme yabancıyı durdurur, gerçek kullanıcının yeni kodunu durdurmaz'`, 1],
  [R`beklemede tutar; sahip bu sırada yeni kod ister`, R`beklemede tutar; adresin gerçek kullanıcısı bu sırada yeni kod ister`, 1],
  [R`'Doğrulamamış başvuru sahibi giriş ekranından kod ister`, R`'Başvurusunu doğrulamamış kişi giriş ekranından kod ister`, 1],
  [R`'Başvuru sahibi onaydan önce silebilir'`, R`'Başvuran onaydan önce silebilir'`, 1],
  [R`Bekleme yalnız tahmini yavaşlatır, sahibi kilitlemez`, R`Bekleme yalnız tahmini yavaşlatır, adresin gerçek kullanıcısını kilitlemez`, 1],
  [R`D02.dersYetkisi(tx, kimlik, dersId): Promise<'sahip' | 'yonetici' | null> kapsamı kimlik.roller'dan okur`, R`D02.dersYetkisi(tx, kimlik, dersId) dersin hocası, yonetici ya da null sonucunu döner (değer adları D02'nin imzasındadır) ve kapsamı kimlik.roller'dan okur`, 1],
  [R`kanıtsız telefonda da anahtarın sahipliğini gösterir`, R`kanıtsız telefonda da anahtarın o telefonda tutulduğunu gösterir`, 1],
  [R`bağlatıp gerçek sahibini KIMLIK_CIHAZ_BAGLI'ya düşürmek`, R`bağlatıp anahtarın gerçek kullanıcısını KIMLIK_CIHAZ_BAGLI'ya düşürmek`, 1],
  [R`(sahibin kararı D01-A06)`, R`(onay bekliyor, D01-A06)`, 1],
  [R`Sahibin kararı D01-A20.`, R`Onay bekliyor: D01-A20.`, 1],
  [R`(sahibin kararı D01-A21)`, R`(onay bekliyor, D01-A21)`, 1],
  [R`'Oturum açamayan hesabın sahibi web sayfasında`, R`'Oturum açamayan kişi kendi hesabını web sayfasında`, 1],
  [R`Sahibin kararı D01-A22.`, R`Onay bekliyor: D01-A22.`, 1],
  [R`D12-A01 sahip kararı kabul ederse`, R`D12-A01'de kabul edilirse`, 1],
  [R`Reddedilen ya da kapanan hesabın sahibinin uygulamadan silme yolu yok`, R`Reddedilen ya da kapanan hesapta öğrencinin uygulamadan silme yolu yok`, 1],
  [R`silinmesi sahibe sorulan D12-A01'e bağlıdır`, R`silinmesi onay bekleyen D12-A01'e bağlıdır`, 1],
  [R`yeniden deneme istenirse sahibin kararı.`, R`yeniden deneme ancak ayrıca karar verilirse eklenir.`, 1],
  [R`kimlik 11 tabloyu, 28 ucu ve 5 işi sahiplenir;`, R`kimlik 11 tablodan, 28 uçtan ve 5 işten sorumludur;`, 1],
  [R`Ayrıntı yalnız anahtarın sahibine döner`, R`Ayrıntı yalnız anahtarı taşıyan istemciye döner`, 2],
  [R`Kimlik modülü contracts.json'daki 11 tabloyu ve 28 ucu sahiplenir (D01-B46)`, R`Kimlik modülü contracts.json'daki 11 tablodan ve 28 uçtan sorumludur (D01-B46)`, 1],
  [R`D02 sahipsiz dersi kisiGetir.silinmeAni ile`, R`D02 hocasız dersi kisiGetir.silinmeAni ile`, 1],
  [R`ve sahipsiz ders kuralını işletir`, R`ve hocasız ders kuralını işletir`, 1],
  [R`İlk yönetici proje sahibi olacaksa onun @istanbul.edu.tr adresi var mı?`, R`İlk yönetici proje ekibinden olacaksa ekibin bir @istanbul.edu.tr adresi var mı?`, 1],
  [R`Kural istisnası olduğu için sahibin onayı gerekir;`, R`Kural istisnası olduğu için onay bekliyor;`, 1],
  [R`anahtar kuralına dokunduğu için sahibin onayı gerekir.`, R`anahtar kuralına dokunduğu için onay bekliyor.`, 1],
  [R`kendiliğinden silinmez; sahibi oturumsuz silme koduyla her an siler`, R`kendiliğinden silinmez; başvuran oturumsuz silme koduyla her an siler`, 1],
  [R`'Adres başına bekleme sahibini kilitleyebilir mi?`, R`'Adres başına bekleme adresin gerçek kullanıcısını kilitleyebilir mi?`, 1],
  [R`koda açıktır; sahip yeni kod isteyip girer`, R`koda açıktır; adresin gerçek kullanıcısı yeni kod isteyip girer`, 1],
  [R`göndererek sahibin yeni kodunu 3 yanlışla`, R`göndererek gerçek kullanıcının yeni kodunu 3 yanlışla`, 1],
  [R`e-posta koduyla girişini, öğrencinin numara ve isimle tek telefona bağlanan kaydını, giriş oturumlarını ve yönetici kapsamını sahiplenir.`, R`e-posta koduyla girişinden, öğrencinin numara ve isimle tek telefona bağlanan kaydından, giriş oturumlarından ve yönetici kapsamından sorumludur.`, 1],
  [R`row('Sahip olduğu',`, R`row('Sorumlu olduğu',`, 1],
  [R`Onaylanmamış başvuru sahibine: paneldeki kodla silme ekranı`, R`Başvurusu onaylanmamış kişiye: paneldeki kodla silme ekranı`, 1],
  [R`dersYetkisi(tx, kimlik, dersId) (\'sahip\' | \'yonetici\' | null; yönetici kapsamı`, R`dersYetkisi(tx, kimlik, dersId) (sonuç dersin hocası, yonetici ya da null; yönetici kapsamı`, 1],
  [R`böylece adresi bilen yabancı sahibi dışarıda tutamaz`, R`böylece adresi bilen yabancı adresin gerçek kullanıcısını dışarıda tutamaz`, 1],
  [R`kaynak sahipliğini modül servisi denetler`, R`kaynak düzeyi yetkiyi modül servisi denetler`, 1],
  [R`Bu noktaların hepsi sahibin kararını bekler; tasarım her birinde en dar ve geri alınabilir yolla kuruldu, öneri karar gelene kadar geçerli davranıştır.`, R`Bu noktaların hepsi onay bekliyor; tasarım her birinde en dar ve geri alınabilir yolla kuruldu, karar verilene kadar önerilen davranış geçerlidir.`, 1],
  [R`'<span class="tag warn">Sahip kararı</span>'`, R`'<span class="tag warn">Onay bekliyor</span>'`, 1],
];

// packages/D01.json lists spec test names verbatim; the two renamed tests are renamed there too (same strings as the spec).
const PKG = [
  [R`"Bekleme yabancıyı durdurur, sahibin yeni kodunu durdurmaz"`, R`"Bekleme yabancıyı durdurur, gerçek kullanıcının yeni kodunu durdurmaz"`, 1],
  [R`"Başvuru sahibi onaydan önce silebilir"`, R`"Başvuran onaydan önce silebilir"`, 1],
];

const errs = [];
const apply = (file, pairs) => {
  const p = path.join(B, file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [a, b, n] of pairs) {
    const got = s.split(a).length - 1;
    if (got !== n) { errs.push(`${file}: expected ${n} got ${got}: ${a.slice(0, 80)}`); continue; }
    if (/[–—]/.test(b)) errs.push(`${file}: dash in replacement ${b.slice(0, 60)}`);
    s = s.split(a).join(b);
  }
  const left = (s.match(/sahi[pb][a-zçğıöşü]*/gi) || []);
  return { p, s, left };
};
const g = apply('d01work/gen.js', GEN);
const k = apply('packages/D01.json', PKG);
const total = [...GEN, ...PKG].reduce((t, [, , n]) => t + n, 0);
console.log('pairs', GEN.length + PKG.length, 'occurrences', total, '| left in gen.js', g.left.length, g.left.join(','), '| left in packages', k.left.length);
if (errs.length) { console.log('ERRORS\n' + errs.join('\n')); process.exit(1); }
if (!dry) { fs.writeFileSync(g.p, g.s, 'utf8'); fs.writeFileSync(k.p, k.s, 'utf8'); console.log('written'); }

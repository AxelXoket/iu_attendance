// Rewrites the prose in build-contracts.js that used the "sahip" stem; every pair must match at least once.
// Backs up to bak-sahip/build-contracts.prose.js. Usage: node clean-contracts.js
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, 'build-contracts.js');
const P = [
  ['öğe sahibinin dış yüzünde', 'öğe türünün modülünün dış yüzünde'],
  ['sütundur; sahibi yazar.', 'sütundur; o tablonun modülü yazar.'],
  ['altında sahibi modülündür', 'altında işi kuran modülündür'],
  ['sütunu her tablonun sahibi ekler', 'sütunu her tablonun modülü ekler'],
  ['gövde şeması öğe türünün sahibinde', 'gövde şeması öğe türünün modülünde'],
  ['Yeniden deneme istenirse sahibin kararı.', 'Yeniden deneme ürün kararıdır ve onay bekler.'],
  ['ders açılışı: sahiplik, birim', 'ders açılışı: dersin hocası, birim'],
  ['işlemin sahibi (D02 üretimi', 'işlemi açan modül (D02 üretimi'],
  ['damgayı işleme bağlar, işlemin sahibi son adımda', 'damgayı işleme bağlar, işlemi açan modül son adımda'],
  ['(göç sahiplik denetiminin tek istisnası)', '(göçlerin tablo denetiminin tek istisnası)'],
  ['bir tabloya yalnız sahibi yazar', 'bir tabloya yalnız o tablonun modülü yazar'],
  ['değiştirmek için sahibinin index.ts dış yüzünü', 'değiştirmek için o modülün index.ts dış yüzünü'],
  ['Sütun gereken modül sahibinden ister; sütunu sahip ekler, sahip yazar, isteyen', 'Sütun gereken modül tablonun modülünden ister; sütunu o modül ekler ve yazar, isteyen'],
  ['Uç yolu sahibinin önekiyle başlar', 'Uç yolu kendi modülünün önekiyle başlar'],
  ['neden değerlerinin yazımı sahibinin sözleşme sabitindedir', 'neden değerlerinin yazımı tanımlayan modülün sözleşme sabitindedir'],
  ['iş kuralı öğe türünün sahibindedir.', 'iş kuralı öğe türünün modülündedir.'],
  ['saf fonksiyondur, sahibi modüldür;', 'saf fonksiyondur ve o modülündür;'],
  ['Paylaşılan tek dosyaların tek sahibi vardır:', 'Paylaşılan tek dosyaları tek modül yazar:'],
  ['değişecekse değişikliği sahibi yapar', 'değişecekse değişikliği o modül yapar'],
  ['Her uç sahibinin önekiyle başlar', 'Her uç kendi modülünün önekiyle başlar'],
  ['Uçun sahibi yolun ikinci bölümünden okunur', 'Ucun modülü yolun ikinci bölümünden okunur'],
  ['Öğe türleri ve sahipleri:', 'Öğe türleri ve modülleri:'],
  ['sütun düzeyinde sahiplik demekti', 'sütun düzeyinde yazma yetkisi demekti'],
  ['envanterlerinde birbirine sahip gösterilmişti', 'envanterlerinin ikisinde de görünüyordu'],
  ['sahip, işin yazdığı tablonun sahibi seçildi', 'iş, yazdığı tablonun modülüne verildi'],
  ['yeniden deneme istenirse karar sahibindir.', 'yeniden deneme ürün kararıdır ve onay bekler.'],
  ['Her paylaşılan dosyanın tek sahibi olunca', 'Her paylaşılan dosyayı tek modül yazınca'],
  ['işlemin sahibi son adımda D06.surumAl', 'işlemi açan modül son adımda D06.surumAl'],
  ['CI göç denetiminin sahibi D12dir', 'CI göç denetimi D12nindir'],
  ['işlemin sahibi surumAl', 'işlemi açan modül surumAl'],
  ['Saatin sahibi işin sahibidir, D14 çizelgesi aynen kopyalar.', 'Saati işi kuran modül belirler, D14 çizelgesi aynen kopyalar.'],
  ['Üçü ürün kararı değildir ve sahibe sorulmaz:', 'Üçü ürün kararı değildir, onay beklemez:'],
];
const raw = fs.readFileSync(F, 'utf8');
let s = raw;
const miss = [];
for (const [a, b] of P) { if (!s.includes(a)) miss.push(a); s = s.split(a).join(b); }
if (miss.length) { console.log('STOP, not found:\n' + miss.join('\n')); process.exit(1); }
fs.mkdirSync(path.join(__dirname, 'bak-sahip'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'bak-sahip', 'build-contracts.prose.js'), raw);
fs.writeFileSync(F, s);
const left = (s.match(/.{0,40}sahi[pb].{0,30}/gi) || []);
console.log('rewrote ' + P.length + ' phrases; left: ' + left.length + (left.length ? '\n' + left.join('\n') : ''));

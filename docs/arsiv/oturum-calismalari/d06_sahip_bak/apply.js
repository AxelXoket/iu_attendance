// Applies the D06 "sahip" prose rewrites to the generator sources and packages/D06.json. Each old string must occur exactly once.
const fs = require('fs'), path = require('path');
const B = process.argv[2];
const W = path.join(B, 'd06_spec_work');
const R = {
  [path.join(W, 'build.js')]: [
    ["['Sahip olduğu', ", "['Yazdığı tablolar', "],
    ["(öğe sahipleri)", "(öğe türlerinin modülleri)"],
    ["Sahiplerin öğe kodları kendi sözleşmelerindedir.", "Öğe türlerinin modüllerine ait öğe kodları o modüllerin sözleşmelerindedir."],
    ["tag('sahibin kararı', 'warn')", "tag('onay bekliyor', 'warn')"],
  ],
  [path.join(W, 'veri-1.js')]: [
    ["her öğeyi türünün sahibine aynı veritabanı işleminde dağıtır", "her öğeyi türünün modülüne aynı veritabanı işleminde dağıtır"],
    ["indirme kaynakları sahip modüllerin eklentisinde", "indirme kaynakları sorumlu modüllerin eklentisinde"],
    ["içerik öğe sahibinin tablosundadır.", "içerik öğe türünün modülünün tablosundadır."],
    ["ESITLEME_ önekli ya da öğe sahibinin kodu.", "ESITLEME_ önekli ya da öğe türünün modülünün kodu."],
    ["ZATEN_VAR'da sahibin sakladığı ilk ulaşma). Cevabın", "ZATEN_VAR'da öğe türünün modülünün sakladığı ilk ulaşma). Cevabın"],
    ["her sıra defterde bir satıra sahip;", "her sıranın defterde bir satırı var;"],
    ["ham metin, sahibi ayrıştırır)", "ham metin, öğe türünün modülü ayrıştırır)"],
    ["(şeması öğe türünün sahibinin sözleşmesinde)", "(şeması öğe türünün modülünün sözleşmesinde)"],
    ["Rol başına sütunlar kaynağın sahibinin sözleşmesinde", "Rol başına sütunlar kaynağı kaydeden modülün sözleşmesinde"],
  ],
  [path.join(W, 'veri-2.js')]: [
    ["Öğe ilk kez geldi, sahibi kabul edip sakladı.", "Öğe ilk kez geldi, öğe türünün modülü kabul edip sakladı."],
    ["kabul_ani sahibin sakladığı ilk ulaşma anıdır.", "kabul_ani öğe türünün modülünün sakladığı ilk ulaşma anıdır."],
    ["ya da sahip öğeyi saklamadan reddetti", "ya da öğe türünün modülü öğeyi saklamadan reddetti"],
    ["ya da sahibin geçici gerekçesi", "ya da öğe türünün modülünün geçici gerekçesi"],
    ["ne öğe sahiplerinin tablolarında", "ne öğeleri saklayan modüllerin tablolarında"],
    ["damgalı işlemin sahibi son adımda", "damgalı işlemi kuran modül son adımda"],
    ["\"İşlemin sahibi, telefona inen satırlarını", "\"İşlemi kuran modül, telefona inen satırlarını"],
    ["Gönderimde sahibi D06'dır:", "Gönderimde işlemi kuran modül D06'dır:"],
    ["işleme bağlanır, işlemin sahibi son adımda surumAl'ı çağırınca", "işleme bağlanır, işlemi kuran modül son adımda surumAl'ı çağırınca"],
    ["\"Öğe türünün sahibi eklentisi yüklenirken", "\"Öğe türünün modülü eklentisi yüklenirken"],
    ["Sahipler ve işleyici biçimleri Başka modüllerden beklenenler", "Bu modüller ve işleyici biçimleri Başka modüllerden beklenenler"],
    ["personel kapsam kaynağını D02 (ders sahipliği) kaydeder", "personel kapsam kaynağını D02 (dersin hocası) kaydeder"],
    ["her öğe sahibinin tablosunda tam bir kez; öğe başına", "her öğe kendi modülünün tablosunda tam bir kez; öğe başına"],
    ["sahibin tablosunda tek öğe kalır", "öğe türünün modülünün tablosunda tek öğe kalır"],
    ["makbuz anı sahibin sakladığı ilk ulaşmadır.", "makbuz anı öğe türünün modülünün sakladığı ilk ulaşmadır."],
    ["oturum satırı sahibinin rol listesindeki", "oturum satırı D02'nin rol listesindeki"],
    ["her makbuzlu kayıt sahibinin tablosunda tam bir kez", "her makbuzlu kayıt kendi modülünün tablosunda tam bir kez"],
    ["öğeler sahiplerine dağıtılır", "öğeler türlerinin modüllerine dağıtılır"],
    ["ULASTI olan her öğe sahibinin tablosunda tam bir kez, defterde", "ULASTI olan her öğe kendi modülünün tablosunda tam bir kez, defterde"],
    ["Sahip modüller kendi testlerinde çağırır.", "Kaynağı kaydeden modüller kendi testlerinde çağırır."],
    ["öğe ve kaynak sahiplerini içe aktarmaz", "öğe türlerini ve kaynakları kaydeden modülleri içe aktarmaz"],
  ],
  [path.join(W, 'veri-3.js')]: [
    ["ZATEN_VAR'da sahibin sakladığı ilk ulaşma, ör. hocanın", "ZATEN_VAR'da öğe türünün modülünün sakladığı ilk ulaşma, ör. hocanın"],
    ["ZATEN_VAR sahibin güncel ayrıntısını (yoklamada karar) da döner.", "ZATEN_VAR öğe türünün modülündeki güncel ayrıntıyı (yoklamada karar) da döner."],
    ["ayrinti şeması öğe türünün sahibinin sözleşmesindedir.", "ayrinti şeması öğe türünün modülünün sözleşmesindedir."],
    ["gördüğü an kaydın sahibindeki anla aynıdır", "gördüğü an kaydın kendi modülünde saklanan anla aynıdır"],
    ["öğrencinin ekranını değiştirdiği için sahibin kararına bırakıldı: açık nokta D06-A01.", "öğrencinin ekranını değiştirdiği için ürün kararı olarak onaya bırakıldı: açık nokta D06-A01."],
    ["sahiplerin geçici gerekçeleri kendi kodlarıyla", "öğe türü modüllerinin geçici gerekçeleri kendi kodlarıyla"],
    ["personel işi yalnız sahibinin oturumuyla işlenir", "personel işi yalnız ait olduğu hesabın oturumuyla işlenir"],
    ["ders sahipliği ve sahip atama sürümü", "dersin hocası ve hoca atama sürümü"],
    ["kişinin ders sahipliğinde herhangi bir değişiklik", "kişinin hocası olduğu derslerde herhangi bir değişiklik"],
    ["Satır ve sütun süzgeci kaynağın sahibinin rol başına sütun listesidir", "Satır ve sütun süzgeci kaynağı kaydeden modülün rol başına sütun listesidir"],
    ["ile damgayı işleme bağlar; işlemin sahibi son adımda surumAl(tx)'ı", "ile damgayı işleme bağlar; işlemi kuran modül son adımda surumAl(tx)'ı"],
    ["Gönderimde sahibi D06'dır:", "Gönderimde işlemi kuran modül D06'dır:"],
    ["Üretimde sahibi D02'dir:", "Üretimde işlemi kuran modül D02'dir:"],
    ["Silmeden sonra gelen öğelerin sonucu sahiplerinindir (D12-B18)", "Silmeden sonra gelen öğelerin sonucunu öğe türlerinin modülleri verir (D12-B18)"],
  ],
  [path.join(W, 'veri-4.js')]: [
    ["\"Öğe sahipleri: ogeTuruKaydet ile kaydolur", "\"Öğe türü modülleri: ogeTuruKaydet ile kaydolur"],
    ["Satırlarını başka işlemlerle paylaşan sahip kilitAnahtarlari", "Satırlarını başka işlemlerle paylaşan modül kilitAnahtarlari"],
    ["ders sahipliği ve sahip atama sürümü", "dersin hocası ve hoca atama sürümü"],
    ["üretim işleminde sürümün sahibidir:", "üretim işleminde sürümden sorumludur:"],
    ["işlemin sonuna bırakılır, işlemin sahibi surumAl'ı en son", "işlemin sonuna bırakılır, işlemi kuran modül surumAl'ı en son"],
    ["öğrenciye inen sütunlar sahibinin rol listesindedir", "öğrenciye inen sütunlar modülün kendi rol listesindedir"],
    ["damgayı işleme bağlar; işlemin sahibi son adımda surumAl'ı bir kez çağırır, sayaç", "damgayı işleme bağlar; işlemi kuran modül son adımda surumAl'ı bir kez çağırır, sayaç"],
    ["Gönderimde sahibi D06 (baglam.surumlaDamgala kısayolu), üretimde D02'dir", "Gönderimde işlemi kuran modül D06 (baglam.surumlaDamgala kısayolu), üretimde D02'dir"],
    ["öğe sahiplerinin satırları, öğrenci durum onayı", "öğe türü modüllerinin satırları, öğrenci durum onayı"],
    ["(3) sahiplerin iş kuyruğu", "(3) öğe türü modüllerinin iş kuyruğu"],
    ["// ham metin, aynen; sahibi ayrıştırır", "// ham metin, aynen; öğe türünün modülü ayrıştırır"],
    ["// ZATEN_VAR: sahibin sakladığı ilk ulaşma", "// ZATEN_VAR: öğe türünün modülünün sakladığı ilk ulaşma"],
  ],
  [path.join(B, 'packages', 'D06.json')]: [
    ["sahip modüller kendi kaynak testlerinde çağırır", "kaynağı kaydeden modüller kendi kaynak testlerinde çağırır"],
    ["ULASTI olan her öğenin sahibinin tablosunda tam bir kez olduğunu", "ULASTI olan her öğenin kendi modülünün tablosunda tam bir kez olduğunu"],
  ],
};
// Pass 1: verify every pair before writing anything.
let errs = 0, done = 0;
const yeni = {};
for (const [f, pairs] of Object.entries(R)) {
  let s = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log(`COUNT ${n}: ${path.basename(f)}: ${a}`); errs++; continue; }
    if (/[–—]/.test(b) || /sahi[pb]/i.test(b)) { console.log('BAD replacement: ' + b); errs++; continue; }
    s = s.replace(a, () => b); done++;
  }
  yeni[f] = s;
}
if (errs) { console.log('ERRORS ' + errs + ', nothing written'); process.exit(1); }
for (const [f, s] of Object.entries(yeni)) fs.writeFileSync(f, s, 'utf8');
console.log('applied ' + done);

// One-shot wording edit of D04work/build.js: removes every "sahip" stem from D04 prose.
// Each pair must match the exact count given, otherwise nothing is written.
// Usage: node edit-build.js <path to build.js>
'use strict';
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const R = [
  // [old, new, expected count]
  ["surumAl'ı işlemin sahibi (D02, D06) çağırır", "surumAl'ı işlemi açan modül (D02, D06) çağırır", 1],
  ["UPDATE ve DELETE sahibin (yoklama_goc) göçünde geri alınır", "UPDATE ve DELETE, şemayı kuran yoklama_goc rolünün göçünde geri alınır", 1],
  ["üç parametre: 'sahip' ya da 'yonetici'", "üç parametre: 'hoca' (dersin hocası) ya da 'yonetici'", 1],
  ["dersId) 'sahip' ya da kişi dersin önceki sahibi (", "dersId) 'hoca' ya da kişi dersin önceki hocası (", 1],
  ["{ sahip: 'saat' }", "{ modul: 'saat' }", 4],
  ["İşlemin sahibi D04'tür: parti işleminin son adımında", "İşlemi D04 açar: parti işleminin son adımında", 1],
  ["Parti işleminin sahibi D04'tür: son adımda", "Parti işlemini D04 açar: son adımda", 1],
  ["gönderen dersin sahibi ya da önceki sahibi değil", "gönderen dersin hocası ya da önceki hocası değil", 1],
  ["surumAl'ı işlemin sahibi bir kez çağırır:", "surumAl'ı işlemi açan modül bir kez çağırır:", 1],
  ["Biçimin tek sahibi D04'tür (I030)", "Biçimi yalnız D04 tanımlar (I030)", 1],
  ["işin parti işleminin sahibi D04'tür ve son adımda", "işin parti işlemini D04 açar ve son adımda", 1],
  ["surumAl çağırmaz; parti işleminin sahibi D04'tür ve son adımda", "surumAl çağırmaz; parti işlemini D04 açar ve son adımda", 1],
  ["İşlemin sahibi D06'dır (gönderim)", "İşlemi D06 açar (gönderim)", 1],
  ["'Yetki: sahip, önceki sahip, yönetici'", "'Yetki: dersin hocası, önceki hoca, yönetici'", 1],
  ["Dersin sahibinin öğesi KABUL; devirden önce basılıp devirden sonra ulaşan önceki sahibin öğesi KABUL", "Dersin hocasının öğesi KABUL; devirden önce basılıp devirden sonra ulaşan önceki hocanın öğesi KABUL", 1],
  ["TUM_OGE_TURLERI'nde sahip saat ile durur", "TUM_OGE_TURLERI'nde saat modülüyle durur", 1],
  ["asserts: \"Dersin sahibi 200 ve", "asserts: \"Dersin hocası 200 ve", 1],
  ["Sahibin onayı D04-A07 açık noktasında; tasarım bu öneriyle sürer.", "Kural onay bekliyor (Açık noktalar, D04-A07); tasarım bu öneriyle sürer.", 1],
  ["Ürün sorusu D07-A03'te sahibe sunuldu;", "Ürün sorusu D07-A03 açık noktasında onay bekliyor;", 1],
  ["kuralının ürün yönü D04-A02 ile sahibe sunuldu.", "kuralının ürün yönü D04-A02 açık noktasında onay bekliyor.", 1],
  ["Bu bir ürün kararı değildir, sahibe sorulmaz (mimar kararı A4", "Bu bir ürün kararı değildir, onay beklemez (mimar kararı A4", 1],
  ["İncelemede mi) D07-A03'te sahibe sunuldu.", "İncelemede mi) D07-A03 açık noktasında onay bekliyor.", 1],
  ["zaman damgası, tablo sahipliği, generate farksızlığı", "zaman damgası, göçün yalnız kendi modülünün tablolarına dokunması, generate farksızlığı", 1],
  ["Kapandı (A4, ACCEPT): ürün kararı değildir, sahibe sorulmaz.", "Kapandı (A4, ACCEPT): ürün kararı değildir, onay beklemez.", 1],
  ["damgayı işleme bağlar; işlemin sahibi son adımda", "damgayı işleme bağlar; işlemi açan modül son adımda", 1],
  ["D04'ün sahibi olduğu işlemlerde (", "D04'ün açtığı işlemlerde (", 1],
  ["Sahiplik işlemi kimin açtığına göre tek anlamlıdır", "Sürümü hangi modülün alacağı, işlemi kimin açtığına göre tek anlamlıdır", 1],
  ["(D12-A03 sahipte)", "(D12-A03 onay bekliyor)", 1],
  ["bağlantı eklenmesi D04-A04'te sahibe önerildi.", "bağlantı eklenmesi önerildi; D04-A04 açık noktasında onay bekliyor.", 1],
  ["dersGetir (sahip, önceki sahipler, birim)", "dersGetir (dersin hocası, önceki hocalar, birim)", 1],
  ["(üç parametre; öğede yalnız sahip, GET ucunda yonetici de)", "(üç parametre; öğede yalnız hoca, GET ucunda yonetici de)", 1],
  ["${c('sahip')} dönerse", "${c('hoca')} dönerse", 1],
  ["'Gönderen dersin sahibi (D02.dersYetkisi sahip) ya da önceki sahibi değil;", "'Gönderen dersin hocası (D02.dersYetkisi hoca) ya da önceki hocası değil;", 1],
  ["const sahipli = ", "const kararBekleyen = ", 1],
  ["Sekiz boşluk sahibin kararını istiyor ve", "Sekiz boşluk karar bekliyor ve", 1],
  ["Sahibin kararını bekleyen D04 açık noktası ${sahipli};", "Karar bekleyen D04 açık noktası ${kararBekleyen};", 1],
  ["? 'sahibin kararı' : 'bütünleştirme'", "? 'onay bekliyor' : 'bütünleştirme'", 1],
];
let s = raw;
const bad = [];
for (const [a, b, n] of R) {
  const k = s.split(a).length - 1;
  if (k !== n) { bad.push(`expected ${n}, found ${k}: ${a}`); continue; }
  s = s.split(a).join(b);
}
if (bad.length) { console.log('NOT WRITTEN\n' + bad.join('\n')); process.exit(1); }
const left = [...s.matchAll(/.{0,60}sahi[pb][a-zçğıöşü]*.{0,40}/gi)].map(m => m[0]);
if (/[–—]/.test(s) && !/[–—]/.test(raw)) { console.log('NOT WRITTEN: introduced a dash'); process.exit(1); }
fs.writeFileSync(file, s);
console.log(`applied ${R.length} edits; sahip stems left in build.js: ${left.length}` + (left.length ? '\n  ' + left.join('\n  ') : ''));

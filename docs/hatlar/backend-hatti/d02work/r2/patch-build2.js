const fs = require('fs'), path = require('path');
const f = path.join(__dirname, 'build.js');
let s = fs.readFileSync(f, 'utf8');
const rep = (from, to) => { const n = s.split(from).length - 1; if (n !== 1) { console.log('tekil değil (' + n + '): ' + from.slice(0, 80)); process.exit(1); } s = s.replace(from, () => to); };
rep("surum ve silindi taşır (teknik.html#kod-veri-modeli); şube dizisi ders satırıyla, şube kümeleri program saati ve oturum satırıyla iner. Adlar D12-B01 kalıbında; kimlik varsayılanı açıkça uuidv7() (teknik.html#veritabani); kod listeleri metin ve CHECK;",
    "surum taşır (DEFAULT 0, işlemin tek sürümüyle damgalanır); telefona inen silindi, silinme_ani, pasif_ani ve arsiv_ani sütunlarından türer, sabit false sütun yoktur (teknik.html#kod-veri-modeli, D12-B16); şube dizisi ders satırıyla, şube kümeleri program saati ve oturum satırıyla iner. Her kısıt, dizin ve tetikleyici adı kisitAdi(tablo, sütunlar, tür) ile (D12-B01; 63 baytı aşanlar kisitAdi çağrısı olarak yazıldı); kimlik varsayılanı açıkça uuidv7() (teknik.html#veritabani); an sütunları timestamptz(3); kod listeleri metin ve CHECK;");
rep("Üç iş, işleyicileri apps/server/src/jobs/dersler/ altında; worker.ts toplar, D14.isTanimla kaydeder.",
    "Üç iş, işleyicileri apps/server/src/jobs/dersler/ altında; tanımlar export const isler dizisinde D14.isTanimla ile, worker.ts toplar. Zamanlamalar D14-B05\'e uyar: günlük işler 03:00 ile 05:00 arasında başlamaz, aralarında en az 5 dakika vardır, missed: once (donem_kilidi 00:05, deneme_dersi_oturumlari 00:35, takvim gece onarımı 01:55); sözleşme testi isler dizisini D14\'ün çizelge doğrulayıcısından geçirir.");
fs.writeFileSync(f, s, 'utf8'); console.log('ok');

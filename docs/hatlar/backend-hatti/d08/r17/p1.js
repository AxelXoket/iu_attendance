// Small exact-once replacements in build-d08.js (align round). Each pair must match exactly once.
// Written with template literals: a literal backslash-quote in the build source is written \\' here.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 80)); s = s.replace(a, () => b); };
rep(`'Birleşen işlerin neden kodları: KAYIT, KARAR, DUZELTME, SORUN_BILDIRIMI, LISTE, MUAF, ORAN, PROGRAM, YAPILDI, OTURUM_KAPANDI, KILIT, TUTARLILIK, KURAL.'`,
    `'Birleşen işlerin neden kodları, DEVAM_NEDENLERI sabitinden (packages/contracts/src/devam.ts; D02, D03, D05 ve D09 da buradan içe aktarır): KAYIT, KARAR, DUZELTME, SORUN_BILDIRIMI, LISTE, MUAF, ORAN, PROGRAM, YAPILDI, OTURUM_KAPANDI, KILIT, TUTARLILIK, KURAL.'`);
rep(`'KAYIT, DUZELTME, SORUN_BILDIRIMI, LISTE_SATIRI, OTURUM ya da DERS; birleşen işlerde ilki.'`,
    `'DEVAM_TETIKLEYEN_TURLERI: KAYIT, DUZELTME, SORUN_BILDIRIMI, LISTE_SATIRI, OTURUM ya da DERS; birleşen işlerde ilki.'`);
rep(`'Tetikleyen kayıtsa kaydın dönemi ((donem_id, kayit_id) çifti kuralı).'`,
    `'Tetikleyen kayıtsa kaydın dönemi ((donem_id, kayit_id) çifti kuralı), liste satırıysa satırın dönemi (D03 liste dinleyicisi verir: { tur: LISTE_SATIRI, id: satirId, donemId }).'`);
rep(`AND (tetikleyen_donem_id IS NULL OR tetikleyen_tur = 'KAYIT'))"`, `AND (tetikleyen_donem_id IS NULL OR tetikleyen_tur IN ('KAYIT', 'LISTE_SATIRI')))"`);
rep(`'D09\\'un sonDurum değeri (VAR, YOK, GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI) ya da muaf öğrencide MUAF; kararı açık ve düzeltmesiz oturumda boş.'`,
    `'DEVAM_SON_DURUMLARI değeri: D09\\'un sonDurum değeri (SON_DURUMLAR: VAR, YOK, GOREVLI, BELGELI_DUZELTME, ELLE_EKLENDI) ya da muaf öğrencide MUAF; kararı açık ve düzeltmesiz oturumda boş. CHECK listesi DEVAM_SON_DURUMLARI\\'ndan tabloYardimcilari.durumKisiti ile kurulur (elle yazılmaz).'`);
fs.writeFileSync(f, s);
console.log('p1 ok');

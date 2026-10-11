// Review fixes for build-d08.js (round 3). Each replacement must match exactly once.
const fs = require('fs');
const f = __dirname + '/build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('MATCH COUNT ' + n + ' FOR:', a.slice(0, 100)); process.exit(1); }
  s = s.replace(a, () => b);
};
rep('tetikleyen?: { tur, id, donemId? }, istekKimligi? }.',
  'tetikleyen?: { tur, id, donemId? } }; kaynak istek kimliğini D14.isGonder ekler (D13-B04), yaprak işlev isteği görmez.');
rep("sunucuda bildirim işi yok.'],",
  "sunucuda bildirim işi yok. AKSİS\\'e bağlanmaz ({plan:tek-bakista|hoca elle girer}); rapor türü, tarihi ve sağlık bilgisi tutmaz ({plan:devam|Rapor ve izin}); yıllık ders ve anabilim dalı bazında uygulama hesabı (Md.19/2) ilk sürümde yok ({plan:teknoloji-sunucu-yeri|Birimlere genişleme}).'],");
fs.writeFileSync(f, s);
console.log('patched ok');

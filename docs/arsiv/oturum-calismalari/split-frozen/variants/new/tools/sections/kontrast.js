// Section 'Kontrast' (#kontrast): every foreground and background pair of the tokens, measured by tcheck.js
// (contrast.html is its output). Owner: F1a.
const { CHK, rd } = require('../lib/inputs');
const { doc, PLAN } = require('../lib/format');
const { section, sub } = require('../lib/section');

function kontrast() {
  const contrastRows = CHK.contrast.length;
  return section('kontrast', 'Tokenların tanımladığı her ön plan ve arka plan çifti tcheck.js ile ölçüldü; sayfadaki tablo betiğin çıktısıdır. Hedef WCAG 2.2 AA kararı ' + doc(PLAN, 'hoca', 'plan.html#hoca') + ' içindedir.',
    sub('Ölçülen çiftler', contrastRows + ' çift · tcheck.js PASS', '<p class="body" style="margin-bottom:16px">Yazı en az 4,5:1, arayüz öğesi ve odak en az 3:1 (WCAG 2.2, 1.4.3 ve 1.4.11). Süs çizgileri ve devre dışı öğeler "süs" türünde, eşiksiz gösterildi. Oran yuvarlanmadan karşılaştırılır.</p><div class="contrast-wrap" tabindex="0" role="region" aria-label="Kontrast tablosu">' + rd('contrast.html') + '</div>'));
}
kontrast.title = 'Kontrast';
module.exports = kontrast;

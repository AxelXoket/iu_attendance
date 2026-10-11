// Section 'Kaynaklar' (#kaynaklar), the page's own version: built only when doc/sections/kaynaklar.html is missing
// or unusable. Owner: F1a.
const { T, CHK } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { section } = require('../lib/section');

function kaynaklar() {
  const contrastRows = CHK.contrast.length;
  return section('kaynaklar', 'Her kararın araştırma dosyasındaki karşılığı. R kimlikleri tasarım araştırmasına, L kimlikleri kütüphane araştırmasına aittir; ikisi de depo dışında.',
    '<div class="scroll-x"><table class="tbl-doc"><thead><tr><th>Karar</th><th>Araştırma</th></tr></thead><tbody>' + Object.entries(T.sources).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td><span class="src-ids">' + v.map(x => '<code>' + x + '</code>').join('') + '</span></td></tr>').join('') + '</tbody></table></div>' +
    '<p class="help" style="margin-top:16px">Kontrolden geçen kapılar: tcheck.js (' + contrastRows + ' kontrast çifti, ' + CHK.cvd.length + ' durum karşılaştırması), dgate.js, shot.js (konsol hatası, taşma, hareket denetimi, köşe), coverage.js (gece mavisi payı).</p>');
}
kaynaklar.title = 'Kaynaklar';
module.exports = kaynaklar;

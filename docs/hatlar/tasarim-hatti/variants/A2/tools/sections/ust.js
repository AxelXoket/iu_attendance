// Header and hero (#ust): title, the source line and the measured unit chart of the home screen (coverage.json, never
// typed). The four key-fact tiles are gone (G3 #31): they repeated Özet and the sections a third time. Owner: F1b.
const { T } = require('../lib/inputs');
const { tr } = require('../lib/format');
const { covOf } = require('../lib/coverage');
const { ref, anchor } = require('../lib/section');
const homeCov = covOf('#scr-home');
// Color families of the measured home screen. 'zemin' counts every light neutral (L 0.94 and up): the white surface
// (neutral.1) as well as the off-white page (neutral.2), hence the label. Families at 0 percent get no swatch.
const KEYS = [['zemin', 'u-z', 'Beyaz ve kırık beyaz'], ['gri', 'u-g', 'Gri'], ['gece mavisi', 'u-m', 'Gece mavisi'], ['mor', 'u-v', 'Mor'], ['kırmızı', 'u-r', 'Kırmızı']];
const units = p => {
  const keys = KEYS.filter(([k]) => p[k] > 0);
  const raw = keys.map(([k]) => p[k]), base = raw.map(Math.floor);
  let left = 100 - base.reduce((a, c) => a + c, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, c) => c[0] - a[0]).forEach(([, i]) => { if (left > 0) { base[i]++; left--; } });
  const cells = keys.map(([, cls], i) => ('<i class="' + cls + '"></i>').repeat(base[i])).join('');
  return { cells, legend: keys.map(([k, cls, l]) => '<span><i class="' + cls + '"></i>' + l + ' <b>%' + tr(p[k]) + '</b></span>').join(''), label: keys.map(([k, , l]) => l.toLocaleLowerCase('tr-TR') + ' %' + tr(p[k])).join(', ') };
};
const U = homeCov ? units(homeCov) : null;
// The thesis line's numbers are the tokens' own: the largest radius and the spacing base with its rhythm step.
const RMAX = Math.max(...Object.values(T.shape.radius));

function ust() {
  return '<header class="cover" id="ust">' +
    '<h1>İÜ Yoklama</h1>' +
    '<p class="lead">Uygulamanın ve web panelinin görünüşü: renk, yazı, biçim, hareket ve bileşenler.</p>' +
    '<p class="meta"><span>Tasarım kararları</span><span>Son güncelleme 10 Ekim 2026</span><span>Plan: <a href="plan.html">plan.html</a></span><span>Teknik: <a href="teknik.html">teknik.html</a></span><span>Backend: <a href="backend/index.html">backend</a></span></p>' +
    '<p class="cover-note">Bu dosya görünüş ve etkileşim kararlarını ve onları kuran kütüphaneleri gerekçeleriyle anlatır (kütüphanelerin burada durması onay bekliyor: ' + anchor('acik', 'acik-kutuphane-yeri', 'Açık noktalar') + '); ürün kararları plan.html\'de, teknik ayrıntılar teknik.html\'dedir. Her bilgi tek yerde durur, öbür dosya bağlantı verir. R ve L ile başlayan kimlikler depo dışındaki tasarım araştırmasına aittir.</p>' +
    '<div class="cover-grid"><div>' +
    '<p class="thesis-lead">Kâğıt ve mürekkep.</p>' +
    '<p class="lead2">IBM Plex Sans, ' + RMAX + ' köşe, ince çizgi, ' + T.space.base + ' ve ' + 2 * T.space.base + ' ızgarası, kısa ve aşmasız hareket. Ekranların ve bileşenlerin her değeri ' + ref('tokenlar', 'Tokenlar') + ' bölümündeki tek dosyadan gelir; kontrast oranları ve gece mavisi payları ölçümle bulundu.</p></div>' +
    (U ? '<figure class="units"><div class="units-grid" role="img" aria-label="Öğrenci ana ekranı 100 kareye bölündü: ' + U.label + '">' + U.cells + '</div>' +
      '<figcaption><p class="units-t">Öğrenci ana ekranı, ölçülen</p><p class="units-leg">' + U.legend + '</p><p class="units-s">1 kare = ekranın %1\'i</p></figcaption></figure>' : '') +
    '</div>' +
    '</header>';
}
module.exports = ust;

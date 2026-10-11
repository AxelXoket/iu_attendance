// Header and hero (#ust): title, thesis, the measured unit chart of the home screen and four key facts. Owner: F1b.
const { T, C } = require('../lib/inputs');
const { tr, resolve, durOf } = require('../lib/format');
const { covOf } = require('../lib/coverage');
const homeCov = covOf('#scr-home');
const units = p => {
  const keys = [['zemin', 'u-z', 'Kırık beyaz'], ['gri', 'u-g', 'Gri'], ['gece mavisi', 'u-m', 'Gece mavisi'], ['mor', 'u-v', 'Mor'], ['kırmızı', 'u-r', 'Kırmızı']];
  const raw = keys.map(([k]) => p[k]), base = raw.map(Math.floor);
  let left = 100 - base.reduce((a, c) => a + c, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, c) => c[0] - a[0]).forEach(([, i]) => { if (left > 0) { base[i]++; left--; } });
  const cells = keys.map(([, cls], i) => ('<i class="' + cls + '"></i>').repeat(base[i])).join('');
  return { cells, legend: keys.map(([k, cls, l]) => '<span><i class="' + cls + '"></i>' + l + ' <b>%' + tr(p[k]) + '</b></span>').join('') };
};
const U = homeCov ? units(homeCov) : null;
const durMin = Math.min(...T.motion.duration.filter(d => d.ms > 0 && d.name !== 'imza').map(d => d.ms));
const durMax = Math.max(...T.motion.duration.filter(d => d.name !== 'imza').map(d => d.ms));

function ust() {
  return '<header class="cover" id="ust">' +
    '<h1>İÜ Yoklama</h1>' +
    '<p class="lead">Uygulamanın ve web panelinin görünüşü: renk, yazı, biçim, hareket ve bileşenler.</p>' +
    '<p class="meta">Tasarım kararları · Son güncelleme 6 Ekim 2026 · Plan: <a href="plan.html">plan.html</a> · Teknik ayrıntılar: <a href="teknik.html">teknik.html</a></p>' +
    '<p class="meta">Bu dosya görünüş ve etkileşim kararlarını ve bunları kuran kütüphaneleri gerekçeleriyle anlatır; ürün kararları plan.html\'de, teknik ayrıntılar teknik.html\'dedir. Her bilgi tek yerde durur, öbür dosya bağlantı verir. R ve L ile başlayan kimlikler depo dışındaki tasarım araştırmasına aittir.</p>' +
    '<div class="cover-grid"><div>' +
    '<p class="thesis-lead">Kâğıt ve mürekkep. Zemin kırık beyaz ve gri; gece mavisi yalnız bir karar verildiği yerde, mürekkep gibi görünür.</p>' +
    '<p class="lead2">IBM Plex Sans, 0 köşe, ince çizgi, 4 ve 8 ızgarası, kısa ve aşmasız hareket. Bu sayfadaki her renk, ölçü ve süre tokens.json dosyasından gelir; oranlar ve paylar betikle ölçüldü.</p></div>' +
    (U ? '<figure class="units"><div class="units-grid" role="img" aria-label="Öğrenci ana ekranı 100 kareye bölündü: kırık beyaz yüzde ' + tr(homeCov.zemin) + ', gri yüzde ' + tr(homeCov.gri) + ', gece mavisi yüzde ' + tr(homeCov['gece mavisi']) + '">' + U.cells + '</div>' +
      '<figcaption><p class="units-t">Öğrenci ana ekranı, ölçülen</p><p class="units-leg">' + U.legend + '</p><p class="units-s">1 kare = ekranın yüzde 1\'i · coverage.js</p></figcaption></figure>' : '') +
    '</div>' +
    '<div class="facts"><div class="fact"><p class="k">Zemin</p><p class="v">' + resolve('bg.page') + '</p><p class="s">neutral.2, kırık beyaz; b* ' + tr(C.hexToLab(resolve('bg.page')).b, 2) + '</p></div>' +
    '<div class="fact"><p class="k">Mürekkep</p><p class="v ink">' + resolve('accent.fill') + '</p><p class="s">accent.11; bütçe telefon %' + T.coverageBudget.phone + ', panel %' + T.coverageBudget.panel + '</p></div>' +
    '<div class="fact"><p class="k">Köşe</p><p class="v">0 px</p><p class="s">bütün bileşenler, ' + Object.keys(T.shape.radius).length + ' kalem</p></div>' +
    '<div class="fact"><p class="k">Hareket</p><p class="v">' + durMin + ' ile ' + durMax + ' ms</p><p class="s">tek imza anı ' + durOf('imza') + ' ms</p></div></div>' +
    '</header>';
}
module.exports = ust;

// Section 'Platform' (#platform), the page's own version: built only when doc/sections/platform.html is missing or
// unusable. Timings are not repeated here: every pattern's values are in Etkileşim tablosu. Owner: F1a.
const { esc, doc, PLAN } = require('../lib/format');
const { section, ref } = require('../lib/section');

const PLAT = [
  ['Alt sayfa', 'TrueSheet: UISheetPresentationController, cornerRadius 0, zemin bg.surface. Hareket sistemindir, sistemin hareketi azaltma ayarına uyar', 'TrueSheet: Material alt sayfası, cornerRadius 0. Hareket sistemindir', 'Diyalog ve yan panel (tokenlarla)'],
  ['Basma', 'onPressIn ve onPressOut, Reanimated CSS geçişi', 'Aynı; dalga efekti kapalı', ':active'],
  ['Hover', 'Yok; iPad imlecinde onHoverIn ve onHoverOut', 'Fareyle onHoverIn ve onHoverOut', 'Yalnız (hover: hover) and (pointer: fine)'],
  ['Odak', 'VoiceOver odağını sistem çizer; donanım klavyesinde 2 px halka', 'TalkBack odağını sistem çizer; klavyede 2 px halka', ':focus-visible, 2 px halka, 2 px boşluk'],
  ['Geri', 'Kenardan kaydırma, sistemin ekran geçişi', 'Sistem geri hareketi; açık sayfa ve diyalog önce kapanır', 'Tarayıcı geri; Escape açılır katmanı kapatır'],
  ['Hareket azaltma', 'Hareketi Azalt', 'Animasyonları kaldır: bütün süreler 0', 'prefers-reduced-motion']
];

function platform() {
  return section('platform', 'Aynı tokenlar üç yüzeyde. Sistemin çizdiği parçalar (izin pencereleri, klavye, tarih seçicinin açılan parçası, alt sayfa) olduğu gibi kabul edilir; köşeli ve opak olan bizim içerik katmanımızdır. Süreler ve eğriler ' + ref('etkilesim', 'Etkileşim tablosu') + ' içindedir; en düşük sürümler ' + doc(PLAN, 'dagitim-desteklenen-surumler', 'plan.html, Desteklenen sürümler') + ' içindedir.',
    '<div class="scroll-x"><table class="tbl-doc plat"><thead><tr><th>Konu</th><th>iOS</th><th>Android</th><th>Web paneli</th></tr></thead><tbody>' + PLAT.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
}
platform.title = 'Platform';
module.exports = platform;

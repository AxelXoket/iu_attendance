// Section 'Platform' (#platform), the page's own version: built only when doc/sections/platform.html is missing or
// unusable. Owner: F1a.
const { esc, durOf, doc, PLAN } = require('../lib/format');
const { section } = require('../lib/section');

const PLAT = [
  ['Alt sayfa', 'TrueSheet: UISheetPresentationController, cornerRadius 0, backgroundColor neutral.1 (iOS 26.1 ve üstünde cam kapanır)', 'TrueSheet: Material BottomSheet, cornerRadius 0', 'dialog ya da yan panel; ayrıntısı panel çalışmasında'],
  ['Basma', 'onPressIn anında 0,97 ölçek ve bir adım koyu ton, ' + durOf('mikro') + ' ms (Reanimated, UI iş parçacığı)', 'Aynı; dalga efekti kapalı', ':active 0,97 ölçek, renk ' + durOf('mikro') + ' ms'],
  ['Hover', 'Yok; iPad imlecinde sistem efekti', 'Yok', 'Yalnız (hover: hover) and (pointer: fine); renk girişte ' + durOf('hover') + ' ms, çıkışta ' + durOf('mikro') + ' ms'],
  ['Odak', 'VoiceOver odağı sistemin; donanım klavyesinde 2 px halka', 'TalkBack odağı sistemin; klavyede 2 px halka', ':focus-visible, 2 px halka, 2 px boşluk, geçişsiz'],
  ['Geri', 'Kenardan kaydırma, yerel yığın', 'predictiveBackGestureEnabled kapalı, sistem geri; açık sayfa ve diyalog önce kapanır', 'Tarayıcı geri; Escape açılır katmanı kapatır'],
  ['Haptik', 'notificationAsync(Success), kamera kapandıktan sonra', 'performAndroidHapticsAsync(Confirm); API 30 altında Long_Press yedeği', 'Yok'],
  ['Hareket azaltma', 'Reduce Motion: ReduceMotion.System ve canlı dinleyen kanca', 'Animasyonları kaldır: anında', 'prefers-reduced-motion: --mv 0, yalnız opaklık'],
  ['Sistem yüzeyleri', 'Liquid Glass sistem parçalarında kalır (uyarı, izin, klavye); içerik katmanı opak ve köşeli', 'Kenardan kenara; koyu durum çubuğu simgeleri (Android 7\'de sistem şeridi)', 'Yerel select ve tarih kutusunun açılan parçasını işletim sistemi çizer'],
  ['Yazı', 'Statik TTF, Dynamic Type açık, AX5\'te kesilme yok', 'Statik TTF, fontDefinitions, %200 ölçek', 'Değişken WOFF2, lang="tr", liga kapalı']
];

function platform() {
  return section('platform', 'Aynı tokenlar üç yüzeyde. Sistemin çizdiği parçalar (izin pencereleri, klavye, tarih seçicinin açılan parçası) olduğu gibi kabul edilir; köşeli ve opak olan bizim içerik katmanımızdır. En düşük sürümler ' + doc(PLAN, 'dagitim-desteklenen-surumler', 'plan.html#dagitim-desteklenen-surumler') + ' içindedir.',
    '<div class="scroll-x"><table class="tbl-doc plat"><thead><tr><th>Konu</th><th>iOS</th><th>Android</th><th>Web paneli</th></tr></thead><tbody>' + PLAT.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
}
platform.title = 'Platform';
module.exports = platform;

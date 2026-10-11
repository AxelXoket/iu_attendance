// The student's home screen ('Bugün'), drawn live in Telefon ekranları. The data-xr numbers are the usage-map roles the
// Röntgen switch pins (Gece mavisi nerede links to it). Owner: F1b.
const { I } = require('../lib/icons');
const { statusBar, tabbar } = require('../lib/phone');
const { lvl } = require('./level');
// Veri Yapıları meets 10:00 ile 11:50, two theory hours. Rights are counted in class hours (plan.html#devam, Sayım), so
// the remaining right is written with its unit. Level 2 starts when the remaining rights do not exceed the next session's
// hours of that type; the "devamsız kalırsın" variant applies only below them (plan.html#devam-uyari-seviyeleri), so
// 2 hours left with a 2-hour session shows the standard level-2 sentence.
function homeScreen() {
  return '<div class="ph" id="ph-home">' + statusBar() +
    '<div class="ph-top"><p class="ph-date">6 Ekim 2026 Salı</p><h4 class="ph-title">Bugün</h4></div>' +
    '<div class="ph-scroll">' +
    '<div class="ph-card now">' +
    '<div class="now-top"><span class="code">BİL 301</span><span>Teori</span><span class="room">' + I('meeting_room', 16) + 'D-204</span></div>' +
    '<p class="now-name">Veri Yapıları</p><p class="now-time">10:00 ile 11:50 · Dr. Öğr. Üyesi S. Aksoy</p>' +
    '<div class="now-win"><p class="now-state">' + I('timer', 20) + 'Yoklama açık</p>' +
    '<p class="now-fig"><span class="n num" data-countdown="702" data-total="900" aria-label="11 dakika 42 saniye kaldı">11:42</span><span class="u">kaldı</span></p></div>' +
    '<div class="prog" data-xr="8" role="progressbar" aria-label="Yoklama penceresinin kalan süresi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="78"><span style="transform:scaleX(0.78)"></span></div>' +
    '<button class="btn btn-primary btn-lg btn-block" type="button" data-xr="1">' + I('check', 24) + 'Yoklamamı ver</button>' +
    '</div>' +
    '<div class="ph-sec"><span>Hakların</span><button class="btn btn-ghost btn-sm" type="button">Tümü</button></div>' +
    '<div class="rights">' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Veri Yapıları</p><p class="right-s">Teori · 2 saat hakkın kaldı</p></div>' + lvl(2) + '</div><p class="right-w" style="' + lvl.ink(2) + '">' + I('warning', 16) + 'Bir ders daha kaçırırsan hakkın biter.</p></div>' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Fizik II</p><p class="right-s">Uygulama · 3 saat hakkın kaldı</p></div>' + lvl(1) + '</div><p class="right-w" style="' + lvl.ink(1) + '">' + I('info', 16) + 'Hakkının yarısını kullandın.</p></div>' +
    '</div></div>' +
    tabbar('Bugün', true) +
    '</div>';
}
module.exports = { homeScreen };

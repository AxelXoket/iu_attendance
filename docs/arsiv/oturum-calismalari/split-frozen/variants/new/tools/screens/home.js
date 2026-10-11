// The student's home screen ('Bugün'): drawn live in Telefon ekranları, and with numbered role pins (map = true) in the
// role map of Gece mavisi nerede. Owner: F1b.
const { I } = require('../lib/icons');
const { statusBar, tabbar } = require('../lib/phone');
const { lvl } = require('./level');
function homeScreen(map) {
  const P = (n, st) => (map ? '<span class="pin" style="' + st + '" aria-hidden="true">' + n + '</span>' : '');
  const X = n => (map ? '' : ' data-xr="' + n + '"');
  return '<div class="ph" id="ph-home' + (map ? '-map' : '') + '">' + statusBar() +
    '<div class="ph-top"><p class="ph-date">6 Ekim 2026 Salı</p><h4 class="ph-title">Bugün</h4></div>' +
    '<div class="ph-scroll">' +
    '<div class="ph-card now">' +
    '<div class="now-top"><span class="code">BİL 301</span><span>Teori</span><span class="room">' + I('meeting_room', 16) + 'D-204</span></div>' +
    '<p class="now-name">Veri Yapıları</p><p class="now-time">10:00 ile 11:50 · Dr. Öğr. Üyesi S. Aksoy</p>' +
    '<div class="now-win"><p class="now-state">' + I('timer', 20) + 'Yoklama açık</p>' +
    '<p class="now-fig"><span class="n num"' + (map ? '' : ' data-countdown="702" data-total="900"') + ' aria-label="11 dakika 42 saniye kaldı">11:42</span><span class="u">kaldı</span></p></div>' +
    '<div class="pinwrap">' + P(8, 'right:-10px;top:-8px') + '<div class="prog"' + X(8) + ' role="progressbar" aria-label="Yoklama penceresinin kalan süresi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="78"><span style="transform:scaleX(0.78)"></span></div></div>' +
    '<div class="pinwrap">' + P(1, 'left:-10px;top:-10px') + '<button class="btn btn-primary btn-lg btn-block" type="button"' + X(1) + '>' + I('check', 24) + 'Yoklamamı ver</button></div>' +
    '</div>' +
    '<div class="ph-sec"><span>Hakların</span><span class="pinwrap">' + P(2, 'left:-26px;top:4px') + '<button class="btn btn-ghost btn-sm" type="button"' + (map ? ' data-state="focus"' : '') + '>Tümü</button></span></div>' +
    '<div class="rights">' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Veri Yapıları</p><p class="right-s">Teori · 1 hak kaldı</p></div>' + lvl(2, 'st-warn') + '</div><p class="right-w st-warn">' + I('warning', 16) + 'Bir ders daha kaçırırsan hakkın biter.</p></div>' +
    '<div class="right"><div class="right-top"><div><p class="right-t">Fizik II</p><p class="right-s">Uygulama · 3 hak kaldı</p></div>' + lvl(1, 'st-info') + '</div><p class="right-w st-info">' + I('info', 16) + 'Hakkının yarısını kullandın.</p></div>' +
    '</div></div>' +
    tabbar('Bugün', !map).replace('<button class="ph-tab" type="button" aria-current="page">', '<button class="ph-tab pinwrap" type="button" aria-current="page">' + P(4, 'left:calc(50% + 22px);top:-12px')) +
    '</div>';
}
module.exports = { homeScreen };

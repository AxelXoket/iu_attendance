// Phone drawing kit shared by every drawn phone (Telefon ekranları, the role map in Gece mavisi nerede, the records
// screen in Katmanlar): status bar, device frame, tab bar, and the caption with the measured share. Owner: F1a.
const { I } = require('./icons');
const { covBar } = require('./coverage');
const statusBar = (t = '10:03') => '<div class="ph-status"><span class="num">' + t + '</span><span class="sys">' + I('signal_cellular_4_bar', 16) + I('wifi', 16) + I('battery_full', 16) + '</span></div>';
const device = (id, inner) => '<div class="device"><div class="device-screen" id="' + id + '"><i class="device-notch" aria-hidden="true"></i>' + inner + '</div></div>';
const tabbar = (active, xr) => '<nav class="ph-tabbar" aria-label="Öğrenci">' + [['today', 'Bugün'], ['history', 'Kayıtlar'], ['person', 'Hesap']].map(([ic, l]) =>
  '<button class="ph-tab" type="button"' + (l === active ? ' aria-current="page"' + (xr ? ' data-xr="4"' : '') : '') + '>' + I(ic, 24, l === active) + l + '</button>').join('') + '</nav>';
const capFor = (sel, t, code, d, kind = 'phone') => '<div class="device-cap"><p class="t">' + t + '<span>' + code + '</span></p>' + covBar(sel, kind) + '<p class="d">' + d + '</p></div>';
module.exports = { statusBar, device, tabbar, capFor };

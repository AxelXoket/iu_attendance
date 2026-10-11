// Phone drawing kit shared by every drawn phone (Telefon ekranları, the role map in Gece mavisi nerede, the records
// screen in Katmanlar): status bar, device frame, tab bar, and the caption with the measured share. Owner: F1a.
const { I } = require('./icons');
const { covBar } = require('./coverage');
// The status bar; a screen that can go offline draws both icon sets and shows the no-internet ones while it carries
// .offline (base.css), so the bar follows the screen's own state.
const statusBar = (t = '10:03', canOffline = false) => '<div class="ph-status"><span class="num">' + t + '</span><span class="sys">' + (canOffline ? '<span class="sys-on">' + I('signal_cellular_4_bar', 16) + I('wifi', 16) + '</span><span class="sys-off">' + I('signal_cellular_nodata', 16) + I('wifi_off', 16) + '</span>' : I('signal_cellular_4_bar', 16) + I('wifi', 16)) + I('battery_full', 16) + '</span></div>';
const device = (id, inner) => '<div class="device"><div class="device-screen" id="' + id + '"><i class="device-notch" aria-hidden="true"></i>' + inner + '</div></div>';
const tabbar = (active, xr) => '<nav class="ph-tabbar" aria-label="Öğrenci">' + [['today', 'Bugün'], ['history', 'Kayıtlar'], ['person', 'Hesap']].map(([ic, l]) =>
  '<button class="ph-tab" type="button"' + (l === active ? ' aria-current="page"' + (xr ? ' data-xr="4"' : '') : '') + '>' + I(ic, 24, l === active) + l + '</button>').join('') + '</nav>';
const capFor = (sel, t, code, d, kind = 'phone') => '<div class="device-cap"><p class="t">' + t + '<span>' + code + '</span></p>' + covBar(sel, kind) + '<p class="d">' + d + '</p></div>';
module.exports = { statusBar, device, tabbar, capFor };

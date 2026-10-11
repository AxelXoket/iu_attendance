// Page chrome outside the sections: the brand mark (side navigation and panel), the dialogs and the two toast live
// regions. The early-close dialog belongs to the instructor's phone (plan.html#hoca, Telefon uygulaması: hoca modu; the
// instructor QR screen opens it). The account deletion dialogs say what is deleted, what stays, why and for how long,
// as plan.html#kararlar-hesap-silme requires: the instructor's on the panel (Bileşenler and Katmanlar open it; the app's
// screen for both roles is drawn in Telefon ekranları). A confirm button may carry the toast it leaves (data-toast-ok).
// Owner: F1a.
const { I } = require('./icons');
const brand = (cls = 'brand-mark') => '<svg class="' + cls + '" viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26"></rect><path d="M8 14.5l4 4 8.5-9"></path></svg>';
const dlg = (id, title, body, cancel, action, toast) => '<dialog class="dlg" id="' + id + '" aria-labelledby="' + id + '-t" aria-describedby="' + id + '-d"><div class="dlg-h"><h4 id="' + id + '-t">' + title + '</h4><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat" data-close>' + I('close', 20) + '</button></div>' +
  '<div class="dlg-b" id="' + id + '-d">' + body + '</div>' +
  '<div class="dlg-f"><button class="btn btn-secondary" type="button" data-close autofocus>' + cancel + '</button><button class="btn btn-danger" type="button" data-close data-confirm' + (toast ? ' data-toast-ok="' + toast + '"' : '') + '>' + action + '</button></div></dialog>';
// What happens to the data, line by line (plan.html#kararlar-hesap-silme). The lines are the ones Telefon ekranları
// draws on the app's deletion screen (tools/sections/ekranlar.js DELETION, one source); the panel dialog prints the
// instructor's. The retention period is an open point in the plan, so the dialog names the rule, not a number of years.
const facts = d => '<dl class="dlg-dl">' + [['Silinir', d.silinir], ['Kalır', d.kalir], ['Neden', d.neden], ['Ne kadar', d.sure]].map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>';
const dialog = () => {
  const D = require('../sections/ekranlar').DELETION;
  if (!D || !D.hoca) throw new Error('page: tools/sections/ekranlar.js exports no DELETION.hoca');
  return dlg('dlg-close', 'Yoklama erken kapatılsın mı?', '<p>BİL 301 Veri Yapıları için pencere şimdi kapanır.</p><p class="help">İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.</p>', 'Vazgeç', 'Yoklamayı kapat', 'Yoklama erken kapatıldı|İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.') +
    dlg('dlg-del', 'Hesabın silinsin mi?', facts(D.hoca) + '<p class="help">Gönderilmemiş iş varsa silme sıraya girer, onlar gidince yapılır.</p>', 'Vazgeç', 'Hesabımı sil', '');
};
const toasts = '<div class="toasts" aria-label="Bildirimler"><div class="toast-list" role="status" aria-live="polite"></div><div class="toast-list" role="alert" aria-live="assertive"></div></div>';
module.exports = { brand, dialog, toasts };

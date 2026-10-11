// Page chrome outside the sections: the brand mark (side navigation and panel), the early-close dialog that
// Bileşenler, Katmanlar and the instructor QR screen open, and the two toast live regions. Owner: F1a.
const { I } = require('./icons');
const brand = (cls = 'brand-mark') => '<svg class="' + cls + '" viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26"></rect><path d="M8 14.5l4 4 8.5-9"></path></svg>';
const dialog = () => '<dialog class="dlg" id="dlg-close" aria-labelledby="dlg-t" aria-describedby="dlg-d"><div class="dlg-h"><h4 id="dlg-t">Yoklamayı erken kapat?</h4><button class="btn btn-ghost btn-icon" type="button" aria-label="Kapat" data-close>' + I('close', 20) + '</button></div>' +
  '<div class="dlg-b" id="dlg-d"><p>BİL 301 Veri Yapıları için pencere şimdi kapanır.</p><p class="help">İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.</p></div>' +
  '<div class="dlg-f"><button class="btn btn-secondary" type="button" data-close autofocus>Vazgeç</button><button class="btn btn-danger" type="button" data-close data-confirm>Yoklamayı kapat</button></div></dialog>';
const toasts = '<div class="toasts" aria-label="Bildirimler"><div class="toast-list" role="status" aria-live="polite"></div><div class="toast-list" role="alert" aria-live="assertive"></div></div>';
module.exports = { brand, dialog, toasts };

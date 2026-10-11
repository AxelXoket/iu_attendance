// QR drawing from qr.json: one path of dark modules on a white plate with four modules of quiet zone. Drawn in
// Telefon ekranları (camera scene, instructor QR) and Durumlar (projector page). Owner: F1b.
const qrSvg = (code, attrs = '') => '<svg viewBox="-4 -4 ' + (code.size + 8) + ' ' + (code.size + 8) + '"' + attrs + '><rect class="qr-bg" x="-4" y="-4" width="' + (code.size + 8) + '" height="' + (code.size + 8) + '"></rect><path class="qr-m" d="' + code.d + '"></path></svg>';
module.exports = { qrSvg };

// Build inputs: the variant folder (A), a reader relative to it (rd), the token, check, icon, QR and coverage data, and
// the color and spring math shared with the other design tools (../../color.js, ../../spring.js). Owner: F1a.
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(A, f), 'utf8');
const T = JSON.parse(rd('tokens.json'));
const CHK = JSON.parse(rd('tokens.check.json'));
const ICONS = JSON.parse(rd('icons.json'));
const QR = JSON.parse(rd('qr.json'));
const COV = fs.existsSync(path.join(A, 'coverage.json')) ? JSON.parse(rd('coverage.json')) : null;
const C = require(path.join(A, '..', '..', 'color.js'));
const { springInfo } = require(path.join(A, '..', '..', 'spring.js'));
module.exports = { A, rd, T, CHK, ICONS, QR, COV, C, springInfo };

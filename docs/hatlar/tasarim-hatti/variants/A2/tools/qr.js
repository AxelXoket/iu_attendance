// Builds QR module matrices with the same qrcode library the product uses (teknik.html: saf JavaScript qrcode),
// and writes compact SVG path data (one rectangle per horizontal run of dark modules) to ../qr.json.
// Attendance codes follow teknik.html#telefon-kamera-qr: digits only (numeric mode), at most 41 digits, version 1 at
// level L (21 x 21 modules): format version (1 digit), key slot (1), session short code (10), time slice (9: Unix
// seconds divided by 5), MAC (20 digits, a 64-bit value). The MAC here is a stand-in derived from a hash, not a real
// key. Four consecutive 5-second slices from 10:03:20 on 6 October 2026 (Istanbul) make the instructor's QR rotate.
// The last entry is the projector page's pairing QR (plan.html#asama23-nereden-gosterilir); its content format is not
// decided, so it carries only its short code, and it is never part of the attendance rotation.
// Run: node tools/qr.js   (then node tools/build.js)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const QR = require('qrcode');
const SESSION = '0000004817', KEY = '1', FORMAT = '1';
const t0 = Date.UTC(2026, 9, 6, 7, 3, 20) / 1000; // 10:03:20 in Europe/Istanbul (UTC+3)
const mac = s => (BigInt('0x' + crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)) % (2n ** 64n)).toString().padStart(20, '0');
const attendance = [0, 1, 2, 3].map(i => { const slice = String(Math.floor(t0 / 5) + i).padStart(9, '0'); const head = FORMAT + KEY + SESSION + slice; return { kind: 'yoklama', payload: head + mac(head) }; });
const pairing = { kind: 'eslestirme', code: '482 913', payload: '482913' };
const draw = ({ payload }) => {
  const q = QR.create(payload, { errorCorrectionLevel: 'L' });
  const n = q.modules.size, d = q.modules.data;
  let p = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (d[y * n + x]) { let w = 1; while (x + w < n && d[y * n + x + w]) w++; p += `M${x} ${y}h${w}v1h-${w}z`; x += w; } else x++;
    }
  }
  return { version: q.version, size: n, d: p };
};
const codes = [...attendance, pairing].map(c => ({ ...c, ...draw(c) }));
for (const c of codes.filter(x => x.kind === 'yoklama')) {
  if (!/^\d{41}$/.test(c.payload)) throw new Error('attendance payload must be 41 digits: ' + c.payload);
  if (c.version !== 1 || c.size !== 21) throw new Error('attendance QR must stay version 1 (21 x 21): ' + c.payload);
}
fs.writeFileSync(path.join(__dirname, '..', 'qr.json'), JSON.stringify(codes, null, 1));
console.log(codes.map(c => `${c.kind} v${c.version} ${c.size}x${c.size} ${c.payload}`).join('\n'));

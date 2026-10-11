// Measures how much of a screenshot each color family covers (deterministic, no libraries).
// Usage: node coverage.js <file.png> [x y w h]
// Families by OKLCH: zemin (neutral, L >= 0.94), gri (other neutrals, C < 0.04), gece mavisi (H 220 to 290),
// mor (H 290 to 330), kırmızı (H 330 to 35), yasak (H 35 to 220: yellow to green, must be 0).
const fs = require('fs'), zlib = require('zlib');
const C = require('./color.js');

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w, h, depth, type, inter; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; inter = data[12]; }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || inter !== 0 || ![2, 6].includes(type)) throw new Error(`unsupported PNG (depth ${depth}, type ${type}, interlace ${inter})`);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[i] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
function classify(o) {
  if (o.C < 0.04) return o.L >= 0.94 ? 'zemin' : 'gri';
  if (o.H > 35 && o.H < 220) return 'yasak';
  if (o.H >= 220 && o.H <= 290) return 'gece mavisi';
  if (o.H > 290 && o.H < 330) return 'mor';
  return 'kırmızı';
}
function coverage(file, x0 = 0, y0 = 0, cw, ch) {
  const { w, h, bpp, px } = decodePng(fs.readFileSync(file));
  cw = cw || w - x0; ch = ch || h - y0;
  const cache = new Map(), count = {}; let total = 0;
  for (let y = y0; y < Math.min(h, y0 + ch); y++) for (let x = x0; x < Math.min(w, x0 + cw); x++) {
    const i = (y * w + x) * bpp;
    if (bpp === 4 && px[i + 3] < 128) continue;
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    let k = cache.get(key);
    if (!k) { k = classify(C.hexToOklch('#' + key.toString(16).padStart(6, '0'))); cache.set(key, k); }
    count[k] = (count[k] || 0) + 1; total++;
  }
  const pct = Object.fromEntries(['zemin', 'gri', 'gece mavisi', 'mor', 'kırmızı', 'yasak'].map(k => [k, +((100 * (count[k] || 0)) / total).toFixed(2)]));
  return { file, width: cw, height: ch, pixels: total, pct };
}
module.exports = { coverage, decodePng };
if (require.main === module) {
  const [file, x, y, w, h] = process.argv.slice(2);
  const r = coverage(file, +x || 0, +y || 0, +w || 0, +h || 0);
  console.log(`${r.file} (${r.width}x${r.height}): ` + Object.entries(r.pct).map(([k, v]) => `${k} %${String(v).replace('.', ',')}`).join('  '));
}

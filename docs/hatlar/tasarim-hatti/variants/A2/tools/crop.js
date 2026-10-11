// Crops a PNG for close inspection: node tools/crop.js <in.png> <out.png> <x> <y> <w> <h> [scale]
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const { decodePng } = require(path.join(__dirname, '..', '..', '..', 'coverage.js'));
const [inp, out, x0, y0, w0, h0, sc] = process.argv.slice(2);
const { w, h, bpp, px } = decodePng(fs.readFileSync(inp));
const x = +x0, y = +y0, cw = Math.min(+w0, w - x), ch = Math.min(+h0, h - y), s = +(sc || 1);
const ow = cw * s, oh = ch * s;
const raw = Buffer.alloc(oh * (ow * 3 + 1));
for (let j = 0; j < oh; j++) {
  raw[j * (ow * 3 + 1)] = 0;
  for (let i = 0; i < ow; i++) {
    const sx = x + Math.floor(i / s), sy = y + Math.floor(j / s), si = (sy * w + sx) * bpp, di = j * (ow * 3 + 1) + 1 + i * 3;
    raw[di] = px[si]; raw[di + 1] = px[si + 1]; raw[di + 2] = px[si + 2];
  }
}
const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const v of b) r = t[(r ^ v) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
fs.writeFileSync(out, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(out, ow + 'x' + oh);

// Deterministic color math for the İÜ Yoklama design work.
// Usage:
//   node color.js hex <L> <C> <H>            OKLCH -> hex (gamut mapped by chroma reduction)
//   node color.js info <hex>                 hex -> OKLCH, CIELAB, WCAG luminance
//   node color.js contrast <fg> <bg>         WCAG 2.x ratio and APCA Lc (fg text on bg)
//   node color.js scale <H> <C> <L1,L2,...>  one hex per lightness, same hue and chroma
//   node color.js cvd <hex> <hex> ...        pairwise OKLab distance, normal and simulated CVD
const cbrt = Math.cbrt;
const clamp01 = x => Math.min(1, Math.max(0, x));

function oklabToLinear(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
function linearToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = cbrt(l), m_ = cbrt(m), s_ = cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}
const toLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(v)) throw new Error('bad hex ' + hex);
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255);
}
const rgbToHex = rgb => '#' + rgb.map(c => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const inGamut = lin => lin.every(c => c >= -1e-6 && c <= 1 + 1e-6);

function oklchToHex(L, C, H) {
  const rad = (H * Math.PI) / 180;
  let lin = oklabToLinear(L, C * Math.cos(rad), C * Math.sin(rad));
  let clipped = false, c = C;
  if (!inGamut(lin)) {
    clipped = true;
    let lo = 0, hi = C;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const t = oklabToLinear(L, mid * Math.cos(rad), mid * Math.sin(rad));
      if (inGamut(t)) lo = mid; else hi = mid;
    }
    c = lo;
    lin = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad));
  }
  return { hex: rgbToHex(lin.map(x => toGamma(clamp01(x)))), clipped, chromaUsed: +c.toFixed(4) };
}
function hexToOklch(hex) {
  const [L, a, b] = linearToOklab(...hexToRgb(hex).map(toLin));
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: +L.toFixed(4), C: +C.toFixed(4), H: C < 1e-4 ? 0 : +H.toFixed(1) };
}
function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  const d = 6 / 29;
  const f = t => (t > d ** 3 ? cbrt(t) : t / (3 * d * d) + 4 / 29);
  const fx = f(X / 0.95047), fy = f(Y / 1.0), fz = f(Z / 1.08883);
  return { L: +(116 * fy - 16).toFixed(2), a: +(500 * (fx - fy)).toFixed(2), b: +(200 * (fy - fz)).toFixed(2) };
}
function wcagLum(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function wcagRatio(fg, bg) {
  const a = wcagLum(fg), b = wcagLum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
// APCA 0.0.98G-4g (W3 constants)
function apcaY(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => c ** 2.4);
  return 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
}
function apcaLc(fg, bg) {
  let yt = apcaY(fg), yb = apcaY(bg);
  const clampY = y => (y > 0.022 ? y : y + (0.022 - y) ** 1.414);
  yt = clampY(yt); yb = clampY(yb);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let out;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    out = s < 0.1 ? 0 : s - 0.027;
  } else {
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
    out = s > -0.1 ? 0 : s + 0.027;
  }
  return +(out * 100).toFixed(1);
}
// Machado et al. 2009, severity 1.0, applied in linear sRGB
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
function simulate(hex, M) {
  const lin = hexToRgb(hex).map(toLin);
  return M.map(row => clamp01(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
}
function okDist(linA, linB) {
  const a = linearToOklab(...linA), b = linearToOklab(...linB);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

module.exports = { oklchToHex, hexToOklch, hexToLab, wcagRatio, apcaLc, simulate, okDist, CVD, hexToRgb, toLin };

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'hex') {
    const [L, C, H] = args.map(Number);
    const r = oklchToHex(L, C, H);
    console.log(`${r.hex}  oklch(${L} ${C} ${H})${r.clipped ? '  clipped to chroma ' + r.chromaUsed : ''}  lab b*=${hexToLab(r.hex).b}`);
  } else if (cmd === 'info') {
    for (const h of args) {
      const o = hexToOklch(h), l = hexToLab(h);
      console.log(`${h.toUpperCase()}  oklch(${o.L} ${o.C} ${o.H})  lab(${l.L} ${l.a} ${l.b})  wcagY=${wcagLum(h).toFixed(4)}`);
    }
  } else if (cmd === 'contrast') {
    const [fg, bg] = args;
    console.log(`${fg} on ${bg}: WCAG ${wcagRatio(fg, bg).toFixed(2)}:1  APCA Lc ${apcaLc(fg, bg)}`);
  } else if (cmd === 'scale') {
    const H = Number(args[0]), C = Number(args[1]);
    for (const L of args[2].split(',').map(Number)) {
      const r = oklchToHex(L, C, H);
      console.log(`L=${L}  ${r.hex}${r.clipped ? ' (clipped C=' + r.chromaUsed + ')' : ''}`);
    }
  } else if (cmd === 'cvd') {
    const hs = args;
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
      const n = okDist(hexToRgb(hs[i]).map(toLin), hexToRgb(hs[j]).map(toLin));
      const s = Object.entries(CVD).map(([k, M]) => `${k} ${okDist(simulate(hs[i], M), simulate(hs[j], M)).toFixed(3)}`).join('  ');
      console.log(`${hs[i]} vs ${hs[j]}: normal ${n.toFixed(3)}  ${s}`);
    }
  } else {
    console.log('usage: hex <L> <C> <H> | info <hex...> | contrast <fg> <bg> | scale <H> <C> <L1,L2,...> | cvd <hex...>');
  }
}

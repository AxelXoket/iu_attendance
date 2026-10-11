// Contrast numbers quoted in erisilebilirlik.html. Every ratio comes from color.js (the project's tool);
// a second, local WCAG computation with 4 decimals guards against rounding at a threshold.
const { execFileSync } = require('child_process');
const path = require('path');
const COLOR = path.resolve(__dirname, '../../color.js');

const T = {
  'neutral.1': '#FEFEFF', 'neutral.2': '#F2F4F8', 'neutral.3': '#EAECF1', 'neutral.4': '#E3E6EC',
  'neutral.5': '#DCDEE6', 'neutral.6': '#D3D7E0', 'neutral.7': '#C3C8D3', 'neutral.8': '#A6ABBB',
  'neutral.9': '#7D8497', 'neutral.10': '#6E7589', 'neutral.11': '#596074', 'neutral.12': '#1A2030',
  'accent.9': '#2B58B1', 'accent.10': '#1F4184', 'accent.11': '#143065', 'accent.12': '#0F2248',
  'danger': '#AC312E', 'danger.hover': '#971A1D', 'danger.pressed': '#861116', 'warning': '#7839A5',
  'white': '#FFFFFF', 'black': '#000000',
};
const bg = { page: 'neutral.2', surface: 'neutral.1', sunken: 'neutral.3', hover: 'neutral.4', selected: 'neutral.5' };

function lum(hex) {
  const v = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio4(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function tool(fg, bgHex) {
  const out = execFileSync('node', [COLOR, 'contrast', fg, bgHex], { encoding: 'utf8' });
  const m = out.match(/WCAG ([\d.]+):1\s+APCA Lc (-?[\d.]+)/);
  return { wcag: +m[1], apca: +m[2] };
}

const groups = {
  'text default': [
    ['neutral.12', ...Object.values(bg)],
    ['neutral.11', ...Object.values(bg)],
    ['accent.9', 'neutral.2', 'neutral.1', 'neutral.3', 'neutral.4', 'neutral.5'],
    ['accent.11', 'neutral.2', 'neutral.1', 'neutral.5'],
    ['danger', 'neutral.2', 'neutral.1', 'neutral.4', 'neutral.5'],
    ['warning', 'neutral.2', 'neutral.1', 'neutral.4', 'neutral.5'],
  ],
  'text on fills (neutral.1 per fix 1.6)': [
    ['neutral.1', 'accent.11', 'accent.10', 'accent.12', 'danger', 'danger.hover', 'danger.pressed', 'warning', 'neutral.12'],
    ['neutral.7', 'neutral.12'],
  ],
  'ui default': [
    ['neutral.9', 'neutral.1', 'neutral.2', 'neutral.3', 'neutral.4', 'neutral.5'],
    ['neutral.10', 'neutral.4', 'neutral.5'],
    ['accent.9', 'neutral.2', 'neutral.1', 'neutral.3', 'neutral.4', 'neutral.5', 'accent.11'],
    ['neutral.1', 'neutral.12', 'accent.11'],
    ['accent.11', 'neutral.5', 'neutral.1', 'neutral.2', 'neutral.4'],
    ['neutral.6', 'neutral.1', 'neutral.2'],
    ['black', 'white'],
  ],
  'increased contrast candidates': [
    ['accent.10', 'neutral.2', 'neutral.1', 'neutral.3', 'neutral.4', 'neutral.5'],
    ['accent.11', 'neutral.3'],
    ['neutral.11', 'neutral.1', 'neutral.2', 'neutral.3', 'neutral.4', 'neutral.5'],
    ['neutral.10', 'neutral.1', 'neutral.2', 'neutral.3', 'neutral.4'],
    ['neutral.9', 'neutral.1', 'neutral.2'],
    ['danger.pressed', 'neutral.1', 'neutral.2', 'neutral.5'],
    ['danger.hover', 'neutral.1', 'neutral.2', 'neutral.5'],
    ['neutral.12', 'neutral.5'],
  ],
};

const rows = [];
for (const [g, list] of Object.entries(groups)) {
  console.log('## ' + g);
  for (const [fg, ...bgs] of list) {
    for (const b of bgs) {
      const r = tool(T[fg], T[b]);
      const r4 = ratio4(T[fg], T[b]);
      const flag = Math.abs(r4 - r.wcag) > 0.006 ? '  MISMATCH' : '';
      console.log(`${fg.padEnd(15)} ${T[fg]} on ${b.padEnd(15)} ${T[b]}  ${r.wcag.toFixed(2)}:1 (${r4.toFixed(4)})  Lc ${r.apca}${flag}`);
      rows.push({ group: g, fg, fgHex: T[fg], bg: b, bgHex: T[b], wcag: r.wcag, exact: +r4.toFixed(4), apca: r.apca });
    }
  }
}
require('fs').writeFileSync(path.join(__dirname, 'pairs.json'), JSON.stringify(rows, null, 1));

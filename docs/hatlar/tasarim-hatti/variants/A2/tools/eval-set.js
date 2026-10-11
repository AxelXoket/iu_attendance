// Evaluates a status color set: contrast on neutral.1..5 and on neutral.12 (inverse),
// and the minimum pairwise OKLab distance under normal, protan, deutan, tritan.
// Usage: node eval-set.js name=#hex name=#hex ... | name=oklch:L,C,H
const C = require('../../../color.js');
const bgs = { n1: '#FEFEFF', n2: '#F2F4F8', n3: '#EAECF1', n4: '#E3E6EC', n5: '#DCDEE6' };
const items = process.argv.slice(2).map(a => {
  const [k, v] = a.split('=');
  if (v.startsWith('oklch:')) { const [L, c, H] = v.slice(6).split(',').map(Number); const r = C.oklchToHex(L, c, H); return [k, r.hex, r.clipped]; }
  return [k, v.toUpperCase(), false];
});
for (const [k, h, clip] of items) {
  const o = C.hexToOklch(h);
  const banned = o.C > 0.02 && o.H > 35 && o.H < 220;
  console.log(`${k.padEnd(10)} ${h} oklch(${o.L} ${o.C} ${o.H})${clip ? ' CLIPPED' : ''}${banned ? ' BANNED' : ''}  ` + Object.entries(bgs).map(([n, b]) => `${n} ${C.wcagRatio(h, b).toFixed(2)}`).join(' '));
}
let min = Infinity, worst = '';
for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
  const a = items[i][1], b = items[j][1];
  const n = C.okDist(C.hexToRgb(a).map(C.toLin), C.hexToRgb(b).map(C.toLin));
  const s = Object.fromEntries(Object.entries(C.CVD).map(([k, M]) => [k, C.okDist(C.simulate(a, M), C.simulate(b, M))]));
  const m = Math.min(n, ...Object.values(s));
  if (m < min) { min = m; worst = `${items[i][0]} vs ${items[j][0]}`; }
  if (process.env.ALL) console.log(`  ${items[i][0]} vs ${items[j][0]}: normal ${n.toFixed(3)} ` + Object.entries(s).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(' '));
}
console.log(`min distance ${min.toFixed(3)} (${worst})`);

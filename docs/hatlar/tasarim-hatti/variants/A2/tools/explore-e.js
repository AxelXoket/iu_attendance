// Searches status text colors for direction A (deterministic).
// Fixed: Var = accent.11 #143065 (ink), Elle eklendi = neutral.12 #1A2030 (graphite), Devamdan muaf = neutral.11 #596074.
// Free: Yok (red, H 15..35), Görevli (violet, H 295..325), Belgeli düzeltme (H 330..358 rose-plum or 270..292 blue-violet).
// Constraint: text contrast >= 4.6:1 on neutral.5 #DCDEE6 (darkest row background), in sRGB gamut, no banned hue.
// Objective: maximize the minimum OKLab distance over all pairs under normal, protan, deutan, tritan vision.
const C = require('../../../color.js');
const N5 = '#DCDEE6';
const fixed = [['var', '#143065'], ['elle', '#1A2030'], ['muaf', '#596074']];
const vecs = hex => {
  const lin = C.hexToRgb(hex).map(C.toLin);
  return [lin, ...Object.values(C.CVD).map(M => C.simulate(hex, M))];
};
const dist = (A, B) => Math.min(...A.map((v, i) => C.okDist(v, B[i])));
function cands(hues, Ls, Cs) {
  const out = [];
  for (const H of hues) for (const L of Ls) for (const c of Cs) {
    const r = C.oklchToHex(L, c, H);
    if (r.clipped) continue;
    if (C.wcagRatio(r.hex, N5) < 4.6) continue;
    out.push({ hex: r.hex, L, C: c, H, v: vecs(r.hex) });
  }
  return out;
}
const range = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(4)); return o; };
const reds = cands(range(22, 28, 1), range(0.46, 0.54, 0.01), range(0.15, 0.19, 0.01));
const violets = cands(range(272, 290, 2), range(0.36, 0.50, 0.02), range(0.08, 0.16, 0.01));
const thirds = cands(range(340, 358, 2), range(0.34, 0.48, 0.02), range(0.07, 0.14, 0.01));
const F = fixed.map(([k, h]) => ({ k, hex: h, v: vecs(h) }));
let fixedMin = Infinity; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) fixedMin = Math.min(fixedMin, dist(F[i].v, F[j].v));
console.log('candidates', reds.length, violets.length, thirds.length, 'fixed min', fixedMin.toFixed(3));
// precompute min distance of each candidate to fixed set
const toFixed = c => Math.min(...F.map(f => dist(c.v, f.v)));
reds.forEach(c => c.f = toFixed(c)); violets.forEach(c => c.f = toFixed(c)); thirds.forEach(c => c.f = toFixed(c));
let best = null;
for (const r of reds) {
  if (r.f < (best ? best.score : 0)) continue;
  for (const v of violets) {
    const rv = dist(r.v, v.v);
    const m1 = Math.min(r.f, v.f, rv, fixedMin);
    if (best && m1 <= best.score) continue;
    for (const t of thirds) {
      const m = Math.min(m1, t.f, dist(r.v, t.v), dist(v.v, t.v));
      if (!best || m > best.score) best = { score: m, r, v, t };
    }
  }
}
const show = c => `${c.hex} oklch(${c.L} ${c.C} ${c.H}) on n5 ${C.wcagRatio(c.hex, N5).toFixed(2)} on n1 ${C.wcagRatio(c.hex, '#FEFEFF').toFixed(2)}`;
console.log('best min distance', best.score.toFixed(3));
console.log('yok    ', show(best.r));
console.log('gorevli', show(best.v));
console.log('belgeli', show(best.t));

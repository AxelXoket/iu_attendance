// Spring physics helper: same model as Reanimated withSpring (damping c, stiffness k, mass m).
// Usage: node spring.js <damping> <stiffness> <mass> [points]
// Prints damping ratio, settle time (to 0.1 percent), overshoot (exact, from the damping ratio), and a CSS linear()
// easing with its duration.
function simulate(c, k, m, dt = 1 / 2000) {
  let x = 0, v = 0, t = 0; const pts = [];
  let settledAt = null, overshoot = 0;
  while (t < 5) {
    // semi-implicit Euler on x'' = (-k (x - 1) - c v) / m
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt; x += v * dt; t += dt;
    pts.push([t, x]);
    overshoot = Math.max(overshoot, x - 1);
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) { if (settledAt === null) settledAt = t; } else settledAt = null;
    if (settledAt !== null && t - settledAt > 0.05) break;
  }
  return { pts, settle: settledAt ?? t, overshoot };
}
function springInfo(c, k, m, n = 24) {
  const zeta = c / (2 * Math.sqrt(k * m));
  const { pts, settle, overshoot } = simulate(c, k, m);
  const T = settle;
  const samples = [];
  for (let i = 0; i <= n; i++) {
    const t = (T * i) / n;
    const p = pts.find(q => q[0] >= t) || pts[pts.length - 1];
    samples.push(i === n ? '1' : `${p[1].toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${((100 * i) / n).toFixed(1).replace(/\.0$/, '')}%`);
  }
  samples[0] = '0';
  // Overshoot of the damped oscillator, exact: exp(-zeta pi / sqrt(1 - zeta^2)) for zeta < 1. The simulation above stops
  // once it looks settled, which can be before the peak, so its maximum is not used.
  const peak = zeta < 1 ? Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta)) : 0;
  return { zeta: +zeta.toFixed(3), settleMs: Math.round(T * 1000), overshootPct: +(peak * 100).toFixed(2), css: `linear(${samples.join(', ')})` };
}
module.exports = { springInfo };
if (require.main === module) {
  const [c, k, m, n] = process.argv.slice(2).map(Number);
  if (!c || !k || !m) { console.log('usage: node spring.js <damping> <stiffness> <mass> [points]'); process.exit(1); }
  const r = springInfo(c, k, m, n || 24);
  console.log(`damping ratio ${r.zeta}, settles in ${r.settleMs} ms, overshoot ${r.overshootPct}%`);
  console.log(`CSS: transition-timing-function: ${r.css}; transition-duration: ${r.settleMs}ms;`);
}

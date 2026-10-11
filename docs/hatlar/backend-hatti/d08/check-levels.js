// Level model under one reading of plan.html#devam-uyari-seviyeleri; used only to expose ambiguities.
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);
// L1 variants: a) 2A >= hak (at least half used)  b) A >= floor(hak/2)
function level(Tproj, p, A, hNext, l1) {
  const h = hak(Tproj, p), kalan = h - A;
  if (A > h) return 4;
  if (kalan === 0) return 3;
  if (hNext !== null && kalan <= hNext) return 2;
  if (l1 === 'a' ? 2 * A >= h : A >= Math.floor(h / 2)) return 1;
  return 0;
}
// Plan examples, 1-hour sessions, p=80
console.log('T=3 day1', level(3, 80, 0, 1, 'a'), '(plan: Hakkın kalmadı = 3)');
console.log('T=5 day1', level(5, 80, 0, 1, 'a'), '(plan: Bir ders daha... = 2)', '| first absence', level(5, 80, 1, 1, 'a'), '(plan: 3)');
// L1 reading difference: count (Tproj,A) pairs where the two readings give different levels, p=70/80, 1-hour sessions
let diff = 0, ex = null;
for (const p of [70, 80]) for (let T = 1; T <= 60; T++) for (let A = 0; A <= T; A++) {
  const a = level(T, p, A, 1, 'a'), b = level(T, p, A, 1, 'b'); if (a !== b) { diff++; if (!ex) ex = { p, T, hak: hak(T, p), A, a, b }; }
}
console.log('L1 readings differ in', diff, 'cases; first:', ex);
// L2 oscillation: theory p=70, Tproj=42 (14 weeks: Mon 1h + Wed 2h), A=10 so kalan=2
const H = hak(42, 70);
console.log('hak', H, 'kalan', H - 10, '| next=1h ->', level(42, 70, 10, 1, 'a'), '| next=2h ->', level(42, 70, 10, 2, 'a'));

// Mutation sanity: each mutant of the reference rules must be caught by at least one named test case from the spec.
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);
const hakTanim = (T, p) => { let k = T; while (k > 0 && (T - k) * 100 < p * T) k--; return k; };
const mutants = {
  'hak +100': (T, p) => T - Math.floor((T * p + 100) / 100),
  'hak +98': (T, p) => T - Math.floor((T * p + 98) / 100),
  'hak float': (T, p) => Math.floor(T * (1 - p / 100)),
};
for (const [ad, f] of Object.entries(mutants)) {
  let caught = 0; for (const p of [70, 80]) for (let T = 0; T <= 1000; T++) if (f(T, p) !== hakTanim(T, p)) caught++;
  console.log(ad.padEnd(10), 'caught by T 0..1000 p 70/80 table:', caught > 0, '(diffs', caught + ')');
}
// level-1 threshold mutant: '>' instead of '>='; equality case p=70 T=14 A=2 (hak 4)
console.log('hak(14,70)=', hak(14, 70), '-> equality case 2*A == hak exists with A=2');
const l1 = (h, A, op) => op === '>=' ? 2 * A >= h : 2 * A > h;
console.log('>= gives level1:', l1(4, 2, '>='), ' > gives level1:', l1(4, 2, '>'));
// level-2 mutant: '<' instead of '<=' (kalan <= sonraki): plan example T=5 p=80 day one kalan 1 next 1 must be level 2
console.log('T=5 p=80 kalan', hak(5, 80) - 0, 'next 1: <= ->', (1 <= 1), ' < ->', (1 < 1));

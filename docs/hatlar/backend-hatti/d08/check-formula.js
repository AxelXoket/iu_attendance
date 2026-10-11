// Deterministic checks of the plan's absence-formula claims (plan.html#devam-uyari-seviyeleri, teknik.html#testler-birim).
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);           // plan formula, integer only
const byDef = (T, p) => { let k = -1; for (let c = 0; c <= T; c++) if ((T - c) * 100 >= p * T) k = c; return k; }; // teknik definition
const floatHak = (T, p) => Math.floor(T * (1 - p / 100));           // the "ondalıklı" variant the plan warns about
let defMismatch = 0;
for (const p of [0, 1, 50, 69, 70, 75, 80, 99, 100]) for (let T = 0; T <= 1000; T++) if (hak(T, p) !== byDef(T, p)) defMismatch++;
console.log('formula vs definition mismatches (T 0..1000, several p):', defMismatch);
for (const p of [70, 80]) {
  const wrong = []; for (let T = 1; T <= 199; T++) if (floatHak(T, p) !== hak(T, p)) wrong.push(T);
  console.log(`p=${p}: float variant wrong for ${wrong.length} values of T in 1..199`, wrong.slice(0, 8), '...');
}
console.log('p=80 T=15 hak', hak(15, 80), 'float', floatHak(15, 80), '| T=3 hak', hak(3, 80), '| T=5 hak', hak(5, 80));
// Percent display: floor to one decimal, computed in integers; must never contradict the integer decision.
let contra = 0, checked = 0;
for (const p of [70, 80, 100, 1]) for (let T = 1; T <= 400; T++) for (let A = 0; A <= T; A++) {
  const tenths = Math.floor((T - A) * 1000 / T);          // e.g. 695 => 69,5
  const devamli = A <= hak(T, p);
  const shownMeets = tenths >= p * 10;
  checked++; if (devamli !== shownMeets) contra++;
}
console.log('percent-vs-decision contradictions:', contra, 'of', checked);
// Example from plan: T=200 p=70 A=61 => 69,5 and DEVAMSIZ
console.log('T=200,p=70,A=61 tenths', Math.floor((200 - 61) * 1000 / 200), 'devamli', 61 <= hak(200, 70));

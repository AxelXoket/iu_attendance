// Reference model of the D08 rules written into spec/D08.json. Deterministic checks only; run: node ref.js
// Every claim in the spec's invariants and test table that is arithmetic is checked here first.
'use strict';
const assert = require('assert');

// ---- hak (plan.html#devam-uyari-seviyeleri) ----
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);
const hakTanim = (T, p) => { let k = T; while (k > 0 && (T - k) * 100 < p * T) k--; return k; }; // largest k with (T-k)*100 >= p*T

// ---- level (seviye) ----
// kullanilan: level-basis net absence; Tsapka: yapilan + planli_kalan; sonraki: hours of next session of this type or null
function seviye(Tsapka, p, kullanilan, sonraki) {
  const h = hak(Tsapka, p), kalan = h - kullanilan;
  if (kullanilan > h) return { seviye: 4, mesaj: 'HAKKINI_ASTIN', kalan };
  if (kalan === 0) return { seviye: 3, mesaj: 'HAKKIN_KALMADI', kalan };
  if (sonraki !== null && kalan <= sonraki) return { seviye: 2, mesaj: kalan < sonraki ? 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN' : 'BIR_DERS_DAHA_HAKKIN_BITER', kalan };
  if (2 * kullanilan >= h) return { seviye: 1, mesaj: 'YARISINI_KULLANDIN', kalan };
  return { seviye: 0, mesaj: null, kalan };
}
// conditions for each level independently (to check "highest wins")
const kosul = (Tsapka, p, A, nx) => {
  const h = hak(Tsapka, p), kalan = h - A;
  return { 4: A > h, 3: kalan === 0, 2: nx !== null && kalan > 0 && kalan <= nx, 1: A <= h && 2 * A >= h && h > 0 ? true : (A <= h && 2 * A >= h) };
};

// ---- hold rule ("seviye geri gitmez", data vs estimate) ----
// onceki: {seviye, mesaj, kalan} or null; yeni: same; veriDegisti: boolean
function gosterim(onceki, yeni, veriDegisti, muafYaDaPasif) {
  if (muafYaDaPasif) return { seviye: 0, mesaj: null, kalan: yeni.kalan };
  if (!onceki || veriDegisti || yeni.seviye >= onceki.seviye) return { ...yeni };
  return { ...onceki }; // estimate-only decrease: keep the whole triple
}

// ---- per session hour split ----
// base: 'VAR' | 'YOK' | 'BEKLEMEDE' | 'INCELEMEDE' (from counted record; KENDI_BEYANI pending = VAR)
// duz: null | { durum: 'ELLE_EKLENDI'|'VAR_KISMI'|'GOREVLI'|'BELGELI_DUZELTME'|'YOK', saat: number|null }
function oturumSaatleri(H, base, duz) {
  const r = { var: 0, yok: 0, maz: 0, acik: 0 };
  const put = (d, h) => { if (d === 'VAR' || d === 'ELLE_EKLENDI' || d === 'VAR_KISMI') r.var += h; else if (d === 'GOREVLI' || d === 'BELGELI_DUZELTME') r.maz += h; else if (d === 'YOK') r.yok += h; else r.acik += h; };
  if (!duz) { put(base, H); return r; }
  const hc = Math.min(duz.saat === null ? H : duz.saat, H);
  put(duz.durum, hc);
  const kalan = H - hc;
  const varTuru = duz.durum === 'ELLE_EKLENDI' || duz.durum === 'VAR_KISMI';
  put(varTuru ? 'YOK' : base, kalan);
  return r;
}

// ---- per type result (AKSİS basis) and percent ----
function turSonucu(T, p, devamsiz) {
  const h = hak(T, p);
  return { hak: h, karar: devamsiz <= h ? 'DEVAMLI' : 'DEVAMSIZ', yuzdeOnda: T === 0 ? null : Math.floor((T - devamsiz) * 1000 / T) };
}

let n = 0;
// 1) formula vs definition, every p 0..100, T 0..1000
for (let p = 0; p <= 100; p++) for (let T = 0; T <= 1000; T++) { assert.strictEqual(hak(T, p), hakTanim(T, p), `hak T=${T} p=${p}`); n++; }
console.log('1 hak == tanim, cases:', n);
// 1b) bounds
for (let p = 0; p <= 100; p++) for (let T = 0; T <= 1000; T++) { const h = hak(T, p); assert(h >= 0 && h <= T); }
assert.strictEqual(hak(1000, 0), 1000); assert.strictEqual(hak(1000, 100), 0);
console.log('1b 0 <= hak <= T; p=0 -> T; p=100 -> 0');
// 2) float variant counter-example counts (ground control for why integer)
const fl = (T, p) => Math.floor(T * (1 - p / 100));
let w80 = 0, w70 = 0; for (let T = 1; T <= 199; T++) { if (fl(T, 80) !== hak(T, 80)) w80++; if (fl(T, 70) !== hak(T, 70)) w70++; }
console.log('2 float wrong p80:', w80, 'p70:', w70, '| T=15 p=80 hak', hak(15, 80), 'float', fl(15, 80));
assert.strictEqual(w80, 39); assert.strictEqual(w70, 0);
// 3) percent vs decision, T 1..400, every p 0..100, every absence
let c3 = 0, bad3 = 0;
for (let p = 0; p <= 100; p++) for (let T = 1; T <= 400; T++) for (let A = 0; A <= T; A++) { const r = turSonucu(T, p, A); c3++; if ((r.karar === 'DEVAMSIZ') !== (r.yuzdeOnda < 10 * p)) bad3++; }
console.log('3 percent/decision contradictions:', bad3, 'of', c3); assert.strictEqual(bad3, 0);
// 4) plan small-hak table, 1-hour sessions, p=80
assert.deepStrictEqual([seviye(3, 80, 0, 1).seviye, seviye(3, 80, 0, 1).mesaj], [3, 'HAKKIN_KALMADI']);
assert.deepStrictEqual([seviye(5, 80, 0, 1).seviye, seviye(5, 80, 0, 1).mesaj], [2, 'BIR_DERS_DAHA_HAKKIN_BITER']);
assert.deepStrictEqual([seviye(5, 80, 1, 1).seviye, seviye(5, 80, 1, 1).mesaj], [3, 'HAKKIN_KALMADI']);
assert.strictEqual(hak(3, 80), 0); assert.strictEqual(hak(5, 80), 1);
console.log('4 plan examples T=3 -> 3, T=5 -> 2 then 3: ok');
// 5) level 1 threshold reading (B03): p=70 T=10 hak 3: 1h absent -> 0, 2h -> 1 (no next session pressure: next=null)
assert.strictEqual(hak(10, 70), 3);
assert.strictEqual(seviye(10, 70, 1, null).seviye, 0); assert.strictEqual(seviye(10, 70, 2, null).seviye, 1);
console.log('5 level-1 threshold 2*A >= hak: ok');
// 6) level-2 variant and B05 example: p=70 T^=42 A=10 kalan=2: next 1h -> 1, next 2h -> 2 (HAKKIN_BITER), next 3h -> 2 (DEVAMSIZ_KALIRSIN)
assert.strictEqual(hak(42, 70), 12);
assert.strictEqual(seviye(42, 70, 10, 1).seviye, 1);
assert.deepStrictEqual([seviye(42, 70, 10, 2).seviye, seviye(42, 70, 10, 2).mesaj], [2, 'BIR_DERS_DAHA_HAKKIN_BITER']);
assert.deepStrictEqual([seviye(42, 70, 10, 3).seviye, seviye(42, 70, 10, 3).mesaj], [2, 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN']);
assert.strictEqual(seviye(42, 70, 10, null).seviye, 1);
console.log('6 level-2 message variants and no-next-session: ok');
// 7) highest wins: level equals max level whose condition holds (exhaustive small domain)
let c7 = 0;
for (const p of [0, 50, 70, 80, 100]) for (let T = 0; T <= 60; T++) for (let A = 0; A <= T + 2; A++) for (const nx of [null, 1, 2, 3]) {
  const h = hak(T, p), kalan = h - A;
  const conds = [A > h, kalan === 0, nx !== null && kalan > 0 && kalan <= nx, kalan > 0 && 2 * A >= h];
  const expect = conds[0] ? 4 : conds[1] ? 3 : conds[2] ? 2 : conds[3] ? 1 : 0;
  assert.strictEqual(seviye(T, p, A, nx).seviye, expect); c7++;
}
console.log('7 highest-level-wins exhaustive cases:', c7);
// 8) per-session split invariant: var+yok+maz+acik = H; Var-type partial leaves the rest YOK; excused partial leaves the rest to base
let c8 = 0;
for (let H = 1; H <= 6; H++) for (const base of ['VAR', 'YOK', 'BEKLEMEDE', 'INCELEMEDE']) for (const d of [null, 'ELLE_EKLENDI', 'VAR_KISMI', 'GOREVLI', 'BELGELI_DUZELTME', 'YOK']) for (let s = -1; s <= H + 1; s++) {
  const duz = d === null ? null : { durum: d, saat: s < 0 ? null : s };
  const r = oturumSaatleri(H, base, duz);
  assert.strictEqual(r.var + r.yok + r.maz + r.acik, H); c8++;
}
assert.deepStrictEqual(oturumSaatleri(3, 'VAR', { durum: 'VAR_KISMI', saat: 2 }), { var: 2, yok: 1, maz: 0, acik: 0 });
assert.deepStrictEqual(oturumSaatleri(3, 'VAR', { durum: 'YOK', saat: 1 }), { var: 2, yok: 1, maz: 0, acik: 0 });
assert.deepStrictEqual(oturumSaatleri(3, 'YOK', { durum: 'BELGELI_DUZELTME', saat: 2 }), { var: 0, yok: 1, maz: 2, acik: 0 });
assert.deepStrictEqual(oturumSaatleri(3, 'INCELEMEDE', { durum: 'GOREVLI', saat: 1 }), { var: 0, yok: 0, maz: 1, acik: 2 });
console.log('8 hour split sums to H in all', c8, 'cases; partial examples ok');
// 9) hold rule property: random sequences; with data fixed, shown level never decreases; with data change shown == computed
let rnd = 12345; const R = m => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd % m; };
let c9 = 0;
for (let run = 0; run < 20000; run++) {
  let onceki = null, A = R(10), p = [70, 80][R(2)];
  for (let step = 0; step < 12; step++) {
    const veri = R(3) === 0; if (veri) A = Math.max(0, A + R(5) - 2);
    const Ts = 5 + R(40), nx = R(4) === 0 ? null : 1 + R(3);
    const yeni = seviye(Ts, p, A, nx);
    const g = gosterim(onceki, yeni, veri, false);
    if (onceki && !veri) assert(g.seviye >= onceki.seviye, 'estimate-only change lowered the shown level');
    if (veri || !onceki) assert.strictEqual(g.seviye, yeni.seviye);
    assert(g.seviye >= yeni.seviye, 'shown below computed');
    onceki = g; c9++;
  }
}
console.log('9 hold rule property steps:', c9);
// 10) monotonicity: turning any absent session into present never turns DEVAMLI into DEVAMSIZ (range test exactness)
let c10 = 0;
for (const p of [0, 50, 70, 80, 100]) for (let T = 0; T <= 120; T++) for (let A = 0; A <= T; A++) for (let k = 0; k <= A; k++) {
  const a = turSonucu(T, p, A).karar, b = turSonucu(T, p, A - k).karar;
  if (a === 'DEVAMLI') assert.strictEqual(b, 'DEVAMLI'); c10++;
}
// adding a session to scope as present (pre-membership participation) also never hurts: (T+h, A) vs (T, A)
for (const p of [0, 50, 70, 80, 100]) for (let T = 0; T <= 120; T++) for (let A = 0; A <= T; A++) for (let h = 1; h <= 4; h++) {
  if (turSonucu(T, p, A).karar === 'DEVAMLI') assert.strictEqual(turSonucu(T + h, p, A).karar, 'DEVAMLI'); c10++;
}
console.log('10 monotonicity cases:', c10);
// 11) KARAR BEKLIYOR range test on a toy student: open items best/worst; single-record test
function genel(turler) { return turler.some(t => t.karar === 'DEVAMSIZ') ? 'DEVAMSIZ' : 'DEVAMLI'; }
// teori T=10 p=70 hak 3; uyg T=5 p=80 hak 1
const ornek = (dT, dU) => genel([turSonucu(10, 70, dT), turSonucu(5, 80, dU)]);
// current: teori absent 4 (one of them INCELEMEDE 1h), uyg absent 1 -> teori DEVAMSIZ; best: teori 3 -> DEVAMLI
assert.strictEqual(ornek(4, 1), 'DEVAMSIZ'); assert.strictEqual(ornek(3, 1), 'DEVAMLI');
console.log('11 range test example flips: KARAR BEKLIYOR (ACIK_ISARET)');
// uyg definitively DEVAMSIZ (2 > hak 1) -> teori flip cannot change overall
assert.strictEqual(ornek(3, 2), 'DEVAMSIZ'); assert.strictEqual(ornek(4, 2), 'DEVAMSIZ');
console.log('11b definitive other type DEVAMSIZ -> no KARAR BEKLIYOR');
// 12) yuzde examples
assert.deepStrictEqual(turSonucu(200, 70, 61), { hak: 60, karar: 'DEVAMSIZ', yuzdeOnda: 695 });
assert.deepStrictEqual(turSonucu(0, 80, 0), { hak: 0, karar: 'DEVAMLI', yuzdeOnda: null });
console.log('12 T=200 p=70 A=61 -> 695 DEVAMSIZ; T=0 -> null DEVAMLI');
// 13) CHECK-constraint arithmetic in SQL integer division equals JS floor for non-negative operands
for (let T = 0; T <= 1000; T++) for (const p of [0, 1, 69, 70, 80, 99, 100]) { const sqlDiv = Math.trunc((T * p + 99) / 100); assert.strictEqual(T - sqlDiv, hak(T, p)); }
console.log('13 SQL trunc division == floor for non-negative: ok');
console.log('ALL OK');

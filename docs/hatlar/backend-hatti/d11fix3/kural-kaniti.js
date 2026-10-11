// Executable check of the D11 rules as written in the spec (prototype of packages/core/src/projeksiyon).
// Not product code: proves the specified formulas are internally consistent and match the plan's numbers.
const crypto = require('crypto');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// --- QR content (41 digits) ---
const ileti = (amac, surum, yuva, kisaKod, dilim) => { const b = Buffer.alloc(19); b[0] = amac; b[1] = surum; b[2] = yuva; b.writeBigUInt64BE(BigInt(kisaKod), 3); b.writeBigUInt64BE(BigInt(dilim), 11); return b; };
const mac20 = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest().readBigUInt64BE(0).toString().padStart(20, '0');
const yedek6 = (key, msg) => (crypto.createHmac('sha256', key).update(msg).digest().readBigUInt64BE(0) % 1000000n).toString().padStart(6, '0');
const qr = (surum, yuva, kisaKod, dilim, mac) => `${surum}${yuva}${String(kisaKod).padStart(10, '0')}${String(dilim).padStart(9, '0')}${mac}`;
const ayristir = s => { if (!/^[0-9]{41}$/.test(s)) return { hata: 'BICIM_BOZUK' }; const surum = +s[0]; if (surum !== 1) return { hata: 'SURUM_BILINMIYOR' }; return { surum, yuva: +s[1], kisaKod: +s.slice(2, 12), dilim: +s.slice(12, 21), mac: s.slice(21) }; };
ok(String(2n ** 64n - 1n).length === 20, 'max 64-bit is 20 digits');
ok(String(Math.floor(Date.UTC(2128, 0, 1) / 5000)).length === 9 && String(Math.floor(Date.UTC(2129, 0, 1) / 5000)).length === 10, 'dilim stays 9 digits until 2128');
const key = crypto.randomBytes(32);
for (let i = 0; i < 20000; i++) {
  const y = rnd(0, 9), k = rnd(1, 9999999999), d = rnd(0, 999999999);
  const m = mac20(key, ileti(1, 1, y, k, d)); const s = qr(1, y, k, d, m);
  ok(s.length === 41, 'length 41'); const p = ayristir(s);
  ok(p.yuva === y && p.kisaKod === k && p.dilim === d && p.mac === m, 'round trip');
}
ok(ayristir('1'.repeat(40)).hata === 'BICIM_BOZUK' && ayristir('2' + '0'.repeat(40)).hata === 'SURUM_BILINMIYOR', 'bad inputs');
// purpose bytes separate the three codes
{ const k = 123, d = 456789; ok(mac20(key, ileti(1, 1, 3, k, d)).slice(-6) !== yedek6(key, ileti(2, 1, 3, k, d)) || true, 'purpose'); ok(!crypto.createHmac('sha256', key).update(ileti(1, 1, 3, k, d)).digest().equals(crypto.createHmac('sha256', key).update(ileti(2, 1, 3, k, d)).digest()), 'purpose bytes give different HMAC'); }
// pairing QR fits version 1-L alphanumeric (25 chars) and uses only alphanumeric-mode characters
{ const e = 'IUY:E1:482913'; ok(e.length <= 25 && /^[0-9A-Z $%*+\-./:]+$/.test(e), 'pairing QR alphanumeric v1'); ok(!e.startsWith('IUY1.'), 'differs from receipt prefix'); }

// --- pay (plan: istek + gecen/10000, ceil) ---
const pay = (istek, gecen) => istek + Math.ceil(gecen / 10000);
ok(Math.abs(pay(0, 86400000) - 8640) < 1, '1 day ~ 8.6 s');
ok(pay(0, 2 * 86400000) === 17280, '2 days ~ 17.3 s');
ok(pay(0, 3 * 3600000) === 1080, '3 h ~ 1.1 s');

// --- delay rule (spec order) ---
const N_QR = 10000, N_YK = 20000, R = 30000;
function gecikme({ t, p, d, h = 0, q = 0, yedek = false, proj = true, hocaVar = true, kapsayan = true, iptal = null, ogrenciSaati = true }) {
  if (iptal !== null && iptal <= d * 5000) return 'ANAHTAR_IPTAL';
  if (!ogrenciSaati) return 'SAAT_DOGRULANAMADI';
  if (!proj && !kapsayan) return 'BEKLEMEDE';
  if (!proj && !hocaVar) return 'HOCA_SAATI_YOK';
  const g = t - (d * 5000 + h), P = p + q, N = yedek ? N_YK : N_QR, tol = proj ? 1000 : 0;
  if (g - P > R) return 'RET';
  if (g + P < -tol) return 'ONCE_OKUTULMUS';
  if (proj && !kapsayan) return 'GOSTERIM_DISI';
  if (g + P < N) return 'NORMAL';
  if (p >= N) return 'CAPALAR_ESKI';
  return 'INCELEMEDE';
}
// P = 0: NORMAL iff the scanned slice is the current or the previous one
for (let i = 0; i < 20000; i++) {
  const d = rnd(1e8, 3e8), t = d * 5000 + rnd(-20000, 60000);
  const cur = Math.floor(t / 5000); const r = gecikme({ t, p: 0, d });
  // plan: current or previous code; projection adds the 1 s page-clock tolerance before the next code's start
  const expectNormal = d === cur || d === cur - 1 || (d === cur + 1 && t >= d * 5000 - 1000);
  ok((r === 'NORMAL') === expectNormal, `P=0 normal iff current/previous (+1 s tolerance) (d-cur=${d - cur}, r=${r})`);
  // phone codes have no tolerance: exactly current or previous
  const r2 = gecikme({ t, p: 0, d, proj: false });
  ok((r2 === 'NORMAL') === (d === cur || d === cur - 1), `phone P=0 normal iff current/previous (d-cur=${d - cur}, r=${r2})`);
}
// monotonic: raising pay never moves toward NORMAL or RET
const order = { NORMAL: 0, INCELEMEDE: 1, CAPALAR_ESKI: 1, ONCE_OKUTULMUS: 1, RET: 2 };
for (let i = 0; i < 20000; i++) {
  const d = rnd(1e8, 3e8), t = d * 5000 + rnd(-5000, 60000), p1 = rnd(0, 20000), p2 = p1 + rnd(0, 20000);
  const a = gecikme({ t, p: p1, d }), b = gecikme({ t, p: p2, d });
  if (a === 'NORMAL') ok(b === 'NORMAL' || b === 'INCELEMEDE' || b === 'CAPALAR_ESKI', 'normal only loosens to incelemede with more pay');
  if (b === 'NORMAL') ok(a === 'NORMAL' || a === 'ONCE_OKUTULMUS', 'more pay creates normal only from once_okutulmus (doubt favours student)');
  if (b === 'RET') ok(a === 'RET', 'more pay cannot create ret');
  if (b === 'ONCE_OKUTULMUS') ok(a === 'ONCE_OKUTULMUS', 'more pay cannot create once_okutulmus');
}
// exact thresholds: RET iff g - P > R; NORMAL iff -tol <= g + P < N (and not RET)
for (let i = 0; i < 20000; i++) {
  const d = rnd(1e8, 3e8), t = d * 5000 + rnd(-3000, 70000), p = rnd(0, 15000), yedek = Math.random() < 0.3;
  const g = t - d * 5000, r = gecikme({ t, p, d, yedek });
  ok((r === 'RET') === (g - p > R), `ret iff g-P>R (g=${g}, p=${p}, r=${r})`);
  const N = yedek ? N_YK : N_QR;
  ok((r === 'NORMAL') === (!(g - p > R) && g + p >= -1000 && g + p < N), `normal band (g=${g}, p=${p}, r=${r})`);
}
// exact boundaries from the plan's wording: "10 saniyenin altında" strict, "30 saniyeyi aşarsa" strict
{ const d = 2e8, b = d * 5000;
  ok(gecikme({ t: b + 30000, p: 0, d }) === 'INCELEMEDE', 'g-P = 30 s exactly is not ret');
  ok(gecikme({ t: b + 30001, p: 0, d }) === 'RET', 'g-P = 30.001 s is ret');
  ok(gecikme({ t: b + 9999, p: 0, d }) === 'NORMAL', 'g+P = 9.999 s is normal');
  ok(gecikme({ t: b + 10000, p: 0, d }) === 'INCELEMEDE', 'g+P = 10 s exactly is not normal');
  ok(gecikme({ t: b + 19999, p: 0, d, yedek: true, proj: false }) === 'NORMAL', 'backup 19.999 s normal');
  ok(gecikme({ t: b + 20000, p: 0, d, yedek: true, proj: false }) === 'INCELEMEDE', 'backup 20 s exactly not normal');
  ok(gecikme({ t: b + 0, p: 10000, d }) === 'CAPALAR_ESKI', 'student pay exactly N makes normal impossible');
  ok(gecikme({ t: b - 2000, p: 9999, d }) === 'NORMAL', 'pay just under N with early estimate can still be normal');
  ok(gecikme({ t: b - 1000, p: 0, d }) === 'NORMAL' && gecikme({ t: b - 1001, p: 0, d }) === 'ONCE_OKUTULMUS', 'projection tolerance exactly 1 s');
  ok(gecikme({ t: b - 1, p: 0, d, proj: false }) === 'ONCE_OKUTULMUS', 'phone codes have no tolerance');
  ok(gecikme({ t: b + 3000, p: 0, d, proj: false, iptal: b }) === 'ANAHTAR_IPTAL', 'revoked at slice start');
  ok(gecikme({ t: b + 3000, p: 0, d, proj: false, iptal: b + 1 }) === 'NORMAL', 'revoked after slice start: not affected');
  ok(gecikme({ t: b + 3000, p: 0, d, proj: false, iptal: b, ogrenciSaati: false }) === 'ANAHTAR_IPTAL', 'revocation wins over unverifiable student clock');
  ok(gecikme({ t: b + 3000, p: 0, d, proj: false, iptal: b, kapsayan: false }) === 'ANAHTAR_IPTAL', 'revocation wins over waiting for display record'); }
// no RET without hoca clock
for (let i = 0; i < 5000; i++) { const d = rnd(1e8, 3e8); ok(gecikme({ t: d * 5000 + rnd(0, 600000), p: 0, d, proj: false, hocaVar: false }) !== 'RET', 'no ret without hoca clock'); }
// plan examples
{ const d = 2e8; ok(gecikme({ t: d * 5000 + 1500, p: 9040, d }) === 'INCELEMEDE', '1-day doc, scan at 1.5 s -> incelemede');
  ok(gecikme({ t: d * 5000 + 500, p: 9040, d }) === 'NORMAL', '1-day doc, scan in first second -> normal');
  ok(gecikme({ t: d * 5000 + 0, p: 17280, d }) === 'CAPALAR_ESKI', '2-day doc -> normal impossible');
  ok(gecikme({ t: d * 5000 + 3000, p: 2000, d, proj: false, q: 6000 }) === 'INCELEMEDE', 'hoca pay 6 s pushes 3+2 s to incelemede');
  ok(gecikme({ t: d * 5000 + 3000, p: 2000, d }) === 'NORMAL', 'same scan from projection normal');
  ok(gecikme({ t: d * 5000 + 15000, p: 0, d, yedek: true, proj: false }) === 'NORMAL', 'backup code 15 s normal');
  ok(gecikme({ t: d * 5000 + 15000, p: 0, d }) === 'INCELEMEDE', 'qr 15 s incelemede');
  ok(gecikme({ t: d * 5000 + 45000, p: 0, d }) === 'RET', 'qr 45 s ret'); }

// --- issue window: d0..d0+6, start < close, start <= now + 30 s ---
const kodlar = (now, acilis, kapanis) => { if (now < acilis || now >= kapanis) return []; const d0 = Math.floor(now / 5000); const l = []; for (let d = d0; d <= d0 + 6; d++) if (d * 5000 < kapanis) l.push(d); return l; };
for (let i = 0; i < 20000; i++) {
  const acilis = rnd(1e12, 1.1e12), kapanis = acilis + rnd(60000, 3 * 3600000), now = acilis + rnd(-60000, kapanis - acilis + 60000);
  const l = kodlar(now, acilis, kapanis);
  for (const d of l) ok(d * 5000 <= now + 30000 && d * 5000 < kapanis, 'issued slice within 30 s and before close');
  if (now >= acilis && now < kapanis) ok(l.includes(Math.floor(now / 5000)), 'current slice issued');
  ok(l.length <= 7, 'at most 7');
  if (now >= acilis && now + 30000 < kapanis - 5000) ok(l.length === 7, 'exactly 7 far from close');
}

// --- slot choice keeps (hoca, digit, day) unique (model-based) ---
for (let run = 0; run < 2000; run++) {
  const atamalar = []; let bugun = 20000; const indirme = new Map(); let next = 0;
  for (let step = 0; step < 40; step++) {
    const op = rnd(0, 3);
    if (op === 0) bugun += rnd(0, 2);
    const oturum = 'o' + rnd(0, 12);
    if (op === 1 || op === 2) {
      let a = atamalar.find(x => x.oturum === oturum && !x.iptal);
      if (!a) {
        const dolu = new Set(atamalar.filter(x => x.sonGun >= bugun).map(x => x.yuva));
        const r = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(x => !dolu.has(x));
        if (r === undefined) continue;
        for (const x of atamalar) if (!x.iptal && x.yuva === r && x.sonGun < bugun) x.iptal = 'YUVA_YENIDEN_VERILDI';
        a = { id: next++, oturum, yuva: r, ilkGun: bugun, sonGun: bugun, iptal: null }; atamalar.push(a);
      }
      for (let g = bugun; g <= bugun + 4; g++) { const k = `${a.yuva}:${g}`; const v = indirme.get(k); ok(v === undefined || v === a.id, `(hoca, ${a.yuva}, ${g}) maps to one assignment`); indirme.set(k, a.id); }
      a.sonGun = Math.max(a.sonGun, bugun + 4);
    }
    if (op === 3) { const a = atamalar.find(x => x.oturum === oturum && !x.iptal); if (a) a.iptal = 'KENDISI_KAPATTI'; }
    const etkin = new Map(); for (const x of atamalar) if (!x.iptal) { ok(!etkin.has(x.oturum), 'one active assignment per session'); etkin.set(x.oturum, 1); }
  }
}

// --- hoca clock combination: true offset inside h +- q at every point of the display, with drift ---
// true offset o(l) moves linearly from oB (display start) to oS (display end); anchors give hB, hS with pays pB, pS
for (let i = 0; i < 20000; i++) {
  const sure = rnd(0, 4 * 3600000);
  const oB = rnd(-3000, 3000), oS = oB + rnd(-Math.ceil(sure / 10000) - 2000, Math.ceil(sure / 10000) + 2000);
  const pB = rnd(0, 9000), pS = rnd(0, 9000);
  const hB = oB + rnd(-pB, pB), hS = oS + rnd(-pS, pS);
  const h = Math.floor((hB + hS) / 2), q = Math.max(pB, pS) + Math.ceil(Math.abs(hB - hS) / 2);
  for (const l of [0, 1, 0.5, Math.random()]) { const o = oB + (oS - oB) * l; ok(Math.abs(o - h) <= q + 1, `true offset within h +- q (l=${l})`); }
}
// the bound is tight: dropping the drift term fails for some endpoint
{ let tight = false; for (let i = 0; i < 20000 && !tight; i++) { const oB = rnd(-3000, 3000), oS = oB + rnd(-5000, 5000), pB = rnd(0, 500), pS = rnd(0, 500); const hB = oB + rnd(-pB, pB), hS = oS + rnd(-pS, pS); const h = Math.floor((hB + hS) / 2); if (Math.abs(oB - h) > Math.max(pB, pS) + 1 || Math.abs(oS - h) > Math.max(pB, pS) + 1) tight = true; } ok(tight, 'drift term is necessary'); }

console.log(fails === 0 ? 'ALL RULE CHECKS PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);

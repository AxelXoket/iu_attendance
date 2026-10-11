// Prototype of the D04 core rules, used only to check the formulas written into spec/D04.json.
// Not product code. Run: node core-proto.js
'use strict';
const crypto = require('crypto');

const KAYMA_BOLEN = 10000; // 100 ppm = 1/10000
const kayma = x => Math.ceil(x / KAYMA_BOLEN);
const GUN = 86400000, YEDI_GUN = 7 * GUN, ISTEK_EN_COK = 10000;

// yon 'ileri' = first anchor (event after belge), 'geri' = second anchor (event before belge)
function capaAraligi({ belgeSaatiMs: S, istekSuresiMs: q, gecenMs: g, yon }) {
  const E = yon === 'ileri' ? S + g : S - g;
  return { altMs: E - kayma(g), ustMs: E + q + kayma(g + q), tahminMs: E, payMs: q + kayma(g) };
}

// window membership, [A, C) half open, interval closed, student favourable intersection
function pencereIcindeMi(a, p) {
  if (a.altMs < p.kapanisMs && a.ustMs >= p.acilisMs) return 'icinde';
  if (a.altMs < p.enGecKapanisMs && a.ustMs >= p.acilisMs) return 'dilimde';
  return 'disinda';
}

function pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler }) {
  const plan = d0 == null ? B : Math.min(A + d0 * 60000, B);
  let C = plan, sure = d0, enGec = plan;
  const sirali = [...degisiklikler].sort((x, y) => x.basmaUstMs - y.basmaUstMs || (x.kurulumId < y.kurulumId ? -1 : x.kurulumId > y.kurulumId ? 1 : 0) || x.siraNo - y.siraNo || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const etkiler = [];
  for (const c of sirali) {
    const once = C;
    const gecmis = Math.min(C, c.basmaUstMs); // the part of the window already lived at press time
    if (c.tur === 'pencere_suresi') {
      const hedef = c.yeniSureDk == null ? B : Math.min(A + c.yeniSureDk * 60000, B);
      C = Math.min(Math.max(hedef, gecmis), B);
      sure = c.yeniSureDk;
    } else {
      C = Math.max(A, gecmis);
    }
    enGec = Math.max(enGec, C);
    etkiler.push({ id: c.id, onceMs: once, sonraMs: C, etkili: once !== C });
  }
  return { acilisMs: A, planlananKapanisMs: plan, kapanisMs: C, enGecKapanisMs: enGec, sureDk: sure, sureSecildi: sure != null, etkiler };
}

// ---- random check 1: anchor intervals always contain the true event time
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
let fail = 0;
for (let i = 0; i < 200000; i++) {
  const ppm = (Math.random() * 2 - 1) * 100e-6; // phone counter drift within +-100 ppm
  const T0 = 1.79e12 + rnd(0, 1e9);             // real time when phone sends belge request
  const qReal = rnd(0, ISTEK_EN_COK);           // real request duration
  const S = T0 + rnd(0, qReal);                 // server writes its time somewhere inside
  const qMono = Math.round(qReal * (1 + ppm));  // phone measured request duration
  const gReal = rnd(0, YEDI_GUN);
  // first anchor: event gReal after response receipt
  const T1 = T0 + qReal, te = T1 + gReal, gMono = Math.round(gReal * (1 + ppm));
  if (qMono > ISTEK_EN_COK) continue;
  const a1 = capaAraligi({ belgeSaatiMs: S, istekSuresiMs: qMono, gecenMs: gMono, yon: 'ileri' });
  if (!(a1.altMs <= te && te <= a1.ustMs)) { fail++; if (fail < 5) console.log('ileri miss', { S, qReal, qMono, gReal, gMono, te, a1 }); }
  // second anchor: event gReal before belge response receipt
  const te2 = T1 - gReal; const a2 = capaAraligi({ belgeSaatiMs: S, istekSuresiMs: qMono, gecenMs: gMono, yon: 'geri' });
  if (!(a2.altMs <= te2 && te2 <= a2.ustMs)) { fail++; if (fail < 5) console.log('geri miss', { S, qReal, qMono, gReal, gMono, te2, a2 }); }
}
console.log('interval containment failures:', fail);

// ---- random check 2: window recompute independent of arrival order, and no retroactive shrink
fail = 0;
for (let i = 0; i < 20000; i++) {
  const A = 1.79e12, B = A + rnd(30, 240) * 60000, d0 = Math.random() < 0.3 ? null : rnd(1, (B - A) / 60000);
  const n = rnd(1, 5), ch = [];
  for (let k = 0; k < n; k++) {
    const p = A + rnd(-20, 300) * 60000 + rnd(0, 59999);
    ch.push({ id: 'id' + k, kurulumId: 'k' + rnd(1, 2), siraNo: rnd(1, 50), tur: Math.random() < 0.5 ? 'erken_kapatma' : 'pencere_suresi', yeniSureDk: Math.random() < 0.2 ? null : rnd(1, (B - A) / 60000), basmaUstMs: p });
  }
  const r1 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler: ch });
  const r2 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler: [...ch].reverse() });
  if (r1.kapanisMs !== r2.kapanisMs || r1.enGecKapanisMs !== r2.enGecKapanisMs || r1.sureDk !== r2.sureDk) fail++;
  if (!(A <= r1.kapanisMs && r1.kapanisMs <= B && r1.kapanisMs <= r1.enGecKapanisMs && r1.planlananKapanisMs <= r1.enGecKapanisMs)) fail++;
  // no retroactive shrink: after each step C >= min(previous C, press time)
  for (const e of r1.etkiler) { const c = ch.find(x => x.id === e.id); if (e.sonraMs < Math.min(e.onceMs, c.basmaUstMs) && e.sonraMs !== A) fail++; }
}
console.log('window recompute failures:', fail);

// ---- worked examples for the spec
const iso = ms => new Date(ms).toISOString();
const S = Date.UTC(2026, 9, 5, 6, 0, 0, 0); // 2026-10-05 09:00 Istanbul
const ex1 = capaAraligi({ belgeSaatiMs: S, istekSuresiMs: 300, gecenMs: 420000, yon: 'ileri' });
console.log('ornek ilk capa', iso(ex1.altMs), iso(ex1.ustMs), 'pay', ex1.payMs);
console.log('kayma 1 gun', kayma(GUN), 'kayma 7 gun', kayma(YEDI_GUN));
const A = Date.UTC(2026, 9, 5, 6, 0, 0, 0), B = Date.UTC(2026, 9, 5, 8, 0, 0, 0);
const w = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: 15, degisiklikler: [{ id: 'x', kurulumId: 'k', siraNo: 7, tur: 'erken_kapatma', basmaUstMs: A + 8 * 60000 + 400 }] });
console.log('ornek pencere', iso(w.planlananKapanisMs), iso(w.kapanisMs), iso(w.enGecKapanisMs));
console.log('09:10 kaydi', pencereIcindeMi({ altMs: A + 600000, ustMs: A + 600350 }, w), '09:05 kaydi', pencereIcindeMi({ altMs: A + 300000, ustMs: A + 300350 }, w), '09:20 kaydi', pencereIcindeMi({ altMs: A + 1200000, ustMs: A + 1200350 }, w));
// reversed order example: shorten to 10 at 09:05, extend to 20 at 09:07, arrive reversed
const w2 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: 15, degisiklikler: [
  { id: 'b', kurulumId: 'k', siraNo: 9, tur: 'pencere_suresi', yeniSureDk: 20, basmaUstMs: A + 7 * 60000 },
  { id: 'a', kurulumId: 'k', siraNo: 8, tur: 'pencere_suresi', yeniSureDk: 10, basmaUstMs: A + 5 * 60000 }] });
console.log('ters sira ornegi', iso(w2.kapanisMs), 'enGec', iso(w2.enGecKapanisMs));
// shorten below elapsed: at 09:12 set 5 min -> closes at 09:12
const w3 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: 15, degisiklikler: [{ id: 'c', kurulumId: 'k', siraNo: 1, tur: 'pencere_suresi', yeniSureDk: 5, basmaUstMs: A + 12 * 60000 }] });
console.log('gecmise islemez ornegi', iso(w3.kapanisMs));
// after close extension at 09:30 to 45 min
const w4 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: 15, degisiklikler: [{ id: 'd', kurulumId: 'k', siraNo: 1, tur: 'pencere_suresi', yeniSureDk: 45, basmaUstMs: A + 30 * 60000 }] });
console.log('kapandiktan sonra uzatma', iso(w4.kapanisMs));
// shorten after close: at 09:30 set 10 -> no effect
const w5 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: 15, degisiklikler: [{ id: 'e', kurulumId: 'k', siraNo: 1, tur: 'pencere_suresi', yeniSureDk: 10, basmaUstMs: A + 30 * 60000 }] });
console.log('kapandiktan sonra kisaltma', iso(w5.kapanisMs));

// ---- belge layout and a golden example
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function belgeUret({ anahtar, kid, ozneTuru, ozneUuid, deger, sunucuSaatiMs }) {
  const b = Buffer.alloc(82);
  b[0] = 1;
  Buffer.from(kid, 'ascii').copy(b, 1);
  b[9] = ozneTuru;
  Buffer.from(ozneUuid.replace(/-/g, ''), 'hex').copy(b, 10);
  deger.copy(b, 26);
  b.writeUInt32BE(Math.floor(sunucuSaatiMs / 2 ** 32), 42);
  b.writeUInt32BE(sunucuSaatiMs >>> 0, 46);
  crypto.createHmac('sha256', anahtar).update(b.subarray(0, 50)).digest().copy(b, 50);
  return b64u(b);
}
const ornek = belgeUret({ anahtar: Buffer.alloc(32, 7), kid: 'sb-2027b', ozneTuru: 1, ozneUuid: '01928f6e-7c1a-7b3e-9a40-1b2c3d4e5f60', deger: Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'), sunucuSaatiMs: S });
console.log('ornek belge', ornek, ornek.length);
console.log('deger uzunlugu', b64u(Buffer.alloc(16)).length);

// Prototype of the round-2 D04 core rules, used only to check the examples written into spec/D04.json.
// Not product code. Run: node core-proto2.js
// New rules: effective press time is monotone per installation (sira order), moved sessions ignore
// changes pressed before the move, record-time duration setting, old-program windows.
'use strict';
const assert = require('assert');
const DK = 60000;

function etkinBasma(degisiklikler) {
  // p' = max(p, p' of the previous change of the same installation in sira order)
  const byK = new Map();
  for (const c of degisiklikler) { if (!byK.has(c.kurulumId)) byK.set(c.kurulumId, []); byK.get(c.kurulumId).push(c); }
  const out = new Map();
  for (const list of byK.values()) {
    list.sort((a, b) => a.siraNo - b.siraNo);
    let prev = -Infinity;
    for (const c of list) { prev = Math.max(c.basmaUstMs, prev); out.set(c.id, prev); }
  }
  return out;
}

function pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler, tasimaMs = null, sinir = null }) {
  const pE = etkinBasma(degisiklikler);
  const plan = d0 == null ? B : Math.min(A + d0 * DK, B);
  let C = plan, sure = d0, enGec = plan;
  const kullan = c => (tasimaMs == null || pE.get(c.id) >= tasimaMs)
    && (sinir == null || ((sinir.basmaUstMsEnCok == null || pE.get(c.id) <= sinir.basmaUstMsEnCok) && (sinir.ulasmaMsEnCok == null || c.ulasmaMs <= sinir.ulasmaMsEnCok)));
  const sirali = degisiklikler.filter(kullan).sort((x, y) => pE.get(x.id) - pE.get(y.id) || (x.kurulumId < y.kurulumId ? -1 : x.kurulumId > y.kurulumId ? 1 : 0) || x.siraNo - y.siraNo || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const etkiler = [];
  for (const c of sirali) {
    const once = C, p = pE.get(c.id);
    const gecmis = Math.min(C, p);
    if (c.tur === 'PENCERE_SURESI') {
      const hedef = c.yeniSureDk == null ? B : Math.min(A + c.yeniSureDk * DK, B);
      C = Math.min(Math.max(hedef, gecmis), B);
      sure = c.yeniSureDk;
    } else C = Math.max(A, gecmis);
    enGec = Math.max(enGec, C);
    etkiler.push({ id: c.id, onceMs: once, sonraMs: C, etkili: once !== C, etkinBasmaMs: p });
  }
  for (const c of degisiklikler) if (!kullan(c)) etkiler.push({ id: c.id, onceMs: null, sonraMs: null, etkili: false, etkinBasmaMs: pE.get(c.id) });
  return { planlananKapanisMs: plan, kapanisMs: C, enGecKapanisMs: enGec, sureDk: sure, sureSecildi: sure != null, etkiler };
}

const kesisir = (a, alt, ust) => a.altMs < ust && a.ustMs >= alt;
function pencereIcindeMi(a, p) {
  if (kesisir(a, p.acilisMs, p.kapanisMs)) return 'ICINDE';
  if (kesisir(a, p.acilisMs, p.enGecKapanisMs)) return 'DEGISIM_DILIMI';
  return 'DISINDA';
}

// whole pencereSonucu, as the server composes it from core calls
function pencereSonucu({ oturum, degisiklikler, programlar, kayit }) {
  // oturum: current { acilisMs, dersBitisMs, dersSuresiDk, tasimaMs }; programlar: previous programs in time order
  // [{ acilisMs, dersBitisMs, dersSuresiDk, tasimaMs (when it was replaced) }]
  const simdiki = pencereHesapla({ ...oturum, degisiklikler });
  let sonuc = pencereIcindeMi(kayit, { acilisMs: oturum.acilisMs, ...simdiki });
  let eski = null;
  if (sonuc === 'DISINDA') {
    let oncekiTasima = null;
    for (const pr of programlar) {
      const ilgili = degisiklikler.filter(c => { const p = etkinBasma(degisiklikler).get(c.id); return p < pr.tasimaMs && (oncekiTasima == null || p >= oncekiTasima); });
      const w = pencereHesapla({ acilisMs: pr.acilisMs, dersBitisMs: pr.dersBitisMs, dersSuresiDk: pr.dersSuresiDk, degisiklikler: ilgili });
      if (kesisir(kayit, pr.acilisMs, w.enGecKapanisMs)) { eski = pr; sonuc = 'ESKI_PROGRAM'; break; }
      oncekiTasima = pr.tasimaMs;
    }
  }
  const anlik = pencereHesapla({ ...oturum, degisiklikler, sinir: { basmaUstMsEnCok: kayit.ustMs, ulasmaMsEnCok: kayit.ulasmaMs } });
  return { sonuc, kayitAnindaSureSecildi: anlik.sureSecildi, kapanisMs: simdiki.kapanisMs, eski };
}

const T = (h, m, s = 0, ms = 0) => Date.UTC(2026, 9, 5, h - 3, m, s, ms); // Istanbul clock on 2026-10-05
const ist = ms => new Date(ms + 3 * 3600000).toISOString().slice(11, 23);
const kayitAt = (h, m, ulasma) => ({ altMs: T(h, m), ustMs: T(h, m, 0, 350), ulasmaMs: ulasma });

// 1. same installation, stale document makes the first change look later than the second
{
  const ch = [
    { id: 'a', kurulumId: 'k1', siraNo: 1, tur: 'PENCERE_SURESI', yeniSureDk: 5, basmaUstMs: T(9, 5, 20), ulasmaMs: T(9, 6) },
    { id: 'b', kurulumId: 'k1', siraNo: 2, tur: 'PENCERE_SURESI', yeniSureDk: 30, basmaUstMs: T(9, 5, 5), ulasmaMs: T(9, 6) },
  ];
  const w = pencereHesapla({ acilisMs: T(9, 0), dersBitisMs: T(11, 0), dersSuresiDk: 15, degisiklikler: ch });
  console.log('1 ayni kurulum sira duzeni: kapanis', ist(w.kapanisMs));
  assert.strictEqual(w.kapanisMs, T(9, 30));
  // without the monotone rule the result would close near 09:05:20
  const eski = { ...w }; void eski;
}

// 2a. record-time setting: no duration chosen, teacher picks 10 min at 09:30, record made 09:05 arrives 10:00
{
  const ch = [{ id: 'c', kurulumId: 'k', siraNo: 1, tur: 'PENCERE_SURESI', yeniSureDk: 10, basmaUstMs: T(9, 30), ulasmaMs: T(9, 31) }];
  const r = pencereSonucu({ oturum: { acilisMs: T(9, 0), dersBitisMs: T(11, 0), dersSuresiDk: null, tasimaMs: null }, degisiklikler: ch, programlar: [], kayit: kayitAt(9, 5, T(10, 0)) });
  console.log('2a kayittan sonra sure secildi:', r.sonuc, 'kayitAnindaSureSecildi', r.kayitAnindaSureSecildi, 'kapanis', ist(r.kapanisMs));
  assert.deepStrictEqual([r.sonuc, r.kayitAnindaSureSecildi, r.kapanisMs], ['ICINDE', false, T(9, 30)]);
}
// 2b. duration 15, teacher removes it (ders boyunca) at 09:10, record 09:05
{
  const ch = [{ id: 'd', kurulumId: 'k', siraNo: 1, tur: 'PENCERE_SURESI', yeniSureDk: null, basmaUstMs: T(9, 10), ulasmaMs: T(9, 11) }];
  const r = pencereSonucu({ oturum: { acilisMs: T(9, 0), dersBitisMs: T(11, 0), dersSuresiDk: 15, tasimaMs: null }, degisiklikler: ch, programlar: [], kayit: kayitAt(9, 5, T(9, 6)) });
  console.log('2b kayittan sonra sure kaldirildi:', r.sonuc, r.kayitAnindaSureSecildi, ist(r.kapanisMs));
  assert.deepStrictEqual([r.sonuc, r.kayitAnindaSureSecildi, r.kapanisMs], ['ICINDE', true, T(11, 0)]);
}
// 2c. change pressed 09:02 (before the record) but reached the server 10:30, after the record (arrived 09:06)
{
  const ch = [{ id: 'e', kurulumId: 'k', siraNo: 1, tur: 'PENCERE_SURESI', yeniSureDk: 20, basmaUstMs: T(9, 2), ulasmaMs: T(10, 30) }];
  const r = pencereSonucu({ oturum: { acilisMs: T(9, 0), dersBitisMs: T(11, 0), dersSuresiDk: null, tasimaMs: null }, degisiklikler: ch, programlar: [], kayit: kayitAt(9, 5, T(9, 6)) });
  console.log('2c kayittan once basilan ama sonra ulasan:', r.sonuc, r.kayitAnindaSureSecildi, ist(r.kapanisMs));
  assert.deepStrictEqual([r.sonuc, r.kayitAnindaSureSecildi], ['ICINDE', false]);
}

// 3. moved session: 09:00-11:00 moved at 08:00 to 14:00-16:00, duration 15
{
  const oturum = { acilisMs: T(14, 0), dersBitisMs: T(16, 0), dersSuresiDk: 15, tasimaMs: T(8, 0) };
  const programlar = [{ acilisMs: T(9, 0), dersBitisMs: T(11, 0), dersSuresiDk: 15, tasimaMs: T(8, 0) }];
  const a = pencereSonucu({ oturum, degisiklikler: [], programlar, kayit: kayitAt(9, 5, T(9, 30)) });
  const b = pencereSonucu({ oturum, degisiklikler: [], programlar, kayit: kayitAt(14, 5, T(14, 6)) });
  const c = pencereSonucu({ oturum, degisiklikler: [], programlar, kayit: kayitAt(12, 0, T(12, 1)) });
  const d = pencereSonucu({ oturum, degisiklikler: [], programlar, kayit: kayitAt(9, 20, T(9, 30)) });
  console.log('3 tasinan oturum: 09:05', a.sonuc, '14:05', b.sonuc, '12:00', c.sonuc, '09:20', d.sonuc);
  assert.deepStrictEqual([a.sonuc, b.sonuc, c.sonuc, d.sonuc], ['ESKI_PROGRAM', 'ICINDE', 'DISINDA', 'DISINDA']);
}

// 4. early close pressed 08:55 for the 09:00 program, session moved at 10:00 to 14:00
{
  const ch = [{ id: 'f', kurulumId: 'k', siraNo: 1, tur: 'ERKEN_KAPATMA', yeniSureDk: null, basmaUstMs: T(8, 55), ulasmaMs: T(8, 56) }];
  const yeni = pencereHesapla({ acilisMs: T(14, 0), dersBitisMs: T(16, 0), dersSuresiDk: 15, degisiklikler: ch, tasimaMs: T(10, 0) });
  const tasimasiz = pencereHesapla({ acilisMs: T(14, 0), dersBitisMs: T(16, 0), dersSuresiDk: 15, degisiklikler: ch });
  console.log('4 tasinan oturumda onceki erken kapatma: yeni kapanis', ist(yeni.kapanisMs), 'etkili', yeni.etkiler[0].etkili, '| kural olmasa', ist(tasimasiz.kapanisMs));
  assert.strictEqual(yeni.kapanisMs, T(14, 15));
  assert.strictEqual(tasimasiz.kapanisMs, T(14, 0));
}

// 5. random: order independence and bounds with the monotone rule
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
let fail = 0;
for (let i = 0; i < 20000; i++) {
  const A = T(9, 0), B = A + rnd(30, 240) * DK, d0 = Math.random() < 0.3 ? null : rnd(1, (B - A) / DK);
  const n = rnd(1, 6), ch = [];
  for (let k = 0; k < n; k++) ch.push({ id: 'id' + k, kurulumId: 'k' + rnd(1, 2), siraNo: k + 1, tur: Math.random() < 0.5 ? 'ERKEN_KAPATMA' : 'PENCERE_SURESI', yeniSureDk: Math.random() < 0.2 ? null : rnd(1, (B - A) / DK), basmaUstMs: A + rnd(-20, 300) * DK + rnd(0, 59999), ulasmaMs: 0 });
  const r1 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler: ch });
  const sh = [...ch].sort(() => Math.random() - 0.5);
  const r2 = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler: sh });
  if (r1.kapanisMs !== r2.kapanisMs || r1.enGecKapanisMs !== r2.enGecKapanisMs || r1.sureDk !== r2.sureDk) fail++;
  if (!(A <= r1.kapanisMs && r1.kapanisMs <= r1.enGecKapanisMs && r1.enGecKapanisMs <= B && r1.planlananKapanisMs <= r1.enGecKapanisMs)) fail++;
  // same-installation property: result equals applying that installation's changes in sira order
  const tek = ch.filter(c => c.kurulumId === 'k1');
  if (tek.length) {
    const sirada = pencereHesapla({ acilisMs: A, dersBitisMs: B, dersSuresiDk: d0, degisiklikler: tek });
    const order = sirada.etkiler.filter(e => e.onceMs != null).map(e => e.id);
    const want = [...tek].sort((a, b) => a.siraNo - b.siraNo).map(c => c.id);
    if (JSON.stringify(order) !== JSON.stringify(want)) fail++;
  }
}
console.log('5 random order and sira property failures:', fail);
assert.strictEqual(fail, 0);

// 6. Istanbul DST-era vectors given in the finding (tz database, full ICU)
const istanbulAni = (y, mo, d, h, mi) => {
  // brute force over candidate offsets with Intl, the way infra/saat would verify
  for (const off of [2, 3, 4]) {
    const t = Date.UTC(y, mo - 1, d, h - off, mi);
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t));
    if (f === `${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}, ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`) return new Date(t).toISOString();
  }
  return null;
};
console.log('6 2015-07-01 12:00 ->', istanbulAni(2015, 7, 1, 12, 0), '| 2015-12-01 12:00 ->', istanbulAni(2015, 12, 1, 12, 0), '| 2026-10-05 00:00 ->', istanbulAni(2026, 10, 5, 0, 0));
assert.strictEqual(istanbulAni(2015, 7, 1, 12, 0), '2015-07-01T09:00:00.000Z');
assert.strictEqual(istanbulAni(2015, 12, 1, 12, 0), '2015-12-01T10:00:00.000Z');
console.log('all examples hold');

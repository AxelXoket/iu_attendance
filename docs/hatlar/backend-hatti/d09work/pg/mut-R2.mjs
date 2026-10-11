// Reference implementation of the D09 pure rules exactly as the spec text states them, plus seeded
// property runs. Purpose: prove the rule text is self-consistent before builders implement it.
// Usage: node rules-check.mjs   (exit 1 on any violated property)
const KATALOG = {
  GOREVLENDIRME: { sonDurum: 'GOREVLI', harf: 'G', sinif: 'MAZERETLI', belge: true, turler: ['TEORI', 'UYGULAMA'], kuyruk: false },
  OGRENCI_ISLERI_YAZISI: { sonDurum: 'BELGELI_DUZELTME', harf: 'B', sinif: 'MAZERETLI', belge: true, turler: ['TEORI'], kuyruk: false },
  KURUL_KARARI: { sonDurum: 'BELGELI_DUZELTME', harf: 'B', sinif: 'MAZERETLI', belge: true, turler: ['TEORI', 'UYGULAMA'], kuyruk: false },
  BEYANA_DAYALI: { sonDurum: 'ELLE_EKLENDI', harf: 'E', sinif: 'VAR', belge: false, turler: ['TEORI', 'UYGULAMA'], kuyruk: false },
  TELEFON_YOK_CALISMIYOR: { sonDurum: 'ELLE_EKLENDI', harf: 'E', sinif: 'VAR', belge: false, turler: ['TEORI', 'UYGULAMA'], kuyruk: true },
  QR_OKUTAMADI: { sonDurum: 'ELLE_EKLENDI', harf: 'E', sinif: 'VAR', belge: false, turler: ['TEORI', 'UYGULAMA'], kuyruk: true }
};
class ZincirHatasi extends Error {}

// Chain: one root, at most one successor per row, every onceki inside the set. Tail = row nobody points at.
function zincirSonu(rows) {
  if (rows.length === 0) return null;
  const byId = new Map(rows.map(r => [r.id, r]));
  const roots = rows.filter(r => r.oncekiDuzeltmeId === null);
  if (roots.length !== 1) throw new ZincirHatasi('zincir başı ' + roots.length);
  const succ = new Map();
  for (const r of rows) if (r.oncekiDuzeltmeId !== null) {
    if (!byId.has(r.oncekiDuzeltmeId)) throw new ZincirHatasi('kayıp önceki');
    if (succ.has(r.oncekiDuzeltmeId)) throw new ZincirHatasi('dal');
    succ.set(r.oncekiDuzeltmeId, r);
  }
  let cur = roots[0], n = 1;
  while (succ.has(cur.id)) { cur = succ.get(cur.id); n++; }
  if (n !== rows.length) throw new ZincirHatasi('kopuk satır');
  return cur;
}

function sonDurumOnceligi(kayitlar, duzeltmeler, oturum) {
  const bos = { var: 0, yok: 0, mazeretli: 0, acik: 0 };
  if (oturum.yapildi === false) return { sonDurum: null, harf: null, gecici: false, kaynak: 'YAPILMADI', etkinDuzeltmeId: null, oturumOnayBekliyor: false, teori: { ...bos }, uygulama: { ...bos } };
  const sayilan = kayitlar.find(k => k.sayilan && k.karar === 'VAR');
  const acikVar = kayitlar.some(k => k.karar === 'BEKLEMEDE' || k.karar === 'INCELEMEDE');
  const R = sayilan ? 'VAR' : 'YOK';
  const rGecici = !!sayilan && sayilan.kendiBeyani && !sayilan.onayli;
  const sinifR = R === 'VAR' ? 'var' : R === 'ACIK' ? 'acik' : 'yok';
  const tail = zincirSonu(duzeltmeler);
  const etkin = tail && tail.tur === 'DUZELTME' ? tail : null;
  const dagit = (toplam, kapsanan, sinifD) => {
    if (kapsanan > toplam) throw new RangeError('düzeltme oturumu aşıyor');
    const d = { ...bos }; d[sinifD] += kapsanan; d[sinifR] += toplam - kapsanan; return d;
  };
  if (!etkin) {
    const d = (t) => ({ ...bos, [sinifR]: t });
    return { sonDurum: R === 'VAR' ? 'VAR' : R === 'ACIK' ? null : 'YOK', harf: R === 'VAR' ? 'V' : R === 'ACIK' ? null : 'Y', gecici: rGecici,
      kaynak: R === 'YOK' && kayitlar.length === 0 ? 'KAYITSIZ' : 'KAYIT', etkinDuzeltmeId: null, oturumOnayBekliyor: oturum.yapildi === null,
      teori: d(oturum.teoriSaat), uygulama: d(oturum.uygulamaSaat) };
  }
  const k = KATALOG[etkin.sebepKodu];
  const sinifD = k.sinif === 'MAZERETLI' ? 'mazeretli' : 'var';
  const teori = dagit(oturum.teoriSaat, etkin.teoriSaat, sinifD), uygulama = dagit(oturum.uygulamaSaat, etkin.uygulamaSaat, sinifD);
  const kapsanmayan = oturum.teoriSaat - etkin.teoriSaat + oturum.uygulamaSaat - etkin.uygulamaSaat;
  return { sonDurum: k.sonDurum, harf: k.harf, gecici: rGecici && kapsanmayan > 0, kaynak: 'DUZELTME', etkinDuzeltmeId: etkin.id, oturumOnayBekliyor: oturum.yapildi === null, teori, uygulama };
}

// Report window: 72 h from start; start = delivery of the seen decision version, else arrival; no record: session end.
const H72 = 72 * 3600e3;
function sorunSuresi({ kayitVar, kararSurumuVar, teslimAni, ulasmaAni, oturumBitisAni, istemciAni }) {
  const baslangic = kayitVar ? (kararSurumuVar && teslimAni !== null ? teslimAni : ulasmaAni) : oturumBitisAni;
  const bitis = baslangic + H72;
  const an = istemciAni ?? ulasmaAni;
  return { baslangic, bitis, durum: an < bitis ? 'ACIK' : 'SURE_DISI' };
}

// Batch: critical first, then session start, waiting start, item type, id; first N.
const TUR_SIRA = { INCELEME: 0, SORUN_BILDIRIMI: 1, ISARETLI_OTURUM: 2 };
function partiSec(adaylar, boy, kesim) {
  return adaylar.filter(a => a.beklemeBaslangic < kesim).slice().sort((a, b) =>
    (b.kritik - a.kritik) || (a.oturumBaslangic - b.oturumBaslangic) || (a.beklemeBaslangic - b.beklemeBaslangic) || (TUR_SIRA[a.tur] - TUR_SIRA[b.tur]) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  ).slice(0, boy).map((a, i) => ({ ...a, sira: i + 1 }));
}

// ---- seeded PRNG ----
let seed = 20261006;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[ri(0, arr.length - 1)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let fails = 0; const fail = (p, msg, ex) => { fails++; if (fails < 10) console.log('FAIL ' + p + ': ' + msg, JSON.stringify(ex).slice(0, 400)); };

// Random valid chain built with the same operations the endpoints allow.
function randomChain(T, U) {
  const rows = []; let n = ri(0, 6); let id = 0;
  for (let i = 0; i < n; i++) {
    const tail = rows.length ? rows[rows.length - 1] : null;
    if (tail && tail.tur === 'DUZELTME' && rnd() < 0.35) rows.push({ id: 'd' + (++id), tur: 'GERI_ALMA', sebepKodu: null, teoriSaat: null, uygulamaSaat: null, oncekiDuzeltmeId: tail.id });
    else {
      const kod = pick(Object.keys(KATALOG)); const k = KATALOG[kod];
      let t = ri(0, T), u = k.turler.includes('UYGULAMA') ? ri(0, U) : 0;
      if (t + u === 0) { if (T > 0) t = 1; else if (k.turler.includes('UYGULAMA') && U > 0) u = 1; else continue; }
      rows.push({ id: 'd' + (++id), tur: 'DUZELTME', sebepKodu: kod, teoriSaat: t, uygulamaSaat: u, oncekiDuzeltmeId: tail ? tail.id : null });
    }
  }
  return rows;
}
const randomKayitlar = () => {
  const n = ri(0, 3); const out = []; let sayilanVar = false;
  for (let i = 0; i < n; i++) {
    const karar = pick(['VAR', 'BEKLEMEDE', 'INCELEMEDE', 'RET']);
    const sayilan = karar === 'VAR' && !sayilanVar && rnd() < 0.8; if (sayilan) sayilanVar = true; // tek sayılan kayıt (kısmi tekil dizin)
    out.push({ sayilan, karar, kendiBeyani: rnd() < 0.3, onayli: rnd() < 0.5 });
  }
  return out;
};

const RUNS = 20000;
for (let i = 0; i < RUNS; i++) {
  const T = ri(0, 3), U = ri(0, 2); if (T + U === 0) continue;
  const oturum = { teoriSaat: T, uygulamaSaat: U, yapildi: pick([true, true, true, null, false]) };
  const kayitlar = randomKayitlar(), duz = randomChain(T, U);
  const r = sonDurumOnceligi(kayitlar, duz, oturum);
  // P1 sum per type equals session hours (0 when not held)
  const sum = d => d.var + d.yok + d.mazeretli + d.acik;
  const expT = oturum.yapildi === false ? 0 : T, expU = oturum.yapildi === false ? 0 : U;
  if (sum(r.teori) !== expT || sum(r.uygulama) !== expU) fail('P1 saat toplamı', 'sum mismatch', { oturum, kayitlar, duz, r });
  // P2 order of inputs does not matter
  const r2 = sonDurumOnceligi(shuffle(kayitlar), shuffle(duz), oturum);
  if (JSON.stringify(r) !== JSON.stringify(r2)) fail('P2 sıra bağımsız', 'permutation changed result', { r, r2 });
  // P3 no effective correction + open decision + nothing counted => empty final state
  const tail = duz.length ? duz[duz.length - 1] : null;
  const etkinYok = !tail || tail.tur === 'GERI_ALMA';
  if (oturum.yapildi !== false && etkinYok && !kayitlar.some(k => k.sayilan) && kayitlar.some(k => k.karar === 'BEKLEMEDE' || k.karar === 'INCELEMEDE') && r.sonDurum !== null) fail('P3 açık karar boş', 'not empty', { kayitlar, duz, r });
  // P4 Ret-only or no record and no correction => Yok
  if (oturum.yapildi !== false && etkinYok && kayitlar.every(k => k.karar === 'RET') && r.sonDurum !== 'YOK') fail('P4 Ret ya da kayıtsız Yok', 'not YOK', { kayitlar, duz, r });
  // P5 effective correction wins and maps to its catalog final state
  if (oturum.yapildi !== false && !etkinYok && r.sonDurum !== KATALOG[tail.sebepKodu].sonDurum) fail('P5 düzeltme kazanır', 'wrong final state', { duz, r });
  // P10 hours the correction does not cover follow the record (Var when a counted record exists)
  if (oturum.yapildi !== false && !etkinYok && kayitlar.some(k => k.sayilan)) {
    const kapsanmayan = T - tail.teoriSaat + U - tail.uygulamaSaat;
    const k = KATALOG[tail.sebepKodu];
    const varBeklenen = (k.sinif === "VAR" ? tail.teoriSaat + tail.uygulamaSaat : 0) + kapsanmayan;
    if (r.teori.var + r.uygulama.var !== varBeklenen) fail("P10 kapsanmayan saat", "uncovered hours not from record", { duz, kayitlar, r });
  }
  // P6 Görevli/Belgeli hours are excused, never present; Elle eklendi hours are present, never excused
  if (oturum.yapildi !== false && !etkinYok) {
    const k = KATALOG[tail.sebepKodu];
    if (k.sinif === 'MAZERETLI' && r.teori.mazeretli + r.uygulama.mazeretli !== tail.teoriSaat + tail.uygulamaSaat) fail('P6 mazeretli', 'excused hours mismatch', { duz, r });
    if (k.sinif === 'VAR' && r.teori.mazeretli + r.uygulama.mazeretli !== 0) fail('P6 elle eklendi', 'excused hours present', { duz, r });
  }
}
// P7 chain guards reject what the database rejects
const bad = [
  [{ id: 'a', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 1, uygulamaSaat: 0, oncekiDuzeltmeId: null }, { id: 'b', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 1, uygulamaSaat: 0, oncekiDuzeltmeId: null }],
  [{ id: 'a', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 1, uygulamaSaat: 0, oncekiDuzeltmeId: null }, { id: 'b', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 1, uygulamaSaat: 0, oncekiDuzeltmeId: 'a' }, { id: 'c', tur: 'GERI_ALMA', sebepKodu: null, teoriSaat: null, uygulamaSaat: null, oncekiDuzeltmeId: 'a' }],
  [{ id: 'b', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 1, uygulamaSaat: 0, oncekiDuzeltmeId: 'x' }]
];
for (const rows of bad) { try { zincirSonu(rows); fail('P7 zincir koruması', 'accepted broken chain', rows); } catch (e) { if (!(e instanceof ZincirHatasi)) fail('P7', 'wrong error ' + e.message, rows); } }
try { sonDurumOnceligi([], [{ id: 'a', tur: 'DUZELTME', sebepKodu: 'BEYANA_DAYALI', teoriSaat: 3, uygulamaSaat: 0, oncekiDuzeltmeId: null }], { teoriSaat: 2, uygulamaSaat: 0, yapildi: true }); fail('P7 saat aşımı', 'accepted', {}); } catch (e) { if (!(e instanceof RangeError)) fail('P7', 'wrong error', {}); }

// P8 report window boundary and missing delivery
for (let i = 0; i < 5000; i++) {
  const start = ri(0, 1e9) * 1000, ulasma = start + ri(0, 200) * 3600e3;
  const at = (dt) => sorunSuresi({ kayitVar: true, kararSurumuVar: true, teslimAni: start, ulasmaAni: ulasma, oturumBitisAni: 0, istemciAni: start + dt });
  if (at(H72 - 1).durum !== 'ACIK' || at(H72).durum !== 'SURE_DISI' || at(H72).bitis - at(H72).baslangic !== H72) fail('P8 sınır', 'boundary wrong', { start });
  const noTeslim = sorunSuresi({ kayitVar: true, kararSurumuVar: true, teslimAni: null, ulasmaAni: ulasma, oturumBitisAni: 0, istemciAni: null });
  if (noTeslim.durum !== 'ACIK') fail('P8 teslim yok', 'must be in window', { ulasma });
  const kayitsiz = sorunSuresi({ kayitVar: false, kararSurumuVar: false, teslimAni: null, ulasmaAni: ulasma, oturumBitisAni: start, istemciAni: start + H72 + 1 });
  if (kayitsiz.baslangic !== start || kayitsiz.durum !== 'SURE_DISI') fail('P8 kayıtsız', 'session end not used', { start });
}

// P9 batch selection: permutation invariant, size bound, critical-first, cutoff respected, rerun identical
for (let i = 0; i < 3000; i++) {
  const kesim = 1000;
  const adaylar = Array.from({ length: ri(0, 40) }, (_, j) => ({ id: 'o' + String(ri(0, 99999)).padStart(5, '0') + j, tur: pick(['INCELEME', 'SORUN_BILDIRIMI', 'ISARETLI_OTURUM']), kritik: rnd() < 0.3 ? 1 : 0, oturumBaslangic: ri(0, 50), beklemeBaslangic: ri(0, 1200) }));
  const a = partiSec(adaylar, 20, kesim), b = partiSec(shuffle(adaylar), 20, kesim), c = partiSec(adaylar, 20, kesim);
  if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(a) !== JSON.stringify(c)) fail('P9 belirlenimli', 'differs', {});
  if (a.length > 20) fail('P9 boy', 'too many', {});
  if (a.some(x => x.beklemeBaslangic >= kesim)) fail('P9 kesim', 'item after cutoff', {});
  const ilkKritikOlmayan = a.findIndex(x => !x.kritik);
  if (ilkKritikOlmayan >= 0 && a.slice(ilkKritikOlmayan).some(x => x.kritik)) fail('P9 kritik önce', 'order', {});
  const uygun = adaylar.filter(x => x.beklemeBaslangic < kesim);
  if (uygun.filter(x => x.kritik).length >= 20 && a.some(x => !x.kritik)) fail('P9 kritik doluluk', 'non-critical while critical left', {});
}
console.log(fails ? `${fails} property violations` : `all properties hold (${RUNS} son durum runs, 5000 window runs, 3000 batch runs)`);
process.exit(fails ? 1 : 0);

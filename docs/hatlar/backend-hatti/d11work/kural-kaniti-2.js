// Executable checks for the rules changed in this fix round (prototype logic, not product code).
// Each block states the claim, checks the fixed rule, and where a bug was claimed shows the old rule failing.
const crypto = require('crypto');
const O = require('./ortak.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// 1. Student record vs display record race under READ COMMITTED (finding: lost BEKLEMEDE).
// Model: student T = [lock?, readG, insertK, commit]; hoca H = [lock?, insertG, updateK, commit].
// A statement sees only rows committed before it starts. Locks: one exclusive key per oturum, held to commit.
function race(withLock) {
  const T = ['lock', 'readG', 'insertK', 'commit'].filter(s => withLock || s !== 'lock');
  const H = ['lock', 'insertG', 'updateK', 'commit'].filter(s => withLock || s !== 'lock');
  const results = [];
  const walk = (i, j, st) => {
    if (i === T.length && j === H.length) { results.push(st); return; }
    const can = (who) => { const s = who === 'T' ? T[i] : H[j]; if (s !== 'lock') return true; return st.holder === null; };
    if (i < T.length && can('T')) {
      const s = T[i], n = { ...st };
      if (s === 'lock') n.holder = 'T';
      if (s === 'readG') n.tSawG = n.gCommitted;
      if (s === 'insertK') n.kUncommitted = n.tSawG ? 'NORMAL' : 'BEKLEMEDE';
      if (s === 'commit') { n.kCommitted = n.kUncommitted; if (n.holder === 'T') n.holder = null; }
      walk(i + 1, j, n);
    }
    if (j < H.length && can('H')) {
      const s = H[j], n = { ...st };
      if (s === 'lock') n.holder = 'H';
      if (s === 'insertG') n.gUncommitted = true;
      if (s === 'updateK') n.hUpdated = n.kCommitted === 'BEKLEMEDE';
      if (s === 'commit') { n.gCommitted = n.gUncommitted; if (n.hUpdated) n.kCommitted = 'NORMAL'; if (n.holder === 'H') n.holder = null; }
      walk(i, j + 1, n);
    }
  };
  walk(0, 0, { holder: null, gCommitted: false, gUncommitted: false, tSawG: false, kUncommitted: null, kCommitted: null, hUpdated: false });
  return results;
}
{ const noLock = race(false), lock = race(true);
  ok(noLock.some(r => r.kCommitted === 'BEKLEMEDE' && r.gCommitted), 'without the key the lost BEKLEMEDE is reachable (finding reproduced)');
  ok(lock.length > 0 && lock.every(r => !(r.kCommitted === 'BEKLEMEDE' && r.gCommitted)), 'with the shared key no interleaving leaves BEKLEMEDE beside a committed display record');
  ok(lock.every(r => r.kCommitted !== null && r.gCommitted), 'every locked interleaving completes'); }

// 2. All advisory keys in one sorted call per transaction: no advisory-only deadlock (round-2 D12 rule; superseded by the layered rule, kural-kaniti-3.js block 2, of which this is the one-call special case).
// Random transactions each take a random key set in one sorted call; a waits-for cycle needs a holder waiting on another key, impossible.
for (let run = 0; run < 3000; run++) {
  const keys = ['projeksiyon:gosterim:a', 'projeksiyon:gosterim:b', 'projeksiyon:ogrenci:s', 'yoklama:cift:a:s', 'yoklama:cift:b:s'];
  const tx = Array.from({ length: rnd(2, 5) }, () => [...new Set(Array.from({ length: rnd(1, 4) }, () => keys[rnd(0, keys.length - 1)]))].sort());
  const pos = tx.map(() => 0), held = new Map();
  let progress = true, steps = 0;
  while (progress && steps++ < 200) {
    progress = false;
    for (let t = 0; t < tx.length; t++) {
      if (pos[t] === tx[t].length) { for (const [k, v] of held) if (v === t) held.delete(k); pos[t]++; progress = true; continue; }
      if (pos[t] > tx[t].length) continue;
      const k = tx[t][pos[t]];
      if (!held.has(k) || held.get(k) === t) { held.set(k, t); pos[t]++; progress = true; }
    }
  }
  ok(pos.every((p, t) => p > tx[t].length), 'sorted single-call acquisition always finishes (no cycle)');
}

// 3. son_dilim = min(dilim(bitis) + 6, dilim(kapanis - 1 ms)) covers every issued slice and no slice that was never issued.
const issued = (now, acilis, kapanis) => { if (now < acilis || now >= kapanis) return []; const d0 = Math.floor(now / 5000); const l = []; for (let d = d0; d <= d0 + 6; d++) if (d * 5000 < kapanis) l.push(d); return l; };
let oldOverreach = 0;
for (let i = 0; i < 20000; i++) {
  const acilis = rnd(1e12, 1.1e12), kapanis = acilis + rnd(60000, 7200000), bitis = Math.max(acilis + 1000, kapanis + rnd(-3600000, 3600000));
  let maxIssued = -Infinity; for (let k = 0; k < 40; k++) { const now = rnd(acilis - 60000, bitis - 1); for (const d of issued(now, acilis, kapanis)) maxIssued = Math.max(maxIssued, d); }
  const yeni = Math.min(Math.floor(bitis / 5000) + 6, Math.floor((kapanis - 1) / 5000));
  const eski = Math.floor(Math.min(bitis, kapanis) / 5000) + 6;
  if (maxIssued > -Infinity) ok(maxIssued <= yeni, `new son_dilim covers every issued slice (${maxIssued} <= ${yeni})`);
  ok(yeni * 5000 < kapanis, 'new son_dilim never starts at or after the window close');
  if (eski * 5000 >= kapanis) oldOverreach++;
}
ok(oldOverreach > 0, 'old formula admits never-issued slices after the close (finding reproduced)');
// bitis_ani = max(event, onay): the bitis check holds even when the programme moved the end before the approval
for (let i = 0; i < 5000; i++) { const onay = rnd(1e12, 1.1e12), olay = onay + rnd(-7200000, 7200000); ok(Math.max(olay, onay) >= onay, 'bitis_ani >= onay_ani'); }

// 4. Pairing code collision path vs the kullanilma_ani CHECK (finding: 500 on used code).
const ck = r => ((r.kullanilma_ani === null) === !['KULLANILDI', 'IKINCI_KULLANIM'].includes(r.durum)) && ((r.kullanilma_ani === null) === (r.hoca_id === null)) && (r.durum !== 'ACIK' || r.kod_ozeti !== null);
const eskiYol = r => ({ ...r, kod_ozeti: null, durum: 'SURESI_DOLDU' });
const yeniYol = r => ({ ...r, kod_ozeti: null, durum: r.durum === 'ACIK' ? 'SURESI_DOLDU' : r.durum });
for (const durum of ['ACIK', 'KULLANILDI', 'IKINCI_KULLANIM']) {
  const r = { durum, kod_ozeti: 'x', kullanilma_ani: durum === 'ACIK' ? null : 1, hoca_id: durum === 'ACIK' ? null : 'h' };
  ok(ck(r), 'seed row valid: ' + durum);
  ok(ck(yeniYol(r)), 'new collision path keeps the CHECK: ' + durum);
  if (durum !== 'ACIK') ok(!ck(eskiYol(r)), 'old collision path breaks the CHECK on ' + durum + ' (finding reproduced)');
}

// 5. Day key from (hoca, digit, day) only: stable across lost rows, distinct per input, purpose-separated.
const hkdf = (k, info) => Buffer.from(crypto.hkdfSync('sha256', k, Buffer.alloc(0), info, 32));
const gunInfo = (hoca, yuva, gun) => { const b = Buffer.alloc(16 + 1 + 4); Buffer.from(hoca.replace(/-/g, ''), 'hex').copy(b, 0); b[16] = yuva; b.writeUInt32BE(gun, 17); return Buffer.concat([Buffer.from('iu-yoklama/qr-gun/v2'), Buffer.from([0]), b]); };
{ const kaynak = crypto.randomBytes(32), hoca = crypto.randomUUID(), hoca2 = crypto.randomUUID();
  const a = hkdf(kaynak, gunInfo(hoca, 3, 20500)), b = hkdf(kaynak, gunInfo(hoca, 3, 20500));
  ok(a.equals(b), 'same (hoca, digit, day) gives the same key without any server row');
  ok(!a.equals(hkdf(kaynak, gunInfo(hoca, 4, 20500))) && !a.equals(hkdf(kaynak, gunInfo(hoca, 3, 20501))) && !a.equals(hkdf(kaynak, gunInfo(hoca2, 3, 20500))), 'digit, day and hoca each change the key');
  ok(!a.equals(hkdf(crypto.randomBytes(32), gunInfo(hoca, 3, 20500))), 'another kid gives another key (verification tries every kid)'); }

// 6. qrKilitAnahtarlari as of round 2 (exclusive key, waiting records only). Superseded: the current rule (shared key, also Bluetooth and
// location) is ortak.js qrKilitAnahtarlari, checked in kural-kaniti-3.js block 3. Kept to show the round-2 claim still held for its rule.
function qrKilitAnahtarlari({ oturumId, ogrenciId, alanlar }) {
  const l = [];
  const hocaKodu = typeof alanlar.qr === 'string' && /^[0-9]{41}$/.test(alanlar.qr) && alanlar.qr[1] !== '0';
  if (hocaKodu || typeof alanlar.yedekKod === 'string') l.push('projeksiyon:gosterim:' + oturumId);
  if (typeof alanlar.yedekKod === 'string' || alanlar.konum) l.push('projeksiyon:ogrenci:' + ogrenciId);
  return l;
}
for (let i = 0; i < 5000; i++) {
  const yuva = rnd(0, 9), qr = Math.random() < 0.7 ? '1' + yuva + '0'.repeat(39) : (Math.random() < 0.5 ? undefined : '123');
  const alanlar = { qr, yedekKod: Math.random() < 0.3 ? '123456' : undefined, konum: Math.random() < 0.3 ? { durum: 'ALINDI' } : undefined };
  const k = qrKilitAnahtarlari({ oturumId: 'o', ogrenciId: 's', alanlar });
  const bekleyebilir = (qr && qr.length === 41 && yuva !== 0) || !!alanlar.yedekKod;
  ok(k.includes('projeksiyon:gosterim:o') === bekleyebilir, 'gösterim key iff the record can wait on a display record');
  ok(k.includes('projeksiyon:ogrenci:s') === (!!alanlar.yedekKod || !!alanlar.konum), 'student key iff backup code or location');
  ok(k.every(x => /^projeksiyon:[a-z]+:[a-z0-9-]+$/.test(x)), 'keys carry only internal ids');
}

// 7. Corrected property: with P = 0, NORMAL iff -tol <= g < N (projection tol 1 s, phone 0).
const N_QR = 10000, N_YK = 20000, R = 30000;
function gecikme({ t, p, d, yedek = false, proj = true }) {
  const g = t - d * 5000, P = p, N = yedek ? N_YK : N_QR, tol = proj ? 1000 : 0;
  if (g - P > R) return 'RET'; if (g + P < -tol) return 'ONCE_OKUTULMUS'; if (g + P < N) return 'NORMAL'; if (p >= N) return 'CAPALAR_ESKI'; return 'INCELEMEDE';
}
let eskiCumleYanlis = 0;
for (let i = 0; i < 20000; i++) {
  const d = rnd(1e8, 3e8), t = d * 5000 + rnd(-20000, 60000), proj = Math.random() < 0.5, yedek = !proj && Math.random() < 0.5;
  const g = t - d * 5000, tol = proj ? 1000 : 0, N = yedek ? N_YK : N_QR, r = gecikme({ t, p: 0, d, proj, yedek });
  ok((r === 'NORMAL') === (g >= -tol && g < N), `P=0 NORMAL iff -tol <= g < N (g=${g}, proj=${proj})`);
  const cur = Math.floor(t / 5000);
  if (!yedek && (r === 'NORMAL') !== (d === cur || d === cur - 1)) eskiCumleYanlis++;
}
ok(eskiCumleYanlis > 0, 'old wording (only current or previous slice) disagrees with the specified tolerance (finding reproduced)');

// 8. Constraint names: kisitAdi output, <= 63 bytes, deterministic, hashed form when long.
{ const t = require('./icerik-1.js').tables; let hashed = 0;
  for (const tb of t) for (const line of [...tb.indexes, ...tb.constraints]) { const n = line.split(':')[0]; ok(Buffer.byteLength(n) <= 63, 'name <= 63 bytes: ' + n); if (/_[0-9a-f]{8}_(pk|fk|uq|ck|idx)$/.test(n)) hashed++; }
  ok(hashed > 0, 'long names use the hashed form');
  ok(O.kisitAdi('a', ['b'], 'idx') === 'a_b_idx' && O.kisitAdi('x'.repeat(40), ['y'.repeat(30)], 'ck') === O.kisitAdi('x'.repeat(40), ['y'.repeat(30)], 'ck'), 'kisitAdi short form and determinism'); }

// 9. Per-address new-browser limit: one address cannot starve another.
{ const sayac = new Map(), LIM = 100; const izin = (adres) => { const n = (sayac.get(adres) || 0) + 1; if (n > LIM) return 429; sayac.set(adres, n); return 201; };
  let son; for (let i = 0; i < 101; i++) son = izin('a'); ok(son === 429, '101st from one address is 429'); ok(izin('b') === 201, 'another address still gets 201'); }

console.log(fails === 0 ? 'ALL ROUND-2 RULE CHECKS PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);

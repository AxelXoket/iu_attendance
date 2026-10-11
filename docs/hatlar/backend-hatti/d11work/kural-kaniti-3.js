// Executable checks for the alignment round (architect decisions I014, I051, I053, I054, I057, I064, I118). Prototype logic, not product code.
// Each block states the claim, checks the specified rule and shows the rejected alternative failing, so no check is decoration.
// Usage: node kural-kaniti-3.js   (exit 0 and "ALL ALIGNMENT RULE CHECKS PASS" when every claim holds)
const O = require('./ortak.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
let seed = 12345; const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) % 2147483648; return a + (seed % (b - a + 1)); };

// 1. Display-record race with the shared/exclusive display key and the two-phase listener (I051, I118, I054).
// Students S1, S2: [lock G (studentMode), read display rows, insert evidence, commit]. Hoca H: [keys phase (no lock; lists the
// pending evidence whose D07 keys it will hold), lock G exclusive, insert display row, recompute visible pending evidence,
// renew the decision only for listed evidence, flag the rest and queue the job, commit]. READ COMMITTED visibility.
function race({ studentMode, flagUnlisted }) {
  const sp = studentMode ? ['lock', 'read', 'insert', 'commit'] : ['read', 'insert', 'commit'];
  const prog = { S1: sp, S2: sp, H: ['keys', 'lock', 'insertG', 'recompute', 'commit'] };
  const out = []; let bothShared = false;
  const walk = (pc, st) => {
    if (Object.keys(prog).every(t => pc[t] === prog[t].length)) { out.push(st); return; }
    for (const t of Object.keys(prog)) {
      if (pc[t] === prog[t].length) continue;
      const step = prog[t][pc[t]];
      const n = { ...st, ev: { ...st.ev }, saw: { ...st.saw }, held: { ...st.held } };
      if (step === 'lock') {
        const mode = t === 'H' ? 'X' : studentMode;
        const others = Object.entries(n.held).filter(([o]) => o !== t).map(([, m]) => m);
        if (others.some(m => m === 'X' || mode === 'X')) continue; // incompatible: this step waits
        n.held[t] = mode;
        if (Object.entries(n.held).filter(([o, m]) => o !== 'H' && m === 'S').length === 2) bothShared = true;
      }
      if (t !== 'H') {
        if (step === 'read') n.saw[t] = n.gCommitted;
        if (step === 'insert') n.ev[t] = { state: n.saw[t] ? 'DONE' : 'BEKLEMEDE', committed: false, renewed: false, flagged: false };
        if (step === 'commit') { n.ev[t] = { ...n.ev[t], committed: true }; delete n.held[t]; }
      } else {
        if (step === 'keys') n.listed = Object.keys(n.ev).filter(x => n.ev[x].committed && n.ev[x].state === 'BEKLEMEDE');
        if (step === 'recompute') {
          n.hUpdate = {};
          for (const x of Object.keys(n.ev)) if (n.ev[x].committed && n.ev[x].state === 'BEKLEMEDE') {
            const listed = n.listed.includes(x);
            n.hUpdate[x] = { state: 'DONE', renewed: listed, flagged: !listed && flagUnlisted };
          }
        }
        if (step === 'commit') {
          n.gCommitted = true; delete n.held.H;
          for (const [x, u] of Object.entries(n.hUpdate || {})) n.ev[x] = { ...n.ev[x], ...u };
          if (Object.values(n.hUpdate || {}).some(u => u.flagged)) n.jobQueued = true;
        }
      }
      walk({ ...pc, [t]: pc[t] + 1 }, n);
    }
  };
  walk({ S1: 0, S2: 0, H: 0 }, { ev: {}, saw: {}, held: {}, gCommitted: false, listed: [] });
  return { out, bothShared };
}
const kayip = st => Object.values(st.ev).some(e => e.state === 'BEKLEMEDE');
const bayat = st => Object.entries(st.ev).some(([x, e]) => e.state === 'DONE' && !st.saw[x] && !e.renewed && !(e.flagged && st.jobQueued));
{ const r = race({ studentMode: 'S', flagUnlisted: true });
  ok(r.out.length > 0, 'interleavings explored');
  ok(!r.out.some(kayip), 'with the shared student key no interleaving leaves BEKLEMEDE beside the committed display record');
  ok(!r.out.some(bayat), 'every recomputed evidence row gets its D07 decision renewed in the same transaction or is flagged with the 5 s job queued');
  ok(r.out.some(st => Object.values(st.ev).some(e => e.flagged)), 'the flag path is reachable (a student commits between the keys phase and the lock), so the job is needed');
  ok(r.bothShared, 'two students of the same session hold the display key at the same time (they never wait on each other)'); }
{ const r = race({ studentMode: 'X', flagUnlisted: true });
  ok(!r.out.some(kayip) && !r.bothShared, 'exclusive student keys are also correct but serialise the students (why the student key is shared)'); }
{ const r = race({ studentMode: null, flagUnlisted: true });
  ok(r.out.some(kayip), 'without the student key the lost BEKLEMEDE is reachable (why qrKilitAnahtarlari returns the display key)'); }
{ const r = race({ studentMode: 'S', flagUnlisted: false });
  ok(r.out.some(bayat), 'without flagging unlisted rows a stale D07 decision is reachable (why the flag and the job exist)'); }

// 2. Layered advisory locks (D12 rule I014): a transaction may call several times; a new key after everything held blocks, a key behind
// the held maximum is only tried (danismaKilidiDene; failure means TEKRAR_DENE and rollback). Shared and exclusive modes.
// Random transactions drawn from the real key families must never form a waits-for cycle; blocking on a key behind the maximum must.
const AILE = [
  () => 'dogrulama:liste:' + rnd(1, 2), () => 'dogrulama:teyit:' + rnd(1, 2), () => 'listeler:kova:' + rnd(1, 2),
  () => 'yoklama:cift:o' + rnd(1, 2) + ':s' + rnd(1, 2), () => ({ anahtar: 'projeksiyon:gosterim:o' + rnd(1, 2), kip: 'paylasimli' }),
  () => 'projeksiyon:gosterim:o' + rnd(1, 2), () => 'projeksiyon:ogrenci:s' + rnd(1, 2), () => 'esitleme:kurulum_siniri:k' + rnd(1, 2),
  () => 'dogrulama:sayac:a' + rnd(1, 2), () => 'dogrulama:isaret:o' + rnd(1, 2),
];
const metin = a => typeof a === 'string' ? a : a.anahtar, kip = a => typeof a === 'string' ? 'X' : 'S';
function kilitKos(txs, gerideBekle) {
  const st = txs.map(calls => ({ queue: calls.map(c => c.slice().sort(O.anahtarSirasi)), held: new Map(), done: false, aborted: false }));
  const enBuyuk = t => { let m = null; for (const [k, v] of t.held) { const a = v === 'S' ? { anahtar: k, kip: 'paylasimli' } : k; if (!m || O.anahtarSirasi(a, m) > 0) m = a; } return m; };
  for (let steps = 0; st.some(t => !t.done && !t.aborted) && steps < 500; steps++) {
    let progress = false;
    for (const t of st) {
      if (t.done || t.aborted) continue;
      if (!t.queue.length) { t.done = true; t.held.clear(); progress = true; continue; }
      const call = t.queue[0]; if (!call.length) { t.queue.shift(); progress = true; continue; }
      const a = call[0], k = metin(a), m = enBuyuk(t);
      if (t.held.has(k) && (t.held.get(k) === 'X' || kip(a) === 'S')) { call.shift(); progress = true; continue; } // already held: no-op
      const conflict = st.some(o => o !== t && !o.done && !o.aborted && o.held.has(k) && (o.held.get(k) === 'X' || kip(a) === 'X'));
      const ileri = !m || O.anahtarSirasi(a, m) > 0;
      if (!ileri && !gerideBekle) { if (conflict) { t.aborted = true; t.held.clear(); } else { t.held.set(k, kip(a) === 'X' || t.held.get(k) === 'X' ? 'X' : 'S'); call.shift(); } progress = true; continue; }
      if (!conflict) { t.held.set(k, kip(a) === 'X' || t.held.get(k) === 'X' ? 'X' : 'S'); call.shift(); progress = true; }
    }
    if (!progress) return 'kilitlendi';
  }
  return 'bitti';
}
{ let katman = 0, bekle = 0;
  for (let run = 0; run < 4000; run++) {
    const txs = Array.from({ length: rnd(2, 4) }, () => Array.from({ length: rnd(1, 3) }, () => Array.from({ length: rnd(1, 3) }, () => AILE[rnd(0, AILE.length - 1)]())));
    if (kilitKos(txs, false) === 'kilitlendi') katman++;
    if (kilitKos(txs, true) === 'kilitlendi') bekle++;
  }
  ok(katman === 0, `layered rule with try-lock behind the maximum never deadlocks (${katman} stuck runs)`);
  ok(bekle > 0, `blocking on a key behind the held maximum deadlocks (${bekle} stuck runs; why danismaKilidiDene exists)`); }
// layer order is not text order: yoklama:cift (3) before dogrulama:sayac (4), every D11 key in layer 3, hoca path sorted in one call
ok(O.anahtarSirasi('yoklama:cift:o1:s1', 'dogrulama:sayac:a1') < 0 && 'dogrulama:sayac:a1' < 'yoklama:cift:o1:s1', 'layer order puts yoklama:cift before dogrulama:sayac although text order does the opposite');
for (const k of ['projeksiyon:gosterim:o', 'projeksiyon:ogrenci:s', 'projeksiyon:onay:o', 'projeksiyon:tarayici:t', 'projeksiyon:eslestirme-uretimi', 'projeksiyon:yuva:h']) ok(O.katman(k) === 3, 'D11 key in layer 3: ' + k);
{ const call = ['dogrulama:sayac:a9', 'yoklama:cift:o1:s1', 'projeksiyon:gosterim:o1'].sort(O.anahtarSirasi);
  ok(call.join() === 'projeksiyon:gosterim:o1,yoklama:cift:o1:s1,dogrulama:sayac:a9', 'hoca path keys sort as gösterim, cift, sayac'); }
{ let atti = false; try { O.katman('bilinmeyen:x'); } catch { atti = true; } ok(atti, 'an unknown prefix is an error (D12 DANISMA_KATMANLARI)'); }

// 3. qrKilitAnahtarlari (spec rule, ortak.js prototype): shared display key iff the record can wait on, or take a result from, a display record.
for (let i = 0; i < 5000; i++) {
  const yuva = rnd(0, 9), qr = rnd(0, 9) < 7 ? '1' + yuva + '0'.repeat(39) : (rnd(0, 1) ? undefined : '123');
  const alanlar = { qr, yedekKod: rnd(0, 9) < 3 ? '123456' : undefined, konum: rnd(0, 9) < 3 ? { durum: 'ALINDI' } : undefined, bluetooth: rnd(0, 9) < 3 ? { durum: rnd(0, 1) ? 'TARANDI' : 'BLUETOOTH_YOK', kodlar: [] } : undefined };
  const k = O.qrKilitAnahtarlari({ oturumId: 'o', ogrenciId: 's', alanlar });
  const g = k.find(x => typeof x !== 'string' && x.anahtar === 'projeksiyon:gosterim:o');
  const bekler = (qr && qr.length === 41 && yuva !== 0) || !!alanlar.yedekKod || !!(alanlar.bluetooth && alanlar.bluetooth.durum === 'TARANDI') || !!alanlar.konum;
  ok(!!g === bekler, 'display key iff hoca code, backup code, Bluetooth scan or location');
  ok(!g || g.kip === 'paylasimli', 'student display key is always shared');
  ok(!k.includes('projeksiyon:gosterim:o'), 'student path never takes the display key exclusively');
  ok(k.includes('projeksiyon:ogrenci:s') === (!!alanlar.yedekKod || !!alanlar.konum), 'student key (exclusive) iff backup code or location');
  ok(k.every(x => O.katman(x) === 3), 'all keys in layer 3');
  ok(k.every(x => /^projeksiyon:[a-z]+:[a-z0-9-]+$/.test(typeof x === 'string' ? x : x.anahtar)), 'keys carry only internal ids');
}

// 4. Retention order (I025, I052, I064). D05 deletes a term's records when its D02 lock instant is older than sinirY. The D11 handler
// may read only its own tables, so it deletes a term when its newest own row is older than sinirP (sinirP >= sinirY: projeksiyon's
// duration is not longer, D12 checks). Count D05 deletes that meet surviving evidence under each design.
function saklama({ olcut, fk }) {
  let hata = 0;
  for (let i = 0; i < 20000; i++) {
    const kilit = rnd(100, 200), satirlar = Array.from({ length: rnd(1, 6) }, () => rnd(20, kilit + 30)), maxAct = Math.max(...satirlar);
    const durY = rnd(50, 400), durP = rnd(10, durY);
    let kanitVar = true, kayitVar = true;
    for (let now = 0; now < 900 && (kanitVar || kayitVar); now += rnd(5, 40)) {
      const sinirY = now - durY, sinirP = now - durP;
      if (kanitVar && (olcut === 'kendi' ? maxAct < sinirP : kilit < sinirP)) kanitVar = false; // catalog: projeksiyon first
      if (kayitVar && kilit < sinirY) { if (kanitVar && fk === 'RESTRICT') { hata++; break; } kayitVar = false; if (fk === 'CASCADE') kanitVar = false; }
    }
  }
  return hata;
}
ok(saklama({ olcut: 'kendi', fk: 'RESTRICT' }) > 0, 'own-table criterion with RESTRICT lets D05 hit 23503 on late evidence (why the FK cascades)');
ok(saklama({ olcut: 'kendi', fk: 'CASCADE' }) === 0, 'own-table criterion with CASCADE: D05 never hits a foreign key on evidence');
ok(saklama({ olcut: 'kilit', fk: 'RESTRICT' }) === 0, 'the old D02-anchored criterion was safe but needs D02 reads, which the yoklama_saklama role forbids');

// 5. Re-queue chain of projeksiyon_bekleyen_yeniden_hesapla: a row that stays locked is tried at most three times, then the 02:35 net
// owns it; a row whose lock is released earlier is completed by the job.
function zincirKos(kilitAcikOlduguIlkCalisma) { let calisma = 0, zincir = 0, tamam = false;
  for (;;) { calisma++; if (calisma >= kilitAcikOlduguIlkCalisma) { tamam = true; break; } if (zincir + 1 >= 3) break; zincir++; }
  return { calisma, tamam }; }
{ const a = zincirKos(Infinity), b = zincirKos(2), c = zincirKos(1);
  ok(a.calisma === 3 && !a.tamam, 'a row that never unlocks is tried three times, then left to the 02:35 net');
  ok(b.calisma === 2 && b.tamam, 'a row unlocked before the second run is completed by it');
  ok(c.calisma === 1 && c.tamam, 'an unlocked row is completed by the first run'); }

console.log(fails === 0 ? 'ALL ALIGNMENT RULE CHECKS PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);

// Executes the DDL written in spec/D08.json on real PostgreSQL (PGlite) and checks:
//  A) rows produced by the reference model (d08/ref.js rules) are all accepted (no false rejects)
//  B) each CHECK rejects a row that breaks exactly its rule, by name (positive control per constraint)
//  C) constraint and index names are <= 63 bytes and start with the table name
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';

const spec = JSON.parse(fs.readFileSync(new URL('../../spec/D08.json', import.meta.url), 'utf8'));
const db = new PGlite();
const v = (await db.query('select version()')).rows[0].version;
console.log('engine:', v.split(' ').slice(0, 2).join(' '));

// stubs for foreign tables owned by D02
await db.exec(`create table donemler (id uuid primary key); create table birimler (id uuid primary key);
  create table dersler (id uuid primary key); create table oturumlar (id uuid primary key);`);

// C) names
for (const t of spec.tables) for (const c of [...t.constraints, ...t.indexes]) {
  const name = c.split(' ')[0];
  assert(Buffer.byteLength(name) <= 63, 'name too long: ' + name);
  assert(name.startsWith(t.name + '_'), 'name not prefixed: ' + name);
  assert(/_(pk|fk|uq|ck|idx)$/.test(name), 'bad suffix: ' + name);
}
console.log('C names ok');

// DDL from the spec (uuidv7() is PostgreSQL 18; PGlite is older, so the default is swapped for the test only)
for (const t of spec.tables) {
  const cols = t.columns.map(c => `${c.name} ${c.type}${c.null ? '' : ' not null'}${c.default ? ' default ' + (c.default === 'uuidv7()' ? 'gen_random_uuid()' : c.default) : ''}`);
  const cons = t.constraints.map(c => 'constraint ' + c);
  await db.exec(`create table ${t.name} (\n  ${[...cols, ...cons].join(',\n  ')}\n);`);
  for (const ix of t.indexes) { const [name, rest] = [ix.split(' ')[0], ix.slice(ix.indexOf('('))]; await db.exec(`create index ${name} on ${t.name} ${rest};`); }
}
console.log('DDL applied: ' + spec.tables.map(t => t.name).join(', '));

// ---- reference rules (same as d08/ref.js)
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);
function seviye(Ts, p, A, nx, sifir) {
  if (sifir) return { s: 0, m: null };
  const h = hak(Ts, p), k = h - A;
  if (A > h) return { s: 4, m: 'HAKKINI_ASTIN' };
  if (k === 0) return { s: 3, m: 'HAKKIN_KALMADI' };
  if (nx !== null && k <= nx) return { s: 2, m: k < nx ? 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN' : 'BIR_DERS_DAHA_HAKKIN_BITER' };
  if (2 * A >= h) return { s: 1, m: 'YARISINI_KULLANDIN' };
  return { s: 0, m: null };
}
let seed = 7; const R = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

const donem = randomUUID(), birim = randomUUID(), ders = randomUUID();
await db.query('insert into donemler values ($1)', [donem]); await db.query('insert into birimler values ($1)', [birim]); await db.query('insert into dersler values ($1)', [ders]);

// A) valid rows
let ok = 0;
const sonucCols = 'id, donem_id, birim_id, ders_id, ogrenci_no, etkin, muaf, sonuc, acik_isaret_sayisi, karar_bekliyor_acik_isaret, karar_bekliyor_baglanti, son_temas_ani, uyelik_ozeti, sayim_tabani, kural_surumu, hesaplandigi_an, olusturma_ani';
const durumCols = 'devam_sonucu_id, tur, p, taban_saat, planli_kalan_saat, katildigi_saat, mazeretli_saat, beklemede_saat, incelemede_saat, devamsiz_saat, hak, tur_sonucu, yuzde_onda, kullanilan_saat, tahmini_hak, kalan_hak, sonraki_oturum_saati, hesaplanan_seviye, seviye, mesaj_kodu, gosterilen_kalan_hak, seviye_degisim_ani, hesaplandigi_an';
const ph = n => Array.from({ length: n }, (_, i) => '$' + (i + 1)).join(', ');
function durumRow(sid, tur, prev) {
  const p = [0, 50, 70, 80, 100][R(5)];
  const T = R(60), P = (T === 0 ? 1 : 0) + R(30);
  let rest = T; const take = () => { const x = rest ? R(rest + 1) : 0; rest -= x; return x; };
  const kat = take(), maz = take(), bek = take(), inc = take(); const yok = rest;
  const dev = T - kat - maz; const h = hak(T, p); const ts = dev <= h ? 'DEVAMLI' : 'DEVAMSIZ';
  const yz = T === 0 ? null : Math.floor((T - dev) * 1000 / T);
  const kul = dev - bek; const th = hak(T + P, p); const kal = th - kul; const nx = R(3) ? 1 + R(3) : null;
  const sifir = R(10) === 0; const hs = seviye(T + P, p, kul, nx, sifir);
  // shown triple: either fresh, or a held earlier triple with level >= computed
  let shown = { s: hs.s, m: hs.m, k: kal };
  if (prev && !sifir && prev.s > hs.s && R(2)) shown = prev;
  return { row: [sid, tur, p, T, P, kat, maz, bek, inc, dev, h, ts, yz, kul, th, kal, nx, hs.s, shown.s, shown.m, shown.k, null, new Date()], shown, yok };
}
for (let i = 0; i < 400; i++) {
  const sid = randomUUID(); const muaf = R(8) === 0; const etkin = R(10) !== 0;
  const kbA = !muaf && etkin && R(5) === 0; const acik = kbA ? 1 + R(3) : R(3);
  await db.query(`insert into devam_sonuclari (${sonucCols}) values (${ph(17)})`, [sid, donem, birim, ders, String(100000000 + i), etkin, muaf, muaf ? 'DEVAMLI_MUAF' : (R(2) ? 'DEVAMLI' : 'DEVAMSIZ'), acik, kbA, !muaf && etkin && R(7) === 0, null, Buffer.alloc(32, i % 256), 'YAPILAN', 1, new Date(), new Date()]);
  let prev = null;
  for (const tur of R(3) ? ['TEORI'] : ['TEORI', 'UYGULAMA']) {
    // a held triple from an earlier, worse state
    prev = R(2) ? { s: 3, m: 'HAKKIN_KALMADI', k: 0 } : { s: 4, m: 'HAKKINI_ASTIN', k: -1 - R(3) };
    const { row } = durumRow(sid, tur, prev);
    await db.query(`insert into devam_durumlari (${durumCols}) values (${ph(23)})`, row); ok++;
  }
  // session rows from the hour split
  const oturum = randomUUID(); await db.query('insert into oturumlar values ($1)', [oturum]);
  const H = 1 + R(4); const base = ['VAR', 'YOK', 'BEKLEMEDE', 'INCELEMEDE'][R(4)];
  const duz = R(2) ? null : { d: ['ELLE_EKLENDI', 'GOREVLI', 'BELGELI_DUZELTME', 'YOK'][R(4)], h: R(2) ? null : R(H + 1) };
  const r = { var: 0, yok: 0, maz: 0, acik: 0 };
  const put = (d, h) => { if (d === 'VAR' || d === 'ELLE_EKLENDI') r.var += h; else if (d === 'GOREVLI' || d === 'BELGELI_DUZELTME') r.maz += h; else if (d === 'YOK') r.yok += h; else r.acik += h; };
  let sonDurum;
  if (!duz) { put(base, H); sonDurum = (base === 'BEKLEMEDE' || base === 'INCELEMEDE') ? null : base; }
  else { const hc = Math.min(duz.h === null ? H : duz.h, H); put(duz.d, hc); put(duz.d === 'ELLE_EKLENDI' ? 'YOK' : base, H - hc); sonDurum = duz.d; }
  if (muaf) sonDurum = 'MUAF';
  const acikKarar = r.acik > 0 ? (base === 'INCELEMEDE' ? 'INCELEMEDE' : 'BEKLEMEDE') : null;
  await db.query('insert into oturum_son_durumlari (oturum_id, devam_sonucu_id, tur, donem_id, saat, var_saat, yok_saat, mazeretli_saat, acik_saat, son_durum, acik_karar, gecici, hesaplandigi_an) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [oturum, sid, 'TEORI', donem, H, r.var, r.yok, r.maz, r.acik, sonDurum, acikKarar, false, new Date()]); ok++;
  // history rows: ILK then a VERI change
  await db.query("insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, yeni_mesaj_kodu, etken, nedenler, an) values ($1,$2,'TEORI',null,2,'BIR_DERS_DAHA_HAKKIN_BITER','ILK',array['KAYIT'],now())", [sid, donem]); ok++;
  await db.query("insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, tetikleyen_tur, tetikleyen_id, tetikleyen_donem_id, an) values ($1,$2,'TEORI',2,0,'VERI',array['KARAR','DUZELTME'],'KAYIT',$3,$2,now())", [sid, donem, randomUUID()]); ok++;
}
console.log('A valid rows accepted:', ok);

// B) one broken row per CHECK -> rejected by that exact constraint
// fresh parent with no children, so the control rows cannot collide with model rows
const sid = randomUUID();
await db.query(`insert into devam_sonuclari (${sonucCols}) values (${ph(17)})`, [sid, donem, birim, ders, '0999999999', true, false, 'DEVAMLI', 0, false, false, null, Buffer.alloc(32, 9), 'YAPILAN', 1, new Date(), new Date()]);
await db.query("insert into devam_durumlari (devam_sonucu_id, tur, p, taban_saat, planli_kalan_saat, katildigi_saat, mazeretli_saat, beklemede_saat, incelemede_saat, devamsiz_saat, hak, tur_sonucu, yuzde_onda, kullanilan_saat, tahmini_hak, kalan_hak, sonraki_oturum_saati, hesaplanan_seviye, seviye, mesaj_kodu, gosterilen_kalan_hak, seviye_degisim_ani, hesaplandigi_an) values ($1,'TEORI',70,0,10,0,0,0,0,0,0,'DEVAMLI',null,0,3,3,null,0,0,null,3,null,now())", [sid]);
const good = { devam_sonucu_id: sid, tur: 'UYGULAMA', p: 80, taban_saat: 15, planli_kalan_saat: 5, katildigi_saat: 10, mazeretli_saat: 1, beklemede_saat: 1, incelemede_saat: 1, devamsiz_saat: 4, hak: 3, tur_sonucu: 'DEVAMSIZ', yuzde_onda: 733, kullanilan_saat: 3, tahmini_hak: 4, kalan_hak: 1, sonraki_oturum_saati: 2, hesaplanan_seviye: 2, seviye: 2, mesaj_kodu: 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN', gosterilen_kalan_hak: 1, seviye_degisim_ani: null, hesaplandigi_an: new Date() };
// sanity of the good row against the reference: hak(15,80)=3, hak(20,80)=4, (15-4)*1000/15=733
assert.strictEqual(hak(15, 80), 3); assert.strictEqual(hak(20, 80), 4); assert.strictEqual(Math.floor(11 * 1000 / 15), 733);
const ins = async (row, tabloAdi = 'devam_durumlari') => { const k = Object.keys(row); await db.query(`insert into ${tabloAdi} (${k.join(', ')}) values (${ph(k.length)})`, Object.values(row)); };
await db.exec('begin'); await ins(good); await db.exec('rollback'); // ground control: the good row passes
const broken = {
  devam_durumlari_hak_ck: { hak: 2 },
  devam_durumlari_tahmini_hak_ck: { tahmini_hak: 5, kalan_hak: 2 },
  devam_durumlari_tur_sonucu_ck: { tur_sonucu: 'DEVAMLI' },
  devam_durumlari_yuzde_onda_ck: { yuzde_onda: 734 },
  devam_durumlari_devamsiz_saat_ck: { devamsiz_saat: 5, kullanilan_saat: 4, kalan_hak: 0 },
  devam_durumlari_kullanilan_saat_ck: { kullanilan_saat: 4, kalan_hak: 0 },
  devam_durumlari_kalan_hak_ck: { kalan_hak: 2 },
  devam_durumlari_seviye_ck: { seviye: 1, mesaj_kodu: 'YARISINI_KULLANDIN' },
  devam_durumlari_mesaj_kodu_ck: { mesaj_kodu: 'HAKKIN_KALMADI' },
  devam_durumlari_gosterilen_kalan_hak_ck: { hesaplanan_seviye: 2, seviye: 3, mesaj_kodu: 'HAKKIN_KALMADI', gosterilen_kalan_hak: 1 },
  // p=101 with T=0, P=1 keeps every derived column consistent, so only p_ck can fail
  devam_durumlari_p_ck: { p: 101, taban_saat: 0, planli_kalan_saat: 1, katildigi_saat: 0, mazeretli_saat: 0, beklemede_saat: 0, incelemede_saat: 0, devamsiz_saat: 0, hak: 0, tur_sonucu: 'DEVAMLI', yuzde_onda: null, kullanilan_saat: 0, tahmini_hak: -1, kalan_hak: -1, hesaplanan_seviye: 0, seviye: 0, mesaj_kodu: null, gosterilen_kalan_hak: -1 },
  devam_durumlari_tur_ck: { tur: 'LAB' },
  devam_durumlari_sonraki_oturum_saati_ck: { sonraki_oturum_saati: 0 },
};
let caught = 0;
for (const [name, patch] of Object.entries(broken)) {
  await db.exec('begin');
  try { await ins({ ...good, ...patch }); throw new Error('NOT REJECTED: ' + name); }
  catch (e) { if (String(e.message).startsWith('NOT REJECTED')) throw e; assert(String(e.message).includes(name) || e.constraint === name, `expected ${name}, got: ${e.message}`); caught++; }
  finally { await db.exec('rollback'); }
}
// session-row and parent-row constraints
const ot = (await db.query('select oturum_id from oturum_son_durumlari limit 1')).rows[0].oturum_id;
const goodO = { oturum_id: ot, devam_sonucu_id: sid, tur: 'UYGULAMA', donem_id: donem, saat: 3, var_saat: 2, yok_saat: 1, mazeretli_saat: 0, acik_saat: 0, son_durum: 'VAR', acik_karar: null, gecici: false, hesaplandigi_an: new Date() };
await db.exec('begin'); await ins(goodO, 'oturum_son_durumlari'); await db.exec('rollback');
for (const [name, patch] of Object.entries({
  oturum_son_durumlari_saat_ck: { yok_saat: 2 },
  oturum_son_durumlari_acik_karar_ck: { var_saat: 1, acik_saat: 1 },
  oturum_son_durumlari_son_durum_ck: { son_durum: 'MAZERETLI' },
})) {
  await db.exec('begin');
  try { await ins({ ...goodO, ...patch }, 'oturum_son_durumlari'); throw new Error('NOT REJECTED: ' + name); }
  catch (e) { if (String(e.message).startsWith('NOT REJECTED')) throw e; assert(String(e.message).includes(name), `expected ${name}, got: ${e.message}`); caught++; }
  finally { await db.exec('rollback'); }
}
const goodS = { id: randomUUID(), donem_id: donem, birim_id: birim, ders_id: ders, ogrenci_no: '0412230355', etkin: true, muaf: false, sonuc: 'DEVAMSIZ', acik_isaret_sayisi: 1, karar_bekliyor_acik_isaret: true, karar_bekliyor_baglanti: false, son_temas_ani: null, uyelik_ozeti: Buffer.alloc(32), sayim_tabani: 'YAPILAN', kural_surumu: 1, hesaplandigi_an: new Date(), olusturma_ani: new Date() };
await db.exec('begin'); await ins(goodS, 'devam_sonuclari'); await db.exec('rollback');
for (const [name, patch] of Object.entries({
  devam_sonuclari_muaf_ck: { muaf: true, karar_bekliyor_acik_isaret: false },
  devam_sonuclari_karar_bekliyor_ck: { etkin: false },
  devam_sonuclari_acik_isaret_sayisi_ck: { acik_isaret_sayisi: 0 },
  devam_sonuclari_ogrenci_no_ck: { ogrenci_no: '04122303' },
  devam_sonuclari_uyelik_ozeti_ck: { uyelik_ozeti: Buffer.alloc(16) },
  devam_sonuclari_ders_id_ogrenci_no_uq: { ogrenci_no: '100000000' },
})) {
  await db.exec('begin');
  try { await ins({ ...goodS, ...patch }, 'devam_sonuclari'); throw new Error('NOT REJECTED: ' + name); }
  catch (e) { if (String(e.message).startsWith('NOT REJECTED')) throw e; assert(String(e.message).includes(name), `expected ${name}, got: ${e.message}`); caught++; }
  finally { await db.exec('rollback'); }
}
for (const [name, sql] of Object.entries({
  devam_seviye_gecmisi_etken_ck: "insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, an) values ($1,$2,'TEORI',3,2,'TAHMIN',array['PROGRAM'],now())",
  devam_seviye_gecmisi_seviye_ck: "insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, an) values ($1,$2,'TEORI',2,2,'VERI',array['KAYIT'],now())",
  devam_seviye_gecmisi_nedenler_ck: "insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, an) values ($1,$2,'TEORI',1,2,'VERI',array['ZAMAN'],now())",
  devam_seviye_gecmisi_tetikleyen_ck: "insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, tetikleyen_tur, tetikleyen_id, tetikleyen_donem_id, an) values ($1,$2,'TEORI',1,2,'VERI',array['DUZELTME'],'DUZELTME',gen_random_uuid(),$2,now())",
})) {
  await db.exec('begin');
  try { await db.query(sql, [sid, donem]); throw new Error('NOT REJECTED: ' + name); }
  catch (e) { if (String(e.message).startsWith('NOT REJECTED')) throw e; assert(String(e.message).includes(name), `expected ${name}, got: ${e.message}`); caught++; }
  finally { await db.exec('rollback'); }
}
console.log('B constraints rejecting their broken row by name:', caught);
// cascade: deleting a parent removes the children (retention path)
const before = (await db.query('select count(*)::int n from devam_durumlari where devam_sonucu_id = $1', [sid])).rows[0].n;
await db.query('delete from devam_sonuclari where id = $1', [sid]);
const after = (await db.query('select (select count(*) from devam_durumlari where devam_sonucu_id = $1) + (select count(*) from oturum_son_durumlari where devam_sonucu_id = $1) + (select count(*) from devam_seviye_gecmisi where devam_sonucu_id = $1) n', [sid])).rows[0].n;
console.log('cascade children before', before, 'after', Number(after)); assert.strictEqual(Number(after), 0);
console.log('ALL DDL CHECKS OK');

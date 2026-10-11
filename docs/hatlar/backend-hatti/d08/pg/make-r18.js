// Derives ddl-test-r18.mjs from ddl-test-r17.mjs for the align round: renamed time columns (I065),
// kilit_ani and the retention path under yoklama_saklama (I064), LISTE_SATIRI may carry a dönem (I015).
const fs = require('fs');
let s = fs.readFileSync(__dirname + '/ddl-test-r17.mjs', 'utf8');
const all = (a, b, min) => { const n = s.split(a).length - 1; if (n < (min || 1)) throw new Error('missing ' + a); s = s.split(a).join(b); return n; };
all('hesaplandigi_an', 'hesaplanma_ani', 3);
// devam_seviye_gecmisi.an -> degisim_ani (only the column list entries ", an)" in those inserts)
all("tetikleyen_donem_id, an) values", "tetikleyen_donem_id, degisim_ani) values", 2);
all("etken, nedenler, an) values", "etken, nedenler, degisim_ani) values", 4);
if (/[ (]an\) values/.test(s)) throw new Error('an column left');
// parent rows: add kilit_ani to the column list and values (17 -> 18 params)
all("kural_surumu, hesaplanma_ani, olusturma_ani';", "kural_surumu, hesaplanma_ani, olusturma_ani, kilit_ani';", 1);
all("ph(17)", "ph(18)", 2);
all("'YAPILAN', 1, new Date(), new Date()]);\n  let prev = null;", "'YAPILAN', 1, new Date(), new Date(), [null, new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 11, 1))][i % 3]]);\n  let prev = null;", 1);
all("Buffer.alloc(32, 9), 'YAPILAN', 1, new Date(), new Date()]);", "Buffer.alloc(32, 9), 'YAPILAN', 1, new Date(), new Date(), null]);", 1);
all('ALL DDL CHECKS OK', 'ALL DDL CHECKS OK (r18)', 1);
const extra = `
// r18: LISTE_SATIRI trigger may carry the row's dönem; DUZELTME may not (positive and ground control)
await db.exec('begin');
const ders2 = randomUUID(); await db.query('insert into dersler values ($1)', [ders2]);
const sid2 = randomUUID();
await db.query(\`insert into devam_sonuclari (\${sonucCols}) values (\${ph(18)})\`, [sid2, donem, birim, ders2, '0412000001', true, false, 'DEVAMLI', 0, false, false, null, Buffer.alloc(32, 7), 'YAPILAN', 1, new Date(), new Date(), null]);
await db.query("insert into devam_seviye_gecmisi (devam_sonucu_id, donem_id, tur, eski_seviye, yeni_seviye, etken, nedenler, tetikleyen_tur, tetikleyen_id, tetikleyen_donem_id, degisim_ani) values ($1,$2,'TEORI',1,2,'VERI',array['LISTE'],'LISTE_SATIRI',gen_random_uuid(),$2,now())", [sid2, donem]);
await db.exec('rollback');
console.log('r18 LISTE_SATIRI with dönem accepted');
// r18: retention by kilit_ani under yoklama_saklama, touching only D08 tables
await db.exec("grant select on devam_sonuclari, devam_durumlari, oturum_son_durumlari, devam_seviye_gecmisi to yoklama_saklama");
const sinir = new Date(Date.UTC(2026, 5, 1));
const eski = (await db.query('select count(*)::int n from devam_sonuclari where kilit_ani < $1', [sinir])).rows[0].n;
const kalanOnce = (await db.query('select count(*)::int n from devam_sonuclari where kilit_ani is null or kilit_ani >= $1', [sinir])).rows[0].n;
assert(eski > 0 && kalanOnce > 0, 'both groups present');
const parti = \`with hedef as (select donem_id from devam_sonuclari where kilit_ani < $1 order by donem_id limit 1),
  sec as (select id from devam_sonuclari where donem_id = (select donem_id from hedef)${process.env.MUT === '1' ? '' : ' and kilit_ani < $1'} order by id limit $2)
  delete from devam_sonuclari where id in (select id from sec) returning donem_id\`;
let partiSayisi = 0, toplam = 0;
for (;;) {
  await db.exec('begin'); await db.exec('set local role yoklama_saklama');
  const r = await db.query(parti, [sinir, 50]);
  await db.exec('commit');
  if (!r.rows.length) break;
  partiSayisi++; toplam += r.rows.length;
}
assert.strictEqual(toplam, eski);
const kalanSonra = (await db.query('select count(*)::int n from devam_sonuclari')).rows[0].n;
const yetim = (await db.query('select (select count(*) from devam_durumlari d where not exists (select 1 from devam_sonuclari s where s.id = d.devam_sonucu_id)) + (select count(*) from oturum_son_durumlari o where not exists (select 1 from devam_sonuclari s where s.id = o.devam_sonucu_id)) + (select count(*) from devam_seviye_gecmisi g where not exists (select 1 from devam_sonuclari s where s.id = g.devam_sonucu_id)) n')).rows[0].n;
assert.strictEqual(kalanSonra, kalanOnce); assert.strictEqual(Number(yetim), 0);
console.log('r18 retention by kilit_ani under yoklama_saklama: deleted', toplam, 'in', partiSayisi, 'batches; kept', kalanSonra, '(null or newer kilit_ani); orphans 0');
// the retention role cannot read a D02 table, so a handler that needed one would fail (positive control)
await db.exec('begin'); await db.exec('set local role yoklama_saklama');
let red2 = null; try { await db.query('select count(*) from dersler'); } catch (e) { red2 = e.code; }
await db.exec('rollback');
assert.strictEqual(red2, '42501'); console.log('r18 yoklama_saklama select on a D02 table -> 42501 (handler uses only D08 tables)');
`;
s = s.replace("console.log('ALL DDL CHECKS OK (r18)');", extra + "console.log('ALL DDL CHECKS OK (r18)');");
fs.writeFileSync(__dirname + '/ddl-test-r18.mjs', s);
console.log('ddl-test-r18.mjs written');

// Executes the DDL written in spec/D09.json on a real PostgreSQL (PGlite, WASM) and proves the
// constraints behave as the spec claims. Every negative case has a positive control next to it.
// Usage: node ddl-test.mjs   (prints PASS/FAIL per case, exits 1 on any failure)
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(process.env.SPEC_PATH || path.join(here, '..', '..', 'spec', 'D09.json'), 'utf8'));
const db = new PGlite();
let fails = 0, passes = 0;
const ok = (name) => { passes++; console.log('PASS ' + name); };
const bad = (name, why) => { fails++; console.log('FAIL ' + name + ' :: ' + why); };

// ---- stubs for the tables other modules own (only the referenced keys) ----
await db.exec(`
CREATE FUNCTION uuidv7() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
CREATE TABLE donemler (id uuid PRIMARY KEY);
CREATE TABLE dersler (id uuid PRIMARY KEY);
CREATE TABLE oturumlar (id uuid PRIMARY KEY);
CREATE TABLE liste_satirlari (id uuid PRIMARY KEY);
CREATE TABLE kisiler (id uuid PRIMARY KEY);
CREATE TABLE kurulumlar (id uuid PRIMARY KEY);
CREATE TABLE yoklama_kayitlari (donem_id uuid, id uuid, PRIMARY KEY (donem_id, id));
`);

// ---- DDL generated from the spec text itself ----
const ddl = [];
const later = [];
for (const t of spec.tables) {
  const cols = t.columns.map(c => `${c.name} ${c.type}${c.null ? '' : ' NOT NULL'}${c.default ? ' DEFAULT ' + c.default : ''}`);
  ddl.push(`CREATE TABLE ${t.name} (\n  ${cols.join(',\n  ')}\n);`);
  for (const ix of t.indexes) {
    const m = ix.match(/^([a-z0-9_]+): (.*)$/);
    if (!m) throw new Error('index text not parseable: ' + ix);
    const [, name, rest0] = m;
    const rest = rest0.split(';')[0].trim();
    if (name.length > 63) bad('name length ' + name, name.length + ' bytes');
    if (rest.startsWith('PRIMARY KEY')) ddl.push(`ALTER TABLE ${t.name} ADD CONSTRAINT ${name} ${rest};`);
    else if (rest.startsWith('UNIQUE')) {
      const u = rest.match(/^UNIQUE (\([^)]*\))(?: WHERE (.*))?$/);
      if (!u) throw new Error('unique not parseable: ' + rest);
      if (u[2]) ddl.push(`CREATE UNIQUE INDEX ${name} ON ${t.name} ${u[1]} WHERE ${u[2]};`);
      else ddl.push(`ALTER TABLE ${t.name} ADD CONSTRAINT ${name} UNIQUE ${u[1]};`);
    } else {
      const u = rest.match(/^(\(.*?\))(?: WHERE (.*))?$/);
      if (!u) throw new Error('index not parseable: ' + rest);
      ddl.push(`CREATE INDEX ${name} ON ${t.name} ${u[1]}${u[2] ? ' WHERE ' + u[2] : ''};`);
    }
  }
  for (const ck of t.constraints) {
    const m = ck.match(/^([a-z0-9_]+_(ck|fk)): (.*)$/);
    if (!m) continue; // prose lines (FK listesi, yetki) are applied below by hand
    const [, name, kind, expr] = m;
    if (name.length > 63) bad('name length ' + name, name.length + ' bytes');
    if (kind === 'ck') ddl.push(`ALTER TABLE ${t.name} ADD CONSTRAINT ${name} CHECK (${expr});`);
    else later.push(`ALTER TABLE ${t.name} ADD CONSTRAINT ${name} ${expr};`);
  }
}
// FKs listed in prose: written here with the naming rule.
const fk = (t, cols, ref) => `ALTER TABLE ${t} ADD CONSTRAINT ${t}_${cols.replace(/[ ,()]+/g, '_').replace(/^_|_$/g, '')}_fk FOREIGN KEY (${cols}) REFERENCES ${ref};`;
later.push(
  fk('duzeltmeler', 'donem_id', 'donemler(id)'), fk('duzeltmeler', 'ders_id', 'dersler(id)'), fk('duzeltmeler', 'oturum_id', 'oturumlar(id)'),
  fk('duzeltmeler', 'liste_satiri_id', 'liste_satirlari(id)'), fk('duzeltmeler', 'kayit_donem_id, kayit_id', 'yoklama_kayitlari(donem_id, id)'),
  fk('duzeltmeler', 'sorun_bildirimi_id', 'sorun_bildirimleri(id)'), fk('duzeltmeler', 'kurulum_id', 'kurulumlar(id)'), fk('duzeltmeler', 'yapan_kisi_id', 'kisiler(id)'),
  fk('sorun_bildirimleri', 'ogrenci_id', 'kisiler(id)'), fk('sorun_bildirimleri', 'oturum_id', 'oturumlar(id)'), fk('sorun_bildirimleri', 'kayit_donem_id, kayit_id', 'yoklama_kayitlari(donem_id, id)'),
  fk('denetim_kayitlari', 'kayit_donem_id, kayit_id', 'yoklama_kayitlari(donem_id, id)'), fk('denetim_kayitlari', 'yapan_kisi_id', 'kisiler(id)'),
  fk('gunluk_inceleme_partileri', 'sorun_bildirimi_id', 'sorun_bildirimleri(id)'), fk('gunluk_inceleme_partileri', 'kayit_donem_id, kayit_id', 'yoklama_kayitlari(donem_id, id)')
);
try { await db.exec(ddl.join('\n') + '\n' + later.join('\n')); ok('spec DDL executes (' + (ddl.length + later.length) + ' statements)'); }
catch (e) { bad('spec DDL executes', e.message); console.log(ddl.join('\n')); process.exit(1); }

// ---- grants as the spec states them ----
await db.exec(`
CREATE ROLE yoklama_api; CREATE ROLE yoklama_isci;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yoklama_api, yoklama_isci; -- D12 varsayılan yetkileri gibi
REVOKE UPDATE, DELETE, TRUNCATE ON duzeltmeler, denetim_kayitlari FROM yoklama_api, yoklama_isci;
REVOKE UPDATE, DELETE, TRUNCATE ON sorun_bildirimleri FROM yoklama_api, yoklama_isci;
GRANT UPDATE (durum, kapatan_kisi_id, kapanis_ani, kapanis_islem_id) ON sorun_bildirimleri TO yoklama_api, yoklama_isci;
REVOKE UPDATE, DELETE, TRUNCATE, INSERT ON gunluk_inceleme_partileri FROM yoklama_api;
REVOKE UPDATE, TRUNCATE ON gunluk_inceleme_partileri FROM yoklama_isci;
`);

// ---- fixtures ----
const U = () => crypto.randomUUID();
const ids = { donem: U(), ders: U(), o1: U(), o2: U(), s1: U(), s2: U(), hoca: U(), ogr: U(), kur: U(), kayit: U() };
await db.query(`INSERT INTO donemler VALUES ($1)`, [ids.donem]);
await db.query(`INSERT INTO dersler VALUES ($1)`, [ids.ders]);
await db.query(`INSERT INTO oturumlar VALUES ($1), ($2)`, [ids.o1, ids.o2]);
await db.query(`INSERT INTO liste_satirlari VALUES ($1), ($2)`, [ids.s1, ids.s2]);
await db.query(`INSERT INTO kisiler VALUES ($1), ($2)`, [ids.hoca, ids.ogr]);
await db.query(`INSERT INTO kurulumlar VALUES ($1)`, [ids.kur]);
await db.query(`INSERT INTO yoklama_kayitlari VALUES ($1, $2)`, [ids.donem, ids.kayit]);

const D = (over = {}) => ({ id: U(), islem_id: U(), tur: 'DUZELTME', sebep_kodu: 'BEYANA_DAYALI', donem_id: ids.donem, ders_id: ids.ders, oturum_id: ids.o1, liste_satiri_id: ids.s1,
  kayit_donem_id: null, kayit_id: null, belge_no: null, teori_saat: 2, uygulama_saat: 0, onceki_duzeltme_id: null, sorun_bildirimi_id: null, kaynak: 'PANEL',
  kurulum_id: null, sira_no: null, yapan_kisi_id: ids.hoca, istemci_ani: null, olusturma_ani: new Date().toISOString(), ...over });
const ins = async (table, row, role) => {
  const k = Object.keys(row);
  const sql = `INSERT INTO ${table} (${k.join(',')}) VALUES (${k.map((_, i) => '$' + (i + 1)).join(',')})`;
  if (role) await db.exec(`SET ROLE ${role}`);
  try { await db.query(sql, k.map(x => row[x])); return null; } catch (e) { return e.message; } finally { if (role) await db.exec('RESET ROLE'); }
};
const expectOk = async (name, p) => { const err = await p; err ? bad(name, err) : ok(name); };
const expectErr = async (name, p, re) => { const err = await p; !err ? bad(name, 'accepted, expected rejection') : (re && !re.test(err) ? bad(name, 'wrong error: ' + err) : ok(name + ' (' + err.slice(0, 70) + ')')); };

// duzeltmeler: CHECKs
await expectErr('DUZELTME with NULL hours rejected', ins('duzeltmeler', D({ teori_saat: null, uygulama_saat: null })), /teori_saat_uygulama_saat_ck/);
await expectErr('DUZELTME with 0+0 hours rejected', ins('duzeltmeler', D({ teori_saat: 0, uygulama_saat: 0 })), /teori_saat_uygulama_saat_ck/);
await expectErr('Görevli without belge rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('beyana dayalı with belge rejected', ins('duzeltmeler', D({ belge_no: 'A-1', oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('belge with outer space rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', belge_no: ' A-1', oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('belge with double space rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', belge_no: 'A  1', oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('belge longer than 64 rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', belge_no: 'x'.repeat(65), oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('belge in NFD rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', belge_no: 'Săyi 12', oturum_id: ids.o2 })), /belge_no_ck/);
await expectErr('öğrenci işleri yazısı with uygulama rejected', ins('duzeltmeler', D({ sebep_kodu: 'OGRENCI_ISLERI_YAZISI', belge_no: 'Y-9', uygulama_saat: 1, oturum_id: ids.o2 })), /uygulama_saat_ck/);
await expectErr('unknown code rejected', ins('duzeltmeler', D({ sebep_kodu: 'YOKLAMADA_SINIFTA_DEGIL', oturum_id: ids.o2 })), /sebep_kodu_ck/);
await expectErr('queue row with Görevli rejected', ins('duzeltmeler', D({ sebep_kodu: 'GOREVLENDIRME', belge_no: 'G-1', kaynak: 'TELEFON_KUYRUGU', kurulum_id: ids.kur, sira_no: 7, oturum_id: ids.o2 })), /kaynak_ck/);
await expectErr('queue row without kurulum rejected', ins('duzeltmeler', D({ sebep_kodu: 'TELEFON_YOK_CALISMIYOR', kaynak: 'TELEFON_KUYRUGU', oturum_id: ids.o2 })), /kaynak_ck/);
await expectErr('kayıt pair half-filled rejected', ins('duzeltmeler', D({ kayit_donem_id: ids.donem, oturum_id: ids.o2 })), /kayit_donem_id_kayit_id_ck/);
// positive controls for the same table
const root = D({ sebep_kodu: 'GOREVLENDIRME', belge_no: 'Görev yazısı 2026/14', teori_saat: 2, uygulama_saat: 1 });
await expectOk('control: valid Görevli root accepted (Turkish NFC belge)', ins('duzeltmeler', root));
const q1 = D({ sebep_kodu: 'TELEFON_YOK_CALISMIYOR', kaynak: 'TELEFON_KUYRUGU', kurulum_id: ids.kur, sira_no: 7, liste_satiri_id: ids.s2 });
await expectOk('control: queue elle ekleme accepted on another student', ins('duzeltmeler', q1));
// A revocation can never arrive through the queue: NULL sebep_kodu must not slip through the kaynak CHECK.
await expectErr('queue GERI_ALMA row rejected', ins('duzeltmeler', D({ tur: 'GERI_ALMA', sebep_kodu: null, teori_saat: null, uygulama_saat: null, onceki_duzeltme_id: q1.id, liste_satiri_id: ids.s2, kaynak: 'TELEFON_KUYRUGU', kurulum_id: ids.kur, sira_no: 8 })), /kaynak_ck/);
await expectOk('control: panel GERI_ALMA of the same queue row accepted', ins('duzeltmeler', D({ tur: 'GERI_ALMA', sebep_kodu: null, teori_saat: null, uygulama_saat: null, onceki_duzeltme_id: q1.id, liste_satiri_id: ids.s2 })));
await expectOk('control: öğrenci işleri yazısı teori-only accepted', ins('duzeltmeler', D({ sebep_kodu: 'OGRENCI_ISLERI_YAZISI', belge_no: 'Y-9', oturum_id: ids.o2, liste_satiri_id: ids.s2 })));

// chain
await expectErr('second chain root for same (oturum, satır) rejected', ins('duzeltmeler', D()), /oturum_id_liste_satiri_id_uq/);
const r2 = D({ onceki_duzeltme_id: root.id });
await expectOk('control: replacement linked to root accepted', ins('duzeltmeler', r2));
await expectErr('branching (second successor of root) rejected', ins('duzeltmeler', D({ onceki_duzeltme_id: root.id })), /onceki_duzeltme_id_uq/);
await expectErr('successor in another (oturum, satır) rejected', ins('duzeltmeler', D({ onceki_duzeltme_id: r2.id, liste_satiri_id: ids.s2, oturum_id: ids.o1 })), /onceki_duzeltme_id_oturum_id_liste_satiri_id_fk|oturum_id_liste_satiri_id_uq/);
await expectErr('GERI_ALMA with code rejected', ins('duzeltmeler', D({ tur: 'GERI_ALMA', onceki_duzeltme_id: r2.id, teori_saat: null, uygulama_saat: null })), /sebep_kodu_ck/);
await expectErr('GERI_ALMA without target rejected', ins('duzeltmeler', D({ tur: 'GERI_ALMA', sebep_kodu: null, teori_saat: null, uygulama_saat: null, oturum_id: ids.o2, liste_satiri_id: ids.s1 })), /onceki_duzeltme_id_ck/);
await expectErr('GERI_ALMA with hours rejected', ins('duzeltmeler', D({ tur: 'GERI_ALMA', sebep_kodu: null, onceki_duzeltme_id: r2.id })), /teori_saat_uygulama_saat_ck/);
await expectOk('control: GERI_ALMA of tail accepted', ins('duzeltmeler', D({ tur: 'GERI_ALMA', sebep_kodu: null, onceki_duzeltme_id: r2.id, teori_saat: null, uygulama_saat: null })));

// sorun_bildirimleri
const start = new Date('2026-10-06T07:00:00Z');
const S = (over = {}) => ({ id: U(), donem_id: ids.donem, ders_id: ids.ders, oturum_id: ids.o1, ogrenci_id: ids.ogr, liste_satiri_id: ids.s1, kayit_donem_id: null, kayit_id: null, karar_surumu: null,
  neden_kodu: 'TELEFON_YOK_CALISMIYOR', durum: 'ACIK', istemci_ani: null, ulasma_ani: start.toISOString(), sure_baslangic_ani: start.toISOString(),
  sure_bitis_ani: new Date(start.getTime() + 72 * 3600e3).toISOString(), kurulum_id: ids.kur, sira_no: 3, kapatan_kisi_id: null, kapanis_ani: null, kapanis_islem_id: null, ...over });
const s1 = S();
await expectOk('control: open report accepted', ins('sorun_bildirimleri', s1));
await expectErr('second open report same student and session rejected', ins('sorun_bildirimleri', S()), /ogrenci_id_oturum_id_uq/);
await expectOk('control: out-of-window report beside it accepted (not ACIK)', ins('sorun_bildirimleri', S({ durum: 'SURE_DISI' })));
await expectErr('window not 72 hours rejected', ins('sorun_bildirimleri', S({ oturum_id: ids.o2, sure_bitis_ani: new Date(start.getTime() + 71 * 3600e3).toISOString() })), /sure_bitis_ani_ck/);
await expectErr('closed without closer rejected', ins('sorun_bildirimleri', S({ oturum_id: ids.o2, durum: 'DEGISIKLIK_YOK' })), /kapanis_ani_ck/);
await expectErr('karar sürümü without kayıt rejected', ins('sorun_bildirimleri', S({ oturum_id: ids.o2, karar_surumu: 5 })), /kayit_donem_id_kayit_id_ck/);
await expectErr('unknown reason rejected', ins('sorun_bildirimleri', S({ oturum_id: ids.o2, neden_kodu: 'DIGER' })), /neden_kodu_ck/);

// denetim_kayitlari
const A = (over = {}) => ({ id: U(), olay_turu: 'duzeltmeler.duzeltme_eklendi', olay_ani: start.toISOString(), yapan_tur: 'KISI', yapan_kisi_id: ids.hoca, yapan_rol: 'HOCA', istemci: 'PANEL',
  istek_kimligi: null, islem_id: null, istemci_ani: null, donem_id: null, ders_id: null, oturum_id: null, ogrenci_id: null, liste_satiri_id: null, kayit_donem_id: null, kayit_id: null,
  hedef_tur: 'DUZELTME', hedef_id: root.id, kod: 'GOREVLENDIRME', onceki: null, sonraki: null, ayrinti: '{}', ...over });
await expectOk('control: audit event accepted', ins('denetim_kayitlari', A()));
await expectOk('control: command-line event of another module accepted', ins('denetim_kayitlari', A({ olay_turu: 'kimlik.komut_satiri', yapan_tur: 'KOMUT_SATIRI', yapan_kisi_id: null, yapan_rol: null, istemci: 'SUNUCU', hedef_tur: null, hedef_id: null, kod: null })));
await expectOk('control: is-kuyrugu prefix accepted', ins('denetim_kayitlari', A({ olay_turu: 'is-kuyrugu.eposta_gonderilemedi' })));
await expectErr('unknown module prefix rejected', ins('denetim_kayitlari', A({ olay_turu: 'yonetim.bir_sey' })), /olay_turu_ck/);
await expectErr('KISI without person rejected', ins('denetim_kayitlari', A({ yapan_kisi_id: null })), /yapan_tur_ck/);
await expectErr('role on SISTEM rejected', ins('denetim_kayitlari', A({ yapan_tur: 'SISTEM', yapan_kisi_id: null, yapan_rol: 'HOCA' })), /yapan_tur_ck/);
await expectErr('lowercase code rejected', ins('denetim_kayitlari', A({ kod: 'gorevli' })), /kod_ck/);
await expectErr('detail over 8 KB rejected', ins('denetim_kayitlari', A({ ayrinti: JSON.stringify({ x: 'a'.repeat(9000) }) })), /ayrinti_ck/);
await expectErr('array detail rejected', ins('denetim_kayitlari', A({ ayrinti: '[]' })), /ayrinti_ck/);

// grants
await expectOk('control: app role inserts audit row', ins('denetim_kayitlari', A(), 'yoklama_api'));
const asRole = async (role, sql, params = []) => { await db.exec(`SET ROLE ${role}`); try { await db.query(sql, params); return null; } catch (e) { return e.message; } finally { await db.exec('RESET ROLE'); } };
await expectErr('app role cannot UPDATE audit', asRole('yoklama_api', `UPDATE denetim_kayitlari SET kod = 'X'`), /permission denied/);
await expectErr('app role cannot DELETE audit', asRole('yoklama_api', `DELETE FROM denetim_kayitlari`), /permission denied/);
await expectErr('worker role cannot UPDATE corrections', asRole('yoklama_isci', `UPDATE duzeltmeler SET belge_no = NULL`), /permission denied/);
await expectErr('app role cannot DELETE corrections', asRole('yoklama_api', `DELETE FROM duzeltmeler`), /permission denied/);
await expectOk('control: app role updates report status column', asRole('yoklama_api', `UPDATE sorun_bildirimleri SET durum = 'DEGISIKLIK_YOK', kapatan_kisi_id = $1, kapanis_ani = $2 WHERE id = $3`, [ids.hoca, start.toISOString(), s1.id]));
await expectErr('app role cannot UPDATE report reason', asRole('yoklama_api', `UPDATE sorun_bildirimleri SET neden_kodu = 'QR_OKUTAMADI'`), /permission denied/);
await expectErr('api role cannot write partitions', asRole('yoklama_api', `DELETE FROM gunluk_inceleme_partileri`), /permission denied/);

// gunluk_inceleme_partileri
const P = (over = {}) => ({ gun: '2026-10-06', hoca_id: ids.hoca, sira: 1, oge_turu: 'INCELEME', ders_id: ids.ders, oturum_id: ids.o1, kayit_donem_id: ids.donem, kayit_id: ids.kayit, sorun_bildirimi_id: null, kritik: true, bekleme_baslangic_ani: start.toISOString(), olusturma_ani: start.toISOString(), ...over });
await expectOk('control: partition item accepted (worker role)', ins('gunluk_inceleme_partileri', P(), 'yoklama_isci'));
await expectErr('same record twice in a day rejected', ins('gunluk_inceleme_partileri', P({ sira: 2 })), /gun_hoca_id_kayit_id_uq/);
await expectErr('INCELEME item without record rejected', ins('gunluk_inceleme_partileri', P({ sira: 3, kayit_donem_id: null, kayit_id: null })), /oge_turu_ck/);
await expectErr('report item carrying a record rejected', ins('gunluk_inceleme_partileri', P({ sira: 4, oge_turu: 'SORUN_BILDIRIMI', sorun_bildirimi_id: s1.id })), /oge_turu_ck/);
await expectOk('control: report item accepted', ins('gunluk_inceleme_partileri', P({ sira: 5, oge_turu: 'SORUN_BILDIRIMI', kayit_donem_id: null, kayit_id: null, sorun_bildirimi_id: s1.id })));
await expectErr('sira 0 rejected', ins('gunluk_inceleme_partileri', P({ sira: 0, oge_turu: 'ISARETLI_OTURUM', kayit_donem_id: null, kayit_id: null })), /sira_ck/);

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);

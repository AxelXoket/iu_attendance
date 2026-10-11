// Deterministic consistency audit of spec/D07.json + frag/D07.html beyond spec-validate.js.
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(B, 'spec', 'D07.json'), 'utf8'));
const H = fs.readFileSync(path.join(B, 'frag', 'D07.html'), 'utf8');
const INV = JSON.parse(fs.readFileSync(path.join(B, 'inv', 'D07.json'), 'utf8'));
const CT = JSON.parse(fs.readFileSync(path.join(B, 'contracts.json'), 'utf8'));
const C = require('./icerik.js');
const errs = [], notes = [];
const all = JSON.stringify(S);

// 1. gaps and contradictions
const resolved = new Set(S.resolved_gaps.map(g => g.gap));
const openTxt = JSON.stringify(S.open_points);
for (const g of INV.gaps) {
  const inRes = resolved.has(g.id), inOpen = openTxt.includes(g.id);
  if (!inRes && !inOpen) errs.push('gap not covered: ' + g.id);
  if (inRes && inOpen) notes.push('gap both resolved and open: ' + g.id);
  if (g.needs_owner && !inOpen) errs.push('owner gap not an open point: ' + g.id);
}
// review findings (B31..), closed alignment points (A..) and architect-approved deviations (S..) are not inventory gaps
for (const r of S.resolved_gaps) if (!INV.gaps.find(g => g.id === r.gap) && !/^D07-(B3[1-9]|A\d\d|S\d\d|G\d\d)$/.test(r.gap)) errs.push('resolved unknown gap ' + r.gap);
for (const o of S.open_points) if (!o.needs_owner) errs.push('open point without owner decision left: ' + o.id);
const cres = new Set(S.contradictions_resolved.map(c => c.id));
for (const c of INV.contradictions) if (!cres.has(c.id)) errs.push('contradiction not resolved: ' + c.id);

// 2. exports equal contract names
const mod = CT.modules.find(m => m.id === 'D07');
const want = mod.exports.map(e => e.split('(')[0]).sort();
const have = S.exports.map(e => e.name).sort();
if (JSON.stringify(want) !== JSON.stringify(have)) errs.push('exports differ: want ' + want + ' have ' + have);
for (const e of S.exports) if (!e.signature.startsWith(e.name + '(')) errs.push('signature name mismatch ' + e.name);
// contract parameter names appear in the signature, in order
for (const ce of mod.exports) {
  if (!ce.includes('(')) { if (!S.exports.find(e => e.name === ce)) errs.push('contract export missing in spec: ' + ce); continue; }
  const name = ce.split('(')[0], params = ce.slice(ce.indexOf('(') + 1, ce.indexOf(')')).split(',').map(s => s.trim());
  const found = S.exports.find(e => e.name === name);
  if (!found) { errs.push('contract export missing in spec: ' + name); continue; }
  const sig = found.signature;
  const sp = sig.slice(sig.indexOf('(') + 1).split(')')[0].split(',').map(s => s.split(':')[0].trim());
  if (JSON.stringify(sp) !== JSON.stringify(params)) errs.push(`param list differs for ${name}: contract ${params} spec ${sp}`);
}

// 3. code vocabulary
const known = new Set([
  ...C.gerekceler.map(g => g[0]), ...C.kanitGerekceleri.map(k => k[0]), ...C.hataKodlari.map(h => h[0]),
  'VAR', 'BEKLEMEDE', 'INCELEMEDE', 'RET', 'YOK',
  'KAYIT', 'CIHAZ_DEGISIMI', 'ANAHTAR_YENILEME', 'ANDROID', 'IOS', 'ANDROID_ANAHTAR_KANITI', 'APP_ATTEST', 'KANITSIZ',
  'DOGRULANDI', 'DOGRULANAMADI', 'REDDEDILDI', 'IPTAL_LISTESINDE', 'SOFTWARE', 'TRUSTED_ENVIRONMENT', 'STRONG_BOX', 'VERIFIED', 'SELF_SIGNED', 'UNVERIFIED', 'FAILED',
  'GOOGLE_RSA', 'GOOGLE_P384', 'APPLE_APP_ATTEST', 'PRODUCTION', 'DEVELOPMENT', 'BEKLENMEYEN_DAGITIM_TURU', 'YAYIMLANMAMIS_PAKET_SURUMU',
  'REVOKED', 'SUSPENDED', 'KEY_COMPROMISE', 'OTOMATIK', 'HOCA', 'KAFA_SAYISI_ASIMI', 'QR_BELGESIZ_GOSTERIM', 'RASTGELE_SECIM', 'ISARETLI_OTURUM',
  'SECILDI', 'SINIFTA_DEGIL', 'GERI_ALINDI', 'TELEFON', 'MAKBUZ', 'GECTI', 'ARTMADI', 'VERILDI', 'TUKETILDI', 'SURESI_GECTI', 'ACIK', 'KALKTI', 'INCELENDI', 'KESINLESTI',
  'ICINDE', 'DISINDA', 'DEGISIM_DILIMI', 'ESKI_PROGRAM',
  'KAYIT_GELDI', 'TEYIT_VERILDI', 'CIHAZ_DEGISIMI_ONAYLANDI', 'CIHAZ_DEGISIMI_REDDEDILDI', 'LISTE_DEGISTI', 'PENCERE_DEGISTI', 'KAFA_SAYISI_GELDI', 'AYAR_KESINLESTI',
  'QR_GOSTERIM_KAYDI', 'KESINTI_KAPANDI', 'BEKLEME_SURESI_DOLDU', 'HOCA_ONAYI', 'HOCA_REDDI', 'KENDI_BEYANI_ONAYI', 'KENDI_BEYANI_REDDI', 'SINIFTA_DEGIL_GERI_ALINDI',
  'ORTAK_SINIR', 'RASTGELE_ISIM_ADEDI', 'DEGER_OMRU_MS', 'SUNUCU_YOGUN', 'DOGRULAMA_ROTALARI', 'DOGRULAMA_', 'BÜYÜK_HARF', 'KARAR', 'BEKLİYOR',
  'PRIMARY', 'KEY', 'CHECK', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'WHERE', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'GIN', 'INCLUDE', 'DESC', 'ARRAY',
  'SELECT', 'FOR', 'UPDATE', 'ON', 'CONFLICT', 'DO', 'NOTHING', 'GET', 'POST', 'DELETE', 'JSON', 'HTTP', 'HTTPS', 'SQL', 'UTC', 'ISO', 'UUID', 'UUIDV7', 'CBOR', 'DER', 'MAC',
  'TEE', 'CI', 'API', 'AKSİS', 'TZ', 'GIN', 'KiB', 'MiB', 'SHA', 'P', 'RSA', 'ID', 'QR', 'T', 'A', 'Z', 'B', 'D', 'K', 'TEST',
]);
const tokens = new Set([...(all + H).matchAll(/\b[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9_]{1,}\b/g)].map(m => m[0]));
const unknown = [...tokens].filter(t => !known.has(t) && !/^D\d\d$/.test(t) && !/^D\d\d-[ABKC]\d\d$/.test(t) && !/^P\d+$/.test(t) && !/^SHA$/.test(t));
if (unknown.length) notes.push('tokens to eyeball: ' + unknown.sort().join(' '));

// 4. error codes: defined and used
const defined = new Set(C.hataKodlari.map(h => h[0]));
const usedTxt = JSON.stringify([S.endpoints, S.exports, S.jobs, C.kuyrukOgesi, S.state_machines, S.invariants, S.tests]);
for (const d of defined) if (!usedTxt.includes(d)) errs.push('error code defined but never used: ' + d);
for (const m of new Set([...(all + H).matchAll(/DOGRULAMA_[A-Z_]+/g)].map(x => x[0]))) if (!defined.has(m) && !['DOGRULAMA_ROTALARI', 'DOGRULAMA_DENETIM_OLAYLARI'].includes(m)) errs.push('error-like code not defined: ' + m);
for (const e of S.endpoints) for (const x of e.errors) { const c = (x.match(/DOGRULAMA_[A-Z_]+/) || [])[0]; if (c && !defined.has(c)) errs.push('endpoint error undefined ' + c); }

// 5. reason codes referenced exist in catalog (tokens ending in known patterns)
const cat = new Set(C.gerekceler.map(g => g[0]));
for (const t of tokens) if (/^(QR_|YEDEK_|ORTAK_SINIR|SAAT_|CAPALAR|SAYAC_|HATALI|CAKISAN|SON_GUNDEN|KAPANMIS|TEYIT_|HESAP_|CIHAZ_ONAY|ESKI_|OTURUM_IPTAL|LISTEDE|ULASMA|PENCERE_DIS|YOKLAMADA|KENDI_BEYANI_RED|KENDI_BEYANI_ONAYLANDI|HOCA_RED|HOCA_ONAYLADI|AYAR_KES|CIHAZ_DEGISIMI_BEK)/.test(t) && !cat.has(t) && !known.has(t) && !['HESAP_SILINDI', 'HESAP_KAPANDI', 'YEDEK_KOD_ESLESMEDI', 'CAPALAR_ESKI', 'SAAT_DOGRULANAMADI'].includes(t)) errs.push('reason-like token not in catalog: ' + t);
// every catalog code appears outside the catalog table at least once (used by a rule, test or decision) or is Stage 2
const nonCatalogTxt = JSON.stringify([S.resolved_gaps, S.state_machines, S.tests, S.invariants, S.jobs, S.endpoints, S.open_points, C.olaylar, C.kanitNotlari, C.oncelik, S.tables]);
for (const [k, , , asama] of C.gerekceler) if (asama === 1 && !nonCatalogTxt.includes(k)) notes.push('stage-1 reason only in catalog: ' + k);

// 6. leftover markup and tag balance for tags the validator does not check
if (/\{\{|\}\}|\[\[|\]\]/.test(H)) errs.push('leftover markup in fragment');
if (/\{\{|\[\[/.test(all)) errs.push('leftover markup in spec');
for (const t of ['summary', 'li', 'th', 'td', 'strong', 'span']) {
  const o = (H.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'g')) || []).length, c = (H.match(new RegExp(`</${t}>`, 'g')) || []).length;
  if (o !== c) errs.push(`<${t}> open ${o} close ${c}`);
}
if ((H.match(/<details>/g) || []).length !== (H.match(/<summary>/g) || []).length) errs.push('details without summary');

// 7. state machine consistency
for (const sm of S.state_machines) {
  const st = new Set(sm.states);
  for (const tr of sm.transitions) for (const side of [tr.from, tr.to]) for (const tok of side.split(/,\s*| ya da /)) {
    const t = tok.trim();
    if (!st.has(t) && !['(yok)', 'aynı (donar)'].includes(t)) errs.push(`state ${t} not in ${sm.name}`);
  }
}

// 8. uniqueness, kinds, presence in fragment
const dup = a => a.filter((x, i) => a.indexOf(x) !== i);
if (dup(S.tests.map(t => t.name)).length) errs.push('duplicate test names ' + dup(S.tests.map(t => t.name)));
if (dup(S.files).length) errs.push('duplicate files');
for (const t of S.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('bad kind ' + t.kind);
for (const t of S.tables) if (!H.includes(t.name)) errs.push('table missing in frag ' + t.name);
for (const e of S.endpoints) if (!H.includes(e.path.replace(/</g, '&lt;'))) errs.push('endpoint missing in frag ' + e.path);
for (const j of S.jobs) if (!H.includes(j.name)) errs.push('job missing in frag ' + j.name);
for (const o of S.open_points) if (!/^D07-A\d\d$/.test(o.id) || typeof o.needs_owner !== 'boolean') errs.push('bad open point ' + o.id);
const sents = S.summary.split(/(?<=[.!?])\s+/).filter(Boolean).length;
if (sents < 3 || sents > 6) errs.push('summary sentences ' + sents);
// 9. every column type is a PostgreSQL type we expect
const okTypes = new Set(['uuid', 'text', 'bytea', 'boolean', 'bigint', 'integer', 'smallint', 'timestamptz', 'text[]', 'uuid[]']);
for (const t of S.tables) for (const c of t.columns) if (!okTypes.has(c.type)) errs.push(`type ${c.type} in ${t.name}.${c.name}`);
// 10. constraint and index names follow <tablo>_<sütunlar>_<pk|fk|uq|ck|idx>
for (const t of S.tables) for (const x of [...t.constraints, ...t.indexes]) {
  const m = x.match(/^([a-z_]+?)_(pk|fk|uq|ck|idx)\b/);
  const first = x.split(/[ ,(:]/)[0];
  if (/^[a-z_]+_(pk|fk|uq|ck|idx)$/.test(first) && !first.startsWith(t.name + '_')) errs.push(`constraint name ${first} not prefixed by ${t.name}`);
}

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'AUDIT OK');
if (notes.length) console.log('NOTES:\n' + notes.join('\n'));
process.exit(errs.length ? 1 : 0);

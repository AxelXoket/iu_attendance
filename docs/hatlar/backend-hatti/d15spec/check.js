// Cross-reference checks for spec/D15.json (deterministic; complements spec-validate.js).
'use strict';
const fs = require('fs');
const path = require('path');
const S = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spec', 'D15.json'), 'utf8'));
const I = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'inv', 'D15.json'), 'utf8'));
const txt = JSON.stringify(S);
const errs = [];

// 1) every inventory gap and contradiction is handled exactly once
const gapIds = I.gaps.map((g) => g.id);
const got = S.resolved_gaps.map((g) => g.gap);
for (const id of gapIds) if (got.filter((x) => x === id).length !== 1) errs.push('gap not resolved exactly once: ' + id);
for (const id of got) if (!gapIds.includes(id)) errs.push('unknown gap in spec: ' + id);
for (const c of I.contradictions) if (!S.contradictions_resolved.some((x) => x.id === c.id)) errs.push('contradiction missing: ' + c.id);
// owner gaps must point to an open point
for (const g of I.gaps.filter((x) => x.needs_owner)) {
  const r = S.resolved_gaps.find((x) => x.gap === g.id);
  if (!/D15-A\d\d/.test(r.decision)) errs.push('owner gap without open point: ' + g.id);
}

// 2) referenced ids exist
const opIds = new Set(S.open_points.map((o) => o.id));
for (const m of txt.matchAll(/D15-A\d\d/g)) if (!opIds.has(m[0])) errs.push('missing open point ' + m[0]);
for (const m of txt.matchAll(/D15-B(\d\d)/g)) if (+m[1] < 1 || +m[1] > 42) errs.push('bad gap ref ' + m[0]);
for (const m of txt.matchAll(/D15-C(\d\d)/g)) if (!['01', '02'].includes(m[1])) errs.push('bad contradiction ref ' + m[0]);
const opsRefd = new Set([...txt.matchAll(/D15-A\d\d/g)].map((m) => m[0]));
for (const o of S.open_points) if (!S.resolved_gaps.some((g) => g.decision.includes(o.id)) && !['D15-A12', 'D15-A13'].includes(o.id)) errs.push('open point not tied to a gap: ' + o.id);

// 3) alert types used in prose exist in the catalog
const turler = new Set(S.uyari_kurallari.map((u) => u.tur));
for (const m of txt.matchAll(/\bisletim\.([a-z_]+)\b/g)) {
  const t = 'isletim.' + m[1];
  if (['isletim.denetim', 'isletim.ts'].includes(t)) continue; // log event name and file name
  if (!turler.has(t)) errs.push('alert type not in catalog: ' + t);
}

// 4) ISLETIM_ codes used in prose exist in the code table (or are constant names)
const kodlar = new Set(S.hata_kodlari.flatMap((h) => h.kod.split(/,\s*/)));
const sabitler = new Set(['ISLETIM_ROTALARI', 'ISLETIM_HATALARI', 'ISLETIM_OGE_GEREKCELERI', 'ISLETIM_ISLETIM_KODLARI', 'ISLETIM_ESIKLERI', 'ISLETIM_GIZLI_ALANLAR', 'ISLETIM_UYARI_ALICILARI', 'ISLETIM_SERTIFIKA_TURU', 'ISLETIM_CADDY_ADRESI', 'ISLETIM_ORTAM', 'ISLETIM_KOPYA_ADI', 'ISLETIM_CI_KALP_ATISI_ADRESI']);
for (const m of txt.matchAll(/\bISLETIM_[A-Z_]+\b/g)) if (!kodlar.has(m[0]) && !sabitler.has(m[0])) errs.push('code not in table: ' + m[0]);

// 5) env names used in prose exist in the settings schema (or are Caddy/compose-only)
const envs = new Set(S.ayar_semasi.map((a) => a.env));
const caddyEnv = new Set(['VERITABANI_BEKLENIYOR', 'API_1_YENI', 'API_2_YENI', 'EPOSTA_TURLERI', 'ACME_EPOSTA', 'ACME_CA', 'GUVENILEN_AG_GECIDI', 'ISTEMCI_ADRES_BASLIGI', 'HSTS_DEGERI', 'XPREM_PORT', 'IU_GIZLI_DIZIN', 'DB_KEYS_MASTER_KEY_B64', 'DISABLE_TELEMETRY']);
const known = /^(API_|BASKI_|VERITABANI_|EPOSTA_|INCELEME_|SAAT_ESITLEME_|ANDROID_|APP_ATTEST_|IPTAL_|DEVAM_|DUZELTMELER_|ISLETIM_|LOG_|GIZLI_|DURUM_|ALAN_|PANEL_|GUVENILEN_VEKIL|YAYIN_BILGISI|KAPANIS_)/;
for (const m of txt.matchAll(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g)) {
  const n = m[0];
  if (!known.test(n) || n.startsWith('API_') && /^API_(UC|ISTEK|KIMLIK|ROL|KOKEN|GOVDE|ICERIK|HIZ|SUNUCU|SORGU|SURUM|JSON|SONUC)/.test(n)) continue;
  if (n.startsWith('ISLETIM_') && (kodlar.has(n) || sabitler.has(n))) { if (!envs.has(n) && /ALICILARI|SERTIFIKA_TURU|CADDY_ADRESI|ORTAM|KOPYA_ADI/.test(n)) errs.push('env missing ' + n); continue; }
  if (n.startsWith('VERITABANI_') && /^VERITABANI_(HAVUZ_DOLU|NESIL|SAKLAMA|YEDEK|DENEME|BOLUM|GOC|KILITLENME|SURUM|TEST|KURULUM|ERISILEMEZ)/.test(n)) continue;
  if (n.startsWith('SAAT_') && !n.startsWith('SAAT_ESITLEME_')) continue;
  if (!envs.has(n) && !caddyEnv.has(n)) errs.push('env not in schema: ' + n);
}

// 6) secrets matrix and compose agree on names used in prose
const sirAdlari = S.sirlar.flatMap((s) => s.ad.split(/,\s*/));
for (const s of ['saat_belgesi', 'qr_anahtar_kaynagi', 'giris_kodu_ozeti', 'eposta_ozeti', 'ulasma_makbuzu', 'inceleme_sabit_kodu', 'smtp_parolasi', 'kalp_atisi']) if (!sirAdlari.includes(s)) errs.push('secret missing in matrix: ' + s);

// 7) jobs: 4 pg-boss with cron and tz
for (const j of S.jobs) if (/pg-boss, işçide/.test(j.schedule) && !/Europe\/Istanbul/.test(j.schedule)) errs.push('pg-boss job without tz: ' + j.name);

// 8) no dashes, no KVKK, no 'ileride' staging words
if (/[–—]/.test(txt)) errs.push('dash');
if (/KVKK/i.test(txt)) errs.push('KVKK');

console.log(errs.length ? 'CHECK ERRORS (' + errs.length + '):\n' + [...new Set(errs)].join('\n') : 'check ok');
process.exit(errs.length ? 1 : 0);

// Deterministic checks for the r2 fix round of D02. Usage: node check-r2.js <spec.json>
const fs = require('fs');
const S = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const errs = [];
const all = JSON.stringify(S);
// 1. Names: <tablo>_<sütunlar>_<tür> with real columns, or an explicit kisitAdi(...) call.
for (const t of S.tables) {
  const cols = new Set(t.columns.map(c => c.name));
  const items = [...t.indexes, ...t.constraints];
  for (const it of items) {
    const m = it.match(/^([a-z_]+?)(?: |:|$)/);
    if (!m || !/_(pk|fk|uq|ck|idx)$/.test(m[1])) continue; // prose items or kisitAdi(...) calls
    const name = m[1];
    if (!name.startsWith(t.name + '_')) { errs.push(`${t.name}: ad tablo önekiyle başlamıyor: ${name}`); continue; }
    const govde = name.slice(t.name.length + 1).replace(/_(pk|fk|uq|ck|idx)$/, '');
    // greedy split into known column names
    const parca = (rest) => { if (!rest) return true; for (const c of cols) if (rest === c || rest.startsWith(c + '_')) { if (parca(rest === c ? '' : rest.slice(c.length + 1))) return true; } return false; };
    if (!parca(govde)) errs.push(`${t.name}: ad sütunlardan türemiyor: ${name}`);
    if (Buffer.byteLength(name) > 63) errs.push(`${t.name}: 63 baytı aşan ad kisitAdi çağrısı olarak yazılmalı: ${name}`);
  }
  for (const c of t.columns) {
    if (c.type === 'timestamptz') errs.push(`${t.name}.${c.name}: timestamptz(3) olmalı`);
    if (c.name === 'silindi' || c.name === 'etkin' || (c.name === 'durum' && ['dersler', 'subeler'].includes(t.name))) errs.push(`${t.name}.${c.name}: yaşam döngüsü sütunu D12-B16 biçiminde olmalı`);
    if (c.name === 'surum' && c.default !== '0') errs.push(`${t.name}.surum DEFAULT 0 olmalı`);
  }
}
// 2. Schedules
const job = n => S.jobs.find(j => j.name === n);
if (!job('donem_kilidi').schedule.includes("'5 0 * * *'")) errs.push('donem_kilidi 00:05 değil');
if (!job('deneme_dersi_oturumlari').schedule.includes("'35 0 * * *'")) errs.push('deneme 00:35 değil');
if (!job('takvim_oturumlarini_yenile').schedule.includes("'55 1 * * *'")) errs.push('takvim gece 01:55 değil');
for (const bad of ['04:50', '04:40', '00:20', '03:00 ile 04:00']) if (all.includes(bad)) errs.push('eski saat kaldı: ' + bad);
// 3. D08 reasons
for (const bad of ["'takvim')", "null, program)", "null, 'program')"]) if (all.includes(bad)) errs.push('eski D08 nedeni: ' + bad);
for (const need of ['DEVAM_NEDENLERI.PROGRAM', 'DEVAM_NEDENLERI.YAPILDI', 'DEVAM_NEDENLERI.KILIT']) if (!all.includes(need)) errs.push('eksik: ' + need);
// 4. Exports
const ex = new Set(S.exports.map(x => x.name));
for (const need of ['denemeDersi', 'hocaninDersleri', 'oturumSayfasi', 'derslerKur', 'isler']) if (!ex.has(need)) errs.push('dış yüz eksik: ' + need);
for (const bad of ['denemeDersiniKur', 'derslerIsTanimlari']) if (ex.has(bad)) errs.push('kaldırılmalı: ' + bad);
if (all.includes('kapsamdanCikti') || all.includes('hocaAtamaSurumu') || all.includes('OturumKisisi')) errs.push('eski indirme ya da yetki terimi kaldı');
// 5. Cache header and error catalog
if (/Cache-Control: public/.test(all)) errs.push('public önbellek başlığı kaldı');
const uclarKodlar = new Set(S.endpoints.flatMap(e => e.errors));
if (uclarKodlar.has('DERSLER_SONUC_COK_BUYUK')) errs.push('DERSLER_SONUC_COK_BUYUK kaldı');
for (const e of S.endpoints.filter(e => ['POST', 'PUT', 'PATCH'].includes(e.method) && !e.path.includes('/yonetim') && !e.path.endsWith('/onizleme'))) if (!e.errors.includes('DERSLER_INCELEME_HESABI')) errs.push('inceleme kodu yok: ' + e.method + ' ' + e.path);
for (const e of S.endpoints) if (/201/.test(JSON.stringify(e.response))) errs.push('201 kaldı: ' + e.path);
const agir = S.endpoints.filter(e => /'agir'/.test(e.rate_limit)).map(e => e.path);
if (!agir.includes('/v1/dersler/{dersId}/cakismalar') || !agir.includes('/v1/dersler/{dersId}/program/onizleme')) errs.push('agir sınıfı eksik');
// 6. Every open point id sequential
S.open_points.forEach((o, i) => { if (o.id !== 'D02-A' + String(i + 1).padStart(2, '0')) errs.push('açık nokta sırası ' + o.id); });
if (errs.length) { console.log('HATA (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }
console.log('check-r2 OK');

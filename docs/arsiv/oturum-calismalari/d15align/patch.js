'use strict';
// D15 alignment: orig-spec.json (byte copy of spec/D15.json before alignment) -> spec/D15.json.
const fs = require('fs'), path = require('path');
const B = 'C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-Desktop-iu-attendance/7abdd45e-faba-44fe-954e-90155d6bca30/scratchpad/r17/backend';
let txt = fs.readFileSync(path.join(__dirname, 'orig-spec.json'), 'utf8');
// Machine scripts move from apps/server/src/infra/izleme/makine/ to docker/isletim/ (I080, contracts glob docker/isletim/*).
txt = txt.split('apps/server/src/infra/izleme/makine/').join('docker/isletim/');
txt = txt.split('infra/izleme/makine/').join('docker/isletim/');
txt = txt.replace(/(^|[\s("])makine\/(?=[a-z])/g, '$1docker/isletim/');
const S = JSON.parse(txt);
for (const p of ['p1', 'p2', 'p3', 'p4', 'p5']) require('./' + p + '.js')(S);
// keep key order stable: new top-level fields go after istekler
const order = Object.keys(S);
const out = {};
for (const k of order) { if (k === 'harita_disi_istekler' || k === 'olcum_komsu_sutunlari') continue; out[k] = S[k]; if (k === 'istekler') out.harita_disi_istekler = S.harita_disi_istekler; if (k === 'olcum_gorunumleri') out.olcum_komsu_sutunlari = S.olcum_komsu_sutunlari; }
const json = JSON.stringify(out, null, 1) + '\n';
// leftovers that must not survive
const bad = [/kimlikOlayiDinleyicisiKaydet(?![^"]*(yoktur|değil|kalktı|adlı))/, /D15-A12(?!")/, /deleteAllJobs yardımcısı; çizelge güncellemesi \(D15-A12\)/, /işlem başına tek çağrı/, /D14'e ekleme isteği/, /makine\.test\.ts/, /anahtar-uret oturumlari-kapat/, /'den istek\)/, /ISLETIM_ISLETIM_KODLARI/, /[\u2013\u2014]/];
const errs = [];
for (const re of bad) { const m = json.match(re); if (m) errs.push(String(re) + ' -> ' + json.slice(Math.max(0, m.index - 80), m.index + 80)); }
for (const m of json.matchAll(/(.{0,40})makine\/(.{0,20})/g)) if (!/durum\/makine\//.test(m[0])) errs.push('makine/ left: ' + m[0]);
if (errs.length) { console.log('LEFTOVERS:\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(B, 'spec', 'D15.json'), json);
console.log('spec written', json.length, 'bytes;', out.exports.length, 'exports,', out.files.length, 'files,', out.tests.length, 'tests,', out.open_points.length, 'open points');

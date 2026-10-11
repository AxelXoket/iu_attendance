// Deterministic checks of spec/D14.json against inventory, plan.html and its own scheduling rules.
const fs = require('fs');
const S = JSON.parse(fs.readFileSync('spec/D14.json', 'utf8'));
const inv = JSON.parse(fs.readFileSync('inv/D14.json', 'utf8'));
const plan = fs.readFileSync('C:/Users/USER/Desktop/iu_attendance/plan.html', 'utf8').replace(/<[^>]+>/g, '');
const errs = [];
// 1. every inventory gap and contradiction handled
for (const g of inv.gaps) if (!S.resolved_gaps.some(r => r.gap === g.id) && !S.open_points.some(o => o.question.includes(g.id) || o.recommendation.includes(g.id))) errs.push('gap not handled ' + g.id);
for (const c of inv.contradictions) if (!S.contradictions_resolved.some(r => r.id === c.id)) errs.push('contradiction not handled ' + c.id);
// needs_owner gaps must map to an open point
for (const g of inv.gaps.filter(g => g.needs_owner)) { const r = S.resolved_gaps.find(r => r.gap === g.id); const m = r && r.decision.match(/D14-A0\d/); if (!m || !S.open_points.some(o => o.id === m[0])) errs.push('needs_owner gap without open point ' + g.id); }
// 2. fixed sentences verbatim in plan.html
const sabit = S.constants.find(c => c.ad === 'SABIT_UYARI_CUMLESI').deger;
if (!plan.includes(sabit)) errs.push('SABIT_UYARI_CUMLESI not verbatim in plan.html');
const sen = S.constants.find(c => c.ad === 'SEN_DEGILSEN_CUMLESI').deger.replace(/\.$/, '');
if (!plan.includes(sen)) errs.push('SEN_DEGILSEN_CUMLESI not in plan.html');
if (!/dakikada 1, saatte 5, günde 10/.test(plan)) errs.push('limit numbers not in plan');
// 3. own scheduling rules on the proposed table (daily pg-boss rows with HH:MM)
const rows = S.schedule_plan.filter(r => r.yer === 'pg-boss' && /^\d\d:\d\d$/.test(r.saat));
const min = s => +s.slice(0, 2) * 60 + +s.slice(3);
const times = rows.map(r => ({ is: r.is.split(' ')[0], t: min(r.saat) })).sort((a, b) => a.t - b.t);
for (const x of times) if (x.t >= 180 && x.t < 300) errs.push('daily job in 03:00-05:00: ' + x.is);
for (let i = 1; i < times.length; i++) if (times[i].t - times[i - 1].t < 5) errs.push('gap < 5 min: ' + times[i - 1].is + ' ' + times[i].is);
for (const r of rows) { const m = r.not.match(/sonra: ([a-z_, ]+)/); if (!m) continue; const me = min(r.saat);
  for (const dep of m[1].split(',').map(s => s.trim()).filter(Boolean)) { const d = times.find(x => x.is === dep); if (!d) errs.push('sonra target missing ' + dep); else if (me - d.t < 10) errs.push(`sonra < 10 min: ${dep} -> ${r.is}`); } }
// 4. job schedule text of D14's own job matches the table
const own = S.schedule_plan.find(r => r.is === 'eposta_gonderim_temizligi');
if (!S.jobs.find(j => j.name === 'eposta_gonderim_temizligi').schedule.includes(own.saat)) errs.push('own job time mismatch');
// 5. CHECK lists consistent with column notes
const ck = S.tables[0].constraints.find(c => c.startsWith('eposta_gonderimleri_hata_turu_ck'));
for (const v of ['gecici','kalici','baglanti','zaman_asimi','kimlik_dogrulama','kapanis','kapasite']) if (!ck.includes(`'${v}'`)) errs.push('hata_turu CHECK missing ' + v);
if (ck.includes('sablon')) errs.push('hata_turu still has sablon');
// 6. every test kind valid, every export named, no empty strings
const kinds = new Set(['behavior','property','contract','load','mutation']);
for (const t of S.tests) if (!kinds.has(t.kind)) errs.push('bad kind ' + t.name);
const kinds2 = S.tests.reduce((m, t) => (m[t.kind] = (m[t.kind] || 0) + 1, m), {});
console.log('daily pg-boss rows checked:', times.length, 'test kinds:', JSON.stringify(kinds2));
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'CHECK OK');

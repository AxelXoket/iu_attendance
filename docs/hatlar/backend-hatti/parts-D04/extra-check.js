// Extra gate for D04: quote word count <= 25, D04 id references resolve, contradiction fragments exist in source text.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const text = f => fs.readFileSync(REPO + f, 'utf8').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const docs = { plan: text('plan.html'), teknik: text('teknik.html'), tasarim: text('tasarim.html') };
const j = JSON.parse(fs.readFileSync('inv/D04.json', 'utf8'));
const errs = [];
for (const d of j.decided) { const n = d.quote.trim().split(/\s+/).length; if (n > 25) errs.push(`${d.id} quote has ${n} words`); }
const ids = new Set([...j.decided, ...j.gaps, ...j.contradictions].map(x => x.id));
const refs = [...JSON.stringify(j).matchAll(/D04-[KBC]\d\d/g)].map(m => m[0]);
for (const r of new Set(refs)) if (!ids.has(r)) errs.push(`dangling reference ${r}`);
for (const c of j.contradictions) for (const side of ['a', 'b']) {
  const file = c[side].match(/^(plan|teknik|tasarim)\.html/); if (!file) { errs.push(`${c.id}.${side} has no file`); continue; }
  for (const m of c[side].matchAll(/"([^"]{8,})"/g)) if (!docs[file[1]].includes(m[1].replace(/\s+/g, ' ').trim())) errs.push(`${c.id}.${side} fragment not in ${file[1]}: ${m[1].slice(0, 60)}`);
}
const owners = j.gaps.filter(g => g.needs_owner).map(g => g.id);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : `EXTRA OK: refs ${new Set(refs).size}, max quote words ${Math.max(...j.decided.map(d => d.quote.trim().split(/\s+/).length))}, needs_owner ${owners.join(' ')}`);
process.exit(errs.length ? 1 : 0);

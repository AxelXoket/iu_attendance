// Extra gate for D12 beyond spec-validate.js: coverage of inventory ids, open point references,
// contract exports, tag balance of tags the main validator does not count, forbidden terms.
const fs = require('fs');
const S = JSON.parse(fs.readFileSync('spec/D12.json', 'utf8'));
const inv = JSON.parse(fs.readFileSync('inv/D12.json', 'utf8'));
const C = JSON.parse(fs.readFileSync('contracts.json', 'utf8'));
const html = fs.readFileSync('frag/D12.html', 'utf8');
const errs = [];
const gapIds = new Set(S.resolved_gaps.map(g => g.gap));
for (const g of inv.gaps) if (!gapIds.has(g.id)) errs.push('gap not resolved: ' + g.id);
for (const g of S.resolved_gaps) if (!inv.gaps.some(x => x.id === g.gap)) errs.push('unknown gap id: ' + g.gap);
const cIds = new Set(S.contradictions_resolved.map(c => c.id));
for (const c of inv.contradictions) if (!cIds.has(c.id)) errs.push('contradiction not resolved: ' + c.id);
const opIds = new Set(S.open_points.map(o => o.id));
const all = JSON.stringify(S);
for (const m of all.matchAll(/D12-A\d\d/g)) if (!opIds.has(m[0])) errs.push('dangling open point ref: ' + m[0]);
for (const o of S.open_points) if (!all.replace(JSON.stringify(S.open_points), '').includes(o.id)) errs.push('open point never referenced from a gap/contradiction: ' + o.id);
const mod = C.modules.find(m => m.id === 'D12');
const expNames = S.exports.map(e => e.name + ' ' + e.signature).join('\n');
for (const e of mod.exports) { const n = e.split(/[(:\s]/)[0]; if (!expNames.includes(n)) errs.push('contract export missing: ' + n); }
for (const t of ['td', 'th', 'summary', 'strong', 'span', 'pre', 'li']) {
  const o = (html.match(new RegExp('<' + t + '([ \\t\\n][^>]*)?>', 'g')) || []).length, c = (html.match(new RegExp('</' + t + '>', 'g')) || []).length;
  if (o !== c) errs.push(`<${t}> open ${o} close ${c}`);
}
if ((html.match(/<details>/g) || []).length !== (html.match(/<summary>/g) || []).length) errs.push('every details needs one summary');
for (const w of ['KVKK', 'sponsor', 'Sponsor', 'delve', 'robust', 'crucial', '\u2013', '\u2014']) if ((all + html).includes(w)) errs.push('forbidden term: ' + JSON.stringify(w));
for (const t of S.tables) for (const c of t.columns) { if (typeof c.null !== 'boolean') errs.push('null not boolean ' + t.name + '.' + c.name); if (!c.type) errs.push('no type ' + c.name); }
for (const t of S.tests) if (!['behavior', 'property', 'contract', 'load', 'mutation'].includes(t.kind)) errs.push('bad test kind ' + t.kind);
for (const e of S.endpoints) if (!['telefon', 'panel', 'kürsü', 'sunucu'].includes(e.client)) errs.push('bad client ' + e.client);
const sent = S.summary.split(/(?<=[.!?])\s+/).filter(Boolean).length; if (sent < 3 || sent > 6) errs.push('summary sentences ' + sent);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : `EXTRA OK: ${inv.gaps.length} gaps, ${inv.contradictions.length} contradictions covered; ${S.open_points.length} open points all referenced; ${mod.exports.length} contract exports present; summary ${sent} sentences`);
process.exitCode = errs.length ? 1 : 0;

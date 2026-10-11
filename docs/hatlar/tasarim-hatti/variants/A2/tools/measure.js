// Measures the midnight-blue share of every phone screen and the panel screen with shot.js --elements,
// then writes ../coverage.json ({ date, "390": {sel: pct}, "1440": {sel: pct} }) for build.js.
// Run: node tools/measure.js   (then node tools/build.js again so the page shows the numbers)
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..');
const SHOT = path.join(A, '..', '..', 'shot.js');
const SEL = ['#scr-home', '#scr-scan', '#scr-success', '#scr-qr', '#scr-delete', '#scr-records', '#scr-panel'];
const out = path.join(A, 'shots-cov');
const log = execFileSync(process.execPath, [SHOT, path.join(A, 'tasarim.html'), out, '--widths', '390,1440', '--elements', SEL.join('|')], { encoding: 'utf8', windowsHide: true, timeout: 300000 });
process.stdout.write(log);
const rep = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
const res = { date: new Date().toISOString().slice(0, 10), budget: JSON.parse(fs.readFileSync(path.join(A, 'tokens.json'), 'utf8')).coverageBudget };
for (const run of rep.runs) {
  res[String(run.width)] = {};
  for (const e of run.elements) if (e.found) res[String(run.width)][e.sel] = e.coverage;
}
// The panel reflows with a container query (side bar to top bar below 900 px), so its 390 px shot is a real layout and counts.
fs.writeFileSync(path.join(A, 'coverage.json'), JSON.stringify(res, null, 1));
let over = 0;
for (const w of ['390', '1440']) for (const [sel, p] of Object.entries(res[w])) {
  const b = sel === '#scr-panel' ? res.budget.panel : res.budget.phone;
  const ok = p['gece mavisi'] <= b && p['yasak'] === 0;
  if (!ok) over++;
  console.log(`${w} ${sel.padEnd(14)} gece mavisi ${String(p['gece mavisi']).padStart(5)}%  budget ${b}%  yasak ${p['yasak']}%  ${ok ? 'OK' : 'OVER'}`);
}
for (const sel of SEL) if (!res['390'][sel] || !res['1440'][sel]) { over++; console.log('missing measurement ' + sel); }
if (over) { console.log(`FAIL: ${over} screen(s) over budget, with banned colors, or not measured`); process.exit(1); }
console.log('PASS: every screen within its midnight-blue budget at 390 and 1440 px, no banned colors');

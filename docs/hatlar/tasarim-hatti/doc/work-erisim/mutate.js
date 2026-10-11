// Mutation test for check.js: each mutant must make the gate fail; the untouched copy must pass.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const src = path.resolve(__dirname, '../sections/erisilebilirlik.html');
const orig = fs.readFileSync(src, 'utf8');
const tmp = path.join(__dirname, 'mutant.html');
const run = () => spawnSync('node', [path.join(__dirname, 'check.js'), tmp], { encoding: 'utf8' }).status;
const mutants = [
  ['en dash', h => h.replace('Kontrast eşikleri', 'Kontrast – eşikleri')],
  ['em dash', h => h.replace('Odak halkası</h3>', 'Odak — halkası</h3>')],
  ['banned word', h => h.replace('Hedef ve temel', 'Robust hedef ve temel')],
  ['broken plan anchor', h => h.replace('plan.html#hoca', 'plan.html#yok-boyle-bir-yer')],
  ['broken teknik anchor', h => h.replace('teknik.html#telefon-kamera-qr', 'teknik.html#kamera')],
  ['broken in-page anchor', h => h.replace('href="#durumlar"', 'href="#durum"')],
  ['unclosed div', h => h.replace('<div class="er-try">', '<div class="er-try"><div>')],
  ['hex in style', h => h.replace('#erisilebilirlik .er-mt { margin-top: 16px; }', '#erisilebilirlik .er-mt { margin-top: 16px; color: #FFD528; }')],
  ['radius in style', h => h.replace('#erisilebilirlik .er-mt { margin-top: 16px; }', '#erisilebilirlik .er-mt { margin-top: 16px; border-radius: 4px; }')],
  ['selector outside', h => h.replace('#erisilebilirlik .er-mt2 {', '.er-mt2 {')],
  ['bare hover', h => h.replace('#erisilebilirlik .er-mt { margin-top: 16px; }', '#erisilebilirlik .er-mt { margin-top: 16px; }\n#erisilebilirlik a:hover { color: var(--text-primary); }')],
  ['unknown variable', h => h.replace('var(--bg-inverse)', 'var(--bg-inverso)')],
  ['unknown research id', h => h.replace('R11-K16', 'R11-K99')],
  ['foreign url', h => h.replace('https://www.nngroup.com/articles/qr-code-guidelines/', 'https://example.com/qr')],
  ['wrong icon path', h => h.replace('M389-267 195-460', 'M389-268 195-460')],
  ['missing {{no}}', h => h.replace('{{no}}', '07')],
  ['duplicate id', h => h.replace('id="erisim-kod"', 'id="kontrast"')],
];
fs.writeFileSync(tmp, orig);
const base = run();
console.log('untouched copy: ' + (base === 0 ? 'PASS (expected)' : 'FAIL (unexpected)'));
let ok = base === 0;
for (const [name, fn] of mutants) {
  const m = fn(orig);
  if (m === orig) { console.log('mutant not applied: ' + name); ok = false; continue; }
  fs.writeFileSync(tmp, m);
  const st = run();
  console.log((st === 1 ? 'red  ' : 'GREEN') + '  ' + name);
  if (st !== 1) ok = false;
}
fs.unlinkSync(tmp);
console.log(ok ? 'MUTATION PASS: every mutant turned the gate red' : 'MUTATION FAIL');
process.exit(ok ? 0 : 1);

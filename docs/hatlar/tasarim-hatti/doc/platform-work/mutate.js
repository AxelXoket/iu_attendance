// Mutation test for check.js: every mutant copy of the fragment must make the gate fail,
// and the untouched copy must pass (ground control). The real fragment is only read, never written.
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const here = __dirname;
const real = path.join(here, '..', 'sections', 'platform.html');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const orig = fs.readFileSync(real, 'utf8');
const before = md5(orig);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-mut-'));
const run = (name, html) => {
  const f = path.join(dir, name + '.html');
  fs.writeFileSync(f, html);
  const r = spawnSync(process.execPath, [path.join(here, 'check.js'), '--file', f], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout + r.stderr).split('\n').filter(l => /FAIL|^[a-z]/i.test(l)).slice(-3).join(' | ') };
};
const once = (s, a, b) => { if (!s.includes(a)) throw new Error('mutation anchor missing: ' + a); return s.replace(a, b); };
const mutants = [
  ['en dash in text', s => once(s, 'Güncel sürüm iOS 27:', 'Güncel sürüm iOS 27 –')],
  ['em dash in text', s => once(s, 'Kenardan kaydırarak', 'Kenardan — kaydırarak')],
  ['broken plan anchor', s => once(s, 'href="plan.html#hoca"', 'href="plan.html#hocaX"')],
  ['broken teknik anchor', s => once(s, 'href="teknik.html#panel-cati"', 'href="teknik.html#panel-catı"')],
  ['unknown internal anchor', s => once(s, 'href="#katmanlar"', 'href="#katman-yok"')],
  ['unscoped selector', s => once(s, '#platform .pf-intro {', '.pf-intro {')],
  ['raw hex in CSS', s => once(s, 'background: var(--neutral-1); box-shadow: inset 0 0 0 1px var(--neutral-12);', 'background: #FFFFFF; box-shadow: inset 0 0 0 1px var(--neutral-12);')],
  ['radius above 0', s => once(s, '#platform .pf-mk { display: inline-block;', '#platform .pf-mk { border-radius: 6px; display: inline-block;')],
  ['hover outside pointer query', s => once(s, '#platform .pf-after { margin-top: 16px; }', '#platform .pf-after { margin-top: 16px; }\n#platform a:hover { color: var(--text-primary); }')],
  ['table number changed', s => once(s, '<td role="cell" class="pf-v" data-label="Chrome, Edge">117</td>', '<td role="cell" class="pf-v" data-label="Chrome, Edge">116</td>')],
  ['availability flipped', s => once(s, 'pf-av pf-n" data-l1="Firefox" data-l2="114"><span class="pf-mk" aria-hidden="true"></span>yok', 'pf-av pf-y" data-l1="Firefox" data-l2="114"><span class="pf-mk" aria-hidden="true"></span>var')],
  ['unknown research id', s => once(s, '<code>R10-F01</code>', '<code>R10-F99</code>')],
  ['external link not in research', s => once(s, 'https://en.wikipedia.org/wiki/IOS_27', 'https://example.com/ios-27')],
  ['stale motion value', s => once(s, '0,97 ölçek (100 ms)', '0,98 ölçek (70 ms)')],
  ['prose number drifts from data', s => once(s, "Chrome 111'de geldiği", "Chrome 110'de geldiği")],
  ['row without source', s => s.replace(/(<dt>Esnek düzen<\/dt><dd>[\s\S]*?)<div class="pf-s">[\s\S]*?<\/div><\/dd>/, '$1</dd>')],
  ['unbalanced tag', s => once(s, '<dl class="pf-dl">', '<dl class="pf-dl"><div>')],
  ['banned word', s => once(s, 'Bizim hareketimiz ekranın içinde kalır.', 'Bizim hareketimiz robust kalır.')],
  ['fix-agent value quoted', s => once(s, 'Bildirim, çevrimdışı şeridi', 'Görevli #3A3CA2, çevrimdışı şeridi')],
  ['missing heading frame', s => once(s, '<h2>Platformlar</h2>', '<h2>Platform</h2>')],
];
const results = [];
const ctrl = run('control', orig);
results.push({ name: 'ground control (unmodified copy)', expect: 'pass', code: ctrl.code, ok: ctrl.code === 0, out: ctrl.out });
for (const [name, fn] of mutants) {
  const html = fn(orig);
  if (html === orig) { results.push({ name, expect: 'fail', code: null, ok: false, out: 'mutation did not change the file' }); continue; }
  const r = run(name.replace(/\W+/g, '-'), html);
  results.push({ name, expect: 'fail', code: r.code, ok: r.code === 1, out: r.out });
}
const after = md5(fs.readFileSync(real, 'utf8'));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'BAD '} ${r.name.padEnd(34)} exit=${r.code}  ${r.out.slice(0, 140)}`);
console.log(`real fragment md5 before ${before} after ${after} ${before === after ? '(unchanged)' : '(CHANGED!)'}`);
const bad = results.filter(r => !r.ok).length;
console.log(bad ? `MUTATION TEST FAIL: ${bad}` : `MUTATION TEST PASS: ${results.length - 1} mutants killed, control passes`);
process.exit(bad || before !== after ? 1 : 0);

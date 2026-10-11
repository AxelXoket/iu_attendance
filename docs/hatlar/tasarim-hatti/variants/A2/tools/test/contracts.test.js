// Gate tests for the round-2 contracts (decisions-r2): one source per value (token references in prose, the retyped-value
// guard, component sizes on the grid of space.base, the contrast thresholds read from tcheck's own output, every type
// style as a generated CSS variable), every status ink measured on its three grounds and the increased-contrast
// values measured (tcheck.js), the exact spring overshoot (spring.js), and the build's handling of long inline code and
// the word "sahip". Every guard is shown to go red on a planted breach, in a throwaway copy (fixture.js) or a temp file.
// Run: node --test "tools/test/*.test.js" (or npm test in tools/)   Owner: F1a.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { variantCopy } = require('./fixture');

const A = path.join(__dirname, '..', '..');
const ROOT = path.join(A, '..', '..');
const { setNav } = require('../lib/section');
setNav({ platform: '18', etkilesim: '17', kontrast: '08', tokenlar: '20' }, {});
const refs = require('../lib/refs');

test('a token named in prose renders with the value read from the token file; code in braces stays code', () => {
  assert.equal(refs.rich('{dur.kisa}'), '<code>dur.kisa</code> 150 ms');
  assert.equal(refs.rich('{dur.kisa}', 'value'), '150 ms');
  assert.equal(refs.rich('{accent.mark}', 'full'), '<code>accent.mark</code>', 'a color has a name, not a value worth repeating');
  assert.equal(refs.rich('layout={LinearTransition}'), 'layout={LinearTransition}', 'JSX braces are not a reference');
  assert.equal(refs.rich('{gesture.kaydirmaHizi}', 'value'), '800 dp/sn', 'a number keeps its unit');
  assert.throws(() => refs.rich('{dur.yok}'), /unknown token \{dur\.yok\}/, 'an unknown token stops the build');
});

test('the retyped-value guard finds a value typed by hand and passes a named one', () => {
  assert.deepEqual(refs.retyped('giriş {dur.kisa}, çıkış {dur.hizli}'), [], 'control: names only');
  assert.deepEqual(refs.retyped('giriş 150 ms ve 8 px, scale(0,96), 4,5:1'), ['150 ms', '8 px', 'scale(0,96', '4,5:1']);
  assert.deepEqual(refs.retyped('layout={LinearTransition} 240 ms'), ['240 ms'], 'a value next to code is still caught');
});

test('a pattern that retypes a value stops the build (Etkileşim tablosu)', () => {
  const v = variantCopy();
  try {
    const T = JSON.parse(v.read('tokens.json'));
    T.motion.patterns.find(p => p.key === 'menu').enter = 'Tetikleyicinin köşesinden 150 ms içinde açılır';
    v.write('tokens.json', JSON.stringify(T, null, 1));
    const r = v.run('build.js', ['--out', path.join(v.tmp, 'x.html')]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /menu\.enter retypes a value \(150 ms\)/);
  } finally { v.remove(); }
});

test('a component size off the 4 px grid stops the build; lines and marks are the listed exceptions', () => {
  const v = variantCopy();
  try {
    const orig = v.read('tokens.json'), T = JSON.parse(orig);
    T.components.find(c => c.key === 'button').size.gap = 10;
    v.write('tokens.json', JSON.stringify(T, null, 1));
    const r = v.run('build.js', ['--out', path.join(v.tmp, 'x.html')]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /off the 4 px grid: component\.button\.gap = 10/);
    v.write('tokens.json', orig);
    assert.equal(v.run('build.js', ['--out', path.join(v.tmp, 'y.html')]).code, 0, 'control: the real token file builds');
  } finally { v.remove(); }
});

// tcheck.js on a planted token file: exit code and output.
function tcheck(mut) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-'));
  try {
    const T = JSON.parse(fs.readFileSync(path.join(A, 'tokens.json'), 'utf8'));
    mut(T);
    const f = path.join(d, 'tokens.json');
    fs.writeFileSync(f, JSON.stringify(T, null, 1));
    try { return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tcheck.js'), f], { encoding: 'utf8', windowsHide: true }) }; }
    catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

test('tcheck: the real token file passes and measures the increased-contrast pairs', () => {
  const r = tcheck(() => {});
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /PASS: \d+ contrast pairs, (\d+) increased-contrast pairs/);
  assert.ok(+r.out.match(/(\d+) increased-contrast pairs/)[1] >= 20);
});

test('tcheck: a status ink without its pair on a stamp ground fails (E2)', () => {
  const r = tcheck(T => { T.color.pairs = T.color.pairs.filter(p => !(p.fg === 'att.yok.fg' && p.bg === 'bg.hover')); });
  assert.equal(r.code, 1);
  assert.match(r.out, /E2: status ink att\.yok\.fg has no declared pair on bg\.hover/);
});

test('tcheck: an increased-contrast value that lowers a pair or misses 7:1 fails, and one no pair measures fails (E5)', () => {
  const low = tcheck(T => { T.color.contrastMore['text.secondary'] = 'neutral.10'; });
  assert.equal(low.code, 1);
  assert.match(low.out, /contrastMore lowers text\.secondary on bg\.page/);
  assert.match(low.out, /contrastMore text\.secondary \(#6E7589\) on bg\.page \(#F2F4F8\) = [\d.]+ < 7/);
  const loose = tcheck(T => { T.color.contrastMore['icon.strong'] = 'neutral.12'; });
  assert.equal(loose.code, 1);
  assert.match(loose.out, /contrastMore: icon\.strong changes but no declared pair measures it/);
});

test('tcheck: a layer whose exit is not shorter than its entry fails (Hareket, Kurallar)', () => {
  const r = tcheck(T => { T.motion.patterns.find(p => p.key === 'dialog').timing.main.exit = ['dur.orta', 'ease.cikis']; });
  assert.equal(r.code, 1);
  assert.match(r.out, /pattern dialog: exit\/enter 200\/200 outside 0,67 to 0,75/);
});

test('tcheck writes its thresholds; the Kontrast prose and group rows read them from there (one source, E1)', () => {
  const real = JSON.parse(fs.readFileSync(path.join(A, 'tokens.check.json'), 'utf8'));
  assert.deepEqual(real.thresholds.normal, { text: 4.5, 'text-large': 3, ui: 3, decorative: 0 }, 'WCAG 2.2 AA, 1.4.3 and 1.4.11');
  assert.deepEqual(real.thresholds.more, { text: 7, 'text-large': 4.5, ui: 4.5, decorative: 3 });
  const v = variantCopy();
  try {
    const C = JSON.parse(v.read('tokens.check.json'));
    C.thresholds.normal.text = 5; C.thresholds.more.ui = 6;
    v.write('tokens.check.json', JSON.stringify(C));
    const out = path.join(v.tmp, 'k.html');
    const r = v.run('build.js', ['--out', out]);
    assert.equal(r.code, 0, r.out);
    const text = fs.readFileSync(out, 'utf8').replace(/<[^>]+>/g, '');
    assert.match(text, /hepsi eşikte ya da üstünde: yazı en az 5:1, büyük yazı en az 3:1/);
    assert.match(text, /Eşikler artırılmış kontrastta: yazı 7:1, büyük yazı 4,5:1, kontrol kenarı 6:1/);
    delete C.thresholds;
    v.write('tokens.check.json', JSON.stringify(C));
    const r2 = v.run('build.js', ['--out', path.join(v.tmp, 'k2.html')]);
    assert.notEqual(r2.code, 0);
    assert.match(r2.out, /tokens\.check\.json has no thresholds; run tcheck\.js again/);
  } finally { v.remove(); }
});

test('every type style of the panel and the phone is a generated CSS variable with its exact value', () => {
  const { tokenCss } = require('../lib/gencss');
  const T = JSON.parse(fs.readFileSync(path.join(A, 'tokens.json'), 'utf8'));
  const css = tokenCss().split('@media')[0];
  let n = 0;
  for (const where of ['panel', 'phone']) for (const s of T.type[where]) {
    const fam = s.family === 'mono' ? 'mono' : 'sans';
    assert.ok(css.includes('--type-' + where + '-' + s.name + ': ' + s.weight + ' ' + s.size + 'px/' + s.line + 'px var(--font-' + fam + ');'), where + '.' + s.name);
    assert.ok(css.includes('--type-' + where + '-' + s.name + '-ls: ' + s.tracking + 'px;'), where + '.' + s.name + ' letter spacing');
    n++;
  }
  assert.ok(n >= 20, 'control: the styles were found (' + n + ')');
});

test('spring overshoot is the exact value of the damped oscillator, not the early-stopping simulation\'s peak', () => {
  const { springInfo } = require(path.join(ROOT, 'spring.js'));
  const zeta = 47.62 / (2 * Math.sqrt(700));
  assert.equal(springInfo(47.62, 700, 1).overshootPct, +(Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta)) * 100).toFixed(2));
  assert.equal(springInfo(47.62, 700, 1).overshootPct, 0.15);
  assert.equal(springInfo(80, 1000, 1).overshootPct, 0, 'control: an overdamped spring does not overshoot');
});

test('the build marks inline code of 40 characters or more as breakable, leaves short code and <pre> whole, and reports "sahip"', () => {
  const v = variantCopy();
  try {
    const long = 'announceForAccessibilityWithOptions(metin, kuyruk)';
    const dir = v.fragDir({ 'ilkeler.html': '<section id="ilkeler"><h2>İlkeler</h2><p><code>' + long + '</code> ve <code>--mv: 0</code>. Sahibin kararı.</p><pre><code>' + long + '</code></pre></section>' });
    const out = path.join(v.tmp, 'c.html');
    const r = v.run('build.js', ['--frag-dir', dir, '--out', out]);
    assert.equal(r.code, 0, r.out);
    const html = fs.readFileSync(out, 'utf8');
    assert.ok(html.includes('<code class="wrap">' + long + '</code>'), 'long inline code is breakable');
    assert.ok(html.includes('<code>--mv: 0</code>'), 'control: short code stays whole');
    assert.ok(html.includes('<pre><code>' + long + '</code></pre>'), 'code in pre is left alone');
    assert.match(r.out, /warning: "sahip" geçiyor \(decisions-r2 E9\): ilkeler: Sahibin/);
  } finally { v.remove(); }
});

/* ---------- integrator round (decisions-r2 E1, E4; G2 #31): the assembled page with the real fragments ---------- */
// The page built from this copy and the live fragments (read only; the output goes to the copy's temp folder).
function realPage(v, mutate) {
  const frag = path.join(ROOT, 'doc', 'sections');
  let dir = frag;
  if (mutate) { dir = v.fragDir(Object.fromEntries(fs.readdirSync(frag).filter(f => f.endsWith('.html')).map(f => [f, mutate(f, fs.readFileSync(path.join(frag, f), 'utf8'))]))); fs.cpSync(path.join(ROOT, 'doc', 'kutuphaneler.html'), path.join(dir, '..', 'kutuphaneler.html')); }
  const out = path.join(v.tmp, 'real-' + Date.now() + '.html');
  const r = v.run('build.js', ['--frag-dir', dir, '--out', out]);
  assert.equal(r.code, 0, r.out);
  return fs.readFileSync(out, 'utf8');
}
// Every dotted name of a token group the page's text uses (outside the printed token file, scripts and styles).
const GROUPS = 'dur|ease|spring|time|scale|distance|gesture|space|component|type|bg|text|icon|border|accent|neutral|danger|focus|status|att|line|target|radius|shadow|motion|grid|breakpoint|qr|scrim|overlay';
function unknownTokenNames(v, html) {
  const dtcg = require(path.join(v.root, 'tools', 'lib', 'dtcg.js'));
  const tree = dtcg.build(), map = new Map(dtcg.tokens(tree));
  const isGroup = p => { let g = tree; for (const s of p.split('.')) { g = g && g[s]; if (!g) return false; } return typeof g === 'object'; };
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<div class="code-file"[\s\S]*?<\/div><\/details>/, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const names = new Set([...text.matchAll(new RegExp(String.raw`\b(?:${GROUPS})\.[A-Za-z0-9][A-Za-z0-9.<>*-]*`, 'g'))].map(m => m[0].replace(/[.-]+$/, '')));
  return { count: names.size, unknown: [...names].filter(p => !(map.has(p) || isGroup(p) || /[*<]/.test(p))) };
}

test('every token the assembled page names exists in the token file; a stale name is reported (E1)', () => {
  const v = variantCopy();
  try {
    const clean = unknownTokenNames(v, realPage(v));
    assert.ok(clean.count > 200, 'control: the scan reads the page (' + clean.count + ' names)');
    assert.deepEqual(clean.unknown, [], 'every named token resolves');
    // The names the round-2 renames left behind (dur.imza, space.phone.altSekme) must be caught if they come back.
    const planted = unknownTokenNames(v, realPage(v, (f, h) => (f === 'platform.html' ? h.replace('<code>dur.vurgu</code>', '<code>dur.imza</code>').replace('<code>component.tabbar.height</code>', '<code>space.phone.altSekme</code>') : h)));
    assert.deepEqual(planted.unknown.sort(), ['dur.imza', 'space.phone.altSekme']);
  } finally { v.remove(); }
});

test('open points are numbered in order and each list head counts its points (G2 #31: two new product points)', () => {
  const v = variantCopy();
  try {
    const html = realPage(v);
    const acik = html.slice(html.indexOf('<section id="acik"'), html.indexOf('</section>', html.indexOf('<section id="acik"')));
    const nums = [...acik.matchAll(/<p class="acik-no">(\d+)<\/p>/g)].map(m => +m[1]);
    assert.ok(nums.length >= 20, 'control: the points are found (' + nums.length + ')');
    assert.deepEqual(nums, nums.map((_, i) => i + 1), 'numbers run 1, 2, 3, ... across both lists');
    const heads = [...acik.matchAll(/<p class="note">(\d+) nokta<\/p>/g)].map(m => +m[1]);
    const lists = acik.split('<ol class="acik-list">').slice(1).map(l => (l.split('</ol>')[0].match(/class="acik-item"/g) || []).length);
    assert.deepEqual(heads, lists, 'each head states its own count');
    for (const id of ['acik-gece-mavisi', 'acik-giris-dugmesi', 'acik-sorun-nedenleri']) assert.ok(acik.includes('id="' + id + '"'), id);
    assert.equal(nums[0], 1); assert.ok(acik.indexOf('id="acik-gece-mavisi"') < acik.indexOf('id="acik-panel-hareket"'), 'the widening of midnight blue is the first point');
  } finally { v.remove(); }
});

test('Tipografi prints the Bold Text mapping as a table read from type.boldText (E4)', () => {
  const v = variantCopy();
  try {
    const html = realPage(v);
    const T = JSON.parse(v.read('tokens.json'));
    const sec = html.slice(html.indexOf('id="tipografi-kalin"'), html.indexOf('</table>', html.indexOf('id="tipografi-kalin"')));
    const rows = [...sec.matchAll(/<tr><td>(Plex Sans|Plex Mono)<\/td><td class="r mono">(\d+)<\/td><td class="r mono">(\d+)<\/td>/g)].map(m => [m[1] === 'Plex Mono' ? 'mono' : 'sans', m[2], +m[3]]);
    const want = Object.entries(T.type.boldText).flatMap(([f, map]) => Object.entries(map).map(([a, b]) => [f, a, b]));
    assert.ok(want.length >= 5, 'control: the mapping has rows');
    assert.deepEqual(rows, want);
    assert.ok(html.includes('<a href="#tipografi-kalin">Tipografi, Kalın Metin</a>'), 'Erişilebilirlik links to the table');
  } finally { v.remove(); }
});

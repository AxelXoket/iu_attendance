// Gate tests for the token file in W3C DTCG format (tools/lib/dtcg.js): it is well formed, every color's OKLCH rounds to
// its hex, every alias resolves (inside composite values too), it says what the page's CSS variables say (tokens.css,
// its increased-contrast block and the generated block: components, motion patterns and their reduced-motion values),
// every type style carries its Bold Text weight, and the build writes the same text the Tokenlar section prints. The
// comparisons are shown to go red on a planted drift.
// Run: node --test "tools/test/*.test.js" (or npm test in tools/)   Owner: F1a.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const dtcg = require('../lib/dtcg');
const { tokenCss } = require('../lib/gencss');
const motion = require('../lib/motion');
const { T, C } = require('../lib/inputs');
const { variantCopy } = require('./fixture');

const A = path.join(__dirname, '..', '..');
const TYPES = ['color', 'dimension', 'duration', 'cubicBezier', 'number', 'fontFamily', 'typography', 'border', 'shadow', 'strokeStyle', 'transition'];
const file = dtcg.build();
const list = dtcg.tokens(file);
const byPath = new Map(list);
const resolve = (v, seen = new Set()) => {
  if (typeof v !== 'string' || !/^\{.+\}$/.test(v)) return v;
  const p = v.slice(1, -1);
  if (seen.has(p) || !byPath.has(p)) return undefined;
  seen.add(p);
  return resolve(byPath.get(p).$value, seen);
};
// Every alias inside a value (a transition's duration and curve, a border's color) must resolve too.
const aliasesIn = v => (typeof v === 'string' ? (/^\{.+\}$/.test(v) ? [v] : []) : v && typeof v === 'object' ? Object.values(v).flatMap(aliasesIn) : []);
// What a CSS variable of the page should hold for a token, written the way the page writes it.
function cssValue(t) {
  const v = resolve(t.$value);
  if (v === undefined) return undefined;
  if (t.$type === 'color') return v.hex;
  if (t.$type === 'dimension' || t.$type === 'duration') return v.value + v.unit;
  if (t.$type === 'cubicBezier') return 'cubic-bezier(' + v.join(', ') + ')';
  if (t.$type === 'fontFamily') return v.map(x => (/\s/.test(x) && !/^-/.test(x) ? "'" + x + "'" : x)).join(', ');
  if (t.$type === 'number') return String(v);
  if (t.$type === 'border') return v.width.value + v.width.unit;
  return null;
}
const varsOf = css => Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const rootOf = css => css.split('@media')[0];
// Every variable of the given CSS that names a token must hold that token's value. Returns the mismatches.
function compare(css) {
  const vars = varsOf(css), out = [];
  const byCss = new Map(list.map(([p, t]) => [p.replace(/\./g, '-'), t]));
  for (const s of T.motion.spring) byCss.set('spring-' + s.name, { $type: 'cssEasing', $value: file.spring[s.name].$extensions[dtcg.EXT].cssEasing });
  for (const [name, value] of Object.entries(vars)) {
    const t = byCss.get(name);
    if (!t) { out.push('--' + name + ' has no token'); continue; }
    const want = t.$type === 'cssEasing' ? t.$value : cssValue(t);
    if (want === null) continue; // composite tokens (shadow, typography) are compared below
    if (String(want).toUpperCase() !== String(value).toUpperCase()) out.push('--' + name + ': css ' + value + ', token ' + want);
  }
  return out;
}
const gen = tokenCss();
const genRoot = varsOf(rootOf(gen));
const genReduced = varsOf(gen.slice(gen.indexOf('@media (prefers-reduced-motion: reduce)')));

test('the token file is well formed DTCG: every token has a known type and a value, every alias resolves', () => {
  assert.ok(list.length > 400, 'control: the file holds the whole token set (' + list.length + ')');
  for (const [p, t] of list) {
    assert.ok(TYPES.includes(t.$type), p + ': type ' + t.$type);
    assert.notEqual(resolve(t.$value), undefined, p + ': alias ' + JSON.stringify(t.$value) + ' resolves');
    for (const a of aliasesIn(t.$value)) assert.notEqual(resolve(a), undefined, p + ': inner alias ' + a + ' resolves');
  }
  assert.equal(JSON.parse(dtcg.text()).neutral[2].$value.hex, '#F2F4F8', 'the text parses back to the same file');
});

test('every color shows OKLCH and hex, and the OKLCH rounds to that hex (status inks, danger hover and pressed included)', () => {
  const colors = list.filter(([, t]) => t.$type === 'color' && typeof t.$value === 'object');
  assert.ok(colors.length >= 30, 'control: literal colors found');
  for (const [p, t] of colors) {
    const v = t.$value;
    assert.equal(v.colorSpace, 'oklch', p);
    assert.equal(v.components.length, 3, p);
    const back = C.oklchToHex(...v.components).hex;
    const d = C.hexToRgb(back).map((x, i) => Math.abs(x - C.hexToRgb(v.hex)[i]) * 255);
    assert.ok(Math.max(...d) <= 1.01, p + ': oklch(' + v.components.join(' ') + ') is ' + back + ', file says ' + v.hex);
  }
  for (const p of ['danger.fillHover', 'danger.fillPressed', 'att.yok.fg', 'status.warning.solid', 'status.danger.subtle', 'overlay.cameraHover']) {
    const t = byPath.get(p);
    assert.ok(t && typeof t.$value === 'object' && t.$value.hex && t.$value.components, p + ' carries OKLCH and hex');
  }
});

test('a status has no ground except status.danger.subtle, and a stamp has none (decisions-r2 E2)', () => {
  for (const a of T.color.attendance) assert.equal(byPath.has('att.' + a.key + '.bg'), false, 'att.' + a.key + '.bg');
  for (const k of ['success', 'warning', 'info']) assert.equal(byPath.has('status.' + k + '.subtle'), false, 'status.' + k + '.subtle');
  assert.ok(byPath.has('status.danger.subtle'), 'control: the one status ground is there');
  assert.ok(byPath.has('att.var.fg') && byPath.has('att.var.border'), 'control: inks and frames are there');
});

test('the token file says what the page\'s CSS variables say (tokens.css and the generated block)', () => {
  const css = fs.readFileSync(path.join(A, 'tokens.css'), 'utf8');
  assert.ok(Object.keys(varsOf(rootOf(css))).length > 100, 'control: tokens.css read');
  assert.deepEqual(compare(rootOf(css)), []);
  // generated: timing, fonts, scale, distance, gesture-free, focus ring, lines, targets, component sizes
  const named = Object.entries(genRoot).filter(([k]) => /^(time|font|scale|distance|focus-offset|line|target|component)-/.test(k) || /^focus-offset/.test(k));
  assert.ok(named.filter(([k]) => k.startsWith('component-')).length > 100, 'control: component variables generated');
  assert.deepEqual(compare(named.map(([k, v]) => '--' + k + ': ' + v + ';').join('\n')), []);
  // Shadows: every layer of the CSS is a layer of the token, same offsets and alpha, neutral.12.
  for (const n of [2, 3]) {
    const cssLayers = genRoot['shadow-' + n].split(/,(?![^(]*\))/).map(s => s.trim());
    const tok = byPath.get('shadow.' + n).$value;
    assert.equal(cssLayers.length, tok.length, 'shadow.' + n + ' layers');
    tok.forEach((l, i) => {
      assert.equal(+cssLayers[i].match(/rgba\(([^)]*)\)/)[1].split(',').pop(), l.color.alpha, 'shadow.' + n + ' layer ' + i + ' alpha');
      const nums = cssLayers[i].replace(/rgba\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat);
      while (nums.length < 4) nums.push(0);
      assert.deepEqual(nums, [l.offsetX.value, l.offsetY.value, l.blur.value, l.spread.value], 'shadow.' + n + ' layer ' + i + ' geometry');
    });
  }
});

test('positive control: a drifted variable is reported, and only that one', () => {
  const css = rootOf(fs.readFileSync(path.join(A, 'tokens.css'), 'utf8'));
  const drifted = css.replace('--dur-orta: 200ms;', '--dur-orta: 210ms;').replace('--danger-fillHover: #971A1D;', '--danger-fillHover: #971A1E;');
  assert.notEqual(drifted, css, 'control: the planted drift is in the text');
  assert.deepEqual(compare(drifted).sort(), ['--danger-fillHover: css #971A1E, token #971A1D', '--dur-orta: css 210ms, token 200ms']);
  const comp = '--component-button-height-panel: 44px;';
  assert.deepEqual(compare(comp), ['--component-button-height-panel: css 44px, token 40px'], 'a drifted component size is reported');
});

test('increased contrast: tokens.css sets every contrastMore role in one prefers-contrast: more block, with the token file\'s value (E5)', () => {
  const css = fs.readFileSync(path.join(A, 'tokens.css'), 'utf8');
  const i = css.indexOf('@media (prefers-contrast: more)');
  assert.ok(i > 0, 'the block is there');
  const block = varsOf(css.slice(i));
  const want = Object.entries(T.color.contrastMore || {});
  assert.ok(want.length >= 10, 'control: the map has the roles E5 names');
  for (const [role, v] of want) {
    const t = byPath.get(role);
    assert.ok(t && t.$extensions && t.$extensions[dtcg.EXT].contrastMore !== undefined, role + ' carries contrastMore in the token file');
    const ext = t.$extensions[dtcg.EXT].contrastMore;
    const hex = typeof ext === 'string' ? resolve(ext).hex : ext.hex;
    assert.equal(block[role.replace(/\./g, '-')], hex, role + ': the CSS block says the token file\'s value');
  }
  assert.equal(Object.keys(block).length, want.length, 'the block sets nothing else');
});

test('Bold Text: every type style carries the weight the mapping gives it (E4)', () => {
  let n = 0;
  for (const where of ['phone', 'panel']) for (const s of T.type[where]) {
    const t = byPath.get('type.' + where + '.' + s.name);
    const fam = s.family === 'mono' ? 'mono' : 'sans';
    assert.equal(t.$extensions[dtcg.EXT].boldText.fontWeight, T.type.boldText[fam][s.weight], where + '.' + s.name);
    assert.ok(t.$extensions[dtcg.EXT].boldText.fontWeight > s.weight, where + '.' + s.name + ' gets heavier');
    n++;
  }
  assert.ok(n > 20, 'control: every style checked');
});

test('reduced motion: no duration is remapped; each pattern\'s reduced form is in the file and swaps only its own variables (E3)', () => {
  for (const d of T.motion.duration) {
    assert.equal(file.dur[d.name].$extensions, undefined, 'dur.' + d.name + ' carries no reducedMotion of its own');
    assert.equal(genReduced['dur-' + d.name], undefined, 'dur.' + d.name + ' is not swapped under reduced motion');
  }
  let swapped = 0;
  for (const p of T.motion.patterns) {
    const g = file.motion[p.key];
    assert.ok(g && g.$extensions[dtcg.EXT].reducedMotion.description, p.key + ' carries its reduced form');
    for (const s of motion.steps(p)) {
      const b = motion.varBase(p, s.track, s.phase).slice(2);
      assert.equal(genRoot[b + '-dur'], 'var(--' + motion.durOfStep(s.step).replace('.', '-') + ')', p.key + ' ' + s.track + ' ' + s.phase + ' duration');
      const r = motion.reducedSteps(p).find(x => x.track === s.track && x.phase === s.phase);
      if (r) { swapped++; assert.equal(genReduced[b + '-dur'], 'var(--' + motion.durOfStep(r.step).replace('.', '-') + ')', p.key + ' reduced'); }
      else assert.equal(genReduced[b + '-dur'], undefined, p.key + ' ' + s.track + ' ' + s.phase + ' keeps its timing');
    }
  }
  assert.ok(swapped >= 10, 'control: some patterns change under reduced motion (' + swapped + ')');
});

test('the build writes tasarim.tokens.json, and the Tokenlar section prints exactly that text', () => {
  const v = variantCopy();
  try {
    const r = v.run('build.js');
    assert.equal(r.code, 0, r.out);
    const written = v.read('tasarim.tokens.json');
    assert.ok(written.length > 10000, 'control: the file was written');
    const html = v.read('tasarim.html');
    const m = html.match(/<section id="tokenlar" class="sec">[\s\S]*?<pre><code>([\s\S]*?)<\/code><\/pre>/);
    assert.ok(m, 'the Tokenlar section prints a code block');
    const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.equal(unesc(m[1]).replace(/\r\n/g, '\n'), written.replace(/\r\n/g, '\n').replace(/\n$/, '\n'));
  } finally { v.remove(); }
});

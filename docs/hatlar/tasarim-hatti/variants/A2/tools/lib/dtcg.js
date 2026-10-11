// The token file in W3C DTCG format (Design Tokens Format Module 2025.10), tasarim.tokens.json. tools/build.js prints it
// in the Tokenlar section and writes it next to the page. Owner: F1a.
// Paths follow the CSS variable names of tokens.css: a dot for each dash, case kept (bg.page is --bg-page, text.linkHover
// is --text-linkHover). Colors carry OKLCH components and the hex they round to; a role that points at a scale step or at
// another role is an alias ({neutral.2}). Springs are groups of damping, stiffness and mass (Reanimated withSpring) with
// their CSS stand-in (settle time, linear() curve). Component sizes are tokens (component.*, decisions-r2 E1). Every
// interaction pattern is a group of transitions with its reduced-motion form in $extensions (E3); type styles carry their
// Bold Text weight (E4) and roles their increased-contrast value (E5) in $extensions.
// Deterministic: the same source gives the same text. Nothing here is typed twice: every value is read.
const { T, CHK, C } = require('./inputs');

const EXT = 'tr.iu-yoklama';
const px = value => ({ value, unit: 'px' });
const ms = value => ({ value, unit: 'ms' });
const scaleStep = {};
for (const name of ['neutral', 'accent']) for (const s of T.color[name]) scaleStep[name + '.' + s.step] = s;
const isRef = v => typeof v === 'string' && !/^#/.test(v);
const colorValue = (hex, alpha) => {
  const o = C.hexToOklch(hex);
  const v = { colorSpace: 'oklch', components: [o.L, o.C, o.H] };
  if (alpha !== undefined && alpha !== 1) v.alpha = alpha;
  v.hex = hex.toUpperCase();
  return v;
};
// A color token: an alias for references, OKLCH and hex for literals.
const colorToken = v => (isRef(v) ? { $value: '{' + v + '}' } : { $value: colorValue(v) });
// Prose that names tokens in braces ({dur.kisa}) keeps the braces; [[target|text]] links keep only their text.
const plain = s => String(s).replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1');
const typeFamily = s => (s.family === 'mono' ? 'mono' : 'sans');
// Bold Text (iOS Bold Text, Android bold font): the weight a style takes when the setting is on (type.boldText).
const boldOf = s => { const m = T.type.boldText[typeFamily(s)]; const w = m && m[s.weight]; if (!w) throw new Error('dtcg: type.boldText has no ' + typeFamily(s) + ' ' + s.weight); return w; };
// A timing step of a pattern: [duration, curve] or "anlik" (at once).
const transition = (step, delay) => {
  const [d, e] = step === 'anlik' ? ['dur.anlik', 'ease.dogrusal'] : step;
  return { duration: '{' + d + '}', delay: delay ? '{' + delay + '}' : ms(0), timingFunction: '{' + e + '}' };
};

function build() {
  const out = { $description: 'İÜ Yoklama tasarım tokenları (tasarım değişkenleri), W3C DTCG 2025.10 biçiminde. Yol adları CSS değişkenlerinin adıdır: nokta tire olur (bg.page, --bg-page).' };

  /* ---------- color scales: the locked OKLCH values, exactly as locked.json gives them ---------- */
  for (const name of ['neutral', 'accent']) {
    out[name] = { $type: 'color' };
    for (const s of T.color[name]) out[name][s.step] = { $value: { colorSpace: 'oklch', components: [s.L, s.C, s.H], hex: s.hex.toUpperCase() } };
  }
  /* ---------- roles: "bg.page" lands in group bg, token page; "scrim" is a token of its own ---------- */
  const put = (path, token) => {
    const parts = path.split('.');
    let g = out;
    for (const p of parts.slice(0, -1)) { if (!g[p]) g[p] = { $type: 'color' }; g = g[p]; }
    if (g[parts[parts.length - 1]]) throw new Error('dtcg: path used twice: ' + path);
    g[parts[parts.length - 1]] = token;
  };
  const more = T.color.contrastMore || {};
  const moreValue = v => (isRef(v) ? '{' + v + '}' : colorValue(v));
  const withMore = (path, token) => { if (more[path] !== undefined) token.$extensions = { [EXT]: { contrastMore: moreValue(more[path]) } }; return token; };
  for (const [k, v] of Object.entries(T.color.roles)) {
    const t = colorToken(v);
    if (k === 'scrim' && T.color.alpha && T.color.alpha.scrim !== undefined) {
      const hex = resolveHex(v);
      Object.assign(t, { $value: colorValue(hex, T.color.alpha.scrim), $description: 'Örtü: ' + v + ', %' + Math.round(T.color.alpha.scrim * 100) + ' opaklık' });
    }
    if (!k.includes('.')) t.$type = 'color';
    put(k, withMore(k, t));
  }
  /* ---------- overlays: neutral.1 over the camera image, at the opacities of color.alpha (hover, pressed) ---------- */
  out.overlay = { $type: 'color' };
  for (const [k, n] of [['cameraHover', 'cameraHover'], ['cameraPressed', 'cameraPressed']]) if (T.color.alpha[n] !== undefined) out.overlay[k] = { $value: colorValue(resolveHex('neutral.1'), T.color.alpha[n]), $description: 'Kamera üstündeki düğme: neutral.1, %' + Math.round(T.color.alpha[n] * 100) + ' opaklık' };
  /* ---------- status and attendance inks (a status has no ground except status.danger.subtle, E2) ---------- */
  out.status = { $type: 'color' };
  for (const [k, v] of Object.entries(T.color.status)) {
    out.status[k] = {};
    for (const [p, ref] of Object.entries(v)) out.status[k][p] = withMore('status.' + k + '.' + p, colorToken(ref));
  }
  out.att = {};
  for (const a of T.color.attendance) {
    const g = out.att[a.key] = { $description: a.label + ' (rapor harfi ' + a.letter + ', ikon ' + a.icon + ')' };
    for (const p of ['fg', 'bg', 'border']) if (a[p] !== undefined) g[p] = { $type: 'color', ...colorToken(a[p]) };
    g.borderStyle = { $type: 'strokeStyle', $value: a.borderStyle || 'solid' };
  }
  for (const k of Object.keys(more)) if (!findToken(out, k)) throw new Error('dtcg: contrastMore names ' + k + ', which is not a token');

  /* ---------- type ---------- */
  const fam = s => s.split(',').map(x => x.trim().replace(/^'|'$/g, ''));
  out.font = { $type: 'fontFamily', sans: { $value: fam(T.type.fallback) }, mono: { $value: fam(T.type.monoFallback) } };
  out.type = { $type: 'typography' };
  for (const where of ['phone', 'panel']) {
    out.type[where] = {};
    for (const s of T.type[where]) out.type[where][s.name] = {
      $value: { fontFamily: '{font.' + typeFamily(s) + '}', fontSize: px(s.size), fontWeight: s.weight, letterSpacing: px(s.tracking), lineHeight: +(s.line / s.size).toFixed(4) },
      $description: s.size + '/' + s.line + ' · ' + s.use,
      $extensions: { [EXT]: { boldText: { fontWeight: boldOf(s) } } }
    };
  }

  /* ---------- space, grid, targets, radius ---------- */
  out.space = { $type: 'dimension' };
  T.space.scale.forEach((v, i) => { out.space[i] = { $value: px(v) }; });
  for (const where of ['phone', 'panel']) {
    out.space[where] = {};
    for (const [k, v] of Object.entries(T.space[where])) if (typeof v === 'number') out.space[where][k] = { $value: px(v) };
  }
  checkGrid();
  out.grid = {};
  for (const [where, g] of Object.entries(T.space.grid)) {
    out.grid[where] = {};
    for (const [k, v] of Object.entries(g)) out.grid[where][k] = /columns$|Columns$/.test(k) ? { $type: 'number', $value: v } : { $type: 'dimension', $value: px(v) };
  }
  if (Array.isArray(T.space.panel.kirilma)) {
    out.breakpoint = { $type: 'dimension', $description: 'Panelin kırılma noktaları: bu genişlikten başlayarak' };
    for (const b of T.space.panel.kirilma) out.breakpoint[b.ad] = { $value: px(b.en), $description: b.sutun + ' sütun, ' + b.oluk + ' px oluk, ' + b.kenar + ' px kenar; ' + b.gezinme };
  }
  out.target = { $type: 'dimension', phone: { $value: px(T.space.targets.phone) }, panel: { $value: px(T.space.targets.panel) } };
  out.radius = { $type: 'dimension' };
  for (const [k, v] of Object.entries(T.shape.radius)) out.radius[k] = { $value: px(v) };

  /* ---------- lines, focus ring geometry and shadows ---------- */
  out.line = { $type: 'border' };
  for (const [k, l] of Object.entries(T.shape.line)) {
    // shape.border.<k> describes the line in words; its width is this token's alone (decisions-r2 E1), so the text
    // may not carry a number with a unit.
    if (typeof T.shape.border[k] !== 'string') throw new Error('dtcg: line ' + k + ' has no description in shape.border');
    if (/\b\d+(?:[.,]\d+)?\s?(?:px|dp)\b/.test(T.shape.border[k])) throw new Error('dtcg: shape.border.' + k + ' retypes a width; the width is line.' + k);
    if (l.color.includes('<')) out.line[k] = { $type: 'dimension', $value: px(l.width), $description: 'Genişlik; renk durumun mürekkebidir (' + l.color + ')' };
    else out.line[k] = { $value: { color: '{' + l.color + '}', width: px(l.width), style: l.style } };
  }
  out.line.odak.$description = 'Odak halkası; öğeyle arası {focus.offset}, kenara değen öğede {focus.offsetInset}';
  for (const [k, v] of Object.entries(T.shape.focus)) out.focus[k] = { $type: 'dimension', $value: px(v) };
  out.focus.offsetFrom.$description = 'Halkanın belirirken başladığı uzaklık (Etkileşim tablosu, odak)';
  out.shadow = { $type: 'shadow' };
  for (const e of T.shape.elevation) {
    if (e.shadow === 'none') continue;
    const n = parseInt(e.name, 10);
    out.shadow[n] = { $value: parseShadow(e.shadow), $description: e.name + ': ' + e.use, $extensions: { [EXT]: { reactNative: e.rn } } };
  }

  /* ---------- components (E1): sizes, plain numbers, marks and their type styles ---------- */
  out.component = { $description: 'Bileşen ölçüleri; Bileşenler ve Katmanlar bölümlerindeki anatomi tabloları bunlardan üretilir. Telefonda değer dp, panelde px.' };
  for (const c of T.components) {
    const g = out.component[c.key] = { $description: c.name + ': ' + plain(c.decision) };
    const dims = (obj, into) => { for (const [k, v] of Object.entries(obj)) { if (typeof v === 'number') into[k] = { $type: 'dimension', $value: px(v) }; else { into[k] = {}; dims(v, into[k]); } } };
    if (c.size) dims(c.size, g);
    if (c.mark) { g.mark = {}; dims(c.mark, g.mark); }
    for (const [k, v] of Object.entries(c.number || {})) g[k] = { $type: 'number', $value: v };
    if (c.type) {
      g.type = { $type: 'typography' };
      for (const [role, pl] of Object.entries(c.type)) { g.type[role] = {}; for (const [where, name] of Object.entries(pl)) g.type[role][where] = { $value: '{type.' + name + '}' }; }
    }
  }

  /* ---------- motion ---------- */
  out.dur = { $type: 'duration' };
  for (const d of T.motion.duration) out.dur[d.name] = { $value: ms(d.ms) };
  out.ease = { $type: 'cubicBezier' };
  for (const e of T.motion.easing) out.ease[e.name] = { $value: e.bezier, $description: e.note };
  out.spring = {};
  for (const s of T.motion.spring) {
    const info = CHK.springs[s.name];
    if (!info) throw new Error('dtcg: tokens.check.json has no spring ' + s.name + '; run tcheck.js first');
    out.spring[s.name] = {
      $description: 'Reanimated withSpring; sönüm oranı ' + String(info.zeta).replace('.', ',') + ', aşma %' + String(info.overshootPct).replace('.', ','),
      damping: { $type: 'number', $value: s.damping }, stiffness: { $type: 'number', $value: s.stiffness }, mass: { $type: 'number', $value: s.mass },
      dur: { $type: 'duration', $value: ms(info.settleMs), $description: 'Oturma süresi; CSS karşılığı --spring-' + s.name + '-dur' },
      $extensions: { [EXT]: { cssEasing: info.css } }
    };
  }
  out.time = { $type: 'duration' };
  for (const t of T.motion.timing) out.time[t.name] = { $value: ms(t.ms), $description: t.use };
  out.scale = { $type: 'number' };
  for (const s of T.motion.scale) out.scale[s.name] = { $value: s.value, $description: s.use };
  out.distance = { $type: 'dimension' };
  for (const s of T.motion.distance) out.distance[s.name] = { $value: px(s.value), $description: s.use };
  out.gesture = { $type: 'number' };
  for (const s of T.motion.gesture) out.gesture[s.name] = { $value: s.value, $description: s.use + (s.unit ? ' (' + s.unit + ')' : '') };
  // Interaction patterns (E3): one group per pattern, one transition per track and phase ("main" is left out of the
  // path), the reduced-motion form and the phone driver in $extensions.
  out.motion = { $type: 'transition', $description: 'Etkileşim kalıpları; Etkileşim tablosu bunlardan üretilir.' };
  for (const p of T.motion.patterns) {
    const g = out.motion[p.key] = { $description: p.pattern + '; ' + plain(p.properties) };
    for (const [tk, t] of Object.entries(p.timing || {})) {
      const into = tk === 'main' ? g : (g[tk] = {});
      for (const ph of ['enter', 'exit']) if (t[ph] !== undefined) into[ph] = { $value: transition(t[ph], ph === 'enter' ? t.delay : null) };
    }
    const red = {};
    for (const [tk, t] of Object.entries((p.reduced && p.reduced.timing) || {})) for (const ph of ['enter', 'exit']) if (t[ph] !== undefined) red[(tk === 'main' ? '' : tk + '.') + ph] = transition(t[ph]);
    g.$extensions = { [EXT]: { platforms: p.platforms, phone: plain(p.phone), reducedMotion: { description: plain(p.reduced.text), ...red } } };
  }
  return out;
}

function findToken(tree, path) { let g = tree; for (const p of path.split('.')) { if (!g || typeof g !== 'object') return null; g = g[p]; } return g && g.$value !== undefined ? g : null; }
function resolveHex(v) {
  if (/^#/.test(v)) return v.toUpperCase();
  if (scaleStep[v]) return scaleStep[v].hex.toUpperCase();
  if (T.color.roles[v]) return resolveHex(T.color.roles[v]);
  throw new Error('dtcg: cannot resolve ' + v);
}
// "0 0 0 1px rgba(26,32,48,0.10), 0 2px 4px rgba(...)" into DTCG shadow layers; the color must be neutral.12.
function parseShadow(css) {
  const n12 = C.hexToRgb(resolveHex('neutral.12')).map(x => Math.round(x * 255));
  return css.split(/,(?![^(]*\))/).map(layer => {
    const m = layer.trim().match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
    if (!m) throw new Error('dtcg: shadow layer not understood: ' + layer);
    if (+m[5] !== n12[0] || +m[6] !== n12[1] || +m[7] !== n12[2]) throw new Error('dtcg: shadow color is not neutral.12: ' + layer);
    return { color: colorValue(resolveHex('neutral.12'), +m[8]), offsetX: px(+m[1]), offsetY: px(+m[2]), blur: px(+m[3]), spread: px(+(m[4] || 0)) };
  });
}
// The grid has one source, space.grid (Biçim writes its sentences from it); the panel's breakpoints must agree with it.
function checkGrid() {
  const g = T.space.grid;
  for (const where of ['phone', 'panel']) if ('izgara' in T.space[where]) throw new Error('dtcg: space.' + where + '.izgara is a second copy of space.grid.' + where + ' (decisions-r2 E1)');
  const k = T.space.panel.kirilma;
  const orta = k.find(b => b.ad === 'orta');
  if (orta.sutun !== g.panel.columns || k.some(b => b.oluk !== g.panel.gutter)) throw new Error('dtcg: space.panel.kirilma differs from space.grid.panel');
}

// One token per line: a token (an object with $value) is written on a single line, groups are indented. A token too long
// for one line (a shadow of three layers) gets one line per property and one line per layer. Keys that start with "$"
// come first, in the order DTCG documents them; JavaScript would otherwise put the step numbers before them.
const META = ['$type', '$value', '$description', '$extensions'];
const ordered = obj => {
  const keys = Object.keys(obj);
  return [...META.filter(k => keys.includes(k)), ...keys.filter(k => k.startsWith('$') && !META.includes(k)), ...keys.filter(k => !k.startsWith('$'))];
};
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function serialize(obj, ind = '') {
  const inner = ind + '  ';
  const lines = ordered(obj).map(k => {
    const v = obj[k];
    const isToken = isObj(v) && '$value' in v;
    let body;
    if (isObj(v) && !isToken && Object.keys(v).length) body = serialize(v, inner);
    else if (isToken && oneLine(v).length > 160) body = '{\n' + ordered(v).map(p => inner + '  ' + JSON.stringify(p) + ': ' + (Array.isArray(v[p]) && v[p].some(isObj) ? '[\n' + v[p].map(x => inner + '    ' + oneLine(x)).join(',\n') + '\n' + inner + '  ]' : oneLine(v[p]))).join(',\n') + '\n' + inner + '}';
    else body = oneLine(v);
    return inner + JSON.stringify(k) + ': ' + body;
  });
  return '{\n' + lines.join(',\n') + '\n' + ind + '}';
}
function oneLine(v) {
  if (Array.isArray(v)) return '[' + v.map(oneLine).join(', ') + ']';
  if (v && typeof v === 'object') { const ks = ordered(v); return ks.length ? '{ ' + ks.map(k => JSON.stringify(k) + ': ' + oneLine(v[k])).join(', ') + ' }' : '{}'; }
  return JSON.stringify(v);
}

// Walks every token: [path, token with its effective $type]. Group $type is inherited.
function tokens(obj = build(), path = [], type = null, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$') || !v || typeof v !== 'object' || Array.isArray(v)) continue;
    const t = v.$type || type;
    if ('$value' in v) out.push([path.concat(k).join('.'), { ...v, $type: t }]);
    else tokens(v, path.concat(k), t, out);
  }
  return out;
}
// The groups of the file (top-level keys that hold tokens).
const groups = (obj = build()) => Object.keys(obj).filter(k => !k.startsWith('$'));
// A token's value by path, aliases followed: { path, token, value } or null.
function lookup(path, tree = build(), seen = new Set()) {
  const t = findToken(tree, path);
  if (!t) return null;
  if (typeof t.$value === 'string' && /^\{.+\}$/.test(t.$value)) {
    const p = t.$value.slice(1, -1);
    if (seen.has(p)) return null;
    seen.add(p);
    const r = lookup(p, tree, seen);
    return r && { path, token: t, value: r.value };
  }
  return { path, token: t, value: t.$value };
}

const text = () => serialize(build()) + '\n';
module.exports = { build, text, tokens, groups, lookup, serialize, EXT };

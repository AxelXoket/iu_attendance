// Token references in prose (decisions-r2 E1: prose never retypes a value). Text in tokens.json names a token in
// braces, {dur.kisa}, and links as [[target|text]]; rich() renders the name with the value read from the token file
// (tasarim.tokens.json, tools/lib/dtcg.js), so a value is written once. retyped() finds a value typed by hand.
// Owner: F1a.
const dtcg = require('./dtcg');
const { esc, tr, doc } = require('./format');
const { has, anchor } = require('./section');

let MAP = null, TREE = null;
// Units of plain-number tokens that have one (a swipe speed in dp per second).
const UNIT = Object.fromEntries(require('./inputs').T.motion.gesture.filter(g => g.unit).map(g => ['gesture.' + g.name, g.unit]));
const tree = () => TREE || (TREE = dtcg.build());
const map = () => MAP || (MAP = new Map(dtcg.tokens(tree())));
const isGroup = path => { let g = tree(); for (const p of path.split('.')) { g = g && g[p]; if (!g) return false; } return typeof g === 'object'; };
// A token's resolved value and type: aliases are followed.
function valueOf(path) {
  const t = map().get(path);
  if (!t) return null;
  let v = t.$value, n = 0;
  while (typeof v === 'string' && /^\{.+\}$/.test(v) && n++ < 8) { const u = map().get(v.slice(1, -1)); if (!u) return null; v = u.$value; }
  return { type: t.$type, value: v };
}
// A number with a decimal comma and the minus sign U+2212 (the hero's b* is written the same way).
const signed = n => String(n).replace('.', ',').replace(/^-/, '−');
// The value as the page writes it: durations in ms (5 sn from 1000 up), sizes as plain numbers (dp on the phone, px on
// the panel), numbers with a decimal comma, a border by its width. Colors, curves, type styles and transitions have
// names, not values worth repeating.
function display(path) {
  const r = valueOf(path);
  if (!r) return null;
  const v = r.value;
  if (r.type === 'duration') return v.value >= 1000 ? tr(v.value / 1000, v.value % 1000 ? 1 : 0) + ' sn' : v.value + ' ms';
  if (r.type === 'dimension') return signed(v.value);
  if (r.type === 'number') return signed(v) + (UNIT[path] ? ' ' + UNIT[path] : '');
  if (r.type === 'border') return String(v.width.value);
  return null;
}
const known = path => map().has(path) || isGroup(path) || /\*/.test(path) || /^(att|status)\.<\w+>/.test(path);
// mode 'full': name and value; 'value': the value alone (the name where a value means nothing); 'name': the name alone.
function token(path, mode) {
  if (!known(path)) throw new Error('refs: unknown token {' + path + '}');
  const d = mode === 'name' ? null : display(path);
  if (mode === 'value') return d !== null ? d : '<code>' + esc(path) + '</code>';
  return '<code>' + esc(path) + '</code>' + (d !== null ? ' ' + d : '');
}
function link(target, text) {
  const m = /^(plan|teknik)\.html#(.+)$/.exec(target);
  if (m) return doc(m[1] + '.html', m[2], esc(text));
  const [sec, id] = target.split('#');
  return id ? anchor(sec, id, esc(text)) : (has(sec) ? '<a href="#' + sec + '">' + esc(text) + '</a>' : esc(text));
}
// A reference is a brace pair whose first segment is a group of the token file ({dur.kisa}, {accent.mark}); any other
// brace pair is code and stays as written (layout={LinearTransition}).
const PART = /\{([^{}\s]+)\}|\[\[([^|\]]+)\|([^\]]+)\]\]/g;
let GROUPS = null;
const isRef = p => (GROUPS || (GROUPS = new Set(dtcg.groups(tree())))).has(p.split('.')[0]) && /^[a-z]/.test(p);
// Renders prose: literal text escaped, {token} through token(), [[target|text]] as a link.
function rich(text, mode = 'full') {
  let out = '', last = 0, m;
  const s = String(text);
  PART.lastIndex = 0;
  while ((m = PART.exec(s))) {
    if (m[1] && !isRef(m[1])) continue;
    out += esc(s.slice(last, m.index)) + (m[1] ? token(m[1], mode) : link(m[2], m[3]));
    last = PART.lastIndex;
  }
  return out + esc(s.slice(last));
}
// Plain text of the same prose (names kept, braces and link marks dropped), for attributes and the DTCG descriptions.
const flat = text => String(text).replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1').replace(/\{([^{}\s]+)\}/g, (m, p) => (isRef(p) ? p : m));
// Values typed by hand into prose: a number with a unit, a scale factor, a ratio. Returns the matches (empty when clean).
const RETYPED = /\b\d+(?:[.,]\d+)?\s?(?:ms|px|dp|sn)\b|\bscale\(\s*0[.,]\d+|\b\d+(?:[.,]\d+)?:1\b/g;
const retyped = text => String(text).replace(PART, (m, p) => (p && !isRef(p) ? m : ' ')).match(RETYPED) || [];
module.exports = { rich, flat, token, display, valueOf, retyped, link };

// Interaction patterns read from tokens.json motion.patterns (decisions-r2 E3): their timing steps, the reduced-motion
// form, what each duration, curve and spring is used for (generated, never typed), and the CSS variables of every
// pattern (--motion-<kalıp>[-<iz>]-<giriş|çıkış>-dur, -ease, -delay) with their reduced-motion values. The page's
// components read these variables, so the Hareketi azalt column of the interaction table is the only rule.
// Owner: F1a.
const { T } = require('./inputs');

const PH = { enter: 'giriş', exit: 'çıkış' };
const PH_OF = { enter: 'girişi', exit: 'çıkışı' };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Every timing step of a pattern: { track, label (possessive, for usage lists), name (for the table), phase, step,
// delay }. step is [duration, curve] or "anlik".
function steps(p, timing = p.timing) {
  const out = [];
  for (const [track, t] of Object.entries(timing || {})) for (const phase of ['enter', 'exit']) if (t[phase] !== undefined) out.push({ track, label: (p.timing[track] || {}).label || '', name: (p.timing[track] || {}).name || '', phase, step: t[phase], delay: phase === 'enter' ? t.delay : undefined });
  return out;
}
const reducedSteps = p => (p.reduced && p.reduced.timing ? steps(p, p.reduced.timing) : []);
// A short Turkish name for a step: "menü girişi", "sekme göstergesi", "sekme içeriği (giriş)".
function labelOf(p, s) {
  const t = p.timing[s.track] || {};
  const both = t.enter !== undefined && t.exit !== undefined && !same(t.enter, t.exit);
  const head = p.short + (s.label ? ' ' + s.label : '');
  // a movement the phone drives with a spring (the track's spring flag): the duration is the panel's and this page's
  const yay = t.spring ? ' (telefonda yay)' : '';
  if (!both) return head + yay;
  return (s.label ? head + ' (' + PH[s.phase] + ')' : head + ' ' + PH_OF[s.phase]) + yay;
}
const durOfStep = s => (s === 'anlik' ? 'dur.anlik' : s[0]);
const easeOfStep = s => (s === 'anlik' ? 'ease.dogrusal' : s[1]);
// Where each duration, time and curve is used: { normal: Map(path -> [labels]), reduced: Map(path -> [labels]) }.
function usage() {
  const normal = new Map(), reduced = new Map();
  const add = (m, k, l) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(l)) m.get(k).push(l); };
  for (const p of T.motion.patterns) {
    // an instant step (dur.anlik) has no curve worth listing
    const curve = s => durOfStep(s.step) !== 'dur.anlik';
    for (const s of steps(p)) { add(normal, durOfStep(s.step), labelOf(p, s)); if (curve(s)) add(normal, easeOfStep(s.step), labelOf(p, s)); if (s.delay) add(normal, s.delay, labelOf(p, s)); }
    for (const s of reducedSteps(p)) { add(reduced, durOfStep(s.step), labelOf(p, s)); if (curve(s)) add(reduced, easeOfStep(s.step), labelOf(p, s)); }
  }
  return { normal, reduced };
}
// Which patterns drive what with each spring on the phone (the {spring.x} names in the Telefon column).
function springUse() {
  const m = new Map();
  for (const p of T.motion.patterns) for (const r of String(p.phone).matchAll(/\{spring\.(\w+)\}/g)) { if (!m.has(r[1])) m.set(r[1], []); if (!m.get(r[1]).includes(p.short)) m.get(r[1]).push(p.short); }
  return m;
}
// CSS variable names and values.
const varBase = (p, track, phase) => '--motion-' + p.key + (track === 'main' ? '' : '-' + track) + '-' + phase;
const cssDur = s => { const d = durOfStep(s); return 'var(--' + d.replace('.', '-') + ')'; };
const cssEase = s => 'var(--' + easeOfStep(s).replace('.', '-') + ')';
function cssVars() {
  const root = [], reduced = [];
  for (const p of T.motion.patterns) {
    for (const s of steps(p)) {
      const b = varBase(p, s.track, s.phase);
      root.push(b + '-dur: ' + cssDur(s.step) + ';', b + '-ease: ' + cssEase(s.step) + ';');
      if (s.delay) root.push(b + '-delay: var(--' + s.delay.replace('.', '-') + ');');
    }
    for (const s of reducedSteps(p)) {
      const b = varBase(p, s.track, s.phase);
      reduced.push(b + '-dur: ' + cssDur(s.step) + ';', b + '-ease: ' + cssEase(s.step) + ';');
    }
  }
  return { root, reduced };
}
const pattern = key => { const p = T.motion.patterns.find(x => x.key === key); if (!p) throw new Error('motion: no pattern ' + key); return p; };
module.exports = { steps, reducedSteps, labelOf, usage, springUse, cssVars, varBase, pattern, durOfStep, easeOfStep, PH };
// "giriş dur.kisa · çıkış dur.hizli" for a pattern's main track (names only; the values are in the interaction table).
function timingNote(key, track = 'main') {
  const t = pattern(key).timing[track];
  const n = s => (s === 'anlik' ? 'anında' : s[0]);
  if (t.exit === undefined || JSON.stringify(t.enter) === JSON.stringify(t.exit)) return n(t.enter);
  return 'giriş ' + n(t.enter) + ' · çıkış ' + n(t.exit);
}
module.exports.timingNote = timingNote;

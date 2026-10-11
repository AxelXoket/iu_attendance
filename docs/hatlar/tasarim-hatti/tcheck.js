// Token gate and CSS generator for İÜ Yoklama design tokens.
// Usage: node tcheck.js <tokens.json> [--css out.css] [--table out.html]
// Checks: OKLCH and hex agree, scales are monotonic, roles resolve, owner constraint O1 on the page background,
// WCAG contrast for every declared pair, every status ink on surface, hover and selected (E2), the increased-contrast
// values of color.contrastMore on every pair they touch (E5, written as a prefers-contrast: more block into the CSS),
// attendance statuses under color vision deficiency simulation, radius at most 2 px, motion values well formed, every
// required interaction pattern present with structured timing (E3), exits of layers shorter than entries, no dashes.
const fs = require('fs');
const C = require('./color.js');
const { springInfo } = require('./spring.js');
const argv = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(argv[0], 'utf8').replace(/^﻿/, ''));
const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const errs = [], warns = [], info = [];

if (/[\u2013\u2014]/.test(JSON.stringify(T))) errs.push('contains U+2013 or U+2014');

// 1. Scales
const scale = {};
for (const name of ['neutral', 'accent']) {
  const s = T.color && T.color[name];
  if (!Array.isArray(s) || s.length !== 12) { errs.push(`color.${name} must have 12 steps`); continue; }
  s.forEach((st, i) => {
    if (st.step !== i + 1) errs.push(`color.${name}[${i}].step should be ${i + 1}`);
    const calc = C.oklchToHex(st.L, st.C, st.H);
    const d = C.hexToRgb(calc.hex).map((v, k) => Math.abs(v - C.hexToRgb(st.hex)[k]) * 255);
    if (Math.max(...d) > 1.01) errs.push(`color.${name}.${i + 1}: hex ${st.hex} does not match oklch(${st.L} ${st.C} ${st.H}) = ${calc.hex}`);
    if (calc.clipped) warns.push(`color.${name}.${i + 1}: out of sRGB gamut, chroma clipped to ${calc.chromaUsed}`);
    if (i > 0 && !(st.L < s[i - 1].L)) errs.push(`color.${name}: lightness must decrease from step ${i} to ${i + 1}`);
    scale[`${name}.${i + 1}`] = st.hex.toUpperCase();
  });
}
// 2. Roles
const roles = (T.color && T.color.roles) || {};
const resolve = (v, seen = new Set()) => {
  if (typeof v !== 'string') return null;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (scale[v]) return scale[v];
  if (roles[v] && !seen.has(v)) { seen.add(v); return resolve(roles[v], seen); }
  return null;
};
const R = {};
for (const [k, v] of Object.entries(roles)) { const h = resolve(v); if (!h) errs.push(`role ${k} -> ${v} does not resolve`); else R[k] = h; }
for (const req of ['bg.page', 'bg.surface', 'text.primary', 'text.secondary', 'border.subtle', 'border.strong', 'accent.fill', 'text.onAccent', 'focus.ring'])
  if (!R[req]) errs.push(`missing required role ${req}`);
// 3. O1: page background
if (R['bg.page']) {
  const o = C.hexToOklch(R['bg.page']), lab = C.hexToLab(R['bg.page']);
  info.push(`bg.page ${R['bg.page']} oklch(${o.L} ${o.C} ${o.H}) lab b*=${lab.b}`);
  if (o.L < 0.955 || o.L > 0.985) errs.push(`O1: bg.page lightness ${o.L} outside 0.955 to 0.985`);
  if (o.C > 0.012) errs.push(`O1: bg.page chroma ${o.C} above 0.012`);
  if (o.C > 0.003 && (o.H < 200 || o.H > 290)) errs.push(`O1: bg.page hue ${o.H} outside 200 to 290`);
  if (lab.b > 0) errs.push(`O1: bg.page CIELAB b* ${lab.b} above 0 (leans yellow)`);
}
// 4. Status and attendance colors become resolvable names too
const flat = { ...scale, ...R };
for (const [k, v] of Object.entries((T.color && T.color.status) || {})) for (const [p, h] of Object.entries(v)) { const r = resolve(h); if (!r) errs.push(`status.${k}.${p} does not resolve`); else flat[`status.${k}.${p}`] = r; }
const att = (T.color && T.color.attendance) || [];
if (att.length < 5) errs.push('color.attendance needs at least 5 statuses');
for (const a of att) {
  // A status stamp has no ground (decisions-r2 E2): bg is optional and, when present, must still resolve.
  for (const p of ['fg', 'border'].concat(a.bg !== undefined ? ['bg'] : [])) { const r = resolve(a[p]); if (!r) errs.push(`attendance ${a.key}.${p} does not resolve`); else flat[`att.${a.key}.${p}`] = r; }
  if (!a.icon) errs.push(`attendance ${a.key} has no icon`);
  if (!a.label) errs.push(`attendance ${a.key} has no label`);
}
// 5. Contrast pairs
const rows = [];
const pairs = (T.color && T.color.pairs) || [];
if (pairs.length < 12) errs.push('color.pairs should list at least 12 pairs');
const NEED = { text: 4.5, 'text-large': 3, ui: 3, decorative: 0 };
const auto = att.filter(a => a.bg !== undefined).map(a => ({ fg: `att.${a.key}.fg`, bg: `att.${a.key}.bg`, kind: 'text' })).concat(att.map(a => ({ fg: `att.${a.key}.border`, bg: 'bg.page', kind: 'ui', optional: true })));
for (const p of pairs.concat(auto)) {
  const fg = flat[p.fg] || resolve(p.fg), bg = flat[p.bg] || resolve(p.bg);
  if (!fg || !bg) { errs.push(`pair ${p.fg} on ${p.bg} does not resolve`); continue; }
  const ratio = C.wcagRatio(fg, bg), lc = C.apcaLc(fg, bg);
  const need = NEED[p.kind] !== undefined ? NEED[p.kind] : 3;
  const ok = ratio >= need;
  rows.push({ fg: p.fg, bg: p.bg, fgHex: fg, bgHex: bg, kind: p.kind, ratio: +ratio.toFixed(2), need, lc, ok, note: p.note || '' });
  if (!ok && !p.optional) errs.push(`contrast ${p.fg} (${fg}) on ${p.bg} (${bg}) = ${ratio.toFixed(2)} < ${need}`);
  if (!ok && p.optional) warns.push(`attendance border ${p.fg} on page = ${ratio.toFixed(2)} (icon and text still carry meaning)`);
}
// 5b. Every status ink is measured on the three grounds a stamp can sit on (decisions-r2 E2): a missing pair is an error.
const STAMP_GROUNDS = ['bg.surface', 'bg.hover', 'bg.selected'];
const inks = Object.keys((T.color && T.color.status) || {}).map(k => `status.${k}.text`).concat(att.map(a => `att.${a.key}.fg`));
for (const ink of inks) for (const g of STAMP_GROUNDS) if (!pairs.some(p => p.fg === ink && p.bg === g)) errs.push(`E2: status ink ${ink} has no declared pair on ${g}`);
// 5c. Increased contrast (decisions-r2 E5): color.contrastMore gives a role's value under prefers-contrast: more (a scale
// step, a hex, or another role's default value). Every declared pair that touches such a role is measured again with
// those values, against stricter thresholds: text 7:1, large text and controls 4,5:1, dividers 3:1. A value may never
// lower the contrast it had.
const MORE_NEED = { text: 7, 'text-large': 4.5, ui: 4.5, decorative: 3 };
const moreMap = (T.color && T.color.contrastMore) || {};
const moreHex = {};
for (const [k, v] of Object.entries(moreMap)) {
  if (!flat[k]) { errs.push(`contrastMore: ${k} is not a role or status token`); continue; }
  const h = /^#/.test(v) ? v.toUpperCase() : (flat[v] || resolve(v));
  if (!h) { errs.push(`contrastMore: ${k} -> ${v} does not resolve`); continue; }
  moreHex[k] = h;
}
const moreRows = [];
for (const p of pairs) {
  if (!(p.fg in moreHex) && !(p.bg in moreHex)) continue;
  const fg = moreHex[p.fg] || flat[p.fg] || resolve(p.fg), bg = moreHex[p.bg] || flat[p.bg] || resolve(p.bg);
  const base = C.wcagRatio(flat[p.fg] || resolve(p.fg), flat[p.bg] || resolve(p.bg));
  const ratio = C.wcagRatio(fg, bg), need = MORE_NEED[p.kind] !== undefined ? MORE_NEED[p.kind] : 4.5;
  const ok = ratio >= need && ratio + 1e-9 >= base;
  moreRows.push({ fg: p.fg, bg: p.bg, fgHex: fg, bgHex: bg, kind: p.kind, ratio: +ratio.toFixed(2), base: +base.toFixed(2), need, ok, note: p.note || '' });
  if (ratio < need) errs.push(`contrastMore ${p.fg} (${fg}) on ${p.bg} (${bg}) = ${ratio.toFixed(2)} < ${need}`);
  if (ratio + 1e-9 < base) errs.push(`contrastMore lowers ${p.fg} on ${p.bg}: ${base.toFixed(2)} to ${ratio.toFixed(2)}`);
}
for (const k of Object.keys(moreHex)) if (!moreRows.some(r => r.fg === k || r.bg === k)) errs.push(`contrastMore: ${k} changes but no declared pair measures it`);
// 6. Color vision deficiency check on attendance foregrounds and backgrounds
const cvd = [];
for (const part of ['fg', 'bg']) {
  const hs = att.map(a => [a.key, flat[`att.${a.key}.${part}`]]).filter(x => x[1]);
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const n = C.okDist(C.hexToRgb(hs[i][1]).map(C.toLin), C.hexToRgb(hs[j][1]).map(C.toLin));
    const sims = Object.fromEntries(Object.entries(C.CVD).map(([k, M]) => [k, +C.okDist(C.simulate(hs[i][1], M), C.simulate(hs[j][1], M)).toFixed(3)]));
    const min = Math.min(n, ...Object.values(sims));
    cvd.push({ part, a: hs[i][0], b: hs[j][0], normal: +n.toFixed(3), ...sims, min: +min.toFixed(3) });
    if (min < 0.02) warns.push(`attendance ${part} ${hs[i][0]} vs ${hs[j][0]} nearly identical under simulation (min ${min.toFixed(3)}): icon and text must carry it`);
  }
}
// 7. Shape
const radius = (T.shape && T.shape.radius) || {};
if (!Object.keys(radius).length) errs.push('shape.radius missing');
for (const [k, v] of Object.entries(radius)) if (typeof v !== 'number' || v > 2) errs.push(`O4: radius ${k} = ${v} (must be a number at most 2)`);
// 8. Type
const ty = T.type || {};
if (!ty.family || !ty.license) errs.push('type.family and type.license required');
for (const where of ['phone', 'panel']) {
  const s = ty[where];
  if (!Array.isArray(s) || s.length < 5) { errs.push(`type.${where} needs at least 5 styles`); continue; }
  for (const st of s) for (const f of ['name', 'size', 'line', 'weight', 'tracking', 'use']) if (st[f] === undefined || st[f] === '') errs.push(`type.${where}.${st.name || '?'}.${f} missing`);
}
// 9. Motion
const mo = T.motion || {};
const dur = {};
(mo.duration || []).forEach(d => { if (typeof d.ms !== 'number' || d.ms < 0 || d.ms > 1000) errs.push(`duration ${d.name} invalid`); dur[d.name] = d.ms; });
if ((mo.duration || []).length < 4) errs.push('motion.duration needs at least 4 steps');
const ease = {};
(mo.easing || []).forEach(e => { const b = e.bezier; if (!Array.isArray(b) || b.length !== 4 || b.some(x => typeof x !== 'number') || b[0] < 0 || b[0] > 1 || b[2] < 0 || b[2] > 1) errs.push(`easing ${e.name} invalid bezier`); else ease[e.name] = b; });
if ((mo.easing || []).length < 3) errs.push('motion.easing needs at least 3 curves');
const springs = {};
(mo.spring || []).forEach(s => {
  if (!(s.damping > 0 && s.stiffness > 0 && s.mass > 0)) { errs.push(`spring ${s.name} needs damping, stiffness, mass`); return; }
  const r = springInfo(s.damping, s.stiffness, s.mass, 20);
  springs[s.name] = r;
  info.push(`spring ${s.name}: ratio ${r.zeta}, settles ${r.settleMs} ms, overshoot ${r.overshootPct}%`);
  if (r.settleMs > 1200) warns.push(`spring ${s.name} settles in ${r.settleMs} ms (long for UI)`);
});
if ((mo.spring || []).length < 2) errs.push('motion.spring needs at least 2 presets');
const REQUIRED = ['press', 'hover', 'focus', 'toggle', 'menu', 'popover', 'dialog', 'sheet', 'drawer', 'accordion', 'tab', 'toast', 'list', 'page', 'success', 'error', 'loading'];
const pats = mo.patterns || [];
for (const r of REQUIRED) if (!pats.some(p => (p.pattern || '').toLowerCase().includes(r))) errs.push(`motion.patterns missing "${r}"`);
for (const p of pats) for (const f of ['pattern', 'platforms', 'properties', 'enter', 'exit', 'reduced']) if (!p[f]) errs.push(`pattern ${p.pattern || '?'} missing ${f}`);
// Structured timing (decisions-r2 E3): every track names a duration (dur.* or time.*) and a curve (ease.*) that exist;
// the reduced-motion form replaces tracks that exist ("anlik" changes at once); layers leave faster than they enter.
const timeNames = new Set((mo.timing || []).map(t => t.name));
const step = (v, where) => {
  if (v === 'anlik') return 0;
  if (!Array.isArray(v) || v.length !== 2) { errs.push(`${where}: expected [duration, curve] or "anlik"`); return null; }
  const [d, e] = v;
  const ms = /^dur\./.test(d) ? dur[d.slice(4)] : /^time\./.test(d) && timeNames.has(d.slice(5)) ? (mo.timing.find(t => t.name === d.slice(5)) || {}).ms : undefined;
  if (ms === undefined) errs.push(`${where}: unknown duration ${d}`);
  if (!/^ease\./.test(e) || !ease[e.slice(5)]) errs.push(`${where}: unknown curve ${e}`);
  return ms;
};
const LAYERS = ['menu', 'popover', 'dialog', 'drawer', 'toast', 'banner'];
for (const p of pats) {
  if (typeof p.reduced !== 'object' || !p.reduced.text) errs.push(`pattern ${p.pattern}: reduced needs { text, timing? }`);
  for (const [tk, t] of Object.entries(p.timing || {})) for (const ph of ['enter', 'exit']) if (t[ph] !== undefined) step(t[ph], `pattern ${p.key} ${tk}.${ph}`);
  for (const [tk, t] of Object.entries((p.reduced && p.reduced.timing) || {})) {
    if (!(p.timing || {})[tk]) errs.push(`pattern ${p.key}: reduced track ${tk} has no normal timing`);
    for (const ph of ['enter', 'exit']) if (t[ph] !== undefined) step(t[ph], `pattern ${p.key} reduced ${tk}.${ph}`);
  }
  if (LAYERS.includes(p.key)) {
    const t = (p.timing || {}).main || {}, a = t.enter && step(t.enter, p.key), b = t.exit && step(t.exit, p.key);
    if (!(a > 0 && b > 0) || b / a < 0.66 || b / a > 0.76) errs.push(`pattern ${p.key}: exit/enter ${b}/${a} outside 0,67 to 0,75 (Hareket, Kurallar)`);
  }
}
// 10. Owner lock (6 October 2026): palette fixed, no yellow or green anywhere, no alternative undertones.
const LOCK = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'locked.json'), 'utf8'));
for (const name of ['neutral', 'accent']) (LOCK[name] || []).forEach((st, i) => {
  if (scale[`${name}.${i + 1}`] && scale[`${name}.${i + 1}`] !== st.hex.toUpperCase()) errs.push(`LOCK: ${name}.${i + 1} must be ${st.hex} (owner locked the palette), found ${scale[`${name}.${i + 1}`]}`);
});
for (const role of ['bg.page', 'accent.fill', 'focus.ring']) if (R[role] && R[role] !== LOCK.roles[role]) errs.push(`LOCK: role ${role} must be ${LOCK.roles[role]}, found ${R[role]}`);
if (Array.isArray(T.alternatives) && T.alternatives.length) errs.push('LOCK: alternatives are not allowed, the owner locked the palette');
const BANNED = (hex) => { const o = C.hexToOklch(hex); return o.C > 0.02 && o.H > 35 && o.H < 220 ? o : null; };
const seen = new Set();
const scan = (v, where) => {
  if (typeof v === 'string') { for (const m of v.matchAll(/#[0-9a-fA-F]{6}\b/g)) { const h = m[0].toUpperCase(); const key = h + where; if (seen.has(key)) continue; seen.add(key); const o = BANNED(h); if (o) errs.push(`LOCK: ${h} at ${where} is in the banned yellow to green range (oklch ${o.L} ${o.C} ${o.H})`); } }
  else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${where}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, where ? `${where}.${k}` : k);
};
scan(T, '');
for (const [k, h] of Object.entries(flat)) { const o = BANNED(h); if (o) errs.push(`LOCK: ${k} resolves to ${h}, banned yellow to green range (hue ${o.H})`); }
if (!T.sources || Object.keys(T.sources).length < 8) errs.push('sources: map at least 8 decisions to research ids');
// 11. Midnight-blue usage map (owner clarification, 6 October 2026)
if (!Array.isArray(T.accentUsage) || T.accentUsage.length < 5) errs.push('accentUsage: list at least 5 places where midnight blue appears');
for (const u of T.accentUsage || []) { for (const f of ['role', 'where', 'step', 'why']) if (!u[f]) errs.push(`accentUsage ${u.role || '?'} missing ${f}`); if (u.step && !resolve(u.step)) errs.push(`accentUsage ${u.role}: step ${u.step} does not resolve`); }
if (!Array.isArray(T.accentNever) || T.accentNever.length < 4) errs.push('accentNever: list at least 4 places where midnight blue never appears');
const cb = T.coverageBudget || {};
if (typeof cb.phone !== 'number' || typeof cb.panel !== 'number') errs.push('coverageBudget.phone and coverageBudget.panel must be numbers (percent)');
else info.push(`coverage budget: phone ${cb.phone}%, panel ${cb.panel}%` + ((cb.exceptions || []).length ? `, exceptions: ${cb.exceptions.map(e => e.screen + ' ' + e.max + '%').join('; ')}` : ''));

// Output CSS custom properties
const cssOut = opt('--css');
if (cssOut) {
  const L = [':root {'];
  for (const [k, v] of Object.entries(scale)) L.push(`  --${k.replace('.', '-')}: ${v};`);
  for (const [k, v] of Object.entries(R)) L.push(`  --${k.replace(/\./g, '-')}: ${v};`);
  for (const [k, v] of Object.entries(flat)) if (k.startsWith('status.') || k.startsWith('att.')) L.push(`  --${k.replace(/\./g, '-')}: ${v};`);
  for (const [k, v] of Object.entries(radius)) L.push(`  --radius-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(dur)) L.push(`  --dur-${k}: ${v}ms;`);
  for (const [k, b] of Object.entries(ease)) L.push(`  --ease-${k}: cubic-bezier(${b.join(', ')});`);
  for (const [k, s] of Object.entries(springs)) { L.push(`  --spring-${k}: ${s.css};`); L.push(`  --spring-${k}-dur: ${s.settleMs}ms;`); }
  ((T.space && T.space.scale) || []).forEach((v, i) => L.push(`  --space-${i}: ${v}px;`));
  L.push('}');
  // Increased contrast: the same variables with their contrastMore values (decisions-r2 E5).
  if (Object.keys(moreHex).length) { L.push('@media (prefers-contrast: more) {', '  :root {'); for (const [k, v] of Object.entries(moreHex)) L.push(`    --${k.replace(/\./g, '-')}: ${v};`); L.push('  }', '}'); }
  fs.writeFileSync(cssOut, L.join('\n') + '\n');
}
const tableOut = opt('--table');
if (tableOut) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const tr = rows.map(r => `<tr><td><span class="sw" style="background:${r.fgHex}"></span>${esc(r.fg)}</td><td><span class="sw" style="background:${r.bgHex}"></span>${esc(r.bg)}</td><td>${r.kind === 'text' ? 'yazı' : r.kind === 'text-large' ? 'büyük yazı' : r.kind === 'decorative' ? 'süs' : 'arayüz öğesi'}</td><td class="num">${r.ratio.toFixed(2).replace('.', ',')}:1</td><td class="num">${r.need.toString().replace('.', ',')}:1</td><td class="num">${String(r.lc).replace('.', ',')}</td><td>${r.ok ? 'geçer' : 'geçmez'}</td></tr>`).join('\n');
  fs.writeFileSync(tableOut, `<table class="contrast"><thead><tr><th>Ön plan</th><th>Arka plan</th><th>Tür</th><th>WCAG oranı</th><th>Gereken</th><th>APCA Lc</th><th>Sonuç</th></tr></thead><tbody>\n${tr}\n</tbody></table>\n`);
}
fs.writeFileSync(argv[0].replace(/\.json$/, '') + '.check.json', JSON.stringify({ errors: errs, warnings: warns, info, thresholds: { normal: NEED, more: MORE_NEED }, contrast: rows, contrastMore: moreRows, cvd, springs }, null, 2));
info.forEach(x => console.log('info: ' + x));
warns.forEach(x => console.log('warn: ' + x));
if (errs.length) { console.log(`FAIL (${errs.length}):\n` + errs.join('\n')); process.exit(1); }
console.log(`PASS: ${rows.length} contrast pairs, ${moreRows.length} increased-contrast pairs, ${cvd.length} status comparisons, ${Object.keys(radius).length} radii, ${pats.length} motion patterns`);

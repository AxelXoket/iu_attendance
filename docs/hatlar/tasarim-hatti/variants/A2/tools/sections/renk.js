// Section 'Renk' (#renk): the locked neutral and midnight-blue scales with each step's hex and OKLCH, the role tokens as
// role and step, the status and attendance inks. A value is printed once: OKLCH in the scale tables, a role names its
// step (the hex only where a role is a literal), the rest is in the token file (Tokenlar). Owner: F1a.
const { T, C } = require('../lib/inputs');
const { esc, tr, resolve, cssVar, doc, PLAN } = require('../lib/format');
const { section, sub, ref, table } = require('../lib/section');
const { rich } = require('../lib/refs');

const ramp = (name, usedSteps) => '<div class="ramp" role="img" aria-label="' + (name === 'neutral' ? 'Nötr' : 'Gece mavisi') + ' ölçeği, 12 adım">' + T.color[name].map(s => {
  const dark = C.wcagRatio(resolve('text.onInverse'), s.hex) > C.wcagRatio(resolve('text.primary'), s.hex);
  if (Math.max(C.wcagRatio(resolve('text.onInverse'), s.hex), C.wcagRatio(resolve('text.primary'), s.hex)) < 3) throw new Error('ramp label contrast below 3:1 on ' + s.hex);
  const off = usedSteps && !usedSteps.includes(s.step);
  return '<div class="' + (dark ? 'dark' : '') + (off ? ' off' : '') + '" style="background-color:var(--' + name + '-' + s.step + ')"><b>' + s.step + '</b></div>';
}).join('') + '</div>';
// The steps the design does not use (accent.1 to 8) fold into one row; their OKLCH values are in the token file.
function scaleTable(name, usedSteps) {
  const row = s => ['<span class="role-chip"><i style="background:var(--' + name + '-' + s.step + ')"></i>' + name + '.' + s.step + '</span>', s.hex, tr(s.L, 4), tr(s.C, 4), tr(s.H, 1), esc(s.use)];
  const used = T.color[name].filter(s => !usedSteps || usedSteps.includes(s.step)), unused = T.color[name].filter(s => usedSteps && !usedSteps.includes(s.step));
  const rows = used.map(row);
  if (unused.length) {
    const uses = [...new Set(unused.map(s => s.use))];
    if (uses.length !== 1 && !uses.every(u => /^Bu tasarımda kullanılmaz/.test(u))) throw new Error('renk: the unused steps differ in use');
    rows.unshift([name + '.' + unused[0].step + ' ile ' + name + '.' + unused[unused.length - 1].step, unused.map(s => s.hex).join(', '), '', '', '', 'Kullanılmaz: renkli zemin, mavi seçim ve pastel yok. OKLCH değerleri ' + ref('tokenlar', 'Tokenlar') + ' bölümündeki dosyada.']);
  }
  return '<div class="ramp-gap">' + table(['Token', 'Hex', { h: 'L', cls: 'r' }, { h: 'C', cls: 'r' }, { h: 'H', cls: 'r' }, 'Görev'], rows, 'compact ramp-tbl') + '</div>';
}
const ROLE_GROUPS = [['Zemin', k => k.startsWith('bg.')], ['Metin', k => k.startsWith('text.')], ['İkon', k => k.startsWith('icon.')], ['Kenar', k => k.startsWith('border.')], ['Gece mavisi: dolgu ve işaret', k => k.startsWith('accent.')], ['Tehlike', k => k.startsWith('danger.')], ['Odak', k => k.startsWith('focus.')], ['Örtü ve QR', k => k === 'scrim' || k.startsWith('qr.')]];
// A role card: swatch, role, and the step it stands for (the hex only for a literal, which has no step).
function rolesBlock() {
  const all = Object.entries(T.color.roles);
  const placed = new Set();
  const html = '<div class="roles">' + ROLE_GROUPS.map(([g, test]) => {
    const list = all.filter(([k]) => test(k));
    list.forEach(([k]) => placed.add(k));
    return '<div class="role-g"><h4>' + g + '</h4><ul>' + list.map(([k, v]) => '<li class="role-r"><i style="background:' + cssVar(k) + '"></i><code class="n">' + k + '</code><span class="v">' + (/^#/.test(v) ? v.toUpperCase() : v) + '</span></li>').join('') + '</ul></div>';
  }).join('') + '</div>';
  const left = all.filter(([k]) => !placed.has(k)).map(([k]) => k);
  if (left.length) throw new Error('renk: roles without a group: ' + left.join(', '));
  return html;
}
// The ink of a status: its step, or its hex where it is a literal; solid, text and border are one ink in every status.
const inkOf = ref => '<span class="role-chip"><i style="background:' + resolve(ref) + '"></i>' + (/^#/.test(ref) ? ref.toUpperCase() : ref) + '</span>';
function statusTable() {
  const names = { success: 'Başarı (gece mavisi)', warning: 'Uyarı ve dikkat (mor)', danger: 'Tehlike (kırmızı)', info: 'Bilgi (grafit)' };
  const rows = Object.entries(T.color.status).map(([k, v]) => {
    if (resolve(v.solid) !== resolve(v.text) || resolve(v.solid) !== resolve(v.border)) throw new Error('renk: status ' + k + ' has more than one ink');
    if (resolve(v.onSolid) !== resolve('neutral.1')) throw new Error('renk: the note says every onSolid is neutral.1; status.' + k + ' differs');
    return [names[k], '<code>status.' + k + '</code>', inkOf(v.solid)];
  });
  return table(['Durum', 'Token', 'Mürekkep'], rows, 'compact');
}
function attendanceTable() {
  const rows = T.color.attendance.map(a => {
    if (resolve(a.fg) !== resolve(a.border)) throw new Error('renk: attendance ' + a.key + ' frame differs from its ink');
    return [esc(a.label), '<code>att.' + a.key + '</code>', inkOf(a.fg)];
  });
  return table(['Son durum', 'Token', 'Mürekkep'], rows, 'compact');
}

function renk() {
  const rose = C.wcagRatio(resolve(T.color.status.danger.text), resolve(T.color.status.danger.subtle));
  const dashed = T.color.attendance.filter(a => a.borderStyle === 'dashed').map(a => a.label);
  return section('renk', 'Nötr ve gece mavisi ölçekleri kilitlidir (6 Ekim 2026); bu tasarım gece mavisinin yalnız 9 ile 12. adımlarını kullanır. Her adımın hex ve OKLCH değeri ölçek tablolarındadır. Rollerin ve öbür renk tokenlarının (tasarım değişkenleri) tamamı ' + ref('tokenlar', 'Tokenlar') + ' bölümündeki dosyadadır.',
    sub('Nötr ölçek', 'H 270 · kilitli', ramp('neutral') + scaleTable('neutral')) +
    sub('Gece mavisi ölçeği', 'H 262 · kilitli · 9 ile 12. adımlar', ramp('accent', [9, 10, 11, 12]) + scaleTable('accent', [9, 10, 11, 12])) +
    sub('Anlam rolleri', Object.keys(T.color.roles).length + ' rol · rol ve adım', '<p class="body" style="margin-bottom:16px">Bileşenler yalnız rol adını kullanır; koyu tema ya da başka alt ton bir değer değişimidir. Örtü (scrim) neutral.12, %' + Math.round(T.color.alpha.scrim * 100) + ' opaklık; gölge rengi de neutral.12. Saf beyaz ve saf siyah yalnız QR\'da (qr.light, qr.dark); QR\'ın kuralları ' + doc(PLAN, 'asama23', 'plan.html, Aşama 2 ve 3') + ' içindedir.</p>' + rolesBlock()) +
    sub('Durum renkleri', 'zeminsiz durumlar', '<p class="body" style="margin-bottom:16px">' + rich(T.color.statusNote, 'name') + ' Gül zeminde kırmızı mürekkep ' + tr(rose, 2) + ':1.</p>' +
      '<div class="g2 st-g">' + statusTable() + attendanceTable() + '</div>' +
      '<p class="help" style="margin-top:12px">Son durumlarda renkli iki mürekkep var: Var gece mavisi, Yok kırmızı; dört nötr durumun ayrımını ikonun biçimi ve sözcük taşır, ' + esc(dashed.join(', ')) + ' çerçevesi ayrıca kesik çizgilidir. Mor yalnız dikkat ister (İncelemede, Seviye 2); hiçbir son durumu anlatmaz. Kullanımı ve renk körlüğü denetimi ' + ref('durumlar', 'Durumlar') + ' bölümünde.</p>'));
}
renk.title = 'Renk';
module.exports = renk;

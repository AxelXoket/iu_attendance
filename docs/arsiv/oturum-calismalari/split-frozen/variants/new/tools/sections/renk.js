// Section 'Renk' (#renk): the locked neutral and midnight-blue scales, the role tokens and the status colors. Owner: F1a.
const { T, C } = require('../lib/inputs');
const { esc, tr, resolve, cssVar } = require('../lib/format');
const { section, sub } = require('../lib/section');

const ramp = (name, usedSteps) => '<div class="ramp" role="img" aria-label="' + (name === 'neutral' ? 'Nötr' : 'Gece mavisi') + ' ölçeği, 12 adım">' + T.color[name].map(s => {
  const dark = C.wcagRatio(resolve('text.onInverse'), s.hex) > C.wcagRatio(resolve('text.primary'), s.hex);
  if (Math.max(C.wcagRatio(resolve('text.onInverse'), s.hex), C.wcagRatio(resolve('text.primary'), s.hex)) < 3) throw new Error('ramp label contrast below 3:1 on ' + s.hex);
  const off = usedSteps && !usedSteps.includes(s.step);
  return '<div class="' + (dark ? 'dark' : '') + (off ? ' off' : '') + '" style="background-color:var(--' + name + '-' + s.step + ')"><b>' + s.step + '</b></div>';
}).join('') + '</div>';
const scaleTable = (name, usedSteps) => '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc ramp-tbl"><thead><tr><th>Token</th><th>Hex</th><th class="r">L</th><th class="r">C</th><th class="r">H</th><th>Görev</th></tr></thead><tbody>' +
  T.color[name].map(s => {
    const off = usedSteps && !usedSteps.includes(s.step);
    return '<tr><td class="mono"><span class="role-chip"><i style="background:var(--' + name + '-' + s.step + ')"></i>' + name + '.' + s.step + '</span></td><td class="mono">' + s.hex + '</td><td class="r mono">' + tr(s.L, 4) + '</td><td class="r mono">' + tr(s.C, 4) + '</td><td class="r mono">' + tr(s.H, 1) + '</td><td' + (off ? ' class="u-off"' : '') + '>' + esc(s.use) + '</td></tr>';
  }).join('') + '</tbody></table></div>';
const ROLE_GROUPS = [['Zemin', 'bg.'], ['Metin', 'text.'], ['İkon', 'icon.'], ['Kenar', 'border.'], ['Mürekkep ve sinyal', 'accent.'], ['Tehlike', 'danger.'], ['Odak ve bağlantı', 'focus.'], ['QR ve örtü', 'qr.']];
function rolesTable() {
  const all = Object.entries(T.color.roles);
  return '<div class="roles">' + ROLE_GROUPS.map(([g, pre]) => {
    const list = all.filter(([k]) => k.startsWith(pre) || (pre === 'focus.' && k === 'link') || (pre === 'qr.' && k === 'scrim'));
    return '<div class="role-g"><h4>' + g + '</h4>' + list.map(([k, v]) => '<div class="role-r"><i style="background:' + cssVar(k) + '"></i><p class="n">' + k + '</p><p class="v">' + (/^#/.test(v) ? v : v + ' · ' + resolve(v)) + '</p></div>').join('') + '</div>';
  }).join('') + '</div>';
}
function statusTable() {
  const f = ['solid', 'onSolid', 'text', 'subtle', 'border'];
  const names = { success: 'Başarı (gece mavisi)', warning: 'Uyarı (mor)', danger: 'Tehlike (kırmızı)', info: 'Bilgi (grafit)' };
  return '<div class="scroll-x"><table class="tbl-doc"><thead><tr><th>Durum</th>' + f.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' +
    Object.entries(T.color.status).map(([k, v]) => '<tr><td>' + names[k] + '</td>' + f.map(x => '<td><span class="role-chip"><i style="background:var(--status-' + k + '-' + x + ')"></i>' + resolve(v[x]) + '</span></td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

function renk() {
  return section('renk', 'Nötr ve gece mavisi ölçekleri sahibin kilidiyle sabittir. Bu tasarım gece mavisinin yalnız 9 ile 12. adımlarını kullanır; 1 ile 8 arası taralı gösterildi.',
    sub('Nötr ölçek', 'H 270 · kilitli', ramp('neutral') + scaleTable('neutral')) +
    sub('Gece mavisi ölçeği', 'H 262 · kilitli · 9 ile 12. adımlar', ramp('accent', [9, 10, 11, 12]) + scaleTable('accent', [9, 10, 11, 12])) +
    sub('Anlam rolleri', Object.keys(T.color.roles).length + ' rol', '<p class="body" style="margin-bottom:12px">Bileşenler yalnız rol adını kullanır; koyu tema ya da başka alt ton bir değer değişimidir. Örtü (scrim) neutral.12 yüzde 48 opaklıkla, gölge rengi de neutral.12.</p><p class="body" style="margin-bottom:24px">Saf beyaz #FFFFFF ve saf siyah #000000 yalnız QR\'da kullanılır (modüller #000000, zemin #FFFFFF, her yanda dört modül boşluk): tasarımdaki tek işlevsel istisna. Dolu düğme, şerit ve uyarının üstündeki yazı neutral.1 (#FEFEFF).</p>' + rolesTable()) +
    sub('Durum renkleri', 'zeminsiz durumlar', '<p class="body" style="margin-bottom:16px">' + esc(T.color.statusNote) + '</p>' + statusTable()));
}
renk.title = 'Renk';
module.exports = renk;

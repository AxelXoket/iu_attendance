// Component anatomy, generated from the component tokens (tokens.json components, component.* in the token file;
// decisions-r2 E1): one closed <details> per component under its live demo (E10), its summary the decision in one line,
// inside a table of every size with its token path and value, the type styles, notes, and the colors of each state.
// Values are read, never typed; tools/interact.js measures the live demos against the same tokens. Owner: F1a.
const { T } = require('./inputs');
const { esc } = require('./format');
const { table, ref } = require('./section');
const { rich } = require('./refs');

const PROP = {
  height: 'Yükseklik', minHeight: 'En az yükseklik', padX: 'Yatay iç boşluk', padY: 'Dikey iç boşluk', padLeft: 'Soldaki iç boşluk', padRight: 'Sağdaki iç boşluk', padBottom: 'Alttaki iç boşluk', pad: 'İç boşluk',
  gap: 'Aralık', icon: 'İkon', minWidth: 'En az genişlik', width: 'Genişlik', maxWidth: 'En çok genişlik', border: 'Kenar', box: 'Kutu', square: 'Kare', knob: 'Topuz', inset: 'İçeriden uzaklık', travel: 'Topuzun yolu',
  rowPhone: 'Satır (telefon)', hit: 'Tıklama alanı', indicator: 'Gösterge', markWidth: 'Göstergenin genişliği', mark: 'İşaret', offset: 'Tetikleyiciye uzaklık', itemHeight: 'Öğe yüksekliği', itemPadX: 'Öğenin yatay iç boşluğu',
  separator: 'Ayırıcı', separatorGap: 'Ayırıcının boşluğu', edge: 'Kenara uzaklık', edgeNarrow: 'Dar ekranda kenara uzaklık', titleGap: 'Başlık ile metin arası', buttonGap: 'Düğmeler arası', button: 'Düğme yüksekliği', close: 'Kapat düğmesi',
  closeInset: 'Kapat düğmesinin içeriden uzaklığı', closeIcon: 'Kapat ikonu', check: 'Onay işareti', optionHeight: 'Seçenek satırı', grabWidth: 'Tutamağın genişliği', grabHeight: 'Tutamağın yüksekliği', aboveTabbar: 'Alt sekme çubuğuna uzaklık',
  stack: 'Bildirimler arası', cellHeight: 'Kutunun yüksekliği', cellWidth: 'Kutunun genişliği', narrowBelow: 'Dar düzenin sınırı', ringOffset: 'Halkanın uzaklığı', node: 'Düğüm', line: 'Çizgi', column: 'Sütun', stepGap: 'Adımlar arası',
  header: 'Başlık satırı', iconInset: 'İkonun içeriden uzaklığı', viewBox: 'Çizim alanı (viewBox)', strokeSquare: 'Karenin çizgisi', strokeCheck: 'Onayın çizgisi', skeletonTitle: 'İskelet başlık satırı', skeletonLine: 'İskelet metin satırı',
  skeletonGap: 'İskelet satır aralığı', restOpacity: 'Sönük karenin opaklığı', max: 'En çok', segment: 'Bölme', count: 'Bölme sayısı', size: 'Boyut', arm: 'Köşe kolu', qrInset: "QR'a uzaklık", color: 'Renk', panel: 'Panel', phone: 'Telefon', stroke: 'Çizgi'
};
const VARIANT = { panel: 'panel', phone: 'telefon', small: 'küçük', base: 'temel', narrow: 'dar', twoLine: 'iki satır', oneLine: 'tek satır', interactive: 'etkileşimli', default: 'varsayılan', dense: 'sık', table: 'tablo',
  width: 'genişlik', height: 'yükseklik', stroke: 'çizgi', panelWidth: 'panelde genişlik', panelHeight: 'panelde yükseklik', phoneWidth: 'telefonda genişlik', phoneHeight: 'telefonda yükseklik', barPanel: 'panelde kısmi çizgi', barPhone: 'telefonda kısmi çizgi' };
const ROLE = { label: 'Etiket', field: 'Alan', title: 'Başlık', subtitle: 'Alt satır', text: 'Metin', help: 'Yardım', digit: 'Rakam', item: 'Öğe', option: 'Seçenek', cell: 'Hücre', header: 'Başlık satırı', number: 'Numara', detail: 'Ayrıntı' };
const STATE = [['rest', 'Varsayılan'], ['hover', 'Hover'], ['pressed', 'Basılı'], ['focus', 'Odak'], ['selected', 'Seçili'], ['disabled', 'Devre dışı'], ['other', 'Öbür']];
// A number as the page writes it: decimal comma, the minus sign U+2212 for a negative value (as the hero writes b*).
const num = v => String(v).replace('.', ',').replace(/^-/, '−');
const label = k => { if (!PROP[k]) throw new Error('anatomy: no label for ' + k); return PROP[k]; };
const variant = k => { if (!VARIANT[k]) throw new Error('anatomy: no variant name for ' + k); return VARIANT[k]; };
const comp = key => { const c = T.components.find(x => x.key === key); if (!c) throw new Error('anatomy: no component ' + key); return c; };

// Rows of one component: [property, token path, value, note]. A group of variants (height.panel, height.phone) is one
// row; a nested group (toast.panel, toast.phone) gets one row per size, its label prefixed with the group name.
function rows(c) {
  const out = [], used = new Set();
  const path = (...p) => '<code>component.' + [c.key, ...p].join('.') + '</code>';
  const note = k => { if (!c.notes || !c.notes[k]) return ''; used.add(k); return rich(c.notes[k], 'name'); };
  const isVariants = v => Object.entries(v).every(([k, x]) => VARIANT[k] && typeof x === 'number');
  const add = (k, v, prefix) => {
    const name = prefix.length ? label(prefix[0]) + ': ' + label(k).toLocaleLowerCase('tr-TR') : label(k);
    if (typeof v === 'number') out.push([name, path(...prefix, k), num(v), note(k)]);
    else if (isVariants(v)) out.push([name, path(...prefix, k) + '.*', Object.entries(v).map(([w, x]) => variant(w) + ' ' + num(x)).join(' · '), note(k)]);
    else { const n = note(k); if (n) out.push([name, '', '', n]); for (const [kk, vv] of Object.entries(v)) add(kk, vv, prefix.concat(k)); }
  };
  for (const [k, v] of Object.entries(c.size || {})) add(k, v, []);
  if (c.mark) out.push([label('mark'), path('mark') + '.*', Object.entries(c.mark).map(([k, v]) => variant(k) + ' ' + num(v)).join(' · '), note('mark')]);
  for (const [k, v] of Object.entries(c.number || {})) out.push([label(k), path(k), num(v), note(k)]);
  for (const [role, pl] of Object.entries(c.type || {})) out.push(['Yazı: ' + (ROLE[role] || role).toLocaleLowerCase('tr-TR'), path('type', role) + '.*', Object.entries(pl).map(([w, n]) => variant(w) + ' <code>type.' + esc(n) + '</code>').join(' · '), '']);
  // a note about the component as a whole (the color of the loading mark) gets its own row
  for (const [k, v] of Object.entries(c.notes || {})) if (!used.has(k)) out.push([label(k), '', '', rich(v, 'name')]);
  return out;
}
// One component as a closed <details>: summary is the decision, the body the size table and the state table.
function block(key, { open = false } = {}) {
  const c = comp(key);
  const size = table(['Özellik', 'Token', 'Değer', 'Not'], rows(c).map(r => [r[0], r[1], r[2], r[3]]), 'compact anat-t');
  const st = STATE.filter(([k]) => c.states && c.states[k]).map(([k, n]) => [n, rich(c.states[k], 'name')]);
  return '<details class="anat-d" id="anat-' + c.key + '"' + (open ? ' open' : '') + '><summary><span class="anat-n">' + esc(c.name) + '</span><span class="anat-s">' + rich(c.decision, 'value') + '</span></summary>' +
    '<div>' + size + (st.length ? '<p class="anat-h">Durumların renkleri</p>' + table(['Durum', 'Renkler'], st, 'compact anat-st') : '') + '</div></details>';
}
// Several components under one demo.
const blocks = (...keys) => '<div class="anat-list">' + keys.map(k => block(k)).join('') + '</div>';
// The rule the anatomy obeys: every size and spacing is a multiple of space.base; lines (1 and 2), the focus gap, the
// marks drawn inside controls and the loading mark's 2 px gap are the exceptions. Throws on a breach.
function gridCheck() {
  const bad = [], base = T.space.base;
  for (const c of T.components) {
    const walk = (obj, p) => { for (const [k, v] of Object.entries(obj)) { if (typeof v === 'number') { if (Math.abs(v) > 2 && v % base !== 0) bad.push('component.' + p.concat(k).join('.') + ' = ' + v); } else walk(v, p.concat(k)); } };
    walk(c.size || {}, [c.key]);
  }
  if (bad.length) throw new Error('anatomy: off the ' + base + ' px grid: ' + bad.join(', '));
}
gridCheck();
module.exports = { block, blocks, rows, comp };

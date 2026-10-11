// Section 'Kontrast' (#kontrast): every foreground and background pair the tokens declare, with the WCAG ratio the token
// check computed (tokens.check.json), one row per hex pair with every role name that pair stands for; then the
// increased-contrast values (color.contrastMore, decisions-r2 E5) and the pairs measured with them. Drawn from those
// numbers, never typed. Owner: F1a.
const { T, CHK } = require('../lib/inputs');
const { esc, tr, resolve, doc, PLAN } = require('../lib/format');
const { section, sub, ref } = require('../lib/section');

const KIND = { text: 'yazı', 'text-large': 'büyük yazı', ui: 'arayüz', decorative: 'süs çizgisi' };
const ORDER = ['text', 'text-large', 'ui', 'decorative'];
const sw = hex => '<i class="sw-i" style="background:' + hex + '"></i>';
// Rows that share fg hex, bg hex and kind are one row; the strictest threshold of the group applies.
function group(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.fgHex + r.bgHex + r.kind;
    if (!m.has(k)) m.set(k, { ...r, fgs: [], bgs: [] });
    const g = m.get(k);
    if (!g.fgs.includes(r.fg)) g.fgs.push(r.fg);
    if (!g.bgs.includes(r.bg)) g.bgs.push(r.bg);
    g.need = Math.max(g.need, r.need); g.ok = g.ok && r.ok;
  }
  return [...m.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.ratio - b.ratio);
}
const names = (list, hex) => '<span class="kc">' + sw(hex) + '<span class="kn">' + list.map(n => '<code>' + esc(n) + '</code>').join(' ') + '</span></span>';
// A table of pairs, the kind as a group row that states its threshold once; a pair is one line on a wide screen and a
// two-line card on a phone (fg and ratio, then bg).
// The thresholds are tcheck.js's own (tokens.check.json, thresholds): the table, its group rows and the prose read them.
if (!CHK.thresholds) throw new Error('kontrast: tokens.check.json has no thresholds; run tcheck.js again');
const NEED = (kind, more) => CHK.thresholds[more ? 'more' : 'normal'][kind];
const ratioOf = (kind, more) => { const n = NEED(kind, more); return tr(n, n % 1 ? 1 : 0) + ':1'; };
function tableOf(rows, more) {
  const th = ['Ön plan', 'Arka plan', more ? 'Oran (önce, artırılmış)' : 'Oran'];
  let kind = null, body = '';
  for (const r of rows) {
    if (r.kind !== kind) { kind = r.kind; const n = NEED(kind, more); body += '<tr class="k-g"><th colspan="3" scope="colgroup">' + KIND[kind] + (n ? ', en az ' + tr(n, n % 1 ? 1 : 0) + ':1' : ', eşiksiz') + '</th></tr>'; }
    body += '<tr><td data-th="' + th[0] + '">' + names(r.fgs, r.fgHex) + '</td><td data-th="' + th[1] + '">' + names(r.bgs, r.bgHex) + '</td>' +
      '<td data-th="' + th[2] + '" class="r">' + (more ? tr(r.base, 2) + ' → ' : '') + '<b>' + tr(r.ratio, 2) + ':1</b></td></tr>';
  }
  return '<div class="scroll-x"><table class="tbl-doc k-tbl"><thead><tr>' + th.map((h, i) => '<th' + (i === 2 ? ' class="r"' : '') + '>' + h + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}
// The pairs closest to their threshold, per kind (decorative lines have none): what a reader checks first.
const tightest = (rows, more, n) => ['text', 'text-large', 'ui'].flatMap(k => rows.filter(r => r.kind === k).sort((x, y) => x.ratio / NEED(k, more) - y.ratio / NEED(k, more)).slice(0, n));
// The full list, closed: its summary is the result.
const allPairs = (rows, more, summary) => '<details class="k-all"><summary>' + summary + '</summary>' + halves(rows, more) + '</details>';
// Two tables side by side on a wide screen (one under the other on a narrow one), each a real table.
const halves = (rows, more) => { const h = Math.ceil(rows.length / 2); return '<div class="k-two">' + tableOf(rows.slice(0, h), more) + tableOf(rows.slice(h), more) + '</div>'; };
function kontrast() {
  if (CHK.errors && CHK.errors.length) throw new Error('kontrast: the token check failed: ' + CHK.errors[0]);
  const rows = group(CHK.contrast);
  const failing = rows.filter(r => !r.ok && r.kind !== 'decorative');
  if (failing.length) throw new Error('kontrast: ' + failing.length + ' pair(s) below their threshold');
  const moreRows = group(CHK.contrastMore || []);
  const map = Object.entries(T.color.contrastMore || {}).map(([k, v]) => [
    '<code>' + esc(k) + '</code>',
    sw(resolve(k) || resolveStatus(k)) + esc(roleStep(k)),
    sw(/^#/.test(v) ? v : resolve(v) || resolveStatus(v)) + esc(/^#/.test(v) ? v : roleStep(v, true))
  ]);
  return section('kontrast', 'Tokenların tanımladığı her ön plan ve arka plan çifti token dosyasından betikle ölçüldü; tablo o ölçümün çıktısıdır. Hedef WCAG 2.2 AA kararı ' + doc(PLAN, 'hoca', 'plan.html, Hoca ve yönetici, Erişilebilirlik') + ' içindedir; renklerin değerleri ' + ref('renk', 'Renk') + ' bölümünde.',
    sub('Ölçülen çiftler', rows.length + ' çift · ' + CHK.contrast.length + ' rol çifti',
      '<p class="body" style="margin-bottom:16px">' + rows.length + ' çiftin hepsi eşikte ya da üstünde: yazı en az ' + ratioOf('text') + ', büyük yazı en az ' + ratioOf('text-large') + ', arayüz öğesi ve odak en az ' + ratioOf('ui') + ' (WCAG 2.2, 1.4.3 ve 1.4.11); süs çizgileri ' + (NEED('decorative') ? 'en az ' + ratioOf('decorative') : 'eşiksizdir') + '. Devre dışı yazı da yazıdır (plan.html yazıda aynı eşiği ister). Oran yuvarlanmadan karşılaştırılır. Aynı renk çifti tek satırdır; satır o çiftin bütün rol adlarını taşır. Durum mürekkepleri yüzeyde, hover ve seçili satırda ölçülür.</p>' + '<p class="k-cap">Eşiğe en yakın çiftler</p>' + tableOf(tightest(rows, false, 4), false) + allPairs(rows, false, 'Bütün çiftler: ' + rows.length + ' renk çifti, ' + CHK.contrast.length + ' rol çifti; en dar yazı çifti ' + tr(tightest(rows, false, 1)[0].ratio, 2) + ':1')) +
    sub('Artırılmış kontrast', moreRows.length + ' çift · prefers-contrast: more',
      '<p class="body" style="margin-bottom:16px">' + esc(T.color.contrastMoreNote) + ' Panelde tokens.css içindeki <code>@media (prefers-contrast: more)</code> bloğu, telefonda tema kancası bu eşlemeyi kullanır.</p>' +
      '<div class="k-map">' + '<div class="scroll-x"><table class="tbl-doc stack k-tbl"><thead><tr><th>Rol</th><th>Varsayılan</th><th>Artırılmış</th></tr></thead><tbody>' + map.map(r => '<tr><td data-th="Rol">' + r[0] + '</td><td data-th="Varsayılan">' + r[1] + '</td><td data-th="Artırılmış">' + r[2] + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="help">Eşikler artırılmış kontrastta: yazı ' + ratioOf('text', true) + ', büyük yazı ' + ratioOf('text-large', true) + ', kontrol kenarı ' + ratioOf('ui', true) + ', ayırıcı çizgi ' + ratioOf('decorative', true) + '. Bir değer çiftin kontrastını hiç düşürmez; betik ikisini de denetler.</p></div>' +
      allPairs(moreRows, true, 'Artırılmış değerlerle ölçülen ' + moreRows.length + ' çift; hepsi kendi eşiğinde ya da üstünde, hiçbiri eski oranının altında değil'), 'kontrast-artirilmis'));
}
// "neutral.11" for a role on a step, the hex for a literal; a role named as a value means its default value.
function roleStep(k, asValue) {
  const r = T.color.roles[k];
  if (r !== undefined) return asValue ? k + ' (' + r + ')' : r;
  const s = k.split('.');
  if (s[0] === 'status') return T.color.status[s[1]][s[2]];
  return k;
}
const resolveStatus = k => { const s = k.split('.'); return s[0] === 'status' ? resolve(T.color.status[s[1]][s[2]]) : null; };
kontrast.title = 'Kontrast';
module.exports = kontrast;

// Section 'Biçim ve boşluk' (#bicim): the 0 px corner, lines, elevation, spacing and the panel breakpoints. The section's
// prose lives here; every width, gap, radius, color and breakpoint is read from tokens.json (decisions-r2 E1), and the
// sentences in tokens.json name tokens in braces (tools/lib/refs.js). Owner: F1b.
const { T, C, componentSize } = require('../lib/inputs');
const { esc, tr, resolve } = require('../lib/format');
const { section, sub, ref } = require('../lib/section');
const { rich } = require('../lib/refs');

const LINE = T.shape.line, FOCUS = T.shape.focus;
const RMAX = Math.max(...Object.values(T.shape.radius));

// Panel breakpoints (space.panel.kirilma): the narrow layout below "orta", the side bar from "genis". The panel CSS
// (src/css/screens.css, the container queries of .panel-frame) uses the same two widths.
function panelBreak() {
  const k = T.space.panel.kirilma;
  const by = ad => { const b = k.find(x => x.ad === ad); if (!b) throw new Error('bicim: space.panel.kirilma has no ' + ad); return b; };
  return { narrow: by('orta').en, side: by('genis').en, bar: T.space.panel.kenarCubugu, margin: T.space.panel.sayfaKenari, marginNarrow: T.space.panel.sayfaKenariDar, list: k };
}

// The corner drawn 24 times larger: focus ring, gap, border, inner surface, each as thick as its token. No text inside the
// drawing, so it stays readable at any width; the legend beside it is HTML.
function cornerMacro() {
  const u = 24, W = 30 * u, H = 10 * u, rw = LINE.odak.width, gp = FOCUS.offset, bw = LINE.kontrol.width;
  let grid = '';
  for (let x = u; x < W; x += u) grid += 'M' + x + ' 0V' + H;
  for (let y = u; y < H; y += u) grid += 'M0 ' + y + 'H' + W;
  const b0 = (rw + gp) * u, b1 = b0 + bw * u;
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Kontrol köşesi 24 kat büyütülmüş: ' + rw + ' px odak halkası, ' + gp + ' px boşluk, ' + bw + ' px kenar, köşe yarıçapı ' + RMAX + '">' +
    '<rect class="page" x="0" y="0" width="' + W + '" height="' + H + '"></rect>' +
    '<path class="ring" d="M0 0H' + W + 'V' + rw * u + 'H' + rw * u + 'V' + H + 'H0Z"></path>' +
    '<path class="bd" d="M' + b0 + ' ' + b0 + 'H' + W + 'V' + b1 + 'H' + b1 + 'V' + H + 'H' + b0 + 'Z"></path>' +
    '<rect class="in" x="' + b1 + '" y="' + b1 + '" width="' + (W - b1) + '" height="' + (H - b1) + '"></rect>' +
    '<path class="px" d="' + grid + '"></path></svg>';
}
const cornerLegend = () => '<ul class="macro-leg">' + [
  ['ring', 'Odak halkası', LINE.odak.width + ' px · line.odak · ' + LINE.odak.color],
  ['page', 'Boşluk', FOCUS.offset + ' px · focus.offset · zemin'],
  ['bd', 'Kenar', LINE.kontrol.width + ' px · line.kontrol · ' + LINE.kontrol.color],
  ['in', 'Köşe', RMAX + ' px; halka da köşesiz, öğenin dış çizgisini izler']
].map(([c, k, v]) => '<li><i class="sw-' + c + '"></i><b>' + k + '</b><span>' + v + '</span></li>').join('') + '</ul><p class="help">1 kare = 1 CSS px, 24 kat büyütülmüş.</p>';

// Lines: one row per line token (shape.line: width, color) with its drawing and the words of tokens.json shape.border;
// the control border row shows both grounds it is drawn on (plain, and the hover or selected row).
const LINE_DEMO = {
  ince: '<div class="ln ln-ince"></div>',
  kontrol: '<div class="ln-pair"><div class="ln ln-kontrol"></div><div class="ln ln-tint"></div></div>',
  odak: '<div class="ln ln-odak"></div>',
  isaret: '<div class="ln ln-isaret"></div>',
  damga: '<div class="ln ln-damga"></div>',
  tablo: '<div class="ln ln-ince"></div>'
};
const LINE_NAME = { isaret: 'işaret' };

// One platform's spacing tokens as a short list, its grid sentence last (space.grid). Phone and panel are separate lists:
// a row never pairs a phone token with an unrelated panel token.
function spaceList(where, unit, title) {
  const rows = Object.entries(T.space[where]).filter(([, v]) => typeof v === 'number');
  const g = T.space.grid[where];
  const grid = g.columns + ' sütun, ' + (g.margin !== undefined ? g.margin + ' ' + unit + ' kenar, ' : '') + g.gutter + ' ' + unit + ' oluk';
  return '<div class="scroll-x"><table class="tbl-doc compact sp-tbl"><thead><tr><th>' + title + '</th><th class="r">' + unit + '</th></tr></thead><tbody>' +
    rows.map(([k, v]) => '<tr><td><code>space.' + where + '.' + k + '</code></td><td class="r mono">' + v + '</td></tr>').join('') +
    '<tr><td><code>grid.' + where + '</code></td><td class="r">' + grid + '</td></tr></tbody></table></div>';
}
function breakTable() {
  const k = panelBreak();
  const sorted = k.list.slice().sort((a, b) => a.en - b.en);
  const range = b => { const i = sorted.indexOf(b), next = sorted[i + 1]; return b.en === 0 ? next.en + ' px altı' : next ? b.en + ' ile ' + (next.en - 1) + ' px' : b.en + ' px ve üstü'; };
  const nav = b => (b.ad === 'genis' ? 'kenar çubuğu, ' + k.bar + ' px' : esc(b.gezinme));
  // Schematic of the three layouts, widest first; the current item carries the selection mark in each.
  const CLS = { genis: 's-wide', orta: 's-mid', dar: 's-narrow' };
  const sch = sorted.slice().reverse().map(b => '<figure class="bp-fig"><div class="sch ' + CLS[b.ad] + '" aria-hidden="true"><div class="sch-nav"><i></i><i></i><i></i><i></i><i></i></div><div class="sch-main"><i></i><i></i><i></i></div></div><figcaption>' + range(b) + '</figcaption></figure>').join('');
  return '<div class="bp-sch">' + sch + '</div><div class="scroll-x" style="margin-top:24px"><table class="tbl-doc compact bp-tbl"><thead><tr><th>Pencere genişliği</th><th>Gezinme</th><th>Izgara</th><th class="r">Sayfa kenarı</th></tr></thead><tbody>' +
    sorted.map(b => '<tr><td class="mono">' + range(b) + '</td><td>' + nav(b) + '</td><td>' + b.sutun + ' sütun, ' + b.oluk + ' px oluk</td><td class="r mono">' + b.kenar + ' px</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="help" style="margin-top:12px">Genişlik tarayıcı penceresinin genişliğidir. ' + k.narrow + ' Carbon\'un md kırılma noktası. ' + k.side + ' px\'te kenar çubuğu, iki sayfa kenarı ve yoklama tablosunun bütün sütunları yan yana sığar; 1366 px\'lik dizüstünde kenar çubuğu açık durur. Tablo pencereye sığmazsa yalnız tablo kendi içinde kayar. Hücre yatay boşluğu her genişlikte ' + rich('{component.tablerow.padX}') + '. Bu sayfadaki panel örneği aynı kuralı kendi çerçevesinin genişliğine uygular.</p>';
}
// Spacing illustration on a phone column: every block is labelled with its token, values read from tokens.json
// (space.phone and the component sizes of the button and the one-line list row).
function gridDemo() {
  const s = T.space.phone, edge = s.ekranKenari;
  const btn = componentSize('button.height.phone'), row = componentSize('row.minHeight.oneLine'), padY = componentSize('row.padY');
  const blocks = [];
  let y = edge;
  blocks.push([y, s.ustCubuk, 'ustCubuk ' + s.ustCubuk]); y += s.ustCubuk + s.ogeArasi;
  const card = s.kartIci * 2 + 40 + s.ogeArasi + 24;
  blocks.push([y, card, 'kartIci ' + s.kartIci + ' · ogeArasi ' + s.ogeArasi]); y += card + s.ogeArasi;
  blocks.push([y, btn, 'button.height.phone ' + btn]); y += btn + s.ogeArasi;
  blocks.push([y, row, 'row.minHeight.oneLine ' + row + ' · row.padY ' + padY]); y += row;
  return '<div class="grid-demo" aria-hidden="true" style="height:' + (y + edge) + 'px;--edge:' + edge + 'px"><div class="base"></div><div class="cols"><i></i><i></i><i></i><i></i></div>' +
    blocks.map(([t, h, l]) => '<div class="blk" style="top:' + t + 'px;height:' + h + 'px">' + l + '</div>').join('') +
    '<span class="edge-l">ekranKenari ' + edge + '</span></div><p class="help" style="margin-top:8px">Bloklar space.phone ve component.* tokenlarıdır; ızgara grid.phone.</p>';
}

function bicim() {
  const elev = T.shape.elevation;
  const tone = tr(C.wcagRatio(resolve('bg.surface'), resolve('bg.page')), 2) + ':1';
  return section('bicim', 'Köşe ' + RMAX + ', çizgi ' + LINE.ince.width + ' px, odak ' + LINE.odak.width + ' px. Yüzeyler gölgeyle değil ton farkı ve ince çizgiyle ayrılır. Boşluklar ' + T.space.base + ' px tabanın katıdır; çizgiler, odak boşluğu ve kontrollerin içindeki küçük işaretler bunun dışındadır (' + ref('bilesenler', 'Bileşenler') + ').',
    sub('Köşe', Object.keys(T.shape.radius).length + ' bileşen · hepsi ' + RMAX, '<div class="macro"><div class="macro-fig">' + cornerMacro() + '</div>' + cornerLegend() + '</div><ul class="radius-list" style="margin-top:24px">' + Object.entries(T.shape.radius).map(([k, v]) => '<li><span>' + k + '</span><span>' + v + ' px</span></li>').join('') + '</ul>' +
      '<p class="body" style="margin-top:12px">' + rich(T.shape.radiusNote, 'name') + '</p>') +
    sub('Çizgiler', 'kalınlık ve ton', '<div class="lines">' + Object.entries(T.shape.border).map(([k, d]) => '<div class="line-row"><p class="k">' + (LINE_NAME[k] || k) + '</p>' + (LINE_DEMO[k] || LINE_DEMO.ince) + '<p class="d"><code>line.' + k + '</code> ' + LINE[k].width + ' px · ' + rich(d, 'name') + '</p></div>').join('') + '</div>') +
    sub('Yükselti', elev.length + ' kat', '<div class="elev">' + elev.map((e, i) => '<div class="elev-card e' + i + '"><p class="k">' + esc(e.name) + '</p><p class="d">' + rich(e.use, 'name').replace('{{ton}}', tone) + '</p></div>').join('') + '</div>' +
      '<p class="help" style="margin-top:12px">' + rich(T.shape.elevationNote, 'name') + '</p>' +
      '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc elev-tbl"><thead><tr><th>Kat</th><th>CSS</th><th>React Native</th></tr></thead><tbody>' + elev.map(e => '<tr><td>' + esc(e.name) + '</td><td class="mono">' + esc(e.shadow) + '</td><td class="mono">' + esc(e.rn) + '</td></tr>').join('') + '</tbody></table></div>') +
    sub('Boşluk', 'taban ' + T.space.base + ' · ritim ' + 2 * T.space.base, '<div class="g2 space-top"><div class="space-list">' + T.space.scale.map((v, i) => '<div class="space-row"><span>--space-' + i + '</span><span>' + v + ' px</span><span class="bar" style="width:' + (v / Math.max(...T.space.scale) * 100).toFixed(2) + '%"></span></div>').join('') + '</div>' +
      '<div>' + gridDemo() + '</div></div>' +
      '<div class="space-bottom"><div class="sp-two">' + spaceList('phone', 'dp', 'Telefon') + spaceList('panel', 'px', 'Panel') + '</div>' +
      '<p class="help" style="margin-top:12px">' + rich(T.space.targetsNote, 'full') + '</p></div>') +
    sub('Kırılma noktaları', 'panel', breakTable()));
}
bicim.title = 'Biçim ve boşluk';
bicim.panelBreak = panelBreak;
module.exports = bicim;
module.exports.panelBreak = panelBreak;

// Section 'Biçim ve boşluk' (#bicim): the 0 px corner, lines, elevation and spacing. Owner: F1b.
const { T } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { section, sub } = require('../lib/section');

function cornerMacro() {
  const u = 24, W = 30 * u, H = 10 * u;
  let grid = '';
  for (let x = u; x < W; x += u) grid += 'M' + x + ' 0V' + H;
  for (let y = u; y < H; y += u) grid += 'M0 ' + y + 'H' + W;
  const lab = (y, k, v) => '<path class="dim" d="M' + (W + 4) + ' ' + y + 'H' + (W + 20) + '"></path><text x="' + (W + 28) + '" y="' + (y + 4) + '"><tspan class="k">' + k + '</tspan>' + v + '</text>';
  return '<svg viewBox="0 -8 ' + (W + 340) + ' ' + (H + 44) + '" role="img" aria-label="Kontrol köşesi 16 kat büyütülmüş: 1 px kenar, 2 px boşluk, 2 px odak halkası, köşe yarıçapı 0">' +
    '<rect class="page" x="0" y="0" width="' + W + '" height="' + H + '"></rect>' +
    '<path class="ring" d="M0 0H' + W + 'V' + 2 * u + 'H' + 2 * u + 'V' + H + 'H0Z"></path>' +
    '<path class="bd" d="M' + 4 * u + ' ' + 4 * u + 'H' + W + 'V' + 5 * u + 'H' + 5 * u + 'V' + H + 'H' + 4 * u + 'Z"></path>' +
    '<rect class="in" x="' + 5 * u + '" y="' + 5 * u + '" width="' + (W - 5 * u) + '" height="' + (H - 5 * u) + '"></rect>' +
    '<path class="px" d="' + grid + '"></path>' +
    lab(u, 'Odak halkası ', '2 px · accent.9') + lab(3 * u, 'Boşluk ', '2 px · zemin') + lab(4.5 * u, 'Kenar ', '1 px · neutral.9') + lab(8.5 * u, 'Köşe ', '0 px') +
    '<text x="0" y="' + (H + 28) + '">1 kare = 1 CSS px · halka da köşesiz, öğenin dış çizgisini izler</text></svg>';
}

function bicim() {
  return section('bicim', 'Köşe 0, çizgi 1 px, odak 2 px. Yüzeyler gölgeyle değil ton farkı ve ince çizgiyle ayrılır; gölge yalnız içeriğin üstünde açılan katmanda. Bütün ölçüler 4\'ün katı.',
    sub('Köşe', Object.keys(T.shape.radius).length + ' bileşen · hepsi 0', '<div class="macro">' + cornerMacro() + '</div><ul class="radius-list" style="margin-top:24px">' + Object.entries(T.shape.radius).map(([k, v]) => '<li><span>' + k + '</span><span>' + v + ' px</span></li>').join('') + '</ul><p class="body" style="margin-top:12px">' + esc(T.shape.radiusNote) + '</p>') +
    sub('Çizgiler', 'kalınlık ve ton', '<div class="lines">' + [['ince', 'ln-ince', 'ince'], ['kontrol', 'ln-kontrol', 'kontrol'], ['kontrol, renkli satırda', 'ln-tint', null], ['odak', 'ln-odak', 'odak'], ['işaret', 'ln-isaret', 'isaret'], ['damga', 'ln-damga', 'damga'], ['tablo', 'ln-ince', 'tablo']].map(([k, c, key]) =>
      '<div class="line-row"><p class="k">' + k + '</p><div class="ln ' + c + '"></div><p class="d">' + esc(key ? T.shape.border[key] : 'neutral.4 ve neutral.5 zemininde border.strongOnTint (neutral.10): 3,68:1 ve 3,42:1') + '</p></div>').join('') + '</div>') +
    sub('Yükselti', '4 düzey', '<div class="elev">' + T.shape.elevation.map((e, i) => '<div class="elev-card e' + i + '"><p class="k">' + esc(e.name) + '</p><p class="d">' + esc(e.use) + '</p></div>').join('') + '</div><p class="help" style="margin-top:12px">' + esc(T.shape.elevationNote) + '</p>' +
      '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc"><thead><tr><th>Düzey</th><th>CSS</th><th>React Native</th></tr></thead><tbody>' + T.shape.elevation.map(e => '<tr><td>' + esc(e.name) + '</td><td class="mono">' + esc(e.shadow) + '</td><td class="mono">' + esc(e.rn) + '</td></tr>').join('') + '</tbody></table></div>') +
    sub('Boşluk', 'taban 4 · ritim 8', '<div class="g2"><div class="space-list">' + T.space.scale.map((v, i) => '<div class="space-row"><span>--space-' + i + '</span><span>' + v + ' px</span><span class="bar" style="width:' + (v / 96 * 100).toFixed(2) + '%"></span></div>').join('') + '</div>' +
      '<div><div class="grid-demo" aria-hidden="true"><div class="base"></div><div class="cols"><i></i><i></i><i></i><i></i></div><div class="blk" style="top:16px;height:56px">ekran kenarı 16 · üst çubuk 56</div><div class="blk" style="top:88px;height:120px">kart içi 16 · öğe arası 8</div><div class="blk" style="top:216px;height:48px">düğme 48</div><div class="blk" style="top:272px;height:32px">satır aralığı 8</div></div>' +
      '<div class="scroll-x" style="margin-top:16px"><table class="tbl-doc compact"><thead><tr><th>Telefon (dp)</th><th class="r">değer</th><th>Panel (px)</th><th class="r">değer</th></tr></thead><tbody>' +
      (() => { const a = Object.entries(T.space.phone), b = Object.entries(T.space.panel), n = Math.max(a.length, b.length); let h = ''; for (let i = 0; i < n; i++) h += '<tr><td>' + (a[i] ? a[i][0] : '') + '</td><td class="r mono">' + (a[i] ? a[i][1] : '') + '</td><td>' + (b[i] ? b[i][0] : '') + '</td><td class="r mono">' + (b[i] ? b[i][1] : '') + '</td></tr>'; return h; })() +
      '</tbody></table></div><p class="help" style="margin-top:12px">' + esc(T.space.targetsNote) + '</p></div></div>'));
}
bicim.title = 'Biçim ve boşluk';
module.exports = bicim;

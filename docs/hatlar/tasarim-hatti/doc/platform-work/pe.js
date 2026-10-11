// Builds the progressive enhancement table of the "platform" fragment from web-features 3.40.1.
// Every version number and every "var"/"yok" cell is computed here, never typed.
// Usage: node pe.js > pe-table.html   (fails loudly when a group claim does not hold)
const path = require('path');
const DATA = path.join(__dirname, '..', '..', 'f16', 'wf', 'package', 'data.json');
const wf = require(DATA);
const F = wf.features;

// Panel floors (teknik.html#panel-cati): Chrome 109 only on lecture-hall PCs.
const FLOORS = [
  { key: 'c109', label: 'Chrome 109', sub: 'kürsü', test: s => le(s.chrome, '109') },
  { key: 'ce111', label: 'Chrome, Edge', sub: '111', test: s => le(s.chrome, '111') && le(s.edge, '111') },
  { key: 'ff114', label: 'Firefox', sub: '114', test: s => le(s.firefox, '114') },
  { key: 'sf164', label: 'Safari', sub: '16.4', test: s => le(s.safari, '16.4') && le(s.safari_ios, '16.4') },
];

function cmp(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}
function le(v, floor) { return v != null && !String(v).startsWith('≤') && cmp(v, floor) <= 0; }
function sup(id) {
  const f = F[id];
  if (!f || !f.status || !f.status.support) throw new Error('web-features has no support data for ' + id);
  return f.status.support;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const v = (id, b) => { const s = sup(id)[b]; if (s == null) throw new Error(`${id} has no ${b}`); return s; };

// Text cells may use {feature.browser} placeholders; they are filled from the same data.
const fill = t => t.replace(/\{([a-z0-9-]+)\.([a-z_]+)\}/g, (_, id, b) => v(id, b));

const GROUPS = [
  { title: 'Ana yol: alt sınırların hepsinde var', expect: 'all', rows: [
    { id: 'focus-visible', label: '<code>:focus-visible</code>',
      why: 'Yedek gerekmez. Halka yalnız klavye odağında çizilir: 2 px <code>focus.ring</code>, 2 px boşluk, 0 ms. Panel yalnız klavyeyle de kullanılır (<a href="plan.html#hoca">plan.html, Hoca ve yönetici</a>).' },
    { id: 'interaction', label: '<code>@media (hover: hover) and (pointer: fine)</code>',
      why: 'Yedek gerekmez. Hover yalnız imleçli cihazda: renk girişte 120 ms, çıkışta 100 ms. Dokunmatik ekranda yapışkan hover olmaz; basma <code>:active</code> ile 0,97 ölçek, 100 ms.' },
    { id: 'dialog', label: '<code>&lt;dialog&gt;</code>',
      why: 'Yedek gerekmez. Diyalog ve yan panel bununla. Açılış <code>dialog[open]</code> üzerinde <code>@keyframes</code>; kapanışta önce animasyon oynar, bitince <code>close()</code> çağrılır. Escape aynı yoldan geçer, odak açan öğeye döner.' },
    { id: 'prefers-reduced-motion', label: '<code>prefers-reduced-motion</code>',
      why: 'Yedek gerekmez. Açıkken kayma ve ölçek kalkar, renk ve opaklık kısa kalır, <code>::view-transition</code> animasyonları kapanır.' },
    { id: 'forced-colors', label: '<code>forced-colors</code>',
      why: 'Yedek gerekmez. Bu kipte gölge çizilmez; açılır katmanlar 1 px kenarlık alır, yüzey sınırı zaten 1 px çizgidir.' },
  ] },
  { title: 'İlerleyici: yoksa yalnız hareket sadeleşir, işlev aynı kalır', expect: 'notAll', rows: [
    { id: 'linear-easing', label: '<code>linear()</code>',
      why: 'Yay benzeri eğri yerine aynı süreyle <code>cubic-bezier</code> giriş eğrisi oynar; seçimi <code>@supports</code> yapar.' },
    { id: 'view-transitions', label: 'View Transitions <span class="pf-q">aynı belge</span>',
      why: 'Sayfa değişimi anında olur. Desteği TanStack Router kendisi denetler; yalnız arama parametresi değişen gezinmede (süzgeç) <code>viewTransition: false</code>. Yöne göre tür Chrome {active-view-transition.chrome}, Firefox {active-view-transition.firefox}, Safari {active-view-transition.safari} ister; daha eski Chrome düz çapraz geçiş yapar. Geçiş kesilemez: art arda tıklamada yenisi eskisini atlar.' },
    { id: 'transition-behavior', label: '<code>transition-behavior</code>',
      why: 'Kapanış yine oynar: önce animasyon, sonra <code>close()</code>. Katmanı kapanırken üstte tutan <code>overlay</code> yalnız Chromium\'da var; bu yüzden kapanışı her tarayıcıda aynı küçük yardımcı yönetir.' },
  ] },
  { title: 'Gerekmez: ana yol aynı işi onsuz yapar', expect: 'notAll', rows: [
    { id: 'starting-style', label: '<code>@starting-style</code>',
      why: 'Fark yok. Yeni öğenin girişi <code>@keyframes</code> ile her hedefte oynar.' },
    { id: 'interpolate-size', label: '<code>interpolate-size</code>',
      why: 'Fark yok. Yükseklik geçişi gerekirse <code>grid-template-rows</code> 0fr ile 1fr arası geçer: Chrome {grid-animation.chrome}, Firefox {grid-animation.firefox}, Safari {grid-animation.safari}, yani her hedefte.' },
  ] },
  { title: 'Kullanılmaz', expect: 'notAll', rows: [
    { id: 'popover', label: '<code>popover</code>',
      why: 'Desteklemeyen tarayıcıda öğe hep görünür kalır, yani işlev bozulur; bu yüzden ilerleyici sayılmaz. Açılır eylem listesi düğme, <code>aria-expanded</code> ve listeyle yazılır.' },
    { id: 'dialog-closedby', label: '<code>&lt;dialog closedby&gt;</code>',
      why: 'Safari\'de yok. Dışarı tıklayınca kapanma zemine tıklama dinleyicisiyle yapılır.' },
  ] },
];

function verCell(id) {
  const s = sup(id);
  const ce = s.chrome == null ? 'yok' : (s.edge && s.edge !== s.chrome ? `${s.chrome} <span class="pf-q">Edge ${s.edge}</span>` : s.chrome);
  const ff = s.firefox == null ? 'yok' : s.firefox;
  const sf = s.safari == null ? 'yok' : (s.safari_ios && s.safari_ios !== s.safari ? `${s.safari} <span class="pf-q">iOS ${s.safari_ios}</span>` : s.safari);
  return [ce, ff, sf];
}

const out = [];
const audit = [];
// Explicit ARIA table roles: under 720 px the rows become stacked cards (CSS display changes),
// and the roles keep the table semantics for screen readers. data-label feeds the card labels.
const VLABEL = ['Chrome, Edge', 'Firefox', 'Safari'];
out.push('<div class="scroll-x pf-pe-wrap">');
out.push('<table class="tbl-doc pf-pe" role="table">');
out.push('<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" rowspan="2">Özellik</th><th role="columnheader" scope="colgroup" colspan="3">İlk sürüm</th><th role="columnheader" scope="colgroup" colspan="4">Alt sınırlarda</th><th role="columnheader" scope="col" rowspan="2">Yoksa ne olur</th></tr>');
out.push('<tr role="row">' + VLABEL.map(l => `<th role="columnheader" scope="col">${l}</th>`).join('') + FLOORS.map(f => `<th role="columnheader" scope="col" class="pf-fl">${f.label}<span>${f.sub}</span></th>`).join('') + '</tr></thead>');
for (const g of GROUPS) {
  out.push('<tbody role="rowgroup">');
  out.push(`<tr role="row" class="pf-grp"><th role="rowheader" scope="rowgroup" colspan="9">${g.title}</th></tr>`);
  for (const r of g.rows) {
    const s = sup(r.id);
    const av = FLOORS.map(f => f.test(s));
    if (g.expect === 'all' && !av.every(Boolean)) throw new Error(`${r.id} is filed under "${g.title}" but is missing on a floor: ${JSON.stringify(av)}`);
    if (g.expect === 'notAll' && av.every(Boolean)) throw new Error(`${r.id} is filed under "${g.title}" but works on every floor`);
    const [ce, ff, sf] = verCell(r.id);
    audit.push({ id: r.id, chrome: s.chrome, edge: s.edge, firefox: s.firefox, safari: s.safari, safari_ios: s.safari_ios, floors: Object.fromEntries(FLOORS.map((f, i) => [f.key, av[i]])) });
    out.push('<tr role="row">'
      + `<th role="rowheader" scope="row">${r.label}</th>`
      + [ce, ff, sf].map((c, i) => `<td role="cell" class="pf-v" data-label="${VLABEL[i]}">${c}</td>`).join('')
      + av.map((a, i) => `<td role="cell" class="pf-av ${a ? 'pf-y' : 'pf-n'}" data-l1="${FLOORS[i].label}" data-l2="${FLOORS[i].sub}"><span class="pf-mk" aria-hidden="true"></span>${a ? 'var' : 'yok'}</td>`).join('')
      + `<td role="cell" class="pf-why">${fill(r.why)}</td>`
      + '</tr>');
  }
  out.push('</tbody>');
}
out.push('</table>');
out.push('</div>');
process.stdout.write(out.join('\n') + '\n');
require('fs').writeFileSync(path.join(__dirname, 'pe-audit.json'), JSON.stringify({ source: 'web-features ' + require(path.join(path.dirname(DATA), 'package.json')).version, rows: audit }, null, 1));

// Section 'Gece mavisi nerede' (#gece-mavisi): the ink thesis, the role map on the home screen, the never list, the
// lesson timeline and the measured share of every drawn screen. Owner: F1b.
const { T, COV } = require('../lib/inputs');
const { esc, tr, resolve } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp } = require('../lib/marks');
const { device } = require('../lib/phone');
const { covOf, budget } = require('../lib/coverage');
const { section, sub, ref } = require('../lib/section');
const { homeScreen } = require('../screens/home');
const { cnt } = require('../screens/roster');

// Measured share per screen (values from coverage.json).
const SCREENS = [
  { sel: '#scr-home', name: 'Öğrenci ana ekranı', sub: 'Bugün, yoklama açık', kind: 'phone' },
  { sel: '#scr-scan', name: 'QR okutma', sub: 'Kamera, Aşama 2', kind: 'phone' },
  { sel: '#scr-success', name: 'Yoklama kaydedildi', sub: 'Makbuz ve karar', kind: 'phone' },
  { sel: '#scr-qr', name: 'Hoca QR ekranı', sub: 'İnternetsiz QR', kind: 'phone' },
  { sel: '#scr-records', name: 'Kayıtlar', sub: 'Çevrimdışı şeridi açık', kind: 'phone' },
  { sel: '#scr-panel', name: 'Panel yoklama tablosu', sub: '1440 ve 390 px', kind: 'panel' }
];
const mixBar = p => '<span class="m-zemin" style="flex:' + p.zemin + '"></span><span class="m-gri" style="flex:' + p.gri + '"></span><span class="m-mavi" style="flex:' + p['gece mavisi'] + '"></span><span class="m-mor" style="flex:' + p.mor + '"></span><span class="m-kirmizi" style="flex:' + p['kırmızı'] + '"></span>';
function coverageBlock() {
  if (!COV) return '<p class="body">Ölçüm henüz alınmadı: <code>node tools/measure.js</code></p>';
  const max = 10;
  let lastKind = '';
  return '<div class="cov"><div class="cov-axis" aria-hidden="true"><span>Ekran</span><span class="ax"><span>%0</span><span>%5</span><span>%10</span></span><span style="text-align:right">gece mavisi</span></div>' + SCREENS.map(s => {
    const p = covOf(s.sel), p390 = covOf(s.sel, '390');
    if (!p) return '';
    const v = p['gece mavisi'], b = budget(s.kind), ok = v <= b && (!p390 || p390['gece mavisi'] <= b);
    const first = s.kind !== lastKind; lastKind = s.kind;
    return '<div class="cov-row"><p class="cov-name">' + s.name + '<small>' + s.sub + '</small></p>' +
      '<div class="cov-bars"><div class="cov-track" role="img" aria-label="Gece mavisi payı yüzde ' + tr(v, 2) + ', bütçe yüzde ' + b + '"><span class="cov-fill" style="width:' + Math.min(100, (v / max) * 100) + '%"></span><span class="cov-budget' + (b / max > 0.5 ? ' l' : '') + '"' + (first ? ' data-l="bütçe %' + b + '"' : '') + ' style="left:' + (b / max) * 100 + '%"></span></div>' +
      '<div class="cov-mix">' + mixBar(p) + '</div></div>' +
      '<p class="cov-val">%' + tr(v, 2) + '<small>' + (ok ? 'bütçe içinde' : 'bütçe aşıldı') + '</small>' + (p390 ? '<small>390 px\'te %' + tr(p390['gece mavisi'], 2) + '</small>' : '') + '</p></div>';
  }).join('') + '</div>' +
    '<p class="help" style="margin-top:12px;max-width:none">Ölçek %0 ile %10 arası; siyah dikey çizgi bütçe. İnce şerit ekranın bütün renk dağılımı (kırık beyaz, gri, gece mavisi, mor, kırmızı); sarı ve yeşil ailesi her ekranda %0. Yazı gri tonlu kenar yumuşatmayla ölçüldü: telefonlar böyle çizer, masaüstünün alt piksel renk saçakları tasarım rengi değildir. Kaynak: shot.js --elements, coverage.js (' + esc(COV.date) + ').</p>';
}

/* ---------- 'Bir ders boyunca gece mavisi' (graft from direction C, drawn with this system's roles) ---------- */
const LESSON = { from: '10:00', to: '11:50' };
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pos = t => ((mins(t) - mins(LESSON.from)) / (mins(LESSON.to) - mins(LESSON.from)) * 100).toFixed(3) + '%';
const LANES = [
  { name: 'Öğrencinin telefonu', sub: 'Bugün, QR okut, kaydedildi (Ö2, Ö3)', bands: [['10:00', '10:15', 'ink']], ticks: ['10:03'],
    ev: [['10:00', [1, 8], 'Pencere açılır: Yoklamamı ver düğmesi ve kalan süre çubuğu'], ['10:03', [7, 1], 'Kayıt anı: kare ve onay işareti, Var ve Tamam; Tamam\'a basılınca kapanır'], ['10:15', [4], 'Pencere kapanır, düğme devre dışı kalır; ekranda yalnız alt sekme işareti']] },
  { name: 'Hocanın telefonu', sub: 'QR gösterme, kafa sayısı (H14, H5)', bands: [['10:00', '10:15', 'none']], ticks: ['11:45'],
    ev: [['10:00', [], 'QR ekranı açık: saf siyah ve beyaz, gece mavisi yok'], ['11:45', [1], 'Kafa sayısı girilir: Kaydet birincil eylemi']] },
  { name: 'Web paneli', sub: 'Projeksiyon sayfası, yoklama tablosu (P12, P2)', bands: [['10:00', '10:15', 'none']], ticks: ['11:50'],
    ev: [['10:00', [], 'Projeksiyon sayfası yalnız QR\'ı gösterir: gece mavisi yok'], ['11:50', [6, 4, 5, 1], 'Yoklama tablosu: Var sayısı, seçim işareti, işaretli kutu, Excel olarak indir']] }
];
const rolePins = ns => ns.map(n => '<span class="tl-pin" title="' + esc(T.accentUsage[n - 1].role) + '">' + n + '</span>').join('');
function lessonTimeline() {
  const inkMin = LANES[0].bands.filter(b => b[2] === 'ink').reduce((a, b) => a + mins(b[1]) - mins(b[0]), 0);
  const total = mins(LESSON.to) - mins(LESSON.from);
  const axis = ['10:00', '10:15', '10:30', '11:00', '11:30', '11:50'];
  return '<div class="tl plate"><p class="plate-cap"><b>Veri Yapıları, 6 Ekim 2026 Salı</b><span>' + LESSON.from + ' ile ' + LESSON.to + '</span></p><div class="plate-body">' +
    LANES.map(l => '<div class="tl-lane"><p class="tl-name"><b>' + l.name + '</b><span>' + l.sub + '</span></p><div class="tl-main">' +
      '<div class="tl-track" aria-hidden="true"><span class="tl-base"></span>' +
      l.bands.map(([a, b, k]) => '<span class="tl-band ' + k + '" style="left:' + pos(a) + ';width:calc(' + pos(b) + ' - ' + pos(a) + ')"></span>').join('') +
      l.ticks.map(t => '<span class="tl-tick" style="left:' + pos(t) + '"></span>').join('') + '</div>' +
      '<ol class="tl-ev">' + l.ev.map(([t, ns, d]) => '<li><span class="tl-t num">' + t + '</span><span class="tl-pins">' + (ns.length ? rolePins(ns) : '<span class="tl-none">yok</span>') + '</span><span class="tl-d">' + d + '</span></li>').join('') + '</ol></div></div>').join('') +
    '<div class="tl-axis num" aria-hidden="true">' + axis.map(t => '<span style="left:' + pos(t) + '">' + t + '</span>').join('') + '</div>' +
    '<div class="tl-key"><span><i class="k-ink"></i>gece mavisi ekranda</span><span><i class="k-none"></i>ekran açık, gece mavisi yok</span><span><i class="k-tick"></i>tek an</span><span><span class="tl-pin">1</span>kullanım haritasındaki rol</span></div>' +
    '<p class="help" style="margin-top:12px;max-width:none">Öğrencinin ekranında dolu gece mavisi derste ' + inkMin + ' dakika durur (' + total + ' dakikalık dersin %' + tr(inkMin / total * 100, 1) + '\'i). Odak halkası (2) yalnız klavyeyle, satır içi bağlantı (3) yalnız gövde metninde görünür; zaman çizgisinde yer almazlar.</p></div></div>';
}

const ON_HOME = [1, 1, 0, 1, 0, 0, 0, 1];

function geceMavisi() {
  const MINI = ['<span class="mini-btn"></span>', '<span class="mini-ring"></span>', '<span class="mini-link">bağlantı</span>', '<span class="mini-mark"></span>', '<span class="mini-ctl"><span class="b"></span><span class="s"></span></span>', '<span class="mini-fig num">' + cnt('var') + '</span>', stamp('var', 'Var', 'check'), '<span class="mini-prog"></span>'];
  return section('gece-mavisi', 'Gece mavisi bu tasarımda boya değil mürekkeptir: zemine sürülmez, karar verilen yere yazılır. Nötr ölçek aynı ailenin H 270 tonunu taşıdığı için alt ton her gri yüzeyde hissedilir; renk olarak yalnız aşağıdaki sekiz rolde görünür.',
    '<div class="thesis"><p class="thesis-q">Bir ekranda gece mavisi nereye düşüyorsa, kullanıcının <em>yapacağı ya da yaptığı şey</em> oradadır.</p>' +
    '<ol class="rules-3"><li><span class="k">01</span><p><b>Tek dolgu.</b> Her ekranda en çok bir dolu gece mavisi alan vardır: birincil eylem. Ana ekranda kalan süre rakamı bile mavi değildir. İkincil düğmeler gri çerçeveli, hayalet düğmeler çerçevesizdir.</p></li>' +
    '<li><span class="k">02</span><p><b>Seçim işaretle gösterilir.</b> Seçili satır, etkin sekme ve etkin menü öğesi gri kalır; seçimi 2 px mürekkep çizgi anlatır.</p></li>' +
    '<li><span class="k">03</span><p><b>Renkli zemin yoktur.</b> accent.1 ile accent.8 bu tasarımda kullanılmaz: açık mavi seçim, pastel kart, mavi başlık çubuğu olmaz. Durumlar da zeminsizdir; tek istisna yoğun tablodaki Yok ve Ret (gül zemin).</p></li></ol></div>' +
    sub('Kullanım haritası', 'accentUsage · ' + T.accentUsage.length + ' rol', '<div class="usage"><div class="u-list">' + T.accentUsage.map((u, i) =>
      '<div class="u-row"><span class="u-pin">' + (i + 1) + '</span><div class="u-demo">' + MINI[i] + '</div><div><p class="u-role">' + esc(u.role) + '<span class="u-step">' + u.step + ' · ' + resolve(u.step) + '</span></p><p class="u-where">' + esc(u.where) + '</p><p class="u-why">' + esc(u.why) + (ON_HOME[i] ? '' : ' Ana ekran örneğinde yok.') + '</p></div></div>').join('') +
      '</div><div class="device-fig">' + device('scr-home-map', homeScreen(true)) + '<div class="device-cap"><p class="t">Ana ekranda roller<span>' + ON_HOME.map((v, i) => (v ? i + 1 : 0)).filter(Boolean).join(', ') + '</span></p><p class="d">Odak halkası (2) burada gösterim için sürekli çizildi; gerçekte yalnız klavyeyle odaklanınca görünür. Kalan süre rakamı birincil metin renginde: ekranın tek dolu mavi alanı düğmedir.</p></div></div></div>') +
    sub('Hiçbir zaman', 'accentNever', '<ul class="never">' + T.accentNever.map(n => '<li>' + I('block', 20) + '<p>' + esc(n) + '</p></li>').join('') + '</ul>') +
    sub('Bir ders boyunca gece mavisi', 'ne zaman, hangi rol', '<p class="body" style="margin-bottom:16px">Haritadaki rollerin bir ders içinde hangi ekranda ve ne zaman göründüğü. Doygun mavi yalnız iki kısa anda toplanır: pencere açıkken öğrencinin ekranında ve ders sonunda panelde.</p>' + lessonTimeline()) +
    sub('Ölçülen pay', 'bütçe: telefon %' + T.coverageBudget.phone + ', panel %' + T.coverageBudget.panel, '<p class="body" style="margin-bottom:24px">Her ekranın görüntüsü 390 ve 1440 px genişlikte alındı ve gece mavisi ailesindeki pikseller sayıldı (OKLCH tonu 220 ile 290, kroma en az 0,04). ' + ref('ekranlar', 'Telefon ekranları') + ' bölümündeki Röntgen anahtarı aynı ekranlarda yalnız bu pikselleri bırakır.</p>' + coverageBlock()));
}
geceMavisi.title = 'Gece mavisi nerede';
module.exports = geceMavisi;

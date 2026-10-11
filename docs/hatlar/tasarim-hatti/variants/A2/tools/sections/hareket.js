// Section 'Hareket' (#hareket): durations, timing constants, scale factors and distances, curves and springs (each
// replayable), the slow-motion and reduced-motion switches, and the motion rules. What each duration, curve and spring
// is used for is generated from the interaction patterns (tools/lib/motion.js), never typed. Token names carry their
// group (dur., ease., spring., time., scale., distance.) so a duration, a curve and a spring of the same name never mix.
// Reduced motion has one rule per pattern, in the interaction table (decisions-r2 E3). Owner: F1a.
const { T, CHK, springInfo } = require('../lib/inputs');
const { esc, escCode, tr } = require('../lib/format');
const { I } = require('../lib/icons');
const { switchRow } = require('../lib/controls');
const { section, sub, has, ref, anchor } = require('../lib/section');
const { rich, retyped } = require('../lib/refs');
const motion = require('../lib/motion');

const timeOf = n => T.motion.timing.find(t => t.name === n).ms;
const durOf = n => T.motion.duration.find(d => d.name === n).ms;
function curveSvg(b) {
  const S = 200, P = (x, y) => (x * S).toFixed(1) + ' ' + ((1 - y) * S).toFixed(1);
  let g = '';
  for (let i = 1; i < 4; i++) g += '<path class="grid" d="M' + (i * S / 4) + ' 0V' + S + 'M0 ' + (i * S / 4) + 'H' + S + '"></path>';
  return '<svg viewBox="-8 -8 216 216" role="img" aria-label="cubic-bezier(' + b.join(', ') + ')">' + g + '<path class="ax" d="M0 0V200H200"></path>' +
    '<path class="hd" d="M' + P(0, 0) + 'L' + P(b[0], b[1]) + 'M' + P(1, 1) + 'L' + P(b[2], b[3]) + '"></path>' +
    '<path class="cv" d="M' + P(0, 0) + 'C' + P(b[0], b[1]) + ' ' + P(b[2], b[3]) + ' ' + P(1, 1) + '"></path>' +
    '<rect class="cp" x="' + (b[0] * S - 3) + '" y="' + ((1 - b[1]) * S - 3) + '" width="6" height="6"></rect><rect class="cp" x="' + (b[2] * S - 3) + '" y="' + ((1 - b[3]) * S - 3) + '" width="6" height="6"></rect></svg>';
}
function springSvg(s) {
  const k = s.stiffness, c = s.damping, m = s.mass, dt = 1 / 2000; let x = 0, v = 0, t = 0; const pts = [];
  const info = springInfo(c, k, m);
  const T0 = info.settleMs / 1000;
  while (t <= T0) { const a = (-k * (x - 1) - c * v) / m; v += a * dt; x += v * dt; t += dt; pts.push([t, x]); }
  const S = 200, st = Math.max(1, Math.floor(pts.length / 80));
  const d = pts.filter((_, i) => i % st === 0).map((p, i) => (i ? 'L' : 'M') + ((p[0] / T0) * S).toFixed(1) + ' ' + ((1 - p[1] / 1.1) * S).toFixed(1)).join('');
  let g = '';
  for (let i = 1; i < 4; i++) g += '<path class="grid" d="M' + (i * S / 4) + ' 0V' + S + '"></path>';
  const one = ((1 - 1 / 1.1) * S).toFixed(1);
  return '<svg viewBox="-8 -8 216 216" role="img" aria-label="Yay eğrisi: spring.' + s.name + '">' + g + '<path class="ov" d="M0 ' + one + 'H200"></path><path class="ax" d="M0 0V200H200"></path><path class="cv" d="M0 200' + d.replace(/^M/, 'L') + '"></path></svg>';
}
const play = (id, label) => '<button class="btn btn-ghost btn-sm play-btn" type="button" data-run="' + id + '" aria-label="Oynat: ' + label + '">' + I('replay', 20) + '</button>';
const list = a => (a || []).join(', ');
// The usage line of a duration or curve: where the patterns use it. Where reduced motion uses it is the interaction
// table's Hareketi azalt column, the one rule (decisions-r2 E3); it is not listed a second time here.
function useLine(u, path) {
  const n = u.normal.get(path), r = u.reduced.get(path);
  return esc(n && n.length ? list(n) : r && r.length ? 'yalnız hareketi azaltmada (Etkileşim tablosu)' : 'kullanılmıyor');
}

function hareket() {
  const u = motion.usage();
  for (const r of T.motion.rules) { const bad = retyped(r); if (bad.length) throw new Error('hareket: a motion rule retypes a value: ' + bad.join(', ')); }
  // the success moment: the check ends as the signature duration ends (Etkileşim tablosu, başarı anı)
  const succ = motion.pattern('success'), end = /\{dur\.(\w+)\} anında biter/.exec(succ.enter), draw = succ.timing.draw.enter;
  if (!end || timeOf('onayGecikme') + durOf(draw[0].slice(4)) !== durOf(end[1])) throw new Error('hareket: the success check must end with the duration its text names (time.onayGecikme + the draw duration)');
  const durRows = '<div class="dur-row dur-head" aria-hidden="true"><span>Token</span><span>Süre</span><span>Kullanım (panel ve bu sayfa)</span><span></span></div>' + T.motion.duration.map(d =>
    '<div class="dur-row"><p class="k">dur.' + d.name + '</p><p class="ms">' + d.ms + ' ms</p><div><div class="lane" id="ln-d-' + d.name + '" data-ms="' + d.ms + '" data-ease="var(--ease-standart)"><span class="bar" style="width:' + (d.ms / 4) + '%"></span><span class="dot"></span></div><span class="use">' + useLine(u, 'dur.' + d.name) + '</span></div>' + play('ln-d-' + d.name, 'dur.' + d.name) + '</div>').join('');
  // each curve replays with the duration it is used with most
  const curveDur = e => { const p = [...u.normal.entries()].filter(([k, v]) => /^(dur|time)\./.test(k) && (u.normal.get('ease.' + e) || []).some(l => v.includes(l))); const best = p.sort((a, b) => b[1].length - a[1].length)[0]; return best ? (best[0].startsWith('dur.') ? durOf(best[0].slice(4)) : timeOf(best[0].slice(5))) : durOf('uzun'); };
  const curves = T.motion.easing.map(e => '<div class="curve"><div class="curve-plot">' + curveSvg(e.bezier) + '</div><div class="curve-meta"><p class="k">ease.' + e.name + '<code>--ease-' + e.name + '</code></p><p class="v">cubic-bezier(' + e.bezier.join(', ') + ')</p><p class="u">' + esc(e.note) + '. Kullanım: ' + useLine(u, 'ease.' + e.name) + '.</p></div>' +
    '<div class="curve-run"><div class="lane" id="ln-e-' + e.name + '" data-ms="' + curveDur(e.name) + '" data-ease="var(--ease-' + e.name + ')"><span class="dot"></span></div>' + play('ln-e-' + e.name, 'ease.' + e.name) + '</div></div>').join('');
  const springUse = motion.springUse();
  const springs = T.motion.spring.map(s => {
    const info = CHK.springs[s.name] || springInfo(s.damping, s.stiffness, s.mass);
    return '<div class="curve"><div class="curve-plot">' + springSvg(s) + '</div><div class="curve-meta"><p class="k">spring.' + s.name + '<code>--spring-' + s.name + '</code></p><p class="v">withSpring({ mass: ' + s.mass + ', stiffness: ' + s.stiffness + ', damping: ' + s.damping + ' })</p>' +
      '<div class="spring-nums"><div><b>' + tr(info.zeta, 3) + '</b>sönüm oranı</div><div><b>' + info.settleMs + ' ms</b>oturma</div><div><b>%' + tr(info.overshootPct, 2) + '</b>aşma</div></div><p class="u">Telefonda: ' + esc(list(springUse.get(s.name)) || 'kullanılmıyor') + '.</p></div>' +
      '<div class="curve-run"><div class="lane" id="ln-s-' + s.name + '" data-ms="' + info.settleMs + '" data-ease="var(--spring-' + s.name + ')"><span class="dot"></span></div>' + play('ln-s-' + s.name, 'spring.' + s.name) + '</div></div>';
  }).join('');
  const timing = '<ul class="tim-list">' + T.motion.timing.map(t => '<li><code>time.' + t.name + '</code><b>' + (t.ms >= 1000 ? tr(t.ms / 1000, t.ms % 1000 ? 1 : 0) + ' sn' : t.ms + ' ms') + '</b><span>' + esc(t.use) + '</span></li>').join('') + '</ul>';
  const geo = '<ul class="tim-list">' + T.motion.scale.map(s => '<li><code>scale.' + s.name + '</code><b>' + tr(s.value, 2) + '</b><span>' + esc(s.use) + '</span></li>').join('') +
    T.motion.distance.map(s => '<li><code>distance.' + s.name + '</code><b>' + s.value + '</b><span>' + esc(s.use) + '</span></li>').join('') +
    T.motion.gesture.map(s => '<li><code>gesture.' + s.name + '</code><b>' + tr(s.value, s.value % 1 ? 1 : 0) + (s.unit ? ' ' + esc(s.unit) : '') + '</b><span>' + esc(s.use) + '</span></li>').join('') + '</ul>';
  return section('hareket', 'Carbon\'un iş hareketi (productive): kısa, aşmasız, kesilebilir. Tek vurgu anı (Carbon\'un expressive eğrisi) yoklamanın kaydedildiği an. Panele özgü açılış ve kapanış animasyonları ayrıca konuşulacak' + (has('acik') ? ' (' + anchor('acik', 'acik-panel-hareket', 'Açık noktalar') + ')' : '') + '; buradaki genel kurallar şimdiden geçerli.',
    '<div class="ctl-plate two">' + switchRow('slow-sw', '4 kat yavaş oynat', 'Eğrileri ve başarı anını gözle incelemek için; ürün davranışı değildir.', '') +
    switchRow('rm-sw', 'Hareketi azalt önizlemesi', 'Sayfanın tamamı, işletim sisteminde hareketi azaltma ayarı açıkmış gibi davranır.', 'data-rm') + '</div>' +
    sub('Süreler', T.motion.duration.length + ' adım · ms', '<div id="durs"><div class="dur-list">' + durRows + '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-secondary btn-sm" type="button" data-run-all="durs">' + I('replay', 20) + 'Hepsini oynat</button><p class="help">Aynı yol, farklı süre: hepsi ease.standart ile.</p></div>' +
      '<p class="body" style="margin-top:16px">' + esc(T.motion.durationNote) + ' Kullanım sütunu panelin ve bu sayfanın; telefonda konum ve ölçek yayla oynar, renk ve opaklık aynı süreleri kullanır (Telefon sütunu, ' + ref('etkilesim', 'Etkileşim tablosu') + '). Android\'de Animasyonları kaldır açıkken bütün süreler 0 olur.</p></div>') +
    sub('Zamanlama', T.motion.timing.length + ' sabit · time.', '<p class="body" style="margin-bottom:16px">Süre olmayan zaman değerleri de tokendır: bekleme, aralık, eşik ve döngü.</p>' + timing) +
    sub('Ölçek ve mesafe', 'scale. · distance. · gesture.', '<p class="body" style="margin-bottom:16px">Açılan ve basılan öğenin başlangıç ölçeği, kayma mesafesi ve bildirimi kaydırarak kapatma eşiği. Mesafe telefonda dp, panelde px.</p>' + geo) +
    sub('Eğriler', 'cubic-bezier · Carbon iş eğrileri', '<div class="curves">' + curves + '</div>') +
    sub('Yaylar', 'Reanimated withSpring', '<p class="body" style="margin-bottom:16px">' + escCode(T.motion.springNote) + '</p><div class="curves c3s">' + springs + '</div>') +
    sub('Kurallar', '', '<ol class="rules-list rules-2">' + T.motion.rules.map(r => '<li><p>' + rich(r, 'full') + '</p></li>').join('') + '</ol>'));
}
hareket.title = 'Hareket';
module.exports = hareket;

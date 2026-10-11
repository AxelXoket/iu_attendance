// Section 'Hareket' (#hareket): durations, curves and springs (each replayable), the slow-motion and reduced-motion
// switches, and the motion rules. Owner: F1a.
const { T, springInfo } = require('../lib/inputs');
const { esc, tr, durOf } = require('../lib/format');
const { I } = require('../lib/icons');
const { switchRow } = require('../lib/controls');
const { section, sub, has, ref } = require('../lib/section');

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
  return { info, svg: '<svg viewBox="-8 -8 216 216" role="img" aria-label="Yay eğrisi">' + g + '<path class="ov" d="M0 ' + one + 'H200"></path><path class="ax" d="M0 0V200H200"></path><path class="cv" d="M0 200' + d.replace(/^M/, 'L') + '"></path></svg>' };
}

function hareket() {
  const durRows = T.motion.duration.map(d => '<div class="dur-row"><p class="k">' + d.name + '</p><p class="ms">' + d.ms + ' ms</p><div><div class="lane" id="ln-d-' + d.name + '" data-ms="' + d.ms + '" data-ease="var(--ease-standart)"><span class="bar" style="width:' + (d.ms / 4) + '%"></span><span class="dot"></span></div><span class="use">' + esc(d.use) + '</span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-d-' + d.name + '" aria-label="Oynat: ' + d.name + '">' + I('replay', 20) + '</button></div>').join('');
  const curveDur = { standart: durOf('uzun'), giris: durOf('orta'), cikis: durOf('kisa'), mikro: durOf('hover'), imza: durOf('imza'), dogrusal: 1200 };
  const curves = T.motion.easing.map(e => '<div class="curve"><div class="curve-plot">' + curveSvg(e.bezier) + '</div><div class="curve-meta"><p class="k">' + e.name + '<code>--ease-' + e.name + '</code></p><p class="v">cubic-bezier(' + e.bezier.join(', ') + ')</p><p class="u">' + esc(e.use) + '</p></div>' +
    '<div class="curve-run"><div class="lane" id="ln-e-' + e.name + '" data-ms="' + curveDur[e.name] + '" data-ease="var(--ease-' + e.name + ')"><span class="dot"></span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-e-' + e.name + '" aria-label="Oynat: ' + e.name + '">' + I('replay', 20) + '</button></div></div>').join('');
  const springs = T.motion.spring.map(s => {
    const { info, svg } = springSvg(s);
    return '<div class="curve"><div class="curve-plot">' + svg + '</div><div class="curve-meta"><p class="k">' + s.name + '<code>--spring-' + s.name + '</code></p><p class="v">withSpring({ mass: ' + s.mass + ', stiffness: ' + s.stiffness + ', damping: ' + s.damping + ' })</p>' +
      '<div class="spring-nums"><div><b>' + tr(info.zeta, 3) + '</b>sönüm oranı</div><div><b>' + info.settleMs + ' ms</b>oturma</div><div><b>%' + tr(info.overshootPct, 2) + '</b>aşma</div></div><p class="u">' + esc(s.use) + '</p></div>' +
      '<div class="curve-run"><div class="lane" id="ln-s-' + s.name + '" data-ms="' + info.settleMs + '" data-ease="var(--spring-' + s.name + ')"><span class="dot"></span></div><button class="btn btn-ghost btn-sm play-btn" type="button" data-run="ln-s-' + s.name + '" aria-label="Oynat: ' + s.name + '">' + I('replay', 20) + '</button></div></div>';
  }).join('');
  return section('hareket', 'Üretken hareket: kısa, aşmasız, kesilebilir. Yalnız transform ve opacity canlanır; renk geçişi serbest. Tek ifadeci an yoklamanın kaydedildiği an. Panele özgü açılış ve kapanış animasyonları sahiple ayrıca konuşulacak' + (has('acik') ? ' (' + ref('acik', 'Açık noktalar') + ')' : '') + '; buradaki genel kurallar şimdiden geçerli.',
    '<div class="ctl-plate two">' + switchRow('slow-sw', '4 kat yavaş oynat', 'Eğrileri ve başarı anını gözle incelemek için; ürün davranışı değildir.', '') +
    switchRow('rm-sw', 'Hareketi azalt önizlemesi', 'Sayfanın tamamı, işletim sisteminde hareketi azalt açıkmış gibi davranır: konum ve ölçek kalkar, renk ve opaklık kalır.', 'data-rm') + '</div>' +
    sub('Süreler', T.motion.duration.length + ' adım · ms', '<div id="durs"><div class="dur-list">' + durRows + '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-secondary btn-sm" type="button" data-run-all="durs">' + I('replay', 20) + 'Hepsini oynat</button><p class="help">Aynı yol, farklı süre: hepsi standart eğriyle.</p></div></div>') +
    sub('Eğriler', 'cubic-bezier · Carbon üretken', '<div class="curves">' + curves + '</div>') +
    sub('Yaylar', 'Reanimated withSpring · spring.js', '<p class="body" style="margin-bottom:16px">' + esc(T.motion.springNote) + '</p><div class="curves c4">' + springs + '</div>') +
    sub('Kurallar', '', '<ol class="rules-list rules-2">' + T.motion.rules.map(r => '<li><p>' + esc(r) + '</p></li>').join('') + '</ol>'));
}
hareket.title = 'Hareket';
module.exports = hareket;

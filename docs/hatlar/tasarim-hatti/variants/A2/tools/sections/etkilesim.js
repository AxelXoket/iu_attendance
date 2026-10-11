// Section 'Etkileşim tablosu' (#etkilesim): every interaction pattern with what animates, its timing on the panel and
// this page, its single driver on the phone, and its reduced-motion form, the only reduced-motion rule (decisions-r2
// E3). Generated from tokens.json motion.patterns (the motion.* groups of the token file): durations and curves are
// read from their tokens, prose names tokens and never retypes a value (the build stops on a retyped one), and the
// page's components read the same timing as CSS variables (tools/lib/gencss.js). Owner: F1a.
const { T } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { section, sub, ref } = require('../lib/section');
const { rich, retyped } = require('../lib/refs');
const motion = require('../lib/motion');

const PL = { ikisi: 'telefon ve panel', panel: 'panel', telefon: 'telefon' };
// Timing lines of a pattern, one per track and phase, "giriş ve çıkış" when both are the same step; the track name comes
// first when the pattern has several tracks.
const stepText = s => (s.step === 'anlik' ? 'anında' : rich('{' + s.step[0] + '}', 'full') + ', ' + rich('{' + s.step[1] + '}', 'name')) + (s.delay ? ', ' + rich('{' + s.delay + '} bekledikten sonra', 'full') : '');
function timingLines(steps, many) {
  const tracks = [...new Set(steps.map(s => s.track))];
  const lines = [];
  for (const tk of tracks) {
    const st = steps.filter(s => s.track === tk), en = st.find(s => s.phase === 'enter'), ex = st.find(s => s.phase === 'exit');
    const head = many && st[0].name ? '<span class="pat-tk">' + esc(st[0].name) + '</span> ' : '';
    if (en && ex && JSON.stringify(en.step) === JSON.stringify(ex.step) && !en.delay) lines.push(head + '<span class="pat-ph">giriş ve çıkış</span> ' + stepText(en));
    else for (const s of [en, ex].filter(Boolean)) lines.push(head + '<span class="pat-ph">' + motion.PH[s.phase] + '</span> ' + stepText(s));
  }
  return lines.length ? '<ul class="pat-t">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul>' : '';
}

function etkilesim() {
  const P = T.motion.patterns;
  for (const p of P) {
    if (/\bya da\b/.test(p.phone)) throw new Error('etkilesim: the phone driver of "' + p.pattern + '" offers a choice ("ya da")');
    for (const f of ['properties', 'enter', 'exit', 'origin', 'phone']) { const bad = retyped(p[f]); if (bad.length) throw new Error('etkilesim: ' + p.key + '.' + f + ' retypes a value (' + bad.join(', ') + '); name its token in braces'); }
    const bad = retyped(p.reduced.text); if (bad.length) throw new Error('etkilesim: ' + p.key + '.reduced retypes a value');
  }
  const head = ['Kalıp', 'Ne canlanır', 'Panel ve bu sayfa', 'Telefon', 'Hareketi azalt'];
  const rows = P.map(p => {
    const many = Object.keys(p.timing || {}).length > 1;
    const st = motion.steps(p), rs = motion.reducedSteps(p);
    const detail = '<details class="pat-more"><summary>Giriş, çıkış, köken</summary><dl class="pat-dl"><dt>Giriş</dt><dd>' + rich(p.enter) + '</dd><dt>Çıkış</dt><dd>' + rich(p.exit) + '</dd><dt>Köken</dt><dd>' + rich(p.origin) + '</dd></dl></details>';
    const cells = [
      '<b class="pat-n">' + esc(p.pattern) + '</b><span class="pat-pl">' + (PL[p.platforms] || esc(p.platforms)) + '</span>' + detail,
      rich(p.properties),
      st.length ? timingLines(st, many) : '<p>' + (p.platforms === 'telefon' && !p.timing ? 'Sistemin; token değil' : 'yok') + '</p>',
      '<p>' + rich(p.phone) + '</p>',
      '<p>' + rich(p.reduced.text) + '</p>' + timingLines(rs, many)
    ];
    return '<tr id="k-' + p.key + '">' + cells.map((c, i) => '<td data-th="' + head[i] + '">' + c + '</td>').join('') + '</tr>';
  }).join('');
  return section('etkilesim', 'Her etkileşim kalıbının ne canlandırdığı, panelde ve bu sayfada süresi ile eğrisi, telefondaki tek sürücüsü ve hareketi azaltmadaki karşılığı. Tablo token dosyasının <code>motion.*</code> gruplarından üretilir (' + ref('tokenlar', 'Tokenlar') + '); süre, eğri ve yayın değeri ' + ref('hareket', 'Hareket') + ' bölümündedir. Hareketi azalt sütunu her kalıbın tek kuralıdır: sayfanın bileşenleri aynı değerleri CSS değişkeni olarak okur.',
    sub('Kalıplar', P.length + ' kalıp', '<div class="scroll-x pat-wrap"><table class="tbl-doc stack pat-tbl"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'));
}
etkilesim.title = 'Etkileşim tablosu';
module.exports = etkilesim;

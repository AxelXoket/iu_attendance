// Section 'Etkileşim tablosu' (#etkilesim): every interaction pattern with what animates, its timing and its
// reduced-motion form, from the patterns list in tokens.json. Owner: F1a.
const { T } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { section, sub } = require('../lib/section');

function etkilesim() {
  return section('etkilesim', 'Her etkileşim kalıbının ne canlandırdığı, süresi, eğrisi, kökeni ve hareket azaltma karşılığı. Değerler tokens.json içindeki patterns dizisinden gelir.',
    sub('Kalıplar', T.motion.patterns.length + ' kalıp', '<div class="pats"><div class="pat pat-head" aria-hidden="true"><span>Kalıp</span><span>Ne canlanır</span><span>Süre, eğri, köken</span><span>Hareket azaltma</span></div>' + T.motion.patterns.map(p =>
      '<div class="pat"><div class="pat-n"><b>' + esc(p.pattern) + '</b><span class="pat-pl">' + esc(p.platforms) + '</span></div>' +
      '<dl class="pat-c"><dt>Özellik</dt><dd>' + esc(p.properties) + '</dd><dt>Giriş</dt><dd>' + esc(p.enter) + '</dd><dt>Çıkış</dt><dd>' + esc(p.exit) + '</dd></dl>' +
      '<dl class="pat-c"><dt>Süre</dt><dd>' + esc(p.duration) + '</dd><dt>Eğri</dt><dd>' + esc(p.curve) + '</dd><dt>Köken</dt><dd>' + esc(p.origin) + '</dd></dl>' +
      '<dl class="pat-c"><dt>Azaltılmış</dt><dd>' + esc(p.reduced) + '</dd></dl></div>').join('') + '</div>'));
}
etkilesim.title = 'Etkileşim tablosu';
module.exports = etkilesim;

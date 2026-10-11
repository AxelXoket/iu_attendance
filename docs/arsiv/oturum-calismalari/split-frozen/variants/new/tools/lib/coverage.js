// Measured midnight-blue share per drawn screen (coverage.json, written by tools/measure.js) and the bar drawn under
// each screen. Values are read, never typed. Owner: F1a.
const { T, COV } = require('./inputs');
const { tr } = require('./format');
const covOf = (sel, w = '1440') => COV && COV[w] && COV[w][sel];
const budget = k => (k === 'panel' ? T.coverageBudget.panel : T.coverageBudget.phone);
// Measured share and budget under each drawn screen (values come from coverage.json, never typed).
function covBar(sel, kind) {
  const p = covOf(sel), p390 = covOf(sel, '390');
  if (!p) return '';
  const v = p['gece mavisi'], b = budget(kind), max = 10;
  return '<div class="sbar" data-cov-sel="' + sel + '" data-cov="' + v + '"' + (p390 ? ' data-cov390="' + p390['gece mavisi'] + '"' : '') + '><div class="sbar-track" role="img" aria-label="Ölçülen gece mavisi payı yüzde ' + tr(v, 2) + ', bütçe yüzde ' + b + '"><span class="sbar-fill" style="width:' + Math.min(100, v / max * 100).toFixed(2) + '%"></span><span class="sbar-b" style="left:' + (b / max * 100) + '%"></span></div>' +
    '<p class="sbar-t"><span>gece mavisi <b>%' + tr(v, 2) + '</b>' + (p390 ? ' · 390 px\'te %' + tr(p390['gece mavisi'], 2) : '') + '</span><span>bütçe %' + b + '</span></p></div>';
}
module.exports = { covOf, budget, covBar };

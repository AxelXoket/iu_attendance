// Page footer: the date line and the source of the midnight-blue measurement. Owner: F1b.
const { COV } = require('../lib/inputs');
const { esc } = require('../lib/format');

function footer() {
  return '<footer class="foot"><p>İÜ Yoklama · Tasarım · 6 Ekim 2026</p><p>' + (COV ? 'Gece mavisi ölçümü: ' + esc(COV.date) : 'Ölçüm bekleniyor') + ' · tokens.json, tcheck.js, coverage.js</p></footer>';
}
module.exports = footer;

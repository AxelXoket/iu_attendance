// Page footer: the date line, the date of the midnight-blue measurement, and where the sources are (id kaynaklar, so links
// to tasarim.html#kaynaklar keep working): the decision to research table is the research file's İzlenebilirlik table,
// built from tokens.json "sources"; every section links its outside sources in its own Kaynak line. Owner: F1b.
const { T, COV } = require('../lib/inputs');
const { ref } = require('../lib/section');

const trDate = iso => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso + 'T12:00:00Z'));

function footer() {
  return '<footer class="foot" id="kaynaklar"><p class="foot-src"><b>Kaynaklar.</b> Her kararın dayandığı araştırma kayıtları ve o kayıtların dış kaynakları tasarım araştırması dosyasındaki İzlenebilirlik tablosundadır (<code>tasarim-arastirmasi.html</code>, depo dışında; ' + Object.keys(T.sources).length + ' karar). Bölümlerdeki Kaynak satırları dış kaynağa doğrudan bağlanır.</p>' +
    '<p>İÜ Yoklama · Tasarım · 6 Ekim 2026</p><p>' + (COV ? 'Gece mavisi ölçümü ' + trDate(COV.date) : 'Gece mavisi ölçümü bekleniyor') + ' · Değerler: ' + ref('tokenlar', 'Tokenlar') + '</p></footer>';
}
module.exports = footer;

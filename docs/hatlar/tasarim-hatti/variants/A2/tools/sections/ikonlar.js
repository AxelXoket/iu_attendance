// Section 'İkonlar' (#ikonlar): the icons in use, their sizes and the filled form. The sizes are the components' icon
// tokens (component.*.icon), read from tokens.json. Owner: F1b.
const { T } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { I } = require('../lib/icons');
const { section, sub, ref } = require('../lib/section');

// The icons the product uses. No torch: the scan screen has none (G2 #43), so flashlight_on is not in the set.
const ICON_LIST = ['check', 'close', 'work', 'description', 'edit', 'do_not_disturb_on', 'schedule', 'search', 'block', 'smartphone', 'cloud_done', 'cloud_off', 'info', 'warning', 'error', 'report', 'qr_code_scanner', 'qr_code_2', 'today', 'history', 'person', 'more_vert', 'chevron_right', 'arrow_upward', 'download', 'upload_file', 'filter_list', 'dialpad', 'logout', 'menu', 'menu_book', 'edit_note', 'fact_check', 'summarize', 'groups', 'timer', 'brightness_high', 'flag', 'meeting_room', 'delete', 'hourglass_top', 'link', 'mail', 'bluetooth_disabled', 'location_off'];
// Every icon size a component draws (component.<x>.icon, one number or one per platform), smallest first.
const ICON_SIZES = [...new Set(T.components.flatMap(c => { const v = c.size && c.size.icon; return v === undefined ? [] : typeof v === 'number' ? [v] : Object.values(v); }))].sort((a, b) => a - b);
// An icon name may break after an underscore, never inside a word.
const nameHtml = n => esc(n).replace(/_/g, '_<wbr>');

function ikonlar() {
  const sizes = ICON_SIZES.join(', ').replace(/, (\d+)$/, ' ve $1');
  return section('ikonlar', esc(T.icons.why),
    sub('Kullanılan ikonlar', T.icons.set + ' · ' + ICON_LIST.length + ' ikon', '<div class="icon-grid">' + ICON_LIST.map(n => '<div class="icon-cell">' + I(n, 24) + '<span>' + nameHtml(n) + '</span></div>').join('') + '</div>') +
    sub('Boy ve dolgu', esc(T.icons.sizes) + ': ' + sizes, '<div class="scroll-x"><table class="isz"><thead><tr><th>ad</th><th>16 · opsz 20</th><th>20 · opsz 20</th><th>24 · opsz 24</th><th>24 · dolu</th></tr></thead><tbody>' +
      ['today', 'history', 'person', 'qr_code_scanner'].map(n => '<tr><td>' + n + '</td><td>' + I(n, 16) + '</td><td>' + I(n, 20) + '</td><td>' + I(n, 24) + '</td><td>' + I(n, 24, true) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="g2 isz-notes"><div><p class="body">' + esc(T.icons.style) + ' ' + esc(T.icons.stroke) + '. Dolu biçim yalnız etkin alt sekmede: seçimi ikonun dolgusu ve seçim çizgisi (line.isaret) birlikte anlatır. Durum ikonlarının biçimleri ayrı ayrı seçildi: onay, çarpı, çanta, belge, kalem, eksi daire, saat, büyüteç, yasak işareti; renk kalksa da ayrılırlar. Dairesiz kural: ' + ref('bicim', 'Biçim ve boşluk') + ', Köşe.</p></div>' +
      '<div><p class="body">Kaynak: ' + esc(T.icons.source) + '. Lisans: ' + esc(T.icons.license) + '.</p></div></div>'));
}
ikonlar.title = 'İkonlar';
ikonlar.ICON_LIST = ICON_LIST;
module.exports = ikonlar;

// Section 'İkonlar' (#ikonlar): the icons in use, their sizes and the filled form. Owner: F1b.
const { T } = require('../lib/inputs');
const { esc } = require('../lib/format');
const { I } = require('../lib/icons');
const { section, sub } = require('../lib/section');

const ICON_LIST = ['check', 'close', 'work', 'description', 'edit', 'do_not_disturb_on', 'schedule', 'search', 'block', 'smartphone', 'cloud_done', 'cloud_off', 'info', 'warning', 'error', 'report', 'qr_code_scanner', 'qr_code_2', 'today', 'history', 'person', 'more_vert', 'chevron_right', 'arrow_upward', 'download', 'upload_file', 'filter_list', 'flashlight_on', 'dialpad', 'logout', 'menu', 'menu_book', 'edit_note', 'fact_check', 'summarize', 'groups', 'timer', 'brightness_high', 'flag', 'meeting_room', 'delete', 'radio_button_unchecked', 'radio_button_checked', 'hourglass_top', 'link', 'mail', 'bluetooth_disabled', 'location_off'];

function ikonlar() {
  return section('ikonlar', esc(T.icons.why),
    sub('Kullanılan ikonlar', T.icons.set + ' · ' + ICON_LIST.length + ' ikon', '<div class="icon-grid">' + ICON_LIST.map(n => '<div class="icon-cell">' + I(n, 24) + '<span>' + n + '</span></div>').join('') + '</div>') +
    sub('Boy ve dolgu', T.icons.sizes, '<div class="g2"><div class="scroll-x"><table class="isz"><thead><tr><th>ad</th><th>16 · opsz 20</th><th>20 · opsz 20</th><th>24 · opsz 24</th><th>24 · dolu</th></tr></thead><tbody>' +
      ['today', 'history', 'person', 'qr_code_scanner'].map(n => '<tr><td>' + n + '</td><td>' + I(n, 16) + '</td><td>' + I(n, 20) + '</td><td>' + I(n, 24) + '</td><td>' + I(n, 24, true) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div><p class="body">' + esc(T.icons.style) + ' ' + esc(T.icons.stroke) + '. Dolu biçim yalnız etkin alt sekmede: seçimi ikonun dolgusu ve 2 px mürekkep çizgi birlikte anlatır.</p><p class="body">Kaynak: ' + esc(T.icons.source) + '. Lisans: ' + esc(T.icons.license) + '.</p><p class="body">Durum ikonlarının biçimleri ayrı ayrı seçildi: onay, çarpı, çanta, belge, kalem, eksi daire, saat, büyüteç, yasak işareti. Renk kalksa da ayrılırlar. Daire biçimi yalnız ikonun kendi çiziminde kalır: seçenek düğmesinin işareti de bir ikondur (radio_button).</p></div></div>'));
}
ikonlar.title = 'İkonlar';
module.exports = ikonlar;

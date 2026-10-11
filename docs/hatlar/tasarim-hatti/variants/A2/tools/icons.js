// Fetches the official Material Symbols Sharp SVGs (weight 400, grade 0) from google/material-design-icons
// and writes a {name: {o24, o20, f24}} map of single-path data (viewBox 0 -960 960 960).
// o24: outline opsz 24, o20: outline opsz 20 (used at 16 and 20 px), f24: FILL 1 opsz 24 (selected tab).
const fs = require('fs'), path = require('path');
const names = process.argv.slice(2).length ? process.argv.slice(2) : [
  'check', 'close', 'work', 'badge', 'description', 'edit', 'do_not_disturb_on', 'schedule', 'search', 'block',
  'smartphone', 'cloud_done', 'cloud_off', 'info', 'warning', 'error', 'report', 'qr_code_scanner', 'qr_code_2',
  'today', 'history', 'person', 'more_vert', 'chevron_right', 'expand_more', 'arrow_back', 'arrow_upward',
  'arrow_downward', 'download', 'upload_file', 'filter_list', 'flashlight_on', 'dialpad', 'logout', 'menu_book',
  'edit_note', 'fact_check', 'summarize', 'groups', 'timer', 'brightness_high', 'flag', 'replay',
  'signal_cellular_4_bar', 'wifi', 'battery_full', 'meeting_room', 'delete', 'fullscreen', 'help', 'sync', 'event',
  'add', 'print', 'tune', 'visibility', 'home', 'list_alt', 'person_add', 'hourglass_top', 'lock', 'mail', 'pin',
  'keyboard_arrow_down', 'radio_button_unchecked', 'radio_button_checked', 'bluetooth_disabled', 'location_off',
  'menu', 'link', 'signal_cellular_nodata', 'wifi_off'
];
const base = 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/';
const outFile = path.join(__dirname, '..', 'icons.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const pick = svg => { const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map(m => m[1]); return ds.length ? ds.join(' ') : null; };
(async () => {
  for (const n of names) {
    if (out[n] && out[n].o24) continue;
    const get = async v => { const r = await fetch(`${base}${n}/materialsymbolssharp/${n}_${v}.svg`); return r.ok ? pick(await r.text()) : null; };
    const o24 = await get('24px'), o20 = await get('20px'), f24 = await get('fill1_24px');
    if (!o24) { console.log('missing', n); continue; }
    out[n] = { o24, o20: o20 || o24, f24: f24 || o24 };
    console.log('ok', n, o24.length);
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length, 'icons ->', outFile);
})();

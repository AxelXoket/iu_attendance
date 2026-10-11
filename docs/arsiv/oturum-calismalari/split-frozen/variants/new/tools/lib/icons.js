// Icons. I() draws an inline <svg><use> and records the symbol it needs; sprite() emits the recorded symbols in
// first-use order, so the order the sections are built in is the order of the sprite. Five 20 px symbols are always
// in the sprite because the page script draws them itself (toasts, sheet messages). Owner: F1a.
const { ICONS } = require('./inputs');
const used = new Map();
const need = (name, kind) => { if (!ICONS[name]) throw new Error('icon missing: ' + name); used.set(kind + ':' + name, { name, kind }); };
['error', 'check', 'close', 'cloud_done', 'smartphone'].forEach(n => need(n, 'o20'));
const I = (name, size = 24, filled = false, cls = '') => {
  const kind = filled ? 'f24' : size >= 24 ? 'o24' : 'o20';
  need(name, kind);
  const id = (kind === 'f24' ? 'if-' : kind === 'o24' ? 'i-' : 'i20-') + name;
  return '<svg class="ic' + (size === 24 ? '' : ' ic' + size) + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
};
const sprite = () => '<svg class="vh" aria-hidden="true" focusable="false"><defs>' + [...used.values()].map(({ name, kind }) => {
  const id = (kind === 'f24' ? 'if-' : kind === 'o24' ? 'i-' : 'i20-') + name;
  return '<symbol id="' + id + '" viewBox="0 -960 960 960"><path d="' + ICONS[name][kind] + '"></path></symbol>';
}).join('') + '</defs></svg>';
module.exports = { I, sprite, iconCount: () => used.size };

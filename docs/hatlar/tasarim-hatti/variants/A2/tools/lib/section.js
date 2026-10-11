// Section scaffolding: the numbered head, a sub-block, the section element, a table that reflows into cards on a phone,
// and cross-references that link only when the target is on the page. tools/build.js calls setNav() with the section
// numbers and the own titles once the fragments are loaded, before it builds any section. Owner: F1a.
const { esc } = require('./format');
const nav = { NO: null, OWN: null };
const setNav = (NO, OWN) => { nav.NO = NO; nav.OWN = OWN; };
const ready = () => { if (!nav.NO) throw new Error('section numbers are not set: tools/build.js calls setNav() before it builds a section'); };
const no = id => { ready(); return nav.NO[id]; };
const has = id => !!no(id);
const ref = (id, text) => (has(id) ? '<a href="#' + id + '">' + text + '</a>' : text);
// A link to an anchor inside a section written by another author (a fragment), only when that section is on the page.
const anchor = (sectionId, id, text) => (has(sectionId) ? '<a href="#' + id + '">' + text + '</a>' : text);
const secHead = (id, title, lead) => '<div class="sec-h"><p class="sec-no">' + no(id) + '</p><div><h2>' + title + '</h2>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div></div>';
const sub = (title, note, body, id) => '<div class="sub"' + (id ? ' id="' + id + '"' : '') + '><div class="sub-h"><h3>' + title + '</h3>' + (note ? '<p class="note">' + note + '</p>' : '') + '</div>' + body + '</div>';
const section = (id, lead, body) => { ready(); return '<section id="' + id + '" class="sec">' + secHead(id, nav.OWN[id], lead) + body + '</section>'; };
// A table that becomes one card per row below 600 px (base.css, .tbl-doc.stack): every cell carries its column name in
// data-th. cols: strings or { h, cls }; rows: arrays of cell HTML. The ARIA roles keep the table semantics when the
// cells are laid out as blocks.
const stripTags = s => String(s).replace(/<[^>]+>/g, '');
function table(cols, rows, cls = '') {
  const C = cols.map(c => (typeof c === 'string' ? { h: c } : c));
  const at = c => (c.cls ? ' class="' + c.cls + '"' : '');
  return '<div class="scroll-x"><table class="tbl-doc stack' + (cls ? ' ' + cls : '') + '" role="table"><thead role="rowgroup"><tr role="row">' +
    C.map(c => '<th role="columnheader"' + at(c) + '>' + c.h + '</th>').join('') + '</tr></thead><tbody role="rowgroup">' +
    rows.map(r => '<tr role="row">' + r.map((cell, i) => '<td role="cell" data-th="' + esc(stripTags(C[i].h)) + '"' + at(C[i]) + '><div class="td-v">' + cell + '</div></td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}
module.exports = { setNav, has, ref, anchor, secHead, sub, section, table };

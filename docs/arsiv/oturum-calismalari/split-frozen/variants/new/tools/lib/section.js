// Section scaffolding: the numbered head, a sub-block, the section element, and cross-references that link only when
// the target section is on the page. tools/build.js calls setNav() with the section numbers and the own titles once
// the fragments are loaded, before it builds any section. Owner: F1a.
const nav = { NO: null, OWN: null };
const setNav = (NO, OWN) => { nav.NO = NO; nav.OWN = OWN; };
const ready = () => { if (!nav.NO) throw new Error('section numbers are not set: tools/build.js calls setNav() before it builds a section'); };
const no = id => { ready(); return nav.NO[id]; };
const has = id => !!no(id);
const ref = (id, text) => (has(id) ? '<a href="#' + id + '">' + text + '</a>' : text);
const secHead = (id, title, lead) => '<div class="sec-h"><p class="sec-no">' + no(id) + '</p><div><h2>' + title + '</h2>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div></div>';
const sub = (title, note, body, id) => '<div class="sub"' + (id ? ' id="' + id + '"' : '') + '><div class="sub-h"><h3>' + title + '</h3>' + (note ? '<p class="note">' + note + '</p>' : '') + '</div>' + body + '</div>';
const section = (id, lead, body) => { ready(); return '<section id="' + id + '" class="sec">' + secHead(id, nav.OWN[id], lead) + body + '</section>'; };
module.exports = { setNav, has, ref, secHead, sub, section };

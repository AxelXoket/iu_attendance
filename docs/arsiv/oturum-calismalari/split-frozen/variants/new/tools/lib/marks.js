// Status marks from tokens.json: attendance (att) and server-decision (dec) marks, each as a framed stamp or an
// inline indicator. Used by sections of both owners (Durumlar, Panel, Telefon ekranları, Katmanlar). Owner: F1a.
const { T } = require('./inputs');
const { esc } = require('./format');
const { I } = require('./icons');
const ATT = Object.fromEntries(T.color.attendance.map(a => [a.key, a]));
const stamp = (key, label, icon, extra = '') => '<span class="stamp st-' + key + (extra ? ' ' + extra : '') + '">' + I(icon, 16) + '<span>' + esc(label) + '</span></span>';
const ind = (key, label, icon, extra = '') => '<span class="ind st-' + key + (extra ? ' ' + extra : '') + '">' + I(icon, 16) + esc(label) + '</span>';
const att = (k, kind = 'stamp', extra = '') => (kind === 'stamp' ? stamp(k, ATT[k].label, ATT[k].icon, extra) : ind(k, ATT[k].label, ATT[k].icon, extra));
const DEC = { var: ['Var', 'check'], beklemede: ['Beklemede', 'schedule'], incelemede: ['İncelemede', 'search'], ret: ['Ret', 'block'] };
const dec = (k, kind = 'stamp', extra = '') => (kind === 'stamp' ? stamp(k, DEC[k][0], DEC[k][1], extra) : ind(k, DEC[k][0], DEC[k][1], extra));
module.exports = { ATT, DEC, stamp, ind, att, dec };

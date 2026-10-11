// Text and token helpers for every builder: HTML escaping, Turkish decimals, color role and scale lookups, motion
// durations, and links into plan.html and teknik.html. Owner: F1a.
const { T } = require('./inputs');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tr = (x, d = 1) => Number(x).toFixed(d).replace('.', ',');
const scale = {};
T.color.neutral.forEach(s => { scale['neutral.' + s.step] = s.hex; });
T.color.accent.forEach(s => { scale['accent.' + s.step] = s.hex; });
const resolve = v => (/^#/.test(v) ? v.toUpperCase() : scale[v] || (T.color.roles[v] ? resolve(T.color.roles[v]) : null));
const cssVar = ref => (/^#/.test(ref) ? ref : 'var(--' + ref.replace(/\./g, '-') + ')');
const durOf = n => T.motion.duration.find(d => d.name === n).ms;
const PLAN = 'plan.html', TEK = 'teknik.html';
const doc = (file, id, label) => '<a href="' + file + '#' + id + '">' + (label || file + '#' + id) + '</a>';
module.exports = { esc, tr, resolve, cssVar, durOf, PLAN, TEK, doc };

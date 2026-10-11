// Warning level mark, drawn on the home screen and in Durumlar. Owner: F1b.
// Warning level: written level plus a four-step scale (8 px high); it shows the warning level, never the remaining rights.
const lvl = (n, cls) => '<span class="lvl l' + n + ' ' + cls + '"><span class="lvl-t">Düzey ' + n + '/4</span><span class="lvl-bar" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span>';
module.exports = { lvl };

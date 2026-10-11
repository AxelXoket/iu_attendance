// Warning level mark, drawn on the home screen and in Durumlar. Owner: F1b.
// The written level ("Seviye 2/4", the plan's word: plan.html#devam-uyari-seviyeleri) plus a four-step scale; it shows
// the warning level, never the remaining rights. Drawn as a plain bar with role="meter" (no <meter> element, which
// browsers paint green and yellow); its parts are presentational, the name and value come from the aria attributes.
// Ink and icon of each level come from the token file (tokens.json durumlar.uyari); the ink is drawn through the status
// token whose text color it is (status.<ad>.text), so a theme swap of the status tokens reaches the levels too. Level 4
// is the solid banner: ground status.danger.solid, text and filled segments status.danger.onSolid.
const { T } = require('../lib/inputs');
const { resolve } = require('../lib/format');
const LEVELS = T.durumlar.uyari;
const byLevel = n => { const u = LEVELS.find(x => x.level === n); if (!u) throw new Error('no warning level ' + n + ' in tokens.json durumlar.uyari'); return u; };
// The status token whose text color is the level's ink (status.info.text for neutral.12, and so on).
function inkToken(n) {
  const hex = resolve(byLevel(n).fg);
  const k = Object.keys(T.color.status).find(s => resolve(T.color.status[s].text) === hex);
  if (!k) throw new Error('the ink of warning level ' + n + ' is not a status text token: ' + byLevel(n).fg);
  return 'status.' + k + '.text';
}
const cssOf = ref => 'var(--' + ref.replace(/\./g, '-') + ')';
// Inline color of a level's ink (the text line beside a meter on the home screen, the Durumlar rows).
const ink = n => 'color:' + cssOf(inkToken(n));
const lvl = n => {
  const u = byLevel(n);
  return '<span class="lvl l' + n + (u.banner ? ' on-solid' : '') + '"' + (u.banner ? '' : ' style="' + ink(n) + '"') + ' role="meter" aria-label="Uyarı seviyesi" aria-valuemin="0" aria-valuemax="' + LEVELS.length + '" aria-valuenow="' + n + '" aria-valuetext="Seviye ' + n + '/' + LEVELS.length + '"><span class="lvl-t">Seviye ' + n + '/' + LEVELS.length + '</span><span class="lvl-bar" aria-hidden="true">' + '<i></i>'.repeat(LEVELS.length) + '</span></span>';
};
lvl.ink = ink;
lvl.inkToken = inkToken;
lvl.LEVELS = LEVELS;
module.exports = { lvl };

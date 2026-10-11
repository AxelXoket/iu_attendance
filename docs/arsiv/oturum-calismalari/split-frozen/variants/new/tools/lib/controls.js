// Demo controls used by sections of both owners: the switch row of a control plate (Röntgen in Telefon ekranları,
// slow motion and the reduced-motion preview in Hareket) and the square trace loader. Owner: F1a.
const switchRow = (id, label, help, attrs) => '<div class="set-row"><div><p class="t" id="' + id + '-l">' + label + '</p><p class="help" id="' + id + '-h">' + help + '</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="' + id + '-l" aria-describedby="' + id + '-h" id="' + id + '" ' + attrs + '><span class="sw-thumb"></span></button></div>';
const spinSvg = '<svg class="spin" viewBox="0 0 16 16" aria-hidden="true"><rect class="t0" x="1" y="1" width="14" height="14"></rect><rect class="t1" x="1" y="1" width="14" height="14" pathLength="56"></rect></svg>';
module.exports = { switchRow, spinSvg };

// Demo controls used by sections of both owners: the switch row of a control plate (Röntgen in Telefon ekranları,
// slow motion and the reduced-motion preview in Hareket), the loading mark (three squares that light up in turn,
// sized by component.spinner; base.css draws it, src/js/base.js takes the same markup from the page), and a button that can show a loading state
// without changing its width. Owner: F1a.
const switchRow = (id, label, help, attrs) => '<div class="set-row"><div><p class="t" id="' + id + '-l">' + label + '</p><p class="help" id="' + id + '-h">' + help + '</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="' + id + '-l" aria-describedby="' + id + '-h" id="' + id + '" ' + attrs + '><span class="sw-thumb"></span></button></div>';
// The loading mark drawn from component.spinner: three squares in a row, centered in the box.
const SP = require('./inputs').componentSize;
const spinSvg = (() => { const box = SP('spinner.box'), sq = SP('spinner.square'), gap = SP('spinner.gap'), y = (box - sq) / 2, x0 = (box - 3 * sq - 2 * gap) / 2; return '<svg class="spin" viewBox="0 0 ' + box + ' ' + box + '" aria-hidden="true">' + [0, 1, 2].map(i => '<rect x="' + (x0 + i * (sq + gap)) + '" y="' + y + '" width="' + sq + '" height="' + sq + '"></rect>').join('') + '</svg>'; })();
// The resting label and the busy label share one grid cell (base.css .btn-c), so the button is as wide as the wider one.
// state: '' (resting), 'wait' (busy and showing the busy label). attrs: extra attributes on the button.
const busyButton = (variant, rest, busy, { icon = '', attrs = '', state = '' } = {}) =>
  '<button class="btn btn-' + variant + '" type="button"' + (state === 'wait' ? ' aria-busy="true" aria-disabled="true" data-wait' : '') + attrs + '><span class="btn-c">' +
  '<span class="btn-rest"' + (state === 'wait' ? ' aria-hidden="true"' : '') + '>' + icon + '<span class="btn-label">' + rest + '</span></span>' +
  '<span class="btn-wait"' + (state === 'wait' ? '' : ' aria-hidden="true"') + '>' + spinSvg + '<span>' + busy + '</span></span></span></button>';
module.exports = { switchRow, spinSvg, busyButton };

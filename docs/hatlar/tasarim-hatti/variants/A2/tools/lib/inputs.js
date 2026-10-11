// Build inputs: the variant folder (A), a reader relative to it (rd), the token, check, icon, QR and coverage data, and
// the color and spring math shared with the other design tools (../../color.js, ../../spring.js). Owner: F1a.
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(A, f), 'utf8');
const T = JSON.parse(rd('tokens.json'));
const CHK = JSON.parse(rd('tokens.check.json'));
const ICONS = JSON.parse(rd('icons.json'));
const QR = JSON.parse(rd('qr.json'));
const COV = fs.existsSync(path.join(A, 'coverage.json')) ? JSON.parse(rd('coverage.json')) : null;
const C = require(path.join(A, '..', '..', 'color.js'));
const { springInfo } = require(path.join(A, '..', '..', 'spring.js'));

// Component sizes left space.phone and space.panel for component.* (decisions-r2 E1). A builder that still reads the old
// key gets the component value (one source) and the build names the new path once; the old keys are not enumerable,
// so a table of spacing tokens no longer lists them.
const MOVED = {
  phone: { satirDikey: 'row.padY', dugme: 'button.height.phone', tekSatir: 'row.minHeight.oneLine', ikiSatir: 'row.minHeight.twoLine', altSekme: 'tabbar.height' },
  panel: { hucreYatay: 'tablerow.padX', satirVarsayilan: 'tablerow.height.default', satirEtkilesimli: 'tablerow.height.interactive', satirSik: 'tablerow.height.dense', dugme: 'button.height.panel', kucukDugme: 'button.height.small' }
};
const componentSize = p => { const [key, ...rest] = p.split('.'); let v = (T.components.find(c => c.key === key) || {}).size; for (const r of rest) v = v && v[r]; return v; };
const warned = new Set();
for (const [where, keys] of Object.entries(MOVED)) for (const [k, to] of Object.entries(keys)) {
  if (k in T.space[where] || componentSize(to) === undefined) continue;
  Object.defineProperty(T.space[where], k, {
    enumerable: false,
    get() {
      if (!warned.has(where + k)) { warned.add(where + k); console.warn('warning: space.' + where + '.' + k + ' moved to component.' + to + ' (decisions-r2 E1); read it from there'); }
      return componentSize(to);
    }
  });
}
module.exports = { A, rd, T, CHK, ICONS, QR, COV, C, springInfo, componentSize };

// Deterministic checks for the arithmetic claims added in round 17 (D08 spec). Run: node check-r17.js
'use strict';
const assert = require('assert');
const hak = (T, p) => T - Math.floor((T * p + 99) / 100);
function seviye(Ts, p, A, nx) {
  const h = hak(Ts, p), kalan = h - A;
  if (A > h) return [4, 'HAKKINI_ASTIN', kalan];
  if (kalan === 0) return [3, 'HAKKIN_KALMADI', kalan];
  if (nx !== null && kalan <= nx) return [2, kalan < nx ? 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN' : 'BIR_DERS_DAHA_HAKKIN_BITER', kalan];
  if (2 * A >= h) return [1, 'YARISINI_KULLANDIN', kalan];
  return [0, null, kalan];
}
// 1. seviye esigi tablosu (test "1. seviye eşiği eşitlikte açılır")
assert.strictEqual(hak(14, 70), 4); assert.strictEqual(hak(10, 70), 3);
const rows = [
  [14, 1, 1, 0], [14, 2, 1, 1], [14, 1, null, 0], [14, 2, null, 1],
  [10, 1, null, 0], [10, 2, null, 1], [10, 1, 1, 0], [10, 2, 1, 2],
];
for (const [T, A, nx, beklenen] of rows) assert.strictEqual(seviye(T, 70, A, nx)[0], beklenen, `T=${T} A=${A} nx=${nx}`);
assert.strictEqual(seviye(10, 70, 2, 1)[1], 'BIR_DERS_DAHA_HAKKIN_BITER');
console.log('esik tablosu OK', rows.length);
// sonraki oturum degisimi (A03 kapsami): kalan 2, sonraki 3 saat -> 2 DEVAMSIZ_KALIRSIN; sonraki 1 saat -> 1
// p=70, tahmini T=42 -> hak 12; kullanilan 10 -> kalan 2
assert.strictEqual(hak(42, 70), 12);
assert.deepStrictEqual(seviye(42, 70, 10, 3), [2, 'BIR_DERS_DAHA_DEVAMSIZ_KALIRSIN', 2]);
assert.deepStrictEqual(seviye(42, 70, 10, 1), [1, 'YARISINI_KULLANDIN', 2]);
console.log('sonraki oturum ornegi OK');
// telafi eksigi: hoca iptali 2, taşındı 2 (karşılayan telafi 2 yapıldı), yapılmadı 1, başka telafi 2 yapıldı
function eksik(oturumlar) {
  const tasinanlar = new Set(oturumlar.filter(o => o.iptal === 'tasindi').map(o => o.id));
  let borc = 0, odenen = 0;
  for (const o of oturumlar) {
    if (o.tur === 'normal' && (o.iptal === 'hoca' || o.yapildi === false)) borc += o.saat;
    if (o.tur === 'normal' && o.iptal === 'tasindi' && !oturumlar.some(t => t.telafiEdilen === o.id)) borc += o.saat;
    if (o.tur === 'telafi' && o.yapildi === true && !tasinanlar.has(o.telafiEdilen)) odenen += o.saat;
  }
  return Math.max(0, borc - odenen);
}
const naif = os => Math.max(0, os.filter(o => o.tur === 'normal' && (o.iptal === 'hoca' || o.yapildi === false)).reduce((a, o) => a + o.saat, 0) - os.filter(o => o.tur === 'telafi' && o.yapildi === true).reduce((a, o) => a + o.saat, 0));
const ornek = [
  { id: 'a', tur: 'normal', iptal: 'hoca', saat: 2 },
  { id: 'b', tur: 'normal', iptal: 'tasindi', saat: 2 },
  { id: 'c', tur: 'telafi', telafiEdilen: 'b', yapildi: true, saat: 2 },
  { id: 'd', tur: 'normal', yapildi: false, saat: 1 },
  { id: 'e', tur: 'telafi', yapildi: true, saat: 2 },
  { id: 'f', tur: 'normal', iptal: 'tatil', saat: 3 },
];
assert.strictEqual(eksik(ornek), 1); assert.strictEqual(naif(ornek), 0);
// karşılayanı olmayan taşınma borçtur (savunma)
assert.strictEqual(eksik([{ id: 'b', tur: 'normal', iptal: 'tasindi', saat: 2 }]), 2);
// fazla telafi 0'ın altına inmez
assert.strictEqual(eksik([{ id: 'a', tur: 'normal', iptal: 'hoca', saat: 1 }, { id: 'e', tur: 'telafi', yapildi: true, saat: 3 }]), 0);
console.log('telafi eksigi OK: yeni kural 1, naif kural 0');
// BAGLANTI: son temas bekleyenli ise butun Yok oturumlar aday
console.log('ALL OK');

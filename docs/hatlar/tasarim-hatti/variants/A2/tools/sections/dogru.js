// Section 'Doğru ve yanlış' (#dogru): three decisions drawn right and wrong, side by side. Owner: F1b.
const { I } = require('../lib/icons');
const { section, sub } = require('../lib/section');

function dogru() {
  return section('dogru', 'Aynı içerik, iki karar. Soldaki bu tasarımın çizdiği, sağdaki hiç çizmediği biçim.',
    sub('Üç karar', 'gece mavisinin yeri', '<div class="dd">' +
      '<div class="dd-pair"><p class="dd-title">Seçili satır</p><div class="dd-cell"><div class="mk-rows"><p class="mk-row">BİL 301</p><p class="mk-row sel">MAT 207</p><p class="mk-row">FİZ 102</p></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-rows"><p class="mk-row">BİL 301</p><p class="mk-row bad">MAT 207</p><p class="mk-row">FİZ 102</p></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Gri zemin ve 2 px işaret; açık mavi zemin ve mavi yazı değil.</p></div>' +
      '<div class="dd-pair"><p class="dd-title">Birincil eylem</p><div class="dd-cell"><div class="mk-btns"><span class="mk-b p">Yoklamamı ver</span><span class="mk-b">Makbuzu göster</span></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-btns"><span class="mk-b p">Yoklamamı ver</span><span class="mk-b p">Makbuzu göster</span></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Ekranda tek dolu düğme; ikinci eylem gri çerçeveli.</p></div>' +
      '<div class="dd-pair"><p class="dd-title">Başlık çubuğu</p><div class="dd-cell"><div class="mk-screen"><p class="mk-bar">Kayıtlar</p><div class="mk-body"><i></i><i></i></div></div><p class="dd-verdict v-ok">' + I('check', 16) + 'Doğru</p></div><div class="dd-cell"><div class="mk-screen"><p class="mk-bar bad">Kayıtlar</p><div class="mk-body"><i></i><i></i></div></div><p class="dd-verdict v-no">' + I('close', 16) + 'Yanlış</p></div><p class="dd-why">Çubuk sayfa zemininde; gece mavisi geniş yüzeye sürülmez.</p></div>' +
      '</div>'));
}
dogru.title = 'Doğru ve yanlış';
module.exports = dogru;

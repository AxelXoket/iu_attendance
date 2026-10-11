// Section 'Tokenlar' (#tokenlar): how to read the token file, its size, and the whole file in W3C DTCG format
// (tools/lib/dtcg.js) inside a closed details. tools/build.js writes the same text next to the page as
// tasarim.tokens.json. Owner: F1a.
const { tr } = require('../lib/format');
const dtcg = require('../lib/dtcg');
const { section, sub, ref, anchor } = require('../lib/section');
const { esc } = require('../lib/format');

const FILE = 'tasarim.tokens.json';

function tokenlar() {
  const text = dtcg.text(), list = dtcg.tokens(), groups = dtcg.groups();
  const kb = tr(Buffer.byteLength(text, 'utf8') / 1024, 1);
  return section('tokenlar', 'Bu sayfadaki her renk, ölçü ve sürenin kaynağı tek token (tasarım değişkeni) dosyasıdır: ' + FILE + ', W3C DTCG biçiminde (Format Module 2025.10). Sayfanın CSS değişkenleri de aynı kaynaktan üretilir ve ikisinin aynı olduğunu bir test denetler. Dosyanın depoda nerede duracağı uygulama aşamasında belirlenir (' + anchor('acik', 'acik-token-yeri', 'Açık noktalar, Token dosyası') + ').',
    sub('Nasıl okunur', list.length + ' token · ' + groups.length + ' grup', '<ol class="rules-list rules-2">' + [
      'Yol adı CSS değişkeninin adıdır: nokta tire olur, harf büyüklüğü korunur. <code>text.linkHover</code> tokenı <code>--text-linkHover</code> olur. Geçiş tokenı iki değişkendir: <code>motion.dialog.enter</code> için <code>--motion-dialog-enter-dur</code> ve <code>-ease</code>; çizgi tokenının değişkeni kalınlığıdır (<code>--line-odak</code>).',
      'Renk OKLCH bileşenleri ve yuvarlandığı hex ile yazılır. Bir ölçek adımına ya da başka bir role bağlı rol takma addır: <code>"{neutral.2}"</code>.',
      'Yay, Reanimated <code>withSpring</code>\'in üç sayısıdır (damping, stiffness, mass); <code>dur</code> oturma süresidir, linear() eğrisi <code>$extensions</code> içinde durur ve bu sayfa yayı yalnız göstermek için onunla çizer.',
      'Etkileşim kalıbı (<code>motion.*</code>) bir geçiş grubudur: her izin giriş ve çıkış geçişi (süre, gecikme, eğri). Hareketi azaltmadaki karşılığı aynı grubun <code>$extensions</code> alanında <code>reducedMotion</code> olarak durur; ' + ref('etkilesim', 'Etkileşim tablosu') + ' bundan üretilir.',
      'Yazı stili Kalın Metin ayarındaki ağırlığını <code>$extensions</code> içinde <code>boldText</code> olarak taşır; eşleme tablosu ' + anchor('tipografi', 'tipografi-kalin', 'Tipografi, Kalın Metin') + ' içinde. Rol, artırılmış kontrasttaki değerini <code>contrastMore</code> olarak taşır; ölçülen çiftler ' + anchor('kontrast', 'kontrast-artirilmis', 'Kontrast, Artırılmış kontrast') + ' içinde.',
      'Bileşen ölçüleri <code>component.*</code> altındadır (' + ref('bilesenler', 'Bileşenler') + ', ' + ref('katmanlar', 'Katmanlar') + '). Telefonda ölçü birimi dp\'dir; DTCG yalnız px ve rem tanıdığı için dosyada px yazar, değer aynıdır.',
      'Dönüşümler: panelin tokens.css dosyasında yazı boyu px\'ten rem\'e çevrilir (16\'ya bölünür), satır yüksekliği birimsiz oran kalır. Telefonun tokens.ts dosyasında <code>lineHeight</code> oran ile <code>fontSize</code> çarpılıp tam sayıya yuvarlanır; <code>fontFamily</code> listenin ilk adıdır.'
    ].map(x => '<li><p>' + x + '</p></li>').join('') + '</ol>') +
    sub('Dosya', FILE + ' · ' + kb + ' KB', '<details class="code-d"><summary>' + esc(FILE) + ': ' + list.length + ' token, ' + groups.length + ' grup, ' + kb + ' KB</summary><div class="code-file" tabindex="0" role="region" aria-label="Token dosyası, ' + FILE + '"><pre><code>' + esc(text) + '</code></pre></div></details>'));
}
tokenlar.title = 'Tokenlar';
module.exports = tokenlar;

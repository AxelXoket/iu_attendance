// Section 'Tipografi' (#tipografi): IBM Plex Sans and Mono, Turkish casing computed live, the ligature rule, and the
// phone and panel type scales. Owner: F1b.
const { T } = require('../lib/inputs');
const { esc, doc, PLAN } = require('../lib/format');
const { I } = require('../lib/icons');
const { section, sub } = require('../lib/section');
const { cnt } = require('../screens/roster');

const PHONE_SAMPLE = { rakam: '11:42', 'baslik-1': 'Bugün', 'baslik-2': 'Sorun bildir', 'baslik-3': 'Veri Yapıları', govde: 'Pencere ders saatinde kendiliğinden açılır; süre dolunca düğme kapanır.', dugme: 'Yoklamamı ver', 'govde-kucuk': 'Bu kodu yalnız uygulamaya ya da panele gir.', etiket: 'Belgeli düzeltme', mini: 'Kayıtlar · 10:03', kod: '246 810', numara: '0412230017' };
const PANEL_SAMPLE = { 'etiket-01': 'Son değişiklik 6 Ekim 2026 Salı, 14:05', 'govde-kompakt-01': 'İrem Aydın · İkinci profil', 'govde-01': 'Değişiklikler uygulanmadan önce gösterilir.', 'govde-02': 'Muaf öğrenciye hak uyarısı gitmez.', 'baslik-kompakt-01': 'Sunucu kararı', 'baslik-kompakt-02': 'Öğrenci listesi', 'baslik-03': 'Bugünkü dersler', 'baslik-04': 'Yoklama, BİL 301', 'baslik-05': 'Giriş', rakam: String(cnt('var')), 'kod-01': '--accent-fill', 'kod-02': '0412230017' };
const MONO = new Set(['kod', 'numara', 'kod-01', 'kod-02']);
const tsRows = (list, samples, unit, inkFigure) => list.map(s => {
  const fam = MONO.has(s.name) ? 'var(--font-mono)' : 'var(--font-sans)';
  const ink = s.name === 'rakam' && inkFigure ? ';color:var(--text-figure)' : '';
  return '<div class="ts-row"><p class="ts-meta"><b>' + s.name + '</b>' + s.size + '/' + s.line + ' ' + unit + ' · ' + s.weight + ' · ' + String(s.tracking).replace('.', ',') + (MONO.has(s.name) ? ' · Mono' : '') + '</p>' +
    '<div class="ts-sample"><p style="font:' + s.weight + ' ' + s.size + 'px/' + s.line + 'px ' + fam + ';letter-spacing:' + s.tracking + 'px' + ink + '">' + esc(samples[s.name] || s.use) + '</p><span class="ts-use">' + esc(s.use) + '</span></div></div>';
}).join('');

const CASES = [
  ['upper-tr', "toLocaleUpperCase('tr-TR')", 'istanbul ılık ığdır', 'Türkçe kural: i büyürken İ, ı büyürken I olur.'],
  ['upper', 'toUpperCase()', 'istanbul ılık ığdır', 'Yerelsiz: İstanbul\'un İ\'si noktasını yitirir.'],
  ['lower-tr', "toLocaleLowerCase('tr-TR')", 'IŞIK', 'Türkçe kural: I küçülürken ı olur.'],
  ['lower', 'toLowerCase()', 'IŞIK', 'Yerelsiz: ışık yerine işik çıkar; eşleştirme de bozulur.']
];

function tipografi() {
  return section('tipografi', 'Tek aile: IBM Plex Sans. Kodlar ve öğrenci numarası IBM Plex Mono. Küçük boyda Carbon\'un Plex için ayarladığı harf aralığı, büyük rakamda sıkı aralık. Büyük harf dönüşümü yok.',
    '<div class="type-hero"><div class="plate"><p class="plate-cap"><b>IBM Plex Sans</b><span>SIL OFL 1.1 · IBM</span></p><div class="plate-body"><p class="glyph">Ağ</p><p class="body" style="margin-top:16px">' + esc(T.type.version) + '. Ağırlıklar 400, 500, 600; 700 yalnız Kalın Metin ayarında.</p><p class="body" style="margin-top:8px">Neden Plex: rakamları varsayılan olarak eşit genişlikli, I ile l ayrışık, keskin uçları bu tasarımın çizgisine uyuyor ve Carbon küçük boylar için harf aralığını Plex\'e göre ayarlamış (R06-F14, R06-F21). Bedeli biraz küçük x yüksekliği (0,516; Inter 0,546): telefonda gövde 16 pt, anahtar rakam 40 pt ile karşılandı.</p></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Türkçe harf takımı</b><span>latin + latin-ext</span></p><div class="plate-body"><p class="charset">A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z<br>a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z<br>0 1 2 3 4 5 6 7 8 9 % , : · ( )</p><p class="pangram">Pijamalı hasta yağız şoföre çabucak güvendi.</p><p class="charset mono" style="margin-top:16px">IBM Plex Mono 0412230017 · 246 810</p></div></div></div>' +
    sub('Türkçe büyük ve küçük harf', 'canlı, sayfanın betiğiyle hesaplanır', '<div class="case">' + CASES.map(([k, fn, src, why]) => '<div class="case-row ' + (k.endsWith('-tr') ? 'ok' : 'no') + '"><p class="case-fn"><code>' + esc(fn) + '</code></p><p class="case-src">' + esc(src) + '</p><p class="case-out" data-case="' + k + '" data-src="' + esc(src) + '">' + esc(src) + '</p><p class="case-why">' + (k.endsWith('-tr') ? I('check', 16) : I('close', 16)) + '<span>' + why + '</span></p></div>').join('') + '</div>' +
      '<p class="help" style="margin-top:12px">Sağdaki sonuçlar bu sayfanın betiği tarayıcıda çalıştırınca yazılır, elle yazılmadı. Webde lang="tr" zorunlu; sunucu adları da Türkçe kuralla eşleştirir (' + doc(PLAN, 'kararlar', 'plan.html#kararlar') + ').</p>') +
    sub('f ile i bağı kapalı', 'R06-F06', '<div class="liga"><div><p class="lbl st-danger">' + I('close', 16) + 'Bağ açık (Plex varsayılanı)</p><p class="w on">fiyat · fikir · fıstık</p></div><div><p class="lbl st-var">' + I('check', 16) + 'Bağ kapalı (bu tasarım)</p><p class="w">fiyat · fikir · fıstık</p></div></div>' +
      '<p class="body" style="margin-top:12px">Plex Sans\'ın liga özelliğinde fi bağı var, Türkçe dil sistemi yok; bağ Türkçe metinde de açılır ve f\'nin kolu i\'ye bitişir. Türkçe dizgi bu bağı kullanmaz: f ve i ayrı çizilince "fi" ile "fı" aynı ritimde, karıştırılmadan okunur. Panelde font-variant-ligatures: no-common-ligatures; telefonda fontTools alt kümesinde liga özelliği çıkarılır.</p>') +
    sub('Telefon ölçeği', 'pt · letterSpacing pt', '<div class="ts">' + tsRows(T.type.phone, PHONE_SAMPLE, 'pt', false) + '</div>') +
    sub('Panel ölçeği', 'px · Carbon üretken seti', '<div class="ts">' + tsRows(T.type.panel, PANEL_SAMPLE, 'px', true) + '</div>') +
    sub('Rakam ve kod', 'eşit genişlikli rakam', '<div class="numset"><div><p class="k">Öğrenci numarası · Plex Mono</p><p class="v mono">0412230017</p></div><div><p class="k">Devam yüzdesi · tr-TR</p><p class="v num">%69,5</p></div><div><p class="k">Kalan süre</p><p class="v num">11:42</p></div><div><p class="k">E-posta kodu · Plex Mono</p><p class="v mono">246 810</p></div><div><p class="k">Tablo tarihi</p><p class="v num">06.10.2026</p></div><div><p class="k">Metin tarihi</p><p class="v">6 Ekim 2026 Salı</p></div></div>') +
    sub('Kurallar', '', '<ol class="rules-list">' + T.type.rules.map(r => '<li><p>' + esc(r) + '</p></li>').join('') + '</ol>'));
}
tipografi.title = 'Tipografi';
module.exports = tipografi;

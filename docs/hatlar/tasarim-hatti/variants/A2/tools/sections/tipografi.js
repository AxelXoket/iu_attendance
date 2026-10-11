// Section 'Tipografi' (#tipografi): IBM Plex Sans and Mono, Turkish casing computed live, the ligature rule, the phone
// and panel type scales, figures and codes, and the rules that appear nowhere else. Sizes come from tokens.json; the
// build checks every style against the line-height rule below and warns on a style that breaks it. Owner: F1b.
const { T } = require('../lib/inputs');
const { esc, doc, PLAN } = require('../lib/format');
const { I } = require('../lib/icons');
const { section, sub, ref } = require('../lib/section');
const { cnt } = require('../screens/roster');

const P = (id, name) => doc(PLAN, id, 'plan.html, ' + name);
const PHONE_SAMPLE = { rakam: '11:42', 'baslik-1': 'Bugün', 'baslik-2': 'Sorun bildir', 'baslik-3': 'Veri Yapıları', govde: 'Pencere ders saatinde kendiliğinden açılır; süre dolunca düğme kapanır.', 'satir-baslik': 'Sunucuya ulaştı', dugme: 'Yoklamamı ver', 'govde-kucuk': 'Bu kodu yalnız uygulamaya ya da panele gir.', etiket: 'Belgeli düzeltme', mini: 'Kayıtlar · 10:03', kod: '246 810', numara: '0412230017' };
const PANEL_SAMPLE = { etiket: 'Belgeli düzeltme', 'etiket-01': 'Son değişiklik 6 Ekim 2026 Salı, 14:05', 'govde-kompakt-01': 'Can Şahin · İkinci profil', dugme: 'Excel olarak indir', 'govde-01': 'Değişiklikler uygulanmadan önce gösterilir.', 'govde-02': 'İnternetsiz telefonlar bunu bilemez; o telefonlardaki kayıtlar beklemede kalır.', 'baslik-kompakt-01': 'Sunucu kararı', 'baslik-kompakt-02': 'Öğrenci listesi', 'baslik-03': 'Bugünkü dersler', 'baslik-04': 'Yoklama, BİL 301', 'baslik-05': 'Giriş', rakam: String(cnt('var')), 'kod-01': '--accent-fill', 'kod-02': '0412230017', 'kod-03': '482 913' };
const MONO = new Set(['kod', 'numara', 'kod-01', 'kod-02', 'kod-03']);
// Line-height rule (tokens.json type.rules, the second rule): at least 1.25 for text that can wrap; at least 1.2 for the one-line labels (the etiket
// styles) and the key figure (rakam).
const oneLine = s => s.name === 'rakam' || /^etiket/.test(s.name);
const RULE = { text: 1.25, oneLine: 1.2 };
const breaks = list => list.filter(s => s.line / s.size < (oneLine(s) ? RULE.oneLine : RULE.text) - 1e-9);
for (const [where, list] of [['telefon', T.type.phone], ['panel', T.type.panel]]) for (const s of breaks(list)) console.warn('warning: tipografi: ' + where + ' ' + s.name + ' ' + s.size + '/' + s.line + ' satır oranı kuralının altında (' + (s.line / s.size).toFixed(3) + ')');
const num = x => String(x).replace('.', ',');
const tsRows = (list, samples, unit, inkFigure) => list.map(s => {
  const fam = MONO.has(s.name) ? 'var(--font-mono)' : 'var(--font-sans)';
  const ink = s.name === 'rakam' && inkFigure ? ';color:var(--text-figure)' : '';
  return '<div class="ts-row"><p class="ts-meta"><b>' + s.name + '</b>' + s.size + '/' + s.line + ' ' + unit + ' · ' + s.weight + ' · ' + num(s.tracking) + (MONO.has(s.name) ? ' · Mono' : '') + '</p>' +
    '<div class="ts-sample"><p style="font:' + s.weight + ' ' + s.size + 'px/' + s.line + 'px ' + fam + ';letter-spacing:' + s.tracking + 'px' + ink + '">' + esc(samples[s.name] || s.use) + '</p><span class="ts-use">' + esc(s.use) + '</span></div></div>';
}).join('');

// Bold Text (decisions-r2 E4): one row per family and base weight, read from type.boldText; the styles column lists the
// phone and panel styles at that weight, so the table is the mapping every style's $extensions boldText carries.
const famOf = s => (s.family === 'mono' ? 'mono' : 'sans');
function boldTable() {
  const rows = [];
  for (const [fam, map] of Object.entries(T.type.boldText)) for (const [from, to] of Object.entries(map)) {
    const styles = [['telefon', T.type.phone], ['panel', T.type.panel]].map(([w, list]) => { const n = list.filter(x => famOf(x) === fam && String(x.weight) === from).map(x => x.name); return n.length ? w + ': ' + n.join(', ') : ''; }).filter(Boolean).join(' · ');
    rows.push('<tr><td>' + (fam === 'mono' ? 'Plex Mono' : 'Plex Sans') + '</td><td class="r mono">' + from + '</td><td class="r mono">' + to + '</td><td>' + (styles || 'kullanılmıyor') + '</td></tr>');
  }
  return '<div class="scroll-x"><table class="tbl-doc compact bold-tbl"><thead><tr><th>Aile</th><th class="r">Ağırlık</th><th class="r">Kalın Metin açıkken</th><th>Bu ağırlıktaki stiller</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
}
const weightsOf = () => [...new Set([...T.type.phone, ...T.type.panel].map(x => x.weight))].sort((a, b) => a - b);
const boldOnly = () => [...new Set(Object.values(T.type.boldText).flatMap(m => Object.values(m)))].filter(w => !weightsOf().includes(w)).sort((a, b) => a - b);
const and = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1] : a.join(''));
const sizeOf = (list, name) => (list.find(x => x.name === name) || {}).size;

const CASES = [
  ['upper-tr', "toLocaleUpperCase('tr-TR')", 'istanbul ılık ığdır', 'Türkçe kural: i büyürken İ, ı büyürken I olur.'],
  ['upper', 'toUpperCase()', 'istanbul ılık ığdır', 'Yerelsiz: İstanbul\'un İ\'si noktasını yitirir.'],
  ['lower-tr', "toLocaleLowerCase('tr-TR')", 'IŞIK', 'Türkçe kural: I küçülürken ı olur.'],
  ['lower', 'toLowerCase()', 'IŞIK', 'Yerelsiz: ışık yerine işik çıkar; eşleştirme de bozulur.']
];
function tipografi() {
  return section('tipografi', 'Tek aile: IBM Plex (Sans, kodlarda Mono). Küçük boyda Carbon\'un Plex için ayarladığı harf aralığı, büyük rakamda sıkı aralık.',
    '<div class="type-hero"><div class="plate"><p class="plate-cap"><b>IBM Plex Sans</b><span>SIL OFL 1.1 · IBM</span></p><div class="plate-body"><p class="glyph">Ağ</p><p class="body" style="margin-top:16px">' + esc(T.type.version) + '. Ağırlıklar ' + and(weightsOf()) + '; ' + and(boldOnly()) + ' yalnız Kalın Metin ayarında (<a href="#tipografi-kalin">Kalın Metin eşlemesi</a>). Dosyalar ve paketler: ' + ref('kutuphaneler', 'Kütüphaneler') + '.</p><p class="body" style="margin-top:8px">Neden Plex: rakamları varsayılan olarak eşit genişlikli, I ile l ayrışık, keskin uçları bu tasarımın çizgisine uyuyor ve Carbon küçük boylar için harf aralığını Plex\'e göre ayarlamış (R06-F14, R06-F21). Bedeli biraz küçük x yüksekliği (0,516): telefonda gövde ' + sizeOf(T.type.phone, 'govde') + ' dp, anahtar rakam ' + sizeOf(T.type.phone, 'rakam') + ' dp ile karşılandı.</p></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Türkçe harf takımı</b><span>latin + latin-ext</span></p><div class="plate-body"><p class="charset">A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z<br>a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z<br>0 1 2 3 4 5 6 7 8 9 % , : · ( )</p><p class="pangram">Pijamalı hasta yağız şoföre çabucak güvendi.</p><p class="charset mono" style="margin-top:16px">IBM Plex Mono 0412230017 · 246 810</p></div></div></div>' +
    sub('Türkçe büyük ve küçük harf', 'canlı, sayfanın betiğiyle hesaplanır', '<div class="case">' + CASES.map(([k, fn, src, why]) => '<div class="case-row ' + (k.endsWith('-tr') ? 'ok' : 'no') + '"><p class="case-fn"><code>' + esc(fn) + '</code></p><p class="case-src">' + esc(src) + '</p><p class="case-out" data-case="' + k + '" data-src="' + esc(src) + '">' + esc(src) + '</p><p class="case-why">' + (k.endsWith('-tr') ? I('check', 16) : I('close', 16)) + '<span>' + why + '</span></p></div>').join('') + '</div>' +
      '<p class="help" style="margin-top:12px">Sonuç sütununu sayfanın betiği tarayıcıda hesaplar. Sunucu adları da Türkçe kuralla eşleştirir (' + P('kararlar', 'Kararlar, Öğrenci kaydı') + ').</p>') +
    sub('f ile i bağı kapalı', 'R06-F06', '<div class="liga"><div><p class="lbl st-danger">' + I('close', 16) + 'Bağ açık (Plex varsayılanı)</p><p class="w on">fiyat · fikir · fıstık</p></div><div><p class="lbl st-var">' + I('check', 16) + 'Bağ kapalı (bu tasarım)</p><p class="w">fiyat · fikir · fıstık</p></div></div>' +
      '<p class="body" style="margin-top:12px">Plex Sans\'ın liga özelliğinde fi bağı var, Türkçe dil sistemi yok; bağ Türkçe metinde de açılır ve f\'nin kolu i\'ye bitişir. Türkçe dizgi bu bağı kullanmaz: f ve i ayrı çizilince "fi" ile "fı" aynı ritimde, karıştırılmadan okunur. Panelde font-variant-ligatures: no-common-ligatures; telefonda fontTools alt kümesinde liga özelliği çıkarılır.</p>') +
    '<div class="ts-two">' + sub('Telefon ölçeği', 'dp · letterSpacing dp', '<div class="ts">' + tsRows(T.type.phone, PHONE_SAMPLE, 'dp', false) + '</div>') +
    sub('Panel ölçeği', 'px · Carbon iş seti (productive)', '<div class="ts">' + tsRows(T.type.panel, PANEL_SAMPLE, 'px', true) + '</div>') + '</div>' +
    sub('Kalın Metin', 'her yazı stilinin $extensions boldText değeri', '<p class="body" style="margin-bottom:16px">Telefonun Kalın Metin ayarı açıkken (iOS; Android bu ayarı React Native\'e vermez) her yazı stili ağırlığını bu eşlemeyle değiştirir; token dosyasında her stil bu değeri <code>$extensions</code> içinde <code>boldText</code> olarak taşır. Ayarın okunuşu: ' + ref('erisilebilirlik', 'Erişilebilirlik') + ', ayarlar.</p>' + boldTable(), 'tipografi-kalin') +
    sub('Rakam ve kod', 'eşit genişlikli rakam', '<div class="numset"><div><p class="k">Öğrenci numarası · Plex Mono</p><p class="v mono">0412230017</p></div><div><p class="k">Devam yüzdesi · tr-TR</p><p class="v num">%69,5</p></div><div><p class="k">Kalan süre</p><p class="v num">11:42</p></div><div><p class="k">E-posta kodu · Plex Mono</p><p class="v mono">246 810</p></div><div><p class="k">Tablo tarihi</p><p class="v num">06.10.2026</p></div><div><p class="k">Metin tarihi</p><p class="v">6 Ekim 2026 Salı</p></div></div>' +
      '<p class="help" style="margin-top:12px">Plex Sans rakamları varsayılan olarak eşit genişlikli; tablolarda ayrıca font-variant-numeric: tabular-nums. Yüzde Türkçe biçimde, işaret önde; yuvarlama kuralı: ' + P('devam', 'Devamsızlık hesabı') + '.</p>') +
    sub('Kurallar', '', '<ol class="rules-list rules-2">' + T.type.rules.map(r => '<li><p>' + esc(r) + '</p></li>').join('') + '</ol>'));
}
tipografi.title = 'Tipografi';
module.exports = tipografi;

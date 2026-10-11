// Section 'Bileşenler' (#bilesenler): buttons with their state table, fields, the e-mail code, selection controls and
// tabs, all live; under each demo its anatomy (tools/lib/anatomy.js, from the component tokens), closed. Components
// that live on the drawn screens (stamp, table status, record tag, receipt, success mark, table row) get their anatomy
// here with a link to where they are shown. Demo labels are plan features only. Owner: F1a.
const { T, rd, componentSize } = require('../lib/inputs');
const { esc, doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { busyButton } = require('../lib/controls');
const { section, sub, ref } = require('../lib/section');
const { rich } = require('../lib/refs');
// The step of the spacing scale that is the grid's base (space.base in the token file), named in the lead.
const BASE = 'space.' + T.space.scale.indexOf(T.space.base);
if (BASE === 'space.-1') throw new Error('bilesenler: space.base is not a step of space.scale');
const { blocks } = require('../lib/anatomy');

const STATES = [['varsayılan', ''], ['hover', 'hover'], ['basılı', 'pressed'], ['odak', 'focus'], ['devre dışı', 'disabled'], ['yükleniyor', 'busy']];
// Variant, name, label, busy label (null: no loading state, as on a ghost cancel).
const VARIANTS = [['primary', 'Birincil', 'Kodu gönder', 'Gönderiliyor'], ['secondary', 'İkincil', 'Düzeltme ekle', 'Kaydediliyor'], ['ghost', 'Hayalet', 'Vazgeç', null], ['danger', 'Tehlike', 'Hesabımı sil', 'Siliniyor']];
function btnCell(v, st, label, busy, th) {
  if (st === 'busy' && !busy) return '<td data-th="' + th + '"></td>';
  const attrs = st === 'disabled' ? ' disabled' : st && st !== 'busy' ? ' data-state="' + st + '" tabindex="-1"' : st === 'busy' ? ' tabindex="-1"' : '';
  const b = busy ? busyButton(v, label, busy, { attrs, state: st === 'busy' ? 'wait' : '' }) : '<button class="btn btn-' + v + '" type="button"' + attrs + '><span class="btn-label">' + label + '</span></button>';
  return '<td data-th="' + th + '">' + b + '</td>';
}
// The help line under Devamdan muaf is the plan's sentence, word for word (plan.html#devam, Md.20/5).
const MUAF_HELP = "Devam şartı FF, DC ya da DD yüzünden tekrarlanan derste yok (hoca işaretler); FD (devamsız başarısız, Md.21) ile tekrarda, iki kez kalınan klinik uygulamalı derste ve Md.28/4 kapsamındaki (AGNO'sunu yükseltmek için sınırsız sınav hakkı verilen) son dönem öğrencisinin uygulamalı, uygulaması olan ya da daha önce almadığı derslerinde var.";
function printView() {
  const letters = T.color.attendance.map(a => a.letter + ' ' + a.label).join(', ');
  const rows = [['1306230045', 'Ayşe Demir', 'V', 'V', 'V'], ['1306230112', 'Mehmet Kaya', 'V', 'Y', 'G'], ['1306230207', 'Zeynep Çelik', 'E', 'V', 'Y']];
  return '<div class="g2"><ol class="rules-list">' + [
    'Raporun ve AKSİS özetinin baskı görünümü planın kararıdır (' + doc(PLAN, 'hoca', 'plan.html, Hoca ve yönetici') + '); görünüşü şöyle: üst bilgi tek satır, ders solda, tarih aralığı ve "geçici" sağda.',
    'Kâğıtta yazı ' + rich('{text.primary}', 'name') + '; renkli zemin, gölge ve gece mavisi yoktur. Yoğun tablodaki gül zemin baskıda kalkar.',
    'Son durum harfle yazılır; harflerin açıklaması tablonun altında (' + doc(PLAN, 'gun-son-durumlar', 'plan.html, Son durumlar') + ').',
    rich('Yazı panelin ölçeğinden: gövde {type.panel.govde-01}, başlık {type.panel.baslik-kompakt-01}. Tablo başlığı her sayfada yinelenir; satır çizgisi {line.ince}, {border.subtle}.', 'name'),
    'Gezinme, düğme, süzgeç ve sekmeler baskıda gizlenir (@media print).'
  ].map(x => '<li><p>' + x + '</p></li>').join('') + '</ol>' +
    '<div class="paper" role="img" aria-label="Baskı görünümü örneği: BİL 301 Veri Yapıları, üç öğrenci, son durumlar harfle"><p class="paper-h"><b>BİL 301 Veri Yapıları · Teori</b><span>22 Eylül ile 6 Ekim 2026 · geçici</span></p><table><thead><tr><th>Öğrenci no</th><th>Ad soyad</th><th>22 Eyl</th><th>29 Eyl</th><th>6 Eki</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>').join('') + '</tbody></table><p class="paper-f">' + esc(letters) + '</p></div></div>';
}
const v = p => rich('{' + p + '}', 'value');

function bilesenler() {
  // The narrow code cells start below component.code.narrowBelow: a media query cannot read a variable, so the build holds
  // src/css/system.css to the token's number.
  const nb = componentSize('code.narrowBelow');
  if (!rd('src/css/system.css').includes('@media (max-width: ' + nb + 'px) { .otp-cells')) throw new Error('bilesenler: system.css must start the narrow code cells at component.code.narrowBelow (' + nb + ' px)');
  return section('bilesenler', 'Hepsi canlı; süreleri, eğrileri ve hover, basma ve odak kuralları ' + ref('etkilesim', 'Etkileşim tablosu') + ' ve ' + ref('hareket', 'Hareket') + ' bölümünde. Panel bileşenleri tarayıcının kendi öğeleri üzerine kurulur (' + doc(TEK, 'panel-cati', 'teknik.html, Web paneli, Çatı') + '). Her örneğin altındaki kapalı satır bileşenin anatomisidir: ölçüler token dosyasındaki <code>component.*</code> tasarım değişkenleridir (telefonda dp, panelde px) ve bu sayfanın örnekleri aynı değişkenlerle çizilir. ' + rich('Boyut ve boşluklar {' + BASE + '} adımının katlarıdır; çizgiler ve kontrollerin içindeki küçük işaretler bunun dışındadır.', 'name'),
    sub('Düğmeler', 'panel ' + v('component.button.height.panel') + ' · telefon ' + v('component.button.height.phone') + ' · küçük ' + v('component.button.height.small'), '<div class="plate"><p class="plate-cap"><b>Durum tablosu</b><span>durumlar sabitlendi, tıklanamaz</span></p><div class="plate-body scroll-x"><table class="state-table"><thead><tr><th></th>' + STATES.map(s => '<th>' + s[0] + '</th>').join('') + '</tr></thead><tbody>' +
      VARIANTS.map(([vv, n, l, b]) => '<tr><td>' + n + '</td>' + STATES.map(s => btnCell(vv, s[1], l, b, s[0])).join('') + '</tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="plate" style="margin-top:24px"><p class="plate-cap"><b>Canlı</b><span>işaretçiyle gel, bas, Tab ile odaklan</span></p><div class="plate-body"><div class="live-row">' +
      busyButton('primary', 'Kodu gönder', 'Gönderiliyor', { attrs: ' id="b-primary" data-busy' }) +
      '<button class="btn btn-secondary" type="button" id="b-secondary">' + I('edit_note', 20) + '<span class="btn-label">Düzeltme ekle</span></button>' +
      '<button class="btn btn-ghost" type="button" id="b-ghost">Vazgeç</button>' +
      '<button class="btn btn-danger" type="button" id="b-danger" data-dialog="dlg-del">Hesabımı sil</button>' +
      '<span class="tip-wrap"><button class="btn btn-secondary btn-icon" type="button" aria-labelledby="tip-print" id="b-print">' + I('print', 20) + '</button><span class="tip" role="tooltip" id="tip-print">Yazdır</span></span>' +
      '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-primary btn-lg" type="button" id="b-lg">' + I('check', 24) + 'Yoklamamı ver</button><button class="btn btn-secondary btn-sm" type="button" id="b-sm">Küçük</button></div>' +
      '<p class="help" style="margin-top:16px">' + rich('Birincil düğmedeki örnek iş {time.gosterge} süresinden uzun sürer: o süre boyunca düğme yalnız meşguldür, sonra üç kare ve "Gönderiliyor" belirir; düğmenin genişliği değişmez. Yazdır düğmesinde işaretçi ya da odak {time.ipucu} durunca ipucu açılır. ') + '"Hesabımı sil" diyaloğu açar (' + doc(PLAN, 'kararlar-hesap-silme', 'plan.html, Hesap silme') + ').</p></div></div>' +
      blocks('button', 'spinner', 'tooltip')) +
    sub('Metin alanı', 'dış çizgili · içi beyaz', '<div class="g3">' +
      '<div class="field"><label class="lbl" for="f1">E-posta</label><input class="input" id="f1" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ad.soyad@istanbul.edu.tr"><p class="help">Yalnız @istanbul.edu.tr adresi.</p></div>' +
      '<div class="field"><label class="lbl" for="f2">E-posta · hata</label><input class="input" id="f2" type="email" value="ad.soyad@gmail.com" aria-invalid="true" aria-describedby="f2-m"><p class="msg err" id="f2-m">' + I('error', 16) + '<span>Adres @istanbul.edu.tr ile bitmeli.</span></p></div>' +
      '<div class="field"><label class="lbl" for="f3">Belge numarası · devre dışı</label><input class="input" id="f3" type="text" value="2026/114" disabled><p class="help">Yalnız Görevli ve Belgeli düzeltmede zorunlu.</p></div>' +
      '<div class="field"><p class="lbl">Sabit hover</p><input class="input" type="text" value="Veri Yapıları" data-state="hover" tabindex="-1" aria-label="Sabit hover örneği"></div>' +
      '<div class="field"><p class="lbl">Sabit odak</p><input class="input" type="text" value="BİL 301" data-state="focus" tabindex="-1" aria-label="Sabit odak örneği"></div>' +
      '<div class="field"><label class="lbl" for="f6">Saat sayısı</label><input class="input num" id="f6" type="text" inputmode="numeric" pattern="[0-9]*" value="2"><p class="help">Blok derste saat sayısı seçilir.</p></div>' +
      '</div>' + blocks('input')) +
    sub('E-posta kodu', 'tek alan · altı kutu', '<div class="g2"><div class="otp" data-otp><label class="lbl" for="otp-in">E-postana gelen 6 haneli kod</label><div class="otp-box"><input class="otp-in" id="otp-in" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="otp-help otp-msg"><div class="otp-cells" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div></div><p class="help" id="otp-help">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p><p class="msg" id="otp-msg" role="status"></p></div>' +
      '<div><p class="body">Kod tek alana yazılır; altı kutu alanın arkasına çizilir, sıradaki kutunun altında ' + rich('{accent.mark}', 'name') + ' çizgi durur. Yapıştırma ve otomatik doldurma açık kalır (' + doc(PLAN, 'hoca', 'plan.html, Hoca ve yönetici, Erişilebilirlik') + '). Altı rakam tamamlanınca kod denetlenir; denetim ' + rich('{time.gosterge}', 'value') + ' içinde biterse gösterge çıkmaz.</p><p class="body">Denemek için <code>246810</code> yaz; başka bir kod hata durumunu gösterir.</p></div></div>' + blocks('code')) +
    sub('Seçim', 'onay kutusu · anahtar · liste satırı', '<div class="g3">' +
      '<div class="plate"><p class="plate-cap"><b>Onay kutusu</b><span>panel ' + v('component.checkbox.box.panel') + '</span></p><div class="plate-body" style="display:grid;gap:16px"><label class="cb"><input type="checkbox">İkinci profil göster</label><label class="cb"><input type="checkbox" checked>Yalnız İncelemede</label><label class="cb"><input type="checkbox" data-ind>Bütün satırlar</label><label class="cb cb-off"><input type="checkbox" disabled>Yalnız Kendi beyanı</label></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Anahtar</b><span>' + v('component.switch.width') + ' x ' + v('component.switch.height') + '</span></p><div class="plate-body"><div class="set-row"><div><p class="t" id="sw1-l">Devamdan muaf</p><p class="help" id="sw1-h">' + esc(MUAF_HELP) + '</p></div><button class="sw" type="button" role="switch" aria-checked="true" aria-labelledby="sw1-l" aria-describedby="sw1-h"><span class="sw-thumb"></span></button></div>' +
      '<div class="set-row"><div><p class="t" id="sw2-l">Yalnız İncelemede göster</p><p class="help" id="sw2-h">Onay listesinde yalnız İncelemede kalan kayıtlar görünür.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw2-l" aria-describedby="sw2-h"><span class="sw-thumb"></span></button></div>' +
      '<div class="set-row"><div><p class="t t-off" id="sw3-l">Yalnız Kendi beyanı göster</p><p class="help" id="sw3-h">Bu derste süre seçildi; Kendi beyanı kaydı olmaz.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw3-l" aria-describedby="sw3-h" disabled><span class="sw-thumb"></span></button></div>' +
      '<p class="help" style="margin-top:12px">Devamdan muaf satırının yardım metni planın cümlesidir (' + doc(PLAN, 'devam', 'plan.html, Devamsızlık') + ').</p></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Liste satırı</b><span>' + v('component.row.minHeight.twoLine') + ' dp · seçmek için dokun</span></p><div class="lrow-list" data-pick-group style="border:0">' +
      [['Veri Yapıları', 'Teori · BİL 301', 'false'], ['Ayrık Matematik', 'Teori · MAT 207', 'true'], ['Fizik II', 'Uygulama · FİZ 102', 'false']].map(([t, s, p]) => '<button class="lrow" type="button" data-pick aria-pressed="' + p + '"><span><span class="t">' + t + '</span><span class="s">' + s + '</span></span><span class="sel-ic">' + I('check', 20) + '</span></button>').join('') +
      '<button class="lrow" type="button" disabled><span><span class="t">Mantık Devreleri</span><span class="s">Dönem kapandı</span></span>' + I('chevron_right', 20) + '</button></div></div>' +
      '</div>' + blocks('checkbox', 'switch', 'row')) +
    sub('Sekmeler', rich('gösterge {dur.uzun} · içerik {dur.hizli}', 'name'), '<div class="plate"><div class="plate-body"><div class="tabs" role="tablist" aria-label="Dönem">' +
      [['Bugün', 'tp1'], ['Bu hafta', 'tp2'], ['Dönem', 'tp3'], ['Raporlar ve AKSİS özeti', 'tp4']].map(([l, id], i) => '<button type="button" role="tab" id="t-' + id + '" aria-controls="' + id + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + l + '</button>').join('') +
      '<span class="tabs-ind" aria-hidden="true"></span></div>' +
      [['tp1', 'Bugün 3 ders var. Yoklama penceresi Veri Yapıları için açık.'], ['tp2', 'Bu hafta 11 ders, 2 telafi dersi programda.'], ['tp3', 'Dönem: 14 hafta.'], ['tp4', 'Raporlar yalnız Excel olarak iner; AKSİS özeti, onay bekleyen kayıt varken geçici.']].map(([id, t], i) => '<div class="tabpanel" role="tabpanel" id="' + id + '" aria-labelledby="t-' + id + '"' + (i ? ' hidden' : '') + '><p class="body">' + t + '</p></div>').join('') +
      '<p class="help" style="margin-top:16px">Ok tuşları sekmeyi değiştirir, Home ve End uçlara gider; klavyeyle seçilen sekmede gösterge kaymaz, yeni yerinde belirir.</p></div></div>' + blocks('tab', 'tabbar')) +
    sub('Ekranlarda canlı olanlar', '8 bileşen', '<p class="body" style="margin-bottom:16px">Bu bileşenler çizilen ekranlarda canlıdır: damgalar ' + ref('durumlar', 'Durumlar') + ' bölümünde ve ' + ref('katmanlar', 'Katmanlar') + '\'daki Kayıtlar ekranında, makbuz ve başarı işareti ' + ref('ekranlar', 'Telefon ekranları') + '\'nda, tablo satırı ve kayıt etiketi ' + ref('panel', 'Panel') + ' ekranında.</p>' +
      blocks('stamp', 'chip', 'tag', 'meter', 'receipt', 'success', 'scanframe', 'tablerow')));
}
bilesenler.title = 'Bileşenler';
bilesenler.MUAF_HELP = MUAF_HELP;
// The print view is a panel view: Panel ekranı draws it (Baskı görünümü).
bilesenler.printView = printView;
module.exports = bilesenler;

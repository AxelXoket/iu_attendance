// Section 'Bileşenler' (#bilesenler): buttons with their state table, fields, the e-mail code, selection controls and
// tabs, all live. Owner: F1a.
const { durOf, doc, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { spinSvg } = require('../lib/controls');
const { section, sub } = require('../lib/section');

const btnStates = [['varsayılan', ''], ['hover', 'hover'], ['basılı', 'pressed'], ['odak', 'focus'], ['devre dışı', 'disabled'], ['yükleniyor', 'busy']];
const btnCell = (v, st, label) => {
  const attr = st === 'disabled' ? ' disabled' : st === 'busy' ? ' aria-busy="true"' : st ? ' data-state="' + st + '" tabindex="-1"' : '';
  return '<td><button class="btn btn-' + v + '" type="button"' + attr + '>' + spinSvg + '<span class="btn-label">' + (st === 'busy' ? 'Gönderiliyor' : label) + '</span></button></td>';
};

function bilesenler() {
  return section('bilesenler', 'Hepsi canlı. Hover yalnız imleçli cihazda, basma :active ile, odak :focus-visible ile. Panel bileşenleri tarayıcının kendi öğeleri üzerine kurulur (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + ').',
    sub('Düğmeler', 'panel 40 · telefon 48 · küçük 32', '<div class="plate"><p class="plate-cap"><b>Durum tablosu</b><span>durumlar sabitlendi, tıklanamaz</span></p><div class="plate-body scroll-x"><table class="state-table"><thead><tr><th></th>' + btnStates.map(s => '<th>' + s[0] + '</th>').join('') + '</tr></thead><tbody>' +
      [['primary', 'Birincil', 'Kodu gönder'], ['secondary', 'İkincil', 'Düzeltme ekle'], ['ghost', 'Hayalet', 'Vazgeç'], ['danger', 'Tehlike', 'Kaydı sil']].map(([v, n, l]) => '<tr><td>' + n + '</td>' + btnStates.map(s => btnCell(v, s[1], l)).join('') + '</tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="plate" style="margin-top:24px"><p class="plate-cap"><b>Canlı</b><span>imleçle gel, bas, Tab ile odaklan</span></p><div class="plate-body"><div class="live-row">' +
      '<button class="btn btn-primary" type="button" id="b-primary" data-busy="Gönderiliyor">' + spinSvg + '<span class="btn-label">Kodu gönder</span></button>' +
      '<button class="btn btn-secondary" type="button" id="b-secondary">' + I('edit_note', 20) + '<span class="btn-label">Düzeltme ekle</span></button>' +
      '<button class="btn btn-ghost" type="button" id="b-ghost">Vazgeç</button>' +
      '<button class="btn btn-danger" type="button" id="b-danger" data-dialog="dlg-close">Yoklamayı kapat</button>' +
      '<button class="btn btn-secondary btn-icon" type="button" aria-label="Yazdır">' + I('print', 20) + '</button>' +
      '</div><div class="live-row" style="margin-top:16px"><button class="btn btn-primary btn-lg" type="button">' + I('check', 24) + 'Yoklamamı ver</button><button class="btn btn-secondary btn-sm" type="button">Küçük</button></div>' +
      '<p class="help" style="margin-top:16px">Hover rengi girişte ' + durOf('hover') + ' ms, çıkışta ' + durOf('mikro') + ' ms. Basma 0,97 ölçek, ' + durOf('mikro') + ' ms; hareket azaltmada ölçek yok, yalnız renk. Odak halkası geçişsiz. Birincil düğmeye basınca 1,8 sn yükleniyor durumu gösterilir: genişlik korunur, kare iz 1200 ms döner, yazı değişir.</p></div></div>') +
    sub('Metin alanı', 'dış çizgili · içi beyaz', '<div class="g3">' +
      '<div class="field"><label class="lbl" for="f1">E-posta</label><input class="input" id="f1" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ad.soyad@istanbul.edu.tr"><p class="help">Yalnız @istanbul.edu.tr adresi.</p></div>' +
      '<div class="field"><label class="lbl" for="f2">E-posta · hata</label><input class="input" id="f2" type="email" value="ad.soyad@gmail.com" aria-invalid="true" aria-describedby="f2-m"><p class="msg err" id="f2-m">' + I('error', 16) + '<span>Adres @istanbul.edu.tr ile bitmeli.</span></p></div>' +
      '<div class="field"><label class="lbl" for="f3">Belge numarası · devre dışı</label><input class="input" id="f3" type="text" value="2026/114" disabled><p class="help">Yalnız Görevli ve Belgeli düzeltmede zorunlu.</p></div>' +
      '<div class="field"><p class="lbl">Sabit hover</p><input class="input" type="text" value="Veri Yapıları" data-state="hover" tabindex="-1" aria-label="Sabit hover örneği"></div>' +
      '<div class="field"><p class="lbl">Sabit odak</p><input class="input" type="text" value="BİL 301" data-state="focus" tabindex="-1" aria-label="Sabit odak örneği"></div>' +
      '<div class="field"><label class="lbl" for="f6">Saat sayısı</label><input class="input num" id="f6" type="text" inputmode="numeric" pattern="[0-9]*" value="2"><p class="help">Blok derste saat sayısı seçilir.</p></div>' +
      '</div>') +
    sub('E-posta kodu', 'tek alan · altı kutu', '<div class="g2"><div class="otp" data-otp><label class="lbl" for="otp-in">E-postana gelen 6 haneli kod</label><div class="otp-box"><input class="otp-in" id="otp-in" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="otp-help otp-msg"><div class="otp-cells" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div></div><p class="help" id="otp-help">Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.</p><p class="msg" id="otp-msg" role="status"></p></div>' +
      '<div><p class="body">Kod tek bir alana yazılır: yapıştırma ve otomatik doldurma açık (autocomplete one-time-code, inputmode numeric). Altı kutu alanın arkasına çizilir; sıradaki kutunun altında 2 px mürekkep işaret. Altı rakam tamamlanınca denetlenir.</p><p class="body">Denemek için <code>246810</code> yaz; başka bir kod hata durumunu gösterir.</p></div></div>') +
    sub('Seçim', 'onay kutusu · anahtar · liste satırı', '<div class="g3">' +
      '<div class="plate"><p class="plate-cap"><b>Onay kutusu</b><span>16 px</span></p><div class="plate-body" style="display:grid;gap:16px"><label class="cb"><input type="checkbox">İkinci profil göster</label><label class="cb"><input type="checkbox" checked>Yalnız İncelemede</label><label class="cb"><input type="checkbox" data-ind>Bütün satırlar</label><label class="cb" style="color:var(--text-disabled)"><input type="checkbox" disabled>Dönem kilitli</label></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Anahtar</b><span>40 x 24</span></p><div class="plate-body"><div class="set-row"><div><p class="t" id="sw1-l">Devamdan muaf</p><p class="help" id="sw1-h">Muaf öğrenciye hak uyarısı gitmez.</p></div><button class="sw" type="button" role="switch" aria-checked="true" aria-labelledby="sw1-l" aria-describedby="sw1-h"><span class="sw-thumb"></span></button></div>' +
      '<div class="set-row"><div><p class="t" id="sw2-l">Bildirimler</p><p class="help">Gönderilmemiş kayda günde bir hatırlatma.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw2-l"><span class="sw-thumb"></span></button></div>' +
      '<div class="set-row"><div><p class="t" id="sw3-l" style="color:var(--text-disabled)">Dönem sonu kilidi</p><p class="help">Yalnız yönetici.</p></div><button class="sw" type="button" role="switch" aria-checked="false" aria-labelledby="sw3-l" disabled><span class="sw-thumb"></span></button></div></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Liste satırı</b><span>64 dp · seçmek için dokun</span></p><div class="lrow-list" data-pick-group style="border:0">' +
      [['Veri Yapıları', 'Teori · BİL 301', 'false'], ['Ayrık Matematik', 'Teori · MAT 207', 'true'], ['Fizik II', 'Uygulama · FİZ 102', 'false']].map(([t, s, p]) => '<button class="lrow" type="button" data-pick aria-pressed="' + p + '"><span><span class="t">' + t + '</span><span class="s">' + s + '</span></span><span class="sel-ic">' + I('check', 20) + '</span></button>').join('') +
      '<button class="lrow" type="button" disabled><span><span class="t">Algoritmalar</span><span class="s">Dönem kapandı</span></span>' + I('chevron_right', 20) + '</button></div></div>' +
      '</div>') +
    sub('Sekmeler', 'gösterge ' + durOf('uzun') + ' ms · içerik ' + durOf('hizli') + ' ms', '<div class="plate"><div class="plate-body"><div class="tabs" role="tablist" aria-label="Dönem">' +
      [['Bugün', 'tp1'], ['Bu hafta', 'tp2'], ['Dönem', 'tp3'], ['Raporlar ve AKSİS özeti', 'tp4']].map(([l, id], i) => '<button type="button" role="tab" id="t-' + id + '" aria-controls="' + id + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + l + '</button>').join('') +
      '<span class="tabs-ind" aria-hidden="true"></span></div>' +
      [['tp1', 'Bugün 3 ders var. Yoklama penceresi Veri Yapıları için açık.'], ['tp2', 'Bu hafta 11 ders, 2 telafi dersi programda.'], ['tp3', 'Dönem: 14 hafta; ekle-bırak 17 Ekim\'de bitiyor.'], ['tp4', 'Raporlar yalnız Excel olarak iner; AKSİS özeti geçici.']].map(([id, t], i) => '<div class="tabpanel" role="tabpanel" id="' + id + '" aria-labelledby="t-' + id + '"' + (i ? ' hidden' : '') + '><p class="body">' + t + '</p></div>').join('') +
      '<p class="help" style="margin-top:16px">Ok tuşları sekmeyi değiştirir, Home ve End uçlara gider. Hareket azaltmada gösterge kaymaz: yeni yerinde ' + durOf('mikro') + ' ms solarak belirir.</p></div></div>'));
}
bilesenler.title = 'Bileşenler';
module.exports = bilesenler;

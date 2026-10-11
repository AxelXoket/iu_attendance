// Section 'Telefon ekranları' (#ekranlar): the student's flow (home, scan, success) and the instructor's QR screen,
// live, with the Röntgen switch and the measured share under each screen. Owner: F1b.
const { QR } = require('../lib/inputs');
const { tr, doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { ind } = require('../lib/marks');
const { statusBar, device, capFor } = require('../lib/phone');
const { covOf } = require('../lib/coverage');
const { switchRow } = require('../lib/controls');
const { section } = require('../lib/section');
const { homeScreen } = require('../screens/home');
const { qrSvg } = require('../screens/qr');

// Camera scene seen from a back row: a dark classroom, blurred ceiling lights, the projection high on the wall carrying
// only the attendance QR (the projector page shows nothing else), in perspective, and out-of-focus heads in front.
// The attendance QR is read at 2x (plan.html#asama23-okutma), so the scene opens zoomed; 1x shows the whole room.
// Neutral tokens and black only (0 percent midnight blue), no photo, no network.
const camScene = () => '<div class="cam" aria-hidden="true" style="transform:scale(2)"><div class="cam-room"></div><div class="cam-lights"><i></i><i></i><i></i></div><div class="cam-spill"></div>' +
  '<div class="cam-wall"><div class="cam-board"><div class="cam-qr">' + qrSvg(QR[3], ' class="qr-svg"') + '</div></div></div>' +
  '<div class="cam-heads"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="cam-vig"></div></div>';

function scanScreen() {
  return '<div class="ph dark" id="ph-scan">' + camScene() +
    '<div class="scan-ui">' + statusBar('10:03') +
    '<div class="scan-top"><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button><div class="scan-tt"><p class="t">QR\'ı okut</p><p class="s">Veri Yapıları · <span class="num" data-countdown="702" data-total="900">11:42</span> kaldı</p></div><button class="icon-btn" type="button" aria-label="Fener" aria-pressed="false" data-press>' + I('flashlight_on') + '</button></div>' +
    '<div class="scan-mid"><div class="scan-frame"><i></i><i></i><i></i><i></i></div></div>' +
    '<p class="scan-hint" role="status"><span>Tahtadaki QR\'ı çerçevenin içine al</span></p>' +
    '<div class="zoom" role="radiogroup" aria-label="Yakınlaştırma"><button type="button" role="radio" aria-checked="false" tabindex="-1" data-zoom="1">1x</button><button type="button" role="radio" aria-checked="true" data-zoom="2">2x</button></div>' +
    '<div class="scan-bot"><button class="btn btn-inv btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kodu gir</button></div>' +
    '</div></div>';
}

// Receipt timeline (graft from direction B, redrawn in this system's ink): each step brings its node, line, text and time.
const step = (cls, t, s, time) => '<li class="rs ' + cls + '"><span class="rs-m" aria-hidden="true"></span><div class="rs-x"><p class="rs-t">' + t + '</p><p class="rs-s">' + s + '</p></div><p class="rs-time num">' + time + '</p></li>';
function successScreen() {
  const on = '<ol class="rsteps" data-v="on" aria-label="Makbuz adımları">' +
    step('done lit', 'Telefonda kayıtlı', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('done lit', 'Sunucuya ulaştı', 'İnternet vardı, hemen gönderildi', '10:03:23') +
    step('done', 'Sunucu kararı', ind('var', 'Var', 'check'), '10:03:24') + '</ol>';
  const off = '<ol class="rsteps" data-v="off" data-off aria-label="Makbuz adımları">' +
    step('done', 'Telefonda kayıtlı', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('wait', 'Sunucuya ulaştı', 'İnternet yok', 'bekliyor') +
    step('wait', 'Sunucu kararı', 'Gönderimden sonra gelir', '') + '</ol>';
  return '<div class="ph" id="ph-success">' + statusBar() +
    '<div class="ok-body"><div class="ok-in">' +
    '<svg class="ok-mark" viewBox="0 0 64 64" aria-hidden="true" data-xr="7"><rect x="1" y="1" width="62" height="62" pathLength="1"></rect><path d="M17 33l10 10 20-21" pathLength="1"></path></svg>' +
    '<h4 class="ph-title ok-t">Yoklaman kaydedildi</h4><p class="ok-meta">Veri Yapıları · Teori · D-204</p>' +
    '<div class="rcpt"><p class="rcpt-h"><span>Makbuz</span><span>6 Ekim 2026 Salı</span></p><div class="swap">' + on + off + '</div></div>' +
    '<p class="ok-help swap"><span data-v="on">Makbuz Kayıtlar ekranında da durur.</span><span data-v="off" data-off>İnternet gelince kendiliğinden gönderilir. Uygulamayı kapatabilirsin.</span></p>' +
    '</div></div>' +
    '<div class="ph-actions"><button class="btn btn-primary btn-lg btn-block" type="button" data-xr="1">Tamam</button><button class="btn btn-ghost btn-lg btn-block" type="button">' + I('qr_code_2', 24) + 'Makbuz QR\'ını göster</button></div>' +
    '</div>';
}

function qrScreen() {
  return '<div class="ph" id="ph-qr">' + statusBar() +
    '<div class="qr-top"><div><p class="qr-course">BİL 301 Veri Yapıları</p><p class="qr-meta">Teori · D-204 · 10:00 ile 11:50</p></div><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button></div>' +
    '<div class="qr-plate">' + qrSvg(QR[0], ' data-qr="qr-left" role="img" aria-label="Yoklama QR kodu, 5 saniyede bir değişir"') + '</div>' +
    '<div class="qr-info"><div><p class="k">Yeni kod</p><p class="v num"><span id="qr-left">5</span> sn</p></div><div><p class="k">Yoklama</p><p class="v num">11:42 kaldı</p></div></div>' +
    '<p class="qr-note">' + I('brightness_high', 16) + 'Ekran açık tutuluyor · İnternetsiz çalışır</p>' +
    '<p class="qr-help">Okutamayan öğrenciye yedek kodu göster ya da listeden elle ekle.</p>' +
    '<div class="ph-actions two" style="margin-top:auto"><button class="btn btn-secondary btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kod</button><button class="btn btn-ghost btn-lg" type="button" data-dialog="dlg-close">Erken kapat</button></div>' +
    '</div>';
}

function ekranlar() {
  return section('ekranlar', 'Öğrencinin yoklama akışı ve hocanın QR ekranı. Telefon ekranları 360 dp için çizildi; Türkiye\'de telefonların çoğu Android (' + doc(PLAN, 'benzer', 'plan.html#benzer') + '). Ekranlar canlıdır: sayaç işler, QR beş saniyede bir değişir.',
    '<div class="ctl-plate">' + switchRow('xr-sw', 'Röntgen: yalnız gece mavisi', 'Bütün telefon ekranlarında ve panel ekranında gece mavisi olmayan her şeyi griye çeker; kalanlar kullanım haritasındaki numaralarıyla işaretlenir. Ekranların altındaki çubuk ölçülen payı ve bütçeyi gösterir.', 'data-xray') + '</div>' +
    '<div class="devices">' +
    '<div class="device-fig">' + device('scr-home', homeScreen(false)) + capFor('#scr-home', 'Bugün', 'Ö2, Ö5', 'Yoklama penceresi açık; kalan süre birincil metin renginde, tek mavi alan düğme. Hak uyarısı düzey yazısı, ikon ve cümleyle.') + '</div>' +
    '<div class="device-fig">' + device('scr-scan', scanScreen()) + capFor('#scr-scan', 'QR okut', 'Ö13', 'Kamera ana (1x) kamerayla açılır; uzaktan okutulan yoklama QR\'ında 2x yakınlaştırılır, yakından okutulan makbuz QR\'ında 1x kalır (' + doc(PLAN, 'asama23-okutma', 'plan.html#asama23-okutma') + '). Çerçeve ve yazılar beyaz, gece mavisi yok; tarama çizgisi gibi boşta hareket yok.') +
    '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-scan="ph-scan">' + I('qr_code_scanner', 20) + 'Okutmayı dene</button></div></div>' +
    '<div class="device-fig">' + device('scr-success', successScreen()) + capFor('#scr-success', 'Yoklaman kaydedildi', 'Ö3', 'Tek imza anı: kare ve onay çizilir (400 ms); makbuzun üç adımı içerikleriyle birlikte 60 ms arayla gelir. Ekran kendiliğinden kapanmaz.') +
    '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-replay>' + I('replay', 20) + 'Tekrar oynat</button><button class="btn btn-ghost btn-sm" type="button" data-receipt aria-pressed="false"><span class="btn-label">Çevrimdışı makbuz</span></button></div></div>' +
    '<div class="device-fig">' + device('scr-qr', qrScreen()) + capFor('#scr-qr', 'QR gösterme', 'H14', 'QR saf siyah ve beyaz, her yanda dört modül boşluk; beş saniyede bir animasyonsuz değişir. Ekran açık tutulur (' + doc(TEK, 'telefon-arka-plan', 'teknik.html#telefon-arka-plan') + '). Ekranda gece mavisi yok.') + '</div>' +
    '<div class="span2"><div class="plate"><p class="plate-cap"><b>Akış</b><span>öğrenci, Aşama 2</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
    '<li><p><b>Bugün.</b> Pencere İstanbul saatiyle açılır. Tek birincil eylem: Yoklamamı ver (Aşama 2\'de kamerayı açar; bağlantı belgede yazılmamış).</p></li>' +
    '<li><p><b>QR okut.</b> Kamera yerel yığın geçişiyle, 2x yakınlaştırmayla açılır. Üstte ders ve kalan süre, altta yedek kod yolu. QR yakalanınca köşeler 110 ms\'de oturur; kamera kapanır.</p></li>' +
    '<li><p><b>Kaydedildi.</b> CONFIRM titreşimi kamera kapandıktan sonra. Ekran okuyucu odağı başlığa taşınır; makbuz adımları sözcük ve saatle yazılır.</p></li>' +
    '<li><p><b>Çevrimdışı.</b> Aynı ekran; makbuzun ikinci adımı bekliyor, düğümü boş. Kırmızı yok: bu bir hata değil.</p></li></ol></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>QR kuralları</b><span>' + doc(PLAN, 'asama23', 'plan.html#asama23') + '</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
    '<li><p>Modül #000000, zemin #FFFFFF (21:1): tasarımdaki tek saf siyah ve saf beyaz, işlevsel istisna. Tema rengi almaz, ters çevrilmez.</p></li>' +
    '<li><p>Her kenarda en az 4 modül boşluk. Kenar uzunluğu en az okuma uzaklığının onda biri.</p></li>' +
    '<li><p>Beş saniyede bir anında değişir; geçiş, solma, kayma yok.</p></li>' +
    '<li><p>Ders etiketi QR\'ın dışında. Projeksiyon sayfasında da aynı kural; panelin olası koyu teması QR\'a uygulanmaz.</p></li></ol></div></div>' +
    '<div class="plate"><p class="plate-cap"><b>Bu ekranlarda gece mavisi</b><span>ölçülen pay</span></p><div class="plate-body"><ol class="rules-list rules-2">' +
    [['#scr-home', 'Bugün', 'birincil eylem, ilerleme çubuğu, alt sekme işareti; kalan süre gri mürekkep'], ['#scr-scan', 'QR okut', 'yok; kamera üstünde yalnız beyaz çizgi ve yazı'], ['#scr-success', 'Kaydedildi', 'kare ve onay işareti, Tamam, Var ve makbuzun dolu düğümleri'], ['#scr-qr', 'QR gösterme', 'yok; QR tek odak, yalnız klavye odağında halka']]
      .map(([sel, n, d]) => { const p = covOf(sel); return '<li><p><b>' + n + (p ? ' · %' + tr(p['gece mavisi'], 2) : '') + '.</b> ' + d + '</p></li>'; }).join('') +
    '</ol></div></div></div>' +
    '</div>');
}
ekranlar.title = 'Telefon ekranları';
module.exports = ekranlar;

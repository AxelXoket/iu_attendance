// Section 'Telefon ekranları' (#ekranlar): the student's flow (home, scan, success), the instructor's QR screen and the
// account deletion screen, live, with the Röntgen switch and the measured share under each screen. Owner: F1b.
const fs = require('fs'), path = require('path');
const { A, QR } = require('../lib/inputs');
const { doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { ind } = require('../lib/marks');
const { statusBar, device, capFor } = require('../lib/phone');
const { switchRow } = require('../lib/controls');
const { section, has, ref } = require('../lib/section');
const { homeScreen } = require('../screens/home');
const { qrSvg } = require('../screens/qr');

const P = (id, name) => doc(PLAN, id, 'plan.html, ' + name);
const K = (id, name) => doc(TEK, id, 'teknik.html, ' + name);
const ATT_QR = QR.filter(q => q.kind === 'yoklama');

// A link to an item inside a fragment section (Açık noktalar, Platform, Erişilebilirlik) only when that fragment is on
// the page and carries the id; otherwise nothing, so the page never holds a link without a target. The fragment folder
// is the one tools/build.js reads (its --frag-dir option included).
const FRAG_DIR = (() => { const i = process.argv.indexOf('--frag-dir'); return i < 0 ? path.join(A, '..', '..', 'doc', 'sections') : path.resolve(process.argv[i + 1]); })();
const fragCache = {};
function fragHas(sectionId, id) {
  if (!has(sectionId)) return false;
  const f = path.join(FRAG_DIR, sectionId + '.html');
  if (!(f in fragCache)) fragCache[f] = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  return fragCache[f].includes('id="' + id + '"');
}
const fragLink = (sectionId, id, text) => (fragHas(sectionId, id) ? '<a href="#' + id + '">' + text + '</a>' : '');

// Camera scene seen from a back row: a dark classroom and the projection high on the wall carrying only the attendance
// QR (the projector page shows nothing else), in perspective. The attendance QR is read at 2x (plan.html#asama23-okutma),
// so the scene is drawn zoomed. Plain dark gradients, no light blobs near the text; neutral tokens and black only
// (0 percent midnight blue), no photo, no network.
const camScene = () => '<div class="cam" aria-hidden="true"><div class="cam-room"></div>' +
  '<div class="cam-wall"><div class="cam-board"><div class="cam-qr">' + qrSvg(ATT_QR[3], ' class="qr-svg"') + '</div></div></div><div class="cam-vig"></div></div>';

// The scan screen: the status bar icons are light on the camera (expo-status-bar style 'light'); the right slot of the
// top bar stays empty so the title sits in the middle. "Okutmayı dene" moves the four corners onto the QR's measured
// edges (src/js/screens.js).
function scanScreen() {
  return '<div class="ph dark" id="ph-scan">' + camScene() +
    '<div class="scan-ui">' + statusBar('10:03') +
    '<div class="scan-top"><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button><div class="scan-tt"><p class="t">QR\'ı okut</p><p class="s">Veri Yapıları · <span class="num" data-countdown="702" data-total="900">11:42</span> kaldı</p></div><span aria-hidden="true"></span></div>' +
    '<div class="scan-mid"><div class="scan-frame"><i></i><i></i><i></i><i></i></div></div>' +
    '<p class="scan-hint" role="status"><span>QR\'ı çerçevenin içine al</span></p>' +
    '<div class="scan-bot"><button class="btn btn-inv btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kodu gir</button></div>' +
    '</div></div>';
}

// Status bar of the success screen: the offline receipt shows the no-internet icons (the receipt switch swaps both).
const statusSwap = () => '<div class="ph-status"><span class="num">10:03</span><span class="sys swap">' +
  '<span data-v="on">' + I('signal_cellular_4_bar', 16) + I('wifi', 16) + I('battery_full', 16) + '</span>' +
  '<span data-v="off" data-off>' + I('signal_cellular_nodata', 16) + I('wifi_off', 16) + I('battery_full', 16) + '</span></span></div>';

// Receipt timeline: each step brings its node, line, text and time. The receipt has the plan's two states and the server
// decision (plan.html#kararlar-kayit-ve-makbuz): offline, the first step carries the exact string "Telefonda kayıtlı,
// gönderilmedi" and "Sunucuya ulaştı" stays a pending step (empty node, "bekliyor").
const step = (cls, t, s, time) => '<li class="rs ' + cls + '"><span class="rs-m" aria-hidden="true"></span><div class="rs-x"><p class="rs-t">' + (/\bwait\b/.test(cls) ? '<span class="vh">Bekleyen adım: </span>' : '') + t + '</p><p class="rs-s">' + s + '</p></div><p class="rs-time num">' + time + '</p></li>';
// The offline line is the sending rule as it is (teknik.html#telefon-arka-plan, #telefon-gonderme-protokolu): sending
// happens mainly when the app opens and while it is open; background sending is not guaranteed.
const OFFLINE_SEND = 'İnternet gelince, uygulamayı açtığında gönderilir.';
function successScreen() {
  const on = '<ol class="rsteps" data-v="on" aria-label="Makbuz adımları">' +
    step('done lit', 'Telefonda kayıtlı', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('done lit', 'Sunucuya ulaştı', 'İnternet vardı, hemen gönderildi', '10:03:23') +
    step('done', 'Sunucu kararı', ind('var', 'Var', 'check'), '10:03:24') + '</ol>';
  const off = '<ol class="rsteps" data-v="off" data-off aria-label="Makbuz adımları">' +
    step('done', 'Telefonda kayıtlı, gönderilmedi', 'İmzalandı, telefona yazıldı', '10:03:21') +
    step('wait', 'Sunucuya ulaştı', 'İnternet yok', 'bekliyor') +
    step('wait', 'Sunucu kararı', 'Gönderimden sonra gelir', '') + '</ol>';
  return '<div class="ph" id="ph-success">' + statusSwap() +
    '<div class="ok-body"><div class="ok-in">' +
    '<svg class="ok-mark" viewBox="0 0 64 64" aria-hidden="true" data-xr="7"><rect x="1" y="1" width="62" height="62" pathLength="1"></rect><path d="M17 33l10 10 20-21" pathLength="1"></path></svg>' +
    '<h4 class="ph-title ok-t">Yoklaman kaydedildi</h4><p class="ok-meta">Veri Yapıları · Teori · D-204</p>' +
    '<div class="rcpt"><p class="rcpt-h"><span>Makbuz</span><span>6 Ekim 2026 Salı</span></p><div class="swap">' + on + off + '</div></div>' +
    '<p class="ok-help swap"><span data-v="on">Makbuz Kayıtlar ekranında da durur.</span><span data-v="off" data-off>' + OFFLINE_SEND + '</span></p>' +
    '</div></div>' +
    '<div class="ph-actions"><button class="btn btn-primary btn-lg btn-block" type="button" data-xr="1">Tamam</button><button class="btn btn-ghost btn-lg btn-block" type="button">' + I('qr_code_2', 24) + 'Makbuz QR\'ını göster</button></div>' +
    '</div>';
}

function qrScreen() {
  return '<div class="ph" id="ph-qr">' + statusBar() +
    '<div class="qr-top"><div><p class="qr-course">BİL 301 Veri Yapıları</p><p class="qr-meta">Teori · D-204 · 10:00 ile 11:50</p></div><button class="icon-btn" type="button" aria-label="Kapat">' + I('close') + '</button></div>' +
    '<div class="qr-plate">' + qrSvg(ATT_QR[0], ' data-qr="qr-left" data-qr-n="' + ATT_QR.length + '" role="img" aria-label="Yoklama QR kodu, beş saniyede bir değişir"') + '</div>' +
    '<div class="qr-info"><div><p class="k">Yeni kod</p><p class="v num"><span id="qr-left">5</span> sn</p></div><div><p class="k">Yoklama</p><p class="v num"><span data-countdown="702" data-total="900">11:42</span> kaldı</p></div></div>' +
    '<p class="qr-note">' + I('brightness_high', 16) + 'Ekran açık tutuluyor · İnternetsiz çalışır</p>' +
    '<p class="qr-help">Okutamayan öğrenciye yedek kodu göster ya da listeden elle ekle.</p>' +
    '<div class="ph-actions two" style="margin-top:auto"><button class="btn btn-secondary btn-lg" type="button">' + I('dialpad', 20) + 'Yedek kod</button><button class="btn btn-ghost btn-lg" type="button" data-dialog="dlg-close">Erken kapat</button></div>' +
    '</div>';
}

// Account deletion (plan.html#kararlar-hesap-silme): what is deleted, what stays, why and for how long, per role, and the
// queue line when unsent work is waiting (the plan: "ekranda bu yazar"). The plan's facts, written as the screen's copy;
// tools/lib/page.js may read the same object for the panel dialog. The retention period itself is still open
// (plan.html#acik-saklama-suresi), so the last line names the university's period without a number.
const DELETION = {
  ogrenci: {
    silinir: 'Giriş bilgin, cihazlarının etkinliği ve telefon sayaçları. Telefondaki veriler ve anahtarlar, bekleyen kayıtlar gidince silinir.',
    kalir: 'Ders listesindeki satırın, yoklama kayıtların (imzalı metin ve açık anahtar dahil), düzeltmeler ve denetim kaydı.',
    neden: 'Devam kararının dayanağı ve itirazda kanıttır.',
    sure: 'Üniversitenin saklama süresi dolunca silinir ya da anonimleştirilir.',
    sonra: 'Listede kalırsın, yeni kayıt gönderemezsin; yeniden kaydolursan ilk kayıt teyidinden geçersin.',
    sira: '2 kayıt telefonda bekliyor. Silme sıraya girer, kayıtlar gidince yapılır.'
  },
  hoca: {
    silinir: 'Giriş bilgilerin (e-posta adresi, giriş kodları); oturumların kapanır.',
    kalir: 'Derslerin arşivlenir; düzeltmelerin denetim kaydında kalır.',
    neden: 'Öğrencilerin devam kararının dayanağı ve itirazda kanıttır.',
    sure: 'Üniversitenin saklama süresi dolunca silinir ya da anonimleştirilir.',
    sonra: '',
    sira: '1 iş telefonda bekliyor (kafa sayısı). Silme sıraya girer, iş gidince yapılır.'
  }
};
const DEL_ROWS = [['silinir', 'Silinir'], ['kalir', 'Kalır'], ['neden', 'Neden kalır'], ['sure', 'Ne kadar kalır']];
function deleteScreen() {
  const block = k => {
    const d = DELETION[k];
    return '<div class="del-v" data-v="' + k + '"' + (k === 'hoca' ? ' data-off' : '') + '><dl class="del-dl">' +
      DEL_ROWS.map(([f, t]) => '<div><dt>' + t + '</dt><dd>' + d[f] + '</dd></div>').join('') + '</dl>' +
      (d.sonra ? '<p class="del-after">' + d.sonra + '</p>' : '') +
      '<p class="del-q">' + I('hourglass_top', 20) + '<span>' + d.sira + '</span></p></div>';
  };
  return '<div class="ph" id="ph-delete">' + statusBar() +
    '<div class="del-top"><button class="icon-btn" type="button" aria-label="Geri">' + I('arrow_back') + '</button></div>' +
    '<div class="ph-top del-head"><h4 class="ph-title">Hesabımı sil</h4><p class="del-sub">Ne silinir, ne kalır</p></div>' +
    '<div class="ph-scroll"><div class="swap">' + block('ogrenci') + block('hoca') + '</div></div>' +
    '<div class="ph-actions two"><button class="btn btn-ghost btn-lg" type="button">Vazgeç</button><button class="btn btn-danger btn-lg" type="button">Hesabımı sil</button></div>' +
    '</div>';
}

// Each phone is drawn at 360 dp; the page script scales the whole phone down where its column is narrower and writes the
// scale under it (.ph-scale).
const fig = (id, inner, cap, extra = '') => '<div class="device-fig">' + device(id, inner) + '<p class="ph-scale" hidden></p>' + cap + extra + '</div>';

function flowPlate() {
  const camera = fragLink('acik', 'acik-giris-dugmesi', 'Açık noktalar');
  return '<div class="plate flow-plate"><p class="plate-cap"><b>Akış</b><span>öğrenci, Aşama 2</span></p><div class="plate-body"><ol class="rules-list">' +
    '<li><p><b>Bugün.</b> Pencere İstanbul saatiyle açılır; tek dolu düğme Yoklamamı ver. Bu düğmenin Aşama 2\'de kamerayı açıp açmayacağı planda yazılmamış' + (camera ? ' (' + camera + ')' : '') + '.</p></li>' +
    '<li><p><b>QR okut.</b> Kamera sistemin ekran geçişiyle açılır; lens ve yakınlaştırma: ' + P('asama23-okutma', 'Okutma') + '. Üstte ders ve kalan süre, altta yedek kod yolu. QR yakalanınca köşeler QR\'ın kenarlarına ' + ref('hareket', 'spring.hizli') + ' ile oturur; kamera kapanır.</p></li>' +
    '<li><p><b>Kaydedildi.</b> Başarı titreşimi' + (fragHas('platform', 'platform-titresim') ? ' (' + fragLink('platform', 'platform-titresim', 'Platformlar, Titreşim') + ')' : '') + ' kamera kapandıktan sonra gelir. Ekran okuyucu odağı başlığa taşınır; makbuz adımları sözcük ve saatle yazılır.</p></li>' +
    '<li><p><b>Bildirim izni.</b> İlk yoklamada Tamam\'dan sonra önce amaç cümlesi gelir (öneri metni: "Hak uyarılarını ve gönderilmemiş kayıt hatırlatmasını bildirimle alırsın."), sonra sistemin izin penceresi (' + P('kararlar', 'Kararlar, Bildirim') + ').</p></li>' +
    '<li><p><b>Çevrimdışı.</b> Aynı ekran: makbuzun ilk adımı "Telefonda kayıtlı, gönderilmedi", "Sunucuya ulaştı" adımı bekliyor, düğümü boş. Kırmızı yok: bu bir hata değil.</p></li></ol></div></div>';
}

function ekranlar() {
  return section('ekranlar', 'Öğrencinin yoklama akışı, hocanın QR ekranı ve hesap silme ekranı. Telefonlar 360 dp genişlikte çizildi; sütun daha darsa telefon bütünüyle küçültülür ve ölçeği altında yazar. Türkiye\'de telefonların çoğu Android (' + P('benzer', 'Benzer sistemlerden dersler') + '). Ekranlar canlıdır: sayaç işler, QR beş saniyede bir değişir.',
    '<div class="ctl-plate" id="xr-plate">' + switchRow('xr-sw', 'Röntgen: yalnız gece mavisi', 'Bütün telefon ekranlarında ve panel ekranında gece mavisi olmayan her şeyi griye çeker; kalanlar kullanım haritasındaki numaralarıyla işaretlenir ve her ekranın altında adlarıyla yazılır. Ekranların altındaki çubuk ölçülen payı ve bütçeyi gösterir.', 'data-xray') + '</div>' +
    '<div class="devices-c"><div class="devices">' +
    fig('scr-home', homeScreen(), capFor('#scr-home', 'Bugün', P('gun', 'Yoklama günü'), 'Yoklama penceresi açık; tek dolu düğme Yoklamamı ver. Hak uyarısı seviye yazısı, ikon ve cümleyle; kalan hak saat olarak yazılır (' + P('devam', 'Devamsızlık hesabı') + ').')) +
    fig('scr-scan', scanScreen(), capFor('#scr-scan', 'QR okut', P('asama23-okutma', 'Okutma'), 'Çerçeve ve yazılar beyaz; tarama çizgisi gibi boşta hareket yok. Bu ekranda durum çubuğu simgeleri açık renktir (expo-status-bar, style "light"). Okutmayı dene: köşeler QR\'ın ölçülen kenarlarına oturur.'),
      '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-scan="ph-scan">' + I('qr_code_scanner', 20) + 'Okutmayı dene</button></div>') +
    fig('scr-success', successScreen(), capFor('#scr-success', 'Yoklaman kaydedildi', P('kararlar-kayit-ve-makbuz', 'Kayıt ve makbuz'), 'Vurgu anı: kare ve onay çizilir, makbuzun üç adımı içerikleriyle birlikte gelir; süre, eğri ve yay: ' + ref('hareket', 'Hareket') + '. Ekran kendiliğinden kapanmaz. Çevrimdışı makbuzda durum çubuğu internetsiz simgeleri gösterir.'),
      '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-replay>' + I('replay', 20) + 'Tekrar oynat</button><button class="btn btn-ghost btn-sm" type="button" data-receipt aria-pressed="false">Çevrimdışı makbuz</button></div>') +
    flowPlate() +
    fig('scr-qr', qrScreen(), capFor('#scr-qr', 'QR gösterme', P('asama23-nereden-gosterilir', 'Nereden gösterilir'), 'Ders etiketi QR\'ın dışında, üstte; QR beyaz plakada (qr.light), plakanın çevresi ince çizgi. Kod değişince QR anında yenilenir, geçiş yok. Ekran açık tutulur (' + K('telefon-arka-plan', 'Arka plan ve bildirim') + '). QR kuralları: ' + P('asama23', 'Aşama 2 ve 3') + '.')) +
    fig('scr-delete', deleteScreen(), capFor('#scr-delete', 'Hesabımı sil', P('kararlar-hesap-silme', 'Hesap silme'), 'Rolüne göre dört satır: ne silinir, ne kalır, neden ve ne kadar kalır; bekleyen iş varsa silmenin sıraya girdiğini yazar. Web adresi aynı satırları yazar. Saklama süresi planda açık nokta (' + P('acik-saklama-suresi', 'Saklama süresi') + '); belirlenince son satır süreyi de yazar. Metin öneri metnidir, olguları plandan.'),
      '<div class="device-ctl"><button class="btn btn-ghost btn-sm" type="button" data-role-swap="ph-delete" aria-pressed="false">Hoca ekranı</button></div>') +
    '</div></div>');
}
ekranlar.title = 'Telefon ekranları';
ekranlar.DELETION = DELETION;
ekranlar.OFFLINE_SEND = OFFLINE_SEND;
ekranlar.fragHas = fragHas;
ekranlar.fragLink = fragLink;
module.exports = ekranlar;

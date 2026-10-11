// Section 'Katmanlar' (#katmanlar): menu, the account deletion dialog (the instructor's, on the panel; the app's screen is
// drawn in Telefon ekranları),
// the side panel, the records screen with a drawing of the system bottom sheet, the offline band and the phone toast,
// the panel toast and the loading states, each with its anatomy (tools/lib/anatomy.js) under it, closed. Timings live
// in Etkileşim tablosu; demo labels are plan features only. Owner: F1a.
const { esc, doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp, dec } = require('../lib/marks');
const { statusBar, device, tabbar, capFor } = require('../lib/phone');
const { spinSvg } = require('../lib/controls');
const { section, sub, ref, anchor } = require('../lib/section');
const { rich } = require('../lib/refs');
const { blocks } = require('../lib/anatomy');
const { timingNote } = require('../lib/motion');

// The 3-day rule as the sheet says it (plan.html#kararlar, Sorun bildir); which text shows depends on the record.
const REPORT_RULE = { karar: 'Karar telefonuna ulaştıktan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.', bekliyor: 'Süre, sunucu kararı telefonuna ulaşınca başlar; o andan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.' };
const REASONS = ['Telefonum yoktu ya da çalışmadı', 'QR\'ı okutamadım', 'Kaydım yanlış derse düştü'];
// Sending happens mainly when the app opens and while it is open when internet returns; background sending is not
// guaranteed (teknik.html#telefon-arka-plan, decisions-r2 E8). The sentence is the one Telefon ekranları uses
// (tools/sections/ekranlar.js OFFLINE_SEND, one source).
const OFFLINE = () => { const s = require('./ekranlar').OFFLINE_SEND; if (!s) throw new Error('katmanlar: ekranlar.js exports no OFFLINE_SEND'); return s; };
function recordsScreen() {
  const pend = () => '<span class="swap" data-pending><span data-v="pending">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + '</span><span data-v="sent" data-off>' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + '</span></span>';
  const row = (t, s, rec, karar, st) => '<div class="rec-row"><div><p class="t">' + t + '</p><p class="s">' + s + '</p></div>' +
    '<button class="btn btn-ghost btn-icon btn-lg" type="button" aria-label="Sorun bildir: ' + rec + '" data-sheet-open data-rec="' + rec + '" data-karar="' + (karar ? 1 : 0) + '">' + I('flag', 24) + '</button>' +
    '<div class="rec-st">' + st + '</div></div>';
  return '<div class="ph offline" id="ph-records">' + statusBar('10:03', true) +
    '<div class="pbanner" role="status">' + I('cloud_off', 20) + '<p><b>İnternet yok.</b> ' + OFFLINE() + '<small>2 kayıt telefonda bekliyor</small></p></div>' +
    '<div class="ph-main push"><div class="ph-top"><p class="ph-date">Ekim 2026</p><h4 class="ph-title">Kayıtlar</h4></div>' +
    '<div class="ph-scroll"><div class="rec">' +
    row('Veri Yapıları', '6 Ekim, 10:03 · Teori', 'Veri Yapıları, 6 Ekim 10:03', false, pend()) +
    row('Algoritmalar', '6 Ekim, 09:04 · Teori', 'Algoritmalar, 6 Ekim 09:04', false, pend()) +
    row('Ayrık Matematik', '5 Ekim, 15:02 · Teori', 'Ayrık Matematik, 5 Ekim 15:02', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('var').replace('class="stamp st-var"', 'class="stamp st-var" data-xr="7"')) +
    row('Fizik II', '3 Ekim, 09:05 · Uygulama', 'Fizik II, 3 Ekim 09:05', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('incelemede')) +
    '</div></div></div>' + tabbar('Kayıtlar', true) +
    '<div class="sheet-scrim" aria-hidden="true"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t" aria-describedby="sh-d" aria-hidden="true" inert>' +
    '<div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-h"><h4 id="sh-t">Sorun bildir</h4><button class="icon-btn" type="button" aria-label="Kapat" data-sheet-close>' + I('close') + '</button></div>' +
    '<div class="sheet-d" id="sh-d"><p class="sheet-rec" data-sheet-rec>Fizik II, 3 Ekim 09:05</p><p data-sheet-rule data-karar-text="' + esc(REPORT_RULE.karar) + '" data-bekliyor-text="' + esc(REPORT_RULE.bekliyor) + '">' + REPORT_RULE.karar + '</p></div>' +
    '<div class="opt-list" role="radiogroup" aria-labelledby="sh-t">' +
    REASONS.map((o, i) => '<button class="opt" type="button" role="radio" aria-checked="false" tabindex="' + (i ? -1 : 0) + '"><span>' + o + '</span>' + I('check', 24, false, 'opt-ic') + '</button>').join('') +
    '</div><p class="msg" role="status"></p>' +
    '<div class="sheet-f"><button class="btn btn-primary btn-lg btn-block" type="button" data-sheet-send>Bildir</button></div>' +
    '</div></div>';
}

function katmanlar() {
  return section('katmanlar', 'İçeriğin üstünde açılan katmanlar (menü, diyalog, yan panel, alt sayfa, bildirim) ile çevrimdışı şeridi ve bekleme durumları. Gölge yalnız açılan katmanda var; her katman tetikleyicisinden açılır ve oraya kapanır. Süreleri ve eğrileri ' + ref('etkilesim', 'Etkileşim tablosu') + ' verir.',
    sub('Menü, diyalog ve yan panel', 'tetikleyiciden açılır, odak geri döner', '<div class="g2"><div class="plate"><p class="plate-cap"><b>Menü</b><span>' + timingNote('menu') + '</span></p><div class="plate-body"><div class="menu-wrap"><button class="btn btn-secondary" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="m1" id="m1-b">' + I('person', 20) + 'Hesap</button>' +
      '<div class="menu" role="menu" id="m1" aria-labelledby="m1-b" data-open="false" style="left:0;right:auto;transform-origin:0 0">' +
      '<button type="button" role="menuitem" tabindex="-1">' + I('smartphone', 20) + 'Oturumlarım</button><button type="button" role="menuitem" tabindex="-1">' + I('logout', 20) + 'Çıkış yap</button><hr><button type="button" role="menuitem" tabindex="-1" class="danger" data-dialog="dlg-del">' + I('delete', 20) + 'Hesabımı sil</button></div></div>' +
      '<p class="help" style="margin-top:16px">Aşağı ok açar, ok tuşları gezinir, Escape ve dışarı tıklama kapatır. Yıkıcı öğe en sonda, ayırıcıdan sonra ve kırmızı. Öğeler hocanın hesap işleridir: Oturumlarım ve çıkış ' + doc(PLAN, 'kararlar', 'plan.html, Kararlar, Hoca oturumu') + ' içinde, silme ' + doc(PLAN, 'kararlar-hesap-silme', 'plan.html, Hesap silme') + ' içinde.</p></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Diyalog</b><span>' + timingNote('dialog') + '</span></p><div class="plate-body"><button class="btn btn-danger" type="button" data-dialog="dlg-del">Hesabımı sil</button>' +
      '<p class="help" style="margin-top:16px">Tarayıcının dialog öğesi, showModal() ile. Açılış @keyframes ile, kapanış data-closing ile oynar, sonra close(). Escape ve örtüye tıklama aynı yoldan kapatır; ilk odak Vazgeç\'tedir (geri alınamayan iş), kapanınca odak açan düğmeye döner. Panelde hocanın silme diyaloğu: ne silinir, ne kalır, neden ve ne kadar (' + doc(PLAN, 'kararlar-hesap-silme', 'plan.html, Hesap silme') + '); satırlar uygulamanın silme ekranıyla aynıdır (' + anchor('ekranlar', 'scr-delete', 'Telefon ekranları, Hesabımı sil') + '). Saklama süresi açık noktadır (' + doc(PLAN, 'acik-saklama-suresi', 'plan.html, Açık noktalar, Saklama süresi') + ').</p></div></div></div>' +
      '<p class="body" style="margin-top:16px">' + rich('Yan panel panelde bir satırın ayrıntısını açar: sağ kenardan, pencerenin tam yüksekliğinde, arkasında örtüyle. Ölçüleri aşağıda, hareketi ' + '[[etkilesim#k-drawer|Etkileşim tablosu, yan panel]]' + ' içinde; panele özgü açılış ve kapanış animasyonları ayrıca konuşulacak.', 'name') + '</p>' +
      blocks('menu', 'dialog', 'drawer')) +
    sub('Telefon katmanları', 'alt sayfa · çevrimdışı şeridi · bildirim', '<div class="devices lay-dev"><div class="device-fig">' + device('scr-records', recordsScreen()) + capFor('#scr-records', 'Kayıtlar', doc(PLAN, 'kararlar', 'plan.html, Kararlar'), 'Öğrencinin kendi kayıtları; çevrimdışı şeridi açık gri, altındaki içerik FLIP ile transform olarak itilir. Alt sayfa açılınca örtü şeridi de karartır.') +
      '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-sheet-open data-rec="Fizik II, 3 Ekim 09:05" data-karar="1">' + I('flag', 20) + 'Sorun bildir</button><button class="btn btn-secondary btn-sm" type="button" data-offline><span class="btn-label">İnterneti aç</span></button></div></div>' +
      '<div><ol class="rules-list"><li><p><b>Alt sayfa.</b> Telefonda sistemin alt sayfası; ayrıntısı ' + anchor('platform', 'platform-alt-sayfa', 'Platformlar, Alt sayfa') + ' içinde. Buradaki çizim yalnız resimdir ve yan panelin süreleriyle oynar. Görünür Kapat düğmesi, geri hareketi ve Escape kapatır; aynı anda tek sayfa açık olur.</p></li>' +
      '<li><p><b>Sorun bildir.</b> Nedenler tek seçimli satırlardır: seçili satırda onay işareti ve seçim çizgisi, daire yok. Satırlardaki nedenler örnektir; neden listesi açık nokta (' + anchor('acik', 'acik-sorun-nedenleri', 'Açık noktalar') + '). Süre kuralı ' + doc(PLAN, 'kararlar', 'plan.html, Kararlar, Sorun bildir') + ' içindedir.</p></li>' +
      '<li><p><b>Çevrimdışı şeridi.</b> Kapatılamaz, kalıcı; içeriği aşağı iter, üstüne binmez. Hata değildir: kırmızı yok, gece mavisi yok; açık gri zeminde (<code>bg.sunken</code>) yazının oranı ' + ref('kontrast', 'Kontrast') + ' tablosunda. Verinin nerede beklediğini, kaç kaydın beklediğini ve ne zaman gideceğini söyler: gönderim uygulama açılınca ve açıkken internet gelince yapılır, arka planda garanti değildir (' + doc(TEK, 'telefon-arka-plan', 'teknik.html, Telefon, Arka plan') + ').</p></li>' +
      '<li><p><b>Bildirim.</b> Bağlantı dönünce "Bekleyen 2 kayıt sunucuya ulaştı." Başarı bildirimi kendiliğinden kapanır; Kapat düğmesi her zaman var.</p></li>' +
      '<li><p><b>Odak.</b> Kısa seçim listesi olan bu sayfada odak seçili satıra, seçim yoksa ilk satıra girer; öbür sayfalarda başlığa (' + ref('erisilebilirlik', 'Erişilebilirlik') + '). Tab içeride döner, kapanınca odak açan öğeye döner; arka plan inert.</p></li></ol></div></div>' +
      blocks('sheet', 'banner')) +
    sub('Panel bildirimi', 'tarayıcının canlı bölgesi · kütüphane yok', '<div class="live-row"><button class="btn btn-secondary" type="button" data-toast="ok">' + I('check', 20) + 'Başarı bildirimi</button><button class="btn btn-secondary" type="button" data-toast="err">' + I('error', 20) + 'Hata bildirimi</button></div><p class="help" style="margin-top:12px">' + rich('Sağ altta, en çok {component.toast.max} tane; yenisi altta. Başarı role="status" bölgesine yazılır ve {time.bildirim} sonra kapanır, işaretçi ya da odak üstündeyken süre durur; hata role="alert" bölgesine yazılır ve kapatılana kadar kalır.', 'value') + ' Hazır bildirim kütüphanesi kullanılmaz (' + doc(TEK, 'panel-cati', 'teknik.html, Web paneli, Çatı') + ').</p>' + blocks('toast')) +
    sub('Yükleniyor', rich('{time.gosterge} altında gösterge yok', 'value'), '<div class="g3"><div class="plate"><p class="plate-cap"><b>Üç kare</b><span>' + rich('{time.dongu} · {ease.dogrusal}', 'name') + '</span></p><div class="plate-body spin-demo">' + spinSvg + '<span class="msg busy">' + spinSvg + '<span>Gönderiliyor</span></span></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>İskelet</b><span>durağan · ' + rich('{neutral.4}', 'name') + '</span></p><div class="plate-body skel"><span class="skel-t"></span><span class="skel-l"></span><span class="skel-l skel-s"></span></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>İlerleme</b><span>' + rich('{time.ilerleme} üstü işler', 'value') + '</span></p><div class="plate-body"><p class="body">Öğrenci listesi yükleniyor · %64</p><div class="prog" style="margin:8px 0 0" role="progressbar" aria-label="Liste yükleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64"><span style="transform:scaleX(0.64)"></span></div></div></div></div>' +
      '<p class="help" style="margin-top:12px">Üç kare yalnız iş sürerken sırayla yanar; hareketi azaltmada durur, yazı kalır. Ölçüleri ' + anchor('bilesenler', 'anat-spinner', 'Bileşenler, Yükleniyor göstergesi') + ' içinde; düğmenin içindeki hâli Bileşenler\'deki durum tablosunda.</p>' + blocks('progress')));
}
katmanlar.title = 'Katmanlar';
module.exports = katmanlar;

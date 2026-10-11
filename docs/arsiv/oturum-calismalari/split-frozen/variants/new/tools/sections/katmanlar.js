// Section 'Katmanlar' (#katmanlar): menu, dialog, the records screen with its bottom sheet, offline band and phone
// toast, the panel toast and loading states. Owner: F1a.
const { C } = require('../lib/inputs');
const { esc, tr, resolve, durOf, doc, PLAN, TEK } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp, dec } = require('../lib/marks');
const { statusBar, device, tabbar, capFor } = require('../lib/phone');
const { spinSvg } = require('../lib/controls');
const { section, sub, has, ref } = require('../lib/section');

const REPORT_RULE = { karar: 'Karar telefonuna ulaştıktan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.', bekliyor: 'Süre, sunucu kararı telefonuna ulaşınca başlar; o andan sonraki 3 gün içinde bildirebilirsin. Bildirim hocanın listesine düşer.' };
function recordsScreen() {
  const pend = () => '<span class="swap" data-pending><span data-v="pending">' + stamp('tel', 'Telefonda kayıtlı, gönderilmedi', 'smartphone') + '</span><span data-v="sent" data-off>' + stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + '</span></span>';
  const row = (t, s, rec, karar, st) => '<div class="rec-row"><div><p class="t">' + t + '</p><p class="s">' + s + '</p></div>' +
    '<button class="btn btn-ghost btn-icon btn-lg" type="button" aria-label="Sorun bildir: ' + rec + '" data-sheet-open data-rec="' + rec + '" data-karar="' + (karar ? 1 : 0) + '">' + I('flag', 24) + '</button>' +
    '<div class="rec-st">' + st + '</div></div>';
  return '<div class="ph offline" id="ph-records">' + statusBar() +
    '<div class="pbanner" role="status">' + I('cloud_off', 20) + '<p><b>İnternet yok.</b> İnternet gelince kendiliğinden gönderilir. Uygulamayı kapatabilirsin.<small>2 kayıt telefonda bekliyor</small></p></div>' +
    '<div class="ph-main push"><div class="ph-top"><p class="ph-date">Ekim 2026</p><h4 class="ph-title">Kayıtlar</h4></div>' +
    '<div class="ph-scroll"><div class="rec">' +
    row('Algoritmalar', '6 Ekim, 13:04 · Teori', 'Algoritmalar, 6 Ekim 13:04', false, pend()) +
    row('Veri Yapıları', '6 Ekim, 10:03 · Teori', 'Veri Yapıları, 6 Ekim 10:03', false, pend()) +
    row('Ayrık Matematik', '5 Ekim, 15:02 · Teori', 'Ayrık Matematik, 5 Ekim 15:02', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('var').replace('class="stamp st-var"', 'class="stamp st-var" data-xr="7"')) +
    row('Fizik II', '3 Ekim, 09:05 · Uygulama', 'Fizik II, 3 Ekim 09:05', true, stamp('ulasti', 'Sunucuya ulaştı', 'cloud_done') + dec('incelemede')) +
    '</div></div></div>' + tabbar('Kayıtlar', true) +
    '<div class="sheet-scrim" aria-hidden="true"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t" aria-describedby="sh-d" aria-hidden="true" inert>' +
    '<div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-h"><h4 id="sh-t">Sorun bildir</h4><button class="icon-btn" type="button" aria-label="Kapat" data-sheet-close>' + I('close') + '</button></div>' +
    '<div class="sheet-d" id="sh-d"><p class="sheet-rec" data-sheet-rec>Fizik II, 3 Ekim 09:05</p><p data-sheet-rule data-karar-text="' + esc(REPORT_RULE.karar) + '" data-bekliyor-text="' + esc(REPORT_RULE.bekliyor) + '">' + REPORT_RULE.karar + '</p></div>' +
    '<div class="opt-list" role="radiogroup" aria-labelledby="sh-t">' +
    ['Telefonum yoktu ya da çalışmadı', "QR'ı okutamadım", 'Kaydım yanlış derse düştü'].map((o, i) => '<button class="opt" type="button" role="radio" aria-checked="false" tabindex="' + (i ? -1 : 0) + '">' + I('radio_button_unchecked', 20, false, 'r-off') + I('radio_button_checked', 20, false, 'r-on') + '<span>' + o + '</span></button>').join('') +
    '</div><p class="msg" role="status"></p>' +
    '<div class="sheet-f"><button class="btn btn-primary btn-lg btn-block" type="button" data-sheet-send>Bildir</button></div>' +
    '</div></div>';
}

function katmanlar() {
  return section('katmanlar', 'İçeriğin üstünde açılan her şey: menü, diyalog, alt sayfa, çevrimdışı şeridi, bildirim ve bekleme. Gölge yalnız burada var; her katman tetikleyicisinden açılır ve oraya kapanır.',
    sub('Menü ve diyalog', 'tetikleyiciden açılır, odak geri döner', '<div class="g2"><div class="plate"><p class="plate-cap"><b>Menü</b><span>giriş ' + durOf('kisa') + ' ms · çıkış ' + durOf('hizli') + ' ms</span></p><div class="plate-body" style="min-height:280px"><div class="menu-wrap"><button class="btn btn-secondary" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="m1" id="m1-b">' + I('more_vert', 20) + 'Kayıt işlemleri</button>' +
      '<div class="menu" role="menu" id="m1" aria-labelledby="m1-b" data-open="false" style="left:0;right:auto;transform-origin:0 0">' +
      '<button type="button" role="menuitem" tabindex="-1">' + I('edit_note', 20) + 'Düzeltme ekle</button><button type="button" role="menuitem" tabindex="-1">' + I('qr_code_scanner', 20) + 'Makbuzu okut</button><button type="button" role="menuitem" tabindex="-1">' + I('download', 20) + 'Excel olarak indir<span class="kbd">Ctrl E</span></button><hr><button type="button" role="menuitem" tabindex="-1" class="danger">' + I('delete', 20) + 'Kaydı sil</button></div></div>' +
      '<p class="help" style="margin-top:16px">Aşağı ok açar, ok tuşları gezinir, Escape ve dışarı tıklama kapatır. Silme gibi yıkıcı öğe en sonda, kırmızı.</p></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>Diyalog</b><span>giriş ' + durOf('orta') + ' ms · çıkış ' + durOf('kisa') + ' ms</span></p><div class="plate-body" style="min-height:280px"><button class="btn btn-danger" type="button" data-dialog="dlg-close">Yoklamayı erken kapat</button><p class="help" style="margin-top:16px">Yerel dialog öğesi. Açılış @keyframes ile, kapanış data-closing ile oynar, sonra close(). Escape ve örtüye tıklama aynı yoldan kapatır; odak açan düğmeye döner.</p></div></div></div>') +
    sub('Telefon katmanları', 'alt sayfa · çevrimdışı şeridi · bildirim', '<div class="devices" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))"><div class="device-fig">' + device('scr-records', recordsScreen()) + capFor('#scr-records', 'Kayıtlar', 'Ö3, Ö6, Ö7', 'Çevrimdışı şeridi açık gri (neutral.3); alttaki içerik FLIP ile transform olarak itilir. Alt sayfa açılınca örtü şeridi de karartır.') +
      '<div class="device-ctl"><button class="btn btn-secondary btn-sm" type="button" data-sheet-open data-rec="Fizik II, 3 Ekim 09:05" data-karar="1">' + I('flag', 20) + 'Sorun bildir</button><button class="btn btn-secondary btn-sm" type="button" data-offline><span class="btn-label">İnterneti aç</span></button></div></div>' +
      '<div><ol class="rules-list"><li><p><b>Alt sayfa.</b> Telefonda TrueSheet (iOS UISheetPresentationController, Android Material BottomSheet), cornerRadius 0, zemin neutral.1' + (has('kutuphaneler') ? ' (sürüm ve gerekçe: ' + ref('kutuphaneler', 'Kütüphaneler') + ')' : '') + '. Giriş yay orta (384 ms, aşma yok); burada linear() yedeğiyle. Çıkış 200 ms. Görünür Kapat düğmesi, geri hareketi, Escape; aynı anda tek sayfa.</p></li>' +
      '<li><p><b>Sorun bildir.</b> Seçenekler tek seçimlidir: her satırda görünen seçenek işareti. Öğrenci 3 gün içinde bildirir; süre kaydı varsa sunucu kararı telefonuna ulaşınca, kaydı yoksa ders bitince başlar (' + doc(PLAN, 'kararlar', 'plan.html#kararlar') + '). Bildirim hocanın listesine düşer.</p></li>' +
      '<li><p><b>Çevrimdışı şeridi.</b> Kapatılamaz, kalıcı. Hata değil: kırmızı yok, gece mavisi yok; açık gri zemin, yazı ' + tr(C.wcagRatio(resolve('text.primary'), resolve('bg.sunken')), 2) + ':1. Verinin nerede beklediğini ve kaç kayıt beklediğini söyler. Giriş ' + durOf('orta') + ' ms, çıkış ' + durOf('kisa') + ' ms.</p></li>' +
      '<li><p><b>Bildirim.</b> Bağlantı dönünce "Bağlantı geri geldi. Bekleyen 2 kayıt gönderildi." Başarı 5 sn sonra kapanır; Kapat düğmesi her zaman var. Android\'de canlı bölge, iOS\'ta duyuru.</p></li>' +
      '<li><p><b>Odak.</b> Sayfa açılınca odak seçili seçeneğe ya da ilkine girer, Tab içeride döner, kapanınca açan öğeye döner; arka plan inert.</p></li></ol></div></div>') +
    sub('Panel bildirimi', 'tarayıcının canlı bölgesi · kütüphane yok', '<div class="live-row"><button class="btn btn-secondary" type="button" data-toast="ok">' + I('check', 20) + 'Başarı bildirimi</button><button class="btn btn-secondary" type="button" data-toast="err">' + I('error', 20) + 'Hata bildirimi</button></div><p class="help" style="margin-top:12px">Sağ altta, en çok üç tane. Başarı role="status" bölgesine yazılır ve 5 sn sonra kapanır; hata role="alert" bölgesine yazılır ve kapatılana kadar kalır. Giriş ' + durOf('orta') + ' ms alttan, çıkış ' + durOf('kisa') + ' ms. Hazır bildirim kütüphanesi kullanılmaz (' + doc(TEK, 'panel-cati', 'teknik.html#panel-cati') + ').</p>') +
    sub('Yükleniyor', '1 sn altı gösterge yok', '<div class="g3"><div class="plate"><p class="plate-cap"><b>Kare iz</b><span>1200 ms doğrusal</span></p><div class="plate-body" style="display:flex;gap:24px;align-items:center">' + spinSvg + '<span style="transform:scale(1.5)">' + spinSvg + '</span><span class="msg busy">' + spinSvg + '<span>Gönderiliyor</span></span></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>İskelet</b><span>durağan</span></p><div class="plate-body" style="display:grid;gap:8px"><span style="height:16px;width:60%;background:var(--neutral-4)"></span><span style="height:12px;width:90%;background:var(--neutral-4)"></span><span style="height:12px;width:75%;background:var(--neutral-4)"></span></div></div>' +
      '<div class="plate"><p class="plate-cap"><b>İlerleme</b><span>10 sn üstü işler</span></p><div class="plate-body"><p class="body">Öğrenci listesi yükleniyor · %64</p><div class="prog" style="margin:8px 0 0" role="progressbar" aria-label="Liste yükleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64"><span style="transform:scaleX(0.64)"></span></div></div></div></div>'));
}
katmanlar.title = 'Katmanlar';
module.exports = katmanlar;
